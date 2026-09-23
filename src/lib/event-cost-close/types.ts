export interface EventCostCloseReadinessItem {
  code: string;
  count?: number;
  amount?: number;
  reasons?: string[];
}

export interface EventCostCloseReadiness {
  ready: boolean;
  asOfDate: string;
  blockers: EventCostCloseReadinessItem[];
  warnings: EventCostCloseReadinessItem[];
  sourceEvidence: {
    pendingServiceReceipts: number;
    unresolvedEventCashAdvances: number;
    unresolvedSupplierAdvanceReserves: number;
    pendingExpenseEvidenceExceptions: number;
  };
}

export interface EventCostCloseSnapshot {
  id?: string;
  closeVersion: number;
  effectiveDate: string;
  reason: string;
  closedAt: string;
  actualCost: number;
  paidCost: number;
  outstandingCost: number;
  netApprovedCommercialValue: number;
  finalManagerialEventMargin: number;
  reopenedAt: string | null;
  reopenReason: string | null;
}

export interface EventCostCloseStatus {
  readiness: EventCostCloseReadiness;
  activeClose: EventCostCloseSnapshot | null;
  history: EventCostCloseSnapshot[];
}

export type EventCostCloseReadResult =
  | { status: "success"; data: EventCostCloseStatus }
  | { status: "error"; error: string };
