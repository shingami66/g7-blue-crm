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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h2 className="text-[28px] leading-[36px] tracking-[-0.01em] font-semibold text-primary">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex gap-3">{children}</div>}
    </div>
  );
}
