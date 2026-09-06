import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import {
  type PackageSupplierQuotationOption,
  type ProcurementPackage,
  type ProcurementPackageDetailResult,
  type ProcurementPackageRequirement,
  type ProcurementPackageRequirementRow,
  type ProcurementPackageRow,
  type ProcurementPackagesResult,
} from "./package-types";

type SupplierLookupRow = Pick<
  Database["public"]["Tables"]["suppliers"]["Row"],
  "id" | "name" | "display_name"
>;

type ServiceLookupRow = Pick<
  Database["public"]["Tables"]["services"]["Row"],
  "id" | "service_number" | "service_title" | "event_name" | "status" | "deleted_at"
>;

interface QuotationLookupRow {
  id: string;
  supplier_reference: string | null;
  quotation_date: string | null;
  package_total: number | string | null;
}

function resolveSupplierName(row: SupplierLookupRow | undefined): string | null {
  if (!row) return null;
  return row.display_name?.trim() || row.name.trim() || row.id;
}

function mapRequirementRow(row: ProcurementPackageRequirementRow): ProcurementPackageRequirement {
  return {
    id: row.id,
    packageId: row.package_id,
    serviceId: row.service_id,
    requirementKey: row.requirement_key,
    title: row.title,
    specifications: row.specifications,
    sortOrder: row.sort_order,
    legacyRequirementId: row.legacy_requirement_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProcurementPackagesByServiceId(
  serviceId: string,
): Promise<ProcurementPackagesResult> {
  await requirePermission("supplier_costing:read");

  try {
    const supabase = createAdminClient();

    const [packageResult, serviceResult] = await Promise.all([
      supabase
        .from("service_procurement_packages")
        .select("*")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }),
      supabase
        .from("services")
        .select("id, service_number, service_title, event_name, status, deleted_at")
        .eq("id", serviceId)
        .maybeSingle(),
    ]);

    if (packageResult.error) {
      console.error("[getProcurementPackagesByServiceId] Package error:", packageResult.error.message);
      return { packages: [], error: "procurement_packages_load_failed" };
    }

    const packageRows = (packageResult.data ?? []) as ProcurementPackageRow[];
    if (packageRows.length === 0) return { packages: [] };

    const service = serviceResult.data as ServiceLookupRow | null;
    const packageIds = packageRows.map((pkg) => pkg.id);

    const { data: requirementRows, error: requirementError } = await supabase
      .from("service_procurement_package_requirements")
      .select("*")
      .in("package_id", packageIds)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (requirementError) {
      console.error("[getProcurementPackagesByServiceId] Requirements error:", requirementError.message);
      return { packages: [], error: "procurement_packages_load_failed" };
    }

    const requirementsByPackage = new Map<string, ProcurementPackageRequirement[]>();
    for (const row of (requirementRows ?? []) as ProcurementPackageRequirementRow[]) {
      const existing = requirementsByPackage.get(row.package_id) ?? [];
      existing.push(mapRequirementRow(row));
      requirementsByPackage.set(row.package_id, existing);
    }

    const supplierIds = Array.from(
      new Set(packageRows.flatMap((pkg) => (pkg.selected_supplier_id ? [pkg.selected_supplier_id] : []))),
    );
    const quotationIds = Array.from(
      new Set(
        packageRows.flatMap((pkg) =>
          pkg.selected_supplier_quotation_id ? [pkg.selected_supplier_quotation_id] : [],
        ),
      ),
    );

    const [suppliersResult, quotationsResult] = await Promise.all([
      supplierIds.length > 0
        ? supabase.from("suppliers").select("id, name, display_name").in("id", supplierIds)
        : { data: [], error: null },
      quotationIds.length > 0
        ? supabase
            .from("supplier_quotations")
            .select("id, supplier_reference, quotation_date, package_total")
            .in("id", quotationIds)
        : { data: [], error: null },
    ]);

    const supplierMap = new Map<string, SupplierLookupRow>(
      ((suppliersResult.data ?? []) as SupplierLookupRow[]).map((row) => [row.id, row]),
    );
    const quotationMap = new Map<string, QuotationLookupRow>(
      ((quotationsResult.data ?? []) as QuotationLookupRow[]).map((row) => [row.id, row]),
    );

    const packages: ProcurementPackage[] = packageRows.map((row) => {
      const supplier = row.selected_supplier_id ? supplierMap.get(row.selected_supplier_id) : undefined;
      const quotation = row.selected_supplier_quotation_id
        ? quotationMap.get(row.selected_supplier_quotation_id)
        : undefined;

      return {
        id: row.id,
        serviceId: row.service_id,
        serviceNumber: service?.service_number ?? row.service_id,
        serviceTitle: service?.service_title ?? "Service",
        eventName: service?.event_name ?? null,
        serviceStatus: service?.status ?? "Unknown",
        serviceDeleted: Boolean(service?.deleted_at),
        name: row.name,
        description: row.description,
        procurementMethod: row.procurement_method,
        status: row.status,
        selectedSupplierId: row.selected_supplier_id,
        selectedSupplierName: resolveSupplierName(supplier),
        selectedSupplierQuotationId: row.selected_supplier_quotation_id,
        selectedSupplierQuotationReference: quotation?.supplier_reference ?? null,
        selectedSupplierQuotationDate: quotation?.quotation_date ?? null,
        selectedSupplierQuotationAmount:
          quotation?.package_total !== null && quotation?.package_total !== undefined
            ? Number(quotation.package_total)
            : null,
        selectionReason: row.selection_reason,
        selectionEvidence: row.selection_evidence,
        selectedAt: row.selected_at,
        selectedBy: row.selected_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        requirements: requirementsByPackage.get(row.id) ?? [],
      };
    });

    return { packages };
  } catch (error) {
    console.error(
      "[getProcurementPackagesByServiceId] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { packages: [], error: "procurement_packages_load_failed" };
  }
}

export async function getProcurementPackageById(
  packageId: string,
): Promise<ProcurementPackageDetailResult> {
  await requirePermission("supplier_costing:read");

  try {
    const supabase = createAdminClient();
    const { data: packageRow, error: packageError } = await supabase
      .from("service_procurement_packages")
      .select("service_id")
      .eq("id", packageId)
      .maybeSingle();

    if (packageError) {
      console.error("[getProcurementPackageById] Package error:", packageError.message);
      return { package: null, error: "procurement_package_detail_load_failed" };
    }

    if (!packageRow) return { package: null };

    const result = await getProcurementPackagesByServiceId(packageRow.service_id);
    if (result.error) return { package: null, error: "procurement_package_detail_load_failed" };

    const matched = result.packages.find((pkg) => pkg.id === packageId) ?? null;
    return { package: matched };
  } catch (error) {
    console.error(
      "[getProcurementPackageById] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { package: null, error: "procurement_package_detail_load_failed" };
  }
}

export async function getSupplierQuotationsByServiceId(
  serviceId: string,
): Promise<{ quotations: PackageSupplierQuotationOption[]; error?: "supplier_quotations_load_failed" }> {
  await requirePermission("supplier_costing:read");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("supplier_quotations")
      .select("id, supplier_id, service_id, supplier_reference, quotation_date, package_total, currency")
      .eq("service_id", serviceId)
      .order("quotation_date", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("[getSupplierQuotationsByServiceId] Error:", error.message);
      return { quotations: [], error: "supplier_quotations_load_failed" };
    }

    return {
      quotations: ((data ?? []) as Database["public"]["Tables"]["supplier_quotations"]["Row"][]).map((row) => ({
        id: row.id,
        supplierId: row.supplier_id,
        serviceId: row.service_id,
        supplierReference: row.supplier_reference ?? "",
        quotationDate: row.quotation_date ?? "",
        packageTotal:
          row.package_total !== null && row.package_total !== undefined
            ? Number(row.package_total)
            : null,
        currency: row.currency ?? "SAR",
      })),
    };
  } catch (error) {
    console.error(
      "[getSupplierQuotationsByServiceId] Unexpected error:",
      error instanceof Error ? error.message : "Unknown",
    );
    return { quotations: [], error: "supplier_quotations_load_failed" };
  }
}

