import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { mapProcurementCandidate, mapProcurementRequirement } from "./mappers";
import type {
  ProcurementCandidateRow,
  ProcurementRequirementRow,
  ProcurementRequirementsResult,
  ProcurementSupplierOption,
  SupplierQuotationDocumentRow,
  SupplierQuotationRequirementRow,
  SupplierQuotationRow,
  SupplierQuotationLineRow,
  SupplierQuotationLineItem,
  SupplierQuotationHistoryResult,
  SupplierQuotationHistoryRecord,
  SupplierQuotationDetailResult,
  SupplierQuotationRequirementOption,
  SupplierQuotationRequirementOptionsResult,
  SupplierQuotationServiceOption,
} from "./types";

type SupplierLookupRow = Pick<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "name" | "display_name">;
type ServiceQuotationContextRow = Pick<
  Database["public"]["Tables"]["services"]["Row"],
  "id" | "service_number" | "service_title" | "event_name" | "status" | "deleted_at"
>;
type DocumentMetadataLookupRow = Pick<
  Database["public"]["Tables"]["business_documents"]["Row"],
  "id" | "original_filename" | "mime_type" | "file_size"
>;

function supplierName(row: SupplierLookupRow): string {
  return row.display_name?.trim() || row.name.trim() || row.id;
}

