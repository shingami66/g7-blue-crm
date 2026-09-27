-- W10B corrective: use the established audit action vocabulary for rule versions.
BEGIN;

CREATE OR REPLACE FUNCTION public.save_accounting_posting_rule(
  p_actor_user_id uuid,p_posting_rule_id uuid,p_expected_version integer,
  p_rule jsonb,p_reason text,p_evidence_ref text,p_request_id uuid
)
RETURNS TABLE(error_code text,posting_rule_id uuid,version integer,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $save_rule$
DECLARE
  v_profile_id uuid; v_profile_version integer; v_activation text;
  v_rule_id uuid; v_rule_code text; v_new_version integer; v_prior_version integer;
  v_fingerprint text; v_request_fingerprint text; v_event_id uuid; v_item jsonb;
  v_mapping_count integer:=0; v_identity public.accounting_posting_rules%ROWTYPE;
  v_previous_event public.accounting_journal_events%ROWTYPE;
BEGIN
  IF p_actor_user_id IS NULL OR p_request_id IS NULL OR p_expected_version IS NULL
     OR p_rule IS NULL OR jsonb_typeof(p_rule)<>'object'
     OR length(btrim(coalesce(p_reason,'')))=0
     OR (SELECT count(*) FROM jsonb_object_keys(p_rule))<>5
     OR NOT (p_rule ?& ARRAY['rule_code','name_en','name_ar','is_active','mappings'])
     OR jsonb_typeof(p_rule->'mappings')<>'array'
     OR jsonb_array_length(p_rule->'mappings')<2
     OR jsonb_array_length(p_rule->'mappings')>200 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u
    WHERE u.id=p_actor_user_id AND u.is_active IS TRUE) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_chart') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id,v.version,v.activation_state INTO v_profile_id,v_profile_version,v_activation
  FROM public.accounting_profiles p
  JOIN public.accounting_profile_versions v
    ON v.profile_id=p.id AND v.version=p.current_version
  WHERE p.singleton_key='g7' AND p.current_version>0;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF v_activation<>'DEV_PROVISIONAL' THEN
    RETURN QUERY SELECT 'profile_not_active'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10b-profile:'||v_profile_id::text,0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10b-request:'||v_profile_id::text||':'||
      p_actor_user_id::text||':SAVE_RULE:'||p_request_id::text,0)
  );
  v_request_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'posting_rule_id',p_posting_rule_id,'expected_version',p_expected_version,
    'rule',p_rule,'reason',btrim(p_reason),'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');
  SELECT e.* INTO v_previous_event FROM public.accounting_journal_events e
  WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id
    AND e.operation='SAVE_RULE' AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_previous_event.payload_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,v_previous_event.posting_rule_id,
      v_previous_event.entity_version,true; RETURN;
  END IF;
  v_rule_code:=upper(btrim(p_rule->>'rule_code'));
  IF v_rule_code !~ '^[A-Z][A-Z0-9_]{1,39}$'
     OR length(btrim(coalesce(p_rule->>'name_en','')))=0
     OR length(btrim(coalesce(p_rule->>'name_ar','')))=0
     OR jsonb_typeof(p_rule->'is_active')<>'boolean' THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF p_posting_rule_id IS NULL THEN
    IF p_expected_version<>0 THEN
      RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    INSERT INTO public.accounting_posting_rules(profile_id,rule_code,current_version)
      VALUES(v_profile_id,v_rule_code,0) RETURNING id INTO v_rule_id;
    v_prior_version:=NULL; v_new_version:=1;
    v_event_id:=gen_random_uuid();
    INSERT INTO public.accounting_foundation_events(
      id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
      request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
    ) VALUES (
      v_event_id,v_profile_id,'accounting_posting_rule_created','accounting_posting_rule',
      v_rule_id,v_new_version,p_actor_user_id,p_request_id,btrim(p_reason),
      NULLIF(btrim(p_evidence_ref),''),v_request_fingerprint,
      'accounting_posting_rules/'||v_rule_id::text||'/1',clock_timestamp()
    );
  ELSE
    SELECT r.* INTO v_identity FROM public.accounting_posting_rules r
      WHERE r.profile_id=v_profile_id AND r.id=p_posting_rule_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN QUERY SELECT 'posting_rule_not_found'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    IF v_identity.current_version<>p_expected_version THEN
      RETURN QUERY SELECT 'revision_conflict'::text,v_identity.id,v_identity.current_version,false; RETURN;
    END IF;
    IF v_identity.rule_code<>v_rule_code THEN
      RETURN QUERY SELECT 'source_identity_immutable'::text,v_identity.id,v_identity.current_version,false; RETURN;
    END IF;
    v_rule_id:=v_identity.id; v_prior_version:=v_identity.current_version;
    v_new_version:=v_prior_version+1; v_event_id:=gen_random_uuid();
    INSERT INTO public.accounting_foundation_events(
      id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
      request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
    ) VALUES (
      v_event_id,v_profile_id,'accounting_posting_rule_updated','accounting_posting_rule',
      v_rule_id,v_new_version,p_actor_user_id,p_request_id,btrim(p_reason),
      NULLIF(btrim(p_evidence_ref),''),v_request_fingerprint,
      'accounting_posting_rules/'||v_rule_id::text||'/'||v_new_version::text,clock_timestamp()
    );
  END IF;

  INSERT INTO public.accounting_posting_rule_versions(
    profile_id,posting_rule_id,version,previous_version,name_en,name_ar,is_active,
    effective_from,reason,evidence_ref,created_by,created_at,foundation_event_id
  ) VALUES (
    v_profile_id,v_rule_id,v_new_version,v_prior_version,btrim(p_rule->>'name_en'),
    btrim(p_rule->>'name_ar'),(p_rule->>'is_active')::boolean,clock_timestamp(),
    btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),p_actor_user_id,clock_timestamp(),v_event_id
  );

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_rule->'mappings') LOOP
    IF jsonb_typeof(v_item)<>'object'
       OR (SELECT count(*) FROM jsonb_object_keys(v_item))<>5
       OR NOT (v_item ?& ARRAY['mapping_key','account_id','account_version','allowed_side','service_requirement'])
       OR coalesce(v_item->>'mapping_key','') !~ '^[a-z][a-z0-9_]{0,39}$'
       OR coalesce(v_item->>'allowed_side','') NOT IN ('DEBIT','CREDIT','EITHER')
       OR coalesce(v_item->>'service_requirement','') NOT IN ('REQUIRED','OPTIONAL','FORBIDDEN') THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_RULE_MAPPING_INPUT_INVALID';
    END IF;
    INSERT INTO public.accounting_posting_rule_mappings(
      profile_id,posting_rule_id,rule_version,mapping_key,account_id,account_version,
      allowed_side,service_requirement
    ) VALUES (
      v_profile_id,v_rule_id,v_new_version,v_item->>'mapping_key',
      (v_item->>'account_id')::uuid,(v_item->>'account_version')::integer,
      v_item->>'allowed_side',v_item->>'service_requirement'
    );
    v_mapping_count:=v_mapping_count+1;
  END LOOP;
  IF v_mapping_count<2 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_RULE_MAPPING_INPUT_INVALID';
  END IF;
  UPDATE public.accounting_posting_rules SET current_version=v_new_version
    WHERE profile_id=v_profile_id AND id=v_rule_id;
  INSERT INTO public.accounting_journal_events(
    profile_id,event_type,operation,posting_rule_id,entity_version,actor_user_id,
    request_id,payload_fingerprint
  ) VALUES (
    v_profile_id,'RULE_SAVED','SAVE_RULE',v_rule_id,v_new_version,p_actor_user_id,
    p_request_id,v_request_fingerprint
  );
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES(CASE WHEN v_new_version=1 THEN 'create' ELSE 'update' END,
    'accounting_posting_rule',v_rule_id,p_actor_user_id::text,
    jsonb_build_object('profile_id',v_profile_id,'version',v_new_version,
      'request_id',p_request_id,'rule_code',v_rule_code),clock_timestamp());
  RETURN QUERY SELECT NULL::text,v_rule_id,v_new_version,false;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'mapping_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN check_violation THEN
    IF SQLERRM='ACCOUNTING_RULE_MAPPING_INVALID' THEN
      RETURN QUERY SELECT 'mapping_invalid'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
END;
$save_rule$;

REVOKE ALL ON FUNCTION public.save_accounting_posting_rule(uuid,uuid,integer,jsonb,text,text,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_accounting_posting_rule(uuid,uuid,integer,jsonb,text,text,uuid)
  TO service_role;

COMMIT;
