import { useQuery } from '@tanstack/react-query';
import { getPublicClient } from '../../client';
import { erc20Abi, formatEther, formatUnits, getContract } from 'viem';
import { useMemo } from 'react';
import useAppConfig from './useAppConfig';
import { ChainId } from '../../config/chains';

export type AccountBalance = {
  balanceWei: bigint;
  balance: string;
  balanceToken: string;
  balanceTokenWei: bigint;
};

export default function useBalance(userAddress: `0x${string}`) {
  const { tokenInfo, chainId } = useAppConfig();
  const { data: balanceData, isLoading, refetch } = useQuery({
    enabled: !!tokenInfo && !!tokenInfo?.address && !!userAddress,
    queryKey: ['balance', userAddress, tokenInfo.address, chainId],
    queryFn: async ({ queryKey }) => {
      const userAddress = queryKey[1] as `0x${string}`;
      const tokenAddress = queryKey[2] as `0x${string}`;
      const chainId = queryKey[3] as ChainId;
      const publicClient = getPublicClient(chainId)
      const erc20Contract = getContract({
        abi: erc20Abi,
        address: tokenAddress,
        client: publicClient,
      });
      const [balance, balanceToken] = await Promise.all([
        await publicClient.getBalance({
          address: userAddress,
        }),
        erc20Contract.read.balanceOf([userAddress]),
      ]);

      return {
        balanceWei: balance,
        balanceTokenWei: balanceToken,
      };
    },
    staleTime: 10000,
  });

  const data = useMemo(() => {
    if (balanceData) {
      return {
        balanceWei: balanceData.balanceWei,
        balance: formatEther(balanceData.balanceWei),
        balanceToken: formatUnits(
          balanceData.balanceTokenWei,
          tokenInfo.decimals
        ),
        balanceTokenWei: balanceData.balanceTokenWei,
      };
    }
    return {
      balanceWei: BigInt(0),
      balance: '0',
      balanceToken: '0',
      balanceTokenWei: BigInt(0),
    };
  }, [balanceData, tokenInfo.decimals]);

  return {
    data,
    isLoading,
    refetch,
  };
}
