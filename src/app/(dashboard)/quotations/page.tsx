import { redirect } from "next/navigation";
import { getQuotations } from "@/lib/quotations/queries";
import { UnauthorizedError, ForbiddenError, checkPermission } from "@/lib/auth/permissions";
import QuotationsClient from "./QuotationsClient";

export const dynamic = "force-dynamic";

export default async function QuotationsPage() {
  try {
    const quotations = await getQuotations();
    const canWrite = await checkPermission("quotations:write");
    return <QuotationsClient quotations={quotations} canWrite={canWrite} />;
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
              You don't have permission to view the quotations module.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500">
            We couldn't load the quotations at this time. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
