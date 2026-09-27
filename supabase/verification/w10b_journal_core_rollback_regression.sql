-- W10B synthetic DEV regression only. One transaction is fully rolled back.
BEGIN;

CREATE TEMP TABLE w10b_fixture_context ON COMMIT DROP AS
SELECT COALESCE(
  (SELECT id FROM public.accounting_profiles WHERE singleton_key='g7'),
  '00000000-0000-4000-8000-00000000b800'::uuid
) AS profile_id,
NOT EXISTS (SELECT 1 FROM public.accounting_profiles WHERE singleton_key='g7') AS create_profile;
GRANT SELECT ON w10b_fixture_context TO service_role;
CREATE TEMP TABLE w10b_fixture_periods(profile_id uuid NOT NULL,period_id uuid PRIMARY KEY);
GRANT SELECT,INSERT ON w10b_fixture_periods TO service_role;

CREATE FUNCTION pg_temp.w10b_fixture_mark_period_closed(
  p_profile_id uuid,p_period_id uuid,p_actor_id uuid,p_event_id uuid,p_request_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $fixture_close$
DECLARE v_period public.accounting_period_versions%ROWTYPE;
BEGIN
  IF p_profile_id IS DISTINCT FROM (SELECT profile_id FROM pg_temp.w10b_fixture_context)
     OR NOT EXISTS (SELECT 1 FROM pg_temp.w10b_fixture_periods
       WHERE profile_id=p_profile_id AND period_id=p_period_id) THEN
    RAISE EXCEPTION 'W10B fixture close helper target is outside the synthetic period';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10a2a-period:'||p_profile_id::text,0)
  );
  SELECT pv.* INTO v_period FROM public.accounting_periods p
  JOIN public.accounting_period_versions pv
    ON pv.profile_id=p.profile_id AND pv.period_id=p.id AND pv.version=p.current_version
  WHERE p.profile_id=p_profile_id AND p.id=p_period_id AND pv.status='OPEN' FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'W10B fixture period is not OPEN'; END IF;
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(p_event_id,p_profile_id,'accounting_period_updated','accounting_period',p_period_id,2,
    p_actor_id,p_request_id,'Synthetic close-state probe',NULL,repeat('c',64),
    'accounting_periods/'||p_period_id||'/2',clock_timestamp());
  INSERT INTO public.accounting_period_versions(
    profile_id,period_id,version,previous_version,start_date,end_date,status,effective_from,
    reason,evidence_ref,created_by,created_at,foundation_event_id
  ) VALUES(p_profile_id,p_period_id,2,v_period.version,v_period.start_date,v_period.end_date,
    'CLOSED',clock_timestamp(),'Synthetic close-state probe',NULL,p_actor_id,clock_timestamp(),p_event_id);
  UPDATE public.accounting_periods SET current_version=2
    WHERE profile_id=p_profile_id AND id=p_period_id;
END;
$fixture_close$;
GRANT EXECUTE ON FUNCTION pg_temp.w10b_fixture_mark_period_closed(uuid,uuid,uuid,uuid,uuid) TO service_role;

DO $preflight$
DECLARE v_profile_version integer; v_activation text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10b-rollback-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000b800')
     OR EXISTS (SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10B-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_posting_rules WHERE rule_code LIKE 'W10B_SYN_%')
     OR EXISTS (SELECT 1 FROM public.accounting_period_versions
       WHERE start_date<='2301-03-31' AND end_date>='2301-01-01')
     OR EXISTS (SELECT 1 FROM public.accounting_journal_versions
       WHERE accounting_date BETWEEN '2301-01-01' AND '2301-03-31')
     OR EXISTS (SELECT 1 FROM public.accounting_source_effects
       WHERE source_record_key LIKE 'W10B-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000b830'
         AND '00000000-0000-4000-8000-00000000b8ff')
     OR EXISTS (SELECT 1 FROM public.accounting_journal_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000b830'
         AND '00000000-0000-4000-8000-00000000b8ff') THEN
    RAISE EXCEPTION 'W10B rollback fixture collision; inspect before running';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company_settings WHERE setting_key='default') THEN
    RAISE EXCEPTION 'W10B rollback fixture requires default company settings';
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_profiles WHERE singleton_key='g7') THEN
    SELECT v.version,v.activation_state INTO v_profile_version,v_activation
    FROM public.accounting_profiles p
    JOIN public.accounting_profile_versions v
      ON v.profile_id=p.id AND v.version=p.current_version
    WHERE p.singleton_key='g7' AND p.current_version>0;
    IF NOT FOUND OR v_activation<>'DEV_PROVISIONAL' THEN
      RAISE EXCEPTION 'W10B rollback fixture requires a DEV_PROVISIONAL profile';
    END IF;
  END IF;
