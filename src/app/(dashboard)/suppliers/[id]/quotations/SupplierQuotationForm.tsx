"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Paperclip } from "lucide-react";
import Button from "@/components/ui/Button";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { resolveRecordTitle } from "@/lib/i18n/record-title";
import type { Locale } from "@/lib/i18n/locales";
import { getCommonDictionary } from "@/lib/i18n/dictionaries/common";
import type { SuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { recordSupplierQuotationEvidence } from "@/lib/procurement/actions";
import type {
  SupplierQuotationRequirementOption,
  SupplierQuotationServiceOption,
} from "@/lib/procurement/types";

type Dictionary = SuppliersDictionary["quotationHistory"];

type Props = {
  locale?: Locale;
  supplierId: string;
  requirements?: SupplierQuotationRequirementOption[];
  requirementsLoadError?: boolean;
  canWriteDocuments: boolean;
  returnTo: string;
  dictionary: Dictionary;
};

export default function SupplierQuotationForm({
  locale = "en",
  supplierId,
  requirements = [],
  requirementsLoadError = false,
  canWriteDocuments,
  returnTo,
  dictionary,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const services: SupplierQuotationServiceOption[] = Array.from(
    new Map(
      requirements
        .filter((r) => r.serviceId)
        .map((r) => [
          r.serviceId,
          {
            serviceId: r.serviceId,
            serviceNumber: r.serviceNumber,
            serviceTitle: r.serviceTitle,
            eventName: r.eventName,
            status: "status" in r ? (r.status as string) : "",
          },
        ]),
    ).values(),
  );

  const [serviceId, setServiceId] = useState(services.length === 1 ? services[0].serviceId : "");
  const [supplierReference, setSupplierReference] = useState("");
  const [packageTotal, setPackageTotal] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dateValue, setDateValue] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  function getRequestId() {
    requestIdRef.current ??= globalThis.crypto.randomUUID();
    return requestIdRef.current;
  }

  function clearRequestId() {
    requestIdRef.current = null;
  }

  function changeService(nextServiceId: string) {
    setServiceId(nextServiceId);
    clearRequestId();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    clearRequestId();
    const fileList = event.target.files;
    setSelectedFiles(fileList ? Array.from(fileList) : []);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!serviceId) {
      setFeedback({ kind: "error", text: dictionary.chooseService });
      return;
    }

    const totalNum = Number(packageTotal);
    if (
      !Number.isFinite(totalNum) ||
      totalNum < 0 ||
      totalNum > 999999999999.99 ||
      !packageTotal ||
      Math.round(totalNum * 100) / 100 !== totalNum
    ) {
      setFeedback({ kind: "error", text: dictionary.actionFailed });
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("supplierId", supplierId);
    formData.set("serviceId", serviceId);
    formData.set("supplierReference", supplierReference.trim());
    formData.set("quotationDate", dateValue);
    formData.set("packageTotal", packageTotal);
    formData.set("requirements", JSON.stringify([]));
    formData.set("lines", JSON.stringify([]));
    formData.set("requestId", getRequestId());

    startTransition(async () => {
      const result = await recordSupplierQuotationEvidence(formData);
      if (!result.success) {
        if (result.code === "INVALID_INPUT") clearRequestId();
        setFeedback({ kind: "error", text: dictionary.actionFailed });
        return;
      }

      clearRequestId();
      setFeedback({ kind: "success", text: dictionary.saved });
      formRef.current?.reset();
      setSelectedFiles([]);
      setDateValue("");
      router.push(
        `/suppliers/${supplierId}/quotations/${result.data.quotationId}?returnTo=${encodeURIComponent(returnTo)}`,
      );
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      {requirementsLoadError && (
        <p className="rounded-lg border border-error/30 bg-error-container/30 p-4 text-[13px] text-error" role="alert">
          {dictionary.requirementsLoadFailed}
        </p>
      )}

      {services.length === 0 ? (
        <p className="rounded-lg border border-dashed border-outline-variant p-5 text-[13px] text-on-surface-variant">
          {dictionary.noRequirements}
        </p>
      ) : (
        <>
          {/* Service Selection */}
          <section className="rounded-lg border border-outline-variant bg-surface p-5">
            <h2 className="text-[15px] font-semibold text-primary">{dictionary.serviceSelection}</h2>
            <label className="mt-3 block text-[13px] font-semibold text-on-surface">
              {dictionary.serviceLabel}
              <select
                required
                value={serviceId}
                onChange={(event) => changeService(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
                disabled={isPending}
                dir="auto"
              >
                <option value="">{dictionary.selectServicePlaceholder}</option>
                {services.map((service) => (
                  <option key={service.serviceId} value={service.serviceId}>
                    {isolateBidiText(service.serviceNumber)} ·{" "}
                    {isolateBidiText(resolveRecordTitle(locale, service.serviceTitle, service.eventName))}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {/* Header Metadata */}
          <section className="rounded-lg border border-outline-variant bg-surface p-5">
            <h2 className="text-[15px] font-semibold text-primary">{dictionary.recordTitle}</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-[13px] font-semibold text-on-surface">
                {dictionary.supplierReference}
                <input
                  name="supplierReference"
                  required
                  maxLength={255}
                  value={supplierReference}
                  onChange={(e) => {
                    setSupplierReference(e.target.value);
                    clearRequestId();
                  }}
                  placeholder={dictionary.supplierReferencePlaceholder}
                  className="mt-1 block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
                  dir="auto"
                  disabled={isPending}
                />
              </label>

              <div>
                <label htmlFor="quotation-date-input" className="block text-[13px] font-semibold text-on-surface">
                  {dictionary.quotationDate}
                </label>
                <div className="relative mt-1" dir="ltr">
                  <input
                    id="quotation-date-input"
                    name="quotationDate"
                    type="text"
                    required
                    inputMode="numeric"
                    value={dateValue}
                    onChange={(event) => {
                      setDateValue(event.target.value);
                      clearRequestId();
                    }}
                    placeholder={dictionary.quotationDatePlaceholder}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 pe-10 text-[14px] font-mono text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
                    dir="ltr"
                    disabled={isPending}
                    pattern="\d{4}-\d{2}-\d{2}"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        dateInputRef.current?.showPicker();
                      } catch {
                        dateInputRef.current?.focus();
                      }
                    }}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-on-surface-variant hover:text-primary focus:outline-none focus-visible:text-primary disabled:opacity-60"
                    disabled={isPending}
                    aria-label={dictionary.openCalendar}
                  >
                    <Calendar size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <input
                ref={dateInputRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                value={dateValue}
                onChange={(event) => {
                  setDateValue(event.target.value);
                  clearRequestId();
                }}
                disabled={isPending}
                className="sr-only"
              />

              <label className="text-[13px] font-semibold text-on-surface sm:max-w-xs">
                {dictionary.packageTotal}
                <input
                  name="packageTotal"
                  required
                  inputMode="decimal"
                  value={packageTotal}
                  onChange={(e) => {
                    setPackageTotal(e.target.value);
                    clearRequestId();
                  }}
                  placeholder="0.00"
                  className="mt-1 block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-mono text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60"
                  dir="ltr"
                  disabled={isPending}
                />
              </label>
            </div>
          </section>

          {/* File Attachments */}
          <section className="rounded-lg border border-outline-variant bg-surface p-5">
            <h2 className="text-[15px] font-semibold text-primary">{dictionary.originalDocuments}</h2>
            <div className="mt-3">
              <input
                ref={fileInputRef}
                id="quotation-files-input"
                type="file"
                name="files"
                multiple
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="sr-only"
                disabled={isPending || !canWriteDocuments}
              />
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor="quotation-files-input"
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-outline-variant bg-surface px-4 py-2 text-[13px] font-semibold text-primary hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    !canWriteDocuments || isPending ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <Paperclip size={16} aria-hidden="true" />
                  {dictionary.chooseFiles}
                </label>
                <span className="text-[13px] text-on-surface-variant">
                  {selectedFiles.length > 0
                    ? selectedFiles.map((file) => file.name).join(", ")
                    : dictionary.noFilesSelected}
                </span>
              </div>
            </div>
          </section>

          {feedback && (
            <p
              className={`rounded-lg p-4 text-[13px] ${
                feedback.kind === "error"
                  ? "border border-error/30 bg-error-container/30 text-error"
                  : "border border-primary/30 bg-primary-container/30 text-primary"
              }`}
              role="alert"
            >
              {feedback.text}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(returnTo)}
              disabled={isPending}
            >
              {getCommonDictionary(locale).actions.cancel}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? dictionary.saving : dictionary.save}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
