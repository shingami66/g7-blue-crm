import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import SupplierCreateForm from "./SupplierCreateForm";

export const dynamic = "force-dynamic";

export default async function NewSupplierPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getSuppliersDictionary(locale);

  try {
    await requirePermission("suppliers:write");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {dictionary.states.accessDenied}
            </h2>
            <p className="text-sm text-slate-500">{dictionary.states.createForbidden}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {dictionary.states.genericError}
          </h2>
          <p className="text-sm text-slate-500">{dictionary.states.createLoadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-12">
      <SupplierCreateForm dictionary={dictionary} />
    </div>
  );
}
