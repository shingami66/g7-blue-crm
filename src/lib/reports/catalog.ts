import type { Locale } from "@/lib/i18n/locales";
import type { ReportDefinition } from "./types";

const DEFINITION_COPY = {
  en: {
    ar: {
      title: "Accounts Receivable",
      description: "Billed, collected cash, and outstanding customer balances by invoice.",
      source: "W7D Accounts Receivable RPC",
      freshness: "Recomputed from authoritative records",
    },
    ap: {
      title: "Accounts Payable",
      description: "Approved supplier bills, payments, reversals, and open payable balances.",
      source: "W6 supplier bill payment balances",
      freshness: "Current source records",
    },
    event: {
      title: "Event Economics",
      description: "Managerial event cost, commitment, forecast, and close-state visibility.",
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
      title: "الحسابات الدائنة",
      description: "فواتير الموردين المعتمدة والمدفوعات والعكوس والأرصدة المفتوحة.",
      source: "أرصدة فواتير ومدفوعات الموردين W6",
      freshness: "السجلات الحالية للمصدر",
    },
    event: {
      title: "اقتصاديات الحدث",
      description: "رؤية إدارية لتكلفة الحدث والالتزامات والتوقعات وحالة الإغلاق.",
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
