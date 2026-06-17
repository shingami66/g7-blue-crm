import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getQuotationById } from "@/lib/quotations/queries";
import QuotationForm from "../../new/QuotationForm";

export const dynamic = "force-dynamic";

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let authOrLoadError: unknown = null;
  let quotation: Awaited<ReturnType<typeof getQuotationById>> = null;

  try {
    await requirePermission("quotations:write");
    await requirePermission("services:read");
    quotation = await getQuotationById(id);
  } catch (err) {
    authOrLoadError = err;
  }

  if (authOrLoadError instanceof UnauthorizedError) {
    redirect("/sign-in");
  }

  if (authOrLoadError instanceof ForbiddenError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500">
            You don&apos;t have permission to edit quotations.
          </p>
        </div>
      </div>
    );
  }

  if (authOrLoadError) {
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

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Quotation Not Found</h2>
          <p className="text-sm text-slate-500">
            The quotation you are trying to edit does not exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  if (quotation.status !== "draft") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Locked</h2>
          <p className="text-sm text-slate-500 mb-4">
            Only draft quotations can be edited.
          </p>
          <Link href="/quotations" className="text-primary hover:underline font-medium">Back to Quotations</Link>
        </div>
      </div>
    );
  }

  if (!quotation.service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Service Context Required</h2>
          <p className="text-sm text-slate-500 mb-4">
            This quotation cannot be edited until its Service relationship is available.
          </p>
          <Link href="/quotations" className="text-primary hover:underline font-medium">Back to Quotations</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-12">
      <QuotationForm
        service={{
          id: quotation.serviceId,
          serviceNumber: quotation.service.serviceNumber,
          serviceTitle: quotation.service.serviceTitle,
          status: quotation.service.status,
          eventName: quotation.service.eventName,
          customer: quotation.customer,
        }}
        initialData={quotation}
      />
    </div>
  );
}
