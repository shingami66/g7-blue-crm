"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { createSupplierBillAction, updateSupplierBillAction } from "@/lib/supplier-bills/actions";
import { isolateBidiText, isolateLtrText } from "@/lib/i18n/bidi";
import type { SupplierBillsDictionary } from "@/lib/i18n/dictionaries/supplier-bills";
import type { SupplierBillDetail, SupplierBillFormOptions } from "@/lib/supplier-bills/types";

function fieldClass() {
  return "mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
}

function requestId() {
  return globalThis.crypto.randomUUID();
}

export default function SupplierBillForm({
  options,
  dictionary,
  bill,
  autoFocus = false,
  onCancel,
}: {
  options: SupplierBillFormOptions;
  dictionary: SupplierBillsDictionary;
  bill?: SupplierBillDetail;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(bill?.service_id ?? "");
  const [supplierId, setSupplierId] = useState(bill?.supplier_id ?? "");
  const [commitmentId, setCommitmentId] = useState(bill?.commitment_id ?? "");
  const [receiptId, setReceiptId] = useState(bill?.service_receipt_id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [request, setRequest] = useState(requestId);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const filteredCommitments = useMemo(() => options.commitments.filter((item) => item.serviceId === serviceId && item.supplierId === supplierId), [options.commitments, serviceId, supplierId]);
  const filteredReceipts = useMemo(() => options.receipts.filter((item) => item.commitmentId === commitmentId && item.serviceId === serviceId && item.supplierId === supplierId), [options.receipts, commitmentId, serviceId, supplierId]);
  const initial = bill;

  useEffect(() => {
    if (autoFocus) firstFieldRef.current?.focus();
  }, [autoFocus]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("request_id", request);
    startTransition(async () => {
      const result = bill ? await updateSupplierBillAction(data) : await createSupplierBillAction(data);
      if (!result.success) {
        setMessage(dictionary.errors[result.errorCode ?? ""] ?? dictionary.errors.supplier_bill_record_failed);
        return;
      }
      const warningCode = result.data && "warning_code" in result.data ? result.data.warning_code : undefined;
      if (warningCode) {
        setMessage(dictionary.notices.attachmentWarning);
      } else {
        setMessage(dictionary.notices.saved);
      }
      setRequest(requestId());
      if (result.data?.bill_id) router.push(`/supplier-bills/${result.data.bill_id}`);
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4" data-testid="supplier-bill-form">
      <p className="mb-4 text-[12px] text-on-surface-variant">{dictionary.forms.eventOnlyNotice}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-[12px] font-semibold">{dictionary.fields.supplier}
          <select ref={firstFieldRef} className={fieldClass()} name="supplier_id" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setCommitmentId(""); setReceiptId(""); }} required disabled={isPending}>
            <option value="">{dictionary.forms.selectSupplier}</option>
            {options.suppliers.map((option) => <option key={option.id} value={option.id}>{isolateBidiText(option.name)}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-semibold">{dictionary.fields.service}
          <select className={fieldClass()} name="service_id" value={serviceId} onChange={(event) => { setServiceId(event.target.value); setCommitmentId(""); setReceiptId(""); }} required disabled={isPending}>
            <option value="">{dictionary.forms.selectService}</option>
            {options.services.map((option) => <option key={option.id} value={option.id}>{isolateLtrText(option.serviceNumber)} — {isolateBidiText(option.eventName || option.serviceTitle)}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-semibold">{dictionary.fields.commitment}
          <select className={fieldClass()} name="commitment_id" value={commitmentId} onChange={(event) => { setCommitmentId(event.target.value); setReceiptId(""); }} required disabled={isPending || !serviceId || !supplierId}>
            <option value="">{dictionary.forms.selectCommitment}</option>
            {filteredCommitments.map((option) => <option key={option.id} value={option.id}>{isolateLtrText(option.currency)} · {isolateLtrText(option.authorizedAmount.toFixed(2))} {dictionary.fields.commitment}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-semibold">{dictionary.fields.receipt}
          <select className={fieldClass()} name="service_receipt_id" value={receiptId} onChange={(event) => setReceiptId(event.target.value)} required disabled={isPending || !commitmentId}>
            <option value="">{dictionary.forms.selectReceipt}</option>
            {filteredReceipts.map((option) => <option key={option.id} value={option.id}>{isolateLtrText(option.performanceDate)} · {dictionary.acceptanceStatuses[option.acceptanceStatus] ?? "—"} · {option.receivedAmount == null ? "—" : isolateLtrText(option.receivedAmount.toFixed(2))}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-semibold">{dictionary.fields.invoiceNumber}<input className={fieldClass()} name="invoice_number" defaultValue={initial?.invoice_number ?? ""} required maxLength={200} disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.currency}<input className={fieldClass()} name="currency" defaultValue={initial?.currency ?? "SAR"} maxLength={3} required disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.invoiceDate}<input className={fieldClass()} name="invoice_date" type="date" defaultValue={initial?.invoice_date ?? ""} required disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.dueDate}<input className={fieldClass()} name="due_date" type="date" defaultValue={initial?.due_date ?? ""} disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.subtotal}<input className={fieldClass()} name="subtotal" type="number" min="0" step="0.01" defaultValue={initial?.subtotal ?? ""} required disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.vat}<input className={fieldClass()} name="vat_amount" type="number" min="0" step="0.01" defaultValue={initial?.vat_amount ?? "0"} required disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.total}<input className={fieldClass()} name="total_amount" type="number" min="0.01" step="0.01" defaultValue={initial?.total_amount ?? ""} required disabled={isPending} /></label>
        {!bill && <label className="text-[12px] font-semibold">{dictionary.forms.invoiceFile}<input className={fieldClass()} name="invoice" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" disabled={isPending} /><span className="mt-1 block text-[11px] font-normal text-on-surface-variant">{dictionary.forms.invoiceFileHelp}</span></label>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>{isPending ? "…" : bill ? dictionary.actions.saveChanges : dictionary.actions.save}</Button>
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>{dictionary.actions.closeEdit}</Button>}
        {message && <span role="status" className="text-[12px] text-on-surface-variant">{message}</span>}
      </div>
      <input type="hidden" name="request_id" value={request} readOnly />
      {bill && <input type="hidden" name="bill_id" value={bill.id} readOnly />}
    </form>
  );
}
