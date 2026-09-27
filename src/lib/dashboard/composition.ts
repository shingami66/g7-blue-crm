export type DashboardSensitivity = "operational" | "financial" | "internal_costing";
export type DashboardTimeSemantics = "current" | "historical_as_of_riyadh_date" | "current_only";

export type DashboardContribution = {
  id: string;
  requiredEffectivePermissions: readonly string[];
  sensitivity: DashboardSensitivity;
  destination: string;
  displayPriority: number;
  sourceDomain: string;
  timeSemantics: DashboardTimeSemantics;
};

export type DashboardWidgetDefinition = DashboardContribution & { kind: "widget" };
export type DashboardActionDefinition = DashboardContribution & { kind: "action" };
export type DashboardQuickActionDefinition = DashboardContribution & { kind: "quick-action" };

export const DASHBOARD_WIDGETS = [
  {
    kind: "widget",
    id: "customers",
    requiredEffectivePermissions: ["customers:read"],
    sensitivity: "operational",
    destination: "/customers",
    displayPriority: 10,
    sourceDomain: "customers",
    timeSemantics: "current",
  },
  {
    kind: "widget",
    id: "quotations",
    requiredEffectivePermissions: ["quotations:read"],
    sensitivity: "operational",
    destination: "/quotations",
    displayPriority: 20,
    sourceDomain: "quotations",
    timeSemantics: "current",
  },
  {
    kind: "widget",
    id: "services",
    requiredEffectivePermissions: ["services:read"],
    sensitivity: "operational",
    destination: "/services",
    displayPriority: 30,
    sourceDomain: "services",
    timeSemantics: "current",
  },
  {
    kind: "widget",
    id: "service-lifecycle",
    requiredEffectivePermissions: ["services:read"],
    sensitivity: "operational",
    destination: "/services",
    displayPriority: 40,
    sourceDomain: "service_lifecycle_states",
    timeSemantics: "current",
  },
  {
    kind: "widget",
    id: "accounts-receivable",
    requiredEffectivePermissions: ["invoices:read"],
    sensitivity: "financial",
    destination: "/reports/accounts-receivable",
    displayPriority: 50,
    sourceDomain: "accounts_receivable_report",
    timeSemantics: "historical_as_of_riyadh_date",
  },
  {
    kind: "widget",
    id: "accounts-payable",
    requiredEffectivePermissions: ["supplier_bills:read", "supplier_payments:read"],
    sensitivity: "financial",
    destination: "/reports/accounts-payable",
    displayPriority: 60,
    sourceDomain: "supplier_bill_payment_balances",
    timeSemantics: "current_only",
  },
  {
    kind: "widget",
    id: "event-economics",
    requiredEffectivePermissions: ["services:read", "supplier_costing:read"],
    sensitivity: "internal_costing",
    destination: "/reports/event-economics",
    displayPriority: 70,
    sourceDomain: "event_economics_report",
    timeSemantics: "historical_as_of_riyadh_date",
  },
  {
    kind: "widget",
    id: "recent-quotations",
    requiredEffectivePermissions: ["quotations:read"],
    sensitivity: "operational",
    destination: "/quotations",
    displayPriority: 80,
    sourceDomain: "quotations",
    timeSemantics: "current",
  },
  {
    kind: "widget",
    id: "recent-payments",
    requiredEffectivePermissions: ["payments:read"],
    sensitivity: "financial",
    destination: "/payments",
    displayPriority: 90,
    sourceDomain: "payments",
    timeSemantics: "current",
  },
] as const satisfies readonly DashboardWidgetDefinition[];

export const DASHBOARD_ACTION_GROUPS = [
  {
    kind: "action",
    id: "invoice-follow-up",
    requiredEffectivePermissions: ["invoices:read"],
    sensitivity: "financial",
    destination: "/reports/accounts-receivable",
    displayPriority: 10,
    sourceDomain: "accounts_receivable_report",
    timeSemantics: "historical_as_of_riyadh_date",
  },
  {
    kind: "action",
    id: "quotation-approval",
    requiredEffectivePermissions: ["quotations:read", "quotations:approve"],
    sensitivity: "operational",
    destination: "/quotations",
    displayPriority: 20,
    sourceDomain: "quotation_workflow",
    timeSemantics: "current",
  },
  {
    kind: "action",
    id: "service-start",
    requiredEffectivePermissions: ["services:read", "services:update_status"],
    sensitivity: "operational",
    destination: "/services",
    displayPriority: 30,
    sourceDomain: "service_lifecycle_states",
    timeSemantics: "current",
  },
  {
    kind: "action",
    id: "expense-finance-review",
    requiredEffectivePermissions: ["expenses:read", "expenses:finance_review"],
    sensitivity: "financial",
    destination: "/expenses",
    displayPriority: 40,
    sourceDomain: "expense_accountability_summaries",
    timeSemantics: "current",
  },
  {
    kind: "action",
    id: "cash-advance-issue",
    requiredEffectivePermissions: ["cash_advances:read", "cash_advances:issue"],
    sensitivity: "financial",
    destination: "/advances",
    displayPriority: 50,
    sourceDomain: "employee_cash_advances",
    timeSemantics: "current",
  },
] as const satisfies readonly DashboardActionDefinition[];

export const DASHBOARD_QUICK_ACTIONS = [
  {
    kind: "quick-action",
    id: "new-customer",
    requiredEffectivePermissions: ["customers:write"],
    sensitivity: "operational",
    destination: "/customers",
    displayPriority: 10,
    sourceDomain: "customers",
    timeSemantics: "current",
  },
  {
    kind: "quick-action",
    id: "new-quotation",
    requiredEffectivePermissions: ["quotations:write"],
    sensitivity: "operational",
    destination: "/quotations",
    displayPriority: 20,
    sourceDomain: "quotations",
    timeSemantics: "current",
  },
  {
    kind: "quick-action",
    id: "new-invoice",
    requiredEffectivePermissions: ["invoices:write", "services:read"],
    sensitivity: "financial",
    destination: "/invoices",
    displayPriority: 30,
    sourceDomain: "invoices",
    timeSemantics: "current",
  },
  {
    kind: "quick-action",
    id: "new-service",
    requiredEffectivePermissions: ["services:write"],
    sensitivity: "operational",
    destination: "/services/new",
    displayPriority: 40,
    sourceDomain: "services",
    timeSemantics: "current",
  },
] as const satisfies readonly DashboardQuickActionDefinition[];

const ALL_CONTRIBUTIONS: readonly DashboardContribution[] = [
  ...DASHBOARD_WIDGETS,
  ...DASHBOARD_ACTION_GROUPS,
  ...DASHBOARD_QUICK_ACTIONS,
];

export function getDashboardPermissionsToResolve(): string[] {
  return [...new Set(ALL_CONTRIBUTIONS.flatMap((contribution) => contribution.requiredEffectivePermissions))];
}

function isAllowed(
  contribution: DashboardContribution,
  effectivePermissions: ReadonlySet<string>,
): boolean {
  return contribution.requiredEffectivePermissions.every((permission) => effectivePermissions.has(permission));
}

export function composeDashboard(effectivePermissions: ReadonlySet<string>) {
  return {
    widgets: DASHBOARD_WIDGETS.filter((item) => isAllowed(item, effectivePermissions)),
    actionGroups: DASHBOARD_ACTION_GROUPS.filter((item) => isAllowed(item, effectivePermissions)),
    quickActions: DASHBOARD_QUICK_ACTIONS.filter((item) => isAllowed(item, effectivePermissions)),
  };
}
