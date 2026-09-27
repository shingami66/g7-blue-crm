-- W8B — Event Cost Close with the narrow W6C unused-authorization release prerequisite.
-- Authoring only.  This migration is intentionally additive and is not to be
-- applied outside the Controller-owned DEV gate.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.service_lifecycle_states') IS NULL
        OR to_regclass('public.event_cost_budgets') IS NULL
        OR to_regclass('public.event_cost_etc_forecasts') IS NULL
        OR to_regclass('public.approved_commitment_balances') IS NULL
        OR to_regclass('public.supplier_advance_commitment_balances') IS NULL
        OR to_regprocedure('public.get_event_costing(uuid,date)') IS NULL
    THEN
        RAISE EXCEPTION 'W8B preflight failed: required W3/W5/W6/W8A authority is missing';
    END IF;

    IF to_regclass('public.event_cost_close_versions') IS NOT NULL
        OR to_regclass('public.event_cost_close_reopenings') IS NOT NULL
        OR to_regclass('public.supplier_advance_authorization_releases') IS NOT NULL
        OR to_regprocedure('public.close_event_cost(uuid,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.reopen_event_cost(uuid,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.release_supplier_advance_authorization(uuid,text,uuid,text,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'W8B preflight failed: Event Cost Close objects already exist';
    END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Connected W6C prerequisite: release an authorization which never became a
-- cash, allocation, reversal, or refund event.  The original authorization is
-- preserved; this is neither a payment nor a refund.
-- ---------------------------------------------------------------------------

CREATE TABLE public.supplier_advance_authorization_releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_advance_id uuid NOT NULL UNIQUE REFERENCES public.supplier_advances(id) ON DELETE RESTRICT,
    reason text NOT NULL,
    released_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    released_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    release_request_id uuid NOT NULL UNIQUE,
    CONSTRAINT supplier_advance_authorization_release_reason_check
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000)
);

CREATE INDEX supplier_advance_authorization_releases_advance_idx
    ON public.supplier_advance_authorization_releases(supplier_advance_id, released_at DESC);

CREATE TRIGGER supplier_advance_authorization_releases_immutable
    BEFORE UPDATE OR DELETE ON public.supplier_advance_authorization_releases
    FOR EACH ROW EXECUTE FUNCTION public.prevent_supplier_advance_event_mutation();

ALTER TABLE public.supplier_advance_authorization_releases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.supplier_advance_authorization_releases FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.supplier_advance_authorization_releases TO service_role;

CREATE OR REPLACE VIEW public.supplier_advance_balances WITH (security_invoker = true) AS
WITH payment_totals AS (
    SELECT p.supplier_advance_id,
        COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL), 0)::numeric(14,2) AS paid_amount,
        COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NOT NULL), 0)::numeric(14,2) AS reversed_amount
    FROM public.supplier_advance_payments p
    LEFT JOIN public.supplier_advance_payment_reversals r ON r.supplier_advance_payment_id = p.id
    GROUP BY p.supplier_advance_id
), allocation_totals AS (
    SELECT a.supplier_advance_id,
        COALESCE(SUM(a.amount) FILTER (WHERE r.id IS NULL), 0)::numeric(14,2) AS allocated_amount
    FROM public.supplier_advance_allocations a
    LEFT JOIN public.supplier_advance_allocation_reversals r ON r.supplier_advance_allocation_id = a.id
    GROUP BY a.supplier_advance_id
), refund_totals AS (
    SELECT supplier_advance_id, COALESCE(SUM(amount), 0)::numeric(14,2) AS refunded_amount
    FROM public.supplier_advance_refunds GROUP BY supplier_advance_id
)
SELECT a.id AS supplier_advance_id, a.advance_number, a.commitment_id, a.supplier_id, a.service_id,
    a.currency, a.authorized_amount, a.authorized_at, a.authorized_by,
    COALESCE(p.paid_amount, 0)::numeric(14,2) AS paid_amount,
    COALESCE(x.allocated_amount, 0)::numeric(14,2) AS allocated_amount,
    COALESCE(f.refunded_amount, 0)::numeric(14,2) AS refunded_amount,
    COALESCE(p.reversed_amount, 0)::numeric(14,2) AS reversed_amount,
    greatest(COALESCE(p.paid_amount, 0) - COALESCE(x.allocated_amount, 0) - COALESCE(f.refunded_amount, 0), 0)::numeric(14,2) AS remaining_unallocated_amount,
    CASE WHEN r.id IS NOT NULL THEN 'released'
         WHEN COALESCE(p.paid_amount, 0) >= a.authorized_amount THEN 'paid'
         WHEN COALESCE(p.paid_amount, 0) > 0 THEN 'partially_paid' ELSE 'authorized' END AS status
    ,(r.id IS NOT NULL) AS authorization_released
    ,r.released_at
