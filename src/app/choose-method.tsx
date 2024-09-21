import Button from '@/app/components/Button';

export default function ChooseMethod({
  onPrev,
  onDisperse,
  onBuy,
  onSell,
  onWithdraw,
}: {
  onPrev: () => void;
  onDisperse: () => void;
  onBuy: () => void;
  onSell: () => void;
  onWithdraw: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center text-[rgb(252,114,255)]">
        Chọn giao dịch
      </h1>
      <div
        className="mt-[20px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Quay lại bước trước đó
      </div>

      <div className="text-base mt-[20px]">Chọn giao dịch mua, bán hoặc rút ETH</div>
      <div className="w-full flex items-center justify-center max-w-[500px] gap-[20px]">
        <div className='w-full max-w-[25%]'>
          <Button onClick={onDisperse}>Chuyển ETH</Button>
        </div>
        <div className='w-full max-w-[25%]'>
          <Button
            onClick={() => {
              onBuy();
            }}
          >
            Mua
          </Button>
        </div>
        <div className='w-full max-w-[25%]'>
          <Button
            onClick={() => {
              onSell();
            }}
          >
            Bán
          </Button>
        </div>
        <div className='w-full max-w-[25%]'>
          <Button
            onClick={() => {
              onWithdraw();
            }}
          >
            Rút ETH
          </Button>
        </div>
      </div>
    </div>
  );
}
