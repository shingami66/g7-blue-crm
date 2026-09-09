import type { CrmRole } from "@/lib/admin/users/schemas";
import {
  APPROVED_BILLING_SCOPE_ACCOUNTANT_PERMISSIONS,
  APPROVED_BILLING_SCOPE_MANAGER_PERMISSIONS,
} from "@/lib/approved-billing-scopes/permissions";

export const INVOICE_PERMISSIONS = {
  read: "invoices:read",
  write: "invoices:write",
} as const;

export const SERVICE_BILLING_SUMMARY_PERMISSIONS = {
  read: "services:read_billing_summary",
} as const;

export const BUSINESS_DOCUMENT_PERMISSIONS = {
  read: "documents:read",
  write: "documents:write",
} as const;

export const PROCUREMENT_COMMITMENT_PERMISSIONS = {
  read: "procurement_commitments:read",
  write: "procurement_commitments:write",
  amend: "procurement_commitments:amend",
  lifecycle: "procurement_commitments:lifecycle",
} as const;

export const SERVICE_RECEIPT_PERMISSIONS = {
  read: "service_receipts:read",
  write: "service_receipts:write",
  accept: "service_receipts:accept",
  correct: "service_receipts:correct",
} as const;

export const EXPENSE_PERMISSIONS = {
  read: "expenses:read",
  readOwn: "expenses:read_own",
  write: "expenses:write",
  submitOwn: "expenses:submit_own",
  approve: "expenses:approve",
  financeReview: "expenses:finance_review",
  settle: "expenses:settle",
} as const;

export const CASH_ADVANCE_PERMISSIONS = {
  read: "cash_advances:read",
  readOwn: "cash_advances:read_own",
  create: "cash_advances:create",
  submitOwn: "cash_advances:submit_own",
  approve: "cash_advances:approve",
  issue: "cash_advances:issue",
  settle: "cash_advances:settle",
} as const;

export const PETTY_CASH_PERMISSIONS = {
  read: "petty_cash:read",
  manage: "petty_cash:manage",
  transact: "petty_cash:transact",
} as const;

