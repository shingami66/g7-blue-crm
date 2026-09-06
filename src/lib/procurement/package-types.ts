export const PROCUREMENT_PACKAGE_STATUSES = [
  "draft",
  "selected",
  "cancelled",
] as const;

export type ProcurementPackageStatus = (typeof PROCUREMENT_PACKAGE_STATUSES)[number];

export const PROCUREMENT_METHODS = [
  "rental",
  "purchase",
  "service",
] as const;

export type ProcurementMethod = (typeof PROCUREMENT_METHODS)[number];

export interface ProcurementPackageRow {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  procurement_method: ProcurementMethod | null;
  status: ProcurementPackageStatus;
  selected_supplier_id: string | null;
  selected_supplier_quotation_id: string | null;
  selection_reason: string | null;
  selection_evidence: string | null;
  selected_at: string | null;
  selected_by: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface ProcurementPackageRequirementRow {
  id: string;
  package_id: string;
  service_id: string;
  requirement_key: string | null;
  title: string;
  specifications: string | null;
  sort_order: number;
  legacy_requirement_id: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface ProcurementPackageRequirement {
  id: string;
  packageId: string;
  serviceId: string;
  requirementKey: string | null;
  title: string;
  specifications: string | null;
  sortOrder: number;
  legacyRequirementId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementPackage {
  id: string;
  serviceId: string;
  serviceNumber: string;
  serviceTitle: string;
  eventName: string | null;
  serviceStatus: string;
  serviceDeleted: boolean;
  name: string;
  description: string | null;
  procurementMethod: ProcurementMethod | null;
  status: ProcurementPackageStatus;
  selectedSupplierId: string | null;
  selectedSupplierName: string | null;
  selectedSupplierQuotationId: string | null;
  selectedSupplierQuotationReference: string | null;
  selectedSupplierQuotationDate: string | null;
  selectedSupplierQuotationAmount: number | null;
  selectionReason: string | null;
  selectionEvidence: string | null;
  selectedAt: string | null;
  selectedBy: string | null;
  createdAt: string;
  updatedAt: string;
  requirements: ProcurementPackageRequirement[];
}

export type CommonRequirementCatalogCategory =
  | "technical"
  | "furniture"
  | "decor"
  | "hospitality"
  | "operations";

export interface CommonRequirementCatalogItem {
  key: string;
  category: CommonRequirementCatalogCategory;
  titleEn: string;
  titleAr: string;
}

export const COMMON_REQUIREMENT_CATALOG: readonly CommonRequirementCatalogItem[] = [
  // Technical
  { key: "stage", category: "technical", titleEn: "Stage", titleAr: "مسرح" },
  { key: "led_screens", category: "technical", titleEn: "LED Screens", titleAr: "شاشات LED" },
  { key: "sound_system", category: "technical", titleEn: "Sound System", titleAr: "نظام صوتي" },
  { key: "lighting", category: "technical", titleEn: "Lighting", titleAr: "إضاءة" },
  { key: "rigging", category: "technical", titleEn: "Rigging", titleAr: "هياكل تعليق" },
  { key: "technical_crew", category: "technical", titleEn: "Technical Crew", titleAr: "طاقم فني" },

  // Furniture / Guest Areas
  { key: "chairs", category: "furniture", titleEn: "Chairs", titleAr: "كراسي" },
  { key: "tables", category: "furniture", titleEn: "Tables", titleAr: "طاولات" },
  { key: "vip_sofas", category: "furniture", titleEn: "VIP Sofas", titleAr: "كنب كبار الشخصيات" },
  { key: "reception_counters", category: "furniture", titleEn: "Reception Counters", titleAr: "كاونترات استقبال" },
  { key: "carpet", category: "furniture", titleEn: "Carpet", titleAr: "سجاد" },

  // Décor
  { key: "flowers", category: "decor", titleEn: "Flowers", titleAr: "زهور وتنسيق نباتي" },
  { key: "mirrors", category: "decor", titleEn: "Mirrors", titleAr: "مرايا" },
  { key: "general_decor", category: "decor", titleEn: "General Décor", titleAr: "ديكور عام" },
  { key: "scenic_fitout", category: "decor", titleEn: "Scenic / Fit-Out", titleAr: "تجهيز مساحات وديكور مسرحي" },

  // Hospitality
  { key: "catering", category: "hospitality", titleEn: "Catering", titleAr: "إعاشة وضيافة" },
  { key: "coffee_service", category: "hospitality", titleEn: "Coffee Service", titleAr: "خدمة قهوة ومشروبات ساخنة" },
  { key: "beverages", category: "hospitality", titleEn: "Beverages", titleAr: "مشروبات ومرطبات" },

  // Operations
  { key: "security", category: "operations", titleEn: "Security", titleAr: "أمن وحراسة" },
  { key: "logistics", category: "operations", titleEn: "Logistics", titleAr: "خدمات لوجستية ونقل" },
  { key: "power_generators", category: "operations", titleEn: "Generators / Power", titleAr: "مولدات وطاقة كهربائية" },
  { key: "temporary_structures", category: "operations", titleEn: "Temporary Structures", titleAr: "هياكل وخيام مؤقتة" },
] as const;

export function getCommonRequirementCatalog(): CommonRequirementCatalogItem[] {
  return [...COMMON_REQUIREMENT_CATALOG];
}

export interface ProcurementPackagesResult {
  packages: ProcurementPackage[];
  error?: "procurement_packages_load_failed";
}

export interface ProcurementPackageDetailResult {
  package: ProcurementPackage | null;
  error?: "procurement_package_detail_load_failed";
}

export interface PackageSupplierQuotationOption {
  id: string;
  supplierId: string;
  serviceId: string;
  supplierReference: string;
  quotationDate: string;
  packageTotal: number | null;
  currency: string;
}
