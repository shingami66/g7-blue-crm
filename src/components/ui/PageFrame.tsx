import type { ReactNode } from "react";

export type PageFrameVariant = "workspace" | "record" | "form";

const widths: Record<PageFrameVariant, string> = {
  workspace: "w-full max-w-full",
  record: "w-full max-w-full",
  form: "mx-auto w-full max-w-5xl",
};

/** Lives inside DashboardLayout's main. A record shares workspace alignment. */
export default function PageFrame({ variant = "workspace", children }: { variant?: PageFrameVariant; children: ReactNode }) {
  return <div data-page-frame={variant} className={`flex min-w-0 flex-col gap-6 pb-12 ${widths[variant]}`}>{children}</div>;
}
