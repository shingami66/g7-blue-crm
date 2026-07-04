import { notFound, redirect } from "next/navigation";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getActiveSupplierOptions } from "@/lib/suppliers/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import SupplierAllocationCreateForm from "./SupplierAllocationCreateForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type NewAllocationServiceRow = {
  id: string;
  service_number: string;
  service_title: string;
  status: string;
};

export default async function NewSupplierAllocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    await requirePermission("services:read");
    await requirePermission("supplier_allocations:read");
    await requirePermission("supplier_allocations:write");
    await requirePermission("supplier_allocations:read_cost");
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
              You do not have permission to create manual supplier allocations.
            </p>
            <Link
              href={`/services/${id}`}
              className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <ArrowLeft size={16} />
              Return to Service
            </Link>
          </div>
        </div>
      );
    }
    throw error;
  }

  // Also check suppliers:read to get options
  const canReadSuppliers = await checkPermission("suppliers:read");
  if (!canReadSuppliers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500">
            You do not have permission to view suppliers, which is required to create an allocation.
          </p>
          <Link
            href={`/services/${id}`}
            className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft size={16} />
            Return to Service
          </Link>
        </div>
      </div>
    );
  }

  const supabase = createAdminClient();
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, service_number, service_title, status")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (serviceError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Failed to load service</h2>
          <p className="text-sm text-slate-500">
            We couldn&apos;t load the service details needed to create an allocation. Please try again later.
          </p>
          <Link
            href={`/services/${id}`}
            className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft size={16} />
            Return to Service
          </Link>
        </div>
      </div>
    );
  }

  if (!service) {
    notFound();
  }

  const serviceRecord = service as NewAllocationServiceRow;

  if (serviceRecord.status === "Completed" || serviceRecord.status === "Cancelled") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Unavailable</h2>
          <p className="text-sm text-slate-500">
            Cannot create a supplier allocation because the service is {serviceRecord.status.toLowerCase()}.
          </p>
          <Link
            href={`/services/${id}`}
            className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft size={16} />
            Return to Service
          </Link>
        </div>
      </div>
    );
  }

  const { suppliers, error: suppliersError } = await getActiveSupplierOptions();

  if (suppliersError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Failed to load suppliers</h2>
          <p className="text-sm text-slate-500">
            We couldn&apos;t load the supplier options. Please try again later.
          </p>
          <Link
            href={`/services/${id}`}
            className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft size={16} />
            Return to Service
          </Link>
        </div>
      </div>
    );
  }

  const canUseRateCards = await checkPermission("supplier_costing:read");

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6">
        <Link
          href={`/services/${serviceRecord.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Service
        </Link>
      </div>
      
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-on-surface">New Supplier Allocation</h1>
        <p className="text-on-surface-variant mt-1">
          Create a manual supplier allocation for {serviceRecord.service_number} - {serviceRecord.service_title}
        </p>
      </div>

      <SupplierAllocationCreateForm
        serviceId={serviceRecord.id}
        suppliers={suppliers} 
        canUseRateCards={canUseRateCards}
      />
    </div>
  );
}
