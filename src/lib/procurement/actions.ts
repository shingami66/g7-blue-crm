"use server";

import { revalidatePath } from "next/cache";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  procurementCandidateSchema,
  procurementRequirementSchema,
  procurementSelectionSchema,
} from "./schemas";
import type {
  ProcurementCandidateInput,
  ProcurementRequirementInput,
  ProcurementSelectionInput,
} from "./types";

export type ProcurementActionResult<T = void> =
  | { success: true; data: T; code?: undefined; error?: undefined }
  | { success: false; code: string; error: string; data?: undefined };

function firstValidationError(parsed: { error: { issues: { message: string }[] } }) {
  return parsed.error.issues[0]?.message ?? "Validation failed";
}

function oneRow<T>(data: T[] | null): T | null {
  return Array.isArray(data) && data.length === 1 ? data[0] ?? null : null;
}

function rpcFailure<T>(code = "PROCUREMENT_WRITE_FAILED"): ProcurementActionResult<T> {
  return { success: false, code, error: code };
}

function handleException<T>(error: unknown, action: string): ProcurementActionResult<T> {
  if (error instanceof UnauthorizedError) return { success: false, code: "UNAUTHORIZED", error: "Unauthorized" };
  if (error instanceof ForbiddenError) return { success: false, code: "FORBIDDEN", error: "Forbidden" };
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[a-z0-9_]+$/u.test(code)) return rpcFailure(code);
  }
  console.error(`[${action}] Unexpected error:`, error instanceof Error ? error.message : "Unknown");
  return rpcFailure();
}

function revalidateService(serviceId: string) {
  revalidatePath("/services");
  revalidatePath(`/services/${serviceId}`);
}

export async function upsertProcurementRequirement(
  input: unknown,
): Promise<ProcurementActionResult<{ requirementId: string; serviceId: string; selectionStatus: string; idempotent: boolean }>> {
  try {
    const user = await requirePermission("supplier_costing:write");
    const parsed = procurementRequirementSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };

    const value: ProcurementRequirementInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("upsert_service_procurement_requirement", {
      p_requirement_id: value.requirementId ?? null,
      p_service_id: value.serviceId,
      p_requirement: value.requirement,
      p_sourcing_path: value.sourcingPath,
      p_sourcing_reason: value.sourcingReason,
      p_sourcing_evidence: value.sourcingEvidence,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[upsertProcurementRequirement] Supabase error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);

    revalidateService(row.service_id);
    return {
      success: true,
      data: {
        requirementId: row.requirement_id,
        serviceId: row.service_id,
        selectionStatus: row.selection_status,
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "upsertProcurementRequirement");
  }
}

export async function upsertProcurementCandidate(
  input: unknown,
): Promise<ProcurementActionResult<{ requirementId: string; supplierId: string; serviceId: string; idempotent: boolean }>> {
  try {
    const user = await requirePermission("supplier_costing:write");
    const parsed = procurementCandidateSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };

    const value: ProcurementCandidateInput = parsed.data;
    let quotedAmount = value.quotedAmount ?? null;
    let comparisonNotes = value.comparisonNotes ?? null;

    if (quotedAmount === null || comparisonNotes === null) {
      const { data: existingCandidate } = await createAdminClient()
        .from("service_procurement_candidates")
        .select("quoted_amount, comparison_notes")
        .eq("requirement_id", value.requirementId)
        .eq("supplier_id", value.supplierId)
        .maybeSingle();

      if (existingCandidate) {
        if (quotedAmount === null && existingCandidate.quoted_amount !== null) {
          quotedAmount = Number(existingCandidate.quoted_amount);
        }
        if (comparisonNotes === null && existingCandidate.comparison_notes !== null) {
          comparisonNotes = existingCandidate.comparison_notes;
        }
      }
    }

    const { data, error } = await createAdminClient().rpc("upsert_service_procurement_candidate", {
      p_requirement_id: value.requirementId,
      p_supplier_id: value.supplierId,
      p_offer_summary: value.offerSummary,
      p_evidence_ref: value.evidenceRef,
      p_quoted_amount: quotedAmount,
      p_currency: "SAR",
      p_comparison_notes: comparisonNotes,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[upsertProcurementCandidate] Supabase error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);

    revalidateService(row.service_id);
    return {
      success: true,
      data: {
        requirementId: row.requirement_id,
        supplierId: row.supplier_id,
        serviceId: row.service_id,
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "upsertProcurementCandidate");
  }
}

export async function selectProcurementSupplier(
  input: unknown,
): Promise<ProcurementActionResult<{ requirementId: string; supplierId: string; idempotent: boolean }>> {
  try {
    const user = await requirePermission("supplier_costing:write");
    const parsed = procurementSelectionSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };

    const value: ProcurementSelectionInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("select_service_procurement_supplier", {
      p_requirement_id: value.requirementId,
      p_supplier_id: value.supplierId,
      p_selection_reason: value.selectionReason,
      p_selection_evidence: value.selectionEvidence,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[selectProcurementSupplier] Supabase error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);

    revalidateService(row.service_id);
    return {
      success: true,
      data: { requirementId: row.requirement_id, supplierId: row.selected_supplier_id, idempotent: row.idempotent_replay },
    };
  } catch (error) {
    return handleException(error, "selectProcurementSupplier");
  }
}
