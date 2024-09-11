// import { mainnet, sepolia } from 'viem/chains'

// type ChainConfig = {
//   RPC_URL: string;
//   UNISWAP_V2_ROUTER_ADDRESS: `0x${string}`;
//   WETH_ADDRESS: `0x${string}`;
//   DISPERSE_ADDRESS: `0x${string}`;
// };

// type Config = {
//   [chainId: number]: ChainConfig;
// };

// export const config: Config = {
//   [mainnet.id]: {
//     RPC_URL: "https://rpc.ankr.com/eth",
//     UNISWAP_V2_ROUTER_ADDRESS: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
//     WETH_ADDRESS: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//     DISPERSE_ADDRESS: "0xD152f549545093347A162Dce210e7293f1452150",
//   },
//   [sepolia.id]: {
//     RPC_URL: "https://rpc.ankr.com/eth_sepolia",
//     UNISWAP_V2_ROUTER_ADDRESS: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008",
//     WETH_ADDRESS: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
//     DISPERSE_ADDRESS: "0xD152f549545093347A162Dce210e7293f1452150",
//   },
// };

// export function getChainConfig(chainId: number): ChainConfig {
//   const chainConfig = config[chainId];
//   if (!chainConfig) {
//     throw new Error(`Config not found for chain ID ${chainId}`);
//   }
//   return chainConfig;
// }

type Config = {
  RPC_URL: string;
  UNISWAP_V2_ROUTER_ADDRESS: `0x${string}`;
  WETH_ADDRESS: `0x${string}`;
  DISPERSE_ADDRESS: `0x${string}`;
};

export const config: Config = {
  RPC_URL: "https://sepolia.infura.io/v3/d1fc98bbf52c4e79b193049e6342b0bf",
  UNISWAP_V2_ROUTER_ADDRESS: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008",
  WETH_ADDRESS: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
  DISPERSE_ADDRESS: "0xD152f549545093347A162Dce210e7293f1452150",
};