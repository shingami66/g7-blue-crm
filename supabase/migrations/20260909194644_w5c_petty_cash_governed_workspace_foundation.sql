-- W5C — Governed Petty Cash Workspace Foundation
-- Adds fund lifecycle authority, explicit treasury withdrawal, and hardened
-- transaction invariants on top of the W5A Petty Cash foundation.
-- This migration is intentionally authored only; it must not be applied here.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.petty_cash_funds') IS NULL
        OR to_regclass('public.petty_cash_transactions') IS NULL
        OR to_regclass('public.expenses') IS NULL
        OR to_regclass('public.app_users') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'W5C preflight failed: W5A Petty Cash foundation is missing';
    END IF;
END;
$$;

-- The historical `return` transaction remains readable and callable for
-- compatibility. New disbursements are always linked to an approved Expense.
ALTER TABLE public.petty_cash_transactions
    DROP CONSTRAINT IF EXISTS petty_cash_transactions_transaction_type_check;

ALTER TABLE public.petty_cash_transactions
    ADD CONSTRAINT petty_cash_transactions_transaction_type_check
    CHECK (transaction_type IN ('replenishment', 'disbursement', 'return', 'treasury_withdrawal'));

ALTER TABLE public.petty_cash_transactions
    DROP CONSTRAINT IF EXISTS chk_petty_cash_expense_linkage;

ALTER TABLE public.petty_cash_transactions
    ADD CONSTRAINT chk_petty_cash_expense_linkage
    CHECK (
        (transaction_type = 'disbursement' AND expense_id IS NOT NULL)
        OR (transaction_type IN ('replenishment', 'return', 'treasury_withdrawal') AND expense_id IS NULL)
    ) NOT VALID;

ALTER TABLE public.petty_cash_transactions
    DROP CONSTRAINT IF EXISTS chk_petty_cash_balance_flow;

ALTER TABLE public.petty_cash_transactions
    ADD CONSTRAINT chk_petty_cash_balance_flow
    CHECK (
        (transaction_type IN ('replenishment', 'return') AND balance_after = balance_before + amount)
        OR (transaction_type IN ('disbursement', 'treasury_withdrawal') AND balance_after = balance_before - amount)
    );

ALTER TABLE public.petty_cash_transactions
    ADD CONSTRAINT chk_petty_cash_withdrawal_reference
    CHECK (
        transaction_type <> 'treasury_withdrawal'
        OR NULLIF(btrim(reference), '') IS NOT NULL
    ) NOT VALID;

-- Expense submission remains on the canonical submit_expense RPC, while this
-- insert guard prevents a caller from routing a new Petty Cash Expense to a
-- suspended or closed fund through any service-role path.
CREATE OR REPLACE FUNCTION public.validate_petty_cash_expense_fund()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_status text;
BEGIN
    IF NEW.payment_method = 'petty_cash' THEN
        SELECT status INTO v_status
        FROM public.petty_cash_funds
        WHERE id = NEW.petty_cash_fund_id
        FOR SHARE;
        IF NOT FOUND OR v_status <> 'active' THEN
            RAISE EXCEPTION 'petty_cash_expense_fund_not_active';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS petty_cash_expense_fund_guard ON public.expenses;
CREATE TRIGGER petty_cash_expense_fund_guard
    BEFORE INSERT ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_petty_cash_expense_fund();

REVOKE ALL ON FUNCTION public.validate_petty_cash_expense_fund() FROM PUBLIC, anon, authenticated;

