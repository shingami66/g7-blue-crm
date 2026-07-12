import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { getSuppliersList } from "@/lib/suppliers/queries";
import SuppliersClient from "./SuppliersClient";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getSuppliersDictionary(locale);
  let result: Awaited<ReturnType<typeof getSuppliersList>>;
  let canCreateSuppliers = false;
  let canViewCosting = false;

  try {
    result = await getSuppliersList();
    canCreateSuppliers = await checkPermission("suppliers:write");
    canViewCosting = await checkPermission("supplier_costing:read");
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
            <p className="text-sm text-slate-500">{dictionary.states.listForbidden}</p>
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
          <p className="text-sm text-slate-500">{dictionary.states.listLoadError}</p>
        </div>
      </div>
    );
  }

  return (
    <SuppliersClient
      suppliers={result.suppliers}
      loadError={result.error}
      canCreateSuppliers={canCreateSuppliers}
      canViewCosting={canViewCosting}
      dictionary={dictionary}
    />
  );
}
