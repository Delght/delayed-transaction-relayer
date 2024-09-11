import { Chain } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

export type ChainId = 11155111 | 1;

export const ChainData: Record<
  ChainId,
  {
    chainName: string;
    chainId: ChainId;
    nativeSymbol: string;
    viemChain: Chain;
    explorer: string;
    uniswapRouterV2: `0x${string}`;
    wethAddress: `0x${string}`;
    disperseAddress: `0x${string}`;
    rpcUrl?: string;
  }
> = {
  1: {
    chainName: 'Ethereum',
    chainId: 1,
    rpcUrl: 'https://eth-pokt.nodies.app',
    nativeSymbol: 'ETH',
    viemChain: mainnet,
    explorer: 'https://etherscan.io',
    uniswapRouterV2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    disperseAddress: '0xD152f549545093347A162Dce210e7293f1452150'
  },
  "11155111": {
    chainId: 11155111,
    chainName: 'Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    nativeSymbol: 'ETH',
    viemChain: sepolia,
    explorer: 'https://sepolia.etherscan.io',
    uniswapRouterV2: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
    wethAddress: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    disperseAddress: '0xD152f549545093347A162Dce210e7293f1452150'
  },
};

export const ChainsSupported = Object.keys(ChainData).map((key) => ChainData[key as unknown as ChainId]);
