-- Migration: supplier_rate_cards_foundation
-- Description: Internal supplier cost defaults for future service planning, supplier allocations, supplier bookings/internal POs, and costing.
-- Note: supplier_rate_cards are internal supplier cost defaults.
-- They must never be exposed in customer-facing quotations, invoices, PDFs, or receipts.
-- They do not automate quotation pricing in MVP.
-- Historical service allocations/bookings must snapshot cost later instead of relying on mutable rate cards.
-- Overlap prevention for same supplier/item/unit/effective period must be enforced in the future write flow or a separately reviewed DB constraint.

CREATE TABLE public.supplier_rate_cards (
    id uuid primary key default gen_random_uuid(),
    supplier_id uuid not null references public.suppliers(id) on delete restrict,
    category text null,
    item_name text not null check (trim(item_name) <> ''),
    unit text not null check (trim(unit) <> ''),
    currency text not null default 'SAR' check (currency = 'SAR'),
    base_cost numeric not null check (base_cost > 0),
    valid_from date not null,
    valid_to date null,
    status text not null default 'active' check (status in ('active', 'inactive')),
    notes text null,
    is_deleted boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by text null,
    updated_by text null,
    deleted_at timestamptz null,
    deleted_by text null,
    CONSTRAINT chk_supplier_rate_cards_valid_dates CHECK (valid_to is null OR valid_to >= valid_from)
);

-- Enable RLS
ALTER TABLE public.supplier_rate_cards ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_supplier_rate_cards_supplier_id ON public.supplier_rate_cards(supplier_id);
CREATE INDEX idx_supplier_rate_cards_status ON public.supplier_rate_cards(status);
CREATE INDEX idx_supplier_rate_cards_is_deleted ON public.supplier_rate_cards(is_deleted);
CREATE INDEX idx_supplier_rate_cards_valid_from ON public.supplier_rate_cards(valid_from);
CREATE INDEX idx_supplier_rate_cards_valid_to ON public.supplier_rate_cards(valid_to);
CREATE INDEX idx_supplier_rate_cards_supplier_status_deleted ON public.supplier_rate_cards(supplier_id, status, is_deleted);
CREATE INDEX idx_supplier_rate_cards_lookup ON public.supplier_rate_cards(supplier_id, item_name, unit, valid_from, valid_to);
