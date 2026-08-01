"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import { X, Receipt, CheckCircle2, ChevronRight } from "lucide-react";
import type { InvoicesDictionary } from "@/lib/i18n/dictionaries/invoices";
import type {
  EligibleInvoiceService,
  InvoiceChooserMode,
  InvoiceChooserLoadStatus,
} from "@/lib/invoices/eligible-service-selector";
import EligibleInvoiceServiceSelector from "./EligibleInvoiceServiceSelector";

type CreateInvoiceChooserProps = {
  services: EligibleInvoiceService[];
  loadStatus: InvoiceChooserLoadStatus;
  dictionary: InvoicesDictionary;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

export default function CreateInvoiceChooser({
  services,
  loadStatus,
  dictionary,
  triggerRef,
  onClose,
}: CreateInvoiceChooserProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstTypeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"type" | "service">("type");
  const [mode, setMode] = useState<InvoiceChooserMode | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const chooser = dictionary.list.invoiceChooser;
  const serviceStepTitle =
    mode === "deposit"
      ? chooser.selectDepositServiceTitle
      : chooser.selectFinalServiceTitle;
  const serviceStepDescription =
    mode === "deposit"
      ? chooser.selectDepositServiceDescription
      : chooser.selectFinalServiceDescription;

  useEffect(() => {
    const opener = triggerRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      opener?.focus();
    };
  }, [onClose, triggerRef]);

  useEffect(() => {
    const focusTarget =
      step === "service" ? searchRef.current : firstTypeRef.current;
    const frame = window.requestAnimationFrame(() => focusTarget?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  function chooseMode(nextMode: InvoiceChooserMode) {
    setMode(nextMode);
    setStep("service");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant px-4 py-3 sm:px-6 shrink-0">
          <div className="min-w-0 text-start">
            <h2 id={titleId} className="text-sm font-semibold text-on-surface sm:text-base truncate">
              {step === "service" ? serviceStepTitle : chooser.title}
            </h2>
            <p id={descriptionId} className="mt-0.5 text-xs text-on-surface-variant truncate">
              {step === "service"
                ? serviceStepDescription
                : chooser.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={chooser.close}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {step === "type" ? (
          <div className="flex flex-col gap-2.5 p-4 sm:p-5">
            <button
              ref={firstTypeRef}
              type="button"
              onClick={() => chooseMode("deposit")}
              className="group flex min-h-[60px] sm:h-[64px] items-center justify-between gap-3 rounded-lg border border-outline-variant/60 bg-surface px-4 py-3 text-start transition-colors hover:border-primary/50 hover:bg-surface-container-lowest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-fixed/40 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <Receipt size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-on-surface sm:text-sm group-hover:text-primary transition-colors truncate">
                    {chooser.depositTitle}
                  </span>
                  <span className="block text-[11px] sm:text-xs text-on-surface-variant truncate mt-0.5">
                    {chooser.depositDescription}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-on-surface-variant/60 group-hover:text-primary transition-colors rtl:rotate-180" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => chooseMode("final")}
              className="group flex min-h-[60px] sm:h-[64px] items-center justify-between gap-3 rounded-lg border border-outline-variant/60 bg-surface px-4 py-3 text-start transition-colors hover:border-primary/50 hover:bg-surface-container-lowest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-fixed/40 text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <CheckCircle2 size={18} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-semibold text-on-surface sm:text-sm group-hover:text-primary transition-colors truncate">
                    {chooser.finalTitle}
                  </span>
                  <span className="block text-[11px] sm:text-xs text-on-surface-variant truncate mt-0.5">
                    {chooser.finalDescription}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="shrink-0 text-on-surface-variant/60 group-hover:text-primary transition-colors rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
        ) : mode ? (
          <EligibleInvoiceServiceSelector
            mode={mode}
            services={services}
            loadStatus={loadStatus}
            dictionary={dictionary}
            searchRef={searchRef}
            onBack={() => setStep("type")}
          />
        ) : null}
      </div>
    </div>
  );
}
