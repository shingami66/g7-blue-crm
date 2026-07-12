import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getQuotationById } from "@/lib/quotations/queries";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getQuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import QuotationForm from "../../new/QuotationForm";

export const dynamic = "force-dynamic";

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getQuotationsDictionary(locale);
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
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
          <p className="text-sm text-slate-500">
            {dictionary.states.createForbidden}
          </p>
        </div>
      </div>
    );
  }

  if (authOrLoadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.genericError}</h2>
          <p className="text-sm text-slate-500">
            {dictionary.states.createDataLoadError}
          </p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.editStates.notFound}</h2>
          <p className="text-sm text-slate-500">
            {dictionary.editStates.notFoundMessage}
          </p>
        </div>
      </div>
    );
  }

  if (quotation.status !== "draft") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.editStates.locked}</h2>
          <p className="text-sm text-slate-500 mb-4">
            {dictionary.editStates.lockedMessage}
          </p>
          <Link href="/quotations" className="text-primary hover:underline font-medium">{dictionary.editStates.backToQuotations}</Link>
        </div>
      </div>
    );
  }

  if (!quotation.service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.editStates.serviceContextRequired}</h2>
          <p className="text-sm text-slate-500 mb-4">
            {dictionary.editStates.serviceContextMessage}
          </p>
          <Link href="/quotations" className="text-primary hover:underline font-medium">{dictionary.editStates.backToQuotations}</Link>
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
        dictionary={dictionary}
      />
    </div>
  );
}
