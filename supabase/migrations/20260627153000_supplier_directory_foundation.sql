-- Migration: Supplier directory foundation
-- Purpose:
--   Add the approved supplier master/profile foundation fields to the existing
--   minimal suppliers table after SUPPLIERS-SCHEMA-DESIGN-1.
--
-- Safety:
--   - Draft only in this task; do not apply through Supabase in this task.
--   - Additive/non-destructive: no existing supplier rows are deleted,
--     renamed, reclassified, or seeded.
--   - Existing active, inactive, and blacklisted statuses remain valid.
--   - Adds on_hold status support for future supplier lifecycle handling.
--   - Stores supplier-side CR/VAT/bank facts only; this does not enable
--     customer Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, XML, or clearance.
--   - Does not create supplier cost, rate-card, allocation, booking, payable,
--     payment, portal, WhatsApp/email, PDF, or margin-report tables.
--   - Does not add broad RLS policies, development-only policies, grants, or fake data.

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS supplier_number text,
  ADD COLUMN IF NOT EXISTS supplier_type text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS coverage_area text,
  ADD COLUMN IF NOT EXISTS cr_number text,
  ADD COLUMN IF NOT EXISTS vat_registration_status text,
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS iban text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account_name text,
  ADD COLUMN IF NOT EXISTS is_preferred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blacklisted_reason text,
  ADD COLUMN IF NOT EXISTS blacklisted_at timestamptz,
  ADD COLUMN IF NOT EXISTS blacklisted_by text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS deleted_by text;

DO $$
DECLARE
  status_constraint_name text;
BEGIN
  FOR status_constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'suppliers'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
      AND pg_get_constraintdef(con.oid) ILIKE '%active%'
      AND pg_get_constraintdef(con.oid) ILIKE '%inactive%'
      AND pg_get_constraintdef(con.oid) ILIKE '%blacklisted%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS %I',
      status_constraint_name
    );
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_suppliers_status'
      AND conrelid = 'public.suppliers'::regclass
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT chk_suppliers_status
      CHECK (status IN ('active', 'on_hold', 'blacklisted', 'inactive')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_suppliers_supplier_type'
      AND conrelid = 'public.suppliers'::regclass
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT chk_suppliers_supplier_type
      CHECK (
        supplier_type IS NULL
        OR supplier_type IN ('company', 'individual')
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_suppliers_category'
      AND conrelid = 'public.suppliers'::regclass
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT chk_suppliers_category
      CHECK (
        category IS NULL
        OR category IN (
          'transport',
          'cars',
          'cleaning',
          'staff',
          'security',
          'sound',
          'lighting',
          'screens_led',
          'decoration',
          'photo_video',
          'catering',
          'logistics',
          'furniture_tents_stage',
          'printing',
          'permits_support',
          'other'
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_suppliers_vat_registration_status'
      AND conrelid = 'public.suppliers'::regclass
  ) THEN
    ALTER TABLE public.suppliers
      ADD CONSTRAINT chk_suppliers_vat_registration_status
      CHECK (
        vat_registration_status IS NULL
        OR vat_registration_status IN ('not_registered', 'registered', 'unknown')
      ) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON public.suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_type ON public.suppliers(supplier_type);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_preferred ON public.suppliers(is_preferred);
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at ON public.suppliers(deleted_at);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN public.suppliers.supplier_number IS 'Optional supplier code/number for future supplier directory identity. Nullable for existing rows.';
COMMENT ON COLUMN public.suppliers.supplier_type IS 'Optional supplier type: company or individual. Nullable for existing/backward-compatible rows.';
COMMENT ON COLUMN public.suppliers.category IS 'Optional controlled supplier service category for directory filtering.';
COMMENT ON COLUMN public.suppliers.legal_name IS 'Optional legal/commercial supplier name for compliance and future snapshots.';
COMMENT ON COLUMN public.suppliers.display_name IS 'Optional display name; existing name column remains compatible.';
COMMENT ON COLUMN public.suppliers.contact_name IS 'Optional primary supplier contact name; existing contact column remains compatible.';
COMMENT ON COLUMN public.suppliers.whatsapp_phone IS 'Optional WhatsApp phone if separate from phone.';
COMMENT ON COLUMN public.suppliers.email IS 'Optional supplier email.';
COMMENT ON COLUMN public.suppliers.city IS 'Optional supplier city.';
COMMENT ON COLUMN public.suppliers.country IS 'Optional supplier country.';
COMMENT ON COLUMN public.suppliers.coverage_area IS 'Optional supplier delivery/coverage area.';
COMMENT ON COLUMN public.suppliers.cr_number IS 'Optional Commercial Registration number; not unique or mandatory in this phase.';
COMMENT ON COLUMN public.suppliers.vat_registration_status IS 'Optional supplier-side VAT registration fact; does not enable G7 BLUE customer tax invoice behavior.';
COMMENT ON COLUMN public.suppliers.vat_number IS 'Optional supplier VAT number; does not enable G7 BLUE customer VAT/ZATCA behavior.';
COMMENT ON COLUMN public.suppliers.payment_terms IS 'Optional supplier payment terms.';
COMMENT ON COLUMN public.suppliers.iban IS 'Optional supplier IBAN; future application logic must mask by role and require before confirmed outbound supplier payment.';
COMMENT ON COLUMN public.suppliers.bank_name IS 'Optional supplier bank name; future application logic must mask bank details by role.';
COMMENT ON COLUMN public.suppliers.bank_account_name IS 'Optional supplier bank account holder name; future application logic must mask bank details by role.';
COMMENT ON COLUMN public.suppliers.is_preferred IS 'Preferred supplier flag, intentionally separate from lifecycle status.';
COMMENT ON COLUMN public.suppliers.blacklisted_reason IS 'Internal reason for blacklist status; future application logic must restrict visibility by role.';
COMMENT ON COLUMN public.suppliers.blacklisted_at IS 'Timestamp when supplier was blacklisted.';
COMMENT ON COLUMN public.suppliers.blacklisted_by IS 'Clerk userId string for the user who blacklisted the supplier.';
COMMENT ON COLUMN public.suppliers.notes IS 'Optional internal supplier notes.';
COMMENT ON COLUMN public.suppliers.deleted_by IS 'Clerk userId string for the user who soft-deleted the supplier, when applicable.';
