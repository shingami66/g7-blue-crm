-- W10F additive correction: qualify modification-allocation CTE amounts from the variable.
BEGIN;

DO $w10f_arrangement_modification_amount_fix$
DECLARE
  fn oid;
  src text;
  next_src text;
  old_texts text[];
  new_texts text[];
  i integer;
  old_alloc_pos integer;
  new_alloc_pos integer;
  amount_pos integer;
  old_amount_text text := 'sum(amount)::bigint amount';
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
  fn:=to_regprocedure('public.save_accounting_revenue_arrangement(uuid,uuid,uuid,integer,jsonb,text,text,text,text,text,uuid)');
  SELECT p.prosrc,p.proowner::regrole::text,p.proacl::text,p.proconfig,l.lanname,
    p.provolatile::text,p.proparallel::text,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,
    p.proargnames,p.proargdefaults::text,pg_catalog.pg_get_function_arguments(p.oid),
    pg_catalog.pg_get_function_result(p.oid),p.proallargtypes::regtype[]::text,p.proargmodes::text
    INTO src,owner_name,acl_text,cfg,lang_name,vol,parallel,cost,rows_count,is_strict,leaky,definer,
      arg_names,arg_defaults,signature,result_signature,all_arg_types,arg_modes
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM '67e423c42816c163701c15b11cd5b69a'
     OR owner_name IS DISTINCT FROM 'postgres'
     OR acl_text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, extensions']
     OR lang_name IS DISTINCT FROM 'plpgsql' OR vol IS DISTINCT FROM 'v' OR parallel IS DISTINCT FROM 'u'
     OR cost IS DISTINCT FROM 100::real OR rows_count IS DISTINCT FROM 1000::real
     OR is_strict IS DISTINCT FROM false OR leaky IS DISTINCT FROM false OR definer IS DISTINCT FROM true
     OR arg_names IS DISTINCT FROM ARRAY['p_actor','p_service_id','p_abs_id','p_expected_version','p_units',
       'p_principal_agent_basis','p_policy_version','p_modification_evidence_ref','p_modification_evidence_sha256',
       'p_reason','p_request_id','error_code','arrangement_id','version','status','held_code','consideration_halalah','idempotent_replay']
     OR arg_defaults IS NOT NULL
     OR signature IS DISTINCT FROM 'p_actor uuid, p_service_id uuid, p_abs_id uuid, p_expected_version integer, p_units jsonb, p_principal_agent_basis text, p_policy_version text, p_modification_evidence_ref text, p_modification_evidence_sha256 text, p_reason text, p_request_id uuid'
     OR result_signature IS DISTINCT FROM 'TABLE(error_code text, arrangement_id uuid, version integer, status text, held_code text, consideration_halalah text, idempotent_replay boolean)'
     OR all_arg_types IS DISTINCT FROM '{uuid,uuid,uuid,integer,jsonb,text,text,text,text,text,uuid,text,uuid,integer,text,text,text,boolean}'
     OR arg_modes IS DISTINCT FROM '{i,i,i,i,i,i,i,i,i,i,i,t,t,t,t,t,t,t}' THEN
    RAISE EXCEPTION 'W10F arrangement modification repair preflight: deployed function contract differs';
  END IF;

  old_texts:=ARRAY[
    $old$             SELECT unit_key,source_item_id,parent_item_id,allocation_item,allocation_item root_item,amount,0 depth
             FROM old_base$old$,
    $old$               allocation_item->>'source_is_selected' source_is_selected,source_item_id,amount
             FROM old_walk ORDER BY unit_key,source_item_id,depth DESC$old$,
    $old$             SELECT unit_key,source_item_id,parent_item_id,allocation_item,allocation_item root_item,amount,0 depth
             FROM new_base$old$,
    $old$               allocation_item->>'source_is_selected' source_is_selected,source_item_id,amount
             FROM new_walk ORDER BY unit_key,source_item_id,depth DESC$old$,
    $old$              SELECT unit_key,allocation_key,source_commercial_role,source_is_selected,sum(amount)::bigint amount
              FROM old_resolved GROUP BY unit_key,allocation_key,source_commercial_role,source_is_selected$old$,
    $old$              SELECT unit_key,allocation_key,source_commercial_role,source_is_selected,sum(amount)::bigint amount
              FROM new_resolved GROUP BY unit_key,allocation_key,source_commercial_role,source_is_selected$old$
  ];
  new_texts:=ARRAY[
    $new$             SELECT unit_key,source_item_id,parent_item_id,allocation_item,allocation_item root_item,old_base.amount,0 depth
             FROM old_base$new$,
    $new$               allocation_item->>'source_is_selected' source_is_selected,old_walk.source_item_id,old_walk.amount
             FROM old_walk ORDER BY unit_key,source_item_id,depth DESC$new$,
    $new$             SELECT unit_key,source_item_id,parent_item_id,allocation_item,allocation_item root_item,new_base.amount,0 depth
             FROM new_base$new$,
    $new$               allocation_item->>'source_is_selected' source_is_selected,new_walk.source_item_id,new_walk.amount
             FROM new_walk ORDER BY unit_key,source_item_id,depth DESC$new$,
    $new$              SELECT unit_key,allocation_key,source_commercial_role,source_is_selected,sum(old_resolved.amount)::bigint amount
              FROM old_resolved GROUP BY unit_key,allocation_key,source_commercial_role,source_is_selected$new$,
    $new$              SELECT unit_key,allocation_key,source_commercial_role,source_is_selected,sum(new_resolved.amount)::bigint amount
              FROM new_resolved GROUP BY unit_key,allocation_key,source_commercial_role,source_is_selected$new$
  ];
  old_texts:=old_texts[1:4];
  new_texts:=new_texts[1:4];
  next_src:=src;
  FOR i IN 1..array_length(old_texts,1) LOOP
    IF length(next_src)-length(replace(next_src,old_texts[i],''))<>length(old_texts[i]) THEN
      RAISE EXCEPTION 'W10F arrangement modification repair preflight: allocation amount anchor % differs',i;
    END IF;
    next_src:=replace(next_src,old_texts[i],new_texts[i]);
  END LOOP;
  old_alloc_pos:=position('old_alloc AS (' IN next_src);
  new_alloc_pos:=position('new_alloc AS (' IN next_src);
  IF old_alloc_pos=0 OR new_alloc_pos<=old_alloc_pos THEN
    RAISE EXCEPTION 'W10F arrangement modification repair preflight: allocation CTE anchors differ';
  END IF;
  amount_pos:=old_alloc_pos+position(old_amount_text IN substring(next_src FROM old_alloc_pos FOR new_alloc_pos-old_alloc_pos))-1;
  IF amount_pos<old_alloc_pos OR amount_pos+length(old_amount_text)-1>=new_alloc_pos THEN
    RAISE EXCEPTION 'W10F arrangement modification repair preflight: old allocation amount differs';
  END IF;
  next_src:=overlay(next_src PLACING 'sum(old_resolved.amount)::bigint amount' FROM amount_pos FOR length(old_amount_text));
  new_alloc_pos:=position('new_alloc AS (' IN next_src);
  amount_pos:=new_alloc_pos+position(old_amount_text IN substring(next_src FROM new_alloc_pos))-1;
  IF amount_pos<new_alloc_pos THEN
    RAISE EXCEPTION 'W10F arrangement modification repair preflight: new allocation amount differs';
  END IF;
  next_src:=overlay(next_src PLACING 'sum(new_resolved.amount)::bigint amount' FROM amount_pos FOR length(old_amount_text));

  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.save_accounting_revenue_arrangement(
    p_actor uuid,p_service_id uuid,p_abs_id uuid,p_expected_version integer,p_units jsonb,
    p_principal_agent_basis text,p_policy_version text,p_modification_evidence_ref text,
    p_modification_evidence_sha256 text,p_reason text,p_request_id uuid
  ) RETURNS TABLE(error_code text,arrangement_id uuid,version integer,status text,held_code text,consideration_halalah text,idempotent_replay boolean)
  LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000
  SET search_path=pg_catalog,public,extensions AS %L$ddl$,next_src);

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
    RAISE EXCEPTION 'W10F arrangement modification repair postflight: function source or metadata changed';
  END IF;
END;$w10f_arrangement_modification_amount_fix$;

COMMIT;
