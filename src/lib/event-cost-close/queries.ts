import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { parseAuthoritativeMoney } from "@/lib/invoices/money";
import { getCurrentRiyadhDate } from "@/lib/reports/filters";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventCostCloseReadResult, EventCostCloseReadinessItem, EventCostCloseSnapshot, EventCostCloseStatus } from "./types";

type Raw = Record<string, unknown>;

function text(value: unknown): string { return typeof value === "string" ? value : ""; }
function nullableText(value: unknown): string | null { const result = text(value); return result || null; }
function money(value: unknown): number { return parseAuthoritativeMoney(value) ?? 0; }
function integer(value: unknown): number { const parsed = Number(value); return Number.isInteger(parsed) ? parsed : 0; }
function object(value: unknown): Raw { return typeof value === "object" && value !== null ? value as Raw : {}; }
function rows(value: unknown): Raw[] { return Array.isArray(value) ? value.filter((row): row is Raw => typeof row === "object" && row !== null) : []; }

function mapItem(row: Raw): EventCostCloseReadinessItem {
  const result: EventCostCloseReadinessItem = { code: text(row.code) };
  if (row.count != null) result.count = integer(row.count);
  if (row.amount != null) result.amount = money(row.amount);
  if (Array.isArray(row.reasons)) result.reasons = row.reasons.filter((value): value is string => typeof value === "string");
  return result;
}

function mapSnapshot(row: Raw): EventCostCloseSnapshot {
  return {
    id: nullableText(row.id) ?? undefined, closeVersion: integer(row.close_version), effectiveDate: text(row.effective_date),
    reason: text(row.reason), closedAt: text(row.closed_at), actualCost: money(row.actual_cost),
    paidCost: money(row.paid_cost), outstandingCost: money(row.outstanding_cost),
    netApprovedCommercialValue: money(row.net_approved_commercial_value),
    finalManagerialEventMargin: money(row.final_managerial_event_margin),
    reopenedAt: nullableText(row.reopened_at), reopenReason: nullableText(row.reopen_reason),
  };
}

function mapStatus(raw: Raw): EventCostCloseStatus {
  const readiness = object(raw.readiness);
  const evidence = object(readiness.source_evidence);
  return {
    readiness: {
      ready: readiness.ready === true, asOfDate: text(readiness.as_of_date),
      blockers: rows(readiness.blockers).map(mapItem), warnings: rows(readiness.warnings).map(mapItem),
      sourceEvidence: {
        pendingServiceReceipts: integer(evidence.pending_service_receipts),
        unresolvedEventCashAdvances: integer(evidence.unresolved_event_cash_advances),
        unresolvedSupplierAdvanceReserves: integer(evidence.unresolved_supplier_advance_reserves),
        pendingExpenseEvidenceExceptions: integer(evidence.pending_expense_evidence_exceptions),
      },
    },
    activeClose: raw.active_close && typeof raw.active_close === "object" ? mapSnapshot(raw.active_close as Raw) : null,
    history: rows(raw.history).map(mapSnapshot),
  };
}

export async function getEventCostCloseStatus(serviceId: string, asOfDate = getCurrentRiyadhDate()): Promise<EventCostCloseReadResult> {
  await requirePermission("supplier_costing:read");
  if (!serviceId) return { status: "error", error: "event_cost_close_service_required" };
  const { data, error } = await (createAdminClient() as any).rpc("get_event_cost_close_status", { // eslint-disable-line @typescript-eslint/no-explicit-any
    p_service_id: serviceId, p_as_of_date: asOfDate,
  });
  const raw = Array.isArray(data) ? data[0] : data;
  if (error || !raw || typeof raw !== "object") {
    console.error("[getEventCostCloseStatus] RPC error:", error?.message);
    return { status: "error", error: "event_cost_close_unavailable" };
  }
  return { status: "success", data: mapStatus(raw as Raw) };
}
