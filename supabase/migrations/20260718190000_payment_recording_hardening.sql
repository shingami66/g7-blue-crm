-- Payment Recording Hardening
-- Adds idempotency to payments.request_id and hardens the record_invoice_payment RPC.
--
-- DEV/DEMO only. Do NOT apply automatically.
-- Application requirePermission(payments:write) remains mandatory before service_role call.
-- Does not claim production readiness.
-- No VAT / ZATCA / FATOORA / QR / XML expansion.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Pre-flight guard: verify the shapes this migration depends on are intact.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.payments') IS NULL THEN
        RAISE EXCEPTION 'payment_recording_hardening_guard_payments_table_missing';
    END IF;
    IF to_regclass('public.invoices') IS NULL THEN
        RAISE EXCEPTION 'payment_recording_hardening_guard_invoices_table_missing';
    END IF;
    IF to_regclass('public.services') IS NULL THEN
        RAISE EXCEPTION 'payment_recording_hardening_guard_services_table_missing';
    END IF;
    IF to_regclass('public.audit_logs') IS NULL THEN
        RAISE EXCEPTION 'payment_recording_hardening_guard_audit_logs_table_missing';
    END IF;
    -- Require the existing 6-arg RPC to be present (previous milestone).
    IF to_regprocedure('public.record_invoice_payment(uuid,numeric,date,text,text,text)') IS NULL THEN
        RAISE EXCEPTION 'payment_recording_hardening_guard_prior_rpc_missing';
    END IF;
    -- Confirm request_id has not already been added.
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name   = 'payments'
          AND c.column_name  = 'request_id'
    ) THEN
        RAISE EXCEPTION 'payment_recording_hardening_guard_request_id_already_exists';
    END IF;
    -- Confirm the hardened 7-arg RPC does not already exist.
    IF to_regprocedure('public.record_invoice_payment(uuid,numeric,date,text,text,text,uuid)') IS NOT NULL THEN
        RAISE EXCEPTION 'payment_recording_hardening_guard_hardened_rpc_already_exists';
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Add payments.request_id.
--    Nullable to preserve all historical rows.
--    Unique partial index enforces non-null uniqueness without touching nulls.
-- ---------------------------------------------------------------------------
ALTER TABLE public.payments
    ADD COLUMN request_id uuid,
    ADD COLUMN invoice_amount_paid_after numeric,
    ADD COLUMN invoice_balance_due_after numeric,
    ADD COLUMN invoice_status_after text;

COMMENT ON COLUMN public.payments.request_id IS
    'Caller-generated idempotency UUID. NULL for historical rows. '
    'Non-null values are reserved once; duplicate non-null request_id is blocked by '
    'idx_payments_request_id_unique.';

CREATE UNIQUE INDEX idx_payments_request_id_unique
    ON public.payments(request_id)
    WHERE request_id IS NOT NULL;

COMMENT ON INDEX public.idx_payments_request_id_unique IS
    'Unique idempotency reservation for non-null request_id values. '
    'Null request_id rows are not affected.';

