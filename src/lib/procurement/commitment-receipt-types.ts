export const COMMITMENT_SOURCES = [
  "purchase_order",
  "approved_contract",
  "supplier_quotation",
  "other_authorized",
] as const;

export type CommitmentSource = (typeof COMMITMENT_SOURCES)[number];
export type ApprovedCommitmentStatus = "open" | "closed" | "cancelled";
export type CommitmentAmendmentType = "increase" | "reduction";
export const RECEIPT_ACCEPTANCE_STATES = [
  "PENDING",
  "ACCEPTED",
  "ACCEPTED_WITH_CONDITIONS",
  "REJECTED",
] as const;
export type ReceiptAcceptanceStatus = (typeof RECEIPT_ACCEPTANCE_STATES)[number];

export interface ApprovedCommitmentBalanceRow {
  id: string;
  service_id: string;
  supplier_id: string;
  commitment_source: CommitmentSource;
  supplier_quotation_id: string | null;
  source_reference: string | null;
  original_approved_amount: number | string;
  currency: string;
  status: ApprovedCommitmentStatus;
  approved_at: string;
  approved_by: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancelled_reason: string | null;
  closed_at: string | null;
  closed_by: string | null;
  closed_reason: string | null;
  authorized_amount: number | string;
  accepted_amount: number | string;
  pending_amount: number | string;
  open_commitment_amount: number | string;
  amendment_count: number;
  receipt_count: number;
}

export interface ApprovedCommitmentAmendmentRow {
  id: string;
  commitment_id: string;
  amendment_number: number;
  amendment_type: CommitmentAmendmentType;
  amount_delta: number | string;
  approved_amount_after: number | string;
  reason: string;
  evidence_ref: string;
  approved_at: string;
  approved_by: string;
  created_at: string;
  created_by: string;
}