FROM public.supplier_advances a
LEFT JOIN payment_totals p ON p.supplier_advance_id = a.id
LEFT JOIN allocation_totals x ON x.supplier_advance_id = a.id
LEFT JOIN refund_totals f ON f.supplier_advance_id = a.id
LEFT JOIN public.supplier_advance_authorization_releases r ON r.supplier_advance_id = a.id;

CREATE OR REPLACE VIEW public.supplier_advance_commitment_balances WITH (security_invoker = true) AS
WITH reserves AS (
    SELECT a.commitment_id,
        COALESCE(SUM(greatest(a.authorized_amount - COALESCE(x.allocated_amount, 0) - COALESCE(f.refunded_amount, 0), 0)), 0)::numeric(14,2) AS existing_advance_reserve
    FROM public.supplier_advances a
    LEFT JOIN public.supplier_advance_authorization_releases ar ON ar.supplier_advance_id = a.id
    LEFT JOIN (
        SELECT x.supplier_advance_id, SUM(x.amount)::numeric(14,2) AS allocated_amount
        FROM public.supplier_advance_allocations x
        LEFT JOIN public.supplier_advance_allocation_reversals r ON r.supplier_advance_allocation_id = x.id
        WHERE r.id IS NULL GROUP BY x.supplier_advance_id
    ) x ON x.supplier_advance_id = a.id
    LEFT JOIN (
        SELECT supplier_advance_id, SUM(amount)::numeric(14,2) AS refunded_amount
        FROM public.supplier_advance_refunds GROUP BY supplier_advance_id
    ) f ON f.supplier_advance_id = a.id
    WHERE ar.id IS NULL
    GROUP BY a.commitment_id
)
SELECT b.id AS commitment_id, b.service_id, b.supplier_id, b.currency, b.authorized_amount,
    b.open_commitment_amount, b.status AS commitment_status, b.approved_at AS commitment_approved_at,
    b.commitment_source, b.source_reference, q.supplier_reference AS supplier_quotation_reference,
    COALESCE(r.existing_advance_reserve, 0)::numeric(14,2) AS existing_advance_reserve,
    greatest(b.open_commitment_amount - COALESCE(r.existing_advance_reserve, 0), 0)::numeric(14,2) AS available_authorization_amount
FROM public.approved_commitment_balances b
LEFT JOIN reserves r ON r.commitment_id = b.id
LEFT JOIN public.supplier_quotations q ON q.id = b.supplier_quotation_id;

CREATE OR REPLACE FUNCTION public.guard_released_supplier_advance_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_advance_id uuid;
BEGIN
    v_advance_id := NEW.supplier_advance_id;
    PERFORM 1 FROM public.supplier_advances WHERE id = v_advance_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'supplier_advance_not_found'; END IF;
    IF EXISTS (SELECT 1 FROM public.supplier_advance_authorization_releases WHERE supplier_advance_id = v_advance_id) THEN
        RAISE EXCEPTION 'supplier_advance_authorization_released';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER supplier_advance_payment_released_guard
    BEFORE INSERT ON public.supplier_advance_payments
    FOR EACH ROW EXECUTE FUNCTION public.guard_released_supplier_advance_event();
CREATE TRIGGER supplier_advance_allocation_released_guard
    BEFORE INSERT ON public.supplier_advance_allocations
    FOR EACH ROW EXECUTE FUNCTION public.guard_released_supplier_advance_event();
CREATE TRIGGER supplier_advance_refund_released_guard
    BEFORE INSERT ON public.supplier_advance_refunds
    FOR EACH ROW EXECUTE FUNCTION public.guard_released_supplier_advance_event();

