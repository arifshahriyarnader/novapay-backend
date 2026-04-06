import { seedUsers, seedLedgerAccounts, seedAccounts } from "./index";

async function runSeeds() {
  try {
    console.log("Seeding Started...");
    await seedUsers();
    await seedLedgerAccounts();
    await seedAccounts();
    console.log("Seeding Completed!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

runSeeds();
