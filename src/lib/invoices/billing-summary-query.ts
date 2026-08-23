import "server-only";

import { requirePermission } from "../auth/permissions.ts";
import { SERVICE_BILLING_SUMMARY_PERMISSIONS } from "../auth/role-permissions.ts";
import { createAdminClient } from "../supabase/admin.ts";
import { parseAuthoritativeMoney } from "./money.ts";
import type { ServiceBillingSummary } from "./types";

const AUTHORITY_RPC = "_p6_get_service_billing_authority";
const EXPOSURE_RPC = "_p6_get_service_billing_exposure";

type AggregateRpcResponse = {
  data: unknown;
  error: unknown;
};

type AggregateRpcClient = {
  rpc: (
    functionName: typeof AUTHORITY_RPC | typeof EXPOSURE_RPC,
    args: { p_service_id: string },
  ) => Promise<AggregateRpcResponse>;
};

type AuthorityRead =
  | { status: "available"; billingCeiling: number | null }
  | { status: "unavailable" };

type ExposureRead =
  | { status: "available"; total: number }
  | { status: "unavailable" };

function unavailableSummary(): ServiceBillingSummary {
  return {
    billingCeiling: null,
    activePriorInvoiceTotal: null,
    remainingUninvoicedAmount: null,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwnValue(
  value: Record<string, unknown>,
  propertyName: string,
): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);
  return descriptor !== undefined && "value" in descriptor;
}

function singleAggregateRow(response: AggregateRpcResponse): Record<string, unknown> | null {
  if (
    response.error !== null ||
    !Array.isArray(response.data) ||
    response.data.length !== 1 ||
    !isPlainObject(response.data[0])
  ) {
    return null;
  }

  return response.data[0];
}

function parseAuthorityRead(response: AggregateRpcResponse): AuthorityRead {
  const row = singleAggregateRow(response);
  if (
    !row ||
    !hasOwnValue(row, "authority_status") ||
    !hasOwnValue(row, "billing_ceiling") ||
    typeof row.authority_status !== "string"
  ) {
    return { status: "unavailable" };
  }

  if (row.authority_status === "unavailable") {
    return { status: "unavailable" };
  }

  if (
    row.authority_status === "historical_abs_only" ||
    row.authority_status === "no_authority"
  ) {
    return row.billing_ceiling === null
      ? { status: "available", billingCeiling: null }
      : { status: "unavailable" };
  }

  if (
    row.authority_status !== "active_abs" &&
    row.authority_status !== "legacy_quotation"
  ) {
    return { status: "unavailable" };
  }

  const billingCeiling = parseAuthoritativeMoney(row.billing_ceiling);
  return billingCeiling == null
    ? { status: "unavailable" }
    : { status: "available", billingCeiling };
}

function parseApplicableInvoiceCount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }

  return null;
}

function parseExposureRead(response: AggregateRpcResponse): ExposureRead {
  const row = singleAggregateRow(response);
  if (
    !row ||
    !hasOwnValue(row, "exposure_status") ||
    !hasOwnValue(row, "applicable_invoice_count") ||
    !hasOwnValue(row, "lifetime_invoice_total") ||
    typeof row.exposure_status !== "string"
  ) {
    return { status: "unavailable" };
  }

  if (row.exposure_status === "unavailable") {
    return { status: "unavailable" };
  }

  if (row.exposure_status !== "ready") {
    return { status: "unavailable" };
  }

  const count = parseApplicableInvoiceCount(row.applicable_invoice_count);
  const total = parseAuthoritativeMoney(row.lifetime_invoice_total);
  return count == null || total == null
    ? { status: "unavailable" }
    : { status: "available", total };
}

function composeSummary(
  authority: AuthorityRead,
  exposure: ExposureRead,
): ServiceBillingSummary {
  if (authority.status === "unavailable") {
    return unavailableSummary();
  }

  if (exposure.status === "unavailable") {
    return {
      billingCeiling: authority.billingCeiling,
      activePriorInvoiceTotal: null,
      remainingUninvoicedAmount: null,
    };
  }

  return {
    billingCeiling: authority.billingCeiling,
    activePriorInvoiceTotal: exposure.total,
    remainingUninvoicedAmount:
      authority.billingCeiling == null
        ? null
        : Math.max(0, authority.billingCeiling - exposure.total),
  };
}

/**
 * Reads only the aggregate values approved for Service Detail billing awareness.
 * Permission checks intentionally precede admin-client construction. The two
 * bounded RPC calls remain independent so an exposure failure cannot erase a
 * valid billing ceiling, while authority failure still closes every money field.
 */
export async function getServiceBillingSummary(
  serviceId: string,
): Promise<ServiceBillingSummary> {
  await requirePermission("services:read");
  await requirePermission(SERVICE_BILLING_SUMMARY_PERMISSIONS.read);

  if (!serviceId) {
    return unavailableSummary();
  }

  const supabase = createAdminClient() as unknown as AggregateRpcClient;

  try {
    const [authorityResponse, exposureResponse] = await Promise.all([
      supabase.rpc(AUTHORITY_RPC, { p_service_id: serviceId }),
      supabase.rpc(EXPOSURE_RPC, { p_service_id: serviceId }),
    ]);

    return composeSummary(
      parseAuthorityRead(authorityResponse),
      parseExposureRead(exposureResponse),
    );
  } catch (error) {
    console.error(
      "[getServiceBillingSummary] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return unavailableSummary();
  }
}
