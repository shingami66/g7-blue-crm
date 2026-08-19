import "server-only";
import { createAdminClient } from "../supabase/admin.ts";
import {
  parseAuthoritativeMoney,
  sumAuthoritativeMoney,
} from "./money.ts";
import {
  applyApplicableServiceInvoiceExposureFilters,
  applyApplicableServiceInvoiceExposurePredicate,
} from "./exposure.ts";
import type {
  BillingInvoiceSummary,
  ServiceBillingAuthorityMode,
  ServiceBillingState,
} from "./types";

type ScopeRow = {
  id: string;
  service_id?: string;
  status: string;
  accepted_grand_total: unknown;
  source_quotation_id: string;
  superseded_at: string | null;
  voided_at: string | null;
};

type QuotationRow = {
  id: string;
  service_id?: string;
  quotation_number: string;
  grand_total: unknown;
  status?: string;
  created_at?: string;
};

type InvoiceRow = {
  id: string;
  service_id?: string;
  invoice_number: string;
  invoice_type: string;
  status: string;
  grand_total: unknown;
  created_at?: string;
  issued_at?: string | null;
};

function isActiveApprovedScope(scope: ScopeRow): boolean {
  return (
    scope.status === "approved" &&
    scope.superseded_at == null &&
    scope.voided_at == null
  );
}

export function createDefaultBillingState(serviceId: string): ServiceBillingState {
  return {
    serviceId: serviceId || "",
    authorityMode: "unavailable",
    approvedQuotation: null,
    billingCeiling: null,
    activeBillingScopeId: null,
    depositInvoice: null,
    finalInvoice: null,
    activePriorInvoiceTotal: null,
    remainingUninvoicedAmount: null,
    canCreateDepositInvoice: false,
    canCreateFinalInvoice: false,
    disabledReasons: [],
  };
}

export function failBillingState(
  state: ServiceBillingState,
  reason: string,
): ServiceBillingState {
  return {
    ...state,
    authorityMode: "unavailable",
    billingCeiling: null,
    activeBillingScopeId: null,
    activePriorInvoiceTotal: null,
    remainingUninvoicedAmount: null,
    canCreateDepositInvoice: false,
    canCreateFinalInvoice: false,
    disabledReasons: [reason],
  };
}

export function mapInvoiceSummary(
  invoice: InvoiceRow,
  invoiceType: "deposit" | "final",
): BillingInvoiceSummary {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    invoiceType,
    status: invoice.status,
    amount: parseAuthoritativeMoney(invoice.grand_total),
  };
}

