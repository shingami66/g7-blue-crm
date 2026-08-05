import { redirect } from "next/navigation";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { INVOICE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import {
  getInvoicesDictionary,
  type InvoicesDictionary,
} from "@/lib/i18n/dictionaries/invoices";
import { getInvoicesList } from "@/lib/invoices/queries";
import {
  normalizeInvoiceListPage,
  normalizeInvoiceListPageSize,
  normalizeInvoiceListSearch,
  normalizeInvoiceSearchMode,
  type InvoiceListQuery,
} from "@/lib/invoices/types";
import InvoicesListClient from "./InvoicesListClient";

export const dynamic = "force-dynamic";

type InvoicesPageState =
  | {
      status: "ready";
      invoices: Awaited<ReturnType<typeof getInvoicesList>>["invoices"];
      pagination: Awaited<ReturnType<typeof getInvoicesList>>["pagination"];
      query: InvoiceListQuery;
      loadError?: "invoices_load_failed";
      canCreateInvoiceChooser: boolean;
      dictionary: InvoicesDictionary;
    }
  | { status: "forbidden" }
  | { status: "error" };

type InvoiceSearchParams = {
  page?: string;
  pageSize?: string;
  search?: string;
  searchMode?: string;
  status?: string;
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<InvoiceSearchParams>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getInvoicesDictionary(locale);
  const query = invoiceListQuery(await searchParams);
  let pageState: InvoicesPageState;

  try {
    await requirePermission("invoices:read");
    const [result, canWriteInvoices, canReadServices] = await Promise.all([
      getInvoicesList(query),
      checkPermission(INVOICE_PERMISSIONS.write),
      checkPermission("services:read"),
    ]);
    const canCreateInvoiceChooser = canWriteInvoices && canReadServices;
    pageState = {
      status: "ready",
      invoices: result.invoices,
      pagination: result.pagination,
      query,
      loadError: result.error,
      canCreateInvoiceChooser,
      dictionary,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (error instanceof ForbiddenError) {
      pageState = { status: "forbidden" };
    } else {
      pageState = { status: "error" };
    }
  }

  if (pageState.status === "forbidden") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
          <p className="text-sm text-slate-500">{dictionary.states.invoicesForbidden}</p>
        </div>
      </div>
    );
  }

  if (pageState.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.genericError}</h2>
          <p className="text-sm text-slate-500">{dictionary.states.invoicesLoadError}</p>
        </div>
      </div>
    );
  }

  return (
    <InvoicesListClient
      initialInvoices={pageState.invoices}
      pagination={pageState.pagination}
      query={pageState.query}
      loadError={pageState.loadError}
      canCreateInvoiceChooser={pageState.canCreateInvoiceChooser}
      dictionary={pageState.dictionary}
    />
  );
}

function invoiceListQuery(params: InvoiceSearchParams): InvoiceListQuery {
  const searchMode = normalizeInvoiceSearchMode(params.searchMode);
  const search = searchMode ? normalizeInvoiceListSearch(params.search) : undefined;
  return {
    page: normalizeInvoiceListPage(params.page),
    pageSize: normalizeInvoiceListPageSize(params.pageSize),
    search,
    searchMode: search ? searchMode : undefined,
    status: params.status && params.status !== "all" ? params.status : undefined,
  };
}
