CREATE TYPE payroll_item_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE
  payroll_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    job_id UUID NOT NULL REFERENCES payroll_jobs (id),
    receiver_account_id UUID NOT NULL REFERENCES accounts (id),
    amount NUMERIC(18, 2) NOT NULL,
    status payroll_item_status NOT NULL DEFAULT 'pending',
    idempotency_key VARCHAR(255) UNIQUE,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    CONSTRAINT payroll_item_amount_positive CHECK (amount > 0)
  );

CREATE INDEX idx_payroll_items_job_id ON payroll_items (job_id);

CREATE INDEX idx_payroll_items_status ON payroll_items (status);