import type { InvoiceStatus, InvoiceType } from "@/types/invoice";
import type { PaymentStatus } from "@/lib/payments/types";
import type { QuotationStatus } from "@/lib/quotations/types";
import type { ServiceStatus } from "@/types/service";
import type { BusinessYear } from "@/lib/business-year";

export type ReportsSectionStatus = "ready" | "forbidden" | "error";

export type ReportReadState =
  | "ready"
  | "partial"
  | "forbidden"
  | "unavailable"
  | "empty"
  | "invalid"
  | "error";

export type ReportCategory = "financial_operations" | "event_costing";
export type ReportTimeModel = "current_only" | "historical_as_of" | "period_and_as_of";

export type ReportDefinition = {
  key: "accounts_receivable" | "accounts_payable" | "event_economics";
  category: ReportCategory;
  title: string;
  description: string;
  route: string;
  requiredPermissions: readonly string[];
  timeModel: ReportTimeModel;
  sourceDomain: string;
  freshness: string;
  exportSupported: boolean;
  confidentiality: "financial" | "internal_costing";
};

export type ReportNavigationItem = Pick<ReportDefinition, "key" | "title" | "route">;

export type ReportPageResult<T> =
  | { status: "ready" | "partial" | "empty"; data: T }
  | { status: Exclude<ReportReadState, "ready" | "partial" | "empty">; error?: string };

export type ReportPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ReportAccountsPayableRow = {
  billId: string;
  billNumber: string;
  supplierId: string;
  supplierName: string | null;
  serviceId: string | null;
  serviceNumber: string | null;
  serviceTitle: string | null;
  invoiceDate: string;
  dueDate: string | null;
  status: "unpaid" | "partially_paid" | "paid";
  currency: string;
  payableAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  advanceAllocatedAmount: number;
};

export type ReportAccountsPayable = {
  currentOnly: true;
  source: string;
  payableAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  openBillCount: number;
  detailTotalCount: number;
  rows: ReportAccountsPayableRow[];
  pagination: ReportPagination;
};

export type ReportEventEconomicsRow = {
  serviceId: string;
  serviceNumber: string;
  serviceTitle: string;
  customerId: string;
  customerNumber: string | null;
  customerName: string | null;
  approvedBudgetCost: number | null;
  openCommitment: number | null;
  actualCost: number | null;
  paidCost: number | null;
  outstandingCost: number | null;
  etc: number | null;
  eac: number | null;
  netApprovedCommercialValue: number | null;
  forecastMargin: number | null;
  completenessStatus: "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
  completenessReasonCodes: string[];
  closeState: "open" | "closed";
  closeVersion: number | null;
  closeEffectiveDate: string | null;
  finalActualCost: number | null;
  finalManagerialMargin: number | null;
  closedAt: string | null;
};

export type ReportEventEconomicsSummary = {
  completenessSummaryState: "available" | "unavailable";
  completeCount: number | null;
  partialCount: number | null;
  unavailableCount: number | null;
  openCount: number;
  closedCount: number;
};

export type ReportEventEconomics = {
  asOfDate: string;
  source: string;
  summary: ReportEventEconomicsSummary;
  rows: ReportEventEconomicsRow[];
  pagination: ReportPagination;
};

export type ReportsSection<T> = {
  status: ReportsSectionStatus;
  data: T;
};

export type ReportFilters = { year?: BusinessYear; from?: string; to?: string; asOf?: string };

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

export type ReportReceivableRow = {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerNumber: string | null;
  customerName: string | null;
  serviceId: string | null;
  serviceNumber: string | null;
  serviceTitle: string | null;
  issueDate: string;
  dueDate: string;
  grossAmount: number;
  creditAdjustmentAmount: number;
  creditApplicationAmount: number;
  netReceivableAmount: number;
  settledAmount: number;
  outstandingAmount: number;
  daysPastDue: number;
  ageingBucket: "not_due" | "1_30" | "31_60" | "61_90" | "91_plus";
};

export type ReportAccountsReceivable = {
  asOfDate: string;
  periodFrom: string | null;
  periodTo: string | null;
  billedAmount: number;
  collectedCashAmount: number;
  totalOutstanding: number;
  totalOverdue: number;
  notDueAmount: number;
  ageing1To30Amount: number;
  ageing31To60Amount: number;
  ageing61To90Amount: number;
  ageing91PlusAmount: number;
  detailTotalCount: number;
  rows: ReportReceivableRow[];
  outstandingCustomerCount: number | null;
  outstandingCustomers: ReportCustomerRanking[];
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
  accountsReceivable: ReportsSection<ReportAccountsReceivable>;
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
