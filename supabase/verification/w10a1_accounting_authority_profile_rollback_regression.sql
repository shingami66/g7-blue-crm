-- FUTURE CONTROLLER-AUTHORIZED DEV EXECUTION ONLY. Never run during W10A1 authoring.
-- All identities are synthetic and the complete exercise is rolled back.
BEGIN;

DO $preflight$
DECLARE v_settings_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id IN (
      '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
      '00000000-0000-4000-8000-00000000a103','00000000-0000-4000-8000-00000000a104'
    ) OR clerk_user_id LIKE 'w10a1-rollback-%'
  ) OR EXISTS (
    SELECT 1 FROM public.accounting_profiles
    WHERE id='00000000-0000-4000-8000-00000000a201' OR singleton_key='g7'
  ) THEN
    RAISE EXCEPTION 'W10A1 rollback fixture collision; inspect before running';
  END IF;

  SELECT id INTO v_settings_id FROM public.company_settings WHERE setting_key='default';
  IF NOT FOUND THEN RAISE EXCEPTION 'W10A1 rollback fixture requires current default company settings'; END IF;
END;
$preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
 ('00000000-0000-4000-8000-00000000a101','w10a1-rollback-authority','w10a1-authority@example.invalid','Synthetic Authority','viewer',true),
 ('00000000-0000-4000-8000-00000000a102','w10a1-rollback-profile-editor','w10a1-profile-editor@example.invalid','Synthetic Profile Editor','viewer',true),
 ('00000000-0000-4000-8000-00000000a103','w10a1-rollback-admin-no-grant','w10a1-admin@example.invalid','Synthetic Admin Without Grant','admin',true),
 ('00000000-0000-4000-8000-00000000a104','w10a1-rollback-expired-target','w10a1-expired@example.invalid','Synthetic Expired Grant Target','accountant',true);

INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT '00000000-0000-4000-8000-00000000a201','g7',cs.id,0
FROM public.company_settings cs WHERE cs.setting_key='default';

INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES (
  '00000000-0000-4000-8000-00000000a301','00000000-0000-4000-8000-00000000a201',
  'accounting_profile_updated','accounting_profile','00000000-0000-4000-8000-00000000a201',1,
  '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a401',
  'Synthetic rollback fixture initialization',NULL,repeat('0',64),'accounting_profiles/fixture/1',transaction_timestamp()
);

INSERT INTO public.accounting_profile_versions(
  profile_id,version,previous_version,framework_key,framework_edition,policy_version,
  endorsement_context,professional_validation_state,professional_validation_evidence_ref,
  functional_currency,fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,
  fiscal_timezone,accounting_start_date,cutover_boundary_date,legal_fiscal_evidence_pending,
  legal_fiscal_evidence_ref,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
  reason,evidence_ref,created_by,created_at,foundation_event_id
) VALUES (
  '00000000-0000-4000-8000-00000000a201',1,NULL,'SA_IFRS_FOR_SMES',2025,'W10 provisional policy',
  'Synthetic rollback fixture only','DEFERRED',NULL,'SAR',1,1,12,31,'Asia/Riyadh',NULL,NULL,true,
  NULL,'not_registered','INACTIVE','INACTIVE','INACTIVE',transaction_timestamp(),
  'Synthetic rollback fixture initialization',NULL,'00000000-0000-4000-8000-00000000a101',
  transaction_timestamp(),'00000000-0000-4000-8000-00000000a301'
);
UPDATE public.accounting_profiles SET current_version=1 WHERE id='00000000-0000-4000-8000-00000000a201';

-- Owner-only synthetic bootstrap, isolated inside this rollback transaction.
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES (
  '00000000-0000-4000-8000-00000000a303','00000000-0000-4000-8000-00000000a201',
  'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000a302',1,
  '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a402',
  'Synthetic authority bootstrap for rollback fixture',NULL,repeat('0',64),'accounting:manage_authority',transaction_timestamp()
);
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,
  reason,evidence_ref,request_id,payload_fingerprint,foundation_event_id,created_at
) VALUES (
  '00000000-0000-4000-8000-00000000a302','00000000-0000-4000-8000-00000000a201',
  '00000000-0000-4000-8000-00000000a101','accounting:manage_authority',1,'ALLOW',NULL,
  '00000000-0000-4000-8000-00000000a101','Synthetic authority bootstrap for rollback fixture',NULL,
  '00000000-0000-4000-8000-00000000a402',repeat('0',64),'00000000-0000-4000-8000-00000000a303',transaction_timestamp()
);

