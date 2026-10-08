-- R01 percentage-discount contract. Existing monetary discounts remain fixed SAR.
BEGIN;

DO $$
DECLARE v_md5 text;
BEGIN
    IF to_regclass('public.quotations') IS NULL OR to_regclass('public.quotation_items') IS NULL
        OR to_regclass('public.audit_logs') IS NULL THEN
        RAISE EXCEPTION 'r01 preflight: required quotation tables are missing';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.quotations'::regclass
        AND attname IN ('discount_type', 'discount_percentage_bps') AND attnum > 0 AND NOT attisdropped) THEN
        RAISE EXCEPTION 'r01 preflight: percentage-discount columns already exist';
    END IF;
    IF to_regprocedure('public.create_flexible_quotation_with_items(jsonb,jsonb,text)') IS NULL
        OR to_regprocedure('public.update_flexible_quotation_draft(uuid,jsonb,jsonb,timestamptz,text)') IS NULL
        OR to_regprocedure('public.create_quotation_revision(uuid,text,text,text)') IS NULL
        OR to_regprocedure('public.approve_quotation_and_activate_internal_abs(uuid,text,text)') IS NULL
        OR to_regprocedure('public.create_approved_commercial_amendment(uuid,text,text,text,text)') IS NULL
        OR to_regprocedure('public.approve_approved_commercial_amendment(uuid,uuid,text,text,text)') IS NULL
        OR to_regprocedure('public.update_approved_commercial_amendment_draft(uuid,jsonb,jsonb,timestamptz,text)') IS NULL
        OR to_regprocedure('public.reconcile_quotation_discount_allocations(uuid)') IS NULL THEN
        RAISE EXCEPTION 'r01 preflight: required active RPC is missing';
    END IF;
    SELECT md5(prosrc) INTO v_md5 FROM pg_proc WHERE oid = to_regprocedure('public.create_flexible_quotation_with_items(jsonb,jsonb,text)');
    IF v_md5 IS DISTINCT FROM '4fb1a057fe12ec2f7645bc747b00f106' THEN RAISE EXCEPTION 'r01 source guard: flexible create drift'; END IF;
    SELECT md5(prosrc) INTO v_md5 FROM pg_proc WHERE oid = to_regprocedure('public.update_flexible_quotation_draft(uuid,jsonb,jsonb,timestamptz,text)');
    IF v_md5 IS DISTINCT FROM '2e7254b058f502fa78bfee4470c2f1be' THEN RAISE EXCEPTION 'r01 source guard: flexible update drift'; END IF;
    SELECT md5(prosrc) INTO v_md5 FROM pg_proc WHERE oid = to_regprocedure('public.create_quotation_revision(uuid,text,text,text)');
    IF v_md5 IS DISTINCT FROM '60e7f0d89361ca8ced6cfed3f1e7cf64' THEN RAISE EXCEPTION 'r01 source guard: quotation revision drift'; END IF;
    SELECT md5(prosrc) INTO v_md5 FROM pg_proc WHERE oid = to_regprocedure('public.approve_quotation_and_activate_internal_abs(uuid,text,text)');
    IF v_md5 IS DISTINCT FROM '50fc04ca58db077643d5cba9e48a5ecc' THEN RAISE EXCEPTION 'r01 source guard: quotation approval drift'; END IF;
    SELECT md5(prosrc) INTO v_md5 FROM pg_proc WHERE oid = to_regprocedure('public.create_approved_commercial_amendment(uuid,text,text,text,text)');
    IF v_md5 IS DISTINCT FROM '854aca86bd3cefa159d7e0ddaab5e389' THEN RAISE EXCEPTION 'r01 source guard: amendment creation drift'; END IF;
    SELECT md5(prosrc) INTO v_md5 FROM pg_proc WHERE oid = to_regprocedure('public.approve_approved_commercial_amendment(uuid,uuid,text,text,text)');
    IF v_md5 IS DISTINCT FROM 'a1df1ddc369823f10afb94db77f58ddd' THEN RAISE EXCEPTION 'r01 source guard: amendment approval drift'; END IF;
    SELECT md5(prosrc) INTO v_md5 FROM pg_proc WHERE oid = to_regprocedure('public.update_approved_commercial_amendment_draft(uuid,jsonb,jsonb,timestamptz,text)');
    IF v_md5 IS DISTINCT FROM '9c9bf34c0e15bdd526ee5b60cddbf797' THEN RAISE EXCEPTION 'r01 source guard: amendment update drift'; END IF;
    SELECT md5(prosrc) INTO v_md5 FROM pg_proc WHERE oid = to_regprocedure('public.reconcile_quotation_discount_allocations(uuid)');
    IF v_md5 IS DISTINCT FROM 'b9ea8fecb1c79e08c9f8bc6fc3833430' THEN RAISE EXCEPTION 'r01 source guard: W2C allocator drift'; END IF;
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        WHERE p.oid IN (
            to_regprocedure('public.create_flexible_quotation_with_items(jsonb,jsonb,text)'),
            to_regprocedure('public.update_flexible_quotation_draft(uuid,jsonb,jsonb,timestamptz,text)'),
            to_regprocedure('public.create_quotation_revision(uuid,text,text,text)'),
            to_regprocedure('public.approve_quotation_and_activate_internal_abs(uuid,text,text)'),
            to_regprocedure('public.create_approved_commercial_amendment(uuid,text,text,text,text)'),
            to_regprocedure('public.approve_approved_commercial_amendment(uuid,uuid,text,text,text)'),
            to_regprocedure('public.update_approved_commercial_amendment_draft(uuid,jsonb,jsonb,timestamptz,text)'),
            to_regprocedure('public.reconcile_quotation_discount_allocations(uuid)')
        ) AND (pg_get_userbyid(p.proowner) <> 'postgres' OR NOT p.prosecdef
            OR p.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[]
            OR p.proacl::text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
            OR p.provolatile <> 'v' OR p.proparallel <> 'u' OR p.procost <> 100
            OR p.prorows <> CASE WHEN p.proname = 'reconcile_quotation_discount_allocations' THEN 0 ELSE 1000 END)
    ) THEN RAISE EXCEPTION 'r01 source guard: function security metadata or ACL drift'; END IF;
END;
$$;

ALTER TABLE public.quotations
    ADD COLUMN discount_type text NOT NULL DEFAULT 'fixed_sar',
    ADD COLUMN discount_percentage_bps smallint NULL;
ALTER TABLE public.quotations
    ADD CONSTRAINT quotations_discount_type_check
        CHECK (discount_type IN ('fixed_sar', 'percentage')),
    ADD CONSTRAINT quotations_discount_percentage_contract_check
        CHECK ((discount_type = 'fixed_sar' AND discount_percentage_bps IS NULL)
            OR (discount_type = 'percentage' AND discount_percentage_bps IS NOT NULL
                AND discount_percentage_bps BETWEEN 0 AND 10000));

COMMENT ON COLUMN public.quotations.discount IS
    'Resolved quotation-level SAR discount amount for fixed_sar and percentage modes; W2C allocation remains authoritative.';
COMMENT ON COLUMN public.quotations.discount_type IS
    'Quotation-level discount terms: fixed_sar preserves the monetary amount; percentage stores a rate resolved to SAR.';
COMMENT ON COLUMN public.quotations.discount_percentage_bps IS
    'Percentage rate in basis points (0.01% = 1); null for fixed_sar, 0 through 10000 for percentage.';

