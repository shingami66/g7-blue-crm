-- ============================================================================
-- Migration: 20260908100000_w5b1_expense_document_numbering.sql
-- Description: Authoritative Expense Document Numbering Foundation
-- Target: public.number_sequences, public.generate_document_number, public.submit_expense
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

    IF to_regclass('public.expenses') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.expenses does not exist';
    END IF;

    IF to_regprocedure('public.submit_expense(text, text, uuid, text, text, numeric, date, text, text, uuid, uuid, uuid, uuid, text, text)') IS NULL THEN
        RAISE EXCEPTION 'Preflight failed: public.submit_expense with expected 15 parameters does not exist';
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Extend number_sequences type constraint
--    Preserves: quotation, invoice, payment, project, service, customer, supplier_booking
--    Appends:   expense
-- ----------------------------------------------------------------------------
ALTER TABLE public.number_sequences
    DROP CONSTRAINT IF EXISTS number_sequences_type_check;

ALTER TABLE public.number_sequences
    ADD CONSTRAINT number_sequences_type_check
    CHECK (type IN ('quotation', 'invoice', 'payment', 'project', 'service', 'customer', 'supplier_booking', 'expense'));

-- ----------------------------------------------------------------------------
-- 3. Extend public.generate_document_number(text)
--    Preserves all existing document numbering formats
--    Adds 'expense' -> prefix 'EXP', format 'EXP-YYYY-0001'
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
    IF doc_type IS NULL OR doc_type NOT IN ('quotation', 'invoice', 'payment', 'project', 'service', 'customer', 'supplier_booking', 'expense') THEN
        RAISE EXCEPTION 'Invalid doc_type: %. Allowed values are: quotation, invoice, payment, project, service, customer, supplier_booking, expense', doc_type;
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
-- 4. Replace public.submit_expense forward-only
--    Exact 15-parameter signature preserved.
--    Explicit p_expense_number -> preserved.
--    NULL or blank p_expense_number -> generated via generate_document_number('expense')
--    Generation happens AFTER advisory lock and AFTER idempotent replay detection.
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
BEGIN
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

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:expense_submit:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_existing_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense'
      AND a.details ->> 'operation' = 'submit_expense'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    IF FOUND THEN
        IF v_existing_payload IS DISTINCT FROM v_new_payload THEN
            RETURN QUERY SELECT 'expense_submit_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    -- Funding path exclusivity validations
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

    -- Context validations
    IF p_context_type = 'event' AND p_service_id IS NULL THEN
        RETURN QUERY SELECT 'event_requires_service_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_context_type = 'company' AND p_service_id IS NOT NULL THEN
        RETURN QUERY SELECT 'company_cannot_have_service_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Claimant validations
    IF p_origin_type = 'employee_paid' AND p_claimant_id IS NULL THEN
        RETURN QUERY SELECT 'employee_paid_requires_claimant'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_origin_type = 'company_direct' AND p_claimant_id IS NOT NULL THEN
        RETURN QUERY SELECT 'company_direct_cannot_have_claimant'::text, NULL::uuid, false;
        RETURN;
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

REVOKE ALL ON FUNCTION public.submit_expense(text, text, uuid, text, text, numeric, date, text, text, uuid, uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_expense(text, text, uuid, text, text, numeric, date, text, text, uuid, uuid, uuid, uuid, text, text) TO service_role;

COMMIT;
