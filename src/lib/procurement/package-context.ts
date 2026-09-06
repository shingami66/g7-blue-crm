export interface ServiceEligibilityCheckInput {
  status?: string | null;
  deletedAt?: string | null;
  deleted_at?: string | null;
}

/**
 * Canonical backend rule for supplier quotation service eligibility:
 * deleted_at IS NULL AND status NOT IN ('Completed', 'Cancelled')
 */
export function isServiceEligibleForQuotation(
  service: ServiceEligibilityCheckInput | null | undefined,
): boolean {
  if (!service) return false;

  const isDeleted =
    service.deletedAt !== null && service.deletedAt !== undefined
      ? Boolean(service.deletedAt)
      : Boolean(service.deleted_at);

  if (isDeleted) return false;

  if (!service.status) return false;

  return service.status !== "Completed" && service.status !== "Cancelled";
}

export interface PackageLike {
  id: string;
  serviceId: string;
  selectedSupplierId: string | null;
  status: string;
  name?: string | null;
  title?: string | null;
}

export interface PackageQuotationContextParams {
  packageId?: string | null;
  serviceId?: string | null;
  supplierId: string;
}

export interface PackageQuotationValidationResult {
  isValid: boolean;
  packageContext: { packageId: string; packageTitle: string } | null;
  reason?:
    | "missing_parameters"
    | "package_not_found"
    | "package_id_mismatch"
    | "service_id_mismatch"
    | "supplier_mismatch"
    | "status_not_selected";
}

/**
 * Validates whether a procurement package context is valid for recording a supplier quotation:
 * 1. package.id === packageId
 * 2. package.service_id === serviceId
 * 3. package.selected_supplier_id === route supplierId
 * 4. package.status === "selected"
 */
export function validatePackageQuotationContext(
  pkg: PackageLike | null | undefined,
  params: PackageQuotationContextParams,
): PackageQuotationValidationResult {
  if (!params.packageId || !params.serviceId || !params.supplierId) {
    return { isValid: false, packageContext: null, reason: "missing_parameters" };
  }

  if (!pkg) {
    return { isValid: false, packageContext: null, reason: "package_not_found" };
  }

  if (pkg.id !== params.packageId) {
    return { isValid: false, packageContext: null, reason: "package_id_mismatch" };
  }

  if (pkg.serviceId !== params.serviceId) {
    return { isValid: false, packageContext: null, reason: "service_id_mismatch" };
  }

  if (pkg.selectedSupplierId !== params.supplierId) {
    return { isValid: false, packageContext: null, reason: "supplier_mismatch" };
  }

  if (pkg.status !== "selected") {
    return { isValid: false, packageContext: null, reason: "status_not_selected" };
  }

  const title = (pkg.name?.trim() || pkg.title?.trim() || "Procurement Package").trim();

  return {
    isValid: true,
    packageContext: {
      packageId: pkg.id,
      packageTitle: title,
    },
  };
}
