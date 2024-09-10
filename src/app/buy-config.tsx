import classNames from 'classnames';
import Button from './components/Button';
import useAppConfig from './hooks/useAppConfig';
import BuyAccountRow from './components/BuyAccountRow';
import Input from './components/Input';
import { useEffect, useMemo, useState } from 'react';
import { randomNumber } from '../utils/function';
import { SubAccountWithAmount } from './type';
import BigNumber from 'bignumber.js';
import { parseEther } from 'viem';

const minDefault = 0.005;
const maxDefault = 0.01;

export default function BuyConfig({ onPrev }: { onPrev: () => void }) {
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
        amount: BigNumber(`${amount}`).toFixed(8),
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
  console.log(subAccountsWithAmountLocal);

  const onChangeAmount = (address: string, amount: string) => {
    const clone = [...subAccountsWithAmountLocal];
    const index = clone.findIndex(account => account.address === address);
    if (index !== -1) {
      clone[index].amount = amount;
      setSubAccountsWithAmountLocal(clone);
    }
  };

  const onBuy = async () => {
    await handleBuy(
      subAccountsWithAmountLocal.map(account => ({
        address: account.address,
        ethToSwap: parseEther(account.amount),
      }))
    );
  };

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <h1 className="text-4xl font-bold text-center text-[rgb(252,114,255)]">
        Buy Token
      </h1>
      <div
        className="mt-[10px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Back to prev step
      </div>
      <div className="mt-[20px] w-full max-w-[1200px] flex items-center gap-[20px]">
        <Input
          title="Min ETH to buy:"
          value={minEth}
          placeholder="0"
          onChange={e => setMinEth(e.target.value)}
        />
        <Input
          title="Max ETH to buy:"
          value={maxEth}
          placeholder="0"
          onChange={e => setMaxEth(e.target.value)}
        />
      </div>
      <div className="mt-[30px] flex flex-col w-full max-w-[1200px] border-2">
        <div className={classNames('flex items-center')}>
          <div className="w-[25%] p-[10px] font-bold">Sub Account</div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            ETH Balance
          </div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            {tokenInfo.symbol} Balance
          </div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            Amount ETH to buy
          </div>
        </div>
        {subAccountsWithAmountLocal.map(account => (
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
        Buy
      </Button>
    </div>
  );
}
