-- P6 Service Billing bounded aggregate reads.
-- Candidate migration only: do not apply outside an explicitly authorized DEV/DEMO runtime task.
-- These helpers return no document identities and are executable only by service_role.

CREATE OR REPLACE FUNCTION public._p6_get_service_billing_authority(p_service_id uuid)
RETURNS TABLE(authority_status text, billing_ceiling numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_scope_history_count bigint;
    v_active_scope_count bigint;
    v_active_ceiling numeric;
    v_active_source_quotation_id public.approved_billing_scopes.source_quotation_id%TYPE;
    v_selected_quotation_total numeric;
    v_has_selected_quotation boolean := false;
BEGIN
    IF p_service_id IS NULL THEN
        RETURN QUERY SELECT 'unavailable'::text, NULL::numeric;
        RETURN;
    END IF;

    SELECT
        count(*)::bigint,
        count(*) FILTER (
            WHERE s.status = 'approved'
              AND s.superseded_at IS NULL
              AND s.voided_at IS NULL
        )::bigint
    INTO v_scope_history_count, v_active_scope_count
    FROM public.approved_billing_scopes s
    WHERE s.service_id = p_service_id;

    IF v_active_scope_count > 1 THEN
        RETURN QUERY SELECT 'unavailable'::text, NULL::numeric;
        RETURN;
    END IF;

    IF v_active_scope_count = 1 THEN
        SELECT s.accepted_grand_total, s.source_quotation_id
        INTO v_active_ceiling, v_active_source_quotation_id
        FROM public.approved_billing_scopes s
        WHERE s.service_id = p_service_id
          AND s.status = 'approved'
          AND s.superseded_at IS NULL
          AND s.voided_at IS NULL
        ORDER BY s.id ASC
        LIMIT 1;

        IF v_active_ceiling IS NULL
            OR v_active_ceiling < 0
            OR v_active_ceiling::text IN ('NaN', 'Infinity', '-Infinity')
        THEN
            RETURN QUERY SELECT 'unavailable'::text, NULL::numeric;
            RETURN;
        END IF;
    END IF;

    IF v_active_scope_count = 1 AND v_active_source_quotation_id IS NOT NULL THEN
        SELECT q.grand_total
        INTO v_selected_quotation_total
        FROM public.quotations q
        WHERE q.service_id = p_service_id
          AND q.status = 'approved'
          AND q.is_deleted = false
          AND q.id = v_active_source_quotation_id;
        v_has_selected_quotation := FOUND;
    END IF;

    IF NOT v_has_selected_quotation THEN
        SELECT q.grand_total
        INTO v_selected_quotation_total
        FROM public.quotations q
        WHERE q.service_id = p_service_id
          AND q.status = 'approved'
          AND q.is_deleted = false
        ORDER BY q.created_at DESC, q.id ASC
        LIMIT 1;
        v_has_selected_quotation := FOUND;
    END IF;

    IF v_has_selected_quotation AND (
        v_selected_quotation_total IS NULL
        OR v_selected_quotation_total < 0
        OR v_selected_quotation_total::text IN ('NaN', 'Infinity', '-Infinity')
    ) THEN
        RETURN QUERY SELECT 'unavailable'::text, NULL::numeric;
        RETURN;
    END IF;

    IF v_active_scope_count = 1 THEN
        RETURN QUERY SELECT 'active_abs'::text, v_active_ceiling;
    ELSIF v_scope_history_count > 0 THEN
        RETURN QUERY SELECT 'historical_abs_only'::text, NULL::numeric;
    ELSIF v_has_selected_quotation THEN
        RETURN QUERY SELECT 'legacy_quotation'::text, v_selected_quotation_total;
    ELSE
        RETURN QUERY SELECT 'no_authority'::text, NULL::numeric;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._p6_get_service_billing_exposure(p_service_id uuid)
RETURNS TABLE(
    exposure_status text,
    applicable_invoice_count bigint,
    lifetime_invoice_total numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF p_service_id IS NULL THEN
        RETURN QUERY SELECT 'unavailable'::text, NULL::bigint, NULL::numeric;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.service_id = p_service_id
          AND i.status NOT IN ('cancelled', 'voided')
          AND i.voided_at IS NULL
          AND COALESCE(i.is_deleted, false) = false
          AND (
              i.grand_total IS NULL
              OR i.grand_total < 0
              OR i.grand_total::text IN ('NaN', 'Infinity', '-Infinity')
          )
    ) THEN
        RETURN QUERY SELECT 'unavailable'::text, NULL::bigint, NULL::numeric;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        'ready'::text,
        count(*)::bigint,
        COALESCE(sum(i.grand_total), 0)::numeric
    FROM public.invoices i
    WHERE i.service_id = p_service_id
      AND i.status NOT IN ('cancelled', 'voided')
      AND i.voided_at IS NULL
      AND COALESCE(i.is_deleted, false) = false;
END;
$$;

REVOKE ALL ON FUNCTION public._p6_get_service_billing_authority(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._p6_get_service_billing_exposure(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._p6_get_service_billing_authority(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._p6_get_service_billing_exposure(uuid) TO service_role;

COMMENT ON FUNCTION public._p6_get_service_billing_authority(uuid) IS
'Private service-role P6 helper. Returns one bounded authority row for the Service Billing summary without document identity.';
COMMENT ON FUNCTION public._p6_get_service_billing_exposure(uuid) IS
'Private service-role P6 helper. Returns one bounded applicable-invoice exposure row for the Service Billing summary without document identity.';
