-- FUTURE CONTROLLER-AUTHORIZED DEV EXECUTION ONLY. Never run during W10A2a authoring.
-- Synthetic profile/chart/period evidence is enclosed in one rollback transaction.
BEGIN;

CREATE TEMP TABLE w10a2a_fixture_context ON COMMIT DROP AS
SELECT COALESCE(
  (SELECT id FROM public.accounting_profiles WHERE singleton_key='g7'),
  '00000000-0000-4000-8000-00000000a701'::uuid
) AS profile_id,
NOT EXISTS (SELECT 1 FROM public.accounting_profiles WHERE singleton_key='g7') AS create_profile;
GRANT SELECT ON w10a2a_fixture_context TO service_role;

DO $preflight$
DECLARE v_version integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE id BETWEEN
       '00000000-0000-4000-8000-00000000a710' AND '00000000-0000-4000-8000-00000000a712'
       OR clerk_user_id LIKE 'w10a2a-rollback-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000a701')
     OR EXISTS (SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10A2A-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_period_versions
       WHERE start_date<='2201-06-09' AND end_date>='2201-03-07')
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000a730'
         AND '00000000-0000-4000-8000-00000000a779') THEN
    RAISE EXCEPTION 'W10A2a rollback fixture collision; inspect before running';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company_settings WHERE setting_key='default') THEN
    RAISE EXCEPTION 'W10A2a rollback fixture requires default company settings';
  END IF;
  SELECT current_version INTO v_version FROM public.accounting_profiles WHERE singleton_key='g7';
  IF FOUND AND (v_version=0 OR NOT EXISTS (
    SELECT 1 FROM public.accounting_profile_versions v
    WHERE v.profile_id=(SELECT profile_id FROM pg_temp.w10a2a_fixture_context)
      AND v.version=v_version
  )) THEN
    RAISE EXCEPTION 'W10A2a rollback fixture requires an initialized existing profile';
  END IF;
END;
$preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
 ('00000000-0000-4000-8000-00000000a710','w10a2a-rollback-authority','w10a2a-authority@example.invalid','Synthetic Authority','viewer',true),
 ('00000000-0000-4000-8000-00000000a711','w10a2a-rollback-manager','w10a2a-manager@example.invalid','Synthetic Chart Period Manager','viewer',true),
 ('00000000-0000-4000-8000-00000000a712','w10a2a-rollback-admin','w10a2a-admin@example.invalid','Synthetic Admin Without Grant','admin',true);

INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT context.profile_id,'g7',settings.id,0
FROM pg_temp.w10a2a_fixture_context context
JOIN public.company_settings settings ON settings.setting_key='default'
WHERE context.create_profile;
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
)
SELECT '00000000-0000-4000-8000-00000000a730',context.profile_id,
  'accounting_profile_updated','accounting_profile',context.profile_id,1,
  '00000000-0000-4000-8000-00000000a710','00000000-0000-4000-8000-00000000a731',
  'Synthetic W10A2a profile',NULL,repeat('a',64),
  'accounting_profiles/'||context.profile_id||'/1',transaction_timestamp()
FROM pg_temp.w10a2a_fixture_context context WHERE context.create_profile;
INSERT INTO public.accounting_profile_versions(
  profile_id,version,previous_version,framework_key,framework_edition,policy_version,
  endorsement_context,professional_validation_state,professional_validation_evidence_ref,
  functional_currency,fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,
  fiscal_timezone,accounting_start_date,cutover_boundary_date,legal_fiscal_evidence_pending,
  legal_fiscal_evidence_ref,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
  reason,evidence_ref,created_by,created_at,foundation_event_id
)
SELECT context.profile_id,1,NULL,'SA_IFRS_FOR_SMES',2025,'W10 provisional policy',
  'Synthetic W10A2a rollback fixture','DEFERRED',NULL,'SAR',1,1,12,31,'Asia/Riyadh',
  NULL,NULL,true,NULL,'not_registered','INACTIVE','INACTIVE','INACTIVE',transaction_timestamp(),
  'Synthetic W10A2a profile',NULL,'00000000-0000-4000-8000-00000000a710',
  transaction_timestamp(),'00000000-0000-4000-8000-00000000a730'
