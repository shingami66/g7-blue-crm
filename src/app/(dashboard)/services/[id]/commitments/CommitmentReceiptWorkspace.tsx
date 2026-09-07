"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Paperclip } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { isolateBidiText, isolateLtrText } from "@/lib/i18n/bidi";
import { formatSarAmount, formatUiDate, formatUiDateTime, formatUiNumber, formatUiQuantity } from "@/lib/i18n/formatting";
import type { ProcurementCommitmentDictionary } from "@/lib/i18n/dictionaries/procurement-commitments";
import { appendReturnTo } from "@/lib/record-navigation/return-to";
import {
  addApprovedCommitmentAmendment,
  createApprovedCommitment,
  correctServiceReceipt,
  createServiceReceipt,
  reviewServiceReceipt,
  transitionApprovedCommitment,
  recordApprovedCommitmentEvidence,
  recordServiceReceiptEvidence,
  createProcurementEvidenceDocumentViewUrl,
} from "@/lib/procurement/commitment-receipt-actions";
import type { ApprovedCommitment, ProcurementEvidenceDocument, SupplierQuotationCommitmentOption } from "@/lib/procurement/commitment-receipt-types";
import type { ProcurementSupplierOption } from "@/lib/procurement/types";

type Props = {
  serviceId: string;
  returnTo?: string;
  serviceStatus: string;
  commitments: ApprovedCommitment[];
  suppliers: ProcurementSupplierOption[];
  quotationOptions: SupplierQuotationCommitmentOption[];
  loadError: boolean;
  canCreateCommitment: boolean;
  canAmend: boolean;
  canTransition: boolean;
  canWriteReceipt: boolean;
  canAcceptReceipt: boolean;
  canCorrectReceipt: boolean;
  canUploadDocuments: boolean;
  dictionary: ProcurementCommitmentDictionary;
};

const inputClass = "mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60";
const textAreaClass = `${inputClass} resize-y`;

function requestId(ref: { current: string | null }) {
  ref.current ??= globalThis.crypto.randomUUID();
  return ref.current;
}

function resetRequestId(ref: { current: string | null }) {
  ref.current = null;
}

function errorText(dictionary: ProcurementCommitmentDictionary, code: string | undefined) {
  return dictionary.errors[code ?? ""] ?? dictionary.errors.PROCUREMENT_COMMITMENT_WRITE_FAILED;
}

function money(value: number, locale: "en" | "ar") {
  return formatSarAmount(locale, value, { isolate: true });
}

