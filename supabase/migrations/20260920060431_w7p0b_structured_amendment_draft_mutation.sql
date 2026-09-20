-- W7-P0B: bounded structured Draft mutation for an Approved Commercial Amendment.
-- This is the only path that may replace the successor Draft's structured rows.
-- It never changes the source Approved quotation, ABS, invoices, or payments.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.quotations') IS NULL
        OR to_regclass('public.quotation_items') IS NULL
        OR to_regclass('public.services') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'w7p0b_structured_amendment_draft_mutation preflight: required table missing';
    END IF;

    IF to_regprocedure('public.reconcile_quotation_discount_allocations(uuid)') IS NULL
        OR to_regprocedure('public.create_approved_commercial_amendment(uuid,text,text,text,text)') IS NULL
        OR to_regprocedure('public.approve_approved_commercial_amendment(uuid,uuid,text,text,text)') IS NULL
    THEN
        RAISE EXCEPTION 'w7p0b_structured_amendment_draft_mutation preflight: W2C/W7-P0A RPC missing';
    END IF;

    IF (
        SELECT count(*)
        FROM pg_attribute
        WHERE attrelid = 'public.quotations'::regclass
          AND attname IN ('revision_of_quotation_id', 'revision_number', 'revision_reason', 'superseded_at')
          AND attnum > 0
          AND NOT attisdropped
    ) <> 4 THEN
        RAISE EXCEPTION 'w7p0b_structured_amendment_draft_mutation preflight: W7 revision columns missing';
    END IF;

    IF to_regprocedure('public.update_approved_commercial_amendment_draft(uuid,jsonb,jsonb,timestamptz,text)') IS NOT NULL THEN
        RAISE EXCEPTION 'w7p0b_structured_amendment_draft_mutation preflight: target RPC already exists';
    END IF;
END;
$$;

