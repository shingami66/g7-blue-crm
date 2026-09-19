import type { ListPageSize } from "@/lib/pagination";

export type CustomerReceiptMethod = "bank_transfer" | "cash" | "cheque" | "online";

export interface CustomerOption {
  id: string;
  label: string;
}

export interface CustomerReceiptAllocation {
  id: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string | null;
  amount: number;
  allocatedAt: string;
  allocatedBy: string;
  reversed: boolean;
}

export interface CustomerReceiptBalance {
  paymentId: string;
  paymentNumber: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  method: CustomerReceiptMethod;
  reference: string | null;
  notes: string | null;
  allocatedAmount: number;
  unappliedAmount: number;
  receiptStatus: string;
  createdAt: string;
}

export interface CustomerReceiptAllocationPage {
  allocations: CustomerReceiptAllocation[];
  pagination: {
    page: number;
    pageSize: ListPageSize;
    total: number;
    totalPages: number;
  };
}

export interface EligibleCustomerInvoice {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  grandTotal: number;
  outstandingAmount: number;
  invoiceAmountPaid: number;
  invoiceBalanceDue: number;
  invoiceStatus: string;
}

export interface CustomerReceiptWorkspaceData {
  receipts: CustomerReceiptBalance[];
  customers: CustomerOption[];
  pagination: {
    page: number;
    pageSize: ListPageSize;
    total: number;
    totalPages: number;
  };
}

export interface CustomerReceiptActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

export interface CustomerReceiptWorkspaceQuery {
  page: number;
  pageSize: ListPageSize;
  search?: string;
}

export interface CustomerReceiptAllocationQuery {
  page: number;
  pageSize: ListPageSize;
}