export const ROLE_PERMISSIONS = {
  admin: [
    "*",
    "users:invite",
    "users:manage",
    "supplier_costing:read",
    "supplier_costing:write",
    "supplier_allocations:read",
    "supplier_allocations:read_cost",
    "supplier_allocations:write",
    "supplier_allocations:cancel",
    PROCUREMENT_COMMITMENT_PERMISSIONS.read,
    PROCUREMENT_COMMITMENT_PERMISSIONS.write,
    PROCUREMENT_COMMITMENT_PERMISSIONS.amend,
    PROCUREMENT_COMMITMENT_PERMISSIONS.lifecycle,
    SERVICE_RECEIPT_PERMISSIONS.read,
    SERVICE_RECEIPT_PERMISSIONS.write,
    SERVICE_RECEIPT_PERMISSIONS.accept,
    SERVICE_RECEIPT_PERMISSIONS.correct,
  ],
  manager: [
    "customers:read",
    "customers:write",
    "customers:export",
    "quotations:read",
    "quotations:write",
    "quotations:approve",
    "services:read",
    SERVICE_BILLING_SUMMARY_PERMISSIONS.read,
    "services:write",
    "services:update_status",
    "services:authorize_execution_credit",
    "services:reopen",
    INVOICE_PERMISSIONS.read,
    INVOICE_PERMISSIONS.write,
    "payments:read",
    "projects:read",
    "projects:write",
    "suppliers:read",
    "suppliers:write",
    "supplier_costing:read",
    "supplier_costing:write",
    "supplier_allocations:read",
    "supplier_allocations:read_cost",
    "supplier_allocations:write",
    "supplier_allocations:cancel",
    "supplier_bookings:read",
    "supplier_bookings:read_cost",
    "supplier_bookings:write",
    "supplier_bookings:cancel",
    PROCUREMENT_COMMITMENT_PERMISSIONS.read,
    PROCUREMENT_COMMITMENT_PERMISSIONS.write,
    PROCUREMENT_COMMITMENT_PERMISSIONS.amend,
    PROCUREMENT_COMMITMENT_PERMISSIONS.lifecycle,
    SERVICE_RECEIPT_PERMISSIONS.read,
    SERVICE_RECEIPT_PERMISSIONS.write,
    SERVICE_RECEIPT_PERMISSIONS.accept,
    SERVICE_RECEIPT_PERMISSIONS.correct,
    BUSINESS_DOCUMENT_PERMISSIONS.read,
    BUSINESS_DOCUMENT_PERMISSIONS.write,
    EXPENSE_PERMISSIONS.readOwn,
    EXPENSE_PERMISSIONS.submitOwn,
    EXPENSE_PERMISSIONS.read,
    EXPENSE_PERMISSIONS.approve,
    PETTY_CASH_PERMISSIONS.read,
    CASH_ADVANCE_PERMISSIONS.readOwn,
    CASH_ADVANCE_PERMISSIONS.submitOwn,
    CASH_ADVANCE_PERMISSIONS.read,
    "dashboard:read",
    ...APPROVED_BILLING_SCOPE_MANAGER_PERMISSIONS,
  ],
  sales: [
    "customers:read",
    "customers:write",
    "quotations:read",
    "quotations:write",
    "services:read",
    SERVICE_BILLING_SUMMARY_PERMISSIONS.read,
    "services:write",
    INVOICE_PERMISSIONS.read,
    "payments:read",
    EXPENSE_PERMISSIONS.readOwn,
    EXPENSE_PERMISSIONS.submitOwn,
    CASH_ADVANCE_PERMISSIONS.readOwn,
    CASH_ADVANCE_PERMISSIONS.submitOwn,
    "dashboard:read",
  ],
  operations: [
    "customers:read",
    "quotations:read",
    "services:read",
    SERVICE_BILLING_SUMMARY_PERMISSIONS.read,
    "services:update_status",
    "projects:read",
    "projects:write",
    "suppliers:read",
    "suppliers:write",
    PROCUREMENT_COMMITMENT_PERMISSIONS.read,
    SERVICE_RECEIPT_PERMISSIONS.read,
    SERVICE_RECEIPT_PERMISSIONS.write,
    EXPENSE_PERMISSIONS.readOwn,
    EXPENSE_PERMISSIONS.submitOwn,
    CASH_ADVANCE_PERMISSIONS.readOwn,
    CASH_ADVANCE_PERMISSIONS.submitOwn,
    "dashboard:read",
  ],
  accountant: [
    "customers:read",
    "customers:export",
    "quotations:read",
    "services:read",
    SERVICE_BILLING_SUMMARY_PERMISSIONS.read,
    INVOICE_PERMISSIONS.read,
    "payments:read",
    "payments:write",
    "settings:read",
    PROCUREMENT_COMMITMENT_PERMISSIONS.read,
    SERVICE_RECEIPT_PERMISSIONS.read,
    EXPENSE_PERMISSIONS.readOwn,
    EXPENSE_PERMISSIONS.submitOwn,
    EXPENSE_PERMISSIONS.read,
    EXPENSE_PERMISSIONS.approve,
    EXPENSE_PERMISSIONS.financeReview,
    EXPENSE_PERMISSIONS.settle,
    CASH_ADVANCE_PERMISSIONS.readOwn,
    CASH_ADVANCE_PERMISSIONS.submitOwn,
    CASH_ADVANCE_PERMISSIONS.read,
    CASH_ADVANCE_PERMISSIONS.approve,
    CASH_ADVANCE_PERMISSIONS.issue,
    CASH_ADVANCE_PERMISSIONS.settle,
    PETTY_CASH_PERMISSIONS.read,
    PETTY_CASH_PERMISSIONS.manage,
    PETTY_CASH_PERMISSIONS.transact,
    "dashboard:read",
    ...APPROVED_BILLING_SCOPE_ACCOUNTANT_PERMISSIONS,
  ],
  viewer: [
    "customers:read",
    "quotations:read",
    "services:read",
    INVOICE_PERMISSIONS.read,
    "payments:read",
    "projects:read",
    "suppliers:read",
    "dashboard:read",
    "settings:read",
  ],
} as const satisfies Record<CrmRole, readonly string[]>;

export function hasPermissionForRole(
  role: unknown,
  permission: string,
): boolean {
  if (typeof role !== "string") {
    return false;
  }

  const rolePermissions = ROLE_PERMISSIONS[role as CrmRole];
  if (!rolePermissions) {
    return false;
  }

  const permissions: readonly string[] = rolePermissions;
  return (
    permissions.includes("*") ||
    permissions.includes(permission)
  );
}
