import type { Locale } from "../locales";
import type {
  ExpenseContextType,
  ExpenseOriginType,
  ExpensePaymentMethod,
  ExpenseStatus,
  ReimbursementStatus,
  ExceptionDisposition,
} from "../../expenses/types";
import { resolveDictionaryValue } from "../fallback.ts";

export interface ExpensesDictionary {
  locale: Locale;
  header: {
    sectionBadge: string;
    title: string;
    subtitle: string;
    newExpense: string;
  };
  myExpenses: {
    title: string;
    subtitle: string;
  };
  tabs: {
    myExpenses: string;
    allExpenses: string;
    allExpensesSubtitle: string;
  };
  table: {
    cardTitle: string;
    recordsLoaded: string;
    columns: {
      expenseNumber: string;
      date: string;
      context: string;
      originAndMethod: string;
      evidence: string;
      amount: string;
      status: string;
      financeReview: string;
      reimbursement: string;
      actions: string;
    };
    empty: {
      title: string;
      description: string;
    };
  };
  detail: {
    title: string;
    expenseNumber: string;
    date: string;
    context: string;
    serviceEvent: string;
    category: string;
    description: string;
    amount: string;
    currency: string;
    evidenceStatus: string;
    financeReview: string;
    financeReviewedBy: string;
    financeReviewedAt: string;
    reimbursementStatus: string;
    reimbursedAmount: string;
    remainingAmount: string;
    lifecycleStatus: string;
    receiptDocument: string;
    noReceiptUploaded: string;
    viewReceipt: string;
    attachReceipt: string;
    attachingReceipt: string;
    close: string;
  };
  submissionModal: {
    title: string;
    subtitle: string;
    contextLabel: string;
    contextCompany: string;
    contextEvent: string;
    serviceLabel: string;
    servicePlaceholder: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    customCategoryLabel: string;
    customCategoryPlaceholder: string;
    customCategoryRequired: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    amountLabel: string;
    dateLabel: string;
    receiptLabel: string;
    receiptHint: string;
    receiptSelected: string;
    chooseFile: string;
    takePhoto: string;
    useDeviceCamera: string;
    cameraPreview: string;
    capture: string;
    retake: string;
    usePhoto: string;
    cameraUnavailable: string;
    cameraPermissionDenied: string;
    couldNotCaptureImage: string;
    cameraNotSupported: string;
    unsupportedImageType: string;
    heicNotSupported: string;
    replaceFile: string;
    orDivider: string;
    removeFile: string;
    submit: string;
    submitting: string;
    cancel: string;
  };
  categories: Record<string, string>;
  contextTypes: Record<ExpenseContextType, string>;
  originTypes: Record<ExpenseOriginType, string>;
  paymentMethods: Record<ExpensePaymentMethod, string>;
  statuses: Record<ExpenseStatus, string>;
  reimbursementStatuses: Record<ReimbursementStatus, string>;
  evidenceStatuses: {
    receiptAttached: string;
    exception: string;
    noEvidence: string;
  };
  financeReviewStates: {
    reviewed: string;
    pending: string;
  };
  actions: {
    financeReview: string;
    approveExpense: string;
    rejectExpense: string;
    pending: string;
    cancel: string;
    confirmations: {
      financeReview: string;
      approveExpense: string;
      rejectExpense: string;
    };
    fields: {
      rejectionReason: string;
    };
    errors: {
      generic: string;
      validation: string;
      rejectionReasonRequired: string;
      requestUnavailable: string;
    };
  };
  dispositions: Record<ExceptionDisposition, string>;
  notices: {
    fullSuccess: string;
    partialSuccess: string;
    receiptAttachedSuccess: string;
  };
  states: {
    accessRestricted: string;
    accessRestrictedMessage: string;
    noticePrefix: string;
    loadErrorDefault: string;
  };
}

