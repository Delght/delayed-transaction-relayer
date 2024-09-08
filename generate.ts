import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { writeFileSync, existsSync, readFileSync } from 'fs';

interface AddressKeyPair {
  address: string;
  privateKey: string;
}

export function generateAddressesAndKeys(n: number): AddressKeyPair[] {
  if (existsSync('address_key_pairs.json')) {
    const jsonContent = readFileSync('address_key_pairs.json', 'utf8');
    const pairs: AddressKeyPair[] = JSON.parse(jsonContent);
    return pairs;
  }

  const pairs: AddressKeyPair[] = [];

  for (let i = 0; i < n; i++) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    pairs.push({
      address: account.address,
      privateKey: privateKey,
    });
  }

  const jsonContent = JSON.stringify(pairs, null, 2);
  writeFileSync('address_key_pairs.json', jsonContent);

  console.log(`Generated ${n} address-key pairs and saved to address_key_pairs.json`);

  return pairs;
}

