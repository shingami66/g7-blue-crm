-- G7 M0 lifecycle integrity repair.
-- Stop unless DEV still has exactly the two reviewed active Quoted Services
-- without a lifecycle projection. No migration history or commercial record
-- repair is attempted here.

BEGIN;

-- Prevent concurrent Service/projection writes from changing the bounded
-- preflight population while this transaction replaces the RPC and backfills.
LOCK TABLE public.services, public.service_lifecycle_states
    IN SHARE ROW EXCLUSIVE MODE;

DO $preflight$
DECLARE
    v_required_columns text[];
    v_missing_ids uuid[];
    v_target_ids uuid[] := ARRAY[
        '6371cd1f-69af-4b86-9096-b36c1e56bab0'::uuid,
        'cd3448ff-c8cf-4ba4-89c0-6d6bd2f0b164'::uuid
    ];
    v_active_count bigint;
    v_target_quoted_count bigint;
    v_state_version_check text;
    v_service_id_attnum smallint;
    v_rpc_security_definer boolean;
    v_rpc_search_path text[];
    v_rpc_acl text;
    v_rpc_result text;
    v_rpc_volatility text;
    v_rpc_source_md5 text;
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.service_lifecycle_states') IS NULL
    THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: required table is missing';
    END IF;

    SELECT array_agg(
        format('%s.%s expected %s nullable=%s', r.table_name, r.column_name, r.data_type, r.is_nullable)
        ORDER BY r.table_name, r.column_name
    )
    INTO v_required_columns
    FROM (
        VALUES
            ('services', 'id', 'uuid', 'NO'),
            ('services', 'status', 'text', 'NO'),
            ('services', 'service_number', 'text', 'NO'),
            ('services', 'customer_id', 'uuid', 'NO'),
            ('services', 'service_title', 'text', 'NO'),
            ('services', 'event_name', 'text', 'YES'),
            ('services', 'event_type', 'text', 'YES'),
            ('services', 'event_start_date', 'date', 'YES'),
            ('services', 'event_end_date', 'date', 'YES'),
            ('services', 'event_location', 'text', 'YES'),
            ('services', 'description', 'text', 'YES'),
            ('services', 'estimated_budget', 'numeric', 'YES'),
            ('services', 'cancellation_reason', 'text', 'YES'),
            ('services', 'created_by', 'text', 'YES'),
            ('services', 'mutation_key', 'text', 'YES'),
            ('customers', 'id', 'uuid', 'NO'),
            ('customers', 'status', 'text', 'NO'),
            ('customers', 'is_deleted', 'boolean', 'YES'),
            ('services', 'deleted_at', 'timestamp with time zone', 'YES'),
            ('services', 'created_at', 'timestamp with time zone', 'NO'),
            ('services', 'updated_at', 'timestamp with time zone', 'NO'),
            ('services', 'updated_by', 'text', 'YES'),
            ('service_lifecycle_states', 'service_id', 'uuid', 'NO'),
            ('service_lifecycle_states', 'legacy_status', 'text', 'NO'),
            ('service_lifecycle_states', 'commercial_state', 'text', 'NO'),
            ('service_lifecycle_states', 'payment_state', 'text', 'NO'),
            ('service_lifecycle_states', 'readiness_state', 'text', 'NO'),
            ('service_lifecycle_states', 'execution_state', 'text', 'NO'),
            ('service_lifecycle_states', 'completion_state', 'text', 'NO'),
            ('service_lifecycle_states', 'close_state', 'text', 'NO'),
            ('service_lifecycle_states', 'start_gate_basis', 'text', 'YES'),
            ('service_lifecycle_states', 'state_version', 'bigint', 'NO'),
            ('service_lifecycle_states', 'mapping_version', 'text', 'NO'),
            ('service_lifecycle_states', 'created_at', 'timestamp with time zone', 'NO'),
            ('service_lifecycle_states', 'updated_at', 'timestamp with time zone', 'NO'),
            ('service_lifecycle_states', 'updated_by', 'text', 'YES')
    ) AS r(table_name, column_name, data_type, is_nullable)
    LEFT JOIN information_schema.columns c
        ON c.table_schema = 'public'
       AND c.table_name = r.table_name
       AND c.column_name = r.column_name
    WHERE c.column_name IS NULL
       OR c.data_type IS DISTINCT FROM r.data_type
       OR c.is_nullable IS DISTINCT FROM r.is_nullable;

    IF COALESCE(cardinality(v_required_columns), 0) > 0 THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: required column contract differs: %',
            array_to_string(v_required_columns, '; ');
    END IF;

    SELECT a.attnum
    INTO v_service_id_attnum
    FROM pg_attribute a
    WHERE a.attrelid = 'public.service_lifecycle_states'::regclass
      AND a.attname = 'service_id'
      AND NOT a.attisdropped;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conrelid = 'public.service_lifecycle_states'::regclass
          AND c.contype = 'p'
          AND c.conkey = ARRAY[v_service_id_attnum]::smallint[]
    ) THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: lifecycle service_id primary key differs';
    END IF;

    SELECT pg_get_constraintdef(c.oid)
    INTO v_state_version_check
    FROM pg_constraint c
    WHERE c.conrelid = 'public.service_lifecycle_states'::regclass
      AND c.conname = 'service_lifecycle_states_version_check'
      AND c.contype = 'c';

    IF v_state_version_check IS DISTINCT FROM 'CHECK ((state_version > 0))' THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: state_version constraint differs: %',
            v_state_version_check;
    END IF;

    SELECT
        p.prosecdef,
        p.proconfig,
        p.proacl::text,
        pg_get_function_result(p.oid),
        p.provolatile::text
    INTO
        v_rpc_security_definer,
        v_rpc_search_path,
        v_rpc_acl,
        v_rpc_result,
        v_rpc_volatility
    FROM pg_proc p
    WHERE p.oid = to_regprocedure(
        'public.create_service_atomic(uuid,text,text,text,date,date,text,text,numeric,text,text,text)'
    );

    IF NOT FOUND
        OR v_rpc_security_definer IS DISTINCT FROM true
        OR v_rpc_search_path IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[]
        OR v_rpc_acl IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
        OR v_rpc_result IS DISTINCT FROM 'TABLE(error_code text, service_id uuid, service_number text, is_replayed boolean)'
        OR v_rpc_volatility IS DISTINCT FROM 'v'
    THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: create_service_atomic contract or ACL differs';
    END IF;


    -- Pin the exact reviewed pre-repair body before replacing this RPC.
    SELECT md5(p.prosrc)
    INTO v_rpc_source_md5
    FROM pg_proc p
    WHERE p.oid = to_regprocedure(
        'public.create_service_atomic(uuid,text,text,text,date,date,text,text,numeric,text,text,text)'
    );

    IF v_rpc_source_md5 IS DISTINCT FROM '597401363a3bdcffe045fac401020fa8' THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: create_service_atomic source differs';
    END IF;

    -- The RPC depends on this exact generator contract and reviewed body.
    IF NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        WHERE p.oid = to_regprocedure('public.generate_document_number(text)')
          AND md5(p.prosrc) = '1f4311228850c596c80670287a1f95c0'
          AND p.prosecdef IS TRUE
          AND p.proconfig IS NOT DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[]
          AND p.proacl::text IS NOT DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
          AND pg_get_function_result(p.oid) = 'text'
          AND p.provolatile = 'v'
    ) THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: generate_document_number contract differs';
    END IF;

    -- Protect the Service identity, number uniqueness, and idempotency contracts.
    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('services_pkey', 'CREATE UNIQUE INDEX services_pkey ON public.services USING btree (id)'),
            ('services_service_number_key', 'CREATE UNIQUE INDEX services_service_number_key ON public.services USING btree (service_number)'),
            ('idx_services_mutation_key_unique', 'CREATE UNIQUE INDEX idx_services_mutation_key_unique ON public.services USING btree (mutation_key) WHERE (mutation_key IS NOT NULL)')
        ) AS expected(index_name, definition)
        LEFT JOIN pg_class ix
            ON ix.relnamespace = 'public'::regnamespace
           AND ix.relname = expected.index_name
        LEFT JOIN pg_index i
            ON i.indexrelid = ix.oid
        WHERE i.indexrelid IS NULL
           OR i.indrelid IS DISTINCT FROM 'public.services'::regclass
           OR i.indisunique IS DISTINCT FROM true
           OR i.indisvalid IS DISTINCT FROM true
           OR pg_get_indexdef(i.indexrelid) IS DISTINCT FROM expected.definition
    ) THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: Service identity or mutation index contract differs';
    END IF;

    SELECT count(*)
    INTO v_active_count
    FROM public.services s
    WHERE s.deleted_at IS NULL;

    IF v_active_count <> 13 THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: expected 13 active Services, found %',
            v_active_count;
    END IF;

    SELECT array_agg(s.id ORDER BY s.id)
    INTO v_missing_ids
    FROM public.services s
    LEFT JOIN public.service_lifecycle_states l
        ON l.service_id = s.id
    WHERE s.deleted_at IS NULL
      AND l.service_id IS NULL;

    IF v_missing_ids IS DISTINCT FROM v_target_ids THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: active missing lifecycle IDs differ: %',
            v_missing_ids;
    END IF;

    SELECT count(*)
    INTO v_target_quoted_count
    FROM public.services s
    WHERE s.id = ANY(v_target_ids)
      AND s.deleted_at IS NULL
      AND s.status = 'Quoted';

    IF v_target_quoted_count <> 2 THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: both reviewed Services must remain active and Quoted';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.service_lifecycle_states l
        WHERE l.service_id = ANY(v_target_ids)
    ) THEN
        RAISE EXCEPTION 'g7_m0_preflight_failed: a target lifecycle projection already exists';
    END IF;
