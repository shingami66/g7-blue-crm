-- W10E2 additive correction: qualify event version against RETURNS TABLE output.
BEGIN;

DO $w10e2_prepare_event_version_alias$
DECLARE
  v_function oid := 'public.prepare_accounting_expense_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid)'::regprocedure;
  v_before record;
  v_after record;
  v_definition text;
  v_updated text;
  v_expected_source text;
  v_old_anchor text := 'FROM public.accounting_expense_bridge_event_versions WHERE profile_id=profile AND event_id=e.id AND version=p_event_version;';
  v_new_anchor text := 'FROM public.accounting_expense_bridge_event_versions AS ev WHERE profile_id=profile AND event_id=e.id AND ev.version=p_event_version;';
  v_identity text := 'p_actor uuid, p_event_id uuid, p_event_version integer, p_period uuid, p_period_version integer, p_rule uuid, p_rule_version integer, p_reason text, p_request uuid';
  v_result text := 'TABLE(error_code text, journal_id uuid, version integer, status text, idempotent_replay boolean)';
BEGIN
  SELECT p.proowner,p.prosecdef,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.proconfig,p.proacl,p.prosrc
  INTO v_before FROM pg_catalog.pg_proc p WHERE p.oid=v_function;

  IF pg_catalog.pg_get_function_identity_arguments(v_function) IS DISTINCT FROM v_identity
     OR pg_catalog.pg_get_function_result(v_function) IS DISTINCT FROM v_result
     OR pg_catalog.pg_get_userbyid(v_before.proowner)<>'postgres' OR NOT v_before.prosecdef
     OR v_before.provolatile<>'v' OR v_before.proparallel<>'u' OR v_before.procost<>100 OR v_before.prorows<>1000
     OR v_before.proisstrict OR v_before.proleakproof
     OR v_before.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[]
     OR v_before.proacl::text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR pg_catalog.md5(v_before.prosrc)<>'9174ae9e235ce6354d5870267816194e' THEN
    RAISE EXCEPTION 'W10E2 prepare function deployed metadata or source differs from reviewed correction contract';
  END IF;

  v_definition:=pg_catalog.pg_get_functiondef(v_function);
  IF (length(v_definition)-length(replace(v_definition,v_old_anchor,'')))/length(v_old_anchor)<>1
     OR position(v_new_anchor IN v_definition)>0 THEN
    RAISE EXCEPTION 'W10E2 prepare function version alias anchor differs from reviewed correction contract';
  END IF;

  v_expected_source:=replace(v_before.prosrc,v_old_anchor,v_new_anchor);
  v_updated:=replace(v_definition,v_old_anchor,v_new_anchor);
  EXECUTE v_updated;

  SELECT p.proowner,p.prosecdef,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.proconfig,p.proacl,p.prosrc
  INTO v_after FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  v_definition:=pg_catalog.pg_get_functiondef(v_function);

  IF ROW(v_before.proowner,v_before.prosecdef,v_before.provolatile,v_before.proparallel,v_before.procost,
       v_before.prorows,v_before.proisstrict,v_before.proleakproof,v_before.proconfig,v_before.proacl)
       IS DISTINCT FROM
     ROW(v_after.proowner,v_after.prosecdef,v_after.provolatile,v_after.proparallel,v_after.procost,
       v_after.prorows,v_after.proisstrict,v_after.proleakproof,v_after.proconfig,v_after.proacl)
     OR v_after.prosrc IS DISTINCT FROM v_expected_source
     OR v_after.proacl::text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR pg_catalog.pg_get_function_identity_arguments(v_function) IS DISTINCT FROM v_identity
     OR pg_catalog.pg_get_function_result(v_function) IS DISTINCT FROM v_result
     OR position(v_old_anchor IN v_definition)>0
     OR (length(v_definition)-length(replace(v_definition,v_new_anchor,'')))/length(v_new_anchor)<>1 THEN
    RAISE EXCEPTION 'W10E2 prepare function correction failed its source, ABI, or metadata postflight';
  END IF;
END;
$w10e2_prepare_event_version_alias$;

COMMIT;
