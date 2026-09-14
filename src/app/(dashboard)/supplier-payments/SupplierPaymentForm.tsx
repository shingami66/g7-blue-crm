"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { SupplierPaymentsDictionary } from "@/lib/i18n/dictionaries/supplier-payments";
import { recordSupplierPaymentAction } from "@/lib/supplier-payments/actions";

function fieldClass() {
  return "mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
}

function requestId() {
  return globalThis.crypto.randomUUID();
}

export default function SupplierPaymentForm({
  supplierBillId,
  billNumber,
  supplierName,
  serviceNumber,
  currency,
  outstandingAmount,
  dictionary,
}: {
  supplierBillId: string;
  billNumber: string;
  supplierName: string;
  serviceNumber: string;
  currency: string;
  outstandingAmount: number;
  dictionary: SupplierPaymentsDictionary;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [request, setRequest] = useState(requestId);
  const [method, setMethod] = useState("bank_transfer");
  const firstFieldRef = useRef<HTMLInputElement>(null);
  useEffect(() => firstFieldRef.current?.focus(), []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("supplier_bill_id", supplierBillId);
    data.set("request_id", request);
    startTransition(async () => {
      const result = await recordSupplierPaymentAction(data);
      if (!result.success) {
        setMessage(dictionary.errors[result.errorCode ?? ""] ?? dictionary.errors.supplier_payment_record_failed);
        return;
      }
      setRequest(requestId());
      router.push(`/supplier-payments/${result.data?.payment_id}`);
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4" data-testid="supplier-payment-form">
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-surface-container-low p-3 text-[12px] sm:grid-cols-4"><div><span className="block text-on-surface-variant">{dictionary.fields.bill}</span><bdi dir="ltr" className="font-semibold">{billNumber}</bdi></div><div><span className="block text-on-surface-variant">{dictionary.fields.supplier}</span><bdi dir="auto" className="font-semibold">{supplierName}</bdi></div><div><span className="block text-on-surface-variant">{dictionary.fields.service}</span><bdi dir="ltr" className="font-semibold">{serviceNumber}</bdi></div><div><span className="block text-on-surface-variant">{dictionary.fields.currency}</span><bdi dir="ltr" className="font-semibold">{currency}</bdi></div></div>
      <p className="mb-4 text-[12px] text-on-surface-variant">{dictionary.forms.approvedBillOnly} {dictionary.forms.bankDetailsNotice}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-[12px] font-semibold">{dictionary.fields.amount}<input ref={firstFieldRef} className={fieldClass()} name="amount" type="number" min="0.01" max={outstandingAmount} step="0.01" defaultValue={outstandingAmount.toFixed(2)} required disabled={isPending} /><span className="mt-1 block text-[11px] font-normal text-on-surface-variant">{dictionary.fields.outstanding}: <bdi dir="ltr">{formatSarAmount(dictionary.locale, outstandingAmount)}</bdi></span></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.paymentDate}<input className={fieldClass()} name="payment_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.method}<select className={fieldClass()} name="method" value={method} onChange={(event) => setMethod(event.target.value)} disabled={isPending}>{Object.entries(dictionary.methods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.reference}<input className={fieldClass()} name="reference" required={method !== "cash"} maxLength={200} disabled={isPending} /><span className="mt-1 block text-[11px] font-normal text-on-surface-variant">{dictionary.forms.referenceHelp}</span></label>
        <label className="text-[12px] font-semibold md:col-span-2">{dictionary.forms.paymentEvidence}<input className={fieldClass()} name="document" type="file" required accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" disabled={isPending} /><span className="mt-1 block text-[11px] font-normal text-on-surface-variant">{dictionary.forms.paymentEvidenceHelp}</span></label>
        <label className="text-[12px] font-semibold md:col-span-2">{dictionary.fields.notes}<textarea className={fieldClass()} name="notes" rows={3} maxLength={2000} disabled={isPending} /></label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="submit" disabled={isPending || outstandingAmount <= 0}>{isPending ? "…" : dictionary.actions.save}</Button><Button type="button" variant="secondary" onClick={() => router.push(`/supplier-bills/${supplierBillId}`)} disabled={isPending}>{dictionary.actions.cancel}</Button>{message && <span role="status" className="text-[12px] text-on-surface-variant">{message}</span>}</div>
    </form>
  );
}
