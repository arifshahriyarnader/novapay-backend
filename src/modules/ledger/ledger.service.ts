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

export const verifyDoubleEntryService = async (
  transactionId: string,
  userId: string,
) => {
  const txResult = await databasePool.query(
    `SELECT t.id, t.status, t.amount, t.currency,
            sender.user_id as sender_user_id
     FROM transactions t
     JOIN accounts sender ON sender.id = t.sender_account_id
     WHERE t.id = $1`,
    [transactionId],
  );

  const transaction = txResult.rows[0];

  if (!transaction) {
    throw new ApiError(404, "Transaction not found");
  }

  if (transaction.sender_user_id !== userId) {
    throw new ApiError(403, "You do not have access to this transaction");
  }

  const invariantResult = await databasePool.query(
    `SELECT
       SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) AS balance,
       COUNT(*) as entry_count,
       SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits,
       SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits
     FROM ledger_entries
     WHERE transaction_id = $1`,
    [transactionId],
  );

  const { balance, entry_count, total_debits, total_credits } =
    invariantResult.rows[0];

  const balanceValue = parseFloat(balance ?? "0");
  const isValid = balanceValue === 0;

  return {
    transactionId,
    transactionStatus: transaction.status,
    entryCount: parseInt(entry_count),
    totalDebits: total_debits,
    totalCredits: total_credits,
    invariantBalance: balanceValue,
    isValid,
    message: isValid
      ? "Double-entry invariant holds — debits equal credits"
      : "INVARIANT VIOLATION — debits do not equal credits. Money has been created or destroyed.",
  };
};
