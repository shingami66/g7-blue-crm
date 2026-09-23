-- W8B DEV behavioral regression. Run only after the reviewed W8B migration is
-- applied to the authorized DEV project. Every synthetic row and audit event is
-- created inside this transaction and removed by the final ROLLBACK.
BEGIN;

DO $w8b$
DECLARE
    v_admin uuid;
    v_viewer uuid;
    v_customer uuid;
    v_supplier uuid;
    v_existing_service uuid;
    v_close_service uuid := gen_random_uuid();
    v_release_service uuid := gen_random_uuid();
    v_close_number text;
    v_release_number text;
    v_suffix text;
    v_business_date date := (timezone('Asia/Riyadh', transaction_timestamp()))::date;
    v_close_request uuid := gen_random_uuid();
    v_reopen_request uuid := gen_random_uuid();
    v_second_close_request uuid := gen_random_uuid();
    v_late_amendment_request uuid := gen_random_uuid();
    v_late_receipt_request uuid := gen_random_uuid();
    v_late_receipt_review_request uuid := gen_random_uuid();
    v_close_advance_release_request uuid := gen_random_uuid();
    v_cash_advance_request uuid := gen_random_uuid();
    v_cash_advance_cancel_request uuid := gen_random_uuid();
    v_evidence_exception_request uuid := gen_random_uuid();
    v_evidence_exception_dispose_request uuid := gen_random_uuid();
    v_payment_request uuid := gen_random_uuid();
    v_payment_reversal_request uuid := gen_random_uuid();
    v_commitment_id uuid := gen_random_uuid();
    v_transfer_commitment_id uuid := gen_random_uuid();
    v_receipt_id uuid;
    v_bill_id uuid := gen_random_uuid();
    v_payment_document_id uuid := gen_random_uuid();
    v_expense_id uuid := gen_random_uuid();
    v_receipt_correction_id uuid := gen_random_uuid();
    v_close_advance_id uuid;
    v_close_advance_release_id uuid;
    v_cash_advance_id uuid;
    v_evidence_exception_id uuid;
    v_late_amendment_id uuid;
    v_late_receipt_id uuid;
    v_payment_id uuid;
    v_release_commitment_id uuid := gen_random_uuid();
    v_used_commitment_id uuid := gen_random_uuid();
    v_advance_id uuid := gen_random_uuid();
    v_used_advance_id uuid := gen_random_uuid();
    v_release_request uuid := gen_random_uuid();
    v_used_release_request uuid := gen_random_uuid();
    v_close_id uuid;
    v_result record;
    v_pending_bill_id uuid := gen_random_uuid();
    v_readiness jsonb;
    v_status jsonb;
    v_w8a_asof_0921 jsonb;
    v_w8a_asof_0922 jsonb;
    v_cost_after_settlement jsonb;
    v_amount numeric;
    v_initial_paid_cost numeric;
    v_initial_outstanding_cost numeric;
    v_initial_accepted_commitment numeric;
    v_guard_sql text;
    v_expected_blocker text;
    v_ready_fixture_count integer;
