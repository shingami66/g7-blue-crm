-- W7A Customer Receipt and Allocation Foundation.
--
-- This migration evolves public.payments into the persisted Customer Receipt
-- record for independent receipts (invoice_id IS NULL), while preserving the
-- existing Invoice-linked Payment rows and record_invoice_payment authority.
-- DEV/DEMO only; apply exactly through the owner-approved Supabase procedure.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.payments') IS NULL
        OR to_regclass('public.invoices') IS NULL
        OR to_regclass('public.customers') IS NULL
        OR to_regclass('public.services') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regclass('public.number_sequences') IS NULL
    THEN
        RAISE EXCEPTION 'w7a_preflight_required_tables_missing';
    END IF;

    IF to_regprocedure('public.record_invoice_payment(uuid,numeric,date,text,text,text,uuid)') IS NULL
        OR to_regprocedure('public._record_invoice_payment_before_service_audit(uuid,numeric,date,text,text,text,uuid)') IS NULL
    THEN
        RAISE EXCEPTION 'w7a_preflight_hardened_payment_rpc_missing';
    END IF;

    IF to_regclass('public.customer_receipt_allocations') IS NOT NULL
        OR to_regclass('public.customer_receipt_allocation_reversals') IS NOT NULL
        OR to_regclass('public.customer_receipt_reversals') IS NOT NULL
        OR to_regclass('public.customer_receipt_balances') IS NOT NULL
        OR to_regclass('public.customer_invoice_settlement_balances') IS NOT NULL
        OR to_regprocedure('public.record_customer_receipt(uuid,numeric,date,text,text,text,text,uuid)') IS NOT NULL
        OR to_regprocedure('public.allocate_customer_receipt(uuid,uuid,numeric,text,uuid)') IS NOT NULL
        OR to_regprocedure('public.reverse_customer_receipt_allocation(uuid,text,text,uuid)') IS NOT NULL
        OR to_regprocedure('public.reverse_customer_receipt(uuid,text,text,uuid)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'w7a_preflight_w7a_objects_already_exist';
    END IF;

    -- Fail closed rather than inventing legacy allocation history.
    IF EXISTS (
        SELECT 1
        FROM public.payments p
        LEFT JOIN public.invoices i ON i.id = p.invoice_id
        WHERE COALESCE(p.is_deleted, false) = false
          AND (
              p.invoice_id IS NULL
              OR i.id IS NULL
              OR p.customer_id IS DISTINCT FROM i.customer_id
              OR p.status <> 'confirmed'
              OR p.amount IS NULL
              OR p.amount <= 0
              OR p.amount <> round(p.amount, 2)
          )
    ) THEN
        RAISE EXCEPTION 'w7a_preflight_ambiguous_legacy_payment_history';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.invoices i
        LEFT JOIN public.payments p
            ON p.invoice_id = i.id
           AND COALESCE(p.is_deleted, false) = false
           AND p.status = 'confirmed'
        GROUP BY i.id, i.grand_total, i.amount_paid, i.balance_due
        HAVING i.amount_paid IS DISTINCT FROM COALESCE(SUM(p.amount), 0)::numeric
            OR i.balance_due IS DISTINCT FROM (COALESCE(i.grand_total, 0) - COALESCE(SUM(p.amount), 0))::numeric
    ) THEN
        RAISE EXCEPTION 'w7a_preflight_invoice_payment_summary_mismatch';
    END IF;
END;
$$;

ALTER TABLE public.payments
    ALTER COLUMN invoice_id DROP NOT NULL,
    ADD COLUMN notes text;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_snapshot_completeness_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_snapshot_completeness_check
    CHECK (
        request_id IS NULL
        OR invoice_id IS NULL
        OR (
            invoice_amount_paid_after IS NOT NULL
            AND invoice_balance_due_after IS NOT NULL
            AND invoice_status_after IS NOT NULL
        )
    ) NOT VALID;

COMMENT ON COLUMN public.payments.invoice_id IS
    'Nullable for independent Customer Receipts; non-null legacy/current values remain Invoice-linked Payments.';
COMMENT ON COLUMN public.payments.notes IS
    'Receipt notes for independent Customer Receipts; nullable for historical Invoice-linked Payments.';

CREATE TABLE public.customer_receipt_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL,
    allocated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    allocated_by text NOT NULL,
    request_id uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT customer_receipt_allocations_amount_check
        CHECK (amount > 0 AND amount <= 9999999999.99 AND amount = round(amount, 2)),
    CONSTRAINT customer_receipt_allocations_actor_check
        CHECK (char_length(btrim(allocated_by)) BETWEEN 1 AND 255)
);

CREATE TABLE public.customer_receipt_allocation_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id uuid NOT NULL UNIQUE REFERENCES public.customer_receipt_allocations(id) ON DELETE RESTRICT,
    reason text NOT NULL,
    reversed_by text NOT NULL,
    reversed_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    request_id uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT customer_receipt_allocation_reversals_reason_check
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT customer_receipt_allocation_reversals_actor_check
        CHECK (char_length(btrim(reversed_by)) BETWEEN 1 AND 255)
);

CREATE TABLE public.customer_receipt_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE RESTRICT,
    reason text NOT NULL,
    reversed_by text NOT NULL,
    reversed_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    request_id uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT customer_receipt_reversals_reason_check
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT customer_receipt_reversals_actor_check
        CHECK (char_length(btrim(reversed_by)) BETWEEN 1 AND 255)
);

CREATE INDEX customer_receipt_allocations_payment_idx
    ON public.customer_receipt_allocations (payment_id, allocated_at, id);
CREATE INDEX customer_receipt_allocations_invoice_idx
    ON public.customer_receipt_allocations (invoice_id, allocated_at, id);
CREATE INDEX customer_receipt_allocations_customer_idx
    ON public.customer_receipt_allocations (customer_id, allocated_at DESC, id DESC);
CREATE INDEX customer_receipt_allocation_reversals_allocation_idx
    ON public.customer_receipt_allocation_reversals (allocation_id, reversed_at DESC, id DESC);
CREATE INDEX customer_receipt_reversals_payment_idx
    ON public.customer_receipt_reversals (payment_id, reversed_at DESC, id DESC);
