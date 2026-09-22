import type { Locale } from "../locales";

export interface ReportsDictionary {
  title: string;
  subtitle: string;
  filters: { from: string; to: string; asOf: string; apply: string; last30: string; last90: string; clear: string; period: string; allTime: string; filtered: string; invalidRange: string };
  sections: { salesBilling: string; accountsReceivable: string; receivableSummary: string; ageing: string; operations: string; customers: string; suppliers: string };
  hints: { ageing: string };
  metrics: { quotationCount: string; quotationValue: string; approvedValue: string; billed: string; invoiced: string; collected: string; collectedCash: string; outstanding: string; outstandingReceivable: string; overdue: string; notDue: string; ageing1To30: string; ageing31To60: string; ageing61To90: string; ageing91Plus: string; deposit: string; final: string; activeCustomers: string; outstandingCustomers: string; highestInvoicedCustomers: string; upcomingServices: string; readyToStart: string; inProgress: string; activeAllocations: string; activeBookings: string; internalCost: string };
  tables: { status: string; count: string; invoice: string; invoiceNumber: string; issueDate: string; dueDate: string; service: string; customer: string; amount: string; payment: string; gross: string; creditAdjustments: string; netReceivable: string; settled: string; daysPastDue: string; ageing: string; dueStatus: string; details: string; invoiceDetails: string; close: string; notDueYet: string; overdueBy: string; days: string; reconciliation: string; reconciliationFormula: string; identityUnavailable: string };
  states: { forbidden: string; error: string; empty: string; partial: string; noSupplierAccess: string };
}

const en: ReportsDictionary = {
  title: "Reports Center",
  subtitle: "Read-only operational and billing reporting from current records.",
  filters: { from: "From", to: "To", asOf: "As-of date", apply: "Apply range", last30: "Last 30 days", last90: "Last 90 days", clear: "Clear", period: "Active period", allTime: "All time", filtered: "Filtered period", invalidRange: "The From date must be on or before the To date." },
  sections: { salesBilling: "Sales and billing", accountsReceivable: "Accounts receivable", receivableSummary: "Receivable summary", ageing: "Ageing", operations: "Service operations", customers: "Customer overview", suppliers: "Supplier operations" },
  hints: { ageing: "Distribution of outstanding amounts by time past the due date." },
  metrics: { quotationCount: "Quotations", quotationValue: "Quotation value", approvedValue: "Approved value", billed: "Billed", invoiced: "Invoiced value", collected: "Collected value", collectedCash: "Collected cash", outstanding: "Outstanding", outstandingReceivable: "Outstanding receivable", overdue: "Overdue", notDue: "Not due", ageing1To30: "1–30 days", ageing31To60: "31–60 days", ageing61To90: "61–90 days", ageing91Plus: "91+ days", deposit: "Deposit invoices", final: "Final invoices", activeCustomers: "Active customers", outstandingCustomers: "Customers with balance", highestInvoicedCustomers: "Highest invoiced customers", upcomingServices: "Upcoming services", readyToStart: "Ready to start", inProgress: "In progress", activeAllocations: "Active allocations", activeBookings: "Active bookings", internalCost: "Internal estimated cost" },
  tables: { status: "Status", count: "Count", invoice: "Invoice", invoiceNumber: "Invoice number", issueDate: "Issue date", dueDate: "Due date", service: "Service", customer: "Customer", amount: "Amount", payment: "Payment", gross: "Gross invoice", creditAdjustments: "Internal credit adjustments", netReceivable: "Net receivable", settled: "Settled", daysPastDue: "Days past due", ageing: "Ageing", dueStatus: "Due status", details: "Details", invoiceDetails: "Invoice details", close: "Close", notDueYet: "Not due yet", overdueBy: "Overdue by", days: "days", reconciliation: "Reconciliation", reconciliationFormula: "Gross Invoice − Credit Adjustments = Net Receivable − Settled = Outstanding", identityUnavailable: "Customer identity unavailable" },
  states: { forbidden: "This report is not available for your role.", error: "This report could not be loaded.", empty: "No records match this range.", partial: "Some report categories are unavailable for your role or could not be loaded.", noSupplierAccess: "Supplier operations are restricted to authorized internal roles." },
};

