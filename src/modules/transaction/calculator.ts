import type { PublicClient } from 'viem';
import {
  UNISWAP_V2_ROUTER_ABI, 
  SLIPPAGE_TOLERANCE_BASIS_POINTS,
  ONE_HUNDRED_PERCENT,
} from '../../config/constants';


export class TransactionDataCalculator {
    private client: PublicClient;
    private uniswapRouterAddress: `0x${string}`;

    constructor(client: PublicClient, uniswapRouterAddress: `0x${string}`) {
      this.client = client;
      this.uniswapRouterAddress = uniswapRouterAddress;
    }
  
    public async getAmountsOut(amountIn: bigint, path: `0x${string}`[]): Promise<bigint> {
      const amountsOut = await this.client.readContract({
        address: this.uniswapRouterAddress,
        abi: UNISWAP_V2_ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [amountIn, path],
      }) as bigint[];
      
      if (amountsOut.length === 0) {
        return 0n;
      }
      
      return amountsOut[amountsOut.length - 1]; // Last element is the output amount
    }
  
    public calculateMinAmountWithSlippage(amount: bigint): bigint {
      const slippageFactor = (amount * BigInt(SLIPPAGE_TOLERANCE_BASIS_POINTS)) / BigInt(ONE_HUNDRED_PERCENT);
      return amount - slippageFactor;
    } 
}