CREATE OR REPLACE FUNCTION public.release_supplier_advance_authorization(
    p_advance_id uuid, p_reason text, p_request_id uuid, p_actor_id text, p_actor_role text
)
RETURNS TABLE(error_code text, release_id uuid, advance_id uuid, idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_actor uuid;
    v_reason text := NULLIF(btrim(p_reason), '');
    v_advance public.supplier_advances%ROWTYPE;
    v_existing public.supplier_advance_authorization_releases%ROWTYPE;
    v_now timestamptz := transaction_timestamp();
    v_release_id uuid;
BEGIN
    IF p_advance_id IS NULL OR p_request_id IS NULL OR v_reason IS NULL
        OR char_length(v_reason) NOT BETWEEN 5 AND 2000
        OR NULLIF(btrim(p_actor_id), '') IS NULL OR COALESCE(p_actor_role, '') NOT IN ('admin', 'manager')
    THEN
        RETURN QUERY SELECT 'supplier_advance_release_request_invalid', NULL::uuid, p_advance_id, false; RETURN;
    END IF;
    BEGIN v_actor := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_advance_release_request_invalid', NULL::uuid, p_advance_id, false; RETURN;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = v_actor AND u.is_active AND u.role = p_actor_role) THEN
        RETURN QUERY SELECT 'supplier_advance_release_permission_denied', NULL::uuid, p_advance_id, false; RETURN;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('w6c:authorization-release:' || p_request_id::text, 0));
    SELECT * INTO v_existing FROM public.supplier_advance_authorization_releases WHERE release_request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.supplier_advance_id IS DISTINCT FROM p_advance_id OR v_existing.reason IS DISTINCT FROM v_reason THEN
            RETURN QUERY SELECT 'supplier_advance_release_request_conflict', v_existing.id, v_existing.supplier_advance_id, false; RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.supplier_advance_id, true; RETURN;
    END IF;
    SELECT * INTO v_advance FROM public.supplier_advances WHERE id = p_advance_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_not_found', NULL::uuid, p_advance_id, false; RETURN; END IF;
    PERFORM public.assert_event_cost_authority_open(v_advance.service_id);
    IF EXISTS (SELECT 1 FROM public.supplier_advance_authorization_releases WHERE supplier_advance_id = p_advance_id)
        OR EXISTS (SELECT 1 FROM public.supplier_advance_payments WHERE supplier_advance_id = p_advance_id)
        OR EXISTS (SELECT 1 FROM public.supplier_advance_payment_reversals r JOIN public.supplier_advance_payments p ON p.id = r.supplier_advance_payment_id WHERE p.supplier_advance_id = p_advance_id)
        OR EXISTS (SELECT 1 FROM public.supplier_advance_allocations WHERE supplier_advance_id = p_advance_id)
        OR EXISTS (SELECT 1 FROM public.supplier_advance_allocation_reversals r JOIN public.supplier_advance_allocations a ON a.id = r.supplier_advance_allocation_id WHERE a.supplier_advance_id = p_advance_id)
        OR EXISTS (SELECT 1 FROM public.supplier_advance_refunds WHERE supplier_advance_id = p_advance_id)
    THEN
        RETURN QUERY SELECT 'supplier_advance_release_not_unused', NULL::uuid, p_advance_id, false; RETURN;
    END IF;
    INSERT INTO public.supplier_advance_authorization_releases(supplier_advance_id, reason, released_by, released_at, release_request_id)
    VALUES (p_advance_id, v_reason, v_actor, v_now, p_request_id) RETURNING id INTO v_release_id;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('create', 'supplier_advance_authorization_release', v_release_id, p_actor_id,
        jsonb_build_object('event_type', 'supplier_advance_authorization_released', 'supplier_advance_id', p_advance_id,
            'service_id', v_advance.service_id, 'reason', v_reason, 'request_id', p_request_id, 'actor_role', p_actor_role), v_now);
    RETURN QUERY SELECT NULL::text, v_release_id, p_advance_id, false;
END;
$$;

-- ---------------------------------------------------------------------------
-- W8B Event Cost Close authority.  It is deliberately separate from W3
-- operational lifecycle close and from future accounting close.
-- ---------------------------------------------------------------------------

