"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatSarAmount, formatUiDate, formatUiDateTime } from "@/lib/i18n/formatting";
import { approveSupplierBillAction, attachSupplierBillInvoiceAction, createSupplierBillDocumentViewUrl } from "@/lib/supplier-bills/actions";
import type { SupplierBillsDictionary } from "@/lib/i18n/dictionaries/supplier-bills";
import type { SupplierBillDetail, SupplierBillFormOptions } from "@/lib/supplier-bills/types";
import SupplierBillForm from "./SupplierBillForm";

function fieldClass() {
  return "mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
}

function requestId() {
  return globalThis.crypto.randomUUID();
}

function Value({ children, numeric = false }: { children: React.ReactNode; numeric?: boolean }) {
  return <dd className={numeric ? "mt-1 text-[14px] font-semibold tabular-nums" : "mt-1 text-[14px]"} dir={numeric ? undefined : "auto"}>{numeric ? <bdi dir="ltr">{children}</bdi> : children}</dd>;
}

export default function SupplierBillDetailClient({
  bill,
  options,
  canRecord,
  canApprove,
  dictionary,
}: {
  bill: SupplierBillDetail;
  options: SupplierBillFormOptions;
  canRecord: boolean;
  canApprove: boolean;
  dictionary: SupplierBillsDictionary;
}) {
  const router = useRouter();
  const [isApprovePending, startApprove] = useTransition();
  const [isAttachPending, startAttach] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [attachMessage, setAttachMessage] = useState<string | null>(null);
  const [approveRequest, setApproveRequest] = useState(requestId);
  const [attachRequest, setAttachRequest] = useState(requestId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const wasEditOpen = useRef(false);
  const locale = dictionary.locale;
  const approved = bill.status === "approved";
  const editTriggerId = "supplier-bill-edit-trigger";

  useEffect(() => {
    if (!isEditOpen && wasEditOpen.current) document.getElementById(editTriggerId)?.focus();
    wasEditOpen.current = isEditOpen;
  }, [isEditOpen]);

  function approve() {
    startApprove(async () => {
      const result = await approveSupplierBillAction({ bill_id: bill.id, request_id: approveRequest });
      if (!result.success) {
        setMessage(dictionary.errors[result.errorCode ?? ""] ?? dictionary.errors.supplier_bill_approval_failed);
        return;
      }
      setMessage(dictionary.notices.saved);
      setApproveRequest(requestId());
      router.refresh();
    });
  }

  function attach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("bill_id", bill.id);
    data.set("request_id", attachRequest);
    startAttach(async () => {
      const result = await attachSupplierBillInvoiceAction(data);
      if (!result.success) {
        setAttachMessage(dictionary.errors[result.errorCode ?? ""] ?? dictionary.errors.supplier_bill_document_attach_failed);
        return;
      }
      setAttachMessage(dictionary.notices.invoiceAttached);
      setAttachRequest(requestId());
      form.reset();
      router.refresh();
    });
  }

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-5 pb-12" data-supplier-bill-detail="workspace">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <PendingLink href="/supplier-bills" pendingLabel={dictionary.backToList} className="text-[12px] font-semibold text-primary hover:underline">{dictionary.backToList}</PendingLink>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] font-semibold text-primary" dir="ltr">{bill.bill_number}</h1>
            <StatusBadge variant={approved ? "active" : "pending"}>{approved ? dictionary.statuses.approved : dictionary.statuses.pending}</StatusBadge>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[14px] text-on-surface-variant" dir="auto"><bdi dir="auto">{bill.supplier_name}</bdi><span aria-hidden="true">·</span><bdi dir="ltr">{bill.service_number}</bdi></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canRecord && !approved && <Button id={editTriggerId} type="button" variant="secondary" onClick={() => setIsEditOpen((open) => !open)} aria-expanded={isEditOpen} aria-controls={isEditOpen ? "supplier-bill-edit-panel" : undefined}>{isEditOpen ? dictionary.actions.closeEdit : dictionary.actions.editBill}</Button>}
          {canApprove && !approved && <Button type="button" onClick={approve} disabled={isApprovePending}>{isApprovePending ? "…" : dictionary.actions.approve}</Button>}
        </div>
      </div>

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4" aria-labelledby="supplier-bill-financial-summary">
        <h2 id="supplier-bill-financial-summary" className="text-[14px] font-semibold text-primary">{dictionary.title}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div><dt className="text-[11px] font-semibold text-on-surface-variant">{dictionary.fields.subtotal}</dt><Value numeric>{formatSarAmount(locale, bill.subtotal)}</Value></div>
          <div><dt className="text-[11px] font-semibold text-on-surface-variant">{dictionary.fields.vat}</dt><Value numeric>{formatSarAmount(locale, bill.vat_amount)}</Value></div>
          <div><dt className="text-[11px] font-semibold text-on-surface-variant">{dictionary.fields.total}</dt><Value numeric>{formatSarAmount(locale, bill.total_amount)}</Value></div>
          <div><dt className="text-[11px] font-semibold text-on-surface-variant">{dictionary.fields.currency}</dt><Value numeric>{bill.currency}</Value></div>
        </dl>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <InfoSection title={dictionary.fields.supplier}>
          <Info label={dictionary.fields.supplier} value={bill.supplier_legal_name} />
          <Info label={dictionary.fields.commercialRegistration} value={bill.supplier_cr_number_snapshot} numeric />
          <Info label={dictionary.fields.vatNumber} value={bill.supplier_vat_number_snapshot} numeric />
        </InfoSection>
        <InfoSection title={dictionary.fields.service}>
          <Info label={dictionary.fields.service}>
            <span className="flex flex-wrap items-center gap-1" dir="auto"><bdi dir="ltr">{bill.service_number}</bdi><span aria-hidden="true">—</span><bdi dir="auto">{bill.event_name || bill.service_title}</bdi></span>
          </Info>
          <Info label={dictionary.fields.commitment}>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1" dir="auto"><bdi dir="ltr">{formatSarAmount(locale, bill.authorized_amount)}</bdi><bdi dir="ltr">{bill.commitment_currency}</bdi><span>{dictionary.commitmentStatuses[bill.commitment_status] ?? "—"}</span>{bill.commitment_source && <span><span className="font-semibold">{dictionary.fields.commitmentSource}:</span> {dictionary.commitmentSources[bill.commitment_source] ?? "—"}</span>}{bill.commitment_quotation_reference && <span><span className="font-semibold">{dictionary.fields.supplierQuotation}:</span> <bdi dir="auto">{bill.commitment_quotation_reference}</bdi></span>}{bill.commitment_source_reference && <span><span className="font-semibold">{dictionary.fields.sourceReference}:</span> <bdi dir="auto">{bill.commitment_source_reference}</bdi></span>}</span>
          </Info>
          <Info label={dictionary.fields.receipt}>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1" dir="auto"><bdi dir="ltr">{bill.receipt_performance_date || "—"}</bdi><bdi dir="ltr">{bill.receipt_received_amount == null ? "—" : formatSarAmount(locale, bill.receipt_received_amount)}</bdi><span>{dictionary.acceptanceStatuses[bill.receipt_acceptance_status] ?? "—"}</span></span>
          </Info>
        </InfoSection>
        <InfoSection title={dictionary.fields.receipt}>
          <Info label={dictionary.fields.receiptStatus} value={dictionary.acceptanceStatuses[bill.receipt_acceptance_status] ?? null} />
          <Info label={dictionary.fields.performanceDate} value={bill.receipt_performance_date} numeric />
          <Info label={dictionary.fields.receivedValue} value={bill.receipt_received_amount == null ? null : formatSarAmount(locale, bill.receipt_received_amount)} numeric />
          <Info label={dictionary.fields.commitmentCeiling} value={formatSarAmount(locale, bill.authorized_amount)} numeric />
          <Info label={dictionary.fields.acceptedValue} value={formatSarAmount(locale, bill.accepted_amount)} numeric />
        </InfoSection>
        <InfoSection title={dictionary.fields.status}>
          <Info label={dictionary.fields.invoiceNumber} value={bill.invoice_number} numeric />
          <Info label={dictionary.fields.invoiceDate} value={formatUiDate(locale, bill.invoice_date)} numeric />
          <Info label={dictionary.fields.dueDate} value={bill.due_date ? formatUiDate(locale, bill.due_date) : null} numeric />
          <Info label={dictionary.fields.recordedAt} value={formatUiDateTime(locale, bill.recorded_at)} numeric />
        </InfoSection>
      </section>

      <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4" aria-labelledby="supplier-bill-evidence">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 id="supplier-bill-evidence" className="text-[14px] font-semibold text-primary">{dictionary.fields.evidence}</h2><p className="mt-1 text-[12px] text-on-surface-variant">{approved ? dictionary.notices.approvedImmutable : dictionary.notices.evidenceRequired}</p></div>
          {bill.documents.length === 0 && <span className="text-[12px] text-warning">{dictionary.notices.evidenceRequired}</span>}
        </div>
        <ul className="mt-4 divide-y divide-surface-variant rounded-lg border border-surface-variant">
          {bill.documents.map((document) => <DocumentRow key={document.document_id} billId={bill.id} document={document} dictionary={dictionary} />)}
          {bill.documents.length === 0 && <li className="px-3 py-4 text-[12px] text-on-surface-variant">—</li>}
        </ul>
        {!approved && canRecord && <form onSubmit={attach} className="mt-4 flex flex-wrap items-end gap-3"><label className="min-w-[240px] flex-1 text-[12px] font-semibold">{dictionary.forms.invoiceFile}<input className={fieldClass()} name="invoice" type="file" required accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" disabled={isAttachPending} /></label><Button type="submit" size="sm" disabled={isAttachPending}>{isAttachPending ? "…" : dictionary.actions.attachInvoice}</Button>{attachMessage && <span role="status" className="basis-full text-[12px] text-on-surface-variant">{attachMessage}</span>}</form>}
      </section>

      {canRecord && !approved && <section><h2 className="text-[15px] font-semibold text-primary">{dictionary.forms.pendingNotice}</h2>{isEditOpen && <div id="supplier-bill-edit-panel" className="mt-3"><SupplierBillForm options={options} dictionary={dictionary} bill={bill} autoFocus onCancel={() => setIsEditOpen(false)} /></div>}</section>}
      {message && <p role="status" className="text-[12px] text-on-surface-variant">{message}</p>}
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-4"><h2 className="text-[13px] font-semibold text-primary">{title}</h2><dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</dl></section>;
}

function Info({ label, value, numeric = false, children }: { label: string; value?: string | null; numeric?: boolean; children?: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-[11px] font-semibold text-on-surface-variant">{label}</dt><dd className="mt-1 break-words text-[13px] text-on-surface" dir={numeric ? undefined : "auto"}>{children ?? (numeric ? <bdi dir="ltr">{value || "—"}</bdi> : <bdi dir="auto">{value || "—"}</bdi>)}</dd></div>;
}

function DocumentRow({ billId, document, dictionary }: { billId: string; document: SupplierBillDetail["documents"][number]; dictionary: SupplierBillsDictionary }) {
  const [href, setHref] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function open() {
    startTransition(async () => {
      const result = await createSupplierBillDocumentViewUrl({ billId, documentId: document.document_id });
      if (result.success) setHref(result.data?.signedUrl ?? null);
    });
  }
  return <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"><span className="min-w-0 truncate text-[13px]" dir="auto">{document.original_filename}</span>{href ? <a href={href} target="_blank" rel="noreferrer" className="shrink-0 text-[12px] font-semibold text-primary hover:underline">{dictionary.actions.openDocument}</a> : <button type="button" onClick={open} disabled={pending} className="shrink-0 text-[12px] font-semibold text-primary hover:underline disabled:opacity-60">{pending ? "…" : dictionary.actions.openDocument}</button>}</li>;
}
