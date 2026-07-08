export const APPROVED_BILLING_SCOPE_PERMISSIONS = {
  read: "approvedBillingScopes:read",
  create: "approvedBillingScopes:create",
  update: "approvedBillingScopes:update",
  review: "approvedBillingScopes:review",
  approve: "approvedBillingScopes:approve",
  void: "approvedBillingScopes:void",
  supersede: "approvedBillingScopes:supersede",
  discard: "approvedBillingScopes:discard",
} as const;

export type ApprovedBillingScopePermission =
  (typeof APPROVED_BILLING_SCOPE_PERMISSIONS)[keyof typeof APPROVED_BILLING_SCOPE_PERMISSIONS];

export const APPROVED_BILLING_SCOPE_MANAGER_PERMISSIONS: ApprovedBillingScopePermission[] =
  [
    APPROVED_BILLING_SCOPE_PERMISSIONS.read,
    APPROVED_BILLING_SCOPE_PERMISSIONS.create,
    APPROVED_BILLING_SCOPE_PERMISSIONS.update,
    APPROVED_BILLING_SCOPE_PERMISSIONS.review,
    APPROVED_BILLING_SCOPE_PERMISSIONS.approve,
    APPROVED_BILLING_SCOPE_PERMISSIONS.void,
    APPROVED_BILLING_SCOPE_PERMISSIONS.supersede,
    APPROVED_BILLING_SCOPE_PERMISSIONS.discard,
  ];

export const APPROVED_BILLING_SCOPE_ACCOUNTANT_PERMISSIONS: ApprovedBillingScopePermission[] =
  [APPROVED_BILLING_SCOPE_PERMISSIONS.read];
