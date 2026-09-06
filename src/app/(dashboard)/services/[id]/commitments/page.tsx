import { isolateLtrText } from "@/lib/i18n/bidi";
import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { BUSINESS_DOCUMENT_PERMISSIONS, PROCUREMENT_COMMITMENT_PERMISSIONS, SERVICE_RECEIPT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getProcurementCommitmentDictionary } from "@/lib/i18n/dictionaries/procurement-commitments";
import { getActiveProcurementSupplierOptions } from "@/lib/procurement/queries";
import { getApprovedCommitmentsByServiceId, getSupplierQuotationCommitmentOptions } from "@/lib/procurement/commitment-receipt-queries";
import { getServiceByIdResult } from "@/lib/services/queries";
import { safeRecordReturnTo } from "@/lib/record-navigation/queries";
import { resolveRecordTitle } from "@/lib/i18n/record-title";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import CommitmentReceiptWorkspace from "./CommitmentReceiptWorkspace";

export const dynamic = "force-dynamic";

export default async function ServiceCommitmentsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const [{ id }, resolvedSearchParams, locale] = await Promise.all([params, searchParams, getCurrentSessionEffectiveLocale()]);
  const returnTo = safeRecordReturnTo(resolvedSearchParams.returnTo, "/services/" + id);
  const dictionary = getProcurementCommitmentDictionary(locale);
  let serviceResult: Awaited<ReturnType<typeof getServiceByIdResult>>;
  try {
    serviceResult = await getServiceByIdResult(id);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) return <StateCard title={dictionary.noPermission} message={dictionary.noPermission} />;
    throw error;
  }
  if (serviceResult.status === "not_found") notFound();
  if (serviceResult.status === "error") return <StateCard title={dictionary.loadError} message={dictionary.loadError} />;

  const [canRead, canCreateCommitment, canAmend, canTransition, canWriteReceipt, canAcceptReceipt, canCorrectReceipt, canUploadDocuments] = await Promise.all([
    checkPermission(PROCUREMENT_COMMITMENT_PERMISSIONS.read),
    checkPermission(PROCUREMENT_COMMITMENT_PERMISSIONS.write),
    checkPermission(PROCUREMENT_COMMITMENT_PERMISSIONS.amend),
    checkPermission(PROCUREMENT_COMMITMENT_PERMISSIONS.lifecycle),
    checkPermission(SERVICE_RECEIPT_PERMISSIONS.write),
    checkPermission(SERVICE_RECEIPT_PERMISSIONS.accept),
    checkPermission(SERVICE_RECEIPT_PERMISSIONS.correct),
    checkPermission(BUSINESS_DOCUMENT_PERMISSIONS.write),
  ]);
  if (!canRead) return <StateCard title={dictionary.noPermission} message={dictionary.noPermission} />;

  const [commitmentResult, supplierResult, quotationResult] = await Promise.all([
    getApprovedCommitmentsByServiceId(id),
    canCreateCommitment ? getActiveProcurementSupplierOptions() : Promise.resolve({ suppliers: [] }),
    canCreateCommitment ? getSupplierQuotationCommitmentOptions(id) : Promise.resolve({ quotations: [] }),
  ]);

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <RecordBackButton href={returnTo} locale={locale} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-on-surface-variant">
              {resolveRecordTitle(locale, serviceResult.service.serviceTitle, serviceResult.service.eventName)}
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-9 text-primary" dir="auto">
              {dictionary.title}
            </h1>
            <p className="mt-1 font-mono text-[13px] text-on-surface-variant" dir="ltr">{isolateLtrText(serviceResult.service.serviceNumber)}</p>
            <p className="mt-2 text-[14px] text-on-surface-variant">{dictionary.subtitle}</p>
          </div>
        </div>
      </div>
      <CommitmentReceiptWorkspace
        serviceId={id}
        returnTo={returnTo}
        serviceStatus={serviceResult.service.status}
        commitments={commitmentResult.commitments}
        suppliers={supplierResult.suppliers}
        quotationOptions={quotationResult.quotations}
        loadError={!!commitmentResult.error}
        canCreateCommitment={canCreateCommitment}
        canAmend={canAmend}
        canTransition={canTransition}
        canWriteReceipt={canWriteReceipt}
        canAcceptReceipt={canAcceptReceipt}
        canCorrectReceipt={canCorrectReceipt}
        canUploadDocuments={canUploadDocuments}
        dictionary={dictionary}
      />
    </div>
  );
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[50vh] flex-col items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
