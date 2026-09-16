import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_BILL_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { normalizeListPage, normalizeListPageSize } from "@/lib/pagination";
import { getSupplierBillsDictionary } from "@/lib/i18n/dictionaries/supplier-bills";
import { supplierBillsHref, supplierBillsQueryMatchesPagination } from "@/lib/supplier-bills/navigation";
import { getSupplierBillsList } from "@/lib/supplier-bills/queries";
import SupplierBillsClient from "./SupplierBillsClient";

export const dynamic = "force-dynamic";

type SupplierBillsSearchParams = {
  page?: string;
  pageSize?: string;
};

type SupplierBillsPageLoad =
  | { state: "accessDenied" | "loadError" }
  | { list: Awaited<ReturnType<typeof getSupplierBillsList>> };

async function loadSupplierBillsPage(params: SupplierBillsSearchParams): Promise<SupplierBillsPageLoad> {
  try {
    const list = await getSupplierBillsList({
      page: normalizeListPage(params.page),
      pageSize: normalizeListPageSize(params.pageSize),
    });
    return list.error ? { state: "loadError" } : { list };
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    return { state: error instanceof ForbiddenError ? "accessDenied" : "loadError" };
  }
}

export default async function SupplierBillsPage({
  searchParams,
}: {
  searchParams: Promise<SupplierBillsSearchParams>;
}) {
  const [locale, canRead, canRecord, canApprove, params] = await Promise.all([
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_BILL_PERMISSIONS.read),
    checkPermission(SUPPLIER_BILL_PERMISSIONS.record),
    checkPermission(SUPPLIER_BILL_PERMISSIONS.approve),
    searchParams,
  ]);
  const dictionary = getSupplierBillsDictionary(locale);
  if (!canRead) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  const pageLoad = await loadSupplierBillsPage(params);
  if ("state" in pageLoad) {
    const message = pageLoad.state === "accessDenied" ? dictionary.states.accessDenied : dictionary.states.loadError;
    return <StateCard title={message} message={message} />;
  }
  if (!supplierBillsQueryMatchesPagination(params, pageLoad.list.pagination.page, pageLoad.list.pagination.pageSize)) {
    redirect(supplierBillsHref(pageLoad.list.pagination.page, pageLoad.list.pagination.pageSize));
  }
  return <SupplierBillsClient bills={pageLoad.list.bills} pagination={pageLoad.list.pagination} canRecord={canRecord} canApprove={canApprove} dictionary={dictionary} />;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
