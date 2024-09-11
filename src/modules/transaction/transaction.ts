import TinyQueue from "tinyqueue";
import { Mutex } from "async-mutex";
import { encodeFunctionData } from "viem";
import { logger } from "../../utils/logger";
import { config } from "../../config/config";
import { TransactionDataCalculator } from "./calculator";
import type { Account, PrivateKeyAccount, PublicClient, WalletClient } from "viem";
import type { TransactionData, TransactionWithDeadline, QueuedTransaction, TrackedTransaction, TransactionManagerParams } from "../../types/types";
import Observer from "../../utils/observer";

export class TransactionManager {
  private static instance: TransactionManager | null = null;  // Static instance to enforce Singleton pattern

  private queue: TinyQueue<QueuedTransaction>;
  private readonly accounts: Array<{ account: PrivateKeyAccount, walletClient: WalletClient}>;
  public readonly client: PublicClient;
  private readonly queueInterval: number;
  private readonly maxRetries: number;
  private readonly batchSize: number;
  private readonly queueMutex: Mutex;
  private readonly monitorPendingTxsInterval: number;
  private readonly trackedTransactions: Map<`0x${string}`, TrackedTransaction>;
  private readonly trackedTransactionsMutex: Mutex;
  private readonly removalSet: Set<`0x${string}`>;
  private readonly removalSetMutex: Mutex;
  private readonly delayedQueue: QueuedTransaction[];
  private readonly calculator: TransactionDataCalculator;

  private constructor(params: TransactionManagerParams) {
    this.queue = new TinyQueue<QueuedTransaction>(
      [],
      (a, b) => {
        // priority for approve transaction
        if (a.txData.functionName === 'approve' && b.txData.functionName !== 'approve') return -1;

        if (a.txData.functionName !== 'approve' && b.txData.functionName === 'approve') return 1;

        return Number(a.notBefore ?? 0n) - Number(b.notBefore ?? 0n);
      }
    );
    this.accounts = params.accounts;
    this.client = params.client;
    this.queueInterval = params.queueInterval || 1000;
    this.maxRetries = params.maxRetries || 3;
    this.queueMutex = new Mutex();
    this.batchSize = params.batchSize || 5;
    this.trackedTransactions = new Map<`0x${string}`, TrackedTransaction>();
    this.trackedTransactionsMutex = new Mutex();
    this.removalSet = new Set<`0x${string}`>();
    this.removalSetMutex = new Mutex();
    this.monitorPendingTxsInterval = params.monitorPendingTxsInterval || 1000;
    this.delayedQueue = [];
    this.calculator =
      params.calculator ||
      new TransactionDataCalculator(
        this.client,
        config.UNISWAP_V2_ROUTER_ADDRESS
      );
  }

  // Public method to get the instance of the TransactionManager
  public static getInstance(params: TransactionManagerParams): TransactionManager {
    if (this.instance === null) {
      this.instance = new TransactionManager(params);  // Create instance if not already created
    }
    return this.instance;  // Return the single instance
  }

  /**
   * Initializes the TransactionManager by starting the processQueue and monitorPendingTxs methods.
   */
  public async initialize() {
    logger.info("TransactionManager: initialized");

    this.processQueue();
    this.monitorPendingTxs();
  }

  /**
   * Adds a transaction to the queue for a specific account.
   * @param transactionWithDeadline Transaction data and deadline
   * @param account The account to associate with the transaction
   */
  public async addTransaction(transactionWithDeadline: TransactionWithDeadline, account: PrivateKeyAccount) {
    const walletClient = this.getWalletClient(account);
    if (!walletClient) {
      throw new Error(`WalletClient not found for account: ${account.address}`);
    }

    const queuedTransaction: QueuedTransaction = {
      ...transactionWithDeadline,
      account,
      walletClient,
      retries: 0,
    };

    const currentBlockTimestamp = await this.getCurrentBlockTimestamp();

    await this.queueMutex.runExclusive(() => {
      // If transaction should be delayed, add it to the delayedQueue
      if (queuedTransaction.notBefore && queuedTransaction.notBefore > currentBlockTimestamp) {
        this.delayedQueue.push(queuedTransaction);
        logger.info(`TransactionManager.addTransaction: Transaction added to delayed queue for account ${account.address}, delayed until ${queuedTransaction.notBefore}`);
      } else {
        // Otherwise, add it to the main queue
        this.queue.push(queuedTransaction);
        logger.info(`TransactionManager.addTransaction: Transaction added for account ${account.address}, queue length: ${this.queue.length}`);
      }
    });
  }

