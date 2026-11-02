import { redirect, notFound } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { getSupplierById } from "@/lib/suppliers/queries";
import SupplierEditForm from "./SupplierEditForm";
import PageLocation from "@/components/navigation/PageLocation";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import { appendReturnTo, safeRecordReturnTo } from "@/lib/record-navigation/return-to";

export const dynamic = "force-dynamic";

export default async function EditSupplierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const returnTo = safeRecordReturnTo((await searchParams).returnTo, `/suppliers/${id}`);
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getSuppliersDictionary(locale);

  try {
    await requirePermission("suppliers:write");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }
    if (err instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {dictionary.states.accessDenied}
            </h2>
            <p className="text-sm text-slate-500">{dictionary.states.editForbidden}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {dictionary.states.genericError}
          </h2>
          <p className="text-sm text-slate-500">{dictionary.states.editLoadError}</p>
        </div>
      </div>
    );
  }

  const result = await getSupplierById(id);

  if (result.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {dictionary.states.genericError}
          </h2>
          <p className="text-sm text-slate-500">{dictionary.states.editLoadError}</p>
        </div>
      </div>
    );
  }

  if (!result.supplier) {
    notFound();
  }

  const canManageBankDetails = await checkPermission("suppliers:write_bank");
  const supplierDetailHref = returnTo === `/suppliers/${id}` || returnTo.startsWith(`/suppliers/${id}?`)
    ? returnTo
    : appendReturnTo(`/suppliers/${id}`, returnTo);

  return (
    <PageFrame variant="form">
      <PageLocation
        breadcrumbs={{
          label: dictionary.detail.locationLabel,
          items: [
            { label: dictionary.list.title, href: "/suppliers" },
            { label: result.supplier.name, href: supplierDetailHref, dir: "auto" },
            { label: dictionary.form.editTitle, current: true },
          ],
        }}
        returnControl={<RecordBackButton href={returnTo} locale={locale} variant="labeled" label={dictionary.form.backToSupplier} />}
      />
      <PageHeader variant="composed" title={dictionary.form.editTitle} subtitle={dictionary.form.editSubtitle} />
      <SupplierEditForm supplier={result.supplier} dictionary={dictionary} canManageBankDetails={canManageBankDetails} returnTo={returnTo} />
    </PageFrame>
  );
}
