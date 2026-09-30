-- W10F additive correction: give each immutable arrangement review its own foundation identity.
BEGIN;

DO $w10f_revenue_review_identity_fix$
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
  entity_check text;
  expected_entity_check text := $constraint$CHECK ((entity_type = ANY (ARRAY['capability_assignment'::text, 'accounting_profile'::text, 'accounting_account'::text, 'accounting_period'::text, 'accounting_posting_rule'::text, 'accounting_journal'::text, 'accounting_inception_package'::text, 'accounting_inception_review'::text, 'accounting_inception_acceptance'::text, 'accounting_ar_bridge_event'::text, 'accounting_ap_bridge_event'::text, 'accounting_expense_bridge_event'::text, 'accounting_revenue_arrangement'::text, 'accounting_revenue_performance_unit'::text, 'accounting_revenue_performance_evidence'::text, 'accounting_revenue_recognition_event'::text])))$constraint$;
  next_entity_check text;
  after_entity_check text;
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
  fn:=to_regprocedure('public.review_accounting_revenue_arrangement(uuid,uuid,integer,boolean,text,uuid)');
  SELECT p.prosrc,p.proowner::regrole::text,p.proacl::text,p.proconfig,l.lanname,
    p.provolatile::text,p.proparallel::text,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,
    p.proargnames,p.proargdefaults::text,pg_catalog.pg_get_function_arguments(p.oid),
    pg_catalog.pg_get_function_result(p.oid),p.proallargtypes::regtype[]::text,p.proargmodes::text
    INTO src,owner_name,acl_text,cfg,lang_name,vol,parallel,cost,rows_count,is_strict,leaky,definer,
      arg_names,arg_defaults,signature,result_signature,all_arg_types,arg_modes
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM '1e7e7f85f6327b936c049438f5da57af'
     OR owner_name IS DISTINCT FROM 'postgres'
     OR acl_text IS DISTINCT FROM '{postgres=X/postgres,service_role=X/postgres}'
     OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']
     OR lang_name IS DISTINCT FROM 'plpgsql' OR vol IS DISTINCT FROM 'v' OR parallel IS DISTINCT FROM 'u'
     OR cost IS DISTINCT FROM 100::real OR rows_count IS DISTINCT FROM 1000::real
     OR is_strict IS DISTINCT FROM false OR leaky IS DISTINCT FROM false OR definer IS DISTINCT FROM true
     OR arg_names IS DISTINCT FROM ARRAY['p_actor','p_arrangement_id','p_arrangement_version','p_approve','p_reason',
       'p_request_id','error_code','review_id','decision','idempotent_replay']
     OR arg_defaults IS NOT NULL
     OR signature IS DISTINCT FROM 'p_actor uuid, p_arrangement_id uuid, p_arrangement_version integer, p_approve boolean, p_reason text, p_request_id uuid'
     OR result_signature IS DISTINCT FROM 'TABLE(error_code text, review_id uuid, decision text, idempotent_replay boolean)'
     OR all_arg_types IS DISTINCT FROM '{uuid,uuid,integer,boolean,text,uuid,text,uuid,text,boolean}'
     OR arg_modes IS DISTINCT FROM '{i,i,i,i,i,i,t,t,t,t}' THEN
    RAISE EXCEPTION 'W10F review foundation identity repair preflight: RPC contract differs';
  END IF;

  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO entity_check
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid='public.accounting_foundation_events'::regclass
    AND c.conname='accounting_foundation_events_entity_type_check' AND c.contype='c';
  IF entity_check IS DISTINCT FROM expected_entity_check THEN
    RAISE EXCEPTION 'W10F review foundation identity repair preflight: entity type constraint differs';
  END IF;
  next_entity_check:=replace(expected_entity_check,
    '''accounting_revenue_recognition_event''::text',
    '''accounting_revenue_recognition_event''::text, ''accounting_revenue_arrangement_review''::text');
  EXECUTE 'ALTER TABLE public.accounting_foundation_events DROP CONSTRAINT accounting_foundation_events_entity_type_check';
  EXECUTE format('ALTER TABLE public.accounting_foundation_events ADD CONSTRAINT accounting_foundation_events_entity_type_check %s',next_entity_check);

  old_text:=$old$replay.entity_type IS DISTINCT FROM 'accounting_revenue_arrangement'$old$;
  new_text:=$new$replay.entity_type IS DISTINCT FROM 'accounting_revenue_arrangement_review'$new$;
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10F review foundation identity repair preflight: replay entity anchor differs';
  END IF;
  next_src:=replace(src,old_text,new_text);

  old_text:=$old$  fid:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
    payload_fingerprint,result_reference,occurred_at)
  VALUES(fid,profile,'accounting_revenue_arrangement_reviewed','accounting_revenue_arrangement',p_arrangement_id,p_arrangement_version,p_actor,p_request_id,
    btrim(p_reason),encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex'),
    'accounting_revenue_arrangement_reviews/'||p_arrangement_id::text||'/'||p_arrangement_version::text,clock_timestamp());
  INSERT INTO public.accounting_revenue_arrangement_reviews(profile_id,arrangement_id,arrangement_version,decision,reviewer_user_id,reason,foundation_event_id)
    VALUES(profile,p_arrangement_id,p_arrangement_version,decision_text,p_actor,btrim(p_reason),fid) RETURNING id INTO rid;
