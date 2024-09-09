import dotenv from "dotenv";
import { http, createWalletClient, createPublicClient } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount, nonceManager } from "viem/accounts";
import type { PrivateKeyAccount } from "viem";
import { TransactionManager } from "./transaction";
import { generateAddressesAndKeys } from "./generate";
import { config } from "./config";
import { logger } from "./logger";

const pairs = generateAddressesAndKeys(10);

dotenv.config();
logger.info(pairs);
logger.info(config);

const uniswapV2RouterABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
];

const accounts = pairs.map((pair) => {
  const account = privateKeyToAccount(pair.privateKey as `0x${string}`, {
    nonceManager,
  });

  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(),
  });

  return {
    account,
    walletClient,
  };
});

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const transactionManager = new TransactionManager({
  accounts: accounts,
  client: publicClient,
  queueInterval: 1000,
  maxRetries: 3,
  batchSize: 5,
  monitorPendingTxsInterval: 1000,
});

transactionManager.initialize();

const createUniswapTxData = (functionName: string, args: any[]) => ({
  address: config.UNISWAP_V2_ROUTER_ADDRESS,
  abi: uniswapV2RouterABI,
  functionName,
  args,
});

const createDeadline = () => BigInt(Date.now() + 3600000); // 1 hour

const txData1 = createUniswapTxData("swapExactETHForTokens", [
  BigInt(0.01 * 10 ** 18),
  [config.WETH_ADDRESS, config.USDC_ADDRESS],
  config.RECIPIENT_ADDRESS,
  createDeadline(),
]);

const txData2 = createUniswapTxData("swapExactTokensForETH", [
  BigInt(0.01 * 10 ** 18),
  BigInt(0.0099 * 10 ** 18),
  [config.USDC_ADDRESS, config.WETH_ADDRESS],
  config.RECIPIENT_ADDRESS,
  createDeadline(),
]);

const addTransactionWithDeadline = (
  txData: any,
  account: PrivateKeyAccount
) => {
  transactionManager.addTransaction(
    {
      txData,
      deadline: createDeadline(),
    },
    account
  );
};

addTransactionWithDeadline(txData1, accounts[0].account);
addTransactionWithDeadline(txData2, accounts[0].account);

// Generate random transactions for different accounts
const generateRandomTransactions = () => {
  const txDataList = [];

  for (let i = 0; i < 10; i++) {
    const randomAccountIndex = Math.floor(Math.random() * accounts.length);
    const account = accounts[randomAccountIndex].account;

    const txData = createUniswapTxData("swapExactETHForTokens", [
      BigInt(0.01 * 10 ** 18), // Amount in ETH
      [config.WETH_ADDRESS, config.USDC_ADDRESS], // Path: WETH -> USDC
      config.RECIPIENT_ADDRESS,
      createDeadline(),
    ]);

    txDataList.push({ txData, account });
  }

  return txDataList;
};

const addTransactionsToManager = (transactions: any[]) => {
  transactions.forEach(({ txData, account }) => {
    transactionManager.addTransaction(
      {
        txData,
        deadline: createDeadline(),
      },
      account
    );
  });
};

const randomTransactions = generateRandomTransactions();

addTransactionsToManager(randomTransactions);
