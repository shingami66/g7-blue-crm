import type { Locale } from "../locales";

export interface RecordNavigationDictionary {
  title: string;
  unavailable: string;
  first: string;
  previous: string;
  next: string;
  last: string;
}

const en: RecordNavigationDictionary = {
  title: "Record navigation",
  unavailable: "Record navigation unavailable",
  first: "First",
  previous: "Previous",
  next: "Next",
  last: "Last",
};

const ar: RecordNavigationDictionary = {
  title: "التنقل بين السجلات",
  unavailable: "تعذر تحميل التنقل بين السجلات",
  first: "الأول",
  previous: "السابق",
  next: "التالي",
  last: "الأخير",
};

export function getRecordNavigationDictionary(locale: Locale): RecordNavigationDictionary {
  return locale === "ar" ? ar : en;
}