  /**
   * Processes the queue by checking for transactions to process, requeueing delayed transactions, and removing expired transactions.
   * @returns A promise that resolves when the queue is processed
   */
  private async processQueue() {
    let currentBlockTimestamp: bigint;
    let transactionsToProcess: QueuedTransaction[] = [];

    while (true) {
      await this.queueMutex.runExclusive(() => {
        if (this.queue.length === 0 && this.delayedQueue.length === 0) {
          // logger.info(
          //   "TransactionManager.processQueue: Both main and delayed queues are empty, waiting for transactions to be added"
          // );
          return; // Exit early if both queues are empty
        }
      });

      currentBlockTimestamp = await this.getCurrentBlockTimestamp();

      await this.queueMutex.runExclusive(() => {
        this.removeExpiredTransactions(currentBlockTimestamp);
      });

      await this.requeueDelayedTransactions(this.delayedQueue, currentBlockTimestamp);

      transactionsToProcess = await this.getTransactionsToProcess();

      // Process transactions outside of mutex block
      if (transactionsToProcess.length > 0) {
        logger.info(
          `TransactionManager.processQueue: Transactions to process: ${transactionsToProcess
            .map((tx) => tx.txData.functionName)
            .join(", ")}`
        );
        await this.processTransactions(transactionsToProcess);
      }

      // Wait before the next iteration
      await new Promise((resolve) => setTimeout(resolve, this.queueInterval));
    }
  }

  /**
   * Processes the transactions in the queue by submitting them to the chain.
   * @param transactionsToProcess The transactions to process
   * @returns A promise that resolves when the transactions are processed
   */
  private async processTransactions(transactionsToProcess: QueuedTransaction[]) {
    await Promise.allSettled(transactionsToProcess.map(async (queueTransaction) => {
        const { account, walletClient, deadline, retries, id } = queueTransaction;
        try {
          // Call the before hook to update the transaction data
          queueTransaction = await this.beforeSubmitTransaction(queueTransaction);
          const { txData } = queueTransaction;

          const { receipt, trackedTxData } = await this.submitTransaction(txData, walletClient);

          id && Observer.emit(id, receipt.transactionHash);

          const currentBlockTimestamp = await this.getCurrentBlockTimestamp();

          await this.trackedTransactionsMutex.runExclusive(() => {
            this.trackedTransactions.set(trackedTxData.txHash, {
              ...trackedTxData,
              account,
              walletClient,
              deadline,
              retries,
              submittedAt: currentBlockTimestamp,
              nonce: BigInt(trackedTxData.nonce),
            });
          });

          if (receipt.status === "reverted") {
            await this.handleTxRevert(receipt.transactionHash);
          } else {
            logger.info(
              `TransactionManager.processTransactions: Transaction ${txData.functionName} for account ${account.address} succeeded`
            );
            await this.trackedTransactionsMutex.runExclusive(() => {
              this.trackedTransactions.delete(receipt.transactionHash);
            });
          }
        } catch (error) {
          await this.handleTxError(error);
          const { txData } = queueTransaction;
          if (retries < this.maxRetries) {
            logger.info(
              `TransactionManager.processTransactions: Retrying transaction for account ${account.address}, function: ${txData.functionName}, retries: ${retries}`
            );
            await this.queueMutex.runExclusive(() => {
              this.queue.push({
                ...queueTransaction,
                retries: retries + 1,
              });
            });
          } else {
            logger.warn(
              `TransactionManager.processTransactions: Max retries reached for account ${account.address}, function: ${txData.functionName}`
            );
            id && Observer.emit(id, "failed");
          }
        }
      })
    );
  }

