-- W4 corrective migration: use the named candidate primary-key constraint.
-- The original W4 migration and the requirement-RPC correction are already
-- applied and are intentionally unchanged.
BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.upsert_service_procurement_candidate(uuid,uuid,text,text,numeric,text,uuid,text,text)') IS NULL THEN
        RAISE EXCEPTION 'W4 corrective preflight: candidate RPC is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conrelid = 'public.service_procurement_candidates'::regclass
          AND c.conname = 'service_procurement_candidates_pkey'
          AND c.contype = 'p'
    ) THEN
        RAISE EXCEPTION 'W4 corrective preflight: candidate primary key is missing';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_service_procurement_candidate(
    p_requirement_id uuid,
    p_supplier_id uuid,
    p_offer_summary text,
    p_evidence_ref text,
    p_quoted_amount numeric,
    p_comparison_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    requirement_id uuid,
    supplier_id uuid,
    service_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_offer_summary text := NULLIF(btrim(p_offer_summary), '');
    v_evidence_ref text := NULLIF(btrim(p_evidence_ref), '');
    v_comparison_notes text := NULLIF(btrim(p_comparison_notes), '');
    v_service_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
    v_before jsonb;
    v_existing boolean := false;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'procurement_request_invalid', p_requirement_id, p_supplier_id, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'procurement_permission_denied', p_requirement_id, p_supplier_id, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_requirement_id IS NULL OR p_supplier_id IS NULL THEN
        RETURN QUERY SELECT 'procurement_candidate_fields_required', p_requirement_id, p_supplier_id, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_offer_summary IS NULL OR char_length(v_offer_summary) > 2000
        OR v_evidence_ref IS NULL OR char_length(v_evidence_ref) > 2000
        OR v_comparison_notes IS NOT NULL AND char_length(v_comparison_notes) > 2000
        OR p_quoted_amount IS NOT NULL AND (p_quoted_amount < 0 OR p_quoted_amount > 999999999999.99)
    THEN
        RETURN QUERY SELECT 'procurement_candidate_fields_invalid', p_requirement_id, p_supplier_id, NULL::uuid, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-procurement:' || p_request_id::text, 0));

    SELECT r.service_id
    INTO v_service_id
    FROM public.service_procurement_requirements r
    JOIN public.services s ON s.id = r.service_id
    WHERE r.id = p_requirement_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE OF r, s;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'procurement_requirement_unavailable', p_requirement_id, p_supplier_id, NULL::uuid, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'requirement_id', p_requirement_id,
        'supplier_id', p_supplier_id,
        'offer_summary', v_offer_summary,
        'evidence_ref', v_evidence_ref,
        'quoted_amount', p_quoted_amount,
        'currency', 'SAR',
        'comparison_notes', v_comparison_notes
    );

    SELECT a.details -> 'payload'
    INTO v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'service_procurement_candidate'
      AND a.entity_id = p_requirement_id
      AND a.details ->> 'operation' = 'candidate_upsert'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'procurement_request_conflict', p_requirement_id, p_supplier_id, v_service_id, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, p_requirement_id, p_supplier_id, v_service_id, true;
        RETURN;
    END IF;

    SELECT jsonb_build_object(
        'offer_summary', c.offer_summary,
        'evidence_ref', c.evidence_ref,
        'quoted_amount', c.quoted_amount,
        'currency', c.currency,
        'comparison_notes', c.comparison_notes
    )
    INTO v_before
    FROM public.service_procurement_candidates c
    WHERE c.requirement_id = p_requirement_id
      AND c.supplier_id = p_supplier_id;
    v_existing := FOUND;

    IF NOT EXISTS (
        SELECT 1
        FROM public.suppliers sp
        WHERE sp.id = p_supplier_id
          AND sp.status = 'active'
          AND COALESCE(sp.is_deleted, false) = false
          AND sp.deleted_at IS NULL
    ) THEN
        RETURN QUERY SELECT 'procurement_supplier_unavailable', p_requirement_id, p_supplier_id, v_service_id, false;
        RETURN;
    END IF;

    INSERT INTO public.service_procurement_candidates(
        requirement_id, supplier_id, offer_summary, evidence_ref,
        quoted_amount, currency, comparison_notes,
        created_at, created_by, updated_at, updated_by
    ) VALUES (
        p_requirement_id, p_supplier_id, v_offer_summary, v_evidence_ref,
        p_quoted_amount, 'SAR', v_comparison_notes,
        v_now, p_actor_id, v_now, p_actor_id
    )
    ON CONFLICT ON CONSTRAINT service_procurement_candidates_pkey DO UPDATE
    SET offer_summary = EXCLUDED.offer_summary,
        evidence_ref = EXCLUDED.evidence_ref,
        quoted_amount = EXCLUDED.quoted_amount,
        currency = EXCLUDED.currency,
        comparison_notes = EXCLUDED.comparison_notes,
        updated_at = v_now,
        updated_by = p_actor_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        CASE WHEN v_existing THEN 'update' ELSE 'create' END,
        'service_procurement_candidate',
        p_requirement_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'procurement_candidate_upserted',
            'operation', 'candidate_upsert',
            'w4_version', 'w4-v1',
            'request_id', p_request_id::text,
            'service_id', v_service_id,
            'requirement_id', p_requirement_id,
            'supplier_id', p_supplier_id,
            'actor_role', p_actor_role,
            'evidence_ref', v_evidence_ref,
            'from', v_before,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_requirement_id, p_supplier_id, v_service_id, false;
END;
$$;

COMMIT;
