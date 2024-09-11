import { AppContextType, TokenInfo } from './type';
import { AddressKeyPair } from '../utils/generate';
import { createContext } from 'react';

export const AppContext = createContext<AppContextType>({
  mainAccount: undefined as unknown as AddressKeyPair,
  subAccounts: [],
  buyMonitors: [],
  sellMonitors: [],
  withdrawMonitors: [],
  tokenInfo: undefined as unknown as TokenInfo,
  reloadBalance: async () => {},
  handleBuy: async () => {},
  handleSell: async () => {},
  handleApprove: async () => {},
  handleWithdraw: async () => {},
});
