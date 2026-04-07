import { z } from "zod";

const CURRENCIES = ["USD", "EUR", "BDT"] as const;

export const lockRateSchema = z
  .object({
    fromCurrency: z.enum(CURRENCIES, {
      error: "fromCurrency must be USD, EUR or BDT",
    }),
    toCurrency: z.enum(CURRENCIES, {
      error: "toCurrency must be USD, EUR or BDT",
    }),
    amount: z
      .number({ error: "Amount is required" })
      .positive("Amount must be greater than zero")
      .multipleOf(0.01, "Amount must have at most 2 decimal places"),
  })
  .refine((data) => data.fromCurrency !== data.toCurrency, {
    message: "fromCurrency and toCurrency must be different",
  });

export const internationalTransferSchema = z.object({
  idempotencyKey: z
    .string({ error: "Idempotency key is required" })
    .min(1, "Idempotency key cannot be empty"),
  quoteId: z
    .string({ error: "Quote ID is required" })
    .uuid("Invalid quote ID format"),
  senderAccountId: z
    .string({ error: "Sender account ID is required" })
    .uuid("Invalid sender account ID"),
  receiverAccountId: z
    .string({ error: "Receiver account ID is required" })
    .uuid("Invalid receiver account ID"),
});

export type LockRateInput = z.infer<typeof lockRateSchema>;
export type InternationalTransferInput = z.infer<
  typeof internationalTransferSchema
>;
