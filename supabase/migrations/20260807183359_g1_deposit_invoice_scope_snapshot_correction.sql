-- G1 corrective migration: retain approved service scope on active-ABS Deposit
-- Invoice snapshots while keeping the deposit amount separate settlement data.
--
-- This is forward-only. Existing invoice snapshots are immutable and are not
-- rewritten. No VAT, ZATCA, accounting, procurement, or broader workflow
-- scope is added.

BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.build_active_abs_invoice_snapshot(uuid,uuid,uuid,text,numeric)') IS NULL
        OR to_regprocedure('public.check_invoices_before_write()') IS NULL
        OR to_regclass('public.invoices') IS NULL
        OR NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_trigger t
            WHERE t.tgrelid = 'public.invoices'::regclass
              AND t.tgname = 'check_invoices_before_write_trg'
              AND t.tgisinternal = false
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'g1_deposit_invoice_scope_snapshot_correction_required_schema_missing';
    END IF;
END;
$$;

-- Active ABS snapshots always preserve accepted/adjusted service lines. The
-- invoice amount is settlement metadata and must not become a service price.
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

    RETURN jsonb_build_object(
        'quotation_id', v_quotation.id,
        'quotation_number', v_quotation.quotation_number,
        'service_id', v_quotation.service_id,
        'customer_id', v_quotation.customer_id,
        'items', v_items,
        'subtotal', v_scope.accepted_subtotal,
        'discount', COALESCE(v_scope.source_discount, 0),
        'vat_rate', COALESCE(v_scope.source_vat_rate, 0),
        'vat_amount', v_scope.accepted_vat_amount,
        'grand_total', v_scope.accepted_grand_total,
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

COMMENT ON FUNCTION public.build_active_abs_invoice_snapshot(uuid, uuid, uuid, text, numeric) IS
'Builds immutable active ABS invoice snapshots. Deposit and final invoices retain accepted service scope lines; settlement metadata remains separate. DEV/DEMO contract only; not production-ready.';

-- Finalize the authoritative snapshot on the initial INSERT. Deposit amount
-- and approved scope total are recorded separately so neither is misread as a
-- service line price. Existing update immutability and financial guards stay
-- unchanged.
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
BEGIN
    IF TG_OP = 'UPDATE' AND (
        OLD.service_id IS DISTINCT FROM NEW.service_id
        OR OLD.approved_quotation_id IS DISTINCT FROM NEW.approved_quotation_id
        OR OLD.approved_billing_scope_id IS DISTINCT FROM NEW.approved_billing_scope_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice authoritative Service, quotation, and billing scope links are immutable';
    END IF;

    IF TG_OP = 'UPDATE' AND (
        OLD.invoice_number IS DISTINCT FROM NEW.invoice_number
        OR OLD.customer_id IS DISTINCT FROM NEW.customer_id
        OR OLD.date IS DISTINCT FROM NEW.date
        OR OLD.due_date IS DISTINCT FROM NEW.due_date
        OR OLD.subtotal IS DISTINCT FROM NEW.subtotal
        OR OLD.vat_amount IS DISTINCT FROM NEW.vat_amount
        OR OLD.grand_total IS DISTINCT FROM NEW.grand_total
        OR OLD.invoice_type IS DISTINCT FROM NEW.invoice_type
        OR OLD.document_label IS DISTINCT FROM NEW.document_label
        OR OLD.vat_mode IS DISTINCT FROM NEW.vat_mode
        OR OLD.vat_rate IS DISTINCT FROM NEW.vat_rate
        OR OLD.snapshot_seller IS DISTINCT FROM NEW.snapshot_seller
        OR OLD.snapshot_buyer IS DISTINCT FROM NEW.snapshot_buyer
        OR OLD.snapshot_quotation IS DISTINCT FROM NEW.snapshot_quotation
        OR OLD.snapshot_bank_details IS DISTINCT FROM NEW.snapshot_bank_details
        OR OLD.snapshot_document_rules IS DISTINCT FROM NEW.snapshot_document_rules
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice financial totals and document snapshots are immutable after creation';
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
                JOIN public.approved_billing_scopes s
                    ON s.id = v_active_scope_id
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

                IF v_quotation_grand_total IS NULL
                    OR v_active_scope_ceiling IS NULL
                    OR v_prior_exposure IS NULL
                THEN
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
                    - ARRAY[
                        'approvedBillingScopeId',
                        'approvedBillingScopeAcceptedGrandTotal',
                        'sourceQuotationId'
                    ],
                '{invoiceAuthorityMode}',
                '"legacy_quotation"'::jsonb,
                true
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_invoices_before_write()
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_invoices_before_write()
    TO service_role;

COMMENT ON FUNCTION public.check_invoices_before_write() IS
'Establishes immutable invoice snapshots on INSERT and preserves active ABS service scope for deposits and final invoices. DEV/DEMO contract only; not production-ready.';

COMMIT;