export async function getProcurementRequirementsByServiceId(
  serviceId: string,
): Promise<ProcurementRequirementsResult> {
  await requirePermission("supplier_costing:read");

  try {
    const supabase = createAdminClient();
    const { data: requirementRows, error: requirementError } = await supabase
      .from("service_procurement_requirements")
      .select("*")
      .eq("service_id", serviceId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (requirementError) {
      console.error("[getProcurementRequirementsByServiceId] Requirement lookup error:", requirementError.message);
      return { requirements: [], error: "procurement_requirements_load_failed" };
    }

    const rows = (requirementRows ?? []) as ProcurementRequirementRow[];
    if (rows.length === 0) return { requirements: [] };

    const requirementIds = rows.map((row) => row.id);
    const { data: candidateRows, error: candidateError } = await supabase
      .from("service_procurement_candidates")
      .select("*")
      .in("requirement_id", requirementIds);

    if (candidateError) {
      console.error("[getProcurementRequirementsByServiceId] Candidate lookup error:", candidateError.message);
      return { requirements: [], error: "procurement_requirements_load_failed" };
    }

    const candidates = (candidateRows ?? []) as ProcurementCandidateRow[];
    const supplierIds = Array.from(
      new Set(
        candidates
          .map((row) => row.supplier_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    const supplierMap = new Map<string, { name: string }>();
    if (supplierIds.length > 0) {
      const { data: supplierRows, error: supplierError } = await supabase
        .from("suppliers")
        .select("id,name,display_name")
        .in("id", supplierIds);

      if (supplierError) {
        console.error("[getProcurementRequirementsByServiceId] Supplier lookup error:", supplierError.message);
        return { requirements: [], error: "procurement_requirements_load_failed" };
      }

      for (const row of (supplierRows ?? []) as SupplierLookupRow[]) {
        supplierMap.set(row.id, { name: supplierName(row) });
      }
    }

    const candidatesByRequirement = new Map<string, ReturnType<typeof mapProcurementCandidate>[]>();
    for (const candidate of candidates) {
      const existing = candidatesByRequirement.get(candidate.requirement_id) ?? [];
      existing.push(mapProcurementCandidate(candidate, supplierMap.get(candidate.supplier_id)));
      candidatesByRequirement.set(candidate.requirement_id, existing);
    }

    return {
      requirements: rows.map((row) =>
        mapProcurementRequirement(
          row,
          candidatesByRequirement.get(row.id) ?? [],
          row.selected_supplier_id ? (supplierMap.get(row.selected_supplier_id)?.name ?? row.selected_supplier_id) : null,
        ),
      ),
    };
  } catch (error) {
    console.error(
      "[getProcurementRequirementsByServiceId] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { requirements: [], error: "procurement_requirements_load_failed" };
  }
}

export async function getSupplierQuotationCountByServiceId(
  serviceId: string,
): Promise<{ count: number; error?: "supplier_quotation_count_load_failed" }> {
  await requirePermission("supplier_costing:read");

  try {
    const { data, error } = await createAdminClient()
      .from("supplier_quotations")
      .select("id")
      .eq("service_id", serviceId);

    if (error) {
      console.error("[getSupplierQuotationCountByServiceId] Quotation lookup error:", error.message);
      return { count: 0, error: "supplier_quotation_count_load_failed" };
    }

    return { count: (data ?? []).length };
  } catch (error) {
    console.error(
      "[getSupplierQuotationCountByServiceId] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { count: 0, error: "supplier_quotation_count_load_failed" };
  }
}

export async function getActiveProcurementSupplierOptions(): Promise<{
  suppliers: ProcurementSupplierOption[];
  error?: string;
}> {
  await requirePermission("supplier_costing:read");

  try {
    const { data, error } = await createAdminClient()
      .from("suppliers")
      .select("id,name,display_name")
      .is("deleted_at", null)
      .order("name", { ascending: true });

    if (error) {
      console.error("[getActiveProcurementSupplierOptions] Supplier lookup error:", error.message);
      return { suppliers: [], error: "procurement_suppliers_load_failed" };
    }

    return {
      suppliers: ((data ?? []) as SupplierLookupRow[]).map((row) => ({
        id: row.id,
        name: supplierName(row),
      })),
    };
  } catch (error) {
    console.error(
      "[getActiveProcurementSupplierOptions] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { suppliers: [], error: "procurement_suppliers_load_failed" };
  }
}

export async function getPackageRequirementsForQuotation(
  packageId: string,
  serviceId: string,
): Promise<{ id: string; title: string; sortOrder: number }[]> {
  await requirePermission("supplier_costing:read");
  try {
    const { data, error } = await createAdminClient()
      .from("service_procurement_package_requirements")
      .select("id,title,sort_order")
      .eq("package_id", packageId)
      .eq("service_id", serviceId)
      .is("retired_at", null)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("[getPackageRequirementsForQuotation] Lookup error:", error.message);
      return [];
    }

    return ((data ?? []) as Array<{ id: string; title: string; sort_order: number }>).map((row) => ({
      id: row.id,
      title: row.title,
      sortOrder: row.sort_order,
    }));
  } catch (error) {
    console.error(
      "[getPackageRequirementsForQuotation] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return [];
  }
}

export async function getSupplierQuotationHistoryBySupplierId(
  supplierId: string,
  options: { includeDocuments?: boolean; quotationId?: string } = {},
): Promise<SupplierQuotationHistoryResult> {
  await requirePermission("supplier_costing:read");
  if (options.includeDocuments) await requirePermission("documents:read");

  try {
    const supabase = createAdminClient();
    let quotationRequest = supabase
      .from("supplier_quotations")
      .select("id,supplier_id,service_id,supplier_reference,quotation_date,package_total,currency,recorded_at,recorded_by,updated_at,updated_by,source_candidate_requirement_id,source_candidate_supplier_id")
      .eq("supplier_id", supplierId);

    if (options.quotationId) {
      quotationRequest = quotationRequest.eq("id", options.quotationId);
    }

    const { data: quotationRows, error: quotationError } = await quotationRequest
      .order("recorded_at", { ascending: false })
      .order("id", { ascending: false });

    if (quotationError) {
      console.error("[getSupplierQuotationHistoryBySupplierId] Quotation lookup error:", quotationError.message);
      return { quotations: [], error: "supplier_quotation_history_load_failed" };
    }

    const quotations = (quotationRows ?? []) as SupplierQuotationRow[];
    if (quotations.length === 0) return { quotations: [] };

    const quotationIds = quotations.map((row) => row.id);
    const { data: lineRows, error: lineError } = await supabase
      .from("supplier_quotation_requirements")
      .select("quotation_id,requirement_id,service_id,line_summary,line_amount,line_evidence_ref,created_at,created_by")
      .in("quotation_id", quotationIds)
      .order("requirement_id", { ascending: true });

    if (lineError) {
      console.error("[getSupplierQuotationHistoryBySupplierId] Quotation line lookup error:", lineError.message);
      return { quotations: [], error: "supplier_quotation_history_load_failed" };
    }

    const { data: itemizedRows, error: itemizedError } = await supabase
      .from("supplier_quotation_lines")
      .select("id,quotation_id,service_id,package_requirement_id,description,quantity,unit,unit_price,line_total,sort_order,created_at,created_by")
      .in("quotation_id", quotationIds)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (itemizedError) {
      console.error("[getSupplierQuotationHistoryBySupplierId] Detailed quotation lines lookup error:", itemizedError.message);
      return { quotations: [], error: "supplier_quotation_history_load_failed" };
    }

    const itemizedLines = (itemizedRows ?? []) as unknown as SupplierQuotationLineRow[];
    const packageRequirementIds = Array.from(
      new Set(
        itemizedLines
          .map((row) => row.package_requirement_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );

    const { data: packageReqRows, error: packageReqError } = packageRequirementIds.length > 0
      ? await supabase
        .from("service_procurement_package_requirements")
        .select("id,title")
        .in("id", packageRequirementIds)
      : { data: [], error: null };

    if (packageReqError) {
      console.error("[getSupplierQuotationHistoryBySupplierId] Package requirement lookup error:", packageReqError.message);
      return { quotations: [], error: "supplier_quotation_history_load_failed" };
    }

    const packageReqMap = new Map(
      ((packageReqRows ?? []) as Array<{ id: string; title: string }>).map((row) => [row.id, row.title]),
    );

    const detailedLinesByQuotation = new Map<string, SupplierQuotationLineItem[]>();
    for (const line of itemizedLines) {
      const existing = detailedLinesByQuotation.get(line.quotation_id) ?? [];
      existing.push({
        id: line.id,
        quotationId: line.quotation_id,
        serviceId: line.service_id,
        packageRequirementId: line.package_requirement_id,
        packageRequirementTitle: line.package_requirement_id ? (packageReqMap.get(line.package_requirement_id) ?? null) : null,
        description: line.description,
        quantity: line.quantity === null ? null : Number(line.quantity),
        unit: line.unit,
        unitPrice: line.unit_price === null ? null : Number(line.unit_price),
        lineTotal: Number(line.line_total),
        sortOrder: line.sort_order,
      });
      detailedLinesByQuotation.set(line.quotation_id, existing);
    }

    const lines = (lineRows ?? []) as SupplierQuotationRequirementRow[];
    const requirementIds = Array.from(new Set(lines.map((row) => row.requirement_id)));
    const { data: requirementRows, error: requirementError } = requirementIds.length > 0
      ? await supabase
        .from("service_procurement_requirements")
        .select("id,service_id,requirement")
        .in("id", requirementIds)
      : { data: [], error: null };

    if (requirementError) {
      console.error("[getSupplierQuotationHistoryBySupplierId] Requirement lookup error:", requirementError.message);
      return { quotations: [], error: "supplier_quotation_history_load_failed" };
    }

    const requirements = (requirementRows ?? []) as Pick<
      ProcurementRequirementRow,
      "id" | "service_id" | "requirement"
    >[];
    const requirementMap = new Map(requirements.map((row) => [row.id, row]));
    const serviceIds = Array.from(new Set(quotations.map((row) => row.service_id)));
    const { data: serviceRows, error: serviceError } = await supabase
      .from("services")
      .select("id,service_number,service_title,event_name,status,deleted_at")
      .in("id", serviceIds);

    if (serviceError) {
      console.error("[getSupplierQuotationHistoryBySupplierId] Service lookup error:", serviceError.message);
      return { quotations: [], error: "supplier_quotation_history_load_failed" };
    }

    const serviceMap = new Map(
      ((serviceRows ?? []) as ServiceQuotationContextRow[]).map((row) => [row.id, row]),
    );
    const linesByQuotation = new Map<string, SupplierQuotationRequirementRow[]>();
    for (const line of lines) {
      const existing = linesByQuotation.get(line.quotation_id) ?? [];
      existing.push(line);
      linesByQuotation.set(line.quotation_id, existing);
    }

    const attachmentsByQuotation = new Map<string, SupplierQuotationHistoryRecord["documents"]>();

    if (options.includeDocuments) {
      const { data: attachmentRows, error: attachmentError } = await supabase
        .from("supplier_quotation_documents")
        .select("quotation_id,document_id,attached_by,attached_at")
        .in("quotation_id", quotationIds)
        .order("attached_at", { ascending: true })
        .order("document_id", { ascending: true });

      if (attachmentError) {
        console.error("[getSupplierQuotationHistoryBySupplierId] Document attachment lookup error:", attachmentError.message);
        return { quotations: [], error: "supplier_quotation_history_load_failed" };
      }

      const attachments = (attachmentRows ?? []) as SupplierQuotationDocumentRow[];
      const documentIds = Array.from(new Set(attachments.map((row) => row.document_id)));
      const { data: documentRows, error: documentError } = documentIds.length > 0
        ? await supabase
          .from("business_documents")
          .select("id,original_filename,mime_type,file_size")
          .in("id", documentIds)
        : { data: [], error: null };

      if (documentError) {
        console.error("[getSupplierQuotationHistoryBySupplierId] Document metadata lookup error:", documentError.message);
        return { quotations: [], error: "supplier_quotation_history_load_failed" };
      }

      const documentMap = new Map(
        ((documentRows ?? []) as DocumentMetadataLookupRow[]).map((row) => [row.id, row]),
      );
      for (const attachment of attachments) {
        const document = documentMap.get(attachment.document_id);
        if (!document) continue;
        const existing = attachmentsByQuotation.get(attachment.quotation_id) ?? [];
        existing.push({
          documentId: document.id,
          originalFilename: document.original_filename,
          mimeType: document.mime_type,
          fileSize: document.file_size,
          attachedAt: attachment.attached_at,
        });
        attachmentsByQuotation.set(attachment.quotation_id, existing);
      }
    }

    return {
      quotations: quotations.map((quotation) => {
        const service = serviceMap.get(quotation.service_id);
        const quotationLines = linesByQuotation.get(quotation.id) ?? [];
        const itemizedQuotationLines = detailedLinesByQuotation.get(quotation.id) ?? [];
        const pricingMode: "legacy" | "total_only" | "detailed" =
          itemizedQuotationLines.length > 0
            ? "detailed"
            : quotationLines.length > 0
              ? "legacy"
              : "total_only";

        return {
          id: quotation.id,
          supplierId: quotation.supplier_id,
          serviceId: quotation.service_id,
          serviceNumber: service?.service_number ?? quotation.service_id,
          serviceTitle: service?.service_title ?? "Service",
          eventName: service?.event_name ?? null,
          serviceStatus: service?.status ?? "Unknown",
          serviceDeleted: service?.deleted_at ? true : false,
          supplierReference: quotation.supplier_reference,
          quotationDate: quotation.quotation_date,
          packageTotal: quotation.package_total === null ? null : Number(quotation.package_total),
          currency: "SAR" as const,
          pricingMode,
          recordedAt: quotation.recorded_at,
          updatedAt: quotation.updated_at,
          sourceCandidateRequirementId: quotation.source_candidate_requirement_id,
          sourceCandidateSupplierId: quotation.source_candidate_supplier_id,
          requirements: quotationLines.map((line) => ({
            requirementId: line.requirement_id,
            requirement: requirementMap.get(line.requirement_id)?.requirement ?? line.requirement_id,
            lineSummary: line.line_summary,
            lineAmount: line.line_amount === null ? null : Number(line.line_amount),
            legacyEvidenceRef: line.line_evidence_ref,
          })),
          lines: itemizedQuotationLines,
          documents: attachmentsByQuotation.get(quotation.id) ?? [],
        };
      }),
    };
  } catch (error) {
    console.error(
      "[getSupplierQuotationHistoryBySupplierId] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { quotations: [], error: "supplier_quotation_history_load_failed" };
  }
}

export async function getSupplierQuotationById(
  quotationId: string,
  options: { includeDocuments?: boolean } = {},
): Promise<SupplierQuotationDetailResult> {
  await requirePermission("supplier_costing:read");

  try {
    const { data, error } = await createAdminClient()
      .from("supplier_quotations")
      .select("supplier_id")
      .eq("id", quotationId)
      .maybeSingle();

    if (error) {
      console.error("[getSupplierQuotationById] Quotation lookup error:", error.message);
      return { quotation: null, error: "supplier_quotation_detail_load_failed" };
    }

    if (!data) return { quotation: null };

    const result = await getSupplierQuotationHistoryBySupplierId(data.supplier_id, {
      includeDocuments: options.includeDocuments,
      quotationId,
    });

    return {
      quotation: result.quotations[0] ?? null,
      ...(result.error ? { error: "supplier_quotation_detail_load_failed" as const } : {}),
    };
  } catch (error) {
    console.error(
      "[getSupplierQuotationById] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { quotation: null, error: "supplier_quotation_detail_load_failed" };
  }
}

export async function getSupplierQuotationRequirementOptions(
  supplierId: string,
): Promise<SupplierQuotationRequirementOptionsResult> {
  await requirePermission("supplier_costing:write");

  try {
    const supabase = createAdminClient();
    const { data: requirementRows, error: requirementError } = await supabase
      .from("service_procurement_requirements")
      .select("id,service_id,requirement")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (requirementError) {
      console.error("[getSupplierQuotationRequirementOptions] Requirement lookup error:", requirementError.message);
      return { requirements: [], error: "supplier_quotation_requirements_load_failed" };
    }

    const requirements = (requirementRows ?? []) as Array<{
      id: string;
      service_id: string;
      requirement: string;
    }>;
    if (requirements.length === 0) return { requirements: [] };

    const serviceIds = Array.from(new Set(requirements.map((row) => row.service_id)));
    const [{ data: serviceRows, error: serviceError }, { data: quotationRows, error: quotationError }] = await Promise.all([
      supabase
        .from("services")
        .select("id,service_number,service_title,event_name,status,deleted_at")
        .in("id", serviceIds),
      supabase.from("supplier_quotations").select("id").eq("supplier_id", supplierId),
    ]);

    if (serviceError || quotationError) {
      if (serviceError) console.error("[getSupplierQuotationRequirementOptions] Service lookup error:", serviceError.message);
      if (quotationError) console.error("[getSupplierQuotationRequirementOptions] Quotation lookup error:", quotationError.message);
      return { requirements: [], error: "supplier_quotation_requirements_load_failed" };
    }

    const serviceMap = new Map(
      ((serviceRows ?? []) as ServiceQuotationContextRow[]).map((row) => [row.id, row]),
    );
    const quotationIds = ((quotationRows ?? []) as Array<{ id: string }>).map((row) => row.id);
    const { data: lineRows, error: lineError } = quotationIds.length > 0
      ? await supabase
        .from("supplier_quotation_requirements")
        .select("requirement_id")
        .in("quotation_id", quotationIds)
        .in("requirement_id", requirements.map((row) => row.id))
      : { data: [], error: null };

    if (lineError) {
      console.error("[getSupplierQuotationRequirementOptions] Quotation line lookup error:", lineError.message);
      return { requirements: [], error: "supplier_quotation_requirements_load_failed" };
    }

    const existingRequirementIds = new Set(
      ((lineRows ?? []) as Array<{ requirement_id: string }>).map((row) => row.requirement_id),
    );

    return {
      requirements: requirements.flatMap((row): SupplierQuotationRequirementOption[] => {
        const service = serviceMap.get(row.service_id);
        if (!service || service.deleted_at !== null || service.status === "Completed" || service.status === "Cancelled") {
          return [];
        }
        return [{
          requirementId: row.id,
          serviceId: row.service_id,
          serviceNumber: service.service_number,
          serviceTitle: service.service_title,
          eventName: service.event_name,
          requirement: row.requirement,
          hasExistingQuotation: existingRequirementIds.has(row.id),
        }];
      }),
    };
  } catch (error) {
    console.error(
      "[getSupplierQuotationRequirementOptions] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { requirements: [], error: "supplier_quotation_requirements_load_failed" };
  }
}

export async function getEligibleServicesForSupplierQuotation(): Promise<{
  services: SupplierQuotationServiceOption[];
  error?: "eligible_services_load_failed";
}> {
  await requirePermission("supplier_costing:write");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("services")
      .select("id,service_number,service_title,event_name,status,deleted_at")
      .is("deleted_at", null)
      .not("status", "in", '("Completed","Cancelled")')
      .order("service_number", { ascending: true });

    if (error) {
      console.error("[getEligibleServicesForSupplierQuotation] Lookup error:", error.message);
      return { services: [], error: "eligible_services_load_failed" };
    }

    return {
      services: ((data ?? []) as ServiceQuotationContextRow[]).map((row) => ({
        serviceId: row.id,
        serviceNumber: row.service_number,
        serviceTitle: row.service_title,
        eventName: row.event_name,
        status: row.status,
      })),
    };
  } catch (error) {
    console.error(
      "[getEligibleServicesForSupplierQuotation] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { services: [], error: "eligible_services_load_failed" };
  }
}
