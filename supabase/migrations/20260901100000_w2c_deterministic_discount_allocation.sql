-- W2C: Deterministic fixed-amount discount allocation.
-- This migration is reviewed but must not be applied without an explicit
-- Owner-authorized SUPABASE_APPLY_ONLY DEV gate.
--
-- The persisted quotation_items.discount_allocated value is the sole
-- allocation authority. Approval, ABS projection, and W2B revision copying
-- validate/copy it; they never recompute a distribution.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.quotations') IS NULL
        OR to_regclass('public.quotation_items') IS NULL
        OR to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regclass('public.approved_billing_scope_items') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'w2c_discount_allocation preflight: required table missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_attribute
        WHERE attrelid IN ('public.quotation_items'::regclass,
                           'public.approved_billing_scope_items'::regclass)
          AND attname IN ('discount_allocated', 'source_discount_allocated')
          AND attnum > 0
          AND NOT attisdropped
    ) THEN
        RAISE EXCEPTION 'w2c_discount_allocation preflight: target allocation column already exists';
    END IF;

    IF to_regprocedure('public.set_quotation_commercial_structure(uuid,jsonb,text)') IS NULL
        OR to_regprocedure('public.create_quotation_revision(uuid,text,text,text)') IS NULL
        OR to_regprocedure('public.approve_quotation_and_activate_internal_abs(uuid,text,text)') IS NULL
    THEN
        RAISE EXCEPTION 'w2c_discount_allocation preflight: W2A/W2B/approval RPC missing';
    END IF;

END;
$$;

ALTER TABLE public.quotation_items
    ADD COLUMN discount_allocated numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.quotation_items
    ADD CONSTRAINT quotation_items_discount_allocated_nonnegative_check
        CHECK (discount_allocated >= 0);

ALTER TABLE public.approved_billing_scope_items
    ADD COLUMN source_discount_allocated numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.approved_billing_scope_items
    ADD CONSTRAINT approved_billing_scope_items_source_discount_allocated_nonnegative_check
        CHECK (source_discount_allocated >= 0);

COMMENT ON COLUMN public.quotation_items.discount_allocated IS
    'W2C authoritative fixed-amount SAR discount allocation in halala precision. Only Authority Line roots may receive allocation.';
COMMENT ON COLUMN public.approved_billing_scope_items.source_discount_allocated IS
    'Immutable copy of quotation_items.discount_allocated; ABS never independently recalculates quotation discount allocation.';

