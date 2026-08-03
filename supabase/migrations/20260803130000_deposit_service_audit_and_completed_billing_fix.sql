-- Forward-only remediation for Deposit-triggered Service audit evidence and
-- post-completion Final Invoice eligibility. Do not apply automatically.
BEGIN;

DO $$
DECLARE
    v_payment_proc regprocedure := to_regprocedure(
        'public.record_invoice_payment(uuid,numeric,date,text,text,text,uuid)'
    );
    v_legacy_payment_proc regprocedure := to_regprocedure(
        'public.record_invoice_payment(uuid,numeric,date,text,text,text)'
    );
    v_invoice_proc regprocedure := to_regprocedure(
        'public.create_invoice_atomic(uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date)'
    );
    v_payment_result text;
    v_invoice_result text;
    v_payment_definition text;
    v_invoice_definition text;
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.invoices') IS NULL
        OR to_regclass('public.payments') IS NULL
        OR to_regclass('public.quotations') IS NULL
        OR to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regclass('public.app_users') IS NULL
    THEN
        RAISE EXCEPTION 'deposit audit and completed billing preflight: required table missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('services','id','uuid'),
            ('services','status','text'),
            ('services','deleted_at','timestamp with time zone'),
            ('services','customer_id','uuid'),
            ('services','updated_at','timestamp with time zone'),
            ('invoices','id','uuid'),
            ('invoices','customer_id','uuid'),
            ('invoices','service_id','uuid'),
            ('invoices','approved_quotation_id','uuid'),
            ('invoices','approved_billing_scope_id','uuid'),
            ('invoices','invoice_number','text'),
            ('invoices','invoice_type','text'),
            ('invoices','status','text'),
            ('invoices','is_deleted','boolean'),
            ('invoices','voided_at','timestamp with time zone'),
            ('invoices','date','date'),
            ('invoices','due_date','date'),
            ('invoices','subtotal','numeric'),
            ('invoices','vat_rate','numeric'),
            ('invoices','vat_amount','numeric'),
            ('invoices','grand_total','numeric'),
            ('invoices','amount_paid','numeric'),
            ('invoices','balance_due','numeric'),
            ('invoices','document_label','text'),
            ('invoices','vat_mode','text'),
            ('invoices','snapshot_seller','jsonb'),
            ('invoices','snapshot_buyer','jsonb'),
            ('invoices','snapshot_quotation','jsonb'),
            ('invoices','snapshot_bank_details','jsonb'),
            ('invoices','snapshot_document_rules','jsonb'),
            ('invoices','issued_at','timestamp with time zone'),
            ('invoices','created_by','text'),
            ('invoices','updated_by','text'),
            ('payments','id','uuid'),
            ('payments','invoice_id','uuid'),
            ('payments','customer_id','uuid'),
            ('payments','request_id','uuid'),
            ('payments','amount','numeric'),
            ('payments','payment_number','text'),
            ('payments','date','date'),
            ('payments','method','text'),
            ('payments','reference','text'),
            ('payments','status','text'),
            ('payments','invoice_amount_paid_after','numeric'),
            ('payments','invoice_balance_due_after','numeric'),
            ('payments','invoice_status_after','text'),
            ('payments','created_by','text'),
            ('payments','updated_by','text'),
            ('quotations','id','uuid'),
            ('quotations','service_id','uuid'),
            ('quotations','customer_id','uuid'),
            ('quotations','status','text'),
            ('quotations','is_deleted','boolean'),
            ('quotations','grand_total','numeric'),
            ('approved_billing_scopes','id','uuid'),
            ('approved_billing_scopes','service_id','uuid'),
            ('approved_billing_scopes','status','text'),
            ('approved_billing_scopes','accepted_grand_total','numeric'),
            ('approved_billing_scopes','voided_at','timestamp with time zone'),
            ('approved_billing_scopes','superseded_at','timestamp with time zone'),
            ('audit_logs','action','text'),
            ('audit_logs','entity_type','text'),
            ('audit_logs','entity_id','uuid'),
            ('audit_logs','user_id','text'),
            ('audit_logs','details','jsonb'),
            ('audit_logs','timestamp','timestamp with time zone'),
            ('app_users','clerk_user_id','text'),
            ('app_users','role','text'),
            ('app_users','is_active','boolean')
        ) AS required_columns(table_name, column_name, type_name)
        WHERE NOT EXISTS (
            SELECT 1
            FROM pg_attribute a
            WHERE a.attrelid = to_regclass('public.' || required_columns.table_name)
              AND a.attname = required_columns.column_name
              AND a.attnum > 0
              AND NOT a.attisdropped
              AND format_type(a.atttypid, a.atttypmod)
                    LIKE required_columns.type_name || '%'
        )
    ) THEN
        RAISE EXCEPTION 'deposit audit and completed billing preflight: required column or type missing';
    END IF;

    IF v_payment_proc IS NULL OR v_legacy_payment_proc IS NULL THEN
        RAISE EXCEPTION 'deposit audit preflight: expected payment RPC signatures missing';
    END IF;

    IF v_invoice_proc IS NULL THEN
        RAISE EXCEPTION 'completed billing preflight: expected invoice RPC signature missing';
    END IF;

    IF to_regprocedure('public.generate_document_number(text)') IS NULL THEN
        RAISE EXCEPTION 'deposit audit and completed billing preflight: document number function missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conrelid = 'public.services'::regclass
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%Approved%'
          AND pg_get_constraintdef(c.oid) LIKE '%Deposit Paid%'
          AND pg_get_constraintdef(c.oid) LIKE '%Completed%'
          AND pg_get_constraintdef(c.oid) LIKE '%Cancelled%'
    ) THEN
        RAISE EXCEPTION 'deposit audit and completed billing preflight: Service status constraint drift';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        WHERE c.conrelid = 'public.audit_logs'::regclass
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) LIKE '%status_change%'
    ) THEN
        RAISE EXCEPTION 'deposit audit preflight: audit action constraint drift';
    END IF;

    IF to_regprocedure(
        'public._record_invoice_payment_before_service_audit(uuid,numeric,date,text,text,text,uuid)'
    ) IS NOT NULL THEN
        RAISE EXCEPTION 'deposit audit preflight: private payment delegate already exists';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'record_invoice_payment'
          AND p.oid NOT IN (v_payment_proc::oid, v_legacy_payment_proc::oid)
    ) THEN
        RAISE EXCEPTION 'deposit audit preflight: unexpected payment RPC overload exists';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'create_invoice_atomic'
          AND p.oid <> v_invoice_proc::oid
    ) THEN
        RAISE EXCEPTION 'completed billing preflight: unexpected invoice RPC overload exists';
    END IF;

    SELECT regexp_replace(lower(pg_get_function_result(v_payment_proc)), '\s+', '', 'g')
    INTO v_payment_result;
    IF v_payment_result <> regexp_replace(
        lower('TABLE(error_code text, payment_id uuid, payment_number text, amount_paid numeric, balance_due numeric, invoice_status text)'),
        '\s+', '', 'g'
    ) THEN
        RAISE EXCEPTION 'deposit audit preflight: payment RPC return contract drift';
    END IF;

    SELECT regexp_replace(lower(pg_get_function_result(v_invoice_proc)), '\s+', '', 'g')
    INTO v_invoice_result;
    IF v_invoice_result <> regexp_replace(
        lower('TABLE(error_code text, invoice_id uuid, invoice_number text)'),
        '\s+', '', 'g'
    ) THEN
        RAISE EXCEPTION 'completed billing preflight: invoice RPC return contract drift';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        WHERE p.oid IN (v_payment_proc::oid, v_invoice_proc::oid)
          AND (
              NOT p.prosecdef
              OR coalesce(array_to_string(p.proconfig, ','), '')
                    NOT LIKE '%search_path=pg_catalog, public%'
          )
    ) THEN
        RAISE EXCEPTION 'deposit audit and completed billing preflight: RPC security shape drift';
    END IF;

    SELECT pg_get_functiondef(v_payment_proc) INTO v_payment_definition;
    IF position('pg_catalog.pg_advisory_xact_lock' in v_payment_definition) = 0
        OR position('FROM public.services s' in v_payment_definition) = 0
        OR position('FOR UPDATE' in v_payment_definition) = 0
        OR position('INSERT INTO public.payments' in v_payment_definition) = 0
        OR position('UPDATE public.invoices' in v_payment_definition) = 0
        OR position('UPDATE public.services' in v_payment_definition) = 0
        OR position('INSERT INTO public.audit_logs' in v_payment_definition) = 0
        OR position('payment_recorded' in v_payment_definition) = 0
        OR position('deposit_transition' in v_payment_definition) = 0
    THEN
        RAISE EXCEPTION 'deposit audit preflight: payment transaction contract drift';
    END IF;

    SELECT pg_get_functiondef(v_invoice_proc) INTO v_invoice_definition;
    IF position('v_invoice_amount := v_remaining' in v_invoice_definition) = 0
        OR position('final_invoice_already_exists' in v_invoice_definition) = 0
        OR position('billing_scope_authority_unavailable' in v_invoice_definition) = 0
        OR position('invoice_exposure_unavailable' in v_invoice_definition) = 0
        OR position('prior_invoices_exceed_billing_scope_ceiling' in v_invoice_definition) = 0
        OR position('uq_invoices_one_active_deposit_per_service' in v_invoice_definition) = 0
    THEN
        RAISE EXCEPTION 'completed billing preflight: invoice financial contract drift';
    END IF;
