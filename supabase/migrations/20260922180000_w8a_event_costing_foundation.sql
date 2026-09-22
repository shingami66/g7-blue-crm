-- W8A — Event Costing & Forecast Foundation.
-- Authoring only.  Apply only after the separate Owner DEV-apply gate.
-- This slice is managerial event costing; it is not Event Close, accounting
-- profit, GL, revenue recognition, VAT, ZATCA, or FATOORA.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.app_users') IS NULL
        OR to_regclass('public.services') IS NULL
        OR to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regclass('public.approved_commitment_balances') IS NULL
        OR to_regclass('public.supplier_bills') IS NULL
        OR to_regclass('public.supplier_bill_payment_balances') IS NULL
        OR to_regclass('public.supplier_advance_allocations') IS NULL
        OR to_regclass('public.expense_accountability_summaries') IS NULL
        OR to_regclass('public.expenses') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'W8A preflight failed: required W5/W6/W7 foundations are missing';
    END IF;

    IF to_regclass('public.event_cost_budgets') IS NOT NULL
        OR to_regclass('public.event_cost_etc_forecasts') IS NOT NULL
        OR to_regprocedure('public.get_event_costing(uuid,date)') IS NOT NULL
        OR to_regprocedure('public.approve_event_cost_budget(uuid,numeric,numeric,text,text,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.record_event_cost_etc(uuid,numeric,date,text,text,uuid,text,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'W8A preflight failed: Event Costing objects already exist';
    END IF;
END;
$$;

CREATE TABLE public.event_cost_budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    budget_version integer NOT NULL,
    base_budget_amount numeric(14,2) NOT NULL,
    contingency_amount numeric(14,2) NOT NULL DEFAULT 0,
    approved_budget_cost numeric(14,2) GENERATED ALWAYS AS (base_budget_amount + contingency_amount) STORED,
    currency char(3) NOT NULL DEFAULT 'SAR',
    reason text NOT NULL,
    notes text,
    source_reference text,
    approved_by text NOT NULL,
    approved_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    superseded_by text,
    superseded_at timestamptz,
    request_id uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT event_cost_budgets_version_check CHECK (budget_version > 0),
    CONSTRAINT event_cost_budgets_base_check CHECK (base_budget_amount >= 0 AND base_budget_amount = round(base_budget_amount, 2)),
    CONSTRAINT event_cost_budgets_contingency_check CHECK (contingency_amount >= 0 AND contingency_amount = round(contingency_amount, 2)),
    CONSTRAINT event_cost_budgets_total_check CHECK (base_budget_amount + contingency_amount <= 999999999999.99),
    CONSTRAINT event_cost_budgets_currency_check CHECK (currency = 'SAR'),
    CONSTRAINT event_cost_budgets_reason_check CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT event_cost_budgets_notes_check CHECK (notes IS NULL OR char_length(notes) <= 4000),
    CONSTRAINT event_cost_budgets_source_check CHECK (source_reference IS NULL OR char_length(source_reference) <= 500),
    CONSTRAINT event_cost_budgets_actor_check CHECK (char_length(btrim(approved_by)) BETWEEN 1 AND 255),
    CONSTRAINT event_cost_budgets_supersession_check CHECK (
        (superseded_at IS NULL AND superseded_by IS NULL)
        OR (superseded_at IS NOT NULL AND superseded_by IS NOT NULL AND char_length(btrim(superseded_by)) BETWEEN 1 AND 255)
    ),
    CONSTRAINT event_cost_budgets_service_version_key UNIQUE (service_id, budget_version)
);

CREATE UNIQUE INDEX event_cost_budgets_active_service_key
    ON public.event_cost_budgets(service_id)
    WHERE superseded_at IS NULL;
CREATE INDEX event_cost_budgets_service_history_idx
    ON public.event_cost_budgets(service_id, approved_at DESC, budget_version DESC);

