import { useState } from 'react';
import Button from './components/Button';
import Input from './components/Input';
import { isPrivateKey } from '../utils/function';
import { AddressKeyPair } from '../utils/generate';
import { privateKeyToAddress } from 'viem/accounts';
import { isAddress } from 'viem';
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
  }) => void;
}) {
  const { mainAccount, tokenInfo } = useAppConfig();
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
    });
  };

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <h1 className="text-4xl font-bold text-center text-[rgb(252,114,255)]">
        Config
      </h1>
      <div className='mt-[30px] w-full flex justify-center'>
        <Input
          value={privateKey}
          title="Private Key Main Account:"
          onChange={e => setPrivateKey(e.target.value)}
          placeholder="Enter Private Key Main Account"
        />
      </div>
      <div className='mt-[30px] w-full flex justify-center'>
        <Input
          value={tokenAddress}
          title='Token Address:'
          onChange={e => setTokenAddress(e.target.value)}
          placeholder="Enter Token Address"
        />
      </div>
      <div className='mt-[30px] w-full flex justify-center'>
        <Input
          title='Token Symbol:'
          value={tokenSymbol}
          onChange={e => setTokenSymbol(e.target.value)}
          placeholder="Enter Token Symbol"
        />
      </div>
      <div className='mt-[30px] w-full flex justify-center'>
        <Input
          title='Token Decimals:'
          value={tokenDecimals}
          onChange={e => setTokenDecimals(e.target.value)}
          placeholder="Enter Token Decimals"
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
        Next step
      </Button>
    </div>
  );
}