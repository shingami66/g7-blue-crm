"use server";

import { revalidatePath } from "next/cache";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanupUploadedPrivateBusinessDocument,
  createPrivateBusinessDocumentUrlForService,
  preflightPrivateBusinessDocumentUpload,
  uploadPrivateBusinessDocument,
} from "@/lib/documents/storage";
import {
  procurementCandidateSchema,
  procurementRequirementSchema,
  procurementSelectionSchema,
  supplierQuotationDocumentReferenceSchema,
  supplierQuotationSchema,
} from "./schemas";
import type {
  ProcurementCandidateInput,
  ProcurementRequirementInput,
  ProcurementSelectionInput,
  SupplierQuotationInput,
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

function revalidateSupplier(supplierId: string) {
  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath(`/suppliers/${supplierId}/quotations`);
}

type ProcurementCandidateRpcResult = {
  requirementId: string;
  supplierId: string;
  serviceId: string;
  idempotent: boolean;
};

type SupplierQuotationRpcResult = {
  quotationId: string;
  supplierId: string;
  serviceId: string;
  lineCount: number;
  idempotent: boolean;
};

async function executeProcurementCandidateUpsert(
  value: ProcurementCandidateInput,
  user: { clerk_user_id: string; role: string },
): Promise<ProcurementActionResult<ProcurementCandidateRpcResult>> {
  const admin = createAdminClient();
  let quotedAmount = value.quotedAmount ?? null;
  let comparisonNotes = value.comparisonNotes ?? null;

  if (typeof admin.from === "function") {
    const { data: existingCandidate } = await admin
      .from("service_procurement_candidates")
      .select("quoted_amount, comparison_notes")
      .eq("requirement_id", value.requirementId)
      .eq("supplier_id", value.supplierId)
      .maybeSingle();

    if (existingCandidate) {
      if (existingCandidate.quoted_amount !== null && existingCandidate.quoted_amount !== undefined) {
        quotedAmount = Number(existingCandidate.quoted_amount);
      }
      if (existingCandidate.comparison_notes !== null && existingCandidate.comparison_notes !== undefined) {
        comparisonNotes = existingCandidate.comparison_notes;
      }
    }
  }

  const { data, error } = await admin.rpc("upsert_service_procurement_candidate", {
    p_requirement_id: value.requirementId,
    p_supplier_id: value.supplierId,
    p_offer_summary: value.offerSummary,
    p_evidence_ref: value.evidenceRef,
    p_quoted_amount: quotedAmount,
    p_comparison_notes: comparisonNotes,
    p_request_id: value.requestId,
    p_actor_id: user.clerk_user_id,
    p_actor_role: user.role,
  });
  const row = oneRow(data);
  if (error || !row) {
    if (error) console.error("[executeProcurementCandidateUpsert] Supabase error:", error.message);
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
}

async function executeSupplierQuotationCreate(
  value: SupplierQuotationInput,
  user: { clerk_user_id: string; role: string },
): Promise<ProcurementActionResult<SupplierQuotationRpcResult>> {
  const { data, error } = await createAdminClient().rpc("create_supplier_quotation", {
    p_supplier_id: value.supplierId,
    p_service_id: value.serviceId,
    p_supplier_reference: value.supplierReference,
    p_quotation_date: value.quotationDate,
    p_package_total: value.packageTotal ?? null,
    p_requirements: (value.requirements ?? []).map((line) => ({
      requirement_id: line.requirementId,
      line_summary: line.lineSummary,
      line_amount: line.lineAmount,
    })),
    p_lines: (value.lines ?? []).map((line, index) => ({
      package_requirement_id: line.packageRequirementId ?? null,
      description: line.description,
      quantity: line.quantity ?? null,
      unit: line.unit ?? null,
      unit_price: line.unitPrice ?? null,
      line_total: line.lineTotal,
      sort_order: line.sortOrder ?? index,
    })),
    p_request_id: value.requestId,
    p_actor_id: user.clerk_user_id,
    p_actor_role: user.role,
  });
  const row = oneRow(data);
  if (error || !row) {
    if (error) console.error("[executeSupplierQuotationCreate] Supabase error:", error.message);
    return rpcFailure();
  }
  if (row.error_code) return rpcFailure(row.error_code);

  revalidateService(row.service_id);
  revalidateSupplier(row.supplier_id);
  return {
    success: true,
    data: {
      quotationId: row.quotation_id,
      supplierId: row.supplier_id,
      serviceId: row.service_id,
      lineCount: row.line_count,
      idempotent: row.idempotent_replay,
    },
  };
}

export async function upsertProcurementRequirement(
  input: unknown,
): Promise<ProcurementActionResult<{ requirementId: string; serviceId: string; idempotent: boolean }>> {
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

    revalidateService(value.serviceId);
    return {
      success: true,
      data: { requirementId: row.requirement_id, serviceId: row.service_id, idempotent: row.idempotent_replay },
    };
  } catch (error) {
    return handleException(error, "upsertProcurementRequirement");
  }
}

export async function upsertProcurementCandidate(
  input: unknown,
): Promise<ProcurementActionResult<{ requirementId: string; supplierId: string; idempotent: boolean }>> {
  try {
    const user = await requirePermission("supplier_costing:write");
    const parsed = procurementCandidateSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };

    const result = await executeProcurementCandidateUpsert(parsed.data, user);
    if (!result.success) return result;
    return {
      success: true,
      data: {
        requirementId: result.data.requirementId,
        supplierId: result.data.supplierId,
        idempotent: result.data.idempotent,
      },
    };
  } catch (error) {
    return handleException(error, "upsertProcurementCandidate");
  }
}

