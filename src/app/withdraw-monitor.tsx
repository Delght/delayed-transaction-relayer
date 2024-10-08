import classNames from 'classnames';

import useAppConfig from '@/app/hooks/useAppConfig';
import useBalance from '@/app/hooks/useBalance';
import Loading from '@/app/components/Loading';
import WithdrawMonitorRow from '@/app/components/WithdrawMonitorRow';

import { renderTokenAmount } from '@/utils/function';

export default function WithdrawMonitor({ onPrev }: { onPrev: () => void }) {
  const { withdrawMonitors, mainAccount } = useAppConfig();
  const { data: mainAccountBalance, isLoading: loadingMainAccountBalance, refetch } =
    useBalance(mainAccount.address);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center text-[rgb(252,114,255)]">
        Theo dõi giao dịch rút ETH
      </h1>
      <div className="mt-[20px]">
        Vui lòng không thoát khỏi trang này trong quá trình rút ETH
      </div>
      <div className="mt-[20px] text-base flex items-center">
        Số dư ví chính:{' '}
        {!loadingMainAccountBalance ? (
          renderTokenAmount(mainAccountBalance.balance)
        ) : (
          <Loading size={20} />
        )}{' '}
        ETH
      </div>
      <div
        className="mt-[20px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Trở về trang chủ
      </div>
      <div className="mt-[20px] flex flex-col w-full max-w-[900px] border-2">
        <div className={classNames('flex items-center')}>
          <div className="w-[30%] p-[10px] font-bold">Ví phụ</div>
          <div className="w-[30%] border-l-2 p-[10px] font-bold">Số dư ETH</div>
          <div className="w-[40%] border-l-2 p-[10px] font-bold">
            Trạng thái
          </div>
        </div>
        {withdrawMonitors.map(withdrawParam => (
          <WithdrawMonitorRow key={withdrawParam.id} withdrawParam={withdrawParam} refetchMainAccount={refetch} />
        ))}
      </div>
    </div>
  );
}
