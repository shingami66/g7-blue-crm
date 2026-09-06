-- W4 first-class historical Supplier Quotation records.
--
-- The existing service_procurement_candidates projection remains intact as
-- compatibility sourcing evidence. This migration adds a durable quotation
-- header, requirement lines, and quotation-level original-document links. It
-- does not create a Booking, Purchase Order, commitment, receipt, payable,
-- payment, costing, or accounting record.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.suppliers') IS NULL
        OR to_regclass('public.service_procurement_requirements') IS NULL
        OR to_regclass('public.service_procurement_candidates') IS NULL
        OR to_regclass('public.service_procurement_candidate_documents') IS NULL
        OR to_regclass('public.business_documents') IS NULL
        OR to_regclass('public.business_document_links') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'W4 Supplier Quotation preflight: required table missing';
    END IF;

    IF to_regclass('public.supplier_quotations') IS NOT NULL
        OR to_regclass('public.supplier_quotation_requirements') IS NOT NULL
        OR to_regclass('public.supplier_quotation_documents') IS NOT NULL
        OR to_regprocedure('public.create_supplier_quotation(uuid,uuid,text,date,numeric,jsonb,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.attach_supplier_quotation_documents(uuid,uuid[],uuid,text,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'W4 Supplier Quotation preflight: first-class model already exists';
    END IF;
END;
$$;

-- This unique key lets the quotation line table enforce that every line points
-- to a requirement belonging to the quotation's Service.
ALTER TABLE public.service_procurement_requirements
    ADD CONSTRAINT service_procurement_requirements_id_service_key UNIQUE (id, service_id);

CREATE TABLE public.supplier_quotations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    supplier_reference text,
    quotation_date date,
    package_total numeric(14,2),
    currency text NOT NULL DEFAULT 'SAR',
    recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    recorded_by text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_by text NOT NULL,
    source_candidate_requirement_id uuid,
    source_candidate_supplier_id uuid,
    CONSTRAINT supplier_quotations_supplier_reference_check CHECK (
        supplier_reference IS NULL
        OR (
            char_length(btrim(supplier_reference)) BETWEEN 1 AND 255
            AND supplier_reference = btrim(supplier_reference)
        )
    ),
    CONSTRAINT supplier_quotations_package_total_check CHECK (
        package_total IS NULL OR (package_total >= 0 AND package_total <= 999999999999.99)
    ),
    CONSTRAINT supplier_quotations_currency_check CHECK (currency = 'SAR'),
    CONSTRAINT supplier_quotations_recorded_by_check CHECK (
        char_length(btrim(recorded_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT supplier_quotations_updated_by_check CHECK (
        char_length(btrim(updated_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT supplier_quotations_source_pair_check CHECK (
        (source_candidate_requirement_id IS NULL AND source_candidate_supplier_id IS NULL)
        OR (source_candidate_requirement_id IS NOT NULL AND source_candidate_supplier_id IS NOT NULL)
    ),
    CONSTRAINT supplier_quotations_source_candidate_fkey
        FOREIGN KEY (source_candidate_requirement_id, source_candidate_supplier_id)
        REFERENCES public.service_procurement_candidates(requirement_id, supplier_id)
        ON DELETE RESTRICT,
    CONSTRAINT supplier_quotations_compatibility_source_key
        UNIQUE (source_candidate_requirement_id, source_candidate_supplier_id),
    CONSTRAINT supplier_quotations_id_service_key UNIQUE (id, service_id)
);

CREATE TABLE public.supplier_quotation_requirements (
    quotation_id uuid NOT NULL,
    requirement_id uuid NOT NULL,
    service_id uuid NOT NULL,
    line_summary text NOT NULL,
    line_amount numeric(14,2),
    line_evidence_ref text,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    PRIMARY KEY (quotation_id, requirement_id),
    CONSTRAINT supplier_quotation_requirements_quotation_fkey
        FOREIGN KEY (quotation_id, service_id)
        REFERENCES public.supplier_quotations(id, service_id)
        ON DELETE RESTRICT,
    CONSTRAINT supplier_quotation_requirements_requirement_fkey
        FOREIGN KEY (requirement_id, service_id)
        REFERENCES public.service_procurement_requirements(id, service_id)
        ON DELETE RESTRICT,
    CONSTRAINT supplier_quotation_requirements_line_summary_check CHECK (
        char_length(btrim(line_summary)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT supplier_quotation_requirements_line_amount_check CHECK (
        line_amount IS NULL OR (line_amount >= 0 AND line_amount <= 999999999999.99)
    ),
    CONSTRAINT supplier_quotation_requirements_line_evidence_check CHECK (
        line_evidence_ref IS NULL
        OR char_length(btrim(line_evidence_ref)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT supplier_quotation_requirements_created_by_check CHECK (
        char_length(btrim(created_by)) BETWEEN 1 AND 255
    )
);

CREATE TABLE public.supplier_quotation_documents (
    quotation_id uuid NOT NULL REFERENCES public.supplier_quotations(id) ON DELETE RESTRICT,
    document_id uuid PRIMARY KEY REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    attached_by text NOT NULL,
    attached_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT supplier_quotation_documents_attached_by_check CHECK (
        char_length(btrim(attached_by)) BETWEEN 1 AND 255
    )
);

CREATE INDEX supplier_quotations_supplier_date_idx
    ON public.supplier_quotations(supplier_id, quotation_date DESC, id DESC);

CREATE INDEX supplier_quotations_service_date_idx
    ON public.supplier_quotations(service_id, quotation_date DESC, id DESC);

CREATE INDEX supplier_quotation_requirements_requirement_idx
    ON public.supplier_quotation_requirements(requirement_id, quotation_id);

CREATE INDEX supplier_quotation_documents_quotation_attached_idx
    ON public.supplier_quotation_documents(quotation_id, attached_at DESC, document_id DESC);

COMMENT ON TABLE public.service_procurement_candidates IS
    'Compatibility sourcing/selection evidence. It is not a Supplier Quotation header and its (requirement_id, supplier_id) key is intentionally preserved.';
COMMENT ON TABLE public.service_procurement_candidate_documents IS
    'Compatibility document evidence for legacy candidate rows. First-class quotation document links use supplier_quotation_documents and preserve the same document_id.';
COMMENT ON TABLE public.supplier_quotations IS
    'Historical supplier quotation header: one Supplier, one Service, supplier reference/date, optional package total, and no commitment or accounting meaning.';
COMMENT ON TABLE public.supplier_quotation_requirements IS
    'Requirement lines beneath a historical Supplier Quotation. A quotation may cover many requirements; line amounts are optional.';
COMMENT ON COLUMN public.supplier_quotation_requirements.line_evidence_ref IS
    'Compatibility-only copy of service_procurement_candidates.evidence_ref; new Supplier Quotation lines do not populate this field.';
COMMENT ON TABLE public.supplier_quotation_documents IS
    'Original private business documents linked to a historical Supplier Quotation without duplicating Storage objects.';

ALTER TABLE public.supplier_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quotation_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quotation_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.supplier_quotations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.supplier_quotation_requirements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.supplier_quotation_documents FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.supplier_quotations TO service_role;
GRANT ALL ON TABLE public.supplier_quotation_requirements TO service_role;
GRANT ALL ON TABLE public.supplier_quotation_documents TO service_role;

CREATE OR REPLACE FUNCTION public.create_supplier_quotation(
    p_supplier_id uuid,
    p_service_id uuid,
    p_supplier_reference text,
    p_quotation_date date,
    p_package_total numeric,
    p_requirements jsonb,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    quotation_id uuid,
    supplier_id uuid,
    service_id uuid,
    line_count integer,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_supplier_reference text := NULLIF(btrim(p_supplier_reference), '');
    v_line_count integer := 0;
    v_distinct_line_count integer := 0;
    v_matching_line_count integer := 0;
    v_lines_valid boolean := false;
    v_lines jsonb;
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_quotation_id uuid;
    v_quotation_id uuid;
    v_service_id uuid;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'supplier_quotation_request_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'supplier_quotation_permission_denied', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    IF p_supplier_id IS NULL OR p_service_id IS NULL
        OR v_supplier_reference IS NULL
        OR char_length(v_supplier_reference) > 255
        OR p_quotation_date IS NULL
        OR p_package_total IS NOT NULL
            AND (p_package_total < 0 OR p_package_total > 999999999999.99)
    THEN
        RETURN QUERY SELECT 'supplier_quotation_fields_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    IF p_requirements IS NULL OR jsonb_typeof(p_requirements) <> 'array' THEN
        RETURN QUERY SELECT 'supplier_quotation_requirements_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    -- Normalize line ordering so a replay with the same line set is
    -- deterministic and does not depend on client array order.
    BEGIN
        SELECT
            count(*)::integer,
            count(DISTINCT line.requirement_id)::integer,
            coalesce(bool_and(
                line.requirement_id IS NOT NULL
                AND NULLIF(btrim(line.line_summary), '') IS NOT NULL
                AND char_length(btrim(line.line_summary)) <= 2000
                AND (
                    line.line_amount IS NULL
                    OR (line.line_amount >= 0 AND line.line_amount <= 999999999999.99)
                )
            ), false),
            coalesce(jsonb_agg(
                jsonb_build_object(
                    'requirement_id', line.requirement_id,
                    'line_summary', NULLIF(btrim(line.line_summary), ''),
                    'line_amount', line.line_amount
                )
                ORDER BY line.requirement_id
            ), '[]'::jsonb)
        INTO v_line_count, v_distinct_line_count, v_lines_valid, v_lines
        FROM jsonb_to_recordset(p_requirements) AS line(
            requirement_id uuid,
            line_summary text,
            line_amount numeric
        );
    EXCEPTION WHEN others THEN
        RETURN QUERY SELECT 'supplier_quotation_requirements_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END;

    IF v_line_count < 1 OR v_line_count > 100
        OR v_distinct_line_count <> v_line_count
        OR NOT v_lines_valid
    THEN
        RETURN QUERY SELECT 'supplier_quotation_requirements_invalid', NULL::uuid, p_supplier_id, p_service_id, v_line_count, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-supplier-quotation:' || p_request_id::text, 0));

    SELECT s.id
    INTO v_service_id
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_quotation_service_unavailable', NULL::uuid, p_supplier_id, p_service_id, v_line_count, false;
        RETURN;
    END IF;

    PERFORM sp.id
    FROM public.suppliers sp
    WHERE sp.id = p_supplier_id
      AND sp.status = 'active'
      AND coalesce(sp.is_deleted, false) = false
      AND sp.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_quotation_supplier_unavailable', NULL::uuid, p_supplier_id, p_service_id, v_line_count, false;
        RETURN;
    END IF;

    SELECT count(*)::integer
    INTO v_matching_line_count
    FROM jsonb_to_recordset(p_requirements) AS line(requirement_id uuid)
    JOIN public.service_procurement_requirements r
      ON r.id = line.requirement_id
     AND r.service_id = p_service_id;

    IF v_matching_line_count <> v_line_count THEN
        RETURN QUERY SELECT 'supplier_quotation_requirement_unavailable', NULL::uuid, p_supplier_id, p_service_id, v_line_count, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'supplier_id', p_supplier_id,
        'service_id', p_service_id,
        'supplier_reference', v_supplier_reference,
        'quotation_date', p_quotation_date,
        'package_total', p_package_total,
        'currency', 'SAR',
        'requirements', v_lines
    );

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_quotation_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'supplier_quotation'
      AND a.details ->> 'operation' = 'supplier_quotation_create'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'supplier_quotation_request_conflict', v_existing_quotation_id, p_supplier_id, p_service_id, 0, false;
            RETURN;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM public.supplier_quotations q
            WHERE q.id = v_existing_quotation_id
        ) THEN
            RETURN QUERY SELECT 'supplier_quotation_unavailable', v_existing_quotation_id, p_supplier_id, p_service_id, 0, false;
            RETURN;
        END IF;

        SELECT count(*)::integer
        INTO v_line_count
        FROM public.supplier_quotation_requirements qr
        WHERE qr.quotation_id = v_existing_quotation_id;

        RETURN QUERY SELECT NULL::text, v_existing_quotation_id, p_supplier_id, p_service_id, v_line_count, true;
        RETURN;
    END IF;

    INSERT INTO public.supplier_quotations(
        supplier_id, service_id, supplier_reference, quotation_date,
        package_total, currency, recorded_at, recorded_by,
        updated_at, updated_by
    ) VALUES (
        p_supplier_id, p_service_id, v_supplier_reference, p_quotation_date,
        p_package_total, 'SAR', v_now, p_actor_id, v_now, p_actor_id
    )
    RETURNING id INTO v_quotation_id;

    INSERT INTO public.supplier_quotation_requirements(
        quotation_id, requirement_id, service_id, line_summary, line_amount,
        created_at, created_by
    )
    SELECT
        v_quotation_id,
        line.requirement_id,
        p_service_id,
        NULLIF(btrim(line.line_summary), ''),
        line.line_amount,
        v_now,
        p_actor_id
    FROM jsonb_to_recordset(p_requirements) AS line(
        requirement_id uuid,
        line_summary text,
        line_amount numeric
    );

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create',
        'supplier_quotation',
        v_quotation_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'supplier_quotation_created',
            'operation', 'supplier_quotation_create',
            'w4_version', 'w4-v2',
            'request_id', p_request_id::text,
            'service_id', p_service_id,
            'supplier_id', p_supplier_id,
            'quotation_id', v_quotation_id,
            'actor_role', p_actor_role,
            'from', NULL,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_quotation_id, p_supplier_id, p_service_id, v_line_count, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_supplier_quotation_documents(
    p_quotation_id uuid,
    p_document_ids uuid[],
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    quotation_id uuid,
    service_id uuid,
    document_count integer,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_service_id uuid;
    v_document_count integer := 0;
    v_distinct_document_count integer := 0;
    v_valid_document_count integer := 0;
    v_inserted_document_count integer := 0;
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_quotation_id uuid;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'supplier_quotation_request_invalid', p_quotation_id, NULL::uuid, 0, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'supplier_quotation_permission_denied', p_quotation_id, NULL::uuid, 0, false;
        RETURN;
    END IF;

    IF p_quotation_id IS NULL OR p_document_ids IS NULL THEN
        RETURN QUERY SELECT 'supplier_quotation_documents_invalid', p_quotation_id, NULL::uuid, 0, false;
        RETURN;
    END IF;

    SELECT count(*)::integer, count(DISTINCT document_id)::integer
    INTO v_document_count, v_distinct_document_count
    FROM unnest(p_document_ids) AS document_id;

    IF v_document_count < 1 OR v_document_count <> v_distinct_document_count THEN
        RETURN QUERY SELECT 'supplier_quotation_documents_invalid', p_quotation_id, NULL::uuid, v_document_count, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-supplier-quotation-document:' || p_request_id::text, 0));

    SELECT q.service_id
    INTO v_service_id
    FROM public.supplier_quotations q
    JOIN public.services s ON s.id = q.service_id
    WHERE q.id = p_quotation_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE OF q, s;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_quotation_unavailable', p_quotation_id, NULL::uuid, v_document_count, false;
        RETURN;
    END IF;

    SELECT count(DISTINCT d.id)::integer
    INTO v_valid_document_count
    FROM public.business_documents d
    JOIN public.business_document_links l
      ON l.document_id = d.id
     AND l.service_id = v_service_id
     AND l.link_purpose = 'supplier_quotation'
    WHERE d.id = ANY(p_document_ids)
      AND d.bucket_id = 'business-evidence';

    IF v_valid_document_count <> v_document_count THEN
        RETURN QUERY SELECT 'supplier_quotation_document_unavailable', p_quotation_id, v_service_id, v_document_count, false;
        RETURN;
    END IF;

    SELECT jsonb_build_object(
        'quotation_id', p_quotation_id,
        'document_ids', coalesce(jsonb_agg(to_jsonb(document_id) ORDER BY document_id), '[]'::jsonb)
    )
    INTO v_payload
    FROM unnest(p_document_ids) AS document_id;

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_quotation_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'supplier_quotation'
      AND a.details ->> 'operation' = 'supplier_quotation_documents_attach'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'supplier_quotation_request_conflict', v_existing_quotation_id, v_service_id, v_document_count, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, p_quotation_id, v_service_id, v_document_count, true;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.supplier_quotation_documents qd
        WHERE qd.document_id = ANY(p_document_ids)
    ) THEN
        RETURN QUERY SELECT 'supplier_quotation_document_already_attached', p_quotation_id, v_service_id, v_document_count, false;
        RETURN;
    END IF;

    INSERT INTO public.supplier_quotation_documents(
        quotation_id, document_id, attached_by, attached_at
    )
    SELECT p_quotation_id, document_id, p_actor_id, v_now
    FROM unnest(p_document_ids) AS document_id;

    GET DIAGNOSTICS v_inserted_document_count = ROW_COUNT;
    IF v_inserted_document_count <> v_document_count THEN
        RETURN QUERY SELECT 'supplier_quotation_document_already_attached', p_quotation_id, v_service_id, v_document_count, false;
        RETURN;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create',
        'supplier_quotation',
        p_quotation_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'supplier_quotation_documents_attached',
            'operation', 'supplier_quotation_documents_attach',
            'w4_version', 'w4-v2',
            'request_id', p_request_id::text,
            'service_id', v_service_id,
            'quotation_id', p_quotation_id,
            'document_count', v_document_count,
            'actor_role', p_actor_role,
            'from', NULL,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_quotation_id, v_service_id, v_document_count, false;
END;
$$;

-- Deterministic compatibility backfill. Each legacy candidate becomes one
-- historical quotation because the old key contains no safe grouping signal.
-- Legacy candidate rows do not prove a supplier-issued quotation reference or
-- supplier quotation date, so those header facts remain unknown. The source
-- pair carries deterministic compatibility identity and source rows stay.
INSERT INTO public.supplier_quotations(
    supplier_id, service_id, supplier_reference, quotation_date,
    package_total, currency, recorded_at, recorded_by,
    updated_at, updated_by,
    source_candidate_requirement_id, source_candidate_supplier_id
)
SELECT
    c.supplier_id,
    r.service_id,
    NULL,
    NULL,
    NULL,
    'SAR',
    c.created_at,
    c.created_by,
    c.updated_at,
    c.updated_by,
    c.requirement_id,
    c.supplier_id
FROM public.service_procurement_candidates c
JOIN public.service_procurement_requirements r ON r.id = c.requirement_id
ON CONFLICT ON CONSTRAINT supplier_quotations_compatibility_source_key DO NOTHING;

INSERT INTO public.supplier_quotation_requirements(
    quotation_id, requirement_id, service_id, line_summary, line_amount,
    line_evidence_ref, created_at, created_by
)
SELECT
    q.id,
    c.requirement_id,
    r.service_id,
    c.offer_summary,
    c.quoted_amount,
    c.evidence_ref,
    c.created_at,
    c.created_by
FROM public.service_procurement_candidates c
JOIN public.service_procurement_requirements r ON r.id = c.requirement_id
JOIN public.supplier_quotations q
  ON q.source_candidate_requirement_id = c.requirement_id
 AND q.source_candidate_supplier_id = c.supplier_id
ON CONFLICT (quotation_id, requirement_id) DO NOTHING;

-- Reuse the existing metadata row and Storage object; only the new
-- quotation-level relation is added.
INSERT INTO public.supplier_quotation_documents(
    quotation_id, document_id, attached_by, attached_at
)
SELECT
    q.id,
    cd.document_id,
    cd.attached_by,
    cd.attached_at
FROM public.service_procurement_candidate_documents cd
JOIN public.supplier_quotations q
  ON q.source_candidate_requirement_id = cd.requirement_id
 AND q.source_candidate_supplier_id = cd.supplier_id
ON CONFLICT (document_id) DO NOTHING;

INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
SELECT
    'create',
    'supplier_quotation',
    q.id,
    'system:w4-compatibility-backfill',
    jsonb_build_object(
        'event_type', 'supplier_quotation_compatibility_backfilled',
        'operation', 'supplier_quotation_compatibility_backfill',
        'w4_version', 'w4-v2',
        'service_id', q.service_id,
        'supplier_id', q.supplier_id,
        'quotation_id', q.id,
        'source_candidate_requirement_id', q.source_candidate_requirement_id,
        'source_candidate_supplier_id', q.source_candidate_supplier_id,
        'preserved_document_count', (
            SELECT count(*)
            FROM public.supplier_quotation_documents qd
            WHERE qd.quotation_id = q.id
        )
    ),
    q.recorded_at
FROM public.supplier_quotations q
WHERE q.source_candidate_requirement_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM public.audit_logs a
      WHERE a.entity_type = 'supplier_quotation'
        AND a.entity_id = q.id
        AND a.details ->> 'operation' = 'supplier_quotation_compatibility_backfill'
  );

REVOKE ALL ON FUNCTION public.create_supplier_quotation(uuid,uuid,text,date,numeric,jsonb,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_supplier_quotation_documents(uuid,uuid[],uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier_quotation(uuid,uuid,text,date,numeric,jsonb,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_supplier_quotation_documents(uuid,uuid[],uuid,text,text) TO service_role;

COMMIT;
