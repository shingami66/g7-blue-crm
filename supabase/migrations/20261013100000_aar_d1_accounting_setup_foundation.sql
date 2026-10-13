-- AAR-D1 adds a guarded accounting-profile bootstrap and root-authority lifecycle.
-- It does not create accounting configuration, activate tax, or change existing grants.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL
    OR to_regclass('public.accounting_profile_versions') IS NULL
    OR to_regclass('public.accounting_capability_catalog') IS NULL
    OR to_regclass('public.accounting_capability_events') IS NULL
    OR to_regclass('public.accounting_foundation_events') IS NULL
    OR to_regclass('public.audit_logs') IS NULL
    OR to_regclass('public.company_settings') IS NULL
    OR to_regclass('public.app_users') IS NULL
    OR to_regprocedure('public.get_accounting_capability(uuid,text)') IS NULL
    OR to_regprocedure('public.get_accounting_profile(uuid)') IS NULL THEN
    RAISE EXCEPTION 'aar_d1 preflight: required accounting setup relation or RPC is missing';
  END IF;
  IF to_regprocedure('public.aar_d1_effective_roots(uuid)') IS NOT NULL
    OR to_regprocedure('public.aar_d1_record_capability_event(uuid,uuid,uuid,text,text,text,text,uuid,text,text)') IS NOT NULL
    OR to_regprocedure('public.get_accounting_setup_status(uuid)') IS NOT NULL
    OR to_regprocedure('public.bootstrap_accounting_foundation(uuid,uuid,text,text,uuid)') IS NOT NULL
    OR to_regprocedure('public.transfer_accounting_root_authority(uuid,uuid,text,text,uuid)') IS NOT NULL
    OR to_regprocedure('public.recover_accounting_root_authority(uuid,uuid,text,text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'aar_d1 preflight: target function signature already exists';
  END IF;
END;
$preflight$;

CREATE FUNCTION public.aar_d1_effective_roots(p_profile_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path=pg_catalog,public
AS $roots$
  WITH latest AS (
    SELECT DISTINCT ON (e.target_user_id)
      e.target_user_id,e.effect,e.expires_at
    FROM public.accounting_capability_events e
    JOIN public.accounting_capability_catalog c
      ON c.capability=e.capability
      AND c.enabled
      AND NOT c.runtime_allow_grantable
      AND c.owner_slice='W10A1'
    WHERE e.profile_id=p_profile_id
      AND e.capability='accounting:manage_authority'
    ORDER BY e.target_user_id,e.revision DESC
  )
  SELECT u.id
  FROM latest e
  JOIN public.app_users u ON u.id=e.target_user_id
  WHERE u.is_active IS TRUE
    AND e.effect='ALLOW'
    AND (e.expires_at IS NULL OR e.expires_at>transaction_timestamp())
$roots$;

CREATE FUNCTION public.aar_d1_record_capability_event(
  p_profile_id uuid,
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_capability text,
  p_effect text,
  p_reason text,
  p_evidence_ref text,
  p_request_id uuid,
  p_payload_fingerprint text,
  p_operation text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path=pg_catalog,public,extensions
AS $record_capability$
DECLARE
  v_event_id uuid:=gen_random_uuid();
  v_foundation_id uuid;
  v_revision integer;
  v_now timestamptz:=transaction_timestamp();
  v_catalog public.accounting_capability_catalog%ROWTYPE;
BEGIN
  IF p_capability NOT IN ('accounting:view','accounting:manage_profile','accounting:manage_authority')
    OR p_effect NOT IN ('ALLOW','REVOKE')
    OR p_operation NOT IN ('bootstrap','root_succession','root_recovery')
    OR p_request_id IS NULL
    OR p_payload_fingerprint !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='AAR_D1_INVALID_CAPABILITY_EVENT';
  END IF;

  SELECT * INTO v_catalog
  FROM public.accounting_capability_catalog c
  WHERE c.capability=p_capability
    AND c.enabled IS TRUE
    AND c.owner_slice='W10A1'
    AND ((p_capability='accounting:manage_authority' AND c.runtime_allow_grantable IS FALSE)
      OR (p_capability IN ('accounting:view','accounting:manage_profile') AND c.runtime_allow_grantable IS TRUE))
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='XX001',MESSAGE='AAR_D1_CAPABILITY_CATALOG_INVALID';
  END IF;

  SELECT COALESCE(max(e.revision),0)+1 INTO v_revision
  FROM public.accounting_capability_events e
  WHERE e.profile_id=p_profile_id
    AND e.target_user_id=p_target_user_id
    AND e.capability=p_capability;

  INSERT INTO public.accounting_foundation_events(
    profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
    reason,evidence_ref,payload_fingerprint,result_reference
  ) VALUES (
    p_profile_id,'accounting_capability_changed','capability_assignment',v_event_id,v_revision,
    p_actor_user_id,p_request_id,btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),
    p_payload_fingerprint,p_capability
  ) RETURNING id INTO v_foundation_id;

  INSERT INTO public.accounting_capability_events(
    id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,
    reason,evidence_ref,request_id,payload_fingerprint,foundation_event_id,created_at
  ) VALUES (
    v_event_id,p_profile_id,p_target_user_id,p_capability,v_revision,p_effect,NULL,
    p_actor_user_id,btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),p_request_id,
    p_payload_fingerprint,v_foundation_id,v_now
  );

  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES (
    'create','accounting_capability_event',v_event_id,p_actor_user_id::text,
    jsonb_build_object(
      'event_type','accounting_capability_changed',
      'operation',p_operation,
      'profile_id',p_profile_id,
      'target_user_id',p_target_user_id,
      'capability',p_capability,
      'effect',p_effect,
      'revision',v_revision,
      'request_id',p_request_id
    ),v_now
  );

  RETURN v_event_id;
END;
$record_capability$;

CREATE FUNCTION public.get_accounting_setup_status(p_actor_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $setup_status$
DECLARE
  v_actor public.app_users%ROWTYPE;
  v_profile_id uuid;
  v_root_count integer;
  v_root_user_id uuid;
  v_can_view boolean;
  v_can_manage_profile boolean;
  v_can_manage_authority boolean;
BEGIN
  SELECT * INTO v_actor
  FROM public.app_users u
  WHERE u.id=p_actor_user_id AND u.is_active IS TRUE
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_ACTOR_INACTIVE_OR_MISSING';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.accounting_profiles p
  WHERE p.singleton_key='g7';
  IF NOT FOUND THEN
    IF v_actor.role='admin' THEN
      RETURN jsonb_build_object('state','NOT_INITIALIZED','can_bootstrap',true);
    END IF;
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_CAPABILITY_DENIED';
  END IF;

  SELECT count(*)::integer,(array_agg(r.user_id))[1] INTO v_root_count,v_root_user_id
  FROM public.aar_d1_effective_roots(v_profile_id) r;
  IF v_root_count=0 AND v_actor.role='admin' THEN
    RETURN jsonb_build_object('state','RECOVERY_REQUIRED','can_recover',true);
  END IF;
  IF v_root_count>1 THEN
    RAISE EXCEPTION USING ERRCODE='XX001',MESSAGE='AAR_D1_MULTIPLE_EFFECTIVE_ROOTS';
  END IF;

  v_can_view:=public.get_accounting_capability(p_actor_user_id,'accounting:view');
  v_can_manage_profile:=public.get_accounting_capability(p_actor_user_id,'accounting:manage_profile');
  v_can_manage_authority:=public.get_accounting_capability(p_actor_user_id,'accounting:manage_authority');
  IF NOT v_can_view AND NOT v_can_manage_profile THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_CAPABILITY_DENIED';
  END IF;

  RETURN jsonb_build_object(
    'state','INITIALIZED',
    'profile',public.get_accounting_profile(p_actor_user_id),
    'can_manage_profile',v_can_manage_profile,
    'can_manage_authority',v_can_manage_authority,
    'setup_progress',jsonb_build_object(
      'chart_of_accounts_started',EXISTS(
        SELECT 1 FROM public.accounting_accounts a WHERE a.profile_id=v_profile_id
      ),
      'accounting_periods_started',EXISTS(
        SELECT 1 FROM public.accounting_periods p WHERE p.profile_id=v_profile_id
      ),
      'posting_rules_started',EXISTS(
        SELECT 1 FROM public.accounting_posting_rules r WHERE r.profile_id=v_profile_id
      ),
      'inception_reconstruction_started',EXISTS(
        SELECT 1 FROM public.accounting_inception_packages i WHERE i.profile_id=v_profile_id
      )
    )
  );
END;
$setup_status$;

CREATE FUNCTION public.bootstrap_accounting_foundation(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_reason text,
  p_evidence_ref text,
  p_request_id uuid
)
RETURNS TABLE(error_code text,profile_id uuid,version integer,idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,extensions
AS $bootstrap$
DECLARE
  v_actor public.app_users%ROWTYPE;
  v_target public.app_users%ROWTYPE;
  v_company_settings_id uuid;
  v_company_currency text;
  v_company_vat_mode text;
  v_profile_id uuid;
  v_foundation_id uuid;
  v_prior public.accounting_foundation_events%ROWTYPE;
  v_fingerprint text;
  v_now timestamptz:=transaction_timestamp();
  v_catalog_count integer;
  v_locked_users integer;
  v_expected_users integer;
  v_table record;
  v_has_rows boolean;
BEGIN
  IF p_actor_user_id IS NULL OR p_target_user_id IS NULL OR p_request_id IS NULL
    OR NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason))>2000
    OR (p_evidence_ref IS NOT NULL AND
      (NULLIF(btrim(p_evidence_ref),'') IS NULL OR length(btrim(p_evidence_ref))>2000)) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  PERFORM u.id FROM public.app_users u
  WHERE u.id IN (p_actor_user_id,p_target_user_id)
  ORDER BY u.id FOR SHARE;
  GET DIAGNOSTICS v_locked_users=ROW_COUNT;
  v_expected_users:=CASE WHEN p_actor_user_id=p_target_user_id THEN 1 ELSE 2 END;
  IF v_locked_users<>v_expected_users THEN
    IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id) THEN
      RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    RETURN QUERY SELECT 'user_not_found'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  SELECT * INTO v_actor FROM public.app_users u WHERE u.id=p_actor_user_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF v_actor.is_active IS DISTINCT FROM true THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF v_actor.role IS DISTINCT FROM 'admin' THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  SELECT * INTO v_target FROM public.app_users u WHERE u.id=p_target_user_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'user_not_found'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF v_target.is_active IS DISTINCT FROM true THEN
    RETURN QUERY SELECT 'user_not_found'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('aar-d1-bootstrap:g7',0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('aar-d1-root-authority:g7',0)
  );

  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'operation','bootstrap',
    'target_user_id',p_target_user_id,
    'reason',btrim(p_reason),
    'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');

  SELECT * INTO v_prior FROM public.accounting_foundation_events e
  WHERE e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id
  ORDER BY e.occurred_at DESC LIMIT 1;
  IF FOUND THEN
    IF v_prior.event_type='accounting_profile_updated'
      AND v_prior.entity_type='accounting_profile'
      AND v_prior.payload_fingerprint=v_fingerprint
      AND EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE p.id=v_prior.entity_id) THEN
      RETURN QUERY SELECT NULL::text,v_prior.entity_id,v_prior.entity_version,true; RETURN;
    END IF;
    RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  IF EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE p.singleton_key='g7') THEN
    RETURN QUERY SELECT 'already_initialized'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  SELECT count(*)::integer INTO v_catalog_count
  FROM public.accounting_capability_catalog c
  WHERE c.capability IN ('accounting:view','accounting:manage_profile','accounting:manage_authority')
    AND c.enabled IS TRUE AND c.owner_slice='W10A1'
    AND ((c.capability='accounting:manage_authority' AND c.runtime_allow_grantable IS FALSE)
      OR (c.capability IN ('accounting:view','accounting:manage_profile') AND c.runtime_allow_grantable IS TRUE));
  IF v_catalog_count<>3 THEN
    RETURN QUERY SELECT 'capability_catalog_invalid'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  SELECT cs.id,cs.currency,cs.vat_mode
  INTO v_company_settings_id,v_company_currency,v_company_vat_mode
  FROM public.company_settings cs
  WHERE cs.setting_key='default'
  FOR SHARE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'company_settings_unavailable'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF v_company_currency IS DISTINCT FROM 'SAR'
    OR v_company_vat_mode IS DISTINCT FROM 'not_registered' THEN
    RETURN QUERY SELECT 'company_settings_mismatch'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  -- An empty catalog is expected; any other existing accounting rows make bootstrap ambiguous.
  FOR v_table IN
    SELECT c.relname
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND c.relkind IN ('r','p')
      AND left(c.relname,11)='accounting_'
      AND c.relname<>'accounting_capability_catalog'
  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I LIMIT 1)',v_table.relname)
      INTO v_has_rows;
    IF v_has_rows THEN
      RETURN QUERY SELECT 'preexisting_accounting_state'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
  END LOOP;

  INSERT INTO public.accounting_profiles(singleton_key,company_settings_id,current_version)
  VALUES ('g7',v_company_settings_id,1)
  RETURNING id INTO v_profile_id;

  INSERT INTO public.accounting_foundation_events(
    profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
    reason,evidence_ref,payload_fingerprint,result_reference
  ) VALUES (
    v_profile_id,'accounting_profile_updated','accounting_profile',v_profile_id,1,
    p_actor_user_id,p_request_id,btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),
    v_fingerprint,'accounting_profiles/'||v_profile_id::text||'/1'
  ) RETURNING id INTO v_foundation_id;

  INSERT INTO public.accounting_profile_versions(
    profile_id,version,previous_version,framework_key,framework_edition,policy_version,
    endorsement_context,professional_validation_state,professional_validation_evidence_ref,
    functional_currency,fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,
    fiscal_timezone,accounting_start_date,cutover_boundary_date,legal_fiscal_evidence_pending,
    legal_fiscal_evidence_ref,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
    reason,evidence_ref,created_by,created_at,foundation_event_id
  ) VALUES (
    v_profile_id,1,NULL,'SA_IFRS_FOR_SMES',2025,'W10 provisional policy',
    'Controller approved provisional baseline','DEFERRED',NULL,'SAR',1,1,12,31,
    'Asia/Riyadh',NULL,NULL,true,NULL,'not_registered','INACTIVE','INACTIVE','INACTIVE',v_now,
    btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),p_actor_user_id,v_now,v_foundation_id
  );

  PERFORM public.aar_d1_record_capability_event(
    v_profile_id,p_actor_user_id,p_target_user_id,'accounting:view','ALLOW',btrim(p_reason),
    NULLIF(btrim(p_evidence_ref),''),gen_random_uuid(),v_fingerprint,'bootstrap'
  );
  PERFORM public.aar_d1_record_capability_event(
    v_profile_id,p_actor_user_id,p_target_user_id,'accounting:manage_profile','ALLOW',btrim(p_reason),
    NULLIF(btrim(p_evidence_ref),''),gen_random_uuid(),v_fingerprint,'bootstrap'
  );
  PERFORM public.aar_d1_record_capability_event(
    v_profile_id,p_actor_user_id,p_target_user_id,'accounting:manage_authority','ALLOW',btrim(p_reason),
    NULLIF(btrim(p_evidence_ref),''),gen_random_uuid(),v_fingerprint,'bootstrap'
  );

  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES (
    'create','accounting_profile',v_profile_id,p_actor_user_id::text,
    jsonb_build_object(
      'event_type','accounting_profile_updated',
      'operation','bootstrap',
      'version',1,
      'initial_authority_user_id',p_target_user_id,
      'request_id',p_request_id,
      'activation_state','INACTIVE',
      'vat_mode','not_registered',
      'zatca_state','INACTIVE',
      'fatoora_state','INACTIVE'
    ),v_now
  );

  RETURN QUERY SELECT NULL::text,v_profile_id,1,false;
