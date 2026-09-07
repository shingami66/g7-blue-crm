-- NOT EXECUTED in the F01-F06 remediation task. No database authority is implied.
-- Run only under a separately authorized verification task on an explicitly
-- identified disposable database with the reviewed migration already applied.
-- This fixture calls the real RPCs and queries persisted evidence; it does not
-- simulate their implementation. Everything is synthetic and transaction-local.
-- A runner must stop on the first SQL error and close/rollback the transaction.
BEGIN;

CREATE FUNCTION pg_temp.expect(p_ok boolean, p_case text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
    IF p_ok IS NOT TRUE THEN RAISE EXCEPTION 'regression failed: %', p_case; END IF;
END; $$;

DO $$
DECLARE
    customer uuid := gen_random_uuid();
    supplier uuid := gen_random_uuid();
    service uuid := gen_random_uuid();
    package uuid;
    retained uuid;
    added uuid;
    quote uuid;
    commitment uuid;
    cancelled_commitment uuid;
    receipt uuid;
    replay_request uuid := gen_random_uuid();
    correction_request uuid := gen_random_uuid();
    request uuid;
    decision text;
    outcome record;
    original_lines jsonb;
    original_close jsonb;
    before_rows jsonb;
BEGIN
    INSERT INTO public.customers(id, customer_number, company, contact, email, phone, city, status)
    VALUES(customer, 'TEST-' || customer, 'W4 regression only', 'Synthetic',
        'w4@example.invalid', '0000000000', 'Riyadh', 'active');
    INSERT INTO public.services(id, customer_id, service_number, service_title, status)
    VALUES(service, customer, 'TEST-' || service, 'W4 regression only', 'Inquiry');
    INSERT INTO public.suppliers(id, name, contact, phone, service, status)
    VALUES(supplier, 'W4 regression only', 'Synthetic', '0000000000', 'Test', 'active');

    SELECT * INTO outcome FROM public.upsert_procurement_package(NULL, service,
        'Test package', NULL, 'service', gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'package fixture');
    package := outcome.package_id;
    SELECT * INTO outcome FROM public.set_procurement_package_requirements(package, service,
        '[{"title":"Original requirement","requirement_key":"audio"}]',
        gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'initial requirement');
    SELECT r.id INTO STRICT retained FROM public.service_procurement_package_requirements r
    WHERE r.package_id = package AND r.retired_at IS NULL;

    SELECT * INTO outcome FROM public.create_supplier_quotation(supplier, service,
        'TEST QUOTE', current_date, NULL, '[]'::jsonb,
        jsonb_build_array(jsonb_build_object('description', 'Original quoted scope',
            'package_requirement_id', retained, 'quantity', 1, 'unit_price', 100,
            'line_total', 100, 'sort_order', 0)),
        gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'quotation fixture');
    quote := outcome.quotation_id;
    SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) INTO original_lines
    FROM public.supplier_quotation_lines l WHERE l.quotation_id = quote;

    SELECT * INTO outcome FROM public.upsert_procurement_package(package, service,
        'Renamed package', 'Metadata edit', 'rental', gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'metadata edit');
    SELECT * INTO outcome FROM public.set_procurement_package_requirements(package, service,
        jsonb_build_array(jsonb_build_object('id', retained, 'title', 'Edited retained scope',
            'requirement_key', 'audio'), jsonb_build_object('title', 'New scope')),
        gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL AND outcome.requirement_count = 2, 'edit requirements');
    PERFORM pg_temp.expect(EXISTS(SELECT 1 FROM public.service_procurement_package_requirements r
        WHERE r.id = retained AND r.title = 'Edited retained scope' AND r.retired_at IS NULL), 'F01 retained ID');
    SELECT r.id INTO STRICT added FROM public.service_procurement_package_requirements r
    WHERE r.package_id = package AND r.title = 'New scope' AND r.retired_at IS NULL;
    PERFORM pg_temp.expect(added <> retained, 'F01 genuinely new ID');
    PERFORM pg_temp.expect((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) = original_lines
        FROM public.supplier_quotation_lines l WHERE l.quotation_id = quote), 'F01 unchanged quotation evidence');

    -- ID-less older callers preserve an unambiguous catalog identity too.
    SELECT * INTO outcome FROM public.set_procurement_package_requirements(package, service,
        '[{"title":"Edited retained scope","requirement_key":"audio"},{"title":"New scope"}]',
        gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL AND EXISTS(
        SELECT 1 FROM public.service_procurement_package_requirements r
        WHERE r.id = retained AND r.retired_at IS NULL), 'F01 old caller compatibility');

    SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) INTO before_rows
    FROM public.service_procurement_package_requirements r WHERE r.package_id = package;
    SELECT * INTO outcome FROM public.set_procurement_package_requirements(package, service,
        jsonb_build_array(jsonb_build_object('id', retained, 'title', 'Valid'),
            jsonb_build_object('id', added, 'title', 'Invalid', 'sort_order', -1)),
        gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code = 'procurement_package_requirements_invalid', 'F01 invalid payload');
    PERFORM pg_temp.expect((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) = before_rows
        FROM public.service_procurement_package_requirements r WHERE r.package_id = package), 'F01 atomic invalid edit');

    request := gen_random_uuid();
    SELECT * INTO outcome FROM public.set_procurement_package_requirements(package, service,
        jsonb_build_array(jsonb_build_object('id', added, 'title', 'New scope')),
        request, 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'F01 removal');
    PERFORM pg_temp.expect(EXISTS(SELECT 1 FROM public.service_procurement_package_requirements r
        WHERE r.id = retained AND r.retired_at IS NOT NULL AND r.retired_by = 'submitter'), 'F01 retirement preserves row');
    PERFORM pg_temp.expect((SELECT jsonb_agg(to_jsonb(l) ORDER BY l.id) = original_lines
        FROM public.supplier_quotation_lines l WHERE l.quotation_id = quote), 'F01 retirement preserves quotation');
    SELECT * INTO outcome FROM public.set_procurement_package_requirements(package, service,
        jsonb_build_array(jsonb_build_object('id', added, 'title', 'New scope')),
        request, 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL AND outcome.idempotent_replay, 'F01 replay');
    BEGIN
        DELETE FROM public.service_procurement_package_requirements WHERE id = retained;
        RAISE EXCEPTION 'linked requirement deletion unexpectedly succeeded';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;

    SELECT * INTO outcome FROM public.create_approved_commitment('purchase_order', service,
        supplier, NULL, 'TEST PO', 100, transaction_timestamp(), gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'commitment fixture');
    commitment := outcome.commitment_id;
    SELECT * INTO outcome FROM public.cancel_service(service, 'Customer cancellation', 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code = 'service_supplier_commitment_unresolved', 'F03 open obligation blocks cancellation');
    PERFORM pg_temp.expect((SELECT s.status = 'Inquiry' FROM public.services s WHERE s.id = service), 'F03 Service unchanged');

    SELECT * INTO outcome FROM public.create_service_receipt(service, commitment, current_date,
        'Delivered scope', 1, NULL, 'unit', 100, NULL, NULL, NULL, NULL,
        gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'receipt fixture');
    receipt := outcome.receipt_id;
    FOREACH decision IN ARRAY ARRAY['ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED'] LOOP
        SELECT * INTO outcome FROM public.review_service_receipt(receipt, decision, 'Test conditions',
            gen_random_uuid(), 'submitter', 'manager');
        PERFORM pg_temp.expect(outcome.error_code = 'service_receipt_self_review_forbidden', 'F02 self-review ' || decision);
    END LOOP;
    PERFORM pg_temp.expect((SELECT r.acceptance_status = 'PENDING' FROM public.service_receipts r
        WHERE r.id = receipt), 'F02 rejected reviews preserve pending receipt');
    SELECT * INTO outcome FROM public.review_service_receipt(receipt, 'ACCEPTED', NULL,
        gen_random_uuid(), 'viewer', 'viewer');
    PERFORM pg_temp.expect(outcome.error_code = 'service_receipt_accept_permission_denied', 'F02 role gate');
    SELECT * INTO outcome FROM public.review_service_receipt(receipt, 'ACCEPTED', NULL,
        gen_random_uuid(), 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL AND outcome.acceptance_status = 'ACCEPTED', 'F02 different reviewer');

    SELECT * INTO outcome FROM public.transition_approved_commitment(commitment, 'close',
        'Original close reason', gen_random_uuid(), 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL AND outcome.commitment_status = 'closed', 'F04 close fixture');
    SELECT jsonb_build_object('closed_at', c.closed_at, 'closed_by', c.closed_by,
        'closed_reason', c.closed_reason) INTO original_close
    FROM public.approved_commitments c WHERE c.id = commitment;
    SELECT * INTO outcome FROM public.correct_service_receipt(receipt, 'ACCEPTED', 80, NULL,
        'Measurement correction', gen_random_uuid(), 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code = 'service_receipt_commitment_not_open', 'F04 closed correction guard');
    SELECT * INTO outcome FROM public.transition_approved_commitment(commitment, 'reopen',
        ' ', gen_random_uuid(), 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code = 'approved_commitment_transition_invalid', 'F04 reason required');
    SELECT * INTO outcome FROM public.transition_approved_commitment(commitment, 'reopen',
        'Correct measured receipt', replay_request, 'viewer', 'viewer');
    PERFORM pg_temp.expect(outcome.error_code = 'approved_commitment_permission_denied', 'F04 lifecycle role');
    SELECT * INTO outcome FROM public.transition_approved_commitment(commitment, 'reopen',
        'Correct measured receipt', replay_request, 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL AND outcome.commitment_status = 'open', 'F04 closed to open');
    PERFORM pg_temp.expect(EXISTS(SELECT 1 FROM public.audit_logs a WHERE a.entity_id = commitment
        AND a.details ->> 'event_type' = 'approved_commitment_reopened'
        AND a.details -> 'from' -> 'close_evidence' = original_close
        AND a.details -> 'payload' ->> 'reason' = 'Correct measured receipt'), 'F04 original close evidence and reason');
    SELECT * INTO outcome FROM public.transition_approved_commitment(commitment, 'reopen',
        'Correct measured receipt', replay_request, 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL AND outcome.idempotent_replay, 'F04 transition replay');
    SELECT * INTO outcome FROM public.transition_approved_commitment(commitment, 'reopen',
        'Changed reason', replay_request, 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code = 'approved_commitment_request_conflict', 'F04 replay conflict');

    SELECT * INTO outcome FROM public.correct_service_receipt(receipt, 'ACCEPTED', 80, NULL,
        'Measurement correction', gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code = 'service_receipt_self_review_forbidden', 'F02 correction cannot bypass separation');
    SELECT * INTO outcome FROM public.correct_service_receipt(receipt, 'ACCEPTED', 80, NULL,
        'Measurement correction', correction_request, 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL AND outcome.received_amount = 80, 'F04 correction after reopen');
    PERFORM pg_temp.expect(EXISTS(SELECT 1 FROM public.service_receipt_corrections c
        WHERE c.receipt_id = receipt AND c.prior_received_amount = 100
        AND c.corrected_received_amount = 80 AND c.correction_reason = 'Measurement correction'), 'F04 prior receipt evidence');
    PERFORM pg_temp.expect(EXISTS(SELECT 1 FROM public.approved_commitment_balances b
        WHERE b.id = commitment AND b.authorized_amount = 100 AND b.open_commitment_amount = 20), 'F04 reconciled open amount');
    SELECT * INTO outcome FROM public.correct_service_receipt(receipt, 'ACCEPTED', 80, NULL,
        'Measurement correction', correction_request, 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL AND outcome.idempotent_replay, 'F04 correction replay');
    SELECT * INTO outcome FROM public.transition_approved_commitment(commitment, 'close',
        'Cannot hide remaining value', gen_random_uuid(), 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code = 'approved_commitment_open_amount_remaining', 'F04 remaining obligation stays open');

    -- Close one fully accepted commitment and cancel another. Neither should
    -- block an otherwise valid Service cancellation; neither releases the other.
    SELECT * INTO outcome FROM public.correct_service_receipt(receipt, 'ACCEPTED', 100, NULL,
        'Final reconciled measurement', gen_random_uuid(), 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'final receipt reconciliation');
    SELECT * INTO outcome FROM public.transition_approved_commitment(commitment, 'close',
        'Final close', gen_random_uuid(), 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'final close');
    SELECT * INTO outcome FROM public.create_approved_commitment('purchase_order', service,
        supplier, NULL, 'TEST CANCELLED PO', 10, transaction_timestamp(), gen_random_uuid(), 'submitter', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'second commitment fixture');
    cancelled_commitment := outcome.commitment_id;
    SELECT * INTO outcome FROM public.transition_approved_commitment(cancelled_commitment, 'cancel',
        'Separate supplier release', gen_random_uuid(), 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL, 'separate commitment cancellation');
    SELECT * INTO outcome FROM public.transition_approved_commitment(cancelled_commitment, 'reopen',
        'Must fail', gen_random_uuid(), 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code = 'approved_commitment_reopen_ineligible', 'F04 never reopen cancelled');
    SELECT * INTO outcome FROM public.cancel_service(service, 'Customer cancellation', 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code IS NULL AND outcome.service_status = 'Cancelled', 'F03 closed and cancelled do not block');
    SELECT * INTO outcome FROM public.transition_approved_commitment(commitment, 'reopen',
        'Must not strand obligation', gen_random_uuid(), 'reviewer', 'manager');
    PERFORM pg_temp.expect(outcome.error_code = 'approved_commitment_service_unavailable', 'F03/F04 cancelled parent cannot reopen');
END;
$$;

ROLLBACK;
