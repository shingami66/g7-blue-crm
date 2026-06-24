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
