-- Migration: g9_supplier_rate_cards_pricing_basis_and_active_overlap
-- Description: Adds pricing_basis column and concurrency-safe active-overlap constraint to supplier_rate_cards.
-- Note: Forward-only migration. Rate cards are internal estimating defaults only.
-- They must never be exposed in customer-facing quotations, invoices, PDFs, or receipts.
-- They do not automate quotation pricing.
-- Exclude constraint enforces no overlapping active effective periods for the same supplier, category, item, unit, pricing_basis, currency.

-- 1. Add pricing_basis column additively
ALTER TABLE public.supplier_rate_cards
ADD COLUMN IF NOT EXISTS pricing_basis text null;

-- 2. Index on pricing_basis
CREATE INDEX IF NOT EXISTS idx_supplier_rate_cards_pricing_basis
ON public.supplier_rate_cards(pricing_basis);

-- 3. Concurrency-safe active-overlap enforcement
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.supplier_rate_cards
DROP CONSTRAINT IF EXISTS chk_supplier_rate_cards_active_no_overlap;

ALTER TABLE public.supplier_rate_cards
ADD CONSTRAINT chk_supplier_rate_cards_active_no_overlap
EXCLUDE USING gist (
    supplier_id WITH =,
    (lower(trim(coalesce(category, '')))) WITH =,
    (lower(trim(item_name))) WITH =,
    (lower(trim(unit))) WITH =,
    (lower(trim(coalesce(pricing_basis, '')))) WITH =,
    currency WITH =,
    (daterange(valid_from, coalesce(valid_to, 'infinity'::date), '[]')) WITH &&
)
WHERE (status = 'active' AND is_deleted = false);