function isNamedSubmittedFile(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    value.name.length > 0
  );
}

function parseJsonField(value: FormDataEntryValue | unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeSupplierQuotationInput(input: unknown): {
  quotation: unknown;
  files: unknown[];
} {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    const files = [...input.getAll("files"), ...input.getAll("file")].filter(isNamedSubmittedFile);
    return {
      quotation: {
        supplierId: input.get("supplierId"),
        serviceId: input.get("serviceId"),
        supplierReference: input.get("supplierReference"),
        quotationDate: input.get("quotationDate"),
        packageTotal: input.get("packageTotal"),
        pricingMode: input.get("pricingMode"),
        requirements: parseJsonField(input.get("requirements")),
        lines: parseJsonField(input.get("lines")),
        requestId: input.get("requestId"),
      },
      files,
    };
  }

  if (typeof input === "object" && input !== null) {
    const value = input as Record<string, unknown>;
    return {
      quotation: {
        supplierId: value.supplierId,
        serviceId: value.serviceId,
        supplierReference: value.supplierReference,
        quotationDate: value.quotationDate,
        packageTotal: value.packageTotal,
        pricingMode: value.pricingMode,
        requirements: parseJsonField(value.requirements),
        lines: parseJsonField(value.lines),
        requestId: value.requestId,
      },
      files: [
        ...(Array.isArray(value.files) ? value.files : []),
        ...(isNamedSubmittedFile(value.file) ? [value.file] : []),
      ],
    };
  }

  return { quotation: input, files: [] };
}

async function findAttachedDocumentsForRequest(
  quotationId: string,
  requestId: string,
): Promise<string[] | null | undefined> {
  const { data, error } = await createAdminClient()
    .from("audit_logs")
    .select("details")
    .eq("entity_type", "supplier_quotation")
    .eq("entity_id", quotationId)
    .eq("details->>operation", "supplier_quotation_documents_attach")
    .eq("details->>request_id", requestId)
    .maybeSingle();
  if (error) return undefined;
  if (!data || typeof data.details !== "object" || data.details === null) return null;
  const payload = (data.details as { payload?: unknown }).payload;
  if (typeof payload !== "object" || payload === null) return undefined;
  const documentIds = (payload as { document_ids?: unknown }).document_ids;
  if (!Array.isArray(documentIds)) return undefined;
  return documentIds.every((value) => typeof value === "string" && zodUuid(value))
    ? documentIds as string[]
    : undefined;
}

function zodUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

