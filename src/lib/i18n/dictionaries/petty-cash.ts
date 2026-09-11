import type { Locale } from "@/lib/i18n";

export interface PettyCashDictionary {
  header: { title: string; subtitle: string; sectionBadge: string; createFund: string };
  labels: {
    fundName: string;
    custodian: string;
    floatLimit: string;
    currentBalance: string;
    replenishmentCapacity: string;
    lastActivity: string;
    status: string;
    viewFund: string;
    noFunds: string;
    noFundsDescription: string;
    fundDetails: string;
    pettyCashExpenses: string;
    transactionLedger: string;
    lifecycleAudit: string;
    created: string;
    updated: string;
    ledger: string;
    immutableHistory: string;
    recordedBy: string;
    reference: string;
    linkedExpense: string;
    balanceBefore: string;
    balanceAfter: string;
    amount: string;
    date: string;
    context: string;
    category: string;
    description: string;
    review: string;
    approved: string;
    allocated: string;
    remaining: string;
  };
  statuses: { active: string; suspended: string; closed: string; submitted: string; approved: string; rejected: string };
  transactionTypes: { replenishment: string; disbursement: string; treasury_withdrawal: string; return: string };
  actions: {
    manage: string;
    replenish: string;
    recordExpense: string;
    disburse: string;
    withdraw: string;
    suspend: string;
    reactivate: string;
    close: string;
    save: string;
    cancel: string;
    create: string;
    working: string;
    retryReceipt: string;
    openExpenseWorkspace: string;
  };
  forms: {
    createTitle: string;
    editTitle: string;
    amount: string;
    reference: string;
    notes: string;
    expense: string;
    context: string;
    company: string;
    event: string;
    serviceId: string;
    category: string;
    description: string;
    date: string;
    receipt: string;
    noApprovedExpenses: string;
  };
  states: { accessRestricted: string; accessRestrictedMessage: string; loadError: string; error: string; success: string; receiptAttachmentFailed: string };
}

const en: PettyCashDictionary = {
  header: {
    title: "Petty Cash",
    subtitle: "Company cash float, approved expenses, replenishment, and treasury returns.",
    sectionBadge: "Expenses & Costing",
    createFund: "Create Fund",
  },
  labels: {
    fundName: "Fund name", custodian: "Custodian", floatLimit: "Float limit", currentBalance: "Current balance",
    replenishmentCapacity: "Replenishment Capacity", lastActivity: "Last activity", status: "Status", viewFund: "View fund",
    noFunds: "No Petty Cash funds", noFundsDescription: "Create a fund to begin managing petty cash.",
    fundDetails: "Fund Details", pettyCashExpenses: "Petty Cash Expenses", transactionLedger: "Transaction Ledger", lifecycleAudit: "Fund history", created: "Created", updated: "Updated", ledger: "Transactions", immutableHistory: "Transaction history",
    recordedBy: "Recorded by", reference: "Reference", linkedExpense: "Linked Expense", balanceBefore: "Balance before", balanceAfter: "Balance after",
    amount: "Amount", date: "Date", context: "Context", category: "Category", description: "Description", review: "Finance review", approved: "Approved", allocated: "Allocated", remaining: "Remaining",
  },
  statuses: { active: "Active", suspended: "Suspended", closed: "Closed", submitted: "Submitted", approved: "Approved", rejected: "Rejected" },
  transactionTypes: { replenishment: "Replenishment", disbursement: "Expense disbursement", treasury_withdrawal: "Return cash to Treasury", return: "Cash return" },
  actions: { manage: "Manage Fund", replenish: "Replenish", recordExpense: "Record Expense", disburse: "Disburse approved Expense", withdraw: "Return Cash to Treasury", suspend: "Suspend", reactivate: "Reactivate", close: "Close", save: "Save", cancel: "Cancel", create: "Create", working: "Working...", retryReceipt: "Retry receipt upload", openExpenseWorkspace: "Open Expense workspace" },
  forms: { createTitle: "Create Petty Cash Fund", editTitle: "Manage Petty Cash Fund", amount: "Amount (SAR)", reference: "Treasury evidence / reference", notes: "Notes", expense: "Approved Expense", context: "Expense context", company: "Company", event: "Event / Service", serviceId: "Service / Event", category: "Category", description: "Description", date: "Expense date", receipt: "Receipt", noApprovedExpenses: "No approved Petty Cash expense remains to disburse." },
  states: { accessRestricted: "Access Restricted", accessRestrictedMessage: "You do not have permission to view Petty Cash.", loadError: "Petty Cash could not be loaded.", error: "The action could not be completed.", success: "Petty Cash updated.", receiptAttachmentFailed: "The expense was created, but the receipt could not be attached. Retry the upload below." },
};

