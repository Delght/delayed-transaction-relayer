import classNames from 'classnames';
import useAppConfig from '@/app/hooks/useAppConfig';
import { ellipsisAddress, renderTokenAmount } from '@/utils/function';
import { SubAccountWithPercentageAndAmount } from '@/app/type';

export default function SellAccountRow({
  account,
  onChangePercentage,
}: {
  account: SubAccountWithPercentageAndAmount;
  onChangePercentage: (address: string, percentage: string) => void;
}) {
  const { tokenInfo } = useAppConfig();
  return (
    <div
      key={account.address}
      className={classNames('min-h-[40px] flex items-stretch border-t-2 break-all')}
    >
      <div className="w-[20%] flex items-center px-[10px] text-[14px]">
        {ellipsisAddress(account.address)}
      </div>
      <div className="w-[20%] border-l-2 flex items-center px-[10px] text-[14px]">
        {renderTokenAmount(account?.balance)}
        ETH
      </div>
      <div className="w-[20%] border-l-2 flex items-center px-[10px] text-[14px]">
        {renderTokenAmount(account?.balanceToken)}
        {tokenInfo.symbol}
      </div>
      <div className="w-[20%] border-l-2 p-[10px]">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={account.percentage}
          onChange={(e) => {
            const value = e.target.value;
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
              onChangePercentage(account.address, value);
            }
          }}
          className="w-full p-1 border rounded"
        />
      </div>
      <div className="w-[20%] border-l-2 p-[10px]">{account.amount}</div>
    </div>
  );
}