  /**
   * Submits a transaction using the correct WalletClient.
   * @param txData The transaction data
   * @param walletClient The WalletClient to use for submitting the transaction
   * @returns A promise with the transaction receipt and tracked transaction data
   */
  private async submitTransaction(txData: TransactionData, walletClient: WalletClient) {
    logger.info(
      `TransactionManager.submitTransaction: Submitting transaction: ${txData.functionName}`
    );

    const currentGasPrice = await this.client.getGasPrice();
    const gasPrice = currentGasPrice + BigInt(Math.floor(Number(currentGasPrice) * 0.1)); // 10% buffer
    const { txHash, receipt } = await this.sendTransaction(txData, walletClient, gasPrice);

    const nonce = await walletClient.account?.nonceManager?.get({
      address: walletClient.account?.address,
      chainId: this.client.chain!.id,
      client: this.client,
    });

    const trackedTxData = {
      txHash,
      txData,
      nonce: BigInt(nonce || 0),
      gasPrice,
    };

    return { receipt, trackedTxData };
  }

  /**
   * Requeues delayed transactions that are ready to be processed.
   * @param delayedQueue The queue of delayed transactions
   * @param currentBlockTimestamp The current block timestamp
   * @returns A promise that resolves when the delayed transactions are requeued
   */
  private async requeueDelayedTransactions(
    delayedQueue: QueuedTransaction[],
    currentBlockTimestamp: bigint
  ) {
    for (let i = 0; i < delayedQueue.length; i++) {
      const delayedTx = delayedQueue[i];
      logger.info(
        `TransactionManager.requeueDelayedTransactions: Requeuing delayed transaction ${delayedTx.txData.functionName}, notBefore: ${delayedTx.notBefore}, currentBlockTimestamp: ${currentBlockTimestamp}`
      );

      // Check if the transaction is ready to be requeued based on the current block timestamp
      if (delayedTx.notBefore && currentBlockTimestamp >= delayedTx.notBefore) {
        await this.queueMutex.runExclusive(() => {
          this.queue.push(delayedTx);
        });

        // Remove the transaction from delayedQueue
        delayedQueue.splice(i, 1);

        // Adjust the index after splicing
        i--;

        // logger.info(`TransactionManager.requeueDelayedTransactions: Moved delayed transaction ${delayedTx.txData.functionName} back to main queue`);
      }
    }
  }

  /**
   * Removes expired transactions from the queue.
   * @param currentBlockTimestamp The current block timestamp
   */
  private removeExpiredTransactions(currentBlockTimestamp: bigint) {
    while (
      this.queue &&
      this.queue.length > 0 &&
      (this.queue.peek()?.deadline ?? 0n) <= currentBlockTimestamp
    ) {
      const { txData } = this.queue.pop() ?? {
        txData: { functionName: "unknown", deadline: 0n },
      };
      logger.warn(
        `TransactionManager.removeExpiredTransactions: Discarding transaction ${txData.functionName
        } - deadline passed: ${(txData as any)?.deadline}`
      );
    }
  }

  /**
   * Gets the transactions to process from the queue.
   * @param currentBlockTimestamp The current block timestamp
   * @returns An array of transactions to process
   */
  private async getTransactionsToProcess(): Promise<QueuedTransaction[]> {
    const transactionsToProcess: QueuedTransaction[] = [];

    await this.queueMutex.runExclusive(() => {
      while (
        this.queue.length > 0 &&
        transactionsToProcess.length < this.batchSize
      ) {
        const nextTx = this.queue.pop();

        if (nextTx) {
          transactionsToProcess.push(nextTx);
        }

        // if (this.removalSet.has(nextTx.txData.txHash)) {
        //   this.removalSet.delete(nextTx.txData.txHash); // Remove from the removalSet after skipping
        //   logger.info(`TransactionManager.getTransactionsToProcess: Skipping removed transaction: ${nextTx.txData.txHash}`);
        // } else {
        //   transactionsToProcess.push(nextTx);
        // }
      }
    });

    return transactionsToProcess;
  }

