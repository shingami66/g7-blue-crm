-- W4 corrective migration: qualify the procurement package create-path RETURNING list.
-- The original W4 foundation migration is already applied and is intentionally unchanged.
BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.upsert_procurement_package(uuid,uuid,text,text,text,uuid,text,text)') IS NULL THEN
        RAISE EXCEPTION 'W4 package ambiguity repair preflight: upsert_procurement_package RPC is missing';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_procurement_package(
    p_package_id uuid,
    p_service_id uuid,
    p_name text,
    p_description text,
    p_procurement_method text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    package_id uuid,
    service_id uuid,
    status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_name text := NULLIF(btrim(p_name), '');
    v_description text := NULLIF(btrim(p_description), '');
    v_procurement_method text := NULLIF(btrim(p_procurement_method), '');
    v_package_id uuid;
    v_status text;
    v_before jsonb;
    v_payload jsonb;
    v_action text;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'procurement_package_request_invalid', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'procurement_package_permission_denied', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF p_service_id IS NULL THEN
        RETURN QUERY SELECT 'service_not_found', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF v_name IS NULL OR char_length(v_name) > 255 THEN
        RETURN QUERY SELECT 'procurement_package_name_invalid', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF v_description IS NOT NULL AND char_length(v_description) > 2000 THEN
        RETURN QUERY SELECT 'procurement_package_description_invalid', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF v_procurement_method IS NOT NULL
        AND v_procurement_method NOT IN ('rental', 'purchase', 'service')
    THEN
        RETURN QUERY SELECT 'procurement_package_method_invalid', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-procurement-package:' || p_request_id::text, 0));

    IF NOT EXISTS (
        SELECT 1
        FROM public.services s
        WHERE s.id = p_service_id
          AND s.deleted_at IS NULL
          AND s.status NOT IN ('Completed', 'Cancelled')
    ) THEN
        RETURN QUERY SELECT 'service_procurement_service_locked', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'package_id', p_package_id,
        'service_id', p_service_id,
        'name', v_name,
        'description', v_description,
        'procurement_method', v_procurement_method
    );

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_package_id, v_before
    FROM public.audit_logs a
    WHERE a.action IN ('procurement_package_created', 'procurement_package_updated')
      AND a.entity_type = 'procurement_package'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC
    LIMIT 1;

    IF v_package_id IS NOT NULL THEN
        IF v_before = v_payload THEN
            SELECT pkg.status
            INTO v_status
            FROM public.service_procurement_packages pkg
            WHERE pkg.id = v_package_id;

            RETURN QUERY SELECT NULL::text, v_package_id, p_service_id, v_status, true;
            RETURN;
        END IF;

        RETURN QUERY SELECT 'request_id_conflict', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF p_package_id IS NULL THEN
        INSERT INTO public.service_procurement_packages AS pkg (
            service_id,
            name,
            description,
            procurement_method,
            status,
            created_at,
            created_by,
            updated_at,
            updated_by
        ) VALUES (
            p_service_id,
            v_name,
            v_description,
            v_procurement_method,
            'draft',
            v_now,
            p_actor_id,
            v_now,
            p_actor_id
        )
        RETURNING pkg.id, pkg.status INTO v_package_id, v_status;

        v_action := 'procurement_package_created';
        v_before := NULL;
    ELSE
        SELECT to_jsonb(pkg.*), pkg.status
        INTO v_before, v_status
        FROM public.service_procurement_packages pkg
        WHERE pkg.id = p_package_id
          AND pkg.service_id = p_service_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'procurement_package_not_found', p_package_id, p_service_id, NULL::text, false;
            RETURN;
        END IF;

        UPDATE public.service_procurement_packages pkg
        SET name = v_name,
            description = v_description,
            procurement_method = v_procurement_method,
            updated_at = v_now,
            updated_by = p_actor_id
        WHERE pkg.id = p_package_id
          AND pkg.service_id = p_service_id
        RETURNING pkg.id, pkg.status INTO v_package_id, v_status;

        v_action := 'procurement_package_updated';
    END IF;

    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        timestamp
    ) VALUES (
        v_action,
        'procurement_package',
        v_package_id,
        p_actor_id,
        jsonb_build_object(
            'service_id', p_service_id::text,
            'request_id', p_request_id::text,
            'from', v_before,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_package_id, p_service_id, v_status, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_procurement_package TO service_role;

COMMIT;
