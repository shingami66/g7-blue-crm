import type { ReactNode } from "react";

type SharedAuthenticatedStatePanelProps = {
  title: string;
  message: string;
  /** Optional primary action (retry/reset, go back, etc.). */
  action?: ReactNode;
  /** Accessibility role for live/error semantics. Default: none (static). */
  role?: "alert" | "status";
};

/**
 * Shared centered authenticated CRM feedback panel.
 * Copy is supplied by callers from the common shared dictionary.
 * Does not perform authorization; server-side permission checks remain authoritative.
 */
export default function SharedAuthenticatedStatePanel({
  title,
  message,
  action,
  role,
}: SharedAuthenticatedStatePanelProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        role={role}
      >
        <h2 className="mb-2 text-xl font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{message}</p>
        {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
