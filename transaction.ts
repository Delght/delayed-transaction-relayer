import type { PrivateKeyAccount, PublicClient, WalletClient } from 'viem';
import { Mutex } from 'async-mutex';
import { default as TinyQueue } from 'tinyqueue';
import type { TransactionData, TransactionWithDeadline } from './types';
import { logger } from './logger';

interface TransactionManagerParams {
  accounts: Array<{ account: PrivateKeyAccount, walletClient: WalletClient }>; 
  client: PublicClient; 
  queueInterval?: number;
  maxRetries?: number;
  batchSize?: number;
  monitorPendingTxsInterval?: number;
}

interface QueuedTransaction extends TransactionWithDeadline {
  account: PrivateKeyAccount;
  walletClient: WalletClient;
  retries: number;
  gasPrice?: bigint;
}

interface TrackedTransaction extends QueuedTransaction {
  txHash: `0x${string}`;
  nonce: bigint;
  gasPrice?: bigint;
}

// interface TransactionReceipt {
//   transactionHash: `0x${string}`;
//   status: 'success' | 'reverted';
// }

export class TransactionManager {
  private readonly accounts: Array<{ account: PrivateKeyAccount, walletClient: WalletClient }>; 
  private readonly client: PublicClient; 
  private queue: TinyQueue<QueuedTransaction | undefined>;
  private readonly queueInterval: number;
  private readonly maxRetries: number;
  private readonly queueMutex: Mutex;
  private readonly batchSize: number;
  private readonly trackedTransactions: Map<`0x${string}`, TrackedTransaction>;
  private readonly trackedTransactionsMutex: Mutex;
  private readonly removalSet: Set<`0x${string}`>;
  private readonly removalSetMutex: Mutex;
  private readonly monitorPendingTxsInterval: number;
  private readonly delayedQueue: QueuedTransaction[];

  constructor(params: TransactionManagerParams) {
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
  }

  /**
   * Initializes the TransactionManager by starting the processQueue and monitorPendingTxs methods.
   */
  public async initialize() {
    this.queue = new TinyQueue<QueuedTransaction>([], (a, b) => Number(a.deadline - b.deadline));
    logger.info('TransactionManager: initialized');

    this.processQueue();
    this.monitorPendingTxs();
  }

  /**
   * Adds a transaction to the queue for a specific account.
   * @param transactionWithDeadline Transaction data and deadline
   * @param account The account to associate with the transaction
   */
  public async addTransaction(transactionWithDeadline: TransactionWithDeadline, account: PrivateKeyAccount) {
    const walletClient = this.getWalletClient(account); // Get the WalletClient for the account
    if (!walletClient) {
      throw new Error(`WalletClient not found for account: ${account.address}`);
    }

    await this.queueMutex.runExclusive(() => {
      this.queue.push({ ...transactionWithDeadline, account, walletClient, retries: 0 });
      logger.info(`TransactionManager.addTransaction: Transaction added for account ${account.address}, queue length: ${this.queue.length}`);
    });
  }

  /**
   * Retrieves the WalletClient associated with a given account.
   * @param account The account to retrieve the WalletClient for.
   */
  private getWalletClient(account: PrivateKeyAccount): WalletClient | undefined {
    const accountInfo = this.accounts.find(acc => acc.account.address === account.address);
    return accountInfo?.walletClient;
  }

  /**
   * Processes the queue by checking for transactions to process, requeueing delayed transactions, and removing expired transactions.
   * @returns A promise that resolves when the queue is processed
   */
  private async processQueue() {
    while (true) {
      if (this.queue.length === 0 && this.delayedQueue.length === 0) {
        logger.info('TransactionManager.processQueue: Both main and delayed queues are empty, waiting for transactions to be added');
        await new Promise((resolve) => setTimeout(resolve, this.queueInterval));
        continue;
      }

      const currentBlockTimestamp = await this.getCurrentBlockTimestamp();

      await this.requeueDelayedTransactions(this.delayedQueue, currentBlockTimestamp);

      await this.queueMutex.runExclusive(() => {
        this.removeExpiredTransactions(currentBlockTimestamp);
      });

      if (this.queue.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, this.queueInterval));
        continue;
      }

      const transactionsToProcess: QueuedTransaction[] = await this.getTransactionsToProcess(currentBlockTimestamp);

      await this.processTransactions(transactionsToProcess);

