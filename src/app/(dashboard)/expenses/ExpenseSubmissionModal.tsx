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

    const formData = new FormData();
    formData.append("context_type", contextType);
    if (contextType === "event" && serviceId) {
      formData.append("service_id", serviceId);
    }
    formData.append("expense_category", category);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/40">
          <div>
            <h2 id="expense-modal-title" className="text-lg font-bold tracking-tight">
              {dictionary.submissionModal.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dictionary.submissionModal.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={dictionary.submissionModal.cancel}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Context Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
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
                className={`flex items-center justify-center py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  contextType === "company"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {dictionary.submissionModal.contextCompany}
              </button>
              <button
                type="button"
                onClick={() => setContextType("event")}
                disabled={isPending}
                className={`flex items-center justify-center py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                  contextType === "event"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {dictionary.submissionModal.contextEvent}
              </button>
            </div>
          </div>

          {/* Service Dropdown (Event Context) */}
          {contextType === "event" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {dictionary.submissionModal.serviceLabel} *
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
              <label className="text-xs font-semibold text-foreground">
                {dictionary.submissionModal.categoryLabel} *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">{dictionary.submissionModal.categoryPlaceholder}</option>
                {Object.entries(dictionary.categories).map(([catKey, catLabel]) => (
                  <option key={catKey} value={catKey}>
                    {catLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
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
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Date & Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {dictionary.submissionModal.dateLabel} *
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              disabled={isPending}
              dir="ltr"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {dictionary.submissionModal.descriptionLabel} *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              placeholder={dictionary.submissionModal.descriptionPlaceholder}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>

          {/* Receipt Upload Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
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
                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/60 hover:bg-muted/20 transition-all ${
                  isPending ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-xs font-semibold text-primary">
                  {dictionary.submissionModal.chooseFile}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  {dictionary.submissionModal.receiptHint}
                </span>
              </label>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium truncate" dir="ltr">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground" dir="ltr">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isPending}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                >
                  {dictionary.submissionModal.removeFile}
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              {dictionary.submissionModal.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all disabled:opacity-50 shadow-xs"
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
