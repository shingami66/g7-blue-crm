-- W10F additive correction: qualify the Revenue journal link lookup in posting.
BEGIN;

DO $w10f_revenue_post_journal_alias_fix$
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
BEGIN
  fn:=to_regprocedure('public.post_accounting_revenue_recognition_journal(uuid,uuid,integer,uuid)');
  SELECT p.prosrc,to_jsonb(p)-'prosrc',p.proowner::regrole::text,p.proacl::text,p.proconfig,
    l.lanname,pg_catalog.pg_get_function_arguments(p.oid),pg_catalog.pg_get_function_result(p.oid)
    INTO src,before_meta,role_name,acl_text,config,language_name,arguments,result_type
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM '0ae4946c17e66302f1bc9753a50941ba'
     OR role_name IS DISTINCT FROM 'postgres'
     OR acl_text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']
     OR language_name IS DISTINCT FROM 'plpgsql'
     OR arguments IS DISTINCT FROM 'p_actor uuid, p_journal_id uuid, p_expected_version integer, p_request_id uuid'
     OR result_type IS DISTINCT FROM 'TABLE(error_code text, journal_id uuid, version integer, status text, idempotent_replay boolean)' THEN
    RAISE EXCEPTION 'W10F Revenue post alias repair preflight: RPC contract differs';
  END IF;
  old_text:='SELECT prepared_version INTO prepared FROM public.accounting_revenue_recognition_journal_links WHERE profile_id=profile AND journal_id=p_journal_id;';
  new_text:='SELECT revenue_link.prepared_version INTO prepared FROM public.accounting_revenue_recognition_journal_links AS revenue_link WHERE revenue_link.profile_id=profile AND revenue_link.journal_id=p_journal_id;';
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10F Revenue post alias repair preflight: link lookup anchor differs';
  END IF;
  next_src:=replace(src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.post_accounting_revenue_recognition_journal(
    p_actor uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid
  ) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
  LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000
  SET search_path=pg_catalog,public AS %L$ddl$,next_src);
  SELECT p.prosrc,to_jsonb(p)-'prosrc' INTO src,after_meta FROM pg_catalog.pg_proc p WHERE p.oid=fn;
  IF src IS DISTINCT FROM next_src OR after_meta IS DISTINCT FROM before_meta THEN
    RAISE EXCEPTION 'W10F Revenue post alias repair postflight: source or metadata differs';
  END IF;
END;$w10f_revenue_post_journal_alias_fix$;

COMMIT;
