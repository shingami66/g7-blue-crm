import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { mapRowToService } from "./mappers";
import type { Service } from "@/types/service";
import type { ServiceRowWithCustomer } from "./types";

const SERVICE_SELECT = "*, customers(company, contact)";

export async function getServices(): Promise<Service[]> {
  await requirePermission("services:read");

  try {
    const supabase = createAdminClient();
    const { data: serviceRows, error } = await supabase
      .from("services")
      .select(SERVICE_SELECT)
      .is("deleted_at", null)
      .order("service_number", { ascending: true });

    if (error) {
      console.error("[getServices] Supabase error:", error.message);
      return [];
    }

    return (serviceRows ?? []).map((serviceRow) =>
      mapRowToService(serviceRow as ServiceRowWithCustomer)
    );
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getServices] Unexpected error:", err instanceof Error ? err.message : "Unknown");
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
