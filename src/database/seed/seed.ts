import { seedUsers, seedLedgerAccounts } from "./index";

async function runSeeds() {
  try {
    console.log("Seeding Started...");
    await seedUsers();
    await seedLedgerAccounts();
    console.log("Seeding Completed!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

runSeeds();
