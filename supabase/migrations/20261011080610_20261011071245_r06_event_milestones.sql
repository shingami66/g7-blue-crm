-- R06: standalone, Event-linked milestone records and server-only atomic operations.

CREATE TABLE public.event_milestones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    title text NOT NULL,
    description text,
    owner_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    target_date date NOT NULL,
    status text NOT NULL DEFAULT 'planned',
    completed_at timestamptz,
    completed_by text,
    completion_note text,
    waived_at timestamptz,
    waived_by text,
    waiver_reason text,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_by text NOT NULL,
    CONSTRAINT event_milestones_title_nonblank CHECK (length(btrim(title)) BETWEEN 1 AND 200),
    CONSTRAINT event_milestones_description_length CHECK (description IS NULL OR length(description) <= 2000),
    CONSTRAINT event_milestones_completion_note_length CHECK (
        completion_note IS NULL OR length(btrim(completion_note)) BETWEEN 1 AND 1000
    ),
    CONSTRAINT event_milestones_waiver_reason_length CHECK (
        waiver_reason IS NULL OR length(btrim(waiver_reason)) BETWEEN 1 AND 1000
    ),
    CONSTRAINT event_milestones_status_check CHECK (status IN ('planned', 'completed', 'waived')),
    CONSTRAINT event_milestones_terminal_evidence_check CHECK (
        (status = 'planned'
            AND completed_at IS NULL AND completed_by IS NULL AND completion_note IS NULL
            AND waived_at IS NULL AND waived_by IS NULL AND waiver_reason IS NULL)
        OR
        (status = 'completed'
            AND completed_at IS NOT NULL AND completed_by IS NOT NULL AND completion_note IS NOT NULL
            AND waived_at IS NULL AND waived_by IS NULL AND waiver_reason IS NULL)
        OR
        (status = 'waived'
            AND waived_at IS NOT NULL AND waived_by IS NOT NULL AND waiver_reason IS NOT NULL
            AND completed_at IS NULL AND completed_by IS NULL AND completion_note IS NULL)
    )
);

COMMENT ON TABLE public.event_milestones IS
    'R06 operational checkpoints linked to Events through services.id; independent of Event lifecycle and Event Tasks.';
COMMENT ON COLUMN public.event_milestones.status IS
    'Persisted states are planned, completed, and waived. Overdue is derived from planned plus target_date before the Riyadh business date.';

CREATE INDEX idx_event_milestones_service_target
    ON public.event_milestones (service_id, target_date, id);
CREATE INDEX idx_event_milestones_status_target
    ON public.event_milestones (status, target_date, id);
CREATE INDEX idx_event_milestones_owner_target
    ON public.event_milestones (owner_user_id, target_date, id)
    WHERE owner_user_id IS NOT NULL;

ALTER TABLE public.event_milestones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.event_milestones FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.event_milestones TO service_role;

