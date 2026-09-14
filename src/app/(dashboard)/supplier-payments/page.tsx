import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierPaymentsDictionary } from "@/lib/i18n/dictionaries/supplier-payments";
import { getSupplierPaymentsList } from "@/lib/supplier-payments/queries";
import SupplierPaymentsClient from "./SupplierPaymentsClient";

export const dynamic = "force-dynamic";

export default async function SupplierPaymentsPage() {
  const [locale, canRead] = await Promise.all([getCurrentSessionEffectiveLocale(), checkPermission(SUPPLIER_PAYMENT_PERMISSIONS.read)]);
  const dictionary = getSupplierPaymentsDictionary(locale);
  if (!canRead) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  let payments: Awaited<ReturnType<typeof getSupplierPaymentsList>>["payments"] = [];
  try {
    payments = (await getSupplierPaymentsList()).payments;
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
    return <StateCard title={dictionary.states.loadError} message={dictionary.states.loadError} />;
  }
  return <SupplierPaymentsClient payments={payments} dictionary={dictionary} />;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
