import type { Locale } from "../locales.ts";

/**
 * Copy for the public `/unauthorized` access-pending surface.
 * Outside the authenticated dashboard shell; no CRM module data.
 */
export interface UnauthorizedDictionary {
  locale: Locale;
  /** Document title (browser tab). Includes product brand; brand text is not translated. */
  metaTitle: string;
  /** Product brand mark above the card — not translated. */
  brandMark: string;
  title: string;
  body: string;
  signOut: string;
  /** Footer product label — brand product name remains English. */
  footer: string;
}

const unauthorizedDictionaryEn: UnauthorizedDictionary = {
  locale: "en",
  metaTitle: "Access Pending — G7 BLUE CRM",
  brandMark: "G7 BLUE",
  title: "Access Pending",
  body: "Your sign-in was successful, but your account has not been activated yet. Please contact your administrator to request access.",
  signOut: "Sign Out",
  footer: "G7 BLUE Events CRM",
};

const unauthorizedDictionaryAr: UnauthorizedDictionary = {
  locale: "ar",
  metaTitle: "الوصول قيد الانتظار — G7 BLUE CRM",
  brandMark: "G7 BLUE",
  title: "الوصول قيد الانتظار",
  body: "تم تسجيل الدخول بنجاح، لكن لم يتم تفعيل حسابك بعد. يرجى التواصل مع المسؤول لطلب الوصول.",
  signOut: "تسجيل الخروج",
  footer: "G7 BLUE Events CRM",
};

export function getUnauthorizedDictionary(locale: Locale): UnauthorizedDictionary {
  return locale === "ar" ? unauthorizedDictionaryAr : unauthorizedDictionaryEn;
}
