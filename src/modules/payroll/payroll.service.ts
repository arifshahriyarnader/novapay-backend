import { databasePool } from "../../database/connection";
import { ApiError } from "../../utils/ApiError";
import { payrollQueue } from "./payroll.queue";
import { CreatePayrollJobInput } from "./payroll.validator";

export const createPayrollJobService = async (
  userId: string,
  input: CreatePayrollJobInput,
) => {
  const employerResult = await databasePool.query(
    `SELECT id, balance, currency FROM accounts
     WHERE user_id = $1 AND currency = $2 AND is_active = TRUE`,
    [userId, input.currency],
  );

  const employerAccount = employerResult.rows[0];

  if (!employerAccount) {
    throw new ApiError(
      404,
      `No active ${input.currency} account found. Please create one first.`,
    );
  }

  const totalAmount = input.recipients.reduce((sum, r) => sum + r.amount, 0);

  if (parseFloat(employerAccount.balance) < totalAmount) {
    throw new ApiError(
      400,
      `Insufficient balance. Required: ${totalAmount} ${input.currency}, Available: ${employerAccount.balance}`,
    );
  }

  const jobResult = await databasePool.query(
    `INSERT INTO payroll_jobs
       (employer_account_id, total_amount, total_recipients, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [employerAccount.id, totalAmount, input.recipients.length],
  );

  const job = jobResult.rows[0];

  for (const recipient of input.recipients) {
    const idempotencyKey = `payroll-${job.id}-${recipient.accountId}`;

    await databasePool.query(
      `INSERT INTO payroll_items
         (job_id, receiver_account_id, amount, status, idempotency_key)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [job.id, recipient.accountId, recipient.amount, idempotencyKey],
    );
  }

  await databasePool.query(
    `UPDATE payroll_jobs SET status = 'processing', updated_at = NOW()
     WHERE id = $1`,
    [job.id],
  );

  for (const recipient of input.recipients) {
    const idempotencyKey = `payroll-${job.id}-${recipient.accountId}`;

    await payrollQueue.add(
      "process-payment",
      {
        jobId: job.id,
        employerAccountId: employerAccount.id,
        recipientAccountId: recipient.accountId,
        amount: recipient.amount,
        currency: input.currency,
        idempotencyKey,
      },
      {
        jobId: `${job.id}-${recipient.accountId}`,
      },
    );
  }

  return {
    jobId: job.id,
    totalAmount,
    totalRecipients: input.recipients.length,
    currency: input.currency,
    status: "processing",
    message: `Payroll job created. ${input.recipients.length} payments queued for processing.`,
    createdAt: job.created_at,
  };
};
