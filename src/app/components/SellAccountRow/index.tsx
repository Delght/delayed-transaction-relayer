import classNames from 'classnames';
import { ellipsisAddress, renderTokenAmount } from '../../../utils/function';
import useAppConfig from '../../hooks/useAppConfig';
import { SubAccountWithAmount } from '../../type';

export default function SellAccountRow({
  account,
  onChangeAmount,
}: {
  account: SubAccountWithAmount;
  onChangeAmount: (address: string, amount: string) => void;
}) {
  const { tokenInfo } = useAppConfig();
  return (
    <div
      key={account.address}
      className={classNames('min-h-[40px] flex items-stretch border-t-2 break-all')}
    >
      <div className="w-[25%] flex items-center px-[10px] text-[14px]">
        {ellipsisAddress(account.address)}
      </div>
      <div className="w-[25%] border-l-2 flex items-center px-[10px] text-[14px]">
        {renderTokenAmount(account?.balance)}
        ETH
      </div>
      <div className="w-[25%] border-l-2 flex items-center px-[10px] text-[14px]">
        {renderTokenAmount(account?.balanceToken)}
        {tokenInfo.symbol}
      </div>
      <div className="w-[25%] border-l-2 relative flex items-center text-[14px]">
        <input
          className="w-full px-[10px] outline-none text-[14px]"
          value={account.amount}
          onChange={e => onChangeAmount(account.address, e.target.value)}
          placeholder="Nhập số lượng bán"
        />
      </div>
    </div>
  );
}
