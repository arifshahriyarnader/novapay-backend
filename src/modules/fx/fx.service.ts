import { databasePool } from "../../database/connection";
import { fetchLiveRate } from "./fx.provider";
import { LockRateInput } from "./fx.validator";

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
