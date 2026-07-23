-- Enforce one active Deposit Invoice per Service.
-- DEV/DEMO only. Do NOT apply automatically.
-- Does not claim production readiness. No VAT/ZATCA/FATOORA/QR/XML expansion.
BEGIN;
DO $$
DECLARE
  v_proc regprocedure := to_regprocedure('public.create_invoice_atomic(uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date)');
  v_missing text[]; v_index_oid oid; v_index_def text;
BEGIN
  IF to_regclass('public.invoices') IS NULL OR to_regclass('public.services') IS NULL THEN RAISE EXCEPTION USING MESSAGE='active_deposit_schema_required'; END IF;
  SELECT array_agg(x.column_name) INTO v_missing FROM (VALUES ('invoices','service_id'),('invoices','approved_quotation_id'),('invoices','invoice_type'),('invoices','is_deleted'),('invoices','voided_at'),('invoices','status'),('services','id')) x(table_name,column_name) WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=x.table_name AND c.column_name=x.column_name);
  IF v_missing IS NOT NULL THEN RAISE EXCEPTION USING MESSAGE='active_deposit_columns_required'; END IF;
  IF v_proc IS NULL THEN RAISE EXCEPTION USING MESSAGE='create_invoice_atomic_signature_required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid=v_proc AND p.prosecdef AND coalesce(array_to_string(p.proconfig,','),'') LIKE '%search_path=pg_catalog, public%') THEN RAISE EXCEPTION USING MESSAGE='create_invoice_atomic_security_shape_required'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices i WHERE i.service_id IS NOT NULL AND i.invoice_type='deposit' AND COALESCE(i.is_deleted,false)=false AND i.voided_at IS NULL AND i.status NOT IN ('voided','cancelled') GROUP BY i.service_id HAVING count(*)>1) THEN RAISE EXCEPTION USING MESSAGE='active_deposit_duplicates_require_manual_review'; END IF;
  SELECT c.oid INTO v_index_oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='uq_invoices_one_active_deposit_per_service';
  IF v_index_oid IS NOT NULL THEN
    SELECT regexp_replace(pg_get_indexdef(v_index_oid),'\s+','','g') INTO v_index_def;
    IF v_index_def <> regexp_replace('CREATE UNIQUE INDEX uq_invoices_one_active_deposit_per_service ON public.invoices USING btree (service_id) WHERE service_id IS NOT NULL AND invoice_type = ''deposit'' AND COALESCE(is_deleted, false) = false AND voided_at IS NULL AND status NOT IN (''voided'', ''cancelled'')','\s+','','g') THEN RAISE EXCEPTION USING MESSAGE='active_deposit_index_definition_mismatch'; END IF;
  END IF;
