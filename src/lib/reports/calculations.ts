import type {
  ReportCustomer,
  ReportCustomerRanking,
  ReportFilters,
  ReportInvoice,
  ReportPayment,
  ReportQuotation,
  ReportService,
} from "./types";
import type { ServiceStatus } from "@/types/service";

export function calculateSalesBilling(
  quotations: ReportQuotation[] | null,
  invoices: ReportInvoice[] | null,
) {
  return {
    quotationCount: quotations !== null ? quotations.length : null,
    quotationValue: quotations !== null ? sum(quotations.map((quotation) => quotation.grandTotal)) : null,
    approvedQuotationValue:
      quotations !== null
        ? sum(quotations.filter((quotation) => quotation.status === "approved").map((quotation) => quotation.grandTotal))
        : null,
    invoicedValue: invoices !== null ? sum(invoices.map((invoice) => invoice.grandTotal)) : null,
    collectedValue: invoices !== null ? sum(invoices.map((invoice) => invoice.amountPaid)) : null,
    outstandingValue: invoices !== null ? sum(invoices.map((invoice) => Math.max(invoice.balanceDue, 0))) : null,
    depositInvoiceCount: invoices !== null ? invoices.filter((invoice) => invoice.invoiceType === "deposit").length : null,
    finalInvoiceCount: invoices !== null ? invoices.filter((invoice) => invoice.invoiceType === "final").length : null,
  };
}

export function calculateCustomerOverview(
  customers: ReportCustomer[] | null,
  invoices: ReportInvoice[] | null,
  payments: ReportPayment[] | null,
  periodTransactions?: {
    quotations?: ReportQuotation[] | null;
    services?: ReportService[] | null;
  },
) {
  const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer]));
  const toCustomerRanking = ([customerId, amount]: [string, number]): ReportCustomerRanking => ({
    customerId,
    customerNumber: customerById.get(customerId)?.customerNumber ?? null,
    company: customerById.get(customerId)?.company ?? null,
    amount,
  });

  const quotations = periodTransactions?.quotations ?? [];
  const services = periodTransactions?.services ?? [];
  const hasAllActivitySources =
    customers !== null &&
    invoices !== null &&
    payments !== null &&
    periodTransactions?.quotations !== null &&
    periodTransactions?.services !== null;

  let activeCustomers: number | null = null;
  if (hasAllActivitySources) {
    const periodCustomerIds = new Set<string>();
    for (const invoice of invoices) {
      if (invoice.customerId) periodCustomerIds.add(invoice.customerId);
    }
    for (const payment of payments) {
      if (payment.customerId) periodCustomerIds.add(payment.customerId);
    }
    for (const quotation of quotations) {
      if (quotation.customerId) periodCustomerIds.add(quotation.customerId);
    }
    for (const service of services) {
      if (service.customerId) periodCustomerIds.add(service.customerId);
    }

    activeCustomers = Array.from(periodCustomerIds).filter(
      (id) => customerById.get(id)?.status === "active",
    ).length;
  }

  const invoiceRows = invoices ?? [];
  const allOutstanding =
    invoices !== null
      ? Array.from(
          invoiceRows.reduce<Map<string, number>>((totals, invoice) => {
            return totals.set(invoice.customerId, (totals.get(invoice.customerId) ?? 0) + Math.max(invoice.balanceDue, 0));
          }, new Map()),
        )
          .filter(([, amount]) => amount > 0)
          .sort((left, right) => right[1] - left[1])
      : null;

  const allInvoiced =
    invoices !== null
      ? Array.from(
          invoiceRows.reduce<Map<string, number>>((totals, invoice) => {
            return totals.set(invoice.customerId, (totals.get(invoice.customerId) ?? 0) + invoice.grandTotal);
          }, new Map()),
        )
          .filter(([, amount]) => amount > 0)
          .sort((left, right) => right[1] - left[1])
      : null;

  return {
    activeCustomers,
    outstandingCustomersCount: allOutstanding !== null ? allOutstanding.length : null,
    highestInvoicedCustomersCount: allInvoiced !== null ? allInvoiced.length : null,
    outstandingCustomers: allOutstanding !== null ? allOutstanding.slice(0, 10).map(toCustomerRanking) : [],
    highestInvoicedCustomers: allInvoiced !== null ? allInvoiced.slice(0, 10).map(toCustomerRanking) : [],
    recentPayments: payments !== null ? payments.slice(0, 10) : [],
  };
}

export function calculateServiceOperations(services: ReportService[], today: string, filters: ReportFilters = {}) {
  const statusCounts = services.reduce<Record<ServiceStatus, number>>((counts, service) => {
    counts[service.status] += 1;
    return counts;
  }, {
    Inquiry: 0,
    Quoted: 0,
    Approved: 0,
    "Deposit Paid": 0,
    "In Progress": 0,
    Completed: 0,
    Cancelled: 0,
  });
  const upcoming = services.filter((service) => service.eventStartDate !== null && service.eventStartDate >= today && (!filters.from || service.eventStartDate >= filters.from) && (!filters.to || service.eventStartDate <= filters.to));
  return {
    statusCounts,
    upcoming,
    readyToStart: services.filter((service) => service.status === "Deposit Paid"),
    inProgress: services.filter((service) => service.status === "In Progress"),
    completed: services.filter((service) => service.status === "Completed"),
    cancelled: services.filter((service) => service.status === "Cancelled"),
  };
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
