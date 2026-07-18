import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { getSuppliersList } from "@/lib/suppliers/queries";
import { normalizeSupplierListPage, normalizeSupplierListSearch, type SupplierListQuery } from "@/lib/suppliers/types";
import type { SupplierStatus } from "@/types/supplier";
import SuppliersClient from "./SuppliersClient";

export const dynamic = "force-dynamic";

type SupplierSearchParams = {
  showDeleted?: string;
  page?: string;
  search?: string;
  status?: string;
  category?: string;
};

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<SupplierSearchParams> }) {
  const [params, locale] = await Promise.all([searchParams, getCurrentSessionEffectiveLocale()]);
  const dictionary = getSuppliersDictionary(locale);
  const query = supplierListQuery(params);
  const data = await loadSuppliersPageData(query);

  if (data.kind === "unauthorized") redirect("/sign-in");
  if (data.kind === "forbidden") return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.listForbidden} />;
  if (data.kind === "error") return <StateCard title={dictionary.states.genericError} message={dictionary.states.listLoadError} />;

  return <SuppliersClient suppliers={data.result.suppliers} pagination={data.result.pagination} search={query.search ?? ""} statusFilter={query.status ?? "all"} categoryFilter={query.category ?? "all"} loadError={data.result.error} canCreateSuppliers={data.canCreateSuppliers} canManageDeleted={data.canManageDeleted} showDeleted={Boolean(query.includeDeleted)} dictionary={dictionary} />;
}

function supplierListQuery(params: SupplierSearchParams): SupplierListQuery {
  return {
    includeDeleted: params.showDeleted === "true",
    page: normalizeSupplierListPage(params.page),
    search: normalizeSupplierListSearch(params.search),
    status: supplierStatus(params.status),
    category: params.category?.trim().slice(0, 80) || undefined,
  };
}

function supplierStatus(value: string | undefined): SupplierStatus | undefined {
  if (value === "active" || value === "on_hold" || value === "blacklisted" || value === "inactive") {
    return value;
  }
  return undefined;
}

async function loadSuppliersPageData(query: SupplierListQuery) {
  try {
    const [result, canCreateSuppliers, canManageDeleted] = await Promise.all([
      getSuppliersList(query),
      checkPermission("suppliers:write"),
      checkPermission("suppliers:delete"),
    ]);
    return { kind: "ready" as const, result, canCreateSuppliers, canManageDeleted };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { kind: "unauthorized" as const };
    if (err instanceof ForbiddenError) return { kind: "forbidden" as const };
    return { kind: "error" as const };
  }
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[60vh] flex-col items-center justify-center px-4"><div className="w-full max-w-md border border-slate-200 bg-white p-8 text-center shadow-sm"><h2 className="mb-2 text-xl font-semibold text-slate-900">{title}</h2><p className="text-sm text-slate-500">{message}</p></div></div>;
}
