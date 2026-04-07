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
     LIMIT 100`
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
