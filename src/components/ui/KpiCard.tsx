import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

type TrendDirection = "up" | "down" | "flat" | "warning";

/**
 * Shared KPI summary card.
 * Value area supports long SAR/count strings without page overflow or clipped digits.
 */
export default function KpiCard({
  label,
  value,
  trend,
  trendLabel,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend?: TrendDirection;
  trendLabel?: string;
  icon: LucideIcon;
}) {
  const trendColor =
    trend === "up"
      ? "text-surface-tint"
      : trend === "down" || trend === "warning"
        ? "text-error"
        : "text-on-surface-variant";

  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className="flex min-w-0 flex-col justify-between rounded-xl border border-surface-variant bg-surface-container-lowest p-4 transition-colors hover:border-outline-variant">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[12px] font-semibold uppercase leading-[16px] tracking-[0.05em] text-on-surface-variant">
          {label}
        </span>
        <span className="shrink-0 rounded-lg bg-primary-fixed/30 p-1.5 text-primary">
          <Icon size={20} />
        </span>
      </div>
      <div className="mt-4 min-w-0">
        <span
          className="block max-w-full break-words font-bold tracking-[-0.02em] text-on-surface tabular-nums [overflow-wrap:anywhere] text-[clamp(1.25rem,2.8vw,2.25rem)] leading-[1.15]"
          dir="ltr"
        >
          {value}
        </span>
        {trendLabel ? (
          <div className="mt-1 flex min-w-0 items-center gap-1">
            <TrendIcon size={16} className={`shrink-0 ${trendColor}`} />
            <span
              className={`min-w-0 text-[12px] font-semibold leading-[16px] tracking-[0.05em] ${trendColor}`}
            >
              {trendLabel}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
