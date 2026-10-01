-- W10I: compare JSON text profile IDs to the UUID input's text form.
BEGIN;

DO $w10i_fingerprint_preflight$
DECLARE
  v_source text;
BEGIN
  SELECT p.prosrc INTO v_source
  FROM pg_catalog.pg_proc p
  WHERE p.oid=to_regprocedure('public.accounting_period_close_live_fingerprint(uuid)');
  IF v_source IS NULL OR position('to_jsonb(t)' IN v_source)=0
     OR position('$1' IN v_source)=0 THEN
    RAISE EXCEPTION 'W10I fingerprint preflight: deployed helper differs';
  END IF;
END;
$w10i_fingerprint_preflight$;

CREATE OR REPLACE FUNCTION public.accounting_period_close_live_fingerprint(p_profile_id uuid)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,public AS $w10i_live_fingerprint$
DECLARE
  v_table record;
  v_table_hash text;
  v_parts text:='';
BEGIN
  FOR v_table IN
    SELECT c.relname
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND c.relname LIKE 'accounting\_%' ESCAPE '\'
      AND c.relname NOT IN (
        'accounting_foundation_events','accounting_periods','accounting_period_versions',
        'accounting_period_close_packages','accounting_period_close_reviews'
      )
    ORDER BY c.relname
  LOOP
    EXECUTE format(
      'SELECT encode(extensions.digest(convert_to(coalesce(string_agg(encode(extensions.digest(convert_to(to_jsonb(t)::text,''UTF8''),''sha256''),''hex''), '','' ORDER BY to_jsonb(t)::text),''''),''UTF8''),''sha256''),''hex'') FROM public.%I t WHERE to_jsonb(t)->>''profile_id''=$1::text OR to_jsonb(t)->>''profile_id'' IS NULL',
      v_table.relname
    ) INTO v_table_hash USING p_profile_id;
    v_parts:=v_parts||v_table.relname||':'||coalesce(v_table_hash,'');
  END LOOP;
  RETURN encode(extensions.digest(convert_to(v_parts,'UTF8'),'sha256'),'hex');
END;
$w10i_live_fingerprint$;

ALTER FUNCTION public.accounting_period_close_live_fingerprint(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.accounting_period_close_live_fingerprint(uuid)
  FROM PUBLIC,anon,authenticated,service_role;

DO $w10i_fingerprint_postflight$
DECLARE v_proc pg_catalog.pg_proc%ROWTYPE;
BEGIN
  SELECT p.* INTO v_proc FROM pg_catalog.pg_proc p
  WHERE p.oid=to_regprocedure('public.accounting_period_close_live_fingerprint(uuid)');
  IF NOT FOUND OR NOT v_proc.prosecdef OR v_proc.proowner<>
       (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname='postgres')
     OR has_function_privilege('anon',v_proc.oid,'EXECUTE')
     OR has_function_privilege('authenticated',v_proc.oid,'EXECUTE')
     OR has_function_privilege('service_role',v_proc.oid,'EXECUTE') THEN
    RAISE EXCEPTION 'W10I fingerprint postflight: helper owner or ACL differs';
  END IF;
END;
$w10i_fingerprint_postflight$;

COMMIT;
