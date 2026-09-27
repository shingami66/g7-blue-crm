-- W7-P0A source recovery for DEV migration 20260919124742.
-- Preserve W2A metadata in successor ABS snapshots without rewriting history.
BEGIN;

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

    v_noop_header := v_source.event IS NOT DISTINCT FROM v_successor.event
        AND v_source.date IS NOT DISTINCT FROM v_successor.date
        AND v_source.valid_until IS NOT DISTINCT FROM v_successor.valid_until
        AND v_source.subtotal IS NOT DISTINCT FROM v_successor.subtotal
        AND v_source.discount IS NOT DISTINCT FROM v_successor.discount
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

REVOKE ALL ON FUNCTION public.approve_approved_commercial_amendment(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_approved_commercial_amendment(uuid, uuid, text, text, text) TO service_role;

COMMIT;
