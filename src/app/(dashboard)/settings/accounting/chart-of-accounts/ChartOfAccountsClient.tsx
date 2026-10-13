"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { saveAccountingAccount } from "@/lib/accounting/actions";
import type {
  AccountingAccountInput,
  AccountingAccountVersion,
  AccountingActionErrorCode,
  AccountingActionResult,
  AccountingAccountType,
  AccountingAccountKind,
  AccountingControlClassification,
  AccountingNormalBalance,
} from "@/lib/accounting/types";
import { getAccountingChartDictionary } from "@/lib/i18n/dictionaries/accounting-chart";
import type { Locale } from "@/lib/i18n/locales";

export type ChartPageState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";
type SaveResult = AccountingActionResult<{ account_id: string; version: number }>;
type TreeNode = { account: AccountingAccountVersion; children: TreeNode[]; history: AccountingAccountVersion[] };

const accountTypes: AccountingAccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
const accountKinds: AccountingAccountKind[] = ["POSTING", "NON_POSTING"];
const normalBalances: AccountingNormalBalance[] = ["DEBIT", "CREDIT"];
const classifications: AccountingControlClassification[] = [
  "NONE", "ACCOUNTS_RECEIVABLE", "ACCOUNTS_PAYABLE", "ACCRUED_LIABILITY", "CUSTOMER_ADVANCE",
  "SUPPLIER_ADVANCE", "CONTRACT_LIABILITY", "CASH_ACCOUNTABILITY", "EMPLOYEE_ADVANCE",
  "EMPLOYEE_REIMBURSEMENT_LIABILITY", "CONTRACT_ASSET",
];

function fieldText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function buildTree(accounts: AccountingAccountVersion[]): TreeNode[] {
  const current = accounts.filter((account) => account.is_current).slice().sort((left, right) =>
    left.account_code.localeCompare(right.account_code, undefined, { numeric: true, sensitivity: "base" }),
  );
  const historyById = new Map<string, AccountingAccountVersion[]>();
  for (const account of accounts) {
    if (account.is_current) continue;
    const versions = historyById.get(account.account_id) ?? [];
    versions.push(account);
    historyById.set(account.account_id, versions);
  }
  for (const versions of historyById.values()) versions.sort((left, right) => right.version - left.version);

  const currentIds = new Set(current.map((account) => account.account_id));
  const childrenByParent = new Map<string, AccountingAccountVersion[]>();
  for (const account of current) {
    if (!account.parent_account_id || !currentIds.has(account.parent_account_id)) continue;
    const children = childrenByParent.get(account.parent_account_id) ?? [];
    children.push(account);
    childrenByParent.set(account.parent_account_id, children);
  }

  const visited = new Set<string>();
  const build = (account: AccountingAccountVersion): TreeNode => {
    visited.add(account.account_id);
    const children = (childrenByParent.get(account.account_id) ?? [])
      .filter((child) => !visited.has(child.account_id))
      .map(build);
    return { account, children, history: historyById.get(account.account_id) ?? [] };
  };

  const roots = current.filter((account) => !account.parent_account_id || !currentIds.has(account.parent_account_id));
  const tree = roots.map(build);
  // Surface malformed/orphaned cycle records without recursing forever.
  for (const account of current) if (!visited.has(account.account_id)) tree.push(build(account));
  return tree;
}

function descendantsOf(accountId: string, accounts: AccountingAccountVersion[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const account of accounts) {
    if (!account.is_current || !account.parent_account_id) continue;
    const ids = children.get(account.parent_account_id) ?? [];
    ids.push(account.account_id);
    children.set(account.parent_account_id, ids);
  }
  const descendants = new Set<string>([accountId]);
  const pending = [accountId];
  while (pending.length > 0) {
    const parent = pending.pop()!;
    for (const childId of children.get(parent) ?? []) {
      if (descendants.has(childId)) continue;
      descendants.add(childId);
      pending.push(childId);
    }
  }
  return descendants;
}

function ValueField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-outline-variant/70 p-3">
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-medium text-on-surface">{children}</dd>
    </div>
  );
}

