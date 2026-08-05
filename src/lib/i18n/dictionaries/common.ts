import type { Locale } from "../locales.ts";

export interface PaginationDictionary {
  first: string;
  last: string;
  previous: string;
  next: string;
  firstPage: string;
  lastPage: string;
  previousPage: string;
  nextPage: string;
  pageSize: string;
  pageSizeLabel: string;
  showingZero: string;
  showingRange: string;
  /** Template with `{number}` placeholder; Western digits supplied by formatter. */
  page: string;
  goToPage: string;
  currentPage: string;
}

/**
 * Shared authenticated CRM UI states (route loading, access denied, not found,
 * generic error, warning, retry). Module-local states stay in module dictionaries.
 */
export interface SharedUiStatesDictionary {
  loading: {
    /** Screen-reader / status label for shared pending indicators. */
    label: string;
    /** Accessible label for the route-shaped workspace skeleton. */
    workspace: string;
  };
  bootstrap: {
    /** Minimal copy used before the authenticated shell is available. */
    preparingWorkspace: string;
  };
  accessDenied: {
    title: string;
    message: string;
  };
  notFound: {
    title: string;
    message: string;
  };
  genericError: {
    title: string;
    message: string;
  };
  warning: {
    title: string;
    tryAgainLater: string;
  };
  retry: {
    tryAgain: string;
    goBack: string;
  };
}

export interface CommonDictionary {
  actions: {
    back: string;
    cancel: string;
    clear: string;
    close: string;
    create: string;
    edit: string;
    save: string;
  };
  labels: {
    notes: string;
    search: string;
    select: string;
    searchTypeFirst: string;
    status: string;
    total: string;
  };
  states: {
    empty: string;
    loading: string;
    searching: string;
    updatingResults: string;
    unavailable: string;
  };
  /** Route-level and shared authenticated feedback surfaces. */
  shared: SharedUiStatesDictionary;
  pagination: PaginationDictionary;
}

export interface LocaleSelectorDictionary {
  failure: string;
  label: string;
  persistenceWarning: string;
  persistencePending: string;
  retry: string;
  /** Visible pending copy while the locale action is in flight. */
  updating: string;
  /** Button label when current UI is English (switch target is Arabic). */
  switchToArabic: string;
  /** Button label when current UI is Arabic (switch target is English). */
  switchToEnglish: string;
}

export const localeSelectorDictionaryEn: LocaleSelectorDictionary = {
  failure: "Unable to update language preference.",
  label: "Language",
  persistenceWarning: "Language changed for this session, but the preference was not saved permanently.",
  persistencePending: "Language preference was saved, but this session could not synchronize immediately. Keep this language selected and refresh later.",
  retry: "Retry saving language",
  updating: "Updating language…",
  switchToArabic: "العربية",
  switchToEnglish: "English",
};

export const localeSelectorDictionaryAr: LocaleSelectorDictionary = {
  failure: "تعذر تحديث تفضيل اللغة.",
  label: "اللغة",
  persistenceWarning: "تم تغيير اللغة لهذه الجلسة، ولكن لم يتم حفظ التفضيل بشكل دائم.",
  persistencePending: "تم حفظ تفضيل اللغة، ولكن تعذر مزامنة الجلسة الحالية فورًا. ستظل هذه اللغة محددة ويمكنك التحديث لاحقًا.",
  retry: "إعادة محاولة حفظ اللغة",
  updating: "جارٍ تغيير اللغة…",
  switchToArabic: "العربية",
  switchToEnglish: "English",
};

const paginationDictionaryEn: PaginationDictionary = {
  first: "First",
  last: "Last",
  previous: "Previous",
  next: "Next",
  firstPage: "First page",
  lastPage: "Last page",
  previousPage: "Previous page",
  nextPage: "Next page",
  pageSize: "Rows",
  pageSizeLabel: "Rows per page",
  showingZero: "Showing 0 of 0",
  showingRange: "Showing {start}-{end} of {total}",
  page: "Page {number}",
  goToPage: "Go to page {number}",
  currentPage: "Current page, page {number}",
};

const paginationDictionaryAr: PaginationDictionary = {
  first: "الأولى",
  last: "الأخيرة",
  previous: "السابق",
  next: "التالي",
  firstPage: "الصفحة الأولى",
  lastPage: "الصفحة الأخيرة",
  previousPage: "الصفحة السابقة",
  nextPage: "الصفحة التالية",
  pageSize: "الصفوف",
  pageSizeLabel: "عدد الصفوف في الصفحة",
  showingZero: "عرض 0 من 0",
  showingRange: "عرض {start}-{end} من {total}",
  page: "الصفحة {number}",
  goToPage: "الانتقال إلى الصفحة {number}",
  currentPage: "الصفحة الحالية، الصفحة {number}",
};