END;
$$;

ALTER FUNCTION public.record_invoice_payment(uuid,numeric,date,text,text,text,uuid)
    RENAME TO _record_invoice_payment_before_service_audit;

REVOKE ALL ON FUNCTION public._record_invoice_payment_before_service_audit(
    uuid,numeric,date,text,text,text,uuid
) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.record_invoice_payment(
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

DO $$
DECLARE
    v_invoice_proc regprocedure := to_regprocedure(
        'public.create_invoice_atomic(uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date)'
    );
    v_definition text;
    v_old_lifecycle text := $old$
    ELSIF v_service_status IN ('Completed', 'Cancelled') THEN
        v_deposit_allowed := false;
        v_final_allowed := false;
$old$;
    v_new_lifecycle text := $new$
    ELSIF v_service_status = 'Completed' THEN
        v_deposit_allowed := false;
        v_final_allowed := true;
    ELSIF v_service_status = 'Cancelled' THEN
        v_deposit_allowed := false;
        v_final_allowed := false;
$new$;
    v_occurrences integer;
BEGIN
    SELECT pg_get_functiondef(v_invoice_proc) INTO v_definition;
    v_definition := replace(v_definition, E'\r\n', E'\n');
    v_old_lifecycle := replace(v_old_lifecycle, E'\r\n', E'\n');
    v_new_lifecycle := replace(v_new_lifecycle, E'\r\n', E'\n');
    v_occurrences := (
        char_length(v_definition) - char_length(replace(v_definition, v_old_lifecycle, ''))
    ) / char_length(v_old_lifecycle);

    IF v_occurrences <> 1 THEN
        RAISE EXCEPTION 'completed billing correction: lifecycle fragment drift';
    END IF;

    v_definition := replace(v_definition, v_old_lifecycle, v_new_lifecycle);
    EXECUTE v_definition;
END;
$$;

ALTER FUNCTION public.create_invoice_atomic(
    uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date
) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_invoice_atomic(
    uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_invoice_atomic(
    uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date
) TO service_role;

COMMIT;
