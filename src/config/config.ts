// import { z } from 'zod';

// const EnvConfigSchema = z.object({
//   RPC_URL: z.string().url(),
//   UNISWAP_V2_ROUTER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
//   WETH_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
//   DISPERSE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
// });

// const envConfig = EnvConfigSchema.parse({
//   RPC_URL: import.meta.env.VITE_RPC_URL,
//   UNISWAP_V2_ROUTER_ADDRESS: import.meta.env.VITE_UNISWAP_V2_ROUTER_ADDRESS,
//   WETH_ADDRESS: import.meta.env.VITE_WETH_ADDRESS,
//   DISPERSE_ADDRESS: import.meta.env.VITE_DISPERSE_ADDRESS,
// });

type Config = {
  RPC_URL: string;
  UNISWAP_V2_ROUTER_ADDRESS: `0x${string}`;
  WETH_ADDRESS: `0x${string}`;
  DISPERSE_ADDRESS: `0x${string}`;
};

export const config: Config = {
  RPC_URL: "https://ethereum-sepolia.blockpi.network/v1/rpc/public",
  UNISWAP_V2_ROUTER_ADDRESS: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008",
  WETH_ADDRESS: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
  DISPERSE_ADDRESS: "0xD152f549545093347A162Dce210e7293f1452150",
};