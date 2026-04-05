CREATE TYPE fx_quote_status AS ENUM ('active', 'used', 'expired');

CREATE TABLE
  fx_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID NOT NULL REFERENCES users (id),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(18, 8) NOT NULL,
    locked_amount NUMERIC(18, 2) NOT NULL,
    status fx_quote_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    expires_at TIMESTAMPTZ NOT NULL
  );

CREATE INDEX idx_fx_quotes_user_id ON fx_quotes (user_id);

CREATE INDEX idx_fx_quotes_status ON fx_quotes (status);

CREATE INDEX idx_fx_quotes_expires_at ON fx_quotes (expires_at);