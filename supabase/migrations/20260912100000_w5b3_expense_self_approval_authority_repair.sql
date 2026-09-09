-- W5B-3 corrective migration: align Expense self-approval with the explicit
-- Owner Decision while preserving the existing approval RPC contract and
-- database safeguards. This migration is intentionally unapplied in this task.

BEGIN;

-- Preflight Safety Guards
DO $$
BEGIN
    IF to_regclass('public.expenses') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regprocedure('public.approve_expense(uuid,uuid,text,text)') IS NULL
    THEN
        RAISE EXCEPTION 'W5B-3 expense approval authority repair preflight failed: required table or RPC is missing';
    END IF;
END;
$$;

-- The applied W5A table check cannot express the Owner-approved role-aware
-- exception because actor role is not stored in Expense state. Replace it
-- with a trigger guard so direct table mutation remains fail-closed.
ALTER TABLE public.expenses
    DROP CONSTRAINT IF EXISTS chk_expense_no_self_approval;

CREATE OR REPLACE FUNCTION public.enforce_expense_approval_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_actor_role text := current_setting('g7.expense_actor_role', true);
BEGIN
    IF NEW.approved_by IS NOT NULL
        AND (
            NEW.approved_by = NEW.submitted_by
            OR (
                NEW.origin_type = 'employee_paid'
                AND NEW.approved_by = NEW.claimant_id
            )
        )
        AND COALESCE(v_actor_role, '') NOT IN ('admin', 'accountant', 'manager')
    THEN
        RAISE EXCEPTION USING MESSAGE = 'expense_self_approval_forbidden';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_expense_approval_authority_trg
    ON public.expenses;
CREATE TRIGGER enforce_expense_approval_authority_trg
BEFORE INSERT OR UPDATE OF approved_by ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_expense_approval_authority();

REVOKE ALL ON FUNCTION public.enforce_expense_approval_authority() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_expense_approval_authority() TO service_role;

-- Preserve the exact public.approve_expense signature and all existing
-- validation, row locking, replay/conflict handling, audit logging, state
-- transition, SECURITY DEFINER, search_path, and service-role grant behavior.
CREATE OR REPLACE FUNCTION public.approve_expense(
    p_expense_id uuid,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    expense_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_submitted_by uuid;
    v_claimant_id uuid;
    v_origin_type text;
    v_status text;
    v_finance_reviewed_at timestamptz;
    v_finance_reviewed_by uuid;
    v_existing_id uuid;
    v_payload jsonb;
    v_audit_payload jsonb;
BEGIN
    IF p_expense_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'request_invalid'::text, p_expense_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_expense_id, false;
        RETURN;
    END;

    v_payload := jsonb_build_object('expense_id', p_expense_id);

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:expense_approve:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense'
      AND a.details ->> 'operation' = 'approve_expense'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_expense_id THEN
            RETURN QUERY SELECT 'expense_approve_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT e.submitted_by, e.claimant_id, e.origin_type, e.status, e.finance_reviewed_at, e.finance_reviewed_by
    INTO v_submitted_by, v_claimant_id, v_origin_type, v_status, v_finance_reviewed_at, v_finance_reviewed_by
    FROM public.expenses e
    WHERE e.id = p_expense_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'expense_not_found'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- Admin, Accountant, and Manager receive the Owner-approved exception.
    -- Every other role retains the existing maker-checker restrictions.
    IF COALESCE(p_actor_role, '') NOT IN ('admin', 'accountant', 'manager') THEN
        IF v_submitted_by = v_actor_uuid THEN
            RETURN QUERY SELECT 'expense_self_approval_forbidden'::text, p_expense_id, false;
            RETURN;
        END IF;

        IF v_origin_type = 'employee_paid' AND v_claimant_id = v_actor_uuid THEN
            RETURN QUERY SELECT 'expense_claimant_self_approval_forbidden'::text, p_expense_id, false;
            RETURN;
        END IF;
    END IF;

    IF v_status != 'submitted' THEN
        RETURN QUERY SELECT 'expense_invalid_state_for_approval'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- W5B-1A Gate: Completed positive Finance review required before approval.
    IF v_finance_reviewed_at IS NULL OR v_finance_reviewed_by IS NULL THEN
        RETURN QUERY SELECT 'expense_not_finance_reviewed'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- Set the transaction-local role only after every validation and directly
    -- before the protected update consumed by the trigger guard.
    PERFORM pg_catalog.set_config('g7.expense_actor_role', COALESCE(p_actor_role, ''), true);

    UPDATE public.expenses
    SET status = 'approved',
        approved_by = v_actor_uuid,
        approved_at = v_now,
        updated_at = v_now
    WHERE id = p_expense_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_approved', 'expense', p_expense_id, p_actor_id,
        jsonb_build_object(
            'operation', 'approve_expense',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_expense_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_expense(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_expense(uuid, uuid, text, text) TO service_role;

COMMIT;
