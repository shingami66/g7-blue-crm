"use server";

import { revalidatePath } from "next/cache";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import {
  BUSINESS_DOCUMENT_PERMISSIONS,
  PROCUREMENT_COMMITMENT_PERMISSIONS,
  SERVICE_RECEIPT_PERMISSIONS,
} from "@/lib/auth/role-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanupUploadedPrivateBusinessDocument,
  createPrivateBusinessDocumentUrlForService,
  preflightPrivateBusinessDocumentUpload,
  uploadPrivateBusinessDocument,
} from "@/lib/documents/storage";
import {
  approvedCommitmentSchema,
  commitmentAmendmentSchema,
  commitmentTransitionSchema,
  evidenceDocumentsSchema,
  serviceReceiptCorrectionSchema,
  serviceReceiptReviewSchema,
  serviceReceiptSchema,
} from "./commitment-receipt-schemas";
import type {
  ApprovedCommitmentInput,
  CommitmentAmendmentInput,
  CommitmentTransitionInput,
  EvidenceDocumentsInput,
  ProcurementCommitmentActionResult,
  ServiceReceiptInput,
  ServiceReceiptCorrectionInput,
  ServiceReceiptReviewInput,
} from "./commitment-receipt-types";

function firstValidationError(parsed: { error: { issues: { message: string }[] } }) {
  return parsed.error.issues[0]?.message ?? "Validation failed";
}

function oneRow<T>(data: T[] | null): T | null {
  return Array.isArray(data) && data.length === 1 ? data[0] ?? null : null;
}

function rpcFailure<T>(code = "PROCUREMENT_COMMITMENT_WRITE_FAILED"): ProcurementCommitmentActionResult<T> {
  const safeCode = /^[a-z][a-z0-9_]*$/iu.test(code) ? code : "PROCUREMENT_COMMITMENT_WRITE_FAILED";
  return { success: false, code: safeCode, error: safeCode };
}

function handleException<T>(error: unknown, action: string): ProcurementCommitmentActionResult<T> {
  if (error instanceof UnauthorizedError) return { success: false, code: "UNAUTHORIZED", error: "Unauthorized" };
  if (error instanceof ForbiddenError) return { success: false, code: "FORBIDDEN", error: "Forbidden" };
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^[a-z0-9_]+$/u.test(code)) return rpcFailure(code);
  }
  console.error(`[${action}] Unexpected procurement commitment error:`, error instanceof Error ? error.message : "Unknown");
  return rpcFailure();
}

function revalidateService(serviceId: string) {
  revalidatePath(`/services/${serviceId}`);
  revalidatePath(`/services/${serviceId}/commitments`);
}

function isNamedSubmittedFile(value: unknown): boolean {
  return typeof value === "object" && value !== null && "name" in value
    && typeof value.name === "string" && value.name.length > 0;
}

function zodUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function normalizeEvidenceUploadInput(input: unknown): { targetId: unknown; requestId: unknown; files: unknown[] } {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    return {
      targetId: input.get("targetId"),
      requestId: input.get("requestId"),
      files: [...input.getAll("files"), ...input.getAll("file")].filter(isNamedSubmittedFile),
    };
  }
  if (typeof input === "object" && input !== null) {
    const value = input as Record<string, unknown>;
    return {
      targetId: value.targetId,
      requestId: value.requestId,
      files: [
        ...(Array.isArray(value.files) ? value.files.filter(isNamedSubmittedFile) : []),
        ...(isNamedSubmittedFile(value.file) ? [value.file] : []),
      ],
    };
  }
  return { targetId: null, requestId: null, files: [] };
}

async function findEvidenceDocumentsForRequest(
  entityType: "approved_commitment" | "service_receipt",
  entityId: string,
  operation: "approved_commitment_documents_attach" | "service_receipt_documents_attach",
  requestId: string,
): Promise<string[] | null | undefined> {
  const { data, error } = await createAdminClient()
    .from("audit_logs")
    .select("details")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("details->>operation", operation)
    .eq("details->>request_id", requestId)
    .maybeSingle();
  if (error) return undefined;
  if (!data || typeof data.details !== "object" || data.details === null) return null;
  const payload = (data.details as { payload?: unknown }).payload;
  if (typeof payload !== "object" || payload === null) return undefined;
  const documentIds = (payload as { document_ids?: unknown }).document_ids;
  return Array.isArray(documentIds) && documentIds.every((value) => typeof value === "string" && zodUuid(value))
    ? documentIds as string[]
    : undefined;
}