  /**
   * Monitors pending transactions to check their status and take action if necessary.
   * This method is run in a loop with a delay between each iteration.
   */
  private async monitorPendingTxs() {
    while (true) {
      await this.trackedTransactionsMutex.runExclusive(async () => {
        const pendingTxHashes = Array.from(this.trackedTransactions.keys());

        if (pendingTxHashes.length !== 0) {
          logger.info(`TransactionManager.monitorPendingTxs: Pending transactions: ${pendingTxHashes.length}`);
        }

        for (const txHash of pendingTxHashes) {
          try {
            const receipt = await this.client.getTransactionReceipt({ hash: txHash });

            if (!receipt) {
              const trackedTx = this.trackedTransactions.get(txHash);

              if (trackedTx) {
                const timeElapsed = Date.now() - Number(trackedTx.submittedAt);
                const shouldSpeedUp = timeElapsed > 300000; // 5 minutes
                const shouldDrop = trackedTx.retries > this.maxRetries;

                if (shouldSpeedUp) {
                  await this.speedUpTransaction(txHash);
                } else if (shouldDrop) {
                  await this.dropTransaction(txHash);
                }
              }
            } else {
              // Transaction has been confirmed
              this.trackedTransactions.delete(receipt.transactionHash);
              logger.info(
                `TransactionManager.monitorPendingTxs: Transaction confirmed with hash: ${txHash}`
              );
            }
          } catch (error) {
            logger.error(
              `TransactionManager.monitorPendingTxs: Error checking transaction status for hash: ${txHash}`,
              error
            );
          }
        }
      });
      await new Promise((resolve) =>
        setTimeout(resolve, this.monitorPendingTxsInterval)
      );
    }
  }

  /**
   * Speeds up a transaction by increasing the gas price.
   * @param txHash The hash of the transaction to speed up
   */
  private async speedUpTransaction(txHash: `0x${string}`) {
    await this.trackedTransactionsMutex.runExclusive(async () => {
      const trackedTx = this.trackedTransactions.get(txHash);
      if (!trackedTx) {
        logger.warn(
          `TransactionManager.speedUpTransaction: Transaction with hash ${txHash} not found`
        );
        return;
      }

      logger.info(
        `TransactionManager.speedUpTransaction: Speeding up transaction with hash: ${txHash} by increasing gas price`
      );

      const originalGasPrice = trackedTx.gasPrice
        ? trackedTx.gasPrice
        : await this.client.getGasPrice();
      const newGasPrice =
        originalGasPrice + BigInt(Math.floor(Number(originalGasPrice) * 0.1)); // Increase by 10%

      await this.queueMutex.runExclusive(() => {
        this.queue.push({
          txData: trackedTx.txData,
          account: trackedTx.account,
          walletClient: trackedTx.walletClient,
          deadline: trackedTx.deadline,
          retries: trackedTx.retries + 1,
          gasPrice: newGasPrice,
        });
      });
    });
  }

  /**
   * Drops a transaction from the queue.
   * @param txHash The hash of the transaction to drop
   * @returns A promise that resolves when the transaction is dropped
   */
  private async dropTransaction(txHash: `0x${string}`) {
    await this.trackedTransactionsMutex.runExclusive(() => {
      this.trackedTransactions.delete(txHash); // Delete the transaction from trackedTransactions
    });

    await this.removalSetMutex.runExclusive(() => {
      this.removalSet.add(txHash); // Add the transaction hash to the removalSet
    });

    logger.info(
      `TransactionManager.dropTransaction: Transaction with hash ${txHash} marked for removal`
    );
  }

  /**
   * Handles transaction reverts.
   * @param txHash The hash of the reverted transaction
   */
  private async handleTxRevert(txHash: `0x${string}`) {
    logger.error(
      `TransactionManager.handleTxRevert: Transaction ${txHash} reverted`
    );
  }

  /**
   * Estimates gas for a transaction.
   * @param tx The transaction data
   * @returns The estimated gas limit
   */
  private async estimateGasWithFallback(
    tx: TransactionData,
    walletClient: WalletClient
  ) {
    const defaultGasLimit = BigInt(1_000_000);

    if (tx.abi.length === 0 || tx.functionName === '') {
      return 21000;
    }

    try {
      const calldata = encodeFunctionData({
        abi: tx.abi,
        functionName: tx.functionName,
        args: tx.args,
      });

      const gasEstimate = await this.client.estimateGas({
        to: tx.address,
        data: calldata,
        account: walletClient.account,
        value: tx.value,
      });

      const gasLimit =
        gasEstimate + BigInt(Math.floor(Number(gasEstimate) * 0.1));

      return gasLimit;
    } catch (error) {
      logger.error(
        `Failed to estimate gas: ${error instanceof Error ? error.message : String(error)
        }`
      );
      return defaultGasLimit;
    }
  }