-- Latest expired ALLOW must override an older ALLOW without falling back.
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES
 ('00000000-0000-4000-8000-00000000a305','00000000-0000-4000-8000-00000000a201','accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000a304',1,'00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a403','Synthetic older allow',NULL,repeat('1',64),'accounting:view',transaction_timestamp()-interval '2 days'),
 ('00000000-0000-4000-8000-00000000a307','00000000-0000-4000-8000-00000000a201','accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000a306',2,'00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a404','Synthetic expired latest allow',NULL,repeat('2',64),'accounting:view',transaction_timestamp()-interval '2 days');
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,
  reason,evidence_ref,request_id,payload_fingerprint,foundation_event_id,created_at
) VALUES
 ('00000000-0000-4000-8000-00000000a304','00000000-0000-4000-8000-00000000a201','00000000-0000-4000-8000-00000000a104','accounting:view',1,'ALLOW',NULL,'00000000-0000-4000-8000-00000000a101','Synthetic older allow',NULL,'00000000-0000-4000-8000-00000000a403',repeat('1',64),'00000000-0000-4000-8000-00000000a305',transaction_timestamp()-interval '2 days'),
 ('00000000-0000-4000-8000-00000000a306','00000000-0000-4000-8000-00000000a201','00000000-0000-4000-8000-00000000a104','accounting:view',2,'ALLOW',transaction_timestamp()-interval '1 day','00000000-0000-4000-8000-00000000a101','Synthetic expired latest allow',NULL,'00000000-0000-4000-8000-00000000a404',repeat('2',64),'00000000-0000-4000-8000-00000000a307',transaction_timestamp()-interval '2 days');

SET LOCAL ROLE service_role;
DO $rpc_regression$
DECLARE v_result record; v_count integer; v_profile jsonb; v_settings_currency text; v_settings_vat text;
        v_profile_input jsonb;
