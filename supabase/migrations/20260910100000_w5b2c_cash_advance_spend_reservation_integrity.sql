-- ============================================================================
-- Migration: 20260910100000_w5b2c_cash_advance_spend_reservation_integrity.sql
-- Description: G7 BLUE W5B-2C-1 Dual-Entry Cash Advance Spend & Reserved-Balance Integrity
--              Hardens submit_expense and record_cash_advance_return RPCs with
--              transactional reserved-spend calculation GREATEST(amount - settled, 0),
--              row-level locking, explicit revoke grants, and canonical read models.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Preflight Safety Guards
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.employee_cash_advances') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.employee_cash_advances does not exist';
    END IF;

    IF to_regclass('public.expenses') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.expenses does not exist';
    END IF;

    IF to_regclass('public.cash_advance_expense_settlements') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.cash_advance_expense_settlements does not exist';
    END IF;

    IF to_regclass('public.cash_advance_returns') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.cash_advance_returns does not exist';
    END IF;

    IF to_regprocedure('public.submit_expense(text, text, uuid, text, text, numeric, date, text, text, uuid, uuid, uuid, uuid, text, text)') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.submit_expense with expected 15 parameters does not exist';
    END IF;

    IF to_regprocedure('public.record_cash_advance_return(uuid, numeric, text, text, uuid, text, text)') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.record_cash_advance_return with expected 7 parameters does not exist';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Canonical submit_expense RPC (Hardened for Cash Advance Funding)
