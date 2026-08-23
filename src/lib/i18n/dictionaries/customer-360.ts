import type { Locale } from "../locales";

export interface Customer360Dictionary {
  title: string;
  subtitle: string;
  summary: { invoiced: string; collected: string; outstanding: string; upcoming: string };
  sections: { overview: string; services: string; billing: string; activity: string; quotations: string; invoices: string; payments: string; operationalActivity: string; financialActivity: string };
  activity: { service: string; invoice: string; payment: string; amount: string };
  columns: { quotation: string; invoice: string; payment: string; date: string; status: string; amount: string; service: string; reference: string };
  states: { forbidden: string; error: string; empty: string; noServices: string; noUpcoming: string; noActivity: string };
  links: { view: string; viewAll: string; viewCustomer: string };
}

const en: Customer360Dictionary = {
  title: "Customer 360",
  subtitle: "A permission-safe view of the customer relationship, operations, and financial history.",
  summary: { invoiced: "Total invoiced", collected: "Total collected", outstanding: "Outstanding balance", upcoming: "Upcoming services" },
  sections: { overview: "Overview", services: "Services", billing: "Billing records", activity: "Activity", quotations: "Quotations", invoices: "Invoices", payments: "Payments", operationalActivity: "Recent operational activity", financialActivity: "Recent financial activity" },
  activity: { service: "Service", invoice: "Invoice", payment: "Payment", amount: "Amount" },
  columns: { quotation: "Quotation", invoice: "Invoice", payment: "Payment", date: "Date", status: "Status", amount: "Amount", service: "Service", reference: "Reference" },
  states: { forbidden: "This information is not available for your role.", error: "This information could not be loaded.", empty: "No records found.", noServices: "No services found.", noUpcoming: "No upcoming services.", noActivity: "No recent activity." },
  links: { view: "View", viewAll: "View all", viewCustomer: "View customer" },
};

const ar: Customer360Dictionary = {
  title: "نظرة 360 للعميل",
  subtitle: "عرض آمن حسب الصلاحية لعلاقة العميل وعملياته وسجله المالي.",
  summary: { invoiced: "إجمالي الفوترة", collected: "إجمالي المحصل", outstanding: "الرصيد المستحق", upcoming: "الخدمات القادمة" },
  sections: { overview: "نظرة عامة", services: "الخدمات", billing: "السجلات المالية", activity: "النشاطات", quotations: "عروض الأسعار", invoices: "الفواتير", payments: "المدفوعات", operationalActivity: "آخر النشاطات التشغيلية", financialActivity: "آخر النشاطات المالية" },
  activity: { service: "خدمة", invoice: "فاتورة", payment: "دفعة", amount: "المبلغ" },
  columns: { quotation: "عرض السعر", invoice: "الفاتورة", payment: "الدفعة", date: "التاريخ", status: "الحالة", amount: "المبلغ", service: "الخدمة", reference: "المرجع" },
  states: { forbidden: "هذه المعلومات غير متاحة لدورك.", error: "تعذر تحميل هذه المعلومات.", empty: "لا توجد سجلات.", noServices: "لا توجد خدمات.", noUpcoming: "لا توجد خدمات قادمة.", noActivity: "لا توجد نشاطات حديثة." },
  links: { view: "عرض", viewAll: "عرض الكل", viewCustomer: "عرض العميل" },
};

export function getCustomer360Dictionary(locale: Locale): Customer360Dictionary { return locale === "ar" ? ar : en; }
