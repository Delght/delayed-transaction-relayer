import { AppContextType, TokenInfo } from './type';
import { AddressKeyPair } from '../utils/generate';
import { createContext } from 'react';
import { ChainsSupported } from '../config/chains';

export const AppContext = createContext<AppContextType>({
  chainId: ChainsSupported[0].chainId,
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
