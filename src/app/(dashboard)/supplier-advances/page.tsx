import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_ADVANCE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierAdvancesDictionary } from "@/lib/i18n/dictionaries/supplier-advances";
import { getSupplierAdvancesList } from "@/lib/supplier-advances/queries";
import SupplierAdvancesClient from "./SupplierAdvancesClient";

export const dynamic = "force-dynamic";

export default async function SupplierAdvancesPage() {
  const [locale, canRead, canAuthorize] = await Promise.all([
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.read),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.authorize),
  ]);
  const dictionary = getSupplierAdvancesDictionary(locale);
  if (!canRead) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  let advances: Awaited<ReturnType<typeof getSupplierAdvancesList>>["advances"] = [];
  let stateMessage: string | null = null;
  try {
    const result = await getSupplierAdvancesList();
    if (result.error) stateMessage = dictionary.states.loadError;
    else advances = result.advances;
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    stateMessage = error instanceof ForbiddenError ? dictionary.states.accessDenied : dictionary.states.loadError;
  }
  if (stateMessage) return <StateCard title={dictionary.title} message={stateMessage} />;
  return <SupplierAdvancesClient advances={advances} canAuthorize={canAuthorize} dictionary={dictionary} />;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[40vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