CREATE INDEX payments_independent_receipt_customer_idx
    ON public.payments (customer_id, date DESC, payment_number DESC)
    WHERE invoice_id IS NULL AND COALESCE(is_deleted, false) = false;

CREATE OR REPLACE FUNCTION public.prevent_w7a_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RAISE EXCEPTION 'w7a_append_only_history';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_independent_customer_receipt_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.invoice_id IS NULL AND COALESCE(current_setting('g7.w7a_rpc_context', true), '') <> 'on' THEN
            RAISE EXCEPTION 'w7a_rpc_only_mutation';
        END IF;
        RETURN NEW;
    END IF;
    IF OLD.invoice_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.invoice_id IS NULL) THEN
        RAISE EXCEPTION 'customer_receipt_immutable_use_reversal';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.require_w7a_rpc_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF COALESCE(current_setting('g7.w7a_rpc_context', true), '') <> 'on' THEN
        RAISE EXCEPTION 'w7a_rpc_only_mutation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER customer_receipt_allocations_append_only
    BEFORE UPDATE OR DELETE ON public.customer_receipt_allocations
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7a_append_only_mutation();
CREATE TRIGGER customer_receipt_allocation_reversals_append_only
    BEFORE UPDATE OR DELETE ON public.customer_receipt_allocation_reversals
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7a_append_only_mutation();
CREATE TRIGGER customer_receipt_reversals_append_only
    BEFORE UPDATE OR DELETE ON public.customer_receipt_reversals
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7a_append_only_mutation();
CREATE TRIGGER independent_customer_receipt_immutable
    BEFORE INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.prevent_independent_customer_receipt_mutation();
CREATE TRIGGER customer_receipt_allocations_rpc_only
    BEFORE INSERT ON public.customer_receipt_allocations
    FOR EACH ROW EXECUTE FUNCTION public.require_w7a_rpc_context();
CREATE TRIGGER customer_receipt_allocation_reversals_rpc_only
    BEFORE INSERT ON public.customer_receipt_allocation_reversals
    FOR EACH ROW EXECUTE FUNCTION public.require_w7a_rpc_context();
CREATE TRIGGER customer_receipt_reversals_rpc_only
    BEFORE INSERT ON public.customer_receipt_reversals
    FOR EACH ROW EXECUTE FUNCTION public.require_w7a_rpc_context();

CREATE OR REPLACE VIEW public.customer_receipt_balances
WITH (security_invoker = true)
AS
SELECT
    p.id AS payment_id,
    p.payment_number,
    p.customer_id,
    p.date,
    p.amount AS receipt_amount,
    p.method,
    p.reference,
    p.notes,
    p.status AS payment_status,
    COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL AND rr.id IS NULL), 0)::numeric(12,2) AS allocated_amount,
    (p.amount - COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL AND rr.id IS NULL), 0))::numeric(12,2) AS unapplied_amount,
    CASE
        WHEN rr.id IS NOT NULL THEN 'reversed'
        WHEN COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL), 0) = 0 THEN 'unapplied'
        WHEN COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL), 0) = p.amount THEN 'fully_allocated'
        ELSE 'partially_allocated'
    END AS receipt_status,
    p.created_at,
    p.created_by
FROM public.payments p
LEFT JOIN public.customer_receipt_allocations a ON a.payment_id = p.id
LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
LEFT JOIN public.customer_receipt_reversals rr ON rr.payment_id = p.id
WHERE p.invoice_id IS NULL
  AND COALESCE(p.is_deleted, false) = false
GROUP BY p.id, p.payment_number, p.customer_id, p.date, p.amount, p.method, p.reference,
         p.notes, p.status, rr.id, p.created_at, p.created_by;

CREATE OR REPLACE VIEW public.customer_invoice_settlement_balances
WITH (security_invoker = true)
AS
WITH active_allocations AS (
    SELECT a.invoice_id, SUM(a.amount)::numeric(12,2) AS allocated_amount
    FROM public.customer_receipt_allocations a
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.customer_receipt_allocation_reversals ar
        WHERE ar.allocation_id = a.id
    )
      AND NOT EXISTS (
        SELECT 1
        FROM public.customer_receipt_reversals rr
        WHERE rr.payment_id = a.payment_id
    )
    GROUP BY a.invoice_id
)
SELECT
    i.id AS invoice_id,
    i.invoice_number,
    i.customer_id,
    i.grand_total,
    COALESCE(aa.allocated_amount, 0)::numeric(12,2) AS allocated_amount,
    (i.grand_total - COALESCE(aa.allocated_amount, 0))::numeric(12,2) AS outstanding_amount,
    i.amount_paid AS invoice_amount_paid,
    i.balance_due AS invoice_balance_due,
    i.status AS invoice_status
FROM public.invoices i
LEFT JOIN active_allocations aa ON aa.invoice_id = i.id;

-- One deterministic active Allocation for each valid legacy Payment.
SELECT set_config('g7.w7a_rpc_context', 'on', true);
INSERT INTO public.customer_receipt_allocations(
    payment_id, invoice_id, customer_id, amount, allocated_at, allocated_by, request_id, created_at
)
SELECT
    p.id,
    p.invoice_id,
    p.customer_id,
    p.amount,
    COALESCE(p.created_at, p.date::timestamptz),
    COALESCE(NULLIF(btrim(p.created_by), ''), 'legacy:w7a:' || p.id::text),
    COALESCE(p.request_id, md5('w7a:legacy-allocation:' || p.id::text)::uuid),
    COALESCE(p.created_at, p.date::timestamptz)
