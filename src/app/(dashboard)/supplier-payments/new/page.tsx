import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierPaymentsDictionary } from "@/lib/i18n/dictionaries/supplier-payments";
import { getSupplierBillById } from "@/lib/supplier-bills/queries";
import { getSupplierBillPaymentSummary } from "@/lib/supplier-payments/queries";
import PendingLink from "@/components/ui/PendingLink";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SupplierPaymentForm from "../SupplierPaymentForm";

export const dynamic = "force-dynamic";

export default async function NewSupplierPaymentPage({ searchParams }: { searchParams: Promise<{ billId?: string | string[] }> }) {
  const [locale, canRecord, params] = await Promise.all([getCurrentSessionEffectiveLocale(), checkPermission(SUPPLIER_PAYMENT_PERMISSIONS.record), searchParams]);
  const dictionary = getSupplierPaymentsDictionary(locale);
  if (!canRecord) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  const billId = Array.isArray(params.billId) ? params.billId[0] : params.billId;
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
  return <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5 pb-12"><div><PendingLink href={`/supplier-bills/${bill.id}`} pendingLabel={dictionary.backToList} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-[12px] font-semibold text-primary hover:bg-surface-container-low hover:underline">{isRtl ? <ArrowRight size={16} aria-hidden="true" /> : <ArrowLeft size={16} aria-hidden="true" />}<span>{dictionary.backToList}</span></PendingLink><h1 className="mt-3 text-[26px] font-semibold text-primary">{dictionary.recordPayment}</h1></div><SupplierPaymentForm supplierBillId={bill.id} billNumber={bill.bill_number} supplierName={bill.supplier_name} serviceNumber={bill.service_number} currency={summary.currency} outstandingAmount={summary.outstanding_amount} dictionary={dictionary} /></div>;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[40vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
