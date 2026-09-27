-- W8A corrective migration: qualify version columns in the applied write RPCs.
-- The original W8A migration remains immutable; this repair only removes the
-- PL/pgSQL output-column ambiguity discovered during DEV verification.

BEGIN;

CREATE OR REPLACE FUNCTION public.approve_event_cost_budget(
    p_service_id uuid,
    p_base_budget_amount numeric,
    p_contingency_amount numeric,
    p_reason text,
    p_notes text,
    p_source_reference text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, budget_id uuid, budget_version integer, approved_budget_cost numeric, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_actor_uuid uuid;
    v_existing record;
    v_service record;
    v_budget_id uuid;
    v_version integer;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_service_id IS NULL OR p_request_id IS NULL
        OR p_base_budget_amount IS NULL OR p_base_budget_amount < 0 OR p_base_budget_amount <> round(p_base_budget_amount, 2)
        OR p_contingency_amount IS NULL OR p_contingency_amount < 0 OR p_contingency_amount <> round(p_contingency_amount, 2)
        OR p_base_budget_amount + p_contingency_amount > 999999999999.99
        OR char_length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 5 AND 2000
        OR (p_notes IS NOT NULL AND char_length(p_notes) > 4000)
        OR (p_source_reference IS NOT NULL AND char_length(p_source_reference) > 500)
        OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'manager')
    THEN
        RETURN QUERY SELECT 'event_cost_budget_request_invalid', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'event_cost_budget_request_invalid', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END;

    IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = v_actor_uuid AND is_active = true AND role = p_actor_role) THEN
        RETURN QUERY SELECT 'event_cost_budget_permission_denied', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w8a:event_cost_budget:' || p_service_id::text, 0));

    SELECT * INTO v_existing FROM public.event_cost_budgets WHERE request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.service_id IS DISTINCT FROM p_service_id
            OR v_existing.base_budget_amount IS DISTINCT FROM round(p_base_budget_amount, 2)
            OR v_existing.contingency_amount IS DISTINCT FROM round(p_contingency_amount, 2)
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
            OR v_existing.notes IS DISTINCT FROM NULLIF(btrim(p_notes), '')
            OR v_existing.source_reference IS DISTINCT FROM NULLIF(btrim(p_source_reference), '')
        THEN
            RETURN QUERY SELECT 'event_cost_budget_request_conflict', v_existing.id, v_existing.budget_version, v_existing.approved_budget_cost, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.budget_version, v_existing.approved_budget_cost, true;
        END IF;
        RETURN;
    END IF;

    SELECT id INTO v_service FROM public.services WHERE id = p_service_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'event_cost_service_not_found', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM set_config('g7.w8a_rpc_context', 'on', true);
    UPDATE public.event_cost_budgets
       SET superseded_at = v_now, superseded_by = p_actor_id
     WHERE service_id = p_service_id AND superseded_at IS NULL;

    SELECT COALESCE(MAX(b.budget_version), 0) + 1 INTO v_version
      FROM public.event_cost_budgets b WHERE b.service_id = p_service_id;

    INSERT INTO public.event_cost_budgets(
        service_id, budget_version, base_budget_amount, contingency_amount,
        reason, notes, source_reference, approved_by, approved_at, request_id
    ) VALUES (
        p_service_id, v_version, round(p_base_budget_amount, 2), round(p_contingency_amount, 2),
        btrim(p_reason), NULLIF(btrim(p_notes), ''), NULLIF(btrim(p_source_reference), ''),
        p_actor_id, v_now, p_request_id
    ) RETURNING id INTO v_budget_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'event_cost_budget', v_budget_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'event_cost_budget_approved', 'service_id', p_service_id,
            'budget_version', v_version, 'base_budget_amount', round(p_base_budget_amount, 2),
            'contingency_amount', round(p_contingency_amount, 2),
            'approved_budget_cost', round(p_base_budget_amount + p_contingency_amount, 2),
            'request_id', p_request_id
        ), v_now
    );

    RETURN QUERY SELECT NULL::text, v_budget_id, v_version,
        round(p_base_budget_amount + p_contingency_amount, 2), false;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_event_cost_etc(
    p_service_id uuid,
    p_etc_amount numeric,
    p_forecast_date date,
    p_reason text,
    p_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, forecast_id uuid, forecast_version integer, etc_amount numeric, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_actor_uuid uuid;
    v_existing record;
    v_service record;
    v_forecast_id uuid;
    v_version integer;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_service_id IS NULL OR p_request_id IS NULL OR p_forecast_date IS NULL
        OR p_etc_amount IS NULL OR p_etc_amount < 0 OR p_etc_amount <> round(p_etc_amount, 2)
        OR p_etc_amount > 999999999999.99
        OR char_length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 5 AND 2000
        OR (p_notes IS NOT NULL AND char_length(p_notes) > 4000)
        OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'manager')
    THEN
        RETURN QUERY SELECT 'event_cost_etc_request_invalid', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'event_cost_etc_request_invalid', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END;

    IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = v_actor_uuid AND is_active = true AND role = p_actor_role) THEN
        RETURN QUERY SELECT 'event_cost_etc_permission_denied', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w8a:event_cost_etc:' || p_service_id::text, 0));

    SELECT * INTO v_existing FROM public.event_cost_etc_forecasts WHERE request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.service_id IS DISTINCT FROM p_service_id
            OR v_existing.etc_amount IS DISTINCT FROM round(p_etc_amount, 2)
            OR v_existing.forecast_date IS DISTINCT FROM p_forecast_date
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
            OR v_existing.notes IS DISTINCT FROM NULLIF(btrim(p_notes), '')
        THEN
            RETURN QUERY SELECT 'event_cost_etc_request_conflict', v_existing.id, v_existing.forecast_version, v_existing.etc_amount, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.forecast_version, v_existing.etc_amount, true;
        END IF;
        RETURN;
    END IF;

    SELECT id INTO v_service FROM public.services WHERE id = p_service_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'event_cost_service_not_found', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM set_config('g7.w8a_rpc_context', 'on', true);
    UPDATE public.event_cost_etc_forecasts
       SET superseded_at = v_now, superseded_by = p_actor_id
     WHERE service_id = p_service_id AND superseded_at IS NULL;

    SELECT COALESCE(MAX(f.forecast_version), 0) + 1 INTO v_version
      FROM public.event_cost_etc_forecasts f WHERE f.service_id = p_service_id;

    INSERT INTO public.event_cost_etc_forecasts(
        service_id, forecast_version, etc_amount, forecast_date,
        reason, notes, recorded_by, recorded_at, request_id
    ) VALUES (
        p_service_id, v_version, round(p_etc_amount, 2), p_forecast_date,
        btrim(p_reason), NULLIF(btrim(p_notes), ''), p_actor_id, v_now, p_request_id
    ) RETURNING id INTO v_forecast_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'event_cost_etc_forecast', v_forecast_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'event_cost_etc_recorded', 'service_id', p_service_id,
            'forecast_version', v_version, 'etc_amount', round(p_etc_amount, 2),
            'forecast_date', p_forecast_date, 'request_id', p_request_id
        ), v_now
    );

    RETURN QUERY SELECT NULL::text, v_forecast_id, v_version, round(p_etc_amount, 2), false;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_event_cost_budget(uuid,numeric,numeric,text,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_event_cost_etc(uuid,numeric,date,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_event_cost_budget(uuid,numeric,numeric,text,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_event_cost_etc(uuid,numeric,date,text,text,uuid,text,text) TO service_role;

COMMIT;