const ar: ReportsDictionary = {
  title: "مركز التقارير",
  subtitle: "تقارير تشغيلية ومالية للقراءة فقط من السجلات الحالية.",
  filters: { from: "من", to: "إلى", asOf: "حتى تاريخ", apply: "تطبيق النطاق", last30: "آخر 30 يوماً", last90: "آخر 90 يوماً", clear: "مسح", period: "الفترة النشطة", allTime: "كل الوقت", filtered: "فترة محددة", invalidRange: "يجب أن يكون تاريخ البدء في أو قبل تاريخ الانتهاء." },
  sections: { salesBilling: "المبيعات والفوترة", accountsReceivable: "مستحقات العملاء", receivableSummary: "ملخص مستحقات العملاء", ageing: "أعمار الديون", operations: "عمليات الخدمات", customers: "نظرة عامة على العملاء", suppliers: "عمليات الموردين" },
  hints: { ageing: "توزيع المبالغ المستحقة حسب مدة التأخر عن تاريخ الاستحقاق." },
  metrics: { quotationCount: "عروض الأسعار", quotationValue: "قيمة عروض الأسعار", approvedValue: "القيمة المعتمدة", billed: "المفوتر", invoiced: "القيمة المفوترة", collected: "القيمة المحصلة", collectedCash: "المبالغ المحصلة", outstanding: "المستحق", outstandingReceivable: "الرصيد المستحق", overdue: "متأخر عن السداد", notDue: "غير مستحق بعد", ageing1To30: "1–30 يوماً", ageing31To60: "31–60 يوماً", ageing61To90: "61–90 يوماً", ageing91Plus: "91 يوماً فأكثر", deposit: "فواتير الدفعة المقدمة", final: "الفواتير النهائية", activeCustomers: "العملاء النشطون", outstandingCustomers: "عملاء لديهم رصيد", highestInvoicedCustomers: "العملاء الأعلى فوترة", upcomingServices: "الخدمات القادمة", readyToStart: "جاهزة للبدء", inProgress: "قيد التنفيذ", activeAllocations: "التخصيصات النشطة", activeBookings: "الحجوزات النشطة", internalCost: "التكلفة التقديرية الداخلية" },
  tables: { status: "الحالة", count: "العدد", invoice: "الفاتورة", invoiceNumber: "رقم الفاتورة", issueDate: "تاريخ الإصدار", dueDate: "تاريخ الاستحقاق", service: "الخدمة", customer: "العميل", amount: "المبلغ", payment: "الدفعة", gross: "إجمالي الفاتورة", creditAdjustments: "تعديلات الرصيد المستحق", netReceivable: "صافي المستحق", settled: "المسدد", daysPastDue: "أيام التأخير", ageing: "أعمار الديون", dueStatus: "حالة الاستحقاق", details: "التفاصيل", invoiceDetails: "تفاصيل الفاتورة", close: "إغلاق", notDueYet: "غير مستحق بعد", overdueBy: "متأخر", days: "يومًا", reconciliation: "التسوية", reconciliationFormula: "إجمالي الفاتورة − تعديلات الرصيد المستحق = صافي المستحق − المسدد = الرصيد المستحق", identityUnavailable: "هوية العميل غير متاحة" },
  states: { forbidden: "هذا التقرير غير متاح لدورك.", error: "تعذر تحميل هذا التقرير.", empty: "لا توجد سجلات ضمن هذا النطاق.", partial: "بعض فئات التقارير غير متاحة لدورك أو تعذر تحميلها.", noSupplierAccess: "عمليات الموردين مقيدة بالأدوار الداخلية المصرح لها." },
};

export function getReportsDictionary(locale: Locale): ReportsDictionary { return locale === "ar" ? ar : en; }
