import { redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getSuppliersList } from "@/lib/suppliers/queries";
import SuppliersClient from "./SuppliersClient";

export const dynamic = "force-dynamic";

function AccessDeniedState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500">
          You don&apos;t have permission to view the suppliers module.
        </p>
      </div>
    </div>
  );
}

function SafeErrorState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500">
          We couldn&apos;t load suppliers at this time. Please try again later.
        </p>
      </div>
    </div>
  );
}

export default async function SuppliersPage() {
  let result: Awaited<ReturnType<typeof getSuppliersList>>;

  try {
    result = await getSuppliersList();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return <AccessDeniedState />;
    }

    return <SafeErrorState />;
  }

  return <SuppliersClient suppliers={result.suppliers} loadError={result.error} />;
}
