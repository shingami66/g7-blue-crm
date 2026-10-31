"use client";

import type { Locale } from "@/lib/i18n/locales";
import { getCommonDictionary } from "@/lib/i18n/dictionaries/common";
import PendingLink from "@/components/ui/PendingLink";
import { LocaleBackIcon } from "@/components/i18n/LocaleBackIcon";
import { requireInternalHref } from "@/lib/navigation/internal-href";

interface RecordBackButtonProps {
  href: string;
  locale: Locale;
  ariaLabel?: string;
  label?: string;
  className?: string;
  variant?: "icon" | "labeled";
}

export function RecordBackButton({
  href,
  locale,
  ariaLabel,
  label,
  className,
  variant,
}: RecordBackButtonProps) {
  const common = getCommonDictionary(locale);
  const accessibleLabel = ariaLabel?.trim() || label?.trim() || common.actions.back;
  // Omitted variant preserves legacy presentation; explicit variant owns visuals.
  const isLabeled = variant ? variant === "labeled" : Boolean(label);

  return (
    <PendingLink
      href={requireInternalHref(href)}
      className={
        className ??
        (isLabeled
          ? "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40")
      }
      aria-label={accessibleLabel}
    >
      <LocaleBackIcon size={16} />
      {isLabeled ? <span>{label?.trim() || accessibleLabel}</span> : null}
    </PendingLink>
  );
}

export default RecordBackButton;
