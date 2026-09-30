-- W10-INTEGRITY-R1: bounded accounting integrity guards.
-- Additive only; fail closed on unexpected deployed predecessors.
BEGIN;

DO $repair$
DECLARE
  fn oid;
  src text;
  next_src text;
  old_text text;
  new_text text;
  owner_id oid;
  acl aclitem[];
  cfg text[];
  vol "char";
  parallel "char";
  cost real;
  rows_count real;
  is_strict boolean;
  leaky boolean;
  definer boolean;
  lang_name text;
  after_owner oid;
  after_acl aclitem[];
  after_cfg text[];
  after_vol "char";
  after_parallel "char";
  after_cost real;
  after_rows_count real;
  after_is_strict boolean;
  after_leaky boolean;
  after_definer boolean;
  after_lang_name text;
BEGIN
  fn:=to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
         p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer,lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM '36299c23ccbb8604914e779e4b23e559'
     OR NOT definer OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']
     OR vol<>'v' OR parallel<>'u' OR cost<>100 OR rows_count<>1000
     OR is_strict OR leaky OR lang_name<>'plpgsql' THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 preflight: journal-prepare predecessor differs';
  END IF;
  next_src:=src;
  old_text:=$old$  v_source_domain:=coalesce(p_journal->>'source_domain',concat('CONTROLLED_','MANUAL'));$old$;
  new_text:=$new$  v_source_domain:=coalesce(p_journal->>'source_domain',concat('CONTROLLED_','MANUAL'));
  IF v_source_domain='CONTROLLED_MANUAL' AND length(btrim(coalesce(p_evidence_ref,'')))=0 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 preflight: journal-prepare evidence anchor differs';
  END IF;
  next_src:=replace(next_src,old_text,new_text);
  old_text:=$old$v_source_domain='CONTROLLED_MANUAL' AND NOT av.is_protected AND av.control_classification='NONE'$old$;
  new_text:=$new$v_source_domain='CONTROLLED_MANUAL' AND NOT av.is_protected AND av.control_classification='NONE' AND av.account_type<>'REVENUE'$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 preflight: manual revenue account anchor differs';
  END IF;
  next_src:=replace(next_src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.prepare_accounting_journal(p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_journal jsonb,p_reason text,p_evidence_ref text,p_request_id uuid)
    RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF
    SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,next_src);
  SELECT p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO after_owner,after_acl,after_cfg,after_vol,after_parallel,after_cost,after_rows_count,after_is_strict,after_leaky,after_definer,after_lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg
     OR after_vol IS DISTINCT FROM vol OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict
     OR after_leaky IS DISTINCT FROM leaky OR after_definer IS DISTINCT FROM definer OR after_lang_name IS DISTINCT FROM lang_name THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 postflight: journal-prepare metadata changed';
  END IF;

  fn:=to_regprocedure('public.reverse_accounting_journal(uuid,uuid,uuid,date,text,text,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
         p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer,lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM 'c6e4160e581b9e08ccb301043ad0863c'
     OR NOT definer OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']
     OR vol<>'v' OR parallel<>'u' OR cost<>100 OR rows_count<>1000
     OR is_strict OR leaky OR lang_name<>'plpgsql' THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 preflight: journal-reverse predecessor differs';
  END IF;
  next_src:=src;
  old_text:=$old$OR p_accounting_date IS NULL OR p_request_id IS NULL OR length(btrim(coalesce(p_reason,'')))=0 THEN$old$;
  new_text:=$new$OR p_accounting_date IS NULL OR p_request_id IS NULL OR length(btrim(coalesce(p_reason,'')))=0
     OR length(btrim(coalesce(p_evidence_ref,'')))=0 THEN$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 preflight: journal-reverse evidence anchor differs';
  END IF;
  next_src:=replace(next_src,old_text,new_text);
  old_text:=$old$v_original.source_domain='INCEPTION' OR v_original.source_domain='AP_BRIDGE' OR v_original.source_domain='EXPENSE_BRIDGE' OR v_original.source_domain='REVENUE_RECOGNITION'$old$;
  new_text:=$new$v_original.source_domain='INCEPTION' OR v_original.source_domain='AR_BRIDGE' OR v_original.source_domain='AP_BRIDGE' OR v_original.source_domain='EXPENSE_BRIDGE' OR v_original.source_domain='REVENUE_RECOGNITION'$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 preflight: journal-reverse AR guard anchor differs';
  END IF;
  next_src:=replace(next_src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.reverse_accounting_journal(p_actor_user_id uuid,p_original_journal_id uuid,p_period_id uuid,p_accounting_date date,p_reason text,p_evidence_ref text,p_request_id uuid)
    RETURNS TABLE(error_code text,journal_id uuid,version integer,original_journal_id uuid,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF
    SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,next_src);
  SELECT p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO after_owner,after_acl,after_cfg,after_vol,after_parallel,after_cost,after_rows_count,after_is_strict,after_leaky,after_definer,after_lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg
     OR after_vol IS DISTINCT FROM vol OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict
     OR after_leaky IS DISTINCT FROM leaky OR after_definer IS DISTINCT FROM definer OR after_lang_name IS DISTINCT FROM lang_name THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 postflight: journal-reverse metadata changed';
  END IF;

  fn:=to_regprocedure('public.get_accounting_ap_bridge_reconciliation(uuid,date,timestamptz,integer)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
         p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer,lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM 'cc7b4dca3fdf88c1feba223297c87465'
     OR NOT definer OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']
     OR vol<>'s' OR parallel<>'u' OR cost<>100 OR rows_count<>0
     OR is_strict OR leaky OR lang_name<>'plpgsql' THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 preflight: AP reconciliation predecessor differs';
  END IF;
  next_src:=src;
  old_text:=$old$JOIN public.accounting_profile_versions pv ON pv.profile_id=p.id AND pv.version=p.current_version WHERE p.singleton_key='g7';$old$;
  new_text:=$new$JOIN LATERAL (
      SELECT pv0.cutover_boundary_date
      FROM public.accounting_profile_versions pv0
      WHERE pv0.profile_id=p.id
        AND pv0.effective_from<=p_recorded_at_cutoff
        AND pv0.created_at<=p_recorded_at_cutoff
      ORDER BY pv0.effective_from DESC,pv0.version DESC LIMIT 1
    ) pv ON true WHERE p.singleton_key='g7';$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 preflight: AP profile cutoff anchor differs';
  END IF;
  next_src:=replace(next_src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.get_accounting_ap_bridge_reconciliation(p_actor_user_id uuid,p_as_of_date date,p_recorded_at_cutoff timestamptz,p_limit integer DEFAULT 200)
    RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER PARALLEL UNSAFE COST 100 SET search_path=pg_catalog, public AS %L$ddl$,next_src);
  SELECT p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO after_owner,after_acl,after_cfg,after_vol,after_parallel,after_cost,after_rows_count,after_is_strict,after_leaky,after_definer,after_lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg
     OR after_vol IS DISTINCT FROM vol OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict
     OR after_leaky IS DISTINCT FROM leaky OR after_definer IS DISTINCT FROM definer OR after_lang_name IS DISTINCT FROM lang_name THEN
    RAISE EXCEPTION 'W10-INTEGRITY-R1 postflight: AP reconciliation metadata changed';
  END IF;
END;
$repair$;

COMMIT;
