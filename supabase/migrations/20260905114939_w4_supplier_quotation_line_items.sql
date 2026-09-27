-- W4 Supplier Quotation Line Items & Commercial Evidence Rebaseline.
--
-- This additive migration introduces first-class itemized pricing for Supplier
-- Quotations (public.supplier_quotation_lines) while preserving existing total-only
-- quotations, legacy requirement lines, and Shared Business Document links.
-- It enforces service consistency for Package Requirement references at the DB
-- constraint layer via a composite FK using ON DELETE SET NULL (package_requirement_id).
-- The new exact 10-argument create_supplier_quotation RPC supports 3 mutually exclusive
-- modes (Legacy, Total-Only, Detailed) with zero parameter defaults to eliminate
-- PostgREST overload ambiguity. The existing 9-argument RPC is preserved unchanged.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.suppliers') IS NULL
        OR to_regclass('public.supplier_quotations') IS NULL
        OR to_regclass('public.supplier_quotation_requirements') IS NULL
        OR to_regclass('public.service_procurement_requirements') IS NULL
        OR to_regclass('public.service_procurement_packages') IS NULL
        OR to_regclass('public.service_procurement_package_requirements') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regprocedure('public.create_supplier_quotation(uuid,uuid,text,date,numeric,jsonb,uuid,text,text)') IS NULL
    THEN
        RAISE EXCEPTION 'W4 Supplier Quotation Line Items preflight: required table or legacy function missing';
    END IF;

    IF to_regclass('public.supplier_quotation_lines') IS NOT NULL THEN
        RAISE EXCEPTION 'W4 Supplier Quotation Line Items preflight: supplier_quotation_lines table already exists';
    END IF;
END;
$$;

-- Add composite unique key on package requirements for service consistency FK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'service_procurement_package_requirements_id_service_key'
          AND conrelid = 'public.service_procurement_package_requirements'::regclass
    ) THEN
        ALTER TABLE public.service_procurement_package_requirements
            ADD CONSTRAINT service_procurement_package_requirements_id_service_key UNIQUE (id, service_id);
    END IF;
END;
$$;

CREATE TABLE public.supplier_quotation_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id uuid NOT NULL,
    service_id uuid NOT NULL,
    package_requirement_id uuid,
    description text NOT NULL,
    quantity numeric(12,2),
    unit text,
    unit_price numeric(14,2),
    line_total numeric(14,2) NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    CONSTRAINT supplier_quotation_lines_quotation_fkey
        FOREIGN KEY (quotation_id, service_id)
        REFERENCES public.supplier_quotations(id, service_id)
        ON DELETE RESTRICT,
    CONSTRAINT supplier_quotation_lines_pkg_req_fkey
        FOREIGN KEY (package_requirement_id, service_id)
        REFERENCES public.service_procurement_package_requirements(id, service_id)
        ON DELETE SET NULL (package_requirement_id),
    CONSTRAINT supplier_quotation_lines_description_check CHECK (
        char_length(btrim(description)) BETWEEN 1 AND 2000
        AND description = btrim(description)
    ),
    CONSTRAINT supplier_quotation_lines_quantity_check CHECK (
        quantity IS NULL OR (quantity > 0 AND quantity <= 999999999.99 AND quantity = round(quantity, 2))
    ),
    CONSTRAINT supplier_quotation_lines_unit_check CHECK (
        unit IS NULL OR (
            char_length(btrim(unit)) BETWEEN 1 AND 50
            AND unit = btrim(unit)
        )
    ),
    CONSTRAINT supplier_quotation_lines_unit_price_check CHECK (
        unit_price IS NULL OR (unit_price >= 0 AND unit_price <= 999999999999.99 AND unit_price = round(unit_price, 2))
    ),
    CONSTRAINT supplier_quotation_lines_line_total_check CHECK (
        line_total >= 0 AND line_total <= 999999999999.99 AND line_total = round(line_total, 2)
    ),
    CONSTRAINT supplier_quotation_lines_reconciliation_check CHECK (
        quantity IS NULL OR unit_price IS NULL OR round(quantity * unit_price, 2) = line_total
    ),
    CONSTRAINT supplier_quotation_lines_sort_order_check CHECK (
        sort_order >= 0
    ),
    CONSTRAINT supplier_quotation_lines_created_by_check CHECK (
        char_length(btrim(created_by)) BETWEEN 1 AND 255
    )
);

