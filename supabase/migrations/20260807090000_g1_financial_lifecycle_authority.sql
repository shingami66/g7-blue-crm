-- G1 financial lifecycle authority and invoice snapshot/audit correction.
--
-- This migration is intentionally forward-only and unapplied in this task.
-- Application permission checks remain mandatory before service_role RPC calls.
-- No VAT, ZATCA, accounting, procurement, or broader workflow scope is added.

BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.create_invoice_atomic(uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date)') IS NULL
        OR to_regclass('public.quotations') IS NULL
        OR to_regclass('public.quotation_items') IS NULL
        OR to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regclass('public.approved_billing_scope_items') IS NULL
        OR to_regclass('public.invoices') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'g1_financial_lifecycle_authority_required_schema_missing';
    END IF;
END;
$$;

-- Approved quotations and their authority lines are immutable after approval.
-- The parent row lock is already held by the approval RPC; child mutations take
-- a conflicting share lock so edit/delete/approval races resolve at the boundary.
CREATE OR REPLACE FUNCTION public.prevent_approved_quotation_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'approved' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved_quotation_immutable';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.status = 'approved' THEN
        RAISE EXCEPTION USING MESSAGE = 'approved_quotation_immutable';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_approved_quotation_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_quotation_id uuid;
    v_status text;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_quotation_id := OLD.quotation_id;
    ELSE
        v_quotation_id := NEW.quotation_id;
    END IF;

    SELECT q.status
    INTO v_status
    FROM public.quotations q
    WHERE q.id = v_quotation_id
    FOR SHARE;

    IF v_status = 'approved' THEN
        RAISE EXCEPTION USING MESSAGE = 'approved_quotation_immutable';
    END IF;

    IF TG_OP = 'UPDATE'
        AND OLD.quotation_id IS DISTINCT FROM NEW.quotation_id
    THEN
        SELECT q.status
        INTO v_status
        FROM public.quotations q
        WHERE q.id = OLD.quotation_id
        FOR SHARE;

        IF v_status = 'approved' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved_quotation_immutable';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_approved_quotation_mutation_trg
    ON public.quotations;
CREATE TRIGGER prevent_approved_quotation_mutation_trg
BEFORE UPDATE OR DELETE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approved_quotation_mutation();

DROP TRIGGER IF EXISTS prevent_approved_quotation_item_mutation_trg
    ON public.quotation_items;
CREATE TRIGGER prevent_approved_quotation_item_mutation_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.quotation_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approved_quotation_item_mutation();

REVOKE ALL ON FUNCTION public.prevent_approved_quotation_mutation()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_approved_quotation_item_mutation()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_approved_quotation_mutation()
    TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_approved_quotation_item_mutation()
    TO service_role;

-- Build the invoice quotation snapshot from the active ABS only. The helper is
-- called while create_invoice_atomic still holds the Service serialization lock.
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
    v_partial boolean;
