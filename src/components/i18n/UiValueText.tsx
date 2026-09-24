import type { ReactNode } from "react";
import type {
  FormatNumberInput,
  FormatSarAmountOptions,
  FormatUiNumberOptions,
} from "@/lib/i18n/formatting";
import {
  formatSarAmount,
  formatUiNumber,
  isFiniteNumber,
} from "@/lib/i18n/formatting";
import type { Locale } from "@/lib/i18n/locales";

/** Natural/auto direction for names, references, and other free-form text leaves. */
export function UiBidiText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <bdi dir="auto" className={className}>
      {children}
    </bdi>
  );
}

/** Isolated LTR leaf for structured identifiers or already-formatted LTR text. */
export function UiLtrText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <bdi dir="ltr" className={className}>
      {children}
    </bdi>
  );
}

const NUMERIC_LEAF_CLASS = "inline-block whitespace-nowrap tabular-nums";

/** SAR stays in a natural-direction parent; only the formatted money leaf is LTR. */
export function UiMoneyText({
  locale,
  value,
  options,
  className,
}: {
  locale: Locale;
  value: FormatNumberInput;
  options?: Omit<FormatSarAmountOptions, "isolate">;
  className?: string;
}) {
  const formatted = formatSarAmount(locale, value, { ...options, isolate: false });

  if (!isFiniteNumber(value)) {
    return <span className={className}>{formatted}</span>;
  }

  return (
    <UiLtrText className={[NUMERIC_LEAF_CLASS, className].filter(Boolean).join(" ")}>
      {formatted}
    </UiLtrText>
  );
}

/** Generic localized number leaf; missing values remain in the surrounding direction. */
export function UiNumberText({
  locale,
  value,
  options,
  className,
}: {
  locale: Locale;
  value: FormatNumberInput;
  options?: Omit<FormatUiNumberOptions, "isolate">;
  className?: string;
}) {
  const formatted = formatUiNumber(locale, value, { ...options, isolate: false });

  if (!isFiniteNumber(value)) {
    return <span className={className}>{formatted}</span>;
  }

  return (
    <UiLtrText className={[NUMERIC_LEAF_CLASS, className].filter(Boolean).join(" ")}>
      {formatted}
    </UiLtrText>
  );
}
