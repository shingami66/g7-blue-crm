"use client";

import { useRef } from "react";
import type { QuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import type { CommercialAmendmentDraftLine } from "@/lib/quotations/commercial-amendment-view-model";

type FlexibleCommercialBuilderProps = {
  lines: CommercialAmendmentDraftLine[];
  onChange: (lines: CommercialAmendmentDraftLine[]) => void;
  dictionary: QuotationsDictionary;
  disabled?: boolean;
};

function newLine(
  lineKey: string,
  parentLineKey: string | null,
  role: CommercialAmendmentDraftLine["commercial_role"],
): CommercialAmendmentDraftLine {
  return {
    line_key: lineKey,
    parent_line_key: parentLineKey,
    commercial_role: role,
    description: "",
    description_ar: null,
    details: null,
    category: "",
    qty: 1,
    unit: "unit",
    unit_price: 0,
    is_selected: role !== "optional_add_on",
  };
}

export default function FlexibleCommercialBuilder({
  lines,
  onChange,
  dictionary,
  disabled = false,
}: FlexibleCommercialBuilderProps) {
  const amendment = dictionary.amendment;
  const nextKey = useRef(1);

  function nextLineKey() {
    let candidate = "";
    do {
      candidate = `new-${nextKey.current++}`;
    } while (lines.some((line) => line.line_key === candidate));
    return candidate;
  }

  function updateLine(lineKey: string, update: Partial<CommercialAmendmentDraftLine>) {
    onChange(lines.map((line) => (line.line_key === lineKey ? { ...line, ...update } : line)));
  }

  function addAuthorityLine() {
    onChange([...lines, newLine(nextLineKey(), null, "authority_line")]);
  }

  function addChild(parentLineKey: string, role: "included_component" | "optional_add_on") {
    onChange([...lines, newLine(nextLineKey(), parentLineKey, role)]);
  }

  function removeLine(lineKey: string) {
    onChange(lines.filter((line) => line.line_key !== lineKey && line.parent_line_key !== lineKey));
  }

  const roots = lines.filter((line) => line.parent_line_key === null);
  const childrenByParent = new Map<string, CommercialAmendmentDraftLine[]>();
  for (const line of lines) {
    if (!line.parent_line_key) continue;
    const children = childrenByParent.get(line.parent_line_key) ?? [];
    children.push(line);
    childrenByParent.set(line.parent_line_key, children);
  }
  const orderedLines = roots.flatMap((root) => [root, ...(childrenByParent.get(root.line_key) ?? [])]);
  const mode = lines.some((line) => line.parent_line_key !== null)
    ? roots.some((root) => !childrenByParent.has(root.line_key))
      ? amendment.modeMixed
      : amendment.modePackage
    : amendment.modeItemized;

  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-primary">{amendment.builderTitle}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{mode}</p>
        </div>
        <button
          type="button"
          onClick={addAuthorityLine}
          disabled={disabled}
          className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {amendment.addAuthorityLine}
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {orderedLines.map((line) => {
          const isChild = line.parent_line_key !== null;
          return (
            <div
              key={line.line_key}
              className={`rounded-lg border p-4 ${isChild ? "ms-4 border-outline-variant bg-surface" : "border-primary/20 bg-primary/5"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  <span>
                    {line.commercial_role === "authority_line"
                      ? amendment.authorityLine
                      : line.commercial_role === "included_component"
                        ? amendment.included
                        : amendment.optional}
                  </span>
                  {line.commercial_role === "optional_add_on" && (
                    <span className="rounded-full bg-surface-container-high px-2 py-1 normal-case">
                      {line.is_selected ? amendment.selected : amendment.notSelected}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isChild && (
                    <>
                      <button
                        type="button"
                        onClick={() => addChild(line.line_key, "included_component")}
                        disabled={disabled}
                        className="rounded border border-outline-variant px-2 py-1 text-xs font-semibold text-on-surface hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {amendment.addIncluded}
                      </button>
                      <button
                        type="button"
                        onClick={() => addChild(line.line_key, "optional_add_on")}
                        disabled={disabled}
                        className="rounded border border-outline-variant px-2 py-1 text-xs font-semibold text-on-surface hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {amendment.addOptional}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeLine(line.line_key)}
                    disabled={disabled || (lines.length === 1 && !isChild)}
                    className="rounded border border-error/30 px-2 py-1 text-xs font-semibold text-error hover:bg-error/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {amendment.removeLine}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-on-surface-variant">
                  {dictionary.detail.labels.service}
                  <input
                    value={line.description}
                    onChange={(event) => updateLine(line.line_key, { description: event.target.value })}
                    disabled={disabled}
                    dir="auto"
                    className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-on-surface-variant">
                  {amendment.descriptionAr}
                  <input
                    value={line.description_ar ?? ""}
                    onChange={(event) => updateLine(line.line_key, { description_ar: event.target.value || null })}
                    disabled={disabled}
                    dir="rtl"
                    className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-on-surface-variant">
                  {dictionary.form.detailsCategoryOptional}
                  <input
                    value={line.details ?? ""}
                    onChange={(event) => updateLine(line.line_key, { details: event.target.value || null })}
                    disabled={disabled}
                    dir="auto"
                    className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-on-surface-variant">
                  {dictionary.form.categoryPlaceholder}
                  <input
                    value={line.category}
                    onChange={(event) => updateLine(line.line_key, { category: event.target.value })}
                    disabled={disabled}
                    dir="auto"
                    className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-on-surface-variant">
                  {dictionary.detail.labels.qty}
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.qty}
                    onChange={(event) => updateLine(line.line_key, { qty: Number(event.target.value) || 0 })}
                    disabled={disabled}
                    dir="ltr"
                    className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-on-surface-variant">
                  {amendment.unit}
                  <input
                    value={line.unit}
                    onChange={(event) => updateLine(line.line_key, { unit: event.target.value })}
                    disabled={disabled}
                    dir="auto"
                    className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface disabled:opacity-60"
                  />
                </label>
                <label className="text-xs font-semibold text-on-surface-variant">
                  {amendment.unitPrice}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.commercial_role === "included_component" ? 0 : line.unit_price}
                    readOnly={line.commercial_role === "included_component"}
                    onChange={(event) => updateLine(line.line_key, { unit_price: Number(event.target.value) || 0 })}
                    disabled={disabled}
                    dir="ltr"
                    className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface read-only:bg-surface-container-low read-only:text-on-surface-variant disabled:opacity-60"
                  />
                </label>
                {line.commercial_role === "optional_add_on" && (
                  <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-on-surface">
                    <input
                      type="checkbox"
                      checked={line.is_selected}
                      onChange={(event) => updateLine(line.line_key, { is_selected: event.target.checked })}
                      disabled={disabled}
                    />
                    {line.is_selected ? amendment.selected : amendment.notSelected}
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
