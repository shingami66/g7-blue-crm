-- =============================================================================
-- Migration: G8 Quotation Create Replay Safety
-- Date: 2026-08-17
-- Purpose:
--   1. Add mutation_key and mutation_payload columns to quotations with partial unique index.
--   2. Make create_quotation_with_items idempotent and replay-safe using advisory lock
--      and durable canonical payload comparison.
--   3. Restrict execution permissions to service_role.
-- =============================================================================

BEGIN;

-- 1. Add mutation_key and mutation_payload columns to quotations if not exists
ALTER TABLE public.quotations
    ADD COLUMN IF NOT EXISTS mutation_key text,
    ADD COLUMN IF NOT EXISTS mutation_payload jsonb;

COMMENT ON COLUMN public.quotations.mutation_key IS 'Client-supplied idempotent mutation identifier for replay-safe quotation creation.';
COMMENT ON COLUMN public.quotations.mutation_payload IS 'Canonical caller create payload stored atomically at creation for durable replay comparison.';

-- 2. Create partial unique index on mutation_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_mutation_key
    ON public.quotations (mutation_key)
    WHERE mutation_key IS NOT NULL;

-- 3. Drop existing create_quotation_with_items to allow signature return shape evolution
DROP FUNCTION IF EXISTS public.create_quotation_with_items(jsonb, jsonb, text);

