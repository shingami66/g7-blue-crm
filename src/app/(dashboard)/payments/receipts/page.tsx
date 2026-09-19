import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getCustomerReceiptsDictionary } from "@/lib/i18n/dictionaries/customer-receipts";
import {
  normalizeListPage,
  normalizeListPageSize,
} from "@/lib/pagination";
import { getCustomerReceiptWorkspaceData } from "@/lib/customer-receipts/queries";
import CustomerReceiptsClient from "./CustomerReceiptsClient";

export const dynamic = "force-dynamic";

type SearchParams = {
  page?: string;
  pageSize?: string;
  search?: string;
};

export default async function CustomerReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [locale, params] = await Promise.all([
    getCurrentSessionEffectiveLocale(),
    searchParams,
  ]);
  const dictionary = getCustomerReceiptsDictionary(locale);
  const query = {
    page: normalizeListPage(params.page),
    pageSize: normalizeListPageSize(params.pageSize),
    search: params.search,
  };

  let data: Awaited<ReturnType<typeof getCustomerReceiptWorkspaceData>>;
  try {
    data = await getCustomerReceiptWorkspaceData(query);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center">
            <h2 className="text-xl font-semibold text-on-surface">{dictionary.states.accessDenied}</h2>
            <p className="mt-2 text-sm text-on-surface-variant">{dictionary.states.accessDeniedMessage}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center">
          <h2 className="text-xl font-semibold text-on-surface">{dictionary.states.loadError}</h2>
        </div>
      </div>
    );
  }

  return <CustomerReceiptsClient data={data} query={query} dictionary={dictionary} />;
}