CREATE TABLE public.event_cost_close_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    close_version integer NOT NULL,
    effective_date date NOT NULL,
    reason text NOT NULL,
    closed_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    closed_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    close_request_id uuid NOT NULL UNIQUE,
    budget_version integer,
    etc_version integer,
    commercial_source_type text,
    commercial_source_id uuid,
    commercial_source_version text,
    base_budget numeric(14,2),
    contingency numeric(14,2),
    approved_budget_cost numeric(14,2),
    approved_commitment numeric(14,2) NOT NULL,
    accepted_commitment numeric(14,2) NOT NULL,
    pending_commitment numeric(14,2) NOT NULL,
    open_commitment numeric(14,2) NOT NULL,
    actual_cost numeric(14,2) NOT NULL,
    paid_cost numeric(14,2) NOT NULL,
    outstanding_cost numeric(14,2) NOT NULL,
    etc numeric(14,2) NOT NULL,
    eac numeric(14,2) NOT NULL,
    net_approved_commercial_value numeric(14,2) NOT NULL,
    final_managerial_event_margin numeric(14,2) NOT NULL,
    completeness_status text NOT NULL,
    source_counts jsonb NOT NULL,
    readiness_evidence jsonb NOT NULL,
    costing_snapshot jsonb NOT NULL,
    CONSTRAINT event_cost_close_versions_service_version_key UNIQUE(service_id, close_version),
    CONSTRAINT event_cost_close_versions_reason_check CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    CONSTRAINT event_cost_close_versions_etc_check CHECK (etc = 0),
    CONSTRAINT event_cost_close_versions_eac_check CHECK (eac = actual_cost),
    CONSTRAINT event_cost_close_versions_margin_check CHECK (final_managerial_event_margin = net_approved_commercial_value - actual_cost),
    CONSTRAINT event_cost_close_versions_completeness_check CHECK (completeness_status = 'COMPLETE')
);

CREATE TABLE public.event_cost_close_reopenings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_cost_close_version_id uuid NOT NULL UNIQUE REFERENCES public.event_cost_close_versions(id) ON DELETE RESTRICT,
    reason text NOT NULL,
    reopened_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    reopened_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    reopen_request_id uuid NOT NULL UNIQUE,
    CONSTRAINT event_cost_close_reopenings_reason_check CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000)
);

