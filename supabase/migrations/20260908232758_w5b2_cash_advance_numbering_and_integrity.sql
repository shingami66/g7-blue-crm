-- ============================================================================
-- Migration: 20260909100000_w5b2_cash_advance_numbering_and_integrity.sql
-- Description: Authoritative Cash Advance Numbering and Settlement Integrity
-- Target: public.number_sequences, public.generate_document_number,
--         public.request_cash_advance, public.settle_cash_advance_spend
-- Security: SECURITY DEFINER, search_path = pg_catalog, public, service_role-only
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Preflight Safety Guards
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.number_sequences') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.number_sequences does not exist';
    END IF;

    IF to_regprocedure('public.generate_document_number(text)') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.generate_document_number(text) does not exist';
    END IF;

    IF to_regclass('public.employee_cash_advances') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.employee_cash_advances does not exist';
    END IF;

    IF to_regclass('public.expenses') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.expenses does not exist';
    END IF;

    IF to_regclass('public.cash_advance_expense_settlements') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.cash_advance_expense_settlements does not exist';
    END IF;

    IF to_regprocedure('public.request_cash_advance(text, text, uuid, uuid, text, numeric, uuid, text, text)') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.request_cash_advance with expected 9 parameters does not exist';
    END IF;

    IF to_regprocedure('public.settle_cash_advance_spend(uuid, uuid, numeric, text, uuid, text, text)') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.settle_cash_advance_spend with expected 7 parameters does not exist';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Extend number_sequences type constraint
--    Preserves: quotation, invoice, payment, project, service, customer, supplier_booking, expense
--    Appends:   cash_advance
-- ----------------------------------------------------------------------------
ALTER TABLE public.number_sequences
    DROP CONSTRAINT IF EXISTS number_sequences_type_check;

ALTER TABLE public.number_sequences
    ADD CONSTRAINT number_sequences_type_check
    CHECK (type IN ('quotation', 'invoice', 'payment', 'project', 'service', 'customer', 'supplier_booking', 'expense', 'cash_advance'));

