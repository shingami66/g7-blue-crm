import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ProcurementCandidate,
  ProcurementCandidateRow,
  ProcurementRequirement,
  ProcurementRequirementRow,
  ProcurementRequirementsResult,
  ProcurementSupplierOption,
} from "./types";

export function mapProcurementCandidate(
  candidate: ProcurementCandidateRow,
  supplierName = "Unknown supplier",
): ProcurementCandidate {
  return {
    supplierId: candidate.supplier_id,
    supplierName,
    offerSummary: candidate.offer_summary,
    evidenceRef: candidate.evidence_ref,
    quotedAmount: candidate.quoted_amount === null ? null : Number(candidate.quoted_amount),
    currency: "SAR",
    comparisonNotes: candidate.comparison_notes,
    createdAt: candidate.created_at,
    updatedAt: candidate.updated_at,
  };
}

export function mapProcurementRequirement(
  row: ProcurementRequirementRow,
  candidates: ProcurementCandidate[] = [],
  selectedSupplierName: string | null = null,
): ProcurementRequirement {
  return {
    id: row.id,
    serviceId: row.service_id,
    requirement: row.requirement,
    sourcingPath: row.sourcing_path,
    sourcingReason: row.sourcing_reason,
    sourcingEvidence: row.sourcing_evidence,
    selectionStatus: row.selection_status,
    selectedSupplierId: row.selected_supplier_id,
    selectedSupplierName,
    selectionReason: row.selection_reason,
    selectionEvidence: row.selection_evidence,
    selectedAt: row.selected_at,
    selectedBy: row.selected_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    candidates,
  };
}

export async function getProcurementRequirementsByServiceId(
  serviceId: string,
): Promise<ProcurementRequirementsResult> {
  const supabase = createAdminClient();

  try {
    const { data: requirementRows, error: requirementError } = await supabase
      .from("service_procurement_requirements")
      .select("*")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: true });

    if (requirementError) {
      console.error("[getProcurementRequirementsByServiceId] Requirement lookup error:", requirementError.message);
      return { requirements: [], error: "procurement_requirements_load_failed" };
    }

    const requirementIds = (requirementRows ?? []).map((row) => row.id);
    if (requirementIds.length === 0) return { requirements: [] };

    const { data: candidateRows, error: candidateError } = await supabase
      .from("service_procurement_candidates")
      .select("*")
      .in("requirement_id", requirementIds)
      .order("created_at", { ascending: true });

    if (candidateError) {
      console.error("[getProcurementRequirementsByServiceId] Candidate lookup error:", candidateError.message);
      return { requirements: [], error: "procurement_requirements_load_failed" };
    }

    const candidates = (candidateRows ?? []) as ProcurementCandidateRow[];
    const supplierIds = Array.from(
      new Set(
        candidates
          .map((candidate) => candidate.supplier_id)
          .concat((requirementRows ?? []).map((row) => row.selected_supplier_id).filter((id): id is string => Boolean(id))),
      ),
    );

    const supplierMap = new Map<string, string>();
    if (supplierIds.length > 0) {
      const { data: supplierRows } = await supabase
        .from("suppliers")
        .select("id, name")
        .in("id", supplierIds);

      for (const supplier of supplierRows ?? []) {
        supplierMap.set(supplier.id, supplier.name);
      }
    }

    const candidatesByRequirement = new Map<string, ProcurementCandidate[]>();
    for (const candidate of candidates) {
      const existing = candidatesByRequirement.get(candidate.requirement_id) ?? [];
      existing.push(mapProcurementCandidate(candidate, supplierMap.get(candidate.supplier_id)));
      candidatesByRequirement.set(candidate.requirement_id, existing);
    }

    return {
      requirements: ((requirementRows ?? []) as ProcurementRequirementRow[]).map((row: ProcurementRequirementRow) =>
        mapProcurementRequirement(
          row,
          candidatesByRequirement.get(row.id) ?? [],
          row.selected_supplier_id ? supplierMap.get(row.selected_supplier_id) ?? null : null,
        )
      ),
    };
  } catch (error) {
    console.error("[getProcurementRequirementsByServiceId] Unexpected error:", error);
    return { requirements: [], error: "procurement_requirements_load_failed" };
  }
}

export async function getActiveProcurementSupplierOptions(): Promise<{
  suppliers: ProcurementSupplierOption[];
  error?: string;
}> {
  const supabase = createAdminClient();
  try {
    const { data, error } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) {
      console.error("[getActiveProcurementSupplierOptions] Error:", error.message);
      return { suppliers: [], error: "supplier_options_load_failed" };
    }
    return { suppliers: data ?? [] };
  } catch (error) {
    console.error("[getActiveProcurementSupplierOptions] Unexpected error:", error);
    return { suppliers: [], error: "supplier_options_load_failed" };
  }
}
