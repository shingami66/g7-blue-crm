"use client";

import { useActionState, useState, useEffect, useRef } from "react";
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
import Button from "@/components/ui/Button";
import {
  mapSettingsActionMessage,
  type SettingsDictionary,
} from "@/lib/i18n/dictionaries/settings";

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
  dir,
  lang,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  dir?: "ltr" | "rtl" | "auto";
  /** Optional BCP 47 language tag for the control presentation. */
  lang?: string;
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
        dir={dir}
        lang={lang}
      />
    </div>
  );
}

/**
 * Deterministic ISO calendar date control for Settings.
 * Avoids ambiguous empty browser date-picker placeholders.
 * Value remains YYYY-MM-DD for existing server actions.
 */
function IsoDateField({
  label,
  name,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const isValid =
    value.trim() === "" || /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

  return (
    <div>
      <label className={labelClass} htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder="YYYY-MM-DD"
        value={value}
        disabled={disabled}
        dir="ltr"
        lang="en"
        pattern="\d{4}-\d{2}-\d{2}"
        title="YYYY-MM-DD"
        className={fieldClass}
        onChange={(event) => {
          // Allow only digits and hyphens while typing toward ISO shape.
          const next = event.target.value.replace(/[^\d-]/g, "").slice(0, 10);
          setValue(next);
        }}
        aria-invalid={isValid ? undefined : true}
      />
      {!isValid && (
        <p className="mt-1 text-[12px] text-error" dir="ltr">
          YYYY-MM-DD
        </p>
      )}
    </div>
  );
}

function TextareaField({
  label,
  name,
  defaultValue,
  disabled,
  rows = 3,
  dir,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  disabled?: boolean;
  rows?: number;
  dir?: "ltr" | "rtl" | "auto";
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
        dir={dir}
      />
    </div>
  );
}

export default function SettingsForm({
  settings,
  canEdit,
  canViewBankDetails,
  dictionary,
}: CompanySettingsPageData & { dictionary: SettingsDictionary }) {
  const locale = dictionary.locale;
  const [state, formAction, pending] = useActionState(
    updateCompanySettings,
    initialCompanySettingsActionState
  );
  const [isEditing, setIsEditing] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [vatMode, setVatMode] = useState(settings.vatMode);
  const [defaultVatPercent, setDefaultVatPercent] = useState(
    settings.vatMode === "not_registered" ? "0" : settings.defaultVatPercent.toString()
  );

  const prevPending = useRef(pending);

  useEffect(() => {
    if (prevPending.current && !pending) {
      if (state.success) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsEditing(false);
        setResetKey((prev) => prev + 1);
      }
    }
    prevPending.current = pending;
  }, [pending, state.success]);

  const handleCancel = () => {
    setIsEditing(false);
    setVatMode(settings.vatMode);
    setDefaultVatPercent(
      settings.vatMode === "not_registered" ? "0" : settings.defaultVatPercent.toString()
    );
    setResetKey((prev) => prev + 1);
  };

  const isNotRegistered = vatMode === "not_registered";
  const controlsDisabled = !canEdit || pending || !isEditing;
  const bank = settings.bank;

  const handleVatModeChange = (nextVatMode: typeof vatMode) => {
    setVatMode(nextVatMode);
    setDefaultVatPercent(nextVatMode === "not_registered" ? "0" : "15");
  };

  const displayError = state.error
    ? mapSettingsActionMessage(locale, state.error)
    : null;
  const displaySuccess =
    state.success && state.message
      ? mapSettingsActionMessage(locale, state.message)
      : null;

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto pb-12">
      <PageHeader title={dictionary.page.title} subtitle={dictionary.page.subtitle}>
        {canEdit ? (
          isEditing ? (
            <div className="flex items-center gap-3">
              <Button onClick={handleCancel} disabled={pending} variant="ghost">
                {dictionary.actions.cancel}
              </Button>
              <Button form="company-settings-form" loading={pending} type="submit">
                <Save size={18} />
                {pending ? dictionary.actions.saving : dictionary.actions.save}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="secondary">
              <Settings2 size={18} />
              {dictionary.actions.edit}
            </Button>
          )
        ) : (
          <div className="flex items-center gap-2 text-[13px] text-on-surface-variant bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2">
            <Lock size={16} />
            {dictionary.states.readOnly}
          </div>
        )}
      </PageHeader>

      <form key={resetKey} id="company-settings-form" action={canEdit ? formAction : undefined}>
        <input type="hidden" name="currency" value="SAR" />

        {displayError && (
          <div className="mb-6 bg-error-container text-on-error-container border border-error/20 rounded-lg p-4 text-[14px]">
            {displayError}
          </div>
        )}
        {displaySuccess && (
          <div className="mb-6 bg-status-active-bg text-status-active-text border border-status-active-text/20 rounded-lg p-4 text-[14px]">
            {displaySuccess}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 flex flex-col gap-6">
            <section className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
                <Building2 size={20} className="text-surface-tint" />
                <h2 className="text-[20px] font-semibold text-primary">
                  {dictionary.sections.companyProfile}
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label={dictionary.labels.legalNameEn}
                  name="legal_name_en"
                  defaultValue={settings.legalNameEn}
                  disabled={controlsDisabled}
                  dir="ltr"
                />
                <Field
                  label={dictionary.labels.legalNameAr}
                  name="legal_name_ar"
                  defaultValue={settings.legalNameAr}
                  disabled={controlsDisabled}
                  dir="auto"
                />
                <Field
                  label={dictionary.labels.officialEmail}
                  name="official_email"
                  type="email"
                  defaultValue={settings.officialEmail}
                  disabled={controlsDisabled}
                  dir="ltr"
                />
                <Field
                  label={dictionary.labels.officialPhone}
                  name="official_phone"
                  defaultValue={settings.officialPhone}
                  disabled={controlsDisabled}
                  dir="ltr"
                />
                <div className="md:col-span-2">
                  <TextareaField
                    label={dictionary.labels.nationalAddress}
                    name="national_address"
                    defaultValue={settings.nationalAddress}
                    disabled={controlsDisabled}
                    dir="auto"
                  />
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
                <Gavel size={20} className="text-surface-tint" />
                <h2 className="text-[20px] font-semibold text-primary">
                  {dictionary.sections.legalVat}
                </h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label={dictionary.labels.crNumber}
                  name="cr_number"
                  defaultValue={settings.crNumber}
                  disabled={controlsDisabled}
                  dir="ltr"
                />
                <Field
                  label={dictionary.labels.tinNumber}
                  name="tin_number"
                  defaultValue={settings.tinNumber}
                  disabled={controlsDisabled}
                  dir="ltr"
                />
                <div>
                  <label className={labelClass} htmlFor="vat_mode">
                    {dictionary.labels.vatMode}
                  </label>
                  <select
                    id="vat_mode"
                    name="vat_mode"
                    value={vatMode === "phase2_integrated" ? "vat_registered_phase_1" : vatMode}
                    onChange={(event) =>
                      handleVatModeChange(event.target.value as typeof vatMode)
                    }
                    disabled={controlsDisabled}
                    className={fieldClass}
                  >
                    <option value="not_registered">
                      {dictionary.vatModes.not_registered}
                    </option>
                    <option value="vat_registered_phase_1">
                      {dictionary.vatModes.vat_registered_phase_1}
                    </option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="default_vat_percent">
                    {dictionary.labels.defaultVatPercent}
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
                    dir="ltr"
                  />
                </div>
                <Field
                  label={dictionary.labels.vatNumber}
                  name="vat_number"
                  defaultValue={isNotRegistered ? "" : settings.vatNumber}
                  disabled={controlsDisabled || isNotRegistered}
                  dir="ltr"
                />
                <IsoDateField
                  label={dictionary.labels.vatEffectiveDate}
                  name="vat_effective_date"
                  defaultValue={isNotRegistered ? "" : settings.vatEffectiveDate}
                  disabled={controlsDisabled || isNotRegistered}
                />
                <div className="md:col-span-2 flex items-start gap-2 text-[13px] text-on-surface-variant bg-surface-container-low rounded-lg border border-outline-variant p-3">
                  <ShieldAlert size={16} className="text-primary mt-0.5 shrink-0" />
                  <p>{dictionary.help.historicalSnapshot}</p>
                </div>
              </div>
            </section>
          </div>

          <div className="xl:col-span-4 flex flex-col gap-6">
            <section className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
                <Landmark size={20} className="text-surface-tint" />
                <h2 className="text-[20px] font-semibold text-primary">
                  {dictionary.sections.bankDetails}
                </h2>
              </div>
              {canViewBankDetails ? (
                <div className="p-6 space-y-4">
                  <Field
                    label={dictionary.labels.bankName}
                    name="bank_name"
                    defaultValue={bank?.bankName}
                    disabled={controlsDisabled}
                    dir="auto"
                  />
                  <Field
                    label={dictionary.labels.iban}
                    name="bank_iban"
                    defaultValue={bank?.bankIban}
                    disabled={controlsDisabled}
                    dir="ltr"
                  />
                  <Field
                    label={dictionary.labels.accountHolder}
                    name="bank_account_holder"
                    defaultValue={bank?.bankAccountHolder}
                    disabled={controlsDisabled}
                    dir="auto"
                  />
                </div>
              ) : (
                <div className="p-6 text-[14px] text-on-surface-variant flex items-start gap-2">
                  <Lock size={18} className="text-primary shrink-0 mt-0.5" />
                  <p>{dictionary.help.bankRestricted}</p>
                </div>
              )}
            </section>

            <section className="bg-surface-container-lowest rounded-xl border border-surface-variant shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center gap-2">
                <Settings2 size={20} className="text-surface-tint" />
                <h2 className="text-[20px] font-semibold text-primary">
                  {dictionary.sections.financeDefaults}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <Field
                  label={dictionary.labels.currency}
                  name="currency_display"
                  defaultValue="SAR"
                  disabled
                  dir="ltr"
                />
                <TextareaField
                  label={dictionary.labels.defaultTerms}
                  name="default_terms"
                  defaultValue={settings.defaultTerms}
                  disabled={controlsDisabled}
                  rows={7}
                  dir="auto"
                />
              </div>
            </section>
          </div>
        </div>
      </form>
    </div>
  );
}