CREATE TABLE public.event_cost_etc_forecasts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    forecast_version integer NOT NULL,
    etc_amount numeric(14,2) NOT NULL,
    forecast_date date NOT NULL,
    reason text NOT NULL,
    notes text,
    recorded_by text NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    superseded_by text,
    superseded_at timestamptz,
    request_id uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT event_cost_etc_version_check CHECK (forecast_version > 0),
    CONSTRAINT event_cost_etc_amount_check CHECK (etc_amount >= 0 AND etc_amount = round(etc_amount, 2) AND etc_amount <= 999999999999.99),
    CONSTRAINT event_cost_etc_reason_check CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT event_cost_etc_notes_check CHECK (notes IS NULL OR char_length(notes) <= 4000),
    CONSTRAINT event_cost_etc_actor_check CHECK (char_length(btrim(recorded_by)) BETWEEN 1 AND 255),
    CONSTRAINT event_cost_etc_supersession_check CHECK (
        (superseded_at IS NULL AND superseded_by IS NULL)
        OR (superseded_at IS NOT NULL AND superseded_by IS NOT NULL AND char_length(btrim(superseded_by)) BETWEEN 1 AND 255)
    ),
    CONSTRAINT event_cost_etc_service_version_key UNIQUE (service_id, forecast_version)
);

CREATE UNIQUE INDEX event_cost_etc_active_service_key
    ON public.event_cost_etc_forecasts(service_id)
    WHERE superseded_at IS NULL;
CREATE INDEX event_cost_etc_service_history_idx
    ON public.event_cost_etc_forecasts(service_id, forecast_date DESC, forecast_version DESC);

CREATE OR REPLACE FUNCTION public.prevent_event_cost_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF current_setting('g7.w8a_rpc_context', true) <> 'on' THEN
        RAISE EXCEPTION 'event_cost_version_immutable';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'event_cost_version_immutable';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.service_id IS DISTINCT FROM OLD.service_id
        OR NEW.budget_version IS DISTINCT FROM OLD.budget_version
        OR NEW.base_budget_amount IS DISTINCT FROM OLD.base_budget_amount
        OR NEW.contingency_amount IS DISTINCT FROM OLD.contingency_amount
        OR NEW.currency IS DISTINCT FROM OLD.currency
        OR NEW.reason IS DISTINCT FROM OLD.reason
        OR NEW.notes IS DISTINCT FROM OLD.notes
        OR NEW.source_reference IS DISTINCT FROM OLD.source_reference
        OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
        OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
        OR NEW.request_id IS DISTINCT FROM OLD.request_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
        RAISE EXCEPTION 'event_cost_version_immutable';
    END IF;
    IF OLD.superseded_at IS NOT NULL
        OR NEW.superseded_at IS NULL
        OR NEW.superseded_at < OLD.approved_at
    THEN
        RAISE EXCEPTION 'event_cost_version_invalid_supersession';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_event_cost_etc_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF current_setting('g7.w8a_rpc_context', true) <> 'on' THEN
        RAISE EXCEPTION 'event_cost_etc_version_immutable';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'event_cost_etc_version_immutable';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW.service_id IS DISTINCT FROM OLD.service_id
        OR NEW.forecast_version IS DISTINCT FROM OLD.forecast_version
        OR NEW.etc_amount IS DISTINCT FROM OLD.etc_amount
        OR NEW.forecast_date IS DISTINCT FROM OLD.forecast_date
        OR NEW.reason IS DISTINCT FROM OLD.reason
        OR NEW.notes IS DISTINCT FROM OLD.notes
        OR NEW.recorded_by IS DISTINCT FROM OLD.recorded_by
        OR NEW.recorded_at IS DISTINCT FROM OLD.recorded_at
        OR NEW.request_id IS DISTINCT FROM OLD.request_id
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
        RAISE EXCEPTION 'event_cost_etc_version_immutable';
    END IF;
    IF OLD.superseded_at IS NOT NULL
        OR NEW.superseded_at IS NULL
        OR NEW.superseded_at < OLD.recorded_at
    THEN
        RAISE EXCEPTION 'event_cost_etc_version_invalid_supersession';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER event_cost_budgets_immutable
    BEFORE UPDATE OR DELETE ON public.event_cost_budgets
    FOR EACH ROW EXECUTE FUNCTION public.prevent_event_cost_version_mutation();
CREATE TRIGGER event_cost_etc_forecasts_immutable
    BEFORE UPDATE OR DELETE ON public.event_cost_etc_forecasts
    FOR EACH ROW EXECUTE FUNCTION public.prevent_event_cost_etc_version_mutation();

