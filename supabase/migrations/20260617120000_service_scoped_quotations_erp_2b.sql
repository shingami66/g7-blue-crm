-- =============================================================================
-- Migration: ERP-2B Service-Scoped Quotations
-- Date: 2026-06-17
-- Purpose:
--   1. Clean approved dev/demo quotation rows that cannot be safely backfilled.
--   2. Reset only the 2026 quotation number sequence for a clean demo.
--   3. Require quotations.service_id and link it to services(id).
--   4. Enforce service immutability and derive customer_id from service_id.
--   5. Update quotation RPCs to use service_id instead of trusted customer_id.
--
-- IMPORTANT: Do NOT run this automatically.
--            Apply manually via Supabase SQL Editor after review.
--
-- SECURITY NOTE: RPCs remain SECURITY INVOKER (the default). Execute stays
-- restricted to service_role only; browser roles must not call these RPCs.
--
-- ROLLBACK / RECOVERY NOTE:
-- This migration is intentionally destructive for pre-production/dev quotation
-- data. It deletes quotation_items and quotations, and deleted quotation data
-- is not recoverable from this migration itself. If any quotation data must be
-- preserved, export or otherwise back up quotations and quotation_items before
-- applying. Schema rollback would require dropping the trigger, function,
-- index, FK constraint, and service_id column, then restoring deleted data from
-- backup if needed. Do not apply unless the reviewer confirms the current
-- quotations are disposable dev/demo data.
-- =============================================================================

-- =============================================================================
-- 1. GUARD DEV DATA CLEANUP ASSUMPTIONS
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM invoices) THEN
        RAISE EXCEPTION 'ERP-2B cleanup expected invoices to be empty. Stop and re-audit invoice dependencies before applying.';
    END IF;

    IF EXISTS (SELECT 1 FROM payments) THEN
        RAISE EXCEPTION 'ERP-2B cleanup expected payments to be empty. Stop and re-audit payment dependencies before applying.';
    END IF;
END;
$$;

-- Existing quotation rows are approved dev/demo data with no deterministic
-- service backfill target. Delete child rows first to respect FKs.
DELETE FROM quotation_items;
DELETE FROM quotations;

-- Reset only the 2026 quotation sequence. Do not touch service, invoice,
-- payment, or project sequences.
INSERT INTO number_sequences (type, year, sequence, prefix, example_format)
VALUES ('quotation', 2026, 0, 'QT', 'QT-YYYY-0001')
ON CONFLICT (type, year) DO UPDATE
SET sequence = 0,
    prefix = 'QT',
    example_format = 'QT-YYYY-0001';

-- =============================================================================
-- 2. SERVICE LINK AND INDEX
-- =============================================================================
ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS service_id uuid;

ALTER TABLE quotations
    ALTER COLUMN service_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_quotations_service_id'
          AND conrelid = 'quotations'::regclass
    ) THEN
        ALTER TABLE quotations
            ADD CONSTRAINT fk_quotations_service_id
            FOREIGN KEY (service_id)
            REFERENCES services(id)
            ON DELETE RESTRICT;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_quotations_service_id
    ON quotations(service_id);

COMMENT ON COLUMN quotations.service_id
    IS 'ERP-2 primary business link. Quotations belong to Services. One Service may have multiple quotations.';
COMMENT ON COLUMN quotations.customer_id
    IS 'Derived from services.customer_id for reporting/query convenience. Do not trust browser-submitted customer_id.';
COMMENT ON COLUMN quotations.event
    IS 'Legacy/deprecated ERP-2 compatibility field. Event context should come from the linked service going forward.';

-- =============================================================================
-- 3. CUSTOMER DERIVATION AND SERVICE IMMUTABILITY
-- =============================================================================
CREATE OR REPLACE FUNCTION set_quotation_customer_from_service()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_service_customer_id uuid;
BEGIN
    IF NEW.service_id IS NULL THEN
        RAISE EXCEPTION 'service_id is required';
    END IF;

    IF TG_OP = 'UPDATE'
        AND OLD.service_id IS NOT NULL
        AND NEW.service_id IS DISTINCT FROM OLD.service_id THEN
        RAISE EXCEPTION 'service_id cannot be changed after quotation creation';
    END IF;

    SELECT s.customer_id
    INTO v_service_customer_id
    FROM services AS s
    WHERE s.id = NEW.service_id
      AND s.deleted_at IS NULL;

    IF v_service_customer_id IS NULL THEN
        RAISE EXCEPTION 'Service not found or deleted: %', NEW.service_id;
    END IF;

    NEW.customer_id := v_service_customer_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_quotation_customer_from_service_trigger ON quotations;

CREATE TRIGGER set_quotation_customer_from_service_trigger
BEFORE INSERT OR UPDATE ON quotations
FOR EACH ROW
EXECUTE FUNCTION set_quotation_customer_from_service();

-- =============================================================================
-- 4. RPC: create_quotation_with_items
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
    v_vat_rate numeric(5,2);
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
    v_vat_rate    := COALESCE(NULLIF(trim(p_quotation ->> 'vat_rate'), '')::numeric(5,2), 15.00);

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
        RAISE EXCEPTION 'vat_rate must be between 0 and 100. Got: %', v_vat_rate;
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

    v_taxable     := v_subtotal - v_discount;
    v_vat_amount  := v_taxable * (v_vat_rate / 100);
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
-- 5. RPC: update_quotation_with_items
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
    v_vat_rate numeric(5,2);
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

    IF p_quotation ? 'vat_rate' THEN
        v_vat_rate := NULLIF(trim(p_quotation ->> 'vat_rate'), '')::numeric(5,2);
        IF v_vat_rate IS NULL THEN
            RAISE EXCEPTION 'vat_rate cannot be empty if provided';
        END IF;
    ELSE
        v_vat_rate := v_existing.vat_rate;
    END IF;

    IF v_valid_until IS NOT NULL AND v_valid_until < v_date THEN
        RAISE EXCEPTION 'valid_until (%) must be >= date (%)', v_valid_until, v_date;
    END IF;

    IF v_discount < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative: %', v_discount;
    END IF;

    IF v_vat_rate < 0 OR v_vat_rate > 100 THEN
        RAISE EXCEPTION 'vat_rate must be between 0 and 100. Got: %', v_vat_rate;
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

    v_taxable     := v_subtotal - v_discount;
    v_vat_amount  := v_taxable * (v_vat_rate / 100);
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
-- 6. RPC PERMISSIONS: service_role only
-- =============================================================================
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) TO service_role;

REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) TO service_role;
