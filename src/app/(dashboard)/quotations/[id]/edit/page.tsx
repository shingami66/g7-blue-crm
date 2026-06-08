import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getCustomers } from "@/lib/customers/queries";
import { getQuotationById } from "@/lib/quotations/queries";
import QuotationForm from "../../new/QuotationForm";

export const dynamic = "force-dynamic";

export default async function EditQuotationPage({ params }: { params: { id: string } }) {
  try {
    await requirePermission("quotations:write");

    const quotation = await getQuotationById(params.id);
    
    if (!quotation) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Quotation Not Found</h2>
            <p className="text-sm text-slate-500">
              The quotation you are trying to edit does not exist or has been deleted.
            </p>
          </div>
        </div>
      );
    }

    if (quotation.status !== "draft") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Locked</h2>
            <p className="text-sm text-slate-500 mb-4">
              Only draft quotations can be edited.
            </p>
            <a href="/quotations" className="text-primary hover:underline font-medium">Back to Quotations</a>
          </div>
        </div>
      );
    }

    const allCustomers = await getCustomers();
    // Filter active
    const activeCustomers = allCustomers.filter((c) => c.status === "active");

    // Check if the current quotation's customer is among the active ones
    const isCustomerActive = activeCustomers.some(c => c.id === quotation.customerId);

    return (
      <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-12">
        {!isCustomerActive && (
          <div className="bg-warning-container text-on-warning-container p-4 rounded-lg mt-6 border border-warning">
            <strong>Warning:</strong> The previously selected customer is no longer active. Please choose an active customer before saving.
          </div>
        )}
        <QuotationForm customers={activeCustomers} initialData={quotation as any} />
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
              You don't have permission to edit quotations.
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
