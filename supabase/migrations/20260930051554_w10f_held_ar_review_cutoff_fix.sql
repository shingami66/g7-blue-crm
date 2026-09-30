-- W10F additive correction: count held AR credit and refund events at the source date cutoff.
BEGIN;

DO $w10f_held_ar_review_cutoff_fix$
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
  fn:=to_regprocedure('public.get_accounting_revenue_recognition_reconciliation(uuid,date,timestamp with time zone,integer)');
  SELECT p.prosrc,to_jsonb(p)-'prosrc',p.proowner::regrole::text,p.proacl::text,p.proconfig,
    l.lanname,pg_catalog.pg_get_function_arguments(p.oid),pg_catalog.pg_get_function_result(p.oid)
    INTO src,before_meta,role_name,acl_text,config,language_name,arguments,result_type
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM 'c90c2fcbaa0ff117773f4eaad602321c'
     OR role_name IS DISTINCT FROM 'postgres'
     OR acl_text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']
     OR language_name IS DISTINCT FROM 'plpgsql'
     OR arguments IS DISTINCT FROM 'p_actor uuid, p_as_of date, p_cutoff timestamp with time zone, p_limit integer DEFAULT 200'
     OR result_type IS DISTINCT FROM 'jsonb' THEN
    RAISE EXCEPTION 'W10F held AR cutoff repair preflight: reconciliation contract differs';
  END IF;
  old_text:=$old$AND v.created_at<=p_cutoff AND v.source_recorded_at<=p_cutoff AND (v.service_id IS NULL OR v.accounting_date<=p_as_of)$old$;
  new_text:=$new$AND v.created_at<=p_cutoff AND v.source_recorded_at<=p_cutoff
       AND (v.service_id IS NULL OR coalesce(v.accounting_date,v.source_business_date,
         (v.source_recorded_at AT TIME ZONE 'Asia/Riyadh')::date)<=p_as_of)$new$;
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10F held AR cutoff repair preflight: held-event filter anchor differs';
  END IF;
  next_src:=replace(src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.get_accounting_revenue_recognition_reconciliation(
    p_actor uuid,p_as_of date,p_cutoff timestamp with time zone,p_limit integer DEFAULT 200
  ) RETURNS jsonb LANGUAGE plpgsql CALLED ON NULL INPUT STABLE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100
  SET search_path=pg_catalog,public AS %L$ddl$,next_src);
  SELECT p.prosrc,to_jsonb(p)-'prosrc' INTO src,after_meta FROM pg_catalog.pg_proc p WHERE p.oid=fn;
  IF src IS DISTINCT FROM next_src OR after_meta IS DISTINCT FROM before_meta THEN
    RAISE EXCEPTION 'W10F held AR cutoff repair postflight: source or metadata differs';
  END IF;
END;$w10f_held_ar_review_cutoff_fix$;

COMMIT;
