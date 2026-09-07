-- W5A Transactional Smoke Test on DEV
-- Bounded runtime verification for W5A RPCs and repaired output-column ambiguity.
-- Runs strictly inside a transaction and ends with ROLLBACK to ensure zero business data residue.

BEGIN;

CREATE FUNCTION pg_temp.expect(p_ok boolean, p_case text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    IF p_ok IS NOT TRUE THEN
        RAISE EXCEPTION 'W5A smoke expectation failed: %', p_case;
    END IF;
END;
$$;

DO $$
DECLARE
    v_user_a uuid := gen_random_uuid();
    v_user_b uuid := gen_random_uuid();
    v_doc_id uuid := gen_random_uuid();
    v_expense_id uuid;
    v_expense_id_2 uuid;
    v_advance_id uuid;
    v_fund_id uuid := gen_random_uuid();
    v_tx_id uuid;

    v_req_submit uuid := gen_random_uuid();
    v_req_submit_2 uuid := gen_random_uuid();
    v_req_attach uuid := gen_random_uuid();
    v_req_cancel uuid := gen_random_uuid();
    v_req_advance uuid := gen_random_uuid();
    v_req_petty uuid := gen_random_uuid();

    outcome record;
BEGIN
    -- 1. Create synthetic test users
    INSERT INTO public.app_users (id, clerk_user_id, email, name, role)
    VALUES
        (v_user_a, 'clerk_smoke_' || v_user_a, 'smoke_a@example.com', 'Smoke User A', 'admin'),
        (v_user_b, 'clerk_smoke_' || v_user_b, 'smoke_b@example.com', 'Smoke User B', 'manager');

    -- 2. Submit test expense 1
    SELECT * INTO outcome FROM public.submit_expense(
        'EXP-SMOKE-001',
        'company',
        NULL::uuid,
        'office_supplies',
        'Smoke test expense description',
        150.00,
        CURRENT_DATE,
        'company_direct',
        'company_funds',
        NULL::uuid,
        NULL::uuid,
        NULL::uuid,
        v_req_submit,
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'submit_expense succeeded');
    PERFORM pg_temp.expect(outcome.expense_id IS NOT NULL, 'submit_expense returned expense_id');
    v_expense_id := outcome.expense_id;

    -- 3. Create synthetic business document
    INSERT INTO public.business_documents (
        id, bucket_id, object_path, original_filename, mime_type, file_size, document_type, purpose, uploaded_by
    ) VALUES (
        v_doc_id,
        'business-evidence',
        'business-documents/' || v_doc_id || '.pdf',
        'smoke_receipt.pdf',
        'application/pdf',
        2048,
        'receipt',
        'expense_receipt',
        v_user_a::text
    );

    -- 4. Test attach_expense_document (Previously failed with SQLSTATE 42702 ambiguity)
    SELECT * INTO outcome FROM public.attach_expense_document(
        v_expense_id,
        v_doc_id,
        v_req_attach,
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'attach_expense_document succeeded without ambiguity');
    PERFORM pg_temp.expect(outcome.expense_id = v_expense_id, 'attach_expense_document returned matching expense_id');
    PERFORM pg_temp.expect(outcome.document_id = v_doc_id, 'attach_expense_document returned matching document_id');
    PERFORM pg_temp.expect(outcome.idempotent_replay = false, 'attach_expense_document first run is not replay');

    -- 5. Test attach_expense_document identical replay
    SELECT * INTO outcome FROM public.attach_expense_document(
        v_expense_id,
        v_doc_id,
        v_req_attach,
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'attach_expense_document replay succeeded');
    PERFORM pg_temp.expect(outcome.idempotent_replay = true, 'attach_expense_document replay detected');

    -- 6. Test attach_expense_document payload conflict
    SELECT * INTO outcome FROM public.attach_expense_document(
        v_expense_id,
        gen_random_uuid(),
        v_req_attach,
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code = 'attach_document_request_conflict', 'attach_expense_document conflict rejected');

    -- 7. Submit test expense 2 for cancel test
    SELECT * INTO outcome FROM public.submit_expense(
        'EXP-SMOKE-002',
        'company',
        NULL::uuid,
        'software',
        'Smoke test expense 2 description',
        300.00,
        CURRENT_DATE,
        'company_direct',
        'company_funds',
        NULL::uuid,
        NULL::uuid,
        NULL::uuid,
        v_req_submit_2,
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'submit_expense 2 succeeded');
    v_expense_id_2 := outcome.expense_id;

    -- 8. Test cancel_expense (Repaired relation column qualification in settlement checks)
    SELECT * INTO outcome FROM public.cancel_expense(
        v_expense_id_2,
        'Cancelled during smoke verification',
        v_req_cancel,
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'cancel_expense succeeded without syntax or ambiguity error');
    PERFORM pg_temp.expect(outcome.expense_id = v_expense_id_2, 'cancel_expense returned matching expense_id');
    PERFORM pg_temp.expect(outcome.idempotent_replay = false, 'cancel_expense first run is not replay');

    -- 9. Test cancel_expense identical replay
    SELECT * INTO outcome FROM public.cancel_expense(
        v_expense_id_2,
        'Cancelled during smoke verification',
        v_req_cancel,
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'cancel_expense replay succeeded');
    PERFORM pg_temp.expect(outcome.idempotent_replay = true, 'cancel_expense replay detected');

    -- 10. Test cancel_expense conflicting replay
    SELECT * INTO outcome FROM public.cancel_expense(
        v_expense_id_2,
        'Different cancellation reason with more than 5 chars',
        v_req_cancel,
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code = 'expense_cancel_request_conflict', 'cancel_expense conflict rejected');

    -- 11. Test SoD submitter self-approval rejection on expense 1
    SELECT * INTO outcome FROM public.approve_expense(
        v_expense_id,
        gen_random_uuid(),
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code = 'expense_self_approval_forbidden', 'SoD submitter self-approval rejected');

    -- Unrelated manager B approves expense 1 successfully
    SELECT * INTO outcome FROM public.approve_expense(
        v_expense_id,
        gen_random_uuid(),
        v_user_b::text,
        'manager'
    );
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'unrelated approver accepted');

    -- 12. Test Cash Advance creation and requester self-approval rejection
    SELECT * INTO outcome FROM public.request_cash_advance(
        'ADV-SMOKE-001',
        'company',
        NULL::uuid,
        v_user_b,
        'Cash advance smoke test purpose',
        1000.00,
        v_req_advance,
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'request_cash_advance succeeded');
    v_advance_id := outcome.advance_id;

    -- Requester self-approval rejected
    SELECT * INTO outcome FROM public.approve_cash_advance(
        v_advance_id,
        gen_random_uuid(),
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code = 'advance_self_approval_forbidden', 'advance requester self-approval rejected');

    -- Recipient self-approval rejected
    SELECT * INTO outcome FROM public.approve_cash_advance(
        v_advance_id,
        gen_random_uuid(),
        v_user_b::text,
        'manager'
    );
    PERFORM pg_temp.expect(outcome.error_code = 'advance_recipient_self_approval_forbidden', 'advance recipient self-approval rejected');

    -- 13. Test Petty Cash Fund & Transaction
    INSERT INTO public.petty_cash_funds (
        id, fund_name, custodian_id, float_limit, current_balance, status
    ) VALUES (
        v_fund_id,
        'Smoke Float Fund',
        v_user_a,
        5000.00,
        500.00,
        'active'
    );

    SELECT * INTO outcome FROM public.record_petty_cash_transaction(
        v_fund_id,
        'replenishment',
        200.00,
        'REF-REPLENISH-001',
        NULL::uuid,
        'Replenishing float in smoke',
        v_req_petty,
        v_user_a::text,
        'admin'
    );
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'record_petty_cash_transaction succeeded');
    PERFORM pg_temp.expect(outcome.transaction_id IS NOT NULL, 'petty cash returned transaction_id');
END;
$$;

ROLLBACK;
