import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceStatus } from "@/types/service";
import {
  mapLegacyServiceStatus,
  type ServiceLifecycleState,
} from "./lifecycle";

const LIFECYCLE_SELECT = [
  "service_id",
  "legacy_status",
  "commercial_state",
  "payment_state",
  "readiness_state",
  "execution_state",
  "completion_state",
  "close_state",
  "start_gate_basis",
  "state_version",
].join(", ");

function mapProjectionRow(
  row: Record<string, unknown>,
): ServiceLifecycleState | null {
  if (
    typeof row.service_id !== "string" ||
    typeof row.legacy_status !== "string" ||
    typeof row.commercial_state !== "string" ||
    typeof row.payment_state !== "string" ||
    typeof row.readiness_state !== "string" ||
    typeof row.execution_state !== "string" ||
    typeof row.completion_state !== "string" ||
    typeof row.close_state !== "string" ||
    (row.start_gate_basis !== null && typeof row.start_gate_basis !== "string") ||
    typeof row.state_version !== "number"
  ) {
    return null;
  }

  return {
    serviceId: row.service_id,
    legacyStatus: row.legacy_status as ServiceStatus,
    commercialState: row.commercial_state as ServiceLifecycleState["commercialState"],
    paymentState: row.payment_state as ServiceLifecycleState["paymentState"],
    readinessState: row.readiness_state as ServiceLifecycleState["readinessState"],
    executionState: row.execution_state as ServiceLifecycleState["executionState"],
    completionState: row.completion_state as ServiceLifecycleState["completionState"],
    closeState: row.close_state as ServiceLifecycleState["closeState"],
    startGateBasis: row.start_gate_basis as ServiceLifecycleState["startGateBasis"],
    stateVersion: row.state_version,
    source: "projection",
  };
}

export async function getServiceLifecycleState(
  serviceId: string,
  legacyStatus: ServiceStatus,
): Promise<ServiceLifecycleState> {
  await requirePermission("services:read");
  const fallback = mapLegacyServiceStatus(serviceId, legacyStatus);

  try {
    const { data, error } = await createAdminClient()
      .from("service_lifecycle_states")
      .select(LIFECYCLE_SELECT)
      .eq("service_id", serviceId)
      .maybeSingle();

    if (error || !data) {
      if (error && error.code !== "42P01") {
        console.error("[getServiceLifecycleState] Projection lookup error:", error.message);
      }
      return fallback;
    }

    return mapProjectionRow(data as unknown as Record<string, unknown>) ?? fallback;
  } catch (error) {
    console.error(
      "[getServiceLifecycleState] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return fallback;
  }
}
