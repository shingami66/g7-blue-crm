import type { Locale } from "@/lib/i18n/locales";

export type AccountingJournalDictionary = {
  title: string;
  subtitle: string;
  createTitle: string;
  editTitle: string;
  listTitle: string;
  empty: string;
  notInitialized: string;
  recoveryRequired: string;
  accessDenied: string;
  dependencyFailure: string;
  sourceProof: string;
  sourceDomain: string;
  sourceRecord: string;
  economicEvent: string;
  purpose: string;
  description: string;
  accountingDate: string;
  period: string;
  postingRule: string;
  line: string;
  mapping: string;
  account: string;
  side: string;
  debit: string;
  credit: string;
  amount: string;
  serviceNumber: string;
  findService: string;
  noServiceMatch: string;
  servicePermission: string;
  serviceRequired: string;
  serviceForbidden: string;
  descriptionEn: string;
  descriptionAr: string;
  addLine: string;
  removeLine: string;
  debitTotal: string;
  creditTotal: string;
  balanced: string;
  unbalanced: string;
  reason: string;
  evidence: string;
  prepare: string;
  saveRevision: string;
  preparing: string;
  noOpenPeriod: string;
  noActiveRule: string;
  invalidAmount: string;
  invalidBalance: string;
  invalidService: string;
  manualOnly: string;
  currentVersion: string;
  profileId: string;
  profileVersion: string;
  previousVersion: string;
  currency: string;
  correctionGroup: string;
  reversalOf: string;
  reversedBy: string;
  preparedBy: string;
  preparedAt: string;
  postedBy: string;
  postedAt: string;
  versionHistory: string;
  accountSnapshot: string;
  accountId: string;
  accountType: string;
  normalBalance: string;
  accountVersion: string;
  lineNumber: string;
  lineDescription: string;
  serviceDetails: string;
  serviceId: string;
  eventName: string;
  eventType: string;
  eventStartDate: string;
  eventEndDate: string;
  backToJournals: string;
  post: string;
  posting: string;
  reverse: string;
  reversing: string;
  reverseTitle: string;
  reversePeriod: string;
  noReversal: string;
  nextPage: string;
  statusDraft: string;
  statusPosted: string;
  created: string;
  posted: string;
  reversed: string;
  mutationFailed: string;
  sourceDomains: Record<string, string>;
};

