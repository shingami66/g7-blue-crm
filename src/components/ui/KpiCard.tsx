import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";

type TrendDirection = "up" | "down" | "flat" | "warning";

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
    trend === "up"
      ? TrendingUp
      : trend === "down"
      ? TrendingDown
      : Minus;

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-surface-variant p-4 flex flex-col justify-between hover:border-outline-variant transition-colors">
      <div className="flex justify-between items-start">
        <span className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase">
          {label}
        </span>
        <span className="text-primary bg-primary-fixed/30 p-1.5 rounded-lg">
          <Icon size={20} />
        </span>
      </div>
      <div className="mt-4">
        <span className="text-[36px] leading-[44px] tracking-[-0.02em] font-bold text-on-surface">
          {value}
        </span>
        {trendLabel && (
          <div className="flex items-center gap-1 mt-1">
            <TrendIcon size={16} className={trendColor} />
            <span className={`text-[12px] leading-[16px] tracking-[0.05em] font-semibold ${trendColor}`}>
              {trendLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
