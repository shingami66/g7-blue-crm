"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Save } from "lucide-react";
import { LocaleBackIcon } from "@/components/i18n/LocaleBackIcon";
import { createQuotation, updateQuotation } from "@/lib/quotations/actions";
import type { QuotationDetail } from "@/lib/quotations/types";
import type { QuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import Button from "@/components/ui/Button";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getQuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import { getCommonDictionary } from "@/lib/i18n/dictionaries/common";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";
import FlexibleCommercialBuilder from "../FlexibleCommercialBuilder";
import {
  commercialAmendmentPreviewGrandTotal,
  commercialAmendmentPreviewSubtotal,
  toCommercialAmendmentDraftLines,
  type CommercialAmendmentDraftLine,
} from "@/lib/quotations/commercial-amendment-view-model";

interface QuotationFormService {
  id: string;
  serviceNumber: string;
  serviceTitle: string;
  status: string;
  eventName: string | null;
  eventStartDate?: string | null;
  eventEndDate?: string | null;
  customer?: { company: string; contact: string };
}

interface QuotationFormProps {
  service: QuotationFormService;
  initialData?: QuotationDetail;
  dictionary?: QuotationsDictionary;
}

function generateMutationKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `qt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function newAuthorityLine(): CommercialAmendmentDraftLine {
  return {
    line_key: "new-1",
    parent_line_key: null,
    commercial_role: "authority_line",
    description: "",
    description_ar: null,
    details: null,
    category: "",
    qty: 1,
    unit: "unit",
    unit_price: 0,
    is_selected: true,
  };
}

export default function QuotationForm({ service, initialData, dictionary: dictionaryProp }: QuotationFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary = dictionaryProp ?? getQuotationsDictionary(locale);
  const { back } = useGlobalNavigationPending();
  const isEdit = Boolean(initialData);
  const [mutationKey] = useState(generateMutationKey);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState(initialData?.event || service.eventName || service.serviceTitle);
  const [date] = useState(initialData?.date || new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(initialData?.validUntil || "");
  const [discount, setDiscount] = useState(String(initialData?.discount ?? 0));
  const [lines, setLines] = useState<CommercialAmendmentDraftLine[]>(() =>
    initialData?.items?.length ? toCommercialAmendmentDraftLines(initialData.items) : [newAuthorityLine()],
  );

  const serviceStartDate = service.eventStartDate || undefined;
  const serviceStartedBeforeIssueDate = Boolean(serviceStartDate && serviceStartDate < date);
  const validUntilExceedsServiceStart = Boolean(
    !serviceStartedBeforeIssueDate && serviceStartDate && validUntil && validUntil > serviceStartDate,
  );
  const parsedDiscount = Number(discount) || 0;
  const subtotal = commercialAmendmentPreviewSubtotal(lines);
  const grandTotal = commercialAmendmentPreviewGrandTotal(lines, parsedDiscount, 0);
  const discountExceedsSubtotal = parsedDiscount > subtotal;
  const hasInvalidLines = lines.some(
    (line) =>
      !line.description.trim() ||
      !Number.isFinite(line.qty) ||
      line.qty <= 0 ||
      !Number.isFinite(line.unit_price) ||
      line.unit_price < 0 ||
      !line.unit.trim() ||
      (line.commercial_role === "included_component" && line.unit_price !== 0),
  );
  let validUntilError: string | null = null;
  if (serviceStartedBeforeIssueDate) {
    validUntilError = dictionary.form.validation.serviceAlreadyStarted;
  } else if (validUntilExceedsServiceStart) {
    validUntilError = dictionary.form.validation.validUntilAfterServiceStart;
  } else if (validUntil && validUntil < date) {
    validUntilError = dictionary.form.validation.validUntilBeforeIssueDate;
  }

  function handleLinesChange(nextLines: CommercialAmendmentDraftLine[]) {
    setLines(nextLines);
    setError(null);
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    if (serviceStartedBeforeIssueDate) return setError(dictionary.form.validation.serviceAlreadyStarted);
    if (!validUntil) return setError(dictionary.form.validation.validUntilRequired);
    if (validUntil < date) return setError(dictionary.form.validation.validUntilBeforeIssueDate);
    if (validUntilExceedsServiceStart) return setError(dictionary.form.validation.validUntilAfterServiceStart);
    if (hasInvalidLines) return setError(dictionary.form.validation.invalidItems);
    if (discountExceedsSubtotal) return setError(dictionary.form.validation.discountExceedsSubtotal);

    setIsSubmitting(true);
    const quotationPayload = {
      event,
      date,
      valid_until: validUntil,
      discount: parsedDiscount,
      items: lines.map((line) => ({
        line_key: line.line_key,
        parent_line_key: line.parent_line_key,
        commercial_role: line.commercial_role,
        description: line.description,
        description_ar: line.description_ar,
        details: line.details,
        category: line.category,
        qty: line.qty,
        unit: line.unit,
        unit_price: line.unit_price,
        is_selected: line.is_selected,
      })),
    };
    const result = isEdit && initialData
      ? await updateQuotation(initialData.id, quotationPayload)
      : await createQuotation({ mutation_key: mutationKey, service_id: service.id, ...quotationPayload });

    if (result.success) {
      router.push("/quotations");
      router.refresh();
      return;
    }
    setError(result.code === "MUTATION_KEY_CONFLICT" ? dictionary.form.validation.mutationKeyConflict : result.error || (isEdit ? dictionary.form.validation.failedToUpdate : dictionary.form.validation.failedToCreate));
    setIsSubmitting(false);
  }

  const serviceStatusLabel = dictionary.form.serviceStatuses[service.status as keyof typeof dictionary.form.serviceStatuses] || service.status;
  const hasServiceSchedule = Object.prototype.hasOwnProperty.call(service, "eventStartDate") || Object.prototype.hasOwnProperty.call(service, "eventEndDate");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 py-4">
        <button type="button" onClick={() => back()} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low" aria-label={getCommonDictionary(dictionary.locale).actions.back}>
          <LocaleBackIcon size={16} />
        </button>
        <div>
          <h2 className="text-[28px] leading-[36px] font-semibold tracking-tight text-primary">
            {isEdit ? <>{dictionary.form.editTitle} <span dir="ltr" className="font-mono">{isolateBidiText(initialData?.quotationNumber ?? "")}</span></> : dictionary.form.newTitle}
          </h2>
          <p className="text-[14px] text-on-surface-variant">{isEdit ? dictionary.form.editSubtitle : dictionary.form.newSubtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <div className="flex items-center gap-2 rounded-lg bg-error-container p-4 text-[14px] text-on-error-container"><AlertCircle size={18} />{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-6">
            <h3 className="border-b border-surface-variant pb-2 font-semibold text-primary">{dictionary.form.basicDetails}</h3>
            <div className="grid grid-cols-1 gap-3 text-[14px]">
              <div><div className="text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">{dictionary.form.service}</div><div className="font-mono font-semibold text-primary" dir="ltr">{isolateBidiText(service.serviceNumber)}</div></div>
              <div><div className="text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">{dictionary.form.serviceTitle}</div><div className="font-medium text-on-surface" dir="auto">{service.serviceTitle}</div></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><div className="text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">{dictionary.form.status}</div><div className="font-medium text-on-surface">{serviceStatusLabel}</div></div>
                <div><div className="text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">{dictionary.form.customer}</div><div className="font-medium text-on-surface" dir="auto">{service.customer?.company || dictionary.form.unknownCustomer}{service.customer?.contact ? ` (${service.customer.contact})` : ""}</div></div>
              </div>
            </div>
            {hasServiceSchedule && <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3"><div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">{dictionary.form.serviceSchedule}</div><div className="grid grid-cols-1 gap-3 text-[14px] sm:grid-cols-2"><div><div className="text-[12px] font-semibold text-on-surface-variant">{dictionary.form.startDate}</div><div className="font-medium text-on-surface" dir="ltr">{service.eventStartDate ? <UiDateText locale={dictionary.locale} value={service.eventStartDate} /> : dictionary.form.notSet}</div></div><div><div className="text-[12px] font-semibold text-on-surface-variant">{dictionary.form.endDate}</div><div className="font-medium text-on-surface" dir="ltr">{service.eventEndDate ? <UiDateText locale={dictionary.locale} value={service.eventEndDate} /> : dictionary.form.notSet}</div></div></div></div>}
            <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-on-surface">{dictionary.form.quotationEventLabel}<input type="text" value={event} onChange={(inputEvent) => setEvent(inputEvent.target.value)} placeholder={dictionary.form.quotationEventPlaceholder} className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-normal text-on-surface focus:border-primary focus:outline-none" required /></label>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-6">
            <h3 className="border-b border-surface-variant pb-2 font-semibold text-primary">{dictionary.form.documentDatesRates}</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div><label className="text-[14px] font-semibold text-on-surface">{dictionary.form.issueDate}</label><div className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-[14px] text-on-surface-variant"><UiDateText locale={dictionary.locale} value={date} /></div><p className="mt-1 text-[12px] leading-snug text-on-surface-variant">{dictionary.form.issueDateHint}</p></div>
              <div><label htmlFor="quotation-valid-until" className="text-[14px] font-semibold text-on-surface">{dictionary.form.validUntil}</label><input id="quotation-valid-until" type="date" value={validUntil} onChange={(inputEvent) => setValidUntil(inputEvent.target.value)} min={date} max={serviceStartDate} disabled={serviceStartedBeforeIssueDate} required={!serviceStartedBeforeIssueDate} aria-invalid={Boolean(validUntilError)} aria-describedby="quotation-valid-until-message" className={`mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-container-low ${validUntilError ? "border-error" : "border-outline-variant"}`} dir="ltr" /><p id="quotation-valid-until-message" role={validUntilError ? "alert" : undefined} className={`mt-1 text-[12px] leading-snug ${validUntilError ? "text-error" : "text-on-surface-variant"}`}>{validUntilError ?? dictionary.form.validUntilHint}</p></div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-on-surface">{dictionary.form.discountSar}<input type="number" min="0" step="0.01" value={discount} onChange={(inputEvent) => setDiscount(inputEvent.target.value)} className="no-number-spinner w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-normal text-on-surface focus:border-primary focus:outline-none" dir="ltr" />{discountExceedsSubtotal && <span className="text-[12px] font-normal text-error">{dictionary.form.discountExceededHint}</span>}</label>
              <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-on-surface">{dictionary.form.vat}<input type="text" value={dictionary.form.notApplied} readOnly className="w-full cursor-not-allowed rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-[14px] text-on-surface-variant" title={dictionary.form.vatTitle} /></label>
            </div>
          </div>
        </div>

        <FlexibleCommercialBuilder lines={lines} onChange={handleLinesChange} dictionary={dictionary} />

        <div className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-6">
          <div className="flex items-center gap-2 rounded border border-outline-variant/50 bg-surface-container-low p-2 text-[12px] font-mono text-on-surface-variant"><AlertCircle size={14} className="text-primary" />{dictionary.form.previewOnly}</div>
          <div className="flex flex-col items-end gap-2 text-[14px] text-on-surface">
            <div className="flex w-72 justify-between gap-4"><span className="text-on-surface-variant">{dictionary.form.subtotal}:</span><span dir="ltr" className="tabular-nums">{formatSarAmount(dictionary.locale, subtotal)}</span></div>
            <div className="flex w-72 justify-between gap-4 text-error"><span className="text-on-surface-variant">{dictionary.form.discount}:</span><span dir="ltr" className="tabular-nums">- {formatSarAmount(dictionary.locale, parsedDiscount)}</span></div>
            <div className={`flex w-72 justify-between gap-4 border-t border-outline-variant pt-2 text-[16px] font-semibold ${discountExceedsSubtotal ? "text-error" : "text-primary"}`}><span>{dictionary.form.grandTotal}:</span><span dir="ltr" className="tabular-nums">{formatSarAmount(dictionary.locale, grandTotal)}</span></div>
          </div>
          <div className="mt-4 flex justify-end"><Button type="submit" loading={isSubmitting} size="sm" disabled={discountExceedsSubtotal || validUntilExceedsServiceStart || serviceStartedBeforeIssueDate}><Save size={16} />{isEdit ? dictionary.form.saveChanges : dictionary.form.createQuotation}</Button></div>
        </div>
      </form>
    </div>
  );
}
