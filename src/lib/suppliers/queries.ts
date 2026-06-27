import "server-only";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToSupplier } from "./mappers";
import type { Supplier, SupplierStatus } from "@/types/supplier";
import type { SupplierRow, SuppliersListResult } from "./types";

const SUPPLIER_LIST_SELECT = `
  id,
  supplier_number,
  supplier_type,
  category,
  legal_name,
  display_name,
  contact_name,
  whatsapp_phone,
  email,
  city,
  country,
  coverage_area,
  name,
  service,
  contact,
  phone,
  rating,
  status,
  recent_project,
  vat_registration_status,
  is_preferred,
  created_at,
  updated_at
`;

const STATUS_SORT_ORDER: Record<SupplierStatus, number> = {
  active: 0,
  on_hold: 1,
  blacklisted: 2,
  inactive: 3,
};

function sortSuppliers(a: Supplier, b: Supplier) {
  if (a.isPreferred !== b.isPreferred) {
    return a.isPreferred ? -1 : 1;
  }

  const statusDelta = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
  if (statusDelta !== 0) return statusDelta;

  return a.name.localeCompare(b.name);
}

export async function getSuppliersList(): Promise<SuppliersListResult> {
  await requirePermission("suppliers:read");

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("suppliers")
      .select(SUPPLIER_LIST_SELECT)
      .eq("is_deleted", false)
      .is("deleted_at", null)
      .order("is_preferred", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("[getSuppliersList] Supabase error:", error.message);
      return { suppliers: [], error: "suppliers_load_failed" };
    }

    return {
      suppliers: ((data ?? []) as unknown as SupplierRow[])
        .map(mapRowToSupplier)
        .sort(sortSuppliers),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getSuppliersList] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { suppliers: [], error: "suppliers_load_failed" };
  }
}
