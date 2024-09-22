import { useCallback, useEffect, useMemo, useState } from 'react';
import { erc20Abi, encodeFunctionData, formatEther, formatUnits, getContract } from 'viem';
import { privateKeyToAccount, nonceManager } from 'viem/accounts';

import { getPublicClient, getWalletClient } from '@/client';
import { multicall3Abi } from '@/config/abis';
import { ChainId, ChainsSupported, ChainData } from '@/config/chains';
import { DEFAULT_BLOCK_TIME, DEFAULT_MAX_RETRIES, DEFAULT_BATCH_SIZE } from '@/config/constants';
import { TransactionManager } from '@/modules/transaction/transaction';
import { UniswapV2 } from '@/modules/trading/uniswapV2';
import { AddressKeyPair } from '@/utils/generate';

import { AppContext } from '@/app/context';
import Config from '@/app/config';
import ChooseMethod from '@/app/choose-method';
import BuyConfig from '@/app/buy-config';
import BuyMonitor from '@/app/buy-monitor';
import ImportSubAccounts from '@/app/import-sub-accounts';
import SellConfig from '@/app/sell-config';
import SellMonitor from '@/app/sell-monitor';
import TransferBalance from '@/app/transfer-balance';
import WithdrawConfig from '@/app/withdraw-config';
import WithdrawMonitor from '@/app/withdraw-monitor';
import Loading from '@/app/components/Loading';
import {
  ApproveParam,
  BuyParam,
  SellOrApproveMonitor,
  SellParam,
  SubAccount,
  TokenInfo,
  WithdrawParam,
  Result
} from '@/app/type';

enum Step {
  Config = 'config',
  ImportSubAccount = 'import-sub-account',
  ChooseMethod = 'choose-method',
  Disperse = 'disperse',
  Buy = 'buy',
  Sell = 'sell',
  Withdraw = 'withdraw',
  BuyMonitor = 'buy-monitor',
  SellMonitor = 'sell-monitor',
  WithdrawMonitor = 'withdraw-monitor',
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>(Step.Config);
  const [chainId, setChainId] = useState<ChainId>(ChainsSupported[0].chainId);
  const [mainAccount, setMainAccount] = useState<AddressKeyPair>({
    address: '0x',
    privateKey: '0x',
  });

  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({
    address: '0x',
    symbol: '',
    decimals: 18,
  });

  const [subAccountsKey, setSubAccountsKey] = useState<AddressKeyPair[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [buyMonitors, setBuyMonitors] = useState<BuyParam[]>([]);
  const [sellMonitors, setSellMonitors] = useState<SellOrApproveMonitor[]>([]);
  const [withdrawMonitors, setWithdrawMonitors] = useState<WithdrawParam[]>([]);

  const updateBalancesAndMoveTo = async (nextStep: Step) => {
    setLoading(true);
    await getBalances();
    setLoading(false);
    setStep(nextStep);
  };

  // const getBalances = useCallback(async () => {
  //   if (!tokenInfo || !subAccountsKey.length || !chainId) {
  //     return [];
  //   }
  //   setLoading(true);
  //   const publicClient = getPublicClient(chainId);
  //   const erc20Contract = getContract({
  //     abi: erc20Abi,
  //     address: tokenInfo.address,
  //     client: publicClient,
  //   });
  //   const accounts = await Promise.all(
  //     subAccountsKey.map(async account => {
  //       const [balance, balanceToken] = await Promise.all([
  //         publicClient.getBalance({
  //           address: account.address,
  //         }),
  //         erc20Contract.read.balanceOf([account.address]),
  //       ]);
  //       return {
  //         ...account,
  //         balanceWei: balance,
  //         balance: formatEther(balance),
  //         balanceToken: formatUnits(balanceToken, tokenInfo.decimals),
  //         balanceTokenWei: balanceToken,
  //       };
  //     })
  //   );
  //   setLoading(false);
  //   setSubAccounts(accounts);
  // }, [subAccountsKey, tokenInfo, chainId]);

  const getBalances = useCallback(async () => {
    if (!tokenInfo || !subAccountsKey.length || !chainId) {
      return [];
    }
    setLoading(true);
    
    const publicClient = getPublicClient(chainId);
    
    const multicallAddress = ChainData[chainId].multicallAddress;
    const multicallContract = getContract({
      address: multicallAddress,
      abi: multicall3Abi,
      client: publicClient,
    });
  
    const calls = subAccountsKey.flatMap(account => [
      {
        target: multicallAddress,
        allowFailure: true,
        callData: encodeFunctionData({
          abi: [{ 
            name: 'getEthBalance', 
            type: 'function', 
            stateMutability: 'view', 
            inputs: [{ name: 'addr', type: 'address' }], 
            outputs: [{ type: 'uint256' }] 
          }],
          functionName: 'getEthBalance',
          args: [account.address],
        }),
      },
      {
        target: tokenInfo.address,
        allowFailure: true,
        callData: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [account.address],
        }),
      },
    ]);
  
    const results = (await multicallContract.read.aggregate3([calls])) as Result[];
  
    const accounts = subAccountsKey.map((account, index) => {
      const balanceResult = results[index * 2];
      const tokenBalanceResult = results[index * 2 + 1];
  
      const balance = balanceResult.success ? BigInt(balanceResult.returnData) : 0n;
      const balanceToken = tokenBalanceResult.success ? BigInt(tokenBalanceResult.returnData) : 0n;
  
      return {
        ...account,
        balanceWei: balance,
        balance: formatEther(balance),
        balanceToken: formatUnits(balanceToken, tokenInfo.decimals),
        balanceTokenWei: balanceToken,
      };
    });
  
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
      queueInterval: (ChainData[chainId]?.blockTime ?? DEFAULT_BLOCK_TIME) * 1000,
      maxRetries: DEFAULT_MAX_RETRIES,
      batchSize: DEFAULT_BATCH_SIZE,
      monitorPendingTxsInterval: (ChainData[chainId]?.blockTime ?? DEFAULT_BLOCK_TIME) * 1000, 
      chainId,
    });
    
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
                setStep(Step.ChooseMethod);
              }}
              onPrev={() => {
                setStep(Step.Config);
              }}
            />
          )}
          {step === Step.Disperse && (
            <TransferBalance
              onPrev={() => {
                setStep(Step.ChooseMethod);
              }}
            />
          )}
          {step === Step.ChooseMethod && (
            <ChooseMethod
              onPrev={() => {
                setStep(Step.ImportSubAccount);
              }}
              onDisperse={() => {
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
              onPrev={() => setStep(Step.Config)}
              onSell={() => updateBalancesAndMoveTo(Step.Sell)}
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
