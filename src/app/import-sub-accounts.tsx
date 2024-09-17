import { useState } from 'react';

import { getContentFile, parseJSON, renderTokenAmount } from '@/utils/function';
import { AddressKeyPair, generateAddressesAndKeys } from '@/utils/generate';

import Button from '@/app/components/Button';
import Loading from '@/app/components/Loading';
import useAppConfig from '@/app/hooks/useAppConfig';
import useBalance from '@/app/hooks/useBalance';

export default function ImportSubAccounts({
  onNext,
  onPrev,
}: {
  onNext: (subAccounts: AddressKeyPair[]) => void;
  onPrev: () => void;
}) {
  const { mainAccount, tokenInfo, subAccounts } = useAppConfig();
  const { data: mainAccountBalance, isLoading: loadingMainAccountBalance } =
    useBalance(mainAccount.address);
  const [subAccountsLocal, setSubAccountsLocal] = useState<AddressKeyPair[]>(
    subAccounts || []
  );
  const handleGenerateSubAccounts = () => {
    const amount = prompt(
      'How many sub accounts do you want to generate?',
      '10'
    );
    if (amount && Number.isInteger(Number(amount))) {
      generateAddressesAndKeys(Number(amount));
    } else {
      alert('Please enter a valid number');
    }
  };

  const handleImportSubAccounts = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const content = await getContentFile(file);
      const subAccounts = parseJSON(content);
      if (subAccounts && Array.isArray(subAccounts)) {
        const filters = subAccounts
          .map((account: AddressKeyPair) => ({
            ...account,
            address: account.address.toLowerCase() as `0x${string}`,
          }))
          .filter(
            (account: AddressKeyPair) =>
              !!account.privateKey && !!account.address
          );
        if (filters.length > 0) {
          console.log('Sub accounts:', filters);
          // onNext(filters);
          setSubAccountsLocal(filters);
        } else {
          alert('Invalid sub accounts');
        }
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="text-2xl font-bold text-center text-[rgb(252,114,255)]">
        Nhập danh sách ví phụ  
      </h1>
      <h2 className="mt-[20px] text-lg font-bold text-center">
        Ví chính: {mainAccount.address}
      </h2>
      <div className="mt-[20px] text-base flex items-center">
        Số dư:{' '}
        {!loadingMainAccountBalance ? (
          renderTokenAmount(mainAccountBalance.balance)
        ) : (
          <Loading size={20} />
        )}{' '}
        ETH
      </div>
      <div className="flex items-center text-base">
        Số dư {tokenInfo.symbol}:{' '}
        {!loadingMainAccountBalance ? (
          renderTokenAmount(mainAccountBalance.balanceToken)
        ) : (
          <Loading size={20} />
        )}{' '}
        {tokenInfo.symbol}
      </div>

      <div className='mt-[20px] text-[rgba(252,114,255,0.9)] cursor-pointer' onClick={() => {
        onPrev()
      }}>
        Quay lại bước trước đó
      </div>
      {subAccountsLocal.length > 0 && <div className="mt-[20px] mb-[20px]">
        <p>Danh sách ví phụ:</p>
        {subAccountsLocal.map((account: AddressKeyPair) => (
          <p key={account.address}>- {account.address}</p>
        ))}
      </div>}
      
      <Button
        onClick={() => {
          handleGenerateSubAccounts();
        }}
      >
        1. Tạo ngẫu nhiên ví phụ (Bỏ qua bước 1 nếu đã có)
      </Button>
      <Button htmlFor="sub-accounts">2. Nhập file ví phụ</Button>
      <input
        accept=".json"
        type="file"
        id="sub-accounts"
        className="hidden"
        onChange={e => handleImportSubAccounts(e)}
      />
      <Button
        onClick={() => {
          onNext(subAccountsLocal);
        }}
        disabled={subAccountsLocal.length === 0}
      >
        3. Bước tiếp theo
      </Button>
    </div>
  );
}
