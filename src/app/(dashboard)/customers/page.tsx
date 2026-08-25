import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getCustomerCities, getCustomersList } from "@/lib/customers/queries";
import { checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getCustomersDictionary } from "@/lib/i18n/dictionaries/customers";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import CustomersClient from "./CustomersClient";
import {
  normalizeCustomerListPage,
  normalizeCustomerListPageSize,
  normalizeCustomerListSearch,
  normalizeCustomerStatus,
  type CustomerListQuery,
} from "@/lib/customers/types";

export const dynamic = "force-dynamic";

type CustomerSearchParams = { page?: string; pageSize?: string; search?: string; status?: string; city?: string };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<CustomerSearchParams> }) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getCustomersDictionary(locale);
  const sharedStates = getSharedUiStates(locale);
  const query = customerListQuery(await searchParams);
  let result: Awaited<ReturnType<typeof getCustomersList>>;
  let cities: string[] = [];
  let canWrite = false;
  let canExport = false;
  let clerkUser: Awaited<ReturnType<typeof currentUser>> = null;
  let generatedBy = dictionary.list.report.chrome.systemGenerated;

  try {
    [result, cities, canWrite, canExport, clerkUser] = await Promise.all([
      getCustomersList(query),
      getCustomerCities(),
      checkPermission("customers:write"),
      checkPermission("customers:export"),
      currentUser(),
    ]);
    if (clerkUser) {
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ");
      // Stored identity values (name/email) are not translated.
      if (name && email) {
        generatedBy = `${name} (${email})`;
      } else if (email) {
        generatedBy = email;
      } else if (name) {
        generatedBy = name;
      }
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <SharedAuthenticatedStatePanel
          title={sharedStates.accessDenied.title}
          message={dictionary.states.customersForbidden}
        />
      );
    }

    return (
      <SharedAuthenticatedStatePanel
        title={sharedStates.genericError.title}
        message={dictionary.states.customersLoadError}
        role="alert"
      />
    );
  }

  return (
    <CustomersClient
      customers={result.customers}
      loadError={result.error}
      pagination={result.pagination}
      query={query}
      cities={cities}
      canWrite={canWrite}
      canExport={canExport}
      generatedBy={generatedBy}
      dictionary={dictionary}
    />
  );
}

function customerListQuery(params: CustomerSearchParams): CustomerListQuery {
  return {
    page: normalizeCustomerListPage(params.page),
    pageSize: normalizeCustomerListPageSize(params.pageSize),
    search: normalizeCustomerListSearch(params.search),
    status: normalizeCustomerStatus(params.status),
    city: params.city?.trim().slice(0, 80) || undefined,
  };
}
