-- W10F additive correction: disambiguate JSON unit aliases from the PL/pgSQL unit variable.
BEGIN;

DO $w10f_arrangement_alias_fix$
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
  fn:=to_regprocedure('public.save_accounting_revenue_arrangement(uuid,uuid,uuid,integer,jsonb,text,text,text,text,text,uuid)');
  SELECT p.prosrc,p.proowner::regrole::text,p.proacl::text,p.proconfig,l.lanname,
    p.provolatile::text,p.proparallel::text,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,
    p.proargnames,p.proargdefaults::text,pg_catalog.pg_get_function_arguments(p.oid),
    pg_catalog.pg_get_function_result(p.oid),p.proallargtypes::regtype[]::text,p.proargmodes::text
    INTO src,owner_name,acl_text,cfg,lang_name,vol,parallel,cost,rows_count,is_strict,leaky,definer,
      arg_names,arg_defaults,signature,result_signature,all_arg_types,arg_modes
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM 'cd1f1648a5bf072b81e66a9610c53980'
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
    RAISE EXCEPTION 'W10F arrangement alias repair preflight: deployed function contract differs';
  END IF;

  old_text:=$old$    ELSIF EXISTS(SELECT 1 FROM jsonb_array_elements(p_units) u WHERE jsonb_typeof(u)<>'object'
      OR length(btrim(coalesce(u->>'unit_key','')))=0 OR length(btrim(coalesce(u->>'promised_output','')))=0
      OR u->>'satisfaction_method' NOT IN ('POINT_IN_TIME','OVER_TIME')
      OR u->>'required_evidence_basis' NOT IN ('CUSTOMER_ACCEPTANCE','TRANSFER_OF_CONTROL','MEASURED_OUTPUT')
      OR jsonb_typeof(u->'allocations')<>'array' OR jsonb_array_length(u->'allocations')=0
      OR (u->>'satisfaction_method'='POINT_IN_TIME' AND u->>'required_evidence_basis' NOT IN ('CUSTOMER_ACCEPTANCE','TRANSFER_OF_CONTROL'))
      OR (u->>'satisfaction_method'='OVER_TIME' AND u->>'required_evidence_basis' NOT IN ('CUSTOMER_ACCEPTANCE','MEASURED_OUTPUT'))) THEN
      held:='PERFORMANCE_UNIT_ALLOCATION_INCOMPLETE';
    ELSIF (SELECT count(*)<>count(DISTINCT u->>'unit_key') FROM jsonb_array_elements(p_units) u) THEN
      held:='PERFORMANCE_UNIT_KEY_COLLISION';
    ELSIF EXISTS(SELECT 1 FROM jsonb_array_elements(p_units) u CROSS JOIN LATERAL jsonb_array_elements(u->'allocations') a
      WHERE nullif(a->>'source_item_id','') IS NULL OR nullif(a->>'amount_halalah','') IS NULL OR (a->>'amount_halalah')::bigint<=0)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_units) u CROSS JOIN LATERAL jsonb_array_elements(u->'allocations') a
        GROUP BY u->>'unit_key',a->>'source_item_id' HAVING count(*)>1) THEN held:='PERFORMANCE_UNIT_ALLOCATION_INVALID';
    ELSIF EXISTS(
      WITH expected AS (SELECT i.id source_item_id,round((i.accepted_subtotal-i.source_discount_allocated)*100,0)::bigint amount
        FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id=s.id AND i.decision IN ('accepted','adjusted')
          AND (i.source_commercial_role='authority_line' OR (i.source_commercial_role='optional_add_on' AND i.source_is_selected IS TRUE))
          AND i.accepted_subtotal-i.source_discount_allocated>0),
      supplied AS (SELECT (a->>'source_item_id')::uuid source_item_id,sum((a->>'amount_halalah')::bigint)::bigint amount
        FROM jsonb_array_elements(p_units) u CROSS JOIN LATERAL jsonb_array_elements(u->'allocations') a GROUP BY 1)
      SELECT 1 FROM expected e FULL OUTER JOIN supplied a USING(source_item_id) WHERE coalesce(e.amount,0)<>coalesce(a.amount,0)) THEN
      held:='PERFORMANCE_UNIT_ALLOCATION_DOES_NOT_RECONCILE';
    ELSIF (SELECT coalesce(sum((a->>'amount_halalah')::bigint),0)::bigint FROM jsonb_array_elements(p_units) u
        CROSS JOIN LATERAL jsonb_array_elements(u->'allocations') a)<>amount THEN
      held:='PERFORMANCE_UNIT_ALLOCATION_DOES_NOT_RECONCILE';$old$;
  new_text:=$new$    ELSIF EXISTS(SELECT 1 FROM jsonb_array_elements(p_units) AS unit_json(value) WHERE jsonb_typeof(unit_json.value)<>'object'
      OR length(btrim(coalesce(unit_json.value->>'unit_key','')))=0 OR length(btrim(coalesce(unit_json.value->>'promised_output','')))=0
      OR unit_json.value->>'satisfaction_method' NOT IN ('POINT_IN_TIME','OVER_TIME')
      OR unit_json.value->>'required_evidence_basis' NOT IN ('CUSTOMER_ACCEPTANCE','TRANSFER_OF_CONTROL','MEASURED_OUTPUT')
      OR jsonb_typeof(unit_json.value->'allocations')<>'array' OR jsonb_array_length(unit_json.value->'allocations')=0
      OR (unit_json.value->>'satisfaction_method'='POINT_IN_TIME' AND unit_json.value->>'required_evidence_basis' NOT IN ('CUSTOMER_ACCEPTANCE','TRANSFER_OF_CONTROL'))
      OR (unit_json.value->>'satisfaction_method'='OVER_TIME' AND unit_json.value->>'required_evidence_basis' NOT IN ('CUSTOMER_ACCEPTANCE','MEASURED_OUTPUT'))) THEN
      held:='PERFORMANCE_UNIT_ALLOCATION_INCOMPLETE';
    ELSIF (SELECT count(*)<>count(DISTINCT unit_json.value->>'unit_key') FROM jsonb_array_elements(p_units) AS unit_json(value)) THEN
      held:='PERFORMANCE_UNIT_KEY_COLLISION';
    ELSIF EXISTS(SELECT 1 FROM jsonb_array_elements(p_units) AS unit_json(value)
      CROSS JOIN LATERAL jsonb_array_elements(unit_json.value->'allocations') AS allocation_json(value)
      WHERE nullif(allocation_json.value->>'source_item_id','') IS NULL OR nullif(allocation_json.value->>'amount_halalah','') IS NULL OR (allocation_json.value->>'amount_halalah')::bigint<=0)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_units) AS unit_json(value)
        CROSS JOIN LATERAL jsonb_array_elements(unit_json.value->'allocations') AS allocation_json(value)
        GROUP BY unit_json.value->>'unit_key',allocation_json.value->>'source_item_id' HAVING count(*)>1) THEN held:='PERFORMANCE_UNIT_ALLOCATION_INVALID';
    ELSIF EXISTS(
      WITH expected AS (SELECT i.id source_item_id,round((i.accepted_subtotal-i.source_discount_allocated)*100,0)::bigint amount
        FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id=s.id AND i.decision IN ('accepted','adjusted')
          AND (i.source_commercial_role='authority_line' OR (i.source_commercial_role='optional_add_on' AND i.source_is_selected IS TRUE))
          AND i.accepted_subtotal-i.source_discount_allocated>0),
      supplied AS (SELECT (allocation_json.value->>'source_item_id')::uuid source_item_id,sum((allocation_json.value->>'amount_halalah')::bigint)::bigint amount
        FROM jsonb_array_elements(p_units) AS unit_json(value)
        CROSS JOIN LATERAL jsonb_array_elements(unit_json.value->'allocations') AS allocation_json(value) GROUP BY 1)
      SELECT 1 FROM expected e FULL OUTER JOIN supplied a USING(source_item_id) WHERE coalesce(e.amount,0)<>coalesce(a.amount,0)) THEN
      held:='PERFORMANCE_UNIT_ALLOCATION_DOES_NOT_RECONCILE';
    ELSIF (SELECT coalesce(sum((allocation_json.value->>'amount_halalah')::bigint),0)::bigint FROM jsonb_array_elements(p_units) AS unit_json(value)
        CROSS JOIN LATERAL jsonb_array_elements(unit_json.value->'allocations') AS allocation_json(value))<>amount THEN
      held:='PERFORMANCE_UNIT_ALLOCATION_DOES_NOT_RECONCILE';$new$;
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10F arrangement alias repair preflight: validation anchor differs';
  END IF;
  next_src:=replace(src,old_text,new_text);
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
    RAISE EXCEPTION 'W10F arrangement alias repair postflight: function source or metadata changed';
  END IF;
END;$w10f_arrangement_alias_fix$;

COMMIT;
