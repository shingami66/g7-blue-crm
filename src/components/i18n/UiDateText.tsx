import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/locales";
import {
  resolveUiDateDisplay,
  resolveUiDateTimeDisplay,
  type FormatDateInput,
  type FormatUiDateOptions,
  type FormatUiDateTimeOptions,
  type UiDateDisplayTokens,
} from "@/lib/i18n/formatting";

type CommonProps = {
  locale: Locale;
  value: FormatDateInput;
  className?: string;
};

function renderTokens(tokens: UiDateDisplayTokens, className?: string): ReactNode {
  if (tokens.kind === "empty") {
    return <span className={className}>{tokens.text}</span>;
  }

  if (tokens.kind === "plain") {
    // English (and non-segmented) dates: single LTR unit is correct.
    return (
      <span dir="ltr" className={["tabular-nums whitespace-nowrap", className].filter(Boolean).join(" ")}>
        {tokens.text}
      </span>
    );
  }

  // Arabic: outer RTL phrase; day/year isolated LTR; month stays Arabic.
  // Do NOT wrap the full phrase in dir="ltr" — that reorders to "يونيو 2026 16".
  // Time: isolate only the numeric clock; keep ص/م as a separate unit after it.
  // Never wrap "07:47 ص" as one LTR isolate (that can render as "ص 07:47").
  return (
    <span
      dir="rtl"
      className={["inline-block whitespace-nowrap tabular-nums", className]
        .filter(Boolean)
        .join(" ")}
    >
      <bdi dir="ltr">{tokens.day}</bdi>
      {tokens.month ? <> {tokens.month}</> : null}
      {tokens.year ? (
        <>
          {" "}
          <bdi dir="ltr">{tokens.year}</bdi>
        </>
      ) : null}
      {tokens.time ? (
        <>
          {"، "}
          <bdi dir="ltr">{tokens.time}</bdi>
          {tokens.dayPeriod ? <> {tokens.dayPeriod}</> : null}
        </>
      ) : null}
    </span>
  );
}

/** Structured calendar date for UI (Arabic segment isolation; English plain LTR). */
export function UiDateText({
  locale,
  value,
  className,
  options,
}: CommonProps & { options?: FormatUiDateOptions }) {
  return <>{renderTokens(resolveUiDateDisplay(locale, value, options), className)}</>;
}

/** Structured date-time for UI. */
export function UiDateTimeText({
  locale,
  value,
  className,
  options,
}: CommonProps & { options?: FormatUiDateTimeOptions }) {
  return <>{renderTokens(resolveUiDateTimeDisplay(locale, value, options), className)}</>;
}

/**
 * Chronological date range: start unit – end unit.
 * Outer sequence is forced LTR so RTL shells do not reverse the range units.
 * Each Arabic date child retains its own RTL segment rendering.
 */
export function UiDateRangeText({
  locale,
  start,
  end,
  className,
  options,
}: {
  locale: Locale;
  start: FormatDateInput;
  end: FormatDateInput;
  className?: string;
  options?: FormatUiDateOptions;
}) {
  const startTokens = resolveUiDateDisplay(locale, start, options);
  const endTokens = resolveUiDateDisplay(locale, end, options);

  if (startTokens.kind === "empty" && endTokens.kind === "empty") {
    return <span className={className}>{startTokens.text}</span>;
  }
  if (startTokens.kind === "empty") {
    return <>{renderTokens(endTokens, className)}</>;
  }
  if (endTokens.kind === "empty") {
    return <>{renderTokens(startTokens, className)}</>;
  }

  return (
    <span
      dir="ltr"
      className={["inline-flex max-w-full flex-wrap items-center gap-x-1", className]
        .filter(Boolean)
        .join(" ")}
      data-ui-date-range="true"
    >
      <span data-range-part="start">{renderTokens(startTokens)}</span>
      <span aria-hidden className="shrink-0" data-range-part="separator">
        –
      </span>
      <span data-range-part="end">{renderTokens(endTokens)}</span>
    </span>
  );
}
