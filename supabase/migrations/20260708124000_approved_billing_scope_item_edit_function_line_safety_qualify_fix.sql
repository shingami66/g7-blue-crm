-- Approved Billing Scope Item Edit Atomic Function Line Safety Qualify Fix
-- Purpose:
--   Fix PL/pgSQL name collision where "line_safety_status" in the parent scope
--   update expression was unqualified, conflicting with the RETURNS TABLE
--   output parameter names.
--
-- IMPORTANT:
--   - This second corrective migration must be applied manually in DEV/DEMO.
--   - App-layer requirePermission(...) remains mandatory before calling it.
--   - service_role-only execution remains active.

CREATE OR REPLACE FUNCTION public.edit_approved_billing_scope_item(
    p_scope_id uuid,
    p_item_id uuid,
    p_decision text,
    p_accepted_qty numeric,
    p_accepted_unit_price numeric,
    p_reason_code text,
    p_reason_note text,
    p_display_order integer
)
RETURNS TABLE(
    error_code text,
    scope_id uuid,
    item_id uuid,
    accepted_subtotal numeric,
    accepted_vat_amount numeric,
    accepted_grand_total numeric,
    line_safety_status text,
    updated boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_scope_id uuid;
    v_status text;
    v_source_vat_rate numeric(5,2);
    v_old_safety_status text;

    v_item_id uuid;
    v_old_decision text;
    v_source_qty numeric(12,2);
    v_source_unit_price numeric(12,2);
    v_source_subtotal numeric(12,2);
    v_source_vat_amount numeric(12,2);
    v_source_grand_total numeric(12,2);
    v_old_accepted_qty numeric(12,2);
    v_old_accepted_unit_price numeric(12,2);
    v_old_accepted_subtotal numeric(12,2);
    v_old_accepted_vat_amount numeric(12,2);
    v_old_accepted_grand_total numeric(12,2);
    v_old_reason_note text;

    v_next_qty numeric(12,2);
    v_next_unit_price numeric(12,2);
    v_next_subtotal numeric(12,2);
    v_next_vat_amount numeric(12,2);
    v_next_grand_total numeric(12,2);

    v_is_material boolean;
    v_new_subtotal numeric(12,2);
    v_new_vat_amount numeric(12,2);
    v_new_grand_total numeric(12,2);

    v_updated_item_count integer;
    v_updated_scope_count integer;
BEGIN
    -- 1. Lock parent scope row first
    SELECT
        s.id,
        s.status,
        s.source_vat_rate,
        s.line_safety_status
    INTO
        v_scope_id,
        v_status,
        v_source_vat_rate,
        v_old_safety_status
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            'scope_not_found'::text,
            NULL::uuid,
            NULL::uuid,
            NULL::numeric,
            NULL::numeric,
            NULL::numeric,
            NULL::text,
            false;
        RETURN;
    END IF;

    IF v_status <> 'draft' THEN
        RETURN QUERY
        SELECT
            'scope_not_draft'::text,
            p_scope_id,
            NULL::uuid,
            NULL::numeric,
            NULL::numeric,
            NULL::numeric,
            v_old_safety_status,
            false;
        RETURN;
    END IF;

    -- 2. Lock target item row second
    SELECT
        i.id,
        i.decision,
        i.source_qty,
        i.source_unit_price,
        i.source_subtotal,
        i.source_vat_amount,
        i.source_grand_total,
        i.accepted_qty,
        i.accepted_unit_price,
        i.accepted_subtotal,
        i.accepted_vat_amount,
        i.accepted_grand_total,
        i.reason_note
    INTO
        v_item_id,
        v_old_decision,
        v_source_qty,
        v_source_unit_price,
        v_source_subtotal,
        v_source_vat_amount,
        v_source_grand_total,
        v_old_accepted_qty,
        v_old_accepted_unit_price,
        v_old_accepted_subtotal,
        v_old_accepted_vat_amount,
        v_old_accepted_grand_total,
        v_old_reason_note
    FROM public.approved_billing_scope_items i
    WHERE i.id = p_item_id
      AND i.approved_billing_scope_id = p_scope_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            'scope_not_found'::text,
            p_scope_id,
            NULL::uuid,
            NULL::numeric,
            NULL::numeric,
            NULL::numeric,
            v_old_safety_status,
            false;
        RETURN;
    END IF;

    -- Validate decision type
    IF p_decision NOT IN ('accepted', 'adjusted', 'excluded', 'customer_supplied') THEN
        RETURN QUERY
        SELECT
            'scope_unexpected_error'::text,
            p_scope_id,
            p_item_id,
            NULL::numeric,
            NULL::numeric,
            NULL::numeric,
            v_old_safety_status,
            false;
        RETURN;
    END IF;

    -- 3. Determine new accepted values based on decision
    IF p_decision = 'accepted' THEN
        v_next_qty := v_source_qty;
        v_next_unit_price := v_source_unit_price;
    ELSIF p_decision IN ('excluded', 'customer_supplied') THEN
        v_next_qty := 0;
        v_next_unit_price := 0;
    ELSIF p_decision = 'adjusted' THEN
        v_next_qty := COALESCE(p_accepted_qty, v_old_accepted_qty);
        v_next_unit_price := COALESCE(p_accepted_unit_price, v_old_accepted_unit_price);
    END IF;

    -- 4. Validate reduction limits
    IF v_next_qty < 0 OR v_next_qty > v_source_qty THEN
        RETURN QUERY
        SELECT
            'scope_reduction_invalid'::text,
            p_scope_id,
            p_item_id,
            NULL::numeric,
            NULL::numeric,
            NULL::numeric,
            v_old_safety_status,
            false;
        RETURN;
    END IF;

    IF v_next_unit_price < 0 OR v_next_unit_price > v_source_unit_price THEN
        RETURN QUERY
        SELECT
            'scope_reduction_invalid'::text,
            p_scope_id,
            p_item_id,
            NULL::numeric,
            NULL::numeric,
            NULL::numeric,
            v_old_safety_status,
            false;
        RETURN;
    END IF;

    -- Calculate totals
    v_next_subtotal := round((v_next_qty * v_next_unit_price)::numeric, 2);
    v_next_vat_amount := round((v_next_subtotal * (v_source_vat_rate / 100.0))::numeric, 2);
    v_next_grand_total := round((v_next_subtotal + v_next_vat_amount)::numeric, 2);

    -- Double check reduction limit checks on computed totals
    IF v_next_subtotal > v_source_subtotal
        OR v_next_vat_amount > v_source_vat_amount
        OR v_next_grand_total > v_source_grand_total
    THEN
        RETURN QUERY
        SELECT
            'scope_reduction_invalid'::text,
            p_scope_id,
            p_item_id,
            NULL::numeric,
            NULL::numeric,
            NULL::numeric,
            v_old_safety_status,
            false;
        RETURN;
    END IF;

    -- Validate reason code requirements
    IF p_decision IN ('adjusted', 'excluded', 'customer_supplied')
        AND (p_reason_code IS NULL OR trim(p_reason_code) = '')
    THEN
        RETURN QUERY
        SELECT
            'scope_reason_required'::text,
            p_scope_id,
            p_item_id,
            NULL::numeric,
            NULL::numeric,
            NULL::numeric,
            v_old_safety_status,
            false;
        RETURN;
    END IF;

    -- 5. Detect material changes
    v_is_material := (
        v_old_decision IS DISTINCT FROM p_decision
        OR v_old_accepted_qty IS DISTINCT FROM v_next_qty
        OR v_old_accepted_unit_price IS DISTINCT FROM v_next_unit_price
        OR v_old_accepted_subtotal IS DISTINCT FROM v_next_subtotal
        OR v_old_accepted_vat_amount IS DISTINCT FROM v_next_vat_amount
        OR v_old_accepted_grand_total IS DISTINCT FROM v_next_grand_total
    );

    -- 6. Update target item
    -- Explicitly qualify column names on RHS with table alias "scope_items" to prevent output parameter name collisions
    UPDATE public.approved_billing_scope_items AS scope_items
    SET
        decision = p_decision,
        accepted_qty = v_next_qty,
        accepted_unit_price = v_next_unit_price,
        accepted_subtotal = v_next_subtotal,
        accepted_vat_amount = v_next_vat_amount,
        accepted_grand_total = v_next_grand_total,
        reason_code = CASE WHEN p_decision IN ('adjusted', 'excluded', 'customer_supplied') THEN p_reason_code ELSE NULL END,
        reason_note = COALESCE(p_reason_note, v_old_reason_note),
        display_order = COALESCE(p_display_order, scope_items.display_order),
        updated_at = now()
    WHERE scope_items.id = p_item_id;

    GET DIAGNOSTICS v_updated_item_count = ROW_COUNT;

    IF v_updated_item_count <> 1 THEN
        RAISE EXCEPTION 'Failed to update approved_billing_scope_item %', p_item_id;
    END IF;

    -- 7. Recalculate and update parent scope header
    -- Explicitly qualify column names with table alias "items" to avoid PL/pgSQL output column name collisions
    SELECT
        coalesce(sum(items.accepted_subtotal), 0),
        coalesce(sum(items.accepted_vat_amount), 0),
        coalesce(sum(items.accepted_grand_total), 0)
    INTO
        v_new_subtotal,
        v_new_vat_amount,
        v_new_grand_total
    FROM public.approved_billing_scope_items AS items
    WHERE items.approved_billing_scope_id = p_scope_id;

    -- Explicitly qualify RHS column names with table alias "scopes" to prevent output parameter name collisions
    UPDATE public.approved_billing_scopes AS scopes
    SET
        accepted_subtotal = v_new_subtotal,
        accepted_vat_amount = v_new_vat_amount,
        accepted_grand_total = v_new_grand_total,
        line_safety_status = CASE WHEN v_is_material THEN 'pending_review' ELSE scopes.line_safety_status END,
        updated_at = now()
    WHERE scopes.id = p_scope_id;

    GET DIAGNOSTICS v_updated_scope_count = ROW_COUNT;

    IF v_updated_scope_count <> 1 THEN
        RAISE EXCEPTION 'Failed to update approved_billing_scope %', p_scope_id;
    END IF;

    RETURN QUERY
    SELECT
        NULL::text,
        p_scope_id,
        p_item_id,
        v_new_subtotal,
        v_new_vat_amount,
        v_new_grand_total,
        CASE WHEN v_is_material THEN 'pending_review'::text ELSE v_old_safety_status END,
        true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.edit_approved_billing_scope_item(uuid, uuid, text, numeric, numeric, text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.edit_approved_billing_scope_item(uuid, uuid, text, numeric, numeric, text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.edit_approved_billing_scope_item(uuid, uuid, text, numeric, numeric, text, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.edit_approved_billing_scope_item(uuid, uuid, text, numeric, numeric, text, text, integer) TO service_role;
