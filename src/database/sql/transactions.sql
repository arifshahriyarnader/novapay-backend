CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'reversed');

CREATE TYPE transaction_type AS ENUM ('transfer', 'payroll', 'international');

CREATE TABLE
  transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    idempotency_key VARCHAR(255) REFERENCES idempotency_keys (key),
    sender_account_id UUID NOT NULL REFERENCES accounts (id),
    receiver_account_id UUID NOT NULL REFERENCES accounts (id),
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    type transaction_type NOT NULL DEFAULT 'transfer',
    fx_quote_id UUID,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    CONSTRAINT amount_positive CHECK (amount > 0)
  );

CREATE INDEX idx_transactions_sender ON transactions (sender_account_id);

CREATE INDEX idx_transactions_receiver ON transactions (receiver_account_id);

CREATE INDEX idx_transactions_status ON transactions (status);

CREATE INDEX idx_transactions_type ON transactions (type);

CREATE INDEX idx_transactions_idempotency ON transactions (idempotency_key);