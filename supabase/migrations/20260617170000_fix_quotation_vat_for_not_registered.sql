-- =============================================================================
-- Migration: ERP-2C Fix Quotation VAT for Not-Registered Company Settings
-- Date: 2026-06-17
-- Purpose:
--   1. Remove the stale 15% quotation VAT default.
--   2. Make quotation RPCs derive VAT from company_settings.vat_mode only.
--   3. Force quotation VAT to 0 while G7 BLUE is not VAT registered.
--   4. Preserve ERP-2B service-scoped quotation behavior.
--
-- IMPORTANT: Do NOT run this automatically.
--            Apply manually via Supabase SQL Editor after review.
--
-- SECURITY NOTE: RPCs remain SECURITY INVOKER (the default). Execute stays
-- restricted to service_role only; browser roles must not call these RPCs.
--
-- VAT/ZATCA NOTE:
-- This migration does not add Tax Invoice, ZATCA, FATOORA, QR, XML, clearance,
-- reporting, or Phase 2 behavior. VAT calculation is controlled by
-- company_settings.vat_mode. Missing, null, or unrecognized vat_mode values are
-- treated as not_registered.
--
-- ROLLBACK / RECOVERY NOTE:
-- This migration is not intentionally destructive and does not repair existing
-- bad quotation rows. Rollback would require restoring the previous quotation
-- RPC definitions and resetting quotations.vat_rate default if that behavior is
-- explicitly desired. Existing incorrect demo rows should be corrected only by
-- separately reviewed cleanup SQL.
-- =============================================================================

ALTER TABLE quotations
    ALTER COLUMN vat_rate SET DEFAULT 0.00;

COMMENT ON COLUMN quotations.vat_rate
    IS 'Snapshot of the VAT percentage applied by quotation RPCs. Forced to 0 while company_settings.vat_mode is not_registered; does not imply ZATCA/FATOORA compliance.';