END;
$bootstrap$;

CREATE FUNCTION public.transfer_accounting_root_authority(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_reason text,
  p_evidence_ref text,
  p_request_id uuid
)
RETURNS TABLE(error_code text,profile_id uuid,authority_event_id uuid,idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,extensions
AS $transfer_root$
DECLARE
  v_actor public.app_users%ROWTYPE;
  v_target public.app_users%ROWTYPE;
  v_profile_id uuid;
  v_prior public.accounting_foundation_events%ROWTYPE;
  v_prior_capability public.accounting_capability_events%ROWTYPE;
  v_fingerprint text;
  v_root_count integer;
  v_root_user_id uuid;
  v_primary_event_id uuid;
  v_locked_users integer;
  v_lock bigint;
BEGIN
  IF p_actor_user_id IS NULL OR p_target_user_id IS NULL OR p_actor_user_id=p_target_user_id
    OR p_request_id IS NULL OR NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason))>2000
    OR (p_evidence_ref IS NOT NULL AND
      (NULLIF(btrim(p_evidence_ref),'') IS NULL OR length(btrim(p_evidence_ref))>2000)) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;

  PERFORM u.id FROM public.app_users u
  WHERE u.id IN (p_actor_user_id,p_target_user_id)
  ORDER BY u.id FOR SHARE;
  GET DIAGNOSTICS v_locked_users=ROW_COUNT;
  IF v_locked_users<>2 THEN
    IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id) THEN
      RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::uuid,false; RETURN;
    END IF;
    RETURN QUERY SELECT 'user_not_found'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;
  SELECT * INTO v_actor FROM public.app_users u WHERE u.id=p_actor_user_id;
  IF NOT FOUND OR v_actor.is_active IS DISTINCT FROM true THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;
  SELECT * INTO v_target FROM public.app_users u WHERE u.id=p_target_user_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'user_not_found'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;
  IF v_target.is_active IS DISTINCT FROM true THEN
    RETURN QUERY SELECT 'user_not_found'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('aar-d1-root-authority:g7',0)
  );
  FOR v_lock IN
    SELECT DISTINCT lock_id
    FROM unnest(ARRAY[
      pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_actor_user_id::text||':accounting:manage_authority',0),
      pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_target_user_id::text||':accounting:manage_authority',0),
      pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_target_user_id::text||':accounting:view',0),
      pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_target_user_id::text||':accounting:manage_profile',0),
      pg_catalog.hashtextextended('w10a1-request:'||v_profile_id::text||':'||p_actor_user_id::text||':'||p_request_id::text,0)
    ]) AS lock_ids(lock_id)
    ORDER BY lock_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock);
  END LOOP;
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'operation','root_succession','target_user_id',p_target_user_id,
    'reason',btrim(p_reason),'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');

  SELECT * INTO v_prior FROM public.accounting_foundation_events e
  WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id
  LIMIT 1;
  IF FOUND THEN
    SELECT * INTO v_prior_capability FROM public.accounting_capability_events c
    WHERE c.foundation_event_id=v_prior.id;
    IF v_prior.event_type='accounting_capability_changed'
      AND v_prior_capability.capability='accounting:manage_authority'
      AND v_prior_capability.effect='ALLOW'
      AND v_prior_capability.target_user_id=p_target_user_id
      AND v_prior.payload_fingerprint=v_fingerprint THEN
      RETURN QUERY SELECT NULL::text,v_profile_id,v_prior.entity_id,true; RETURN;
    END IF;
    RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;

  SELECT count(*)::integer,(array_agg(r.user_id))[1] INTO v_root_count,v_root_user_id
  FROM public.aar_d1_effective_roots(v_profile_id) r;
  IF v_root_count=0 THEN
    RETURN QUERY SELECT 'authority_unavailable'::text,NULL::uuid,NULL::uuid,false; RETURN;
  ELSIF v_root_count<>1 OR v_root_user_id IS DISTINCT FROM p_actor_user_id THEN
    RETURN QUERY SELECT 'authority_conflict'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;

  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_authority') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;

  PERFORM public.aar_d1_record_capability_event(
    v_profile_id,p_actor_user_id,p_target_user_id,'accounting:manage_authority','ALLOW',
    btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),p_request_id,v_fingerprint,'root_succession'
  );
  SELECT e.id INTO v_primary_event_id
  FROM public.accounting_capability_events e
  WHERE e.profile_id=v_profile_id AND e.target_user_id=p_target_user_id
    AND e.capability='accounting:manage_authority' AND e.request_id=p_request_id;

  IF NOT public.get_accounting_capability(p_target_user_id,'accounting:view') THEN
    PERFORM public.aar_d1_record_capability_event(
      v_profile_id,p_actor_user_id,p_target_user_id,'accounting:view','ALLOW',
      btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),gen_random_uuid(),v_fingerprint,'root_succession'
    );
  END IF;
  IF NOT public.get_accounting_capability(p_target_user_id,'accounting:manage_profile') THEN
    PERFORM public.aar_d1_record_capability_event(
      v_profile_id,p_actor_user_id,p_target_user_id,'accounting:manage_profile','ALLOW',
      btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),gen_random_uuid(),v_fingerprint,'root_succession'
    );
  END IF;

  PERFORM public.aar_d1_record_capability_event(
    v_profile_id,p_actor_user_id,p_actor_user_id,'accounting:manage_authority','REVOKE',
    btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),gen_random_uuid(),v_fingerprint,'root_succession'
  );

  SELECT count(*)::integer,(array_agg(r.user_id))[1] INTO v_root_count,v_root_user_id
  FROM public.aar_d1_effective_roots(v_profile_id) r;
  IF v_root_count<>1 OR v_root_user_id IS DISTINCT FROM p_target_user_id THEN
    RAISE EXCEPTION USING ERRCODE='XX001',MESSAGE='AAR_D1_ROOT_SUCCESSION_POSTCONDITION_FAILED';
  END IF;

  RETURN QUERY SELECT NULL::text,v_profile_id,v_primary_event_id,false;
