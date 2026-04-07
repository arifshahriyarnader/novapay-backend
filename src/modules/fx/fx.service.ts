import { databasePool } from "../../database/connection";
import { ApiError } from "../../utils";
import {
  checkIdempotencyKey,
  completeIdempotencyKey,
  createIdempotencyKey,
  failIdempotencyKey,
  hashPayload,
} from "../transaction/Idempotency.service";
import { fetchLiveRate } from "./fx.provider";
import { InternationalTransferInput, LockRateInput } from "./fx.validator";

export const lockRateService = async (userId: string, input: LockRateInput) => {
  const rate = await fetchLiveRate(input.fromCurrency, input.toCurrency);

  const convertedAmount = parseFloat((input.amount * rate).toFixed(2));

  const result = await databasePool.query(
    `INSERT INTO fx_quotes
       (user_id, from_currency, to_currency, rate, locked_amount, status, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'active', NOW() + INTERVAL '60 seconds')
     RETURNING *`,
    [userId, input.fromCurrency, input.toCurrency, rate, input.amount],
  );

  const quote = result.rows[0];

  const now = new Date();
  const expiresAt = new Date(quote.expires_at);
  const secondsRemaining = Math.max(
    0,
    Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
  );

  return {
    quoteId: quote.id,
    fromCurrency: quote.from_currency,
    toCurrency: quote.to_currency,
    rate: quote.rate,
    lockedAmount: quote.locked_amount,
    convertedAmount,
    status: quote.status,
    expiresAt: quote.expires_at,
    secondsRemaining,
    warning:
      "This rate is locked for 60 seconds. " +
      "You must complete the transfer before it expires.",
  };
};

export const checkQuoteService = async (quoteId: string, userId: string) => {
  const result = await databasePool.query(
    `SELECT * FROM fx_quotes WHERE id = $1`,
    [quoteId],
  );

  const quote = result.rows[0];

  if (!quote) {
    throw new ApiError(404, "FX quote not found");
  }

  if (quote.user_id !== userId) {
    throw new ApiError(403, "You do not have access to this quote");
  }

  const now = new Date();
  const expiresAt = new Date(quote.expires_at);
  const secondsRemaining = Math.max(
    0,
    Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
  );

  if (quote.status === "active" && now > expiresAt) {
    await databasePool.query(
      `UPDATE fx_quotes SET status = 'expired' WHERE id = $1`,
      [quoteId],
    );
    quote.status = "expired";
  }

  return {
    quoteId: quote.id,
    fromCurrency: quote.from_currency,
    toCurrency: quote.to_currency,
    rate: quote.rate,
    lockedAmount: quote.locked_amount,
    status: quote.status,
    expiresAt: quote.expires_at,
    secondsRemaining: quote.status === "active" ? secondsRemaining : 0,
    isValid: quote.status === "active" && secondsRemaining > 0,
  };
};