      await new Promise((resolve) => setTimeout(resolve, this.queueInterval));
    }
  }

  /**
   * Processes the transactions in the queue by submitting them to the chain.
   * @param transactionsToProcess The transactions to process
   * @returns A promise that resolves when the transactions are processed
   */
  private async processTransactions(transactionsToProcess: QueuedTransaction[]) {
    await Promise.allSettled(
      transactionsToProcess.map(async ({ txData, account, walletClient, deadline, retries }) => {
        try {
          const { receipt, trackedTxData } = await this.submitTransaction(txData, walletClient);

          await this.trackedTransactionsMutex.runExclusive(() => {
            this.trackedTransactions.set(trackedTxData.txHash, { ...trackedTxData, account, walletClient, deadline, retries });
          });

          if (receipt.status === 'reverted') {
            await this.handleTxRevert(receipt.transactionHash);
          } else {
            logger.info(`TransactionManager.processTransactions: Transaction ${txData.functionName} for account ${account.address} succeeded`);
            await this.trackedTransactionsMutex.runExclusive(() => {
              this.trackedTransactions.delete(receipt.transactionHash);
            });
          }
        } catch (error) {
          await this.handleTxError(error);
          if (retries < this.maxRetries) {
            logger.info(`TransactionManager.processTransactions: Retrying transaction for account ${account.address}, function: ${txData.functionName}, retries: ${retries}`);
            await this.queueMutex.runExclusive(() => {
              this.queue.push({ txData, account, walletClient, deadline, retries: retries + 1 });
            });
          } else {
            logger.warn(`TransactionManager.processTransactions: Max retries reached for account ${account.address}, function: ${txData.functionName}`);
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
    logger.info(`TransactionManager.submitTransaction: Submitting transaction: ${txData.functionName}`);

    const gasLimit = await this.estimateGasWithFallback(txData);
    const currentGasPrice = await this.client.getGasPrice();
    const gasPrice = currentGasPrice + BigInt(Math.floor(Number(currentGasPrice) * 0.1)); // 10% buffer

    const { request } = await this.client.simulateContract({
      ...txData,
      account: walletClient.account,
      gas: gasLimit,
      gasPrice,
    });

    const txHash = await walletClient.writeContract(request);

    logger.info(`TransactionManager.submitTransaction: Transaction sent, txHash: ${txHash}`);

    const receipt = await this.client.waitForTransactionReceipt({ hash: txHash });

    const trackedTxData = {
      txHash,
      txData,
      nonce: BigInt(0), // Example; adjust for your actual nonce handling logic
      gasPrice,
    };

    return { receipt, trackedTxData };
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
   * Requeues delayed transactions that are ready to be processed.
   * @param delayedQueue The queue of delayed transactions
   * @param currentBlockTimestamp The current block timestamp
   * @returns A promise that resolves when the delayed transactions are requeued
   */
    private async requeueDelayedTransactions(delayedQueue: QueuedTransaction[], currentBlockTimestamp: bigint) {
      for (let i = 0; i < delayedQueue.length; i++) {
        const delayedTx = delayedQueue[i];
        if (delayedTx.notBefore && currentBlockTimestamp >= delayedTx.notBefore) {
          this.queue.push(delayedTx);
          delayedQueue.splice(i, 1);
          i--;
          logger.info(`TransactionManager.requeueDelayedTransactions: Moved delayed transaction ${delayedTx.txData.functionName} back to main queue`);
        }
      }
  }

  /**
   * Removes expired transactions from the queue.
   * @param currentBlockTimestamp The current block timestamp
   */
  private removeExpiredTransactions(currentBlockTimestamp: bigint) {
    while (this.queue && this.queue.length > 0 && (this.queue.peek()?.deadline ?? 0n) <= currentBlockTimestamp) {
      const { txData } = this.queue.pop() ?? { txData: { functionName: 'unknown', deadline: 0n } };
      logger.warn(`TransactionManager.removeExpiredTransactions: Discarding transaction ${txData.functionName} - deadline passed: ${txData.deadline}`);
    }
  }

  /**
   * Gets the transactions to process from the queue.
   * @param currentBlockTimestamp The current block timestamp
   * @returns An array of transactions to process
   */
  private async getTransactionsToProcess(currentBlockTimestamp: bigint): Promise<QueuedTransaction[]> {
    const transactionsToProcess: QueuedTransaction[] = [];
    await this.queueMutex.runExclusive(() => {
      while (this.queue.length > 0 && transactionsToProcess.length < this.batchSize) {
        const nextTx = this.queue.pop();
        if (nextTx?.notBefore && currentBlockTimestamp < nextTx.notBefore) {
          this.delayedQueue.push(nextTx);
          logger.info(`TransactionManager.getTransactionsToProcess: Skipping ${nextTx.txData.functionName} - too early to submit. Added to delayed queue.`);
        } else if (nextTx) {
          transactionsToProcess.push(nextTx);
        }

        // TODO: implement logic to remove transactions if they are in the removalSet
        // if (!this.removalSet.has(nextTx.txData.hash)) {
        //   transactionsToProcess.push(nextTx);
        // } else {
        //   this.removalSet.delete(nextTx.txData.hash);
        //   logger.info(`TransactionManager.processQueue: Skipping removed transaction: ${nextTx.txData.hash}`);
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

      logger.info(`TransactionManager.monitorPendingTxs: Pending transactions: ${pendingTxHashes.length ? pendingTxHashes.join(', ') : 'none'}`);

      for (const txHash of pendingTxHashes) {
        try {
          const receipt = await this.client.getTransactionReceipt({ hash: txHash });

          if (!receipt) {
            const trackedTx = this.trackedTransactions.get(txHash);

            if (trackedTx) {
              // Example logic to check whether to speed up or drop transaction
              const shouldSpeedUp = /* Logic to check if transaction is taking too long */;
              const shouldDrop = /* Logic to check if transaction has exceeded retry limit */;

              if (shouldSpeedUp) {
                await this.speedUpTransaction(txHash);
              } else if (shouldDrop) {
                await this.dropTransaction(txHash);
              }
            }
          } else {
            // Transaction has been confirmed
            this.trackedTransactions.delete(receipt.transactionHash);
            logger.info(`TransactionManager.monitorPendingTxs: Transaction confirmed with hash: ${txHash}`);
          }
        } catch (error) {
          logger.error(`TransactionManager.monitorPendingTxs: Error checking transaction status for hash: ${txHash}`, error);
        }
      }
    });
    await new Promise((resolve) => setTimeout(resolve, this.monitorPendingTxsInterval));
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
      logger.warn(`TransactionManager.speedUpTransaction: Transaction with hash ${txHash} not found`);
      return;
    }

    logger.info(`TransactionManager.speedUpTransaction: Speeding up transaction with hash: ${txHash} by increasing gas price`);

    const originalGasPrice = trackedTx.gasPrice ? trackedTx.gasPrice : await this.client.getGasPrice();
    const newGasPrice = originalGasPrice + BigInt(Math.floor(Number(originalGasPrice) * 0.1)); // Increase by 10%

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
  // TODO: should replace the transaction with a new one with higher gas price
  private async dropTransaction(txHash: `0x${string}`) {
    await this.trackedTransactionsMutex.runExclusive(() => {
      this.trackedTransactions.delete(txHash); // Delete the transaction from trackedTransactions
    });

    await this.removalSetMutex.runExclusive(() => {
      this.removalSet.add(txHash); // Add the transaction hash to the removalSet
    });

    logger.info(`TransactionManager.dropTransaction: Transaction with hash ${txHash} marked for removal`);
  }

  /**
   * Handles transaction reverts.
   * @param txHash The hash of the reverted transaction
   */
  // TODO: handle specific revert reasons
  private async handleTxRevert(txHash: `0x${string}`) {
    logger.error(`TransactionManager.handleTxRevert: Transaction ${txHash} reverted`);
  }

  /**
   * Estimates gas for a transaction.
   * @param tx The transaction data
   * @returns The estimated gas limit
   */
  // TODO: investigate why this is failing with timeout error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async estimateGasWithFallback(__tx: TransactionData) {
    const defaultGasLimit = BigInt(1000000);

    // try {
    //   // Estimate gas
    //   const gasEstimate = await this.client.estimateGas({
    //     ...tx,
    //     account: this.account,
    //   });

    //   // Add a buffer to the gas estimate
    //   const gasLimit = gasEstimate + BigInt(Math.floor(Number(gasEstimate) * 0.1));

    //   logger.info(`Estimated gas: ${ gasEstimate }, Gas limit with buffer: ${ gasLimit }, Default gas limit: ${ defaultGasLimit } `);

    //   return gasLimit;
    // } catch (error) {
    //   if (error instanceof Error) {
    //     logger.error(`Failed to estimate gas: ${ error.message } `);
    //   } else {
    //     logger.error(`Failed to estimate gas: ${ String(error) } `);
    //   }
    //   return defaultGasLimit;
    // }

    return defaultGasLimit;
  }

  /**
   * Handles transaction errors by logging the error message.
   * @param error 
  */
  // TODO: handle specific transaction errors
  private async handleTxError(error: unknown) {
    if (error instanceof Error) {
      logger.error(`TransactionManager.handleTxError: Failed to process transaction: ${error.message}`);
    } else {
      logger.error(`TransactionManager.handleTxError: Failed to process transaction: ${String(error)}`);
    }
  }
}
