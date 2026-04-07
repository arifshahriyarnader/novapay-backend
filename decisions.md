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

## 4. Architecture — Modular Monolith over Microservices
 
I chose a modular monolith over a distributed microservice architecture.
 
**What this means:**
- One Express application, one server, one deployment
- Six isolated modules: `auth`, `account`, `transaction`, `ledger`, `fx`, `payroll`, `admin`
- Each module has its own routes, controllers, services, and validators
- One PostgreSQL database with logically separated tables per domain
 
**Why not microservices?**
I have not worked with microservices before. Attempting to build six separate services with inter-service HTTP calls, service discovery, and distributed tracing for the first time under a 2-day deadline would result in a broken, incomplete system. That would be worse than a well-built modular monolith.
 
A modular monolith with clear boundaries is the honest, correct choice here. The module boundaries I have defined make extraction into true microservices straightforward when that scale is needed.
 
**Trade-off accepted:**
Cannot scale individual modules independently. If the FX module receives 10x traffic, the entire application must scale. This is acceptable at this stage.
 
---
 
## 5. Auth — Access Token Only, No Refresh Token
 
I chose to use only a JWT access token. There is no refresh token.
 
**Why no refresh token?**
The assessment does not require a refresh token. Refresh tokens add significant complexity:
- Refresh token storage in database or Redis
- Token rotation logic
- Revocation mechanism
- Two separate endpoints (`/auth/refresh`, `/auth/logout`)
 
This complexity is not justified for an assessment focused on financial transaction correctness. The access token expires in 15 minutes — short enough to be secure, long enough to test all API endpoints via Postman.
 
**What I would add before production:**
Refresh tokens stored in an httpOnly cookie with a 7-day expiry, token rotation on every refresh, and a token blacklist in Redis for logout.
 
---
 
## 6. Brute Force Protection on Login
 
The login endpoint is protected with a strict rate limiter — maximum 5 attempts per 15 minutes per IP address.
 
**Why is this critical for a payment system?**
Without brute force protection, an attacker can write a script to try thousands of password combinations against any email address. If they succeed, they have full access to that user's wallet and can initiate transfers immediately.
 
5 attempts per 15 minutes is the industry standard for financial applications. A legitimate user who forgets their password will not exceed 5 attempts. A bot trying thousands of passwords will be blocked immediately.
 
**What happens after 5 failed attempts:**
The IP is blocked for 15 minutes. The response is:
```
429 Too Many Requests
"Too many login attempts. Please try again after 15 minutes."
```
 
---
 
## 7. General API Rate Limiter
 
All API endpoints are protected with a general rate limiter — maximum 100 requests per minute per IP address.
 
**Why is this necessary?**
The NovaPay incident happened partly because the database was overwhelmed by concurrent requests. A rate limiter is the first line of defense against:
- DDoS attacks (bot sending thousands of requests per second)
- Accidental overload (client bug sending requests in a tight loop)
- Database CPU spike (too many concurrent queries)
 
100 requests per minute is generous enough for any legitimate use case — a user interacting with the app will never come close to this limit. A bot or misconfigured client will be blocked before it can cause damage.
 
**Where it is applied:**
`app.use('/api', apiRateLimiter)` in `server.ts` — before all routes, so every API endpoint is protected without having to add it individually.

---
 
## 8. Utility Layer — ApiError, ApiResponse, AsyncHandler
 
### ApiError
A custom error class that extends the native `Error` object with a `statusCode` property.
 
**Why not use plain `throw new Error()`?**
 
Plain errors have no HTTP status code. Without `ApiError`, every controller would need its own `if/else` to decide whether to return 400, 401, 403, 404, or 500. With `ApiError`, the error carries its own status code and the global `errorHandler` middleware reads it automatically.
 
```typescript
// Without ApiError — repeated everywhere
if (!user) {
  return res.status(404).json({ message: 'Not found' });
}
 
// With ApiError — clean, reusable
if (!user) throw new ApiError(404, 'User not found');
```
 
### ApiResponse
A single function that produces a consistent response shape across all endpoints.
 
**Why?**
Every endpoint returning a different structure makes the Postman collection unpredictable and the frontend integration fragile. One function enforces:
```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```
 
### AsyncHandler
A wrapper that catches errors from async controller functions and passes them to the global `errorHandler` via `next()`.
 
**Why?**
Express does not automatically catch errors thrown inside async functions. Without `asyncHandler`, every controller needs a `try/catch` block. With it, controllers stay clean and error handling is centralized.
 
```typescript
// Without asyncHandler — repeated try/catch everywhere
router.get('/', async (req, res, next) => {
  try {
    const data = await someService();
    res.json(data);
  } catch (err) {
    next(err);
  }
});
 
// With asyncHandler — clean
router.get('/', asyncHandler(async (req, res) => {
  const data = await someService();
  res.json(data);
}));
```
 
---
 
## 9. Modular Architecture — Why Feature-Based Modules
 
Each feature (auth, account, transaction, ledger, fx, payroll, admin) is isolated in its own folder with its own routes, controller, service, validator, and types.
 
**Why this structure?**
- Each module can be understood, tested, and modified independently
- No cross-module imports except through defined interfaces
- Follows the same pattern used in the RBAC system — proven and comfortable
- Makes it straightforward to extract a module into a microservice later
 
---
 
## 10. Seed — 50 Employees
 
50 employee users (`employee1@novapay.com` through `employee50@novapay.com`) are seeded with corresponding USD accounts.
 
**Why 50 employees?**
 
