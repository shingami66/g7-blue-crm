"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "./LocaleProvider";
import { getCommonDictionary } from "@/lib/i18n/dictionaries/common";
import {
  BUSINESS_YEAR_COOKIE,
  cleanBusinessYearParam,
  getCurrentBusinessYear,
  normalizeBusinessYear,
} from "@/lib/business-year";

const YEAR_SCOPED_LIST_PATHS = [
  "/services",
  "/quotations",
  "/invoices",
  "/payments",
  "/reports",
] as const;

function isYearScopedPath(pathname: string): boolean {
  return YEAR_SCOPED_LIST_PATHS.includes(pathname as (typeof YEAR_SCOPED_LIST_PATHS)[number]);
}

export default function BusinessYearSelector({
  years,
  preferredYear,
}: {
  years: readonly number[];
  preferredYear: number;
}) {
  const locale = useLocale();
  const dictionary = getCommonDictionary(locale).businessYear;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  if (!isYearScopedPath(pathname)) return null;

  const currentYear = getCurrentBusinessYear();
  const selectedYear = normalizeBusinessYear(
    searchParams.get("year") ?? String(preferredYear),
    currentYear,
  );

  function handleChange(value: string) {
    const nextYear = normalizeBusinessYear(value, currentYear);
    const secureCookie = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${BUSINESS_YEAR_COOKIE}=${encodeURIComponent(String(nextYear))}; Max-Age=31536000; Path=/; SameSite=Lax${secureCookie}`;
    const params = new URLSearchParams(searchParams.toString());
    const yearParam = cleanBusinessYearParam(nextYear, currentYear);
    if (yearParam) params.set("year", yearParam);
    else params.delete("year");
    params.delete("page");
    params.delete("month");
    params.delete("from");
    params.delete("to");
    for (const [key, value] of params.entries()) {
      if (!value.trim()) params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <label className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-[12px] font-medium text-on-surface">
      <span className="sr-only">{dictionary.label}</span>
      <span aria-hidden="true">{dictionary.shortLabel}</span>
      <select
        value={String(selectedYear)}
        onChange={(event) => handleChange(event.target.value)}
        aria-label={dictionary.label}
        className="max-w-[5.5rem] bg-transparent text-[12px] text-on-surface focus:outline-none"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