export const internationalTransferService = async (
  userId: string,
  input: InternationalTransferInput,
) => {
  const payloadHash = hashPayload({
    quoteId: input.quoteId,
    senderAccountId: input.senderAccountId,
    receiverAccountId: input.receiverAccountId,
  });

  const cached = await checkIdempotencyKey(input.idempotencyKey, payloadHash);
  if (cached) return cached;

  const raceResult = await createIdempotencyKey(
    input.idempotencyKey,
    payloadHash,
  );
  if (raceResult) return raceResult;

  const quoteResult = await databasePool.query(
    `SELECT * FROM fx_quotes WHERE id = $1`,
    [input.quoteId],
  );

  const quote = quoteResult.rows[0];

  if (!quote) {
    throw new ApiError(404, "FX quote not found");
  }

  if (quote.user_id !== userId) {
    throw new ApiError(403, "This quote does not belong to you");
  }

  if (new Date() > new Date(quote.expires_at)) {
    throw new ApiError(
      410,
      "FX quote has expired. Please request a new rate and try again.",
    );
  }

  if (quote.status !== "active") {
    throw new ApiError(
      409,
      `FX quote has already been ${quote.status}. Each quote is single-use.`,
    );
  }

  const senderResult = await databasePool.query(
    `SELECT id, user_id, currency, balance
     FROM accounts WHERE id = $1 AND is_active = TRUE`,
    [input.senderAccountId],
  );

  const sender = senderResult.rows[0];

  if (!sender) throw new ApiError(404, "Sender account not found");
  if (sender.user_id !== userId)
    throw new ApiError(403, "You do not own this account");
  if (sender.currency !== quote.from_currency) {
    throw new ApiError(
      400,
      `Sender account currency (${sender.currency}) does not match quote fromCurrency (${quote.from_currency})`,
    );
  }

  const receiverResult = await databasePool.query(
    `SELECT id, currency FROM accounts
     WHERE id = $1 AND is_active = TRUE`,
    [input.receiverAccountId],
  );

  const receiver = receiverResult.rows[0];
  if (!receiver) throw new ApiError(404, "Receiver account not found");

  const convertedAmount = parseFloat(
    (parseFloat(quote.locked_amount) * parseFloat(quote.rate)).toFixed(2),
  );

  const client = await databasePool.connect();

  try {
    await client.query("BEGIN");

    const lockedSender = await client.query(
      `SELECT balance FROM accounts WHERE id = $1 FOR UPDATE`,
      [input.senderAccountId],
    );

    const currentBalance = parseFloat(lockedSender.rows[0].balance);

    if (currentBalance < parseFloat(quote.locked_amount)) {
      await client.query("ROLLBACK");
      await failIdempotencyKey(input.idempotencyKey);
      throw new ApiError(400, "Insufficient balance");
    }

    const usedQuote = await client.query(
      `UPDATE fx_quotes
       SET status = 'used'
       WHERE id = $1 AND status = 'active' AND expires_at > NOW()
       RETURNING *`,
      [input.quoteId],
    );

    if (usedQuote.rowCount === 0) {
      await client.query("ROLLBACK");
      await failIdempotencyKey(input.idempotencyKey);
      throw new ApiError(
        410,
        "FX quote expired or already used. Please request a new rate.",
      );
    }

    await client.query(
      `UPDATE accounts SET balance = balance - $1, updated_at = NOW()
       WHERE id = $2`,
      [quote.locked_amount, input.senderAccountId],
    );

    await client.query(
      `UPDATE accounts SET balance = balance + $1, updated_at = NOW()
       WHERE id = $2`,
      [convertedAmount, input.receiverAccountId],
    );

    const txResult = await client.query(
      `INSERT INTO transactions
         (idempotency_key, sender_account_id, receiver_account_id,
          amount, currency, status, type, fx_quote_id)
       VALUES ($1, $2, $3, $4, $5, 'completed', 'international', $6)
       RETURNING *`,
      [
        input.idempotencyKey,
        input.senderAccountId,
        input.receiverAccountId,
        quote.locked_amount,
        quote.from_currency,
        input.quoteId,
      ],
    );

    const transaction = txResult.rows[0];

    await client.query(
      `INSERT INTO ledger_entries
         (transaction_id, account_id, type, amount, currency, fx_rate)
       VALUES
         ($1, $2, 'debit',  $3, $4, $5),
         ($1, $6, 'credit', $3, $4, $5)`,
      [
        transaction.id,
        input.senderAccountId,
        quote.locked_amount,
        quote.from_currency,
        quote.rate,
        input.receiverAccountId,
        // convertedAmount,
        // quote.to_currency,
      ],
    );

    const invariant = await client.query(
      `SELECT SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) AS balance
       FROM ledger_entries WHERE transaction_id = $1`,
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
      sentAmount: quote.locked_amount,
      sentCurrency: quote.from_currency,
      receivedAmount: convertedAmount,
      receivedCurrency: quote.to_currency,
      lockedRate: quote.rate,
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
