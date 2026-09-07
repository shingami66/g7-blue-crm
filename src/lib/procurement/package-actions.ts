"use server";

import { revalidatePath } from "next/cache";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProcurementActionResult } from "./actions";
import {
  clearProcurementPackageSupplierSchema,
  createProcurementPackageSchema,
  selectProcurementPackageSupplierSchema,
  setProcurementPackageRequirementsSchema,
  updateProcurementPackageMetadataSchema,
  type ClearProcurementPackageSupplierInput,
  type CreateProcurementPackageInput,
  type SelectProcurementPackageSupplierInput,
  type SetProcurementPackageRequirementsInput,
  type UpdateProcurementPackageMetadataInput,
} from "./package-schemas";

function firstValidationError(parsed: { error: { issues: { message: string }[] } }) {
  return parsed.error.issues[0]?.message ?? "Validation failed";
}

function oneRow<T>(data: T[] | null): T | null {
  return Array.isArray(data) && data.length === 1 ? data[0] ?? null : null;
}

function rpcFailure<T>(code = "PROCUREMENT_PACKAGE_WRITE_FAILED"): ProcurementActionResult<T> {
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
  revalidatePath(`/services/${serviceId}/procurement`);
}

export async function createProcurementPackage(
  input: unknown,
): Promise<ProcurementActionResult<{ packageId: string; serviceId: string; status: string; idempotent: boolean }>> {
  try {
    const user = await requirePermission("supplier_costing:write");
    const parsed = createProcurementPackageSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };

    const value: CreateProcurementPackageInput = parsed.data;
    const admin = createAdminClient();

    const { data: pkgData, error: pkgError } = await admin.rpc("upsert_procurement_package", {
      p_package_id: null,
      p_service_id: value.serviceId,
      p_name: value.name,
      p_description: value.description ?? null,
      p_procurement_method: value.procurementMethod ?? null,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });

    const pkgRow = oneRow(pkgData);
    if (pkgError || !pkgRow) {
      if (pkgError) console.error("[createProcurementPackage] RPC error:", pkgError.message);
      return rpcFailure();
    }
    if (pkgRow.error_code) return rpcFailure(pkgRow.error_code);

    if (value.requirements && value.requirements.length > 0) {
      const { data: reqData, error: reqError } = await admin.rpc("set_procurement_package_requirements", {
        p_package_id: pkgRow.package_id,
        p_service_id: value.serviceId,
        p_requirements: value.requirements.map((req, idx) => ({
        id: req.id ?? null,
          title: req.title,
          requirement_key: req.requirementKey ?? null,
          specifications: req.specifications ?? null,
          sort_order: req.sortOrder ?? idx,
          legacy_requirement_id: req.legacyRequirementId ?? null,
        })),
        p_request_id: value.requestId,
        p_actor_id: user.clerk_user_id,
        p_actor_role: user.role,
      });

      const reqRow = oneRow(reqData);
      if (reqError || !reqRow || reqRow.error_code) {
        if (reqError) console.error("[createProcurementPackage] Req RPC error:", reqError.message);
        return rpcFailure(reqRow?.error_code ?? "procurement_package_requirements_failed");
      }
    }

    revalidateService(value.serviceId);
    return {
      success: true,
      data: {
        packageId: pkgRow.package_id,
        serviceId: pkgRow.service_id,
        status: pkgRow.status,
        idempotent: pkgRow.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "createProcurementPackage");
  }
}

export async function updateProcurementPackageMetadata(
  input: unknown,
): Promise<ProcurementActionResult<{ packageId: string; serviceId: string; status: string; idempotent: boolean }>> {
  try {
    const user = await requirePermission("supplier_costing:write");
    const parsed = updateProcurementPackageMetadataSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };

    const value: UpdateProcurementPackageMetadataInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("upsert_procurement_package", {
      p_package_id: value.packageId,
      p_service_id: value.serviceId,
      p_name: value.name,
      p_description: value.description ?? null,
      p_procurement_method: value.procurementMethod ?? null,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });

    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[updateProcurementPackageMetadata] RPC error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);

    revalidateService(value.serviceId);
    return {
      success: true,
      data: {
        packageId: row.package_id,
        serviceId: row.service_id,
        status: row.status,
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "updateProcurementPackageMetadata");
  }
}

export async function setProcurementPackageRequirements(
  input: unknown,
): Promise<ProcurementActionResult<{ packageId: string; requirementCount: number; idempotent: boolean }>> {
  try {
    const user = await requirePermission("supplier_costing:write");
    const parsed = setProcurementPackageRequirementsSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };

    const value: SetProcurementPackageRequirementsInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("set_procurement_package_requirements", {
      p_package_id: value.packageId,
      p_service_id: value.serviceId,
      p_requirements: value.requirements.map((req, idx) => ({
        id: req.id ?? null,
        title: req.title,
        requirement_key: req.requirementKey ?? null,
        specifications: req.specifications ?? null,
        sort_order: req.sortOrder ?? idx,
        legacy_requirement_id: req.legacyRequirementId ?? null,
      })),
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });

    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[setProcurementPackageRequirements] RPC error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);

    revalidateService(value.serviceId);
    return {
      success: true,
      data: {
        packageId: row.package_id,
        requirementCount: row.requirement_count,
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "setProcurementPackageRequirements");
  }
}

export async function selectProcurementPackageSupplier(
  input: unknown,
): Promise<ProcurementActionResult<{ packageId: string; supplierId: string; quotationId: string | null; idempotent: boolean }>> {
  try {
    const user = await requirePermission("supplier_costing:write");
    const parsed = selectProcurementPackageSupplierSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };

    const value: SelectProcurementPackageSupplierInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("select_procurement_package_supplier", {
      p_package_id: value.packageId,
      p_service_id: value.serviceId,
      p_supplier_id: value.supplierId,
      p_supplier_quotation_id: value.supplierQuotationId ?? null,
      p_selection_reason: value.selectionReason ?? null,
      p_selection_evidence: value.selectionEvidence ?? null,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });

    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[selectProcurementPackageSupplier] RPC error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);

    revalidateService(value.serviceId);
    return {
      success: true,
      data: {
        packageId: row.package_id,
        supplierId: row.supplier_id,
        quotationId: row.quotation_id,
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "selectProcurementPackageSupplier");
  }
}

export async function clearProcurementPackageSupplier(
  input: unknown,
): Promise<ProcurementActionResult<{ packageId: string; idempotent: boolean }>> {
  try {
    const user = await requirePermission("supplier_costing:write");
    const parsed = clearProcurementPackageSupplierSchema.safeParse(input);
    if (!parsed.success) return { success: false, code: "INVALID_INPUT", error: firstValidationError(parsed) };

    const value: ClearProcurementPackageSupplierInput = parsed.data;
    const { data, error } = await createAdminClient().rpc("clear_procurement_package_supplier", {
      p_package_id: value.packageId,
      p_service_id: value.serviceId,
      p_request_id: value.requestId,
      p_actor_id: user.clerk_user_id,
      p_actor_role: user.role,
    });

    const row = oneRow(data);
    if (error || !row) {
      if (error) console.error("[clearProcurementPackageSupplier] RPC error:", error.message);
      return rpcFailure();
    }
    if (row.error_code) return rpcFailure(row.error_code);

    revalidateService(value.serviceId);
    return {
      success: true,
      data: {
        packageId: row.package_id,
        idempotent: row.idempotent_replay,
      },
    };
  } catch (error) {
    return handleException(error, "clearProcurementPackageSupplier");
  }
}
