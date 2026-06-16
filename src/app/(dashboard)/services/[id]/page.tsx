import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getServiceById } from "@/lib/services/queries";
import StatusBadge from "@/components/ui/StatusBadge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_VARIANT_MAP = {
  "Inquiry": "inquiry",
  "Quoted": "quoted",
  "Approved": "approved",
  "Deposit Paid": "deposit-paid",
  "In Progress": "in-progress",
  "Completed": "completed",
  "Cancelled": "cancelled",
} as const;

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    await requirePermission("services:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }
    if (error instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-sm text-slate-500">
              You do not have permission to view services.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500">
            We couldn&apos;t load the necessary data at this time. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const service = await getServiceById(id);

  if (!service) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/services"
          className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[28px] leading-[36px] font-semibold text-primary font-mono tracking-tight">
              {service.serviceNumber}
            </h2>
            <StatusBadge variant={(STATUS_VARIANT_MAP[service.status as keyof typeof STATUS_VARIANT_MAP] ?? "pending") as React.ComponentProps<typeof StatusBadge>["variant"]}>
              {service.status}
            </StatusBadge>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
          <h3 className="font-semibold text-primary">Service Details</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Service Title
            </div>
            <div className="text-on-surface font-medium">
              {service.serviceTitle}
            </div>
          </div>
          <div>
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Customer
            </div>
            <div className="text-on-surface font-medium">
              {service.customer?.company || "—"} {service.customer?.contact ? `(${service.customer.contact})` : ""}
            </div>
          </div>
          <div>
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Estimated Budget
            </div>
            <div className="text-on-surface font-medium">
              {service.estimatedBudget != null
                ? `${Number(service.estimatedBudget).toLocaleString("en-SA")} SAR`
                : "—"}
            </div>
          </div>

          <div>
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Event Name
            </div>
            <div className="text-on-surface font-medium">
              {service.eventName || "—"}
            </div>
          </div>
          <div>
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Event Type
            </div>
            <div className="text-on-surface font-medium">
              {service.eventType || "—"}
            </div>
          </div>
          <div>
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Event Location
            </div>
            <div className="text-on-surface font-medium">
              {service.eventLocation || "—"}
            </div>
          </div>

          <div>
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Start Date
            </div>
            <div className="text-on-surface font-medium">
              {service.eventStartDate || "—"}
            </div>
          </div>
          <div>
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              End Date
            </div>
            <div className="text-on-surface font-medium">
              {service.eventEndDate || "—"}
            </div>
          </div>
          <div>
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Created At
            </div>
            <div className="text-on-surface font-medium">
              {new Date(service.createdAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3">
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Description
            </div>
            <div className="text-on-surface whitespace-pre-wrap font-medium">
              {service.description || "—"}
            </div>
          </div>

          <div>
            <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Updated At
            </div>
            <div className="text-on-surface font-medium">
              {new Date(service.updatedAt).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