-- 4. Create updated create_quotation_with_items RPC
CREATE OR REPLACE FUNCTION public.create_quotation_with_items(
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
    grand_total numeric,
    is_replayed boolean,
    error_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_mutation_key text;
    v_canonical_payload jsonb;
    v_existing_id uuid;
    v_existing_quotation_number text;
    v_existing_subtotal numeric(12,2);
    v_existing_discount numeric(12,2);
    v_existing_vat_amount numeric(12,2);
    v_existing_grand_total numeric(12,2);
    v_existing_mutation_payload jsonb;
    v_input_canonical_items jsonb;

    v_quotation_id uuid;
    v_quotation_number text;
    v_service_id uuid;
    v_customer_id uuid;
    v_service_event_start_date date;
    v_service_status text;
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
    v_snapshot_seller jsonb;
    v_snapshot_buyer jsonb;
BEGIN
    IF p_user_id IS NULL OR trim(p_user_id) = '' THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_input'::text;
        RETURN;
    END IF;

    IF p_quotation IS NULL OR jsonb_typeof(p_quotation) <> 'object' THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_input'::text;
        RETURN;
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_input'::text;
        RETURN;
    END IF;

    v_mutation_key := NULLIF(trim(p_quotation ->> 'mutation_key'), '');
    IF v_mutation_key IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'missing_mutation_key'::text;
        RETURN;
    END IF;

    v_service_id  := NULLIF(trim(p_quotation ->> 'service_id'), '')::uuid;
    IF v_service_id IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_input'::text;
        RETURN;
    END IF;

    v_event       := NULLIF(trim(p_quotation ->> 'event'), '');
    IF v_event IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_input'::text;
        RETURN;
    END IF;

    v_date        := NULLIF(trim(p_quotation ->> 'date'), '')::date;
    IF v_date IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_input'::text;
        RETURN;
    END IF;

    v_valid_until := NULLIF(trim(p_quotation ->> 'valid_until'), '')::date;
    IF v_valid_until IS NOT NULL AND v_valid_until < v_date THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_validity_window'::text;
        RETURN;
    END IF;

    v_discount    := COALESCE(NULLIF(trim(p_quotation ->> 'discount'), '')::numeric(12,2), 0);
    IF v_discount < 0 THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_input'::text;
        RETURN;
    END IF;

    v_items_count := jsonb_array_length(p_items);
    IF v_items_count < 1 THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_input'::text;
        RETURN;
    END IF;

    -- Canonical input items preserving exact caller array order
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'description', trim(item ->> 'description'),
            'details', NULLIF(trim(COALESCE(item ->> 'details', '')), ''),
            'category', NULLIF(trim(COALESCE(item ->> 'category', '')), ''),
            'qty', round((item ->> 'qty')::numeric, 2),
            'unit_price', round((item ->> 'unit_price')::numeric, 2)
        ) ORDER BY ord
    ), '[]'::jsonb)
    INTO v_input_canonical_items
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(item, ord);

    v_canonical_payload := jsonb_build_object(
        'service_id', v_service_id,
        'event', v_event,
        'date', v_date,
        'valid_until', v_valid_until,
        'discount', v_discount,
        'items', v_input_canonical_items
    );

    -- Advisory lock for concurrency protection
    PERFORM pg_advisory_xact_lock(hashtext('quotation_mutation_key:' || v_mutation_key));

    -- Replay Check against durable stored canonical payload
    SELECT
        q.id,
        q.quotation_number,
        q.subtotal,
        q.discount,
        q.vat_amount,
        q.grand_total,
        q.mutation_payload
    INTO
        v_existing_id,
        v_existing_quotation_number,
        v_existing_subtotal,
        v_existing_discount,
        v_existing_vat_amount,
        v_existing_grand_total,
        v_existing_mutation_payload
    FROM public.quotations AS q
    WHERE q.mutation_key = v_mutation_key
      AND q.is_deleted = false
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        IF v_existing_mutation_payload = v_canonical_payload THEN
            RETURN QUERY SELECT
                v_existing_id,
                v_existing_quotation_number,
                v_existing_subtotal,
                v_existing_discount,
                v_existing_vat_amount,
                v_existing_grand_total,
                true, -- is_replayed
                NULL::text; -- error_code
            RETURN;
        ELSE
            RETURN QUERY SELECT
                NULL::uuid,
                NULL::text,
                NULL::numeric,
                NULL::numeric,
                NULL::numeric,
                NULL::numeric,
                false, -- is_replayed
                'mutation_key_conflict'::text; -- error_code
            RETURN;
        END IF;
    END IF;

    -- Service validation
    SELECT s.customer_id, s.status, s.event_start_date
    INTO v_customer_id, v_service_status, v_service_event_start_date
    FROM public.services AS s
    WHERE s.id = v_service_id
      AND s.deleted_at IS NULL;

    IF v_customer_id IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'service_unavailable'::text;
        RETURN;
    END IF;

    IF v_service_status NOT IN ('Inquiry', 'Quoted') THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'service_status_invalid'::text;
        RETURN;
    END IF;

    IF v_service_event_start_date IS NOT NULL THEN
        IF v_service_event_start_date < v_date THEN
            RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_validity_window'::text;
            RETURN;
        END IF;

        IF v_valid_until IS NOT NULL AND v_valid_until > v_service_event_start_date THEN
            RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_validity_window'::text;
            RETURN;
        END IF;
    END IF;

    -- Document Snapshots capture
    SELECT
        CASE
            WHEN cs.vat_mode IN ('vat_registered_phase_1', 'phase2_integrated') THEN cs.vat_mode
            ELSE 'not_registered'
        END,
        COALESCE(cs.default_vat_percent, 0)::numeric(5,2),
        jsonb_build_object(
            'snapshotVersion', 1,
            'snapshotSource', 'live_creation',
            'snapshotCapturedAt', now(),
            'snapshotNote', null,
            'legalNameEn', cs.legal_name_en,
            'legalNameAr', cs.legal_name_ar,
            'brandName', 'G7 BLUE',
            'tin', cs.tin_number,
            'entityUnifiedNumber', '7053901414',
            'crNumber', null,
            'vatMode', cs.vat_mode,
            'vatNumber', CASE WHEN cs.vat_mode = 'not_registered' THEN null ELSE cs.vat_number END,
            'vatEffectiveDate', CASE WHEN cs.vat_mode = 'not_registered' THEN null ELSE cs.vat_effective_date END,
            'vatRate', cs.default_vat_percent,
            'officialEmail', cs.official_email,
            'officialPhone', cs.official_phone,
            'website', null,
            'address', jsonb_build_object(
                'shortAddress', null,
                'buildingNo', null,
                'street', null,
                'district', null,
                'secondaryNo', null,
                'postalCode', null,
                'city', null,
                'country', null,
                'display', cs.national_address
            ),
            'bank', jsonb_build_object(
                'bankName', cs.bank_name,
                'accountName', cs.bank_account_holder,
                'accountNo', '68207417001000',
                'iban', cs.bank_iban
            ),
            'logoPath', '/brand/G7_BLUE_Events_Icon_White_BG.png',
            'currency', cs.currency,
            'terms', cs.default_terms
        )
    INTO v_vat_mode, v_settings_vat_rate, v_snapshot_seller
    FROM public.company_settings AS cs
    WHERE cs.setting_key = 'default'
    LIMIT 1;

    IF v_snapshot_seller IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'company_settings_missing'::text;
        RETURN;
    END IF;

    v_vat_mode := COALESCE(v_vat_mode, 'not_registered');
    v_settings_vat_rate := COALESCE(v_settings_vat_rate, 0);

    IF v_vat_mode = 'not_registered' THEN
        v_vat_rate := 0;
    ELSE
        v_vat_rate := v_settings_vat_rate;
    END IF;

    SELECT jsonb_build_object(
        'snapshotVersion', 1,
        'snapshotSource', 'live_creation',
        'snapshotCapturedAt', now(),
        'snapshotNote', null,
        'customerId', c.id,
        'customerType', c.customer_type,
        'name', c.company,
        'legalName', c.legal_name,
        'contactName', c.contact,
        'email', c.email,
        'phone', c.phone,
        'crNumber', c.commercial_registration_number,
        'vatNumber', c.vat_number,
        'billingEmail', c.billing_email,
        'financeContact', c.finance_contact_name,
        'paymentTerms', c.payment_terms,
        'poRequired', c.po_required,
        'address', jsonb_build_object(
            'shortAddress', null,
            'buildingNo', c.national_address_building_number,
            'street', c.national_address_street,
            'district', c.national_address_district,
            'secondaryNo', c.national_address_additional_number,
            'postalCode', c.national_address_postal_code,
            'city', c.national_address_city,
            'country', c.national_address_country,
            'display', c.city
        )
    )
    INTO v_snapshot_buyer
    FROM public.customers AS c
    WHERE c.id = v_customer_id;

    IF v_snapshot_buyer IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'customer_missing'::text;
        RETURN;
    END IF;

    -- Calculate Subtotal
    v_subtotal := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_qty        := NULLIF(trim(v_item ->> 'qty'), '')::numeric(12,2);
        v_item_unit_price := NULLIF(trim(v_item ->> 'unit_price'), '')::numeric(12,2);

        IF v_item_qty IS NULL OR v_item_qty <= 0 THEN
            RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_input'::text;
            RETURN;
        END IF;

        IF v_item_unit_price IS NULL OR v_item_unit_price < 0 THEN
            RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'invalid_input'::text;
            RETURN;
        END IF;

        v_subtotal := v_subtotal + (v_item_qty * v_item_unit_price);
    END LOOP;

    IF v_discount > v_subtotal THEN
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false, 'discount_exceeds_subtotal'::text;
        RETURN;
    END IF;

    v_quotation_number := generate_document_number('quotation');
    v_quotation_id := gen_random_uuid();

    INSERT INTO public.quotations (
        id, quotation_number, service_id, customer_id, event, date, valid_until,
        subtotal, discount, vat_rate, vat_amount, grand_total,
        status, mutation_key, mutation_payload, created_by, updated_by, snapshot_seller, snapshot_buyer
    )
    VALUES (
        v_quotation_id, v_quotation_number, v_service_id, v_customer_id, v_event, v_date, v_valid_until,
        0, v_discount, v_vat_rate, 0, 0,
        'draft', v_mutation_key, v_canonical_payload, p_user_id, p_user_id, v_snapshot_seller, v_snapshot_buyer
    );

    v_subtotal := 0;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_qty        := NULLIF(trim(v_item ->> 'qty'), '')::numeric(12,2);
        v_item_unit_price := NULLIF(trim(v_item ->> 'unit_price'), '')::numeric(12,2);
        v_item_total      := v_item_qty * v_item_unit_price;

        INSERT INTO public.quotation_items (
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

    v_taxable := v_subtotal - v_discount;

    IF v_vat_rate = 0 THEN
        v_vat_amount := 0;
        v_grand_total := v_taxable;
    ELSE
        v_vat_amount := ROUND(v_taxable * (v_vat_rate / 100), 2);
        v_grand_total := v_taxable + v_vat_amount;

        IF v_subtotal > 0 THEN
            UPDATE public.quotation_items AS qi
            SET vat = ROUND((qi.total - (v_discount * (qi.total / v_subtotal))) * (v_vat_rate / 100), 2)
            WHERE qi.quotation_id = v_quotation_id;

            SELECT v_vat_amount - COALESCE(SUM(qi.vat), 0)
            INTO v_residual
            FROM public.quotation_items AS qi
            WHERE qi.quotation_id = v_quotation_id;

            IF v_residual <> 0 THEN
                SELECT qi.id INTO v_max_item_id
                FROM public.quotation_items AS qi
                WHERE qi.quotation_id = v_quotation_id
                ORDER BY qi.total DESC, qi.id
                LIMIT 1;

                UPDATE public.quotation_items AS qi
                SET vat = qi.vat + v_residual
                WHERE qi.id = v_max_item_id;
            END IF;
        END IF;
    END IF;

    UPDATE public.quotations AS q
    SET subtotal    = v_subtotal,
        vat_amount  = v_vat_amount,
        grand_total = v_grand_total
    WHERE q.id = v_quotation_id;

    IF v_service_status = 'Inquiry' THEN
        UPDATE public.services
        SET status = 'Quoted',
            updated_by = p_user_id,
            updated_at = now()
        WHERE id = v_service_id;
    END IF;

    RETURN QUERY
    SELECT
        v_quotation_id,
        v_quotation_number,
        v_subtotal,
        v_discount,
        v_vat_amount,
        v_grand_total,
        false, -- is_replayed
        NULL::text; -- error_code
END;
$$;

-- 5. Strict permissions: service_role only
REVOKE EXECUTE ON FUNCTION public.create_quotation_with_items(jsonb, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_quotation_with_items(jsonb, jsonb, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_quotation_with_items(jsonb, jsonb, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_quotation_with_items(jsonb, jsonb, text) TO service_role;

COMMIT;
