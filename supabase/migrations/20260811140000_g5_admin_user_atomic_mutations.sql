-- Migration: 20260811140000_g5_admin_user_atomic_mutations.sql
-- Goal G5: Admin Security and Desired-State Mutations
-- Atomic last-active-admin invariant, privileged audit logging, and idempotent updates.

BEGIN;

DO $$
BEGIN
    -- 1. Check required tables exist
    IF to_regclass('public.app_users') IS NULL
        OR to_regclass('public.audit_logs') IS NULL THEN
        RAISE EXCEPTION 'g5_admin_user_atomic_mutations preflight: required table missing';
    END IF;

    -- 2. Check required columns and types on app_users and audit_logs
    IF EXISTS (
        SELECT 1 FROM (VALUES
            ('app_users', 'id', 'uuid'),
            ('app_users', 'clerk_user_id', 'text'),
            ('app_users', 'role', 'text'),
            ('app_users', 'is_active', 'boolean'),
            ('app_users', 'created_at', 'timestamp with time zone'),
            ('app_users', 'updated_at', 'timestamp with time zone'),
            ('audit_logs', 'id', 'uuid'),
            ('audit_logs', 'action', 'text'),
            ('audit_logs', 'entity_type', 'text'),
            ('audit_logs', 'entity_id', 'uuid'),
            ('audit_logs', 'user_id', 'text'),
            ('audit_logs', 'details', 'jsonb'),
            ('audit_logs', 'timestamp', 'timestamp with time zone')
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
        RAISE EXCEPTION 'g5_admin_user_atomic_mutations preflight: required column or type missing';
    END IF;

    -- 3. Check for unexpected function conflicts
    IF to_regprocedure('public.update_app_user_role(uuid,text,text,text)') IS NOT NULL THEN
        RAISE EXCEPTION 'g5_admin_user_atomic_mutations preflight: update_app_user_role signature already exists';
    END IF;
    IF to_regprocedure('public.set_app_user_active(uuid,boolean,text,text)') IS NOT NULL THEN
        RAISE EXCEPTION 'g5_admin_user_atomic_mutations preflight: set_app_user_active signature already exists';
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- FUNCTION: public.update_app_user_role
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.update_app_user_role(
    p_user_id uuid,
    p_role text,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    user_id uuid,
    role text,
    is_active boolean,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_target_clerk_id text;
    v_old_role text;
    v_is_active boolean;
    v_other_active_admin_count integer;
    v_new_role text := btrim(p_role);
    v_actor_id text := btrim(p_actor_id);
    v_actor_role text := btrim(p_actor_role);
    v_now timestamptz := transaction_timestamp();
BEGIN
    -- Validate parameters
    IF p_user_id IS NULL THEN
        RETURN QUERY SELECT 'invalid_input'::text, p_user_id, NULL::text, NULL::boolean, false;
        RETURN;
    END IF;

    IF v_actor_id IS NULL OR v_actor_id = '' OR v_actor_role IS NULL OR v_actor_role = '' THEN
        RETURN QUERY SELECT 'invalid_actor'::text, p_user_id, NULL::text, NULL::boolean, false;
        RETURN;
    END IF;

    IF v_new_role IS NULL OR v_new_role NOT IN ('admin', 'manager', 'sales', 'operations', 'accountant', 'viewer') THEN
        RETURN QUERY SELECT 'invalid_role'::text, p_user_id, NULL::text, NULL::boolean, false;
        RETURN;
    END IF;

    -- Acquire transaction-level advisory lock to serialize admin mutations and prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('g7_active_admin_mutation_lock'));

    -- Lock target user row
    SELECT u.clerk_user_id, u.role, u.is_active
    INTO v_target_clerk_id, v_old_role, v_is_active
    FROM public.app_users u
    WHERE u.id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'user_not_found'::text, p_user_id, NULL::text, NULL::boolean, false;
        RETURN;
    END IF;

    -- Prevent self-role change
    IF v_target_clerk_id = v_actor_id THEN
        RETURN QUERY SELECT 'cannot_change_own_role'::text, p_user_id, v_old_role, v_is_active, false;
        RETURN;
    END IF;

    -- Idempotent check: if role is already the requested role, return success without duplicate audit log
    IF v_old_role = v_new_role THEN
        RETURN QUERY SELECT NULL::text, p_user_id, v_old_role, v_is_active, true;
        RETURN;
    END IF;

    -- Invariant check: if demoting an active admin to non-admin, ensure at least one other active admin remains
    IF v_old_role = 'admin' AND v_is_active = true AND v_new_role <> 'admin' THEN
        SELECT count(*)::integer
        INTO v_other_active_admin_count
        FROM public.app_users u
        WHERE u.role = 'admin'
          AND u.is_active = true
          AND u.id <> p_user_id;

        IF v_other_active_admin_count < 1 THEN
            RETURN QUERY SELECT 'last_active_admin'::text, p_user_id, v_old_role, v_is_active, false;
            RETURN;
        END IF;
    END IF;

    -- Apply update
    UPDATE public.app_users u
    SET role = v_new_role,
        updated_at = v_now
    WHERE u.id = p_user_id;

    -- Emit audit log
    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        timestamp
    ) VALUES (
        'update',
        'app_user',
        p_user_id,
        v_actor_id,
        jsonb_build_object(
            'event_type', 'user_role_updated',
            'actor_id', v_actor_id,
            'actor_role', v_actor_role,
            'target_user_id', p_user_id,
            'old_role', v_old_role,
            'new_role', v_new_role,
            'transaction_timestamp', v_now
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_user_id, v_new_role, v_is_active, false;
END;
$$;

-- ---------------------------------------------------------------------------
-- FUNCTION: public.set_app_user_active
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.set_app_user_active(
    p_user_id uuid,
    p_is_active boolean,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    user_id uuid,
    role text,
    is_active boolean,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_target_clerk_id text;
    v_role text;
    v_old_is_active boolean;
    v_other_active_admin_count integer;
    v_actor_id text := btrim(p_actor_id);
    v_actor_role text := btrim(p_actor_role);
    v_now timestamptz := transaction_timestamp();
BEGIN
    -- Validate parameters
    IF p_user_id IS NULL OR p_is_active IS NULL THEN
        RETURN QUERY SELECT 'invalid_input'::text, p_user_id, NULL::text, NULL::boolean, false;
        RETURN;
    END IF;

    IF v_actor_id IS NULL OR v_actor_id = '' OR v_actor_role IS NULL OR v_actor_role = '' THEN
        RETURN QUERY SELECT 'invalid_actor'::text, p_user_id, NULL::text, NULL::boolean, false;
        RETURN;
    END IF;

    -- Acquire transaction-level advisory lock to serialize admin mutations and prevent race conditions
    PERFORM pg_advisory_xact_lock(hashtext('g7_active_admin_mutation_lock'));

    -- Lock target user row
    SELECT u.clerk_user_id, u.role, u.is_active
    INTO v_target_clerk_id, v_role, v_old_is_active
    FROM public.app_users u
    WHERE u.id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'user_not_found'::text, p_user_id, NULL::text, NULL::boolean, false;
        RETURN;
    END IF;

    -- Prevent self-deactivation
    IF v_target_clerk_id = v_actor_id AND p_is_active = false THEN
        RETURN QUERY SELECT 'cannot_deactivate_own_account'::text, p_user_id, v_role, v_old_is_active, false;
        RETURN;
    END IF;

    -- Idempotent check: if is_active is already the requested state, return success without duplicate audit log
    IF v_old_is_active = p_is_active THEN
        RETURN QUERY SELECT NULL::text, p_user_id, v_role, v_old_is_active, true;
        RETURN;
    END IF;

    -- Invariant check: if deactivating an active admin, ensure at least one other active admin remains
    IF v_role = 'admin' AND v_old_is_active = true AND p_is_active = false THEN
        SELECT count(*)::integer
        INTO v_other_active_admin_count
        FROM public.app_users u
        WHERE u.role = 'admin'
          AND u.is_active = true
          AND u.id <> p_user_id;

        IF v_other_active_admin_count < 1 THEN
            RETURN QUERY SELECT 'last_active_admin'::text, p_user_id, v_role, v_old_is_active, false;
            RETURN;
        END IF;
    END IF;

    -- Apply update
    UPDATE public.app_users u
    SET is_active = p_is_active,
        updated_at = v_now
    WHERE u.id = p_user_id;

    -- Emit audit log
    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        timestamp
    ) VALUES (
        'update',
        'app_user',
        p_user_id,
        v_actor_id,
        jsonb_build_object(
            'event_type', 'user_active_status_updated',
            'actor_id', v_actor_id,
            'actor_role', v_actor_role,
            'target_user_id', p_user_id,
            'old_is_active', v_old_is_active,
            'new_is_active', p_is_active,
            'transaction_timestamp', v_now
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_user_id, v_role, p_is_active, false;
END;
$$;

-- ---------------------------------------------------------------------------
-- GRANTS & REVOKES
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.update_app_user_role(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_app_user_role(uuid, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.set_app_user_active(uuid, boolean, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_app_user_active(uuid, boolean, text, text) TO service_role;

COMMIT;
