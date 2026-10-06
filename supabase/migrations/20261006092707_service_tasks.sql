-- Service-scoped Event Tasks persistence and server-mediated mutation authority.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.app_users') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'service_tasks preflight: required table missing';
    END IF;

    IF to_regclass('public.service_tasks') IS NOT NULL THEN
        RAISE EXCEPTION 'service_tasks preflight: target table already exists';
    END IF;

    IF to_regprocedure('public.create_service_task_atomic(text,uuid,text,text,uuid,date)') IS NOT NULL
        OR to_regprocedure('public.update_service_task_fields_atomic(text,uuid,uuid,jsonb)') IS NOT NULL
        OR to_regprocedure('public.transition_service_task_status_atomic(text,uuid,uuid,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'service_tasks preflight: mutation signature already exists';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc AS p
        JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'create_service_task_atomic',
              'update_service_task_fields_atomic',
              'transition_service_task_status_atomic'
          )
    ) THEN
        RAISE EXCEPTION 'service_tasks preflight: unexpected mutation overload exists';
    END IF;
END;
$$;

CREATE TABLE public.service_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text,
    assignee_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'open',
    due_date date,
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by text NOT NULL,
    CONSTRAINT service_tasks_title_nonblank_check
        CHECK (length(btrim(title)) > 0),
    CONSTRAINT service_tasks_status_check
        CHECK (status IN ('open', 'in_progress', 'completed'))
);

CREATE INDEX idx_service_tasks_service_id
    ON public.service_tasks (service_id);

CREATE TRIGGER update_service_tasks_updated_at
BEFORE UPDATE ON public.service_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.service_tasks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.service_tasks FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.service_tasks TO service_role;

CREATE FUNCTION public.create_service_task_atomic(
    p_actor_id text,
    p_service_id uuid,
    p_title text,
    p_description text,
    p_assignee_user_id uuid,
    p_due_date date
)
RETURNS public.service_tasks
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_service_status text;
    v_task public.service_tasks%ROWTYPE;
    v_title text;
    v_now timestamptz := pg_catalog.transaction_timestamp();
BEGIN
    IF NULLIF(pg_catalog.btrim(p_actor_id), '') IS NULL THEN
        RAISE EXCEPTION 'service_task_actor_required';
    END IF;

    IF p_service_id IS NULL THEN
        RAISE EXCEPTION 'service_task_service_required';
    END IF;

    v_title := pg_catalog.btrim(p_title);
    IF NULLIF(v_title, '') IS NULL THEN
        RAISE EXCEPTION 'service_task_title_required';
    END IF;

    SELECT s.status
    INTO v_service_status
    FROM public.services AS s
    WHERE s.id = p_service_id
      AND s.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'service_task_service_not_found';
    END IF;

    IF v_service_status IN ('Completed', 'Cancelled') THEN
        RAISE EXCEPTION 'service_task_service_closed';
    END IF;

    IF p_assignee_user_id IS NOT NULL THEN
        PERFORM u.id
        FROM public.app_users AS u
        WHERE u.id = p_assignee_user_id
          AND u.is_active IS TRUE
        FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'service_task_assignee_inactive_or_missing';
        END IF;
    END IF;

    INSERT INTO public.service_tasks (
        service_id,
        title,
        description,
        assignee_user_id,
        status,
        due_date,
        created_at,
        created_by,
        updated_at,
        updated_by
    )
    VALUES (
        p_service_id,
        v_title,
        p_description,
        p_assignee_user_id,
        'open',
        p_due_date,
        v_now,
        p_actor_id,
        v_now,
        p_actor_id
    )
    RETURNING * INTO v_task;

    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        timestamp
    )
    VALUES (
        'create',
        'service_task',
        v_task.id,
        p_actor_id,
        pg_catalog.jsonb_build_object(
            'event_type', 'task_created',
            'task_id', v_task.id,
            'service_id', v_task.service_id,
            'actor_id', p_actor_id,
            'transaction_timestamp', v_now,
            'after', pg_catalog.jsonb_build_object(
                'title', v_task.title,
                'description', v_task.description,
                'assignee_user_id', v_task.assignee_user_id,
                'status', v_task.status,
                'due_date', v_task.due_date
            )
        ),
        v_now
    );

    RETURN v_task;
END;
$$;

CREATE FUNCTION public.update_service_task_fields_atomic(
    p_actor_id text,
    p_service_id uuid,
    p_task_id uuid,
    p_changes jsonb
)
RETURNS public.service_tasks
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_service_status text;
    v_task public.service_tasks%ROWTYPE;
    v_title text;
    v_description text;
    v_assignee_user_id uuid;
    v_due_date date;
    v_audit_changes jsonb := '{}'::jsonb;
    v_now timestamptz := pg_catalog.transaction_timestamp();
