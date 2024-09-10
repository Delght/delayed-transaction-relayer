import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export interface AddressKeyPair {
  address: `0x${string}`;
  privateKey: `0x${string}`;
}

export function generateAddressesAndKeys(n: number): AddressKeyPair[] {
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

  // Save to file
  const a = document.createElement('a');
  const file = new Blob([jsonContent], {type: 'application/json'});
  a.href= URL.createObjectURL(file);
  a.download = 'address_key_pairs.json';
  a.click();

  console.log(`Generated ${n} address-key pairs and saved to address_key_pairs.json`);
  return pairs;
}

