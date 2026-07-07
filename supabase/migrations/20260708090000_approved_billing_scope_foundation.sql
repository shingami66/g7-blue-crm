-- Approved Billing Scope Foundation (DRAFT ONLY)
-- Purpose:
--   1. Add the composite unique target needed on quotation_items for
--      future Approved Billing Scope composite FK enforcement.
--   2. Create approved_billing_scopes and approved_billing_scope_items.
--   3. Add business-state trigger protections required by the V2 design.
--
-- IMPORTANT:
--   - This migration draft is not applied yet.
--   - Do not apply automatically.
--   - Legacy invoices using approved_quotation_id remain valid.
--   - The current one-approved-quotation-per-Service guard remains active.
--   - Invoice integration is deferred to a later migration.
--   - Package/global discount ambiguity is blocked in V1.
--   - RPC/server-side remains the authority for financial calculations.
--   - This migration does not add Tax Invoice, VAT 15, ZATCA, FATOORA, QR,
--     XML, or other official tax behavior.

-- 1. Add the composite unique target needed for future scope item linkage.
ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_id_quotation_id_key UNIQUE (id, quotation_id);

-- 2. Scope header table.
CREATE TABLE public.approved_billing_scopes (
    id uuid primary key default gen_random_uuid(),

    service_id uuid not null references public.services(id) on delete restrict,
    source_quotation_id uuid not null,

    scope_version integer not null,
    status text not null,

    accepted_subtotal numeric(12,2) not null default 0,
    accepted_vat_amount numeric(12,2) not null default 0,
    accepted_grand_total numeric(12,2) not null default 0,

    source_vat_rate numeric(5,2) not null default 0,
    source_discount numeric(12,2) not null default 0,
    source_currency text not null default 'SAR',
    source_quotation_subtotal numeric(12,2) not null default 0,
    source_quotation_vat_amount numeric(12,2) not null default 0,
    source_quotation_grand_total numeric(12,2) not null default 0,
    source_pricing_context jsonb not null default '{}'::jsonb,

    line_safety_status text not null default 'pending_review',
    line_safety_reason_code text null,
    line_safety_note text null,
    line_safety_reviewed_by text null,
    line_safety_reviewed_at timestamptz null,

    change_summary_reason text null,

    approved_at timestamptz null,
    approved_by text null,
    superseded_at timestamptz null,
    superseded_by_scope_id uuid null,
    voided_at timestamptz null,
    voided_by text null,
    void_reason text null,

    created_by text null,
    updated_by text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    CONSTRAINT approved_billing_scopes_source_quotation_service_fkey
        FOREIGN KEY (source_quotation_id, service_id)
        REFERENCES public.quotations(id, service_id)
        ON DELETE RESTRICT,
    CONSTRAINT approved_billing_scopes_service_version_key
        UNIQUE (service_id, scope_version),
    CONSTRAINT approved_billing_scopes_id_service_id_key
        UNIQUE (id, service_id),
    CONSTRAINT approved_billing_scopes_id_source_quotation_key
        UNIQUE (id, source_quotation_id),
    CONSTRAINT approved_billing_scopes_superseded_by_scope_service_fkey
        FOREIGN KEY (superseded_by_scope_id, service_id)
        REFERENCES public.approved_billing_scopes(id, service_id)
        ON DELETE RESTRICT,
    CONSTRAINT approved_billing_scopes_status_check
        CHECK (status IN ('draft', 'approved', 'voided')),
    CONSTRAINT approved_billing_scopes_line_safety_status_check
        CHECK (line_safety_status IN ('pending_review', 'safe', 'unsafe')),
    CONSTRAINT approved_billing_scopes_accepted_subtotal_check
        CHECK (accepted_subtotal >= 0),
    CONSTRAINT approved_billing_scopes_accepted_vat_amount_check
        CHECK (accepted_vat_amount >= 0),
    CONSTRAINT approved_billing_scopes_accepted_grand_total_check
        CHECK (accepted_grand_total >= 0),
    CONSTRAINT approved_billing_scopes_source_discount_check
        CHECK (source_discount >= 0),
    CONSTRAINT approved_billing_scopes_source_quotation_subtotal_check
        CHECK (source_quotation_subtotal >= 0),
    CONSTRAINT approved_billing_scopes_source_quotation_vat_amount_check
        CHECK (source_quotation_vat_amount >= 0),
    CONSTRAINT approved_billing_scopes_source_quotation_grand_total_check
        CHECK (source_quotation_grand_total >= 0),
    CONSTRAINT approved_billing_scopes_source_vat_rate_check
        CHECK (source_vat_rate >= 0 AND source_vat_rate <= 100),
    CONSTRAINT approved_billing_scopes_source_currency_nonblank_check
        CHECK (trim(source_currency) <> ''),
    CONSTRAINT approved_billing_scopes_source_pricing_context_type_check
        CHECK (jsonb_typeof(source_pricing_context) = 'object'),
    CONSTRAINT approved_billing_scopes_line_safety_reason_required_check
        CHECK (
            line_safety_status <> 'unsafe'
            OR (line_safety_reason_code IS NOT NULL AND trim(line_safety_reason_code) <> '')
        ),
    CONSTRAINT approved_billing_scopes_approved_fields_check
        CHECK (
            status <> 'approved'
            OR (
                approved_at IS NOT NULL
                AND approved_by IS NOT NULL
                AND trim(approved_by) <> ''
                AND line_safety_status = 'safe'
            )
        ),
    CONSTRAINT approved_billing_scopes_void_fields_check
        CHECK (
            status <> 'voided'
            OR (
                voided_at IS NOT NULL
                AND voided_by IS NOT NULL
                AND trim(voided_by) <> ''
                AND void_reason IS NOT NULL
                AND trim(void_reason) <> ''
            )
        )
);

