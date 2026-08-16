"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Banknote, Check, Pencil, Plus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { activateSupplierRateCard, createSupplierRateCard, deactivateSupplierRateCard, getSupplierRateCards, updateSupplierRateCard } from "@/lib/suppliers/rate-card-actions";
import type { SupplierRateCard, SupplierRateCardActionResult } from "@/lib/suppliers/rate-card-types";
import { formatSupplierCopy, getSupplierCategoryLabel, type SuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";
import type { Locale } from "@/lib/i18n/locales";
import { isolateBidiText } from "@/lib/i18n/bidi";

type Draft = { category: string; itemName: string; unit: string; pricingBasis: string; currency: "SAR"; baseCost: string; validFrom: string; validTo: string; status: "active" | "inactive"; notes: string };
const blankDraft: Draft = { category: "", itemName: "", unit: "", pricingBasis: "", currency: "SAR", baseCost: "", validFrom: "", validTo: "", status: "inactive", notes: "" };

export default function SupplierRateCardsList({ supplierId, dictionary, locale, canManage }: { supplierId: string; dictionary: SuppliersDictionary["rateCards"]; locale: Locale; canManage: boolean }) {
  const [rateCards, setRateCards] = useState<SupplierRateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadRateCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getSupplierRateCards(supplierId);
    if (result.error) setError(result.error);
    else setRateCards(result.rateCards);
    setLoading(false);
  }, [supplierId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRateCards(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRateCards]);

  function openCreate() {
    setEditingId(null);
    setDraft(blankDraft);
    setFeedback(null);
    setFormOpen(true);
  }

  function openEdit(rate: SupplierRateCard) {
    setEditingId(rate.id);
    setDraft({ category: rate.category ?? "", itemName: rate.itemName, unit: rate.unit, pricingBasis: rate.pricingBasis ?? "", currency: "SAR", baseCost: String(rate.baseCost), validFrom: rate.validFrom, validTo: rate.validTo ?? "", status: rate.status, notes: rate.notes ?? "" });
    setFeedback(null);
    setFormOpen(true);
  }

  function showResult(result: SupplierRateCardActionResult, successMessage: string) {
    if (result.success) {
      setFeedback(successMessage);
      setFormOpen(false);
      void loadRateCards();
      return;
    }
    if (result.error === "overlap" && result.conflict) {
      setFeedback(formatSupplierCopy(dictionary.overlap, { ...result.conflict, category: result.conflict.category ?? "", pricingBasis: result.conflict.pricingBasis ?? "", validTo: result.conflict.validTo ?? dictionary.current }));
    } else if (result.error === "validation_failed") {
      setFeedback(dictionary.validation);
    } else {
      setFeedback(dictionary.actionFailed);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    const base = { supplierId, category: draft.category || null, itemName: draft.itemName, unit: draft.unit, pricingBasis: draft.pricingBasis || null, currency: "SAR" as const, baseCost: draft.baseCost, validFrom: draft.validFrom, validTo: draft.validTo || null, notes: draft.notes || null };
    const result = editingId ? await updateSupplierRateCard({ id: editingId, ...base }) : await createSupplierRateCard({ ...base, status: draft.status });
    setSubmitting(false);
    showResult(result, editingId ? dictionary.saved : dictionary.saved);
  }

  async function changeStatus(rate: SupplierRateCard) {
    setFeedback(null);
    const result = rate.status === "active" ? await deactivateSupplierRateCard({ id: rate.id }) : await activateSupplierRateCard({ id: rate.id });
    showResult(result, rate.status === "active" ? dictionary.deactivated : dictionary.activated);
  }

  if (loading) return <div className="flex justify-center p-6 text-on-surface-variant"><span className="text-[14px]">{dictionary.loading}</span></div>;
  if (error) return <div className="rounded-lg border border-error/30 bg-error-container/20 p-4 text-[14px] text-on-surface-variant">{dictionary.loadFailed}</div>;

  return <div className="space-y-4">
    {canManage && !formOpen && <Button type="button" onClick={openCreate}><Plus size={16} />{dictionary.create}</Button>}
    {feedback && <p role="status" className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-[13px] text-on-surface-variant">{feedback}</p>}
    {canManage && formOpen && <RateCardForm draft={draft} setDraft={setDraft} dictionary={dictionary} editing={Boolean(editingId)} submitting={submitting} onSubmit={save} onCancel={() => setFormOpen(false)} />}
    {rateCards.length === 0 ? <div className="rounded-lg border border-outline-variant/50 p-4 text-center text-[14px] text-on-surface-variant">{dictionary.empty}</div> : rateCards.map((rate) => <article key={rate.id} className="rounded-lg border border-outline-variant/50 bg-surface p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h5 className="truncate text-[14px] font-bold text-on-surface" title={rate.itemName} dir="auto">{rate.itemName}</h5><div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-on-surface-variant">{rate.category && <span className="rounded bg-surface-variant px-1.5 py-0.5 text-[10px] font-medium" dir="auto">{getSupplierCategoryLabel(locale, rate.category)}</span>}<span dir="auto">{formatSupplierCopy(dictionary.perUnit, { unit: rate.unit })}</span>{rate.pricingBasis && <span className="rounded bg-surface-variant/50 px-1.5 py-0.5 text-[10px] text-on-surface-variant" dir="auto">{rate.pricingBasis}</span>}</div></div><StatusBadge variant={rate.status === "active" ? "active" : "inactive"}>{rate.status === "active" ? dictionary.active : dictionary.inactive}</StatusBadge></div><div className="mb-3 mt-3 flex items-center gap-2 text-[16px] font-bold tabular-nums text-primary"><Banknote size={16} /><span dir="ltr">{rate.currency === "SAR" ? formatSarAmount(locale, rate.baseCost) : `${isolateBidiText(rate.currency)} ${rate.baseCost}`}</span></div><div className="grid grid-cols-2 gap-2 text-[12px] text-on-surface-variant"><div><span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-outline">{dictionary.validFrom}</span><UiDateText locale={locale} value={rate.validFrom} /></div><div><span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-outline">{dictionary.validTo}</span>{rate.validTo ? <UiDateText locale={locale} value={rate.validTo} /> : dictionary.current}</div></div>{rate.notes && <div className="mt-3 border-t border-outline-variant/30 pt-3 text-[12px] italic text-on-surface-variant" dir="auto">{rate.notes}</div>}{canManage && <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant/30 pt-3"><Button type="button" size="sm" variant="outline" onClick={() => openEdit(rate)}><Pencil size={14} />{dictionary.edit}</Button><Button type="button" size="sm" variant="ghost" onClick={() => void changeStatus(rate)}>{rate.status === "active" ? <X size={14} /> : <Check size={14} />}{rate.status === "active" ? dictionary.deactivate : dictionary.activate}</Button></div>}</article>)}
  </div>;
}

function RateCardForm({ draft, setDraft, dictionary, editing, submitting, onSubmit, onCancel }: { draft: Draft; setDraft: (draft: Draft) => void; dictionary: SuppliersDictionary["rateCards"]; editing: boolean; submitting: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const update = (key: keyof Draft, value: string) => setDraft({ ...draft, [key]: value as Draft[typeof key] });
  return <form onSubmit={onSubmit} className="rounded-lg border border-primary/30 bg-surface-container-low p-4"><div className="mb-4 flex items-center justify-between gap-3"><h4 className="font-semibold text-primary">{editing ? dictionary.edit : dictionary.create}</h4><button type="button" onClick={onCancel} aria-label={dictionary.cancel} className="rounded p-1 text-on-surface-variant hover:bg-surface-container"><X size={16} /></button></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label={dictionary.itemName} value={draft.itemName} onChange={(value) => update("itemName", value)} required /><Field label={dictionary.category} value={draft.category} onChange={(value) => update("category", value)} /><Field label={dictionary.unit} value={draft.unit} onChange={(value) => update("unit", value)} required /><Field label={dictionary.pricingBasis} value={draft.pricingBasis} onChange={(value) => update("pricingBasis", value)} /><Field label={dictionary.baseCost} type="number" step="0.01" min="0.01" value={draft.baseCost} onChange={(value) => update("baseCost", value)} required /><Field label={dictionary.validFrom} type="date" value={draft.validFrom} onChange={(value) => update("validFrom", value)} required /><Field label={dictionary.validTo} type="date" value={draft.validTo} onChange={(value) => update("validTo", value)} /><label className="flex flex-col gap-1 text-[12px] font-semibold text-on-surface-variant"><span>{dictionary.currency}</span><select value="SAR" disabled className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface"><option value="SAR">SAR</option></select></label><label className="flex flex-col gap-1 text-[12px] font-semibold text-on-surface-variant"><span>{dictionary.status}</span><select value={draft.status} disabled={editing} onChange={(event) => update("status", event.target.value)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface"><option value="inactive">{dictionary.inactive}</option><option value="active">{dictionary.active}</option></select></label><label className="sm:col-span-2 flex flex-col gap-1 text-[12px] font-semibold text-on-surface-variant"><span>{dictionary.notes}</span><textarea value={draft.notes} onChange={(event) => update("notes", event.target.value)} rows={3} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-normal text-on-surface focus:border-primary focus:outline-none" /></label></div><div className="mt-4 flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>{dictionary.cancel}</Button><Button type="submit" loading={submitting}>{dictionary.save}</Button></div></form>;
}

function Field({ label, value, onChange, type = "text", step, min, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; step?: string; min?: string; required?: boolean }) {
  return <label className="flex flex-col gap-1 text-[12px] font-semibold text-on-surface-variant"><span>{label}{required ? " *" : ""}</span><input type={type} step={step} min={min} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-normal text-on-surface focus:border-primary focus:outline-none" /></label>;
}
