-- NOT EXECUTED by the W11-M0 lifecycle repair task.
-- Run only on an explicitly identified disposable database after the reviewed
-- migration is applied. DO NOT RUN AGAINST DEV, DEMO, OR PROD.
-- The fixture uses synthetic records and must complete with ROLLBACK.
-- If any statement fails, stop and close the connection with ROLLBACK.

BEGIN;

CREATE FUNCTION pg_temp.expect(p_ok boolean, p_case text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_ok IS NOT TRUE THEN
        RAISE EXCEPTION 'regression failed: %', p_case;
    END IF;
END;
$$;

CREATE FUNCTION public.g7_m0_test_fail_lifecycle_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF current_setting('g7_m0_test.fail_lifecycle_projection', true) = 'on' THEN
        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'g7_m0_test_projection_rejected';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER g7_m0_test_fail_lifecycle_insert_trg
BEFORE INSERT ON public.service_lifecycle_states
FOR EACH ROW
EXECUTE FUNCTION public.g7_m0_test_fail_lifecycle_insert();

DO $regression$
DECLARE
    v_customer_id uuid := gen_random_uuid();
    v_service_id uuid;
    v_mutation_key text := 'g7-m0-success-' || gen_random_uuid()::text;
    v_failure_key text := 'g7-m0-failure-' || gen_random_uuid()::text;
    v_result record;
    v_replay record;
    v_transition record;
    v_failure record;
    v_failure_message text;
    v_failure_observed boolean := false;
BEGIN
    INSERT INTO public.customers (
        id,
        customer_number,
        company,
        contact,
        email,
        phone,
        city,
        status,
        created_by
    ) VALUES (
        v_customer_id,
        'M0TEST-' || v_customer_id::text,
        'G7 M0 regression only',
        'Synthetic fixture',
        v_customer_id::text || '@example.invalid',
        '0000000000',
        'Riyadh',
        'active',
        'g7-m0-test'
    );

    SELECT *
    INTO v_result
    FROM public.create_service_atomic(
        p_customer_id => v_customer_id,
        p_service_title => 'G7 M0 regression only',
        p_created_by => 'g7-m0-test',
        p_mutation_key => v_mutation_key
    );

    PERFORM pg_temp.expect(
        v_result.error_code IS NULL
            AND v_result.service_id IS NOT NULL
            AND v_result.is_replayed IS false,
        'fresh creation succeeds'
    );
    v_service_id := v_result.service_id;

    PERFORM pg_temp.expect(
        (SELECT count(*) = 1
         FROM public.services s
         WHERE s.id = v_service_id
           AND s.status = 'Inquiry')
        AND
        (SELECT count(*) = 1
         FROM public.service_lifecycle_states l
         WHERE l.service_id = v_service_id
           AND l.legacy_status = 'Inquiry'
           AND l.commercial_state = 'inquiry'
           AND l.payment_state = 'unassessed'
           AND l.readiness_state = 'unassessed'
           AND l.execution_state = 'not_started'
           AND l.completion_state = 'pending'
           AND l.close_state = 'open'
           AND l.start_gate_basis IS NULL
           AND l.state_version = 0
           AND l.mapping_version = 'w3-v1'),
        'fresh Service has exactly one canonical initial projection'
    );

    UPDATE public.services
    SET status = 'Quoted'
    WHERE id = v_service_id;

    PERFORM pg_temp.expect(
        (SELECT count(*) = 1
         FROM public.service_lifecycle_states l
         WHERE l.service_id = v_service_id
           AND l.legacy_status = 'Quoted'
           AND l.commercial_state = 'quoted'
           AND l.payment_state = 'unassessed'
           AND l.readiness_state = 'unassessed'
           AND l.execution_state = 'not_started'
           AND l.completion_state = 'pending'
           AND l.close_state = 'open'
           AND l.start_gate_basis IS NULL
           AND l.state_version = 0),
        'newly created Service transitioned to Quoted has canonical projection'
    );

    SELECT *
    INTO v_replay
    FROM public.create_service_atomic(
        p_customer_id => v_customer_id,
        p_service_title => 'G7 M0 regression only',
        p_created_by => 'g7-m0-test',
        p_mutation_key => v_mutation_key
    );

    PERFORM pg_temp.expect(
        v_replay.error_code IS NULL
            AND v_replay.service_id = v_service_id
            AND v_replay.is_replayed IS true
            AND (SELECT count(*) = 1 FROM public.services s WHERE s.mutation_key = v_mutation_key)
            AND (SELECT count(*) = 1 FROM public.service_lifecycle_states l WHERE l.service_id = v_service_id),
        'idempotent replay returns the same Service without duplicate projection'
    );

    UPDATE public.services
    SET status = 'Approved'
    WHERE id = v_service_id;

    SELECT *
    INTO v_transition
    FROM public.transition_service_lifecycle(
        v_service_id,
        'mark_ready',
        'g7-m0-test',
        'admin',
        'M0 rollback regression',
        NULL,
        gen_random_uuid()
    );

    PERFORM pg_temp.expect(
        v_transition.error_code IS NULL
            AND v_transition.legacy_status = 'Approved'
            AND v_transition.readiness_state = 'ready'
            AND v_transition.state_version = 1
            AND (SELECT s.status = 'Approved' FROM public.services s WHERE s.id = v_service_id),
        'existing lifecycle transition advances version zero without changing legacy status'
    );

    SELECT *
    INTO v_result
    FROM public.create_service_atomic(
        p_customer_id => NULL,
        p_service_title => ' ',
        p_mutation_key => 'g7-m0-invalid-' || gen_random_uuid()::text
    );

    PERFORM pg_temp.expect(
        v_result.error_code = 'invalid_service_input',
        'RPC validation remains fail-closed'
    );

    SELECT *
    INTO v_result
    FROM public.create_service_atomic(
        p_customer_id => gen_random_uuid(),
        p_service_title => 'G7 M0 unavailable customer regression',
        p_mutation_key => 'g7-m0-unavailable-' || gen_random_uuid()::text
    );

    PERFORM pg_temp.expect(
        v_result.error_code = 'customer_unavailable',
        'inactive or missing customer remains rejected'
    );

    PERFORM set_config('g7_m0_test.fail_lifecycle_projection', 'on', true);

    BEGIN
        SELECT *
        INTO v_failure
        FROM public.create_service_atomic(
            p_customer_id => v_customer_id,
            p_service_title => 'G7 M0 rollback failure regression',
            p_created_by => 'g7-m0-test',
            p_mutation_key => v_failure_key
        );

        RAISE EXCEPTION USING
            ERRCODE = 'P0001',
            MESSAGE = 'g7_m0_test_expected_projection_failure';
    EXCEPTION
        WHEN SQLSTATE 'P0001' THEN
            GET STACKED DIAGNOSTICS v_failure_message = MESSAGE_TEXT;
            IF v_failure_message <> 'g7_m0_test_projection_rejected' THEN
                RAISE EXCEPTION 'unexpected failure-path result: %', v_failure_message;
            END IF;
            v_failure_observed := true;
    END;

    PERFORM pg_temp.expect(v_failure_observed, 'lifecycle insert failure is observed');
    PERFORM pg_temp.expect(
        NOT EXISTS (
            SELECT 1
            FROM public.services s
            WHERE s.mutation_key = v_failure_key
        )
        AND NOT EXISTS (
            SELECT 1
            FROM public.service_lifecycle_states l
            JOIN public.services s ON s.id = l.service_id
            WHERE s.mutation_key = v_failure_key
        ),
        'lifecycle insert failure rolls back the Service row'
    );
END;
$regression$;

DROP TRIGGER g7_m0_test_fail_lifecycle_insert_trg ON public.service_lifecycle_states;
DROP FUNCTION public.g7_m0_test_fail_lifecycle_insert();

ROLLBACK;
