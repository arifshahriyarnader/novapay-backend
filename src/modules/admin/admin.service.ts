import { databasePool } from "../../database/connection";
import { AuditLog, LedgerHealthResult } from "./admin.type";

export const getAllUsersService = async (
  page: number = 1,
  limit: number = 10,
) => {
  const offset = (page - 1) * limit;
  const countResult = await databasePool.query(`SELECT COUNT(*) FROM users`);
  const total = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);
  const result = await databasePool.query(
    `SELECT id, email, role, is_active, created_at, updated_at
     FROM users
     ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  return {
    users: result.rows.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.is_active,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    })),
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

export const getAuditLogsService = async () => {
  const result = await databasePool.query(
    `SELECT al.id, al.user_id, al.action, al.entity,
            al.entity_id, al.metadata, al.ip_address, al.created_at,
            u.email as user_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT 100`,
  );

  return result.rows.map((log) => ({
    id: log.id,
    userId: log.user_id,
    userEmail: log.user_email,
    action: log.action,
    entity: log.entity,
    entityId: log.entity_id,
    metadata: log.metadata,
    ipAddress: log.ip_address,
    createdAt: log.created_at,
  }));
};

export const getAllTransactionsService = async () => {
  const result = await databasePool.query(
    `SELECT t.id, t.amount, t.currency, t.status, t.type,
            t.sender_account_id, t.receiver_account_id,
            t.idempotency_key, t.fx_quote_id,
            t.failure_reason, t.created_at, t.updated_at,
            sender.user_id as sender_user_id,
            receiver.user_id as receiver_user_id
     FROM transactions t
     JOIN accounts sender ON sender.id = t.sender_account_id
     JOIN accounts receiver ON receiver.id = t.receiver_account_id
     ORDER BY t.created_at DESC
     LIMIT 100`,
  );

  return result.rows.map((t) => ({
    id: t.id,
    amount: t.amount,
    currency: t.currency,
    status: t.status,
    type: t.type,
    senderAccountId: t.sender_account_id,
    receiverAccountId: t.receiver_account_id,
    senderUserId: t.sender_user_id,
    receiverUserId: t.receiver_user_id,
    idempotencyKey: t.idempotency_key,
    fxQuoteId: t.fx_quote_id,
    failureReason: t.failure_reason,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
};
