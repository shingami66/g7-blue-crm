import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { BUSINESS_DOCUMENT_PERMISSIONS, PROCUREMENT_COMMITMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ApprovedCommitment,
  ApprovedCommitmentAmendment,
  ApprovedCommitmentAmendmentRow,
  ApprovedCommitmentBalanceRow,
  ApprovedCommitmentsResult,
  ApprovedCommitmentDetailResult,
  ProcurementEvidenceDocument,
  ServiceReceipt,
  ServiceReceiptCorrection,
  ServiceReceiptCorrectionRow,
  ServiceReceiptRow,
  SupplierQuotationCommitmentOption,
} from "./commitment-receipt-types";

type ServiceContextRow = {
  id: string;
  service_number: string;
  service_title: string;
  event_name: string | null;
};

type SupplierContextRow = {
  id: string;
  name: string | null;
  legal_name: string | null;
};

type SupplierQuotationContextRow = {
  id: string;
  supplier_reference: string | null;
  quotation_date: string | null;
};

type DocumentMetadataRow = {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
};

type CommitmentDocumentRelation = { commitment_id: string; document_id: string; attached_at: string };
type ReceiptDocumentRelation = { receipt_id: string; document_id: string; attached_at: string };

function supplierName(row: SupplierContextRow | undefined) {
  return row?.name?.trim() || row?.legal_name?.trim() || "Supplier";
}

function amount(value: number | string | null | undefined) {
  return value === null || value === undefined ? 0 : Number(value);
}

function mapAmendment(row: ApprovedCommitmentAmendmentRow): ApprovedCommitmentAmendment {
  return {
    id: row.id,
    commitmentId: row.commitment_id,
    amendmentNumber: row.amendment_number,
    amendmentType: row.amendment_type,
    amountDelta: Number(row.amount_delta),
    approvedAmountAfter: Number(row.approved_amount_after),
    reason: row.reason,
    evidenceRef: row.evidence_ref,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
  };
}

function mapCorrection(row: ServiceReceiptCorrectionRow): ServiceReceiptCorrection {
  return {
    id: row.id,
    receiptId: row.receipt_id,
    correctionNumber: row.correction_number,
    priorAcceptanceStatus: row.prior_acceptance_status,
    priorReceivedAmount: row.prior_received_amount === null ? null : Number(row.prior_received_amount),
    priorConditionsNotes: row.prior_conditions_notes,
    priorDecisionAt: row.prior_decision_at,
    priorDecisionBy: row.prior_decision_by,
    correctedAcceptanceStatus: row.corrected_acceptance_status,
    correctedReceivedAmount: row.corrected_received_amount === null ? null : Number(row.corrected_received_amount),
    correctedConditionsNotes: row.corrected_conditions_notes,
    correctionReason: row.correction_reason,
    correctedAt: row.corrected_at,
    correctedBy: row.corrected_by,
  };
}

function mapReceipt(
  row: ServiceReceiptRow,
  documents: ProcurementEvidenceDocument[],
  corrections: ServiceReceiptCorrection[] = [],
): ServiceReceipt {
  return {
    id: row.id,
    serviceId: row.service_id,
    supplierId: row.supplier_id,
    commitmentId: row.commitment_id,
    acceptanceStatus: row.acceptance_status,
    performanceDate: row.performance_date,
    deliveredScope: row.delivered_scope,
    actualQuantity: row.actual_quantity === null ? null : Number(row.actual_quantity),
    actualHours: row.actual_hours === null ? null : Number(row.actual_hours),
    quantityUnit: row.quantity_unit,
    receivedAmount: row.received_amount === null ? null : Number(row.received_amount),
    missingScope: row.missing_scope,
    extraScope: row.extra_scope,
    defectsIncidents: row.defects_incidents,
    conditionsNotes: row.conditions_notes,
    submittedAt: row.submitted_at,
    submittedBy: row.submitted_by,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    corrections,
    documents,
  };
}

