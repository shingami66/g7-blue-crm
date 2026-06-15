"use client";

import { useActionState, useState } from "react";
import {
  Building2,
  Gavel,
  Landmark,
  Lock,
  Save,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import type { CompanySettingsPageData } from "@/types/settings";
import { updateCompanySettings } from "@/lib/settings/actions";
import type { CompanySettingsActionState } from "@/lib/settings/actions";

const fieldClass =
  "w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-[14px] focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:bg-surface disabled:text-on-surface-variant disabled:cursor-not-allowed";
const labelClass =
  "block text-[12px] font-semibold tracking-wider text-on-surface uppercase mb-1";
const initialCompanySettingsActionState: CompanySettingsActionState = {
  success: false,
};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  disabled,
  readOnly,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        className={fieldClass}
      />
    </div>
  );
}

function TextareaField({
  label,
  name,
  defaultValue,
  disabled,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  disabled?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        rows={rows}
        disabled={disabled}
        className={`${fieldClass} resize-none`}
      />
    </div>
  );
}

export default function SettingsForm({
  settings,
  canEdit,
  canViewBankDetails,
}: CompanySettingsPageData) {
  const [state, formAction, pending] = useActionState(
    updateCompanySettings,
    initialCompanySettingsActionState
  );
  const [vatMode, setVatMode] = useState(settings.vatMode);
  const [defaultVatPercent, setDefaultVatPercent] = useState(
    settings.vatMode === "not_registered" ? "0" : settings.defaultVatPercent.toString()
  );

  const isNotRegistered = vatMode === "not_registered";
  const controlsDisabled = !canEdit || pending;
  const bank = settings.bank;

  const handleVatModeChange = (nextVatMode: typeof vatMode) => {
    setVatMode(nextVatMode);
    setDefaultVatPercent(nextVatMode === "not_registered" ? "0" : "15");
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Company Settings"
        subtitle="Manage seller profile, VAT defaults, and company banking details for future documents."
      >
        {canEdit ? (
          <button
            type="submit"
            form="company-settings-form"
            disabled={pending}
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {pending ? "Saving..." : "Save Changes"}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2">
            <Lock size={16} />
            Read only
          </div>
        )}
      </PageHeader>

      <form id="company-settings-form" action={canEdit ? formAction : undefined}>
        <input type="hidden" name="currency" value="SAR" />

        {state.error && (
          <div className="mb-6 bg-error-container text-on-error-container border border-error/20 rounded-lg p-4 text-[14px]">
            {state.error}
          </div>
        )}
        {state.success && state.message && (
          <div className="mb-6 bg-status-active-bg text-status-active-text border border-status-active-text/20 rounded-lg p-4 text-[14px]">
            {state.message}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 flex flex-col gap-6">
            <section className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
                <Building2 size={20} className="text-surface-tint" />
                <h2 className="text-[20px] font-semibold text-primary">Company Profile</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="English Legal Company Name"
                  name="legal_name_en"
                  defaultValue={settings.legalNameEn}
                  disabled={controlsDisabled}
                />
                <Field
                  label="Arabic Legal Company Name"
                  name="legal_name_ar"
                  defaultValue={settings.legalNameAr}
                  disabled={controlsDisabled}
                />
                <Field
                  label="Official Email"
                  name="official_email"
                  type="email"
                  defaultValue={settings.officialEmail}
                  disabled={controlsDisabled}
                />
                <Field
                  label="Official Phone"
                  name="official_phone"
                  defaultValue={settings.officialPhone}
                  disabled={controlsDisabled}
                />
                <div className="md:col-span-2">
                  <TextareaField
                    label="National Address"
                    name="national_address"
                    defaultValue={settings.nationalAddress}
                    disabled={controlsDisabled}
                  />
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
                <Gavel size={20} className="text-surface-tint" />
                <h2 className="text-[20px] font-semibold text-primary">Legal & VAT</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Commercial Registration (CR)"
                  name="cr_number"
                  defaultValue={settings.crNumber}
                  disabled={controlsDisabled}
                />
                <Field
                  label="TIN / الرقم المميز"
                  name="tin_number"
                  defaultValue={settings.tinNumber}
                  disabled={controlsDisabled}
                />
                <div>
                  <label className={labelClass} htmlFor="vat_mode">
                    VAT Registration Status
                  </label>
                  <select
                    id="vat_mode"
                    name="vat_mode"
                    value={vatMode === "phase2_integrated" ? "vat_registered_phase_1" : vatMode}
                    onChange={(event) => handleVatModeChange(event.target.value as typeof vatMode)}
                    disabled={controlsDisabled}
                    className={fieldClass}
                  >
                    <option value="not_registered">Not registered</option>
                    <option value="vat_registered_phase_1">VAT registered - Phase 1</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="default_vat_percent">
                    Default VAT %
                  </label>
                  <input
                    id="default_vat_percent"
                    name="default_vat_percent"
                    type="number"
                    value={defaultVatPercent}
                    onChange={(event) => setDefaultVatPercent(event.target.value)}
                    readOnly={isNotRegistered}
                    disabled={controlsDisabled}
                    className={fieldClass}
                  />
                </div>
                <Field
                  label="VAT Number"
                  name="vat_number"
                  defaultValue={isNotRegistered ? "" : settings.vatNumber}
                  disabled={controlsDisabled || isNotRegistered}
                />
                <Field
                  label="VAT Effective Date"
                  name="vat_effective_date"
                  type="date"
                  defaultValue={isNotRegistered ? "" : settings.vatEffectiveDate}
                  disabled={controlsDisabled || isNotRegistered}
                />
                <div className="md:col-span-2 flex items-start gap-2 text-[13px] text-on-surface-variant bg-surface-container-low rounded-lg border border-outline-variant p-3">
                  <ShieldAlert size={16} className="text-primary mt-0.5 shrink-0" />
                  <p>
                    Company Settings are defaults for new records only. CS-A does not update old
                    quotations, invoices, or print layouts.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="xl:col-span-4 flex flex-col gap-6">
            <section className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
                <Landmark size={20} className="text-surface-tint" />
                <h2 className="text-[20px] font-semibold text-primary">Bank Details</h2>
              </div>
              {canViewBankDetails ? (
                <div className="p-6 space-y-4">
                  <Field
                    label="Bank Name"
                    name="bank_name"
                    defaultValue={bank?.bankName}
                    disabled={controlsDisabled}
                  />
                  <Field
                    label="IBAN"
                    name="bank_iban"
                    defaultValue={bank?.bankIban}
                    disabled={controlsDisabled}
                  />
                  <Field
                    label="Account Holder"
                    name="bank_account_holder"
                    defaultValue={bank?.bankAccountHolder}
                    disabled={controlsDisabled}
                  />
                </div>
              ) : (
                <div className="p-6 text-[14px] text-on-surface-variant flex items-start gap-2">
                  <Lock size={18} className="text-primary shrink-0 mt-0.5" />
                  <p>Bank details are restricted to Admin and Accountant roles.</p>
                </div>
              )}
            </section>

            <section className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
                <Settings2 size={20} className="text-surface-tint" />
                <h2 className="text-[20px] font-semibold text-primary">Finance Defaults</h2>
              </div>
              <div className="p-6 space-y-4">
                <Field label="Currency" name="currency_display" defaultValue="SAR" disabled />
                <TextareaField
                  label="Default Terms"
                  name="default_terms"
                  defaultValue={settings.defaultTerms}
                  disabled={controlsDisabled}
                  rows={7}
                />
              </div>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
