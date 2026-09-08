"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  Camera,
  RotateCcw,
  Check,
  Smartphone,
} from "lucide-react";
import type { ExpensesDictionary } from "@/lib/i18n/dictionaries/expenses";
import type { ExpenseServiceOption } from "@/lib/expenses/types";
import { submitSelfServiceExpenseWithReceiptAction } from "@/lib/expenses/actions";
import {
  startRearCameraStream,
  stopMediaStream,
  captureVideoFrameToFile,
  isAllowedReceiptFile,
} from "@/lib/expenses/receipt-camera";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Camera state
  const [cameraMode, setCameraMode] = useState<"idle" | "live" | "captured">("idle");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef<string>(crypto.randomUUID());

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      stopMediaStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    setCameraStream(null);
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
      setCapturedPreviewUrl(null);
    }
    setCapturedFile(null);
    setCameraMode("idle");
    setCameraStarting(false);
    setCameraError(null);
  }, [capturedPreviewUrl]);

  // Clean up camera stream on component unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        stopMediaStream(mediaStreamRef.current);
        mediaStreamRef.current = null;
      }
    };
  }, []);

  // Clean up preview object URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Attach media stream to video element when live mode active
  useEffect(() => {
    if (cameraMode === "live" && cameraStream && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [cameraStream, cameraMode]);

  if (!isOpen) {
    return null;
  }

  const handleCloseModal = () => {
    stopCamera();
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  };

  const processSelectedFile = (file: File) => {
    const check = isAllowedReceiptFile(file);
    if (!check.valid) {
      if (check.error === "oversized") {
        setError(
          locale === "ar"
            ? "حجم الملف يتجاوز الحد الأقصى المسموح (25 ميجابايت)"
            : "File size exceeds 25 MB limit"
        );
      } else if (check.error === "heic_detected") {
        setError(dictionary.submissionModal.heicNotSupported);
      } else {
        setError(dictionary.submissionModal.unsupportedImageType);
      }
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (nativeCameraInputRef.current) {
      nativeCameraInputRef.current.value = "";
    }
  };

  const handleReplaceFile = () => {
    handleRemoveFile();
  };

  const startLiveCamera = async () => {
    setError(null);
    setCameraError(null);
    setCameraStarting(true);
    setCameraMode("live");

    try {
      const stream = await startRearCameraStream();
      mediaStreamRef.current = stream;
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Autoplay policy rejection swallowed gracefully
        }
      }
    } catch (err: unknown) {
      stopMediaStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
      setCameraStream(null);
      const errorName = err instanceof Error ? err.name : "";
      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        setCameraError(dictionary.submissionModal.cameraPermissionDenied);
      } else {
        setCameraError(dictionary.submissionModal.cameraUnavailable);
      }
    } finally {
      setCameraStarting(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const file = await captureVideoFrameToFile(videoRef.current);
      const url = URL.createObjectURL(file);
      setCapturedFile(file);
      setCapturedPreviewUrl(url);
      setCameraMode("captured");
    } catch {
      setCameraError(dictionary.submissionModal.couldNotCaptureImage);
    }
  };

  const retakePhoto = () => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
      setCapturedPreviewUrl(null);
    }
    setCapturedFile(null);
    if (mediaStreamRef.current && mediaStreamRef.current.active) {
      setCameraMode("live");
    } else {
      startLiveCamera();
    }
  };

  const useAcceptedPhoto = () => {
    if (!capturedFile) return;
    if (mediaStreamRef.current) {
      stopMediaStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    setCameraStream(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(capturedFile);
    if (capturedPreviewUrl) {
      setPreviewUrl(capturedPreviewUrl);
      setCapturedPreviewUrl(null);
    } else {
      setPreviewUrl(URL.createObjectURL(capturedFile));
    }
    setCapturedFile(null);
    setCameraMode("idle");
    setError(null);
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
        stopCamera();
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }
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
            onClick={handleCloseModal}
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

          {/* Receipt Upload & Camera Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-on-surface">
              {dictionary.submissionModal.receiptLabel} *
            </label>

            {/* Hidden Native File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFileChange}
              disabled={isPending}
              className="hidden"
              id="receipt-file-input"
            />

            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/*"
              capture="environment"
              onChange={handleFileChange}
              disabled={isPending}
              className="hidden"
              id="receipt-native-camera-input"
            />

            {/* State 1: Live Camera Mode */}
            {cameraMode === "live" && (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-outline-variant">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
                    <Camera className="w-4 h-4 text-primary" />
                    <span>{dictionary.submissionModal.cameraPreview}</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-xs text-on-surface-variant hover:text-on-surface px-2 py-1 rounded transition-colors"
                  >
                    {dictionary.submissionModal.cancel}
                  </button>
                </div>

                {cameraError ? (
                  <div className="space-y-3 p-3 rounded-lg bg-error-container/40 border border-error text-xs text-on-error-container">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                      <span>{cameraError}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-medium shadow-xs"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>{dictionary.submissionModal.useDeviceCamera}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-medium text-on-surface"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{dictionary.submissionModal.chooseFile}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {cameraStarting && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                        <span className="text-xs">
                          {locale === "ar" ? "جاري تشغيل الكاميرا..." : "Starting camera..."}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!cameraError && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
                    >
                      {dictionary.submissionModal.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={cameraStarting}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
                      data-testid="camera-capture-btn"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{dictionary.submissionModal.capture}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* State 2: Captured Photo Review Mode */}
            {cameraMode === "captured" && (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-3 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-outline-variant">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{locale === "ar" ? "معاينة الصورة الملتقطة" : "Review Captured Photo"}</span>
                  </div>
                </div>

                <div className="relative rounded-lg overflow-hidden bg-black aspect-4/3 flex items-center justify-center">
                  {capturedPreviewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={capturedPreviewUrl}
                      alt={dictionary.submissionModal.cameraPreview}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={retakePhoto}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
                    data-testid="camera-retake-btn"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{dictionary.submissionModal.retake}</span>
                  </button>
                  <button
                    type="button"
                    onClick={useAcceptedPhoto}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-all shadow-xs"
                    data-testid="camera-use-photo-btn"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{dictionary.submissionModal.usePhoto}</span>
                  </button>
                </div>
              </div>
            )}

            {/* State 3: Selected File Preview */}
            {cameraMode === "idle" && selectedFile && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant bg-surface-container-low">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {selectedFile.type.startsWith("image/") && previewUrl ? (
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-surface-container shrink-0 border border-outline-variant">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt={selectedFile.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-on-surface truncate" dir="ltr">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-on-surface-variant" dir="ltr">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleReplaceFile}
                    disabled={isPending}
                    className="text-xs text-primary hover:underline font-medium px-1.5 py-1 rounded transition-colors"
                  >
                    {dictionary.submissionModal.replaceFile}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    disabled={isPending}
                    className="text-xs text-error hover:underline font-medium px-1.5 py-1 rounded transition-colors"
                  >
                    {dictionary.submissionModal.removeFile}
                  </button>
                </div>
              </div>
            )}

            {/* State 4: Initial Chooser (No File Selected) */}
            {cameraMode === "idle" && !selectedFile && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Take Photo Button */}
                  <button
                    type="button"
                    onClick={startLiveCamera}
                    disabled={isPending}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-outline-variant rounded-xl cursor-pointer hover:border-primary/60 hover:bg-surface-container-low transition-all text-on-surface"
                    data-testid="receipt-take-photo-btn"
                  >
                    <Camera className="w-6 h-6 text-primary mb-1.5" />
                    <span className="text-xs font-semibold text-primary">
                      {dictionary.submissionModal.takePhoto}
                    </span>
                    <span className="text-[10px] text-on-surface-variant mt-0.5">
                      {locale === "ar" ? "كاميرا مباشرة" : "Direct Camera"}
                    </span>
                  </button>

                  {/* Choose File Button */}
                  <label
                    htmlFor="receipt-file-input"
                    className={`flex flex-col items-center justify-center p-4 border-2 border-dashed border-outline-variant rounded-xl cursor-pointer hover:border-primary/60 hover:bg-surface-container-low transition-all text-on-surface ${
                      isPending ? "pointer-events-none opacity-50" : ""
                    }`}
                    data-testid="receipt-choose-file-btn"
                  >
                    <UploadCloud className="w-6 h-6 text-primary mb-1.5" />
                    <span className="text-xs font-semibold text-primary">
                      {dictionary.submissionModal.chooseFile}
                    </span>
                    <span className="text-[10px] text-on-surface-variant mt-0.5">
                      PDF, JPEG, PNG
                    </span>
                  </label>
                </div>

                {/* Subtle Native Device Camera Fallback */}
                <div className="flex items-center justify-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    disabled={isPending}
                    className="text-[11px] text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-1 font-medium"
                    data-testid="receipt-device-camera-fallback-btn"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{dictionary.submissionModal.useDeviceCamera}</span>
                  </button>
                </div>

                <p className="text-[11px] text-on-surface-variant text-center">
                  {dictionary.submissionModal.receiptHint}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant shrink-0">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors"
            >
              {dictionary.submissionModal.cancel}
            </button>
            <button
              type="submit"
              disabled={isPending || cameraMode !== "idle"}
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
