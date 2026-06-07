export type AuditAction = "create" | "update" | "delete" | "restore" | "status_change" | "payment_recorded";

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  timestamp: string;
  userId: string;
  details?: Record<string, unknown>;
}
