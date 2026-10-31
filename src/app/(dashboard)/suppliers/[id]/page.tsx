import { Suspense, type ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { Building2, FileText, Landmark, MapPin, Pencil, ShieldAlert, UserRound } from "lucide-react";
import PageFrame from "@/components/ui/PageFrame";
import PageLocation from "@/components/navigation/PageLocation";
import RecordBackButton from "@/components/navigation/RecordBackButton";
import PageHeader from "@/components/ui/PageHeader";
import RecordNavigationRegion from "@/components/records/RecordNavigationRegion";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { formatUiDate } from "@/lib/i18n/formatting";
import { formatSupplierCopy, getSupplierCategoryLabel, getSupplierStatusLabel, getSupplierTypeLabel, getSupplierVatRegistrationLabel, getSuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierById } from "@/lib/suppliers/queries";
import SupplierBlacklistActions from "../SupplierBlacklistActions";
import SupplierRateCardsList from "../SupplierRateCardsList";
import SupplierDeleteRestoreActions from "./SupplierDeleteRestoreActions";
import RecordNavigationSlot from "@/components/records/RecordNavigationSlot";
import { RecordNavigationPlaceholder } from "@/components/records/RecordNavigation";
import { getRecordNavigationDictionary } from "@/lib/i18n/dictionaries/record-navigation";
import { getSupplierRecordNavigation, safeRecordReturnTo, appendReturnTo } from "@/lib/record-navigation/queries";

const statusVariants = { active: "active", on_hold: "pending", blacklisted: "draft", inactive: "inactive" } as const;

export const dynamic = "force-dynamic";

export default async function SupplierDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ showDeleted?: string; returnTo?: string }> }) {
  const [{ id }, resolvedSearchParams, locale] = await Promise.all([params, searchParams, getCurrentSessionEffectiveLocale()]);
  const { showDeleted } = resolvedSearchParams;
  const dictionary = getSuppliersDictionary(locale);
  const includeDeleted = showDeleted === "true";
  const data = await loadSupplierDetail(id, includeDeleted);

  if (data.kind === "unauthorized") redirect("/sign-in");
  if (data.kind === "forbidden") return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.detailForbidden} />;
  if (data.kind === "error") return <StateCard title={dictionary.states.genericError} message={dictionary.states.detailLoadError} />;
  if (data.kind === "not_found") notFound();

  const { supplier, canEdit, canDelete, canViewCosting, canManageCosting } = data;
  const isDeleted = supplier.isDeleted;
  const returnTo = safeRecordReturnTo(resolvedSearchParams.returnTo, isDeleted ? "/suppliers?showDeleted=true" : "/suppliers");
  const currentSupplierUrl = resolvedSearchParams.returnTo
    ? appendReturnTo(`/suppliers/${supplier.id}${isDeleted ? "?showDeleted=true" : ""}`, returnTo)
    : `/suppliers/${supplier.id}${isDeleted ? "?showDeleted=true" : ""}`;
  const recordNavigationDictionary = getRecordNavigationDictionary(locale);

  return <PageFrame variant="record">
      <PageLocation
        breadcrumbs={{ label: dictionary.detail.locationLabel, items: [
          { label: dictionary.list.title, href: "/suppliers" },
          { label: supplier.name, current: true },
        ] }}
        returnControl={<RecordBackButton href={returnTo} locale={locale} variant="labeled" label={dictionary.detail.backToSuppliers} />}
      />
      <PageHeader
        variant="composed"
        title={supplier.name}
        subtitle={dictionary.detail.subtitle}
        identifier={supplier.supplierNumber ? <bdi dir="ltr">{supplier.supplierNumber}</bdi> : undefined}
        status={<div className="flex min-w-0 flex-wrap items-center gap-2"><StatusBadge variant={statusVariants[supplier.status]}>{getSupplierStatusLabel(locale, supplier.status)}</StatusBadge>{isDeleted && <span className="rounded bg-error-container px-2 py-1 text-[12px] font-semibold text-error">{dictionary.detail.deleted}</span>}</div>}
        actions={{
          label: dictionary.detail.actionsLabel,
          primary: isDeleted
            ? canDelete && <SupplierDeleteRestoreActions supplierId={supplier.id} supplierName={supplier.name} isDeleted={isDeleted} dictionary={dictionary.deleteRestore} />
            : canEdit && <Button asChild size="sm"><PendingLink href={appendReturnTo(`/suppliers/${supplier.id}/edit`, currentSupplierUrl)}><Pencil size={15} aria-hidden="true" />{dictionary.detail.edit}</PendingLink></Button>,
          overflow: !isDeleted && (canEdit || canDelete) ? <div role="group" aria-label={dictionary.detail.secondaryActionsLabel} className="flex min-w-0 max-w-full flex-wrap items-center gap-2 border-s border-outline-variant ps-3">
            {canEdit && <SupplierBlacklistActions supplier={supplier} dictionary={dictionary.blacklist} />}
            {canDelete && <SupplierDeleteRestoreActions supplierId={supplier.id} supplierName={supplier.name} isDeleted={isDeleted} dictionary={dictionary.deleteRestore} />}
          </div> : undefined,
        }}
      />
      <RecordNavigationRegion label={recordNavigationDictionary.title}>
        <Suspense fallback={<RecordNavigationPlaceholder recordType={dictionary.list.title} dictionary={recordNavigationDictionary} state="loading" />}>
          <RecordNavigationSlot loadNavigation={() => getSupplierRecordNavigation(id, { isPreferred: supplier.isPreferred, name: supplier.name }, includeDeleted)} basePath="/suppliers" recordType={dictionary.list.title} dictionary={recordNavigationDictionary} returnTo={returnTo} recordQuery={includeDeleted ? { showDeleted: "true" } : undefined} pendingLabel={dictionary.list.openingSupplier} />
        </Suspense>
      </RecordNavigationRegion>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><DetailCard title={dictionary.detail.contactInformation} icon={<UserRound size={18} />}><DetailValue label={dictionary.detail.contactName} value={supplier.contactName} /><DetailValue label={dictionary.detail.phone} value={supplier.phone} ltr /><DetailValue label={dictionary.detail.whatsappPhone} value={supplier.whatsappPhone} ltr /><DetailValue label={dictionary.detail.email} value={supplier.email} ltr /></DetailCard><DetailCard title={dictionary.detail.address} icon={<MapPin size={18} />}><DetailValue label={dictionary.detail.city} value={supplier.city} /><DetailValue label={dictionary.detail.country} value={supplier.country} /><DetailValue label={dictionary.detail.coverageArea} value={supplier.coverageArea} /></DetailCard><DetailCard title={dictionary.detail.directoryDetails} icon={<Building2 size={18} />}><DetailValue label={dictionary.detail.supplierType} value={supplier.supplierType ? getSupplierTypeLabel(locale, supplier.supplierType) : null} /><DetailValue label={dictionary.detail.category} value={getSupplierCategoryLabel(locale, supplier.category)} /><DetailValue label={dictionary.detail.status} value={getSupplierStatusLabel(locale, supplier.status)} /><DetailValue label={dictionary.detail.preferred} value={supplier.isPreferred ? dictionary.detail.yes : dictionary.detail.no} /></DetailCard>{supplier.canViewSensitive && <DetailCard title={dictionary.detail.taxIdentity} icon={<Building2 size={18} />}><DetailValue label={dictionary.detail.legalName} value={supplier.legalName} /><DetailValue label={dictionary.detail.crNumber} value={supplier.crNumber} ltr /><DetailValue label={dictionary.detail.vatRegistration} value={getSupplierVatRegistrationLabel(locale, supplier.vatRegistrationStatus)} /><DetailValue label={dictionary.detail.vatNumber} value={supplier.vatNumber} ltr /></DetailCard>}</div>
      {supplier.canViewSensitive && <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><DetailCard title={dictionary.detail.internalDetails} icon={<UserRound size={18} />}><DetailValue label={dictionary.detail.paymentTerms} value={supplier.paymentTerms} /><DetailValue label={dictionary.detail.notes} value={supplier.notes} /></DetailCard>{supplier.status === "blacklisted" && <DetailCard title={dictionary.detail.blacklistDetails} icon={<ShieldAlert size={18} />}><DetailValue label={dictionary.detail.blacklistReason} value={supplier.blacklistedReason} /><DetailValue label={dictionary.detail.blacklistedOn} value={supplier.blacklistedAt ? formatSupplierCopy(dictionary.detail.blacklistedOn, { date: formatUiDate(locale, supplier.blacklistedAt) }) : null} /></DetailCard>}</div>}
      {supplier.canReadBank && <DetailCard title={dictionary.detail.bankDetails} icon={<Landmark size={18} />}><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><DetailValue label={dictionary.detail.bankName} value={supplier.bankName} /><DetailValue label={dictionary.detail.bankAccountName} value={supplier.bankAccountName} /><DetailValue label={dictionary.detail.iban} value={supplier.iban} ltr /></div>{!supplier.bankName && !supplier.bankAccountName && !supplier.iban && <p className="text-[14px] text-on-surface-variant">{dictionary.detail.noBankDetails}</p>}</DetailCard>}
        {canViewCosting && <DetailCard title={dictionary.quotationHistory.title} icon={<FileText size={18} />}><p className="-mt-2 text-[13px] text-on-surface-variant">{dictionary.quotationHistory.subtitle}</p><PendingLink href={appendReturnTo(`/suppliers/${supplier.id}/quotations${isDeleted ? "?showDeleted=true" : ""}`, currentSupplierUrl)} className="inline-flex min-h-9 items-center self-start rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-[13px] font-semibold text-primary hover:bg-surface-container-low">{dictionary.quotationHistory.openWorkspace}</PendingLink></DetailCard>}
      {canViewCosting && !isDeleted && <DetailCard title={dictionary.detail.rateCards} icon={<Landmark size={18} />}><SupplierRateCardsList supplierId={supplier.id} dictionary={dictionary.rateCards} locale={locale} canManage={canManageCosting} /></DetailCard>}
    </PageFrame>;
}

