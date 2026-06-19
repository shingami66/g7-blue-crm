import { redirect } from "next/navigation";
import { getQuotations } from "@/lib/quotations/queries";
import { checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import QuotationsClient from "./QuotationsClient";
import type { QuotationListItem } from "@/lib/quotations/types";

export const dynamic = "force-dynamic";

type QuotationsPageState =
  | {
      status: "ready";
      quotations: QuotationListItem[];
      canWrite: boolean;
    }
  | { status: "forbidden" }
  | { status: "error" };

export default async function QuotationsPage() {
  let pageState: QuotationsPageState;

  try {
    const quotations = await getQuotations();
    const canWrite = await checkPermission("quotations:write");
    pageState = { status: "ready", quotations, canWrite };
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
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-sm text-slate-500">
            You don&apos;t have permission to view the quotations module.
          </p>
        </div>
      </div>
    );
  }

  if (pageState.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500">
            We couldn&apos;t load the quotations at this time. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <QuotationsClient
      quotations={pageState.quotations}
      canWrite={pageState.canWrite}
    />
  );
}
