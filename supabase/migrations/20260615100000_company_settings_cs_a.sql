-- =============================================================================
-- Migration: Company Settings Mini CS-A
-- Date: 2026-06-15
-- Purpose:
--   1. Rename company_settings columns to CS-A seller/master-company names.
--   2. Add Arabic legal name, TIN, VAT mode, and nullable VAT effective date.
--   3. Default VAT mode to not_registered and default VAT percent to 0.
--   4. Preserve singleton setting_key='default'.
--
-- IMPORTANT: Do NOT run this automatically.
--            Apply manually via Supabase SQL Editor after review.
-- =============================================================================

ALTER TABLE company_settings RENAME COLUMN company_name TO legal_name_en;
ALTER TABLE company_settings RENAME COLUMN company_email TO official_email;
ALTER TABLE company_settings RENAME COLUMN company_phone TO official_phone;
ALTER TABLE company_settings RENAME COLUMN company_address TO national_address;
ALTER TABLE company_settings RENAME COLUMN legal_cr TO cr_number;
ALTER TABLE company_settings RENAME COLUMN legal_vat TO vat_number;
ALTER TABLE company_settings RENAME COLUMN bank_account_name TO bank_account_holder;
ALTER TABLE company_settings RENAME COLUMN finance_currency TO currency;
ALTER TABLE company_settings RENAME COLUMN finance_vat_percent TO default_vat_percent;
ALTER TABLE company_settings RENAME COLUMN finance_terms TO default_terms;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS legal_name_ar text,
  ADD COLUMN IF NOT EXISTS tin_number text,
  ADD COLUMN IF NOT EXISTS vat_mode text NOT NULL DEFAULT 'not_registered',
  ADD COLUMN IF NOT EXISTS vat_effective_date date;

ALTER TABLE company_settings
  ALTER COLUMN vat_number DROP NOT NULL,
  ALTER COLUMN default_vat_percent SET DEFAULT 0.00;

UPDATE company_settings
SET legal_name_ar = COALESCE(NULLIF(legal_name_ar, ''), legal_name_en),
    vat_mode = COALESCE(vat_mode, 'not_registered'),
    default_vat_percent = CASE
      WHEN COALESCE(vat_mode, 'not_registered') = 'not_registered' THEN 0
      ELSE default_vat_percent
    END,
    vat_number = CASE
      WHEN COALESCE(vat_mode, 'not_registered') = 'not_registered' THEN NULL
      ELSE NULLIF(vat_number, '')
    END,
    vat_effective_date = CASE
      WHEN COALESCE(vat_mode, 'not_registered') = 'not_registered' THEN NULL
      ELSE vat_effective_date
    END;

ALTER TABLE company_settings
  ALTER COLUMN legal_name_ar SET NOT NULL;

ALTER TABLE company_settings
  ADD CONSTRAINT chk_company_settings_singleton_key CHECK (setting_key = 'default'),
  ADD CONSTRAINT chk_company_settings_vat_mode CHECK (vat_mode IN ('not_registered', 'vat_registered_phase_1', 'phase2_integrated')),
  ADD CONSTRAINT chk_company_settings_default_vat_percent CHECK (default_vat_percent >= 0 AND default_vat_percent <= 100),
  ADD CONSTRAINT chk_company_settings_vat_consistency CHECK (
    (
      vat_mode = 'not_registered'
      AND default_vat_percent = 0
      AND vat_number IS NULL
      AND vat_effective_date IS NULL
    )
    OR
    (
      vat_mode IN ('vat_registered_phase_1', 'phase2_integrated')
      AND default_vat_percent > 0
      AND vat_number IS NOT NULL
    )
  );

COMMENT ON TABLE company_settings
  IS 'Singleton seller/master-company settings. Defaults for new documents only; existing documents must use snapshots.';
COMMENT ON COLUMN company_settings.setting_key
  IS 'Stable singleton key. Must be default.';
COMMENT ON COLUMN company_settings.legal_name_en
  IS 'English legal seller/company name.';
COMMENT ON COLUMN company_settings.legal_name_ar
  IS 'Arabic legal seller/company name.';
COMMENT ON COLUMN company_settings.tin_number
  IS 'TIN / الرقم المميز.';
COMMENT ON COLUMN company_settings.vat_mode
  IS 'VAT registration mode. phase2_integrated is reserved for future FATOORA integration and must not be claimed in CS-A UI.';
COMMENT ON COLUMN company_settings.default_vat_percent
  IS 'Default VAT percent for new documents only. Existing quotations/invoices keep their own VAT snapshots.';
