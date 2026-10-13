"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import {
  bootstrapAccountingFoundation,
  recoverAccountingRootAuthority,
  transferAccountingRootAuthority,
  updateAccountingSetupProfile,
} from "@/lib/accounting/actions";
import type {
  AccountingActionResult,
  AccountingSetupStatus,
  AccountingSetupTarget,
} from "@/lib/accounting/types";
import { getAccountingSetupDictionary } from "@/lib/i18n/dictionaries/accounting-setup";
import type { Locale } from "@/lib/i18n/locales";

type SetupAction = (input: unknown) => Promise<AccountingActionResult<unknown>>;

type RequestIds = {
  bootstrap: string;
  recovery: string;
  succession: string;
  profile: string;
};

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function nullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function useAccountingAction(action: SetupAction) {
  const [result, setResult] = useState<AccountingActionResult<unknown> | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(input: unknown) {
    startTransition(async () => {
      setResult(null);
      try {
        setResult(await action(input));
      } catch {
        setResult({ ok: false, code: "dependency_failure" });
      }
    });
  }

  return { result, isPending, run, clearResult: () => setResult(null) };
}

function ActionFeedback({
  result,
  saved,
  failure,
}: {
  result: AccountingActionResult<unknown> | null;
  saved: string;
  failure: string;
}) {
  if (!result) return null;
  return (
    <p className="text-sm" role="status" aria-live="polite">
      {result.ok ? saved : failure}
    </p>
  );
}

function AuthorityForm({
  mode,
  targets,
  requestId,
  locale,
}: {
  mode: "bootstrap" | "recovery" | "succession";
  targets: AccountingSetupTarget[];
  requestId: string;
  locale: Locale;
}) {
  const dictionary = getAccountingSetupDictionary(locale);
  let action: SetupAction;
  let title: string;
  let body: string;
  let buttonLabel: string;

  if (mode === "bootstrap") {
    action = bootstrapAccountingFoundation;
    title = dictionary.bootstrapTitle;
    body = dictionary.bootstrapBody;
    buttonLabel = dictionary.bootstrapButton;
  } else if (mode === "recovery") {
    action = recoverAccountingRootAuthority;
    title = dictionary.recoveryFormTitle;
    body = dictionary.recoveryBody;
    buttonLabel = dictionary.recoveryButton;
  } else {
    action = transferAccountingRootAuthority;
    title = dictionary.successionTitle;
    body = dictionary.successionBody;
    buttonLabel = dictionary.successionButton;
  }

  const { result, isPending, run } = useAccountingAction(action);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    run({
      target_user_id: textValue(formData, "target_user_id"),
      reason: textValue(formData, "reason"),
      evidence_ref: nullableText(textValue(formData, "evidence_ref")),
      request_id: requestId,
    });
  }

  return (
    <section className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-low p-5">
      <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
      <p className="mt-2 text-sm text-on-surface-variant">{body}</p>
      <form className="mt-5 grid min-w-0 gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-medium text-on-surface" htmlFor={`${mode}-target-user`}>
          {dictionary.targetUser}
          <select
            id={`${mode}-target-user`}
            name="target_user_id"
            required
            defaultValue=""
            disabled={isPending || targets.length === 0}
            className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal"
          >
            <option value="" disabled>{dictionary.chooseTarget}</option>
            {targets.map((target) => (
              <option value={target.id} key={target.id}>
                {target.name?.trim() || target.id}
              </option>
            ))}
          </select>
        </label>
        <p className="-mt-3 text-xs text-on-surface-variant">{dictionary.targetLimitNote}</p>
        {targets.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{dictionary.noTargets}</p>
        ) : null}
        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {dictionary.reason}
          <textarea
            name="reason"
            required
            maxLength={2000}
            rows={3}
            disabled={isPending}
            className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {dictionary.evidenceReference}
          <input
            name="evidence_ref"
            maxLength={2000}
            disabled={isPending}
            className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal"
          />
        </label>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending || targets.length === 0}
            className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? dictionary.saving : buttonLabel}
          </button>
          <ActionFeedback result={result} saved={dictionary.saved} failure={dictionary.actionFailure} />
        </div>
      </form>
    </section>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-outline-variant p-3">
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-on-surface"><bdi dir="auto">{value}</bdi></dd>
    </div>
  );
}

