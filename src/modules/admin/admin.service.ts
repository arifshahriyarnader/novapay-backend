import { databasePool } from "../../database/connection";
import { AdminUser, AuditLog, LedgerHealthResponse } from "./admin.type";

export const getAllUsersService = async (
  page: number,
  limit: number,
): Promise<{ data: AdminUser[]; total: number }> => {
  const offset = (page - 1) * limit;

  const usersResult = await databasePool.query(
    `SELECT id, email, role, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  const countResult = await databasePool.query(`SELECT COUNT(*) FROM users`);

  return {
    data: usersResult.rows,
    total: parseInt(countResult.rows[0].count),
  };
};

export const getAuditLogsService = async (): Promise<AuditLog[]> => {
  const result = await databasePool.query(
    `SELECT id, action, user_id, metadata, created_at
     FROM audit_logs
     ORDER BY created_at DESC
     LIMIT 100`
  );

  return result.rows;
};

export const getLedgerHealthService = async (): Promise<LedgerHealthResponse> => {
  const result = await databasePool.query(
    `SELECT
        transaction_id,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) AS balance
     FROM ledger_entries
     GROUP BY transaction_id
     HAVING SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) != 0`
  );

  return {
    isHealthy: result.rows.length === 0,
    violations: result.rows,
  };
};