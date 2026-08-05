import assert from "node:assert/strict";
import test from "node:test";
import { calculateCustomer360FinancialSummary } from "./summary.ts";

test("Customer 360 financial summary totals authoritative invoice values", () => {
  const summary = calculateCustomer360FinancialSummary([
    {
      id: "invoice-1",
      invoiceNumber: "INV-1",
      serviceId: "service-1",
      serviceNumber: "SVC-1",
      serviceTitle: "Conference",
      invoiceType: "deposit",
      status: "partial",
      grandTotal: 1000,
      amountPaid: 400,
      balanceDue: 600,
      date: "2026-08-01",
    },
    {
      id: "invoice-2",
      invoiceNumber: "INV-2",
      serviceId: "service-1",
      serviceNumber: "SVC-1",
      serviceTitle: "Conference",
      invoiceType: "final",
      status: "paid",
      grandTotal: 2000,
      amountPaid: 2000,
      balanceDue: 0,
      date: "2026-08-02",
    },
  ]);

  assert.deepEqual(summary, {
    totalInvoiced: 3000,
    totalCollected: 2400,
    outstandingBalance: 600,
  });
});
