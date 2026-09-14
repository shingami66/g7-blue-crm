import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_BILL_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierBillsDictionary } from "@/lib/i18n/dictionaries/supplier-bills";
import { getSupplierBillFormOptions } from "@/lib/supplier-bills/queries";
import PendingLink from "@/components/ui/PendingLink";
import { ArrowLeft, ArrowRight } from "lucide-react";
import SupplierBillForm from "../SupplierBillForm";

export const dynamic = "force-dynamic";

export default async function NewSupplierBillPage() {
  const [locale, canRecord] = await Promise.all([getCurrentSessionEffectiveLocale(), checkPermission(SUPPLIER_BILL_PERMISSIONS.record)]);
  const dictionary = getSupplierBillsDictionary(locale);
  if (!canRecord) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  let options: Awaited<ReturnType<typeof getSupplierBillFormOptions>> | null = null;
  let state: "accessDenied" | "loadError" | null = null;
  try {
    options = await getSupplierBillFormOptions();
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    state = error instanceof ForbiddenError ? "accessDenied" : "loadError";
  }
  if (state === "accessDenied") return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  if (state === "loadError" || !options) return <StateCard title={dictionary.states.loadError} message={dictionary.states.loadError} />;
  const isRtl = locale === "ar";
  return <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-5 pb-12"><div><PendingLink href="/supplier-bills" pendingLabel={dictionary.backToList} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-[12px] font-semibold text-primary hover:bg-surface-container-low hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{isRtl ? <ArrowRight size={16} aria-hidden="true" /> : <ArrowLeft size={16} aria-hidden="true" />}<span>{dictionary.backToList}</span></PendingLink><h1 className="mt-3 text-[26px] font-semibold text-primary">{dictionary.newBill}</h1><p className="mt-1 text-[14px] text-on-surface-variant">{dictionary.forms.eventOnlyNotice}</p></div>{options.commitments.length === 0 || options.receipts.length === 0 ? <StateCard title={dictionary.states.noOptions} message={dictionary.notices.approvalGate} /> : <SupplierBillForm options={options} dictionary={dictionary} />}</div>;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[40vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
