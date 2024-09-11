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
  },
  "11155111": {
    chainId: 11155111,
    chainName: 'Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    nativeSymbol: 'ETH',
    viemChain: sepolia,
    explorer: 'https://sepolia.etherscan.io',
  },
};

export const ChainsSupported = Object.keys(ChainData).map((key) => ChainData[key as unknown as ChainId]);
