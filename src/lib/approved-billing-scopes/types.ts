import type { ApprovedBillingScopeErrorCode } from "./errors";
import type { ApprovedBillingScopePermission } from "./permissions";

export const APPROVED_BILLING_SCOPE_STATUSES = [
  "draft",
  "approved",
  "voided",
] as const;

export type ApprovedBillingScopeStatus =
  (typeof APPROVED_BILLING_SCOPE_STATUSES)[number];

export const APPROVED_BILLING_SCOPE_LINE_SAFETY_STATUSES = [
  "pending_review",
  "safe",
  "unsafe",
] as const;

export type ApprovedBillingScopeLineSafetyStatus =
  (typeof APPROVED_BILLING_SCOPE_LINE_SAFETY_STATUSES)[number];

export const APPROVED_BILLING_SCOPE_ITEM_DECISIONS = [
  "accepted",
  "adjusted",
  "excluded",
  "customer_supplied",
] as const;

export type ApprovedBillingScopeItemDecision =
  (typeof APPROVED_BILLING_SCOPE_ITEM_DECISIONS)[number];

export const APPROVED_BILLING_SCOPE_REASON_CODES = [
  "customer_reduced_quantity",
  "customer_reduced_price",
  "customer_removed_item",
  "customer_supplied",
  "internal_scope_correction",
  "source_pricing_issue",
  "unsafe_line_item",
  "other",
] as const;

export type ApprovedBillingScopeReasonCode =
  (typeof APPROVED_BILLING_SCOPE_REASON_CODES)[number];

export interface ApprovedBillingScopeRow {
  id: string;
  service_id: string;
  source_quotation_id: string;
  scope_version: number;
  status: ApprovedBillingScopeStatus;
  accepted_subtotal: number | string;
  accepted_vat_amount: number | string;
  accepted_grand_total: number | string;
  source_vat_rate: number | string;
  source_discount: number | string;
  source_currency: string;
  source_quotation_subtotal: number | string;
  source_quotation_vat_amount: number | string;
  source_quotation_grand_total: number | string;
  source_pricing_context: Record<string, unknown>;
  line_safety_status: ApprovedBillingScopeLineSafetyStatus;
  line_safety_reason_code: ApprovedBillingScopeReasonCode | null;
  line_safety_note: string | null;
  line_safety_reviewed_by: string | null;
  line_safety_reviewed_at: string | null;
  change_summary_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  superseded_at: string | null;
  superseded_by_scope_id: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovedBillingScopeItemRow {
  id: string;
  approved_billing_scope_id: string;
  source_quotation_id: string;
  source_quotation_item_id: string;
  display_order: number;
  decision: ApprovedBillingScopeItemDecision;
  source_description: string;
  source_details: string | null;
  source_category: string | null;
  source_qty: number | string;
  source_unit_price: number | string;
  source_subtotal: number | string;
  source_vat_amount: number | string;
  source_grand_total: number | string;
  accepted_qty: number | string;
  accepted_unit_price: number | string;
  accepted_subtotal: number | string;
  accepted_vat_amount: number | string;
  accepted_grand_total: number | string;
  reason_code: ApprovedBillingScopeReasonCode | null;
  reason_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovedBillingScopeRowWithItems
  extends ApprovedBillingScopeRow {
  approved_billing_scope_items?: ApprovedBillingScopeItemRow[] | null;
}

export interface ApprovedBillingScope {
  id: string;
  serviceId: string;
  sourceQuotationId: string;
  scopeVersion: number;
  status: ApprovedBillingScopeStatus;
  acceptedSubtotal: number;
  acceptedVatAmount: number;
  acceptedGrandTotal: number;
  sourceVatRate: number;
  sourceDiscount: number;
  sourceCurrency: string;
  sourceQuotationSubtotal: number;
  sourceQuotationVatAmount: number;
  sourceQuotationGrandTotal: number;
  sourcePricingContext: Record<string, unknown>;
  lineSafetyStatus: ApprovedBillingScopeLineSafetyStatus;
  lineSafetyReasonCode: ApprovedBillingScopeReasonCode | null;
  lineSafetyNote: string | null;
  lineSafetyReviewedBy: string | null;
  lineSafetyReviewedAt: string | null;
  changeSummaryReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  supersededAt: string | null;
  supersededByScopeId: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedBillingScopeDetail extends ApprovedBillingScope {
  items: ApprovedBillingScopeItem[];
  isActiveApprovedScope: boolean;
}

export interface ApprovedBillingScopeItem {
  id: string;
  approvedBillingScopeId: string;
  sourceQuotationId: string;
  sourceQuotationItemId: string;
  displayOrder: number;
  decision: ApprovedBillingScopeItemDecision;
  sourceDescription: string;
  sourceDetails: string | null;
  sourceCategory: string | null;
  sourceQty: number;
  sourceUnitPrice: number;
  sourceSubtotal: number;
  sourceVatAmount: number;
  sourceGrandTotal: number;
  acceptedQty: number;
  acceptedUnitPrice: number;
  acceptedSubtotal: number;
  acceptedVatAmount: number;
  acceptedGrandTotal: number;
  reasonCode: ApprovedBillingScopeReasonCode | null;
  reasonNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedBillingScopeSummary {
  id: string;
  serviceId: string;
  sourceQuotationId: string;
  scopeVersion: number;
  status: ApprovedBillingScopeStatus;
  lineSafetyStatus: ApprovedBillingScopeLineSafetyStatus;
  acceptedGrandTotal: number;
  isActiveApprovedScope: boolean;
  approvedAt: string | null;
  supersededAt: string | null;
  voidedAt: string | null;
}

export type ApprovedBillingScopeReadMaskingOptions = {
  canReadInternalNotes?: boolean;
};

export type ApprovedBillingScopeListOptions = {
  status?: ApprovedBillingScopeStatus;
};

export type ApprovedBillingScopeReadErrorCode =
  | "scope_not_found"
  | "scope_duplicate_draft"
  | "scope_unexpected_error";

export type ApprovedBillingScopeReadResult<
  T,
  E extends ApprovedBillingScopeReadErrorCode =
    | "scope_not_found"
    | "scope_unexpected_error"
> =
  | {
      status: "success";
      data: T;
    }
  | ("scope_not_found" extends E
      ? {
          status: "not_found";
          data: null;
          error: "scope_not_found";
        }
      : never)
  | ("scope_duplicate_draft" extends E
      ? {
          status: "error";
          error: "scope_duplicate_draft";
        }
      : never)
  | ("scope_unexpected_error" extends E
      ? {
          status: "error";
          error: "scope_unexpected_error";
        }
      : never);

export interface ApprovedBillingScopeActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: ApprovedBillingScopeErrorCode;
}

export type {
  ApprovedBillingScopePermission,
  ApprovedBillingScopeErrorCode,
};
