import classNames from 'classnames';
import {
  ellipsisAddress,
  renderTokenAmount,
  viewTransaction,
} from '../../../utils/function';
import useAppConfig from '../../hooks/useAppConfig';
import useBalance from '../../hooks/useBalance';
import Loading from '../Loading';
import { formatUnits } from 'viem';
import { useEffect, useState } from 'react';
import Observer from '../../../utils/observer';
import { SellOrApproveMonitor } from '../../type';

export default function SellMonitorRow({
  sellParam,
}: {
  sellParam: SellOrApproveMonitor;
}) {
  const { tokenInfo } = useAppConfig();
  const {
    data: dataBalance,
    isLoading: loadingBalance,
    refetch,
  } = useBalance(sellParam.address);

  const [status, setStatus] = useState('waiting');

  useEffect(() => {
    const listener = (data: string) => {
      setStatus(data);
    };
    Observer.on(`${sellParam.id}`, listener);
    return () => {
      Observer.removeListener(`${sellParam.id}`, listener);
    };
  }, [sellParam.id]);

  useEffect(() => {
    if (status.startsWith('0x')) {
      refetch();
    }
  }, [status, refetch]);

  return (
    <div
      key={sellParam.address}
      className={classNames('min-h-[40px] flex items-stretch border-t-2 break-all')}
    >
      <div className="w-[20%] flex items-center px-[10px] text-[14px]">
        {ellipsisAddress(sellParam.address)}
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
        {sellParam.type === 'approve' ? (
          <>Approve Max</>
        ) : (
          <>
            {formatUnits(sellParam.amountToSell, tokenInfo.decimals)}{' '}
            {tokenInfo.symbol}
          </>
        )}
      </div>
      <div
        className={classNames(
          'w-[30%] border-l-2 flex items-center gap-[5px] px-[10px]',
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
        {status === 'failed' && <>Thất bại</>}
        {status.startsWith('0x') && (
          <>
            <span>Thành công - Tx hash: {ellipsisAddress(status)}</span>
          </>
        )}
      </div>
    </div>
  );
}
