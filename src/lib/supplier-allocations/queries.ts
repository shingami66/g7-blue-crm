import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { mapSupplierAllocationRow, mapSupplierAllocationRows } from "./mappers";
import type { SupplierAllocation, SupplierAllocationRow } from "./types";

/**
 * Supplier allocation costs are internal only.
 * All reads require supplier_allocations:read.
 * Cost fields require supplier_allocations:read_cost and are redacted by mapper when missing.
 * Customer-facing routes/PDFs must not import allocation read queries for cost-bearing data.
 */

export async function getSupplierAllocationsByServiceId(
  serviceId: string,
  options?: { includeDeleted?: boolean }
): Promise<SupplierAllocation[]> {
  await requirePermission("supplier_allocations:read");
  const canReadCost = await checkPermission("supplier_allocations:read_cost");

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("service_supplier_allocations")
      .select("*, supplier:suppliers(name, display_name, legal_name, contact)")
      .eq("service_id", serviceId);

    if (!options?.includeDeleted) {
      query = query.eq("is_deleted", false);
    }

    const { data: rows, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[getSupplierAllocationsByServiceId] Supabase error:", error.message);
      return [];
    }

    return mapSupplierAllocationRows((rows ?? []) as SupplierAllocationRow[], { canReadCost });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getSupplierAllocationsByServiceId] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return [];
  }
}

export async function getSupplierAllocationsBySupplierId(
  supplierId: string,
  options?: { includeDeleted?: boolean }
): Promise<SupplierAllocation[]> {
  await requirePermission("supplier_allocations:read");
  const canReadCost = await checkPermission("supplier_allocations:read_cost");

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("service_supplier_allocations")
      .select("*, supplier:suppliers(name, display_name, legal_name, contact)")
      .eq("supplier_id", supplierId);

    if (!options?.includeDeleted) {
      query = query.eq("is_deleted", false);
    }

    const { data: rows, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[getSupplierAllocationsBySupplierId] Supabase error:", error.message);
      return [];
    }

    return mapSupplierAllocationRows((rows ?? []) as SupplierAllocationRow[], { canReadCost });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getSupplierAllocationsBySupplierId] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return [];
  }
}

export async function getSupplierAllocationById(
  id: string,
  options?: { includeDeleted?: boolean }
): Promise<SupplierAllocation | null> {
  await requirePermission("supplier_allocations:read");
  const canReadCost = await checkPermission("supplier_allocations:read_cost");

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("service_supplier_allocations")
      .select("*, supplier:suppliers(name, display_name, legal_name, contact)")
      .eq("id", id);

    if (!options?.includeDeleted) {
      query = query.eq("is_deleted", false);
    }

    const { data: row, error } = await query.maybeSingle();

    if (error) {
      console.error("[getSupplierAllocationById] Supabase error:", error.message);
      return null;
    }

    return row ? mapSupplierAllocationRow(row as SupplierAllocationRow, { canReadCost }) : null;
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getSupplierAllocationById] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return null;
  }
}
