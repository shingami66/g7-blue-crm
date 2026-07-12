import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getServiceById } from "@/lib/services/queries";
import { getSupplierAllocationById } from "@/lib/supplier-allocations/queries";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import SupplierAllocationEditForm from "./SupplierAllocationEditForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditSupplierAllocationPage({
  params,
}: {
  params: Promise<{ id: string; allocationId: string }>;
}) {
  const { id, allocationId } = await params;
  const locale = await getCurrentSessionEffectiveLocale();
  const servicesDictionary = getServicesDictionary(locale);
  const dictionary = servicesDictionary.supplierAllocations.subflow.editPage;

  try {
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
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {dictionary.accessDeniedTitle}
            </h2>
            <p className="text-sm text-slate-500">{dictionary.accessDeniedMessage}</p>
            <Link
              href={`/services/${id}`}
              className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              <ArrowLeft size={16} />
              {dictionary.returnToService}
            </Link>
          </div>
        </div>
      );
    }
    throw error;
  }

  const service = await getServiceById(id);

  if (!service) {
    notFound();
  }

  const allocation = await getSupplierAllocationById(allocationId);

  if (!allocation) {
    notFound();
  }

  if (allocation.serviceId !== service.id) {
    notFound();
  }

  const localizedServiceStatus =
    servicesDictionary.serviceStatuses[
      service.status as keyof typeof servicesDictionary.serviceStatuses
    ] ?? service.status;

  if (service.status === "Completed" || service.status === "Cancelled") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {dictionary.serviceUnavailableTitle}
          </h2>
          <p className="text-sm text-slate-500">
            {dictionary.serviceUnavailableMessage.replace("{status}", localizedServiceStatus)}
          </p>
          <Link
            href={`/services/${id}`}
            className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft size={16} />
            {dictionary.returnToService}
          </Link>
        </div>
      </div>
    );
  }

  if (allocation.status === "cancelled") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {dictionary.cancelledTitle}
          </h2>
          <p className="text-sm text-slate-500">{dictionary.cancelledMessage}</p>
          <Link
            href={`/services/${id}`}
            className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft size={16} />
            {dictionary.returnToService}
          </Link>
        </div>
      </div>
    );
  }

  if (allocation.costSource !== "manual_estimate") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {dictionary.rateCardTitle}
          </h2>
          <p className="text-sm text-slate-500">{dictionary.rateCardMessage}</p>
          <Link
            href={`/services/${id}`}
            className="mt-6 inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <ArrowLeft size={16} />
            {dictionary.returnToService}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-6">
        <Link
          href={`/services/${service.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft size={16} />
          {dictionary.backToService}
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-on-surface">{dictionary.title}</h1>
        <p className="text-on-surface-variant mt-1">
          {dictionary.subtitle}{" "}
          <span dir="ltr">{isolateBidiText(service.serviceNumber)}</span>
          {" - "}
          <span dir="auto">{isolateBidiText(service.serviceTitle)}</span>
        </p>
      </div>

      <SupplierAllocationEditForm serviceId={service.id} allocation={allocation} />
    </div>
  );
}
