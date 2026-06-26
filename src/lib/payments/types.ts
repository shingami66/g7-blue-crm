export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  date: string;
  method: "bank_transfer" | "cash" | "cheque" | "online";
  reference?: string;
}

export interface RecordPaymentResult {
  success: boolean;
  paymentId?: string;
  paymentNumber?: string;
  newAmountPaid?: number;
  newBalanceDue?: number;
  newStatus?: string;
  error?: string;
}

export type PaymentMethod = "bank_transfer" | "cash" | "cheque" | "online";

export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded";

export interface PaymentListRow {
  id: string;
  payment_number: string;
  invoice_id: string;
  customer_id: string;
  date: string;
  amount: number | string;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  created_at: string;
  created_by: string | null;
  invoices?: {
    invoice_number?: string | null;
    invoice_type?: string | null;
    service_id?: string | null;
    services?: {
      service_number?: string | null;
      service_title?: string | null;
    } | null;
  } | null;
  customers?: {
    company?: string | null;
    contact?: string | null;
  } | null;
}

export interface PaymentListItem {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  invoiceNumber: string | null;
  customerName: string;
  serviceLabel: string | null;
  date: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  createdAt: string;
  recordedBy: string | null;
}

export interface PaymentsListResult {
  payments: PaymentListItem[];
  error?: "payments_load_failed";
}
