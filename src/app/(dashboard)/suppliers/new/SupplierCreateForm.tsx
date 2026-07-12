"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import { createSupplier } from "@/lib/suppliers/actions";
import {
  SAFE_SUPPLIER_CREATE_STATUSES,
  SUPPLIER_CATEGORIES,
} from "@/lib/suppliers/schemas";
import Button from "@/components/ui/Button";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import {
  getSupplierCategoryLabel,
  getSupplierTypeLabel,
  type SuppliersDictionary,
} from "@/lib/i18n/dictionaries/suppliers";
import type { SupplierType } from "@/types/supplier";

const SUPPLIER_TYPES = ["company", "individual"] as const;

function emptyToUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default function SupplierCreateForm({
  dictionary,
}: {
  dictionary: SuppliersDictionary;
}) {
  const router = useRouter();
  const { push } = useGlobalNavigationPending();
  const locale = dictionary.locale;
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
  const [vatRegistrationStatus, setVatRegistrationStatus] = useState<
    "not_registered" | "registered"
  >("not_registered");
  const [vatNumber, setVatNumber] = useState("");
  const [status, setStatus] = useState<(typeof SAFE_SUPPLIER_CREATE_STATUSES)[number]>("active");
  const [isPreferred, setIsPreferred] = useState(false);
  const [notes, setNotes] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError(dictionary.form.validation.nameRequired);
      return;
    }

    if (!phone.trim()) {
      setError(dictionary.form.validation.phoneRequired);
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

    setError(result.error ?? dictionary.form.validation.createFailed);
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 py-4">
        <button
          type="button"
          onClick={() => push("/suppliers")}
          className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
          aria-label={dictionary.form.backToSuppliers}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-[28px] leading-[36px] font-semibold text-primary tracking-tight">
            {dictionary.form.newTitle}
          </h2>
          <p className="text-on-surface-variant text-[14px]">{dictionary.form.newSubtitle}</p>
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
              {dictionary.form.directoryDetails}
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">
                {dictionary.form.labels.supplierName}
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                required
                dir="auto"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">
                {dictionary.form.labels.legalName}
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(event) => setLegalName(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                dir="auto"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">
                  {dictionary.form.labels.supplierType}
                </label>
                <select
                  value={supplierType}
                  onChange={(event) => setSupplierType(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">{dictionary.form.placeholders.selectType}</option>
                  {SUPPLIER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {getSupplierTypeLabel(locale, type as SupplierType)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">
                  {dictionary.form.labels.category}
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="">{dictionary.form.placeholders.selectCategory}</option>
                  {SUPPLIER_CATEGORIES.map((supplierCategory) => (
                    <option key={supplierCategory} value={supplierCategory}>
                      {getSupplierCategoryLabel(locale, supplierCategory)}
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
              {dictionary.form.labels.preferredSupplier}
            </label>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">
                {dictionary.form.labels.coverageArea}
              </label>
              <input
                type="text"
                value={coverageArea}
                onChange={(event) => setCoverageArea(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                dir="auto"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">
                  {dictionary.form.labels.status}
                </label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as (typeof SAFE_SUPPLIER_CREATE_STATUSES)[number])
                  }
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                >
                  {SAFE_SUPPLIER_CREATE_STATUSES.map((supplierStatus) => (
                    <option key={supplierStatus} value={supplierStatus}>
                      {dictionary.createStatuses[supplierStatus]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-primary border-b border-surface-variant pb-2">
              {dictionary.form.contactLegal}
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">
                {dictionary.form.labels.contactName}
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                dir="auto"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">
                  {dictionary.form.labels.phone}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  required
                  dir="ltr"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">
                  {dictionary.form.labels.whatsappPhone}
                </label>
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(event) => setWhatsappPhone(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">
                {dictionary.form.labels.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                dir="ltr"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">
                  {dictionary.form.labels.city}
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  dir="auto"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">
                  {dictionary.form.labels.country}
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  dir="auto"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">
                  {dictionary.form.labels.crNumber}
                </label>
                <input
                  type="text"
                  value={crNumber}
                  onChange={(event) => setCrNumber(event.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                  dir="ltr"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[14px] font-semibold text-on-surface">
                  {dictionary.form.labels.vatRegistration}
                </label>
                <select
                  value={vatRegistrationStatus}
                  onChange={(event) =>
                    setVatRegistrationStatus(
                      event.target.value as "not_registered" | "registered",
                    )
                  }
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="not_registered">
                    {dictionary.vatRegistration.not_registered}
                  </option>
                  <option value="registered">{dictionary.vatRegistration.registered}</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">
                {dictionary.form.labels.vatNumber}
              </label>
              <input
                type="text"
                value={vatNumber}
                onChange={(event) => setVatNumber(event.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                dir="ltr"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[14px] font-semibold text-on-surface">
                {dictionary.form.labels.internalNotes}
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="w-full resize-y bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] text-on-surface focus:outline-none focus:border-primary"
                placeholder={dictionary.form.placeholders.notes}
                dir="auto"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => push("/suppliers")}
            className="px-6 py-2 bg-surface border border-outline-variant hover:bg-surface-container-low text-on-surface rounded-lg font-semibold transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            {dictionary.form.buttons.cancel}
          </button>
          <Button type="submit" loading={isSubmitting}>
            <Save size={18} />
            {dictionary.form.buttons.create}
          </Button>
        </div>
      </form>
    </div>
  );
}
