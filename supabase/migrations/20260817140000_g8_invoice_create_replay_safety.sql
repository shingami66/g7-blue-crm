-- G8 forward-only migration: Invoice Create Replay Safety (Option 1)
--
-- Adds durable mutation replay protection to Invoice Create without weakening
-- existing financial authority, lifecycle guards, ABS ceilings, or snapshot immutability.
--
-- DEV/DEMO contract. Not applied in this task.

BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.create_invoice_atomic(uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date)') IS NULL
        OR to_regprocedure('public.create_invoice_atomic_legacy(uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date)') IS NULL
        OR to_regprocedure('public.check_invoices_before_write()') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'g8_invoice_create_replay_safety_required_schema_missing';
    END IF;
END;
$$;

-- 1. Durable storage columns for Invoice mutation replay
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS mutation_key text NULL,
    ADD COLUMN IF NOT EXISTS mutation_payload jsonb NULL;

-- 2. Partial unique index ensuring each non-null mutation_key is unique across all rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_mutation_key
ON public.invoices (mutation_key)
WHERE mutation_key IS NOT NULL;

-- 3. Extend write trigger to protect mutation_key and mutation_payload immutability after INSERT
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
        OLD.mutation_key IS DISTINCT FROM NEW.mutation_key
        OR OLD.mutation_payload IS DISTINCT FROM NEW.mutation_payload
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice mutation identity is immutable after creation';
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

