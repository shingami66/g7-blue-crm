-- W4 bounded procurement requirement and sourcing evidence.
--
-- This migration is intentionally additive. It records internal procurement
-- evidence only. It does not create a Supplier Booking, Purchase Order,
-- commitment, receipt, payable, payment, or accounting entry.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.suppliers') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'W4 procurement preflight: required table missing';
    END IF;

    IF to_regclass('public.service_procurement_requirements') IS NOT NULL
        OR to_regclass('public.service_procurement_candidates') IS NOT NULL
        OR to_regprocedure('public.upsert_service_procurement_requirement(uuid,uuid,text,text,text,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.upsert_service_procurement_candidate(uuid,uuid,text,text,numeric,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.select_service_procurement_supplier(uuid,uuid,text,text,uuid,text,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'W4 procurement preflight: projection or RPC already exists';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('services','id','uuid'), ('services','status','text'),
            ('services','deleted_at','timestamp with time zone'),
            ('suppliers','id','uuid'), ('suppliers','status','text'),
            ('suppliers','is_deleted','boolean'), ('suppliers','deleted_at','timestamp with time zone'),
            ('audit_logs','action','text'), ('audit_logs','entity_type','text'),
            ('audit_logs','entity_id','uuid'), ('audit_logs','user_id','text'),
            ('audit_logs','details','jsonb'), ('audit_logs','timestamp','timestamp with time zone')
        ) AS required_columns(table_name, column_name, type_name)
        WHERE NOT EXISTS (
            SELECT 1
            FROM pg_attribute a
            WHERE a.attrelid = to_regclass('public.' || required_columns.table_name)
              AND a.attname = required_columns.column_name
              AND a.attnum > 0
              AND NOT a.attisdropped
              AND format_type(a.atttypid, a.atttypmod) LIKE required_columns.type_name || '%'
        )
    ) THEN
        RAISE EXCEPTION 'W4 procurement preflight: required column or type missing';
    END IF;
END;
$$;

