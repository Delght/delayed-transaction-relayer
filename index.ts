import dotenv from 'dotenv';
import { generateAddressesAndKeys } from './generate';
import { config } from './config';

dotenv.config();

const pairs = generateAddressesAndKeys(10);

console.log(pairs);
console.log(config);