import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvConfigSchema = z.object({
  // PRIVATE_KEYS: z.string().transform(keys => keys.split(',').map(key => key.trim())),
  RPC_URL: z.string().url(),
  UNISWAP_V2_ROUTER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  WETH_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  USDC_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  RECIPIENT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

const envConfig = EnvConfigSchema.parse({
  // PRIVATE_KEYS: process.env.PRIVATE_KEYS,
  RPC_URL: process.env.RPC_URL,
  UNISWAP_V2_ROUTER_ADDRESS: process.env.UNISWAP_V2_ROUTER_ADDRESS,
  WETH_ADDRESS: process.env.WETH_ADDRESS,
  USDC_ADDRESS: process.env.USDC_ADDRESS,
  RECIPIENT_ADDRESS: process.env.RECIPIENT_ADDRESS,
});

export const config = {
  // PRIVATE_KEYS: envConfig.PRIVATE_KEYS.map(key => key as `0x${string}`),
  RPC_URL: envConfig.RPC_URL,
  UNISWAP_V2_ROUTER_ADDRESS: envConfig.UNISWAP_V2_ROUTER_ADDRESS as `0x${string}`,
  WETH_ADDRESS: envConfig.WETH_ADDRESS as `0x${string}`,
  USDC_ADDRESS: envConfig.USDC_ADDRESS as `0x${string}`,
  RECIPIENT_ADDRESS: envConfig.RECIPIENT_ADDRESS as `0x${string}`,
};