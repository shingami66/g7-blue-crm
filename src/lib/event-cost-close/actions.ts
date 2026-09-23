"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { EVENT_COST_CLOSE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { createAdminClient } from "@/lib/supabase/admin";

type RpcRow = { error_code?: unknown; close_id?: unknown; reopen_id?: unknown } | undefined;
function reason(value: FormDataEntryValue | null): string | null { if (typeof value !== "string") return null; const normalized = value.trim(); return normalized.length >= 5 && normalized.length <= 2000 ? normalized : null; }
function requestId(value: FormDataEntryValue | null): string | null { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null; }
function errorCode(row: RpcRow, fallback: string): string { return typeof row?.error_code === "string" && row.error_code ? row.error_code : fallback; }
function success(serviceId: string, result: string): never { redirect(`/services/${serviceId}/costing?result=${encodeURIComponent(result)}`); }
function failure(serviceId: string, error: string): never { redirect(`/services/${serviceId}/costing?error=${encodeURIComponent(error)}`); }

export async function closeEventCost(serviceId: string, formData: FormData): Promise<never> {
  const actor = await requirePermission(EVENT_COST_CLOSE_PERMISSIONS.close);
  const closeReason = reason(formData.get("reason")); const closeRequestId = requestId(formData.get("requestId"));
  if (!serviceId || !closeReason || !closeRequestId) failure(serviceId, "event_cost_close_request_invalid");
  const { data, error } = await (createAdminClient() as any).rpc("close_event_cost", { // eslint-disable-line @typescript-eslint/no-explicit-any
    p_service_id: serviceId, p_reason: closeReason, p_request_id: closeRequestId, p_actor_id: actor.id, p_actor_role: actor.role,
  });
  const row = (Array.isArray(data) ? data[0] : data) as RpcRow;
  if (error || !row || typeof row.close_id !== "string") { if (error) console.error("[closeEventCost] RPC error:", error.message); failure(serviceId, errorCode(row, "event_cost_close_unavailable")); }
  success(serviceId, "event_cost_closed");
}

export async function reopenEventCost(serviceId: string, formData: FormData): Promise<never> {
  const actor = await requirePermission(EVENT_COST_CLOSE_PERMISSIONS.reopen);
  const reopenReason = reason(formData.get("reason")); const reopenRequestId = requestId(formData.get("requestId"));
  if (!serviceId || !reopenReason || !reopenRequestId) failure(serviceId, "event_cost_reopen_request_invalid");
  const { data, error } = await (createAdminClient() as any).rpc("reopen_event_cost", { // eslint-disable-line @typescript-eslint/no-explicit-any
    p_service_id: serviceId, p_reason: reopenReason, p_request_id: reopenRequestId, p_actor_id: actor.id, p_actor_role: actor.role,
  });
  const row = (Array.isArray(data) ? data[0] : data) as RpcRow;
  if (error || !row || typeof row.reopen_id !== "string") { if (error) console.error("[reopenEventCost] RPC error:", error.message); failure(serviceId, errorCode(row, "event_cost_reopen_unavailable")); }
  success(serviceId, "event_cost_reopened");
}