-- 4. Shared canonical helper function
CREATE OR REPLACE FUNCTION public._canonical_invoice_create_mutation(
    p_service_id uuid,
    p_quotation_id uuid,
    p_invoice_type text,
    p_requested_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RETURN jsonb_build_object(
        'service_id', p_service_id,
        'quotation_id', p_quotation_id,
        'invoice_type', p_invoice_type,
        'requested_amount', CASE
            WHEN p_invoice_type = 'deposit' AND p_requested_amount IS NOT NULL
                THEN round(p_requested_amount::numeric, 2)
            ELSE NULL
        END
    );
END;
$$;

REVOKE ALL ON FUNCTION public._canonical_invoice_create_mutation(uuid, uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._canonical_invoice_create_mutation(uuid, uuid, text, numeric) TO service_role;

-- 5. Dedicated reconciliation RPC
CREATE OR REPLACE FUNCTION public.reconcile_invoice_create_mutation(
    p_mutation_key text,
    p_service_id uuid,
    p_quotation_id uuid,
    p_invoice_type text,
    p_requested_amount numeric
)
RETURNS TABLE (
    reconciliation_status text,
    invoice_id uuid,
    invoice_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_mutation_key text;
    v_canonical_payload jsonb;
    v_invoice record;
BEGIN
    v_mutation_key := btrim(COALESCE(p_mutation_key, ''));
    IF v_mutation_key = '' THEN
        RETURN QUERY SELECT 'NOT_FOUND'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    v_canonical_payload := public._canonical_invoice_create_mutation(
        p_service_id,
        p_quotation_id,
        p_invoice_type,
        p_requested_amount
    );

    PERFORM pg_advisory_xact_lock(hashtext('invoice_mutation_key:' || v_mutation_key));

    -- ALL-ROWS lookup: Replay identity is mutation history (never filter by status/is_deleted/voided_at)
    SELECT i.id, i.invoice_number, i.mutation_payload
    INTO v_invoice
    FROM public.invoices i
    WHERE i.mutation_key = v_mutation_key
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'NOT_FOUND'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    IF v_invoice.mutation_payload = v_canonical_payload THEN
        RETURN QUERY SELECT 'MATCH'::text, v_invoice.id, v_invoice.invoice_number;
        RETURN;
    ELSE
        RETURN QUERY SELECT 'CONFLICT'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.reconcile_invoice_create_mutation(text, uuid, uuid, text, numeric) IS
'Read-only family-local mutation reconciliation for Invoice Create. SECURITY DEFINER; service_role only.';

REVOKE ALL ON FUNCTION public.reconcile_invoice_create_mutation(text, uuid, uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_invoice_create_mutation(text, uuid, uuid, text, numeric) TO service_role;

-- 6. Stale overload removal: drop 14-arg functions
DROP FUNCTION IF EXISTS public.create_invoice_atomic(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, date, date
);

DROP FUNCTION IF EXISTS public.create_invoice_atomic_legacy(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, date, date
);

-- 7. New private legacy financial create body with mutation persistence
CREATE OR REPLACE FUNCTION public.create_invoice_atomic_legacy(
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
    p_mutation_key text,
    p_mutation_payload jsonb,
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
    -- 1. Structural validation (before lock)
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
        IF p_requested_amount <= 0
            OR p_requested_amount <> round(p_requested_amount, 2)
        THEN
            RETURN QUERY SELECT 'invalid_deposit_amount'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;
    ELSIF p_requested_amount IS NOT NULL THEN
        RETURN QUERY SELECT 'invalid_invoice_input'::text, NULL::uuid, NULL::text;
        RETURN;
    END IF;

    -- 2. Lock Service (serialization boundary)
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

    -- 3. Lifecycle matrix
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

    -- 4. Quotation validation
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

    -- 5. ABS history + active authority
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

        IF v_abs_history_count = 0 THEN
            RETURN QUERY SELECT 'billing_scope_authority_unavailable'::text, NULL::uuid, NULL::text;
            RETURN;
        END IF;

        v_ceiling := v_active_scope_ceiling;
        v_billing_scope_id := v_active_scope_id;

    ELSIF v_abs_history_count > 0 THEN
        RETURN QUERY SELECT 'billing_scope_inactive'::text, NULL::uuid, NULL::text;
        RETURN;
    ELSE
        v_ceiling := v_quotation_grand_total;
        v_billing_scope_id := NULL;
    END IF;

    -- 6. Service-lifetime exposure
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

    -- 7-8. Deposit / Final business guards
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

    -- 9. Invoice number generation (only reached on fresh create)
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

    -- Snapshot storage
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

    -- 10. Insert exactly one Invoice with mutation identity
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
            updated_by,
            mutation_key,
            mutation_payload
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
            p_actor_clerk_user_id,
            p_mutation_key,
            p_mutation_payload
        )
        RETURNING id INTO v_new_invoice_id;
    EXCEPTION
        WHEN unique_violation THEN
            GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
            IF v_constraint_name = 'uq_invoices_one_active_deposit_per_service' THEN
                RETURN QUERY SELECT 'deposit_invoice_already_exists'::text, NULL::uuid, NULL::text;
                RETURN;
            END IF;
            IF v_constraint_name = 'idx_invoices_mutation_key' THEN
                RETURN QUERY SELECT 'mutation_key_conflict'::text, NULL::uuid, NULL::text;
                RETURN;
            END IF;
            RETURN QUERY SELECT 'invoice_insert_failed'::text, NULL::uuid, NULL::text;
            RETURN;
        WHEN OTHERS THEN
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

    -- 11. Success
    RETURN QUERY SELECT NULL::text, v_new_invoice_id, v_invoice_number;
    RETURN;
END;
$$;

COMMENT ON FUNCTION public.create_invoice_atomic_legacy(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, text, jsonb, date, date
) IS
'Private internal atomic invoice creation implementation. G8 replay-aware.';

REVOKE ALL ON FUNCTION public.create_invoice_atomic_legacy(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, text, jsonb, date, date
) FROM PUBLIC, anon, authenticated, service_role;

-- 8. New public create RPC with mutation key, replay guard, and single audit event
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
    p_mutation_key text,
    p_invoice_date date DEFAULT CURRENT_DATE,
    p_due_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    error_code text,
    invoice_id uuid,
    invoice_number text,
    is_replayed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_mutation_key text;
    v_canonical_payload jsonb;
    v_existing record;
    v_legacy record;
    v_invoice record;
    v_now timestamptz;
    v_error_message text;
BEGIN
    v_mutation_key := btrim(COALESCE(p_mutation_key, ''));
    IF v_mutation_key = '' THEN
        RETURN QUERY SELECT 'invalid_invoice_input'::text, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    v_canonical_payload := public._canonical_invoice_create_mutation(
        p_service_id,
        p_quotation_id,
        p_invoice_type,
        p_requested_amount
    );

    -- 1. Family-local advisory lock on normalized mutation key
    PERFORM pg_advisory_xact_lock(hashtext('invoice_mutation_key:' || v_mutation_key));

    -- 2. ALL-ROWS replay check BEFORE service row lock, ABS checks, number generation, or insert
    SELECT i.id, i.invoice_number, i.mutation_payload
    INTO v_existing
    FROM public.invoices i
    WHERE i.mutation_key = v_mutation_key
    LIMIT 1;

    IF FOUND THEN
        IF v_existing.mutation_payload = v_canonical_payload THEN
            -- Exact Replay: return existing invoice without new audit log or number generation
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.invoice_number, true;
            RETURN;
        ELSE
            -- Conflict: same key with different payload
            RETURN QUERY SELECT 'mutation_key_conflict'::text, NULL::uuid, NULL::text, false;
            RETURN;
        END IF;
    END IF;

    -- 3. Fresh Create Path: delegate to legacy financial body
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
            v_mutation_key,
            v_canonical_payload,
            p_invoice_date,
            p_due_date
        );

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'invoice_creation_failed'::text, NULL::uuid, NULL::text, false;
            RETURN;
        END IF;

        IF v_legacy.error_code IS NOT NULL
            OR v_legacy.invoice_id IS NULL
            OR v_legacy.invoice_number IS NULL
        THEN
            RETURN QUERY SELECT
                v_legacy.error_code,
                v_legacy.invoice_id,
                v_legacy.invoice_number,
                false;
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

        -- Record exactly ONE invoice.created audit event for fresh create
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
            v_invoice.invoice_number,
            false;
        RETURN;
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
            IF v_error_message = 'invoice_snapshot_authority_unavailable' THEN
                RETURN QUERY SELECT
                    'invoice_snapshot_authority_unavailable'::text,
                    NULL::uuid,
                    NULL::text,
                    false;
                RETURN;
            END IF;

            RETURN QUERY SELECT 'invoice_creation_failed'::text, NULL::uuid, NULL::text, false;
            RETURN;
    END;
END;
$$;

COMMENT ON FUNCTION public.create_invoice_atomic(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, text, date, date
) IS
'Atomic Deposit/Final Invoice create with G8 replay protection. SECURITY DEFINER; service_role only.';

REVOKE ALL ON FUNCTION public.create_invoice_atomic(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, text, date, date
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_invoice_atomic(
    uuid, uuid, text, numeric, text, text, text,
    jsonb, jsonb, jsonb, jsonb, jsonb, text, date, date
) TO service_role;

COMMIT;
