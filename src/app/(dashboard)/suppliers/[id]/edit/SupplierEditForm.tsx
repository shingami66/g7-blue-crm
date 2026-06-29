"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import { updateSupplier } from "@/lib/suppliers/actions";
import {
  SAFE_SUPPLIER_CREATE_STATUSES,
  SUPPLIER_CATEGORIES,
} from "@/lib/suppliers/schemas";
import type { Supplier, SupplierStatus } from "@/types/supplier";

const SUPPLIER_TYPES = ["company", "individual"] as const;
const VAT_REGISTRATION_OPTIONS = [
  { value: "not_registered", label: "Not Registered" },
  { value: "registered", label: "VAT Registered" },
] as const;

function formatOption(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function SupplierEditForm({ supplier }: { supplier: Supplier }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(supplier.name);
  const [legalName, setLegalName] = useState(supplier.legalName ?? "");
  const [supplierType, setSupplierType] = useState(supplier.supplierType ?? "");
  const [category, setCategory] = useState(supplier.category ?? "");
  const [contactName, setContactName] = useState(supplier.contactName ?? "");
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [whatsappPhone, setWhatsappPhone] = useState(supplier.whatsappPhone ?? "");
  const [email, setEmail] = useState(supplier.email ?? "");
  const [city, setCity] = useState(supplier.city ?? "");
  const [country, setCountry] = useState(supplier.country ?? "");
  const [coverageArea, setCoverageArea] = useState(supplier.coverageArea ?? "");
  // Using crNumber from existing supplier if it was part of the schema, but type/schema does not map it in getSupplierById (it's not selected).
  // Wait, is cr_number in SUPPLIER_LIST_SELECT? I need to check. If not, it shouldn't be edited here or we need to add it.
  // I will check this separately, but I will put it as empty string for now.
  const [crNumber, setCrNumber] = useState(supplier.crNumber ?? "");
  const [vatRegistrationStatus, setVatRegistrationStatus] = useState<
    (typeof VAT_REGISTRATION_OPTIONS)[number]["value"]
  >(supplier.vatRegistrationStatus === "registered" ? "registered" : "not_registered");
  const [vatNumber, setVatNumber] = useState(supplier.vatNumber ?? "");
  const [status, setStatus] = useState<SupplierStatus>(supplier.status);
  const [isPreferred, setIsPreferred] = useState(supplier.isPreferred ?? false);
  const [notes, setNotes] = useState(supplier.notes ?? "");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Supplier name is required.");
      return;
    }

    if (!phone.trim()) {
      setError("Phone is required.");
      return;
    }

    setIsSubmitting(true);

    const result = await updateSupplier({
      id: supplier.id,
      displayName: displayName.trim(),
      legalName: emptyToUndefined(legalName),
      supplierType: emptyToUndefined(supplierType),
      category: emptyToUndefined(category),
      contactName: emptyToUndefined(contactName),
      phone: phone.trim(),
      whatsappPhone: emptyToUndefined(whatsappPhone),
      email: emptyToUndefined(email),
      city: emptyToUndefined(city),
      country: emptyToUndefined(country),
      coverageArea: emptyToUndefined(coverageArea),
      crNumber: emptyToUndefined(crNumber),
      vatRegistrationStatus,
      vatNumber: emptyToUndefined(vatNumber),
      status,
      isPreferred,
      notes: emptyToUndefined(notes),
    });

    if (result.success) {
      router.push("/suppliers");
      router.refresh();
      return;
    }

    setError(result.error ?? "Failed to update supplier.");
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 py-4">
        <button
          type="button"
          onClick={() => router.push("/suppliers")}
          className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
          aria-label="Back to suppliers"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-[28px] leading-[36px] font-semibold text-primary tracking-tight">
            Edit Supplier
          </h2>
          <p className="text-on-surface-variant text-[14px]">
            Update supplier directory record.
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
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">
              Directory Details
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Supplier Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Legal Name</label>
              <input
                type="text"
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">Supplier Type</label>
                <select
                  value={supplierType}
                  onChange={(event) => setSupplierType(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">Select type</option>
                  {SUPPLIER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatOption(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">Category</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">Select category</option>
                  {SUPPLIER_CATEGORIES.map((supplierCategory) => (
                    <option key={supplierCategory} value={supplierCategory}>
                      {formatOption(supplierCategory)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-semibold text-on-surface">
              <input
                type="checkbox"
                checked={isPreferred}
                onChange={(event) => setIsPreferred(event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Preferred Supplier
            </label>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Coverage Area</label>
              <input
                type="text"
                value={coverageArea}
                onChange={(event) => setCoverageArea(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">Status</label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as (typeof SAFE_SUPPLIER_CREATE_STATUSES)[number])
                  }
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  disabled={!(SAFE_SUPPLIER_CREATE_STATUSES as readonly string[]).includes(supplier.status)}
                >
                  {SAFE_SUPPLIER_CREATE_STATUSES.map((supplierStatus) => (
                    <option key={supplierStatus} value={supplierStatus}>
                      {formatOption(supplierStatus)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">
              Contact & Legal
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">WhatsApp Phone</label>
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(event) => setWhatsappPhone(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">CR Number</label>
                <input
                  type="text"
                  value={crNumber}
                  onChange={(event) => setCrNumber(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">
                  VAT Registration
                </label>
                <select
                  value={vatRegistrationStatus}
                  onChange={(event) =>
                    setVatRegistrationStatus(
                      event.target.value as (typeof VAT_REGISTRATION_OPTIONS)[number]["value"],
                    )
                  }
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                >
                  {VAT_REGISTRATION_OPTIONS.map((vatStatus) => (
                    <option key={vatStatus.value} value={vatStatus.value}>
                      {vatStatus.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">VAT Number</label>
              <input
                type="text"
                value={vatNumber}
                onChange={(event) => setVatNumber(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">Internal Notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full resize-y bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                placeholder="Optional internal context for the supplier directory"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => router.push("/suppliers")}
            className="px-6 py-2 bg-surface border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-lg font-semibold transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {isSubmitting ? "Updating..." : "Update Supplier"}
          </button>
        </div>
      </form>
    </div>
  );
}
