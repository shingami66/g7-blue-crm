-- Migration 20260623200000_erp3a_invoice_schema.sql
-- ERP-3A Invoice Schema Foundation

-- 1. Rename existing columns
ALTER TABLE public.invoices RENAME COLUMN quotation_id TO approved_quotation_id;
ALTER TABLE public.invoices RENAME COLUMN type TO invoice_type;

-- Safely rename existing index if possible
ALTER INDEX IF EXISTS idx_invoices_quotation_id RENAME TO idx_invoices_approved_quotation_id;

-- 2. Add service_id, amount_paid, balance_due and snapshots
ALTER TABLE public.invoices
  ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  ADD COLUMN amount_paid numeric(12,2) DEFAULT 0.00 CHECK (amount_paid >= 0),
  ADD COLUMN balance_due numeric(12,2) DEFAULT 0.00 CHECK (balance_due >= 0),
  ADD COLUMN document_label text, -- staged NOT NULL after ERP-3B invoice creation logic
  ADD COLUMN vat_mode text, -- staged NOT NULL after ERP-3B invoice creation logic
  ADD COLUMN vat_rate numeric(5,2) DEFAULT 0.00 CHECK (vat_rate >= 0),
  ADD COLUMN snapshot_seller jsonb, -- staged NOT NULL after ERP-3B
  ADD COLUMN snapshot_buyer jsonb, -- staged NOT NULL after ERP-3B
  ADD COLUMN snapshot_quotation jsonb, -- staged NOT NULL after ERP-3B
  ADD COLUMN snapshot_bank_details jsonb, -- staged NOT NULL after ERP-3B
  ADD COLUMN snapshot_document_rules jsonb, -- staged NOT NULL after ERP-3B
  ADD COLUMN issued_at timestamptz,
  ADD COLUMN voided_at timestamptz,
  ADD COLUMN void_reason text;

-- 3. Add CHECK for invoice_type (deposit, final) - staged NOT VALID for existing rows
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_invoice_type_check
  CHECK (invoice_type IN ('deposit', 'final')) NOT VALID;

-- 4. Enforce quotation service alignment via composite UNIQUE and FK
-- Create unique constraint on quotations(id, service_id) to allow composite FK
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_id_service_id_key UNIQUE (id, service_id);

-- Create composite FK on invoices to ensure the invoice points to the same service as the quotation
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_approved_quotation_id_service_id_fkey
  FOREIGN KEY (approved_quotation_id, service_id)
  REFERENCES public.quotations (id, service_id) ON DELETE RESTRICT;

-- NOTE: Composite FK (approved_quotation_id, service_id) provides partial enforcement only.
-- Rows where service_id IS NULL are exempt from this check per PostgreSQL FK rules.
-- Full enforcement activates when service_id is made NOT NULL in a future migration after backfill.
-- ERP-3B Server Action must validate service alignment at the application layer until then.
