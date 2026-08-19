"use client";

import { useRouter } from "next/navigation";
import type { DocumentLocale } from "@/lib/documents/locale";
import type { DocumentDictionary } from "@/lib/documents/locale";
import { getDirection } from "@/lib/i18n/direction";

type DocumentLocaleSelectProps = {
  value: DocumentLocale;
  disabled?: boolean;
  id?: string;
  labels: DocumentDictionary["locale"];
};

export default function DocumentLocaleSelect({
  value,
  disabled = false,
  id = "documentLanguage",
  labels,
}: DocumentLocaleSelectProps) {
  const router = useRouter();
  const hintId = `${id}-hint`;
  const selectDirection = getDirection(value);

  const handleChange = (nextValue: string) => {
    const nextLanguage = nextValue as DocumentLocale;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("lang", nextLanguage);
    router.replace(`${nextUrl.pathname}${nextUrl.search}`, { scroll: false });
  };

  return (
    <div className="no-print inline-flex items-center gap-2" dir={selectDirection}>
      <label htmlFor={id} className="text-sm font-medium text-on-surface-variant shrink-0">
        {labels.label}:
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        disabled={disabled}
        aria-describedby={hintId}
        className="min-h-9 w-[120px] bg-surface border border-outline-variant rounded-lg px-2.5 py-1.5 text-sm font-medium text-on-surface focus:outline-none focus:border-primary disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed text-start"
        dir={selectDirection}
      >
        <option value="en">{labels.english}</option>
        <option value="ar">{labels.arabic}</option>
      </select>
      <p id={hintId} className="sr-only">
        {labels.hint}
      </p>
    </div>
  );
}
