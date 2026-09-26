import type { Locale } from "../locales";

export type ReportCenterDictionary = {
  title: string;
  subtitle: string;
  catalog: {
    financialOperations: string;
    eventCosting: string;
    open: string;
    unavailable: string;
    exportAvailable: string;
    noExport: string;
  };
  workspace: {
    source: string;
    timeBasis: string;
    freshness: string;
    timezone: string;
    period: string;
    fromDate: string;
    toDate: string;
    asOf: string;
    currentOnly: string;
    historicalAsOf: string;
    periodAndAsOf: string;
    definition: string;
    export: string;
    generated: string;
    filters: string;
    apply: string;
    clear: string;
    search: string;
    noRows: string;
    unavailable: string;
    forbidden: string;
    error: string;
    invalid: string;
    partial: string;
    empty: string;
    drill: string;
    rows: string;
    exportedRows: string;
    exportLimit: string;
    previous: string;
    next: string;
  };
  data: {
    customerNumber: string;
    serviceNumber: string;
    serviceTitle: string;
    creditAdjustment: string;
    creditApplication: string;
    daysPastDue: string;
    ageingBand: string;
    advanceAllocated: string;
    currency: string;
    closeVersion: string;
    closeEffectiveDate: string;
    closedAt: string;
  };
  ar: {
    title: string;
    description: string;
    presentationDescription: string;
    historicalLabel: string;
    reportDetails: string;
    invoicesHeading: string;
    invoiceCountSingular: string;
    invoiceCountPlural: string;
    billed: string;
    collectedCash: string;
    outstanding: string;
    overdue: string;
    notDue: string;
    oneToThirty: string;
    thirtyOneToSixty: string;
    sixtyOneToNinety: string;
    ninetyOnePlus: string;
    customerRanking: string;
    customer: string;
    invoice: string;
    service: string;
    issueDate: string;
    dueDate: string;
    gross: string;
    credits: string;
    net: string;
    settled: string;
    outstandingColumn: string;
    ageing: string;
    noCustomerIdentity: string;
    noServiceIdentity: string;
  };
  ap: {
    title: string;
    description: string;
    reportDetails: string;
    payable: string;
    summaryPayables: string;
    paid: string;
    outstanding: string;
    openBills: string;
    currentOnlyLabel: string;
    currentOnly: string;
    updated: string;
    generatedAt: string;
    source: string;
    bill: string;
    invoicesHeading: string;
    billCountSingular: string;
    billCountPlural: string;
    supplier: string;
    service: string;
    invoiceDate: string;
    dueDate: string;
    status: string;
    noSupplierIdentity: string;
    noServiceIdentity: string;
    allStatuses: string;
    unpaid: string;
    partiallyPaid: string;
    paidStatus: string;
  };
  event: {
    title: string;
    description: string;
    eventService: string;
    approvedBudget: string;
    commitment: string;
    actual: string;
    paid: string;
    outstanding: string;
    etc: string;
    eac: string;
    commercialValue: string;
    forecastMargin: string;
    completeness: string;
    status: string;
    closeState: string;
    open: string;
    closed: string;
    finalActual: string;
    finalMargin: string;
    noFinalForOpen: string;
    noCustomerIdentity: string;
    complete: string;
    partial: string;
    unavailable: string;
    allCompleteness: string;
    allCloseStates: string;
    includedEvents: string;
    eventsShown: string;
    summaryCounts: string;
    historicalLabel: string;
    reportDetails: string;
    incompleteSourceWarning: string;
    completenessSummaryUnavailable: string;
    incompleteExportWarning: string;
    views: {
      selector: string;
      overview: string;
      costAnalysis: string;
      commercialClose: string;
    };
  };
};

