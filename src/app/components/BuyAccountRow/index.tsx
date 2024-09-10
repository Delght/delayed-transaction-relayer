import classNames from 'classnames';
import {
  ellipsisAddress,
  randomNumber,
  renderTokenAmount,
} from '../../../utils/function';
import useAppConfig from '../../hooks/useAppConfig';
import { SubAccountWithAmount } from '../../type';

export default function BuyAccountRow({
  account,
  randomParams,
  onChangeAmount,
}: {
  account: SubAccountWithAmount;
  onChangeAmount: (address: string, amount: string) => void;
  randomParams: {
    min: number;
    max: number;
  };
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
      <div className="w-[25%] h-full border-l-2 pr-[40px] relative flex items-center">
        <input
          className="w-full h-full px-[10px] outline-none"
          value={account.amount}
          onChange={e => onChangeAmount(account.address, e.target.value)}
          placeholder="Enter amount here"
        />
        <img
          src="/reload.svg"
          onClick={() => {
            onChangeAmount(
              account.address,
              `${randomNumber(randomParams.min, randomParams.max)}`
            );
          }}
          className="w-[24px] absolute right-[10px] cursor-pointer"
        />
      </div>
    </div>
  );
}
