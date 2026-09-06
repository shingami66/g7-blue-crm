import { FileText, Plus } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import PendingLink from "@/components/ui/PendingLink";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { getSuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierQuotationHistoryBySupplierId } from "@/lib/procurement/queries";
import { getSupplierById } from "@/lib/suppliers/queries";
import { safeRecordReturnTo, appendReturnTo } from "@/lib/record-navigation/queries";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import SupplierQuotationHistory from "../SupplierQuotationHistory";

export const dynamic = "force-dynamic";

export default async function SupplierQuotationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ showDeleted?: string; returnTo?: string }>;
}) {
  const [{ id }, resolvedSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getCurrentSessionEffectiveLocale(),
  ]);
  const dictionary = getSuppliersDictionary(locale);
  const data = await loadSupplierQuotationHistory(
    id,
    resolvedSearchParams.showDeleted === "true",
  );

  if (data.kind === "unauthorized") redirect("/sign-in");
  if (data.kind === "forbidden") {
    return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.detailForbidden} />;
  }
  if (data.kind === "error") {
    return <StateCard title={dictionary.states.genericError} message={dictionary.states.detailLoadError} />;
  }
  if (data.kind === "not_found") notFound();

  const { supplier, quotationHistoryResult } = data;
  const isDeleted = supplier.isDeleted;
  const returnTo = safeRecordReturnTo(
    resolvedSearchParams.returnTo,
    isDeleted ? `/suppliers/${supplier.id}?showDeleted=true` : `/suppliers/${supplier.id}`,
  );
  const currentHistoryUrl = resolvedSearchParams.returnTo
    ? appendReturnTo(`/suppliers/${supplier.id}/quotations${isDeleted ? "?showDeleted=true" : ""}`, returnTo)
    : `/suppliers/${supplier.id}/quotations${isDeleted ? "?showDeleted=true" : ""}`;
  const canCreate = data.canManageCosting && !isDeleted && supplier.status === "active";

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <RecordBackButton href={returnTo} locale={locale} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-on-surface-variant">{dictionary.quotationHistory.title}</p>
            <h1 className="mt-1 break-words text-[28px] font-semibold leading-[36px] text-primary" dir="auto">
              {supplier.name}
            </h1>
            {supplier.supplierNumber && <p className="mt-1 text-[13px] text-on-surface-variant" dir="ltr">{supplier.supplierNumber}</p>}
          </div>
        </div>
        {canCreate && (
          <PendingLink
            href={appendReturnTo(`/suppliers/${supplier.id}/quotations/new`, currentHistoryUrl)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary-fixed focus-visible:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" />
            {dictionary.quotationHistory.addQuotation}
          </PendingLink>
        )}
      </div>

      <section className="overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest">
        <div className="flex items-start gap-3 border-b border-surface-variant bg-surface-bright px-5 py-4">
          <FileText className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
          <div>
            <h2 className="text-[18px] font-semibold text-primary">{dictionary.quotationHistory.title}</h2>
            <p className="mt-1 max-w-3xl text-[14px] text-on-surface-variant">{dictionary.quotationHistory.subtitle}</p>
          </div>
        </div>
        <div className="p-5">
          <SupplierQuotationHistory
            supplierId={supplier.id}
            supplierIsDeleted={isDeleted}
            locale={locale}
            currentHistoryUrl={currentHistoryUrl}
            quotations={quotationHistoryResult.quotations}
            documentsAccessible={data.canReadDocuments}
            loadError={!!quotationHistoryResult.error}
            dictionary={dictionary.quotationHistory}
          />
        </div>
      </section>
    </div>
  );
}

async function loadSupplierQuotationHistory(id: string, includeDeleted: boolean) {
  try {
    const [result, canViewCosting, canManageCosting, canReadDocuments] = await Promise.all([
      getSupplierById(id, { includeDeleted }),
      checkPermission("supplier_costing:read"),
      checkPermission("supplier_costing:write"),
      checkPermission("documents:read"),
    ]);

    if (result.error) return { kind: "error" as const };
    if (!result.supplier) return { kind: "not_found" as const };
    if (!canViewCosting) return { kind: "forbidden" as const };

    const quotationHistoryResult = await getSupplierQuotationHistoryBySupplierId(id, {
      includeDocuments: canReadDocuments,
    });

    return {
      kind: "ready" as const,
      supplier: result.supplier,
      canManageCosting,
      canReadDocuments,
      quotationHistoryResult,
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
