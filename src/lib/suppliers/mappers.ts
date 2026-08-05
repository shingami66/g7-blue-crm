import type {
  Supplier,
  SupplierDirectoryItem,
  SupplierStatus,
  SupplierType,
  SupplierVatRegistrationStatus,
} from "@/types/supplier";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function requiredText(value: unknown, fallback: string): string {
  return nullableText(value) ?? fallback;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function supplierStatus(value: unknown): SupplierStatus {
  if (value === "active" || value === "on_hold" || value === "blacklisted" || value === "inactive") {
    return value;
  }
  throw new Error("Invalid supplier status");
}

function supplierType(value: unknown): SupplierType | null {
  return value === "company" || value === "individual" ? value : null;
}

function vatRegistrationStatus(value: unknown): SupplierVatRegistrationStatus | null {
  return value === "unknown" || value === "not_registered" || value === "registered" ? value : null;
}

function supplierRecord(row: unknown): Record<string, unknown> {
  if (!isRecord(row)) throw new Error("Invalid supplier row");
  return row;
}

export function mapRowToSupplierDirectoryItem(row: unknown): SupplierDirectoryItem {
  const source = supplierRecord(row);
  const displayName = nullableText(source.display_name);
  const legalName = nullableText(source.legal_name);
  const name = displayName ?? requiredText(source.name, legalName ?? "Unnamed Supplier");

  return {
    id: requiredText(source.id, ""),
    supplierNumber: nullableText(source.supplier_number),
    name,
    supplierType: supplierType(source.supplier_type),
    phone: nullableText(source.phone),
    category: nullableText(source.category),
    city: nullableText(source.city),
    coverageArea: nullableText(source.coverage_area),
    country: nullableText(source.country),
    isPreferred: booleanValue(source.is_preferred),
    rating: numberValue(source.rating),
    status: supplierStatus(source.status),
    isDeleted: booleanValue(source.is_deleted),
  };
}

export function mapRowToSupplier(
  row: unknown,
  options: { canViewSensitive: boolean; canReadBank: boolean },
): Supplier {
  const source = supplierRecord(row);
  const directoryItem = mapRowToSupplierDirectoryItem(source);
  const contactName = nullableText(source.contact_name) ?? requiredText(source.contact, directoryItem.name);

  return {
    ...directoryItem,
    legalName: options.canViewSensitive ? nullableText(source.legal_name) : null,
    displayName: nullableText(source.display_name),
    contactName,
    phone: requiredText(source.phone, ""),
    whatsappPhone: nullableText(source.whatsapp_phone),
    email: nullableText(source.email),
    coverageArea: nullableText(source.coverage_area),
    vatRegistrationStatus: options.canViewSensitive
      ? vatRegistrationStatus(source.vat_registration_status)
      : null,
    vatNumber: options.canViewSensitive ? nullableText(source.vat_number) : null,
    crNumber: options.canViewSensitive ? nullableText(source.cr_number) : null,
    paymentTerms: options.canViewSensitive ? nullableText(source.payment_terms) : null,
    notes: options.canViewSensitive ? nullableText(source.notes) : null,
    blacklistedReason: options.canViewSensitive ? nullableText(source.blacklisted_reason) : null,
    blacklistedAt: options.canViewSensitive ? nullableText(source.blacklisted_at) : null,
    canViewSensitive: options.canViewSensitive,
    canReadBank: options.canReadBank,
    bankName: options.canReadBank ? nullableText(source.bank_name) : null,
    bankAccountName: options.canReadBank ? nullableText(source.bank_account_name) : null,
    iban: options.canReadBank ? nullableText(source.iban) : null,
  };
}