BEGIN
  -- CRM Admin wildcard alone supplies no accounting capability.
  IF public.get_accounting_capability('00000000-0000-4000-8000-00000000a103','accounting:view') IS NOT FALSE THEN
    RAISE EXCEPTION 'CRM Admin wildcard leaked into accounting authority';
  END IF;

  -- Explicit manage_authority can grant manage_profile without holding it.
  IF public.get_accounting_capability('00000000-0000-4000-8000-00000000a101','accounting:manage_profile') IS NOT FALSE THEN
    RAISE EXCEPTION 'Fixture authority unexpectedly holds manage_profile';
  END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:manage_profile','ALLOW',NULL,0,'Synthetic delegation','fixture:profile-editor',
    '00000000-0000-4000-8000-00000000a411'
  );
  IF v_result.error_code IS NOT NULL OR v_result.revision<>1 THEN RAISE EXCEPTION 'manage_profile delegation failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:manage_profile','ALLOW',NULL,0,'Synthetic delegation','fixture:profile-editor',
    '00000000-0000-4000-8000-00000000a411'
  );
  IF v_result.error_code IS NOT NULL OR v_result.idempotent_replay IS NOT TRUE THEN RAISE EXCEPTION 'identical request retry was not idempotent'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:manage_profile','DENY',NULL,0,'Changed same request payload',NULL,
    '00000000-0000-4000-8000-00000000a411'
  );
  IF v_result.error_code IS DISTINCT FROM 'request_payload_conflict' THEN RAISE EXCEPTION 'changed request payload did not fail closed'; END IF;

  -- Explicit ALLOW, DENY, and REVOKE states are authoritative in order.
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:view','ALLOW',NULL,0,'Synthetic view grant',NULL,'00000000-0000-4000-8000-00000000a412'
  );
  IF v_result.error_code IS NOT NULL OR public.get_accounting_capability('00000000-0000-4000-8000-00000000a102','accounting:view') IS NOT TRUE THEN
    RAISE EXCEPTION 'explicit accounting view grant failed';
  END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:view','DENY',NULL,1,'Synthetic deny',NULL,'00000000-0000-4000-8000-00000000a413'
  );
  IF v_result.error_code IS NOT NULL OR public.get_accounting_capability('00000000-0000-4000-8000-00000000a102','accounting:view') IS NOT FALSE THEN
    RAISE EXCEPTION 'latest DENY did not override ALLOW';
  END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:view','REVOKE',NULL,2,'Synthetic revoke',NULL,'00000000-0000-4000-8000-00000000a414'
  );
  IF v_result.error_code IS NOT NULL OR public.get_accounting_capability('00000000-0000-4000-8000-00000000a102','accounting:view') IS NOT FALSE THEN
    RAISE EXCEPTION 'latest REVOKE did not remain denied';
  END IF;
  IF public.get_accounting_capability('00000000-0000-4000-8000-00000000a104','accounting:view') IS NOT FALSE THEN
    RAISE EXCEPTION 'expired latest ALLOW fell back to historical ALLOW';
  END IF;

  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:manage_authority','ALLOW',NULL,0,'Forbidden runtime bootstrap',NULL,'00000000-0000-4000-8000-00000000a415'
  );
  IF v_result.error_code IS DISTINCT FROM 'capability_not_grantable' THEN RAISE EXCEPTION 'runtime manage_authority ALLOW was accepted'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:manage_chart','ALLOW',NULL,0,'Disabled capability probe',NULL,'00000000-0000-4000-8000-00000000a416'
  );
  IF v_result.error_code IS DISTINCT FROM 'capability_disabled' THEN RAISE EXCEPTION 'disabled capability ALLOW was accepted'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:manage_chart','DENY',NULL,0,'Disabled capability DENY probe',NULL,'00000000-0000-4000-8000-00000000a422'
  );
  IF v_result.error_code IS DISTINCT FROM 'capability_disabled' THEN RAISE EXCEPTION 'disabled capability DENY was accepted'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:manage_chart','REVOKE',NULL,0,'Disabled capability REVOKE probe',NULL,'00000000-0000-4000-8000-00000000a423'
  );
  IF v_result.error_code IS DISTINCT FROM 'capability_disabled' THEN RAISE EXCEPTION 'disabled capability REVOKE was accepted'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102',
    'accounting:unknown','ALLOW',NULL,0,'Unknown capability probe',NULL,'00000000-0000-4000-8000-00000000a417'
  );
  IF v_result.error_code IS DISTINCT FROM 'unknown_capability' THEN RAISE EXCEPTION 'unknown capability was accepted'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a101',
    'accounting:view','ALLOW',NULL,0,'Self grant probe',NULL,'00000000-0000-4000-8000-00000000a418'
  );
  IF v_result.error_code IS DISTINCT FROM 'invalid_input' THEN RAISE EXCEPTION 'self assignment was accepted'; END IF;

  -- Profile stale revision, provisional activation, and structural freeze.
  v_profile_input:=jsonb_build_object(
    'framework_key','SA_IFRS_FOR_SMES','framework_edition',2025,'policy_version','W10 provisional policy',
    'endorsement_context','Synthetic rollback fixture only','professional_validation_state','DEFERRED',
    'professional_validation_evidence_ref',NULL,'functional_currency','SAR','fiscal_start_month',1,
    'fiscal_start_day',1,'fiscal_end_month',12,'fiscal_end_day',31,'fiscal_timezone','Asia/Riyadh',
    'accounting_start_date','2026-01-01','cutover_boundary_date','2026-12-31',
    'legal_fiscal_evidence_pending',true,'legal_fiscal_evidence_ref',NULL,'vat_mode','not_registered',
    'zatca_state','INACTIVE','fatoora_state','INACTIVE','activation_state','DEV_PROVISIONAL'
  );
  SELECT * INTO v_result FROM public.update_accounting_profile(
    '00000000-0000-4000-8000-00000000a102',0,v_profile_input,'Stale profile revision',NULL,
    '00000000-0000-4000-8000-00000000a419'
  );
  IF v_result.error_code IS DISTINCT FROM 'revision_conflict' THEN RAISE EXCEPTION 'stale profile revision was accepted'; END IF;

  SELECT cs.currency,cs.vat_mode INTO v_settings_currency,v_settings_vat
  FROM public.company_settings cs WHERE cs.setting_key='default';
  SELECT * INTO v_result FROM public.update_accounting_profile(
    '00000000-0000-4000-8000-00000000a102',1,v_profile_input,'Synthetic DEV provisional activation',NULL,
    '00000000-0000-4000-8000-00000000a420'
  );
  IF v_settings_currency='SAR' AND v_settings_vat='not_registered' THEN
    IF v_result.error_code IS NOT NULL OR v_result.version<>2 THEN RAISE EXCEPTION 'compatible DEV profile activation failed'; END IF;
    v_profile_input:=jsonb_set(v_profile_input,'{accounting_start_date}','"2026-01-02"'::jsonb);
    SELECT * INTO v_result FROM public.update_accounting_profile(
      '00000000-0000-4000-8000-00000000a102',2,v_profile_input,'Structural change after activation',NULL,
      '00000000-0000-4000-8000-00000000a421'
    );
    IF v_result.error_code IS DISTINCT FROM 'transition_required' THEN RAISE EXCEPTION 'provisional structural fields were not frozen'; END IF;
  ELSE
    IF v_result.error_code IS DISTINCT FROM 'company_settings_mismatch' THEN RAISE EXCEPTION 'operational settings mismatch did not block activation'; END IF;
  END IF;

  SELECT public.get_accounting_profile('00000000-0000-4000-8000-00000000a102') INTO v_profile;
  IF v_profile IS NULL THEN RAISE EXCEPTION 'accounting profile RPC returned no profile'; END IF;
  SELECT count(*) INTO v_count FROM public.list_accounting_capability_assignments(
    '00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102'
  );
  IF v_count<>2 THEN RAISE EXCEPTION 'assignment listing did not return latest state per capability'; END IF;

  -- The service role has RPC execution, never direct table read or write.
  BEGIN
    PERFORM 1 FROM public.accounting_profiles;
    RAISE EXCEPTION 'service_role unexpectedly read accounting_profiles directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
    SELECT '00000000-0000-4000-8000-00000000a222','g7',cs.id,0
    FROM public.company_settings cs WHERE cs.setting_key='default';
    RAISE EXCEPTION 'service_role unexpectedly wrote accounting_profiles directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$rpc_regression$;
