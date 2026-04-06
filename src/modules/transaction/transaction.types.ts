export type TransactionStatus = "pending" | "completed" | "failed" | "reversed";
export type TransactionType = "transfer" | "payroll" | "international";

export interface Transaction {
  id: string;
  idempotencyKey: string;
  senderAccountId: string;
  receiverAccountId: string;
  amount: string;
  currency: string;
  status: TransactionStatus;
  type: TransactionType;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransferInput {
  idempotencyKey: string;
  senderAccountId: string;
  receiverAccountId: string;
  amount: number;
  currency: string;
}