const expensesDictionaryEn: ExpensesDictionary = {
  locale: "en",
  header: {
    sectionBadge: "Expenses & Costing",
    title: "Expenses",
    subtitle: "Track expenses, receipts, finance review, approvals, and reimbursements.",
    newExpense: "New Expense",
  },
  myExpenses: {
    title: "My Expenses",
    subtitle: "Track your submitted expenses, receipts, and reimbursement status",
  },
  tabs: {
    myExpenses: "My Expenses",
    allExpenses: "All Expenses",
    allExpensesSubtitle: "Review the governed ledger across all accessible expenses",
  },
  table: {
    cardTitle: "Expenses Accountability Ledger",
    recordsLoaded: "records loaded",
    columns: {
      expenseNumber: "Expense #",
      date: "Date",
      context: "Context",
      originAndMethod: "Origin & Method",
      evidence: "Evidence",
      amount: "Amount",
      status: "Status",
      financeReview: "Finance Review",
      reimbursement: "Reimbursement",
      actions: "Actions",
    },
    empty: {
      title: "No expense records found",
      description: "Expenses submitted through the governed workflow will appear here.",
    },
  },
  detail: {
    title: "Expense Details",
    expenseNumber: "Expense Number",
    date: "Date",
    context: "Context",
    serviceEvent: "Event / Service",
    category: "Category",
    description: "Description",
    amount: "Amount",
    currency: "Currency",
    evidenceStatus: "Evidence Status",
    financeReview: "Finance Review",
    financeReviewedBy: "Reviewed By",
    financeReviewedAt: "Reviewed At",
    reimbursementStatus: "Reimbursement Status",
    reimbursedAmount: "Reimbursed Amount",
    remainingAmount: "Remaining Unsettled",
    lifecycleStatus: "Lifecycle Status",
    receiptDocument: "Receipt Document",
    noReceiptUploaded: "No receipt uploaded yet",
    viewReceipt: "View Receipt",
    attachReceipt: "Attach Receipt",
    attachingReceipt: "Attaching...",
    close: "Close",
  },
  submissionModal: {
    title: "Submit New Expense",
    subtitle: "Create an employee-paid expense claim with receipt evidence",
    contextLabel: "Expense Context",
    contextCompany: "Company",
    contextEvent: "Event / Service",
    serviceLabel: "Select Event / Service",
    servicePlaceholder: "Choose an Event or Service...",
    categoryLabel: "Category",
    categoryPlaceholder: "Select a category...",
    customCategoryLabel: "Specify category",
    customCategoryPlaceholder: "e.g., Car wash, Parking fee",
    customCategoryRequired: "Please specify the custom category",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Describe the incurred business expense...",
    amountLabel: "Amount (SAR)",
    dateLabel: "Expense Date",
    receiptLabel: "Receipt Document",
    receiptHint: "Accepted: PDF, JPEG, PNG (Up to 25 MB)",
    receiptSelected: "Selected file",
    chooseFile: "Choose File",
    takePhoto: "Take Photo",
    useDeviceCamera: "Use Device Camera",
    cameraPreview: "Camera Preview",
    capture: "Capture",
    retake: "Retake",
    usePhoto: "Use Photo",
    cameraUnavailable: "Camera unavailable",
    cameraPermissionDenied: "Camera permission denied",
    couldNotCaptureImage: "Could not capture image",
    cameraNotSupported: "Camera is not supported on this browser",
    unsupportedImageType: "Unsupported image format. Please upload JPEG or PNG",
    heicNotSupported: "HEIC/HEIF photo format is not supported. Please use the direct camera or upload JPEG/PNG.",
    replaceFile: "Replace",
    orDivider: "or",
    removeFile: "Remove",
    submit: "Submit Expense",
    submitting: "Submitting...",
    cancel: "Cancel",
  },
  categories: {
    travel: "Travel",
    meals: "Meals & Subsistence",
    supplies: "Supplies & Materials",
    equipment: "Equipment & Tools",
    accommodation: "Accommodation",
    transport: "Transport & Logistics",
    other: "Other",
  },
  contextTypes: {
    company: "Company",
    event: "Event Direct",
  },
  originTypes: {
    company_direct: "Company Direct",
    employee_paid: "Employee Paid",
  },
  paymentMethods: {
    company_funds: "Company Funds",
    petty_cash: "Petty Cash",
    cash_advance: "Cash Advance",
    personal_funds: "Personal Funds",
  },
  statuses: {
    draft: "Draft",
    submitted: "Submitted",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
  },
  reimbursementStatuses: {
    not_applicable: "N/A",
    pending: "Pending",
    partially_settled: "Partially Settled",
    fully_settled: "Fully Settled",
  },
  evidenceStatuses: {
    receiptAttached: "Receipt Attached",
    exception: "Exception",
    noEvidence: "No Evidence",
  },
  financeReviewStates: {
    reviewed: "Finance Reviewed",
    pending: "Pending Finance Review",
  },
  actions: {
    financeReview: "Finance Review",
    approveExpense: "Approve Expense",
    rejectExpense: "Reject Expense",
    pending: "Working...",
    cancel: "Cancel",
    confirmations: {
      financeReview: "Mark this submitted expense as finance reviewed?",
      approveExpense: "Approve this finance-reviewed expense?",
      rejectExpense: "Reject this expense and provide a reason.",
    },
    fields: {
      rejectionReason: "Rejection reason",
    },
    errors: {
      generic: "The expense action could not be completed.",
      validation: "Please review the required fields.",
      rejectionReasonRequired: "Enter a rejection reason.",
      requestUnavailable: "Could not start this action. Please try again.",
    },
  },
  dispositions: {
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    rectified: "Rectified",
  },
  notices: {
    fullSuccess: "Expense submitted successfully with receipt attached!",
    partialSuccess:
      "Expense was created successfully, but receipt attachment failed. You can attach the receipt using the retry action.",
    receiptAttachedSuccess: "Receipt attached successfully!",
  },
  states: {
    accessRestricted: "Access Restricted",
    accessRestrictedMessage: "You do not have permission to view Expenses accountability records.",
    noticePrefix: "Notice:",
    loadErrorDefault: "Failed to load expenses",
  },
};

