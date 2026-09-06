"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Paperclip, Plus, Trash2, Layers } from "lucide-react";
import Button from "@/components/ui/Button";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { resolveRecordTitle } from "@/lib/i18n/record-title";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { Locale } from "@/lib/i18n/locales";
import type { SuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { recordSupplierQuotationEvidence } from "@/lib/procurement/actions";
import type {
  SupplierQuotationRequirementOption,
  SupplierQuotationServiceOption,
} from "@/lib/procurement/types";

type Dictionary = SuppliersDictionary["quotationHistory"];

type LineItemState = {
  id: string;
  packageRequirementId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineTotal: string;
};

type Props = {
  locale?: Locale;
  supplierId: string;
  requirements?: SupplierQuotationRequirementOption[];
  requirementsLoadError?: boolean;
  canWriteDocuments: boolean;
  returnTo: string;
  dictionary: Dictionary;
  contextualService?: SupplierQuotationRequirementOption | SupplierQuotationServiceOption | null;
  packageRequirements?: Array<{ id: string; title: string; sortOrder: number }>;
  eligibleServices?: SupplierQuotationServiceOption[];
  packageContext?: { packageId: string; packageTitle: string } | null;
};

function generateLineId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `line_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export default function SupplierQuotationForm({
  locale = "en",
  supplierId,
  requirements = [],
  requirementsLoadError = false,
  canWriteDocuments,
  returnTo,
  dictionary,
  contextualService,
  packageRequirements = [],
  eligibleServices,
  packageContext,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const services: SupplierQuotationServiceOption[] = (() => {
    let list =
      eligibleServices && eligibleServices.length > 0
        ? [...eligibleServices]
        : Array.from(
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

    if (contextualService && !list.some((s) => s.serviceId === contextualService.serviceId)) {
      list = [
        ...list,
        {
          serviceId: contextualService.serviceId,
          serviceNumber: contextualService.serviceNumber,
          serviceTitle: contextualService.serviceTitle,
          eventName: contextualService.eventName,
          status: "status" in contextualService ? (contextualService.status as string) : "",
        },
      ];
    }
    return list;
  })();

  const [serviceId, setServiceId] = useState(
    contextualService?.serviceId ?? (services.length === 1 ? services[0].serviceId : ""),
  );
  const [pricingMode, setPricingMode] = useState<"detailed" | "total_only">(
    packageRequirements.length > 0 ? "detailed" : "total_only",
  );
  const [supplierReference, setSupplierReference] = useState("");
  const [packageTotal, setPackageTotal] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dateValue, setDateValue] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  // Initialize draft quotation lines exactly once from Package Requirements if present
  const [lines, setLines] = useState<LineItemState[]>(() => {
    if (packageRequirements && packageRequirements.length > 0) {
      return packageRequirements.map((req) => ({
        id: generateLineId(),
        packageRequirementId: req.id,
        description: req.title,
        quantity: "",
        unit: "",
        unitPrice: "",
        lineTotal: "",
      }));
    }
    return [
      {
        id: "1",
        packageRequirementId: "",
        description: "",
        quantity: "",
        unit: "",
        unitPrice: "",
        lineTotal: "",
      },
    ];
  });

  const [highlightedLineId, setHighlightedLineId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(function handleHighlightLine() {
    if (!highlightedLineId) return;

    const lineElement = document.getElementById(`quotation-line-${highlightedLineId}`);
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const firstInput = lineElement.querySelector<HTMLInputElement>("input[type='text'], input:not([type='hidden'])");
      if (firstInput) {
        firstInput.focus({ preventScroll: true });
      }
    }

    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedLineId(null);
    }, 2000);

    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, [highlightedLineId]);

  const isServiceLocked = Boolean(packageContext && serviceId);
  const selectedService = services.find((s) => s.serviceId === serviceId);

  const detailedSubtotal = lines.reduce((sum, line) => {
    const val = Number(line.lineTotal);
    return sum + (Number.isFinite(val) && val >= 0 ? val : 0);
  }, 0);

  const existingReqIds = new Set(lines.map((l) => l.packageRequirementId).filter(Boolean));
  const missingRequirementsCount = packageRequirements.filter((req) => !existingReqIds.has(req.id)).length;
  const allRequirementsRepresented = packageRequirements.length > 0 && missingRequirementsCount === 0;

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

  function addLine() {
    clearRequestId();
    const newId = generateLineId();
    setLines((prev) => [
      ...prev,
      {
        id: newId,
        packageRequirementId: "",
        description: "",
        quantity: "",
        unit: "",
        unitPrice: "",
        lineTotal: "",
      },
    ]);
    setHighlightedLineId(newId);
  }

  function removeLine(id: string) {
    clearRequestId();
    setLines((prev) => (prev.length > 1 ? prev.filter((line) => line.id !== id) : prev));
  }

  function updateLine(id: string, field: keyof LineItemState, value: string) {
    clearRequestId();
    setLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const updated = { ...line, [field]: value };

        // Auto-reconcile lineTotal when quantity and unitPrice are entered
        if (field === "quantity" || field === "unitPrice") {
          const qty = field === "quantity" ? Number(value) : Number(line.quantity);
          const price = field === "unitPrice" ? Number(value) : Number(line.unitPrice);
          if (Number.isFinite(qty) && qty > 0 && Number.isFinite(price) && price >= 0) {
            updated.lineTotal = (Math.round(qty * price * 100) / 100).toFixed(2);
          }
        }
        return updated;
      }),
    );
  }

  function addFromPackageRequirements() {
    clearRequestId();
    if (packageRequirements.length === 0) return;

    setLines((prev) => {
      const currentReqIds = new Set(prev.map((l) => l.packageRequirementId).filter(Boolean));
      const toAdd = packageRequirements
        .filter((req) => !currentReqIds.has(req.id))
        .map((req) => ({
          id: generateLineId(),
          packageRequirementId: req.id,
          description: req.title,
          quantity: "",
          unit: "",
          unitPrice: "",
          lineTotal: "",
        }));

      if (toAdd.length === 0) return prev;
      setHighlightedLineId(toAdd[0].id);
      // If the only line is empty, replace it
      if (prev.length === 1 && !prev[0].description && !prev[0].lineTotal) {
        return toAdd;
      }
      return [...prev, ...toAdd];
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!serviceId) {
      setFeedback({ kind: "error", text: dictionary.chooseService });
      return;
    }

    if (pricingMode === "detailed") {
      if (lines.length === 0) {
        setFeedback({ kind: "error", text: dictionary.linesRequired });
        return;
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.description.trim()) {
          setFeedback({ kind: "error", text: `${dictionary.itemDescription} (${i + 1}): ${dictionary.linesRequired}` });
          return;
        }
        const totalNum = Number(line.lineTotal);
        if (
          !Number.isFinite(totalNum) ||
          totalNum < 0 ||
          totalNum > 999999999999.99 ||
          Math.round(totalNum * 100) / 100 !== totalNum
        ) {
          setFeedback({ kind: "error", text: `${dictionary.lineTotal} (${i + 1}): ${dictionary.reconciliationMismatch}` });
          return;
        }

        if (line.quantity) {
          const qty = Number(line.quantity);
          if (
            !Number.isFinite(qty) ||
            qty <= 0 ||
            qty > 999999999.99 ||
            Math.round(qty * 100) / 100 !== qty
          ) {
            setFeedback({ kind: "error", text: `${dictionary.quantity} (${i + 1}): ${dictionary.reconciliationMismatch}` });
            return;
          }
        }

        if (line.unitPrice) {
          const price = Number(line.unitPrice);
          if (
            !Number.isFinite(price) ||
            price < 0 ||
            price > 999999999999.99 ||
            Math.round(price * 100) / 100 !== price
          ) {
            setFeedback({ kind: "error", text: `${dictionary.unitPrice} (${i + 1}): ${dictionary.reconciliationMismatch}` });
            return;
          }
        }

        // Strict deterministic reconciliation check when both quantity and unitPrice are given
        if (line.quantity && line.unitPrice) {
          const qty = Number(line.quantity);
          const price = Number(line.unitPrice);
          const computed = Math.round(qty * price * 100) / 100;
          if (computed !== totalNum) {
            setFeedback({ kind: "error", text: `${dictionary.reconciliationMismatch} (${i + 1})` });
            return;
          }
        }
      }
    } else {
      const totalNum = Number(packageTotal);
      if (
        !Number.isFinite(totalNum) ||
        totalNum < 0 ||
        totalNum > 999999999999.99 ||
        !packageTotal ||
        Math.round(totalNum * 100) / 100 !== totalNum
      ) {
        setFeedback({ kind: "error", text: dictionary.totalRequired });
        return;
      }
    }

    const formData = new FormData(event.currentTarget);
    formData.set("supplierId", supplierId);
    formData.set("serviceId", serviceId);
    formData.set("supplierReference", supplierReference.trim());
    formData.set("quotationDate", dateValue);
    formData.set("pricingMode", pricingMode);
    formData.set("requestId", getRequestId());

    if (pricingMode === "detailed") {
      const computedTotal = lines.reduce(
        (sum, l) => Math.round((sum + Number(l.lineTotal)) * 100) / 100,
        0,
      );
      formData.set("packageTotal", String(computedTotal));
      formData.set("requirements", JSON.stringify([]));
      formData.set(
        "lines",
        JSON.stringify(
          lines.map((line, index) => ({
            packageRequirementId: line.packageRequirementId || null,
            description: line.description.trim(),
            quantity: line.quantity ? Number(line.quantity) : null,
            unit: line.unit.trim() || null,
            unitPrice: line.unitPrice ? Number(line.unitPrice) : null,
            lineTotal: Number(line.lineTotal),
            sortOrder: index,
          })),
        ),
      );
    } else {
      formData.set("packageTotal", packageTotal);
      formData.set("requirements", JSON.stringify([]));
      formData.set("lines", JSON.stringify([]));
    }

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

      {services.length === 0 && !contextualService ? (
        <p className="rounded-lg border border-dashed border-outline-variant p-5 text-[13px] text-on-surface-variant">
          {dictionary.noEligibleServices || dictionary.noRequirements}
        </p>
      ) : (
        <>
          {/* Procurement Package Context Callout */}
          {packageContext && (
            <div className="flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-[14px]">
              <Layers size={18} className="shrink-0 text-primary" aria-hidden="true" />
              <div>
                <span className="font-semibold text-primary">
                  {locale === "ar" ? "باقة التوريد: " : "Procurement Package: "}
                </span>
                <span className="font-medium text-on-surface" dir="auto">
                  {packageContext.packageTitle}
                </span>
              </div>
            </div>
          )}

          {/* Service Selection */}
          <section className="rounded-lg border border-outline-variant bg-surface p-5">
            <h2 className="text-[15px] font-semibold text-primary">{dictionary.serviceSelection}</h2>
            {isServiceLocked && selectedService ? (
              <div className="mt-3 rounded-lg border border-surface-variant bg-surface-container-low p-3.5">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  {dictionary.serviceLabel}
                </p>
                <p className="mt-1 text-[14px] font-semibold text-primary" dir="auto">
                  {isolateBidiText(selectedService.serviceNumber)} ·{" "}
                  {isolateBidiText(resolveRecordTitle(locale, selectedService.serviceTitle, selectedService.eventName))}
                </p>
                <input type="hidden" name="serviceId" value={serviceId} />
              </div>
            ) : (
              <label className="mt-3 block text-[13px] font-semibold text-on-surface">
                {dictionary.serviceLabel}
                <select
                  required
                  value={serviceId}
                  onChange={(event) => changeService(event.target.value)}
                  className={inputClass()}
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
            )}
          </section>

          {/* Pricing Mode Toggle */}
          <section className="rounded-lg border border-outline-variant bg-surface p-5">
            <h2 className="text-[15px] font-semibold text-primary">{dictionary.pricingMode}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPricingMode("detailed");
                  clearRequestId();
                }}
                className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                  pricingMode === "detailed"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
                }`}
              >
                {dictionary.detailedItems}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPricingMode("total_only");
                  clearRequestId();
                }}
                className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-colors ${
                  pricingMode === "total_only"
                    ? "bg-primary text-on-primary shadow-sm"
                    : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container-low"
                }`}
              >
                {dictionary.totalOnly}
              </button>
            </div>
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
                  className={inputClass()}
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

              {pricingMode === "total_only" && (
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
                    placeholder={dictionary.packageTotalPlaceholder}
                    className={`${inputClass()} tabular-nums`}
                    dir="ltr"
                    disabled={isPending}
                  />
                </label>
              )}
            </div>
          </section>

          {/* Mode A: Detailed Itemized Lines */}
          {pricingMode === "detailed" && (
            <section className="rounded-lg border border-outline-variant bg-surface p-5 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-surface-variant pb-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-primary">{dictionary.detailedItems}</h2>
                  <p className="text-[12px] text-on-surface-variant">
                    {lines.length} {dictionary.detailedPricing} · {dictionary.quotationTotal}:{" "}
                    <strong className="font-semibold text-on-surface" dir="ltr">
                      {formatSarAmount(locale, detailedSubtotal)}
                    </strong>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {packageRequirements.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFromPackageRequirements}
                      disabled={isPending || allRequirementsRepresented}
                      className="gap-1 text-[12px]"
                      title={allRequirementsRepresented ? dictionary.allRequirementsAdded : undefined}
                    >
                      <Layers size={13} aria-hidden="true" />
                      <span>
                        {allRequirementsRepresented
                          ? dictionary.allRequirementsAdded
                          : dictionary.addFromRequirements}
                      </span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLine}
                    disabled={isPending || lines.length >= 100}
                    className="gap-1 text-[12px]"
                  >
                    <Plus size={13} aria-hidden="true" />
                    <span>{dictionary.addLine}</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div
                    key={line.id}
                    id={`quotation-line-${line.id}`}
                    data-highlighted={highlightedLineId === line.id ? "true" : undefined}
                    className={`rounded-lg border bg-surface-container-lowest p-3 sm:p-4 space-y-3 transition-all duration-500 ${
                      highlightedLineId === line.id
                        ? "border-primary ring-2 ring-primary/30 shadow-md bg-primary/5"
                        : "border-surface-variant"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[12px] font-semibold text-on-surface-variant">#{index + 1}</span>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          disabled={isPending}
                          className="rounded p-1 text-on-surface-variant hover:text-error"
                          aria-label={dictionary.removeLine}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <label className="text-[13px] font-medium text-on-surface sm:col-span-2">
                        {dictionary.itemDescription}
                        <input
                          type="text"
                          required
                          maxLength={2000}
                          value={line.description}
                          onChange={(e) => updateLine(line.id, "description", e.target.value)}
                          placeholder={dictionary.itemDescription}
                          className={inputClass()}
                          dir="auto"
                          disabled={isPending}
                        />
                      </label>

                      {packageRequirements.length > 0 && (
                        <label className="text-[12px] font-medium text-on-surface sm:col-span-2">
                          {dictionary.packageRequirement}
                          <select
                            value={line.packageRequirementId}
                            onChange={(e) => updateLine(line.id, "packageRequirementId", e.target.value)}
                            className={inputClass()}
                            disabled={isPending}
                            dir="auto"
                          >
                            <option value="">{dictionary.unlinkedLine}</option>
                            {packageRequirements.map((pr) => (
                              <option key={pr.id} value={pr.id}>
                                {pr.title}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[12px] font-medium text-on-surface">
                          {dictionary.quantity}
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.id, "quantity", e.target.value)}
                            className={`${inputClass()} tabular-nums`}
                            dir="ltr"
                            disabled={isPending}
                          />
                        </label>
                        <label className="text-[12px] font-medium text-on-surface">
                          {dictionary.unit}
                          <input
                            type="text"
                            maxLength={50}
                            value={line.unit}
                            onChange={(e) => updateLine(line.id, "unit", e.target.value)}
                            placeholder="e.g., Day / Set"
                            className={inputClass()}
                            dir="auto"
                            disabled={isPending}
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[12px] font-medium text-on-surface">
                          {dictionary.unitPrice}
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(line.id, "unitPrice", e.target.value)}
                            className={`${inputClass()} tabular-nums`}
                            dir="ltr"
                            disabled={isPending}
                          />
                        </label>
                        <label className="text-[12px] font-semibold text-on-surface">
                          {dictionary.lineTotal}
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={line.lineTotal}
                            onChange={(e) => updateLine(line.id, "lineTotal", e.target.value)}
                            className={`${inputClass()} font-semibold tabular-nums`}
                            dir="ltr"
                            disabled={isPending}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}



          {/* Document Attachments */}
          <section className="rounded-lg border border-outline-variant bg-surface p-5">
            <span className="block text-[13px] font-semibold text-on-surface">{dictionary.originalDocuments}</span>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label
                htmlFor="quotation-files-input"
                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors ${
                  isPending || !canWriteDocuments
                    ? "cursor-not-allowed border-outline-variant/60 bg-surface-container-low text-on-surface-variant/60"
                    : "cursor-pointer border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40"
                }`}
              >
                <Paperclip size={16} className="shrink-0 text-primary" aria-hidden="true" />
                <span>{dictionary.chooseFiles}</span>
              </label>
              <input
                ref={fileInputRef}
                id="quotation-files-input"
                name="files"
                type="file" multiple
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                className="sr-only"
                disabled={isPending || !canWriteDocuments}
                onChange={handleFileChange}
              />
              <div className="min-w-0 flex-1 text-[13px] text-on-surface-variant">
                {selectedFiles.length === 0 ? (
                  <span className="text-on-surface-variant">{dictionary.noFilesSelected}</span>
                ) : (
                  <span className="font-mono text-[12px] text-on-surface break-all" dir="auto">
                    {selectedFiles.map((file) => file.name).join(", ")}
                  </span>
                )}
              </div>
            </div>
            <p className="mt-2 text-[12px] text-on-surface-variant">{dictionary.documentHelper}</p>
          </section>

          {/* Submission Feedback & Button */}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={isPending} loadingLabel={dictionary.saving}>
              {dictionary.save}
            </Button>
            {feedback && (
              <p
                className={feedback.kind === "error" ? "text-[13px] text-error" : "text-[13px] text-emerald-700"}
                role={feedback.kind === "error" ? "alert" : "status"}
              >
                {feedback.text}
              </p>
            )}
          </div>
        </>
      )}
    </form>
  );
}

function inputClass() {
  return "mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-60";
}
