import { getPublicClient, getWalletClient } from '../client';
import BigNumber from 'bignumber.js'
export const sendTransaction = async ({
  privateKey,
  to,
  data,
  value,
  chainId,
}: {
  privateKey: `0x${string}`;
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
  chainId?: number;
}) => {
  const publicClient = getPublicClient(chainId);
  const walletClient = getWalletClient(privateKey, chainId);

  const [gas, gasPrice] = await Promise.all([
    publicClient.estimateGas({
      account: walletClient.account,
      to,
      data,
      value,
    }),
    publicClient.getGasPrice()
  ]);
  

  const txHash = await walletClient.sendTransaction({
    to,
    data,
    value,
    gasLimit: BigInt(BigNumber(`${gas}`).times(1.1).toFixed(0)) ,
    gasPrice: BigInt(BigNumber(`${gasPrice}`).times(1.1).toFixed(0)),
  });
  console.log('txHash', txHash);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  return receipt;
};
