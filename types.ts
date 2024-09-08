export interface TransactionData {
    address: `0x${string}`,
    abi: any,
    functionName: string,
    args: any[],
  }
  
export interface TransactionWithDeadline {
  txData: TransactionData,
  deadline: bigint,
  notBefore?: bigint; // Optional field to specify the earliest time the transaction can be included
}
