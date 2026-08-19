"use client";

import { type FormEvent, type ReactNode, useState } from "react";
import { AlertCircle, Save } from "lucide-react";
import { LocaleBackIcon } from "@/components/i18n/LocaleBackIcon";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { updateSupplier } from "@/lib/suppliers/actions";
import { SAFE_SUPPLIER_CREATE_STATUSES, SUPPLIER_CATEGORIES, SUPPLIER_VAT_STATUSES } from "@/lib/suppliers/schemas";
import { getSupplierCategoryLabel, getSupplierTypeLabel, type SuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import type { Supplier } from "@/types/supplier";

const SUPPLIER_TYPES = ["company", "individual"] as const;
const inputClassName = "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";

function optionalValue(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function SupplierEditForm({ supplier, dictionary, canManageBankDetails }: { supplier: Supplier; dictionary: SuppliersDictionary; canManageBankDetails: boolean }) {
  const router = useRouter();
  const { push } = useGlobalNavigationPending();
  const { locale } = dictionary;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(supplier.name);
  const [legalName, setLegalName] = useState(supplier.legalName ?? "");
  const [supplierType, setSupplierType] = useState(supplier.supplierType ?? "");
  const [category, setCategory] = useState(supplier.category ?? "");
  const [contactName, setContactName] = useState(supplier.contactName);
  const [phone, setPhone] = useState(supplier.phone);
  const [whatsappPhone, setWhatsappPhone] = useState(supplier.whatsappPhone ?? "");
  const [email, setEmail] = useState(supplier.email ?? "");
  const [city, setCity] = useState(supplier.city ?? "");
  const [country, setCountry] = useState(supplier.country ?? "");
  const [coverageArea, setCoverageArea] = useState(supplier.coverageArea ?? "");
  const [crNumber, setCrNumber] = useState(supplier.crNumber ?? "");
  const [vatRegistrationStatus, setVatRegistrationStatus] = useState<string>(supplier.vatRegistrationStatus ?? "unknown");
  const [vatNumber, setVatNumber] = useState(supplier.vatNumber ?? "");
  const [paymentTerms, setPaymentTerms] = useState(supplier.paymentTerms ?? "");
  const [status, setStatus] = useState<string>(supplier.status);
  const [isPreferred, setIsPreferred] = useState(supplier.isPreferred);
  const [notes, setNotes] = useState(supplier.notes ?? "");
  const [bankName, setBankName] = useState(supplier.bankName ?? "");
  const [bankAccountName, setBankAccountName] = useState(supplier.bankAccountName ?? "");
  const [iban, setIban] = useState(supplier.iban ?? "");

  function validateRequiredFields() {
    if (!displayName.trim()) return dictionary.form.validation.nameRequired;
    if (!supplierType) return dictionary.form.validation.typeRequired;
    if (!category) return dictionary.form.validation.categoryRequired;
    if (!contactName.trim()) return dictionary.form.validation.contactRequired;
    if (!phone.trim()) return dictionary.form.validation.phoneRequired;
    if (!city.trim()) return dictionary.form.validation.cityRequired;
    if (!country.trim()) return dictionary.form.validation.countryRequired;
    if (vatRegistrationStatus === "registered" && !vatNumber.trim()) return dictionary.form.validation.vatNumberRequired;
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
    const input = {
      id: supplier.id,
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
      ...(canManageBankDetails
        ? {
            bankName: optionalValue(bankName),
            bankAccountName: optionalValue(bankAccountName),
            iban: optionalValue(iban),
          }
        : {}),
    };
    const result = await updateSupplier(input);

    if (result.success) {
      router.push(`/suppliers/${supplier.id}`);
      router.refresh();
      return;
    }

    setError(result.error ?? dictionary.form.validation.updateFailed);
    setIsSubmitting(false);
  }

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-center gap-4 py-4"><button type="button" onClick={() => push(`/suppliers/${supplier.id}`)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label={dictionary.form.backToSupplier}><LocaleBackIcon size={16} /></button><div><h2 className="text-[28px] font-semibold leading-[36px] text-primary">{dictionary.form.editTitle}</h2><p className="text-[14px] text-on-surface-variant">{dictionary.form.editSubtitle}</p></div></div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <div className="flex items-center gap-2 rounded-lg bg-error-container p-4 text-[14px] text-on-error-container"><AlertCircle size={18} />{error}</div>}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-6"><h3 className="border-b border-surface-variant pb-2 font-semibold text-primary">{dictionary.form.directoryDetails}</h3><Field label={dictionary.form.labels.supplierName}><input required value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClassName} dir="auto" /></Field><Field label={dictionary.form.labels.legalName}><input value={legalName} onChange={(event) => setLegalName(event.target.value)} className={inputClassName} dir="auto" /></Field><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label={dictionary.form.labels.supplierType}><select required value={supplierType} onChange={(event) => setSupplierType(event.target.value)} className={inputClassName}><option value="">{dictionary.form.placeholders.selectType}</option>{SUPPLIER_TYPES.map((type) => <option key={type} value={type}>{getSupplierTypeLabel(locale, type)}</option>)}</select></Field><Field label={dictionary.form.labels.category}><select required value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName}><option value="">{dictionary.form.placeholders.selectCategory}</option>{SUPPLIER_CATEGORIES.map((item) => <option key={item} value={item}>{getSupplierCategoryLabel(locale, item)}</option>)}</select></Field></div><Field label={dictionary.form.labels.coverageArea}><input value={coverageArea} onChange={(event) => setCoverageArea(event.target.value)} className={inputClassName} dir="auto" /></Field><Field label={dictionary.form.labels.status}><select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClassName} disabled={supplier.status === "blacklisted"}>{supplier.status === "blacklisted" ? <option value="blacklisted">{dictionary.statuses.blacklisted}</option> : SAFE_SUPPLIER_CREATE_STATUSES.map((item) => <option key={item} value={item}>{dictionary.createStatuses[item]}</option>)}</select></Field><label className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-semibold text-on-surface"><input type="checkbox" checked={isPreferred} onChange={(event) => setIsPreferred(event.target.checked)} className="h-4 w-4 accent-primary" />{dictionary.form.labels.preferredSupplier}</label></section>
          <section className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-6"><h3 className="border-b border-surface-variant pb-2 font-semibold text-primary">{dictionary.form.contactLegal}</h3><Field label={dictionary.form.labels.contactName}><input required value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClassName} dir="auto" /></Field><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label={dictionary.form.labels.phone}><input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClassName} dir="ltr" /></Field><Field label={dictionary.form.labels.whatsappPhone}><input type="tel" value={whatsappPhone} onChange={(event) => setWhatsappPhone(event.target.value)} className={inputClassName} dir="ltr" /></Field></div><Field label={dictionary.form.labels.email}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClassName} dir="ltr" /></Field><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label={dictionary.form.labels.city}><input required value={city} onChange={(event) => setCity(event.target.value)} className={inputClassName} dir="auto" /></Field><Field label={dictionary.form.labels.country}><input required value={country} onChange={(event) => setCountry(event.target.value)} className={inputClassName} dir="auto" /></Field></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label={dictionary.form.labels.crNumber}><input value={crNumber} onChange={(event) => setCrNumber(event.target.value)} className={inputClassName} dir="ltr" /></Field><Field label={dictionary.form.labels.vatRegistration}><select value={vatRegistrationStatus} onChange={(event) => setVatRegistrationStatus(event.target.value)} className={inputClassName}>{SUPPLIER_VAT_STATUSES.map((item) => <option key={item} value={item}>{dictionary.vatRegistration[item]}</option>)}</select></Field></div><Field label={dictionary.form.labels.vatNumber}><input value={vatNumber} onChange={(event) => setVatNumber(event.target.value)} className={inputClassName} dir="ltr" disabled={vatRegistrationStatus !== "registered"} /></Field><Field label={dictionary.form.labels.paymentTerms}><textarea value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} rows={3} className={inputClassName} dir="auto" /></Field><Field label={dictionary.form.labels.internalNotes}><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className={inputClassName} dir="auto" /></Field></section>
        </div>
        {canManageBankDetails && <section className="flex flex-col gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-6"><h3 className="border-b border-surface-variant pb-2 font-semibold text-primary">{dictionary.form.bankDetails}</h3><div className="grid grid-cols-1 gap-4 md:grid-cols-3"><Field label={dictionary.form.labels.bankName}><input value={bankName} onChange={(event) => setBankName(event.target.value)} className={inputClassName} dir="auto" /></Field><Field label={dictionary.form.labels.bankAccountName}><input value={bankAccountName} onChange={(event) => setBankAccountName(event.target.value)} className={inputClassName} dir="auto" /></Field><Field label={dictionary.form.labels.iban}><input value={iban} onChange={(event) => setIban(event.target.value)} className={inputClassName} dir="ltr" /></Field></div></section>}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3"><Button type="button" onClick={() => push(`/suppliers/${supplier.id}`)} disabled={isSubmitting} variant="outline" size="sm" className="h-9 min-h-9 whitespace-nowrap">{dictionary.form.buttons.cancel}</Button><Button type="submit" loading={isSubmitting} size="sm" className="h-9 min-h-9 whitespace-nowrap"><span className="inline-flex items-center gap-2"><Save size={16} aria-hidden="true" />{dictionary.form.buttons.update}</span></Button></div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-1.5"><label className="text-[14px] font-semibold text-on-surface">{label}</label>{children}</div>;
}