const ar: PettyCashDictionary = {
  header: { title: "المصروفات النثرية", subtitle: "صندوق نقدي للشركة مع مصروفات معتمدة وإعادة تغذية وإرجاع للخزينة.", sectionBadge: "المصروفات والتكاليف", createFund: "إنشاء صندوق" },
  labels: { fundName: "اسم الصندوق", custodian: "أمين العهدة", floatLimit: "حد الصندوق", currentBalance: "الرصيد الحالي", replenishmentCapacity: "المتاح لإعادة التغذية", lastActivity: "آخر نشاط", status: "الحالة", viewFund: "عرض الصندوق", noFunds: "لا توجد صناديق نقدية نثرية", noFundsDescription: "أنشئ صندوقاً لبدء إدارة النقدية.", fundDetails: "تفاصيل الصندوق", pettyCashExpenses: "مصروفات الصندوق", transactionLedger: "سجل المعاملات", lifecycleAudit: "سجل الصندوق", created: "تاريخ الإنشاء", updated: "آخر تحديث", ledger: "المعاملات", immutableHistory: "سجل المعاملات", recordedBy: "سجل بواسطة", reference: "المرجع", linkedExpense: "المصروف المرتبط", balanceBefore: "الرصيد قبل", balanceAfter: "الرصيد بعد", amount: "المبلغ", date: "التاريخ", context: "السياق", category: "التصنيف", description: "الوصف", review: "المراجعة المالية", approved: "معتمد", allocated: "المخصص", remaining: "المتبقي" },
  statuses: { active: "نشط", suspended: "موقوف", closed: "مغلق", submitted: "مقدم", approved: "معتمد", rejected: "مرفوض" },
  transactionTypes: { replenishment: "إعادة تغذية", disbursement: "صرف مصروف", treasury_withdrawal: "إرجاع النقد إلى الخزينة", return: "إرجاع نقدي" },
  actions: { manage: "إدارة الصندوق", replenish: "إعادة تغذية", recordExpense: "تسجيل مصروف", disburse: "صرف المصروف المعتمد", withdraw: "إرجاع النقد للخزينة", suspend: "إيقاف", reactivate: "إعادة تفعيل", close: "إغلاق", save: "حفظ", cancel: "إلغاء", create: "إنشاء", working: "جارٍ التنفيذ...", retryReceipt: "إعادة رفع الإيصال", openExpenseWorkspace: "فتح مساحة المصروفات" },
  forms: { createTitle: "إنشاء صندوق نقدية نثرية", editTitle: "إدارة صندوق النقدية النثرية", amount: "المبلغ (ريال)", reference: "مرجع / إثبات الخزينة", notes: "ملاحظات", expense: "المصروف المعتمد", context: "سياق المصروف", company: "عام للشركة", event: "الفعالية / الخدمة", serviceId: "الخدمة / الفعالية", category: "التصنيف", description: "الوصف", date: "تاريخ المصروف", receipt: "الإيصال", noApprovedExpenses: "لا توجد مصروفات نثرية معتمدة متبقية للصرف." },
  states: { accessRestricted: "تم تقييد الوصول", accessRestrictedMessage: "ليس لديك صلاحية لعرض المصروفات النثرية.", loadError: "تعذر تحميل المصروفات النثرية.", error: "تعذر تنفيذ الإجراء.", success: "تم تحديث المصروفات النثرية.", receiptAttachmentFailed: "تم إنشاء المصروف، ولكن تعذر إرفاق الإيصال. أعد رفع الإيصال أدناه." },
};

export function getPettyCashDictionary(locale: Locale): PettyCashDictionary {
  return locale === "ar" ? ar : en;
}