COMMENT ON TABLE public.approved_billing_scopes IS 'Approved Billing Scope V1 foundation. Billing authority is separate from quotation approval. Invoice integration is deferred.';

CREATE INDEX idx_approved_billing_scopes_service_id
    ON public.approved_billing_scopes(service_id);
CREATE INDEX idx_approved_billing_scopes_source_quotation_id
    ON public.approved_billing_scopes(source_quotation_id);
CREATE INDEX idx_approved_billing_scopes_line_safety_status
    ON public.approved_billing_scopes(line_safety_status);
CREATE INDEX idx_approved_billing_scopes_status
    ON public.approved_billing_scopes(status);
CREATE UNIQUE INDEX idx_approved_billing_scopes_one_active_per_service
    ON public.approved_billing_scopes(service_id)
    WHERE status = 'approved'
      AND superseded_at IS NULL
      AND voided_at IS NULL;

CREATE TRIGGER update_approved_billing_scopes_updated_at
BEFORE UPDATE ON public.approved_billing_scopes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Scope item table.
CREATE TABLE public.approved_billing_scope_items (
    id uuid primary key default gen_random_uuid(),

    approved_billing_scope_id uuid not null references public.approved_billing_scopes(id) on delete restrict,
    source_quotation_id uuid not null,
    source_quotation_item_id uuid not null,

    display_order integer not null default 0,
    decision text not null,

    source_description text not null,
    source_details text null,
    source_category text null,
    source_qty numeric(12,2) not null default 0,
    source_unit_price numeric(12,2) not null default 0,
    source_subtotal numeric(12,2) not null default 0,
    source_vat_amount numeric(12,2) not null default 0,
    source_grand_total numeric(12,2) not null default 0,

    accepted_qty numeric(12,2) not null default 0,
    accepted_unit_price numeric(12,2) not null default 0,
    accepted_subtotal numeric(12,2) not null default 0,
    accepted_vat_amount numeric(12,2) not null default 0,
    accepted_grand_total numeric(12,2) not null default 0,

    reason_code text null,
    reason_note text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    CONSTRAINT approved_billing_scope_items_parent_source_fkey
        FOREIGN KEY (approved_billing_scope_id, source_quotation_id)
        REFERENCES public.approved_billing_scopes(id, source_quotation_id)
        ON DELETE RESTRICT,
    CONSTRAINT approved_billing_scope_items_source_item_fkey
        FOREIGN KEY (source_quotation_item_id, source_quotation_id)
        REFERENCES public.quotation_items(id, quotation_id)
        ON DELETE RESTRICT,
    CONSTRAINT approved_billing_scope_items_scope_item_key
        UNIQUE (approved_billing_scope_id, source_quotation_item_id),
    CONSTRAINT approved_billing_scope_items_decision_check
        CHECK (decision IN ('accepted', 'excluded', 'adjusted', 'customer_supplied')),
    CONSTRAINT approved_billing_scope_items_display_order_check
        CHECK (display_order >= 0),
    CONSTRAINT approved_billing_scope_items_source_qty_check
        CHECK (source_qty >= 0),
    CONSTRAINT approved_billing_scope_items_source_unit_price_check
        CHECK (source_unit_price >= 0),
    CONSTRAINT approved_billing_scope_items_source_subtotal_check
        CHECK (source_subtotal >= 0),
    CONSTRAINT approved_billing_scope_items_source_vat_amount_check
        CHECK (source_vat_amount >= 0),
    CONSTRAINT approved_billing_scope_items_source_grand_total_check
        CHECK (source_grand_total >= 0),
    CONSTRAINT approved_billing_scope_items_accepted_qty_check
        CHECK (accepted_qty >= 0),
    CONSTRAINT approved_billing_scope_items_accepted_unit_price_check
        CHECK (accepted_unit_price >= 0),
    CONSTRAINT approved_billing_scope_items_accepted_subtotal_check
        CHECK (accepted_subtotal >= 0),
    CONSTRAINT approved_billing_scope_items_accepted_vat_amount_check
        CHECK (accepted_vat_amount >= 0),
    CONSTRAINT approved_billing_scope_items_accepted_grand_total_check
        CHECK (accepted_grand_total >= 0),
    CONSTRAINT approved_billing_scope_items_reductions_only_qty_check
        CHECK (accepted_qty <= source_qty),
    CONSTRAINT approved_billing_scope_items_reductions_only_unit_price_check
        CHECK (accepted_unit_price <= source_unit_price),
    CONSTRAINT approved_billing_scope_items_reductions_only_subtotal_check
        CHECK (accepted_subtotal <= source_subtotal),
    CONSTRAINT approved_billing_scope_items_reductions_only_vat_amount_check
        CHECK (accepted_vat_amount <= source_vat_amount),
    CONSTRAINT approved_billing_scope_items_reductions_only_grand_total_check
        CHECK (accepted_grand_total <= source_grand_total),
    CONSTRAINT approved_billing_scope_items_zero_amounts_for_excluded_customer_supplied_check
        CHECK (
            decision NOT IN ('excluded', 'customer_supplied')
            OR (
                accepted_qty = 0
                AND accepted_unit_price = 0
                AND accepted_subtotal = 0
                AND accepted_vat_amount = 0
                AND accepted_grand_total = 0
            )
        ),
    CONSTRAINT approved_billing_scope_items_accepted_decision_consistency_check
        CHECK (
            decision <> 'accepted'
            OR (
                accepted_qty = source_qty
                AND accepted_unit_price = source_unit_price
            )
        ),
    CONSTRAINT approved_billing_scope_items_reason_code_required_check
        CHECK (
            decision NOT IN ('excluded', 'adjusted', 'customer_supplied')
            OR (reason_code IS NOT NULL AND trim(reason_code) <> '')
        )
);