END;
$$;
DO $$ BEGIN IF to_regclass('public.uq_invoices_one_active_deposit_per_service') IS NULL THEN EXECUTE 'CREATE UNIQUE INDEX uq_invoices_one_active_deposit_per_service ON public.invoices (service_id) WHERE service_id IS NOT NULL AND invoice_type = ''deposit'' AND COALESCE(is_deleted, false) = false AND voided_at IS NULL AND status NOT IN (''voided'', ''cancelled'')'; END IF; END; $$;CREATE OR REPLACE FUNCTION public.create_invoice_atomic(
    p_service_id uuid,
    p_quotation_id uuid,
    p_invoice_type text,
    p_requested_amount numeric,
    p_actor_clerk_user_id text,
    p_document_label text,
    p_vat_mode text,
    p_snapshot_seller jsonb,
    p_snapshot_buyer jsonb,
    p_snapshot_quotation jsonb,
    p_snapshot_bank_details jsonb,
    p_snapshot_document_rules jsonb,
    p_invoice_date date DEFAULT CURRENT_DATE,
    p_due_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    error_code text,
    invoice_id uuid,
    invoice_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_service_customer_id uuid;

    v_quotation_id uuid;
    v_quotation_service_id uuid;
    v_quotation_customer_id uuid;
    v_quotation_status text;
    v_quotation_is_deleted boolean;
    v_quotation_grand_total numeric(12, 2);

    v_abs_history_count bigint;
    v_active_scope_id uuid;
    v_active_scope_ceiling numeric(12, 2);
    v_active_count bigint;

    v_ceiling numeric(12, 2);
    v_billing_scope_id uuid;
    v_exposure numeric(12, 2);
    v_remaining numeric(12, 2);
    v_invoice_amount numeric(12, 2);

    v_existing_id uuid;
    v_invoice_number text;
    v_new_invoice_id uuid;
    v_snapshot_quotation jsonb;

    v_deposit_allowed boolean;
    v_final_allowed boolean;
    v_constraint_name text;
BEGIN
    -- =====================================================================
    -- 1. Structural validation (before lock)
    -- =====================================================================
    IF p_service_id IS NULL
        OR p_quotation_id IS NULL
        OR p_invoice_type IS NULL
        OR p_actor_clerk_user_id IS NULL
        OR btrim(p_actor_clerk_user_id) = ''
        OR p_document_label IS NULL
        OR btrim(p_document_label) = ''
        OR p_vat_mode IS NULL
        OR p_invoice_date IS NULL
        OR p_due_date IS NULL
        OR p_snapshot_seller IS NULL
        OR p_snapshot_buyer IS NULL
        OR p_snapshot_quotation IS NULL
        OR p_snapshot_bank_details IS NULL
        OR p_snapshot_document_rules IS NULL
    THEN
        RETURN QUERY SELECT 'invalid_invoice_input'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF p_invoice_type NOT IN ('deposit', 'final') THEN
        RETURN QUERY SELECT 'invalid_invoice_input'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF p_due_date < p_invoice_date THEN
        RETURN QUERY SELECT 'invalid_invoice_input'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF jsonb_typeof(p_snapshot_seller) <> 'object'
        OR jsonb_typeof(p_snapshot_buyer) <> 'object'
        OR jsonb_typeof(p_snapshot_quotation) <> 'object'
        OR jsonb_typeof(p_snapshot_bank_details) <> 'object'
        OR jsonb_typeof(p_snapshot_document_rules) <> 'object'
    THEN
        RETURN QUERY SELECT 'invalid_invoice_input'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF p_vat_mode <> 'not_registered' THEN
        RETURN QUERY SELECT
            'vat_registered_invoice_not_implemented_in_this_slice'::text,
            NULL::uuid,
            NULL::text;
        RETURN;
    END IF;

    IF p_invoice_type = 'deposit' THEN
        IF p_requested_amount IS NULL THEN
            RETURN QUERY SELECT 'deposit_amount_required'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;
        -- numeric has no NaN/Infinity in PostgreSQL; reject non-positive and overscale
        IF p_requested_amount <= 0
            OR p_requested_amount <> round(p_requested_amount, 2)
        THEN
            RETURN QUERY SELECT 'invalid_deposit_amount'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;
    ELSIF p_requested_amount IS NOT NULL THEN
        -- Final must not accept a client amount
        RETURN QUERY SELECT 'invalid_invoice_input'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    -- =====================================================================
    -- 2. Lock Service (serialization boundary)
    -- =====================================================================
    SELECT
        s.id,
        s.status,
        s.deleted_at,
        s.customer_id
    INTO
        v_service_id,
        v_service_status,
        v_service_deleted_at,
        v_service_customer_id
    FROM public.services s
    WHERE s.id = p_service_id
    FOR UPDATE;

    IF v_service_id IS NULL THEN
        RETURN QUERY SELECT 'service_lifecycle_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_service_deleted_at IS NOT NULL THEN
        RETURN QUERY SELECT 'service_lifecycle_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_service_customer_id IS NULL THEN
        RETURN QUERY SELECT 'invoice_customer_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_service_status IS NULL OR btrim(v_service_status) = '' THEN
        RETURN QUERY SELECT 'service_lifecycle_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    -- =====================================================================
    -- 3. Lifecycle matrix (while locked)
    -- =====================================================================
    v_deposit_allowed := false;
    v_final_allowed := false;

    IF v_service_status IN ('Inquiry', 'Quoted', 'Approved') THEN
        v_deposit_allowed := true;
        v_final_allowed := true;
    ELSIF v_service_status IN ('Deposit Paid', 'In Progress') THEN
        v_deposit_allowed := false;
        v_final_allowed := true;
    ELSIF v_service_status IN ('Completed', 'Cancelled') THEN
        v_deposit_allowed := false;
        v_final_allowed := false;
    ELSE
        RETURN QUERY SELECT 'service_lifecycle_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF p_invoice_type = 'deposit' AND NOT v_deposit_allowed THEN
        RETURN QUERY SELECT 'service_not_eligible_for_deposit'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF p_invoice_type = 'final' AND NOT v_final_allowed THEN
        RETURN QUERY SELECT 'service_not_eligible_for_final'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    -- =====================================================================
    -- 4. Quotation validation (do not trust client linkage)
    -- =====================================================================
    SELECT
        q.id,
        q.service_id,
        q.customer_id,
        q.status,
        q.is_deleted,
        q.grand_total
    INTO
        v_quotation_id,
        v_quotation_service_id,
        v_quotation_customer_id,
        v_quotation_status,
        v_quotation_is_deleted,
        v_quotation_grand_total
    FROM public.quotations q
    WHERE q.id = p_quotation_id;

    IF v_quotation_id IS NULL OR COALESCE(v_quotation_is_deleted, false) = true THEN
        RETURN QUERY SELECT 'quotation_not_found'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_quotation_status IS DISTINCT FROM 'approved' THEN
        RETURN QUERY SELECT 'quotation_not_approved'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_quotation_service_id IS DISTINCT FROM p_service_id THEN
        RETURN QUERY SELECT 'quotation_service_mismatch'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_quotation_customer_id IS NULL THEN
        RETURN QUERY SELECT 'invoice_customer_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_quotation_customer_id IS DISTINCT FROM v_service_customer_id THEN
        RETURN QUERY SELECT 'quotation_service_mismatch'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_quotation_grand_total IS NULL
        OR v_quotation_grand_total < 0
        OR v_quotation_grand_total <> round(v_quotation_grand_total, 2)
    THEN
        RETURN QUERY SELECT 'billing_scope_authority_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    -- =====================================================================
    -- 5. ABS history + active authority (positive proof; Draft counts as history)
    -- =====================================================================
    SELECT count(*)::bigint
    INTO v_abs_history_count
    FROM public.approved_billing_scopes abs_h
    WHERE abs_h.service_id = p_service_id;

    SELECT count(*)::bigint
    INTO v_active_count
    FROM public.approved_billing_scopes abs_a
    WHERE abs_a.service_id = p_service_id
      AND abs_a.status = 'approved'
      AND abs_a.voided_at IS NULL
      AND abs_a.superseded_at IS NULL;

    IF v_active_count > 1 THEN
        RETURN QUERY SELECT 'billing_scope_authority_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    v_active_scope_id := NULL;
    v_active_scope_ceiling := NULL;
    v_billing_scope_id := NULL;
    v_ceiling := NULL;

    IF v_active_count = 1 THEN
        SELECT
            abs_a.id,
            abs_a.accepted_grand_total
        INTO
            v_active_scope_id,
            v_active_scope_ceiling
        FROM public.approved_billing_scopes abs_a
        WHERE abs_a.service_id = p_service_id
          AND abs_a.status = 'approved'
          AND abs_a.voided_at IS NULL
          AND abs_a.superseded_at IS NULL;

        IF v_active_scope_id IS NULL
            OR v_active_scope_ceiling IS NULL
            OR v_active_scope_ceiling < 0
            OR v_active_scope_ceiling <> round(v_active_scope_ceiling, 2)
        THEN
            RETURN QUERY SELECT 'billing_scope_authority_unavailable'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;

        -- Contradiction: active ABS with zero history evidence
        IF v_abs_history_count = 0 THEN
            RETURN QUERY SELECT 'billing_scope_authority_unavailable'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;

        -- active_abs
        v_ceiling := v_active_scope_ceiling;
        v_billing_scope_id := v_active_scope_id;

    ELSIF v_abs_history_count > 0 THEN
        -- historical_abs_only (any Draft/Approved/Voided/Superseded/etc.)
        RETURN QUERY SELECT 'billing_scope_inactive'::text, NULL::uuid, NULL::text;
        RETURN;

    ELSE
        -- exact zero ABS history → legacy Quotation (already validated above)
        v_ceiling := v_quotation_grand_total;
        v_billing_scope_id := NULL;
    END IF;

    -- =====================================================================
    -- 6. Service-lifetime exposure (aligned with _abs_get_service_invoice_exposure)
    -- =====================================================================
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
              OR i.grand_total <> round(i.grand_total, 2)
          )
    ) THEN
        RETURN QUERY SELECT 'invoice_exposure_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    SELECT COALESCE(sum(i.grand_total), 0)::numeric(12, 2)
    INTO v_exposure
    FROM public.invoices i
    WHERE i.service_id = p_service_id
      AND i.status NOT IN ('cancelled', 'voided')
      AND i.voided_at IS NULL
      AND COALESCE(i.is_deleted, false) = false;

    IF v_exposure IS NULL OR v_exposure < 0 THEN
        RETURN QUERY SELECT 'invoice_exposure_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    v_remaining := round(v_ceiling - v_exposure, 2);

    IF v_remaining < 0 THEN
        IF v_billing_scope_id IS NOT NULL THEN
            RETURN QUERY SELECT
                'prior_invoices_exceed_billing_scope_ceiling'::text,
                NULL::uuid,
                NULL::text;
        ELSE
            RETURN QUERY SELECT
                'prior_invoices_exceed_quotation_total'::text,
                NULL::uuid,
                NULL::text;
        END IF;
        RETURN;
    END IF;

    -- =====================================================================
    -- 7–8. Deposit / Final business guards
    -- =====================================================================
    IF p_invoice_type = 'deposit' THEN
        IF p_requested_amount > v_remaining THEN
            RETURN QUERY SELECT 'deposit_amount_exceeds_remaining'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;

        v_invoice_amount := round(p_requested_amount, 2);

        SELECT i.id
        INTO v_existing_id
        FROM public.invoices i
        WHERE i.service_id = p_service_id
          AND i.invoice_type = 'deposit'
          AND i.status NOT IN ('voided', 'cancelled')
          AND i.voided_at IS NULL
          AND COALESCE(i.is_deleted, false) = false
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            RETURN QUERY SELECT 'deposit_invoice_already_exists'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;

    ELSE
        -- Final: amount = remaining; remaining must be > 0
        IF v_remaining <= 0 THEN
            IF v_billing_scope_id IS NOT NULL THEN
                RETURN QUERY SELECT
                    'prior_invoices_exceed_billing_scope_ceiling'::text,
                    NULL::uuid,
                    NULL::text;
            ELSE
                RETURN QUERY SELECT
                    'prior_invoices_exceed_quotation_total'::text,
                    NULL::uuid,
                    NULL::text;
            END IF;
            RETURN;
        END IF;

        v_invoice_amount := v_remaining;

        SELECT i.id
        INTO v_existing_id
        FROM public.invoices i
        WHERE i.service_id = p_service_id
          AND i.invoice_type = 'final'
          AND i.status NOT IN ('voided', 'cancelled')
          AND i.voided_at IS NULL
          AND COALESCE(i.is_deleted, false) = false
        LIMIT 1;

        IF v_existing_id IS NOT NULL THEN
            RETURN QUERY SELECT 'final_invoice_already_exists'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;
    END IF;

    -- =====================================================================
    -- 9. Invoice number (after business gates)
    -- =====================================================================
    BEGIN
        v_invoice_number := public.generate_document_number('invoice');
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT 'invoice_number_unavailable'::text, NULL::uuid, NULL::text;
            RETURN;
    END;

    IF v_invoice_number IS NULL OR btrim(v_invoice_number) = '' THEN
        RETURN QUERY SELECT 'invoice_number_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    -- =====================================================================
    -- Snapshot (store app-built JSON; enrich Final settlement with RPC numbers)
    -- =====================================================================
    v_snapshot_quotation := p_snapshot_quotation;

    IF p_invoice_type = 'final' THEN
        v_snapshot_quotation := jsonb_set(
            COALESCE(p_snapshot_quotation, '{}'::jsonb),
            '{final_invoice_settlement}',
            jsonb_build_object(
                'method', 'SERVICE_LIFETIME_EXPOSURE',
                'approved_quotation_total', v_quotation_grand_total,
                'approved_billing_scope_total', v_active_scope_ceiling,
                'billing_ceiling', v_ceiling,
                'service_lifetime_exposure', v_exposure,
                'final_invoice_amount', v_invoice_amount,
                'payments_excluded', true,
                'invoice_prepayment_applications_used', false
            ),
            true
        );
    END IF;

    -- =====================================================================
    -- 10. Insert exactly one Invoice
    -- =====================================================================
    BEGIN
        INSERT INTO public.invoices (
            invoice_number,
            customer_id,
            approved_quotation_id,
            approved_billing_scope_id,
            service_id,
            date,
            due_date,
            invoice_type,
            status,
            subtotal,
            vat_rate,
            vat_amount,
            grand_total,
            amount_paid,
            balance_due,
            document_label,
            vat_mode,
            snapshot_seller,
            snapshot_buyer,
            snapshot_quotation,
            snapshot_bank_details,
            snapshot_document_rules,
            issued_at,
            is_deleted,
            voided_at,
            created_by,
            updated_by
        ) VALUES (
            v_invoice_number,
            v_quotation_customer_id,
            p_quotation_id,
            v_billing_scope_id,
            p_service_id,
            p_invoice_date,
            p_due_date,
            p_invoice_type,
            'draft',
            v_invoice_amount,
            0,
            0,
            v_invoice_amount,
            0,
            v_invoice_amount,
            p_document_label,
            p_vat_mode,
            p_snapshot_seller,
            p_snapshot_buyer,
            v_snapshot_quotation,
            p_snapshot_bank_details,
            p_snapshot_document_rules,
            NULL,
            false,
            NULL,
            p_actor_clerk_user_id,
            p_actor_clerk_user_id
        )
        RETURNING id INTO v_new_invoice_id;
    EXCEPTION
        WHEN unique_violation THEN
            GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
            IF v_constraint_name = 'uq_invoices_one_active_deposit_per_service' THEN
                RETURN QUERY SELECT 'deposit_invoice_already_exists'::text, NULL::uuid, NULL::text;
                RETURN;
            END IF;
            RETURN QUERY SELECT 'invoice_insert_failed'::text, NULL::uuid, NULL::text;
            RETURN;
        WHEN OTHERS THEN
            -- Map known trigger messages without leaking raw detail to callers
            IF SQLERRM ILIKE '%exceeds active billing scope ceiling%' THEN
                RETURN QUERY SELECT 'invoice_amount_exceeds_ceiling'::text, NULL::uuid, NULL::text;
                RETURN;
            END IF;
            IF btrim(SQLERRM) = 'billing_scope_inactive'
                OR SQLERRM ILIKE '%not active or is voided/superseded%'
            THEN
                RETURN QUERY SELECT 'billing_scope_inactive'::text, NULL::uuid, NULL::text;
                RETURN;
            END IF;
            IF SQLERRM ILIKE '%must match invoice service_id%' THEN
                RETURN QUERY SELECT 'billing_scope_service_mismatch'::text, NULL::uuid, NULL::text;
                RETURN;
            END IF;
            IF SQLERRM ILIKE '%grand_total cannot be null%' THEN
                RETURN QUERY SELECT 'invoice_grand_total_invalid'::text, NULL::uuid, NULL::text;
                RETURN;
            END IF;

            RETURN QUERY SELECT 'invoice_insert_failed'::text, NULL::uuid, NULL::text;
            RETURN;
    END;

    IF v_new_invoice_id IS NULL THEN
        RETURN QUERY SELECT 'invoice_insert_failed'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    -- =====================================================================
    -- 11. Success
    -- =====================================================================
    RETURN QUERY SELECT NULL::text, v_new_invoice_id, v_invoice_number;
    RETURN;
END;
$$;COMMENT ON FUNCTION public.create_invoice_atomic(uuid, uuid, text, numeric, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, date, date) IS 'Atomic Deposit/Final Invoice create for a Service. SECURITY DEFINER; service_role only. App must call requirePermission(invoices:write) before invoke. DEV/DEMO contract. Not production-ready.';
REVOKE ALL ON FUNCTION public.create_invoice_atomic(uuid, uuid, text, numeric, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_invoice_atomic(uuid, uuid, text, numeric, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, date, date) FROM anon;
REVOKE ALL ON FUNCTION public.create_invoice_atomic(uuid, uuid, text, numeric, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, date, date) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_atomic(uuid, uuid, text, numeric, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, date, date) TO service_role;
COMMIT;