END;
$preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
 ('00000000-0000-4000-8000-00000000b810','w10b-rollback-authority','w10b-authority@example.invalid','Synthetic Accounting Authority','viewer',true),
 ('00000000-0000-4000-8000-00000000b811','w10b-rollback-operator','w10b-operator@example.invalid','Synthetic Journal Operator','viewer',true),
 ('00000000-0000-4000-8000-00000000b812','w10b-rollback-admin','w10b-admin@example.invalid','Synthetic CRM Admin','admin',true);

INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT context.profile_id,'g7',settings.id,0
FROM pg_temp.w10b_fixture_context context
JOIN public.company_settings settings ON settings.setting_key='default'
WHERE context.create_profile;

INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
)
SELECT '00000000-0000-4000-8000-00000000b830',context.profile_id,
  'accounting_profile_updated','accounting_profile',context.profile_id,1,
  '00000000-0000-4000-8000-00000000b810','00000000-0000-4000-8000-00000000b831',
  'Synthetic W10B profile',NULL,repeat('a',64),
  'accounting_profiles/'||context.profile_id||'/1',transaction_timestamp()
FROM pg_temp.w10b_fixture_context context WHERE context.create_profile;
INSERT INTO public.accounting_profile_versions(
  profile_id,version,previous_version,framework_key,framework_edition,policy_version,
  endorsement_context,professional_validation_state,professional_validation_evidence_ref,
  functional_currency,fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,
  fiscal_timezone,accounting_start_date,cutover_boundary_date,legal_fiscal_evidence_pending,
  legal_fiscal_evidence_ref,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
  reason,evidence_ref,created_by,created_at,foundation_event_id
)
SELECT context.profile_id,1,NULL,'SA_IFRS_FOR_SMES',2025,'W10 provisional policy',
  'Synthetic W10B rollback fixture','DEFERRED',NULL,'SAR',1,1,12,31,'Asia/Riyadh',
  '2201-01-01','2201-12-31',true,NULL,'not_registered','INACTIVE','INACTIVE','DEV_PROVISIONAL',
  transaction_timestamp(),'Synthetic W10B profile',NULL,
  '00000000-0000-4000-8000-00000000b810',transaction_timestamp(),
  '00000000-0000-4000-8000-00000000b830'
FROM pg_temp.w10b_fixture_context context WHERE context.create_profile;
UPDATE public.accounting_profiles SET current_version=1
WHERE id=(SELECT profile_id FROM pg_temp.w10b_fixture_context)
  AND EXISTS (SELECT 1 FROM pg_temp.w10b_fixture_context WHERE create_profile);

-- Bootstrap only the synthetic authority inside this rollback transaction.
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
)
SELECT '00000000-0000-4000-8000-00000000b832',context.profile_id,
  'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000b834',1,
  '00000000-0000-4000-8000-00000000b810','00000000-0000-4000-8000-00000000b833',
  'Synthetic W10B authority bootstrap',NULL,repeat('b',64),
  'accounting:manage_authority',transaction_timestamp()
FROM pg_temp.w10b_fixture_context context;
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,
  reason,evidence_ref,request_id,payload_fingerprint,foundation_event_id,created_at
)
SELECT '00000000-0000-4000-8000-00000000b834',context.profile_id,
  '00000000-0000-4000-8000-00000000b810','accounting:manage_authority',1,'ALLOW',NULL,
  '00000000-0000-4000-8000-00000000b810','Synthetic authority bootstrap',NULL,
  '00000000-0000-4000-8000-00000000b833',repeat('b',64),
  '00000000-0000-4000-8000-00000000b832',transaction_timestamp()
FROM pg_temp.w10b_fixture_context context;

SET LOCAL ROLE service_role;
DO $rpc_regression$
DECLARE
  v_profile_id uuid; v_result record; v_account jsonb; v_period jsonb;
  v_rule jsonb; v_journal jsonb; v_changed jsonb; v_lines jsonb;
  v_root uuid; v_debit uuid; v_credit uuid; v_control uuid;
  v_period_open uuid; v_period_next uuid; v_rule_id uuid;
  v_stale_account_id uuid; v_stale_rule_id uuid; v_closed_id uuid; v_posted_id uuid; v_reversal_id uuid;
  v_stale_account_version integer; v_rule_version integer;
  v_gl record; v_tb record; v_detail jsonb; v_reversal_detail jsonb; v_cutoff timestamptz;
  v_count integer; v_entry jsonb;
