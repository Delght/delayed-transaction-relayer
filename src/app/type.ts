import { AddressKeyPair } from '../utils/generate';

export type TokenInfo = {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
};

export type AppContextType = {
  mainAccount: AddressKeyPair;
  subAccounts: SubAccount[];
  tokenInfo: TokenInfo;
  buyMonitors: BuyParam[];
  reloadBalance: () => Promise<any>;
  handleBuy: (accounts: BuyParam[]) => Promise<void>;
};

export type BuyParam = {
  id: string;
  address: `0x${string}`;
  ethToSwap: bigint;
};

export type SubAccount = AddressKeyPair & {
  balance: string;
  balanceWei: bigint;
  balanceToken: string;
  balanceTokenWei: bigint;
};

export type SubAccountWithAmount = SubAccount & {
  amount: string;
};
