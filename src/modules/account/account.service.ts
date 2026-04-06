import crypto from "crypto";
import { databasePool } from "../../database/connection";
import { ApiError } from "../../utils/ApiError";
import { CreateAccountInput } from "./account.validator";

const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY ?? "";

const generateDEK = (): Buffer => {
  return crypto.randomBytes(32);
};

const encryptWithMasterKey = (dek: Buffer): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(MASTER_KEY, "hex"),
    iv,
  );
  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

const encryptField = (value: string, dek: Buffer): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", dek, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decryptField = (encryptedValue: string, dek: Buffer): string => {
  const [ivHex, encryptedHex] = encryptedValue.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", dek, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
};

export const decryptDEK = (encryptedDEK: string): Buffer => {
  const [ivHex, encryptedHex] = encryptedDEK.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(MASTER_KEY, "hex"),
    iv,
  );
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
};

const generateAccountNumber = (): string => {
  const digits = crypto.randomInt(1000000000, 9999999999);
  return `NP${digits}`;
};

export const createAccountService = async (
  userId: string,
  input: CreateAccountInput,
) => {
  const existing = await databasePool.query(
    `SELECT id FROM accounts
     WHERE user_id = $1 AND currency = $2 AND is_active = TRUE`,
    [userId, input.currency],
  );

  if (existing.rows.length > 0) {
    throw new ApiError(
      409,
      `You already have an active ${input.currency} account`,
    );
  }

  const dek = generateDEK();
  const accountNumber = generateAccountNumber();
  const encryptedAccountNumber = encryptField(accountNumber, dek);
  const encryptedDEK = encryptWithMasterKey(dek);

  const result = await databasePool.query(
    `INSERT INTO accounts
       (user_id, currency, balance, encrypted_account_number, encrypted_dek)
     VALUES ($1, $2, 0.00, $3, $4)
     RETURNING id, user_id, currency, balance, is_active, created_at`,
    [userId, input.currency, encryptedAccountNumber, encryptedDEK],
  );

  const account = result.rows[0];

  return {
    id: account.id,
    userId: account.user_id,
    currency: account.currency,
    balance: account.balance,
    isActive: account.is_active,
    createdAt: account.created_at,
  };
};

export const getMyAccountsService = async (userId: string) => {
  const result = await databasePool.query(
    `SELECT id, user_id, currency, balance, is_active, created_at
     FROM accounts
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY created_at ASC`,
    [userId]
  );
 
  return result.rows.map((account) => ({
    id: account.id,
    userId: account.user_id,
    currency: account.currency,
    balance: account.balance,
    isActive: account.is_active,
    createdAt: account.created_at,
  }));
};

export const getAccountBalanceService = async (
  accountId: string,
  userId: string
) => {
  const result = await databasePool.query(
    `SELECT id, user_id, currency, balance, is_active
     FROM accounts
     WHERE id = $1 AND is_active = TRUE`,
    [accountId]
  );
 
  const account = result.rows[0];
 
  if (!account) {
    throw new ApiError(404, 'Account not found');
  }
 
  
  if (account.user_id !== userId) {
    throw new ApiError(403, 'You do not have access to this account');
  }
 
  return {
    id: account.id,
    currency: account.currency,
    balance: account.balance,
    isActive: account.is_active,
  };
};