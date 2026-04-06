export type LedgerEntryType = 'debit' | 'credit';

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  type: LedgerEntryType;
  amount: string;
  currency: string;
  fxRate?: string;
  createdAt: Date;
}

export interface LedgerInvariantResult {
  transactionId: string;
  balance: number;
  isValid: boolean;
  message: string;
}