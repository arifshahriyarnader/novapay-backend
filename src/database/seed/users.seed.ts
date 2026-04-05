import bcrypt from "bcrypt";
import { databasePool } from "../connection";

export const seedUsers = async () => {
  console.log("Seeding users...");

  const users = [
    {
      email: "admin@novapay.com",
      password: "Admin@123",
      role: "admin" as const,
    },
    {
      email: "sender@novapay.com",
      password: "Sender@123",
      role: "user" as const,
    },
    {
      email: "receiver@novapay.com",
      password: "Receiver@123",
      role: "user" as const,
    },
    {
      email: "employer@novapay.com",
      password: "Employer@123",
      role: "employer" as const,
    },
  ];

  for (const user of users) {
    const existing = await databasePool.query(
      `SELECT id FROM users WHERE email = $1`,
      [user.email],
    );

    if (existing.rows.length > 0) {
      console.log(`   ⏭️  ${user.email} already exists — skipped`);
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, 10);

    await databasePool.query(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, $3)`,
      [user.email, passwordHash, user.role],
    );

    console.log(` ${user.role} user created`);
    console.log(` Email:    ${user.email}`);
    console.log(` Password: ${user.password}`);
  }
};
