CREATE TYPE ledger_account_type AS ENUM ('asset', 'liability', 'revenue');

CREATE TABLE
  ledger_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    name VARCHAR(100) NOT NULL UNIQUE,
    type ledger_account_type NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
  );


INSERT INTO
  ledger_accounts (name, type, description)
VALUES
  (
    'novapay_fee_account',
    'revenue',
    'NovaPay collects transaction fees here'
  ),
  (
    'novapay_suspense',
    'liability',
    'Holds funds during incomplete transactions'
  ),
  ('novapay_float', 'asset', 'System float account');