ALTER TABLE public.event_cost_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_cost_etc_forecasts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.event_cost_budgets, public.event_cost_etc_forecasts FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.event_cost_budgets, public.event_cost_etc_forecasts TO service_role;
REVOKE ALL ON FUNCTION public.prevent_event_cost_version_mutation() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_event_cost_etc_version_mutation() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approve_event_cost_budget(
    p_service_id uuid,
    p_base_budget_amount numeric,
    p_contingency_amount numeric,
    p_reason text,
    p_notes text,
    p_source_reference text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, budget_id uuid, budget_version integer, approved_budget_cost numeric, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_actor_uuid uuid;
    v_existing record;
    v_service record;
    v_budget_id uuid;
    v_version integer;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_service_id IS NULL OR p_request_id IS NULL
        OR p_base_budget_amount IS NULL OR p_base_budget_amount < 0 OR p_base_budget_amount <> round(p_base_budget_amount, 2)
        OR p_contingency_amount IS NULL OR p_contingency_amount < 0 OR p_contingency_amount <> round(p_contingency_amount, 2)
        OR p_base_budget_amount + p_contingency_amount > 999999999999.99
        OR char_length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 5 AND 2000
        OR (p_notes IS NOT NULL AND char_length(p_notes) > 4000)
        OR (p_source_reference IS NOT NULL AND char_length(p_source_reference) > 500)
        OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'manager')
    THEN
        RETURN QUERY SELECT 'event_cost_budget_request_invalid', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'event_cost_budget_request_invalid', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END;

    IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = v_actor_uuid AND is_active = true AND role = p_actor_role) THEN
        RETURN QUERY SELECT 'event_cost_budget_permission_denied', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w8a:event_cost_budget:' || p_service_id::text, 0));

    SELECT * INTO v_existing FROM public.event_cost_budgets WHERE request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.service_id IS DISTINCT FROM p_service_id
            OR v_existing.base_budget_amount IS DISTINCT FROM round(p_base_budget_amount, 2)
            OR v_existing.contingency_amount IS DISTINCT FROM round(p_contingency_amount, 2)
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
            OR v_existing.notes IS DISTINCT FROM NULLIF(btrim(p_notes), '')
            OR v_existing.source_reference IS DISTINCT FROM NULLIF(btrim(p_source_reference), '')
        THEN
            RETURN QUERY SELECT 'event_cost_budget_request_conflict', v_existing.id, v_existing.budget_version, v_existing.approved_budget_cost, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.budget_version, v_existing.approved_budget_cost, true;
        END IF;
        RETURN;
    END IF;

    SELECT id INTO v_service FROM public.services WHERE id = p_service_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'event_cost_service_not_found', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM set_config('g7.w8a_rpc_context', 'on', true);
    UPDATE public.event_cost_budgets
       SET superseded_at = v_now, superseded_by = p_actor_id
     WHERE service_id = p_service_id AND superseded_at IS NULL;

    SELECT COALESCE(MAX(budget_version), 0) + 1 INTO v_version
      FROM public.event_cost_budgets WHERE service_id = p_service_id;

    INSERT INTO public.event_cost_budgets(
        service_id, budget_version, base_budget_amount, contingency_amount,
        reason, notes, source_reference, approved_by, approved_at, request_id
    ) VALUES (
        p_service_id, v_version, round(p_base_budget_amount, 2), round(p_contingency_amount, 2),
        btrim(p_reason), NULLIF(btrim(p_notes), ''), NULLIF(btrim(p_source_reference), ''),
        p_actor_id, v_now, p_request_id
    ) RETURNING id INTO v_budget_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'event_cost_budget', v_budget_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'event_cost_budget_approved', 'service_id', p_service_id,
            'budget_version', v_version, 'base_budget_amount', round(p_base_budget_amount, 2),
            'contingency_amount', round(p_contingency_amount, 2),
            'approved_budget_cost', round(p_base_budget_amount + p_contingency_amount, 2),
            'request_id', p_request_id
        ), v_now
    );

    RETURN QUERY SELECT NULL::text, v_budget_id, v_version,
        round(p_base_budget_amount + p_contingency_amount, 2), false;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_event_cost_etc(
    p_service_id uuid,
    p_etc_amount numeric,
    p_forecast_date date,
    p_reason text,
    p_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, forecast_id uuid, forecast_version integer, etc_amount numeric, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_actor_uuid uuid;
    v_existing record;
    v_service record;
    v_forecast_id uuid;
    v_version integer;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_service_id IS NULL OR p_request_id IS NULL OR p_forecast_date IS NULL
        OR p_etc_amount IS NULL OR p_etc_amount < 0 OR p_etc_amount <> round(p_etc_amount, 2)
        OR p_etc_amount > 999999999999.99
        OR char_length(btrim(COALESCE(p_reason, ''))) NOT BETWEEN 5 AND 2000
        OR (p_notes IS NOT NULL AND char_length(p_notes) > 4000)
        OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'manager')
    THEN
        RETURN QUERY SELECT 'event_cost_etc_request_invalid', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'event_cost_etc_request_invalid', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END;

    IF NOT EXISTS (SELECT 1 FROM public.app_users WHERE id = v_actor_uuid AND is_active = true AND role = p_actor_role) THEN
        RETURN QUERY SELECT 'event_cost_etc_permission_denied', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w8a:event_cost_etc:' || p_service_id::text, 0));

    SELECT * INTO v_existing FROM public.event_cost_etc_forecasts WHERE request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.service_id IS DISTINCT FROM p_service_id
            OR v_existing.etc_amount IS DISTINCT FROM round(p_etc_amount, 2)
            OR v_existing.forecast_date IS DISTINCT FROM p_forecast_date
            OR v_existing.reason IS DISTINCT FROM btrim(p_reason)
            OR v_existing.notes IS DISTINCT FROM NULLIF(btrim(p_notes), '')
        THEN
            RETURN QUERY SELECT 'event_cost_etc_request_conflict', v_existing.id, v_existing.forecast_version, v_existing.etc_amount, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.forecast_version, v_existing.etc_amount, true;
        END IF;
        RETURN;
    END IF;

    SELECT id INTO v_service FROM public.services WHERE id = p_service_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'event_cost_service_not_found', NULL::uuid, NULL::integer, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM set_config('g7.w8a_rpc_context', 'on', true);
    UPDATE public.event_cost_etc_forecasts
       SET superseded_at = v_now, superseded_by = p_actor_id
     WHERE service_id = p_service_id AND superseded_at IS NULL;

    SELECT COALESCE(MAX(forecast_version), 0) + 1 INTO v_version
      FROM public.event_cost_etc_forecasts WHERE service_id = p_service_id;

    INSERT INTO public.event_cost_etc_forecasts(
        service_id, forecast_version, etc_amount, forecast_date,
        reason, notes, recorded_by, recorded_at, request_id
    ) VALUES (
        p_service_id, v_version, round(p_etc_amount, 2), p_forecast_date,
        btrim(p_reason), NULLIF(btrim(p_notes), ''), p_actor_id, v_now, p_request_id
    ) RETURNING id INTO v_forecast_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'event_cost_etc_forecast', v_forecast_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'event_cost_etc_recorded', 'service_id', p_service_id,
            'forecast_version', v_version, 'etc_amount', round(p_etc_amount, 2),
            'forecast_date', p_forecast_date, 'request_id', p_request_id
        ), v_now
    );

    RETURN QUERY SELECT NULL::text, v_forecast_id, v_version, round(p_etc_amount, 2), false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_event_costing(
    p_service_id uuid,
    p_as_of_date date DEFAULT (timezone('Asia/Riyadh', transaction_timestamp()))::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    IF p_service_id IS NULL OR p_as_of_date IS NULL THEN
        RETURN jsonb_build_object('status', 'UNAVAILABLE', 'reason_codes', jsonb_build_array('invalid_request'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = p_service_id AND deleted_at IS NULL) THEN
        RETURN jsonb_build_object('status', 'UNAVAILABLE', 'reason_codes', jsonb_build_array('service_not_found'));
    END IF;

    WITH
    active_budget AS (
        SELECT b.* FROM public.event_cost_budgets b
        WHERE b.service_id = p_service_id AND b.superseded_at IS NULL
        ORDER BY b.budget_version DESC LIMIT 1
    ),
    asof_budget AS (
        SELECT b.* FROM public.event_cost_budgets b
        WHERE b.service_id = p_service_id
          AND b.approved_at::date <= p_as_of_date
        ORDER BY b.approved_at DESC, b.budget_version DESC LIMIT 1
    ),
    active_etc AS (
        SELECT f.* FROM public.event_cost_etc_forecasts f
        WHERE f.service_id = p_service_id AND f.superseded_at IS NULL
        ORDER BY f.forecast_version DESC LIMIT 1
    ),
    asof_etc AS (
        SELECT f.* FROM public.event_cost_etc_forecasts f
        WHERE f.service_id = p_service_id
          AND f.forecast_date <= p_as_of_date
          AND f.recorded_at::date <= p_as_of_date
        ORDER BY f.forecast_date DESC, f.recorded_at DESC, f.forecast_version DESC LIMIT 1
    ),
    abs_history AS (
        SELECT count(*) > 0 AS has_history
        FROM public.approved_billing_scopes s WHERE s.service_id = p_service_id
    ),
    commercial AS (
        SELECT s.accepted_grand_total AS amount, 'approved_billing_scope'::text AS source_type,
               s.id AS source_id, s.scope_version::text AS source_version
        FROM public.approved_billing_scopes s
        WHERE s.service_id = p_service_id AND s.status = 'approved'
          AND s.superseded_at IS NULL AND s.voided_at IS NULL
        ORDER BY s.scope_version DESC LIMIT 1
    ),
    commercial_fallback AS (
        SELECT q.grand_total AS amount, 'approved_quotation_legacy'::text AS source_type,
               q.id AS source_id, q.quotation_number AS source_version
        FROM public.quotations q, abs_history h
        WHERE q.service_id = p_service_id AND q.status = 'approved'
          AND q.is_deleted = false AND q.superseded_at IS NULL AND h.has_history = false
        ORDER BY q.created_at DESC, q.id ASC LIMIT 1
    ),
    commercial_authority AS (
        SELECT * FROM commercial
        UNION ALL
        SELECT * FROM commercial_fallback WHERE NOT EXISTS (SELECT 1 FROM commercial)
    ),
    commitment_rows AS (
        SELECT b.* FROM public.approved_commitment_balances b
        WHERE b.service_id = p_service_id AND b.status IN ('open', 'closed')
    ),
    commitment_totals AS (
        SELECT count(*)::integer AS source_count,
               COALESCE(sum(authorized_amount), 0)::numeric AS approved_commitment,
               COALESCE(sum(accepted_amount), 0)::numeric AS accepted_commitment,
               COALESCE(sum(pending_amount), 0)::numeric AS pending_commitment,
               COALESCE(sum(open_commitment_amount), 0)::numeric AS open_commitment
        FROM commitment_rows
    ),
    bill_rows AS (
        SELECT b.id, b.bill_number, b.invoice_date, b.due_date, b.total_amount, b.status,
               b.approved_at, b.commitment_id,
               COALESCE(p.paid_amount, 0)::numeric AS paid_amount,
               COALESCE(a.advance_allocated_amount, 0)::numeric AS advance_allocated_amount
        FROM public.supplier_bills b
        LEFT JOIN (
            SELECT p.supplier_bill_id,
                   COALESCE(sum(p.amount) FILTER (
                       WHERE p.payment_date <= p_as_of_date
                         AND p.recorded_at::date <= p_as_of_date
                         AND (r.id IS NULL OR r.reversed_at::date > p_as_of_date)
                   ), 0)::numeric AS paid_amount
            FROM public.supplier_payments p
            LEFT JOIN public.supplier_payment_reversals r ON r.supplier_payment_id = p.id
            GROUP BY p.supplier_bill_id
        ) p ON p.supplier_bill_id = b.id
        LEFT JOIN (
            SELECT a.supplier_bill_id,
                   COALESCE(sum(a.amount) FILTER (
                       WHERE a.allocated_at::date <= p_as_of_date
                         AND (r.id IS NULL OR r.corrected_at::date > p_as_of_date)
                   ), 0)::numeric AS advance_allocated_amount
            FROM public.supplier_advance_allocations a
            LEFT JOIN public.supplier_advance_allocation_reversals r ON r.supplier_advance_allocation_id = a.id
            GROUP BY a.supplier_bill_id
        ) a ON a.supplier_bill_id = b.id
        WHERE b.service_id = p_service_id
    ),
    bill_totals AS (
        SELECT count(*) FILTER (WHERE status = 'approved' AND invoice_date <= p_as_of_date AND approved_at::date <= p_as_of_date)::integer AS approved_count,
               count(*) FILTER (WHERE status = 'pending')::integer AS pending_count,
               COALESCE(sum(total_amount) FILTER (WHERE status = 'approved' AND invoice_date <= p_as_of_date AND approved_at::date <= p_as_of_date), 0)::numeric AS actual_cost,
               COALESCE(sum(least(total_amount, paid_amount + advance_allocated_amount)) FILTER (WHERE status = 'approved' AND invoice_date <= p_as_of_date AND approved_at::date <= p_as_of_date), 0)::numeric AS paid_cost
        FROM bill_rows
    ),
    expense_rows AS (
        SELECT e.id, e.expense_number, e.expense_date, e.amount, e.status, e.approved_at,
               COALESCE(r.reimbursed_amount, 0) + COALESCE(a.advance_allocated_amount, 0) + COALESCE(p.petty_cash_allocated_amount, 0) AS paid_amount
        FROM public.expenses e
        LEFT JOIN (
            SELECT expense_id, COALESCE(sum(amount), 0)::numeric AS reimbursed_amount
            FROM public.expense_reimbursement_settlements
            WHERE settled_at::date <= p_as_of_date GROUP BY expense_id
        ) r ON r.expense_id = e.id
        LEFT JOIN (
            SELECT expense_id, COALESCE(sum(amount), 0)::numeric AS advance_allocated_amount
            FROM public.cash_advance_expense_settlements
            WHERE settled_at::date <= p_as_of_date GROUP BY expense_id
        ) a ON a.expense_id = e.id
        LEFT JOIN (
            SELECT expense_id, COALESCE(sum(amount), 0)::numeric AS petty_cash_allocated_amount
            FROM public.petty_cash_transactions
            WHERE transaction_type = 'disbursement' AND recorded_at::date <= p_as_of_date GROUP BY expense_id
        ) p ON p.expense_id = e.id
        WHERE e.service_id = p_service_id AND e.context_type = 'event'
    ),
    expense_totals AS (
        SELECT count(*) FILTER (WHERE status = 'approved' AND expense_date <= p_as_of_date AND approved_at::date <= p_as_of_date)::integer AS approved_count,
               count(*) FILTER (WHERE status = 'submitted')::integer AS pending_count,
               COALESCE(sum(amount) FILTER (WHERE status = 'approved' AND expense_date <= p_as_of_date AND approved_at::date <= p_as_of_date), 0)::numeric AS actual_cost,
               COALESCE(sum(least(amount, paid_amount)) FILTER (WHERE status = 'approved' AND expense_date <= p_as_of_date AND approved_at::date <= p_as_of_date), 0)::numeric AS paid_cost
        FROM expense_rows
    ),
    supplier_payment_drill AS (
        SELECT p.id, p.payment_number, p.supplier_bill_id, p.payment_date, p.amount,
               (r.id IS NOT NULL) AS reversed
        FROM public.supplier_payments p
        LEFT JOIN public.supplier_payment_reversals r ON r.supplier_payment_id = p.id
        WHERE p.service_id = p_service_id
          AND p.payment_date <= p_as_of_date
          AND p.recorded_at::date <= p_as_of_date
        ORDER BY p.payment_date DESC, p.payment_number DESC, p.id ASC
        LIMIT 50
    ),
    advance_allocation_drill AS (
        SELECT a.id, a.allocation_number, a.supplier_bill_id, a.allocated_at, a.amount,
               (r.id IS NOT NULL) AS reversed
        FROM public.supplier_advance_allocations a
        JOIN public.supplier_bills b ON b.id = a.supplier_bill_id
        LEFT JOIN public.supplier_advance_allocation_reversals r ON r.supplier_advance_allocation_id = a.id
        WHERE b.service_id = p_service_id
          AND a.allocated_at::date <= p_as_of_date
        ORDER BY a.allocated_at DESC, a.allocation_number DESC, a.id ASC
        LIMIT 50
    ),
    totals AS (
        SELECT c.approved_commitment, c.accepted_commitment, c.pending_commitment, c.open_commitment,
               c.source_count AS commitment_count,
               b.approved_count AS bill_count, b.pending_count AS pending_bill_count,
               b.actual_cost AS bill_actual_cost, b.paid_cost AS bill_paid_cost,
               e.approved_count AS expense_count, e.pending_count AS pending_expense_count,
               e.actual_cost AS expense_actual_cost, e.paid_cost AS expense_paid_cost,
               ab.base_budget_amount, ab.contingency_amount, ab.approved_budget_cost,
               ae.etc_amount, ca.amount AS commercial_amount,
               ca.source_type AS commercial_source_type, ca.source_id AS commercial_source_id,
               ca.source_version AS commercial_source_version
        FROM commitment_totals c CROSS JOIN bill_totals b CROSS JOIN expense_totals e
        LEFT JOIN asof_budget ab ON true
        LEFT JOIN asof_etc ae ON true
        LEFT JOIN commercial_authority ca ON true
    ),
    calculated AS (
        SELECT t.*,
               round(t.bill_actual_cost + t.expense_actual_cost, 2) AS actual_cost,
               round(t.bill_paid_cost + t.expense_paid_cost, 2) AS paid_cost
        FROM totals t
    )
    SELECT jsonb_build_object(
        'status', CASE WHEN t.base_budget_amount IS NULL OR t.etc_amount IS NULL OR t.commercial_amount IS NULL
                       OR t.pending_bill_count > 0 OR t.pending_expense_count > 0 THEN 'PARTIAL' ELSE 'COMPLETE' END,
        'as_of_date', p_as_of_date,
        'service_id', p_service_id,
        'budget', jsonb_build_object(
            'available', t.base_budget_amount IS NOT NULL,
            'base_budget', t.base_budget_amount,
            'contingency', t.contingency_amount,
            'approved_budget_cost', t.approved_budget_cost
        ),
        'approved_commitment', t.approved_commitment,
        'accepted_commitment', t.accepted_commitment,
        'pending_commitment', t.pending_commitment,
        'open_commitment', t.open_commitment,
        'actual_cost', t.actual_cost,
        'paid_cost', t.paid_cost,
        'outstanding_cost', greatest(t.actual_cost - t.paid_cost, 0),
        'etc', t.etc_amount,
        'eac', CASE WHEN t.etc_amount IS NULL THEN NULL ELSE round(t.actual_cost + t.etc_amount, 2) END,
        'net_approved_commercial_value', t.commercial_amount,
        'forecast_margin', CASE WHEN t.etc_amount IS NULL OR t.commercial_amount IS NULL THEN NULL
                                ELSE round(t.commercial_amount - (t.actual_cost + t.etc_amount), 2) END,
        'commercial_authority', jsonb_build_object(
            'source_type', t.commercial_source_type, 'source_id', t.commercial_source_id,
            'source_version', t.commercial_source_version
        ),
        'completeness', jsonb_build_object(
            'status', CASE WHEN t.base_budget_amount IS NULL OR t.etc_amount IS NULL OR t.commercial_amount IS NULL
                           OR t.pending_bill_count > 0 OR t.pending_expense_count > 0 THEN 'PARTIAL' ELSE 'COMPLETE' END,
            'reason_codes', to_jsonb(array_remove(ARRAY[
                CASE WHEN t.base_budget_amount IS NULL THEN 'budget_unavailable' END,
                CASE WHEN t.etc_amount IS NULL THEN 'etc_unavailable' END,
                CASE WHEN t.commercial_amount IS NULL THEN 'commercial_authority_unavailable' END,
                CASE WHEN t.pending_bill_count > 0 THEN 'pending_supplier_bills' END,
                CASE WHEN t.pending_expense_count > 0 THEN 'pending_event_expenses' END
            ], NULL))
        ),
        'source_counts', jsonb_build_object(
            'commitments', t.commitment_count,
            'supplier_bills_approved', t.bill_count,
            'supplier_bills_pending', t.pending_bill_count,
            'event_expenses_approved', t.expense_count,
            'event_expenses_pending', t.pending_expense_count
        ),
        'drill', jsonb_build_object(
            'budget_versions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', b.id, 'version', b.budget_version, 'base_budget', b.base_budget_amount,
                'contingency', b.contingency_amount, 'approved_budget_cost', b.approved_budget_cost,
                'approved_at', b.approved_at, 'superseded_at', b.superseded_at
            ) ORDER BY b.budget_version DESC) FROM (SELECT * FROM public.event_cost_budgets WHERE service_id = p_service_id ORDER BY budget_version DESC LIMIT 50) b), '[]'::jsonb),
            'commitments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', c.id, 'authorized_amount', c.authorized_amount, 'accepted_amount', c.accepted_amount,
                'pending_amount', c.pending_amount, 'open_commitment_amount', c.open_commitment_amount,
                'status', c.status, 'approved_at', c.approved_at
            ) ORDER BY c.approved_at DESC, c.id ASC) FROM (SELECT * FROM commitment_rows ORDER BY approved_at DESC, id ASC LIMIT 50) c), '[]'::jsonb),
            'supplier_bills', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', b.id, 'bill_number', b.bill_number, 'invoice_date', b.invoice_date,
                'total_amount', b.total_amount, 'paid_amount', least(b.total_amount, b.paid_amount + b.advance_allocated_amount),
                'outstanding_amount', greatest(b.total_amount - b.paid_amount - b.advance_allocated_amount, 0), 'status', b.status
            ) ORDER BY b.invoice_date DESC, b.id ASC) FROM (SELECT * FROM bill_rows ORDER BY invoice_date DESC, id ASC LIMIT 50) b), '[]'::jsonb),
            'event_expenses', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', e.id, 'expense_number', e.expense_number, 'expense_date', e.expense_date,
                'amount', e.amount, 'paid_amount', least(e.amount, e.paid_amount),
                'outstanding_amount', greatest(e.amount - e.paid_amount, 0), 'status', e.status
            ) ORDER BY e.expense_date DESC, e.id ASC) FROM (SELECT * FROM expense_rows ORDER BY expense_date DESC, id ASC LIMIT 50) e), '[]'::jsonb),
            'supplier_payments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', p.id, 'payment_number', p.payment_number, 'supplier_bill_id', p.supplier_bill_id,
                'payment_date', p.payment_date, 'amount', p.amount, 'reversed', p.reversed
            ) ORDER BY p.payment_date DESC, p.payment_number DESC, p.id ASC) FROM supplier_payment_drill p), '[]'::jsonb),
            'advance_allocations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', a.id, 'allocation_number', a.allocation_number, 'supplier_bill_id', a.supplier_bill_id,
                'allocated_at', a.allocated_at, 'amount', a.amount, 'reversed', a.reversed
            ) ORDER BY a.allocated_at DESC, a.allocation_number DESC, a.id ASC) FROM advance_allocation_drill a), '[]'::jsonb),
            'etc_versions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', f.id, 'version', f.forecast_version, 'etc_amount', f.etc_amount,
                'forecast_date', f.forecast_date, 'recorded_at', f.recorded_at, 'superseded_at', f.superseded_at
            ) ORDER BY f.forecast_date DESC, f.forecast_version DESC) FROM (SELECT * FROM public.event_cost_etc_forecasts WHERE service_id = p_service_id ORDER BY forecast_date DESC, forecast_version DESC LIMIT 50) f), '[]'::jsonb)
        )
    ) INTO v_result
    FROM calculated t;

    RETURN COALESCE(v_result, jsonb_build_object('status', 'UNAVAILABLE', 'reason_codes', jsonb_build_array('source_unavailable')));
END;
$$;

REVOKE ALL ON FUNCTION public.approve_event_cost_budget(uuid,numeric,numeric,text,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_event_cost_etc(uuid,numeric,date,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_event_costing(uuid,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_event_cost_budget(uuid,numeric,numeric,text,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_event_cost_etc(uuid,numeric,date,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_costing(uuid,date) TO service_role;

COMMENT ON TABLE public.event_cost_budgets IS
    'Immutable approved Event Cost Budget versions. Approved Budget Cost is Base Budget + Event Contingency; not a generic budgeting engine.';
COMMENT ON TABLE public.event_cost_etc_forecasts IS
    'Immutable remaining direct-cost forecast versions. ETC is not automatically Open Commitment.';
COMMENT ON FUNCTION public.get_event_costing(uuid,date) IS
    'Bounded service-scoped managerial Event Costing read model with completeness disclosure and bounded source drill; not accounting profit.';

COMMIT;
