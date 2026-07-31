import type { Service, ServiceStatus } from "../../types/service.ts";
import { resolveInvoiceControlVisibility } from "./control-visibility.ts";
import { getServiceInvoiceLifecycleDecision } from "./service-invoice-lifecycle.ts";
import type { ServiceBillingState } from "./types.ts";

export type InvoiceChooserMode = "deposit" | "final";
export type InvoiceChooserLoadStatus =
  | "loading"
  | "ready"
  | "partial"
  | "error";

/** Read-only display projection for the navigation-only Invoice chooser. */
export type EligibleInvoiceService = {
  serviceId: string;
  serviceNumber: string;
  serviceTitle: string;
  customerDisplay: string;
  status: ServiceStatus;
  eventName: string | null;
  eventStartDate: string | null;
  eventLocation: string | null;
  canCreateDeposit: boolean;
  canCreateFinal: boolean;
};

export const INVOICE_SELECTOR_ITEMS_PER_PAGE = 10;

export function resolveInvoiceChooserLoadStatus(
  billingStates: ServiceBillingState[],
): Exclude<InvoiceChooserLoadStatus, "loading" | "error"> {
  return billingStates.some(
    (state) =>
      state.authorityMode === "unavailable" ||
      state.disabledReasons.includes("invoice_exposure_unavailable"),
  )
    ? "partial"
    : "ready";
}

function getCustomerDisplay(service: Service): string {
  return service.customer?.company || service.customer?.contact || "";
}

/**
 * Derives chooser capabilities from the same lifecycle, authority, and control
 * visibility helpers used by the Service Detail billing surface.
 */
export function getEligibleInvoiceServiceFromState(
  service: Service,
  billingState: ServiceBillingState,
  canCreateInvoices: boolean,
): EligibleInvoiceService {
  const lifecycleDecision = getServiceInvoiceLifecycleDecision({
    status: service.status,
    deletedAt: service.deletedAt,
  });
  const controls = resolveInvoiceControlVisibility({
    canCreateInvoices,
    authorityMode: billingState.authorityMode,
    lifecycleDecision,
    canCreateDepositInvoice: billingState.canCreateDepositInvoice,
    canCreateFinalInvoice: billingState.canCreateFinalInvoice,
    remainingUninvoicedAmount: billingState.remainingUninvoicedAmount,
  });

  return {
    serviceId: service.id,
    serviceNumber: service.serviceNumber,
    serviceTitle: service.serviceTitle,
    customerDisplay: getCustomerDisplay(service),
    status: service.status,
    eventName: service.eventName,
    eventStartDate: service.eventStartDate,
    eventLocation: service.eventLocation,
    canCreateDeposit: controls.canCreateDepositInvoice,
    canCreateFinal: controls.canCreateFinalInvoice,
  };
}

function compareStableText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortEligibleInvoiceServices(
  services: EligibleInvoiceService[],
): EligibleInvoiceService[] {
  return [...services].sort(
    (left, right) =>
      compareStableText(left.serviceNumber, right.serviceNumber) ||
      compareStableText(left.serviceId, right.serviceId),
  );
}

export function normalizeInvoiceServiceSearch(
  value: string | null | undefined,
): string {
  return (value ?? "").normalize("NFKD").toLocaleLowerCase();
}

function matchesSearch(
  service: EligibleInvoiceService,
  normalizedSearch: string,
): boolean {
  if (normalizedSearch === "") return true;

  return [
    service.serviceNumber,
    service.serviceTitle,
    service.customerDisplay,
    service.eventName,
    service.eventStartDate,
    service.eventLocation,
  ]
    .map(normalizeInvoiceServiceSearch)
    .join(" ")
    .includes(normalizedSearch);
}

function isEligibleForMode(
  service: EligibleInvoiceService,
  mode: InvoiceChooserMode,
): boolean {
  return mode === "deposit"
    ? service.canCreateDeposit
    : service.canCreateFinal;
}

export function getInvoiceSelectorResults({
  services,
  mode,
  search,
  requestedPage,
  itemsPerPage = INVOICE_SELECTOR_ITEMS_PER_PAGE,
}: {
  services: EligibleInvoiceService[];
  mode: InvoiceChooserMode;
  search: string;
  requestedPage: number;
  itemsPerPage?: number;
}) {
  const eligibleServices = services.filter((service) =>
    isEligibleForMode(service, mode),
  );
  const normalizedSearch = normalizeInvoiceServiceSearch(search.trim());
  const filteredServices = eligibleServices.filter((service) =>
    matchesSearch(service, normalizedSearch),
  );
  const safeItemsPerPage = Math.max(1, Math.trunc(itemsPerPage));
  const totalPages = Math.max(
    1,
    Math.ceil(filteredServices.length / safeItemsPerPage),
  );
  const page = Math.min(Math.max(1, Math.trunc(requestedPage)), totalPages);

  return {
    eligibleServices,
    filteredServices,
    page,
    totalPages,
    paginatedServices: filteredServices.slice(
      (page - 1) * safeItemsPerPage,
      page * safeItemsPerPage,
    ),
  };
}

export function getInvoiceServiceHref(
  serviceId: string,
  mode: InvoiceChooserMode,
): string {
  return `/services/${encodeURIComponent(serviceId)}/billing?intent=${mode}`;
}