COMMENT ON TABLE public.approved_billing_scope_items IS 'Approved Billing Scope V1 item snapshots. Source values are copied from quotation_items and accepted values are reductions-only.';

CREATE INDEX idx_approved_billing_scope_items_scope_id
    ON public.approved_billing_scope_items(approved_billing_scope_id);
CREATE INDEX idx_approved_billing_scope_items_source_quotation_id
    ON public.approved_billing_scope_items(source_quotation_id);
CREATE INDEX idx_approved_billing_scope_items_source_item_id
    ON public.approved_billing_scope_items(source_quotation_item_id);
CREATE INDEX idx_approved_billing_scope_items_decision
    ON public.approved_billing_scope_items(decision);

CREATE TRIGGER update_approved_billing_scope_items_updated_at
BEFORE UPDATE ON public.approved_billing_scope_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Business-state triggers.

-- Approval transition and source quotation guard.
CREATE OR REPLACE FUNCTION public.check_approved_billing_scopes_before_write()
RETURNS TRIGGER AS $$
DECLARE
    v_source_status text;
    v_source_is_deleted boolean;
    v_source_service_id uuid;
    v_source_discount numeric(12,2);
    v_items_accepted_subtotal numeric(12,2);
    v_items_accepted_vat_amount numeric(12,2);
    v_items_accepted_grand_total numeric(12,2);
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'approved' THEN
            RAISE EXCEPTION 'approved billing scopes cannot be inserted directly as approved';
        END IF;

        IF NEW.status = 'voided' THEN
            RAISE EXCEPTION 'approved billing scopes cannot be inserted directly as voided';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.service_id IS DISTINCT FROM NEW.service_id THEN
            RAISE EXCEPTION 'service_id is immutable';
        END IF;

        IF OLD.source_quotation_id IS DISTINCT FROM NEW.source_quotation_id THEN
            RAISE EXCEPTION 'source_quotation_id is immutable';
        END IF;

        IF OLD.status = 'voided' THEN
            RAISE EXCEPTION 'voided scopes are terminal and cannot be updated';
        END IF;

        IF OLD.status = 'approved' THEN
            IF NEW.status NOT IN ('approved', 'voided') THEN
                RAISE EXCEPTION 'approved scope status may only remain approved or transition to voided';
            END IF;

            IF OLD.scope_version IS DISTINCT FROM NEW.scope_version
                OR OLD.accepted_subtotal IS DISTINCT FROM NEW.accepted_subtotal
                OR OLD.accepted_vat_amount IS DISTINCT FROM NEW.accepted_vat_amount
                OR OLD.accepted_grand_total IS DISTINCT FROM NEW.accepted_grand_total
                OR OLD.source_vat_rate IS DISTINCT FROM NEW.source_vat_rate
                OR OLD.source_discount IS DISTINCT FROM NEW.source_discount
                OR OLD.source_currency IS DISTINCT FROM NEW.source_currency
                OR OLD.source_quotation_subtotal IS DISTINCT FROM NEW.source_quotation_subtotal
                OR OLD.source_quotation_vat_amount IS DISTINCT FROM NEW.source_quotation_vat_amount
                OR OLD.source_quotation_grand_total IS DISTINCT FROM NEW.source_quotation_grand_total
                OR OLD.source_pricing_context IS DISTINCT FROM NEW.source_pricing_context
                OR OLD.line_safety_status IS DISTINCT FROM NEW.line_safety_status
                OR OLD.line_safety_reason_code IS DISTINCT FROM NEW.line_safety_reason_code
                OR OLD.line_safety_note IS DISTINCT FROM NEW.line_safety_note
                OR OLD.line_safety_reviewed_by IS DISTINCT FROM NEW.line_safety_reviewed_by
                OR OLD.line_safety_reviewed_at IS DISTINCT FROM NEW.line_safety_reviewed_at
                OR OLD.change_summary_reason IS DISTINCT FROM NEW.change_summary_reason
                OR OLD.approved_at IS DISTINCT FROM NEW.approved_at
                OR OLD.approved_by IS DISTINCT FROM NEW.approved_by
                OR OLD.created_by IS DISTINCT FROM NEW.created_by
                OR OLD.created_at IS DISTINCT FROM NEW.created_at
            THEN
                RAISE EXCEPTION 'approved scope header fields are immutable';
            END IF;
        END IF;
    END IF;

    IF NEW.status = 'voided' THEN
        IF NEW.voided_at IS NULL
            OR NEW.voided_by IS NULL
            OR trim(NEW.voided_by) = ''
            OR NEW.void_reason IS NULL
            OR trim(NEW.void_reason) = ''
        THEN
            RAISE EXCEPTION 'voided scopes require voided_at, voided_by, and void_reason';
        END IF;
    END IF;

    IF NEW.status = 'approved'
        AND (TG_OP <> 'UPDATE' OR OLD.status IS DISTINCT FROM 'approved')
    THEN
        SELECT q.status, q.is_deleted, q.service_id, q.discount
        INTO v_source_status, v_source_is_deleted, v_source_service_id, v_source_discount
        FROM public.quotations q
        WHERE q.id = NEW.source_quotation_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'source quotation not found';
        END IF;

        IF v_source_status <> 'approved' THEN
            RAISE EXCEPTION 'source quotation must be approved';
        END IF;

        IF coalesce(v_source_is_deleted, false) THEN
            RAISE EXCEPTION 'source quotation must not be deleted';
        END IF;

        IF v_source_service_id IS DISTINCT FROM NEW.service_id THEN
            RAISE EXCEPTION 'source quotation service_id must match scope service_id';
        END IF;

        IF coalesce(v_source_discount, 0) > 0 THEN
            RAISE EXCEPTION 'Approved Billing Scope V1 blocks approval when source quotation discount > 0';
        END IF;

        IF NEW.line_safety_status <> 'safe' THEN
            RAISE EXCEPTION 'approved scopes require line_safety_status = safe';
        END IF;

        IF NEW.approved_at IS NULL OR NEW.approved_by IS NULL OR trim(NEW.approved_by) = '' THEN
            RAISE EXCEPTION 'approved scopes require approved_at and approved_by';
        END IF;

        SELECT
            coalesce(sum(i.accepted_subtotal), 0),
            coalesce(sum(i.accepted_vat_amount), 0),
            coalesce(sum(i.accepted_grand_total), 0)
        INTO
            v_items_accepted_subtotal,
            v_items_accepted_vat_amount,
            v_items_accepted_grand_total
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = NEW.id;

        IF v_items_accepted_subtotal <> NEW.accepted_subtotal THEN
            RAISE EXCEPTION 'accepted_subtotal must match approved_billing_scope_items sum';
        END IF;

        IF v_items_accepted_vat_amount <> NEW.accepted_vat_amount THEN
            RAISE EXCEPTION 'accepted_vat_amount must match approved_billing_scope_items sum';
        END IF;

        IF v_items_accepted_grand_total <> NEW.accepted_grand_total THEN
            RAISE EXCEPTION 'accepted_grand_total must match approved_billing_scope_items sum';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_approved_billing_scopes_before_write_trg
