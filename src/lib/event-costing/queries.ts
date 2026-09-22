import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { parseAuthoritativeMoney } from "@/lib/invoices/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRiyadhDate } from "@/lib/reports/filters";
import { getEventCostingUnavailableReason, parseForecastMargin } from "./model";
import type {
  EventCostingBudgetVersion,
  EventCostingCommitmentDrill,
  EventCostingEtcVersion,
  EventCostingExpenseDrill,
  EventCostingModel,
  EventCostingPaymentDrill,
  EventCostingAdvanceAllocationDrill,
  EventCostingReadResult,
  EventCostingReasonCode,
  EventCostingSupplierBillDrill,
} from "./types";

type RawEventCosting = Record<string, unknown>;

function eventCostingClient(): any { // eslint-disable-line @typescript-eslint/no-explicit-any
  return createAdminClient();
}

function money(value: unknown): number | null {
  return parseAuthoritativeMoney(value);
}

function requiredMoney(value: unknown, field: string): number {
  const parsed = money(value);
  if (parsed == null) throw new Error(`event_costing_invalid_${field}`);
  return parsed;
}

function requiredForecastMargin(value: unknown): number {
  const parsed = parseForecastMargin(value);
  if (parsed == null) throw new Error("event_costing_invalid_forecast_margin");
  return parsed;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string | null {
  const valueText = text(value);
  return valueText.length > 0 ? valueText : null;
}

function integer(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) ? value : Number(value) || 0;
}

function rawRows(value: unknown): RawEventCosting[] {
  return Array.isArray(value)
    ? value.filter((row): row is RawEventCosting => typeof row === "object" && row !== null)
    : [];
}

