import { AppContextType, TokenInfo } from './type';
import { AddressKeyPair } from '../utils/generate';
import { createContext } from 'react';

export const AppContext = createContext<AppContextType>({
  mainAccount: undefined as unknown as AddressKeyPair,
  subAccounts: [],
  buyMonitors: [],
  tokenInfo: undefined as unknown as TokenInfo,
  reloadBalance: async () => {},
  handleBuy: async () => {},
});
