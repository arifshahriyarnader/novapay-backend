import { databasePool } from "../../database/connection";
import { ApiError } from "../../utils";

export const getLedgerEntriesService = async (
  accountId: string,
  userId: string,
) => {
  const accountResult = await databasePool.query(
    `SELECT id, user_id, currency, balance
     FROM accounts
     WHERE id = $1 AND is_active = TRUE`,
    [accountId],
  );

  const account = accountResult.rows[0];

  if (!account) {
    throw new ApiError(404, "Account not found");
  }

  if (account.user_id !== userId) {
    throw new ApiError(403, "You do not have access to this account");
  }

  const result = await databasePool.query(
    `SELECT
       le.id,
       le.transaction_id,
       le.account_id,
       le.type,
       le.amount,
       le.currency,
       le.fx_rate,
       le.created_at,
       t.status as transaction_status,
       t.type as transaction_type
     FROM ledger_entries le
     JOIN transactions t ON t.id = le.transaction_id
     WHERE le.account_id = $1
     ORDER BY le.created_at DESC`,
    [accountId],
  );

  return {
    accountId,
    currency: account.currency,
    currentBalance: account.balance,
    entries: result.rows.map((entry) => ({
      id: entry.id,
      transactionId: entry.transaction_id,
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency,
      fxRate: entry.fx_rate,
      transactionStatus: entry.transaction_status,
      transactionType: entry.transaction_type,
      createdAt: entry.created_at,
    })),
  };
};
