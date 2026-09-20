-- W7-P0: activate the existing W2A hierarchy for ordinary quotation creation
-- and eligible Draft editing. The legacy flat RPCs remain available for older
-- callers; the quotation UI uses these service-role-only boundaries.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.quotations') IS NULL
        OR to_regclass('public.quotation_items') IS NULL
        OR to_regclass('public.services') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'w7p0_flexible_quotation_builder preflight: required table missing';
    END IF;

    IF to_regprocedure('public.create_quotation_with_items(jsonb,jsonb,text)') IS NULL
        OR to_regprocedure('public.set_quotation_commercial_structure(uuid,jsonb,text)') IS NULL
        OR to_regprocedure('public.reconcile_quotation_discount_allocations(uuid)') IS NULL
    THEN
        RAISE EXCEPTION 'w7p0_flexible_quotation_builder preflight: existing quotation authority RPC missing';
    END IF;

    IF to_regprocedure('public.create_flexible_quotation_with_items(jsonb,jsonb,text)') IS NOT NULL
        OR to_regprocedure('public.update_flexible_quotation_draft(uuid,jsonb,jsonb,timestamptz,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'w7p0_flexible_quotation_builder preflight: target RPC already exists';
    END IF;
END;
$$;

CREATE FUNCTION public.create_flexible_quotation_with_items(
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
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_mutation_key text;
    v_service_id uuid;
    v_event text;
    v_date date;
    v_valid_until date;
    v_discount numeric(12,2);
    v_canonical_payload jsonb;
    v_legacy_items jsonb;
    v_marker_prefix text;
    v_existing public.quotations%ROWTYPE;
    v_created record;
    v_structure record;
    v_line record;
    v_line_count integer;
    v_distinct_count integer;
    v_authority_count integer;
    v_map_count integer;
    v_now timestamptz := transaction_timestamp();
    v_error_message text;
BEGIN
    IF p_user_id IS NULL OR btrim(p_user_id) = '' OR char_length(p_user_id) > 200
        OR p_quotation IS NULL OR jsonb_typeof(p_quotation) <> 'object'
        OR p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
        OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 200
    THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    END IF;

    v_mutation_key := NULLIF(btrim(p_quotation ->> 'mutation_key'), '');
    v_service_id := NULLIF(btrim(p_quotation ->> 'service_id'), '')::uuid;
    v_event := NULLIF(btrim(p_quotation ->> 'event'), '');
    v_date := NULLIF(btrim(p_quotation ->> 'date'), '')::date;
    v_valid_until := NULLIF(btrim(COALESCE(p_quotation ->> 'valid_until', '')), '')::date;
    v_discount := COALESCE(NULLIF(btrim(COALESCE(p_quotation ->> 'discount', '')), '')::numeric(12,2), 0);

    IF v_mutation_key IS NULL OR v_service_id IS NULL OR v_event IS NULL OR v_date IS NULL
        OR v_discount < 0 OR (v_valid_until IS NOT NULL AND v_valid_until < v_date)
    THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    END IF;

    CREATE TEMP TABLE pg_temp.w7p0_flexible_initial_lines (
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

    INSERT INTO pg_temp.w7p0_flexible_initial_lines (
        ordinal, line_key, parent_line_key, commercial_role, description,
        description_ar, details, category, qty, unit, unit_price, is_selected
    )
    SELECT
        entries.ordinal::integer,
        NULLIF(btrim(entries.value ->> 'line_key'), ''),
        NULLIF(btrim(entries.value ->> 'parent_line_key'), ''),
        COALESCE(NULLIF(btrim(entries.value ->> 'commercial_role'), ''), 'authority_line'),
        COALESCE(btrim(entries.value ->> 'description'), ''),
        NULLIF(btrim(entries.value ->> 'description_ar'), ''),
        NULLIF(btrim(entries.value ->> 'details'), ''),
        COALESCE(btrim(entries.value ->> 'category'), ''),
        COALESCE(NULLIF(btrim(entries.value ->> 'qty'), '')::numeric(12,2), 0),
        COALESCE(NULLIF(btrim(entries.value ->> 'unit'), ''), ''),
        COALESCE(NULLIF(btrim(entries.value ->> 'unit_price'), '')::numeric(12,2), 0),
        COALESCE((entries.value ->> 'is_selected')::boolean, true)
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS entries(value, ordinal);

    SELECT count(*)::integer, count(DISTINCT line_key)::integer
    INTO v_line_count, v_distinct_count
    FROM pg_temp.w7p0_flexible_initial_lines;

    IF v_line_count <> jsonb_array_length(p_items)
        OR v_distinct_count <> v_line_count
        OR EXISTS (
            SELECT 1 FROM pg_temp.w7p0_flexible_initial_lines l
            WHERE l.line_key IS NULL OR char_length(l.line_key) > 100
                OR l.description = '' OR char_length(l.description) > 2000
                OR char_length(COALESCE(l.description_ar, '')) > 2000
                OR char_length(COALESCE(l.details, '')) > 4000
                OR char_length(l.category) > 200
                OR l.commercial_role NOT IN ('authority_line', 'included_component', 'optional_add_on')
                OR l.qty <= 0 OR l.unit_price < 0 OR l.unit = '' OR char_length(l.unit) > 80
        )
        OR NOT EXISTS (
            SELECT 1 FROM pg_temp.w7p0_flexible_initial_lines l
            WHERE l.commercial_role = 'authority_line' AND l.parent_line_key IS NULL AND l.is_selected
        )
        OR EXISTS (
            SELECT 1 FROM pg_temp.w7p0_flexible_initial_lines l
            WHERE (l.commercial_role = 'authority_line' AND (l.parent_line_key IS NOT NULL OR NOT l.is_selected))
                OR (l.commercial_role <> 'authority_line' AND l.parent_line_key IS NULL)
                OR (l.commercial_role = 'included_component' AND (NOT l.is_selected OR l.unit_price <> 0))
        )
        OR EXISTS (
            SELECT 1
            FROM pg_temp.w7p0_flexible_initial_lines child
            LEFT JOIN pg_temp.w7p0_flexible_initial_lines parent ON parent.line_key = child.parent_line_key
            WHERE child.parent_line_key IS NOT NULL
                AND (parent.line_key IS NULL OR parent.commercial_role <> 'authority_line' OR parent.parent_line_key IS NOT NULL)
        )
    THEN
        error_code := 'invalid_commercial_hierarchy';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'line_key', l.line_key,
            'parent_line_key', l.parent_line_key,
            'commercial_role', l.commercial_role,
            'description', l.description,
            'description_ar', l.description_ar,
            'details', l.details,
            'category', l.category,
            'qty', l.qty,
            'unit', l.unit,
            'unit_price', l.unit_price,
            'is_selected', l.is_selected
        ) ORDER BY l.ordinal
    ), '[]'::jsonb)
    INTO v_canonical_payload
    FROM pg_temp.w7p0_flexible_initial_lines l;

    v_canonical_payload := jsonb_build_object(
        'service_id', v_service_id,
        'event', v_event,
        'date', v_date,
        'valid_until', v_valid_until,
        'discount', v_discount,
        'items', v_canonical_payload
    );

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('quotation_mutation_key:' || v_mutation_key, 8591)
    );

    SELECT q.*
    INTO v_existing
    FROM public.quotations q
    WHERE q.mutation_key = v_mutation_key
      AND COALESCE(q.is_deleted, false) = false
    LIMIT 1;

    IF FOUND THEN
        IF v_existing.mutation_payload = v_canonical_payload THEN
            quotation_id := v_existing.id;
            quotation_number := v_existing.quotation_number;
            subtotal := v_existing.subtotal;
            discount := v_existing.discount;
            vat_amount := v_existing.vat_amount;
            grand_total := v_existing.grand_total;
            is_replayed := true;
            error_code := NULL;
            RETURN NEXT;
            RETURN;
        END IF;
        error_code := 'mutation_key_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    v_marker_prefix := '__g7_flexible_line__' || md5(v_mutation_key) || ':';

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'description', l.description,
            'details', v_marker_prefix || l.line_key,
            'category', l.category,
            'qty', l.qty,
            'unit_price', CASE WHEN l.commercial_role = 'included_component' THEN 0 ELSE l.unit_price END
        ) ORDER BY l.ordinal
    ), '[]'::jsonb)
    INTO v_legacy_items
    FROM pg_temp.w7p0_flexible_initial_lines l;

    SELECT result.*
    INTO v_created
    FROM public.create_quotation_with_items(
        jsonb_build_object(
            'mutation_key', v_mutation_key,
            'service_id', v_service_id,
            'event', v_event,
            'date', v_date,
            'valid_until', v_valid_until,
            'discount', v_discount
        ),
        v_legacy_items,
        p_user_id
    ) AS result;

    IF v_created.error_code IS NOT NULL OR v_created.quotation_id IS NULL THEN
        error_code := COALESCE(v_created.error_code, 'create_failed');
        RETURN NEXT;
        RETURN;
    END IF;

    CREATE TEMP TABLE pg_temp.w7p0_flexible_initial_line_map (
        line_key text PRIMARY KEY,
        item_id uuid NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO pg_temp.w7p0_flexible_initial_line_map(line_key, item_id)
    SELECT l.line_key, qi.id
    FROM pg_temp.w7p0_flexible_initial_lines l
    JOIN public.quotation_items qi
      ON qi.quotation_id = v_created.quotation_id
     AND qi.details = v_marker_prefix || l.line_key;

    SELECT count(*)::integer INTO v_map_count FROM pg_temp.w7p0_flexible_initial_line_map;
    IF v_map_count <> v_line_count THEN
        RAISE EXCEPTION USING MESSAGE = 'flexible_line_mapping_failed';
    END IF;

    FOR v_line IN SELECT * FROM pg_temp.w7p0_flexible_initial_lines ORDER BY ordinal
    LOOP
        UPDATE public.quotation_items qi
        SET description = v_line.description,
            details = v_line.details,
            category = v_line.category,
            qty = v_line.qty,
            unit_price = CASE WHEN v_line.commercial_role = 'included_component' THEN 0 ELSE v_line.unit_price END,
            updated_at = v_now
        WHERE qi.id = (SELECT m.item_id FROM pg_temp.w7p0_flexible_initial_line_map m WHERE m.line_key = v_line.line_key);
    END LOOP;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'quotation_item_id', current_map.item_id,
            'commercial_role', l.commercial_role,
            'parent_authority_line_id', parent_map.item_id,
            'is_selected', l.is_selected,
            'unit', l.unit,
            'description_ar', l.description_ar
        ) ORDER BY l.ordinal
    ), '[]'::jsonb)
    INTO v_legacy_items
    FROM pg_temp.w7p0_flexible_initial_lines l
    JOIN pg_temp.w7p0_flexible_initial_line_map current_map ON current_map.line_key = l.line_key
    LEFT JOIN pg_temp.w7p0_flexible_initial_line_map parent_map ON parent_map.line_key = l.parent_line_key;

    SELECT result.*
    INTO v_structure
    FROM public.set_quotation_commercial_structure(v_created.quotation_id, v_legacy_items, p_user_id) AS result;

    IF v_structure.error_code IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'flexible_structure:' || v_structure.error_code;
    END IF;

    UPDATE public.quotations q
    SET mutation_payload = v_canonical_payload,
        updated_by = p_user_id
    WHERE q.id = v_created.quotation_id;

    quotation_id := v_created.quotation_id;
    quotation_number := v_created.quotation_number;
    subtotal := v_structure.subtotal;
    discount := v_structure.discount;
    vat_amount := v_structure.vat_amount;
    grand_total := v_structure.grand_total;
    is_replayed := false;
    error_code := NULL;
    RETURN NEXT;
    RETURN;
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range OR invalid_parameter_value THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE
            WHEN v_error_message LIKE 'flexible_structure:%' THEN replace(v_error_message, 'flexible_structure:', '')
            WHEN v_error_message = 'flexible_line_mapping_failed' THEN 'create_failed'
            WHEN v_error_message = 'discount_exceeds_subtotal' THEN 'discount_exceeds_subtotal'
            WHEN v_error_message = 'approved_quotation_immutable' THEN 'create_failed'
            ELSE 'create_failed'
        END;
        RETURN NEXT;
        RETURN;
