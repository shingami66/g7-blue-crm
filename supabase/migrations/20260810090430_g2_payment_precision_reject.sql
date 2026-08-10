-- G2 W2-PAY-003: reject payment amounts with sub-cent precision.
-- Forward-only DEV/DEMO migration. Do NOT apply automatically.
-- The public seven-argument RPC remains the payment authority.

BEGIN;

DO $$
DECLARE
    v_payment_proc regprocedure := to_regprocedure(
        'public.record_invoice_payment(uuid,numeric,date,text,text,text,uuid)'
    );
    v_delegate_proc regprocedure := to_regprocedure(
        'public._record_invoice_payment_before_service_audit(uuid,numeric,date,text,text,text,uuid)'
    );
BEGIN
    IF v_payment_proc IS NULL OR v_delegate_proc IS NULL THEN
        RAISE EXCEPTION 'g2 payment precision guard: current seven-argument RPC contract missing';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
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
    v_payment_result record;
    v_payment_existed_before boolean := false;
    v_deposit_transition boolean := false;
    v_service_audit_exists boolean := false;
    v_service_id uuid;
    v_invoice_type text;
    v_invoice_status text;
    v_invoice_balance_due numeric;
    v_service_status text;
    v_actor_role text;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_amount IS NULL
        OR p_amount::text IN ('NaN', 'Infinity', '-Infinity')
        OR p_amount <= 0
        OR p_amount <> round(p_amount, 2)
    THEN
        RETURN QUERY SELECT
            'invalid_payment_amount'::text,
            NULL::uuid,
            NULL::text,
            NULL::numeric,
            NULL::numeric,
            NULL::text;
        RETURN;
    END IF;

    IF p_request_id IS NOT NULL THEN
        PERFORM pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(p_request_id::text, 8583)
        );

        SELECT EXISTS (
            SELECT 1
            FROM public.payments p
            WHERE p.request_id = p_request_id
        )
        INTO v_payment_existed_before;
    END IF;

    -- Validate the context needed for the Service audit before any payment
    -- mutation can occur. The delegated RPC remains the single mutation path.
    IF NOT v_payment_existed_before
        AND p_amount IS NOT NULL
        AND p_amount > 0
        AND p_user_id IS NOT NULL
        AND btrim(p_user_id) <> ''
    THEN
        SELECT i.service_id, i.invoice_type, i.status, i.balance_due
        INTO v_service_id, v_invoice_type, v_invoice_status, v_invoice_balance_due
        FROM public.invoices i
        WHERE i.id = p_invoice_id;

        IF FOUND
            AND v_service_id IS NOT NULL
            AND v_invoice_type = 'deposit'
            AND v_invoice_status IN ('sent', 'partial')
            AND v_invoice_balance_due IS NOT NULL
            AND p_amount = v_invoice_balance_due
        THEN
            SELECT s.status
            INTO v_service_status
            FROM public.services s
            WHERE s.id = v_service_id
            FOR UPDATE;

            IF v_service_status = 'Approved' THEN
                SELECT i.invoice_type, i.status, i.balance_due
                INTO v_invoice_type, v_invoice_status, v_invoice_balance_due
                FROM public.invoices i
                WHERE i.id = p_invoice_id
                  AND i.service_id = v_service_id
                FOR UPDATE;

                IF v_invoice_type = 'deposit'
                    AND v_invoice_status IN ('sent', 'partial')
                    AND v_invoice_balance_due IS NOT NULL
                    AND p_amount = v_invoice_balance_due
                THEN
                    SELECT NULLIF(btrim(u.role), '')
                    INTO v_actor_role
                    FROM public.app_users u
                    WHERE u.clerk_user_id = p_user_id
                      AND u.is_active = true
                    FOR SHARE;

                    IF v_actor_role IS NULL THEN
                        RETURN QUERY SELECT
                            'payment_service_audit_context_unavailable'::text,
                            NULL::uuid,
                            NULL::text,
                            NULL::numeric,
                            NULL::numeric,
                            NULL::text;
                        RETURN;
                    END IF;
                END IF;
            END IF;
        END IF;
    END IF;

    SELECT *
    INTO v_payment_result
    FROM public._record_invoice_payment_before_service_audit(
        p_invoice_id,
        p_amount,
        p_date,
        p_method,
        p_reference,
        p_user_id,
        p_request_id
    );

    IF v_payment_result.error_code IS NULL
        AND NOT v_payment_existed_before
        AND v_payment_result.payment_id IS NOT NULL
    THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.audit_logs a
            WHERE a.action = 'payment_recorded'
              AND a.entity_type = 'invoice'
              AND a.entity_id = p_invoice_id
              AND a.details ->> 'payment_id' = v_payment_result.payment_id::text
              AND a.details ->> 'deposit_transition' = 'true'
        )
        INTO v_deposit_transition;
    END IF;

    IF v_deposit_transition THEN
        SELECT i.service_id
        INTO v_service_id
        FROM public.invoices i
        WHERE i.id = p_invoice_id;

        SELECT EXISTS (
            SELECT 1
            FROM public.audit_logs a
            WHERE a.action = 'status_change'
              AND a.entity_type = 'service'
              AND a.entity_id = v_service_id
              AND a.details ->> 'payment_id' = v_payment_result.payment_id::text
              AND a.details ->> 'trigger' = 'deposit_payment_confirmed'
        )
        INTO v_service_audit_exists;

        IF NOT v_service_audit_exists THEN
            INSERT INTO public.audit_logs(
                action,
                entity_type,
                entity_id,
                user_id,
                details,
                timestamp
            )
            VALUES (
                'status_change',
                'service',
                v_service_id,
                p_user_id,
                jsonb_build_object(
                    'event_type', 'service_status_changed',
                    'from_status', 'Approved',
                    'to_status', 'Deposit Paid',
                    'trigger', 'deposit_payment_confirmed',
                    'invoice_id', p_invoice_id,
                    'payment_id', v_payment_result.payment_id,
                    'payment_number', v_payment_result.payment_number,
                    'amount', p_amount,
                    'actor_id', p_user_id,
                    'actor_role', v_actor_role,
                    'transaction_timestamp', v_now
                ),
                v_now
            );
        END IF;
    END IF;

    RETURN QUERY SELECT
        v_payment_result.error_code::text,
        v_payment_result.payment_id::uuid,
        v_payment_result.payment_number::text,
        v_payment_result.amount_paid::numeric,
        v_payment_result.balance_due::numeric,
        v_payment_result.invoice_status::text;
END;
$$;

ALTER FUNCTION public.record_invoice_payment(uuid,numeric,date,text,text,text,uuid)
    OWNER TO postgres;

REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid,numeric,date,text,text,text,uuid)
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid,numeric,date,text,text,text,uuid)
    TO service_role;

COMMIT;
