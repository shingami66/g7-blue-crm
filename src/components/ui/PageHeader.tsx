import { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ textAlign: "start" }}
    >
      <div style={{ textAlign: "start" }}>
        <h2 className="text-[28px] leading-[36px] tracking-[-0.01em] font-semibold text-primary">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
