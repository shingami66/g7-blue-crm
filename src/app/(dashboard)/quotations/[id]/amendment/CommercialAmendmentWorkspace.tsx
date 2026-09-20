"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { approveApprovedCommercialAmendment, updateApprovedCommercialAmendmentDraft } from "@/lib/quotations/actions";
import type { QuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import type { QuotationDetail } from "@/lib/quotations/types";
import {
  buildCommercialAmendmentChangeSummary,
  commercialAmendmentPreviewGrandTotal,
  commercialAmendmentPreviewSubtotal,
  deriveCommercialAmendmentMode,
  toCommercialAmendmentDraftLines,
  type CommercialAmendmentDraftLine,
} from "@/lib/quotations/commercial-amendment-view-model";

function serializeDraft(input: {
  event: string;
  date: string;
  validUntil: string;
  discount: number;
  lines: CommercialAmendmentDraftLine[];
}) {
  return JSON.stringify({
    ...input,
    lines: input.lines.map(({ line_key, ...line }) => ({ line_key, ...line })),
  });
}

export default function CommercialAmendmentWorkspace({
  quotation,
  predecessor,
  dictionary,
  canWrite,
  canApprove,
}: {
  quotation: QuotationDetail;
  predecessor: QuotationDetail;
  dictionary: QuotationsDictionary;
  canWrite: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const amendment = dictionary.amendment;
  const nextKey = useRef(1);
  const [event, setEvent] = useState(quotation.event);
  const [date, setDate] = useState(quotation.date);
  const [validUntil, setValidUntil] = useState(quotation.validUntil ?? "");
  const [discount, setDiscount] = useState(quotation.discount);
  const [lines, setLines] = useState(() => toCommercialAmendmentDraftLines(quotation.items));
  const [updatedAt, setUpdatedAt] = useState(quotation.updatedAt);
  const [serverTotals, setServerTotals] = useState({
    subtotal: quotation.subtotal,
    discount: quotation.discount,
    vatAmount: quotation.vatAmount,
    grandTotal: quotation.grandTotal,
  });
  const [savedSnapshot, setSavedSnapshot] = useState(() => serializeDraft({
    event: quotation.event,
    date: quotation.date,
    validUntil: quotation.validUntil ?? "",
    discount: quotation.discount,
    lines: toCommercialAmendmentDraftLines(quotation.items),
  }));
  const [pending, setPending] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalPending, setApprovalPending] = useState(false);
  const [approvalKey, setApprovalKey] = useState<string | null>(null);

  const currentSnapshot = serializeDraft({ event, date, validUntil, discount, lines });
  const dirty = currentSnapshot !== savedSnapshot;
  const mode = deriveCommercialAmendmentMode(lines);
  const previewSubtotal = commercialAmendmentPreviewSubtotal(lines);
  const previewGrandTotal = commercialAmendmentPreviewGrandTotal(lines, discount, quotation.vatRate);
  const summary = buildCommercialAmendmentChangeSummary({
    predecessorItems: predecessor.items,
    proposedLines: lines,
    currentTotal: predecessor.grandTotal,
    discount,
    vatRate: quotation.vatRate,
    proposedPersistedTotal: dirty ? undefined : serverTotals.grandTotal,
  });
  const orderedLines = useMemo(() => {
    const roots = lines.filter((line) => line.parent_line_key === null);
    const children = new Map<string, CommercialAmendmentDraftLine[]>();
    for (const line of lines) {
      if (line.parent_line_key) {
        const current = children.get(line.parent_line_key) ?? [];
        current.push(line);
        children.set(line.parent_line_key, current);
      }
    }
    return roots.flatMap((root) => [root, ...(children.get(root.line_key) ?? [])]);
  }, [lines]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = amendment.unsavedChanges;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [amendment.unsavedChanges, dirty]);

  function updateLine(lineKey: string, update: Partial<CommercialAmendmentDraftLine>) {
    setLines((current) => current.map((line) => (line.line_key === lineKey ? { ...line, ...update } : line)));
    setSaveMessage(null);
    setError(null);
  }

  function addAuthorityLine() {
    const lineKey = `new-${nextKey.current++}`;
    setLines((current) => [
      ...current,
      {
        line_key: lineKey,
        parent_line_key: null,
        commercial_role: "authority_line",
        description: "",
        description_ar: null,
        details: null,
        category: "",
        qty: 1,
        unit: "unit",
        unit_price: 0,
        is_selected: true,
      },
    ]);
  }

  function addChild(parentLineKey: string, role: "included_component" | "optional_add_on") {
    const lineKey = `new-${nextKey.current++}`;
    setLines((current) => [
      ...current,
      {
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
        is_selected: role === "included_component",
      },
    ]);
  }

  function removeLine(lineKey: string) {
    setLines((current) => current.filter((line) => line.line_key !== lineKey && line.parent_line_key !== lineKey));
  }

  async function saveDraft() {
    if (!canWrite || pending || !dirty) return;
    setPending(true);
    setSaveMessage(null);
    setError(null);
    const result = await updateApprovedCommercialAmendmentDraft({
      quotation_id: quotation.id,
      event,
      date,
      valid_until: validUntil || null,
      discount,
      expected_updated_at: updatedAt,
      lines,
    });
    setPending(false);
    if (!result.success || !result.data) {
      setError(result.domainErrorCode === "quotation_amendment_draft_concurrency_conflict" ? amendment.reloadRequired : result.error ?? amendment.saveFailed);
      return;
    }
    setUpdatedAt(result.data.updated_at);
    setServerTotals({
      subtotal: result.data.subtotal,
      discount: result.data.discount,
      vatAmount: result.data.vat_amount,
      grandTotal: result.data.grand_total,
    });
    setSavedSnapshot(currentSnapshot);
    setSaveMessage(amendment.savedDraft);
  }

  async function approveDraft() {
    if (approvalPending || dirty || !summary.hasChanges) return;
    const stableKey = approvalKey ?? crypto.randomUUID();
    setApprovalKey(stableKey);
    setApprovalPending(true);
    setError(null);
    const result = await approveApprovedCommercialAmendment({
      source_quotation_id: predecessor.id,
      successor_quotation_id: quotation.id,
      mutation_key: stableKey,
    });
    setApprovalPending(false);
    if (!result.success) {
      setApprovalOpen(false);
      setError(result.domainErrorCode === "scope_successor_ceiling_below_invoiced" ? amendment.belowExposure : result.error ?? amendment.approvalFailed);
      return;
    }
    router.push(`/quotations/${quotation.id}`);
  }

  function money(value: number) {
    return formatSarAmount(dictionary.locale, value);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-12">
      <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary">{amendment.label}</span>
          <span className="text-sm font-semibold text-primary" dir="ltr">{quotation.quotationNumber}</span>
          <span className="text-sm text-on-surface-variant">{amendment.revision.replace("{number}", String(quotation.revisionNumber ?? "—"))}</span>
        </div>
        <h1 className="text-2xl font-semibold text-primary">{amendment.workspaceTitle}</h1>
        <p className="max-w-3xl text-sm leading-6 text-on-surface-variant">{amendment.workspaceSubtitle}</p>
        <p className="text-sm leading-6 text-on-surface">{amendment.originalActiveNotice}</p>
        {quotation.revisionReason && (
          <p className="text-sm text-on-surface"><span className="font-semibold">{amendment.internalReason}:</span> {quotation.revisionReason}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <fieldset disabled={!canWrite} className="contents">
          <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-primary">{amendment.builderTitle}</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {mode === "itemized" ? amendment.modeItemized : mode === "package" ? amendment.modePackage : amendment.modeMixed}
                </p>
              </div>
              <button type="button" onClick={addAuthorityLine} className="rounded-lg border border-primary px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5">
                {amendment.addAuthorityLine}
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {orderedLines.map((line) => {
                const isChild = line.parent_line_key !== null;
                return (
                  <div key={line.line_key} className={`rounded-lg border p-4 ${isChild ? "ms-4 border-outline-variant bg-surface" : "border-primary/20 bg-primary/5"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        <span>{line.commercial_role === "authority_line" ? amendment.authorityLine : line.commercial_role === "included_component" ? amendment.included : amendment.optional}</span>
                        {line.commercial_role === "optional_add_on" && <span className="rounded-full bg-surface-container-high px-2 py-1 normal-case">{line.is_selected ? amendment.selected : amendment.notSelected}</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!isChild && <>
                          <button type="button" onClick={() => addChild(line.line_key, "included_component")} className="rounded border border-outline-variant px-2 py-1 text-xs font-semibold text-on-surface hover:bg-surface">{amendment.addIncluded}</button>
                          <button type="button" onClick={() => addChild(line.line_key, "optional_add_on")} className="rounded border border-outline-variant px-2 py-1 text-xs font-semibold text-on-surface hover:bg-surface">{amendment.addOptional}</button>
                        </>}
                        <button type="button" onClick={() => removeLine(line.line_key)} className="rounded border border-error/30 px-2 py-1 text-xs font-semibold text-error hover:bg-error/5">{amendment.removeLine}</button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="text-xs font-semibold text-on-surface-variant">{dictionary.detail.labels.service}
                        <input value={line.description} onChange={(e) => updateLine(line.line_key, { description: e.target.value })} dir="auto" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
                      </label>
                      <label className="text-xs font-semibold text-on-surface-variant">{amendment.descriptionAr}
                        <input value={line.description_ar ?? ""} onChange={(e) => updateLine(line.line_key, { description_ar: e.target.value || null })} dir="rtl" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
                      </label>
                      <label className="text-xs font-semibold text-on-surface-variant">{dictionary.form.detailsCategoryOptional}
                        <input value={line.details ?? ""} onChange={(e) => updateLine(line.line_key, { details: e.target.value || null })} dir="auto" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
                      </label>
                      <label className="text-xs font-semibold text-on-surface-variant">{dictionary.form.categoryPlaceholder}
                        <input value={line.category} onChange={(e) => updateLine(line.line_key, { category: e.target.value })} dir="auto" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
                      </label>
                      <label className="text-xs font-semibold text-on-surface-variant">{dictionary.detail.labels.qty}
                        <input type="number" min="0.01" step="0.01" value={line.qty} onChange={(e) => updateLine(line.line_key, { qty: Number(e.target.value) || 0 })} dir="ltr" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
                      </label>
                      <label className="text-xs font-semibold text-on-surface-variant">{amendment.unit}
                        <input value={line.unit} onChange={(e) => updateLine(line.line_key, { unit: e.target.value })} dir="auto" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
                      </label>
                      <label className="text-xs font-semibold text-on-surface-variant">{amendment.unitPrice}
                        <input type="number" min="0" step="0.01" value={line.commercial_role === "included_component" ? 0 : line.unit_price} readOnly={line.commercial_role === "included_component"} onChange={(e) => updateLine(line.line_key, { unit_price: Number(e.target.value) || 0 })} dir="ltr" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface read-only:bg-surface-container-low read-only:text-on-surface-variant" />
                      </label>
                      {line.commercial_role === "optional_add_on" && (
                        <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-on-surface">
                          <input type="checkbox" checked={line.is_selected} onChange={(e) => updateLine(line.line_key, { is_selected: e.target.checked })} />
                          {line.is_selected ? amendment.selected : amendment.notSelected}
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
            <h2 className="text-lg font-semibold text-primary">{amendment.workspaceTitle}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm font-semibold text-on-surface">{dictionary.form.quotationEventLabel}<input value={event} onChange={(e) => setEvent(e.target.value)} dir="auto" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 font-normal" /></label>
              <label className="text-sm font-semibold text-on-surface">{dictionary.form.issueDate}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 font-normal" /></label>
              <label className="text-sm font-semibold text-on-surface">{dictionary.form.validUntil}<input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} dir="ltr" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 font-normal" /></label>
              <label className="text-sm font-semibold text-on-surface">{dictionary.form.discountSar}<input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} dir="ltr" className="mt-1 w-full rounded border border-outline-variant bg-surface px-3 py-2 font-normal" /></label>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-surface-variant pt-4">
              <div className="text-sm text-on-surface-variant">{dirty ? amendment.unsavedChanges : saveMessage ?? ""}</div>
              {canWrite && (
                <button type="button" onClick={saveDraft} disabled={pending || !dirty} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                  {pending ? amendment.savingDraft : amendment.saveDraft}
                </button>
              )}
            </div>
            {error && <p className="mt-3 text-sm text-error" role="alert">{error}</p>}
          </section>
          </fieldset>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
            <h2 className="text-lg font-semibold text-primary">{amendment.summaryTitle}</h2>
            <p className="mt-2 text-xs leading-5 text-on-surface-variant">{amendment.changesPresent}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-on-surface-variant">{amendment.currentAmount}</dt><dd className="font-semibold tabular-nums" dir="ltr">{money(summary.currentTotal)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-on-surface-variant">{amendment.proposedAmount}</dt><dd className="font-semibold tabular-nums" dir="ltr">{money(summary.proposedTotal)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-surface-variant pt-3"><dt className="font-semibold text-primary">{amendment.delta}</dt><dd className="font-semibold tabular-nums text-primary" dir="ltr">{money(summary.delta)}</dd></div>
            </dl>
            <div className="mt-4 space-y-2 text-sm text-on-surface-variant">
              <p>{amendment.addedLines}: <span className="font-semibold text-on-surface" dir="ltr">{formatUiNumber(dictionary.locale, summary.addedLines)}</span></p>
              <p>{amendment.removedLines}: <span className="font-semibold text-on-surface" dir="ltr">{formatUiNumber(dictionary.locale, summary.removedLines)}</span></p>
              <p>{amendment.changedLines}: <span className="font-semibold text-on-surface" dir="ltr">{formatUiNumber(dictionary.locale, summary.changedLines)}</span></p>
              <p>{amendment.optionalChanges}: <span className="font-semibold text-on-surface" dir="ltr">{formatUiNumber(dictionary.locale, summary.optionalChanges)}</span></p>
            </div>
            <div className="mt-4 rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">
              {summary.hasChanges ? amendment.sourceActiveUntilApproval : amendment.noChanges}
            </div>
          </section>

          <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><span className="text-on-surface-variant">{dictionary.form.subtotal}</span><span dir="ltr" className="font-semibold tabular-nums">{money(dirty ? previewSubtotal : serverTotals.subtotal)}</span></div>
              <div className="flex justify-between gap-3"><span className="text-on-surface-variant">{dictionary.form.discount}</span><span dir="ltr" className="font-semibold tabular-nums">{money(dirty ? discount : serverTotals.discount)}</span></div>
              <div className="flex justify-between gap-3 border-t border-surface-variant pt-3"><span className="font-semibold text-primary">{dictionary.form.grandTotal}</span><span dir="ltr" className="font-semibold text-primary tabular-nums">{money(dirty ? previewGrandTotal : serverTotals.grandTotal)}</span></div>
            </div>
            {canApprove && (
              <button type="button" onClick={() => setApprovalOpen(true)} disabled={dirty || !summary.hasChanges || approvalPending} className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                {amendment.approveAction}
              </button>
            )}
            {!summary.hasChanges && <p className="mt-3 text-xs leading-5 text-on-surface-variant">{amendment.noOpDisabled}</p>}
          </section>
        </aside>
      </div>

      {approvalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-primary/30 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="commercial-amendment-approval-title" className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl">
            <h2 id="commercial-amendment-approval-title" className="text-lg font-semibold text-primary">{amendment.approveTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{amendment.approveDescription}</p>
            <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-on-surface">{amendment.approveWarning}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setApprovalOpen(false)} disabled={approvalPending} className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface">{amendment.cancel}</button>
              <button type="button" onClick={approveDraft} disabled={approvalPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60">{approvalPending ? amendment.savingDraft : amendment.approveConfirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
