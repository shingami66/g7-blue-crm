-- Atomic quotation approval and internal Approved Billing Scope activation.
-- This migration is intentionally unapplied by the application task.

BEGIN;

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
        error_code := 'quotation_approval_actor_invalid';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Read the Service key without locking, then take the required Service-first lock.
    SELECT q.service_id
    INTO v_service_id
    FROM public.quotations q
    WHERE q.id = p_quotation_id
      AND COALESCE(q.is_deleted, false) = false;

    IF NOT FOUND THEN
        error_code := 'quotation_not_found';
        quotation_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.status, s.deleted_at
    INTO v_service_status, v_service_deleted_at
    FROM public.services s
    WHERE s.id = v_service_id
    FOR UPDATE;

    service_id := v_service_id;
    IF NOT FOUND OR v_service_deleted_at IS NOT NULL
        OR v_service_status IN ('Completed', 'Cancelled')
    THEN
        error_code := 'quotation_service_lifecycle_ineligible';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT q.*
    INTO v_quotation
    FROM public.quotations q
    WHERE q.id = p_quotation_id
      AND q.service_id = v_service_id
      AND COALESCE(q.is_deleted, false) = false
    FOR UPDATE;

    IF NOT FOUND THEN
        error_code := 'quotation_approval_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    quotation_id := v_quotation.id;
    quotation_number := v_quotation.quotation_number;
    quotation_status := v_quotation.status;

    v_source_currency := COALESCE(
        NULLIF(btrim(v_quotation.snapshot_seller ->> 'currency'), ''),
        'SAR'
    );
    v_source_pricing_context := jsonb_build_object(
        'quotationNumber', v_quotation.quotation_number,
        'event', v_quotation.event,
        'quotationDate', v_quotation.date,
        'validUntil', v_quotation.valid_until
    );

    -- Lock all existing authority rows only after the Service lock.
    PERFORM s.id
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id
    ORDER BY s.id
    FOR UPDATE;

    SELECT count(*)::bigint
    INTO v_scope_count
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id;

    SELECT
        count(*)::bigint,
        COALESCE(sum(qi.total), 0)::numeric,
        COALESCE(sum(qi.vat), 0)::numeric,
        COALESCE(sum(qi.total + qi.vat), 0)::numeric
    INTO
        v_quotation_item_count,
        v_expected_subtotal,
        v_expected_vat_amount,
        v_expected_grand_total
    FROM public.quotation_items qi
    WHERE qi.quotation_id = v_quotation.id;

    v_expected_totals_match :=
        v_quotation.subtotal IS NOT NULL
        AND v_quotation.vat_amount IS NOT NULL
        AND v_quotation.grand_total IS NOT NULL
        AND v_quotation.subtotal IS NOT DISTINCT FROM v_expected_subtotal
        AND v_quotation.vat_amount IS NOT DISTINCT FROM v_expected_vat_amount
        AND v_quotation.grand_total IS NOT DISTINCT FROM v_expected_grand_total;

    IF v_quotation.status = 'approved' THEN
        -- Approved quotations are idempotent only when their complete internal
        -- authority snapshot still matches; this branch never repairs history.
        IF v_scope_count = 1 THEN
            SELECT s.*
            INTO v_scope
            FROM public.approved_billing_scopes s
            WHERE s.service_id = v_service_id;

            SELECT count(*)::bigint
            INTO v_scope_item_count
            FROM public.approved_billing_scope_items i
            WHERE i.approved_billing_scope_id = v_scope.id;

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
                            qi.total + qi.vat AS grand_total
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
            quotation_status := 'approved';
            approved_at := v_scope.approved_at;
            approved_billing_scope_id := v_scope.id;
            scope_version := v_scope.scope_version;
            accepted_subtotal := v_scope.accepted_subtotal;
            accepted_vat_amount := v_scope.accepted_vat_amount;
            accepted_grand_total := v_scope.accepted_grand_total;
            abs_status := v_scope.status;
            abs_activated_at := v_scope.approved_at;
            quotation_approved := true;
            abs_activated := true;
            idempotent_replay := true;
            RETURN NEXT;
            RETURN;
        END IF;

        error_code := 'quotation_internal_authority_inconsistent';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_quotation.status NOT IN ('draft', 'sent') THEN
        error_code := 'quotation_not_approvable';
        RETURN NEXT;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.quotations q
        WHERE q.service_id = v_service_id
          AND q.id <> v_quotation.id
          AND q.status = 'approved'
          AND COALESCE(q.is_deleted, false) = false
    ) THEN
        error_code := 'quotation_approval_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_scope_count <> 0 THEN
        error_code := 'quotation_internal_authority_inconsistent';
        RETURN NEXT;
        RETURN;
    END IF;

    -- The existing V1 ABS contract blocks quotation-level discounts because
    -- their line allocation is not an approved reduction semantic.
    IF COALESCE(v_quotation.discount, 0) > 0 THEN
        error_code := 'scope_discount_not_supported';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_quotation_item_count = 0 OR NOT v_expected_totals_match THEN
        error_code := 'quotation_financial_total_mismatch';
        RETURN NEXT;
        RETURN;
    END IF;

    v_now := transaction_timestamp();

    UPDATE public.quotations q
    SET status = 'approved',
        updated_by = p_actor_id,
        updated_at = v_now
    WHERE q.id = v_quotation.id
      AND q.service_id = v_service_id
      AND COALESCE(q.is_deleted, false) = false
      AND q.status IN ('draft', 'sent');

    IF NOT FOUND THEN
        error_code := 'quotation_approval_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    v_scope_version := 1;

    -- The ABS trigger intentionally requires draft insertion followed by an
    -- approved transition; both operations remain inside this RPC transaction.
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
        v_source_pricing_context,
        'pending_review', NULL, NULL, NULL, NULL,
        NULL, NULL, NULL, p_actor_id, p_actor_id, v_now, v_now
    )
    RETURNING id INTO v_scope_id;

    INSERT INTO public.approved_billing_scope_items (
        approved_billing_scope_id, source_quotation_id,
        source_quotation_item_id, display_order, decision,
        source_description, source_details, source_category,
        source_qty, source_unit_price, source_subtotal,
        source_vat_amount, source_grand_total,
        accepted_qty, accepted_unit_price, accepted_subtotal,
        accepted_vat_amount, accepted_grand_total,
        reason_code, reason_note, created_at, updated_at
    )
    SELECT
        v_scope_id,
        qi.quotation_id,
        qi.id,
        row_number() OVER (ORDER BY qi.created_at, qi.id) - 1,
        'accepted',
        qi.description,
        qi.details,
        qi.category,
        qi.qty,
        qi.unit_price,
        qi.total,
        qi.vat,
        qi.total + qi.vat,
        qi.qty,
        qi.unit_price,
        qi.total,
        qi.vat,
        qi.total + qi.vat,
        NULL,
        NULL,
        v_now,
        v_now
    FROM public.quotation_items qi
    WHERE qi.quotation_id = v_quotation.id;

    UPDATE public.approved_billing_scopes s
    SET status = 'approved',
        line_safety_status = 'safe',
        line_safety_reviewed_by = p_actor_id,
        line_safety_reviewed_at = v_now,
        approved_at = v_now,
        approved_by = p_actor_id,
        updated_by = p_actor_id,
        updated_at = v_now
    WHERE s.id = v_scope_id
      AND s.service_id = v_service_id
      AND s.source_quotation_id = v_quotation.id
      AND s.status = 'draft';

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_internal_abs_activation_failed';
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'quotation',
        v_quotation.id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'quotation_approved',
            'actor_id', p_actor_id,
            'actor_role', p_actor_role,
            'transaction_timestamp', v_now,
            'service_id', v_service_id,
            'quotation_id', v_quotation.id,
            'approved_billing_scope_id', v_scope_id,
            'approval_basis', 'customer_approval_confirmed_by_staff',
            'lifecycle_outcome', 'internal_abs_activated'
        ),
        v_now
    );

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'approved_billing_scope',
        v_scope_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'approved_billing_scope_approved',
            'actor_id', p_actor_id,
            'actor_role', p_actor_role,
            'transaction_timestamp', v_now,
            'service_id', v_service_id,
            'source_quotation_id', v_quotation.id,
            'quotation_id', v_quotation.id,
            'scope_id', v_scope_id,
            'scope_version', v_scope_version,
            'accepted_grand_total', v_quotation.grand_total,
            'approval_basis', 'customer_approval_confirmed_by_staff',
            'lifecycle_outcome', 'auto_activated'
        ),
        v_now
    );

    quotation_status := 'approved';
    approved_at := v_now;
    approved_billing_scope_id := v_scope_id;
    scope_version := v_scope_version;
    accepted_subtotal := v_quotation.subtotal;
    accepted_vat_amount := v_quotation.vat_amount;
    accepted_grand_total := v_quotation.grand_total;
    abs_status := 'approved';
    abs_activated_at := v_now;
    quotation_approved := true;
    abs_activated := true;
    idempotent_replay := false;
    RETURN NEXT;
    RETURN;