export interface ServiceReceiptRow {
  id: string;
  service_id: string;
  supplier_id: string;
  commitment_id: string;
  acceptance_status: ReceiptAcceptanceStatus;
  performance_date: string;
  delivered_scope: string;
  actual_quantity: number | string | null;
  actual_hours: number | string | null;
  quantity_unit: string | null;
  received_amount: number | string | null;
  missing_scope: string | null;
  extra_scope: string | null;
  defects_incidents: string | null;
  conditions_notes: string | null;
  submitted_at: string;
  submitted_by: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface ServiceReceiptCorrectionRow {
  id: string;
  receipt_id: string;
  correction_number: number;
  prior_acceptance_status: Exclude<ReceiptAcceptanceStatus, "PENDING">;
  prior_received_amount: number | string | null;
  prior_conditions_notes: string | null;
  prior_decision_at: string;
  prior_decision_by: string;
  corrected_acceptance_status: Exclude<ReceiptAcceptanceStatus, "PENDING">;
  corrected_received_amount: number | string | null;
  corrected_conditions_notes: string | null;
  correction_reason: string;
  corrected_at: string;
  corrected_by: string;
  request_id: string;
  created_at: string;
  created_by: string;
}

export interface ProcurementEvidenceDocument {
  documentId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  attachedAt: string;
}

export interface ApprovedCommitment {
  id: string;
  serviceId: string;
  supplierId: string;
  supplierName: string;
  serviceNumber: string;
  serviceTitle: string;
  eventName: string | null;
  commitmentSource: CommitmentSource;
  supplierQuotationId: string | null;
  supplierQuotationReference: string | null;
  supplierQuotationDate: string | null;
  sourceReference: string | null;
  originalApprovedAmount: number;
  authorizedAmount: number;
  acceptedAmount: number;
  pendingAmount: number;
  openCommitmentAmount: number;
  currency: "SAR";
  status: ApprovedCommitmentStatus;
  approvedAt: string;
  approvedBy: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelledReason: string | null;
  closedAt: string | null;
  closedBy: string | null;
  closedReason: string | null;
  amendments: ApprovedCommitmentAmendment[];
  receipts: ServiceReceipt[];
  documents: ProcurementEvidenceDocument[];
}

export interface ApprovedCommitmentAmendment {
  id: string;
  commitmentId: string;
  amendmentNumber: number;
  amendmentType: CommitmentAmendmentType;
  amountDelta: number;
  approvedAmountAfter: number;
  reason: string;
  evidenceRef: string;
  approvedAt: string;
  approvedBy: string;
}

export interface ServiceReceipt {
  id: string;
  serviceId: string;
  supplierId: string;
  commitmentId: string;
  acceptanceStatus: ReceiptAcceptanceStatus;
  performanceDate: string;
  deliveredScope: string;
  actualQuantity: number | null;
  actualHours: number | null;
  quantityUnit: string | null;
  receivedAmount: number | null;
  missingScope: string | null;
  extraScope: string | null;
  defectsIncidents: string | null;
  conditionsNotes: string | null;
  submittedAt: string;
  submittedBy: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  corrections: ServiceReceiptCorrection[];
  documents: ProcurementEvidenceDocument[];
}

export interface ServiceReceiptCorrection {
  id: string;
  receiptId: string;
  correctionNumber: number;
  priorAcceptanceStatus: Exclude<ReceiptAcceptanceStatus, "PENDING">;
  priorReceivedAmount: number | null;
  priorConditionsNotes: string | null;
  priorDecisionAt: string;
  priorDecisionBy: string;
  correctedAcceptanceStatus: Exclude<ReceiptAcceptanceStatus, "PENDING">;
  correctedReceivedAmount: number | null;
  correctedConditionsNotes: string | null;
  correctionReason: string;
  correctedAt: string;
  correctedBy: string;
}

export type ApprovedCommitmentInput = {
  commitmentSource: CommitmentSource;
  serviceId: string;
  supplierId: string;
  supplierQuotationId: string | null;
  sourceReference: string | null;
  originalApprovedAmount: number;
  approvedAt: string;
  requestId: string;
};

export type CommitmentAmendmentInput = {
  commitmentId: string;
  amendmentType: CommitmentAmendmentType;
  amount: number;
  reason: string;
  evidenceRef: string;
  requestId: string;
};

export type CommitmentTransitionInput = {
  commitmentId: string;
  action: "close" | "cancel" | "reopen";
  reason: string;
  requestId: string;
};

export type ServiceReceiptInput = {
  serviceId: string;
  commitmentId: string;
  performanceDate: string;
  deliveredScope: string;
  actualQuantity: number | null;
  actualHours: number | null;
  quantityUnit: string | null;
  receivedAmount: number | null;
  missingScope: string | null;
  extraScope: string | null;
  defectsIncidents: string | null;
  conditionsNotes: string | null;
  requestId: string;
};

export type ServiceReceiptReviewInput = {
  receiptId: string;
  acceptanceStatus: Exclude<ReceiptAcceptanceStatus, "PENDING">;
  conditionsNotes: string | null;
  requestId: string;
};

export type ServiceReceiptCorrectionInput = {
  receiptId: string;
  correctedAcceptanceStatus: Exclude<ReceiptAcceptanceStatus, "PENDING">;
  correctedReceivedAmount: number | null;
  correctedConditionsNotes: string | null;
  correctionReason: string;
  requestId: string;
};

export type EvidenceDocumentsInput = {
  commitmentId?: string;
  receiptId?: string;
  documentIds: string[];
  requestId: string;
};

export type ProcurementCommitmentActionResult<T = void> =
  | { success: true; data: T; code?: undefined; error?: undefined }
  | { success: false; code: string; error: string; data?: undefined };

export type ApprovedCommitmentsResult = {
  commitments: ApprovedCommitment[];
  error?: "approved_commitments_load_failed";
};

export type ApprovedCommitmentDetailResult = {
  commitment: ApprovedCommitment | null;
  error?: "approved_commitment_detail_load_failed";
};

export type SupplierQuotationCommitmentOption = {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierReference: string | null;
  quotationDate: string | null;
};