CREATE OR REPLACE FUNCTION public.resolve_quotation_discount(
    p_discount_type text,
    p_discount_percentage_bps smallint,
    p_fixed_discount numeric,
    p_eligible_base_h numeric
)
RETURNS numeric(12,2)
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_discount_h numeric(30,0);
BEGIN
    IF p_discount_type = 'fixed_sar' THEN
        IF p_discount_percentage_bps IS NOT NULL OR p_fixed_discount IS NULL OR p_fixed_discount < 0 THEN
            RAISE EXCEPTION USING MESSAGE = 'quotation_discount_terms_invalid';
        END IF;
        RETURN p_fixed_discount::numeric(12,2);
    END IF;
    IF p_discount_type <> 'percentage' OR p_discount_percentage_bps IS NULL
        OR p_discount_percentage_bps < 0 OR p_discount_percentage_bps > 10000
        OR p_eligible_base_h IS NULL OR p_eligible_base_h < 0 THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_discount_terms_invalid';
    END IF;
    v_discount_h := round(p_eligible_base_h * p_discount_percentage_bps::numeric / 10000, 0);
    RETURN (v_discount_h / 100)::numeric(12,2);
END;
$$;
ALTER FUNCTION public.resolve_quotation_discount(text, smallint, numeric, numeric) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.resolve_quotation_discount(text, smallint, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_quotation_discount(text, smallint, numeric, numeric) TO service_role;
COMMENT ON FUNCTION public.resolve_quotation_discount(text, smallint, numeric, numeric) IS
    'R01 exact integer-halal percentage resolution. Fixed mode returns the existing SAR amount; percentage rounds once at quotation header.';

CREATE OR REPLACE FUNCTION public.quotation_eligible_discount_base_h(p_quotation_id uuid)
RETURNS numeric(30,0)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT COALESCE(sum(round(qi.total * 100, 0)), 0)::numeric(30,0)
    FROM public.quotation_items qi
    WHERE qi.quotation_id = p_quotation_id
      AND (qi.commercial_role = 'authority_line'
        OR (qi.commercial_role = 'optional_add_on' AND qi.is_selected = true
            AND EXISTS (
                SELECT 1 FROM public.quotation_items parent
                WHERE parent.id = qi.parent_authority_line_id
                  AND parent.quotation_id = qi.quotation_id
                  AND parent.commercial_role = 'authority_line'
            )))
$$;
ALTER FUNCTION public.quotation_eligible_discount_base_h(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.quotation_eligible_discount_base_h(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quotation_eligible_discount_base_h(uuid) TO service_role;
COMMENT ON FUNCTION public.quotation_eligible_discount_base_h(uuid) IS
    'R01 eligible pre-VAT halala base: Authority Line roots plus selected Optional Add-ons; excludes Included Components and unselected add-ons.';

CREATE OR REPLACE FUNCTION public.quotation_discount_terms_consistent(p_quotation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_quote public.quotations%ROWTYPE; v_expected numeric(12,2);
BEGIN
    SELECT q.* INTO v_quote FROM public.quotations q WHERE q.id = p_quotation_id;
    IF NOT FOUND THEN RETURN false; END IF;
    IF v_quote.discount_type = 'fixed_sar' THEN
        RETURN v_quote.discount_percentage_bps IS NULL AND COALESCE(v_quote.discount, 0) >= 0;
    END IF;
    IF v_quote.discount_type <> 'percentage' OR v_quote.discount_percentage_bps IS NULL
        OR v_quote.discount_percentage_bps < 0 OR v_quote.discount_percentage_bps > 10000 THEN
        RETURN false;
    END IF;
    v_expected := public.resolve_quotation_discount(
        v_quote.discount_type, v_quote.discount_percentage_bps, NULL,
        public.quotation_eligible_discount_base_h(p_quotation_id));
    RETURN v_quote.discount IS NOT DISTINCT FROM v_expected;
END;
$$;
ALTER FUNCTION public.quotation_discount_terms_consistent(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.quotation_discount_terms_consistent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quotation_discount_terms_consistent(uuid) TO service_role;
COMMENT ON FUNCTION public.quotation_discount_terms_consistent(uuid) IS
    'R01 fail-closed check that persisted percentage metadata and current eligible commercial lines resolve to the stored header SAR amount.';

CREATE OR REPLACE FUNCTION public.create_flexible_quotation_with_items(
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
    v_discount_type text;
    v_discount_percentage_bps smallint;
    v_discount_percentage_input numeric;
    v_eligible_base_h numeric(30,0);
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
    v_discount_type := COALESCE(NULLIF(btrim(p_quotation ->> 'discount_type'), ''), 'fixed_sar');
    v_discount_percentage_input := NULLIF(btrim(COALESCE(p_quotation ->> 'discount_percentage_bps', '')), '')::numeric;
    IF v_discount_percentage_input IS NOT NULL
        AND (v_discount_percentage_input <> trunc(v_discount_percentage_input)
            OR v_discount_percentage_input < 0 OR v_discount_percentage_input > 10000) THEN
        error_code := 'invalid_input'; RETURN NEXT; RETURN;
    END IF;
    v_discount_percentage_bps := v_discount_percentage_input::smallint;
    v_discount := CASE WHEN v_discount_type = 'percentage' THEN 0
        ELSE COALESCE(NULLIF(btrim(COALESCE(p_quotation ->> 'discount', '')), '')::numeric(12,2), 0) END;
    IF v_discount_type NOT IN ('fixed_sar', 'percentage')
        OR (v_discount_type = 'fixed_sar' AND v_discount_percentage_bps IS NOT NULL)
        OR (v_discount_type = 'percentage'
            AND (v_discount_percentage_bps IS NULL OR v_discount_percentage_bps < 0 OR v_discount_percentage_bps > 10000))
    THEN
        error_code := 'invalid_input'; RETURN NEXT; RETURN;
    END IF;
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

    SELECT COALESCE(sum(round(l.qty * l.unit_price, 2) * 100), 0)::numeric(30,0)
    INTO v_eligible_base_h
    FROM pg_temp.w7p0_flexible_initial_lines l
    WHERE l.commercial_role = 'authority_line'
       OR (l.commercial_role = 'optional_add_on' AND l.is_selected = true);
    v_discount := public.resolve_quotation_discount(
        v_discount_type, v_discount_percentage_bps, v_discount, v_eligible_base_h);

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
    IF v_discount_type = 'percentage' THEN
        v_canonical_payload := jsonb_build_object(
            'service_id', v_service_id,
            'event', v_event,
            'date', v_date,
            'valid_until', v_valid_until,
            'discount_type', v_discount_type,
            'discount_percentage_bps', v_discount_percentage_bps,
            'discount', NULL,
            'items', v_canonical_payload -> 'items'
        );
    END IF;

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

    IF v_discount_type = 'percentage' THEN
        INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
        VALUES ('update', 'quotation', v_created.quotation_id, p_user_id,
            jsonb_build_object('event_type', 'quotation_discount_terms_created',
                'quotation_id', v_created.quotation_id, 'discount_type', v_discount_type,
                'discount_percentage_bps', v_discount_percentage_bps,
                'resolved_discount_amount', v_discount, 'transaction_timestamp', v_now), v_now);
    END IF;

    UPDATE public.quotations q
    SET mutation_payload = v_canonical_payload,
        discount = v_discount,
        discount_type = v_discount_type,
        discount_percentage_bps = v_discount_percentage_bps,
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

CREATE OR REPLACE FUNCTION public.update_flexible_quotation_draft(
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
    v_discount_type text;
    v_discount_percentage_bps smallint;
    v_discount_percentage_input numeric;
    v_eligible_base_h numeric(30,0);
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
    v_discount_type := COALESCE(NULLIF(btrim(p_quotation ->> 'discount_type'), ''), COALESCE(v_draft.discount_type, 'fixed_sar'));
    v_discount_percentage_input := CASE WHEN p_quotation ? 'discount_percentage_bps'
        THEN NULLIF(btrim(COALESCE(p_quotation ->> 'discount_percentage_bps', '')), '')::numeric
        ELSE v_draft.discount_percentage_bps::numeric END;
    IF v_discount_percentage_input IS NOT NULL
        AND (v_discount_percentage_input <> trunc(v_discount_percentage_input)
            OR v_discount_percentage_input < 0 OR v_discount_percentage_input > 10000) THEN
        error_code := 'invalid_input'; RETURN NEXT; RETURN;
    END IF;
    v_discount_percentage_bps := v_discount_percentage_input::smallint;
    v_discount := CASE WHEN v_discount_type = 'percentage' THEN 0
        ELSE COALESCE(NULLIF(btrim(COALESCE(p_quotation ->> 'discount', '')), '')::numeric(12,2), 0) END;
    v_vat_rate := COALESCE(v_draft.vat_rate, 0);
    IF v_discount_type NOT IN ('fixed_sar', 'percentage')
        OR (v_discount_type = 'fixed_sar' AND v_discount_percentage_bps IS NOT NULL)
        OR (v_discount_type = 'percentage'
            AND (v_discount_percentage_bps IS NULL OR v_discount_percentage_bps < 0 OR v_discount_percentage_bps > 10000))
    THEN error_code := 'invalid_input'; RETURN NEXT; RETURN; END IF;

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

    v_eligible_base_h := public.quotation_eligible_discount_base_h(v_draft.id);
    v_discount := public.resolve_quotation_discount(
        v_discount_type, v_discount_percentage_bps, v_discount, v_eligible_base_h);

    IF v_authority_count < 1 OR v_discount > v_subtotal THEN
        RAISE EXCEPTION USING MESSAGE = 'discount_exceeds_subtotal';
    END IF;

    UPDATE public.quotations q
    SET discount = v_discount, discount_type = v_discount_type, discount_percentage_bps = v_discount_percentage_bps,
        event = v_event, date = v_date, valid_until = v_valid_until,
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
    SET subtotal = v_subtotal, discount = v_discount, discount_type = v_discount_type,
        discount_percentage_bps = v_discount_percentage_bps, vat_rate = v_vat_rate,
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
            'previous_discount_type', v_draft.discount_type,
            'previous_discount_percentage_bps', v_draft.discount_percentage_bps,
            'previous_discount_amount', v_draft.discount,
            'discount_type', v_discount_type,
            'discount_percentage_bps', v_discount_percentage_bps,
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

    IF NOT public.quotation_discount_terms_consistent(v_source.id) THEN
        error_code := 'quotation_revision_source_state_invalid'; RETURN NEXT; RETURN;
    END IF;

    v_new_id := extensions.gen_random_uuid();
    v_new_number := public.generate_document_number('quotation');
    INSERT INTO public.quotations (
        id, quotation_number, service_id, customer_id, event, date, valid_until,
        subtotal, discount, discount_type, discount_percentage_bps, vat_rate, vat_amount, grand_total, status,
        mutation_key, mutation_payload, created_by, updated_by, snapshot_seller,
        snapshot_buyer, quotation_family_id, revision_of_quotation_id,
        revision_number, revision_reason
    ) VALUES (
        v_new_id, v_new_number, v_source.service_id, v_source.customer_id,
        v_source.event, v_source.date, v_source.valid_until, v_source.subtotal,
        v_source.discount, v_source.discount_type, v_source.discount_percentage_bps, v_source.vat_rate, v_source.vat_amount, v_source.grand_total,
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
            'source_status', v_source.status, 'customer_facing_numbering', 'unchanged_format',
            'discount_type', v_source.discount_type,
            'discount_percentage_bps', v_source.discount_percentage_bps,
            'resolved_discount_amount', v_source.discount),
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

CREATE OR REPLACE FUNCTION public.create_approved_commercial_amendment(
    p_source_quotation_id uuid,
    p_amendment_reason text,
    p_mutation_key text,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    source_quotation_id uuid,
    successor_quotation_id uuid,
    quotation_number text,
    quotation_family_id uuid,
    revision_number integer,
    service_id uuid,
    created boolean,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_source public.quotations%ROWTYPE;
    v_existing public.quotations%ROWTYPE;
    v_scope public.approved_billing_scopes%ROWTYPE;
    v_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_family_revision integer;
    v_item_count bigint;
    v_scope_count bigint;
    v_scope_item_count bigint;
    v_expected_subtotal numeric;
    v_expected_vat numeric;
    v_expected_grand numeric;
    v_expected_discount numeric;
    v_reason text;
    v_key text;
    v_payload jsonb;
    v_new_id uuid;
    v_new_number text;
    v_now timestamptz;
    v_error_message text;
BEGIN
    error_code := NULL;
    source_quotation_id := p_source_quotation_id;
    successor_quotation_id := NULL;
    quotation_number := NULL;
    quotation_family_id := NULL;
    revision_number := NULL;
    service_id := NULL;
    created := false;
    idempotent_replay := false;

    v_reason := NULLIF(btrim(COALESCE(p_amendment_reason, '')), '');
    v_key := NULLIF(btrim(COALESCE(p_mutation_key, '')), '');
    IF p_source_quotation_id IS NULL OR v_reason IS NULL OR char_length(v_reason) > 500
        OR v_key IS NULL OR char_length(v_key) > 200
        OR p_actor_id IS NULL OR btrim(p_actor_id) = '' OR char_length(p_actor_id) > 200
        OR p_actor_role IS NULL OR btrim(p_actor_role) = '' OR char_length(p_actor_role) > 100
    THEN
        error_code := 'invalid_input'; RETURN NEXT; RETURN;
    END IF;

    SELECT q.service_id INTO v_service_id
    FROM public.quotations q WHERE q.id = p_source_quotation_id;
    IF NOT FOUND THEN
        error_code := 'quotation_not_found'; RETURN NEXT; RETURN;
    END IF;

    SELECT s.status, s.deleted_at INTO v_service_status, v_service_deleted_at
    FROM public.services s WHERE s.id = v_service_id FOR UPDATE;
    service_id := v_service_id;
    IF NOT FOUND OR v_service_deleted_at IS NOT NULL OR v_service_status IN ('Completed', 'Cancelled') THEN
        error_code := 'quotation_service_lifecycle_ineligible'; RETURN NEXT; RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'operation', 'approved_commercial_amendment_creation',
        'source_quotation_id', p_source_quotation_id,
        'amendment_reason', v_reason,
        'actor_id', btrim(p_actor_id),
        'actor_role', btrim(p_actor_role)
    );

    SELECT q.* INTO v_existing
    FROM public.quotations q
    WHERE q.mutation_key = v_key
    FOR UPDATE;
    IF FOUND THEN
        IF v_existing.mutation_payload IS NOT DISTINCT FROM v_payload
            AND v_existing.revision_of_quotation_id = p_source_quotation_id
        THEN
            source_quotation_id := p_source_quotation_id;
            successor_quotation_id := v_existing.id;
            quotation_number := v_existing.quotation_number;
            quotation_family_id := v_existing.quotation_family_id;
            revision_number := v_existing.revision_number;
            service_id := v_existing.service_id;
            created := true;
            idempotent_replay := true;
            RETURN NEXT; RETURN;
        END IF;
        error_code := 'mutation_key_conflict'; RETURN NEXT; RETURN;
    END IF;

    PERFORM q.id
    FROM public.quotations q
    WHERE q.quotation_family_id = (SELECT q2.quotation_family_id FROM public.quotations q2 WHERE q2.id = p_source_quotation_id)
    ORDER BY q.id FOR UPDATE;

    SELECT q.* INTO v_source
    FROM public.quotations q
    WHERE q.id = p_source_quotation_id AND q.service_id = v_service_id
    FOR UPDATE;
    IF NOT FOUND OR COALESCE(v_source.is_deleted, false) OR v_source.status <> 'approved'
        OR v_source.superseded_at IS NOT NULL
    THEN
        error_code := 'quotation_not_current_approved'; RETURN NEXT; RETURN;
    END IF;

    quotation_family_id := v_source.quotation_family_id;
    revision_number := v_source.revision_number + 1;
    IF EXISTS (
        SELECT 1 FROM public.quotations q
        WHERE q.revision_of_quotation_id = v_source.id
    ) THEN
        error_code := 'quotation_amendment_successor_exists'; RETURN NEXT; RETURN;
    END IF;

    SELECT count(*)::bigint,
           COALESCE(sum(qi.total), 0),
           COALESCE(sum(qi.vat), 0),
           COALESCE(sum(qi.total - qi.discount_allocated + qi.vat), 0),
           COALESCE(sum(qi.discount_allocated), 0)
    INTO v_item_count, v_expected_subtotal, v_expected_vat,
         v_expected_grand, v_expected_discount
    FROM public.quotation_items qi WHERE qi.quotation_id = v_source.id;
    IF v_item_count = 0
        OR v_source.subtotal IS DISTINCT FROM v_expected_subtotal
        OR v_source.vat_amount IS DISTINCT FROM v_expected_vat
        OR v_source.grand_total IS DISTINCT FROM v_expected_grand
        OR COALESCE(v_source.discount, 0) IS DISTINCT FROM v_expected_discount
    THEN
        error_code := 'quotation_financial_total_mismatch'; RETURN NEXT; RETURN;
    END IF;

    SELECT count(*)::bigint INTO v_scope_count
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id AND s.status = 'approved'
      AND s.superseded_at IS NULL AND s.voided_at IS NULL;
    IF v_scope_count <> 1 THEN
        error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN;
    END IF;

    SELECT s.* INTO v_scope
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id AND s.status = 'approved'
      AND s.superseded_at IS NULL AND s.voided_at IS NULL
    FOR UPDATE;
    SELECT count(*)::bigint INTO v_scope_item_count
    FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id = v_scope.id;
    IF v_scope.source_quotation_id IS DISTINCT FROM v_source.id
        OR v_scope_item_count <> v_item_count
        OR v_scope.accepted_subtotal IS DISTINCT FROM v_source.subtotal
        OR v_scope.accepted_vat_amount IS DISTINCT FROM v_source.vat_amount
        OR v_scope.accepted_grand_total IS DISTINCT FROM v_source.grand_total
        OR EXISTS (
            SELECT 1
            FROM public.quotation_items qi
            LEFT JOIN public.approved_billing_scope_items si
              ON si.approved_billing_scope_id = v_scope.id
             AND si.source_quotation_item_id = qi.id
            WHERE qi.quotation_id = v_source.id
              AND (
                  si.id IS NULL OR si.source_quotation_id IS DISTINCT FROM v_source.id
                  OR si.source_discount_allocated IS DISTINCT FROM qi.discount_allocated
                  OR si.source_subtotal IS DISTINCT FROM qi.total
                  OR si.source_vat_amount IS DISTINCT FROM qi.vat
                  OR si.source_grand_total IS DISTINCT FROM round(qi.total - qi.discount_allocated + qi.vat, 2)
                  OR si.accepted_grand_total IS DISTINCT FROM round(qi.total - qi.discount_allocated + qi.vat, 2)
              )
        )
    THEN
        error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN;
    END IF;

    IF NOT public.quotation_discount_terms_consistent(v_source.id) THEN
        error_code := 'quotation_financial_total_mismatch'; RETURN NEXT; RETURN;
    END IF;

    v_new_id := gen_random_uuid();
    v_new_number := public.generate_document_number('quotation');
    v_now := transaction_timestamp();
    PERFORM set_config('g7.w7p0a_revision_source_id', v_source.id::text, true);
    INSERT INTO public.quotations (
        id, quotation_number, service_id, customer_id, event, date, valid_until,
        subtotal, discount, discount_type, discount_percentage_bps, vat_rate, vat_amount, grand_total, status,
        mutation_key, mutation_payload, created_by, updated_by, snapshot_seller,
        snapshot_buyer, quotation_family_id, revision_of_quotation_id,
        revision_number, revision_reason
    ) VALUES (
        v_new_id, v_new_number, v_source.service_id, v_source.customer_id,
        v_source.event, v_source.date, v_source.valid_until, v_source.subtotal,
        v_source.discount, v_source.discount_type, v_source.discount_percentage_bps, v_source.vat_rate, v_source.vat_amount, v_source.grand_total,
        'draft', v_key, v_payload, p_actor_id, p_actor_id,
        v_source.snapshot_seller, v_source.snapshot_buyer, v_source.quotation_family_id,
        v_source.id, v_source.revision_number + 1, v_reason
    );

    PERFORM set_config('g7.w2c_allocator_skip', v_new_id::text, true);
    WITH item_map AS MATERIALIZED (
        SELECT qi.id AS source_item_id, gen_random_uuid() AS successor_item_id
        FROM public.quotation_items qi WHERE qi.quotation_id = v_source.id
    )
    INSERT INTO public.quotation_items (
        id, quotation_id, description, details, category, qty, unit_price, vat, total,
        discount_allocated, commercial_role, parent_authority_line_id,
        is_selected, unit, description_ar
    )
    SELECT m.successor_item_id, v_new_id, qi.description, qi.details, qi.category,
        qi.qty, qi.unit_price, qi.vat, qi.total, qi.discount_allocated,
        qi.commercial_role, pm.successor_item_id, qi.is_selected, qi.unit, qi.description_ar
    FROM item_map m
    JOIN public.quotation_items qi ON qi.id = m.source_item_id
    LEFT JOIN item_map pm ON pm.source_item_id = qi.parent_authority_line_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('create', 'quotation', v_new_id, p_actor_id,
        jsonb_build_object('event_type', 'approved_commercial_amendment_created',
            'actor_id', p_actor_id, 'actor_role', p_actor_role,
            'source_quotation_id', v_source.id, 'successor_quotation_id', v_new_id,
            'quotation_family_id', v_source.quotation_family_id,
            'revision_number', v_source.revision_number + 1,
            'amendment_reason', v_reason, 'mutation_key', v_key,
            'discount_type', v_source.discount_type,
            'discount_percentage_bps', v_source.discount_percentage_bps,
            'resolved_discount_amount', v_source.discount), v_now);

    successor_quotation_id := v_new_id;
    quotation_number := v_new_number;
    created := true;
    RETURN NEXT;
EXCEPTION
    WHEN unique_violation THEN
        error_code := 'mutation_key_conflict'; created := false; RETURN NEXT;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE v_error_message
            WHEN 'quotation_revision_predecessor_invalid' THEN 'quotation_revision_predecessor_invalid'
            WHEN 'quotation_revision_status_invalid' THEN 'quotation_revision_status_invalid'
            WHEN 'w2c_discount_invalid_hierarchy' THEN 'quotation_financial_total_mismatch'
            ELSE 'quotation_amendment_creation_failed'
        END;
        created := false; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_approved_commercial_amendment_draft(
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
    v_discount_type text;
    v_discount_percentage_bps smallint;
    v_discount_percentage_input numeric;
    v_eligible_base_h numeric(30,0);
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
    v_discount_type := COALESCE(NULLIF(btrim(p_quotation ->> 'discount_type'), ''), COALESCE(v_draft.discount_type, 'fixed_sar'));
    v_discount_percentage_input := CASE WHEN p_quotation ? 'discount_percentage_bps'
        THEN NULLIF(btrim(COALESCE(p_quotation ->> 'discount_percentage_bps', '')), '')::numeric
        ELSE v_draft.discount_percentage_bps::numeric END;
    IF v_discount_percentage_input IS NOT NULL
        AND (v_discount_percentage_input <> trunc(v_discount_percentage_input)
            OR v_discount_percentage_input < 0 OR v_discount_percentage_input > 10000) THEN
        error_code := 'invalid_input'; RETURN NEXT; RETURN;
    END IF;
    v_discount_percentage_bps := v_discount_percentage_input::smallint;
    v_discount := CASE WHEN v_discount_type = 'percentage' THEN 0
        ELSE COALESCE(NULLIF(btrim(COALESCE(p_quotation ->> 'discount', '')), '')::numeric(12,2), 0) END;
    v_vat_rate := COALESCE(v_draft.vat_rate, 0);
    IF v_discount_type NOT IN ('fixed_sar', 'percentage')
        OR (v_discount_type = 'fixed_sar' AND v_discount_percentage_bps IS NOT NULL)
        OR (v_discount_type = 'percentage'
            AND (v_discount_percentage_bps IS NULL OR v_discount_percentage_bps < 0 OR v_discount_percentage_bps > 10000))
    THEN error_code := 'invalid_input'; RETURN NEXT; RETURN; END IF;

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

    v_eligible_base_h := public.quotation_eligible_discount_base_h(v_draft.id);
    v_discount := public.resolve_quotation_discount(
        v_discount_type, v_discount_percentage_bps, v_discount, v_eligible_base_h);

    IF v_authority_count < 1 OR v_discount > v_subtotal THEN
        RAISE EXCEPTION USING MESSAGE = 'discount_exceeds_subtotal';
    END IF;

    -- Set the discount before calling the canonical allocator; the final totals
    -- and VAT are written only after its fixed-SAR allocation succeeds.
    UPDATE public.quotations q
    SET discount = v_discount,
        discount_type = v_discount_type,
        discount_percentage_bps = v_discount_percentage_bps,
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
        discount_type = v_discount_type,
        discount_percentage_bps = v_discount_percentage_bps,
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
            'previous_discount_type', v_draft.discount_type,
            'previous_discount_percentage_bps', v_draft.discount_percentage_bps,
            'previous_discount_amount', v_draft.discount,
            'discount_type', v_discount_type,
            'discount_percentage_bps', v_discount_percentage_bps,
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

    IF NOT public.quotation_discount_terms_consistent(v_quotation.id) THEN
        error_code := 'quotation_financial_total_mismatch'; RETURN NEXT; RETURN;
    END IF;

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

CREATE OR REPLACE FUNCTION public.approve_approved_commercial_amendment(
    p_source_quotation_id uuid,
    p_successor_quotation_id uuid,
    p_mutation_key text,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    source_quotation_id uuid,
    successor_quotation_id uuid,
    source_scope_id uuid,
    successor_scope_id uuid,
    service_id uuid,
    source_scope_version integer,
    successor_scope_version integer,
    previous_ceiling numeric,
    successor_ceiling numeric,
    lifetime_invoice_total numeric,
    approved_at timestamptz,
    quotation_status text,
    abs_status text,
    quotation_approved boolean,
    abs_activated boolean,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_source public.quotations%ROWTYPE;
    v_successor public.quotations%ROWTYPE;
    v_existing public.quotations%ROWTYPE;
    v_source_scope public.approved_billing_scopes%ROWTYPE;
    v_successor_scope public.approved_billing_scopes%ROWTYPE;
    v_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_scope_count bigint;
    v_item_count bigint;
    v_successor_item_count bigint;
    v_expected_subtotal numeric;
    v_expected_vat numeric;
    v_expected_grand numeric;
    v_expected_discount numeric;
    v_invoice_count bigint;
    v_lifetime_invoice_total numeric;
    v_scope_version integer;
    v_payload jsonb;
    v_key text;
    v_now timestamptz;
    v_noop_header boolean;
    v_noop_items boolean;
    v_error_message text;
BEGIN
    error_code := NULL;
    source_quotation_id := p_source_quotation_id;
    successor_quotation_id := p_successor_quotation_id;
    source_scope_id := NULL;
    successor_scope_id := NULL;
    service_id := NULL;
    source_scope_version := NULL;
    successor_scope_version := NULL;
    previous_ceiling := NULL;
    successor_ceiling := NULL;
    lifetime_invoice_total := NULL;
    approved_at := NULL;
    quotation_status := NULL;
    abs_status := NULL;
    quotation_approved := false;
    abs_activated := false;
    idempotent_replay := false;

    v_key := NULLIF(btrim(COALESCE(p_mutation_key, '')), '');
    IF p_source_quotation_id IS NULL OR p_successor_quotation_id IS NULL
        OR p_source_quotation_id = p_successor_quotation_id
        OR v_key IS NULL OR char_length(v_key) > 200
        OR p_actor_id IS NULL OR btrim(p_actor_id) = '' OR char_length(p_actor_id) > 200
        OR p_actor_role IS NULL OR btrim(p_actor_role) = '' OR char_length(p_actor_role) > 100
    THEN
        error_code := 'invalid_input'; RETURN NEXT; RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'operation', 'approved_commercial_amendment_approval',
        'source_quotation_id', p_source_quotation_id,
        'successor_quotation_id', p_successor_quotation_id,
        'actor_id', btrim(p_actor_id), 'actor_role', btrim(p_actor_role)
    );

    SELECT q.* INTO v_existing
    FROM public.quotations q WHERE q.amendment_approval_key = v_key FOR UPDATE;
    IF FOUND THEN
        IF v_existing.amendment_approval_payload IS DISTINCT FROM v_payload THEN
            error_code := 'mutation_key_conflict'; RETURN NEXT; RETURN;
        END IF;
        v_service_id := v_existing.service_id;
        service_id := v_service_id;
        SELECT q.* INTO v_successor FROM public.quotations q WHERE q.id = p_successor_quotation_id;
        SELECT q.* INTO v_source FROM public.quotations q WHERE q.id = p_source_quotation_id;
        IF v_existing.id = p_successor_quotation_id
            AND v_successor.status = 'approved'
            AND v_source.superseded_by_quotation_id = v_successor.id
        THEN
            SELECT s.* INTO v_successor_scope
            FROM public.approved_billing_scopes s
            WHERE s.service_id = v_service_id AND s.source_quotation_id = v_successor.id
              AND s.status = 'approved' AND s.superseded_at IS NULL AND s.voided_at IS NULL;
            IF FOUND THEN
                SELECT s.* INTO v_source_scope FROM public.approved_billing_scopes s WHERE s.id = v_successor_scope.supersedes_scope_id;
                source_scope_id := v_source_scope.id; successor_scope_id := v_successor_scope.id;
                source_scope_version := v_source_scope.scope_version; successor_scope_version := v_successor_scope.scope_version;
                previous_ceiling := v_source_scope.accepted_grand_total; successor_ceiling := v_successor_scope.accepted_grand_total;
                SELECT * INTO v_invoice_count, v_lifetime_invoice_total FROM public._abs_get_service_invoice_exposure(v_service_id);
                lifetime_invoice_total := v_lifetime_invoice_total; approved_at := v_successor_scope.approved_at;
                quotation_status := v_successor.status; abs_status := v_successor_scope.status;
                quotation_approved := true; abs_activated := true; idempotent_replay := true;
                RETURN NEXT; RETURN;
            END IF;
        END IF;
        error_code := 'quotation_amendment_approval_incomplete'; RETURN NEXT; RETURN;
    END IF;

    SELECT q.service_id INTO v_service_id FROM public.quotations q WHERE q.id = p_source_quotation_id;
    IF NOT FOUND THEN error_code := 'quotation_not_found'; RETURN NEXT; RETURN; END IF;
    SELECT s.status, s.deleted_at INTO v_service_status, v_service_deleted_at
    FROM public.services s WHERE s.id = v_service_id FOR UPDATE;
    service_id := v_service_id;
    IF NOT FOUND OR v_service_deleted_at IS NOT NULL OR v_service_status IN ('Completed', 'Cancelled') THEN
        error_code := 'quotation_service_lifecycle_ineligible'; RETURN NEXT; RETURN;
    END IF;

    PERFORM q.id FROM public.quotations q
    WHERE q.id IN (p_source_quotation_id, p_successor_quotation_id)
    ORDER BY q.id FOR UPDATE;
    SELECT q.* INTO v_source FROM public.quotations q WHERE q.id = p_source_quotation_id AND q.service_id = v_service_id;
    SELECT q.* INTO v_successor FROM public.quotations q WHERE q.id = p_successor_quotation_id AND q.service_id = v_service_id;
    IF NOT FOUND OR v_source.id IS NULL OR v_successor.id IS NULL THEN
        error_code := 'quotation_amendment_approval_conflict'; RETURN NEXT; RETURN;
    END IF;

    PERFORM q.id FROM public.quotations q
    WHERE q.quotation_family_id = v_source.quotation_family_id
    ORDER BY q.id FOR UPDATE;
    PERFORM s.id FROM public.approved_billing_scopes s WHERE s.service_id = v_service_id ORDER BY s.id FOR UPDATE;

    IF COALESCE(v_source.is_deleted, false) OR v_source.status <> 'approved' OR v_source.superseded_at IS NOT NULL
        OR v_successor.is_deleted OR v_successor.revision_of_quotation_id IS DISTINCT FROM v_source.id
        OR v_successor.quotation_family_id IS DISTINCT FROM v_source.quotation_family_id
        OR v_successor.status NOT IN ('draft', 'sent')
    THEN
        error_code := 'quotation_amendment_approval_conflict'; RETURN NEXT; RETURN;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.quotations q
        WHERE q.revision_of_quotation_id = v_source.id AND q.id <> v_successor.id
    ) THEN
        error_code := 'quotation_amendment_successor_conflict'; RETURN NEXT; RETURN;
    END IF;

    SELECT count(*)::bigint,
           COALESCE(sum(qi.total), 0), COALESCE(sum(qi.vat), 0),
           COALESCE(sum(qi.total - qi.discount_allocated + qi.vat), 0),
           COALESCE(sum(qi.discount_allocated), 0)
    INTO v_successor_item_count, v_expected_subtotal, v_expected_vat,
         v_expected_grand, v_expected_discount
    FROM public.quotation_items qi WHERE qi.quotation_id = v_successor.id;
    IF v_successor_item_count = 0
        OR v_successor.subtotal IS DISTINCT FROM v_expected_subtotal
        OR v_successor.vat_amount IS DISTINCT FROM v_expected_vat
        OR v_successor.grand_total IS DISTINCT FROM v_expected_grand
        OR COALESCE(v_successor.discount, 0) IS DISTINCT FROM v_expected_discount
    THEN
        error_code := 'quotation_financial_total_mismatch'; RETURN NEXT; RETURN;
    END IF;
    IF COALESCE(v_successor.discount, 0) > 0
        AND upper(COALESCE(NULLIF(btrim(v_successor.snapshot_seller ->> 'currency'), ''), 'SAR')) <> 'SAR'
    THEN
        error_code := 'w2c_discount_currency_unsupported'; RETURN NEXT; RETURN;
    END IF;

    IF NOT public.quotation_discount_terms_consistent(v_source.id)
        OR NOT public.quotation_discount_terms_consistent(v_successor.id) THEN
        error_code := 'quotation_financial_total_mismatch'; RETURN NEXT; RETURN;
    END IF;

    v_noop_header := v_source.event IS NOT DISTINCT FROM v_successor.event
        AND v_source.date IS NOT DISTINCT FROM v_successor.date
        AND v_source.valid_until IS NOT DISTINCT FROM v_successor.valid_until
        AND v_source.subtotal IS NOT DISTINCT FROM v_successor.subtotal
        AND v_source.discount IS NOT DISTINCT FROM v_successor.discount
        AND v_source.discount_type IS NOT DISTINCT FROM v_successor.discount_type
        AND v_source.discount_percentage_bps IS NOT DISTINCT FROM v_successor.discount_percentage_bps
        AND v_source.vat_rate IS NOT DISTINCT FROM v_successor.vat_rate
        AND v_source.vat_amount IS NOT DISTINCT FROM v_successor.vat_amount
        AND v_source.grand_total IS NOT DISTINCT FROM v_successor.grand_total
        AND v_source.snapshot_seller IS NOT DISTINCT FROM v_successor.snapshot_seller
        AND v_source.snapshot_buyer IS NOT DISTINCT FROM v_successor.snapshot_buyer;
    WITH src AS MATERIALIZED (
        SELECT qi.*, row_number() OVER (ORDER BY qi.created_at, qi.id) AS rn
        FROM public.quotation_items qi WHERE qi.quotation_id = v_source.id
    ), suc AS MATERIALIZED (
        SELECT qi.*, row_number() OVER (ORDER BY qi.created_at, qi.id) AS rn
        FROM public.quotation_items qi WHERE qi.quotation_id = v_successor.id
    )
    SELECT (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'rn', s.rn, 'description', s.description, 'details', s.details,
            'category', s.category, 'qty', s.qty, 'unit_price', s.unit_price,
            'vat', s.vat, 'total', s.total, 'discount_allocated', s.discount_allocated,
            'commercial_role', s.commercial_role, 'parent_rn',
                (SELECT p.rn FROM src p WHERE p.id = s.parent_authority_line_id),
            'is_selected', s.is_selected, 'unit', s.unit, 'description_ar', s.description_ar
            ) ORDER BY s.rn), '[]'::jsonb) FROM src s
    ) IS NOT DISTINCT FROM (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'rn', s.rn, 'description', s.description, 'details', s.details,
            'category', s.category, 'qty', s.qty, 'unit_price', s.unit_price,
            'vat', s.vat, 'total', s.total, 'discount_allocated', s.discount_allocated,
            'commercial_role', s.commercial_role, 'parent_rn',
                (SELECT p.rn FROM suc p WHERE p.id = s.parent_authority_line_id),
            'is_selected', s.is_selected, 'unit', s.unit, 'description_ar', s.description_ar
            ) ORDER BY s.rn), '[]'::jsonb) FROM suc s
    )
    INTO v_noop_items;
    IF v_noop_header AND v_noop_items THEN
        error_code := 'quotation_amendment_noop'; RETURN NEXT; RETURN;
    END IF;

    SELECT count(*)::bigint INTO v_scope_count
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id AND s.status = 'approved'
      AND s.superseded_at IS NULL AND s.voided_at IS NULL;
    IF v_scope_count <> 1 THEN error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN; END IF;
    SELECT s.* INTO v_source_scope
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id AND s.status = 'approved'
      AND s.superseded_at IS NULL AND s.voided_at IS NULL;
    IF v_source_scope.source_quotation_id IS DISTINCT FROM v_source.id THEN
        error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN;
    END IF;
    source_scope_id := v_source_scope.id;
    source_scope_version := v_source_scope.scope_version;
    previous_ceiling := v_source_scope.accepted_grand_total;
    SELECT count(*)::bigint INTO v_item_count
    FROM public.quotation_items qi WHERE qi.quotation_id = v_source.id;
    IF v_source_scope.accepted_grand_total IS NULL THEN
        error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN;
    END IF;

    SELECT * INTO v_invoice_count, v_lifetime_invoice_total
    FROM public._abs_get_service_invoice_exposure(v_service_id);
    lifetime_invoice_total := v_lifetime_invoice_total;
    IF v_lifetime_invoice_total > v_successor.grand_total THEN
        error_code := 'scope_successor_ceiling_below_invoiced'; RETURN NEXT; RETURN;
    END IF;

    v_scope_version := (SELECT COALESCE(max(s.scope_version), 0) + 1 FROM public.approved_billing_scopes s WHERE s.service_id = v_service_id);
    v_now := transaction_timestamp();
    INSERT INTO public.approved_billing_scopes (
        service_id, source_quotation_id, scope_version, status,
        accepted_subtotal, accepted_vat_amount, accepted_grand_total,
        source_vat_rate, source_discount, source_currency,
        source_quotation_subtotal, source_quotation_vat_amount, source_quotation_grand_total,
        source_pricing_context, line_safety_status, change_summary_reason,
        supersedes_scope_id, created_by, updated_by, created_at, updated_at
    ) VALUES (
        v_service_id, v_successor.id, v_scope_version, 'draft',
        v_successor.subtotal, v_successor.vat_amount, v_successor.grand_total,
        v_successor.vat_rate, COALESCE(v_successor.discount, 0),
        COALESCE(NULLIF(btrim(v_successor.snapshot_seller ->> 'currency'), ''), 'SAR'),
        v_successor.subtotal, v_successor.vat_amount, v_successor.grand_total,
        jsonb_build_object('quotationNumber', v_successor.quotation_number,
            'event', v_successor.event, 'quotationDate', v_successor.date,
            'validUntil', v_successor.valid_until),
        'pending_review', v_successor.revision_reason, v_source_scope.id,
        p_actor_id, p_actor_id, v_now, v_now
    ) RETURNING id INTO successor_scope_id;

    INSERT INTO public.approved_billing_scope_items (
        approved_billing_scope_id, source_quotation_id, source_quotation_item_id,
        display_order, decision, source_description, source_details, source_category,
        source_qty, source_unit_price, source_subtotal, source_vat_amount,
        source_grand_total, source_discount_allocated,
        source_commercial_role, source_parent_authority_line_id, source_is_selected,
        source_unit, source_description_ar,
        accepted_qty, accepted_unit_price, accepted_subtotal, accepted_vat_amount,
        accepted_grand_total, reason_code, reason_note, created_at, updated_at
    )
    SELECT successor_scope_id, qi.quotation_id, qi.id,
        row_number() OVER (ORDER BY qi.created_at, qi.id) - 1,
        'accepted', qi.description, qi.details, qi.category, qi.qty, qi.unit_price,
        qi.total, qi.vat, round(qi.total - qi.discount_allocated + qi.vat, 2),
        qi.discount_allocated, qi.commercial_role, qi.parent_authority_line_id,
        qi.is_selected, qi.unit, qi.description_ar, qi.qty, qi.unit_price,
        qi.total, qi.vat,
        round(qi.total - qi.discount_allocated + qi.vat, 2), NULL, NULL, v_now, v_now
    FROM public.quotation_items qi WHERE qi.quotation_id = v_successor.id;

    UPDATE public.approved_billing_scopes s
    SET superseded_at = v_now, superseded_by_scope_id = successor_scope_id,
        updated_by = p_actor_id, updated_at = v_now
    WHERE s.id = v_source_scope.id AND s.status = 'approved'
      AND s.superseded_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid'; END IF;

    PERFORM set_config('g7.w7p0a_allow_quotation_supersession', v_source.id::text, true);
    UPDATE public.quotations q
    SET superseded_at = v_now, superseded_by_quotation_id = v_successor.id,
        updated_by = p_actor_id, updated_at = v_now
    WHERE q.id = v_source.id AND q.status = 'approved'
      AND q.superseded_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'approved_quotation_immutable'; END IF;

    UPDATE public.quotations q
    SET status = 'approved', amendment_approval_key = v_key,
        amendment_approval_payload = v_payload,
        updated_by = p_actor_id, updated_at = v_now
    WHERE q.id = v_successor.id AND q.status IN ('draft', 'sent')
      AND q.revision_of_quotation_id = v_source.id;
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'quotation_amendment_approval_conflict'; END IF;

    UPDATE public.approved_billing_scopes s
    SET status = 'approved', line_safety_status = 'safe',
        line_safety_reviewed_by = p_actor_id, line_safety_reviewed_at = v_now,
        approved_at = v_now, approved_by = p_actor_id,
        updated_by = p_actor_id, updated_at = v_now
    WHERE s.id = successor_scope_id AND s.status = 'draft';
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid'; END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('status_change', 'quotation', v_successor.id, p_actor_id,
        jsonb_build_object('event_type', 'approved_commercial_amendment_approved',
            'actor_id', p_actor_id, 'actor_role', p_actor_role,
            'source_quotation_id', v_source.id, 'successor_quotation_id', v_successor.id,
            'source_scope_id', v_source_scope.id, 'successor_scope_id', successor_scope_id,
            'mutation_key', v_key, 'reason', v_successor.revision_reason,
            'previous_discount_type', v_source.discount_type,
            'previous_discount_percentage_bps', v_source.discount_percentage_bps,
            'previous_discount_amount', v_source.discount,
            'discount_type', v_successor.discount_type,
            'discount_percentage_bps', v_successor.discount_percentage_bps,
            'resolved_discount_amount', v_successor.discount,
            'lifetime_invoice_total', v_lifetime_invoice_total,
            'previous_ceiling', v_source_scope.accepted_grand_total,
            'successor_ceiling', v_successor.grand_total,
            'approval_basis', 'customer_approval_confirmed_by_staff'), v_now);
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('status_change', 'approved_billing_scope', successor_scope_id, p_actor_id,
        jsonb_build_object('event_type', 'approved_billing_scope_superseded',
            'actor_id', p_actor_id, 'actor_role', p_actor_role,
            'source_scope_id', v_source_scope.id, 'successor_scope_id', successor_scope_id,
            'source_quotation_id', v_source.id, 'successor_quotation_id', v_successor.id,
            'mutation_key', v_key, 'lifetime_invoice_total', v_lifetime_invoice_total,
            'previous_ceiling', v_source_scope.accepted_grand_total,
            'successor_ceiling', v_successor.grand_total), v_now);

    source_scope_id := v_source_scope.id;
    source_scope_version := v_source_scope.scope_version;
    successor_scope_version := v_scope_version;
    previous_ceiling := v_source_scope.accepted_grand_total;
    successor_ceiling := v_successor.grand_total;
    approved_at := v_now; quotation_status := 'approved'; abs_status := 'approved';
    quotation_approved := true; abs_activated := true; idempotent_replay := false;
    RETURN NEXT;
