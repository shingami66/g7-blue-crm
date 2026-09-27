-- W4 bounded Supplier Quotation history and preserved original evidence.
--
-- Existing service_procurement_candidates rows remain the quotation/evidence
-- record. This migration adds only a narrow relational document attachment
-- and its audited, service-role-only action. It does not create a Booking,
-- Purchase Order, commitment, receipt, payable, payment, costing, or
-- accounting record.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.service_procurement_candidates') IS NULL
        OR to_regclass('public.service_procurement_requirements') IS NULL
        OR to_regclass('public.business_documents') IS NULL
        OR to_regclass('public.business_document_links') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'W4 quotation history preflight: required table missing';
    END IF;

    IF to_regclass('public.service_procurement_candidate_documents') IS NOT NULL
        OR to_regprocedure('public.attach_service_procurement_candidate_document(uuid,uuid,uuid,uuid,text,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'W4 quotation history preflight: attachment projection or RPC already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.service_procurement_candidates'::regclass
          AND conname = 'service_procurement_candidates_pkey'
    ) THEN
        RAISE EXCEPTION 'W4 quotation history preflight: candidate primary key missing';
    END IF;
END;
$$;

CREATE TABLE public.service_procurement_candidate_documents (
    document_id uuid PRIMARY KEY REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    requirement_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    attached_by text NOT NULL,
    attached_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT service_procurement_candidate_documents_candidate_fkey
        FOREIGN KEY (requirement_id, supplier_id)
        REFERENCES public.service_procurement_candidates(requirement_id, supplier_id)
        ON DELETE RESTRICT,
    CONSTRAINT service_procurement_candidate_documents_attached_by_check CHECK (
        char_length(btrim(attached_by)) BETWEEN 1 AND 255
    )
);

-- Supplier Detail filters candidate history by supplier and newest evidence.
CREATE INDEX service_procurement_candidates_supplier_created_idx
    ON public.service_procurement_candidates(supplier_id, created_at DESC, requirement_id DESC);

-- Supplier quotation history loads originals by candidate chronology.
CREATE INDEX service_procurement_candidate_documents_candidate_created_idx
    ON public.service_procurement_candidate_documents(requirement_id, supplier_id, attached_at DESC, document_id DESC);

COMMENT ON TABLE public.service_procurement_candidate_documents IS
    'Private original documents attached to Service-scoped Supplier Quotation evidence; not a commitment or payable record.';

ALTER TABLE public.service_procurement_candidate_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_procurement_candidate_documents FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.service_procurement_candidate_documents TO service_role;

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
    ON CONFLICT (document_id) DO NOTHING;

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
