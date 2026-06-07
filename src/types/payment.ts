import { AuditFields } from "./common";

export type PaymentMethod = "bank_transfer" | "cash" | "cheque" | "online" | "Bank Transfer" | "Credit Card" | "Cheque";

export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded" | "completed" | "processing";

export interface Payment {
  id: string;
  invoiceId: string;
  customer: string;
  date: string;
  amount: string;
  method: PaymentMethod;
  reference: string;
  status: PaymentStatus;
}
