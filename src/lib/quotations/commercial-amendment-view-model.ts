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

type ComparableCommercialLine = {
  key: string;
  selfKey: string;
  lineKey: string;
  parentLineKey: string | null;
  role: CommercialAmendmentDraftLine["commercial_role"];
  description: string;
  parentContext: string;
  isSelected: boolean;
};

function lineParentContext(line: CommercialAmendmentDraftLine) {
  return comparableLine(line, null);
}

function toComparableLines(lines: CommercialAmendmentDraftLine[]): ComparableCommercialLine[] {
  const parents = new Map(lines.map((line) => [line.line_key, lineParentContext(line)]));
  return lines.map((line) => {
    const parentContext = line.parent_line_key ? parents.get(line.parent_line_key) ?? "" : "";
    return {
      key: comparableLine(line, parentContext),
      selfKey: comparableLine(line, null),
      lineKey: line.line_key,
      parentLineKey: line.parent_line_key,
      role: line.commercial_role,
      description: line.description.trim(),
      parentContext,
      isSelected: line.is_selected,
    };
  });
}

function comparableItems(items: QuotationItem[]) {
  return toComparableLines(items.map((item) => ({
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
  })));
}

function stableComparableOrder(left: ComparableCommercialLine, right: ComparableCommercialLine) {
  const leftKey = [left.description, left.parentContext, left.role, left.key].join("\u0000");
  const rightKey = [right.description, right.parentContext, right.role, right.key].join("\u0000");
  return leftKey === rightKey ? 0 : leftKey < rightKey ? -1 : 1;
}

function matchComparableLines(
  predecessor: ComparableCommercialLine[],
  proposed: ComparableCommercialLine[],
) {
  const unmatchedPredecessor = [...predecessor].sort(stableComparableOrder);
  const unmatchedProposed = [...proposed].sort(stableComparableOrder);
  const matches: Array<{ predecessor: ComparableCommercialLine; proposed: ComparableCommercialLine }> = [];

  const matchBy = (keyFor: (line: ComparableCommercialLine) => string) => {
    for (let proposedIndex = 0; proposedIndex < unmatchedProposed.length; proposedIndex += 1) {
      const proposedLine = unmatchedProposed[proposedIndex];
      const predecessorIndex = unmatchedPredecessor.findIndex(
        (predecessorLine) => keyFor(predecessorLine) === keyFor(proposedLine),
      );
      if (predecessorIndex === -1) continue;

      const [predecessorLine] = unmatchedPredecessor.splice(predecessorIndex, 1);
      const [matchedProposedLine] = unmatchedProposed.splice(proposedIndex, 1);
      matches.push({ predecessor: predecessorLine, proposed: matchedProposedLine });
      proposedIndex -= 1;
    }
  };

  matchBy((line) => line.key);
  matchBy((line) => [line.description, line.role, line.parentContext].join("|"));
  matchBy((line) => [line.description, line.parentContext].join("|"));
  matchBy((line) => [line.description, line.role].join("|"));
  matchBy((line) => line.description);

  return { matches, unmatchedPredecessor, unmatchedProposed };
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
  const proposed = toComparableLines(input.proposedLines);
  const { matches, unmatchedPredecessor, unmatchedProposed } = matchComparableLines(predecessor, proposed);
  const matchedLineKeys = new Map(matches.map(({ predecessor: previous, proposed: line }) => [
    previous.lineKey,
    line.lineKey,
  ]));
  const addedLines = unmatchedProposed.length;
  const removedLines = unmatchedPredecessor.length;
  const changedLines = matches.filter(({ predecessor: previous, proposed: line }) => {
    if (previous.key === line.key) return false;
    const retainedParent = previous.parentLineKey !== null
      && line.parentLineKey !== null
      && matchedLineKeys.get(previous.parentLineKey) === line.parentLineKey;
    return !(retainedParent && previous.selfKey === line.selfKey);
  }).length;
  const optionalChanges = matches.filter(({ predecessor: previous, proposed: line }) => (
    line.role === "optional_add_on" && previous.isSelected !== line.isSelected
  )).length;
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
