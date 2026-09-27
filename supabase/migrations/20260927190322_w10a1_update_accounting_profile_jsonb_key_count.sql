-- W10A1 runtime correction: count profile keys with jsonb_object_keys.
BEGIN;

CREATE OR REPLACE FUNCTION public.update_accounting_profile(
  p_actor_user_id uuid,p_expected_version integer,p_profile jsonb,p_reason text,p_evidence_ref text,p_request_id uuid
)
RETURNS TABLE(error_code text,profile_id uuid,version integer,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,extensions AS $update_profile$
DECLARE v_profile public.accounting_profiles%ROWTYPE; v_old public.accounting_profile_versions%ROWTYPE;
        v_company_currency text; v_company_vat_mode text; v_now timestamptz:=transaction_timestamp();
        v_fingerprint text; v_prior_event public.accounting_foundation_events%ROWTYPE;
        v_profile_id uuid; v_profile_lock bigint; v_request_lock bigint; v_lock bigint;
        v_foundation_id uuid; v_version integer; v_keys text[]:=ARRAY[
 'framework_key','framework_edition','policy_version','endorsement_context',
 'professional_validation_state','professional_validation_evidence_ref','functional_currency',
 'fiscal_start_month','fiscal_start_day','fiscal_end_month','fiscal_end_day','fiscal_timezone',
 'accounting_start_date','cutover_boundary_date','legal_fiscal_evidence_pending',
 'legal_fiscal_evidence_ref','vat_mode','zatca_state','fatoora_state','activation_state'
];
BEGIN
  IF p_actor_user_id IS NULL OR p_expected_version IS NULL OR p_expected_version<0
    OR p_request_id IS NULL OR p_profile IS NULL OR jsonb_typeof(p_profile)<>'object'
    OR NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason))>2000
    OR (p_evidence_ref IS NOT NULL AND (NULLIF(btrim(p_evidence_ref),'') IS NULL OR length(btrim(p_evidence_ref))>2000)) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_profile)) <> 20 OR NOT (p_profile ?& v_keys) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF jsonb_typeof(p_profile->'framework_key') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'framework_edition') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_profile->'policy_version') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'endorsement_context') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'professional_validation_state') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'professional_validation_evidence_ref') NOT IN ('string','null')
    OR jsonb_typeof(p_profile->'functional_currency') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'fiscal_start_month') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_profile->'fiscal_start_day') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_profile->'fiscal_end_month') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_profile->'fiscal_end_day') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_profile->'fiscal_timezone') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'accounting_start_date') NOT IN ('string','null')
    OR jsonb_typeof(p_profile->'cutover_boundary_date') NOT IN ('string','null')
    OR jsonb_typeof(p_profile->'legal_fiscal_evidence_pending') IS DISTINCT FROM 'boolean'
    OR jsonb_typeof(p_profile->'legal_fiscal_evidence_ref') NOT IN ('string','null')
    OR jsonb_typeof(p_profile->'vat_mode') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'zatca_state') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'fatoora_state') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'activation_state') IS DISTINCT FROM 'string' THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  PERFORM 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE FOR SHARE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  v_profile_lock:=pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_actor_user_id::text||':accounting:manage_profile',0);
  v_request_lock:=pg_catalog.hashtextextended('w10a1-request:'||v_profile_id::text||':'||p_actor_user_id::text||':'||p_request_id::text,0);
  FOR v_lock IN
    SELECT DISTINCT lock_id FROM unnest(ARRAY[v_profile_lock,v_request_lock]) AS locks(lock_id)
    ORDER BY lock_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock);
  END LOOP;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_profile') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  SELECT * INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7' FOR UPDATE;
  IF NOT FOUND OR v_profile.id IS DISTINCT FROM v_profile_id THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'expected_version',p_expected_version,'profile',p_profile,'reason',btrim(p_reason),
    'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');
  SELECT * INTO v_prior_event FROM public.accounting_foundation_events e
    WHERE e.profile_id=v_profile.id AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_prior_event.event_type='accounting_profile_updated' AND v_prior_event.payload_fingerprint=v_fingerprint THEN
      RETURN QUERY SELECT NULL::text,v_profile.id,v_prior_event.entity_version,true; RETURN;
    END IF;
    RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF v_profile.current_version<>p_expected_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,v_profile.id,v_profile.current_version,false; RETURN;
  END IF;
  SELECT * INTO v_old FROM public.accounting_profile_versions v
    WHERE v.profile_id=v_profile.id AND v.version=v_profile.current_version FOR SHARE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_version_unavailable'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  IF v_old.activation_state='DEV_PROVISIONAL' AND (
    p_profile->>'framework_key' IS DISTINCT FROM v_old.framework_key
    OR (p_profile->>'framework_edition')::integer IS DISTINCT FROM v_old.framework_edition
    OR p_profile->>'functional_currency' IS DISTINCT FROM v_old.functional_currency
    OR (p_profile->>'fiscal_start_month')::integer IS DISTINCT FROM v_old.fiscal_start_month
    OR (p_profile->>'fiscal_start_day')::integer IS DISTINCT FROM v_old.fiscal_start_day
    OR (p_profile->>'fiscal_end_month')::integer IS DISTINCT FROM v_old.fiscal_end_month
    OR (p_profile->>'fiscal_end_day')::integer IS DISTINCT FROM v_old.fiscal_end_day
    OR p_profile->>'fiscal_timezone' IS DISTINCT FROM v_old.fiscal_timezone
    OR (p_profile->>'accounting_start_date')::date IS DISTINCT FROM v_old.accounting_start_date
    OR (p_profile->>'cutover_boundary_date')::date IS DISTINCT FROM v_old.cutover_boundary_date
  ) THEN RETURN QUERY SELECT 'transition_required'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  IF p_profile->>'framework_key' IS DISTINCT FROM 'SA_IFRS_FOR_SMES'
    OR (p_profile->>'framework_edition')::integer IS DISTINCT FROM 2025
    OR p_profile->>'functional_currency' IS DISTINCT FROM 'SAR'
    OR (p_profile->>'fiscal_start_month')::integer IS DISTINCT FROM 1
    OR (p_profile->>'fiscal_start_day')::integer IS DISTINCT FROM 1
    OR (p_profile->>'fiscal_end_month')::integer IS DISTINCT FROM 12
    OR (p_profile->>'fiscal_end_day')::integer IS DISTINCT FROM 31
    OR p_profile->>'fiscal_timezone' IS DISTINCT FROM 'Asia/Riyadh'
    OR p_profile->>'professional_validation_state' IS DISTINCT FROM 'DEFERRED'
    OR p_profile->>'vat_mode' IS DISTINCT FROM 'not_registered'
    OR p_profile->>'zatca_state' IS DISTINCT FROM 'INACTIVE'
    OR p_profile->>'fatoora_state' IS DISTINCT FROM 'INACTIVE'
    OR p_profile->>'activation_state' NOT IN ('INACTIVE','DEV_PROVISIONAL')
    OR p_profile->>'activation_state' IS NULL THEN
    RETURN QUERY SELECT 'unsupported_profile_value'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF (p_profile->>'activation_state')='DEV_PROVISIONAL' THEN
    IF NULLIF(p_profile->>'accounting_start_date','') IS NULL
      OR NULLIF(p_profile->>'cutover_boundary_date','') IS NULL
      OR (p_profile->>'accounting_start_date')::date>(p_profile->>'cutover_boundary_date')::date THEN
      RETURN QUERY SELECT 'profile_incomplete'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    SELECT cs.currency,cs.vat_mode INTO v_company_currency,v_company_vat_mode
      FROM public.company_settings cs WHERE cs.id=v_profile.company_settings_id
      AND cs.setting_key='default' FOR SHARE;
    IF NOT FOUND OR v_company_currency IS DISTINCT FROM 'SAR' OR v_company_vat_mode IS DISTINCT FROM 'not_registered' THEN
      RETURN QUERY SELECT 'company_settings_mismatch'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
  END IF;
  v_version:=v_profile.current_version+1;
  INSERT INTO public.accounting_foundation_events(
    profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
    reason,evidence_ref,payload_fingerprint,result_reference
  ) VALUES (
    v_profile.id,'accounting_profile_updated','accounting_profile',v_profile.id,v_version,
    p_actor_user_id,p_request_id,btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),
    v_fingerprint,'accounting_profiles/'||v_profile.id||'/'||v_version
  ) RETURNING id INTO v_foundation_id;
  INSERT INTO public.accounting_profile_versions(
    profile_id,version,previous_version,framework_key,framework_edition,policy_version,
    endorsement_context,professional_validation_state,professional_validation_evidence_ref,
    functional_currency,fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,
    fiscal_timezone,accounting_start_date,cutover_boundary_date,legal_fiscal_evidence_pending,
    legal_fiscal_evidence_ref,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
    reason,evidence_ref,created_by,created_at,foundation_event_id
  ) VALUES (
    v_profile.id,v_version,v_old.version,p_profile->>'framework_key',
    (p_profile->>'framework_edition')::integer,p_profile->>'policy_version',p_profile->>'endorsement_context',
    p_profile->>'professional_validation_state',NULLIF(p_profile->>'professional_validation_evidence_ref',''),
    p_profile->>'functional_currency',(p_profile->>'fiscal_start_month')::integer,
    (p_profile->>'fiscal_start_day')::integer,(p_profile->>'fiscal_end_month')::integer,
    (p_profile->>'fiscal_end_day')::integer,p_profile->>'fiscal_timezone',
    NULLIF(p_profile->>'accounting_start_date','')::date,NULLIF(p_profile->>'cutover_boundary_date','')::date,
    (p_profile->>'legal_fiscal_evidence_pending')::boolean,
    NULLIF(p_profile->>'legal_fiscal_evidence_ref',''),p_profile->>'vat_mode',p_profile->>'zatca_state',
    p_profile->>'fatoora_state',p_profile->>'activation_state',v_now,btrim(p_reason),
    NULLIF(btrim(p_evidence_ref),''),p_actor_user_id,v_now,v_foundation_id
  );
  UPDATE public.accounting_profiles SET current_version=v_version WHERE id=v_profile.id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES ('update','accounting_profile',v_profile.id,p_actor_user_id::text,
    jsonb_build_object('event_type','accounting_profile_updated','version',v_version,
      'request_id',p_request_id,'activation_state',p_profile->>'activation_state'),v_now);
  RETURN QUERY SELECT NULL::text,v_profile.id,v_version,false;
EXCEPTION
  WHEN invalid_text_representation OR datetime_field_overflow OR numeric_value_out_of_range THEN
    RETURN QUERY SELECT 'unsupported_profile_value'::text,NULL::uuid,NULL::integer,false;
    RETURN;
END;
$update_profile$;

COMMIT;
