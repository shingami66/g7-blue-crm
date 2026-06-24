import type { CompanySettingsRow } from "@/lib/settings/types";
import type { QuotationSnapshotSeller, QuotationSnapshotBuyer, QuotationDetail } from "@/lib/quotations/types";
import type { InvoiceSnapshotData } from "./types";
import type { JsonValue } from "@/types/invoice";

export function buildSellerSnapshot(settings: CompanySettingsRow): QuotationSnapshotSeller {
  return {
    snapshotVersion: 1,
    snapshotSource: "invoice_creation",
    snapshotCapturedAt: new Date().toISOString(),
    snapshotNote: null,
    legalNameEn: settings.legal_name_en,
    legalNameAr: settings.legal_name_ar || null,
    brandName: null,
    tin: settings.tin_number || null,
    entityUnifiedNumber: null,
    crNumber: settings.cr_number || null,
    vatMode: settings.vat_mode as "not_registered" | "vat_registered_phase_1" | "phase2_integrated",
    vatNumber: settings.vat_number || null,
    vatEffectiveDate: settings.vat_effective_date || null,
    vatRate: settings.default_vat_percent,
    officialEmail: settings.official_email,
    officialPhone: settings.official_phone,
    website: null,
    address: {
      shortAddress: null,
      buildingNo: null,
      street: null,
      district: null,
      secondaryNo: null,
      postalCode: null,
      city: null,
      country: null,
      display: settings.national_address || null,
    },
    bank: {
      bankName: settings.bank_name,
      accountName: settings.bank_account_holder,
      accountNo: null,
      iban: settings.bank_iban,
    },
    logoPath: null,
    currency: settings.currency,
    terms: settings.default_terms || null,
  };
}

export function buildBuyerSnapshot(
  quotationSnapshotBuyer: QuotationSnapshotBuyer | null | undefined,
  fallbackCustomerId: string,
  fallbackCustomerInfo?: { company: string; contact: string }
): QuotationSnapshotBuyer | null {
  if (quotationSnapshotBuyer) {
    return quotationSnapshotBuyer;
  }

  if (fallbackCustomerId) {
    return {
      snapshotVersion: 1,
      snapshotSource: "invoice_fallback",
      snapshotCapturedAt: new Date().toISOString(),
      snapshotNote: "Fallback from quotation customer relation",
      customerId: fallbackCustomerId,
      customerType: null,
      name: fallbackCustomerInfo?.company || "Unknown Customer",
      legalName: fallbackCustomerInfo?.company || null,
      contactName: fallbackCustomerInfo?.contact || null,
      email: null,
      phone: null,
      crNumber: null,
      vatNumber: null,
      billingEmail: null,
      financeContact: null,
      paymentTerms: null,
      poRequired: null,
      address: {
        shortAddress: null,
        buildingNo: null,
        street: null,
        district: null,
        secondaryNo: null,
        postalCode: null,
        city: null,
        country: null,
        display: null,
      }
    };
  }

  return null;
}

export function buildQuotationSnapshot(quotation: QuotationDetail): JsonValue {
  return {
    quotation_id: quotation.id,
    quotation_number: quotation.quotationNumber,
    service_id: quotation.serviceId,
    customer_id: quotation.customerId,
    items: quotation.items.map(item => ({
      description: item.description,
      details: item.details,
      qty: item.qty,
      unit_price: item.unitPrice,
      vat: item.vat,
      total: item.total
    })),
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    vat_rate: quotation.vatRate,
    vat_amount: quotation.vatAmount,
    grand_total: quotation.grandTotal,
    currency: "SAR",
    status: quotation.status,
    created_at: quotation.createdAt,
    updated_at: quotation.updatedAt
  };
}

export function buildBankDetailsSnapshot(settings: CompanySettingsRow): JsonValue {
  return {
    bank_name: settings.bank_name,
    bank_account_name: settings.bank_account_holder,
    iban: settings.bank_iban,
    account_number: null // No explicit account_number in current CompanySettingsRow
  };
}

export function buildDocumentRulesSnapshot(settings: CompanySettingsRow): JsonValue {
  const isNotRegistered = settings.vat_mode === "not_registered";

  return {
    vat_mode: settings.vat_mode,
    default_vat_percent: settings.default_vat_percent,
    currency: settings.currency,
    terms: settings.default_terms,
    document_label: isNotRegistered ? "Commercial Invoice" : "Tax Invoice",
    rules: {
      block_tax_invoice: isNotRegistered,
      block_vat_15_display: isNotRegistered,
      block_vat_number_display: isNotRegistered,
      block_zatca: isNotRegistered,
      block_fatoora: isNotRegistered,
      block_qr: isNotRegistered,
      block_xml: isNotRegistered
    }
  };
}

export function buildInvoiceSnapshotData(
  settings: CompanySettingsRow,
  quotation: QuotationDetail
): InvoiceSnapshotData & { vat_mode: string; vat_rate: number; document_label: string } {
  const isNotRegistered = settings.vat_mode === "not_registered";
  const documentLabel = isNotRegistered ? "Commercial Invoice" : "Tax Invoice";

  return {
    snapshot_seller: buildSellerSnapshot(settings) as unknown as JsonValue,
    snapshot_buyer: buildBuyerSnapshot(quotation.snapshotBuyer, quotation.customerId, quotation.customer) as unknown as JsonValue,
    snapshot_quotation: buildQuotationSnapshot(quotation),
    snapshot_bank_details: buildBankDetailsSnapshot(settings),
    snapshot_document_rules: buildDocumentRulesSnapshot(settings),
    vat_mode: settings.vat_mode,
    vat_rate: settings.default_vat_percent,
    document_label: documentLabel
  };
}