function mapCommitment(
  row: ApprovedCommitmentBalanceRow,
  service: ServiceContextRow | undefined,
  supplier: SupplierContextRow | undefined,
  quotation: SupplierQuotationContextRow | undefined,
  amendments: ApprovedCommitmentAmendment[] = [],
  receipts: ServiceReceipt[] = [],
  documents: ProcurementEvidenceDocument[] = [],
): ApprovedCommitment {
  return {
    id: row.id,
    serviceId: row.service_id,
    supplierId: row.supplier_id,
    supplierName: supplierName(supplier),
    serviceNumber: service?.service_number ?? row.service_id,
    serviceTitle: service?.service_title ?? "Service",
    eventName: service?.event_name ?? null,
    commitmentSource: row.commitment_source,
    supplierQuotationId: row.supplier_quotation_id,
    supplierQuotationReference: quotation?.supplier_reference ?? null,
    supplierQuotationDate: quotation?.quotation_date ?? null,
    sourceReference: row.source_reference,
    originalApprovedAmount: Number(row.original_approved_amount),
    authorizedAmount: Number(row.authorized_amount),
    acceptedAmount: amount(row.accepted_amount),
    pendingAmount: amount(row.pending_amount),
    openCommitmentAmount: Number(row.open_commitment_amount),
    currency: "SAR",
    status: row.status,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
    cancelledReason: row.cancelled_reason,
    closedAt: row.closed_at,
    closedBy: row.closed_by,
    closedReason: row.closed_reason,
    amendments,
    receipts,
    documents,
  };
}

async function contextRows(
  rows: ApprovedCommitmentBalanceRow[],
) {
  const supabase = createAdminClient();
  const serviceIds = Array.from(new Set(rows.map((row) => row.service_id)));
  const supplierIds = Array.from(new Set(rows.map((row) => row.supplier_id)));
  const quotationIds = Array.from(new Set(rows.flatMap((row) => row.supplier_quotation_id ? [row.supplier_quotation_id] : [])));
  const [{ data: services, error: serviceError }, { data: suppliers, error: supplierError }] = await Promise.all([
    supabase.from("services").select("id,service_number,service_title,event_name").in("id", serviceIds),
    supabase.from("suppliers").select("id,name,legal_name").in("id", supplierIds),
  ]);
  if (serviceError || supplierError) {
    if (serviceError) console.error("[contextRows] Service lookup error:", serviceError.message);
    if (supplierError) console.error("[contextRows] Supplier lookup error:", supplierError.message);
    return null;
  }
  const { data: quotations, error: quotationError } = quotationIds.length > 0
    ? await supabase.from("supplier_quotations").select("id,supplier_reference,quotation_date").in("id", quotationIds)
    : { data: [], error: null };
  if (quotationError) {
    console.error("[contextRows] Supplier quotation lookup error:", quotationError.message);
    return null;
  }
  return {
    services: new Map(((services ?? []) as ServiceContextRow[]).map((row) => [row.id, row])),
    suppliers: new Map(((suppliers ?? []) as SupplierContextRow[]).map((row) => [row.id, row])),
    quotations: new Map(((quotations ?? []) as SupplierQuotationContextRow[]).map((row) => [row.id, row])),
  };
}