EXCEPTION
    WHEN unique_violation THEN
        error_code := 'mutation_key_conflict'; quotation_approved := false; abs_activated := false; RETURN NEXT;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE v_error_message
            WHEN 'scope_successor_ceiling_below_invoiced' THEN 'scope_successor_ceiling_below_invoiced'
            WHEN 'quotation_amendment_noop' THEN 'quotation_amendment_noop'
            WHEN 'scope_successor_invalid' THEN 'quotation_amendment_approval_conflict'
            WHEN 'approved_quotation_immutable' THEN 'quotation_amendment_approval_conflict'
            WHEN 'w2c_discount_currency_unsupported' THEN 'w2c_discount_currency_unsupported'
            ELSE 'quotation_amendment_approval_failed'
        END;
        quotation_approved := false; abs_activated := false; RETURN NEXT;
END;
$$;
COMMENT ON FUNCTION public.create_flexible_quotation_with_items(jsonb, jsonb, text) IS
    'W7-P0 service-role-only quotation create boundary; fixed SAR remains supported and percentage terms resolve once before W2C allocation.';
COMMENT ON FUNCTION public.update_flexible_quotation_draft(uuid, jsonb, jsonb, timestamptz, text) IS
    'W7-P0 service-role-only Draft mutation; fixed SAR remains supported and percentage terms resolve from the proposed eligible hierarchy before W2C reconciliation.';
