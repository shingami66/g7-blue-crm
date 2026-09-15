"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import PendingLink from "@/components/ui/PendingLink";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatSupplierAdvanceAmount } from "@/lib/supplier-advances/formatting";
import { authorizeSupplierAdvanceAction } from "@/lib/supplier-advances/actions";
import type { SupplierAdvancesDictionary } from "@/lib/i18n/dictionaries/supplier-advances";
import type { SupplierAdvanceCommitmentOption } from "@/lib/supplier-advances/types";

export default function SupplierAdvanceAuthorizationForm({
  commitments,
  dictionary,
  requestId,
}: {
  commitments: SupplierAdvanceCommitmentOption[];
  dictionary: SupplierAdvancesDictionary;
  requestId: string;
}) {
  const router = useRouter();
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setErrorCode(null);
    startTransition(async () => {
      const result = await authorizeSupplierAdvanceAction(formData);
      if (!result.success) {
        setErrorCode(result.errorCode ?? "supplier_advance_record_failed");
        return;
      }
      router.push(`/supplier-advances/${result.data?.advance_id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:p-6" data-testid="supplier-advance-authorization-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-on-surface">
          <span>{dictionary.fields.commitment}</span>
          <select name="commitment_id" required autoFocus defaultValue="" className="min-h-10 rounded-lg border border-surface-variant bg-surface-container-lowest px-3 text-[13px] outline-none focus:border-primary">
            <option value="" disabled>{dictionary.forms.selectCommitment}</option>
            {commitments.map((commitment) => {
              const label = isolateBidiText([
                commitment.service_number,
                commitment.supplier_name,
                formatSupplierAdvanceAmount(commitment.currency, commitment.available_authorization_amount),
              ].join(" · "));
              return <option key={commitment.id} value={commitment.id}>{label}</option>;
            })}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-on-surface">
          <span>{dictionary.fields.authorizedAmount}</span>
          <input name="amount" type="number" min="0.01" step="0.01" required inputMode="decimal" className="min-h-10 rounded-lg border border-surface-variant px-3 text-start text-[13px] tabular-nums outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-on-surface sm:col-span-2">
          <span>{dictionary.fields.reason}</span>
          <textarea name="reason" rows={3} minLength={5} maxLength={2000} required className="rounded-lg border border-surface-variant px-3 py-2 text-[13px] outline-none focus:border-primary" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-on-surface sm:col-span-2">
          <span>{dictionary.forms.authorizationEvidence}</span>
          <input name="document" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required className="min-h-10 rounded-lg border border-surface-variant px-3 py-2 text-[12px]" />
        </label>
      </div>
      <input type="hidden" name="request_id" value={requestId} />
      {errorCode && <p role="alert" className="mt-4 rounded-lg border border-error/30 bg-error-container/30 px-3 py-2 text-[12px] text-error">{dictionary.errors[errorCode] ?? dictionary.errors.supplier_advance_record_failed}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending || commitments.length === 0} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary disabled:opacity-50">{pending ? dictionary.actions.confirm : dictionary.authorizeAdvance}</button>
        <PendingLink href="/supplier-advances" pendingLabel={dictionary.actions.cancel} className="inline-flex min-h-10 items-center rounded-lg border border-surface-variant px-4 py-2 text-[13px] font-semibold text-on-surface hover:bg-surface-container-low">{dictionary.actions.cancel}</PendingLink>
      </div>
    </form>
  );
}
