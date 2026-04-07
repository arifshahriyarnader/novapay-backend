export type PayrollStatus = "pending" | "processing" | "completed" | "failed";
export type PayrollItemStatus = "pending" | "completed" | "failed";

export interface PayrollRecipient {
  accountId: string;
  amount: number;
}

export interface CreatePayrollJobInput {
  recipients: PayrollRecipient[];
  currency: string;
}

export interface PayrollJob {
  id: string;
  employerAccountId: string;
  totalAmount: string;
  totalRecipients: number;
  processedCount: number;
  failedCount: number;
  status: PayrollStatus;
  createdAt: Date;
  updatedAt: Date;
}
