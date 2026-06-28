import { redirect, notFound } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { getSupplierById } from "@/lib/suppliers/queries";
import SupplierEditForm from "./SupplierEditForm";

export const dynamic = "force-dynamic";

function AccessDeniedState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-500">
          You don&apos;t have permission to edit suppliers.
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
          We couldn&apos;t load the supplier for editing at this time. Please try again later.
        </p>
      </div>
    </div>
  );
}

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    await requirePermission("suppliers:write");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }
    if (err instanceof ForbiddenError) {
      return <AccessDeniedState />;
    }
    return <SafeErrorState />;
  }

  const result = await getSupplierById(id);

  if (result.error) {
    return <SafeErrorState />;
  }

  if (!result.supplier) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-12">
      <SupplierEditForm supplier={result.supplier} />
    </div>
  );
}