FROM pg_temp.w10a2a_fixture_context context WHERE context.create_profile;
UPDATE public.accounting_profiles
SET current_version=1
WHERE id=(SELECT profile_id FROM pg_temp.w10a2a_fixture_context)
  AND EXISTS (SELECT 1 FROM pg_temp.w10a2a_fixture_context WHERE create_profile);

-- Owner-only bootstrap exists only in this transaction; the rest uses W10A1 RPC authority.
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
)
SELECT '00000000-0000-4000-8000-00000000a732',context.profile_id,
  'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000a734',1,
  '00000000-0000-4000-8000-00000000a710','00000000-0000-4000-8000-00000000a733',
  'Synthetic accounting authority bootstrap',NULL,repeat('b',64),
  'accounting:manage_authority',transaction_timestamp()
FROM pg_temp.w10a2a_fixture_context context;
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,
  reason,evidence_ref,request_id,payload_fingerprint,foundation_event_id,created_at
)
SELECT '00000000-0000-4000-8000-00000000a734',context.profile_id,
  '00000000-0000-4000-8000-00000000a710','accounting:manage_authority',1,'ALLOW',NULL,
  '00000000-0000-4000-8000-00000000a710','Synthetic authority bootstrap',NULL,
  '00000000-0000-4000-8000-00000000a733',repeat('b',64),
  '00000000-0000-4000-8000-00000000a732',transaction_timestamp()
FROM pg_temp.w10a2a_fixture_context context;

SET LOCAL ROLE service_role;
DO $rpc_regression$
DECLARE
  v_profile_id uuid; v_result record; v_account jsonb; v_period jsonb;
  v_root uuid; v_branch uuid; v_leaf uuid; v_control uuid; v_period_id uuid;
  v_count integer; v_current integer; v_name text;
