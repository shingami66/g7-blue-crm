"use client";

import { useState, useTransition, useRef } from "react";
import { X, UploadCloud, FileText, AlertCircle, Loader2 } from "lucide-react";
import type { ExpensesDictionary } from "@/lib/i18n/dictionaries/expenses";
import type { ExpenseServiceOption } from "@/lib/expenses/types";
import { submitSelfServiceExpenseWithReceiptAction } from "@/lib/expenses/actions";
import type { Locale } from "@/lib/i18n/locales";

interface ExpenseSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: {
    expenseId: string;
    expenseNumber: string;
    outcome: "full_success" | "partial_success";
    receiptError?: string;
  }) => void;
  eligibleServices: ExpenseServiceOption[];
  dictionary: ExpensesDictionary;
  locale: Locale;
}

export function ExpenseSubmissionModal({
  isOpen,
  onClose,
  onSuccess,
  eligibleServices,
  dictionary,
  locale,
}: ExpenseSubmissionModalProps) {
  const [contextType, setContextType] = useState<"company" | "event">("company");
  const [serviceId, setServiceId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef<string>(crypto.randomUUID());

  if (!isOpen) {
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Size check (25 MB)
      if (file.size > 25 * 1024 * 1024) {
        setError(
          locale === "ar"
            ? "حجم الملف يتجاوز الحد الأقصى المسموح (25 ميجابايت)"
            : "File size exceeds 25 MB limit"
        );
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      // MIME check
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowed.includes(file.type)) {
        setError(
          locale === "ar"
            ? "نوع الملف غير مدعوم. يرجى اختيار PDF أو JPEG أو PNG"
            : "Unsupported file type. Please upload a PDF, JPEG, or PNG"
        );
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      setError(null);
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client validation
    if (contextType === "event" && !serviceId) {
      setError(
        locale === "ar"
          ? "يرجى تحديد الفعالية / الخدمة التابعة لهذا المصروف"
          : "Please select the Event or Service associated with this expense"
      );
      return;
    }

    if (!category) {
      setError(
        locale === "ar"
          ? "يرجى اختيار تصنيف المصروف"
          : "Please select an expense category"
      );
      return;
    }

    if (category === "other" && !customCategory.trim()) {
      setError(
        dictionary.submissionModal.customCategoryRequired ??
          (locale === "ar"
            ? "يرجى تحديد التصنيف عند اختيار 'أخرى'"
            : "Please specify the custom category")
      );
      return;
    }

    if (category === "other" && customCategory.trim().length > 100) {
      setError(
        locale === "ar"
          ? "يجب ألا يتجاوز التصنيف 100 حرف"
          : "Custom category cannot exceed 100 characters"
      );
      return;
    }

    if (!description.trim()) {
      setError(
        locale === "ar"
          ? "يرجى إدخال وصف المصروف"
          : "Please provide a description of the expense"
      );
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError(
        locale === "ar"
          ? "يرجى إدخال مبلغ صحيح أكبر من الصفر"
          : "Please enter a valid amount greater than zero"
      );
      return;
    }

    if (!expenseDate) {
      setError(
        locale === "ar"
          ? "يرجى تحديد تاريخ المصروف"
          : "Please specify the expense date"
      );
      return;
    }

    if (!selectedFile) {
      setError(
        locale === "ar"
          ? "يرجى إرفاق إيصال المصروف"
          : "Please attach a receipt document"
      );
      return;
    }

    const effectiveCategory = category === "other" ? customCategory.trim() : category;

    const formData = new FormData();
    formData.append("context_type", contextType);
    if (contextType === "event" && serviceId) {
      formData.append("service_id", serviceId);
    }
    formData.append("expense_category", effectiveCategory);
    formData.append("description", description.trim());
    formData.append("amount", amount);
    formData.append("expense_date", expenseDate);
    formData.append("receipt", selectedFile);
    formData.append("request_id", requestIdRef.current);

    startTransition(async () => {
      try {
        const result = await submitSelfServiceExpenseWithReceiptAction(formData);
        if (!result.success || !result.data || result.data.outcome === "validation_error") {
          setError(result.error ?? result.data?.warning ?? "Failed to submit expense");
          return;
        }

        requestIdRef.current = crypto.randomUUID();
        onSuccess({
          expenseId: result.data.expenseId,
          expenseNumber: result.data.expenseNumber,
          outcome: result.data.outcome,
          receiptError: result.data.warning,
        });
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl overflow-hidden my-4 sm:my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-5 sm:px-6 py-4 bg-surface-container-low shrink-0">
          <div>
            <h2 id="expense-modal-title" className="text-lg font-bold tracking-tight text-on-surface">
              {dictionary.submissionModal.title}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {dictionary.submissionModal.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            aria-label={dictionary.submissionModal.cancel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-lg border border-error bg-error-container/40 p-3 text-xs text-on-error-container flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Context Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">
              {dictionary.submissionModal.contextLabel}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setContextType("company");
                  setServiceId("");
                }}
                disabled={isPending}
                className={`flex items-center justify-center py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                  contextType === "company"
                    ? "border-primary bg-primary text-on-primary font-semibold shadow-sm"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                {dictionary.submissionModal.contextCompany}
              </button>
              <button
                type="button"
                onClick={() => setContextType("event")}
                disabled={isPending}
                className={`flex items-center justify-center py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                  contextType === "event"
                    ? "border-primary bg-primary text-on-primary font-semibold shadow-sm"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                {dictionary.submissionModal.contextEvent}
              </button>
            </div>
          </div>

          {/* Service Dropdown (Event Context) */}
          {contextType === "event" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface">
                {dictionary.submissionModal.serviceLabel} *
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">{dictionary.submissionModal.servicePlaceholder}</option>
                {eligibleServices.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.serviceNumber} — {svc.eventName || svc.serviceTitle || svc.serviceNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category & Amount in Two Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface">
                {dictionary.submissionModal.categoryLabel} *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (e.target.value !== "other") {
                    setCustomCategory("");
                  }
                }}
                disabled={isPending}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">{dictionary.submissionModal.categoryPlaceholder}</option>
                {Object.entries(dictionary.categories).map(([catKey, catLabel]) => (
                  <option key={catKey} value={catKey}>
                    {catLabel}
                  </option>
                ))}
              </select>

              {/* Custom category input when "other" is selected */}
              {category === "other" && (
                <div className="space-y-1 pt-1.5">
                  <label className="text-xs font-semibold text-on-surface">
                    {dictionary.submissionModal.customCategoryLabel} *
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    disabled={isPending}
                    placeholder={dictionary.submissionModal.customCategoryPlaceholder}
                    className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-on-surface">
                {dictionary.submissionModal.amountLabel} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isPending}
                  dir="ltr"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Date & Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">
              {dictionary.submissionModal.dateLabel} *
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              disabled={isPending}
              dir="ltr"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">
              {dictionary.submissionModal.descriptionLabel} *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              placeholder={dictionary.submissionModal.descriptionPlaceholder}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* Receipt Upload Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-on-surface">
              {dictionary.submissionModal.receiptLabel} *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              disabled={isPending}
              className="hidden"
              id="receipt-file-input"
            />

            {!selectedFile ? (
              <label
                htmlFor="receipt-file-input"
                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed border-outline-variant rounded-xl cursor-pointer hover:border-primary/60 hover:bg-surface-container-low transition-all ${
                  isPending ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <UploadCloud className="w-8 h-8 text-on-surface-variant mb-2" />
                <span className="text-xs font-semibold text-primary">
                  {dictionary.submissionModal.chooseFile}
                </span>
                <span className="text-[11px] text-on-surface-variant mt-1">
                  {dictionary.submissionModal.receiptHint}
                </span>
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant bg-surface-container-low">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-on-surface truncate" dir="ltr">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-on-surface-variant" dir="ltr">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isPending}
                  className="text-xs text-error hover:underline font-medium px-2 py-1 rounded transition-colors"
                >
                  {dictionary.submissionModal.removeFile}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              {dictionary.submissionModal.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-medium hover:bg-primary/90 transition-all disabled:opacity-50 shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{dictionary.submissionModal.submitting}</span>
                </>
              ) : (
                <span>{dictionary.submissionModal.submit}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
