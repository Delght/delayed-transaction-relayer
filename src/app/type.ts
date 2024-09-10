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
  reloadBalance: () => Promise<any>;
  handleBuy: (accounts: BuyParams[]) => Promise<void>;
};

export type BuyParams = {
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
