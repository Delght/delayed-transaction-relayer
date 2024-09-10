import classNames from 'classnames';
import { renderTokenAmount } from '../utils/function';
import useBalance from './hooks/useBalance';
import TransferAccountRow from './components/TransferAccountRow';
import Button from './components/Button';
import useAppConfig from './hooks/useAppConfig';
import Loading from './components/Loading';
import { useCallback, useMemo, useState } from 'react';
import { encodeFunctionData, parseEther } from 'viem';
import { sendTransaction } from '../utils/transaction';
import { config } from '../config/config';
import { DisperseAbi } from '../config/disperse';
import toast from 'react-hot-toast';
import BigNumber from 'bignumber.js';

export default function TransferBalance({
  onNext,
  onPrev,
}: {
  onNext: () => void;
  onPrev: () => void;
}) {
  const { mainAccount, subAccounts, tokenInfo, reloadBalance } = useAppConfig();
  const { data: mainAccountBalance, isLoading: loadingMainAccountBalance } =
    useBalance(mainAccount.address);

  const [subAccountTransfers, setSubAccountTransfers] = useState<{
    [key: string]: {
      native: string;
      // token: string;
    };
  }>({});

  const [loading, setLoading] = useState(false);

  console.log(subAccountTransfers);

  const formatData = useMemo(() => {
    let totalNative = 0;
    // let totalToken = 0;
    let hasError = false;
    const subAccountWithTransfers = subAccounts.map(account => {
      const subAccount = { ...account, transferNative: 0 };
      const transferData = subAccountTransfers[account.address];
      if (transferData?.native) {
        if (Number.isNaN(Number(transferData?.native))) {
          hasError = true;
        } else {
          totalNative += Number(transferData.native);
          subAccount.transferNative = Number(transferData.native);
        }
      }

      // if (transferData?.token) {
      //   if (Number.isNaN(Number(transferData?.token))) {
      //     hasError = true;
      //   } else {
      //     totalToken += Number(transferData.token);
      //     subAccount.transferToken = Number(transferData.token);
      //   }
      // }
      return subAccount;
    });

    return {
      subAccountWithTransfers,
      totalNative,
      // totalToken,
      hasError,
    };
  }, [subAccounts, subAccountTransfers]);

  const handleTransfer = useCallback(async () => {
    try {
      setLoading(true);
      const accountsNeedTransfer = formatData.subAccountWithTransfers.filter(
        acc => BigNumber(acc?.transferNative || '0').gt(0)
      );
      const totalNativeNeedTransfer = accountsNeedTransfer.reduce(
        (acc, cur) => BigNumber(acc || 0).plus(cur?.transferNative || 0),
        BigNumber(0)
      );

      await sendTransaction({
        privateKey: mainAccount.privateKey,
        to: config.DISPERSE_ADDRESS,
        data: encodeFunctionData({
          abi: DisperseAbi,
          functionName: 'disperseEther',
          args: [
            accountsNeedTransfer.map(acc => acc.address),
            accountsNeedTransfer.map(acc =>
              parseEther(`${acc.transferNative}`)
            ),
          ],
        }),
        value: parseEther(totalNativeNeedTransfer.toFixed()),
      });

      setSubAccountTransfers({});
      await reloadBalance();
      setLoading(false);
      toast.success('Transfer success!!');
    } catch (error) {
      console.log('Transfer error', error);
      toast.error('Transfer error!!');
      setLoading(false);
    }
  }, [formatData, mainAccount, reloadBalance]);

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <h1 className="text-4xl font-bold text-center text-[rgb(252,114,255)]">
        Transfer balance to sub accounts
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
      <div
        className="mt-[10px] text-[rgba(252,114,255,0.9)] cursor-pointer"
        onClick={() => {
          onPrev();
        }}
      >
        Back to prev step
      </div>
      <div className="mt-[20px] flex flex-col w-full max-w-[1200px] border-2">
        <div className={classNames('flex items-center')}>
          <div className="w-[25%] p-[10px] font-bold">Sub Account</div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            ETH Balance
          </div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            {tokenInfo.symbol} Balance
          </div>
          <div className="w-[25%] border-l-2 p-[10px] font-bold">
            ETH to transfer
          </div>
          {/* <div className="w-[25%] border-l-2 p-[10px] font-bold">
            {tokenInfo.symbol} to transfer
          </div> */}
        </div>
        {subAccounts.map(account => (
          <TransferAccountRow
            key={account.address}
            account={account}
            disabled={loading}
            value={
              subAccountTransfers?.[account.address] || {
                native: '',
                // token: '',
              }
            }
            onChange={(value: { native: string }) => {
              setSubAccountTransfers(prev => ({
                ...prev,
                [account.address]: value,
              }));
            }}
          />
        ))}
      </div>
      <Button
        disabled={
          formatData.hasError ||
          formatData.totalNative === 0 ||
          BigNumber(mainAccountBalance?.balance || '0').lt(
            formatData.totalNative
          ) ||
          loadingMainAccountBalance
        }
        loading={loading}
        onClick={() => {
          handleTransfer();
        }}
      >
        Transfer Balance ({renderTokenAmount(formatData.totalNative)} ETH)
        {/* {renderTokenAmount(formatData.totalToken)} {tokenInfo.symbol}) */}
      </Button>
      <Button
        onClick={() => {
          onNext();
        }}
        disabled={loading}
      >
        Next step
      </Button>
    </div>
  );
}
