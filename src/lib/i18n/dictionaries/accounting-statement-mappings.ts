import type { AccountingActionErrorCode } from "@/lib/accounting/types";
import type { Locale } from "@/lib/i18n/locales";

export type AccountingStatementMappingsDictionary = {
  title: string;
  subtitle: string;
  backToSetup: string;
  accessDeniedTitle: string;
  accessDeniedBody: string;
  notInitializedTitle: string;
  notInitializedBody: string;
  recoveryRequiredTitle: string;
  recoveryRequiredBody: string;
  dependencyFailureTitle: string;
  dependencyFailureBody: string;
  emptyTitle: string;
  emptyBody: string;
  noAccounts: string;
  create: string;
  revise: string;
  save: string;
  saving: string;
  cancel: string;
  currentVersion: string;
  versionHistory: string;
  version: string;
  previousVersion: string;
  effectiveFrom: string;
  reason: string;
  evidenceReference: string;
  entries: string;
  addEntry: string;
  removeEntry: string;
  account: string;
  accountVersion: string;
  accountType: string;
  accountTypes: Record<"ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE", string>;
  protected: string;
  statementType: string;
  section: string;
  sections: Record<"REVENUE" | "EXPENSE" | "ASSETS" | "LIABILITIES" | "EQUITY", string>;
  lineKey: string;
  labelEn: string;
  labelAr: string;
  displayOrder: string;
  profitLoss: string;
  balanceSheet: string;
  pnlRestriction: string;
  balanceSheetRestriction: string;
  noProfessionalDefaults: string;
  savedVersion: string;
  invalidEntries: string;
  historyTruncated: string;
  errors: Partial<Record<AccountingActionErrorCode, string>>;
};

const en: AccountingStatementMappingsDictionary = {
  title: "Financial Statement Mappings",
  subtitle: "Configure versioned account-to-line presentation for Profit and Loss and Balance Sheet reports.",
  backToSetup: "Accounting setup",
  accessDeniedTitle: "Access denied",
  accessDeniedBody: "Financial statement mapping configuration requires accounting chart management authority.",
  notInitializedTitle: "Accounting profile is not initialized",
  notInitializedBody: "Initialize the accounting foundation before configuring financial statement mappings. This page does not initialize accounting.",
  recoveryRequiredTitle: "Accounting authority recovery is required",
  recoveryRequiredBody: "Complete authority recovery in Accounting Setup before configuring mappings.",
  dependencyFailureTitle: "Financial Statement Mappings are temporarily unavailable",
  dependencyFailureBody: "The accounting service could not return valid mapping configuration. Try again later or contact an administrator.",
  emptyTitle: "No financial statement mappings have been configured",
  emptyBody: "Add only company-approved mappings when the chart and reporting structure are ready. No professional or sample mappings are supplied.",
  noAccounts: "No eligible current posting accounts are available. Configure the chart first; this page does not create accounts.",
  create: "Create mapping set",
  revise: "Revise current mappings",
  save: "Save mapping version",
  saving: "Saving…",
  cancel: "Cancel",
  currentVersion: "Current mapping version",
  versionHistory: "Version history",
  version: "Version",
  previousVersion: "Previous version",
  effectiveFrom: "Effective from",
  reason: "Reason for change",
  evidenceReference: "Evidence reference",
  entries: "Account mappings",
  addEntry: "Add account mapping",
  removeEntry: "Remove mapping",
  account: "Account and exact version",
  accountVersion: "Account version",
  accountType: "Account type",
  accountTypes: { ASSET: "Asset", LIABILITY: "Liability", EQUITY: "Equity", REVENUE: "Revenue", EXPENSE: "Expense" },
  protected: "Protected account",
  statementType: "Statement",
  section: "Section",
  sections: { REVENUE: "Revenue", EXPENSE: "Expense", ASSETS: "Assets", LIABILITIES: "Liabilities", EQUITY: "Equity" },
  lineKey: "Line key",
  labelEn: "English line label",
  labelAr: "Arabic line label",
  displayOrder: "Display order",
  profitLoss: "Profit and Loss",
  balanceSheet: "Balance Sheet",
  pnlRestriction: "Revenue and expense accounts map to Profit and Loss; their sections are fixed by account type.",
  balanceSheetRestriction: "Asset, liability, and equity accounts map to Balance Sheet; their sections are fixed by account type.",
  noProfessionalDefaults: "Line keys and labels are owner-defined. This UI does not provide or recommend professional mappings.",
  savedVersion: "Mapping version {version} saved.",
  invalidEntries: "Review account versions, required labels, line keys, and the account-to-statement rules.",
  historyTruncated: "Showing the 50 most recent versions.",
  errors: {
    invalid_input: "Review the required fields and mapping entries.",
    authority_denied: "Your accounting chart authority changed. Refresh or contact an administrator.",
    revision_conflict: "The mappings changed after you opened them. Reload the latest version.",
    request_payload_conflict: "This request conflicts with an earlier save. Refresh and submit the current details again.",
    account_not_found: "The selected account version is no longer available. Reload the chart.",
    mapping_invalid: "The mapping conflicts with the account type or line contract.",
    mapping_conflict: "This account already has a mapping for that statement.",
    dependency_failure: "The accounting service could not complete the request.",
  },
};

