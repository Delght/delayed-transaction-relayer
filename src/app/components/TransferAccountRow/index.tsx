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
      className={classNames('min-h-[40px] flex items-stretch border-t-2 break-all')}
    >
      <div className="w-[25%] flex items-center px-[10px] text-[14px]">
        {ellipsisAddress(account.address)}
      </div>
      <div className="w-[25%] border-l-2 flex items-center px-[10px] text-[14px]">
        {renderTokenAmount(account?.balance)} ETH
      </div>
      <div className="w-[25%] border-l-2 flex items-center px-[10px] text-[14px]">
        {renderTokenAmount(account?.balanceToken)} {tokenInfo.symbol}
      </div>
      <div className="w-[25%] border-l-2">
        <input
          className="w-full h-full px-[10px] outline-none text-[14px]"
          placeholder="Nhập số lượng (có thể bỏ trống)"
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
