import Link from "next/link";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import { isolateBidiText, isolateLtrText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type { EventCostingModel } from "@/lib/event-costing/types";
import { approveEventCostBudget, recordEventCostEtc } from "@/lib/event-costing/actions";
import type { Service } from "@/types/service";

export default function EventCostingWorkspace({
  service,
  model,
  dictionary,
  resultMessage,
  errorMessage,
}: {
  service: Service;
  model: EventCostingModel;
  dictionary: ServicesDictionary;
  resultMessage?: string;
  errorMessage?: string;
}) {
  const copy = dictionary.eventCosting;
  const budgetAction = approveEventCostBudget.bind(null, service.id);
  const etcAction = recordEventCostEtc.bind(null, service.id);

  return (
    <div dir={dictionary.locale === "ar" ? "rtl" : "ltr"} className="flex min-w-0 max-w-full flex-col gap-5 pb-12">
      <header className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/services/${service.id}`} className="text-xs font-semibold text-primary hover:underline">{copy.backToService}</Link>
            <h1 className="mt-2 text-xl font-bold text-on-surface">{copy.workspaceTitle}</h1>
            <p className="mt-1 text-sm text-on-surface-variant">{copy.workspaceSubtitle}</p>
          </div>
          <span dir="ltr" className="font-mono text-sm font-semibold text-primary">{isolateLtrText(service.serviceNumber)}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-on-surface-variant">
          <span>{copy.labels.asOfDate}:</span>
          <span dir="ltr" className="font-mono tabular-nums">{isolateBidiText(model.asOfDate)}</span>
          <span aria-hidden="true">·</span>
          <span>{copy.completeness}: {copy.statusLabels[model.completeness.status]}</span>
        </div>
        {model.completeness.reasonCodes.length > 0 && (
          <div className="mt-2 text-xs text-on-surface-variant">
            <p>{copy.partialDisclosure}</p>
            <ul className="mt-1 list-disc ps-5">
              {model.completeness.reasonCodes.map((reason) => (
                <li key={reason}>{copy.reasonLabels[reason] ?? reason}</li>
              ))}
            </ul>
          </div>
        )}
        {resultMessage && <p className="mt-3 rounded-lg bg-success-container p-3 text-sm text-on-success-container" role="status">{resultMessage}</p>}
        {errorMessage && <p className="mt-3 rounded-lg bg-error-container p-3 text-sm text-on-error-container" role="alert">{errorMessage}</p>}
      </header>

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
        <h2 className="font-semibold text-primary">{copy.waterfallTitle}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label={copy.labels.baseBudget} value={money(dictionary, model.baseBudget, copy.unavailable)} />
          <Metric label={copy.labels.contingency} value={money(dictionary, model.contingency, copy.unavailable)} />
          <Metric label={copy.labels.approvedBudgetCost} value={money(dictionary, model.approvedBudgetCost, copy.unavailable)} />
          <Metric label={copy.labels.approvedCommitment} value={money(dictionary, model.approvedCommitment, copy.unavailable)} />
          <Metric label={copy.labels.acceptedCommitment} value={money(dictionary, model.acceptedCommitment, copy.unavailable)} />
          <Metric label={copy.labels.pendingCommitment} value={money(dictionary, model.pendingCommitment, copy.unavailable)} />
          <Metric label={copy.labels.openCommitment} value={money(dictionary, model.openCommitment, copy.unavailable)} />
          <Metric label={copy.labels.actualCost} value={money(dictionary, model.actualCost, copy.unavailable)} />
          <Metric label={copy.labels.paidCost} value={money(dictionary, model.paidCost, copy.unavailable)} />
          <Metric label={copy.labels.outstandingCost} value={money(dictionary, model.outstandingCost, copy.unavailable)} />
          <Metric label={copy.labels.etc} value={money(dictionary, model.etc, copy.unavailable)} />
          <Metric label={copy.labels.eac} value={money(dictionary, model.eac, copy.unavailable)} />
          <Metric label={copy.labels.netApprovedCommercialValue} value={money(dictionary, model.netApprovedCommercialValue, copy.unavailable)} />
          <Metric label={copy.labels.forecastMargin} value={money(dictionary, model.forecastMargin, copy.unavailable)} accent />
        </dl>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <form action={budgetAction} className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
          <h2 className="font-semibold text-primary">{copy.forms.budgetTitle}</h2>
          <div className="mt-4 grid gap-3">
            <input type="hidden" name="requestId" value={crypto.randomUUID()} />
            <Input name="baseBudgetAmount" label={copy.forms.baseBudget} inputMode="decimal" />
            <Input name="contingencyAmount" label={copy.forms.contingency} inputMode="decimal" defaultValue="0.00" />
            <Input name="reason" label={copy.forms.reason} />
            <Input name="notes" label={copy.forms.notes} />
            <Input name="sourceReference" label={copy.forms.sourceReference} />
            <button type="submit" className="mt-1 min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container">{copy.forms.saveBudget}</button>
          </div>
        </form>
        <form action={etcAction} className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
          <h2 className="font-semibold text-primary">{copy.forms.etcTitle}</h2>
          <div className="mt-4 grid gap-3">
            <input type="hidden" name="requestId" value={crypto.randomUUID()} />
            <Input name="etcAmount" label={copy.forms.etcAmount} inputMode="decimal" />
            <Input name="forecastDate" label={copy.forms.forecastDate} type="date" defaultValue={model.asOfDate} />
            <Input name="reason" label={copy.forms.reason} />
            <Input name="notes" label={copy.forms.notes} />
            <button type="submit" className="mt-1 min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container">{copy.forms.saveEtc}</button>
          </div>
        </form>
      </section>

      <DrillSection title={copy.drill.budgetVersions} locale={dictionary.locale} rows={model.drill.budgetVersions.map((row) => ({ label: `${copy.forms.version} ${row.version}`, value: money(dictionary, row.approvedBudgetCost, copy.unavailable) }))} />
      <DrillSection title={copy.drill.commitments} locale={dictionary.locale} rows={model.drill.commitments.map((row) => ({ label: row.id, value: money(dictionary, row.authorizedAmount, copy.unavailable), labelDirection: "ltr" as const }))} />
      <DrillSection title={copy.drill.supplierBills} locale={dictionary.locale} rows={model.drill.supplierBills.map((row) => ({ label: row.billNumber, value: money(dictionary, row.totalAmount, copy.unavailable), labelDirection: "ltr" as const }))} />
      <DrillSection title={copy.drill.eventExpenses} locale={dictionary.locale} rows={model.drill.eventExpenses.map((row) => ({ label: row.expenseNumber, value: money(dictionary, row.amount, copy.unavailable), labelDirection: "ltr" as const }))} />
      <DrillSection title={copy.drill.supplierPayments} locale={dictionary.locale} rows={model.drill.supplierPayments.map((row) => ({ label: row.paymentNumber, value: money(dictionary, row.amount, copy.unavailable), labelDirection: "ltr" as const }))} />
      <DrillSection title={copy.drill.advanceAllocations} locale={dictionary.locale} rows={model.drill.advanceAllocations.map((row) => ({ label: row.allocationNumber, value: money(dictionary, row.amount, copy.unavailable), labelDirection: "ltr" as const }))} />
      <DrillSection title={copy.drill.etcVersions} locale={dictionary.locale} rows={model.drill.etcVersions.map((row) => ({ label: `${copy.forms.version} ${row.version}`, value: money(dictionary, row.etcAmount, copy.unavailable) }))} />
      <p className="text-xs text-on-surface-variant">{copy.boundedDisclosure} {formatUiNumber(dictionary.locale, model.sourceCounts.supplierBillsApproved + model.sourceCounts.eventExpensesApproved)}.</p>
    </div>
  );
}

function money(dictionary: ServicesDictionary, value: number | null, unavailable: string) {
  return value == null ? unavailable : formatSarAmount(dictionary.locale, value, { isolate: true });
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-on-surface-variant">{label}</dt>
      <dd dir="ltr" className={`mt-1 break-words font-mono text-sm font-semibold tabular-nums ${accent ? "text-primary" : "text-on-surface"}`}>{value}</dd>
    </div>
  );
}

function Input({ name, label, type = "text", inputMode, defaultValue }: { name: string; label: string; type?: "text" | "date"; inputMode?: "decimal"; defaultValue?: string }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-on-surface">
      <span>{label}</span>
      <input name={name} type={type} inputMode={inputMode} defaultValue={defaultValue} required={name !== "notes" && name !== "sourceReference"} className="min-h-10 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}

function DrillSection({ title, rows, locale }: {
  title: string;
  rows: Array<{ label: string; value: string; labelDirection?: "ltr" | "rtl" }>;
  locale: ServicesDictionary["locale"];
}) {
  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
      <h2 className="font-semibold text-primary">{title}</h2>
      {rows.length === 0 ? <p className="mt-3 text-sm text-on-surface-variant">—</p> : (
        <ul className="mt-3 grid gap-2 text-sm text-on-surface-variant">
          {rows.map((row, index) => (
            <li key={`${index}-${row.label}`} className="rounded-lg border border-outline-variant/60 px-3 py-2">
              <div dir="ltr" className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span dir={row.labelDirection ?? (locale === "ar" ? "rtl" : "ltr")} className={`min-w-0 break-all ${row.labelDirection === "ltr" ? "font-mono" : ""}`}>
                  {row.labelDirection === "ltr" ? isolateLtrText(row.label) : row.label}
                </span>
                <span dir="ltr" className="shrink-0 whitespace-nowrap font-mono tabular-nums">{row.value}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
