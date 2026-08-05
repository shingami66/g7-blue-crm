"use server";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { mapRowToSupplierRateCard } from "./rate-card-mappers";
import { findRateCardOverlap, type RateCardOverlapCandidate } from "./rate-card-overlap";
import { supplierRateCardCreateSchema, supplierRateCardIdSchema, supplierRateCardUpdateSchema } from "./rate-card-schemas";
import type { SupplierRateCardActionResult, SupplierRateCardsListResult, SupplierRateCardRow } from "./rate-card-types";

const RATE_CARD_SELECT = `
  id,
  supplier_id,
  category,
  item_name,
  unit,
  currency,
  base_cost,
  valid_from,
  valid_to,
  status,
  notes,
  created_at,
  updated_at
`;

export async function getSupplierRateCards(supplierId: string): Promise<SupplierRateCardsListResult> {
  await requirePermission("supplier_costing:read");

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("supplier_rate_cards")
      .select(RATE_CARD_SELECT)
      .eq("supplier_id", supplierId)
      .eq("is_deleted", false);

    if (error) {
      console.error("[getSupplierRateCards] Supabase error:", error.message);
      return { rateCards: [], error: "rate_cards_load_failed" };
    }

    const rows = (data ?? []) as unknown as SupplierRateCardRow[];
    
    // Sort in memory because Supabase JS order doesn't easily do status='active' first without custom SQL or complex case logic
    const sorted = rows.map(mapRowToSupplierRateCard).sort((a, b) => {
      // 1. Status: active first
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      
      // 2. valid_from desc
      const dateA = new Date(a.validFrom).getTime();
      const dateB = new Date(b.validFrom).getTime();
      if (dateA !== dateB) return dateB - dateA;
      
      // 3. created_at desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return { rateCards: sorted };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      // Don't swallow auth errors, let them propagate or handle explicitly
      throw err;
    }
    console.error("[getSupplierRateCards] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { rateCards: [], error: "rate_cards_load_failed" };
  }
}

export async function getActiveSupplierRateCardsForAllocation(supplierId: string): Promise<SupplierRateCardsListResult> {
  await requirePermission("supplier_costing:read");

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("supplier_rate_cards")
      .select(RATE_CARD_SELECT)
      .eq("supplier_id", supplierId)
      .eq("is_deleted", false)
      .eq("status", "active");

    if (error) {
      console.error("[getActiveSupplierRateCardsForAllocation] Supabase error:", error.message);
      return { rateCards: [], error: "rate_cards_load_failed" };
    }

    const rows = (data ?? []) as unknown as SupplierRateCardRow[];
    
    // Allocation options must be currently effective, not merely unexpired.
    const today = new Date().toISOString().split("T")[0];
    const currentRows = rows.filter(
      (row) =>
        row.valid_from <= today && (!row.valid_to || row.valid_to >= today),
    );

    const sorted = currentRows.map(mapRowToSupplierRateCard).sort((a, b) => {
      // valid_from desc
      const dateA = new Date(a.validFrom).getTime();
      const dateB = new Date(b.validFrom).getTime();
      if (dateA !== dateB) return dateB - dateA;
      
      // created_at desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return { rateCards: sorted };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }
    console.error("[getActiveSupplierRateCardsForAllocation] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { rateCards: [], error: "rate_cards_load_failed" };
  }
}

type StoredRateCard = SupplierRateCardRow & { is_deleted?: boolean };

async function requireRateCardWriter() {
  const user = await requirePermission("supplier_costing:read");
  await requirePermission("supplier_costing:write");
  return user;
}

async function readRateCard(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("supplier_rate_cards")
    .select(`${RATE_CARD_SELECT}, is_deleted`)
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle();
  return { row: data as unknown as StoredRateCard | null, error };
}

async function readSupplierRateCards(supplierId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("supplier_rate_cards")
    .select(`${RATE_CARD_SELECT}, is_deleted`)
    .eq("supplier_id", supplierId)
    .eq("is_deleted", false);
  return { rows: (data ?? []) as unknown as StoredRateCard[], error };
}

async function supplierExists(supplierId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("id")
    .eq("id", supplierId)
    .eq("is_deleted", false)
    .is("deleted_at", null)
    .maybeSingle();
  return !error && Boolean(data);
}

function overlapCandidate(input: { supplierId: string; category: string | null; itemName: string; unit: string; currency: string; validFrom: string; validTo?: string | null; status?: "active" | "inactive" }, id?: string): RateCardOverlapCandidate {
  return { ...input, id, validTo: input.validTo ?? null };
}

function conflictCandidate(row: StoredRateCard): RateCardOverlapCandidate {
  return { id: row.id, supplierId: row.supplier_id, category: row.category, itemName: row.item_name, unit: row.unit, currency: row.currency, validFrom: row.valid_from, validTo: row.valid_to, status: row.status, isDeleted: row.is_deleted };
}

async function findConflict(candidate: RateCardOverlapCandidate) {
  const result = await readSupplierRateCards(candidate.supplierId);
  if (result.error) return { error: "write_failed" as const, conflict: null };
  return { error: null, conflict: findRateCardOverlap(candidate, result.rows.map(conflictCandidate)) };
}

function revalidateRateCardPaths(supplierId: string) {
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${supplierId}`);
}

export async function createSupplierRateCard(input: unknown): Promise<SupplierRateCardActionResult> {
  try {
    const user = await requireRateCardWriter();
    const parsed = supplierRateCardCreateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "validation_failed" };
    if (!(await supplierExists(parsed.data.supplierId))) return { success: false, error: "not_found" };

    const candidate = overlapCandidate({ ...parsed.data, category: parsed.data.category ?? null, validTo: parsed.data.validTo ?? null }, undefined);
    if (parsed.data.status === "active") {
      const result = await findConflict(candidate);
      if (result.error) return { success: false, error: result.error };
      if (result.conflict) return { success: false, error: "overlap", conflict: result.conflict };
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("supplier_rate_cards").insert({
      supplier_id: parsed.data.supplierId,
      category: parsed.data.category,
      item_name: parsed.data.itemName,
      unit: parsed.data.unit,
      currency: parsed.data.currency,
      base_cost: parsed.data.baseCost,
      valid_from: parsed.data.validFrom,
      valid_to: parsed.data.validTo ?? null,
      status: parsed.data.status,
      notes: parsed.data.notes ?? null,
      created_by: user.clerk_user_id,
      updated_by: user.clerk_user_id,
    });
    if (error) {
      console.error("[createSupplierRateCard] Supabase error:", error.message);
      return { success: false, error: "write_failed" };
    }
    revalidateRateCardPaths(parsed.data.supplierId);
    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "unauthorized" };
    if (error instanceof ForbiddenError) return { success: false, error: "forbidden" };
    console.error("[createSupplierRateCard] Unexpected error:", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: "write_failed" };
  }
}

export async function updateSupplierRateCard(input: unknown): Promise<SupplierRateCardActionResult> {
  try {
    const user = await requireRateCardWriter();
    const parsed = supplierRateCardUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "validation_failed" };
    const existing = await readRateCard(parsed.data.id);
    if (existing.error || !existing.row) return { success: false, error: "not_found" };

    const candidate = overlapCandidate({ ...parsed.data, category: parsed.data.category ?? null, validTo: parsed.data.validTo ?? null }, parsed.data.id);
    if (existing.row.status === "active") {
      const result = await findConflict(candidate);
      if (result.error) return { success: false, error: result.error };
      if (result.conflict) return { success: false, error: "overlap", conflict: result.conflict };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.from("supplier_rate_cards").update({
      category: parsed.data.category,
      item_name: parsed.data.itemName,
      unit: parsed.data.unit,
      currency: parsed.data.currency,
      base_cost: parsed.data.baseCost,
      valid_from: parsed.data.validFrom,
      valid_to: parsed.data.validTo ?? null,
      notes: parsed.data.notes ?? null,
      updated_by: user.clerk_user_id,
    }).eq("id", parsed.data.id).eq("is_deleted", false).select("supplier_id").maybeSingle();
    if (error || !data) {
      if (error) console.error("[updateSupplierRateCard] Supabase error:", error.message);
      return { success: false, error: "write_failed" };
    }
    revalidateRateCardPaths(String(data.supplier_id));
    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "unauthorized" };
    if (error instanceof ForbiddenError) return { success: false, error: "forbidden" };
    console.error("[updateSupplierRateCard] Unexpected error:", error instanceof Error ? error.message : "Unknown");
    return { success: false, error: "write_failed" };
  }
}

async function setRateCardStatus(idInput: unknown, status: "active" | "inactive"): Promise<SupplierRateCardActionResult> {
  try {
    const user = await requireRateCardWriter();
    const parsed = supplierRateCardIdSchema.safeParse(idInput);
    if (!parsed.success) return { success: false, error: "validation_failed" };
    const existing = await readRateCard(parsed.data.id);
    if (existing.error || !existing.row) return { success: false, error: "not_found" };
    if (status === "active") {
      const result = await findConflict({ id: existing.row.id, supplierId: existing.row.supplier_id, category: existing.row.category, itemName: existing.row.item_name, unit: existing.row.unit, currency: existing.row.currency, validFrom: existing.row.valid_from, validTo: existing.row.valid_to, status });
      if (result.error) return { success: false, error: result.error };
      if (result.conflict) return { success: false, error: "overlap", conflict: result.conflict };
    }
    const supabase = createAdminClient();
    const { error } = await supabase.from("supplier_rate_cards").update({ status, updated_by: user.clerk_user_id }).eq("id", parsed.data.id).eq("is_deleted", false);
    if (error) {
      console.error(`[setSupplierRateCardStatus:${status}] Supabase error:`, error.message);
      return { success: false, error: "write_failed" };
    }
    revalidateRateCardPaths(existing.row.supplier_id);
    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { success: false, error: "unauthorized" };
    if (error instanceof ForbiddenError) return { success: false, error: "forbidden" };
    console.error(`[setSupplierRateCardStatus:${status}] Unexpected error:`, error instanceof Error ? error.message : "Unknown");
    return { success: false, error: "write_failed" };
  }
}

export async function activateSupplierRateCard(input: unknown) {
  return setRateCardStatus(input, "active");
}

export async function deactivateSupplierRateCard(input: unknown) {
  return setRateCardStatus(input, "inactive");
}
