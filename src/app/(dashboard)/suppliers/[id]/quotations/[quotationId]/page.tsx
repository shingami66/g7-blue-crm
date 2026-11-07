import { FileText } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { getSuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierQuotationById } from "@/lib/procurement/queries";
import { getSupplierById } from "@/lib/suppliers/queries";
import { safeRecordReturnTo } from "@/lib/record-navigation/queries";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import SupplierQuotationErrorState from "../SupplierQuotationErrorState";
import SupplierQuotationDetail from "../SupplierQuotationDetail";

export const dynamic = "force-dynamic";

export default async function SupplierQuotationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; quotationId: string }>;
  searchParams: Promise<{ returnTo?: string; showDeleted?: string }>;
}) {
  const [{ id, quotationId }, resolvedSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getCurrentSessionEffectiveLocale(),
  ]);
  const dictionary = getSuppliersDictionary(locale);
  const renderFailure = (errorTitle: string, message: string, role: "alert" | "status") => (
    <SupplierQuotationErrorState
      frameVariant="record"
      locale={locale}
      pageTitle={dictionary.quotationHistory.detailTitle}
      errorTitle={errorTitle}
      message={message}
      role={role}
      returnHref="/suppliers"
      returnLabel={dictionary.detail.backToSuppliers}
    />
  );
  const data = await loadSupplierQuotationDetail(
    id,
    quotationId,
    resolvedSearchParams.showDeleted === "true",
  );

  if (data.kind === "unauthorized") redirect("/sign-in");
  if (data.kind === "forbidden") {
    return renderFailure(dictionary.states.accessDenied, dictionary.states.detailForbidden, "status");
  }
  if (data.kind === "error") {
    return renderFailure(dictionary.states.genericError, dictionary.states.detailLoadError, "alert");
  }
  if (data.kind === "not_found") notFound();

  const returnTo = safeRecordReturnTo(
    resolvedSearchParams.returnTo,
    `/suppliers/${data.supplier.id}/quotations${data.supplier.isDeleted ? "?showDeleted=true" : ""}`,
  );

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-12">
      <div className="flex items-start gap-3 py-4">
        <RecordBackButton href={returnTo} locale={locale} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-on-surface-variant">
            <FileText size={16} className="text-primary" aria-hidden="true" />
            {dictionary.quotationHistory.detailTitle}
          </p>
          <h1 className="mt-1 break-words text-[28px] font-semibold leading-[36px] text-primary" dir="auto">
            {data.supplier.name}
          </h1>
          <p className="mt-1 max-w-2xl text-[14px] text-on-surface-variant">{dictionary.quotationHistory.detailSubtitle}</p>
        </div>
      </div>

      <SupplierQuotationDetail
        quotation={data.quotation}
        supplierName={data.supplier.name}
        locale={locale}
        returnTo={returnTo}
        documentsAccessible={data.canReadDocuments}
        dictionary={dictionary.quotationHistory}
      />
    </div>
  );
}

async function loadSupplierQuotationDetail(
  supplierId: string,
  quotationId: string,
  includeDeleted: boolean,
) {
  try {
    const canReadCosting = await checkPermission("supplier_costing:read");
    if (!canReadCosting) return { kind: "forbidden" as const };

    const canReadDocuments = await checkPermission("documents:read");
    const quotationResult = await getSupplierQuotationById(quotationId, {
      includeDocuments: canReadDocuments,
    });

    if (quotationResult.error) return { kind: "error" as const };
    if (!quotationResult.quotation || quotationResult.quotation.supplierId !== supplierId) {
      return { kind: "not_found" as const };
    }

    const supplierResult = await getSupplierById(supplierId, { includeDeleted });
    if (supplierResult.error) return { kind: "error" as const };
    if (!supplierResult.supplier) return { kind: "not_found" as const };

    return {
      kind: "ready" as const,
      quotation: quotationResult.quotation,
      supplier: supplierResult.supplier,
      canReadDocuments,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { kind: "unauthorized" as const };
    if (err instanceof ForbiddenError) return { kind: "forbidden" as const };
    return { kind: "error" as const };
  }
}