-- =============================================================================
-- RPC: create_quotation_with_items
-- =============================================================================
CREATE OR REPLACE FUNCTION create_quotation_with_items(
    p_quotation jsonb,
    p_items jsonb,
    p_user_id text
)
RETURNS TABLE(
    quotation_id uuid,
    quotation_number text,
    subtotal numeric,
    discount numeric,
    vat_amount numeric,
    grand_total numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_quotation_id uuid;
    v_quotation_number text;
    v_service_id uuid;
    v_customer_id uuid;
    v_event text;
    v_date date;
    v_valid_until date;
    v_discount numeric(12,2);
    v_vat_mode text := 'not_registered';
    v_settings_vat_rate numeric(5,2) := 0;
    v_vat_rate numeric(5,2) := 0;
    v_subtotal numeric(12,2) := 0;
    v_taxable numeric(12,2);
    v_vat_amount numeric(12,2);
    v_grand_total numeric(12,2);
    v_item jsonb;
    v_item_qty numeric(12,2);
    v_item_unit_price numeric(12,2);
    v_item_total numeric(12,2);
    v_items_count integer;
    v_residual numeric(12,2);
    v_max_item_id uuid;
BEGIN
    IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
        RAISE EXCEPTION 'p_user_id is required';
    END IF;

    IF p_quotation IS NULL OR jsonb_typeof(p_quotation) <> 'object' THEN
        RAISE EXCEPTION 'p_quotation must be a JSON object';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'p_items must be a JSON array';
    END IF;

    IF p_quotation ? 'customer_id' THEN
        RAISE EXCEPTION 'customer_id is derived from service_id and must not be provided';
    END IF;

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count < 1 THEN
        RAISE EXCEPTION 'At least one item is required';
    END IF;

    v_service_id  := NULLIF(trim(p_quotation ->> 'service_id'), '')::uuid;
    v_event       := NULLIF(trim(p_quotation ->> 'event'), '');
    v_date        := NULLIF(trim(p_quotation ->> 'date'), '')::date;
    v_valid_until := NULLIF(trim(p_quotation ->> 'valid_until'), '')::date;
    v_discount    := COALESCE(NULLIF(trim(p_quotation ->> 'discount'), '')::numeric(12,2), 0);

    SELECT
        CASE
            WHEN cs.vat_mode IN ('vat_registered_phase_1', 'phase2_integrated') THEN cs.vat_mode
            ELSE 'not_registered'
        END,
        COALESCE(cs.default_vat_percent, 0)::numeric(5,2)
    INTO v_vat_mode, v_settings_vat_rate
    FROM company_settings AS cs
    WHERE cs.setting_key = 'default'
    LIMIT 1;

    v_vat_mode := COALESCE(v_vat_mode, 'not_registered');
    v_settings_vat_rate := COALESCE(v_settings_vat_rate, 0);

    IF v_vat_mode = 'not_registered' THEN
        -- NOT-VAT-REGISTERED SAFEGUARD: driven by company_settings.vat_mode.
        v_vat_rate := 0;
    ELSE
        -- VAT is derived from Company Settings only; client-provided vat_rate is ignored.
        v_vat_rate := v_settings_vat_rate;
    END IF;

    IF v_service_id IS NULL THEN
        RAISE EXCEPTION 'service_id is required';
    END IF;

    SELECT s.customer_id
    INTO v_customer_id
    FROM services AS s
    WHERE s.id = v_service_id
      AND s.deleted_at IS NULL;

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Service not found or deleted: %', v_service_id;
    END IF;

    IF v_event IS NULL THEN
        RAISE EXCEPTION 'event is required';
    END IF;

    IF v_date IS NULL THEN
        RAISE EXCEPTION 'date is required';
    END IF;

    IF v_valid_until IS NOT NULL AND v_valid_until < v_date THEN
        RAISE EXCEPTION 'valid_until (%) must be >= date (%)', v_valid_until, v_date;
    END IF;

    IF v_discount < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative: %', v_discount;
    END IF;

    IF v_vat_rate < 0 OR v_vat_rate > 100 THEN
        RAISE EXCEPTION 'Company Settings default_vat_percent must be between 0 and 100. Got: %', v_vat_rate;
    END IF;

    v_quotation_number := generate_document_number('quotation');
    v_quotation_id := gen_random_uuid();

    INSERT INTO quotations (
        id, quotation_number, service_id, customer_id, event, date, valid_until,
        subtotal, discount, vat_rate, vat_amount, grand_total,
        status, created_by, updated_by
    )
    VALUES (
        v_quotation_id, v_quotation_number, v_service_id, v_customer_id, v_event, v_date, v_valid_until,
        0, v_discount, v_vat_rate, 0, 0,
        'draft', p_user_id, p_user_id
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_qty        := NULLIF(trim(v_item ->> 'qty'), '')::numeric(12,2);
        v_item_unit_price := NULLIF(trim(v_item ->> 'unit_price'), '')::numeric(12,2);

        IF v_item_qty IS NULL OR v_item_qty <= 0 THEN
            RAISE EXCEPTION 'Item qty must be > 0. Got: %', v_item ->> 'qty';
        END IF;

        IF v_item_unit_price IS NULL OR v_item_unit_price < 0 THEN
            RAISE EXCEPTION 'Item unit_price must be >= 0. Got: %', v_item ->> 'unit_price';
        END IF;

        v_item_total := v_item_qty * v_item_unit_price;

        INSERT INTO quotation_items (
            quotation_id, description, details, category,
            qty, unit_price, vat, total
        )
        VALUES (
            v_quotation_id,
            COALESCE(v_item ->> 'description', ''),
            v_item ->> 'details',
            COALESCE(v_item ->> 'category', ''),
            v_item_qty,
            v_item_unit_price,
            0,
            v_item_total
        );

        v_subtotal := v_subtotal + v_item_total;
    END LOOP;

    IF v_discount > v_subtotal THEN
        RAISE EXCEPTION 'Discount (%) cannot exceed subtotal (%)', v_discount, v_subtotal;
    END IF;

    v_taxable := v_subtotal - v_discount;

    IF v_vat_rate = 0 THEN
        v_vat_amount := 0;
        v_grand_total := v_taxable;
    ELSE
        v_vat_amount := ROUND(v_taxable * (v_vat_rate / 100), 2);
        v_grand_total := v_taxable + v_vat_amount;

        IF v_subtotal > 0 THEN
            UPDATE quotation_items AS qi
            SET vat = ROUND((qi.total - (v_discount * (qi.total / v_subtotal))) * (v_vat_rate / 100), 2)
            WHERE qi.quotation_id = v_quotation_id;

            SELECT v_vat_amount - COALESCE(SUM(qi.vat), 0)
            INTO v_residual
            FROM quotation_items AS qi
            WHERE qi.quotation_id = v_quotation_id;

            IF v_residual <> 0 THEN
                SELECT qi.id INTO v_max_item_id
                FROM quotation_items AS qi
                WHERE qi.quotation_id = v_quotation_id
                ORDER BY qi.total DESC, qi.id
                LIMIT 1;

                UPDATE quotation_items AS qi
                SET vat = qi.vat + v_residual
                WHERE qi.id = v_max_item_id;
            END IF;
        END IF;
    END IF;

    UPDATE quotations AS q
    SET subtotal    = v_subtotal,
        vat_amount  = v_vat_amount,
        grand_total = v_grand_total
    WHERE q.id = v_quotation_id;

    RETURN QUERY
    SELECT
        v_quotation_id     AS quotation_id,
        v_quotation_number AS quotation_number,
        v_subtotal         AS subtotal,
        v_discount         AS discount,
        v_vat_amount       AS vat_amount,
        v_grand_total      AS grand_total;
END;
$$;

-- =============================================================================
-- RPC: update_quotation_with_items
-- =============================================================================
CREATE OR REPLACE FUNCTION update_quotation_with_items(
    p_quotation_id uuid,
    p_quotation jsonb,
    p_items jsonb,
    p_user_id text
)
RETURNS TABLE(
    quotation_id uuid,
    quotation_number text,
    subtotal numeric,
    discount numeric,
    vat_amount numeric,
    grand_total numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_existing record;
    v_event text;
    v_date date;
    v_valid_until date;
    v_discount numeric(12,2);
    v_vat_mode text := 'not_registered';
    v_settings_vat_rate numeric(5,2) := 0;
    v_vat_rate numeric(5,2) := 0;
    v_subtotal numeric(12,2) := 0;
    v_taxable numeric(12,2);
    v_vat_amount numeric(12,2);
    v_grand_total numeric(12,2);
    v_item jsonb;
    v_item_qty numeric(12,2);
    v_item_unit_price numeric(12,2);
    v_item_total numeric(12,2);
    v_items_count integer;
    v_residual numeric(12,2);
    v_max_item_id uuid;
BEGIN
    IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
        RAISE EXCEPTION 'p_user_id is required';
    END IF;

    IF p_quotation IS NULL OR jsonb_typeof(p_quotation) <> 'object' THEN
        RAISE EXCEPTION 'p_quotation must be a JSON object';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RAISE EXCEPTION 'p_items must be a JSON array';
    END IF;

    IF p_quotation ? 'service_id' THEN
        RAISE EXCEPTION 'service_id cannot be changed after quotation creation';
    END IF;

    IF p_quotation ? 'customer_id' THEN
        RAISE EXCEPTION 'customer_id is derived from service_id and cannot be changed directly';
    END IF;

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count < 1 THEN
        RAISE EXCEPTION 'At least one item is required';
    END IF;

    SELECT q.* INTO v_existing
    FROM quotations AS q
    WHERE q.id = p_quotation_id
      AND q.is_deleted = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quotation not found or deleted: %', p_quotation_id;
    END IF;

    IF v_existing.status <> 'draft' THEN
        RAISE EXCEPTION 'Cannot edit quotation with status "%". Only draft quotations can be edited.', v_existing.status;
    END IF;

    SELECT
        CASE
            WHEN cs.vat_mode IN ('vat_registered_phase_1', 'phase2_integrated') THEN cs.vat_mode
            ELSE 'not_registered'
        END,
        COALESCE(cs.default_vat_percent, 0)::numeric(5,2)
    INTO v_vat_mode, v_settings_vat_rate
    FROM company_settings AS cs
    WHERE cs.setting_key = 'default'
    LIMIT 1;

    v_vat_mode := COALESCE(v_vat_mode, 'not_registered');
    v_settings_vat_rate := COALESCE(v_settings_vat_rate, 0);

    IF v_vat_mode = 'not_registered' THEN
        -- NOT-VAT-REGISTERED SAFEGUARD: driven by company_settings.vat_mode.
        v_vat_rate := 0;
    ELSE
        -- VAT is derived from Company Settings only; client-provided vat_rate is ignored.
        v_vat_rate := v_settings_vat_rate;
    END IF;

    IF p_quotation ? 'event' THEN
        v_event := NULLIF(trim(p_quotation ->> 'event'), '');
        IF v_event IS NULL THEN
            RAISE EXCEPTION 'event cannot be empty if provided';
        END IF;
    ELSE
        v_event := v_existing.event;
    END IF;

    IF p_quotation ? 'date' THEN
        v_date := NULLIF(trim(p_quotation ->> 'date'), '')::date;
        IF v_date IS NULL THEN
            RAISE EXCEPTION 'date cannot be empty if provided';
        END IF;
    ELSE
        v_date := v_existing.date;
    END IF;

    IF p_quotation ? 'valid_until' THEN
        v_valid_until := NULLIF(trim(p_quotation ->> 'valid_until'), '')::date;
    ELSE
        v_valid_until := v_existing.valid_until;
    END IF;

    IF p_quotation ? 'discount' THEN
        v_discount := COALESCE(NULLIF(trim(p_quotation ->> 'discount'), '')::numeric(12,2), 0);
    ELSE
        v_discount := v_existing.discount;
    END IF;

    IF v_valid_until IS NOT NULL AND v_valid_until < v_date THEN
        RAISE EXCEPTION 'valid_until (%) must be >= date (%)', v_valid_until, v_date;
    END IF;

    IF v_discount < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative: %', v_discount;
    END IF;

    IF v_vat_rate < 0 OR v_vat_rate > 100 THEN
        RAISE EXCEPTION 'Company Settings default_vat_percent must be between 0 and 100. Got: %', v_vat_rate;
    END IF;

    DELETE FROM quotation_items AS qi
    WHERE qi.quotation_id = p_quotation_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_qty        := NULLIF(trim(v_item ->> 'qty'), '')::numeric(12,2);
        v_item_unit_price := NULLIF(trim(v_item ->> 'unit_price'), '')::numeric(12,2);

        IF v_item_qty IS NULL OR v_item_qty <= 0 THEN
            RAISE EXCEPTION 'Item qty must be > 0. Got: %', v_item ->> 'qty';
        END IF;

        IF v_item_unit_price IS NULL OR v_item_unit_price < 0 THEN
            RAISE EXCEPTION 'Item unit_price must be >= 0. Got: %', v_item ->> 'unit_price';
        END IF;

        v_item_total := v_item_qty * v_item_unit_price;

        INSERT INTO quotation_items (
            quotation_id, description, details, category,
            qty, unit_price, vat, total
        )
        VALUES (
            p_quotation_id,
            COALESCE(v_item ->> 'description', ''),
            v_item ->> 'details',
            COALESCE(v_item ->> 'category', ''),
            v_item_qty,
            v_item_unit_price,
            0,
            v_item_total
        );

        v_subtotal := v_subtotal + v_item_total;
    END LOOP;

    IF v_discount > v_subtotal THEN
        RAISE EXCEPTION 'Discount (%) cannot exceed subtotal (%)', v_discount, v_subtotal;
    END IF;

    v_taxable := v_subtotal - v_discount;

    IF v_vat_rate = 0 THEN
        v_vat_amount := 0;
        v_grand_total := v_taxable;
    ELSE
        v_vat_amount := ROUND(v_taxable * (v_vat_rate / 100), 2);
        v_grand_total := v_taxable + v_vat_amount;

        IF v_subtotal > 0 THEN
            UPDATE quotation_items AS qi
            SET vat = ROUND((qi.total - (v_discount * (qi.total / v_subtotal))) * (v_vat_rate / 100), 2)
            WHERE qi.quotation_id = p_quotation_id;

            SELECT v_vat_amount - COALESCE(SUM(qi.vat), 0)
            INTO v_residual
            FROM quotation_items AS qi
            WHERE qi.quotation_id = p_quotation_id;

            IF v_residual <> 0 THEN
                SELECT qi.id INTO v_max_item_id
                FROM quotation_items AS qi
                WHERE qi.quotation_id = p_quotation_id
                ORDER BY qi.total DESC, qi.id
                LIMIT 1;

                UPDATE quotation_items AS qi
                SET vat = qi.vat + v_residual
                WHERE qi.id = v_max_item_id;
            END IF;
        END IF;
    END IF;

    UPDATE quotations AS q
    SET event       = v_event,
        date        = v_date,
        valid_until = v_valid_until,
        discount    = v_discount,
        vat_rate    = v_vat_rate,
        subtotal    = v_subtotal,
        vat_amount  = v_vat_amount,
        grand_total = v_grand_total,
        updated_by  = p_user_id
    WHERE q.id = p_quotation_id;

    RETURN QUERY
    SELECT
        p_quotation_id              AS quotation_id,
        v_existing.quotation_number AS quotation_number,
        v_subtotal                  AS subtotal,
        v_discount                  AS discount,
        v_vat_amount                AS vat_amount,
        v_grand_total               AS grand_total;
END;
$$;

-- =============================================================================
-- RPC PERMISSIONS: service_role only
-- =============================================================================
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) TO service_role;

REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) TO service_role;