BEGIN
    IF NULLIF(pg_catalog.btrim(p_actor_id), '') IS NULL THEN
        RAISE EXCEPTION 'service_task_actor_required';
    END IF;

    IF p_service_id IS NULL OR p_task_id IS NULL THEN
        RAISE EXCEPTION 'service_task_identity_required';
    END IF;

    IF pg_catalog.jsonb_typeof(p_changes) IS DISTINCT FROM 'object'
        OR p_changes = '{}'::jsonb
        OR (p_changes - ARRAY['title', 'description', 'assignee_user_id', 'due_date']::text[]) <> '{}'::jsonb
    THEN
        RAISE EXCEPTION 'service_task_changes_invalid';
    END IF;

    SELECT s.status
    INTO v_service_status
    FROM public.services AS s
    WHERE s.id = p_service_id
      AND s.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'service_task_service_not_found';
    END IF;

    IF v_service_status IN ('Completed', 'Cancelled') THEN
        RAISE EXCEPTION 'service_task_service_closed';
    END IF;

    SELECT st.*
    INTO v_task
    FROM public.service_tasks AS st
    WHERE st.id = p_task_id
      AND st.service_id = p_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'service_task_not_found';
    END IF;

    IF v_task.status = 'completed' THEN
        RAISE EXCEPTION 'service_task_completed_read_only';
    END IF;

    v_title := v_task.title;
    v_description := v_task.description;
    v_assignee_user_id := v_task.assignee_user_id;
    v_due_date := v_task.due_date;

    IF p_changes ? 'title' THEN
        IF pg_catalog.jsonb_typeof(p_changes -> 'title') IS DISTINCT FROM 'string' THEN
            RAISE EXCEPTION 'service_task_title_invalid';
        END IF;
        v_title := pg_catalog.btrim(p_changes ->> 'title');
        IF NULLIF(v_title, '') IS NULL THEN
            RAISE EXCEPTION 'service_task_title_required';
        END IF;
    END IF;

    IF p_changes ? 'description' THEN
        IF pg_catalog.jsonb_typeof(p_changes -> 'description') NOT IN ('string', 'null') THEN
            RAISE EXCEPTION 'service_task_description_invalid';
        END IF;
        v_description := p_changes ->> 'description';
    END IF;

    IF p_changes ? 'assignee_user_id' THEN
        IF pg_catalog.jsonb_typeof(p_changes -> 'assignee_user_id') = 'null' THEN
            v_assignee_user_id := NULL;
        ELSIF pg_catalog.jsonb_typeof(p_changes -> 'assignee_user_id') = 'string' THEN
            BEGIN
                v_assignee_user_id := (p_changes ->> 'assignee_user_id')::uuid;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    RAISE EXCEPTION 'service_task_assignee_invalid';
            END;
        ELSE
            RAISE EXCEPTION 'service_task_assignee_invalid';
        END IF;
    END IF;

    IF p_changes ? 'due_date' THEN
        IF pg_catalog.jsonb_typeof(p_changes -> 'due_date') = 'null' THEN
            v_due_date := NULL;
        ELSIF pg_catalog.jsonb_typeof(p_changes -> 'due_date') = 'string'
            AND (p_changes ->> 'due_date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN
            BEGIN
                v_due_date := (p_changes ->> 'due_date')::date;
            EXCEPTION
                WHEN invalid_datetime_format OR datetime_field_overflow THEN
                    RAISE EXCEPTION 'service_task_due_date_invalid';
            END;
        ELSE
            RAISE EXCEPTION 'service_task_due_date_invalid';
        END IF;
    END IF;

    IF v_task.assignee_user_id IS DISTINCT FROM v_assignee_user_id
        AND v_assignee_user_id IS NOT NULL
    THEN
        PERFORM u.id
        FROM public.app_users AS u
        WHERE u.id = v_assignee_user_id
          AND u.is_active IS TRUE
        FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'service_task_assignee_inactive_or_missing';
        END IF;
    END IF;

    IF v_task.title IS DISTINCT FROM v_title THEN
        v_audit_changes := v_audit_changes || pg_catalog.jsonb_build_object(
            'title', pg_catalog.jsonb_build_object('before', v_task.title, 'after', v_title)
        );
    END IF;
    IF v_task.description IS DISTINCT FROM v_description THEN
        v_audit_changes := v_audit_changes || pg_catalog.jsonb_build_object(
            'description', pg_catalog.jsonb_build_object('before', v_task.description, 'after', v_description)
        );
    END IF;
    IF v_task.assignee_user_id IS DISTINCT FROM v_assignee_user_id THEN
        v_audit_changes := v_audit_changes || pg_catalog.jsonb_build_object(
            'assignee_user_id', pg_catalog.jsonb_build_object('before', v_task.assignee_user_id, 'after', v_assignee_user_id)
        );
    END IF;
    IF v_task.due_date IS DISTINCT FROM v_due_date THEN
        v_audit_changes := v_audit_changes || pg_catalog.jsonb_build_object(
            'due_date', pg_catalog.jsonb_build_object('before', v_task.due_date, 'after', v_due_date)
        );
    END IF;

    IF v_audit_changes = '{}'::jsonb THEN
        RETURN v_task;
    END IF;

    UPDATE public.service_tasks AS st
    SET title = v_title,
        description = v_description,
        assignee_user_id = v_assignee_user_id,
        due_date = v_due_date,
        updated_by = p_actor_id
    WHERE st.id = p_task_id
      AND st.service_id = p_service_id
      AND st.status <> 'completed'
    RETURNING st.* INTO v_task;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'service_task_update_conflict';
    END IF;

    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        timestamp
    )
    VALUES (
        'update',
        'service_task',
        v_task.id,
        p_actor_id,
        pg_catalog.jsonb_build_object(
            'event_type', 'task_updated',
            'task_id', v_task.id,
            'service_id', v_task.service_id,
            'actor_id', p_actor_id,
            'transaction_timestamp', v_now,
            'changes', v_audit_changes
        ),
        v_now
    );

    RETURN v_task;
