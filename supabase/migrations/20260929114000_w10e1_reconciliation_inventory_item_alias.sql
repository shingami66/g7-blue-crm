-- W10E1 additive correction: name the source inventory JSON column for reconciliation.
BEGIN;

DO $w10e1_reconciliation_inventory_alias$
DECLARE
  v_function oid := 'public.get_accounting_ap_bridge_reconciliation(uuid,date,timestamptz,integer)'::regprocedure;
  v_definition text;
  v_updated text;
  v_old_anchor text := 'WITH inventory AS MATERIALIZED (SELECT item FROM public.accounting_ap_bridge_source_inventory(p_as_of_date,p_recorded_at_cutoff,p_limit+1)),';
  v_new_anchor text := 'WITH inventory AS MATERIALIZED (SELECT item FROM public.accounting_ap_bridge_source_inventory(p_as_of_date,p_recorded_at_cutoff,p_limit+1) AS source(item)),';
  v_before record;
  v_after record;
BEGIN
  SELECT p.proowner,p.prosecdef,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.proconfig,p.proacl
  INTO v_before FROM pg_catalog.pg_proc p WHERE p.oid=v_function;

  IF pg_catalog.pg_get_userbyid(v_before.proowner)<>'postgres' OR NOT v_before.prosecdef OR v_before.provolatile<>'s'
     OR v_before.proparallel<>'u' OR v_before.procost<>100 OR v_before.prorows<>0
     OR v_before.proisstrict OR v_before.proleakproof
     OR v_before.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[]
     OR v_before.proacl::text<>'{postgres=X/postgres,service_role=X/postgres}' THEN
    RAISE EXCEPTION 'W10E1 reconciliation deployed metadata differs from the reviewed correction contract';
  END IF;

  v_definition:=pg_catalog.pg_get_functiondef(v_function);
  IF (length(v_definition)-length(replace(v_definition,v_old_anchor,'')))/length(v_old_anchor)<>1
     OR position(v_new_anchor IN v_definition)>0 THEN
    RAISE EXCEPTION 'W10E1 reconciliation inventory alias anchor differs from the reviewed correction contract';
  END IF;

  v_updated:=replace(v_definition,v_old_anchor,v_new_anchor);
  EXECUTE v_updated;

  SELECT p.proowner,p.prosecdef,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.proconfig,p.proacl
  INTO v_after FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  v_definition:=pg_catalog.pg_get_functiondef(v_function);

  IF ROW(v_before.proowner,v_before.prosecdef,v_before.provolatile,v_before.proparallel,v_before.procost,
       v_before.prorows,v_before.proisstrict,v_before.proleakproof,v_before.proconfig,v_before.proacl)
       IS DISTINCT FROM
     ROW(v_after.proowner,v_after.prosecdef,v_after.provolatile,v_after.proparallel,v_after.procost,
       v_after.prorows,v_after.proisstrict,v_after.proleakproof,v_after.proconfig,v_after.proacl)
     OR position(v_old_anchor IN v_definition)>0
     OR (length(v_definition)-length(replace(v_definition,v_new_anchor,'')))/length(v_new_anchor)<>1 THEN
    RAISE EXCEPTION 'W10E1 reconciliation inventory alias correction failed its source or metadata postflight';
  END IF;
END;
$w10e1_reconciliation_inventory_alias$;

COMMIT;
