-- Forward-only correction for quotation approval and explicit Service lifecycle actions.
-- The previously applied ABS activation migration is intentionally unchanged.

BEGIN;

DO $$
DECLARE
    v_return_contract text;
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.quotations') IS NULL
        OR to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regclass('public.approved_billing_scope_items') IS NULL
        OR to_regclass('public.audit_logs') IS NULL THEN
        RAISE EXCEPTION 'quotation approval lifecycle preflight: required table missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (VALUES
            ('services','id','uuid'), ('services','status','text'),
            ('services','deleted_at','timestamp with time zone'), ('services','updated_by','text'),
            ('services','updated_at','timestamp with time zone'),
            ('quotations','id','uuid'), ('quotations','quotation_number','text'),
            ('quotations','customer_id','uuid'), ('quotations','event','text'),
            ('quotations','date','date'), ('quotations','valid_until','date'),
            ('quotations','subtotal','numeric'), ('quotations','discount','numeric'),
            ('quotations','vat_amount','numeric'), ('quotations','grand_total','numeric'),
            ('quotations','status','text'), ('quotations','is_deleted','boolean'),
            ('quotations','service_id','uuid'), ('quotations','vat_rate','numeric'),
            ('quotations','snapshot_seller','jsonb'), ('quotations','updated_by','text'),
            ('quotations','updated_at','timestamp with time zone'),
            ('quotation_items','id','uuid'), ('quotation_items','quotation_id','uuid'),
            ('quotation_items','description','text'), ('quotation_items','details','text'),
            ('quotation_items','category','text'), ('quotation_items','qty','numeric'),
            ('quotation_items','unit_price','numeric'), ('quotation_items','vat','numeric'),
            ('quotation_items','total','numeric'), ('quotation_items','created_at','timestamp with time zone'),
            ('approved_billing_scopes','id','uuid'), ('approved_billing_scopes','service_id','uuid'),
            ('approved_billing_scopes','source_quotation_id','uuid'), ('approved_billing_scopes','scope_version','integer'),
            ('approved_billing_scopes','status','text'), ('approved_billing_scopes','accepted_subtotal','numeric'),
            ('approved_billing_scopes','accepted_vat_amount','numeric'), ('approved_billing_scopes','accepted_grand_total','numeric'),
            ('approved_billing_scopes','source_vat_rate','numeric'), ('approved_billing_scopes','source_discount','numeric'),
            ('approved_billing_scopes','source_currency','text'),
            ('approved_billing_scopes','source_quotation_subtotal','numeric'),
            ('approved_billing_scopes','source_quotation_vat_amount','numeric'),
            ('approved_billing_scopes','source_quotation_grand_total','numeric'),
            ('approved_billing_scopes','source_pricing_context','jsonb'),
            ('approved_billing_scopes','line_safety_status','text'),
            ('approved_billing_scopes','line_safety_reason_code','text'),
            ('approved_billing_scopes','line_safety_note','text'),
            ('approved_billing_scopes','line_safety_reviewed_by','text'),
            ('approved_billing_scopes','line_safety_reviewed_at','timestamp with time zone'),
            ('approved_billing_scopes','approved_at','timestamp with time zone'),
            ('approved_billing_scopes','approved_by','text'),
            ('approved_billing_scopes','superseded_at','timestamp with time zone'),
            ('approved_billing_scopes','voided_at','timestamp with time zone'),
            ('approved_billing_scopes','created_by','text'), ('approved_billing_scopes','updated_by','text'),
            ('approved_billing_scopes','created_at','timestamp with time zone'),
            ('approved_billing_scopes','updated_at','timestamp with time zone'),
            ('approved_billing_scope_items','id','uuid'),
            ('approved_billing_scope_items','approved_billing_scope_id','uuid'),
            ('approved_billing_scope_items','source_quotation_id','uuid'),
            ('approved_billing_scope_items','source_quotation_item_id','uuid'),
            ('approved_billing_scope_items','display_order','integer'),
            ('approved_billing_scope_items','decision','text'),
            ('approved_billing_scope_items','source_description','text'),
            ('approved_billing_scope_items','source_details','text'),
            ('approved_billing_scope_items','source_category','text'),
            ('approved_billing_scope_items','source_qty','numeric'),
            ('approved_billing_scope_items','source_unit_price','numeric'),
            ('approved_billing_scope_items','source_subtotal','numeric'),
            ('approved_billing_scope_items','source_vat_amount','numeric'),
            ('approved_billing_scope_items','source_grand_total','numeric'),
            ('approved_billing_scope_items','accepted_qty','numeric'),
            ('approved_billing_scope_items','accepted_unit_price','numeric'),
            ('approved_billing_scope_items','accepted_subtotal','numeric'),
            ('approved_billing_scope_items','accepted_vat_amount','numeric'),
            ('approved_billing_scope_items','accepted_grand_total','numeric'),
            ('approved_billing_scope_items','reason_code','text'),
            ('approved_billing_scope_items','reason_note','text'),
            ('approved_billing_scope_items','created_at','timestamp with time zone'),
            ('approved_billing_scope_items','updated_at','timestamp with time zone'),
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
        RAISE EXCEPTION 'quotation approval lifecycle preflight: required column or type missing';
    END IF;

    IF to_regprocedure('public.approve_quotation_and_activate_internal_abs(uuid,text,text)') IS NULL
        OR to_regprocedure('public.approve_quotation_and_activate_internal_abs_legacy(uuid,text,text)') IS NOT NULL THEN
        RAISE EXCEPTION 'quotation approval lifecycle preflight: expected public RPC state missing or legacy name already occupied';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'approve_quotation_and_activate_internal_abs'
          AND p.oid <> to_regprocedure('public.approve_quotation_and_activate_internal_abs(uuid,text,text)')
    ) THEN
        RAISE EXCEPTION 'quotation approval lifecycle preflight: unexpected RPC overload';
    END IF;

    SELECT regexp_replace(pg_get_function_result(to_regprocedure('public.approve_quotation_and_activate_internal_abs(uuid,text,text)')), '\s+', '', 'g')
    INTO v_return_contract;
    IF v_return_contract <> 'TABLE(error_codetext,quotation_iduuid,quotation_numbertext,service_iduuid,quotation_statustext,approved_attimestampwithtimezone,approved_billing_scope_iduuid,scope_versioninteger,accepted_subtotalnumeric,accepted_vat_amountnumeric,accepted_grand_totalnumeric,abs_statustext,abs_activated_attimestampwithtimezone,quotation_approvedboolean,abs_activatedboolean,idempotent_replayboolean)' THEN
        RAISE EXCEPTION 'quotation approval lifecycle preflight: unexpected RPC return contract';
    END IF;
