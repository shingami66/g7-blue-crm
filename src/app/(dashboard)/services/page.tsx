import { redirect } from "next/navigation";
import { getServices } from "@/lib/services/queries";
import { checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getLocale } from "@/lib/i18n/locales";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import ServicesClient from "./ServicesClient";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const locale = getLocale();
  const dictionary = getServicesDictionary(locale);
  let services;
  let canWrite;

  try {
    services = await getServices();
    canWrite = await checkPermission("services:write");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
            <p className="text-sm text-slate-500">{dictionary.states.servicesForbidden}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.genericError}</h2>
          <p className="text-sm text-slate-500">{dictionary.states.servicesLoadError}</p>
        </div>
      </div>
    );
  }

  return <ServicesClient services={services} canWrite={canWrite} dictionary={dictionary} />;
}