EXCEPTION
    WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE
            WHEN v_error_message LIKE '%unique_approved_quotation_per_service%'
                THEN 'quotation_approval_conflict'
            WHEN v_error_message LIKE '%idx_approved_billing_scopes_one_active_per_service%'
                THEN 'quotation_internal_authority_inconsistent'
            ELSE 'quotation_approval_concurrency_conflict'
        END;
        quotation_approved := false;
        abs_activated := false;
        idempotent_replay := false;
        RETURN NEXT;
        RETURN;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE
            WHEN v_error_message = 'scope_service_lifecycle_ineligible'
                THEN 'quotation_service_lifecycle_ineligible'
            WHEN v_error_message IN (
                'scope_no_items',
                'scope_no_billable_items',
                'scope_reduction_invalid',
                'approved scope item/header totals are invalid'
            ) THEN 'quotation_financial_total_mismatch'
            WHEN v_error_message IN (
                'scope_active_conflict',
                'source quotation must be approved',
                'source quotation not found',
                'source quotation must not be deleted',
                'source quotation service_id must match scope service_id',
                'scope_not_active',
                'quotation_internal_abs_activation_failed'
            ) THEN 'quotation_internal_authority_inconsistent'
            ELSE 'quotation_internal_authority_inconsistent'
        END;
        quotation_approved := false;
        abs_activated := false;
        idempotent_replay := false;
        RETURN NEXT;
        RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_quotation_and_activate_internal_abs(uuid, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_quotation_and_activate_internal_abs(uuid, text, text)
    TO service_role;

COMMENT ON FUNCTION public.approve_quotation_and_activate_internal_abs(uuid, text, text) IS
    'Service-role-only atomic quotation approval and internal Approved Billing Scope activation; Service lock precedes quotation and ABS locks, and every failure rolls back the authority transition.';

COMMIT;
