import type { InvoiceStatus, InvoiceType } from "@/types/invoice";
import type { PaymentStatus } from "@/lib/payments/types";
import type { QuotationStatus } from "@/lib/quotations/types";
import type { ServiceStatus } from "@/types/service";
import type { BusinessYear } from "@/lib/business-year";

export type ReportsSectionStatus = "ready" | "forbidden" | "error";

export type ReportsSection<T> = {
  status: ReportsSectionStatus;
  data: T;
};

export type ReportFilters = { year?: BusinessYear; from?: string; to?: string };

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
  issuedAt: string;
  createdAt?: string;
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
    quotationCount: number | null;
    quotationValue: number | null;
    approvedQuotationValue: number | null;
    invoicedValue: number | null;
    collectedValue: number | null;
    outstandingValue: number | null;
    depositInvoiceCount: number | null;
    finalInvoiceCount: number | null;
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
    activeCustomers: number | null;
    outstandingCustomersCount: number | null;
    highestInvoicedCustomersCount: number | null;
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