COMMENT ON FUNCTION public.update_approved_commercial_amendment_draft(uuid, jsonb, jsonb, timestamptz, text) IS
    'W7-P0B service-role-only Commercial Amendment Draft mutation; copies fixed or percentage terms and resolves percentage from eligible lines before W2C reconciliation.';

DO $$
DECLARE v_count integer;
BEGIN
    SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('create_flexible_quotation_with_items','update_flexible_quotation_draft',
          'create_quotation_revision','approve_quotation_and_activate_internal_abs',
          'create_approved_commercial_amendment','approve_approved_commercial_amendment',
          'update_approved_commercial_amendment_draft','reconcile_quotation_discount_allocations')
      AND pg_get_userbyid(p.proowner) = 'postgres'
      AND p.prosecdef
      AND p.proconfig = ARRAY['search_path=pg_catalog, public']::text[]
       AND p.proacl::text = '{postgres=X/postgres,service_role=X/postgres}'
       AND p.provolatile = 'v'
       AND p.proparallel = 'u'
       AND p.procost = 100
       AND p.prorows = CASE WHEN p.proname = 'reconcile_quotation_discount_allocations' THEN 0 ELSE 1000 END;
    IF v_count <> 8 THEN RAISE EXCEPTION 'r01 postflight: existing function security metadata or ACL changed'; END IF;
    IF has_function_privilege('anon', 'public.resolve_quotation_discount(text,smallint,numeric,numeric)', 'EXECUTE')
        OR has_function_privilege('authenticated', 'public.resolve_quotation_discount(text,smallint,numeric,numeric)', 'EXECUTE')
        OR has_function_privilege('anon', 'public.quotation_eligible_discount_base_h(uuid)', 'EXECUTE')
        OR has_function_privilege('authenticated', 'public.quotation_eligible_discount_base_h(uuid)', 'EXECUTE')
        OR has_function_privilege('anon', 'public.quotation_discount_terms_consistent(uuid)', 'EXECUTE')
        OR has_function_privilege('authenticated', 'public.quotation_discount_terms_consistent(uuid)', 'EXECUTE') THEN
        RAISE EXCEPTION 'r01 postflight: browser-role helper EXECUTE exposure widened';
    END IF;
