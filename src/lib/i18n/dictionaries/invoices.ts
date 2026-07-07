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
      overdue: string;
      searchPlaceholder: string;
    };
    summary: {
      showingZero: string;
      showingRange: string;
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
      noFilteredInvoices: string;
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
  issueAction: {
    helper: string;
    success: string;
    submit: string;
    submitting: string;
    genericError: string;
    errors: {
      invalid_invoice_id: string;
      invoice_not_found: string;
      invoice_not_draft: string;
      invoice_update_failed: string;
      Unauthorized: string;
      Forbidden: string;
    };
  };
  paymentModal: {
    title: string;
    helper: string;
    amountSar: string;
    balanceDue: string;
    paymentDate: string;
    paymentMethod: string;
    referenceNotes: string;
    referencePlaceholder: string;
    cancel: string;
    submit: string;
    submitting: string;
    methods: {
      bank_transfer: string;
      cash: string;
      cheque: string;
      online: string;
    };
    validation: {
      positiveAmount: string;
      exceedsBalance: string;
      dateRequired: string;
    };
    errors: {
      invalid_payment_input: string;
      invoice_not_found: string;
      payment_exceeds_balance: string;
      invoice_not_payable: string;
      invoice_deleted: string;
      invalid_payment_amount: string;
      Unauthorized: string;
      Forbidden: string;
      generic: string;
    };
  };
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
      overdue: "Overdue",
      searchPlaceholder: "Search by invoice number or customer",
    },
    summary: {
      showingZero: "Showing 0 invoices",
      showingRange: "Showing {start}-{end} of {count} invoices",
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
      noFilteredInvoices: "No invoices match your search or filters.",
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
  issueAction: {
    helper:
      "Issuing this invoice will mark it as Issued and set the issue date. Amounts and snapshots will not be changed.",
    success: "Invoice issued successfully.",
    submit: "Issue Invoice",
    submitting: "Issuing...",
    genericError: "Unable to issue invoice. Please try again.",
    errors: {
      invalid_invoice_id: "Invalid invoice ID.",
      invoice_not_found: "Invoice not found or deleted.",
      invoice_not_draft: "Only draft invoices can be issued.",
      invoice_update_failed: "Failed to update invoice status.",
      Unauthorized: "You are not authorized to perform this action.",
      Forbidden: "You do not have permission to issue invoices.",
    },
  },
  paymentModal: {
    title: "Record Payment",
    helper: "Recording payment for invoice {invoiceNumber}",
    amountSar: "Amount (SAR)",
    balanceDue: "Balance Due",
    paymentDate: "Payment Date",
    paymentMethod: "Payment Method",
    referenceNotes: "Reference / Notes",
    referencePlaceholder: "e.g. Transaction ID, Check #...",
    cancel: "Cancel",
    submit: "Record Payment",
    submitting: "Recording...",
    methods: {
      bank_transfer: "Bank Transfer",
      cash: "Cash",
      cheque: "Cheque",
        online: "Online Payment",
    },
    validation: {
      positiveAmount: "Please enter a valid positive amount.",
      exceedsBalance: "Payment cannot exceed the balance due ({balanceDue}).",
      dateRequired: "Please select a date.",
    },
    errors: {
      invalid_payment_input: "Please check your inputs.",
      invoice_not_found: "The invoice was not found.",
      payment_exceeds_balance: "Payment exceeds remaining balance.",
      invoice_not_payable: "This invoice cannot accept payments.",
      invoice_deleted: "This invoice has been deleted.",
      invalid_payment_amount: "Invalid payment amount.",
      Unauthorized: "You must be signed in.",
      Forbidden: "You don't have permission to record payments.",
      generic: "An error occurred.",
    },
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
      overdue: "متأخرة",
      searchPlaceholder: "ابحث برقم الفاتورة أو اسم العميل",
    },
    summary: {
      showingZero: "عرض 0 فواتير",
      showingRange: "عرض {start}-{end} من إجمالي {count} فاتورة",
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
      noFilteredInvoices: "لا توجد فواتير تطابق البحث أو عوامل التصفية.",
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
  issueAction: {
    helper:
      "سيتم عند إصدار هذه الفاتورة تحويل حالتها إلى صادرة وتحديد تاريخ الإصدار. لن يتم تغيير المبالغ أو اللقطات المحفوظة.",
    success: "تم إصدار الفاتورة بنجاح.",
    submit: "إصدار الفاتورة",
    submitting: "جارٍ إصدار الفاتورة...",
    genericError: "تعذر إصدار الفاتورة. يرجى المحاولة مرة أخرى.",
    errors: {
      invalid_invoice_id: "معرّف الفاتورة غير صالح.",
      invoice_not_found: "الفاتورة غير موجودة أو تم حذفها.",
      invoice_not_draft: "يمكن إصدار الفواتير المسودة فقط.",
      invoice_update_failed: "تعذر تحديث حالة الفاتورة.",
      Unauthorized: "أنت غير مخول لتنفيذ هذا الإجراء.",
      Forbidden: "ليس لديك صلاحية لإصدار الفواتير.",
    },
  },
  paymentModal: {
    title: "تسجيل السداد",
    helper: "تسجيل السداد للفاتورة {invoiceNumber}",
    amountSar: "المبلغ (SAR)",
    balanceDue: "الرصيد المستحق",
    paymentDate: "تاريخ السداد",
    paymentMethod: "طريقة السداد",
    referenceNotes: "المرجع / الملاحظات",
    referencePlaceholder: "مثال: رقم العملية، رقم الشيك...",
    cancel: "إلغاء",
    submit: "تسجيل السداد",
    submitting: "جارٍ تسجيل السداد...",
    methods: {
      bank_transfer: "تحويل بنكي",
      cash: "نقداً",
      cheque: "شيك",
      online: "دفع إلكتروني",
    },
    validation: {
      positiveAmount: "يرجى إدخال مبلغ موجب صالح.",
      exceedsBalance: "لا يمكن أن يتجاوز السداد المبلغ المستحق ({balanceDue}).",
      dateRequired: "يرجى اختيار تاريخ.",
    },
    errors: {
      invalid_payment_input: "يرجى التحقق من المدخلات.",
      invoice_not_found: "لم يتم العثور على الفاتورة.",
      payment_exceeds_balance: "يتجاوز السداد الرصيد المتبقي.",
      invoice_not_payable: "لا يمكن تسجيل سداد لهذه الفاتورة.",
      invoice_deleted: "تم حذف هذه الفاتورة.",
      invalid_payment_amount: "مبلغ السداد غير صالح.",
      Unauthorized: "يجب تسجيل الدخول أولاً.",
      Forbidden: "ليس لديك صلاحية لتسجيل المدفوعات.",
      generic: "حدث خطأ ما.",
    },
  },
};

const invoicesDictionaries: Record<Locale, InvoicesDictionary> = {
  en: invoicesDictionaryEn,
  ar: invoicesDictionaryAr,
};

export function getInvoicesDictionary(locale: Locale): InvoicesDictionary {
  return invoicesDictionaries[locale];
}