-- 2.5 Add table-level positive amount constraint.
--     NOT VALID ensures historical data is not scanned/rejected during apply.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'payments'
          AND constraint_name = 'payments_amount_positive_check'
    ) THEN
        ALTER TABLE public.payments
            ADD CONSTRAINT payments_amount_positive_check
            CHECK (amount > 0)
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'payments'
          AND constraint_name = 'payments_snapshot_completeness_check'
    ) THEN
        ALTER TABLE public.payments
            ADD CONSTRAINT payments_snapshot_completeness_check
            CHECK (
                request_id IS NULL
                OR (
                    invoice_amount_paid_after IS NOT NULL
                    AND invoice_balance_due_after IS NOT NULL
                    AND invoice_status_after IS NOT NULL
                )
            )
            NOT VALID;
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Harden record_invoice_payment (7-arg signature adds p_request_id).
--
--    Lock order:  Service (FOR UPDATE) → Invoice (FOR UPDATE).
--    Idempotency: reserve request_id transactionally via unique index;
--                 replay returns stored result; conflict returns error_code row.
--    Error model: stable machine-readable error_code column; no raw exception
--                 text exposed to callers for expected domain failures.
--    Lifecycle:   fully-paid deposit invoice transitions Service from
--                 'Approved' → 'Deposit Paid'; partial deposit does not.
--                 Final invoice payments do not trigger any Service transition.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_invoice_payment(
    p_invoice_id  uuid,
    p_amount      numeric,
    p_date        date,
    p_method      text,
    p_reference   text,
    p_user_id     text,
    p_request_id  uuid
)
RETURNS TABLE(
    error_code      text,
    payment_id      uuid,
    payment_number  text,
    amount_paid     numeric,
    balance_due     numeric,
    invoice_status  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id          uuid;
    v_invoice_record      record;
    v_payment_record      record;
    v_existing_payment_id uuid;
    v_payment_number      text;
    v_payment_id          uuid;
    v_new_amount_paid     numeric;
    v_new_balance_due     numeric;
    v_new_status          text;
    v_invoice_type        text;
    v_service_status      text;
    -- Deterministic normalized payload fields for idempotency comparison.
    v_norm_amount         numeric;
    v_norm_date           date;
    v_norm_method         text;
    v_norm_reference      text;
BEGIN
    -- -----------------------------------------------------------------------
    -- A. Input validation (before any lock).
    -- -----------------------------------------------------------------------
    IF p_invoice_id IS NULL THEN
        RETURN QUERY SELECT 'invalid_payment_input'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;
    IF p_request_id IS NULL THEN
        RETURN QUERY SELECT 'invalid_payment_input'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN QUERY SELECT 'invalid_payment_amount'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;
    IF p_date IS NULL THEN
        RETURN QUERY SELECT 'invalid_payment_input'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;
    IF p_method IS NULL OR btrim(p_method) = '' THEN
        RETURN QUERY SELECT 'invalid_payment_input'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;
    IF p_method NOT IN ('bank_transfer', 'cash', 'cheque', 'online') THEN
        RETURN QUERY SELECT 'invalid_payment_input'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;
    IF p_user_id IS NULL OR btrim(p_user_id) = '' THEN
        RETURN QUERY SELECT 'invalid_payment_input'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;

    -- Normalize nullable and equivalent fields for deterministic comparison.
    v_norm_amount    := p_amount;
    v_norm_date      := p_date;
    v_norm_method    := p_method;
    v_norm_reference := COALESCE(btrim(p_reference), '');

    -- -----------------------------------------------------------------------
    -- B. Serialization: acquire request-scoped advisory transaction lock.
    --    This strictly serializes concurrent callers sharing the same request_id
    --    before any row lookup, preventing unique_violation races.
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_request_id::text, 8583)
    );

    -- C. Idempotency: check for existing payment with this request_id.
    --    Safe from races due to the advisory lock above.
    -- -----------------------------------------------------------------------
    SELECT
        py.id,
        py.payment_number,
        py.amount,
        py.invoice_id,
        py.date,
        py.method,
        py.reference,
        py.invoice_amount_paid_after,
        py.invoice_balance_due_after,
        py.invoice_status_after
    INTO v_payment_record
    FROM public.payments py
    WHERE py.request_id = p_request_id;

    IF FOUND THEN
        -- request_id was previously reserved. Check payload equality.
        IF v_payment_record.invoice_id IS DISTINCT FROM p_invoice_id
            OR v_payment_record.amount   IS DISTINCT FROM v_norm_amount
            OR v_payment_record.date     IS DISTINCT FROM v_norm_date
            OR v_payment_record.method   IS DISTINCT FROM v_norm_method
            OR COALESCE(btrim(v_payment_record.reference), '') IS DISTINCT FROM v_norm_reference
        THEN
            -- Same request_id, different payload → idempotency conflict.
            RETURN QUERY SELECT 'idempotency_conflict'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
            RETURN;
        END IF;

        IF v_payment_record.invoice_amount_paid_after IS NULL
            OR v_payment_record.invoice_balance_due_after IS NULL
            OR v_payment_record.invoice_status_after IS NULL
        THEN
            RETURN QUERY SELECT 'invalid_payment_snapshot'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
            RETURN;
        END IF;

        -- Same request_id, same payload → return original result.
        RETURN QUERY SELECT
            NULL::text,
            v_payment_record.id,
            v_payment_record.payment_number,
            v_payment_record.invoice_amount_paid_after,
            v_payment_record.invoice_balance_due_after,
            v_payment_record.invoice_status_after;
        RETURN;
    END IF;

    -- -----------------------------------------------------------------------
    -- D. Lock 1: Service (serialization boundary — Service first).
    --    We must find the service_id from the invoice before locking.
    --    Read-only pre-fetch (no lock) to get service_id.
    -- -----------------------------------------------------------------------
    SELECT i.service_id
    INTO v_service_id
    FROM public.invoices i
    WHERE i.id = p_invoice_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;

    IF v_service_id IS NULL THEN
        -- Invoice without a service link; still lock-safe to proceed without Service lock.
        -- No Service lifecycle transition will occur.
        NULL;
    ELSE
        -- Acquire Service row lock first.
        PERFORM 1
        FROM public.services s
        WHERE s.id = v_service_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'invoice_not_found'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
            RETURN;
        END IF;
    END IF;

    -- -----------------------------------------------------------------------
    -- E. Lock 2: Invoice (after Service lock).
    -- -----------------------------------------------------------------------
    SELECT
        i.id,
        i.customer_id,
        i.amount_paid,
        i.balance_due,
        i.status,
        i.is_deleted,
        i.invoice_type
    INTO v_invoice_record
    FROM public.invoices i
    WHERE i.id = p_invoice_id
      AND (v_service_id IS NULL OR i.service_id = v_service_id)
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;

    -- -----------------------------------------------------------------------
    -- F. Invoice domain checks (using locked values).
    -- -----------------------------------------------------------------------
    IF COALESCE(v_invoice_record.is_deleted, false) THEN
        RETURN QUERY SELECT 'invoice_deleted'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;

    IF v_invoice_record.status NOT IN ('sent', 'partial') THEN
        RETURN QUERY SELECT 'invoice_not_payable'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;

    IF v_norm_amount > v_invoice_record.balance_due THEN
        RETURN QUERY SELECT 'payment_exceeds_balance'::text, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;

    v_invoice_type := v_invoice_record.invoice_type;

    -- -----------------------------------------------------------------------
    -- G. Reserve request_id and insert Payment (atomic with everything below).
    --    The unique index on payments(request_id) WHERE request_id IS NOT NULL
    --    serializes concurrent callers — only one will succeed; the other will
    --    reach the FOUND branch above on retry.
    -- -----------------------------------------------------------------------
    v_payment_number := public.generate_document_number('payment');
    v_new_amount_paid := v_invoice_record.amount_paid + v_norm_amount;
    v_new_balance_due := v_invoice_record.balance_due - v_norm_amount;
    v_new_status      := CASE WHEN v_new_balance_due = 0 THEN 'paid' ELSE 'partial' END;

    INSERT INTO public.payments (
        payment_number,
        invoice_id,
        customer_id,
        date,
        amount,
        method,
        reference,
        status,
        request_id,
        invoice_amount_paid_after,
        invoice_balance_due_after,
        invoice_status_after,
        created_by,
        updated_by
    ) VALUES (
        v_payment_number,
        p_invoice_id,
        v_invoice_record.customer_id,
        v_norm_date,
        v_norm_amount,
        v_norm_method,
        NULLIF(v_norm_reference, ''),
        'confirmed',
        p_request_id,
        v_new_amount_paid,
        v_new_balance_due,
        v_new_status,
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_payment_id;

    -- -----------------------------------------------------------------------
    -- H. Settle Invoice.
    -- -----------------------------------------------------------------------
    UPDATE public.invoices i
    SET
        amount_paid = v_new_amount_paid,
        balance_due = v_new_balance_due,
        status      = v_new_status,
        updated_by  = p_user_id,
        updated_at  = now()
    WHERE i.id = p_invoice_id;

    -- -----------------------------------------------------------------------
    -- I. Optional Deposit Service lifecycle transition.
    --    Conditions (all required):
    --      - Invoice is a deposit type.
    --      - Invoice is now fully paid (balance_due = 0).
    --      - Service exists (v_service_id IS NOT NULL).
    --      - Service current status is exactly 'Approved'.
    --    Partial payments and non-deposit invoices do NOT trigger transition.
    --    Final invoice payments do NOT trigger any transition.
    -- -----------------------------------------------------------------------
    IF v_invoice_type = 'deposit'
        AND v_new_balance_due = 0
        AND v_service_id IS NOT NULL
    THEN
        SELECT s.status
        INTO v_service_status
        FROM public.services s
        WHERE s.id = v_service_id;

        IF v_service_status = 'Approved' THEN
            UPDATE public.services s
            SET
                status     = 'Deposit Paid',
                updated_at = now()
            WHERE s.id = v_service_id;
        END IF;
        -- Any other Service status (Quoted, Deposit Paid, In Progress, Completed,
        -- Cancelled) must not be forced into an invalid transition.
    END IF;

    -- -----------------------------------------------------------------------
    -- J. Audit log (inside the same transaction).
    -- -----------------------------------------------------------------------
    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details
    ) VALUES (
        'payment_recorded',
        'invoice',
        p_invoice_id,
        p_user_id,
        jsonb_build_object(
            'payment_id',      v_payment_id,
            'payment_number',  v_payment_number,
            'request_id',      p_request_id,
            'amount',          v_norm_amount,
            'method',          v_norm_method,
            'new_status',      v_new_status,
            'service_id',      v_service_id,
            'deposit_transition', (
                v_invoice_type = 'deposit'
                AND v_new_balance_due = 0
                AND v_service_id IS NOT NULL
                AND v_service_status = 'Approved'
            )
        )
    );

    -- -----------------------------------------------------------------------
    -- K. Return stable one-row success result.
    -- -----------------------------------------------------------------------
    RETURN QUERY SELECT
        NULL::text,
        v_payment_id,
        v_payment_number,
        v_new_amount_paid,
        v_new_balance_due,
        v_new_status;
