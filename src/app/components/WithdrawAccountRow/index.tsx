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
      className={classNames('h-[50px] flex items-center border-t-2')}
    >
      <div className="w-[50%] h-full flex items-center px-[10px]">
        {ellipsisAddress(account.address)}
      </div>
      <div className="w-[25%] h-full border-l-2 flex items-center px-[10px]">
        {renderTokenAmount(account?.balance)}
        ETH
      </div>
    </div>
  );
}
