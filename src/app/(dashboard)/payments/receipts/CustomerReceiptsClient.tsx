"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import PageHeader from "@/components/ui/PageHeader";
import PaginationFooter from "@/components/ui/PaginationFooter";
import { UiDateText } from "@/components/i18n/UiDateText";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { CustomerReceiptsDictionary } from "@/lib/i18n/dictionaries/customer-receipts";
import {
  allocateCustomerReceiptAction,
  recordCustomerReceiptAction,
  reverseCustomerReceiptAction,
  reverseCustomerReceiptAllocationAction,
  searchCustomerOptionsAction,
  searchEligibleCustomerInvoicesAction,
} from "@/lib/customer-receipts/actions";
import type {
  CustomerReceiptMethod,
  CustomerReceiptWorkspaceData,
  CustomerReceiptWorkspaceQuery,
  EligibleCustomerInvoice,
} from "@/lib/customer-receipts/types";

type Props = {
  data: CustomerReceiptWorkspaceData;
  query: CustomerReceiptWorkspaceQuery;
  dictionary: CustomerReceiptsDictionary;
};

type RecordDraft = {
  customerId: string;
  amount: string;
  date: string;
  method: CustomerReceiptMethod;
  reference: string;
  notes: string;
};

function newRequestId() {
  return crypto.randomUUID();
}

function badgeClass(status: string) {
  if (status === "reversed") return "bg-error-container text-on-error-container";
  if (status === "fully_allocated") return "bg-primary-fixed text-on-primary-fixed-variant";
  if (status === "partially_allocated") return "bg-tertiary-fixed text-on-tertiary-fixed";
  return "bg-surface-variant text-on-surface";
}

