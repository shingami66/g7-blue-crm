import type { ApprovedBillingScopeSummary } from "./types";

/** Display-only effective status. Does not invent a DB `superseded` status value. */
export type AbsCardEffectiveStatus = "draft" | "active" | "superseded" | "voided";

export type AbsCardScenario =
  | "unavailable"
  | "no_approved_quotation"
  | "legacy_quotation_only"
  | "draft_only"
  | "active"
  | "active_with_draft"
  | "historical_only";

export type AbsCardMoneyField =
  | { kind: "value"; amount: number }
  | { kind: "unavailable" }
  | { kind: "hidden" };

export type AbsCardScopePick = {
  primary: ApprovedBillingScopeSummary | null;
  active: ApprovedBillingScopeSummary | null;
  draft: ApprovedBillingScopeSummary | null;
  otherScopeCount: number;
  historyCount: number;
  hasDraftRevision: boolean;
  effectiveStatus: AbsCardEffectiveStatus | null;
};

export type AbsCardBillingSnapshot = {
  approvedQuotationId: string | null;
  approvedQuotationNumber: string | null;
  /** Server-derived ceiling used for invoicing when active ABS exists, else QT total. */
  billingCeiling: number | null;
  activePriorInvoiceTotal: number | null;
  remainingUninvoicedAmount: number | null;
  billingUnavailable: boolean;
  hasApprovedQuotation: boolean;
};

/**
 * Derive the UI effective status for an ABS summary row.
 * Status rules match the locked management design (timestamp supersession, not a DB enum).
 */
export function deriveAbsCardEffectiveStatus(scope: {
  status: string;
  supersededAt: string | null;
  voidedAt: string | null;
  isActiveApprovedScope?: boolean;
}): AbsCardEffectiveStatus {
  if (scope.status === "draft") {
    return "draft";
  }

  if (scope.status === "voided" || scope.voidedAt != null) {
    return "voided";
  }

  if (scope.supersededAt != null) {
    return "superseded";
  }

  if (scope.status === "approved") {
    return "active";
  }

  // Defensive fallback for unexpected rows — never invent a fourth DB status.
  return "voided";
}

/**
 * Pick primary display scope: active preferred, else draft, else newest historical.
 * List input is expected newest-first (scope_version desc) from list query.
 */
export function pickAbsCardScopes(
  scopes: ApprovedBillingScopeSummary[],
): AbsCardScopePick {
  const active =
    scopes.find((scope) => scope.isActiveApprovedScope) ??
    scopes.find(
      (scope) =>
        scope.status === "approved" &&
        scope.supersededAt == null &&
        scope.voidedAt == null,
    ) ??
    null;

  const draft = scopes.find((scope) => scope.status === "draft") ?? null;
  const primary = active ?? draft ?? scopes[0] ?? null;
  const otherScopeCount = Math.max(0, scopes.length - (primary ? 1 : 0));
  const historyCount = scopes.filter((scope) => {
    if (scope.id === primary?.id) return false;
    if (scope.status === "draft") return false;
    return true;
  }).length;

  return {
    primary,
    active,
    draft,
    otherScopeCount,
    historyCount,
    hasDraftRevision: active != null && draft != null,
    effectiveStatus: primary ? deriveAbsCardEffectiveStatus(primary) : null,
  };
}

export function resolveAbsCardScenario(input: {
  scopesLoadError: boolean;
  scopes: ApprovedBillingScopeSummary[];
  hasApprovedQuotation: boolean;
}): AbsCardScenario {
  if (input.scopesLoadError) {
    return "unavailable";
  }

  const pick = pickAbsCardScopes(input.scopes);

  if (pick.active && pick.draft) {
    return "active_with_draft";
  }
  if (pick.active) {
    return "active";
  }
  if (pick.draft && input.scopes.every((s) => s.status === "draft" || s.id === pick.draft?.id)) {
    // Draft present and no active — may also have historical rows
    if (input.scopes.some((s) => s.status !== "draft")) {
      // Draft + historical only (no active)
      return "draft_only";
    }
    return "draft_only";
  }
  if (pick.draft) {
    return "draft_only";
  }
  if (input.scopes.length > 0) {
    return "historical_only";
  }
  if (input.hasApprovedQuotation) {
    return "legacy_quotation_only";
  }
  return "no_approved_quotation";
}

export function resolveSourceQuotationNumber(input: {
  sourceQuotationId: string | null | undefined;
  quotationNumbersById: Readonly<Record<string, string>>;
  billingQuotation: { id: string; quotationNumber: string } | null;
}): string | null {
  const { sourceQuotationId, quotationNumbersById, billingQuotation } = input;
  if (sourceQuotationId && quotationNumbersById[sourceQuotationId]) {
    return quotationNumbersById[sourceQuotationId];
  }
  if (
    sourceQuotationId &&
    billingQuotation &&
    billingQuotation.id === sourceQuotationId
  ) {
    return billingQuotation.quotationNumber;
  }
  if (!sourceQuotationId && billingQuotation) {
    return billingQuotation.quotationNumber;
  }
  return null;
}

