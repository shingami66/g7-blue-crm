import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { INVOICE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { getServiceBillingState } from "@/lib/invoices/billing-state";
import {
  getEligibleInvoiceServiceFromState,
  resolveInvoiceChooserLoadStatus,
  sortEligibleInvoiceServices,
  type EligibleInvoiceService,
  type InvoiceChooserLoadStatus,
} from "@/lib/invoices/eligible-service-selector";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { mapRowToService } from "./mappers";
import type { Service } from "@/types/service";
import type { ServiceRowWithCustomer } from "./types";
import { buildIlikeOrFilter } from "@/lib/search/server";
import {
  normalizeServiceListPageSize,
  normalizeServiceListSearch,
  normalizeServiceSearchMode,
  type ServiceListQuery,
  type ServicesListResult,
} from "./types";

const SERVICE_SELECT = "*, customers(company, contact, customer_number)";

type ServicesReadResult =
  | { status: "ready"; services: Service[] }
  | { status: "error"; services: [] };

export type EligibleInvoiceServicesResult = {
  status: Exclude<InvoiceChooserLoadStatus, "loading">;
  services: EligibleInvoiceService[];
};

export type EligibleQuotationService = Pick<
  Service,
  | "id"
  | "serviceNumber"
  | "serviceTitle"
  | "customer"
  | "status"
  | "eventName"
  | "eventStartDate"
  | "eventLocation"
>;

function toEligibleQuotationService(service: Service): EligibleQuotationService {
  return {
    id: service.id,
    serviceNumber: service.serviceNumber,
    serviceTitle: service.serviceTitle,
    customer: service.customer,
    status: service.status,
    eventName: service.eventName,
    eventStartDate: service.eventStartDate,
    eventLocation: service.eventLocation,
  };
}

/**
 * Returns only Services with at least one currently eligible Invoice action.
 * Permission, lifecycle, billing authority, exposure, and duplicate checks are
 * all derived server-side before the projection reaches the client.
 */
export async function getEligibleServicesForInvoiceChooser(): Promise<
  EligibleInvoiceServicesResult
> {
  await requirePermission(INVOICE_PERMISSIONS.write);
  await requirePermission("services:read");

  const servicesResult = await readActiveServices(
    "getEligibleServicesForInvoiceChooser",
  );
  if (servicesResult.status === "error") {
    return { status: "error", services: [] };
  }

  const eligibilityStates = await Promise.all(
    servicesResult.services.map(async (service) => {
      const billingState = await getServiceBillingState(service.id);
      return {
        billingState,
        service: getEligibleInvoiceServiceFromState(
          service,
          billingState,
          true,
        ),
      };
    }),
  );

  return {
    status: resolveInvoiceChooserLoadStatus(
      eligibilityStates.map(({ billingState }) => billingState),
    ),
    services: sortEligibleInvoiceServices(
      eligibilityStates
        .map(({ service }) => service)
        .filter(
          (service) => service.canCreateDeposit || service.canCreateFinal,
        ),
    ),
  };
}

async function readActiveServices(
  caller: string,
): Promise<ServicesReadResult> {
  try {
    const supabase = createAdminClient();
    const { data: serviceRows, error } = await supabase
      .from("services")
      .select(SERVICE_SELECT)
      .is("deleted_at", null)
      .order("service_number", { ascending: true });

    if (error) {
      console.error(`[${caller}] Supabase error:`, error.message);
      return { status: "error", services: [] };
    }

    return {
      status: "ready",
      services: (serviceRows ?? []).map((serviceRow) =>
        mapRowToService(serviceRow as ServiceRowWithCustomer),
      ),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }
    console.error(
      `[${caller}] Unexpected error:`,
      err instanceof Error ? err.message : "Unknown",
    );
    return { status: "error", services: [] };
  }
}

export async function getServices(): Promise<Service[]> {
  await requirePermission("services:read");
  const result = await readActiveServices("getServices");
  return result.services;
}

function serviceSearchColumns(mode: ServiceListQuery["searchMode"]): string[] {
  if (mode === "serviceName") return ["service_title"];
  if (mode === "customer") return ["company", "contact"];
  return ["service_number"];
}

function serviceSearchRelation(mode: ServiceListQuery["searchMode"]): string | undefined {
  return mode === "customer" ? "customers" : undefined;
}

export async function getServicesList(
  options: ServiceListQuery = {},
): Promise<ServicesListResult> {
  await requirePermission("services:read");

  const pageSize = normalizeServiceListPageSize(options.pageSize);
  const search = normalizeServiceListSearch(options.search);
  const searchMode = search ? normalizeServiceSearchMode(options.searchMode) : undefined;
  const searchFilter = searchMode
    ? buildIlikeOrFilter(serviceSearchColumns(searchMode), search)
    : undefined;
  const searchRelation = searchFilter && searchMode ? serviceSearchRelation(searchMode) : undefined;

  try {
    const supabase = createAdminClient();
    let countQuery = supabase
      .from("services")
      .select(searchRelation ? "id, customers!inner(id)" : "id", { count: "exact", head: true })
      .is("deleted_at", null);
    let dataQuery = supabase
      .from("services")
      .select(searchRelation ? "*, customers!inner(company, contact, customer_number)" : SERVICE_SELECT)
      .is("deleted_at", null);

    if (options.status) {
      countQuery = countQuery.eq("status", options.status);
      dataQuery = dataQuery.eq("status", options.status);
    }
    if (searchFilter) {
      countQuery = countQuery.or(searchFilter, searchRelation ? { referencedTable: searchRelation } : undefined);
      dataQuery = dataQuery.or(searchFilter, searchRelation ? { referencedTable: searchRelation } : undefined);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error("[getServicesList] Count error:", countError.message);
      return { services: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 }, error: "services_load_failed" };
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
    const rangeStart = (page - 1) * pageSize;
    const { data, error } = await dataQuery
      .order("service_number", { ascending: true })
      .order("id", { ascending: true })
      .range(rangeStart, rangeStart + pageSize - 1);

    if (error) {
      console.error("[getServicesList] Data error:", error.message);
      return { services: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 }, error: "services_load_failed" };
    }

    return {
      services: (data ?? []).map((row) => mapRowToService(row as ServiceRowWithCustomer)),
      pagination: { page, pageSize, total, totalPages },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getServicesList] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { services: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 }, error: "services_load_failed" };
  }
}

