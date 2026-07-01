import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { mapSupplierBookingRow, mapSupplierBookingRows } from "./mappers";
import type { SupplierBooking, SupplierBookingRow } from "./types";

/**
 * Supplier Booking queries are internal-only.
 * Do not import into quotation PDFs, invoice PDFs, public routes, customer portals, or customer-facing components.
 * Supplier costs and internal details are strictly internal.
 */

export async function getSupplierBookingsByServiceId(
  serviceId: string
): Promise<SupplierBooking[]> {
  await requirePermission("supplier_bookings:read");
  const canReadCost = await checkPermission("supplier_bookings:read_cost");

  try {
    const supabase = createAdminClient();
    const query = supabase
      .from("supplier_bookings")
      .select("*, supplier:suppliers(name, display_name, legal_name, contact)")
      .eq("service_id", serviceId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    const { data: rows, error } = await query;

    if (error) {
      console.error("[getSupplierBookingsByServiceId] Supabase error:", error.message);
      return [];
    }

    return mapSupplierBookingRows((rows ?? []) as SupplierBookingRow[], {
      canReadCost,
      canReadInternalDetails: canReadCost,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getSupplierBookingsByServiceId] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return [];
  }
}

export async function getSupplierBookingsBySupplierId(
  supplierId: string
): Promise<SupplierBooking[]> {
  await requirePermission("supplier_bookings:read");
  const canReadCost = await checkPermission("supplier_bookings:read_cost");

  try {
    const supabase = createAdminClient();
    const query = supabase
      .from("supplier_bookings")
      .select("*, supplier:suppliers(name, display_name, legal_name, contact)")
      .eq("supplier_id", supplierId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    const { data: rows, error } = await query;

    if (error) {
      console.error("[getSupplierBookingsBySupplierId] Supabase error:", error.message);
      return [];
    }

    return mapSupplierBookingRows((rows ?? []) as SupplierBookingRow[], {
      canReadCost,
      canReadInternalDetails: canReadCost,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getSupplierBookingsBySupplierId] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return [];
  }
}

export async function getSupplierBookingById(
  id: string
): Promise<SupplierBooking | null> {
  await requirePermission("supplier_bookings:read");
  const canReadCost = await checkPermission("supplier_bookings:read_cost");

  try {
    const supabase = createAdminClient();
    const query = supabase
      .from("supplier_bookings")
      .select("*, supplier:suppliers(name, display_name, legal_name, contact)")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    const { data: row, error } = await query;

    if (error) {
      console.error("[getSupplierBookingById] Supabase error:", error.message);
      return null;
    }

    if (!row) return null;

    return mapSupplierBookingRow(row as SupplierBookingRow, {
      canReadCost,
      canReadInternalDetails: canReadCost,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getSupplierBookingById] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return null;
  }
}
