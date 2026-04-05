CREATE TYPE payroll_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE
  payroll_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    employer_account_id UUID NOT NULL REFERENCES accounts (id),
    total_amount NUMERIC(18, 2) NOT NULL,
    total_recipients INTEGER NOT NULL,
    processed_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    status payroll_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    CONSTRAINT total_recipients_positive CHECK (total_recipients > 0)
  );

CREATE INDEX idx_payroll_jobs_employer ON payroll_jobs (employer_account_id);

CREATE INDEX idx_payroll_jobs_status ON payroll_jobs (status);