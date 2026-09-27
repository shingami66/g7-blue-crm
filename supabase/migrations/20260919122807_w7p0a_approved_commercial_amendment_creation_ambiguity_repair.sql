-- W7-P0A forward-only repair: qualify the family-lock subquery column.
-- The original migration was applied to DEV before this runtime ambiguity was
-- discovered; this replacement preserves its contract and changes no data.

BEGIN;

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

    v_new_id := gen_random_uuid();
    v_new_number := public.generate_document_number('quotation');
    v_now := transaction_timestamp();
    PERFORM set_config('g7.w7p0a_revision_source_id', v_source.id::text, true);
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
            'amendment_reason', v_reason, 'mutation_key', v_key), v_now);

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

COMMENT ON FUNCTION public.create_approved_commercial_amendment(uuid, text, text, text, text) IS
    'W7-P0A creates a full successor quotation snapshot from current approved authority with exact replay/conflict semantics.';

COMMIT;
