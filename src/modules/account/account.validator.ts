import { z } from 'zod';

export const createAccountSchema = z.object({
  currency: z.enum(['USD', 'EUR', 'BDT'], {
    error: 'Currency must be USD, EUR or BDT',
  }),
});

export const depositSchema = z.object({
  accountId: z
    .string({ error: 'Account ID is required' })
    .uuid('Invalid account ID format'),
  amount: z
    .number({ error: 'Amount is required' })
    .positive('Amount must be greater than zero')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type DepositInput = z.infer<typeof depositSchema>;