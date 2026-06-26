import type { PaymentListItem, PaymentListRow } from "./types";

function normalizeAmount(value: number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapRowToPaymentListItem(row: PaymentListRow): PaymentListItem {
  const invoice = row.invoices ?? null;
  const service = invoice?.services ?? null;
  const customerName = row.customers?.company || row.customers?.contact || "Unknown Customer";
  const serviceLabel = service?.service_number
    ? service.service_title
      ? `${service.service_number} - ${service.service_title}`
      : service.service_number
    : service?.service_title ?? null;

  return {
    id: row.id,
    paymentNumber: row.payment_number,
    invoiceId: row.invoice_id,
    invoiceNumber: invoice?.invoice_number ?? null,
    customerName,
    serviceLabel,
    date: row.date,
    amount: normalizeAmount(row.amount),
    method: row.method,
    reference: row.reference,
    status: row.status,
    createdAt: row.created_at,
    recordedBy: row.created_by,
  };
}