const en: ReportCenterDictionary = {
  title: "Reports Center",
  subtitle: "Named, read-only reports backed by authoritative operational sources.",
  catalog: {
    financialOperations: "Financial operations",
    eventCosting: "Event and costing",
    open: "Open report",
    unavailable: "Unavailable for this role",
    exportAvailable: "Bounded Excel export",
    noExport: "Export unavailable",
  },
  workspace: {
    source: "Source",
    timeBasis: "Time basis",
    freshness: "Freshness",
    timezone: "Riyadh time",
    period: "Period",
    fromDate: "From",
    toDate: "To",
    asOf: "As of",
    currentOnly: "Current records only",
    historicalAsOf: "Historical as-of reconstruction",
    periodAndAsOf: "Period with explicit as-of date",
    definition: "What this report answers",
    export: "Export",
    generated: "Generated",
    filters: "Filters",
    apply: "Apply",
    clear: "Clear",
    search: "Search",
    noRows: "No records match the selected filters.",
    unavailable: "The authoritative source is unavailable. No zero values are shown.",
    forbidden: "This report is not available for your role.",
    error: "The report could not be loaded.",
    invalid: "The selected date is invalid. Choose a valid calendar date.",
    partial: "The report is available with incomplete source coverage.",
    empty: "No records are available for the selected filters.",
    drill: "Open source record",
    rows: "Rows",
    exportedRows: "Rows exported",
    exportLimit: "Export limit",
    previous: "Previous",
    next: "Next",
  },
  data: {
    customerNumber: "Customer number",
    serviceNumber: "Service number",
    serviceTitle: "Service title",
    creditAdjustment: "Credit adjustment",
    creditApplication: "Credit application",
    daysPastDue: "Days past due",
    ageingBand: "Ageing band",
    advanceAllocated: "Advance allocated",
    currency: "Currency",
    closeVersion: "Close version",
    closeEffectiveDate: "Close effective date",
    closedAt: "Closed at",
  },
  ar: {
    title: "Customer Receivables",
    description: "Invoices, collections, and balances returned by the authoritative accounts receivable source.",
    presentationDescription: "Invoices, payments, and what customers still owe.",
    historicalLabel: "Historical",
    reportDetails: "Report details",
    invoicesHeading: "Invoices",
    invoiceCountSingular: "invoice",
    invoiceCountPlural: "invoices",
    billed: "Billed",
    collectedCash: "Collected Cash",
    outstanding: "Outstanding",
    overdue: "Overdue",
    notDue: "Not due",
    oneToThirty: "1–30 days",
    thirtyOneToSixty: "31–60 days",
    sixtyOneToNinety: "61–90 days",
    ninetyOnePlus: "91+ days",
    customerRanking: "Customers by outstanding balance",
    customer: "Customer",
    invoice: "Invoice",
    service: "Service",
    issueDate: "Issue date",
    dueDate: "Due date",
    gross: "Gross",
    credits: "Credits and applications",
    net: "Net due",
    settled: "Settled",
    outstandingColumn: "Outstanding",
    ageing: "Ageing",
    noCustomerIdentity: "Customer identity unavailable",
    noServiceIdentity: "Service identity unavailable",
  },
  ap: {
    title: "Supplier Payables",
    description: "Supplier bills, payments, and remaining balances.",
    reportDetails: "Report details",
    payable: "Payable",
    summaryPayables: "Supplier Payables",
    paid: "Paid",
    outstanding: "Outstanding",
    openBills: "Open Bills",
    currentOnlyLabel: "Current Only",
    currentOnly: "Current-only report. Historical AP reconstruction is unavailable from an authoritative source.",
    updated: "Updated",
    generatedAt: "Generated At",
    source: "Supplier bill payment balances with reversals and allocations",
    bill: "Bill",
    invoicesHeading: "Invoices",
    billCountSingular: "bill",
    billCountPlural: "bills",
    supplier: "Supplier",
    service: "Service",
    invoiceDate: "Invoice date",
    dueDate: "Due date",
    status: "Status",
    noSupplierIdentity: "Supplier identity unavailable",
    noServiceIdentity: "Service identity unavailable",
    allStatuses: "All statuses",
    unpaid: "Unpaid",
    partiallyPaid: "Partially paid",
    paidStatus: "Paid",
  },
  event: {
    title: "Event Cost & Margin",
    description: "A managerial view of event costs, commitments, forecasts, and margins.",
    eventService: "Event",
    approvedBudget: "Approved Budget",
    commitment: "Open Commitment",
    actual: "Actual Cost",
    paid: "Paid",
    outstanding: "Outstanding",
    etc: "Estimate to Complete (ETC)",
    eac: "Estimate at Completion (EAC)",
    commercialValue: "Approved Commercial Value",
    forecastMargin: "Forecast Margin",
    completeness: "Completeness",
    status: "Status",
    closeState: "Close State",
    open: "Open",
    closed: "Closed",
    finalActual: "Final Actual Cost",
    finalMargin: "Final Managerial Margin",
    noFinalForOpen: "No final amount is available for an open event",
    noCustomerIdentity: "Customer identity unavailable",
    complete: "Complete",
    partial: "Partial",
    unavailable: "Unavailable",
    allCompleteness: "All completeness levels",
    allCloseStates: "All close states",
    includedEvents: "Included Events",
    eventsShown: "Events shown",
    summaryCounts: "Event counts",
    historicalLabel: "Historical",
    reportDetails: "Report details",
    incompleteSourceWarning: "Some events have incomplete source data. Available amounts remain authoritative; missing amounts are unavailable, not zero.",
    completenessSummaryUnavailable: "Whole-result completeness summary is unavailable at this result size. Row-level costing remains authoritative.",
    incompleteExportWarning: "Some exported events have incomplete source data.",
    views: {
      selector: "Analysis view",
      overview: "Overview",
      costAnalysis: "Cost Analysis",
      commercialClose: "Commercial & Close",
    },
  },
};

