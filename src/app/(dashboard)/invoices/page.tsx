import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getLocale } from "@/lib/i18n/locales";
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
      dictionary: InvoicesDictionary;
    }
  | { status: "forbidden" }
  | { status: "error" };

export default async function InvoicesPage() {
  const locale = getLocale();
  const dictionary = getInvoicesDictionary(locale);
  let pageState: InvoicesPageState;

  try {
    await requirePermission("invoices:read");
    const invoices = await getInvoices();
    pageState = { status: "ready", invoices, dictionary };
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

  return <InvoicesListClient initialInvoices={pageState.invoices} dictionary={pageState.dictionary} />;
}
