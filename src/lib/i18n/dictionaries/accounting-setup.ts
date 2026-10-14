import type { Locale } from "../locales";

export type AccountingSetupDictionary = {
  title: string;
  subtitle: string;
  notInitializedTitle: string;
  notInitializedBody: string;
  recoveryTitle: string;
  recoveryBody: string;
  initializedTitle: string;
  accessDeniedTitle: string;
  accessDeniedBody: string;
  dependencyFailureTitle: string;
  dependencyFailureBody: string;
  bootstrapTitle: string;
  bootstrapBody: string;
  recoveryFormTitle: string;
  successionTitle: string;
  successionBody: string;
  targetUser: string;
  chooseTarget: string;
  reason: string;
  evidenceReference: string;
  bootstrapButton: string;
  recoveryButton: string;
  successionButton: string;
  saveProfile: string;
  saving: string;
  saved: string;
  actionFailure: string;
  noTargets: string;
  profileTitle: string;
  framework: string;
  edition: string;
  currency: string;
  fiscalYear: string;
  timezone: string;
  professionalValidation: string;
  vat: string;
  zatca: string;
  fatoora: string;
  activation: string;
  policyVersion: string;
  endorsementContext: string;
  accountingStartDate: string;
  cutoverBoundaryDate: string;
  legalEvidencePending: string;
  legalEvidenceReference: string;
  professionalEvidenceReference: string;
  profileVersion: string;
  setupProgressTitle: string;
  chartOfAccounts: string;
  accountingPeriods: string;
  postingRules: string;
  inceptionReconstruction: string;
  started: string;
  notStarted: string;
  lockedValuesNote: string;
  provisionalDatesLockedNote: string;
  foundationScopeNote: string;
  targetLimitNote: string;
  openChartOfAccounts: string;
  openAccountingPeriods: string;
  openPostingRules: string;
  openInception: string;
  openStatementMappings: string;
};

const english: AccountingSetupDictionary = {
  title: "Accounting setup",
  subtitle: "Governed accounting foundation and setup progress.",
  notInitializedTitle: "Accounting foundation not initialized",
  notInitializedBody: "An authorized CRM administrator can create the initial accounting profile and assign its minimal accounting authority.",
  recoveryTitle: "Accounting authority recovery required",
  recoveryBody: "No active accounting root authority holder is available. An authorized CRM administrator can restore one active root holder.",
  initializedTitle: "Accounting foundation initialized",
  accessDeniedTitle: "Access denied",
  accessDeniedBody: "Your account does not have permission to view accounting setup.",
  dependencyFailureTitle: "Accounting setup is temporarily unavailable",
  dependencyFailureBody: "The accounting setup service could not return a valid response. Try again later or contact an administrator.",
  bootstrapTitle: "Initialize the accounting foundation",
  bootstrapBody: "This creates the version-one accounting profile and grants only accounting view, profile management, and accounting root authority.",
  recoveryFormTitle: "Restore accounting root authority",
  successionTitle: "Transfer accounting root authority",
  successionBody: "The active root holder will be replaced atomically. The selected active user receives the setup access needed to continue.",
  targetUser: "Active user",
  chooseTarget: "Choose an active user",
  reason: "Reason",
  evidenceReference: "Evidence reference (optional)",
  bootstrapButton: "Initialize accounting setup",
  recoveryButton: "Restore authority",
  successionButton: "Transfer authority",
  saveProfile: "Save profile changes",
  saving: "Saving…",
  saved: "Changes saved.",
  actionFailure: "The request could not be completed. Review the details and try again.",
  noTargets: "No active users are available for this action.",
  profileTitle: "Accounting profile",
  framework: "Framework",
  edition: "Edition",
  currency: "Functional currency",
  fiscalYear: "Fiscal year",
  timezone: "Fiscal timezone",
  professionalValidation: "Professional validation",
  vat: "VAT mode",
  zatca: "ZATCA state",
  fatoora: "FATOORA state",
  activation: "Activation state",
  policyVersion: "Policy version",
  endorsementContext: "Endorsement context",
  accountingStartDate: "Accounting start date",
  cutoverBoundaryDate: "Cutover boundary date",
  legalEvidencePending: "Legal fiscal evidence is pending",
  legalEvidenceReference: "Legal fiscal evidence reference",
  professionalEvidenceReference: "Professional validation evidence reference",
  profileVersion: "Profile version",
  setupProgressTitle: "Derived setup progress",
  chartOfAccounts: "Chart of accounts",
  accountingPeriods: "Accounting periods",
  postingRules: "Posting rules",
  inceptionReconstruction: "Inception reconstruction",
  started: "Started",
  notStarted: "Not started",
  lockedValuesNote: "Framework, currency, fiscal year, timezone, professional validation state, VAT, ZATCA, FATOORA, and activation are locked here.",
  provisionalDatesLockedNote: "Accounting start and cutover dates are locked after DEV provisional activation.",
  foundationScopeNote: "This setup does not create a chart of accounts, periods, posting rules, opening balances, or tax configuration. VAT remains not registered; ZATCA/FATOORA remain inactive.",
  targetLimitNote: "The chooser lists up to 100 active users.",
  openChartOfAccounts: "Open Chart of Accounts",
  openAccountingPeriods: "Open Accounting Periods",
  openPostingRules: "Open Posting Rules",
  openInception: "Open Opening Position / Inception",
  openStatementMappings: "Open Financial Statement Mappings",
};

