import type { Locale } from "@/lib/i18n/locales";

export type AccountingOperationsDictionary = {
  common: {
    refresh: string;
    asOfDate: string;
    recordedAtCutoff: string;
    accessDenied: string;
    notInitialized: string;
    recoveryRequired: string;
    dependencyFailure: string;
    empty: string;
    loading: string;
    reason: string;
    evidenceRef: string;
    preparedBy: string;
    preparedAt: string;
    recordedBy: string;
    recordedAt: string;
    reviewedBy: string;
    reviewedAt: string;
    noHistory: string;
    truncated: string;
    stale: string;
    summaryIncomplete: string;
    success: string;
    failed: string;
    actionCode: string;
  };
  bank: {
    title: string;
    subtitle: string;
    binding: string;
    chooseBinding: string;
    noBindings: string;
    readOnlyBinding: string;
    maskedIdentity: string;
    account: string;
    status: string;
    currentVersion: string;
    effective: string;
    summary: string;
    statementOpening: string;
    statementClosing: string;
    statementInflows: string;
    statementOutflows: string;
    ledgerOpening: string;
    ledgerClosing: string;
    ledgerInflows: string;
    ledgerOutflows: string;
    matched: string;
    unmatchedStatement: string;
    unmatchedLedger: string;
    duplicateCandidates: string;
    impactReviewRequired: string;
    timingDifference: string;
    unexplainedDifference: string;
    adjustmentItems: string;
    statementLines: string;
    ledgerLines: string;
    statementBatches: string;
    saveStatementBatch: string;
    saveStatementLine: string;
    sourceDocument: string;
    evidenceHash: string;
    evidenceIdentity: string;
    coverageStart: string;
    coverageEnd: string;
    openingBalance: string;
    closingBalance: string;
    statementBatch: string;
    stableLineIdentity: string;
    sourceRowIdentity: string;
    duplicateFingerprint: string;
    transactionDate: string;
    valueDate: string;
    reference: string;
    description: string;
    save: string;
    reconciliationHistory: string;
    allocations: string;
    reviewHistory: string;
    latestDecision: string;
    group: string;
    version: string;
    current: string;
    pendingReview: string;
    noAllocations: string;
    noLines: string;
    duplicate: string;
    statementLine: string;
    ledgerLine: string;
    amountSar: string;
    allocationReason: string;
    addAllocation: string;
    removeAllocation: string;
    rationale: string;
    prepare: string;
    prepareDisabled: string;
    reviewReason: string;
    approve: string;
    reject: string;
    unmatch: string;
    unmatchReason: string;
    preparationResult: string;
    reviewResult: string;
    noEligibleLines: string;
    oppositeSigns: string;
    amountInvalid: string;
    amountTooLarge: string;
    dateCoverageError: string;
    allReports: string;
  };
  period: {
    title: string;
    subtitle: string;
    period: string;
    choosePeriod: string;
    noPeriods: string;
    periodStatus: string;
    periodVersion: string;
    packageHistory: string;
    packageKind: string;
    packageVersion: string;
    startingVersion: string;
    close: string;
    lock: string;
    reopen: string;
    prepare: string;
    evidenceSnapshot: string;
    exceptionCodes: string;
    review: string;
    approve: string;
    reject: string;
    prepareReason: string;
    prepareEvidence: string;
    reviewReason: string;
    resultPeriodVersion: string;
    staleExplanation: string;
    reports: string;
    generalLedger: string;
    trialBalance: string;
    profitAndLoss: string;
    balanceSheet: string;
  };
};