END;
$$;

CREATE FUNCTION public.update_flexible_quotation_draft(
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
    v_service public.services%ROWTYPE;
    v_service_id uuid;
    v_operation text;
    v_event text;
    v_date date;
    v_valid_until date;
    v_discount numeric(12,2);
    v_vat_rate numeric(5,2);
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

    IF p_quotation_id IS NULL OR p_user_id IS NULL OR btrim(p_user_id) = ''
        OR char_length(p_user_id) > 200 OR p_expected_updated_at IS NULL
        OR p_quotation IS NULL OR jsonb_typeof(p_quotation) <> 'object'
        OR p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array'
        OR jsonb_array_length(p_lines) < 1 OR jsonb_array_length(p_lines) > 200
        OR p_quotation ?| ARRAY['service_id', 'customer_id', 'status', 'quotation_id']
    THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT q.service_id INTO v_service_id FROM public.quotations q WHERE q.id = p_quotation_id;
    IF NOT FOUND THEN
        error_code := 'quotation_not_found';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.* INTO v_service FROM public.services s WHERE s.id = v_service_id FOR UPDATE;
    IF NOT FOUND OR v_service.deleted_at IS NOT NULL OR v_service.status IN ('Completed', 'Cancelled') THEN
        error_code := 'quotation_service_lifecycle_ineligible';
        RETURN NEXT;
        RETURN;
    END IF;

    PERFORM q.id
    FROM public.quotations q
    WHERE q.quotation_family_id = (SELECT family.quotation_family_id FROM public.quotations family WHERE family.id = p_quotation_id)
    ORDER BY q.id
    FOR UPDATE;

    SELECT q.* INTO v_draft
    FROM public.quotations q
    WHERE q.id = p_quotation_id AND COALESCE(q.is_deleted, false) = false
    FOR UPDATE;

    IF NOT FOUND THEN
        error_code := 'quotation_not_found';
        RETURN NEXT;
        RETURN;
    END IF;

    v_operation := COALESCE(v_draft.mutation_payload ->> 'operation', '');
    IF v_draft.status <> 'draft' THEN
        error_code := 'quotation_not_draft';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_operation = 'approved_commercial_amendment_creation' THEN
        error_code := 'quotation_amendment_draft_ineligible';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_draft.revision_of_quotation_id IS NOT NULL AND v_operation <> 'quotation_revision' THEN
        error_code := 'quotation_draft_ineligible';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_draft.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        error_code := 'quotation_draft_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    IF upper(COALESCE(NULLIF(btrim(v_draft.snapshot_seller ->> 'currency'), ''), 'SAR')) <> 'SAR' THEN
        error_code := 'w2c_discount_currency_unsupported';
        RETURN NEXT;
        RETURN;
    END IF;

    IF NOT (p_quotation ? 'event') OR NOT (p_quotation ? 'date')
        OR NOT (p_quotation ? 'valid_until') OR NOT (p_quotation ? 'discount')
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

    IF v_event IS NULL OR char_length(v_event) > 500 OR v_date IS NULL
        OR (v_valid_until IS NOT NULL AND v_valid_until < v_date)
        OR v_discount < 0 OR v_vat_rate < 0 OR v_vat_rate > 100
    THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_service.event_start_date IS NOT NULL
        AND (v_service.event_start_date < v_date OR (v_valid_until IS NOT NULL AND v_valid_until > v_service.event_start_date))
    THEN
        error_code := 'invalid_validity_window';
        RETURN NEXT;
        RETURN;
    END IF;

    CREATE TEMP TABLE pg_temp.w7p0_flexible_draft_lines (
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

    CREATE TEMP TABLE pg_temp.w7p0_flexible_draft_line_map (
        line_key text PRIMARY KEY,
        item_id uuid NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO pg_temp.w7p0_flexible_draft_lines (
        ordinal, line_key, parent_line_key, commercial_role, description,
        description_ar, details, category, qty, unit, unit_price, is_selected
    )
    SELECT
        entries.ordinal::integer,
        NULLIF(btrim(entries.value ->> 'line_key'), ''),
        NULLIF(btrim(entries.value ->> 'parent_line_key'), ''),
        COALESCE(NULLIF(btrim(entries.value ->> 'commercial_role'), ''), 'authority_line'),
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
    FROM pg_temp.w7p0_flexible_draft_lines;

    IF v_line_count <> jsonb_array_length(p_lines)
        OR v_authority_count <> v_line_count
        OR EXISTS (
            SELECT 1 FROM pg_temp.w7p0_flexible_draft_lines l
            WHERE l.line_key IS NULL OR char_length(l.line_key) > 100
                OR l.description = '' OR char_length(l.description) > 2000
                OR char_length(COALESCE(l.description_ar, '')) > 2000
                OR char_length(COALESCE(l.details, '')) > 4000
                OR char_length(l.category) > 200
                OR l.commercial_role NOT IN ('authority_line', 'included_component', 'optional_add_on')
                OR l.qty <= 0 OR l.unit_price < 0 OR l.unit = '' OR char_length(l.unit) > 80
        )
        OR NOT EXISTS (
            SELECT 1 FROM pg_temp.w7p0_flexible_draft_lines l
            WHERE l.commercial_role = 'authority_line' AND l.parent_line_key IS NULL AND l.is_selected
        )
        OR EXISTS (
            SELECT 1 FROM pg_temp.w7p0_flexible_draft_lines l
            WHERE (l.commercial_role = 'authority_line' AND (l.parent_line_key IS NOT NULL OR NOT l.is_selected))
                OR (l.commercial_role <> 'authority_line' AND l.parent_line_key IS NULL)
                OR (l.commercial_role = 'included_component' AND (NOT l.is_selected OR l.unit_price <> 0))
        )
        OR EXISTS (
            SELECT 1
            FROM pg_temp.w7p0_flexible_draft_lines child
            LEFT JOIN pg_temp.w7p0_flexible_draft_lines parent ON parent.line_key = child.parent_line_key
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

    FOR v_line IN SELECT * FROM pg_temp.w7p0_flexible_draft_lines WHERE parent_line_key IS NULL ORDER BY ordinal
    LOOP
        v_item_id := gen_random_uuid();
        INSERT INTO public.quotation_items (
            id, quotation_id, description, details, category, qty, unit_price,
            vat, total, discount_allocated, commercial_role, parent_authority_line_id,
            is_selected, unit, description_ar
        ) VALUES (
            v_item_id, v_draft.id, v_line.description, v_line.details, v_line.category,
            v_line.qty, v_line.unit_price, 0, round(v_line.qty * v_line.unit_price, 2), 0,
            'authority_line', NULL, true, v_line.unit, v_line.description_ar
        );
        INSERT INTO pg_temp.w7p0_flexible_draft_line_map(line_key, item_id) VALUES (v_line.line_key, v_item_id);
    END LOOP;

    FOR v_line IN SELECT * FROM pg_temp.w7p0_flexible_draft_lines WHERE parent_line_key IS NOT NULL ORDER BY ordinal
    LOOP
        SELECT m.item_id INTO v_parent_id FROM pg_temp.w7p0_flexible_draft_line_map m WHERE m.line_key = v_line.parent_line_key;
        IF v_parent_id IS NULL THEN RAISE EXCEPTION USING MESSAGE = 'invalid_commercial_hierarchy'; END IF;
        v_item_id := gen_random_uuid();
        INSERT INTO public.quotation_items (
            id, quotation_id, description, details, category, qty, unit_price,
            vat, total, discount_allocated, commercial_role, parent_authority_line_id,
            is_selected, unit, description_ar
        ) VALUES (
            v_item_id, v_draft.id, v_line.description, v_line.details, v_line.category,
            v_line.qty, v_line.unit_price, 0,
            CASE WHEN v_line.commercial_role = 'optional_add_on' AND v_line.is_selected THEN round(v_line.qty * v_line.unit_price, 2) ELSE 0 END,
            0, v_line.commercial_role, v_parent_id, v_line.is_selected, v_line.unit, v_line.description_ar
        );
        INSERT INTO pg_temp.w7p0_flexible_draft_line_map(line_key, item_id) VALUES (v_line.line_key, v_item_id);
    END LOOP;

    SELECT COALESCE(sum(qi.total), 0)::numeric(12,2) INTO v_subtotal
    FROM public.quotation_items qi WHERE qi.quotation_id = v_draft.id;
    SELECT count(*)::integer INTO v_authority_count
    FROM public.quotation_items qi WHERE qi.quotation_id = v_draft.id AND qi.commercial_role = 'authority_line';

    IF v_authority_count < 1 OR v_discount > v_subtotal THEN
        RAISE EXCEPTION USING MESSAGE = 'discount_exceeds_subtotal';
    END IF;

    UPDATE public.quotations q
    SET discount = v_discount, event = v_event, date = v_date, valid_until = v_valid_until,
        updated_by = p_user_id, updated_at = v_now
    WHERE q.id = v_draft.id;

    PERFORM public.reconcile_quotation_discount_allocations(v_draft.id);

    v_taxable := v_subtotal - v_discount;
    v_vat_amount := CASE WHEN v_vat_rate = 0 THEN 0 ELSE round(v_taxable * (v_vat_rate / 100), 2) END;
    v_grand_total := v_taxable + v_vat_amount;

    IF v_vat_rate = 0 THEN
        UPDATE public.quotation_items qi SET vat = 0, updated_at = v_now WHERE qi.quotation_id = v_draft.id;
    ELSE
        UPDATE public.quotation_items qi
        SET vat = round((qi.total - (v_discount * (qi.total / NULLIF(v_subtotal, 0)))) * (v_vat_rate / 100), 2),
            updated_at = v_now
        WHERE qi.quotation_id = v_draft.id;
        SELECT v_vat_amount - COALESCE(sum(qi.vat), 0) INTO v_residual
        FROM public.quotation_items qi WHERE qi.quotation_id = v_draft.id;
        IF v_residual <> 0 THEN
            SELECT qi.id INTO v_max_item_id FROM public.quotation_items qi
            WHERE qi.quotation_id = v_draft.id ORDER BY qi.total DESC, qi.id LIMIT 1;
            UPDATE public.quotation_items qi SET vat = qi.vat + v_residual, updated_at = v_now WHERE qi.id = v_max_item_id;
        END IF;
    END IF;

    UPDATE public.quotations q
    SET subtotal = v_subtotal, discount = v_discount, vat_rate = v_vat_rate,
        vat_amount = v_vat_amount, grand_total = v_grand_total,
        updated_by = p_user_id, updated_at = v_now
    WHERE q.id = v_draft.id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'update', 'quotation', v_draft.id, p_user_id,
        jsonb_build_object(
            'event_type', 'quotation_flexible_draft_updated',
            'actor_id', p_user_id,
            'quotation_id', v_draft.id,
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
        RETURN NEXT;
        RETURN;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE v_error_message
            WHEN 'invalid_commercial_hierarchy' THEN 'invalid_commercial_hierarchy'
            WHEN 'discount_exceeds_subtotal' THEN 'discount_exceeds_subtotal'
            WHEN 'w2c_discount_currency_unsupported' THEN 'w2c_discount_currency_unsupported'
            WHEN 'w2c_discount_allocation_not_reconciled' THEN 'commercial_draft_update_failed'
            WHEN 'post_sent_quotation_items_immutable' THEN 'quotation_not_draft'
            ELSE 'commercial_draft_update_failed'
        END;
        RETURN NEXT;
        RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.create_flexible_quotation_with_items(jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_flexible_quotation_with_items(jsonb, jsonb, text) TO service_role;
REVOKE ALL ON FUNCTION public.update_flexible_quotation_draft(uuid, jsonb, jsonb, timestamptz, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_flexible_quotation_draft(uuid, jsonb, jsonb, timestamptz, text) TO service_role;

COMMENT ON FUNCTION public.create_flexible_quotation_with_items(jsonb, jsonb, text) IS
    'Service-role-only atomic replay-safe W7-P0 initial quotation creation with W2A Itemized, Package, and Mixed hierarchy.';
COMMENT ON FUNCTION public.update_flexible_quotation_draft(uuid, jsonb, jsonb, timestamptz, text) IS
    'Service-role-only W7-P0 structured Draft mutation for ordinary quotations and W2B successor Drafts; approved Commercial Amendment Drafts remain on W7-P0B.';

COMMIT;
