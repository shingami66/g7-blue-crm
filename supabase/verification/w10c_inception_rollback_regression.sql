-- W10C synthetic DEV regression only. All package, chart, period, and journal rows roll back.
BEGIN;

CREATE TEMP TABLE w10c_fixture_context ON COMMIT DROP AS
SELECT '00000000-0000-4000-8000-00000000c800'::uuid AS profile_id;
GRANT SELECT ON w10c_fixture_context TO service_role;
CREATE TEMP TABLE w10c_fixture_accounts(
  account_key text PRIMARY KEY, account_id uuid NOT NULL, account_version integer NOT NULL
);
GRANT SELECT,INSERT ON w10c_fixture_accounts TO service_role;
CREATE TEMP TABLE w10c_fixture_journals(
  item_id uuid PRIMARY KEY, journal_id uuid NOT NULL, prepared_version integer NOT NULL
);
GRANT SELECT,INSERT ON w10c_fixture_journals TO service_role;
CREATE TEMP TABLE w10c_fixture_expected_activity(
  account_id uuid PRIMARY KEY, debit_activity_halalah numeric NOT NULL DEFAULT 0,
  credit_activity_halalah numeric NOT NULL DEFAULT 0
);
GRANT SELECT,INSERT,UPDATE ON w10c_fixture_expected_activity TO service_role;
CREATE TEMP TABLE w10c_fixture_source_snapshot ON COMMIT DROP AS
SELECT count(*)::bigint AS service_count,
  coalesce(md5(string_agg(id::text,',' ORDER BY id)),md5('')) AS service_ids_fingerprint
FROM public.services;
GRANT SELECT ON w10c_fixture_source_snapshot TO service_role;

DO $preflight$
DECLARE v_table text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE id BETWEEN
        '00000000-0000-4000-8000-00000000c810' AND '00000000-0000-4000-8000-00000000c813'
        OR clerk_user_id LIKE 'w10c-rollback-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000c800'
        OR singleton_key='g7')
     OR EXISTS (SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10C-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_period_versions
        WHERE start_date<='2501-01-31' AND end_date>='2501-01-01')
     OR EXISTS (SELECT 1 FROM public.accounting_journal_versions
        WHERE accounting_date BETWEEN '2501-01-01' AND '2501-01-31')
     OR EXISTS (SELECT 1 FROM public.accounting_posting_rules WHERE rule_code LIKE 'W10C_SYN_%')
     OR EXISTS (SELECT 1 FROM public.accounting_inception_packages)
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events
        WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000c830'
          AND '00000000-0000-4000-8000-00000000c8ff') THEN
    RAISE EXCEPTION 'W10C rollback fixture collision; inspect before running';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company_settings WHERE setting_key='default') THEN
    RAISE EXCEPTION 'W10C rollback fixture requires default company settings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
       WHERE capability='accounting:manage_inception' AND enabled
         AND runtime_allow_grantable AND owner_slice='W10C') THEN
    RAISE EXCEPTION 'W10C inception capability is not enabled through the authority catalog';
  END IF;
  FOR v_table IN SELECT unnest(ARRAY[
    'accounting_inception_packages','accounting_inception_package_versions',
    'accounting_inception_coverage','accounting_inception_coverage_versions',
    'accounting_inception_reviews','accounting_inception_mapping_authorizations',
    'accounting_inception_journal_links','accounting_inception_acceptances'
  ]) LOOP
    IF NOT (SELECT c.relrowsecurity FROM pg_class c
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relname=v_table)
       OR EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
           JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname=v_table)
       OR has_table_privilege('service_role',format('public.%I',v_table)::regclass,'SELECT')
       OR has_table_privilege('service_role',format('public.%I',v_table)::regclass,'INSERT')
       OR has_table_privilege('service_role',format('public.%I',v_table)::regclass,'UPDATE')
       OR has_table_privilege('service_role',format('public.%I',v_table)::regclass,'DELETE') THEN
      RAISE EXCEPTION 'W10C table is not RPC-only with RLS: %',v_table;
    END IF;
  END LOOP;
END;
$preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
 ('00000000-0000-4000-8000-00000000c810','w10c-rollback-authority','w10c-authority@example.invalid','Synthetic Accounting Authority','viewer',true),
 ('00000000-0000-4000-8000-00000000c811','w10c-rollback-preparer','w10c-preparer@example.invalid','Synthetic Inception Preparer','viewer',true),
 ('00000000-0000-4000-8000-00000000c812','w10c-rollback-reviewer','w10c-reviewer@example.invalid','Synthetic Inception Reviewer','viewer',true),
 ('00000000-0000-4000-8000-00000000c813','w10c-rollback-admin','w10c-admin@example.invalid','Synthetic CRM Admin','admin',true);

INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT c.profile_id,'g7',s.id,0 FROM pg_temp.w10c_fixture_context c
JOIN public.company_settings s ON s.setting_key='default';
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
)
SELECT '00000000-0000-4000-8000-00000000c830',c.profile_id,
  'accounting_profile_updated','accounting_profile',c.profile_id,1,
  '00000000-0000-4000-8000-00000000c810','00000000-0000-4000-8000-00000000c831',
  'Synthetic W10C profile',NULL,repeat('a',64),
  'accounting_profiles/'||c.profile_id||'/1',transaction_timestamp()
