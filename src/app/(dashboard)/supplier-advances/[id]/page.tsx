import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_ADVANCE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierAdvancesDictionary } from "@/lib/i18n/dictionaries/supplier-advances";
import { getSupplierAdvanceById, getSupplierAdvanceEligibleBills } from "@/lib/supplier-advances/queries";
import { safeRecordReturnTo, type RecordListSearchParams } from "@/lib/record-navigation/return-to";
import type { Locale } from "@/lib/i18n/locales";
import PageLocation from "@/components/navigation/PageLocation";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import SupplierAdvanceDetailClient from "./SupplierAdvanceDetailClient";

export const dynamic = "force-dynamic";

export default async function SupplierAdvanceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<RecordListSearchParams> }) {
  const [route, query, locale, canRead, canPay, canAllocate, canRefund, canReverse, canCorrect, canRelease] = await Promise.all([
    params,
    searchParams,
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.read),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.pay),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.allocate),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.refund),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.reverse),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.correct),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.release),
  ]);
  const dictionary = getSupplierAdvancesDictionary(locale);
  const returnTo = safeRecordReturnTo(query.returnTo, "/supplier-advances");
  if (!canRead) return <StateCard locale={locale} moduleTitle={dictionary.title} heading={dictionary.states.accessDenied} message={dictionary.states.accessDenied} role="status" returnHref="/supplier-advances" returnLabel={dictionary.backToList} />;
  let advance: NonNullable<Awaited<ReturnType<typeof getSupplierAdvanceById>>["advance"]> | null = null;
  let bills: Awaited<ReturnType<typeof getSupplierAdvanceEligibleBills>> = [];
  let state: "accessDenied" | "loadError" | null = null;
  try {
    const [advanceResult, eligibleBills] = await Promise.all([
      getSupplierAdvanceById(route.id),
      getSupplierAdvanceEligibleBills(route.id),
    ]);
    if (advanceResult.error) state = "loadError";
    else {
      advance = advanceResult.advance;
      bills = eligibleBills;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    state = error instanceof ForbiddenError ? "accessDenied" : "loadError";
  }
  if (state) {
    const message = state === "accessDenied" ? dictionary.states.accessDenied : dictionary.states.loadError;
    return <StateCard locale={locale} moduleTitle={dictionary.title} heading={message} message={message} role={state === "accessDenied" ? "status" : "alert"} returnHref="/supplier-advances" returnLabel={dictionary.backToList} />;
  }
  if (!advance) notFound();
  return <SupplierAdvanceDetailClient
    advance={advance}
    eligibleBills={bills}
    canPay={canPay}
    canAllocate={canAllocate}
    canRefund={canRefund}
    canReverse={canReverse}
    canCorrect={canCorrect}
    canRelease={canRelease}
    returnTo={returnTo}
    dictionary={dictionary}
  />;
}

function StateCard({ locale, moduleTitle, heading, message, role, returnHref, returnLabel }: {
  locale: Locale;
  moduleTitle: string;
  heading: string;
  message: string;
  role: "alert" | "status";
  returnHref: string;
  returnLabel: string;
}) {
  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="w-full min-w-0">
      <PageFrame variant="record">
        <PageLocation returnControl={<RecordBackButton href={returnHref} locale={locale} variant="labeled" label={returnLabel} />} />
        <PageHeader variant="composed" title={moduleTitle} titleDir="auto" />
        <section role={role} aria-labelledby="supplier-advance-detail-error-title" className="w-full min-w-0 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:p-5">
          <h2 id="supplier-advance-detail-error-title" className="break-words text-xl font-semibold text-primary">{heading}</h2>
          <p className="mt-2 break-words text-sm text-on-surface-variant">{message}</p>
        </section>
      </PageFrame>
    </div>
  );
}