const sharedUiStatesDictionaryEn: SharedUiStatesDictionary = {
  loading: {
    label: "Loading",
    workspace: "Loading workspace…",
  },
  bootstrap: {
    preparingWorkspace: "Preparing your workspace…",
  },
  accessDenied: {
    title: "Access denied",
    message: "You do not have permission to view this page.",
  },
  notFound: {
    title: "Page not found",
    message: "The page you are looking for could not be found.",
  },
  genericError: {
    title: "Something went wrong",
    message: "We could not load this information.",
  },
  warning: {
    title: "Warning",
    tryAgainLater: "Please try again later.",
  },
  retry: {
    tryAgain: "Try again",
    goBack: "Go back",
  },
};

const sharedUiStatesDictionaryAr: SharedUiStatesDictionary = {
  loading: {
    label: "جارٍ التحميل",
    workspace: "جاري تحميل مساحة العمل…",
  },
  bootstrap: {
    preparingWorkspace: "جاري تجهيز مساحة العمل…",
  },
  accessDenied: {
    title: "تم رفض الوصول",
    message: "ليس لديك صلاحية لعرض هذه الصفحة.",
  },
  notFound: {
    title: "الصفحة غير موجودة",
    message: "تعذر العثور على الصفحة المطلوبة.",
  },
  genericError: {
    title: "حدث خطأ ما",
    message: "تعذر تحميل هذه المعلومات.",
  },
  warning: {
    title: "تنبيه",
    tryAgainLater: "يرجى المحاولة مرة أخرى لاحقاً.",
  },
  retry: {
    tryAgain: "حاول مرة أخرى",
    goBack: "رجوع",
  },
};

export const commonDictionaryEn: CommonDictionary = {
  actions: {
    back: "Back",
    cancel: "Cancel",
    clear: "Clear",
    close: "Close",
    create: "Create",
    edit: "Edit",
    save: "Save",
  },
  labels: {
    notes: "Notes",
    search: "Search",
    select: "Select",
    searchTypeFirst: "Select a search type first",
    status: "Status",
    total: "Total",
  },
  states: {
    empty: "No results",
    loading: "Loading",
    searching: "Searching…",
    updatingResults: "Updating results…",
    unavailable: "Unavailable",
  },
  shared: sharedUiStatesDictionaryEn,
  pagination: paginationDictionaryEn,
};

export const commonDictionaryAr: CommonDictionary = {
  actions: {
    back: "رجوع",
    cancel: "إلغاء",
    clear: "مسح",
    close: "إغلاق",
    create: "إنشاء",
    edit: "تعديل",
    save: "حفظ",
  },
  labels: {
    notes: "ملاحظات",
    search: "بحث",
    select: "اختر",
    searchTypeFirst: "اختر نوع البحث أولاً",
    status: "الحالة",
    total: "الإجمالي",
  },
  states: {
    empty: "لا توجد نتائج",
    loading: "جارٍ التحميل",
    searching: "جاري البحث…",
    updatingResults: "جاري تحديث النتائج…",
    unavailable: "غير متاح",
  },
  shared: sharedUiStatesDictionaryAr,
  pagination: paginationDictionaryAr,
};

const commonDictionaries: Record<Locale, CommonDictionary> = {
  en: commonDictionaryEn,
  ar: commonDictionaryAr,
};

export function getCommonDictionary(locale: Locale): CommonDictionary {
  return commonDictionaries[locale];
}

export function getSharedUiStates(locale: Locale): SharedUiStatesDictionary {
  return getCommonDictionary(locale).shared;
}

export function getPaginationDictionary(locale: Locale): PaginationDictionary {
  return getCommonDictionary(locale).pagination;
}

/** Inserts Western-digit page numbers into pagination templates. */
export function formatPaginationCopy(template: string, page: number): string {
  return template.replaceAll("{number}", String(page));
}

/** Shallow key shape used by alignment tests (nested objects recurse one level). */
export function listSharedUiStateShapeKeys(
  shared: SharedUiStatesDictionary,
): string[] {
  const keys: string[] = [];
  for (const [section, value] of Object.entries(shared)) {
    keys.push(section);
    if (value && typeof value === "object") {
      for (const nested of Object.keys(value)) {
        keys.push(`${section}.${nested}`);
      }
    }
  }
  return keys.sort();
}
