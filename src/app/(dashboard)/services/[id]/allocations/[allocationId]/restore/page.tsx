import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getServiceById } from "@/lib/services/queries";
import { getSupplierAllocationById } from "@/lib/supplier-allocations/queries";
import SupplierAllocationRestoreForm from "./SupplierAllocationRestoreForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RestoreSupplierAllocationPage({
  params,
}: {
  params: Promise<{ id: string; allocationId: string }>;
}) {
  const { id, allocationId } = await params;

  try {
    await requirePermission("supplier_allocations:read");
    await requirePermission("supplier_allocations:write");
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-sm text-slate-500">You do not have permission to restore supplier allocations.</p>
            <Link href={`/services/${id}?showDeleted=true`} className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium">
              <ArrowLeft size={16} /> Return to Service
            </Link>
          </div>
        </div>
      );
    }
    throw error;
  }

  const service = await getServiceById(id);
  if (!service) notFound();

  const allocation = await getSupplierAllocationById(allocationId, { includeDeleted: true });
  if (!allocation) notFound();
  if (allocation.serviceId !== service.id) notFound();

  if (service.status === "Completed" || service.status === "Cancelled") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Unavailable</h2>
          <p className="text-sm text-slate-500">Cannot restore a supplier allocation because the service is {service.status.toLowerCase()}.</p>
          <Link href={`/services/${id}?showDeleted=true`} className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium">
            <ArrowLeft size={16} /> Return to Service
          </Link>
        </div>
      </div>
    );
  }

  if (!allocation.isDeleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Allocation Not Deleted</h2>
          <p className="text-sm text-slate-500">This supplier allocation is currently active.</p>
          <Link href={`/services/${id}`} className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium">
            <ArrowLeft size={16} /> Return to Service
          </Link>
        </div>
      </div>
    );
  }

  if (allocation.costSource !== "manual_estimate") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Action Unavailable</h2>
          <p className="text-sm text-slate-500">Only manual allocations can be restored at this time.</p>
          <Link href={`/services/${id}?showDeleted=true`} className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium">
            <ArrowLeft size={16} /> Return to Service
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6">
        <Link href={`/services/${service.id}?showDeleted=true`} className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors">
          <ArrowLeft size={16} /> Back to Service
        </Link>
      </div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-on-surface">Restore Supplier Allocation</h1>
        <p className="text-on-surface-variant mt-1">Restore supplier allocation for {service.serviceNumber} - {service.serviceTitle}</p>
      </div>
      <SupplierAllocationRestoreForm serviceId={service.id} allocation={allocation} />
    </div>
  );
}
