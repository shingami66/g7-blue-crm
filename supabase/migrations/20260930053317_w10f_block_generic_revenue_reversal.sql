-- W10F additive correction: generic journal reversal cannot bypass Revenue correction lineage.
BEGIN;

DO $w10f_block_generic_revenue_reversal$
DECLARE
  fn oid;
  src text;
  next_src text;
  old_text text;
  new_text text;
  owner_name text;
  acl_text text;
  cfg text[];
  lang_name text;
  vol text;
  parallel text;
  cost real;
  rows_count real;
  is_strict boolean;
  leaky boolean;
  definer boolean;
  arg_names text[];
  arg_defaults text;
  signature text;
  result_signature text;
  all_arg_types text;
  arg_modes text;
  after_src text;
  after_owner_name text;
  after_acl_text text;
  after_cfg text[];
  after_lang_name text;
  after_vol text;
  after_parallel text;
  after_cost real;
  after_rows_count real;
  after_is_strict boolean;
  after_leaky boolean;
  after_definer boolean;
  after_arg_names text[];
  after_arg_defaults text;
  after_signature text;
  after_result_signature text;
  after_all_arg_types text;
  after_arg_modes text;
BEGIN
  fn:=to_regprocedure('public.reverse_accounting_journal(uuid,uuid,uuid,date,text,text,uuid)');
  SELECT p.prosrc,p.proowner::regrole::text,p.proacl::text,p.proconfig,l.lanname,
    p.provolatile::text,p.proparallel::text,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,
    p.proargnames,p.proargdefaults::text,pg_catalog.pg_get_function_arguments(p.oid),
    pg_catalog.pg_get_function_result(p.oid),p.proallargtypes::regtype[]::text,p.proargmodes::text
    INTO src,owner_name,acl_text,cfg,lang_name,vol,parallel,cost,rows_count,is_strict,leaky,definer,
      arg_names,arg_defaults,signature,result_signature,all_arg_types,arg_modes
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM '34a6187e9e9b0443ca576daa63f6f146'
     OR owner_name IS DISTINCT FROM 'postgres'
     OR acl_text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']
     OR lang_name IS DISTINCT FROM 'plpgsql' OR vol IS DISTINCT FROM 'v' OR parallel IS DISTINCT FROM 'u'
     OR cost IS DISTINCT FROM 100::real OR rows_count IS DISTINCT FROM 1000::real
     OR is_strict IS DISTINCT FROM false OR leaky IS DISTINCT FROM false OR definer IS DISTINCT FROM true
     OR arg_names IS DISTINCT FROM ARRAY['p_actor_user_id','p_original_journal_id','p_period_id','p_accounting_date',
       'p_reason','p_evidence_ref','p_request_id','error_code','journal_id','version','original_journal_id','idempotent_replay']
     OR arg_defaults IS NOT NULL
     OR signature IS DISTINCT FROM 'p_actor_user_id uuid, p_original_journal_id uuid, p_period_id uuid, p_accounting_date date, p_reason text, p_evidence_ref text, p_request_id uuid'
     OR result_signature IS DISTINCT FROM 'TABLE(error_code text, journal_id uuid, version integer, original_journal_id uuid, idempotent_replay boolean)'
     OR all_arg_types IS DISTINCT FROM '{uuid,uuid,uuid,date,text,text,uuid,text,uuid,integer,uuid,boolean}'
     OR arg_modes IS DISTINCT FROM '{i,i,i,i,i,i,i,t,t,t,t,t}' THEN
    RAISE EXCEPTION 'W10F generic Revenue reversal repair preflight: RPC contract differs';
  END IF;

  old_text:=$old$  IF NOT FOUND OR v_original.status<>'POSTED' OR v_original_identity.reversal_of_journal_id IS NOT NULL OR v_original.source_domain='INCEPTION' OR v_original.source_domain='AP_BRIDGE' OR v_original.source_domain='EXPENSE_BRIDGE' THEN$old$;
  new_text:=$new$  IF NOT FOUND OR v_original.status<>'POSTED' OR v_original_identity.reversal_of_journal_id IS NOT NULL OR v_original.source_domain='INCEPTION' OR v_original.source_domain='AP_BRIDGE' OR v_original.source_domain='EXPENSE_BRIDGE' OR v_original.source_domain='REVENUE_RECOGNITION' THEN$new$;
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10F generic Revenue reversal repair preflight: source guard anchor differs';
  END IF;
  next_src:=replace(src,old_text,new_text);

  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.reverse_accounting_journal(
    p_actor_user_id uuid,p_original_journal_id uuid,p_period_id uuid,p_accounting_date date,
    p_reason text,p_evidence_ref text,p_request_id uuid
  ) RETURNS TABLE(error_code text,journal_id uuid,version integer,original_journal_id uuid,idempotent_replay boolean)
  LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000
  SET search_path=pg_catalog,public AS %L$ddl$,next_src);

  SELECT p.prosrc,p.proowner::regrole::text,p.proacl::text,p.proconfig,l.lanname,
    p.provolatile::text,p.proparallel::text,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,
    p.proargnames,p.proargdefaults::text,pg_catalog.pg_get_function_arguments(p.oid),
    pg_catalog.pg_get_function_result(p.oid),p.proallargtypes::regtype[]::text,p.proargmodes::text
    INTO after_src,after_owner_name,after_acl_text,after_cfg,after_lang_name,after_vol,after_parallel,after_cost,
      after_rows_count,after_is_strict,after_leaky,after_definer,after_arg_names,after_arg_defaults,after_signature,
      after_result_signature,after_all_arg_types,after_arg_modes
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF after_src IS DISTINCT FROM next_src OR after_owner_name IS DISTINCT FROM owner_name
     OR after_acl_text IS DISTINCT FROM acl_text OR after_cfg IS DISTINCT FROM cfg
     OR after_lang_name IS DISTINCT FROM lang_name OR after_vol IS DISTINCT FROM vol
     OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict
     OR after_leaky IS DISTINCT FROM leaky OR after_definer IS DISTINCT FROM definer
     OR after_arg_names IS DISTINCT FROM arg_names OR after_arg_defaults IS DISTINCT FROM arg_defaults
     OR after_signature IS DISTINCT FROM signature OR after_result_signature IS DISTINCT FROM result_signature
     OR after_all_arg_types IS DISTINCT FROM all_arg_types OR after_arg_modes IS DISTINCT FROM arg_modes THEN
    RAISE EXCEPTION 'W10F generic Revenue reversal repair postflight: function source or metadata changed';
  END IF;
END;$w10f_block_generic_revenue_reversal$;

COMMIT;
