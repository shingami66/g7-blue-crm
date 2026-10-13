import type {
  AccountingAccountKind,
  AccountingAccountType,
  AccountingActionErrorCode,
  AccountingControlClassification,
  AccountingNormalBalance,
} from "@/lib/accounting/types";
import type { Locale } from "@/lib/i18n/locales";

export type AccountingChartDictionary = {
  title: string;
  subtitle: string;
  backToSetup: string;
  accessDeniedTitle: string;
  accessDeniedBody: string;
  dependencyFailureTitle: string;
  dependencyFailureBody: string;
  notInitializedTitle: string;
  notInitializedBody: string;
  recoveryRequiredTitle: string;
  recoveryRequiredBody: string;
  emptyTitle: string;
  emptyBody: string;
  currentAccounts: string;
  newAccount: string;
  edit: string;
  createTitle: string;
  editTitle: string;
  accountCode: string;
  nameEn: string;
  nameAr: string;
  accountType: string;
  category: string;
  normalBalance: string;
  accountKind: string;
  parent: string;
  noParent: string;
  active: string;
  protected: string;
  controlClassification: string;
  reason: string;
  evidenceReference: string;
  save: string;
  saving: string;
  cancel: string;
  savedVersion: string;
  actionFailure: string;
  chooseValue: string;
  yes: string;
  no: string;
  inactive: string;
  lockedFieldsNote: string;
  childrenPreventPosting: string;
  version: string;
  versionHistory: string;
  priorVersion: string;
  effectiveFrom: string;
  reloadLatest: string;
  accountTypes: Record<AccountingAccountType, string>;
  accountKinds: Record<AccountingAccountKind, string>;
  normalBalances: Record<AccountingNormalBalance, string>;
  classifications: Record<AccountingControlClassification, string>;
  errors: Partial<Record<AccountingActionErrorCode, string>>;
};

const english: AccountingChartDictionary = {
  title: "Chart of Accounts",
  subtitle: "Review the current account hierarchy and make governed, versioned changes.",
  backToSetup: "Accounting setup",
  accessDeniedTitle: "Access denied",
  accessDeniedBody: "Your account does not have permission to view the Chart of Accounts.",
  dependencyFailureTitle: "Chart of Accounts is temporarily unavailable",
  dependencyFailureBody: "The accounting service could not return a valid response. Try again later or contact an administrator.",
  notInitializedTitle: "Accounting profile is not initialized",
  notInitializedBody: "Initialize the accounting foundation before viewing or configuring accounts. This screen does not initialize the profile or create account records.",
  recoveryRequiredTitle: "Accounting authority recovery is required",
  recoveryRequiredBody: "Complete the required authority recovery in Accounting Setup before configuring accounts.",
  emptyTitle: "No accounts have been configured",
  emptyBody: "Add company-approved accounts when the authorized accounting setup is ready. No sample or default accounts are provided.",
  currentAccounts: "Current accounts",
  newAccount: "Add account",
  edit: "Edit",
  createTitle: "New account",
  editTitle: "Revise account",
  accountCode: "Account code",
  nameEn: "English name",
  nameAr: "Arabic name",
  accountType: "Account type",
  category: "Category",
  normalBalance: "Normal balance",
  accountKind: "Posting classification",
  parent: "Parent heading",
  noParent: "No parent",
  active: "Active",
  protected: "Protected account",
  controlClassification: "Control classification",
  reason: "Reason for change",
  evidenceReference: "Evidence reference (optional)",
  save: "Save account version",
  saving: "Saving…",
  cancel: "Cancel",
  savedVersion: "Account saved as version {version}.",
  actionFailure: "The request could not be completed. Review the details and try again.",
  chooseValue: "Choose a value",
  yes: "Yes",
  no: "No",
  inactive: "Inactive",
  lockedFieldsNote: "Protected accounts keep their code, type, category, balance, posting classification, parent and control classification. Names and active state can still be revised.",
  childrenPreventPosting: "This heading has child accounts and must remain non-posting.",
  version: "Version",
  versionHistory: "Previous versions",
  priorVersion: "Previous version",
  effectiveFrom: "Effective from",
  reloadLatest: "Reload the latest account version",
  accountTypes: { ASSET: "Asset", LIABILITY: "Liability", EQUITY: "Equity", REVENUE: "Revenue", EXPENSE: "Expense" },
  accountKinds: { POSTING: "Posting account", NON_POSTING: "Heading only" },
  normalBalances: { DEBIT: "Debit", CREDIT: "Credit" },
  classifications: {
    NONE: "None",
    ACCOUNTS_RECEIVABLE: "Accounts receivable",
    ACCOUNTS_PAYABLE: "Accounts payable",
    ACCRUED_LIABILITY: "Accrued liability",
    CUSTOMER_ADVANCE: "Customer advance",
    SUPPLIER_ADVANCE: "Supplier advance",
    CONTRACT_LIABILITY: "Contract liability",
    CASH_ACCOUNTABILITY: "Cash accountability",
    EMPLOYEE_ADVANCE: "Employee advance",
    EMPLOYEE_REIMBURSEMENT_LIABILITY: "Employee reimbursement liability",
    CONTRACT_ASSET: "Contract asset",
  },
  errors: {
    invalid_input: "Review the account details and required fields.",
    authority_denied: "Your accounting permission changed. Refresh the page or contact an administrator.",
    profile_not_initialized: "Initialize the accounting profile before saving accounts.",
    profile_not_active: "The accounting profile is not active for this change.",
    revision_conflict: "This account changed after you opened it. Reload the latest version before trying again.",
    request_payload_conflict: "This save request conflicts with an earlier request. Refresh and submit the current details again.",
    account_not_found: "This account is no longer available. Reload the chart.",
    account_code_conflict: "That account code is already in use. Choose a different code.",
    parent_not_found: "The selected parent heading is no longer available. Choose another parent.",
    parent_must_be_non_posting: "An account can only be placed under a non-posting heading.",
    account_cycle: "That parent would create a hierarchy cycle. Choose another heading.",
    account_has_children: "An account with children cannot be changed to a posting account.",
    protected_account_invariant: "A protected account must keep its control and structural classification.",
  },
};

