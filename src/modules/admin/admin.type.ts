export interface AdminUser {
  id: string;
  email: string;
  role: string;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  metadata: any;
  created_at: Date;
}

export interface LedgerViolation {
  transaction_id: string;
  balance: string;
}

export interface LedgerHealthResponse {
  isHealthy: boolean;
  violations: LedgerViolation[];
}