-- ----------------------------------------------------------------------------
-- 3. Extend public.generate_document_number(text)
--    Preserves all existing document numbering formats (QT, INV, PAY, PRJ, SVC, CUST, SBK, EXP)
--    Adds 'cash_advance' -> prefix 'ADV', format 'ADV-YYYY-0001'
--    Strict SECURITY DEFINER with fixed search_path
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_document_number(doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    current_year integer;
    seq_record record;
    formatted_number text;
BEGIN
    IF doc_type IS NULL OR doc_type NOT IN ('quotation', 'invoice', 'payment', 'project', 'service', 'customer', 'supplier_booking', 'expense', 'cash_advance') THEN
        RAISE EXCEPTION 'Invalid doc_type: %. Allowed values are: quotation, invoice, payment, project, service, customer, supplier_booking, expense, cash_advance', doc_type;
    END IF;

    current_year := extract(year from current_date);

    INSERT INTO public.number_sequences (type, year, sequence, prefix, example_format)
    VALUES (
        doc_type,
        current_year,
        1,
        CASE
            WHEN doc_type = 'quotation' THEN 'QT'
            WHEN doc_type = 'invoice'   THEN 'INV'
            WHEN doc_type = 'payment'   THEN 'PAY'
            WHEN doc_type = 'project'   THEN 'PRJ'
            WHEN doc_type = 'service'   THEN 'SVC'
            WHEN doc_type = 'customer'  THEN 'CUST'
            WHEN doc_type = 'supplier_booking' THEN 'SBK'
            WHEN doc_type = 'expense'   THEN 'EXP'
            WHEN doc_type = 'cash_advance'     THEN 'ADV'
        END,
        CASE
            WHEN doc_type = 'quotation' THEN 'QT-YYYY-0001'
            WHEN doc_type = 'invoice'   THEN 'INV-YYYY-0001'
            WHEN doc_type = 'payment'   THEN 'PAY-YYYY-0001'
            WHEN doc_type = 'project'   THEN 'PRJ-YYYY-0001'
            WHEN doc_type = 'service'   THEN 'SVC-YYYY-0001'
            WHEN doc_type = 'customer'  THEN 'CUST-YYYY-0001'
            WHEN doc_type = 'supplier_booking' THEN 'SBK-YYYY-0001'
            WHEN doc_type = 'expense'   THEN 'EXP-YYYY-0001'
            WHEN doc_type = 'cash_advance'     THEN 'ADV-YYYY-0001'
        END
    )
    ON CONFLICT (type, year) DO UPDATE
    SET sequence = number_sequences.sequence + 1
    RETURNING * INTO seq_record;

    formatted_number := seq_record.prefix || '-' || current_year || '-' || lpad(seq_record.sequence::text, 4, '0');

    RETURN formatted_number;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_document_number(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_document_number(text) TO service_role;

-- ----------------------------------------------------------------------------
-- 4. Replace public.request_cash_advance
--    Exact 9-parameter signature preserved.
--    Explicit p_advance_number -> preserved for admin/legacy compatibility.
--    NULL or blank p_advance_number -> generated authoritatively via generate_document_number('cash_advance').
--    Generation happens AFTER advisory lock and AFTER idempotent replay detection.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_cash_advance(
    p_advance_number text,
    p_context_type text,
    p_service_id uuid,
    p_recipient_id uuid,
    p_purpose text,
    p_amount_issued numeric,
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
    v_existing_id uuid;
    v_existing_payload jsonb;
    v_new_payload jsonb;
    v_id uuid;
    v_effective_advance_number text;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL OR p_request_id IS NULL OR p_recipient_id IS NULL
       OR p_amount_issued IS NULL OR p_amount_issued <= 0
       OR NULLIF(btrim(p_purpose), '') IS NULL OR char_length(btrim(p_purpose)) < 5 THEN
        RETURN QUERY SELECT 'cash_advance_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Context validations
    IF p_context_type NOT IN ('company', 'event') THEN
        RETURN QUERY SELECT 'cash_advance_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_context_type = 'company' AND p_service_id IS NOT NULL THEN
        RETURN QUERY SELECT 'cash_advance_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_context_type = 'event' AND p_service_id IS NULL THEN
        RETURN QUERY SELECT 'cash_advance_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END;

    -- Store caller intent: record NULL if advance_number is blank/null
    v_effective_advance_number := NULLIF(btrim(p_advance_number), '');

    v_new_payload := jsonb_build_object(
        'advance_number', v_effective_advance_number,
        'context_type', p_context_type,
        'service_id', p_service_id,
        'recipient_id', p_recipient_id,
        'purpose', btrim(p_purpose),
        'amount_issued', p_amount_issued
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_request:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_existing_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'employee_cash_advance'
      AND a.details ->> 'operation' = 'request_cash_advance'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    IF FOUND THEN
        IF v_existing_payload IS DISTINCT FROM v_new_payload THEN
            RETURN QUERY SELECT 'cash_advance_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    -- Only generate document number for genuinely new request when not provided by caller
    IF v_effective_advance_number IS NULL THEN
        v_effective_advance_number := public.generate_document_number('cash_advance');
        IF v_effective_advance_number IS NULL OR btrim(v_effective_advance_number) = '' THEN
            RETURN QUERY SELECT 'number_generation_failed'::text, NULL::uuid, false;
            RETURN;
        END IF;
    END IF;

    INSERT INTO public.employee_cash_advances (
        advance_number, context_type, service_id, recipient_id, purpose,
        amount_issued, requested_by, requested_at, status
    ) VALUES (
        v_effective_advance_number, p_context_type, p_service_id, p_recipient_id, btrim(p_purpose),
        p_amount_issued, v_actor_uuid, v_now, 'submitted'
    )
    RETURNING id INTO v_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_requested', 'employee_cash_advance', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'request_cash_advance',
            'request_id', p_request_id::text,
            'payload', v_new_payload,
            'actor_role', p_actor_role,
            'advance_number', v_effective_advance_number
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 'advance_number_already_exists'::text, NULL::uuid, false;
WHEN OTHERS THEN
    RETURN QUERY SELECT 'advance_request_failed'::text, NULL::uuid, false;
END;
$$;

REVOKE ALL ON FUNCTION public.request_cash_advance(text, text, uuid, uuid, text, numeric, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_cash_advance(text, text, uuid, uuid, text, numeric, uuid, text, text) TO service_role;

-- ----------------------------------------------------------------------------
-- 5. Replace public.settle_cash_advance_spend
--    Exact 7-parameter signature preserved.
--    Loads and verifies context_type and service_id on both Advance and Expense.
--    Enforces strict context matching:
--      - company <=> company (both service_id IS NULL)
--      - event <=> event (identical non-null service_id)
--      - any mismatch returns 'service_context_mismatch'
--    Preserves all financial invariants, ceilings, locks, and automatic zero-balance settlement.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_cash_advance_spend(
    p_advance_id uuid,
    p_expense_id uuid,
    p_amount numeric,
    p_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    allocation_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_advance_status text;
    v_amount_issued numeric;
    v_spent_settled numeric;
    v_returned numeric;
    v_remaining_balance numeric;
    v_advance_context text;
    v_advance_service_id uuid;
    v_expense_status text;
    v_expense_origin text;
    v_expense_payment_method text;
    v_expense_cash_advance_id uuid;
    v_expense_amount numeric;
    v_expense_context text;
    v_expense_service_id uuid;
    v_already_allocated numeric;
    v_existing_id uuid;
    v_existing_advance_id uuid;
    v_existing_expense_id uuid;
    v_existing_amount numeric;
    v_id uuid;
BEGIN
    IF p_advance_id IS NULL OR p_expense_id IS NULL OR p_request_id IS NULL
       OR p_amount IS NULL OR p_amount <= 0 OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'allocation_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END;

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_spend_settle:' || p_request_id::text, 0));

    SELECT id, cash_advance_id, expense_id, amount
    INTO v_existing_id, v_existing_advance_id, v_existing_expense_id, v_existing_amount
    FROM public.cash_advance_expense_settlements
    WHERE request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_advance_id IS DISTINCT FROM p_advance_id
           OR v_existing_expense_id IS DISTINCT FROM p_expense_id
           OR v_existing_amount IS DISTINCT FROM p_amount THEN
            RETURN QUERY SELECT 'cash_advance_settlement_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    -- Deterministic row-locking order by UUID to prevent deadlocks
    IF p_advance_id < p_expense_id THEN
        SELECT status, amount_issued, amount_spent_settled, amount_returned, remaining_balance, context_type, service_id
        INTO v_advance_status, v_amount_issued, v_spent_settled, v_returned, v_remaining_balance, v_advance_context, v_advance_service_id
        FROM public.employee_cash_advances WHERE id = p_advance_id FOR UPDATE;

        SELECT status, origin_type, payment_method, cash_advance_id, amount, context_type, service_id
        INTO v_expense_status, v_expense_origin, v_expense_payment_method, v_expense_cash_advance_id, v_expense_amount, v_expense_context, v_expense_service_id
        FROM public.expenses WHERE id = p_expense_id FOR UPDATE;
    ELSE
        SELECT status, origin_type, payment_method, cash_advance_id, amount, context_type, service_id
        INTO v_expense_status, v_expense_origin, v_expense_payment_method, v_expense_cash_advance_id, v_expense_amount, v_expense_context, v_expense_service_id
        FROM public.expenses WHERE id = p_expense_id FOR UPDATE;

        SELECT status, amount_issued, amount_spent_settled, amount_returned, remaining_balance, context_type, service_id
        INTO v_advance_status, v_amount_issued, v_spent_settled, v_returned, v_remaining_balance, v_advance_context, v_advance_service_id
        FROM public.employee_cash_advances WHERE id = p_advance_id FOR UPDATE;
    END IF;

    IF v_advance_status IS NULL THEN
        RETURN QUERY SELECT 'advance_not_found'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_expense_status IS NULL THEN
        RETURN QUERY SELECT 'expense_not_found'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_advance_status != 'issued' THEN
        RETURN QUERY SELECT 'advance_not_in_issued_status'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_expense_status != 'approved' THEN
        RETURN QUERY SELECT 'expense_not_in_approved_status'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Funding path exclusivity validation: must be company_direct with cash_advance payment method
    IF v_expense_origin != 'company_direct' OR v_expense_payment_method != 'cash_advance' OR v_expense_cash_advance_id != p_advance_id THEN
        RETURN QUERY SELECT 'expense_not_eligible_for_advance_settlement'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Service / Event Context Integrity Validation
    IF v_advance_context != v_expense_context THEN
        RETURN QUERY SELECT 'service_context_mismatch'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_advance_context = 'event' THEN
        IF v_advance_service_id IS NULL OR v_expense_service_id IS NULL OR v_advance_service_id IS DISTINCT FROM v_expense_service_id THEN
            RETURN QUERY SELECT 'service_context_mismatch'::text, NULL::uuid, false;
            RETURN;
        END IF;
    ELSIF v_advance_context = 'company' THEN
        IF v_advance_service_id IS NOT NULL OR v_expense_service_id IS NOT NULL THEN
            RETURN QUERY SELECT 'service_context_mismatch'::text, NULL::uuid, false;
            RETURN;
        END IF;
    ELSE
        RETURN QUERY SELECT 'service_context_mismatch'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Double-bounded checks:
    -- Bound 1: Cannot exceed advance remaining balance
    IF p_amount > v_remaining_balance THEN
        RETURN QUERY SELECT 'allocation_exceeds_remaining_advance_balance'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Bound 2: Cannot exceed expense total amount
    SELECT COALESCE(SUM(amount), 0) INTO v_already_allocated
    FROM public.cash_advance_expense_settlements
    WHERE expense_id = p_expense_id;

    IF v_already_allocated + p_amount > v_expense_amount THEN
        RETURN QUERY SELECT 'allocation_exceeds_expense_amount'::text, NULL::uuid, false;
        RETURN;
    END IF;

    INSERT INTO public.cash_advance_expense_settlements (
        cash_advance_id, expense_id, amount, request_id, settled_by, settled_at, notes
    ) VALUES (
        p_advance_id, p_expense_id, p_amount, p_request_id, v_actor_uuid, v_now, p_notes
    )
    RETURNING id INTO v_id;

    -- Authoritatively reconcile aggregate on employee_cash_advances
    UPDATE public.employee_cash_advances
    SET amount_spent_settled = amount_spent_settled + p_amount,
        status = CASE WHEN (amount_spent_settled + p_amount + amount_returned) = amount_issued THEN 'settled' ELSE status END,
        settled_at = CASE WHEN (amount_spent_settled + p_amount + amount_returned) = amount_issued THEN v_now ELSE settled_at END,
        updated_at = v_now
    WHERE id = p_advance_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_expense_settled', 'cash_advance_expense_settlement', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'settle_cash_advance_spend',
            'request_id', p_request_id::text,
            'payload', jsonb_build_object(
                'cash_advance_id', p_advance_id,
                'expense_id', p_expense_id,
                'amount', p_amount
            ),
            'cash_advance_id', p_advance_id,
            'expense_id', p_expense_id,
            'amount', p_amount,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_cash_advance_spend(uuid, uuid, numeric, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_cash_advance_spend(uuid, uuid, numeric, text, uuid, text, text) TO service_role;

COMMIT;