const arabic: AccountingChartDictionary = {
  title: "دليل الحسابات",
  subtitle: "راجع تسلسل الحسابات الحالي وأجرِ تغييرات منضبطة ذات إصدارات.",
  backToSetup: "إعداد المحاسبة",
  accessDeniedTitle: "تم رفض الوصول",
  accessDeniedBody: "لا يملك حسابك صلاحية عرض دليل الحسابات.",
  dependencyFailureTitle: "دليل الحسابات غير متاح مؤقتاً",
  dependencyFailureBody: "تعذر على خدمة المحاسبة إرجاع استجابة صالحة. حاول لاحقاً أو تواصل مع المسؤول.",
  notInitializedTitle: "لم تتم تهيئة ملف المحاسبة",
  notInitializedBody: "هيّئ أساس المحاسبة قبل عرض الحسابات أو إعدادها. لا تنشئ هذه الشاشة الملف ولا سجلات الحسابات.",
  recoveryRequiredTitle: "استعادة صلاحية المحاسبة مطلوبة",
  recoveryRequiredBody: "أكمل استعادة الصلاحيات المطلوبة في إعداد المحاسبة قبل إعداد الحسابات.",
  emptyTitle: "لم يتم إعداد حسابات",
  emptyBody: "أضف الحسابات المعتمدة للشركة عندما يكون الإعداد المحاسبي المخول جاهزاً. لا توجد حسابات نموذجية أو افتراضية.",
  currentAccounts: "الحسابات الحالية",
  newAccount: "إضافة حساب",
  edit: "تعديل",
  createTitle: "حساب جديد",
  editTitle: "إنشاء إصدار للحساب",
  accountCode: "رمز الحساب",
  nameEn: "الاسم بالإنجليزية",
  nameAr: "الاسم بالعربية",
  accountType: "نوع الحساب",
  category: "الفئة",
  normalBalance: "الرصيد الطبيعي",
  accountKind: "تصنيف الترحيل",
  parent: "الحساب الرئيسي التجميعي",
  noParent: "دون حساب رئيسي",
  active: "نشط",
  protected: "حساب محمي",
  controlClassification: "تصنيف الحساب الرقابي",
  reason: "سبب التغيير",
  evidenceReference: "مرجع الإثبات (اختياري)",
  save: "حفظ إصدار الحساب",
  saving: "جارٍ الحفظ…",
  cancel: "إلغاء",
  savedVersion: "تم حفظ الحساب بالإصدار {version}.",
  actionFailure: "تعذر إكمال الطلب. راجع التفاصيل وحاول مرة أخرى.",
  chooseValue: "اختر قيمة",
  yes: "نعم",
  no: "لا",
  inactive: "غير نشط",
  lockedFieldsNote: "تحافظ الحسابات المحمية على الرمز والنوع والفئة والرصيد وتصنيف الترحيل والحساب الرئيسي والتصنيف الرقابي. يمكن تعديل الأسماء وحالة النشاط.",
  childrenPreventPosting: "يحتوي هذا الحساب التجميعي على حسابات فرعية، ويجب أن يبقى غير قابل للترحيل.",
  version: "الإصدار",
  versionHistory: "الإصدارات السابقة",
  priorVersion: "الإصدار السابق",
  effectiveFrom: "ساري من",
  reloadLatest: "إعادة تحميل أحدث إصدار للحساب",
  accountTypes: { ASSET: "أصل", LIABILITY: "التزام", EQUITY: "حقوق ملكية", REVENUE: "إيراد", EXPENSE: "مصروف" },
  accountKinds: { POSTING: "حساب قابل للترحيل", NON_POSTING: "حساب تجميعي فقط" },
  normalBalances: { DEBIT: "مدين", CREDIT: "دائن" },
  classifications: {
    NONE: "لا يوجد",
    ACCOUNTS_RECEIVABLE: "ذمم مدينة",
    ACCOUNTS_PAYABLE: "ذمم دائنة",
    ACCRUED_LIABILITY: "التزام مستحق",
    CUSTOMER_ADVANCE: "دفعة مقدمة من عميل",
    SUPPLIER_ADVANCE: "دفعة مقدمة لمورد",
    CONTRACT_LIABILITY: "التزام عقد",
    CASH_ACCOUNTABILITY: "عهدة نقدية",
    EMPLOYEE_ADVANCE: "سلفة موظف",
    EMPLOYEE_REIMBURSEMENT_LIABILITY: "التزام تعويض موظف",
    CONTRACT_ASSET: "أصل عقد",
  },
  errors: {
    invalid_input: "راجع تفاصيل الحساب والحقول المطلوبة.",
    authority_denied: "تغيرت صلاحية المحاسبة لديك. حدّث الصفحة أو تواصل مع المسؤول.",
    profile_not_initialized: "هيّئ ملف المحاسبة قبل حفظ الحسابات.",
    profile_not_active: "ملف المحاسبة غير نشط لهذا التغيير.",
    revision_conflict: "تغير هذا الحساب بعد فتحه. أعد تحميل أحدث إصدار قبل المحاولة مرة أخرى.",
    request_payload_conflict: "يتعارض طلب الحفظ مع طلب سابق. حدّث الصفحة وأرسل التفاصيل الحالية مرة أخرى.",
    account_not_found: "لم يعد هذا الحساب متاحاً. أعد تحميل الدليل.",
    account_code_conflict: "رمز الحساب مستخدم بالفعل. اختر رمزاً آخر.",
    parent_not_found: "لم يعد الحساب الرئيسي المحدد متاحاً. اختر حساباً آخر.",
    parent_must_be_non_posting: "لا يمكن وضع الحساب إلا تحت حساب تجميعي غير قابل للترحيل.",
    account_cycle: "سيؤدي هذا الحساب الرئيسي إلى إنشاء دورة في التسلسل. اختر حساباً آخر.",
    account_has_children: "لا يمكن تحويل حساب له حسابات فرعية إلى حساب قابل للترحيل.",
    protected_account_invariant: "يجب أن يحافظ الحساب المحمي على تصنيفه الرقابي والهيكلي.",
  },
};

export function getAccountingChartDictionary(locale: Locale): AccountingChartDictionary {
  return locale === "ar" ? arabic : english;
}
