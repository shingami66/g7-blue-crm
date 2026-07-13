"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import PendingLink from "@/components/ui/PendingLink";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { createApprovedBillingScopeDraft } from "@/lib/approved-billing-scopes/actions";
import type { ApprovedBillingScopeErrorCode } from "@/lib/approved-billing-scopes/errors";

type CreateDraftDictionary = ServicesDictionary["approvedBillingScopes"]["createDraft"];

type CreateApprovedBillingScopeDraftActionProps = {
  serviceId: string;
  sourceQuotationId: string;
  sourceQuotationNumber: string | null;
  /** Existing draft for this source quotation, if already known from Service read data. */
  existingDraftScopeId: string | null;
  dictionary: CreateDraftDictionary;
  viewDraftLabel: string;
};

export default function CreateApprovedBillingScopeDraftAction({
  serviceId,
  sourceQuotationId,
  sourceQuotationNumber,
  existingDraftScopeId,
  dictionary,
  viewDraftLabel,
}: CreateApprovedBillingScopeDraftActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resolvedDraftId, setResolvedDraftId] = useState<string | null>(
    existingDraftScopeId,
  );

  const draftHref = resolvedDraftId
    ? `/services/${serviceId}/approved-billing-scopes/${resolvedDraftId}`
    : null;

  const mapError = (code: string | undefined): string => {
    if (!code) return dictionary.errors.fallback;
    const known = dictionary.errors as Record<string, string>;
    if (known[code]) return known[code];
    return dictionary.errors.fallbackWithCode.replace("{code}", code);
  };

  const handleCreate = () => {
    if (isPending) return;
    setError(null);
    setSuccessMsg(null);

    if (existingDraftScopeId) {
      setResolvedDraftId(existingDraftScopeId);
      setError(dictionary.errors.scope_duplicate_draft);
      return;
    }

    startTransition(async () => {
      const result = await createApprovedBillingScopeDraft({
        sourceQuotationId,
      });

      if (result.success && result.data?.scopeId) {
        setSuccessMsg(dictionary.success);
        setResolvedDraftId(result.data.scopeId);
        router.refresh();
        router.push(
          `/services/${serviceId}/approved-billing-scopes/${result.data.scopeId}`,
        );
        return;
      }

      const code = result.error as ApprovedBillingScopeErrorCode | undefined;
      setError(mapError(code));

      if (code === "scope_duplicate_draft" && existingDraftScopeId) {
        setResolvedDraftId(existingDraftScopeId);
      }
    });
  };

  if (existingDraftScopeId && !successMsg) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-[13px] leading-[18px] text-on-surface-variant">
          {dictionary.openExistingDraft}
        </p>
        {sourceQuotationNumber && (
          <p className="text-[13px] text-on-surface-variant">
            {dictionary.sourceLabel}:{" "}
            <span dir="ltr" className="font-mono tabular-nums">
              {isolateBidiText(sourceQuotationNumber)}
            </span>
          </p>
        )}
        <PendingLink
          href={`/services/${serviceId}/approved-billing-scopes/${existingDraftScopeId}`}
          className="inline-flex w-fit text-[13px] font-semibold text-primary hover:underline"
          pendingLabel={viewDraftLabel}
        >
          {viewDraftLabel}
        </PendingLink>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {sourceQuotationNumber && (
        <p className="text-[13px] text-on-surface-variant">
          {dictionary.sourceLabel}:{" "}
          <span dir="ltr" className="font-mono tabular-nums">
            {isolateBidiText(sourceQuotationNumber)}
          </span>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          loading={isPending}
          loadingLabel={dictionary.creating}
          className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? dictionary.creating : dictionary.action}
        </Button>
        {draftHref && resolvedDraftId && successMsg && (
          <PendingLink
            href={draftHref}
            className="text-[13px] font-semibold text-primary hover:underline"
            pendingLabel={viewDraftLabel}
          >
            {viewDraftLabel}
          </PendingLink>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="rounded border border-red-100 bg-red-50 p-2 text-[13px] text-red-600"
        >
          {error}
          {error === dictionary.errors.scope_duplicate_draft && draftHref && (
            <div className="mt-2">
              <PendingLink
                href={draftHref}
                className="font-semibold text-primary hover:underline"
                pendingLabel={viewDraftLabel}
              >
                {viewDraftLabel}
              </PendingLink>
            </div>
          )}
        </div>
      )}
      {successMsg && (
        <div className="rounded border border-green-100 bg-green-50 p-2 text-[13px] text-green-700">
          {successMsg}
        </div>
      )}
    </div>
  );
}
