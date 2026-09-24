"use client";

import type { Locale } from "@/lib/i18n/locales";
import { getCommonDictionary } from "@/lib/i18n/dictionaries/common";
import PendingLink from "@/components/ui/PendingLink";
import { LocaleBackIcon } from "@/components/i18n/LocaleBackIcon";

interface RecordBackButtonProps {
  href: string;
  locale: Locale;
  ariaLabel?: string;
  label?: string;
  className?: string;
}

export function RecordBackButton({
  href,
  locale,
  ariaLabel,
  label,
  className,
}: RecordBackButtonProps) {
  const common = getCommonDictionary(locale);
  const accessibleLabel = ariaLabel ?? label ?? common.actions.back;

  return (
    <PendingLink
      href={href}
      className={
        className ??
        (label
          ? "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40")
      }
      aria-label={accessibleLabel}
    >
      <LocaleBackIcon size={16} />
      {label ? <span>{label}</span> : null}
    </PendingLink>
  );
}

export default RecordBackButton;