--    Preserves exact pre-W5B-2C canonical behavior for all non-CA funding paths.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_expense(
    p_expense_number text,
    p_context_type text,
    p_service_id uuid,
    p_expense_category text,
    p_description text,
    p_amount numeric,
    p_expense_date date,
    p_origin_type text,
    p_payment_method text,
    p_cash_advance_id uuid,
    p_petty_cash_fund_id uuid,
    p_claimant_id uuid,
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
    v_existing_id uuid;
    v_existing_payload jsonb;
    v_new_payload jsonb;
    v_id uuid;
    v_effective_expense_number text;
    v_adv_status text;
    v_adv_context text;
    v_adv_service_id uuid;
    v_adv_remaining_balance numeric;
    v_reserved_unsettled_spend numeric;
    v_available_uncommitted_balance numeric;
BEGIN
    -- A. Validate basic required request fields
    IF NULLIF(btrim(p_actor_id), '') IS NULL OR p_request_id IS NULL THEN
        RETURN QUERY SELECT 'request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END;

    -- Store caller intent: record NULL if expense_number is blank/null
    v_effective_expense_number := NULLIF(btrim(p_expense_number), '');

    v_new_payload := jsonb_build_object(
        'expense_number', v_effective_expense_number,
        'context_type', p_context_type,
        'service_id', p_service_id,
        'expense_category', p_expense_category,
        'description', p_description,
        'amount', p_amount,
        'expense_date', p_expense_date,
        'origin_type', p_origin_type,
        'payment_method', p_payment_method,
        'cash_advance_id', p_cash_advance_id,
        'petty_cash_fund_id', p_petty_cash_fund_id,
        'claimant_id', p_claimant_id
    );

    -- B. Acquire request-id idempotency protection
    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:expense_submit:' || p_request_id::text, 0));

    -- C. Inspect existing row for request_id
    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_existing_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense'
      AND a.details ->> 'operation' = 'submit_expense'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    -- D. & E. Replay vs conflict check before mutable current-state financial validation
    IF FOUND THEN
        IF v_existing_payload IS DISTINCT FROM v_new_payload THEN
            RETURN QUERY SELECT 'expense_submit_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    -- F. Funding path exclusivity validations (preserved canonical legacy contracts)
    IF p_origin_type = 'employee_paid' AND p_payment_method != 'personal_funds' THEN
        RETURN QUERY SELECT 'employee_paid_requires_personal_funds'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_origin_type = 'company_direct' AND p_payment_method = 'personal_funds' THEN
        RETURN QUERY SELECT 'company_direct_cannot_use_personal_funds'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_payment_method = 'cash_advance' AND p_cash_advance_id IS NULL THEN
        RETURN QUERY SELECT 'cash_advance_id_required'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_payment_method = 'petty_cash' AND p_petty_cash_fund_id IS NULL THEN
        RETURN QUERY SELECT 'petty_cash_fund_id_required'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Context validations (preserved canonical legacy contracts)
    IF p_context_type = 'event' AND p_service_id IS NULL THEN
        RETURN QUERY SELECT 'event_requires_service_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_context_type = 'company' AND p_service_id IS NOT NULL THEN
        RETURN QUERY SELECT 'company_cannot_have_service_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Claimant validations (preserved canonical legacy contracts)
    IF p_origin_type = 'employee_paid' AND p_claimant_id IS NULL THEN
        RETURN QUERY SELECT 'employee_paid_requires_claimant'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_origin_type = 'company_direct' AND p_claimant_id IS NOT NULL THEN
        RETURN QUERY SELECT 'company_direct_cannot_have_claimant'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- G. Cash Advance specific structural and financial hardening
    IF p_payment_method = 'cash_advance' THEN
        -- Row lock on employee_cash_advances before reservation calculation
        SELECT status, context_type, service_id, remaining_balance
        INTO v_adv_status, v_adv_context, v_adv_service_id, v_adv_remaining_balance
        FROM public.employee_cash_advances
        WHERE id = p_cash_advance_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'advance_not_found'::text, NULL::uuid, false;
            RETURN;
        END IF;

        IF v_adv_status != 'issued' THEN
            RETURN QUERY SELECT 'advance_not_in_issued_status'::text, NULL::uuid, false;
            RETURN;
        END IF;

        -- Context and Service integrity validation
        IF v_adv_context IS DISTINCT FROM p_context_type THEN
            RETURN QUERY SELECT 'service_context_mismatch'::text, NULL::uuid, false;
            RETURN;
        END IF;

        IF v_adv_context = 'event' THEN
            IF v_adv_service_id IS NULL OR p_service_id IS NULL OR v_adv_service_id IS DISTINCT FROM p_service_id THEN
                RETURN QUERY SELECT 'service_context_mismatch'::text, NULL::uuid, false;
                RETURN;
            END IF;
        ELSIF v_adv_context = 'company' THEN
            IF v_adv_service_id IS NOT NULL OR p_service_id IS NOT NULL THEN
                RETURN QUERY SELECT 'service_context_mismatch'::text, NULL::uuid, false;
                RETURN;
            END IF;
        END IF;

        -- Transactional calculation of reserved unsettled spend
        -- settled_amount = SUM(cash_advance_expense_settlements.amount for that expense)
        -- unsettled_amount = GREATEST(expense.amount - settled_amount, 0)
        -- reserved_unsettled_spend = SUM(unsettled_amount) for active linked expenses status IN ('submitted', 'approved')
        SELECT COALESCE(SUM(
            GREATEST(
                e.amount - COALESCE((
                    SELECT SUM(case_sub.amount)
                    FROM public.cash_advance_expense_settlements case_sub
                    WHERE case_sub.expense_id = e.id
                ), 0),
                0
            )
        ), 0)
        INTO v_reserved_unsettled_spend
        FROM public.expenses e
        WHERE e.cash_advance_id = p_cash_advance_id
          AND e.status IN ('submitted', 'approved');

        v_available_uncommitted_balance := v_adv_remaining_balance - v_reserved_unsettled_spend;

        IF p_amount > v_available_uncommitted_balance THEN
            RETURN QUERY SELECT 'expense_amount_exceeds_available_advance_balance'::text, NULL::uuid, false;
            RETURN;
        END IF;
    END IF;

    -- Only generate document number for genuinely new request when not provided by caller
    IF v_effective_expense_number IS NULL THEN
        v_effective_expense_number := public.generate_document_number('expense');
        IF v_effective_expense_number IS NULL OR btrim(v_effective_expense_number) = '' THEN
            RETURN QUERY SELECT 'number_generation_failed'::text, NULL::uuid, false;
            RETURN;
        END IF;
    END IF;

    INSERT INTO public.expenses (
        expense_number, context_type, service_id, expense_category, description,
        amount, currency, expense_date, origin_type, payment_method,
        cash_advance_id, petty_cash_fund_id, claimant_id, submitted_by, submitted_at, status
    ) VALUES (
        v_effective_expense_number, p_context_type, p_service_id, p_expense_category, p_description,
        p_amount, 'SAR', p_expense_date, p_origin_type, p_payment_method,
        p_cash_advance_id, p_petty_cash_fund_id, p_claimant_id, v_actor_uuid, v_now, 'submitted'
    )
    RETURNING id INTO v_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_submitted', 'expense', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'submit_expense',
            'request_id', p_request_id::text,
            'payload', v_new_payload,
            'actor_role', p_actor_role,
            'expense_number', v_effective_expense_number
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 'expense_number_already_exists'::text, NULL::uuid, false;
WHEN OTHERS THEN
    RETURN QUERY SELECT 'expense_submit_failed'::text, NULL::uuid, false;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_expense(
    text, text, uuid, text, text, numeric, date, text, text, uuid, uuid, uuid, uuid, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_expense(
    text, text, uuid, text, text, numeric, date, text, text, uuid, uuid, uuid, uuid, text, text
) TO service_role;


-- ----------------------------------------------------------------------------
-- 3. Canonical record_cash_advance_return RPC (Hardened for Reserved Spend)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_cash_advance_return(
    p_advance_id uuid,
    p_amount numeric,
    p_receipt_reference text,
    p_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    return_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_status text;
    v_amount_issued numeric;
    v_spent_settled numeric;
    v_returned numeric;
    v_remaining_balance numeric;
    v_existing_id uuid;
    v_existing_advance_id uuid;
    v_existing_amount numeric;
    v_existing_ref text;
    v_id uuid;
    v_reserved_unsettled_spend numeric;
    v_available_uncommitted_balance numeric;
BEGIN
    -- A. Validate basic required request fields
    IF p_advance_id IS NULL OR p_request_id IS NULL OR p_amount IS NULL OR p_amount <= 0
       OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'return_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- B. Acquire request-id idempotency protection
    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_return:' || p_request_id::text, 0));

    -- C. Inspect existing row for request_id
    SELECT id, cash_advance_id, amount, receipt_reference
    INTO v_existing_id, v_existing_advance_id, v_existing_amount, v_existing_ref
    FROM public.cash_advance_returns
    WHERE request_id = p_request_id;

    -- D. & E. Replay vs conflict check before mutable current-state financial validation
    IF FOUND THEN
        IF v_existing_advance_id IS DISTINCT FROM p_advance_id
           OR v_existing_amount IS DISTINCT FROM p_amount
           OR v_existing_ref IS DISTINCT FROM p_receipt_reference THEN
            RETURN QUERY SELECT 'cash_advance_return_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    -- F. Genuinely new request: lock Cash Advance row
    SELECT status, amount_issued, amount_spent_settled, amount_returned, remaining_balance
    INTO v_status, v_amount_issued, v_spent_settled, v_returned, v_remaining_balance
    FROM public.employee_cash_advances
    WHERE id = p_advance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'advance_not_found'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_status != 'issued' THEN
        RETURN QUERY SELECT 'advance_must_be_issued_to_record_return'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Transactional calculation of reserved unsettled spend
    SELECT COALESCE(SUM(
        GREATEST(
            e.amount - COALESCE((
                SELECT SUM(case_sub.amount)
                FROM public.cash_advance_expense_settlements case_sub
                WHERE case_sub.expense_id = e.id
            ), 0),
            0
        )
    ), 0)
    INTO v_reserved_unsettled_spend
    FROM public.expenses e
    WHERE e.cash_advance_id = p_advance_id
      AND e.status IN ('submitted', 'approved');

    v_available_uncommitted_balance := v_remaining_balance - v_reserved_unsettled_spend;

    -- Bound: Return cannot consume cash reserved by active in-flight spend
    IF p_amount > v_available_uncommitted_balance THEN
        RETURN QUERY SELECT 'return_amount_exceeds_available_balance'::text, NULL::uuid, false;
        RETURN;
    END IF;

    INSERT INTO public.cash_advance_returns (
        cash_advance_id, amount, receipt_reference, request_id, returned_by, returned_at, notes
    ) VALUES (
        p_advance_id, p_amount, p_receipt_reference, p_request_id, v_actor_uuid, v_now, p_notes
    )
    RETURNING id INTO v_id;

    -- Authoritatively reconcile aggregate on employee_cash_advances
    UPDATE public.employee_cash_advances
    SET amount_returned = amount_returned + p_amount,
        status = CASE WHEN (amount_spent_settled + amount_returned + p_amount) = amount_issued THEN 'settled' ELSE status END,
        settled_at = CASE WHEN (amount_spent_settled + amount_returned + p_amount) = amount_issued THEN v_now ELSE settled_at END,
        updated_at = v_now
    WHERE id = p_advance_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_returned', 'cash_advance_return', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'record_cash_advance_return',
            'request_id', p_request_id::text,
            'payload', jsonb_build_object(
                'cash_advance_id', p_advance_id,
                'amount', p_amount,
                'receipt_reference', p_receipt_reference
            ),
            'cash_advance_id', p_advance_id,
            'amount', p_amount,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.record_cash_advance_return(
    uuid, numeric, text, text, uuid, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_cash_advance_return(
    uuid, numeric, text, text, uuid, text, text
) TO service_role;


-- ----------------------------------------------------------------------------
-- 4. Canonical get_cash_advance_balance_summary RPC (Read Model)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_cash_advance_balance_summary(p_advance_id uuid)
RETURNS TABLE(
    advance_id uuid,
    advance_number text,
    recipient_id uuid,
    context_type text,
    service_id uuid,
    status text,
    amount_issued numeric,
    amount_spent_settled numeric,
    amount_returned numeric,
    remaining_balance numeric,
    reserved_unsettled_spend numeric,
    available_uncommitted_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_adv record;
    v_reserved numeric;
BEGIN
    SELECT a.id, a.advance_number, a.recipient_id, a.context_type, a.service_id,
           a.status, a.amount_issued, a.amount_spent_settled, a.amount_returned, a.remaining_balance
    INTO v_adv
    FROM public.employee_cash_advances a
    WHERE a.id = p_advance_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT COALESCE(SUM(
        GREATEST(
            e.amount - COALESCE((
                SELECT SUM(case_sub.amount)
                FROM public.cash_advance_expense_settlements case_sub
                WHERE case_sub.expense_id = e.id
            ), 0),
            0
        )
    ), 0)
    INTO v_reserved
    FROM public.expenses e
    WHERE e.cash_advance_id = p_advance_id
      AND e.status IN ('submitted', 'approved');

    RETURN QUERY SELECT
        v_adv.id AS advance_id,
        v_adv.advance_number,
        v_adv.recipient_id,
        v_adv.context_type,
        v_adv.service_id,
        v_adv.status,
        v_adv.amount_issued,
        v_adv.amount_spent_settled,
        v_adv.amount_returned,
        v_adv.remaining_balance,
        v_reserved AS reserved_unsettled_spend,
        (v_adv.remaining_balance - v_reserved) AS available_uncommitted_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cash_advance_balance_summary(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_cash_advance_balance_summary(uuid) TO service_role;


-- ----------------------------------------------------------------------------
-- 5. Canonical get_linked_cash_advance_expenses RPC (Read Model)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_linked_cash_advance_expenses(p_advance_id uuid)
RETURNS TABLE(
    expense_id uuid,
    expense_number text,
    status text,
    expense_category text,
    description text,
    amount numeric,
    expense_date date,
    finance_reviewed_at timestamptz,
    approved_at timestamptz,
    rejected_at timestamptz,
    cash_advance_id uuid,
    settled_amount numeric,
    unsettled_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id AS expense_id,
        e.expense_number,
        e.status,
        e.expense_category,
        e.description,
        e.amount,
        e.expense_date,
        e.finance_reviewed_at,
        e.approved_at,
        e.rejected_at,
        e.cash_advance_id,
        COALESCE(s.settled, 0.00) AS settled_amount,
        GREATEST(e.amount - COALESCE(s.settled, 0.00), 0.00) AS unsettled_amount
    FROM public.expenses e
    LEFT JOIN LATERAL (
        SELECT SUM(c.amount) AS settled
        FROM public.cash_advance_expense_settlements c
        WHERE c.expense_id = e.id
    ) s ON true
    WHERE e.cash_advance_id = p_advance_id
    ORDER BY e.expense_date DESC, e.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_linked_cash_advance_expenses(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_linked_cash_advance_expenses(uuid) TO service_role;

COMMIT;
