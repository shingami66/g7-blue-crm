-- W5C — Petty Cash Approve and Disburse Workspace Operation
-- This migration is intentionally authored only; it must not be applied here.
-- The wrapper composes the existing governed Expense and Petty Cash RPCs so
-- their validation, audit, balance, and idempotency rules remain canonical.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.petty_cash_funds') IS NULL
        OR to_regclass('public.petty_cash_transactions') IS NULL
        OR to_regclass('public.expenses') IS NULL
        OR to_regclass('public.app_users') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regprocedure('public.review_expense_finance(uuid,uuid,text,text)') IS NULL
        OR to_regprocedure('public.approve_expense(uuid,uuid,text,text)') IS NULL
        OR to_regprocedure('public.record_petty_cash_transaction(uuid,text,numeric,text,uuid,text,uuid,text,text)') IS NULL
    THEN
        RAISE EXCEPTION 'W5C approve and disburse preflight failed: required Petty Cash or Expense object is missing';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_and_disburse_petty_cash_expense(
    p_fund_id uuid,
    p_expense_id uuid,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    expense_id uuid,
    transaction_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_actor_uuid uuid;
    v_actor_db_role text;
    v_fund_status text;
    v_expense_status text;
    v_expense_origin text;
    v_expense_payment_method text;
    v_expense_fund_id uuid;
    v_expense_amount numeric;
    v_finance_reviewed_at timestamptz;
    v_finance_reviewed_by uuid;
    v_disbursed_amount numeric;
    v_existing_transaction_id uuid;
    v_existing_fund_id uuid;
    v_existing_type text;
    v_existing_expense_id uuid;
    v_review_error text;
    v_approve_error text;
    v_transaction_error text;
    v_new_transaction_id uuid;
    v_error_code text;
BEGIN
    IF p_fund_id IS NULL
        OR p_expense_id IS NULL
        OR p_request_id IS NULL
        OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'accountant')
    THEN
        RETURN QUERY SELECT 'petty_cash_approve_disburse_request_invalid'::text, p_expense_id, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_expense_id, NULL::uuid, false;
        RETURN;
    END;

    SELECT u.role
    INTO v_actor_db_role
    FROM public.app_users u
    WHERE u.id = v_actor_uuid
      AND u.is_active = true;

    IF NOT FOUND OR v_actor_db_role IS DISTINCT FROM p_actor_role THEN
        RETURN QUERY SELECT 'petty_cash_transaction_authority_required'::text, p_expense_id, NULL::uuid, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w5c:petty_cash_approve_disburse:' || p_request_id::text, 0));

    -- The existing transaction request is the canonical idempotency marker for
    -- this composed operation. No second approval or disbursement is created.
    SELECT t.id, t.fund_id, t.transaction_type, t.expense_id
    INTO v_existing_transaction_id, v_existing_fund_id, v_existing_type, v_existing_expense_id
    FROM public.petty_cash_transactions t
    WHERE t.request_id = p_request_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing_fund_id IS DISTINCT FROM p_fund_id
            OR v_existing_type IS DISTINCT FROM 'disbursement'
            OR v_existing_expense_id IS DISTINCT FROM p_expense_id
        THEN
            RETURN QUERY SELECT 'petty_cash_approve_disburse_request_conflict'::text, p_expense_id, v_existing_transaction_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, p_expense_id, v_existing_transaction_id, true;
        RETURN;
    END IF;

    SELECT f.status
    INTO v_fund_status
    FROM public.petty_cash_funds f
    WHERE f.id = p_fund_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'petty_cash_fund_not_found'::text, p_expense_id, NULL::uuid, false;
        RETURN;
    END IF;
    IF v_fund_status <> 'active' THEN
        RETURN QUERY SELECT 'petty_cash_fund_not_active'::text, p_expense_id, NULL::uuid, false;
        RETURN;
    END IF;

    SELECT e.status,
           e.origin_type,
           e.payment_method,
           e.petty_cash_fund_id,
           e.amount,
           e.finance_reviewed_at,
           e.finance_reviewed_by
    INTO v_expense_status,
         v_expense_origin,
         v_expense_payment_method,
         v_expense_fund_id,
         v_expense_amount,
         v_finance_reviewed_at,
         v_finance_reviewed_by
    FROM public.expenses e
    WHERE e.id = p_expense_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'petty_cash_expense_not_found'::text, p_expense_id, NULL::uuid, false;
        RETURN;
    END IF;
    IF v_expense_origin <> 'company_direct'
        OR v_expense_payment_method <> 'petty_cash'
        OR v_expense_fund_id IS DISTINCT FROM p_fund_id
    THEN
        RETURN QUERY SELECT 'petty_cash_expense_not_eligible'::text, p_expense_id, NULL::uuid, false;
        RETURN;
    END IF;
    IF v_expense_status NOT IN ('submitted', 'approved') THEN
        RETURN QUERY SELECT 'petty_cash_expense_not_approvable'::text, p_expense_id, NULL::uuid, false;
        RETURN;
    END IF;
    IF v_expense_status = 'approved'
        AND (v_finance_reviewed_at IS NULL OR v_finance_reviewed_by IS NULL)
    THEN
        RETURN QUERY SELECT 'expense_not_finance_reviewed'::text, p_expense_id, NULL::uuid, false;
        RETURN;
    END IF;

    -- A submitted Expense is reviewed only when no completed review exists.
    -- review_expense_finance remains the sole evidence gate and audit writer.
    IF v_expense_status = 'submitted'
        AND v_finance_reviewed_at IS NULL
        AND v_finance_reviewed_by IS NULL
    THEN
        SELECT r.error_code
        INTO v_review_error
        FROM public.review_expense_finance(
            p_expense_id,
            p_request_id,
            p_actor_id,
            p_actor_role
        ) r;
        IF v_review_error IS NOT NULL THEN
            v_error_code := v_review_error;
            RAISE EXCEPTION USING MESSAGE = v_error_code;
        END IF;
    ELSIF v_expense_status = 'submitted'
        AND (v_finance_reviewed_at IS NULL OR v_finance_reviewed_by IS NULL)
    THEN
        v_error_code := 'expense_finance_review_incomplete';
        RAISE EXCEPTION USING MESSAGE = v_error_code;
    END IF;

    -- An already-approved Expense is compatible with the one-click flow; a
    -- submitted Expense continues through the canonical approval RPC.
    IF v_expense_status = 'submitted' THEN
        SELECT a.error_code
        INTO v_approve_error
        FROM public.approve_expense(
            p_expense_id,
            p_request_id,
            p_actor_id,
            p_actor_role
        ) a;
        IF v_approve_error IS NOT NULL THEN
            v_error_code := v_approve_error;
            RAISE EXCEPTION USING MESSAGE = v_error_code;
        END IF;
    END IF;

    SELECT e.amount - COALESCE(SUM(t.amount), 0)
    INTO v_disbursed_amount
    FROM public.expenses e
    LEFT JOIN public.petty_cash_transactions t
        ON t.expense_id = e.id
       AND t.transaction_type = 'disbursement'
    WHERE e.id = p_expense_id
    GROUP BY e.amount;

    IF v_disbursed_amount IS NULL OR v_disbursed_amount <= 0 THEN
        RETURN QUERY SELECT 'petty_cash_expense_already_disbursed'::text, p_expense_id, NULL::uuid, false;
        RETURN;
    END IF;

    -- record_petty_cash_transaction remains the sole fund-balance, linkage,
    -- ceiling, ledger, audit, and request-id implementation.
    SELECT t.error_code, t.transaction_id
    INTO v_transaction_error, v_new_transaction_id
    FROM public.record_petty_cash_transaction(
        p_fund_id,
        'disbursement',
        v_disbursed_amount,
        NULL,
        p_expense_id,
        NULL,
        p_request_id,
        p_actor_id,
        p_actor_role
    ) t;
    IF v_transaction_error IS NOT NULL THEN
        v_error_code := v_transaction_error;
        RAISE EXCEPTION USING MESSAGE = v_error_code;
    END IF;

    RETURN QUERY SELECT NULL::text, p_expense_id, v_new_transaction_id, false;
EXCEPTION WHEN OTHERS THEN
    -- Returning from this exception block rolls back all writes made by the
    -- wrapper, including any nested review, approval, or ledger writes.
    RETURN QUERY SELECT COALESCE(v_error_code, 'petty_cash_approve_disburse_failed')::text,
                         p_expense_id,
                         NULL::uuid,
                         false;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_and_disburse_petty_cash_expense(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_and_disburse_petty_cash_expense(uuid, uuid, uuid, text, text) TO service_role;

COMMIT;
