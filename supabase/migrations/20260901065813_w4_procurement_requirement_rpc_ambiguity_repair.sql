-- W4 corrective migration: qualify the requirement create-path RETURNING list.
-- The original W4 migration is already applied and is intentionally unchanged.
BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.upsert_service_procurement_requirement(uuid,uuid,text,text,text,text,uuid,text,text)') IS NULL THEN
        RAISE EXCEPTION 'W4 corrective preflight: requirement RPC is missing';
    END IF;
END;
$$;

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
        INSERT INTO public.service_procurement_requirements AS spr(
            service_id, requirement, sourcing_path, sourcing_reason,
            sourcing_evidence, created_at, created_by, updated_at, updated_by
        ) VALUES (
            p_service_id, v_requirement, p_sourcing_path, v_sourcing_reason,
            v_sourcing_evidence, v_now, p_actor_id, v_now, p_actor_id
        )
        RETURNING spr.id, spr.selection_status, spr.selected_supplier_id
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

COMMIT;