function mapModel(raw: RawEventCosting): EventCostingModel {
  const budget = typeof raw.budget === "object" && raw.budget !== null
    ? raw.budget as RawEventCosting
    : {};
  const completeness = typeof raw.completeness === "object" && raw.completeness !== null
    ? raw.completeness as RawEventCosting
    : {};
  const sourceCounts = typeof raw.source_counts === "object" && raw.source_counts !== null
    ? raw.source_counts as RawEventCosting
    : {};
  const commercial = typeof raw.commercial_authority === "object" && raw.commercial_authority !== null
    ? raw.commercial_authority as RawEventCosting
    : {};
  const drill = typeof raw.drill === "object" && raw.drill !== null
    ? raw.drill as RawEventCosting
    : {};

  const budgetVersions: EventCostingBudgetVersion[] = rawRows(drill.budget_versions).map((row) => ({
    id: text(row.id),
    version: integer(row.version),
    baseBudget: requiredMoney(row.base_budget, "budget_base"),
    contingency: requiredMoney(row.contingency, "budget_contingency"),
    approvedBudgetCost: requiredMoney(row.approved_budget_cost, "budget_total"),
    approvedAt: text(row.approved_at),
    supersededAt: nullableText(row.superseded_at),
  }));
  const commitments: EventCostingCommitmentDrill[] = rawRows(drill.commitments).map((row) => ({
    id: text(row.id),
    authorizedAmount: requiredMoney(row.authorized_amount, "commitment_authorized"),
    acceptedAmount: requiredMoney(row.accepted_amount, "commitment_accepted"),
    pendingAmount: requiredMoney(row.pending_amount, "commitment_pending"),
    openCommitmentAmount: requiredMoney(row.open_commitment_amount, "commitment_open"),
    status: text(row.status),
    approvedAt: text(row.approved_at),
  }));
  const supplierBills: EventCostingSupplierBillDrill[] = rawRows(drill.supplier_bills).map((row) => ({
    id: text(row.id),
    billNumber: text(row.bill_number),
    invoiceDate: text(row.invoice_date),
    totalAmount: requiredMoney(row.total_amount, "bill_total"),
    paidAmount: requiredMoney(row.paid_amount, "bill_paid"),
    outstandingAmount: requiredMoney(row.outstanding_amount, "bill_outstanding"),
    status: text(row.status),
  }));
  const eventExpenses: EventCostingExpenseDrill[] = rawRows(drill.event_expenses).map((row) => ({
    id: text(row.id),
    expenseNumber: text(row.expense_number),
    expenseDate: text(row.expense_date),
    amount: requiredMoney(row.amount, "expense_amount"),
    paidAmount: requiredMoney(row.paid_amount, "expense_paid"),
    outstandingAmount: requiredMoney(row.outstanding_amount, "expense_outstanding"),
    status: text(row.status),
  }));
  const etcVersions: EventCostingEtcVersion[] = rawRows(drill.etc_versions).map((row) => ({
    id: text(row.id),
    version: integer(row.version),
    etcAmount: requiredMoney(row.etc_amount, "etc_amount"),
    forecastDate: text(row.forecast_date),
    recordedAt: text(row.recorded_at),
    supersededAt: nullableText(row.superseded_at),
  }));
  const supplierPayments: EventCostingPaymentDrill[] = rawRows(drill.supplier_payments).map((row) => ({
    id: text(row.id),
    paymentNumber: text(row.payment_number),
    supplierBillId: text(row.supplier_bill_id),
    paymentDate: text(row.payment_date),
    amount: requiredMoney(row.amount, "payment_amount"),
    reversed: row.reversed === true,
  }));
  const advanceAllocations: EventCostingAdvanceAllocationDrill[] = rawRows(drill.advance_allocations).map((row) => ({
    id: text(row.id),
    allocationNumber: text(row.allocation_number),
    supplierBillId: text(row.supplier_bill_id),
    allocatedAt: text(row.allocated_at),
    amount: requiredMoney(row.amount, "advance_allocation_amount"),
    reversed: row.reversed === true,
  }));

  const status = text(completeness.status || raw.status).toUpperCase();
  const allowedStatus: EventCostingModel["completeness"]["status"] =
    status === "COMPLETE" || status === "UNAVAILABLE" ? status : "PARTIAL";
  const reasonCodes = Array.isArray(completeness.reason_codes)
    ? completeness.reason_codes.filter((code): code is EventCostingReasonCode => typeof code === "string")
    : [];

  return {
    serviceId: text(raw.service_id),
    asOfDate: text(raw.as_of_date),
    completeness: { status: allowedStatus, reasonCodes },
    baseBudget: budget.base_budget == null ? null : requiredMoney(budget.base_budget, "budget_base"),
    contingency: budget.contingency == null ? null : requiredMoney(budget.contingency, "budget_contingency"),
    approvedBudgetCost: budget.approved_budget_cost == null ? null : requiredMoney(budget.approved_budget_cost, "budget_total"),
    approvedCommitment: requiredMoney(raw.approved_commitment, "approved_commitment"),
    acceptedCommitment: requiredMoney(raw.accepted_commitment, "accepted_commitment"),
    pendingCommitment: requiredMoney(raw.pending_commitment, "pending_commitment"),
    openCommitment: requiredMoney(raw.open_commitment, "open_commitment"),
    actualCost: requiredMoney(raw.actual_cost, "actual_cost"),
    paidCost: requiredMoney(raw.paid_cost, "paid_cost"),
    outstandingCost: requiredMoney(raw.outstanding_cost, "outstanding_cost"),
    etc: raw.etc == null ? null : requiredMoney(raw.etc, "etc"),
    eac: raw.eac == null ? null : requiredMoney(raw.eac, "eac"),
    netApprovedCommercialValue: raw.net_approved_commercial_value == null ? null : requiredMoney(raw.net_approved_commercial_value, "commercial"),
    forecastMargin: raw.forecast_margin == null ? null : requiredForecastMargin(raw.forecast_margin),
    commercialAuthority: {
      sourceType: nullableText(commercial.source_type),
      sourceId: nullableText(commercial.source_id),
      sourceVersion: nullableText(commercial.source_version),
    },
    sourceCounts: {
      commitments: integer(sourceCounts.commitments),
      supplierBillsApproved: integer(sourceCounts.supplier_bills_approved),
      supplierBillsPending: integer(sourceCounts.supplier_bills_pending),
      eventExpensesApproved: integer(sourceCounts.event_expenses_approved),
      eventExpensesPending: integer(sourceCounts.event_expenses_pending),
    },
    drill: { budgetVersions, commitments, supplierBills, eventExpenses, supplierPayments, advanceAllocations, etcVersions },
  };
}

export async function getEventCostingResult(
  serviceId: string,
  asOfDate = getCurrentRiyadhDate(),
): Promise<EventCostingReadResult> {
  await requirePermission("supplier_costing:read");
  if (!serviceId) return { status: "error", error: "event_costing_service_required" };

  const { data, error } = await eventCostingClient().rpc("get_event_costing", {
    p_service_id: serviceId,
    p_as_of_date: asOfDate,
  });
  if (error) {
    console.error("[getEventCostingResult] Event Costing RPC error:", error.message);
    return { status: "error", error: "event_costing_unavailable" };
  }

  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw || typeof raw !== "object") {
    return { status: "error", error: "event_costing_unavailable" };
  }
  const unavailableReason = getEventCostingUnavailableReason(raw);
  if (unavailableReason) return { status: "error", error: unavailableReason };
  const model = mapModel(raw as RawEventCosting);
  if (model.completeness.reasonCodes.includes("service_not_found")) {
    return { status: "error", error: "service_not_found" };
  }
  return { status: "success", data: model };
}
