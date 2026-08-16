"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { createSupplierAllocation } from "@/lib/supplier-allocations/actions";
import { getActiveSupplierRateCardsForAllocation } from "@/lib/suppliers/rate-card-actions";
import { getSafeActionErrorMessage } from "@/lib/i18n/safe-action-error";
import type { SupplierOption } from "@/lib/suppliers/types";
import type { SupplierRateCard } from "@/lib/suppliers/rate-card-types";

type CostSource = "manual_estimate" | "rate_card";

function getCreateSupplierAllocationErrorMessage(
  error: string | null | undefined,
  dictionary: ReturnType<
    typeof getServicesDictionary
  >["supplierAllocations"]["subflow"]["createForm"]
) {
  if (!error) {
    return dictionary.failed;
  }

  const mappedErrors: Record<string, string> = {
    "Service is unavailable for supplier allocation.":
      dictionary.errors.serviceUnavailable,
    "Supplier is unavailable for allocation.":
      dictionary.errors.supplierUnavailable,
    "Approved quotation is invalid for this service.":
      dictionary.errors.approvedQuotationInvalid,
    "Rate card ID is required.": dictionary.errors.rateCardIdRequired,
    "Rate card not found.": dictionary.errors.rateCardNotFound,
    "Rate card is not active or deleted.": dictionary.errors.rateCardInactive,
    "Rate card does not belong to the selected supplier.":
      dictionary.errors.rateCardSupplierMismatch,
    "Invalid rate card cost or currency.":
      dictionary.errors.invalidRateCardCostOrCurrency,
    "Rate card is expired.": dictionary.errors.rateCardExpired,
    "Rate card is not currently valid.": dictionary.errors.rateCardNotCurrent,
    "Failed to create supplier allocation. Please try again.":
      dictionary.errors.createFailedRetry,
    Unauthorized: dictionary.errors.unauthorized,
    Forbidden: dictionary.errors.forbidden,
    "An unexpected error occurred.": dictionary.errors.unexpected,
  };

  return getSafeActionErrorMessage(error, mappedErrors, dictionary.errors.unexpected);
}

