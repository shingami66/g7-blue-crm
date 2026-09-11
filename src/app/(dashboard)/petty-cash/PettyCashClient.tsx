"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Wallet, AlertCircle, UserRound, Clock3 } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { Locale } from "@/lib/i18n";
import { getPettyCashDictionary } from "@/lib/i18n/dictionaries/petty-cash";
import type { PettyCashCustodianOption, PettyCashFund } from "@/lib/expenses/types";
import { createPettyCashFundAction } from "@/lib/expenses/actions";

function money(value: number) {
  return `${Number(value).toFixed(2)} SAR`;
}

function formatFundDate(value: string | null | undefined, locale: Locale) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function PettyCashClient({
  canRead,
  canManage,
  funds,
  custodians,
  loadError,
}: {
  canRead: boolean;
  canManage: boolean;
  funds: PettyCashFund[];
  custodians: PettyCashCustodianOption[];
  loadError: boolean;
}) {
  const locale = useLocale();
  const dictionary = getPettyCashDictionary(locale);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canRead) {
    return <div className="rounded-xl border border-error bg-error-container/40 p-6 text-on-error-container"><h1 className="text-lg font-semibold">{dictionary.states.accessRestricted}</h1><p className="mt-1 text-sm">{dictionary.states.accessRestrictedMessage}</p></div>;
  }

  const openCreate = () => {
    setRequestId(crypto.randomUUID());
    setError(null);
    setIsCreateOpen(true);
  };

  const submitCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createPettyCashFundAction({
        fund_name: String(data.get("fund_name") ?? ""),
        custodian_id: String(data.get("custodian_id") ?? ""),
        float_limit: Number(data.get("float_limit")),
        request_id: requestId,
      });
      if (!result.success) {
        setError(result.error ?? dictionary.states.error);
        return;
      }
      setIsCreateOpen(false);
      setRequestId(null);
      setNotice(dictionary.states.success);
      window.location.reload();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{dictionary.header.sectionBadge}</span>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-on-surface"><Wallet className="h-6 w-6 text-primary" aria-hidden="true" />{dictionary.header.title}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{dictionary.header.subtitle}</p>
        </div>
        {canManage && <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary"><Plus className="h-4 w-4" aria-hidden="true" />{dictionary.header.createFund}</button>}
      </div>

      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{notice}</div>}
      {loadError && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertCircle className="h-4 w-4" aria-hidden="true" />{dictionary.states.loadError}</div>}

      {funds.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center"><Wallet className="mx-auto h-10 w-10 text-primary/40" aria-hidden="true" /><h2 className="mt-3 text-base font-semibold text-on-surface">{dictionary.labels.noFunds}</h2><p className="mt-1 text-sm text-on-surface-variant">{dictionary.labels.noFundsDescription}</p></div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {funds.map((fund) => <FundCard key={fund.id} fund={fund} dictionary={dictionary} locale={locale} />)}
          </div>
          <div className="hidden rounded-xl border border-outline-variant bg-surface-container-lowest md:block">
            <table className="w-full table-fixed text-start text-sm">
              <colgroup>
                <col className="w-[17%]" />
                <col className="w-[13%]" />
                <col className="w-[9%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
                <col className="w-[13%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs text-on-surface-variant">
                <tr>
                  <th className="px-3 py-3 text-start font-semibold">{dictionary.labels.fundName}</th>
                  <th className="px-3 py-3 text-start font-semibold">{dictionary.labels.custodian}</th>
                  <th className="px-3 py-3 text-start font-semibold">{dictionary.labels.status}</th>
                  <th className="px-3 py-3 text-end font-semibold">{dictionary.labels.floatLimit}</th>
                  <th className="px-3 py-3 text-end font-semibold">{dictionary.labels.currentBalance}</th>
                  <th className="px-3 py-3 text-end font-semibold">{dictionary.labels.replenishmentCapacity}</th>
                  <th className="px-3 py-3 text-start font-semibold">{dictionary.labels.lastActivity}</th>
                  <th className="px-3 py-3 text-end font-semibold">{dictionary.labels.viewFund}</th>
                </tr>
              </thead>
              <tbody>
                {funds.map((fund) => (
                  <tr key={fund.id} className="border-b border-outline-variant last:border-0">
                    <td className="px-3 py-3 text-start font-semibold text-on-surface">{fund.fund_name}</td>
                    <td className="px-3 py-3 text-start text-on-surface-variant">{fund.custodian_name}</td>
                    <td className="px-3 py-3 text-start"><StatusBadge status={fund.status} dictionary={dictionary} /></td>
                    <td className="px-3 py-3 text-end font-mono" dir="ltr">{money(fund.float_limit)}</td>
                    <td className="px-3 py-3 text-end font-mono" dir="ltr">{money(fund.current_balance)}</td>
                    <td className="px-3 py-3 text-end font-mono" dir="ltr">{money(Math.max(0, fund.float_limit - fund.current_balance))}</td>
                    <td className="px-3 py-3 text-start text-on-surface-variant"><span dir="ltr">{formatFundDate(fund.last_activity_at, locale)}</span></td>
                    <td className="px-3 py-3 text-end"><Link href={`/petty-cash/${fund.id}`} className="inline-block font-semibold text-primary underline-offset-2 hover:underline">{dictionary.labels.viewFund}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isCreateOpen && <div className="rounded-xl border border-primary/30 bg-surface-container-lowest p-5"><div className="flex items-start justify-between gap-4"><h2 className="text-base font-semibold text-on-surface">{dictionary.forms.createTitle}</h2><button type="button" onClick={() => { setIsCreateOpen(false); setRequestId(null); setError(null); }} className="text-sm text-on-surface-variant underline">{dictionary.actions.cancel}</button></div><form onSubmit={submitCreate} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"><label className="text-sm"><span className="mb-1 block font-medium">{dictionary.labels.fundName}</span><input name="fund_name" required minLength={3} className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2" /></label><label className="text-sm"><span className="mb-1 block font-medium">{dictionary.labels.custodian}</span><select name="custodian_id" required className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2"><option value="">—</option>{custodians.map((user) => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}</select></label><label className="text-sm"><span className="mb-1 block font-medium">{dictionary.labels.floatLimit}</span><input name="float_limit" type="number" min="0.01" step="0.01" required className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2" /></label><div className="md:col-span-3 flex items-center justify-between gap-3"><p className="text-sm text-error">{error}</p><button disabled={isPending || !requestId} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50">{isPending ? dictionary.actions.working : dictionary.actions.create}</button></div></form></div>}
    </div>
  );
}

function StatusBadge({ status, dictionary }: { status: PettyCashFund["status"]; dictionary: ReturnType<typeof getPettyCashDictionary> }) {
  const classes = status === "active" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : status === "suspended" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-zinc-100 text-zinc-700 border-zinc-200";
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${classes}`}>{dictionary.statuses[status]}</span>;
}

function FundCard({ fund, dictionary, locale }: { fund: PettyCashFund; dictionary: ReturnType<typeof getPettyCashDictionary>; locale: Locale }) {
  return <Link href={`/petty-cash/${fund.id}`} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-on-surface">{fund.fund_name}</h2><p className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant"><UserRound className="h-3.5 w-3.5" aria-hidden="true" />{fund.custodian_name}</p></div><StatusBadge status={fund.status} dictionary={dictionary} /></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><Metric label={dictionary.labels.floatLimit} value={money(fund.float_limit)} /><Metric label={dictionary.labels.currentBalance} value={money(fund.current_balance)} /><Metric label={dictionary.labels.replenishmentCapacity} value={money(Math.max(0, fund.float_limit - fund.current_balance))} /><Metric label={dictionary.labels.lastActivity} value={formatFundDate(fund.last_activity_at, locale)} icon={<Clock3 className="h-3 w-3" aria-hidden="true" />} /></div></Link>;
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) { return <div className="rounded-lg bg-surface-container-low p-2"><span className="block text-[11px] text-on-surface-variant">{label}</span><span className="mt-1 flex items-center gap-1 font-mono text-xs font-semibold text-on-surface" dir="ltr">{icon}{value}</span></div>; }
