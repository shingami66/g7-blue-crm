-- Migration: 20260831100000_w1a_permission_override_persistence.sql
-- W1A: Minimum user-specific permission override persistence.
-- Scope: quotations:approve only; runtime authorization evaluation is a later task.
-- All writes are audited through the SECURITY DEFINER RPC below.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.app_users') IS NULL
        OR to_regclass('public.audit_logs') IS NULL THEN
        RAISE EXCEPTION 'w1a_permission_override_persistence preflight: required table missing';
    END IF;

    IF EXISTS (
        SELECT 1 FROM (VALUES
            ('app_users', 'id', 'uuid'),
            ('app_users', 'clerk_user_id', 'text'),
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
        RAISE EXCEPTION 'w1a_permission_override_persistence preflight: required column or type missing';
    END IF;

    IF to_regclass('public.app_user_permission_overrides') IS NOT NULL THEN
        RAISE EXCEPTION 'w1a_permission_override_persistence preflight: target table already exists';
    END IF;

    IF to_regprocedure('public.set_app_user_permission_override(uuid,text,text,text,text)') IS NOT NULL THEN
        RAISE EXCEPTION 'w1a_permission_override_persistence preflight: target function signature already exists';
    END IF;
END;
$$;

CREATE TABLE public.app_user_permission_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    permission text NOT NULL,
    effect text NOT NULL,
    created_by text NOT NULL,
    updated_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT app_user_permission_overrides_user_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.app_users(id)
        ON DELETE RESTRICT,
    CONSTRAINT app_user_permission_overrides_user_permission_key
        UNIQUE (user_id, permission),
    CONSTRAINT app_user_permission_overrides_permission_check
        CHECK (permission = 'quotations:approve'),
    CONSTRAINT app_user_permission_overrides_effect_check
        CHECK (effect IN ('allow', 'deny')),
    CONSTRAINT app_user_permission_overrides_created_by_nonblank_check
        CHECK (btrim(created_by) <> ''),
    CONSTRAINT app_user_permission_overrides_updated_by_nonblank_check
        CHECK (btrim(updated_by) <> '')
);

COMMENT ON TABLE public.app_user_permission_overrides IS
    'W1A user-specific permission overrides. Current slice permits only quotations:approve; runtime evaluation is separate.';
COMMENT ON COLUMN public.app_user_permission_overrides.created_by IS
    'Clerk userId string for the actor that created the override.';
COMMENT ON COLUMN public.app_user_permission_overrides.updated_by IS
    'Clerk userId string for the actor that last changed the override.';

CREATE TRIGGER update_app_user_permission_overrides_updated_at
BEFORE UPDATE ON public.app_user_permission_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.app_user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- The relation is server/service-role readable only. All writes must use the audited RPC.
REVOKE ALL ON TABLE public.app_user_permission_overrides FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.app_user_permission_overrides FROM service_role;
GRANT SELECT ON TABLE public.app_user_permission_overrides TO service_role;

CREATE FUNCTION public.set_app_user_permission_override(
    p_user_id uuid,
    p_permission text,
    p_effect text,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    user_id uuid,
    permission text,
    effect text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_target_clerk_id text;
    v_existing_override_id uuid;
    v_old_effect text;
    v_permission text := btrim(p_permission);
    v_effect text := btrim(p_effect);
    v_actor_id text := btrim(p_actor_id);
    v_actor_role text := btrim(p_actor_role);
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_user_id IS NULL OR v_permission IS NULL OR v_permission = '' OR v_effect IS NULL OR v_effect = '' THEN
        RETURN QUERY SELECT 'invalid_input'::text, p_user_id, NULL::text, NULL::text, false;
        RETURN;
    END IF;

    IF v_actor_id IS NULL OR v_actor_id = '' OR v_actor_role IS NULL OR v_actor_role = '' THEN
        RETURN QUERY SELECT 'invalid_actor'::text, p_user_id, NULL::text, NULL::text, false;
        RETURN;
    END IF;

    IF v_permission <> 'quotations:approve' THEN
        RETURN QUERY SELECT 'invalid_permission'::text, p_user_id, v_permission, NULL::text, false;
        RETURN;
    END IF;

    IF v_effect NOT IN ('allow', 'deny') THEN
        RETURN QUERY SELECT 'invalid_effect'::text, p_user_id, v_permission, v_effect, false;
        RETURN;
    END IF;

    -- Serialize mutations for one app user before reading/upserting its override.
    SELECT u.clerk_user_id
    INTO v_target_clerk_id
    FROM public.app_users u
    WHERE u.id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'user_not_found'::text, p_user_id, v_permission, NULL::text, false;
        RETURN;
    END IF;

    SELECT o.id, o.effect
    INTO v_existing_override_id, v_old_effect
    FROM public.app_user_permission_overrides o
    WHERE o.user_id = p_user_id
      AND o.permission = v_permission
    FOR UPDATE;

    IF FOUND THEN
        IF v_old_effect = v_effect THEN
            RETURN QUERY SELECT NULL::text, p_user_id, v_permission, v_effect, true;
            RETURN;
        END IF;

        UPDATE public.app_user_permission_overrides o
        SET effect = v_effect,
            updated_by = v_actor_id,
            updated_at = v_now
        WHERE o.id = v_existing_override_id;

        INSERT INTO public.audit_logs (
            action, entity_type, entity_id, user_id, details, timestamp
        ) VALUES (
            'update',
            'app_user_permission_override',
            v_existing_override_id,
            v_actor_id,
            jsonb_build_object(
                'event_type', 'app_user_permission_override_updated',
                'actor_id', v_actor_id,
                'actor_role', v_actor_role,
                'target_user_id', p_user_id,
                'permission', v_permission,
                'old_effect', v_old_effect,
                'new_effect', v_effect,
                'transaction_timestamp', v_now
            ),
            v_now
        );

        RETURN QUERY SELECT NULL::text, p_user_id, v_permission, v_effect, false;
        RETURN;
    END IF;

    INSERT INTO public.app_user_permission_overrides (
        user_id, permission, effect, created_by, updated_by, created_at, updated_at
    ) VALUES (
        p_user_id, v_permission, v_effect, v_actor_id, v_actor_id, v_now, v_now
    )
    RETURNING id INTO v_existing_override_id;

    INSERT INTO public.audit_logs (
        action, entity_type, entity_id, user_id, details, timestamp
    ) VALUES (
        'create',
        'app_user_permission_override',
        v_existing_override_id,
        v_actor_id,
        jsonb_build_object(
            'event_type', 'app_user_permission_override_created',
            'actor_id', v_actor_id,
            'actor_role', v_actor_role,
            'target_user_id', p_user_id,
            'permission', v_permission,
            'new_effect', v_effect,
            'transaction_timestamp', v_now
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_user_id, v_permission, v_effect, false;
END;
$$;

REVOKE ALL ON FUNCTION public.set_app_user_permission_override(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_app_user_permission_override(uuid, text, text, text, text) TO service_role;

COMMIT;