BEGIN
  SELECT profile_id INTO v_profile_id FROM pg_temp.w10b_fixture_context;
  IF public.get_accounting_capability('00000000-0000-4000-8000-00000000b812','accounting:manage_chart') IS NOT FALSE
     OR public.get_accounting_capability('00000000-0000-4000-8000-00000000b812','accounting:prepare_journal') IS NOT FALSE
     OR public.get_accounting_capability('00000000-0000-4000-8000-00000000b812','accounting:post_journal') IS NOT FALSE
     OR public.get_accounting_capability('00000000-0000-4000-8000-00000000b812','accounting:reverse_journal') IS NOT FALSE THEN
    RAISE EXCEPTION 'CRM Admin wildcard leaked into accounting authority';
  END IF;

  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000b810','00000000-0000-4000-8000-00000000b811',
    'accounting:manage_chart','ALLOW',NULL,0,'Synthetic chart grant',NULL,'00000000-0000-4000-8000-00000000b835');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'chart grant failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000b810','00000000-0000-4000-8000-00000000b811',
    'accounting:manage_periods','ALLOW',NULL,0,'Synthetic period grant',NULL,'00000000-0000-4000-8000-00000000b836');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'period grant failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000b810','00000000-0000-4000-8000-00000000b811',
    'accounting:view','ALLOW',NULL,0,'Synthetic view grant',NULL,'00000000-0000-4000-8000-00000000b837');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'view grant failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000b810','00000000-0000-4000-8000-00000000b811',
    'accounting:prepare_journal','ALLOW',NULL,0,'Synthetic prepare grant',NULL,'00000000-0000-4000-8000-00000000b838');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'prepare grant failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000b810','00000000-0000-4000-8000-00000000b811',
    'accounting:post_journal','ALLOW',NULL,0,'Synthetic post grant',NULL,'00000000-0000-4000-8000-00000000b839');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'post grant failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000b810','00000000-0000-4000-8000-00000000b811',
    'accounting:reverse_journal','ALLOW',NULL,0,'Synthetic reverse grant',NULL,'00000000-0000-4000-8000-00000000b83a');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'reverse grant failed'; END IF;

  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000b810','00000000-0000-4000-8000-00000000b812',
    'accounting:prepare_journal','ALLOW',NULL,0,'Synthetic Admin allow probe',NULL,'00000000-0000-4000-8000-00000000b83b');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'Admin probe allow failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000b810','00000000-0000-4000-8000-00000000b812',
    'accounting:prepare_journal','DENY',NULL,1,'Synthetic Admin deny probe',NULL,'00000000-0000-4000-8000-00000000b83c');
  IF v_result.error_code IS NOT NULL
     OR public.get_accounting_capability('00000000-0000-4000-8000-00000000b812','accounting:prepare_journal') IS NOT FALSE THEN
    RAISE EXCEPTION 'explicit accounting DENY did not override ALLOW';
  END IF;

  v_account:=jsonb_build_object('account_code','W10B-SYN-ROOT','name_en','Synthetic heading',
    'name_ar','رأس اصطناعي','account_type','ASSET','category','synthetic','normal_balance','DEBIT',
    'account_kind','NON_POSTING','parent_account_id',NULL,'is_active',true,
    'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_account,'Synthetic heading',NULL,'00000000-0000-4000-8000-00000000b841');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'heading account creation failed'; END IF;
  v_root:=v_result.account_id;
  v_account:=jsonb_build_object('account_code','W10B-SYN-DEBIT','name_en','Synthetic debit',
    'name_ar','مدين اصطناعي','account_type','ASSET','category','synthetic','normal_balance','DEBIT',
    'account_kind','POSTING','parent_account_id',v_root,'is_active',true,
    'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_account,'Synthetic debit account',NULL,'00000000-0000-4000-8000-00000000b842');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'debit account creation failed'; END IF;
  v_debit:=v_result.account_id;
  v_account:=jsonb_build_object('account_code','W10B-SYN-CREDIT','name_en','Synthetic credit',
    'name_ar','دائن اصطناعي','account_type','LIABILITY','category','synthetic','normal_balance','CREDIT',
    'account_kind','POSTING','parent_account_id',v_root,'is_active',true,
    'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_account,'Synthetic credit account',NULL,'00000000-0000-4000-8000-00000000b843');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'credit account creation failed'; END IF;
  v_credit:=v_result.account_id;
  v_account:=jsonb_build_object('account_code','W10B-SYN-CONTROL','name_en','Synthetic protected control',
    'name_ar','حساب رقابي اصطناعي','account_type','ASSET','category','synthetic','normal_balance','DEBIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,
    'is_protected',true,'control_classification','CASH_ACCOUNTABILITY');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_account,'Synthetic protected control',NULL,'00000000-0000-4000-8000-00000000b844');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'control account creation failed'; END IF;
  v_control:=v_result.account_id;

  v_period:=jsonb_build_object('start_date','2301-01-01','end_date','2301-01-31','status','OPEN');
  SELECT * INTO v_result FROM public.save_accounting_period(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_period,'Synthetic W10B period one',NULL,'00000000-0000-4000-8000-00000000b845');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'period one creation failed'; END IF;
  v_period_open:=v_result.period_id;
  INSERT INTO pg_temp.w10b_fixture_periods(profile_id,period_id) VALUES(v_profile_id,v_period_open);
  v_period:=jsonb_build_object('start_date','2301-02-01','end_date','2301-02-28','status','OPEN');
  SELECT * INTO v_result FROM public.save_accounting_period(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_period,'Synthetic W10B period two',NULL,'00000000-0000-4000-8000-00000000b846');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'period two creation failed'; END IF;
  v_period_next:=v_result.period_id;
  INSERT INTO pg_temp.w10b_fixture_periods(profile_id,period_id) VALUES(v_profile_id,v_period_next);

  v_rule:=jsonb_build_object('rule_code','W10B_SYN_BAD_HEADING','name_en','Invalid heading rule',
    'name_ar','قاعدة رأس غير صالحة','is_active',true,'mappings',jsonb_build_array(
      jsonb_build_object('mapping_key','bad','account_id',v_root,'account_version',1,'allowed_side','EITHER','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','credit','account_id',v_credit,'account_version',1,'allowed_side','CREDIT','service_requirement','OPTIONAL')));
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_rule,'Reject non-posting mapping',NULL,'00000000-0000-4000-8000-00000000b850');
  IF v_result.error_code IS DISTINCT FROM 'mapping_invalid' THEN RAISE EXCEPTION 'non-posting account mapping was accepted'; END IF;
  v_rule:=jsonb_set(v_rule,'{rule_code}',to_jsonb('W10B_SYN_BAD_CONTROL'::text),false);
  v_rule:=jsonb_set(v_rule,'{mappings,0,account_id}',to_jsonb(v_control),false);
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_rule,'Reject protected mapping',NULL,'00000000-0000-4000-8000-00000000b851');
  IF v_result.error_code IS DISTINCT FROM 'mapping_invalid' THEN RAISE EXCEPTION 'protected control mapping was accepted'; END IF;
  IF EXISTS (SELECT 1 FROM public.list_accounting_posting_rules('00000000-0000-4000-8000-00000000b811')
      WHERE rule_code LIKE 'W10B_SYN_BAD_%') THEN
    RAISE EXCEPTION 'failed mapping save left a partial rule';
  END IF;

  v_rule:=jsonb_build_object('rule_code','W10B_SYN_MANUAL','name_en','Synthetic manual rule',
    'name_ar','قاعدة يدوية اصطناعية','is_active',true,'mappings',jsonb_build_array(
      jsonb_build_object('mapping_key','asset_debit','account_id',v_debit,'account_version',1,'allowed_side','DEBIT','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','liability_credit','account_id',v_credit,'account_version',1,'allowed_side','CREDIT','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','service_required_credit','account_id',v_credit,'account_version',1,'allowed_side','CREDIT','service_requirement','REQUIRED')));
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_rule,'Create synthetic manual rule',NULL,'00000000-0000-4000-8000-00000000b852');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'valid posting rule creation failed: %',v_result.error_code; END IF;
  v_rule_id:=v_result.posting_rule_id;
  v_rule_version:=1;
  IF NOT EXISTS (SELECT 1 FROM public.audit_logs
      WHERE entity_type='accounting_posting_rule' AND entity_id=v_rule_id
        AND action='create' AND details->>'request_id'='00000000-0000-4000-8000-00000000b852') THEN
    RAISE EXCEPTION 'posting rule create audit action not captured';
  END IF;
  v_rule:=jsonb_set(v_rule,'{name_en}',to_jsonb('Synthetic manual rule revision'::text),false);
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    '00000000-0000-4000-8000-00000000b811',v_rule_id,1,v_rule,'Update synthetic manual rule',NULL,'00000000-0000-4000-8000-00000000b8f0');
  IF v_result.error_code IS NOT NULL OR v_result.version<>2 THEN
    RAISE EXCEPTION 'valid posting rule update failed: %',v_result.error_code;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.audit_logs
      WHERE entity_type='accounting_posting_rule' AND entity_id=v_rule_id
        AND action='update' AND details->>'request_id'='00000000-0000-4000-8000-00000000b8f0') THEN
    RAISE EXCEPTION 'posting rule update audit action not captured';
  END IF;
  v_rule_version:=2;

  v_lines:=jsonb_build_array(
    jsonb_build_object('mapping_key','asset_debit','side','DEBIT','amount_halalah','2500','service_id',NULL,'description_en','Synthetic debit','description_ar','مدين اصطناعي'),
    jsonb_build_object('mapping_key','liability_credit','side','CREDIT','amount_halalah','2500','service_id',NULL,'description_en','Synthetic credit','description_ar','دائن اصطناعي'));
  v_journal:=jsonb_build_object('accounting_date','2301-02-10','period_id',v_period_next,'period_version',1,
    'posting_rule_id',v_rule_id,'rule_version',v_rule_version,'source_record_key','W10B-SYN-STALE-ACCOUNT',
    'economic_event_key','W10B-SYN-EVENT-STALE-ACCOUNT','posting_purpose','synthetic-test',
    'description_en','Synthetic accounting journal','description_ar','قيد محاسبي اصطناعي','lines',v_lines);
  BEGIN
    PERFORM * FROM public.prepare_accounting_journal(
      '00000000-0000-4000-8000-00000000b812',NULL,0,v_journal,'Admin denial probe',NULL,'00000000-0000-4000-8000-00000000b86a');
    RAISE EXCEPTION 'CRM Admin unexpectedly prepared a journal';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  v_changed:=jsonb_set(v_journal,'{lines,1,amount_halalah}',to_jsonb('2400'::text),false);
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_changed,'Unbalanced regression',NULL,'00000000-0000-4000-8000-00000000b853');
  IF v_result.error_code IS DISTINCT FROM 'journal_unbalanced' THEN RAISE EXCEPTION 'unbalanced journal was accepted'; END IF;

  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_journal,'Stale account regression',NULL,'00000000-0000-4000-8000-00000000b854');
  IF v_result.error_code IS NOT NULL OR v_result.version<>1 OR v_result.status<>'DRAFT' THEN RAISE EXCEPTION 'balanced draft preparation failed'; END IF;
  v_stale_account_id:=v_result.journal_id;
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_journal,'Stale account regression',NULL,'00000000-0000-4000-8000-00000000b854');
  IF v_result.error_code IS NOT NULL OR v_result.journal_id<>v_stale_account_id OR NOT v_result.idempotent_replay THEN
    RAISE EXCEPTION 'identical request retry was not idempotent';
  END IF;
  v_changed:=jsonb_set(v_journal,'{lines,0,amount_halalah}',to_jsonb('2501'::text),false);
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_changed,'Stale account regression',NULL,'00000000-0000-4000-8000-00000000b854');
  IF v_result.error_code IS DISTINCT FROM 'request_payload_conflict' THEN RAISE EXCEPTION 'request payload collision was accepted'; END IF;
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_changed,'Changed economic payload',NULL,'00000000-0000-4000-8000-00000000b855');
  IF v_result.error_code IS DISTINCT FROM 'economic_effect_conflict' THEN RAISE EXCEPTION 'duplicate economic effect with changed payload was accepted'; END IF;
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_journal,'Source effect retry',NULL,'00000000-0000-4000-8000-00000000b856');
  IF v_result.error_code IS NOT NULL OR v_result.journal_id<>v_stale_account_id OR NOT v_result.idempotent_replay THEN
    RAISE EXCEPTION 'identical economic effect retry was not idempotent';
  END IF;

  v_account:=jsonb_build_object('account_code','W10B-SYN-DEBIT','name_en','Synthetic debit revised',
    'name_ar','مدين اصطناعي محدث','account_type','ASSET','category','synthetic','normal_balance','DEBIT',
    'account_kind','POSTING','parent_account_id',v_root,'is_active',true,
    'is_protected',false,'control_classification','NONE');
  SELECT * INTO v_result FROM public.save_accounting_account(
    '00000000-0000-4000-8000-00000000b811',v_debit,1,v_account,'Version debit account',NULL,'00000000-0000-4000-8000-00000000b857');
  IF v_result.error_code IS NOT NULL OR v_result.version<>2 THEN RAISE EXCEPTION 'debit account version update failed'; END IF;
  v_stale_account_version:=v_result.version;
  SELECT * INTO v_result FROM public.post_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',v_stale_account_id,1,'00000000-0000-4000-8000-00000000b858');
  IF v_result.error_code IS DISTINCT FROM 'account_not_posting' THEN RAISE EXCEPTION 'post-time account version change was not rejected'; END IF;

  v_rule:=jsonb_set(v_rule,'{mappings,0,account_version}',to_jsonb(v_stale_account_version),false);
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    '00000000-0000-4000-8000-00000000b811',v_rule_id,2,v_rule,'Pin revised account version',NULL,'00000000-0000-4000-8000-00000000b859');
  IF v_result.error_code IS NOT NULL OR v_result.version<>3 THEN RAISE EXCEPTION 'posting rule revision failed'; END IF;
  v_rule_version:=3;

  v_journal:=jsonb_set(v_journal,'{posting_rule_id}',to_jsonb(v_rule_id),false);
  v_journal:=jsonb_set(v_journal,'{rule_version}',to_jsonb(v_rule_version),false);
  v_journal:=jsonb_set(v_journal,'{source_record_key}',to_jsonb('W10B-SYN-STALE-RULE'::text),false);
  v_journal:=jsonb_set(v_journal,'{economic_event_key}',to_jsonb('W10B-SYN-EVENT-STALE-RULE'::text),false);
  v_journal:=jsonb_set(v_journal,'{period_id}',to_jsonb(v_period_next),false);
  v_journal:=jsonb_set(v_journal,'{accounting_date}',to_jsonb('2301-02-11'::text),false);
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_journal,'Stale rule regression',NULL,'00000000-0000-4000-8000-00000000b85a');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'stale rule draft preparation failed'; END IF;
  v_stale_rule_id:=v_result.journal_id;
  v_rule:=jsonb_set(v_rule,'{name_en}',to_jsonb('Synthetic manual rule v3'::text),false);
  v_rule:=jsonb_set(v_rule,'{name_ar}',to_jsonb('قاعدة يدوية اصطناعية ٣'::text),false);
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    '00000000-0000-4000-8000-00000000b811',v_rule_id,3,v_rule,'Change rule after draft',NULL,'00000000-0000-4000-8000-00000000b85b');
  IF v_result.error_code IS NOT NULL OR v_result.version<>4 THEN RAISE EXCEPTION 'posting rule fourth version failed'; END IF;
  v_rule_version:=4;
  SELECT * INTO v_result FROM public.post_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',v_stale_rule_id,1,'00000000-0000-4000-8000-00000000b85c');
  IF v_result.error_code IS DISTINCT FROM 'posting_rule_changed' THEN RAISE EXCEPTION 'post-time rule version change was not rejected'; END IF;

  v_journal:=jsonb_set(v_journal,'{period_id}',to_jsonb(v_period_open),false);
  v_journal:=jsonb_set(v_journal,'{accounting_date}',to_jsonb('2301-01-15'::text),false);
  v_journal:=jsonb_set(v_journal,'{source_record_key}',to_jsonb('W10B-SYN-CLOSED-PERIOD'::text),false);
  v_journal:=jsonb_set(v_journal,'{economic_event_key}',to_jsonb('W10B-SYN-EVENT-CLOSED-PERIOD'::text),false);
  v_journal:=jsonb_set(v_journal,'{rule_version}',to_jsonb(v_rule_version),false);
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_journal,'Closed period regression',NULL,'00000000-0000-4000-8000-00000000b85d');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'closed-period draft preparation failed'; END IF;
  v_closed_id:=v_result.journal_id;

  -- Only the owner creates a synthetic CLOSED period version; W10B exposes no close RPC.
  PERFORM pg_temp.w10b_fixture_mark_period_closed(
    v_profile_id,v_period_open,'00000000-0000-4000-8000-00000000b810',
    '00000000-0000-4000-8000-00000000b85e','00000000-0000-4000-8000-00000000b85f');
  SELECT * INTO v_result FROM public.post_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',v_closed_id,1,'00000000-0000-4000-8000-00000000b860');
  IF v_result.error_code IS DISTINCT FROM 'period_not_open' THEN RAISE EXCEPTION 'closed period accepted journal posting'; END IF;

  v_journal:=jsonb_set(v_journal,'{period_id}',to_jsonb(v_period_next),false);
  v_journal:=jsonb_set(v_journal,'{accounting_date}',to_jsonb('2301-02-12'::text),false);
  v_journal:=jsonb_set(v_journal,'{source_record_key}',to_jsonb('W10B-SYN-POSTED'::text),false);
  v_journal:=jsonb_set(v_journal,'{economic_event_key}',to_jsonb('W10B-SYN-EVENT-POSTED'::text),false);
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_journal,'Post synthetic journal',NULL,'00000000-0000-4000-8000-00000000b861');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'valid journal preparation failed'; END IF;
  v_posted_id:=v_result.journal_id;
  SELECT * INTO v_result FROM public.post_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',v_posted_id,1,'00000000-0000-4000-8000-00000000b862');
  IF v_result.error_code IS NOT NULL OR v_result.version<>2 OR v_result.status<>'POSTED' THEN RAISE EXCEPTION 'balanced journal posting failed'; END IF;
  SELECT * INTO v_result FROM public.post_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',v_posted_id,1,'00000000-0000-4000-8000-00000000b862');
  IF v_result.error_code IS NOT NULL OR NOT v_result.idempotent_replay THEN RAISE EXCEPTION 'post retry was not idempotent'; END IF;
  SELECT * INTO v_result FROM public.post_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',v_posted_id,1,'00000000-0000-4000-8000-00000000b8fe');
  IF v_result.error_code IS DISTINCT FROM 'revision_conflict'
     OR v_result.version<>2 OR v_result.status<>'POSTED' OR v_result.idempotent_replay THEN
    RAISE EXCEPTION 'fresh post request did not preserve posted revision conflict';
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_journal_events
      WHERE request_id='00000000-0000-4000-8000-00000000b8fe' AND operation='POST') THEN
    RAISE EXCEPTION 'fresh post conflict recorded a false replay event';
  END IF;

  v_detail:=public.get_accounting_journal('00000000-0000-4000-8000-00000000b811',v_posted_id);
  v_cutoff:=(v_detail->'versions'->1->>'posted_at')::timestamptz;
  SELECT * INTO v_gl FROM public.get_accounting_general_ledger(
    '00000000-0000-4000-8000-00000000b811','2301-02-01','2301-02-28',v_cutoff,NULL,NULL,0,100);
  IF jsonb_array_length(v_gl.report->'entries')<>2 OR NOT v_gl.is_complete THEN RAISE EXCEPTION 'posted-only GL before reversal is incorrect'; END IF;
  SELECT * INTO v_tb FROM public.get_accounting_trial_balance(
    '00000000-0000-4000-8000-00000000b811','2301-02-28',v_cutoff,NULL,0,100);
  IF v_tb.report->>'debits_equal_credits'<>'true'
     OR v_tb.report->>'debit_balance_total_halalah'<>'2500'
     OR v_tb.report->>'credit_balance_total_halalah'<>'2500'
     OR (v_tb.report->>'account_count')::integer<>2 THEN
    RAISE EXCEPTION 'pre-reversal Trial Balance does not reconcile';
  END IF;

  SELECT * INTO v_result FROM public.reverse_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',v_posted_id,v_period_next,'2301-02-13',
    'Synthetic full reversal','W10B rollback fixture','00000000-0000-4000-8000-00000000b863');
  IF v_result.error_code IS NOT NULL OR v_result.original_journal_id<>v_posted_id OR v_result.version<>2 THEN
    RAISE EXCEPTION 'full journal reversal failed';
  END IF;
  v_reversal_id:=v_result.journal_id;
  SELECT * INTO v_result FROM public.reverse_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',v_posted_id,v_period_next,'2301-02-13',
    'Synthetic full reversal','W10B rollback fixture','00000000-0000-4000-8000-00000000b863');
  IF v_result.error_code IS NOT NULL OR NOT v_result.idempotent_replay OR v_result.journal_id<>v_reversal_id THEN
    RAISE EXCEPTION 'identical reversal retry was not idempotent';
  END IF;
  SELECT * INTO v_result FROM public.reverse_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',v_posted_id,v_period_next,'2301-02-13',
    'Duplicate reversal probe','W10B rollback fixture','00000000-0000-4000-8000-00000000b864');
  IF v_result.error_code IS DISTINCT FROM 'already_reversed' THEN RAISE EXCEPTION 'duplicate reversal was accepted'; END IF;
  v_reversal_detail:=public.get_accounting_journal('00000000-0000-4000-8000-00000000b811',v_reversal_id);
  IF v_reversal_detail->>'reversal_of_journal_id' IS DISTINCT FROM v_posted_id::text
     OR v_reversal_detail->>'current_version'<>'2'
     OR jsonb_array_length(v_reversal_detail->'versions'->1->'lines')<>2 THEN
    RAISE EXCEPTION 'reversal lineage or posted version is invalid';
  END IF;
  FOR v_count IN 0..1 LOOP
    IF (v_reversal_detail->'versions'->1->'lines'->v_count->>'side') =
       (v_detail->'versions'->1->'lines'->v_count->>'side')
       OR v_reversal_detail->'versions'->1->'lines'->v_count->>'amount_halalah' IS DISTINCT FROM
          v_detail->'versions'->1->'lines'->v_count->>'amount_halalah'
       OR v_reversal_detail->'versions'->1->'lines'->v_count->>'account_id' IS DISTINCT FROM
          v_detail->'versions'->1->'lines'->v_count->>'account_id' THEN
      RAISE EXCEPTION 'reversal lines are not exact opposing copies';
    END IF;
  END LOOP;
  SELECT * INTO v_gl FROM public.get_accounting_general_ledger(
    '00000000-0000-4000-8000-00000000b811','2301-02-01','2301-02-28',v_cutoff,NULL,NULL,0,100);
  IF jsonb_array_length(v_gl.report->'entries')<>2 THEN RAISE EXCEPTION 'historical GL cutoff included a later reversal'; END IF;
  SELECT * INTO v_gl FROM public.get_accounting_general_ledger(
    '00000000-0000-4000-8000-00000000b811','2301-02-01','2301-02-28',NULL,NULL,NULL,0,100);
  IF jsonb_array_length(v_gl.report->'entries')<>4 THEN RAISE EXCEPTION 'current GL omitted the posted reversal'; END IF;
  SELECT * INTO v_tb FROM public.get_accounting_trial_balance(
    '00000000-0000-4000-8000-00000000b811','2301-02-28',NULL,NULL,0,100);
  IF v_tb.report->>'debits_equal_credits'<>'true'
     OR v_tb.report->>'debit_balance_total_halalah'<>'0'
     OR v_tb.report->>'credit_balance_total_halalah'<>'0'
     OR (v_tb.report->>'account_count')::integer<>2 THEN
    RAISE EXCEPTION 'post-reversal Trial Balance did not net to zero';
  END IF;

  v_journal:=jsonb_set(v_journal,'{source_record_key}',to_jsonb('W10B-SYN-SERVICE-MISSING'::text),false);
  v_journal:=jsonb_set(v_journal,'{economic_event_key}',to_jsonb('W10B-SYN-EVENT-SERVICE-MISSING'::text),false);
  v_journal:=jsonb_set(v_journal,'{lines,1,mapping_key}',to_jsonb('service_required_credit'::text),false);
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_journal,'Required Service probe',NULL,'00000000-0000-4000-8000-00000000b865');
  IF v_result.error_code IS DISTINCT FROM 'service_dimension_invalid' THEN RAISE EXCEPTION 'required Service dimension was omitted'; END IF;
  v_journal:=jsonb_set(v_journal,'{source_record_key}',to_jsonb('W10B-SYN-SERVICE-INVALID'::text),false);
  v_journal:=jsonb_set(v_journal,'{economic_event_key}',to_jsonb('W10B-SYN-EVENT-SERVICE-INVALID'::text),false);
  v_journal:=jsonb_set(v_journal,'{lines,1,service_id}',to_jsonb('00000000-0000-4000-8000-00000000b899'::text),false);
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000b811',NULL,0,v_journal,'Invalid Service probe',NULL,'00000000-0000-4000-8000-00000000b866');
  IF v_result.error_code IS DISTINCT FROM 'service_not_found' THEN RAISE EXCEPTION 'unknown Service dimension was accepted'; END IF;

  BEGIN
    PERFORM 1 FROM public.accounting_journal_versions;
    RAISE EXCEPTION 'service_role unexpectedly read journal history directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.accounting_journals(profile_id,correction_group_id)
      VALUES(v_profile_id,'00000000-0000-4000-8000-00000000b899');
    RAISE EXCEPTION 'service_role unexpectedly wrote journal identity directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.accounting_capability_catalog
       WHERE capability IN ('accounting:close_period','accounting:reopen_period')
         AND (enabled OR runtime_allow_grantable)) THEN
    RAISE EXCEPTION 'W10B unexpectedly enabled close/reopen workflow';
  END IF;
