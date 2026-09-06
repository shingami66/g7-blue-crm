-- W4 bounded Procurement Package foundation.
--
-- Procurement Package is the operational sourcing unit. It groups the
-- requirements that G7 intends to source together from one selected supplier.
--
-- This migration is additive. It preserves all legacy W4 requirement and
-- candidate sourcing evidence tables. It does not create an Approved
-- Commitment, Supplier Booking, Purchase Order, receipt, payable, payment,
-- or accounting record.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.suppliers') IS NULL
        OR to_regclass('public.supplier_quotations') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regclass('public.service_procurement_requirements') IS NULL
        OR to_regclass('public.service_procurement_candidates') IS NULL
    THEN
        RAISE EXCEPTION 'W4 package foundation preflight: required prerequisite table missing';
    END IF;

    IF to_regclass('public.service_procurement_packages') IS NOT NULL
        OR to_regclass('public.service_procurement_package_requirements') IS NOT NULL
        OR to_regprocedure('public.upsert_procurement_package(uuid,uuid,text,text,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.set_procurement_package_requirements(uuid,uuid,jsonb,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.select_procurement_package_supplier(uuid,uuid,uuid,uuid,text,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.clear_procurement_package_supplier(uuid,uuid,uuid,text,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'W4 package foundation preflight: package projection or RPC already exists';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.supplier_quotations'::regclass
          AND conname = 'supplier_quotations_id_service_supplier_key'
    ) THEN
        RAISE EXCEPTION 'W4 package foundation preflight: supplier_quotations_id_service_supplier_key missing';
    END IF;
END;
$$;

