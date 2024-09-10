import classNames from 'classnames';
import { ellipsisAddress, renderTokenAmount } from '../../../utils/function';
import useAppConfig from '../../hooks/useAppConfig';
import { SubAccount } from '../../type';

export default function TransferAccountRow({
  account,
  value,
  onChange,
  disabled,
}: {
  account: SubAccount;
  disabled?: boolean;
  value: {
    native: string;
    // token: string;
  };
  onChange: (value: {
    native: string;
    //  token: string
  }) => void;
}) {
  const { tokenInfo } = useAppConfig();

  return (
    <div
      key={account.address}
      className={classNames('h-[50px] flex items-center border-t-2')}
    >
      <div className="w-[25%] h-full flex items-center px-[10px]">
        {ellipsisAddress(account.address)}
      </div>
      <div className="w-[25%] h-full border-l-2 flex items-center px-[10px]">
        {renderTokenAmount(account?.balance)} ETH
      </div>
      <div className="w-[25%] h-full border-l-2 flex items-center px-[10px]">
        {renderTokenAmount(account?.balanceToken)} {tokenInfo.symbol}
      </div>
      <div className="w-[25%] h-full border-l-2">
        <input
          className="w-full h-full px-[10px] outline-none"
          placeholder="Enter amount here"
          value={value.native}
          disabled={disabled}
          onChange={e => onChange({ ...value, native: e.target.value })}
        />
      </div>
      {/* <div className="w-[25%] h-full border-l-2 ">
        <input
          className="w-full h-full px-[10px] outline-none"
          placeholder="Enter amount here"
          value={value.token}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, token: e.target.value })}
        />
      </div> */}
    </div>
  );
}
