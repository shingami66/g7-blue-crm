-- Correct the Service Receipt review separation rule without changing any
-- receipt eligibility, amount, audit, or idempotency behavior.
CREATE OR REPLACE FUNCTION public.review_service_receipt(
    p_receipt_id uuid,
    p_acceptance_status text,
    p_conditions_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    receipt_id uuid,
    service_id uuid,
    supplier_id uuid,
    commitment_id uuid,
    acceptance_status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_conditions_notes text := NULLIF(btrim(p_conditions_notes), '');
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_receipt_id uuid;
    v_service_id uuid;
    v_supplier_id uuid;
    v_commitment_id uuid;
    v_current_status text;
    v_submitter text;
    v_commitment_status text;
    v_original_amount numeric;
    v_authorized_amount numeric;
    v_reserved_amount numeric;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'service_receipt_request_invalid', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'service_receipt_accept_permission_denied', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF p_receipt_id IS NULL
        OR p_acceptance_status IS NULL OR p_acceptance_status NOT IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED')
        OR p_acceptance_status = 'ACCEPTED_WITH_CONDITIONS' AND v_conditions_notes IS NULL
        OR v_conditions_notes IS NOT NULL AND char_length(v_conditions_notes) > 4000
    THEN
        RETURN QUERY SELECT 'service_receipt_review_invalid', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'receipt_id', p_receipt_id,
        'acceptance_status', p_acceptance_status,
        'conditions_notes', v_conditions_notes
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-receipt-review:' || p_request_id::text, 0));

    SELECT r.submitted_by INTO v_submitter
    FROM public.service_receipts r WHERE r.id = p_receipt_id FOR UPDATE;
    IF v_submitter = p_actor_id AND p_actor_role <> 'admin' THEN
        RETURN QUERY SELECT 'service_receipt_self_review_forbidden', p_receipt_id,
            NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_receipt_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'service_receipt'
      AND a.details ->> 'operation' = 'service_receipt_review'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'service_receipt_request_conflict', v_existing_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
            RETURN;
        END IF;

        SELECT r.service_id, r.supplier_id, r.commitment_id, r.acceptance_status
        INTO v_service_id, v_supplier_id, v_commitment_id, v_current_status
        FROM public.service_receipts r
        WHERE r.id = v_existing_receipt_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'service_receipt_unavailable', v_existing_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, v_existing_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, true;
        RETURN;
    END IF;

    SELECT r.service_id, r.supplier_id, r.commitment_id, r.acceptance_status,
           c.status, c.original_approved_amount
    INTO v_service_id, v_supplier_id, v_commitment_id, v_current_status,
         v_commitment_status, v_original_amount
    FROM public.service_receipts r
    JOIN public.approved_commitments c ON c.id = r.commitment_id
    WHERE r.id = p_receipt_id
    FOR UPDATE OF r, c;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_receipt_not_found', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF v_current_status <> 'PENDING' THEN
        RETURN QUERY SELECT 'service_receipt_already_reviewed', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, false;
        RETURN;
    END IF;

    IF p_acceptance_status <> 'REJECTED' AND v_commitment_status <> 'open' THEN
        RETURN QUERY SELECT 'service_receipt_commitment_not_open', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, false;
        RETURN;
    END IF;

    SELECT
        v_original_amount + COALESCE((SELECT SUM(a.amount_delta) FROM public.approved_commitment_amendments a WHERE a.commitment_id = v_commitment_id), 0),
        COALESCE((SELECT SUM(CASE WHEN r2.acceptance_status <> 'REJECTED' THEN COALESCE(r2.received_amount, 0) ELSE 0 END) FROM public.service_receipts r2 WHERE r2.commitment_id = v_commitment_id), 0)
    INTO v_authorized_amount, v_reserved_amount;

    IF p_acceptance_status <> 'REJECTED'
        AND v_reserved_amount > v_authorized_amount
    THEN
        RETURN QUERY SELECT 'service_receipt_value_exceeds_open', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, false;
        RETURN;
    END IF;

    UPDATE public.service_receipts r
    SET acceptance_status = p_acceptance_status,
        conditions_notes = CASE WHEN v_conditions_notes IS NOT NULL THEN v_conditions_notes ELSE r.conditions_notes END,
        reviewed_at = v_now,
        reviewed_by = p_actor_id,
        updated_at = v_now,
        updated_by = p_actor_id
    WHERE r.id = p_receipt_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'service_receipt',
        p_receipt_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'service_receipt_reviewed',
            'operation', 'service_receipt_review',
            'w4_version', 'l1-d07-v1',
            'request_id', p_request_id::text,
            'service_id', v_service_id,
            'supplier_id', v_supplier_id,
            'commitment_id', v_commitment_id,
            'receipt_id', p_receipt_id,
            'actor_role', p_actor_role,
            'from', jsonb_build_object('acceptance_status', 'PENDING'),
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, p_acceptance_status, false;
END;
$$;

REVOKE ALL ON FUNCTION public.review_service_receipt(uuid,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_service_receipt(uuid,text,text,uuid,text,text) TO service_role;
