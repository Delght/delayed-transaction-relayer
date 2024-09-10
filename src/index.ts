import dotenv from "dotenv";
import { http, createWalletClient, createPublicClient } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { privateKeyToAccount, nonceManager } from "viem/accounts";
import { TransactionManager } from "@/modules/transaction/transaction";
import { UniswapV2 } from "@/modules/trading/uniswapV2";
import { generateAddressesAndKeys } from "@/utils/generate";
import { config } from "@/config/config";

const pairs = generateAddressesAndKeys(10);

dotenv.config();

const customHttpTransport = http(config.RPC_URL);

const accounts = pairs.map((pair) => {
  const account = privateKeyToAccount(pair.privateKey as `0x${string}`, {
    nonceManager,
  });
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: customHttpTransport,
  });
  return { account, walletClient };
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

const tradingModule = new UniswapV2(transactionManager);
// // buy
// tradingModule.executeBuys(accounts);
// approve
// tradingModule.lazyApprove(accounts);
// delay 10 seconds
await new Promise((resolve) => setTimeout(resolve, 10000));
// sell
tradingModule.executeSells(accounts, BigInt(100));
