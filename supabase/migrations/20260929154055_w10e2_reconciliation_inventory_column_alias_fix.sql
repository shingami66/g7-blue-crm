-- W10E2 additive correction: alias the SETOF jsonb inventory column.
BEGIN;

-- Serialize cooperating retries of this controlled W10E2 correction.
SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'g7:w10e2:get_accounting_expense_bridge_reconciliation_inventory_alias', 0
));

DO $w10e2_reconciliation_inventory_alias$
DECLARE
  v_function oid := 'public.get_accounting_expense_bridge_reconciliation(uuid,date,timestamptz,integer)'::regprocedure;
  v_before record;
  v_after record;
  v_definition text;
  v_updated text;
  v_expected_source text;
  v_old_anchor text := 'SELECT item FROM public.accounting_expense_bridge_source_inventory(p_as_of,p_cutoff,p_limit+1)';
  v_new_anchor text := 'SELECT item FROM public.accounting_expense_bridge_source_inventory(p_as_of,p_cutoff,p_limit+1) AS source_inventory(item)';
  v_identity text := 'p_actor uuid, p_as_of date, p_cutoff timestamp with time zone, p_limit integer';
  v_result text := 'jsonb';
BEGIN
  SELECT p.proowner,p.prolang,l.lanname AS language_name,p.prokind,p.probin,p.pronargdefaults,
    p.proargdefaults::text AS proargdefaults_text,p.prosqlbody::text AS prosqlbody_text,
    p.prosecdef,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,
    p.proconfig,p.proacl,p.prosrc
  INTO v_before FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang
  WHERE p.oid=v_function;

  IF pg_catalog.pg_get_function_identity_arguments(v_function) IS DISTINCT FROM v_identity
     OR pg_catalog.pg_get_function_result(v_function) IS DISTINCT FROM v_result
     OR pg_catalog.pg_get_userbyid(v_before.proowner) IS DISTINCT FROM 'postgres'
     OR v_before.language_name IS DISTINCT FROM 'plpgsql'
     OR v_before.prokind IS DISTINCT FROM 'f'
     OR v_before.probin IS NOT NULL
     OR v_before.pronargdefaults IS DISTINCT FROM 1
     OR v_before.proargdefaults_text IS NULL
     OR v_before.prosqlbody_text IS NOT NULL
     OR v_before.prosecdef IS DISTINCT FROM true
     OR v_before.provolatile IS DISTINCT FROM 's'
     OR v_before.proparallel IS DISTINCT FROM 'u'
     OR v_before.procost IS DISTINCT FROM 100
     OR v_before.prorows IS DISTINCT FROM 0
     OR v_before.proisstrict IS DISTINCT FROM false
     OR v_before.proleakproof IS DISTINCT FROM false
     OR v_before.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[]
     OR v_before.proacl::text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR pg_catalog.md5(v_before.prosrc) IS DISTINCT FROM '40f52408bd586b0cebf579c166770641' THEN
    RAISE EXCEPTION 'W10E2 reconciliation function deployed metadata or source differs from reviewed correction contract';
  END IF;

  v_definition:=pg_catalog.pg_get_functiondef(v_function);
  IF (length(v_definition)-length(replace(v_definition,v_old_anchor,'')))/length(v_old_anchor)<>1
     OR position(v_new_anchor IN v_definition)>0 THEN
    RAISE EXCEPTION 'W10E2 reconciliation inventory alias anchor differs from reviewed correction contract';
  END IF;

  v_expected_source:=replace(v_before.prosrc,v_old_anchor,v_new_anchor);
  v_updated:=replace(v_definition,v_old_anchor,v_new_anchor);
  EXECUTE v_updated;

  SELECT p.proowner,p.prolang,l.lanname AS language_name,p.prokind,p.probin,p.pronargdefaults,
    p.proargdefaults::text AS proargdefaults_text,p.prosqlbody::text AS prosqlbody_text,
    p.prosecdef,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,
    p.proconfig,p.proacl,p.prosrc
  INTO v_after FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang
  WHERE p.oid=v_function;
  v_definition:=pg_catalog.pg_get_functiondef(v_function);

  IF ROW(v_before.proowner,v_before.prolang,v_before.language_name,v_before.prokind,v_before.probin,
       v_before.pronargdefaults,v_before.proargdefaults_text,v_before.prosqlbody_text,v_before.prosecdef,
       v_before.provolatile,v_before.proparallel,v_before.procost,v_before.prorows,v_before.proisstrict,
       v_before.proleakproof,v_before.proconfig,v_before.proacl)
       IS DISTINCT FROM
     ROW(v_after.proowner,v_after.prolang,v_after.language_name,v_after.prokind,v_after.probin,
       v_after.pronargdefaults,v_after.proargdefaults_text,v_after.prosqlbody_text,v_after.prosecdef,
       v_after.provolatile,v_after.proparallel,v_after.procost,v_after.prorows,v_after.proisstrict,
       v_after.proleakproof,v_after.proconfig,v_after.proacl)
     OR v_after.prosrc IS DISTINCT FROM v_expected_source
     OR v_after.proacl::text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR pg_catalog.pg_get_function_identity_arguments(v_function) IS DISTINCT FROM v_identity
     OR pg_catalog.pg_get_function_result(v_function) IS DISTINCT FROM v_result
     OR position(v_old_anchor IN v_definition)>0
     OR (length(v_definition)-length(replace(v_definition,v_new_anchor,'')))/length(v_new_anchor)<>1 THEN
    RAISE EXCEPTION 'W10E2 reconciliation correction failed its source, ABI, or metadata postflight';
  END IF;
END;
$w10e2_reconciliation_inventory_alias$;

COMMIT;
