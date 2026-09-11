import type { Locale } from "../locales";
import type {
  CashAdvanceStatus,
  ExpenseContextType,
  ExpenseStatus,
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
  operationalAvailability: {
    reservedSpend: string;
    availableBalance: string;
  };
  actions: {
    sectionLabel: string;
    approve: string;
    reject: string;
    issue: string;
    recordSpend: string;
    recordSpendOnBehalf: string;
    submitExpense: string;
    financeReview: string;
    approveExpense: string;
    rejectExpense: string;
    settleSpend: string;
    recordConfirmedCashReturn: string;
    confirmations: {
      approve: string;
      reject: string;
      issue: string;
      recordSpend: string;
      recordSpendOnBehalf: string;
      financeReview: string;
      approveExpense: string;
      rejectExpense: string;
      settleSpend: string;
      recordReturn: string;
    };
    fields: {
      rejectionReason: string;
      paymentReference: string;
      expenseCategory: string;
      description: string;
      amount: string;
      expenseDate: string;
      receiptOptional: string;
      receiptReference: string;
      notes: string;
      remainingBalance: string;
      reservedSpend: string;
      availableBalance: string;
      expenseNumber: string;
      totalAmount: string;
      settledAmount: string;
      unsettledAmount: string;
      settlementAmount: string;
    };
    states: {
      awaitingFinanceReview: string;
      recordedByFinance: string;
      accountableCustodian: string;
      privateReceipt: string;
    };
    errors: {
      validation: string;
      generic: string;
      advanceUnavailable: string;
      advanceNotIssued: string;
      staleBalance: string;
      selfApproval: string;
      rejectionReasonRequired: string;
      returnAmountInvalid: string;
      settlementAmountInvalid: string;
      receiptRequired: string;
      receiptFailed: string;
    };
  };
  linkedExpenses: {
    title: string;
    empty: string;
    statuses: Record<ExpenseStatus, string>;
    fields: {
      expenseNumber: string;
      status: string;
      category: string;
      description: string;
      expenseDate: string;
      amount: string;
      settledAmount: string;
      unsettledAmount: string;
      actions: string;
    };
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
    events: {
      approval: string;
      issuance: string;
      settlement: string;
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
    loadErrorMessage: string;
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
    amountIssued: "Advance Value",
    amountSpent: "Settled Expense",
    amountReturned: "Returned",
    remainingBalance: "Remaining Balance",
    currency: "SAR",
  },
  operationalAvailability: {
    reservedSpend: "Reserved Spend",
    availableBalance: "Available to Spend / Return",
  },
  actions: {
    sectionLabel: "Cash Advance actions",
    approve: "Approve",
    reject: "Reject",
    issue: "Issue Cash Advance",
    recordSpend: "Record Spend",
    recordSpendOnBehalf: "Record Spend on Behalf",
    submitExpense: "Submit Expense",
    financeReview: "Finance Review",
    approveExpense: "Approve Expense",
    rejectExpense: "Reject Expense",
    settleSpend: "Settle Spend",
    recordConfirmedCashReturn: "Record Confirmed Cash Return",
    confirmations: {
      approve: "Approve this Cash Advance request?",
      reject: "Reject this Cash Advance request. A reason is required.",
      issue: "Issue the full approved Cash Advance. No partial issuance is supported.",
      recordSpend: "Record an expense funded by this issued Cash Advance.",
      recordSpendOnBehalf: "Record an expense for the current Cash Advance custodian. Finance review is not automatic.",
      financeReview: "Confirm that Finance has reviewed this linked Expense.",
      approveExpense: "Approve this finance-reviewed linked Expense?",
      rejectExpense: "Reject this linked Expense. A reason is required.",
      settleSpend: "Allocate the entered amount against this approved Cash Advance Expense.",
      recordReturn: "Record cash only after the physical cash has been received or the deposit has been confirmed.",
    },
    fields: {
      rejectionReason: "Rejection Reason",
      paymentReference: "Payment Reference (optional)",
      expenseCategory: "Expense Category",
      description: "Description",
      amount: "Amount",
      expenseDate: "Expense Date",
      receiptOptional: "Receipt / Evidence (optional)",
      receiptReference: "Receipt Reference (optional)",
      notes: "Notes (optional)",
      remainingBalance: "Remaining Balance",
      reservedSpend: "Reserved Spend",
      availableBalance: "Available Balance",
      expenseNumber: "Expense Number",
      totalAmount: "Expense Total",
      settledAmount: "Already Settled",
      unsettledAmount: "Unsettled Amount",
      settlementAmount: "Amount to Settle",
    },
    states: {
      awaitingFinanceReview: "Awaiting Finance Review",
      recordedByFinance: "Recorded by Finance",
      accountableCustodian: "Accountable Custodian",
      privateReceipt: "Stored in the existing private Expense evidence pipeline.",
    },
    errors: {
      validation: "Please complete the required fields with valid values.",
      generic: "The action could not be completed. Please try again.",
      advanceUnavailable: "This Cash Advance is unavailable for your account.",
      advanceNotIssued: "This Cash Advance is not currently issued.",
      staleBalance: "The available balance changed. Refresh the page and try again.",
      selfApproval: "This request cannot be approved by its requester or recipient.",
      rejectionReasonRequired: "A rejection reason is required.",
      returnAmountInvalid: "Return amount must be positive and no greater than Available Balance.",
      settlementAmountInvalid: "Settlement amount must be positive and no greater than the unsettled amount.",
      receiptRequired: "A receipt file is required.",
      receiptFailed: "The Expense was recorded, but the receipt could not be attached. Retry the receipt from the Expense workspace.",
    },
  },
  linkedExpenses: {
    title: "Cash Advance Expenses",
    empty: "No Cash-Advance-funded Expenses have been submitted yet.",
    statuses: {
      draft: "Draft",
      submitted: "Submitted",
      approved: "Approved",
      rejected: "Rejected",
      cancelled: "Cancelled",
    },
    fields: {
      expenseNumber: "Expense Number",
      status: "Status",
      category: "Category",
      description: "Description",
      expenseDate: "Expense Date",
      amount: "Amount",
      settledAmount: "Settled Amount",
      unsettledAmount: "Unsettled Amount",
      actions: "Actions",
    },
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
    events: {
      approval: "Approval",
      issuance: "Issuance",
      settlement: "Settlement",
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
    loadErrorMessage: "Unable to load cash advances. Please try again later.",
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
    amountIssued: "قيمة العهدة",
    amountSpent: "المصروف المسوّى",
    amountReturned: "المسترد",
    remainingBalance: "الرصيد المتبقي",
    currency: "ر.س",
  },
  operationalAvailability: {
    reservedSpend: "المصروفات المحجوزة",
    availableBalance: "المتاح للصرف أو الاسترداد",
  },
  actions: {
    sectionLabel: "إجراءات العهدة النقدية",
    approve: "اعتماد",
    reject: "رفض",
    issue: "صرف العهدة النقدية",
    recordSpend: "تسجيل مصروف",
    recordSpendOnBehalf: "تسجيل مصروف بالنيابة",
    submitExpense: "إرسال المصروف",
    financeReview: "مراجعة مالية",
    approveExpense: "اعتماد المصروف",
    rejectExpense: "رفض المصروف",
    settleSpend: "تسوية المصروف",
    recordConfirmedCashReturn: "تسجيل استرداد نقدي مؤكد",
    confirmations: {
      approve: "هل تريد اعتماد طلب العهدة النقدية هذا؟",
      reject: "سيتم رفض طلب العهدة النقدية. يجب إدخال السبب.",
      issue: "سيتم صرف كامل مبلغ العهدة المعتمد. لا يدعم الإصدار الجزئي.",
      recordSpend: "تسجيل مصروف ممول من هذه العهدة النقدية المصروفة.",
      recordSpendOnBehalf: "تسجيل مصروف لصالح مستلم العهدة الحالي. لا تتم المراجعة المالية تلقائياً.",
      financeReview: "أكد أن المالية راجعت المصروف المرتبط.",
      approveExpense: "هل تريد اعتماد المصروف المرتبط بعد مراجعته مالياً؟",
      rejectExpense: "سيتم رفض المصروف المرتبط. يجب إدخال السبب.",
      settleSpend: "سيتم تخصيص المبلغ المدخل مقابل المصروف المعتمد من العهدة.",
      recordReturn: "سجل المبلغ فقط بعد استلام النقد فعلياً أو تأكيد الإيداع.",
    },
    fields: {
      rejectionReason: "سبب الرفض",
      paymentReference: "مرجع الدفع (اختياري)",
      expenseCategory: "تصنيف المصروف",
      description: "الوصف",
      amount: "المبلغ",
      expenseDate: "تاريخ المصروف",
      receiptOptional: "الإيصال / الإثبات (اختياري)",
      receiptReference: "مرجع الإيصال (اختياري)",
      notes: "ملاحظات (اختياري)",
      remainingBalance: "الرصيد المتبقي",
      reservedSpend: "المصروفات المحجوزة",
      availableBalance: "الرصيد المتاح",
      expenseNumber: "رقم المصروف",
      totalAmount: "إجمالي المصروف",
      settledAmount: "المسوى سابقاً",
      unsettledAmount: "المبلغ غير المسوى",
      settlementAmount: "المبلغ المراد تسويته",
    },
    states: {
      awaitingFinanceReview: "بانتظار المراجعة المالية",
      recordedByFinance: "مسجل بواسطة المالية",
      accountableCustodian: "المستلم المسؤول",
      privateReceipt: "يتم حفظه عبر مسار إثبات المصروف الخاص الحالي.",
    },
    errors: {
      validation: "يرجى إكمال الحقول المطلوبة وإدخال قيم صحيحة.",
      generic: "تعذر إكمال الإجراء. يرجى المحاولة مرة أخرى.",
      advanceUnavailable: "هذه العهدة النقدية غير متاحة لحسابك.",
      advanceNotIssued: "العهدة النقدية ليست في حالة مصروفة حالياً.",
      staleBalance: "تغير الرصيد المتاح. حدّث الصفحة وحاول مرة أخرى.",
      selfApproval: "لا يمكن لمقدم الطلب أو مستلم العهدة اعتماد هذا الطلب.",
      rejectionReasonRequired: "يجب إدخال سبب الرفض.",
      returnAmountInvalid: "يجب أن يكون مبلغ الاسترداد موجباً ولا يتجاوز الرصيد المتاح.",
      settlementAmountInvalid: "يجب أن يكون مبلغ التسوية موجباً ولا يتجاوز المبلغ غير المسوى.",
      receiptRequired: "يجب اختيار ملف إيصال.",
      receiptFailed: "تم تسجيل المصروف، ولكن تعذر إرفاق الإيصال. أعد المحاولة من مساحة المصروفات.",
    },
  },
  linkedExpenses: {
    title: "مصروفات العهدة النقدية",
    empty: "لم يتم إرسال مصروفات ممولة من هذه العهدة بعد.",
    statuses: {
      draft: "مسودة",
      submitted: "مرسل",
      approved: "معتمد",
      rejected: "مرفوض",
      cancelled: "ملغى",
    },
    fields: {
      expenseNumber: "رقم المصروف",
      status: "الحالة",
      category: "التصنيف",
      description: "الوصف",
      expenseDate: "تاريخ المصروف",
      amount: "المبلغ",
      settledAmount: "المبلغ المسوى",
      unsettledAmount: "المبلغ غير المسوى",
      actions: "الإجراءات",
    },
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
    events: {
      approval: "الاعتماد",
      issuance: "الصرف",
      settlement: "التسوية",
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
    loadErrorMessage: "تعذر تحميل بيانات العهد النقدية. يرجى المحاولة مرة أخرى لاحقاً.",
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
