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