async function recordEvidenceUpload(
  input: unknown,
  target: "commitment" | "receipt",
): Promise<ProcurementCommitmentActionResult<{ targetId: string; serviceId: string; documentIds: string[]; idempotent: boolean }>> {
  const user = await requirePermission(
    target === "commitment" ? PROCUREMENT_COMMITMENT_PERMISSIONS.write : SERVICE_RECEIPT_PERMISSIONS.write,
  );
  const normalized = normalizeEvidenceUploadInput(input);
  if (typeof normalized.targetId !== "string" || !zodUuid(normalized.targetId)
    || typeof normalized.requestId !== "string" || !zodUuid(normalized.requestId)
    || normalized.files.length < 1) {
    return rpcFailure("INVALID_INPUT");
  }

  const targetId = normalized.targetId;
  const requestId = normalized.requestId;
  const supabase = createAdminClient();
  const serviceIdResult = target === "commitment"
    ? await supabase.from("approved_commitments").select("service_id").eq("id", targetId).maybeSingle()
    : await supabase.from("service_receipts").select("service_id").eq("id", targetId).maybeSingle();
  if (serviceIdResult.error || !serviceIdResult.data?.service_id) return rpcFailure("DOCUMENT_OPERATION_FAILED");
  const serviceId = serviceIdResult.data.service_id;
  const entityType = target === "commitment" ? "approved_commitment" : "service_receipt";
  const operation = target === "commitment" ? "approved_commitment_documents_attach" : "service_receipt_documents_attach";
  const existingDocumentIds = await findEvidenceDocumentsForRequest(entityType, targetId, operation, requestId);
  if (existingDocumentIds === undefined) return rpcFailure("DOCUMENT_OPERATION_FAILED");
  if (existingDocumentIds !== null) {
    return { success: true, data: { targetId, serviceId, documentIds: existingDocumentIds, idempotent: true } };
  }

  for (const file of normalized.files) await preflightPrivateBusinessDocumentUpload(file);
  const documents: Array<Awaited<ReturnType<typeof uploadPrivateBusinessDocument>>> = [];
  const linkPurpose = target === "commitment" ? "approved_commitment" : "service_receipt";
  try {
    for (const file of normalized.files) {
      documents.push(await uploadPrivateBusinessDocument({
        file,
        documentType: linkPurpose,
        purpose: target === "commitment" ? "Approved Commitment supporting evidence" : "Service Receipt supporting evidence",
        link: { serviceId, linkPurpose },
      }));
    }
    const { data, error } = target === "commitment"
      ? await supabase.rpc("attach_approved_commitment_documents", {
        p_commitment_id: targetId,
        p_document_ids: documents.map((document) => document.id),
        p_request_id: requestId,
        p_actor_id: user.clerk_user_id,
        p_actor_role: user.role,
      })
      : await supabase.rpc("attach_service_receipt_documents", {
        p_receipt_id: targetId,
        p_document_ids: documents.map((document) => document.id),
        p_request_id: requestId,
        p_actor_id: user.clerk_user_id,
        p_actor_role: user.role,
      });
    const row = oneRow(data as Array<{ error_code: string; service_id: string; document_count: number; idempotent_replay: boolean }> | null);
    if (error) {
      const committedDocumentIds = await findEvidenceDocumentsForRequest(entityType, targetId, operation, requestId);
      if (committedDocumentIds) {
        return { success: true, data: { targetId, serviceId, documentIds: committedDocumentIds, idempotent: true } };
      }
      // A transport/database error has an uncertain commit outcome; retain the
      // uploaded originals instead of deleting evidence that may already be linked.
      return rpcFailure("DOCUMENT_OPERATION_FAILED");
    }
    if (!row) {
      const clean = await cleanupEvidenceDocuments(documents, serviceId, linkPurpose);
      return clean ? rpcFailure("DOCUMENT_OPERATION_FAILED") : rpcFailure("document_storage_cleanup_failed");
    }
    if (row.error_code) {
      const clean = await cleanupEvidenceDocuments(documents, serviceId, linkPurpose);
      return clean ? rpcFailure(row.error_code) : rpcFailure("document_storage_cleanup_failed");
    }
    revalidateService(row.service_id);
    return { success: true, data: { targetId, serviceId: row.service_id, documentIds: documents.map((document) => document.id), idempotent: row.idempotent_replay } };
  } catch (error) {
    const clean = await cleanupEvidenceDocuments(documents, serviceId, linkPurpose);
    return clean ? handleException(error, target === "commitment" ? "recordApprovedCommitmentEvidence" : "recordServiceReceiptEvidence") : rpcFailure("document_storage_cleanup_failed");
  }
}

