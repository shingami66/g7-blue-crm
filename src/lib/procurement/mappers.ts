import type {
  ProcurementCandidate,
  ProcurementCandidateRow,
  ProcurementRequirement,
  ProcurementRequirementRow,
} from "./types";

type SupplierLookup = {
  name: string;
};

export function mapProcurementCandidate(
  row: ProcurementCandidateRow,
  supplier: SupplierLookup | undefined,
): ProcurementCandidate {
  return {
    supplierId: row.supplier_id,
    supplierName: supplier?.name ?? row.supplier_id,
    offerSummary: row.offer_summary,
    evidenceRef: row.evidence_ref,
    quotedAmount: row.quoted_amount === null ? null : Number(row.quoted_amount),
    currency: "SAR",
    comparisonNotes: row.comparison_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProcurementRequirement(
  row: ProcurementRequirementRow,
  candidates: ProcurementCandidate[],
  selectedSupplierName: string | null,
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
