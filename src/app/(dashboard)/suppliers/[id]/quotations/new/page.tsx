import { FilePlus2 } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { getSuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import {
  getEligibleServicesForSupplierQuotation,
  getPackageRequirementsForQuotation,
  getSupplierQuotationRequirementOptions,
} from "@/lib/procurement/queries";
import { getProcurementPackageById } from "@/lib/procurement/package-queries";
import { validatePackageQuotationContext } from "@/lib/procurement/package-context";
import { getSupplierById } from "@/lib/suppliers/queries";
import { safeRecordReturnTo } from "@/lib/record-navigation/queries";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import SupplierQuotationForm from "../SupplierQuotationForm";

export const dynamic = "force-dynamic";

export default async function NewSupplierQuotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    returnTo?: string;
    showDeleted?: string;
    serviceId?: string;
    packageId?: string;
  }>;
}) {
  const [{ id }, resolvedSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getCurrentSessionEffectiveLocale(),
  ]);
  const dictionary = getSuppliersDictionary(locale);
  const data = await loadNewSupplierQuotation(id, resolvedSearchParams.showDeleted === "true");

  if (data.kind === "unauthorized") redirect("/sign-in");
  if (data.kind === "forbidden") {
    return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.detailForbidden} />;
  }
  if (data.kind === "error") {
    return <StateCard title={dictionary.states.genericError} message={dictionary.states.detailLoadError} />;
  }
  if (data.kind === "not_found") notFound();
  if (!data.canManageCosting) {
    return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.detailForbidden} />;
  }
  if (data.supplier.isDeleted || data.supplier.status !== "active") {
    return <StateCard title={dictionary.quotationHistory.newTitle} message={dictionary.quotationHistory.createUnavailable} />;
  }

  const returnTo = safeRecordReturnTo(
    resolvedSearchParams.returnTo,
    `/suppliers/${data.supplier.id}/quotations`,
  );

  // Validate contextual service eligibility if serviceId is provided in URL
  if (resolvedSearchParams.serviceId) {
    const isServiceEligible = data.eligibleServices.some(
      (s) => s.serviceId === resolvedSearchParams.serviceId,
    );
    if (!isServiceEligible) {
      return (
        <div dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-12">
          <div className="flex items-start gap-3 py-4">
            <RecordBackButton href={returnTo} locale={locale} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-on-surface-variant">{data.supplier.name}</p>
              <h1 className="mt-1 break-words text-[28px] font-semibold leading-[36px] text-primary" dir="auto">
                {dictionary.quotationHistory.newTitle}
              </h1>
            </div>
          </div>
          <StateCard
            title={dictionary.quotationHistory.serviceSelection}
            message={dictionary.quotationHistory.serviceUnavailable}
          />
        </div>
      );
    }
  }

  const contextualService = resolvedSearchParams.serviceId
    ? data.eligibleServices.find((s) => s.serviceId === resolvedSearchParams.serviceId) ?? null
    : null;

  // Validate Package context against route Supplier, Service, and selected status
  let packageContext: { packageId: string; packageTitle: string } | null = null;
  let packageRequirements: Array<{ id: string; title: string; sortOrder: number }> = [];

  if (resolvedSearchParams.packageId && contextualService) {
    const packageDetailResult = await getProcurementPackageById(resolvedSearchParams.packageId);
    const validation = validatePackageQuotationContext(packageDetailResult.package, {
      packageId: resolvedSearchParams.packageId,
      serviceId: contextualService.serviceId,
      supplierId: data.supplier.id,
    });

    if (validation.isValid && validation.packageContext) {
      packageContext = validation.packageContext;
      packageRequirements = await getPackageRequirementsForQuotation(
        validation.packageContext.packageId,
        contextualService.serviceId,
      );
    }
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-12">
      <div className="flex items-start gap-3 py-4">
        <RecordBackButton href={returnTo} locale={locale} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-on-surface-variant">{data.supplier.name}</p>
          <h1 className="mt-1 break-words text-[28px] font-semibold leading-[36px] text-primary" dir="auto">
            {dictionary.quotationHistory.newTitle}
          </h1>
          <p className="mt-1 max-w-2xl text-[14px] text-on-surface-variant">{dictionary.quotationHistory.newSubtitle}</p>
        </div>
      </div>

      <section className="rounded-lg border border-surface-variant bg-surface-container-lowest p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3 border-b border-surface-variant pb-4">
          <FilePlus2 className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
          <div>
            <h2 className="text-[16px] font-semibold text-primary">{dictionary.quotationHistory.recordTitle}</h2>
            <p className="mt-1 text-[13px] text-on-surface-variant">{dictionary.quotationHistory.subtitle}</p>
          </div>
        </div>
        <SupplierQuotationForm
          locale={locale}
          supplierId={data.supplier.id}
          requirements={data.requirementsResult.requirements}
          requirementsLoadError={!!data.requirementsResult.error}
          canWriteDocuments={data.canWriteDocuments}
          returnTo={returnTo}
          dictionary={dictionary.quotationHistory}
          contextualService={contextualService}
          packageRequirements={packageRequirements}
          eligibleServices={data.eligibleServices}
          packageContext={packageContext}
        />
      </section>
    </div>
  );
}

async function loadNewSupplierQuotation(id: string, includeDeleted: boolean) {
  try {
    const [supplierResult, canManageCosting, canWriteDocuments] = await Promise.all([
      getSupplierById(id, { includeDeleted }),
      checkPermission("supplier_costing:write"),
      checkPermission("documents:write"),
    ]);

    if (supplierResult.error) return { kind: "error" as const };
    if (!supplierResult.supplier) return { kind: "not_found" as const };

    const [requirementsResult, eligibleServicesResult] = await Promise.all([
      canManageCosting && !supplierResult.supplier.isDeleted && supplierResult.supplier.status === "active"
        ? await getSupplierQuotationRequirementOptions(id)
        : { requirements: [] },
      canManageCosting && !supplierResult.supplier.isDeleted && supplierResult.supplier.status === "active"
        ? await getEligibleServicesForSupplierQuotation()
        : { services: [] },
    ]);

    return {
      kind: "ready" as const,
      supplier: supplierResult.supplier,
      canManageCosting,
      canWriteDocuments,
      requirementsResult,
      eligibleServices: eligibleServicesResult.services,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { kind: "unauthorized" as const };
    if (err instanceof ForbiddenError) return { kind: "forbidden" as const };
    return { kind: "error" as const };
  }
}

function StateCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md border border-surface-variant bg-surface-container-lowest p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-primary">{title}</h2>
        <p className="text-sm text-on-surface-variant">{message}</p>
      </div>
    </div>
  );
}
