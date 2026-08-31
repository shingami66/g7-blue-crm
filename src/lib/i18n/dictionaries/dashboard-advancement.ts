import type { Locale } from "../locales";

export interface DashboardAdvancementDictionary {
  operationsTitle: string;
  upcoming: string;
  readyToStart: string;
  inProgress: string;
  attentionTitle: string;
  outstandingInvoices: string;
  pendingQuotationApprovals: string;
  recentPayments: string;
  noUpcoming: string;
  noAttention: string;
  noPendingQuotationApprovals: string;
  noReadyToStart: string;
  noPayments: string;
}

const en: DashboardAdvancementDictionary = { operationsTitle: "Operations focus", upcoming: "Upcoming services", readyToStart: "Ready to start", inProgress: "In progress", attentionTitle: "Attention needed", outstandingInvoices: "Invoices with balance", pendingQuotationApprovals: "Quotation approvals", recentPayments: "Recent payments", noUpcoming: "No upcoming services.", noAttention: "No attention items.", noPendingQuotationApprovals: "No pending quotation approvals.", noReadyToStart: "No services ready to start.", noPayments: "No recent payments." };
const ar: DashboardAdvancementDictionary = { operationsTitle: "محور العمليات", upcoming: "الخدمات القادمة", readyToStart: "جاهزة للبدء", inProgress: "قيد التنفيذ", attentionTitle: "تحتاج إلى متابعة", outstandingInvoices: "فواتير ذات رصيد", pendingQuotationApprovals: "عروض أسعار بانتظار الاعتماد", recentPayments: "آخر المدفوعات", noUpcoming: "لا توجد خدمات قادمة.", noAttention: "لا توجد عناصر تحتاج متابعة.", noPendingQuotationApprovals: "لا توجد عروض أسعار بانتظار الاعتماد.", noReadyToStart: "لا توجد خدمات جاهزة للبدء.", noPayments: "لا توجد مدفوعات حديثة." };

export function getDashboardAdvancementDictionary(locale: Locale): DashboardAdvancementDictionary { return locale === "ar" ? ar : en; }
