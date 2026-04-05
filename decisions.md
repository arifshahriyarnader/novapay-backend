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

*More decisions will be added as each feature is implemented.*