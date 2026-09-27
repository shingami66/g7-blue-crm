-- W7B corrective runtime parity migration.
-- Additive only: the historical W7B migration remains unchanged.

CREATE OR REPLACE FUNCTION public.build_active_abs_invoice_snapshot(
    p_scope_id uuid,
    p_quotation_id uuid,
    p_service_id uuid,
    p_invoice_type text,
    p_invoice_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_scope public.approved_billing_scopes%ROWTYPE;
    v_quotation public.quotations%ROWTYPE;
    v_items jsonb;
BEGIN
    IF p_scope_id IS NULL
        OR p_quotation_id IS NULL
        OR p_service_id IS NULL
        OR p_invoice_type NOT IN ('deposit', 'progress', 'final')
        OR p_invoice_amount IS NULL
        OR p_invoice_amount < 0
    THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
    END IF;

    SELECT s.*
    INTO v_scope
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id
      AND s.service_id = p_service_id
      AND s.status = 'approved'
      AND s.voided_at IS NULL
      AND s.superseded_at IS NULL
    FOR UPDATE;

    IF NOT FOUND
        OR v_scope.source_quotation_id IS DISTINCT FROM p_quotation_id
        OR v_scope.accepted_subtotal IS NULL
        OR v_scope.accepted_vat_amount IS NULL
        OR v_scope.accepted_grand_total IS NULL
        OR v_scope.accepted_subtotal < 0
        OR v_scope.accepted_vat_amount < 0
        OR v_scope.accepted_grand_total < 0
    THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
    END IF;

    SELECT q.*
    INTO v_quotation
    FROM public.quotations q
    WHERE q.id = p_quotation_id
      AND q.service_id = p_service_id
      AND q.status = 'approved'
      AND q.superseded_at IS NULL
      AND COALESCE(q.is_deleted, false) = false
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
    END IF;

    IF p_invoice_type = 'progress' THEN
        v_items := jsonb_build_array(
            jsonb_build_object(
                'description', 'Progress Payment',
                'details', format(
                    'For services related to Quotation %s',
                    v_quotation.quotation_number
                ),
                'qty', 1,
                'unit_price', p_invoice_amount,
                'vat', 0,
                'total', p_invoice_amount
            )
        );
    ELSE
        IF EXISTS (
            SELECT 1
            FROM public.approved_billing_scope_items i
            WHERE i.approved_billing_scope_id = v_scope.id
              AND i.decision IN ('accepted', 'adjusted')
              AND (
                  i.accepted_qty IS NULL
                  OR i.accepted_qty <= 0
                  OR i.accepted_unit_price IS NULL
                  OR i.accepted_unit_price < 0
                  OR i.accepted_subtotal IS NULL
                  OR i.accepted_vat_amount IS NULL
                  OR i.accepted_grand_total IS NULL
              )
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
        END IF;

        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'description', i.source_description,
                    'details', i.source_details,
                    'qty', i.accepted_qty,
                    'unit_price', i.accepted_unit_price,
                    'vat', i.accepted_vat_amount,
                    'total', i.accepted_grand_total
                )
                ORDER BY i.display_order, i.id
            ) FILTER (WHERE i.decision IN ('accepted', 'adjusted')),
            '[]'::jsonb
        )
        INTO v_items
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = v_scope.id;

        IF jsonb_array_length(v_items) = 0 THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'quotation_id', v_quotation.id,
        'quotation_number', v_quotation.quotation_number,
        'service_id', v_quotation.service_id,
        'customer_id', v_quotation.customer_id,
        'items', v_items,
        'subtotal', CASE
            WHEN p_invoice_type = 'progress'
            THEN p_invoice_amount
            ELSE v_scope.accepted_subtotal
        END,
        'discount', CASE
            WHEN p_invoice_type = 'progress'
            THEN 0
            ELSE COALESCE(v_scope.source_discount, 0)
        END,
        'vat_rate', COALESCE(v_scope.source_vat_rate, 0),
        'vat_amount', CASE
            WHEN p_invoice_type = 'progress'
            THEN 0
            ELSE v_scope.accepted_vat_amount
        END,
        'grand_total', CASE
            WHEN p_invoice_type = 'progress'
            THEN p_invoice_amount
            ELSE v_scope.accepted_grand_total
        END,
        'currency', COALESCE(v_scope.source_currency, 'SAR'),
        'status', v_quotation.status,
        'created_at', v_quotation.created_at,
        'updated_at', v_quotation.updated_at,
        'approvedBillingScopeId', v_scope.id,
        'approvedBillingScopeAcceptedGrandTotal', v_scope.accepted_grand_total,
        'sourceQuotationId', v_scope.source_quotation_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_invoices_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_exists boolean;
    v_authoritative_service_id uuid;
    v_active_scope_id uuid;
    v_active_scope_ceiling numeric(12,2);
    v_other_invoice_total numeric;
    v_candidate_total numeric;
    v_old_is_applicable boolean;
    v_new_is_applicable boolean;
    v_snapshot jsonb;
    v_quotation_grand_total numeric(12,2);
    v_prior_exposure numeric(12,2);
    v_mutation_key text;
