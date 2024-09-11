import classNames from 'classnames';
import {
  ellipsisAddress,
  renderTokenAmount,
  viewTransaction,
} from '../../../utils/function';
import useBalance from '../../hooks/useBalance';
import Loading from '../Loading';
import { useEffect, useState } from 'react';
import Observer from '../../../utils/observer';
import { WithdrawParam } from '../../type';

export default function WithdrawMonitorRow({
  withdrawParam,
  refetchMainAccount,
}: {
  withdrawParam: WithdrawParam;
  refetchMainAccount: any
}) {
  const {
    data: dataBalance,
    isLoading: loadingBalance,
    refetch,
  } = useBalance(withdrawParam.address);

  const [status, setStatus] = useState('waiting');

  useEffect(() => {
    const listener = (data: string) => {
      setStatus(data);
    };
    Observer.on(`${withdrawParam.id}`, listener);
    return () => {
      Observer.removeListener(`${withdrawParam.id}`, listener);
    };
  }, [withdrawParam.id]);

  useEffect(() => {
    if (status.startsWith('0x')) {
      refetch();
      refetchMainAccount()
    }
  }, [status, refetch, refetchMainAccount]);

  return (
    <div
      key={withdrawParam.address}
      className={classNames('min-h-[40px] flex items-stretch border-t-2 break-all')}
    >
      <div className="w-[30%] flex items-center px-[10px] text-[14px]">
        {ellipsisAddress(withdrawParam.address)}
      </div>
      <div className="w-[30%] border-l-2 flex items-center px-[10px] text-[14px]">
        {loadingBalance ? (
          <Loading size={20} />
        ) : (
          renderTokenAmount(dataBalance?.balance)
        )}{' '}
        ETH
      </div>
      <div
        className={classNames(
          'w-[40%] border-l-2 flex items-center gap-[5px] px-[10px] text-[14px]',
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
