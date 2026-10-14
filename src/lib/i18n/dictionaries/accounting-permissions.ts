import type { AccountingActionErrorCode, AccountingCapability } from "@/lib/accounting/types";
import type { Locale } from "../locales";

export type AccountingPermissionsDictionary = {
  title: string;
  subtitle: string;
  accessDeniedTitle: string;
  accessDeniedBody: string;
  dependencyFailureTitle: string;
  dependencyFailureBody: string;
  activeUser: string;
  chooseUser: string;
  loadAssignments: string;
  targetLimitNote: string;
  noTargets: string;
  noTargetSelected: string;
  assignmentsTitle: string;
  currentAssignment: string;
  currentRevision: string;
  notAssigned: string;
  expiresAt: string;
  lastChangedAt: string;
  manageCapability: string;
  selectedCapability: string;
  effect: string;
  effects: Record<"ALLOW" | "DENY" | "REVOKE", string>;
  expiry: string;
  expiryHint: string;
  reason: string;
  evidenceReference: string;
  save: string;
  saving: string;
  saved: string;
  actionFailure: string;
  rootAuthorityTitle: string;
  rootAuthorityNote: string;
  openAccountingSetup: string;
  capabilities: Record<AccountingCapability, string>;
  errors: Partial<Record<AccountingActionErrorCode, string>>;
};

const english: AccountingPermissionsDictionary = {
  title: "Accounting permissions",
  subtitle: "Review current accounting capability assignments for an active user.",
  accessDeniedTitle: "Access denied",
  accessDeniedBody: "Your account does not have accounting authority management permission.",
  dependencyFailureTitle: "Accounting permissions are temporarily unavailable",
  dependencyFailureBody: "The accounting permissions service could not return a valid response. Try again later or contact an administrator.",
  activeUser: "Active user",
  chooseUser: "Choose an active user",
  loadAssignments: "Load assignments",
  targetLimitNote: "The chooser lists up to 100 active users and excludes your own account.",
  noTargets: "No other active users are available.",
  noTargetSelected: "Choose an active user to review assignments.",
  assignmentsTitle: "Current capability assignments",
  currentAssignment: "Current assignment",
  currentRevision: "Current revision",
  notAssigned: "Not assigned",
  expiresAt: "Expires",
  lastChangedAt: "Recorded",
  manageCapability: "Manage",
  selectedCapability: "Update this capability",
  effect: "Change",
  effects: { ALLOW: "ALLOW", DENY: "DENY", REVOKE: "REVOKE" },
  expiry: "Expiry (optional)",
  expiryHint: "Enter the date and time in your browser's local time. Expiry applies only to ALLOW.",
  reason: "Reason",
  evidenceReference: "Evidence reference (optional)",
  save: "Save capability change",
  saving: "Saving…",
  saved: "Capability change recorded.",
  actionFailure: "The request could not be completed. Review the details and try again.",
  rootAuthorityTitle: "Root accounting authority",
  rootAuthorityNote: "This capability is read-only here. Use Accounting Setup for root authority succession or recovery.",
  openAccountingSetup: "Open Accounting Setup",
  capabilities: {
    "accounting:view": "View accounting",
    "accounting:manage_profile": "Manage accounting profile",
    "accounting:manage_authority": "Manage root accounting authority",
    "accounting:manage_chart": "Manage Chart of Accounts",
    "accounting:manage_periods": "Manage accounting periods",
    "accounting:prepare_journal": "Prepare journals",
    "accounting:post_journal": "Post journals",
    "accounting:reverse_journal": "Reverse journals",
    "accounting:manage_inception": "Manage opening position / inception",
    "accounting:manage_ar_bridge": "Manage accounts receivable bridge",
    "accounting:manage_ap_bridge": "Manage accounts payable bridge",
    "accounting:manage_expense_bridge": "Manage expense bridge",
    "accounting:manage_revenue_recognition": "Manage revenue recognition",
    "accounting:reconcile_bank": "Reconcile bank statements",
    "accounting:close_period": "Close accounting periods",
    "accounting:reopen_period": "Reopen accounting periods",
    "accounting:view_statements": "View financial statements",
  },
  errors: {
    invalid_input: "Check the selected capability, expiry, and required reason.",
    actor_inactive: "Your account is no longer active. Refresh the page or contact an administrator.",
    authority_denied: "Your accounting authority does not allow this change.",
    authority_unavailable: "Accounting authority is unavailable. Try again later.",
    authority_conflict: "Root authority changed. Open Accounting Setup to continue.",
    user_not_found: "The selected active user is no longer available. Reload the page.",
    profile_not_initialized: "The accounting foundation is not initialized. Open Accounting Setup.",
    capability_catalog_invalid: "The accounting capability catalog is unavailable. Contact an administrator.",
    unknown_capability: "The selected capability is not recognized. Reload the page.",
    capability_disabled: "The selected capability is no longer enabled. Reload the page.",
    capability_not_grantable: "This capability cannot be changed through the generic permissions screen.",
    invalid_expiry: "Enter a valid future expiry date and time for ALLOW.",
    revision_conflict: "Another authority change was recorded. The current assignments have been reloaded; review them and try again.",
    request_payload_conflict: "This request identifier was already used for different details. Reload the page and try again.",
    dependency_failure: "The accounting permissions service could not complete the request. Try again later.",
  },
};

