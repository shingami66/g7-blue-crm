import { notFound, redirect } from "next/navigation";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { SUPPLIER_BILL_PERMISSIONS } from "@/lib/auth/role-permissions";
import { SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getSupplierBillsDictionary } from "@/lib/i18n/dictionaries/supplier-bills";
import { getSupplierBillById, getSupplierBillFormOptions } from "@/lib/supplier-bills/queries";
import SupplierBillDetailClient from "../SupplierBillDetailClient";

export const dynamic = "force-dynamic";

export default async function SupplierBillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale, canRead, canRecord, canApprove, canRecordPayment] = await Promise.all([
    params,
    getCurrentSessionEffectiveLocale(),
    checkPermission(SUPPLIER_BILL_PERMISSIONS.read),
    checkPermission(SUPPLIER_BILL_PERMISSIONS.record),
    checkPermission(SUPPLIER_BILL_PERMISSIONS.approve),
    checkPermission(SUPPLIER_PAYMENT_PERMISSIONS.record),
  ]);
  const dictionary = getSupplierBillsDictionary(locale);
  if (!canRead) return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  let detail: Awaited<ReturnType<typeof getSupplierBillById>> | null = null;
  let options: Awaited<ReturnType<typeof getSupplierBillFormOptions>> | null = null;
  let state: "accessDenied" | "loadError" | null = null;
  try {
    [detail, options] = await Promise.all([getSupplierBillById(id), getSupplierBillFormOptions()]);
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    state = error instanceof ForbiddenError ? "accessDenied" : "loadError";
  }
  if (state === "accessDenied") return <StateCard title={dictionary.states.accessDenied} message={dictionary.states.accessDenied} />;
  if (state === "loadError" || !detail || !options) return <StateCard title={dictionary.states.loadError} message={dictionary.states.loadError} />;
  if (!detail.bill) notFound();
  return <SupplierBillDetailClient bill={detail.bill} options={options} canRecord={canRecord} canApprove={canApprove} canRecordPayment={canRecordPayment} dictionary={dictionary} />;
}

function StateCard({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[50vh] items-center justify-center px-4"><div className="w-full max-w-lg rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center"><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{message}</p></div></div>;
}
