-- Migration: Customer official and billing fields
-- Purpose:
--   Add optional/conditional customer fields needed before ERP-3 invoice work.
--
-- Safety:
--   - Backward-compatible: all new fields are nullable except po_required,
--     which has a false default.
--   - Existing customer rows are not backfilled or reclassified.
--   - CR/VAT/National Address fields remain optional in this phase.
--   - No uniqueness constraints or indexes are added without a demonstrated
--     query/business need.
--   - No National ID/Iqama fields are added.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_type text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS commercial_registration_number text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS national_address_building_number text,
  ADD COLUMN IF NOT EXISTS national_address_street text,
  ADD COLUMN IF NOT EXISTS national_address_district text,
  ADD COLUMN IF NOT EXISTS national_address_city text,
  ADD COLUMN IF NOT EXISTS national_address_postal_code text,
  ADD COLUMN IF NOT EXISTS national_address_additional_number text,
  ADD COLUMN IF NOT EXISTS national_address_country text,
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS finance_contact_name text,
  ADD COLUMN IF NOT EXISTS finance_contact_phone text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS po_required boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_customers_customer_type'
      AND conrelid = 'customers'::regclass
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT chk_customers_customer_type
      CHECK (
        customer_type IS NULL
        OR customer_type IN ('individual', 'company')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_customers_commercial_registration_number_not_empty'
      AND conrelid = 'customers'::regclass
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT chk_customers_commercial_registration_number_not_empty
      CHECK (
        commercial_registration_number IS NULL
        OR btrim(commercial_registration_number) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_customers_vat_number_not_empty'
      AND conrelid = 'customers'::regclass
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT chk_customers_vat_number_not_empty
      CHECK (
        vat_number IS NULL
        OR btrim(vat_number) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_customers_billing_email_not_empty'
      AND conrelid = 'customers'::regclass
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT chk_customers_billing_email_not_empty
      CHECK (
        billing_email IS NULL
        OR btrim(billing_email) <> ''
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_customers_finance_contact_phone_not_empty'
      AND conrelid = 'customers'::regclass
  ) THEN
    ALTER TABLE customers
      ADD CONSTRAINT chk_customers_finance_contact_phone_not_empty
      CHECK (
        finance_contact_phone IS NULL
        OR btrim(finance_contact_phone) <> ''
      );
  END IF;
END $$;

COMMENT ON COLUMN customers.customer_type IS 'Optional customer classification for invoice buyer context: individual or company. Nullable for existing/backward-compatible records.';
COMMENT ON COLUMN customers.legal_name IS 'Optional legal/customer billing name for future invoice buyer snapshots.';
COMMENT ON COLUMN customers.commercial_registration_number IS 'Optional Commercial Registration number; not unique or mandatory in this phase.';
COMMENT ON COLUMN customers.vat_number IS 'Optional customer VAT number; storing this does not enable Tax Invoice, ZATCA, QR, XML, clearance, or reporting behavior.';
COMMENT ON COLUMN customers.national_address_building_number IS 'Optional National Address building number.';
COMMENT ON COLUMN customers.national_address_street IS 'Optional National Address street.';
COMMENT ON COLUMN customers.national_address_district IS 'Optional National Address district.';
COMMENT ON COLUMN customers.national_address_city IS 'Optional National Address city.';
COMMENT ON COLUMN customers.national_address_postal_code IS 'Optional National Address postal code.';
COMMENT ON COLUMN customers.national_address_additional_number IS 'Optional National Address secondary/additional number.';
COMMENT ON COLUMN customers.national_address_country IS 'Optional National Address country.';
COMMENT ON COLUMN customers.billing_email IS 'Optional billing email for finance communication.';
COMMENT ON COLUMN customers.finance_contact_name IS 'Optional finance contact name.';
COMMENT ON COLUMN customers.finance_contact_phone IS 'Optional finance contact phone.';
COMMENT ON COLUMN customers.payment_terms IS 'Optional customer-specific payment terms.';
COMMENT ON COLUMN customers.po_required IS 'Whether the customer requires a purchase order before invoicing; default false for backward compatibility.';
