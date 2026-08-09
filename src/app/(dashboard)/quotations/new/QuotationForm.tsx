"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { createQuotation, updateQuotation } from "@/lib/quotations/actions";
import type { QuotationDetail } from "@/lib/quotations/types";
import Button from "@/components/ui/Button";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import {
  getQuotationsDictionary,
  type QuotationsDictionary,
} from "@/lib/i18n/dictionaries/quotations";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";

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

export default function QuotationForm({
  service,
  initialData,
  dictionary: dictionaryProp,
}: QuotationFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary = dictionaryProp ?? getQuotationsDictionary(locale);
  const { back } = useGlobalNavigationPending();
  const isEdit = !!initialData;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasServiceSchedule =
    Object.prototype.hasOwnProperty.call(service, "eventStartDate") ||
    Object.prototype.hasOwnProperty.call(service, "eventEndDate");
  const serviceStartDate = service.eventStartDate || undefined;
  const formatScheduleDate = (value?: string | null) =>
    value ? (
      <UiDateText locale={dictionary.locale} value={value} />
    ) : (
      dictionary.form.notSet
    );
  const serviceStatusLabel =
    dictionary.form.serviceStatuses[
      service.status as keyof QuotationsDictionary["form"]["serviceStatuses"]
    ] || service.status;

  // Initialize fields with initialData if present
  const [event, setEvent] = useState(initialData?.event || service.eventName || service.serviceTitle);
  const [date] = useState(initialData?.date || new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(initialData?.validUntil || "");
  const [discount, setDiscount] = useState((initialData?.discount || 0).toString());
  
  const [items, setItems] = useState(
    initialData?.items && initialData.items.length > 0 
      ? initialData.items.map(i => ({
          description: i.description,
          details: i.details || "",
          category: i.category || "",
          qty: Number(i.qty),
          unitPrice: Number(i.unitPrice)
        }))
      : [{ description: "", details: "", category: "", qty: 1, unitPrice: 0 }]
  );

  const addItem = () => {
    setItems([...items, { description: "", details: "", category: "", qty: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // CLIENT-SIDE PREVIEW ONLY — PostgreSQL RPC is the source of truth
  const parsedDiscount = parseFloat(discount) || 0;
  const subtotal = items.reduce((sum, item) => sum + (Number(item.qty) * Number(item.unitPrice)), 0);
  const discountExceedsSubtotal = parsedDiscount > subtotal;
  const serviceStartedBeforeIssueDate =
    !!serviceStartDate && serviceStartDate < date;
  const validUntilExceedsServiceStart =
    !serviceStartedBeforeIssueDate && !!serviceStartDate && !!validUntil && validUntil > serviceStartDate;
  const grandTotal = subtotal - parsedDiscount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (serviceStartedBeforeIssueDate) {
      setError(dictionary.form.validation.serviceAlreadyStarted);
      return;
    }
    
    if (!validUntil) {
      setError(dictionary.form.validation.validUntilRequired);
      return;
    }

    if (new Date(validUntil) < new Date(date)) {
      setError(dictionary.form.validation.validUntilBeforeIssueDate);
      return;
    }

    if (validUntilExceedsServiceStart) {
      setError(dictionary.form.validation.validUntilAfterServiceStart);
      return;
    }

    const hasInvalidItems = items.some(i => !i.description || i.qty <= 0 || i.unitPrice < 0);
    if (hasInvalidItems) {
      setError(dictionary.form.validation.invalidItems);
      return;
    }

    if (discountExceedsSubtotal) {
      setError(dictionary.form.validation.discountExceedsSubtotal);
      return;
    }

    setIsSubmitting(true);

    const quotationPayload = {
      event,
      date,
      valid_until: validUntil,
      discount: parsedDiscount,
      items: items.map(i => ({
        description: i.description,
        details: i.details || undefined,
        category: i.category || undefined,
        qty: Number(i.qty),
        unit_price: Number(i.unitPrice)
      }))
    };

    const result = isEdit && initialData
      ? await updateQuotation(initialData.id, quotationPayload)
      : await createQuotation({ service_id: service.id, ...quotationPayload });

    if (result.success) {
      router.push("/quotations");
      router.refresh();
    } else {
        setError(
          isEdit
            ? dictionary.form.validation.failedToUpdate
            : dictionary.form.validation.failedToCreate
        );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 py-4">
        <button
          type="button"
          onClick={() => back()}
          className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-[28px] leading-[36px] font-semibold text-primary tracking-tight">
            {isEdit ? (
              <>
                {dictionary.form.editTitle}{" "}
                <span dir="ltr" className="font-mono">
                  {isolateBidiText(initialData?.quotationNumber ?? "")}
                </span>
              </>
            ) : (
              dictionary.form.newTitle
            )}
          </h2>
          <p className="text-on-surface-variant text-[14px]">
            {isEdit ? dictionary.form.editSubtitle : dictionary.form.newSubtitle}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-error-container text-on-error-container rounded-lg text-[14px]">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">{dictionary.form.basicDetails}</h3>
            
            <div className="grid grid-cols-1 gap-3 text-[14px]">
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider">
                  {dictionary.form.service}
                </div>
                <div className="font-mono font-semibold text-primary" dir="ltr">
                  {isolateBidiText(service.serviceNumber)}
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider">
                  {dictionary.form.serviceTitle}
                </div>
                <div className="font-medium text-on-surface" dir="auto">{service.serviceTitle}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider">
                    {dictionary.form.status}
                  </div>
                  <div className="font-medium text-on-surface">{serviceStatusLabel}</div>
                </div>
                <div>
                  <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider">
                    {dictionary.form.customer}
                  </div>
                  <div className="font-medium text-on-surface" dir="auto">
                    {service.customer?.company || dictionary.form.unknownCustomer}
                    {service.customer?.contact ? ` (${service.customer.contact})` : ""}
                  </div>
                </div>
              </div>
            </div>

            {hasServiceSchedule && (
              <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3">
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-2">
                  {dictionary.form.serviceSchedule}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[14px]">
                  <div>
                    <div className="text-[12px] text-on-surface-variant font-semibold">
                      {dictionary.form.startDate}
                    </div>
                    <div className="font-medium text-on-surface" dir="ltr">
                      {formatScheduleDate(service.eventStartDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant font-semibold">
                      {dictionary.form.endDate}
                    </div>
                    <div className="font-medium text-on-surface" dir="ltr">
                      {formatScheduleDate(service.eventEndDate)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.quotationEventLabel}</label>
              <input
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder={dictionary.form.quotationEventPlaceholder}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">{dictionary.form.documentDatesRates}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.issueDate}</label>
                <div className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface-variant">
                  <UiDateText locale={dictionary.locale} value={date} />
                </div>
                <p className="text-[12px] text-on-surface-variant leading-snug">
                  {dictionary.form.issueDateHint}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.validUntil}</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  min={date}
                  max={serviceStartDate}
                  disabled={serviceStartedBeforeIssueDate}
                  required={!serviceStartedBeforeIssueDate}
                  aria-invalid={validUntilExceedsServiceStart}
                  aria-describedby={validUntilExceedsServiceStart ? "valid-until-service-error" : undefined}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed"
                  dir="ltr"
                />
                <p className="text-[12px] text-on-surface-variant leading-snug">
                  {dictionary.form.validUntilHint}
                </p>
                {serviceStartedBeforeIssueDate && (
                  <p className="text-[12px] text-error leading-snug">
                    {dictionary.form.validation.serviceAlreadyStarted}
                  </p>
                )}
                {validUntilExceedsServiceStart && (
                  <p id="valid-until-service-error" className="text-[12px] text-error leading-snug">
                    {dictionary.form.validation.validUntilAfterServiceStart}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.discountSar}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  aria-invalid={discountExceedsSubtotal}
                  aria-describedby={discountExceedsSubtotal ? "discount-error" : undefined}
                  className="no-number-spinner w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  dir="ltr"
                />
                {discountExceedsSubtotal && (
                  <p id="discount-error" className="text-[12px] text-error leading-snug">
                    {dictionary.form.discountExceededHint}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">{dictionary.form.vat}</label>
                <input
                  type="text"
                  value={dictionary.form.notApplied}
                  readOnly
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface-variant focus:outline-none cursor-not-allowed"
                  title={dictionary.form.vatTitle}
                />
              </div>
            </div>

          </div>
        </div>

        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-surface-variant pb-2">
            <h3 className="font-semibold text-primary">{dictionary.form.lineItems}</h3>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 text-[14px] text-primary hover:text-primary-container font-semibold transition-colors"
            >
              <Plus size={16} /> {dictionary.form.addItem}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 p-4 bg-surface-bright border border-surface-variant rounded-lg sm:flex-row sm:items-start sm:gap-4"
              >
                <div className="min-w-0 flex-1 flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                    <div className="flex flex-col gap-1.5 md:col-span-6">
                      <label className="text-[12px] font-semibold text-on-surface-variant">{dictionary.form.description}</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder={dictionary.form.descriptionPlaceholder}
                        className="w-full min-w-0 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-3">
                      <label className="text-[12px] font-semibold text-on-surface-variant">{dictionary.form.qty}</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.qty}
                        onChange={(e) => updateItem(index, "qty", parseFloat(e.target.value) || 0)}
                        className="no-number-spinner w-full min-w-0 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                        dir="ltr"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-3">
                      <label className="text-[12px] font-semibold text-on-surface-variant">{dictionary.form.unitPriceSar}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                        className="no-number-spinner w-full min-w-0 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-semibold text-on-surface-variant">{dictionary.form.detailsCategoryOptional}</label>
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={item.details}
                        onChange={(e) => updateItem(index, "details", e.target.value)}
                        placeholder={dictionary.form.detailsPlaceholder}
                        className="min-w-0 flex-1 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                      />
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => updateItem(index, "category", e.target.value)}
                        placeholder={dictionary.form.categoryPlaceholder}
                        className="w-full min-w-0 bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:border-primary sm:w-48"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={items.length === 1}
                  className="shrink-0 self-end p-2 text-on-surface-variant hover:text-error hover:bg-error-container rounded-lg transition-colors sm:mt-6 sm:self-start disabled:opacity-50 disabled:hover:text-on-surface-variant disabled:hover:bg-transparent"
                  title={items.length === 1 ? dictionary.form.minimumOneItem : dictionary.form.removeItem}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-[12px] font-mono text-on-surface-variant bg-surface-container-low p-2 rounded border border-outline-variant/50">
            <AlertCircle size={14} className="text-primary" />
            {dictionary.form.previewOnly}
          </div>
          
          <div className="flex flex-col items-end gap-2 text-[14px] text-on-surface">
            <div className="flex justify-between w-72 gap-4">
              <span className="text-on-surface-variant">{dictionary.form.subtotal}:</span>
              <span dir="ltr" className="tabular-nums">
                {formatSarAmount(dictionary.locale, subtotal)}
              </span>
            </div>
            <div className="flex justify-between w-72 gap-4 text-error">
              <span className="text-on-surface-variant">{dictionary.form.discount}:</span>
              <span dir="ltr" className="tabular-nums">
                - {formatSarAmount(dictionary.locale, parsedDiscount)}
              </span>
            </div>
            {discountExceedsSubtotal && (
              <div className="w-72 text-[12px] text-error text-end">
                {dictionary.form.discountGreaterThanSubtotal}
              </div>
            )}
            <div className="flex justify-between w-72 gap-4">
              <span className="text-on-surface-variant">{dictionary.form.vat}:</span>
              <span>{dictionary.form.notApplied}</span>
            </div>
            <div
              className={`flex justify-between w-72 gap-4 pt-2 border-t border-outline-variant font-semibold text-[16px] ${
                discountExceedsSubtotal ? "text-error" : "text-primary"
              }`}
            >
              <span>{dictionary.form.grandTotal}:</span>
              <span dir="ltr" className="tabular-nums">
                {formatSarAmount(dictionary.locale, grandTotal)}
              </span>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={
                discountExceedsSubtotal ||
                validUntilExceedsServiceStart ||
                serviceStartedBeforeIssueDate
              }
            >
              <Save size={18} />
              {isEdit ? dictionary.form.saveChanges : dictionary.form.createQuotation}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
