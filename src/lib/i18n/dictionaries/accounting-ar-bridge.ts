import type {
  AccountingArBridgeClassification,
  AccountingArBridgeSourceType,
  AccountingArBridgeReconciliationEvent,
} from "@/lib/accounting/types";

export type AccountingArBridgeDictionary = {
  title: string;
  subtitle: string;
  accessDenied: string;
  notInitialized: string;
  recoveryRequired: string;
  dependencyFailure: string;
  asOfDate: string;
  applyDate: string;
  recordedAtCutoff: string;
  summary: string;
  sourceEvents: string;
  postedEffects: string;
  heldEvents: string;
  inceptionCovered: string;
  missingEffects: string;
  duplicateConflicts: string;
  partyDifferences: string;
  timingDifferences: string;
  partyBalances: string;
  events: string;
  noEvents: string;
  customer: string;
  service: string;
  invoice: string;
  openInvoice: string;
  sourceRecord: string;
  amount: string;
  sourceDate: string;
  recordedAt: string;
  accountingDate: string;
  postedDate: string;
  postedAt: string;
  classification: string;
  heldCode: string;
  sourceHash: string;
  classificationEvidence: string;
  classificationEvidenceHash: string;
  classificationReason: string;
  classifiedBy: string;
  classifiedAt: string;
  expectedArDelta: string;
  postedArDelta: string;
  sourceBalance: string;
  ledgerBalance: string;
  difference: string;
  status: Record<AccountingArBridgeReconciliationEvent["reconciliation_status"], string>;
  sourceType: Record<AccountingArBridgeSourceType, string>;
  classificationOption: Record<AccountingArBridgeClassification, string>;
  chooseClassification: string;
  reason: string;
  evidenceRef: string;
  evidenceHash: string;
  requiresEvidence: string;
  classify: string;
  updateClassification: string;
  prepare: string;
  post: string;
  period: string;
  choosePeriod: string;
  noOpenPeriod: string;
  journalConfigurationUnavailable: string;
  postingRule: string;
  choosePostingRule: string;
  noMatchingPostingRule: string;
  prepareReason: string;
  readOnly: string;
  journal: string;
  noHistory: string;
  truncated: string;
  success: string;
  failed: string;
  actionCode: string;
  unexpectedFailure: string;
  noClassification: string;
};

const en: AccountingArBridgeDictionary = {
  title: "Accounts Receivable Bridge",
  subtitle: "Reconcile authoritative customer billing events to their accounting effects. Invoice and payment workflows remain in their existing CRM screens.",
  accessDenied: "You do not have accounting view access to this workspace.",
  notInitialized: "The accounting profile has not been initialized.",
  recoveryRequired: "Accounting authority recovery is required before this workspace can load.",
  dependencyFailure: "Accounting data could not be loaded. Refresh to retry.",
  asOfDate: "Business date",
  applyDate: "Apply",
  recordedAtCutoff: "Recorded-at cutoff",
  summary: "Bridge summary",
  sourceEvents: "Source events",
  postedEffects: "Posted effects",
  heldEvents: "Held events",
  inceptionCovered: "Covered by inception",
  missingEffects: "Missing effects",
  duplicateConflicts: "Duplicate conflicts",
  partyDifferences: "Customer balance differences",
  timingDifferences: "Timing differences",
  partyBalances: "Customer balance reconciliation",
  events: "Source event queue",
  noEvents: "No customer accounting events are in this date range.",
  customer: "Customer",
  service: "Service",
  invoice: "Invoice",
  openInvoice: "Open invoice",
  sourceRecord: "Source record",
  amount: "Source amount",
  sourceDate: "Business date",
  recordedAt: "Source recorded at",
  accountingDate: "Accounting date",
  postedDate: "Posted accounting date",
  postedAt: "Posted at",
  classification: "Accounting classification",
  heldCode: "Hold reason code",
  sourceHash: "Source snapshot SHA-256",
  classificationEvidence: "Classification evidence reference",
  classificationEvidenceHash: "Classification evidence SHA-256",
  classificationReason: "Classification reason",
  classifiedBy: "Classified by",
  classifiedAt: "Classified at",
  expectedArDelta: "Expected AR effect",
  postedArDelta: "Posted AR effect",
  sourceBalance: "Source balance",
  ledgerBalance: "Ledger balance",
  difference: "Difference",
  status: {
    POSTED: "Posted",
    PREPARED: "Prepared",
    HELD: "Held",
    INCEPTION_COVERED: "Covered by inception",
    MISSING_EFFECT: "Missing accounting effect",
    DUPLICATE_CONFLICT: "Duplicate effect conflict",
  },
  sourceType: {
    INVOICE: "Issued invoice",
    PAYMENT: "Invoice payment",
    RECEIPT: "Independent customer receipt",
    ALLOCATION: "Receipt allocation",
    RECEIPT_REVERSAL: "Receipt reversal",
    ALLOCATION_REVERSAL: "Allocation reversal",
    CREDIT_ADJUSTMENT: "Customer credit adjustment",
    CREDIT_ADJUSTMENT_REVERSAL: "Credit adjustment reversal",
    CREDIT_APPLICATION: "Credit application",
    CREDIT_APPLICATION_REVERSAL: "Credit application reversal",
    REFUND: "Customer refund",
    REFUND_REVERSAL: "Refund reversal",
  },
  classificationOption: {
    UNCONDITIONAL_CONTRACT_LIABILITY: "Unperformed consideration (contract liability)",
    UNCONDITIONAL_CONTRACT_ASSET: "Recognized performance (contract asset)",
    CUSTOMER_ADVANCE: "Customer advance / unapplied receipt",
    SETTLEMENT: "Receivable settlement",
    REVERSAL: "Reversal of the original effect",
    CUSTOMER_LIABILITY: "Retained customer liability",
    CUSTOMER_LIABILITY_REFUND: "Refund of customer liability",
    HELD_UNSUPPORTED_ENTITLEMENT: "Hold: entitlement is unsupported",
    HELD_UNSUPPORTED_CASH: "Hold: cash account evidence is missing",
    HELD_REVENUE_CORRECTION: "Hold: revenue correction review is required",
    HELD_UNSUPPORTED_TREATMENT: "Hold: accounting treatment is unsupported",
  },
  chooseClassification: "Choose a classification",
  reason: "Reason",
  evidenceRef: "Evidence reference",
  evidenceHash: "Evidence SHA-256",
  requiresEvidence: "This classification requires a paired evidence reference and SHA-256 hash.",
  classify: "Save classification",
  updateClassification: "Update classification",
  prepare: "Prepare journal",
  post: "Post journal",
  period: "Accounting period",
  choosePeriod: "Choose an open period",
  noOpenPeriod: "No current open period contains this accounting date.",
  journalConfigurationUnavailable: "Journal preparation is unavailable because access to accounting periods or posting rules is missing.",
  postingRule: "Posting rule",
  choosePostingRule: "Choose a posting rule",
  noMatchingPostingRule: "No current active posting rule contains the mappings required for this classification.",
  prepareReason: "Preparation reason",
  readOnly: "You have read access. The AR bridge manager capability is required to classify, prepare, or post.",
  journal: "Open journal",
  noHistory: "No party balances are available for this selection.",
  truncated: "The source event limit was reached. Narrow the business date to review the remaining events.",
  success: "The action completed. The workspace is refreshing.",
  failed: "The action was not completed.",
  actionCode: "Result code",
  unexpectedFailure: "The action could not be completed. Refresh the workspace and retry.",
  noClassification: "Classify and save this source event before preparing a journal.",
};