type EvidenceUploadResult = ProcurementCommitmentActionResult<{ targetId: string; serviceId: string; documentIds: string[]; idempotent: boolean }>;

async function cleanupEvidenceDocuments(
  documents: Array<Awaited<ReturnType<typeof uploadPrivateBusinessDocument>>>,
  serviceId: string,
  linkPurpose: string,
): Promise<boolean> {
  let clean = true;
  for (const document of documents) {
    clean = await cleanupUploadedPrivateBusinessDocument(document, { serviceId, linkPurpose }) && clean;
  }
  return clean;
}

export async function recordApprovedCommitmentEvidence(input: unknown): Promise<EvidenceUploadResult> {
  try {
    return await recordEvidenceUpload(input, "commitment");
  } catch (error) {
    return handleException(error, "recordApprovedCommitmentEvidence");
  }
}

export async function recordServiceReceiptEvidence(input: unknown): Promise<EvidenceUploadResult> {
  try {
    return await recordEvidenceUpload(input, "receipt");
  } catch (error) {
    return handleException(error, "recordServiceReceiptEvidence");
  }
}

export async function createProcurementEvidenceDocumentViewUrl(
  input: unknown,
): Promise<ProcurementCommitmentActionResult<Awaited<ReturnType<typeof createPrivateBusinessDocumentUrlForService>>>> {
  try {
    await requirePermission(BUSINESS_DOCUMENT_PERMISSIONS.read);
    if (typeof input !== "object" || input === null) return rpcFailure("INVALID_INPUT");
    const value = input as Record<string, unknown>;
    if (typeof value.targetId !== "string" || !zodUuid(value.targetId)
      || typeof value.documentId !== "string" || !zodUuid(value.documentId)
      || (value.target !== "commitment" && value.target !== "receipt")) {
      return rpcFailure("INVALID_INPUT");
    }
    const supabase = createAdminClient();
    const relation = value.target === "commitment"
      ? await supabase.from("approved_commitment_documents").select("commitment_id,document_id").eq("commitment_id", value.targetId).eq("document_id", value.documentId).maybeSingle()
      : await supabase.from("service_receipt_documents").select("receipt_id,document_id").eq("receipt_id", value.targetId).eq("document_id", value.documentId).maybeSingle();
    if (relation.error || !relation.data) return rpcFailure("DOCUMENT_NOT_FOUND");
    const target = value.target === "commitment"
      ? await supabase.from("approved_commitments").select("service_id").eq("id", value.targetId).maybeSingle()
      : await supabase.from("service_receipts").select("service_id").eq("id", value.targetId).maybeSingle();
    if (target.error || !target.data?.service_id) return rpcFailure("DOCUMENT_NOT_FOUND");
    return {
      success: true as const,
      data: await createPrivateBusinessDocumentUrlForService({ documentId: value.documentId, serviceId: target.data.service_id }),
    };
  } catch (error) {
    return handleException(error, "createProcurementEvidenceDocumentViewUrl");
  }
}

