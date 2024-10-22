import { PublicClient, type PrivateKeyAccount, type Abi } from 'viem';

import { uniswapV2RouterAbi, erc20Abi } from '@/config/abis';
import { ChainData, ChainId } from '@/config/chains';
import {
  MAX_UINT256,
  GAS_TRANSFER_LIMIT,
} from '@/config/constants';
import { TransactionManager } from '@/core/transaction/transaction';
import type { TransactionData, TransactionWithDeadline } from '@/core/types';

export class UniswapV2 {
  private client: PublicClient;
  private transactionManager: TransactionManager;
  private tokenAddress: `0x${string}`;
  private chainId: ChainId

  constructor(
    client: PublicClient,
    transactionManager: TransactionManager,
    tokenAddress: `0x${string}`,
    chainId: ChainId
  ) {
    this.client = client;
    this.transactionManager = transactionManager;
    this.tokenAddress = tokenAddress;
    this.chainId = chainId;
  }

  private createUniswapTxData(
    functionName: string,
    args: any[],
    value?: bigint
  ): TransactionData {
    return {
      address: ChainData[this.chainId].uniswapRouterV2,
      abi: uniswapV2RouterAbi as Abi,
      functionName,
      args,
      value,
    };
  }

  private createERC20TxData(
    functionName: string,
    args: any[]
  ): TransactionData {
    return {
      address: this.tokenAddress,
      abi: erc20Abi as Abi,
      functionName,
      args,
    };
  }

  private addTransactionWithDeadline(
    txWithDeadline: TransactionWithDeadline,
    account: PrivateKeyAccount
  ) {
    this.transactionManager.addTransaction(txWithDeadline, account);
  }

  public lazyApprove(accounts: { id: string, account: PrivateKeyAccount }[]) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const deadline = now + BigInt(900);

    accounts.forEach(accountPair => {
      const txData: TransactionWithDeadline = {
        txData: this.createERC20TxData('approve', [
          ChainData[this.chainId].uniswapRouterV2,
          MAX_UINT256,
        ]),
        deadline,
        notBefore: now,
        id: accountPair.id,
      };

      this.addTransactionWithDeadline(txData, accountPair.account);
    });
  }

  public executeBuys(
    buyParams: { id: string; account: PrivateKeyAccount; ethToSwap: bigint }[]
  ) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const deadline = now + BigInt(900);

    const minTokensOut = BigInt(0);

    buyParams.forEach(buyParam => {
      const txData: TransactionWithDeadline = {
        txData: this.createUniswapTxData(
          'swapExactETHForTokens',
          [
            minTokensOut,
            [ChainData[this.chainId].wethAddress, this.tokenAddress],
            buyParam.account.address,
            deadline,
          ],
          buyParam.ethToSwap
        ),
        deadline,
        id: buyParam.id,
        notBefore: now,
      };

      this.addTransactionWithDeadline(txData, buyParam.account);
    });
  }

  public executeSells(
    sellParams: {
      id: string;
      account: PrivateKeyAccount;
      amountToSell: bigint;
    }[]
  ) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const deadline = now + BigInt(900);
    const minEthOut = BigInt(0); // Note: calculate in transaction calculator

    sellParams.forEach(sellParam => {
      const txData: TransactionWithDeadline = {
        txData: this.createUniswapTxData(
          'swapExactTokensForETH',
          [
            sellParam.amountToSell,
            minEthOut,
            [this.tokenAddress, ChainData[this.chainId].wethAddress],
            sellParam.account.address,
            deadline,
          ]
        ),
        id: sellParam.id,
        deadline,
        notBefore: now + BigInt(ChainData[this.chainId]?.blockTime ?? 12) * 1n, // delay by 1 blocks
      };

      this.addTransactionWithDeadline(txData, sellParam.account);
    });
  }

  public transferAllToMain(
    accounts: { id: string; account: PrivateKeyAccount }[],
    mainAccountAddress: `0x${string}`
  ) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const deadline = now + BigInt(900);

    accounts.forEach(async (accountPair) => {
      const balance = await this.client.getBalance({
        address: accountPair.account.address,
      });
      const { maxFeePerGas } = await this.client.estimateFeesPerGas()
      const gasPrice = BigInt(Math.floor(Number(maxFeePerGas) * 1.10)); // Special case for transferAllToMain
      const gasLimit = BigInt(GAS_TRANSFER_LIMIT);
      const gasCost = gasPrice * gasLimit ;

      const amountToTransfer = balance - gasCost;

      if (amountToTransfer > 0n) {
        const txData: TransactionWithDeadline = {
          deadline,
          id: accountPair.id,
          notBefore: now,
          txData: {
            address: mainAccountAddress,
            value: amountToTransfer,
            functionName: '', // '' indicates it's a native transfer
            abi: [], // 
            args: [], // 
          },
        };
        this.transactionManager.addTransaction(txData, accountPair.account);
      }
    });
  }
}
