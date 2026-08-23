import type { Customer } from "@/types/customer";
import type { PaymentMethod, PaymentStatus } from "@/lib/payments/types";
import type { ServiceStatus } from "@/types/service";
import type { QuotationStatus } from "@/lib/quotations/types";
import type { InvoiceStatus, InvoiceType } from "@/types/invoice";

export type Customer360SectionStatus = "ready" | "forbidden" | "error";

export type Customer360Section<T> = {
  status: Customer360SectionStatus;
  items: T[];
};

export type Customer360Service = {
  id: string;
  serviceNumber: string;
  serviceTitle: string;
  eventStartDate: string | null;
  createdAt: string;
  status: ServiceStatus;
};

export type Customer360Quotation = {
  id: string;
  quotationNumber: string;
  serviceId: string;
  serviceNumber: string | null;
  serviceTitle: string | null;
  event: string;
  date: string;
  grandTotal: number;
  status: QuotationStatus;
};

export type Customer360Invoice = {
  id: string;
  invoiceNumber: string;
  serviceId: string | null;
  serviceNumber: string | null;
  serviceTitle: string | null;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  date: string;
  issuedAt: string | null;
};

export type Customer360Payment = {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
};

export type Customer360Activity = {
  id: string;
  date: string;
  kind: "operational" | "financial";
  eventType: "service" | "invoice" | "payment";
  identifier: string;
  subject: string;
  status: string | null;
  amount: number | null;
  href: string;
};

export type Customer360FinancialSummary = {
  totalInvoiced: number | null;
  totalCollected: number | null;
  outstandingBalance: number | null;
};

export type Customer360Data = {
  customer: Customer;
  services: Customer360Section<Customer360Service>;
  quotations: Customer360Section<Customer360Quotation>;
  invoices: Customer360Section<Customer360Invoice>;
  payments: Customer360Section<Customer360Payment>;
  summary: Customer360FinancialSummary;
  upcomingServices: Customer360Service[];
  recentOperationalActivity: Customer360Activity[];
  recentFinancialActivity: Customer360Activity[];
};

export type Customer360SecondaryData = Omit<Customer360Data, "customer">;

export type Customer360ProfileResult =
  | { status: "ready"; customer: Customer }
  | { status: "not_found" }
  | { status: "error"; error: "customer_load_failed" };

export type Customer360SecondaryResult = {
  status: "ready";
  data: Customer360SecondaryData;
};

export type Customer360Result =
  | { status: "ready"; data: Customer360Data }
  | { status: "not_found" }
  | { status: "error"; error: "customer_load_failed" };
