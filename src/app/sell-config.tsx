import classNames from 'classnames';
import Button from './components/Button';
import useAppConfig from './hooks/useAppConfig';
import { useMemo, useState } from 'react';
import { ApproveParam, SellOrApproveMonitor, SubAccountWithAmount } from './type';
import SellAccountRow from './components/SellAccountRow';
import BigNumber from 'bignumber.js';
import { generateShortId } from '../utils/function';
import { erc20Abi, getContract, parseUnits } from 'viem';
import { getPublicClient } from '../client';
import { config } from '../config/config';

export default function SellConfig({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: (sellParam: SellOrApproveMonitor[]) => void;
}) {
  const { subAccounts, tokenInfo, handleSell, handleApprove } = useAppConfig();

  const subAccountsWithAmount = useMemo<SubAccountWithAmount[]>(() => {
    const result = subAccounts.map(account => {
      return {
        ...account,
        amount: BigNumber(account.balanceToken).toFixed(8),
      };
    });
    return result;
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
    const publicClient = getPublicClient();

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
          config.UNISWAP_V2_ROUTER_ADDRESS,
        ]);
        return {
          address: sellParam.address,
          allowance: allowance,
        };
      })
    );
    console.log({allowances, sellParams});
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
    <div className="w-full flex flex-col justify-center items-center">
      <h1 className="text-4xl font-bold text-center text-[rgb(252,114,255)]">
        Bán token
      </h1>
      <div
        className="mt-[10px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Quay lại bước trước đó
      </div>
      <div className="mt-[30px] flex flex-col w-full max-w-[1200px] border-2">
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
