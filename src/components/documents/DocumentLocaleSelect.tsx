"use client";

import { useRouter } from "next/navigation";
import type { DocumentLocale } from "@/lib/documents/locale";
import type { DocumentDictionary } from "@/lib/documents/locale";

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

  const handleChange = (nextValue: string) => {
    const nextLanguage = nextValue as DocumentLocale;
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("lang", nextLanguage);
    router.replace(`${nextUrl.pathname}${nextUrl.search}`, { scroll: false });
  };

  return (
    <div className="no-print flex flex-col gap-1.5 w-full max-w-xs">
      <label htmlFor={id} className="text-[14px] font-semibold text-on-surface">
        {labels.label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        disabled={disabled}
        aria-describedby={hintId}
        className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed"
        dir="ltr"
      >
        <option value="en">{labels.english}</option>
        <option value="ar">{labels.arabic}</option>
      </select>
      <p id={hintId} className="text-[12px] text-on-surface-variant leading-snug">
        {labels.hint}
      </p>
    </div>
  );
}