CREATE FUNCTION public.update_approved_commercial_amendment_draft(
    p_quotation_id uuid,
    p_quotation jsonb,
    p_lines jsonb,
    p_expected_updated_at timestamptz,
    p_user_id text
)
RETURNS TABLE(
    error_code text,
    quotation_id uuid,
    updated_at timestamptz,
    line_count integer,
    subtotal numeric,
    discount numeric,
    vat_amount numeric,
    grand_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_draft public.quotations%ROWTYPE;
    v_source public.quotations%ROWTYPE;
    v_service public.services%ROWTYPE;
    v_service_id uuid;
    v_event text;
    v_date date;
    v_valid_until date;
    v_discount numeric(12,2);
    v_vat_rate numeric(5,2);
    v_currency text;
    v_subtotal numeric(12,2) := 0;
    v_taxable numeric(12,2) := 0;
    v_vat_amount numeric(12,2) := 0;
    v_grand_total numeric(12,2) := 0;
    v_residual numeric(12,2) := 0;
    v_item_id uuid;
    v_parent_id uuid;
    v_max_item_id uuid;
    v_line_count integer;
    v_authority_count integer;
    v_now timestamptz := transaction_timestamp();
    v_line record;
    v_error_message text;
BEGIN
    quotation_id := p_quotation_id;

    IF p_quotation_id IS NULL
        OR p_user_id IS NULL
        OR btrim(p_user_id) = ''
        OR char_length(p_user_id) > 200
        OR p_expected_updated_at IS NULL
        OR p_quotation IS NULL
        OR jsonb_typeof(p_quotation) <> 'object'
        OR p_lines IS NULL
        OR jsonb_typeof(p_lines) <> 'array'
        OR jsonb_array_length(p_lines) < 1
        OR jsonb_array_length(p_lines) > 200
        OR p_quotation ?| ARRAY['service_id', 'customer_id', 'status', 'quotation_id']
    THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT q.service_id
    INTO v_service_id
    FROM public.quotations q
    WHERE q.id = p_quotation_id;

    IF NOT FOUND THEN
        error_code := 'quotation_not_found';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.*
    INTO v_service
    FROM public.services s
    WHERE s.id = v_service_id
    FOR UPDATE;

    IF NOT FOUND OR v_service.deleted_at IS NOT NULL
        OR v_service.status IN ('Completed', 'Cancelled')
    THEN
        error_code := 'quotation_service_lifecycle_ineligible';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Keep the lock order compatible with W7-P0A approval: service, family, rows.
    PERFORM q.id
    FROM public.quotations q
    WHERE q.quotation_family_id = (
        SELECT family.quotation_family_id
        FROM public.quotations family
        WHERE family.id = p_quotation_id
    )
    ORDER BY q.id
    FOR UPDATE;

    SELECT q.*
    INTO v_draft
    FROM public.quotations q
    WHERE q.id = p_quotation_id
      AND COALESCE(q.is_deleted, false) = false
    FOR UPDATE;

    IF NOT FOUND THEN
        error_code := 'quotation_not_found';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_draft.status <> 'draft'
        OR v_draft.revision_of_quotation_id IS NULL
        OR COALESCE(v_draft.mutation_payload ->> 'operation', '') <> 'approved_commercial_amendment_creation'
    THEN
        error_code := 'quotation_amendment_draft_ineligible';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_draft.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        error_code := 'quotation_amendment_draft_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT q.*
    INTO v_source
    FROM public.quotations q
    WHERE q.id = v_draft.revision_of_quotation_id
      AND q.service_id = v_draft.service_id
      AND q.quotation_family_id = v_draft.quotation_family_id;

    IF NOT FOUND
        OR COALESCE(v_source.is_deleted, false)
        OR v_source.status <> 'approved'
        OR v_source.superseded_at IS NOT NULL
    THEN
        error_code := 'quotation_not_current_approved';
        RETURN NEXT;
        RETURN;
    END IF;

    IF upper(COALESCE(NULLIF(btrim(v_draft.snapshot_seller ->> 'currency'), ''), 'SAR')) <> 'SAR' THEN
        error_code := 'w2c_discount_currency_unsupported';
        RETURN NEXT;
        RETURN;
    END IF;

    IF NOT (p_quotation ? 'event')
        OR NOT (p_quotation ? 'date')
        OR NOT (p_quotation ? 'valid_until')
        OR NOT (p_quotation ? 'discount')
    THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    END IF;

    v_event := NULLIF(btrim(p_quotation ->> 'event'), '');
    v_date := NULLIF(btrim(p_quotation ->> 'date'), '')::date;
    v_valid_until := NULLIF(btrim(COALESCE(p_quotation ->> 'valid_until', '')), '')::date;
    v_discount := COALESCE(NULLIF(btrim(COALESCE(p_quotation ->> 'discount', '')), '')::numeric(12,2), 0);
    v_vat_rate := COALESCE(v_draft.vat_rate, 0);

    IF v_event IS NULL OR char_length(v_event) > 500
        OR v_date IS NULL
        OR v_valid_until IS NOT NULL AND v_valid_until < v_date
        OR v_discount < 0
        OR v_vat_rate < 0 OR v_vat_rate > 100
    THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_service.event_start_date IS NOT NULL THEN
        IF v_service.event_start_date < v_date
            OR (v_valid_until IS NOT NULL AND v_valid_until > v_service.event_start_date)
        THEN
            error_code := 'invalid_validity_window';
            RETURN NEXT;
            RETURN;
        END IF;
    END IF;

    CREATE TEMP TABLE pg_temp.w7p0b_draft_lines (
        ordinal integer NOT NULL,
        line_key text NULL,
        parent_line_key text NULL,
        commercial_role text NOT NULL,
        description text NOT NULL,
        description_ar text NULL,
        details text NULL,
        category text NOT NULL,
        qty numeric(12,2) NOT NULL,
        unit text NOT NULL,
        unit_price numeric(12,2) NOT NULL,
        is_selected boolean NOT NULL
    ) ON COMMIT DROP;

    CREATE TEMP TABLE pg_temp.w7p0b_draft_line_map (
        line_key text PRIMARY KEY,
        item_id uuid NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO pg_temp.w7p0b_draft_lines (
        ordinal, line_key, parent_line_key, commercial_role, description,
        description_ar, details, category, qty, unit, unit_price, is_selected
    )
    SELECT
        entries.ordinal::integer,
        NULLIF(btrim(entries.value ->> 'line_key'), ''),
        NULLIF(btrim(entries.value ->> 'parent_line_key'), ''),
        COALESCE(entries.value ->> 'commercial_role', ''),
        COALESCE(btrim(entries.value ->> 'description'), ''),
        NULLIF(btrim(entries.value ->> 'description_ar'), ''),
        NULLIF(btrim(entries.value ->> 'details'), ''),
        COALESCE(btrim(entries.value ->> 'category'), ''),
        COALESCE(NULLIF(btrim(entries.value ->> 'qty'), '')::numeric(12,2), 0),
        COALESCE(NULLIF(btrim(entries.value ->> 'unit'), ''), ''),
        COALESCE(NULLIF(btrim(entries.value ->> 'unit_price'), '')::numeric(12,2), 0),
        COALESCE((entries.value ->> 'is_selected')::boolean, true)
    FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS entries(value, ordinal);

    SELECT count(*)::integer, count(DISTINCT line_key)::integer
    INTO v_line_count, v_authority_count
    FROM pg_temp.w7p0b_draft_lines;

    IF v_line_count <> jsonb_array_length(p_lines)
        OR v_authority_count <> v_line_count
        OR EXISTS (
            SELECT 1 FROM pg_temp.w7p0b_draft_lines l
            WHERE l.line_key IS NULL OR char_length(l.line_key) > 100
                OR l.description = '' OR char_length(l.description) > 2000
                OR char_length(COALESCE(l.description_ar, '')) > 2000
                OR char_length(COALESCE(l.details, '')) > 4000
                OR char_length(l.category) > 200
                OR l.commercial_role NOT IN ('authority_line', 'included_component', 'optional_add_on')
                OR l.qty <= 0 OR l.unit_price < 0 OR l.unit = '' OR char_length(l.unit) > 80
                OR l.is_selected IS NULL
        )
        OR NOT EXISTS (
            SELECT 1 FROM pg_temp.w7p0b_draft_lines l
            WHERE l.commercial_role = 'authority_line' AND l.parent_line_key IS NULL
        )
        OR EXISTS (
            SELECT 1 FROM pg_temp.w7p0b_draft_lines l
            WHERE (l.commercial_role = 'authority_line' AND (l.parent_line_key IS NOT NULL OR NOT l.is_selected))
                OR (l.commercial_role <> 'authority_line' AND l.parent_line_key IS NULL)
                OR (l.commercial_role = 'included_component' AND (NOT l.is_selected OR l.unit_price <> 0))
        )
        OR EXISTS (
            SELECT 1
            FROM pg_temp.w7p0b_draft_lines child
            LEFT JOIN pg_temp.w7p0b_draft_lines parent ON parent.line_key = child.parent_line_key
            WHERE child.parent_line_key IS NOT NULL
                AND (parent.line_key IS NULL OR parent.commercial_role <> 'authority_line' OR parent.parent_line_key IS NOT NULL)
        )
    THEN
        error_code := 'invalid_commercial_hierarchy';
        RETURN NEXT;
        RETURN;
    END IF;

    PERFORM set_config('g7.w2c_allocator_skip', v_draft.id::text, true);
    DELETE FROM public.quotation_items WHERE quotation_items.quotation_id = v_draft.id;

    FOR v_line IN
        SELECT * FROM pg_temp.w7p0b_draft_lines
        WHERE parent_line_key IS NULL
        ORDER BY ordinal
    LOOP
        v_item_id := gen_random_uuid();
        INSERT INTO public.quotation_items (
            id, quotation_id, description, details, category, qty, unit_price,
            vat, total, discount_allocated, commercial_role,
            parent_authority_line_id, is_selected, unit, description_ar
        ) VALUES (
            v_item_id, v_draft.id, v_line.description, v_line.details, v_line.category,
            v_line.qty, v_line.unit_price, 0,
            round(v_line.qty * v_line.unit_price, 2), 0,
            v_line.commercial_role, NULL, true, v_line.unit, v_line.description_ar
        );
        INSERT INTO pg_temp.w7p0b_draft_line_map(line_key, item_id)
        VALUES (v_line.line_key, v_item_id);
    END LOOP;

    FOR v_line IN
        SELECT * FROM pg_temp.w7p0b_draft_lines
        WHERE parent_line_key IS NOT NULL
        ORDER BY ordinal
    LOOP
        SELECT m.item_id INTO v_parent_id
        FROM pg_temp.w7p0b_draft_line_map m
        WHERE m.line_key = v_line.parent_line_key;
        IF v_parent_id IS NULL THEN
            RAISE EXCEPTION USING MESSAGE = 'invalid_commercial_hierarchy';
        END IF;
        v_item_id := gen_random_uuid();
        INSERT INTO public.quotation_items (
            id, quotation_id, description, details, category, qty, unit_price,
            vat, total, discount_allocated, commercial_role,
            parent_authority_line_id, is_selected, unit, description_ar
        ) VALUES (
            v_item_id, v_draft.id, v_line.description, v_line.details, v_line.category,
            v_line.qty, v_line.unit_price, 0,
            CASE WHEN v_line.commercial_role = 'optional_add_on' AND v_line.is_selected
                THEN round(v_line.qty * v_line.unit_price, 2) ELSE 0 END,
            0, v_line.commercial_role, v_parent_id,
            v_line.is_selected, v_line.unit, v_line.description_ar
        );
        INSERT INTO pg_temp.w7p0b_draft_line_map(line_key, item_id)
        VALUES (v_line.line_key, v_item_id);
    END LOOP;

    SELECT COALESCE(sum(qi.total), 0)::numeric(12,2)
    INTO v_subtotal
    FROM public.quotation_items qi
    WHERE qi.quotation_id = v_draft.id;

    SELECT count(*)::integer
    INTO v_authority_count
    FROM public.quotation_items qi
    WHERE qi.quotation_id = v_draft.id
      AND qi.commercial_role = 'authority_line';

    IF v_authority_count < 1 OR v_discount > v_subtotal THEN
        RAISE EXCEPTION USING MESSAGE = 'discount_exceeds_subtotal';
    END IF;

    -- Set the discount before calling the canonical allocator; the final totals
    -- and VAT are written only after its fixed-SAR allocation succeeds.
    UPDATE public.quotations q
    SET discount = v_discount,
        event = v_event,
        date = v_date,
        valid_until = v_valid_until,
        updated_by = p_user_id,
        updated_at = v_now
    WHERE q.id = v_draft.id;

    PERFORM public.reconcile_quotation_discount_allocations(v_draft.id);

    v_taxable := v_subtotal - v_discount;
    v_vat_amount := CASE
        WHEN v_vat_rate = 0 THEN 0
        ELSE round(v_taxable * (v_vat_rate / 100), 2)
    END;
    v_grand_total := v_taxable + v_vat_amount;

    IF v_vat_rate = 0 THEN
        UPDATE public.quotation_items qi
        SET vat = 0, updated_at = v_now
        WHERE qi.quotation_id = v_draft.id;
    ELSE
        UPDATE public.quotation_items qi
        SET vat = round((qi.total - (v_discount * (qi.total / NULLIF(v_subtotal, 0)))) * (v_vat_rate / 100), 2),
            updated_at = v_now
        WHERE qi.quotation_id = v_draft.id;

        SELECT v_vat_amount - COALESCE(sum(qi.vat), 0)
        INTO v_residual
        FROM public.quotation_items qi
        WHERE qi.quotation_id = v_draft.id;

        IF v_residual <> 0 THEN
            SELECT qi.id INTO v_max_item_id
            FROM public.quotation_items qi
            WHERE qi.quotation_id = v_draft.id
            ORDER BY qi.total DESC, qi.id
            LIMIT 1;
            UPDATE public.quotation_items qi
            SET vat = qi.vat + v_residual, updated_at = v_now
            WHERE qi.id = v_max_item_id;
        END IF;
    END IF;

    UPDATE public.quotations q
    SET subtotal = v_subtotal,
        discount = v_discount,
        vat_rate = v_vat_rate,
        vat_amount = v_vat_amount,
        grand_total = v_grand_total,
        updated_by = p_user_id,
        updated_at = v_now
    WHERE q.id = v_draft.id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'update', 'quotation', v_draft.id, p_user_id,
        jsonb_build_object(
            'event_type', 'approved_commercial_amendment_draft_updated',
            'actor_id', p_user_id,
            'quotation_id', v_draft.id,
            'source_quotation_id', v_source.id,
            'line_count', v_line_count,
            'subtotal', v_subtotal,
            'discount', v_discount,
            'vat_amount', v_vat_amount,
            'grand_total', v_grand_total,
            'transaction_timestamp', v_now
        ),
        v_now
    );

    error_code := NULL;
    quotation_id := v_draft.id;
    updated_at := v_now;
    line_count := v_line_count;
    subtotal := v_subtotal;
    discount := v_discount;
    vat_amount := v_vat_amount;
    grand_total := v_grand_total;
    RETURN NEXT;
    RETURN;
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range OR invalid_parameter_value THEN
        error_code := 'invalid_input';
        quotation_id := p_quotation_id;
        RETURN NEXT;
        RETURN;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE v_error_message
            WHEN 'invalid_commercial_hierarchy' THEN 'invalid_commercial_hierarchy'
            WHEN 'discount_exceeds_subtotal' THEN 'discount_exceeds_subtotal'
            WHEN 'w2c_discount_currency_unsupported' THEN 'w2c_discount_currency_unsupported'
            WHEN 'w2c_discount_invalid_hierarchy' THEN 'invalid_commercial_hierarchy'
            WHEN 'w2c_discount_allocation_not_reconciled' THEN 'commercial_draft_update_failed'
            WHEN 'quotation_items_commercial_role_invalid' THEN 'invalid_commercial_hierarchy'
            WHEN 'quotation_included_component_must_be_non_priced' THEN 'invalid_commercial_hierarchy'
            WHEN 'quotation_unselected_optional_total_must_be_zero' THEN 'invalid_commercial_hierarchy'
            WHEN 'quotation_component_parent_must_be_authority_line' THEN 'invalid_commercial_hierarchy'
            ELSE 'commercial_draft_update_failed'
        END;
        quotation_id := p_quotation_id;
        RETURN NEXT;
        RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.update_approved_commercial_amendment_draft(uuid, jsonb, jsonb, timestamptz, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_approved_commercial_amendment_draft(uuid, jsonb, jsonb, timestamptz, text)
    TO service_role;

COMMENT ON FUNCTION public.update_approved_commercial_amendment_draft(uuid, jsonb, jsonb, timestamptz, text) IS
    'W7-P0B service-role-only structured Draft successor mutation. Replaces only an eligible Approved Commercial Amendment Draft, validates W2A hierarchy, and delegates fixed-SAR discount allocation to W2C.';

COMMIT;
