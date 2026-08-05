import type { Locale } from "../locales.ts";
import type { QuotationStatus } from "../../quotations/types";

export type DashboardWorkflowStage = "Inquiry" | "Quoted" | "Approved" | "Deposit Paid";

export interface DashboardDictionary {
  locale: Locale;
  states: {
    accessDenied: string;
    genericError: string;
    loadError: string;
    unavailable: string;
    unavailableForRole: string;
  };
  header: {
    title: string;
    subtitle: string;
  };
  metrics: {
    totalCustomers: string;
    totalQuotations: string;
    openInvoices: string;
    services: string;
    totalCollected: string;
    pendingBalance: string;
    basedOnLiveRecords: string;
    fromCurrentInvoices: string;
    collectedOnRecordedInvoices: string;
  };
  actions: {
    title: string;
    newCustomer: string;
    newQuotation: string;
    newInvoice: string;
    newService: string;
  };
  sections: {
    businessSnapshot: string;
    recentActivity: string;
    recentQuotations: string;
    recentPayments: string;
  };
  quotations: {
    title: string;
    viewAll: string;
    client: string;
    value: string;
    status: string;
    noRecentActivity: string;
    unavailableForRole: string;
    /** Display labels only — internal status codes remain unchanged. */
    statuses: Record<QuotationStatus, string>;
  };
  workflow: {
    title: string;
    viewServices: string;
    stage: string;
    focus: string;
    owner: string;
    rows: Record<DashboardWorkflowStage, { label: string; focus: string; owner: string }>;
  };
}

const dashboardDictionaryEn: DashboardDictionary = {
  locale: "en",
  states: {
    accessDenied: "Access denied",
    genericError: "Something went wrong",
    loadError: "We could not load the dashboard at this time. Please try again later.",
    unavailable: "Unavailable",
    unavailableForRole: "Unavailable for this role",
  },
  header: {
    title: "Dashboard",
    subtitle: "Overview of customers, quotations, invoices, and services.",
  },
  metrics: {
    totalCustomers: "Total Customers",
    totalQuotations: "Total Quotations",
    openInvoices: "Open Invoices",
    services: "Services",
    totalCollected: "Total Collected",
    pendingBalance: "Pending Balance",
    basedOnLiveRecords: "Based on live records",
    fromCurrentInvoices: "From current invoices",
    collectedOnRecordedInvoices: "Collected on recorded invoices",
  },
  actions: {
    title: "Quick Actions",
    newCustomer: "New Customer",
    newQuotation: "New Quotation",
    newInvoice: "New Invoice",
    newService: "New Service",
  },
  sections: {
    businessSnapshot: "Business Snapshot",
    recentActivity: "Recent Activity",
    recentQuotations: "Recent Quotations",
    recentPayments: "Recent Payments",
  },
  quotations: {
    title: "Recent Quotations",
    viewAll: "View all",
    client: "Customer",
    value: "Amount",
    status: "Status",
    noRecentActivity: "No recent quotations",
    unavailableForRole: "Recent quotations unavailable for this role.",
    statuses: {
      draft: "Draft",
      sent: "Sent",
      approved: "Approved",
      rejected: "Rejected",
      expired: "Expired",
    },
  },
  workflow: {
    title: "Service Workflow",
    viewServices: "View services",
    stage: "Service stage",
    focus: "Focus",
    owner: "Owner",
    rows: {
      Inquiry: { label: "Inquiry", focus: "Capture event or booking request", owner: "Sales" },
      Quoted: { label: "Quoted", focus: "Prepare Service-scoped quotation", owner: "Sales" },
      Approved: { label: "Approved", focus: "Record customer approval", owner: "Manager" },
      "Deposit Paid": {
        label: "Deposit Paid",
        focus: "Confirm cleared deposit payment",
        owner: "Accountant",
      },
    },
  },
};

const dashboardDictionaryAr: DashboardDictionary = {
  locale: "ar",
  states: {
    accessDenied: "تم رفض الوصول",
    genericError: "حدث خطأ ما",
    loadError: "تعذر تحميل لوحة التحكم في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
    unavailable: "غير متاح",
    unavailableForRole: "غير متاح لهذا الدور",
  },
  header: {
    title: "لوحة التحكم",
    subtitle: "نظرة عامة على العملاء وعروض الأسعار والفواتير والخدمات.",
  },
  metrics: {
    totalCustomers: "إجمالي العملاء",
    totalQuotations: "إجمالي عروض الأسعار",
    openInvoices: "الفواتير المفتوحة",
    services: "الخدمات",
    totalCollected: "إجمالي المحصل",
    pendingBalance: "الرصيد المستحق",
    basedOnLiveRecords: "استنادًا إلى السجلات الحالية",
    fromCurrentInvoices: "من الفواتير الحالية",
    collectedOnRecordedInvoices: "المحصل من الفواتير المسجلة",
  },
  actions: {
    title: "إجراءات سريعة",
    newCustomer: "عميل جديد",
    newQuotation: "عرض سعر جديد",
    newInvoice: "فاتورة جديدة",
    newService: "خدمة جديدة",
  },
  sections: {
    businessSnapshot: "ملخص الأعمال",
    recentActivity: "النشاط الأخير",
    recentQuotations: "أحدث عروض الأسعار",
    recentPayments: "أحدث المدفوعات",
  },
  quotations: {
    title: "أحدث عروض الأسعار",
    viewAll: "عرض الكل",
    client: "العميل",
    value: "المبلغ",
    status: "الحالة",
    noRecentActivity: "لا توجد عروض أسعار حديثة",
    unavailableForRole: "عروض الأسعار الحديثة غير متاحة لهذا الدور.",
    statuses: {
      draft: "مسودة",
      sent: "مرسل",
      approved: "معتمد",
      rejected: "مرفوض",
      expired: "منتهي الصلاحية",
    },
  },
  workflow: {
    title: "مسار عمل الخدمة",
    viewServices: "عرض الخدمات",
    stage: "مرحلة الخدمة",
    focus: "التركيز",
    owner: "المسؤول",
    rows: {
      Inquiry: { label: "استفسار", focus: "تسجيل طلب الفعالية أو الحجز", owner: "المبيعات" },
      Quoted: { label: "تم التسعير", focus: "إعداد عرض سعر مرتبط بالخدمة", owner: "المبيعات" },
      Approved: { label: "معتمد", focus: "تسجيل موافقة العميل", owner: "المدير" },
      "Deposit Paid": {
        label: "تم دفع الدفعة المقدمة",
        focus: "تأكيد سداد الدفعة المقدمة",
        owner: "المحاسبة",
      },
    },
  },
};

const dashboardDictionaries: Record<Locale, DashboardDictionary> = {
  en: dashboardDictionaryEn,
  ar: dashboardDictionaryAr,
};

export function getDashboardDictionary(locale: Locale): DashboardDictionary {
  return dashboardDictionaries[locale];
}
