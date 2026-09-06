import Link from "next/link";
import { isolateLtrText } from "@/lib/i18n/bidi";
import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { PROCUREMENT_COMMITMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { getActiveProcurementSupplierOptions } from "@/lib/procurement/queries";
import {
  getProcurementPackagesByServiceId,
  getSupplierQuotationsByServiceId,
} from "@/lib/procurement/package-queries";
import { getServiceByIdResult } from "@/lib/services/queries";
import { safeRecordReturnTo, appendReturnTo } from "@/lib/record-navigation/queries";
import { resolveRecordTitle } from "@/lib/i18n/record-title";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import ProcurementPackageWorkspace from "./ProcurementPackageWorkspace";

export const dynamic = "force-dynamic";

export default async function ServiceProcurementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ id }, resolvedSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getCurrentSessionEffectiveLocale(),
  ]);
  const dictionary = getServicesDictionary(locale);
  const returnTo = safeRecordReturnTo(resolvedSearchParams.returnTo, `/services/${id}`);
  const currentProcurementUrl = resolvedSearchParams.returnTo
    ? appendReturnTo(`/services/${id}/procurement`, returnTo)
    : `/services/${id}/procurement`;

  try {
    await requirePermission("services:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) {
      return (
        <StateCard
          title={dictionary.states.accessDenied}
          message={dictionary.states.serviceReadForbidden}
        />
      );
    }
    throw error;
  }

  const serviceResult = await getServiceByIdResult(id);
  if (serviceResult.status === "not_found") notFound();
  if (serviceResult.status === "error") {
    return (
      <StateCard
        title={dictionary.states.genericError}
        message={dictionary.states.serviceDataLoadError}
      />
    );
  }

  const [canRead, canWrite, canReadCommitments] = await Promise.all([
    checkPermission("supplier_costing:read"),
    checkPermission("supplier_costing:write"),
    checkPermission(PROCUREMENT_COMMITMENT_PERMISSIONS.read),
  ]);
  if (!canRead) {
    return (
      <StateCard
        title={dictionary.states.accessDenied}
        message={dictionary.states.serviceReadForbidden}
      />
    );
  }

  const [packagesResult, supplierResult, quotationsResult] = await Promise.all([
    getProcurementPackagesByServiceId(id),
    canWrite ? getActiveProcurementSupplierOptions() : Promise.resolve({ suppliers: [] }),
    getSupplierQuotationsByServiceId(id),
  ]);

  if (packagesResult.error) {
    return (
      <StateCard
        title={dictionary.states.genericError}
        message={dictionary.states.serviceDataLoadError}
      />
    );
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <RecordBackButton href={returnTo} locale={locale} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-on-surface-variant">
              {resolveRecordTitle(locale, serviceResult.service.serviceTitle, serviceResult.service.eventName)}
            </p>
            <h1 className="mt-1 break-words text-[26px] font-semibold leading-8 text-primary" dir="auto">
              {dictionary.procurementWorkspace.title}
            </h1>
            <p className="mt-1 font-mono text-[13px] text-on-surface-variant" dir="ltr">
              {isolateLtrText(serviceResult.service.serviceNumber)}
            </p>
            <p className="mt-2 text-[14px] text-on-surface-variant">
              {dictionary.procurementWorkspace.subtitle}
            </p>
          </div>
        </div>
        {canReadCommitments && (
          <Link
            href={appendReturnTo(`/services/${id}/commitments`, currentProcurementUrl)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2 text-[13px] font-semibold text-on-surface hover:bg-surface-container-low"
          >
            {dictionary.procurementWorkspace.openCommitments}
          </Link>
        )}
      </div>

      <ProcurementPackageWorkspace
        serviceId={id}
        serviceNumber={serviceResult.service.serviceNumber}
        serviceStatus={serviceResult.service.status}
        packages={packagesResult.packages}
        suppliers={"suppliers" in supplierResult ? supplierResult.suppliers : []}
        quotations={quotationsResult.quotations}
        canWrite={canWrite}
        returnTo={returnTo}
        locale={locale}
        dictionary={dictionary.procurementWorkspace}
      />
    </div>
  );
}

function StateCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center">
        <h2 className="text-xl font-semibold text-primary">{title}</h2>
        <p className="mt-2 text-sm text-on-surface-variant">{message}</p>
      </div>
    </div>
  );
}