function ProfileEditor({
  status,
  requestId,
  locale,
}: {
  status: Extract<AccountingSetupStatus, { state: "INITIALIZED" }>;
  requestId: string;
  locale: Locale;
}) {
  const dictionary = getAccountingSetupDictionary(locale);
  const { profile } = status;
  const datesLocked = profile.activation_state === "DEV_PROVISIONAL";
  const { result, isPending, run, clearResult } = useAccountingAction(updateAccountingSetupProfile);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    run({
      expected_version: profile.version,
      policy_version: textValue(formData, "policy_version"),
      endorsement_context: textValue(formData, "endorsement_context"),
      professional_validation_evidence_ref: nullableText(textValue(formData, "professional_validation_evidence_ref")),
      accounting_start_date: datesLocked
        ? profile.accounting_start_date
        : nullableText(textValue(formData, "accounting_start_date")),
      cutover_boundary_date: datesLocked
        ? profile.cutover_boundary_date
        : nullableText(textValue(formData, "cutover_boundary_date")),
      legal_fiscal_evidence_pending: formData.get("legal_fiscal_evidence_pending") === "on",
      legal_fiscal_evidence_ref: nullableText(textValue(formData, "legal_fiscal_evidence_ref")),
      reason: textValue(formData, "reason"),
      evidence_ref: nullableText(textValue(formData, "evidence_ref")),
      request_id: requestId,
    });
  }

  return (
    <section className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-low p-5">
      <h2 className="text-lg font-semibold text-on-surface">{dictionary.profileTitle}</h2>
      <p className="mt-2 text-sm text-on-surface-variant">{dictionary.lockedValuesNote}</p>
      {datesLocked ? (
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.provisionalDatesLockedNote}</p>
      ) : null}
      <form className="mt-5 grid min-w-0 gap-4" onSubmit={submit} onChange={clearResult}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.policyVersion}
            <input name="policy_version" required maxLength={80} defaultValue={profile.policy_version} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.endorsementContext}
            <input name="endorsement_context" required maxLength={500} defaultValue={profile.endorsement_context} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.professionalEvidenceReference}
            <input name="professional_validation_evidence_ref" maxLength={2000} defaultValue={profile.professional_validation_evidence_ref ?? ""} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.accountingStartDate}
            <input type="date" name="accounting_start_date" defaultValue={profile.accounting_start_date ?? ""} disabled={isPending || datesLocked} dir="ltr" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.cutoverBoundaryDate}
            <input type="date" name="cutover_boundary_date" defaultValue={profile.cutover_boundary_date ?? ""} disabled={isPending || datesLocked} dir="ltr" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.legalEvidenceReference}
            <input name="legal_fiscal_evidence_ref" maxLength={2000} defaultValue={profile.legal_fiscal_evidence_ref ?? ""} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
          </label>
        </div>
        <label className="flex min-w-0 items-start gap-3 text-sm text-on-surface">
          <input type="checkbox" name="legal_fiscal_evidence_pending" defaultChecked={profile.legal_fiscal_evidence_pending} disabled={isPending} className="mt-1 size-4 shrink-0 accent-primary" />
          <span>{dictionary.legalEvidencePending}</span>
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.reason}
          <textarea name="reason" required maxLength={2000} rows={3} disabled={isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.evidenceReference}
          <input name="evidence_ref" maxLength={2000} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
        </label>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60">
            {isPending ? dictionary.saving : dictionary.saveProfile}
          </button>
          <ActionFeedback result={result} saved={dictionary.saved} failure={dictionary.actionFailure} />
        </div>
      </form>
    </section>
  );
}

