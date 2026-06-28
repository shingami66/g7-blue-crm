"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import { createSupplier } from "@/lib/suppliers/actions";
import {
  SAFE_SUPPLIER_CREATE_STATUSES,
  SUPPLIER_CATEGORIES,
} from "@/lib/suppliers/schemas";

const SUPPLIER_TYPES = ["company", "individual"] as const;
const VAT_REGISTRATION_STATUSES = ["not_registered", "registered", "unknown"] as const;

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

export default function SupplierCreateForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [supplierType, setSupplierType] = useState("");
  const [category, setCategory] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [coverageArea, setCoverageArea] = useState("");
  const [crNumber, setCrNumber] = useState("");
  const [vatRegistrationStatus, setVatRegistrationStatus] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [status, setStatus] = useState<(typeof SAFE_SUPPLIER_CREATE_STATUSES)[number]>("active");
  const [isPreferred, setIsPreferred] = useState(false);

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

    const result = await createSupplier({
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
      vatRegistrationStatus: emptyToUndefined(vatRegistrationStatus),
      vatNumber: emptyToUndefined(vatNumber),
      status,
      isPreferred,
    });

    if (result.success) {
      router.push("/suppliers");
      router.refresh();
      return;
    }

    setError(result.error ?? "Failed to create supplier.");
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
            New Supplier
          </h2>
          <p className="text-on-surface-variant text-[14px]">
            Create a supplier directory record for operational lookup.
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
                  <option value="">Not specified</option>
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
                  <option value="">Not specified</option>
                  {SUPPLIER_CATEGORIES.map((supplierCategory) => (
                    <option key={supplierCategory} value={supplierCategory}>
                      {formatOption(supplierCategory)}
                    </option>
                  ))}
                </select>
              </div>
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
                >
                  {SAFE_SUPPLIER_CREATE_STATUSES.map((supplierStatus) => (
                    <option key={supplierStatus} value={supplierStatus}>
                      {formatOption(supplierStatus)}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-semibold text-on-surface">
                <input
                  type="checkbox"
                  checked={isPreferred}
                  onChange={(event) => setIsPreferred(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Preferred supplier
              </label>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">
              Contact And Compliance
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
                  onChange={(event) => setVatRegistrationStatus(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">Not specified</option>
                  {VAT_REGISTRATION_STATUSES.map((vatStatus) => (
                    <option key={vatStatus} value={vatStatus}>
                      {formatOption(vatStatus)}
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
            {isSubmitting ? "Creating..." : "Create Supplier"}
          </button>
        </div>
      </form>
    </div>
  );
}