BEGIN
    SELECT id INTO STRICT v_admin
    FROM public.app_users
    WHERE role = 'admin' AND is_active = true
    ORDER BY id
    LIMIT 1;

    SELECT id INTO STRICT v_viewer
    FROM public.app_users
    WHERE role = 'viewer' AND is_active = true
    ORDER BY id
    LIMIT 1;

    SELECT id INTO STRICT v_customer
    FROM public.customers
    WHERE COALESCE(is_deleted, false) = false AND deleted_at IS NULL
    ORDER BY id
    LIMIT 1;

    SELECT id INTO STRICT v_supplier
    FROM public.suppliers
    WHERE COALESCE(is_deleted, false) = false AND deleted_at IS NULL
    ORDER BY id
    LIMIT 1;

    IF NOT has_function_privilege('service_role', 'public.get_event_cost_close_readiness(uuid,date)', 'EXECUTE')
       OR NOT has_function_privilege('service_role', 'public.close_event_cost(uuid,text,uuid,text,text)', 'EXECUTE')
       OR NOT has_function_privilege('service_role', 'public.reopen_event_cost(uuid,text,uuid,text,text)', 'EXECUTE')
       OR NOT has_function_privilege('service_role', 'public.release_supplier_advance_authorization(uuid,text,uuid,text,text)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.get_event_cost_close_readiness(uuid,date)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.get_event_cost_close_readiness(uuid,date)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.close_event_cost(uuid,text,uuid,text,text)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.close_event_cost(uuid,text,uuid,text,text)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.reopen_event_cost(uuid,text,uuid,text,text)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.reopen_event_cost(uuid,text,uuid,text,text)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.release_supplier_advance_authorization(uuid,text,uuid,text,text)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.release_supplier_advance_authorization(uuid,text,uuid,text,text)', 'EXECUTE')
    THEN
        RAISE EXCEPTION 'W8B regression: function execution grants are not least-privilege';
    END IF;

    IF has_table_privilege('anon', 'public.event_cost_close_versions', 'SELECT')
       OR has_table_privilege('authenticated', 'public.event_cost_close_versions', 'SELECT')
       OR has_table_privilege('anon', 'public.supplier_advance_authorization_releases', 'SELECT')
       OR has_table_privilege('authenticated', 'public.supplier_advance_authorization_releases', 'SELECT')
       OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.event_cost_close_versions'::regclass)
       OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.event_cost_close_reopenings'::regclass)
       OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.supplier_advance_authorization_releases'::regclass)
    THEN
        RAISE EXCEPTION 'W8B regression: table grants or RLS are not restricted';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        WHERE p.oid IN (
            'public.get_event_cost_close_readiness(uuid,date)'::regprocedure,
            'public.close_event_cost(uuid,text,uuid,text,text)'::regprocedure,
            'public.reopen_event_cost(uuid,text,uuid,text,text)'::regprocedure,
            'public.get_event_cost_close_status(uuid,date)'::regprocedure,
            'public.release_supplier_advance_authorization(uuid,text,uuid,text,text)'::regprocedure
        )
          AND (NOT p.prosecdef OR NOT ('search_path=pg_catalog, public' = ANY(COALESCE(p.proconfig, ARRAY[]::text[]))))
    ) THEN
        RAISE EXCEPTION 'W8B regression: SECURITY DEFINER/search_path contract failed';
    END IF;

    -- Preserve the known negative readiness fixture as a read-only assertion.
    SELECT count(*) INTO v_ready_fixture_count
    FROM public.services s
    WHERE s.service_number = 'SVC-2026-0001' AND s.deleted_at IS NULL;
    IF v_ready_fixture_count <> 1 THEN
        RAISE EXCEPTION 'W8B regression: expected DEV negative-readiness fixture is missing';
    END IF;
    SELECT s.id INTO STRICT v_existing_service
    FROM public.services s
    WHERE s.service_number = 'SVC-2026-0001' AND s.deleted_at IS NULL;

    -- Lock W8A historical source dates independently of W8B close behavior.
    v_w8a_asof_0921 := public.get_event_costing(v_existing_service, DATE '2026-09-21');
    v_w8a_asof_0922 := public.get_event_costing(v_existing_service, DATE '2026-09-22');
    IF (v_w8a_asof_0921 ->> 'actual_cost')::numeric IS DISTINCT FROM 10000.00::numeric
       OR (v_w8a_asof_0921 ->> 'paid_cost')::numeric IS DISTINCT FROM 0.00::numeric
       OR (v_w8a_asof_0921 ->> 'outstanding_cost')::numeric IS DISTINCT FROM 10000.00::numeric
       OR v_w8a_asof_0921 ->> 'etc' IS NOT NULL
       OR v_w8a_asof_0921 ->> 'eac' IS NOT NULL
       OR (v_w8a_asof_0921 -> 'source_counts' ->> 'event_expenses_approved')::integer IS DISTINCT FROM 0
       OR (v_w8a_asof_0922 ->> 'actual_cost')::numeric IS DISTINCT FROM 10000.01::numeric
       OR (v_w8a_asof_0922 ->> 'paid_cost')::numeric IS DISTINCT FROM 0.01::numeric
       OR (v_w8a_asof_0922 ->> 'outstanding_cost')::numeric IS DISTINCT FROM 10000.00::numeric
       OR (v_w8a_asof_0922 ->> 'etc')::numeric IS DISTINCT FROM 3000.00::numeric
       OR (v_w8a_asof_0922 ->> 'eac')::numeric IS DISTINCT FROM 13000.01::numeric
       OR (v_w8a_asof_0922 -> 'source_counts' ->> 'event_expenses_approved')::integer IS DISTINCT FROM 1
    THEN
        RAISE EXCEPTION 'W8B regression: W8A historical source-date projection changed; 2026-09-21=%; 2026-09-22=%',
            v_w8a_asof_0921, v_w8a_asof_0922;
    END IF;

    IF timezone('Asia/Riyadh', '2026-09-22 20:59:59+00'::timestamptz)::date IS DISTINCT FROM DATE '2026-09-22'
       OR timezone('Asia/Riyadh', '2026-09-22 21:00:00+00'::timestamptz)::date IS DISTINCT FROM DATE '2026-09-23'
    THEN
        RAISE EXCEPTION 'W8B regression: Riyadh business-date midnight boundary is not deterministic';
    END IF;

    v_readiness := public.get_event_cost_close_readiness(v_existing_service, v_business_date);
    IF COALESCE((v_readiness ->> 'ready')::boolean, true) THEN
        RAISE EXCEPTION 'W8B regression: known incomplete service unexpectedly became close-ready';
    END IF;
    FOREACH v_expected_blocker IN ARRAY ARRAY[
        'event_costing_incomplete', 'pending_event_expenses', 'open_commitment_amount',
        'etc_not_zero', 'unresolved_supplier_advance_reserve'
    ] LOOP
        IF NOT (v_readiness -> 'blockers' @> jsonb_build_array(jsonb_build_object('code', v_expected_blocker))) THEN
            RAISE EXCEPTION 'W8B regression: expected readiness blocker % was absent; evidence=%', v_expected_blocker, v_readiness;
        END IF;
    END LOOP;

    -- Create a disposable, complete service fixture with approved supplier cost
    -- still outstanding, so settlement can be tested independently after close.
    LOOP
        v_suffix := lpad((1000 + floor(random() * 9000)::integer)::text, 4, '0');
        v_close_number := 'SVC-2099-' || v_suffix;
        v_release_number := 'SVC-2098-' || v_suffix;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.services WHERE service_number IN (v_close_number, v_release_number))
            AND NOT EXISTS (SELECT 1 FROM public.supplier_bills WHERE bill_number IN ('BILL-2099-' || v_suffix, 'BILL-2098-' || v_suffix))
            AND NOT EXISTS (SELECT 1 FROM public.supplier_payments WHERE payment_number = 'SPAY-2099-' || v_suffix)
            AND NOT EXISTS (SELECT 1 FROM public.supplier_advances WHERE advance_number IN ('SADV-2099-' || v_suffix, 'SADV-2098-' || v_suffix, 'SADV-2097-' || v_suffix))
            AND NOT EXISTS (SELECT 1 FROM public.employee_cash_advances WHERE advance_number = 'CA-2099-' || v_suffix);
    END LOOP;

    INSERT INTO public.services(id, service_number, customer_id, service_title, status, created_by, updated_by)
    VALUES (v_close_service, v_close_number, v_customer, 'W8B rollback regression close fixture', 'Completed', v_admin::text, v_admin::text);
    INSERT INTO public.services(id, service_number, customer_id, service_title, status, created_by, updated_by)
    VALUES (v_release_service, v_release_number, v_customer, 'W8B rollback regression release fixture', 'Approved', v_admin::text, v_admin::text);

    v_readiness := public.get_event_cost_close_readiness(v_close_service, v_business_date);
    IF NOT (v_readiness -> 'blockers' @> '[{"code":"operational_lifecycle_unavailable"}]'::jsonb)
       OR NOT (v_readiness -> 'blockers' @> '[{"code":"event_costing_incomplete"}]'::jsonb)
    THEN
        RAISE EXCEPTION 'W8B regression: missing lifecycle did not produce explicit readiness blockers; evidence=%', v_readiness;
    END IF;

    INSERT INTO public.service_lifecycle_states(
        service_id, legacy_status, commercial_state, payment_state, readiness_state,
        execution_state, completion_state, close_state
    ) VALUES (
        v_close_service, 'Completed', 'approved', 'unassessed', 'not_applicable',
        'ended', 'confirmed', 'closed'
    );
    INSERT INTO public.service_lifecycle_states(
        service_id, legacy_status, commercial_state, payment_state, readiness_state,
        execution_state, completion_state, close_state
    ) VALUES (
        v_release_service, 'In Progress', 'approved', 'unassessed', 'not_applicable',
        'in_progress', 'pending', 'open'
    );
    v_readiness := public.get_event_cost_close_readiness(v_release_service, v_business_date);
    FOREACH v_expected_blocker IN ARRAY ARRAY[
        'operational_execution_not_ended', 'operational_completion_not_confirmed', 'operational_service_not_closed'
    ] LOOP
        IF NOT (v_readiness -> 'blockers' @> jsonb_build_array(jsonb_build_object('code', v_expected_blocker))) THEN
            RAISE EXCEPTION 'W8B regression: expected lifecycle blocker % was absent; evidence=%', v_expected_blocker, v_readiness;
        END IF;
    END LOOP;

    INSERT INTO public.quotations(
        quotation_number, customer_id, event, date, valid_until, subtotal, discount,
        vat_amount, grand_total, status, service_id, snapshot_seller, snapshot_buyer
    ) VALUES (
        'W8B-RB-' || replace(v_close_service::text, '-', ''), v_customer,
        'W8B rollback regression', v_business_date, v_business_date + 30,
        100, 0, 0, 100, 'approved', v_close_service,
        jsonb_build_object('test_fixture', true), jsonb_build_object('test_fixture', true)
    );

    INSERT INTO public.event_cost_budgets(
        service_id, budget_version, base_budget_amount, contingency_amount,
        reason, approved_by, approved_at, request_id
    ) VALUES (
        v_close_service, 1, 0, 0, 'W8B rollback regression budget',
        v_admin::text, transaction_timestamp(), gen_random_uuid()
    );

    INSERT INTO public.event_cost_etc_forecasts(
        service_id, forecast_version, etc_amount, forecast_date, reason,
        recorded_by, recorded_at, request_id
    ) VALUES (
        v_close_service, 1, 0, v_business_date, 'W8B rollback regression ETC',
        v_admin::text, transaction_timestamp(), gen_random_uuid()
    );

    INSERT INTO public.approved_commitments(
        id, service_id, supplier_id, commitment_source, source_reference,
        original_approved_amount, currency, status, approved_at, approved_by,
        created_by, updated_by
    ) VALUES (
        v_commitment_id, v_close_service, v_supplier, 'other_authorized',
        'W8B rollback regression source', 100, 'SAR', 'open', transaction_timestamp(),
        v_admin::text, v_admin::text, v_admin::text
    );

    INSERT INTO public.approved_commitments(
        id, service_id, supplier_id, commitment_source, source_reference,
        original_approved_amount, currency, status, approved_at, approved_by,
        created_by, updated_by
    ) VALUES (
        v_transfer_commitment_id, v_release_service, v_supplier, 'other_authorized',
        'W8B rollback transfer source', 10, 'SAR', 'open', transaction_timestamp(),
        v_admin::text, v_admin::text, v_admin::text
    );

    INSERT INTO public.supplier_advances(
        advance_number, commitment_id, service_id, supplier_id, currency,
        authorized_amount, reason, evidence_sha256, authorized_by, authorization_request_id
    ) VALUES (
        'SADV-2097-' || v_suffix, v_commitment_id, v_close_service,
        v_supplier, 'SAR', 1, 'W8B rollback close-service authorization', repeat('c', 64),
        v_admin, gen_random_uuid()
    ) RETURNING id INTO v_close_advance_id;

    v_readiness := public.get_event_cost_close_readiness(v_close_service, v_business_date);
    IF NOT (v_readiness -> 'blockers' @> '[{"code":"open_commitment_amount"}]'::jsonb)
       OR NOT (v_readiness -> 'blockers' @> '[{"code":"unresolved_supplier_advance_reserve"}]'::jsonb)
    THEN
        RAISE EXCEPTION 'W8B regression: open commitment/advance reserve blockers were not explicit; evidence=%', v_readiness;
    END IF;

    SELECT * INTO v_result
    FROM public.create_service_receipt(
        v_close_service, v_commitment_id, v_business_date, 'W8B rollback regression accepted scope',
        NULL, NULL, NULL, 100, NULL, NULL, NULL, NULL,
        gen_random_uuid(), v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL OR v_result.receipt_id IS NULL THEN
        RAISE EXCEPTION 'W8B regression: initial normal receipt creation failed; result=%', row_to_json(v_result);
    END IF;
    v_receipt_id := v_result.receipt_id;
    v_readiness := public.get_event_cost_close_readiness(v_close_service, v_business_date);
    IF COALESCE((v_readiness ->> 'ready')::boolean, true)
       OR NOT (v_readiness -> 'blockers' @> '[{"code":"pending_service_receipts"}]'::jsonb)
       OR NOT (v_readiness -> 'blockers' @> '[{"code":"pending_commitment_amount"}]'::jsonb)
       OR NOT (v_readiness -> 'blockers' @> '[{"code":"unresolved_supplier_advance_reserve"}]'::jsonb)
    THEN
        RAISE EXCEPTION 'W8B regression: pending receipt/open commitment/advance reserve blockers were not explicit; evidence=%', v_readiness;
    END IF;
    SELECT * INTO v_result
    FROM public.review_service_receipt(v_receipt_id, 'ACCEPTED', NULL, gen_random_uuid(), v_admin::text, 'admin');
    IF v_result.error_code IS NOT NULL OR v_result.acceptance_status IS DISTINCT FROM 'ACCEPTED' THEN
        RAISE EXCEPTION 'W8B regression: initial receipt acceptance failed; result=%', row_to_json(v_result);
    END IF;

    INSERT INTO public.service_receipt_corrections(
        id, receipt_id, correction_number, prior_acceptance_status, prior_received_amount,
        prior_decision_at, prior_decision_by, corrected_acceptance_status, corrected_received_amount,
        correction_reason, corrected_at, corrected_by, request_id, created_by
    ) VALUES (
        v_receipt_correction_id, v_receipt_id, 1, 'ACCEPTED', 100,
        transaction_timestamp(), v_admin::text, 'ACCEPTED', 100,
        'W8B rollback no-value receipt correction evidence', transaction_timestamp(),
        v_admin::text, gen_random_uuid(), v_admin::text
    );

    SELECT * INTO v_result
    FROM public.release_supplier_advance_authorization(
        v_close_advance_id, 'W8B rollback close-service unused advance release',
        v_close_advance_release_request, v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL OR v_result.release_id IS NULL THEN
        RAISE EXCEPTION 'W8B regression: close-service unused advance release failed; result=%', row_to_json(v_result);
    END IF;
    v_close_advance_release_id := v_result.release_id;

    INSERT INTO public.supplier_bills(
        id, bill_number, service_id, supplier_id, commitment_id, service_receipt_id,
        invoice_number, invoice_date, subtotal, vat_amount, total_amount, currency,
        status, approved_by, approved_at, supplier_name_snapshot,
        supplier_legal_name_snapshot, recorded_by, updated_by, record_request_id
    ) VALUES (
        v_bill_id, 'BILL-2099-' || v_suffix, v_close_service, v_supplier,
        v_commitment_id, v_receipt_id, 'W8B-ROLLBACK-' || v_suffix, v_business_date,
        100, 0, 100, 'SAR', 'approved', v_admin, transaction_timestamp(),
        'W8B regression supplier', 'W8B regression supplier legal name',
        v_admin, v_admin, gen_random_uuid()
    );

    -- The supplier-payment RPC requires evidence metadata linked to this Service.
    -- This synthetic metadata exists only inside the rollback-only verification.
    INSERT INTO public.business_documents(
        id, bucket_id, object_path, original_filename, mime_type, file_size,
        document_type, purpose, uploaded_by
    ) VALUES (
        v_payment_document_id, 'business-evidence',
        'business-documents/' || v_payment_document_id::text || '.pdf',
        'w8b-rollback-supplier-payment.pdf', 'application/pdf', 1,
        'supplier_payment_evidence', 'W8B rollback settlement verification', v_admin::text
    );
    INSERT INTO public.business_document_links(document_id, service_id, link_purpose, linked_by)
    VALUES (v_payment_document_id, v_close_service, 'supplier_payment', v_admin::text);

    INSERT INTO public.expenses(
        id, expense_number, context_type, service_id, expense_category, description,
        amount, currency, expense_date, origin_type, payment_method, submitted_by,
        status, approved_by, approved_at
    ) VALUES (
        v_expense_id, 'W8B-EXP-' || v_suffix, 'event', v_close_service, 'other',
        'W8B rollback-only approved event expense', 0.01, 'SAR', v_business_date,
        -- Keep maker/checker identities distinct even in the synthetic fixture.
        'company_direct', 'company_funds', v_viewer, 'approved', v_admin, transaction_timestamp()
    );

    SELECT * INTO v_result
    FROM public.record_expense_evidence_exception(
        v_expense_id, 'W8B rollback evidence exception without document', v_viewer,
        v_business_date + 30, v_evidence_exception_request, v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL OR v_result.exception_id IS NULL THEN
        RAISE EXCEPTION 'W8B regression: pending evidence exception fixture failed; result=%', row_to_json(v_result);
    END IF;
    v_evidence_exception_id := v_result.exception_id;
    v_readiness := public.get_event_cost_close_readiness(v_close_service, v_business_date);
    IF COALESCE((v_readiness ->> 'ready')::boolean, true)
       OR NOT (v_readiness -> 'blockers' @> '[{"code":"unresolved_cost_evidence_exception"}]'::jsonb)
    THEN
        RAISE EXCEPTION 'W8B regression: pending evidence exception did not block close; evidence=%', v_readiness;
    END IF;
    SELECT * INTO v_result
    FROM public.dispose_expense_evidence_exception(
        v_evidence_exception_id, 'accepted', 'W8B rollback evidence exception resolved',
        v_evidence_exception_dispose_request, v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'W8B regression: evidence exception disposition failed; result=%', row_to_json(v_result);
    END IF;

    SELECT * INTO v_result
    FROM public.request_cash_advance(
        'CA-2099-' || v_suffix, 'event', v_close_service, v_viewer,
        'W8B rollback readiness cash advance', 1, v_cash_advance_request, v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL OR v_result.advance_id IS NULL THEN
        RAISE EXCEPTION 'W8B regression: cash advance readiness fixture failed; result=%', row_to_json(v_result);
    END IF;
    v_cash_advance_id := v_result.advance_id;
    v_readiness := public.get_event_cost_close_readiness(v_close_service, v_business_date);
    IF COALESCE((v_readiness ->> 'ready')::boolean, true)
       OR NOT (v_readiness -> 'blockers' @> '[{"code":"unresolved_event_cash_advances"}]'::jsonb)
    THEN
        RAISE EXCEPTION 'W8B regression: unresolved event cash advance did not block close; evidence=%', v_readiness;
    END IF;
    SELECT * INTO v_result
    FROM public.cancel_cash_advance(
        v_cash_advance_id, 'W8B rollback-only cash advance cancellation',
        v_cash_advance_cancel_request, v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'W8B regression: cash advance cancellation failed; result=%', row_to_json(v_result);
    END IF;

    BEGIN
        INSERT INTO public.supplier_bills(
            id, bill_number, service_id, supplier_id, commitment_id, service_receipt_id,
            invoice_number, invoice_date, subtotal, vat_amount, total_amount, currency,
            status, supplier_name_snapshot, supplier_legal_name_snapshot,
            recorded_by, updated_by, record_request_id
        ) VALUES (
            v_pending_bill_id, 'BILL-2098-' || v_suffix, v_close_service, v_supplier,
            v_commitment_id, v_receipt_id, 'W8B-PENDING-' || v_suffix, v_business_date,
            1, 0, 1, 'SAR', 'pending', 'W8B regression supplier',
            'W8B regression supplier legal name', v_admin, v_admin, gen_random_uuid()
        );
        v_readiness := public.get_event_cost_close_readiness(v_close_service, v_business_date);
        IF NOT (v_readiness -> 'blockers' @> '[{"code":"pending_supplier_bills"}]'::jsonb) THEN
            RAISE EXCEPTION 'W8B regression: pending Supplier Bill did not block close; evidence=%', v_readiness;
        END IF;
        RAISE EXCEPTION 'W8B_TEST_ROLLBACK_PENDING_SUPPLIER_BILL';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM = 'W8B_TEST_ROLLBACK_PENDING_SUPPLIER_BILL' THEN
            NULL;
        ELSE
            RAISE;
        END IF;
    END;

    v_readiness := public.get_event_cost_close_readiness(v_close_service, v_business_date);
    IF COALESCE((v_readiness ->> 'ready')::boolean, false) IS NOT TRUE
       OR v_readiness -> 'costing' -> 'completeness' ->> 'status' IS DISTINCT FROM 'COMPLETE'
       OR (v_readiness -> 'costing' ->> 'outstanding_cost')::numeric <= 0
    THEN
        RAISE EXCEPTION 'W8B regression: synthetic close fixture not ready with approved outstanding AP; evidence=%', v_readiness;
    END IF;
    v_initial_paid_cost := (v_readiness -> 'costing' ->> 'paid_cost')::numeric;
    v_initial_outstanding_cost := (v_readiness -> 'costing' ->> 'outstanding_cost')::numeric;

    -- Direct calls as an active Viewer must be denied by the RPC boundary, not
    -- merely hidden by the application UI.
    SELECT * INTO v_result
    FROM public.close_event_cost(v_close_service, 'W8B unauthorized viewer close', gen_random_uuid(), v_viewer::text, 'viewer');
    IF v_result.error_code IS NULL OR EXISTS (
        SELECT 1 FROM public.event_cost_close_versions WHERE service_id = v_close_service
    ) THEN
        RAISE EXCEPTION 'W8B regression: unauthorized Viewer close was not rejected; result=%', row_to_json(v_result);
    END IF;

    SELECT * INTO v_result
    FROM public.close_event_cost(v_close_service, 'W8B rollback close', v_close_request, v_admin::text, 'admin');
    IF v_result.error_code IS NOT NULL OR v_result.close_id IS NULL OR v_result.close_version <> 1 OR v_result.idempotent_replay THEN
        RAISE EXCEPTION 'W8B regression: first close failed; result=%', row_to_json(v_result);
    END IF;
    v_close_id := v_result.close_id;
    SELECT accepted_commitment INTO STRICT v_initial_accepted_commitment
    FROM public.event_cost_close_versions WHERE id = v_close_id;
    v_status := public.get_event_cost_close_status(v_close_service, v_business_date);
    IF (v_status -> 'active_close' ->> 'effective_date')::date IS DISTINCT FROM v_business_date THEN
        RAISE EXCEPTION 'W8B regression: close effective date did not use the Riyadh business date; status=%', v_status;
    END IF;

    SELECT * INTO v_result
    FROM public.close_event_cost(v_close_service, 'W8B rollback close', v_close_request, v_admin::text, 'admin');
    IF v_result.error_code IS NOT NULL OR v_result.close_version <> 1 OR NOT v_result.idempotent_replay THEN
        RAISE EXCEPTION 'W8B regression: close replay was not idempotent; result=%', row_to_json(v_result);
    END IF;

    SELECT * INTO v_result
    FROM public.close_event_cost(v_close_service, 'conflicting close reason', v_close_request, v_admin::text, 'admin');
    IF v_result.error_code IS DISTINCT FROM 'event_cost_close_request_conflict' THEN
        RAISE EXCEPTION 'W8B regression: close request conflict was not rejected; result=%', row_to_json(v_result);
    END IF;

    SELECT * INTO v_result
    FROM public.reopen_event_cost(v_close_service, 'manager must not reopen', gen_random_uuid(), v_admin::text, 'manager');
    IF v_result.error_code IS DISTINCT FROM 'event_cost_reopen_request_invalid' THEN
        RAISE EXCEPTION 'W8B regression: non-admin reopen was not rejected; result=%', row_to_json(v_result);
    END IF;

    BEGIN
        UPDATE public.event_cost_close_versions SET reason = reason WHERE id = v_close_id;
        RAISE EXCEPTION 'W8B_TEST_EXPECTED_IMMUTABILITY_NOT_RAISED';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM = 'W8B_TEST_EXPECTED_IMMUTABILITY_NOT_RAISED' THEN RAISE; END IF;
        IF SQLERRM IS DISTINCT FROM 'event_cost_close_history_immutable' THEN RAISE; END IF;
    END;

    BEGIN
        INSERT INTO public.event_cost_budgets(
            service_id, budget_version, base_budget_amount, contingency_amount,
            reason, approved_by, approved_at, request_id
        ) VALUES (
            v_close_service, 2, 0, 0, 'W8B blocked post-close budget',
            v_admin::text, transaction_timestamp(), gen_random_uuid()
        );
        RAISE EXCEPTION 'W8B_TEST_EXPECTED_BUDGET_GUARD_NOT_RAISED';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM = 'W8B_TEST_EXPECTED_BUDGET_GUARD_NOT_RAISED' THEN RAISE; END IF;
        IF SQLERRM IS DISTINCT FROM 'event_cost_closed_reopen_required' THEN RAISE; END IF;
    END;

    BEGIN
        INSERT INTO public.event_cost_etc_forecasts(
            service_id, forecast_version, etc_amount, forecast_date, reason,
            recorded_by, recorded_at, request_id
        ) VALUES (
            v_close_service, 2, 0, v_business_date, 'W8B blocked post-close ETC',
            v_admin::text, transaction_timestamp(), gen_random_uuid()
        );
        RAISE EXCEPTION 'W8B_TEST_EXPECTED_ETC_GUARD_NOT_RAISED';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM = 'W8B_TEST_EXPECTED_ETC_GUARD_NOT_RAISED' THEN RAISE; END IF;
        IF SQLERRM IS DISTINCT FROM 'event_cost_closed_reopen_required' THEN RAISE; END IF;
    END;

    BEGIN
        UPDATE public.approved_commitments
        SET service_id = v_release_service
        WHERE id = v_commitment_id;
        RAISE EXCEPTION 'W8B_TEST_EXPECTED_TRANSFER_GUARD_NOT_RAISED';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM = 'W8B_TEST_EXPECTED_TRANSFER_GUARD_NOT_RAISED' THEN RAISE; END IF;
        IF SQLERRM IS DISTINCT FROM 'event_cost_closed_reopen_required' THEN RAISE; END IF;
    END;

    -- Every direct cost-authority source must reject post-close deletion too.
    FOREACH v_guard_sql IN ARRAY ARRAY[
        format('DELETE FROM public.event_cost_budgets WHERE service_id = %L::uuid', v_close_service),
        format('DELETE FROM public.event_cost_etc_forecasts WHERE service_id = %L::uuid', v_close_service),
        format('DELETE FROM public.approved_commitments WHERE id = %L::uuid', v_commitment_id),
        format('DELETE FROM public.service_receipts WHERE id = %L::uuid', v_receipt_id),
        format('DELETE FROM public.supplier_bills WHERE id = %L::uuid', v_bill_id),
        format('DELETE FROM public.expenses WHERE id = %L::uuid', v_expense_id),
        format('DELETE FROM public.service_receipt_corrections WHERE id = %L::uuid', v_receipt_correction_id),
        format('DELETE FROM public.supplier_advances WHERE id = %L::uuid', v_close_advance_id),
        format('DELETE FROM public.supplier_advance_authorization_releases WHERE id = %L::uuid', v_close_advance_release_id),
        format('DELETE FROM public.employee_cash_advances WHERE id = %L::uuid', v_cash_advance_id),
        format('DELETE FROM public.expense_evidence_exceptions WHERE id = %L::uuid', v_evidence_exception_id)
    ] LOOP
        BEGIN
            EXECUTE v_guard_sql;
            RAISE EXCEPTION 'W8B_TEST_EXPECTED_DELETE_GUARD_NOT_RAISED';
        EXCEPTION WHEN raise_exception THEN
            IF SQLERRM = 'W8B_TEST_EXPECTED_DELETE_GUARD_NOT_RAISED' THEN RAISE; END IF;
            IF SQLERRM IS DISTINCT FROM 'event_cost_closed_reopen_required' THEN RAISE; END IF;
        END;
    END LOOP;

    BEGIN
        UPDATE public.approved_commitments
        SET service_id = v_close_service
        WHERE id = v_transfer_commitment_id;
        RAISE EXCEPTION 'W8B_TEST_EXPECTED_TRANSFER_INTO_CLOSED_GUARD_NOT_RAISED';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM = 'W8B_TEST_EXPECTED_TRANSFER_INTO_CLOSED_GUARD_NOT_RAISED' THEN RAISE; END IF;
        IF SQLERRM IS DISTINCT FROM 'event_cost_closed_reopen_required' THEN RAISE; END IF;
    END;

    BEGIN
        UPDATE public.expense_evidence_exceptions
        SET disposition_notes = 'W8B forbidden post-close evidence rewrite'
        WHERE id = v_evidence_exception_id;
        RAISE EXCEPTION 'W8B_TEST_EXPECTED_EVIDENCE_UPDATE_GUARD_NOT_RAISED';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM = 'W8B_TEST_EXPECTED_EVIDENCE_UPDATE_GUARD_NOT_RAISED' THEN RAISE; END IF;
        IF SQLERRM IS DISTINCT FROM 'event_cost_closed_reopen_required' THEN RAISE; END IF;
    END;

    BEGIN
        INSERT INTO public.expense_evidence_exceptions(
            expense_id, reason, accountable_owner_id, review_before, created_by
        ) VALUES (
            v_expense_id, 'W8B forbidden post-close evidence insert', v_viewer,
            v_business_date + 30, v_admin
        );
        RAISE EXCEPTION 'W8B_TEST_EXPECTED_EVIDENCE_INSERT_GUARD_NOT_RAISED';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM = 'W8B_TEST_EXPECTED_EVIDENCE_INSERT_GUARD_NOT_RAISED' THEN RAISE; END IF;
        IF SQLERRM IS DISTINCT FROM 'event_cost_closed_reopen_required' THEN RAISE; END IF;
    END;

    SELECT * INTO v_result
    FROM public.reopen_event_cost(v_close_service, 'W8B rollback authorized reopen', v_reopen_request, v_admin::text, 'admin');
    IF v_result.error_code IS NOT NULL OR v_result.close_version <> 1 OR v_result.reopen_id IS NULL OR v_result.idempotent_replay THEN
        RAISE EXCEPTION 'W8B regression: admin reopen failed; result=%', row_to_json(v_result);
    END IF;
    SELECT * INTO v_result
    FROM public.reopen_event_cost(v_close_service, 'W8B rollback authorized reopen', v_reopen_request, v_admin::text, 'admin');
    IF v_result.error_code IS NOT NULL OR NOT v_result.idempotent_replay THEN
        RAISE EXCEPTION 'W8B regression: reopen replay was not idempotent; result=%', row_to_json(v_result);
    END IF;
    SELECT * INTO v_result
    FROM public.reopen_event_cost(v_close_service, 'conflicting reopen reason', v_reopen_request, v_admin::text, 'admin');
    IF v_result.error_code IS DISTINCT FROM 'event_cost_reopen_request_conflict' THEN
        RAISE EXCEPTION 'W8B regression: reopen request conflict was not rejected; result=%', row_to_json(v_result);
    END IF;

    -- Reopen permits the ordinary commitment amendment and receipt workflow;
    -- the next immutable close must capture the changed approved/accepted cost.
    SELECT * INTO v_result
    FROM public.add_approved_commitment_amendment(
        v_commitment_id, 'increase', 25, 'W8B post-reopen late cost',
        'W8B rollback-only late receipt evidence', v_late_amendment_request, v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL OR v_result.amendment_id IS NULL THEN
        RAISE EXCEPTION 'W8B regression: normal post-reopen commitment amendment failed; result=%', row_to_json(v_result);
    END IF;
    v_late_amendment_id := v_result.amendment_id;

    SELECT * INTO v_result
    FROM public.create_service_receipt(
        v_close_service, v_commitment_id, v_business_date, 'W8B post-reopen late work accepted',
        NULL, NULL, NULL, 25, NULL, NULL, NULL, NULL,
        v_late_receipt_request, v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL OR v_result.receipt_id IS NULL THEN
        RAISE EXCEPTION 'W8B regression: normal post-reopen receipt creation failed; result=%', row_to_json(v_result);
    END IF;
    v_late_receipt_id := v_result.receipt_id;
    SELECT * INTO v_result
    FROM public.review_service_receipt(
        v_late_receipt_id, 'ACCEPTED', NULL, v_late_receipt_review_request, v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL OR v_result.acceptance_status IS DISTINCT FROM 'ACCEPTED' THEN
        RAISE EXCEPTION 'W8B regression: normal post-reopen receipt acceptance failed; result=%', row_to_json(v_result);
    END IF;

    v_readiness := public.get_event_cost_close_readiness(v_close_service, v_business_date);
    IF COALESCE((v_readiness ->> 'ready')::boolean, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'W8B regression: late-cost fixture did not return to close-ready; evidence=%', v_readiness;
    END IF;

    SELECT * INTO v_result
    FROM public.close_event_cost(v_close_service, 'W8B rollback second close', v_second_close_request, v_admin::text, 'admin');
    IF v_result.error_code IS NOT NULL OR v_result.close_version <> 2 OR v_result.idempotent_replay THEN
        RAISE EXCEPTION 'W8B regression: close after reopen did not advance version; result=%', row_to_json(v_result);
    END IF;
    SELECT accepted_commitment INTO STRICT v_amount
    FROM public.event_cost_close_versions WHERE id = v_result.close_id;
    IF v_amount IS DISTINCT FROM v_initial_accepted_commitment + 25 THEN
        RAISE EXCEPTION 'W8B regression: reclose snapshot omitted the post-reopen accepted-cost delta; initial=% current=%',
            v_initial_accepted_commitment, v_amount;
    END IF;

    BEGIN
        DELETE FROM public.approved_commitment_amendments WHERE id = v_late_amendment_id;
        RAISE EXCEPTION 'W8B_TEST_EXPECTED_AMENDMENT_DELETE_GUARD_NOT_RAISED';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM = 'W8B_TEST_EXPECTED_AMENDMENT_DELETE_GUARD_NOT_RAISED' THEN RAISE; END IF;
        IF SQLERRM IS DISTINCT FROM 'event_cost_closed_reopen_required' THEN RAISE; END IF;
    END;

    -- Settlement is allowed after managerial close and does not reopen the
    -- snapshot. W8B deliberately guards cost authority, not AP cash settlement.
    SELECT * INTO v_result
    FROM public.record_supplier_payment(
        v_bill_id, v_business_date, 0.01, 'cash', 'W8B rollback payment reference',
        'W8B rollback settlement verification', v_payment_document_id, v_payment_request, v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL OR v_result.payment_id IS NULL THEN
        RAISE EXCEPTION 'W8B regression: normal post-close supplier settlement failed; result=%', row_to_json(v_result);
    END IF;
    v_payment_id := v_result.payment_id;
    v_cost_after_settlement := public.get_event_costing(v_close_service, v_business_date);
    IF (v_cost_after_settlement ->> 'paid_cost')::numeric IS DISTINCT FROM v_initial_paid_cost + 0.01
       OR (v_cost_after_settlement ->> 'outstanding_cost')::numeric IS DISTINCT FROM v_initial_outstanding_cost - 0.01
    THEN
        RAISE EXCEPTION 'W8B regression: post-close settlement did not update current costing; costing=%', v_cost_after_settlement;
    END IF;

    SELECT * INTO v_result
    FROM public.reverse_supplier_payment(
        v_payment_id, 'W8B rollback settlement reversal', v_payment_reversal_request, v_admin::text, 'admin'
    );
    IF v_result.error_code IS NOT NULL THEN
        RAISE EXCEPTION 'W8B regression: post-close supplier settlement reversal failed; result=%', row_to_json(v_result);
    END IF;
    v_cost_after_settlement := public.get_event_costing(v_close_service, v_business_date);
    IF (v_cost_after_settlement ->> 'paid_cost')::numeric IS DISTINCT FROM v_initial_paid_cost
       OR (v_cost_after_settlement ->> 'outstanding_cost')::numeric IS DISTINCT FROM v_initial_outstanding_cost
    THEN
        RAISE EXCEPTION 'W8B regression: reversed settlement did not restore current costing; costing=%', v_cost_after_settlement;
    END IF;
    v_status := public.get_event_cost_close_status(v_close_service, v_business_date);
    IF v_status -> 'active_close' IS NULL
       OR v_status -> 'active_close' ->> 'close_version' IS DISTINCT FROM '2'
       OR (v_status -> 'active_close' ->> 'outstanding_cost')::numeric IS DISTINCT FROM 100::numeric
    THEN
        RAISE EXCEPTION 'W8B regression: AP settlement altered or reopened the immutable close snapshot; status=%', v_status;
    END IF;

    -- Exercise the W6C unused-only release against synthetic advances, never
    -- against the protected SVC-2026-0001 DEV fixture.
    INSERT INTO public.approved_commitments(
        id, service_id, supplier_id, commitment_source, source_reference,
        original_approved_amount, currency, status, approved_at, approved_by,
        created_by, updated_by
    ) VALUES
        (v_release_commitment_id, v_release_service, v_supplier, 'other_authorized', 'W8B unused release fixture', 10, 'SAR', 'open', transaction_timestamp(), v_admin::text, v_admin::text, v_admin::text),
        (v_used_commitment_id, v_release_service, v_supplier, 'other_authorized', 'W8B used release fixture', 10, 'SAR', 'open', transaction_timestamp(), v_admin::text, v_admin::text, v_admin::text);

    INSERT INTO public.supplier_advances(
        advance_number, commitment_id, service_id, supplier_id, currency,
        authorized_amount, reason, evidence_sha256, authorized_by, authorization_request_id
    ) VALUES (
        'SADV-2099-' || v_suffix, v_release_commitment_id, v_release_service,
        v_supplier, 'SAR', 1, 'W8B rollback unused authorization', repeat('a', 64),
        v_admin, gen_random_uuid()
    ) RETURNING id INTO v_advance_id;

    INSERT INTO public.supplier_advances(
        advance_number, commitment_id, service_id, supplier_id, currency,
        authorized_amount, reason, evidence_sha256, authorized_by, authorization_request_id
    ) VALUES (
        'SADV-2098-' || v_suffix, v_used_commitment_id, v_release_service,
        v_supplier, 'SAR', 1, 'W8B rollback used authorization', repeat('b', 64),
        v_admin, gen_random_uuid()
    ) RETURNING id INTO v_used_advance_id;

    SELECT * INTO v_result
    FROM public.release_supplier_advance_authorization(v_advance_id, 'W8B unauthorized Viewer release', gen_random_uuid(), v_viewer::text, 'viewer');
    IF v_result.error_code IS NULL OR EXISTS (
        SELECT 1 FROM public.supplier_advance_authorization_releases WHERE supplier_advance_id = v_advance_id
    ) THEN
        RAISE EXCEPTION 'W8B regression: unauthorized Viewer release was not rejected; result=%', row_to_json(v_result);
    END IF;

    SELECT * INTO v_result
    FROM public.release_supplier_advance_authorization(v_advance_id, 'W8B rollback unused release', v_release_request, v_admin::text, 'admin');
    IF v_result.error_code IS NOT NULL OR v_result.release_id IS NULL OR v_result.idempotent_replay THEN
        RAISE EXCEPTION 'W8B regression: unused authorization release failed; result=%', row_to_json(v_result);
    END IF;
    SELECT * INTO v_result
    FROM public.release_supplier_advance_authorization(v_advance_id, 'W8B rollback unused release', v_release_request, v_admin::text, 'admin');
    IF v_result.error_code IS NOT NULL OR NOT v_result.idempotent_replay THEN
        RAISE EXCEPTION 'W8B regression: release replay was not idempotent; result=%', row_to_json(v_result);
    END IF;
    SELECT existing_advance_reserve INTO v_amount
    FROM public.supplier_advance_commitment_balances WHERE commitment_id = v_release_commitment_id;
    IF COALESCE(v_amount, 0) <> 0 THEN
        RAISE EXCEPTION 'W8B regression: released authorization still reserves commitment capacity';
    END IF;

    BEGIN
        INSERT INTO public.supplier_advance_payments(
            payment_number, supplier_advance_id, supplier_id, service_id,
            payment_date, amount, method, recorded_by, record_request_id
        ) VALUES (
            'SAPAY-2099-' || v_suffix, v_advance_id, v_supplier, v_release_service,
            v_business_date, 0.01, 'cash', v_admin, gen_random_uuid()
        );
        RAISE EXCEPTION 'W8B_TEST_EXPECTED_RELEASE_GUARD_NOT_RAISED';
    EXCEPTION WHEN raise_exception THEN
        IF SQLERRM = 'W8B_TEST_EXPECTED_RELEASE_GUARD_NOT_RAISED' THEN RAISE; END IF;
        IF SQLERRM IS DISTINCT FROM 'supplier_advance_authorization_released' THEN RAISE; END IF;
    END;

    INSERT INTO public.supplier_advance_payments(
        payment_number, supplier_advance_id, supplier_id, service_id,
        payment_date, amount, method, recorded_by, record_request_id
    ) VALUES (
        'SAPAY-2098-' || v_suffix, v_used_advance_id, v_supplier, v_release_service,
        v_business_date, 0.01, 'cash', v_admin, gen_random_uuid()
    );
    SELECT * INTO v_result
    FROM public.release_supplier_advance_authorization(v_used_advance_id, 'W8B reject used authorization', v_used_release_request, v_admin::text, 'admin');
    IF v_result.error_code IS DISTINCT FROM 'supplier_advance_release_not_unused' THEN
        RAISE EXCEPTION 'W8B regression: used authorization was not rejected; result=%', row_to_json(v_result);
    END IF;

    SELECT * INTO v_result
    FROM public.release_supplier_advance_authorization(v_advance_id, 'conflicting W8B reason', v_release_request, v_admin::text, 'admin');
    IF v_result.error_code IS DISTINCT FROM 'supplier_advance_release_request_conflict' THEN
        RAISE EXCEPTION 'W8B regression: release request conflict was not rejected; result=%', row_to_json(v_result);
    END IF;

    RAISE NOTICE 'W8B_ROLLBACK_REGRESSION_PASS service_fixture=% release_fixture=%', v_close_number, v_release_number;
END;
$w8b$;

ROLLBACK;