export default function SupplierAllocationCreateForm({
  serviceId,
  suppliers,
  canUseRateCards = false,
}: {
  serviceId: string;
  suppliers: SupplierOption[];
  canUseRateCards?: boolean;
}) {
  const router = useRouter();
  const { push } = useGlobalNavigationPending();
  const locale = useLocale();
  const dictionary =
    getServicesDictionary(locale).supplierAllocations.subflow.createForm;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [mode, setMode] = useState<CostSource>("manual_estimate");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualItemName, setManualItemName] = useState("");
  const [manualUnit, setManualUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [manualEstimatedUnitCost, setManualEstimatedUnitCost] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  
  const [rateCards, setRateCards] = useState<SupplierRateCard[]>([]);
  const [isLoadingRateCards, setIsLoadingRateCards] = useState(false);
  const [selectedRateCardId, setSelectedRateCardId] = useState<string>("");
  
  // Rate card auto-fill state
  const [rcCategory, setRcCategory] = useState("");
  const [rcItemName, setRcItemName] = useState("");
  const [rcUnit, setRcUnit] = useState("");
  const [rcBaseCost, setRcBaseCost] = useState("");

  const clearRateCardSelection = () => {
    setSelectedRateCardId("");
    setRcCategory("");
    setRcItemName("");
    setRcUnit("");
    setRcBaseCost("");
  };

  const rateCardPayloadReady =
    mode === "rate_card" &&
    selectedRateCardId !== "" &&
    rcCategory.trim() !== "" &&
    rcItemName.trim() !== "" &&
    rcUnit.trim() !== "" &&
    rcBaseCost !== "";

  const fetchRateCards = async (supplierId: string) => {
    setIsLoadingRateCards(true);
    setRateCards([]);
    clearRateCardSelection();
    try {
      const res = await getActiveSupplierRateCardsForAllocation(supplierId, serviceId);
      setRateCards(res.rateCards || []);
    } catch (err) {
      console.error("Failed to load rate cards", err);
    } finally {
      setIsLoadingRateCards(false);
    }
  };

  const handleModeChange = (newMode: CostSource) => {
    setMode(newMode);
    if (newMode === "rate_card" && selectedSupplierId) {
      fetchRateCards(selectedSupplierId);
    }
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedSupplierId(val);
    clearRateCardSelection();
    if (mode === "rate_card" && val) {
      fetchRateCards(val);
    }
  };

  const handleRateCardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedRateCardId(val);
    const rc = rateCards.find(r => r.id === val);
    if (rc) {
      setRcCategory(rc.category || "");
      setRcItemName(rc.itemName);
      setRcUnit(rc.unit);
      setRcBaseCost(String(rc.baseCost));
    } else {
      setRcCategory("");
      setRcItemName("");
      setRcUnit("");
      setRcBaseCost("");
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // estimated_total_cost is generated by the database and is never accepted from client input.
    let input: Record<string, unknown>;

    if (mode === "rate_card") {
      input = {
        serviceId,
        supplierId: selectedSupplierId,
        supplierRateCardId: selectedRateCardId,
        status: "draft",
        category: rcCategory,
        itemName: rcItemName,
        unit: rcUnit,
        quantity: quantity ? parseFloat(quantity) : 0,
        currency: "SAR",
        estimatedUnitCost: rcBaseCost ? parseFloat(rcBaseCost) : 0,
        costSource: "rate_card",
        scopeOfWork: scopeOfWork || undefined,
        internalNotes: internalNotes || undefined,
        // No client snapshot
      };
    } else {
      input = {
        serviceId,
        supplierId: selectedSupplierId,
        status: "draft",
        category: manualCategory,
        itemName: manualItemName,
        unit: manualUnit,
        quantity: quantity ? parseFloat(quantity) : 0,
        currency: "SAR",
        estimatedUnitCost: manualEstimatedUnitCost ? parseFloat(manualEstimatedUnitCost) : 0,
        costSource: "manual_estimate",
        scopeOfWork: scopeOfWork || undefined,
        internalNotes: internalNotes || undefined,
      };
    }

    const result = await createSupplierAllocation(input);

    if (result.success) {
      push(`/services/${serviceId}`);
      router.refresh();
    } else {
      setError(getCreateSupplierAllocationErrorMessage(result.error, dictionary));
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      {canUseRateCards && (
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-bright flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input
              type="radio"
              name="mode"
              value="manual_estimate"
              checked={mode === "manual_estimate"}
              onChange={() => handleModeChange("manual_estimate")}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            {dictionary.modes.manualEstimate}
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
            <input
              type="radio"
              name="mode"
              value="rate_card"
              checked={mode === "rate_card"}
              onChange={() => handleModeChange("rate_card")}
              className="w-4 h-4 text-primary focus:ring-primary"
            />
            {dictionary.modes.fromRateCard}
          </label>
        </div>
      )}

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <label htmlFor="supplierId" className="block text-sm font-semibold text-on-surface">
            {dictionary.supplier} <span className="text-error">*</span>
          </label>
          <select
            id="supplierId"
            name="supplierId"
            required
            value={selectedSupplierId}
            onChange={handleSupplierChange}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            disabled={isLoading}
            dir="auto"
          >
            <option value="">{dictionary.selectSupplier}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {isolateBidiText(s.name)}
              </option>
            ))}
          </select>
        </div>

        {mode === "rate_card" && (
          <div className="md:col-span-2 space-y-2">
            <label htmlFor="supplierRateCardId" className="block text-sm font-semibold text-on-surface">
              {dictionary.rateCardItem} <span className="text-error">*</span>
            </label>
            <select
              id="supplierRateCardId"
              name="supplierRateCardId"
              required={mode === "rate_card"}
              value={selectedRateCardId}
              onChange={handleRateCardChange}
              className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              disabled={isLoading || !selectedSupplierId || isLoadingRateCards}
              dir="auto"
            >
              <option value="">
                {isLoadingRateCards 
                  ? dictionary.loadingRateCards
                  : !selectedSupplierId 
                    ? dictionary.selectSupplierFirst
                    : rateCards.length === 0 
                      ? dictionary.noActiveRateCards
                      : dictionary.selectRateCard}
              </option>
              {rateCards.map((r) => (
                <option key={r.id} value={r.id}>
                  {isolateBidiText(
                    `${r.itemName} (${r.category || "—"}) - ${r.baseCost} SAR / ${r.unit}${r.pricingBasis ? ` (${r.pricingBasis})` : ""}`
                  )}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-semibold text-on-surface">
            {dictionary.category} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="category"
            name="category"
            required={mode === "manual_estimate"}
            value={mode === "rate_card" ? rcCategory : manualCategory}
            onChange={(event) => setManualCategory(event.target.value)}
            readOnly={mode === "rate_card"}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all read-only:bg-surface-container-low read-only:text-on-surface-variant"
            placeholder={dictionary.placeholders.category}
            disabled={isLoading}
            dir="auto"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="itemName" className="block text-sm font-semibold text-on-surface">
            {dictionary.itemName} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="itemName"
            name="itemName"
            required={mode === "manual_estimate"}
            value={mode === "rate_card" ? rcItemName : manualItemName}
            onChange={(event) => setManualItemName(event.target.value)}
            readOnly={mode === "rate_card"}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all read-only:bg-surface-container-low read-only:text-on-surface-variant"
            placeholder={dictionary.placeholders.itemName}
            disabled={isLoading}
            dir="auto"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="unit" className="block text-sm font-semibold text-on-surface">
            {dictionary.unit} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="unit"
            name="unit"
            required={mode === "manual_estimate"}
            value={mode === "rate_card" ? rcUnit : manualUnit}
            onChange={(event) => setManualUnit(event.target.value)}
            readOnly={mode === "rate_card"}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all read-only:bg-surface-container-low read-only:text-on-surface-variant"
            placeholder={dictionary.placeholders.unit}
            disabled={isLoading}
            dir="auto"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="quantity" className="block text-sm font-semibold text-on-surface">
            {dictionary.quantity} <span className="text-error">*</span>
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            min="0.001"
            max="9999999.999"
            step="0.001"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder={dictionary.placeholders.quantity}
            disabled={isLoading}
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="estimatedUnitCost" className="block text-sm font-semibold text-on-surface">
            {mode === "rate_card"
              ? dictionary.rateCardUnitCost
              : dictionary.estimatedUnitCost}{" "}
            <span className="text-error">*</span>
          </label>
          <input
            type="number"
            id="estimatedUnitCost"
            name="estimatedUnitCost"
            min="0"
            max="999999999999.99"
            step="0.01"
            required={mode === "manual_estimate"}
            value={mode === "rate_card" ? rcBaseCost : manualEstimatedUnitCost}
            onChange={(event) => setManualEstimatedUnitCost(event.target.value)}
            readOnly={mode === "rate_card"}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all read-only:bg-surface-container-low read-only:text-on-surface-variant"
            placeholder={dictionary.placeholders.estimatedUnitCost}
            disabled={isLoading}
            dir="ltr"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label htmlFor="scopeOfWork" className="block text-sm font-semibold text-on-surface">
            {dictionary.scopeOfWork}
          </label>
          <textarea
            id="scopeOfWork"
            name="scopeOfWork"
            rows={3}
            value={scopeOfWork}
            onChange={(event) => setScopeOfWork(event.target.value)}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            placeholder={dictionary.placeholders.scopeOfWork}
            disabled={isLoading}
            dir="auto"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label htmlFor="internalNotes" className="block text-sm font-semibold text-on-surface">
            {dictionary.internalNotes}
          </label>
          <textarea
            id="internalNotes"
            name="internalNotes"
            rows={2}
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            placeholder={dictionary.placeholders.internalNotes}
            disabled={isLoading}
            dir="auto"
          />
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-error-container text-on-error-container text-sm font-medium border-t border-error-container">
          {error}
        </div>
      )}

      <div className="px-6 py-4 bg-surface-bright border-t border-outline-variant flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => push(`/services/${serviceId}`)}
          disabled={isLoading}
          className="px-4 py-2 font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors disabled:opacity-50"
        >
          {dictionary.cancel}
        </button>
        <button
          type="submit"
          disabled={isLoading || isLoadingRateCards || (mode === "rate_card" && !rateCardPayloadReady)}
          className="px-6 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
          ) : (
            dictionary.create
          )}
        </button>
      </div>
    </form>
  );
}