FROM pg_temp.w10c_fixture_context c;
INSERT INTO public.accounting_profile_versions(
  profile_id,version,previous_version,framework_key,framework_edition,policy_version,
  endorsement_context,professional_validation_state,professional_validation_evidence_ref,
  functional_currency,fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,
  fiscal_timezone,accounting_start_date,cutover_boundary_date,legal_fiscal_evidence_pending,
  legal_fiscal_evidence_ref,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
  reason,evidence_ref,created_by,created_at,foundation_event_id
)
SELECT c.profile_id,1,NULL,'SA_IFRS_FOR_SMES',2025,'W10 provisional policy',
  'Synthetic W10C rollback fixture','DEFERRED',NULL,'SAR',1,1,12,31,'Asia/Riyadh',
  '2501-01-01','2501-01-31',true,NULL,'not_registered','INACTIVE','INACTIVE','DEV_PROVISIONAL',
  transaction_timestamp(),'Synthetic W10C profile',NULL,
  '00000000-0000-4000-8000-00000000c810',transaction_timestamp(),
  '00000000-0000-4000-8000-00000000c830'
FROM pg_temp.w10c_fixture_context c;
UPDATE public.accounting_profiles SET current_version=1
WHERE id=(SELECT profile_id FROM pg_temp.w10c_fixture_context);

-- The authority bootstrap and all grants exist only within this rollback transaction.
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
)
SELECT '00000000-0000-4000-8000-00000000c832',c.profile_id,
  'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000c834',1,
  '00000000-0000-4000-8000-00000000c810','00000000-0000-4000-8000-00000000c833',
  'Synthetic W10C authority bootstrap',NULL,repeat('b',64),
  'accounting:manage_authority',transaction_timestamp()
FROM pg_temp.w10c_fixture_context c;
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,
  reason,evidence_ref,request_id,payload_fingerprint,foundation_event_id,created_at
)
SELECT '00000000-0000-4000-8000-00000000c834',c.profile_id,
  '00000000-0000-4000-8000-00000000c810','accounting:manage_authority',1,'ALLOW',NULL,
  '00000000-0000-4000-8000-00000000c810','Synthetic authority bootstrap',NULL,
  '00000000-0000-4000-8000-00000000c833',repeat('b',64),
  '00000000-0000-4000-8000-00000000c832',transaction_timestamp()
FROM pg_temp.w10c_fixture_context c;

SET LOCAL ROLE service_role;
DO $rpc_regression$
DECLARE
  v_profile_id uuid; v_result record; v_spec jsonb; v_grant record;
  v_account jsonb; v_period jsonb; v_rule jsonb; v_journal jsonb;
  v_payload jsonb; v_duplicate jsonb; v_items jsonb:='[]'::jsonb;
  v_inventory jsonb:='[]'::jsonb; v_references jsonb:='[]'::jsonb;
  v_item jsonb; v_period_id uuid; v_package_id uuid; v_package_version integer;
  v_cash uuid; v_founder uuid; v_bank uuid; v_equity uuid; v_ar uuid; v_revenue uuid;
  v_expense uuid; v_ap uuid; v_employee uuid; v_fixed uuid; v_prepaid uuid;
  v_debit_account uuid; v_credit_account uuid; v_debit_version integer; v_credit_version integer;
  v_manual_rule_id uuid; v_item_id uuid; v_journal_id uuid; v_detail jsonb; v_tb record;
  v_journal_row record;
  v_version_row record; v_line jsonb; v_account_row jsonb; v_cutoff timestamptz;
  v_index integer; v_debits numeric:=0; v_credits numeric:=0;
  v_report_debits numeric:=0; v_report_credits numeric:=0; v_mismatch integer;
  v_acceptance_id uuid; v_acceptance_tb jsonb; v_profile_count bigint;