END;
$preflight$;

-- The repository's canonical initial lifecycle mapping uses state_version=0.
-- Existing DEV projections are all at version 1; the new check keeps them valid.
ALTER TABLE public.service_lifecycle_states
    DROP CONSTRAINT service_lifecycle_states_version_check;

ALTER TABLE public.service_lifecycle_states
    ADD CONSTRAINT service_lifecycle_states_version_check
    CHECK (state_version >= 0);

-- Preserve the canonical Service creation RPC contract and create its initial
-- lifecycle projection in the same transaction as the Service row.
CREATE OR REPLACE FUNCTION public.create_service_atomic(
    p_customer_id uuid,
    p_service_title text,
    p_event_name text DEFAULT NULL,
    p_event_type text DEFAULT NULL,
    p_event_start_date date DEFAULT NULL,
    p_event_end_date date DEFAULT NULL,
    p_event_location text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_estimated_budget numeric DEFAULT NULL,
    p_cancellation_reason text DEFAULT NULL,
    p_created_by text DEFAULT NULL,
    p_mutation_key text DEFAULT NULL
)
RETURNS TABLE (
    error_code text,
    service_id uuid,
    service_number text,
    is_replayed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_norm_mutation_key text;
    v_norm_title text;
    v_norm_event_name text;
    v_norm_event_type text;
    v_norm_location text;
    v_norm_description text;
    v_norm_budget numeric;
    v_norm_cancellation text;
    v_existing_service record;
    v_customer_check uuid;
    v_service_number text;
    v_new_service_id uuid;
BEGIN
    -- A. Input Validation & Field Normalization
    IF p_customer_id IS NULL
        OR p_service_title IS NULL
        OR btrim(p_service_title) = ''
        OR p_mutation_key IS NULL
        OR btrim(p_mutation_key) = ''
    THEN
        RETURN QUERY SELECT 'invalid_service_input'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    -- Date range validations
    IF p_event_end_date IS NOT NULL AND p_event_start_date IS NULL THEN
        RETURN QUERY SELECT 'invalid_service_input'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF p_event_start_date IS NOT NULL
        AND p_event_end_date IS NOT NULL
        AND p_event_end_date < p_event_start_date
    THEN
        RETURN QUERY SELECT 'invalid_service_input'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    -- Budget validation
    IF p_estimated_budget IS NOT NULL AND p_estimated_budget < 0 THEN
        RETURN QUERY SELECT 'invalid_service_input'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    v_norm_title := btrim(p_service_title);
    v_norm_event_name := NULLIF(btrim(coalesce(p_event_name, '')), '');
    v_norm_event_type := NULLIF(btrim(coalesce(p_event_type, '')), '');
    v_norm_location := NULLIF(btrim(coalesce(p_event_location, '')), '');
    v_norm_description := NULLIF(btrim(coalesce(p_description, '')), '');
    v_norm_budget := p_estimated_budget;
    v_norm_cancellation := NULLIF(btrim(coalesce(p_cancellation_reason, '')), '');
    v_norm_mutation_key := btrim(p_mutation_key);

    -- B. Idempotency & Serialization
    IF v_norm_mutation_key IS NOT NULL THEN
        PERFORM pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(v_norm_mutation_key, 8584)
        );

        SELECT
            s.id,
            s.service_number,
            s.customer_id,
            s.service_title,
            s.event_name,
            s.event_type,
            s.event_start_date,
            s.event_end_date,
            s.event_location,
            s.description,
            s.estimated_budget,
            s.cancellation_reason
        INTO v_existing_service
        FROM public.services s
        WHERE s.mutation_key = v_norm_mutation_key;

        IF FOUND THEN
            IF v_existing_service.customer_id IS DISTINCT FROM p_customer_id
                OR btrim(v_existing_service.service_title) IS DISTINCT FROM v_norm_title
                OR NULLIF(btrim(coalesce(v_existing_service.event_name, '')), '') IS DISTINCT FROM v_norm_event_name
                OR NULLIF(btrim(coalesce(v_existing_service.event_type, '')), '') IS DISTINCT FROM v_norm_event_type
                OR v_existing_service.event_start_date IS DISTINCT FROM p_event_start_date
                OR v_existing_service.event_end_date IS DISTINCT FROM p_event_end_date
                OR NULLIF(btrim(coalesce(v_existing_service.event_location, '')), '') IS DISTINCT FROM v_norm_location
                OR NULLIF(btrim(coalesce(v_existing_service.description, '')), '') IS DISTINCT FROM v_norm_description
                OR v_existing_service.estimated_budget IS DISTINCT FROM v_norm_budget
                OR NULLIF(btrim(coalesce(v_existing_service.cancellation_reason, '')), '') IS DISTINCT FROM v_norm_cancellation
            THEN
                RETURN QUERY SELECT 'mutation_key_conflict'::text, NULL::uuid, NULL::text, false;
                RETURN;
            END IF;

            IF NOT EXISTS (
                SELECT 1
                FROM public.service_lifecycle_states l
                WHERE l.service_id = v_existing_service.id
            ) THEN
                RETURN QUERY SELECT 'service_lifecycle_unavailable'::text, NULL::uuid, NULL::text, false;
                RETURN;
            END IF;

            RETURN QUERY SELECT NULL::text, v_existing_service.id, v_existing_service.service_number, true;
            RETURN;
        END IF;
    END IF;

    -- C. Active Customer Verification
    SELECT c.id
    INTO v_customer_check
    FROM public.customers c
    WHERE c.id = p_customer_id
      AND c.status = 'active'
      AND coalesce(c.is_deleted, false) = false;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'customer_unavailable'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    -- D. Document Number Generation & Service Insertion
    v_service_number := public.generate_document_number('service');
    IF v_service_number IS NULL OR btrim(v_service_number) = '' THEN
        RETURN QUERY SELECT 'number_generation_failed'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    INSERT INTO public.services (
        id,
        service_number,
        customer_id,
        service_title,
        event_name,
        event_type,
        event_start_date,
        event_end_date,
        event_location,
        description,
        estimated_budget,
        status,
        cancellation_reason,
        created_by,
        updated_by,
        mutation_key
    ) VALUES (
        gen_random_uuid(),
        v_service_number,
        p_customer_id,
        v_norm_title,
        v_norm_event_name,
        v_norm_event_type,
        p_event_start_date,
        p_event_end_date,
        v_norm_location,
        v_norm_description,
        v_norm_budget,
        'Inquiry',
        v_norm_cancellation,
        p_created_by,
        p_created_by,
        v_norm_mutation_key
    )
    RETURNING services.id, services.service_number
    INTO v_new_service_id, v_service_number;

    INSERT INTO public.service_lifecycle_states (
        service_id,
        legacy_status,
        commercial_state,
        payment_state,
        readiness_state,
        execution_state,
        completion_state,
        close_state,
        start_gate_basis,
        state_version,
        mapping_version,
        created_at,
        updated_at,
        updated_by
    ) VALUES (
        v_new_service_id,
        'Inquiry',
        'inquiry',
        'unassessed',
        'unassessed',
        'not_started',
        'pending',
        'open',
        NULL,
        0,
        'w3-v1',
        transaction_timestamp(),
        transaction_timestamp(),
        p_created_by
    );

    RETURN QUERY SELECT NULL::text, v_new_service_id, v_service_number, false;
    RETURN;
