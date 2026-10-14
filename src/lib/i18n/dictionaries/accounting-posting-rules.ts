import type {
  AccountingActionErrorCode,
  AccountingPostingRuleMappingInput,
} from "@/lib/accounting/types";
import type { Locale } from "@/lib/i18n/locales";

export type AccountingPostingRulesDictionary = {
  title: string;
  subtitle: string;
  backToSetup: string;
  openChart: string;
  currentRules: string;
  create: string;
  revise: string;
  createTitle: string;
  reviseTitle: string;
  ruleCode: string;
  nameEn: string;
  nameAr: string;
  active: string;
  inactive: string;
  mappings: string;
  mapping: string;
  mappingKey: string;
  account: string;
  chooseAccount: string;
  allowedSide: string;
  serviceRequirement: string;
  addMapping: string;
  removeMapping: string;
  minimumMappings: string;
  reason: string;
  evidenceReference: string;
  save: string;
  saving: string;
  cancel: string;
  version: string;
  versionHistory: string;
  effectiveFrom: string;
  savedVersion: string;
  mappingContractNote: string;
  staleBinding: string;
  accountVersionUnavailable: string;
  emptyTitle: string;
  emptyBody: string;
  noAccountsTitle: string;
  noAccountsBody: string;
  noEligibleAccountsTitle: string;
  noEligibleAccountsBody: string;
  notInitializedTitle: string;
  notInitializedBody: string;
  recoveryRequiredTitle: string;
  recoveryRequiredBody: string;
  accessDeniedTitle: string;
  accessDeniedBody: string;
  dependencyFailureTitle: string;
  dependencyFailureBody: string;
  reloadLatest: string;
  actionFailure: string;
  allowedSides: Record<AccountingPostingRuleMappingInput["allowed_side"], string>;
  serviceRequirements: Record<AccountingPostingRuleMappingInput["service_requirement"], string>;
  problems: Record<"duplicate" | "minimum" | "incomplete" | "rule-code", string>;
  errors: Partial<Record<AccountingActionErrorCode, string>>;
};

const english: AccountingPostingRulesDictionary = {
  title: "Posting Rules",
  subtitle: "Review and configure versioned posting rules and their exact account-version mappings.",
  backToSetup: "Accounting setup",
  openChart: "Open Chart of Accounts",
  currentRules: "Posting rules",
  create: "Create rule",
  revise: "Revise",
  createTitle: "New posting rule",
  reviseTitle: "Revise posting rule",
  ruleCode: "Rule code",
  nameEn: "English name",
  nameAr: "Arabic name",
  active: "Active",
  inactive: "Inactive",
  mappings: "Mappings",
  mapping: "Mapping",
  mappingKey: "Mapping key",
  account: "Posting account",
  chooseAccount: "Choose a current account version",
  allowedSide: "Allowed side",
  serviceRequirement: "Service requirement",
  addMapping: "Add mapping",
  removeMapping: "Remove",
  minimumMappings: "At least two mappings are required.",
  reason: "Reason for change",
  evidenceReference: "Evidence reference (optional)",
  save: "Save rule version",
  saving: "Saving…",
  cancel: "Cancel",
  version: "Version",
  versionHistory: "Previous versions",
  effectiveFrom: "Effective from",
  savedVersion: "Posting rule saved as version {version}.",
  mappingContractNote: "Choose the current version of each active posting account. The accounting service checks whether each mapping key and account are valid together.",
  staleBinding: "Stored account version is no longer current. Select a current version explicitly",
  accountVersionUnavailable: "The bound account version is not in the current chart response.",
  emptyTitle: "No posting rules have been configured",
  emptyBody: "Create a rule only after the company-approved account mappings are ready. This screen does not create journals or opening balances.",
  noAccountsTitle: "Chart of Accounts setup is required",
  noAccountsBody: "Configure company-approved accounts before creating posting-rule mappings. No sample accounts are provided.",
  noEligibleAccountsTitle: "No active posting accounts are available",
  noEligibleAccountsBody: "Add or activate a posting account with no child accounts before configuring rule mappings.",
  notInitializedTitle: "Accounting profile is not initialized",
  notInitializedBody: "Initialize the accounting foundation before viewing or configuring posting rules. This screen does not initialize it.",
  recoveryRequiredTitle: "Accounting authority recovery is required",
  recoveryRequiredBody: "Complete authority recovery in Accounting Setup before configuring posting rules.",
  accessDeniedTitle: "Access denied",
  accessDeniedBody: "Your account does not have permission to view Posting Rules.",
  dependencyFailureTitle: "Posting Rules are temporarily unavailable",
  dependencyFailureBody: "The accounting service could not return a valid response. Try again later or contact an administrator.",
  reloadLatest: "Reload the latest rule version",
  actionFailure: "The request could not be completed. Review the details and try again.",
  allowedSides: { DEBIT: "Debit", CREDIT: "Credit", EITHER: "Either side" },
  serviceRequirements: { REQUIRED: "Required", OPTIONAL: "Optional", FORBIDDEN: "Forbidden" },
  problems: {
    duplicate: "Each mapping key must be unique within this rule version.",
    minimum: "At least two mappings are required.",
    incomplete: "Enter a valid mapping key and choose its current account version for each mapping.",
    "rule-code": "Use 2–40 uppercase letters, numbers, and underscores; start with a letter.",
  },
  errors: {
    invalid_input: "Review the rule details and required fields.",
    authority_denied: "Your accounting permission changed. Refresh the page or contact an administrator.",
    profile_not_initialized: "Initialize the accounting profile before saving posting rules.",
    profile_not_active: "The accounting profile is not active for this change.",
    revision_conflict: "This rule changed after you opened it. Reload the latest version before trying again.",
    request_payload_conflict: "This save request conflicts with an earlier request. Refresh and submit the current details again.",
    posting_rule_not_found: "This rule is no longer available. Reload the rules list.",
    source_identity_immutable: "The rule code cannot be changed after creation.",
    mapping_conflict: "A mapping key is already used in this rule. Use a unique key for each mapping.",
    mapping_invalid: "One or more mapping keys or account versions are not valid for this rule.",
  },
};

