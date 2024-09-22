import TinyQueue from "tinyqueue";
import { Mutex } from "async-mutex";
import { encodeFunctionData } from "viem";
import type { Account, PrivateKeyAccount, PublicClient, WalletClient } from "viem";

import Observer from "@/utils/observer";
import { logger } from "@/utils/logger";
import { ChainData, ChainId } from "@/config/chains";
import {
  GAS_PRICE_MULTIPLIER,
  GAS_LIMIT_MULTIPLIER,
  GAS_TRANSFER_LIMIT,
  MAX_PRIORITY_FEE_PER_GAS
} from "@/config/constants";
import { TransactionDataCalculator } from "@/modules/transaction/calculator";
import type {
  TransactionData,
  TransactionWithDeadline,
  QueuedTransaction,
  TrackedTransaction,
  TransactionManagerParams
} from "@/types";

export class TransactionManager {
  private static instance: TransactionManager | null = null;

  private readonly queue: TinyQueue<QueuedTransaction>;
  private readonly accounts: Array<{ account: PrivateKeyAccount, walletClient: WalletClient}>;
  private readonly client: PublicClient;
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
  private readonly chainId: ChainId

  private constructor(params: TransactionManagerParams) {
    this.queue = new TinyQueue<QueuedTransaction>([], this.compareTransactions);
    this.accounts = params.accounts;
    this.client = params.client;
    this.chainId = params.chainId;
    this.queueInterval = params.queueInterval || 1000;
    this.maxRetries = params.maxRetries || 3;
    this.queueMutex = new Mutex();
    this.batchSize = params.batchSize || 2;
    this.trackedTransactions = new Map<`0x${string}`, TrackedTransaction>();
    this.trackedTransactionsMutex = new Mutex();
    this.removalSet = new Set<`0x${string}`>();
    this.removalSetMutex = new Mutex();
    this.monitorPendingTxsInterval = params.monitorPendingTxsInterval || 1000;
    this.delayedQueue = [];
    this.calculator = params.calculator || new TransactionDataCalculator(this.client, ChainData[this.chainId]?.uniswapRouterV2 || ChainData[1].uniswapRouterV2);
  }

  public static getInstance(params: TransactionManagerParams): TransactionManager {
    if (this.instance === null) {
      this.instance = new TransactionManager(params);
      this.instance.initialize();
    }
    return this.instance;
  }
  
  private async initialize() {
    logger.info("TransactionManager: initialized");

    this.processQueue();
    this.monitorPendingTxs();
  }

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
            .map((tx) => tx.txData.functionName === '' ? 'transfer native' : tx.txData.functionName)
            .join(", ")}`
        );
        await this.processTransactions(transactionsToProcess);
      }

      // Wait before the next iteration
      await new Promise((resolve) => setTimeout(resolve, this.queueInterval));
    }
  }

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
              nonce: BigInt(trackedTxData.nonce || 0),
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

  private async submitTransaction(txData: TransactionData, walletClient: WalletClient) {
    logger.info(
      `TransactionManager.submitTransaction: Submitting transaction: ${txData.functionName}`
    );

    const { maxFeePerGas } = await this.client.estimateFeesPerGas()

    const gasPrice = BigInt(Math.floor(Number(maxFeePerGas) * GAS_PRICE_MULTIPLIER));

    const { txHash, receipt } = await this.sendTransaction(txData, walletClient, maxFeePerGas);

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
      }
    }
  }

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
    let swapCount = 0;

    await this.queueMutex.runExclusive(() => {
      while (
        this.queue.length > 0 &&
        transactionsToProcess.length < this.batchSize
      ) {
        const nextTx = this.queue.peek();

        if (!nextTx) {
          break;
        }

        const isSwapFunction =  nextTx.txData.functionName === 'swapExactETHForTokens' ||  nextTx.txData.functionName === 'swapExactTokensForETH';

        if (isSwapFunction && swapCount >= this.batchSize) {
          break;
        }

        this.queue.pop();

        transactionsToProcess.push(nextTx);

        if (isSwapFunction) {
          swapCount++;
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

      const { maxFeePerGas } = await this.client.estimateFeesPerGas();

      const originalGasPrice = trackedTx.gasPrice
        ? trackedTx.gasPrice
        : maxFeePerGas;
        
      const newGasPrice = BigInt(Math.floor(Number(originalGasPrice) * GAS_PRICE_MULTIPLIER));
        

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
    if (tx.abi.length === 0 || tx.functionName === '') {
      return BigInt(GAS_TRANSFER_LIMIT);
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

      const gasLimit = BigInt(Math.floor(Number(gasEstimate) * GAS_LIMIT_MULTIPLIER));

      return gasLimit;
    } catch (error) {
      logger.error(
        `Failed to estimate gas: ${error instanceof Error ? error.message : String(error)
        }`
      );
      return BigInt(GAS_TRANSFER_LIMIT);
    }
  }


  private async sendTransaction(
    txData: TransactionData,
    walletClient: WalletClient,
    maxFeePerGas: bigint
  ): Promise<{ txHash: `0x${string}`; receipt: any }> {
    const gasLimit = await this.estimateGasWithFallback(txData, walletClient);
    let txHash: `0x${string}`;

    if (txData.functionName === '' || txData.abi.length === 0) {
      txHash = await walletClient.sendTransaction({
        account: walletClient.account as Account,
        to: txData.address,
        value: txData.value,
        gas: gasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
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
        maxFeePerGas,
        maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
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


  private getWalletClient(account: PrivateKeyAccount): WalletClient | undefined {
    const accountInfo = this.accounts.find(
      (acc) => acc.account.address === account.address
    );
    return accountInfo?.walletClient;
  }


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

    return queuedTransaction.txData;
  }

  // TODO: refactor this later
  private compareTransactions(a: QueuedTransaction, b: QueuedTransaction): number {
    if (a.txData.functionName === 'approve' && b.txData.functionName !== 'approve') return -1;
    if (a.txData.functionName !== 'approve' && b.txData.functionName === 'approve') return 1;
    return Number(a.notBefore ?? 0n) - Number(b.notBefore ?? 0n);
  }
}
