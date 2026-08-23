import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission, checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { mapSupplierBookingRow, mapSupplierBookingRows } from "./mappers";
import type {
  SupplierBooking,
  SupplierBookingRow,
  SupplierBookingsListResult,
} from "./types";

/**
 * Supplier Booking queries are internal-only.
 * Do not import into quotation PDFs, invoice PDFs, public routes, customer portals, or customer-facing components.
 * Supplier costs and internal details are strictly internal.
 */

export async function getSupplierBookingsByServiceId(
  serviceId: string,
  options?: { onlyActive?: boolean }
): Promise<SupplierBookingsListResult> {
  await requirePermission("supplier_bookings:read");
  const canReadCost = await checkPermission("supplier_bookings:read_cost");

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("supplier_bookings")
      .select("*, supplier:suppliers(name, display_name, legal_name, contact)")
      .eq("service_id", serviceId)
      .eq("is_deleted", false);

    if (options?.onlyActive) {
      query = query.neq("status", "cancelled");
    }

    const { data: rows, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[getSupplierBookingsByServiceId] Supabase error:", error.message);
      return { bookings: [], error: "supplier_bookings_load_failed" };
    }

    return {
      bookings: mapSupplierBookingRows((rows ?? []) as SupplierBookingRow[], {
        canReadCost,
        canReadInternalDetails: canReadCost,
      }),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getSupplierBookingsByServiceId] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return { bookings: [], error: "supplier_bookings_load_failed" };
  }
}

export async function getSupplierBookingsBySupplierId(
  supplierId: string
): Promise<SupplierBookingsListResult> {
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
      return { bookings: [], error: "supplier_bookings_load_failed" };
    }

    return {
      bookings: mapSupplierBookingRows((rows ?? []) as SupplierBookingRow[], {
        canReadCost,
        canReadInternalDetails: canReadCost,
      }),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getSupplierBookingsBySupplierId] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return { bookings: [], error: "supplier_bookings_load_failed" };
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
