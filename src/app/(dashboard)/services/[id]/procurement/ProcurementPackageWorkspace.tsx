"use client";

import { useState, useTransition, useId, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Plus,
  X,
  Building2,
  ExternalLink,
  Pencil,
  RotateCcw,
  Check,
  ChevronDown,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { isolateBidiText, isolateLtrText } from "@/lib/i18n/bidi";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import { appendReturnTo } from "@/lib/record-navigation/return-to";
import type { Locale } from "@/lib/i18n/locales";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import {
  clearProcurementPackageSupplier,
  createProcurementPackage,
  selectProcurementPackageSupplier,
  setProcurementPackageRequirements,
  updateProcurementPackageMetadata,
} from "@/lib/procurement/package-actions";
import {
  COMMON_REQUIREMENT_CATALOG,
  type CommonRequirementCatalogCategory,
  type PackageSupplierQuotationOption,
  type ProcurementMethod,
  type ProcurementPackage,
} from "@/lib/procurement/package-types";
import type { ProcurementSupplierOption } from "@/lib/procurement/types";

type Props = {
  serviceId: string;
  serviceNumber: string;
  serviceStatus: string;
  packages: ProcurementPackage[];
  suppliers: ProcurementSupplierOption[];
  quotations: PackageSupplierQuotationOption[];
  canWrite: boolean;
  returnTo: string;
  locale: Locale;
  dictionary: ServicesDictionary["procurementWorkspace"];
};

interface RequirementDraftItem {
  id?: string;
  requirementKey?: string | null;
  title: string;
  specifications?: string | null;
  sortOrder: number;
}

const CATEGORY_ORDER: CommonRequirementCatalogCategory[] = [
  "technical",
  "furniture",
  "decor",
  "hospitality",
  "operations",
];

const CATEGORY_LABELS: Record<CommonRequirementCatalogCategory, { en: string; ar: string }> = {
  technical: { en: "Technical", ar: "الإنتاج الفني" },
  furniture: { en: "Furniture & Guest Areas", ar: "الأثاث ومناطق الضيافة" },
  decor: { en: "Décor", ar: "الديكور والتنسيق" },
  hospitality: { en: "Hospitality", ar: "الإعاشة والضيافة" },
  operations: { en: "Operations", ar: "التشغيل واللوجستيات" },
};

export default function ProcurementPackageWorkspace({
  serviceId,
  serviceNumber,
  serviceStatus,
  packages,
  suppliers,
  quotations,
  canWrite,
  returnTo,
  locale,
  dictionary,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ProcurementPackage | null>(null);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "quotation" | null>(null);

  // Modal form states
  const [packageName, setPackageName] = useState("");
  const [description, setDescription] = useState("");
  const [procurementMethod, setProcurementMethod] = useState<string>("");
  const [draftRequirements, setDraftRequirements] = useState<RequirementDraftItem[]>([]);
  const [customReqInput, setCustomReqInput] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>("");
  const [selectionReason, setSelectionReason] = useState("");
  const [selectionEvidence, setSelectionEvidence] = useState("");
  const [isReqDropdownOpen, setIsReqDropdownOpen] = useState(false);
  const [workspaceFeedback, setWorkspaceFeedback] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const createdInSessionRef = useRef(false);

  const nameInputId = useId();
  const descInputId = useId();
  const methodInputId = useId();
  const customReqInputId = useId();
  const supplierSelectId = useId();
  const quotationSelectId = useId();
  const reasonInputId = useId();
  const evidenceInputId = useId();

  const editable = canWrite && serviceStatus !== "Completed" && serviceStatus !== "Cancelled";

  const totalCount = packages.length;
  const selectedCount = packages.filter((p) => p.status === "selected").length;
  const draftCount = packages.filter((p) => p.status === "draft").length;

  const currentWorkspaceUrl = returnTo
    ? `/services/${serviceId}/procurement?returnTo=${encodeURIComponent(returnTo)}`
    : `/services/${serviceId}/procurement`;

  // Quotations matching the currently selected supplier in modal
  const availableQuotations = selectedSupplierId
    ? quotations.filter((q) => q.supplierId === selectedSupplierId && q.serviceId === serviceId)
    : [];

  function openCreateModal() {
    createdInSessionRef.current = false;
    setEditingPackage(null);
    setPackageName("");
    setDescription("");
    setProcurementMethod("");
    setDraftRequirements([]);
    setCustomReqInput("");
    setSelectedSupplierId("");
    setSelectedQuotationId("");
    setSelectionReason("");
    setSelectionEvidence("");
    setIsReqDropdownOpen(false);
    setFeedback(null);
    setIsModalOpen(true);
  }

  function openEditModal(pkg: ProcurementPackage) {
    createdInSessionRef.current = false;
    setEditingPackage(pkg);
    setPackageName(pkg.name);
    setDescription(pkg.description ?? "");
    setProcurementMethod(pkg.procurementMethod ?? "");
    setDraftRequirements(
      pkg.requirements.map((r, idx) => ({
        id: r.id,
        requirementKey: r.requirementKey,
        title: r.title,
        specifications: r.specifications,
        sortOrder: r.sortOrder ?? idx,
      })),
    );
    setCustomReqInput("");
    setSelectedSupplierId(pkg.selectedSupplierId ?? "");
    setSelectedQuotationId(pkg.selectedSupplierQuotationId ?? "");
    setSelectionReason(pkg.selectionReason ?? "");
    setSelectionEvidence(pkg.selectionEvidence ?? "");
    setIsReqDropdownOpen(false);
    setFeedback(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    const wasCreated = createdInSessionRef.current;
    createdInSessionRef.current = false;
    setIsModalOpen(false);
    setEditingPackage(null);
    setFeedback(null);
    if (wasCreated) {
      setWorkspaceFeedback({ kind: "success", text: dictionary.packageCreatedDraftNotice });
      router.refresh();
    }
  }

  function addCommonRequirement(key: string, title: string) {
    if (draftRequirements.some((r) => r.requirementKey === key || r.title.toLowerCase() === title.toLowerCase())) {
      return;
    }
    setDraftRequirements((prev) => [
      ...prev,
      {
        requirementKey: key,
        title,
        specifications: "",
        sortOrder: prev.length,
      },
    ]);
  }

  function addCustomRequirement() {
    const trimmed = customReqInput.trim();
    if (!trimmed) return;
    if (draftRequirements.some((r) => r.title.toLowerCase() === trimmed.toLowerCase())) {
      setCustomReqInput("");
      return;
    }
    setDraftRequirements((prev) => [
      ...prev,
      {
        requirementKey: null,
        title: trimmed,
        specifications: "",
        sortOrder: prev.length,
      },
    ]);
    setCustomReqInput("");
  }

  function removeRequirement(index: number) {
    setDraftRequirements((prev) => prev.filter((_, idx) => idx !== index));
  }

  function updateRequirementSpecs(index: number, specs: string) {
    setDraftRequirements((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, specifications: specs } : item)),
    );
  }

  function handleSupplierChange(newSupplierId: string) {
    setSelectedSupplierId(newSupplierId);
    setSelectedQuotationId(""); // Clear quotation if supplier changes
  }

  function handleSavePackage(navigateToQuotation = false) {
    const trimmedName = packageName.trim();
    if (!trimmedName) {
      setFeedback({ kind: "error", text: dictionary.modal.packageName + " is required" });
      return;
    }

    setPendingAction(navigateToQuotation ? "quotation" : "save");
    startTransition(async () => {
      setFeedback(null);
      const validMethod = procurementMethod ? (procurementMethod as ProcurementMethod) : null;
      const reqId = globalThis.crypto.randomUUID();

      let targetPackageId = editingPackage?.id ?? "";

      if (!editingPackage) {
        // 1. Create package
        const createResult = await createProcurementPackage({
          serviceId,
          name: trimmedName,
          description: description.trim() || null,
          procurementMethod: validMethod,
          requirements: draftRequirements.map((r, idx) => ({
            id: r.id ?? null,
            requirementKey: r.requirementKey ?? null,
            title: r.title,
            specifications: r.specifications?.trim() || null,
            sortOrder: idx,
          })),
          requestId: reqId,
        });

        if (!createResult.success) {
          setPendingAction(null);
          setFeedback({ kind: "error", text: createResult.error || dictionary.modal.saveError });
          return;
        }

        const packageId = createResult.data.packageId;
        targetPackageId = packageId;
        createdInSessionRef.current = true;

        // 2. If supplier selected at creation time, assign supplier
        if (selectedSupplierId) {
          const selectResult = await selectProcurementPackageSupplier({
            packageId,
            serviceId,
            supplierId: selectedSupplierId,
            supplierQuotationId: selectedQuotationId || null,
            selectionReason: selectionReason.trim() || null,
            selectionEvidence: selectionEvidence.trim() || null,
            requestId: globalThis.crypto.randomUUID(),
          });

          if (!selectResult.success) {
            setPendingAction(null);
            setEditingPackage({
              id: packageId,
              serviceId,
              serviceNumber,
              serviceTitle: "",
              eventName: null,
              serviceStatus,
              serviceDeleted: false,
              name: trimmedName,
              description: description.trim() || null,
              status: "draft",
              procurementMethod: validMethod,
              selectedSupplierId: null,
              selectedSupplierName: null,
              selectedSupplierQuotationId: null,
              selectedSupplierQuotationReference: null,
              selectedSupplierQuotationDate: null,
              selectedSupplierQuotationAmount: null,
              selectionReason: null,
              selectionEvidence: null,
              selectedAt: null,
              selectedBy: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              requirements: draftRequirements.map((r, idx) => ({
                id: `draft-${idx}`,
                packageId,
                serviceId,
                requirementKey: r.requirementKey ?? null,
                title: r.title,
                specifications: r.specifications?.trim() || null,
                sortOrder: idx,
                legacyRequirementId: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })),
            });
            setFeedback({ kind: "error", text: selectResult.error || dictionary.modal.saveError });
            return;
          }
        }
      } else {
        // Edit package
        const packageId = editingPackage.id;
        targetPackageId = packageId;

        // 1. Update metadata
        const updateResult = await updateProcurementPackageMetadata({
          packageId,
          serviceId,
          name: trimmedName,
          description: description.trim() || null,
          procurementMethod: validMethod,
          requestId: reqId,
        });

        if (!updateResult.success) {
          setPendingAction(null);
          setFeedback({ kind: "error", text: updateResult.error || dictionary.modal.saveError });
          return;
        }

        // 2. Set requirements
        const reqsResult = await setProcurementPackageRequirements({
          packageId,
          serviceId,
          requirements: draftRequirements.map((r, idx) => ({
            id: r.id ?? null,
            requirementKey: r.requirementKey ?? null,
            title: r.title,
            specifications: r.specifications?.trim() || null,
            sortOrder: idx,
          })),
          requestId: globalThis.crypto.randomUUID(),
        });

        if (!reqsResult.success) {
          setPendingAction(null);
          setFeedback({ kind: "error", text: reqsResult.error || dictionary.modal.saveError });
          return;
        }

        // 3. Handle supplier change or clearance
        if (selectedSupplierId) {
          if (
            selectedSupplierId !== editingPackage.selectedSupplierId ||
            selectedQuotationId !== (editingPackage.selectedSupplierQuotationId ?? "") ||
            selectionReason !== (editingPackage.selectionReason ?? "") ||
            selectionEvidence !== (editingPackage.selectionEvidence ?? "")
          ) {
            const selectResult = await selectProcurementPackageSupplier({
              packageId,
              serviceId,
              supplierId: selectedSupplierId,
              supplierQuotationId: selectedQuotationId || null,
              selectionReason: selectionReason.trim() || null,
              selectionEvidence: selectionEvidence.trim() || null,
              requestId: globalThis.crypto.randomUUID(),
            });

            if (!selectResult.success) {
              setPendingAction(null);
              setFeedback({ kind: "error", text: selectResult.error || dictionary.modal.saveError });
              return;
            }
          }
        } else if (editingPackage.selectedSupplierId) {
          // Cleared supplier
          const clearResult = await clearProcurementPackageSupplier({
            packageId,
            serviceId,
            requestId: globalThis.crypto.randomUUID(),
          });

          if (!clearResult.success) {
            setPendingAction(null);
            setFeedback({ kind: "error", text: clearResult.error || dictionary.modal.saveError });
            return;
          }
        }
      }

      createdInSessionRef.current = false;
      setPendingAction(null);
      closeModal();
      router.refresh();

      if (navigateToQuotation && selectedSupplierId && targetPackageId) {
        const quotationUrl = appendReturnTo(
          `/suppliers/${selectedSupplierId}/quotations/new?serviceId=${encodeURIComponent(serviceId)}&packageId=${encodeURIComponent(targetPackageId)}`,
          currentWorkspaceUrl,
        );
        router.push(quotationUrl);
      }
    });
  }

  function handleClearSupplier(pkg: ProcurementPackage) {
    if (!window.confirm(dictionary.clearSupplierConfirm)) return;

    startTransition(async () => {
      const result = await clearProcurementPackageSupplier({
        packageId: pkg.id,
        serviceId,
        requestId: globalThis.crypto.randomUUID(),
      });

      if (!result.success) {
        setWorkspaceFeedback({ kind: "error", text: result.error || dictionary.modal.saveError });
        return;
      }

      setWorkspaceFeedback({
        kind: "success",
        text: dictionary.supplierClearedSuccess,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Workspace Inline Feedback Banner */}
      {workspaceFeedback && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-lg p-3 text-[13px] ${
            workspaceFeedback.kind === "error"
              ? "border border-error/20 bg-error/10 text-error"
              : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          }`}
        >
          <span>{workspaceFeedback.text}</span>
          <button
            type="button"
            onClick={() => setWorkspaceFeedback(null)}
            className="text-xs font-semibold underline hover:opacity-80"
          >
            {dictionary.dismiss}
          </button>
        </div>
      )}

      {/* Metrics Header */}
      <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
        <dl className="grid grid-cols-1 divide-y divide-surface-variant sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
          <div className="p-5">
            <dt className="text-[12px] font-semibold text-on-surface-variant">{dictionary.totalPackages}</dt>
            <dd className="mt-1 text-[22px] font-semibold text-on-surface">
              <span dir="ltr" className="tabular-nums">
                {formatUiNumber(locale, totalCount)}
              </span>
            </dd>
          </div>
          <div className="p-5">
            <dt className="text-[12px] font-semibold text-on-surface-variant">{dictionary.selectedSupplierPackages}</dt>
            <dd className="mt-1 text-[22px] font-semibold text-primary">
              <span dir="ltr" className="tabular-nums">
                {formatUiNumber(locale, selectedCount)}
              </span>
            </dd>
          </div>
          <div className="p-5">
            <dt className="text-[12px] font-semibold text-on-surface-variant">{dictionary.draftPackages}</dt>
            <dd className="mt-1 text-[22px] font-semibold text-amber-700">
              <span dir="ltr" className="tabular-nums">
                {formatUiNumber(locale, draftCount)}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {/* Action Bar when packages exist */}
      {packages.length > 0 && editable && (
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-primary">
            {dictionary.title}
          </h2>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus size={16} aria-hidden="true" />
            <span>{dictionary.addPackage}</span>
          </Button>
        </div>
      )}

      {/* Packages Section */}
      {packages.length === 0 ? (
        <section className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-surface-variant bg-surface-container-lowest p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
            <Boxes size={28} aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-[18px] font-semibold text-primary">{dictionary.emptyTitle}</h2>
          <p className="mt-1.5 max-w-md text-[14px] text-on-surface-variant">{dictionary.emptyDescription}</p>
          {editable && (
            <div className="mt-5">
              <Button onClick={openCreateModal} className="gap-2">
                <Plus size={16} aria-hidden="true" />
                <span>{dictionary.addPackage}</span>
              </Button>
            </div>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              currentWorkspaceUrl={currentWorkspaceUrl}
              editable={editable}
              locale={locale}
              dictionary={dictionary}
              onEdit={() => openEditModal(pkg)}
              onClearSupplier={() => handleClearSupplier(pkg)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Package Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-surface-variant px-6 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-semibold text-primary">
                  {editingPackage ? dictionary.modal.editTitle : dictionary.modal.addTitle}
                </h2>
                <span className="font-mono text-[12px] text-on-surface-variant" dir="ltr">
                  ({isolateLtrText(serviceNumber)})
                </span>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Close"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
              {feedback && (
                <div
                  className={`rounded-lg p-3 text-[13px] ${
                    feedback.kind === "error"
                      ? "border border-error/30 bg-error-container/30 text-error"
                      : "border border-emerald-500/30 bg-emerald-50 text-emerald-800"
                  }`}
                  role="alert"
                >
                  {feedback.text}
                </div>
              )}

              {/* 1. Package Details */}
              <fieldset className="space-y-4 rounded-xl border border-surface-variant bg-surface-bright/50 p-4">
                <legend className="px-1 text-[13px] font-semibold text-primary">
                  {dictionary.modal.packageDetailsSection}
                </legend>

                <div>
                  <label htmlFor={nameInputId} className="block text-[13px] font-medium text-on-surface">
                    {dictionary.modal.packageName} <span className="text-error">*</span>
                  </label>
                  <input
                    id={nameInputId}
                    type="text"
                    name="packageName"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    placeholder={dictionary.modal.packageNamePlaceholder}
                    maxLength={255}
                    disabled={isPending}
                    className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    dir="auto"
                  />
                </div>

                <div>
                  <label htmlFor={descInputId} className="block text-[13px] font-medium text-on-surface">
                    {dictionary.modal.description}
                  </label>
                  <textarea
                    id={descInputId}
                    name="packageDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={dictionary.modal.descriptionPlaceholder}
                    maxLength={2000}
                    rows={2}
                    disabled={isPending}
                    className="mt-1 w-full resize-y rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    dir="auto"
                  />
                </div>

                <div>
                  <label htmlFor={methodInputId} className="block text-[13px] font-medium text-on-surface">
                    {dictionary.modal.procurementMethod}
                  </label>
                  <select
                    id={methodInputId}
                    name="procurementMethod"
                    value={procurementMethod}
                    onChange={(e) => setProcurementMethod(e.target.value)}
                    disabled={isPending}
                    className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="">{dictionary.modal.selectMethodPlaceholder}</option>
                    <option value="rental">{dictionary.methods.rental}</option>
                    <option value="purchase">{dictionary.methods.purchase}</option>
                    <option value="service">{dictionary.methods.service}</option>
                  </select>
                </div>
              </fieldset>

              {/* 2. Requirements */}
              <fieldset className="space-y-4 rounded-xl border border-surface-variant bg-surface-bright/50 p-4">
                <legend className="px-1 text-[13px] font-semibold text-primary">
                  {dictionary.modal.requirementsSection}
                </legend>
                <p className="text-[12px] text-on-surface-variant">{dictionary.modal.requirementsHelp}</p>

                {/* Common Requirements Selector Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsReqDropdownOpen((prev) => !prev)}
                    aria-expanded={isReqDropdownOpen}
                    aria-haspopup="true"
                    className="flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface px-3 py-2 text-start text-[13px] text-on-surface hover:bg-surface-container-low focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <span className="text-on-surface-variant">{dictionary.modal.selectCommonRequirement}</span>
                    <ChevronDown size={16} className="text-on-surface-variant" aria-hidden="true" />
                  </button>

                  {isReqDropdownOpen && (
                    <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest p-2 shadow-lg">
                      {CATEGORY_ORDER.map((category) => {
                        const items = COMMON_REQUIREMENT_CATALOG.filter((i) => i.category === category);
                        const categoryLabel = CATEGORY_LABELS[category][locale === "ar" ? "ar" : "en"];
                        return (
                          <div key={category} className="mb-2">
                            <span className="block px-2 py-1 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                              {categoryLabel}
                            </span>
                            <div className="flex flex-wrap gap-1.5 p-1">
                              {items.map((item) => {
                                const title = locale === "ar" ? item.titleAr : item.titleEn;
                                const isSelected = draftRequirements.some((r) => r.requirementKey === item.key);
                                return (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setDraftRequirements((prev) =>
                                          prev.filter((r) => r.requirementKey !== item.key),
                                        );
                                      } else {
                                        addCommonRequirement(item.key, title);
                                      }
                                    }}
                                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] transition-colors ${
                                      isSelected
                                        ? "bg-primary text-on-primary font-medium"
                                        : "bg-surface-container-low text-on-surface hover:bg-surface-container"
                                    }`}
                                  >
                                    {isSelected && <Check size={12} aria-hidden="true" />}
                                    <span>{title}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Custom Requirement Input */}
                <div className="flex items-center gap-2">
                  <label htmlFor={customReqInputId} className="sr-only">
                    {dictionary.modal.customRequirementPlaceholder}
                  </label>
                  <input
                    id={customReqInputId}
                    type="text"
                    value={customReqInput}
                    onChange={(e) => setCustomReqInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomRequirement();
                      }
                    }}
                    placeholder={dictionary.modal.customRequirementPlaceholder}
                    disabled={isPending}
                    className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    dir="auto"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomRequirement}
                    disabled={!customReqInput.trim() || isPending}
                  >
                    <Plus size={14} aria-hidden="true" />
                    <span>{dictionary.modal.addCustomRequirement}</span>
                  </Button>
                </div>

                {/* Selected Requirements List */}
                {draftRequirements.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {draftRequirements.map((req, idx) => (
                      <div
                        key={req.requirementKey ?? `custom-${idx}`}
                        className="flex flex-col gap-2 rounded-lg border border-surface-variant bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-[13px] text-on-surface" dir="auto">
                            {isolateBidiText(req.title)}
                          </span>
                          <input
                            type="text"
                            value={req.specifications ?? ""}
                            onChange={(e) => updateRequirementSpecs(idx, e.target.value)}
                            placeholder={dictionary.modal.specificationsPlaceholder}
                            aria-label={`${dictionary.modal.specificationsPlaceholder}: ${req.title}`}
                            maxLength={2000}
                            disabled={isPending}
                            className="mt-1 w-full rounded border border-outline-variant/60 bg-surface-container-lowest px-2 py-1 text-[12px] text-on-surface-variant focus:border-primary focus:outline-none"
                            dir="auto"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRequirement(idx)}
                          disabled={isPending}
                          className="self-end rounded p-1 text-on-surface-variant hover:text-error sm:self-center"
                          aria-label="Remove requirement"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </fieldset>

              {/* 3. Selected Supplier */}
              <fieldset className="space-y-4 rounded-xl border border-surface-variant bg-surface-bright/50 p-4">
                <legend className="px-1 text-[13px] font-semibold text-primary">
                  {dictionary.modal.selectedSupplierSection}
                </legend>

                <div>
                  <label htmlFor={supplierSelectId} className="block text-[13px] font-medium text-on-surface">
                    {dictionary.selectedSupplierLabel}
                  </label>
                  <select
                    id={supplierSelectId}
                    value={selectedSupplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    disabled={isPending}
                    className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="">{dictionary.modal.noSupplierSelectedOption}</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Supplier Quotation (when supplier is selected) */}
                {selectedSupplierId ? (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor={quotationSelectId} className="text-[13px] font-medium text-on-surface">
                        {dictionary.modal.supplierQuotationSection}
                      </label>
                      <button
                        type="button"
                        onClick={() => handleSavePackage(true)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        <Plus size={13} aria-hidden="true" />
                        <span>{dictionary.modal.recordSupplierQuotation}</span>
                      </button>
                    </div>

                    <select
                      id={quotationSelectId}
                      value={selectedQuotationId}
                      onChange={(e) => setSelectedQuotationId(e.target.value)}
                      disabled={isPending}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      <option value="">{dictionary.modal.noQuotationOption}</option>
                      {availableQuotations.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.supplierReference} ({q.quotationDate})
                          {q.packageTotal !== null ? ` — ${formatSarAmount(locale, q.packageTotal)}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="pt-2 text-[12px] text-on-surface-variant/80 italic">
                    {dictionary.selectSupplierFirstNotice}
                  </p>
                )}
              </fieldset>

              {/* 5. Selection Details (Optional) */}
              {selectedSupplierId && (
                <fieldset className="space-y-4 rounded-xl border border-surface-variant bg-surface-bright/50 p-4">
                  <legend className="px-1 text-[13px] font-semibold text-primary">
                    {dictionary.modal.selectionDetailsSection}
                  </legend>

                  <div>
                    <label htmlFor={reasonInputId} className="block text-[13px] font-medium text-on-surface">
                      {dictionary.modal.selectionReason}
                    </label>
                    <input
                      id={reasonInputId}
                      type="text"
                      value={selectionReason}
                      onChange={(e) => setSelectionReason(e.target.value)}
                      placeholder={dictionary.modal.selectionReasonPlaceholder}
                      maxLength={2000}
                      disabled={isPending}
                      className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      dir="auto"
                    />
                  </div>

                  <div>
                    <label htmlFor={evidenceInputId} className="block text-[13px] font-medium text-on-surface">
                      {dictionary.modal.selectionEvidence}
                    </label>
                    <input
                      id={evidenceInputId}
                      type="text"
                      value={selectionEvidence}
                      onChange={(e) => setSelectionEvidence(e.target.value)}
                      placeholder={dictionary.modal.selectionEvidencePlaceholder}
                      maxLength={2000}
                      disabled={isPending}
                      className="mt-1 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                      dir="auto"
                    />
                  </div>
                </fieldset>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-surface-variant px-6 py-4">
              <Button type="button" variant="outline" onClick={closeModal} disabled={isPending}>
                {dictionary.modal.cancel}
              </Button>
              {selectedSupplierId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSavePackage(true)}
                  loading={isPending && pendingAction === "quotation"}
                  disabled={isPending}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>{dictionary.modal.recordSupplierQuotation}</span>
                </Button>
              )}
              <Button
                type="button"
                onClick={() => handleSavePackage(false)}
                loading={isPending && pendingAction === "save"}
                loadingLabel={dictionary.modal.saving}
                disabled={isPending}
              >
                {dictionary.modal.save}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PackageCard({
  pkg,
  currentWorkspaceUrl,
  editable,
  locale,
  dictionary,
  onEdit,
  onClearSupplier,
  isPending,
}: {
  pkg: ProcurementPackage;
  currentWorkspaceUrl: string;
  editable: boolean;
  locale: Locale;
  dictionary: ServicesDictionary["procurementWorkspace"];
  onEdit: () => void;
  onClearSupplier: () => void;
  isPending: boolean;
}) {
  const methodLabel = pkg.procurementMethod
    ? dictionary.methods[pkg.procurementMethod] ?? pkg.procurementMethod
    : null;

  const statusLabel = dictionary.statuses[pkg.status] ?? pkg.status;

  const statusBadgeVariant =
    pkg.status === "selected" ? "approved" : pkg.status === "cancelled" ? "cancelled" : "draft";

  return (
    <article className="flex flex-col justify-between rounded-xl border border-surface-variant bg-surface-container-lowest p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div className="space-y-4">
        {/* Header: Title & Badges */}
        <div className="flex items-start justify-between gap-3 border-b border-surface-variant/70 pb-3">
          <div className="min-w-0">
            <h3 className="break-words text-[17px] font-semibold text-primary" dir="auto">
              {isolateBidiText(pkg.name)}
            </h3>
            {pkg.description && (
              <p className="mt-1 break-words text-[13px] text-on-surface-variant" dir="auto">
                {isolateBidiText(pkg.description)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {methodLabel && (
              <span className="rounded-md border border-outline-variant/60 bg-surface-container px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
                {methodLabel}
              </span>
            )}
            <StatusBadge variant={statusBadgeVariant}>{statusLabel}</StatusBadge>
          </div>
        </div>

        {/* Requirements */}
        <div>
          <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
            {dictionary.requirementsLabel}
          </h4>
          {pkg.requirements.length === 0 ? (
            <p className="mt-1 text-[13px] text-on-surface-variant/70 italic">{dictionary.noRequirements}</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {pkg.requirements.map((req) => (
                <li key={req.id} className="flex items-start gap-2 text-[13px] text-on-surface">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium" dir="auto">
                      {isolateBidiText(req.title)}
                    </span>
                    {req.specifications && (
                      <span className="ms-1.5 text-[12px] text-on-surface-variant" dir="auto">
                        ({req.specifications})
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Selected Supplier */}
        <div className="rounded-lg border border-surface-variant/80 bg-surface-bright/60 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
              {dictionary.selectedSupplierLabel}
            </span>
          </div>

          {pkg.selectedSupplierId && pkg.selectedSupplierName && pkg.status === "selected" ? (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-primary shrink-0" aria-hidden="true" />
                <span className="text-[14px] font-semibold text-on-surface" dir="auto">
                  {isolateBidiText(pkg.selectedSupplierName)}
                </span>
              </div>

              {/* Quotation Linkage */}
              <div className="border-t border-surface-variant/50 pt-2 text-[13px]">
                <span className="text-[12px] text-on-surface-variant">{dictionary.supplierQuotationLabel}: </span>
                {pkg.selectedSupplierQuotationId && pkg.selectedSupplierQuotationReference ? (
                  <Link
                    href={appendReturnTo(
                      `/suppliers/${pkg.selectedSupplierId}/quotations/${pkg.selectedSupplierQuotationId}`,
                      currentWorkspaceUrl,
                    )}
                    className="inline-flex items-center gap-1 font-mono font-medium text-primary hover:underline"
                  >
                    <span>{isolateLtrText(pkg.selectedSupplierQuotationReference)}</span>
                    <ExternalLink size={12} aria-hidden="true" />
                    {pkg.selectedSupplierQuotationAmount !== null && (
                      <span className="ms-1 text-[12px] text-on-surface-variant font-sans" dir="ltr">
                        ({formatSarAmount(locale, pkg.selectedSupplierQuotationAmount)})
                      </span>
                    )}
                  </Link>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span className="text-on-surface-variant/70 italic">{dictionary.noQuotationLinked}</span>
                    {editable && (
                      <Link
                        href={appendReturnTo(
                          `/suppliers/${pkg.selectedSupplierId}/quotations/new?serviceId=${encodeURIComponent(pkg.serviceId)}&packageId=${encodeURIComponent(pkg.id)}`,
                          currentWorkspaceUrl,
                        )}
                        className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
                      >
                        <Plus size={11} aria-hidden="true" />
                        <span>{dictionary.modal.recordNewQuotation}</span>
                      </Link>
                    )}
                  </span>
                )}
              </div>

              {/* Selection reason/evidence */}
              {(pkg.selectionReason || pkg.selectionEvidence) && (
                <div className="mt-1 text-[12px] text-on-surface-variant/80" dir="auto">
                  {pkg.selectionReason && <p>&ldquo;{pkg.selectionReason}&rdquo;</p>}
                  {pkg.selectionEvidence && (
                    <p className="mt-0.5 text-[11px] text-on-surface-variant/60 font-mono">
                      Ref: {pkg.selectionEvidence}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-1.5 text-[13px] text-on-surface-variant/70 italic">
              {dictionary.selectSupplierFirstNotice}
            </p>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      {editable && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-surface-variant/70 pt-3">
          {pkg.selectedSupplierId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClearSupplier}
              disabled={isPending}
              className="gap-1 text-on-surface-variant hover:text-error"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>{dictionary.clearSupplier}</span>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={isPending}
            className="gap-1"
          >
            <Pencil size={13} aria-hidden="true" />
            <span>{dictionary.editPackage}</span>
          </Button>
        </div>
      )}
    </article>
  );
}
