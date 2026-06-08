import { redirect } from "next/navigation";
import { requirePermission, UnauthorizedError, ForbiddenError } from "@/lib/auth/permissions";
import { getCustomers } from "@/lib/customers/queries";
import QuotationForm from "./QuotationForm";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  try {
    await requirePermission("quotations:write");
    const allCustomers = await getCustomers();
    // Filter out inactive/lead/archived
    const activeCustomers = allCustomers.filter((c) => c.status === "active");

    return (
      <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-12">
        <QuotationForm customers={activeCustomers} />
      </div>
    );
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
              You don't have permission to create quotations.
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
            We couldn't load the necessary data at this time. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
