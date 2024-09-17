import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import BigNumber from 'bignumber.js';
import { parseEther } from 'viem';

import { MIN_BALANCE_THRESHOLD } from '@/config/constants';
import { generateShortId, randomNumber } from '@/utils/function';

import Button from '@/app/components/Button';
import BuyAccountRow from '@/app/components/BuyAccountRow';
import Input from '@/app/components/Input';
import useAppConfig from '@/app/hooks/useAppConfig';
import { BuyParam, SubAccountWithAmount } from '@/app/type';

const minDefault = 0.005;
const maxDefault = 0.01;

export default function BuyConfig({ onPrev, onNext }: { onPrev: () => void, onNext: (buyParams: BuyParam[]) => void }) {
  const { subAccounts, tokenInfo, handleBuy } = useAppConfig();
  const [minEth, setMinEth] = useState(`${minDefault}`);
  const [maxEth, setMaxEth] = useState(`${maxDefault}`);

  const randomParams = useMemo(() => {
    let min = Number.isNaN(Number(minEth)) ? minDefault : Number(minEth);
    const max = Number.isNaN(Number(maxEth)) ? maxDefault : Number(maxEth);

    if (min > max) {
      min = minDefault;
    }

    return {
      min,
      max,
    };
  }, [minEth, maxEth]);

  const subAccountsWithAmount = useMemo<SubAccountWithAmount[]>(() => {
    const result = subAccounts.map(account => {
      const amount = randomNumber(randomParams.min, randomParams.max);

      return {
        ...account,
        amount: BigNumber(`${amount}`).toFixed(18),
      };
    });
    return result;
  }, [subAccounts, randomParams]);

  useEffect(() => {
    setSubAccountsWithAmountLocal(subAccountsWithAmount);
  }, [subAccountsWithAmount]);

  const [subAccountsWithAmountLocal, setSubAccountsWithAmountLocal] = useState<
    SubAccountWithAmount[]
  >(subAccountsWithAmount);

  const filteredSubAccountsWithAmount = useMemo(() => {
    return subAccountsWithAmountLocal.filter(account => {
      return account.balanceWei > MIN_BALANCE_THRESHOLD;
    });
  }, [subAccountsWithAmountLocal]);
  
  const onChangeAmount = (address: string, amount: string) => {
    const clone = [...subAccountsWithAmountLocal];
    const index = clone.findIndex(account => account.address === address);
    if (index !== -1) {
      clone[index].amount = amount;
      setSubAccountsWithAmountLocal(clone);
    }
  };

  const onBuy = async () => {
    const buyParams = subAccountsWithAmountLocal
      .filter(account => account.balanceWei > MIN_BALANCE_THRESHOLD)
      .map(account => {
        if (!account.amount || Number.isNaN(Number(account.amount)) || Number(account.amount) <= 0) {
          return null;
        }
        return {
          id: generateShortId(),
          address: account.address,
          ethToSwap: parseEther(account.amount),
        };
      }).filter(i => !!i)

    await handleBuy(buyParams);
    onNext(buyParams);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center text-[rgb(252,114,255)]">
        Mua token
      </h1>
      <div
        className="mt-[20px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Quay lại bước trước đó
      </div>
      <div className="mt-[20px] w-full max-w-[Min(1200px,90vw)] flex items-center justify-center gap-[20px]">
        <Input
          title="Số lượng ETH tối thiểu dùng để mua:"
          value={minEth}
          placeholder="0"
          onChange={e => setMinEth(e.target.value)}
        />
        <Input
          title="Số lượng ETH tối đa dùng để mua:"
          value={maxEth}
          placeholder="0"
          onChange={e => setMaxEth(e.target.value)}
        />
      </div>
      <div className="mt-[20px] flex flex-col w-full max-w-[Min(1200px,90vw)] border-2">
        <div className={classNames('flex items-center')}>
          <div className="w-[25%] p-[10px] font-bold">Ví phụ</div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            Số dư ETH
          </div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            Số dư {tokenInfo.symbol}
          </div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            Số lượng ETH mua
          </div>
        </div>
        {filteredSubAccountsWithAmount.map(account => (
          <BuyAccountRow
            key={account.address}
            account={account}
            randomParams={randomParams}
            onChangeAmount={(add, val) => onChangeAmount(add, val)}
          />
        ))}
      </div>
      <Button
        onClick={() => {
          onBuy();
        }}
      >
        Mua
      </Button>
    </div>
  );
}
