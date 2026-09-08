"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getCashAdvancesDictionary,
  type CashAdvancesDictionary,
} from "@/lib/i18n/dictionaries/cash-advances";
import type { ExpenseServiceOption } from "@/lib/expenses/types";
import { requestOwnCashAdvanceAction } from "@/lib/expenses/actions";
import { X, Loader2, AlertCircle, Building2, Calendar } from "lucide-react";

interface CashAdvanceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligibleServices: ExpenseServiceOption[];
  onSuccessNotice: (message: string) => void;
  dictionary?: CashAdvancesDictionary;
}

export function CashAdvanceRequestModal({
  isOpen,
  onClose,
  eligibleServices,
  onSuccessNotice,
  dictionary: dictionaryProp,
}: CashAdvanceRequestModalProps) {
  const locale = useLocale();
  const router = useRouter();
  const dictionary = dictionaryProp ?? getCashAdvancesDictionary(locale);

  // Form states
  const [contextType, setContextType] = useState<"company" | "event">("company");
  const [serviceId, setServiceId] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");

  // Submission state
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Idempotency UUID generated for submission attempt; preserved across retry of the same attempt
  const requestIdRef = useRef<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setContextType("company");
    setServiceId("");
    setPurpose("");
    setAmountInput("");
    setErrorMessage(null);
    requestIdRef.current = null;
  };

  const handleClose = () => {
    if (isPending) return;
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client validation
    if (contextType === "event" && !serviceId) {
      setErrorMessage(dictionary.requestModal.errors.serviceRequired);
      return;
    }

    const trimmedPurpose = purpose.trim();
    if (trimmedPurpose.length < 5) {
      setErrorMessage(dictionary.requestModal.errors.purposeMin);
      return;
    }

    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage(dictionary.requestModal.errors.amountPositive);
      return;
    }

    // Round to 2 decimal places to prevent floating point artifacts
    const cleanAmount = Math.round(parsedAmount * 100) / 100;

    // Obtain or generate cryptographically suitable UUID for this attempt.
    // Fail closed if crypto.randomUUID is unavailable; never proceed with a constant fallback.
    if (!requestIdRef.current) {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        requestIdRef.current = crypto.randomUUID();
      } else {
        setErrorMessage(dictionary.requestModal.errors.genericError);
        return;
      }
    }
    const activeRequestId = requestIdRef.current;

    startTransition(async () => {
      try {
        const payload = {
          context_type: contextType,
          service_id: contextType === "event" ? serviceId : null,
          purpose: trimmedPurpose,
          amount_issued: cleanAmount,
          request_id: activeRequestId,
        };

        const result = await requestOwnCashAdvanceAction(payload);

        if (!result.success && !result.idempotentReplay) {
          // Map error codes
          const code = result.errorCode;
          if (code === "validation_error" || code === "cash_advance_request_invalid") {
            setErrorMessage(dictionary.requestModal.errors.validationError);
          } else if (code === "cash_advance_request_conflict") {
            setErrorMessage(dictionary.requestModal.errors.requestConflict);
          } else if (code === "number_generation_failed") {
            setErrorMessage(dictionary.requestModal.errors.numberGenerationFailed);
          } else {
            setErrorMessage(dictionary.requestModal.errors.genericError);
          }
          return;
        }

        // Full success or idempotent replay:
        // Reset modal, refresh router, notify parent
        resetForm();
        onClose();
        router.refresh();
        onSuccessNotice(dictionary.requestModal.successNotice);
      } catch {
        setErrorMessage(dictionary.requestModal.errors.genericError);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
          <div>
            <h2 id="modal-title" className="text-base font-bold text-on-surface">
              {dictionary.requestModal.title}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {dictionary.requestModal.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            aria-label={dictionary.requestModal.cancel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="rounded-lg border border-error bg-error-container/40 p-3 text-xs text-on-error-container flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Context Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-on-surface">
              {dictionary.requestModal.contextLabel}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setContextType("company");
                  setServiceId("");
                }}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-start transition-all ${
                  contextType === "company"
                    ? "border-primary bg-primary-container/20 text-primary ring-1 ring-primary"
                    : "border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface"
                }`}
              >
                <Building2 className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold leading-tight">
                    {dictionary.requestModal.contextCompany}
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                    {dictionary.requestModal.contextCompanyDesc}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setContextType("event")}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-start transition-all ${
                  contextType === "event"
                    ? "border-primary bg-primary-container/20 text-primary ring-1 ring-primary"
                    : "border-outline-variant bg-surface hover:bg-surface-container-low text-on-surface"
                }`}
              >
                <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold leading-tight">
                    {dictionary.requestModal.contextEvent}
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                    {dictionary.requestModal.contextEventDesc}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Service Selector (Only if context is event) */}
          {contextType === "event" && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label htmlFor="service-select" className="block text-xs font-semibold text-on-surface">
                {dictionary.requestModal.serviceLabel}{" "}
                <span className="text-error">*</span>
              </label>
              <select
                id="service-select"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
                className="w-full text-xs rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{dictionary.requestModal.selectServicePlaceholder}</option>
                {eligibleServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.serviceNumber} - {s.serviceTitle}
                    {s.eventName ? ` (${s.eventName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Purpose Input */}
          <div className="space-y-1.5">
            <label htmlFor="purpose-input" className="block text-xs font-semibold text-on-surface">
              {dictionary.requestModal.purposeLabel}{" "}
              <span className="text-error">*</span>
            </label>
            <textarea
              id="purpose-input"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={dictionary.requestModal.purposePlaceholder}
              rows={3}
              required
              minLength={5}
              className="w-full text-xs rounded-lg border border-outline-variant bg-surface p-3 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label htmlFor="amount-input" className="block text-xs font-semibold text-on-surface">
              {dictionary.requestModal.amountLabel}{" "}
              <span className="text-error">*</span>
            </label>
            <div className="relative">
              <input
                id="amount-input"
                type="number"
                step="0.01"
                min="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder={dictionary.requestModal.amountPlaceholder}
                required
                className="w-full text-sm font-mono rounded-lg border border-outline-variant bg-surface px-3 py-2 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
            </div>
            <p className="text-[11px] text-on-surface-variant">
              {dictionary.requestModal.amountHelp}
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"
            >
              {dictionary.requestModal.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg shadow-sm transition-all"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>
                {isPending
                  ? dictionary.requestModal.submitting
                  : dictionary.requestModal.submit}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