export function computeServiceBillingState({
  serviceId,
  scopes,
  quotations,
  invoices,
  hasScopesError = false,
  hasQuotationsError = false,
  hasInvoicesError = false,
}: {
  serviceId: string;
  scopes: ScopeRow[];
  quotations: QuotationRow[];
  invoices: InvoiceRow[];
  hasScopesError?: boolean;
  hasQuotationsError?: boolean;
  hasInvoicesError?: boolean;
}): ServiceBillingState {
  const state = createDefaultBillingState(serviceId);

  if (!serviceId) {
    return failBillingState(state, "missing_service_id");
  }

  if (hasScopesError) {
    return failBillingState(state, "billing_state_unavailable");
  }

  const activeScopes = scopes.filter(isActiveApprovedScope);
  if (activeScopes.length > 1) {
    return failBillingState(state, "billing_state_unavailable");
  }

  const activeScope = activeScopes[0] ?? null;
  const hasAbsHistory = scopes.length > 0;

  if (hasQuotationsError) {
    return failBillingState(state, "billing_state_unavailable");
  }

  const approvedQuotationRow =
    quotations.length > 0
      ? activeScope
        ? quotations.find(
            (quotation) => quotation.id === activeScope.source_quotation_id,
          ) ?? quotations[0]
        : quotations[0]
      : null;

  if (approvedQuotationRow) {
    state.approvedQuotation = {
      id: approvedQuotationRow.id,
      quotationNumber: approvedQuotationRow.quotation_number,
      status: "approved",
      grandTotal: parseAuthoritativeMoney(
        approvedQuotationRow.grand_total,
      ),
    };

    if (state.approvedQuotation.grandTotal == null) {
      return failBillingState(state, "billing_state_unavailable");
    }
  }

  let authorityMode: ServiceBillingAuthorityMode;
  let billingCeiling: number | null = null;

  if (activeScope) {
    billingCeiling = parseAuthoritativeMoney(
      activeScope.accepted_grand_total,
    );
    if (billingCeiling == null) {
      return failBillingState(state, "billing_state_unavailable");
    }

    authorityMode = "active_abs";
    state.activeBillingScopeId = activeScope.id;
  } else if (hasAbsHistory) {
    authorityMode = "historical_abs_only";
    state.disabledReasons.push("abs_historical_authority_no_active");
  } else if (state.approvedQuotation) {
    authorityMode = "legacy_quotation";
    billingCeiling = state.approvedQuotation.grandTotal;
  } else {
    authorityMode = "no_authority";
    state.disabledReasons.push("approved_quotation_required");
  }

  state.authorityMode = authorityMode;
  state.billingCeiling = billingCeiling;

  const depositInvoices = invoices.filter(
    (invoice) => invoice.invoice_type === "deposit",
  );
  const finalInvoices = invoices.filter(
    (invoice) => invoice.invoice_type === "final",
  );

  if (depositInvoices.length > 0) {
    state.depositInvoice = mapInvoiceSummary(depositInvoices[0], "deposit");
    if (depositInvoices.length > 1) {
      state.disabledReasons.push("duplicate_active_deposit_invoices");
    }
  }

  if (finalInvoices.length > 0) {
    state.finalInvoice = mapInvoiceSummary(finalInvoices[0], "final");
    if (finalInvoices.length > 1) {
      state.disabledReasons.push("duplicate_active_final_invoices");
    }
  }

  if (hasInvoicesError) {
    console.error(
      "[computeServiceBillingState] Error fetching invoices: Invoice exposure unavailable",
    );
    state.disabledReasons.push("invoice_exposure_unavailable");
    return state;
  }

  const invoiceExposure = sumAuthoritativeMoney(
    invoices.map((row) => row.grand_total),
  );

  if (invoiceExposure == null) {
    state.disabledReasons.push("invoice_exposure_unavailable");
    return state;
  }

  state.activePriorInvoiceTotal = invoiceExposure;

  if (billingCeiling != null) {
    state.remainingUninvoicedAmount = Math.max(
      0,
      billingCeiling - invoiceExposure,
    );

    if (invoiceExposure > billingCeiling) {
      state.disabledReasons.push(
        authorityMode === "active_abs"
          ? "prior_invoices_exceed_billing_scope_ceiling"
          : "prior_invoices_exceed_quotation_total",
      );
    }
  }

  if (state.depositInvoice) {
    state.disabledReasons.push("deposit_invoice_already_exists");
  }

  if (state.finalInvoice) {
    state.disabledReasons.push("final_invoice_already_exists");
  }

  const canBill =
    authorityMode === "active_abs" || authorityMode === "legacy_quotation";
  if (!canBill || state.remainingUninvoicedAmount == null) {
    return state;
  }

  state.canCreateDepositInvoice = state.disabledReasons.length === 0;
  const finalBlockers = state.disabledReasons.filter(
    (reason) => reason !== "deposit_invoice_already_exists",
  );
  state.canCreateFinalInvoice = finalBlockers.length === 0;

  return state;
}