export default function CommitmentReceiptWorkspace({
  serviceId,
  returnTo,
  serviceStatus,
  commitments,
  suppliers,
  quotationOptions,
  loadError,
  canCreateCommitment,
  canAmend,
  canTransition,
  canWriteReceipt,
  canAcceptReceipt,
  canCorrectReceipt,
  canUploadDocuments,
  dictionary,
}: Props) {
  const currentCommitmentsUrl = returnTo
    ? appendReturnTo(`/services/${serviceId}/commitments`, returnTo)
    : `/services/${serviceId}/commitments`;
  const canCreateForService = canCreateCommitment && serviceStatus !== "Completed" && serviceStatus !== "Cancelled";
  return (
    <div dir={dictionary.locale === "ar" ? "rtl" : "ltr"} className="space-y-6">
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-[13px] text-on-surface-variant">
        <p>{dictionary.notices.bookingSeparation}</p>
        <p className="mt-1">{dictionary.notices.receiptSeparation}</p>
      </div>
      {canCreateForService && <CommitmentForm serviceId={serviceId} suppliers={suppliers} quotationOptions={quotationOptions} dictionary={dictionary} />}
      {loadError ? (
        <div className="rounded-xl border border-error bg-error-container p-5 text-[14px] text-error" role="alert">{dictionary.loadError}</div>
      ) : commitments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant p-6 text-[14px] text-on-surface-variant">{dictionary.empty}</div>
      ) : (
        <div className="space-y-4">
          {commitments.map((commitment) => (
            <CommitmentCard key={commitment.id} commitment={commitment} currentCommitmentsUrl={currentCommitmentsUrl} canAmend={canAmend} canTransition={canTransition} canWriteReceipt={canWriteReceipt} canAcceptReceipt={canAcceptReceipt} canCorrectReceipt={canCorrectReceipt} canUploadDocuments={canUploadDocuments} dictionary={dictionary} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommitmentForm({ serviceId, suppliers, quotationOptions, dictionary }: { serviceId: string; suppliers: ProcurementSupplierOption[]; quotationOptions: SupplierQuotationCommitmentOption[]; dictionary: ProcurementCommitmentDictionary }) {
  const [source, setSource] = useState<"purchase_order" | "approved_contract" | "supplier_quotation" | "other_authorized">("supplier_quotation");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [approvedAtValue, setApprovedAtValue] = useState("");
  const requestRef = useRef<string | null>(null);
  const approvedAtPickerRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [quotationId, setQuotationId] = useState(quotationOptions[0]?.id ?? "");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const quotation = quotationOptions.find((option) => option.id === quotationId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get("approvedAt") ?? "");
    startTransition(async () => {
      const result = await createApprovedCommitment({
        commitmentSource: source,
        serviceId,
        supplierId: source === "supplier_quotation" ? quotation?.supplierId ?? "" : supplierId,
        supplierQuotationId: source === "supplier_quotation" ? quotationId || null : null,
        sourceReference: source === "supplier_quotation" ? null : String(form.get("sourceReference") ?? "") || null,
        originalApprovedAmount: Number(form.get("originalApprovedAmount")),
        approvedAt: date ? new Date(`${date}T00:00:00.000Z`).toISOString() : "",
        requestId: requestId(requestRef),
      });
      if (!result.success) {
        setMessage(errorText(dictionary, result.code));
        return;
      }
      resetRequestId(requestRef);
      setMessage(dictionary.success.commitmentCreated);
      event.currentTarget.reset();
      setApprovedAtValue("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
      <h2 className="text-[16px] font-semibold text-primary">{dictionary.forms.createTitle}</h2>
      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="text-[13px] font-semibold text-on-surface">{dictionary.fields.source}<select className={inputClass} value={source} onChange={(event) => setSource(event.target.value as typeof source)} disabled={isPending}>{Object.entries(dictionary.sources).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {source === "supplier_quotation" ? (
          <label className="text-[13px] font-semibold text-on-surface">{dictionary.fields.supplierQuotation}<select className={inputClass} name="supplierQuotationId" required value={quotationId} onChange={(event) => setQuotationId(event.target.value)} disabled={isPending}><option value="">{dictionary.forms.quotationPlaceholder}</option>{quotationOptions.map((option) => <option key={option.id} value={option.id}>{option.supplierName} — {option.supplierReference ? isolateBidiText(option.supplierReference) : dictionary.notices.unknownQuotationReference}</option>)}</select></label>
        ) : (
          <label className="text-[13px] font-semibold text-on-surface">{dictionary.fields.supplier}<select className={inputClass} value={supplierId} onChange={(event) => setSupplierId(event.target.value)} disabled={isPending} required><option value="">{dictionary.forms.quotationPlaceholder}</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
        )}
        {source !== "supplier_quotation" && <label className="text-[13px] font-semibold text-on-surface">{dictionary.fields.sourceReference}<input className={inputClass} name="sourceReference" required placeholder={dictionary.forms.sourceReferencePlaceholder} disabled={isPending} /></label>}
        <label className="text-[13px] font-semibold text-on-surface">{dictionary.fields.originalAmount}<input className={inputClass} name="originalApprovedAmount" type="number" min="0" step="0.01" required placeholder={dictionary.forms.amountPlaceholder} disabled={isPending} /></label>
        <div>
          <label htmlFor="commitment-approved-at-input" className="block text-[13px] font-semibold text-on-surface">
            {dictionary.fields.approvedAt}
          </label>
          <div className="relative mt-1" dir="ltr">
            <input
              id="commitment-approved-at-input"
              name="approvedAt"
              type="text"
              required
              inputMode="numeric"
              value={approvedAtValue}
              onChange={(event) => {
                setApprovedAtValue(event.target.value);
                resetRequestId(requestRef);
              }}
              placeholder={dictionary.datePlaceholder}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 pe-10 text-[14px] font-mono text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
              dir="ltr"
              disabled={isPending}
              pattern="\d{4}-\d{2}-\d{2}"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  approvedAtPickerRef.current?.showPicker();
                } catch {
                  approvedAtPickerRef.current?.focus();
                }
              }}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-on-surface-variant hover:text-primary focus:outline-none focus-visible:text-primary disabled:opacity-60"
              disabled={isPending}
              aria-label={dictionary.openCalendar}
            >
              <Calendar size={18} aria-hidden="true" />
            </button>
          </div>
          <input
            ref={approvedAtPickerRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            value={approvedAtValue}
            onChange={(event) => {
              setApprovedAtValue(event.target.value);
              resetRequestId(requestRef);
            }}
            disabled={isPending}
            className="sr-only"
          />
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center gap-3"><Button type="submit" size="sm" disabled={isPending || (source === "supplier_quotation" && !quotation?.supplierId)}>{isPending ? "…" : dictionary.forms.create}</Button>{message && <span role="status" className="text-[13px] text-on-surface-variant">{message}</span>}</div>
      </form>
    </section>
  );
}

function CommitmentCard({ commitment, currentCommitmentsUrl, canAmend, canTransition, canWriteReceipt, canAcceptReceipt, canCorrectReceipt, canUploadDocuments, dictionary }: { commitment: ApprovedCommitment; currentCommitmentsUrl?: string; canAmend: boolean; canTransition: boolean; canWriteReceipt: boolean; canAcceptReceipt: boolean; canCorrectReceipt: boolean; canUploadDocuments: boolean; dictionary: ProcurementCommitmentDictionary }) {
  return (
    <details className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <summary className="cursor-pointer list-none border-b border-surface-variant bg-surface-bright p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-primary">{dictionary.sources[commitment.commitmentSource]}</h2>
            <p className="mt-1 text-[13px] text-on-surface-variant" dir="auto">{isolateBidiText(commitment.supplierName)} · <span dir="ltr" className="font-mono">{isolateLtrText(commitment.serviceNumber)}</span></p>
          </div>
          <StatusBadge variant={commitment.status === "open" ? "active" : commitment.status === "cancelled" ? "inactive" : "pending"}>{dictionary.statuses[commitment.status]}</StatusBadge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5"><Metric label={dictionary.fields.originalAmount} value={money(commitment.originalApprovedAmount, dictionary.locale)} numeric /><Metric label={dictionary.fields.authorizedAmount} value={money(commitment.authorizedAmount, dictionary.locale)} numeric /><Metric label={dictionary.fields.acceptedAmount} value={money(commitment.acceptedAmount, dictionary.locale)} numeric /><Metric label={dictionary.fields.pendingAmount} value={money(commitment.pendingAmount, dictionary.locale)} numeric /><Metric label={dictionary.fields.openAmount} value={money(commitment.openCommitmentAmount, dictionary.locale)} numeric /></dl>
      </summary>
      <div className="space-y-5 p-5">
        <dl className="grid grid-cols-1 gap-3 text-[13px] md:grid-cols-3"><Metric label={dictionary.fields.approvedAt} value={formatUiDate(dictionary.locale, commitment.approvedAt)} /><Metric label={dictionary.fields.approvedBy} value={commitment.approvedBy} /><div><dt className="text-[11px] font-semibold text-on-surface-variant">{dictionary.fields.sourceReference}</dt><dd className="mt-1 break-words text-[13px] text-on-surface"><QuotationSourceReference commitment={commitment} dictionary={dictionary} currentCommitmentsUrl={currentCommitmentsUrl} /></dd></div></dl>
        <CommitmentLifecycleHistory commitment={commitment} dictionary={dictionary} />

        <details className="rounded-lg border border-outline-variant/70 bg-surface-container-low">
          <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-semibold text-primary">{dictionary.fields.documents}</summary>
          <div className="border-t border-outline-variant/70 p-4">
            {canUploadDocuments && <EvidenceUploadForm targetId={commitment.id} dictionary={dictionary} target="commitment" />}
            {commitment.documents.length > 0 ? <EvidenceDocumentList documents={commitment.documents} targetId={commitment.id} target="commitment" dictionary={dictionary} /> : <p className="text-[13px] text-on-surface-variant">{dictionary.notices.noDocuments}</p>}
          </div>
        </details>

        <details className="rounded-lg border border-outline-variant/70 bg-surface-container-low">
          <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-semibold text-primary">{dictionary.fields.receipt}</summary>
          <div className="space-y-3 border-t border-outline-variant/70 p-4">
            {commitment.receipts.length > 0 ? commitment.receipts.map((receipt) => <ReceiptRecord key={receipt.id} receipt={receipt} canAccept={canAcceptReceipt} canCorrect={canCorrectReceipt && commitment.status === "open"} canUploadDocuments={canUploadDocuments} dictionary={dictionary} />) : <p className="text-[13px] text-on-surface-variant">{dictionary.notices.noReceipts}</p>}
            {commitment.status === "open" && canWriteReceipt && <ReceiptForm serviceId={commitment.serviceId} commitmentId={commitment.id} dictionary={dictionary} />}
          </div>
        </details>

        <details className="rounded-lg border border-outline-variant/70 bg-surface-container-low">
          <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-semibold text-primary">{dictionary.fields.amendment}</summary>
          <div className="space-y-4 border-t border-outline-variant/70 p-4">
            {commitment.amendments.length > 0 ? <div className="overflow-x-auto"><table className="min-w-[760px] text-start text-[13px]"><thead><tr className="border-b border-outline-variant text-on-surface-variant"><th className="px-2 py-2">#</th><th className="px-2 py-2">{dictionary.fields.amendmentType}</th><th className="px-2 py-2">{dictionary.fields.amendmentAmount}</th><th className="px-2 py-2">{dictionary.fields.authorizedAmount}</th><th className="px-2 py-2">{dictionary.fields.reason}</th><th className="px-2 py-2">{dictionary.fields.evidence}</th><th className="px-2 py-2">{dictionary.fields.approvedAt}</th><th className="px-2 py-2">{dictionary.fields.approvedBy}</th></tr></thead><tbody>{commitment.amendments.map((amendment) => <tr key={amendment.id} className="border-b border-surface-variant"><td className="px-2 py-2" dir="ltr">{formatUiNumber(dictionary.locale, amendment.amendmentNumber)}</td><td className="px-2 py-2">{amendment.amendmentType === "increase" ? dictionary.forms.increase : dictionary.forms.reduction}</td><td className="px-2 py-2" dir="ltr">{money(Math.abs(amendment.amountDelta), dictionary.locale)}</td><td className="px-2 py-2" dir="ltr">{money(amendment.approvedAmountAfter, dictionary.locale)}</td><td className="px-2 py-2" dir="auto">{isolateBidiText(amendment.reason)}</td><td className="px-2 py-2" dir="auto">{isolateBidiText(amendment.evidenceRef)}</td><td className="px-2 py-2" dir="ltr">{formatUiDate(dictionary.locale, amendment.approvedAt)}</td><td className="px-2 py-2" dir="auto">{isolateBidiText(amendment.approvedBy)}</td></tr>)}</tbody></table></div> : <p className="text-[13px] text-on-surface-variant">{dictionary.notices.noAmendments}</p>}
            {commitment.status === "open" && canAmend && <AmendmentForm commitmentId={commitment.id} dictionary={dictionary} />}
          </div>
        </details>

        {commitment.status !== "cancelled" && canTransition && (
          <details className="rounded-lg border border-outline-variant/70 bg-surface-container-low">
            <summary className="cursor-pointer list-none px-4 py-3 text-[14px] font-semibold text-primary">{commitment.status === "closed" ? dictionary.forms.reopen : `${dictionary.forms.close} / ${dictionary.forms.cancel}`}</summary>
            <div className="border-t border-outline-variant/70 p-4"><LifecycleForm commitmentId={commitment.id} status={commitment.status} dictionary={dictionary} /></div>
          </details>
        )}
        <p className="text-[12px] text-on-surface-variant">{dictionary.notices.historyPreserved}</p>
      </div>
    </details>
  );
}

function ReceiptForm({ serviceId, commitmentId, dictionary }: { serviceId: string; commitmentId: string; dictionary: ProcurementCommitmentDictionary }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [performanceDateValue, setPerformanceDateValue] = useState("");
  const requestRef = useRef<string | null>(null);
  const performanceDatePickerRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const optional = (name: string) => String(form.get(name) ?? "") || null;
    startTransition(async () => {
      const result = await createServiceReceipt({ serviceId, commitmentId, performanceDate: String(form.get("performanceDate") ?? ""), deliveredScope: String(form.get("deliveredScope") ?? ""), actualQuantity: optional("actualQuantity") === null ? null : Number(optional("actualQuantity")), actualHours: optional("actualHours") === null ? null : Number(optional("actualHours")), quantityUnit: optional("quantityUnit"), receivedAmount: optional("receivedAmount") === null ? null : Number(optional("receivedAmount")), missingScope: optional("missingScope"), extraScope: optional("extraScope"), defectsIncidents: optional("defectsIncidents"), conditionsNotes: optional("conditionsNotes"), requestId: requestId(requestRef) });
      if (!result.success) { setMessage(errorText(dictionary, result.code)); return; }
      resetRequestId(requestRef); setMessage(dictionary.success.receiptCreated); event.currentTarget.reset(); setPerformanceDateValue(""); router.refresh();
    });
  }
  return (
    <form onSubmit={submit} className="rounded-lg border border-outline-variant bg-surface p-4">
      <h3 className="text-[14px] font-semibold text-primary">{dictionary.forms.receiptTitle}</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label htmlFor={`receipt-performance-date-${commitmentId}`} className="block text-[12px] font-semibold text-on-surface">
            {dictionary.fields.performanceDate}
          </label>
          <div className="relative mt-1" dir="ltr">
            <input
              id={`receipt-performance-date-${commitmentId}`}
              name="performanceDate"
              type="text"
              required
              inputMode="numeric"
              value={performanceDateValue}
              onChange={(event) => {
                setPerformanceDateValue(event.target.value);
                resetRequestId(requestRef);
              }}
              placeholder={dictionary.datePlaceholder}
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 pe-10 text-[14px] font-mono text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
              dir="ltr"
              disabled={isPending}
              pattern="\d{4}-\d{2}-\d{2}"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  performanceDatePickerRef.current?.showPicker();
                } catch {
                  performanceDatePickerRef.current?.focus();
                }
              }}
              className="absolute inset-y-0 end-0 flex items-center pe-3 text-on-surface-variant hover:text-primary focus:outline-none focus-visible:text-primary disabled:opacity-60"
              disabled={isPending}
              aria-label={dictionary.openCalendar}
            >
              <Calendar size={18} aria-hidden="true" />
            </button>
          </div>
          <input
            ref={performanceDatePickerRef}
            type="date"
            tabIndex={-1}
            aria-hidden="true"
            value={performanceDateValue}
            onChange={(event) => {
              setPerformanceDateValue(event.target.value);
              resetRequestId(requestRef);
            }}
            disabled={isPending}
            className="sr-only"
          />
        </div>
        <label className="text-[12px] font-semibold">{dictionary.fields.receivedAmount}<input name="receivedAmount" type="number" min="0" step="0.01" className={inputClass} placeholder={dictionary.forms.optionalPlaceholder} disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.unit}<input name="quantityUnit" className={inputClass} placeholder={dictionary.forms.optionalPlaceholder} disabled={isPending} /></label>
        <label className="text-[12px] font-semibold md:col-span-3">{dictionary.fields.deliveredScope}<textarea name="deliveredScope" className={textAreaClass} rows={2} placeholder={dictionary.forms.scopePlaceholder} required disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.actualQuantity}<input name="actualQuantity" type="number" min="0" step="0.001" className={inputClass} disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.actualHours}<input name="actualHours" type="number" min="0" step="0.001" className={inputClass} disabled={isPending} /></label>
        <label className="text-[12px] font-semibold">{dictionary.fields.missingScope}<textarea name="missingScope" className={textAreaClass} rows={1} disabled={isPending} /></label>
        <label className="text-[12px] font-semibold"><span>{dictionary.fields.extraScope}</span><textarea name="extraScope" className={textAreaClass} rows={1} disabled={isPending} /></label>
        <label className="text-[12px] font-semibold"><span>{dictionary.fields.defectsIncidents}</span><textarea name="defectsIncidents" className={textAreaClass} rows={1} disabled={isPending} /></label>
        <label className="text-[12px] font-semibold md:col-span-3">{dictionary.fields.conditionsNotes}<textarea name="conditionsNotes" className={textAreaClass} rows={1} disabled={isPending} /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>{isPending ? "…" : dictionary.forms.submitReceipt}</Button>
        {message && <span role="status" className="text-[13px] text-on-surface-variant">{message}</span>}
      </div>
    </form>
  );
}

function ReceiptRecord({ receipt, canAccept, canCorrect, canUploadDocuments, dictionary }: { receipt: ApprovedCommitment["receipts"][number]; canAccept: boolean; canCorrect: boolean; canUploadDocuments: boolean; dictionary: ProcurementCommitmentDictionary }) {
  return <div className="rounded-lg border border-outline-variant bg-surface p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-[13px] font-semibold text-on-surface">{dictionary.fields.performanceDate}: <span dir="ltr">{formatUiDate(dictionary.locale, receipt.performanceDate)}</span></div><StatusBadge variant={receipt.acceptanceStatus === "ACCEPTED" ? "active" : receipt.acceptanceStatus === "REJECTED" ? "inactive" : "pending"}>{dictionary.acceptanceStatuses[receipt.acceptanceStatus]}</StatusBadge></div><p className="mt-2 text-[13px] whitespace-pre-wrap" dir="auto">{isolateBidiText(receipt.deliveredScope)}</p><div className="mt-3 grid grid-cols-2 gap-3 text-[12px] text-on-surface-variant md:grid-cols-4"><Metric label={dictionary.fields.actualQuantity} value={receipt.actualQuantity === null ? "—" : formatUiQuantity(dictionary.locale, receipt.actualQuantity, { isolate: true })} numeric /><Metric label={dictionary.fields.actualHours} value={receipt.actualHours === null ? "—" : formatUiQuantity(dictionary.locale, receipt.actualHours, { isolate: true })} numeric /><Metric label={dictionary.fields.unit} value={receipt.quantityUnit ?? "—"} /><Metric label={dictionary.fields.receivedAmount} value={receipt.receivedAmount === null ? dictionary.notices.noAmount : money(receipt.receivedAmount, dictionary.locale)} numeric /><Metric label={dictionary.fields.submittedBy} value={receipt.submittedBy} /><Metric label={dictionary.fields.submittedAt} value={formatUiDateTime(dictionary.locale, receipt.submittedAt)} /><Metric label={dictionary.fields.reviewedBy} value={receipt.reviewedBy ?? dictionary.notices.pendingReview} />{receipt.reviewedAt && <Metric label={dictionary.fields.reviewedAt} value={formatUiDateTime(dictionary.locale, receipt.reviewedAt)} />}</div>{receipt.missingScope && <EvidenceNote label={dictionary.fields.missingScope} value={receipt.missingScope} />}{receipt.extraScope && <EvidenceNote label={dictionary.fields.extraScope} value={receipt.extraScope} />}{receipt.defectsIncidents && <EvidenceNote label={dictionary.fields.defectsIncidents} value={receipt.defectsIncidents} />}{receipt.conditionsNotes && <EvidenceNote label={dictionary.fields.conditionsNotes} value={receipt.conditionsNotes} />}{receipt.corrections.length > 0 && <div className="mt-4 rounded-lg border border-outline-variant/70 bg-surface-container-low p-3"><h4 className="text-[12px] font-semibold text-on-surface">{dictionary.fields.correction}</h4><div className="mt-2 space-y-3">{receipt.corrections.map((correction) => <div key={correction.id} className="border-s border-outline-variant ps-3 text-[12px] text-on-surface-variant"><p><span className="font-semibold">{dictionary.fields.priorOutcome}: </span>{dictionary.acceptanceStatuses[correction.priorAcceptanceStatus]} · {correction.priorReceivedAmount === null ? dictionary.notices.noAmount : money(correction.priorReceivedAmount, dictionary.locale)}</p><p><span className="font-semibold">{dictionary.fields.correctedOutcome}: </span>{dictionary.acceptanceStatuses[correction.correctedAcceptanceStatus]} · {correction.correctedReceivedAmount === null ? dictionary.notices.noAmount : money(correction.correctedReceivedAmount, dictionary.locale)}</p><p dir="auto"><span className="font-semibold">{dictionary.fields.correctionReason}: </span>{isolateBidiText(correction.correctionReason)}</p><p><span className="font-semibold">{dictionary.fields.correctionBy}: </span>{isolateBidiText(correction.correctedBy)} · {formatUiDateTime(dictionary.locale, correction.correctedAt)}</p></div>)}</div></div>}{canUploadDocuments && <EvidenceUploadForm targetId={receipt.id} dictionary={dictionary} target="receipt" />}{receipt.documents.length > 0 && <EvidenceDocumentList documents={receipt.documents} targetId={receipt.id} target="receipt" dictionary={dictionary} />}{canAccept && receipt.acceptanceStatus === "PENDING" && <ReceiptReviewActions receiptId={receipt.id} dictionary={dictionary} />}{canCorrect && receipt.acceptanceStatus !== "PENDING" && <ReceiptCorrectionActions receipt={receipt} dictionary={dictionary} />}</div>;
}

function ReceiptReviewActions({ receiptId, dictionary }: { receiptId: string; dictionary: ProcurementCommitmentDictionary }) {
  const [conditions, setConditions] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestRef = useRef<string | null>(null);
  const router = useRouter();
  function review(status: "ACCEPTED" | "ACCEPTED_WITH_CONDITIONS" | "REJECTED") {
    startTransition(async () => {
      const result = await reviewServiceReceipt({ receiptId, acceptanceStatus: status, conditionsNotes: conditions || null, requestId: requestId(requestRef) });
      if (!result.success) { setMessage(errorText(dictionary, result.code)); return; }
      resetRequestId(requestRef); setMessage(dictionary.success.receiptReviewed); router.refresh();
    });
  }
  return <div className="mt-4 flex flex-wrap items-center gap-2"><input className={`${inputClass} max-w-sm`} value={conditions} onChange={(event) => setConditions(event.target.value)} placeholder={dictionary.fields.conditionsNotes} disabled={isPending} /><Button type="button" size="sm" onClick={() => review("ACCEPTED")} disabled={isPending}>{dictionary.forms.accepted}</Button><Button type="button" size="sm" variant="secondary" onClick={() => review("ACCEPTED_WITH_CONDITIONS")} disabled={isPending || !conditions.trim()}>{dictionary.forms.conditional}</Button><Button type="button" size="sm" variant="secondary" onClick={() => review("REJECTED")} disabled={isPending}>{dictionary.forms.rejected}</Button>{message && <span role="status" className="text-[13px] text-on-surface-variant">{message}</span>}</div>;
}

function ReceiptCorrectionActions({ receipt, dictionary }: { receipt: ApprovedCommitment["receipts"][number]; dictionary: ProcurementCommitmentDictionary }) {
  const [status, setStatus] = useState<"ACCEPTED" | "ACCEPTED_WITH_CONDITIONS" | "REJECTED">(receipt.acceptanceStatus as "ACCEPTED" | "ACCEPTED_WITH_CONDITIONS" | "REJECTED");
  const [amount, setAmount] = useState(receipt.receivedAmount === null ? "" : String(receipt.receivedAmount));
  const [conditions, setConditions] = useState(receipt.conditionsNotes ?? "");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestRef = useRef<string | null>(null);
  const router = useRouter();
  function correct() {
    startTransition(async () => {
      const result = await correctServiceReceipt({ receiptId: receipt.id, correctedAcceptanceStatus: status, correctedReceivedAmount: amount.trim() ? Number(amount) : null, correctedConditionsNotes: conditions.trim() || null, correctionReason: reason, requestId: requestId(requestRef) });
      if (!result.success) { setMessage(errorText(dictionary, result.code)); return; }
      resetRequestId(requestRef); setMessage(dictionary.success.receiptCorrected); setReason(""); router.refresh();
    });
  }
  return <div className="mt-4 rounded-lg border border-warning/50 bg-warning-container/30 p-3"><p className="text-[12px] font-semibold text-on-surface">{dictionary.forms.correctionTitle}</p><div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4"><label className="text-[12px] font-semibold">{dictionary.fields.correctedOutcome}<select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as typeof status)} disabled={isPending}><option value="ACCEPTED">{dictionary.forms.accepted}</option><option value="ACCEPTED_WITH_CONDITIONS">{dictionary.forms.conditional}</option><option value="REJECTED">{dictionary.forms.rejected}</option></select></label><label className="text-[12px] font-semibold">{dictionary.fields.receivedAmount}<input className={inputClass} type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={dictionary.forms.optionalPlaceholder} disabled={isPending} /></label><label className="text-[12px] font-semibold md:col-span-2">{dictionary.fields.correctedConditions}<input className={inputClass} value={conditions} onChange={(event) => setConditions(event.target.value)} disabled={isPending} /></label><label className="text-[12px] font-semibold md:col-span-4">{dictionary.fields.correctionReason}<input className={inputClass} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={dictionary.forms.correctionReasonPlaceholder} required disabled={isPending} /></label></div><div className="mt-2 flex flex-wrap items-center gap-2"><Button type="button" size="sm" variant="secondary" onClick={correct} disabled={isPending || !reason.trim() || status === "ACCEPTED_WITH_CONDITIONS" && !conditions.trim()}>{isPending ? "…" : dictionary.forms.correct}</Button>{message && <span role="status" className="text-[12px] text-on-surface-variant">{message}</span>}</div></div>;
}

function AmendmentForm({ commitmentId, dictionary }: { commitmentId: string; dictionary: ProcurementCommitmentDictionary }) {
  const [message, setMessage] = useState<string | null>(null); const [isPending, startTransition] = useTransition(); const requestRef = useRef<string | null>(null); const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { const result = await addApprovedCommitmentAmendment({ commitmentId, amendmentType: String(form.get("amendmentType")), amount: Number(form.get("amount")), reason: String(form.get("reason")), evidenceRef: String(form.get("evidenceRef")), requestId: requestId(requestRef) }); if (!result.success) { setMessage(errorText(dictionary, result.code)); return; } resetRequestId(requestRef); setMessage(dictionary.success.amendmentCreated); event.currentTarget.reset(); router.refresh(); }); }
  return <form onSubmit={submit} className="rounded-lg border border-outline-variant bg-surface p-4"><h3 className="text-[14px] font-semibold text-primary">{dictionary.forms.amendmentTitle}</h3><div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3"><label className="text-[12px] font-semibold">{dictionary.fields.amendmentType}<select className={inputClass} name="amendmentType" disabled={isPending}><option value="increase">{dictionary.forms.increase}</option><option value="reduction">{dictionary.forms.reduction}</option></select></label><label className="text-[12px] font-semibold">{dictionary.fields.amendmentAmount}<input className={inputClass} name="amount" type="number" min="0.01" step="0.01" required disabled={isPending} /></label><label className="text-[12px] font-semibold">{dictionary.fields.approvalEvidenceReference}<input className={inputClass} name="evidenceRef" required disabled={isPending} placeholder={dictionary.forms.evidencePlaceholder} /></label><label className="text-[12px] font-semibold md:col-span-3">{dictionary.fields.reason}<textarea className={textAreaClass} name="reason" rows={2} required disabled={isPending} placeholder={dictionary.forms.reasonPlaceholder} /></label></div><div className="mt-3 flex flex-wrap items-center gap-3"><Button type="submit" size="sm" disabled={isPending}>{isPending ? "…" : dictionary.forms.amend}</Button>{message && <span role="status" className="text-[13px] text-on-surface-variant">{message}</span>}</div></form>;
}