export default function AccountingSetupClient({
  locale,
  status,
  targets,
  requestIds,
}: {
  locale: Locale;
  status: AccountingSetupStatus;
  targets: AccountingSetupTarget[];
  requestIds: RequestIds;
}) {
  const dictionary = getAccountingSetupDictionary(locale);

  if (status.state === "NOT_INITIALIZED") {
    return (
      <div className="grid min-w-0 gap-6">
        <section className="rounded-lg border border-outline-variant bg-surface-container-low p-5">
          <h2 className="text-lg font-semibold text-on-surface">{dictionary.notInitializedTitle}</h2>
          <p className="mt-2 text-sm text-on-surface-variant">{dictionary.notInitializedBody}</p>
          <p className="mt-3 text-sm text-on-surface-variant">{dictionary.foundationScopeNote}</p>
        </section>
        <AuthorityForm mode="bootstrap" targets={targets} requestId={requestIds.bootstrap} locale={locale} />
      </div>
    );
  }

  if (status.state === "RECOVERY_REQUIRED") {
    return (
      <div className="grid min-w-0 gap-6">
        <section className="rounded-lg border border-error/20 bg-error-container p-5 text-on-error-container">
          <h2 className="text-lg font-semibold">{dictionary.recoveryTitle}</h2>
          <p className="mt-2 text-sm">{dictionary.recoveryBody}</p>
        </section>
        <AuthorityForm mode="recovery" targets={targets} requestId={requestIds.recovery} locale={locale} />
      </div>
    );
  }

  const { profile, setup_progress: progress } = status;
  const progressItems = [
    [dictionary.chartOfAccounts, progress.chart_of_accounts_started],
    [dictionary.accountingPeriods, progress.accounting_periods_started],
    [dictionary.postingRules, progress.posting_rules_started],
    [dictionary.inceptionReconstruction, progress.inception_reconstruction_started],
  ] as const;

  return (
    <div className="grid min-w-0 gap-6">
      <section className="rounded-lg border border-outline-variant bg-surface-container-low p-5">
        <h2 className="text-lg font-semibold text-on-surface">{dictionary.initializedTitle}</h2>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.foundationScopeNote}</p>
      </section>

      <section className="min-w-0 rounded-lg border border-outline-variant p-5">
        <h2 className="text-lg font-semibold text-on-surface">{dictionary.setupProgressTitle}</h2>
        <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
          {progressItems.map(([label, started]) => (
            <ProfileField key={label} label={label} value={started ? dictionary.started : dictionary.notStarted} />
          ))}
        </dl>
        <Link href="/settings/accounting/chart-of-accounts" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-4">
          {dictionary.openChartOfAccounts}
        </Link>
      </section>

      <section className="min-w-0 rounded-lg border border-outline-variant p-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-on-surface">{dictionary.profileTitle}</h2>
          <span className="text-xs text-on-surface-variant">
            {dictionary.profileVersion}: <bdi dir="ltr">{profile.version}</bdi>
          </span>
        </div>
        <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField label={dictionary.framework} value={profile.framework_key} />
          <ProfileField label={dictionary.edition} value={String(profile.framework_edition)} />
          <ProfileField label={dictionary.currency} value={profile.functional_currency} />
          <ProfileField label={dictionary.fiscalYear} value="01-01 – 12-31" />
          <ProfileField label={dictionary.timezone} value={profile.fiscal_timezone} />
          <ProfileField label={dictionary.professionalValidation} value={profile.professional_validation_state} />
          <ProfileField label={dictionary.vat} value={profile.vat_mode} />
          <ProfileField label={dictionary.zatca} value={profile.zatca_state} />
          <ProfileField label={dictionary.fatoora} value={profile.fatoora_state} />
          <ProfileField label={dictionary.activation} value={profile.activation_state} />
        </dl>
      </section>

      {status.can_manage_profile ? (
        <ProfileEditor status={status} requestId={requestIds.profile} locale={locale} />
      ) : null}

      {status.can_manage_authority ? (
        <AuthorityForm mode="succession" targets={targets} requestId={requestIds.succession} locale={locale} />
      ) : null}
    </div>
  );
}
