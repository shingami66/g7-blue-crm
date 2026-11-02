import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_BILL_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierBillsDictionary } from "@/lib/i18n/dictionaries/supplier-bills";
import { getSupplierBillFormOptions } from "@/lib/supplier-bills/queries";
import PageLocation from "@/components/navigation/PageLocation";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import { safeRecordReturnTo } from "@/lib/record-navigation/return-to";
import SupplierBillForm from "../SupplierBillForm";

export const dynamic = "force-dynamic";

export default async function NewSupplierBillPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const params = await searchParams;
  const returnToParam = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = safeRecordReturnTo(returnToParam, "/supplier-bills");
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
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="w-full min-w-0">
      <PageFrame variant="form">
        <PageLocation
          breadcrumbs={{
            label: dictionary.title,
            items: [
              { label: dictionary.title, href: "/supplier-bills" },
              { label: dictionary.newBill, current: true },
            ],
          }}
          returnControl={<RecordBackButton href={returnTo} locale={locale} variant="labeled" label={dictionary.backToList} />}
        />
        <PageHeader variant="composed" title={dictionary.newBill} />
        {options.commitments.length === 0 || options.receipts.length === 0 ? (
          <StateCard title={dictionary.states.noOptions} message={dictionary.notices.approvalGate} />
        ) : (
          <SupplierBillForm options={options} dictionary={dictionary} />
        )}
      </PageFrame>
    </div>
  );
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[40vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
