import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_ADVANCE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierAdvancesDictionary } from "@/lib/i18n/dictionaries/supplier-advances";
import { getSupplierAdvanceById, getSupplierAdvanceEligibleBills } from "@/lib/supplier-advances/queries";
import SupplierAdvanceDetailClient from "./SupplierAdvanceDetailClient";

export const dynamic = "force-dynamic";

export default async function SupplierAdvanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [route, locale, canRead, canPay, canAllocate, canRefund, canReverse, canCorrect] = await Promise.all([
    params,
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.read),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.pay),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.allocate),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.refund),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.reverse),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.correct),
  ]);
  const dictionary = getSupplierAdvancesDictionary(locale);
  if (!canRead) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  let advance: NonNullable<Awaited<ReturnType<typeof getSupplierAdvanceById>>["advance"]> | null = null;
  let bills: Awaited<ReturnType<typeof getSupplierAdvanceEligibleBills>> = [];
  let stateMessage: string | null = null;
  try {
    const [advanceResult, eligibleBills] = await Promise.all([
      getSupplierAdvanceById(route.id),
      getSupplierAdvanceEligibleBills(route.id),
    ]);
    if (advanceResult.error) stateMessage = dictionary.states.loadError;
    else {
      advance = advanceResult.advance;
      bills = eligibleBills;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    stateMessage = error instanceof ForbiddenError ? dictionary.states.accessDenied : dictionary.states.loadError;
  }
  if (stateMessage) return <StateCard title={dictionary.title} message={stateMessage} />;
  if (!advance) notFound();
  return <SupplierAdvanceDetailClient
    advance={advance}
    eligibleBills={bills}
    canPay={canPay}
    canAllocate={canAllocate}
    canRefund={canRefund}
    canReverse={canReverse}
    canCorrect={canCorrect}
    dictionary={dictionary}
  />;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[40vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
