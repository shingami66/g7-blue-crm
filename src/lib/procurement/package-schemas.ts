import { z } from "zod";
import {
  PROCUREMENT_METHODS,
  PROCUREMENT_PACKAGE_STATUSES,
} from "./package-types.ts";

function requiredText(message: string, maxLength: number) {
  return z.string().trim().min(1, message).max(maxLength);
}

function optionalText(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return null;
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
    z.string().max(maxLength).nullable(),
  );
}

export const procurementPackageStatusSchema = z.enum(PROCUREMENT_PACKAGE_STATUSES);
export const procurementMethodSchema = z.enum(PROCUREMENT_METHODS);

export const packageRequirementInputSchema = z
  .object({
    id: z.string().uuid().optional().nullable(),
    requirementKey: optionalText(100).optional(),
    title: requiredText("Requirement title is required", 2000),
    specifications: optionalText(2000).optional(),
    sortOrder: z.number().int().min(0).optional().default(0),
    legacyRequirementId: z.string().uuid().optional().nullable(),
  })
  .strict();

export const createProcurementPackageSchema = z
  .object({
    serviceId: z.string().uuid(),
    name: requiredText("Package name is required", 255),
    description: optionalText(2000).optional(),
    procurementMethod: procurementMethodSchema.optional().nullable(),
    requirements: z.array(packageRequirementInputSchema).optional().default([]),
    requestId: z.string().uuid(),
  })
  .strict();

export const updateProcurementPackageMetadataSchema = z
  .object({
    packageId: z.string().uuid(),
    serviceId: z.string().uuid(),
    name: requiredText("Package name is required", 255),
    description: optionalText(2000).optional(),
    procurementMethod: procurementMethodSchema.optional().nullable(),
    requestId: z.string().uuid(),
  })
  .strict();

export const setProcurementPackageRequirementsSchema = z
  .object({
    packageId: z.string().uuid(),
    serviceId: z.string().uuid(),
    requirements: z.array(packageRequirementInputSchema),
    requestId: z.string().uuid(),
  })
  .strict();

export const selectProcurementPackageSupplierSchema = z
  .object({
    packageId: z.string().uuid(),
    serviceId: z.string().uuid(),
    supplierId: z.string().uuid(),
    supplierQuotationId: z.string().uuid().optional().nullable(),
    selectionReason: optionalText(2000).optional(),
    selectionEvidence: optionalText(2000).optional(),
    requestId: z.string().uuid(),
  })
  .strict();

export const clearProcurementPackageSupplierSchema = z
  .object({
    packageId: z.string().uuid(),
    serviceId: z.string().uuid(),
    requestId: z.string().uuid(),
  })
  .strict();

export type PackageRequirementInput = z.infer<typeof packageRequirementInputSchema>;
export type CreateProcurementPackageInput = z.infer<typeof createProcurementPackageSchema>;
export type UpdateProcurementPackageMetadataInput = z.infer<typeof updateProcurementPackageMetadataSchema>;
export type SetProcurementPackageRequirementsInput = z.infer<typeof setProcurementPackageRequirementsSchema>;
export type SelectProcurementPackageSupplierInput = z.infer<typeof selectProcurementPackageSupplierSchema>;
export type ClearProcurementPackageSupplierInput = z.infer<typeof clearProcurementPackageSupplierSchema>;
