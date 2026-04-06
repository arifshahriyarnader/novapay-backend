import crypto from "crypto";
import { databasePool } from "../connection";

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

const generateAccountNumber = (): string => {
  const digits = crypto.randomInt(1000000000, 9999999999);
  return `NP${digits}`;
};

export const seedAccounts = async () => {
  console.log("Seeding employee accounts...");

  const result = await databasePool.query(
    `SELECT id, email FROM users
     WHERE email LIKE 'employee%@novapay.com'
     ORDER BY email`,
  );

  const employees = result.rows;

  if (employees.length === 0) {
    console.log("   ⚠️  No employees found — run seedUsers first");
    return;
  }

  console.log(`   Found ${employees.length} employees`);

  for (const employee of employees) {
    // Check if account already exists
    const existing = await databasePool.query(
      `SELECT id FROM accounts
       WHERE user_id = $1 AND currency = 'USD'`,
      [employee.id],
    );

    if (existing.rows.length > 0) {
      console.log(`   ⏭️  ${employee.email} account already exists — skipped`);
      continue;
    }

    const dek = generateDEK();
    const accountNumber = generateAccountNumber();
    const encryptedAccountNumber = encryptField(accountNumber, dek);
    const encryptedDEK = encryptWithMasterKey(dek);

    await databasePool.query(
      `INSERT INTO accounts
         (user_id, currency, balance, encrypted_account_number, encrypted_dek)
       VALUES ($1, 'USD', 0.00, $2, $3)`,
      [employee.id, encryptedAccountNumber, encryptedDEK],
    );

    console.log(`   ✅ Account created → ${employee.email}`);
  }

  console.log(`   ✅ All employee accounts seeded`);
};
