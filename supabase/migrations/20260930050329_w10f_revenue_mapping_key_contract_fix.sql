-- W10F additive correction: use W10B lowercase posting-rule mapping keys in Revenue journals.
BEGIN;

DO $w10f_revenue_mapping_key_fix$
DECLARE
  revenue_fn oid;
  account_fn oid;
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
BEGIN
  revenue_fn:=to_regprocedure('public.prepare_accounting_revenue_recognition(uuid,uuid,integer,uuid,integer,uuid,integer,date,text,uuid)');
  account_fn:=to_regprocedure('public.accounting_revenue_recognition_account_authorized(uuid,text,uuid,integer)');
  IF revenue_fn IS NULL OR account_fn IS NULL THEN
    RAISE EXCEPTION 'W10F mapping key repair preflight: RPC missing';
  END IF;

  SELECT p.prosrc,to_jsonb(p)-'prosrc',p.proowner::regrole::text,p.proacl::text,p.proconfig,
    l.lanname,pg_catalog.pg_get_function_arguments(p.oid),pg_catalog.pg_get_function_result(p.oid)
    INTO src,before_meta,role_name,acl_text,config,language_name,arguments,result_type
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=revenue_fn;
  IF md5(src) IS DISTINCT FROM '9337bffaec03bfe457396f6205500cbe'
     OR role_name IS DISTINCT FROM 'postgres'
     OR acl_text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, extensions']
     OR language_name IS DISTINCT FROM 'plpgsql'
     OR arguments IS DISTINCT FROM 'p_actor uuid, p_evidence_id uuid, p_evidence_version integer, p_period_id uuid, p_period_version integer, p_posting_rule_id uuid, p_rule_version integer, p_accounting_date date, p_reason text, p_request_id uuid'
     OR result_type IS DISTINCT FROM 'TABLE(error_code text, journal_id uuid, version integer, status text, idempotent_replay boolean)' THEN
    RAISE EXCEPTION 'W10F mapping key repair preflight: Revenue RPC contract differs';
  END IF;
  next_src:=src;
  FOR old_text,new_text IN SELECT * FROM (VALUES
    ($old$jsonb_build_object('mapping_key','CONTRACT_LIABILITY','party_role'$old$,
     $new$jsonb_build_object('mapping_key','contract_liability','party_role'$new$),
    ($old$jsonb_build_object('mapping_key','CONTRACT_ASSET','party_role'$old$,
     $new$jsonb_build_object('mapping_key','contract_asset','party_role'$new$),
    ($old$jsonb_build_object('mapping_key','REVENUE','party_role'$old$,
     $new$jsonb_build_object('mapping_key','revenue','party_role'$new$)
  ) AS anchors(old_source,new_source) LOOP
    IF length(next_src)-length(replace(next_src,old_text,''))<>2*length(old_text) THEN
      RAISE EXCEPTION 'W10F mapping key repair preflight: Revenue line anchor differs';
    END IF;
    next_src:=replace(next_src,old_text,new_text);
  END LOOP;
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.prepare_accounting_revenue_recognition(
    p_actor uuid,p_evidence_id uuid,p_evidence_version integer,p_period_id uuid,p_period_version integer,
    p_posting_rule_id uuid,p_rule_version integer,p_accounting_date date,p_reason text,p_request_id uuid
  ) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
  LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000
  SET search_path=pg_catalog,public,extensions AS %L$ddl$,next_src);
  SELECT p.prosrc,to_jsonb(p)-'prosrc' INTO src,after_meta FROM pg_catalog.pg_proc p WHERE p.oid=revenue_fn;
  IF src IS DISTINCT FROM next_src OR after_meta IS DISTINCT FROM before_meta THEN
    RAISE EXCEPTION 'W10F mapping key repair postflight: Revenue RPC source or metadata differs';
  END IF;

  SELECT p.prosrc,to_jsonb(p)-'prosrc',p.proowner::regrole::text,p.proacl::text,p.proconfig,
    l.lanname,pg_catalog.pg_get_function_arguments(p.oid),pg_catalog.pg_get_function_result(p.oid)
    INTO src,before_meta,role_name,acl_text,config,language_name,arguments,result_type
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=account_fn;
  IF md5(src) IS DISTINCT FROM '2f2607299b75d846c28a2dbc5eaaa8d6'
     OR role_name IS DISTINCT FROM 'postgres' OR acl_text IS DISTINCT FROM '{postgres=X/postgres}'
     OR config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']
     OR language_name IS DISTINCT FROM 'sql'
     OR arguments IS DISTINCT FROM 'p_profile_id uuid, p_mapping_key text, p_account_id uuid, p_account_version integer'
     OR result_type IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'W10F mapping key repair preflight: account helper contract differs';
  END IF;
  old_text:='AND CASE p_mapping_key';
  new_text:='AND CASE upper(p_mapping_key)';
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10F mapping key repair preflight: account helper anchor differs';
  END IF;
  next_src:=replace(src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.accounting_revenue_recognition_account_authorized(
    p_profile_id uuid,p_mapping_key text,p_account_id uuid,p_account_version integer
  ) RETURNS boolean LANGUAGE sql CALLED ON NULL INPUT STABLE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100
  SET search_path=pg_catalog,public AS %L$ddl$,next_src);
  SELECT p.prosrc,to_jsonb(p)-'prosrc' INTO src,after_meta FROM pg_catalog.pg_proc p WHERE p.oid=account_fn;
  IF src IS DISTINCT FROM next_src OR after_meta IS DISTINCT FROM before_meta THEN
    RAISE EXCEPTION 'W10F mapping key repair postflight: account helper source or metadata differs';
  END IF;
END;$w10f_revenue_mapping_key_fix$;

COMMIT;
