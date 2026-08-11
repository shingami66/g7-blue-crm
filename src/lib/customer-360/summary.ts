import type { Customer360FinancialSummary, Customer360Invoice } from "./types";

export function isLiveCustomerInvoice(invoice: {
  issuedAt?: string | null;
  status: string;
}): boolean {
  return (
    invoice.issuedAt !== null &&
    invoice.issuedAt !== undefined &&
    invoice.issuedAt.trim().length > 0 &&
    invoice.status !== "draft" &&
    invoice.status !== "cancelled" &&
    invoice.status !== "voided"
  );
}

export function calculateCustomer360FinancialSummary(
  invoices: Customer360Invoice[] | null,
): Customer360FinancialSummary {
  if (invoices === null) {
    return {
      totalInvoiced: null,
      totalCollected: null,
      outstandingBalance: null,
    };
  }

  const liveInvoices = invoices.filter(isLiveCustomerInvoice);

  return liveInvoices.reduce(
    (summary, invoice) => ({
      totalInvoiced: (summary.totalInvoiced ?? 0) + invoice.grandTotal,
      totalCollected: (summary.totalCollected ?? 0) + invoice.amountPaid,
      outstandingBalance: (summary.outstandingBalance ?? 0) + Math.max(invoice.balanceDue, 0),
    }),
    { totalInvoiced: 0, totalCollected: 0, outstandingBalance: 0 } as Customer360FinancialSummary,
  );
}
