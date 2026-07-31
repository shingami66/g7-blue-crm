import { redirect } from "next/navigation";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { INVOICE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import {
  getInvoicesDictionary,
  type InvoicesDictionary,
} from "@/lib/i18n/dictionaries/invoices";
import { getInvoices } from "@/lib/invoices/queries";
import InvoicesListClient from "./InvoicesListClient";

export const dynamic = "force-dynamic";

type InvoicesPageState =
  | {
      status: "ready";
      invoices: Awaited<ReturnType<typeof getInvoices>>;
      canCreateInvoiceChooser: boolean;
      dictionary: InvoicesDictionary;
    }
  | { status: "forbidden" }
  | { status: "error" };

export default async function InvoicesPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getInvoicesDictionary(locale);
  let pageState: InvoicesPageState;

  try {
    await requirePermission("invoices:read");
    const [invoices, canWriteInvoices, canReadServices] = await Promise.all([
      getInvoices(),
      checkPermission(INVOICE_PERMISSIONS.write),
      checkPermission("services:read"),
    ]);
    const canCreateInvoiceChooser = canWriteInvoices && canReadServices;
    pageState = {
      status: "ready",
      invoices,
      canCreateInvoiceChooser,
      dictionary,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (error instanceof ForbiddenError) {
      pageState = { status: "forbidden" };
    } else {
      pageState = { status: "error" };
    }
  }

  if (pageState.status === "forbidden") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
          <p className="text-sm text-slate-500">{dictionary.states.invoicesForbidden}</p>
        </div>
      </div>
    );
  }

  if (pageState.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.genericError}</h2>
          <p className="text-sm text-slate-500">{dictionary.states.invoicesLoadError}</p>
        </div>
      </div>
    );
  }

  return (
    <InvoicesListClient
      initialInvoices={pageState.invoices}
      canCreateInvoiceChooser={pageState.canCreateInvoiceChooser}
      dictionary={pageState.dictionary}
    />
  );
}
