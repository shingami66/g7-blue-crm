-- =============================================================================
-- Migration: Quotations RPC Foundation
-- Date: 2026-06-08
-- Purpose:
--   1. Add vat_rate column to quotations (snapshot of rate at creation time).
--   2. Standardize quotation number prefix from QUO -> QT to match UI.
--   3. Create atomic RPC: create_quotation_with_items.
--   4. Create atomic RPC: update_quotation_with_items.
--   5. Lock RPC access to service_role only.
--
-- IMPORTANT: This file is a DRAFT. Do NOT run it automatically.
--            Apply manually via Supabase SQL Editor after review.
--
-- SECURITY NOTE: Both RPCs use SECURITY INVOKER (the default). They do NOT
-- use SECURITY DEFINER. Because only service_role has EXECUTE permission
-- and service_role bypasses RLS, the RPCs can insert/update/delete rows
-- without needing SECURITY DEFINER. This is the safest approach — no
-- elevated privilege escalation, no search_path concerns.
-- =============================================================================

-- =============================================================================
-- 1. ADD vat_rate COLUMN TO quotations
-- =============================================================================
ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2) NOT NULL DEFAULT 15.00;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_quotations_vat_rate'
    ) THEN
        ALTER TABLE quotations
          ADD CONSTRAINT chk_quotations_vat_rate
          CHECK (vat_rate >= 0 AND vat_rate <= 100);
    END IF;
END $$;

COMMENT ON COLUMN quotations.vat_rate
  IS 'Snapshot of the VAT percentage applied at creation time. Does not change if company settings change later.';

-- =============================================================================
-- 2. STANDARDIZE QUOTATION NUMBER PREFIX: QUO -> QT
-- =============================================================================
UPDATE number_sequences
SET prefix = 'QT',
    example_format = 'QT-YYYY-0001'
WHERE type = 'quotation' AND prefix = 'QUO';

