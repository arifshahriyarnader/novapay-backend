# NovaPay — Banking & Payment Infrastructure

A banking-grade backend rebuilt from scratch to solve four critical financial system failures: duplicate disbursements, incomplete transfers, stale FX rates, and database overload.

---

## Table of Contents

- [Setup & Run](#setup--run)
- [Environment Variables](#environment-variables)
- [Test Credentials](#test-credentials)
- [API Endpoints](#api-endpoints)
- [Idempotency Strategy](#idempotency-strategy)
- [Double-Entry Invariant](#double-entry-invariant)
- [Atomicity Strategy](#atomicity-strategy)
- [FX Rate Locking](#fx-rate-locking)
- [Payroll Resumability](#payroll-resumability)
- [Audit Hash Chain](#audit-hash-chain)
- [Trade-offs Under Time Pressure](#trade-offs-under-time-pressure)
- [What I Would Add Before Production](#what-i-would-add-before-production)

---

## Setup & Run

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (via Docker)
- Docker (for Redis)

### 1. Clone the repository
```bash
git clone https://github.com/arifshahriyarnader/novapay-backend.git
cd novapay-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Start Redis
```bash
docker run -d -p 6379:6379 --name novapay-redis always redis
```

### 5. Run database migrations
Run each file in `/migrations` in order via pgAdmin or psql:
```bash
psql -U postgres -d novapay -f migrations/001_create_users.sql
psql -U postgres -d novapay -f migrations/002_create_accounts.sql
# ... continue through 010_create_audit_logs.sql
```

### 6. Seed the database
```bash
npm run seed
```

### 7. Start the server
```bash
npm run dev
```

Server runs on `http://localhost:5001`

### Health check
```
GET http://localhost:5001/health
```

---

## Environment Variables

```env
PORT=5001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=novapay
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=15m

# Encryption
MASTER_ENCRYPTION_KEY=your_64_hex_characters_here

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# FX Provider (optional — set to 'true' to simulate provider down)
# FX_PROVIDER_DOWN=true
```

Generate `MASTER_ENCRYPTION_KEY`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Test Credentials

```
admin@novapay.com     / Admin@123     role: admin
sender@novapay.com    / Sender@123    role: user
receiver@novapay.com  / Receiver@123  role: user
employer@novapay.com  / Employer@123  role: employer
employee1@novapay.com / Employee@123  role: user  (× 50 employees)
```

Login to get JWT token:
```
POST /api/auth/login
{ "email": "sender@novapay.com", "password": "Sender@123" }
```

---

## API Endpoints

### Auth
```
POST /api/auth/login
```

**Request:**
```json
{ "email": "sender@novapay.com", "password": "Sender@123" }
```
**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGc...",
    "user": { "id": "uuid", "email": "sender@novapay.com", "role": "user" }
  }
}
```

---

### Account Service

**POST /api/accounts** — Create wallet
```json
{ "currency": "USD" }
```

**GET /api/accounts/me** — My accounts
```json
// No body required — userId from JWT token
```

**GET /api/accounts/:id/balance** — Get balance
```json
// No body required
```

**POST /api/accounts/deposit** — Deposit funds
```json
{ "accountId": "uuid", "amount": 1000.00 }
```

---

### Transaction Service

**POST /api/transactions/transfer** — Internal transfer
```json
{
  "idempotencyKey": "{{$guid}}",
  "senderAccountId": "uuid",
  "receiverAccountId": "uuid",
  "amount": 100.00,
  "currency": "USD"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Transfer successful",
  "data": {
    "id": "uuid",
    "amount": "100.00",
    "currency": "USD",
    "status": "completed",
    "type": "transfer"
  }
}
```

**GET /api/transactions/history** — Transaction history

**GET /api/transactions/:id** — Transaction details + ledger entries

**POST /api/transactions/:id/reverse** — Reverse a completed transaction

---

### Ledger Service

**GET /api/ledger/:accountId** — Ledger entries for account

**GET /api/ledger/verify/:transactionId** — Verify double-entry invariant
```json
// Response:
{
  "transactionId": "uuid",
  "totalDebits": "100.00",
  "totalCredits": "100.00",
  "invariantBalance": 0,
  "isValid": true,
  "message": "Double-entry invariant holds — debits equal credits"
}
```

---

### FX Service

**POST /api/fx/quote** — Lock FX rate (60s TTL)
```json
{ "fromCurrency": "USD", "toCurrency": "BDT", "amount": 100.00 }
```
**Response:**
```json
{
  "quoteId": "uuid",
  "rate": "110.45",
  "lockedAmount": "100.00",
  "convertedAmount": 11045.00,
  "expiresAt": "2024-01-01T09:01:00Z",
  "secondsRemaining": 59
}
```

**GET /api/fx/quote/:id** — Check quote validity + time remaining

**POST /api/transfers/international** — Cross-currency transfer
```json
{
  "idempotencyKey": "{{$guid}}",
  "quoteId": "uuid",
  "senderAccountId": "uuid",
  "receiverAccountId": "uuid"
}
```

---

### Payroll Service

**POST /api/payroll/jobs** — Create bulk payroll job
```json
{
  "currency": "USD",
  "recipients": [
    { "accountId": "uuid", "amount": 500.00 },
    { "accountId": "uuid", "amount": 600.00 }
  ]
}
```
**Response:**
```json
{
  "jobId": "uuid",
  "totalAmount": 1100.00,
  "totalRecipients": 2,
  "status": "processing",
  "message": "Payroll job created. 2 payments queued for processing."
}
```

**GET /api/payroll/jobs/:id** — Real-time progress tracking
```json
{
  "jobId": "uuid",
  "status": "processing",
  "totalRecipients": 50,
  "processedCount": 23,
  "failedCount": 0,
  "pendingCount": 27,
  "progressPercent": 46
}
```

**GET /api/payroll/jobs/:id/report** — Completion summary

---

### Admin Service (role: admin only)

**GET /api/admin/users** — All users

**GET /api/admin/audit-logs** — Audit logs

**GET /api/admin/transactions** — All transactions

**GET /api/admin/ledger/health** — System-wide ledger invariant check
```json
{
  "isHealthy": true,
  "totalTransactions": 142,
  "violationCount": 0,
  "message": "✅ Ledger is healthy — all transactions satisfy double-entry invariant"
}
```

**GET /api/admin/payroll/jobs** — All payroll jobs

---

## Idempotency Strategy

Every disbursement request carries an `idempotencyKey` generated by the client. The key is stored in the `idempotency_keys` table with a 24-hour expiry.

**Key format:** Any unique string — UUID recommended (`{{$guid}}` in Postman)
**Scope:** Per request — one key covers one transaction
**Expiry:** 24 hours from first use

| Scenario | Handling |
|---|---|
| A — Same key twice | Second request returns cached response. No second debit. |
| B — Three requests within 100ms | `INSERT ... ON CONFLICT DO NOTHING` — exactly one wins at DB level. Two losers return cached response. |
| C — Crash after debit, before credit | Recovery worker detects stale `processing` records, reverses debit, marks transaction `reversed`. |
| D — Key expires, client retries at 30h | `410 Gone` — key not found. Client must generate new key. No automatic retry. |
| E — Same key, different payload | SHA-256 hash comparison detects mismatch. `409 Conflict` returned immediately. |

**Testing idempotency in Postman:**
```
# Scenario A — send twice with same key
idempotencyKey: "test-duplicate-001"

# Scenario E — same key, different amount
idempotencyKey: "test-duplicate-001", amount: 800  → 409 Conflict
```

---

## Double-Entry Invariant

Every money movement creates exactly two ledger entries — one debit and one credit — inside a single database transaction.

**Invariant:** For any `transaction_id`:
```sql
SELECT SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END)
FROM ledger_entries
WHERE transaction_id = $1;
-- Must always equal 0
```

**How it is enforced:**
1. Ledger entries are written inside the same `BEGIN/COMMIT` block as balance updates
2. The invariant query runs after every write
3. If it returns non-zero, the transaction is rolled back immediately
4. `GET /api/admin/ledger/health` runs this check across all transactions

**The `accounts.balance` column is a cache.** The ledger is the source of truth. A reconciliation function can reconstruct any account balance from ledger entries alone.

---

## Atomicity Strategy

**Problem:** Crash after debit, before credit leaves the ledger unbalanced.

**Solution:** All balance updates and ledger entries run inside a single PostgreSQL transaction:

```
BEGIN
  SELECT balance FROM accounts WHERE id = $1 FOR UPDATE  ← locks row
  UPDATE accounts SET balance = balance - amount          ← debit
  UPDATE accounts SET balance = balance + amount          ← credit
  INSERT INTO ledger_entries (debit entry)
  INSERT INTO ledger_entries (credit entry)
  verify invariant
COMMIT
```

If the server crashes at any point before `COMMIT`, PostgreSQL rolls back the entire transaction. No partial state is possible.

**Recovery worker:** On startup and every 60 seconds, a worker scans for transactions with status `pending` older than 30 seconds. These are crash victims — the worker reverses them and marks them `reversed`.

---

## FX Rate Locking

**Problem:** Rate fetched at 9:00am applied at 10:45am — user loses money.

**Solution:**
1. `POST /api/fx/quote` fetches live rate and locks it for **60 seconds**
2. Quote is stored with `expires_at = NOW() + 60 seconds`
3. Transfer requires a valid, unexpired, unused quote ID
4. Quote is atomically marked `used` in the same transaction as the ledger entries

**Why 60 seconds?** Enough time for user confirmation. Short enough to minimize rate movement risk.

**Single-use enforcement:**
```sql
UPDATE fx_quotes
SET status = 'used'
WHERE id = $1 AND status = 'active' AND expires_at > NOW()
RETURNING *;
-- 0 rows = expired or already used → reject transfer
```

**Provider failure:** If the FX provider is unavailable, `POST /api/fx/quote` returns `503`. A cached rate is **never** silently applied. Test with `FX_PROVIDER_DOWN=true` in `.env`.

---

## Payroll Resumability

**Problem:** Server crashes mid-payroll — 14,000 jobs, 7,000 processed.

**Solution:** BullMQ stores all jobs in Redis. On restart, the worker picks up remaining jobs automatically.

**Checkpoint pattern:**
- Each payroll item has its own `idempotency_key`: `payroll-{jobId}-{recipientAccountId}`
- Before processing, the worker checks if this key was already completed
- Already-completed items are skipped — no duplicate credits
- `processed_count` and `failed_count` track progress in real time

**Why concurrency = 1?**
One payment at a time per employer account prevents thundering herd. 14,000 concurrent debits against the same account would crash the database — exactly what happened in the NovaPay incident.

---

## Audit Hash Chain

The `audit_logs` table records every significant system action with `userId`, `action`, `entity`, `entityId`, and `metadata`.

**Tampered record detection:** In production, each audit log would include a hash of the previous record's content — forming a chain. If any record is modified, all subsequent hashes become invalid. A verification job scans the chain nightly and alerts on any broken link.

For this assessment, the table structure supports this pattern. The hash chain implementation would be added before production deployment.

---

## Trade-offs Under Time Pressure

| Decision | Trade-off |
|---|---|
| Modular monolith over microservices | Cannot scale services independently |
| No Prometheus/Grafana | Metrics not live — config files included |
| No OpenTelemetry tracing | Tracing documented but not wired |
| Access token only, no refresh token | Sessions expire in 15 minutes |
| LIMIT 100 on admin queries | No cursor pagination |
| Mock FX provider | No real exchange rate integration |
| No email notifications | Payroll completion not notified |

---

## What I Would Add Before Production

- Redis for idempotency key storage (reduce PostgreSQL load under extreme concurrency)
- Refresh tokens with httpOnly cookie storage
- Full Prometheus metrics with Grafana dashboards and alert rules
- End-to-end OpenTelemetry tracing to Jaeger
- Real FX provider integration (Open Exchange Rates / Fixer.io)
- Cursor-based pagination on all list endpoints
- Rate limiting per user (not just per IP)
- Audit log hash chain for tamper detection
- Dead letter queue for failed payroll items with admin alerting
- Automated key rotation for `MASTER_ENCRYPTION_KEY`
- Database read replicas for balance reads and ledger queries
- Regulatory audit export (CSV/PDF) for compliance reporting
- Email/SMS notifications for payroll completion and large transfers
- Mutual TLS between internal services