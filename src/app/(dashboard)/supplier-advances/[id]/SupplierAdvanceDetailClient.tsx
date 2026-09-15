"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, RotateCcw } from "lucide-react";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatSupplierAdvanceAmount } from "@/lib/supplier-advances/formatting";
import {
  allocateSupplierAdvanceAction,
  correctSupplierAdvanceAllocationAction,
  createSupplierAdvanceEvidenceUrl,
  recordSupplierAdvancePaymentAction,
  refundSupplierAdvanceAction,
  reverseSupplierAdvancePaymentAction,
} from "@/lib/supplier-advances/actions";
import type { SupplierAdvancesDictionary } from "@/lib/i18n/dictionaries/supplier-advances";
import type { SupplierAdvanceBillOption, SupplierAdvanceDetail, SupplierAdvanceDocument } from "@/lib/supplier-advances/types";

type Panel = "payment" | "allocation" | "refund" | `reverse:${string}` | `correct:${string}`;
type Method = "bank_transfer" | "cash" | "cheque";

export default function SupplierAdvanceDetailClient({
  advance,
  eligibleBills,
  canPay,
  canAllocate,
  canRefund,
  canReverse,
  canCorrect,
  dictionary,
}: {
  advance: SupplierAdvanceDetail;
  eligibleBills: SupplierAdvanceBillOption[];
  canPay: boolean;
  canAllocate: boolean;
  canRefund: boolean;
  canReverse: boolean;
  canCorrect: boolean;
  dictionary: SupplierAdvancesDictionary;
}) {
  const router = useRouter();
  const locale = dictionary.locale;
  const isRtl = locale === "ar";
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [requestId, setRequestId] = useState("");
  const [activeError, setActiveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("bank_transfer");
  const [pending, startTransition] = useTransition();
  const firstField = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activePanel) firstField.current?.focus();
  }, [activePanel]);

  function openPanel(panel: Panel) {
    setNotice(null);
    setActiveError(null);
    setRequestId(globalThis.crypto.randomUUID());
    setActivePanel((current) => current === panel ? null : panel);
  }

  function closePanel() {
    setActivePanel(null);
    setRequestId("");
    setActiveError(null);
  }

  function submitForm(event: FormEvent<HTMLFormElement>, action: (data: FormData) => Promise<{ success: boolean; errorCode?: string }>, successNotice: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setActiveError(null);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.success) {
        setActiveError(result.errorCode ?? "supplier_advance_request_invalid");
        return;
      }
      setNotice(successNotice);
      closePanel();
      router.refresh();
    });
  }

  function submitInput(action: (input: unknown) => Promise<{ success: boolean; errorCode?: string }>, input: unknown, successNotice: string) {
    setActiveError(null);
    startTransition(async () => {
      const result = await action(input);
      if (!result.success) {
        setActiveError(result.errorCode ?? "supplier_advance_request_invalid");
        return;
      }
      setNotice(successNotice);
      closePanel();
      router.refresh();
    });
  }

  async function openDocument(kind: "authorization" | "payment" | "refund", eventId: string, documentId: string) {
    const result = await createSupplierAdvanceEvidenceUrl({ kind, eventId, documentId });
    if (!result.success || !result.data?.signedUrl) {
      setActiveError(result.errorCode ?? "supplier_advance_document_failed");
      return;
    }
    window.location.assign(result.data.signedUrl);
  }

  const amount = (value: number) => <bdi dir="ltr" className="tabular-nums">{formatSupplierAdvanceAmount(advance.currency, value)}</bdi>;
  const visibleError = activeError ? dictionary.errors[activeError] ?? dictionary.errors.supplier_advance_request_invalid : null;
  const sourceLabel = dictionary.sources[advance.commitment_source] ?? dictionary.sources.other_authorized;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5 pb-12" data-testid="supplier-advance-detail">
      <header className="flex min-w-0 flex-col gap-3">
        <PendingLink href="/supplier-advances" pendingLabel={dictionary.backToList} className="inline-flex w-fit items-center gap-2 rounded-md px-2 py-1 text-[12px] font-semibold text-primary hover:bg-surface-container-low hover:underline">
          {isRtl ? <ArrowRight size={16} aria-hidden="true" /> : <ArrowLeft size={16} aria-hidden="true" />}<span>{dictionary.backToList}</span>
        </PendingLink>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold text-primary"><bdi dir="ltr">{advance.advance_number}</bdi></h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-on-surface-variant">
              <bdi dir="auto">{advance.supplier_name}</bdi>
              <span aria-hidden="true">·</span>
              <bdi dir="ltr">{advance.service_number}</bdi>
              <span dir="auto">{advance.service_title}</span>
            </div>
          </div>
          <StatusBadge variant={advance.status === "paid" ? "active" : "pending"}>{dictionary.statuses[advance.status]}</StatusBadge>
        </div>
      </header>

      <section aria-label={dictionary.title} className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="supplier-advance-financial-summary">
        <Metric label={dictionary.fields.authorized} value={amount(advance.authorized_amount)} primary />
        <Metric label={dictionary.fields.paid} value={amount(advance.paid_amount)} primary />
        <Metric label={dictionary.fields.allocated} value={amount(advance.allocated_amount)} primary />
        <Metric label={dictionary.fields.remaining} value={amount(advance.remaining_unallocated_amount)} primary />
      </section>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={dictionary.fields.refunded}>
        <Metric label={dictionary.fields.refunded} value={amount(advance.refunded_amount)} />
        <Metric label={dictionary.fields.reversed} value={amount(advance.reversed_amount)} />
        <Metric label={dictionary.fields.commitmentOpen} value={amount(advance.commitment_open_amount)} />
        <Metric label={dictionary.fields.reserved} value={amount(advance.commitment_reserved_amount)} />
      </section>

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:p-5" aria-labelledby="supplier-advance-context-heading">
        <h2 id="supplier-advance-context-heading" className="text-[15px] font-semibold text-primary">{dictionary.fields.commitment}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-[12px] sm:grid-cols-2 lg:grid-cols-3">
          <DetailValue label={dictionary.fields.supplier}><bdi dir="auto">{advance.supplier_name}</bdi></DetailValue>
          <DetailValue label={dictionary.fields.service}><div className="flex min-w-0 flex-col gap-1"><bdi dir="ltr">{advance.service_number}</bdi><span dir="auto" className="break-words">{advance.service_title}</span></div></DetailValue>
          <DetailValue label={dictionary.fields.source}>{sourceLabel}</DetailValue>
          {advance.commitment_reference && <DetailValue label={dictionary.fields.reference}><bdi dir="auto">{advance.commitment_reference}</bdi></DetailValue>}
          <DetailValue label={dictionary.fields.authorizedAmount}>{amount(advance.commitment_authorized_amount)}</DetailValue>
          <DetailValue label={dictionary.fields.commitmentOpen}>{amount(advance.commitment_open_amount)}</DetailValue>
          <DetailValue label={dictionary.fields.reserved}>{amount(advance.commitment_reserved_amount)}</DetailValue>
          <DetailValue label={dictionary.fields.availableCapacity}>{amount(advance.commitment_available_authorization_amount)}</DetailValue>
        </dl>
      </section>

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:p-5" aria-labelledby="supplier-advance-authorization-heading">
        <h2 id="supplier-advance-authorization-heading" className="text-[15px] font-semibold text-primary">{dictionary.fields.authorizationAudit}</h2>
        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-[12px] sm:grid-cols-3">
          <DetailValue label={dictionary.fields.authorizedAmount}>{amount(advance.authorized_amount)}</DetailValue>
          <DetailValue label={dictionary.fields.authorizedBy}><bdi dir="auto">{advance.authorized_by_name}</bdi></DetailValue>
          <DetailValue label={dictionary.fields.authorizedAt}><UiDateTimeText locale={locale} value={advance.authorized_at} /></DetailValue>
          <DetailValue label={dictionary.fields.reason}><span dir="auto" className="whitespace-pre-wrap">{advance.reason}</span></DetailValue>
        </dl>
        {advance.documents.length > 0 && <DocumentLinks documents={advance.documents} label={dictionary.fields.evidence} onOpen={(doc) => openDocument("authorization", advance.supplier_advance_id, doc.document_id)} dictionary={dictionary} />}
      </section>

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:p-5" aria-labelledby="supplier-advance-actions-heading">
        <h2 id="supplier-advance-actions-heading" className="text-[15px] font-semibold text-primary">{dictionary.actions.confirm}</h2>
        <div className="mt-3 flex flex-wrap gap-2" role="toolbar" aria-label={dictionary.actions.confirm}>
          {canPay && advance.authorized_amount > advance.paid_amount && <ActionButton selected={activePanel === "payment"} expanded={activePanel === "payment"} onClick={() => openPanel("payment")}>{dictionary.actions.recordPayment}</ActionButton>}
          {canAllocate && advance.remaining_unallocated_amount > 0 && eligibleBills.length > 0 && <ActionButton selected={activePanel === "allocation"} expanded={activePanel === "allocation"} onClick={() => openPanel("allocation")}>{dictionary.actions.allocate}</ActionButton>}
          {canRefund && advance.remaining_unallocated_amount > 0 && <ActionButton selected={activePanel === "refund"} expanded={activePanel === "refund"} onClick={() => openPanel("refund")}>{dictionary.actions.refund}</ActionButton>}
        </div>
        {notice && <p role="status" className="mt-3 rounded-lg border border-success/30 bg-success-container/30 px-3 py-2 text-[12px] text-on-surface">{notice}</p>}
        {visibleError && <p role="alert" className="mt-3 rounded-lg border border-error/30 bg-error-container/30 px-3 py-2 text-[12px] text-error">{visibleError}</p>}
        {activePanel && <div className="mt-4 rounded-lg border border-surface-variant bg-surface-container-low p-3 sm:p-4" data-testid="supplier-advance-active-panel">
          {activePanel === "payment" && <form onSubmit={(event) => submitForm(event, recordSupplierAdvancePaymentAction, dictionary.notices.paid)} className="grid gap-3 sm:grid-cols-2">
            <h3 className="text-[14px] font-semibold text-primary sm:col-span-2">{dictionary.actions.recordPayment}</h3>
            <input type="hidden" name="advance_id" value={advance.supplier_advance_id} /><input type="hidden" name="request_id" value={requestId} />
            <Field label={dictionary.fields.paymentDate}><input ref={(element) => { firstField.current = element; }} name="payment_date" type="date" required className={inputClass} /></Field>
            <Field label={dictionary.fields.amount}><input name="amount" type="number" min="0.01" max={advance.authorized_amount - advance.paid_amount} step="0.01" required inputMode="decimal" className={`${inputClass} text-start`} /></Field>
            <Field label={dictionary.fields.method}><select name="method" value={method} onChange={(event) => setMethod(event.target.value as Method)} className={inputClass}><option value="bank_transfer">{dictionary.methods.bank_transfer}</option><option value="cash">{dictionary.methods.cash}</option><option value="cheque">{dictionary.methods.cheque}</option></select></Field>
            <Field label={dictionary.fields.reference}><input name="reference" type="text" maxLength={200} required={method !== "cash"} className={inputClass} /></Field>
            <p className="text-[11px] text-on-surface-variant sm:col-span-2">{dictionary.forms.bankDetailsNotice} {dictionary.forms.referenceHelp}</p>
            <Field label={dictionary.fields.notes}><textarea name="notes" rows={2} maxLength={2000} className={inputClass} /></Field>
            <Field label={dictionary.forms.paymentEvidence}><input name="document" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required className={inputClass} /></Field>
            <PanelButtons pending={pending} onCancel={closePanel} dictionary={dictionary} />
          </form>}
          {activePanel === "allocation" && <form onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            submitInput(allocateSupplierAdvanceAction, { advance_id: advance.supplier_advance_id, supplier_bill_id: form.get("supplier_bill_id"), amount: form.get("amount"), request_id: requestId }, dictionary.notices.allocated);
          }} className="grid gap-3 sm:grid-cols-2">
            <h3 className="text-[14px] font-semibold text-primary sm:col-span-2">{dictionary.actions.allocate}</h3>
            <input type="hidden" name="request_id" value={requestId} />
            <Field label={dictionary.fields.bill}><select ref={(element) => { firstField.current = element; }} name="supplier_bill_id" required defaultValue="" className={inputClass}><option value="" disabled>{dictionary.forms.selectBill}</option>{eligibleBills.map((bill) => <option key={bill.id} value={bill.id}>{isolateBidiText(`${bill.bill_number} · ${bill.invoice_number} · ${formatSupplierAdvanceAmount(bill.currency, bill.outstanding_amount)}`)}</option>)}</select></Field>
            <Field label={dictionary.fields.amount}><input name="amount" type="number" min="0.01" step="0.01" max={advance.remaining_unallocated_amount} required inputMode="decimal" className={`${inputClass} text-start`} /></Field>
            <PanelButtons pending={pending} onCancel={closePanel} dictionary={dictionary} />
          </form>}
          {activePanel === "refund" && <form onSubmit={(event) => submitForm(event, refundSupplierAdvanceAction, dictionary.notices.refunded)} className="grid gap-3 sm:grid-cols-2">
            <h3 className="text-[14px] font-semibold text-primary sm:col-span-2">{dictionary.actions.refund}</h3>
            <input type="hidden" name="advance_id" value={advance.supplier_advance_id} /><input type="hidden" name="request_id" value={requestId} />
            <Field label={dictionary.fields.refundDate}><input ref={(element) => { firstField.current = element; }} name="business_date" type="date" required className={inputClass} /></Field>
            <Field label={dictionary.fields.amount}><input name="amount" type="number" min="0.01" step="0.01" max={advance.remaining_unallocated_amount} required inputMode="decimal" className={`${inputClass} text-start`} /></Field>
            <Field label={dictionary.fields.reference}><input name="reference" type="text" maxLength={200} className={inputClass} /></Field>
            <Field label={dictionary.forms.refundReason}><textarea name="reason" rows={2} minLength={5} maxLength={2000} required className={inputClass} /></Field>
            <Field label={dictionary.forms.refundEvidence}><input name="document" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required className={inputClass} /></Field>
            <PanelButtons pending={pending} onCancel={closePanel} dictionary={dictionary} />
          </form>}
          {typeof activePanel === "string" && activePanel.startsWith("reverse:") && (() => {
            const paymentId = activePanel.slice("reverse:".length);
            const payment = advance.payments.find((item) => item.id === paymentId);
            if (!payment) return null;
            return <form onSubmit={(event) => {
              event.preventDefault(); const form = new FormData(event.currentTarget);
              submitInput(reverseSupplierAdvancePaymentAction, { event_id: payment.id, reason: form.get("reason"), request_id: requestId }, dictionary.notices.reversed);
            }} className="grid gap-3 sm:grid-cols-2">
              <h3 className="text-[14px] font-semibold text-primary sm:col-span-2">{dictionary.actions.reversePayment} <bdi dir="ltr">{payment.payment_number}</bdi></h3>
              <Field label={dictionary.forms.reversalReason}><textarea ref={(element) => { firstField.current = element; }} name="reason" rows={3} minLength={5} maxLength={2000} required className={inputClass} /></Field>
              <input type="hidden" name="request_id" value={requestId} />
              <PanelButtons pending={pending} onCancel={closePanel} dictionary={dictionary} />
            </form>;
          })()}
          {typeof activePanel === "string" && activePanel.startsWith("correct:") && (() => {
            const allocationId = activePanel.slice("correct:".length);
            const allocation = advance.allocations.find((item) => item.id === allocationId);
            if (!allocation) return null;
            return <form onSubmit={(event) => {
              event.preventDefault(); const form = new FormData(event.currentTarget);
              submitInput(correctSupplierAdvanceAllocationAction, { event_id: allocation.id, reason: form.get("reason"), request_id: requestId }, dictionary.notices.allocationCorrected);
            }} className="grid gap-3 sm:grid-cols-2">
              <h3 className="text-[14px] font-semibold text-primary sm:col-span-2">{dictionary.actions.correctAllocation} <bdi dir="ltr">{allocation.bill_number}</bdi></h3>
              <Field label={dictionary.forms.reversalReason}><textarea ref={(element) => { firstField.current = element; }} name="reason" rows={3} minLength={5} maxLength={2000} required className={inputClass} /></Field>
              <input type="hidden" name="request_id" value={requestId} />
              <PanelButtons pending={pending} onCancel={closePanel} dictionary={dictionary} />
            </form>;
          })()}
        </div>}
      </section>

      <HistorySection title={dictionary.fields.paymentHistory} empty={dictionary.fields.noActivity}>
        {advance.payments.map((payment) => <article key={payment.id} className="rounded-lg border border-surface-variant p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h3 className="text-[13px] font-semibold text-primary"><bdi dir="ltr">{payment.payment_number}</bdi></h3><p className="mt-1 text-[11px] text-on-surface-variant"><UiDateText locale={locale} value={payment.payment_date} /> · <UiDateTimeText locale={locale} value={payment.recorded_at} /></p></div>
            <div className="flex items-center gap-2"><StatusBadge variant={payment.reversal_reason ? "pending" : "active"}>{payment.reversal_reason ? dictionary.statuses.reversed : dictionary.statuses.recorded}</StatusBadge><bdi dir="ltr" className="text-[13px] font-semibold">{amount(payment.amount)}</bdi></div>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-3">
            <DetailValue label={dictionary.fields.method}>{dictionary.methods[payment.method]}</DetailValue>
            {payment.reference && <DetailValue label={dictionary.fields.reference}><bdi dir="ltr">{payment.reference}</bdi></DetailValue>}
            <DetailValue label={dictionary.fields.recordedBy}><bdi dir="auto">{payment.recorded_by_name}</bdi></DetailValue>
            {payment.notes && <DetailValue label={dictionary.fields.notes}><span dir="auto" className="whitespace-pre-wrap">{payment.notes}</span></DetailValue>}
          </dl>
          {payment.documents.length > 0 && <DocumentLinks documents={payment.documents} label={dictionary.fields.evidence} onOpen={(doc) => openDocument("payment", payment.id, doc.document_id)} dictionary={dictionary} />}
          {payment.reversal_reason && <div className="mt-3 rounded-md bg-surface-container-low p-3" data-testid="supplier-advance-payment-reversal-audit">
            <h4 className="text-[12px] font-semibold text-primary">{dictionary.fields.reversalAudit}</h4>
            <dl className="mt-2 grid gap-2 text-[11px] sm:grid-cols-3"><DetailValue label={dictionary.fields.reversalReason}><span dir="auto">{payment.reversal_reason}</span></DetailValue><DetailValue label={dictionary.fields.reversedAt}><UiDateTimeText locale={locale} value={payment.reversed_at ?? ""} /></DetailValue><DetailValue label={dictionary.fields.reversedBy}><bdi dir="auto">{payment.reversed_by_name}</bdi></DetailValue></dl>
          </div>}
          {canReverse && !payment.reversal_reason && advance.remaining_unallocated_amount >= payment.amount && <div className="mt-3"><ActionButton selected={activePanel === `reverse:${payment.id}`} expanded={activePanel === `reverse:${payment.id}`} onClick={() => openPanel(`reverse:${payment.id}`)} secondary icon={<RotateCcw size={14} aria-hidden="true" />}>{dictionary.actions.reversePayment}</ActionButton></div>}
        </article>)}
      </HistorySection>

      <HistorySection title={dictionary.fields.allocationHistory} empty={dictionary.fields.noActivity}>
        {advance.allocations.map((allocation) => <article key={allocation.id} className="rounded-lg border border-surface-variant p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><PendingLink href={`/supplier-bills/${allocation.bill_id}`} pendingLabel={dictionary.fields.bill} className="text-[13px] font-semibold text-primary hover:underline"><bdi dir="ltr">{allocation.bill_number}</bdi></PendingLink><p className="mt-1 text-[11px] text-on-surface-variant"><UiDateTimeText locale={locale} value={allocation.allocated_at} /></p></div><div className="flex items-center gap-2"><StatusBadge variant={allocation.correction_reason ? "pending" : "active"}>{allocation.correction_reason ? dictionary.statuses.corrected : dictionary.statuses.allocated}</StatusBadge><bdi dir="ltr" className="text-[13px] font-semibold">{amount(allocation.amount)}</bdi></div></div>
          <p className="mt-2 text-[11px] text-on-surface-variant">{dictionary.fields.recordedBy}: <bdi dir="auto">{allocation.allocated_by_name}</bdi></p>
          {allocation.correction_reason && <dl className="mt-3 grid gap-2 rounded-md bg-surface-container-low p-3 text-[11px] sm:grid-cols-3"><DetailValue label={dictionary.fields.reversalReason}><span dir="auto">{allocation.correction_reason}</span></DetailValue><DetailValue label={dictionary.fields.correctedAt}><UiDateTimeText locale={locale} value={allocation.corrected_at ?? ""} /></DetailValue><DetailValue label={dictionary.fields.correctedBy}><bdi dir="auto">{allocation.corrected_by_name}</bdi></DetailValue></dl>}
          {canCorrect && !allocation.correction_reason && <div className="mt-3"><ActionButton selected={activePanel === `correct:${allocation.id}`} expanded={activePanel === `correct:${allocation.id}`} onClick={() => openPanel(`correct:${allocation.id}`)} secondary icon={<RotateCcw size={14} aria-hidden="true" />}>{dictionary.actions.correctAllocation}</ActionButton></div>}
        </article>)}
      </HistorySection>

      <HistorySection title={dictionary.fields.refundHistory} empty={dictionary.fields.noActivity}>
        {advance.refunds.map((refund) => <article key={refund.id} className="rounded-lg border border-surface-variant p-3 sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-[13px] font-semibold text-primary"><bdi dir="ltr">{refund.refund_number}</bdi></h3><p className="mt-1 text-[11px] text-on-surface-variant"><UiDateText locale={locale} value={refund.business_date} /> · <UiDateTimeText locale={locale} value={refund.recorded_at} /></p></div><bdi dir="ltr" className="text-[13px] font-semibold">{amount(refund.amount)}</bdi></div>
          <dl className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3"><DetailValue label={dictionary.fields.reversalReason}><span dir="auto">{refund.reason}</span></DetailValue><DetailValue label={dictionary.fields.recordedBy}><bdi dir="auto">{refund.recorded_by_name}</bdi></DetailValue>{refund.reference && <DetailValue label={dictionary.fields.reference}><bdi dir="ltr">{refund.reference}</bdi></DetailValue>}</dl>
          {refund.documents.length > 0 && <DocumentLinks documents={refund.documents} label={dictionary.fields.evidence} onOpen={(doc) => openDocument("refund", refund.id, doc.document_id)} dictionary={dictionary} />}
        </article>)}
      </HistorySection>
    </div>
  );
}

