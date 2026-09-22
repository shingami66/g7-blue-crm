import type { Locale } from "@/lib/i18n/locales";

export const CUSTOMER_CREDIT_REASON_CODES = [
  "customer_scope_reduction",
  "invoice_correction",
  "pricing_correction",
  "duplicate_charge",
  "other",
] as const;

export type CustomerCreditReasonCode = (typeof CUSTOMER_CREDIT_REASON_CODES)[number];
export type CustomerRefundMethod = "bank_transfer" | "cash" | "cheque" | "online";

export interface CustomerInvoiceReceivableBalance {
  invoiceId: string;
  serviceId: string;
  invoiceNumber: string;
  customerId: string;
  grossIssuedAmount: number;
  creditAdjustmentAmount: number;
  creditApplicationAmount: number;
  netReceivableAmount: number;
  settledAmount: number;
  outstandingAmount: number;
  customerCreditAmount: number;
  invoiceAmountPaid: number;
  invoiceBalanceDue: number;
  invoiceStatus: string;
}

export interface CustomerCreditBalance {
  customerId: string;
  creditAdjustmentCount: number;
  creditedAmount: number;
  refundedAmount: number;
  appliedAmount: number;
  availableCreditAmount: number;
}

export interface CustomerCreditAdjustmentBalance {
  creditAdjustmentId: string;
  customerId: string;
  serviceId: string;
  invoiceId: string;
  sourceApprovedBillingScopeId: string | null;
  successorApprovedBillingScopeId: string | null;
  creditedAmount: number;
  eligibleAmount: number;
  refundedAmount: number;
  appliedAmount: number;
  availableAmount: number;
  reasonCode: CustomerCreditReasonCode;
  reason: string;
  effectiveDate: string;
  createdBy: string;
  createdAt: string;
}

export interface CustomerCreditDocument {
  locale: Locale;
  title: string;
  invoiceNumber: string;
  adjustmentAmount: number;
  reason: string;
  effectiveDate: string;
  customerId: string;
  serviceId: string;
  vatMode: "not_registered";
}

export interface CustomerCreditActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}
