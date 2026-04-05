CREATE TABLE
  audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    user_id UUID REFERENCES users (id),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
  );

CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity, entity_id);

CREATE INDEX idx_audit_logs_action ON audit_logs (action);

CREATE INDEX idx_audit_logs_created ON audit_logs (created_at);