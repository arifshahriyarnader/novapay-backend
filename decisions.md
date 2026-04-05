# NovaPay — Decision Log

This document explains every major decision made during the design and implementation of the NovaPay backend.

---

## 1. Technology Stack

### TypeScript
Financial systems handle money. A type error on a payment amount can silently corrupt data. TypeScript catches these errors at compile time before they reach production. It also provides type-safe database query results — no accidental `undefined` on a balance field.

### Express.js
Express is minimal, unopinionated, and production-proven. It gives full control over every layer without framework overhead. Used with TypeScript via `@types/express`.

### PostgreSQL (raw `pg`, no ORM)
PostgreSQL is the industry standard for financial systems:
- ACID transactions — critical for double-entry ledger atomicity
- `NUMERIC(18,2)` — exact decimal arithmetic, no floating point errors
- `INSERT ... ON CONFLICT DO NOTHING` — atomic idempotency enforcement
- `SELECT ... FOR UPDATE` — atomic balance check and debit

Raw `pg` is used instead of an ORM because in a financial system, I must know exactly what SQL is running. ORMs abstract away the critical operations I need to reason about precisely.

### Zod
Every endpoint that accepts money movement must validate input strictly. Zod provides schema-first validation with full TypeScript inference. Schemas double as TypeScript types, reducing duplication.

---
 
## 2. Database Design — 10 Tables
 
10 tables were created across 6 service domains:
 
| # | Table | Service | Purpose |
|---|---|---|---|
| 1 | `users` | Auth | Stores all system users with role-based access |
| 2 | `accounts` | Account | User wallets supporting multi-currency |
| 3 | `idempotency_keys` | Transaction | Prevents duplicate payment processing |
| 4 | `transactions` | Transaction | Records all money movements |
| 5 | `ledger_accounts` | Ledger | System-level internal accounts (fee, suspense) |
| 6 | `ledger_entries` | Ledger | Double-entry bookkeeping records |
| 7 | `fx_quotes` | FX | Time-locked exchange rate quotes (60s TTL) |
| 8 | `payroll_jobs` | Payroll | Bulk disbursement job tracking |
| 9 | `payroll_items` | Payroll | Individual payment records per job |
| 10 | `audit_logs` | Admin | Immutable audit trail of all actions |
 
### Why `ledger_accounts` as a separate table?
The double-entry ledger requires system-level accounts such as `novapay_fee_account` and `novapay_suspense`. These are not user wallets — they are internal NovaPay accounts used in every transaction. They must exist before any transaction is processed.
 
### Why `idempotency_keys` as a separate table?
Idempotency keys need their own lifecycle — they have a status (`processing`, `completed`, `failed`), a payload hash for mismatch detection, a cached response, and a 24-hour expiry. Storing them separately keeps the transactions table clean and allows atomic conflict detection via PostgreSQL unique constraint.
 
---
 
## 3. Seed Data — No Registration API
 
### Why no registration endpoint?
The assessment does not require a registration flow. NovaPay is a B2B financial platform where users are onboarded by administrators, not self-registered. Building a registration flow would consume time better spent on the core financial logic.
 
### What is seeded and why?
 
**seed_users — 4 users:**
```
admin@novapay.com     / Admin@123     role: admin
sender@novapay.com    / Sender@123    role: user
receiver@novapay.com  / Receiver@123  role: user
employer@novapay.com  / Employer@123  role: employer
```
 
These 4 users cover all role-based access scenarios:
- `admin`    → tests Admin Service endpoints
- `sender`   → tests individual money transfers
- `receiver` → tests receiving funds
- `employer` → tests bulk payroll disbursement
 
Without these seeded users, no API endpoint can be tested via Postman.
 
**seed_ledger_accounts — 3 system accounts:**
```
novapay_fee_account → collects transaction fees
novapay_suspense    → holds funds during crash recovery
novapay_float       → system float account
```
 
These must exist before any transaction runs. The double-entry ledger writes to `novapay_fee_account` on every transaction fee. The crash recovery mechanism writes to `novapay_suspense` when a debit completes but a credit has not yet been written.
 
### Why bcrypt with cost factor 10?
Cost factor 10 is the industry standard balance between security and performance. It produces a hash in ~100ms — slow enough to resist brute force, fast enough for a login endpoint.

---

*More decisions will be added as each feature is implemented.*