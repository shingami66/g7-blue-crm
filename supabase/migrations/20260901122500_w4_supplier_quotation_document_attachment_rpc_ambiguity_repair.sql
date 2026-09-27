-- W4 corrective migration: qualify the candidate-document conflict target.
-- The prior quotation-history migration is already applied on DEV; this
-- forward replacement preserves its function contract and business behavior.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.service_procurement_candidate_documents') IS NULL
        OR to_regprocedure('public.attach_service_procurement_candidate_document(uuid,uuid,uuid,uuid,text,text)') IS NULL
    THEN
        RAISE EXCEPTION 'W4 document attachment repair preflight: quotation-history foundation missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.service_procurement_candidate_documents'::regclass
          AND conname = 'service_procurement_candidate_documents_pkey'
    ) THEN
        RAISE EXCEPTION 'W4 document attachment repair preflight: document primary key missing';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_service_procurement_candidate_document(
    p_requirement_id uuid,
    p_supplier_id uuid,
    p_document_id uuid,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    requirement_id uuid,
    supplier_id uuid,
    service_id uuid,
    document_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_service_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'procurement_request_invalid', p_requirement_id, p_supplier_id, NULL::uuid, p_document_id, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'procurement_permission_denied', p_requirement_id, p_supplier_id, NULL::uuid, p_document_id, false;
        RETURN;
    END IF;

    IF p_requirement_id IS NULL OR p_supplier_id IS NULL OR p_document_id IS NULL THEN
        RETURN QUERY SELECT 'procurement_document_fields_required', p_requirement_id, p_supplier_id, NULL::uuid, p_document_id, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-procurement-document:' || p_request_id::text, 0));

    SELECT r.service_id
    INTO v_service_id
    FROM public.service_procurement_candidates c
    JOIN public.service_procurement_requirements r ON r.id = c.requirement_id
    JOIN public.services s ON s.id = r.service_id
    WHERE c.requirement_id = p_requirement_id
      AND c.supplier_id = p_supplier_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE OF c, r, s;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'procurement_candidate_unavailable', p_requirement_id, p_supplier_id, NULL::uuid, p_document_id, false;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.business_documents d
        JOIN public.business_document_links l
          ON l.document_id = d.id
         AND l.service_id = v_service_id
         AND l.link_purpose = 'supplier_quotation'
        WHERE d.id = p_document_id
          AND d.bucket_id = 'business-evidence'
    ) THEN
        RETURN QUERY SELECT 'procurement_document_unavailable', p_requirement_id, p_supplier_id, v_service_id, p_document_id, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'requirement_id', p_requirement_id,
        'supplier_id', p_supplier_id,
        'document_id', p_document_id
    );

    SELECT a.details -> 'payload'
    INTO v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'service_procurement_candidate'
      AND a.entity_id = p_requirement_id
      AND a.details ->> 'operation' = 'candidate_document_attach'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'procurement_request_conflict', p_requirement_id, p_supplier_id, v_service_id, p_document_id, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, p_requirement_id, p_supplier_id, v_service_id, p_document_id, true;
        RETURN;
    END IF;

    INSERT INTO public.service_procurement_candidate_documents(
        document_id, requirement_id, supplier_id, attached_by, attached_at
    ) VALUES (
        p_document_id, p_requirement_id, p_supplier_id, p_actor_id, v_now
    )
    ON CONFLICT ON CONSTRAINT service_procurement_candidate_documents_pkey DO NOTHING;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'procurement_document_already_attached', p_requirement_id, p_supplier_id, v_service_id, p_document_id, false;
        RETURN;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create',
        'service_procurement_candidate',
        p_requirement_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'supplier_quotation_document_attached',
            'operation', 'candidate_document_attach',
            'w4_version', 'w4-v1',
            'request_id', p_request_id::text,
            'service_id', v_service_id,
            'requirement_id', p_requirement_id,
            'supplier_id', p_supplier_id,
            'document_id', p_document_id,
            'actor_role', p_actor_role,
            'from', NULL,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_requirement_id, p_supplier_id, v_service_id, p_document_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_service_procurement_candidate_document(uuid,uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_service_procurement_candidate_document(uuid,uuid,uuid,uuid,text,text) TO service_role;

COMMIT;