const en: AccountingOperationsDictionary = {
  common: {
    refresh: "Refresh",
    asOfDate: "As of date",
    recordedAtCutoff: "Recorded-at cutoff",
    accessDenied: "You do not have access to this accounting workspace.",
    notInitialized: "The accounting profile has not been initialized.",
    recoveryRequired: "Accounting authority recovery is required before this workspace can load.",
    dependencyFailure: "Accounting data could not be loaded. Refresh to retry.",
    empty: "No records are available for this selection.",
    loading: "Loading accounting evidence…",
    reason: "Reason",
    evidenceRef: "Evidence reference",
    preparedBy: "Prepared by",
    preparedAt: "Prepared at",
    recordedBy: "Recorded by",
    recordedAt: "Recorded at",
    reviewedBy: "Reviewed by",
    reviewedAt: "Reviewed at",
    noHistory: "No history is available for this selection.",
    truncated: "The read limit was reached. Narrow the date or selection to inspect more evidence.",
    stale: "This version is stale. Refresh the evidence before taking another action.",
    summaryIncomplete: "This date has unmatched statement or ledger activity and is not fully reconciled.",
    success: "The action completed.",
    failed: "The action was not completed.",
    actionCode: "Result code",
  },
  bank: {
    title: "Bank Reconciliation",
    subtitle: "Review eligible bank evidence, existing matches, and governed reconciliation history.",
    binding: "Bank binding",
    chooseBinding: "Select a bank binding",
    noBindings: "No approved bank binding is effective for this date and cutoff.",
    readOnlyBinding: "This binding is historical or no longer current; evidence is read-only.",
    maskedIdentity: "Masked bank identity",
    account: "Cash account",
    status: "Binding status",
    currentVersion: "Current version",
    effective: "Effective dates",
    summary: "Reconciliation summary",
    statementOpening: "Statement opening balance",
    statementClosing: "Statement closing balance",
    statementInflows: "Statement inflows",
    statementOutflows: "Statement outflows",
    ledgerOpening: "Ledger opening balance",
    ledgerClosing: "Ledger closing balance",
    ledgerInflows: "Ledger inflows",
    ledgerOutflows: "Ledger outflows",
    matched: "Matched amount",
    unmatchedStatement: "Unmatched statement amount",
    unmatchedLedger: "Unmatched ledger amount",
    duplicateCandidates: "Duplicate statement candidates",
    impactReviewRequired: "Impact review required",
    timingDifference: "Timing difference",
    unexplainedDifference: "Unexplained difference",
    adjustmentItems: "Statement items needing adjustment",
    statementLines: "Statement lines",
    ledgerLines: "Ledger cash lines",
    statementBatches: "Statement evidence batches",
    saveStatementBatch: "Record statement evidence batch",
    saveStatementLine: "Record statement line",
    sourceDocument: "Source document reference",
    evidenceHash: "Evidence SHA-256",
    evidenceIdentity: "Evidence identity",
    coverageStart: "Coverage start",
    coverageEnd: "Coverage end",
    openingBalance: "Opening balance (SAR)",
    closingBalance: "Closing balance (SAR)",
    statementBatch: "Statement batch",
    stableLineIdentity: "Stable line identity",
    sourceRowIdentity: "Source row identity",
    duplicateFingerprint: "Duplicate fingerprint",
    transactionDate: "Transaction date",
    valueDate: "Value date",
    reference: "Reference",
    description: "Description",
    save: "Save evidence",
    reconciliationHistory: "Reconciliation history",
    allocations: "Allocations",
    reviewHistory: "Review history",
    latestDecision: "Latest review decision",
    group: "Group",
    version: "Version",
    current: "Current version",
    pendingReview: "Awaiting independent review",
    noAllocations: "No allocations in this version.",
    noLines: "No lines are available at this cutoff.",
    duplicate: "Duplicate candidate",
    statementLine: "Statement line",
    ledgerLine: "Ledger line",
    amountSar: "Allocation amount (SAR)",
    allocationReason: "Allocation rationale",
    addAllocation: "Add allocation",
    removeAllocation: "Remove allocation",
    rationale: "Preparation rationale",
    prepare: "Prepare reconciliation",
    prepareDisabled: "Resolve the pending review before preparing another reconciliation.",
    reviewReason: "Review reason",
    approve: "Approve",
    reject: "Reject",
    unmatch: "Unmatch approved reconciliation",
    unmatchReason: "Reason for unmatching",
    preparationResult: "Preparation result",
    reviewResult: "Review result",
    noEligibleLines: "Choose a statement line and a ledger line to create an allocation.",
    oppositeSigns: "The statement and ledger line signs do not match.",
    amountInvalid: "Enter a positive amount with no more than two decimal places.",
    amountTooLarge: "This amount exceeds the safe limit for the existing reconciliation action.",
    dateCoverageError: "The transaction date must fall inside the recorded statement coverage.",
    allReports: "Accounting reports",
  },
  period: {
    title: "Period Close / Lock / Reopen",
    subtitle: "Prepare and independently review W10I period evidence packages using the recorded-at cutoff.",
    period: "Accounting period",
    choosePeriod: "Select an accounting period",
    noPeriods: "No accounting periods are available.",
    periodStatus: "Current period status",
    periodVersion: "Current period version",
    packageHistory: "Package and review history",
    packageKind: "Package action",
    packageVersion: "Package version",
    startingVersion: "Starting period version",
    close: "Close period",
    lock: "Lock closed period",
    reopen: "Reopen period",
    prepare: "Prepare package",
    evidenceSnapshot: "Evidence snapshot",
    exceptionCodes: "Exceptions",
    review: "Review decision",
    approve: "Approve",
    reject: "Reject",
    prepareReason: "Preparation reason",
    prepareEvidence: "Evidence reference",
    reviewReason: "Review reason",
    resultPeriodVersion: "Resulting period version",
    staleExplanation: "The package no longer matches the current period version or evidence. Prepare a fresh package before review.",
    reports: "Related reports",
    generalLedger: "General Ledger",
    trialBalance: "Trial Balance",
    profitAndLoss: "Profit & Loss",
    balanceSheet: "Balance Sheet",
  },
};