export async function getEligibleServicesForQuotation(): Promise<EligibleQuotationService[]> {
  await requirePermission("services:read");

  try {
    const supabase = createAdminClient();
    const { data: serviceRows, error } = await supabase
      .from("services")
      .select(SERVICE_SELECT)
      .is("deleted_at", null)
      .in("status", ["Inquiry", "Quoted"])
      .order("service_number", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("[getEligibleServicesForQuotation] Supabase error:", error.message);
      return [];
    }

    return (serviceRows ?? [])
      .map((serviceRow) => mapRowToService(serviceRow as ServiceRowWithCustomer))
      .map(toEligibleQuotationService);
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getEligibleServicesForQuotation] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return [];
  }
}

export async function getServiceById(id: string): Promise<Service | null> {
  await requirePermission("services:read");

  try {
    const supabase = createAdminClient();
    const { data: serviceRow, error } = await supabase
      .from("services")
      .select(SERVICE_SELECT)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      console.error("[getServiceById] Supabase error:", error.message);
      return null;
    }

    return serviceRow
      ? mapRowToService(serviceRow as ServiceRowWithCustomer)
      : null;
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getServiceById] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return null;
  }
}

export async function getServicesByCustomerId(customerId: string): Promise<Service[]> {
  await requirePermission("services:read");

  try {
    const supabase = createAdminClient();
    const { data: serviceRows, error } = await supabase
      .from("services")
      .select(SERVICE_SELECT)
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getServicesByCustomerId] Supabase error:", error.message);
      return [];
    }

    return (serviceRows ?? []).map((serviceRow) =>
      mapRowToService(serviceRow as ServiceRowWithCustomer)
    );
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getServicesByCustomerId] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return [];
  }
}
