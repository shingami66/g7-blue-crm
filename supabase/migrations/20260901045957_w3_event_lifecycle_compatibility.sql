-- W3 Event Lifecycle compatibility projection.
-- Additive only: services.status remains the preserved legacy fact.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.invoices') IS NULL
        OR to_regclass('public.payments') IS NULL
        OR to_regclass('public.audit_logs') IS NULL THEN
        RAISE EXCEPTION 'W3 lifecycle preflight: required table missing';
    END IF;

    IF to_regclass('public.service_lifecycle_states') IS NOT NULL
        OR to_regprocedure('public.transition_service_lifecycle(uuid,text,text,text,text,text,uuid)') IS NOT NULL THEN
        RAISE EXCEPTION 'W3 lifecycle preflight: projection or RPC already exists';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('services','id','uuid'), ('services','status','text'),
            ('services','deleted_at','timestamp with time zone'),
            ('services','updated_by','text'), ('services','updated_at','timestamp with time zone'),
            ('invoices','id','uuid'), ('invoices','service_id','uuid'),
            ('invoices','invoice_type','text'), ('invoices','status','text'),
            ('invoices','grand_total','numeric'), ('invoices','amount_paid','numeric'),
            ('invoices','balance_due','numeric'), ('invoices','is_deleted','boolean'),
            ('invoices','voided_at','timestamp with time zone'),
            ('payments','id','uuid'), ('payments','invoice_id','uuid'),
            ('payments','amount','numeric'), ('payments','status','text'),
            ('payments','is_deleted','boolean'),
            ('audit_logs','action','text'), ('audit_logs','entity_type','text'),
            ('audit_logs','entity_id','uuid'), ('audit_logs','user_id','text'),
            ('audit_logs','details','jsonb'), ('audit_logs','timestamp','timestamp with time zone')
        ) AS required_columns(table_name, column_name, type_name)
        WHERE NOT EXISTS (
            SELECT 1
            FROM pg_attribute a
            WHERE a.attrelid = to_regclass('public.' || required_columns.table_name)
              AND a.attname = required_columns.column_name
              AND a.attnum > 0
              AND NOT a.attisdropped
              AND format_type(a.atttypid, a.atttypmod) LIKE required_columns.type_name || '%'
        )
    ) THEN
        RAISE EXCEPTION 'W3 lifecycle preflight: required column or type missing';
    END IF;
END;
$$;

CREATE TABLE public.service_lifecycle_states (
    service_id uuid PRIMARY KEY REFERENCES public.services(id) ON DELETE RESTRICT,
    legacy_status text NOT NULL,
    commercial_state text NOT NULL,
    payment_state text NOT NULL,
    readiness_state text NOT NULL,
    execution_state text NOT NULL,
    completion_state text NOT NULL,
    close_state text NOT NULL,
    start_gate_basis text,
    state_version bigint NOT NULL DEFAULT 1,
    mapping_version text NOT NULL DEFAULT 'w3-v1',
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_by text,
    CONSTRAINT service_lifecycle_states_legacy_status_check CHECK (
        legacy_status IN ('Inquiry', 'Quoted', 'Approved', 'Deposit Paid', 'In Progress', 'Completed', 'Cancelled')
    ),
    CONSTRAINT service_lifecycle_states_commercial_check CHECK (
        commercial_state IN ('inquiry', 'quoted', 'approved', 'cancelled')
    ),
    CONSTRAINT service_lifecycle_states_payment_check CHECK (
        payment_state IN ('unassessed', 'unpaid', 'partial', 'settled', 'inconsistent')
    ),
    CONSTRAINT service_lifecycle_states_readiness_check CHECK (
        readiness_state IN ('unassessed', 'blocked', 'ready', 'not_applicable')
    ),
    CONSTRAINT service_lifecycle_states_execution_check CHECK (
        execution_state IN ('not_started', 'in_progress', 'ended', 'not_applicable')
    ),
    CONSTRAINT service_lifecycle_states_completion_check CHECK (
        completion_state IN ('pending', 'confirmed', 'not_applicable')
    ),
    CONSTRAINT service_lifecycle_states_close_check CHECK (
        close_state IN ('open', 'closed')
    ),
    CONSTRAINT service_lifecycle_states_gate_check CHECK (
        start_gate_basis IS NULL OR start_gate_basis IN ('settled_payment', 'authorized_credit')
    ),
    CONSTRAINT service_lifecycle_states_version_check CHECK (state_version > 0),
    CONSTRAINT service_lifecycle_states_operational_consistency_check CHECK (
        (execution_state = 'not_applicable' AND completion_state = 'not_applicable')
        OR (execution_state = 'not_started' AND completion_state = 'pending')
        OR (execution_state = 'in_progress' AND completion_state = 'pending')
        OR (execution_state = 'ended' AND completion_state = 'confirmed')
    ),
    CONSTRAINT service_lifecycle_states_close_requires_completion_check CHECK (
        close_state = 'open'
        OR (execution_state = 'ended' AND completion_state = 'confirmed')
    ),
    CONSTRAINT service_lifecycle_states_gate_requires_execution_check CHECK (
        start_gate_basis IS NULL OR execution_state IN ('in_progress', 'ended')
    )
);