const arabic: AccountingSetupDictionary = {
  title: "إعداد المحاسبة",
  subtitle: "الأساس المحاسبي المنضبط وتقدم الإعداد.",
  notInitializedTitle: "لم يتم تهيئة الأساس المحاسبي",
  notInitializedBody: "يمكن لمسؤول CRM مخول إنشاء ملف المحاسبة الأولي ومنح الحد الأدنى من صلاحيات المحاسبة.",
  recoveryTitle: "استعادة صلاحية المحاسبة الجذرية مطلوبة",
  recoveryBody: "لا يوجد حامل نشط لصلاحية المحاسبة الجذرية. يمكن لمسؤول CRM مخول استعادة حامل جذري نشط واحد.",
  initializedTitle: "تمت تهيئة الأساس المحاسبي",
  accessDeniedTitle: "تم رفض الوصول",
  accessDeniedBody: "لا يملك حسابك صلاحية عرض إعداد المحاسبة.",
  dependencyFailureTitle: "إعداد المحاسبة غير متاح مؤقتاً",
  dependencyFailureBody: "تعذر على خدمة إعداد المحاسبة إرجاع استجابة صالحة. حاول لاحقاً أو تواصل مع المسؤول.",
  bootstrapTitle: "تهيئة الأساس المحاسبي",
  bootstrapBody: "ينشئ هذا ملف المحاسبة بالإصدار الأول ويمنح فقط صلاحيات عرض المحاسبة وإدارة الملف والصلاحية الجذرية للمحاسبة.",
  recoveryFormTitle: "استعادة الصلاحية الجذرية للمحاسبة",
  successionTitle: "نقل الصلاحية الجذرية للمحاسبة",
  successionBody: "سيتم استبدال حامل الصلاحية الجذرية النشط ذرياً. يحصل المستخدم النشط المحدد على صلاحيات الإعداد اللازمة للمتابعة.",
  targetUser: "مستخدم نشط",
  chooseTarget: "اختر مستخدماً نشطاً",
  reason: "السبب",
  evidenceReference: "مرجع الإثبات (اختياري)",
  bootstrapButton: "تهيئة إعداد المحاسبة",
  recoveryButton: "استعادة الصلاحية",
  successionButton: "نقل الصلاحية",
  saveProfile: "حفظ تغييرات الملف",
  saving: "جارٍ الحفظ…",
  saved: "تم حفظ التغييرات.",
  actionFailure: "تعذر إكمال الطلب. راجع التفاصيل وحاول مرة أخرى.",
  noTargets: "لا يوجد مستخدمون نشطون متاحون لهذا الإجراء.",
  profileTitle: "ملف المحاسبة",
  framework: "الإطار المحاسبي",
  edition: "الإصدار",
  currency: "العملة الوظيفية",
  fiscalYear: "السنة المالية",
  timezone: "المنطقة الزمنية للسنة المالية",
  professionalValidation: "التحقق المهني",
  vat: "حالة ضريبة القيمة المضافة",
  zatca: "حالة زاتكا",
  fatoora: "حالة فاتورة",
  activation: "حالة التفعيل",
  policyVersion: "إصدار السياسة",
  endorsementContext: "سياق الاعتماد",
  accountingStartDate: "تاريخ بدء المحاسبة",
  cutoverBoundaryDate: "تاريخ حد التحول",
  legalEvidencePending: "الإثبات المالي القانوني قيد الانتظار",
  legalEvidenceReference: "مرجع الإثبات المالي القانوني",
  professionalEvidenceReference: "مرجع إثبات التحقق المهني",
  profileVersion: "إصدار الملف",
  setupProgressTitle: "تقدم الإعداد المستمد من البيانات",
  chartOfAccounts: "دليل الحسابات",
  accountingPeriods: "الفترات المحاسبية",
  postingRules: "قواعد الترحيل",
  inceptionReconstruction: "إعادة بناء الأرصدة الافتتاحية",
  started: "بدأ",
  notStarted: "لم يبدأ",
  lockedValuesNote: "الإطار والعملة والسنة المالية والمنطقة الزمنية وحالة التحقق المهني والضريبة وزاتكا وفاتورة والتفعيل مقفلة هنا.",
  provisionalDatesLockedNote: "يتم قفل تاريخ بدء المحاسبة وتاريخ حد التحول بعد التفعيل التجريبي على DEV.",
  foundationScopeNote: "لا ينشئ هذا الإعداد دليل حسابات أو فترات أو قواعد ترحيل أو أرصدة افتتاحية أو إعدادات ضريبية. تبقى ضريبة القيمة المضافة غير مسجلة، وتبقى زاتكا/فاتورة غير مفعلة.",
  targetLimitNote: "تعرض القائمة ما يصل إلى ١٠٠ مستخدم نشط.",
  openChartOfAccounts: "فتح دليل الحسابات",
  openAccountingPeriods: "فتح الفترات المحاسبية",
  openPostingRules: "فتح قواعد الترحيل",
  openInception: "فتح المركز الافتتاحي / بداية المحاسبة",
  openStatementMappings: "فتح تعيينات القوائم المالية",
};

export function getAccountingSetupDictionary(locale: Locale): AccountingSetupDictionary {
  return locale === "ar" ? arabic : english;
}
