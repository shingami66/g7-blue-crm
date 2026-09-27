import type { Locale } from "../locales.ts";

export interface DashboardW9BDictionary {
  sections: {
    businessSnapshot: string;
    actionCenter: string;
    serviceLifecycle: string;
    operationsFocus: string;
    recentActivity: string;
    recentQuotations: string;
    recentPayments: string;
    costingCompleteness: string;
    actionCenterDescription: string;
    operationsFocusDescription: string;
    recentActivityDescription: string;
  };
  widgets: {
    accountsReceivable: string;
    accountsPayable: string;
    eventEconomics: string;
  };
  metrics: {
    customers: string;
    quotations: string;
    services: string;
    collectedCash: string;
    outstandingReceivables: string;
    overdueReceivables: string;
    openInvoices: string;
    payable: string;
    paid: string;
    outstandingPayables: string;
    openBills: string;
    openEvents: string;
    closedEvents: string;
    completeEvents: string;
    partialEvents: string;
    unavailableEvents: string;
    readyToStart: string;
    inProgress: string;
    upcoming: string;
  };
  groups: {
    invoiceFollowUp: string;
    quotationApprovals: string;
    servicesToStart: string;
    expenseFinanceReview: string;
    cashAdvancesToIssue: string;
  };
  actions: {
    newCustomer: string;
    newQuotation: string;
    newInvoice: string;
    newService: string;
    viewAll: string;
    asOf: string;
    currentBalancesOnly: string;
    currentRecords: string;
  };
  states: {
    unavailable: string;
    noRecords: string;
    noActions: string;
    noUpcomingServices: string;
    noRecentQuotations: string;
    noRecentPayments: string;
    noOutstandingInvoices: string;
    noPendingQuotationApprovals: string;
    noReadyToStart: string;
    noExpenseFinanceReviews: string;
    noCashAdvancesToIssue: string;
    completenessUnavailable: string;
    partialCompleteness: string;
  };
}

const en: DashboardW9BDictionary = {
  sections: {
    businessSnapshot: "Business snapshot",
    actionCenter: "Action center",
    serviceLifecycle: "Service lifecycle",
    operationsFocus: "Operations focus",
    recentActivity: "Recent activity",
    recentQuotations: "Recent quotations",
    recentPayments: "Recent payments",
    costingCompleteness: "Costing completeness",
    actionCenterDescription: "Items available for follow-up or a decision.",
    operationsFocusDescription: "Scheduled services in the current operational view.",
    recentActivityDescription: "Recent quotation and payment records.",
  },
  widgets: {
    accountsReceivable: "Customer receivables",
    accountsPayable: "Supplier payables",
    eventEconomics: "Event costing status",
  },
  metrics: {
    customers: "Customers",
    quotations: "Quotations",
    services: "Active services",
    collectedCash: "Cash collected",
    outstandingReceivables: "Outstanding receivables",
    overdueReceivables: "Overdue receivables",
    openInvoices: "Open invoices",
    payable: "Payable",
    paid: "Paid",
    outstandingPayables: "Outstanding payables",
    openBills: "Open bills",
    openEvents: "Open events",
    closedEvents: "Closed events",
    completeEvents: "Complete costing",
    partialEvents: "Partial costing",
    unavailableEvents: "Unavailable costing",
    readyToStart: "Ready to start",
    inProgress: "In progress",
    upcoming: "Upcoming services",
  },
  groups: {
    invoiceFollowUp: "Customer invoice follow-up",
    quotationApprovals: "Quotation approvals",
    servicesToStart: "Services ready to start",
    expenseFinanceReview: "Expense finance review",
    cashAdvancesToIssue: "Approved cash advances to issue",
  },
  actions: {
    newCustomer: "New customer",
    newQuotation: "New quotation",
    newInvoice: "New invoice",
    newService: "New service",
    viewAll: "View all",
    asOf: "As of",
    currentBalancesOnly: "Current balances only; not a historical view.",
    currentRecords: "Current records",
  },
  states: {
    unavailable: "This source is temporarily unavailable.",
    noRecords: "No matching records.",
    noActions: "No assigned actions in the available queues.",
    noUpcomingServices: "No upcoming services.",
    noRecentQuotations: "No recent quotations.",
    noRecentPayments: "No recent payments.",
    noOutstandingInvoices: "No outstanding invoices as of this date.",
    noPendingQuotationApprovals: "No pending quotation approvals.",
    noReadyToStart: "No services meet the current start gate.",
    noExpenseFinanceReviews: "No expenses are awaiting finance review.",
    noCashAdvancesToIssue: "No approved cash advances are awaiting issue.",
    completenessUnavailable: "Cost completeness is unavailable; counts are not shown as zero.",
    partialCompleteness: "Some event cost records are incomplete.",
  },
};

