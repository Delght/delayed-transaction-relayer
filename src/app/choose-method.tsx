import Button from './components/Button';

export default function ChooseMethod({
  onPrev,
  onBuy,
  onSell,
}: {
  onPrev: () => void;
  onBuy: () => void;
  onSell: () => void;
}) {
  return (
    <div className="w-full flex flex-col justify-center items-center">
      <h1 className="text-4xl font-bold text-center text-[rgb(252,114,255)]">
        Chọn giao dịch
      </h1>
      <div
        className="mt-[10px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Quay lại bước trước đó
      </div>

      <div className="text-lg mt-[20px]">Chọn giao dịch mua hoặc bán</div>
      <div className="w-full flex items-center max-w-[600px] gap-[20px]">
        <div className='w-full max-w-[50%]'>
          <Button
            onClick={() => {
              onBuy();
            }}
          >
            Mua
          </Button>
        </div>
        <div className='w-full max-w-[50%]'>
          <Button
            onClick={() => {
              onSell();
            }}
          >
            Bán
          </Button>
        </div>
      </div>
    </div>
  );
}