CREATE INDEX event_cost_close_versions_service_history_idx ON public.event_cost_close_versions(service_id, close_version DESC);
CREATE INDEX event_cost_close_reopenings_version_idx ON public.event_cost_close_reopenings(event_cost_close_version_id, reopened_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_event_cost_close_history_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION 'event_cost_close_history_immutable'; END;
$$;

CREATE TRIGGER event_cost_close_versions_immutable
    BEFORE UPDATE OR DELETE ON public.event_cost_close_versions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_event_cost_close_history_mutation();
CREATE TRIGGER event_cost_close_reopenings_immutable
    BEFORE UPDATE OR DELETE ON public.event_cost_close_reopenings
    FOR EACH ROW EXECUTE FUNCTION public.prevent_event_cost_close_history_mutation();

ALTER TABLE public.event_cost_close_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_cost_close_reopenings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.event_cost_close_versions, public.event_cost_close_reopenings FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.event_cost_close_versions, public.event_cost_close_reopenings TO service_role;

CREATE OR REPLACE FUNCTION public.event_cost_close_is_active(p_service_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.event_cost_close_versions c
        LEFT JOIN public.event_cost_close_reopenings r ON r.event_cost_close_version_id = c.id
        WHERE c.service_id = p_service_id AND r.id IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.assert_event_cost_authority_open(p_service_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
    IF p_service_id IS NULL THEN RAISE EXCEPTION 'event_cost_service_required'; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('w8b:event-cost-close:' || p_service_id::text, 0));
    IF public.event_cost_close_is_active(p_service_id) THEN
        RAISE EXCEPTION 'event_cost_closed_reopen_required';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_event_cost_authority_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_service_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'approved_commitment_amendments' THEN
        SELECT c.service_id INTO v_service_id
        FROM public.approved_commitments c
        WHERE c.id = NEW.commitment_id;
    ELSIF TG_TABLE_NAME = 'service_receipt_corrections' THEN
        SELECT c.service_id INTO v_service_id
        FROM public.service_receipts sr
        JOIN public.approved_commitments c ON c.id = sr.commitment_id
        WHERE sr.id = NEW.receipt_id;
    ELSIF TG_TABLE_NAME = 'supplier_advance_authorization_releases' THEN
        SELECT a.service_id INTO v_service_id
        FROM public.supplier_advances a
        WHERE a.id = NEW.supplier_advance_id;
    ELSE
        v_service_id := NEW.service_id;
    END IF;
    IF v_service_id IS NOT NULL THEN PERFORM public.assert_event_cost_authority_open(v_service_id); END IF;
    RETURN NEW;
END;
$$;

-- Cost-authority sources are guarded at persistence, including direct service-role
-- paths.  Settlement-only supplier payments/reversals and reimbursement rows are
-- intentionally not included.
CREATE TRIGGER a_event_cost_close_budget_guard
    BEFORE INSERT OR UPDATE ON public.event_cost_budgets
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();
CREATE TRIGGER a_event_cost_close_etc_guard
    BEFORE INSERT OR UPDATE ON public.event_cost_etc_forecasts
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();
CREATE TRIGGER a_event_cost_close_commitment_guard
    BEFORE INSERT OR UPDATE ON public.approved_commitments
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();
CREATE TRIGGER a_event_cost_close_commitment_amendment_guard
    BEFORE INSERT ON public.approved_commitment_amendments
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();
CREATE TRIGGER a_event_cost_close_receipt_guard
    BEFORE INSERT OR UPDATE ON public.service_receipts
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();
CREATE TRIGGER a_event_cost_close_receipt_correction_guard
    BEFORE INSERT ON public.service_receipt_corrections
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();
CREATE TRIGGER a_event_cost_close_supplier_bill_guard
    BEFORE INSERT OR UPDATE ON public.supplier_bills
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();
CREATE TRIGGER a_event_cost_close_expense_guard
    BEFORE INSERT OR UPDATE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();
CREATE TRIGGER a_event_cost_close_cash_advance_guard
    BEFORE INSERT OR UPDATE ON public.employee_cash_advances
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();
CREATE TRIGGER a_event_cost_close_supplier_advance_guard
    BEFORE INSERT ON public.supplier_advances
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();
CREATE TRIGGER a_event_cost_close_supplier_advance_release_guard
    BEFORE INSERT ON public.supplier_advance_authorization_releases
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

CREATE OR REPLACE FUNCTION public.get_event_cost_close_readiness(
    p_service_id uuid,
    p_as_of_date date DEFAULT (timezone('Asia/Riyadh', transaction_timestamp()))::date
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_cost jsonb;
    v_lifecycle record;
    v_lifecycle_exists boolean := false;
    v_pending_receipts integer;
    v_unresolved_cash_advances integer;
    v_unresolved_supplier_advances integer;
    v_pending_evidence_exceptions integer;
    v_blockers jsonb := '[]'::jsonb;
    v_warnings jsonb := '[]'::jsonb;
    v_ready boolean;
BEGIN
    IF p_service_id IS NULL OR p_as_of_date IS NULL THEN
        RETURN jsonb_build_object('ready', false, 'blockers', jsonb_build_array(jsonb_build_object('code', 'event_cost_close_request_invalid')));
    END IF;
    v_cost := public.get_event_costing(p_service_id, p_as_of_date);
    SELECT * INTO v_lifecycle FROM public.service_lifecycle_states WHERE service_id = p_service_id;
    v_lifecycle_exists := FOUND;
    IF NOT v_lifecycle_exists THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'operational_lifecycle_unavailable'));
    ELSIF v_lifecycle.execution_state <> 'ended' THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'operational_execution_not_ended'));
    END IF;
    IF v_lifecycle_exists AND v_lifecycle.completion_state <> 'confirmed' THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'operational_completion_not_confirmed'));
    END IF;
    IF v_lifecycle_exists AND v_lifecycle.close_state <> 'closed' THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'operational_service_not_closed'));
    END IF;
    IF COALESCE(v_cost #>> '{completeness,status}', v_cost ->> 'status') <> 'COMPLETE' THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'event_costing_incomplete', 'reasons', COALESCE(v_cost #> '{completeness,reason_codes}', '[]'::jsonb)));
    END IF;
    IF COALESCE((v_cost #>> '{source_counts,supplier_bills_pending}')::integer, 0) > 0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'pending_supplier_bills'));
    END IF;
    IF COALESCE((v_cost #>> '{source_counts,event_expenses_pending}')::integer, 0) > 0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'pending_event_expenses'));
    END IF;
    IF COALESCE((v_cost ->> 'pending_commitment')::numeric, 0) <> 0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'pending_commitment_amount'));
    END IF;
    IF COALESCE((v_cost ->> 'open_commitment')::numeric, 0) <> 0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'open_commitment_amount'));
    END IF;
    IF COALESCE((v_cost ->> 'etc')::numeric, -1) <> 0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'etc_not_zero'));
    END IF;
    SELECT count(*)::integer INTO v_pending_receipts FROM public.service_receipts
    WHERE service_id = p_service_id AND acceptance_status = 'PENDING';
    IF v_pending_receipts > 0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'pending_service_receipts', 'count', v_pending_receipts));
    END IF;
    SELECT count(*)::integer INTO v_unresolved_cash_advances FROM public.employee_cash_advances
    WHERE service_id = p_service_id AND context_type = 'event'
      AND status NOT IN ('settled', 'rejected', 'cancelled');
    IF v_unresolved_cash_advances > 0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'unresolved_event_cash_advances', 'count', v_unresolved_cash_advances));
    END IF;
    SELECT count(*)::integer INTO v_unresolved_supplier_advances
    FROM public.supplier_advance_commitment_balances b
    WHERE b.service_id = p_service_id AND b.existing_advance_reserve > 0;
    IF v_unresolved_supplier_advances > 0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'unresolved_supplier_advance_reserve', 'count', v_unresolved_supplier_advances));
    END IF;
    SELECT count(*)::integer INTO v_pending_evidence_exceptions
    FROM public.expense_evidence_exceptions x
    JOIN public.expenses e ON e.id = x.expense_id
    WHERE e.service_id = p_service_id AND e.context_type = 'event' AND x.disposition = 'pending';
    IF v_pending_evidence_exceptions > 0 THEN
        v_blockers := v_blockers || jsonb_build_array(jsonb_build_object('code', 'unresolved_cost_evidence_exception', 'count', v_pending_evidence_exceptions));
    END IF;
    IF COALESCE((v_cost ->> 'outstanding_cost')::numeric, 0) > 0 THEN
        v_warnings := v_warnings || jsonb_build_array(jsonb_build_object('code', 'approved_cost_outstanding_settlement', 'amount', v_cost -> 'outstanding_cost'));
    END IF;
    v_ready := jsonb_array_length(v_blockers) = 0;
    RETURN jsonb_build_object(
        'ready', v_ready,
        'as_of_date', p_as_of_date,
        'blockers', v_blockers,
        'warnings', v_warnings,
        'costing', v_cost,
        'source_evidence', jsonb_build_object(
            'pending_service_receipts', v_pending_receipts,
            'unresolved_event_cash_advances', v_unresolved_cash_advances,
            'unresolved_supplier_advance_reserves', v_unresolved_supplier_advances,
            'pending_expense_evidence_exceptions', v_pending_evidence_exceptions
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.close_event_cost(
    p_service_id uuid, p_reason text, p_request_id uuid, p_actor_id text, p_actor_role text
)
RETURNS TABLE(error_code text, close_id uuid, close_version integer, idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_actor uuid;
    v_reason text := NULLIF(btrim(p_reason), '');
    v_now timestamptz := transaction_timestamp();
    v_effective_date date := (timezone('Asia/Riyadh', v_now))::date;
    v_existing public.event_cost_close_versions%ROWTYPE;
    v_readiness jsonb;
    v_cost jsonb;
    v_version integer;
    v_close_id uuid;
    v_budget_version integer;
    v_etc_version integer;
BEGIN
    IF p_service_id IS NULL OR p_request_id IS NULL OR v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 5 AND 2000
        OR NULLIF(btrim(p_actor_id), '') IS NULL OR COALESCE(p_actor_role, '') NOT IN ('admin', 'manager')
    THEN RETURN QUERY SELECT 'event_cost_close_request_invalid', NULL::uuid, NULL::integer, false; RETURN; END IF;
    BEGIN v_actor := p_actor_id::uuid; EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'event_cost_close_request_invalid', NULL::uuid, NULL::integer, false; RETURN;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = v_actor AND u.is_active AND u.role = p_actor_role) THEN
        RETURN QUERY SELECT 'event_cost_close_permission_denied', NULL::uuid, NULL::integer, false; RETURN;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('w8b:event-cost-close:' || p_service_id::text, 0));
    SELECT * INTO v_existing FROM public.event_cost_close_versions WHERE close_request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.service_id IS DISTINCT FROM p_service_id OR v_existing.reason IS DISTINCT FROM v_reason THEN
            RETURN QUERY SELECT 'event_cost_close_request_conflict', v_existing.id, v_existing.close_version, false; RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.close_version, true; RETURN;
    END IF;
    PERFORM 1 FROM public.services WHERE id = p_service_id AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'event_cost_service_not_found', NULL::uuid, NULL::integer, false; RETURN; END IF;
    IF public.event_cost_close_is_active(p_service_id) THEN
        RETURN QUERY SELECT 'event_cost_already_closed', NULL::uuid, NULL::integer, false; RETURN;
    END IF;
    v_readiness := public.get_event_cost_close_readiness(p_service_id, v_effective_date);
    IF COALESCE((v_readiness ->> 'ready')::boolean, false) IS NOT TRUE THEN
        RETURN QUERY SELECT 'event_cost_close_not_ready', NULL::uuid, NULL::integer, false; RETURN;
    END IF;
    v_cost := v_readiness -> 'costing';
    SELECT budget_version INTO v_budget_version FROM public.event_cost_budgets WHERE service_id = p_service_id AND superseded_at IS NULL;
    SELECT forecast_version INTO v_etc_version FROM public.event_cost_etc_forecasts WHERE service_id = p_service_id AND superseded_at IS NULL;
    SELECT COALESCE(MAX(close_version), 0) + 1 INTO v_version FROM public.event_cost_close_versions WHERE service_id = p_service_id;
    INSERT INTO public.event_cost_close_versions(
        service_id, close_version, effective_date, reason, closed_by, closed_at, close_request_id,
        budget_version, etc_version, commercial_source_type, commercial_source_id, commercial_source_version,
        base_budget, contingency, approved_budget_cost, approved_commitment, accepted_commitment, pending_commitment,
        open_commitment, actual_cost, paid_cost, outstanding_cost, etc, eac, net_approved_commercial_value,
        final_managerial_event_margin, completeness_status, source_counts, readiness_evidence, costing_snapshot
    ) VALUES (
        p_service_id, v_version, v_effective_date, v_reason, v_actor, v_now, p_request_id,
        v_budget_version, v_etc_version, v_cost #>> '{commercial_authority,source_type}', NULLIF(v_cost #>> '{commercial_authority,source_id}', '')::uuid, v_cost #>> '{commercial_authority,source_version}',
        (v_cost #>> '{budget,base_budget}')::numeric, (v_cost #>> '{budget,contingency}')::numeric, (v_cost #>> '{budget,approved_budget_cost}')::numeric,
        (v_cost ->> 'approved_commitment')::numeric, (v_cost ->> 'accepted_commitment')::numeric, (v_cost ->> 'pending_commitment')::numeric,
        (v_cost ->> 'open_commitment')::numeric, (v_cost ->> 'actual_cost')::numeric, (v_cost ->> 'paid_cost')::numeric,
        (v_cost ->> 'outstanding_cost')::numeric, (v_cost ->> 'etc')::numeric, (v_cost ->> 'eac')::numeric,
        (v_cost ->> 'net_approved_commercial_value')::numeric, ((v_cost ->> 'net_approved_commercial_value')::numeric - (v_cost ->> 'actual_cost')::numeric),
        v_cost #>> '{completeness,status}', COALESCE(v_cost -> 'source_counts', '{}'::jsonb), v_readiness, v_cost
    ) RETURNING id INTO v_close_id;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('create', 'event_cost_close', v_close_id, p_actor_id,
        jsonb_build_object('event_type', 'event_cost_closed', 'service_id', p_service_id, 'close_version', v_version,
            'effective_date', v_effective_date, 'reason', v_reason, 'request_id', p_request_id, 'actor_role', p_actor_role), v_now);
    RETURN QUERY SELECT NULL::text, v_close_id, v_version, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_event_cost(
    p_service_id uuid, p_reason text, p_request_id uuid, p_actor_id text, p_actor_role text
)
RETURNS TABLE(error_code text, reopen_id uuid, close_id uuid, close_version integer, idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_actor uuid;
    v_reason text := NULLIF(btrim(p_reason), '');
    v_now timestamptz := transaction_timestamp();
    v_existing public.event_cost_close_reopenings%ROWTYPE;
    v_close public.event_cost_close_versions%ROWTYPE;
    v_reopen_id uuid;
BEGIN
    IF p_service_id IS NULL OR p_request_id IS NULL OR v_reason IS NULL OR char_length(v_reason) NOT BETWEEN 5 AND 2000
        OR NULLIF(btrim(p_actor_id), '') IS NULL OR p_actor_role <> 'admin'
    THEN RETURN QUERY SELECT 'event_cost_reopen_request_invalid', NULL::uuid, NULL::uuid, NULL::integer, false; RETURN; END IF;
    BEGIN v_actor := p_actor_id::uuid; EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'event_cost_reopen_request_invalid', NULL::uuid, NULL::uuid, NULL::integer, false; RETURN;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = v_actor AND u.is_active AND u.role = 'admin') THEN
        RETURN QUERY SELECT 'event_cost_reopen_permission_denied', NULL::uuid, NULL::uuid, NULL::integer, false; RETURN;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('w8b:event-cost-close:' || p_service_id::text, 0));
    SELECT * INTO v_existing FROM public.event_cost_close_reopenings WHERE reopen_request_id = p_request_id;
    IF FOUND THEN
        SELECT * INTO v_close FROM public.event_cost_close_versions WHERE id = v_existing.event_cost_close_version_id;
        IF v_close.service_id IS DISTINCT FROM p_service_id OR v_existing.reason IS DISTINCT FROM v_reason THEN
            RETURN QUERY SELECT 'event_cost_reopen_request_conflict', v_existing.id, v_close.id, v_close.close_version, false; RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing.id, v_close.id, v_close.close_version, true; RETURN;
    END IF;
    SELECT c.* INTO v_close FROM public.event_cost_close_versions c
    LEFT JOIN public.event_cost_close_reopenings r ON r.event_cost_close_version_id = c.id
    WHERE c.service_id = p_service_id AND r.id IS NULL
    ORDER BY c.close_version DESC LIMIT 1 FOR UPDATE OF c;
    IF NOT FOUND THEN RETURN QUERY SELECT 'event_cost_not_closed', NULL::uuid, NULL::uuid, NULL::integer, false; RETURN; END IF;
    INSERT INTO public.event_cost_close_reopenings(event_cost_close_version_id, reason, reopened_by, reopened_at, reopen_request_id)
    VALUES(v_close.id, v_reason, v_actor, v_now, p_request_id) RETURNING id INTO v_reopen_id;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('create', 'event_cost_reopen', v_reopen_id, p_actor_id,
        jsonb_build_object('event_type', 'event_cost_reopened', 'service_id', p_service_id, 'close_id', v_close.id,
            'close_version', v_close.close_version, 'reason', v_reason, 'request_id', p_request_id), v_now);
    RETURN QUERY SELECT NULL::text, v_reopen_id, v_close.id, v_close.close_version, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_event_cost_close_status(
    p_service_id uuid,
    p_as_of_date date DEFAULT (timezone('Asia/Riyadh', transaction_timestamp()))::date
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_readiness jsonb; v_current jsonb; v_history jsonb;
BEGIN
    v_readiness := public.get_event_cost_close_readiness(p_service_id, p_as_of_date);
    SELECT to_jsonb(c) || jsonb_build_object('reopened_at', r.reopened_at, 'reopen_reason', r.reason)
    INTO v_current FROM public.event_cost_close_versions c
    LEFT JOIN public.event_cost_close_reopenings r ON r.event_cost_close_version_id = c.id
    WHERE c.service_id = p_service_id AND r.id IS NULL ORDER BY c.close_version DESC LIMIT 1;
    SELECT COALESCE(jsonb_agg(to_jsonb(h) ORDER BY h.close_version DESC), '[]'::jsonb) INTO v_history
    FROM (
        SELECT c.close_version, c.effective_date, c.reason, c.closed_at, c.actual_cost, c.paid_cost,
            c.outstanding_cost, c.net_approved_commercial_value, c.final_managerial_event_margin,
            r.reopened_at, r.reason AS reopen_reason
        FROM public.event_cost_close_versions c
        LEFT JOIN public.event_cost_close_reopenings r ON r.event_cost_close_version_id = c.id
        WHERE c.service_id = p_service_id ORDER BY c.close_version DESC LIMIT 50
    ) h;
    RETURN jsonb_build_object('readiness', v_readiness, 'active_close', v_current, 'history', v_history);
END;
$$;

REVOKE ALL ON FUNCTION public.guard_released_supplier_advance_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_supplier_advance_authorization(uuid,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_event_cost_close_history_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.event_cost_close_is_active(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assert_event_cost_authority_open(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_event_cost_authority_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_event_cost_close_readiness(uuid,date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.close_event_cost(uuid,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reopen_event_cost(uuid,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_event_cost_close_status(uuid,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_supplier_advance_authorization(uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_cost_close_readiness(uuid,date) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_event_cost(uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reopen_event_cost(uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_cost_close_status(uuid,date) TO service_role;

COMMENT ON TABLE public.event_cost_close_versions IS
    'Immutable managerial Event Cost Close snapshots. Separate from W3 operational lifecycle and future accounting close.';
COMMENT ON TABLE public.event_cost_close_reopenings IS
    'Immutable governed reopen events. A reopen preserves prior Event Cost Close history and enables new cost authority.';
COMMENT ON TABLE public.supplier_advance_authorization_releases IS
    'Append-only release of a never-used Supplier Advance authorization. It is not a payment or a refund.';
COMMENT ON FUNCTION public.get_event_cost_close_readiness(uuid,date) IS
    'Server-side W8B readiness based on W3 lifecycle and W8A authoritative Event Costing; not accounting close.';

COMMIT;
