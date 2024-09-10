export const isPrivateKey = (privateKey: string) => {
  const reg = /^(0x)?[a-fA-F0-9]{64}$/;
  return reg.test(privateKey);
};

export const numberWithCommas = (num: any, rounding?: number): string => {
  let newNum: string = `${num}`;
  if (Number.isInteger(rounding)) {
    newNum = Number(num).toFixed(rounding);
  }
  const parts = newNum.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export const scientificToDecimal = (num: any) => {
  const sign = Math.sign(num);
  if (/\d+\.?\d*e[+-]*\d+/i.test(num)) {
    const zero = '0';
    const parts = String(num).toLowerCase().split('e');
    const e: any = parts.pop();
    let l = Math.abs(e);
    const direction = e / l;
    const coeffArray: any = parts[0].split('.');

    if (direction === -1) {
      coeffArray[0] = Math.abs(coeffArray[0]);
      num = zero + '.' + new Array(l).join(zero) + coeffArray.join('');
    } else {
      const dec = coeffArray[1];
      if (dec) l = l - dec?.length;
      num = coeffArray.join('') + new Array(l + 1).join(zero);
    }
  }

  if (sign < 0) {
    num = -num;
  }
  return num;
};

export const roundingNumber = (number: any, rounding: any = 7) => {
  const powNumber = Math.pow(10, parseInt(`${rounding}`));
  return Math.floor(number * powNumber) / powNumber;
};

export const numberWithAbbreviator = (number: any, decPlaces = 4) => {
  decPlaces = Math.pow(10, decPlaces);

  const abbrev = ['K', 'M', 'B', 'T'];
  for (let i = abbrev?.length - 1; i >= 0; i--) {
    const size = Math.pow(10, (i + 1) * 3);
    if (size <= number) {
      number = Math.round((number * decPlaces) / size) / decPlaces;
      number = numberWithCommas(number) + abbrev[i];
      break;
    }
  }

  return number;
};

export const renderTokenAmount = (
  amount: any,
  decimals = 4,
  withAbbreviator = false
) => {
  if (withAbbreviator) {
    return numberWithAbbreviator(
      scientificToDecimal(roundingNumber(amount, decimals))
    );
  }
  return numberWithCommas(
    scientificToDecimal(roundingNumber(amount, decimals))
  );
};

export const getContentFile = async (file: any) => {
  return new Promise<string>(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        resolve(content);
      }
    };
    reader.readAsText(file);
  });
};

export const parseJSON = (content: string) => {
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export function ellipsisAddress(
  address: string = '',
  prefixLength = 4,
  suffixLength = 4
) {
  return `${address.substr(0, prefixLength)}...${address.substr(
    address?.length - suffixLength,
    suffixLength
  )}`;
}

export const randomNumber = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};

export const generateShortId = (length: number = 10) => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

export const viewTransaction = (hash: string, chainId?: number) => {
  if (chainId === 1) {
    window.open(`https://etherscan.io/tx/${hash}`, '_blank');
  } else {
    window.open(`https://sepolia.etherscan.io/tx/${hash}`, '_blank');
  }
};
