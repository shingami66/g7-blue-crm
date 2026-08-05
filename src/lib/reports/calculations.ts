import type { ReportFilters, ReportInvoice, ReportQuotation, ReportService } from "./types";
import type { ServiceStatus } from "@/types/service";

export function calculateSalesBilling(quotations: ReportQuotation[], invoices: ReportInvoice[]) {
  return {
    quotationCount: quotations.length,
    quotationValue: sum(quotations.map((quotation) => quotation.grandTotal)),
    approvedQuotationValue: sum(quotations.filter((quotation) => quotation.status === "approved").map((quotation) => quotation.grandTotal)),
    invoicedValue: sum(invoices.map((invoice) => invoice.grandTotal)),
    collectedValue: sum(invoices.map((invoice) => invoice.amountPaid)),
    outstandingValue: sum(invoices.map((invoice) => Math.max(invoice.balanceDue, 0))),
    depositInvoiceCount: invoices.filter((invoice) => invoice.invoiceType === "deposit").length,
    finalInvoiceCount: invoices.filter((invoice) => invoice.invoiceType === "final").length,
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
