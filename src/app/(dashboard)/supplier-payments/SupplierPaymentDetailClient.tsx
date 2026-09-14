"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { SupplierPaymentsDictionary } from "@/lib/i18n/dictionaries/supplier-payments";
import { createSupplierPaymentDocumentViewUrl, reverseSupplierPaymentAction } from "@/lib/supplier-payments/actions";
import type { SupplierPaymentDetail } from "@/lib/supplier-payments/types";

function requestId() {
  return globalThis.crypto.randomUUID();
}

function Info({ label, value, numeric = false, children }: { label: string; value?: string | null; numeric?: boolean; children?: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-[11px] font-semibold text-on-surface-variant">{label}</dt><dd className="mt-1 break-words text-[13px]">{children ?? (numeric ? <bdi dir="ltr">{value || "—"}</bdi> : <bdi dir="auto">{value || "—"}</bdi>)}</dd></div>;
}

export default function SupplierPaymentDetailClient({ payment, canReverse, dictionary }: { payment: SupplierPaymentDetail; canReverse: boolean; dictionary: SupplierPaymentsDictionary }) {
  const router = useRouter();
  const [isReverseOpen, setIsReverseOpen] = useState(false);
  const [reverseRequestId, setReverseRequestId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const locale = dictionary.locale;
  const isRtl = locale === "ar";
  const maskedIban = payment.iban_snapshot ? `••••${payment.iban_snapshot.slice(-4)}` : null;

  function reverse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get("reason");
    startTransition(async () => {
      const result = await reverseSupplierPaymentAction({ payment_id: payment.id, reason, request_id: reverseRequestId ?? requestId() });
      if (!result.success) {
        setMessage(dictionary.errors[result.errorCode ?? ""] ?? dictionary.errors.supplier_payment_reversal_failed);
        return;
      }
      setMessage(dictionary.notices.reversed);
      setIsReverseOpen(false);
      setReverseRequestId(null);
      router.refresh();
    });
  }

  function openReversal() {
    setReverseRequestId(requestId());
    setIsReverseOpen(true);
  }

  function closeReversal() {
    setReverseRequestId(null);
    setIsReverseOpen(false);
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5 pb-12" data-supplier-payment-detail="workspace">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><PendingLink href="/supplier-payments" pendingLabel={dictionary.backToList} className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-[12px] font-semibold text-primary hover:bg-surface-container-low hover:underline">{isRtl ? <ArrowRight size={16} aria-hidden="true" /> : <ArrowLeft size={16} aria-hidden="true" />}<span>{dictionary.backToList}</span></PendingLink><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-[26px] font-semibold text-primary"><bdi dir="ltr">{payment.payment_number}</bdi></h1><StatusBadge variant={payment.status === "reversed" ? "inactive" : "active"}>{dictionary.statuses[payment.status]}</StatusBadge></div><p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-on-surface-variant"><bdi dir="auto">{payment.supplier_name}</bdi><span aria-hidden="true">·</span><bdi dir="ltr">{payment.bill_number}</bdi></p></div><div className="flex flex-wrap items-center gap-2">{canReverse && payment.status === "recorded" && <Button type="button" variant="secondary" onClick={isReverseOpen ? closeReversal : openReversal} aria-expanded={isReverseOpen}>{isReverseOpen ? dictionary.actions.cancel : dictionary.actions.reverse}</Button>}</div></div>

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4" aria-labelledby="supplier-payment-summary"><h2 id="supplier-payment-summary" className="text-[14px] font-semibold text-primary">{dictionary.title}</h2><dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4"><Info label={dictionary.fields.payable} value={formatSarAmount(locale, payment.bill_total)} numeric /><Info label={dictionary.fields.paid} value={formatSarAmount(locale, payment.bill_total - payment.outstanding_amount)} numeric /><Info label={dictionary.fields.outstanding} value={formatSarAmount(locale, payment.outstanding_amount)} numeric /><Info label={dictionary.fields.amount} value={formatSarAmount(locale, payment.amount)} numeric /></dl></section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2"><InfoSection title={dictionary.fields.bill}><Info label={dictionary.fields.bill} value={payment.bill_number} numeric /><Info label={dictionary.fields.supplier} value={payment.supplier_name} /><Info label={dictionary.fields.service} value={payment.service_number} numeric /></InfoSection><InfoSection title={dictionary.fields.status}><Info label={dictionary.fields.paymentDate}><UiDateText locale={locale} value={payment.payment_date} /></Info><Info label={dictionary.fields.method} value={dictionary.methods[payment.method]} /><Info label={dictionary.fields.reference} value={payment.reference} numeric /><Info label={dictionary.fields.recordedAt}><UiDateTimeText locale={locale} value={payment.recorded_at} /></Info></InfoSection></section>

      {payment.method === "bank_transfer" && <InfoSection title={dictionary.forms.bankDetailsNotice}><Info label={dictionary.fields.bankName} value={payment.bank_name_snapshot} /><Info label={dictionary.fields.accountName} value={payment.bank_account_name_snapshot} /><Info label={dictionary.fields.iban} value={maskedIban} numeric /></InfoSection>}

      {payment.notes && <InfoSection title={dictionary.fields.notes}><Info label={dictionary.fields.notes} value={payment.notes} /></InfoSection>}

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4" aria-labelledby="supplier-payment-evidence"><h2 id="supplier-payment-evidence" className="text-[14px] font-semibold text-primary">{dictionary.fields.evidence}</h2><ul className="mt-3 divide-y divide-surface-variant rounded-lg border border-surface-variant">{payment.documents.map((document) => <DocumentRow key={document.document_id} paymentId={payment.id} document={document} dictionary={dictionary} />)}{payment.documents.length === 0 && <li className="px-3 py-4 text-[12px] text-on-surface-variant">—</li>}</ul></section>

      {payment.status === "reversed" && <InfoSection title={dictionary.fields.reversalReason}><Info label={dictionary.fields.reversalReason} value={payment.reversal_reason} /><Info label={dictionary.fields.reversedAt}><UiDateTimeText locale={locale} value={payment.reversed_at} /></Info></InfoSection>}
      {isReverseOpen && <form onSubmit={reverse} className="rounded-xl border border-warning/40 bg-surface-container-lowest p-4"><label className="text-[12px] font-semibold">{dictionary.fields.reversalReason}<textarea className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px]" name="reason" rows={3} minLength={5} maxLength={2000} required disabled={isPending} /><span className="mt-1 block text-[11px] font-normal text-on-surface-variant">{dictionary.forms.reversalReason}</span></label><div className="mt-3 flex items-center gap-3"><Button type="submit" disabled={isPending}>{isPending ? "…" : dictionary.actions.confirmReverse}</Button><Button type="button" variant="secondary" onClick={closeReversal} disabled={isPending}>{dictionary.actions.cancel}</Button></div></form>}
      {message && <p role="status" className="text-[12px] text-on-surface-variant">{message}</p>}
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4"><h2 className="text-[13px] font-semibold text-primary">{title}</h2><dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</dl></section>;
}

function DocumentRow({ paymentId, document, dictionary }: { paymentId: string; document: SupplierPaymentDetail["documents"][number]; dictionary: SupplierPaymentsDictionary }) {
  const [href, setHref] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function open() {
    startTransition(async () => {
      const result = await createSupplierPaymentDocumentViewUrl({ paymentId, documentId: document.document_id });
      if (result.success) setHref(result.data?.signedUrl ?? null);
    });
  }
  return <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"><bdi dir="auto" className="min-w-0 truncate text-[13px]">{document.original_filename}</bdi>{href ? <a href={href} target="_blank" rel="noreferrer" className="shrink-0 text-[12px] font-semibold text-primary hover:underline">{dictionary.actions.openDocument}</a> : <button type="button" onClick={open} disabled={pending} className="shrink-0 text-[12px] font-semibold text-primary hover:underline disabled:opacity-60">{pending ? "…" : dictionary.actions.openDocument}</button>}</li>;
}
