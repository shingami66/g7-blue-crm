import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getServiceById } from "@/lib/services/queries";
import QuotationForm from "./QuotationForm";

export const dynamic = "force-dynamic";

interface NewQuotationPageProps {
  searchParams?: Promise<{ serviceId?: string | string[] }>;
}

function getRequestedServiceId(searchParams: { serviceId?: string | string[] }) {
  const serviceId = searchParams.serviceId;
  return Array.isArray(serviceId) ? serviceId[0] : serviceId;
}

function serviceCanReceiveQuotation(status: string) {
  return status === "Inquiry" || status === "Quoted";
}

export default async function NewQuotationPage({ searchParams }: NewQuotationPageProps) {
  let authError: unknown = null;

  try {
    await requirePermission("quotations:write");
    await requirePermission("services:read");
  } catch (err) {
    authError = err;
  }

  if (authError instanceof UnauthorizedError) {
    redirect("/sign-in");
  }

  if (authError instanceof ForbiddenError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500">
            You don&apos;t have permission to create quotations.
          </p>
        </div>
      </div>
    );
  }

  if (authError) {
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

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const serviceId = getRequestedServiceId(resolvedSearchParams);

  if (!serviceId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Select a Service First</h2>
          <p className="text-sm text-slate-500 mb-4">
            Quotations must be created from an active Service.
          </p>
          <Link href="/services" className="text-primary hover:underline font-medium">
            Go to Services
          </Link>
        </div>
      </div>
    );
  }

  let serviceLoadError: unknown = null;
  let service: Awaited<ReturnType<typeof getServiceById>> = null;

  try {
    service = await getServiceById(serviceId);
  } catch (err) {
    serviceLoadError = err;
  }

  if (serviceLoadError instanceof UnauthorizedError) {
    redirect("/sign-in");
  }

  if (serviceLoadError instanceof ForbiddenError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500">
            You don&apos;t have permission to view the selected Service.
          </p>
        </div>
      </div>
    );
  }

  if (serviceLoadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500">
            We couldn&apos;t load the selected Service at this time. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Not Available</h2>
          <p className="text-sm text-slate-500 mb-4">
            The selected Service does not exist or is no longer available.
          </p>
          <Link href="/services" className="text-primary hover:underline font-medium">
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  if (!serviceCanReceiveQuotation(service.status)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Quotation Creation Locked</h2>
          <p className="text-sm text-slate-500 mb-4">
            Quotations can only be created for Services in Inquiry or Quoted status.
          </p>
          <Link href={`/services/${service.id}`} className="text-primary hover:underline font-medium">
            Back to Service
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-12">
      <QuotationForm service={service} />
    </div>
  );
}