END;
$$;

-- Reassert the existing RPC ACL without widening its caller set.
REVOKE EXECUTE ON FUNCTION public.create_service_atomic(
    uuid, text, text, text, date, date, text, text, numeric, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_service_atomic(
    uuid, text, text, text, date, date, text, text, numeric, text, text, text
) TO service_role;

-- Repair only the two preflighted active Quoted Services.
DO $backfill$
DECLARE
    v_inserted_count bigint;
BEGIN
    INSERT INTO public.service_lifecycle_states (
        service_id,
        legacy_status,
        commercial_state,
        payment_state,
        readiness_state,
        execution_state,
        completion_state,
        close_state,
        start_gate_basis,
        state_version,
        mapping_version,
        created_at,
        updated_at,
        updated_by
    )
    SELECT
        s.id,
        s.status,
        'quoted',
        'unassessed',
        'unassessed',
        'not_started',
        'pending',
        'open',
        NULL,
        0,
        'w3-v1',
        COALESCE(s.created_at, transaction_timestamp()),
        COALESCE(s.updated_at, transaction_timestamp()),
        s.updated_by
    FROM public.services s
    WHERE s.id = ANY(ARRAY[
        '6371cd1f-69af-4b86-9096-b36c1e56bab0'::uuid,
        'cd3448ff-c8cf-4ba4-89c0-6d6bd2f0b164'::uuid
    ])
      AND s.deleted_at IS NULL
      AND s.status = 'Quoted'
      AND NOT EXISTS (
          SELECT 1
          FROM public.service_lifecycle_states l
          WHERE l.service_id = s.id
      );

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    IF v_inserted_count <> 2 THEN
        RAISE EXCEPTION 'g7_m0_backfill_failed: expected 2 lifecycle rows, inserted %',
            v_inserted_count;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.services s
        LEFT JOIN public.service_lifecycle_states l
            ON l.service_id = s.id
        WHERE s.deleted_at IS NULL
          AND l.service_id IS NULL
    ) THEN
        RAISE EXCEPTION 'g7_m0_backfill_failed: active lifecycle coverage is incomplete';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.services s
        WHERE s.id = ANY(ARRAY[
            '6371cd1f-69af-4b86-9096-b36c1e56bab0'::uuid,
            'cd3448ff-c8cf-4ba4-89c0-6d6bd2f0b164'::uuid
        ])
          AND (s.deleted_at IS NOT NULL OR s.status IS DISTINCT FROM 'Quoted')
    ) THEN
        RAISE EXCEPTION 'g7_m0_backfill_failed: target Service status or active state changed';
    END IF;
END;
$backfill$;

COMMIT;
