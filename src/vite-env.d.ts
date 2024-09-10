/// <reference types="vite/client" />

interface ImportMetaEnv {
  VITE_RPC_URL: string
  VITE_UNISWAP_V2_ROUTER_ADDRESS: string
  VITE_WETH_ADDRESS: string
  VITE_DISPERSE_ADDRESS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}