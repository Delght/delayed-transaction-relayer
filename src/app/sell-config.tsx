import { useState } from 'react';
import classNames from 'classnames';
import BigNumber from 'bignumber.js';
import { erc20Abi, getContract, parseUnits } from 'viem';

import { getPublicClient } from '@/client';
import { ChainData } from '@/config/chains';
import { generateShortId } from '@/utils/function';

import Button from '@/app/components/Button';
import SellAccountRow from '@/app/components/SellAccountRow';
import useAppConfig from '@/app/hooks/useAppConfig';
import { ApproveParam, SellOrApproveMonitor, SubAccountWithPercentageAndAmount } from '@/app/type';

export default function SellConfig({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: (sellParam: SellOrApproveMonitor[]) => void;
}) {
  const { subAccounts, tokenInfo, handleSell, handleApprove,chainId } = useAppConfig();

  const [subAccountsWithPercentage, setSubAccountsWithPercentage] = useState<
    SubAccountWithPercentageAndAmount[]
  >(
    subAccounts
      .filter(account => new BigNumber(account.balanceToken).isGreaterThan(0))
      .map(account => ({
        ...account,
        percentage: '100',
        amount: account.balanceToken,
      }))
  );

  const onChangePercentage = (address: string, percentage: string) => {
    const numPercentage = Number(percentage);
    if (isNaN(numPercentage) || numPercentage < 0 || numPercentage > 100) return;
  
    setSubAccountsWithPercentage(prev => 
      prev.map(account => 
        account.address === address
          ? {
              ...account,
              percentage,
              amount: new BigNumber(account.balanceToken).multipliedBy(percentage).dividedBy(100).toFixed(18),
            }
          : account
      )
    );
  };

  const onSell = async () => {
    const publicClient = getPublicClient(chainId);

    const erc20Contract = getContract({
      abi: erc20Abi,
      address: tokenInfo.address,
      client: publicClient,
    });

    const sellParams = subAccountsWithPercentage
      .filter(account => Number(account.percentage) > 0)
      .map(account => ({
        id: generateShortId(),
        address: account.address,
        amountToSell: parseUnits(account.amount, tokenInfo.decimals),
      }));

    const allowances = await Promise.all(
      sellParams.map(async sellParam => {
        const allowance = await erc20Contract.read.allowance([
          sellParam.address,
          ChainData[chainId].uniswapRouterV2,
        ]);
        return {
          address: sellParam.address,
          allowance: allowance,
        };
      })
    );

    const approveParams: ApproveParam[] = [];
    sellParams.forEach(sellParam => {
      const allowance = allowances.find(
        allowance => allowance.address === sellParam.address
      )?.allowance;
      if (
        allowance !== undefined &&
        BigNumber(`${allowance || 0}`).lt(`${sellParam.amountToSell}`)
      ) {
        approveParams.push({
          id: generateShortId(),
          address: sellParam.address,
        });
      }
    });

    const monitorParams: SellOrApproveMonitor[] = [];
    monitorParams.push(
      ...approveParams.map(approveParam => {
        return {
          id: approveParam.id,
          address: approveParam.address,
          amountToSell: 0n,
          type: 'approve',
        } as SellOrApproveMonitor;
      })
    );

    monitorParams.push(
      ...sellParams.map(sellParam => {
        return {
          id: sellParam.id,
          address: sellParam.address,
          amountToSell: sellParam.amountToSell,
          type: 'sell',
        } as SellOrApproveMonitor;
      })
    );

    if (approveParams.length > 0) {
      const accountsApprove = approveParams.map(approveParam => ({
        address: approveParam.address,
        id: approveParam.id,
      }))
      await handleApprove(accountsApprove);
    }
    await handleSell(sellParams);

    onNext(monitorParams);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center text-[rgb(252,114,255)]">
        Bán token
      </h1>
      <div
        className="mt-[20px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Quay lại bước trước đó
      </div>
      <div className="mt-[20px] flex flex-col w-full max-w-[Min(1200px,90vw)] border-2">
        <div className={classNames('flex items-center')}>
          <div className="w-[20%] p-[10px] font-bold">Ví phụ</div>
          <div className="w-[20%] border-l-2 p-[10px] font-bold">Số dư ETH</div>
          <div className="w-[20%] border-l-2 p-[10px] font-bold">Số dư {tokenInfo.symbol}</div>
          <div className="w-[20%] border-l-2 p-[10px] font-bold">Phần trăm bán (%)</div>
          <div className="w-[20%] border-l-2 p-[10px] font-bold">Số lượng {tokenInfo.symbol} bán</div>
        </div>
        {subAccountsWithPercentage.map(account => (
          <SellAccountRow
            key={account.address}
            account={account}
            onChangePercentage={(add, val) => onChangePercentage(add, val)}
          />
        ))}
      </div>
      <Button onClick={onSell}>Bán</Button>
    </div>
  );
}
