import type {
  ApprovedBillingScope,
  ApprovedBillingScopeDetail,
  ApprovedBillingScopeItem,
  ApprovedBillingScopeItemRow,
  ApprovedBillingScopeReadMaskingOptions,
  ApprovedBillingScopeRow,
  ApprovedBillingScopeSummary,
} from "./types";

function toNumber(value: number | string): number {
  return Number(value);
}

function isActiveApprovedScope(row: {
  status: string;
  superseded_at: string | null;
  voided_at: string | null;
}): boolean {
  return (
    row.status === "approved" &&
    row.superseded_at === null &&
    row.voided_at === null
  );
}

export function mapApprovedBillingScopeRow(
  row: ApprovedBillingScopeRow
): ApprovedBillingScope {
  return {
    id: row.id,
    serviceId: row.service_id,
    sourceQuotationId: row.source_quotation_id,
    scopeVersion: row.scope_version,
    status: row.status,
    acceptedSubtotal: toNumber(row.accepted_subtotal),
    acceptedVatAmount: toNumber(row.accepted_vat_amount),
    acceptedGrandTotal: toNumber(row.accepted_grand_total),
    sourceVatRate: toNumber(row.source_vat_rate),
    sourceDiscount: toNumber(row.source_discount),
    sourceCurrency: row.source_currency,
    sourceQuotationSubtotal: toNumber(row.source_quotation_subtotal),
    sourceQuotationVatAmount: toNumber(row.source_quotation_vat_amount),
    sourceQuotationGrandTotal: toNumber(row.source_quotation_grand_total),
    sourcePricingContext: row.source_pricing_context,
    lineSafetyStatus: row.line_safety_status,
    lineSafetyReasonCode: row.line_safety_reason_code,
    lineSafetyNote: row.line_safety_note,
    lineSafetyReviewedBy: row.line_safety_reviewed_by,
    lineSafetyReviewedAt: row.line_safety_reviewed_at,
    changeSummaryReason: row.change_summary_reason,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    supersededAt: row.superseded_at,
    supersededByScopeId: row.superseded_by_scope_id,
    voidedAt: row.voided_at,
    voidedBy: row.voided_by,
    voidReason: row.void_reason,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapApprovedBillingScopeItemRow(
  row: ApprovedBillingScopeItemRow
): ApprovedBillingScopeItem {
  return {
    id: row.id,
    approvedBillingScopeId: row.approved_billing_scope_id,
    sourceQuotationId: row.source_quotation_id,
    sourceQuotationItemId: row.source_quotation_item_id,
    displayOrder: row.display_order,
    decision: row.decision,
    sourceDescription: row.source_description,
    sourceDetails: row.source_details,
    sourceCategory: row.source_category,
    sourceQty: toNumber(row.source_qty),
    sourceUnitPrice: toNumber(row.source_unit_price),
    sourceSubtotal: toNumber(row.source_subtotal),
    sourceVatAmount: toNumber(row.source_vat_amount),
    sourceGrandTotal: toNumber(row.source_grand_total),
    acceptedQty: toNumber(row.accepted_qty),
    acceptedUnitPrice: toNumber(row.accepted_unit_price),
    acceptedSubtotal: toNumber(row.accepted_subtotal),
    acceptedVatAmount: toNumber(row.accepted_vat_amount),
    acceptedGrandTotal: toNumber(row.accepted_grand_total),
    reasonCode: row.reason_code,
    reasonNote: row.reason_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapApprovedBillingScopeSummaryRow(
  row: ApprovedBillingScopeRow
): ApprovedBillingScopeSummary {
  return {
    id: row.id,
    serviceId: row.service_id,
    sourceQuotationId: row.source_quotation_id,
    scopeVersion: row.scope_version,
    status: row.status,
    lineSafetyStatus: row.line_safety_status,
    acceptedGrandTotal: toNumber(row.accepted_grand_total),
    isActiveApprovedScope: isActiveApprovedScope(row),
    approvedAt: row.approved_at,
    supersededAt: row.superseded_at,
    voidedAt: row.voided_at,
  };
}

export function applyApprovedBillingScopeReadMasking(
  detail: ApprovedBillingScopeDetail,
  options: ApprovedBillingScopeReadMaskingOptions = {}
): ApprovedBillingScopeDetail {
  if (options.canReadInternalNotes) {
    return detail;
  }

  return {
    ...detail,
    lineSafetyReasonCode: null,
    lineSafetyNote: null,
    changeSummaryReason: null,
    voidReason: null,
    items: detail.items.map((item) => ({
      ...item,
      reasonCode: null,
      reasonNote: null,
    })),
  };
}

