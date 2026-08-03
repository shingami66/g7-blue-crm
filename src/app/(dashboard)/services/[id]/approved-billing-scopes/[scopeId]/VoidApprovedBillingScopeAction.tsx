"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { voidApprovedBillingScope } from "@/lib/approved-billing-scopes/actions";
import type { ApprovedBillingScopeVoidReasonCode } from "@/lib/approved-billing-scopes/types";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";

type Props = {
  scopeId: string;
  dictionary: ServicesDictionary["approvedBillingScopes"]["detail"]["voidScope"];
};

export function VoidApprovedBillingScopeAction({ scopeId, dictionary }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reasonCode, setReasonCode] = useState<ApprovedBillingScopeVoidReasonCode | "">("");
  const [reasonNote, setReasonNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setReasonCode("");
    setReasonNote("");
    setError(null);
  }

  function open() {
    reset();
    setIsOpen(true);
  }

  function close() {
    if (isPending) return;
    setIsOpen(false);
    reset();
    requestAnimationFrame(() => document.getElementById("void-scope-trigger")?.focus());
  }

  function errorFor(code: string) {
    return dictionary.errors[code as keyof typeof dictionary.errors] ?? dictionary.errors.scope_unexpected_error;
  }

  function submit() {
    if (isPending) return;

    const normalizedNote = reasonNote.trim();
    if (!reasonCode) {
      setError(dictionary.validation.reasonRequired);
      return;
    }
    if (!normalizedNote) {
      setError(dictionary.validation.noteRequired);
      return;
    }
    if (normalizedNote.length > 1000) {
      setError(dictionary.validation.noteTooLong);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await voidApprovedBillingScope({
        scopeId,
        reasonCode,
        reasonNote: normalizedNote,
      });

      if (!result.success) {
        setError(errorFor(result.error ?? "scope_unexpected_error"));
        return;
      }

      setIsOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button id="void-scope-trigger" type="button" variant="danger" size="sm" onClick={open}>
        {dictionary.trigger}
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="void-scope-title"
          aria-describedby="void-scope-warning"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
            <h2 id="void-scope-title" className="text-lg font-semibold">
              {dictionary.title}
            </h2>
            <p id="void-scope-warning" className="mt-2 text-sm text-muted-foreground">
              {dictionary.warning}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{dictionary.body}</p>

            <div className="mt-5 grid gap-4">
              <label className="space-y-1 text-sm font-medium" htmlFor="void-reason-code">
                <span>{dictionary.reasonCode}</span>
                <select
                  id="void-reason-code"
                  className="h-10 w-full rounded-md border bg-background px-3"
                  value={reasonCode}
                  disabled={isPending}
                  autoFocus
                  onChange={(event) =>
                    setReasonCode(event.target.value as ApprovedBillingScopeVoidReasonCode | "")
                  }
                >
                  <option value="">{dictionary.reasonCodePlaceholder}</option>
                  {(Object.keys(dictionary.reasonCodeLabels) as ApprovedBillingScopeVoidReasonCode[]).map(
                    (code) => (
                      <option key={code} value={code}>
                        {dictionary.reasonCodeLabels[code]}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="space-y-1 text-sm font-medium" htmlFor="void-reason-note">
                <span>{dictionary.reasonNote}</span>
                <textarea
                  id="void-reason-note"
                  className="min-h-28 w-full rounded-md border bg-background px-3 py-2"
                  value={reasonNote}
                  disabled={isPending}
                  maxLength={1000}
                  aria-invalid={error != null}
                  aria-describedby="void-reason-note-help"
                  onChange={(event) => setReasonNote(event.target.value)}
                />
                <span id="void-reason-note-help" className="block text-xs text-muted-foreground">
                  {dictionary.reasonNoteHelp} {dictionary.noteCounter.replace("{count}", String(reasonNote.length))}
                </span>
              </label>
            </div>

            {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}
            {isPending ? (
              <p className="mt-4 text-sm text-muted-foreground" role="status" aria-live="polite">
                {dictionary.voiding}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" disabled={isPending} onClick={close}>
                {dictionary.cancel}
              </Button>
              <Button type="button" variant="danger" disabled={isPending} onClick={submit}>
                {isPending ? dictionary.voiding : dictionary.confirm}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