const ar: ReportCenterDictionary = {
  ...en,
  title: "مركز التقارير",
  subtitle: "تقارير مسماة للقراءة فقط من مصادر تشغيلية معتمدة.",
  catalog: {
    financialOperations: "العمليات المالية",
    eventCosting: "الحدث والتكاليف",
    open: "فتح التقرير",
    unavailable: "غير متاح لهذا الدور",
    exportAvailable: "تصدير Excel محدود",
    noExport: "التصدير غير متاح",
  },
  workspace: {
    ...en.workspace,
    source: "المصدر",
    timeBasis: "الأساس الزمني",
    freshness: "الحداثة",
    timezone: "توقيت الرياض",
    period: "الفترة",
    fromDate: "من",
    toDate: "إلى",
    asOf: "حتى تاريخ",
    currentOnly: "السجلات الحالية فقط",
    historicalAsOf: "إعادة بناء تاريخية حتى تاريخ محدد",
    periodAndAsOf: "فترة مع تاريخ محدد للحساب",
    definition: "ما الذي يجيب عنه التقرير",
    export: "تصدير",
    generated: "تم الإنشاء",
    filters: "الفلاتر",
    apply: "تطبيق",
    clear: "مسح",
    search: "بحث",
    noRows: "لا توجد سجلات مطابقة للفلاتر المحددة.",
    unavailable: "المصدر المعتمد غير متاح. لا يتم عرض قيم صفرية بديلة.",
    forbidden: "هذا التقرير غير متاح لدورك.",
    error: "تعذر تحميل التقرير.",
    invalid: "التاريخ المحدد غير صالح. اختر تاريخاً تقويمياً صحيحاً.",
    partial: "التقرير متاح مع نقص في بعض مصادر البيانات.",
    empty: "لا توجد سجلات للفلاتر المحددة.",
    drill: "فتح السجل المصدر",
    rows: "السجلات",
    exportedRows: "السجلات المصدرة",
    exportLimit: "الحد الأقصى للتصدير",
    previous: "السابق",
    next: "التالي",
  },
  data: {
    customerNumber: "رقم العميل",
    serviceNumber: "رقم الخدمة",
    serviceTitle: "عنوان الخدمة",
    creditAdjustment: "تعديل دائن",
    creditApplication: "تطبيق رصيد دائن",
    daysPastDue: "أيام التأخير",
    ageingBand: "شريحة التقادم",
    advanceAllocated: "الدفعة المقدمة المخصصة",
    currency: "العملة",
    closeVersion: "إصدار الإغلاق",
    closeEffectiveDate: "تاريخ سريان الإغلاق",
    closedAt: "وقت الإغلاق",
  },
  ar: {
    ...en.ar,
    title: "مستحقات العملاء",
    description: "الفواتير والتحصيل والأرصدة المستحقة كما يعيدها مصدر مستحقات العملاء المعتمد.",
    presentationDescription: "الفواتير والمدفوعات والأرصدة المتبقية على العملاء.",
    historicalLabel: "تاريخي",
    reportDetails: "تفاصيل التقرير",
    invoicesHeading: "الفواتير",
    invoiceCountSingular: "فاتورة",
    invoiceCountPlural: "فواتير",
    billed: "المفوتر",
    collectedCash: "التحصيل النقدي",
    outstanding: "الرصيد المستحق",
    overdue: "المتأخر",
    notDue: "غير مستحق",
    oneToThirty: "1–30 يوماً",
    thirtyOneToSixty: "31–60 يوماً",
    sixtyOneToNinety: "61–90 يوماً",
    ninetyOnePlus: "91 يوماً فأكثر",
    customerRanking: "العملاء حسب الرصيد المستحق",
    customer: "العميل",
    invoice: "الفاتورة",
    service: "الخدمة",
    issueDate: "تاريخ الإصدار",
    dueDate: "تاريخ الاستحقاق",
    gross: "الإجمالي",
    credits: "التعديلات والتطبيقات",
    net: "الصافي المستحق",
    settled: "المسدد",
    outstandingColumn: "الرصيد المستحق",
    ageing: "عمر الرصيد",
    noCustomerIdentity: "هوية العميل غير متاحة",
    noServiceIdentity: "هوية الخدمة غير متاحة",
  },
  ap: {
    ...en.ap,
    title: "مستحقات الموردين",
    description: "فواتير الموردين والمبالغ المسددة والمتبقية.",
    reportDetails: "تفاصيل التقرير",
    payable: "المستحق",
    summaryPayables: "إجمالي مستحقات الموردين",
    paid: "المدفوع",
    outstanding: "المتبقي للدفع",
    openBills: "الفواتير المفتوحة",
    currentOnlyLabel: "السجلات الحالية فقط",
    currentOnly: "تقرير للسجلات الحالية فقط. لا تتوفر بيانات معتمدة لإعادة بناء مستحقات الموردين تاريخياً.",
    updated: "آخر تحديث",
    generatedAt: "تاريخ ووقت الإنشاء",
    source: "أرصدة فواتير الموردين والمدفوعات والعكس والتخصيصات المقدمة",
    bill: "الفاتورة",
    invoicesHeading: "الفواتير",
    billCountSingular: "فاتورة",
    billCountPlural: "فواتير",
    supplier: "المورد",
    service: "الخدمة",
    invoiceDate: "تاريخ الفاتورة",
    dueDate: "تاريخ الاستحقاق",
    status: "الحالة",
    noSupplierIdentity: "هوية المورد غير متاحة",
    noServiceIdentity: "هوية الخدمة غير متاحة",
    allStatuses: "كل الحالات",
    unpaid: "غير مدفوعة",
    partiallyPaid: "مدفوعة جزئياً",
    paidStatus: "مدفوعة",
  },
  event: {
    ...en.event,
    title: "تكاليف وهوامش الفعاليات",
    description: "عرض إداري لتكاليف الفعاليات والالتزامات والتوقعات والهوامش.",
    eventService: "الفعالية",
    approvedBudget: "الميزانية المعتمدة",
    commitment: "الالتزام المفتوح",
    actual: "التكلفة الفعلية",
    paid: "المدفوع",
    outstanding: "المتبقي",
    etc: "المتبقي المتوقع (ETC)",
    eac: "عند الإتمام (EAC)",
    commercialValue: "القيمة التجارية المعتمدة",
    forecastMargin: "الهامش المتوقع",
    completeness: "اكتمال البيانات",
    status: "الحالة",
    closeState: "حالة الإغلاق",
    open: "مفتوح",
    closed: "مغلق",
    finalActual: "التكلفة الفعلية النهائية",
    finalMargin: "الهامش الإداري النهائي",
    noFinalForOpen: "لا تتوفر قيمة نهائية لحدث مفتوح",
    noCustomerIdentity: "هوية العميل غير متاحة",
    complete: "مكتمل",
    partial: "جزئي",
    unavailable: "غير متاح",
    allCompleteness: "كل مستويات الاكتمال",
    allCloseStates: "كل حالات الإغلاق",
    includedEvents: "الفعاليات المدرجة",
    eventsShown: "الفعاليات المعروضة",
    summaryCounts: "ملخص الفعاليات",
    historicalLabel: "تاريخي",
    reportDetails: "تفاصيل التقرير",
    incompleteSourceWarning: "تحتوي بعض الفعاليات على بيانات مصدر غير مكتملة. المبالغ المتاحة معتمدة، وتظل القيم المفقودة غير متاحة ولا تُعرض كأصفار.",
    completenessSummaryUnavailable: "ملخص اكتمال النتائج الكاملة غير متاح عند هذا الحجم. وتظل بيانات التكلفة على مستوى كل فعالية هي المرجع المعتمد.",
    incompleteExportWarning: "تتضمن الفعاليات المصدرة بيانات مصدر غير مكتملة.",
    views: {
      selector: "طريقة العرض التحليلية",
      overview: "نظرة عامة",
      costAnalysis: "تحليل التكاليف",
      commercialClose: "القيمة التجارية والإغلاق",
    },
  },
};

export function getReportCenterDictionary(locale: Locale): ReportCenterDictionary {
  return locale === "ar" ? ar : en;
}
