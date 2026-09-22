-- W7C Customer Credits, Refunds, and Governed Corrections.
--
-- Additive only.  This migration preserves issued invoices, W7A receipt and
-- allocation history, and W7-P0A commercial authority lineage.  It introduces
-- non-VAT Internal Credit Adjustments, actual Customer Refund events, and
-- retained Customer Credit Applications as separate append-only events.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.customers') IS NULL
        OR to_regclass('public.services') IS NULL
        OR to_regclass('public.invoices') IS NULL
        OR to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regclass('public.customer_receipt_allocations') IS NULL
        OR to_regclass('public.customer_receipt_allocation_reversals') IS NULL
        OR to_regclass('public.customer_invoice_settlement_balances') IS NULL
        OR to_regprocedure('public._abs_get_service_invoice_exposure(uuid)') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w7c_required_foundation_missing';
    END IF;

    IF to_regclass('public.customer_internal_credit_adjustments') IS NOT NULL
        OR to_regclass('public.customer_refunds') IS NOT NULL
        OR to_regclass('public.customer_credit_applications') IS NOT NULL
        OR to_regclass('public.customer_internal_credit_adjustment_reversals') IS NOT NULL
        OR to_regclass('public.customer_refund_reversals') IS NOT NULL
        OR to_regclass('public.customer_credit_application_reversals') IS NOT NULL
        OR to_regclass('public.customer_credit_balances') IS NOT NULL
        OR to_regclass('public.customer_invoice_receivable_balances') IS NOT NULL
        OR to_regprocedure('public.record_customer_internal_credit_adjustment(uuid,uuid,uuid,numeric,text,text,date,uuid,text,uuid,uuid)') IS NOT NULL
        OR to_regprocedure('public.refund_customer_credit(uuid,uuid,numeric,date,text,text,text,uuid,text)') IS NOT NULL
        OR to_regprocedure('public.apply_customer_credit(uuid,uuid,uuid,numeric,date,text,uuid,text)') IS NOT NULL
        OR to_regprocedure('public.reverse_customer_internal_credit_adjustment(uuid,uuid,numeric,date,text,uuid,text)') IS NOT NULL
        OR to_regprocedure('public.reverse_customer_refund(uuid,uuid,numeric,date,text,uuid,text)') IS NOT NULL
        OR to_regprocedure('public.reverse_customer_credit_application(uuid,uuid,numeric,date,text,uuid,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w7c_objects_already_exist';
    END IF;
END;
$$;

CREATE TABLE public.customer_internal_credit_adjustments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    source_approved_billing_scope_id uuid,
    successor_approved_billing_scope_id uuid,
    amount numeric(12,2) NOT NULL,
    reason_code text NOT NULL,
    reason text NOT NULL,
    effective_date date NOT NULL,
    created_by text NOT NULL,
    request_id uuid NOT NULL UNIQUE,
    net_receivable_after numeric(12,2) NOT NULL,
    customer_credit_balance_after numeric(12,2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT customer_internal_credit_adjustments_amount_check
        CHECK (amount > 0 AND amount <= 9999999999.99 AND amount = round(amount, 2)),
    CONSTRAINT customer_internal_credit_adjustments_reason_code_check
        CHECK (reason_code IN ('customer_scope_reduction', 'invoice_correction', 'pricing_correction', 'duplicate_charge', 'other')),
    CONSTRAINT customer_internal_credit_adjustments_reason_check
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT customer_internal_credit_adjustments_actor_check
        CHECK (char_length(btrim(created_by)) BETWEEN 1 AND 255),
    CONSTRAINT customer_internal_credit_adjustments_source_pair_check
        CHECK ((source_approved_billing_scope_id IS NULL) = (successor_approved_billing_scope_id IS NULL)),
    CONSTRAINT customer_internal_credit_adjustments_net_check
        CHECK (net_receivable_after >= 0 AND net_receivable_after = round(net_receivable_after, 2)),
    CONSTRAINT customer_internal_credit_adjustments_balance_check
        CHECK (customer_credit_balance_after >= 0 AND customer_credit_balance_after = round(customer_credit_balance_after, 2)),
    CONSTRAINT customer_internal_credit_adjustments_source_scope_service_fkey
        FOREIGN KEY (source_approved_billing_scope_id, service_id)
        REFERENCES public.approved_billing_scopes(id, service_id)
        ON DELETE RESTRICT,
    CONSTRAINT customer_internal_credit_adjustments_successor_scope_service_fkey
        FOREIGN KEY (successor_approved_billing_scope_id, service_id)
        REFERENCES public.approved_billing_scopes(id, service_id)
        ON DELETE RESTRICT
);

CREATE TABLE public.customer_refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    source_credit_adjustment_id uuid NOT NULL REFERENCES public.customer_internal_credit_adjustments(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL,
    business_date date NOT NULL,
    reason text NOT NULL,
    refund_method text NOT NULL,
    reference text,
    created_by text NOT NULL,
    request_id uuid NOT NULL UNIQUE,
    remaining_source_credit_after numeric(12,2) NOT NULL,
    customer_credit_balance_after numeric(12,2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT customer_refunds_amount_check
        CHECK (amount > 0 AND amount <= 9999999999.99 AND amount = round(amount, 2)),
    CONSTRAINT customer_refunds_reason_check
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT customer_refunds_method_check
        CHECK (refund_method IN ('bank_transfer', 'cash', 'cheque', 'online')),
    CONSTRAINT customer_refunds_reference_check
        CHECK (char_length(COALESCE(btrim(reference), '')) <= 200),
    CONSTRAINT customer_refunds_actor_check
        CHECK (char_length(btrim(created_by)) BETWEEN 1 AND 255),
    CONSTRAINT customer_refunds_remaining_check
        CHECK (remaining_source_credit_after >= 0 AND remaining_source_credit_after = round(remaining_source_credit_after, 2)),
    CONSTRAINT customer_refunds_balance_check
        CHECK (customer_credit_balance_after >= 0 AND customer_credit_balance_after = round(customer_credit_balance_after, 2))
);

CREATE TABLE public.customer_credit_applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    source_credit_adjustment_id uuid NOT NULL REFERENCES public.customer_internal_credit_adjustments(id) ON DELETE RESTRICT,
    target_invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL,
    business_date date NOT NULL,
    reason text NOT NULL,
    created_by text NOT NULL,
    request_id uuid NOT NULL UNIQUE,
    remaining_source_credit_after numeric(12,2) NOT NULL,
    target_outstanding_after numeric(12,2) NOT NULL,
    customer_credit_balance_after numeric(12,2) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT customer_credit_applications_amount_check
        CHECK (amount > 0 AND amount <= 9999999999.99 AND amount = round(amount, 2)),
    CONSTRAINT customer_credit_applications_reason_check
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT customer_credit_applications_actor_check
        CHECK (char_length(btrim(created_by)) BETWEEN 1 AND 255),
    CONSTRAINT customer_credit_applications_remaining_check
        CHECK (remaining_source_credit_after >= 0 AND remaining_source_credit_after = round(remaining_source_credit_after, 2)),
    CONSTRAINT customer_credit_applications_outstanding_check
        CHECK (target_outstanding_after >= 0 AND target_outstanding_after = round(target_outstanding_after, 2)),
    CONSTRAINT customer_credit_applications_balance_check
        CHECK (customer_credit_balance_after >= 0 AND customer_credit_balance_after = round(customer_credit_balance_after, 2))
);

CREATE TABLE public.customer_internal_credit_adjustment_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    source_credit_adjustment_id uuid NOT NULL REFERENCES public.customer_internal_credit_adjustments(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL,
    effective_date date NOT NULL,
    reason text NOT NULL,
    created_by text NOT NULL,
    request_id uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT customer_internal_credit_adjustment_reversals_amount_check
        CHECK (amount > 0 AND amount <= 9999999999.99 AND amount = round(amount, 2)),
    CONSTRAINT customer_internal_credit_adjustment_reversals_reason_check
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT customer_internal_credit_adjustment_reversals_actor_check
        CHECK (char_length(btrim(created_by)) BETWEEN 1 AND 255)
);

CREATE TABLE public.customer_refund_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    source_refund_id uuid NOT NULL REFERENCES public.customer_refunds(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL,
    business_date date NOT NULL,
    reason text NOT NULL,
    created_by text NOT NULL,
    request_id uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT customer_refund_reversals_amount_check
        CHECK (amount > 0 AND amount <= 9999999999.99 AND amount = round(amount, 2)),
    CONSTRAINT customer_refund_reversals_reason_check
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT customer_refund_reversals_actor_check
        CHECK (char_length(btrim(created_by)) BETWEEN 1 AND 255)
);

CREATE TABLE public.customer_credit_application_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    source_application_id uuid NOT NULL REFERENCES public.customer_credit_applications(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL,
    business_date date NOT NULL,
    reason text NOT NULL,
    created_by text NOT NULL,
    request_id uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT customer_credit_application_reversals_amount_check
        CHECK (amount > 0 AND amount <= 9999999999.99 AND amount = round(amount, 2)),
    CONSTRAINT customer_credit_application_reversals_reason_check
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT customer_credit_application_reversals_actor_check
        CHECK (char_length(btrim(created_by)) BETWEEN 1 AND 255)
);

CREATE INDEX customer_internal_credit_adjustments_invoice_idx
    ON public.customer_internal_credit_adjustments(invoice_id, effective_date, id);
CREATE INDEX customer_internal_credit_adjustments_customer_idx
    ON public.customer_internal_credit_adjustments(customer_id, effective_date DESC, id DESC);
CREATE INDEX customer_internal_credit_adjustments_service_idx
    ON public.customer_internal_credit_adjustments(service_id, effective_date DESC, id DESC);
CREATE INDEX customer_refunds_source_credit_idx
    ON public.customer_refunds(source_credit_adjustment_id, business_date, id);
CREATE INDEX customer_refunds_customer_idx
    ON public.customer_refunds(customer_id, business_date DESC, id DESC);
CREATE INDEX customer_credit_applications_source_credit_idx
    ON public.customer_credit_applications(source_credit_adjustment_id, business_date, id);
CREATE INDEX customer_credit_applications_target_invoice_idx
    ON public.customer_credit_applications(target_invoice_id, business_date, id);
CREATE INDEX customer_credit_applications_customer_idx
    ON public.customer_credit_applications(customer_id, business_date DESC, id DESC);
CREATE INDEX customer_internal_credit_adjustment_reversals_source_idx
    ON public.customer_internal_credit_adjustment_reversals(source_credit_adjustment_id, effective_date, id);
CREATE INDEX customer_refund_reversals_source_idx
    ON public.customer_refund_reversals(source_refund_id, business_date, id);
CREATE INDEX customer_credit_application_reversals_source_idx
    ON public.customer_credit_application_reversals(source_application_id, business_date, id);

ALTER TABLE public.customer_internal_credit_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credit_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_internal_credit_adjustment_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_refund_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credit_application_reversals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prevent_w7c_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RAISE EXCEPTION USING MESSAGE = 'w7c_append_only_history';
END;
$$;

CREATE OR REPLACE FUNCTION public.require_w7c_rpc_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF COALESCE(current_setting('g7.w7c_rpc_context', true), '') <> 'on' THEN
        RAISE EXCEPTION USING MESSAGE = 'w7c_rpc_only_mutation';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER customer_internal_credit_adjustments_append_only
    BEFORE UPDATE OR DELETE ON public.customer_internal_credit_adjustments
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7c_append_only_mutation();
CREATE TRIGGER customer_refunds_append_only
    BEFORE UPDATE OR DELETE ON public.customer_refunds
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7c_append_only_mutation();
CREATE TRIGGER customer_credit_applications_append_only
    BEFORE UPDATE OR DELETE ON public.customer_credit_applications
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7c_append_only_mutation();
CREATE TRIGGER customer_internal_credit_adjustment_reversals_append_only
    BEFORE UPDATE OR DELETE ON public.customer_internal_credit_adjustment_reversals
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7c_append_only_mutation();
CREATE TRIGGER customer_refund_reversals_append_only
    BEFORE UPDATE OR DELETE ON public.customer_refund_reversals
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7c_append_only_mutation();
CREATE TRIGGER customer_credit_application_reversals_append_only
    BEFORE UPDATE OR DELETE ON public.customer_credit_application_reversals
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7c_append_only_mutation();
CREATE TRIGGER customer_internal_credit_adjustments_rpc_only
    BEFORE INSERT ON public.customer_internal_credit_adjustments
    FOR EACH ROW EXECUTE FUNCTION public.require_w7c_rpc_context();
CREATE TRIGGER customer_refunds_rpc_only
    BEFORE INSERT ON public.customer_refunds
    FOR EACH ROW EXECUTE FUNCTION public.require_w7c_rpc_context();
CREATE TRIGGER customer_credit_applications_rpc_only
    BEFORE INSERT ON public.customer_credit_applications
    FOR EACH ROW EXECUTE FUNCTION public.require_w7c_rpc_context();
CREATE TRIGGER customer_internal_credit_adjustment_reversals_rpc_only
    BEFORE INSERT ON public.customer_internal_credit_adjustment_reversals
    FOR EACH ROW EXECUTE FUNCTION public.require_w7c_rpc_context();
CREATE TRIGGER customer_refund_reversals_rpc_only
    BEFORE INSERT ON public.customer_refund_reversals
    FOR EACH ROW EXECUTE FUNCTION public.require_w7c_rpc_context();
CREATE TRIGGER customer_credit_application_reversals_rpc_only
    BEFORE INSERT ON public.customer_credit_application_reversals
    FOR EACH ROW EXECUTE FUNCTION public.require_w7c_rpc_context();

CREATE OR REPLACE VIEW public.customer_credit_adjustment_balances
WITH (security_invoker = true)
AS
WITH adjustment_reversal_totals AS (
    SELECT source_credit_adjustment_id, sum(amount)::numeric(12,2) AS reversed_amount
    FROM public.customer_internal_credit_adjustment_reversals
    WHERE effective_date <= CURRENT_DATE
    GROUP BY source_credit_adjustment_id
), credit_rows AS (
    SELECT
        c.id AS credit_adjustment_id,
        c.customer_id,
        c.service_id,
        c.invoice_id,
        c.source_approved_billing_scope_id,
        c.successor_approved_billing_scope_id,
        GREATEST(round(c.amount - COALESCE(ar.reversed_amount, 0), 2), 0)::numeric(12,2) AS credited_amount,
        s.grand_total,
        s.allocated_amount,
        c.reason_code,
        c.reason,
        c.effective_date,
        c.created_by,
        c.request_id,
        c.created_at
    FROM public.customer_internal_credit_adjustments c
    JOIN public.customer_invoice_settlement_balances s ON s.invoice_id = c.invoice_id
    LEFT JOIN adjustment_reversal_totals ar ON ar.source_credit_adjustment_id = c.id
    WHERE c.effective_date <= CURRENT_DATE
), ranked_credits AS (
    SELECT
        r.*,
        COALESCE(sum(r.credited_amount) OVER (PARTITION BY r.invoice_id), 0)::numeric(12,2) AS invoice_credited_amount,
        COALESCE(sum(r.credited_amount) OVER (
            PARTITION BY r.invoice_id
            ORDER BY r.effective_date, r.credit_adjustment_id
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ), 0)::numeric(12,2) AS prior_credited_amount
    FROM credit_rows r
), entitled_credits AS (
    SELECT
        r.*,
        GREATEST(
            round(
                LEAST(
                    r.credited_amount,
                    GREATEST(round(r.allocated_amount - (r.grand_total - r.invoice_credited_amount), 2), 0)
                    - r.prior_credited_amount
                ),
                2
            ),
            0
        )::numeric(12,2) AS eligible_credit_amount
    FROM ranked_credits r
), refund_gross AS (
    SELECT source_credit_adjustment_id, sum(amount)::numeric(12,2) AS refunded_amount
    FROM public.customer_refunds
    WHERE business_date <= CURRENT_DATE
    GROUP BY source_credit_adjustment_id
), refund_reversed AS (
    SELECT source_refund_id, sum(amount)::numeric(12,2) AS reversed_amount
    FROM public.customer_refund_reversals
    WHERE business_date <= CURRENT_DATE
    GROUP BY source_refund_id
), refund_totals AS (
    SELECT g.source_credit_adjustment_id,
        GREATEST(round(g.refunded_amount - COALESCE(sum(rr.reversed_amount), 0), 2), 0)::numeric(12,2) AS refunded_amount
    FROM refund_gross g
    LEFT JOIN refund_reversed rr ON rr.source_refund_id IN (
        SELECT r.id FROM public.customer_refunds r WHERE r.source_credit_adjustment_id = g.source_credit_adjustment_id
    )
    GROUP BY g.source_credit_adjustment_id, g.refunded_amount
), application_gross AS (
    SELECT source_credit_adjustment_id, sum(amount)::numeric(12,2) AS applied_amount
    FROM public.customer_credit_applications
    WHERE business_date <= CURRENT_DATE
    GROUP BY source_credit_adjustment_id
), application_reversed AS (
    SELECT source_application_id, sum(amount)::numeric(12,2) AS reversed_amount
    FROM public.customer_credit_application_reversals
    WHERE business_date <= CURRENT_DATE
    GROUP BY source_application_id
), application_totals AS (
    SELECT g.source_credit_adjustment_id,
        GREATEST(round(g.applied_amount - COALESCE(sum(ar.reversed_amount), 0), 2), 0)::numeric(12,2) AS applied_amount
    FROM application_gross g
    LEFT JOIN application_reversed ar ON ar.source_application_id IN (
        SELECT a.id FROM public.customer_credit_applications a WHERE a.source_credit_adjustment_id = g.source_credit_adjustment_id
    )
    GROUP BY g.source_credit_adjustment_id, g.applied_amount
)
SELECT
    e.credit_adjustment_id,
    e.customer_id,
    e.service_id,
    e.invoice_id,
    e.source_approved_billing_scope_id,
    e.successor_approved_billing_scope_id,
    e.credited_amount,
    e.eligible_credit_amount,
    COALESCE(r.refunded_amount, 0)::numeric(12,2) AS refunded_amount,
    COALESCE(a.applied_amount, 0)::numeric(12,2) AS applied_amount,
    GREATEST(round(e.eligible_credit_amount - COALESCE(r.refunded_amount, 0) - COALESCE(a.applied_amount, 0), 2), 0)::numeric(12,2) AS available_amount,
    e.reason_code,
    e.reason,
    e.effective_date,
    e.created_by,
    e.request_id,
    e.created_at
FROM entitled_credits e
LEFT JOIN refund_totals r ON r.source_credit_adjustment_id = e.credit_adjustment_id
LEFT JOIN application_totals a ON a.source_credit_adjustment_id = e.credit_adjustment_id;

CREATE OR REPLACE VIEW public.customer_credit_balances
WITH (security_invoker = true)
AS
SELECT
    b.customer_id,
    count(*)::bigint AS credit_adjustment_count,
    COALESCE(sum(b.credited_amount), 0)::numeric(12,2) AS credited_amount,
    COALESCE(sum(b.refunded_amount), 0)::numeric(12,2) AS refunded_amount,
    COALESCE(sum(b.applied_amount), 0)::numeric(12,2) AS applied_amount,
    GREATEST(COALESCE(sum(b.available_amount), 0), 0)::numeric(12,2) AS available_credit_amount
FROM public.customer_credit_adjustment_balances b
GROUP BY b.customer_id;

CREATE OR REPLACE VIEW public.customer_invoice_receivable_balances
WITH (security_invoker = true)
AS
WITH credit_totals AS (
    SELECT b.invoice_id, sum(b.credited_amount)::numeric(12,2) AS credit_adjustment_amount
    FROM public.customer_credit_adjustment_balances b
    GROUP BY b.invoice_id
), application_gross AS (
    SELECT a.target_invoice_id, sum(a.amount)::numeric(12,2) AS applied_amount
    FROM public.customer_credit_applications a
    WHERE a.business_date <= CURRENT_DATE
    GROUP BY a.target_invoice_id
), application_reversed AS (
    SELECT r.source_application_id, sum(r.amount)::numeric(12,2) AS reversed_amount
    FROM public.customer_credit_application_reversals r
    WHERE r.business_date <= CURRENT_DATE
    GROUP BY r.source_application_id
), application_totals AS (
    SELECT g.target_invoice_id,
        GREATEST(round(g.applied_amount - COALESCE(sum(ar.reversed_amount), 0), 2), 0)::numeric(12,2) AS applied_amount
    FROM application_gross g
    LEFT JOIN application_reversed ar ON ar.source_application_id IN (
        SELECT a.id FROM public.customer_credit_applications a WHERE a.target_invoice_id = g.target_invoice_id
    )
    GROUP BY g.target_invoice_id, g.applied_amount
), customer_credit_totals AS (
    SELECT b.invoice_id, sum(b.available_amount)::numeric(12,2) AS available_amount
    FROM public.customer_credit_adjustment_balances b
    GROUP BY b.invoice_id
)
SELECT
    s.invoice_id,
    i.service_id,
    s.invoice_number,
    s.customer_id,
    s.grand_total AS gross_issued_amount,
    COALESCE(ct.credit_adjustment_amount, 0)::numeric(12,2) AS credit_adjustment_amount,
    COALESCE(at.applied_amount, 0)::numeric(12,2) AS credit_application_amount,
    GREATEST(round(s.grand_total - COALESCE(ct.credit_adjustment_amount, 0) - COALESCE(at.applied_amount, 0), 2), 0)::numeric(12,2) AS net_receivable_amount,
    s.allocated_amount AS settled_amount,
    GREATEST(round(s.grand_total - COALESCE(ct.credit_adjustment_amount, 0) - COALESCE(at.applied_amount, 0) - s.allocated_amount, 2), 0)::numeric(12,2) AS outstanding_amount,
    COALESCE(cct.available_amount, 0)::numeric(12,2) AS customer_credit_amount,
    s.invoice_amount_paid,
    s.invoice_balance_due,
    s.invoice_status
FROM public.customer_invoice_settlement_balances s
JOIN public.invoices i ON i.id = s.invoice_id
LEFT JOIN credit_totals ct ON ct.invoice_id = s.invoice_id
LEFT JOIN application_totals at ON at.target_invoice_id = s.invoice_id
LEFT JOIN customer_credit_totals cct ON cct.invoice_id = s.invoice_id;

CREATE OR REPLACE FUNCTION public._w7c_get_credit_available(p_credit_adjustment_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT b.available_amount
    FROM public.customer_credit_adjustment_balances b
    WHERE b.credit_adjustment_id = p_credit_adjustment_id;
$$;

CREATE OR REPLACE FUNCTION public._w7c_get_invoice_credit_total(p_invoice_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT COALESCE(sum(b.credited_amount), 0)::numeric(12,2)
    FROM public.customer_credit_adjustment_balances b
    WHERE b.invoice_id = p_invoice_id;
$$;

CREATE OR REPLACE FUNCTION public.prevent_w7c_settlement_reversal_after_consumption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_invoice_id uuid;
BEGIN
    SELECT a.invoice_id
    INTO v_invoice_id
    FROM public.customer_receipt_allocations a
    WHERE a.id = NEW.allocation_id;

    IF v_invoice_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.customer_credit_adjustment_balances b
            WHERE b.invoice_id = v_invoice_id
              AND (b.refunded_amount > 0 OR b.applied_amount > 0)
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w7c_settlement_reversal_blocked_after_credit_consumption';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER customer_receipt_allocation_reversals_w7c_guard
    BEFORE INSERT ON public.customer_receipt_allocation_reversals
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7c_settlement_reversal_after_consumption();

CREATE OR REPLACE FUNCTION public.record_customer_internal_credit_adjustment(
    p_customer_id uuid,
    p_service_id uuid,
    p_invoice_id uuid,
    p_amount numeric,
    p_reason_code text,
    p_reason text,
    p_effective_date date,
    p_request_id uuid,
    p_actor_id text,
    p_source_approved_billing_scope_id uuid,
    p_successor_approved_billing_scope_id uuid
)
RETURNS TABLE(
    error_code text,
    credit_adjustment_id uuid,
    customer_id uuid,
    service_id uuid,
    invoice_id uuid,
    amount numeric,
    net_receivable_amount numeric,
    customer_credit_balance numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_existing public.customer_internal_credit_adjustments%ROWTYPE;
    v_invoice public.invoices%ROWTYPE;
    v_source_scope public.approved_billing_scopes%ROWTYPE;
    v_successor_scope public.approved_billing_scopes%ROWTYPE;
    v_existing_credit numeric(12,2);
    v_existing_application numeric(12,2);
    v_settled_amount numeric(12,2);
    v_invoice_credit_before numeric(12,2);
    v_invoice_credit_after numeric(12,2);
    v_customer_credit_before numeric(12,2);
    v_net_after numeric(12,2);
    v_customer_credit_after numeric(12,2);
    v_credit_id uuid;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_customer_id IS NULL OR p_service_id IS NULL OR p_invoice_id IS NULL
        OR p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
        OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR p_effective_date IS NULL OR p_request_id IS NULL
        OR p_effective_date > CURRENT_DATE
        OR p_actor_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR p_reason_code IS NULL
        OR p_reason_code NOT IN ('customer_scope_reduction', 'invoice_correction', 'pricing_correction', 'duplicate_charge', 'other')
        OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 5 AND 2000
        OR ((p_source_approved_billing_scope_id IS NULL) <> (p_successor_approved_billing_scope_id IS NULL))
        OR (p_reason_code = 'customer_scope_reduction'
            AND (p_source_approved_billing_scope_id IS NULL OR p_successor_approved_billing_scope_id IS NULL))
        OR (p_reason_code <> 'customer_scope_reduction'
            AND (p_source_approved_billing_scope_id IS NOT NULL OR p_successor_approved_billing_scope_id IS NOT NULL))
    THEN
        RETURN QUERY SELECT 'invalid_credit_adjustment_input', NULL::uuid, p_customer_id, p_service_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:credit-request:' || p_request_id::text, 9281)
    );

    SELECT c.* INTO v_existing
    FROM public.customer_internal_credit_adjustments c
    WHERE c.request_id = p_request_id
    FOR UPDATE;
    IF FOUND THEN
        IF v_existing.customer_id IS DISTINCT FROM p_customer_id
            OR v_existing.service_id IS DISTINCT FROM p_service_id
            OR v_existing.invoice_id IS DISTINCT FROM p_invoice_id
            OR v_existing.amount IS DISTINCT FROM round(p_amount, 2)
            OR v_existing.reason_code IS DISTINCT FROM p_reason_code
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
            OR v_existing.effective_date IS DISTINCT FROM p_effective_date
            OR v_existing.created_by IS DISTINCT FROM p_actor_id
            OR v_existing.source_approved_billing_scope_id IS DISTINCT FROM p_source_approved_billing_scope_id
            OR v_existing.successor_approved_billing_scope_id IS DISTINCT FROM p_successor_approved_billing_scope_id
        THEN
            RETURN QUERY SELECT 'credit_adjustment_request_conflict', NULL::uuid, p_customer_id, p_service_id, p_invoice_id,
                NULL::numeric, NULL::numeric, NULL::numeric, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.customer_id, v_existing.service_id,
                v_existing.invoice_id, v_existing.amount, v_existing.net_receivable_after,
                v_existing.customer_credit_balance_after, true;
        END IF;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:customer:' || p_customer_id::text, 9281)
    );

    PERFORM 1
    FROM public.invoices i
    WHERE i.id = p_invoice_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found', NULL::uuid, p_customer_id, p_service_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM 1
    FROM public.customers c
    WHERE c.id = p_customer_id AND COALESCE(c.is_deleted, false) = false
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'customer_not_found', NULL::uuid, p_customer_id, p_service_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM 1
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.customer_id = p_customer_id
      AND s.deleted_at IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_customer_mismatch', NULL::uuid, p_customer_id, p_service_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT i.* INTO v_invoice
    FROM public.invoices i
    WHERE i.id = p_invoice_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found', NULL::uuid, p_customer_id, p_service_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF v_invoice.customer_id IS DISTINCT FROM p_customer_id
        OR v_invoice.service_id IS DISTINCT FROM p_service_id
    THEN
        RETURN QUERY SELECT 'invoice_customer_or_service_mismatch', NULL::uuid, p_customer_id, p_service_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF v_invoice.status IN ('draft', 'cancelled', 'voided')
        OR v_invoice.voided_at IS NOT NULL
        OR COALESCE(v_invoice.is_deleted, false)
        OR v_invoice.grand_total IS NULL
        OR v_invoice.grand_total < 0
        OR v_invoice.grand_total <> round(v_invoice.grand_total, 2)
    THEN
        RETURN QUERY SELECT 'invoice_not_eligible_for_credit_adjustment', NULL::uuid, p_customer_id, p_service_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_source_approved_billing_scope_id IS NOT NULL THEN
        PERFORM s.id
        FROM public.approved_billing_scopes s
        WHERE s.id IN (p_source_approved_billing_scope_id, p_successor_approved_billing_scope_id)
        ORDER BY s.id
        FOR UPDATE;

        SELECT s.* INTO v_source_scope
        FROM public.approved_billing_scopes s
        WHERE s.id = p_source_approved_billing_scope_id
          AND s.service_id = p_service_id;
        SELECT s.* INTO v_successor_scope
        FROM public.approved_billing_scopes s
        WHERE s.id = p_successor_approved_billing_scope_id
          AND s.service_id = p_service_id;
        IF v_source_scope.id IS NULL
            OR v_successor_scope.id IS NULL
            OR v_invoice.approved_billing_scope_id IS DISTINCT FROM p_source_approved_billing_scope_id
            OR v_source_scope.status IS DISTINCT FROM 'approved'
            OR v_source_scope.superseded_at IS NOT NULL
            OR v_source_scope.voided_at IS NOT NULL
            OR v_successor_scope.status IS DISTINCT FROM 'draft'
            OR v_successor_scope.supersedes_scope_id IS DISTINCT FROM p_source_approved_billing_scope_id
            OR v_successor_scope.superseded_at IS NOT NULL
            OR v_successor_scope.voided_at IS NOT NULL
            OR v_successor_scope.accepted_grand_total >= v_source_scope.accepted_grand_total
        THEN
            RETURN QUERY SELECT 'commercial_successor_not_ready_for_credit', NULL::uuid, p_customer_id, p_service_id, p_invoice_id,
                NULL::numeric, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;
    END IF;

    SELECT COALESCE(sum(b.credited_amount), 0)::numeric(12,2)
    INTO v_existing_credit
    FROM public.customer_credit_adjustment_balances b
    WHERE b.invoice_id = p_invoice_id;
    IF v_existing_credit + p_amount > v_invoice.grand_total THEN
        RETURN QUERY SELECT 'credit_amount_exceeds_eligible_invoice_value', NULL::uuid, p_customer_id, p_service_id, p_invoice_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT COALESCE(b.available_credit_amount, 0)::numeric(12,2)
    INTO v_customer_credit_before
    FROM public.customer_credit_balances b
    WHERE b.customer_id = p_customer_id;
    SELECT COALESCE(s.allocated_amount, 0)::numeric(12,2)
    INTO v_settled_amount
    FROM public.customer_invoice_settlement_balances s
    WHERE s.invoice_id = p_invoice_id;
    v_settled_amount := COALESCE(v_settled_amount, 0);
    v_invoice_credit_before := GREATEST(round(v_settled_amount - (v_invoice.grand_total - v_existing_credit), 2), 0);
    v_invoice_credit_after := GREATEST(round(v_settled_amount - (v_invoice.grand_total - v_existing_credit - p_amount), 2), 0);
    SELECT COALESCE(r.credit_application_amount, 0)::numeric(12,2)
    INTO v_existing_application
    FROM public.customer_invoice_receivable_balances r
    WHERE r.invoice_id = p_invoice_id;
    v_existing_application := COALESCE(v_existing_application, 0);
    v_net_after := GREATEST(round(v_invoice.grand_total - v_existing_credit - v_existing_application - p_amount, 2), 0);
    v_customer_credit_after := round(
        COALESCE(v_customer_credit_before, 0) + v_invoice_credit_after - v_invoice_credit_before,
        2
    );

    PERFORM set_config('g7.w7c_rpc_context', 'on', true);
    INSERT INTO public.customer_internal_credit_adjustments(
        customer_id, service_id, invoice_id,
        source_approved_billing_scope_id, successor_approved_billing_scope_id,
        amount, reason_code, reason, effective_date, created_by, request_id,
        net_receivable_after, customer_credit_balance_after
    ) VALUES (
        p_customer_id, p_service_id, p_invoice_id,
        p_source_approved_billing_scope_id, p_successor_approved_billing_scope_id,
        round(p_amount, 2), p_reason_code, btrim(p_reason), p_effective_date, p_actor_id, p_request_id,
        v_net_after, v_customer_credit_after
    ) RETURNING id INTO v_credit_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'customer_internal_credit_adjustment', v_credit_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'customer_internal_credit_adjustment_recorded',
            'customer_id', p_customer_id,
            'service_id', p_service_id,
            'invoice_id', p_invoice_id,
            'source_approved_billing_scope_id', p_source_approved_billing_scope_id,
            'successor_approved_billing_scope_id', p_successor_approved_billing_scope_id,
            'amount', round(p_amount, 2),
            'gross_issued_amount', v_invoice.grand_total,
            'net_receivable_after', v_net_after,
            'customer_credit_balance_after', v_customer_credit_after,
            'effective_date', p_effective_date,
            'request_id', p_request_id,
            'vat_classification', 'inactive',
            'revenue_classification', 'none'
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_credit_id, p_customer_id, p_service_id, p_invoice_id,
        round(p_amount, 2), v_net_after, v_customer_credit_after, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_customer_credit(
    p_customer_id uuid,
    p_source_credit_adjustment_id uuid,
    p_amount numeric,
    p_business_date date,
    p_reason text,
    p_refund_method text,
    p_reference text,
    p_request_id uuid,
    p_actor_id text
)
RETURNS TABLE(
    error_code text,
    refund_id uuid,
    customer_id uuid,
    source_credit_adjustment_id uuid,
    amount numeric,
    remaining_credit_amount numeric,
    customer_credit_balance numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_existing public.customer_refunds%ROWTYPE;
    v_credit public.customer_internal_credit_adjustments%ROWTYPE;
    v_available numeric(12,2);
    v_customer_balance numeric(12,2);
    v_remaining numeric(12,2);
    v_balance_after numeric(12,2);
    v_refund_id uuid;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_customer_id IS NULL OR p_source_credit_adjustment_id IS NULL
        OR p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
        OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR p_business_date IS NULL OR p_business_date > CURRENT_DATE OR p_request_id IS NULL
        OR p_actor_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 5 AND 2000
        OR p_refund_method IS NULL
        OR p_refund_method NOT IN ('bank_transfer', 'cash', 'cheque', 'online')
        OR char_length(COALESCE(btrim(p_reference), '')) > 200
    THEN
        RETURN QUERY SELECT 'invalid_customer_refund_input', NULL::uuid, p_customer_id, p_source_credit_adjustment_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:refund-request:' || p_request_id::text, 9281)
    );
    SELECT r.* INTO v_existing
    FROM public.customer_refunds r
    WHERE r.request_id = p_request_id
    FOR UPDATE;
    IF FOUND THEN
        IF v_existing.customer_id IS DISTINCT FROM p_customer_id
            OR v_existing.source_credit_adjustment_id IS DISTINCT FROM p_source_credit_adjustment_id
            OR v_existing.amount IS DISTINCT FROM round(p_amount, 2)
            OR v_existing.business_date IS DISTINCT FROM p_business_date
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
            OR v_existing.refund_method IS DISTINCT FROM p_refund_method
            OR COALESCE(v_existing.reference, '') IS DISTINCT FROM COALESCE(NULLIF(btrim(p_reference), ''), '')
            OR v_existing.created_by IS DISTINCT FROM p_actor_id
        THEN
            RETURN QUERY SELECT 'customer_refund_request_conflict', NULL::uuid, p_customer_id, p_source_credit_adjustment_id,
                NULL::numeric, NULL::numeric, NULL::numeric, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.customer_id, v_existing.source_credit_adjustment_id,
                v_existing.amount, v_existing.remaining_source_credit_after,
                v_existing.customer_credit_balance_after, true;
        END IF;
        RETURN;
    END IF;

    SELECT c.* INTO v_credit
    FROM public.customer_internal_credit_adjustments c
    WHERE c.id = p_source_credit_adjustment_id
      AND c.customer_id = p_customer_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'credit_adjustment_not_found', NULL::uuid, p_customer_id, p_source_credit_adjustment_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_business_date < v_credit.effective_date THEN
        RETURN QUERY SELECT 'customer_refund_before_credit_effective_date', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:customer:' || p_customer_id::text, 9281)
    );
    PERFORM 1
    FROM public.invoices i
    WHERE i.id = v_credit.invoice_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found', NULL::uuid, p_customer_id, p_source_credit_adjustment_id,
            NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    SELECT c.* INTO v_credit
    FROM public.customer_internal_credit_adjustments c
    WHERE c.id = p_source_credit_adjustment_id
      AND c.customer_id = p_customer_id
    FOR UPDATE;

    v_available := public._w7c_get_credit_available(p_source_credit_adjustment_id);
    IF v_available IS NULL OR p_amount > v_available THEN
        RETURN QUERY SELECT 'refund_amount_exceeds_available_credit', NULL::uuid, p_customer_id, p_source_credit_adjustment_id,
            NULL::numeric, v_available, NULL::numeric, false;
        RETURN;
    END IF;
    SELECT COALESCE(b.available_credit_amount, 0)::numeric(12,2)
    INTO v_customer_balance
    FROM public.customer_credit_balances b
    WHERE b.customer_id = p_customer_id;
    v_remaining := round(v_available - p_amount, 2);
    v_balance_after := round(COALESCE(v_customer_balance, 0) - p_amount, 2);

    PERFORM set_config('g7.w7c_rpc_context', 'on', true);
    INSERT INTO public.customer_refunds(
        customer_id, service_id, source_credit_adjustment_id, amount,
        business_date, reason, refund_method, reference, created_by, request_id,
        remaining_source_credit_after, customer_credit_balance_after
    ) VALUES (
        p_customer_id, v_credit.service_id, p_source_credit_adjustment_id, round(p_amount, 2),
        p_business_date, btrim(p_reason), p_refund_method, NULLIF(btrim(p_reference), ''), p_actor_id, p_request_id,
        v_remaining, v_balance_after
    ) RETURNING id INTO v_refund_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'customer_refund', v_refund_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'customer_refund_recorded',
            'customer_id', p_customer_id,
            'service_id', v_credit.service_id,
            'source_credit_adjustment_id', p_source_credit_adjustment_id,
            'amount', round(p_amount, 2),
            'business_date', p_business_date,
            'refund_method', p_refund_method,
            'reference', NULLIF(btrim(p_reference), ''),
            'remaining_source_credit_after', v_remaining,
            'customer_credit_balance_after', v_balance_after,
            'request_id', p_request_id,
            'revenue_classification', 'none',
            'payment_reversal', false
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_refund_id, p_customer_id, p_source_credit_adjustment_id,
        round(p_amount, 2), v_remaining, v_balance_after, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_customer_credit(
    p_customer_id uuid,
    p_source_credit_adjustment_id uuid,
    p_target_invoice_id uuid,
    p_amount numeric,
    p_business_date date,
    p_reason text,
    p_request_id uuid,
    p_actor_id text
)
RETURNS TABLE(
    error_code text,
    application_id uuid,
    customer_id uuid,
    source_credit_adjustment_id uuid,
    target_invoice_id uuid,
    amount numeric,
    remaining_credit_amount numeric,
    target_outstanding_amount numeric,
    customer_credit_balance numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_existing public.customer_credit_applications%ROWTYPE;
    v_credit public.customer_internal_credit_adjustments%ROWTYPE;
    v_target public.invoices%ROWTYPE;
    v_available numeric(12,2);
    v_customer_balance numeric(12,2);
    v_target_outstanding numeric(12,2);
    v_remaining numeric(12,2);
    v_outstanding_after numeric(12,2);
    v_balance_after numeric(12,2);
    v_application_id uuid;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_customer_id IS NULL OR p_source_credit_adjustment_id IS NULL OR p_target_invoice_id IS NULL
        OR p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
        OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR p_business_date IS NULL OR p_business_date > CURRENT_DATE OR p_request_id IS NULL
        OR p_actor_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 5 AND 2000
    THEN
        RETURN QUERY SELECT 'invalid_customer_credit_application_input', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, p_target_invoice_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:application-request:' || p_request_id::text, 9281)
    );
    SELECT a.* INTO v_existing
    FROM public.customer_credit_applications a
    WHERE a.request_id = p_request_id
    FOR UPDATE;
    IF FOUND THEN
        IF v_existing.customer_id IS DISTINCT FROM p_customer_id
            OR v_existing.source_credit_adjustment_id IS DISTINCT FROM p_source_credit_adjustment_id
            OR v_existing.target_invoice_id IS DISTINCT FROM p_target_invoice_id
            OR v_existing.amount IS DISTINCT FROM round(p_amount, 2)
            OR v_existing.business_date IS DISTINCT FROM p_business_date
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
            OR v_existing.created_by IS DISTINCT FROM p_actor_id
        THEN
            RETURN QUERY SELECT 'customer_credit_application_request_conflict', NULL::uuid, p_customer_id,
                p_source_credit_adjustment_id, p_target_invoice_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.customer_id, v_existing.source_credit_adjustment_id,
                v_existing.target_invoice_id, v_existing.amount, v_existing.remaining_source_credit_after,
                v_existing.target_outstanding_after, v_existing.customer_credit_balance_after, true;
        END IF;
        RETURN;
    END IF;

    SELECT c.* INTO v_credit
    FROM public.customer_internal_credit_adjustments c
    WHERE c.id = p_source_credit_adjustment_id
      AND c.customer_id = p_customer_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'credit_adjustment_not_found', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, p_target_invoice_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF v_credit.invoice_id = p_target_invoice_id THEN
        RETURN QUERY SELECT 'credit_application_target_must_differ', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, p_target_invoice_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF p_business_date < v_credit.effective_date THEN
        RETURN QUERY SELECT 'customer_credit_application_before_credit_effective_date', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, p_target_invoice_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:customer:' || p_customer_id::text, 9281)
    );
    PERFORM 1
    FROM public.invoices i
    WHERE i.id = v_credit.invoice_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'invoice_not_found', NULL::uuid, p_customer_id, p_source_credit_adjustment_id,
            p_target_invoice_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    SELECT c.* INTO v_credit
    FROM public.customer_internal_credit_adjustments c
    WHERE c.id = p_source_credit_adjustment_id
      AND c.customer_id = p_customer_id
    FOR UPDATE;

    SELECT i.* INTO v_target
    FROM public.invoices i
    WHERE i.id = p_target_invoice_id
    FOR UPDATE;
    IF NOT FOUND OR v_target.customer_id IS DISTINCT FROM p_customer_id
        OR v_target.status IN ('draft', 'cancelled', 'voided')
        OR v_target.voided_at IS NOT NULL
        OR COALESCE(v_target.is_deleted, false)
    THEN
        RETURN QUERY SELECT 'target_invoice_not_eligible_for_credit_application', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, p_target_invoice_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    v_available := public._w7c_get_credit_available(p_source_credit_adjustment_id);
    SELECT COALESCE(r.outstanding_amount, 0)::numeric(12,2)
    INTO v_target_outstanding
    FROM public.customer_invoice_receivable_balances r
    WHERE r.invoice_id = p_target_invoice_id;
    IF v_available IS NULL OR p_amount > v_available THEN
        RETURN QUERY SELECT 'credit_application_exceeds_available_credit', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, p_target_invoice_id, NULL::numeric, v_available, v_target_outstanding, NULL::numeric, false;
        RETURN;
    END IF;
    IF v_target_outstanding IS NULL OR p_amount > v_target_outstanding THEN
        RETURN QUERY SELECT 'credit_application_exceeds_target_outstanding', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, p_target_invoice_id, NULL::numeric, v_available, v_target_outstanding, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT COALESCE(b.available_credit_amount, 0)::numeric(12,2)
    INTO v_customer_balance
    FROM public.customer_credit_balances b
    WHERE b.customer_id = p_customer_id;
    v_remaining := round(v_available - p_amount, 2);
    v_outstanding_after := round(v_target_outstanding - p_amount, 2);
    v_balance_after := round(COALESCE(v_customer_balance, 0) - p_amount, 2);

    PERFORM set_config('g7.w7c_rpc_context', 'on', true);
    INSERT INTO public.customer_credit_applications(
        customer_id, source_credit_adjustment_id, target_invoice_id, amount,
        business_date, reason, created_by, request_id,
        remaining_source_credit_after, target_outstanding_after, customer_credit_balance_after
    ) VALUES (
        p_customer_id, p_source_credit_adjustment_id, p_target_invoice_id, round(p_amount, 2),
        p_business_date, btrim(p_reason), p_actor_id, p_request_id,
        v_remaining, v_outstanding_after, v_balance_after
    ) RETURNING id INTO v_application_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'customer_credit_application', v_application_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'customer_credit_applied',
            'customer_id', p_customer_id,
            'source_credit_adjustment_id', p_source_credit_adjustment_id,
            'target_invoice_id', p_target_invoice_id,
            'amount', round(p_amount, 2),
            'business_date', p_business_date,
            'remaining_source_credit_after', v_remaining,
            'target_outstanding_after', v_outstanding_after,
            'customer_credit_balance_after', v_balance_after,
            'request_id', p_request_id,
            'new_cash_receipt', false,
            'revenue_classification', 'none'
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_application_id, p_customer_id, p_source_credit_adjustment_id,
        p_target_invoice_id, round(p_amount, 2), v_remaining, v_outstanding_after, v_balance_after, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_customer_internal_credit_adjustment(
    p_customer_id uuid,
    p_source_credit_adjustment_id uuid,
    p_amount numeric,
    p_effective_date date,
    p_reason text,
    p_request_id uuid,
    p_actor_id text
)
RETURNS TABLE(
    error_code text,
    reversal_id uuid,
    customer_id uuid,
    source_credit_adjustment_id uuid,
    amount numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_existing public.customer_internal_credit_adjustment_reversals%ROWTYPE;
    v_credit public.customer_internal_credit_adjustments%ROWTYPE;
    v_credited numeric(12,2);
    v_refunded numeric(12,2);
    v_applied numeric(12,2);
    v_reversed numeric(12,2);
    v_reversal_id uuid;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_customer_id IS NULL OR p_source_credit_adjustment_id IS NULL
        OR p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
        OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR p_effective_date IS NULL OR p_effective_date > CURRENT_DATE
        OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 5 AND 2000
        OR p_request_id IS NULL
        OR p_actor_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
    THEN
        RETURN QUERY SELECT 'invalid_credit_adjustment_reversal_input', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:credit-reversal-request:' || p_request_id::text, 9281)
    );
    SELECT r.* INTO v_existing
    FROM public.customer_internal_credit_adjustment_reversals r
    WHERE r.request_id = p_request_id
    FOR UPDATE;
    IF FOUND THEN
        IF v_existing.customer_id IS DISTINCT FROM p_customer_id
            OR v_existing.source_credit_adjustment_id IS DISTINCT FROM p_source_credit_adjustment_id
            OR v_existing.amount IS DISTINCT FROM round(p_amount, 2)
            OR v_existing.effective_date IS DISTINCT FROM p_effective_date
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
            OR v_existing.created_by IS DISTINCT FROM p_actor_id
        THEN
            RETURN QUERY SELECT 'credit_adjustment_reversal_request_conflict', NULL::uuid, p_customer_id,
                p_source_credit_adjustment_id, NULL::numeric, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.customer_id,
                v_existing.source_credit_adjustment_id, v_existing.amount, true;
        END IF;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:customer:' || p_customer_id::text, 9281)
    );
    SELECT c.* INTO v_credit
    FROM public.customer_internal_credit_adjustments c
    WHERE c.id = p_source_credit_adjustment_id
      AND c.customer_id = p_customer_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'credit_adjustment_not_found', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, NULL::numeric, false;
        RETURN;
    END IF;
    IF p_effective_date < v_credit.effective_date THEN
        RETURN QUERY SELECT 'credit_adjustment_reversal_before_credit_effective_date', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT b.credited_amount, b.refunded_amount, b.applied_amount
    INTO v_credited, v_refunded, v_applied
    FROM public.customer_credit_adjustment_balances b
    WHERE b.credit_adjustment_id = p_source_credit_adjustment_id;
    IF COALESCE(v_refunded, 0) > 0 OR COALESCE(v_applied, 0) > 0 THEN
        RETURN QUERY SELECT 'credit_adjustment_has_consumed_credit', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, NULL::numeric, false;
        RETURN;
    END IF;
    SELECT COALESCE(sum(r.amount), 0)::numeric(12,2)
    INTO v_reversed
    FROM public.customer_internal_credit_adjustment_reversals r
    WHERE r.source_credit_adjustment_id = p_source_credit_adjustment_id;
    IF p_amount > v_credit.amount - v_reversed THEN
        RETURN QUERY SELECT 'credit_adjustment_reversal_exceeds_remaining', NULL::uuid, p_customer_id,
            p_source_credit_adjustment_id, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM set_config('g7.w7c_rpc_context', 'on', true);
    INSERT INTO public.customer_internal_credit_adjustment_reversals(
        customer_id, source_credit_adjustment_id, amount, effective_date, reason, created_by, request_id
    ) VALUES (
        p_customer_id, p_source_credit_adjustment_id, round(p_amount, 2), p_effective_date,
        btrim(p_reason), p_actor_id, p_request_id
    ) RETURNING id INTO v_reversal_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'customer_internal_credit_adjustment_reversal', v_reversal_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'customer_internal_credit_adjustment_reversed',
            'customer_id', p_customer_id,
            'source_credit_adjustment_id', p_source_credit_adjustment_id,
            'amount', round(p_amount, 2),
            'effective_date', p_effective_date,
            'request_id', p_request_id,
            'revenue_classification', 'none'
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_reversal_id, p_customer_id,
        p_source_credit_adjustment_id, round(p_amount, 2), false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_customer_refund(
    p_customer_id uuid,
    p_source_refund_id uuid,
    p_amount numeric,
    p_business_date date,
    p_reason text,
    p_request_id uuid,
    p_actor_id text
)
RETURNS TABLE(
    error_code text,
    reversal_id uuid,
    customer_id uuid,
    source_refund_id uuid,
    amount numeric,
    remaining_credit_amount numeric,
    customer_credit_balance numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_existing public.customer_refund_reversals%ROWTYPE;
    v_refund public.customer_refunds%ROWTYPE;
    v_credit public.customer_internal_credit_adjustments%ROWTYPE;
    v_reversed numeric(12,2);
    v_available numeric(12,2);
    v_customer_balance numeric(12,2);
    v_reversal_id uuid;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_customer_id IS NULL OR p_source_refund_id IS NULL
        OR p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
        OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR p_business_date IS NULL OR p_business_date > CURRENT_DATE
        OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 5 AND 2000
        OR p_request_id IS NULL
        OR p_actor_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
    THEN
        RETURN QUERY SELECT 'invalid_customer_refund_reversal_input', NULL::uuid, p_customer_id,
            p_source_refund_id, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:refund-reversal-request:' || p_request_id::text, 9281)
    );
    SELECT r.* INTO v_existing
    FROM public.customer_refund_reversals r
    WHERE r.request_id = p_request_id
    FOR UPDATE;
    IF FOUND THEN
        IF v_existing.customer_id IS DISTINCT FROM p_customer_id
            OR v_existing.source_refund_id IS DISTINCT FROM p_source_refund_id
            OR v_existing.amount IS DISTINCT FROM round(p_amount, 2)
            OR v_existing.business_date IS DISTINCT FROM p_business_date
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
            OR v_existing.created_by IS DISTINCT FROM p_actor_id
        THEN
            RETURN QUERY SELECT 'customer_refund_reversal_request_conflict', NULL::uuid, p_customer_id,
                p_source_refund_id, NULL::numeric, NULL::numeric, NULL::numeric, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.customer_id,
                v_existing.source_refund_id, v_existing.amount, NULL::numeric, NULL::numeric, true;
        END IF;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:customer:' || p_customer_id::text, 9281)
    );
    SELECT r.* INTO v_refund
    FROM public.customer_refunds r
    WHERE r.id = p_source_refund_id
      AND r.customer_id = p_customer_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'customer_refund_not_found', NULL::uuid, p_customer_id,
            p_source_refund_id, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF p_business_date < v_refund.business_date THEN
        RETURN QUERY SELECT 'customer_refund_reversal_before_refund_date', NULL::uuid, p_customer_id,
            p_source_refund_id, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    SELECT c.* INTO v_credit
    FROM public.customer_internal_credit_adjustments c
    WHERE c.id = v_refund.source_credit_adjustment_id
    FOR UPDATE;
    SELECT COALESCE(sum(r.amount), 0)::numeric(12,2)
    INTO v_reversed
    FROM public.customer_refund_reversals r
    WHERE r.source_refund_id = p_source_refund_id;
    IF p_amount > v_refund.amount - v_reversed THEN
        RETURN QUERY SELECT 'customer_refund_reversal_exceeds_remaining', NULL::uuid, p_customer_id,
            p_source_refund_id, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    v_available := COALESCE(public._w7c_get_credit_available(v_credit.id), 0);
    SELECT COALESCE(b.available_credit_amount, 0)::numeric(12,2)
    INTO v_customer_balance
    FROM public.customer_credit_balances b
    WHERE b.customer_id = p_customer_id;

    PERFORM set_config('g7.w7c_rpc_context', 'on', true);
    INSERT INTO public.customer_refund_reversals(
        customer_id, source_refund_id, amount, business_date, reason, created_by, request_id
    ) VALUES (
        p_customer_id, p_source_refund_id, round(p_amount, 2), p_business_date,
        btrim(p_reason), p_actor_id, p_request_id
    ) RETURNING id INTO v_reversal_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'customer_refund_reversal', v_reversal_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'customer_refund_reversed',
            'customer_id', p_customer_id,
            'source_refund_id', p_source_refund_id,
            'amount', round(p_amount, 2),
            'business_date', p_business_date,
            'request_id', p_request_id,
            'revenue_classification', 'none'
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_reversal_id, p_customer_id, p_source_refund_id,
        round(p_amount, 2), round(v_available + p_amount, 2),
        round(COALESCE(v_customer_balance, 0) + p_amount, 2), false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_customer_credit_application(
    p_customer_id uuid,
    p_source_application_id uuid,
    p_amount numeric,
    p_business_date date,
    p_reason text,
    p_request_id uuid,
    p_actor_id text
)
RETURNS TABLE(
    error_code text,
    reversal_id uuid,
    customer_id uuid,
    source_application_id uuid,
    amount numeric,
    remaining_credit_amount numeric,
    target_outstanding_amount numeric,
    customer_credit_balance numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_existing public.customer_credit_application_reversals%ROWTYPE;
    v_application public.customer_credit_applications%ROWTYPE;
    v_credit public.customer_internal_credit_adjustments%ROWTYPE;
    v_target public.invoices%ROWTYPE;
    v_reversed numeric(12,2);
    v_available numeric(12,2);
    v_target_outstanding numeric(12,2);
    v_customer_balance numeric(12,2);
    v_reversal_id uuid;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_customer_id IS NULL OR p_source_application_id IS NULL
        OR p_amount IS NULL OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
        OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR p_business_date IS NULL OR p_business_date > CURRENT_DATE
        OR p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 5 AND 2000
        OR p_request_id IS NULL
        OR p_actor_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
    THEN
        RETURN QUERY SELECT 'invalid_customer_credit_application_reversal_input', NULL::uuid, p_customer_id,
            p_source_application_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:application-reversal-request:' || p_request_id::text, 9281)
    );
    SELECT r.* INTO v_existing
    FROM public.customer_credit_application_reversals r
    WHERE r.request_id = p_request_id
    FOR UPDATE;
    IF FOUND THEN
        IF v_existing.customer_id IS DISTINCT FROM p_customer_id
            OR v_existing.source_application_id IS DISTINCT FROM p_source_application_id
            OR v_existing.amount IS DISTINCT FROM round(p_amount, 2)
            OR v_existing.business_date IS DISTINCT FROM p_business_date
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
            OR v_existing.created_by IS DISTINCT FROM p_actor_id
        THEN
            RETURN QUERY SELECT 'customer_credit_application_reversal_request_conflict', NULL::uuid, p_customer_id,
                p_source_application_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.customer_id,
                v_existing.source_application_id, v_existing.amount, NULL::numeric, NULL::numeric, NULL::numeric, true;
        END IF;
        RETURN;
    END IF;

    PERFORM pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('w7c:customer:' || p_customer_id::text, 9281)
    );
    SELECT a.* INTO v_application
    FROM public.customer_credit_applications a
    WHERE a.id = p_source_application_id
      AND a.customer_id = p_customer_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'customer_credit_application_not_found', NULL::uuid, p_customer_id,
            p_source_application_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    IF p_business_date < v_application.business_date THEN
        RETURN QUERY SELECT 'customer_credit_application_reversal_before_application_date', NULL::uuid, p_customer_id,
            p_source_application_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    SELECT c.* INTO v_credit
    FROM public.customer_internal_credit_adjustments c
    WHERE c.id = v_application.source_credit_adjustment_id
    FOR UPDATE;
    SELECT i.* INTO v_target
    FROM public.invoices i
    WHERE i.id = v_application.target_invoice_id
    FOR UPDATE;
    SELECT COALESCE(sum(r.amount), 0)::numeric(12,2)
    INTO v_reversed
    FROM public.customer_credit_application_reversals r
    WHERE r.source_application_id = p_source_application_id;
    IF p_amount > v_application.amount - v_reversed THEN
        RETURN QUERY SELECT 'customer_credit_application_reversal_exceeds_remaining', NULL::uuid, p_customer_id,
            p_source_application_id, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    v_available := COALESCE(public._w7c_get_credit_available(v_credit.id), 0);
    SELECT COALESCE(r.outstanding_amount, 0)::numeric(12,2)
    INTO v_target_outstanding
    FROM public.customer_invoice_receivable_balances r
    WHERE r.invoice_id = v_application.target_invoice_id;
    SELECT COALESCE(b.available_credit_amount, 0)::numeric(12,2)
    INTO v_customer_balance
    FROM public.customer_credit_balances b
    WHERE b.customer_id = p_customer_id;

    PERFORM set_config('g7.w7c_rpc_context', 'on', true);
    INSERT INTO public.customer_credit_application_reversals(
        customer_id, source_application_id, amount, business_date, reason, created_by, request_id
    ) VALUES (
        p_customer_id, p_source_application_id, round(p_amount, 2), p_business_date,
        btrim(p_reason), p_actor_id, p_request_id
    ) RETURNING id INTO v_reversal_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'customer_credit_application_reversal', v_reversal_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'customer_credit_application_reversed',
            'customer_id', p_customer_id,
            'source_application_id', p_source_application_id,
            'target_invoice_id', v_application.target_invoice_id,
            'amount', round(p_amount, 2),
            'business_date', p_business_date,
            'request_id', p_request_id,
            'new_cash_receipt', false,
            'revenue_classification', 'none'
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_reversal_id, p_customer_id, p_source_application_id,
        round(p_amount, 2), round(v_available + p_amount, 2),
        round(COALESCE(v_target_outstanding, 0) + p_amount, 2),
        round(COALESCE(v_customer_balance, 0) + p_amount, 2), false;
