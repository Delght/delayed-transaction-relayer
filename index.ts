import dotenv from "dotenv";
import { http, createWalletClient, createPublicClient, http as httpTransport } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { privateKeyToAccount, nonceManager } from "viem/accounts";
import type { PrivateKeyAccount } from "viem";
import { TransactionManager } from "./transaction";
import { generateAddressesAndKeys } from "./generate";
import { config } from "./config";
import { logger } from "./logger";
import type { TransactionData, TransactionWithDeadline } from './types';

const pairs = generateAddressesAndKeys(10);

dotenv.config();
logger.info(pairs);
logger.info(config);

const erc20Abi = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
];

const uniswapV2RouterABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
];

const customHttpTransport = http("https://endpoints.omniatech.io/v1/eth/sepolia/public");

const accounts = pairs.map((pair) => {
  const account = privateKeyToAccount(pair.privateKey as `0x${string}`, {
    nonceManager,
  });

  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: customHttpTransport,
  });

  return {
    account,
    walletClient,
  };
});

const publicClient = createPublicClient({
  chain: sepolia,
  transport: customHttpTransport,
});

const transactionManager = new TransactionManager({
  accounts: accounts,
  client: publicClient,
  queueInterval: 12000, // 12 seconds
  maxRetries: 3, 
  batchSize: 5, // 5 transactions per batch
  monitorPendingTxsInterval: 12000, // 12 seconds
});

transactionManager.initialize();

const createUniswapTxData = (functionName: string, args: any[], value?: bigint): TransactionData => ({
  address: config.UNISWAP_V2_ROUTER_ADDRESS,
  abi: uniswapV2RouterABI,
  functionName,
  args,
  value,
});

const now = BigInt(Math.floor(Date.now() / 1000));
const deadline = now + BigInt(900); // 15 minutes from now in seconds
const ethToSwap = BigInt(Math.floor(0.0001 * 10 ** 18));
const minTokensOut = BigInt(1 * 10 ** 18); // Minimum tokens to receive

const txData1: TransactionWithDeadline = {
  txData: createUniswapTxData(
    "swapExactETHForTokens",
    [
      minTokensOut,
      [config.WETH_ADDRESS, config.TOKEN_ADDRESS],
      config.RECIPIENT_ADDRESS,
      deadline,
    ],
    ethToSwap // Value to send with the transaction
  ),
  deadline,
  notBefore: now , // Optional: set to current time if you want to process immediately
};

const txData2: TransactionWithDeadline = {
  txData: createUniswapTxData("swapExactTokensForETH", [
    BigInt(0.01 * 10 ** 18),
    BigInt(0.0099 * 10 ** 18),
    [config.TOKEN_ADDRESS, config.WETH_ADDRESS],
    config.RECIPIENT_ADDRESS,
    deadline,
  ]),
  deadline,
  notBefore: now, // Optional: set to current time if you want to process immediately
};

const addTransactionWithDeadline = (
  txWithDeadline: TransactionWithDeadline,
  account: PrivateKeyAccount
) => {
  transactionManager.addTransaction(txWithDeadline, account);
};

addTransactionWithDeadline(txData1, accounts[0].account);
// addTransactionWithDeadline(txData2, accounts[1].account);

// // Generate random transactions for different accounts
// const generateRandomTransactions = () => {
//   const txDataList = [];

//   for (let i = 0; i < 10; i++) {
//     const randomAccountIndex = Math.floor(Math.random() * accounts.length);
//     const account = accounts[randomAccountIndex].account;

//     const txData = createUniswapTxData("swapExactETHForTokens", [
//       BigInt(0.01 * 10 ** 18), // Amount in ETH
//       [config.WETH_ADDRESS, config.USDC_ADDRESS], // Path: WETH -> USDC
//       config.RECIPIENT_ADDRESS,
//       createDeadline(),
//     ]);

//     txDataList.push({ txData, account });
//   }

//   return txDataList;
// };

// const addTransactionsToManager = (transactions: any[]) => {
//   transactions.forEach(({ txData, account }) => {
//     transactionManager.addTransaction(
//       {
//         txData,
//         deadline: createDeadline(),
//       },
//       account
//     );
//   });
// };

// const randomTransactions = generateRandomTransactions();

// addTransactionsToManager(randomTransactions);
