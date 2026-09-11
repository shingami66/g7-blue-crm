"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Banknote, CheckCircle2, Clock3, LockKeyhole, Pencil, Plus, ShieldAlert, Wallet } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n";
import { getPettyCashDictionary } from "@/lib/i18n/dictionaries/petty-cash";
import type { PettyCashCustodianOption, PettyCashExpenseSummary, PettyCashFund, PettyCashTransaction } from "@/lib/expenses/types";
import { attachExpenseReceiptAction, recordPettyCashExpenseAction, recordPettyCashTransactionAction, setPettyCashFundStatusAction, updatePettyCashFundAction } from "@/lib/expenses/actions";

function money(value: number) { return `${Number(value).toFixed(2)} SAR`; }

export default function PettyCashDetailClient({ canRead, canManage, canTransact, fund, transactions, expenses, custodians, loadError }: { canRead: boolean; canManage: boolean; canTransact: boolean; fund: PettyCashFund | null; transactions: PettyCashTransaction[]; expenses: PettyCashExpenseSummary[]; custodians: PettyCashCustodianOption[]; loadError: boolean }) {
  const locale = useLocale();
  const dictionary = getPettyCashDictionary(locale);
  const isRtl = locale === "ar";
  const [panel, setPanel] = useState<"manage" | "replenish" | "expense" | "disburse" | "withdraw" | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<"active" | "suspended" | "closed" | null>(null);
  const [statusRequestId, setStatusRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [partialReceipt, setPartialReceipt] = useState<{ expenseId: string; requestId: string } | null>(null);
  const [retryReceiptError, setRetryReceiptError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRetryPending, startRetryTransition] = useTransition();
  const [selectedExpense, setSelectedExpense] = useState("");
  const approvedExpenses = useMemo(() => expenses.filter((expense) => expense.status === "approved" && expense.remaining_petty_cash_amount > 0), [expenses]);
  const expenseNumberById = useMemo(() => new Map(expenses.map((expense) => [expense.id, expense.expense_number])), [expenses]);

  if (!canRead) return <div className="rounded-xl border border-error bg-error-container/40 p-6 text-on-error-container"><h1 className="text-lg font-semibold">{dictionary.states.accessRestricted}</h1><p className="mt-1 text-sm">{dictionary.states.accessRestrictedMessage}</p></div>;
  if (!fund) return <div className="space-y-4"><Link href="/petty-cash" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">{isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}{dictionary.header.title}</Link><div className="rounded-xl border border-outline-variant p-6 text-sm text-on-surface-variant">{loadError ? dictionary.states.loadError : dictionary.states.error}</div></div>;

  const openPanel = (next: typeof panel) => { setPanel(next); setRequestId(crypto.randomUUID()); setError(null); };
  const closePanel = () => { setPanel(null); setRequestId(null); setError(null); setSelectedExpense(""); };
  const finish = (message = dictionary.states.success) => { setNotice(message); window.location.reload(); };

  const retryReceipt = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !partialReceipt) return;
    const formData = new FormData();
    formData.append("expense_id", partialReceipt.expenseId);
    formData.append("request_id", partialReceipt.requestId);
    formData.append("receipt", file);
    setRetryReceiptError(null);
    startRetryTransition(async () => {
      const result = await attachExpenseReceiptAction(formData);
      if (!result.success) {
        setRetryReceiptError(dictionary.states.error);
        return;
      }
      setPartialReceipt(null);
      setNotice(dictionary.states.success);
      window.location.reload();
    });
  };

  const submitTransaction = (event: React.FormEvent<HTMLFormElement>, transactionType: "replenishment" | "disbursement" | "treasury_withdrawal") => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await recordPettyCashTransactionAction({ fund_id: fund.id, transaction_type: transactionType, amount: Number(data.get("amount")), reference: data.get("reference") || null, expense_id: transactionType === "disbursement" ? selectedExpense : null, notes: data.get("notes") || null, request_id: requestId });
      if (!result.success) { setError(result.error ?? dictionary.states.error); return; }
      finish();
    });
  };

  const submitManage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updatePettyCashFundAction({ fund_id: fund.id, fund_name: String(data.get("fund_name") ?? ""), custodian_id: String(data.get("custodian_id") ?? ""), float_limit: Number(data.get("float_limit")), request_id: requestId });
      if (!result.success) { setError(result.error ?? dictionary.states.error); return; }
      finish();
    });
  };

  const submitExpense = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    data.set("fund_id", fund.id);
    data.set("request_id", requestId ?? "");
    startTransition(async () => {
      const result = await recordPettyCashExpenseAction(data);
      if (!result.success) { setError(result.error ?? dictionary.states.error); return; }
      if (result.data?.outcome === "partial_success") {
        closePanel();
        setPartialReceipt({ expenseId: result.data.expense_id, requestId: result.data.receipt_request_id ?? "" });
        setNotice(null);
        return;
      }
      finish();
    });
  };

  const selectExpense = (id: string) => { setSelectedExpense(id); };
  const selectedApprovedExpense = approvedExpenses.find((expense) => expense.id === selectedExpense);

  const changeStatus = (newStatus: "active" | "suspended" | "closed") => {
    if (!statusRequestId) return;
    startTransition(async () => {
      const result = await setPettyCashFundStatusAction({ fund_id: fund.id, new_status: newStatus, request_id: statusRequestId });
      if (!result.success) { setError(result.error ?? dictionary.states.error); return; }
      finish();
    });
  };

  return (
    <div className="space-y-4">
      <Link href="/petty-cash" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">{isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}{dictionary.header.title}</Link>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{dictionary.header.sectionBadge}</span><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-on-surface"><Wallet className="h-6 w-6 text-primary" aria-hidden="true" />{fund.fund_name}</h1><p className="mt-1 text-sm text-on-surface-variant">{dictionary.labels.custodian}: {fund.custodian_name}</p></div><div className="flex flex-wrap gap-2"><StatusBadge status={fund.status} dictionary={dictionary} />{canManage && fund.status !== "closed" && <button type="button" onClick={() => openPanel("manage")} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"><Pencil className="h-4 w-4" aria-hidden="true" />{dictionary.actions.manage}</button>}</div></div>

      {notice && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />{notice}</div>}
      {partialReceipt && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert"><p className="font-semibold">{dictionary.states.receiptAttachmentFailed}</p><div className="mt-3 flex flex-wrap items-center gap-2"><label className={`inline-flex cursor-pointer items-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary ${isRetryPending ? "pointer-events-none opacity-50" : ""}`}><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={retryReceipt} disabled={isRetryPending} className="sr-only" />{isRetryPending ? dictionary.actions.working : dictionary.actions.retryReceipt}</label><Link href="/expenses" className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold">{dictionary.actions.openExpenseWorkspace}</Link></div>{retryReceiptError && <p className="mt-2 text-xs text-error">{retryReceiptError}</p>}</div>}
      {loadError && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{dictionary.states.loadError}</div>}
      {error && <div className="flex items-center gap-2 rounded-lg border border-error/40 bg-error-container/40 p-3 text-sm text-on-error-container" role="alert"><ShieldAlert className="h-4 w-4" aria-hidden="true" />{error}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Metric label={dictionary.labels.floatLimit} value={money(fund.float_limit)} /><Metric label={dictionary.labels.currentBalance} value={money(fund.current_balance)} /><Metric label={dictionary.labels.replenishmentCapacity} value={money(Math.max(0, fund.float_limit - fund.current_balance))} /></div>

      {canTransact && fund.status === "active" && <div className="flex flex-wrap gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"><button type="button" onClick={() => openPanel("replenish")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary"><Plus className="h-4 w-4" aria-hidden="true" />{dictionary.actions.replenish}</button><button type="button" onClick={() => openPanel("expense")} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"><Banknote className="h-4 w-4" aria-hidden="true" />{dictionary.actions.recordExpense}</button><button type="button" onClick={() => openPanel("disburse")} disabled={approvedExpenses.length === 0} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold disabled:opacity-50">{dictionary.actions.disburse}</button><button type="button" onClick={() => openPanel("withdraw")} className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold"><LockKeyhole className="h-4 w-4" aria-hidden="true" />{dictionary.actions.withdraw}</button></div>}

      {canManage && <div className="flex flex-wrap gap-2">{fund.status === "active" && <StatusAction label={dictionary.actions.suspend} onClick={() => { setStatusTarget("suspended"); setStatusRequestId(crypto.randomUUID()); }} />} {fund.status === "suspended" && <StatusAction label={dictionary.actions.reactivate} onClick={() => { setStatusTarget("active"); setStatusRequestId(crypto.randomUUID()); }} />} {fund.status !== "closed" && <StatusAction label={dictionary.actions.close} onClick={() => { setStatusTarget("closed"); setStatusRequestId(crypto.randomUUID()); }} />}</div>}

      {statusTarget && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">{statusTarget === "closed" ? dictionary.actions.close : statusTarget === "suspended" ? dictionary.actions.suspend : dictionary.actions.reactivate}</p><p className="mt-1">{statusTarget === "closed" ? dictionary.labels.currentBalance + ": " + money(fund.current_balance) : dictionary.states.success}</p><div className="mt-3 flex gap-2"><button type="button" disabled={isPending} onClick={() => changeStatus(statusTarget)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary">{isPending ? dictionary.actions.working : dictionary.actions.save}</button><button type="button" onClick={() => { setStatusTarget(null); setStatusRequestId(null); }} className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold">{dictionary.actions.cancel}</button></div></div>}

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"><h2 className="flex items-center gap-2 text-base font-semibold text-on-surface"><Wallet className="h-4 w-4 text-primary" aria-hidden="true" />{dictionary.labels.fundDetails}</h2><dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><Detail label={dictionary.labels.fundName} value={fund.fund_name} /><Detail label={dictionary.labels.custodian} value={fund.custodian_name ?? "—"} /><Detail label={dictionary.labels.status} value={dictionary.statuses[fund.status]} /></dl></section>

      <section className="space-y-3"><h2 className="text-base font-semibold text-on-surface">{dictionary.labels.pettyCashExpenses}</h2>{expenses.length === 0 ? <Empty text={dictionary.forms.noApprovedExpenses} /> : <><div className="grid gap-3 md:hidden" data-testid="mobile-petty-cash-expense-cards">{expenses.map((expense) => <PettyCashExpenseCard key={expense.id} expense={expense} dictionary={dictionary} />)}</div><div className="hidden overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest md:block" data-testid="desktop-petty-cash-expense-table"><table className="min-w-full text-start text-sm"><thead className="border-b border-outline-variant bg-surface-container-low"><tr><th className="px-3 py-2">{dictionary.labels.linkedExpense}</th><th className="px-3 py-2">{dictionary.labels.status}</th><th className="px-3 py-2">{dictionary.labels.date}</th><th className="px-3 py-2">{dictionary.labels.category}</th><th className="px-3 py-2">{dictionary.labels.amount}</th><th className="px-3 py-2">{dictionary.labels.review}</th><th className="px-3 py-2">{dictionary.labels.remaining}</th></tr></thead><tbody>{expenses.map((expense) => <tr key={expense.id} className="border-b border-outline-variant last:border-0"><td className="px-3 py-2 font-mono font-semibold" dir="ltr">{expense.expense_number}</td><td className="px-3 py-2">{dictionary.statuses[expense.status as keyof typeof dictionary.statuses] ?? expense.status}</td><td className="px-3 py-2" dir="ltr">{expense.expense_date}</td><td className="px-3 py-2">{expense.expense_category}</td><td className="px-3 py-2 font-mono" dir="ltr">{money(expense.amount)}</td><td className="px-3 py-2">{expense.finance_reviewed_at ? dictionary.labels.approved : dictionary.labels.review}</td><td className="px-3 py-2 font-mono" dir="ltr">{money(expense.remaining_petty_cash_amount)}</td></tr>)}</tbody></table></div></>}</section>

      <section className="space-y-3"><h2 className="text-base font-semibold text-on-surface">{dictionary.labels.transactionLedger}</h2>{transactions.length === 0 ? <Empty text={dictionary.labels.noFundsDescription} /> : <div className="space-y-2">{transactions.map((tx) => <TransactionRow key={tx.id} transaction={tx} dictionary={dictionary} locale={locale} expenseNumber={tx.expense_id ? expenseNumberById.get(tx.expense_id) : undefined} />)}</div>}</section>
      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"><h2 className="flex items-center gap-2 text-base font-semibold text-on-surface"><Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />{dictionary.labels.lifecycleAudit}</h2><dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2"><Detail label={dictionary.labels.created} value={new Date(fund.created_at).toLocaleString(locale)} /><Detail label={dictionary.labels.updated} value={new Date(fund.updated_at).toLocaleString(locale)} /><Detail label={dictionary.labels.ledger} value={dictionary.labels.immutableHistory} /></dl></section>

      {panel === "manage" && <Panel title={dictionary.forms.editTitle} close={closePanel} cancelLabel={dictionary.actions.cancel}><form onSubmit={submitManage} className="grid gap-3 sm:grid-cols-3"><label className="text-sm"><span className="mb-1 block">{dictionary.labels.fundName}</span><input name="fund_name" defaultValue={fund.fund_name} required minLength={3} className="w-full rounded-lg border border-outline-variant px-3 py-2" /></label><label className="text-sm"><span className="mb-1 block">{dictionary.labels.custodian}</span><select name="custodian_id" defaultValue={fund.custodian_id} required className="w-full rounded-lg border border-outline-variant px-3 py-2">{custodians.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}</select></label><label className="text-sm"><span className="mb-1 block">{dictionary.labels.floatLimit}</span><input name="float_limit" type="number" min={fund.current_balance} step="0.01" defaultValue={fund.float_limit} required className="w-full rounded-lg border border-outline-variant px-3 py-2" /></label><Submit disabled={isPending} label={dictionary.actions.save} working={dictionary.actions.working} /></form></Panel>}
      {panel === "replenish" && <Panel title={dictionary.actions.replenish} close={closePanel} cancelLabel={dictionary.actions.cancel}><form onSubmit={(event) => submitTransaction(event, "replenishment")} className="grid gap-3 sm:grid-cols-3"><AmountInput label={dictionary.forms.amount} /><TextInput name="reference" label={dictionary.labels.reference} /><TextInput name="notes" label={dictionary.forms.notes} /><Submit disabled={isPending} label={dictionary.actions.replenish} working={dictionary.actions.working} /></form></Panel>}
      {panel === "withdraw" && <Panel title={dictionary.actions.withdraw} close={closePanel} cancelLabel={dictionary.actions.cancel}><form onSubmit={(event) => submitTransaction(event, "treasury_withdrawal")} className="grid gap-3 sm:grid-cols-2"><AmountInput label={dictionary.forms.amount} /><TextInput name="reference" label={dictionary.forms.reference} required /><TextInput name="notes" label={dictionary.forms.notes} /><Submit disabled={isPending} label={dictionary.actions.withdraw} working={dictionary.actions.working} /></form></Panel>}
      {panel === "disburse" && <Panel title={dictionary.actions.disburse} close={closePanel} cancelLabel={dictionary.actions.cancel}><form onSubmit={(event) => submitTransaction(event, "disbursement")} className="grid gap-3 sm:grid-cols-2"><label className="text-sm sm:col-span-2"><span className="mb-1 block">{dictionary.forms.expense}</span><select required value={selectedExpense} onChange={(event) => selectExpense(event.target.value)} className="w-full rounded-lg border border-outline-variant px-3 py-2"><option value="">{dictionary.forms.noApprovedExpenses}</option>{approvedExpenses.map((expense) => <option key={expense.id} value={expense.id}>{expense.expense_number} — {money(expense.remaining_petty_cash_amount)}</option>)}</select></label><AmountInput label={dictionary.forms.amount} defaultValue={selectedApprovedExpense?.remaining_petty_cash_amount} max={selectedApprovedExpense?.remaining_petty_cash_amount ?? fund.current_balance} /><TextInput name="notes" label={dictionary.forms.notes} /><Submit disabled={isPending || !selectedExpense} label={dictionary.actions.disburse} working={dictionary.actions.working} /></form></Panel>}
      {panel === "expense" && <Panel title={dictionary.actions.recordExpense} close={closePanel} cancelLabel={dictionary.actions.cancel}><form onSubmit={submitExpense} encType="multipart/form-data" className="grid gap-3 sm:grid-cols-2"><label className="text-sm"><span className="mb-1 block">{dictionary.forms.context}</span><select name="context_type" defaultValue="company" className="w-full rounded-lg border border-outline-variant px-3 py-2"><option value="company">{dictionary.forms.company}</option><option value="event">{dictionary.forms.event}</option></select></label><TextInput name="service_id" label={dictionary.forms.serviceId} /><TextInput name="expense_category" label={dictionary.forms.category} required /><TextInput name="description" label={dictionary.forms.description} required /><label className="text-sm"><span className="mb-1 block">{dictionary.forms.amount}</span><input name="amount" type="number" min="0.01" step="0.01" required className="w-full rounded-lg border border-outline-variant px-3 py-2" /></label><label className="text-sm"><span className="mb-1 block">{dictionary.forms.date}</span><input name="expense_date" type="date" required className="w-full rounded-lg border border-outline-variant px-3 py-2" /></label><label className="text-sm sm:col-span-2"><span className="mb-1 block">{dictionary.forms.receipt}</span><input name="receipt" type="file" accept="application/pdf,image/jpeg,image/png" className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm" /></label><Submit disabled={isPending || !requestId} label={dictionary.actions.recordExpense} working={dictionary.actions.working} /></form></Panel>}
    </div>
  );
}

function Panel({ title, close, cancelLabel, children }: { title: string; close: () => void; cancelLabel: string; children: React.ReactNode }) { return <div className="rounded-xl border border-primary/30 bg-surface-container-lowest p-4"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-on-surface">{title}</h2><button type="button" onClick={close} className="text-sm text-on-surface-variant underline">{cancelLabel}</button></div><div className="mt-4">{children}</div></div>; }
function Submit({ disabled, label, working }: { disabled: boolean; label: string; working: string }) { return <div className="sm:col-span-2 flex justify-end"><button disabled={disabled} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">{disabled ? working : label}</button></div>; }
function AmountInput({ label, defaultValue, max }: { label: string; defaultValue?: number; max?: number }) { return <label className="text-sm"><span className="mb-1 block">{label}</span><input name="amount" type="number" min="0.01" max={max} step="0.01" defaultValue={defaultValue} required className="w-full rounded-lg border border-outline-variant px-3 py-2" /></label>; }
function TextInput({ name, label, required = false }: { name: string; label: string; required?: boolean }) { return <label className="text-sm"><span className="mb-1 block">{label}</span><input name={name} required={required} className="w-full rounded-lg border border-outline-variant px-3 py-2" /></label>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4"><span className="text-xs text-on-surface-variant">{label}</span><span className="mt-2 block font-mono text-lg font-semibold text-on-surface" dir="ltr">{value}</span></div>; }
 function Detail({ label, value }: { label: string; value: React.ReactNode }) { return <div className="min-w-0"><dt className="text-xs text-on-surface-variant">{label}</dt><dd className="mt-1 break-words font-medium text-on-surface">{value}</dd></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-outline-variant p-6 text-sm text-on-surface-variant">{text}</div>; }
function StatusAction({ label, onClick }: { label: string; onClick: () => void }) { return <button type="button" onClick={onClick} className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-semibold">{label}</button>; }
function StatusBadge({ status, dictionary }: { status: PettyCashFund["status"]; dictionary: ReturnType<typeof getPettyCashDictionary> }) { const classes = status === "active" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : status === "suspended" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-zinc-100 text-zinc-700 border-zinc-200"; return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${classes}`}>{dictionary.statuses[status]}</span>; }
function PettyCashExpenseCard({ expense, dictionary }: { expense: PettyCashExpenseSummary; dictionary: ReturnType<typeof getPettyCashDictionary> }) { const status = dictionary.statuses[expense.status as keyof typeof dictionary.statuses] ?? expense.status; return <article className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest p-4" data-testid="mobile-petty-cash-expense-card"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-on-surface-variant">{dictionary.labels.linkedExpense}</p><p className="mt-1 break-all font-mono font-semibold text-on-surface" dir="ltr">{expense.expense_number}</p></div><span className="shrink-0 rounded-full border border-outline-variant px-2 py-1 text-xs font-semibold">{status}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><Detail label={dictionary.labels.date} value={<span dir="ltr">{expense.expense_date}</span>} /><Detail label={dictionary.labels.category} value={expense.expense_category} /><Detail label={dictionary.labels.amount} value={<span dir="ltr" className="font-mono">{money(expense.amount)}</span>} /><Detail label={dictionary.labels.review} value={expense.finance_reviewed_at ? dictionary.labels.approved : dictionary.labels.review} /><Detail label={dictionary.labels.remaining} value={<span dir="ltr" className="font-mono">{money(expense.remaining_petty_cash_amount)}</span>} /></dl></article>; }
function TransactionRow({ transaction, dictionary, locale, expenseNumber }: { transaction: PettyCashTransaction; dictionary: ReturnType<typeof getPettyCashDictionary>; locale: Locale; expenseNumber?: string }) { return <div className="grid gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-sm md:grid-cols-8 md:items-center"><div className="font-semibold md:col-span-2">{dictionary.transactionTypes[transaction.transaction_type]}</div><div className="font-mono" dir="ltr">{money(transaction.amount)}</div><div className="font-mono text-on-surface-variant" dir="ltr">{money(transaction.balance_before)} → {money(transaction.balance_after)}</div><div className="font-mono" dir="ltr">{expenseNumber ?? "—"}</div><div className="text-on-surface-variant">{transaction.reference ?? "—"}</div><div className="text-on-surface-variant" dir="ltr">{new Date(transaction.recorded_at).toLocaleString(locale)}</div><div className="text-on-surface-variant">{transaction.notes ?? "—"}</div></div>; }
