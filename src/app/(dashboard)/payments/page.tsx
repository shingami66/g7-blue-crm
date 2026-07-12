import { redirect } from "next/navigation";
import { getPaymentsList } from "@/lib/payments/queries";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getPaymentsDictionary } from "@/lib/i18n/dictionaries/payments";
import PaymentsClient from "./PaymentsClient";

function SafeErrorState({ loadError, title }: { loadError: string; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
        <p className="text-sm text-slate-500">
          {loadError}
        </p>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getPaymentsDictionary(locale);
  let result: Awaited<ReturnType<typeof getPaymentsList>>;

  try {
    result = await getPaymentsList();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
            <p className="text-sm text-slate-500">
              {dictionary.states.accessDeniedMessage}
            </p>
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
  return <PaymentsClient payments={result.payments} error={result.error} dictionary={dictionary} />;
}
