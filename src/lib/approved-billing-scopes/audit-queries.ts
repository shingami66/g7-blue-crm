import "server-only";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildAbsLifecycleAuditEventTypeOrFilter,
  mapAbsLifecycleAuditEvent,
  normalizeAbsAuditLimit,
} from "./mappers";
import { APPROVED_BILLING_SCOPE_PERMISSIONS } from "./permissions";
import { isApprovedBillingScopeUuid } from "./queries";
import type {
  AbsLifecycleAuditListData,
  ApprovedBillingScopeReadResult,
} from "./types";
import {
  ABS_LIFECYCLE_AUDIT_DEFAULT_LIMIT,
  ABS_LIFECYCLE_AUDIT_MAX_LIMIT,
  ABS_SCOPE_HISTORY_HARD_LIMIT,
} from "./types";

function canReadApprovedBillingScopeInternalFields(role: string): boolean {
  return role === "admin" || role === "manager";
}

function unexpectedReadResult(): {
  status: "error";
  error: "scope_unexpected_error";
} {
  return { status: "error", error: "scope_unexpected_error" };
}

function invalidIdResult(): {
  status: "error";
  error: "scope_invalid_id";
} {
  return { status: "error", error: "scope_invalid_id" };
}

export type ListAbsLifecycleAuditOptions = {
  limit?: number;
};

type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  timestamp: string;
  details: Record<string, unknown> | null;
};

/**
 * Bounded lifecycle audit events for scopes owned by a Service.
 * Scope-ID discovery is capped at ABS_SCOPE_HISTORY_HARD_LIMIT (same as history).
 * Does not claim complete lifetime history when scopeDiscoveryLimitReached is true.
 */
export async function listApprovedBillingScopeLifecycleAuditEventsForServiceResult(
  serviceId: string,
  options?: ListAbsLifecycleAuditOptions
): Promise<
  ApprovedBillingScopeReadResult<
    AbsLifecycleAuditListData,
    "scope_invalid_id" | "scope_unexpected_error"
  >
> {
  const user = await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.read);
  const canReadInternalNotes = canReadApprovedBillingScopeInternalFields(
    user.role
  );

  if (!isApprovedBillingScopeUuid(serviceId)) {
    return invalidIdResult();
  }

  const limit = normalizeAbsAuditLimit(
    options?.limit,
    ABS_LIFECYCLE_AUDIT_DEFAULT_LIMIT,
    ABS_LIFECYCLE_AUDIT_MAX_LIMIT
  );

  try {
    const supabase = createAdminClient();

    // Fetch cap+1 to detect whether more Service scopes exist than the bound.
    const discoveryFetchLimit = ABS_SCOPE_HISTORY_HARD_LIMIT + 1;
    const { data: scopeRows, error: scopeError } = await supabase
      .from("approved_billing_scopes")
      .select("id")
      .eq("service_id", serviceId)
      .order("scope_version", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(discoveryFetchLimit);

    if (scopeError) {
      console.error(
        "[listApprovedBillingScopeLifecycleAuditEvents] Scope lookup error:",
        scopeError.message
      );
      return unexpectedReadResult();
    }

    const discoveredIds = (scopeRows ?? [])
      .map((row) => row.id as string)
      .filter(Boolean);

    const scopeDiscoveryLimitReached =
      discoveredIds.length > ABS_SCOPE_HISTORY_HARD_LIMIT;
    const scopeIds = scopeDiscoveryLimitReached
      ? discoveredIds.slice(0, ABS_SCOPE_HISTORY_HARD_LIMIT)
      : discoveredIds;

    if (scopeIds.length === 0) {
      return {
        status: "success",
        data: {
          events: [],
          limit,
          scopeDiscoveryLimitReached: false,
          candidateAuditLimitReached: false,
          recognizedEventCount: 0,
        },
      };
    }

    const fetchLimit = limit + 1;
    const eventTypeOrFilter = buildAbsLifecycleAuditEventTypeOrFilter();

    const { data: auditRows, error: auditError } = await supabase
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, user_id, timestamp, details")
      .eq("entity_type", "approved_billing_scope")
      .in("entity_id", scopeIds)
      .or(eventTypeOrFilter)
      .order("timestamp", { ascending: false })
      .order("id", { ascending: false })
      .limit(fetchLimit);

    if (auditError) {
      console.error(
        "[listApprovedBillingScopeLifecycleAuditEvents] Audit error:",
        auditError.message
      );
      return unexpectedReadResult();
    }

    const rows = (auditRows ?? []) as AuditLogRow[];
    const candidateAuditLimitReached = rows.length > limit;
    const limitedRows = candidateAuditLimitReached
      ? rows.slice(0, limit)
      : rows;

    const scopeIdSet = new Set(scopeIds);
    const events = limitedRows
      .filter(
        (row) =>
          row.entity_type === "approved_billing_scope" &&
          scopeIdSet.has(row.entity_id)
      )
      .map((row) =>
        mapAbsLifecycleAuditEvent({
          id: row.id,
          action: row.action,
          entityId: row.entity_id,
          timestamp: row.timestamp,
          userId: row.user_id,
          details: row.details,
          canReadInternalNotes,
        })
      )
      .filter((event): event is NonNullable<typeof event> => event != null);

    return {
      status: "success",
      data: {
        events,
        limit,
        scopeDiscoveryLimitReached,
        candidateAuditLimitReached,
        recognizedEventCount: events.length,
      },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[listApprovedBillingScopeLifecycleAuditEvents] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return unexpectedReadResult();
  }
}