export async function recordSupplierQuotationEvidence(
  input: unknown,
): Promise<ProcurementActionResult<{
  quotationId: string;
  supplierId: string;
  documentIds: string[];
  lineCount: number;
  idempotent: boolean;
}>> {
  try {
    const user = await requirePermission("supplier_costing:write");
    const normalized = normalizeSupplierQuotationInput(input);
    const parsed = supplierQuotationSchema.safeParse(normalized.quotation);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };

    for (const file of normalized.files) {
      await preflightPrivateBusinessDocumentUpload(file);
    }

    const quotationResult = await executeSupplierQuotationCreate(parsed.data, user);
    if (!quotationResult.success) return quotationResult;

    if (normalized.files.length === 0) {
      return {
        success: true,
        data: {
          quotationId: quotationResult.data.quotationId,
          supplierId: quotationResult.data.supplierId,
          documentIds: [],
          lineCount: quotationResult.data.lineCount,
          idempotent: quotationResult.data.idempotent,
        },
      };
    }

    if (quotationResult.data.idempotent) {
      const existingDocumentIds = await findAttachedDocumentsForRequest(
        quotationResult.data.quotationId,
        parsed.data.requestId,
      );
      if (existingDocumentIds === undefined) return rpcFailure("PROCUREMENT_WRITE_FAILED");
      if (existingDocumentIds !== null) {
        return {
          success: true,
          data: {
            quotationId: quotationResult.data.quotationId,
            supplierId: quotationResult.data.supplierId,
            documentIds: existingDocumentIds,
            lineCount: quotationResult.data.lineCount,
            idempotent: true,
          },
        };
      }
    }

    const documents: Array<Awaited<ReturnType<typeof uploadPrivateBusinessDocument>>> = [];
    let attachmentRpcStarted = false;

    try {
      for (const file of normalized.files) {
        documents.push(await uploadPrivateBusinessDocument({
          file,
          documentType: "supplier_quotation",
          purpose: "Supplier quotation original evidence",
          link: {
            serviceId: quotationResult.data.serviceId,
            linkPurpose: "supplier_quotation",
          },
        }));
      }

      attachmentRpcStarted = true;
      const { data, error } = await createAdminClient().rpc("attach_supplier_quotation_documents", {
        p_quotation_id: quotationResult.data.quotationId,
        p_document_ids: documents.map((document) => document.id),
        p_request_id: parsed.data.requestId,
        p_actor_id: user.clerk_user_id,
        p_actor_role: user.role,
      });
      const row = oneRow(data);
      if (error || !row) {
        if (error) console.error("[recordSupplierQuotationEvidence] Document attachment error:", error.message);
        const attachedDocumentIds = await findAttachedDocumentsForRequest(
          quotationResult.data.quotationId,
          parsed.data.requestId,
        );
        if (attachedDocumentIds === undefined) {
          return rpcFailure("supplier_quotation_document_outcome_unknown");
        }
        if (attachedDocumentIds !== null) {
          revalidateSupplier(quotationResult.data.supplierId);
          return {
            success: true,
            data: {
              quotationId: quotationResult.data.quotationId,
              supplierId: quotationResult.data.supplierId,
              documentIds: attachedDocumentIds,
              lineCount: quotationResult.data.lineCount,
              idempotent: true,
            },
          };
        }
        const clean = await cleanupQuotationDocuments(documents, quotationResult.data.serviceId);
        return clean ? rpcFailure() : rpcFailure("document_storage_cleanup_failed");
      }
      if (row.error_code) {
        const clean = await cleanupQuotationDocuments(documents, quotationResult.data.serviceId);
        return clean ? rpcFailure(row.error_code) : rpcFailure("document_storage_cleanup_failed");
      }

      revalidateSupplier(quotationResult.data.supplierId);
      return {
        success: true,
        data: {
          quotationId: row.quotation_id,
          supplierId: quotationResult.data.supplierId,
          documentIds: documents.map((document) => document.id),
          lineCount: quotationResult.data.lineCount,
          idempotent: row.idempotent_replay,
        },
      };
    } catch (error) {
      if (attachmentRpcStarted) {
        const attachedDocumentIds = await findAttachedDocumentsForRequest(
          quotationResult.data.quotationId,
          parsed.data.requestId,
        );
        if (attachedDocumentIds === undefined) {
          return rpcFailure("supplier_quotation_document_outcome_unknown");
        }
        if (attachedDocumentIds !== null) {
          revalidateSupplier(quotationResult.data.supplierId);
          return {
            success: true,
            data: {
              quotationId: quotationResult.data.quotationId,
              supplierId: quotationResult.data.supplierId,
              documentIds: attachedDocumentIds,
              lineCount: quotationResult.data.lineCount,
              idempotent: true,
            },
          };
        }
      }
      const clean = await cleanupQuotationDocuments(documents, quotationResult.data.serviceId);
      if (!clean) return rpcFailure("document_storage_cleanup_failed");
      return handleException(error, "recordSupplierQuotationEvidence");
    }
  } catch (error) {
    return handleException(error, "recordSupplierQuotationEvidence");
  }
}

async function cleanupQuotationDocuments(
  documents: Array<Awaited<ReturnType<typeof uploadPrivateBusinessDocument>>>,
  serviceId: string,
): Promise<boolean> {
  let clean = true;
  for (const document of documents) {
    const documentClean = await cleanupUploadedPrivateBusinessDocument(document, {
      serviceId,
      linkPurpose: "supplier_quotation",
    });
    clean = documentClean && clean;
  }
  return clean;
}

export async function createSupplierQuotationDocumentViewUrl(
  input: unknown,
): Promise<ProcurementActionResult<Awaited<ReturnType<typeof createPrivateBusinessDocumentUrlForService>>>> {
  try {
    await requirePermission("supplier_costing:read");
    const parsed = supplierQuotationDocumentReferenceSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: "Document reference is invalid." };

    const supabase = createAdminClient();
    const { data: attachment, error: attachmentError } = await supabase
      .from("supplier_quotation_documents")
      .select("quotation_id,document_id")
      .eq("document_id", parsed.data.documentId)
      .eq("quotation_id", parsed.data.quotationId)
      .maybeSingle();
    if (attachmentError || !attachment) return rpcFailure("supplier_quotation_document_not_found");

    const { data: quotation, error: quotationError } = await supabase
      .from("supplier_quotations")
      .select("service_id")
      .eq("id", attachment.quotation_id)
      .maybeSingle();
    if (quotationError || !quotation) return rpcFailure("supplier_quotation_document_not_found");

    return {
      success: true,
      data: await createPrivateBusinessDocumentUrlForService({
        documentId: attachment.document_id,
        serviceId: quotation.service_id,
      }),
    };
  } catch (error) {
    return handleException(error, "createSupplierQuotationDocumentViewUrl");
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