END;
$$;

-- W7-P0A keeps its existing lineage and fail-closed state checks.  Only its
-- private exposure helper changes: credits reduce effective exposure while the
-- original invoice gross total remains historical and immutable.
CREATE OR REPLACE FUNCTION public._abs_get_service_invoice_exposure(p_service_id uuid)
RETURNS TABLE(applicable_invoice_count bigint, lifetime_invoice_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.service_id = p_service_id
          AND i.status NOT IN ('cancelled', 'voided')
          AND i.voided_at IS NULL
          AND COALESCE(i.is_deleted, false) = false
          AND i.grand_total IS NULL
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice grand_total cannot be null for applicable Service exposure';
    END IF;

    RETURN QUERY
    SELECT
        count(*)::bigint,
        COALESCE(sum(GREATEST(i.grand_total - COALESCE(c.credit_total, 0), 0)), 0)::numeric
    FROM public.invoices i
    LEFT JOIN LATERAL (
        SELECT sum(b.credited_amount)::numeric(12,2) AS credit_total
        FROM public.customer_credit_adjustment_balances b
        WHERE b.invoice_id = i.id
    ) c ON true
    WHERE i.service_id = p_service_id
      AND i.status NOT IN ('cancelled', 'voided')
      AND i.voided_at IS NULL
      AND COALESCE(i.is_deleted, false) = false;
END;
$$;

REVOKE ALL ON FUNCTION public._w7c_get_credit_available(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._w7c_get_invoice_credit_total(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_customer_internal_credit_adjustment(uuid,uuid,uuid,numeric,text,text,date,uuid,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_customer_credit(uuid,uuid,numeric,date,text,text,text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_customer_credit(uuid,uuid,uuid,numeric,date,text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_customer_internal_credit_adjustment(uuid,uuid,numeric,date,text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_customer_refund(uuid,uuid,numeric,date,text,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_customer_credit_application(uuid,uuid,numeric,date,text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._w7c_get_credit_available(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._w7c_get_invoice_credit_total(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_customer_internal_credit_adjustment(uuid,uuid,uuid,numeric,text,text,date,uuid,text,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_customer_credit(uuid,uuid,numeric,date,text,text,text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_customer_credit(uuid,uuid,uuid,numeric,date,text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_customer_internal_credit_adjustment(uuid,uuid,numeric,date,text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_customer_refund(uuid,uuid,numeric,date,text,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_customer_credit_application(uuid,uuid,numeric,date,text,uuid,text) TO service_role;

REVOKE ALL ON TABLE
    public.customer_internal_credit_adjustments,
    public.customer_refunds,
    public.customer_credit_applications,
    public.customer_internal_credit_adjustment_reversals,
    public.customer_refund_reversals,
    public.customer_credit_application_reversals
FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE
    public.customer_internal_credit_adjustments,
    public.customer_refunds,
    public.customer_credit_applications,
    public.customer_internal_credit_adjustment_reversals,
    public.customer_refund_reversals,
    public.customer_credit_application_reversals
TO service_role;
REVOKE ALL ON public.customer_credit_adjustment_balances, public.customer_credit_balances, public.customer_invoice_receivable_balances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.customer_credit_adjustment_balances, public.customer_credit_balances, public.customer_invoice_receivable_balances TO service_role;

COMMENT ON TABLE public.customer_internal_credit_adjustments IS
    'Immutable non-VAT Internal Credit Adjustment. Does not rewrite the issued invoice or create a Tax Credit Note.';
COMMENT ON TABLE public.customer_refunds IS
    'Immutable actual outbound Customer Refund event sourced from retained Internal Credit Adjustment credit.';
COMMENT ON TABLE public.customer_credit_applications IS
    'Immutable settlement-by-credit event from one customer credit adjustment to another same-customer invoice.';
COMMENT ON TABLE public.customer_internal_credit_adjustment_reversals IS
    'Immutable governed reversal event for an unconsumed Internal Credit Adjustment.';
COMMENT ON TABLE public.customer_refund_reversals IS
    'Immutable governed reversal event that restores retained customer credit after an erroneous refund.';
COMMENT ON TABLE public.customer_credit_application_reversals IS
    'Immutable governed reversal event that restores customer credit and target outstanding after an erroneous application.';
COMMENT ON VIEW public.customer_invoice_receivable_balances IS
    'Authoritative W7C derived invoice receivable: gross issued value, credits, net receivable, settlement, outstanding, and excess credit.';
COMMENT ON FUNCTION public._abs_get_service_invoice_exposure(uuid) IS
    'W7C-aware private service-role helper. W7-P0A authority exposure uses immutable invoice gross less active Internal Credit Adjustments; null totals fail closed.';

COMMIT;
