CREATE TYPE idempotency_status AS ENUM ('processing', 'completed', 'failed');

CREATE TABLE
  idempotency_keys (
    key VARCHAR(255) PRIMARY KEY,
    payload_hash VARCHAR(64) NOT NULL,
    status idempotency_status NOT NULL DEFAULT 'processing',
    response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    expires_at TIMESTAMPTZ NOT NULL
  );

CREATE INDEX idx_idempotency_expires_at ON idempotency_keys (expires_at);

CREATE INDEX idx_idempotency_status ON idempotency_keys (status);