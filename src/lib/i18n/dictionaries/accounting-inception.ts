import type {
  AccountingActionErrorCode,
  AccountingInceptionClassification,
  AccountingInceptionEvidenceType,
  AccountingInceptionParty,
} from "@/lib/accounting/types";
import type { Locale } from "@/lib/i18n/locales";

export type AccountingInceptionDictionary = {
  title: string;
  subtitle: string;
  backToSetup: string;
  createPackage: string;
  revisePackage: string;
  savePackage: string;
  saving: string;
  cancel: string;
  notInitializedTitle: string;
  notInitializedBody: string;
  recoveryRequiredTitle: string;
  recoveryRequiredBody: string;
  emptyTitle: string;
  emptyBody: string;
  accessDeniedTitle: string;
  accessDeniedBody: string;
  dependencyFailureTitle: string;
  dependencyFailureBody: string;
  packageList: string;
  package: string;
  currentVersion: string;
  previousVersions: string;
  version: string;
  createdBy: string;
  createdAt: string;
  accepted: string;
  pending: string;
  startDate: string;
  cutoverDate: string;
  payload: string;
  payloadHelp: string;
  payloadShape: string;
  evidenceInventory: string;
  items: string;
  reconciliationReferences: string;
  invalidPayload: string;
  currentCoverage: string;
  coverageHistory: string;
  reviewHistory: string;
  noReview: string;
  decision: string;
  reviewReason: string;
  approve: string;
  reject: string;
  reviewAction: string;
  prepareJournal: string;
  postJournal: string;
  acceptPackage: string;
  operationReason: string;
  separationCreator: string;
  separationReviewer: string;
  reviewRequired: string;
  prepareRequired: string;
  postRequired: string;
  acceptRequired: string;
  item: string;
  classification: string;
  resolution: string;
  material: string;
  source: string;
  evidence: string;
  party: string;
  reconciliation: string;
  journal: string;
  journalId: string;
  journalStatus: string;
  preparedJournalVersion: string;
  journalVersion: string;
  journalVersionChanged: string;
  draft: string;
  posted: string;
  unresolved: string;
  missingEvidence: string;
  requiredJournalPending: string;
  approvalRecorded: string;
  rejectionRecorded: string;
  actionCompleted: string;
  trialBalance: string;
  debitTotal: string;
  creditTotal: string;
  accountCount: string;
  account: string;
  accountType: string;
  accountTypes: Record<"ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE", string>;
  yes: string;
  no: string;
  resolutions: Record<"RESOLVED" | "UNRESOLVED", string>;
  packageNotFoundTitle: string;
  packageNotFoundBody: string;
  backToPackages: string;
  states: {
    classifications: Record<AccountingInceptionClassification, string>;
    evidenceTypes: Record<AccountingInceptionEvidenceType, string>;
    parties: Record<AccountingInceptionParty, string>;
    reconciliationCategories: Record<"ACCOUNTS_RECEIVABLE" | "ACCOUNTS_PAYABLE" | "EMPLOYEE_ACCOUNTABILITY" | "FOUNDER_SOURCE" | "BANK_CASH" | "ASSET" | "LIABILITY" | "EXPENSE" | "OTHER", string>;
  };
  errors: Partial<Record<AccountingActionErrorCode, string>>;
};

