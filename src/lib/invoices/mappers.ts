import type { Invoice, InvoiceStatus, InvoiceType } from "@/types/invoice";
import type { InvoiceRow } from "./types";
import type { VatMode } from "@/types/settings";

export function mapRowToInvoice(row: InvoiceRow): Invoice {
  let customerName = "Unknown Customer";
  let customerId = "";

  if (row.snapshot_buyer && typeof row.snapshot_buyer === 'object') {
    const buyer = row.snapshot_buyer as Record<string, unknown>;
    if (buyer.name && typeof buyer.name === 'string') customerName = buyer.name;
    else if (buyer.legalName && typeof buyer.legalName === 'string') customerName = buyer.legalName;

    if (buyer.customerId && typeof buyer.customerId === 'string') customerId = buyer.customerId;
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
    invoice_type: row.invoice_type as InvoiceType,
    service_id: row.service_id,
    status: row.status as InvoiceStatus,
    subtotal: row.subtotal,
    discount_amount: row.discount_amount,
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
    customerId: customerId,
    relatedQuote: row.approved_quotation_id,
    amount: amountFormatted,
    date: dateFormatted,
    dueDate: dateFormatted,
    items: [],
  };
}
