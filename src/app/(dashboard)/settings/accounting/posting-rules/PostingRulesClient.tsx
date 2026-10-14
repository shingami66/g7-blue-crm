"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { saveAccountingPostingRule } from "@/lib/accounting/actions";
import type {
  AccountingAccountVersion,
  AccountingActionErrorCode,
  AccountingActionResult,
  AccountingPostingRuleInput,
  AccountingPostingRuleMappingInput,
  AccountingPostingRuleVersion,
} from "@/lib/accounting/types";
import { getAccountingPostingRulesDictionary } from "@/lib/i18n/dictionaries/accounting-posting-rules";
import type { Locale } from "@/lib/i18n/locales";

export type PostingRulesPageState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";
type SaveResult = AccountingActionResult<{ posting_rule_id: string; version: number }>;
type MappingDraft = {
  rowId: string;
  mapping_key: string;
  account_id: string;
  account_version: number | null;
  allowed_side: AccountingPostingRuleMappingInput["allowed_side"];
  service_requirement: AccountingPostingRuleMappingInput["service_requirement"];
};
type RuleGroup = { current: AccountingPostingRuleVersion | null; history: AccountingPostingRuleVersion[] };
type FormProblem = "duplicate" | "minimum" | "incomplete" | "rule-code" | null;

const allowedSides: AccountingPostingRuleMappingInput["allowed_side"][] = ["DEBIT", "CREDIT", "EITHER"];
const serviceRequirements: AccountingPostingRuleMappingInput["service_requirement"][] = ["REQUIRED", "OPTIONAL", "FORBIDDEN"];

function groupRules(rules: AccountingPostingRuleVersion[]): RuleGroup[] {
  const grouped = new Map<string, RuleGroup>();
  for (const rule of rules) {
    const group = grouped.get(rule.posting_rule_id) ?? { current: null, history: [] };
    if (rule.is_current) group.current = rule;
    else group.history.push(rule);
    grouped.set(rule.posting_rule_id, group);
  }
  return [...grouped.values()].sort((left, right) =>
    (left.current?.rule_code ?? left.history[0]?.rule_code ?? "").localeCompare(right.current?.rule_code ?? right.history[0]?.rule_code ?? ""),
  );
}

function getEligibleAccounts(accounts: AccountingAccountVersion[]): AccountingAccountVersion[] {
  const current = accounts.filter((account) => account.is_current);
  const parentsWithChildren = new Set(current.map((account) => account.parent_account_id).filter((id): id is string => id !== null));
  return current
    .filter((account) => account.account_kind === "POSTING" && account.is_active && !parentsWithChildren.has(account.account_id))
    .slice()
    .sort((left, right) => left.account_code.localeCompare(right.account_code, undefined, { numeric: true, sensitivity: "base" }));
}

function makeDraft(mapping?: AccountingPostingRuleMappingInput): MappingDraft {
  return {
    rowId: crypto.randomUUID(),
    mapping_key: mapping?.mapping_key ?? "",
    account_id: mapping?.account_id ?? "",
    account_version: mapping?.account_version ?? null,
    allowed_side: mapping?.allowed_side ?? "EITHER",
    service_requirement: mapping?.service_requirement ?? "OPTIONAL",
  };
}

function accountOptionValue(account: AccountingAccountVersion) {
  return `${account.account_id}:${account.version}`;
}

function getAccountByVersion(accounts: AccountingAccountVersion[], accountId: string, version: number | null) {
  return accounts.find((account) => account.account_id === accountId && account.version === version);
}