BEGIN
  SELECT profile_id INTO v_profile_id FROM pg_temp.w10a2a_fixture_context;
  IF public.get_accounting_capability('00000000-0000-4000-8000-00000000a712','accounting:manage_chart') IS NOT FALSE
     OR public.get_accounting_capability('00000000-0000-4000-8000-00000000a712','accounting:manage_periods') IS NOT FALSE THEN
    RAISE EXCEPTION 'CRM Admin wildcard leaked into accounting authority';
  END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a710','00000000-0000-4000-8000-00000000a711',
    'accounting:manage_chart','ALLOW',NULL,0,'Synthetic chart grant',NULL,'00000000-0000-4000-8000-00000000a735');
  IF v_result.error_code IS NOT NULL OR v_result.revision<>1 THEN RAISE EXCEPTION 'chart grant failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a710','00000000-0000-4000-8000-00000000a711',
    'accounting:manage_periods','ALLOW',NULL,0,'Synthetic period grant',NULL,'00000000-0000-4000-8000-00000000a736');
  IF v_result.error_code IS NOT NULL OR v_result.revision<>1 THEN RAISE EXCEPTION 'period grant failed'; END IF;

  v_account:=jsonb_build_object('account_code','W10A2A-SYN-ROOT','name_en','Synthetic root',
    'name_ar','جذر اصطناعي','account_type','ASSET','category','synthetic',
    'normal_balance','DEBIT','account_kind','NON_POSTING','parent_account_id',NULL,
    'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000a711',NULL,0,v_account,'Synthetic root',NULL,
    '00000000-0000-4000-8000-00000000a741');
  IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN RAISE EXCEPTION 'root account creation failed'; END IF;
  v_root:=v_result.account_id;

  v_account:=jsonb_build_object('account_code','W10A2A-SYN-BRANCH','name_en','Synthetic branch',
    'name_ar','فرع اصطناعي','account_type','ASSET','category','synthetic',
    'normal_balance','DEBIT','account_kind','NON_POSTING','parent_account_id',v_root,
    'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000a711',NULL,0,v_account,'Synthetic branch',NULL,
    '00000000-0000-4000-8000-00000000a742');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'branch account creation failed'; END IF;
  v_branch:=v_result.account_id;

  v_account:=jsonb_build_object('account_code','W10A2A-SYN-LEAF','name_en','Synthetic leaf',
    'name_ar','ورقة اصطناعية','account_type','ASSET','category','synthetic',
    'normal_balance','DEBIT','account_kind','POSTING','parent_account_id',v_root,
    'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000a711',NULL,0,v_account,'Synthetic posting leaf',NULL,
    '00000000-0000-4000-8000-00000000a743');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'posting leaf creation failed'; END IF;
  v_leaf:=v_result.account_id;

  v_account:=jsonb_build_object('account_code','W10A2A-SYN-ROOT','name_en','Synthetic root',
    'name_ar','جذر اصطناعي','account_type','ASSET','category','synthetic',
    'normal_balance','DEBIT','account_kind','NON_POSTING','parent_account_id',v_branch,
    'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000a711',v_root,1,v_account,'Cycle probe',NULL,
    '00000000-0000-4000-8000-00000000a744');
  IF v_result.error_code IS DISTINCT FROM 'account_cycle' THEN RAISE EXCEPTION 'hierarchy cycle accepted'; END IF;
  v_account:=jsonb_build_object('account_code','W10A2A-SYN-BAD-PARENT','name_en','Bad parent',
    'name_ar','أب غير صالح','account_type','ASSET','category','synthetic',
    'normal_balance','DEBIT','account_kind','POSTING','parent_account_id',v_leaf,
    'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000a711',NULL,0,v_account,'Posting parent probe',NULL,
    '00000000-0000-4000-8000-00000000a745');
  IF v_result.error_code IS DISTINCT FROM 'parent_must_be_non_posting' THEN RAISE EXCEPTION 'posting parent accepted'; END IF;

  v_account:=jsonb_build_object('account_code','W10A2A-SYN-LEAF','name_en','Synthetic leaf v2',
    'name_ar','ورقة اصطناعية ٢','account_type','ASSET','category','synthetic',
    'normal_balance','DEBIT','account_kind','POSTING','parent_account_id',v_root,
    'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000a711',v_leaf,1,v_account,'Versioned leaf rename',NULL,
    '00000000-0000-4000-8000-00000000a746');
  IF v_result.error_code IS NOT NULL OR v_result.version<>2 THEN RAISE EXCEPTION 'account history revision failed'; END IF;
  SELECT count(*),count(*) FILTER (WHERE is_current) INTO v_count,v_current
    FROM public.list_accounting_accounts('00000000-0000-4000-8000-00000000a711');
  IF v_count<>4 OR v_current<>3 THEN RAISE EXCEPTION 'account versions were not retained'; END IF;
  SELECT name_en INTO v_name FROM public.list_accounting_accounts('00000000-0000-4000-8000-00000000a711')
    WHERE account_id=v_leaf AND version=1;
  IF v_name IS DISTINCT FROM 'Synthetic leaf' THEN RAISE EXCEPTION 'historical account name changed'; END IF;

  v_account:=jsonb_build_object('account_code','W10A2A-SYN-CONTROL','name_en','Synthetic control',
    'name_ar','حساب رقابي اصطناعي','account_type','ASSET','category','synthetic',
    'normal_balance','DEBIT','account_kind','POSTING','parent_account_id',NULL,
    'is_active',true,'is_protected',true,'control_classification','CASH_ACCOUNTABILITY');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000a711',NULL,0,v_account,'Synthetic control',NULL,
    '00000000-0000-4000-8000-00000000a747');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'protected account creation failed'; END IF;
  v_control:=v_result.account_id;
  v_account:=jsonb_build_object('account_code','W10A2A-SYN-CONTROL','name_en','Synthetic control',
    'name_ar','حساب رقابي اصطناعي','account_type','ASSET','category','synthetic',
    'normal_balance','DEBIT','account_kind','POSTING','parent_account_id',NULL,
    'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000a711',v_control,1,v_account,'Control protection probe',NULL,
    '00000000-0000-4000-8000-00000000a748');
  IF v_result.error_code IS DISTINCT FROM 'protected_account_invariant' THEN RAISE EXCEPTION 'control account protection weakened'; END IF;

  v_period:=jsonb_build_object('start_date','2201-03-07','end_date','2201-04-22','status','OPEN');
  SELECT * INTO v_result FROM public.save_accounting_period(
    '00000000-0000-4000-8000-00000000a711',NULL,0,v_period,'Arbitrary period one',NULL,
    '00000000-0000-4000-8000-00000000a751');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'arbitrary OPEN period one failed'; END IF;
  v_period_id:=v_result.period_id;
  v_period:=jsonb_build_object('start_date','2201-04-23','end_date','2201-06-09','status','OPEN');
  SELECT * INTO v_result FROM public.save_accounting_period(
    '00000000-0000-4000-8000-00000000a711',NULL,0,v_period,'Arbitrary adjacent period',NULL,
    '00000000-0000-4000-8000-00000000a752');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'adjacent OPEN period was rejected'; END IF;
  v_period:=jsonb_build_object('start_date','2201-04-22','end_date','2201-05-04','status','OPEN');
  SELECT * INTO v_result FROM public.save_accounting_period(
    '00000000-0000-4000-8000-00000000a711',NULL,0,v_period,'Overlap probe',NULL,
    '00000000-0000-4000-8000-00000000a753');
  IF v_result.error_code IS DISTINCT FROM 'period_overlap' THEN RAISE EXCEPTION 'overlapping period accepted'; END IF;
  v_period:=jsonb_build_object('start_date','2201-03-07','end_date','2201-04-21','status','OPEN');
  SELECT * INTO v_result FROM public.save_accounting_period(
    '00000000-0000-4000-8000-00000000a711',v_period_id,1,v_period,'Period boundary revision',NULL,
    '00000000-0000-4000-8000-00000000a754');
  IF v_result.error_code IS NOT NULL OR v_result.version<>2 THEN RAISE EXCEPTION 'period version history failed'; END IF;
  SELECT count(*) INTO v_count FROM public.list_accounting_periods('00000000-0000-4000-8000-00000000a711');
  IF v_count<>3 OR EXISTS (
    SELECT 1 FROM public.list_accounting_periods('00000000-0000-4000-8000-00000000a711') WHERE status<>'OPEN'
  ) THEN RAISE EXCEPTION 'period history or OPEN-only boundary failed'; END IF;

  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000a710','00000000-0000-4000-8000-00000000a711',
    'accounting:manage_chart','DENY',NULL,1,'Synthetic chart deny',NULL,
    '00000000-0000-4000-8000-00000000a771');
  IF v_result.error_code IS NOT NULL
     OR public.get_accounting_capability('00000000-0000-4000-8000-00000000a711','accounting:manage_chart') IS NOT FALSE THEN
    RAISE EXCEPTION 'latest chart DENY did not override prior ALLOW';
  END IF;
  v_account:=jsonb_build_object('account_code','W10A2A-SYN-DENIED','name_en','Denied',
    'name_ar','مرفوض','account_type','ASSET','category','synthetic','normal_balance','DEBIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,
    'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000a711',NULL,0,v_account,'Denied chart write',NULL,
    '00000000-0000-4000-8000-00000000a772');
  IF v_result.error_code IS DISTINCT FROM 'authority_denied' THEN RAISE EXCEPTION 'chart DENY was bypassed'; END IF;

  BEGIN
    PERFORM 1 FROM public.accounting_account_versions;
    RAISE EXCEPTION 'service_role unexpectedly read chart history directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.accounting_periods(profile_id,current_version) VALUES (v_profile_id,0);
    RAISE EXCEPTION 'service_role unexpectedly wrote periods directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$rpc_regression$;
RESET ROLE;

ROLLBACK;

-- Run after rollback in the same session; synthetic rows must be absent.
DO $residue_assertion$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10a2a-rollback-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000a701')
     OR EXISTS (SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10A2A-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_period_versions
       WHERE start_date<='2201-06-09' AND end_date>='2201-03-07')
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000a730'
         AND '00000000-0000-4000-8000-00000000a779')
     OR EXISTS (SELECT 1 FROM public.accounting_capability_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000a730'
         AND '00000000-0000-4000-8000-00000000a779')
     OR EXISTS (SELECT 1 FROM public.audit_logs
       WHERE details->>'request_id' BETWEEN '00000000-0000-4000-8000-00000000a730'
         AND '00000000-0000-4000-8000-00000000a779') THEN
    RAISE EXCEPTION 'W10A2a rollback fixture residue detected';
  END IF;
END;
$residue_assertion$;
