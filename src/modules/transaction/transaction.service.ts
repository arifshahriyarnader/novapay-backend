import { ApiError } from "../../utils/ApiError";
import { TransferInput } from "./transaction.validator";
import {
  hashPayload,
  checkIdempotencyKey,
  createIdempotencyKey,
  completeIdempotencyKey,
  failIdempotencyKey,
} from "./Idempotency.service";
import { databasePool } from "../../database/connection";

export const transferService = async (userId: string, input: TransferInput) => {
  const payloadHash = hashPayload({
    senderAccountId: input.senderAccountId,
    receiverAccountId: input.receiverAccountId,
    amount: input.amount,
    currency: input.currency,
  });

  const cached = await checkIdempotencyKey(input.idempotencyKey, payloadHash);
  if (cached) return cached;

  const raceResult = await createIdempotencyKey(
    input.idempotencyKey,
    payloadHash,
  );
  if (raceResult) return raceResult;

  const senderResult = await databasePool.query(
    `SELECT id, user_id, currency, balance
     FROM accounts
     WHERE id = $1 AND is_active = TRUE`,
    [input.senderAccountId],
  );

  const sender = senderResult.rows[0];

  if (!sender) throw new ApiError(404, "Sender account not found");
  if (sender.user_id !== userId)
    throw new ApiError(403, "You do not own this account");
  if (sender.currency !== input.currency)
    throw new ApiError(400, "Currency mismatch with sender account");

  const receiverResult = await databasePool.query(
    `SELECT id, currency FROM accounts
     WHERE id = $1 AND is_active = TRUE`,
    [input.receiverAccountId],
  );

  const receiver = receiverResult.rows[0];
  if (!receiver) throw new ApiError(404, "Receiver account not found");

  const client = await databasePool.connect();

  try {
    await client.query("BEGIN");

    const lockedSender = await client.query(
      `SELECT balance FROM accounts
       WHERE id = $1 FOR UPDATE`,
      [input.senderAccountId],
    );

    const currentBalance = parseFloat(lockedSender.rows[0].balance);

    if (currentBalance < input.amount) {
      await client.query("ROLLBACK");
      await failIdempotencyKey(input.idempotencyKey);
      throw new ApiError(400, "Insufficient balance");
    }

    await client.query(
      `UPDATE accounts
       SET balance = balance - $1, updated_at = NOW()
       WHERE id = $2`,
      [input.amount, input.senderAccountId],
    );

    await client.query(
      `UPDATE accounts
       SET balance = balance + $1, updated_at = NOW()
       WHERE id = $2`,
      [input.amount, input.receiverAccountId],
    );

    const txResult = await client.query(
      `INSERT INTO transactions
         (idempotency_key, sender_account_id, receiver_account_id,
          amount, currency, status, type)
       VALUES ($1, $2, $3, $4, $5, 'completed', 'transfer')
       RETURNING *`,
      [
        input.idempotencyKey,
        input.senderAccountId,
        input.receiverAccountId,
        input.amount,
        input.currency,
      ],
    );

    const transaction = txResult.rows[0];

    await client.query(
      `INSERT INTO ledger_entries
         (transaction_id, account_id, type, amount, currency)
       VALUES
         ($1, $2, 'debit',  $3, $4),
         ($1, $5, 'credit', $3, $4)`,
      [
        transaction.id,
        input.senderAccountId,
        input.amount,
        input.currency,
        input.receiverAccountId,
      ],
    );

    const invariant = await client.query(
      `SELECT SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) AS balance
       FROM ledger_entries
       WHERE transaction_id = $1`,
      [transaction.id],
    );

    if (parseFloat(invariant.rows[0].balance) !== 0) {
      await client.query("ROLLBACK");
      throw new ApiError(500, "Ledger invariant violation detected");
    }

    await client.query("COMMIT");

    const response = {
      id: transaction.id,
      idempotencyKey: transaction.idempotency_key,
      senderAccountId: transaction.sender_account_id,
      receiverAccountId: transaction.receiver_account_id,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      type: transaction.type,
      createdAt: transaction.created_at,
    };

    await completeIdempotencyKey(input.idempotencyKey, response);

    return response;
  } catch (err) {
    await client.query("ROLLBACK");
    await failIdempotencyKey(input.idempotencyKey);
    throw err;
  } finally {
    client.release();
  }
};

export const getTransactionService = async (
  transactionId: string,
  userId: string,
) => {
  const result = await databasePool.query(
    `SELECT t.*, 
            sender.user_id as sender_user_id
     FROM transactions t
     JOIN accounts sender ON sender.id = t.sender_account_id
     WHERE t.id = $1`,
    [transactionId],
  );

  const transaction = result.rows[0];

  if (!transaction) throw new ApiError(404, "Transaction not found");

  if (transaction.sender_user_id !== userId) {
    throw new ApiError(403, "You do not have access to this transaction");
  }

  const ledger = await databasePool.query(
    `SELECT id, account_id, type, amount, currency, created_at
     FROM ledger_entries
     WHERE transaction_id = $1
     ORDER BY type ASC`,
    [transactionId],
  );

  return {
    id: transaction.id,
    idempotencyKey: transaction.idempotency_key,
    senderAccountId: transaction.sender_account_id,
    receiverAccountId: transaction.receiver_account_id,
    amount: transaction.amount,
    currency: transaction.currency,
    status: transaction.status,
    type: transaction.type,
    failureReason: transaction.failure_reason,
    createdAt: transaction.created_at,
    updatedAt: transaction.updated_at,
    ledgerEntries: ledger.rows,
  };
};