const ar: DashboardW9BDictionary = {
  sections: {
    businessSnapshot: "ملخص الأعمال",
    actionCenter: "مركز الإجراءات",
    serviceLifecycle: "دورة حياة الخدمة",
    operationsFocus: "محور العمليات",
    recentActivity: "النشاط الأخير",
    recentQuotations: "أحدث عروض الأسعار",
    recentPayments: "أحدث المدفوعات",
    costingCompleteness: "اكتمال التكاليف",
    actionCenterDescription: "عناصر متاحة للمتابعة أو اتخاذ قرار.",
    operationsFocusDescription: "الخدمات المجدولة في العرض التشغيلي الحالي.",
    recentActivityDescription: "سجلات عروض الأسعار والمدفوعات الأخيرة.",
  },
  widgets: {
    accountsReceivable: "ذمم العملاء المدينة",
    accountsPayable: "ذمم الموردين الدائنة",
    eventEconomics: "حالة تكاليف الفعاليات",
  },
  metrics: {
    customers: "العملاء",
    quotations: "عروض الأسعار",
    services: "الخدمات النشطة",
    collectedCash: "النقد المحصل",
    outstandingReceivables: "المبالغ المستحقة للعملاء",
    overdueReceivables: "المبالغ المتأخرة للعملاء",
    openInvoices: "الفواتير المفتوحة",
    payable: "المستحق للموردين",
    paid: "المدفوع للموردين",
    outstandingPayables: "المتبقي للموردين",
    openBills: "الفواتير المفتوحة",
    openEvents: "الفعاليات المفتوحة",
    closedEvents: "الفعاليات المغلقة",
    completeEvents: "تكاليف مكتملة",
    partialEvents: "تكاليف جزئية",
    unavailableEvents: "تكاليف غير متاحة",
    readyToStart: "جاهزة للبدء",
    inProgress: "قيد التنفيذ",
    upcoming: "الخدمات القادمة",
  },
  groups: {
    invoiceFollowUp: "متابعة فواتير العملاء",
    quotationApprovals: "اعتماد عروض الأسعار",
    servicesToStart: "خدمات جاهزة للبدء",
    expenseFinanceReview: "مراجعة المصروفات المالية",
    cashAdvancesToIssue: "سلف معتمدة بانتظار الصرف",
  },
  actions: {
    newCustomer: "عميل جديد",
    newQuotation: "عرض سعر جديد",
    newInvoice: "فاتورة جديدة",
    newService: "خدمة جديدة",
    viewAll: "عرض الكل",
    asOf: "حتى تاريخ",
    currentBalancesOnly: "الأرصدة الحالية فقط؛ لا تمثل عرضًا تاريخيًا.",
    currentRecords: "السجلات الحالية",
  },
  states: {
    unavailable: "هذا المصدر غير متاح مؤقتًا.",
    noRecords: "لا توجد سجلات مطابقة.",
    noActions: "لا توجد إجراءات مسندة في قوائم العمل المتاحة.",
    noUpcomingServices: "لا توجد خدمات قادمة.",
    noRecentQuotations: "لا توجد عروض أسعار حديثة.",
    noRecentPayments: "لا توجد مدفوعات حديثة.",
    noOutstandingInvoices: "لا توجد فواتير مستحقة حتى هذا التاريخ.",
    noPendingQuotationApprovals: "لا توجد عروض أسعار بانتظار الاعتماد.",
    noReadyToStart: "لا توجد خدمات تستوفي شروط البدء الحالية.",
    noExpenseFinanceReviews: "لا توجد مصروفات بانتظار المراجعة المالية.",
    noCashAdvancesToIssue: "لا توجد سلف معتمدة بانتظار الصرف.",
    completenessUnavailable: "بيانات اكتمال التكاليف غير متاحة؛ لن تُعرض الأعداد كصفر.",
    partialCompleteness: "بعض سجلات تكاليف الفعاليات غير مكتملة.",
  },
};

export function getDashboardW9BDictionary(locale: Locale): DashboardW9BDictionary {
  return locale === "ar" ? ar : en;
}
