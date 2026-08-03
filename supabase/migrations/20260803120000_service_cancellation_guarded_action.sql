-- Forward-only cancellation. It never retires billing authority implicitly.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.services') IS NULL OR to_regclass('public.invoices') IS NULL
        OR to_regclass('public.payments') IS NULL OR to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regclass('public.audit_logs') IS NULL THEN
        RAISE EXCEPTION 'service cancellation preflight: required table missing';
    END IF;
    IF EXISTS (
        SELECT 1 FROM (VALUES
            ('services','id','uuid'), ('services','status','text'), ('services','cancellation_reason','text'), ('services','deleted_at','timestamp with time zone'),
            ('services','updated_by','text'), ('services','updated_at','timestamp with time zone'),
            ('invoices','id','uuid'), ('invoices','service_id','uuid'), ('invoices','is_deleted','boolean'),
            ('payments','invoice_id','uuid'), ('approved_billing_scopes','service_id','uuid'), ('approved_billing_scopes','status','text'),
            ('approved_billing_scopes','voided_at','timestamp with time zone'), ('approved_billing_scopes','superseded_at','timestamp with time zone'),
            ('audit_logs','action','text'), ('audit_logs','entity_type','text'), ('audit_logs','entity_id','uuid'), ('audit_logs','user_id','text'), ('audit_logs','details','jsonb'), ('audit_logs','timestamp','timestamp with time zone')
        ) AS required_columns(table_name,column_name,type_name)
        WHERE NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid=to_regclass('public.'||required_columns.table_name) AND a.attname=required_columns.column_name AND a.attnum>0 AND NOT a.attisdropped AND format_type(a.atttypid,a.atttypmod) LIKE required_columns.type_name||'%')
    ) THEN RAISE EXCEPTION 'service cancellation preflight: required column or type missing'; END IF;
    IF to_regprocedure('public.cancel_service(uuid,text,text,text)') IS NOT NULL THEN RAISE EXCEPTION 'service cancellation preflight: callable signature already exists'; END IF;
    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'cancel_service'
    ) THEN
        RAISE EXCEPTION 'service cancellation preflight: unexpected lifecycle overload exists';
    END IF;
END;
$$;

CREATE FUNCTION public.cancel_service(p_service_id uuid,p_reason text,p_actor_id text,p_actor_role text)
RETURNS TABLE(error_code text,service_id uuid,service_status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
    v_status text; v_reason text:=NULLIF(btrim(p_reason),''); v_now timestamptz:=transaction_timestamp();
BEGIN
    IF NULLIF(btrim(p_actor_id),'') IS NULL OR NULLIF(btrim(p_actor_role),'') IS NULL THEN RETURN QUERY SELECT 'service_actor_invalid',p_service_id,NULL::text,false; RETURN; END IF;
    IF v_reason IS NULL THEN RETURN QUERY SELECT 'service_cancellation_reason_required',p_service_id,NULL::text,false; RETURN; END IF;
    IF char_length(v_reason)>1000 THEN RETURN QUERY SELECT 'service_cancellation_reason_too_long',p_service_id,NULL::text,false; RETURN; END IF;
    SELECT s.status INTO v_status FROM public.services s WHERE s.id=p_service_id AND s.deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'service_not_found',p_service_id,NULL::text,false; RETURN; END IF;
    IF v_status='Cancelled' THEN RETURN QUERY SELECT NULL::text,p_service_id,v_status,true; RETURN; END IF;
    IF v_status NOT IN ('Inquiry','Quoted','Approved') THEN RETURN QUERY SELECT 'service_status_transition_ineligible',p_service_id,v_status,false; RETURN; END IF;
    IF EXISTS (SELECT 1 FROM public.invoices i WHERE i.service_id=p_service_id) THEN RETURN QUERY SELECT 'service_invoice_history_exists',p_service_id,v_status,false; RETURN; END IF;
    IF EXISTS (SELECT 1 FROM public.payments p JOIN public.invoices i ON i.id=p.invoice_id WHERE i.service_id=p_service_id) THEN RETURN QUERY SELECT 'service_payment_history_exists',p_service_id,v_status,false; RETURN; END IF;
    IF EXISTS (SELECT 1 FROM public.approved_billing_scopes a WHERE a.service_id=p_service_id AND a.status='approved' AND a.superseded_at IS NULL AND a.voided_at IS NULL FOR UPDATE) THEN RETURN QUERY SELECT 'service_billing_authority_unresolved',p_service_id,v_status,false; RETURN; END IF;
    UPDATE public.services s SET status='Cancelled',cancellation_reason=v_reason,updated_by=p_actor_id,updated_at=v_now WHERE s.id=p_service_id AND s.status IN ('Inquiry','Quoted','Approved') AND s.deleted_at IS NULL;
    INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp) VALUES ('status_change','service',p_service_id,p_actor_id,jsonb_build_object('event_type','service_status_changed','actor_id',p_actor_id,'actor_role',p_actor_role,'from_status',v_status,'to_status','Cancelled','reason',v_reason,'transaction_timestamp',v_now),v_now);
    RETURN QUERY SELECT NULL::text,p_service_id,'Cancelled'::text,false;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_service(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_service(uuid,text,text,text) TO service_role;
COMMIT;