BEGIN
    IF p_scope_id IS NULL
        OR p_quotation_id IS NULL
        OR p_service_id IS NULL
        OR p_invoice_type NOT IN ('deposit', 'final')
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
      AND COALESCE(q.is_deleted, false) = false
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
    END IF;

    v_partial := p_invoice_amount < v_scope.accepted_grand_total;

    IF v_partial THEN
        v_items := jsonb_build_array(
            jsonb_build_object(
                'description', CASE
                    WHEN p_invoice_type = 'deposit' THEN 'Deposit Payment'
                    ELSE 'Final Settlement'
                END,
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
            WHEN v_partial THEN p_invoice_amount
            ELSE v_scope.accepted_subtotal
        END,
        'discount', COALESCE(v_scope.source_discount, 0),
        'vat_rate', COALESCE(v_scope.source_vat_rate, 0),
        'vat_amount', CASE
            WHEN v_partial THEN 0
            ELSE v_scope.accepted_vat_amount
        END,
        'grand_total', CASE
            WHEN v_partial THEN p_invoice_amount
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

REVOKE ALL ON FUNCTION public.build_active_abs_invoice_snapshot(uuid, uuid, uuid, text, numeric)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_active_abs_invoice_snapshot(uuid, uuid, uuid, text, numeric)
    TO service_role;

-- Keep the previously reviewed financial authority implementation as a private
-- legacy body, then wrap its insert in the authoritative snapshot and audit
-- boundary without duplicating or broadening its financial guards.
ALTER FUNCTION public.create_invoice_atomic(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, date, date
) RENAME TO create_invoice_atomic_legacy;

REVOKE ALL ON FUNCTION public.create_invoice_atomic_legacy(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, date, date
) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.create_invoice_atomic(
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
    v_legacy record;
    v_invoice record;
    v_snapshot jsonb;
    v_quotation_total numeric(12, 2);
    v_scope_total numeric(12, 2);
    v_prior_exposure numeric(12, 2);
    v_now timestamptz;
    v_error_message text;
BEGIN
    BEGIN
        SELECT *
        INTO v_legacy
        FROM public.create_invoice_atomic_legacy(
            p_service_id,
            p_quotation_id,
            p_invoice_type,
            p_requested_amount,
            p_actor_clerk_user_id,
            p_document_label,
            p_vat_mode,
            p_snapshot_seller,
            p_snapshot_buyer,
            p_snapshot_quotation,
            p_snapshot_bank_details,
            p_snapshot_document_rules,
            p_invoice_date,
            p_due_date
        );

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'invoice_creation_failed'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;

        IF v_legacy.error_code IS NOT NULL
            OR v_legacy.invoice_id IS NULL
            OR v_legacy.invoice_number IS NULL
        THEN
            RETURN QUERY SELECT
                v_legacy.error_code,
                v_legacy.invoice_id,
                v_legacy.invoice_number;
            RETURN;
        END IF;

        SELECT
            i.id,
            i.service_id,
            i.customer_id,
            i.approved_quotation_id,
            i.approved_billing_scope_id,
            i.invoice_type,
            i.grand_total,
            i.invoice_number
        INTO v_invoice
        FROM public.invoices i
        WHERE i.id = v_legacy.invoice_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_creation_failed';
        END IF;

        IF v_invoice.approved_billing_scope_id IS NOT NULL THEN
            v_snapshot := public.build_active_abs_invoice_snapshot(
                v_invoice.approved_billing_scope_id,
                v_invoice.approved_quotation_id,
                v_invoice.service_id,
                v_invoice.invoice_type,
                v_invoice.grand_total
            );

            IF v_invoice.invoice_type = 'final' THEN
                SELECT
                    q.grand_total,
                    s.accepted_grand_total
                INTO
                    v_quotation_total,
                    v_scope_total
                FROM public.quotations q
                JOIN public.approved_billing_scopes s
                    ON s.id = v_invoice.approved_billing_scope_id
                WHERE q.id = v_invoice.approved_quotation_id
                  AND q.service_id = v_invoice.service_id
                  AND s.service_id = v_invoice.service_id
                  AND s.status = 'approved'
                  AND s.voided_at IS NULL
                  AND s.superseded_at IS NULL;

                SELECT COALESCE(SUM(i.grand_total), 0)::numeric(12, 2)
                INTO v_prior_exposure
                FROM public.invoices i
                WHERE i.service_id = v_invoice.service_id
                  AND i.id <> v_invoice.id
                  AND i.status NOT IN ('cancelled', 'voided')
                  AND i.voided_at IS NULL
                  AND COALESCE(i.is_deleted, false) = false;

                IF v_quotation_total IS NULL
                    OR v_scope_total IS NULL
                    OR v_prior_exposure IS NULL
                THEN
                    RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
                END IF;

                v_snapshot := jsonb_set(
                    v_snapshot,
                    '{final_invoice_settlement}',
                    jsonb_build_object(
                        'method', 'SERVICE_LIFETIME_EXPOSURE',
                        'approved_quotation_total', v_quotation_total,
                        'approved_billing_scope_total', v_scope_total,
                        'billing_ceiling', v_scope_total,
                        'service_lifetime_exposure', v_prior_exposure,
                        'final_invoice_amount', v_invoice.grand_total,
                        'payments_excluded', true,
                        'invoice_prepayment_applications_used', false
                    ),
                    true
                );
            END IF;

        ELSE
            v_snapshot := jsonb_set(
                p_snapshot_quotation
                    - ARRAY[
                        'approvedBillingScopeId',
                        'approvedBillingScopeAcceptedGrandTotal',
                        'sourceQuotationId'
                    ],
                '{invoiceAuthorityMode}',
                '"legacy_quotation"'::jsonb,
                true
            );

            IF v_invoice.invoice_type = 'final' THEN
                SELECT q.grand_total
                INTO v_quotation_total
                FROM public.quotations q
                WHERE q.id = v_invoice.approved_quotation_id
                  AND q.service_id = v_invoice.service_id
                  AND q.status = 'approved'
                  AND COALESCE(q.is_deleted, false) = false;

                SELECT COALESCE(SUM(i.grand_total), 0)::numeric(12, 2)
                INTO v_prior_exposure
                FROM public.invoices i
                WHERE i.service_id = v_invoice.service_id
                  AND i.id <> v_invoice.id
                  AND i.status NOT IN ('cancelled', 'voided')
                  AND i.voided_at IS NULL
                  AND COALESCE(i.is_deleted, false) = false;

                IF v_quotation_total IS NULL OR v_prior_exposure IS NULL THEN
                    RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
                END IF;

                v_snapshot := jsonb_set(
                    v_snapshot,
                    '{final_invoice_settlement}',
                    jsonb_build_object(
                        'method', 'SERVICE_LIFETIME_EXPOSURE',
                        'approved_quotation_total', v_quotation_total,
                        'approved_billing_scope_total', NULL,
                        'billing_ceiling', v_quotation_total,
                        'service_lifetime_exposure', v_prior_exposure,
                        'final_invoice_amount', v_invoice.grand_total,
                        'payments_excluded', true,
                        'invoice_prepayment_applications_used', false
                    ),
                    true
                );
            END IF;
        END IF;

        UPDATE public.invoices
        SET snapshot_quotation = v_snapshot,
            updated_by = p_actor_clerk_user_id
        WHERE id = v_invoice.id;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_snapshot_authority_unavailable';
        END IF;

        v_now := transaction_timestamp();

        INSERT INTO public.audit_logs(
            action,
            entity_type,
            entity_id,
            user_id,
            details,
            timestamp
        )
        VALUES (
            'create',
            'invoice',
            v_invoice.id,
            p_actor_clerk_user_id,
            jsonb_build_object(
                'event_type', 'invoice.created',
                'actor_id', p_actor_clerk_user_id,
                'invoice_id', v_invoice.id,
                'invoice_number', v_invoice.invoice_number,
                'service_id', v_invoice.service_id,
                'customer_id', v_invoice.customer_id,
                'approved_billing_scope_id', v_invoice.approved_billing_scope_id,
                'invoice_type', v_invoice.invoice_type,
                'old_state', NULL,
                'new_state', 'draft',
                'transaction_timestamp', v_now
            ),
            v_now
        );

        RETURN QUERY SELECT
            NULL::text,
            v_invoice.id,
            v_invoice.invoice_number;
        RETURN;
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message = 'invoice_snapshot_authority_unavailable' THEN
                RETURN QUERY SELECT
                    'invoice_snapshot_authority_unavailable'::text,
                    NULL::uuid,
                    NULL::text;
                RETURN;
            END IF;

            RETURN QUERY SELECT 'invoice_creation_failed'::text, NULL::uuid, NULL::text;
            RETURN;
    END;
END;
$$;

COMMENT ON FUNCTION public.create_invoice_atomic(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, date, date
) IS
'Atomic Deposit/Final Invoice create for a Service. SECURITY DEFINER; service_role only. '
'The active Approved Billing Scope is the stored quotation snapshot authority; '
'invoice.created is recorded in the same transaction. DEV/DEMO contract only; not production-ready.';

REVOKE ALL ON FUNCTION public.create_invoice_atomic(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, date, date
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_atomic(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, date, date
) TO service_role;

-- Issue is a single authority transaction: Service lock, invoice lock,
-- conditional draft transition, and durable invoice.issued audit event.
CREATE OR REPLACE FUNCTION public.issue_invoice_atomic(
    p_invoice_id uuid,
    p_actor_clerk_user_id text
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
    v_invoice record;
    v_now timestamptz;
BEGIN
    IF p_invoice_id IS NULL
        OR p_actor_clerk_user_id IS NULL
        OR btrim(p_actor_clerk_user_id) = ''
    THEN
        RETURN QUERY SELECT 'invoice_issue_failed'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    SELECT i.service_id
    INTO v_service_id
    FROM public.invoices i
    WHERE i.id = p_invoice_id;

    IF NOT FOUND OR v_service_id IS NULL THEN
        RETURN QUERY SELECT 'invoice_not_found'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    PERFORM 1
    FROM public.services s
    WHERE s.id = v_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_issue_failed'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    BEGIN
        SELECT
            i.id,
            i.invoice_number,
            i.customer_id,
            i.service_id,
            i.status,
            i.is_deleted
        INTO v_invoice
        FROM public.invoices i
        WHERE i.id = p_invoice_id
        FOR UPDATE;

        IF NOT FOUND OR COALESCE(v_invoice.is_deleted, false) THEN
            RETURN QUERY SELECT 'invoice_not_found'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;

        IF v_invoice.status IS DISTINCT FROM 'draft' THEN
            RETURN QUERY SELECT 'invoice_not_draft'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;

        v_now := transaction_timestamp();

        UPDATE public.invoices i
        SET status = 'sent',
            issued_at = v_now,
            updated_by = p_actor_clerk_user_id
        WHERE i.id = p_invoice_id
          AND i.status = 'draft'
          AND COALESCE(i.is_deleted, false) = false
        RETURNING i.id, i.invoice_number, i.customer_id, i.service_id
        INTO v_invoice;

        IF NOT FOUND THEN
            RETURN QUERY SELECT
                'invoice_issue_concurrency_conflict'::text,
                NULL::uuid,
                NULL::text;
            RETURN;
        END IF;

        INSERT INTO public.audit_logs(
            action,
            entity_type,
            entity_id,
            user_id,
            details,
            timestamp
        )
        VALUES (
            'status_change',
            'invoice',
            v_invoice.id,
            p_actor_clerk_user_id,
            jsonb_build_object(
                'event_type', 'invoice.issued',
                'actor_id', p_actor_clerk_user_id,
                'invoice_id', v_invoice.id,
                'invoice_number', v_invoice.invoice_number,
                'service_id', v_invoice.service_id,
                'customer_id', v_invoice.customer_id,
                'old_state', 'draft',
                'new_state', 'sent',
                'transaction_timestamp', v_now
            ),
            v_now
        );

        RETURN QUERY SELECT NULL::text, v_invoice.id, v_invoice.invoice_number;
        RETURN;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT 'invoice_issue_failed'::text, NULL::uuid, NULL::text;
            RETURN;
    END;
END;
$$;

COMMENT ON FUNCTION public.issue_invoice_atomic(uuid, text) IS
'Atomic draft-to-sent Invoice issue with durable invoice.issued audit event; service_role only. DEV/DEMO contract only; not production-ready.';

REVOKE ALL ON FUNCTION public.issue_invoice_atomic(uuid, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_invoice_atomic(uuid, text)
    TO service_role;

COMMIT;