CREATE FUNCTION public.list_event_milestones(
    p_search text,
    p_event_query text,
    p_owner_query text,
    p_status text,
    p_overdue_only boolean,
    p_target_date_from date,
    p_target_date_to date,
    p_page integer,
    p_page_size integer
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
    WITH options AS (
        SELECT
            NULLIF(lower(btrim(p_search)), '') AS search_text,
            NULLIF(lower(btrim(p_event_query)), '') AS event_text,
            NULLIF(lower(btrim(p_owner_query)), '') AS owner_text,
            LEAST(GREATEST(COALESCE(p_page, 1), 1), 1000) AS page_number,
            LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 50) AS page_size
    ),
    filtered AS (
        SELECT
            em.id,
            em.service_id,
            s.service_number,
            s.service_title,
            s.event_name,
            em.title,
            em.description,
            em.owner_user_id,
            COALESCE(NULLIF(btrim(owner_user.name), ''), owner_user.email) AS owner_label,
            COALESCE(owner_user.is_active IS TRUE, false) AS owner_is_active,
            em.target_date,
            em.status,
            (em.status = 'planned' AND em.target_date < (timezone('Asia/Riyadh', transaction_timestamp()))::date) AS is_overdue,
            em.completed_at,
            em.completed_by,
            em.completion_note,
            em.waived_at,
            em.waived_by,
            em.waiver_reason,
            em.created_at,
            em.created_by,
            em.updated_at,
            em.updated_by,
            lifecycle.close_state AS event_close_state
        FROM public.event_milestones em
        JOIN public.services s ON s.id = em.service_id AND s.deleted_at IS NULL
        LEFT JOIN public.service_lifecycle_states lifecycle ON lifecycle.service_id = s.id
        LEFT JOIN public.app_users owner_user ON owner_user.id = em.owner_user_id
        CROSS JOIN options o
        WHERE
            (o.search_text IS NULL OR position(o.search_text IN lower(concat_ws(' ', em.title, em.description))) > 0)
            AND (o.event_text IS NULL OR position(o.event_text IN lower(concat_ws(' ', s.service_number, s.service_title, s.event_name))) > 0)
            AND (o.owner_text IS NULL OR position(o.owner_text IN lower(concat_ws(' ', owner_user.name, owner_user.email))) > 0)
            AND (p_status IS NULL OR em.status = p_status)
            AND (COALESCE(p_overdue_only, false) IS FALSE OR
                (em.status = 'planned' AND em.target_date < (timezone('Asia/Riyadh', transaction_timestamp()))::date))
            AND (p_target_date_from IS NULL OR em.target_date >= p_target_date_from)
            AND (p_target_date_to IS NULL OR em.target_date <= p_target_date_to)
    ),
    page_rows AS (
        SELECT f.*
        FROM filtered f
        CROSS JOIN options o
        ORDER BY f.target_date ASC, f.service_number ASC, f.id ASC
        LIMIT (SELECT o.page_size + 1 FROM options o)
        OFFSET (SELECT (o.page_number - 1) * o.page_size FROM options o)
    ),
    numbered AS (
        SELECT p.*, row_number() OVER (ORDER BY p.target_date ASC, p.service_number ASC, p.id ASC) AS page_row
        FROM page_rows p
    )
    SELECT jsonb_build_object(
        'page', (SELECT page_number FROM options),
        'page_size', (SELECT page_size FROM options),
        'has_more', COALESCE(bool_or(numbered.page_row > (SELECT page_size FROM options)), false),
        'items', COALESCE(
            jsonb_agg(to_jsonb(numbered) - 'page_row' ORDER BY numbered.page_row)
                FILTER (WHERE numbered.page_row <= (SELECT page_size FROM options)),
            '[]'::jsonb
        )
    )
    FROM numbered;
$$;

CREATE FUNCTION public.search_event_milestone_events(p_query text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', candidates.id,
                'service_number', candidates.service_number,
                'service_title', candidates.service_title,
                'event_name', candidates.event_name
            ) ORDER BY candidates.service_number, candidates.id
        ),
        '[]'::jsonb
    )
    FROM (
        SELECT s.id, s.service_number, s.service_title, s.event_name
        FROM public.services s
        JOIN public.service_lifecycle_states lifecycle ON lifecycle.service_id = s.id
        WHERE s.deleted_at IS NULL
          AND lifecycle.close_state = 'open'
          AND (
              NULLIF(btrim(p_query), '') IS NULL
              OR position(lower(btrim(p_query)) IN lower(concat_ws(' ', s.service_number, s.service_title, s.event_name))) > 0
          )
        ORDER BY s.service_number, s.id
        LIMIT 30
    ) candidates;
$$;

CREATE FUNCTION public.search_event_milestone_owners(p_query text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object('id', candidates.id, 'name', candidates.name, 'email', candidates.email)
            ORDER BY lower(COALESCE(candidates.name, candidates.email)), candidates.id
        ),
        '[]'::jsonb
    )
    FROM (
        SELECT u.id, u.name, u.email
        FROM public.app_users u
        WHERE u.is_active IS TRUE
          AND (
              NULLIF(btrim(p_query), '') IS NULL
              OR position(lower(btrim(p_query)) IN lower(concat_ws(' ', u.name, u.email))) > 0
          )
        ORDER BY lower(COALESCE(u.name, u.email)), u.id
        LIMIT 30
    ) candidates;
$$;

CREATE FUNCTION public.get_event_milestone_history(p_milestone_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', history.id,
                'action', history.action,
                'event_type', history.details ->> 'event_type',
                'actor_id', history.user_id,
                'actor_label', COALESCE(NULLIF(btrim(actor_user.name), ''), actor_user.email),
                'occurred_at', history.timestamp,
                'details', history.details
            ) ORDER BY history.timestamp DESC NULLS LAST, history.id DESC
        ),
        '[]'::jsonb
    )
    FROM (
        SELECT a.id, a.action, a.user_id, a.timestamp, a.details
        FROM public.audit_logs a
        WHERE a.entity_type = 'event_milestone'
          AND a.entity_id = p_milestone_id
        ORDER BY a.timestamp DESC NULLS LAST, a.id DESC
        LIMIT 100
    ) history
    LEFT JOIN public.app_users actor_user ON actor_user.clerk_user_id = history.user_id;
