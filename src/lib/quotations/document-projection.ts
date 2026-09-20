import type { QuotationItem } from "./types";

export interface QuotationDocumentGroup {
  rootId: string | null;
  items: QuotationItem[];
}

type IndexedItem = {
  item: QuotationItem;
  index: number;
};

function comparePersistedOrder(left: IndexedItem, right: IndexedItem): number {
  const leftCreatedAt = left.item.createdAt ?? "";
  const rightCreatedAt = right.item.createdAt ?? "";

  if (leftCreatedAt !== rightCreatedAt) {
    if (!leftCreatedAt) return 1;
    if (!rightCreatedAt) return -1;
    return leftCreatedAt.localeCompare(rightCreatedAt);
  }

  if (left.item.id !== right.item.id) {
    return left.item.id.localeCompare(right.item.id);
  }

  return left.index - right.index;
}

/**
 * Projects persisted quotation rows into customer-document order only.
 * Financial fields are never changed and no totals are calculated here.
 */
export function groupQuotationItemsForDocument(items: QuotationItem[]): QuotationDocumentGroup[] {
  const indexed = items.map((item, index) => ({ item, index }));
  const childrenByParent = new Map<string, IndexedItem[]>();

  for (const entry of indexed) {
    const parentId = entry.item.parentAuthorityLineId;
    if (!parentId) continue;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(entry);
    childrenByParent.set(parentId, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort(comparePersistedOrder);
  }

  const roots = indexed
    .filter((entry) => !entry.item.parentAuthorityLineId)
    .sort(comparePersistedOrder);
  const emitted = new Set<string>();
  const groups: QuotationDocumentGroup[] = [];

  function appendTree(entry: IndexedItem, target: QuotationItem[]): void {
    if (emitted.has(entry.item.id)) return;
    emitted.add(entry.item.id);
    target.push(entry.item);

    for (const child of childrenByParent.get(entry.item.id) ?? []) {
      appendTree(child, target);
    }
  }

  for (const root of roots) {
    const group: QuotationDocumentGroup = { rootId: root.item.id, items: [] };
    appendTree(root, group.items);
    groups.push(group);
  }

  // Valid W2A data has no orphaned or cyclic child rows. If a legacy row does,
  // retain it exactly once at the end rather than dropping or duplicating it.
  const leftovers = indexed
    .filter((entry) => !emitted.has(entry.item.id))
    .sort(comparePersistedOrder);
  if (leftovers.length > 0) {
    const fallback: QuotationDocumentGroup = { rootId: null, items: [] };
    for (const entry of leftovers) appendTree(entry, fallback.items);
    groups.push(fallback);
  }

  return groups;
}

export function projectQuotationItemsForDocument(items: QuotationItem[]): QuotationItem[] {
  return groupQuotationItemsForDocument(items).flatMap((group) => group.items);
}