async function loadSupplierDetail(id: string, includeDeleted: boolean) {
  try {
    const [result, canEdit, canDelete, canViewCosting, canManageCosting] = await Promise.all([
      getSupplierById(id, { includeDeleted }),
      checkPermission("suppliers:write"),
      checkPermission("suppliers:delete"),
      checkPermission("supplier_costing:read"),
      checkPermission("supplier_costing:write"),
    ]);
    if (result.error) return { kind: "error" as const };
    if (!result.supplier) return { kind: "not_found" as const };
    return { kind: "ready" as const, supplier: result.supplier, canEdit, canDelete, canViewCosting, canManageCosting };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { kind: "unauthorized" as const };
    if (err instanceof ForbiddenError) return { kind: "forbidden" as const };
    return { kind: "error" as const };
  }
}

function DetailCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="flex flex-col gap-4 rounded-lg border border-surface-variant bg-surface-container-lowest p-6"><h2 className="flex items-center gap-2 border-b border-surface-variant pb-3 text-[16px] font-semibold text-primary">{icon}{title}</h2>{children}</section>;
}

function DetailValue({ label, value, ltr = false }: { label: string; value: string | null; ltr?: boolean }) {
  return <div className="flex flex-col gap-1"><span className="text-[12px] font-semibold text-on-surface-variant">{label}</span><span className="break-words text-[14px] text-on-surface" dir={ltr ? "ltr" : "auto"}>{value ?? "—"}</span></div>;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center px-4"><div className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm"><h2 className="mb-2 text-xl font-semibold text-slate-900">{title}</h2><p className="text-sm text-slate-500">{message}</p></div></div>;
}
