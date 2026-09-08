import type { Locale } from "../locales";
import type {
  CashAdvanceStatus,
  ExpenseContextType,
} from "../../expenses/types.ts";
import { resolveDictionaryValue } from "../fallback.ts";

export interface CashAdvancesDictionary {
  locale: Locale;
  header: {
    title: string;
    subtitle: string;
    requestAdvance: string;
  };
  tabs: {
    myAdvances: string;
    allAdvances: string;
  };
  filters: {
    status: string;
    allStatuses: string;
    search: string;
  };
  statuses: Record<CashAdvanceStatus, string>;
  contextTypes: Record<ExpenseContextType, string>;
  accountability: {
    amountIssued: string;
    amountSpent: string;
    amountReturned: string;
    remainingBalance: string;
    currency: string;
  };
  table: {
    recordsLoaded: string;
    columns: {
      advanceNumber: string;
      recipient: string;
      date: string;
      context: string;
      purpose: string;
      issued: string;
      spent: string;
      returned: string;
      remaining: string;
      status: string;
      actions: string;
      viewDetails: string;
    };
    empty: {
      noAdvances: string;
      noAdvancesDesc: string;
      noAdvancesFilterDesc: string;
      allEmptyTitle: string;
      allEmptyDesc: string;
    };
  };
  requestModal: {
    title: string;
    subtitle: string;
    contextLabel: string;
    contextCompany: string;
    contextCompanyDesc: string;
    contextEvent: string;
    contextEventDesc: string;
    serviceLabel: string;
    selectServicePlaceholder: string;
    purposeLabel: string;
    purposePlaceholder: string;
    amountLabel: string;
    amountPlaceholder: string;
    amountHelp: string;
    submit: string;
    submitting: string;
    cancel: string;
    errors: {
      validationError: string;
      invalidContext: string;
      serviceRequired: string;
      purposeMin: string;
      amountPositive: string;
      requestConflict: string;
      numberGenerationFailed: string;
      genericError: string;
    };
    successNotice: string;
  };
  detail: {
    title: string;
    backToAdvances: string;
    sections: {
      header: string;
      identity: string;
      accountability: string;
      lifecycle: string;
      allocations: string;
      returns: string;
    };
    fields: {
      advanceNumber: string;
      status: string;
      recipient: string;
      requestedBy: string;
      requestedAt: string;
      approvedBy: string;
      approvedAt: string;
      issuedBy: string;
      issuedAt: string;
      paymentReference: string;
      settledAt: string;
      rejectedBy: string;
      rejectedAt: string;
      rejectionReason: string;
      cancelledBy: string;
      cancelledAt: string;
      cancellationReason: string;
      purpose: string;
      context: string;
      service: string;
    };
    allocationsTable: {
      expenseNumber: string;
      amount: string;
      settledAt: string;
      notes: string;
      empty: string;
    };
    returnsTable: {
      amount: string;
      returnedAt: string;
      receiptReference: string;
      notes: string;
      empty: string;
    };
  };
  states: {
    accessRestricted: string;
    accessRestrictedMessage: string;
    notFoundTitle: string;
    notFoundMessage: string;
    loadErrorTitle: string;
    noticePrefix: string;
  };
}