BEFORE INSERT OR UPDATE ON public.approved_billing_scopes
FOR EACH ROW EXECUTE FUNCTION public.check_approved_billing_scopes_before_write();

-- Scope item edit guard and parent-state enforcement.
CREATE OR REPLACE FUNCTION public.check_approved_billing_scope_items_before_write()
RETURNS TRIGGER AS $$
DECLARE
    v_scope_id uuid;
    v_parent_status text;
    v_parent_source_quotation_id uuid;
BEGIN
    v_scope_id := COALESCE(NEW.approved_billing_scope_id, OLD.approved_billing_scope_id);

    SELECT s.status, s.source_quotation_id
    INTO v_parent_status, v_parent_source_quotation_id
    FROM public.approved_billing_scopes s
    WHERE s.id = v_scope_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'parent approved billing scope not found';
    END IF;

    IF v_parent_status <> 'draft' THEN
        RAISE EXCEPTION 'approved billing scope items are editable only while parent scope is draft';
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        IF NEW.source_quotation_id IS DISTINCT FROM v_parent_source_quotation_id THEN
            RAISE EXCEPTION 'item source_quotation_id must match parent source_quotation_id';
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_approved_billing_scope_items_before_write_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.approved_billing_scope_items
FOR EACH ROW EXECUTE FUNCTION public.check_approved_billing_scope_items_before_write();

-- Conservative table safety only. Runtime writes should later flow through
-- protected server actions/RPC. Do not add broad authenticated policies here.
ALTER TABLE public.approved_billing_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_billing_scope_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.approved_billing_scopes FROM anon, authenticated;
REVOKE ALL ON TABLE public.approved_billing_scope_items FROM anon, authenticated;

-- Audit integration is deferred. Future runtime work should record:
-- draft_create, draft_update, approve, supersede, void,
-- invoice_link_attempt, invoice_link_success, and line-safety review events.

-- Future invoice integration is deferred. When invoices gain
-- approved_billing_scope_id, add the active-scope link safety trigger/RPC checks
-- in the invoice integration migration rather than this foundation migration.
