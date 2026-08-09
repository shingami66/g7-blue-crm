import { type ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2, Landmark, MapPin, Pencil, ShieldAlert, UserRound } from "lucide-react";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { formatUiDate } from "@/lib/i18n/formatting";
import { formatSupplierCopy, getSupplierCategoryLabel, getSupplierStatusLabel, getSupplierTypeLabel, getSupplierVatRegistrationLabel, getSuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierById } from "@/lib/suppliers/queries";
import SupplierBlacklistActions from "../SupplierBlacklistActions";
import SupplierRateCardsList from "../SupplierRateCardsList";
import SupplierDeleteRestoreActions from "./SupplierDeleteRestoreActions";
import RecordNavigation from "@/components/records/RecordNavigation";
import { getRecordNavigationDictionary } from "@/lib/i18n/dictionaries/record-navigation";
import { getSupplierRecordNavigation, safeRecordReturnTo } from "@/lib/record-navigation/queries";

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
  const recordNavigation = await getSupplierRecordNavigation(id, { isPreferred: supplier.isPreferred, name: supplier.name }, includeDeleted);
  const recordNavigationDictionary = getRecordNavigationDictionary(locale);

  return <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-12"><div className="flex flex-wrap items-start justify-between gap-4 py-4"><div className="flex items-start gap-3"><PendingLink href={returnTo} className="rounded-lg border border-outline-variant bg-surface p-2 text-on-surface hover:bg-surface-container-low" aria-label={dictionary.detail.backToSuppliers}><ArrowLeft size={18} /></PendingLink><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-[28px] font-semibold leading-[36px] text-primary" dir="auto">{supplier.name}</h1><StatusBadge variant={statusVariants[supplier.status]}>{getSupplierStatusLabel(locale, supplier.status)}</StatusBadge>{isDeleted && <span className="rounded bg-error-container px-2 py-1 text-[12px] font-semibold text-error">{dictionary.detail.deleted}</span>}</div>{supplier.supplierNumber && <p className="mt-1 text-[13px] text-on-surface-variant" dir="ltr">{supplier.supplierNumber}</p>}<p className="mt-1 text-[14px] text-on-surface-variant">{dictionary.detail.subtitle}</p></div></div><div className="flex flex-wrap items-center justify-end gap-2"><RecordNavigation basePath="/suppliers" recordType={dictionary.list.title} navigation={recordNavigation} dictionary={recordNavigationDictionary} returnTo={returnTo} pendingLabel={dictionary.list.openingSupplier} />{canEdit && !isDeleted && <><SupplierBlacklistActions supplier={supplier} dictionary={dictionary.blacklist} /><PendingLink href={`/suppliers/${supplier.id}/edit`} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-semibold text-on-surface hover:bg-surface-container-low"><Pencil size={16} />{dictionary.detail.edit}</PendingLink></>}{canDelete && <SupplierDeleteRestoreActions supplierId={supplier.id} supplierName={supplier.name} isDeleted={isDeleted} dictionary={dictionary.deleteRestore} />}</div></div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><DetailCard title={dictionary.detail.contactInformation} icon={<UserRound size={18} />}><DetailValue label={dictionary.detail.contactName} value={supplier.contactName} /><DetailValue label={dictionary.detail.phone} value={supplier.phone} ltr /><DetailValue label={dictionary.detail.whatsappPhone} value={supplier.whatsappPhone} ltr /><DetailValue label={dictionary.detail.email} value={supplier.email} ltr /></DetailCard><DetailCard title={dictionary.detail.address} icon={<MapPin size={18} />}><DetailValue label={dictionary.detail.city} value={supplier.city} /><DetailValue label={dictionary.detail.country} value={supplier.country} /><DetailValue label={dictionary.detail.coverageArea} value={supplier.coverageArea} /></DetailCard><DetailCard title={dictionary.detail.directoryDetails} icon={<Building2 size={18} />}><DetailValue label={dictionary.detail.supplierType} value={supplier.supplierType ? getSupplierTypeLabel(locale, supplier.supplierType) : null} /><DetailValue label={dictionary.detail.category} value={getSupplierCategoryLabel(locale, supplier.category)} /><DetailValue label={dictionary.detail.status} value={getSupplierStatusLabel(locale, supplier.status)} /><DetailValue label={dictionary.detail.preferred} value={supplier.isPreferred ? dictionary.detail.yes : dictionary.detail.no} /></DetailCard>{supplier.canViewSensitive && <DetailCard title={dictionary.detail.taxIdentity} icon={<Building2 size={18} />}><DetailValue label={dictionary.detail.legalName} value={supplier.legalName} /><DetailValue label={dictionary.detail.crNumber} value={supplier.crNumber} ltr /><DetailValue label={dictionary.detail.vatRegistration} value={getSupplierVatRegistrationLabel(locale, supplier.vatRegistrationStatus)} /><DetailValue label={dictionary.detail.vatNumber} value={supplier.vatNumber} ltr /></DetailCard>}</div>
      {supplier.canViewSensitive && <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><DetailCard title={dictionary.detail.internalDetails} icon={<UserRound size={18} />}><DetailValue label={dictionary.detail.paymentTerms} value={supplier.paymentTerms} /><DetailValue label={dictionary.detail.notes} value={supplier.notes} /></DetailCard>{supplier.status === "blacklisted" && <DetailCard title={dictionary.detail.blacklistDetails} icon={<ShieldAlert size={18} />}><DetailValue label={dictionary.detail.blacklistReason} value={supplier.blacklistedReason} /><DetailValue label={dictionary.detail.blacklistedOn} value={supplier.blacklistedAt ? formatSupplierCopy(dictionary.detail.blacklistedOn, { date: formatUiDate(locale, supplier.blacklistedAt) }) : null} /></DetailCard>}</div>}
      {supplier.canReadBank && <DetailCard title={dictionary.detail.bankDetails} icon={<Landmark size={18} />}><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><DetailValue label={dictionary.detail.bankName} value={supplier.bankName} /><DetailValue label={dictionary.detail.bankAccountName} value={supplier.bankAccountName} /><DetailValue label={dictionary.detail.iban} value={supplier.iban} ltr /></div>{!supplier.bankName && !supplier.bankAccountName && !supplier.iban && <p className="text-[14px] text-on-surface-variant">{dictionary.detail.noBankDetails}</p>}</DetailCard>}
      {canViewCosting && !isDeleted && <DetailCard title={dictionary.detail.rateCards} icon={<Landmark size={18} />}><SupplierRateCardsList supplierId={supplier.id} dictionary={dictionary.rateCards} locale={locale} canManage={canManageCosting} /></DetailCard>}
    </div>;
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
