import { useCallback, useEffect, useMemo, useState } from 'react';
import Config from './config';
import ImportSubAccounts from './import-sub-accounts';
import { AddressKeyPair } from '../utils/generate';
import TransferBalance from './transfer-balance';
import { BuyParam, SubAccount, TokenInfo } from './type';
import { AppContext } from './context';
import ChooseMethod from './choose-method';
import BuyConfig from './buy-config';
import SellConfig from './sell-config';
import { getPublicClient, getWalletClient } from '../client';
import { erc20Abi, formatEther, formatUnits, getContract } from 'viem';
import Loading from './components/Loading';
import { TransactionManager } from '../modules/transaction/transaction';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';
import { UniswapV2 } from '../modules/trading/uniswapV2';
import BuyMonitor from './buy-monitor';

enum Step {
  Config = 'config',
  ImportSubAccount = 'import-sub-account',
  Disperse = 'disperse',
  ChooseMethod = 'choose-method',
  Buy = 'buy',
  Sell = 'sell',
  BuyMonitor = 'buy-monitor',
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>(Step.Config);
  const [mainAccount, setMainAccount] = useState<AddressKeyPair>({
    address: '0xA2ff93e1488849FD443c457D4C569B68F7C80f1d',
    privateKey:
      '0xc0a05efd3d57122a429b1211647964d502a7b332b42659a922d8fff2809215fd',
  });

  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    address: '0xf7De756eA5976Da3700A5b400E5b59d25BbC934c',
    symbol: 'TEST',
    decimals: 18,
  });

  const [subAccountsKey, setSubAccountsKey] = useState<AddressKeyPair[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [buyMonitors, setBuyMonitors] = useState<BuyParam[]>([]);

  console.log(buyMonitors);

  const getBalances = useCallback(async () => {
    if (!tokenInfo || !subAccountsKey.length) {
      return [];
    }
    setLoading(true);
    const publicClient = getPublicClient();
    const erc20Contract = getContract({
      abi: erc20Abi,
      address: tokenInfo.address,
      client: publicClient,
    });
    const accounts = await Promise.all(
      subAccountsKey.map(async account => {
        const [balance, balanceToken] = await Promise.all([
          publicClient.getBalance({
            address: account.address,
          }),
          erc20Contract.read.balanceOf([account.address]),
        ]);
        return {
          ...account,
          balanceWei: balance,
          balance: formatEther(balance),
          balanceToken: formatUnits(balanceToken, tokenInfo.decimals),
          balanceTokenWei: balanceToken,
        };
      })
    );
    setLoading(false);
    setSubAccounts(accounts);
  }, [subAccountsKey, tokenInfo]);

  useEffect(() => {
    (async () => {
      await getBalances();
    })();
  }, [getBalances]);

  const tradingModule = useMemo(() => {
    if (subAccountsKey.length === 0 || !tokenInfo) {
      return null;
    }

    const publicClient = getPublicClient();
    const accounts = subAccountsKey.map(pair => {
      const account = privateKeyToAccount(pair.privateKey, {
        nonceManager,
      });
      const walletClient = getWalletClient(pair.privateKey);
      return { account, walletClient };
    });

    const transactionManager = new TransactionManager({
      accounts,
      client: publicClient,
      queueInterval: 12000, // 12 seconds
      maxRetries: 3,
      batchSize: 5, // 5 transactions per batch
      monitorPendingTxsInterval: 12000, // 12 seconds
    });
    transactionManager.initialize();

    const trading = new UniswapV2(transactionManager, tokenInfo.address);

    return trading;
  }, [subAccountsKey, tokenInfo]);

  console.log({ tradingModule });

  const handleBuy = useCallback(
    async (buyParams: BuyParam[]) => {
      if (!tradingModule) {
        throw new Error('Trading module is not initialized');
      }

      const accountsBuy = buyParams.map(buyParam => {
        const privateKey = subAccountsKey.find(
          pair => pair.address === buyParam.address
        )?.privateKey;
        if (!privateKey) {
          throw new Error('Private key not found');
        }
        return {
          id: buyParam.id,
          account: privateKeyToAccount(privateKey, { nonceManager }),
          ethToSwap: buyParam.ethToSwap,
        };
      });

      tradingModule.executeBuys(accountsBuy);
    },
    [tradingModule, subAccountsKey]
  );

  return (
    <AppContext.Provider
      value={{
        mainAccount,
        subAccounts,
        tokenInfo,
        buyMonitors,
        reloadBalance: getBalances,
        handleBuy,
      }}
    >
      <div className="min-h-screen flex flex-col justify-center items-center p-[20px]">
        <>
          {step === Step.Config && (
            <Config
              onNext={data => {
                setMainAccount(data.account);
                setTokenInfo(data.tokenInfo);
                setStep(Step.ImportSubAccount);
              }}
            />
          )}
          {step === Step.ImportSubAccount && (
            <ImportSubAccounts
              onNext={accounts => {
                setSubAccountsKey(accounts);
                setStep(Step.Disperse);
              }}
              onPrev={() => {
                setStep(Step.Config);
              }}
            />
          )}
          {step === Step.Disperse && (
            <TransferBalance
              onNext={() => {
                setStep(Step.ChooseMethod);
              }}
              onPrev={() => {
                setStep(Step.ImportSubAccount);
              }}
            />
          )}
          {step === Step.ChooseMethod && (
            <ChooseMethod
              onPrev={() => {
                setStep(Step.Disperse);
              }}
              onBuy={() => {
                setStep(Step.Buy);
              }}
              onSell={() => {
                setStep(Step.Sell);
              }}
            />
          )}
          {step === Step.Buy && (
            <BuyConfig
              onPrev={() => {
                setStep(Step.ChooseMethod);
              }}
              onNext={buyParams => {
                setBuyMonitors(buyParams);
                setStep(Step.BuyMonitor);
              }}
            />
          )}
          {step === Step.BuyMonitor && <BuyMonitor onPrev={() => {
            setStep(Step.Config);
          }} />}
          {step === Step.Sell && (
            <SellConfig
              onPrev={() => {
                setStep(Step.ChooseMethod);
              }}
            />
          )}
        </>
      </div>
      {loading && (
        <div className="fixed bg-[white] top-0 left-0 right-0 bottom-0 w-screen h-screen flex justify-center items-center z-50">
          <Loading size={50} />
        </div>
      )}
    </AppContext.Provider>
  );
}