const ar: AccountingArBridgeDictionary = {
  title: "جسر الذمم المدينة",
  subtitle: "طابق أحداث فواتير العملاء وتحصيلاتهم المعتمدة مع آثارها المحاسبية. تبقى إجراءات الفواتير والمدفوعات في شاشاتها الحالية داخل النظام.",
  accessDenied: "ليست لديك صلاحية عرض المحاسبة للوصول إلى مساحة العمل هذه.",
  notInitialized: "لم تتم تهيئة الملف المحاسبي.",
  recoveryRequired: "يلزم استرداد صلاحيات المحاسبة قبل تحميل مساحة العمل.",
  dependencyFailure: "تعذر تحميل البيانات المحاسبية. حدّث الصفحة لإعادة المحاولة.",
  asOfDate: "تاريخ الأعمال",
  applyDate: "تطبيق",
  recordedAtCutoff: "حد وقت التسجيل",
  summary: "ملخص الجسر",
  sourceEvents: "أحداث المصدر",
  postedEffects: "الآثار المُرحّلة",
  heldEvents: "الأحداث المعلّقة",
  inceptionCovered: "المغطاة بالافتتاح",
  missingEffects: "الآثار المفقودة",
  duplicateConflicts: "تعارضات التكرار",
  partyDifferences: "فروق أرصدة العملاء",
  timingDifferences: "فروق التوقيت",
  partyBalances: "مطابقة أرصدة العملاء",
  events: "قائمة أحداث المصدر",
  noEvents: "لا توجد أحداث محاسبية للعملاء ضمن نطاق التاريخ المحدد.",
  customer: "العميل",
  service: "الخدمة",
  invoice: "الفاتورة",
  openInvoice: "فتح الفاتورة",
  sourceRecord: "سجل المصدر",
  amount: "مبلغ المصدر",
  sourceDate: "تاريخ الأعمال",
  recordedAt: "وقت تسجيل المصدر",
  accountingDate: "التاريخ المحاسبي",
  postedDate: "تاريخ الترحيل المحاسبي",
  postedAt: "وقت الترحيل",
  classification: "التصنيف المحاسبي",
  heldCode: "رمز سبب التعليق",
  sourceHash: "بصمة المصدر SHA-256",
  classificationEvidence: "مرجع دليل التصنيف",
  classificationEvidenceHash: "بصمة دليل التصنيف SHA-256",
  classificationReason: "سبب التصنيف",
  classifiedBy: "صنّفه",
  classifiedAt: "وقت التصنيف",
  expectedArDelta: "أثر الذمم المتوقع",
  postedArDelta: "أثر الذمم المُرحّل",
  sourceBalance: "رصيد المصدر",
  ledgerBalance: "رصيد دفتر الأستاذ",
  difference: "الفرق",
  status: {
    POSTED: "مُرحّل",
    PREPARED: "مُعدّ",
    HELD: "معلّق",
    INCEPTION_COVERED: "مغطى بأرصدة الافتتاح",
    MISSING_EFFECT: "أثر محاسبي مفقود",
    DUPLICATE_CONFLICT: "تعارض أثر مكرر",
  },
  sourceType: {
    INVOICE: "فاتورة صادرة",
    PAYMENT: "دفعة مرتبطة بفاتورة",
    RECEIPT: "إيصال مستقل من عميل",
    ALLOCATION: "تخصيص إيصال",
    RECEIPT_REVERSAL: "عكس إيصال",
    ALLOCATION_REVERSAL: "عكس تخصيص",
    CREDIT_ADJUSTMENT: "تسوية رصيد عميل دائنة",
    CREDIT_ADJUSTMENT_REVERSAL: "عكس تسوية رصيد العميل الدائن",
    CREDIT_APPLICATION: "تطبيق رصيد دائن",
    CREDIT_APPLICATION_REVERSAL: "عكس تطبيق الرصيد الدائن",
    REFUND: "رد مبلغ للعميل",
    REFUND_REVERSAL: "عكس رد المبلغ",
  },
  classificationOption: {
    UNCONDITIONAL_CONTRACT_LIABILITY: "مقابل غير منفذ (التزام عقدي)",
    UNCONDITIONAL_CONTRACT_ASSET: "أداء معترف به (أصل عقدي)",
    CUSTOMER_ADVANCE: "دفعة مقدمة من العميل / إيصال غير مخصص",
    SETTLEMENT: "تسوية ذمم مدينة",
    REVERSAL: "عكس الأثر الأصلي",
    CUSTOMER_LIABILITY: "التزام محتفظ به للعميل",
    CUSTOMER_LIABILITY_REFUND: "رد التزام مستحق للعميل",
    HELD_UNSUPPORTED_ENTITLEMENT: "تعليق: الاستحقاق غير مدعوم",
    HELD_UNSUPPORTED_CASH: "تعليق: دليل الحساب النقدي غير متوفر",
    HELD_REVENUE_CORRECTION: "تعليق: يلزم مراجعة تصحيح الإيراد",
    HELD_UNSUPPORTED_TREATMENT: "تعليق: المعالجة المحاسبية غير مدعومة",
  },
  chooseClassification: "اختر تصنيفاً",
  reason: "السبب",
  evidenceRef: "مرجع الدليل",
  evidenceHash: "بصمة الدليل SHA-256",
  requiresEvidence: "يتطلب هذا التصنيف مرجع دليل وبصمة SHA-256 متطابقين.",
  classify: "حفظ التصنيف",
  updateClassification: "تحديث التصنيف",
  prepare: "إعداد القيد",
  post: "ترحيل القيد",
  period: "الفترة المحاسبية",
  choosePeriod: "اختر فترة مفتوحة",
  noOpenPeriod: "لا توجد فترة مفتوحة حالية تشمل هذا التاريخ المحاسبي.",
  journalConfigurationUnavailable: "لا يتاح إعداد القيد لعدم توفر صلاحية عرض الفترات المحاسبية أو قواعد الترحيل.",
  postingRule: "قاعدة الترحيل",
  choosePostingRule: "اختر قاعدة ترحيل",
  noMatchingPostingRule: "لا توجد قاعدة ترحيل نشطة وحالية تتضمن الحسابات المطلوبة لهذا التصنيف.",
  prepareReason: "سبب إعداد القيد",
  readOnly: "لديك صلاحية القراءة. يلزم امتلاك صلاحية إدارة جسر الذمم لتصنيف الأحداث أو إعداد القيود أو ترحيلها.",
  journal: "فتح القيد",
  noHistory: "لا توجد أرصدة أطراف لهذا الاختيار.",
  truncated: "تم بلوغ حد أحداث المصدر. ضيّق تاريخ الأعمال لمراجعة بقية الأحداث.",
  success: "اكتمل الإجراء. جارٍ تحديث مساحة العمل.",
  failed: "لم يكتمل الإجراء.",
  actionCode: "رمز النتيجة",
  unexpectedFailure: "تعذر إكمال الإجراء. حدّث مساحة العمل ثم أعد المحاولة.",
  noClassification: "صنّف حدث المصدر واحفظه قبل إعداد القيد.",
};

export function getAccountingArBridgeDictionary(locale: "en" | "ar"): AccountingArBridgeDictionary {
  return locale === "ar" ? ar : en;
}