BEGIN
  SELECT profile_id INTO v_profile_id FROM pg_temp.w10c_fixture_context;
  IF public.get_accounting_capability('00000000-0000-4000-8000-00000000c813','accounting:manage_inception') IS NOT FALSE
     OR public.get_accounting_capability('00000000-0000-4000-8000-00000000c813','accounting:prepare_journal') IS NOT FALSE
     OR public.get_accounting_capability('00000000-0000-4000-8000-00000000c813','accounting:post_journal') IS NOT FALSE THEN
    RAISE EXCEPTION 'CRM Admin wildcard leaked into W10C accounting authority';
  END IF;

  FOR v_grant IN SELECT * FROM (VALUES
    ('00000000-0000-4000-8000-00000000c811'::uuid,'accounting:manage_inception','00000000-0000-4000-8000-00000000c835'::uuid),
    ('00000000-0000-4000-8000-00000000c811'::uuid,'accounting:manage_chart','00000000-0000-4000-8000-00000000c836'::uuid),
    ('00000000-0000-4000-8000-00000000c811'::uuid,'accounting:manage_periods','00000000-0000-4000-8000-00000000c837'::uuid),
    ('00000000-0000-4000-8000-00000000c811'::uuid,'accounting:prepare_journal','00000000-0000-4000-8000-00000000c838'::uuid),
    ('00000000-0000-4000-8000-00000000c811'::uuid,'accounting:post_journal','00000000-0000-4000-8000-00000000c839'::uuid),
    ('00000000-0000-4000-8000-00000000c811'::uuid,'accounting:view','00000000-0000-4000-8000-00000000c83a'::uuid),
    ('00000000-0000-4000-8000-00000000c812'::uuid,'accounting:manage_inception','00000000-0000-4000-8000-00000000c83b'::uuid),
    ('00000000-0000-4000-8000-00000000c812'::uuid,'accounting:prepare_journal','00000000-0000-4000-8000-00000000c841'::uuid),
    ('00000000-0000-4000-8000-00000000c812'::uuid,'accounting:post_journal','00000000-0000-4000-8000-00000000c83c'::uuid),
    ('00000000-0000-4000-8000-00000000c812'::uuid,'accounting:reverse_journal','00000000-0000-4000-8000-00000000c83d'::uuid),
    ('00000000-0000-4000-8000-00000000c812'::uuid,'accounting:view','00000000-0000-4000-8000-00000000c83e'::uuid)
  ) AS g(target_user_id,capability,request_id) LOOP
    SELECT * INTO v_result FROM public.set_accounting_capability(
      '00000000-0000-4000-8000-00000000c810',v_grant.target_user_id,
      v_grant.capability,'ALLOW',NULL,0,'Synthetic W10C fixture grant',NULL,v_grant.request_id);
    IF v_result.error_code IS NOT NULL THEN
      RAISE EXCEPTION 'synthetic capability grant failed: % / %',v_grant.capability,v_result.error_code;
    END IF;
  END LOOP;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000c810','00000000-0000-4000-8000-00000000c813',
    'accounting:manage_inception','ALLOW',NULL,0,'Admin isolation ALLOW probe',NULL,
    '00000000-0000-4000-8000-00000000c83f');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'Admin explicit ALLOW probe failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    '00000000-0000-4000-8000-00000000c810','00000000-0000-4000-8000-00000000c813',
    'accounting:manage_inception','DENY',NULL,1,'Admin isolation DENY probe',NULL,
    '00000000-0000-4000-8000-00000000c840');
  IF v_result.error_code IS NOT NULL
     OR public.get_accounting_capability('00000000-0000-4000-8000-00000000c813','accounting:manage_inception') IS NOT FALSE THEN
    RAISE EXCEPTION 'explicit W10C DENY did not override ALLOW';
  END IF;

  FOR v_spec IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('key','cash','request_id','00000000-0000-4000-8000-00000000c850','account',jsonb_build_object('account_code','W10C-SYN-CASH','name_en','Synthetic cash','name_ar','نقد اصطناعي','account_type','ASSET','category','synthetic','normal_balance','DEBIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE')),
    jsonb_build_object('key','founder','request_id','00000000-0000-4000-8000-00000000c851','account',jsonb_build_object('account_code','W10C-SYN-FOUNDER-LOAN','name_en','Synthetic founder loan','name_ar','قرض مؤسس اصطناعي','account_type','LIABILITY','category','synthetic','normal_balance','CREDIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE')),
    jsonb_build_object('key','bank','request_id','00000000-0000-4000-8000-00000000c852','account',jsonb_build_object('account_code','W10C-SYN-BANK','name_en','Synthetic bank','name_ar','بنك اصطناعي','account_type','ASSET','category','synthetic','normal_balance','DEBIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE')),
    jsonb_build_object('key','equity','request_id','00000000-0000-4000-8000-00000000c853','account',jsonb_build_object('account_code','W10C-SYN-EQUITY','name_en','Synthetic equity','name_ar','حقوق ملكية اصطناعية','account_type','EQUITY','category','synthetic','normal_balance','CREDIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE')),
    jsonb_build_object('key','ar','request_id','00000000-0000-4000-8000-00000000c854','account',jsonb_build_object('account_code','W10C-SYN-AR','name_en','Synthetic receivable','name_ar','ذمم مدينة اصطناعية','account_type','ASSET','category','synthetic','normal_balance','DEBIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',true,'control_classification','ACCOUNTS_RECEIVABLE')),
    jsonb_build_object('key','revenue','request_id','00000000-0000-4000-8000-00000000c855','account',jsonb_build_object('account_code','W10C-SYN-REVENUE','name_en','Synthetic revenue','name_ar','إيراد اصطناعي','account_type','REVENUE','category','synthetic','normal_balance','CREDIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE')),
    jsonb_build_object('key','expense','request_id','00000000-0000-4000-8000-00000000c856','account',jsonb_build_object('account_code','W10C-SYN-EXPENSE','name_en','Synthetic expense','name_ar','مصروف اصطناعي','account_type','EXPENSE','category','synthetic','normal_balance','DEBIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE')),
    jsonb_build_object('key','ap','request_id','00000000-0000-4000-8000-00000000c857','account',jsonb_build_object('account_code','W10C-SYN-AP','name_en','Synthetic payable','name_ar','ذمم دائنة اصطناعية','account_type','LIABILITY','category','synthetic','normal_balance','CREDIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',true,'control_classification','ACCOUNTS_PAYABLE')),
    jsonb_build_object('key','employee','request_id','00000000-0000-4000-8000-00000000c858','account',jsonb_build_object('account_code','W10C-SYN-EMPLOYEE-ADVANCE','name_en','Synthetic employee accountability','name_ar','عهدة موظف اصطناعية','account_type','ASSET','category','synthetic','normal_balance','DEBIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',true,'control_classification','EMPLOYEE_ADVANCE')),
    jsonb_build_object('key','fixed','request_id','00000000-0000-4000-8000-00000000c859','account',jsonb_build_object('account_code','W10C-SYN-FIXED-ASSET','name_en','Synthetic fixed asset','name_ar','أصل ثابت اصطناعي','account_type','ASSET','category','synthetic','normal_balance','DEBIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE')),
    jsonb_build_object('key','prepaid','request_id','00000000-0000-4000-8000-00000000c85a','account',jsonb_build_object('account_code','W10C-SYN-PREPAID','name_en','Synthetic prepaid expense','name_ar','مصروف مدفوع مقدماً اصطناعي','account_type','ASSET','category','synthetic','normal_balance','DEBIT','account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE'))
  )) LOOP
    SELECT * INTO v_result FROM public.save_accounting_account(
      '00000000-0000-4000-8000-00000000c811',NULL,0,v_spec->'account',
      'Synthetic W10C chart account',NULL,(v_spec->>'request_id')::uuid);
    IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN
      RAISE EXCEPTION 'synthetic account creation failed: % / %',v_spec->>'key',v_result.error_code;
    END IF;
    INSERT INTO pg_temp.w10c_fixture_accounts(account_key,account_id,account_version)
    VALUES(v_spec->>'key',v_result.account_id,v_result.version);
  END LOOP;
  SELECT account_id INTO v_cash FROM pg_temp.w10c_fixture_accounts WHERE account_key='cash';
  SELECT account_id INTO v_founder FROM pg_temp.w10c_fixture_accounts WHERE account_key='founder';
  SELECT account_id INTO v_bank FROM pg_temp.w10c_fixture_accounts WHERE account_key='bank';
  SELECT account_id INTO v_equity FROM pg_temp.w10c_fixture_accounts WHERE account_key='equity';
  SELECT account_id INTO v_ar FROM pg_temp.w10c_fixture_accounts WHERE account_key='ar';
  SELECT account_id INTO v_revenue FROM pg_temp.w10c_fixture_accounts WHERE account_key='revenue';
  SELECT account_id INTO v_expense FROM pg_temp.w10c_fixture_accounts WHERE account_key='expense';
  SELECT account_id INTO v_ap FROM pg_temp.w10c_fixture_accounts WHERE account_key='ap';
  SELECT account_id INTO v_employee FROM pg_temp.w10c_fixture_accounts WHERE account_key='employee';
  SELECT account_id INTO v_fixed FROM pg_temp.w10c_fixture_accounts WHERE account_key='fixed';
  SELECT account_id INTO v_prepaid FROM pg_temp.w10c_fixture_accounts WHERE account_key='prepaid';

  v_period:=jsonb_build_object('start_date','2501-01-01','end_date','2501-01-31','status','OPEN');
  SELECT * INTO v_result FROM public.save_accounting_period(
    '00000000-0000-4000-8000-00000000c811',NULL,0,v_period,
    'Synthetic W10C inception period',NULL,'00000000-0000-4000-8000-00000000c870');
  IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN
    RAISE EXCEPTION 'synthetic inception period creation failed: %',v_result.error_code;
  END IF;
  v_period_id:=v_result.period_id;

  FOR v_spec IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('key','founder-funding','item_id','00000000-0000-4000-8000-00000000c880','evidence_id','00000000-0000-4000-8000-00000000c860','evidence_type','FOUNDER_AGREEMENT','category','FOUNDER_SOURCE','party','FOUNDER','party_reference','W10C-SYN-FOUNDER-1','reference','W10C-SYN-RECON-FOUNDER','debit_key','cash','credit_key','founder','amount','100000','accounting_date','2501-01-15','classification','RECONSTRUCTED_HISTORY'),
    jsonb_build_object('key','bank-opening','item_id','00000000-0000-4000-8000-00000000c881','evidence_id','00000000-0000-4000-8000-00000000c861','evidence_type','BANK_STATEMENT','category','BANK_CASH','party','BANK','party_reference','W10C-SYN-BANK-1','reference','W10C-SYN-RECON-BANK','debit_key','bank','credit_key','equity','amount','250000','accounting_date','2501-01-31','classification','OPENING_BALANCE'),
    jsonb_build_object('key','receivable','item_id','00000000-0000-4000-8000-00000000c882','evidence_id','00000000-0000-4000-8000-00000000c862','evidence_type','RECEIVABLE_DETAIL','category','ACCOUNTS_RECEIVABLE','party','CUSTOMER','party_reference','W10C-SYN-CUSTOMER-1','reference','W10C-SYN-RECON-AR','debit_key','ar','credit_key','revenue','amount','30000','accounting_date','2501-01-31','classification','OPENING_BALANCE'),
    jsonb_build_object('key','payable','item_id','00000000-0000-4000-8000-00000000c883','evidence_id','00000000-0000-4000-8000-00000000c863','evidence_type','PAYABLE_DETAIL','category','ACCOUNTS_PAYABLE','party','SUPPLIER','party_reference','W10C-SYN-SUPPLIER-1','reference','W10C-SYN-RECON-AP','debit_key','expense','credit_key','ap','amount','20000','accounting_date','2501-01-31','classification','OPENING_BALANCE'),
    jsonb_build_object('key','employee-accountability','item_id','00000000-0000-4000-8000-00000000c884','evidence_id','00000000-0000-4000-8000-00000000c864','evidence_type','EMPLOYEE_ACCOUNTABILITY','category','EMPLOYEE_ACCOUNTABILITY','party','EMPLOYEE','party_reference','W10C-SYN-EMPLOYEE-1','reference','W10C-SYN-RECON-EMPLOYEE','debit_key','employee','credit_key','cash','amount','5000','accounting_date','2501-01-31','classification','OPENING_BALANCE'),
    jsonb_build_object('key','fixed-asset','item_id','00000000-0000-4000-8000-00000000c885','evidence_id','00000000-0000-4000-8000-00000000c865','evidence_type','FIXED_ASSET_SUPPORT','category','ASSET','party','NONE','party_reference',NULL,'reference','W10C-SYN-RECON-FIXED','debit_key','fixed','credit_key','equity','amount','10000','accounting_date','2501-01-31','classification','OPENING_BALANCE'),
    jsonb_build_object('key','prepayment','item_id','00000000-0000-4000-8000-00000000c886','evidence_id','00000000-0000-4000-8000-00000000c866','evidence_type','PREPAYMENT_SUPPORT','category','ASSET','party','NONE','party_reference',NULL,'reference','W10C-SYN-RECON-PREPAID','debit_key','prepaid','credit_key','cash','amount','7000','accounting_date','2501-01-31','classification','OPENING_BALANCE')
  )) LOOP
    SELECT account_id,account_version INTO v_debit_account,v_debit_version
      FROM pg_temp.w10c_fixture_accounts WHERE account_key=v_spec->>'debit_key';
    SELECT account_id,account_version INTO v_credit_account,v_credit_version
      FROM pg_temp.w10c_fixture_accounts WHERE account_key=v_spec->>'credit_key';
    v_inventory:=v_inventory||jsonb_build_array(jsonb_build_object(
      'evidence_id',v_spec->>'evidence_id','version',1,
      'evidence_type',v_spec->>'evidence_type',
      'evidence_ref','synthetic://w10c/'||(v_spec->>'key'), 'sha256',repeat('a',64)));
    v_references:=v_references||jsonb_build_array(jsonb_build_object(
      'category',v_spec->>'category','reference',v_spec->>'reference'));
    v_item:=jsonb_build_object(
      'item_id',v_spec->>'item_id','source_domain','W10C_SYNTHETIC',
      'source_record_key','W10C-SYN-SOURCE-'||(v_spec->>'key'),
      'economic_event_key','W10C-SYN-EVENT-'||(v_spec->>'key'),
      'classification',v_spec->>'classification','resolution_state','RESOLVED',
      'is_material',true,'reconciliation_category',v_spec->>'category',
      'reconciliation_reference',v_spec->>'reference','party_type',v_spec->>'party',
      'party_reference',v_spec->'party_reference','evidence_refs',jsonb_build_array(
        jsonb_build_object('evidence_id',v_spec->>'evidence_id','version',1)),
      'journal',jsonb_build_object(
        'accounting_date',v_spec->>'accounting_date','period_id',v_period_id,
        'period_version',1,'description_en','Synthetic inception '||(v_spec->>'key'),
        'description_ar','قيد افتتاحي اصطناعي','lines',jsonb_build_array(
          jsonb_build_object('account_id',v_debit_account,'account_version',v_debit_version,
            'side','DEBIT','amount_halalah',v_spec->>'amount',
            'description_en','Synthetic debit '||(v_spec->>'key'),'description_ar','مدين اصطناعي'),
          jsonb_build_object('account_id',v_credit_account,'account_version',v_credit_version,
            'side','CREDIT','amount_halalah',v_spec->>'amount',
            'description_en','Synthetic credit '||(v_spec->>'key'),'description_ar','دائن اصطناعي'))));
    v_items:=v_items||jsonb_build_array(v_item);
  END LOOP;
  v_items:=v_items||jsonb_build_array(jsonb_build_object(
    'item_id','00000000-0000-4000-8000-00000000c887','source_domain','W10C_SYNTHETIC',
    'source_record_key','W10C-SYN-SOURCE-UNRESOLVED','economic_event_key','W10C-SYN-EVENT-UNRESOLVED',
    'classification','UNRESOLVED','resolution_state','UNRESOLVED','is_material',true,
    'reconciliation_category','OTHER','reconciliation_reference',NULL,'party_type','NONE',
    'party_reference',NULL,'evidence_refs','[]'::jsonb,'journal',NULL));
  v_payload:=jsonb_build_object('accounting_start_date','2501-01-01',
    'cutover_boundary_date','2501-01-31','evidence_inventory',v_inventory,
    'items',v_items,'reconciliation_references',v_references);

  v_duplicate:=jsonb_set(v_payload,'{items,0,evidence_refs}','[]'::jsonb);
  SELECT * INTO v_result FROM public.save_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c811',NULL,0,v_duplicate,
    'Missing required inception evidence probe','00000000-0000-4000-8000-00000000c87d');
  IF v_result.error_code IS DISTINCT FROM 'evidence_required' THEN
    RAISE EXCEPTION 'material opening coverage without evidence was accepted';
  END IF;
  v_duplicate:=jsonb_set(v_payload,'{items,0,journal,lines,1,amount_halalah}',to_jsonb('99999'::text),false);
  SELECT * INTO v_result FROM public.save_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c811',NULL,0,v_duplicate,
    'Unbalanced inception journal probe','00000000-0000-4000-8000-00000000c87e');
  IF v_result.error_code IS DISTINCT FROM 'journal_unbalanced' THEN
    RAISE EXCEPTION 'unbalanced inception journal plan was accepted';
  END IF;
  v_duplicate:=jsonb_set(v_payload,'{items}',v_items||jsonb_build_array(
    (v_items->0)||jsonb_build_object('item_id','00000000-0000-4000-8000-00000000c88f')));
  SELECT * INTO v_result FROM public.save_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c811',NULL,0,v_duplicate,
    'Duplicate coverage probe','00000000-0000-4000-8000-00000000c880');
  IF v_result.error_code IS DISTINCT FROM 'duplicate_coverage' THEN
    RAISE EXCEPTION 'duplicate source coverage was accepted: %',v_result.error_code;
  END IF;
  SELECT * INTO v_result FROM public.save_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c811',NULL,0,v_payload,
    'Create synthetic inception package','00000000-0000-4000-8000-00000000c881');
  IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN
    RAISE EXCEPTION 'initial inception package save failed: %',v_result.error_code;
  END IF;
  v_package_id:=v_result.package_id;
  SELECT * INTO v_result FROM public.review_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c811',v_package_id,1,true,
    'Creator self-review probe','00000000-0000-4000-8000-00000000c882');
  IF v_result.error_code IS DISTINCT FROM 'separation_required' THEN
    RAISE EXCEPTION 'package creator could review their own work';
  END IF;
  SELECT * INTO v_result FROM public.review_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c812',v_package_id,1,true,
    'Unresolved approval probe','00000000-0000-4000-8000-00000000c883');
  IF v_result.error_code IS DISTINCT FROM 'unresolved_material_evidence' THEN
    RAISE EXCEPTION 'material unresolved coverage did not block approval';
  END IF;

  v_payload:=jsonb_set(v_payload,'{items,7,classification}','"POST_CUTOVER_SOURCE"'::jsonb);
  v_payload:=jsonb_set(v_payload,'{items,7,resolution_state}','"RESOLVED"'::jsonb);
  SELECT * INTO v_result FROM public.save_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c811',v_package_id,1,v_payload,
    'Resolve post-cutover source classification','00000000-0000-4000-8000-00000000c884');
  IF v_result.error_code IS NOT NULL OR v_result.version<>2 THEN
    RAISE EXCEPTION 'corrected package revision failed: %',v_result.error_code;
  END IF;
  v_package_version:=v_result.version;
  v_detail:=public.get_accounting_inception_package('00000000-0000-4000-8000-00000000c811',v_package_id);
  IF v_detail->>'current_version'<>'2'
     OR jsonb_array_length(v_detail->'versions')<>2
     OR jsonb_array_length(v_detail->'coverage_history')<>16
     OR v_detail->'versions'->0->'payload'->'items'->7->>'classification'<>'UNRESOLVED'
     OR v_detail->'versions'->1->'payload'->'items'->7->>'classification'<>'POST_CUTOVER_SOURCE'
     OR (SELECT count(*) FROM jsonb_array_elements(v_detail->'coverage_history') h
         WHERE h->>'item_id'='00000000-0000-4000-8000-00000000c887')<>2 THEN
    RAISE EXCEPTION 'historical package or coverage version changed';
  END IF;
  SELECT * INTO v_result FROM public.review_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c812',v_package_id,2,true,
    'Approve corrected synthetic inception','00000000-0000-4000-8000-00000000c885');
  IF v_result.error_code IS NOT NULL OR v_result.decision<>'APPROVE' THEN
    RAISE EXCEPTION 'reviewer approval failed: %',v_result.error_code;
  END IF;

  v_rule:=jsonb_build_object('rule_code','W10C_SYN_BAD_PROTECTED','name_en','Synthetic protected manual mapping','name_ar','تعيين يدوي محمي اصطناعي','is_active',true,
    'mappings',jsonb_build_array(
      jsonb_build_object('mapping_key','debit','account_id',v_ar,'account_version',1,'allowed_side','DEBIT','service_requirement','FORBIDDEN'),
      jsonb_build_object('mapping_key','credit','account_id',v_equity,'account_version',1,'allowed_side','CREDIT','service_requirement','FORBIDDEN')));
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    '00000000-0000-4000-8000-00000000c811',NULL,0,v_rule,
    'Reject protected manual posting mapping',NULL,'00000000-0000-4000-8000-00000000c886');
  IF v_result.error_code IS DISTINCT FROM 'mapping_invalid' THEN
    RAISE EXCEPTION 'protected account was accepted through W10B manual rule';
  END IF;
  v_rule:=jsonb_build_object('rule_code','W10C_SYN_MANUAL','name_en','Synthetic manual rule','name_ar','قاعدة يدوية اصطناعية','is_active',true,
    'mappings',jsonb_build_array(
      jsonb_build_object('mapping_key','debit','account_id',v_cash,'account_version',1,'allowed_side','DEBIT','service_requirement','FORBIDDEN'),
      jsonb_build_object('mapping_key','credit','account_id',v_equity,'account_version',1,'allowed_side','CREDIT','service_requirement','FORBIDDEN')));
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    '00000000-0000-4000-8000-00000000c811',NULL,0,v_rule,
    'Create manual replay probe rule',NULL,'00000000-0000-4000-8000-00000000c887');
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'manual replay probe rule failed: %',v_result.error_code; END IF;
  v_manual_rule_id:=v_result.posting_rule_id;
  v_journal:=jsonb_build_object('accounting_date','2501-01-15','period_id',v_period_id,
    'period_version',1,'posting_rule_id',v_manual_rule_id,'rule_version',1,
    'source_record_key','W10C-SYN-SOURCE-founder-funding',
    'economic_event_key','W10C-SYN-EVENT-founder-funding','posting_purpose','inception',
    'description_en','Manual replay probe','description_ar','اختبار إعادة يدوي','lines',jsonb_build_array(
      jsonb_build_object('mapping_key','debit','side','DEBIT','amount_halalah','100000','service_id',NULL,'description_en','Cash','description_ar','نقد'),
      jsonb_build_object('mapping_key','credit','side','CREDIT','amount_halalah','100000','service_id',NULL,'description_en','Loan','description_ar','قرض')));
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000c811',NULL,0,
    v_journal||jsonb_build_object('unsupported_w10c_key',true),
    'Reject unsupported W10C source-domain key',NULL,'00000000-0000-4000-8000-00000000c88b');
  IF v_result.error_code IS DISTINCT FROM 'invalid_input' THEN
    RAISE EXCEPTION 'manual journal accepted an unsupported W10C source-domain key: %',v_result.error_code;
  END IF;
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    '00000000-0000-4000-8000-00000000c811',NULL,0,v_journal,
    'Opening source replay probe',NULL,'00000000-0000-4000-8000-00000000c888');
  IF v_result.error_code IS DISTINCT FROM 'economic_effect_conflict' THEN
    RAISE EXCEPTION 'W10B manual journal replayed an inception-covered source';
  END IF;

  SELECT * INTO v_result FROM public.prepare_accounting_inception_journal(
    '00000000-0000-4000-8000-00000000c812',v_package_id,2,
    (v_items->0->>'item_id')::uuid,'Wrong preparer probe','00000000-0000-4000-8000-00000000c889');
  IF v_result.error_code IS DISTINCT FROM 'separation_required' THEN
    RAISE EXCEPTION 'reviewer was allowed to prepare the approved package';
  END IF;
  FOR v_index IN 0..6 LOOP
    v_item_id:=(v_items->v_index->>'item_id')::uuid;
    SELECT * INTO v_result FROM public.prepare_accounting_inception_journal(
      '00000000-0000-4000-8000-00000000c811',v_package_id,2,v_item_id,
      'Prepare synthetic inception item',gen_random_uuid());
    IF v_result.error_code IS NOT NULL OR v_result.status<>'DRAFT' OR v_result.version<>1 THEN
      RAISE EXCEPTION 'inception journal preparation failed for item %: %',v_item_id,v_result.error_code;
    END IF;
    INSERT INTO pg_temp.w10c_fixture_journals(item_id,journal_id,prepared_version)
    VALUES(v_item_id,v_result.journal_id,v_result.version);
  END LOOP;
  SELECT * INTO v_result FROM public.accept_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c812',v_package_id,2,
    'Premature acceptance probe',gen_random_uuid());
  IF v_result.error_code IS DISTINCT FROM 'incomplete_coverage' THEN
    RAISE EXCEPTION 'acceptance succeeded before all inception journals were posted';
  END IF;
  SELECT journal_id INTO v_journal_id FROM pg_temp.w10c_fixture_journals ORDER BY item_id LIMIT 1;
  SELECT * INTO v_result FROM public.post_accounting_inception_journal(
    '00000000-0000-4000-8000-00000000c811',v_journal_id,1,gen_random_uuid());
  IF v_result.error_code IS DISTINCT FROM 'review_required' THEN
    RAISE EXCEPTION 'preparer was allowed to post an inception journal';
  END IF;
  SELECT * INTO v_result FROM public.save_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c811',v_package_id,2,v_payload,
    'Forbidden post-link package edit',gen_random_uuid());
  IF v_result.error_code IS DISTINCT FROM 'journal_not_draft' THEN
    RAISE EXCEPTION 'package changed after an inception journal was linked';
  END IF;

  FOR v_journal_row IN SELECT * FROM pg_temp.w10c_fixture_journals ORDER BY item_id LOOP
    SELECT * INTO v_result FROM public.post_accounting_inception_journal(
      '00000000-0000-4000-8000-00000000c812',v_journal_row.journal_id,v_journal_row.prepared_version,gen_random_uuid());
    IF v_result.error_code IS NOT NULL OR v_result.status<>'POSTED' OR v_result.version<>2 THEN
      RAISE EXCEPTION 'reviewer posting failed for journal %: %',v_journal_row.journal_id,v_result.error_code;
    END IF;
    v_detail:=public.get_accounting_journal('00000000-0000-4000-8000-00000000c812',v_journal_row.journal_id);
    FOR v_version_row IN SELECT value FROM jsonb_array_elements(v_detail->'versions')
      WHERE (value->>'version')::integer=(v_detail->>'current_version')::integer LOOP
      IF v_version_row.value->>'status'<>'POSTED'
         OR v_version_row.value->>'source_domain'<>'INCEPTION' THEN
        RAISE EXCEPTION 'W10B journal is not a posted inception version';
      END IF;
      FOR v_line IN SELECT value FROM jsonb_array_elements(v_version_row.value->'lines') LOOP
        IF v_line->>'side'='DEBIT' THEN v_debits:=v_debits+(v_line->>'amount_halalah')::numeric;
        ELSE v_credits:=v_credits+(v_line->>'amount_halalah')::numeric; END IF;
        INSERT INTO pg_temp.w10c_fixture_expected_activity(account_id,debit_activity_halalah,credit_activity_halalah)
        VALUES((v_line->>'account_id')::uuid,
          CASE WHEN v_line->>'side'='DEBIT' THEN (v_line->>'amount_halalah')::numeric ELSE 0 END,
          CASE WHEN v_line->>'side'='CREDIT' THEN (v_line->>'amount_halalah')::numeric ELSE 0 END)
        ON CONFLICT(account_id) DO UPDATE SET
          debit_activity_halalah=pg_temp.w10c_fixture_expected_activity.debit_activity_halalah+EXCLUDED.debit_activity_halalah,
          credit_activity_halalah=pg_temp.w10c_fixture_expected_activity.credit_activity_halalah+EXCLUDED.credit_activity_halalah;
      END LOOP;
    END LOOP;
  END LOOP;
  IF v_debits<>422000 OR v_credits<>422000 THEN
    RAISE EXCEPTION 'posted synthetic inception journal totals differ: % / %',v_debits,v_credits;
  END IF;
  SELECT * INTO v_tb FROM public.get_accounting_trial_balance(
    '00000000-0000-4000-8000-00000000c812','2501-01-31',clock_timestamp(),NULL,0,500);
  IF NOT v_tb.is_complete OR v_tb.report->>'debits_equal_credits'<>'true'
     OR v_tb.report->>'account_count'<>'11'
     OR v_tb.report->>'debit_balance_total_halalah'<>'410000'
     OR v_tb.report->>'credit_balance_total_halalah'<>'410000' THEN
    RAISE EXCEPTION 'first Trial Balance is incomplete or unbalanced';
  END IF;
  SELECT coalesce(sum((a->>'debit_activity_halalah')::numeric),0),
         coalesce(sum((a->>'credit_activity_halalah')::numeric),0)
    INTO v_report_debits,v_report_credits FROM jsonb_array_elements(v_tb.report->'accounts') a;
  SELECT count(*) INTO v_mismatch FROM pg_temp.w10c_fixture_expected_activity e
  WHERE NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_tb.report->'accounts') a
    WHERE a->>'account_id'=e.account_id::text
      AND (a->>'debit_activity_halalah')::numeric=e.debit_activity_halalah
      AND (a->>'credit_activity_halalah')::numeric=e.credit_activity_halalah);
  IF v_mismatch<>0 OR jsonb_array_length(v_tb.report->'accounts')<>(SELECT count(*) FROM pg_temp.w10c_fixture_expected_activity)
     OR v_report_debits<>v_debits OR v_report_credits<>v_credits THEN
    RAISE EXCEPTION 'first Trial Balance does not equal the posted inception journals';
  END IF;

  SELECT * INTO v_result FROM public.reverse_accounting_journal(
    '00000000-0000-4000-8000-00000000c812',v_journal_id,v_period_id,'2501-01-31',
    'Reject inception reversal bypass','Synthetic W10C fixture',gen_random_uuid());
  IF v_result.error_code IS DISTINCT FROM 'journal_not_posted' THEN
    RAISE EXCEPTION 'W10B reversal RPC bypassed the inception-only posting boundary';
  END IF;
  SELECT * INTO v_result FROM public.accept_accounting_inception_package(
    '00000000-0000-4000-8000-00000000c812',v_package_id,2,
    'Accept synthetic first inception Trial Balance','00000000-0000-4000-8000-00000000c88a');
  IF v_result.error_code IS NOT NULL OR v_result.acceptance_id IS NULL
     OR v_result.trial_balance->>'debits_equal_credits'<>'true' THEN
    RAISE EXCEPTION 'first Trial Balance acceptance failed: %',v_result.error_code;
  END IF;
  v_acceptance_id:=v_result.acceptance_id; v_acceptance_tb:=v_result.trial_balance;
  v_detail:=public.get_accounting_inception_package('00000000-0000-4000-8000-00000000c811',v_package_id);
  IF v_detail->'acceptance'->>'acceptance_id' IS DISTINCT FROM v_acceptance_id::text
     OR v_detail->'review'->>'decision' IS DISTINCT FROM 'APPROVE'
     OR jsonb_array_length(v_detail->'review_history')<>1
     OR v_detail->'acceptance'->'trial_balance'->>'debit_balance_total_halalah'<>'410000'
     OR jsonb_array_length(v_acceptance_tb->'accounts')<>11 THEN
    RAISE EXCEPTION 'accepted package did not retain its reviewer, lineage, and first Trial Balance';
  END IF;

  BEGIN
    PERFORM 1 FROM public.accounting_inception_package_versions;
    RAISE EXCEPTION 'service_role unexpectedly read inception history directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.accounting_inception_packages(profile_id) VALUES(v_profile_id);
    RAISE EXCEPTION 'service_role unexpectedly inserted inception package rows directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF (SELECT count(*) FROM public.services)<>(SELECT service_count FROM pg_temp.w10c_fixture_source_snapshot)
     OR (SELECT coalesce(md5(string_agg(id::text,',' ORDER BY id)),md5('')) FROM public.services)
        IS DISTINCT FROM (SELECT service_ids_fingerprint FROM pg_temp.w10c_fixture_source_snapshot) THEN
    RAISE EXCEPTION 'source operational snapshot changed';
  END IF;