const en: AccountingJournalDictionary = {
  title: "Journal Operations",
  subtitle: "Prepare governed manual journals and inspect the source proof for every posted entry.",
  createTitle: "Prepare a manual journal",
  editTitle: "Revise manual draft",
  listTitle: "Recent journals",
  empty: "No journals are available yet.",
  notInitialized: "Accounting setup has not been initialized. This screen does not create an accounting profile or sample records.",
  recoveryRequired: "Accounting setup requires recovery before journal operations can be used.",
  accessDenied: "Your accounting view permission is required to open journal operations.",
  dependencyFailure: "Journal information could not be loaded. Try again later.",
  sourceProof: "Source and posting proof",
  sourceDomain: "Source domain",
  sourceRecord: "Source record key",
  economicEvent: "Economic event key",
  purpose: "Posting purpose",
  description: "Journal description",
  accountingDate: "Accounting date",
  period: "Open period",
  postingRule: "Current posting rule",
  line: "Journal lines",
  mapping: "Rule mapping",
  account: "Resolved account",
  side: "Side",
  debit: "Debit",
  credit: "Credit",
  amount: "Amount (SAR)",
  serviceNumber: "Service number (optional)",
  findService: "Find exact Service",
  noServiceMatch: "No Service matched that number.",
  servicePermission: "Service lookup requires Services read permission.",
  serviceRequired: "This mapping requires a Service.",
  serviceForbidden: "This mapping does not allow a Service.",
  descriptionEn: "Line description (English)",
  descriptionAr: "Line description (Arabic)",
  addLine: "Add line",
  removeLine: "Remove",
  debitTotal: "Debits",
  creditTotal: "Credits",
  balanced: "Balanced",
  unbalanced: "Totals must match exactly.",
  reason: "Preparation reason",
  evidence: "Evidence reference (optional)",
  prepare: "Prepare draft",
  saveRevision: "Save draft revision",
  preparing: "Saving…",
  noOpenPeriod: "An active open accounting period is required.",
  noActiveRule: "An active current posting rule is required.",
  invalidAmount: "Enter a positive SAR amount with no more than two decimals.",
  invalidBalance: "Add at least two lines and balance debit and credit totals.",
  invalidService: "Resolve the Service number or remove the Service from this line.",
  manualOnly: "This source journal is proof-only. Its source workflow owns posting and corrections.",
  currentVersion: "Current version",
  profileId: "Accounting profile ID",
  profileVersion: "Profile version",
  previousVersion: "Previous version",
  currency: "Currency",
  correctionGroup: "Correction group",
  reversalOf: "Reversal of",
  reversedBy: "Reversed by",
  preparedBy: "Prepared by",
  preparedAt: "Prepared at",
  postedBy: "Posted by",
  postedAt: "Posted at",
  versionHistory: "Version history",
  accountSnapshot: "Account snapshot",
  accountId: "Account ID",
  accountType: "Account type",
  normalBalance: "Normal balance",
  accountVersion: "Account version",
  lineNumber: "Line",
  lineDescription: "Line description",
  serviceDetails: "Service snapshot",
  serviceId: "Service ID",
  eventName: "Event name",
  eventType: "Event type",
  eventStartDate: "Event start date",
  eventEndDate: "Event end date",
  backToJournals: "Back to journals",
  post: "Post journal",
  posting: "Posting…",
  reverse: "Create reversal",
  reversing: "Creating reversal…",
  reverseTitle: "Reverse posted manual journal",
  reversePeriod: "Reversal period",
  noReversal: "No reversal is recorded.",
  nextPage: "Next page",
  statusDraft: "Draft",
  statusPosted: "Posted",
  created: "Draft prepared.",
  posted: "Journal posted.",
  reversed: "Reversal journal created.",
  mutationFailed: "The journal request could not be completed. Refresh and review the current version.",
  sourceDomains: {
    CONTROLLED_MANUAL: "Controlled manual",
    INCEPTION: "Opening position",
    AR_BRIDGE: "Receivables source",
    AP_BRIDGE: "Payables source",
    EXPENSE_BRIDGE: "Expense source",
    REVENUE_RECOGNITION: "Revenue recognition source",
  },
};