ALTER TABLE public.service_lifecycle_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.service_lifecycle_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.service_lifecycle_states TO service_role;

CREATE OR REPLACE FUNCTION public.service_lifecycle_payment_state(p_service_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_deposit_count bigint;
    v_invalid_invoice_count bigint;
    v_invoice_id uuid;
    v_invoice_status text;
    v_invoice_total numeric;
    v_invoice_paid numeric;
    v_invoice_balance numeric;
    v_payment_count bigint;
    v_invalid_payment_count bigint;
    v_pending_payment_count bigint;
    v_confirmed_payment_total numeric;
BEGIN
    SELECT
        count(*)::bigint,
        count(*) FILTER (
            WHERE i.grand_total IS NULL
                OR i.amount_paid IS NULL
                OR i.balance_due IS NULL
                OR i.grand_total < 0
                OR i.amount_paid < 0
                OR i.balance_due < 0
                OR i.amount_paid + i.balance_due <> i.grand_total
        )::bigint
    INTO v_deposit_count, v_invalid_invoice_count
    FROM public.invoices i
    WHERE i.service_id = p_service_id
      AND i.invoice_type = 'deposit'
      AND COALESCE(i.is_deleted, false) = false
      AND i.voided_at IS NULL
      AND i.status NOT IN ('voided', 'cancelled');

    -- Voided/cancelled historical deposits are excluded, not contradictory evidence.
    IF v_deposit_count = 0 THEN
        RETURN 'unassessed';
    END IF;

    IF v_deposit_count <> 1 OR v_invalid_invoice_count <> 0 THEN
        RETURN 'inconsistent';
    END IF;

    SELECT i.id, i.status, i.grand_total, i.amount_paid, i.balance_due
    INTO v_invoice_id, v_invoice_status, v_invoice_total, v_invoice_paid, v_invoice_balance
    FROM public.invoices i
    WHERE i.service_id = p_service_id
      AND i.invoice_type = 'deposit'
      AND COALESCE(i.is_deleted, false) = false
      AND i.voided_at IS NULL
      AND i.status NOT IN ('voided', 'cancelled');

    SELECT
        count(*)::bigint,
        count(*) FILTER (
            WHERE p.amount IS NULL
                OR p.amount < 0
                OR p.status IS NULL
        )::bigint,
        count(*) FILTER (WHERE p.status IS DISTINCT FROM 'confirmed')::bigint,
        COALESCE(sum(p.amount) FILTER (WHERE p.status = 'confirmed'), 0)::numeric
    INTO v_payment_count, v_invalid_payment_count, v_pending_payment_count, v_confirmed_payment_total
    FROM public.payments p
    WHERE p.invoice_id = v_invoice_id
      AND COALESCE(p.is_deleted, false) = false;

    IF v_payment_count = 0 AND v_invoice_paid = 0 THEN
        RETURN 'unpaid';
    END IF;

    IF v_invalid_payment_count <> 0
        OR v_confirmed_payment_total IS NULL
        OR v_confirmed_payment_total <> v_invoice_paid
    THEN
        RETURN 'inconsistent';
    END IF;

    -- Pending/non-confirmed payment rows do not become contradictory evidence
    -- while the invoice still reports no paid amount.
    IF v_invoice_paid = 0 THEN
        RETURN 'unpaid';
    END IF;

    IF v_invoice_total = v_invoice_paid
        AND v_invoice_balance = 0
        AND v_invoice_status = 'paid'
        AND v_payment_count > 0
        AND v_pending_payment_count = 0
    THEN
        RETURN 'settled';
    END IF;

    IF v_invoice_paid > 0
        AND v_invoice_paid < v_invoice_total
        AND v_invoice_balance > 0
    THEN
        RETURN 'partial';
    END IF;

    RETURN 'inconsistent';
END;
$$;

INSERT INTO public.service_lifecycle_states (
    service_id,
    legacy_status,
    commercial_state,
    payment_state,
    readiness_state,
    execution_state,
    completion_state,
    close_state,
    state_version,
    mapping_version,
    created_at,
    updated_at,
    updated_by
)
SELECT
    s.id,
    s.status,
    CASE
        WHEN s.status = 'Inquiry' THEN 'inquiry'
        WHEN s.status = 'Quoted' THEN 'quoted'
        WHEN s.status = 'Cancelled' THEN 'cancelled'
        ELSE 'approved'
    END,
    public.service_lifecycle_payment_state(s.id),
    CASE
        WHEN s.status = 'Cancelled' THEN 'not_applicable'
        WHEN s.status IN ('In Progress', 'Completed') THEN 'ready'
        ELSE 'unassessed'
    END,
    CASE
        WHEN s.status = 'Cancelled' THEN 'not_applicable'
        WHEN s.status = 'In Progress' THEN 'in_progress'
        WHEN s.status = 'Completed' THEN 'ended'
        ELSE 'not_started'
    END,
    CASE
        WHEN s.status = 'Cancelled' THEN 'not_applicable'
        WHEN s.status = 'Completed' THEN 'confirmed'
        ELSE 'pending'
    END,
    'open',
    1,
    'w3-v1',
    COALESCE(s.created_at, transaction_timestamp()),
    COALESCE(s.updated_at, transaction_timestamp()),
    s.updated_by
FROM public.services s;

CREATE OR REPLACE FUNCTION public.sync_service_lifecycle_legacy_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_lifecycle_execution_state text;
    v_lifecycle_close_state text;
BEGIN
    IF NEW.status = 'Cancelled' THEN
        SELECT l.execution_state, l.close_state
        INTO v_lifecycle_execution_state, v_lifecycle_close_state
        FROM public.service_lifecycle_states l
        WHERE l.service_id = NEW.id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'service_lifecycle_unavailable';
        END IF;

        IF v_lifecycle_execution_state IN ('in_progress', 'ended')
            OR v_lifecycle_close_state = 'closed'
        THEN
            RAISE EXCEPTION 'service_lifecycle_cancel_forbidden';
        END IF;
    END IF;

    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    UPDATE public.service_lifecycle_states l
    SET
        legacy_status = NEW.status,
        commercial_state = CASE
            WHEN NEW.status = 'Inquiry' THEN 'inquiry'
            WHEN NEW.status = 'Quoted' THEN 'quoted'
            WHEN NEW.status = 'Cancelled' THEN 'cancelled'
            ELSE 'approved'
        END,
        readiness_state = CASE
            WHEN NEW.status = 'Cancelled' THEN 'not_applicable'
            WHEN NEW.status IN ('In Progress', 'Completed') THEN 'ready'
            WHEN l.execution_state IN ('in_progress', 'ended') THEN l.readiness_state
            ELSE 'unassessed'
        END,
        execution_state = CASE
            WHEN NEW.status = 'Cancelled' THEN 'not_applicable'
            WHEN NEW.status = 'Completed' AND l.execution_state = 'in_progress' THEN 'ended'
            WHEN NEW.status = 'In Progress' AND l.execution_state = 'not_started' THEN 'in_progress'
            WHEN l.execution_state IN ('in_progress', 'ended') THEN l.execution_state
            WHEN NEW.status = 'In Progress' THEN 'in_progress'
            WHEN NEW.status = 'Completed' THEN 'ended'
            ELSE 'not_started'
         END,
         completion_state = CASE
             WHEN NEW.status = 'Cancelled' THEN 'not_applicable'
             WHEN NEW.status = 'Completed' THEN 'confirmed'
             WHEN l.execution_state = 'ended' THEN 'confirmed'
             ELSE 'pending'
         END,
         close_state = CASE
             WHEN NEW.status = 'Cancelled' THEN 'open'
             ELSE l.close_state
         END,
         start_gate_basis = CASE
             WHEN NEW.status = 'Cancelled' THEN NULL
             ELSE l.start_gate_basis
         END,
         payment_state = public.service_lifecycle_payment_state(NEW.id),
        updated_at = transaction_timestamp(),
        updated_by = COALESCE(NEW.updated_by, l.updated_by)
    WHERE l.service_id = NEW.id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER services_sync_service_lifecycle_legacy_status
AFTER UPDATE OF status ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.sync_service_lifecycle_legacy_status();

CREATE OR REPLACE FUNCTION public.refresh_service_lifecycle_payment_from_invoice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_service_id := OLD.service_id;
    ELSE
        v_service_id := NEW.service_id;
    END IF;

    UPDATE public.service_lifecycle_states l
    SET payment_state = public.service_lifecycle_payment_state(v_service_id),
        updated_at = transaction_timestamp()
    WHERE l.service_id = v_service_id;

    IF TG_OP = 'UPDATE' AND NEW.service_id IS DISTINCT FROM OLD.service_id THEN
        UPDATE public.service_lifecycle_states l
        SET payment_state = public.service_lifecycle_payment_state(OLD.service_id),
            updated_at = transaction_timestamp()
        WHERE l.service_id = OLD.service_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_refresh_service_lifecycle_payment
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.refresh_service_lifecycle_payment_from_invoice();

CREATE OR REPLACE FUNCTION public.refresh_service_lifecycle_payment_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    UPDATE public.service_lifecycle_states l
    SET payment_state = public.service_lifecycle_payment_state(i.service_id),
        updated_at = transaction_timestamp()
    FROM public.invoices i
    WHERE i.id = CASE WHEN TG_OP = 'DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END
      AND l.service_id = i.service_id;

    IF TG_OP = 'UPDATE' AND NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
        UPDATE public.service_lifecycle_states l
        SET payment_state = public.service_lifecycle_payment_state(i.service_id),
            updated_at = transaction_timestamp()
        FROM public.invoices i
        WHERE i.id = OLD.invoice_id
          AND l.service_id = i.service_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER payments_refresh_service_lifecycle_payment
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.refresh_service_lifecycle_payment_from_payment();

CREATE OR REPLACE FUNCTION public.transition_service_lifecycle(
    p_service_id uuid,
    p_action text,
    p_actor_id text,
    p_actor_role text,
    p_reason text,
    p_gate_basis text,
    p_request_id uuid
)
RETURNS TABLE(
    error_code text,
    service_id uuid,
    legacy_status text,
    commercial_state text,
    payment_state text,
    readiness_state text,
    execution_state text,
    completion_state text,
    close_state text,
    start_gate_basis text,
    state_version bigint,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_error text;
    v_legacy_status text;
    v_commercial_state text;
    v_payment_state text;
    v_readiness_state text;
    v_execution_state text;
    v_completion_state text;
    v_close_state text;
    v_start_gate_basis text;
    v_state_version bigint;
    v_from_state text;
    v_to_state text;
    v_dimension text;
    v_reason text := NULLIF(btrim(p_reason), '');
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
    THEN
        RETURN QUERY SELECT 'service_actor_invalid', p_service_id, NULL::text, NULL::text, NULL::text,
            NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::bigint, false;
        RETURN;
    END IF;

    IF p_action IS NULL OR p_action NOT IN ('mark_ready', 'block_readiness', 'start', 'complete', 'close', 'reopen_delivery', 'reopen_closeout') THEN
        RETURN QUERY SELECT 'service_lifecycle_action_invalid', p_service_id, NULL::text, NULL::text, NULL::text,
            NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::bigint, false;
        RETURN;
    END IF;

    PERFORM s.id
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_not_found', p_service_id, NULL::text, NULL::text, NULL::text,
            NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::bigint, false;
        RETURN;
    END IF;

    SELECT
        l.legacy_status, l.commercial_state, l.payment_state, l.readiness_state,
        l.execution_state, l.completion_state, l.close_state, l.start_gate_basis, l.state_version
    INTO
        v_legacy_status, v_commercial_state, v_payment_state, v_readiness_state,
        v_execution_state, v_completion_state, v_close_state, v_start_gate_basis, v_state_version
    FROM public.service_lifecycle_states l
    WHERE l.service_id = p_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_lifecycle_unavailable', p_service_id, NULL::text, NULL::text, NULL::text,
            NULL::text, NULL::text, NULL::text, NULL::text, NULL::text, NULL::bigint, false;
        RETURN;
    END IF;

    IF p_request_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.audit_logs a
        WHERE a.action = 'status_change'
          AND a.entity_type = 'service'
          AND a.entity_id = p_service_id
          AND a.details ->> 'lifecycle_version' = 'w3-v1'
          AND a.details ->> 'request_id' = p_request_id::text
    ) THEN
        RETURN QUERY SELECT NULL::text, p_service_id, v_legacy_status, v_commercial_state, v_payment_state,
            v_readiness_state, v_execution_state, v_completion_state, v_close_state, v_start_gate_basis,
            v_state_version, true;
        RETURN;
    END IF;

    IF p_action IN ('mark_ready', 'block_readiness', 'start', 'complete', 'close', 'reopen_delivery', 'reopen_closeout')
        AND (v_reason IS NULL OR char_length(v_reason) > 1000)
    THEN
        RETURN QUERY SELECT 'service_lifecycle_reason_required', p_service_id, v_legacy_status, v_commercial_state,
            v_payment_state, v_readiness_state, v_execution_state, v_completion_state, v_close_state,
            v_start_gate_basis, v_state_version, false;
        RETURN;
    END IF;

    IF p_action = 'start' AND (p_gate_basis IS NULL OR p_gate_basis NOT IN ('settled_payment', 'authorized_credit')) THEN
        RETURN QUERY SELECT 'service_lifecycle_state_invalid', p_service_id, v_legacy_status, v_commercial_state,
            v_payment_state, v_readiness_state, v_execution_state, v_completion_state, v_close_state,
            v_start_gate_basis, v_state_version, false;
        RETURN;
    END IF;

    IF p_action <> 'start' AND p_gate_basis IS NOT NULL THEN
        RETURN QUERY SELECT 'service_lifecycle_state_invalid', p_service_id, v_legacy_status, v_commercial_state,
            v_payment_state, v_readiness_state, v_execution_state, v_completion_state, v_close_state,
            v_start_gate_basis, v_state_version, false;
        RETURN;
    END IF;

    IF p_action = 'mark_ready' THEN
        IF v_readiness_state = 'ready' THEN
            RETURN QUERY SELECT NULL::text, p_service_id, v_legacy_status, v_commercial_state, v_payment_state,
                v_readiness_state, v_execution_state, v_completion_state, v_close_state, v_start_gate_basis,
                v_state_version, true;
            RETURN;
        END IF;
        IF v_commercial_state <> 'approved' OR v_execution_state <> 'not_started' THEN
            v_error := 'service_lifecycle_transition_ineligible';
        ELSE
            v_from_state := v_readiness_state;
            v_to_state := 'ready';
            v_dimension := 'readiness';
            v_readiness_state := 'ready';
        END IF;
    ELSIF p_action = 'block_readiness' THEN
        IF v_readiness_state = 'blocked' THEN
            RETURN QUERY SELECT NULL::text, p_service_id, v_legacy_status, v_commercial_state, v_payment_state,
                v_readiness_state, v_execution_state, v_completion_state, v_close_state, v_start_gate_basis,
                v_state_version, true;
            RETURN;
        END IF;
        IF v_execution_state <> 'not_started' OR v_readiness_state <> 'ready' THEN
            v_error := 'service_lifecycle_transition_ineligible';
        ELSE
            v_from_state := v_readiness_state;
            v_to_state := 'blocked';
            v_dimension := 'readiness';
            v_readiness_state := 'blocked';
        END IF;
    ELSIF p_action = 'start' THEN
        IF v_execution_state = 'in_progress' THEN
            RETURN QUERY SELECT NULL::text, p_service_id, v_legacy_status, v_commercial_state, v_payment_state,
                v_readiness_state, v_execution_state, v_completion_state, v_close_state, v_start_gate_basis,
                v_state_version, true;
            RETURN;
        END IF;
        IF v_commercial_state <> 'approved' OR v_execution_state <> 'not_started' THEN
            v_error := 'service_lifecycle_transition_ineligible';
        ELSIF v_readiness_state <> 'ready' THEN
            v_error := 'service_lifecycle_readiness_required';
        ELSIF p_gate_basis = 'settled_payment' AND public.service_lifecycle_payment_state(p_service_id) <> 'settled' THEN
            v_error := 'service_lifecycle_payment_required';
        ELSIF p_gate_basis = 'authorized_credit' AND p_actor_role NOT IN ('admin', 'manager') THEN
            v_error := 'service_lifecycle_credit_not_authorized';
        ELSE
            v_payment_state := public.service_lifecycle_payment_state(p_service_id);
            v_from_state := v_execution_state;
            v_to_state := 'in_progress';
            v_dimension := 'execution';
            v_execution_state := 'in_progress';
            v_start_gate_basis := p_gate_basis;
        END IF;
    ELSIF p_action = 'complete' THEN
        IF v_execution_state = 'ended' AND v_completion_state = 'confirmed' THEN
            RETURN QUERY SELECT NULL::text, p_service_id, v_legacy_status, v_commercial_state, v_payment_state,
                v_readiness_state, v_execution_state, v_completion_state, v_close_state, v_start_gate_basis,
                v_state_version, true;
            RETURN;
        END IF;
        IF v_execution_state <> 'in_progress' OR v_completion_state <> 'pending' THEN
            v_error := 'service_lifecycle_transition_ineligible';
        ELSE
            v_from_state := v_execution_state;
            v_to_state := 'ended';
            v_dimension := 'execution_completion';
            v_execution_state := 'ended';
            v_completion_state := 'confirmed';
        END IF;
    ELSIF p_action = 'close' THEN
        IF v_close_state = 'closed' THEN
            RETURN QUERY SELECT NULL::text, p_service_id, v_legacy_status, v_commercial_state, v_payment_state,
                v_readiness_state, v_execution_state, v_completion_state, v_close_state, v_start_gate_basis,
                v_state_version, true;
            RETURN;
        END IF;
        IF v_execution_state <> 'ended' OR v_completion_state <> 'confirmed' THEN
            v_error := 'service_lifecycle_transition_ineligible';
        ELSE
            v_from_state := v_close_state;
            v_to_state := 'closed';
            v_dimension := 'close';
            v_close_state := 'closed';
        END IF;
    ELSIF p_action = 'reopen_delivery' THEN
        IF v_execution_state = 'in_progress' AND v_completion_state = 'pending' AND v_close_state = 'open' THEN
            RETURN QUERY SELECT NULL::text, p_service_id, v_legacy_status, v_commercial_state, v_payment_state,
                v_readiness_state, v_execution_state, v_completion_state, v_close_state, v_start_gate_basis,
                v_state_version, true;
            RETURN;
        END IF;
        IF v_execution_state <> 'ended' OR v_completion_state <> 'confirmed' THEN
            v_error := 'service_lifecycle_transition_ineligible';
        ELSE
            v_from_state := v_execution_state;
            v_to_state := 'in_progress';
            v_dimension := 'reopen_delivery';
            v_execution_state := 'in_progress';
            v_completion_state := 'pending';
            v_close_state := 'open';
        END IF;
    ELSIF p_action = 'reopen_closeout' THEN
        IF v_close_state = 'open' AND v_execution_state = 'ended' AND v_completion_state = 'confirmed' THEN
            RETURN QUERY SELECT NULL::text, p_service_id, v_legacy_status, v_commercial_state, v_payment_state,
                v_readiness_state, v_execution_state, v_completion_state, v_close_state, v_start_gate_basis,
                v_state_version, true;
            RETURN;
        END IF;
        IF v_close_state <> 'closed' OR v_execution_state <> 'ended' OR v_completion_state <> 'confirmed' THEN
            v_error := 'service_lifecycle_transition_ineligible';
        ELSE
            v_from_state := v_close_state;
            v_to_state := 'open';
            v_dimension := 'reopen_closeout';
            v_close_state := 'open';
        END IF;
    END IF;

    IF v_error IS NOT NULL THEN
        RETURN QUERY SELECT v_error, p_service_id, v_legacy_status, v_commercial_state, v_payment_state,
            v_readiness_state, v_execution_state, v_completion_state, v_close_state, v_start_gate_basis,
            v_state_version, false;
        RETURN;
    END IF;

    v_state_version := v_state_version + 1;

    UPDATE public.service_lifecycle_states
    SET commercial_state = v_commercial_state,
        payment_state = v_payment_state,
        readiness_state = v_readiness_state,
        execution_state = v_execution_state,
        completion_state = v_completion_state,
        close_state = v_close_state,
        start_gate_basis = v_start_gate_basis,
        state_version = v_state_version,
        updated_at = v_now,
        updated_by = p_actor_id
    WHERE service_lifecycle_states.service_id = p_service_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'service',
        p_service_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'service_lifecycle_changed',
            'lifecycle_version', 'w3-v1',
            'lifecycle_action', p_action,
            'dimension', v_dimension,
            'from_state', v_from_state,
            'to_state', v_to_state,
            'legacy_status', v_legacy_status,
            'gate_basis', p_gate_basis,
            'reason', v_reason,
            'evidence_ref', v_reason,
            'request_id', p_request_id,
            'state_version', v_state_version,
            'actor_id', p_actor_id,
            'actor_role', p_actor_role,
            'transaction_timestamp', v_now
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_service_id, v_legacy_status, v_commercial_state, v_payment_state,
        v_readiness_state, v_execution_state, v_completion_state, v_close_state, v_start_gate_basis,
        v_state_version, false;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 'service_transition_failed', p_service_id, v_legacy_status, v_commercial_state,
            v_payment_state, v_readiness_state, v_execution_state, v_completion_state, v_close_state,
            v_start_gate_basis, v_state_version, false;
END;
$$;

REVOKE ALL ON FUNCTION public.service_lifecycle_payment_state(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_service_lifecycle_legacy_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_service_lifecycle_payment_from_invoice() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_service_lifecycle_payment_from_payment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_service_lifecycle(uuid,text,text,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_lifecycle_payment_state(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_service_lifecycle(uuid,text,text,text,text,text,uuid) TO service_role;

COMMIT;
