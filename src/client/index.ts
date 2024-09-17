import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { ChainData, ChainId } from '@/config/chains';

export const getPublicClient = (chainId: ChainId = 11155111) => {
  const chainData = ChainData[chainId]

  if (!chainData) {
    throw new Error('Chain not supported');
  }

  const publicClient = createPublicClient({
    chain: chainData.viemChain,
    transport: http(chainData.rpcUrl),
    batch: {
      multicall: {
        batchSize: 10240,
        wait: 500,
      },
    },
  });
  return publicClient;
};

export const getWalletClient = (
  privateKey: `0x${string}`,
  chainId: ChainId = 11155111
) => {
  const chainData = ChainData[chainId];

  if (!chainData) {
    throw new Error('Chain not supported');
  }

  const walletClient = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: chainData.viemChain,
    transport: http(chainData.rpcUrl),
  });

  return walletClient;
};
