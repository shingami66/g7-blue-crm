"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createApprovedCommercialAmendment } from "@/lib/quotations/actions";
import type { QuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";

export default function CommercialAmendmentCreateDialog({
  sourceQuotationId,
  dictionary,
}: {
  sourceQuotationId: string;
  dictionary: QuotationsDictionary["amendment"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [mutationKey, setMutationKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setError(null);
    setOpen(true);
  }

  async function submit() {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError(dictionary.reasonRequired);
      return;
    }
    const stableKey = mutationKey ?? crypto.randomUUID();
    setMutationKey(stableKey);
    setPending(true);
    setError(null);
    const result = await createApprovedCommercialAmendment({
      source_quotation_id: sourceQuotationId,
      amendment_reason: trimmedReason,
      mutation_key: stableKey,
    });
    setPending(false);
    if (!result.success || !result.data?.successor_quotation_id) {
      setError(result.error ?? dictionary.saveFailed);
      return;
    }
    router.push(`/quotations/${result.data.successor_quotation_id}/amendment`);
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex h-9 min-h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-on-primary shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {dictionary.createAction}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-primary/30 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="commercial-amendment-create-title"
            className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
          >
            <h2 id="commercial-amendment-create-title" className="text-lg font-semibold text-primary">
              {dictionary.createTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{dictionary.createDescription}</p>
            <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm leading-6 text-on-surface">
              {dictionary.originalActiveNotice}
            </p>
            <label htmlFor="commercial-amendment-reason" className="mt-5 block text-sm font-semibold text-on-surface">
              {dictionary.reasonLabel}
            </label>
            <textarea
              id="commercial-amendment-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={dictionary.reasonPlaceholder}
              maxLength={500}
              rows={4}
              disabled={pending}
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            />
            {error && <p className="mt-2 text-sm text-error" role="alert">{error}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low disabled:opacity-60"
              >
                {dictionary.cancel}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? dictionary.savingDraft : dictionary.continue}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