function LifecycleForm({ commitmentId, status, dictionary }: { commitmentId: string; status: "open" | "closed"; dictionary: ProcurementCommitmentDictionary }) {
  const [message, setMessage] = useState<string | null>(null); const [isPending, startTransition] = useTransition(); const requestRef = useRef<string | null>(null); const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(async () => { const result = await transitionApprovedCommitment({ commitmentId, action: String(form.get("action")) as "close" | "cancel" | "reopen", reason: String(form.get("reason")), requestId: requestId(requestRef) }); if (!result.success) { setMessage(errorText(dictionary, result.code)); return; } resetRequestId(requestRef); setMessage(dictionary.success.transition); router.refresh(); }); }
  return <form onSubmit={submit} className="rounded-lg border border-outline-variant bg-surface p-4"><div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end"><label className="text-[12px] font-semibold">{dictionary.fields.reason}<input className={inputClass} name="reason" required disabled={isPending} placeholder={dictionary.forms.reasonPlaceholder} /></label><label className="text-[12px] font-semibold">{dictionary.forms.action}<select className={inputClass} name="action" disabled={isPending}>{status === "closed" ? <option value="reopen">{dictionary.forms.reopen}</option> : <><option value="close">{dictionary.forms.close}</option><option value="cancel">{dictionary.forms.cancel}</option></>}</select></label><Button type="submit" size="sm" variant="secondary" disabled={isPending}>{isPending ? "…" : dictionary.forms.executeAction}</Button></div>{message && <p role="status" className="mt-3 text-[13px] text-on-surface-variant">{message}</p>}</form>;
}

