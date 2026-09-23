-- W8B DEV behavioral regression. Run only after the reviewed W8B migration is
-- applied to the authorized DEV project. Every synthetic row and audit event is
-- created inside this transaction and removed by the final ROLLBACK.
BEGIN;

DO $w8b$
DECLARE
    v_admin uuid;
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
    v_commitment_id uuid := gen_random_uuid();
    v_receipt_id uuid := gen_random_uuid();
    v_bill_id uuid := gen_random_uuid();
    v_release_commitment_id uuid := gen_random_uuid();
    v_used_commitment_id uuid := gen_random_uuid();
    v_advance_id uuid := gen_random_uuid();
    v_used_advance_id uuid := gen_random_uuid();
    v_release_request uuid := gen_random_uuid();
    v_used_release_request uuid := gen_random_uuid();
    v_close_id uuid;
    v_result record;
    v_readiness jsonb;
    v_status jsonb;
    v_amount numeric;
    v_ready_fixture_count integer;
BEGIN
    SELECT id INTO STRICT v_admin
    FROM public.app_users
    WHERE role = 'admin' AND is_active = true
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
    v_readiness := public.get_event_cost_close_readiness(v_existing_service, v_business_date);
    IF COALESCE((v_readiness ->> 'ready')::boolean, true) THEN
        RAISE EXCEPTION 'W8B regression: known incomplete service unexpectedly became close-ready';
    END IF;

    -- Create a disposable, complete service fixture with approved supplier cost
    -- still outstanding, so settlement can be tested independently after close.
    LOOP
        v_suffix := lpad((1000 + floor(random() * 9000)::integer)::text, 4, '0');
        v_close_number := 'SVC-2099-' || v_suffix;
        v_release_number := 'SVC-2098-' || v_suffix;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.services WHERE service_number IN (v_close_number, v_release_number))
            AND NOT EXISTS (SELECT 1 FROM public.supplier_bills WHERE bill_number = 'BILL-2099-' || v_suffix)
            AND NOT EXISTS (SELECT 1 FROM public.supplier_payments WHERE payment_number = 'SPAY-2099-' || v_suffix)
            AND NOT EXISTS (SELECT 1 FROM public.supplier_advances WHERE advance_number IN ('SADV-2099-' || v_suffix, 'SADV-2098-' || v_suffix));
    END LOOP;

    INSERT INTO public.services(id, service_number, customer_id, service_title, status, created_by, updated_by)
    VALUES (v_close_service, v_close_number, v_customer, 'W8B rollback regression close fixture', 'Completed', v_admin::text, v_admin::text);
    INSERT INTO public.services(id, service_number, customer_id, service_title, status, created_by, updated_by)
    VALUES (v_release_service, v_release_number, v_customer, 'W8B rollback regression release fixture', 'Approved', v_admin::text, v_admin::text);

    INSERT INTO public.service_lifecycle_states(
        service_id, legacy_status, commercial_state, payment_state, readiness_state,
        execution_state, completion_state, close_state
    ) VALUES (
        v_close_service, 'Completed', 'approved', 'unassessed', 'not_applicable',
        'ended', 'confirmed', 'closed'
    );

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

    INSERT INTO public.service_receipts(
        id, service_id, supplier_id, commitment_id, acceptance_status,
        performance_date, delivered_scope, received_amount, submitted_by,
        reviewed_at, reviewed_by, created_by, updated_by
    ) VALUES (
        v_receipt_id, v_close_service, v_supplier, v_commitment_id, 'ACCEPTED',
        v_business_date, 'W8B rollback regression accepted scope', 100,
        v_admin::text, transaction_timestamp(), v_admin::text, v_admin::text, v_admin::text
    );

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

    v_readiness := public.get_event_cost_close_readiness(v_close_service, v_business_date);
    IF COALESCE((v_readiness ->> 'ready')::boolean, false) IS NOT TRUE
       OR v_readiness -> 'costing' -> 'completeness' ->> 'status' IS DISTINCT FROM 'COMPLETE'
       OR (v_readiness -> 'costing' ->> 'outstanding_cost')::numeric IS DISTINCT FROM 100::numeric
    THEN
        RAISE EXCEPTION 'W8B regression: synthetic close fixture not ready with expected outstanding AP; evidence=%', v_readiness;
    END IF;

    SELECT * INTO v_result
    FROM public.close_event_cost(v_close_service, 'W8B rollback close', v_close_request, v_admin::text, 'admin');
    IF v_result.error_code IS NOT NULL OR v_result.close_id IS NULL OR v_result.close_version <> 1 OR v_result.idempotent_replay THEN
        RAISE EXCEPTION 'W8B regression: first close failed; result=%', row_to_json(v_result);
    END IF;
    v_close_id := v_result.close_id;

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

    SELECT * INTO v_result
    FROM public.close_event_cost(v_close_service, 'W8B rollback second close', v_second_close_request, v_admin::text, 'admin');
    IF v_result.error_code IS NOT NULL OR v_result.close_version <> 2 OR v_result.idempotent_replay THEN
        RAISE EXCEPTION 'W8B regression: close after reopen did not advance version; result=%', row_to_json(v_result);
    END IF;

    -- Settlement is allowed after managerial close and does not reopen the
    -- snapshot. W8B deliberately guards cost authority, not AP cash settlement.
    INSERT INTO public.supplier_payments(
        payment_number, supplier_bill_id, supplier_id, service_id, payment_date,
        amount, method, recorded_by, record_request_id
    ) VALUES (
        'SPAY-2099-' || v_suffix, v_bill_id, v_supplier, v_close_service,
        v_business_date, 0.01, 'cash', v_admin, gen_random_uuid()
    );
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
