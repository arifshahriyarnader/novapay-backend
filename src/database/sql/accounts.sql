CREATE TABLE
  accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    balance NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
    encrypted_account_number TEXT NOT NULL,
    encrypted_dek TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    CONSTRAINT balance_non_negative CHECK (balance >= 0)
  );

CREATE INDEX idx_accounts_user_id ON accounts (user_id);

CREATE INDEX idx_accounts_currency ON accounts (currency);