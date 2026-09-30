-- W10F additive correction: qualify the reconciliation Revenue CTE column.
BEGIN;

DO $w10f_revenue_alias_fix$
DECLARE fn oid;src text;next_src text;old_text text;new_text text;owner_id oid;acl aclitem[];cfg text[];lang_name text;
  arg_names text[];arg_defaults text;signature text;after_arg_names text[];after_arg_defaults text;after_signature text;
  after_owner oid;after_acl aclitem[];after_cfg text[];vol "char";parallel "char";cost real;rows_count real;
  is_strict boolean;leaky boolean;definer boolean;after_vol "char";after_parallel "char";after_cost real;after_rows_count real;
  after_is_strict boolean;after_leaky boolean;after_definer boolean;after_lang_name text;
BEGIN
  fn:=to_regprocedure('public.get_accounting_revenue_recognition_reconciliation(uuid,date,timestamptz,integer)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.prosecdef,l.lanname,p.proargnames,p.proargdefaults::text,pg_catalog.pg_get_function_arguments(p.oid)
    INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer,lang_name,arg_names,arg_defaults,signature
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM '9902defb4dfbb6059428bdc6162300e4' OR NOT definer
     OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']
     OR arg_names IS DISTINCT FROM ARRAY['p_actor','p_as_of','p_cutoff','p_limit']
     OR signature IS DISTINCT FROM 'p_actor uuid, p_as_of date, p_cutoff timestamp with time zone, p_limit integer DEFAULT 200' THEN
    RAISE EXCEPTION 'W10F Revenue alias repair preflight: deployed function contract differs';
  END IF;

  old_text:=$old$SELECT contract_asset,contract_liability,revenue INTO asset,liability,revenue FROM balances$old$;
  new_text:=$new$SELECT b.contract_asset,b.contract_liability,b.revenue INTO asset,liability,revenue FROM balances b$new$;
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10F Revenue alias repair preflight: balance query anchor differs';
  END IF;
  next_src:=replace(src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.get_accounting_revenue_recognition_reconciliation(
    p_actor uuid,p_as_of date,p_cutoff timestamptz,p_limit integer DEFAULT 200
  ) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS %L$ddl$,next_src);

  SELECT p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,
    p.proleakproof,p.prosecdef,l.lanname,p.proargnames,p.proargdefaults::text,pg_catalog.pg_get_function_arguments(p.oid)
    INTO after_owner,after_acl,after_cfg,after_vol,after_parallel,after_cost,after_rows_count,
      after_is_strict,after_leaky,after_definer,after_lang_name,after_arg_names,after_arg_defaults,after_signature
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg
     OR after_vol IS DISTINCT FROM vol OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict
     OR after_leaky IS DISTINCT FROM leaky OR after_definer IS DISTINCT FROM definer
     OR after_lang_name IS DISTINCT FROM lang_name OR after_arg_names IS DISTINCT FROM arg_names
     OR after_arg_defaults IS DISTINCT FROM arg_defaults OR after_signature IS DISTINCT FROM signature THEN
    RAISE EXCEPTION 'W10F Revenue alias repair postflight: function metadata changed';
  END IF;
END;$w10f_revenue_alias_fix$;

COMMIT;
