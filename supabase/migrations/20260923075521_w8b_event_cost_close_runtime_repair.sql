-- W8B forward repair: qualify the close-version aggregate that conflicts with the RETURNS TABLE output variable.
BEGIN;

DO $w8b_repair$
BEGIN
    IF to_regprocedure('public.close_event_cost(uuid,text,uuid,text,text)') IS NULL THEN
        RAISE EXCEPTION 'W8B close RPC is missing; apply the W8B foundation first';
    END IF;
    IF position('MAX(close_version)' IN pg_get_functiondef('public.close_event_cost(uuid,text,uuid,text,text)'::regprocedure)) = 0 THEN
        RAISE EXCEPTION 'W8B close RPC is not at the expected ambiguous version';
    END IF;
END;
$w8b_repair$;

CREATE OR REPLACE FUNCTION public.close_event_cost(
    p_service_id uuid, p_reason text, p_request_id uuid, p_actor_id text, p_actor_role text
)
RETURNS TABLE(error_code text, close_id uuid, close_version integer, idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_actor uuid;
    v_reason text := NULLIF(btrim(p_reason), '');
    v_now timestamptz := transaction_timestamp();
    v_effective_date date := (timezone('Asia/Riyadh', v_now))::date;
    v_existing public.event_cost_close_versions%ROWTYPE;
    v_readiness jsonb;
    v_cost jsonb;
    v_version integer;
    v_close_id uuid;
    v_budget_version integer;
    v_etc_version integer;
BEGIN
    IF p_service_id IS NULL OR p_request_id IS NULL OR v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 5 AND 2000
        OR NULLIF(btrim(p_actor_id), '') IS NULL OR COALESCE(p_actor_role, '') NOT IN ('admin', 'manager')
    THEN RETURN QUERY SELECT 'event_cost_close_request_invalid', NULL::uuid, NULL::integer, false; RETURN; END IF;
    BEGIN v_actor := p_actor_id::uuid; EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'event_cost_close_request_invalid', NULL::uuid, NULL::integer, false; RETURN;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = v_actor AND u.is_active AND u.role = p_actor_role) THEN
        RETURN QUERY SELECT 'event_cost_close_permission_denied', NULL::uuid, NULL::integer, false; RETURN;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('w8b:event-cost-close:' || p_service_id::text, 0));
    SELECT * INTO v_existing FROM public.event_cost_close_versions WHERE close_request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.service_id IS DISTINCT FROM p_service_id OR v_existing.reason IS DISTINCT FROM v_reason THEN
            RETURN QUERY SELECT 'event_cost_close_request_conflict', v_existing.id, v_existing.close_version, false; RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.close_version, true; RETURN;
    END IF;
    PERFORM 1 FROM public.services WHERE id = p_service_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'event_cost_service_not_found', NULL::uuid, NULL::integer, false; RETURN; END IF;
    IF public.event_cost_close_is_active(p_service_id) THEN
        RETURN QUERY SELECT 'event_cost_already_closed', NULL::uuid, NULL::integer, false; RETURN;
    END IF;
    v_readiness := public.get_event_cost_close_readiness(p_service_id, v_effective_date);
    IF COALESCE((v_readiness ->> 'ready')::boolean, false) IS NOT TRUE THEN
        RETURN QUERY SELECT 'event_cost_close_not_ready', NULL::uuid, NULL::integer, false; RETURN;
    END IF;
    v_cost := v_readiness -> 'costing';
    SELECT budget_version INTO v_budget_version FROM public.event_cost_budgets WHERE service_id = p_service_id AND superseded_at IS NULL;
    SELECT forecast_version INTO v_etc_version FROM public.event_cost_etc_forecasts WHERE service_id = p_service_id AND superseded_at IS NULL;
    SELECT COALESCE(MAX(c.close_version), 0) + 1 INTO v_version FROM public.event_cost_close_versions AS c WHERE c.service_id = p_service_id;
    INSERT INTO public.event_cost_close_versions(
        service_id, close_version, effective_date, reason, closed_by, closed_at, close_request_id,
        budget_version, etc_version, commercial_source_type, commercial_source_id, commercial_source_version,
        base_budget, contingency, approved_budget_cost, approved_commitment, accepted_commitment, pending_commitment,
        open_commitment, actual_cost, paid_cost, outstanding_cost, etc, eac, net_approved_commercial_value,
        final_managerial_event_margin, completeness_status, source_counts, readiness_evidence, costing_snapshot
    ) VALUES (
        p_service_id, v_version, v_effective_date, v_reason, v_actor, v_now, p_request_id,
        v_budget_version, v_etc_version, v_cost #>> '{commercial_authority,source_type}', NULLIF(v_cost #>> '{commercial_authority,source_id}', '')::uuid, v_cost #>> '{commercial_authority,source_version}',
        (v_cost #>> '{budget,base_budget}')::numeric, (v_cost #>> '{budget,contingency}')::numeric, (v_cost #>> '{budget,approved_budget_cost}')::numeric,
        (v_cost ->> 'approved_commitment')::numeric, (v_cost ->> 'accepted_commitment')::numeric, (v_cost ->> 'pending_commitment')::numeric,
        (v_cost ->> 'open_commitment')::numeric, (v_cost ->> 'actual_cost')::numeric, (v_cost ->> 'paid_cost')::numeric,
        (v_cost ->> 'outstanding_cost')::numeric, (v_cost ->> 'etc')::numeric, (v_cost ->> 'eac')::numeric,
        (v_cost ->> 'net_approved_commercial_value')::numeric, ((v_cost ->> 'net_approved_commercial_value')::numeric - (v_cost ->> 'actual_cost')::numeric),
        v_cost #>> '{completeness,status}', COALESCE(v_cost -> 'source_counts', '{}'::jsonb), v_readiness, v_cost
    ) RETURNING id INTO v_close_id;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('create', 'event_cost_close', v_close_id, p_actor_id,
        jsonb_build_object('event_type', 'event_cost_closed', 'service_id', p_service_id, 'close_version', v_version,
            'effective_date', v_effective_date, 'reason', v_reason, 'request_id', p_request_id, 'actor_role', p_actor_role), v_now);
    RETURN QUERY SELECT NULL::text, v_close_id, v_version, false;
END;
$$;

REVOKE ALL ON FUNCTION public.close_event_cost(uuid,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_event_cost(uuid,text,uuid,text,text) TO service_role;

COMMIT;
