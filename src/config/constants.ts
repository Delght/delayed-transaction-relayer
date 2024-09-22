import { parseEther, parseGwei } from 'viem';

export const MAX_PRIORITY_FEE_PER_GAS = parseGwei('0.001');

export const DEFAULT_BLOCK_TIME = 12;

export const DEFAULT_MAX_RETRIES = 2;

export const DEFAULT_BATCH_SIZE = 4;

export const MIN_BALANCE_THRESHOLD = parseEther('0.0001'); 

export const SLIPPAGE_TOLERANCE_BASIS_POINTS = 800;

export const ONE_HUNDRED_PERCENT = 10000; // 10,000 basis points represent 100%

export const GAS_PRICE_MULTIPLIER = 1.1;

export const GAS_LIMIT_MULTIPLIER = 1.1;

export const GAS_TRANSFER_LIMIT = 21000;

export const MAX_UINT256 = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");

