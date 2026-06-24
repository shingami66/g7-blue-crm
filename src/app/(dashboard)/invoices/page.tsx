import { requirePermission } from "@/lib/auth/permissions";
import { getInvoices } from "@/lib/invoices/queries";
import InvoicesListClient from "./InvoicesListClient";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  await requirePermission("invoices:read");

  const invoices = await getInvoices();

  return <InvoicesListClient initialInvoices={invoices} />;
}
