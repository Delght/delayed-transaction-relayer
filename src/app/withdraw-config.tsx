import classNames from 'classnames';
import Button from './components/Button';
import useAppConfig from './hooks/useAppConfig';
import { useMemo } from 'react';
import { SubAccountWithAmount, WithdrawParam } from './type';
import BigNumber from 'bignumber.js';
import WithdrawAccountRow from './components/WithdrawAccountRow';
import { parseEther } from 'viem';
import { generateShortId } from '../utils/function';
import { MIN_BALANCE_THRESHOLD } from '../config/constants';

export default function WithdrawConfig({
  onPrev,
  onNext,
}: {
  onPrev: () => void;
  onNext: (withdrawParam: WithdrawParam[]) => void;
}) {
  const { subAccounts, handleWithdraw } = useAppConfig();

  const subAccountsWithAmount = useMemo<SubAccountWithAmount[]>(() => {
    return subAccounts
      .filter(account => account.balanceWei > MIN_BALANCE_THRESHOLD)
      .map(account => ({
        ...account,
        amount: BigNumber(`${parseEther(account.balance)}`).toFixed(18),
      }));
  }, [subAccounts]);

  const onWithdraw = async () => {
    const withdrawParams: WithdrawParam[] = subAccountsWithAmount
      .filter(
        account => account?.amount && BigNumber(`${account.amount}`).gt(0)
      )
      .map(account => {
        return {
          id: generateShortId(),
          address: account.address,
        };
      });
    await handleWithdraw(withdrawParams);
    onNext(withdrawParams);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center text-[rgb(252,114,255)]">
        Rút ETH về ví chính
      </h1>
      <div
        className="mt-[20px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Quay lại bước trước đó
      </div>
      <div className="mt-[20px] flex flex-col w-full max-w-[900px] border-2">
        <div className={classNames('flex items-center')}>
          <div className="w-[50%] p-[10px] font-bold">Ví phụ</div>
          <div className="w-[50%] border-l-2 p-[10px] font-bold">Số dư ETH</div>
        </div>
        {subAccountsWithAmount.map(account => (
          <WithdrawAccountRow key={account.address} account={account} />
        ))}
      </div>
      <Button onClick={() => onWithdraw()}>Rút ETH</Button>
    </div>
  );
}
