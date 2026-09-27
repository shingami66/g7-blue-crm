-- W5B-2C corrective migration: align Cash Advance approval with the explicit
-- Owner Decision while preserving the existing RPC contract and safeguards.
-- This migration is intentionally unapplied in the current task.

BEGIN;

-- Preflight Safety Guards
DO $$
BEGIN
    IF to_regclass('public.employee_cash_advances') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regprocedure('public.approve_cash_advance(uuid,uuid,text,text)') IS NULL
    THEN
        RAISE EXCEPTION 'W5B-2C approval authority repair preflight failed: required table or RPC is missing';
    END IF;
END;
$$;

-- The applied W5A table check predates the Owner-approved Admin/Accountant
-- self-approval exception. Replace it with a role-aware trigger guard so the
-- RPC remains the only path that can authorize the exception.
ALTER TABLE public.employee_cash_advances
    DROP CONSTRAINT IF EXISTS chk_advance_no_self_approval;

CREATE OR REPLACE FUNCTION public.enforce_cash_advance_approval_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_actor_role text := current_setting('g7.cash_advance_actor_role', true);
BEGIN
    IF NEW.approved_by IS NOT NULL
        AND (NEW.approved_by = NEW.requested_by OR NEW.approved_by = NEW.recipient_id)
        AND COALESCE(v_actor_role, '') NOT IN ('admin', 'accountant')
    THEN
        RAISE EXCEPTION USING MESSAGE = 'cash_advance_self_approval_forbidden';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_cash_advance_approval_authority_trg
    ON public.employee_cash_advances;
CREATE TRIGGER enforce_cash_advance_approval_authority_trg
BEFORE INSERT OR UPDATE OF approved_by ON public.employee_cash_advances
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cash_advance_approval_authority();

REVOKE ALL ON FUNCTION public.enforce_cash_advance_approval_authority() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_cash_advance_approval_authority() TO service_role;

-- Preserve the exact public.approve_cash_advance signature and all existing
-- validation, row locking, replay/conflict handling, audit logging, state
-- transition, SECURITY DEFINER, search_path, and service-role grant behavior.
CREATE OR REPLACE FUNCTION public.approve_cash_advance(
    p_advance_id uuid,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    advance_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_requested_by uuid;
    v_recipient_id uuid;
    v_status text;
    v_existing_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
BEGIN
    IF p_advance_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'request_invalid'::text, p_advance_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_advance_id, false;
        RETURN;
    END;

    v_payload := jsonb_build_object('advance_id', p_advance_id);

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_approve:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'employee_cash_advance'
      AND a.details ->> 'operation' = 'approve_cash_advance'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_advance_id THEN
            RETURN QUERY SELECT 'cash_advance_approve_request_conflict'::text, p_advance_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT requested_by, recipient_id, status INTO v_requested_by, v_recipient_id, v_status
    FROM public.employee_cash_advances
    WHERE id = p_advance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'advance_not_found'::text, p_advance_id, false;
        RETURN;
    END IF;

    -- Only Admin and Accountant receive the Owner-approved exception. All
    -- other actor roles retain the existing maker-checker restrictions.
    IF COALESCE(p_actor_role, '') NOT IN ('admin', 'accountant') THEN
        IF v_requested_by = v_actor_uuid THEN
            RETURN QUERY SELECT 'advance_self_approval_forbidden'::text, p_advance_id, false;
            RETURN;
        END IF;

        IF v_recipient_id = v_actor_uuid THEN
            RETURN QUERY SELECT 'advance_recipient_self_approval_forbidden'::text, p_advance_id, false;
            RETURN;
        END IF;
    END IF;

    IF v_status != 'submitted' THEN
        RETURN QUERY SELECT 'advance_invalid_state_for_approval'::text, p_advance_id, false;
        RETURN;
    END IF;

    -- The trigger guard rejects self-approval unless this transaction was
    -- authorized by the same narrowly scoped role exception above.
    PERFORM pg_catalog.set_config('g7.cash_advance_actor_role', COALESCE(p_actor_role, ''), true);

    UPDATE public.employee_cash_advances
    SET status = 'approved',
        approved_by = v_actor_uuid,
        approved_at = v_now,
        updated_at = v_now
    WHERE id = p_advance_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_approved', 'employee_cash_advance', p_advance_id, p_actor_id,
        jsonb_build_object(
            'operation', 'approve_cash_advance',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_advance_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_cash_advance(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_cash_advance(uuid, uuid, text, text) TO service_role;

COMMIT;