CREATE OR REPLACE FUNCTION generate_document_number(doc_type text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    current_year integer;
    seq_record record;
    formatted_number text;
BEGIN
    -- Validate doc_type
    IF doc_type NOT IN ('quotation', 'invoice', 'payment', 'project') THEN
        RAISE EXCEPTION 'Invalid doc_type: %. Allowed values are: quotation, invoice, payment, project', doc_type;
    END IF;

    current_year := extract(year from current_date);

    INSERT INTO number_sequences (type, year, sequence, prefix, example_format)
    VALUES (
        doc_type,
        current_year,
        1,
        CASE
            WHEN doc_type = 'quotation' THEN 'QT'
            WHEN doc_type = 'invoice'   THEN 'INV'
            WHEN doc_type = 'payment'   THEN 'PAY'
            WHEN doc_type = 'project'   THEN 'PRJ'
        END,
        CASE
            WHEN doc_type = 'quotation' THEN 'QT-YYYY-0001'
            WHEN doc_type = 'invoice'   THEN 'INV-YYYY-0001'
            WHEN doc_type = 'payment'   THEN 'PAY-YYYY-0001'
            WHEN doc_type = 'project'   THEN 'PRJ-YYYY-0001'
        END
    )
    ON CONFLICT (type, year) DO UPDATE
    SET sequence = number_sequences.sequence + 1
    RETURNING * INTO seq_record;

    formatted_number := seq_record.prefix || '-' || current_year || '-' || lpad(seq_record.sequence::text, 4, '0');

    RETURN formatted_number;
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM anon;
REVOKE EXECUTE ON FUNCTION generate_document_number(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION generate_document_number(text) TO service_role;

-- =============================================================================
-- 3. RPC: create_quotation_with_items
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

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count < 1 THEN
        RAISE EXCEPTION 'At least one item is required';
    END IF;

    v_customer_id := NULLIF(trim(p_quotation ->> 'customer_id'), '')::uuid;
    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'customer_id is required';
    END IF;
    v_event       := NULLIF(trim(p_quotation ->> 'event'), '');
    v_date        := NULLIF(trim(p_quotation ->> 'date'), '')::date;
    v_valid_until := NULLIF(trim(p_quotation ->> 'valid_until'), '')::date;
    v_discount    := COALESCE(NULLIF(trim(p_quotation ->> 'discount'), '')::numeric(12,2), 0);
    v_vat_rate    := COALESCE(NULLIF(trim(p_quotation ->> 'vat_rate'), '')::numeric(5,2), 15.00);

    IF v_event IS NULL THEN
        RAISE EXCEPTION 'event is required';
    END IF;

    IF v_date IS NULL THEN
        RAISE EXCEPTION 'date is required';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = v_customer_id AND is_deleted = false) THEN
        RAISE EXCEPTION 'Customer not found or deleted: %', v_customer_id;
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
        id, quotation_number, customer_id, event, date, valid_until,
        subtotal, discount, vat_rate, vat_amount, grand_total,
        status, created_by, updated_by
    )
    VALUES (
        v_quotation_id, v_quotation_number, v_customer_id, v_event, v_date, v_valid_until,
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
        UPDATE quotation_items
        SET vat = ROUND((total - (v_discount * (total / v_subtotal))) * (v_vat_rate / 100), 2)
        WHERE quotation_id = v_quotation_id;

        SELECT v_vat_amount - COALESCE(SUM(vat), 0)
        INTO v_residual
        FROM quotation_items
        WHERE quotation_id = v_quotation_id;

        IF v_residual <> 0 THEN
            SELECT id INTO v_max_item_id
            FROM quotation_items
            WHERE quotation_id = v_quotation_id
            ORDER BY total DESC, id
            LIMIT 1;

            UPDATE quotation_items
            SET vat = vat + v_residual
            WHERE id = v_max_item_id;
        END IF;
    END IF;

    UPDATE quotations
    SET subtotal    = v_subtotal,
        vat_amount  = v_vat_amount,
        grand_total = v_grand_total
    WHERE id = v_quotation_id;

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
-- 4. RPC: update_quotation_with_items
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

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count < 1 THEN
        RAISE EXCEPTION 'At least one item is required';
    END IF;

    SELECT * INTO v_existing
    FROM quotations
    WHERE id = p_quotation_id AND is_deleted = false;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quotation not found or deleted: %', p_quotation_id;
    END IF;

    IF v_existing.status <> 'draft' THEN
        RAISE EXCEPTION 'Cannot edit quotation with status "%". Only draft quotations can be edited.', v_existing.status;
    END IF;

    IF p_quotation ? 'customer_id' THEN
        v_customer_id := NULLIF(trim(p_quotation ->> 'customer_id'), '')::uuid;
        IF v_customer_id IS NULL THEN
            RAISE EXCEPTION 'customer_id cannot be empty if provided';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM customers WHERE id = v_customer_id AND is_deleted = false) THEN
            RAISE EXCEPTION 'Customer not found or deleted: %', v_customer_id;
        END IF;
    ELSE
        v_customer_id := v_existing.customer_id;
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

    DELETE FROM quotation_items WHERE quotation_id = p_quotation_id;

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
        UPDATE quotation_items
        SET vat = ROUND((total - (v_discount * (total / v_subtotal))) * (v_vat_rate / 100), 2)
        WHERE quotation_id = p_quotation_id;

        SELECT v_vat_amount - COALESCE(SUM(vat), 0)
        INTO v_residual
        FROM quotation_items
        WHERE quotation_id = p_quotation_id;

        IF v_residual <> 0 THEN
            SELECT id INTO v_max_item_id
            FROM quotation_items
            WHERE quotation_id = p_quotation_id
            ORDER BY total DESC, id
            LIMIT 1;

            UPDATE quotation_items
            SET vat = vat + v_residual
            WHERE id = v_max_item_id;
        END IF;
    END IF;

    UPDATE quotations
    SET customer_id = v_customer_id,
        event       = v_event,
        date        = v_date,
        valid_until = v_valid_until,
        discount    = v_discount,
        vat_rate    = v_vat_rate,
        subtotal    = v_subtotal,
        vat_amount  = v_vat_amount,
        grand_total = v_grand_total,
        updated_by  = p_user_id
    WHERE id = p_quotation_id;

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
-- 5. RPC PERMISSIONS: service_role only
-- =============================================================================
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION create_quotation_with_items(jsonb, jsonb, text) TO service_role;

REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) FROM authenticated;
GRANT  EXECUTE ON FUNCTION update_quotation_with_items(uuid, jsonb, jsonb, text) TO service_role;