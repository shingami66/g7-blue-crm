-- G1 corrective migration: establish the final Invoice snapshot during INSERT.
--
-- The applied G1 migration remains unchanged. This forward-only correction
-- preserves the existing financial guards and private legacy insert function.
-- No VAT, ZATCA, accounting, procurement, or broader workflow scope is added.

BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.create_invoice_atomic(uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date)') IS NULL
        OR to_regprocedure('public.create_invoice_atomic_legacy(uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date)') IS NULL
        OR to_regprocedure('public.build_active_abs_invoice_snapshot(uuid,uuid,uuid,text,numeric)') IS NULL
        OR to_regprocedure('public.check_invoices_before_write()') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'g1_invoice_snapshot_insert_correction_required_schema_missing';
    END IF;
END;
$$;

-- Keep invoice financial totals, links, and snapshots immutable after INSERT.
-- On INSERT only, establish the authoritative snapshot before the row is
-- written: active ABS uses the server-derived ABS helper; zero ABS history
-- keeps the bounded quotation fallback and normalizes its authority marker.
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

            IF NEW.invoice_type = 'final' THEN
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

-- The public wrapper retains the existing contract and audit boundary, but no
-- longer attempts to rewrite immutable snapshot fields after the legacy INSERT.
CREATE OR REPLACE FUNCTION public.create_invoice_atomic(
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
            i.invoice_number,
            i.snapshot_quotation
        INTO v_invoice
        FROM public.invoices i
        WHERE i.id = v_legacy.invoice_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_creation_failed';
        END IF;

        IF v_invoice.snapshot_quotation IS NULL
            OR jsonb_typeof(v_invoice.snapshot_quotation) IS DISTINCT FROM 'object'
        THEN
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
'The invoice snapshot is finalized during the initial INSERT; invoice.created is '
'recorded in the same transaction. DEV/DEMO contract only; not production-ready.';

REVOKE ALL ON FUNCTION public.create_invoice_atomic(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, date, date
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_atomic(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, date, date
) TO service_role;

COMMIT;
