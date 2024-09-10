import classNames from 'classnames';
// import Button from './components/Button';
import useAppConfig from './hooks/useAppConfig';
import BuyMonitorRow from './components/BuyMonitorRow';

export default function BuyMonitor({ onPrev }: { onPrev: () => void }) {
  const { buyMonitors, tokenInfo } = useAppConfig();

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <h1 className="text-4xl font-bold text-center text-[rgb(252,114,255)]">
        Theo dõi giao dịch mua
      </h1>
      <div
        className="mt-[10px]"
        
      >
        Vui lòng không thoát khỏi trang này trong quá trình mua token
      </div>
      <div
        className="mt-[10px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Trở về trang chủ
      </div>
      <div className="mt-[30px] flex flex-col w-full max-w-[1200px] border-2">
        <div className={classNames('flex items-center')}>
          <div className="w-[20%] p-[10px] font-bold">Ví phụ</div>
          <div className="w-[15%] border-l-2 p-[10px] font-bold">
            Số dư ETH
          </div>
          <div className="w-[15%] border-l-2 p-[10px] font-bold">
            Số dư {tokenInfo.symbol}
          </div>
          <div className="w-[20%] border-l-2 p-[10px] font-bold">
            Số lương ETH mua
          </div>
          <div className="w-[30%] border-l-2 p-[10px] font-bold">
            Trạng thái
          </div>
        </div>
        {buyMonitors.map(buyParam => (
          <BuyMonitorRow
            key={buyParam.id}
            buyParam={buyParam}
          />
        ))}
      </div>
      {/* <Button
        onClick={() => {
          onBuy();
        }}
      >
        Buy
      </Button> */}
    </div>
  );
}