$$;

CREATE FUNCTION public.create_event_milestone(
    p_service_id uuid,
    p_title text,
    p_description text,
    p_owner_user_id uuid,
    p_target_date date,
    p_actor_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_close_state text;
    v_row public.event_milestones%ROWTYPE;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN jsonb_build_object('error_code', 'invalid_actor', 'item', NULL);
    END IF;
    IF p_service_id IS NULL OR p_target_date IS NULL OR NULLIF(btrim(p_title), '') IS NULL
       OR length(btrim(p_title)) > 200 OR (p_description IS NOT NULL AND length(p_description) > 2000) THEN
        RETURN jsonb_build_object('error_code', 'invalid_input', 'item', NULL);
    END IF;

    PERFORM s.id
    FROM public.services s
    WHERE s.id = p_service_id AND s.deleted_at IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'event_not_found', 'item', NULL);
    END IF;

    SELECT lifecycle.close_state INTO v_close_state
    FROM public.service_lifecycle_states lifecycle
    WHERE lifecycle.service_id = p_service_id
    FOR UPDATE;
    IF NOT FOUND OR v_close_state IS DISTINCT FROM 'open' THEN
        RETURN jsonb_build_object('error_code', 'event_read_only', 'item', NULL);
    END IF;

    IF p_owner_user_id IS NOT NULL THEN
        PERFORM u.id FROM public.app_users u
        WHERE u.id = p_owner_user_id AND u.is_active IS TRUE
        FOR SHARE;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('error_code', 'owner_unavailable', 'item', NULL);
        END IF;
    END IF;

    INSERT INTO public.event_milestones (
        service_id, title, description, owner_user_id, target_date, status,
        created_at, created_by, updated_at, updated_by
    ) VALUES (
        p_service_id, btrim(p_title), NULLIF(btrim(p_description), ''), p_owner_user_id, p_target_date, 'planned',
        v_now, p_actor_id, v_now, p_actor_id
    )
    RETURNING * INTO v_row;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'event_milestone', v_row.id, p_actor_id,
        jsonb_build_object(
            'event_type', 'milestone_created',
            'service_id', v_row.service_id,
            'before', NULL,
            'after', to_jsonb(v_row)
        ),
        v_now
    );

    RETURN jsonb_build_object('error_code', NULL, 'item', to_jsonb(v_row));
END;
$$;

