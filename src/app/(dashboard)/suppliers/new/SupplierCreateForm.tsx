"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { AlertCircle, ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { createSupplier } from "@/lib/suppliers/actions";
import { SAFE_SUPPLIER_CREATE_STATUSES, SUPPLIER_CATEGORIES, SUPPLIER_VAT_STATUSES } from "@/lib/suppliers/schemas";
import { getSupplierCategoryLabel, getSupplierTypeLabel, type SuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";

const SUPPLIER_TYPES = ["company", "individual"] as const;

function optionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function SupplierCreateForm({ dictionary }: { dictionary: SuppliersDictionary }) {
  const router = useRouter();
  const { push } = useGlobalNavigationPending();
  const { locale } = dictionary;
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
  const [vatRegistrationStatus, setVatRegistrationStatus] = useState("unknown");
  const [vatNumber, setVatNumber] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [status, setStatus] = useState("active");
  const [isPreferred, setIsPreferred] = useState(false);
  const [notes, setNotes] = useState("");

  function validateRequiredFields() {
    if (!displayName.trim()) return dictionary.form.validation.nameRequired;
    if (!supplierType) return dictionary.form.validation.typeRequired;
    if (!category) return dictionary.form.validation.categoryRequired;
    if (!contactName.trim()) return dictionary.form.validation.contactRequired;
    if (!phone.trim()) return dictionary.form.validation.phoneRequired;
    if (!city.trim()) return dictionary.form.validation.cityRequired;
    if (!country.trim()) return dictionary.form.validation.countryRequired;
    if (vatRegistrationStatus === "registered" && !vatNumber.trim()) {
      return dictionary.form.validation.vatNumberRequired;
    }
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const validationError = validateRequiredFields();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    const result = await createSupplier({
      displayName,
      legalName: optionalValue(legalName),
      supplierType,
      category,
      contactName,
      phone,
      whatsappPhone: optionalValue(whatsappPhone),
      email: optionalValue(email),
      city,
      country,
      coverageArea: optionalValue(coverageArea),
      crNumber: optionalValue(crNumber),
      vatRegistrationStatus,
      vatNumber: optionalValue(vatNumber),
      paymentTerms: optionalValue(paymentTerms),
      status,
      isPreferred,
      notes: optionalValue(notes),
    });

    if (result.success) {
      router.push(`/suppliers/${result.supplierId}`);
      router.refresh();
      return;
    }

    setError(result.error ?? dictionary.form.validation.createFailed);
    setIsSubmitting(false);
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center gap-4 py-4">
        <button type="button" onClick={() => push("/suppliers")} className="rounded-lg border border-outline-variant bg-surface p-2 text-on-surface transition-colors hover:bg-surface-container-low" aria-label={dictionary.form.backToSuppliers}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-[28px] font-semibold leading-[36px] text-primary">{dictionary.form.newTitle}</h2>
          <p className="text-[14px] text-on-surface-variant">{dictionary.form.newSubtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <div className="flex items-center gap-2 rounded-lg bg-error-container p-4 text-[14px] text-on-error-container"><AlertCircle size={18} />{error}</div>}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-6">
            <h3 className="border-b border-surface-variant pb-2 font-semibold text-primary">{dictionary.form.directoryDetails}</h3>
            <Field label={dictionary.form.labels.supplierName}><input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClassName} dir="auto" /></Field>
            <Field label={dictionary.form.labels.legalName}><input value={legalName} onChange={(event) => setLegalName(event.target.value)} className={inputClassName} dir="auto" /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={dictionary.form.labels.supplierType}><select required value={supplierType} onChange={(event) => setSupplierType(event.target.value)} className={inputClassName}><option value="">{dictionary.form.placeholders.selectType}</option>{SUPPLIER_TYPES.map((type) => <option key={type} value={type}>{getSupplierTypeLabel(locale, type)}</option>)}</select></Field>
              <Field label={dictionary.form.labels.category}><select required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName}><option value="">{dictionary.form.placeholders.selectCategory}</option>{SUPPLIER_CATEGORIES.map((item) => <option key={item} value={item}>{getSupplierCategoryLabel(locale, item)}</option>)}</select></Field>
            </div>
            <Field label={dictionary.form.labels.coverageArea}><input value={coverageArea} onChange={(event) => setCoverageArea(event.target.value)} className={inputClassName} dir="auto" /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={dictionary.form.labels.status}><select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClassName}>{SAFE_SUPPLIER_CREATE_STATUSES.map((item) => <option key={item} value={item}>{dictionary.createStatuses[item]}</option>)}</select></Field>
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-semibold text-on-surface"><input type="checkbox" checked={isPreferred} onChange={(event) => setIsPreferred(event.target.checked)} className="h-4 w-4 accent-primary" />{dictionary.form.labels.preferredSupplier}</label>
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-6">
            <h3 className="border-b border-surface-variant pb-2 font-semibold text-primary">{dictionary.form.contactLegal}</h3>
            <Field label={dictionary.form.labels.contactName}><input required value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClassName} dir="auto" /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label={dictionary.form.labels.phone}><input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClassName} dir="ltr" /></Field><Field label={dictionary.form.labels.whatsappPhone}><input type="tel" value={whatsappPhone} onChange={(event) => setWhatsappPhone(event.target.value)} className={inputClassName} dir="ltr" /></Field></div>
            <Field label={dictionary.form.labels.email}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClassName} dir="ltr" /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label={dictionary.form.labels.city}><input required value={city} onChange={(event) => setCity(event.target.value)} className={inputClassName} dir="auto" /></Field><Field label={dictionary.form.labels.country}><input required value={country} onChange={(event) => setCountry(event.target.value)} className={inputClassName} dir="auto" /></Field></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label={dictionary.form.labels.crNumber}><input value={crNumber} onChange={(event) => setCrNumber(event.target.value)} className={inputClassName} dir="ltr" /></Field><Field label={dictionary.form.labels.vatRegistration}><select value={vatRegistrationStatus} onChange={(event) => setVatRegistrationStatus(event.target.value)} className={inputClassName}>{SUPPLIER_VAT_STATUSES.map((item) => <option key={item} value={item}>{dictionary.vatRegistration[item]}</option>)}</select></Field></div>
            <Field label={dictionary.form.labels.vatNumber}><input value={vatNumber} onChange={(event) => setVatNumber(event.target.value)} className={inputClassName} dir="ltr" disabled={vatRegistrationStatus !== "registered"} /></Field>
            <Field label={dictionary.form.labels.paymentTerms}><textarea value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} rows={3} className={inputClassName} dir="auto" /></Field>
            <Field label={dictionary.form.labels.internalNotes}><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className={inputClassName} placeholder={dictionary.form.placeholders.notes} dir="auto" /></Field>
          </section>
        </div>
        <div className="mt-4 flex justify-end gap-3"><button type="button" onClick={() => push("/suppliers")} disabled={isSubmitting} className="rounded-lg border border-outline-variant bg-surface px-6 py-2 font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50">{dictionary.form.buttons.cancel}</button><Button type="submit" loading={isSubmitting}><Save size={18} />{dictionary.form.buttons.create}</Button></div>
      </form>
    </div>
  );
}

const inputClassName = "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-1.5"><label className="text-[14px] font-semibold text-on-surface">{label}</label>{children}</div>;
}
