import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { writeFileSync } from 'fs';

interface AddressKeyPair {
  address: string;
  privateKey: string;
}

export function generateAddressesAndKeys(n: number): void {
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
}

generateAddressesAndKeys(10);