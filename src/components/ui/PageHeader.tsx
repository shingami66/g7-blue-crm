import { ReactNode } from "react";
import PageActions, { type PageActionsProps } from "./PageActions";

type LegacyPageHeaderProps = {
  variant?: "legacy";
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

type ComposedPageHeaderProps = {
  variant: "composed";
  title: string;
  titleDir?: "auto" | "ltr" | "rtl";
  subtitle?: string;
  identifier?: ReactNode;
  status?: ReactNode;
  actions?: PageActionsProps;
};

export default function PageHeader(props: LegacyPageHeaderProps | ComposedPageHeaderProps) {
  if (props.variant === "composed") {
    return (
      <header className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:justify-between" data-page-header="composed">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 dir={props.titleDir ?? "auto"} className="min-w-0 break-words text-[28px] font-semibold leading-[36px] tracking-[-0.01em] text-primary">{props.title}</h1>
            {props.status ? <div className="min-w-0 max-w-full" data-page-status="true">{props.status}</div> : null}
          </div>
          {props.identifier != null && props.identifier !== false ? <div className="mt-1 min-w-0 break-words text-sm text-on-surface-variant" data-page-identifier="true">{props.identifier}</div> : null}
          {props.subtitle ? <p className="mt-1 min-w-0 break-words text-[14px] leading-5 text-on-surface-variant">{props.subtitle}</p> : null}
        </div>
        {props.actions ? <PageActions {...props.actions} /> : null}
      </header>
    );
  }

  // Keep existing consumers' markup and appearance until explicitly migrated.
  const { title, subtitle, children } = props;
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
