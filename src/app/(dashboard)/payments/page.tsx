import { redirect } from "next/navigation";
import { getPaymentsList } from "@/lib/payments/queries";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import PaymentsClient from "./PaymentsClient";

function SafeErrorState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500">
          We couldn&apos;t load payments at this time. Please try again later.
        </p>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
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
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-sm text-slate-500">
              You don&apos;t have permission to view the payments module.
            </p>
          </div>
        </div>
      );
    }

    return <SafeErrorState />;
  }
  return <PaymentsClient payments={result.payments} error={result.error} />;
}