  /**
   * Sends a transaction to the chain.
   * @param txData The transaction data
   * @param walletClient The WalletClient to use for submitting the transaction
   * @param gasPrice The gas price to use for the transaction
   * @returns The transaction hash and receipt
   */
  private async sendTransaction(
    txData: TransactionData,
    walletClient: WalletClient,
    gasPrice: bigint
  ): Promise<{ txHash: `0x${string}`; receipt: any }> {
    const gasLimit = await this.estimateGasWithFallback(txData, walletClient);

    logger.info(
      `TransactionManager.sendTransaction: Gas limit: ${gasLimit}`
    );

    let txHash: `0x${string}`;

    if (txData.functionName === '' || txData.abi.length === 0) {
      txHash = await walletClient.sendTransaction({
        account: walletClient.account as Account,
        to: txData.address,
        value: txData.value,
        gas: BigInt(gasLimit),
        gasPrice,
        chain: this.client.chain
      });
    } else {
      if (!Array.isArray(txData.abi)) {
        throw new Error(`Invalid ABI for function: ${txData.functionName}`);
      }
      const { request } = await this.client.simulateContract({
        ...txData,
        chain: this.client.chain,
        account: walletClient.account,
        gas: gasLimit,
        gasPrice,
      });
  
      txHash = await walletClient.writeContract(request);
    }

    logger.info(
      `TransactionManager.sendTransaction: Transaction sent, txHash: ${txHash}`
    );

    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
    });
    return { txHash, receipt };
  }

  /**
   * Retrieves the WalletClient associated with a given account.
   * @param account The account to retrieve the WalletClient for.
   */
  private getWalletClient(account: PrivateKeyAccount): WalletClient | undefined {
    const accountInfo = this.accounts.find(
      (acc) => acc.account.address === account.address
    );
    return accountInfo?.walletClient;
  }

  /**
   * Gets the current block timestamp.
   * @returns The current block timestamp as a bigint
   */
  private async getCurrentBlockTimestamp(): Promise<bigint> {
    const block = await this.client.getBlock();
    return BigInt(block.timestamp);
  }

  /**
   * Handles transaction errors by logging the error message.
   * @param error
   */
  private async handleTxError(error: unknown) {
    if (error instanceof Error) {
      logger.error(
        `TransactionManager.handleTxError: Failed to process transaction: ${error.message}`
      );
    } else {
      logger.error(
        `TransactionManager.handleTxError: Failed to process transaction: ${String(
          error
        )}`
      );
    }
  }

  private async beforeSubmitTransaction(
    queuedTransaction: QueuedTransaction
  ): Promise<QueuedTransaction> {
    const { txData } = queuedTransaction;

    switch (txData.functionName) {
      case "swapExactETHForTokens":
        queuedTransaction.txData = await this.recalculateMinAmount(
          queuedTransaction,
          txData.value ?? txData.args[0],
          txData.args[1],
          0
        );
        break;

      case "swapExactTokensForETH":
        queuedTransaction.txData = await this.recalculateMinAmount(
          queuedTransaction,
          txData.args[0],
          txData.args[2],
          1
        );
        break;

      default:
      // do nothing
    }

    return queuedTransaction;
  }

  private async recalculateMinAmount(
    queuedTransaction: QueuedTransaction,
    amountIn: bigint,
    path: `0x${string}`[],
    minAmountIndex: number
  ): Promise<TransactionData> {
    const currentAmountOut = await this.calculator.getAmountsOut(
      amountIn,
      path
    );
    const newMinAmount =
      this.calculator.calculateMinAmountWithSlippage(currentAmountOut);
    queuedTransaction.txData.args[minAmountIndex] = newMinAmount;

    logger.info(
      `Transaction recalculated for function: ${queuedTransaction.txData.functionName}, new min amount: ${newMinAmount}`
    );

    return queuedTransaction.txData;
  }
}
