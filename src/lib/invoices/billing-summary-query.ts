import "server-only";

import { requirePermission } from "../auth/permissions.ts";
import { SERVICE_BILLING_SUMMARY_PERMISSIONS } from "../auth/role-permissions.ts";
import { createAdminClient } from "../supabase/admin.ts";
import { applyApplicableServiceInvoiceExposurePredicate } from "./exposure.ts";
import { computeServiceBillingSummary } from "./billing-state.ts";
import type { ServiceBillingSummary } from "./types";

type SummaryScopeRow = {
  status: string;
  accepted_grand_total: unknown;
  source_quotation_id: string;
  superseded_at: string | null;
  voided_at: string | null;
};

type SummaryQuotationRow = {
  id: string;
  grand_total: unknown;
};

type SummaryInvoiceRow = {
  grand_total: unknown;
};

type BillingDatasetResult<Row> = {
  rows: Row[];
  hasError: boolean;
};

function unavailableSummary(serviceId: string): ServiceBillingSummary {
  return computeServiceBillingSummary({
    serviceId,
    scopes: [],
    quotations: [],
    invoices: [],
    hasScopesError: true,
  });
}

/**
 * Reads only the aggregate values approved for Service Detail billing awareness.
 * Permission checks intentionally precede admin-client construction.
 */
export async function getServiceBillingSummary(
  serviceId: string,
): Promise<ServiceBillingSummary> {
  await requirePermission("services:read");
  await requirePermission(SERVICE_BILLING_SUMMARY_PERMISSIONS.read);

  if (!serviceId) {
    return unavailableSummary(serviceId);
  }

  const supabase = createAdminClient();
  const PAGE_SIZE = 500;

  try {
    const fetchScopes = async (): Promise<BillingDatasetResult<SummaryScopeRow>> => {
      const rows: SummaryScopeRow[] = [];
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("approved_billing_scopes")
          .select("status, accepted_grand_total, source_quotation_id, superseded_at, voided_at")
          .eq("service_id", serviceId)
          .order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error || !Array.isArray(data)) return { rows, hasError: true };
        if (data.length === 0) return { rows, hasError: false };
        for (const row of data) rows.push(row as SummaryScopeRow);
        offset += data.length;
      }
    };

    const fetchQuotations = async (): Promise<BillingDatasetResult<SummaryQuotationRow>> => {
      const rows: SummaryQuotationRow[] = [];
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("quotations")
          .select("id, grand_total")
          .eq("service_id", serviceId)
          .eq("status", "approved")
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error || !Array.isArray(data)) return { rows, hasError: true };
        if (data.length === 0) return { rows, hasError: false };
        for (const row of data) rows.push(row as SummaryQuotationRow);
        offset += data.length;
      }
    };

    const fetchInvoices = async (): Promise<BillingDatasetResult<SummaryInvoiceRow>> => {
      const rows: SummaryInvoiceRow[] = [];
      let offset = 0;
      while (true) {
        const query = applyApplicableServiceInvoiceExposurePredicate(
          supabase
            .from("invoices")
            .select("grand_total")
            .order("created_at", { ascending: false })
            .order("id", { ascending: true }),
          serviceId,
        ) as unknown as {
          range: (from: number, to: number) => Promise<{
            data: unknown[] | null;
            error: unknown;
          }>;
        };
        const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);
        if (error || !Array.isArray(data)) return { rows, hasError: true };
        if (data.length === 0) return { rows, hasError: false };
        for (const row of data) rows.push(row as SummaryInvoiceRow);
        offset += data.length;
      }
    };

    const [scopesResult, quotationsResult, invoicesResult] = await Promise.all([
      fetchScopes(),
      fetchQuotations(),
      fetchInvoices(),
    ]);

    return computeServiceBillingSummary({
      serviceId,
      scopes: scopesResult.rows,
      quotations: quotationsResult.rows,
      invoices: invoicesResult.rows,
      hasScopesError: scopesResult.hasError,
      hasQuotationsError: quotationsResult.hasError,
      hasInvoicesError: invoicesResult.hasError,
    });
  } catch (error) {
    console.error(
      "[getServiceBillingSummary] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return unavailableSummary(serviceId);
  }
}