const arabic: AccountingPermissionsDictionary = {
  title: "صلاحيات المحاسبة",
  subtitle: "راجع تعيينات صلاحيات المحاسبة الحالية لمستخدم نشط.",
  accessDeniedTitle: "تم رفض الوصول",
  accessDeniedBody: "لا يملك حسابك صلاحية إدارة تفويضات المحاسبة.",
  dependencyFailureTitle: "صلاحيات المحاسبة غير متاحة مؤقتاً",
  dependencyFailureBody: "تعذر على خدمة صلاحيات المحاسبة إرجاع استجابة صالحة. حاول لاحقاً أو تواصل مع المسؤول.",
  activeUser: "مستخدم نشط",
  chooseUser: "اختر مستخدماً نشطاً",
  loadAssignments: "عرض التعيينات",
  targetLimitNote: "تعرض القائمة ما يصل إلى ١٠٠ مستخدم نشط، مع استبعاد حسابك.",
  noTargets: "لا يوجد مستخدمون نشطون آخرون.",
  noTargetSelected: "اختر مستخدماً نشطاً لمراجعة التعيينات.",
  assignmentsTitle: "تعيينات الصلاحيات الحالية",
  currentAssignment: "التعيين الحالي",
  currentRevision: "الإصدار الحالي",
  notAssigned: "غير معيّن",
  expiresAt: "ينتهي في",
  lastChangedAt: "تاريخ التسجيل",
  manageCapability: "إدارة",
  selectedCapability: "تحديث هذه الصلاحية",
  effect: "التغيير",
  effects: { ALLOW: "سماح", DENY: "رفض", REVOKE: "إلغاء" },
  expiry: "تاريخ الانتهاء (اختياري)",
  expiryHint: "أدخل التاريخ والوقت وفق التوقيت المحلي لمتصفحك. ينطبق تاريخ الانتهاء على السماح فقط.",
  reason: "السبب",
  evidenceReference: "مرجع الإثبات (اختياري)",
  save: "حفظ تغيير الصلاحية",
  saving: "جارٍ الحفظ…",
  saved: "تم تسجيل تغيير الصلاحية.",
  actionFailure: "تعذر إكمال الطلب. راجع التفاصيل وحاول مرة أخرى.",
  rootAuthorityTitle: "صلاحية المحاسبة الجذرية",
  rootAuthorityNote: "هذه الصلاحية للقراءة فقط هنا. استخدم إعداد المحاسبة لنقل الصلاحية الجذرية أو استعادتها.",
  openAccountingSetup: "فتح إعداد المحاسبة",
  capabilities: {
    "accounting:view": "عرض المحاسبة",
    "accounting:manage_profile": "إدارة ملف المحاسبة",
    "accounting:manage_authority": "إدارة صلاحية المحاسبة الجذرية",
    "accounting:manage_chart": "إدارة دليل الحسابات",
    "accounting:manage_periods": "إدارة الفترات المحاسبية",
    "accounting:prepare_journal": "إعداد القيود المحاسبية",
    "accounting:post_journal": "ترحيل القيود المحاسبية",
    "accounting:reverse_journal": "عكس القيود المحاسبية",
    "accounting:manage_inception": "إدارة المركز الافتتاحي وبداية المحاسبة",
    "accounting:manage_ar_bridge": "إدارة ربط الذمم المدينة",
    "accounting:manage_ap_bridge": "إدارة ربط الذمم الدائنة",
    "accounting:manage_expense_bridge": "إدارة ربط المصروفات",
    "accounting:manage_revenue_recognition": "إدارة الاعتراف بالإيراد",
    "accounting:reconcile_bank": "تسوية كشوف البنك",
    "accounting:close_period": "إقفال الفترات المحاسبية",
    "accounting:reopen_period": "إعادة فتح الفترات المحاسبية",
    "accounting:view_statements": "عرض القوائم المالية",
  },
  errors: {
    invalid_input: "تحقق من الصلاحية المحددة وتاريخ الانتهاء والسبب المطلوب.",
    actor_inactive: "لم يعد حسابك نشطاً. حدّث الصفحة أو تواصل مع المسؤول.",
    authority_denied: "لا تسمح صلاحيتك المحاسبية بهذا التغيير.",
    authority_unavailable: "صلاحية المحاسبة غير متاحة. حاول مرة أخرى لاحقاً.",
    authority_conflict: "تغيرت الصلاحية الجذرية. افتح إعداد المحاسبة للمتابعة.",
    user_not_found: "لم يعد المستخدم النشط المحدد متاحاً. أعد تحميل الصفحة.",
    profile_not_initialized: "لم تتم تهيئة الأساس المحاسبي. افتح إعداد المحاسبة.",
    capability_catalog_invalid: "كتالوج صلاحيات المحاسبة غير متاح. تواصل مع المسؤول.",
    unknown_capability: "الصلاحية المحددة غير معروفة. أعد تحميل الصفحة.",
    capability_disabled: "لم تعد الصلاحية المحددة مفعلة. أعد تحميل الصفحة.",
    capability_not_grantable: "لا يمكن تغيير هذه الصلاحية من شاشة الصلاحيات العامة.",
    invalid_expiry: "أدخل تاريخاً ووقتاً صالحين في المستقبل للسماح.",
    revision_conflict: "تم تسجيل تغيير آخر للصلاحية. أُعيد تحميل التعيينات الحالية؛ راجعها ثم حاول مرة أخرى.",
    request_payload_conflict: "استُخدم معرّف الطلب لتفاصيل مختلفة. أعد تحميل الصفحة وحاول مرة أخرى.",
    dependency_failure: "تعذر على خدمة صلاحيات المحاسبة إكمال الطلب. حاول لاحقاً.",
  },
};

export function getAccountingPermissionsDictionary(locale: Locale): AccountingPermissionsDictionary {
  return locale === "ar" ? arabic : english;
}

export function getAccountingPermissionsActionErrorMessage(
  code: string,
  dictionary: AccountingPermissionsDictionary,
): string {
  return dictionary.errors[code as AccountingActionErrorCode] ?? dictionary.actionFailure;
}