const arabic: AccountingPostingRulesDictionary = {
  title: "قواعد الترحيل",
  subtitle: "راجع قواعد الترحيل ذات الإصدارات وربطها بإصدارات الحسابات المحددة.",
  backToSetup: "إعداد المحاسبة",
  openChart: "فتح دليل الحسابات",
  currentRules: "قواعد الترحيل",
  create: "إنشاء قاعدة",
  revise: "إنشاء إصدار",
  createTitle: "قاعدة ترحيل جديدة",
  reviseTitle: "إنشاء إصدار لقاعدة الترحيل",
  ruleCode: "رمز القاعدة",
  nameEn: "الاسم بالإنجليزية",
  nameAr: "الاسم بالعربية",
  active: "نشطة",
  inactive: "غير نشطة",
  mappings: "الربط",
  mapping: "ربط",
  mappingKey: "مفتاح الربط",
  account: "حساب قابل للترحيل",
  chooseAccount: "اختر إصداراً حالياً للحساب",
  allowedSide: "الجانب المسموح",
  serviceRequirement: "اشتراط الخدمة",
  addMapping: "إضافة ربط",
  removeMapping: "إزالة",
  minimumMappings: "يلزم وجود ربطين على الأقل.",
  reason: "سبب التغيير",
  evidenceReference: "مرجع الإثبات (اختياري)",
  save: "حفظ إصدار القاعدة",
  saving: "جارٍ الحفظ…",
  cancel: "إلغاء",
  version: "الإصدار",
  versionHistory: "الإصدارات السابقة",
  effectiveFrom: "ساري من",
  savedVersion: "تم حفظ قاعدة الترحيل بالإصدار {version}.",
  mappingContractNote: "اختر الإصدار الحالي لكل حساب نشط قابل للترحيل. تتحقق خدمة المحاسبة من توافق مفتاح الربط والحساب.",
  staleBinding: "إصدار الحساب المحفوظ لم يعد حالياً. اختر إصداراً حالياً صراحةً",
  accountVersionUnavailable: "إصدار الحساب المرتبط غير موجود في استجابة الدليل الحالية.",
  emptyTitle: "لم يتم إعداد قواعد ترحيل",
  emptyBody: "أنشئ قاعدة بعد تجهيز روابط الحسابات المعتمدة للشركة. لا تنشئ هذه الشاشة قيوداً أو أرصدة افتتاحية.",
  noAccountsTitle: "يلزم إعداد دليل الحسابات",
  noAccountsBody: "أعدّ الحسابات المعتمدة للشركة قبل إنشاء روابط قواعد الترحيل. لا توجد حسابات نموذجية.",
  noEligibleAccountsTitle: "لا توجد حسابات نشطة قابلة للترحيل",
  noEligibleAccountsBody: "أضف أو فعّل حساباً قابلاً للترحيل دون حسابات فرعية قبل إعداد روابط القواعد.",
  notInitializedTitle: "لم تتم تهيئة ملف المحاسبة",
  notInitializedBody: "هيّئ أساس المحاسبة قبل عرض قواعد الترحيل أو إعدادها. لا تقوم هذه الشاشة بتهيئته.",
  recoveryRequiredTitle: "استعادة صلاحية المحاسبة مطلوبة",
  recoveryRequiredBody: "أكمل استعادة الصلاحيات في إعداد المحاسبة قبل إعداد قواعد الترحيل.",
  accessDeniedTitle: "تم رفض الوصول",
  accessDeniedBody: "لا يملك حسابك صلاحية عرض قواعد الترحيل.",
  dependencyFailureTitle: "قواعد الترحيل غير متاحة مؤقتاً",
  dependencyFailureBody: "تعذر على خدمة المحاسبة إرجاع استجابة صالحة. حاول لاحقاً أو تواصل مع المسؤول.",
  reloadLatest: "إعادة تحميل أحدث إصدار للقاعدة",
  actionFailure: "تعذر إكمال الطلب. راجع التفاصيل وحاول مرة أخرى.",
  allowedSides: { DEBIT: "مدين", CREDIT: "دائن", EITHER: "أي من الجانبين" },
  serviceRequirements: { REQUIRED: "مطلوبة", OPTIONAL: "اختيارية", FORBIDDEN: "غير مسموحة" },
  problems: {
    duplicate: "يجب أن يكون لكل مفتاح ربط قيمة فريدة داخل إصدار القاعدة.",
    minimum: "يلزم وجود ربطين على الأقل.",
    incomplete: "أدخل مفتاح ربط صالحاً واختر إصدار الحساب الحالي لكل ربط.",
    "rule-code": "استخدم من حرفين إلى ٤٠ حرفاً إنجليزياً كبيراً أو رقماً أو شرطة سفلية، وابدأ بحرف.",
  },
  errors: {
    invalid_input: "راجع تفاصيل القاعدة والحقول المطلوبة.",
    authority_denied: "تغيرت صلاحية المحاسبة لديك. حدّث الصفحة أو تواصل مع المسؤول.",
    profile_not_initialized: "هيّئ ملف المحاسبة قبل حفظ قواعد الترحيل.",
    profile_not_active: "ملف المحاسبة غير نشط لهذا التغيير.",
    revision_conflict: "تغيرت هذه القاعدة بعد فتحها. أعد تحميل أحدث إصدار قبل المحاولة مرة أخرى.",
    request_payload_conflict: "يتعارض طلب الحفظ مع طلب سابق. حدّث الصفحة وأرسل التفاصيل الحالية مرة أخرى.",
    posting_rule_not_found: "لم تعد هذه القاعدة متاحة. أعد تحميل قائمة القواعد.",
    source_identity_immutable: "لا يمكن تغيير رمز القاعدة بعد إنشائها.",
    mapping_conflict: "مفتاح الربط مستخدم بالفعل في هذه القاعدة. استخدم مفتاحاً فريداً لكل ربط.",
    mapping_invalid: "مفتاح ربط أو إصدار حساب واحد أو أكثر غير صالح لهذه القاعدة.",
  },
};

export function getAccountingPostingRulesDictionary(locale: Locale): AccountingPostingRulesDictionary {
  return locale === "ar" ? arabic : english;
}
