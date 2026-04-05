import { databasePool } from "../connection";

export const seedLedgerAccounts = async () => {
  console.log("Seeding ledger accounts...");

  const accounts = [
    {
      name: "novapay_fee_account",
      type: "revenue",
      description: "NovaPay collects transaction fees here",
    },
    {
      name: "novapay_suspense",
      type: "liability",
      description: "Holds funds during incomplete or pending transactions",
    },
    {
      name: "novapay_float",
      type: "asset",
      description: "System float account for internal operations",
    },
  ];

  for (const account of accounts) {
    const existing = await databasePool.query(
      `SELECT id FROM ledger_accounts WHERE name = $1`,
      [account.name],
    );

    if (existing.rows.length > 0) {
      console.log(`   ⏭️  ${account.name} already exists — skipped`);
      continue;
    }

    await databasePool.query(
      `INSERT INTO ledger_accounts (name, type, description)
       VALUES ($1, $2, $3)`,
      [account.name, account.type, account.description],
    );

    console.log(` ${account.name} created`);
  }
};
