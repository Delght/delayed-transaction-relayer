import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { config } from '../config/config';
import { privateKeyToAccount } from 'viem/accounts';

const customHttpTransport = http(config.RPC_URL);

export const getPublicClient = (chainId?: number) => {
  console.log('getPublicClient', chainId);
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: customHttpTransport,
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
  chainId?: number
) => {
  console.log('getWalletClient', chainId);
  const walletClient = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: sepolia,
    transport: customHttpTransport,
  });

  return walletClient;
};
