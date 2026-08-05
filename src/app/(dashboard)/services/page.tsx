import { redirect } from "next/navigation";
import { getServicesList } from "@/lib/services/queries";
import { checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import ServicesClient from "./ServicesClient";
import { parseBusinessYear } from "@/lib/business-year";
import type { BusinessYear } from "@/lib/business-year";
import { getBusinessYearPreference } from "@/lib/business-year-preference";
import {
  normalizeServiceListPage,
  normalizeServiceListPageSize,
  normalizeServiceListSearch,
  normalizeServiceSearchMode,
  type ServiceListQuery,
  type ServiceStatus,
} from "@/lib/services/types";

export const dynamic = "force-dynamic";

type ServiceSearchParams = {
  year?: string;
  page?: string;
  pageSize?: string;
  search?: string;
  searchMode?: string;
  status?: string;
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<ServiceSearchParams>;
}) {
  const [locale, preferredYear, params] = await Promise.all([
    getCurrentSessionEffectiveLocale(),
    getBusinessYearPreference(),
    searchParams,
  ]);
  const dictionary = getServicesDictionary(locale);
  const sharedStates = getSharedUiStates(locale);
  const query = serviceListQuery(params, preferredYear);
  let services;
  let canWrite;
  let result: Awaited<ReturnType<typeof getServicesList>>;

  try {
    result = await getServicesList(query);
    services = result.services;
    canWrite = await checkPermission("services:write");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <SharedAuthenticatedStatePanel
          title={sharedStates.accessDenied.title}
          message={dictionary.states.servicesForbidden}
        />
      );
    }

    return (
      <SharedAuthenticatedStatePanel
        title={sharedStates.genericError.title}
        message={dictionary.states.servicesLoadError}
        role="alert"
      />
    );
  }

  return <ServicesClient services={services} pagination={result.pagination} query={query} loadError={result.error} canWrite={canWrite} dictionary={dictionary} />;
}

function serviceListQuery(params: ServiceSearchParams, preferredYear: BusinessYear): ServiceListQuery {
  const searchMode = normalizeServiceSearchMode(params.searchMode);
  const search = searchMode ? normalizeServiceListSearch(params.search) : undefined;
  return {
    year: parseBusinessYear(params.year ?? String(preferredYear)),
    page: normalizeServiceListPage(params.page),
    pageSize: normalizeServiceListPageSize(params.pageSize),
    search,
    searchMode: search ? searchMode : undefined,
    status: serviceStatus(params.status),
  };
}

function serviceStatus(value: string | undefined): ServiceStatus | undefined {
  return value === "Inquiry" || value === "Quoted" || value === "Approved" || value === "Deposit Paid" || value === "In Progress" || value === "Completed" || value === "Cancelled"
    ? value
    : undefined;
}