CREATE TABLE public.service_procurement_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    name text NOT NULL,
    description text,
    procurement_method text,
    status text NOT NULL DEFAULT 'draft',
    selected_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    selected_supplier_quotation_id uuid,
    selection_reason text,
    selection_evidence text,
    selected_at timestamptz,
    selected_by text,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_by text NOT NULL,
    CONSTRAINT service_procurement_packages_name_check CHECK (
        char_length(btrim(name)) BETWEEN 1 AND 255
        AND name = btrim(name)
    ),
    CONSTRAINT service_procurement_packages_description_check CHECK (
        description IS NULL
        OR char_length(btrim(description)) <= 2000
    ),
    CONSTRAINT service_procurement_packages_procurement_method_check CHECK (
        procurement_method IS NULL
        OR procurement_method IN ('rental', 'purchase', 'service')
    ),
    CONSTRAINT service_procurement_packages_status_check CHECK (
        status IN ('draft', 'selected', 'cancelled')
    ),
    CONSTRAINT service_procurement_packages_created_by_check CHECK (
        char_length(btrim(created_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT service_procurement_packages_updated_by_check CHECK (
        char_length(btrim(updated_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT service_procurement_packages_selection_consistency_check CHECK (
        (
            status = 'draft'
            AND selected_supplier_id IS NULL
            AND selected_supplier_quotation_id IS NULL
            AND selected_at IS NULL
            AND selected_by IS NULL
        )
        OR (
            status = 'selected'
            AND selected_supplier_id IS NOT NULL
            AND selected_at IS NOT NULL
            AND selected_by IS NOT NULL
            AND char_length(btrim(selected_by)) BETWEEN 1 AND 255
        )
        OR (
            status = 'cancelled'
        )
    ),
    CONSTRAINT service_procurement_packages_quotation_consistency_check CHECK (
        selected_supplier_quotation_id IS NULL
        OR selected_supplier_id IS NOT NULL
    ),
    CONSTRAINT service_procurement_packages_id_service_key UNIQUE (id, service_id),
    CONSTRAINT service_procurement_packages_quotation_fkey
        FOREIGN KEY (selected_supplier_quotation_id, service_id, selected_supplier_id)
        REFERENCES public.supplier_quotations(id, service_id, supplier_id)
        ON DELETE RESTRICT
);

CREATE TABLE public.service_procurement_package_requirements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id uuid NOT NULL,
    service_id uuid NOT NULL,
    requirement_key text,
    title text NOT NULL,
    specifications text,
    sort_order integer NOT NULL DEFAULT 0,
    legacy_requirement_id uuid REFERENCES public.service_procurement_requirements(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_by text NOT NULL,
    CONSTRAINT service_procurement_package_requirements_package_fkey
        FOREIGN KEY (package_id, service_id)
        REFERENCES public.service_procurement_packages(id, service_id)
        ON DELETE CASCADE,
    CONSTRAINT service_procurement_package_requirements_service_fkey
        FOREIGN KEY (service_id)
        REFERENCES public.services(id)
        ON DELETE RESTRICT,
    CONSTRAINT service_procurement_package_requirements_title_check CHECK (
        char_length(btrim(title)) BETWEEN 1 AND 2000
        AND title = btrim(title)
    ),
    CONSTRAINT service_procurement_package_requirements_key_check CHECK (
        requirement_key IS NULL
        OR (
            char_length(btrim(requirement_key)) BETWEEN 1 AND 100
            AND requirement_key = btrim(requirement_key)
        )
    ),
    CONSTRAINT service_procurement_package_requirements_specifications_check CHECK (
        specifications IS NULL
        OR char_length(btrim(specifications)) <= 2000
    ),
    CONSTRAINT service_procurement_package_requirements_sort_order_check CHECK (
        sort_order >= 0
    ),
    CONSTRAINT service_procurement_package_requirements_created_by_check CHECK (
        char_length(btrim(created_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT service_procurement_package_requirements_updated_by_check CHECK (
        char_length(btrim(updated_by)) BETWEEN 1 AND 255
    )
);

CREATE INDEX service_procurement_packages_service_created_idx
    ON public.service_procurement_packages(service_id, created_at DESC, id DESC);

CREATE INDEX service_procurement_packages_supplier_idx
    ON public.service_procurement_packages(selected_supplier_id, created_at DESC)
    WHERE selected_supplier_id IS NOT NULL;

CREATE INDEX service_procurement_package_requirements_package_sort_idx
    ON public.service_procurement_package_requirements(package_id, sort_order ASC, id ASC);

COMMENT ON TABLE public.service_procurement_packages IS
    'Procurement Package: the operational sourcing unit grouping event requirements to be sourced together from one selected supplier.';
COMMENT ON COLUMN public.service_procurement_packages.selected_supplier_id IS
    'The single supplier ultimately selected for this procurement package; does not create a commitment or booking.';
COMMENT ON COLUMN public.service_procurement_packages.selected_supplier_quotation_id IS
    'Optional canonical Supplier Quotation reference, verified against the selected supplier and service.';
COMMENT ON TABLE public.service_procurement_package_requirements IS
    'Requirements belonging to a Procurement Package; supports curated common requirement keys and authentic custom text.';

ALTER TABLE public.service_procurement_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_procurement_package_requirements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.service_procurement_packages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.service_procurement_package_requirements FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.service_procurement_packages TO service_role;
GRANT ALL ON TABLE public.service_procurement_package_requirements TO service_role;

-- 1. Create or update procurement package metadata
CREATE OR REPLACE FUNCTION public.upsert_procurement_package(
    p_package_id uuid,
    p_service_id uuid,
    p_name text,
    p_description text,
    p_procurement_method text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    package_id uuid,
    service_id uuid,
    status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_name text := NULLIF(btrim(p_name), '');
    v_description text := NULLIF(btrim(p_description), '');
    v_procurement_method text := NULLIF(btrim(p_procurement_method), '');
    v_package_id uuid;
    v_status text;
    v_before jsonb;
    v_payload jsonb;
    v_action text;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'procurement_package_request_invalid', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'procurement_package_permission_denied', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF p_service_id IS NULL THEN
        RETURN QUERY SELECT 'service_not_found', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF v_name IS NULL OR char_length(v_name) > 255 THEN
        RETURN QUERY SELECT 'procurement_package_name_invalid', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF v_description IS NOT NULL AND char_length(v_description) > 2000 THEN
        RETURN QUERY SELECT 'procurement_package_description_invalid', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF v_procurement_method IS NOT NULL
        AND v_procurement_method NOT IN ('rental', 'purchase', 'service')
    THEN
        RETURN QUERY SELECT 'procurement_package_method_invalid', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-procurement-package:' || p_request_id::text, 0));

    IF NOT EXISTS (
        SELECT 1
        FROM public.services s
        WHERE s.id = p_service_id
          AND s.deleted_at IS NULL
          AND s.status NOT IN ('Completed', 'Cancelled')
    ) THEN
        RETURN QUERY SELECT 'service_procurement_service_locked', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'package_id', p_package_id,
        'service_id', p_service_id,
        'name', v_name,
        'description', v_description,
        'procurement_method', v_procurement_method
    );

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_package_id, v_before
    FROM public.audit_logs a
    WHERE a.action IN ('procurement_package_created', 'procurement_package_updated')
      AND a.entity_type = 'procurement_package'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC
    LIMIT 1;

    IF v_package_id IS NOT NULL THEN
        IF v_before = v_payload THEN
            SELECT pkg.status
            INTO v_status
            FROM public.service_procurement_packages pkg
            WHERE pkg.id = v_package_id;

            RETURN QUERY SELECT NULL::text, v_package_id, p_service_id, v_status, true;
            RETURN;
        END IF;

        RETURN QUERY SELECT 'request_id_conflict', p_package_id, p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF p_package_id IS NULL THEN
        INSERT INTO public.service_procurement_packages (
            service_id,
            name,
            description,
            procurement_method,
            status,
            created_at,
            created_by,
            updated_at,
            updated_by
        ) VALUES (
            p_service_id,
            v_name,
            v_description,
            v_procurement_method,
            'draft',
            v_now,
            p_actor_id,
            v_now,
            p_actor_id
        )
        RETURNING id, status INTO v_package_id, v_status;

        v_action := 'procurement_package_created';
        v_before := NULL;
    ELSE
        SELECT to_jsonb(pkg.*), pkg.status
        INTO v_before, v_status
        FROM public.service_procurement_packages pkg
        WHERE pkg.id = p_package_id
          AND pkg.service_id = p_service_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'procurement_package_not_found', p_package_id, p_service_id, NULL::text, false;
            RETURN;
        END IF;

        UPDATE public.service_procurement_packages pkg
        SET name = v_name,
            description = v_description,
            procurement_method = v_procurement_method,
            updated_at = v_now,
            updated_by = p_actor_id
        WHERE pkg.id = p_package_id
          AND pkg.service_id = p_service_id
        RETURNING pkg.id, pkg.status INTO v_package_id, v_status;

        v_action := 'procurement_package_updated';
    END IF;

    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        timestamp
    ) VALUES (
        v_action,
        'procurement_package',
        v_package_id,
        p_actor_id,
        jsonb_build_object(
            'service_id', p_service_id::text,
            'request_id', p_request_id::text,
            'from', v_before,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_package_id, p_service_id, v_status, false;
END;
$$;

-- 2. Set or replace requirements under a package
CREATE OR REPLACE FUNCTION public.set_procurement_package_requirements(
    p_package_id uuid,
    p_service_id uuid,
    p_requirements jsonb,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    package_id uuid,
    requirement_count integer,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_package_id uuid;
    v_status text;
    v_before jsonb;
    v_item jsonb;
    v_title text;
    v_key text;
    v_specs text;
    v_sort integer;
    v_legacy_id uuid;
    v_count integer := 0;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
        OR p_package_id IS NULL
        OR p_service_id IS NULL
    THEN
        RETURN QUERY SELECT 'procurement_package_request_invalid', p_package_id, 0, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'procurement_package_permission_denied', p_package_id, 0, false;
        RETURN;
    END IF;

    IF p_requirements IS NULL OR jsonb_typeof(p_requirements) <> 'array' THEN
        RETURN QUERY SELECT 'procurement_package_requirements_invalid', p_package_id, 0, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-procurement-package-reqs:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_package_id, v_before
    FROM public.audit_logs a
    WHERE a.action = 'procurement_package_requirements_set'
      AND a.entity_type = 'procurement_package'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC
    LIMIT 1;

    IF v_package_id IS NOT NULL THEN
        IF v_before = jsonb_build_object('package_id', p_package_id, 'requirements', p_requirements) THEN
            SELECT count(*)::integer
            INTO v_count
            FROM public.service_procurement_package_requirements r
            WHERE r.package_id = p_package_id;

            RETURN QUERY SELECT NULL::text, p_package_id, v_count, true;
            RETURN;
        END IF;

        RETURN QUERY SELECT 'request_id_conflict', p_package_id, 0, false;
        RETURN;
    END IF;

    SELECT pkg.id, pkg.status
    INTO v_package_id, v_status
    FROM public.service_procurement_packages pkg
    JOIN public.services s ON s.id = pkg.service_id
    WHERE pkg.id = p_package_id
      AND pkg.service_id = p_service_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE OF pkg;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'procurement_package_not_found', p_package_id, 0, false;
        RETURN;
    END IF;

    -- Delete existing package requirements and re-insert given set
    DELETE FROM public.service_procurement_package_requirements r
    WHERE r.package_id = p_package_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_requirements)
    LOOP
        v_title := NULLIF(btrim(v_item ->> 'title'), '');
        IF v_title IS NULL OR char_length(v_title) > 2000 THEN
            RETURN QUERY SELECT 'procurement_package_requirement_title_invalid', p_package_id, 0, false;
            RETURN;
        END IF;

        v_key := NULLIF(btrim(v_item ->> 'requirement_key'), '');
        v_specs := NULLIF(btrim(v_item ->> 'specifications'), '');
        v_sort := COALESCE((v_item ->> 'sort_order')::integer, v_count);
        v_legacy_id := NULLIF(v_item ->> 'legacy_requirement_id', '')::uuid;

        INSERT INTO public.service_procurement_package_requirements (
            package_id,
            service_id,
            requirement_key,
            title,
            specifications,
            sort_order,
            legacy_requirement_id,
            created_at,
            created_by,
            updated_at,
            updated_by
        ) VALUES (
            p_package_id,
            p_service_id,
            v_key,
            v_title,
            v_specs,
            v_sort,
            v_legacy_id,
            v_now,
            p_actor_id,
            v_now,
            p_actor_id
        );

        v_count := v_count + 1;
    END LOOP;

    UPDATE public.service_procurement_packages pkg
    SET updated_at = v_now,
        updated_by = p_actor_id
    WHERE pkg.id = p_package_id;

    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        timestamp
    ) VALUES (
        'procurement_package_requirements_set',
        'procurement_package',
        p_package_id,
        p_actor_id,
        jsonb_build_object(
            'service_id', p_service_id::text,
            'request_id', p_request_id::text,
            'payload', jsonb_build_object('package_id', p_package_id, 'requirements', p_requirements),
            'count', v_count
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_package_id, v_count, false;
END;
$$;

-- 3. Select supplier and optional quotation for a package
CREATE OR REPLACE FUNCTION public.select_procurement_package_supplier(
    p_package_id uuid,
    p_service_id uuid,
    p_supplier_id uuid,
    p_supplier_quotation_id uuid,
    p_selection_reason text,
    p_selection_evidence text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    package_id uuid,
    supplier_id uuid,
    quotation_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_selection_reason text := NULLIF(btrim(p_selection_reason), '');
    v_selection_evidence text := NULLIF(btrim(p_selection_evidence), '');
    v_package_id uuid;
    v_status text;
    v_before jsonb;
    v_payload jsonb;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
        OR p_package_id IS NULL
        OR p_service_id IS NULL
        OR p_supplier_id IS NULL
    THEN
        RETURN QUERY SELECT 'procurement_package_request_invalid', p_package_id, p_supplier_id, p_supplier_quotation_id, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'procurement_package_permission_denied', p_package_id, p_supplier_id, p_supplier_quotation_id, false;
        RETURN;
    END IF;

    IF v_selection_reason IS NOT NULL AND char_length(v_selection_reason) > 2000 THEN
        RETURN QUERY SELECT 'procurement_package_selection_reason_invalid', p_package_id, p_supplier_id, p_supplier_quotation_id, false;
        RETURN;
    END IF;

    IF v_selection_evidence IS NOT NULL AND char_length(v_selection_evidence) > 2000 THEN
        RETURN QUERY SELECT 'procurement_package_selection_evidence_invalid', p_package_id, p_supplier_id, p_supplier_quotation_id, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-procurement-package-select:' || p_request_id::text, 0));

    v_payload := jsonb_build_object(
        'package_id', p_package_id,
        'service_id', p_service_id,
        'supplier_id', p_supplier_id,
        'supplier_quotation_id', p_supplier_quotation_id,
        'selection_reason', v_selection_reason,
        'selection_evidence', v_selection_evidence
    );

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_package_id, v_before
    FROM public.audit_logs a
    WHERE a.action = 'procurement_package_supplier_selected'
      AND a.entity_type = 'procurement_package'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC
    LIMIT 1;

    IF v_package_id IS NOT NULL THEN
        IF v_before = v_payload THEN
            RETURN QUERY SELECT NULL::text, p_package_id, p_supplier_id, p_supplier_quotation_id, true;
            RETURN;
        END IF;

        RETURN QUERY SELECT 'request_id_conflict', p_package_id, p_supplier_id, p_supplier_quotation_id, false;
        RETURN;
    END IF;

    SELECT pkg.id, pkg.status, to_jsonb(pkg.*)
    INTO v_package_id, v_status, v_before
    FROM public.service_procurement_packages pkg
    JOIN public.services s ON s.id = pkg.service_id
    WHERE pkg.id = p_package_id
      AND pkg.service_id = p_service_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE OF pkg;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'procurement_package_not_found', p_package_id, p_supplier_id, p_supplier_quotation_id, false;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.suppliers sup
        WHERE sup.id = p_supplier_id
          AND sup.status = 'active'
          AND sup.is_deleted = false
          AND sup.deleted_at IS NULL
    ) THEN
        RETURN QUERY SELECT 'supplier_not_available', p_package_id, p_supplier_id, p_supplier_quotation_id, false;
        RETURN;
    END IF;

    IF p_supplier_quotation_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.supplier_quotations q
            WHERE q.id = p_supplier_quotation_id
              AND q.service_id = p_service_id
              AND q.supplier_id = p_supplier_id
        ) THEN
            RETURN QUERY SELECT 'procurement_package_quotation_mismatch', p_package_id, p_supplier_id, p_supplier_quotation_id, false;
            RETURN;
        END IF;
    END IF;

    UPDATE public.service_procurement_packages pkg
    SET selected_supplier_id = p_supplier_id,
        selected_supplier_quotation_id = p_supplier_quotation_id,
        selection_reason = v_selection_reason,
        selection_evidence = v_selection_evidence,
        selected_at = v_now,
        selected_by = p_actor_id,
        status = 'selected',
        updated_at = v_now,
        updated_by = p_actor_id
    WHERE pkg.id = p_package_id;

    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        timestamp
    ) VALUES (
        'procurement_package_supplier_selected',
        'procurement_package',
        p_package_id,
        p_actor_id,
        jsonb_build_object(
            'service_id', p_service_id::text,
            'request_id', p_request_id::text,
            'from', v_before,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_package_id, p_supplier_id, p_supplier_quotation_id, false;
END;
$$;

-- 4. Clear selected supplier and return package to draft
CREATE OR REPLACE FUNCTION public.clear_procurement_package_supplier(
    p_package_id uuid,
    p_service_id uuid,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    package_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_package_id uuid;
    v_status text;
    v_before jsonb;
    v_payload jsonb;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
        OR p_package_id IS NULL
        OR p_service_id IS NULL
    THEN
        RETURN QUERY SELECT 'procurement_package_request_invalid', p_package_id, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'procurement_package_permission_denied', p_package_id, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-procurement-package-clear:' || p_request_id::text, 0));

    v_payload := jsonb_build_object(
        'package_id', p_package_id,
        'service_id', p_service_id,
        'operation', 'clear_selected_supplier'
    );

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_package_id, v_before
    FROM public.audit_logs a
    WHERE a.action = 'procurement_package_supplier_cleared'
      AND a.entity_type = 'procurement_package'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC
    LIMIT 1;

    IF v_package_id IS NOT NULL THEN
        IF v_before = v_payload THEN
            RETURN QUERY SELECT NULL::text, p_package_id, true;
            RETURN;
        END IF;

        RETURN QUERY SELECT 'request_id_conflict', p_package_id, false;
        RETURN;
    END IF;

    SELECT pkg.id, pkg.status, to_jsonb(pkg.*)
    INTO v_package_id, v_status, v_before
    FROM public.service_procurement_packages pkg
    JOIN public.services s ON s.id = pkg.service_id
    WHERE pkg.id = p_package_id
      AND pkg.service_id = p_service_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE OF pkg;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'procurement_package_not_found', p_package_id, false;
        RETURN;
    END IF;

    UPDATE public.service_procurement_packages pkg
    SET selected_supplier_id = NULL,
        selected_supplier_quotation_id = NULL,
        selection_reason = NULL,
        selection_evidence = NULL,
        selected_at = NULL,
        selected_by = NULL,
        status = 'draft',
        updated_at = v_now,
        updated_by = p_actor_id
    WHERE pkg.id = p_package_id;

    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details,
        timestamp
    ) VALUES (
        'procurement_package_supplier_cleared',
        'procurement_package',
        p_package_id,
        p_actor_id,
        jsonb_build_object(
            'service_id', p_service_id::text,
            'request_id', p_request_id::text,
            'from', v_before,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_package_id, false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_procurement_package TO service_role;
GRANT EXECUTE ON FUNCTION public.set_procurement_package_requirements TO service_role;
GRANT EXECUTE ON FUNCTION public.select_procurement_package_supplier TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_procurement_package_supplier TO service_role;

COMMIT;
