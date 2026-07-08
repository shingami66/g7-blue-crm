-- Approved Billing Scope Draft Discard Atomic Function
-- Purpose:
--   1. Provide a narrow transactional safety exception for draft discard only.
--   2. Delete a single draft approved billing scope and its child items atomically.
--   3. Restrict execution to service_role only.
--
-- IMPORTANT:
--   - This migration is a draft only. Do NOT apply automatically.
--   - This function is not a general Approved Billing Scope RPC pattern.
--   - App-layer requirePermission(...) remains mandatory before calling it.
--   - Do not use this function for approve, void, supersede, invoice, or UI work.

CREATE OR REPLACE FUNCTION public.discard_approved_billing_scope_draft(
    p_scope_id uuid
)
RETURNS TABLE(
    error_code text,
    scope_id uuid,
    service_id uuid,
    source_quotation_id uuid,
    discarded boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_scope_id uuid;
    v_service_id uuid;
    v_source_quotation_id uuid;
    v_status text;
    v_deleted_scope_count integer;
BEGIN
    SELECT
        s.id,
        s.service_id,
        s.source_quotation_id,
        s.status
    INTO
        v_scope_id,
        v_service_id,
        v_source_quotation_id,
        v_status
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            'scope_not_found'::text,
            NULL::uuid,
            NULL::uuid,
            NULL::uuid,
            false;
        RETURN;
    END IF;

    IF v_status <> 'draft' THEN
        RETURN QUERY
        SELECT
            'scope_not_draft'::text,
            v_scope_id,
            v_service_id,
            v_source_quotation_id,
            false;
        RETURN;
    END IF;

    DELETE FROM public.approved_billing_scope_items
    WHERE approved_billing_scope_id = p_scope_id;

    DELETE FROM public.approved_billing_scopes
    WHERE id = p_scope_id
      AND status = 'draft';

    GET DIAGNOSTICS v_deleted_scope_count = ROW_COUNT;

    IF v_deleted_scope_count <> 1 THEN
        RAISE EXCEPTION
            'discard_approved_billing_scope_draft failed to delete draft scope %',
            p_scope_id;
    END IF;

    RETURN QUERY
    SELECT
        NULL::text,
        v_scope_id,
        v_service_id,
        v_source_quotation_id,
        true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.discard_approved_billing_scope_draft(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.discard_approved_billing_scope_draft(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.discard_approved_billing_scope_draft(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.discard_approved_billing_scope_draft(uuid) TO service_role;