-- Canonical allocation implementation. It is invoked by the deferred item
-- trigger after a quotation mutation, once all item rows and W2A hierarchy
-- metadata are present. Integer halala largest-remainder arithmetic avoids
-- floating-point drift; ties are created_at ASC, id ASC.
CREATE OR REPLACE FUNCTION public.reconcile_quotation_discount_allocations(p_quotation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_discount numeric(12,2);
    v_discount_h numeric(30,0);
    v_weight_h numeric(30,0);
    v_allocated_h numeric(30,0);
    v_item_count bigint;
    v_currency text;
BEGIN
    IF p_quotation_id IS NULL THEN
        RETURN;
    END IF;

    SELECT q.discount
         , COALESCE(NULLIF(btrim(q.snapshot_seller ->> 'currency'), ''), 'SAR')
    INTO v_discount
       , v_currency
    FROM public.quotations q
    WHERE q.id = p_quotation_id
      AND COALESCE(q.is_deleted, false) = false
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- W2A is the hierarchy authority. Any malformed hierarchy fails closed
    -- instead of silently assigning customer discount to a child row.
    IF EXISTS (
        SELECT 1
        FROM public.quotation_items qi
        LEFT JOIN public.quotation_items parent
          ON parent.id = qi.parent_authority_line_id
         AND parent.quotation_id = qi.quotation_id
        WHERE qi.quotation_id = p_quotation_id
          AND (
              qi.qty IS NULL OR qi.unit_price IS NULL OR qi.total IS NULL OR qi.vat IS NULL
              OR qi.qty::text IN ('NaN', 'Infinity', '-Infinity')
              OR qi.unit_price::text IN ('NaN', 'Infinity', '-Infinity')
              OR qi.total::text IN ('NaN', 'Infinity', '-Infinity')
              OR qi.vat::text IN ('NaN', 'Infinity', '-Infinity')
              OR qi.qty <= 0 OR qi.unit_price < 0 OR qi.total < 0 OR qi.vat < 0
              OR (qi.commercial_role = 'authority_line'
               AND (qi.parent_authority_line_id IS NOT NULL
                    OR qi.is_selected IS DISTINCT FROM true
                    OR qi.total IS DISTINCT FROM round(qi.qty * qi.unit_price, 2)))
              OR (qi.commercial_role IN ('included_component', 'optional_add_on')
                  AND (qi.parent_authority_line_id IS NULL
                       OR parent.commercial_role IS DISTINCT FROM 'authority_line'))
              OR (qi.commercial_role = 'included_component'
                  AND (qi.unit_price <> 0 OR qi.total <> 0 OR qi.vat <> 0
                       OR qi.is_selected IS DISTINCT FROM true))
              OR (qi.commercial_role = 'optional_add_on'
                  AND qi.is_selected IS DISTINCT FROM true
                  AND (qi.total <> 0 OR qi.vat <> 0))
              OR (qi.commercial_role = 'optional_add_on'
                  AND qi.is_selected = true
                  AND qi.total IS DISTINCT FROM round(qi.qty * qi.unit_price, 2))
              OR qi.commercial_role IS NULL
          )
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'w2c_discount_invalid_hierarchy';
    END IF;

    PERFORM qi.id
    FROM public.quotation_items qi
    WHERE qi.quotation_id = p_quotation_id
    ORDER BY qi.id
    FOR UPDATE;

    v_discount := COALESCE(v_discount, 0)::numeric(12,2);
    IF v_discount < 0 THEN
        RAISE EXCEPTION USING MESSAGE = 'w2c_discount_invalid_amount';
    END IF;

    IF v_discount > 0 AND upper(v_currency) <> 'SAR' THEN
        RAISE EXCEPTION USING MESSAGE = 'w2c_discount_currency_unsupported';
    END IF;

    v_discount_h := round(v_discount * 100, 0)::numeric(30,0);

    -- Reset all rows first. Included Components and unselected Optional
    -- Add-ons are structurally ineligible and must remain zero.
    UPDATE public.quotation_items qi
    SET discount_allocated = 0
    WHERE qi.quotation_id = p_quotation_id;

    SELECT count(*)::bigint
    INTO v_item_count
    FROM public.quotation_items qi
    WHERE qi.quotation_id = p_quotation_id;

    IF v_item_count = 0 THEN
        IF v_discount_h > 0 THEN
            RAISE EXCEPTION USING MESSAGE = 'w2c_discount_no_eligible_roots';
        END IF;
        RETURN;
    END IF;

    SELECT COALESCE(sum(round(r.total * 100, 0)
        + COALESCE((
            SELECT sum(round(o.total * 100, 0))
            FROM public.quotation_items o
            WHERE o.quotation_id = r.quotation_id
              AND o.parent_authority_line_id = r.id
              AND o.commercial_role = 'optional_add_on'
              AND o.is_selected = true
        ), 0)), 0)::numeric(30,0)
    INTO v_weight_h
    FROM public.quotation_items r
    WHERE r.quotation_id = p_quotation_id
      AND r.commercial_role = 'authority_line'
      AND round(r.total * 100, 0)
          + COALESCE((
              SELECT sum(round(o.total * 100, 0))
              FROM public.quotation_items o
              WHERE o.quotation_id = r.quotation_id
                AND o.parent_authority_line_id = r.id
                AND o.commercial_role = 'optional_add_on'
                AND o.is_selected = true
          ), 0) > 0;

    IF v_discount_h = 0 THEN
        RETURN;
    END IF;

    IF v_weight_h = 0 OR v_discount_h > v_weight_h THEN
        RAISE EXCEPTION USING MESSAGE = 'w2c_discount_out_of_range';
    END IF;

    WITH roots AS MATERIALIZED (
        SELECT
            r.id,
            r.created_at,
            round(r.total * 100, 0)
                + COALESCE((
                    SELECT sum(round(o.total * 100, 0))
                    FROM public.quotation_items o
                    WHERE o.quotation_id = r.quotation_id
                      AND o.parent_authority_line_id = r.id
                      AND o.commercial_role = 'optional_add_on'
                      AND o.is_selected = true
                ), 0)::numeric(30,0) AS weight_h
        FROM public.quotation_items r
        WHERE r.quotation_id = p_quotation_id
          AND r.commercial_role = 'authority_line'
    ),
    eligible AS MATERIALIZED (
        SELECT
            roots.*,
            floor((v_discount_h * roots.weight_h) / v_weight_h)::numeric(30,0) AS base_h,
            mod(v_discount_h * roots.weight_h, v_weight_h)::numeric(30,0) AS remainder_h
        FROM roots
        WHERE roots.weight_h > 0
    ),
    ranked AS (
        SELECT
            eligible.*,
            row_number() OVER (
                ORDER BY eligible.remainder_h DESC,
                         eligible.created_at ASC,
                         eligible.id ASC
            ) - 1 AS remainder_rank,
            (v_discount_h - sum(eligible.base_h) OVER ())::numeric(30,0) AS remainder_count
        FROM eligible
    )
    UPDATE public.quotation_items qi
    SET discount_allocated = ((ranked.base_h
        + CASE WHEN ranked.remainder_rank < ranked.remainder_count THEN 1 ELSE 0 END) / 100)::numeric(12,2)
    FROM ranked
    WHERE qi.id = ranked.id
      AND qi.quotation_id = p_quotation_id;

    SELECT COALESCE(sum(round(qi.discount_allocated * 100, 0)), 0)::numeric(30,0)
    INTO v_allocated_h
    FROM public.quotation_items qi
    WHERE qi.quotation_id = p_quotation_id;

    IF v_allocated_h IS DISTINCT FROM v_discount_h THEN
        RAISE EXCEPTION USING MESSAGE = 'w2c_discount_allocation_not_reconciled';
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_quotation_discount_allocations(uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_quotation_discount_allocations(uuid)
    TO service_role;

COMMENT ON FUNCTION public.reconcile_quotation_discount_allocations(uuid) IS
    'Canonical W2C fixed-amount SAR halala largest-remainder allocator. Deferred quotation item mutations persist the authoritative root allocations; consumers copy them.';

CREATE OR REPLACE FUNCTION public.w2c_reconcile_quotation_discount_allocations_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_quotation_id uuid;
    v_skip_quotation_ids text;
    v_seen_quotation_ids text;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_quotation_id := OLD.quotation_id;
    ELSE
        v_quotation_id := NEW.quotation_id;
    END IF;

    -- W2B revision insertion explicitly copies the already-authoritative
    -- allocation; do not rerank ties against the successor's new ids.
    v_skip_quotation_ids := current_setting('g7.w2c_allocator_skip', true);
    IF v_skip_quotation_ids IS NOT NULL
        AND position(',' || v_quotation_id::text || ',' IN ',' || v_skip_quotation_ids || ',') > 0
    THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    -- The allocator updates discount_allocated itself. Deferred trigger events
    -- created by that update are suppressed per quotation for this transaction;
    -- the first invocation already observes that quotation's final item set.
    v_seen_quotation_ids := current_setting('g7.w2c_allocator_seen', true);
    IF v_seen_quotation_ids IS NOT NULL
        AND position(',' || v_quotation_id::text || ',' IN ',' || v_seen_quotation_ids || ',') > 0
    THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    PERFORM set_config(
        'g7.w2c_allocator_seen',
        concat_ws(',', NULLIF(v_seen_quotation_ids, ''), v_quotation_id::text),
        true
    );
    PERFORM public.reconcile_quotation_discount_allocations(v_quotation_id);

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.w2c_reconcile_quotation_discount_allocations_trg()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.w2c_reconcile_quotation_discount_allocations_trg()
    TO service_role;

DROP TRIGGER IF EXISTS w2c_reconcile_quotation_discount_allocations_deferred_trg
    ON public.quotation_items;
CREATE CONSTRAINT TRIGGER w2c_reconcile_quotation_discount_allocations_deferred_trg
AFTER INSERT OR UPDATE OR DELETE ON public.quotation_items
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.w2c_reconcile_quotation_discount_allocations_trg();

-- Every ABS projection copies the persisted quotation allocation and derives
-- its net source grand total from that immutable evidence. It never allocates.
CREATE OR REPLACE FUNCTION public.w2c_sync_abs_source_discount_allocation_trg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_item public.quotation_items%ROWTYPE;
BEGIN
    SELECT qi.*
    INTO v_item
    FROM public.quotation_items qi
    WHERE qi.id = NEW.source_quotation_item_id
      AND qi.quotation_id = NEW.source_quotation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'w2c_source_quotation_item_missing';
    END IF;

    NEW.source_discount_allocated := v_item.discount_allocated;
    NEW.source_grand_total := round(v_item.total - v_item.discount_allocated + v_item.vat, 2);
    IF NEW.source_discount_allocated > 0 AND NEW.decision <> 'accepted' THEN
        RAISE EXCEPTION USING MESSAGE = 'w2c_discounted_abs_adjustment_not_supported';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.w2c_sync_abs_source_discount_allocation_trg()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.w2c_sync_abs_source_discount_allocation_trg()
    TO service_role;

DROP TRIGGER IF EXISTS w2c_sync_abs_source_discount_allocation_trg
    ON public.approved_billing_scope_items;
CREATE TRIGGER w2c_sync_abs_source_discount_allocation_trg
BEFORE INSERT OR UPDATE ON public.approved_billing_scope_items
FOR EACH ROW
EXECUTE FUNCTION public.w2c_sync_abs_source_discount_allocation_trg();

-- ABS item validation: positive allocations are immutable quotation evidence;
-- any scope adjustment on an allocated line fails closed because no W2C
-- redistribution policy exists.
CREATE OR REPLACE FUNCTION public._abs_validate_scope_items(p_scope_id uuid)
RETURNS TABLE(
    validation_error text,
    item_count bigint,
    billable_item_count bigint,
    item_accepted_subtotal numeric,
    item_accepted_vat_amount numeric,
    item_accepted_grand_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    SELECT
        count(*)::bigint,
        count(*) FILTER (WHERE i.accepted_grand_total > 0)::bigint,
        COALESCE(sum(i.accepted_subtotal), 0)::numeric,
        COALESCE(sum(i.accepted_vat_amount), 0)::numeric,
        COALESCE(sum(i.accepted_grand_total), 0)::numeric
    INTO item_count, billable_item_count, item_accepted_subtotal,
         item_accepted_vat_amount, item_accepted_grand_total
    FROM public.approved_billing_scope_items i
    WHERE i.approved_billing_scope_id = p_scope_id;

    IF item_count = 0 THEN
        validation_error := 'scope_no_items';
        RETURN NEXT;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = p_scope_id
          AND (
              i.source_discount_allocated < 0
              OR i.source_discount_allocated > i.source_subtotal
              OR i.source_discount_allocated::text IN ('NaN', 'Infinity', '-Infinity')
              OR i.source_grand_total IS DISTINCT FROM
                   round(i.source_subtotal - i.source_discount_allocated + i.source_vat_amount, 2)
              OR (i.source_discount_allocated > 0 AND i.decision <> 'accepted')
              OR i.accepted_qty::text IN ('NaN', 'Infinity', '-Infinity')
              OR i.accepted_unit_price::text IN ('NaN', 'Infinity', '-Infinity')
              OR i.accepted_subtotal::text IN ('NaN', 'Infinity', '-Infinity')
              OR i.accepted_vat_amount::text IN ('NaN', 'Infinity', '-Infinity')
              OR i.accepted_grand_total::text IN ('NaN', 'Infinity', '-Infinity')
              OR (i.decision = 'accepted' AND (
                  i.accepted_qty IS DISTINCT FROM i.source_qty
                  OR i.accepted_unit_price IS DISTINCT FROM i.source_unit_price
                  OR i.accepted_subtotal IS DISTINCT FROM i.source_subtotal
                  OR i.accepted_vat_amount IS DISTINCT FROM i.source_vat_amount
                  OR i.accepted_grand_total IS DISTINCT FROM i.source_grand_total
              ))
              OR (i.decision IN ('excluded', 'customer_supplied') AND (
                  i.accepted_qty <> 0
                  OR i.accepted_unit_price <> 0
                  OR i.accepted_subtotal <> 0
                  OR i.accepted_vat_amount <> 0
                  OR i.accepted_grand_total <> 0
              ))
              OR (i.decision = 'adjusted' AND (
                  i.accepted_qty > i.source_qty
                  OR i.accepted_unit_price > i.source_unit_price
                  OR i.accepted_subtotal > i.source_subtotal
                  OR i.accepted_vat_amount > i.source_vat_amount
                  OR i.accepted_grand_total > i.source_grand_total
                  OR abs(i.accepted_grand_total -
                      (i.accepted_subtotal - i.source_discount_allocated + i.accepted_vat_amount)) > 0.01
              ))
              OR i.decision NOT IN ('accepted', 'excluded', 'customer_supplied', 'adjusted')
          )
    ) THEN
        validation_error := 'scope_reduction_invalid';
        RETURN NEXT;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = p_scope_id
          AND i.decision IN ('excluded', 'customer_supplied', 'adjusted')
          AND (i.reason_code IS NULL OR btrim(i.reason_code) = '')
    ) THEN
        validation_error := 'scope_reason_required';
        RETURN NEXT;
        RETURN;
    END IF;

    validation_error := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public._abs_validate_scope_items(uuid)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._abs_validate_scope_items(uuid) TO service_role;

-- Scope header approval guard. Positive discounts are now allowed only when
-- every ABS source allocation exactly matches the approved quotation evidence.
CREATE OR REPLACE FUNCTION public.check_approved_billing_scopes_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_authoritative_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_source public.quotations%ROWTYPE;
    v_item_validation record;
    v_items_accepted_subtotal numeric(12,2);
    v_items_accepted_vat_amount numeric(12,2);
    v_items_accepted_grand_total numeric(12,2);
    v_items_discount_allocated numeric(12,2);
    v_applicable_invoice_count bigint;
    v_lifetime_invoice_total numeric;
    v_payment_history_count bigint;
    v_successor_source_id uuid;
BEGIN
    IF TG_OP = 'UPDATE' AND (
        OLD.service_id IS DISTINCT FROM NEW.service_id
        OR OLD.source_quotation_id IS DISTINCT FROM NEW.source_quotation_id
        OR OLD.supersedes_scope_id IS DISTINCT FROM NEW.supersedes_scope_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'approved billing scope authority lineage is immutable';
    END IF;

    v_authoritative_service_id := CASE WHEN TG_OP = 'UPDATE' THEN OLD.service_id ELSE NEW.service_id END;

    -- INSERT can safely establish Service-first order; UPDATE already owns
    -- the Scope row and must never request a Service row lock.
    IF TG_OP = 'INSERT' THEN
        SELECT s.status, s.deleted_at
        INTO v_service_status, v_service_deleted_at
        FROM public.services s
        WHERE s.id = v_authoritative_service_id
        FOR UPDATE;
    ELSE
        SELECT s.status, s.deleted_at
        INTO v_service_status, v_service_deleted_at
        FROM public.services s
        WHERE s.id = v_authoritative_service_id;
    END IF;

    IF NOT FOUND OR v_service_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF v_service_status IN ('Completed', 'Cancelled') THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
        END IF;
        IF NEW.status IN ('approved', 'voided') THEN
            RAISE EXCEPTION USING MESSAGE = 'approved billing scopes cannot be inserted directly as approved or voided';
        END IF;
    ELSE
        IF OLD.status = 'voided' THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_already_voided';
        END IF;

        IF OLD.status = 'approved' THEN
            IF NEW.status NOT IN ('approved', 'voided') THEN
                RAISE EXCEPTION USING MESSAGE = 'approved scope status may only remain approved or transition to voided';
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
                RAISE EXCEPTION USING MESSAGE = 'approved scope header fields are immutable';
            END IF;

            IF OLD.superseded_at IS NULL AND NEW.superseded_at IS NOT NULL THEN
                IF NEW.superseded_by_scope_id IS NULL THEN
                    RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid';
                END IF;

                SELECT s.supersedes_scope_id
                INTO v_successor_source_id
                FROM public.approved_billing_scopes s
                WHERE s.id = NEW.superseded_by_scope_id
                  AND s.service_id = OLD.service_id
                  AND s.status = 'draft';

                IF NOT FOUND OR v_successor_source_id IS DISTINCT FROM OLD.id THEN
                    RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid';
                END IF;
            ELSIF OLD.superseded_at IS DISTINCT FROM NEW.superseded_at
                OR OLD.superseded_by_scope_id IS DISTINCT FROM NEW.superseded_by_scope_id
            THEN
                RAISE EXCEPTION USING MESSAGE = 'scope_already_superseded';
            END IF;
        END IF;
    END IF;

    IF NEW.status = 'voided' THEN
        IF TG_OP <> 'UPDATE'
            OR OLD.status <> 'approved'
            OR OLD.superseded_at IS NOT NULL
            OR OLD.voided_at IS NOT NULL
        THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_not_active';
        END IF;
        IF v_service_status = 'Completed' THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
        END IF;
        IF NEW.voided_at IS NULL
            OR NEW.voided_by IS NULL
            OR btrim(NEW.voided_by) = ''
            OR NEW.void_reason IS NULL
            OR btrim(NEW.void_reason) = ''
        THEN
            RAISE EXCEPTION USING MESSAGE = 'voided scopes require void metadata';
        END IF;

        SELECT *
        INTO v_applicable_invoice_count, v_lifetime_invoice_total
        FROM public._abs_get_service_invoice_exposure(v_authoritative_service_id);
        v_payment_history_count := public._abs_get_service_payment_history_count(v_authoritative_service_id);

        IF v_applicable_invoice_count <> 0 OR v_payment_history_count <> 0 THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_void_financial_exposure';
        END IF;
    END IF;

    IF NEW.status = 'approved'
        AND (TG_OP <> 'UPDATE' OR OLD.status IS DISTINCT FROM 'approved')
    THEN
        IF v_service_status IN ('Completed', 'Cancelled') THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
        END IF;

        SELECT q.*
        INTO v_source
        FROM public.quotations q
        WHERE q.id = NEW.source_quotation_id;

        IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'source quotation not found'; END IF;
        IF v_source.status <> 'approved' THEN RAISE EXCEPTION USING MESSAGE = 'source quotation must be approved'; END IF;
        IF COALESCE(v_source.is_deleted, false) THEN RAISE EXCEPTION USING MESSAGE = 'source quotation must not be deleted'; END IF;
        IF v_source.service_id IS DISTINCT FROM NEW.service_id THEN
            RAISE EXCEPTION USING MESSAGE = 'source quotation service_id must match scope service_id';
        END IF;

        IF COALESCE(v_source.discount, 0) > 0
            AND upper(COALESCE(NULLIF(btrim(v_source.snapshot_seller ->> 'currency'), ''), 'SAR')) <> 'SAR'
        THEN
            RAISE EXCEPTION USING MESSAGE = 'w2c_discount_currency_unsupported';
        END IF;

        IF NEW.line_safety_status <> 'safe' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved scopes require line_safety_status = safe';
        END IF;
        IF NEW.approved_at IS NULL OR NEW.approved_by IS NULL OR btrim(NEW.approved_by) = '' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved scopes require approved_at and approved_by';
        END IF;

        IF NEW.supersedes_scope_id IS NULL THEN
            IF EXISTS (
                SELECT 1
                FROM public.approved_billing_scopes active_scope
                WHERE active_scope.service_id = v_authoritative_service_id
                  AND active_scope.id <> NEW.id
                  AND active_scope.status = 'approved'
                  AND active_scope.superseded_at IS NULL
                  AND active_scope.voided_at IS NULL
            ) THEN
                RAISE EXCEPTION USING MESSAGE = 'scope_active_conflict';
            END IF;

            IF public._abs_service_has_historical_authority(v_authoritative_service_id) THEN
                RAISE EXCEPTION USING MESSAGE = 'scope_not_active';
            END IF;
        END IF;

        SELECT *
        INTO v_item_validation
        FROM public._abs_validate_scope_items(NEW.id);

        IF v_item_validation.validation_error IS NOT NULL
            OR v_item_validation.billable_item_count = 0
            OR v_item_validation.item_accepted_subtotal IS DISTINCT FROM NEW.accepted_subtotal
            OR v_item_validation.item_accepted_vat_amount IS DISTINCT FROM NEW.accepted_vat_amount
            OR v_item_validation.item_accepted_grand_total IS DISTINCT FROM NEW.accepted_grand_total
        THEN
            RAISE EXCEPTION USING MESSAGE = COALESCE(v_item_validation.validation_error, 'approved scope item/header totals are invalid');
        END IF;

        SELECT COALESCE(sum(i.source_discount_allocated), 0)
        INTO v_items_discount_allocated
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = NEW.id;
        IF v_items_discount_allocated IS DISTINCT FROM COALESCE(v_source.discount, 0) THEN
            RAISE EXCEPTION USING MESSAGE = 'source quotation discount allocation is not reconciled';
        END IF;

        SELECT *
        INTO v_applicable_invoice_count, v_lifetime_invoice_total
        FROM public._abs_get_service_invoice_exposure(NEW.service_id);
        IF v_lifetime_invoice_total > NEW.accepted_grand_total THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_successor_ceiling_below_invoiced';
        END IF;

        IF NEW.supersedes_scope_id IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM public.approved_billing_scopes p
            WHERE p.id = NEW.supersedes_scope_id
              AND p.service_id = NEW.service_id
              AND p.source_quotation_id = NEW.source_quotation_id
              AND p.status = 'approved'
              AND p.superseded_at IS NOT NULL
              AND p.superseded_by_scope_id = NEW.id
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Approval RPC: same Service-first locking and idempotent snapshot checks as
-- the existing path, with allocation equality and net line grand totals.
CREATE OR REPLACE FUNCTION public.approve_quotation_and_activate_internal_abs(
    p_quotation_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    quotation_id uuid,
    quotation_number text,
    service_id uuid,
    quotation_status text,
    approved_at timestamptz,
    approved_billing_scope_id uuid,
    scope_version integer,
    accepted_subtotal numeric,
    accepted_vat_amount numeric,
    accepted_grand_total numeric,
    abs_status text,
    abs_activated_at timestamptz,
    quotation_approved boolean,
    abs_activated boolean,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_quotation public.quotations%ROWTYPE;
    v_scope public.approved_billing_scopes%ROWTYPE;
    v_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_scope_id uuid;
    v_scope_version integer;
    v_scope_count bigint;
    v_scope_item_count bigint;
    v_quotation_item_count bigint;
    v_expected_subtotal numeric;
    v_expected_vat_amount numeric;
    v_expected_grand_total numeric;
    v_expected_discount numeric;
    v_source_currency text;
    v_source_pricing_context jsonb;
    v_now timestamptz;
    v_scope_match boolean := false;
    v_expected_totals_match boolean := false;
    v_error_message text;
BEGIN
    error_code := NULL;
    quotation_id := p_quotation_id;
    quotation_number := NULL;
    service_id := NULL;
    quotation_status := NULL;
    approved_at := NULL;
    approved_billing_scope_id := NULL;
    scope_version := NULL;
    accepted_subtotal := NULL;
    accepted_vat_amount := NULL;
    accepted_grand_total := NULL;
    abs_status := NULL;
    abs_activated_at := NULL;
    quotation_approved := false;
    abs_activated := false;
    idempotent_replay := false;

    IF p_actor_id IS NULL OR btrim(p_actor_id) = ''
        OR p_actor_role IS NULL OR btrim(p_actor_role) = ''
    THEN
        error_code := 'quotation_approval_actor_invalid'; RETURN NEXT; RETURN;
    END IF;

    SELECT q.service_id INTO v_service_id
    FROM public.quotations q
    WHERE q.id = p_quotation_id AND COALESCE(q.is_deleted, false) = false;
    IF NOT FOUND THEN error_code := 'quotation_not_found'; quotation_id := NULL; RETURN NEXT; RETURN; END IF;

    SELECT s.status, s.deleted_at INTO v_service_status, v_service_deleted_at
    FROM public.services s WHERE s.id = v_service_id FOR UPDATE;
    service_id := v_service_id;
    IF NOT FOUND OR v_service_deleted_at IS NOT NULL OR v_service_status IN ('Completed', 'Cancelled') THEN
        error_code := 'quotation_service_lifecycle_ineligible'; RETURN NEXT; RETURN;
    END IF;

    SELECT q.* INTO v_quotation
    FROM public.quotations q
    WHERE q.id = p_quotation_id AND q.service_id = v_service_id
      AND COALESCE(q.is_deleted, false) = false FOR UPDATE;
    IF NOT FOUND THEN error_code := 'quotation_approval_concurrency_conflict'; RETURN NEXT; RETURN; END IF;

    quotation_id := v_quotation.id;
    quotation_number := v_quotation.quotation_number;
    quotation_status := v_quotation.status;
    v_source_currency := COALESCE(NULLIF(btrim(v_quotation.snapshot_seller ->> 'currency'), ''), 'SAR');
    v_source_pricing_context := jsonb_build_object(
        'quotationNumber', v_quotation.quotation_number,
        'event', v_quotation.event,
        'quotationDate', v_quotation.date,
        'validUntil', v_quotation.valid_until
    );

    PERFORM s.id FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id ORDER BY s.id FOR UPDATE;
    SELECT count(*)::bigint INTO v_scope_count
    FROM public.approved_billing_scopes s WHERE s.service_id = v_service_id;

    SELECT count(*)::bigint,
           COALESCE(sum(qi.total), 0)::numeric,
           COALESCE(sum(qi.vat), 0)::numeric,
           COALESCE(sum(qi.total - qi.discount_allocated + qi.vat), 0)::numeric,
           COALESCE(sum(qi.discount_allocated), 0)::numeric
    INTO v_quotation_item_count, v_expected_subtotal, v_expected_vat_amount,
         v_expected_grand_total, v_expected_discount
    FROM public.quotation_items qi WHERE qi.quotation_id = v_quotation.id;

    v_expected_totals_match :=
        v_quotation.subtotal IS NOT NULL
        AND v_quotation.vat_amount IS NOT NULL
        AND v_quotation.grand_total IS NOT NULL
        AND v_quotation.subtotal IS NOT DISTINCT FROM v_expected_subtotal
        AND v_quotation.vat_amount IS NOT DISTINCT FROM v_expected_vat_amount
        AND v_quotation.grand_total IS NOT DISTINCT FROM v_expected_grand_total
        AND COALESCE(v_quotation.discount, 0) IS NOT DISTINCT FROM v_expected_discount;

    IF v_quotation.status = 'approved' THEN
        IF v_scope_count = 1 THEN
            SELECT s.* INTO v_scope FROM public.approved_billing_scopes s WHERE s.service_id = v_service_id;
            SELECT count(*)::bigint INTO v_scope_item_count
            FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id = v_scope.id;
            SELECT
                v_scope.source_quotation_id = v_quotation.id
                AND v_scope.status = 'approved'
                AND v_scope.superseded_at IS NULL
                AND v_scope.voided_at IS NULL
                AND v_scope.accepted_subtotal IS NOT DISTINCT FROM v_quotation.subtotal
                AND v_scope.accepted_vat_amount IS NOT DISTINCT FROM v_quotation.vat_amount
                AND v_scope.accepted_grand_total IS NOT DISTINCT FROM v_quotation.grand_total
                AND v_scope.source_vat_rate IS NOT DISTINCT FROM v_quotation.vat_rate
                AND v_scope.source_discount IS NOT DISTINCT FROM v_quotation.discount
                AND v_scope.source_currency IS NOT DISTINCT FROM v_source_currency
                AND v_scope.source_quotation_subtotal IS NOT DISTINCT FROM v_quotation.subtotal
                AND v_scope.source_quotation_vat_amount IS NOT DISTINCT FROM v_quotation.vat_amount
                AND v_scope.source_quotation_grand_total IS NOT DISTINCT FROM v_quotation.grand_total
                AND v_scope.source_pricing_context IS NOT DISTINCT FROM v_source_pricing_context
                AND v_scope_item_count = v_quotation_item_count
                AND NOT EXISTS (
                    SELECT 1
                    FROM (
                        SELECT
                            qi.id,
                            row_number() OVER (ORDER BY qi.created_at, qi.id) - 1 AS display_order,
                            qi.description,
                            qi.details,
                            qi.category,
                            qi.qty,
                            qi.unit_price,
                            qi.total AS subtotal,
                            qi.vat,
                            qi.discount_allocated,
                            round(qi.total - qi.discount_allocated + qi.vat, 2) AS grand_total
                        FROM public.quotation_items qi
                        WHERE qi.quotation_id = v_quotation.id
                    ) expected
                    LEFT JOIN public.approved_billing_scope_items actual
                        ON actual.approved_billing_scope_id = v_scope.id
                       AND actual.source_quotation_item_id = expected.id
                    WHERE actual.id IS NULL
                       OR actual.source_quotation_id IS DISTINCT FROM v_quotation.id
                       OR actual.display_order IS DISTINCT FROM expected.display_order
                       OR actual.decision IS DISTINCT FROM 'accepted'
                       OR actual.source_description IS DISTINCT FROM expected.description
                       OR actual.source_details IS DISTINCT FROM expected.details
                       OR actual.source_category IS DISTINCT FROM expected.category
                       OR actual.source_qty IS DISTINCT FROM expected.qty
                       OR actual.source_unit_price IS DISTINCT FROM expected.unit_price
                       OR actual.source_subtotal IS DISTINCT FROM expected.subtotal
                       OR actual.source_vat_amount IS DISTINCT FROM expected.vat
                       OR actual.source_grand_total IS DISTINCT FROM expected.grand_total
                       OR actual.source_discount_allocated IS DISTINCT FROM expected.discount_allocated
                       OR actual.accepted_qty IS DISTINCT FROM expected.qty
                       OR actual.accepted_unit_price IS DISTINCT FROM expected.unit_price
                       OR actual.accepted_subtotal IS DISTINCT FROM expected.subtotal
                       OR actual.accepted_vat_amount IS DISTINCT FROM expected.vat
                       OR actual.accepted_grand_total IS DISTINCT FROM expected.grand_total
                       OR actual.reason_code IS NOT NULL
                       OR actual.reason_note IS NOT NULL
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM public.approved_billing_scope_items actual
                    WHERE actual.approved_billing_scope_id = v_scope.id
                      AND NOT EXISTS (
                          SELECT 1
                          FROM public.quotation_items qi
                          WHERE qi.id = actual.source_quotation_item_id
                            AND qi.quotation_id = v_quotation.id
                      )
                )
            INTO v_scope_match;
        END IF;
        IF v_scope_match AND v_expected_totals_match THEN
            quotation_status := 'approved'; approved_at := v_scope.approved_at;
            approved_billing_scope_id := v_scope.id; scope_version := v_scope.scope_version;
            accepted_subtotal := v_scope.accepted_subtotal;
            accepted_vat_amount := v_scope.accepted_vat_amount;
            accepted_grand_total := v_scope.accepted_grand_total;
            abs_status := v_scope.status; abs_activated_at := v_scope.approved_at;
            quotation_approved := true; abs_activated := true; idempotent_replay := true;
            RETURN NEXT; RETURN;
        END IF;
        error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN;
    END IF;

    IF v_quotation.status NOT IN ('draft', 'sent') THEN
        error_code := 'quotation_not_approvable'; RETURN NEXT; RETURN;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.quotations q
        WHERE q.service_id = v_service_id AND q.id <> v_quotation.id
          AND q.status = 'approved' AND COALESCE(q.is_deleted, false) = false
    ) THEN
        error_code := 'quotation_approval_conflict'; RETURN NEXT; RETURN;
    END IF;
    IF v_scope_count <> 0 THEN
        error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN;
    END IF;
    IF v_quotation_item_count = 0 OR NOT v_expected_totals_match THEN
        error_code := 'quotation_financial_total_mismatch'; RETURN NEXT; RETURN;
    END IF;

    v_now := transaction_timestamp();
    UPDATE public.quotations q SET status = 'approved', updated_by = p_actor_id, updated_at = v_now
    WHERE q.id = v_quotation.id AND q.service_id = v_service_id
      AND COALESCE(q.is_deleted, false) = false AND q.status IN ('draft', 'sent');
    IF NOT FOUND THEN error_code := 'quotation_approval_concurrency_conflict'; RETURN NEXT; RETURN; END IF;

    v_scope_version := 1;
    INSERT INTO public.approved_billing_scopes (
        id, service_id, source_quotation_id, scope_version, status,
        accepted_subtotal, accepted_vat_amount, accepted_grand_total,
        source_vat_rate, source_discount, source_currency,
        source_quotation_subtotal, source_quotation_vat_amount,
        source_quotation_grand_total, source_pricing_context,
        line_safety_status, line_safety_reason_code, line_safety_note,
        line_safety_reviewed_by, line_safety_reviewed_at,
        change_summary_reason, approved_at, approved_by,
        created_by, updated_by, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), v_service_id, v_quotation.id, v_scope_version, 'draft',
        v_quotation.subtotal, v_quotation.vat_amount, v_quotation.grand_total,
        v_quotation.vat_rate, COALESCE(v_quotation.discount, 0), v_source_currency,
        v_quotation.subtotal, v_quotation.vat_amount, v_quotation.grand_total,
        v_source_pricing_context, 'pending_review', NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, p_actor_id, p_actor_id, v_now, v_now
    ) RETURNING id INTO v_scope_id;

    INSERT INTO public.approved_billing_scope_items (
        approved_billing_scope_id, source_quotation_id, source_quotation_item_id,
        display_order, decision, source_description, source_details, source_category,
        source_qty, source_unit_price, source_subtotal, source_vat_amount,
        source_grand_total, source_discount_allocated,
        accepted_qty, accepted_unit_price, accepted_subtotal,
        accepted_vat_amount, accepted_grand_total, reason_code, reason_note,
        created_at, updated_at
    )
    SELECT v_scope_id, qi.quotation_id, qi.id,
           row_number() OVER (ORDER BY qi.created_at, qi.id) - 1,
           'accepted', qi.description, qi.details, qi.category,
           qi.qty, qi.unit_price, qi.total, qi.vat,
           round(qi.total - qi.discount_allocated + qi.vat, 2),
           qi.discount_allocated,
           qi.qty, qi.unit_price, qi.total, qi.vat,
           round(qi.total - qi.discount_allocated + qi.vat, 2),
           NULL, NULL, v_now, v_now
    FROM public.quotation_items qi WHERE qi.quotation_id = v_quotation.id;

    UPDATE public.approved_billing_scopes s
    SET status = 'approved', line_safety_status = 'safe',
        line_safety_reviewed_by = p_actor_id, line_safety_reviewed_at = v_now,
        approved_at = v_now, approved_by = p_actor_id,
        updated_by = p_actor_id, updated_at = v_now
    WHERE s.id = v_scope_id AND s.service_id = v_service_id
      AND s.source_quotation_id = v_quotation.id AND s.status = 'draft';
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'quotation_internal_abs_activation_failed'; END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('status_change', 'quotation', v_quotation.id, p_actor_id,
        jsonb_build_object('event_type', 'quotation_approved', 'actor_id', p_actor_id,
            'actor_role', p_actor_role, 'transaction_timestamp', v_now,
            'service_id', v_service_id, 'quotation_id', v_quotation.id,
            'approved_billing_scope_id', v_scope_id,
            'approval_basis', 'customer_approval_confirmed_by_staff',
            'lifecycle_outcome', 'internal_abs_activated'), v_now);
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('status_change', 'approved_billing_scope', v_scope_id, p_actor_id,
        jsonb_build_object('event_type', 'approved_billing_scope_approved',
            'actor_id', p_actor_id, 'actor_role', p_actor_role,
            'transaction_timestamp', v_now, 'service_id', v_service_id,
            'source_quotation_id', v_quotation.id, 'quotation_id', v_quotation.id,
            'scope_id', v_scope_id, 'scope_version', v_scope_version,
            'accepted_grand_total', v_quotation.grand_total,
            'approval_basis', 'customer_approval_confirmed_by_staff',
            'lifecycle_outcome', 'auto_activated'), v_now);

    quotation_status := 'approved'; approved_at := v_now; approved_billing_scope_id := v_scope_id;
    scope_version := v_scope_version; accepted_subtotal := v_quotation.subtotal;
    accepted_vat_amount := v_quotation.vat_amount; accepted_grand_total := v_quotation.grand_total;
    abs_status := 'approved'; abs_activated_at := v_now;
    quotation_approved := true; abs_activated := true; idempotent_replay := false;
    RETURN NEXT; RETURN;
EXCEPTION
    WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE
            WHEN v_error_message LIKE '%unique_approved_quotation_per_service%' THEN 'quotation_approval_conflict'
            WHEN v_error_message LIKE '%idx_approved_billing_scopes_one_active_per_service%' THEN 'quotation_internal_authority_inconsistent'
            ELSE 'quotation_approval_concurrency_conflict'
        END;
        quotation_approved := false; abs_activated := false; idempotent_replay := false;
        RETURN NEXT; RETURN;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE v_error_message
            WHEN 'scope_service_lifecycle_ineligible' THEN 'quotation_service_lifecycle_ineligible'
            WHEN 'quotation_internal_abs_activation_failed' THEN 'quotation_internal_authority_inconsistent'
            WHEN 'scope_no_items' THEN 'quotation_financial_total_mismatch'
            ELSE 'quotation_internal_authority_inconsistent'
        END;
        quotation_approved := false; abs_activated := false; idempotent_replay := false;
        RETURN NEXT; RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_quotation_and_activate_internal_abs(uuid, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_quotation_and_activate_internal_abs(uuid, text, text)
    TO service_role;

-- Keep W2B's source lineage untouched while copying the persisted allocation
-- into each successor item. The deferred allocator remains a consistency
-- backstop for direct item mutations.
CREATE OR REPLACE FUNCTION public.create_quotation_revision(
    p_source_quotation_id uuid,
    p_revision_reason text,
    p_mutation_key text,
    p_user_id text
)
RETURNS TABLE(
    error_code text,
    quotation_id uuid,
    quotation_number text,
    source_quotation_id uuid,
    quotation_family_id uuid,
    revision_number integer,
    service_id uuid,
    is_replayed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_source public.quotations%ROWTYPE;
    v_existing public.quotations%ROWTYPE;
    v_new_id uuid;
    v_new_number text;
    v_reason text;
    v_mutation_key text;
    v_payload jsonb;
    v_revision_number integer;
    v_item_count integer;
    v_error_message text;
BEGIN
    v_reason := NULLIF(btrim(COALESCE(p_revision_reason, '')), '');
    v_mutation_key := NULLIF(btrim(COALESCE(p_mutation_key, '')), '');
    IF p_source_quotation_id IS NULL OR p_user_id IS NULL OR btrim(p_user_id) = ''
        OR v_reason IS NULL OR char_length(v_reason) > 500
        OR v_mutation_key IS NULL OR char_length(v_mutation_key) > 200
    THEN error_code := 'invalid_input'; RETURN NEXT; RETURN; END IF;

    v_payload := jsonb_build_object('operation', 'quotation_revision',
        'source_quotation_id', p_source_quotation_id, 'revision_reason', v_reason);
    PERFORM pg_advisory_xact_lock(pg_catalog.hashtextextended('quotation_revision:' || v_mutation_key, 8591));

    SELECT q.* INTO v_existing FROM public.quotations q
    WHERE q.mutation_key = v_mutation_key AND COALESCE(q.is_deleted, false) = false LIMIT 1;
    IF FOUND THEN
        IF v_existing.mutation_payload = v_payload THEN
            error_code := NULL; quotation_id := v_existing.id; quotation_number := v_existing.quotation_number;
            source_quotation_id := v_existing.revision_of_quotation_id;
            quotation_family_id := v_existing.quotation_family_id; revision_number := v_existing.revision_number;
            service_id := v_existing.service_id; is_replayed := true; RETURN NEXT; RETURN;
        END IF;
        error_code := 'mutation_key_conflict'; RETURN NEXT; RETURN;
    END IF;

    SELECT q.* INTO v_source FROM public.quotations q
    WHERE q.id = p_source_quotation_id AND COALESCE(q.is_deleted, false) = false FOR UPDATE;
    IF NOT FOUND THEN error_code := 'quotation_not_found'; RETURN NEXT; RETURN; END IF;
    IF v_source.status = 'approved' THEN error_code := 'quotation_revision_approved_not_allowed'; RETURN NEXT; RETURN; END IF;
    IF v_source.status = 'draft' THEN error_code := 'quotation_revision_draft_not_required'; RETURN NEXT; RETURN; END IF;
    IF v_source.status NOT IN ('sent', 'rejected', 'expired') THEN error_code := 'quotation_revision_source_state_invalid'; RETURN NEXT; RETURN; END IF;
    IF COALESCE(v_source.discount, 0) > 0
        AND upper(COALESCE(NULLIF(btrim(v_source.snapshot_seller ->> 'currency'), ''), 'SAR')) <> 'SAR'
    THEN
        error_code := 'quotation_revision_source_state_invalid'; RETURN NEXT; RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM public.quotations successor WHERE successor.revision_of_quotation_id = v_source.id) THEN
        error_code := 'quotation_revision_successor_exists'; RETURN NEXT; RETURN;
    END IF;

    PERFORM q.id FROM public.quotations q
    WHERE q.quotation_family_id = v_source.quotation_family_id
    ORDER BY q.revision_number DESC, q.id FOR UPDATE;
    SELECT COALESCE(max(q.revision_number), 0) + 1 INTO v_revision_number
    FROM public.quotations q WHERE q.quotation_family_id = v_source.quotation_family_id;
    SELECT count(*)::integer INTO v_item_count FROM public.quotation_items qi WHERE qi.quotation_id = v_source.id;
    IF v_item_count = 0 THEN error_code := 'quotation_revision_source_has_no_items'; RETURN NEXT; RETURN; END IF;
    IF (SELECT COALESCE(sum(qi.discount_allocated), 0)
        FROM public.quotation_items qi
        WHERE qi.quotation_id = v_source.id)
        IS DISTINCT FROM COALESCE(v_source.discount, 0)
    THEN
        error_code := 'quotation_revision_source_state_invalid'; RETURN NEXT; RETURN;
    END IF;

    v_new_id := extensions.gen_random_uuid();
    v_new_number := public.generate_document_number('quotation');
    INSERT INTO public.quotations (
        id, quotation_number, service_id, customer_id, event, date, valid_until,
        subtotal, discount, vat_rate, vat_amount, grand_total, status,
        mutation_key, mutation_payload, created_by, updated_by, snapshot_seller,
        snapshot_buyer, quotation_family_id, revision_of_quotation_id,
        revision_number, revision_reason
    ) VALUES (
        v_new_id, v_new_number, v_source.service_id, v_source.customer_id,
        v_source.event, v_source.date, v_source.valid_until, v_source.subtotal,
        v_source.discount, v_source.vat_rate, v_source.vat_amount, v_source.grand_total,
        'draft', v_mutation_key, v_payload, p_user_id, p_user_id,
        v_source.snapshot_seller, v_source.snapshot_buyer, v_source.quotation_family_id,
        v_source.id, v_revision_number, v_reason
    );

    -- Preserve the source's persisted allocation exactly. The deferred W2C
    -- trigger skips this successor id so new timestamps/ids cannot rerank ties.
    PERFORM set_config('g7.w2c_allocator_skip', v_new_id::text, true);

    WITH item_map AS MATERIALIZED (
        SELECT qi.id AS source_item_id, extensions.gen_random_uuid() AS successor_item_id
        FROM public.quotation_items qi WHERE qi.quotation_id = v_source.id
    )
    INSERT INTO public.quotation_items (
        id, quotation_id, description, details, category, qty, unit_price, vat, total,
        discount_allocated, commercial_role, parent_authority_line_id,
        is_selected, unit, description_ar
    )
    SELECT item_map.successor_item_id, v_new_id, qi.description, qi.details, qi.category,
        qi.qty, qi.unit_price, qi.vat, qi.total, qi.discount_allocated,
        qi.commercial_role, parent_map.successor_item_id, qi.is_selected, qi.unit, qi.description_ar
    FROM item_map
    JOIN public.quotation_items qi ON qi.id = item_map.source_item_id
    LEFT JOIN item_map parent_map ON parent_map.source_item_id = qi.parent_authority_line_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('create', 'quotation', v_new_id, p_user_id,
        jsonb_build_object('event_type', 'quotation_revision_created', 'actor_id', p_user_id,
            'source_quotation_id', v_source.id, 'new_quotation_id', v_new_id,
            'quotation_family_id', v_source.quotation_family_id,
            'revision_number', v_revision_number, 'revision_reason', v_reason,
            'source_status', v_source.status, 'customer_facing_numbering', 'unchanged_format'),
        transaction_timestamp());

    error_code := NULL; quotation_id := v_new_id; quotation_number := v_new_number;
    source_quotation_id := v_source.id; quotation_family_id := v_source.quotation_family_id;
    revision_number := v_revision_number; service_id := v_source.service_id; is_replayed := false;
    RETURN NEXT; RETURN;
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range OR invalid_parameter_value THEN
        error_code := 'invalid_input'; RETURN NEXT; RETURN;
    WHEN unique_violation THEN
        error_code := 'mutation_key_conflict'; RETURN NEXT; RETURN;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE v_error_message
            WHEN 'quotation_revision_successor_exists' THEN 'quotation_revision_successor_exists'
            ELSE 'quotation_revision_source_state_invalid'
        END;
        RETURN NEXT; RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.create_quotation_revision(uuid, text, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_quotation_revision(uuid, text, text, text)
    TO service_role;

COMMENT ON FUNCTION public.create_quotation_revision(uuid, text, text, text) IS
    'W2B successor Draft creation preserving source facts, W2A hierarchy, Arabic metadata, and W2C persisted discount allocations.';

COMMIT;