const expensesDictionaryAr: ExpensesDictionary = {
  locale: "ar",
  header: {
    sectionBadge: "المصروفات والتكاليف",
    title: "المصروفات",
    subtitle: "إدارة ومتابعة المصروفات، والإيصالات، والمراجعة المالية، والتعويضات.",
    newExpense: "مصروف جديد",
  },
  myExpenses: {
    title: "مصروفاتي",
    subtitle: "متابعة مصروفاتك المقدمة، والإيصالات، وحالة التعويض",
  },
  tabs: {
    myExpenses: "مصروفاتي",
    allExpenses: "كل المصروفات",
    allExpensesSubtitle: "مراجعة سجل المصروفات المتاح لك",
  },
  table: {
    cardTitle: "سجل محاسبة المصروفات",
    recordsLoaded: "سجل محمل",
    columns: {
      expenseNumber: "رقم المصروف",
      date: "التاريخ",
      context: "السياق",
      originAndMethod: "المصدر وطريقة الدفع",
      evidence: "الإثبات",
      amount: "المبلغ",
      status: "الحالة",
      financeReview: "المراجعة المالية",
      reimbursement: "التعويض",
      actions: "الإجراءات",
    },
    empty: {
      title: "لا توجد مصروفات مسجلة",
      description: "ستظهر هنا المصروفات المقدمة عبر المسار المعتمد.",
    },
  },
  detail: {
    title: "تفاصيل المصروف",
    expenseNumber: "رقم المصروف",
    date: "التاريخ",
    context: "السياق",
    serviceEvent: "الفعالية / الخدمة",
    category: "التصنيف",
    description: "الوصف",
    amount: "المبلغ",
    currency: "العملة",
    evidenceStatus: "حالة الإثبات",
    financeReview: "المراجعة المالية",
    financeReviewedBy: "تمت المراجعة بواسطة",
    financeReviewedAt: "تاريخ المراجعة",
    reimbursementStatus: "حالة التعويض",
    reimbursedAmount: "المبلغ المعوض",
    remainingAmount: "المبلغ المتبقي",
    lifecycleStatus: "حالة دورة الحياة",
    receiptDocument: "إيصال المصروف",
    noReceiptUploaded: "لم يتم إرفاق إيصال بعد",
    viewReceipt: "عرض الإيصال",
    attachReceipt: "إرفاق إيصال",
    attachingReceipt: "جاري الإرفاق...",
    close: "إغلاق",
  },
  submissionModal: {
    title: "تقديم مصروف جديد",
    subtitle: "إنشاء مطالبة بمصروف مدفوع من الموظف مع إثبات الإيصال",
    contextLabel: "سياق المصروف",
    contextCompany: "عام للشركة",
    contextEvent: "خاص بالفعالية / الخدمة",
    serviceLabel: "اختر الفعالية / الخدمة",
    servicePlaceholder: "اختر فعالية أو خدمة...",
    categoryLabel: "التصنيف",
    categoryPlaceholder: "اختر تصنيفاً...",
    customCategoryLabel: "حدد التصنيف",
    customCategoryPlaceholder: "مثال: غسيل سيارة، رسوم مواقف",
    customCategoryRequired: "يرجى تحديد التصنيف الخاص",
    descriptionLabel: "الوصف",
    descriptionPlaceholder: "وضح سبب المصروف وطبيعته...",
    amountLabel: "المبلغ (ريال)",
    dateLabel: "تاريخ المصروف",
    receiptLabel: "إيصال المصروف",
    receiptHint: "المقبول: PDF, JPEG, PNG (حتى 25 ميجابايت)",
    receiptSelected: "الملف المختار",
    chooseFile: "اختيار ملف",
    takePhoto: "التقاط صورة",
    useDeviceCamera: "استخدام كاميرا الجهاز",
    cameraPreview: "معاينة الكاميرا",
    capture: "التقاط",
    retake: "إعادة التصوير",
    usePhoto: "استخدام الصورة",
    cameraUnavailable: "الكاميرا غير متاحة",
    cameraPermissionDenied: "تم رفض إذن الكاميرا",
    couldNotCaptureImage: "تعذر التقاط الصورة",
    cameraNotSupported: "الكاميرا غير مدعومة في هذا المتصفح",
    unsupportedImageType: "نوع الصورة غير مدعوم. يرجى اختيار JPEG أو PNG",
    heicNotSupported: "صيغة HEIC/HEIF غير مدعومة. يرجى استخدام الكاميرا المباشرة أو رفع ملف JPEG أو PNG.",
    replaceFile: "استبدال",
    orDivider: "أو",
    removeFile: "إزالة",
    submit: "تقديم المصروف",
    submitting: "جاري التقديم...",
    cancel: "إلغاء",
  },
  categories: {
    travel: "سفر وتنقل",
    meals: "وجبات وإعاشة",
    supplies: "مستلزمات ومواد",
    equipment: "معدات وأدوات",
    accommodation: "إقامة وفنادق",
    transport: "شحن ونقل",
    other: "أخرى",
  },
  contextTypes: {
    company: "عام للشركة",
    event: "خاص بالفعالية",
  },
  originTypes: {
    company_direct: "مباشر من الشركة",
    employee_paid: "مدفوع من الموظف",
  },
  paymentMethods: {
    company_funds: "أموال الشركة",
    petty_cash: "نقدية نثرية",
    cash_advance: "العهدة النقدية",
    personal_funds: "أموال شخصية",
  },
  statuses: {
    draft: "مسودة",
    submitted: "مقدم",
    approved: "معتمد",
    rejected: "مرفوض",
    cancelled: "ملغى",
  },
  reimbursementStatuses: {
    not_applicable: "لا ينطبق",
    pending: "معلق",
    partially_settled: "مسوى جزئياً",
    fully_settled: "مسوى بالكامل",
  },
  evidenceStatuses: {
    receiptAttached: "الإيصال مرفق",
    exception: "استثناء",
    noEvidence: "بدون إثبات",
  },
  financeReviewStates: {
    reviewed: "تمت المراجعة المالية",
    pending: "قيد المراجعة المالية",
  },
  actions: {
    financeReview: "المراجعة المالية",
    approveExpense: "اعتماد المصروف",
    rejectExpense: "رفض المصروف",
    pending: "جارٍ التنفيذ...",
    cancel: "إلغاء",
    confirmations: {
      financeReview: "هل تريد وضع علامة المراجعة المالية على هذا المصروف المقدم؟",
      approveExpense: "هل تريد اعتماد هذا المصروف الذي تمت مراجعته مالياً؟",
      rejectExpense: "ارفض هذا المصروف مع توضيح السبب.",
    },
    fields: {
      rejectionReason: "سبب الرفض",
    },
    errors: {
      generic: "تعذر تنفيذ إجراء المصروف.",
      validation: "يرجى مراجعة الحقول المطلوبة.",
      rejectionReasonRequired: "يرجى إدخال سبب الرفض.",
      requestUnavailable: "تعذر بدء الإجراء. حاول مرة أخرى.",
    },
  },
  dispositions: {
    pending: "قيد المراجعة",
    accepted: "مقبول",
    rejected: "مرفوض",
    rectified: "تمت التسوية",
  },
  notices: {
    fullSuccess: "تم تقديم المصروف بنجاح مع إرفاق الإيصال!",
    partialSuccess:
      "تم إنشاء المصروف بنجاح ولكن تعذر إرفاق الإيصال. يمكنك إرفاق الإيصال عبر خيار الإرفاق.",
    receiptAttachedSuccess: "تم إرفاق الإيصال بنجاح!",
  },
  states: {
    accessRestricted: "تم تقييد الوصول",
    accessRestrictedMessage: "ليس لديك صلاحية لعرض سجلات المصروفات.",
    noticePrefix: "تنبيه:",
    loadErrorDefault: "فشل تحميل المصروفات",
  },
};