RESET ROLE;

DO $audit_assertions$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.audit_logs
  WHERE entity_type='accounting_capability_event'
    AND details->>'request_id' IN (
      '00000000-0000-4000-8000-00000000a411','00000000-0000-4000-8000-00000000a412',
      '00000000-0000-4000-8000-00000000a413','00000000-0000-4000-8000-00000000a414'
    );
  IF v_count<>4 THEN RAISE EXCEPTION 'accounting capability audit mirror missing or duplicated'; END IF;

  SELECT count(*) INTO v_count FROM public.accounting_foundation_events
  WHERE request_id IN (
    '00000000-0000-4000-8000-00000000a416','00000000-0000-4000-8000-00000000a422',
    '00000000-0000-4000-8000-00000000a423'
  );
  IF v_count<>0 THEN RAISE EXCEPTION 'rejected disabled capability probes wrote foundation history'; END IF;

  SELECT count(*) INTO v_count FROM public.accounting_capability_events
  WHERE request_id IN (
    '00000000-0000-4000-8000-00000000a416','00000000-0000-4000-8000-00000000a422',
    '00000000-0000-4000-8000-00000000a423'
  );
  IF v_count<>0 THEN RAISE EXCEPTION 'rejected disabled capability probes wrote assignment history'; END IF;

  SELECT count(*) INTO v_count FROM public.audit_logs
  WHERE details->>'request_id' IN (
    '00000000-0000-4000-8000-00000000a416','00000000-0000-4000-8000-00000000a422',
    '00000000-0000-4000-8000-00000000a423'
  );
  IF v_count<>0 THEN RAISE EXCEPTION 'rejected disabled capability probes wrote audit history'; END IF;
END;
$audit_assertions$;

ROLLBACK;

-- Run after the rollback in the same session; no W10A1 fixture rows may remain.
DO $residue_assertion$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10a1-rollback-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000a201')
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events WHERE id BETWEEN '00000000-0000-4000-8000-00000000a301' AND '00000000-0000-4000-8000-00000000a307')
     OR EXISTS (SELECT 1 FROM public.accounting_capability_events WHERE id BETWEEN '00000000-0000-4000-8000-00000000a302' AND '00000000-0000-4000-8000-00000000a306')
     OR EXISTS (SELECT 1 FROM public.audit_logs WHERE user_id IN ('00000000-0000-4000-8000-00000000a101','00000000-0000-4000-8000-00000000a102') AND entity_type IN ('accounting_profile','accounting_capability_event')) THEN
    RAISE EXCEPTION 'W10A1 rollback fixture residue detected';
  END IF;
END;
$residue_assertion$;
