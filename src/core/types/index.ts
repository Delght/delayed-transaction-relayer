import type { Abi, PrivateKeyAccount, PublicClient, WalletClient } from 'viem';
import { TransactionDataCalculator } from '@/core/transaction/calculator';
import { ChainId } from '@/config/chains';

export interface TransactionData {
  address: `0x${string}`,
  abi: Abi,
  functionName: string,
  args: any[],
  value?: bigint,
}

export interface TransactionWithDeadline {
  id?: string;
  txData: TransactionData,
  deadline: bigint,
  notBefore?: bigint;
}

export interface TransactionManagerParams {
  chainId: ChainId
  accounts: Array<{ account: PrivateKeyAccount, walletClient: WalletClient }>; 
  client: PublicClient; 
  queueInterval?: number;
  maxRetries?: number;
  batchSize?: number;
  monitorPendingTxsInterval?: number;
  calculator?: TransactionDataCalculator;
}

export interface QueuedTransaction extends TransactionWithDeadline {
  account: PrivateKeyAccount;
  walletClient: WalletClient;
  retries: number;
  gasPrice?: bigint;
}

export interface TrackedTransaction extends QueuedTransaction {
  txHash: `0x${string}`;
  nonce: bigint;
  gasPrice?: bigint;
  submittedAt: bigint;
}
