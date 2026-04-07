export type FxQuoteStatus = "active" | "used" | "expired";

export interface FxQuote {
  id: string;
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  lockedAmount: string;
  status: FxQuoteStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface LockRateInput {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
}

export interface InternationalTransferInput {
  idempotencyKey: string;
  quoteId: string;
  senderAccountId: string;
  receiverAccountId: string;
}
