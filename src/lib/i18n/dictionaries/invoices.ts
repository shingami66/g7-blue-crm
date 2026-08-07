import type { Locale } from "../locales";
import type { InvoiceStatus, InvoiceType } from "../../../types/invoice";
import { resolveDictionaryValue } from "../fallback.ts";

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
    invoiceChooser: {
      createInvoice: string;
      title: string;
      description: string;
      depositTitle: string;
      depositDescription: string;
      finalTitle: string;
      finalDescription: string;
      selectDepositServiceTitle: string;
      selectDepositServiceDescription: string;
      selectFinalServiceTitle: string;
      selectFinalServiceDescription: string;
      searchPlaceholder: string;
      back: string;
      close: string;
      select: string;
      chooseDepositService: string;
      chooseFinalService: string;
      navigating: string;
      resultsCount: string;
      loading: string;
      loadError: string;
      partialWarning: string;
      customer: string;
      eventDate: string;
      eventName: string;
      location: string;
      noEligibleDeposit: string;
      noEligibleFinal: string;
      noMatchingDeposit: string;
      noMatchingFinal: string;
    };
    filters: {
      allStatuses: string;
      paid: string;
      overdue: string;
      searchPlaceholder: string;
      searchModeLabel: string;
      resetFilters: string;
      searchModes: { invoiceNumber: string; customer: string };
      searchPlaceholders: { invoiceNumber: string; customer: string };
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
      approvedBillingScopeTotal: string;
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
  /**
   * Authenticated UI display mappings for known document_label values.
   * Does not mutate stored snapshots or PDF body language.
   */
  documentLabels: {
    commercialInvoice: string;
  };
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
    success: string;
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
      idempotency_conflict: string;
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
    invoicesLoadError: "Invoice data unavailable. Please try again later.",
  },
  list: {
    title: "Invoices",
    subtitle: "Manage billing documents and payment tracking.",
    export: "Export",
    creationHint: "Invoices are created from approved quotations or service billing actions.",
    invoiceChooser: {
      createInvoice: "Create Invoice",
      title: "Create Invoice",
      description: "Choose an invoice type, then select an eligible Service. No invoice is created until the Service Billing action is completed.",
      depositTitle: "Deposit Invoice",
      depositDescription: "Choose a Service that can accept a deposit invoice.",
      finalTitle: "Final Invoice",
      finalDescription: "Choose a Service with remaining billable balance for a final invoice.",
      selectDepositServiceTitle: "Select an eligible Service",
      selectDepositServiceDescription: "Only Services currently eligible for a Deposit Invoice are shown.",
      selectFinalServiceTitle: "Select an eligible Service",
      selectFinalServiceDescription: "Only Services currently eligible for a Final Invoice are shown.",
      searchPlaceholder: "Search Services, customers, or events",
      back: "Back",
      close: "Close",
      select: "Select",
      chooseDepositService: "Select",
      chooseFinalService: "Select",
      navigating: "Opening Service Billing…",
      resultsCount: "{count} eligible Services",
      loading: "Loading currently eligible Services…",
      loadError: "Eligible Services are unavailable. Close the chooser and try again.",
      partialWarning: "Some Services could not be evaluated and are not shown. Existing Service Billing checks remain authoritative.",
      customer: "Customer",
      eventDate: "Event Date",
      eventName: "Event",
      location: "Location",
      noEligibleDeposit: "No eligible Services",
      noEligibleFinal: "No eligible Services",
      noMatchingDeposit: "No matching Services",
      noMatchingFinal: "No matching Services",
    },
    filters: {
      allStatuses: "All Statuses",
      paid: "Paid",
      overdue: "Overdue",
      searchPlaceholder: "Search by invoice number or customer",
      searchModeLabel: "Search invoices by",
      resetFilters: "Reset filters",
      searchModes: { invoiceNumber: "Invoice Number", customer: "Customer" },
      searchPlaceholders: { invoiceNumber: "Search invoice number", customer: "Search customer name" },
    },
    summary: {
      showingZero: "Showing 0 invoices",
      showingRange: "Showing {start}-{end} of {count} invoices",
    },
    table: {
      invoice: "Invoice Number",
      type: "Invoice Type",
      document: "Document",
      customer: "Customer",
      issueDate: "Issue Date",
      amountSar: "Amount (SAR)",
      status: "Status",
      preview: "View",
      printPdf: "Print / PDF",
      noInvoices: "No invoices found.",
      noFilteredInvoices: "No invoices match the current filters.",
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
      overview: "Invoice Details",
      customer: "Customer / Buyer",
      serviceEvent: "Service / Event Context",
      quotation: "Approved Quotation",
      lineItems: "Line Items",
      totals: "Amounts / Totals",
      settlement: "Payment History",
    },
    labels: {
      invoiceNumber: "Invoice Number",
      invoiceType: "Invoice Type",
      documentLabel: "Document Label",
      status: "Invoice Status",
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
      quotationReference: "Approved Quotation",
      quotationNumber: "Quotation Number",
      approvedQuotation: "Approved Quotation ID",
      description: "Description",
      qty: "Quantity",
      unitPrice: "Unit Price",
      vat: "VAT",
      lineTotal: "Item Total",
      subtotal: "Subtotal",
      discount: "Discount",
      vatAmount: "VAT Amount",
      grandTotal: "Grand Total",
      amountPaid: "Amount Paid",
      balanceDue: "Balance Due",
      approvedQuotationTotal: "Approved Quotation Total",
      approvedBillingScopeTotal: "Approved Billing Scope Total",
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
  documentLabels: {
    commercialInvoice: "Commercial Invoice",
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
    amountSar: "Payment Amount (SAR)",
    balanceDue: "Balance Due",
    paymentDate: "Payment Date",
    paymentMethod: "Payment Method",
    referenceNotes: "Reference / Notes",
    referencePlaceholder: "e.g. Transaction ID, Check #...",
    cancel: "Cancel",
    submit: "Record Payment",
    submitting: "Recording...",
    success: "Payment recorded successfully.",
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
      idempotency_conflict: "A conflicting payment was submitted at the same time.",
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
    invoicesLoadError: "بيانات الفواتير غير متاحة. يرجى المحاولة مرة أخرى لاحقًا.",
  },
  list: {
    title: "الفواتير",
    subtitle: "إدارة مستندات الفوترة ومتابعة السداد.",
    export: "تصدير",
    creationHint: "يتم إنشاء الفواتير من عروض السعر المعتمدة أو من إجراءات فوترة الخدمة.",
    invoiceChooser: {
      createInvoice: "إنشاء فاتورة",
      title: "إنشاء فاتورة",
      description: "اختر نوع الفاتورة ثم اختر خدمة مؤهلة. لن يتم إنشاء فاتورة حتى يكتمل إجراء الفوترة في الخدمة.",
      depositTitle: "فاتورة دفعة مقدمة",
      depositDescription: "اختر خدمة يمكنها استقبال فاتورة دفعة مقدمة.",
      finalTitle: "الفاتورة النهائية",
      finalDescription: "اختر خدمة لديها رصيد قابل للفوترة لإصدار فاتورة نهائية.",
      selectDepositServiceTitle: "اختر خدمة مؤهلة",
      selectDepositServiceDescription: "تظهر فقط الخدمات المؤهلة حالياً لفاتورة دفعة مقدمة.",
      selectFinalServiceTitle: "اختر خدمة مؤهلة",
      selectFinalServiceDescription: "تظهر فقط الخدمات المؤهلة حالياً لفاتورة نهائية.",
      searchPlaceholder: "ابحث في الخدمات أو العملاء أو الفعاليات",
      back: "رجوع",
      close: "إغلاق",
      select: "اختيار",
      chooseDepositService: "اختيار",
      chooseFinalService: "اختيار",
      navigating: "جارٍ فتح فوترة الخدمة…",
      resultsCount: "{count} خدمة مؤهلة",
      loading: "جارٍ تحميل الخدمات المؤهلة حالياً…",
      loadError: "الخدمات المؤهلة غير متاحة. أغلق نافذة الاختيار وحاول مرة أخرى.",
      partialWarning: "تعذر تقييم بعض الخدمات ولذلك لا تظهر هنا. تظل ضوابط فوترة الخدمة الحالية هي المرجع المعتمد.",
      customer: "العميل",
      eventDate: "تاريخ الفعالية",
      eventName: "الفعالية",
      location: "الموقع",
      noEligibleDeposit: "لا توجد خدمات مؤهلة",
      noEligibleFinal: "لا توجد خدمات مؤهلة",
      noMatchingDeposit: "لا توجد خدمات مطابقة",
      noMatchingFinal: "لا توجد خدمات مطابقة",
    },
    filters: {
      allStatuses: "كل الحالات",
      paid: "مدفوعة",
      overdue: "متأخرة",
      searchPlaceholder: "ابحث برقم الفاتورة أو اسم العميل",
      searchModeLabel: "البحث في الفواتير حسب",
      resetFilters: "إعادة ضبط الفلاتر",
      searchModes: { invoiceNumber: "رقم الفاتورة", customer: "العميل" },
      searchPlaceholders: { invoiceNumber: "ابحث عن رقم الفاتورة", customer: "ابحث عن اسم العميل" },
    },
    summary: {
      showingZero: "عرض 0 فواتير",
      showingRange: "عرض {start}-{end} من إجمالي {count} فاتورة",
    },
    table: {
      invoice: "رقم الفاتورة",
      type: "نوع الفاتورة",
      document: "المستند",
      customer: "العميل",
      issueDate: "تاريخ الإصدار",
      amountSar: "القيمة (SAR)",
      status: "حالة الفاتورة",
      preview: "عرض",
      printPdf: "طباعة / PDF",
      noInvoices: "لم يتم العثور على فواتير",
      noFilteredInvoices: "لا توجد فواتير مطابقة للفلاتر الحالية",
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
      overview: "تفاصيل الفاتورة",
      customer: "العميل / المشتري",
      serviceEvent: "الخدمة والفعالية",
      quotation: "عرض السعر المعتمد",
      lineItems: "بنود الفاتورة",
      totals: "المبالغ / الإجماليات",
      settlement: "سجل المدفوعات",
    },
    labels: {
      invoiceNumber: "رقم الفاتورة",
      invoiceType: "نوع الفاتورة",
      documentLabel: "عنوان المستند",
      status: "حالة الفاتورة",
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
      quotationReference: "عرض السعر المعتمد",
      quotationNumber: "رقم عرض السعر",
      approvedQuotation: "معرّف عرض السعر المعتمد",
      description: "الوصف",
      qty: "الكمية",
      unitPrice: "سعر الوحدة",
      vat: "ضريبة القيمة المضافة",
      lineTotal: "إجمالي البند",
      subtotal: "المجموع الفرعي",
      discount: "الخصم",
      vatAmount: "مبلغ ضريبة القيمة المضافة",
      grandTotal: "الإجمالي",
      amountPaid: "المبلغ المسدد",
      balanceDue: "الرصيد المستحق",
      approvedQuotationTotal: "إجمالي عرض السعر المعتمد",
      approvedBillingScopeTotal: "إجمالي نطاق الفوترة المعتمد",
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
  documentLabels: {
    commercialInvoice: "فاتورة تجارية",
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
    title: "تسجيل دفعة",
    helper: "تسجيل دفعة للفاتورة {invoiceNumber}",
    amountSar: "مبلغ الدفعة (SAR)",
    balanceDue: "الرصيد المستحق",
    paymentDate: "تاريخ الدفع",
    paymentMethod: "طريقة الدفع",
    referenceNotes: "المرجع / الملاحظات",
    referencePlaceholder: "مثال: رقم العملية، رقم الشيك...",
    cancel: "إلغاء",
    submit: "تسجيل دفعة",
    submitting: "جارٍ تسجيل الدفعة...",
    success: "تم تسجيل الدفعة بنجاح.",
    methods: {
      bank_transfer: "تحويل بنكي",
      cash: "نقداً",
      cheque: "شيك",
      online: "دفع إلكتروني",
    },
    validation: {
      positiveAmount: "يرجى إدخال مبلغ موجب صالح.",
      exceedsBalance: "لا يمكن أن يتجاوز مبلغ الدفعة الرصيد المستحق ({balanceDue}).",
      dateRequired: "يرجى اختيار تاريخ.",
    },
    errors: {
      invalid_payment_input: "يرجى التحقق من المدخلات.",
      invoice_not_found: "لم يتم العثور على الفاتورة.",
      payment_exceeds_balance: "يتجاوز مبلغ الدفعة الرصيد المتبقي.",
      invoice_not_payable: "لا يمكن تسجيل دفعة لهذه الفاتورة.",
      invoice_deleted: "تم حذف هذه الفاتورة.",
      invalid_payment_amount: "مبلغ الدفعة غير صالح.",
      idempotency_conflict: "تم تقديم دفعة متعارضة في نفس الوقت.",
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

export function getInvoiceStatusLabel(locale: Locale, status: InvoiceStatus): string {
  const activeDictionary = getInvoicesDictionary(locale);
  const englishDictionary = getInvoicesDictionary("en");
  const key = `statuses.${status}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.statuses[status],
    category: "label",
    englishValue: englishDictionary.statuses[status],
    key,
    locale,
    namespace: "invoices",
    surface: "invoice-status",
  });
}

export function getInvoiceTypeLabel(locale: Locale, type: InvoiceType): string {
  const activeDictionary = getInvoicesDictionary(locale);
  const englishDictionary = getInvoicesDictionary("en");
  const key = `invoiceTypes.${type}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.invoiceTypes[type],
    category: "label",
    englishValue: englishDictionary.invoiceTypes[type],
    key,
    locale,
    namespace: "invoices",
    surface: "invoice-type",
  });
}

/**
 * Maps known stored document_label values for authenticated UI only.
 * Does not rewrite snapshots, PDFs, or database fields.
 * Tax Invoice remains untranslated while company is not VAT registered.
 */
export function getInvoiceDocumentLabelDisplay(
  locale: Locale,
  documentLabel: string | null | undefined,
  fallback = "—",
): string {
  if (!documentLabel || documentLabel.trim().length === 0) {
    return fallback;
  }

  const trimmed = documentLabel.trim();
  if (trimmed === "Commercial Invoice") {
    return getInvoicesDictionary(locale).documentLabels.commercialInvoice;
  }

  return trimmed;
}
