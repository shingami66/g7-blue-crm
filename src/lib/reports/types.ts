import type { InvoiceStatus, InvoiceType } from "@/types/invoice";
import type { PaymentStatus } from "@/lib/payments/types";
import type { QuotationStatus } from "@/lib/quotations/types";
import type { ServiceStatus } from "@/types/service";

export type ReportsSectionStatus = "ready" | "forbidden" | "error";

export type ReportsSection<T> = {
  status: ReportsSectionStatus;
  data: T;
};

export type ReportFilters = { from?: string; to?: string };

export type ReportQuotation = {
  id: string;
  quotationNumber: string;
  customerId: string;
  event: string;
  grandTotal: number;
  status: QuotationStatus;
  createdAt: string;
};

export type ReportInvoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  createdAt: string;
};

export type ReportService = {
  id: string;
  serviceNumber: string;
  serviceTitle: string;
  customerId: string;
  eventStartDate: string | null;
  status: ServiceStatus;
};

export type ReportCustomer = {
  id: string;
  customerNumber: string;
  company: string;
  status: string;
};

export type ReportCustomerRanking = {
  customerId: string;
  customerNumber: string | null;
  company: string | null;
  amount: number;
};

export type ReportPayment = {
  id: string;
  paymentNumber: string;
  customerId: string;
  amount: number;
  status: PaymentStatus;
  date: string;
};

export type ReportsCenterData = {
  filters: ReportFilters;
  salesBilling: ReportsSection<{
    quotations: ReportQuotation[];
    invoices: ReportInvoice[];
    quotationCount: number;
    quotationValue: number;
    approvedQuotationValue: number;
    invoicedValue: number;
    collectedValue: number;
    outstandingValue: number;
    depositInvoiceCount: number;
    finalInvoiceCount: number;
  }>;
  serviceOperations: ReportsSection<{
    services: ReportService[];
    statusCounts: Record<ServiceStatus, number>;
    upcoming: ReportService[];
    readyToStart: ReportService[];
    inProgress: ReportService[];
    completed: ReportService[];
    cancelled: ReportService[];
  }>;
  customerOverview: ReportsSection<{
    customers: ReportCustomer[];
    activeCustomers: number;
    outstandingCustomers: ReportCustomerRanking[];
    highestInvoicedCustomers: ReportCustomerRanking[];
    recentPayments: ReportPayment[];
  }>;
  supplierOperations: ReportsSection<{
    activeAllocations: number;
    activeBookings: number;
    pendingServiceIds: string[];
    internalEstimatedCost: number | null;
  }>;
};