END;
$rpc_regression$;
RESET ROLE;

ROLLBACK;

DO $residue_assertion$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10b-rollback-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000b800')
     OR EXISTS (SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10B-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_posting_rules WHERE rule_code LIKE 'W10B_SYN_%')
     OR EXISTS (SELECT 1 FROM public.accounting_period_versions
       WHERE start_date BETWEEN '2301-01-01' AND '2301-03-31')
     OR EXISTS (SELECT 1 FROM public.accounting_journals j
       JOIN public.accounting_journal_versions v
         ON v.profile_id=j.profile_id AND v.journal_id=j.id AND v.version=j.current_version
       WHERE v.accounting_date BETWEEN '2301-01-01' AND '2301-03-31')
     OR EXISTS (SELECT 1 FROM public.accounting_journal_versions
       WHERE accounting_date BETWEEN '2301-01-01' AND '2301-03-31')
     OR EXISTS (SELECT 1 FROM public.accounting_posting_rule_mappings m
       JOIN public.accounting_posting_rules r
         ON r.profile_id=m.profile_id AND r.id=m.posting_rule_id
       WHERE r.rule_code LIKE 'W10B_SYN_%')
      OR EXISTS (SELECT 1 FROM public.accounting_posting_rule_versions v
        JOIN public.accounting_posting_rules r
          ON r.profile_id=v.profile_id AND r.id=v.posting_rule_id
        WHERE r.rule_code LIKE 'W10B_SYN_%')
      OR EXISTS (SELECT 1 FROM public.accounting_source_effects WHERE source_record_key LIKE 'W10B-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000b830'
         AND '00000000-0000-4000-8000-00000000b8ff')
     OR EXISTS (SELECT 1 FROM public.accounting_journal_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000b830'
         AND '00000000-0000-4000-8000-00000000b8ff')
     OR EXISTS (SELECT 1 FROM public.accounting_journal_line_versions l
       JOIN public.accounting_journal_versions v
         ON v.profile_id=l.profile_id AND v.journal_id=l.journal_id AND v.version=l.journal_version
       WHERE v.accounting_date BETWEEN '2301-01-01' AND '2301-03-31')
     OR EXISTS (SELECT 1 FROM public.accounting_capability_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000b830'
         AND '00000000-0000-4000-8000-00000000b8ff')
     OR EXISTS (SELECT 1 FROM public.audit_logs
       WHERE details->>'request_id' BETWEEN '00000000-0000-4000-8000-00000000b830'
         AND '00000000-0000-4000-8000-00000000b8ff') THEN
    RAISE EXCEPTION 'W10B rollback fixture residue detected';
  END IF;
END;
$residue_assertion$;
