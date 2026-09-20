import type { QuotationItem } from "./types";

export type CommercialAmendmentDraftLine = {
  line_key: string;
  parent_line_key: string | null;
  commercial_role: "authority_line" | "included_component" | "optional_add_on";
  description: string;
  description_ar: string | null;
  details: string | null;
  category: string;
  qty: number;
  unit: string;
  unit_price: number;
  is_selected: boolean;
};

export type CommercialAmendmentMode = "itemized" | "package" | "mixed";

export type CommercialAmendmentChangeSummary = {
  hasChanges: boolean;
  addedLines: number;
  removedLines: number;
  changedLines: number;
  optionalChanges: number;
  currentTotal: number;
  proposedTotal: number;
  delta: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function toCommercialAmendmentDraftLines(items: QuotationItem[]): CommercialAmendmentDraftLine[] {
  const keysByItemId = new Map(items.map((item, index) => [item.id, `line-${index + 1}`]));
  return items.map((item, index) => ({
    line_key: `line-${index + 1}`,
    parent_line_key: item.parentAuthorityLineId ? keysByItemId.get(item.parentAuthorityLineId) ?? null : null,
    commercial_role: item.commercialRole ?? "authority_line",
    description: item.description,
    description_ar: item.descriptionAr ?? null,
    details: item.details,
    category: item.category,
    qty: item.qty,
    unit: item.unit ?? "unit",
    unit_price: item.unitPrice,
    is_selected: item.isSelected ?? true,
  }));
}

export function deriveCommercialAmendmentMode(lines: CommercialAmendmentDraftLine[]): CommercialAmendmentMode {
  const hasChildren = lines.some((line) => line.parent_line_key !== null);
  if (!hasChildren) return "itemized";
  const rootsWithChildren = new Set(lines.filter((line) => line.parent_line_key).map((line) => line.parent_line_key));
  const hasStandaloneRoot = lines.some(
    (line) => line.parent_line_key === null && !rootsWithChildren.has(line.line_key),
  );
  return hasStandaloneRoot ? "mixed" : "package";
}

function lineAmount(line: CommercialAmendmentDraftLine) {
  if (line.commercial_role === "included_component" || !line.is_selected) return 0;
  return roundMoney(line.qty * line.unit_price);
}

function comparableLine(line: CommercialAmendmentDraftLine, parentDescription: string | null) {
  return [
    parentDescription ?? "",
    line.commercial_role,
    line.description.trim(),
    line.description_ar?.trim() ?? "",
    line.details?.trim() ?? "",
    line.category.trim(),
    line.qty.toFixed(2),
    line.unit.trim(),
    line.unit_price.toFixed(2),
    String(line.is_selected),
  ].join("|");
}

function comparableItems(items: QuotationItem[]) {
  const roots = new Map(items.map((item) => [item.id, item.description.trim()]));
  return items.map((item) => ({
    key: comparableLine(
      {
        line_key: item.id,
        parent_line_key: item.parentAuthorityLineId ?? null,
        commercial_role: item.commercialRole ?? "authority_line",
        description: item.description,
        description_ar: item.descriptionAr ?? null,
        details: item.details,
        category: item.category,
        qty: item.qty,
        unit: item.unit ?? "unit",
        unit_price: item.unitPrice,
        is_selected: item.isSelected ?? true,
      },
      item.parentAuthorityLineId ? roots.get(item.parentAuthorityLineId) ?? null : null,
    ),
    role: item.commercialRole ?? "authority_line",
    description: item.description.trim(),
    isSelected: item.isSelected ?? true,
  }));
}

export function buildCommercialAmendmentChangeSummary(input: {
  predecessorItems: QuotationItem[];
  proposedLines: CommercialAmendmentDraftLine[];
  currentTotal: number;
  discount: number;
  vatRate: number;
  proposedPersistedTotal?: number;
}): CommercialAmendmentChangeSummary {
  const predecessor = comparableItems(input.predecessorItems);
  const proposedRoots = new Map(input.proposedLines.map((line) => [line.line_key, line.description.trim()]));
  const proposed = input.proposedLines.map((line) => ({
    key: comparableLine(
      line,
      line.parent_line_key ? proposedRoots.get(line.parent_line_key) ?? null : null,
    ),
    role: line.commercial_role,
    description: line.description.trim(),
    isSelected: line.is_selected,
  }));
  const predecessorByDescription = new Map(predecessor.map((line) => [line.description, line]));
  const proposedByDescription = new Map(proposed.map((line) => [line.description, line]));
  const addedLines = proposed.filter((line) => !predecessorByDescription.has(line.description)).length;
  const removedLines = predecessor.filter((line) => !proposedByDescription.has(line.description)).length;
  const changedLines = proposed.filter((line) => {
    const previous = predecessorByDescription.get(line.description);
    return previous && previous.key !== line.key;
  }).length;
  const optionalChanges = proposed.filter((line) => {
    if (line.role !== "optional_add_on") return false;
    const previous = predecessorByDescription.get(line.description);
    return previous && previous.isSelected !== line.isSelected;
  }).length;
  const proposedTotal = input.proposedPersistedTotal ?? commercialAmendmentPreviewGrandTotal(
    input.proposedLines,
    input.discount,
    input.vatRate,
  );
  return {
    hasChanges: addedLines > 0 || removedLines > 0 || changedLines > 0 || optionalChanges > 0 || proposedTotal !== input.currentTotal,
    addedLines,
    removedLines,
    changedLines,
    optionalChanges,
    currentTotal: input.currentTotal,
    proposedTotal,
    delta: roundMoney(proposedTotal - input.currentTotal),
  };
}

export function commercialAmendmentPreviewSubtotal(lines: CommercialAmendmentDraftLine[]) {
  return roundMoney(lines.reduce((sum, line) => sum + lineAmount(line), 0));
}

export function commercialAmendmentPreviewGrandTotal(
  lines: CommercialAmendmentDraftLine[],
  discount: number,
  vatRate: number,
) {
  const taxable = Math.max(0, roundMoney(commercialAmendmentPreviewSubtotal(lines) - discount));
  return roundMoney(taxable + (vatRate === 0 ? 0 : roundMoney(taxable * (vatRate / 100))));
}