END;
$$;

ALTER FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid)
    OWNER TO postgres;

COMMENT ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid) IS
    'Hardened atomic payment settlement. SECURITY DEFINER; service_role only. '
    'Accepts caller-generated p_request_id for idempotency. '
    'Lock order: Service first, Invoice second. '
    'Deposit full-payment transitions Service from Approved to Deposit Paid. '
    'Final invoice payments do not change Service status. '
    'Returns one stable row: error_code=NULL on success or machine-readable error_code on failure. '
    'DEV/DEMO contract. Not production-ready.';

-- ---------------------------------------------------------------------------
-- 4. Privilege hardening for the new 7-arg signature.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid)
    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid)
    FROM anon;
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid)
    FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid)
    TO service_role;

-- ---------------------------------------------------------------------------
-- 5. Revoke the obsolete 6-arg signature so it cannot bypass the hardened contract.
--    The 6-arg version lacks idempotency, Service-first locking, and stable error codes.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text)
    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text)
    FROM anon;
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text)
    FROM authenticated;
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text)
    FROM service_role;

COMMENT ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text) IS
    'OBSOLETE: superseded by the 7-arg hardened signature. '
    'All execution privileges revoked. Do not call. '
    'Preserved as a stub to prevent accidental re-grant.';

COMMIT;
