"use client";

import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getDirection } from "@/lib/i18n/direction";

type LocaleBackIconProps = {
  size?: number;
  className?: string;
};

/**
 * Back chevron that flips for RTL (Arabic) so it points toward the correct
 * reading-direction back affordance. English LTR keeps the default ArrowLeft.
 */
export function LocaleBackIcon({ size = 18, className }: LocaleBackIconProps) {
  const locale = useLocale();
  const rtl = getDirection(locale) === "rtl";

  return (
    <ArrowLeft
      size={size}
      className={[rtl ? "scale-x-[-1]" : undefined, className].filter(Boolean).join(" ")}
      aria-hidden
    />
  );
}