$old$;
  new_text:=$new$  fid:=gen_random_uuid();
  rid:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
    payload_fingerprint,result_reference,occurred_at)
  VALUES(fid,profile,'accounting_revenue_arrangement_reviewed','accounting_revenue_arrangement_review',rid,1,p_actor,p_request_id,
    btrim(p_reason),encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex'),
    'accounting_revenue_arrangement_reviews/'||p_arrangement_id::text||'/'||p_arrangement_version::text,clock_timestamp());
  INSERT INTO public.accounting_revenue_arrangement_reviews(id,profile_id,arrangement_id,arrangement_version,decision,reviewer_user_id,reason,foundation_event_id)
    VALUES(rid,profile,p_arrangement_id,p_arrangement_version,decision_text,p_actor,btrim(p_reason),fid);
$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN
    RAISE EXCEPTION 'W10F review foundation identity repair preflight: foundation insert anchor differs';
  END IF;
  next_src:=replace(next_src,old_text,new_text);

  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.review_accounting_revenue_arrangement(
    p_actor uuid,p_arrangement_id uuid,p_arrangement_version integer,p_approve boolean,p_reason text,p_request_id uuid
  ) RETURNS TABLE(error_code text,review_id uuid,decision text,idempotent_replay boolean)
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
  SELECT pg_catalog.pg_get_constraintdef(c.oid) INTO after_entity_check
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid='public.accounting_foundation_events'::regclass
    AND c.conname='accounting_foundation_events_entity_type_check' AND c.contype='c';
  IF after_src IS DISTINCT FROM next_src OR after_owner_name IS DISTINCT FROM owner_name
     OR after_acl_text IS DISTINCT FROM acl_text OR after_cfg IS DISTINCT FROM cfg
     OR after_lang_name IS DISTINCT FROM lang_name OR after_vol IS DISTINCT FROM vol
     OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict
     OR after_leaky IS DISTINCT FROM leaky OR after_definer IS DISTINCT FROM definer
     OR after_arg_names IS DISTINCT FROM arg_names OR after_arg_defaults IS DISTINCT FROM arg_defaults
     OR after_signature IS DISTINCT FROM signature OR after_result_signature IS DISTINCT FROM result_signature
     OR after_all_arg_types IS DISTINCT FROM all_arg_types OR after_arg_modes IS DISTINCT FROM arg_modes
     OR after_entity_check IS DISTINCT FROM next_entity_check THEN
    RAISE EXCEPTION 'W10F review foundation identity repair postflight: RPC or entity type metadata changed';
  END IF;
END;$w10f_revenue_review_identity_fix$;

COMMIT;