CREATE INDEX supplier_quotation_lines_quotation_sort_idx
    ON public.supplier_quotation_lines(quotation_id, sort_order, id);

CREATE INDEX supplier_quotation_lines_pkg_req_idx
    ON public.supplier_quotation_lines(package_requirement_id, service_id);

COMMENT ON TABLE public.supplier_quotation_lines IS
    'Itemized supplier quotation lines: authentic supplier descriptions, optional package requirement linkage, quantities, unit prices, and authoritative line totals.';
COMMENT ON COLUMN public.supplier_quotation_lines.line_total IS
    'Authoritative supplier monetary evidence for the line item.';
COMMENT ON COLUMN public.supplier_quotation_lines.package_requirement_id IS
    'Optional relationship to a service_procurement_package_requirements item belonging to the same service.';

ALTER TABLE public.supplier_quotation_lines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.supplier_quotation_lines FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.supplier_quotation_lines TO service_role;

-- Primary 10-argument function: Mutually Exclusive Modes (Legacy, Total-Only, Detailed)
CREATE OR REPLACE FUNCTION public.create_supplier_quotation(
    p_supplier_id uuid,
    p_service_id uuid,
    p_supplier_reference text,
    p_quotation_date date,
    p_package_total numeric,
    p_requirements jsonb,
    p_lines jsonb,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    quotation_id uuid,
    supplier_id uuid,
    service_id uuid,
    line_count integer,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_supplier_reference text := NULLIF(btrim(p_supplier_reference), '');
    v_legacy_count integer := 0;
    v_distinct_legacy_count integer := 0;
    v_detailed_count integer := 0;
    v_matching_count integer := 0;
    v_lines_valid boolean := false;
    v_detailed_subtotal numeric := 0;
    v_normalized_reqs jsonb := '[]'::jsonb;
    v_normalized_lines jsonb := '[]'::jsonb;
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_quotation_id uuid;
    v_quotation_id uuid;
    v_service_id uuid;
    v_mode text; -- 'legacy', 'total_only', 'detailed'
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'supplier_quotation_request_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'supplier_quotation_permission_denied', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    IF p_supplier_id IS NULL OR p_service_id IS NULL
        OR v_supplier_reference IS NULL
        OR char_length(v_supplier_reference) > 255
        OR p_quotation_date IS NULL
        OR (
            p_package_total IS NOT NULL AND (
                p_package_total < 0
                OR p_package_total > 999999999999.99
                OR p_package_total <> round(p_package_total, 2)
            )
        )
    THEN
        RETURN QUERY SELECT 'supplier_quotation_fields_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    -- Reject malformed JSON containers
    IF p_requirements IS NOT NULL AND jsonb_typeof(p_requirements) <> 'array' THEN
        RETURN QUERY SELECT 'supplier_quotation_requirements_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    IF p_lines IS NOT NULL AND jsonb_typeof(p_lines) <> 'array' THEN
        RETURN QUERY SELECT 'supplier_quotation_lines_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    -- Count legacy requirements
    IF p_requirements IS NOT NULL THEN
        v_legacy_count := jsonb_array_length(p_requirements);
    END IF;

    -- Count detailed lines
    IF p_lines IS NOT NULL THEN
        v_detailed_count := jsonb_array_length(p_lines);
    END IF;

    -- Mutually exclusive mode determination:
    -- 1. Mode conflict: both cannot be non-empty
    IF v_legacy_count > 0 AND v_detailed_count > 0 THEN
        RETURN QUERY SELECT 'supplier_quotation_mode_conflict', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    IF v_legacy_count > 0 THEN
        v_mode := 'legacy';
    ELSIF v_detailed_count > 0 THEN
        v_mode := 'detailed';
    ELSE
        -- Total-only mode requires p_package_total to be present
        IF p_package_total IS NULL THEN
            RETURN QUERY SELECT 'supplier_quotation_total_required', NULL::uuid, p_supplier_id, p_service_id, 0, false;
            RETURN;
        END IF;
        v_mode := 'total_only';
    END IF;

    -- Validate Mode A: Legacy requirements
    IF v_mode = 'legacy' THEN
        IF v_legacy_count < 1 OR v_legacy_count > 100 THEN
            RETURN QUERY SELECT 'supplier_quotation_requirements_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
            RETURN;
        END IF;

        BEGIN
            SELECT
                count(*)::integer,
                count(DISTINCT line.requirement_id)::integer,
                coalesce(bool_and(
                    line.requirement_id IS NOT NULL
                    AND NULLIF(btrim(line.line_summary), '') IS NOT NULL
                    AND char_length(btrim(line.line_summary)) <= 2000
                    AND (
                        line.line_amount IS NULL
                        OR (
                            line.line_amount >= 0
                            AND line.line_amount <= 999999999999.99
                            AND line.line_amount = round(line.line_amount, 2)
                        )
                    )
                ), false),
                coalesce(jsonb_agg(
                    jsonb_build_object(
                        'requirement_id', line.requirement_id,
                        'line_summary', NULLIF(btrim(line.line_summary), ''),
                        'line_amount', line.line_amount
                    )
                    ORDER BY line.requirement_id
                ), '[]'::jsonb)
            INTO v_legacy_count, v_distinct_legacy_count, v_lines_valid, v_normalized_reqs
            FROM jsonb_to_recordset(p_requirements) AS line(
                requirement_id uuid,
                line_summary text,
                line_amount numeric
            );
        EXCEPTION WHEN others THEN
            RETURN QUERY SELECT 'supplier_quotation_requirements_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
            RETURN;
        END;

        IF NOT v_lines_valid OR v_legacy_count <> v_distinct_legacy_count THEN
            RETURN QUERY SELECT 'supplier_quotation_requirements_invalid', NULL::uuid, p_supplier_id, p_service_id, v_legacy_count, false;
            RETURN;
        END IF;
    END IF;

    -- Validate Mode C: Detailed lines
    IF v_mode = 'detailed' THEN
        IF p_package_total IS NULL THEN
            RETURN QUERY SELECT 'supplier_quotation_total_required', NULL::uuid, p_supplier_id, p_service_id, 0, false;
            RETURN;
        END IF;

        IF v_detailed_count < 1 OR v_detailed_count > 100 THEN
            RETURN QUERY SELECT 'supplier_quotation_lines_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
            RETURN;
        END IF;

        BEGIN
            SELECT
                count(*)::integer,
                coalesce(sum(line.line_total), 0),
                coalesce(bool_and(
                    NULLIF(btrim(line.description), '') IS NOT NULL
                    AND char_length(btrim(line.description)) <= 2000
                    AND line.line_total IS NOT NULL
                    AND line.line_total >= 0
                    AND line.line_total <= 999999999999.99
                    AND line.line_total = round(line.line_total, 2)
                    AND (line.sort_order IS NULL OR line.sort_order >= 0)
                    AND (
                        line.quantity IS NULL
                        OR (
                            line.quantity > 0
                            AND line.quantity <= 999999999.99
                            AND line.quantity = round(line.quantity, 2)
                        )
                    )
                    AND (line.unit IS NULL OR (char_length(btrim(line.unit)) <= 50))
                    AND (
                        line.unit_price IS NULL
                        OR (
                            line.unit_price >= 0
                            AND line.unit_price <= 999999999999.99
                            AND line.unit_price = round(line.unit_price, 2)
                        )
                    )
                    AND (
                        line.quantity IS NULL
                        OR line.unit_price IS NULL
                        OR round(line.quantity * line.unit_price, 2) = line.line_total
                    )
                ), false),
                coalesce(jsonb_agg(
                    jsonb_build_object(
                        'package_requirement_id', line.package_requirement_id,
                        'description', NULLIF(btrim(line.description), ''),
                        'quantity', line.quantity,
                        'unit', NULLIF(btrim(line.unit), ''),
                        'unit_price', line.unit_price,
                        'line_total', line.line_total,
                        'sort_order', coalesce(line.sort_order, 0)
                    )
                    ORDER BY
                        coalesce(line.sort_order, 0),
                        line.line_total,
                        NULLIF(btrim(line.description), ''),
                        coalesce(line.package_requirement_id::text, ''),
                        coalesce(line.quantity, 0),
                        coalesce(line.unit_price, 0),
                        coalesce(NULLIF(btrim(line.unit), ''), '')
                ), '[]'::jsonb)
            INTO v_detailed_count, v_detailed_subtotal, v_lines_valid, v_normalized_lines
            FROM jsonb_to_recordset(p_lines) AS line(
                package_requirement_id uuid,
                description text,
                quantity numeric,
                unit text,
                unit_price numeric,
                line_total numeric,
                sort_order integer
            );
        EXCEPTION WHEN others THEN
            RETURN QUERY SELECT 'supplier_quotation_lines_invalid', NULL::uuid, p_supplier_id, p_service_id, 0, false;
            RETURN;
        END;

        IF NOT v_lines_valid THEN
            RETURN QUERY SELECT 'supplier_quotation_lines_invalid', NULL::uuid, p_supplier_id, p_service_id, v_detailed_count, false;
            RETURN;
        END IF;

        IF p_package_total <> v_detailed_subtotal THEN
            RETURN QUERY SELECT 'supplier_quotation_total_mismatch', NULL::uuid, p_supplier_id, p_service_id, v_detailed_count, false;
            RETURN;
        END IF;
    END IF;

    -- Concurrency lock
    PERFORM pg_advisory_xact_lock(hashtextextended('w4-supplier-quotation:' || p_request_id::text, 0));

    -- Verify Service availability
    SELECT s.id
    INTO v_service_id
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_quotation_service_unavailable', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    -- Verify Supplier availability
    PERFORM sp.id
    FROM public.suppliers sp
    WHERE sp.id = p_supplier_id
      AND sp.status = 'active'
      AND coalesce(sp.is_deleted, false) = false
      AND sp.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_quotation_supplier_unavailable', NULL::uuid, p_supplier_id, p_service_id, 0, false;
        RETURN;
    END IF;

    -- Mode A service verification: Legacy requirements belong to p_service_id
    IF v_mode = 'legacy' THEN
        SELECT count(*)::integer
        INTO v_matching_count
        FROM jsonb_to_recordset(p_requirements) AS line(requirement_id uuid)
        JOIN public.service_procurement_requirements r
          ON r.id = line.requirement_id
         AND r.service_id = p_service_id;

        IF v_matching_count <> v_legacy_count THEN
            RETURN QUERY SELECT 'supplier_quotation_requirement_unavailable', NULL::uuid, p_supplier_id, p_service_id, v_legacy_count, false;
            RETURN;
        END IF;
    END IF;

    -- Mode C service verification: Linked package requirements belong to p_service_id
    IF v_mode = 'detailed' THEN
        SELECT count(*)::integer
        INTO v_matching_count
        FROM jsonb_to_recordset(p_lines) AS line(package_requirement_id uuid)
        WHERE line.package_requirement_id IS NOT NULL;

        IF v_matching_count > 0 THEN
            SELECT count(*)::integer
            INTO v_legacy_count -- temporary counter
            FROM jsonb_to_recordset(p_lines) AS line(package_requirement_id uuid)
            JOIN public.service_procurement_package_requirements pr
              ON pr.id = line.package_requirement_id
             AND pr.service_id = p_service_id;

            IF v_legacy_count <> v_matching_count THEN
                RETURN QUERY SELECT 'supplier_quotation_package_requirement_unavailable', NULL::uuid, p_supplier_id, p_service_id, v_detailed_count, false;
                RETURN;
            END IF;
        END IF;
    END IF;

    -- Build payload for audit & idempotency comparison
    v_payload := jsonb_build_object(
        'supplier_id', p_supplier_id,
        'service_id', p_service_id,
        'supplier_reference', v_supplier_reference,
        'quotation_date', p_quotation_date,
        'package_total', p_package_total,
        'currency', 'SAR',
        'mode', v_mode,
        'requirements', v_normalized_reqs,
        'lines', v_normalized_lines
    );

    -- Check idempotent replay
    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_quotation_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'supplier_quotation'
      AND a.details ->> 'operation' = 'supplier_quotation_create'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'supplier_quotation_request_conflict', v_existing_quotation_id, p_supplier_id, p_service_id, 0, false;
            RETURN;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM public.supplier_quotations q
            WHERE q.id = v_existing_quotation_id
        ) THEN
            RETURN QUERY SELECT 'supplier_quotation_unavailable', v_existing_quotation_id, p_supplier_id, p_service_id, 0, false;
            RETURN;
        END IF;

        IF v_mode = 'detailed' THEN
            SELECT count(*)::integer INTO v_detailed_count
            FROM public.supplier_quotation_lines ql
            WHERE ql.quotation_id = v_existing_quotation_id;
            RETURN QUERY SELECT NULL::text, v_existing_quotation_id, p_supplier_id, p_service_id, v_detailed_count, true;
        ELSIF v_mode = 'legacy' THEN
            SELECT count(*)::integer INTO v_legacy_count
            FROM public.supplier_quotation_requirements qr
            WHERE qr.quotation_id = v_existing_quotation_id;
            RETURN QUERY SELECT NULL::text, v_existing_quotation_id, p_supplier_id, p_service_id, v_legacy_count, true;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing_quotation_id, p_supplier_id, p_service_id, 0, true;
        END IF;
        RETURN;
    END IF;

    -- Insert quotation header
    INSERT INTO public.supplier_quotations(
        supplier_id, service_id, supplier_reference, quotation_date,
        package_total, currency, recorded_at, recorded_by,
        updated_at, updated_by
    ) VALUES (
        p_supplier_id, p_service_id, v_supplier_reference, p_quotation_date,
        p_package_total, 'SAR', v_now, p_actor_id, v_now, p_actor_id
    )
    RETURNING id INTO v_quotation_id;

    -- Insert Mode A legacy requirements
    IF v_mode = 'legacy' THEN
        INSERT INTO public.supplier_quotation_requirements(
            quotation_id, requirement_id, service_id, line_summary, line_amount,
            created_at, created_by
        )
        SELECT
            v_quotation_id,
            line.requirement_id,
            p_service_id,
            NULLIF(btrim(line.line_summary), ''),
            line.line_amount,
            v_now,
            p_actor_id
        FROM jsonb_to_recordset(p_requirements) AS line(
            requirement_id uuid,
            line_summary text,
            line_amount numeric
        );
    END IF;

    -- Insert Mode C detailed lines
    IF v_mode = 'detailed' THEN
        INSERT INTO public.supplier_quotation_lines(
            quotation_id, service_id, package_requirement_id, description,
            quantity, unit, unit_price, line_total, sort_order,
            created_at, created_by
        )
        SELECT
            v_quotation_id,
            p_service_id,
            line.package_requirement_id,
            NULLIF(btrim(line.description), ''),
            line.quantity,
            NULLIF(btrim(line.unit), ''),
            line.unit_price,
            line.line_total,
            coalesce(line.sort_order, 0),
            v_now,
            p_actor_id
        FROM jsonb_to_recordset(p_lines) AS line(
            package_requirement_id uuid,
            description text,
            quantity numeric,
            unit text,
            unit_price numeric,
            line_total numeric,
            sort_order integer
        );
    END IF;

    -- Insert audit log
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create',
        'supplier_quotation',
        v_quotation_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'supplier_quotation_created',
            'operation', 'supplier_quotation_create',
            'w4_version', 'w4-v3',
            'request_id', p_request_id::text,
            'service_id', p_service_id,
            'supplier_id', p_supplier_id,
            'quotation_id', v_quotation_id,
            'actor_role', p_actor_role,
            'from', NULL,
            'payload', v_payload
        ),
        v_now
    );

    IF v_mode = 'detailed' THEN
        RETURN QUERY SELECT NULL::text, v_quotation_id, p_supplier_id, p_service_id, v_detailed_count, false;
    ELSIF v_mode = 'legacy' THEN
        RETURN QUERY SELECT NULL::text, v_quotation_id, p_supplier_id, p_service_id, v_legacy_count, false;
    ELSE
        RETURN QUERY SELECT NULL::text, v_quotation_id, p_supplier_id, p_service_id, 0, false;
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_supplier_quotation(uuid, uuid, text, date, numeric, jsonb, jsonb, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier_quotation(uuid, uuid, text, date, numeric, jsonb, jsonb, uuid, text, text) TO service_role;

COMMIT;