async function hydrateCommitmentRows(
  rows: ApprovedCommitmentBalanceRow[],
  contexts: NonNullable<Awaited<ReturnType<typeof contextRows>>>,
): Promise<ApprovedCommitment[] | null> {
  const supabase = createAdminClient();
  const commitmentIds = rows.map((row) => row.id);
  const canReadDocuments = await checkPermission(BUSINESS_DOCUMENT_PERMISSIONS.read);
  const [{ data: amendmentRows, error: amendmentError }, { data: receiptRows, error: receiptError }, { data: commitmentDocumentRows, error: commitmentDocumentError }] = await Promise.all([
    supabase.from("approved_commitment_amendments").select("*").in("commitment_id", commitmentIds).order("amendment_number", { ascending: true }),
    supabase.from("service_receipts").select("*").in("commitment_id", commitmentIds).order("performance_date", { ascending: false }).order("id", { ascending: false }),
    canReadDocuments
      ? supabase.from("approved_commitment_documents").select("commitment_id,document_id,attached_at").in("commitment_id", commitmentIds).order("attached_at", { ascending: true })
      : Promise.resolve({ data: [] as CommitmentDocumentRelation[], error: null }),
  ]);
  if (amendmentError || receiptError || commitmentDocumentError) return null;

  const receipts = (receiptRows ?? []) as ServiceReceiptRow[];
  const commitmentDocuments = (commitmentDocumentRows ?? []) as CommitmentDocumentRelation[];
  const receiptIds = receipts.map((receipt) => receipt.id);
  const { data: correctionRows, error: correctionError } = receiptIds.length > 0
    ? await supabase.from("service_receipt_corrections").select("*").in("receipt_id", receiptIds).order("correction_number", { ascending: true })
    : { data: [], error: null };
  if (correctionError) return null;
  const correctionsByReceipt = new Map<string, ServiceReceiptCorrection[]>();
  for (const correction of (correctionRows ?? []) as ServiceReceiptCorrectionRow[]) {
    correctionsByReceipt.set(correction.receipt_id, [...(correctionsByReceipt.get(correction.receipt_id) ?? []), mapCorrection(correction)]);
  }
  const { data: receiptDocumentRows, error: receiptDocumentError } = receiptIds.length > 0
    ? await supabase.from("service_receipt_documents").select("receipt_id,document_id,attached_at").in("receipt_id", receiptIds).order("attached_at", { ascending: true })
    : { data: [], error: null };
  if (receiptDocumentError) return null;

  const receiptDocuments = (receiptDocumentRows ?? []) as ReceiptDocumentRelation[];
  const documentIds = canReadDocuments ? Array.from(new Set([
    ...commitmentDocuments.map((document) => document.document_id),
    ...receiptDocuments.map((document) => document.document_id),
  ])) : [];
  const { data: documentRows, error: documentMetadataError } = documentIds.length > 0
    ? await supabase.from("business_documents").select("id,original_filename,mime_type,file_size").in("id", documentIds)
    : { data: [], error: null };
  if (documentMetadataError) return null;

  const documentMap = new Map(((documentRows ?? []) as DocumentMetadataRow[]).map((document) => [document.id, document]));
  const documentFor = (documentId: string, attachedAt: string): ProcurementEvidenceDocument | null => {
    const document = documentMap.get(documentId);
    return document
      ? { documentId: document.id, originalFilename: document.original_filename, mimeType: document.mime_type, fileSize: document.file_size, attachedAt }
      : null;
  };
  const documentsByCommitment = new Map<string, ProcurementEvidenceDocument[]>();
  for (const document of commitmentDocuments) {
    const mapped = documentFor(document.document_id, document.attached_at);
    if (mapped) documentsByCommitment.set(document.commitment_id, [...(documentsByCommitment.get(document.commitment_id) ?? []), mapped]);
  }
  const documentsByReceipt = new Map<string, ProcurementEvidenceDocument[]>();
  for (const document of receiptDocuments) {
    const mapped = documentFor(document.document_id, document.attached_at);
    if (mapped) documentsByReceipt.set(document.receipt_id, [...(documentsByReceipt.get(document.receipt_id) ?? []), mapped]);
  }
  const receiptsByCommitment = new Map<string, ServiceReceipt[]>();
  for (const receipt of receipts) {
    const mapped = mapReceipt(receipt, documentsByReceipt.get(receipt.id) ?? [], correctionsByReceipt.get(receipt.id) ?? []);
    receiptsByCommitment.set(receipt.commitment_id, [...(receiptsByCommitment.get(receipt.commitment_id) ?? []), mapped]);
  }
  const amendmentsByCommitment = new Map<string, ApprovedCommitmentAmendment[]>();
  for (const amendment of (amendmentRows ?? []) as ApprovedCommitmentAmendmentRow[]) {
    amendmentsByCommitment.set(amendment.commitment_id, [...(amendmentsByCommitment.get(amendment.commitment_id) ?? []), mapAmendment(amendment)]);
  }
  return rows.map((row) => mapCommitment(
    row,
    contexts.services.get(row.service_id),
    contexts.suppliers.get(row.supplier_id),
    contexts.quotations.get(row.supplier_quotation_id ?? ""),
    amendmentsByCommitment.get(row.id) ?? [],
    receiptsByCommitment.get(row.id) ?? [],
    documentsByCommitment.get(row.id) ?? [],
  ));
}

export async function getApprovedCommitmentsByServiceId(
  serviceId: string,
): Promise<ApprovedCommitmentsResult> {
  await requirePermission(PROCUREMENT_COMMITMENT_PERMISSIONS.read);
  try {
    const { data, error } = await createAdminClient()
      .from("approved_commitment_balances")
      .select("*")
      .eq("service_id", serviceId)
      .order("approved_at", { ascending: false })
      .order("id", { ascending: false });
    if (error) {
      console.error("[getApprovedCommitmentsByServiceId] Commitment lookup error:", error.message);
      return { commitments: [], error: "approved_commitments_load_failed" };
    }
    const rows = (data ?? []) as ApprovedCommitmentBalanceRow[];
    if (rows.length === 0) return { commitments: [] };
    const contexts = await contextRows(rows);
    if (!contexts) return { commitments: [], error: "approved_commitments_load_failed" };
    const commitments = await hydrateCommitmentRows(rows, contexts);
    return commitments ? { commitments } : { commitments: [], error: "approved_commitments_load_failed" };
  } catch (error) {
    console.error("[getApprovedCommitmentsByServiceId] Unexpected error:", error instanceof Error ? error.message : "Unknown");
    return { commitments: [], error: "approved_commitments_load_failed" };
  }
}

