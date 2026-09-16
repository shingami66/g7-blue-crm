import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_ADVANCE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { normalizeListPage, normalizeListPageSize } from "@/lib/pagination";
import { getSupplierAdvancesDictionary } from "@/lib/i18n/dictionaries/supplier-advances";
import {
  hasEligibleSupplierAdvanceCommitments,
  getSupplierAdvancesList,
} from "@/lib/supplier-advances/queries";
import { isSupplierAdvanceAuthorizationAvailable } from "@/lib/supplier-advances/authorization-availability";
import { supplierAdvancesHref, supplierAdvancesQueryMatchesPagination } from "@/lib/supplier-advances/navigation";
import SupplierAdvancesClient from "./SupplierAdvancesClient";

export const dynamic = "force-dynamic";

type SupplierAdvancesSearchParams = {
  page?: string;
  pageSize?: string;
};

type SupplierAdvancesPageLoad =
  | { state: "accessDenied" | "loadError" }
  | { list: Awaited<ReturnType<typeof getSupplierAdvancesList>> };

async function loadSupplierAdvancesPage(params: SupplierAdvancesSearchParams): Promise<SupplierAdvancesPageLoad> {
  try {
    const list = await getSupplierAdvancesList({
      page: normalizeListPage(params.page),
      pageSize: normalizeListPageSize(params.pageSize),
    });
    return list.error ? { state: "loadError" } : { list };
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    return { state: error instanceof ForbiddenError ? "accessDenied" : "loadError" };
  }
}

export default async function SupplierAdvancesPage({
  searchParams,
}: {
  searchParams: Promise<SupplierAdvancesSearchParams>;
}) {
  const [locale, canRead, hasAuthorizationPermission, params] = await Promise.all([
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.read),
    checkPermission(SUPPLIER_ADVANCE_PERMISSIONS.authorize),
    searchParams,
  ]);
  const dictionary = getSupplierAdvancesDictionary(locale);
  if (!canRead) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  let pageLoad: SupplierAdvancesPageLoad;
  let hasEligibleCommitment = false;
  try {
    [pageLoad, hasEligibleCommitment] = await Promise.all([
      loadSupplierAdvancesPage(params),
      hasAuthorizationPermission ? hasEligibleSupplierAdvanceCommitments() : Promise.resolve(false),
    ]);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    const message = error instanceof ForbiddenError ? dictionary.states.accessDenied : dictionary.states.loadError;
    return <StateCard title={message} message={message} />;
  }
  if ("state" in pageLoad) {
    const message = pageLoad.state === "accessDenied" ? dictionary.states.accessDenied : dictionary.states.loadError;
    return <StateCard title={message} message={message} />;
  }
  if (!supplierAdvancesQueryMatchesPagination(params, pageLoad.list.pagination.page, pageLoad.list.pagination.pageSize)) {
    redirect(supplierAdvancesHref(pageLoad.list.pagination.page, pageLoad.list.pagination.pageSize));
  }
  const canAuthorize = isSupplierAdvanceAuthorizationAvailable(
    hasAuthorizationPermission,
    hasEligibleCommitment ? 1 : 0,
  );
  return <SupplierAdvancesClient advances={pageLoad.list.advances} pagination={pageLoad.list.pagination} canAuthorize={canAuthorize} dictionary={dictionary} />;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[40vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
