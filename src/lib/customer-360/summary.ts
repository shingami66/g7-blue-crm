import type { Customer360FinancialSummary, Customer360Invoice } from "./types";

export function calculateCustomer360FinancialSummary(
  invoices: Customer360Invoice[],
): Customer360FinancialSummary {
  return invoices.reduce(
    (summary, invoice) => ({
      totalInvoiced: summary.totalInvoiced + invoice.grandTotal,
      totalCollected: summary.totalCollected + invoice.amountPaid,
      outstandingBalance: summary.outstandingBalance + Math.max(invoice.balanceDue, 0),
    }),
    { totalInvoiced: 0, totalCollected: 0, outstandingBalance: 0 },
  );
}
