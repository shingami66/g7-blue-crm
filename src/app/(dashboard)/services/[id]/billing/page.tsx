import { notFound, redirect } from "next/navigation";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { INVOICE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getServiceById } from "@/lib/services/queries";
import { getServiceBillingState } from "@/lib/invoices";
import { getSupplierAllocationsByServiceId } from "@/lib/supplier-allocations/queries";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import ServiceBillingWorkspaceClient from "./ServiceBillingWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function ServiceBillingWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getServicesDictionary(locale);
  const sharedStates = getSharedUiStates(locale);
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const rawIntent = resolvedSearchParams?.intent;
  const intent =
    rawIntent === "deposit" || rawIntent === "final" ? rawIntent : undefined;

  try {
    await requirePermission("services:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }
    if (error instanceof ForbiddenError) {
      return (
        <SharedAuthenticatedStatePanel
          title={sharedStates.accessDenied.title}
          message={dictionary.states.serviceReadForbidden}
        />
      );
    }
    return (
      <SharedAuthenticatedStatePanel
        title={sharedStates.genericError.title}
        message={dictionary.states.serviceDataLoadError}
        role="alert"
      />
    );
  }

  const canReadInvoices = await checkPermission(INVOICE_PERMISSIONS.read);
  if (!canReadInvoices) {
    return (
      <SharedAuthenticatedStatePanel
        title={sharedStates.accessDenied.title}
        message={dictionary.states.genericError}
      />
    );
  }

  const service = await getServiceById(id);
  if (!service) {
    notFound();
  }

  const canCreateInvoices = await checkPermission(INVOICE_PERMISSIONS.write);
  const canReadCost = await checkPermission("supplier_allocations:read_cost");

  const billingState = await getServiceBillingState(service.id);
  const supplierAllocationsResult = canReadCost
    ? await getSupplierAllocationsByServiceId(service.id)
    : null;

  return (
    <ServiceBillingWorkspaceClient
      service={service}
      billingState={billingState}
      dictionary={dictionary}
      canCreateInvoices={canCreateInvoices}
      canReadCost={canReadCost}
      supplierAllocations={supplierAllocationsResult?.allocations ?? null}
      intent={intent}
    />
  );
}
