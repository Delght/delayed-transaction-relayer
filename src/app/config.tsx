import { useState, useEffect } from 'react';
import { isAddress, erc20Abi, getContract } from 'viem';
import { privateKeyToAddress } from 'viem/accounts';

import { getPublicClient } from '../client';
import { ChainId, ChainsSupported } from '../config/chains';
import { isPrivateKey } from '../utils/function';
import { AddressKeyPair } from '../utils/generate';

import Button from './components/Button';
import Input from './components/Input';
import Select from './components/Select';
import useAppConfig from './hooks/useAppConfig';

export default function Config({
  onNext,
}: {
  onNext: (data: {
    account: AddressKeyPair;
    tokenInfo: {
      address: `0x${string}`;
      symbol: string;
      decimals: number;
    };
    chainId: ChainId
  }) => void;
}) {
  const { mainAccount, tokenInfo, chainId: chainDefault } = useAppConfig();
  const [privateKey, setPrivateKey] = useState<string>(
    mainAccount?.privateKey || ''
  );
  const [tokenAddress, setTokenAddress] = useState<string>(
    tokenInfo?.address || ''
  );
  const [tokenSymbol, setTokenSymbol] = useState<string>(
    tokenInfo?.symbol || ''
  );
  const [tokenDecimals, setTokenDecimals] = useState<string>(
    `${tokenInfo?.decimals || ''}`
  );

  const [chainId, setChainId] = useState<string>(`${chainDefault || ChainsSupported[0].chainId}`);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (isAddress(tokenAddress)) {
        setIsLoading(true);
        try {
          const publicClient = getPublicClient(Number(chainId) as ChainId);

          const erc20Contract = getContract({
            abi: erc20Abi,
            address: tokenAddress,
            client: publicClient,
          });
          const [symbol, decimals] = await Promise.all([
            erc20Contract.read.symbol(),
            erc20Contract.read.decimals(),
          ]);

          setTokenSymbol(symbol);
          setTokenDecimals(decimals.toString());
        } catch (error) {
          console.error('Error fetching token info:', error);
          setTokenSymbol('');
          setTokenDecimals('');
        } finally {
          setIsLoading(false);
        }
      } else {
        setTokenSymbol('');
        setTokenDecimals('');
      }
    };

    fetchTokenInfo();
  }, [tokenAddress, chainId]);
  
  const handleNext = () => {
    const pk: `0x${string}` = privateKey.startsWith('0x')
      ? (privateKey as `0x${string}`)
      : `0x${privateKey}`;
    onNext({
      account: {
        address: privateKeyToAddress(pk),
        privateKey: pk,
      },
      tokenInfo: {
        address: tokenAddress as `0x${string}`,
        symbol: tokenSymbol,
        decimals: Number(tokenDecimals),
      },
      chainId: Number(chainId) as ChainId,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center text-[rgb(252,114,255)]">
        Cấu hình
      </h1>
      <div className='mt-[20px] w-full flex justify-center'>
        <Input
          value={privateKey}
          title="Private key account chính:"
          onChange={e => setPrivateKey(e.target.value)}
          placeholder="Nhập private key"
        />
      </div>
      <div className='mt-[20px] w-full flex justify-center'>
        <Input
          value={tokenAddress}
          title='Token Address:'
          onChange={e => setTokenAddress(e.target.value)}
          placeholder="Nhập token address"
        />
      </div>
      <div className='mt-[20px] w-full flex justify-center'>
        <Input
          title='Token Symbol:'
          value={isLoading ? 'Loading...' : tokenSymbol}
          onChange={e => setTokenSymbol(e.target.value)}
          placeholder="Nhập token symbol"
          disabled={true}
        />
      </div>
      <div className='mt-[20px] w-full flex justify-center'>
        <Input
          title='Token Decimals:'
          value={isLoading ? 'Loading...' : tokenDecimals}
          onChange={e => setTokenDecimals(e.target.value)}
          placeholder="Nhập token decimals"
          disabled={true}
        />
      </div>
      <div className='mt-[20px] w-full flex justify-center'>
        <Select
          title='Chain:'
          value={chainId}
          onChange={(e) => setChainId(e.target.value)}
          options={ChainsSupported.map(i => ({ label: i.chainName, value: `${i.chainId}` }))}
        />
      </div>
      <Button
        disabled={
          !isPrivateKey(privateKey) ||
          !isAddress(tokenAddress) ||
          tokenSymbol === '' ||
          tokenDecimals === '' ||
          Number.isNaN(Number(tokenDecimals))
        }
        onClick={() => handleNext()}
      >
        Bước tiếp theo
      </Button>
    </div>
  );
}
