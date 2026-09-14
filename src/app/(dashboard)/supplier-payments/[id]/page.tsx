import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierPaymentsDictionary } from "@/lib/i18n/dictionaries/supplier-payments";
import { getSupplierPaymentById } from "@/lib/supplier-payments/queries";
import SupplierPaymentDetailClient from "../SupplierPaymentDetailClient";

export const dynamic = "force-dynamic";

export default async function SupplierPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale, canReverse] = await Promise.all([
    params,
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_PAYMENT_PERMISSIONS.reverse),
  ]);
  const dictionary = getSupplierPaymentsDictionary(locale);
  let result: Awaited<ReturnType<typeof getSupplierPaymentById>>;
  try {
    result = await getSupplierPaymentById(id);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
    return <StateCard title={dictionary.states.loadError} message={dictionary.states.loadError} />;
  }
  if (!result.payment) notFound();
  return <SupplierPaymentDetailClient payment={result.payment} canReverse={canReverse} dictionary={dictionary} />;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
