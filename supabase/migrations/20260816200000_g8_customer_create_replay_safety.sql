-- Migration: g8_customer_create_replay_safety
-- Description: Adds mutation_key column and unique index to customers table, and implements create_customer_atomic RPC for replay-safe customer creation.
--
-- IMPORTANT:
--   - DEV/DEMO contract only. Do NOT apply automatically to any database.
--   - Application requirePermission(customers:write) and createCustomerSchema remain mandatory before service_role call.
--   - Same-key same-canonical-payload reconciles to original customer.
--   - Same-key different-canonical-payload rejects deterministically with 'mutation_key_conflict' without creating a second customer.
--   - Document number sequence is only consumed on fresh creations, preserving server-authoritative customer numbering.

-- 1. Add mutation_key column to customers
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS mutation_key text;

COMMENT ON COLUMN public.customers.mutation_key IS
    'Caller-generated idempotency / mutation key. NULL for historical rows. '
    'Non-null values are unique across customers.';

-- 2. Add partial unique index on mutation_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_mutation_key_unique
    ON public.customers(mutation_key)
    WHERE mutation_key IS NOT NULL;

COMMENT ON INDEX public.idx_customers_mutation_key_unique IS
    'Unique idempotency reservation for non-null mutation_key values. '
    'Null mutation_key rows are not affected.';

