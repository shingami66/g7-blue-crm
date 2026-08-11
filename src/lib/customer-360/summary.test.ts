import assert from "node:assert/strict";
import test from "node:test";
import { calculateCustomer360FinancialSummary, isLiveCustomerInvoice } from "./summary.ts";
import type { Customer360Invoice } from "./types.ts";

test("Customer 360 financial summary totals only live issued invoices and excludes draft, cancelled, and voided", () => {
  const invoices: Customer360Invoice[] = [
    // 1. Live deposit invoice (issued, partial) -> MUST BE INCLUDED
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
      issuedAt: "2026-08-01T10:00:00+03:00",
    },
    // 2. Live final invoice (issued, paid) -> MUST BE INCLUDED
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
      issuedAt: "2026-08-02T11:00:00+03:00",
    },
    // 3. Draft invoice (non-issued, null issuedAt) -> MUST BE EXCLUDED
    {
      id: "invoice-draft",
      invoiceNumber: "INV-DRAFT",
      serviceId: "service-1",
      serviceNumber: "SVC-1",
      serviceTitle: "Conference",
      invoiceType: "deposit",
      status: "draft",
      grandTotal: 500,
      amountPaid: 0,
      balanceDue: 500,
      date: "2026-08-03",
      issuedAt: null,
    },
    // 4. Cancelled invoice -> MUST BE EXCLUDED
    {
      id: "invoice-cancelled",
      invoiceNumber: "INV-CANCEL",
      serviceId: "service-1",
      serviceNumber: "SVC-1",
      serviceTitle: "Conference",
      invoiceType: "deposit",
      status: "cancelled",
      grandTotal: 800,
      amountPaid: 0,
      balanceDue: 800,
      date: "2026-08-04",
      issuedAt: "2026-08-04T09:00:00+03:00",
    },
    // 5. Voided invoice -> MUST BE EXCLUDED
    {
      id: "invoice-voided",
      invoiceNumber: "INV-VOID",
      serviceId: "service-1",
      serviceNumber: "SVC-1",
      serviceTitle: "Conference",
      invoiceType: "final",
      status: "voided",
      grandTotal: 900,
      amountPaid: 0,
      balanceDue: 900,
      date: "2026-08-05",
      issuedAt: "2026-08-05T09:00:00+03:00",
    },
    // 6. Non-issued status invoice (null issuedAt) -> MUST BE EXCLUDED
    {
      id: "invoice-no-issue",
      invoiceNumber: "INV-NO-ISSUE",
      serviceId: "service-1",
      serviceNumber: "SVC-1",
      serviceTitle: "Conference",
      invoiceType: "deposit",
      status: "paid",
      grandTotal: 300,
      amountPaid: 300,
      balanceDue: 0,
      date: "2026-08-06",
      issuedAt: null,
    },
  ];

  const summary = calculateCustomer360FinancialSummary(invoices);

  // Exactly the two live invoices (1000 + 2000 = 3000 invoiced, 400 + 2000 = 2400 collected, 600 + 0 = 600 balance)
  assert.deepEqual(summary, {
    totalInvoiced: 3000,
    totalCollected: 2400,
    outstandingBalance: 600,
  });
});

test("Customer 360 financial summary returns null metrics when invoices permission is unavailable/forbidden", () => {
  const summary = calculateCustomer360FinancialSummary(null);

  assert.deepEqual(summary, {
    totalInvoiced: null,
    totalCollected: null,
    outstandingBalance: null,
  });
});

test("Customer 360 financial summary returns zeros when invoices are ready but empty", () => {
  const summary = calculateCustomer360FinancialSummary([]);

  assert.deepEqual(summary, {
    totalInvoiced: 0,
    totalCollected: 0,
    outstandingBalance: 0,
  });
});

test("isLiveCustomerInvoice correctly classifies invoice states", () => {
  assert.equal(isLiveCustomerInvoice({ issuedAt: "2026-08-01", status: "paid" }), true);
  assert.equal(isLiveCustomerInvoice({ issuedAt: "2026-08-01", status: "partial" }), true);
  assert.equal(isLiveCustomerInvoice({ issuedAt: "2026-08-01", status: "overdue" }), true);
  assert.equal(isLiveCustomerInvoice({ issuedAt: null, status: "draft" }), false);
  assert.equal(isLiveCustomerInvoice({ issuedAt: "2026-08-01", status: "draft" }), false);
  assert.equal(isLiveCustomerInvoice({ issuedAt: "2026-08-01", status: "cancelled" }), false);
  assert.equal(isLiveCustomerInvoice({ issuedAt: "2026-08-01", status: "voided" }), false);
  assert.equal(isLiveCustomerInvoice({ issuedAt: null, status: "paid" }), false);
  assert.equal(isLiveCustomerInvoice({ issuedAt: "", status: "paid" }), false);
});
