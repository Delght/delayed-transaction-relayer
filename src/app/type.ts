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
  sellMonitors: SellOrApproveMonitor[];
  withdrawMonitors: WithdrawParam[];
  reloadBalance: () => Promise<any>;
  handleBuy: (buyParams: BuyParam[]) => Promise<void>;
  handleSell: (sellParams: SellParam[]) => Promise<void>;
  handleApprove: (approveParams: ApproveParam[]) => Promise<void>;
  handleWithdraw: (withdrawParams: WithdrawParam[]) => Promise<void>;
};

export type BuyParam = {
  id: string;
  address: `0x${string}`;
  ethToSwap: bigint;
};

export type SellParam = {
  id: string;
  address: `0x${string}`;
  amountToSell: bigint;
}

export type ApproveParam = {
  id: string;
  address: `0x${string}`;
}

export type SellOrApproveMonitor = {
  id: string;
  address: `0x${string}`;
  amountToSell: bigint;
  type: 'sell' | 'approve';
}

export type WithdrawParam = {
  id: string;
  address: `0x${string}`;
}

export type SubAccount = AddressKeyPair & {
  balance: string;
  balanceWei: bigint;
  balanceToken: string;
  balanceTokenWei: bigint;
};

export type SubAccountWithAmount = SubAccount & {
  amount: string;
};
