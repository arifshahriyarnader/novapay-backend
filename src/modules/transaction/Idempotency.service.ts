import crypto from "crypto";
import { ApiError } from "../../utils/ApiError";
import { databasePool } from "../../database/connection";

export const hashPayload = (payload: object): string => {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
};

export const checkIdempotencyKey = async (key: string, payloadHash: string) => {
  const result = await databasePool.query(
    `SELECT key, payload_hash, status, response
     FROM idempotency_keys
     WHERE key = $1`,
    [key],
  );

  const existing = result.rows[0];

  if (!existing) return null;

  if (existing.payload_hash !== payloadHash) {
    throw new ApiError(
      409,
      "Idempotency key reuse with different payload detected",
    );
  }

  if (existing.status === "processing") {
    throw new ApiError(
      409,
      "Transaction is being processed. Please check your balance before retrying.",
    );
  }

  return existing.response;
};

export const createIdempotencyKey = async (
  key: string,
  payloadHash: string,
) => {
  const result = await databasePool.query(
    `INSERT INTO idempotency_keys (key, payload_hash, status, expires_at)
     VALUES ($1, $2, 'processing', NOW() + INTERVAL '24 hours')
     ON CONFLICT (key) DO NOTHING
     RETURNING key`,
    [key, payloadHash],
  );

  if (result.rowCount === 0) {
    const existing = await databasePool.query(
      `SELECT payload_hash, status, response
       FROM idempotency_keys WHERE key = $1`,
      [key],
    );

    if (existing.rows[0].payload_hash !== payloadHash) {
      throw new ApiError(
        409,
        "Idempotency key reuse with different payload detected",
      );
    }

    if (existing.rows[0].status === "processing") {
      throw new ApiError(
        409,
        "Transaction is being processed. Please check your balance before retrying.",
      );
    }

    return existing.rows[0].response;
  }

  return null;
};

export const completeIdempotencyKey = async (key: string, response: object) => {
  await databasePool.query(
    `UPDATE idempotency_keys
     SET status = 'completed', response = $1
     WHERE key = $2`,
    [JSON.stringify(response), key],
  );
};

export const failIdempotencyKey = async (key: string) => {
  await databasePool.query(
    `UPDATE idempotency_keys
     SET status = 'failed'
     WHERE key = $1`,
    [key],
  );
};