END;
$rpc_regression$;
RESET ROLE;
ROLLBACK;

DO $residue_assertion$
BEGIN
  IF EXISTS(SELECT 1 FROM public.app_users WHERE id BETWEEN
        '00000000-0000-4000-8000-00000000c810' AND '00000000-0000-4000-8000-00000000c813'
        OR clerk_user_id LIKE 'w10c-rollback-%')
     OR EXISTS(SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000c800')
     OR EXISTS(SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10C-SYN-%')
     OR EXISTS(SELECT 1 FROM public.accounting_period_versions WHERE start_date<='2501-01-31' AND end_date>='2501-01-01')
     OR EXISTS(SELECT 1 FROM public.accounting_posting_rules WHERE rule_code LIKE 'W10C_SYN_%')
     OR EXISTS(SELECT 1 FROM public.accounting_journal_versions WHERE source_record_key LIKE 'W10C-SYN-SOURCE-%')
     OR EXISTS(SELECT 1 FROM public.accounting_source_effects WHERE source_record_key LIKE 'W10C-SYN-SOURCE-%')
     OR EXISTS(SELECT 1 FROM public.accounting_inception_packages)
     OR EXISTS(SELECT 1 FROM public.accounting_inception_package_versions)
     OR EXISTS(SELECT 1 FROM public.accounting_inception_coverage)
     OR EXISTS(SELECT 1 FROM public.accounting_inception_coverage_versions)
     OR EXISTS(SELECT 1 FROM public.accounting_inception_reviews)
     OR EXISTS(SELECT 1 FROM public.accounting_inception_mapping_authorizations)
     OR EXISTS(SELECT 1 FROM public.accounting_inception_journal_links)
     OR EXISTS(SELECT 1 FROM public.accounting_inception_acceptances)
     OR EXISTS(SELECT 1 FROM public.accounting_capability_events
        WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000c830'
          AND '00000000-0000-4000-8000-00000000c8ff')
     OR EXISTS(SELECT 1 FROM public.accounting_foundation_events
        WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000c830'
          AND '00000000-0000-4000-8000-00000000c8ff')
     OR EXISTS(SELECT 1 FROM public.accounting_journal_events
        WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000c830'
          AND '00000000-0000-4000-8000-00000000c8ff')
     OR EXISTS(SELECT 1 FROM public.audit_logs WHERE user_id IN (
        '00000000-0000-4000-8000-00000000c810','00000000-0000-4000-8000-00000000c811',
        '00000000-0000-4000-8000-00000000c812','00000000-0000-4000-8000-00000000c813')) THEN
    RAISE EXCEPTION 'W10C rollback fixture residue detected';
  END IF;
END;
$residue_assertion$;
