-- W10D corrective fix: name the scalar JSONB inventory result for reconciliation.
DO $w10d_reconciliation_inventory_alias_fix$
DECLARE
  v_function oid;
  v_source text;
  v_repaired text;
  v_after_source text;
  v_old text;
  v_new text;
  v_owner oid;
  v_acl aclitem[];
  v_config text[];
  v_after_owner oid;
  v_after_acl aclitem[];
  v_after_config text[];
  v_volatility "char";
  v_parallel "char";
  v_cost real;
  v_rows real;
  v_strict boolean;
  v_leakproof boolean;
  v_security boolean;
  v_arguments text;
  v_argument_defaults integer;
  v_default_expression text;
  v_after_volatility "char";
  v_after_parallel "char";
  v_after_cost real;
  v_after_rows real;
  v_after_strict boolean;
  v_after_leakproof boolean;
  v_after_security boolean;
  v_after_arguments text;
  v_after_argument_defaults integer;
  v_after_default_expression text;
BEGIN
  v_function:=to_regprocedure(
    'public.get_accounting_ar_bridge_reconciliation(uuid,date,timestamptz,integer)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.prosecdef,p.pronargdefaults,
    pg_catalog.pg_get_expr(p.proargdefaults,0::oid),pg_catalog.pg_get_function_arguments(p.oid)
    INTO v_source,v_owner,v_acl,v_config,v_volatility,v_parallel,v_cost,v_rows,
      v_strict,v_leakproof,v_security,v_argument_defaults,v_default_expression,v_arguments
  FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_function IS NULL OR v_source IS NULL
     OR pg_catalog.md5(v_source)<>'ae4852a8ca75db89004670ddb4d4485c'
     OR v_owner IS DISTINCT FROM 'postgres'::regrole::oid
     OR v_acl::text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR v_argument_defaults IS DISTINCT FROM 1 OR v_default_expression IS DISTINCT FROM '200'
     OR v_arguments IS DISTINCT FROM 'p_actor_user_id uuid, p_as_of_date date, p_recorded_at_cutoff timestamp with time zone, p_limit integer DEFAULT 200'
     OR NOT v_security OR v_volatility<>'s' OR v_parallel<>'u' OR v_cost<>100 OR v_rows<>0
     OR v_strict OR v_leakproof OR v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN
    RAISE EXCEPTION 'W10D preflight: AR reconciliation function contract differs';
  END IF;

  v_old:='SELECT item FROM public.accounting_ar_bridge_source_inventory(p_as_of_date,p_recorded_at_cutoff,p_limit+1)';
  v_new:='SELECT inventory.item FROM public.accounting_ar_bridge_source_inventory(p_as_of_date,p_recorded_at_cutoff,p_limit+1) AS inventory(item)';
  IF length(v_source)-length(replace(v_source,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10D preflight: AR source inventory alias anchor differs';
  END IF;
  v_repaired:=replace(v_source,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.get_accounting_ar_bridge_reconciliation(
    p_actor_user_id uuid,p_as_of_date date,p_recorded_at_cutoff timestamptz,p_limit integer DEFAULT 200
  ) RETURNS jsonb LANGUAGE plpgsql CALLED ON NULL INPUT STABLE NOT LEAKPROOF
    SECURITY DEFINER PARALLEL UNSAFE COST 100 SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);

  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.prosecdef,p.pronargdefaults,
    pg_catalog.pg_get_expr(p.proargdefaults,0::oid),pg_catalog.pg_get_function_arguments(p.oid)
    INTO v_after_source,v_after_owner,v_after_acl,v_after_config,v_after_volatility,v_after_parallel,
      v_after_cost,v_after_rows,v_after_strict,v_after_leakproof,v_after_security,v_after_argument_defaults,
      v_after_default_expression,v_after_arguments
  FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_source IS DISTINCT FROM v_repaired
     OR v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl
     OR v_after_config IS DISTINCT FROM v_config OR v_after_volatility IS DISTINCT FROM v_volatility
     OR v_after_parallel IS DISTINCT FROM v_parallel OR v_after_cost IS DISTINCT FROM v_cost
     OR v_after_rows IS DISTINCT FROM v_rows OR v_after_strict IS DISTINCT FROM v_strict
     OR v_after_leakproof IS DISTINCT FROM v_leakproof OR v_after_security IS DISTINCT FROM v_security
     OR v_after_argument_defaults IS DISTINCT FROM v_argument_defaults
     OR v_after_default_expression IS DISTINCT FROM v_default_expression
     OR v_after_arguments IS DISTINCT FROM v_arguments THEN
    RAISE EXCEPTION 'W10D postflight: AR reconciliation function source or contract changed unexpectedly';
  END IF;
END;
$w10d_reconciliation_inventory_alias_fix$;