-- Forward-only, unapplied Service execution lifecycle actions.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.invoices') IS NULL
        OR to_regclass('public.payments') IS NULL
        OR to_regclass('public.audit_logs') IS NULL THEN
        RAISE EXCEPTION 'service lifecycle preflight: required table missing';
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
        RAISE EXCEPTION 'service lifecycle preflight: required column or type missing';
    END IF;

    IF to_regprocedure('public.start_service_execution(uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.complete_service(uuid,text,text)') IS NOT NULL THEN
        RAISE EXCEPTION 'service lifecycle preflight: callable lifecycle signature already exists';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('start_service_execution', 'complete_service')
    ) THEN
        RAISE EXCEPTION 'service lifecycle preflight: unexpected lifecycle overload exists';
    END IF;
END;
$$;

CREATE FUNCTION public.start_service_execution(
    p_service_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, service_id uuid, service_status text, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_status text;
    v_now timestamptz := transaction_timestamp();
    v_deposit_count bigint;
    v_invoice_invalid_count bigint;
    v_invoice_id uuid;
    v_invoice_status text;
    v_invoice_total numeric;
    v_invoice_paid numeric;
    v_invoice_balance numeric;
    v_payment_count bigint;
    v_payment_invalid_count bigint;
    v_payment_total numeric;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
    THEN
        RETURN QUERY SELECT 'service_actor_invalid', p_service_id, NULL::text, false;
        RETURN;
    END IF;

    SELECT s.status
    INTO v_status
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_not_found', p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF v_status = 'In Progress' THEN
        RETURN QUERY SELECT NULL::text, p_service_id, v_status, true;
        RETURN;
    END IF;

    IF v_status <> 'Deposit Paid' THEN
        RETURN QUERY SELECT 'service_status_transition_ineligible', p_service_id, v_status, false;
        RETURN;
    END IF;

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
    INTO v_deposit_count, v_invoice_invalid_count
    FROM public.invoices i
    WHERE i.service_id = p_service_id
      AND i.invoice_type = 'deposit'
      AND COALESCE(i.is_deleted, false) = false
      AND i.voided_at IS NULL
      AND i.status NOT IN ('voided', 'cancelled');

    IF v_deposit_count = 0 THEN
        RETURN QUERY SELECT 'service_deposit_invoice_missing', p_service_id, v_status, false;
        RETURN;
    END IF;

    IF v_deposit_count <> 1 THEN
        RETURN QUERY SELECT 'service_deposit_invoice_ambiguous', p_service_id, v_status, false;
        RETURN;
    END IF;

    SELECT i.id, i.status, i.grand_total, i.amount_paid, i.balance_due
    INTO v_invoice_id, v_invoice_status, v_invoice_total, v_invoice_paid, v_invoice_balance
    FROM public.invoices i
    WHERE i.service_id = p_service_id
      AND i.invoice_type = 'deposit'
      AND COALESCE(i.is_deleted, false) = false
      AND i.voided_at IS NULL
      AND i.status NOT IN ('voided', 'cancelled')
    FOR UPDATE;

    IF NOT FOUND OR v_invoice_invalid_count <> 0 THEN
        RETURN QUERY SELECT 'service_deposit_invoice_invalid', p_service_id, v_status, false;
        RETURN;
    END IF;

    IF v_invoice_status <> 'paid' THEN
        RETURN QUERY SELECT 'service_deposit_invoice_not_paid', p_service_id, v_status, false;
        RETURN;
    END IF;

    PERFORM p.id
    FROM public.payments p
    WHERE p.invoice_id = v_invoice_id
      AND COALESCE(p.is_deleted, false) = false
    ORDER BY p.id
    FOR UPDATE;

    SELECT
        count(*)::bigint,
        count(*) FILTER (
            WHERE p.amount IS NULL
                OR p.amount < 0
                OR p.status <> 'confirmed'
        )::bigint,
        COALESCE(sum(p.amount) FILTER (WHERE p.status = 'confirmed'), 0)::numeric
    INTO v_payment_count, v_payment_invalid_count, v_payment_total
    FROM public.payments p
    WHERE p.invoice_id = v_invoice_id
      AND COALESCE(p.is_deleted, false) = false;

    IF v_payment_count = 0 THEN
        RETURN QUERY SELECT 'service_deposit_payment_missing', p_service_id, v_status, false;
        RETURN;
    END IF;

    IF v_payment_invalid_count <> 0
        OR v_payment_total IS NULL
        OR v_payment_total <> v_invoice_paid
    THEN
        RETURN QUERY SELECT 'service_deposit_payment_inconsistent', p_service_id, v_status, false;
        RETURN;
    END IF;

    IF v_invoice_total <> v_invoice_paid
        OR v_invoice_balance <> 0
    THEN
        RETURN QUERY SELECT 'service_deposit_invoice_invalid', p_service_id, v_status, false;
        RETURN;
    END IF;

    UPDATE public.services s
    SET status = 'In Progress',
        updated_by = p_actor_id,
        updated_at = v_now
    WHERE s.id = p_service_id
      AND s.status = 'Deposit Paid'
      AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_status_transition_ineligible', p_service_id, v_status, false;
        RETURN;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'service',
        p_service_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'service_status_changed',
            'actor_id', p_actor_id,
            'actor_role', p_actor_role,
            'from_status', 'Deposit Paid',
            'to_status', 'In Progress',
            'transaction_timestamp', v_now
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_service_id, 'In Progress'::text, false;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 'service_transition_failed', p_service_id, v_status, false;
END;
$$;

CREATE FUNCTION public.complete_service(
    p_service_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, service_id uuid, service_status text, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_status text;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
    THEN
        RETURN QUERY SELECT 'service_actor_invalid', p_service_id, NULL::text, false;
        RETURN;
    END IF;

    SELECT s.status
    INTO v_status
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_not_found', p_service_id, NULL::text, false;
        RETURN;
    END IF;

    IF v_status = 'Completed' THEN
        RETURN QUERY SELECT NULL::text, p_service_id, v_status, true;
        RETURN;
    END IF;

    IF v_status <> 'In Progress' THEN
        RETURN QUERY SELECT 'service_status_transition_ineligible', p_service_id, v_status, false;
        RETURN;
    END IF;

    UPDATE public.services s
    SET status = 'Completed',
        updated_by = p_actor_id,
        updated_at = v_now
    WHERE s.id = p_service_id
      AND s.status = 'In Progress'
      AND s.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_status_transition_ineligible', p_service_id, v_status, false;
        RETURN;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'service',
        p_service_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'service_status_changed',
            'actor_id', p_actor_id,
            'actor_role', p_actor_role,
            'from_status', 'In Progress',
            'to_status', 'Completed',
            'transaction_timestamp', v_now
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_service_id, 'Completed'::text, false;
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 'service_transition_failed', p_service_id, v_status, false;
END;
$$;

REVOKE ALL ON FUNCTION public.start_service_execution(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_service(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_service_execution(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_service(uuid,text,text) TO service_role;

COMMIT;
