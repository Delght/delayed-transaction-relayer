import type { PrivateKeyAccount, Abi } from "viem";
import { config } from '@/config/config';
import { UNISWAP_V2_ROUTER_ABI, ERC20_ABI, MAX_UINT256 } from '@/config/constants';
import type { TransactionData, TransactionWithDeadline } from '@/types/types';
import { TransactionManager } from "@/modules/transaction/transaction";

export class UniswapV2 {
  private transactionManager: TransactionManager;

  constructor(transactionManager: TransactionManager) {
    this.transactionManager = transactionManager;
  }

  private createUniswapTxData(functionName: string, args: any[], value?: bigint): TransactionData {
    return {
      address: config.UNISWAP_V2_ROUTER_ADDRESS,
      abi: UNISWAP_V2_ROUTER_ABI as Abi,
      functionName,
      args,
      value,
    };
  }

  private createERC20TxData(functionName: string, args: any[]): TransactionData {
    return {
      address: config.TOKEN_ADDRESS,
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

  public lazyApprove(accounts: { account: PrivateKeyAccount }[]) {    
    accounts.forEach((accountPair) => {
      const txData: TransactionWithDeadline = {
        txData: this.createERC20TxData(
          "approve",
          [config.UNISWAP_V2_ROUTER_ADDRESS, MAX_UINT256]
        ),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 900),
        notBefore: BigInt(Math.floor(Date.now() / 1000)),
      };

      this.addTransactionWithDeadline(txData, accountPair.account);
    });
  }

  public executeBuys(accounts: { account: PrivateKeyAccount }[]) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const deadline = now + BigInt(900);
    const ethToSwap = BigInt(Math.floor(0.0001 * 10 ** 18));
    const minTokensOut = BigInt(0);

    accounts.forEach((accountPair) => {
      const txData: TransactionWithDeadline = {
        txData: this.createUniswapTxData(
          "swapExactETHForTokensSupportingFeeOnTransferTokens",
          [
            minTokensOut,
            [config.WETH_ADDRESS, config.TOKEN_ADDRESS],
            accountPair.account.address,
            deadline,
          ],
          ethToSwap
        ),
        deadline,
        notBefore: now,
      };

      this.addTransactionWithDeadline(txData, accountPair.account);
    });
  }

  public executeSells(accounts: { account: PrivateKeyAccount }[], amountToSell: bigint) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const deadline = now + BigInt(900);
    const minEthOut = BigInt(0); // TODO: slippage protection

    accounts.forEach((accountPair) => {
      const txData: TransactionWithDeadline = {
        txData: this.createUniswapTxData(
          "swapExactTokensForETHSupportingFeeOnTransferTokens",
          [
            amountToSell,
            minEthOut,
            [config.TOKEN_ADDRESS, config.WETH_ADDRESS],
            accountPair.account.address,
            deadline,
          ]
        ),
        deadline,
        notBefore: now,
      };

      this.addTransactionWithDeadline(txData, accountPair.account);
    });
  }
}