const ar: AccountingJournalDictionary = {
  title: "عمليات القيود",
  subtitle: "أنشئ مسودات يدوية محكومة وراجع إثبات المصدر لكل قيد مرحّل.",
  createTitle: "إعداد قيد يدوي",
  editTitle: "مراجعة مسودة يدوية",
  listTitle: "أحدث القيود",
  empty: "لا توجد قيود متاحة حتى الآن.",
  notInitialized: "لم يكتمل إعداد المحاسبة. لا تنشئ هذه الصفحة ملفًا محاسبيًا أو سجلات تجريبية.",
  recoveryRequired: "يتطلب إعداد المحاسبة الاسترداد قبل استخدام عمليات القيود.",
  accessDenied: "يلزم توفر صلاحية عرض المحاسبة لفتح عمليات القيود.",
  dependencyFailure: "تعذر تحميل بيانات القيود. حاول مرة أخرى لاحقًا.",
  sourceProof: "إثبات المصدر والترحيل",
  sourceDomain: "نطاق المصدر",
  sourceRecord: "مفتاح سجل المصدر",
  economicEvent: "مفتاح الحدث الاقتصادي",
  purpose: "غرض الترحيل",
  description: "وصف القيد",
  accountingDate: "تاريخ المحاسبة",
  period: "فترة مفتوحة",
  postingRule: "قاعدة ترحيل حالية",
  line: "سطور القيد",
  mapping: "ربط القاعدة",
  account: "الحساب المحدد",
  side: "الطرف",
  debit: "مدين",
  credit: "دائن",
  amount: "المبلغ (ريال)",
  serviceNumber: "رقم الفعالية (اختياري)",
  findService: "العثور على الفعالية",
  noServiceMatch: "لم يتم العثور على فعالية مطابقة لهذا الرقم.",
  servicePermission: "يتطلب البحث عن الفعالية صلاحية قراءة الخدمات.",
  serviceRequired: "يتطلب هذا الربط اختيار فعالية.",
  serviceForbidden: "لا يسمح هذا الربط بإضافة فعالية.",
  descriptionEn: "وصف السطر (بالإنجليزية)",
  descriptionAr: "وصف السطر (بالعربية)",
  addLine: "إضافة سطر",
  removeLine: "إزالة",
  debitTotal: "إجمالي المدين",
  creditTotal: "إجمالي الدائن",
  balanced: "متوازن",
  unbalanced: "يجب أن يتساوى الإجماليان تمامًا.",
  reason: "سبب الإعداد",
  evidence: "مرجع الإثبات (اختياري)",
  prepare: "إعداد المسودة",
  saveRevision: "حفظ مراجعة المسودة",
  preparing: "جارٍ الحفظ…",
  noOpenPeriod: "يلزم وجود فترة محاسبية مفتوحة ونشطة.",
  noActiveRule: "يلزم وجود قاعدة ترحيل حالية ونشطة.",
  invalidAmount: "أدخل مبلغًا موجبًا بالريال وبحد أقصى منزلتين عشريتين.",
  invalidBalance: "أضف سطرين على الأقل واجعل إجمالي المدين والدائن متساويًا.",
  invalidService: "تحقق من رقم الفعالية أو أزل الفعالية من هذا السطر.",
  manualOnly: "هذا القيد للعرض والإثبات فقط. تتم إدارة ترحيله وتصحيحاته من خلال مصدره.",
  currentVersion: "الإصدار الحالي",
  profileId: "معرّف الملف المحاسبي",
  profileVersion: "إصدار الملف",
  previousVersion: "الإصدار السابق",
  currency: "العملة",
  correctionGroup: "مجموعة التصحيح",
  reversalOf: "عكس القيد",
  reversedBy: "تم عكسه بواسطة",
  preparedBy: "أعده",
  preparedAt: "وقت الإعداد",
  postedBy: "رحّله",
  postedAt: "وقت الترحيل",
  versionHistory: "سجل الإصدارات",
  accountSnapshot: "لقطة الحساب",
  accountId: "معرّف الحساب",
  accountType: "نوع الحساب",
  normalBalance: "الرصيد الطبيعي",
  accountVersion: "إصدار الحساب",
  lineNumber: "السطر",
  lineDescription: "وصف السطر",
  serviceDetails: "لقطة الفعالية",
  serviceId: "معرّف الفعالية",
  eventName: "اسم الفعالية",
  eventType: "نوع الفعالية",
  eventStartDate: "تاريخ بدء الفعالية",
  eventEndDate: "تاريخ انتهاء الفعالية",
  backToJournals: "العودة إلى القيود",
  post: "ترحيل القيد",
  posting: "جارٍ الترحيل…",
  reverse: "إنشاء قيد عكسي",
  reversing: "جارٍ إنشاء القيد العكسي…",
  reverseTitle: "عكس قيد يدوي مرحّل",
  reversePeriod: "فترة العكس",
  noReversal: "لا يوجد قيد عكسي مسجل.",
  nextPage: "الصفحة التالية",
  statusDraft: "مسودة",
  statusPosted: "مرحّل",
  created: "تم إعداد المسودة.",
  posted: "تم ترحيل القيد.",
  reversed: "تم إنشاء القيد العكسي.",
  mutationFailed: "تعذر إكمال طلب القيد. حدّث الصفحة وراجع الإصدار الحالي.",
  sourceDomains: {
    CONTROLLED_MANUAL: "يدوي محكوم",
    INCEPTION: "الرصيد الافتتاحي",
    AR_BRIDGE: "مصدر الذمم المدينة",
    AP_BRIDGE: "مصدر الذمم الدائنة",
    EXPENSE_BRIDGE: "مصدر المصروفات",
    REVENUE_RECOGNITION: "مصدر الاعتراف بالإيراد",
  },
};

export function getAccountingJournalsDictionary(locale: Locale): AccountingJournalDictionary {
  return locale === "ar" ? ar : en;
}
