-- ============================================================================
-- Verification Smoke: w5b1_expense_finance_review_smoke.sql
-- Description: Transactional verification of W5B-1A Finance Review Gate and Access
-- Invariant: Always executes inside BEGIN ... ROLLBACK with ZERO persistence.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_user_employee uuid := gen_random_uuid();
    v_user_finance uuid := gen_random_uuid();
    v_user_manager uuid := gen_random_uuid();
    v_doc_id uuid := gen_random_uuid();
    v_expense_id uuid;

    v_req_submit uuid := gen_random_uuid();
    v_req_attach uuid := gen_random_uuid();
    v_req_review uuid := gen_random_uuid();
    v_req_review_conflict uuid := gen_random_uuid();
    v_req_approve uuid := gen_random_uuid();

    outcome record;
    v_summary record;
BEGIN
    -- 1. Create synthetic test users
    INSERT INTO public.app_users (id, clerk_user_id, email, name, role)
    VALUES
        (v_user_employee, 'clerk_smoke_' || v_user_employee, 'smoke_emp@example.com', 'Smoke Employee', 'sales'),
        (v_user_finance, 'clerk_smoke_' || v_user_finance, 'smoke_fin@example.com', 'Smoke Finance', 'accountant'),
        (v_user_manager, 'clerk_smoke_' || v_user_manager, 'smoke_mgr@example.com', 'Smoke Manager', 'manager');

    -- 2. Create synthetic document for receipt
    INSERT INTO public.business_documents (id, document_type, title, file_path, file_size_bytes, mime_type, uploaded_by)
    VALUES (
        v_doc_id, 'other', 'Test Receipt', '/receipts/test.pdf', 1024, 'application/pdf', v_user_employee
    );

    -- 3. User Employee submits an employee-paid expense
    SELECT * INTO outcome FROM public.submit_expense(
        'EXP-SMOKE-W5B-001',
        'company',
        NULL,
        'travel',
        'Client Meeting Travel',
        150.00,
        CURRENT_DATE,
        'employee_paid',
        'personal_funds',
        NULL,
        NULL,
        v_user_employee,
        v_req_submit,
        v_user_employee::text,
        'sales'
    );
    IF outcome.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'submit_expense failed: %', outcome.error_code;
    END IF;
    v_expense_id := outcome.expense_id;

    -- 4. Gate Test: Manager attempts approval BEFORE Finance review -> MUST FAIL
    SELECT * INTO outcome FROM public.approve_expense(
        v_expense_id,
        v_req_approve,
        v_user_manager::text,
        'manager'
    );
    IF outcome.error_code != 'expense_not_finance_reviewed' THEN
        RAISE EXCEPTION 'approve_expense before finance review expected expense_not_finance_reviewed, got: %', outcome.error_code;
    END IF;

    -- 5. Gate Test: Finance review attempted with NO evidence attached -> MUST FAIL
    SELECT * INTO outcome FROM public.review_expense_finance(
        v_expense_id,
        v_req_review,
        v_user_finance::text,
        'accountant'
    );
    IF outcome.error_code != 'expense_evidence_required_for_finance_review' THEN
        RAISE EXCEPTION 'review_expense_finance without evidence expected expense_evidence_required_for_finance_review, got: %', outcome.error_code;
    END IF;

    -- 6. Attach receipt document
    SELECT * INTO outcome FROM public.attach_expense_document(
        v_expense_id,
        v_doc_id,
        v_req_attach,
        v_user_employee::text,
        'sales'
    );
    IF outcome.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'attach_expense_document failed: %', outcome.error_code;
    END IF;

    -- 7. Finance review now succeeds with evidence present
    SELECT * INTO outcome FROM public.review_expense_finance(
        v_expense_id,
        v_req_review,
        v_user_finance::text,
        'accountant'
    );
    IF outcome.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'review_expense_finance failed: %', outcome.error_code;
    END IF;
    IF outcome.idempotent_replay THEN
        RAISE EXCEPTION 'First review_expense_finance call must not be idempotent_replay';
    END IF;

    -- 8. Idempotency test: identical replay returns idempotent_replay = true
    SELECT * INTO outcome FROM public.review_expense_finance(
        v_expense_id,
        v_req_review,
        v_user_finance::text,
        'accountant'
    );
    IF outcome.error_code IS NOT NULL OR NOT outcome.idempotent_replay THEN
        RAISE EXCEPTION 'review_expense_finance replay failed, error: %, replay: %', outcome.error_code, outcome.idempotent_replay;
    END IF;

    -- 9. Conflict test: reusing request_id for different expense must fail closed
    SELECT * INTO outcome FROM public.review_expense_finance(
        gen_random_uuid(),
        v_req_review,
        v_user_finance::text,
        'accountant'
    );
    IF outcome.error_code != 'expense_finance_review_request_conflict' THEN
        RAISE EXCEPTION 'review_expense_finance conflict test expected expense_finance_review_request_conflict, got: %', outcome.error_code;
    END IF;

    -- 10. Redundant review test: second review with new request_id on already-reviewed expense must fail
    SELECT * INTO outcome FROM public.review_expense_finance(
        v_expense_id,
        v_req_review_conflict,
        v_user_finance::text,
        'accountant'
    );
    IF outcome.error_code != 'expense_already_finance_reviewed' THEN
        RAISE EXCEPTION 'review_expense_finance redundant test expected expense_already_finance_reviewed, got: %', outcome.error_code;
    END IF;

    -- 11. Segregation of Duties: Submitter / Claimant self-approval MUST FAIL
    SELECT * INTO outcome FROM public.approve_expense(
        v_expense_id,
        v_req_approve,
        v_user_employee::text,
        'sales'
    );
    IF outcome.error_code != 'expense_self_approval_forbidden' AND outcome.error_code != 'expense_claimant_self_approval_forbidden' THEN
        RAISE EXCEPTION 'approve_expense self-approval expected SoD rejection, got: %', outcome.error_code;
    END IF;

    -- 12. Manager approval now succeeds following Finance review
    SELECT * INTO outcome FROM public.approve_expense(
        v_expense_id,
        v_req_approve,
        v_user_manager::text,
        'manager'
    );
    IF outcome.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'approve_expense after finance review failed: %', outcome.error_code;
    END IF;

    -- 13. Verify public.expense_accountability_summaries view outputs finance review fields
    SELECT * INTO v_summary
    FROM public.expense_accountability_summaries
    WHERE id = v_expense_id;

    IF v_summary.finance_reviewed_by != v_user_finance THEN
        RAISE EXCEPTION 'summary finance_reviewed_by mismatch: expected %, got %', v_user_finance, v_summary.finance_reviewed_by;
    END IF;
    IF v_summary.finance_reviewed_at IS NULL THEN
        RAISE EXCEPTION 'summary finance_reviewed_at must be populated';
    END IF;
    IF v_summary.status != 'approved' THEN
        RAISE EXCEPTION 'summary status expected approved, got %', v_summary.status;
    END IF;

    -- 14. Verify audit trail contains expense_finance_reviewed action
    IF NOT EXISTS (
        SELECT 1 FROM public.audit_logs
        WHERE entity_id = v_expense_id
          AND action = 'expense_finance_reviewed'
          AND details ->> 'request_id' = v_req_review::text
    ) THEN
        RAISE EXCEPTION 'audit_logs missing expense_finance_reviewed entry';
    END IF;

    RAISE NOTICE 'W5B-1A Finance Review Smoke: ALL ASSERTIONS PASSED SUCCESSFULLY';
END;
$$;

ROLLBACK;
