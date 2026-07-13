"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { discardApprovedBillingScopeDraft } from "@/lib/approved-billing-scopes/actions";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";

type Props = {
  scopeId: string;
  serviceId: string;
  dictionary: ServicesDictionary["approvedBillingScopes"]["detail"]["discardDraft"];
};

export function DiscardApprovedBillingScopeDraftAction({ scopeId, serviceId, dictionary }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function errorFor(code: string) {
    return dictionary.errors[code as keyof typeof dictionary.errors] ?? dictionary.errors.scope_unexpected_error;
  }

  function close() {
    if (isPending) return;
    setIsOpen(false);
    setError(null);
  }

  function discard() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await discardApprovedBillingScopeDraft({ scopeId });
      if (!result.success) {
        setError(errorFor(result.error ?? "scope_unexpected_error"));
        return;
      }

      setIsOpen(false);
      setError(null);
      router.push(`/services/${serviceId}`);
    });
  }

  return (
    <>
      <Button type="button" variant="danger" size="sm" onClick={() => setIsOpen(true)}>
        {dictionary.trigger}
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={dictionary.title}>
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{dictionary.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{dictionary.body}</p>
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" disabled={isPending} onClick={close}>{dictionary.cancel}</Button>
              <Button type="button" variant="danger" disabled={isPending} onClick={discard}>{isPending ? dictionary.discarding : dictionary.confirm}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
