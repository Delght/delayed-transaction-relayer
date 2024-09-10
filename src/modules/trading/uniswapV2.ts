import type { PrivateKeyAccount, Abi } from 'viem';
import { config } from '../../config/config';
import {
  UNISWAP_V2_ROUTER_ABI,
  ERC20_ABI,
  MAX_UINT256,
} from '../../config/constants';
import type {
  TransactionData,
  TransactionWithDeadline,
} from '../../types/types';
import { TransactionManager } from '../../modules/transaction/transaction';

export class UniswapV2 {
  private transactionManager: TransactionManager;
  private tokenAddress: `0x${string}`;

  constructor(
    transactionManager: TransactionManager,
    tokenAddress: `0x${string}`
  ) {
    this.transactionManager = transactionManager;
    this.tokenAddress = tokenAddress;
  }

  private createUniswapTxData(
    functionName: string,
    args: any[],
    value?: bigint
  ): TransactionData {
    return {
      address: config.UNISWAP_V2_ROUTER_ADDRESS,
      abi: UNISWAP_V2_ROUTER_ABI as Abi,
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
      abi: ERC20_ABI as Abi,
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
    accounts.forEach(accountPair => {
      const txData: TransactionWithDeadline = {
        txData: this.createERC20TxData('approve', [
          config.UNISWAP_V2_ROUTER_ADDRESS,
          MAX_UINT256,
        ]),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 900),
        notBefore: BigInt(Math.floor(Date.now() / 1000)),
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
          'swapExactETHForTokensSupportingFeeOnTransferTokens',
          [
            minTokensOut,
            [config.WETH_ADDRESS, this.tokenAddress],
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
    const minEthOut = BigInt(0); // TODO: slippage protection

    sellParams.forEach(sellParam => {
      const txData: TransactionWithDeadline = {
        txData: this.createUniswapTxData(
          'swapExactTokensForETHSupportingFeeOnTransferTokens',
          [
            sellParam.amountToSell,
            minEthOut,
            [this.tokenAddress, config.WETH_ADDRESS],
            sellParam.account.address,
            deadline,
          ]
        ),
        id: sellParam.id,
        deadline,
        notBefore: now,
      };

      this.addTransactionWithDeadline(txData, sellParam.account);
    });
  }
}