/**
 * Map server billing-state fields into card money fields.
 * Does not recompute ceilings or remaining amounts client-side.
 */
export function resolveAbsCardMoneyFields(input: {
  scenario: AbsCardScenario;
  primary: ApprovedBillingScopeSummary | null;
  billing: AbsCardBillingSnapshot;
  canReadInvoices: boolean;
}): {
  ceiling: AbsCardMoneyField;
  invoiced: AbsCardMoneyField;
  remaining: AbsCardMoneyField;
  usesLegacyQuotationAuthority: boolean;
} {
  const { scenario, primary, billing, canReadInvoices } = input;

  const ceilingFromPrimary =
    primary != null
      ? ({ kind: "value", amount: primary.acceptedGrandTotal } as const)
      : null;

  const ceilingFromBilling =
    billing.billingCeiling != null
      ? ({ kind: "value", amount: billing.billingCeiling } as const)
      : null;

  let ceiling: AbsCardMoneyField = { kind: "unavailable" };
  let usesLegacyQuotationAuthority = false;

  switch (scenario) {
    case "active":
    case "active_with_draft":
      ceiling = ceilingFromPrimary ?? ceilingFromBilling ?? { kind: "unavailable" };
      break;
    case "draft_only":
      ceiling = ceilingFromPrimary ?? { kind: "unavailable" };
      usesLegacyQuotationAuthority = billing.hasApprovedQuotation;
      break;
    case "legacy_quotation_only":
      ceiling = ceilingFromBilling ?? { kind: "unavailable" };
      usesLegacyQuotationAuthority = true;
      break;
    case "historical_only":
      // Historical ceiling is informational only — not current billing authority.
      ceiling = ceilingFromPrimary ?? { kind: "unavailable" };
      usesLegacyQuotationAuthority = billing.hasApprovedQuotation;
      break;
    case "no_approved_quotation":
    case "unavailable":
      ceiling = { kind: "unavailable" };
      break;
  }

  if (!canReadInvoices) {
    return {
      ceiling,
      invoiced: { kind: "hidden" },
      remaining: { kind: "hidden" },
      usesLegacyQuotationAuthority,
    };
  }

  if (billing.billingUnavailable) {
    return {
      ceiling,
      invoiced: { kind: "unavailable" },
      remaining: { kind: "unavailable" },
      usesLegacyQuotationAuthority,
    };
  }

  // Invoice totals only meaningful when a billing ceiling authority exists (ABS or QT).
  const hasInvoiceAuthority =
    scenario === "active" ||
    scenario === "active_with_draft" ||
    scenario === "legacy_quotation_only" ||
    (scenario === "draft_only" && billing.hasApprovedQuotation) ||
    (scenario === "historical_only" && billing.hasApprovedQuotation);

  if (!hasInvoiceAuthority) {
    return {
      ceiling,
      invoiced: { kind: "unavailable" },
      remaining: { kind: "unavailable" },
      usesLegacyQuotationAuthority,
    };
  }

  if (
    billing.activePriorInvoiceTotal == null ||
    billing.remainingUninvoicedAmount == null
  ) {
    return {
      ceiling,
      invoiced: { kind: "unavailable" },
      remaining: { kind: "unavailable" },
      usesLegacyQuotationAuthority,
    };
  }

  return {
    ceiling,
    invoiced: { kind: "value", amount: billing.activePriorInvoiceTotal },
    remaining: { kind: "value", amount: billing.remainingUninvoicedAmount },
    usesLegacyQuotationAuthority,
  };
}

export function buildAbsCardBillingSnapshot(input: {
  approvedQuotation: {
    id: string;
    quotationNumber: string;
    grandTotal: number;
  } | null;
  activePriorInvoiceTotal: number;
  remainingUninvoicedAmount: number;
  disabledReasons: readonly string[];
}): AbsCardBillingSnapshot {
  const billingUnavailable = input.disabledReasons.includes(
    "billing_state_unavailable",
  );

  return {
    approvedQuotationId: input.approvedQuotation?.id ?? null,
    approvedQuotationNumber: input.approvedQuotation?.quotationNumber ?? null,
    billingCeiling: input.approvedQuotation
      ? input.approvedQuotation.grandTotal
      : null,
    activePriorInvoiceTotal: billingUnavailable
      ? null
      : input.activePriorInvoiceTotal,
    remainingUninvoicedAmount: billingUnavailable
      ? null
      : input.remainingUninvoicedAmount,
    billingUnavailable,
    hasApprovedQuotation: input.approvedQuotation != null,
  };
}