The core requirement is bulk payroll processing via BullMQ queue. With only 1 receiver (`receiver@novapay.com`), a payroll job would have 1 recipient — this does not demonstrate the queue behavior, concurrency control, or progress tracking that the assessment requires.
 
50 employees allows:
- A realistic payroll job with 50 recipients
- BullMQ queue processing items one at a time (concurrency = 1)
- Progress tracking (`processed_count` vs `total_recipients`)
- Idempotency per payroll item — each employee credit has its own key
- Demonstrating that a crash mid-payroll does not duplicate any credit
 
**Why seeded instead of registered?**
Registering 50 accounts via API during assessment review is impractical. Seeding them ensures the reviewer can run `npm run seed` once and immediately test payroll with realistic data.

---
 
## 11. Transaction Service — Idempotency (5 Scenarios)
 
Every disbursement request must be processed exactly once regardless of how many times it arrives.
 
**Mechanism:** Every request carries an `idempotencyKey`. On arrival, the key is inserted into the `idempotency_keys` table using `INSERT ... ON CONFLICT DO NOTHING`. PostgreSQL's unique constraint ensures exactly one insert wins atomically.
 
### Scenario A — Same key arrives twice
The second request finds the key with status `completed` and returns the cached `response` column. No second transaction is created. No second debit occurs.
 
### Scenario B — Three identical requests within 100ms
All three attempt `INSERT ... ON CONFLICT DO NOTHING` simultaneously. PostgreSQL's unique constraint allows exactly one insert to succeed. The two losing requests receive 0 rows affected — they query the existing record and either wait (if `processing`) or return the cached response (if `completed`). This is handled entirely at the database level with no application-level locking.
 
### Scenario C — Crash after debit, before credit
The transaction status stays `pending` and the idempotency key stays `processing`. A recovery worker detects stale `processing` records older than 30 seconds and reverses the debit, restoring the sender's balance. The ledger is rebalanced and the transaction is marked `reversed`.
 
### Scenario D — Key expires after 24 hours
The `expires_at` column is set to `NOW() + 24 hours` on insert. A nightly cleanup job removes expired keys. If a client retries at 30 hours, the key no longer exists and the system returns `410 Gone: "Idempotency key has expired. Please retry with a new key."` No new transaction is created automatically.
 
### Scenario E — Same key, different payload
On first insert, a SHA-256 hash of the request body is stored in `payload_hash`. On subsequent requests with the same key, the incoming body is hashed and compared. If they differ, the system returns `409 Conflict: "Idempotency key reuse with different payload detected."`
 
---
 
## 12. Atomic Transfer — SELECT FOR UPDATE
 
The balance check and debit run inside a single PostgreSQL transaction using `SELECT FOR UPDATE`.
 
**Why?**
The NovaPay incident happened because the balance check and debit ran in two separate queries with no lock between them. Under concurrent load, multiple requests could all read the same balance, all pass the check, and all debit — resulting in a negative balance.
 
`SELECT FOR UPDATE` locks the row for the duration of the transaction. No other transaction can read or write that row until the lock is released. The balance check and debit become a single atomic operation.
 
```sql
BEGIN;
SELECT balance FROM accounts WHERE id = $1 FOR UPDATE;
-- balance check happens here
UPDATE accounts SET balance = balance - $1 WHERE id = $2;
UPDATE accounts SET balance = balance + $1 WHERE id = $3;
INSERT INTO ledger_entries ...
COMMIT;
```
 
If the balance is insufficient, the transaction rolls back and no debit occurs.
 
---
 
## 13. Double-Entry Ledger — Invariant Enforcement
 
Every money movement creates exactly two ledger entries inside a single database transaction — one debit and one credit. The invariant is:
 
```sql
SELECT SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END)
FROM ledger_entries
WHERE transaction_id = $1;
-- Must always return 0
```
 
This query runs after every completed transaction. If it ever returns non-zero, a critical error is thrown and the transaction is rolled back. Non-zero means money has been created or destroyed inside the system.
 
**The `accounts.balance` column is a cache.** The source of truth is always the ledger. A reconciliation function can verify that `accounts.balance` matches the sum of all ledger entries for that account at any point in time.
 
**Why verify after every transaction?**
Catching invariant violations at the moment they occur is far cheaper than discovering them during an audit. A violation found immediately can be rolled back. A violation found 24 hours later has already propagated through the system.
 
---
 
## 14. Ledger Service — Verify Endpoint
 
`GET /api/ledger/verify/:transactionId` allows any user to verify the double-entry invariant for their own transaction.
 
**Why expose this as an API?**
This serves two purposes. First, it gives the reviewer a way to demonstrate the invariant check working in real time via Postman. Second, in production this endpoint would be used by the admin service and automated reconciliation jobs to detect corruption without direct database access.
 
**Why is it accessible to users and not just admins?**
A user should be able to verify that their own transaction was recorded correctly. They cannot access other users' transactions — the service checks `sender_user_id = userId` before running the invariant query.
 
---
 
## 15. Route Order — Static Before Dynamic
 
Express matches routes in the order they are defined. A static route like `/history` must be defined before a dynamic route like `/:id`, otherwise Express treats the word "history" as a UUID parameter and passes it to the wrong handler.
 
```typescript
//  Wrong order — "history" treated as :id
router.get('/:id', getTransaction);
router.get('/history', getTransactionHistory);
 
//  Correct order — static first
router.get('/history', getTransactionHistory);
router.get('/:id', getTransaction);
```
 
This same pattern is applied in the ledger routes where `/verify/:transactionId` is defined before `/:accountId`. 

---

*More decisions will be added as each feature is implemented.*