const en: AccountingInceptionDictionary = {
  title: "Opening Position / Inception",
  subtitle: "Build and review the versioned opening position under the existing inception lifecycle.",
  backToSetup: "Accounting setup",
  createPackage: "Create inception package",
  revisePackage: "Revise package",
  savePackage: "Save package version",
  saving: "Saving…",
  cancel: "Cancel",
  notInitializedTitle: "Accounting profile is not initialized",
  notInitializedBody: "Initialize the accounting foundation before creating an inception package. This page does not initialize accounting.",
  recoveryRequiredTitle: "Accounting authority recovery is required",
  recoveryRequiredBody: "Complete authority recovery in Accounting Setup before continuing.",
  emptyTitle: "No inception packages have been created",
  emptyBody: "Create a package only when the opening position evidence and coverage are ready. Saving a package does not create or post a journal.",
  accessDeniedTitle: "Access denied",
  accessDeniedBody: "Your account does not have permission to view inception packages.",
  dependencyFailureTitle: "Inception packages are temporarily unavailable",
  dependencyFailureBody: "The accounting service could not return a valid inception response. Try again later or contact an administrator.",
  packageList: "Inception packages",
  package: "Package",
  currentVersion: "Current version",
  previousVersions: "Package version history",
  version: "Version",
  createdBy: "Created by",
  createdAt: "Created at",
  accepted: "Accepted",
  pending: "Not accepted",
  startDate: "Accounting start date",
  cutoverDate: "Cutover boundary date",
  payload: "Coverage and evidence payload (JSON)",
  payloadHelp: "Enter the exact W10C payload fields: accounting_start_date, cutover_boundary_date, evidence_inventory, items, and reconciliation_references. Each item carries its classification, resolution, reconciliation and party references, evidence_refs, and a journal plan only for RECONSTRUCTED_HISTORY or OPENING_BALANCE.",
  payloadShape: "Evidence: evidence_id, version, evidence_type, evidence_ref, sha256. Item: item_id, source_domain, source_record_key, economic_event_key, classification, resolution_state, is_material, reconciliation_category, reconciliation_reference, party_type, party_reference, evidence_refs [{evidence_id,version}], journal. Journal: accounting_date, period_id, period_version, description_en, description_ar, lines [{account_id,account_version,side,amount_halalah,description_en,description_ar}]. Reconciliation reference: category, reference. Do not include journal for POST_CUTOVER_SOURCE or UNRESOLVED.",
  evidenceInventory: "Evidence inventory",
  items: "Coverage items",
  reconciliationReferences: "Reconciliation references",
  invalidPayload: "The payload is invalid or incomplete. Check every field against the required W10C contract.",
  currentCoverage: "Current coverage",
  coverageHistory: "Coverage version history",
  reviewHistory: "Review history",
  noReview: "No review has been recorded for this package version.",
  decision: "Decision",
  reviewReason: "Review reason",
  approve: "Approve",
  reject: "Reject",
  reviewAction: "Record review",
  prepareJournal: "Prepare inception journal",
  postJournal: "Post journal",
  acceptPackage: "Accept inception package",
  operationReason: "Reason",
  separationCreator: "The package creator cannot review this version.",
  separationReviewer: "Review and preparation require different users; the package creator must prepare the journal.",
  reviewRequired: "A separate reviewer must approve the current package version first.",
  prepareRequired: "The package creator needs inception management and journal preparation authority to prepare this item.",
  postRequired: "The approving reviewer needs inception management and journal posting authority to post this journal.",
  acceptRequired: "Acceptance requires the approving reviewer, inception management, and accounting view authority after all required journals are posted.",
  item: "Item",
  classification: "Classification",
  resolution: "Resolution",
  material: "Material",
  source: "Source identity",
  evidence: "Evidence references",
  party: "Party reference",
  reconciliation: "Reconciliation reference",
  journal: "Journal plan",
  journalId: "Journal ID",
  journalStatus: "Current journal status",
  preparedJournalVersion: "Version captured at preparation",
  journalVersion: "Current journal version",
  journalVersionChanged: "This draft changed after preparation, so posting is blocked. Resolve the version mismatch through the authorized accounting recovery process.",
  draft: "Draft",
  posted: "Posted",
  unresolved: "Unresolved coverage or evidence prevents approval and acceptance.",
  missingEvidence: "A material item is missing a reference to a listed evidence version.",
  requiredJournalPending: "Every reconstructed-history or opening-balance item needs a posted inception journal before package acceptance.",
  approvalRecorded: "Approved",
  rejectionRecorded: "Rejected",
  actionCompleted: "The action completed. The latest persisted state has been reloaded.",
  trialBalance: "Accepted trial balance",
  debitTotal: "Debit balance total (halalah)",
  creditTotal: "Credit balance total (halalah)",
  accountCount: "Accounts",
  account: "Account",
  accountType: "Account type",
  accountTypes: { ASSET: "Asset", LIABILITY: "Liability", EQUITY: "Equity", REVENUE: "Revenue", EXPENSE: "Expense" },
  yes: "Yes",
  no: "No",
  resolutions: { RESOLVED: "Resolved", UNRESOLVED: "Unresolved" },
  packageNotFoundTitle: "Inception package not found",
  packageNotFoundBody: "This package is unavailable or the package identifier is invalid.",
  backToPackages: "Back to inception packages",
  states: {
    classifications: { RECONSTRUCTED_HISTORY: "Reconstructed history", OPENING_BALANCE: "Opening balance", POST_CUTOVER_SOURCE: "Post-cutover source", UNRESOLVED: "Unresolved" },
    evidenceTypes: { BANK_STATEMENT: "Bank statement", BANK_CONFIRMATION: "Bank confirmation", RECEIVABLE_DETAIL: "Receivable detail", PAYABLE_DETAIL: "Payable detail", EMPLOYEE_ACCOUNTABILITY: "Employee accountability", FOUNDER_AGREEMENT: "Founder agreement", FIXED_ASSET_SUPPORT: "Fixed asset support", PREPAYMENT_SUPPORT: "Prepayment support", EXPENSE_SUPPORT: "Expense support", OTHER: "Other" },
    parties: { NONE: "None", CUSTOMER: "Customer", SUPPLIER: "Supplier", EMPLOYEE: "Employee", FOUNDER: "Founder", BANK: "Bank", CASH: "Cash" },
    reconciliationCategories: { ACCOUNTS_RECEIVABLE: "Accounts receivable", ACCOUNTS_PAYABLE: "Accounts payable", EMPLOYEE_ACCOUNTABILITY: "Employee accountability", FOUNDER_SOURCE: "Founder source", BANK_CASH: "Bank and cash", ASSET: "Asset", LIABILITY: "Liability", EXPENSE: "Expense", OTHER: "Other" },
  },
  errors: {
    invalid_input: "Review the required fields and payload contract.",
    authority_denied: "Your accounting authority changed. Refresh or contact an administrator.",
    revision_conflict: "This package changed after you opened it. Reload the latest version.",
    package_not_found: "This package is no longer available.",
    duplicate_coverage: "A source event is covered more than once.",
    unsupported_classification: "The classification is not supported by the inception contract.",
    unsupported_source: "The source or journal is not eligible for this inception package.",
    evidence_required: "Required evidence references are missing.",
    unresolved_material_evidence: "Resolve material evidence and coverage before approval or acceptance.",
    incomplete_coverage: "Coverage or a required posted inception journal is incomplete.",
    review_required: "A separate approval is required before this action.",
    separation_required: "The creator, reviewer, and preparer roles do not satisfy the separation rules.",
    trial_balance_incomplete: "The accepted trial balance is incomplete or unbalanced.",
    source_payload_conflict: "The source payload conflicts with the existing version.",
    dependency_failure: "The accounting service could not complete the request.",
  },
};

