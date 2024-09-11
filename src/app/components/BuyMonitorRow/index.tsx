import classNames from 'classnames';
import {
  ellipsisAddress,
  renderTokenAmount,
  viewTransaction,
} from '../../../utils/function';
import useAppConfig from '../../hooks/useAppConfig';
import { BuyParam } from '../../type';
import useBalance from '../../hooks/useBalance';
import Loading from '../Loading';
import { formatEther } from 'viem';
import { useEffect, useState } from 'react';
import Observer from '../../../utils/observer';

export default function BuyMonitorRow({ buyParam }: { buyParam: BuyParam }) {
  const { tokenInfo } = useAppConfig();
  const {
    data: dataBalance,
    isLoading: loadingBalance,
    refetch,
  } = useBalance(buyParam.address);

  const [status, setStatus] = useState('waiting');

  useEffect(() => {
    const listener = (data: string) => {
      setStatus(data);
    };
    Observer.on(`${buyParam.id}`, listener);
    return () => {
      Observer.removeListener(`${buyParam.id}`, listener);
    };
  }, [buyParam.id]);

  useEffect(() => {
    if (status.startsWith('0x')) {
      refetch();
    }
  }, [status, refetch]);

  return (
    <div
      key={buyParam.address}
      className={classNames('min-h-[40px] flex items-stretch border-t-2 break-all')}
    >
      <div className="w-[20%] flex items-center px-[10px] text-[14px]">
        {ellipsisAddress(buyParam.address)}
      </div>
      <div className="w-[15%] border-l-2 flex items-center px-[10px] text-[14px]">
        {loadingBalance ? (
          <Loading size={20} />
        ) : (
          renderTokenAmount(dataBalance?.balance)
        )}{' '}
        ETH
      </div>
      <div className="w-[15%] border-l-2 flex items-center px-[10px] text-[14px]">
        {loadingBalance ? (
          <Loading size={20} />
        ) : (
          renderTokenAmount(dataBalance?.balanceToken)
        )}{' '}
        {tokenInfo.symbol}
      </div>
      <div className="w-[20%] border-l-2 flex items-center  px-[10px] text-[14px]">
        {formatEther(buyParam.ethToSwap)} ETH
      </div>
      <div
        className={classNames(
          'w-[30%] border-l-2 flex items-center gap-[5px] px-[10px] text-[14px]',
          {
            'text-orange-300': status === 'waiting',
            'text-green-300 cursor-pointer': status.startsWith('0x'),
            'text-red-300': status === 'failed',
          }
        )}
        onClick={() => {
          if (status.startsWith('0x')) {
            viewTransaction(status);
          }
        }}
      >
        {status === 'waiting' && (
          <>
            <Loading size={20} />
            <span>Đang chờ thực hiện</span>
          </>
        )}
        {
          status === 'failed' && (<>
            Thất bại
          </>)
        }
        {status.startsWith('0x') && (
          <>
            <span>Thành công - Tx hash: {ellipsisAddress(status)}</span>
          </>
        )}
      </div>
    </div>
  );
}
