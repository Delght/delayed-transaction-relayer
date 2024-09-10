import {
  getContentFile,
  parseJSON,
  renderTokenAmount,
} from '../utils/function';
import Button from './components/Button';
import { AddressKeyPair, generateAddressesAndKeys } from '../utils/generate';
import useAppConfig from './hooks/useAppConfig';
import useBalance from './hooks/useBalance';
import Loading from './components/Loading';
import { useState } from 'react';

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
    <div className="w-full flex flex-col justify-center items-center">
      <h1 className="text-4xl font-bold text-center text-[rgb(252,114,255)]">
          Import sub accounts
        </h1>
      <h2 className="mt-[20px] text-xl font-bold text-center">
        Main account: {mainAccount.address}
      </h2>
      <div className="mt-[10px] text-lg flex items-center">
        Balance:{' '}
        {!loadingMainAccountBalance ? (
          renderTokenAmount(mainAccountBalance.balance)
        ) : (
          <Loading size={20} />
        )}{' '}
        ETH
      </div>
      <div className="text-lg flex items-center">
        {tokenInfo.symbol} Balance:{' '}
        {!loadingMainAccountBalance ? (
          renderTokenAmount(mainAccountBalance.balanceToken)
        ) : (
          <Loading size={20} />
        )}{' '}
        {tokenInfo.symbol}
      </div>

      <div className='mt-[10px] text-[rgba(252,114,255,0.9)] cursor-pointer' onClick={() => {
        onPrev()
      }}>
        Back to prev step
      </div>
      {subAccountsLocal.length > 0 && <div className="mt-[20px] mb-[20px]">
        <p>Sub Accounts</p>
        {subAccountsLocal.map((account: AddressKeyPair) => (
          <p key={account.address}>- {account.address}</p>
        ))}
      </div>}
      
      <Button
        onClick={() => {
          handleGenerateSubAccounts();
        }}
      >
        1. Generate Sub Accounts (Skip if exists)
      </Button>
      <Button htmlFor="sub-accounts">2. Import Sub Accounts</Button>
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
        3. Next step
      </Button>
    </div>
  );
}