"use client";

import { useState } from "react";
import type { Customer } from "@/types/customer";

type CustomerTypeChoice = NonNullable<Customer["customerType"]> | "";

export function CustomerCoreFields({ customer }: { customer: Customer | null }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <TextInput
        label="Company *"
        name="company"
        defaultValue={customer?.company}
        placeholder="Company name"
        required
      />
      <TextInput
        label="Contact Person *"
        name="contact"
        defaultValue={customer?.contact}
        placeholder="Contact name"
        required
      />
      <TextInput
        label="Phone *"
        name="phone"
        defaultValue={customer?.phone}
        placeholder="+966 5X XXX XXXX"
        required
      />
      <TextInput
        label="Email *"
        name="email"
        type="email"
        defaultValue={customer?.email}
        placeholder="email@company.com"
        required
      />
      <TextInput
        label="City *"
        name="city"
        defaultValue={customer?.city}
        placeholder="Riyadh"
        required
      />
      <div>
        <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
          Status
        </label>
        <select
          name="status"
          defaultValue={customer?.status ?? "lead"}
          className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
        >
          <option value="lead">Lead</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
}

export function CustomerOfficialBillingFields({
  customer,
}: {
  customer: Customer | null;
}) {
  const [customerType, setCustomerType] = useState<CustomerTypeChoice>(
    customer?.customerType ?? ""
  );
  const showCompanyFields = customerType !== "individual";

  return (
    <fieldset className="border-t border-outline-variant pt-4">
      <legend className="text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em]">
        Official & Billing Details
      </legend>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
            Customer Type
          </label>
          <select
            name="customer_type"
            value={customerType}
            onChange={(event) =>
              setCustomerType(event.target.value as CustomerTypeChoice)
            }
            className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
          >
            <option value="">Not specified</option>
            <option value="individual">Individual</option>
            <option value="company">Company</option>
          </select>
        </div>
        {customerType === "individual" && (
          <div className="sm:col-span-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] leading-[20px] text-on-surface-variant">
            Individual customer — company registration and billing fields are
            not required.
          </div>
        )}
        {showCompanyFields && (
          <>
            <TextInput
              label="Legal Name"
              name="legal_name"
              defaultValue={customer?.legalName}
              placeholder="Legal billing name"
            />
            <TextInput
              label="CR Number"
              name="commercial_registration_number"
              defaultValue={customer?.commercialRegistrationNumber}
              placeholder="Commercial Registration"
            />
            <TextInput
              label="VAT Number"
              name="vat_number"
              defaultValue={customer?.vatNumber}
              placeholder="VAT number"
            />
            <TextInput
              label="Billing Email"
              name="billing_email"
              type="email"
              defaultValue={customer?.billingEmail}
              placeholder="billing@company.com"
            />
            <TextInput
              label="Finance Contact Name"
              name="finance_contact_name"
              defaultValue={customer?.financeContactName}
              placeholder="Finance contact"
            />
            <TextInput
              label="Finance Contact Phone"
              name="finance_contact_phone"
              defaultValue={customer?.financeContactPhone}
              placeholder="+966 5X XXX XXXX"
            />
            <div>
              <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                Payment Terms
              </label>
              <textarea
                name="payment_terms"
                defaultValue={customer?.paymentTerms ?? ""}
                rows={3}
                className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary resize-y"
                placeholder="Optional payment terms"
              />
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] leading-[20px] text-on-surface">
              <input
                type="checkbox"
                name="po_required"
                defaultChecked={customer?.poRequired ?? false}
                className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              PO Required
            </label>
          </>
        )}
      </div>

      {showCompanyFields && (
        <div className="mt-4">
          <div className="text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-2">
            National Address
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextInput
              label="Building Number"
              name="national_address_building_number"
              defaultValue={customer?.nationalAddressBuildingNumber}
              placeholder="Building number"
            />
            <TextInput
              label="Street"
              name="national_address_street"
              defaultValue={customer?.nationalAddressStreet}
              placeholder="Street"
            />
            <TextInput
              label="District"
              name="national_address_district"
              defaultValue={customer?.nationalAddressDistrict}
              placeholder="District"
            />
            <TextInput
              label="City"
              name="national_address_city"
              defaultValue={customer?.nationalAddressCity}
              placeholder="City"
            />
            <TextInput
              label="Postal Code"
              name="national_address_postal_code"
              defaultValue={customer?.nationalAddressPostalCode}
              placeholder="Postal code"
            />
            <TextInput
              label="Additional Number"
              name="national_address_additional_number"
              defaultValue={customer?.nationalAddressAdditionalNumber}
              placeholder="Additional number"
            />
            <TextInput
              label="Country"
              name="national_address_country"
              defaultValue={customer?.nationalAddressCountry}
              placeholder="Saudi Arabia"
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
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  type?: "email" | "text";
  required?: boolean;
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
      />
    </div>
  );
}
