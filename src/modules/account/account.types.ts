export type Currency = 'USD' | 'EUR' | 'BDT';

export interface Account {
  id: string;
  userId: string;
  currency: Currency;
  balance: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountInput {
  currency: Currency;
}

export interface DepositInput {
  accountId: string;
  amount: number;
}