function AccountTreeNode({
  node,
  depth,
  accounts,
  canManage,
  onEdit,
  dictionary,
}: {
  node: TreeNode;
  depth: number;
  accounts: AccountingAccountVersion[];
  canManage: boolean;
  onEdit: (accountId: string) => void;
  dictionary: ReturnType<typeof getAccountingChartDictionary>;
}) {
  const account = node.account;
  const parent = accounts.find((candidate) => candidate.account_id === account.parent_account_id);
  const accountIsProtected = account.is_protected || account.control_classification !== "NONE";
  return (
    <li className="min-w-0 list-none" key={`${account.account_id}:${account.version}`}>
      <article className="min-w-0 rounded-lg border border-outline-variant bg-surface p-4" style={{ marginInlineStart: `${Math.min(depth, 5) * 0.5}rem` }}>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <bdi dir="ltr" className="font-semibold text-on-surface">{account.account_code}</bdi>
              <span className="text-xs text-on-surface-variant">{dictionary.version} <bdi dir="ltr">{account.version}</bdi></span>
            </div>
            <p className="mt-1 break-words text-sm font-medium text-on-surface"><bdi dir="auto">{account.name_en}</bdi></p>
            <p className="mt-1 break-words text-sm text-on-surface-variant"><bdi dir="auto">{account.name_ar}</bdi></p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${account.is_active ? "bg-success-container text-on-success-container" : "bg-surface-container-high text-on-surface-variant"}`}>
              {account.is_active ? dictionary.active : dictionary.inactive}
            </span>
            {accountIsProtected ? <span className="rounded-full bg-warning-container px-2.5 py-1 text-xs font-medium text-on-warning-container">{dictionary.protected}</span> : null}
            {canManage ? (
              <button type="button" onClick={() => onEdit(account.account_id)} className="min-h-10 rounded-md border border-outline-variant px-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low">
                {dictionary.edit}
              </button>
            ) : null}
          </div>
        </div>

        <dl className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <ValueField label={dictionary.accountType}>{dictionary.accountTypes[account.account_type]}</ValueField>
          <ValueField label={dictionary.category}><bdi dir="auto">{account.category}</bdi></ValueField>
          <ValueField label={dictionary.normalBalance}>{dictionary.normalBalances[account.normal_balance]}</ValueField>
          <ValueField label={dictionary.accountKind}>{dictionary.accountKinds[account.account_kind]}</ValueField>
          <ValueField label={dictionary.parent}>{parent ? <><bdi dir="ltr">{parent.account_code}</bdi> — <bdi dir="auto">{parent.name_en}</bdi></> : dictionary.noParent}</ValueField>
          <ValueField label={dictionary.controlClassification}>{dictionary.classifications[account.control_classification]}</ValueField>
        </dl>
        <dl className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <ValueField label={dictionary.effectiveFrom}><time dateTime={account.effective_from}><bdi dir="ltr">{account.effective_from.slice(0, 10)}</bdi></time></ValueField>
          <ValueField label={dictionary.reason}><bdi dir="auto">{account.reason}</bdi></ValueField>
          {account.evidence_ref ? <ValueField label={dictionary.evidenceReference}><bdi dir="ltr">{account.evidence_ref}</bdi></ValueField> : null}
        </dl>

        {node.history.length > 0 ? (
          <details className="mt-3 rounded-md border border-outline-variant/70 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-on-surface">{dictionary.versionHistory} ({node.history.length})</summary>
            <ul className="mt-3 grid min-w-0 gap-2">
              {node.history.map((version) => (
                <li key={`${version.account_id}:${version.version}`} className="min-w-0 rounded-md bg-surface-container-low p-3 text-sm">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{dictionary.priorVersion} <bdi dir="ltr">{version.version}</bdi></span>
                    <bdi dir="ltr">{version.account_code}</bdi>
                    <time dateTime={version.effective_from} className="text-xs text-on-surface-variant">
                      {dictionary.effectiveFrom}: <bdi dir="ltr">{version.effective_from.slice(0, 10)}</bdi>
                    </time>
                  </div>
                  <p className="mt-1 break-words"><bdi dir="auto">{version.name_en}</bdi> · <bdi dir="auto">{version.name_ar}</bdi></p>
                  <dl className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                    <ValueField label={dictionary.accountType}>{dictionary.accountTypes[version.account_type]}</ValueField>
                    <ValueField label={dictionary.category}><bdi dir="auto">{version.category}</bdi></ValueField>
                    <ValueField label={dictionary.normalBalance}>{dictionary.normalBalances[version.normal_balance]}</ValueField>
                    <ValueField label={dictionary.accountKind}>{dictionary.accountKinds[version.account_kind]}</ValueField>
                    <ValueField label={dictionary.parent}>{version.parent_account_id ? <bdi dir="ltr">{version.parent_account_id}</bdi> : dictionary.noParent}</ValueField>
                    <ValueField label={dictionary.controlClassification}>{dictionary.classifications[version.control_classification]}</ValueField>
                  </dl>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-surface-container-high px-2 py-1">{version.is_active ? dictionary.active : dictionary.inactive}</span>
                    {version.is_protected ? <span className="rounded-full bg-warning-container px-2 py-1 text-on-warning-container">{dictionary.protected}</span> : null}
                  </div>
                  <p className="mt-2 break-words text-xs text-on-surface-variant"><span className="font-medium">{dictionary.reason}: </span><bdi dir="auto">{version.reason}</bdi></p>
                  {version.evidence_ref ? <p className="mt-1 break-words text-xs text-on-surface-variant"><span className="font-medium">{dictionary.evidenceReference}: </span><bdi dir="ltr">{version.evidence_ref}</bdi></p> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </article>
      {node.children.length > 0 ? (
        <ul className="mt-2 grid min-w-0 gap-2 border-s-2 border-outline-variant ps-3">
          {node.children.map((child) => (
            <AccountTreeNode key={child.account.account_id} node={child} depth={depth + 1} accounts={accounts} canManage={canManage} onEdit={onEdit} dictionary={dictionary} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function AccountField({
  label,
  name,
  defaultValue,
  disabled,
  maxLength,
  dir = "auto",
}: {
  label: string;
  name: string;
  defaultValue: string;
  disabled: boolean;
  maxLength: number;
  dir?: "auto" | "ltr" | "rtl";
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
      {label}
      <input name={name} required maxLength={maxLength} defaultValue={defaultValue} dir={dir} disabled={disabled} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal disabled:bg-surface-container-low disabled:text-on-surface-variant" />
    </label>
  );
}

function AccountForm({
  account,
  accounts,
  dictionary,
  onCancel,
  onSaved,
}: {
  account: AccountingAccountVersion | null;
  accounts: AccountingAccountVersion[];
  dictionary: ReturnType<typeof getAccountingChartDictionary>;
  onCancel: () => void;
  onSaved: (version: number) => void;
}) {
  const [result, setResult] = useState<SaveResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isProtected, setIsProtected] = useState(account?.is_protected ?? false);
  const [classification, setClassification] = useState<AccountingControlClassification>(account?.control_classification ?? "NONE");
  const requestId = useRef<string | null>(null);
  const hasChildren = Boolean(account && accounts.some((candidate) => candidate.parent_account_id === account.account_id));
  const locked = Boolean(account && (account.is_protected || account.control_classification !== "NONE"));
  const excludedParents = account ? descendantsOf(account.account_id, accounts) : new Set<string>();
  const parentOptions = accounts.filter((candidate) => candidate.account_kind === "NON_POSTING" && !excludedParents.has(candidate.account_id));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const accountInput: AccountingAccountInput = {
      account_code: locked && account ? account.account_code : fieldText(formData, "account_code"),
      name_en: fieldText(formData, "name_en"),
      name_ar: fieldText(formData, "name_ar"),
      account_type: (locked && account ? account.account_type : fieldText(formData, "account_type")) as AccountingAccountType,
      category: locked && account ? account.category : fieldText(formData, "category"),
      normal_balance: (locked && account ? account.normal_balance : fieldText(formData, "normal_balance")) as AccountingNormalBalance,
      account_kind: (locked && account ? account.account_kind : fieldText(formData, "account_kind")) as AccountingAccountKind,
      parent_account_id: locked && account ? account.parent_account_id : optionalText(fieldText(formData, "parent_account_id")),
      is_active: formData.get("is_active") === "on",
      is_protected: locked ? true : isProtected || classification !== "NONE",
      control_classification: locked && account ? account.control_classification : classification,
    };
    const request = {
      account_id: account?.account_id ?? null,
      expected_version: account?.version ?? 0,
      account: accountInput,
      reason: fieldText(formData, "reason"),
      evidence_ref: optionalText(fieldText(formData, "evidence_ref")),
      request_id: requestId.current ?? crypto.randomUUID(),
    };
    requestId.current = request.request_id;

    startTransition(async () => {
      let nextResult: SaveResult;
      try {
        nextResult = await saveAccountingAccount(request);
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
      <h3 className="text-lg font-semibold text-on-surface">{account ? dictionary.editTitle : dictionary.createTitle}</h3>
      {locked ? <p className="mt-2 text-sm text-on-surface-variant">{dictionary.lockedFieldsNote}</p> : null}
      {hasChildren ? <p className="mt-2 text-sm text-on-surface-variant">{dictionary.childrenPreventPosting}</p> : null}
      <form className="mt-4 grid min-w-0 gap-4" onSubmit={submit} onChange={() => { requestId.current = null; setResult(null); }}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <AccountField label={dictionary.accountCode} name="account_code" defaultValue={account?.account_code ?? ""} maxLength={40} disabled={isPending || locked} dir="ltr" />
          <AccountField label={dictionary.category} name="category" defaultValue={account?.category ?? ""} maxLength={80} disabled={isPending || locked} />
          <AccountField label={dictionary.nameEn} name="name_en" defaultValue={account?.name_en ?? ""} maxLength={160} disabled={isPending} dir="ltr" />
          <AccountField label={dictionary.nameAr} name="name_ar" defaultValue={account?.name_ar ?? ""} maxLength={160} disabled={isPending} dir="rtl" />
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.accountType}
            <select name="account_type" defaultValue={account?.account_type ?? ""} required disabled={isPending || locked} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal disabled:bg-surface-container-low">
              <option value="" disabled>{dictionary.chooseValue}</option>
              {accountTypes.map((value) => <option value={value} key={value}>{dictionary.accountTypes[value]}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.normalBalance}
            <select name="normal_balance" defaultValue={account?.normal_balance ?? ""} required disabled={isPending || locked} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal disabled:bg-surface-container-low">
              <option value="" disabled>{dictionary.chooseValue}</option>
              {normalBalances.map((value) => <option value={value} key={value}>{dictionary.normalBalances[value]}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.accountKind}
            <select name="account_kind" defaultValue={account?.account_kind ?? ""} required disabled={isPending || locked} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal disabled:bg-surface-container-low">
              <option value="" disabled>{dictionary.chooseValue}</option>
              {accountKinds.map((value) => <option value={value} key={value} disabled={value === "POSTING" && hasChildren}>{dictionary.accountKinds[value]}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.parent}
            <select name="parent_account_id" defaultValue={account?.parent_account_id ?? ""} disabled={isPending || locked} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal disabled:bg-surface-container-low">
              <option value="">{dictionary.noParent}</option>
              {parentOptions.map((parent) => (
                <option key={parent.account_id} value={parent.account_id}>
                  {parent.account_code} — {parent.name_en}{parent.is_active ? "" : ` (${dictionary.inactive})`}
                </option>
              ))}
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.controlClassification}
            <select
              name="control_classification"
              value={classification}
              onChange={(event) => {
                const next = event.currentTarget.value as AccountingControlClassification;
                setClassification(next);
                if (next !== "NONE") setIsProtected(true);
              }}
              required
              disabled={isPending || locked}
              className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal disabled:bg-surface-container-low"
            >
              {classifications.map((value) => <option value={value} key={value}>{dictionary.classifications[value]}</option>)}
            </select>
          </label>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 items-start gap-3 text-sm text-on-surface">
            <input type="checkbox" name="is_active" defaultChecked={account?.is_active ?? true} disabled={isPending} className="mt-1 size-4 shrink-0 accent-primary" />
            <span>{dictionary.active}</span>
          </label>
          <label className="flex min-w-0 items-start gap-3 text-sm text-on-surface">
            <input type="checkbox" name="is_protected" checked={locked || isProtected || classification !== "NONE"} onChange={(event) => setIsProtected(event.currentTarget.checked)} disabled={isPending || locked || classification !== "NONE"} className="mt-1 size-4 shrink-0 accent-primary" />
            <span>{dictionary.protected}</span>
          </label>
        </div>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.reason}
          <textarea name="reason" required maxLength={2000} rows={3} disabled={isPending} dir="auto" className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.evidenceReference}
          <input name="evidence_ref" maxLength={2000} disabled={isPending} dir="ltr" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
        </label>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60">{isPending ? dictionary.saving : dictionary.save}</button>
          <button type="button" onClick={onCancel} disabled={isPending} className="min-h-11 rounded-md border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface disabled:opacity-60">{dictionary.cancel}</button>
          {feedback ? <p className="text-sm text-on-surface-variant" role="status" aria-live="polite">{feedback}</p> : null}
          {errorCode === "revision_conflict" ? <button type="button" onClick={() => window.location.reload()} className="min-h-10 text-sm font-medium text-primary underline underline-offset-4">{dictionary.reloadLatest}</button> : null}
        </div>
      </form>
    </section>
  );
}

export default function ChartOfAccountsClient({
  locale,
  state,
  accounts,
  canManage,
}: {
  locale: Locale;
  state: ChartPageState;
  accounts: AccountingAccountVersion[];
  canManage: boolean;
}) {
  const router = useRouter();
  const dictionary = getAccountingChartDictionary(locale);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  if (state !== "ready") {
    const heading = state === "not-initialized" ? dictionary.notInitializedTitle
      : state === "recovery-required" ? dictionary.recoveryRequiredTitle
        : state === "access-denied" ? dictionary.accessDeniedTitle
          : dictionary.dependencyFailureTitle;
    const body = state === "not-initialized" ? dictionary.notInitializedBody
      : state === "recovery-required" ? dictionary.recoveryRequiredBody
        : state === "access-denied" ? dictionary.accessDeniedBody
          : dictionary.dependencyFailureBody;
    return (
      <section className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-low p-5" role="status">
        <h2 className="text-lg font-semibold text-on-surface">{heading}</h2>
        <p className="mt-2 text-sm text-on-surface-variant">{body}</p>
        <Link href="/settings/accounting" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-4">{dictionary.backToSetup}</Link>
      </section>
    );
  }

  const tree = buildTree(accounts);
  const currentAccounts = accounts.filter((account) => account.is_current);
  const selected = editingId && editingId !== "new"
    ? currentAccounts.find((account) => account.account_id === editingId) ?? null
    : null;

  return (
    <div className="grid min-w-0 gap-5">
      <section className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-low p-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-on-surface">{dictionary.currentAccounts}</h2>
            {savedVersion !== null ? <p className="mt-1 text-sm text-on-surface-variant" role="status">{dictionary.savedVersion.replace("{version}", String(savedVersion))}</p> : null}
          </div>
          {canManage ? <button type="button" onClick={() => { setSavedVersion(null); setEditingId("new"); }} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{dictionary.newAccount}</button> : null}
        </div>

        {currentAccounts.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-outline-variant p-4">
            <h3 className="font-medium text-on-surface">{dictionary.emptyTitle}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">{dictionary.emptyBody}</p>
          </div>
        ) : (
          <ul className="mt-4 grid min-w-0 gap-3">
            {tree.map((node) => (
              <AccountTreeNode key={node.account.account_id} node={node} depth={0} accounts={currentAccounts} canManage={canManage} onEdit={(accountId) => { setSavedVersion(null); setEditingId(accountId); }} dictionary={dictionary} />
            ))}
          </ul>
        )}
      </section>

      {canManage && editingId !== null ? (
        <AccountForm
          key={`${selected?.account_id ?? "new"}:${selected?.version ?? 0}`}
          account={selected}
          accounts={currentAccounts}
          dictionary={dictionary}
          onCancel={() => setEditingId(null)}
          onSaved={(version) => { setEditingId(null); setSavedVersion(version); router.refresh(); }}
        />
      ) : null}

      <Link href="/settings/accounting" className="text-sm font-medium text-primary underline underline-offset-4">{dictionary.backToSetup}</Link>
    </div>
  );
}
