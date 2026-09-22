export type EventCostingCompleteness = "COMPLETE" | "PARTIAL" | "UNAVAILABLE";

export type EventCostingReasonCode =
  | "budget_unavailable"
  | "etc_unavailable"
  | "commercial_authority_unavailable"
  | "pending_supplier_bills"
  | "pending_event_expenses"
  | "permission_denied"
  | "service_not_found"
  | "source_unavailable";

export interface EventCostingSourceCounts {
  commitments: number;
  supplierBillsApproved: number;
  supplierBillsPending: number;
  eventExpensesApproved: number;
  eventExpensesPending: number;
}

export interface EventCostingBudgetVersion {
  id: string;
  version: number;
  baseBudget: number;
  contingency: number;
  approvedBudgetCost: number;
  approvedAt: string;
  supersededAt: string | null;
}

export interface EventCostingCommitmentDrill {
  id: string;
  authorizedAmount: number;
  acceptedAmount: number;
  pendingAmount: number;
  openCommitmentAmount: number;
  status: string;
  approvedAt: string;
}

export interface EventCostingSupplierBillDrill {
  id: string;
  billNumber: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
}

export interface EventCostingExpenseDrill {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
}

export interface EventCostingEtcVersion {
  id: string;
  version: number;
  etcAmount: number;
  forecastDate: string;
  recordedAt: string;
  supersededAt: string | null;
}

export interface EventCostingPaymentDrill {
  id: string;
  paymentNumber: string;
  supplierBillId: string;
  paymentDate: string;
  amount: number;
  reversed: boolean;
}

export interface EventCostingAdvanceAllocationDrill {
  id: string;
  allocationNumber: string;
  supplierBillId: string;
  allocatedAt: string;
  amount: number;
  reversed: boolean;
}

export interface EventCostingModel {
  serviceId: string;
  asOfDate: string;
  completeness: {
    status: EventCostingCompleteness;
    reasonCodes: EventCostingReasonCode[];
  };
  baseBudget: number | null;
  contingency: number | null;
  approvedBudgetCost: number | null;
  approvedCommitment: number;
  acceptedCommitment: number;
  pendingCommitment: number;
  openCommitment: number;
  actualCost: number;
  paidCost: number;
  outstandingCost: number;
  etc: number | null;
  eac: number | null;
  netApprovedCommercialValue: number | null;
  forecastMargin: number | null;
  commercialAuthority: {
    sourceType: string | null;
    sourceId: string | null;
    sourceVersion: string | null;
  };
  sourceCounts: EventCostingSourceCounts;
  drill: {
    budgetVersions: EventCostingBudgetVersion[];
    commitments: EventCostingCommitmentDrill[];
    supplierBills: EventCostingSupplierBillDrill[];
    eventExpenses: EventCostingExpenseDrill[];
    supplierPayments: EventCostingPaymentDrill[];
    advanceAllocations: EventCostingAdvanceAllocationDrill[];
    etcVersions: EventCostingEtcVersion[];
  };
}

export type EventCostingReadResult =
  | { status: "success"; data: EventCostingModel }
  | { status: "error"; error: string };

export type EventCostingMutationResult =
  | { status: "success"; idempotentReplay: boolean }
  | { status: "error"; error: string };
