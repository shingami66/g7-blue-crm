import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCustomerOverview,
  calculateSalesBilling,
  calculateServiceOperations,
} from "./calculations.ts";
import type { ReportCustomer, ReportInvoice } from "./types";

test("Reports Center calculates billing totals by invoice and quotation type with authoritative issuedAt", () => {
  const result = calculateSalesBilling(
    [
      { id: "q1", quotationNumber: "QT-1", customerId: "c1", event: "Event", grandTotal: 500, status: "approved", createdAt: "2026-08-01" },
      { id: "q2", quotationNumber: "QT-2", customerId: "c1", event: "Draft", grandTotal: 200, status: "draft", createdAt: "2026-08-02" },
    ],
    [
      { id: "i1", invoiceNumber: "INV-1", customerId: "c1", invoiceType: "deposit", status: "partial", grandTotal: 300, amountPaid: 100, balanceDue: 200, issuedAt: "2026-08-01T10:00:00+03:00" },
      { id: "i2", invoiceNumber: "INV-2", customerId: "c1", invoiceType: "final", status: "paid", grandTotal: 700, amountPaid: 700, balanceDue: 0, issuedAt: "2026-08-02T11:00:00+03:00" },
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

test("Reports Center sets invoice metrics to null when invoice permission is unavailable (no fake zeros)", () => {
  const result = calculateSalesBilling(
    [
      { id: "q1", quotationNumber: "QT-1", customerId: "c1", event: "Event", grandTotal: 500, status: "approved", createdAt: "2026-08-01" },
    ],
    null,
  );

  assert.deepEqual(result, {
    quotationCount: 1,
    quotationValue: 500,
    approvedQuotationValue: 500,
    invoicedValue: null,
    collectedValue: null,
    outstandingValue: null,
    depositInvoiceCount: null,
    finalInvoiceCount: null,
  });
});

test("Reports Center sets quotation metrics to null when quotation permission is unavailable (no fake zeros)", () => {
  const result = calculateSalesBilling(
    null,
    [
      { id: "i1", invoiceNumber: "INV-1", customerId: "c1", invoiceType: "deposit", status: "partial", grandTotal: 300, amountPaid: 100, balanceDue: 200, issuedAt: "2026-08-01T10:00:00+03:00" },
    ],
  );

  assert.deepEqual(result, {
    quotationCount: null,
    quotationValue: null,
    approvedQuotationValue: null,
    invoicedValue: 300,
    collectedValue: 100,
    outstandingValue: 200,
    depositInvoiceCount: 1,
    finalInvoiceCount: 0,
  });
});

test("Customer overview resolves older customers and computes complete ranking counts beyond top-10 slice", () => {
  const customers: ReportCustomer[] = [
    { id: "c-old", customerNumber: "CUST-001", company: "Historical Client Co", status: "active" },
    ...Array.from({ length: 14 }, (_, index) => ({
      id: `c-${index + 2}`,
      customerNumber: `CUST-${String(index + 2).padStart(3, "0")}`,
      company: `Company ${index + 2}`,
      status: index % 2 === 0 ? "active" : "inactive",
    })),
  ];

  const invoices: ReportInvoice[] = [
    { id: "inv-old", invoiceNumber: "INV-OLD", customerId: "c-old", invoiceType: "final", status: "partial", grandTotal: 10000, amountPaid: 2000, balanceDue: 8000, issuedAt: "2026-08-01T09:00:00+03:00" },
    ...Array.from({ length: 14 }, (_, index) => ({
      id: `inv-${index + 2}`,
      invoiceNumber: `INV-${index + 2}`,
      customerId: `c-${index + 2}`,
      invoiceType: "final" as const,
      status: "partial" as const,
      grandTotal: (index + 1) * 100,
      amountPaid: 0,
      balanceDue: (index + 1) * 100,
      issuedAt: "2026-08-02T09:00:00+03:00",
    })),
  ];

  const overview = calculateCustomerOverview(customers, invoices, [], { quotations: [], services: [] });

  // Total active transacting customers (c-old + 7 active out of 14 generated = 8)
  assert.equal(overview.activeCustomers, 8);

  // Complete count of customers with balance is 15 (c-old + 14 generated), not clamped to 10
  assert.equal(overview.outstandingCustomersCount, 15);
  assert.equal(overview.highestInvoicedCustomersCount, 15);

  // Top rankings array is capped at 10 items
  assert.equal(overview.outstandingCustomers.length, 10);
  assert.equal(overview.highestInvoicedCustomers.length, 10);

  // Older customer resolved company and customerNumber cleanly
  assert.equal(overview.outstandingCustomers[0].customerId, "c-old");
  assert.equal(overview.outstandingCustomers[0].customerNumber, "CUST-001");
  assert.equal(overview.outstandingCustomers[0].company, "Historical Client Co");
  assert.equal(overview.outstandingCustomers[0].amount, 8000);
});

test("Customer overview returns null counts and null activeCustomers when invoice permission is unavailable", () => {
  const customers: ReportCustomer[] = [
    { id: "c1", customerNumber: "CUST-001", company: "Alpha", status: "active" },
  ];

  const overview = calculateCustomerOverview(customers, null, [
    { id: "p1", paymentNumber: "PMT-1", customerId: "c1", amount: 500, status: "confirmed", date: "2026-08-01" },
  ], { quotations: [], services: [] });

  // When invoices are unavailable, activeCustomers is null (cannot compute truthful period active set)
  assert.equal(overview.activeCustomers, null);
  assert.equal(overview.outstandingCustomersCount, null);
  assert.equal(overview.highestInvoicedCustomersCount, null);
  assert.deepEqual(overview.outstandingCustomers, []);
  assert.deepEqual(overview.highestInvoicedCustomers, []);
  assert.equal(overview.recentPayments.length, 1);
});

test("Customer overview returns null activeCustomers when payments or services permissions are unavailable", () => {
  const customers: ReportCustomer[] = [
    { id: "c1", customerNumber: "CUST-001", company: "Alpha", status: "active" },
  ];
  const invoices: ReportInvoice[] = [
    { id: "i1", invoiceNumber: "INV-1", customerId: "c1", invoiceType: "deposit", status: "paid", grandTotal: 1000, amountPaid: 1000, balanceDue: 0, issuedAt: "2026-08-01T10:00:00+03:00" },
  ];

  // payments unavailable (null)
  const overviewNoPayments = calculateCustomerOverview(customers, invoices, null, { quotations: [], services: [] });
  assert.equal(overviewNoPayments.activeCustomers, null);

  // services unavailable (null)
  const overviewNoServices = calculateCustomerOverview(customers, invoices, [], { quotations: [], services: null });
  assert.equal(overviewNoServices.activeCustomers, null);
});

test("Customer overview derives activeCustomers strictly from period transactions, ignoring inactive and non-transacting customers", () => {
  const customers: ReportCustomer[] = [
    { id: "c-active-with-tx", customerNumber: "CUST-001", company: "Active Transacting", status: "active" },
    { id: "c-active-no-tx", customerNumber: "CUST-002", company: "Active Idle", status: "active" },
    { id: "c-inactive-with-tx", customerNumber: "CUST-003", company: "Inactive Transacting", status: "inactive" },
  ];

  const quotations = [
    { id: "q1", quotationNumber: "QT-1", customerId: "c-active-with-tx", event: "Gala", grandTotal: 1000, status: "approved" as const, createdAt: "2026-08-01" },
    { id: "q2", quotationNumber: "QT-2", customerId: "c-inactive-with-tx", event: "Party", grandTotal: 500, status: "approved" as const, createdAt: "2026-08-02" },
  ];

  const overview = calculateCustomerOverview(customers, [], [], { quotations, services: [] });

  // Only c-active-with-tx is counted (has period tx AND status === "active").
  // c-active-no-tx is idle (no period tx).
  // c-inactive-with-tx has period tx but status is "inactive".
  assert.equal(overview.activeCustomers, 1);
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