-- 1. Create Fund. Funds always start with a zero balance and are funded only
-- through the immutable transaction ledger.
CREATE OR REPLACE FUNCTION public.create_petty_cash_fund(
    p_fund_name text,
    p_custodian_id uuid,
    p_float_limit numeric,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, fund_id uuid, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_name text := btrim(p_fund_name);
    v_custodian_role text;
    v_custodian_active boolean;
    v_existing_id uuid;
    v_existing_payload jsonb;
    v_payload jsonb;
    v_id uuid;
BEGIN
    IF p_request_id IS NULL OR p_custodian_id IS NULL OR p_float_limit IS NULL
       OR p_float_limit <= 0 OR char_length(v_name) < 3
       OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'petty_cash_fund_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END;

    v_payload := jsonb_build_object(
        'fund_name', v_name,
        'custodian_id', p_custodian_id,
        'float_limit', p_float_limit
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w5c:petty_cash_fund_create:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_existing_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'petty_cash_fund'
      AND a.details ->> 'operation' = 'create_petty_cash_fund'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_existing_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'petty_cash_fund_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT role, is_active
    INTO v_custodian_role, v_custodian_active
    FROM public.app_users
    WHERE id = p_custodian_id;

    IF NOT FOUND OR NOT v_custodian_active OR v_custodian_role NOT IN ('admin', 'accountant') THEN
        RETURN QUERY SELECT 'petty_cash_custodian_not_authorized'::text, NULL::uuid, false;
        RETURN;
    END IF;

    INSERT INTO public.petty_cash_funds (fund_name, custodian_id, float_limit, current_balance, status, created_at, updated_at)
    VALUES (v_name, p_custodian_id, p_float_limit, 0.00, 'active', v_now, v_now)
    RETURNING id INTO v_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'petty_cash_fund', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'create_petty_cash_fund',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY SELECT 'petty_cash_fund_name_exists'::text, NULL::uuid, false;
    WHEN OTHERS THEN
        RETURN QUERY SELECT 'petty_cash_fund_create_failed'::text, NULL::uuid, false;
END;
$$;

-- 2. Update safe fund metadata only. Balance and status are not writable here.
CREATE OR REPLACE FUNCTION public.update_petty_cash_fund(
    p_fund_id uuid,
    p_fund_name text,
    p_custodian_id uuid,
    p_float_limit numeric,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, fund_id uuid, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_name text := btrim(p_fund_name);
    v_status text;
    v_current_balance numeric;
    v_custodian_role text;
    v_custodian_active boolean;
    v_existing_id uuid;
    v_existing_payload jsonb;
    v_payload jsonb;
BEGIN
    IF p_fund_id IS NULL OR p_request_id IS NULL OR p_custodian_id IS NULL OR p_float_limit IS NULL
       OR p_float_limit <= 0 OR char_length(v_name) < 3
       OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'petty_cash_fund_request_invalid'::text, p_fund_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_fund_id, false;
        RETURN;
    END;

    v_payload := jsonb_build_object(
        'fund_id', p_fund_id,
        'fund_name', v_name,
        'custodian_id', p_custodian_id,
        'float_limit', p_float_limit
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w5c:petty_cash_fund_update:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_existing_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'petty_cash_fund'
      AND a.details ->> 'operation' = 'update_petty_cash_fund'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_existing_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'petty_cash_fund_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT status, current_balance
    INTO v_status, v_current_balance
    FROM public.petty_cash_funds
    WHERE id = p_fund_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'petty_cash_fund_not_found'::text, p_fund_id, false;
        RETURN;
    END IF;
    IF v_status = 'closed' THEN
        RETURN QUERY SELECT 'petty_cash_fund_closed_immutable'::text, p_fund_id, false;
        RETURN;
    END IF;
    IF p_float_limit < v_current_balance THEN
        RETURN QUERY SELECT 'petty_cash_float_limit_below_balance'::text, p_fund_id, false;
        RETURN;
    END IF;

    SELECT role, is_active
    INTO v_custodian_role, v_custodian_active
    FROM public.app_users
    WHERE id = p_custodian_id;
    IF NOT FOUND OR NOT v_custodian_active OR v_custodian_role NOT IN ('admin', 'accountant') THEN
        RETURN QUERY SELECT 'petty_cash_custodian_not_authorized'::text, p_fund_id, false;
        RETURN;
    END IF;

    UPDATE public.petty_cash_funds
    SET fund_name = v_name,
        custodian_id = p_custodian_id,
        float_limit = p_float_limit,
        updated_at = v_now
    WHERE id = p_fund_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'update', 'petty_cash_fund', p_fund_id, p_actor_id,
        jsonb_build_object(
            'operation', 'update_petty_cash_fund',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_fund_id, false;
EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY SELECT 'petty_cash_fund_name_exists'::text, p_fund_id, false;
    WHEN OTHERS THEN
        RETURN QUERY SELECT 'petty_cash_fund_update_failed'::text, p_fund_id, false;
END;
$$;

-- 3. Suspend, reactivate, or close without deleting history.
CREATE OR REPLACE FUNCTION public.set_petty_cash_fund_status(
    p_fund_id uuid,
    p_new_status text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, fund_id uuid, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_current_status text;
    v_current_balance numeric;
    v_existing_id uuid;
    v_existing_payload jsonb;
    v_payload jsonb;
BEGIN
    IF p_fund_id IS NULL OR p_request_id IS NULL
       OR p_new_status NOT IN ('active', 'suspended', 'closed')
       OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'petty_cash_status_request_invalid'::text, p_fund_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_fund_id, false;
        RETURN;
    END;

    v_payload := jsonb_build_object('fund_id', p_fund_id, 'new_status', p_new_status);
    PERFORM pg_advisory_xact_lock(hashtextextended('w5c:petty_cash_fund_status:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_existing_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'petty_cash_fund'
      AND a.details ->> 'operation' = 'set_petty_cash_fund_status'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_existing_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'petty_cash_status_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT status, current_balance
    INTO v_current_status, v_current_balance
    FROM public.petty_cash_funds
    WHERE id = p_fund_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'petty_cash_fund_not_found'::text, p_fund_id, false;
        RETURN;
    END IF;
    IF v_current_status = 'closed' THEN
        RETURN QUERY SELECT 'petty_cash_fund_closed_immutable'::text, p_fund_id, false;
        RETURN;
    END IF;
    IF p_new_status = v_current_status THEN
        RETURN QUERY SELECT NULL::text, p_fund_id, true;
        RETURN;
    END IF;
    IF p_new_status = 'active' AND v_current_status <> 'suspended' THEN
        RETURN QUERY SELECT 'petty_cash_fund_reactivation_invalid'::text, p_fund_id, false;
        RETURN;
    END IF;
    IF p_new_status = 'suspended' AND v_current_status <> 'active' THEN
        RETURN QUERY SELECT 'petty_cash_fund_suspension_invalid'::text, p_fund_id, false;
        RETURN;
    END IF;
    IF p_new_status = 'closed' AND v_current_balance <> 0 THEN
        RETURN QUERY SELECT 'petty_cash_fund_close_requires_zero_balance'::text, p_fund_id, false;
        RETURN;
    END IF;

    UPDATE public.petty_cash_funds
    SET status = p_new_status,
        updated_at = v_now
    WHERE id = p_fund_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change', 'petty_cash_fund', p_fund_id, p_actor_id,
        jsonb_build_object(
            'operation', 'set_petty_cash_fund_status',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_fund_id, false;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 'petty_cash_fund_status_change_failed'::text, p_fund_id, false;
END;
$$;

-- 4. Replace the W5A transaction RPC with the governed W5C contract.
CREATE OR REPLACE FUNCTION public.record_petty_cash_transaction(
    p_fund_id uuid,
    p_transaction_type text,
    p_amount numeric,
    p_reference text,
    p_expense_id uuid,
    p_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, transaction_id uuid, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_fund_status text;
    v_float_limit numeric;
    v_current_balance numeric;
    v_balance_after numeric;
    v_expense_status text;
    v_expense_origin text;
    v_expense_payment_method text;
    v_expense_petty_cash_fund_id uuid;
    v_expense_amount numeric;
    v_already_disbursed_on_expense numeric;
    v_existing_id uuid;
    v_existing_fund_id uuid;
    v_existing_type text;
    v_existing_amount numeric;
    v_existing_expense_id uuid;
    v_existing_ref text;
    v_existing_notes text;
    v_id uuid;
BEGIN
    IF p_fund_id IS NULL OR p_request_id IS NULL OR p_amount IS NULL OR p_amount <= 0
       OR p_transaction_type NOT IN ('replenishment', 'disbursement', 'return', 'treasury_withdrawal')
       OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'transaction_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_transaction_type = 'disbursement' AND p_expense_id IS NULL THEN
        RETURN QUERY SELECT 'petty_cash_disbursement_expense_required'::text, NULL::uuid, false;
        RETURN;
    END IF;
    IF p_transaction_type = 'treasury_withdrawal' AND NULLIF(btrim(p_reference), '') IS NULL THEN
        RETURN QUERY SELECT 'petty_cash_withdrawal_reference_required'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END;

    PERFORM pg_advisory_xact_lock(hashtextextended('w5c:petty_cash_tx:' || p_request_id::text, 0));

    SELECT id, fund_id, transaction_type, amount, expense_id, reference, notes
    INTO v_existing_id, v_existing_fund_id, v_existing_type, v_existing_amount, v_existing_expense_id, v_existing_ref, v_existing_notes
    FROM public.petty_cash_transactions
    WHERE request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_fund_id IS DISTINCT FROM p_fund_id
           OR v_existing_type IS DISTINCT FROM p_transaction_type
           OR v_existing_amount IS DISTINCT FROM p_amount
           OR v_existing_expense_id IS DISTINCT FROM p_expense_id
           OR v_existing_ref IS DISTINCT FROM NULLIF(btrim(p_reference), '')
           OR v_existing_notes IS DISTINCT FROM NULLIF(btrim(p_notes), '') THEN
            RETURN QUERY SELECT 'petty_cash_transaction_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT status, float_limit, current_balance
    INTO v_fund_status, v_float_limit, v_current_balance
    FROM public.petty_cash_funds
    WHERE id = p_fund_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'petty_cash_fund_not_found'::text, NULL::uuid, false;
        RETURN;
    END IF;
    IF v_fund_status <> 'active' THEN
        RETURN QUERY SELECT 'petty_cash_fund_not_active'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_transaction_type IN ('disbursement', 'treasury_withdrawal') THEN
        IF v_current_balance < p_amount THEN
            RETURN QUERY SELECT 'insufficient_petty_cash_balance'::text, NULL::uuid, false;
            RETURN;
        END IF;

        IF p_transaction_type = 'disbursement' THEN
            SELECT status, origin_type, payment_method, petty_cash_fund_id, amount
            INTO v_expense_status, v_expense_origin, v_expense_payment_method, v_expense_petty_cash_fund_id, v_expense_amount
            FROM public.expenses
            WHERE id = p_expense_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RETURN QUERY SELECT 'expense_not_found'::text, NULL::uuid, false;
                RETURN;
            END IF;
            IF v_expense_status <> 'approved' THEN
                RETURN QUERY SELECT 'expense_must_be_approved_for_petty_cash_disbursement'::text, NULL::uuid, false;
                RETURN;
            END IF;
            IF v_expense_origin <> 'company_direct'
               OR v_expense_payment_method <> 'petty_cash'
               OR v_expense_petty_cash_fund_id <> p_fund_id THEN
                RETURN QUERY SELECT 'expense_not_eligible_for_petty_cash'::text, NULL::uuid, false;
                RETURN;
            END IF;

            SELECT COALESCE(SUM(amount), 0)
            INTO v_already_disbursed_on_expense
            FROM public.petty_cash_transactions
            WHERE expense_id = p_expense_id AND transaction_type = 'disbursement';
            IF v_already_disbursed_on_expense + p_amount > v_expense_amount THEN
                RETURN QUERY SELECT 'disbursement_exceeds_expense_ceiling'::text, NULL::uuid, false;
                RETURN;
            END IF;
        END IF;

        v_balance_after := v_current_balance - p_amount;
    ELSE
        IF p_expense_id IS NOT NULL THEN
            RETURN QUERY SELECT 'non_disbursement_cannot_link_to_expense'::text, NULL::uuid, false;
            RETURN;
        END IF;
        IF v_current_balance + p_amount > v_float_limit THEN
            RETURN QUERY SELECT 'replenishment_exceeds_float_limit'::text, NULL::uuid, false;
            RETURN;
        END IF;
        v_balance_after := v_current_balance + p_amount;
    END IF;

    INSERT INTO public.petty_cash_transactions (
        fund_id, transaction_type, amount, balance_before, balance_after,
        expense_id, reference, request_id, recorded_by, recorded_at, notes
    ) VALUES (
        p_fund_id, p_transaction_type, p_amount, v_current_balance, v_balance_after,
        p_expense_id, NULLIF(btrim(p_reference), ''), p_request_id, v_actor_uuid, v_now, NULLIF(btrim(p_notes), '')
    )
    RETURNING id INTO v_id;

    UPDATE public.petty_cash_funds
    SET current_balance = v_balance_after,
        updated_at = v_now
    WHERE id = p_fund_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'petty_cash_transaction_recorded', 'petty_cash_transaction', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'record_petty_cash_transaction',
            'request_id', p_request_id::text,
            'payload', jsonb_build_object(
                'fund_id', p_fund_id,
                'transaction_type', p_transaction_type,
                'amount', p_amount,
                'expense_id', p_expense_id,
                'reference', NULLIF(btrim(p_reference), '')
            ),
            'fund_id', p_fund_id,
            'transaction_type', p_transaction_type,
            'amount', p_amount,
            'balance_after', v_balance_after,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY SELECT 'petty_cash_transaction_request_conflict'::text, NULL::uuid, false;
    WHEN OTHERS THEN
        RETURN QUERY SELECT 'petty_cash_transaction_failed'::text, NULL::uuid, false;
END;
$$;

REVOKE ALL ON FUNCTION public.create_petty_cash_fund(text, uuid, numeric, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_petty_cash_fund(uuid, text, uuid, numeric, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_petty_cash_fund_status(uuid, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_petty_cash_transaction(uuid, text, numeric, text, uuid, text, uuid, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_petty_cash_fund(text, uuid, numeric, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_petty_cash_fund(uuid, text, uuid, numeric, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_petty_cash_fund_status(uuid, text, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_petty_cash_transaction(uuid, text, numeric, text, uuid, text, uuid, text, text) TO service_role;

COMMIT;
