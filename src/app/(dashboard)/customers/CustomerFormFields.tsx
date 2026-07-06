"use client";

import { useState } from "react";
import type { CustomersDictionary } from "@/lib/i18n/dictionaries/customers";
import type { Customer } from "@/types/customer";

type CustomerTypeChoice = NonNullable<Customer["customerType"]> | "";

export function CustomerCoreFields({
  customer,
  dictionary,
}: {
  customer: Customer | null;
  dictionary: CustomersDictionary;
}) {
  const labels = dictionary.form.core;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <TextInput
        label={labels.company}
        name="company"
        defaultValue={customer?.company}
        placeholder={labels.companyPlaceholder}
        required
      />
      <TextInput
        label={labels.contactPerson}
        name="contact"
        defaultValue={customer?.contact}
        placeholder={labels.contactPersonPlaceholder}
        required
      />
      <TextInput
        label={labels.phone}
        name="phone"
        defaultValue={customer?.phone}
        placeholder={labels.phonePlaceholder}
        dir="ltr"
        required
      />
      <TextInput
        label={labels.email}
        name="email"
        type="email"
        defaultValue={customer?.email}
        placeholder={labels.emailPlaceholder}
        dir="ltr"
        required
      />
      <TextInput
        label={labels.city}
        name="city"
        defaultValue={customer?.city}
        placeholder={labels.cityPlaceholder}
        required
      />
      <div>
        <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
          {labels.status}
        </label>
        <select
          name="status"
          defaultValue={customer?.status ?? "lead"}
          className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="lead">{dictionary.customerStatuses.lead}</option>
          <option value="active">{dictionary.customerStatuses.active}</option>
          <option value="inactive">{dictionary.customerStatuses.inactive}</option>
        </select>
      </div>
    </div>
  );
}

export function CustomerOfficialBillingFields({
  customer,
  dictionary,
}: {
  customer: Customer | null;
  dictionary: CustomersDictionary;
}) {
  const labels = dictionary.form.officialBilling;
  const [customerType, setCustomerType] = useState<CustomerTypeChoice>(
    customer?.customerType ?? ""
  );
  const showCompanyFields = customerType !== "individual";

  return (
    <fieldset className="border-t border-outline-variant pt-4">
      <legend className="text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em]">
        {labels.title}
      </legend>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
            {labels.customerType}
          </label>
          <select
            name="customer_type"
            value={customerType}
            onChange={(event) =>
              setCustomerType(event.target.value as CustomerTypeChoice)
            }
            className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="">{labels.notSpecified}</option>
            <option value="individual">{labels.individual}</option>
            <option value="company">{labels.company}</option>
          </select>
        </div>
        {customerType === "individual" && (
          <div className="sm:col-span-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] leading-[20px] text-on-surface-variant">
            {labels.individualHint}
          </div>
        )}
        {showCompanyFields && (
          <>
            <TextInput
              label={labels.legalName}
              name="legal_name"
              defaultValue={customer?.legalName}
              placeholder={labels.legalNamePlaceholder}
            />
            <TextInput
              label={labels.crNumber}
              name="commercial_registration_number"
              defaultValue={customer?.commercialRegistrationNumber}
              placeholder={labels.crNumberPlaceholder}
              dir="ltr"
            />
            <TextInput
              label={labels.vatNumber}
              name="vat_number"
              defaultValue={customer?.vatNumber}
              placeholder={labels.vatNumberPlaceholder}
              dir="ltr"
            />
            <TextInput
              label={labels.billingEmail}
              name="billing_email"
              type="email"
              defaultValue={customer?.billingEmail}
              placeholder={labels.billingEmailPlaceholder}
              dir="ltr"
            />
            <TextInput
              label={labels.financeContactName}
              name="finance_contact_name"
              defaultValue={customer?.financeContactName}
              placeholder={labels.financeContactNamePlaceholder}
            />
            <TextInput
              label={labels.financeContactPhone}
              name="finance_contact_phone"
              defaultValue={customer?.financeContactPhone}
              placeholder={labels.financeContactPhonePlaceholder}
              dir="ltr"
            />
            <div>
              <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                {labels.paymentTerms}
              </label>
              <textarea
                name="payment_terms"
                defaultValue={customer?.paymentTerms ?? ""}
                rows={3}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary resize-y"
                placeholder={labels.paymentTermsPlaceholder}
              />
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] leading-[20px] text-on-surface">
              <input
                type="checkbox"
                name="po_required"
                defaultChecked={customer?.poRequired ?? false}
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              {labels.poRequired}
            </label>
          </>
        )}
      </div>

      {showCompanyFields && (
        <div className="mt-4">
          <div className="text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-2">
            {labels.nationalAddress}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label={labels.buildingNumber}
              name="national_address_building_number"
              defaultValue={customer?.nationalAddressBuildingNumber}
              placeholder={labels.buildingNumberPlaceholder}
              dir="ltr"
            />
            <TextInput
              label={labels.street}
              name="national_address_street"
              defaultValue={customer?.nationalAddressStreet}
              placeholder={labels.streetPlaceholder}
            />
            <TextInput
              label={labels.district}
              name="national_address_district"
              defaultValue={customer?.nationalAddressDistrict}
              placeholder={labels.districtPlaceholder}
            />
            <TextInput
              label={labels.addressCity}
              name="national_address_city"
              defaultValue={customer?.nationalAddressCity}
              placeholder={labels.addressCityPlaceholder}
            />
            <TextInput
              label={labels.postalCode}
              name="national_address_postal_code"
              defaultValue={customer?.nationalAddressPostalCode}
              placeholder={labels.postalCodePlaceholder}
              dir="ltr"
            />
            <TextInput
              label={labels.additionalNumber}
              name="national_address_additional_number"
              defaultValue={customer?.nationalAddressAdditionalNumber}
              placeholder={labels.additionalNumberPlaceholder}
              dir="ltr"
            />
            <TextInput
              label={labels.country}
              name="national_address_country"
              defaultValue={customer?.nationalAddressCountry}
              placeholder={labels.countryPlaceholder}
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}

function TextInput({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
  dir,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  type?: "email" | "text";
  required?: boolean;
  dir?: "auto" | "ltr" | "rtl";
}) {
  return (
    <div>
      <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
        placeholder={placeholder}
        dir={dir}
      />
    </div>
  );
}