-- 3. Atomic Replay-Safe Customer Creation RPC
CREATE OR REPLACE FUNCTION public.create_customer_atomic(
    p_company text,
    p_contact text,
    p_phone text,
    p_email text,
    p_city text,
    p_status text DEFAULT 'lead',
    p_customer_type text DEFAULT NULL,
    p_legal_name text DEFAULT NULL,
    p_commercial_registration_number text DEFAULT NULL,
    p_vat_number text DEFAULT NULL,
    p_national_address_building_number text DEFAULT NULL,
    p_national_address_street text DEFAULT NULL,
    p_national_address_district text DEFAULT NULL,
    p_national_address_city text DEFAULT NULL,
    p_national_address_postal_code text DEFAULT NULL,
    p_national_address_additional_number text DEFAULT NULL,
    p_national_address_country text DEFAULT NULL,
    p_billing_email text DEFAULT NULL,
    p_finance_contact_name text DEFAULT NULL,
    p_finance_contact_phone text DEFAULT NULL,
    p_payment_terms text DEFAULT NULL,
    p_po_required boolean DEFAULT false,
    p_created_by text DEFAULT NULL,
    p_mutation_key text DEFAULT NULL
)
RETURNS TABLE (
    error_code text,
    customer_id uuid,
    customer_number text,
    is_replayed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_norm_mutation_key text;
    v_existing_customer record;
    v_customer_number text;
    v_new_customer_id uuid;
    v_norm_customer_type text;
    v_norm_legal_name text;
    v_norm_cr text;
    v_norm_vat text;
    v_norm_bld text;
    v_norm_street text;
    v_norm_district text;
    v_norm_city_addr text;
    v_norm_postal text;
    v_norm_additional text;
    v_norm_country text;
    v_norm_billing_email text;
    v_norm_fin_name text;
    v_norm_fin_phone text;
    v_norm_terms text;
    v_norm_po boolean;
BEGIN
    -- -----------------------------------------------------------------------
    -- A. Input validation (before lock)
    -- -----------------------------------------------------------------------
    IF p_company IS NULL OR btrim(p_company) = ''
        OR p_contact IS NULL OR btrim(p_contact) = ''
        OR p_phone IS NULL OR btrim(p_phone) = ''
        OR p_email IS NULL OR btrim(p_email) = ''
        OR p_city IS NULL OR btrim(p_city) = ''
        OR p_created_by IS NULL OR btrim(p_created_by) = ''
        OR p_mutation_key IS NULL OR btrim(p_mutation_key) = ''
    THEN
        RETURN QUERY SELECT 'invalid_customer_input'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF p_status NOT IN ('active', 'inactive', 'lead') THEN
        RETURN QUERY SELECT 'invalid_customer_input'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    -- Canonical normalization of billing fields
    v_norm_customer_type := NULLIF(btrim(coalesce(p_customer_type, '')), '');
    IF v_norm_customer_type NOT IN ('individual', 'company') THEN
        v_norm_customer_type := NULL;
    END IF;

    IF v_norm_customer_type = 'individual' THEN
        v_norm_legal_name := NULL;
        v_norm_cr := NULL;
        v_norm_vat := NULL;
        v_norm_bld := NULL;
        v_norm_street := NULL;
        v_norm_district := NULL;
        v_norm_city_addr := NULL;
        v_norm_postal := NULL;
        v_norm_additional := NULL;
        v_norm_country := NULL;
        v_norm_billing_email := NULL;
        v_norm_fin_name := NULL;
        v_norm_fin_phone := NULL;
        v_norm_terms := NULL;
        v_norm_po := false;
    ELSE
        v_norm_legal_name := NULLIF(btrim(coalesce(p_legal_name, '')), '');
        v_norm_cr := NULLIF(btrim(coalesce(p_commercial_registration_number, '')), '');
        v_norm_vat := NULLIF(btrim(coalesce(p_vat_number, '')), '');
        v_norm_bld := NULLIF(btrim(coalesce(p_national_address_building_number, '')), '');
        v_norm_street := NULLIF(btrim(coalesce(p_national_address_street, '')), '');
        v_norm_district := NULLIF(btrim(coalesce(p_national_address_district, '')), '');
        v_norm_city_addr := NULLIF(btrim(coalesce(p_national_address_city, '')), '');
        v_norm_postal := NULLIF(btrim(coalesce(p_national_address_postal_code, '')), '');
        v_norm_additional := NULLIF(btrim(coalesce(p_national_address_additional_number, '')), '');
        v_norm_country := NULLIF(btrim(coalesce(p_national_address_country, '')), '');
        v_norm_billing_email := lower(NULLIF(btrim(coalesce(p_billing_email, '')), ''));
        v_norm_fin_name := NULLIF(btrim(coalesce(p_finance_contact_name, '')), '');
        v_norm_fin_phone := NULLIF(btrim(coalesce(p_finance_contact_phone, '')), '');
        v_norm_terms := NULLIF(btrim(coalesce(p_payment_terms, '')), '');
        v_norm_po := coalesce(p_po_required, false);
    END IF;

    v_norm_mutation_key := NULLIF(btrim(coalesce(p_mutation_key, '')), '');

    -- -----------------------------------------------------------------------
    -- B. Idempotency & Serialization
    -- -----------------------------------------------------------------------
    IF v_norm_mutation_key IS NOT NULL THEN
        -- Acquire transaction advisory lock scoped to this mutation key to serialize concurrent attempts
        PERFORM pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(v_norm_mutation_key, 8583)
        );

        -- Lookup existing customer by mutation_key
        SELECT
            c.id,
            c.customer_number,
            c.company,
            c.contact,
            c.phone,
            c.email,
            c.city,
            c.status,
            c.customer_type,
            c.legal_name,
            c.commercial_registration_number,
            c.vat_number,
            c.national_address_building_number,
            c.national_address_street,
            c.national_address_district,
            c.national_address_city,
            c.national_address_postal_code,
            c.national_address_additional_number,
            c.national_address_country,
            c.billing_email,
            c.finance_contact_name,
            c.finance_contact_phone,
            c.payment_terms,
            c.po_required
        INTO v_existing_customer
        FROM public.customers c
        WHERE c.mutation_key = v_norm_mutation_key;

        IF FOUND THEN
            -- Check canonical payload equality
            IF btrim(v_existing_customer.company) IS DISTINCT FROM btrim(p_company)
                OR btrim(v_existing_customer.contact) IS DISTINCT FROM btrim(p_contact)
                OR btrim(v_existing_customer.phone) IS DISTINCT FROM btrim(p_phone)
                OR lower(btrim(v_existing_customer.email)) IS DISTINCT FROM lower(btrim(p_email))
                OR btrim(v_existing_customer.city) IS DISTINCT FROM btrim(p_city)
                OR v_existing_customer.status IS DISTINCT FROM p_status
                OR NULLIF(btrim(coalesce(v_existing_customer.customer_type, '')), '') IS DISTINCT FROM v_norm_customer_type
                OR NULLIF(btrim(coalesce(v_existing_customer.legal_name, '')), '') IS DISTINCT FROM v_norm_legal_name
                OR NULLIF(btrim(coalesce(v_existing_customer.commercial_registration_number, '')), '') IS DISTINCT FROM v_norm_cr
                OR NULLIF(btrim(coalesce(v_existing_customer.vat_number, '')), '') IS DISTINCT FROM v_norm_vat
                OR NULLIF(btrim(coalesce(v_existing_customer.national_address_building_number, '')), '') IS DISTINCT FROM v_norm_bld
                OR NULLIF(btrim(coalesce(v_existing_customer.national_address_street, '')), '') IS DISTINCT FROM v_norm_street
                OR NULLIF(btrim(coalesce(v_existing_customer.national_address_district, '')), '') IS DISTINCT FROM v_norm_district
                OR NULLIF(btrim(coalesce(v_existing_customer.national_address_city, '')), '') IS DISTINCT FROM v_norm_city_addr
                OR NULLIF(btrim(coalesce(v_existing_customer.national_address_postal_code, '')), '') IS DISTINCT FROM v_norm_postal
                OR NULLIF(btrim(coalesce(v_existing_customer.national_address_additional_number, '')), '') IS DISTINCT FROM v_norm_additional
                OR NULLIF(btrim(coalesce(v_existing_customer.national_address_country, '')), '') IS DISTINCT FROM v_norm_country
                OR lower(NULLIF(btrim(coalesce(v_existing_customer.billing_email, '')), '')) IS DISTINCT FROM v_norm_billing_email
                OR NULLIF(btrim(coalesce(v_existing_customer.finance_contact_name, '')), '') IS DISTINCT FROM v_norm_fin_name
                OR NULLIF(btrim(coalesce(v_existing_customer.finance_contact_phone, '')), '') IS DISTINCT FROM v_norm_fin_phone
                OR NULLIF(btrim(coalesce(v_existing_customer.payment_terms, '')), '') IS DISTINCT FROM v_norm_terms
                OR coalesce(v_existing_customer.po_required, false) IS DISTINCT FROM v_norm_po
            THEN
                -- Same key, different canonical payload -> deterministic conflict
                RETURN QUERY SELECT 'mutation_key_conflict'::text, NULL::uuid, NULL::text, false;
                RETURN;
            END IF;

            -- Same key, same canonical payload -> reconcile to original customer
            RETURN QUERY SELECT NULL::text, v_existing_customer.id, v_existing_customer.customer_number, true;
            RETURN;
        END IF;
    END IF;

    -- -----------------------------------------------------------------------
    -- C. Document Number Generation & Customer Insertion
    -- -----------------------------------------------------------------------
    v_customer_number := public.generate_document_number('customer');
    IF v_customer_number IS NULL OR btrim(v_customer_number) = '' THEN
        RETURN QUERY SELECT 'number_generation_failed'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    INSERT INTO public.customers (
        id,
        customer_number,
        company,
        contact,
        phone,
        email,
        city,
        status,
        projects_count,
        revenue,
        customer_type,
        legal_name,
        commercial_registration_number,
        vat_number,
        national_address_building_number,
        national_address_street,
        national_address_district,
        national_address_city,
        national_address_postal_code,
        national_address_additional_number,
        national_address_country,
        billing_email,
        finance_contact_name,
        finance_contact_phone,
        payment_terms,
        po_required,
        created_by,
        updated_by,
        mutation_key
    ) VALUES (
        gen_random_uuid(),
        v_customer_number,
        btrim(p_company),
        btrim(p_contact),
        btrim(p_phone),
        btrim(p_email),
        btrim(p_city),
        p_status,
        0,
        0,
        v_norm_customer_type,
        v_norm_legal_name,
        v_norm_cr,
        v_norm_vat,
        v_norm_bld,
        v_norm_street,
        v_norm_district,
        v_norm_city_addr,
        v_norm_postal,
        v_norm_additional,
        v_norm_country,
        v_norm_billing_email,
        v_norm_fin_name,
        v_norm_fin_phone,
        v_norm_terms,
        v_norm_po,
        p_created_by,
        p_created_by,
        v_norm_mutation_key
    )
    RETURNING customers.id, customers.customer_number INTO v_new_customer_id, v_customer_number;

    RETURN QUERY SELECT NULL::text, v_new_customer_id, v_customer_number, false;
    RETURN;
END;
$$;

-- 4. Set function permissions
REVOKE EXECUTE ON FUNCTION public.create_customer_atomic FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_customer_atomic FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_customer_atomic FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer_atomic TO service_role;
