-- ============================================================================
-- Verification Smoke: w5b1_expense_document_numbering_smoke.sql
-- Description: Transactional verification of Authoritative Expense Numbering Foundation
-- Invariant: Always executes inside BEGIN ... ROLLBACK with ZERO persistence.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_user_employee uuid := gen_random_uuid();
    v_current_year integer := extract(year from current_date);

    v_gen_num text;
    v_quotation_num text;
    v_customer_num text;

    v_req_1 uuid := gen_random_uuid();
    v_req_2 uuid := gen_random_uuid();
    v_req_legacy uuid := gen_random_uuid();

    outcome record;
    v_exp1_id uuid;
    v_exp1_num text;
    v_exp2_id uuid;
    v_exp2_num text;
    v_exp_legacy_num text;

    v_seq_before integer;
    v_seq_after integer;
    v_seq_replay integer;
    v_seq_conflict integer;
BEGIN
    -- 0. Create synthetic test employee user
    INSERT INTO public.app_users (id, clerk_user_id, email, name, role)
    VALUES (v_user_employee, 'clerk_smoke_' || v_user_employee, 'smoke_emp_num@example.com', 'Smoke Employee Numbering', 'sales');

    -- ------------------------------------------------------------------------
    -- 1. Verify direct generate_document_number('expense') format
    -- ------------------------------------------------------------------------
    v_gen_num := public.generate_document_number('expense');
    IF v_gen_num IS NULL OR v_gen_num !~ '^EXP-[0-9]{4}-[0-9]{4}$' THEN
        RAISE EXCEPTION 'generate_document_number(expense) format invalid: expected ^EXP-[0-9]{4}-[0-9]{4}$, got %', v_gen_num;
    END IF;

    -- ------------------------------------------------------------------------
    -- 2. Verify non-Expense generate_document_number compatibility
    -- ------------------------------------------------------------------------
    v_quotation_num := public.generate_document_number('quotation');
    IF v_quotation_num IS NULL OR v_quotation_num !~ '^QT-[0-9]{4}-[0-9]{4}$' THEN
        RAISE EXCEPTION 'generate_document_number(quotation) format invalid: expected ^QT-[0-9]{4}-[0-9]{4}$, got %', v_quotation_num;
    END IF;

    v_customer_num := public.generate_document_number('customer');
    IF v_customer_num IS NULL OR v_customer_num !~ '^CUST-[0-9]{4}-[0-9]{4}$' THEN
        RAISE EXCEPTION 'generate_document_number(customer) format invalid: expected ^CUST-[0-9]{4}-[0-9]{4}$, got %', v_customer_num;
    END IF;

    -- ------------------------------------------------------------------------
    -- 3. Verify submit_expense generates distinct sequential numbers with NULL input
    -- ------------------------------------------------------------------------
    SELECT sequence INTO v_seq_before
    FROM public.number_sequences
    WHERE type = 'expense' AND year = v_current_year;

    -- Submission 1 (NULL p_expense_number)
    SELECT * INTO outcome FROM public.submit_expense(
        NULL,
        'company',
        NULL,
        'travel',
        'Auto Number Expense 1',
        100.00,
        CURRENT_DATE,
        'employee_paid',
        'personal_funds',
        NULL,
        NULL,
        v_user_employee,
        v_req_1,
        v_user_employee::text,
        'sales'
    );
    IF outcome.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'submit_expense 1 with NULL number failed: %', outcome.error_code;
    END IF;
    IF outcome.idempotent_replay THEN
        RAISE EXCEPTION 'submit_expense 1 must not be an idempotent replay';
    END IF;
    v_exp1_id := outcome.expense_id;

    SELECT expense_number INTO v_exp1_num
    FROM public.expenses
    WHERE id = v_exp1_id;

    IF v_exp1_num IS NULL OR v_exp1_num !~ '^EXP-[0-9]{4}-[0-9]{4}$' THEN
        RAISE EXCEPTION 'Expense 1 number format invalid: expected ^EXP-[0-9]{4}-[0-9]{4}$, got %', v_exp1_num;
    END IF;

    -- Submission 2 (blank '' p_expense_number)
    SELECT * INTO outcome FROM public.submit_expense(
        '   ',
        'company',
        NULL,
        'meals',
        'Auto Number Expense 2',
        75.00,
        CURRENT_DATE,
        'employee_paid',
        'personal_funds',
        NULL,
        NULL,
        v_user_employee,
        v_req_2,
        v_user_employee::text,
        'sales'
    );
    IF outcome.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'submit_expense 2 with blank number failed: %', outcome.error_code;
    END IF;
    v_exp2_id := outcome.expense_id;

    SELECT expense_number INTO v_exp2_num
    FROM public.expenses
    WHERE id = v_exp2_id;

    IF v_exp2_num IS NULL OR v_exp2_num !~ '^EXP-[0-9]{4}-[0-9]{4}$' THEN
        RAISE EXCEPTION 'Expense 2 number format invalid: expected ^EXP-[0-9]{4}-[0-9]{4}$, got %', v_exp2_num;
    END IF;

    IF v_exp1_num = v_exp2_num THEN
        RAISE EXCEPTION 'Consecutive generated expense numbers must be distinct: % vs %', v_exp1_num, v_exp2_num;
    END IF;

    SELECT sequence INTO v_seq_after
    FROM public.number_sequences
    WHERE type = 'expense' AND year = v_current_year;

    IF v_seq_after != v_seq_before + 2 THEN
        RAISE EXCEPTION 'Sequence should have incremented exactly 2 for two submissions: before %, after %', v_seq_before, v_seq_after;
    END IF;

    -- ------------------------------------------------------------------------
    -- 4. Verify identical request replay:
    --    - returns same expense_id
    --    - idempotent_replay = true
    --    - does NOT consume another sequence value
    -- ------------------------------------------------------------------------
    SELECT * INTO outcome FROM public.submit_expense(
        NULL,
        'company',
        NULL,
        'travel',
        'Auto Number Expense 1',
        100.00,
        CURRENT_DATE,
        'employee_paid',
        'personal_funds',
        NULL,
        NULL,
        v_user_employee,
        v_req_1,
        v_user_employee::text,
        'sales'
    );
    IF outcome.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'submit_expense replay failed: %', outcome.error_code;
    END IF;
    IF outcome.expense_id != v_exp1_id THEN
        RAISE EXCEPTION 'submit_expense replay returned wrong id: expected %, got %', v_exp1_id, outcome.expense_id;
    END IF;
    IF NOT outcome.idempotent_replay THEN
        RAISE EXCEPTION 'submit_expense replay must indicate idempotent_replay = true';
    END IF;

    SELECT sequence INTO v_seq_replay
    FROM public.number_sequences
    WHERE type = 'expense' AND year = v_current_year;

    IF v_seq_replay != v_seq_after THEN
        RAISE EXCEPTION 'Identical replay must not consume a sequence value: after %, replay %', v_seq_after, v_seq_replay;
    END IF;

    -- ------------------------------------------------------------------------
    -- 5. Verify conflicting request-id reuse:
    --    - fails closed with expense_submit_request_conflict
    --    - does NOT consume a sequence value
    -- ------------------------------------------------------------------------
    SELECT * INTO outcome FROM public.submit_expense(
        NULL,
        'company',
        NULL,
        'travel',
        'Conflicting Description',
        999.00,
        CURRENT_DATE,
        'employee_paid',
        'personal_funds',
        NULL,
        NULL,
        v_user_employee,
        v_req_1,
        v_user_employee::text,
        'sales'
    );
    IF outcome.error_code != 'expense_submit_request_conflict' THEN
        RAISE EXCEPTION 'Conflicting request-id expected expense_submit_request_conflict, got: %', outcome.error_code;
    END IF;

    SELECT sequence INTO v_seq_conflict
    FROM public.number_sequences
    WHERE type = 'expense' AND year = v_current_year;

    IF v_seq_conflict != v_seq_after THEN
        RAISE EXCEPTION 'Conflicting request-id must not consume a sequence value: after %, conflict %', v_seq_after, v_seq_conflict;
    END IF;

    -- ------------------------------------------------------------------------
    -- 6. Verify explicit legacy Expense number still works unchanged
    -- ------------------------------------------------------------------------
    SELECT * INTO outcome FROM public.submit_expense(
        'EXP-LEGACY-SMOKE-001',
        'company',
        NULL,
        'supplies',
        'Legacy Explicit Expense',
        42.00,
        CURRENT_DATE,
        'employee_paid',
        'personal_funds',
        NULL,
        NULL,
        v_user_employee,
        v_req_legacy,
        v_user_employee::text,
        'sales'
    );
    IF outcome.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'submit_expense with explicit number failed: %', outcome.error_code;
    END IF;

    SELECT expense_number INTO v_exp_legacy_num
    FROM public.expenses
    WHERE id = outcome.expense_id;

    IF v_exp_legacy_num != 'EXP-LEGACY-SMOKE-001' THEN
        RAISE EXCEPTION 'Explicit expense number mismatch: expected EXP-LEGACY-SMOKE-001, got %', v_exp_legacy_num;
    END IF;

    RAISE NOTICE 'W5B-1B0 Expense Document Numbering Smoke: ALL ASSERTIONS PASSED SUCCESSFULLY';
END;
$$;

ROLLBACK;