const ar: AccountingInceptionDictionary = {
  title: "المركز الافتتاحي / بداية المحاسبة",
  subtitle: "أنشئ المركز الافتتاحي ذي الإصدارات وراجعه وفق دورة بداية المحاسبة الحالية.",
  backToSetup: "إعداد المحاسبة",
  createPackage: "إنشاء حزمة بداية المحاسبة",
  revisePackage: "إنشاء إصدار للحزمة",
  savePackage: "حفظ إصدار الحزمة",
  saving: "جارٍ الحفظ…",
  cancel: "إلغاء",
  notInitializedTitle: "لم تتم تهيئة ملف المحاسبة",
  notInitializedBody: "هيّئ الأساس المحاسبي قبل إنشاء حزمة البداية. لا تقوم هذه الصفحة بتهيئة المحاسبة.",
  recoveryRequiredTitle: "استعادة صلاحية المحاسبة مطلوبة",
  recoveryRequiredBody: "أكمل استعادة الصلاحية من إعداد المحاسبة قبل المتابعة.",
  emptyTitle: "لم يتم إنشاء حزم بداية المحاسبة",
  emptyBody: "أنشئ حزمة عندما تكون أدلة المركز الافتتاحي وتغطيته جاهزة. حفظ الحزمة لا ينشئ قيداً ولا يرحّله.",
  accessDeniedTitle: "تم رفض الوصول",
  accessDeniedBody: "لا يملك حسابك صلاحية عرض حزم بداية المحاسبة.",
  dependencyFailureTitle: "حزم بداية المحاسبة غير متاحة مؤقتاً",
  dependencyFailureBody: "تعذر على خدمة المحاسبة إرجاع استجابة صالحة. حاول لاحقاً أو تواصل مع المسؤول.",
  packageList: "حزم بداية المحاسبة",
  package: "الحزمة",
  currentVersion: "الإصدار الحالي",
  previousVersions: "سجل إصدارات الحزمة",
  version: "الإصدار",
  createdBy: "أنشأه",
  createdAt: "تاريخ الإنشاء",
  accepted: "مقبولة",
  pending: "غير مقبولة",
  startDate: "تاريخ بدء المحاسبة",
  cutoverDate: "تاريخ حد التحول",
  payload: "بيانات التغطية والأدلة (JSON)",
  payloadHelp: "أدخل حقول عقد W10C كما هي: accounting_start_date وcutover_boundary_date وevidence_inventory وitems وreconciliation_references. يتضمن كل بند التصنيف والحل ومراجع التسوية والطرف ومراجع الأدلة وخطة القيد فقط لتصنيفي RECONSTRUCTED_HISTORY أو OPENING_BALANCE.",
  payloadShape: "الدليل: evidence_id وversion وevidence_type وevidence_ref وsha256. البند: item_id وsource_domain وsource_record_key وeconomic_event_key وclassification وresolution_state وis_material وreconciliation_category وreconciliation_reference وparty_type وparty_reference وevidence_refs [{evidence_id,version}] وjournal. القيد: accounting_date وperiod_id وperiod_version وdescription_en وdescription_ar وlines [{account_id,account_version,side,amount_halalah,description_en,description_ar}]. مرجع التسوية: category وreference. لا تضف journal لتصنيفي POST_CUTOVER_SOURCE أو UNRESOLVED.",
  evidenceInventory: "سجل الأدلة",
  items: "بنود التغطية",
  reconciliationReferences: "مراجع التسوية",
  invalidPayload: "بيانات الحزمة غير صالحة أو غير مكتملة. تحقق من كل حقل وفق عقد W10C.",
  currentCoverage: "التغطية الحالية",
  coverageHistory: "سجل إصدارات التغطية",
  reviewHistory: "سجل المراجعة",
  noReview: "لم تسجل مراجعة لهذا الإصدار من الحزمة.",
  decision: "القرار",
  reviewReason: "سبب المراجعة",
  approve: "موافقة",
  reject: "رفض",
  reviewAction: "تسجيل المراجعة",
  prepareJournal: "إعداد قيد بداية المحاسبة",
  postJournal: "ترحيل القيد",
  acceptPackage: "قبول حزمة بداية المحاسبة",
  operationReason: "السبب",
  separationCreator: "لا يمكن لمنشئ الحزمة مراجعة هذا الإصدار.",
  separationReviewer: "تتطلب المراجعة والإعداد مستخدمين مختلفين؛ وعلى منشئ الحزمة إعداد القيد.",
  reviewRequired: "يجب أن يوافق مراجع مستقل على إصدار الحزمة الحالي أولاً.",
  prepareRequired: "يحتاج منشئ الحزمة إلى صلاحية إدارة البداية وإعداد القيود لإعداد هذا البند.",
  postRequired: "يحتاج المراجع الموافق إلى صلاحية إدارة البداية وترحيل القيود لترحيل هذا القيد.",
  acceptRequired: "يتطلب القبول المراجع الموافق وصلاحية إدارة البداية وعرض المحاسبة بعد ترحيل القيود المطلوبة.",
  item: "البند",
  classification: "التصنيف",
  resolution: "الحل",
  material: "جوهري",
  source: "هوية المصدر",
  evidence: "مراجع الأدلة",
  party: "مرجع الطرف",
  reconciliation: "مرجع التسوية",
  journal: "خطة القيد",
  journalId: "معرّف القيد",
  journalStatus: "حالة القيد الحالية",
  preparedJournalVersion: "الإصدار المسجل عند الإعداد",
  journalVersion: "إصدار القيد الحالي",
  journalVersionChanged: "تغيرت هذه المسودة بعد إعدادها، لذلك تم إيقاف الترحيل. عالج تعارض الإصدارات عبر إجراءات استعادة المحاسبة المعتمدة.",
  draft: "مسودة",
  posted: "مُرحّل",
  unresolved: "تمنع التغطية أو الأدلة غير المحلولة الموافقة والقبول.",
  missingEvidence: "يفتقد بند جوهري مرجعاً إلى إصدار دليل مدرج.",
  requiredJournalPending: "يحتاج كل بند من التاريخ المعاد بناؤه أو الرصيد الافتتاحي إلى قيد بداية مرحّل قبل قبول الحزمة.",
  approvalRecorded: "تمت الموافقة",
  rejectionRecorded: "تم الرفض",
  actionCompleted: "اكتمل الإجراء وتم تحديث أحدث حالة محفوظة.",
  trialBalance: "ميزان المراجعة المقبول",
  debitTotal: "إجمالي الأرصدة المدينة (هللة)",
  creditTotal: "إجمالي الأرصدة الدائنة (هللة)",
  accountCount: "الحسابات",
  account: "الحساب",
  accountType: "نوع الحساب",
  accountTypes: { ASSET: "أصل", LIABILITY: "التزام", EQUITY: "حقوق الملكية", REVENUE: "إيراد", EXPENSE: "مصروف" },
  yes: "نعم",
  no: "لا",
  resolutions: { RESOLVED: "تم الحل", UNRESOLVED: "غير محلول" },
  packageNotFoundTitle: "لم يتم العثور على حزمة بداية المحاسبة",
  packageNotFoundBody: "الحزمة غير متاحة أو أن معرّفها غير صالح.",
  backToPackages: "العودة إلى حزم بداية المحاسبة",
  states: {
    classifications: { RECONSTRUCTED_HISTORY: "تاريخ معاد بناؤه", OPENING_BALANCE: "رصيد افتتاحي", POST_CUTOVER_SOURCE: "مصدر بعد حد التحول", UNRESOLVED: "غير محسوم" },
    evidenceTypes: { BANK_STATEMENT: "كشف حساب بنكي", BANK_CONFIRMATION: "تأكيد بنكي", RECEIVABLE_DETAIL: "تفاصيل الذمم المدينة", PAYABLE_DETAIL: "تفاصيل الذمم الدائنة", EMPLOYEE_ACCOUNTABILITY: "عهدة موظف", FOUNDER_AGREEMENT: "اتفاق المؤسس", FIXED_ASSET_SUPPORT: "إثبات أصل ثابت", PREPAYMENT_SUPPORT: "إثبات دفعة مقدمة", EXPENSE_SUPPORT: "إثبات مصروف", OTHER: "أخرى" },
    parties: { NONE: "لا يوجد", CUSTOMER: "عميل", SUPPLIER: "مورد", EMPLOYEE: "موظف", FOUNDER: "مؤسس", BANK: "بنك", CASH: "نقد" },
    reconciliationCategories: { ACCOUNTS_RECEIVABLE: "الذمم المدينة", ACCOUNTS_PAYABLE: "الذمم الدائنة", EMPLOYEE_ACCOUNTABILITY: "عهدة الموظف", FOUNDER_SOURCE: "مصدر المؤسس", BANK_CASH: "البنك والنقد", ASSET: "أصل", LIABILITY: "التزام", EXPENSE: "مصروف", OTHER: "أخرى" },
  },
  errors: {
    invalid_input: "تحقق من الحقول المطلوبة وعقد البيانات.",
    authority_denied: "تغيرت صلاحيات المحاسبة. حدّث الصفحة أو تواصل مع المسؤول.",
    revision_conflict: "تغيرت الحزمة بعد فتحها. أعد تحميل أحدث إصدار.",
    package_not_found: "لم تعد هذه الحزمة متاحة.",
    duplicate_coverage: "تمت تغطية حدث المصدر أكثر من مرة.",
    unsupported_classification: "التصنيف غير مدعوم في عقد بداية المحاسبة.",
    unsupported_source: "المصدر أو القيد غير مؤهل لهذه الحزمة.",
    evidence_required: "مراجع الأدلة المطلوبة مفقودة.",
    unresolved_material_evidence: "حل الأدلة والتغطية الجوهرية قبل الموافقة أو القبول.",
    incomplete_coverage: "التغطية أو قيد البداية المرحّل المطلوب غير مكتمل.",
    review_required: "تلزم موافقة مستقلة قبل هذا الإجراء.",
    separation_required: "لا تستوفي أدوار المنشئ والمراجع والمعدّ قواعد الفصل.",
    trial_balance_incomplete: "ميزان المراجعة غير مكتمل أو غير متوازن.",
    source_payload_conflict: "تتعارض بيانات المصدر مع الإصدار الحالي.",
    dependency_failure: "تعذرت خدمة المحاسبة عن إكمال الطلب.",
  },
};

export function getAccountingInceptionDictionary(locale: Locale): AccountingInceptionDictionary {
  return locale === "ar" ? ar : en;
}
