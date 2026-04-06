import { z } from "zod";

export const transferSchema = z.object({
  idempotencyKey: z
    .string({ error: "Idempotency key is required" })
    .min(1, "Idempotency key cannot be empty"),
  senderAccountId: z
    .string({ error: "Sender account ID is required" })
    .uuid("Invalid sender account ID"),
  receiverAccountId: z
    .string({ error: "Receiver account ID is required" })
    .uuid("Invalid receiver account ID"),
  amount: z
    .number({ error: "Amount is required" })
    .positive("Amount must be greater than zero")
    .multipleOf(0.01, "Amount must have at most 2 decimal places"),
  currency: z.enum(["USD", "EUR", "BDT"], {
    error: "Currency must be USD, EUR or BDT",
  }),
});

export type TransferInput = z.infer<typeof transferSchema>;
