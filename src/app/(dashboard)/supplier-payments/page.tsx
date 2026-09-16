import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { normalizeListPage, normalizeListPageSize } from "@/lib/pagination";
import { getSupplierPaymentsDictionary } from "@/lib/i18n/dictionaries/supplier-payments";
import { supplierPaymentsHref, supplierPaymentsQueryMatchesPagination } from "@/lib/supplier-payments/navigation";
import { getSupplierPaymentsList } from "@/lib/supplier-payments/queries";
import SupplierPaymentsClient from "./SupplierPaymentsClient";

export const dynamic = "force-dynamic";

type SupplierPaymentsSearchParams = {
  page?: string;
  pageSize?: string;
};

type SupplierPaymentsPageLoad =
  | { state: "accessDenied" | "loadError" }
  | { list: Awaited<ReturnType<typeof getSupplierPaymentsList>> };

async function loadSupplierPaymentsPage(params: SupplierPaymentsSearchParams): Promise<SupplierPaymentsPageLoad> {
  try {
    const list = await getSupplierPaymentsList({
      page: normalizeListPage(params.page),
      pageSize: normalizeListPageSize(params.pageSize),
    });
    return list.error ? { state: "loadError" } : { list };
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    return { state: error instanceof ForbiddenError ? "accessDenied" : "loadError" };
  }
}

export default async function SupplierPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SupplierPaymentsSearchParams>;
}) {
  const [locale, canRead, params] = await Promise.all([
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_PAYMENT_PERMISSIONS.read),
    searchParams,
  ]);
  const dictionary = getSupplierPaymentsDictionary(locale);
  if (!canRead) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  const pageLoad = await loadSupplierPaymentsPage(params);
  if ("state" in pageLoad) {
    const message = pageLoad.state === "accessDenied" ? dictionary.states.accessDenied : dictionary.states.loadError;
    return <StateCard title={message} message={message} />;
  }
  if (!supplierPaymentsQueryMatchesPagination(params, pageLoad.list.pagination.page, pageLoad.list.pagination.pageSize)) {
    redirect(supplierPaymentsHref(pageLoad.list.pagination.page, pageLoad.list.pagination.pageSize));
  }
  return <SupplierPaymentsClient payments={pageLoad.list.payments} pagination={pageLoad.list.pagination} dictionary={dictionary} />;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
