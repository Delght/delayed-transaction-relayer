import { Chain } from 'viem';
import { mainnet, sepolia, base } from 'viem/chains';

export type ChainId = 11155111 | 1 | 8453;

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
    multicallAddress: `0x${string}`;
    rpcUrl?: string;
    blockTime?: number;
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
    disperseAddress: '0xD152f549545093347A162Dce210e7293f1452150',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    blockTime: 12
  },
  8453: {
    chainId: 8453,
    chainName: 'Base',
    rpcUrl: 'https://base-rpc.publicnode.com',
    nativeSymbol: 'ETH',
    viemChain: base,
    explorer: 'https://basescan.org',
    uniswapRouterV2: '0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24',
    wethAddress: '0x4200000000000000000000000000000000000006',
    disperseAddress: '0xD152f549545093347A162Dce210e7293f1452150',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    blockTime: 3
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
    disperseAddress: '0xD152f549545093347A162Dce210e7293f1452150',
    multicallAddress: '0xcA11bde05977b3631167028862bE2a173976CA11',
    blockTime: 12
  },
};

export const ChainsSupported = Object.keys(ChainData).map((key) => ChainData[key as unknown as ChainId]);