const expensesDictionaries: Record<Locale, ExpensesDictionary> = {
  en: expensesDictionaryEn,
  ar: expensesDictionaryAr,
};

export function getExpensesDictionary(locale: Locale): ExpensesDictionary {
  return expensesDictionaries[locale] ?? expensesDictionaries.en;
}

export function getExpenseActionErrorMessage(
  dictionary: ExpensesDictionary,
  errorCode?: string,
): string {
  if (errorCode === "validation_error") {
    return dictionary.actions.errors.validation;
  }
  return dictionary.actions.errors.generic;
}

export function getExpenseStatusLabel(locale: Locale, status: ExpenseStatus): string {
  const activeDictionary = getExpensesDictionary(locale);
  const englishDictionary = getExpensesDictionary("en");
  const key = `statuses.${status}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.statuses[status],
    category: "label",
    englishValue: englishDictionary.statuses[status],
    key,
    locale,
    namespace: "expenses",
    surface: "expense-status",
  });
}

export function getExpensePaymentMethodLabel(locale: Locale, method: ExpensePaymentMethod): string {
  const activeDictionary = getExpensesDictionary(locale);
  const englishDictionary = getExpensesDictionary("en");
  const key = `paymentMethods.${method}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.paymentMethods[method],
    category: "label",
    englishValue: englishDictionary.paymentMethods[method],
    key,
    locale,
    namespace: "expenses",
    surface: "expense-payment-method",
  });
}

