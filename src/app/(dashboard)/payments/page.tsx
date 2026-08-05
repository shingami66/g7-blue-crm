import { redirect } from "next/navigation";
import { getPaymentsList } from "@/lib/payments/queries";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getPaymentsDictionary } from "@/lib/i18n/dictionaries/payments";
import PaymentsClient from "./PaymentsClient";
import { parseBusinessYear } from "@/lib/business-year";
import type { BusinessYear } from "@/lib/business-year";
import { getBusinessYearPreference } from "@/lib/business-year-preference";
import {
  normalizePaymentsListPage,
  normalizePaymentsListPageSize,
  normalizePaymentsListSearch,
  type PaymentsListQuery,
} from "@/lib/payments/types";

function SafeErrorState({ loadError, title }: { loadError: string; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-500">{loadError}</p>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

type PaymentsSearchParams = {
  year?: string;
  page?: string;
  pageSize?: string;
  search?: string;
};

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<PaymentsSearchParams>;
}) {
  const [locale, preferredYear, params] = await Promise.all([
    getCurrentSessionEffectiveLocale(),
    getBusinessYearPreference(),
    searchParams,
  ]);
  const dictionary = getPaymentsDictionary(locale);
  const query = paymentsListQuery(params, preferredYear);
  let result: Awaited<ReturnType<typeof getPaymentsList>>;

  try {
    result = await getPaymentsList(query);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
            <p className="text-sm text-slate-500">{dictionary.states.accessDeniedMessage}</p>
          </div>
        </div>
      );
    }

    return (
      <SafeErrorState
        loadError={dictionary.states.paymentDataUnavailable}
        title={dictionary.states.loadError}
      />
    );
  }

  return (
    <PaymentsClient
      payments={result.payments}
      pagination={result.pagination}
      query={query}
      error={result.error}
      dictionary={dictionary}
    />
  );
}

function paymentsListQuery(params: PaymentsSearchParams, preferredYear: BusinessYear): PaymentsListQuery {
  return {
    year: parseBusinessYear(params.year ?? String(preferredYear)),
    page: normalizePaymentsListPage(params.page),
    pageSize: normalizePaymentsListPageSize(params.pageSize),
    search: normalizePaymentsListSearch(params.search),
  };
}
