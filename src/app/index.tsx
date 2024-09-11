import { useCallback, useEffect, useMemo, useState } from 'react';
import Config from './config';
import ImportSubAccounts from './import-sub-accounts';
import { AddressKeyPair } from '../utils/generate';
import TransferBalance from './transfer-balance';
import {
  ApproveParam,
  BuyParam,
  SellOrApproveMonitor,
  SellParam,
  SubAccount,
  TokenInfo,
  WithdrawParam,
} from './type';
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
import SellMonitor from './sell-monitor';
import WithdrawConfig from './withdraw-config';
import WithdrawMonitor from './withdraw-monitor';
import { ChainId, ChainsSupported } from '../config/chains';

enum Step {
  Config = 'config',
  ImportSubAccount = 'import-sub-account',
  Disperse = 'disperse',
  ChooseMethod = 'choose-method',
  Buy = 'buy',
  Sell = 'sell',
  BuyMonitor = 'buy-monitor',
  SellMonitor = 'sell-monitor',
  Withdraw = 'withdraw',
  WithdrawMonitor = 'withdraw-monitor',
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>(Step.Config);
  const [chainId, setChainId] = useState<ChainId>(ChainsSupported[0].chainId);
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
  const [sellMonitors, setSellMonitors] = useState<SellOrApproveMonitor[]>([]);
  const [withdrawMonitors, setWithdrawMonitors] = useState<WithdrawParam[]>([]);

  const getBalances = useCallback(async () => {
    if (!tokenInfo || !subAccountsKey.length || !chainId) {
      return [];
    }
    setLoading(true);
    const publicClient = getPublicClient(chainId);
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
  }, [subAccountsKey, tokenInfo, chainId]);

  useEffect(() => {
    (async () => {
      await getBalances();
    })();
  }, [getBalances]);

  const tradingModule = useMemo(() => {
    if (subAccountsKey.length === 0 || !tokenInfo) {
      return null;
    }

    const publicClient = getPublicClient(chainId);
    const accounts = subAccountsKey.map(pair => {
      const account = privateKeyToAccount(pair.privateKey, {
        nonceManager,
      });
      const walletClient = getWalletClient(pair.privateKey, chainId);
      return { account, walletClient };
    });

    const transactionManager = TransactionManager.getInstance({
      accounts,
      client: publicClient,
      queueInterval: 12000,
      maxRetries: 2,
      batchSize: 10, // 5 transactions per batch
      monitorPendingTxsInterval: 12000, // 12 seconds
      chainId,
    });
    transactionManager.initialize();

    const trading = new UniswapV2(publicClient, transactionManager, tokenInfo.address, chainId);

    return trading;
  }, [subAccountsKey, tokenInfo, chainId]);

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

  const handleSell = useCallback(
    async (sellParams: SellParam[]) => {
      if (!tradingModule) {
        throw new Error('Trading module is not initialized');
      }

      const accountsSell = sellParams.map(sellParam => {
        const privateKey = subAccountsKey.find(
          pair => pair.address === sellParam.address
        )?.privateKey;
        if (!privateKey) {
          throw new Error('Private key not found');
        }
        return {
          id: sellParam.id,
          account: privateKeyToAccount(privateKey, { nonceManager }),
          amountToSell: sellParam.amountToSell,
        };
      });

      tradingModule.executeSells(accountsSell);
    },
    [tradingModule, subAccountsKey]
  );

  const handleApprove = useCallback(
    async (approveParams: ApproveParam[]) => {
      if (!tradingModule) {
        throw new Error('Trading module is not initialized');
      }

      const accountsApprove = approveParams.map(approveParam => {
        const privateKey = subAccountsKey.find(
          pair => pair.address === approveParam.address
        )?.privateKey;
        if (!privateKey) {
          throw new Error('Private key not found');
        }
        return {
          id: approveParam.id,
          account: privateKeyToAccount(privateKey, { nonceManager }),
        };
      });

      tradingModule.lazyApprove(accountsApprove);
    },
    [tradingModule, subAccountsKey]
  );

  const handleWithdraw = useCallback(async (withdrawParams: WithdrawParam[]) => {
    if (!tradingModule) {
      throw new Error('Trading module is not initialized');
    }

    const accountsWithdraw = withdrawParams.map(withdrawParam => {
      const privateKey = subAccountsKey.find(
        pair => pair.address === withdrawParam.address
      )?.privateKey;
      if (!privateKey) {
        throw new Error('Private key not found');
      }
      return {
        id: withdrawParam.id,
        account: privateKeyToAccount(privateKey, { nonceManager }),
      };
    });

    tradingModule.transferAllToMain(accountsWithdraw, mainAccount.address);
  }, [tradingModule, subAccountsKey, mainAccount])

  return (
    <AppContext.Provider
      value={{
        chainId,
        mainAccount,
        subAccounts,
        tokenInfo,
        buyMonitors,
        sellMonitors,
        withdrawMonitors,
        reloadBalance: getBalances,
        handleBuy,
        handleSell,
        handleApprove,
        handleWithdraw,
      }}
    >
      <div className="min-h-screen flex flex-col justify-center items-center p-[20px]">
        <>
          {step === Step.Config && (
            <Config
              onNext={data => {
                setMainAccount(data.account);
                setTokenInfo(data.tokenInfo);
                setChainId(data.chainId);
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
              onWithdraw={() => {
                setStep(Step.Withdraw);
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
          {step === Step.BuyMonitor && (
            <BuyMonitor
              onPrev={() => {
                setStep(Step.Config);
              }}
            />
          )}
          {step === Step.Sell && (
            <SellConfig
              onPrev={() => {
                setStep(Step.ChooseMethod);
              }}
              onNext={sellParams => {
                setSellMonitors(sellParams);
                setStep(Step.SellMonitor);
              }}
            />
          )}
          {step === Step.SellMonitor && (
            <SellMonitor
              onPrev={() => {
                setStep(Step.Config);
              }}
            />
          )}
          {step === Step.Withdraw && (
            <WithdrawConfig
              onPrev={() => {
                setStep(Step.ChooseMethod);
              }}
              onNext={withdrawParams => {
                setWithdrawMonitors(withdrawParams);
                setStep(Step.WithdrawMonitor);
              }}
            />
          )}
          {
            step === Step.WithdrawMonitor && (
              <WithdrawMonitor
                onPrev={() => {
                  setStep(Step.Config);
                }}
              />
            )
          }
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