CREATE FUNCTION public.update_event_milestone(
    p_milestone_id uuid,
    p_expected_updated_at timestamptz,
    p_title text,
    p_description text,
    p_owner_user_id uuid,
    p_target_date date,
    p_actor_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_service_id uuid;
    v_close_state text;
    v_old public.event_milestones%ROWTYPE;
    v_new public.event_milestones%ROWTYPE;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN jsonb_build_object('error_code', 'invalid_actor', 'item', NULL);
    END IF;
    IF p_milestone_id IS NULL OR p_expected_updated_at IS NULL OR p_target_date IS NULL
       OR NULLIF(btrim(p_title), '') IS NULL OR length(btrim(p_title)) > 200
       OR (p_description IS NOT NULL AND length(p_description) > 2000) THEN
        RETURN jsonb_build_object('error_code', 'invalid_input', 'item', NULL);
    END IF;

    SELECT em.service_id INTO v_service_id
    FROM public.event_milestones em
    WHERE em.id = p_milestone_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'milestone_not_found', 'item', NULL);
    END IF;

    PERFORM s.id FROM public.services s
    WHERE s.id = v_service_id AND s.deleted_at IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'event_not_found', 'item', NULL);
    END IF;
    SELECT lifecycle.close_state INTO v_close_state
    FROM public.service_lifecycle_states lifecycle
    WHERE lifecycle.service_id = v_service_id
    FOR UPDATE;
    IF NOT FOUND OR v_close_state IS DISTINCT FROM 'open' THEN
        RETURN jsonb_build_object('error_code', 'event_read_only', 'item', NULL);
    END IF;

    SELECT em.* INTO v_old FROM public.event_milestones em
    WHERE em.id = p_milestone_id AND em.service_id = v_service_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'milestone_not_found', 'item', NULL);
    END IF;
    IF v_old.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RETURN jsonb_build_object('error_code', 'stale_record', 'item', NULL);
    END IF;
    IF v_old.status <> 'planned' THEN
        RETURN jsonb_build_object('error_code', 'state_conflict', 'item', NULL);
    END IF;
    IF p_owner_user_id IS DISTINCT FROM v_old.owner_user_id AND p_owner_user_id IS NOT NULL THEN
        PERFORM u.id FROM public.app_users u
        WHERE u.id = p_owner_user_id AND u.is_active IS TRUE
        FOR SHARE;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('error_code', 'owner_unavailable', 'item', NULL);
        END IF;
    END IF;

    UPDATE public.event_milestones em
    SET title = btrim(p_title),
        description = NULLIF(btrim(p_description), ''),
        owner_user_id = p_owner_user_id,
        target_date = p_target_date,
        updated_at = v_now,
        updated_by = p_actor_id
    WHERE em.id = p_milestone_id AND em.updated_at = p_expected_updated_at AND em.status = 'planned'
    RETURNING em.* INTO v_new;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'stale_record', 'item', NULL);
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'update', 'event_milestone', v_new.id, p_actor_id,
        jsonb_build_object(
            'event_type', 'milestone_fields_updated',
            'service_id', v_new.service_id,
            'changed_fields', to_jsonb(array_remove(ARRAY[
                CASE WHEN v_old.title IS DISTINCT FROM v_new.title THEN 'title' END,
                CASE WHEN v_old.description IS DISTINCT FROM v_new.description THEN 'description' END,
                CASE WHEN v_old.owner_user_id IS DISTINCT FROM v_new.owner_user_id THEN 'owner_user_id' END,
                CASE WHEN v_old.target_date IS DISTINCT FROM v_new.target_date THEN 'target_date' END
            ], NULL)),
            'before', to_jsonb(v_old),
            'after', to_jsonb(v_new)
        ),
        v_now
    );

    RETURN jsonb_build_object('error_code', NULL, 'item', to_jsonb(v_new));
END;
$$;

CREATE FUNCTION public.complete_event_milestone(
    p_milestone_id uuid,
    p_expected_updated_at timestamptz,
    p_completion_note text,
    p_actor_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_service_id uuid;
    v_close_state text;
    v_old public.event_milestones%ROWTYPE;
    v_new public.event_milestones%ROWTYPE;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN jsonb_build_object('error_code', 'invalid_actor', 'item', NULL);
    END IF;
    IF p_milestone_id IS NULL OR p_expected_updated_at IS NULL
       OR NULLIF(btrim(p_completion_note), '') IS NULL OR length(btrim(p_completion_note)) > 1000 THEN
        RETURN jsonb_build_object('error_code', 'invalid_input', 'item', NULL);
    END IF;

    SELECT em.service_id INTO v_service_id FROM public.event_milestones em WHERE em.id = p_milestone_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'milestone_not_found', 'item', NULL);
    END IF;
    PERFORM s.id FROM public.services s WHERE s.id = v_service_id AND s.deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'event_not_found', 'item', NULL);
    END IF;
    SELECT lifecycle.close_state INTO v_close_state FROM public.service_lifecycle_states lifecycle
    WHERE lifecycle.service_id = v_service_id FOR UPDATE;
    IF NOT FOUND OR v_close_state IS DISTINCT FROM 'open' THEN
        RETURN jsonb_build_object('error_code', 'event_read_only', 'item', NULL);
    END IF;
    SELECT em.* INTO v_old FROM public.event_milestones em
    WHERE em.id = p_milestone_id AND em.service_id = v_service_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'milestone_not_found', 'item', NULL);
    END IF;
    IF v_old.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RETURN jsonb_build_object('error_code', 'stale_record', 'item', NULL);
    END IF;
    IF v_old.status <> 'planned' THEN
        RETURN jsonb_build_object('error_code', 'state_conflict', 'item', NULL);
    END IF;

    UPDATE public.event_milestones em
    SET status = 'completed', completed_at = v_now, completed_by = p_actor_id,
        completion_note = btrim(p_completion_note), updated_at = v_now, updated_by = p_actor_id
    WHERE em.id = p_milestone_id AND em.updated_at = p_expected_updated_at AND em.status = 'planned'
    RETURNING em.* INTO v_new;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'stale_record', 'item', NULL);
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change', 'event_milestone', v_new.id, p_actor_id,
        jsonb_build_object(
            'event_type', 'milestone_completed', 'service_id', v_new.service_id,
            'from_state', v_old.status, 'to_state', v_new.status,
            'completion_note', v_new.completion_note, 'occurred_at', v_now,
            'before', to_jsonb(v_old), 'after', to_jsonb(v_new)
        ),
        v_now
    );
    RETURN jsonb_build_object('error_code', NULL, 'item', to_jsonb(v_new));