const inputClass = "min-h-10 w-full rounded-lg border border-surface-variant bg-surface-container-lowest px-3 py-2 text-[12px] outline-none focus:border-primary";

function Metric({ label, value, primary = false }: { label: string; value: ReactNode; primary?: boolean }) {
  return <div className={`min-w-0 rounded-lg border border-surface-variant bg-surface-container-lowest px-3 py-3 ${primary ? "sm:px-4" : ""}`}>
    <p className="text-[11px] leading-4 text-on-surface-variant">{label}</p>
    <div className={`mt-1.5 break-words text-end font-semibold text-on-surface ${primary ? "text-[15px] sm:text-[17px]" : "text-[13px]"}`}>{value}</div>
  </div>;
}

function DetailValue({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-on-surface-variant">{label}</dt><dd className="mt-0.5 break-words font-medium text-on-surface">{children}</dd></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-on-surface"><span>{label}</span>{children}</label>;
}

function ActionButton({
  children, selected, expanded, onClick, secondary = false, icon,
}: {
  children: ReactNode; selected: boolean; expanded: boolean; onClick: () => void; secondary?: boolean; icon?: ReactNode;
}) {
  return <button type="button" aria-expanded={expanded} onClick={onClick} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selected ? "border-primary bg-primary/10 text-primary" : secondary ? "border-surface-variant bg-surface-container-lowest text-on-surface hover:border-primary/40 hover:text-primary" : "border-primary/20 bg-surface-container-lowest text-primary hover:bg-primary/5"}`}>
    {icon}{children}
  </button>;
}

function PanelButtons({ pending, onCancel, dictionary }: { pending: boolean; onCancel: () => void; dictionary: SupplierAdvancesDictionary }) {
  return <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
    <button type="submit" disabled={pending} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-4 py-2 text-[12px] font-semibold text-on-primary disabled:opacity-50">{pending ? dictionary.actions.confirm : dictionary.actions.save}</button>
    <button type="button" onClick={onCancel} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-surface-variant px-4 py-2 text-[12px] font-semibold text-on-surface hover:bg-surface-container-low">{dictionary.actions.cancel}</button>
  </div>;
}

function HistorySection({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:p-5">
    <h2 className="text-[15px] font-semibold text-primary">{title}</h2>
    <div className="mt-3 space-y-3">{items.length ? items : <p className="rounded-lg bg-surface-container-low px-3 py-4 text-center text-[12px] text-on-surface-variant">{empty}</p>}</div>
  </section>;
}

function DocumentLinks({
  documents, label, onOpen, dictionary,
}: {
  documents: SupplierAdvanceDocument[];
  label: string;
  onOpen: (document: SupplierAdvanceDocument) => void;
  dictionary: SupplierAdvancesDictionary;
}) {
  return <div className="mt-3">
    <h4 className="text-[11px] font-semibold text-on-surface-variant">{label}</h4>
    <ul className="mt-1 flex flex-wrap gap-2">{documents.map((document) => <li key={document.document_id}>
      <button type="button" onClick={() => onOpen(document)} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-surface-variant px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-surface-container-low">
        <FileText size={13} aria-hidden="true" /><span className="max-w-[240px] truncate"><bdi dir="auto">{document.original_filename}</bdi></span><span className="sr-only"> — {dictionary.actions.openDocument}</span>
      </button>
    </li>)}</ul>
  </div>;
}
