import classNames from 'classnames';
import Button from './components/Button';
import useAppConfig from './hooks/useAppConfig';
import { useMemo, useState } from 'react';
import { SubAccountWithAmount } from './type';
import SellAccountRow from './components/SellAccountRow';
import BigNumber from 'bignumber.js';


export default function SellConfig({ onPrev }: {
  onPrev: () => void;
}) {
  const { subAccounts, tokenInfo } = useAppConfig();

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
  console.log(subAccountsWithAmountLocal)

  const onChangeAmount = (address: string, amount: string) => {
    const clone = [...subAccountsWithAmountLocal];
    const index = clone.findIndex(account => account.address === address);
    if (index !== -1) {
      clone[index].amount = amount;
      setSubAccountsWithAmountLocal(clone);
    }
  }

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <h1 className="text-4xl font-bold text-center text-[rgb(252,114,255)]">
        Sell Token
      </h1>
      <div
        className="mt-[10px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Back to prev step
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
            Amount {tokenInfo.symbol} to sell
          </div>
        </div>
        {subAccountsWithAmountLocal.map(account => (
          <SellAccountRow key={account.address} account={account} onChangeAmount={(add, val) => onChangeAmount(add, val)} />
        ))}
      </div>
      <Button>Sell</Button>
    </div>
  );
}