END;
$$;

CREATE FUNCTION public.transition_service_task_status_atomic(
    p_actor_id text,
    p_service_id uuid,
    p_task_id uuid,
    p_to_status text
)
RETURNS public.service_tasks
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_service_status text;
    v_task public.service_tasks%ROWTYPE;
    v_event_type text;
    v_from_status text;
    v_now timestamptz := pg_catalog.transaction_timestamp();
BEGIN
    IF NULLIF(pg_catalog.btrim(p_actor_id), '') IS NULL THEN
        RAISE EXCEPTION 'service_task_actor_required';
    END IF;

    IF p_service_id IS NULL OR p_task_id IS NULL THEN
        RAISE EXCEPTION 'service_task_identity_required';
    END IF;

    IF p_to_status IS NULL OR p_to_status NOT IN ('open', 'in_progress', 'completed') THEN
        RAISE EXCEPTION 'service_task_status_invalid';
    END IF;

    SELECT s.status
    INTO v_service_status
    FROM public.services AS s
    WHERE s.id = p_service_id
      AND s.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'service_task_service_not_found';
    END IF;

    IF v_service_status IN ('Completed', 'Cancelled') THEN
        RAISE EXCEPTION 'service_task_service_closed';
    END IF;

    SELECT st.*
    INTO v_task
    FROM public.service_tasks AS st
    WHERE st.id = p_task_id
      AND st.service_id = p_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'service_task_not_found';
    END IF;

    IF v_task.status = 'completed' THEN
        RAISE EXCEPTION 'service_task_completed_read_only';
    END IF;

    IF NOT (
        (v_task.status = 'open' AND p_to_status IN ('in_progress', 'completed'))
        OR (v_task.status = 'in_progress' AND p_to_status = 'completed')
    ) THEN
        RAISE EXCEPTION 'service_task_status_transition_invalid';
    END IF;

    v_from_status := v_task.status;

    IF v_task.assignee_user_id IS NULL THEN
        RAISE EXCEPTION 'service_task_active_assignee_required';
    END IF;

    PERFORM u.id
    FROM public.app_users AS u
    WHERE u.id = v_task.assignee_user_id
      AND u.is_active IS TRUE
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'service_task_active_assignee_required';
    END IF;

    v_event_type := CASE
        WHEN p_to_status = 'completed' THEN 'task_completed'
        ELSE 'task_status_changed'
    END;

    UPDATE public.service_tasks AS st
    SET status = p_to_status,
        updated_by = p_actor_id
    WHERE st.id = p_task_id
      AND st.service_id = p_service_id
      AND st.status = v_from_status
      AND st.status <> 'completed'
    RETURNING st.* INTO v_task;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'service_task_transition_conflict';
    END IF;

    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        timestamp
    )
    VALUES (
        'status_change',
        'service_task',
        v_task.id,
        p_actor_id,
        pg_catalog.jsonb_build_object(
            'event_type', v_event_type,
            'task_id', v_task.id,
            'service_id', v_task.service_id,
            'actor_id', p_actor_id,
            'transaction_timestamp', v_now,
            'from_status', v_from_status,
            'to_status', p_to_status
        ),
        v_now
    );

    RETURN v_task;
END;
$$;

REVOKE ALL ON FUNCTION public.create_service_task_atomic(text,uuid,text,text,uuid,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_service_task_fields_atomic(text,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_service_task_status_atomic(text,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_service_task_atomic(text,uuid,text,text,uuid,date) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_service_task_fields_atomic(text,uuid,uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_service_task_status_atomic(text,uuid,uuid,text) TO service_role;

COMMIT;
