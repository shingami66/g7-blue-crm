import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_BILL_PERMISSIONS } from "@/lib/auth/role-permissions";
import { SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierBillsDictionary } from "@/lib/i18n/dictionaries/supplier-bills";
import { safeRecordReturnTo } from "@/lib/record-navigation/return-to";
import type { Locale } from "@/lib/i18n/locales";
import PageLocation from "@/components/navigation/PageLocation";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import { getSupplierBillById, getSupplierBillFormOptions } from "@/lib/supplier-bills/queries";
import SupplierBillDetailClient from "../SupplierBillDetailClient";

export const dynamic = "force-dynamic";

export default async function SupplierBillDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const [{ id }, resolvedSearchParams, locale, canRead, canRecord, canApprove, canRecordPayment] = await Promise.all([
    params,
    searchParams,
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_BILL_PERMISSIONS.read),
    checkPermission(SUPPLIER_BILL_PERMISSIONS.record),
    checkPermission(SUPPLIER_BILL_PERMISSIONS.approve),
    checkPermission(SUPPLIER_PAYMENT_PERMISSIONS.record),
  ]);
  const dictionary = getSupplierBillsDictionary(locale);
  const returnTo = safeRecordReturnTo(resolvedSearchParams.returnTo, "/supplier-bills");
  if (!canRead) return <StateCard locale={locale} moduleTitle={dictionary.title} heading={dictionary.states.accessDenied} message={dictionary.states.accessDenied} role="status" returnHref="/supplier-bills" returnLabel={dictionary.backToList} />;
  let detail: Awaited<ReturnType<typeof getSupplierBillById>> | null = null;
  let options: Awaited<ReturnType<typeof getSupplierBillFormOptions>> | null = null;
  let state: "accessDenied" | "loadError" | null = null;
  try {
    [detail, options] = await Promise.all([getSupplierBillById(id), getSupplierBillFormOptions()]);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    state = error instanceof ForbiddenError ? "accessDenied" : "loadError";
  }
  if (state === "accessDenied") return <StateCard locale={locale} moduleTitle={dictionary.title} heading={dictionary.states.accessDenied} message={dictionary.states.accessDenied} role="status" returnHref="/supplier-bills" returnLabel={dictionary.backToList} />;
  if (state === "loadError" || !detail || detail.error || !options) return <StateCard locale={locale} moduleTitle={dictionary.title} heading={dictionary.states.loadError} message={dictionary.states.loadError} role="alert" returnHref="/supplier-bills" returnLabel={dictionary.backToList} />;
  if (!detail.bill) notFound();
  return <SupplierBillDetailClient bill={detail.bill} options={options} returnTo={returnTo} canRecord={canRecord} canApprove={canApprove} canRecordPayment={canRecordPayment} dictionary={dictionary} />;
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
        <section role={role} aria-labelledby="supplier-bill-detail-error-title" className="w-full min-w-0 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:p-5">
          <h2 id="supplier-bill-detail-error-title" className="break-words text-xl font-semibold text-primary">{heading}</h2>
          <p className="mt-2 break-words text-sm text-on-surface-variant">{message}</p>
        </section>
      </PageFrame>
    </div>
  );
}
