-- -----------------------------------------------------------------------------
-- Supplier Allocations Foundation
-- -----------------------------------------------------------------------------
-- This is the foundation table for internal supplier allocation planning.
-- It is not Supplier Booking/Internal PO.
-- It is not supplier invoice/payment.
-- It is not customer-facing.
-- MVP enforcement for these cross-table rules is server-side validation in future runtime tasks.
-- Preferred future DB options may include composite FK or triggers.
-- Rules deferred:
-- - supplier_rate_card_id belongs to same supplier_id.
-- - approved_quotation_id belongs to same service_id and references approved quotation only.
-- - blacklisted/inactive supplier block.
-- - cancelled parent Service block.
-- -----------------------------------------------------------------------------

CREATE TABLE public.service_supplier_allocations (
    id uuid primary key default gen_random_uuid(),

    service_id uuid not null references public.services(id) on delete restrict,
    supplier_id uuid not null references public.suppliers(id) on delete restrict,
    supplier_rate_card_id uuid null references public.supplier_rate_cards(id) on delete restrict,
    approved_quotation_id uuid null references public.quotations(id) on delete restrict,

    status text not null default 'draft',
    category text not null,
    item_name text not null,
    unit text not null,

    quantity numeric(10,3) not null,
    currency char(3) not null default 'SAR',
    estimated_unit_cost numeric(14,2) not null,
    estimated_total_cost numeric(14,2) generated always as (quantity * estimated_unit_cost) stored,

    cost_source text not null,
    rate_card_snapshot jsonb null,

    scope_of_work text null,
    internal_notes text null,

    created_by uuid null,
    updated_by uuid null,
    cancelled_at timestamptz null,
    cancelled_by uuid null,
    cancelled_reason text null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    is_deleted boolean not null default false,

    -- Constraints
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_estimated_unit_cost_positive CHECK (estimated_unit_cost >= 0),
    CONSTRAINT chk_currency_sar CHECK (currency = 'SAR'),
    CONSTRAINT chk_status_valid CHECK (status IN ('draft', 'planned', 'selected', 'cancelled')),
    CONSTRAINT chk_cost_source_valid CHECK (cost_source IN ('rate_card', 'manual_estimate')),
    CONSTRAINT chk_cost_source_requirements CHECK (
        (cost_source = 'manual_estimate') OR 
        (cost_source = 'rate_card' AND supplier_rate_card_id IS NOT NULL AND rate_card_snapshot IS NOT NULL)
    ),
    CONSTRAINT chk_cancelled_reason_required CHECK (
        status IS DISTINCT FROM 'cancelled' OR (cancelled_reason IS NOT NULL AND trim(cancelled_reason) != '')
    ),
    CONSTRAINT chk_category_nonblank CHECK (trim(category) != ''),
    CONSTRAINT chk_item_name_nonblank CHECK (trim(item_name) != ''),
    CONSTRAINT chk_unit_nonblank CHECK (trim(unit) != '')
);

-- Indexes
CREATE INDEX idx_service_supplier_allocations_service_id ON public.service_supplier_allocations(service_id);
CREATE INDEX idx_service_supplier_allocations_supplier_id ON public.service_supplier_allocations(supplier_id);
CREATE INDEX idx_service_supplier_allocations_supplier_rate_card_id ON public.service_supplier_allocations(supplier_rate_card_id);
CREATE INDEX idx_service_supplier_allocations_approved_quotation_id ON public.service_supplier_allocations(approved_quotation_id);
CREATE INDEX idx_service_supplier_allocations_status ON public.service_supplier_allocations(status);
CREATE INDEX idx_service_supplier_allocations_is_deleted ON public.service_supplier_allocations(is_deleted);
CREATE INDEX idx_service_supplier_allocations_service_status ON public.service_supplier_allocations(service_id, status);
CREATE INDEX idx_service_supplier_allocations_supplier_deleted ON public.service_supplier_allocations(supplier_id, is_deleted);

-- Triggers
CREATE TRIGGER update_service_supplier_allocations_updated_at
BEFORE UPDATE ON public.service_supplier_allocations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Immutable service_id
CREATE OR REPLACE FUNCTION public.check_service_supplier_allocations_immutable_service_id()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.service_id IS DISTINCT FROM NEW.service_id THEN
        RAISE EXCEPTION 'service_id is immutable';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_service_supplier_allocations_immutable_service_id_trg
BEFORE UPDATE ON public.service_supplier_allocations
FOR EACH ROW EXECUTE FUNCTION public.check_service_supplier_allocations_immutable_service_id();

-- RLS / Grants
ALTER TABLE public.service_supplier_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_supplier_allocations FROM anon;
REVOKE ALL ON TABLE public.service_supplier_allocations FROM authenticated;
