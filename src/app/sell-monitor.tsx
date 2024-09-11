import classNames from 'classnames';
import useAppConfig from './hooks/useAppConfig';
import SellMonitorRow from './components/SellMonitorRow';

export default function SellMonitor({ onPrev }: { onPrev: () => void }) {
  const { sellMonitors, tokenInfo } = useAppConfig();

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <h1 className="text-2xl font-bold text-center text-[rgb(252,114,255)]">
        Theo dõi giao dịch bán
      </h1>
      <div
        className="mt-[20px]"
        
      >
        Vui lòng không thoát khỏi trang này trong quá trình bán token
      </div>
      <div
        className="mt-[20px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Trở về trang chủ
      </div>
      <div className="mt-[20px] flex flex-col w-full max-w-[Min(1200px,90vw)] border-2">
        <div className={classNames('flex items-center')}>
          <div className="w-[20%] p-[10px] font-bold">Ví phụ</div>
          <div className="w-[15%] border-l-2 p-[10px] font-bold">
            Số dư ETH
          </div>
          <div className="w-[15%] border-l-2 p-[10px] font-bold">
            Số dư {tokenInfo.symbol}
          </div>
          <div className="w-[20%] border-l-2 p-[10px] font-bold">
            Bán / Phê duyệt token
          </div>
          <div className="w-[30%] border-l-2 p-[10px] font-bold">
            Trạng thái
          </div>
        </div>
        {sellMonitors.map(sellParam => (
          <SellMonitorRow
            key={sellParam.id}
            sellParam={sellParam}
          />
        ))}
      </div>
    </div>
  );
}