END;
$$;

CREATE FUNCTION public.waive_event_milestone(
    p_milestone_id uuid,
    p_expected_updated_at timestamptz,
    p_waiver_reason text,
    p_actor_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_service_id uuid;
    v_close_state text;
    v_old public.event_milestones%ROWTYPE;
    v_new public.event_milestones%ROWTYPE;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN jsonb_build_object('error_code', 'invalid_actor', 'item', NULL);
    END IF;
    IF p_milestone_id IS NULL OR p_expected_updated_at IS NULL
       OR NULLIF(btrim(p_waiver_reason), '') IS NULL OR length(btrim(p_waiver_reason)) > 1000 THEN
        RETURN jsonb_build_object('error_code', 'invalid_input', 'item', NULL);
    END IF;

    SELECT em.service_id INTO v_service_id FROM public.event_milestones em WHERE em.id = p_milestone_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'milestone_not_found', 'item', NULL);
    END IF;
    PERFORM s.id FROM public.services s WHERE s.id = v_service_id AND s.deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'event_not_found', 'item', NULL);
    END IF;
    SELECT lifecycle.close_state INTO v_close_state FROM public.service_lifecycle_states lifecycle
    WHERE lifecycle.service_id = v_service_id FOR UPDATE;
    IF NOT FOUND OR v_close_state IS DISTINCT FROM 'open' THEN
        RETURN jsonb_build_object('error_code', 'event_read_only', 'item', NULL);
    END IF;
    SELECT em.* INTO v_old FROM public.event_milestones em
    WHERE em.id = p_milestone_id AND em.service_id = v_service_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'milestone_not_found', 'item', NULL);
    END IF;
    IF v_old.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RETURN jsonb_build_object('error_code', 'stale_record', 'item', NULL);
    END IF;
    IF v_old.status <> 'planned' THEN
        RETURN jsonb_build_object('error_code', 'state_conflict', 'item', NULL);
    END IF;

    UPDATE public.event_milestones em
    SET status = 'waived', waived_at = v_now, waived_by = p_actor_id,
        waiver_reason = btrim(p_waiver_reason), updated_at = v_now, updated_by = p_actor_id
    WHERE em.id = p_milestone_id AND em.updated_at = p_expected_updated_at AND em.status = 'planned'
    RETURNING em.* INTO v_new;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'stale_record', 'item', NULL);
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change', 'event_milestone', v_new.id, p_actor_id,
        jsonb_build_object(
            'event_type', 'milestone_waived', 'service_id', v_new.service_id,
            'from_state', v_old.status, 'to_state', v_new.status,
            'waiver_reason', v_new.waiver_reason, 'occurred_at', v_now,
            'before', to_jsonb(v_old), 'after', to_jsonb(v_new)
        ),
        v_now
    );
    RETURN jsonb_build_object('error_code', NULL, 'item', to_jsonb(v_new));
END;
$$;

