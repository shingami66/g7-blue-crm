import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type ServiceActivityEvent = {
  id: string;
  timestamp: string;
  actorDisplay: string | null;
  actorKind: "user" | "system" | "unknown";
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  lifecycleDimension: string | null;
  fromState: string | null;
  toState: string | null;
  gateBasis: string | null;
  evidenceRef: string | null;
  reason: string | null;
  trigger: string | null;
  invoiceId: string | null;
  paymentId: string | null;
  paymentNumber: string | null;
  amount: number | null;
};

type ActorRecord = {
  clerk_user_id: string;
  name: string | null;
  email: string | null;
};

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function auditAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return null;
}

function resolveActor(
  userId: string | null,
  actorsById: ReadonlyMap<string, ActorRecord>,
): Pick<ServiceActivityEvent, "actorDisplay" | "actorKind"> {
  if (!userId) return { actorDisplay: null, actorKind: "system" };

  const actor = actorsById.get(userId);
  if (!actor) return { actorDisplay: null, actorKind: "unknown" };

  const actorDisplay = optionalString(actor.name) ?? optionalString(actor.email);
  if (!actorDisplay) return { actorDisplay: null, actorKind: "unknown" };

  return {
    actorDisplay,
    actorKind: "user",
  };
}

export async function listServiceActivity(serviceId: string): Promise<{
  success: boolean;
  events: ServiceActivityEvent[];
}> {
  await requirePermission("services:read");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, timestamp, user_id, details")
      .eq("entity_type", "service")
      .eq("entity_id", serviceId)
      .order("timestamp", { ascending: false })
      .order("id", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[listServiceActivity] Audit lookup error:", error.message);
      return { success: false, events: [] };
    }

    const rows = data ?? [];
    const actorIds = Array.from(new Set(
      rows
        .map((row) => optionalString(row.user_id))
        .filter((userId): userId is string => userId !== null),
    ));
    const actorsById = new Map<string, ActorRecord>();

    if (actorIds.length > 0) {
      const { data: actorRows, error: actorError } = await supabase
        .from("app_users")
        .select("clerk_user_id, name, email")
        .in("clerk_user_id", actorIds);

      if (actorError) {
        console.error("[listServiceActivity] Actor lookup error:", actorError.message);
      } else {
        for (const actor of (actorRows ?? []) as ActorRecord[]) {
          actorsById.set(actor.clerk_user_id, actor);
        }
      }
    }

    const events = rows.map((row) => {
      const details = row.details && typeof row.details === "object"
        ? row.details as Record<string, unknown>
        : {};
      const userId = optionalString(row.user_id);
      return {
        id: String(row.id),
        timestamp: String(row.timestamp),
        ...resolveActor(userId, actorsById),
        eventType: optionalString(details.event_type) ?? "service_event",
        fromStatus: optionalString(details.from_status),
        toStatus: optionalString(details.to_status),
        lifecycleDimension: optionalString(details.dimension),
        fromState: optionalString(details.from_state),
        toState: optionalString(details.to_state),
        gateBasis: optionalString(details.gate_basis),
        evidenceRef: optionalString(details.evidence_ref),
        reason: optionalString(details.reason),
        trigger: optionalString(details.trigger),
        invoiceId: optionalString(details.invoice_id),
        paymentId: optionalString(details.payment_id),
        paymentNumber: optionalString(details.payment_number),
        amount: auditAmount(details.amount),
      } satisfies ServiceActivityEvent;
    });

    return { success: true, events };
  } catch (error) {
    console.error(
      "[listServiceActivity] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { success: false, events: [] };
  }
}