FROM public.payments p
WHERE COALESCE(p.is_deleted, false) = false
  AND p.invoice_id IS NOT NULL
  AND p.status = 'confirmed';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.payments p
        LEFT JOIN public.customer_receipt_allocations a ON a.payment_id = p.id
        WHERE COALESCE(p.is_deleted, false) = false
          AND p.invoice_id IS NOT NULL
          AND (a.id IS NULL OR a.amount IS DISTINCT FROM p.amount)
    ) THEN
        RAISE EXCEPTION 'w7a_legacy_allocation_reconciliation_failed';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.invoices i
        LEFT JOIN public.customer_receipt_allocations a ON a.invoice_id = i.id
        LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
        GROUP BY i.id, i.amount_paid, i.balance_due, i.grand_total
        HAVING i.amount_paid IS DISTINCT FROM COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL), 0)::numeric
            OR i.balance_due IS DISTINCT FROM (COALESCE(i.grand_total, 0) - COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL), 0))::numeric
    ) THEN
        RAISE EXCEPTION 'w7a_post_backfill_invoice_summary_mismatch';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_customer_receipt(
    p_customer_id uuid,
    p_amount numeric,
    p_date date,
    p_method text,
    p_reference text,
    p_notes text,
    p_user_id text,
    p_request_id uuid
)
RETURNS TABLE(
    error_code text,
    payment_id uuid,
    payment_number text,
    customer_id uuid,
    receipt_amount numeric,
    allocated_amount numeric,
    unapplied_amount numeric,
    receipt_status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_existing public.payments%ROWTYPE;
    v_payment_id uuid;
    v_payment_number text;
    v_reference text := NULLIF(btrim(p_reference), '');
    v_notes text := NULLIF(btrim(p_notes), '');
    v_method text := lower(NULLIF(btrim(p_method), ''));
    v_allocated numeric := 0;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_customer_id IS NULL OR p_amount IS NULL
        OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
        OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR p_date IS NULL OR p_request_id IS NULL
        OR NULLIF(btrim(p_user_id), '') IS NULL
        OR v_method NOT IN ('bank_transfer', 'cash', 'cheque', 'online')
        OR char_length(COALESCE(v_reference, '')) > 200
        OR char_length(COALESCE(v_notes, '')) > 2000
    THEN
        RETURN QUERY SELECT 'invalid_customer_receipt_input', NULL::uuid, NULL::text, p_customer_id,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7a:receipt-request:' || p_request_id::text, 9281)
    );

    SELECT p.* INTO v_existing
    FROM public.payments p
    WHERE p.request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.invoice_id IS NOT NULL
            OR v_existing.customer_id IS DISTINCT FROM p_customer_id
            OR v_existing.amount IS DISTINCT FROM p_amount
            OR v_existing.date IS DISTINCT FROM p_date
            OR v_existing.method IS DISTINCT FROM v_method
            OR COALESCE(btrim(v_existing.reference), '') IS DISTINCT FROM COALESCE(v_reference, '')
            OR COALESCE(btrim(v_existing.notes), '') IS DISTINCT FROM COALESCE(v_notes, '')
        THEN
            RETURN QUERY SELECT 'customer_receipt_request_conflict', NULL::uuid, NULL::text, p_customer_id,
                NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, false;
            RETURN;
        END IF;

        SELECT COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL), 0)
        INTO v_allocated
        FROM public.customer_receipt_allocations a
        LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
        WHERE a.payment_id = v_existing.id;
        RETURN QUERY
        SELECT NULL::text, v_existing.id, v_existing.payment_number, v_existing.customer_id,
            v_existing.amount, v_allocated, v_existing.amount - v_allocated,
            CASE WHEN EXISTS (SELECT 1 FROM public.customer_receipt_reversals r WHERE r.payment_id = v_existing.id)
                 THEN 'reversed' ELSE CASE WHEN v_allocated = 0 THEN 'unapplied' WHEN v_allocated = v_existing.amount THEN 'fully_allocated' ELSE 'partially_allocated' END END,
            true;
        RETURN;
    END IF;

    PERFORM 1
    FROM public.customers c
    WHERE c.id = p_customer_id
      AND COALESCE(c.is_deleted, false) = false
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'customer_not_found', NULL::uuid, NULL::text, p_customer_id,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    PERFORM set_config('g7.w7a_rpc_context', 'on', true);
    v_payment_number := public.generate_document_number('payment');
    INSERT INTO public.payments(
        payment_number, invoice_id, customer_id, date, amount, method, reference, notes,
        status, request_id, created_by, updated_by
    ) VALUES (
        v_payment_number, NULL, p_customer_id, p_date, p_amount, v_method, v_reference, v_notes,
        'confirmed', p_request_id, p_user_id, p_user_id
    ) RETURNING id INTO v_payment_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'customer_receipt_recorded', 'customer_receipt', v_payment_id, p_user_id,
        jsonb_build_object(
            'operation', 'record_customer_receipt',
            'request_id', p_request_id,
            'customer_id', p_customer_id,
            'payment_id', v_payment_id,
            'amount', p_amount,
            'unapplied_amount', p_amount,
            'revenue_classification', 'none',
            'tax_classification', 'inactive'
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_payment_id, v_payment_number, p_customer_id,
        p_amount, 0::numeric, p_amount, 'unapplied'::text, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_customer_receipt(
    p_payment_id uuid,
    p_invoice_id uuid,
    p_amount numeric,
    p_user_id text,
    p_request_id uuid
)
RETURNS TABLE(
    error_code text,
    allocation_id uuid,
    payment_id uuid,
    invoice_id uuid,
    allocated_amount numeric,
    receipt_unapplied_amount numeric,
    invoice_balance_due numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_payment public.payments%ROWTYPE;
    v_invoice public.invoices%ROWTYPE;
    v_existing public.customer_receipt_allocations%ROWTYPE;
    v_service_id uuid;
    v_service_status text;
    v_receipt_allocated numeric := 0;
    v_invoice_allocated numeric := 0;
    v_receipt_unapplied numeric;
    v_invoice_outstanding numeric;
    v_allocation_id uuid;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_payment_id IS NULL OR p_invoice_id IS NULL OR p_amount IS NULL
        OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
        OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR p_request_id IS NULL OR NULLIF(btrim(p_user_id), '') IS NULL
    THEN
        RETURN QUERY SELECT 'invalid_customer_receipt_allocation_input', NULL::uuid, p_payment_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7a:allocation-request:' || p_request_id::text, 9281)
    );

    SELECT a.* INTO v_existing
    FROM public.customer_receipt_allocations a
    WHERE a.request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.payment_id IS DISTINCT FROM p_payment_id
            OR v_existing.invoice_id IS DISTINCT FROM p_invoice_id
            OR v_existing.amount IS DISTINCT FROM p_amount
        THEN
            RETURN QUERY SELECT 'customer_receipt_allocation_request_conflict', NULL::uuid, p_payment_id, p_invoice_id,
                NULL::numeric, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;
        SELECT p.amount - COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL), 0)
        INTO v_receipt_unapplied
        FROM public.payments p
        LEFT JOIN public.customer_receipt_allocations a ON a.payment_id = p.id
        LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
        WHERE p.id = v_existing.payment_id
        GROUP BY p.amount;
        SELECT i.balance_due INTO v_invoice_outstanding
        FROM public.invoices i
        WHERE i.id = v_existing.invoice_id;
        RETURN QUERY
        SELECT NULL::text, v_existing.id, v_existing.payment_id, v_existing.invoice_id,
            v_existing.amount, v_receipt_unapplied, v_invoice_outstanding, true;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7a:receipt:' || p_payment_id::text, 9281)
    );

    SELECT p.* INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'customer_receipt_not_found', NULL::uuid, p_payment_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF v_payment.invoice_id IS NOT NULL THEN
        RETURN QUERY SELECT 'payment_already_invoice_linked', NULL::uuid, p_payment_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF COALESCE(v_payment.is_deleted, false) OR v_payment.status <> 'confirmed' THEN
        RETURN QUERY SELECT 'customer_receipt_not_active', NULL::uuid, p_payment_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM public.customer_receipt_reversals r WHERE r.payment_id = p_payment_id) THEN
        RETURN QUERY SELECT 'customer_receipt_reversed', NULL::uuid, p_payment_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT i.service_id INTO v_service_id
    FROM public.invoices i
    WHERE i.id = p_invoice_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found', NULL::uuid, p_payment_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF v_service_id IS NOT NULL THEN
        SELECT s.status INTO v_service_status
        FROM public.services s
        WHERE s.id = v_service_id
        FOR UPDATE;
        IF NOT FOUND THEN
            RETURN QUERY SELECT 'invoice_not_found', NULL::uuid, p_payment_id, p_invoice_id,
                NULL::numeric, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;
    END IF;

    SELECT i.* INTO v_invoice
    FROM public.invoices i
    WHERE i.id = p_invoice_id
      AND (v_service_id IS NULL OR i.service_id = v_service_id)
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found', NULL::uuid, p_payment_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF COALESCE(v_invoice.is_deleted, false) OR v_invoice.status NOT IN ('sent', 'partial') THEN
        RETURN QUERY SELECT 'invoice_not_payable', NULL::uuid, p_payment_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF v_payment.customer_id IS DISTINCT FROM v_invoice.customer_id THEN
        RETURN QUERY SELECT 'customer_mismatch', NULL::uuid, p_payment_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL), 0)
    INTO v_receipt_allocated
    FROM public.customer_receipt_allocations a
    LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
    WHERE a.payment_id = p_payment_id;
    v_receipt_unapplied := v_payment.amount - v_receipt_allocated;

    SELECT COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL AND rr.id IS NULL), 0)
    INTO v_invoice_allocated
    FROM public.customer_receipt_allocations a
    LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
    LEFT JOIN public.customer_receipt_reversals rr ON rr.payment_id = a.payment_id
    WHERE a.invoice_id = p_invoice_id;
    v_invoice_outstanding := COALESCE(v_invoice.grand_total, 0) - v_invoice_allocated;

    IF v_invoice.amount_paid IS DISTINCT FROM v_invoice_allocated
        OR v_invoice.balance_due IS DISTINCT FROM v_invoice_outstanding
    THEN
        RETURN QUERY SELECT 'invoice_settlement_summary_mismatch', NULL::uuid, p_payment_id, p_invoice_id,
            v_invoice_allocated, v_receipt_unapplied, v_invoice.balance_due, false;
        RETURN;
    END IF;
    IF EXISTS (
        SELECT 1
        FROM public.customer_receipt_allocations a
        LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
        WHERE a.payment_id = p_payment_id AND a.invoice_id = p_invoice_id AND ar.id IS NULL
    ) THEN
        RETURN QUERY SELECT 'customer_receipt_allocation_exists', NULL::uuid, p_payment_id, p_invoice_id,
            v_invoice_allocated, v_receipt_unapplied, v_invoice.balance_due, false;
        RETURN;
    END IF;
    IF p_amount > v_receipt_unapplied THEN
        RETURN QUERY SELECT 'receipt_allocation_exceeds_unapplied', NULL::uuid, p_payment_id, p_invoice_id,
            v_invoice_allocated, v_receipt_unapplied, v_invoice.balance_due, false;
        RETURN;
    END IF;
    IF p_amount > v_invoice_outstanding THEN
        RETURN QUERY SELECT 'receipt_allocation_exceeds_outstanding', NULL::uuid, p_payment_id, p_invoice_id,
            v_invoice_allocated, v_receipt_unapplied, v_invoice.balance_due, false;
        RETURN;
    END IF;

    PERFORM set_config('g7.w7a_rpc_context', 'on', true);
    INSERT INTO public.customer_receipt_allocations(
        payment_id, invoice_id, customer_id, amount, allocated_at, allocated_by, request_id
    ) VALUES (
        p_payment_id, p_invoice_id, v_payment.customer_id, p_amount, v_now, p_user_id, p_request_id
    ) RETURNING id INTO v_allocation_id;

    UPDATE public.invoices i
    SET amount_paid = v_invoice.amount_paid + p_amount,
        balance_due = v_invoice.balance_due - p_amount,
        status = CASE WHEN v_invoice.balance_due - p_amount = 0 THEN 'paid' ELSE 'partial' END,
        updated_by = p_user_id,
        updated_at = v_now
    WHERE i.id = p_invoice_id;

    IF v_invoice.invoice_type = 'deposit'
        AND v_invoice.balance_due - p_amount = 0
        AND v_service_id IS NOT NULL
        AND v_service_status = 'Approved'
    THEN
        UPDATE public.services
        SET status = 'Deposit Paid', updated_by = p_user_id, updated_at = v_now
        WHERE id = v_service_id;

        INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
        VALUES (
            'status_change', 'service', v_service_id, p_user_id,
            jsonb_build_object(
                'event_type', 'service_status_changed',
                'from_status', 'Approved',
                'to_status', 'Deposit Paid',
                'trigger', 'deposit_payment_confirmed',
                'invoice_id', p_invoice_id,
                'payment_id', p_payment_id,
                'allocation_id', v_allocation_id,
                'amount', p_amount,
                'actor_id', p_user_id,
                'transaction_timestamp', v_now
            ),
            v_now
        );
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'customer_receipt_allocated', 'customer_receipt_allocation', v_allocation_id, p_user_id,
        jsonb_build_object(
            'operation', 'allocate_customer_receipt',
            'request_id', p_request_id,
            'payment_id', p_payment_id,
            'invoice_id', p_invoice_id,
            'customer_id', v_payment.customer_id,
            'amount', p_amount,
            'new_invoice_amount_paid', v_invoice.amount_paid + p_amount,
            'new_invoice_balance_due', v_invoice.balance_due - p_amount,
            'revenue_classification', 'none',
            'tax_classification', 'inactive'
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_allocation_id, p_payment_id, p_invoice_id,
        v_invoice_allocated + p_amount, v_receipt_unapplied - p_amount,
        v_invoice.balance_due - p_amount, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_customer_receipt_allocation(
    p_allocation_id uuid,
    p_reason text,
    p_user_id text,
    p_request_id uuid
)
RETURNS TABLE(
    error_code text,
    allocation_id uuid,
    payment_id uuid,
    invoice_id uuid,
    restored_receipt_unapplied_amount numeric,
    restored_invoice_balance_due numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_allocation public.customer_receipt_allocations%ROWTYPE;
    v_payment public.payments%ROWTYPE;
    v_invoice public.invoices%ROWTYPE;
    v_service_id uuid;
    v_service_status text;
    v_existing public.customer_receipt_allocation_reversals%ROWTYPE;
    v_receipt_allocated numeric := 0;
    v_invoice_allocated numeric := 0;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_allocation_id IS NULL OR p_request_id IS NULL
        OR NULLIF(btrim(p_reason), '') IS NULL
        OR char_length(btrim(p_reason)) < 5 OR char_length(btrim(p_reason)) > 2000
        OR NULLIF(btrim(p_user_id), '') IS NULL
    THEN
        RETURN QUERY SELECT 'invalid_customer_receipt_allocation_reversal_input', p_allocation_id,
            NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7a:allocation-reversal-request:' || p_request_id::text, 9281)
    );

    SELECT r.* INTO v_existing
    FROM public.customer_receipt_allocation_reversals r
    WHERE r.request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.allocation_id IS DISTINCT FROM p_allocation_id
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
        THEN
            RETURN QUERY SELECT 'customer_receipt_allocation_reversal_request_conflict', p_allocation_id,
                NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;
        SELECT a.* INTO v_allocation
        FROM public.customer_receipt_allocations a
        WHERE a.id = p_allocation_id;
        SELECT p.amount - COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL), 0)
        INTO v_receipt_allocated
        FROM public.payments p
        LEFT JOIN public.customer_receipt_allocations a ON a.payment_id = p.id
        LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
        WHERE p.id = v_allocation.payment_id
        GROUP BY p.amount;
        SELECT i.balance_due INTO v_invoice_allocated
        FROM public.invoices i
        WHERE i.id = v_allocation.invoice_id;
        RETURN QUERY SELECT NULL::text, p_allocation_id, v_allocation.payment_id, v_allocation.invoice_id,
            v_receipt_allocated, v_invoice_allocated, true;
        RETURN;
    END IF;

    SELECT a.* INTO v_allocation
    FROM public.customer_receipt_allocations a
    WHERE a.id = p_allocation_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'customer_receipt_allocation_not_found', p_allocation_id,
            NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7a:receipt:' || v_allocation.payment_id::text, 9281)
    );
    SELECT p.* INTO v_payment FROM public.payments p WHERE p.id = v_allocation.payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'customer_receipt_not_found', p_allocation_id,
            v_allocation.payment_id, v_allocation.invoice_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM public.customer_receipt_reversals r WHERE r.payment_id = v_allocation.payment_id) THEN
        RETURN QUERY SELECT 'customer_receipt_reversed', p_allocation_id,
            v_allocation.payment_id, v_allocation.invoice_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF v_payment.invoice_id IS NOT NULL THEN
        RETURN QUERY SELECT 'invoice_payment_allocation_reversal_unsupported', p_allocation_id,
            v_allocation.payment_id, v_allocation.invoice_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM public.customer_receipt_allocation_reversals r WHERE r.allocation_id = p_allocation_id) THEN
        RETURN QUERY SELECT 'customer_receipt_allocation_already_reversed', p_allocation_id,
            v_allocation.payment_id, v_allocation.invoice_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT i.service_id INTO v_service_id FROM public.invoices i WHERE i.id = v_allocation.invoice_id;
    IF v_service_id IS NOT NULL THEN
        SELECT s.status INTO v_service_status FROM public.services s WHERE s.id = v_service_id FOR UPDATE;
    END IF;
    SELECT i.* INTO v_invoice
    FROM public.invoices i
    WHERE i.id = v_allocation.invoice_id
      AND (v_service_id IS NULL OR i.service_id = v_service_id)
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found', p_allocation_id,
            v_allocation.payment_id, v_allocation.invoice_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL), 0)
    INTO v_receipt_allocated
    FROM public.customer_receipt_allocations a
    LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
    WHERE a.payment_id = v_allocation.payment_id;
    SELECT COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL AND rr.id IS NULL), 0)
    INTO v_invoice_allocated
    FROM public.customer_receipt_allocations a
    LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
    LEFT JOIN public.customer_receipt_reversals rr ON rr.payment_id = a.payment_id
    WHERE a.invoice_id = v_allocation.invoice_id;
    IF v_invoice.amount_paid IS DISTINCT FROM v_invoice_allocated
        OR v_invoice.balance_due IS DISTINCT FROM (COALESCE(v_invoice.grand_total, 0) - v_invoice_allocated)::numeric
    THEN
        RETURN QUERY SELECT 'invoice_settlement_summary_mismatch', p_allocation_id,
            v_allocation.payment_id, v_allocation.invoice_id, v_payment.amount - v_receipt_allocated,
            v_invoice.balance_due, false;
        RETURN;
    END IF;

    IF v_invoice.invoice_type = 'deposit'
        AND v_invoice.balance_due + v_allocation.amount > v_invoice.grand_total
    THEN
        RETURN QUERY SELECT 'invoice_settlement_summary_mismatch', p_allocation_id,
            v_allocation.payment_id, v_allocation.invoice_id, v_payment.amount - v_receipt_allocated,
            v_invoice.balance_due, false;
        RETURN;
    END IF;
    IF v_invoice.invoice_type = 'deposit'
        AND v_invoice.balance_due + v_allocation.amount > 0
        AND v_service_status IN ('In Progress', 'Completed', 'Cancelled')
    THEN
        RETURN QUERY SELECT 'deposit_service_lifecycle_correction_required', p_allocation_id,
            v_allocation.payment_id, v_allocation.invoice_id, v_payment.amount - v_receipt_allocated,
            v_invoice.balance_due, false;
        RETURN;
    END IF;

    PERFORM set_config('g7.w7a_rpc_context', 'on', true);
    INSERT INTO public.customer_receipt_allocation_reversals(
        allocation_id, reason, reversed_by, reversed_at, request_id, created_at
    ) VALUES (
        p_allocation_id, btrim(p_reason), p_user_id, v_now, p_request_id, v_now
    );

    UPDATE public.invoices i
    SET amount_paid = v_invoice.amount_paid - v_allocation.amount,
        balance_due = v_invoice.balance_due + v_allocation.amount,
        status = CASE WHEN v_invoice.balance_due + v_allocation.amount = v_invoice.grand_total THEN 'sent' ELSE 'partial' END,
        updated_by = p_user_id,
        updated_at = v_now
    WHERE i.id = v_allocation.invoice_id;

    IF v_invoice.invoice_type = 'deposit'
        AND v_invoice.balance_due + v_allocation.amount > 0
        AND v_service_id IS NOT NULL
        AND v_service_status = 'Deposit Paid'
    THEN
        UPDATE public.services
        SET status = 'Approved', updated_by = p_user_id, updated_at = v_now
        WHERE id = v_service_id;

        INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
        VALUES (
            'status_change', 'service', v_service_id, p_user_id,
            jsonb_build_object(
                'event_type', 'service_status_changed',
                'from_status', 'Deposit Paid',
                'to_status', 'Approved',
                'trigger', 'customer_receipt_allocation_reversed',
                'invoice_id', v_allocation.invoice_id,
                'payment_id', v_allocation.payment_id,
                'allocation_id', p_allocation_id,
                'amount', v_allocation.amount,
                'actor_id', p_user_id,
                'transaction_timestamp', v_now
            ),
            v_now
        );
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'customer_receipt_allocation_reversed', 'customer_receipt_allocation', p_allocation_id, p_user_id,
        jsonb_build_object(
            'operation', 'reverse_customer_receipt_allocation',
            'request_id', p_request_id,
            'payment_id', v_allocation.payment_id,
            'invoice_id', v_allocation.invoice_id,
            'amount', v_allocation.amount,
            'reason', btrim(p_reason),
            'service_status_preserved', v_service_status
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_allocation_id, v_allocation.payment_id, v_allocation.invoice_id,
        v_payment.amount - (v_receipt_allocated - v_allocation.amount),
        v_invoice.balance_due + v_allocation.amount, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_customer_receipt(
    p_payment_id uuid,
    p_reason text,
    p_user_id text,
    p_request_id uuid
)
RETURNS TABLE(
    error_code text,
    payment_id uuid,
    payment_number text,
    receipt_amount numeric,
    allocated_amount numeric,
    unapplied_amount numeric,
    receipt_status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_payment public.payments%ROWTYPE;
    v_existing public.customer_receipt_reversals%ROWTYPE;
    v_allocated numeric := 0;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_payment_id IS NULL OR p_request_id IS NULL
        OR NULLIF(btrim(p_reason), '') IS NULL
        OR char_length(btrim(p_reason)) < 5 OR char_length(btrim(p_reason)) > 2000
        OR NULLIF(btrim(p_user_id), '') IS NULL
    THEN
        RETURN QUERY SELECT 'invalid_customer_receipt_reversal_input', p_payment_id, NULL::text,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7a:receipt-reversal-request:' || p_request_id::text, 9281)
    );

    SELECT r.* INTO v_existing
    FROM public.customer_receipt_reversals r
    WHERE r.request_id = p_request_id;
    IF FOUND THEN
        SELECT p.* INTO v_payment FROM public.payments p WHERE p.id = v_existing.payment_id;
        IF v_existing.payment_id IS DISTINCT FROM p_payment_id OR v_existing.reason IS DISTINCT FROM btrim(p_reason) THEN
            RETURN QUERY SELECT 'customer_receipt_reversal_request_conflict', p_payment_id, NULL::text,
                NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, p_payment_id, v_payment.payment_number, v_payment.amount,
            0::numeric, 0::numeric, 'reversed'::text, true;
        RETURN;
    END IF;

    SELECT p.* INTO v_payment
    FROM public.payments p
    WHERE p.id = p_payment_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'customer_receipt_not_found', p_payment_id, NULL::text,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;
    IF v_payment.invoice_id IS NOT NULL THEN
        RETURN QUERY SELECT 'payment_already_invoice_linked', p_payment_id, v_payment.payment_number,
            v_payment.amount, NULL::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM public.customer_receipt_reversals r WHERE r.payment_id = p_payment_id) THEN
        RETURN QUERY SELECT 'customer_receipt_already_reversed', p_payment_id, v_payment.payment_number,
            v_payment.amount, 0::numeric, 0::numeric, 'reversed'::text, false;
        RETURN;
    END IF;

    SELECT COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL), 0)
    INTO v_allocated
    FROM public.customer_receipt_allocations a
    LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
    WHERE a.payment_id = p_payment_id;
    IF v_allocated <> 0 THEN
        RETURN QUERY SELECT 'customer_receipt_has_active_allocations', p_payment_id, v_payment.payment_number,
            v_payment.amount, v_allocated, v_payment.amount - v_allocated, 'partially_allocated'::text, false;
        RETURN;
    END IF;

    PERFORM set_config('g7.w7a_rpc_context', 'on', true);
    INSERT INTO public.customer_receipt_reversals(
        payment_id, reason, reversed_by, reversed_at, request_id, created_at
    ) VALUES (
        p_payment_id, btrim(p_reason), p_user_id, v_now, p_request_id, v_now
    );

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'customer_receipt_reversed', 'customer_receipt', p_payment_id, p_user_id,
        jsonb_build_object(
            'operation', 'reverse_customer_receipt',
            'request_id', p_request_id,
            'payment_id', p_payment_id,
            'amount', v_payment.amount,
            'reason', btrim(p_reason),
            'settlement_effect', 'none'
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_payment_id, v_payment.payment_number,
        v_payment.amount, 0::numeric, 0::numeric, 'reversed'::text, false;
END;
$$;

-- Preserve the existing Invoice Payment contract while creating exactly one
-- Payment/Receipt row plus exactly one Allocation in the same transaction.
CREATE OR REPLACE FUNCTION public._record_invoice_payment_before_service_audit(
    p_invoice_id uuid,
    p_amount numeric,
    p_date date,
    p_method text,
    p_reference text,
    p_user_id text,
    p_request_id uuid
)
RETURNS TABLE(
    error_code text,
    payment_id uuid,
    payment_number text,
    amount_paid numeric,
    balance_due numeric,
    invoice_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
    v_invoice_record record;
    v_payment_record record;
    v_payment_number text;
    v_payment_id uuid;
    v_allocation_id uuid;
    v_new_amount_paid numeric;
    v_new_balance_due numeric;
    v_new_status text;
    v_invoice_allocated numeric := 0;
    v_service_status text;
    v_now timestamptz := transaction_timestamp();
    v_norm_reference text;
BEGIN
    IF p_invoice_id IS NULL OR p_request_id IS NULL OR p_amount IS NULL
        OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
        OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR p_date IS NULL OR NULLIF(btrim(p_user_id), '') IS NULL
        OR lower(NULLIF(btrim(p_method), '')) NOT IN ('bank_transfer', 'cash', 'cheque', 'online')
    THEN
        RETURN QUERY SELECT 'invalid_payment_input', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;

    v_norm_reference := NULLIF(btrim(p_reference), '');
    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(p_request_id::text, 8583)
    );

    SELECT py.* INTO v_payment_record
    FROM public.payments py
    WHERE py.request_id = p_request_id;
    IF FOUND THEN
        IF v_payment_record.invoice_id IS DISTINCT FROM p_invoice_id
            OR v_payment_record.amount IS DISTINCT FROM p_amount
            OR v_payment_record.date IS DISTINCT FROM p_date
            OR v_payment_record.method IS DISTINCT FROM lower(btrim(p_method))
            OR COALESCE(btrim(v_payment_record.reference), '') IS DISTINCT FROM COALESCE(v_norm_reference, '')
        THEN
            RETURN QUERY SELECT 'idempotency_conflict', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_payment_record.id, v_payment_record.payment_number,
            v_payment_record.invoice_amount_paid_after, v_payment_record.invoice_balance_due_after,
            v_payment_record.invoice_status_after;
        RETURN;
    END IF;

    SELECT i.service_id INTO v_service_id
    FROM public.invoices i WHERE i.id = p_invoice_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;
    IF v_service_id IS NOT NULL THEN
        SELECT s.status INTO v_service_status FROM public.services s WHERE s.id = v_service_id FOR UPDATE;
        IF NOT FOUND THEN
            RETURN QUERY SELECT 'invoice_not_found', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
            RETURN;
        END IF;
    END IF;

    SELECT i.id, i.customer_id, i.amount_paid, i.balance_due, i.status, i.is_deleted,
           i.invoice_type, i.grand_total, i.service_id
    INTO v_invoice_record
    FROM public.invoices i
    WHERE i.id = p_invoice_id
      AND (v_service_id IS NULL OR i.service_id = v_service_id)
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;
    IF COALESCE(v_invoice_record.is_deleted, false) THEN
        RETURN QUERY SELECT 'invoice_deleted', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;
    IF v_invoice_record.status NOT IN ('sent', 'partial') THEN
        RETURN QUERY SELECT 'invoice_not_payable', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;
    IF p_amount > v_invoice_record.balance_due THEN
        RETURN QUERY SELECT 'payment_exceeds_balance', NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, NULL::text;
        RETURN;
    END IF;

    SELECT COALESCE(SUM(a.amount) FILTER (WHERE ar.id IS NULL AND rr.id IS NULL), 0)
    INTO v_invoice_allocated
    FROM public.customer_receipt_allocations a
    LEFT JOIN public.customer_receipt_allocation_reversals ar ON ar.allocation_id = a.id
    LEFT JOIN public.customer_receipt_reversals rr ON rr.payment_id = a.payment_id
    WHERE a.invoice_id = p_invoice_id;
    IF v_invoice_record.amount_paid IS DISTINCT FROM v_invoice_allocated
        OR v_invoice_record.balance_due IS DISTINCT FROM (COALESCE(v_invoice_record.grand_total, 0) - v_invoice_allocated)::numeric
    THEN
        RETURN QUERY SELECT 'invoice_settlement_summary_mismatch', NULL::uuid, NULL::text,
            v_invoice_record.amount_paid, v_invoice_record.balance_due, v_invoice_record.status;
        RETURN;
    END IF;

    PERFORM set_config('g7.w7a_rpc_context', 'on', true);
    v_payment_number := public.generate_document_number('payment');
    v_new_amount_paid := v_invoice_record.amount_paid + p_amount;
    v_new_balance_due := v_invoice_record.balance_due - p_amount;
    v_new_status := CASE WHEN v_new_balance_due = 0 THEN 'paid' ELSE 'partial' END;

    INSERT INTO public.payments(
        payment_number, invoice_id, customer_id, date, amount, method, reference, status,
        request_id, invoice_amount_paid_after, invoice_balance_due_after, invoice_status_after,
        created_by, updated_by
    ) VALUES (
        v_payment_number, p_invoice_id, v_invoice_record.customer_id, p_date, p_amount,
        lower(btrim(p_method)), v_norm_reference, 'confirmed', p_request_id,
        v_new_amount_paid, v_new_balance_due, v_new_status, p_user_id, p_user_id
    ) RETURNING id INTO v_payment_id;

    INSERT INTO public.customer_receipt_allocations(
        payment_id, invoice_id, customer_id, amount, allocated_at, allocated_by, request_id, created_at
    ) VALUES (
        v_payment_id, p_invoice_id, v_invoice_record.customer_id, p_amount, v_now, p_user_id, p_request_id, v_now
    ) RETURNING id INTO v_allocation_id;

    UPDATE public.invoices
    SET amount_paid = v_new_amount_paid,
        balance_due = v_new_balance_due,
        status = v_new_status,
        updated_by = p_user_id,
        updated_at = v_now
    WHERE id = p_invoice_id;

    IF v_invoice_record.invoice_type = 'deposit'
        AND v_new_balance_due = 0
        AND v_service_id IS NOT NULL
        AND v_service_status = 'Approved'
    THEN
        UPDATE public.services
        SET status = 'Deposit Paid', updated_at = v_now
        WHERE id = v_service_id;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'payment_recorded', 'invoice', p_invoice_id, p_user_id,
        jsonb_build_object(
            'payment_id', v_payment_id,
            'payment_number', v_payment_number,
            'allocation_id', v_allocation_id,
            'request_id', p_request_id,
            'amount', p_amount,
            'method', lower(btrim(p_method)),
            'new_status', v_new_status,
            'service_id', v_service_id,
            'deposit_transition', (
                v_invoice_record.invoice_type = 'deposit'
                AND v_new_balance_due = 0
                AND v_service_id IS NOT NULL
                AND v_service_status = 'Approved'
            ),
            'receipt_type', 'customer_receipt'
        ),
        v_now
    );
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'customer_receipt_allocated', 'customer_receipt_allocation', v_allocation_id, p_user_id,
        jsonb_build_object(
            'operation', 'record_invoice_payment_compatibility',
            'payment_id', v_payment_id,
            'invoice_id', p_invoice_id,
            'amount', p_amount,
            'request_id', p_request_id
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_payment_id, v_payment_number,
        v_new_amount_paid, v_new_balance_due, v_new_status;
END;
$$;

ALTER FUNCTION public._record_invoice_payment_before_service_audit(uuid,numeric,date,text,text,text,uuid) OWNER TO postgres;
ALTER FUNCTION public.record_customer_receipt(uuid,numeric,date,text,text,text,text,uuid) OWNER TO postgres;
ALTER FUNCTION public.allocate_customer_receipt(uuid,uuid,numeric,text,uuid) OWNER TO postgres;
ALTER FUNCTION public.reverse_customer_receipt_allocation(uuid,text,text,uuid) OWNER TO postgres;
ALTER FUNCTION public.reverse_customer_receipt(uuid,text,text,uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.record_customer_receipt(uuid,numeric,date,text,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.allocate_customer_receipt(uuid,uuid,numeric,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_customer_receipt_allocation(uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_customer_receipt(uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._record_invoice_payment_before_service_audit(uuid,numeric,date,text,text,text,uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_customer_receipt(uuid,numeric,date,text,text,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_customer_receipt(uuid,uuid,numeric,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_customer_receipt_allocation(uuid,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_customer_receipt(uuid,text,text,uuid) TO service_role;

ALTER TABLE public.customer_receipt_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_receipt_allocation_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_receipt_reversals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_receipt_allocations,
    public.customer_receipt_allocation_reversals,
    public.customer_receipt_reversals
FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.customer_receipt_allocations,
    public.customer_receipt_allocation_reversals,
    public.customer_receipt_reversals TO service_role;
REVOKE ALL ON TABLE public.customer_receipt_balances, public.customer_invoice_settlement_balances
FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.customer_receipt_balances, public.customer_invoice_settlement_balances TO service_role;
REVOKE ALL ON FUNCTION public.prevent_w7a_append_only_mutation() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_independent_customer_receipt_mutation() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.require_w7a_rpc_context() FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
    action = ANY (ARRAY[
        'create'::text, 'update'::text, 'delete'::text, 'restore'::text, 'status_change'::text,
        'payment_recorded'::text, 'correction'::text,
        'procurement_package_created'::text, 'procurement_package_updated'::text,
        'procurement_package_requirements_set'::text, 'procurement_package_supplier_selected'::text,
        'procurement_package_supplier_cleared'::text, 'expense_submitted'::text,
        'expense_approved'::text, 'expense_rejected'::text, 'expense_cancelled'::text,
        'expense_evidence_exception_recorded'::text, 'expense_evidence_exception_disposed'::text,
        'expense_document_attached'::text, 'expense_reimbursement_settled'::text,
        'cash_advance_requested'::text, 'cash_advance_approved'::text, 'cash_advance_rejected'::text,
        'cash_advance_cancelled'::text, 'cash_advance_issued'::text,
        'cash_advance_expense_settled'::text, 'cash_advance_returned'::text,
        'petty_cash_transaction_recorded'::text, 'expense_finance_reviewed'::text,
        'supplier_bill_recorded'::text, 'supplier_bill_updated'::text,
        'supplier_bill_documents_attached'::text, 'supplier_bill_approved'::text,
        'supplier_payment_recorded'::text, 'supplier_payment_reversed'::text,
        'supplier_advance_authorized'::text, 'supplier_advance_payment_recorded'::text,
        'supplier_advance_payment_reversed'::text, 'supplier_advance_allocated'::text,
        'supplier_advance_allocation_corrected'::text, 'supplier_advance_refund_recorded'::text,
        'customer_receipt_recorded'::text, 'customer_receipt_allocated'::text,
        'customer_receipt_allocation_reversed'::text, 'customer_receipt_reversed'::text
    ])
);

COMMENT ON TABLE public.customer_receipt_allocations IS
    'Append-only applications of independent Customer Receipts to same-customer eligible Invoices; not revenue, tax, credit, refund, or GL posting.';
COMMENT ON TABLE public.customer_receipt_allocation_reversals IS
    'Append-only correction history for Customer Receipt Allocations; unallocation must precede independent receipt reversal.';
COMMENT ON TABLE public.customer_receipt_reversals IS
    'Append-only reversal history for fully unapplied independent Customer Receipts; receipt history remains immutable.';
COMMENT ON VIEW public.customer_receipt_balances IS
    'Bounded Customer Receipt projection: receipt, allocated, unapplied, and reversal status.';
COMMENT ON VIEW public.customer_invoice_settlement_balances IS
    'Invoice settlement summary derived from active Customer Receipt Allocations; invoice stored summaries remain the operational summary fields.';

COMMIT;
