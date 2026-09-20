import type {
  QuotationItemRow,
  QuotationListItem,
  QuotationItem,
  QuotationDetail,
  QuotationDetailRow,
  QuotationRowWithRelations,
} from "./types";

export function mapRowToQuotationListItem(row: QuotationRowWithRelations): QuotationListItem {
  const mutationPayload = row.mutation_payload;
  const isApprovedCommercialAmendment =
    typeof mutationPayload === "object" &&
    mutationPayload !== null &&
    (mutationPayload as { operation?: unknown }).operation === "approved_commercial_amendment_creation";
  return {
    id: row.id,
    quotationNumber: row.quotation_number,
    serviceId: row.service_id,
    service: row.services ? {
      serviceNumber: row.services.service_number,
      serviceTitle: row.services.service_title,
      status: row.services.status,
      eventName: row.services.event_name,
    } : undefined,
    customerId: row.customer_id,
    customer: row.customers ? {
      company: row.customers.company,
      contact: row.customers.contact,
    } : undefined,
    event: row.event,
    date: row.date,
    validUntil: row.valid_until,
    grandTotal: Number(row.grand_total),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    quotationFamilyId: row.quotation_family_id,
    revisionOfQuotationId: row.revision_of_quotation_id ?? null,
    revisionNumber: row.revision_number,
    revisionReason: row.revision_reason ?? null,
    supersededAt: row.superseded_at ?? null,
    supersededByQuotationId: row.superseded_by_quotation_id ?? null,
    isApprovedCommercialAmendment,
    eventSnapshot: row.event_snapshot ?? null,
    snapshotSeller: row.snapshot_seller,
    snapshotBuyer: row.snapshot_buyer,
  };
}

export function mapRowToQuotationItem(row: QuotationItemRow): QuotationItem {
  return {
    id: row.id,
    quotationId: row.quotation_id,
    description: row.description,
    details: row.details,
    category: row.category,
    qty: Number(row.qty),
    unitPrice: Number(row.unit_price),
    vat: Number(row.vat),
    total: Number(row.total),
    commercialRole: row.commercial_role,
    parentAuthorityLineId: row.parent_authority_line_id ?? null,
    isSelected: row.is_selected ?? true,
    unit: row.unit ?? "unit",
    descriptionAr: row.description_ar ?? null,
    discountAllocated: Number(row.discount_allocated ?? 0),
    createdAt: row.created_at,
  };
}

export function mapRowToQuotationDetail(row: QuotationDetailRow): QuotationDetail {
  const base = mapRowToQuotationListItem(row);
  return {
    ...base,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    vatRate: Number(row.vat_rate),
    vatAmount: Number(row.vat_amount),
    items: (row.quotation_items || []).map(mapRowToQuotationItem),
    predecessor: null,
    successor: null,
  };
}