export const cashAdvancesDictionaryEn: CashAdvancesDictionary = {
  locale: "en",
  header: {
    title: "Cash Advances",
    subtitle: "Employee cash advances, balances, allocations, and settlement tracking",
    requestAdvance: "Request Cash Advance",
  },
  tabs: {
    myAdvances: "My Advances",
    allAdvances: "All Advances",
  },
  filters: {
    status: "Status",
    allStatuses: "All Statuses",
    search: "Search advances...",
  },
  statuses: {
    draft: "Draft",
    submitted: "Awaiting approval",
    approved: "Approved",
    issued: "Issued / Active",
    settled: "Settled",
    rejected: "Rejected",
    cancelled: "Cancelled",
  },
  contextTypes: {
    company: "Company",
    event: "Event / Service",
  },
  accountability: {
    amountIssued: "Issued",
    amountSpent: "Spent",
    amountReturned: "Returned",
    remainingBalance: "Remaining Balance",
    currency: "SAR",
  },
  table: {
    recordsLoaded: "records",
    columns: {
      advanceNumber: "Advance Number",
      recipient: "Recipient",
      date: "Requested Date",
      context: "Context",
      purpose: "Purpose",
      issued: "Issued",
      spent: "Spent",
      returned: "Returned",
      remaining: "Remaining",
      status: "Status",
      actions: "Actions",
      viewDetails: "View Details",
    },
    empty: {
      noAdvances: "No cash advances found",
      noAdvancesDesc: "You have not requested any cash advances yet.",
      noAdvancesFilterDesc: "No cash advances match the selected filter.",
      allEmptyTitle: "No advances in system",
      allEmptyDesc: "No employee cash advances have been recorded yet.",
    },
  },
  requestModal: {
    title: "Request Cash Advance",
    subtitle: "Submit an advance request for company operations or specific event execution.",
    contextLabel: "Context",
    contextCompany: "Company",
    contextCompanyDesc: "General company operations or administrative expenses",
    contextEvent: "Event / Service",
    contextEventDesc: "Specific project or event execution service",
    serviceLabel: "Service / Event",
    selectServicePlaceholder: "Select eligible service...",
    purposeLabel: "Purpose & Justification",
    purposePlaceholder: "Describe the operational necessity for this cash advance (minimum 5 characters)...",
    amountLabel: "Amount Requested (SAR)",
    amountPlaceholder: "0.00",
    amountHelp: "Amount must be greater than zero.",
    submit: "Submit Request",
    submitting: "Submitting...",
    cancel: "Cancel",
    errors: {
      validationError: "Please verify all fields and provide valid information.",
      invalidContext: "Invalid context type selected.",
      serviceRequired: "Service selection is required for event advances.",
      purposeMin: "Purpose must be at least 5 characters.",
      amountPositive: "Amount must be greater than zero.",
      requestConflict: "A request conflict occurred. Please retry.",
      numberGenerationFailed: "Failed to allocate an advance number. Please try again.",
      genericError: "Failed to submit cash advance request. Please try again.",
    },
    successNotice: "Cash advance requested successfully.",
  },
  detail: {
    title: "Cash Advance Details",
    backToAdvances: "Back to Cash Advances",
    sections: {
      header: "Overview",
      identity: "Identity & Context",
      accountability: "Financial Accountability",
      lifecycle: "Lifecycle & Audit",
      allocations: "Spend & Settlement History",
      returns: "Cash Return History",
    },
    fields: {
      advanceNumber: "Advance Number",
      status: "Status",
      recipient: "Recipient",
      requestedBy: "Requested By",
      requestedAt: "Requested At",
      approvedBy: "Approved By",
      approvedAt: "Approved At",
      issuedBy: "Issued By",
      issuedAt: "Issued At",
      paymentReference: "Payment Reference",
      settledAt: "Settled At",
      rejectedBy: "Rejected By",
      rejectedAt: "Rejected At",
      rejectionReason: "Rejection Reason",
      cancelledBy: "Cancelled By",
      cancelledAt: "Cancelled At",
      cancellationReason: "Cancellation Reason",
      purpose: "Purpose",
      context: "Context",
      service: "Service / Event",
    },
    allocationsTable: {
      expenseNumber: "Expense Number",
      amount: "Settled Amount",
      settledAt: "Settled At",
      notes: "Notes",
      empty: "No expenses settled against this advance yet.",
    },
    returnsTable: {
      amount: "Returned Amount",
      returnedAt: "Returned At",
      receiptReference: "Receipt Reference",
      notes: "Notes",
      empty: "No cash returns recorded for this advance.",
    },
  },
  states: {
    accessRestricted: "Access Restricted",
    accessRestrictedMessage: "You do not have permission to access the Cash Advances workspace.",
    notFoundTitle: "Cash Advance Not Found",
    notFoundMessage: "The requested cash advance could not be found or you do not have permission to view it.",
    loadErrorTitle: "Failed to Load",
    noticePrefix: "Notice:",
  },
};

