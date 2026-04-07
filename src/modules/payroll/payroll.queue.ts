import { Queue, Worker, Job } from "bullmq";
import { databasePool } from "../../database/connection";

const redisConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
};

export const payrollQueue = new Queue("payroll", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export interface PayrollJobData {
  jobId: string;
  employerAccountId: string;
  recipientAccountId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}

export const startPayrollWorker = () => {
  const worker = new Worker<PayrollJobData>(
    "payroll",
    async (job: Job<PayrollJobData>) => {
      const {
        jobId,
        employerAccountId,
        recipientAccountId,
        amount,
        currency,
        idempotencyKey,
      } = job.data;

      const client = await databasePool.connect();

      try {
        await client.query("BEGIN");

        const existingItem = await client.query(
          `SELECT id, status FROM payroll_items
           WHERE idempotency_key = $1`,
          [idempotencyKey],
        );

        if (
          existingItem.rows.length > 0 &&
          existingItem.rows[0].status === "completed"
        ) {
          console.log(`⏭️  Payroll item already processed: ${idempotencyKey}`);
          await client.query("COMMIT");
          return;
        }

        const lockedEmployer = await client.query(
          `SELECT balance FROM accounts WHERE id = $1 FOR UPDATE`,
          [employerAccountId],
        );

        const balance = parseFloat(lockedEmployer.rows[0].balance);

        if (balance < amount) {
          await client.query(
            `UPDATE payroll_items
             SET status = 'failed',
                 failure_reason = 'Insufficient employer balance',
                 updated_at = NOW()
             WHERE idempotency_key = $1`,
            [idempotencyKey],
          );

          await client.query(
            `UPDATE payroll_jobs
             SET failed_count = failed_count + 1, updated_at = NOW()
             WHERE id = $1`,
            [jobId],
          );

          await client.query("COMMIT");
          return;
        }

        await client.query(
          `UPDATE accounts SET balance = balance - $1, updated_at = NOW()
           WHERE id = $2`,
          [amount, employerAccountId],
        );

        await client.query(
          `UPDATE accounts SET balance = balance + $1, updated_at = NOW()
           WHERE id = $2`,
          [amount, recipientAccountId],
        );

        const txResult = await client.query(
          `INSERT INTO transactions
             (idempotency_key, sender_account_id, receiver_account_id,
              amount, currency, status, type)
           VALUES ($1, $2, $3, $4, $5, 'completed', 'payroll')
           RETURNING id`,
          [
            idempotencyKey,
            employerAccountId,
            recipientAccountId,
            amount,
            currency,
          ],
        );

        const transactionId = txResult.rows[0].id;

        await client.query(
          `INSERT INTO ledger_entries
             (transaction_id, account_id, type, amount, currency)
           VALUES
             ($1, $2, 'debit',  $3, $4),
             ($1, $5, 'credit', $3, $4)`,
          [
            transactionId,
            employerAccountId,
            amount,
            currency,
            recipientAccountId,
          ],
        );

        await client.query(
          `UPDATE payroll_items
           SET status = 'completed', updated_at = NOW()
           WHERE idempotency_key = $1`,
          [idempotencyKey],
        );

        await client.query(
          `UPDATE payroll_jobs
           SET processed_count = processed_count + 1, updated_at = NOW()
           WHERE id = $1`,
          [jobId],
        );

        await client.query("COMMIT");

        console.log(`✅ Payroll item processed: ${idempotencyKey}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  );

  worker.on("completed", (job) => {
    console.log(`Payroll job ${job.id} item completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(` Payroll job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", async (job) => {
    const { jobId } = job.data;

    const result = await databasePool.query(
      `SELECT total_recipients, processed_count, failed_count
       FROM payroll_jobs WHERE id = $1`,
      [jobId],
    );

    const payrollJob = result.rows[0];
    const total = payrollJob.total_recipients;
    const done = payrollJob.processed_count + payrollJob.failed_count;

    if (done >= total) {
      const finalStatus =
        payrollJob.failed_count === 0 ? "completed" : "completed";

      await databasePool.query(
        `UPDATE payroll_jobs SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [finalStatus, jobId],
      );

      console.log(`🎉 Payroll job ${jobId} fully completed`);
    }
  });

  console.log("🚀 Payroll worker started");
  return worker;
};
