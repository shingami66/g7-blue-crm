export const EVENT_COSTING_COMMITMENT_SOURCES = [
  "purchase_order",
  "approved_contract",
  "supplier_quotation",
  "other_authorized",
] as const;

export type EventCostingCommitmentSource = (typeof EVENT_COSTING_COMMITMENT_SOURCES)[number];

export interface EventCostingCommitmentMetadata {
  commitmentSource: EventCostingCommitmentSource | null;
  supplierName: string | null;
  sourceReference: string | null;
  quotationReference: string | null;
  quotationDate: string | null;
}

type RawMetadataRow = Record<string, unknown>;

function asRecord(value: unknown): RawMetadataRow | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as RawMetadataRow
    : null;
}

function relatedRecord(value: unknown): RawMetadataRow | null {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
}

function nullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function commitmentSource(value: unknown): EventCostingCommitmentSource | null {
  return typeof value === "string" && EVENT_COSTING_COMMITMENT_SOURCES.includes(value as EventCostingCommitmentSource)
    ? value as EventCostingCommitmentSource
    : null;
}

export function mapEventCostingCommitmentMetadata(value: unknown): Map<string, EventCostingCommitmentMetadata> {
  if (!Array.isArray(value)) return new Map();

  const mapped = new Map<string, EventCostingCommitmentMetadata>();
  for (const valueRow of value) {
    const row = asRecord(valueRow);
    const id = nullableText(row?.id);
    if (!row || !id) continue;

    const supplier = relatedRecord(row.supplier);
    const quotation = relatedRecord(row.quotation);
    mapped.set(id, {
      commitmentSource: commitmentSource(row.commitment_source),
      supplierName: nullableText(supplier?.name) ?? nullableText(supplier?.legal_name),
      sourceReference: nullableText(row.source_reference),
      quotationReference: nullableText(quotation?.supplier_reference),
      quotationDate: nullableText(quotation?.quotation_date),
    });
  }
  return mapped;
}
