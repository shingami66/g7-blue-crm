import type { Locale } from "@/lib/i18n/locales";
import type { ReportDefinition } from "./types";

const DEFINITION_COPY = {
  en: {
    ar: {
      title: "Customer Receivables",
      description: "Invoices, customer collections, and outstanding balances for the selected period.",
      source: "W7D Accounts Receivable RPC",
      freshness: "Recomputed from authoritative records",
    },
    ap: {
      title: "Supplier Payables",
      description: "Supplier bills, payments, and remaining balances from current records.",
      source: "W6 supplier bill payment balances",
      freshness: "Current source records",
    },
    event: {
      title: "Event Cost & Margin",
      description: "A managerial view of event costs, commitments, forecasts, and margins.",
      source: "W8 Event Costing and Event Cost Close",
      freshness: "Recomputed as of the selected date",
    },
    gl: { title: "General Ledger", description: "Posted journal detail and account balances under accounting-date and recorded-at cutoffs." },
    tb: { title: "Trial Balance", description: "Opening, period, and ending debit and credit balances from posted journals." },
    pnl: { title: "Profit & Loss", description: "Mapped Revenue and Expense activity from posted accounting journals." },
    bs: { title: "Balance Sheet", description: "Mapped Assets, Liabilities, Equity, and the presentation-only current-year result." },
  },
  ar: {
    ar: {
      title: "مستحقات العملاء",
      description: "المفوتر والتحصيل النقدي والأرصدة المستحقة حسب الفاتورة.",
      source: "دالة مستحقات العملاء W7D",
      freshness: "إعادة احتساب من السجلات المعتمدة",
    },
    ap: {
      title: "مستحقات الموردين",
      description: "فواتير الموردين ومدفوعاتهم والأرصدة المتبقية من السجلات الحالية.",
      source: "أرصدة فواتير ومدفوعات الموردين W6",
      freshness: "السجلات الحالية للمصدر",
    },
    event: {
      title: "تكاليف وهوامش الفعاليات",
      description: "عرض إداري لتكاليف الفعاليات والالتزامات والتوقعات والهوامش.",
      source: "تكلفة الحدث وإغلاق التكلفة W8",
      freshness: "إعادة احتساب حتى التاريخ المحدد",
    },
    gl: { title: "دفتر الأستاذ العام", description: "تفاصيل القيود المرحلة وأرصدة الحسابات حسب تاريخ المحاسبة ووقت التسجيل." },
    tb: { title: "ميزان المراجعة", description: "الأرصدة الافتتاحية وحركة الفترة والأرصدة الختامية المدينة والدائنة من القيود المرحلة." },
    pnl: { title: "الأرباح والخسائر", description: "حركة الإيرادات والمصروفات المصنفة من القيود المحاسبية المرحلة." },
    bs: { title: "الميزانية العمومية", description: "الأصول والالتزامات وحقوق الملكية والنتيجة الحالية للسنة لأغراض العرض فقط." },
  },
} as const;

export function getReportDefinitions(locale: Locale): ReportDefinition[] {
  const copy = DEFINITION_COPY[locale];
  return [
    {
      key: "accounts_receivable",
      category: "financial_operations",
      title: copy.ar.title,
      description: copy.ar.description,
      route: "/reports/accounts-receivable",
      requiredPermissions: ["invoices:read"],
      timeModel: "period_and_as_of",
      sourceDomain: copy.ar.source,
      freshness: copy.ar.freshness,
      exportSupported: true,
      confidentiality: "financial",
    },
    {
      key: "accounts_payable",
      category: "financial_operations",
      title: copy.ap.title,
      description: copy.ap.description,
      route: "/reports/accounts-payable",
      requiredPermissions: ["supplier_bills:read", "supplier_payments:read"],
      timeModel: "current_only",
      sourceDomain: copy.ap.source,
      freshness: copy.ap.freshness,
      exportSupported: true,
      confidentiality: "financial",
    },
    {
      key: "event_economics",
      category: "event_costing",
      title: copy.event.title,
      description: copy.event.description,
      route: "/reports/event-economics",
      requiredPermissions: ["services:read", "supplier_costing:read"],
      timeModel: "historical_as_of",
      sourceDomain: copy.event.source,
      freshness: copy.event.freshness,
      exportSupported: true,
      confidentiality: "internal_costing",
    },
    ...([
      { key: "general_ledger", copy: copy.gl, route: "/reports/general-ledger", permission: "accounting:view", source: "W10H posted journal report", timeModel: "period_and_as_of" },
      { key: "trial_balance", copy: copy.tb, route: "/reports/trial-balance", permission: "accounting:view", source: "W10H posted journal report", timeModel: "period_and_as_of" },
      { key: "profit_and_loss", copy: copy.pnl, route: "/reports/profit-and-loss", permission: "accounting:view_statements", source: "W10H statement mappings and posted journals", timeModel: "period_and_as_of" },
      { key: "balance_sheet", copy: copy.bs, route: "/reports/balance-sheet", permission: "accounting:view_statements", source: "W10H statement mappings and posted journals", timeModel: "historical_as_of" },
    ] as const).map(({ key, copy: item, route, permission, source, timeModel }) => ({
      key,
      category: "financial_operations" as const,
      title: item.title,
      description: item.description,
      route,
      requiredPermissions: [permission],
      timeModel,
      sourceDomain: source,
      freshness: locale === "ar" ? "تقرير محاسبي داخلي مؤقت" : "Provisional internal accounting report",
      exportSupported: true,
      confidentiality: "financial" as const,
    })),
  ];
}

export function filterAuthorizedReportDefinitions(
  definitions: readonly ReportDefinition[],
  effectivePermissions: ReadonlyMap<string, boolean>,
): ReportDefinition[] {
  return definitions.filter((definition) =>
    definition.requiredPermissions.every((permission) => effectivePermissions.get(permission) === true),
  );
}