function Metric({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold text-on-surface-variant">{label}</dt>
      <dd className="mt-1 break-words text-[13px] text-on-surface">
        {numeric ? (
          <span dir="ltr" className="inline-block tabular-nums">
            {value}
          </span>
        ) : (
          <span dir="auto">{value}</span>
        )}
      </dd>
    </div>
  );
}

function QuotationSourceReference({ commitment, dictionary, currentCommitmentsUrl }: { commitment: ApprovedCommitment; dictionary: ProcurementCommitmentDictionary; currentCommitmentsUrl?: string }) {
  if (commitment.supplierQuotationId) {
    const label = commitment.supplierQuotationReference ?? dictionary.notices.unknownQuotationReference;
    const href = currentCommitmentsUrl
      ? appendReturnTo(`/suppliers/${commitment.supplierId}/quotations/${commitment.supplierQuotationId}`, currentCommitmentsUrl)
      : `/suppliers/${commitment.supplierId}/quotations/${commitment.supplierQuotationId}`;
    return <Link href={href} className="text-primary hover:underline" dir="auto">{isolateBidiText(label)}</Link>;
  }
  return <span dir="auto">{commitment.sourceReference ? isolateBidiText(commitment.sourceReference) : "—"}</span>;
}

function CommitmentLifecycleHistory({ commitment, dictionary }: { commitment: ApprovedCommitment; dictionary: ProcurementCommitmentDictionary }) {
  if (commitment.status === "open") return null;
  const cancelled = commitment.status === "cancelled";
  const at = cancelled ? commitment.cancelledAt : commitment.closedAt;
  const by = cancelled ? commitment.cancelledBy : commitment.closedBy;
  const reason = cancelled ? commitment.cancelledReason : commitment.closedReason;
  return <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3"><div className="grid grid-cols-1 gap-3 text-[13px] md:grid-cols-3"><Metric label={dictionary.fields.lifecycleAt} value={at ? formatUiDateTime(dictionary.locale, at) : "—"} /><Metric label={dictionary.fields.lifecycleBy} value={by ?? "—"} /><Metric label={dictionary.fields.lifecycleReason} value={reason ? isolateBidiText(reason) : "—"} /></div></div>;
}

