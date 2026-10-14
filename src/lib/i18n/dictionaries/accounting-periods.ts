import type { AccountingActionErrorCode, AccountingPeriodStatus } from "@/lib/accounting/types";
import type { Locale } from "@/lib/i18n/locales";

export type AccountingPeriodsDictionary = {
  title: string;
  subtitle: string;
  backToSetup: string;
  currentPeriods: string;
  create: string;
  revise: string;
  createTitle: string;
  reviseTitle: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string;
  evidenceReference: string;
  save: string;
  saving: string;
  cancel: string;
  version: string;
  versionHistory: string;
  effectiveFrom: string;
  savedVersion: string;
  openOnlyNote: string;
  reloadLatest: string;
  emptyTitle: string;
  emptyBody: string;
  notInitializedTitle: string;
  notInitializedBody: string;
  recoveryRequiredTitle: string;
  recoveryRequiredBody: string;
  accessDeniedTitle: string;
  accessDeniedBody: string;
  dependencyFailureTitle: string;
  dependencyFailureBody: string;
  actionFailure: string;
  statuses: Record<AccountingPeriodStatus, string>;
  errors: Partial<Record<AccountingActionErrorCode, string>>;
};

const english: AccountingPeriodsDictionary = {
  title: "Accounting Periods",
  subtitle: "Review and configure open accounting periods with version history.",
  backToSetup: "Accounting setup",
  currentPeriods: "Accounting periods",
  create: "Create period",
  revise: "Revise",
  createTitle: "New accounting period",
  reviseTitle: "Revise open period",
  startDate: "Start date",
  endDate: "End date",
  status: "Status",
  reason: "Reason for change",
  evidenceReference: "Evidence reference (optional)",
  save: "Save period version",
  saving: "Saving…",
  cancel: "Cancel",
  version: "Version",
  versionHistory: "Previous versions",
  effectiveFrom: "Effective from",
  savedVersion: "Period saved as version {version}.",
  openOnlyNote: "This setup creates or revises OPEN periods. Period close, lock, and reopen actions are not available here.",
  reloadLatest: "Reload the latest period version",
  emptyTitle: "No accounting periods have been configured",
  emptyBody: "Create an open period when the accounting calendar has been approved. This screen does not create journals or close periods.",
  notInitializedTitle: "Accounting profile is not initialized",
  notInitializedBody: "Initialize the accounting foundation before viewing or configuring periods. This screen does not initialize it.",
  recoveryRequiredTitle: "Accounting authority recovery is required",
  recoveryRequiredBody: "Complete authority recovery in Accounting Setup before configuring periods.",
  accessDeniedTitle: "Access denied",
  accessDeniedBody: "Your account does not have permission to view Accounting Periods.",
  dependencyFailureTitle: "Accounting Periods are temporarily unavailable",
  dependencyFailureBody: "The accounting service could not return a valid response. Try again later or contact an administrator.",
  actionFailure: "The request could not be completed. Review the details and try again.",
  statuses: { OPEN: "Open", CLOSED: "Closed", LOCKED: "Locked" },
  errors: {
    invalid_input: "Review the period dates and required fields.",
    authority_denied: "Your accounting permission changed. Refresh the page or contact an administrator.",
    profile_not_initialized: "Initialize the accounting profile before saving periods.",
    profile_not_active: "The accounting profile is not active for this change.",
    revision_conflict: "This period changed after you opened it. Reload the latest version before trying again.",
    request_payload_conflict: "This save request conflicts with an earlier request. Refresh and submit the current details again.",
    period_not_found: "This period is no longer available. Reload the periods list.",
    invalid_period_boundary: "The end date must be on or after the start date.",
    period_overlap: "These dates overlap another current accounting period.",
  },
};

const arabic: AccountingPeriodsDictionary = {
  title: "الفترات المحاسبية",
  subtitle: "راجع الفترات المحاسبية المفتوحة وأعد إعدادها مع سجل للإصدارات.",
  backToSetup: "إعداد المحاسبة",
  currentPeriods: "الفترات المحاسبية",
  create: "إنشاء فترة",
  revise: "إنشاء إصدار",
  createTitle: "فترة محاسبية جديدة",
  reviseTitle: "إنشاء إصدار لفترة مفتوحة",
  startDate: "تاريخ البدء",
  endDate: "تاريخ الانتهاء",
  status: "الحالة",
  reason: "سبب التغيير",
  evidenceReference: "مرجع الإثبات (اختياري)",
  save: "حفظ إصدار الفترة",
  saving: "جارٍ الحفظ…",
  cancel: "إلغاء",
  version: "الإصدار",
  versionHistory: "الإصدارات السابقة",
  effectiveFrom: "ساري من",
  savedVersion: "تم حفظ الفترة بالإصدار {version}.",
  openOnlyNote: "تنشئ هذه الشاشة الفترات المفتوحة أو تنشئ لها إصدارات. لا تتوفر إجراءات الإقفال أو القفل أو إعادة الفتح هنا.",
  reloadLatest: "إعادة تحميل أحدث إصدار للفترة",
  emptyTitle: "لم يتم إعداد فترات محاسبية",
  emptyBody: "أنشئ فترة مفتوحة بعد اعتماد التقويم المحاسبي. لا تنشئ هذه الشاشة قيوداً ولا تقفل الفترات.",
  notInitializedTitle: "لم تتم تهيئة ملف المحاسبة",
  notInitializedBody: "هيّئ أساس المحاسبة قبل عرض الفترات أو إعدادها. لا تقوم هذه الشاشة بتهيئته.",
  recoveryRequiredTitle: "استعادة صلاحية المحاسبة مطلوبة",
  recoveryRequiredBody: "أكمل استعادة الصلاحيات في إعداد المحاسبة قبل إعداد الفترات.",
  accessDeniedTitle: "تم رفض الوصول",
  accessDeniedBody: "لا يملك حسابك صلاحية عرض الفترات المحاسبية.",
  dependencyFailureTitle: "الفترات المحاسبية غير متاحة مؤقتاً",
  dependencyFailureBody: "تعذر على خدمة المحاسبة إرجاع استجابة صالحة. حاول لاحقاً أو تواصل مع المسؤول.",
  actionFailure: "تعذر إكمال الطلب. راجع التفاصيل وحاول مرة أخرى.",
  statuses: { OPEN: "مفتوحة", CLOSED: "مقفلة", LOCKED: "مؤمّنة" },
  errors: {
    invalid_input: "راجع تواريخ الفترة والحقول المطلوبة.",
    authority_denied: "تغيرت صلاحية المحاسبة لديك. حدّث الصفحة أو تواصل مع المسؤول.",
    profile_not_initialized: "هيّئ ملف المحاسبة قبل حفظ الفترات.",
    profile_not_active: "ملف المحاسبة غير نشط لهذا التغيير.",
    revision_conflict: "تغيرت هذه الفترة بعد فتحها. أعد تحميل أحدث إصدار قبل المحاولة مرة أخرى.",
    request_payload_conflict: "يتعارض طلب الحفظ مع طلب سابق. حدّث الصفحة وأرسل التفاصيل الحالية مرة أخرى.",
    period_not_found: "لم تعد هذه الفترة متاحة. أعد تحميل قائمة الفترات.",
    invalid_period_boundary: "يجب أن يكون تاريخ الانتهاء في يوم البدء أو بعده.",
    period_overlap: "تتداخل هذه التواريخ مع فترة محاسبية حالية أخرى.",
  },
};

export function getAccountingPeriodsDictionary(locale: Locale): AccountingPeriodsDictionary {
  return locale === "ar" ? arabic : english;
}
