import "server-only";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToSupplier, mapRowToSupplierDirectoryItem } from "./mappers";
import {
  SUPPLIER_PAGE_SIZE,
  type Supplier,
  type SupplierListQuery,
  type SupplierOption,
  type SuppliersListResult,
  normalizeSupplierListSearch,
} from "./types";

const SUPPLIER_DIRECTORY_SELECT = `
  id,
  supplier_number,
  supplier_type,
  category,
  display_name,
  name,
  city,
  country,
  rating,
  status,
  is_preferred,
  is_deleted
`;

const SUPPLIER_DETAIL_SELECT = `
  id,
  supplier_number,
  supplier_type,
  category,
  display_name,
  name,
  city,
  country,
  rating,
  status,
  is_preferred,
  is_deleted,
  contact_name,
  contact,
  phone,
  whatsapp_phone,
  email,
  coverage_area
`;

const SENSITIVE_DETAIL_SELECT = `
  legal_name,
  vat_registration_status,
  vat_number,
  cr_number,
  payment_terms,
  notes,
  blacklisted_reason,
  blacklisted_at
`;

const BANK_DETAIL_SELECT = `
  bank_name,
  bank_account_name,
  iban
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function detailSelect(canViewSensitive: boolean, canReadBank: boolean) {
  return [
    SUPPLIER_DETAIL_SELECT,
    canViewSensitive ? SENSITIVE_DETAIL_SELECT : "",
    canReadBank ? BANK_DETAIL_SELECT : "",
  ]
    .filter(Boolean)
    .join(",");
}

function supplierSearchFilter(search: string) {
  return ["display_name", "name", "supplier_number", "category", "city", "country"]
    .map((column) => `${column}.ilike.*${search}*`)
    .join(",");
}

function emptySupplierListResult(): SuppliersListResult {
  return {
    suppliers: [],
    pagination: { page: 1, pageSize: SUPPLIER_PAGE_SIZE, total: 0, totalPages: 1 },
  };
}

function mapSupplierOption(row: unknown): SupplierOption | null {
  if (!isRecord(row)) return null;

  const id = readString(row.id);
  const name =
    readString(row.display_name) ??
    readString(row.name) ??
    readString(row.legal_name) ??
    readString(row.contact) ??
    "Unnamed Supplier";

  return id ? { id, name } : null;
}

export async function getSuppliersList(
  options: SupplierListQuery = {},
): Promise<SuppliersListResult> {
  await requirePermission("suppliers:read");

  if (options.includeDeleted) {
    await requirePermission("suppliers:delete");
  }

  try {
    const supabase = createAdminClient();
    const search = normalizeSupplierListSearch(options.search);
    let countRequest = supabase
      .from("suppliers")
      .select("id", { count: "exact", head: true });

    countRequest = options.includeDeleted
      ? countRequest.eq("is_deleted", true)
      : countRequest.eq("is_deleted", false).is("deleted_at", null);
    if (options.status) countRequest = countRequest.eq("status", options.status);
    if (options.category) countRequest = countRequest.eq("category", options.category);
    if (search) countRequest = countRequest.or(supplierSearchFilter(search));

    const { count, error: countError } = await countRequest;

    if (countError) {
      console.error("[getSuppliersList] Count error:", countError.message);
      return { ...emptySupplierListResult(), error: "suppliers_load_failed" };
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / SUPPLIER_PAGE_SIZE));
    const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
    const rangeStart = (page - 1) * SUPPLIER_PAGE_SIZE;

    let dataRequest = supabase
      .from("suppliers")
      .select(SUPPLIER_DIRECTORY_SELECT)
      .order("is_preferred", { ascending: false })
      .order("name", { ascending: true });

    dataRequest = options.includeDeleted
      ? dataRequest.eq("is_deleted", true)
      : dataRequest.eq("is_deleted", false).is("deleted_at", null);
    if (options.status) dataRequest = dataRequest.eq("status", options.status);
    if (options.category) dataRequest = dataRequest.eq("category", options.category);
    if (search) dataRequest = dataRequest.or(supplierSearchFilter(search));

    const { data, error } = await dataRequest.range(
      rangeStart,
      rangeStart + SUPPLIER_PAGE_SIZE - 1,
    );

    if (error) {
      console.error("[getSuppliersList] Data error:", error.message);
      return { ...emptySupplierListResult(), error: "suppliers_load_failed" };
    }

    const suppliers = Array.isArray(data) ? data.map(mapRowToSupplierDirectoryItem) : [];
    return {
      suppliers,
      pagination: { page, pageSize: SUPPLIER_PAGE_SIZE, total, totalPages },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getSuppliersList] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { ...emptySupplierListResult(), error: "suppliers_load_failed" };
  }
}

export async function getSupplierById(
  id: string,
  options: { includeDeleted?: boolean } = {},
): Promise<{ supplier: Supplier | null; error?: string }> {
  await requirePermission("suppliers:read");

  if (options.includeDeleted) {
    await requirePermission("suppliers:delete");
  }

  const [canViewSensitive, canReadBank] = await Promise.all([
    checkPermission("suppliers:write"),
    checkPermission("suppliers:read_bank"),
  ]);

  try {
    const supabase = createAdminClient();
    let request = supabase
      .from("suppliers")
      .select(detailSelect(canViewSensitive, canReadBank))
      .eq("id", id);

    request = options.includeDeleted
      ? request.eq("is_deleted", true)
      : request.eq("is_deleted", false).is("deleted_at", null);

    const { data, error } = await request.maybeSingle();

    if (error) {
      console.error("[getSupplierById] Supabase error:", error.message);
      return { supplier: null, error: "supplier_load_failed" };
    }

    if (!data) return { supplier: null };

    return {
      supplier: mapRowToSupplier(data, { canViewSensitive, canReadBank }),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getSupplierById] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { supplier: null, error: "supplier_load_failed" };
  }
}

export async function getActiveSupplierOptions(): Promise<{ suppliers: SupplierOption[]; error?: string }> {
  await requirePermission("supplier_allocations:write");
  await requirePermission("suppliers:read");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name, display_name, legal_name, contact")
      .eq("status", "active")
      .eq("is_deleted", false)
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      console.error("[getActiveSupplierOptions] Supabase error:", error.message);
      return { suppliers: [], error: "suppliers_load_failed" };
    }

    const suppliers = Array.isArray(data)
      ? data.map(mapSupplierOption).filter((supplier): supplier is SupplierOption => supplier !== null)
      : [];

    return { suppliers };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getActiveSupplierOptions] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { suppliers: [], error: "suppliers_load_failed" };
  }
}
