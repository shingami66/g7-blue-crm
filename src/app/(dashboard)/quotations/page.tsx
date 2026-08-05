import { redirect } from "next/navigation";
import { getQuotationsList } from "@/lib/quotations/queries";
import {
  getEligibleServicesForQuotation,
  type EligibleQuotationService,
} from "@/lib/services/queries";
import { checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import {
  getQuotationsDictionary,
  type QuotationsDictionary,
} from "@/lib/i18n/dictionaries/quotations";
import QuotationsClient from "./QuotationsClient";
import {
  normalizeQuotationListPage,
  normalizeQuotationListPageSize,
  normalizeQuotationListSearch,
  normalizeQuotationMonth,
  normalizeQuotationSearchMode,
  type QuotationListQuery,
  type QuotationListItem,
  type QuotationStatus,
} from "@/lib/quotations/types";

export const dynamic = "force-dynamic";

type QuotationsPageState =
  | {
      status: "ready";
      quotations: QuotationListItem[];
      pagination: Awaited<ReturnType<typeof getQuotationsList>>["pagination"];
      query: QuotationListQuery;
      loadError?: "quotations_load_failed";
      canWrite: boolean;
      canSelectService: boolean;
      eligibleServices: EligibleQuotationService[];
      dictionary: QuotationsDictionary;
    }
  | { status: "forbidden" }
  | { status: "error" };

type QuotationSearchParams = {
  page?: string;
  pageSize?: string;
  search?: string;
  searchMode?: string;
  status?: string;
  month?: string;
};

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<QuotationSearchParams>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getQuotationsDictionary(locale);
  const params = await searchParams;
  const query = quotationListQuery(params);
  let pageState: QuotationsPageState;

  try {
    const result = await getQuotationsList(query);
    const [canWrite, canReadServices] = await Promise.all([
      checkPermission("quotations:write"),
      checkPermission("services:read"),
    ]);
    const canSelectService = canWrite && canReadServices;
    const eligibleServices = canSelectService
      ? await getEligibleServicesForQuotation()
      : [];
    pageState = {
      status: "ready",
      quotations: result.quotations,
      pagination: result.pagination,
      query,
      loadError: result.error,
      canWrite,
      canSelectService,
      eligibleServices,
      dictionary,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
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
          <p className="text-sm text-slate-500">
            {dictionary.states.quotationsForbidden}
          </p>
        </div>
      </div>
    );
  }

  if (pageState.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.genericError}</h2>
          <p className="text-sm text-slate-500">
            {dictionary.states.quotationsLoadError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <QuotationsClient
      quotations={pageState.quotations}
      pagination={pageState.pagination}
      query={query}
      loadError={pageState.loadError}
      canWrite={pageState.canWrite}
      canSelectService={pageState.canSelectService}
      eligibleServices={pageState.eligibleServices}
      dictionary={pageState.dictionary}
    />
  );
}

function quotationListQuery(params: QuotationSearchParams): QuotationListQuery {
  const searchMode = normalizeQuotationSearchMode(params.searchMode);
  const search = searchMode ? normalizeQuotationListSearch(params.search) : undefined;
  return {
    page: normalizeQuotationListPage(params.page),
    pageSize: normalizeQuotationListPageSize(params.pageSize),
    search,
    searchMode: search ? searchMode : undefined,
    status: quotationStatus(params.status),
    month: normalizeQuotationMonth(params.month),
  };
}

function quotationStatus(value: string | undefined): QuotationStatus | undefined {
  return value === "draft" || value === "sent" || value === "approved" || value === "rejected"
    ? value
    : undefined;
}
