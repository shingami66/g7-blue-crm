-- Migration: 20260817100000_g8_service_create_replay_safety.sql
-- Description: G8 Service Create Replay Safety with deterministic idempotency, advisory lock serialization, and atomic creation
-- Target: DEV/DEMO contract only. Do NOT apply automatically.

BEGIN;

-- 1. Add nullable mutation_key column to services for idempotency tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'services'
          AND column_name = 'mutation_key'
    ) THEN
        ALTER TABLE public.services ADD COLUMN mutation_key text;
    END IF;
END;
$$;

-- 2. Create partial unique index on non-null mutation_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_mutation_key_unique
ON public.services (mutation_key)
WHERE mutation_key IS NOT NULL;

-- 3. Atomic Service Create function with replay safety
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
    -- -----------------------------------------------------------------------
    -- A. Input Validation & Field Normalization
    -- -----------------------------------------------------------------------
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

    IF p_event_start_date IS NOT NULL AND p_event_end_date IS NOT NULL AND p_event_end_date < p_event_start_date THEN
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

    -- -----------------------------------------------------------------------
    -- B. Idempotency & Serialization
    -- -----------------------------------------------------------------------
    IF v_norm_mutation_key IS NOT NULL THEN
        -- Acquire transaction advisory lock scoped to this mutation key to serialize concurrent attempts
        PERFORM pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(v_norm_mutation_key, 8584)
        );

        -- Lookup existing service by mutation_key
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
            -- Check canonical payload equality
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
                -- Same key, different canonical payload -> deterministic conflict
                RETURN QUERY SELECT 'mutation_key_conflict'::text, NULL::uuid, NULL::text, false;
                RETURN;
            END IF;

            -- Same key, same canonical payload -> reconcile to original service
            RETURN QUERY SELECT NULL::text, v_existing_service.id, v_existing_service.service_number, true;
            RETURN;
        END IF;
    END IF;

    -- -----------------------------------------------------------------------
    -- C. Active Customer Verification
    -- -----------------------------------------------------------------------
    SELECT c.id INTO v_customer_check
    FROM public.customers c
    WHERE c.id = p_customer_id
      AND c.status = 'active'
      AND coalesce(c.is_deleted, false) = false;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'customer_unavailable'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    -- -----------------------------------------------------------------------
    -- D. Document Number Generation & Service Insertion
    -- -----------------------------------------------------------------------
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
    RETURNING services.id, services.service_number INTO v_new_service_id, v_service_number;

    RETURN QUERY SELECT NULL::text, v_new_service_id, v_service_number, false;
    RETURN;
END;
$$;

-- 4. Set function permissions
REVOKE EXECUTE ON FUNCTION public.create_service_atomic FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_service_atomic FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_service_atomic FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_service_atomic TO service_role;

COMMIT;