BEGIN
    IF TG_OP = 'UPDATE' AND (
        OLD.service_id IS DISTINCT FROM NEW.service_id
        OR OLD.approved_quotation_id IS DISTINCT FROM NEW.approved_quotation_id
        OR OLD.approved_billing_scope_id IS DISTINCT FROM NEW.approved_billing_scope_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice authoritative Service, quotation, and billing scope links are immutable';
    END IF;

    IF TG_OP = 'UPDATE' AND (
        OLD.mutation_key IS DISTINCT FROM NEW.mutation_key
        OR OLD.mutation_payload IS DISTINCT FROM NEW.mutation_payload
        OR OLD.invoice_type IS DISTINCT FROM NEW.invoice_type
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice mutation identity and classification are immutable after creation';
    END IF;

    IF TG_OP = 'UPDATE' AND (
        OLD.invoice_number IS DISTINCT FROM NEW.invoice_number
        OR OLD.customer_id IS DISTINCT FROM NEW.customer_id
        OR OLD.date IS DISTINCT FROM NEW.date
        OR OLD.vat_mode IS DISTINCT FROM NEW.vat_mode
        OR OLD.vat_rate IS DISTINCT FROM NEW.vat_rate
        OR OLD.snapshot_seller IS DISTINCT FROM NEW.snapshot_seller
        OR OLD.snapshot_buyer IS DISTINCT FROM NEW.snapshot_buyer
        OR OLD.snapshot_bank_details IS DISTINCT FROM NEW.snapshot_bank_details
        OR OLD.snapshot_document_rules IS DISTINCT FROM NEW.snapshot_document_rules
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice identity, authority, and document snapshots are immutable after creation';
    END IF;

    IF TG_OP = 'UPDATE'
        AND OLD.snapshot_quotation IS DISTINCT FROM NEW.snapshot_quotation
        AND (
            OLD.status IS DISTINCT FROM 'draft'
            OR NEW.status IS DISTINCT FROM 'draft'
            OR OLD.invoice_type IS DISTINCT FROM 'progress'
            OR NEW.invoice_type IS DISTINCT FROM 'progress'
            OR current_setting('app.w7b_progress_snapshot_update', true) IS DISTINCT FROM 'true'
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice quotation snapshot updates require the governed correction RPC';
    END IF;

    IF TG_OP = 'UPDATE'
        AND (
            OLD.status IS DISTINCT FROM 'draft'
            OR NEW.status IS DISTINCT FROM 'draft'
            OR OLD.invoice_type IS DISTINCT FROM 'progress'
            OR NEW.invoice_type IS DISTINCT FROM 'progress'
            OR current_setting('app.w7b_progress_draft_update', true) IS DISTINCT FROM 'true'
        )
        AND (
            OLD.due_date IS DISTINCT FROM NEW.due_date
            OR OLD.subtotal IS DISTINCT FROM NEW.subtotal
            OR OLD.vat_amount IS DISTINCT FROM NEW.vat_amount
            OR OLD.grand_total IS DISTINCT FROM NEW.grand_total
            OR OLD.document_label IS DISTINCT FROM NEW.document_label
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice financial totals and document fields are immutable after issue';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        v_old_is_applicable := OLD.status NOT IN ('cancelled', 'voided')
            AND OLD.voided_at IS NULL
            AND COALESCE(OLD.is_deleted, false) = false;
        v_new_is_applicable := NEW.status NOT IN ('cancelled', 'voided')
            AND NEW.voided_at IS NULL
            AND COALESCE(NEW.is_deleted, false) = false;

        IF v_old_is_applicable IS NOT TRUE AND v_new_is_applicable IS TRUE THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_exposure_reactivation_requires_service_rpc';
        END IF;

        IF OLD.due_date IS DISTINCT FROM NEW.due_date
            OR OLD.subtotal IS DISTINCT FROM NEW.subtotal
            OR OLD.vat_amount IS DISTINCT FROM NEW.vat_amount
            OR OLD.grand_total IS DISTINCT FROM NEW.grand_total
            OR OLD.document_label IS DISTINCT FROM NEW.document_label
        THEN
            v_mutation_key := current_setting('app.w7b_progress_draft_mutation_key', true);
            IF v_mutation_key IS NULL OR btrim(v_mutation_key) = '' OR NOT EXISTS (
                SELECT 1
                FROM public.invoice_draft_update_mutations m
                WHERE m.invoice_id = NEW.id
                  AND m.mutation_key = v_mutation_key
                  AND m.requested_amount IS NOT DISTINCT FROM round(NEW.grand_total, 2)
                  AND m.due_date IS NOT DISTINCT FROM NEW.due_date
                  AND m.created_at = transaction_timestamp()
            ) THEN
                RAISE EXCEPTION USING MESSAGE = 'invoice progress draft updates require the governed correction RPC';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    v_authoritative_service_id := NEW.service_id;
    IF v_authoritative_service_id IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice service_id is required';
    END IF;

    SELECT true
    INTO v_service_exists
    FROM public.services s
    WHERE s.id = v_authoritative_service_id
      AND s.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice Service not found';
    END IF;

    SELECT s.id, s.accepted_grand_total
    INTO v_active_scope_id, v_active_scope_ceiling
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_authoritative_service_id
      AND s.status = 'approved'
      AND s.superseded_at IS NULL
      AND s.voided_at IS NULL;

    IF v_active_scope_id IS NOT NULL THEN
        IF NEW.approved_billing_scope_id IS DISTINCT FROM v_active_scope_id THEN
            RAISE EXCEPTION USING MESSAGE = 'referenced billing scope is not active or is voided/superseded';
        END IF;
    ELSIF public._abs_service_has_historical_authority(v_authoritative_service_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'billing_scope_inactive';
    ELSIF NEW.approved_billing_scope_id IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'referenced billing scope is not active or is voided/superseded';
    END IF;

    IF v_active_scope_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM public.invoices i
            WHERE i.service_id = v_authoritative_service_id
              AND i.id IS DISTINCT FROM NEW.id
              AND i.status NOT IN ('cancelled', 'voided')
              AND i.voided_at IS NULL
              AND COALESCE(i.is_deleted, false) = false
              AND i.grand_total IS NULL
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice grand_total cannot be null for applicable Service exposure';
        END IF;

        SELECT COALESCE(sum(i.grand_total), 0)
        INTO v_other_invoice_total
        FROM public.invoices i
        WHERE i.service_id = v_authoritative_service_id
          AND i.id IS DISTINCT FROM NEW.id
          AND i.status NOT IN ('cancelled', 'voided')
          AND i.voided_at IS NULL
          AND COALESCE(i.is_deleted, false) = false;

        v_candidate_total := v_other_invoice_total;
        IF NEW.status NOT IN ('cancelled', 'voided')
            AND NEW.voided_at IS NULL
            AND COALESCE(NEW.is_deleted, false) = false
        THEN
            IF NEW.grand_total IS NULL THEN
                RAISE EXCEPTION USING MESSAGE = 'invoice grand_total cannot be null when Service has an active billing scope';
            END IF;
            v_candidate_total := v_candidate_total + NEW.grand_total;
        END IF;

        IF v_candidate_total > v_active_scope_ceiling THEN
            RAISE EXCEPTION 'invoice total (%) exceeds active billing scope ceiling (%) for Service %',
                v_candidate_total, v_active_scope_ceiling, NEW.service_id;
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF v_active_scope_id IS NOT NULL THEN
            v_snapshot := public.build_active_abs_invoice_snapshot(
                v_active_scope_id,
                NEW.approved_quotation_id,
                NEW.service_id,
                NEW.invoice_type,
                NEW.grand_total
            );

            IF NEW.invoice_type = 'deposit' THEN
                v_snapshot := jsonb_set(
                    v_snapshot,
                    '{deposit_invoice_settlement}',
                    jsonb_build_object(
                        'method', 'ACTIVE_BILLING_SCOPE',
                        'authority_mode', 'approved_billing_scope',
                        'approved_billing_scope_id', v_active_scope_id,
                        'approved_billing_scope_total', v_active_scope_ceiling,
                        'deposit_invoice_amount', NEW.grand_total,
                        'invoice_amount_due', NEW.grand_total,
                        'payments_excluded', true
                    ),
                    true
                );
            ELSIF NEW.invoice_type = 'final' THEN
                SELECT q.grand_total, s.accepted_grand_total
                INTO v_quotation_grand_total, v_active_scope_ceiling
                FROM public.quotations q
                JOIN public.approved_billing_scopes s ON s.id = v_active_scope_id
                WHERE q.id = NEW.approved_quotation_id
                  AND q.service_id = NEW.service_id
                  AND s.service_id = NEW.service_id
                  AND s.status = 'approved'
                  AND s.voided_at IS NULL
                  AND s.superseded_at IS NULL;

                SELECT COALESCE(SUM(i.grand_total), 0)::numeric(12, 2)
                INTO v_prior_exposure
                FROM public.invoices i
                WHERE i.service_id = NEW.service_id
                  AND i.id IS DISTINCT FROM NEW.id
                  AND i.status NOT IN ('cancelled', 'voided')
                  AND i.voided_at IS NULL
                  AND COALESCE(i.is_deleted, false) = false;

                IF v_quotation_grand_total IS NULL OR v_active_scope_ceiling IS NULL OR v_prior_exposure IS NULL THEN
                    RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
                END IF;

                v_snapshot := jsonb_set(
                    v_snapshot,
                    '{final_invoice_settlement}',
                    jsonb_build_object(
                        'method', 'SERVICE_LIFETIME_EXPOSURE',
                        'approved_quotation_total', v_quotation_grand_total,
                        'approved_billing_scope_total', v_active_scope_ceiling,
                        'billing_ceiling', v_active_scope_ceiling,
                        'service_lifetime_exposure', v_prior_exposure,
                        'final_invoice_amount', NEW.grand_total,
                        'payments_excluded', true,
                        'invoice_prepayment_applications_used', false
                    ),
                    true
                );
            END IF;
            NEW.snapshot_quotation := v_snapshot;
        ELSE
            NEW.snapshot_quotation := jsonb_set(
                COALESCE(NEW.snapshot_quotation, '{}'::jsonb)
                    - ARRAY['approvedBillingScopeId', 'approvedBillingScopeAcceptedGrandTotal', 'sourceQuotationId'],
                '{invoiceAuthorityMode}',
                '"legacy_quotation"'::jsonb,
                true
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_flexible_invoice_atomic(
    p_service_id uuid,
    p_quotation_id uuid,
    p_requested_amount numeric,
    p_actor_clerk_user_id text,
    p_document_label text,
    p_vat_mode text,
    p_snapshot_seller jsonb,
    p_snapshot_buyer jsonb,
    p_snapshot_quotation jsonb,
    p_snapshot_bank_details jsonb,
    p_snapshot_document_rules jsonb,
    p_mutation_key text,
    p_invoice_date date DEFAULT CURRENT_DATE,
    p_due_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (error_code text, invoice_id uuid, invoice_number text, is_replayed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_key text := btrim(COALESCE(p_mutation_key, ''));
    v_payload jsonb;
    v_existing record;
    v_service record;
    v_quotation record;
    v_active_scope record;
    v_active_count bigint;
    v_abs_history_count bigint;
    v_ceiling numeric(12,2);
    v_scope_id uuid;
    v_exposure numeric(12,2);
    v_remaining numeric(12,2);
    v_invoice_number text;
    v_invoice_id uuid;
    v_now timestamptz;
    v_error_message text;
BEGIN
    IF v_key = '' OR p_service_id IS NULL OR p_quotation_id IS NULL
        OR p_actor_clerk_user_id IS NULL OR btrim(p_actor_clerk_user_id) = ''
        OR p_document_label IS NULL OR btrim(p_document_label) = ''
        OR p_vat_mode IS DISTINCT FROM 'not_registered'
        OR p_requested_amount IS NULL OR p_requested_amount <= 0
        OR p_requested_amount <> round(p_requested_amount, 2)
        OR p_invoice_date IS NULL OR p_due_date IS NULL OR p_due_date < p_invoice_date
        OR jsonb_typeof(p_snapshot_seller) IS DISTINCT FROM 'object'
        OR jsonb_typeof(p_snapshot_buyer) IS DISTINCT FROM 'object'
        OR jsonb_typeof(p_snapshot_quotation) IS DISTINCT FROM 'object'
        OR jsonb_typeof(p_snapshot_bank_details) IS DISTINCT FROM 'object'
        OR jsonb_typeof(p_snapshot_document_rules) IS DISTINCT FROM 'object'
    THEN
        RETURN QUERY SELECT 'invalid_invoice_input'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    v_payload := public._canonical_invoice_create_mutation(
        p_service_id, p_quotation_id, 'progress', p_requested_amount
    );

    PERFORM pg_advisory_xact_lock(hashtext('invoice_mutation_key:' || v_key));
    SELECT i.id, i.invoice_number, i.mutation_payload
    INTO v_existing
    FROM public.invoices i
    WHERE i.mutation_key = v_key
    LIMIT 1;

    IF FOUND THEN
        IF v_existing.mutation_payload = v_payload THEN
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.invoice_number, true;
        ELSE
            RETURN QUERY SELECT 'mutation_key_conflict'::text, NULL::uuid, NULL::text, false;
        END IF;
        RETURN;
    END IF;

    SELECT s.id, s.status, s.deleted_at, s.customer_id
    INTO v_service
    FROM public.services s
    WHERE s.id = p_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_lifecycle_unavailable'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;
    IF v_service.deleted_at IS NOT NULL OR v_service.customer_id IS NULL THEN
        RETURN QUERY SELECT 'service_lifecycle_unavailable'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF v_service.status NOT IN ('Inquiry', 'Quoted', 'Approved', 'Deposit Paid', 'In Progress') THEN
        RETURN QUERY SELECT 'service_not_eligible_for_flexible'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    SELECT q.id, q.service_id, q.customer_id, q.status, q.is_deleted,
           q.superseded_at, q.grand_total
    INTO v_quotation
    FROM public.quotations q
    WHERE q.id = p_quotation_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'quotation_not_found'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;
    IF COALESCE(v_quotation.is_deleted, false) THEN
        RETURN QUERY SELECT 'quotation_not_found'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;
    IF v_quotation.superseded_at IS NOT NULL THEN
        RETURN QUERY SELECT 'billing_scope_inactive'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;
    IF v_quotation.status IS DISTINCT FROM 'approved' THEN
        RETURN QUERY SELECT 'quotation_not_approved'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;
    IF v_quotation.service_id IS DISTINCT FROM p_service_id
        OR v_quotation.customer_id IS DISTINCT FROM v_service.customer_id
    THEN
        RETURN QUERY SELECT 'quotation_service_mismatch'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;
    IF v_quotation.grand_total IS NULL OR v_quotation.grand_total < 0
        OR v_quotation.grand_total <> round(v_quotation.grand_total, 2)
    THEN
        RETURN QUERY SELECT 'billing_scope_authority_unavailable'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    SELECT count(*)::bigint INTO v_abs_history_count
    FROM public.approved_billing_scopes s WHERE s.service_id = p_service_id;
    SELECT count(*)::bigint INTO v_active_count
    FROM public.approved_billing_scopes s
    WHERE s.service_id = p_service_id AND s.status = 'approved'
      AND s.voided_at IS NULL AND s.superseded_at IS NULL;

    IF v_active_count > 1 THEN
        RETURN QUERY SELECT 'billing_scope_authority_unavailable'::text, NULL::uuid, NULL::text, false;
        RETURN;
    ELSIF v_active_count = 1 THEN
        SELECT s.id, s.accepted_grand_total INTO v_active_scope
        FROM public.approved_billing_scopes s
        WHERE s.service_id = p_service_id AND s.status = 'approved'
          AND s.voided_at IS NULL AND s.superseded_at IS NULL;
        IF v_active_scope.id IS NULL OR v_active_scope.accepted_grand_total IS NULL
            OR v_active_scope.accepted_grand_total < 0
            OR v_active_scope.accepted_grand_total <> round(v_active_scope.accepted_grand_total, 2)
            OR v_abs_history_count = 0
        THEN
            RETURN QUERY SELECT 'billing_scope_authority_unavailable'::text, NULL::uuid, NULL::text, false;
            RETURN;
        END IF;
        v_scope_id := v_active_scope.id;
        v_ceiling := v_active_scope.accepted_grand_total;
    ELSIF v_abs_history_count > 0 THEN
        RETURN QUERY SELECT 'billing_scope_inactive'::text, NULL::uuid, NULL::text, false;
        RETURN;
    ELSE
        v_scope_id := NULL;
        v_ceiling := v_quotation.grand_total;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.service_id = p_service_id
          AND i.status NOT IN ('cancelled', 'voided')
          AND i.voided_at IS NULL AND COALESCE(i.is_deleted, false) = false
          AND (i.grand_total IS NULL OR i.grand_total < 0 OR i.grand_total <> round(i.grand_total, 2))
    ) THEN
        RETURN QUERY SELECT 'invoice_exposure_unavailable'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    SELECT COALESCE(sum(i.grand_total), 0)::numeric(12,2) INTO v_exposure
    FROM public.invoices i
    WHERE i.service_id = p_service_id
      AND i.status NOT IN ('cancelled', 'voided')
      AND i.voided_at IS NULL AND COALESCE(i.is_deleted, false) = false;
    v_remaining := round(v_ceiling - v_exposure, 2);
    IF v_remaining < 0 OR p_requested_amount > v_remaining THEN
        RETURN QUERY SELECT 'invoice_amount_exceeds_remaining'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    BEGIN
        v_invoice_number := public.generate_document_number('invoice');
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invoice_number_unavailable'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END;
    IF v_invoice_number IS NULL OR btrim(v_invoice_number) = '' THEN
        RETURN QUERY SELECT 'invoice_number_unavailable'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    BEGIN
        INSERT INTO public.invoices (
            invoice_number, customer_id, approved_quotation_id, approved_billing_scope_id,
            service_id, date, due_date, invoice_type, status, subtotal, vat_rate, vat_amount,
            grand_total, amount_paid, balance_due, document_label, vat_mode, snapshot_seller,
            snapshot_buyer, snapshot_quotation, snapshot_bank_details, snapshot_document_rules,
            issued_at, is_deleted, voided_at, created_by, updated_by, mutation_key, mutation_payload
        ) VALUES (
            v_invoice_number, v_service.customer_id, p_quotation_id, v_scope_id,
            p_service_id, p_invoice_date, p_due_date, 'progress', 'draft',
            round(p_requested_amount, 2), 0, 0, round(p_requested_amount, 2), 0,
            round(p_requested_amount, 2), p_document_label, p_vat_mode, p_snapshot_seller,
            p_snapshot_buyer, p_snapshot_quotation, p_snapshot_bank_details,
            p_snapshot_document_rules, NULL, false, NULL, p_actor_clerk_user_id,
            p_actor_clerk_user_id, v_key, v_payload
        ) RETURNING id INTO v_invoice_id;
    EXCEPTION
        WHEN unique_violation THEN
            RETURN QUERY SELECT 'mutation_key_conflict'::text, NULL::uuid, NULL::text, false;
            RETURN;
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message ILIKE '%exceeds active billing scope ceiling%' THEN
                RETURN QUERY SELECT 'invoice_amount_exceeds_remaining'::text, NULL::uuid, NULL::text, false;
            ELSIF v_error_message = 'billing_scope_inactive' THEN
                RETURN QUERY SELECT 'billing_scope_inactive'::text, NULL::uuid, NULL::text, false;
            ELSE
                RETURN QUERY SELECT 'invoice_insert_failed'::text, NULL::uuid, NULL::text, false;
            END IF;
            RETURN;
    END;

    IF v_invoice_id IS NULL THEN
        RETURN QUERY SELECT 'invoice_insert_failed'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    v_now := transaction_timestamp();
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'invoice', v_invoice_id, p_actor_clerk_user_id,
        jsonb_build_object(
            'event_type', 'invoice.created', 'actor_id', p_actor_clerk_user_id,
            'invoice_id', v_invoice_id, 'invoice_number', v_invoice_number,
            'service_id', p_service_id, 'customer_id', v_service.customer_id,
            'approved_billing_scope_id', v_scope_id, 'invoice_type', 'progress',
            'old_state', NULL, 'new_state', 'draft', 'transaction_timestamp', v_now
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_invoice_id, v_invoice_number, false;
END;
$$;

DROP FUNCTION IF EXISTS public.update_draft_flexible_invoice_atomic(uuid, numeric, date, text);

CREATE OR REPLACE FUNCTION public.update_draft_flexible_invoice_atomic(
    p_invoice_id uuid,
    p_requested_amount numeric,
    p_due_date date,
    p_actor_clerk_user_id text,
    p_mutation_key text
)
RETURNS TABLE (error_code text, invoice_id uuid, invoice_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_invoice record;
    v_invoice_service_id uuid;
    v_service record;
    v_scope record;
    v_abs_history_count bigint;
    v_active_count bigint;
    v_ceiling numeric(12,2);
    v_exposure numeric(12,2);
    v_existing record;
    v_snapshot jsonb;
    v_old_grand_total numeric(12,2);
    v_old_due_date date;
BEGIN
    IF p_invoice_id IS NULL OR p_requested_amount IS NULL OR p_requested_amount <= 0
        OR p_requested_amount <> round(p_requested_amount, 2)
        OR p_due_date IS NULL OR p_actor_clerk_user_id IS NULL
        OR btrim(p_actor_clerk_user_id) = ''
        OR p_mutation_key IS NULL OR btrim(p_mutation_key) = ''
    THEN
        RETURN QUERY SELECT 'invalid_invoice_input'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    p_mutation_key := btrim(p_mutation_key);
    PERFORM pg_advisory_xact_lock(
        hashtext('invoice_draft_update:' || p_invoice_id::text || ':' || p_mutation_key)
    );

    SELECT m.* INTO v_existing
    FROM public.invoice_draft_update_mutations m
    WHERE m.invoice_id = p_invoice_id
      AND m.mutation_key = p_mutation_key
    FOR UPDATE;
    IF FOUND THEN
        IF v_existing.requested_amount IS DISTINCT FROM round(p_requested_amount, 2)
            OR v_existing.due_date IS DISTINCT FROM p_due_date
            OR v_existing.created_by IS DISTINCT FROM p_actor_clerk_user_id
        THEN
            RETURN QUERY SELECT 'mutation_key_conflict'::text, NULL::uuid, NULL::text;
        ELSE
            RETURN QUERY SELECT NULL::text, p_invoice_id, v_existing.invoice_number;
        END IF;
        RETURN;
    END IF;

    SELECT i.service_id INTO v_invoice_service_id
    FROM public.invoices i
    WHERE i.id = p_invoice_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    SELECT s.id, s.status, s.deleted_at, s.customer_id INTO v_service
    FROM public.services s WHERE s.id = v_invoice_service_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_lifecycle_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    SELECT i.* INTO v_invoice
    FROM public.invoices i
    WHERE i.id = p_invoice_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;
    v_old_grand_total := v_invoice.grand_total;
    v_old_due_date := v_invoice.due_date;
    IF v_invoice.invoice_type IS DISTINCT FROM 'progress' THEN
        RETURN QUERY SELECT 'draft_invoice_not_supported'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;
    IF v_invoice.status IS DISTINCT FROM 'draft' OR COALESCE(v_invoice.is_deleted, false)
        OR v_invoice.voided_at IS NOT NULL OR COALESCE(v_invoice.amount_paid, 0) <> 0
        OR p_due_date < v_invoice.date
    THEN
        RETURN QUERY SELECT 'invoice_not_draft'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_service.deleted_at IS NOT NULL OR v_service.customer_id IS NULL THEN
        RETURN QUERY SELECT 'service_lifecycle_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;
    IF v_service.customer_id IS DISTINCT FROM v_invoice.customer_id THEN
        RETURN QUERY SELECT 'invoice_customer_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;
    IF v_service.status NOT IN ('Inquiry', 'Quoted', 'Approved', 'Deposit Paid', 'In Progress') THEN
        RETURN QUERY SELECT 'service_not_eligible_for_flexible'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    SELECT count(*)::bigint INTO v_abs_history_count
    FROM public.approved_billing_scopes s WHERE s.service_id = v_invoice.service_id;
    SELECT count(*)::bigint INTO v_active_count
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_invoice.service_id AND s.status = 'approved'
      AND s.voided_at IS NULL AND s.superseded_at IS NULL;
    IF v_active_count > 1 THEN
        RETURN QUERY SELECT 'billing_scope_authority_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    ELSIF v_active_count = 1 THEN
        SELECT s.id, s.accepted_grand_total INTO v_scope
        FROM public.approved_billing_scopes s
        WHERE s.service_id = v_invoice.service_id AND s.status = 'approved'
          AND s.voided_at IS NULL AND s.superseded_at IS NULL;
        IF v_scope.id IS NULL OR v_scope.accepted_grand_total IS NULL
            OR v_scope.accepted_grand_total < 0
            OR v_scope.accepted_grand_total <> round(v_scope.accepted_grand_total, 2)
            OR v_scope.id IS DISTINCT FROM v_invoice.approved_billing_scope_id
            OR v_abs_history_count = 0
        THEN
            RETURN QUERY SELECT 'billing_scope_authority_unavailable'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;
        v_ceiling := v_scope.accepted_grand_total;
    ELSIF v_abs_history_count > 0 THEN
        RETURN QUERY SELECT 'billing_scope_inactive'::text, NULL::uuid, NULL::text;
        RETURN;
    ELSE
        SELECT q.grand_total INTO v_ceiling
        FROM public.quotations q
        WHERE q.id = v_invoice.approved_quotation_id
              AND q.service_id = v_invoice.service_id
              AND q.customer_id = v_invoice.customer_id
              AND q.status = 'approved'
              AND q.superseded_at IS NULL
              AND COALESCE(q.is_deleted, false) = false;
        IF v_ceiling IS NULL OR v_ceiling < 0 OR v_ceiling <> round(v_ceiling, 2) THEN
            RETURN QUERY SELECT 'quotation_not_approved'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.service_id = v_invoice.service_id AND i.id IS DISTINCT FROM v_invoice.id
          AND i.status NOT IN ('cancelled', 'voided') AND i.voided_at IS NULL
          AND COALESCE(i.is_deleted, false) = false
          AND (i.grand_total IS NULL OR i.grand_total < 0 OR i.grand_total <> round(i.grand_total, 2))
    ) THEN
        RETURN QUERY SELECT 'invoice_exposure_unavailable'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    SELECT COALESCE(sum(i.grand_total), 0)::numeric(12,2) INTO v_exposure
    FROM public.invoices i
    WHERE i.service_id = v_invoice.service_id AND i.id IS DISTINCT FROM v_invoice.id
      AND i.status NOT IN ('cancelled', 'voided') AND i.voided_at IS NULL
      AND COALESCE(i.is_deleted, false) = false;
    IF v_exposure IS NULL OR round(v_ceiling - v_exposure, 2) < p_requested_amount THEN
        RETURN QUERY SELECT 'invoice_amount_exceeds_remaining'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    BEGIN
        IF v_invoice.approved_billing_scope_id IS NOT NULL THEN
            v_snapshot := public.build_active_abs_invoice_snapshot(
                v_invoice.approved_billing_scope_id,
                v_invoice.approved_quotation_id,
                v_invoice.service_id,
                'progress',
                round(p_requested_amount, 2)
            );
        ELSE
            v_snapshot := jsonb_set(
                COALESCE(v_invoice.snapshot_quotation, '{}'::jsonb),
                '{items}',
                jsonb_build_array(
                    jsonb_build_object(
                        'description', 'Progress Payment',
                        'details', format(
                            'For services related to Quotation %s',
                            COALESCE(
                                v_invoice.snapshot_quotation ->> 'quotation_number',
                                v_invoice.invoice_number
                            )
                        ),
                        'qty', 1,
                        'unit_price', round(p_requested_amount, 2),
                        'vat', 0,
                        'total', round(p_requested_amount, 2)
                    )
                ),
                true
            );
            v_snapshot := jsonb_set(
                v_snapshot,
                '{subtotal}',
                to_jsonb(round(p_requested_amount, 2)),
                true
            );
            v_snapshot := jsonb_set(v_snapshot, '{discount}', '0'::jsonb, true);
            v_snapshot := jsonb_set(v_snapshot, '{vat_amount}', '0'::jsonb, true);
            v_snapshot := jsonb_set(
                v_snapshot,
                '{grand_total}',
                to_jsonb(round(p_requested_amount, 2)),
                true
            );
        END IF;

        PERFORM set_config('app.w7b_progress_draft_update', 'true', true);
        PERFORM set_config('app.w7b_progress_draft_mutation_key', p_mutation_key, true);
        PERFORM set_config('app.w7b_progress_snapshot_update', 'true', true);

        INSERT INTO public.invoice_draft_update_mutations(
            invoice_id, mutation_key, requested_amount, due_date, invoice_number, created_by
        )
        VALUES (
            p_invoice_id, p_mutation_key, round(p_requested_amount, 2), p_due_date,
            v_invoice.invoice_number, p_actor_clerk_user_id
        );

        UPDATE public.invoices
        SET subtotal = round(p_requested_amount, 2),
            grand_total = round(p_requested_amount, 2),
            balance_due = round(p_requested_amount, 2),
            due_date = p_due_date,
            snapshot_quotation = v_snapshot,
            updated_by = p_actor_clerk_user_id,
            updated_at = now()
        WHERE id = p_invoice_id;

        INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
        VALUES (
            'update', 'invoice', p_invoice_id, p_actor_clerk_user_id,
            jsonb_build_object(
                'event_type', 'invoice.progress_draft_updated',
                'mutation_key', p_mutation_key,
                'invoice_id', p_invoice_id,
                'invoice_number', v_invoice.invoice_number,
                'old_grand_total', v_old_grand_total,
                'new_grand_total', round(p_requested_amount, 2),
                'old_due_date', v_old_due_date,
                'new_due_date', p_due_date
            ),
            transaction_timestamp()
        );
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'draft_update_failed'::text, NULL::uuid, NULL::text;
        RETURN;
    END;

    RETURN QUERY SELECT NULL::text, p_invoice_id, v_invoice.invoice_number;
END;
$$;

REVOKE ALL ON FUNCTION public.create_flexible_invoice_atomic(
    uuid, uuid, numeric, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, text, date, date
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_flexible_invoice_atomic(
    uuid, uuid, numeric, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, text, date, date
) TO service_role;

REVOKE ALL ON FUNCTION public.update_draft_flexible_invoice_atomic(uuid, numeric, date, text, text)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_draft_flexible_invoice_atomic(uuid, numeric, date, text, text)
TO service_role;

COMMENT ON FUNCTION public.create_flexible_invoice_atomic(
    uuid, uuid, numeric, text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, text, date, date
) IS 'Atomic flexible progress invoice create. Uses current billable authority and lifetime applicable exposure.';

COMMENT ON FUNCTION public.update_draft_flexible_invoice_atomic(uuid, numeric, date, text, text)
IS 'Guarded, replay-safe, auditable pre-issue correction for flexible progress invoice amount and due date.';
