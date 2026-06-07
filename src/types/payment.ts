import { AuditFields } from "./common";

export type PaymentMethod = "bank_transfer" | "cash" | "cheque" | "online";

export type PaymentStatus = "pending" | "confirmed" | "failed" | "refunded";

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