END;
$transfer_root$;

CREATE FUNCTION public.recover_accounting_root_authority(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_reason text,
  p_evidence_ref text,
  p_request_id uuid
)
RETURNS TABLE(error_code text,profile_id uuid,authority_event_id uuid,idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,extensions
AS $recover_root$
DECLARE
  v_actor public.app_users%ROWTYPE;
  v_target public.app_users%ROWTYPE;
  v_profile_id uuid;
  v_prior public.accounting_foundation_events%ROWTYPE;
  v_prior_capability public.accounting_capability_events%ROWTYPE;
  v_fingerprint text;
  v_root_count integer;
  v_root_user_id uuid;
  v_primary_event_id uuid;
  v_locked_users integer;
  v_expected_users integer;
  v_lock bigint;
BEGIN
  IF p_actor_user_id IS NULL OR p_target_user_id IS NULL OR p_request_id IS NULL
    OR NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason))>2000
    OR (p_evidence_ref IS NOT NULL AND
      (NULLIF(btrim(p_evidence_ref),'') IS NULL OR length(btrim(p_evidence_ref))>2000)) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;

  PERFORM u.id FROM public.app_users u
  WHERE u.id IN (p_actor_user_id,p_target_user_id)
  ORDER BY u.id FOR SHARE;
  GET DIAGNOSTICS v_locked_users=ROW_COUNT;
  v_expected_users:=CASE WHEN p_actor_user_id=p_target_user_id THEN 1 ELSE 2 END;
  IF v_locked_users<>v_expected_users THEN
    IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id) THEN
      RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::uuid,false; RETURN;
    END IF;
    RETURN QUERY SELECT 'user_not_found'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;
  SELECT * INTO v_actor FROM public.app_users u WHERE u.id=p_actor_user_id;
  IF NOT FOUND OR v_actor.is_active IS DISTINCT FROM true THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;
  IF v_actor.role IS DISTINCT FROM 'admin' THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;
  SELECT * INTO v_target FROM public.app_users u WHERE u.id=p_target_user_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'user_not_found'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;
  IF v_target.is_active IS DISTINCT FROM true THEN
    RETURN QUERY SELECT 'user_not_found'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('aar-d1-root-authority:g7',0)
  );
  FOR v_lock IN
    SELECT DISTINCT lock_id
    FROM unnest(ARRAY[
      pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_actor_user_id::text||':accounting:manage_authority',0),
      pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_target_user_id::text||':accounting:manage_authority',0),
      pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_target_user_id::text||':accounting:view',0),
      pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_target_user_id::text||':accounting:manage_profile',0),
      pg_catalog.hashtextextended('w10a1-request:'||v_profile_id::text||':'||p_actor_user_id::text||':'||p_request_id::text,0)
    ]) AS lock_ids(lock_id)
    ORDER BY lock_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock);
  END LOOP;
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'operation','root_recovery','target_user_id',p_target_user_id,
    'reason',btrim(p_reason),'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');

  SELECT * INTO v_prior FROM public.accounting_foundation_events e
  WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id
  LIMIT 1;
  IF FOUND THEN
    SELECT * INTO v_prior_capability FROM public.accounting_capability_events c
    WHERE c.foundation_event_id=v_prior.id;
    IF v_prior.event_type='accounting_capability_changed'
      AND v_prior_capability.capability='accounting:manage_authority'
      AND v_prior_capability.effect='ALLOW'
      AND v_prior_capability.target_user_id=p_target_user_id
      AND v_prior.payload_fingerprint=v_fingerprint THEN
      RETURN QUERY SELECT NULL::text,v_profile_id,v_prior.entity_id,true; RETURN;
    END IF;
    RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;

  SELECT count(*)::integer,(array_agg(r.user_id))[1] INTO v_root_count,v_root_user_id
  FROM public.aar_d1_effective_roots(v_profile_id) r;
  IF v_root_count<>0 THEN
    RETURN QUERY SELECT 'authority_conflict'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;

  SELECT count(*)::integer INTO v_root_count
  FROM public.accounting_capability_catalog c
  WHERE c.capability IN ('accounting:view','accounting:manage_profile','accounting:manage_authority')
    AND c.enabled IS TRUE AND c.owner_slice='W10A1'
    AND ((c.capability='accounting:manage_authority' AND c.runtime_allow_grantable IS FALSE)
      OR (c.capability IN ('accounting:view','accounting:manage_profile') AND c.runtime_allow_grantable IS TRUE));
  IF v_root_count<>3 THEN
    RETURN QUERY SELECT 'capability_catalog_invalid'::text,NULL::uuid,NULL::uuid,false; RETURN;
  END IF;

  IF NOT public.get_accounting_capability(p_target_user_id,'accounting:view') THEN
    PERFORM public.aar_d1_record_capability_event(
      v_profile_id,p_actor_user_id,p_target_user_id,'accounting:view','ALLOW',
      btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),gen_random_uuid(),v_fingerprint,'root_recovery'
    );
  END IF;
  IF NOT public.get_accounting_capability(p_target_user_id,'accounting:manage_profile') THEN
    PERFORM public.aar_d1_record_capability_event(
      v_profile_id,p_actor_user_id,p_target_user_id,'accounting:manage_profile','ALLOW',
      btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),gen_random_uuid(),v_fingerprint,'root_recovery'
    );
  END IF;
  v_primary_event_id:=public.aar_d1_record_capability_event(
    v_profile_id,p_actor_user_id,p_target_user_id,'accounting:manage_authority','ALLOW',
    btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),p_request_id,v_fingerprint,'root_recovery'
  );

  SELECT count(*)::integer,(array_agg(r.user_id))[1] INTO v_root_count,v_root_user_id
  FROM public.aar_d1_effective_roots(v_profile_id) r;
  IF v_root_count<>1 OR v_root_user_id IS DISTINCT FROM p_target_user_id THEN
    RAISE EXCEPTION USING ERRCODE='XX001',MESSAGE='AAR_D1_ROOT_RECOVERY_POSTCONDITION_FAILED';
  END IF;

  RETURN QUERY SELECT NULL::text,v_profile_id,v_primary_event_id,false;
END;
$recover_root$;

REVOKE ALL ON FUNCTION public.aar_d1_effective_roots(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.aar_d1_record_capability_event(uuid,uuid,uuid,text,text,text,text,uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_accounting_setup_status(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bootstrap_accounting_foundation(uuid,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.transfer_accounting_root_authority(uuid,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.recover_accounting_root_authority(uuid,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_setup_status(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_accounting_foundation(uuid,uuid,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.transfer_accounting_root_authority(uuid,uuid,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.recover_accounting_root_authority(uuid,uuid,text,text,uuid) TO service_role;

COMMIT;