END;
$$;

DO $$
DECLARE v_rejected boolean;
BEGIN
    IF public.resolve_quotation_discount('fixed_sar', NULL, 0, 0) <> 0.00
        OR public.resolve_quotation_discount('fixed_sar', NULL, 12.34, 0) <> 12.34 THEN
        RAISE EXCEPTION 'r01 fixed-mode self-check failed';
    END IF;
    IF public.resolve_quotation_discount('percentage', 0::smallint, NULL, 1000) <> 0.00
        OR public.resolve_quotation_discount('percentage', 500::smallint, NULL, 10000) <> 5.00
        OR public.resolve_quotation_discount('percentage', 750::smallint, NULL, 10000) <> 7.50
        OR public.resolve_quotation_discount('percentage', 1225::smallint, NULL, 1500000) <> 1837.50
        OR public.resolve_quotation_discount('percentage', 10000::smallint, NULL, 10000) <> 100.00
        OR public.resolve_quotation_discount('percentage', 4999::smallint, NULL, 1) <> 0.00
        OR public.resolve_quotation_discount('percentage', 5000::smallint, NULL, 1) <> 0.01
        OR public.resolve_quotation_discount('percentage', 5001::smallint, NULL, 1) <> 0.01 THEN
        RAISE EXCEPTION 'r01 arithmetic self-check failed';
    END IF;
    v_rejected := false;
    BEGIN
        PERFORM public.resolve_quotation_discount('percentage', 10001::smallint, NULL, 10000);
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'quotation_discount_terms_invalid' THEN v_rejected := true; ELSE RAISE; END IF;
    END;
    IF NOT v_rejected THEN RAISE EXCEPTION 'r01 failed to reject a rate above 100 percent'; END IF;
    v_rejected := false;
    BEGIN
        PERFORM public.resolve_quotation_discount('fixed_sar', 1::smallint, 1, 10000);
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'quotation_discount_terms_invalid' THEN v_rejected := true; ELSE RAISE; END IF;
    END;
    IF NOT v_rejected THEN RAISE EXCEPTION 'r01 failed to reject fixed mode with basis points'; END IF;
    v_rejected := false;
    BEGIN
        PERFORM public.resolve_quotation_discount('percentage', NULL, NULL, 10000);
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM = 'quotation_discount_terms_invalid' THEN v_rejected := true; ELSE RAISE; END IF;
    END;
    IF NOT v_rejected THEN RAISE EXCEPTION 'r01 failed to reject percentage mode without basis points'; END IF;
END;
$$;

COMMIT;