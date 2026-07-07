import type { Locale } from "../locales";
import type { InvoiceStatus, InvoiceType } from "@/types/invoice";

export interface InvoicesDictionary {
  locale: Locale;
  states: {
    accessDenied: string;
    genericError: string;
    invoicesForbidden: string;
    invoicesLoadError: string;
  };
  list: {
    title: string;
    subtitle: string;
    export: string;
    creationHint: string;
    filters: {
      allStatuses: string;
      paid: string;
      unpaid: string;
      overdue: string;
    };
    stats: {
      totalOutstanding: string;
      openInvoices: string;
      totalCollected: string;
      openInvoicesCount: string;
      basedOnLiveBalances: string;
      collectedOnRecordedInvoices: string;
    };
    table: {
      invoice: string;
      type: string;
      document: string;
      customer: string;
      issueDate: string;
      amountSar: string;
      status: string;
      noInvoices: string;
    };
    sidePanel: {
      amountDue: string;
      preview: string;
      details: string;
      dueDate: string;
      type: string;
      documentLabel: string;
      status: string;
      quotationRef: string;
      quotationReferenceUnavailable: string;
    };
    actions: {
      viewPdf: string;
      recordPayment: string;
    };
    tooltips: {
      draftCannotBePaid: string;
      invoiceUnavailableForPayment: string;
    };
  };
  statuses: Record<InvoiceStatus, string>;
  invoiceTypes: Record<InvoiceType, string>;
}

const invoicesDictionaryEn: InvoicesDictionary = {
  locale: "en",
  states: {
    accessDenied: "Access Denied",
    genericError: "Something went wrong",
    invoicesForbidden: "You don't have permission to view the invoices module.",
    invoicesLoadError: "We couldn't load the invoices at this time. Please try again later.",
  },
  list: {
    title: "Invoices",
    subtitle: "Manage billing documents and payment tracking.",
    export: "Export",
    creationHint: "Invoices are created from approved quotations or service billing actions.",
    filters: {
      allStatuses: "All Statuses",
      paid: "Paid",
      unpaid: "Unpaid",
      overdue: "Overdue",
    },
    stats: {
      totalOutstanding: "Total Outstanding",
      openInvoices: "Open Invoices",
      totalCollected: "Total Collected",
      openInvoicesCount: "{count} open invoices",
      basedOnLiveBalances: "Based on live balances",
      collectedOnRecordedInvoices: "Collected on recorded invoices",
    },
    table: {
      invoice: "Invoice",
      type: "Type",
      document: "Document",
      customer: "Customer",
      issueDate: "Issue Date",
      amountSar: "Amount (SAR)",
      status: "Status",
      noInvoices: "No invoices found.",
    },
    sidePanel: {
      amountDue: "Amount Due",
      preview: "Preview",
      details: "Details",
      dueDate: "Due Date",
      type: "Type",
      documentLabel: "Document Label",
      status: "Status",
      quotationRef: "Quotation Ref",
      quotationReferenceUnavailable: "Quotation reference unavailable",
    },
    actions: {
      viewPdf: "View PDF",
      recordPayment: "Record Payment",
    },
    tooltips: {
      draftCannotBePaid: "Draft invoices cannot be paid.",
      invoiceUnavailableForPayment: "Invoice is fully paid or unavailable.",
    },
  },
  statuses: {
    draft: "Draft",
    sent: "Issued",
    paid: "Paid",
    partial: "Partial",
    overdue: "Overdue",
    cancelled: "Cancelled",
    voided: "Voided",
  },
  invoiceTypes: {
    deposit: "Deposit Invoice",
    final: "Final Invoice",
  },
};

const invoicesDictionaryAr: InvoicesDictionary = {
  locale: "ar",
  states: {
    accessDenied: "تم رفض الوصول",
    genericError: "حدث خطأ ما",
    invoicesForbidden: "ليس لديك صلاحية لعرض وحدة الفواتير.",
    invoicesLoadError: "تعذر تحميل الفواتير في الوقت الحالي. يرجى المحاولة مرة أخرى لاحقًا.",
  },
  list: {
    title: "الفواتير",
    subtitle: "إدارة مستندات الفوترة ومتابعة السداد.",
    export: "تصدير",
    creationHint: "يتم إنشاء الفواتير من عروض السعر المعتمدة أو من إجراءات فوترة الخدمة.",
    filters: {
      allStatuses: "كل الحالات",
      paid: "مدفوعة",
      unpaid: "غير مدفوعة",
      overdue: "متأخرة",
    },
    stats: {
      totalOutstanding: "إجمالي المستحق غير المحصل",
      openInvoices: "الفواتير المفتوحة",
      totalCollected: "إجمالي المحصل",
      openInvoicesCount: "{count} فواتير مفتوحة",
      basedOnLiveBalances: "بناءً على الأرصدة الحالية",
      collectedOnRecordedInvoices: "المحصل من الفواتير المسجلة",
    },
    table: {
      invoice: "الفاتورة",
      type: "النوع",
      document: "المستند",
      customer: "العميل",
      issueDate: "تاريخ الإصدار",
      amountSar: "القيمة (SAR)",
      status: "الحالة",
      noInvoices: "لا توجد فواتير.",
    },
    sidePanel: {
      amountDue: "المبلغ المستحق",
      preview: "معاينة",
      details: "التفاصيل",
      dueDate: "تاريخ الاستحقاق",
      type: "النوع",
      documentLabel: "عنوان المستند",
      status: "الحالة",
      quotationRef: "مرجع عرض السعر",
      quotationReferenceUnavailable: "مرجع عرض السعر غير متاح",
    },
    actions: {
      viewPdf: "عرض PDF",
      recordPayment: "تسجيل السداد",
    },
    tooltips: {
      draftCannotBePaid: "لا يمكن سداد الفواتير المسودة.",
      invoiceUnavailableForPayment: "الفاتورة مسددة بالكامل أو غير متاحة.",
    },
  },
  statuses: {
    draft: "مسودة",
    sent: "صادرة",
    paid: "مدفوعة",
    partial: "مدفوعة جزئياً",
    overdue: "متأخرة",
    cancelled: "ملغاة",
    voided: "باطلة",
  },
  invoiceTypes: {
    deposit: "فاتورة دفعة مقدمة",
    final: "الفاتورة النهائية",
  },
};

const invoicesDictionaries: Record<Locale, InvoicesDictionary> = {
  en: invoicesDictionaryEn,
  ar: invoicesDictionaryAr,
};

export function getInvoicesDictionary(locale: Locale): InvoicesDictionary {
  return invoicesDictionaries[locale];
}
