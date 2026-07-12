"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n/locales";

const LocaleContext = createContext<Locale | null>(null);

export function LocaleProvider({
  children,
  locale,
}: Readonly<{
  children: React.ReactNode;
  locale: Locale;
}>) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  const locale = useContext(LocaleContext);

  if (!locale) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return locale;
}
