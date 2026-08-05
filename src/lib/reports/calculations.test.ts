import assert from "node:assert/strict";
import test from "node:test";
import { calculateSalesBilling, calculateServiceOperations } from "./calculations.ts";

test("Reports Center calculates billing totals by invoice and quotation type", () => {
  const result = calculateSalesBilling(
    [
      { id: "q1", quotationNumber: "QT-1", customerId: "c1", event: "Event", grandTotal: 500, status: "approved", createdAt: "2026-08-01" },
      { id: "q2", quotationNumber: "QT-2", customerId: "c1", event: "Draft", grandTotal: 200, status: "draft", createdAt: "2026-08-02" },
    ],
    [
      { id: "i1", invoiceNumber: "INV-1", customerId: "c1", invoiceType: "deposit", status: "partial", grandTotal: 300, amountPaid: 100, balanceDue: 200, createdAt: "2026-08-01" },
      { id: "i2", invoiceNumber: "INV-2", customerId: "c1", invoiceType: "final", status: "paid", grandTotal: 700, amountPaid: 700, balanceDue: 0, createdAt: "2026-08-02" },
    ],
  );

  assert.deepEqual(result, {
    quotationCount: 2,
    quotationValue: 700,
    approvedQuotationValue: 500,
    invoicedValue: 1000,
    collectedValue: 800,
    outstandingValue: 200,
    depositInvoiceCount: 1,
    finalInvoiceCount: 1,
  });
});

test("Reports Center separates truthful Service operational buckets", () => {
  const services = [
    { id: "s1", serviceNumber: "SVC-1", serviceTitle: "Ready", customerId: "c1", eventStartDate: "2026-08-10", status: "Deposit Paid" as const },
    { id: "s2", serviceNumber: "SVC-2", serviceTitle: "Active", customerId: "c1", eventStartDate: "2026-08-11", status: "In Progress" as const },
    { id: "s3", serviceNumber: "SVC-3", serviceTitle: "Old", customerId: "c1", eventStartDate: "2026-07-01", status: "Completed" as const },
  ];

  const result = calculateServiceOperations(services, "2026-08-04");

  assert.equal(result.upcoming.length, 2);
  assert.equal(result.readyToStart.length, 1);
  assert.equal(result.inProgress.length, 1);
  assert.equal(result.completed.length, 1);
  assert.equal(result.statusCounts["Cancelled"], 0);
});