CREATE TABLE public.service_procurement_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    requirement text NOT NULL,
    sourcing_path text NOT NULL,
    sourcing_reason text NOT NULL,
    sourcing_evidence text NOT NULL,
    selection_status text NOT NULL DEFAULT 'open',
    selected_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    selection_reason text,
    selection_evidence text,
    selected_at timestamptz,
    selected_by text,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_by text NOT NULL,
    CONSTRAINT service_procurement_requirements_requirement_check CHECK (
        char_length(btrim(requirement)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT service_procurement_requirements_sourcing_path_check CHECK (
        sourcing_path IN ('make', 'rent', 'buy', 'source', 'sole_source', 'emergency')
    ),
    CONSTRAINT service_procurement_requirements_sourcing_reason_check CHECK (
        char_length(btrim(sourcing_reason)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT service_procurement_requirements_sourcing_evidence_check CHECK (
        char_length(btrim(sourcing_evidence)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT service_procurement_requirements_selection_status_check CHECK (
        selection_status IN ('open', 'selected')
    ),
    CONSTRAINT service_procurement_requirements_selection_consistency_check CHECK (
        (
            selection_status = 'open'
            AND selected_supplier_id IS NULL
            AND selection_reason IS NULL
            AND selection_evidence IS NULL
            AND selected_at IS NULL
            AND selected_by IS NULL
        )
        OR (
            selection_status = 'selected'
            AND selected_supplier_id IS NOT NULL
            AND selection_reason IS NOT NULL
            AND char_length(btrim(selection_reason)) BETWEEN 1 AND 2000
            AND selection_evidence IS NOT NULL
            AND char_length(btrim(selection_evidence)) BETWEEN 1 AND 2000
            AND selected_at IS NOT NULL
            AND selected_by IS NOT NULL
            AND char_length(btrim(selected_by)) BETWEEN 1 AND 255
        )
    )
);

-- The Service Detail requirement list filters by service_id and orders by the
-- bounded creation chronology. This is the only non-constraint index added.
CREATE INDEX service_procurement_requirements_service_created_idx
    ON public.service_procurement_requirements(service_id, created_at DESC, id DESC);

CREATE TABLE public.service_procurement_candidates (
    requirement_id uuid NOT NULL REFERENCES public.service_procurement_requirements(id) ON DELETE RESTRICT,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    offer_summary text NOT NULL,
    evidence_ref text NOT NULL,
    quoted_amount numeric(14,2),
    currency text NOT NULL DEFAULT 'SAR',
    comparison_notes text,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_by text NOT NULL,
    PRIMARY KEY (requirement_id, supplier_id),
    CONSTRAINT service_procurement_candidates_offer_summary_check CHECK (
        char_length(btrim(offer_summary)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT service_procurement_candidates_evidence_ref_check CHECK (
        char_length(btrim(evidence_ref)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT service_procurement_candidates_quoted_amount_check CHECK (
        quoted_amount IS NULL OR (quoted_amount >= 0 AND quoted_amount <= 999999999999.99)
    ),
    CONSTRAINT service_procurement_candidates_currency_check CHECK (currency = 'SAR'),
    CONSTRAINT service_procurement_candidates_comparison_notes_check CHECK (
        comparison_notes IS NULL OR char_length(comparison_notes) <= 2000
    )
);

ALTER TABLE public.service_procurement_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_procurement_candidates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_procurement_requirements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.service_procurement_candidates FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.service_procurement_requirements TO service_role;
GRANT ALL ON TABLE public.service_procurement_candidates TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_service_procurement_requirement(
    p_requirement_id uuid,
    p_service_id uuid,
    p_requirement text,
    p_sourcing_path text,
    p_sourcing_reason text,
    p_sourcing_evidence text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    requirement_id uuid,
    service_id uuid,
    selection_status text,
    selected_supplier_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_requirement text := NULLIF(btrim(p_requirement), '');
    v_sourcing_reason text := NULLIF(btrim(p_sourcing_reason), '');
    v_sourcing_evidence text := NULLIF(btrim(p_sourcing_evidence), '');
    v_audit_entity_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
    v_requirement_id uuid;
    v_selection_status text;
    v_selected_supplier_id uuid;
    v_before jsonb;
    v_action text;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'procurement_request_invalid', p_requirement_id, p_service_id, NULL::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'procurement_permission_denied', p_requirement_id, p_service_id, NULL::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_service_id IS NULL THEN
        RETURN QUERY SELECT 'service_not_found', p_requirement_id, p_service_id, NULL::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_sourcing_path IS NULL
        OR p_sourcing_path NOT IN ('make', 'rent', 'buy', 'source', 'sole_source', 'emergency')
    THEN
        RETURN QUERY SELECT 'procurement_sourcing_path_invalid', p_requirement_id, p_service_id, NULL::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_requirement IS NULL OR char_length(v_requirement) > 2000
        OR v_sourcing_reason IS NULL OR char_length(v_sourcing_reason) > 2000
        OR v_sourcing_evidence IS NULL OR char_length(v_sourcing_evidence) > 2000
    THEN
        RETURN QUERY SELECT 'procurement_requirement_fields_required', p_requirement_id, p_service_id, NULL::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Exception paths never bypass evidence. The universal checks above also
    -- require reason/evidence for ordinary sourcing paths.
    IF p_sourcing_path IN ('emergency', 'sole_source')
        AND (v_sourcing_reason IS NULL OR v_sourcing_evidence IS NULL)
    THEN
        RETURN QUERY SELECT 'procurement_exception_evidence_required', p_requirement_id, p_service_id, NULL::text, NULL::uuid, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-procurement:' || p_request_id::text, 0));

    SELECT s.id
    INTO v_requirement_id
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_procurement_service_locked', p_requirement_id, p_service_id, NULL::text, NULL::uuid, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'requirement_id', p_requirement_id,
        'service_id', p_service_id,
        'requirement', v_requirement,
        'sourcing_path', p_sourcing_path,
        'sourcing_reason', v_sourcing_reason,
        'sourcing_evidence', v_sourcing_evidence
    );

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_audit_entity_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'service_procurement_requirement'
      AND a.details ->> 'operation' = 'requirement_upsert'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'procurement_request_conflict', v_audit_entity_id, p_service_id, NULL::text, NULL::uuid, false;
            RETURN;
        END IF;

        SELECT r.id, r.selection_status, r.selected_supplier_id
        INTO v_requirement_id, v_selection_status, v_selected_supplier_id
        FROM public.service_procurement_requirements r
        WHERE r.id = v_audit_entity_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'procurement_requirement_unavailable', v_audit_entity_id, p_service_id, NULL::text, NULL::uuid, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, v_requirement_id, p_service_id, v_selection_status, v_selected_supplier_id, true;
        RETURN;
    END IF;

    IF p_requirement_id IS NULL THEN
        INSERT INTO public.service_procurement_requirements(
            service_id, requirement, sourcing_path, sourcing_reason,
            sourcing_evidence, created_at, created_by, updated_at, updated_by
        ) VALUES (
            p_service_id, v_requirement, p_sourcing_path, v_sourcing_reason,
            v_sourcing_evidence, v_now, p_actor_id, v_now, p_actor_id
        )
        RETURNING id, selection_status, selected_supplier_id
        INTO v_requirement_id, v_selection_status, v_selected_supplier_id;

        v_action := 'create';
    ELSE
        SELECT
            r.selection_status,
            r.selected_supplier_id,
            jsonb_build_object(
                'requirement', r.requirement,
                'sourcing_path', r.sourcing_path,
                'sourcing_reason', r.sourcing_reason,
                'sourcing_evidence', r.sourcing_evidence
            )
        INTO v_selection_status, v_selected_supplier_id, v_before
        FROM public.service_procurement_requirements r
        WHERE r.id = p_requirement_id
          AND r.service_id = p_service_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'procurement_requirement_not_found', p_requirement_id, p_service_id, NULL::text, NULL::uuid, false;
            RETURN;
        END IF;

        UPDATE public.service_procurement_requirements r
        SET requirement = v_requirement,
            sourcing_path = p_sourcing_path,
            sourcing_reason = v_sourcing_reason,
            sourcing_evidence = v_sourcing_evidence,
            updated_at = v_now,
            updated_by = p_actor_id
        WHERE r.id = p_requirement_id
        RETURNING r.id, r.selection_status, r.selected_supplier_id
        INTO v_requirement_id, v_selection_status, v_selected_supplier_id;

        v_action := 'update';
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        v_action,
        'service_procurement_requirement',
        v_requirement_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', CASE WHEN v_action = 'create' THEN 'procurement_requirement_created' ELSE 'procurement_requirement_updated' END,
            'operation', 'requirement_upsert',
            'w4_version', 'w4-v1',
            'request_id', p_request_id::text,
            'service_id', p_service_id,
            'requirement_id', v_requirement_id,
            'actor_role', p_actor_role,
            'reason', v_sourcing_reason,
            'evidence_ref', v_sourcing_evidence,
            'from', v_before,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_requirement_id, p_service_id, v_selection_status, v_selected_supplier_id, false;
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
    ON CONFLICT (requirement_id, supplier_id) DO UPDATE
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

CREATE OR REPLACE FUNCTION public.select_service_procurement_supplier(
    p_requirement_id uuid,
    p_supplier_id uuid,
    p_selection_reason text,
    p_selection_evidence text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    requirement_id uuid,
    selected_supplier_id uuid,
    service_id uuid,
    selection_status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_selection_reason text := NULLIF(btrim(p_selection_reason), '');
    v_selection_evidence text := NULLIF(btrim(p_selection_evidence), '');
    v_service_id uuid;
    v_current_supplier_id uuid;
    v_current_status text;
    v_audit_payload jsonb;
    v_payload jsonb;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'procurement_request_invalid', p_requirement_id, p_supplier_id, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'procurement_permission_denied', p_requirement_id, p_supplier_id, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF p_requirement_id IS NULL OR p_supplier_id IS NULL
        OR v_selection_reason IS NULL OR char_length(v_selection_reason) > 2000
        OR v_selection_evidence IS NULL OR char_length(v_selection_evidence) > 2000
    THEN
        RETURN QUERY SELECT 'procurement_selection_evidence_required', p_requirement_id, p_supplier_id, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-procurement:' || p_request_id::text, 0));

    SELECT r.service_id, r.selected_supplier_id, r.selection_status
    INTO v_service_id, v_current_supplier_id, v_current_status
    FROM public.service_procurement_requirements r
    JOIN public.services s ON s.id = r.service_id
    WHERE r.id = p_requirement_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE OF r, s;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'procurement_requirement_unavailable', p_requirement_id, p_supplier_id, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'requirement_id', p_requirement_id,
        'supplier_id', p_supplier_id,
        'selection_reason', v_selection_reason,
        'selection_evidence', v_selection_evidence
    );

    SELECT a.details -> 'payload'
    INTO v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'service_procurement_requirement'
      AND a.entity_id = p_requirement_id
      AND a.details ->> 'operation' = 'supplier_selection'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'procurement_request_conflict', p_requirement_id, p_supplier_id, v_service_id, v_current_status, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, p_requirement_id, v_current_supplier_id, v_service_id, v_current_status, true;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.suppliers sp
        WHERE sp.id = p_supplier_id
          AND sp.status = 'active'
          AND COALESCE(sp.is_deleted, false) = false
          AND sp.deleted_at IS NULL
    ) THEN
        RETURN QUERY SELECT 'procurement_supplier_unavailable', p_requirement_id, p_supplier_id, v_service_id, v_current_status, false;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.service_procurement_candidates c
        WHERE c.requirement_id = p_requirement_id
          AND c.supplier_id = p_supplier_id
    ) THEN
        RETURN QUERY SELECT 'procurement_candidate_required', p_requirement_id, p_supplier_id, v_service_id, v_current_status, false;
        RETURN;
    END IF;

    UPDATE public.service_procurement_requirements r
    SET selection_status = 'selected',
        selected_supplier_id = p_supplier_id,
        selection_reason = v_selection_reason,
        selection_evidence = v_selection_evidence,
        selected_at = v_now,
        selected_by = p_actor_id,
        updated_at = v_now,
        updated_by = p_actor_id
    WHERE r.id = p_requirement_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'service_procurement_requirement',
        p_requirement_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'procurement_supplier_selected',
            'operation', 'supplier_selection',
            'w4_version', 'w4-v1',
            'request_id', p_request_id::text,
            'service_id', v_service_id,
            'requirement_id', p_requirement_id,
            'supplier_id', p_supplier_id,
            'actor_role', p_actor_role,
            'from_supplier_id', v_current_supplier_id,
            'from_status', v_current_status,
            'to_status', 'selected',
            'reason', v_selection_reason,
            'evidence_ref', v_selection_evidence,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_requirement_id, p_supplier_id, v_service_id, 'selected'::text, false;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_service_procurement_requirement(uuid,uuid,text,text,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.upsert_service_procurement_candidate(uuid,uuid,text,text,numeric,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.select_service_procurement_supplier(uuid,uuid,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_service_procurement_requirement(uuid,uuid,text,text,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_service_procurement_candidate(uuid,uuid,text,text,numeric,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.select_service_procurement_supplier(uuid,uuid,text,text,uuid,text,text) TO service_role;

COMMIT;
