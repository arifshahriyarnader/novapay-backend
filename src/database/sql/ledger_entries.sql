CREATE TYPE ledger_entry_type AS ENUM ('debit', 'credit');

CREATE TABLE
  ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    transaction_id UUID NOT NULL REFERENCES transactions (id),
    account_id UUID NOT NULL REFERENCES accounts (id),
    type ledger_entry_type NOT NULL,
    amount NUMERIC(18, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    fx_rate NUMERIC(18, 8),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    CONSTRAINT ledger_amount_positive CHECK (amount > 0)
  );

CREATE INDEX idx_ledger_transaction_id ON ledger_entries (transaction_id);

CREATE INDEX idx_ledger_account_id ON ledger_entries (account_id);

CREATE INDEX idx_ledger_type ON ledger_entries (type);

CREATE INDEX idx_ledger_created_at ON ledger_entries (created_at);