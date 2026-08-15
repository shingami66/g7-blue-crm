import type { Invoice, InvoiceStatus, InvoiceType } from "@/types/invoice";
import type { InvoiceRow } from "./types";
import type { VatMode } from "@/types/settings";

function readFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readSnapshotDiscount(snapshotQuotation: InvoiceRow["snapshot_quotation"]): number {
  if (!snapshotQuotation || typeof snapshotQuotation !== "object" || Array.isArray(snapshotQuotation)) {
    return 0;
  }

  return readFiniteNumber((snapshotQuotation as Record<string, unknown>).discount);
}

export function mapRowToInvoice(row: InvoiceRow): Invoice {
  const relationRow = row as InvoiceRow & {
  services?: { service_number?: string | null; service_title?: string | null } | null;
    customers?: { company?: string | null; contact?: string | null } | null;
  };
  let customerName = relationRow.customers?.company ?? "Unknown Customer";
  let customerId = "";

  if (row.customer_id) customerId = row.customer_id;

  if (row.snapshot_buyer && typeof row.snapshot_buyer === 'object') {
    const buyer = row.snapshot_buyer as Record<string, unknown>;
    if (buyer.name && typeof buyer.name === 'string') customerName = buyer.name;
    else if (buyer.legalName && typeof buyer.legalName === 'string') customerName = buyer.legalName;

    if (buyer.customerId && typeof buyer.customerId === 'string') customerId = buyer.customerId;
  }

  let relatedQuoteNumber: string | undefined = undefined;
  if (row.snapshot_quotation && typeof row.snapshot_quotation === 'object') {
    const quote = row.snapshot_quotation as Record<string, unknown>;
    if (quote.quotationNumber && typeof quote.quotationNumber === 'string') {
      relatedQuoteNumber = quote.quotationNumber;
    } else if (quote.quotation_number && typeof quote.quotation_number === 'string') {
      relatedQuoteNumber = quote.quotation_number;
    }
  }

  const amountFormatted = new Intl.NumberFormat('en-SA', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(row.grand_total);

  const dateFormatted = row.issued_at
    ? new Date(row.issued_at).toLocaleDateString()
    : new Date(row.created_at).toLocaleDateString();

  return {
    id: row.id,
    invoice_number: row.invoice_number,
    approved_quotation_id: row.approved_quotation_id,
    approved_billing_scope_id: row.approved_billing_scope_id,
    invoice_type: row.invoice_type as InvoiceType,
    service_id: row.service_id,
    documentDate: row.date,
    documentDueDate: row.due_date,
    status: row.status as InvoiceStatus,
    subtotal: row.subtotal,
    discount_amount: readSnapshotDiscount(row.snapshot_quotation),
    vat_rate: row.vat_rate,
    vat_amount: row.vat_amount,
    grand_total: row.grand_total,
    amount_paid: row.amount_paid,
    balance_due: row.balance_due,
    currency: row.currency,
    document_label: row.document_label,
    vat_mode: row.vat_mode as VatMode,
    snapshot_seller: row.snapshot_seller,
    snapshot_buyer: row.snapshot_buyer,
    snapshot_quotation: row.snapshot_quotation,
    snapshot_bank_details: row.snapshot_bank_details,
    snapshot_document_rules: row.snapshot_document_rules,
    issued_at: row.issued_at,
    voided_at: row.voided_at,
    void_reason: row.void_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,

    // Legacy UI fields mapping
    customer: customerName,
    serviceNumber: relationRow.services?.service_number ?? undefined,
    serviceTitle: relationRow.services?.service_title ?? undefined,
    customerId: customerId,
    relatedQuote: row.approved_quotation_id,
    relatedQuoteNumber: relatedQuoteNumber,
    amount: amountFormatted,
    date: dateFormatted,
    dueDate: dateFormatted,
    items: [],
  };
}
