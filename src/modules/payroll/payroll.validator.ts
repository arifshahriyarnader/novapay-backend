import { z } from "zod";

export const createPayrollJobSchema = z.object({
  currency: z.enum(["USD", "EUR", "BDT"], {
    error: "Currency must be USD, EUR or BDT",
  }),
  recipients: z
    .array(
      z.object({
        accountId: z
          .string({ error: "Account ID is required" })
          .uuid("Invalid account ID format"),
        amount: z
          .number({ error: "Amount is required" })
          .positive("Amount must be greater than zero")
          .multipleOf(0.01, "Amount must have at most 2 decimal places"),
      }),
    )
    .min(1, "At least one recipient is required")
    .max(10000, "Maximum 10,000 recipients per job"),
});

export type CreatePayrollJobInput = z.infer<typeof createPayrollJobSchema>;