CREATE FUNCTION public.correct_event_milestone(
    p_milestone_id uuid,
    p_expected_updated_at timestamptz,
    p_title text,
    p_description text,
    p_owner_user_id uuid,
    p_target_date date,
    p_correction_reason text,
    p_actor_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_service_id uuid;
    v_close_state text;
    v_old public.event_milestones%ROWTYPE;
    v_new public.event_milestones%ROWTYPE;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN jsonb_build_object('error_code', 'invalid_actor', 'item', NULL);
    END IF;
    IF p_milestone_id IS NULL OR p_expected_updated_at IS NULL OR p_target_date IS NULL
       OR NULLIF(btrim(p_title), '') IS NULL OR length(btrim(p_title)) > 200
       OR (p_description IS NOT NULL AND length(p_description) > 2000)
       OR NULLIF(btrim(p_correction_reason), '') IS NULL OR length(btrim(p_correction_reason)) > 1000 THEN
        RETURN jsonb_build_object('error_code', 'invalid_input', 'item', NULL);
    END IF;

    SELECT em.service_id INTO v_service_id FROM public.event_milestones em WHERE em.id = p_milestone_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'milestone_not_found', 'item', NULL);
    END IF;
    PERFORM s.id FROM public.services s WHERE s.id = v_service_id AND s.deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'event_not_found', 'item', NULL);
    END IF;
    SELECT lifecycle.close_state INTO v_close_state FROM public.service_lifecycle_states lifecycle
    WHERE lifecycle.service_id = v_service_id FOR UPDATE;
    IF NOT FOUND OR v_close_state IS DISTINCT FROM 'open' THEN
        RETURN jsonb_build_object('error_code', 'event_read_only', 'item', NULL);
    END IF;
    SELECT em.* INTO v_old FROM public.event_milestones em
    WHERE em.id = p_milestone_id AND em.service_id = v_service_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'milestone_not_found', 'item', NULL);
    END IF;
    IF v_old.updated_at IS DISTINCT FROM p_expected_updated_at THEN
        RETURN jsonb_build_object('error_code', 'stale_record', 'item', NULL);
    END IF;
    IF v_old.status NOT IN ('completed', 'waived') THEN
        RETURN jsonb_build_object('error_code', 'state_conflict', 'item', NULL);
    END IF;
    IF p_owner_user_id IS DISTINCT FROM v_old.owner_user_id AND p_owner_user_id IS NOT NULL THEN
        PERFORM u.id FROM public.app_users u
        WHERE u.id = p_owner_user_id AND u.is_active IS TRUE
        FOR SHARE;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('error_code', 'owner_unavailable', 'item', NULL);
        END IF;
    END IF;

    UPDATE public.event_milestones em
    SET title = btrim(p_title),
        description = NULLIF(btrim(p_description), ''),
        owner_user_id = p_owner_user_id,
        target_date = p_target_date,
        status = 'planned',
        completed_at = NULL, completed_by = NULL, completion_note = NULL,
        waived_at = NULL, waived_by = NULL, waiver_reason = NULL,
        updated_at = v_now, updated_by = p_actor_id
    WHERE em.id = p_milestone_id AND em.updated_at = p_expected_updated_at
      AND em.status IN ('completed', 'waived')
    RETURNING em.* INTO v_new;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error_code', 'stale_record', 'item', NULL);
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change', 'event_milestone', v_new.id, p_actor_id,
        jsonb_build_object(
            'event_type', 'milestone_corrected', 'service_id', v_new.service_id,
            'from_state', v_old.status, 'to_state', v_new.status,
            'correction_reason', btrim(p_correction_reason), 'occurred_at', v_now,
            'changed_fields', to_jsonb(array_remove(ARRAY[
                'status',
                CASE WHEN v_old.title IS DISTINCT FROM v_new.title THEN 'title' END,
                CASE WHEN v_old.description IS DISTINCT FROM v_new.description THEN 'description' END,
                CASE WHEN v_old.owner_user_id IS DISTINCT FROM v_new.owner_user_id THEN 'owner_user_id' END,
                CASE WHEN v_old.target_date IS DISTINCT FROM v_new.target_date THEN 'target_date' END
            ], NULL)),
            'before', to_jsonb(v_old), 'after', to_jsonb(v_new)
        ),
        v_now
    );
    RETURN jsonb_build_object('error_code', NULL, 'item', to_jsonb(v_new));
END;
$$;

REVOKE ALL ON FUNCTION public.list_event_milestones(text, text, text, text, boolean, date, date, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_event_milestone_events(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_event_milestone_owners(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_event_milestone_history(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_event_milestone(uuid, text, text, uuid, date, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_event_milestone(uuid, timestamptz, text, text, uuid, date, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_event_milestone(uuid, timestamptz, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.waive_event_milestone(uuid, timestamptz, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.correct_event_milestone(uuid, timestamptz, text, text, uuid, date, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.list_event_milestones(text, text, text, text, boolean, date, date, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_event_milestone_events(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_event_milestone_owners(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_milestone_history(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_event_milestone(uuid, text, text, uuid, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_event_milestone(uuid, timestamptz, text, text, uuid, date, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_event_milestone(uuid, timestamptz, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.waive_event_milestone(uuid, timestamptz, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.correct_event_milestone(uuid, timestamptz, text, text, uuid, date, text, text) TO service_role;
