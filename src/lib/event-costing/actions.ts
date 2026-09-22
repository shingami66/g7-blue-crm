"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { parseAuthoritativeMoney } from "@/lib/invoices/money";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isEventCostingBudgetRpcSuccess,
  isEventCostingEtcRpcSuccess,
  isEventCostingRequestId,
} from "./model";

type EventCostingRpcRow = { error_code?: unknown } | undefined;

function requiredText(value: FormDataEntryValue | null, minimumLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= minimumLength ? normalized : null;
}

function parseWriteMoney(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const parsed = parseAuthoritativeMoney(value.trim());
  return parsed != null && parsed <= 999999999999.99 ? parsed : null;
}

function rpcErrorCode(row: EventCostingRpcRow): string | null {
  return typeof row?.error_code === "string" && row.error_code.trim().length > 0
    ? row.error_code
    : null;
}

function redirectWithResult(serviceId: string, result: "budget_saved" | "etc_saved" | string): never {
  redirect(`/services/${serviceId}/costing?result=${encodeURIComponent(result)}`);
}

function redirectWithError(serviceId: string, error: string): never {
  redirect(`/services/${serviceId}/costing?error=${encodeURIComponent(error)}`);
}

export async function approveEventCostBudget(
  serviceId: string,
  formData: FormData,
): Promise<never> {
  const actor = await requirePermission("supplier_costing:write");
  const baseBudgetAmount = parseWriteMoney(formData.get("baseBudgetAmount"));
  const contingencyAmount = parseWriteMoney(formData.get("contingencyAmount"));
  const reason = requiredText(formData.get("reason"), 5);
  const notes = requiredText(formData.get("notes"), 1);
  const sourceReference = requiredText(formData.get("sourceReference"), 1);
  const requestId = formData.get("requestId");

  if (
    !serviceId ||
    baseBudgetAmount == null ||
    contingencyAmount == null ||
    baseBudgetAmount + contingencyAmount > 999999999999.99 ||
    !reason
    || !isEventCostingRequestId(requestId)
  ) {
    redirectWithError(serviceId, "event_cost_budget_request_invalid");
  }

  const { data, error } = await (createAdminClient() as any).rpc( // eslint-disable-line @typescript-eslint/no-explicit-any
    "approve_event_cost_budget",
    {
      p_service_id: serviceId,
      p_base_budget_amount: baseBudgetAmount,
      p_contingency_amount: contingencyAmount,
      p_reason: reason,
      p_notes: notes,
      p_source_reference: sourceReference,
      p_request_id: requestId,
      p_actor_id: actor.id,
      p_actor_role: actor.role,
    },
  );
  if (error) {
    console.error("[approveEventCostBudget] RPC error:", error.message);
    redirectWithError(serviceId, "event_cost_budget_unavailable");
  }

  const row = (Array.isArray(data) ? data[0] : data) as EventCostingRpcRow;
  if (!isEventCostingBudgetRpcSuccess(row)) {
    redirectWithError(serviceId, rpcErrorCode(row) ?? "event_cost_budget_unavailable");
  }
  return redirectWithResult(serviceId, "budget_saved");
}

export async function recordEventCostEtc(
  serviceId: string,
  formData: FormData,
): Promise<never> {
  const actor = await requirePermission("supplier_costing:write");
  const etcAmount = parseWriteMoney(formData.get("etcAmount"));
  const forecastDate = requiredText(formData.get("forecastDate"), 10);
  const reason = requiredText(formData.get("reason"), 5);
  const notes = requiredText(formData.get("notes"), 1);
  const requestId = formData.get("requestId");

  if (!serviceId || etcAmount == null || !forecastDate || !/^\d{4}-\d{2}-\d{2}$/.test(forecastDate) || !reason || !isEventCostingRequestId(requestId)) {
    redirectWithError(serviceId, "event_cost_etc_request_invalid");
  }

  const { data, error } = await (createAdminClient() as any).rpc( // eslint-disable-line @typescript-eslint/no-explicit-any
    "record_event_cost_etc",
    {
      p_service_id: serviceId,
      p_etc_amount: etcAmount,
      p_forecast_date: forecastDate,
      p_reason: reason,
      p_notes: notes,
      p_request_id: requestId,
      p_actor_id: actor.id,
      p_actor_role: actor.role,
    },
  );
  if (error) {
    console.error("[recordEventCostEtc] RPC error:", error.message);
    redirectWithError(serviceId, "event_cost_etc_unavailable");
  }

  const row = (Array.isArray(data) ? data[0] : data) as EventCostingRpcRow;
  if (!isEventCostingEtcRpcSuccess(row)) {
    redirectWithError(serviceId, rpcErrorCode(row) ?? "event_cost_etc_unavailable");
  }
  return redirectWithResult(serviceId, "etc_saved");
}
