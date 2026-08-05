import type { Locale } from "../locales";

export interface DashboardAdvancementDictionary {
  operationsTitle: string;
  upcoming: string;
  readyToStart: string;
  inProgress: string;
  attentionTitle: string;
  outstandingInvoices: string;
  recentPayments: string;
  noUpcoming: string;
  noAttention: string;
  noPayments: string;
}

const en: DashboardAdvancementDictionary = { operationsTitle: "Operations focus", upcoming: "Upcoming services", readyToStart: "Ready to start", inProgress: "In progress", attentionTitle: "Attention needed", outstandingInvoices: "Invoices with balance", recentPayments: "Recent payments", noUpcoming: "No upcoming services.", noAttention: "No attention items.", noPayments: "No recent payments." };
const ar: DashboardAdvancementDictionary = { operationsTitle: "محور العمليات", upcoming: "الخدمات القادمة", readyToStart: "جاهزة للبدء", inProgress: "قيد التنفيذ", attentionTitle: "تحتاج إلى متابعة", outstandingInvoices: "فواتير ذات رصيد", recentPayments: "آخر المدفوعات", noUpcoming: "لا توجد خدمات قادمة.", noAttention: "لا توجد عناصر تحتاج متابعة.", noPayments: "لا توجد مدفوعات حديثة." };

export function getDashboardAdvancementDictionary(locale: Locale): DashboardAdvancementDictionary { return locale === "ar" ? ar : en; }
