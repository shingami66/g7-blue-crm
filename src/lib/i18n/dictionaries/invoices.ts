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
      preview: string;
      printPdf: string;
      noInvoices: string;
      noFilteredInvoices: string;
    };
    sidePanel: {
      amountDue: string;
      preview: string;
      details: string;
      previewTitle: string;
      sections: {
        overview: string;
        customerReference: string;
        amounts: string;
        dates: string;
        actions: string;
      };
      labels: {
        invoiceNumber: string;
        customerName: string;
        totalAmount: string;
        amountPaid: string;
        paymentContext: string;
        noCustomerName: string;
      };
      paymentReady: string;
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
  detail: {
    states: {
      detailForbidden: string;
      unavailable: string;
      unknownBuyer: string;
      noLineItems: string;
      serviceUnavailable: string;
      notApplied: string;
    };
    actions: {
      backToInvoices: string;
      printPdf: string;
      viewQuotation: string;
    };
    sections: {
      overview: string;
      customer: string;
      serviceEvent: string;
      quotation: string;
      lineItems: string;
      totals: string;
      settlement: string;
    };
    labels: {
      invoiceNumber: string;
      invoiceType: string;
      documentLabel: string;
      status: string;
      issueDate: string;
      createdDate: string;
      voidedDate: string;
      voidReason: string;
      customerName: string;
      legalName: string;
      contactName: string;
      email: string;
      phone: string;
      address: string;
      serviceReference: string;
      serviceNumber: string;
      serviceTitle: string;
      eventName: string;
      eventType: string;
      eventDates: string;
      eventLocation: string;
      quotationReference: string;
      quotationNumber: string;
      approvedQuotation: string;
      description: string;
      qty: string;
      unitPrice: string;
      vat: string;
      lineTotal: string;
      subtotal: string;
      discount: string;
      vatAmount: string;
      grandTotal: string;
      amountPaid: string;
      balanceDue: string;
      approvedQuotationTotal: string;
      previousInvoices: string;
      paymentStatus: string;
    };
    settlement: {
      fullyPaid: string;
      partiallyPaid: string;
      outstanding: string;
      draft: string;
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
      preview: "View",
      printPdf: "Print / PDF",
      noInvoices: "No invoices found.",
      noFilteredInvoices: "No invoices match your search or filters.",
    },
    sidePanel: {
      amountDue: "Amount Due",
      preview: "Preview",
      details: "Details",
      previewTitle: "Invoice Preview",
      sections: {
        overview: "Overview",
        customerReference: "Customer & Reference",
        amounts: "Amounts",
        dates: "Dates",
        actions: "Actions",
      },
      labels: {
        invoiceNumber: "Invoice Number",
        customerName: "Customer Name",
        totalAmount: "Total Amount",
        amountPaid: "Amount Paid",
        paymentContext: "Payment Context",
        noCustomerName: "Customer name unavailable",
      },
      paymentReady: "Payment can be recorded for this invoice.",
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
  detail: {
    states: {
      detailForbidden: "You don't have permission to view this invoice.",
      unavailable: "Not available",
      unknownBuyer: "Buyer snapshot unavailable",
      noLineItems: "No service or quotation lines were captured in this invoice snapshot.",
      serviceUnavailable: "Service details are unavailable with the current permissions or snapshot.",
      notApplied: "Not applied",
    },
    actions: {
      backToInvoices: "Back to Invoices",
      printPdf: "Print / Save as PDF",
      viewQuotation: "View Quotation",
    },
    sections: {
      overview: "Invoice Overview",
      customer: "Customer / Buyer",
      serviceEvent: "Service / Event Context",
      quotation: "Quotation Reference",
      lineItems: "Service / Quotation Lines",
      totals: "Amounts / Totals",
      settlement: "Payment / Settlement Context",
    },
    labels: {
      invoiceNumber: "Invoice Number",
      invoiceType: "Invoice Type",
      documentLabel: "Document Label",
      status: "Status",
      issueDate: "Issue Date",
      createdDate: "Created Date",
      voidedDate: "Voided Date",
      voidReason: "Void Reason",
      customerName: "Customer Name",
      legalName: "Legal Name",
      contactName: "Contact Name",
      email: "Email",
      phone: "Phone",
      address: "Address",
      serviceReference: "Service Reference",
      serviceNumber: "Service Number",
      serviceTitle: "Service Title",
      eventName: "Event Name",
      eventType: "Event Type",
      eventDates: "Event Dates",
      eventLocation: "Venue / Location",
      quotationReference: "Quotation Reference",
      quotationNumber: "Quotation Number",
      approvedQuotation: "Approved Quotation ID",
      description: "Description",
      qty: "Qty",
      unitPrice: "Unit Price",
      vat: "VAT",
      lineTotal: "Total",
      subtotal: "Subtotal",
      discount: "Discount",
      vatAmount: "Tax / VAT",
      grandTotal: "Grand Total",
      amountPaid: "Amount Paid",
      balanceDue: "Balance Due",
      approvedQuotationTotal: "Approved Quotation Total",
      previousInvoices: "Previous Invoices / Deposits",
      paymentStatus: "Payment Status",
    },
    settlement: {
      fullyPaid: "This invoice is fully settled.",
      partiallyPaid: "This invoice has partial payment recorded.",
      outstanding: "This invoice still has an outstanding balance.",
      draft: "This invoice is still in draft and has not been issued yet.",
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
      preview: "عرض",
      printPdf: "طباعة / PDF",
      noInvoices: "لا توجد فواتير.",
      noFilteredInvoices: "لا توجد فواتير تطابق البحث أو عوامل التصفية.",
    },
    sidePanel: {
      amountDue: "المبلغ المستحق",
      preview: "معاينة",
      details: "التفاصيل",
      previewTitle: "معاينة الفاتورة",
      sections: {
        overview: "نظرة عامة",
        customerReference: "العميل والمرجع",
        amounts: "المبالغ",
        dates: "التواريخ",
        actions: "الإجراءات",
      },
      labels: {
        invoiceNumber: "رقم الفاتورة",
        customerName: "اسم العميل",
        totalAmount: "إجمالي المبلغ",
        amountPaid: "المبلغ المسدد",
        paymentContext: "حالة السداد",
        noCustomerName: "اسم العميل غير متاح",
      },
      paymentReady: "يمكن تسجيل السداد لهذه الفاتورة.",
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
  detail: {
    states: {
      detailForbidden: "ليس لديك صلاحية لعرض هذه الفاتورة.",
      unavailable: "غير متاح",
      unknownBuyer: "بيانات العميل المحفوظة غير متاحة",
      noLineItems: "لم يتم حفظ بنود الخدمة أو عرض السعر ضمن لقطة هذه الفاتورة.",
      serviceUnavailable: "تفاصيل الخدمة غير متاحة ضمن الصلاحيات الحالية أو اللقطة المحفوظة.",
      notApplied: "غير مطبق",
    },
    actions: {
      backToInvoices: "العودة إلى الفواتير",
      printPdf: "طباعة / حفظ كملف PDF",
      viewQuotation: "عرض عرض السعر",
    },
    sections: {
      overview: "نظرة عامة على الفاتورة",
      customer: "العميل / المشتري",
      serviceEvent: "الخدمة / سياق الفعالية",
      quotation: "مرجع عرض السعر",
      lineItems: "بنود الخدمة / عرض السعر",
      totals: "المبالغ / الإجماليات",
      settlement: "سياق السداد / التسوية",
    },
    labels: {
      invoiceNumber: "رقم الفاتورة",
      invoiceType: "نوع الفاتورة",
      documentLabel: "عنوان المستند",
      status: "الحالة",
      issueDate: "تاريخ الإصدار",
      createdDate: "تاريخ الإنشاء",
      voidedDate: "تاريخ الإبطال",
      voidReason: "سبب الإبطال",
      customerName: "اسم العميل",
      legalName: "الاسم القانوني",
      contactName: "اسم جهة الاتصال",
      email: "البريد الإلكتروني",
      phone: "الهاتف",
      address: "العنوان",
      serviceReference: "مرجع الخدمة",
      serviceNumber: "رقم الخدمة",
      serviceTitle: "عنوان الخدمة",
      eventName: "اسم الفعالية",
      eventType: "نوع الفعالية",
      eventDates: "تواريخ الفعالية",
      eventLocation: "الموقع / المكان",
      quotationReference: "مرجع عرض السعر",
      quotationNumber: "رقم عرض السعر",
      approvedQuotation: "معرّف عرض السعر المعتمد",
      description: "الوصف",
      qty: "الكمية",
      unitPrice: "سعر الوحدة",
      vat: "ضريبة القيمة المضافة",
      lineTotal: "الإجمالي",
      subtotal: "المجموع الفرعي",
      discount: "الخصم",
      vatAmount: "الضريبة / ضريبة القيمة المضافة",
      grandTotal: "الإجمالي",
      amountPaid: "المبلغ المسدد",
      balanceDue: "الرصيد المستحق",
      approvedQuotationTotal: "إجمالي عرض السعر المعتمد",
      previousInvoices: "الفواتير / الدفعات السابقة",
      paymentStatus: "حالة السداد",
    },
    settlement: {
      fullyPaid: "تمت تسوية هذه الفاتورة بالكامل.",
      partiallyPaid: "تم تسجيل سداد جزئي لهذه الفاتورة.",
      outstanding: "لا يزال على هذه الفاتورة رصيد مستحق.",
      draft: "هذه الفاتورة ما زالت مسودة ولم يتم إصدارها بعد.",
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
