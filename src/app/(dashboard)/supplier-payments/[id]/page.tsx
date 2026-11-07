import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierPaymentsDictionary } from "@/lib/i18n/dictionaries/supplier-payments";
import { getSupplierPaymentById } from "@/lib/supplier-payments/queries";
import { safeRecordReturnTo, type RecordListSearchParams } from "@/lib/record-navigation/return-to";
import type { Locale } from "@/lib/i18n/locales";
import PageLocation from "@/components/navigation/PageLocation";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import SupplierPaymentDetailClient from "../SupplierPaymentDetailClient";

export const dynamic = "force-dynamic";

export default async function SupplierPaymentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<RecordListSearchParams> }) {
  const [{ id }, query, locale, canReverse] = await Promise.all([
    params,
    searchParams,
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_PAYMENT_PERMISSIONS.reverse),
  ]);
  const returnTo = safeRecordReturnTo(query.returnTo, "/supplier-payments");
  const dictionary = getSupplierPaymentsDictionary(locale);
  let result: Awaited<ReturnType<typeof getSupplierPaymentById>>;
  try {
    result = await getSupplierPaymentById(id);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) return <StateCard locale={locale} moduleTitle={dictionary.title} heading={dictionary.states.accessDenied} message={dictionary.states.accessDenied} role="status" returnHref="/supplier-payments" returnLabel={dictionary.backToList} />;
    return <StateCard locale={locale} moduleTitle={dictionary.title} heading={dictionary.states.loadError} message={dictionary.states.loadError} role="alert" returnHref="/supplier-payments" returnLabel={dictionary.backToList} />;
  }
  if (result.error) return <StateCard locale={locale} moduleTitle={dictionary.title} heading={dictionary.states.loadError} message={dictionary.states.loadError} role="alert" returnHref="/supplier-payments" returnLabel={dictionary.backToList} />;
  if (!result.payment) notFound();
  return <SupplierPaymentDetailClient payment={result.payment} canReverse={canReverse} returnTo={returnTo} dictionary={dictionary} />;
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
        <section role={role} aria-labelledby="supplier-payment-detail-error-title" className="w-full min-w-0 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:p-5">
          <h2 id="supplier-payment-detail-error-title" className="break-words text-xl font-semibold text-primary">{heading}</h2>
          <p className="mt-2 break-words text-sm text-on-surface-variant">{message}</p>
        </section>
      </PageFrame>
    </div>
  );
}
