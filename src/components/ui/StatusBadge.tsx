import { ReactNode } from "react";

type StatusVariant =
  | "draft"
  | "sent"
  | "approved"
  | "paid"
  | "active"
  | "completed"
  | "rejected"
  | "overdue"
  | "pending"
  | "processing"
  | "expired"
  | "inactive"
  | "unpaid"
  | "planning"
  | "confirmed"
  | "in-progress"
  | "lead"
  | "inquiry"
  | "quoted"
  | "deposit-paid"
  | "cancelled";

const variantStyles: Record<StatusVariant, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  paid: "bg-tertiary-fixed text-on-tertiary-fixed",
  active: "bg-status-active-bg text-status-active-text",
  completed: "bg-status-completed-bg text-status-completed-text",
  rejected: "bg-error-container text-on-error-container",
  overdue: "bg-error-container text-on-error-container",
  pending: "bg-tertiary-fixed text-on-tertiary-fixed",
  processing: "bg-amber-50 text-amber-700",
  expired: "bg-orange-50 text-orange-700 border-orange-200",
  inactive: "bg-status-inactive-bg text-status-inactive-text",
  unpaid: "bg-surface-variant text-on-surface",
  planning: "bg-surface-container-high text-on-surface",
  confirmed: "bg-primary-fixed text-on-primary-fixed-variant",
  "in-progress": "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  lead: "bg-blue-50 text-blue-700 border-blue-200",
  inquiry: "bg-blue-50 text-blue-700 border-blue-200",
  quoted: "bg-blue-50 text-blue-700 border-blue-200",
  "deposit-paid": "bg-tertiary-fixed text-on-tertiary-fixed",
  cancelled: "bg-error-container text-on-error-container",
};

export default function StatusBadge({
  variant,
  children,
}: {
  variant: StatusVariant;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
        variantStyles[variant] || variantStyles.draft
      }`}
    >
      {children}
    </span>
  );
}
