import type { EventCostingCompleteness, EventCostingReasonCode } from "./types";

export interface EventCostingMetricInput {
  baseBudget: number | null;
  contingency: number | null;
  actualCost: number;
  etc: number | null;
  netApprovedCommercialValue: number | null;
}

export interface EventCostingMetricOutput {
  approvedBudgetCost: number | null;
  eac: number | null;
  forecastMargin: number | null;
}

export function calculateEventCostingMetrics(
  input: EventCostingMetricInput,
): EventCostingMetricOutput {
  const approvedBudgetCost =
    input.baseBudget != null && input.contingency != null
      ? roundMoney(input.baseBudget + input.contingency)
      : null;
  const eac = input.etc != null ? roundMoney(input.actualCost + input.etc) : null;
  const forecastMargin =
    input.netApprovedCommercialValue != null && eac != null
      ? roundMoney(input.netApprovedCommercialValue - eac)
      : null;

  return { approvedBudgetCost, eac, forecastMargin };
}

export function parseForecastMargin(value: unknown): number | null {
  let amount: number;
  if (typeof value === "number") {
    amount = value;
  } else if (typeof value === "string") {
    const normalized = value.trim();
    if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
    amount = Number(normalized);
  } else {
    return null;
  }

  if (!Number.isFinite(amount)) return null;
  return Object.is(amount, -0) ? 0 : amount;
}

function isRpcRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRpcUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isSuccessfulRpcEnvelope(value: unknown): value is Record<string, unknown> {
  return (
    isRpcRecord(value) &&
    value.error_code === null &&
    typeof value.idempotent_replay === "boolean"
  );
}

function isNonNegativeRpcMoney(value: unknown): boolean {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(amount) && amount >= 0;
}

export function isEventCostingBudgetRpcSuccess(value: unknown): boolean {
  return (
    isSuccessfulRpcEnvelope(value) &&
    isRpcUuid(value.budget_id) &&
    typeof value.budget_version === "number" &&
    Number.isInteger(value.budget_version) &&
    value.budget_version > 0 &&
    isNonNegativeRpcMoney(value.approved_budget_cost)
  );
}

export function isEventCostingEtcRpcSuccess(value: unknown): boolean {
  return (
    isSuccessfulRpcEnvelope(value) &&
    isRpcUuid(value.forecast_id) &&
    typeof value.forecast_version === "number" &&
    Number.isInteger(value.forecast_version) &&
    value.forecast_version > 0 &&
    isNonNegativeRpcMoney(value.etc_amount)
  );
}

export function deriveCompleteness(input: {
  hasBudget: boolean;
  hasEtc: boolean;
  hasCommercialAuthority: boolean;
  pendingSupplierBills: number;
  pendingEventExpenses: number;
}): { status: EventCostingCompleteness; reasonCodes: EventCostingReasonCode[] } {
  const reasonCodes: EventCostingReasonCode[] = [];
  if (!input.hasBudget) reasonCodes.push("budget_unavailable");
  if (!input.hasEtc) reasonCodes.push("etc_unavailable");
  if (!input.hasCommercialAuthority) {
    reasonCodes.push("commercial_authority_unavailable");
  }
  if (input.pendingSupplierBills > 0) reasonCodes.push("pending_supplier_bills");
  if (input.pendingEventExpenses > 0) reasonCodes.push("pending_event_expenses");

  return {
    status: reasonCodes.length === 0 ? "COMPLETE" : "PARTIAL",
    reasonCodes,
  };
}

export function isEventCostingRequestId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getEventCostingUnavailableReason(raw: unknown): string | null {
  if (typeof raw !== "object" || raw === null) return null;
  const payload = raw as { status?: unknown; reason_codes?: unknown };
  if (typeof payload.status !== "string" || payload.status.toUpperCase() !== "UNAVAILABLE") return null;
  const reasons = Array.isArray(payload.reason_codes)
    ? payload.reason_codes.find((reason): reason is string => typeof reason === "string")
    : null;
  return reasons ?? "event_costing_unavailable";
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
