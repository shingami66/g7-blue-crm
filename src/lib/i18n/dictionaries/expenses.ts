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
    stageBadge: string;
    title: string;
    subtitle: string;
  };
  tabs: {
    expensesLedger: string;
    cashAdvancesLocked: string;
    pettyCashLocked: string;
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
      reimbursement: string;
    };
    empty: {
      title: string;
      description: string;
    };
  };
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
  dispositions: Record<ExceptionDisposition, string>;
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
    stageBadge: "W5A Foundation",
    title: "Expenses & Cash Accountability",
    subtitle: "Authoritative foundation for incurred expenses, employee reimbursements, cash advances, and petty cash.",
  },
  tabs: {
    expensesLedger: "Expenses Ledger",
    cashAdvancesLocked: "Cash Advances (W5B)",
    pettyCashLocked: "Petty Cash (W5B)",
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
      reimbursement: "Reimbursement",
    },
    empty: {
      title: "No expense records found",
      description: "The W5A expense and cash foundation is established. Records submitted through governed Server Actions will appear here.",
    },
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
  dispositions: {
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    rectified: "Rectified",
  },
  states: {
    accessRestricted: "Access Restricted",
    accessRestrictedMessage: "You do not have permission to view Expenses & Cash accountability records.",
    noticePrefix: "Notice:",
    loadErrorDefault: "Failed to load expenses",
  },
};

const expensesDictionaryAr: ExpensesDictionary = {
  locale: "ar",
  header: {
    sectionBadge: "المصروفات والتكاليف",
    stageBadge: "تأسيس W5A",
    title: "المصروفات والعهد",
    subtitle: "الأساس المعتمد للمصروفات المتكبدة، والتعويضات للموظفين، والسلف والعهد النقدية.",
  },
  tabs: {
    expensesLedger: "سجل المصروفات",
    cashAdvancesLocked: "السلف النقدية (W5B)",
    pettyCashLocked: "العهد النقدية (W5B)",
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
      reimbursement: "التعويض",
    },
    empty: {
      title: "لا توجد مصروفات مسجلة",
      description: "تم تأسيس بنية المصروفات والعهد النقدية. السجلات المسجلة عبر الإجراءات المعتمدة ستظهر هنا.",
    },
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
    petty_cash: "عهدة نقدية",
    cash_advance: "سلفة نقدية",
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
  dispositions: {
    pending: "قيد المراجعة",
    accepted: "مقبول",
    rejected: "مرفوض",
    rectified: "تمت التسوية",
  },
  states: {
    accessRestricted: "تم تقييد الوصول",
    accessRestrictedMessage: "ليس لديك صلاحية لعرض سجلات المصروفات والعهد.",
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
