import classNames from 'classnames';
import { ellipsisAddress, renderTokenAmount } from '../../../utils/function';
import { SubAccountWithAmount } from '../../type';

export default function WithdrawAccountRow({
  account,
}: {
  account: SubAccountWithAmount;
}) {
  return (
    <div
      key={account.address}
      className={classNames('min-h-[40px] flex items-stretch border-t-2 break-all')}
    >
      <div className="w-[50%] flex items-center px-[10px] text-[14px]">
        {ellipsisAddress(account.address)}
      </div>
      <div className="w-[25%] border-l-2 flex items-center px-[10px] text-[14px]">
        {renderTokenAmount(account?.balance)}
        ETH
      </div>
    </div>
  );
}