const ar: AccountingStatementMappingsDictionary = {
  title: "تعيينات القوائم المالية",
  subtitle: "أعد إعداد عرض الحسابات ضمن بنود قائمة الدخل والميزانية بإصدارات منظمة.",
  backToSetup: "إعداد المحاسبة",
  accessDeniedTitle: "تم رفض الوصول",
  accessDeniedBody: "يتطلب إعداد تعيينات القوائم المالية صلاحية إدارة دليل الحسابات.",
  notInitializedTitle: "لم تتم تهيئة ملف المحاسبة",
  notInitializedBody: "هيّئ الأساس المحاسبي قبل إعداد تعيينات القوائم المالية. لا تقوم هذه الصفحة بتهيئة المحاسبة.",
  recoveryRequiredTitle: "استعادة صلاحية المحاسبة مطلوبة",
  recoveryRequiredBody: "أكمل استعادة الصلاحية من إعداد المحاسبة قبل إعداد التعيينات.",
  dependencyFailureTitle: "تعيينات القوائم المالية غير متاحة مؤقتاً",
  dependencyFailureBody: "تعذر على خدمة المحاسبة إرجاع إعدادات تعيينات صالحة. حاول لاحقاً أو تواصل مع المسؤول.",
  emptyTitle: "لم يتم إعداد تعيينات للقوائم المالية",
  emptyBody: "أضف التعيينات المعتمدة من الشركة فقط بعد جاهزية الدليل وهيكل التقارير. لا توجد تعيينات مهنية أو تجريبية مسبقة.",
  noAccounts: "لا توجد حسابات ترحيل حالية مؤهلة. أعد إعداد الدليل أولاً؛ لا تنشئ هذه الصفحة حسابات.",
  create: "إنشاء مجموعة تعيينات",
  revise: "إنشاء إصدار للتعيينات الحالية",
  save: "حفظ إصدار التعيينات",
  saving: "جارٍ الحفظ…",
  cancel: "إلغاء",
  currentVersion: "إصدار التعيينات الحالي",
  versionHistory: "سجل الإصدارات",
  version: "الإصدار",
  previousVersion: "الإصدار السابق",
  effectiveFrom: "ساري من",
  reason: "سبب التغيير",
  evidenceReference: "مرجع الإثبات",
  entries: "تعيينات الحسابات",
  addEntry: "إضافة تعيين حساب",
  removeEntry: "إزالة التعيين",
  account: "الحساب وإصداره المحدد",
  accountVersion: "إصدار الحساب",
  accountType: "نوع الحساب",
  accountTypes: { ASSET: "أصل", LIABILITY: "التزام", EQUITY: "حقوق الملكية", REVENUE: "إيراد", EXPENSE: "مصروف" },
  protected: "حساب محمي",
  statementType: "القائمة",
  section: "القسم",
  sections: { REVENUE: "الإيرادات", EXPENSE: "المصروفات", ASSETS: "الأصول", LIABILITIES: "الالتزامات", EQUITY: "حقوق الملكية" },
  lineKey: "مفتاح البند",
  labelEn: "اسم البند بالإنجليزية",
  labelAr: "اسم البند بالعربية",
  displayOrder: "ترتيب العرض",
  profitLoss: "قائمة الدخل",
  balanceSheet: "الميزانية",
  pnlRestriction: "تعيّن حسابات الإيرادات والمصروفات لقائمة الدخل، ويحدد نوع الحساب القسم المسموح.",
  balanceSheetRestriction: "تعيّن الأصول والالتزامات وحقوق الملكية للميزانية، ويحدد نوع الحساب القسم المسموح.",
  noProfessionalDefaults: "يحدد المستخدم مفاتيح البنود وتسمياتها. لا توفر هذه الصفحة تعيينات مهنية ولا توصي بها.",
  savedVersion: "تم حفظ إصدار التعيينات {version}.",
  invalidEntries: "تحقق من إصدارات الحسابات والتسميات ومفاتيح البنود وقواعد ربط الحساب بالقائمة.",
  historyTruncated: "تعرض أحدث ٥٠ إصداراً.",
  errors: {
    invalid_input: "تحقق من الحقول المطلوبة وتعيينات الحسابات.",
    authority_denied: "تغيرت صلاحية إدارة دليل الحسابات. حدّث الصفحة أو تواصل مع المسؤول.",
    revision_conflict: "تغيرت التعيينات بعد فتحها. أعد تحميل أحدث إصدار.",
    request_payload_conflict: "يتعارض هذا الطلب مع حفظ سابق. حدّث الصفحة وأرسل التفاصيل الحالية مجدداً.",
    account_not_found: "لم يعد إصدار الحساب المحدد متاحاً. أعد تحميل الدليل.",
    mapping_invalid: "يتعارض التعيين مع نوع الحساب أو عقد البند.",
    mapping_conflict: "للحساب تعيين موجود لهذه القائمة.",
    dependency_failure: "تعذرت خدمة المحاسبة عن إكمال الطلب.",
  },
};

export function getAccountingStatementMappingsDictionary(locale: Locale): AccountingStatementMappingsDictionary {
  return locale === "ar" ? ar : en;
}