export async function createApprovedCommitment(
  input: unknown,
): Promise<ProcurementCommitmentActionResult<{
  commitmentId: string;
  serviceId: string;
  supplierId: string;
  authorizedAmount: number;
  openCommitmentAmount: number;
  idempotent: boolean;
}>> {
  try {
    const user = await requirePermission(PROCUREMENT_COMMITMENT_PERMISSIONS.write);
    const parsed = approvedCommitmentSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };
    const value: ApprovedCommitmentInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("create_approved_commitment", {
      p_commitment_source: value.commitmentSource,
      p_service_id: value.serviceId,
      p_supplier_id: value.supplierId,
      p_supplier_quotation_id: value.supplierQuotationId,
      p_source_reference: value.sourceReference,
      p_original_approved_amount: value.originalApprovedAmount,
      p_approved_at: value.approvedAt,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[createApprovedCommitment] Supabase error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);
    revalidateService(row.service_id);
    return {
      success: true,
      data: {
        commitmentId: row.commitment_id,
        serviceId: row.service_id,
        supplierId: row.supplier_id,
        authorizedAmount: Number(row.authorized_amount),
        openCommitmentAmount: Number(row.open_commitment_amount),
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "createApprovedCommitment");
  }
}

export async function addApprovedCommitmentAmendment(
  input: unknown,
): Promise<ProcurementCommitmentActionResult<{
  commitmentId: string;
  serviceId: string;
  amendmentId: string;
  amendmentNumber: number;
  authorizedAmount: number;
  openCommitmentAmount: number;
  idempotent: boolean;
}>> {
  try {
    const user = await requirePermission(PROCUREMENT_COMMITMENT_PERMISSIONS.amend);
    const parsed = commitmentAmendmentSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };
    const value: CommitmentAmendmentInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("add_approved_commitment_amendment", {
      p_commitment_id: value.commitmentId,
      p_amendment_type: value.amendmentType,
      p_amount: value.amount,
      p_reason: value.reason,
      p_evidence_ref: value.evidenceRef,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[addApprovedCommitmentAmendment] Supabase error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);
    revalidateService(row.service_id);
    return {
      success: true,
      data: {
        commitmentId: row.commitment_id,
        serviceId: row.service_id,
        amendmentId: row.amendment_id,
        amendmentNumber: row.amendment_number,
        authorizedAmount: Number(row.authorized_amount),
        openCommitmentAmount: Number(row.open_commitment_amount),
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "addApprovedCommitmentAmendment");
  }
}

export async function transitionApprovedCommitment(
  input: unknown,
): Promise<ProcurementCommitmentActionResult<{
  commitmentId: string;
  serviceId: string;
  status: string;
  authorizedAmount: number;
  openCommitmentAmount: number;
  idempotent: boolean;
}>> {
  try {
    const user = await requirePermission(PROCUREMENT_COMMITMENT_PERMISSIONS.lifecycle);
    const parsed = commitmentTransitionSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };
    const value: CommitmentTransitionInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("transition_approved_commitment", {
      p_commitment_id: value.commitmentId,
      p_action: value.action,
      p_reason: value.reason,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[transitionApprovedCommitment] Supabase error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);
    revalidateService(row.service_id);
    return {
      success: true,
      data: {
        commitmentId: row.commitment_id,
        serviceId: row.service_id,
        status: row.commitment_status,
        authorizedAmount: Number(row.authorized_amount),
        openCommitmentAmount: Number(row.open_commitment_amount),
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "transitionApprovedCommitment");
  }
}

export async function createServiceReceipt(
  input: unknown,
): Promise<ProcurementCommitmentActionResult<{
  receiptId: string;
  serviceId: string;
  supplierId: string;
  commitmentId: string;
  acceptanceStatus: string;
  idempotent: boolean;
}>> {
  try {
    const user = await requirePermission(SERVICE_RECEIPT_PERMISSIONS.write);
    const parsed = serviceReceiptSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };
    const value: ServiceReceiptInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("create_service_receipt", {
      p_service_id: value.serviceId,
      p_commitment_id: value.commitmentId,
      p_performance_date: value.performanceDate,
      p_delivered_scope: value.deliveredScope,
      p_actual_quantity: value.actualQuantity,
      p_actual_hours: value.actualHours,
      p_quantity_unit: value.quantityUnit,
      p_received_amount: value.receivedAmount,
      p_missing_scope: value.missingScope,
      p_extra_scope: value.extraScope,
      p_defects_incidents: value.defectsIncidents,
      p_conditions_notes: value.conditionsNotes,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[createServiceReceipt] Supabase error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);
    revalidateService(row.service_id);
    return {
      success: true,
      data: {
        receiptId: row.receipt_id,
        serviceId: row.service_id,
        supplierId: row.supplier_id,
        commitmentId: row.commitment_id,
        acceptanceStatus: row.acceptance_status,
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "createServiceReceipt");
  }
}

export async function reviewServiceReceipt(
  input: unknown,
): Promise<ProcurementCommitmentActionResult<{
  receiptId: string;
  serviceId: string;
  supplierId: string;
  commitmentId: string;
  acceptanceStatus: string;
  idempotent: boolean;
}>> {
  try {
    const user = await requirePermission(SERVICE_RECEIPT_PERMISSIONS.accept);
    const parsed = serviceReceiptReviewSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };
    const value: ServiceReceiptReviewInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("review_service_receipt", {
      p_receipt_id: value.receiptId,
      p_acceptance_status: value.acceptanceStatus,
      p_conditions_notes: value.conditionsNotes,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[reviewServiceReceipt] Supabase error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);
    revalidateService(row.service_id);
    return {
      success: true,
      data: {
        receiptId: row.receipt_id,
        serviceId: row.service_id,
        supplierId: row.supplier_id,
        commitmentId: row.commitment_id,
        acceptanceStatus: row.acceptance_status,
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "reviewServiceReceipt");
  }
}

export async function correctServiceReceipt(
  input: unknown,
): Promise<ProcurementCommitmentActionResult<{
  receiptId: string;
  serviceId: string;
  supplierId: string;
  commitmentId: string;
  acceptanceStatus: string;
  receivedAmount: number | null;
  idempotent: boolean;
}>> {
  try {
    const user = await requirePermission(SERVICE_RECEIPT_PERMISSIONS.correct);
    const parsed = serviceReceiptCorrectionSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };
    const value: ServiceReceiptCorrectionInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("correct_service_receipt", {
      p_receipt_id: value.receiptId,
      p_corrected_acceptance_status: value.correctedAcceptanceStatus,
      p_corrected_received_amount: value.correctedReceivedAmount,
      p_corrected_conditions_notes: value.correctedConditionsNotes,
      p_correction_reason: value.correctionReason,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[correctServiceReceipt] Supabase error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);
    revalidateService(row.service_id);
    return {
      success: true,
      data: {
        receiptId: row.receipt_id,
        serviceId: row.service_id,
        supplierId: row.supplier_id,
        commitmentId: row.commitment_id,
        acceptanceStatus: row.acceptance_status,
        receivedAmount: row.received_amount === null ? null : Number(row.received_amount),
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "correctServiceReceipt");
  }
}

export async function attachApprovedCommitmentDocuments(
  input: unknown,
): Promise<ProcurementCommitmentActionResult<{ commitmentId: string; serviceId: string; documentCount: number; idempotent: boolean }>> {
  try {
    const user = await requirePermission(PROCUREMENT_COMMITMENT_PERMISSIONS.write);
    const parsed = evidenceDocumentsSchema.safeParse(input);
    if (!parsed.success || !parsed.data.commitmentId) {
      return { success: false, code: "INVALID_INPUT", error: parsed.success ? "Commitment is required." : firstValidationError(parsed) };
    }
    const value: EvidenceDocumentsInput = parsed.data;
    const commitmentId = value.commitmentId;
    if (!commitmentId) return rpcFailure("INVALID_INPUT");
    const { data, error } = await createAdminClient().rpc("attach_approved_commitment_documents", {
      p_commitment_id: commitmentId,
      p_document_ids: value.documentIds,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) return rpcFailure();
    if (row.error_code) return rpcFailure(row.error_code);
    revalidateService(row.service_id);
    return { success: true, data: { commitmentId: row.commitment_id, serviceId: row.service_id, documentCount: row.document_count, idempotent: row.idempotent_replay } };
  } catch (error) {
    return handleException(error, "attachApprovedCommitmentDocuments");
  }
}

export async function attachServiceReceiptDocuments(
  input: unknown,
): Promise<ProcurementCommitmentActionResult<{ receiptId: string; serviceId: string; documentCount: number; idempotent: boolean }>> {
  try {
    const user = await requirePermission(SERVICE_RECEIPT_PERMISSIONS.write);
    const parsed = evidenceDocumentsSchema.safeParse(input);
    if (!parsed.success || !parsed.data.receiptId) {
      return { success: false, code: "INVALID_INPUT", error: parsed.success ? "Receipt is required." : firstValidationError(parsed) };
    }
    const value: EvidenceDocumentsInput = parsed.data;
    const receiptId = value.receiptId;
    if (!receiptId) return rpcFailure("INVALID_INPUT");
    const { data, error } = await createAdminClient().rpc("attach_service_receipt_documents", {
      p_receipt_id: receiptId,
      p_document_ids: value.documentIds,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });
    const row = oneRow(data);
    if (error || !row) return rpcFailure();
    if (row.error_code) return rpcFailure(row.error_code);
    revalidateService(row.service_id);
    return { success: true, data: { receiptId: row.receipt_id, serviceId: row.service_id, documentCount: row.document_count, idempotent: row.idempotent_replay } };
  } catch (error) {
    return handleException(error, "attachServiceReceiptDocuments");
  }
}
