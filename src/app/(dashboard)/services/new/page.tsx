import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getCustomers } from "@/lib/customers/queries";
import { getLocale } from "@/lib/i18n/locales";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import ServiceForm from "./ServiceForm";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const locale = getLocale();
  const dictionary = getServicesDictionary(locale);
  let activeCustomers;

  try {
    await requirePermission("services:write");
    const allCustomers = await getCustomers();
    // Filter out inactive/lead/archived
    activeCustomers = allCustomers.filter((c) => c.status === "active");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
            <p className="text-sm text-slate-500">{dictionary.states.createForbidden}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.genericError}</h2>
          <p className="text-sm text-slate-500">{dictionary.states.serviceDataLoadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-12">
      <ServiceForm customers={activeCustomers} dictionary={dictionary} />
    </div>
  );
}
