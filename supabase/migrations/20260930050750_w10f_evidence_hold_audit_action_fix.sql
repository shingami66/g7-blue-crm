-- W10F additive correction: use the permitted held-evidence audit action.
BEGIN;

DO $w10f_evidence_hold_audit_action_fix$
DECLARE
  fn oid;
  src text;
  next_src text;
  old_text text;
  new_text text;
  before_meta jsonb;
  after_meta jsonb;
  role_name text;
  acl_text text;
  config text[];
  language_name text;
  arguments text;
  result_type text;
  audit_check text;
BEGIN
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO audit_check FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.audit_logs'::regclass AND c.conname='audit_logs_action_check' AND c.contype='c';
  IF audit_check IS NULL OR position($anchor$(entity_type = 'accounting_revenue_performance_evidence'::text)$anchor$ in audit_check)=0
     OR position($anchor$['submit'::text, 'approve'::text, 'hold'::text]$anchor$ in audit_check)=0 THEN
    RAISE EXCEPTION 'W10F evidence audit repair preflight: audit action contract differs';
  END IF;
  fn:=to_regprocedure('public.save_accounting_revenue_performance_evidence(uuid,uuid,text,integer,text,date,date,text,text,text,uuid,text,text,uuid)');
  SELECT p.prosrc,to_jsonb(p)-'prosrc',p.proowner::regrole::text,p.proacl::text,p.proconfig,
    l.lanname,pg_catalog.pg_get_function_arguments(p.oid),pg_catalog.pg_get_function_result(p.oid)
    INTO src,before_meta,role_name,acl_text,config,language_name,arguments,result_type
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM 'cae0be0df890dea206f4f9f3228c4519'
     OR role_name IS DISTINCT FROM 'postgres'
     OR acl_text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, extensions']
     OR language_name IS DISTINCT FROM 'plpgsql'
     OR arguments IS DISTINCT FROM 'p_actor uuid, p_unit_id uuid, p_evidence_key text, p_expected_version integer, p_evidence_basis text, p_performance_from date, p_performance_through date, p_evidence_ref text, p_evidence_sha256 text, p_recognized_to_date_halalah text, p_correction_of_recognition_event_id uuid, p_correction_amount_halalah text, p_rationale text, p_request_id uuid'
     OR result_type IS DISTINCT FROM 'TABLE(error_code text, evidence_id uuid, version integer, status text, held_code text, idempotent_replay boolean)' THEN
    RAISE EXCEPTION 'W10F evidence audit repair preflight: RPC contract differs';
  END IF;
  old_text:=$old$VALUES(CASE WHEN held IS NULL THEN 'submit' ELSE 'correction_hold' END,'accounting_revenue_performance_evidence'$old$;
  new_text:=$new$VALUES(CASE WHEN held IS NULL THEN 'submit' ELSE 'hold' END,'accounting_revenue_performance_evidence'$new$;
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10F evidence audit repair preflight: audit insert anchor differs';
  END IF;
  next_src:=replace(src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.save_accounting_revenue_performance_evidence(
    p_actor uuid,p_unit_id uuid,p_evidence_key text,p_expected_version integer,p_evidence_basis text,
    p_performance_from date,p_performance_through date,p_evidence_ref text,p_evidence_sha256 text,
    p_recognized_to_date_halalah text,p_correction_of_recognition_event_id uuid,p_correction_amount_halalah text,
    p_rationale text,p_request_id uuid
  ) RETURNS TABLE(error_code text,evidence_id uuid,version integer,status text,held_code text,idempotent_replay boolean)
  LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000
  SET search_path=pg_catalog,public,extensions AS %L$ddl$,next_src);
  SELECT p.prosrc,to_jsonb(p)-'prosrc' INTO src,after_meta FROM pg_catalog.pg_proc p WHERE p.oid=fn;
  IF src IS DISTINCT FROM next_src OR after_meta IS DISTINCT FROM before_meta THEN
    RAISE EXCEPTION 'W10F evidence audit repair postflight: source or metadata differs';
  END IF;
END;$w10f_evidence_hold_audit_action_fix$;

COMMIT;
