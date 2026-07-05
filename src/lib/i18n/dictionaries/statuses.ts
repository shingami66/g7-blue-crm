import type { InvoiceStatus, InvoiceType } from "../../../types/invoice";
import type { SupplierStatus } from "../../../types/supplier";
import type { ServiceStatus } from "../../../types/service";
import type { PaymentStatus } from "../../payments/types";
import type { QuotationStatus } from "../../quotations/types";
import type { SupplierAllocationStatus } from "../../supplier-allocations/types";
import type { SupplierBookingStatus } from "../../supplier-bookings/types";

export interface StatusDictionaries {
  invoice: Record<InvoiceStatus, string>;
  invoiceType: Record<InvoiceType, string>;
  payment: Record<PaymentStatus, string>;
  quotation: Record<QuotationStatus, string>;
  service: Record<ServiceStatus, string>;
  supplier: Record<SupplierStatus, string>;
  supplierAllocation: Record<SupplierAllocationStatus, string>;
  supplierBooking: Record<SupplierBookingStatus, string>;
}

export const statusDictionariesEn: StatusDictionaries = {
  invoice: {
    draft: "Draft",
    sent: "Sent",
    paid: "Paid",
    partial: "Partial",
    overdue: "Overdue",
    cancelled: "Cancelled",
    voided: "Voided",
  },
  invoiceType: {
    deposit: "Deposit",
    final: "Final",
  },
  payment: {
    pending: "Pending",
    confirmed: "Confirmed",
    failed: "Failed",
    refunded: "Refunded",
  },
  quotation: {
    draft: "Draft",
    sent: "Sent",
    approved: "Approved",
    rejected: "Rejected",
    expired: "Expired",
  },
  service: {
    Inquiry: "Inquiry",
    Quoted: "Quoted",
    Approved: "Approved",
    "Deposit Paid": "Deposit Paid",
    "In Progress": "In Progress",
    Completed: "Completed",
    Cancelled: "Cancelled",
  },
  supplier: {
    active: "Active",
    on_hold: "On Hold",
    blacklisted: "Blacklisted",
    inactive: "Inactive",
  },
  supplierAllocation: {
    draft: "Draft",
    planned: "Planned",
    selected: "Selected",
    cancelled: "Cancelled",
  },
  supplierBooking: {
    draft: "Draft",
    cancelled: "Cancelled",
  },
};