export async function getApprovedCommitmentById(
  commitmentId: string,
): Promise<ApprovedCommitmentDetailResult> {
  await requirePermission(PROCUREMENT_COMMITMENT_PERMISSIONS.read);
  try {
    const supabase = createAdminClient();
    const canReadDocuments = await checkPermission(BUSINESS_DOCUMENT_PERMISSIONS.read);
    const { data, error } = await supabase
      .from("approved_commitment_balances")
      .select("*")
      .eq("id", commitmentId)
      .maybeSingle();
    if (error) {
      console.error("[getApprovedCommitmentById] Commitment lookup error:", error.message);
      return { commitment: null, error: "approved_commitment_detail_load_failed" };
    }
    if (!data) return { commitment: null };
    const row = data as ApprovedCommitmentBalanceRow;
    const contexts = await contextRows([row]);
    if (!contexts) return { commitment: null, error: "approved_commitment_detail_load_failed" };

    const [
      { data: amendmentRows, error: amendmentError },
      { data: receiptRows, error: receiptError },
      { data: commitmentDocumentRows, error: commitmentDocumentError },
    ] = await Promise.all([
      supabase.from("approved_commitment_amendments").select("*").eq("commitment_id", commitmentId).order("amendment_number", { ascending: true }),
      supabase.from("service_receipts").select("*").eq("commitment_id", commitmentId).order("performance_date", { ascending: false }).order("id", { ascending: false }),
      canReadDocuments
        ? supabase.from("approved_commitment_documents").select("commitment_id,document_id,attached_at").eq("commitment_id", commitmentId).order("attached_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (amendmentError || receiptError || commitmentDocumentError) {
      if (amendmentError) console.error("[getApprovedCommitmentById] Amendment lookup error:", amendmentError.message);
      if (receiptError) console.error("[getApprovedCommitmentById] Receipt lookup error:", receiptError.message);
      if (commitmentDocumentError) console.error("[getApprovedCommitmentById] Commitment document lookup error:", commitmentDocumentError.message);
      return { commitment: null, error: "approved_commitment_detail_load_failed" };
    }

    const receipts = (receiptRows ?? []) as ServiceReceiptRow[];
    const commitmentDocuments = (commitmentDocumentRows ?? []) as Array<{ document_id: string; attached_at: string }>;
    const receiptIds = receipts.map((receipt) => receipt.id);
    const { data: correctionRows, error: correctionError } = receiptIds.length > 0
      ? await supabase.from("service_receipt_corrections").select("*").in("receipt_id", receiptIds).order("correction_number", { ascending: true })
      : { data: [], error: null };
    if (correctionError) {
      console.error("[getApprovedCommitmentById] Receipt correction lookup error:", correctionError.message);
      return { commitment: null, error: "approved_commitment_detail_load_failed" };
    }
    const correctionsByReceipt = new Map<string, ServiceReceiptCorrection[]>();
    for (const correction of (correctionRows ?? []) as ServiceReceiptCorrectionRow[]) {
      correctionsByReceipt.set(correction.receipt_id, [...(correctionsByReceipt.get(correction.receipt_id) ?? []), mapCorrection(correction)]);
    }
    const { data: receiptDocumentRows, error: receiptDocumentError } = canReadDocuments && receiptIds.length > 0
      ? await supabase.from("service_receipt_documents").select("receipt_id,document_id,attached_at").in("receipt_id", receiptIds).order("attached_at", { ascending: true })
      : { data: [], error: null };

    if (receiptDocumentError) {
      console.error("[getApprovedCommitmentById] Receipt document lookup error:", receiptDocumentError.message);
      return { commitment: null, error: "approved_commitment_detail_load_failed" };
    }

    const receiptDocuments = (receiptDocumentRows ?? []) as Array<{ receipt_id: string; document_id: string; attached_at: string }>;
    const documentIds = canReadDocuments ? Array.from(new Set([
      ...commitmentDocuments.map((document) => document.document_id),
      ...receiptDocuments.map((document) => document.document_id),
    ])) : [];
    const { data: documentRows, error: documentMetadataError } = documentIds.length > 0
      ? await supabase.from("business_documents").select("id,original_filename,mime_type,file_size").in("id", documentIds)
      : { data: [], error: null };
    if (documentMetadataError) {
      console.error("[getApprovedCommitmentById] Document metadata lookup error:", documentMetadataError.message);
      return { commitment: null, error: "approved_commitment_detail_load_failed" };
    }

    const documentMap = new Map(((documentRows ?? []) as DocumentMetadataRow[]).map((document) => [document.id, document]));
    const documentFor = (documentId: string, attachedAt: string): ProcurementEvidenceDocument | null => {
      const document = documentMap.get(documentId);
      return document
        ? { documentId: document.id, originalFilename: document.original_filename, mimeType: document.mime_type, fileSize: document.file_size, attachedAt }
        : null;
    };
    const commitmentDocumentsMapped = commitmentDocuments.flatMap((document) => {
      const mapped = documentFor(document.document_id, document.attached_at);
      return mapped ? [mapped] : [];
    });
    const documentsByReceipt = new Map<string, ProcurementEvidenceDocument[]>();
    for (const document of receiptDocuments) {
      const mapped = documentFor(document.document_id, document.attached_at);
      if (!mapped) continue;
      documentsByReceipt.set(document.receipt_id, [...(documentsByReceipt.get(document.receipt_id) ?? []), mapped]);
    }

    return {
      commitment: mapCommitment(
        row,
        contexts.services.get(row.service_id),
        contexts.suppliers.get(row.supplier_id),
        contexts.quotations.get(row.supplier_quotation_id ?? ""),
        ((amendmentRows ?? []) as ApprovedCommitmentAmendmentRow[]).map(mapAmendment),
        receipts.map((receipt) => mapReceipt(receipt, documentsByReceipt.get(receipt.id) ?? [], correctionsByReceipt.get(receipt.id) ?? [])),
        commitmentDocumentsMapped,
      ),
    };
  } catch (error) {
    console.error("[getApprovedCommitmentById] Unexpected error:", error instanceof Error ? error.message : "Unknown");
    return { commitment: null, error: "approved_commitment_detail_load_failed" };
  }
}

export async function getSupplierQuotationCommitmentOptions(
  serviceId: string,
): Promise<{ quotations: SupplierQuotationCommitmentOption[]; error?: "supplier_quotation_options_load_failed" }> {
  await requirePermission(PROCUREMENT_COMMITMENT_PERMISSIONS.write);
  try {
    const supabase = createAdminClient();
    const { data: quotationRows, error: quotationError } = await supabase
      .from("supplier_quotations")
      .select("id,supplier_id,supplier_reference,quotation_date")
      .eq("service_id", serviceId)
      .order("recorded_at", { ascending: false })
      .order("id", { ascending: false });
    if (quotationError) {
      console.error("[getSupplierQuotationCommitmentOptions] Quotation lookup error:", quotationError.message);
      return { quotations: [], error: "supplier_quotation_options_load_failed" };
    }
    const rows = (quotationRows ?? []) as Array<{ id: string; supplier_id: string; supplier_reference: string | null; quotation_date: string | null }>;
    if (rows.length === 0) return { quotations: [] };
    const { data: supplierRows, error: supplierError } = await supabase
      .from("suppliers")
      .select("id,name,legal_name")
      .in("id", Array.from(new Set(rows.map((row) => row.supplier_id))));
    if (supplierError) {
      console.error("[getSupplierQuotationCommitmentOptions] Supplier lookup error:", supplierError.message);
      return { quotations: [], error: "supplier_quotation_options_load_failed" };
    }
    const suppliers = new Map(((supplierRows ?? []) as SupplierContextRow[]).map((row) => [row.id, row]));
    return {
      quotations: rows.map((row): SupplierQuotationCommitmentOption => ({
        id: row.id,
        supplierId: row.supplier_id,
        supplierName: supplierName(suppliers.get(row.supplier_id)),
        supplierReference: row.supplier_reference,
        quotationDate: row.quotation_date,
      })),
    };
  } catch (error) {
    console.error("[getSupplierQuotationCommitmentOptions] Unexpected error:", error instanceof Error ? error.message : "Unknown");
    return { quotations: [], error: "supplier_quotation_options_load_failed" };
  }
}