function RuleForm({
  rule,
  accounts,
  locale,
  dictionary,
  onCancel,
  onSaved,
  onReload,
}: {
  rule: AccountingPostingRuleVersion | null;
  accounts: AccountingAccountVersion[];
  locale: Locale;
  dictionary: ReturnType<typeof getAccountingPostingRulesDictionary>;
  onCancel: () => void;
  onSaved: (version: number) => void;
  onReload: () => void;
}) {
  const eligibleAccounts = getEligibleAccounts(accounts);
  const [mappings, setMappings] = useState(() => rule?.mappings.map((mapping) => makeDraft(mapping)) ?? [makeDraft(), makeDraft()]);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [problem, setProblem] = useState<FormProblem>(null);
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef<string | null>(null);

  function updateMapping(rowId: string, update: Partial<MappingDraft>) {
    setMappings((rows) => rows.map((row) => row.rowId === rowId ? { ...row, ...update } : row));
    requestId.current = null;
    setResult(null);
    setProblem(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const ruleCode = rule?.rule_code ?? String(data.get("rule_code") ?? "").trim();
    if (!/^[A-Z][A-Z0-9_]{1,39}$/.test(ruleCode)) {
      setProblem("rule-code");
      return;
    }
    if (mappings.length < 2) {
      setProblem("minimum");
      return;
    }
    const keys = mappings.map((mapping) => mapping.mapping_key.trim());
    if (new Set(keys).size !== keys.length) {
      setProblem("duplicate");
      return;
    }
    if (mappings.some((mapping) =>
      !/^[a-z][a-z0-9_]{0,39}$/.test(mapping.mapping_key.trim()) ||
      !mapping.account_id || mapping.account_version === null ||
      !eligibleAccounts.some((account) => account.account_id === mapping.account_id && account.version === mapping.account_version),
    )) {
      setProblem("incomplete");
      return;
    }
    const mappingsPayload: AccountingPostingRuleMappingInput[] = mappings.map((mapping) => ({
      mapping_key: mapping.mapping_key.trim(),
      account_id: mapping.account_id,
      account_version: mapping.account_version!,
      allowed_side: mapping.allowed_side,
      service_requirement: mapping.service_requirement,
    }));
    const ruleInput: AccountingPostingRuleInput = {
      rule_code: ruleCode,
      name_en: String(data.get("name_en") ?? "").trim(),
      name_ar: String(data.get("name_ar") ?? "").trim(),
      is_active: isActive,
      mappings: mappingsPayload,
    };
    const nextRequestId = requestId.current ?? crypto.randomUUID();
    requestId.current = nextRequestId;
    setProblem(null);

    startTransition(async () => {
      let nextResult: SaveResult;
      try {
        nextResult = await saveAccountingPostingRule({
          posting_rule_id: rule?.posting_rule_id ?? null,
          expected_version: rule?.version ?? 0,
          rule: ruleInput,
          reason: String(data.get("reason") ?? "").trim(),
          evidence_ref: String(data.get("evidence_ref") ?? "").trim() || null,
          request_id: nextRequestId,
        });
      } catch {
        nextResult = { ok: false, code: "dependency_failure" };
      }
      setResult(nextResult);
      if (nextResult.ok) {
        requestId.current = null;
        onSaved(nextResult.value.version);
      }
    });
  }

  const errorCode = result && !result.ok ? result.code as AccountingActionErrorCode : null;
  const feedback = result?.ok
    ? dictionary.savedVersion.replace("{version}", String(result.value.version))
    : errorCode ? dictionary.errors[errorCode] ?? dictionary.actionFailure : null;

  return (
    <section className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-low p-5">
      <h2 className="text-lg font-semibold text-on-surface">{rule ? dictionary.reviseTitle : dictionary.createTitle}</h2>
      <p className="mt-2 text-sm text-on-surface-variant">{dictionary.mappingContractNote}</p>
      <form
        className="mt-4 grid min-w-0 gap-4"
        noValidate
        onSubmit={submit}
        onChange={() => { requestId.current = null; setResult(null); setProblem(null); }}
      >
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.ruleCode}
            <input name="rule_code" required maxLength={40} pattern="[A-Z][A-Z0-9_]{1,39}" defaultValue={rule?.rule_code ?? ""} readOnly={Boolean(rule)} dir="ltr" disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal read-only:bg-surface-container-low" />
          </label>
          <label className="flex min-h-11 min-w-0 items-center gap-3 text-sm font-medium text-on-surface">
            <input type="checkbox" checked={isActive} onChange={(event) => { setIsActive(event.currentTarget.checked); requestId.current = null; setResult(null); }} disabled={isPending} className="size-4 shrink-0 accent-primary" />
            {dictionary.active}
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.nameEn}
            <input name="name_en" required maxLength={160} defaultValue={rule?.name_en ?? ""} dir="ltr" disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.nameAr}
            <input name="name_ar" required maxLength={160} defaultValue={rule?.name_ar ?? ""} dir="rtl" disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
          </label>
        </div>

        <fieldset className="grid min-w-0 gap-3 rounded-md border border-outline-variant p-3">
          <legend className="px-1 text-sm font-semibold text-on-surface">{dictionary.mappings}</legend>
          {mappings.map((mapping, index) => {
            const boundVersion = getAccountByVersion(accounts, mapping.account_id, mapping.account_version);
            const currentEligible = eligibleAccounts.some((account) => account.account_id === mapping.account_id && account.version === mapping.account_version);
            const selectedValue = currentEligible && boundVersion ? accountOptionValue(boundVersion) : "";
            return (
              <div key={mapping.rowId} className="grid min-w-0 gap-3 rounded-md bg-surface-container-low p-3">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-on-surface">{dictionary.mapping} <bdi dir="ltr">{index + 1}</bdi></h3>
                  <button type="button" onClick={() => { setMappings((rows) => rows.filter((row) => row.rowId !== mapping.rowId)); requestId.current = null; setResult(null); setProblem(null); }} disabled={isPending || mappings.length <= 2} className="min-h-9 rounded-md border border-outline-variant px-3 text-xs font-semibold text-on-surface disabled:cursor-not-allowed disabled:opacity-50">{dictionary.removeMapping}</button>
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                    {dictionary.mappingKey}
                    <input value={mapping.mapping_key} onChange={(event) => updateMapping(mapping.rowId, { mapping_key: event.currentTarget.value })} required maxLength={40} pattern="[a-z][a-z0-9_]{0,39}" dir="ltr" disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
                  </label>
                  <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                    {dictionary.account}
                    <select aria-label={`${dictionary.account} ${index + 1}`} value={selectedValue} onChange={(event) => {
                      const selected = eligibleAccounts.find((account) => accountOptionValue(account) === event.currentTarget.value);
                      updateMapping(mapping.rowId, { account_id: selected?.account_id ?? "", account_version: selected?.version ?? null });
                    }} required disabled={isPending || eligibleAccounts.length === 0} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal">
                      <option value="" disabled>{dictionary.chooseAccount}</option>
                      {eligibleAccounts.map((account) => <option key={accountOptionValue(account)} value={accountOptionValue(account)}>{account.account_code} — {locale === "ar" ? account.name_ar : account.name_en} — v{account.version}</option>)}
                    </select>
                    {mapping.account_id && !currentEligible ? (
                      <span className="break-all text-xs text-warning">{dictionary.staleBinding}: <bdi dir="ltr">{mapping.account_id} · v{mapping.account_version ?? "?"}</bdi></span>
                    ) : boundVersion ? (
                      <span className="break-words text-xs text-on-surface-variant"><bdi dir="ltr">{boundVersion.account_code} · v{boundVersion.version}</bdi> — <bdi dir="auto">{boundVersion.name_en}</bdi> · <bdi dir="auto">{boundVersion.name_ar}</bdi></span>
                    ) : null}
                  </label>
                  <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                    {dictionary.allowedSide}
                    <select value={mapping.allowed_side} onChange={(event) => updateMapping(mapping.rowId, { allowed_side: event.currentTarget.value as MappingDraft["allowed_side"] })} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal">
                      {allowedSides.map((value) => <option key={value} value={value}>{dictionary.allowedSides[value]}</option>)}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                    {dictionary.serviceRequirement}
                    <select value={mapping.service_requirement} onChange={(event) => updateMapping(mapping.rowId, { service_requirement: event.currentTarget.value as MappingDraft["service_requirement"] })} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal">
                      {serviceRequirements.map((value) => <option key={value} value={value}>{dictionary.serviceRequirements[value]}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => { setMappings((rows) => rows.length < 200 ? [...rows, makeDraft()] : rows); requestId.current = null; setResult(null); setProblem(null); }} disabled={isPending || mappings.length >= 200} className="min-h-10 rounded-md border border-outline-variant px-3 text-sm font-semibold text-on-surface disabled:opacity-50">{dictionary.addMapping}</button>
            <span className="text-xs text-on-surface-variant">{dictionary.minimumMappings}</span>
          </div>
        </fieldset>

        {problem ? <p className="text-sm text-error" role="alert">{dictionary.problems[problem]}</p> : null}
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.reason}
          <textarea name="reason" required maxLength={2000} rows={3} disabled={isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.evidenceReference}
          <input name="evidence_ref" maxLength={2000} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
        </label>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending || eligibleAccounts.length === 0} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60">{isPending ? dictionary.saving : dictionary.save}</button>
          <button type="button" onClick={onCancel} disabled={isPending} className="min-h-11 rounded-md border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface">{dictionary.cancel}</button>
          {errorCode === "revision_conflict" ? <button type="button" onClick={onReload} className="min-h-11 text-sm font-semibold text-primary underline">{dictionary.reloadLatest}</button> : null}
          {feedback ? <p className="text-sm text-on-surface-variant" role="status" aria-live="polite">{feedback}</p> : null}
        </div>
      </form>
    </section>
  );
}

function MappingSummary({
  mapping,
  accounts,
  dictionary,
}: {
  mapping: AccountingPostingRuleMappingInput;
  accounts: AccountingAccountVersion[];
  dictionary: ReturnType<typeof getAccountingPostingRulesDictionary>;
}) {
  const account = getAccountByVersion(accounts, mapping.account_id, mapping.account_version);
  return (
    <li className="min-w-0 rounded-md bg-surface-container-low p-3 text-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <code dir="ltr" className="font-semibold">{mapping.mapping_key}</code>
        <span>{dictionary.allowedSides[mapping.allowed_side]}</span>
        <span>{dictionary.serviceRequirements[mapping.service_requirement]}</span>
      </div>
      <p className="mt-1 break-words text-on-surface-variant">
        {account ? <><bdi dir="ltr">{account.account_code} · v{account.version}</bdi> — <bdi dir="auto">{account.name_en}</bdi> · <bdi dir="auto">{account.name_ar}</bdi></> : <><bdi dir="ltr">{mapping.account_id} · v{mapping.account_version}</bdi> · {dictionary.accountVersionUnavailable}</>}
      </p>
    </li>
  );
}

function RuleCard({
  group,
  accounts,
  dictionary,
  canRevise,
  onEdit,
}: {
  group: RuleGroup;
  accounts: AccountingAccountVersion[];
  dictionary: ReturnType<typeof getAccountingPostingRulesDictionary>;
  canRevise: boolean;
  onEdit: (id: string) => void;
}) {
  const rule = group.current ?? [...group.history].sort((a, b) => b.version - a.version)[0];
  if (!rule) return null;
  return (
    <li className="min-w-0 list-none">
      <article className="min-w-0 rounded-lg border border-outline-variant bg-surface p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1"><code dir="ltr" className="font-semibold text-on-surface">{rule.rule_code}</code><span className="text-xs text-on-surface-variant">{dictionary.version} <bdi dir="ltr">{rule.version}</bdi></span><span className="rounded-full bg-surface-container-high px-2 py-1 text-xs">{rule.is_active ? dictionary.active : dictionary.inactive}</span></div>
            <p className="mt-1 break-words text-sm font-medium text-on-surface"><bdi dir="auto">{rule.name_en}</bdi></p>
            <p className="mt-1 break-words text-sm text-on-surface-variant"><bdi dir="auto">{rule.name_ar}</bdi></p>
          </div>
          {canRevise && group.current ? <button type="button" onClick={() => onEdit(rule.posting_rule_id)} className="min-h-10 shrink-0 rounded-md border border-outline-variant px-3 text-sm font-semibold text-on-surface">{dictionary.revise}</button> : null}
        </div>
        <p className="mt-3 text-xs text-on-surface-variant">{dictionary.effectiveFrom}: <time dateTime={rule.effective_from}><bdi dir="ltr">{rule.effective_from.slice(0, 10)}</bdi></time></p>
        <p className="mt-1 break-words text-sm text-on-surface-variant">{dictionary.reason}: <bdi dir="auto">{rule.reason}</bdi></p>
        {rule.evidence_ref ? <p className="mt-1 break-all text-sm text-on-surface-variant">{dictionary.evidenceReference}: <bdi dir="ltr">{rule.evidence_ref}</bdi></p> : null}
        <h3 className="mt-4 text-sm font-semibold text-on-surface">{dictionary.mappings}</h3>
        <ul className="mt-2 grid min-w-0 gap-2">{rule.mappings.map((mapping) => <MappingSummary key={`${rule.posting_rule_id}:${rule.version}:${mapping.mapping_key}`} mapping={mapping} accounts={accounts} dictionary={dictionary} />)}</ul>
        {group.history.length > 0 ? (
          <details className="mt-3 rounded-md border border-outline-variant/70 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-on-surface">{dictionary.versionHistory} ({group.history.length})</summary>
            <ul className="mt-3 grid min-w-0 gap-3">
              {group.history.sort((a, b) => b.version - a.version).map((version) => (
                <li key={`${version.posting_rule_id}:${version.version}`} className="min-w-0 rounded-md bg-surface-container-low p-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm"><span>{dictionary.version} <bdi dir="ltr">{version.version}</bdi></span><span>{version.is_active ? dictionary.active : dictionary.inactive}</span></div>
                  <p className="mt-1 break-words text-sm"><bdi dir="auto">{version.name_en}</bdi> · <bdi dir="auto">{version.name_ar}</bdi></p>
                  <p className="mt-1 text-xs text-on-surface-variant">{dictionary.reason}: <bdi dir="auto">{version.reason}</bdi></p>
                  <ul className="mt-2 grid min-w-0 gap-2">{version.mappings.map((mapping) => <MappingSummary key={`${version.posting_rule_id}:${version.version}:${mapping.mapping_key}`} mapping={mapping} accounts={accounts} dictionary={dictionary} />)}</ul>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </article>
    </li>
  );
}

export default function PostingRulesClient({
  locale,
  state,
  rules,
  accounts,
  canManage,
}: {
  locale: Locale;
  state: PostingRulesPageState;
  rules: AccountingPostingRuleVersion[];
  accounts: AccountingAccountVersion[];
  canManage: boolean;
}) {
  const dictionary = getAccountingPostingRulesDictionary(locale);
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const groups = groupRules(rules);
  const selected = editingId && editingId !== "new" ? rules.find((rule) => rule.posting_rule_id === editingId && rule.is_current) ?? null : null;
  const eligibleAccounts = getEligibleAccounts(accounts);
  const noAccounts = accounts.every((account) => !account.is_current);
  const noEligibleAccounts = !noAccounts && eligibleAccounts.length === 0;

  if (state !== "ready") {
    const stateContent = {
      "not-initialized": [dictionary.notInitializedTitle, dictionary.notInitializedBody],
      "recovery-required": [dictionary.recoveryRequiredTitle, dictionary.recoveryRequiredBody],
      "access-denied": [dictionary.accessDeniedTitle, dictionary.accessDeniedBody],
      "dependency-failure": [dictionary.dependencyFailureTitle, dictionary.dependencyFailureBody],
      ready: ["", ""],
    }[state];
    return (
      <section className="rounded-lg border border-error/20 bg-error-container p-5 text-on-error-container" role="status">
        <h2 className="text-lg font-semibold">{stateContent[0]}</h2>
        <p className="mt-2 text-sm">{stateContent[1]}</p>
        <Link href="/settings/accounting" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold underline">{dictionary.backToSetup}</Link>
      </section>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      {noAccounts ? (
        <section className="rounded-lg border border-warning/30 bg-warning-container p-4 text-on-warning-container" role="status">
          <h2 className="font-semibold">{dictionary.noAccountsTitle}</h2>
          <p className="mt-1 text-sm">{dictionary.noAccountsBody}</p>
          <Link href="/settings/accounting/chart-of-accounts" className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold underline">{dictionary.openChart}</Link>
        </section>
      ) : noEligibleAccounts ? (
        <section className="rounded-lg border border-warning/30 bg-warning-container p-4 text-on-warning-container" role="status">
          <h2 className="font-semibold">{dictionary.noEligibleAccountsTitle}</h2>
          <p className="mt-1 text-sm">{dictionary.noEligibleAccountsBody}</p>
          <Link href="/settings/accounting/chart-of-accounts" className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold underline">{dictionary.openChart}</Link>
        </section>
      ) : null}
      <section className="min-w-0 rounded-lg border border-outline-variant p-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-on-surface">{dictionary.currentRules}</h2>{savedVersion !== null ? <p className="mt-1 text-sm text-on-surface-variant" role="status">{dictionary.savedVersion.replace("{version}", String(savedVersion))}</p> : null}</div>
          {canManage && eligibleAccounts.length > 0 ? <button type="button" onClick={() => { setSavedVersion(null); setEditingId("new"); }} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{dictionary.create}</button> : null}
        </div>
        {groups.length === 0 ? <div className="mt-4 rounded-md border border-dashed border-outline-variant p-4"><h3 className="font-medium text-on-surface">{dictionary.emptyTitle}</h3><p className="mt-1 text-sm text-on-surface-variant">{dictionary.emptyBody}</p></div> : (
          <ul className="mt-4 grid min-w-0 gap-3">{groups.map((group) => <RuleCard key={group.current?.posting_rule_id ?? group.history[0]?.posting_rule_id} group={group} accounts={accounts} dictionary={dictionary} canRevise={canManage && eligibleAccounts.length > 0} onEdit={(id) => { setSavedVersion(null); setEditingId(id); }} />)}</ul>
        )}
      </section>
      {canManage && editingId !== null && eligibleAccounts.length > 0 ? (
        <RuleForm
          key={`${selected?.posting_rule_id ?? "new"}:${selected?.version ?? 0}`}
          rule={selected}
          accounts={accounts}
          locale={locale}
          dictionary={dictionary}
          onCancel={() => setEditingId(null)}
          onReload={() => { setEditingId(null); router.refresh(); }}
          onSaved={(version) => { setEditingId(null); setSavedVersion(version); router.refresh(); }}
        />
      ) : null}
      <Link href="/settings/accounting" className="text-sm font-medium text-primary underline underline-offset-4">{dictionary.backToSetup}</Link>
    </div>
  );
}
