import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierPaymentsDictionary } from "@/lib/i18n/dictionaries/supplier-payments";
import PageLocation from "@/components/navigation/PageLocation";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import { safeRecordReturnTo } from "@/lib/record-navigation/return-to";
import { getSupplierBillById } from "@/lib/supplier-bills/queries";
import { getSupplierBillPaymentSummary } from "@/lib/supplier-payments/queries";
import SupplierPaymentForm from "../SupplierPaymentForm";

export const dynamic = "force-dynamic";

export default async function NewSupplierPaymentPage({ searchParams }: { searchParams: Promise<{ billId?: string | string[]; returnTo?: string | string[] }> }) {
  const [locale, canRecord, params] = await Promise.all([getCurrentSessionEffectiveLocale(), checkPermission(SUPPLIER_PAYMENT_PERMISSIONS.record), searchParams]);
  const dictionary = getSupplierPaymentsDictionary(locale);
  if (!canRecord) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  const billId = Array.isArray(params.billId) ? params.billId[0] : params.billId;
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = safeRecordReturnTo(returnToParam, "/supplier-payments");
  if (!billId) return <StateCard title={dictionary.states.invalidBill} message={dictionary.states.invalidBill} />;
  let bill: Awaited<ReturnType<typeof getSupplierBillById>>["bill"] = null;
  let summary: Awaited<ReturnType<typeof getSupplierBillPaymentSummary>> = null;
  let state: "accessDenied" | "loadError" | null = null;
  try {
    const result = await getSupplierBillById(billId);
    bill = result.bill;
    summary = await getSupplierBillPaymentSummary(billId);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    state = error instanceof ForbiddenError ? "accessDenied" : "loadError";
  }
  if (state === "accessDenied") return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  if (state === "loadError") return <StateCard title={dictionary.states.loadError} message={dictionary.states.loadError} />;
  if (!bill || bill.status !== "approved" || !summary) return <StateCard title={dictionary.states.invalidBill} message={dictionary.states.invalidBill} />;
  const isRtl = locale === "ar";
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0">
      <PageFrame variant="form">
        <PageLocation
          breadcrumbs={{
            label: dictionary.title,
            items: [
              { label: dictionary.title, href: "/supplier-payments" },
              { label: dictionary.recordPayment, current: true },
            ],
          }}
          returnControl={<RecordBackButton href={returnTo} locale={locale} variant="labeled" label={dictionary.backToBill} />}
        />
        <PageHeader variant="composed" title={dictionary.recordPayment} />
        <SupplierPaymentForm supplierBillId={bill.id} billNumber={bill.bill_number} supplierName={bill.supplier_name} serviceNumber={bill.service_number} currency={summary.currency} outstandingAmount={summary.outstanding_amount} dictionary={dictionary} returnTo={returnTo} />
      </PageFrame>
    </div>
  );
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[40vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
