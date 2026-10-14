"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setAccountingCapability } from "@/lib/accounting/actions";
import { ACCOUNTING_CAPABILITIES } from "@/lib/accounting/types";
import type {
  AccountingActionResult,
  AccountingCapability,
  AccountingCapabilityAssignment,
  AccountingCapabilityEffect,
  AccountingSetupTarget,
} from "@/lib/accounting/types";
import {
  getAccountingPermissionsActionErrorMessage,
  getAccountingPermissionsDictionary,
} from "@/lib/i18n/dictionaries/accounting-permissions";
import { getDirection } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/locales";

const ROOT_AUTHORITY: AccountingCapability = "accounting:manage_authority";
export default function AccountingPermissionsClient({
  locale,
  targets,
  selectedTargetId,
  assignments,
}: {
  locale: Locale;
  targets: AccountingSetupTarget[];
  selectedTargetId: string | null;
  assignments: AccountingCapabilityAssignment[];
}) {
  const dictionary = getAccountingPermissionsDictionary(locale);
  const router = useRouter();
  const [selectedCapability, setSelectedCapability] = useState<AccountingCapability>("accounting:view");
  const [effect, setEffect] = useState<AccountingCapabilityEffect>("ALLOW");
  const [expiresAtLocal, setExpiresAtLocal] = useState("");
  const [reason, setReason] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [result, setResult] = useState<AccountingActionResult<{ capability_event_id: string; revision: number }> | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedTarget = targets.find((target) => target.id === selectedTargetId) ?? null;
  const assignmentsByCapability = new Map(assignments.map((assignment) => [assignment.capability, assignment]));
  const currentAssignment = assignmentsByCapability.get(selectedCapability);
  const canRevoke = currentAssignment != null && currentAssignment.effect !== "REVOKE";

  function selectCapability(capability: AccountingCapability) {
    setSelectedCapability(capability);
    setEffect("ALLOW");
    setExpiresAtLocal("");
    setResult(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTarget || !reason.trim() || (effect === "REVOKE" && !canRevoke)) {
      setResult({ ok: false, code: "invalid_input" });
      return;
    }

    let expiresAt: string | null = null;
    if (effect === "ALLOW" && expiresAtLocal) {
      const parsedExpiry = new Date(expiresAtLocal);
      if (Number.isNaN(parsedExpiry.valueOf())) {
        setResult({ ok: false, code: "invalid_expiry" });
        return;
      }
      expiresAt = parsedExpiry.toISOString();
    }

    const input = {
      target_user_id: selectedTarget.id,
      capability: selectedCapability,
      effect,
      expires_at: expiresAt,
      expected_revision: currentAssignment?.revision ?? 0,
      reason: reason.trim(),
      evidence_ref: evidenceRef.trim() || null,
      request_id: globalThis.crypto.randomUUID(),
    };

    startTransition(async () => {
      setResult(null);
      try {
        const actionResult = await setAccountingCapability(input);
        setResult(actionResult);
        if (actionResult.ok || actionResult.code === "revision_conflict") router.refresh();
      } catch {
        setResult({ ok: false, code: "dependency_failure" });
      }
    });
  }

  return (
    <div className="grid min-w-0 gap-6" dir={getDirection(locale)}>
      <section className="min-w-0 rounded-lg border border-outline-variant p-5">
        <form action="/settings/accounting/permissions" method="get" className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label htmlFor="accounting-permissions-target" className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.activeUser}
            <select
              id="accounting-permissions-target"
              name="target_user_id"
              required
              defaultValue={selectedTargetId ?? ""}
              disabled={targets.length === 0}
              className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal"
            >
              <option value="" disabled>{dictionary.chooseUser}</option>
              {targets.map((target) => (
                <option value={target.id} key={target.id}>{target.name?.trim() || target.id}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={targets.length === 0}
            className="min-h-11 rounded-md border border-outline-variant px-4 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dictionary.loadAssignments}
          </button>
          <p className="text-xs text-on-surface-variant sm:col-span-2">{dictionary.targetLimitNote}</p>
          {targets.length === 0 ? <p className="text-sm text-on-surface-variant sm:col-span-2">{dictionary.noTargets}</p> : null}
        </form>
      </section>

      {!selectedTarget ? (
        <section className="rounded-lg border border-outline-variant bg-surface-container-low p-5" role="status">
          <p className="text-sm text-on-surface-variant">{dictionary.noTargetSelected}</p>
        </section>
      ) : (
        <section className="grid min-w-0 gap-4">
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-on-surface">{dictionary.assignmentsTitle}</h2>
            <p className="min-w-0 text-sm text-on-surface-variant">{dictionary.activeUser}: <bdi>{selectedTarget.name?.trim() || selectedTarget.id}</bdi></p>
          </div>

          <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
            {ACCOUNTING_CAPABILITIES.map((capability) => {
              const assignment = assignmentsByCapability.get(capability);
              const status = assignment ? dictionary.effects[assignment.effect] : dictionary.notAssigned;
              const isRootAuthority = capability === ROOT_AUTHORITY;
              return (
                <li key={capability} className="min-w-0">
                  <article
                    data-capability={capability}
                    aria-current={!isRootAuthority && selectedCapability === capability ? "true" : undefined}
                    className={`h-full min-w-0 rounded-lg border p-4 ${!isRootAuthority && selectedCapability === capability ? "border-primary bg-surface-container-low" : "border-outline-variant"}`}
                  >
                    {isRootAuthority ? (
                      <h3 className="font-semibold text-on-surface">{dictionary.rootAuthorityTitle}</h3>
                    ) : (
                      <button
                        type="button"
                        aria-pressed={selectedCapability === capability}
                        onClick={() => selectCapability(capability)}
                        className="min-h-10 max-w-full text-start font-semibold text-primary underline underline-offset-4"
                      >
                        {dictionary.manageCapability}: {dictionary.capabilities[capability]}
                      </button>
                    )}
                    <p className="mt-2 break-words text-xs text-on-surface-variant">
                      <bdi dir="ltr">{capability}</bdi>
                    </p>
                    <dl className="mt-3 grid min-w-0 gap-2 text-sm">
                      <div className="flex min-w-0 flex-wrap gap-x-2">
                        <dt className="font-medium text-on-surface">{dictionary.currentAssignment}:</dt>
                        <dd className="text-on-surface-variant">{status}</dd>
                      </div>
                      <div className="flex min-w-0 flex-wrap gap-x-2">
                        <dt className="font-medium text-on-surface">{dictionary.currentRevision}:</dt>
                        <dd className="text-on-surface-variant"><bdi dir="ltr">{assignment?.revision ?? 0}</bdi></dd>
                      </div>
                      {assignment?.expires_at ? (
                        <div className="flex min-w-0 flex-wrap gap-x-2">
                          <dt className="font-medium text-on-surface">{dictionary.expiresAt}:</dt>
                          <dd className="break-all text-on-surface-variant"><time dateTime={assignment.expires_at}><bdi dir="ltr">{assignment.expires_at}</bdi></time></dd>
                        </div>
                      ) : null}
                      {assignment ? (
                        <div className="flex min-w-0 flex-wrap gap-x-2">
                          <dt className="font-medium text-on-surface">{dictionary.lastChangedAt}:</dt>
                          <dd className="break-all text-on-surface-variant"><time dateTime={assignment.created_at}><bdi dir="ltr">{assignment.created_at}</bdi></time></dd>
                        </div>
                      ) : null}
                    </dl>
                    {isRootAuthority ? (
                      <div className="mt-3 border-t border-outline-variant pt-3">
                        <p className="text-sm text-on-surface-variant">{dictionary.rootAuthorityNote}</p>
                        <Link href="/settings/accounting" className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-4">
                          {dictionary.openAccountingSetup}
                        </Link>
                      </div>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ul>

          <section className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-low p-5">
            <h3 className="text-lg font-semibold text-on-surface">
              {dictionary.selectedCapability}: {dictionary.capabilities[selectedCapability]}
            </h3>
            <p className="mt-1 text-xs text-on-surface-variant"><bdi dir="ltr">{selectedCapability}</bdi></p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {dictionary.currentRevision}: <bdi dir="ltr">{currentAssignment?.revision ?? 0}</bdi>
            </p>
            <form className="mt-4 grid min-w-0 gap-4" onSubmit={submit}>
              <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                {dictionary.effect}
                <select
                  name="effect"
                  value={effect}
                  onChange={(event) => {
                    const nextEffect = event.target.value as AccountingCapabilityEffect;
                    setEffect(nextEffect);
                    if (nextEffect !== "ALLOW") setExpiresAtLocal("");
                    setResult(null);
                  }}
                  disabled={isPending}
                  className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal"
                >
                  <option value="ALLOW">{dictionary.effects.ALLOW}</option>
                  <option value="DENY">{dictionary.effects.DENY}</option>
                  <option value="REVOKE" disabled={!canRevoke}>{dictionary.effects.REVOKE}</option>
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                {dictionary.expiry}
                <input
                  type="datetime-local"
                  name="expires_at"
                  value={expiresAtLocal}
                  onChange={(event) => setExpiresAtLocal(event.target.value)}
                  disabled={isPending || effect !== "ALLOW"}
                  className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal"
                />
                <span className="text-xs font-normal text-on-surface-variant">{dictionary.expiryHint}</span>
              </label>
              <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                {dictionary.reason}
                <textarea
                  name="reason"
                  required
                  maxLength={2000}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={isPending}
                  className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal"
                />
              </label>
              <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                {dictionary.evidenceReference}
                <input
                  name="evidence_ref"
                  maxLength={2000}
                  value={evidenceRef}
                  onChange={(event) => setEvidenceRef(event.target.value)}
                  disabled={isPending}
                  className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal"
                />
              </label>
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isPending || (effect === "REVOKE" && !canRevoke)}
                  className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? dictionary.saving : dictionary.save}
                </button>
                {result ? (
                  <p className="text-sm text-on-surface-variant" role="status" aria-live="polite">
                    {result.ok ? dictionary.saved : getAccountingPermissionsActionErrorMessage(result.code, dictionary)}
                  </p>
                ) : null}
              </div>
            </form>
          </section>
        </section>
      )}
    </div>
  );
}
