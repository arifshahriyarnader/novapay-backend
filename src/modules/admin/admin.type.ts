export interface AdminUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: object;
  ipAddress: string;
  created_at: Date;
}

export interface LedgerHealthResult {
  isHealthy: boolean;
  totalTransactions: number;
  violationCount: number;
  violations: object[];
  checkedAt: Date;
  message: string;
}
