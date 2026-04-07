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

export const getPayrollJobService = async (jobId: string, userId: string) => {
  const result = await databasePool.query(
    `SELECT pj.*, a.user_id as employer_user_id
     FROM payroll_jobs pj
     JOIN accounts a ON a.id = pj.employer_account_id
     WHERE pj.id = $1`,
    [jobId],
  );

  const job = result.rows[0];

  if (!job) throw new ApiError(404, "Payroll job not found");

  if (job.employer_user_id !== userId) {
    throw new ApiError(403, "You do not have access to this payroll job");
  }

  const progressPercent =
    job.total_recipients > 0
      ? Math.round(
          ((job.processed_count + job.failed_count) / job.total_recipients) *
            100,
        )
      : 0;

  return {
    jobId: job.id,
    status: job.status,
    totalAmount: job.total_amount,
    totalRecipients: job.total_recipients,
    processedCount: job.processed_count,
    failedCount: job.failed_count,
    pendingCount: job.total_recipients - job.processed_count - job.failed_count,
    progressPercent,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };
};

export const getPayrollJobReportService = async (
  jobId: string,
  userId: string,
) => {
  const jobResult = await databasePool.query(
    `SELECT pj.*, a.user_id as employer_user_id
     FROM payroll_jobs pj
     JOIN accounts a ON a.id = pj.employer_account_id
     WHERE pj.id = $1`,
    [jobId],
  );

  const job = jobResult.rows[0];

  if (!job) throw new ApiError(404, "Payroll job not found");

  if (job.employer_user_id !== userId) {
    throw new ApiError(403, "You do not have access to this payroll job");
  }

  const itemsResult = await databasePool.query(
    `SELECT pi.id, pi.receiver_account_id, pi.amount,
            pi.status, pi.failure_reason, pi.idempotency_key,
            pi.created_at, pi.updated_at
     FROM payroll_items pi
     WHERE pi.job_id = $1
     ORDER BY pi.created_at ASC`,
    [jobId],
  );

  const items = itemsResult.rows;
  const completed = items.filter((i) => i.status === "completed");
  const failed = items.filter((i) => i.status === "failed");
  const pending = items.filter((i) => i.status === "pending");

  return {
    jobId: job.id,
    status: job.status,
    summary: {
      totalRecipients: job.total_recipients,
      totalAmount: job.total_amount,
      processedCount: job.processed_count,
      failedCount: job.failed_count,
      pendingCount: pending.length,
      successRate:
        job.total_recipients > 0
          ? `${Math.round((completed.length / job.total_recipients) * 100)}%`
          : "0%",
    },
    completedPayments: completed.map((i) => ({
      id: i.id,
      receiverAccountId: i.receiver_account_id,
      amount: i.amount,
      status: i.status,
      processedAt: i.updated_at,
    })),
    failedPayments: failed.map((i) => ({
      id: i.id,
      receiverAccountId: i.receiver_account_id,
      amount: i.amount,
      status: i.status,
      failureReason: i.failure_reason,
    })),
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };
};
