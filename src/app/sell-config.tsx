import { useMemo, useState } from 'react';
import classNames from 'classnames';
import BigNumber from 'bignumber.js';
import { erc20Abi, getContract, parseUnits } from 'viem';

import { getPublicClient } from '../client';
import { ChainData } from '../config/chains';
import { generateShortId } from '../utils/function';

import Button from './components/Button';
import SellAccountRow from './components/SellAccountRow';
import useAppConfig from './hooks/useAppConfig';
import { ApproveParam, SellOrApproveMonitor, SubAccountWithAmount } from './type';

export default function SellConfig({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: (sellParam: SellOrApproveMonitor[]) => void;
}) {
  const { subAccounts, tokenInfo, handleSell, handleApprove,chainId } = useAppConfig();

  const subAccountsWithAmount = useMemo<SubAccountWithAmount[]>(() => {
    return subAccounts
      .filter(account => new BigNumber(account.balanceToken).isGreaterThan(0))
      .map(account => ({
        ...account,
        amount: new BigNumber(account.balanceToken).toFixed(18),
      }));
  }, [subAccounts]);

  const [subAccountsWithAmountLocal, setSubAccountsWithAmountLocal] = useState<
    SubAccountWithAmount[]
  >(subAccountsWithAmount);
  console.log(subAccountsWithAmountLocal);

  const onChangeAmount = (address: string, amount: string) => {
    const clone = [...subAccountsWithAmountLocal];
    const index = clone.findIndex(account => account.address === address);
    if (index !== -1) {
      clone[index].amount = amount;
      setSubAccountsWithAmountLocal(clone);
    }
  };

  const onSell = async () => {
    const publicClient = getPublicClient(chainId);

    const erc20Contract = getContract({
      abi: erc20Abi,
      address: tokenInfo.address,
      client: publicClient,
    });

    const sellParams = subAccountsWithAmountLocal
      .filter(
        account => account?.amount && !Number.isNaN(Number(account.amount)) && Number(account.amount) > 0
      )
      .map(account => {
        return {
          id: generateShortId(),
          address: account.address,
          amountToSell: parseUnits(account.amount, tokenInfo.decimals),
        };
      });

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
          <div className="w-[25%] p-[10px] font-bold">Ví phụ</div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">Số dư ETH</div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            Số dư {tokenInfo.symbol}
          </div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            Số lượng {tokenInfo.symbol} bán
          </div>
        </div>
        {subAccountsWithAmountLocal.map(account => (
          <SellAccountRow
            key={account.address}
            account={account}
            onChangeAmount={(add, val) => onChangeAmount(add, val)}
          />
        ))}
      </div>
      <Button onClick={() => onSell()}>Bán</Button>
    </div>
  );
}
