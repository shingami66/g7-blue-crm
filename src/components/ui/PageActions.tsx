import type { ReactNode } from "react";

export interface PageActionsProps {
  label: string;
  primary?: ReactNode;
  secondary?: ReactNode;
  overflow?: ReactNode;
}

/** Slots contain caller-authorized controls; this is not a toolbar or menu. */
export default function PageActions({ label, primary, secondary, overflow }: PageActionsProps) {
  if (!primary && !secondary && !overflow) return null;
  if (!label.trim()) throw new Error("Page actions require an accessible label");
  return (
    <div role="group" aria-label={label} className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
      {secondary ? <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2" data-page-actions="secondary">{secondary}</div> : null}
      {primary ? <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2" data-page-actions="primary">{primary}</div> : null}
      {overflow ? <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2" data-page-actions="overflow">{overflow}</div> : null}
    </div>
  );
}