END;
$$;

-- Keep the already-reviewed ABS implementation as a private implementation detail.
-- The public signature and result contract remain unchanged below.
ALTER FUNCTION public.approve_quotation_and_activate_internal_abs(uuid, text, text)
    RENAME TO approve_quotation_and_activate_internal_abs_legacy;

REVOKE ALL ON FUNCTION public.approve_quotation_and_activate_internal_abs_legacy(uuid, text, text)
    FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approve_quotation_and_activate_internal_abs(
    p_quotation_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    quotation_id uuid,
    quotation_number text,
    service_id uuid,
    quotation_status text,
    approved_at timestamptz,
    approved_billing_scope_id uuid,
    scope_version integer,
    accepted_subtotal numeric,
    accepted_vat_amount numeric,
    accepted_grand_total numeric,
    abs_status text,
    abs_activated_at timestamptz,
    quotation_approved boolean,
    abs_activated boolean,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_quotation_status text;
    v_error_message text;
    v_result record;
    v_now timestamptz;
BEGIN
    IF p_actor_id IS NULL OR btrim(p_actor_id) = ''
        OR p_actor_role IS NULL OR btrim(p_actor_role) = ''
    THEN
        RETURN QUERY SELECT
            'quotation_approval_actor_invalid', p_quotation_id, NULL::text, NULL::uuid,
            NULL::text, NULL::timestamptz, NULL::uuid, NULL::integer,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text,
            NULL::timestamptz, false, false, false;
        RETURN;
    END IF;

    -- Service is the first lifecycle lock for both new approvals and retries.
    SELECT q.service_id, q.status
    INTO v_service_id, v_quotation_status
    FROM public.quotations q
    WHERE q.id = p_quotation_id
      AND COALESCE(q.is_deleted, false) = false;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'quotation_not_found', NULL::uuid, NULL::text, NULL::uuid,
            NULL::text, NULL::timestamptz, NULL::uuid, NULL::integer,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text,
            NULL::timestamptz, false, false, false;
        RETURN;
    END IF;

    SELECT s.status, s.deleted_at
    INTO v_service_status, v_service_deleted_at
    FROM public.services s
    WHERE s.id = v_service_id
    FOR UPDATE;

    IF NOT FOUND OR v_service_deleted_at IS NOT NULL
        OR v_service_status NOT IN ('Inquiry', 'Quoted', 'Approved')
    THEN
        RETURN QUERY SELECT
            'quotation_service_lifecycle_ineligible', p_quotation_id, NULL::text, v_service_id,
            v_quotation_status, NULL::timestamptz, NULL::uuid, NULL::integer,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text,
            NULL::timestamptz, false, false, false;
        RETURN;
    END IF;

    -- An already-approved Service is a retry lane only; a draft/sent quotation
    -- against it is contradictory and must not create another authority.
    IF v_service_status = 'Approved' AND v_quotation_status <> 'approved' THEN
        RETURN QUERY SELECT
            'quotation_internal_authority_inconsistent', p_quotation_id, NULL::text, v_service_id,
            v_quotation_status, NULL::timestamptz, NULL::uuid, NULL::integer,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text,
            NULL::timestamptz, false, false, false;
        RETURN;
    END IF;

    -- A quotation already approved while the Service is still Inquiry/Quoted is
    -- legacy partial state.  Do not repair it without a fresh, bounded data
    -- verification of invoice and payment exposure; report reconciliation.
    IF v_service_status IN ('Inquiry', 'Quoted') AND v_quotation_status = 'approved' THEN
        RETURN QUERY SELECT
            'quotation_internal_authority_inconsistent', p_quotation_id, NULL::text, v_service_id,
            v_quotation_status, NULL::timestamptz, NULL::uuid, NULL::integer,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text,
            NULL::timestamptz, false, false, false;
        RETURN;
    END IF;

    -- The existing function remains the source of truth for quotation/ABS
    -- totals, snapshots, discount rejection, audit records, and idempotency.
    SELECT *
    INTO v_result
    FROM public.approve_quotation_and_activate_internal_abs_legacy(
        p_quotation_id, p_actor_id, p_actor_role
    );

    IF v_result.error_code IS NOT NULL THEN
        RETURN QUERY SELECT
            v_result.error_code, v_result.quotation_id, v_result.quotation_number,
            v_result.service_id, v_result.quotation_status, v_result.approved_at,
            v_result.approved_billing_scope_id, v_result.scope_version,
            v_result.accepted_subtotal, v_result.accepted_vat_amount,
            v_result.accepted_grand_total, v_result.abs_status,
            v_result.abs_activated_at, v_result.quotation_approved,
            v_result.abs_activated, v_result.idempotent_replay;
        RETURN;
    END IF;

    IF v_service_status IN ('Inquiry', 'Quoted') THEN
        v_now := transaction_timestamp();

        UPDATE public.services s
        SET status = 'Approved',
            updated_by = p_actor_id,
            updated_at = v_now
        WHERE s.id = v_service_id
          AND s.status IN ('Inquiry', 'Quoted')
          AND s.deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
        END IF;

        INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
        VALUES (
            'status_change',
            'service',
            v_service_id,
            p_actor_id,
            jsonb_build_object(
                'event_type', 'service_status_changed',
                'actor_id', p_actor_id,
                'actor_role', p_actor_role,
                'from_status', v_service_status,
                'to_status', 'Approved',
                'quotation_id', p_quotation_id,
                'approved_billing_scope_id', v_result.approved_billing_scope_id,
                'transaction_timestamp', v_now
            ),
            v_now
        );
    END IF;

    RETURN QUERY SELECT
        v_result.error_code, v_result.quotation_id, v_result.quotation_number,
        v_result.service_id, v_result.quotation_status, v_result.approved_at,
        v_result.approved_billing_scope_id, v_result.scope_version,
        v_result.accepted_subtotal, v_result.accepted_vat_amount,
        v_result.accepted_grand_total, v_result.abs_status,
        v_result.abs_activated_at, v_result.quotation_approved,
        v_result.abs_activated, v_result.idempotent_replay;
    RETURN;
EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        RETURN QUERY SELECT
            CASE
                WHEN v_error_message = 'scope_service_lifecycle_ineligible'
                    THEN 'quotation_service_lifecycle_ineligible'
                ELSE 'quotation_internal_authority_inconsistent'
            END,
            p_quotation_id, NULL::text, v_service_id, v_quotation_status,
            NULL::timestamptz, NULL::uuid, NULL::integer,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text,
            NULL::timestamptz, false, false, false;
        RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_quotation_and_activate_internal_abs(uuid, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_quotation_and_activate_internal_abs(uuid, text, text)
    TO service_role;

COMMENT ON FUNCTION public.approve_quotation_and_activate_internal_abs(uuid, text, text) IS
    'Service-role-only atomic quotation approval, internal ABS activation, and Service approval; Service is locked first and legacy partial state is fail-closed.';


COMMIT;
