import type { z } from "zod";
import type {
  procurementCandidateSchema,
  procurementRequirementSchema,
  procurementSelectionSchema,
} from "./schemas";

export const PROCUREMENT_SOURCING_PATHS = [
  "make",
  "rent",
  "buy",
  "source",
  "sole_source",
  "emergency",
] as const;

export type ProcurementSourcingPath = (typeof PROCUREMENT_SOURCING_PATHS)[number];
export type ProcurementSelectionStatus = "open" | "selected";

export interface ProcurementCandidateRow {
  requirement_id: string;
  supplier_id: string;
  offer_summary: string;
  evidence_ref: string;
  quoted_amount: number | string | null;
  currency: string;
  comparison_notes: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface ProcurementCandidateDocumentRow {
  document_id: string;
  requirement_id: string;
  supplier_id: string;
  attached_by: string;
  attached_at: string;
}

export interface ProcurementRequirementRow {
  id: string;
  service_id: string;
  requirement: string;
  sourcing_path: ProcurementSourcingPath;
  sourcing_reason: string;
  sourcing_evidence: string;
  selection_status: ProcurementSelectionStatus;
  selected_supplier_id: string | null;
  selection_reason: string | null;
  selection_evidence: string | null;
  selected_at: string | null;
  selected_by: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface ProcurementSupplierOption {
  id: string;
  name: string;
}

export interface ProcurementCandidate {
  supplierId: string;
  supplierName: string;
  offerSummary: string;
  evidenceRef: string;
  quotedAmount: number | null;
  currency: "SAR";
  comparisonNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementRequirement {
  id: string;
  serviceId: string;
  requirement: string;
  sourcingPath: ProcurementSourcingPath;
  sourcingReason: string;
  sourcingEvidence: string;
  selectionStatus: ProcurementSelectionStatus;
  selectedSupplierId: string | null;
  selectedSupplierName: string | null;
  selectionReason: string | null;
  selectionEvidence: string | null;
  selectedAt: string | null;
  selectedBy: string | null;
  createdAt: string;
  updatedAt: string;
  candidates: ProcurementCandidate[];
}

export type ProcurementRequirementInput = z.infer<typeof procurementRequirementSchema>;
export type ProcurementCandidateInput = z.infer<typeof procurementCandidateSchema>;
export type ProcurementSelectionInput = z.infer<typeof procurementSelectionSchema>;

export type ProcurementRequirementsResult = {
  requirements: ProcurementRequirement[];
  error?: "procurement_requirements_load_failed";
};
