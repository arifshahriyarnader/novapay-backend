import { databasePool } from "../../database/connection";
import { AdminUser } from "./admin.type";

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