const ar: AccountingOperationsDictionary = {
  common: {
    refresh: "تحديث",
    asOfDate: "كما في تاريخ",
    recordedAtCutoff: "حد وقت التسجيل",
    accessDenied: "ليس لديك صلاحية للوصول إلى مساحة العمل المحاسبية هذه.",
    notInitialized: "لم تتم تهيئة الملف المحاسبي.",
    recoveryRequired: "يلزم استرداد صلاحيات المحاسبة قبل تحميل مساحة العمل.",
    dependencyFailure: "تعذر تحميل البيانات المحاسبية. حدّث الصفحة لإعادة المحاولة.",
    empty: "لا توجد سجلات لهذا الاختيار.",
    loading: "جارٍ تحميل الأدلة المحاسبية…",
    reason: "السبب",
    evidenceRef: "مرجع الدليل",
    preparedBy: "أعدّه",
    preparedAt: "وقت الإعداد",
    recordedBy: "سجّله",
    recordedAt: "وقت التسجيل",
    reviewedBy: "راجعه",
    reviewedAt: "وقت المراجعة",
    noHistory: "لا يوجد سجل لهذا الاختيار.",
    truncated: "تم بلوغ حد القراءة. ضيّق التاريخ أو الاختيار لعرض أدلة إضافية.",
    stale: "هذا الإصدار قديم. حدّث الأدلة قبل اتخاذ إجراء آخر.",
    summaryIncomplete: "توجد حركة غير مطابقة في كشف الحساب أو دفتر الأستاذ لهذا التاريخ.",
    success: "اكتمل الإجراء.",
    failed: "لم يكتمل الإجراء.",
    actionCode: "رمز النتيجة",
  },
  bank: {
    title: "تسوية البنك",
    subtitle: "راجع روابط البنك المؤهلة والأدلة والمطابقات الحالية وسجل التسويات المنضبط.",
    binding: "ربط البنك",
    chooseBinding: "اختر ربطاً بنكياً",
    noBindings: "لا يوجد ربط بنكي معتمد ونافذ لهذا التاريخ والحد الزمني.",
    readOnlyBinding: "هذا الربط تاريخي أو لم يعد حالياً؛ الأدلة للقراءة فقط.",
    maskedIdentity: "هوية البنك المقنّعة",
    account: "الحساب النقدي",
    status: "حالة الربط",
    currentVersion: "الإصدار الحالي",
    effective: "تواريخ السريان",
    summary: "ملخص التسوية",
    statementOpening: "رصيد افتتاح كشف الحساب",
    statementClosing: "رصيد إقفال كشف الحساب",
    statementInflows: "إيداعات كشف الحساب",
    statementOutflows: "مدفوعات كشف الحساب",
    ledgerOpening: "رصيد افتتاح دفتر الأستاذ",
    ledgerClosing: "رصيد إقفال دفتر الأستاذ",
    ledgerInflows: "إيداعات دفتر الأستاذ",
    ledgerOutflows: "مدفوعات دفتر الأستاذ",
    matched: "المبلغ المطابق",
    unmatchedStatement: "المبلغ غير المطابق في كشف الحساب",
    unmatchedLedger: "المبلغ غير المطابق في دفتر الأستاذ",
    duplicateCandidates: "أسطر كشف مكررة محتملة",
    impactReviewRequired: "تتطلب مراجعة الأثر",
    timingDifference: "فرق التوقيت",
    unexplainedDifference: "الفرق غير المفسر",
    adjustmentItems: "أسطر كشف تحتاج إلى تعديل",
    statementLines: "أسطر كشف الحساب",
    ledgerLines: "الأسطر النقدية في دفتر الأستاذ",
    statementBatches: "دفعات أدلة كشف الحساب",
    saveStatementBatch: "تسجيل دفعة دليل كشف الحساب",
    saveStatementLine: "تسجيل سطر كشف الحساب",
    sourceDocument: "مرجع المستند المصدر",
    evidenceHash: "بصمة الدليل SHA-256",
    evidenceIdentity: "هوية الدليل",
    coverageStart: "بداية التغطية",
    coverageEnd: "نهاية التغطية",
    openingBalance: "الرصيد الافتتاحي (ريال)",
    closingBalance: "الرصيد الختامي (ريال)",
    statementBatch: "دفعة كشف الحساب",
    stableLineIdentity: "هوية السطر الثابتة",
    sourceRowIdentity: "هوية صف المصدر",
    duplicateFingerprint: "بصمة التكرار",
    transactionDate: "تاريخ المعاملة",
    valueDate: "تاريخ القيمة",
    reference: "المرجع",
    description: "الوصف",
    save: "حفظ الدليل",
    reconciliationHistory: "سجل التسويات",
    allocations: "التخصيصات",
    reviewHistory: "سجل المراجعة",
    latestDecision: "أحدث قرار مراجعة",
    group: "المجموعة",
    version: "الإصدار",
    current: "الإصدار الحالي",
    pendingReview: "بانتظار مراجعة مستقلة",
    noAllocations: "لا توجد تخصيصات في هذا الإصدار.",
    noLines: "لا توجد أسطر عند هذا الحد الزمني.",
    duplicate: "مرشح تكرار",
    statementLine: "سطر كشف الحساب",
    ledgerLine: "سطر دفتر الأستاذ",
    amountSar: "مبلغ التخصيص (ريال)",
    allocationReason: "مبرر التخصيص",
    addAllocation: "إضافة تخصيص",
    removeAllocation: "إزالة التخصيص",
    rationale: "مبرر إعداد التسوية",
    prepare: "إعداد التسوية",
    prepareDisabled: "عالج المراجعة المعلقة قبل إعداد تسوية أخرى.",
    reviewReason: "سبب المراجعة",
    approve: "اعتماد",
    reject: "رفض",
    unmatch: "إلغاء مطابقة التسوية المعتمدة",
    unmatchReason: "سبب إلغاء المطابقة",
    preparationResult: "نتيجة الإعداد",
    reviewResult: "نتيجة المراجعة",
    noEligibleLines: "اختر سطر كشف وسطر دفتر أستاذ لإنشاء تخصيص.",
    oppositeSigns: "إشارة سطر كشف الحساب لا تطابق إشارة سطر دفتر الأستاذ.",
    amountInvalid: "أدخل مبلغاً موجباً لا يتجاوز منزلتين عشريتين.",
    amountTooLarge: "يتجاوز هذا المبلغ الحد الآمن لإجراء التسوية الحالي.",
    dateCoverageError: "يجب أن يقع تاريخ المعاملة ضمن تغطية كشف الحساب المسجلة.",
    allReports: "التقارير المحاسبية",
  },
  period: {
    title: "إقفال / قفل / إعادة فتح الفترة",
    subtitle: "أعدّ وراجع أدلة الفترات حسب حزم W10I وحد التسجيل الزمني.",
    period: "الفترة المحاسبية",
    choosePeriod: "اختر فترة محاسبية",
    noPeriods: "لا توجد فترات محاسبية متاحة.",
    periodStatus: "حالة الفترة الحالية",
    periodVersion: "إصدار الفترة الحالي",
    packageHistory: "سجل الحزم والمراجعات",
    packageKind: "إجراء الحزمة",
    packageVersion: "إصدار الحزمة",
    startingVersion: "إصدار الفترة عند الإعداد",
    close: "إقفال الفترة",
    lock: "قفل الفترة المغلقة",
    reopen: "إعادة فتح الفترة",
    prepare: "إعداد الحزمة",
    evidenceSnapshot: "لقطة الأدلة",
    exceptionCodes: "الاستثناءات",
    review: "قرار المراجعة",
    approve: "اعتماد",
    reject: "رفض",
    prepareReason: "مبرر الإعداد",
    prepareEvidence: "مرجع الدليل",
    reviewReason: "سبب المراجعة",
    resultPeriodVersion: "إصدار الفترة الناتج",
    staleExplanation: "لم تعد الحزمة مطابقة لإصدار الفترة الحالي أو الأدلة. أعد إعداد حزمة قبل المراجعة.",
    reports: "التقارير المرتبطة",
    generalLedger: "دفتر الأستاذ العام",
    trialBalance: "ميزان المراجعة",
    profitAndLoss: "الأرباح والخسائر",
    balanceSheet: "الميزانية العمومية",
  },
};

export function getAccountingOperationsDictionary(locale: Locale): AccountingOperationsDictionary {
  return locale === "ar" ? ar : en;
}
