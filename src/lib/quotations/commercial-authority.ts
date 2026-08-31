import type { QuotationCommercialRole, QuotationItem } from "./types.ts";

export interface ProjectedCommercialComponent {
  item: QuotationItem;
  role: Exclude<QuotationCommercialRole, "authority_line">;
  contributes: boolean;
}

export interface ProjectedAuthorityLine {
  item: QuotationItem;
  includedComponents: ProjectedCommercialComponent[];
  selectedOptionalAddOns: ProjectedCommercialComponent[];
  /** The parent Authority Line amount plus selected child contributions. */
  customerAmount: number;
}

export interface CommercialAuthorityProjection {
  lines: ProjectedAuthorityLine[];
  subtotal: number;
  issueCount: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Projects the existing quotation-item source into W2A commercial authority.
 * It is deliberately a pure read model: amounts still come from persisted
 * quotation rows and the authoritative database RPC remains the write path.
 */
export function projectCommercialAuthority(
  items: QuotationItem[],
): CommercialAuthorityProjection {
  const roots = items.filter(
    (item) => (item.commercialRole ?? "authority_line") === "authority_line",
  );
  const components = items.filter((item) => {
    const role = item.commercialRole ?? "authority_line";
    return role === "included_component" || role === "optional_add_on";
  });
  const rootIds = new Set(roots.map((item) => item.id));
  let issueCount = items.length - roots.length - components.length;
  issueCount += components.filter(
    (item) => !rootIds.has(item.parentAuthorityLineId ?? ""),
  ).length;

  const lines = roots.map((item) => {
    const children = components.filter(
      (candidate) => candidate.parentAuthorityLineId === item.id,
    );
    const includedComponents = children
      .filter((candidate) => candidate.commercialRole === "included_component")
      .map((child) => ({ item: child, role: "included_component" as const, contributes: false }));
    const selectedOptionalAddOns = children
      .filter(
        (candidate) =>
          candidate.commercialRole === "optional_add_on" && candidate.isSelected !== false,
      )
      .map((child) => ({ item: child, role: "optional_add_on" as const, contributes: true }));

    const optionalAmount = selectedOptionalAddOns.reduce(
      (sum, child) => sum + (Number.isFinite(child.item.total) ? child.item.total : 0),
      0,
    );

    return {
      item,
      includedComponents,
      selectedOptionalAddOns,
      customerAmount: roundMoney(item.total + optionalAmount),
    };
  });

  return {
    lines,
    subtotal: roundMoney(lines.reduce((sum, line) => sum + line.customerAmount, 0)),
    issueCount,
  };
}