export default function CustomerReceiptsClient({ data, query, dictionary }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedPaymentId, setSelectedPaymentId] = useState(data.receipts[0]?.paymentId ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState(query.search ?? "");
  const [customerOptions, setCustomerOptions] = useState(data.customers);
  const [customerSearch, setCustomerSearch] = useState("");
  const [recordDraft, setRecordDraft] = useState<RecordDraft>({
    customerId: data.customers[0]?.id ?? "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    method: "bank_transfer",
    reference: "",
    notes: "",
  });
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [eligibleInvoices, setEligibleInvoices] = useState<EligibleCustomerInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  const selectedReceipt = useMemo(
    () => data.receipts.find((receipt) => receipt.paymentId === selectedPaymentId) ?? data.receipts[0] ?? null,
    [data.receipts, selectedPaymentId],
  );

  function refreshWithNotice(message: string) {
    setNotice(message);
    router.refresh();
  }

  function pageHref(page: number, pageSize = query.pageSize, rawSearch = search) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (pageSize !== 10) params.set("pageSize", String(pageSize));
    if (rawSearch.trim()) params.set("search", rawSearch.trim());
    const encoded = params.toString();
    return encoded ? `/payments/receipts?${encoded}` : "/payments/receipts";
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(pageHref(1));
  }

  function searchCustomers() {
    startTransition(async () => {
      const result = await searchCustomerOptionsAction({ search: customerSearch });
      if (!result.success) {
        setNotice(dictionary.states.failed);
        return;
      }
      const nextCustomers = result.customers ?? [];
      setCustomerOptions(nextCustomers);
      setRecordDraft((current) => ({ ...current, customerId: nextCustomers[0]?.id ?? "" }));
    });
  }

  function recordReceipt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await recordCustomerReceiptAction({ ...recordDraft, requestId: newRequestId() });
      if (!result.success) {
        setNotice(dictionary.states.failed);
        return;
      }
      setRecordDraft((current) => ({ ...current, amount: "", reference: "", notes: "" }));
      refreshWithNotice(dictionary.states.success);
    });
  }

  function searchInvoices(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedReceipt) return;
    startTransition(async () => {
      const result = await searchEligibleCustomerInvoicesAction({
        customerId: selectedReceipt.customerId,
        search: invoiceSearch,
      });
      if (!result.success) {
        setNotice(dictionary.states.failed);
        return;
      }
      setEligibleInvoices(result.invoices ?? []);
      setSelectedInvoiceId(result.invoices?.[0]?.invoiceId ?? "");
      setAllocationAmount("");
    });
  }

  function allocateReceipt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedReceipt || !selectedInvoiceId) return;
    startTransition(async () => {
      const result = await allocateCustomerReceiptAction({
        paymentId: selectedReceipt.paymentId,
        invoiceId: selectedInvoiceId,
        amount: allocationAmount,
        requestId: newRequestId(),
      });
      if (!result.success) {
        setNotice(dictionary.states.failed);
        return;
      }
      setAllocationAmount("");
      refreshWithNotice(dictionary.states.success);
    });
  }

  function reverseAllocation(allocationId: string) {
    startTransition(async () => {
      const result = await reverseCustomerReceiptAllocationAction({
        allocationId,
        reason: correctionReason || "Customer receipt allocation correction",
        requestId: newRequestId(),
      });
      if (!result.success) {
        setNotice(dictionary.states.failed);
        return;
      }
      refreshWithNotice(dictionary.states.success);
    });
  }

  function reverseReceipt() {
    if (!selectedReceipt) return;
    startTransition(async () => {
      const result = await reverseCustomerReceiptAction({
        paymentId: selectedReceipt.paymentId,
        reason: correctionReason || "Customer receipt correction",
        requestId: newRequestId(),
      });
      if (!result.success) {
        setNotice(dictionary.states.failed);
        return;
      }
      refreshWithNotice(dictionary.states.success);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={dictionary.title} subtitle={dictionary.subtitle}>
        <Link
          href="/payments"
          className="rounded-lg border border-outline-variant px-3 py-2 text-[13px] font-semibold text-on-surface hover:bg-surface-container-low"
        >
          {dictionary.backToPayments}
        </Link>
      </PageHeader>

      {notice && (
        <div className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-3 text-[13px] text-on-surface">
          {notice}
        </div>
      )}

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4 md:p-5">
        <h2 className="text-[17px] font-semibold text-on-surface">{dictionary.recordTitle}</h2>
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={recordReceipt}>
          <label className="text-[12px] text-on-surface-variant">
            {dictionary.fields.customer}
            <div className="mt-1 flex gap-2">
              <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder={dictionary.fields.customerSearch} className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface" />
              <button type="button" onClick={searchCustomers} disabled={isPending} className="rounded-lg border border-outline-variant px-3 py-2 text-[12px] font-semibold text-on-surface disabled:opacity-50">{dictionary.actions.search}</button>
            </div>
            <select
              required
              value={recordDraft.customerId}
              onChange={(event) => setRecordDraft((current) => ({ ...current, customerId: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface"
            >
              <option value="">—</option>
              {customerOptions.map((customer) => <option key={customer.id} value={customer.id}>{customer.label}</option>)}
            </select>
          </label>
          <label className="text-[12px] text-on-surface-variant">
            {dictionary.fields.amount}
            <input required inputMode="decimal" value={recordDraft.amount} onChange={(event) => setRecordDraft((current) => ({ ...current, amount: event.target.value }))} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface" dir="ltr" />
          </label>
          <label className="text-[12px] text-on-surface-variant">
            {dictionary.fields.date}
            <input required type="date" value={recordDraft.date} onChange={(event) => setRecordDraft((current) => ({ ...current, date: event.target.value }))} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface" dir="ltr" />
          </label>
          <label className="text-[12px] text-on-surface-variant">
            {dictionary.fields.method}
            <select value={recordDraft.method} onChange={(event) => setRecordDraft((current) => ({ ...current, method: event.target.value as CustomerReceiptMethod }))} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface">
              {(Object.keys(dictionary.methods) as CustomerReceiptMethod[]).map((method) => <option key={method} value={method}>{dictionary.methods[method]}</option>)}
            </select>
          </label>
          <label className="text-[12px] text-on-surface-variant">
            {dictionary.fields.reference}
            <input value={recordDraft.reference} onChange={(event) => setRecordDraft((current) => ({ ...current, reference: event.target.value }))} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface" />
          </label>
          <label className="text-[12px] text-on-surface-variant">
            {dictionary.fields.notes}
            <input value={recordDraft.notes} onChange={(event) => setRecordDraft((current) => ({ ...current, notes: event.target.value }))} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface" />
          </label>
          <div className="md:col-span-3">
            <button type="submit" disabled={isPending || !recordDraft.customerId} className="rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60">
              {dictionary.actions.record}
            </button>
          </div>
        </form>
      </section>

      <section className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
          <form onSubmit={submitSearch} className="flex flex-wrap gap-2 border-b border-surface-variant p-4">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={dictionary.fields.reference} className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface" />
            <button type="submit" disabled={isPending} className="rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-on-primary disabled:opacity-60">{dictionary.actions.search}</button>
          </form>
          <div className="divide-y divide-surface-variant">
            {data.receipts.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-on-surface-variant">{dictionary.states.empty}</div>
            ) : data.receipts.map((receipt) => (
              <button key={receipt.paymentId} type="button" onClick={() => { setSelectedPaymentId(receipt.paymentId); setEligibleInvoices([]); setSelectedInvoiceId(""); }} className={`block w-full p-4 text-start hover:bg-surface-container-low ${selectedPaymentId === receipt.paymentId ? "bg-surface-container-low" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-[13px] font-semibold text-primary" dir="ltr">{isolateBidiText(receipt.paymentNumber)}</div>
                    <div className="mt-1 text-[13px] font-medium text-on-surface" dir="auto">{receipt.customerName}</div>
                    <div className="mt-1 text-[12px] text-on-surface-variant"><UiDateText locale={dictionary.locale} value={receipt.date} /> · {dictionary.methods[receipt.method]}</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass(receipt.receiptStatus)}`}>{dictionary.statuses[receipt.receiptStatus] ?? receipt.receiptStatus}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[12px] text-on-surface-variant">
                  <span>{formatSarAmount(dictionary.locale, receipt.amount)}</span>
                  <span>{dictionary.fields.allocated}: {formatSarAmount(dictionary.locale, receipt.allocatedAmount)}</span>
                  <span>{dictionary.fields.unapplied}: {formatSarAmount(dictionary.locale, receipt.unappliedAmount)}</span>
                </div>
              </button>
            ))}
          </div>
          <PaginationFooter currentPage={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} pageSize={data.pagination.pageSize} paginationMode="bounded" isPending={isPending} onPageChange={(page) => router.push(pageHref(page))} onPageSizeChange={(pageSize) => router.push(pageHref(1, pageSize))} />
        </div>

        <div className="min-w-0 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 md:p-5">
          {!selectedReceipt ? (
            <p className="text-[13px] text-on-surface-variant">{dictionary.states.selectReceipt}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-mono text-[15px] font-semibold text-primary" dir="ltr">{isolateBidiText(selectedReceipt.paymentNumber)}</h2>
                  <p className="mt-1 text-[13px] text-on-surface" dir="auto">{selectedReceipt.customerName}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClass(selectedReceipt.receiptStatus)}`}>{dictionary.statuses[selectedReceipt.receiptStatus] ?? selectedReceipt.receiptStatus}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] text-on-surface-variant">
                <div>{dictionary.fields.amount}: <strong className="text-on-surface" dir="ltr">{formatSarAmount(dictionary.locale, selectedReceipt.amount)}</strong></div>
                <div>{dictionary.fields.unapplied}: <strong className="text-on-surface" dir="ltr">{formatSarAmount(dictionary.locale, selectedReceipt.unappliedAmount)}</strong></div>
              </div>

              <div className="mt-5 border-t border-outline-variant pt-4">
                <h3 className="text-[14px] font-semibold text-on-surface">{dictionary.allocationTitle}</h3>
                <div className="mt-3 space-y-2">
                  {selectedReceipt.allocations.length === 0 ? <p className="text-[12px] text-on-surface-variant">{dictionary.states.noInvoices}</p> : selectedReceipt.allocations.map((allocation) => (
                    <div key={allocation.id} className="rounded-lg border border-outline-variant p-3">
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="font-mono text-primary" dir="ltr">{isolateBidiText(allocation.invoiceNumber ?? allocation.invoiceId)}</span>
                        <span className={allocation.reversed ? "text-on-surface-variant" : "font-semibold text-on-surface"}>{formatSarAmount(dictionary.locale, allocation.amount)}</span>
                      </div>
                      {!allocation.reversed && <button type="button" disabled={isPending} onClick={() => reverseAllocation(allocation.id)} className="mt-2 text-[12px] font-semibold text-error underline disabled:opacity-50">{dictionary.actions.reverseAllocation}</button>}
                      {allocation.reversed && <span className="mt-2 block text-[11px] text-on-surface-variant">{dictionary.statuses.reversed}</span>}
                    </div>
                  ))}
                </div>
                <form onSubmit={searchInvoices} className="mt-4 flex gap-2">
                  <input value={invoiceSearch} onChange={(event) => setInvoiceSearch(event.target.value)} placeholder={dictionary.fields.invoiceSearch} className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[12px] text-on-surface" />
                  <button type="submit" disabled={isPending} className="rounded-lg border border-outline-variant px-3 py-2 text-[12px] font-semibold text-on-surface disabled:opacity-50">{dictionary.actions.searchInvoices}</button>
                </form>
                {eligibleInvoices.length > 0 && <form onSubmit={allocateReceipt} className="mt-3 space-y-2 rounded-lg bg-surface-container-low p-3">
                  <select value={selectedInvoiceId} onChange={(event) => setSelectedInvoiceId(event.target.value)} className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[12px] text-on-surface" dir="ltr">
                    {eligibleInvoices.map((invoice) => <option key={invoice.invoiceId} value={invoice.invoiceId}>{invoice.invoiceNumber} · {formatSarAmount(dictionary.locale, invoice.outstandingAmount)}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input required inputMode="decimal" value={allocationAmount} onChange={(event) => setAllocationAmount(event.target.value)} placeholder={dictionary.fields.amount} className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[12px] text-on-surface" dir="ltr" />
                    <button type="submit" disabled={isPending || !selectedInvoiceId} className="rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-on-primary disabled:opacity-50">{dictionary.actions.allocate}</button>
                  </div>
                </form>}
              </div>

              <div className="mt-5 border-t border-outline-variant pt-4">
                <label className="text-[12px] text-on-surface-variant">
                  {dictionary.fields.reason}
                  <input value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[12px] text-on-surface" />
                </label>
                {selectedReceipt.receiptStatus === "unapplied" ? (
                  <button type="button" disabled={isPending} onClick={reverseReceipt} className="mt-3 rounded-lg border border-error px-3 py-2 text-[12px] font-semibold text-error disabled:opacity-50">{dictionary.actions.reverseReceipt}</button>
                ) : selectedReceipt.receiptStatus !== "reversed" ? (
                  <p className="mt-3 text-[12px] text-on-surface-variant">{dictionary.states.activeAllocationsBlockReversal}</p>
                ) : null}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