export function getExpenseOriginTypeLabel(locale: Locale, origin: ExpenseOriginType): string {
  const activeDictionary = getExpensesDictionary(locale);
  const englishDictionary = getExpensesDictionary("en");
  const key = `originTypes.${origin}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.originTypes[origin],
    category: "label",
    englishValue: englishDictionary.originTypes[origin],
    key,
    locale,
    namespace: "expenses",
    surface: "expense-origin-type",
  });
}

export function getExpenseContextTypeLabel(locale: Locale, context: ExpenseContextType): string {
  const activeDictionary = getExpensesDictionary(locale);
  const englishDictionary = getExpensesDictionary("en");
  const key = `contextTypes.${context}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.contextTypes[context],
    category: "label",
    englishValue: englishDictionary.contextTypes[context],
    key,
    locale,
    namespace: "expenses",
    surface: "expense-context-type",
  });
}

export function getExpenseReimbursementStatusLabel(locale: Locale, status: ReimbursementStatus): string {
  const activeDictionary = getExpensesDictionary(locale);
  const englishDictionary = getExpensesDictionary("en");
  const key = `reimbursementStatuses.${status}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.reimbursementStatuses[status],
    category: "label",
    englishValue: englishDictionary.reimbursementStatuses[status],
    key,
    locale,
    namespace: "expenses",
    surface: "expense-reimbursement-status",
  });
}

export function getExceptionDispositionLabel(locale: Locale, disposition: ExceptionDisposition): string {
  const activeDictionary = getExpensesDictionary(locale);
  const englishDictionary = getExpensesDictionary("en");
  const key = `dispositions.${disposition}`;

  return resolveDictionaryValue({
    activeValue: activeDictionary.dispositions[disposition],
    category: "label",
    englishValue: englishDictionary.dispositions[disposition],
    key,
    locale,
    namespace: "expenses",
    surface: "exception-disposition",
  });
}
