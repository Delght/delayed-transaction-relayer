import { z } from 'zod';

const EnvConfigSchema = z.object({
  RPC_URL: z.string().url(),
  UNISWAP_V2_ROUTER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  WETH_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  DISPERSE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
});

const envConfig = EnvConfigSchema.parse({
  RPC_URL: import.meta.env.VITE_RPC_URL,
  UNISWAP_V2_ROUTER_ADDRESS: import.meta.env.VITE_UNISWAP_V2_ROUTER_ADDRESS,
  WETH_ADDRESS: import.meta.env.VITE_WETH_ADDRESS,
  DISPERSE_ADDRESS: import.meta.env.VITE_DISPERSE_ADDRESS,
});

export const config = {
  RPC_URL: envConfig.RPC_URL,
  UNISWAP_V2_ROUTER_ADDRESS: envConfig.UNISWAP_V2_ROUTER_ADDRESS as `0x${string}`,
  WETH_ADDRESS: envConfig.WETH_ADDRESS as `0x${string}`,
  DISPERSE_ADDRESS: envConfig.DISPERSE_ADDRESS as `0x${string}`,
};