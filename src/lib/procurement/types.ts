import type { z } from "zod";
import type {
  procurementCandidateSchema,
  procurementRequirementSchema,
  procurementSelectionSchema,
  supplierQuotationDetailedLineSchema,
  supplierQuotationSchema,
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

export interface SupplierQuotationRow {
  id: string;
  supplier_id: string;
  service_id: string;
  supplier_reference: string | null;
  quotation_date: string | null;
  package_total: number | string | null;
  currency: string;
  recorded_at: string;
  recorded_by: string;
  updated_at: string;
  updated_by: string;
  source_candidate_requirement_id: string | null;
  source_candidate_supplier_id: string | null;
}

export interface SupplierQuotationRequirementRow {
  quotation_id: string;
  requirement_id: string;
  service_id: string;
  line_summary: string;
  line_amount: number | string | null;
  line_evidence_ref: string | null;
  created_at: string;
  created_by: string;
}

export interface SupplierQuotationDocumentRow {
  quotation_id: string;
  document_id: string;
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

export interface SupplierQuotationDocument {
  documentId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  attachedAt: string;
}

export interface SupplierQuotationLineRow {
  id: string;
  quotation_id: string;
  service_id: string;
  package_requirement_id: string | null;
  description: string;
  quantity: number | string | null;
  unit: string | null;
  unit_price: number | string | null;
  line_total: number | string;
  sort_order: number;
  created_at: string;
  created_by: string;
}

export interface SupplierQuotationLine {
  requirementId: string;
  requirement: string;
  lineSummary: string;
  lineAmount: number | null;
  legacyEvidenceRef: string | null;
}

export interface SupplierQuotationLineItem {
  id: string;
  quotationId: string;
  serviceId: string;
  packageRequirementId: string | null;
  packageRequirementTitle?: string | null;
  description: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  lineTotal: number;
  sortOrder: number;
}

export interface SupplierQuotationHistoryRecord {
  id: string;
  supplierId: string;
  serviceId: string;
  serviceNumber: string;
  serviceTitle: string;
  eventName: string | null;
  serviceStatus: string;
  serviceDeleted: boolean;
  supplierReference: string | null;
  quotationDate: string | null;
  packageTotal: number | null;
  currency: "SAR";
  pricingMode: "legacy" | "total_only" | "detailed";
  recordedAt: string;
  updatedAt: string;
  sourceCandidateRequirementId: string | null;
  sourceCandidateSupplierId: string | null;
  requirements: SupplierQuotationLine[];
  lines: SupplierQuotationLineItem[];
  documents: SupplierQuotationDocument[];
}

export interface SupplierQuotationRequirementOption {
  requirementId: string;
  serviceId: string;
  serviceNumber: string;
  serviceTitle: string;
  eventName: string | null;
  requirement: string;
  hasExistingQuotation: boolean;
}

export interface SupplierQuotationServiceOption {
  serviceId: string;
  serviceNumber: string;
  serviceTitle: string;
  eventName: string | null;
  status: string;
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
export type SupplierQuotationDetailedLineInput = z.infer<typeof supplierQuotationDetailedLineSchema>;
export type SupplierQuotationInput = z.infer<typeof supplierQuotationSchema>;

export type ProcurementRequirementsResult = {
  requirements: ProcurementRequirement[];
  error?: "procurement_requirements_load_failed";
};

export type SupplierQuotationHistoryResult = {
  quotations: SupplierQuotationHistoryRecord[];
  error?: "supplier_quotation_history_load_failed";
};

export type SupplierQuotationDetailResult = {
  quotation: SupplierQuotationHistoryRecord | null;
  error?: "supplier_quotation_detail_load_failed";
};

export type SupplierQuotationRequirementOptionsResult = {
  requirements: SupplierQuotationRequirementOption[];
  error?: "supplier_quotation_requirements_load_failed";
};
