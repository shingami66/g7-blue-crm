import type { Locale } from "./locales.ts";

export type Direction = "ltr" | "rtl";

export function getDirection(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}