export async function getBatchServiceBillingStates(
  serviceIds: string[],
): Promise<Map<string, ServiceBillingState>> {
  const result = new Map<string, ServiceBillingState>();
  if (serviceIds.length === 0) {
    return result;
  }

  const uniqueIds = Array.from(new Set(serviceIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return result;
  }

  const supabase = createAdminClient();

  try {
    let hasScopesError = false;
    let hasQuotationsError = false;
    let hasInvoicesError = false;
    const PAGE_SIZE = 500;

    const fetchScopes = async () => {
      const allRows: ScopeRow[] = [];
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("approved_billing_scopes")
          .select("id, service_id, status, accepted_grand_total, source_quotation_id, superseded_at, voided_at")
          .in("service_id", uniqueIds)
          .order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error || !Array.isArray(data)) {
          hasScopesError = true;
          break;
        }
        if (data.length === 0) break;

        for (const row of data) allRows.push(row as ScopeRow);
        offset += data.length;
      }
      return allRows;
    };

    const fetchQuotations = async () => {
      const allRows: QuotationRow[] = [];
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from("quotations")
          .select("id, service_id, quotation_number, status, grand_total, created_at")
          .in("service_id", uniqueIds)
          .eq("status", "approved")
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error || !Array.isArray(data)) {
          hasQuotationsError = true;
          break;
        }
        if (data.length === 0) break;

        for (const row of data) allRows.push(row as QuotationRow);
        offset += data.length;
      }
      return allRows;
    };

    const fetchInvoices = async () => {
      const allRows: InvoiceRow[] = [];
      let offset = 0;
      while (true) {
        const query = applyApplicableServiceInvoiceExposureFilters(
          supabase
            .from("invoices")
            .select("id, service_id, invoice_number, invoice_type, status, grand_total, created_at, issued_at")
            .in("service_id", uniqueIds),
        ) as unknown as {
          order: (column: string, options: { ascending: boolean }) => {
            order: (column: string, options: { ascending: boolean }) => {
              range: (from: number, to: number) => Promise<{ data: unknown[] | null; error: unknown }>;
            };
          };
        };
        const { data, error } = await query
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error || !Array.isArray(data)) {
          hasInvoicesError = true;
          break;
        }
        if (data.length === 0) break;

        for (const row of data) allRows.push(row as InvoiceRow);
        offset += data.length;
      }
      return allRows;
    };

    const [scopesData, quotationsData, invoicesData] = await Promise.all([
      fetchScopes(),
      fetchQuotations(),
      fetchInvoices(),
    ]);

    const scopesByService = new Map<string, ScopeRow[]>();
    for (const row of scopesData as Array<ScopeRow & { service_id: string }>) {
      const list = scopesByService.get(row.service_id) ?? [];
      list.push(row);
      scopesByService.set(row.service_id, list);
    }

    const quotationsByService = new Map<string, QuotationRow[]>();
    for (const row of quotationsData as Array<QuotationRow & { service_id: string }>) {
      const list = quotationsByService.get(row.service_id) ?? [];
      list.push(row);
      quotationsByService.set(row.service_id, list);
    }

    const invoicesByService = new Map<string, InvoiceRow[]>();
    for (const row of invoicesData as Array<InvoiceRow & { service_id: string }>) {
      const list = invoicesByService.get(row.service_id) ?? [];
      list.push(row);
      invoicesByService.set(row.service_id, list);
    }

    for (const id of uniqueIds) {
      const state = computeServiceBillingState({
        serviceId: id,
        scopes: scopesByService.get(id) ?? [],
        quotations: quotationsByService.get(id) ?? [],
        invoices: invoicesByService.get(id) ?? [],
        hasScopesError,
        hasQuotationsError,
        hasInvoicesError,
      });
      result.set(id, state);
    }
  } catch (err) {
    console.error("[getBatchServiceBillingStates] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    for (const id of uniqueIds) {
      result.set(id, failBillingState(createDefaultBillingState(id), "billing_state_unavailable"));
    }
  }

  return result;
}

export async function getServiceBillingState(
  serviceId: string,
): Promise<ServiceBillingState> {
  const state = createDefaultBillingState(serviceId);

  if (!serviceId) {
    return failBillingState(state, "missing_service_id");
  }

  const supabase = createAdminClient();

  try {
    const PAGE_SIZE = 500;

    let scopesError = false;
    const scopeRows: ScopeRow[] = [];
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("approved_billing_scopes")
        .select("id, status, accepted_grand_total, source_quotation_id, superseded_at, voided_at")
        .eq("service_id", serviceId)
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error || !Array.isArray(data)) { scopesError = true; break; }
      if (data.length === 0) break;
      for (const row of data) scopeRows.push(row as ScopeRow);
      offset += data.length;
    }

    if (scopesError) {
      return failBillingState(state, "billing_state_unavailable");
    }

    let quotationsError = false;
    const quotationRows: QuotationRow[] = [];
    offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("quotations")
        .select("id, quotation_number, status, grand_total, created_at")
        .eq("service_id", serviceId)
        .eq("status", "approved")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error || !Array.isArray(data)) { quotationsError = true; break; }
      if (data.length === 0) break;
      for (const row of data) quotationRows.push(row as QuotationRow);
      offset += data.length;
    }

    if (quotationsError) {
      return failBillingState(state, "billing_state_unavailable");
    }

    let invoicesError = false;
    const invoiceRows: InvoiceRow[] = [];
    offset = 0;
    while (true) {
      const query = applyApplicableServiceInvoiceExposurePredicate(
        supabase
          .from("invoices")
          .select("id, invoice_number, invoice_type, status, grand_total, created_at, issued_at")
          .order("created_at", { ascending: false })
          .order("id", { ascending: true }),
        serviceId,
      ) as unknown as { range: (from: number, to: number) => Promise<{ data: unknown[] | null; error: unknown }> };
      const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1);

      if (error || !Array.isArray(data)) { invoicesError = true; break; }
      if (data.length === 0) break;
      for (const row of data) invoiceRows.push(row as InvoiceRow);
      offset += data.length;
    }

    return computeServiceBillingState({
      serviceId,
      scopes: scopeRows,
      quotations: quotationRows,
      invoices: invoiceRows,
      hasScopesError: scopesError,
      hasQuotationsError: quotationsError,
      hasInvoicesError: invoicesError,
    });
  } catch (error) {
    console.error(
      "[getServiceBillingState] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return failBillingState(state, "billing_state_unavailable");
  }
}