function EvidenceNote({ label, value }: { label: string; value: string }) {
  return <p className="mt-3 text-[13px] text-on-surface-variant" dir="auto"><span className="font-semibold">{label}: </span>{isolateBidiText(value)}</p>;
}

function EvidenceUploadForm({ targetId, target, dictionary }: { targetId: string; target: "commitment" | "receipt"; dictionary: ProcurementCommitmentDictionary }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const inputId = `evidence-files-${target}-${targetId}`;

  function resetFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSelectedFiles([]);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    resetRequestId(requestRef);
    const fileList = event.target.files;
    setSelectedFiles(fileList ? Array.from(fileList) : []);
  }

  function handleReset() {
    resetRequestId(requestRef);
    resetFileInput();
  }

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    function onNativeReset() {
      resetRequestId(requestRef);
      resetFileInput();
    }
    form.addEventListener("reset", onNativeReset);
    return () => {
      form.removeEventListener("reset", onNativeReset);
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("targetId", targetId);
    form.set("requestId", requestId(requestRef));
    startTransition(async () => {
      const result = target === "commitment" ? await recordApprovedCommitmentEvidence(form) : await recordServiceReceiptEvidence(form);
      if (!result.success) { setMessage(errorText(dictionary, result.code)); return; }
      resetRequestId(requestRef);
      setMessage(dictionary.success.documentUploaded);
      formElement.reset();
      resetFileInput();
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      onReset={handleReset}
      className="mt-4 rounded-lg border border-outline-variant/70 bg-surface-container-low p-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor={inputId}
          className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors ${
            isPending
              ? "cursor-not-allowed border-outline-variant/60 bg-surface-container-low text-on-surface-variant/60"
              : "cursor-pointer border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40"
          }`}
        >
          <Paperclip size={16} className="shrink-0 text-primary" aria-hidden="true" />
          <span>{dictionary.chooseFiles}</span>
        </label>
        <input
          ref={fileInputRef}
          id={inputId}
          name="files"
          type="file"
          multiple
          required
          accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
          className="sr-only"
          disabled={isPending}
          onChange={handleFileChange}
        />
        <div className="min-w-0 flex-1 text-[12px] text-on-surface-variant">
          {selectedFiles.length === 0 ? (
            <span className="text-on-surface-variant">{dictionary.noFilesSelected}</span>
          ) : (
            <span className="font-mono text-[11px] text-on-surface break-all" dir="auto">
              {selectedFiles.map((file) => file.name).join(", ")}
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-on-surface-variant">{dictionary.notices.documentHelper}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending || selectedFiles.length === 0}>{isPending ? "…" : dictionary.forms.upload}</Button>
        {message && <span role="status" className="text-[12px] text-on-surface-variant">{message}</span>}
      </div>
    </form>
  );
}

function EvidenceDocumentList({ documents, targetId, target, dictionary }: { documents: ProcurementEvidenceDocument[]; targetId: string; target: "commitment" | "receipt"; dictionary: ProcurementCommitmentDictionary }) {
  return <div className="mt-4 rounded-lg border border-outline-variant/70 bg-surface-container-low p-3"><h3 className="text-[12px] font-semibold text-on-surface">{dictionary.fields.documents}</h3><ul className="mt-2 space-y-2">{documents.map((document) => <li key={document.documentId}><PrivateEvidenceDocumentLink document={document} targetId={targetId} target={target} dictionary={dictionary} /></li>)}</ul></div>;
}

function PrivateEvidenceDocumentLink({ document, targetId, target, dictionary }: { document: ProcurementEvidenceDocument; targetId: string; target: "commitment" | "receipt"; dictionary: ProcurementCommitmentDictionary }) {
  const [href, setHref] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function prepare() {
    startTransition(async () => {
      const result = await createProcurementEvidenceDocumentViewUrl({ documentId: document.documentId, targetId, target });
      if (!result.success) { setMessage(dictionary.errors.DOCUMENT_NOT_FOUND ?? dictionary.errors.PROCUREMENT_COMMITMENT_WRITE_FAILED); return; }
      setHref(result.data.signedUrl);
    });
  }
  return href
    ? <a href={href} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 text-[12px] font-semibold text-primary hover:underline" dir="auto"><span className="truncate">{isolateBidiText(document.originalFilename)}</span><span dir="ltr">({formatUiNumber(dictionary.locale, document.fileSize)} B)</span></a>
    : <span className="inline-flex max-w-full flex-wrap items-center gap-2"><button type="button" onClick={prepare} disabled={isPending} className="truncate text-[12px] font-semibold text-primary hover:underline disabled:opacity-60">{isPending ? "…" : isolateBidiText(document.originalFilename)}</button>{message && <span role="alert" className="text-[12px] text-error">{message}</span>}</span>;
}