export const cashAdvancesDictionaryAr: CashAdvancesDictionary = {
  locale: "ar",
  header: {
    title: "العهد النقدية",
    subtitle: "العهد النقدية للموظفين، الأرصدة، التسويات وسجل المبالغ المتبقية",
    requestAdvance: "طلب عهدة نقدية",
  },
  tabs: {
    myAdvances: "عهدي النقدية",
    allAdvances: "جميع العهد",
  },
  filters: {
    status: "الحالة",
    allStatuses: "جميع الحالات",
    search: "البحث في العهد...",
  },
  statuses: {
    draft: "مسودة",
    submitted: "بانتظار الموافقة",
    approved: "معتمد",
    issued: "مصروفة / نشطة",
    settled: "تمت تسويتها",
    rejected: "مرفوضة",
    cancelled: "ملغاة",
  },
  contextTypes: {
    company: "عام للشركة",
    event: "فعالية / خدمة",
  },
  accountability: {
    amountIssued: "المبلغ المصروف",
    amountSpent: "المسوى",
    amountReturned: "المسترد",
    remainingBalance: "الرصيد المتبقي",
    currency: "ر.س",
  },
  table: {
    recordsLoaded: "سجلات",
    columns: {
      advanceNumber: "رقم العهدة",
      recipient: "المستلم",
      date: "تاريخ الطلب",
      context: "السياق",
      purpose: "الغرض",
      issued: "المصروف",
      spent: "المسوى",
      returned: "المسترد",
      remaining: "المتبقي",
      status: "الحالة",
      actions: "الإجراءات",
      viewDetails: "عرض التفاصيل",
    },
    empty: {
      noAdvances: "لا توجد عهد نقدية",
      noAdvancesDesc: "لم تقم بطلب أي عهد نقدية حتى الآن.",
      noAdvancesFilterDesc: "لا توجد عهد نقدية تطابق معيار التصفية المحدد.",
      allEmptyTitle: "لا توجد عهد في النظام",
      allEmptyDesc: "لم يتم تسجيل أي عهد نقدية في النظام بعد.",
    },
  },
  requestModal: {
    title: "طلب عهدة نقدية",
    subtitle: "تقديم طلب عهدة نقدية لعمليات الشركة أو لتنفيذ فعالية محددة.",
    contextLabel: "سياق العهدة",
    contextCompany: "عام للشركة",
    contextCompanyDesc: "عمليات الشركة العامة أو المصروفات الإدارية",
    contextEvent: "فعالية / خدمة",
    contextEventDesc: "خدمة تنفيذ مشروع أو فعالية محددة",
    serviceLabel: "الخدمة / الفعالية",
    selectServicePlaceholder: "اختر خدمة مؤهلة...",
    purposeLabel: "الغرض والمبرر",
    purposePlaceholder: "اكتب المبرر التشغيلي لطلب هذه العهدة النقدية (5 أحرف على الأقل)...",
    amountLabel: "المبلغ المطلوب (ر.س)",
    amountPlaceholder: "0.00",
    amountHelp: "يجب أن يكون المبلغ أكبر من الصفر.",
    submit: "إرسال الطلب",
    submitting: "جارٍ الإرسال...",
    cancel: "إلغاء",
    errors: {
      validationError: "يرجى التحقق من جميع الحقول وإدخال بيانات صحيحة.",
      invalidContext: "نوع السياق المحدد غير صالح.",
      serviceRequired: "يجب اختيار الخدمة للعهد المرتبطة بالفعاليات.",
      purposeMin: "يجب ألا يقل الغرض عن 5 أحرف.",
      amountPositive: "يجب أن يكون المبلغ أكبر من الصفر.",
      requestConflict: "حدث تعارض أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.",
      numberGenerationFailed: "فشل إنشاء رقم العهدة. يرجى المحاولة مرة أخرى.",
      genericError: "فشل إرسال طلب العهدة النقدية. يرجى المحاولة مرة أخرى.",
    },
    successNotice: "تم إرسال طلب العهدة النقدية بنجاح.",
  },
  detail: {
    title: "تفاصيل العهدة النقدية",
    backToAdvances: "العودة إلى العهد النقدية",
    sections: {
      header: "نظرة عامة",
      identity: "بيانات العهدة والسياق",
      accountability: "المسؤولية المالية",
      lifecycle: "سجل الإجراءات والاعتماد",
      allocations: "سجل المصروفات والتسويات",
      returns: "سجل استرداد المبالغ النقدية",
    },
    fields: {
      advanceNumber: "رقم العهدة",
      status: "الحالة",
      recipient: "المستلم",
      requestedBy: "مقدم الطلب",
      requestedAt: "تاريخ الطلب",
      approvedBy: "معتمد بواسطة",
      approvedAt: "تاريخ الاعتماد",
      issuedBy: "صرفت بواسطة",
      issuedAt: "تاريخ الصرف",
      paymentReference: "مرجع الدفع",
      settledAt: "تاريخ اكتمال التسوية",
      rejectedBy: "رُفضت بواسطة",
      rejectedAt: "تاريخ الرفض",
      rejectionReason: "سبب الرفض",
      cancelledBy: "أُلغيت بواسطة",
      cancelledAt: "تاريخ الإلغاء",
      cancellationReason: "سبب الإلغاء",
      purpose: "الغرض",
      context: "السياق",
      service: "الخدمة / الفعالية",
    },
    allocationsTable: {
      expenseNumber: "رقم المصروف",
      amount: "المبلغ المسوى",
      settledAt: "تاريخ التسوية",
      notes: "ملاحظات",
      empty: "لم تتم تسوية أي مصروفات مقابل هذه العهدة حتى الآن.",
    },
    returnsTable: {
      amount: "المبلغ المسترد",
      returnedAt: "تاريخ الاسترداد",
      receiptReference: "مرجع الإيصال",
      notes: "ملاحظات",
      empty: "لا توجد مبالغ مستردة مسجلة لهذه العهدة.",
    },
  },
  states: {
    accessRestricted: "الصلاحية مقيدة",
    accessRestrictedMessage: "ليس لديك صلاحية للوصول إلى مساحة عمل العهد النقدية.",
    notFoundTitle: "العهدة النقدية غير موجودة",
    notFoundMessage: "تعذر العثور على العهدة النقدية المطلوبة أو ليس لديك صلاحية لعرضها.",
    loadErrorTitle: "تعذر تحميل البيانات",
    noticePrefix: "ملاحظة:",
  },
};

export function getCashAdvancesDictionary(locale: Locale): CashAdvancesDictionary {
  return locale === "ar" ? cashAdvancesDictionaryAr : cashAdvancesDictionaryEn;
}

export function getCashAdvanceStatusLabel(locale: Locale, status: CashAdvanceStatus): string {
  const activeDictionary = getCashAdvancesDictionary(locale);
  const englishDictionary = getCashAdvancesDictionary("en");
  const key = `statuses.${status}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.statuses[status],
    category: "label",
    englishValue: englishDictionary.statuses[status],
    key,
    locale,
    namespace: "cash-advances",
    surface: "cash-advance-status",
  });
}

export function getCashAdvanceContextTypeLabel(locale: Locale, context: ExpenseContextType): string {
  const activeDictionary = getCashAdvancesDictionary(locale);
  const englishDictionary = getCashAdvancesDictionary("en");
  const key = `contextTypes.${context}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.contextTypes[context],
    category: "label",
    englishValue: englishDictionary.contextTypes[context],
    key,
    locale,
    namespace: "cash-advances",
    surface: "cash-advance-context-type",
  });
}
