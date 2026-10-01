-- W10I synthetic DEV regression only. Historical cutoffs precede live bridge sources; all fixture evidence rolls back.
BEGIN;

-- W10I CASE: capability activation
-- W10I CASE: no persistent W10I capability grant before fixture
-- W10I CASE: Admin wildcard denied
-- W10I CASE: inactive actor denied
-- W10I CASE: runtime capability grants are explicit
-- W10I CASE: close and reopen capabilities remain separate
-- W10I CASE: reason is required
-- W10I CASE: evidence reference is required
-- W10I CASE: future recorded-at cutoff rejected
-- W10I CASE: request replay is idempotent
-- W10I CASE: changed request payload rejected
-- W10I CASE: package versions are monotonic
-- W10I CASE: exact accounting period boundary
-- W10I CASE: exact recorded-at cutoff
-- W10I CASE: profile version valid at cutoff
-- W10I CASE: accepted W10C inception at cutoff
-- W10I CASE: accepted inception supports post-cutover W10H evidence
-- W10I CASE: AR reconciliation is boundary verified
-- W10I CASE: AP reconciliation is boundary verified
-- W10I CASE: employee cash reconciliation is boundary verified
-- W10I CASE: revenue reconciliation is boundary verified
-- W10I CASE: bank statement coverage includes the period
-- W10I CASE: unmatched bank movement blocks close
-- W10I CASE: close readiness
-- W10I CASE: controlled-manual draft does not block close
-- W10I CASE: trial balance debit equals credit
-- W10I CASE: profit and loss totals are complete
-- W10I CASE: balance sheet equation is zero
-- W10I CASE: statement report range is exact
-- W10I CASE: unavailable evidence is not zero
-- W10I CASE: held source evidence blocks close
-- W10I CASE: unauthorized result transfer blocks close
-- W10I CASE: close evidence fingerprint is stable
-- W10I CASE: UUID profile fingerprint handles text-backed rows
-- W10I CASE: mapping mutation makes close stale
-- W10I CASE: stale close
-- W10I CASE: stale close cannot transition period
-- W10I CASE: independent reviewer required
-- W10I CASE: close review replay is idempotent
-- W10I CASE: changed close review request rejected
-- W10I CASE: approved close records CLOSED version
-- W10I CASE: close history is immutable
-- W10I CASE: review history is immutable
-- W10I CASE: year-end close accepted
-- W10I CASE: year-end LOCK must fail
-- W10I CASE: year-end lock held
-- W10I CASE: failed year-end lock leaves CLOSED state
-- W10I CASE: earlier CLOSED period permits later LOCK
-- W10I CASE: non-year-end LOCK records LOCKED version
-- W10I CASE: closed period blocks post
-- W10I CASE: closed period blocks reversal
-- W10I CASE: locked period blocks post
-- W10I CASE: locked period blocks reversal
-- W10I CASE: W10A2 save period cannot reopen
-- W10I CASE: save period cannot reopen
-- W10I CASE: posted period boundaries are immutable
-- W10I CASE: reopen requires separate capability
-- W10I CASE: reopen requires independent review
-- W10I CASE: reopen requires separate capability
-- W10I CASE: reopen preserves prior finalization lineage
-- W10I CASE: close preserves prepared controlled-manual draft
-- W10I CASE: stale draft remains unpostable after reopen
-- W10I CASE: reopen lineage
-- W10I CASE: stale reopen package is rejected
-- W10I CASE: later period cannot close before earlier close
-- W10I CASE: later period chronology
-- W10I CASE: later finalized period blocks earlier reopen
-- W10I CASE: missing bank reconciliation blocks close
-- W10I CASE: rejected close evidence remains immutable
-- W10I CASE: reopened period can be reclosed
-- W10I CASE: close package chain is preserved
-- W10I CASE: no result-transfer journal is created
-- W10I CASE: service role cannot directly read evidence tables
-- W10I CASE: direct DML denied
-- W10I CASE: RLS forced on both evidence tables
-- W10I CASE: RPC ACL is service-role only
-- W10I CASE: internal helper ACL is postgres-only
-- W10I CASE: rollback zero residue

CREATE TEMP TABLE w10i_fixture_context (
  profile_id uuid NOT NULL,
  authority_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  inactive_id uuid NOT NULL,
  cash_account_id uuid,
  equity_account_id uuid,
  revenue_account_id uuid,
  expense_account_id uuid,
  rule_id uuid,
  mapping_set_id uuid,
  period_year_end_id uuid,
  period_january_id uuid,
  period_february_id uuid,
  opening_journal_id uuid,
  opening_journal_version integer,
  expense_journal_id uuid,
  expense_journal_version integer,
  draft_journal_id uuid,
  draft_journal_version integer,
  binding_id uuid,
  binding_version integer,
  batch_year_end_id uuid,
  batch_january_id uuid,
  batch_february_id uuid,
  line_year_end_id uuid,
  line_january_id uuid,
  reconciliation_year_end_id uuid,
  reconciliation_january_id uuid,
  stale_close_id uuid,
  close_year_end_id uuid,
  close_january_id uuid,
  lock_year_end_id uuid,
  lock_january_id uuid,
  reopen_january_id uuid,
  reopen_january_stale_id uuid,
  close_february_blocked_id uuid,
  close_february_id uuid,
  reopen_february_id uuid
);
INSERT INTO w10i_fixture_context(profile_id,authority_id,operator_id,admin_id,reviewer_id,inactive_id)
VALUES (
  '00000000-0000-4000-8000-000000000320','00000000-0000-4000-8000-000000000321',
  '00000000-0000-4000-8000-000000000322','00000000-0000-4000-8000-000000000323',
  '00000000-0000-4000-8000-000000000324','00000000-0000-4000-8000-000000000325'
);
GRANT SELECT,UPDATE ON w10i_fixture_context TO service_role;

CREATE FUNCTION pg_temp.w10i_req(p_tag integer) RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog
AS $w10i_req$ SELECT ('00000000-0000-4000-8000-'||lpad(to_hex(p_tag),12,'0'))::uuid $w10i_req$;
GRANT EXECUTE ON FUNCTION pg_temp.w10i_req(integer) TO service_role;

DO $w10i_preflight$
BEGIN
  IF EXISTS(SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10i-rollback-%')
     OR EXISTS(SELECT 1 FROM public.accounting_profiles WHERE singleton_key='g7'
       OR id='00000000-0000-4000-8000-000000000320')
     OR EXISTS(SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10I-SYN-%')
     OR EXISTS(SELECT 1 FROM public.accounting_period_versions
       WHERE start_date<='1901-02-28' AND end_date>='1900-01-01')
     OR EXISTS(SELECT 1 FROM public.accounting_journal_versions
       WHERE accounting_date BETWEEN '1900-01-01' AND '1901-02-28')
     OR EXISTS(SELECT 1 FROM public.accounting_period_close_packages
       WHERE profile_id='00000000-0000-4000-8000-000000000320') THEN
    RAISE EXCEPTION 'W10I rollback fixture collision or unexpected DEV accounting bootstrap';
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_ar_bridge_source_inventory('1900-12-31'::date,transaction_timestamp(),500))
     OR EXISTS(SELECT 1 FROM public.accounting_ap_bridge_source_inventory('1900-12-31'::date,transaction_timestamp(),500))
     OR EXISTS(SELECT 1 FROM public.accounting_expense_bridge_source_inventory('1900-12-31'::date,transaction_timestamp(),500)) THEN
    RAISE EXCEPTION 'W10I synthetic cutoff overlaps live bridge source inventory';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.company_settings WHERE setting_key='default') THEN
    RAISE EXCEPTION 'W10I rollback fixture requires default company settings';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_capability_catalog
      WHERE capability='accounting:close_period' AND enabled AND runtime_allow_grantable AND owner_slice='W10I')
     OR NOT EXISTS(SELECT 1 FROM public.accounting_capability_catalog
      WHERE capability='accounting:reopen_period' AND enabled AND runtime_allow_grantable AND owner_slice='W10I') THEN
    RAISE EXCEPTION 'W10I capability activation differs';
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_capability_events
      WHERE profile_id='00000000-0000-4000-8000-000000000320'
        AND capability IN ('accounting:close_period','accounting:reopen_period')) THEN
    RAISE EXCEPTION 'W10I persistent capability grant preflight was not empty';
  END IF;
END;
$w10i_preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
  ('00000000-0000-4000-8000-000000000321','w10i-rollback-authority','w10i-authority@example.invalid','Synthetic W10I authority','viewer',true),
  ('00000000-0000-4000-8000-000000000322','w10i-rollback-operator','w10i-operator@example.invalid','Synthetic W10I operator','viewer',true),
  ('00000000-0000-4000-8000-000000000323','w10i-rollback-admin','w10i-admin@example.invalid','Synthetic W10I admin','admin',true),
  ('00000000-0000-4000-8000-000000000324','w10i-rollback-reviewer','w10i-reviewer@example.invalid','Synthetic W10I reviewer','viewer',true),
  ('00000000-0000-4000-8000-000000000325','w10i-rollback-inactive','w10i-inactive@example.invalid','Synthetic W10I inactive actor','viewer',false);

INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT '00000000-0000-4000-8000-000000000320','g7',s.id,0
FROM public.company_settings s WHERE s.setting_key='default';
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
  reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES (
  '00000000-0000-4000-8000-000000000340','00000000-0000-4000-8000-000000000320',
  'accounting_profile_updated','accounting_profile','00000000-0000-4000-8000-000000000320',1,
  '00000000-0000-4000-8000-000000000321',pg_temp.w10i_req(1),'Synthetic W10I profile',NULL,repeat('a',64),
  'accounting_profiles/00000000-0000-4000-8000-000000000320/1',transaction_timestamp()
);
INSERT INTO public.accounting_profile_versions(
  profile_id,version,framework_key,framework_edition,policy_version,endorsement_context,
  professional_validation_state,functional_currency,fiscal_start_month,fiscal_start_day,
  fiscal_end_month,fiscal_end_day,fiscal_timezone,accounting_start_date,cutover_boundary_date,
  legal_fiscal_evidence_pending,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
  reason,created_by,created_at,foundation_event_id
) VALUES (
  '00000000-0000-4000-8000-000000000320',1,'SA_IFRS_FOR_SMES',2025,'W10I provisional policy',
  'Synthetic W10I rollback fixture','DEFERRED','SAR',1,1,12,31,'Asia/Riyadh','1899-01-01','1900-01-01',
  true,'not_registered','INACTIVE','INACTIVE','DEV_PROVISIONAL','1899-01-01T00:00:00+03:00'::timestamptz,
  'Synthetic W10I profile','00000000-0000-4000-8000-000000000321',transaction_timestamp(),
  '00000000-0000-4000-8000-000000000340'
);
UPDATE public.accounting_profiles SET current_version=1 WHERE id='00000000-0000-4000-8000-000000000320';
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
  reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES (
  '00000000-0000-4000-8000-000000000342','00000000-0000-4000-8000-000000000320',
  'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-000000000341',1,
  '00000000-0000-4000-8000-000000000321',pg_temp.w10i_req(2),'Synthetic authority bootstrap',NULL,repeat('b',64),
  'accounting:manage_authority',transaction_timestamp()
);
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,reason,evidence_ref,
  request_id,payload_fingerprint,foundation_event_id,created_at
) VALUES (
  '00000000-0000-4000-8000-000000000341','00000000-0000-4000-8000-000000000320',
  '00000000-0000-4000-8000-000000000321','accounting:manage_authority',1,'ALLOW',NULL,
  '00000000-0000-4000-8000-000000000321','Synthetic authority bootstrap',NULL,pg_temp.w10i_req(2),
  repeat('b',64),'00000000-0000-4000-8000-000000000342',transaction_timestamp()
);

SET LOCAL ROLE service_role;
DO $w10i_setup$
DECLARE
  c record; assigned record; r record; result record; inception_result record;
  mapping jsonb; account_payload jsonb; inception_payload jsonb; inception_package_id uuid;
  caps text[]; cap text; tag integer:=20; entries jsonb; rule_payload jsonb; journal_payload jsonb;
BEGIN
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  IF public.get_accounting_capability(c.admin_id,'accounting:close_period') IS DISTINCT FROM false
     OR public.get_accounting_capability(c.admin_id,'accounting:reopen_period') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'W10I Admin wildcard inherited period close authority';
  END IF;
  caps:=ARRAY['accounting:view','accounting:view_statements','accounting:manage_chart',
    'accounting:manage_periods','accounting:prepare_journal','accounting:post_journal',
    'accounting:reconcile_bank','accounting:reverse_journal','accounting:close_period','accounting:reopen_period',
    'accounting:manage_inception','accounting:manage_ar_bridge','accounting:manage_ap_bridge',
    'accounting:manage_expense_bridge','accounting:manage_revenue_recognition'];
  FOREACH cap IN ARRAY caps LOOP
    SELECT * INTO assigned FROM public.set_accounting_capability(c.authority_id,c.operator_id,cap,'ALLOW',NULL,0,
      'Synthetic W10I operator authority','synthetic://w10i/authority/operator/'||cap,pg_temp.w10i_req(tag));
    IF assigned.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I operator capability % failed: %',cap,assigned.error_code; END IF;
    tag:=tag+1;
  END LOOP;
  FOREACH cap IN ARRAY ARRAY['accounting:view','accounting:view_statements','accounting:reconcile_bank',
      'accounting:close_period','accounting:reopen_period','accounting:manage_inception',
      'accounting:post_journal'] LOOP
    SELECT * INTO assigned FROM public.set_accounting_capability(c.authority_id,c.reviewer_id,cap,'ALLOW',NULL,0,
      'Synthetic W10I independent reviewer authority','synthetic://w10i/authority/reviewer/'||cap,pg_temp.w10i_req(tag));
    IF assigned.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I reviewer capability % failed: %',cap,assigned.error_code; END IF;
    tag:=tag+1;
  END LOOP;

  account_payload:=jsonb_build_object('account_code','W10I-SYN-CASH','name_en','W10I Synthetic Cash',
    'name_ar','نقد W10I اصطناعي','account_type','ASSET','category','synthetic','normal_balance','DEBIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10I cash account','synthetic://w10i/chart/cash',pg_temp.w10i_req(100));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I cash account failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET cash_account_id=r.account_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  account_payload:=jsonb_build_object('account_code','W10I-SYN-EQUITY','name_en','W10I Synthetic Equity',
    'name_ar','حقوق ملكية W10I اصطناعية','account_type','EQUITY','category','synthetic','normal_balance','CREDIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10I equity account','synthetic://w10i/chart/equity',pg_temp.w10i_req(101));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I equity account failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET equity_account_id=r.account_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  account_payload:=jsonb_build_object('account_code','W10I-SYN-REVENUE','name_en','W10I Synthetic Revenue',
    'name_ar','إيراد W10I اصطناعي','account_type','REVENUE','category','synthetic','normal_balance','CREDIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10I revenue account','synthetic://w10i/chart/revenue',pg_temp.w10i_req(102));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I revenue account failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET revenue_account_id=r.account_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  account_payload:=jsonb_build_object('account_code','W10I-SYN-EXPENSE','name_en','W10I Synthetic Expense',
    'name_ar','مصروف W10I اصطناعي','account_type','EXPENSE','category','synthetic','normal_balance','DEBIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10I expense account','synthetic://w10i/chart/expense',pg_temp.w10i_req(103));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I expense account failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET expense_account_id=r.account_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;

  SELECT * INTO r FROM public.save_accounting_period(c.operator_id,NULL,0,
    jsonb_build_object('start_date','1900-01-01','end_date','1900-12-31','status','OPEN'),
    'Create W10I year-end period','synthetic://w10i/period/year-end',pg_temp.w10i_req(110));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I year-end period failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET period_year_end_id=r.period_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  SELECT * INTO r FROM public.save_accounting_period(c.operator_id,NULL,0,
    jsonb_build_object('start_date','1901-01-01','end_date','1901-01-31','status','OPEN'),
    'Create W10I January period','synthetic://w10i/period/january',pg_temp.w10i_req(111));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I January period failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET period_january_id=r.period_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  SELECT * INTO r FROM public.save_accounting_period(c.operator_id,NULL,0,
    jsonb_build_object('start_date','1901-02-01','end_date','1901-02-28','status','OPEN'),
    'Create W10I February period','synthetic://w10i/period/february',pg_temp.w10i_req(112));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I February period failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET period_february_id=r.period_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;

  rule_payload:=jsonb_build_object('rule_code','W10I_SYN_MANUAL','name_en','W10I Synthetic Manual Rule',
    'name_ar','قاعدة يدوية اصطناعية W10I','is_active',true,'mappings',jsonb_build_array(
      jsonb_build_object('mapping_key','cash','account_id',c.cash_account_id,'account_version',1,'allowed_side','EITHER','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','equity','account_id',c.equity_account_id,'account_version',1,'allowed_side','CREDIT','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','revenue','account_id',c.revenue_account_id,'account_version',1,'allowed_side','CREDIT','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','expense','account_id',c.expense_account_id,'account_version',1,'allowed_side','DEBIT','service_requirement','OPTIONAL')));
  SELECT * INTO r FROM public.save_accounting_posting_rule(c.operator_id,NULL,0,rule_payload,
    'Create W10I posting rule','synthetic://w10i/posting-rule/1',pg_temp.w10i_req(120));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I posting rule failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET rule_id=r.posting_rule_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;

  inception_payload:=jsonb_build_object(
    'accounting_start_date','1899-01-01','cutover_boundary_date','1900-01-01',
    'evidence_inventory',jsonb_build_array(jsonb_build_object(
      'evidence_id','00000000-0000-4000-8000-000000000327','version',1,
      'evidence_type','BANK_STATEMENT','evidence_ref','synthetic://w10i/inception/opening-bank',
      'sha256',repeat('c',64))),
    'items',jsonb_build_array(jsonb_build_object(
      'item_id','00000000-0000-4000-8000-000000000326','source_domain','W10I_SYNTHETIC',
      'source_record_key','W10I-INCEPTION-OPENING-1','economic_event_key','W10I-INCEPTION-OPENING-1',
      'classification','OPENING_BALANCE','resolution_state','RESOLVED','is_material',true,
      'reconciliation_category','BANK_CASH','reconciliation_reference','W10I-SYN-RECON-BANK-OPENING',
      'party_type','BANK','party_reference','W10I-SYN-BANK-OPENING',
      'evidence_refs',jsonb_build_array(jsonb_build_object(
        'evidence_id','00000000-0000-4000-8000-000000000327','version',1)),
      'journal',jsonb_build_object('accounting_date','1900-01-01','period_id',c.period_year_end_id,
        'period_version',1,'description_en','W10I accepted opening cash','description_ar','نقد افتتاحي معتمد W10I',
        'lines',jsonb_build_array(
          jsonb_build_object('account_id',c.cash_account_id,'account_version',1,'side','DEBIT',
            'amount_halalah','100000','description_en','Opening cash','description_ar','نقد افتتاحي'),
          jsonb_build_object('account_id',c.equity_account_id,'account_version',1,'side','CREDIT',
            'amount_halalah','100000','description_en','Opening equity','description_ar','حقوق ملكية افتتاحية'))))),
    'reconciliation_references',jsonb_build_array(jsonb_build_object(
      'category','BANK_CASH','reference','W10I-SYN-RECON-BANK-OPENING')));
  SELECT * INTO r FROM public.save_accounting_inception_package(c.operator_id,NULL,0,inception_payload,
    'Prepare W10I accepted inception package',pg_temp.w10i_req(124));
  IF r.error_code IS NOT NULL OR r.version<>1 THEN RAISE EXCEPTION 'W10I inception package prepare failed: %',r.error_code; END IF;
  inception_package_id:=r.package_id;
  SELECT * INTO r FROM public.review_accounting_inception_package(c.reviewer_id,inception_package_id,1,true,
    'Approve W10I opening inception',pg_temp.w10i_req(125));
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVE' THEN RAISE EXCEPTION 'W10I inception review failed: %',r.error_code; END IF;
  SELECT * INTO r FROM public.prepare_accounting_inception_journal(c.operator_id,inception_package_id,1,
    '00000000-0000-4000-8000-000000000326','Prepare W10I inception journal',pg_temp.w10i_req(126));
  IF r.error_code IS NOT NULL OR r.status<>'DRAFT' THEN RAISE EXCEPTION 'W10I inception journal prepare failed: %',r.error_code; END IF;
  SELECT * INTO result FROM public.post_accounting_inception_journal(c.reviewer_id,r.journal_id,r.version,pg_temp.w10i_req(127));
  IF result.error_code IS NOT NULL OR result.status<>'POSTED' THEN RAISE EXCEPTION 'W10I inception journal post failed: %',result.error_code; END IF;
  UPDATE w10i_fixture_context SET opening_journal_id=r.journal_id,opening_journal_version=result.version WHERE profile_id=c.profile_id;
  SELECT * INTO inception_result FROM public.accept_accounting_inception_package(c.reviewer_id,inception_package_id,1,
    'Accept W10I opening inception',pg_temp.w10i_req(128));
  IF inception_result.error_code IS NOT NULL OR inception_result.acceptance_id IS NULL THEN
    RAISE EXCEPTION 'W10I inception acceptance failed: %',inception_result.error_code;
  END IF;
  SELECT * INTO STRICT c FROM w10i_fixture_context;

  journal_payload:=jsonb_build_object('accounting_date','1901-01-15','period_id',c.period_january_id,'period_version',1,
    'posting_rule_id',c.rule_id,'rule_version',1,'source_record_key','W10I-EXPENSE-1','economic_event_key','W10I-EXPENSE-1',
    'posting_purpose','synthetic-service-expense','description_en','W10I operating expense','description_ar','مصروف تشغيل W10I',
    'lines',jsonb_build_array(
      jsonb_build_object('mapping_key','expense','side','DEBIT','amount_halalah','5000','service_id',NULL,'description_en','Expense','description_ar','مصروف'),
      jsonb_build_object('mapping_key','cash','side','CREDIT','amount_halalah','5000','service_id',NULL,'description_en','Cash','description_ar','نقد')));
  SELECT * INTO r FROM public.prepare_accounting_journal(c.operator_id,NULL,0,journal_payload,
    'Prepare W10I January expense','synthetic://w10i/journal/expense',pg_temp.w10i_req(132));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I expense journal prepare failed: %',r.error_code; END IF;
  SELECT * INTO result FROM public.post_accounting_journal(c.operator_id,r.journal_id,r.version,pg_temp.w10i_req(133));
  IF result.error_code IS NOT NULL OR result.status<>'POSTED' THEN RAISE EXCEPTION 'W10I expense journal post failed: %',result.error_code; END IF;
  UPDATE w10i_fixture_context SET expense_journal_id=r.journal_id,expense_journal_version=result.version WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  journal_payload:=jsonb_set(journal_payload,'{source_record_key}',to_jsonb('W10I-DRAFT-1'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{economic_event_key}',to_jsonb('W10I-DRAFT-1'::text),false);
  SELECT * INTO r FROM public.prepare_accounting_journal(c.operator_id,NULL,0,journal_payload,
    'Prepare W10I pending January journal','synthetic://w10i/journal/draft',pg_temp.w10i_req(134));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I pending journal prepare failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET draft_journal_id=r.journal_id,draft_journal_version=r.version WHERE profile_id=c.profile_id;

  SELECT * INTO STRICT c FROM w10i_fixture_context;
  entries:=jsonb_build_array(
    jsonb_build_object('account_id',c.cash_account_id,'account_version',1,'statement_type','BALANCE_SHEET','section_key','ASSETS','line_key','CASH','label_en','Cash','label_ar','النقد','display_order',10),
    jsonb_build_object('account_id',c.equity_account_id,'account_version',1,'statement_type','BALANCE_SHEET','section_key','EQUITY','line_key','OPENING_EQUITY','label_en','Opening equity','label_ar','حقوق الملكية الافتتاحية','display_order',20),
    jsonb_build_object('account_id',c.revenue_account_id,'account_version',1,'statement_type','PROFIT_LOSS','section_key','REVENUE','line_key','SERVICE_REVENUE','label_en','Service revenue','label_ar','إيرادات الخدمات','display_order',10),
    jsonb_build_object('account_id',c.expense_account_id,'account_version',1,'statement_type','PROFIT_LOSS','section_key','EXPENSE','line_key','OPERATING_EXPENSE','label_en','Operating expense','label_ar','مصروفات التشغيل','display_order',20));
  mapping:=public.save_accounting_statement_mapping(c.operator_id,c.profile_id,NULL,0,
    '1899-01-01T00:00:00+03:00'::timestamptz,'Create W10I statement mapping',
    'synthetic://w10i/mapping/version-1',entries,pg_temp.w10i_req(140));
  IF (mapping->>'version')::integer<>1 THEN RAISE EXCEPTION 'W10I statement mapping version 1 failed'; END IF;
  UPDATE w10i_fixture_context SET mapping_set_id=(mapping->>'mapping_set_id')::uuid WHERE profile_id=c.profile_id;
END;
$w10i_setup$;

DO $w10i_bank_setup$
DECLARE c record; b record; r record; g record; cutoff timestamptz;
BEGIN
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  SELECT * INTO b FROM public.save_accounting_bank_binding(c.operator_id,NULL,0,c.cash_account_id,1,
    'synthetic://w10i/bank/source',repeat('b',64),'1900-01-01',NULL,'****1030',
    'synthetic://w10i/bank/binding',repeat('e',64),'Prepare W10I bank binding',pg_temp.w10i_req(200));
  IF b.error_code IS NOT NULL OR b.status<>'PREPARED' THEN RAISE EXCEPTION 'W10I bank binding prepare failed: %',b.error_code; END IF;
  SELECT * INTO r FROM public.review_accounting_bank_binding(c.reviewer_id,b.binding_id,b.version,true,
    'Approve W10I bank binding',pg_temp.w10i_req(201));
  IF r.error_code IS NOT NULL OR r.status<>'APPROVED' THEN RAISE EXCEPTION 'W10I bank binding review failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET binding_id=b.binding_id,binding_version=r.version WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;

  SELECT * INTO b FROM public.save_accounting_bank_statement_batch(c.operator_id,NULL,0,c.binding_id,c.binding_version,
    'synthetic://w10i/bank/statement/year-end',repeat('1',64),'W10I-STATEMENT-YEAR-END',
    '1900-01-01','1900-12-31',0,100000,'Record W10I year-end statement',pg_temp.w10i_req(202));
  IF b.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I year-end bank batch failed: %',b.error_code; END IF;
  UPDATE w10i_fixture_context SET batch_year_end_id=b.batch_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  SELECT * INTO b FROM public.save_accounting_bank_statement_line(c.operator_id,NULL,0,c.batch_year_end_id,b.version,
    'W10I-BANK-DEPOSIT','1900-01-02','1900-01-02',100000,'DEP-1','Opening deposit','w10i-row-deposit',repeat('2',64),
    'Record W10I deposit',pg_temp.w10i_req(203));
  IF b.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I deposit line failed: %',b.error_code; END IF;
  UPDATE w10i_fixture_context SET line_year_end_id=b.line_id WHERE profile_id=c.profile_id;

  SELECT * INTO STRICT c FROM w10i_fixture_context;
  SELECT * INTO b FROM public.save_accounting_bank_statement_batch(c.operator_id,NULL,0,c.binding_id,c.binding_version,
    'synthetic://w10i/bank/statement/january',repeat('3',64),'W10I-STATEMENT-JANUARY',
    '1901-01-01','1901-01-31',100000,95000,'Record W10I January statement',pg_temp.w10i_req(204));
  IF b.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I January bank batch failed: %',b.error_code; END IF;
  UPDATE w10i_fixture_context SET batch_january_id=b.batch_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  SELECT * INTO b FROM public.save_accounting_bank_statement_line(c.operator_id,NULL,0,c.batch_january_id,b.version,
    'W10I-BANK-EXPENSE','1901-01-15','1901-01-15',-5000,'EXP-1','January expense payment','w10i-row-expense',repeat('4',64),
    'Record W10I expense payment',pg_temp.w10i_req(205));
  IF b.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I January expense line failed: %',b.error_code; END IF;
  UPDATE w10i_fixture_context SET line_january_id=b.line_id WHERE profile_id=c.profile_id;

  SELECT * INTO STRICT c FROM w10i_fixture_context;
  cutoff:=clock_timestamp();
  SELECT * INTO g FROM public.prepare_accounting_bank_reconciliation(c.operator_id,NULL,0,c.binding_id,c.binding_version,
    '1900-12-31',cutoff,jsonb_build_array(jsonb_build_object('statement_line_id',c.line_year_end_id,
      'statement_line_version',1,'ledger_journal_id',c.opening_journal_id,'ledger_journal_version',c.opening_journal_version,
      'ledger_line_number',1,'statement_allocated_halalah',100000,'ledger_allocated_halalah',100000,'rationale','Opening deposit')),
    'Prepare W10I year-end bank reconciliation','synthetic://w10i/bank/reconcile/year-end',pg_temp.w10i_req(207));
  IF g.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I year-end reconciliation prepare failed: %',g.error_code; END IF;
  SELECT * INTO r FROM public.review_accounting_bank_reconciliation(c.reviewer_id,g.group_id,g.version,true,
    'Approve W10I year-end reconciliation',pg_temp.w10i_req(208));
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVED' THEN RAISE EXCEPTION 'W10I year-end reconciliation review failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET reconciliation_year_end_id=g.group_id WHERE profile_id=c.profile_id;

  SELECT * INTO STRICT c FROM w10i_fixture_context;
  cutoff:=clock_timestamp();
  SELECT * INTO g FROM public.prepare_accounting_bank_reconciliation(c.operator_id,NULL,0,c.binding_id,c.binding_version,
    '1901-01-31',cutoff,jsonb_build_array(jsonb_build_object('statement_line_id',c.line_january_id,
      'statement_line_version',1,'ledger_journal_id',c.expense_journal_id,'ledger_journal_version',c.expense_journal_version,
      'ledger_line_number',2,'statement_allocated_halalah',-5000,'ledger_allocated_halalah',-5000,'rationale','January payment')),
    'Prepare W10I January bank reconciliation','synthetic://w10i/bank/reconcile/january',pg_temp.w10i_req(209));
  IF g.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I January reconciliation prepare failed: %',g.error_code; END IF;
  SELECT * INTO r FROM public.review_accounting_bank_reconciliation(c.reviewer_id,g.group_id,g.version,true,
    'Approve W10I January reconciliation',pg_temp.w10i_req(210));
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVED' THEN RAISE EXCEPTION 'W10I January reconciliation review failed: %',r.error_code; END IF;
  UPDATE w10i_fixture_context SET reconciliation_january_id=g.group_id WHERE profile_id=c.profile_id;
END;
$w10i_bank_setup$;

DO $w10i_readiness_and_stale$
DECLARE c record; cutoff timestamptz; p record; r record; mapping jsonb; entries jsonb; report jsonb; read_model jsonb;
BEGIN
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_year_end_id,1,'CLOSE',
    'Prepare stale W10I year-end close','synthetic://w10i/close/stale',cutoff,pg_temp.w10i_req(300));
  IF p.error_code IS NOT NULL OR p.package_state<>'PREPARED' THEN RAISE EXCEPTION 'W10I stale close prepare failed: %',p.error_code; END IF;
  IF p.evidence_snapshot->>'state'<>'READY'
     OR p.evidence_snapshot->'exception_codes' ? 'UNAUTHORIZED_RESULT_TRANSFER_SOURCE_PRESENT'
     OR p.evidence_snapshot->>'accounting_cutoff'<>'1900-12-31'
     OR (p.evidence_snapshot->>'recorded_at_cutoff')::timestamptz IS DISTINCT FROM cutoff
     OR p.evidence_snapshot->'inception'->>'state'<>'NOT_REQUIRED'
     OR p.evidence_snapshot->'reports'->'trial_balance'->'totals'->>'debits_equal_credits'<>'true'
     OR p.evidence_snapshot->'reports'->'balance_sheet'->'totals'->>'equation_difference_halalah'<>'0' THEN
    RAISE EXCEPTION 'W10I close evidence was not exact and fully ready: %',p.evidence_snapshot;
  END IF;
  UPDATE w10i_fixture_context SET stale_close_id=p.package_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  SELECT * INTO r FROM public.review_accounting_period_close(c.operator_id,p.package_id,p.package_version,true,
    'Self review must fail','00000000-0000-4000-8000-000000000330');
  IF r.error_code IS DISTINCT FROM 'independent_review_required' THEN RAISE EXCEPTION 'W10I self review was accepted'; END IF;
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_year_end_id,1,'CLOSE',
    'Prepare stale W10I year-end close','synthetic://w10i/close/stale',cutoff,pg_temp.w10i_req(300));
  IF p.error_code IS NOT NULL OR NOT p.idempotent_replay THEN RAISE EXCEPTION 'W10I exact package replay was not idempotent'; END IF;
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_year_end_id,1,'CLOSE',
    'Changed W10I close payload','synthetic://w10i/close/stale',cutoff,pg_temp.w10i_req(300));
  IF p.error_code IS DISTINCT FROM 'request_payload_conflict' THEN RAISE EXCEPTION 'W10I changed package retry was accepted'; END IF;
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_year_end_id,1,'CLOSE',
    'Missing evidence probe','',clock_timestamp(),pg_temp.w10i_req(310));
  IF p.error_code IS DISTINCT FROM 'invalid_input' THEN RAISE EXCEPTION 'W10I empty evidence reference was accepted'; END IF;
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_year_end_id,1,'CLOSE',
    'Future cutoff probe','synthetic://w10i/future',clock_timestamp()+interval '1 day',pg_temp.w10i_req(311));
  IF p.error_code IS DISTINCT FROM 'invalid_input' THEN RAISE EXCEPTION 'W10I future cutoff was accepted'; END IF;
  SELECT * INTO r FROM public.prepare_accounting_period_close(c.inactive_id,c.period_year_end_id,1,'CLOSE',
    'Inactive actor probe','synthetic://w10i/inactive',cutoff,pg_temp.w10i_req(312));
  IF r.error_code IS DISTINCT FROM 'actor_inactive' THEN RAISE EXCEPTION 'W10I inactive actor was accepted'; END IF;

  entries:=jsonb_build_array(
    jsonb_build_object('account_id',c.cash_account_id,'account_version',1,'statement_type','BALANCE_SHEET','section_key','ASSETS','line_key','CASH','label_en','Cash revised','label_ar','النقد المعدل','display_order',10),
    jsonb_build_object('account_id',c.equity_account_id,'account_version',1,'statement_type','BALANCE_SHEET','section_key','EQUITY','line_key','OPENING_EQUITY','label_en','Opening equity','label_ar','حقوق الملكية الافتتاحية','display_order',20),
    jsonb_build_object('account_id',c.revenue_account_id,'account_version',1,'statement_type','PROFIT_LOSS','section_key','REVENUE','line_key','SERVICE_REVENUE','label_en','Service revenue','label_ar','إيرادات الخدمات','display_order',10),
    jsonb_build_object('account_id',c.expense_account_id,'account_version',1,'statement_type','PROFIT_LOSS','section_key','EXPENSE','line_key','OPERATING_EXPENSE','label_en','Operating expense','label_ar','مصروفات التشغيل','display_order',20));
  mapping:=public.save_accounting_statement_mapping(c.operator_id,c.profile_id,c.mapping_set_id,1,
    '1899-02-01T00:00:00+03:00'::timestamptz,'Revise W10I statement mapping after close preparation',
    'synthetic://w10i/mapping/version-2',entries,pg_temp.w10i_req(141));
  IF mapping->>'version'<>'2' THEN RAISE EXCEPTION 'W10I mapping version 2 was not saved'; END IF;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,c.stale_close_id,1,true,
    'Detect W10I mapping mutation',pg_temp.w10i_req(313));
  IF r.error_code IS DISTINCT FROM 'close_package_stale' OR r.decision<>'STALE' THEN
    RAISE EXCEPTION 'W10I stale close review was accepted: % / %',r.error_code,r.decision;
  END IF;
  read_model:=public.get_accounting_period_close_evidence(c.operator_id,c.period_year_end_id,clock_timestamp());
  IF read_model->>'state'<>'READY' OR read_model->'period'->>'status'<>'OPEN'
      OR read_model->'current_period'->>'status'<>'OPEN' THEN RAISE EXCEPTION 'W10I open period read model differs'; END IF;

  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_year_end_id,1,'CLOSE',
    'Prepare W10I year-end close','synthetic://w10i/close/year-end',cutoff,pg_temp.w10i_req(314));
  IF p.error_code IS NOT NULL OR p.evidence_snapshot->>'state'<>'READY'
     OR COALESCE(p.evidence_snapshot->'exception_codes' ? 'UNAUTHORIZED_RESULT_TRANSFER_SOURCE_PRESENT',true) THEN
    RAISE EXCEPTION 'W10I year-end close readiness failed or unauthorized result transfer was detected: %',p.error_code;
  END IF;
  UPDATE w10i_fixture_context SET close_year_end_id=p.package_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  SELECT * INTO r FROM public.review_accounting_period_close(c.operator_id,p.package_id,p.package_version,true,
    'W10I independent close review','00000000-0000-4000-8000-000000000331');
  IF r.error_code IS DISTINCT FROM 'independent_review_required' THEN RAISE EXCEPTION 'W10I preparer reviewed own close'; END IF;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,p.package_id,p.package_version,true,
    'Approve W10I year-end close',pg_temp.w10i_req(315));
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVED' OR r.resulting_period_version<>2 THEN
    RAISE EXCEPTION 'W10I year-end close review failed: % / %',r.error_code,r.decision;
  END IF;
  read_model:=public.get_accounting_period_close_evidence(c.operator_id,c.period_year_end_id,clock_timestamp());
  IF read_model->'current_period'->>'status'<>'CLOSED' OR read_model->'current_period'->>'version'<>'2' THEN
    RAISE EXCEPTION 'W10I approved year-end close did not record CLOSED';
  END IF;
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_year_end_id,1,'CLOSE',
    'Prepare W10I year-end close','synthetic://w10i/close/year-end',cutoff,pg_temp.w10i_req(314));
  IF p.error_code IS NOT NULL OR NOT p.idempotent_replay THEN RAISE EXCEPTION 'W10I close prepare retry failed'; END IF;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,c.close_year_end_id,p.package_version,true,
    'Approve W10I year-end close',pg_temp.w10i_req(315));
  IF r.error_code IS NOT NULL OR NOT r.idempotent_replay THEN RAISE EXCEPTION 'W10I close review retry failed'; END IF;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,c.close_year_end_id,p.package_version,true,
    'Changed W10I year-end close review',pg_temp.w10i_req(315));
  IF r.error_code IS DISTINCT FROM 'request_payload_conflict' THEN RAISE EXCEPTION 'W10I changed review retry was accepted'; END IF;
END;
$w10i_readiness_and_stale$;

DO $w10i_finalizations$
DECLARE c record; cutoff timestamptz; p record; r record; read_model jsonb; saved record; reversal record; g record; b record;
  reopen_january_package_version integer; reopen_january_stale_package_version integer;
BEGIN
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_year_end_id,2,'LOCK',
    'Prepare W10I year-end lock','synthetic://w10i/lock/year-end',cutoff,pg_temp.w10i_req(320));
  IF p.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I year-end lock prepare failed: %',p.error_code; END IF;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,p.package_id,p.package_version,true,
    'Hold W10I year-end lock','00000000-0000-4000-8000-000000000332');
  IF r.error_code IS DISTINCT FROM 'year_end_result_treatment_pending' OR r.decision<>'REJECTED' THEN
    RAISE EXCEPTION 'W10I year-end LOCK did not fail closed: % / %',r.error_code,r.decision;
  END IF;
  UPDATE w10i_fixture_context SET lock_year_end_id=p.package_id WHERE profile_id=c.profile_id;
  read_model:=public.get_accounting_period_close_evidence(c.operator_id,c.period_year_end_id,clock_timestamp());
  IF read_model->'current_period'->>'status'<>'CLOSED' THEN RAISE EXCEPTION 'W10I failed year-end lock changed period state'; END IF;

  SELECT * INTO saved FROM public.save_accounting_period(c.operator_id,c.period_year_end_id,2,
    jsonb_build_object('start_date','1900-01-01','end_date','1900-12-31','status','OPEN'),
    'Probe W10A2 direct reopen','synthetic://w10i/save-period/reopen',pg_temp.w10i_req(321));
  IF saved.error_code IS NULL THEN RAISE EXCEPTION 'W10A2 save_accounting_period reopened a W10I closed period'; END IF;

  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_february_id,1,'CLOSE',
    'Probe later close while January open','synthetic://w10i/close/february-order',clock_timestamp(),pg_temp.w10i_req(337));
  IF p.error_code IS DISTINCT FROM 'earlier_period_open' THEN RAISE EXCEPTION 'W10I later period closed before earlier period'; END IF;

  -- W10I CASE: first fiscal period accepts the fiscal-year Balance Sheet boundary
  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_january_id,1,'CLOSE',
    'Prepare W10I January close','synthetic://w10i/close/january',cutoff,pg_temp.w10i_req(330));
  IF p.error_code IS NOT NULL OR p.evidence_snapshot->>'state'<>'READY' THEN RAISE EXCEPTION 'W10I January close readiness failed: %',p.error_code; END IF;
  UPDATE w10i_fixture_context SET close_january_id=p.package_id WHERE profile_id=c.profile_id;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,p.package_id,p.package_version,true,
    'Approve W10I January close',pg_temp.w10i_req(331));
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVED' OR r.resulting_period_version<>2 THEN RAISE EXCEPTION 'W10I January close failed'; END IF;
  SELECT * INTO reversal FROM public.reverse_accounting_journal(c.operator_id,c.expense_journal_id,c.period_january_id,
    '1901-01-31','Probe W10I closed reversal','synthetic://w10i/reversal/closed',pg_temp.w10i_req(342));
  IF reversal.error_code IS DISTINCT FROM 'period_not_open' THEN
    RAISE EXCEPTION 'W10I CLOSED-period reversal expected period_not_open, got %',reversal.error_code;
  END IF;
  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_january_id,2,'LOCK',
    'Prepare W10I January lock','synthetic://w10i/lock/january',cutoff,pg_temp.w10i_req(332));
  IF p.error_code IS NOT NULL OR p.evidence_snapshot->>'state'<>'READY' THEN RAISE EXCEPTION 'W10I January lock prepare failed: %',p.error_code; END IF;
  UPDATE w10i_fixture_context SET lock_january_id=p.package_id WHERE profile_id=c.profile_id;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,p.package_id,p.package_version,true,
    'Approve W10I January lock',pg_temp.w10i_req(333));
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVED' OR r.resulting_period_version<>3 THEN RAISE EXCEPTION 'W10I January LOCK failed'; END IF;

  SELECT * INTO r FROM public.post_accounting_journal(c.operator_id,c.draft_journal_id,c.draft_journal_version,pg_temp.w10i_req(334));
  IF r.error_code IS NULL OR r.status='POSTED' THEN RAISE EXCEPTION 'W10B posted a prepared journal into LOCKED W10I period'; END IF;
  SELECT * INTO reversal FROM public.reverse_accounting_journal(c.operator_id,c.expense_journal_id,c.period_january_id,
    '1901-01-31','Probe W10I locked reversal','synthetic://w10i/reversal/locked',pg_temp.w10i_req(335));
  IF reversal.error_code IS DISTINCT FROM 'period_not_open' THEN
    RAISE EXCEPTION 'W10I LOCKED-period reversal expected period_not_open, got %',reversal.error_code;
  END IF;
  SELECT * INTO saved FROM public.save_accounting_period(c.operator_id,c.period_january_id,3,
    jsonb_build_object('start_date','1901-01-01','end_date','1901-01-31','status','OPEN'),
    'Probe W10A2 locked period reopen','synthetic://w10i/save-period/locked',pg_temp.w10i_req(336));
  IF saved.error_code IS NULL THEN RAISE EXCEPTION 'W10A2 save_accounting_period reopened a LOCKED W10I period'; END IF;

  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_january_id,3,'REOPEN',
    'Exceptional W10I January reopen','synthetic://w10i/reopen/january',cutoff,pg_temp.w10i_req(340));
  IF p.error_code IS NOT NULL OR p.package_state<>'PREPARED'
     OR p.evidence_snapshot->'prior_finalization'->>'package_kind'<>'LOCK' THEN
    RAISE EXCEPTION 'W10I reopen lineage was not captured: %',p.error_code;
  END IF;
  reopen_january_package_version:=p.package_version;
  UPDATE w10i_fixture_context SET reopen_january_id=p.package_id WHERE profile_id=c.profile_id;
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_january_id,3,'REOPEN',
    'Second exceptional W10I January reopen','synthetic://w10i/reopen/january-second',cutoff,pg_temp.w10i_req(341));
  IF p.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I second reopen preparation failed'; END IF;
  reopen_january_stale_package_version:=p.package_version;
  UPDATE w10i_fixture_context SET reopen_january_stale_id=p.package_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  SELECT * INTO r FROM public.review_accounting_period_close(c.operator_id,c.reopen_january_id,reopen_january_package_version,true,
    'Self review W10I reopen','00000000-0000-4000-8000-000000000333');
  IF r.error_code IS DISTINCT FROM 'independent_review_required' THEN
    RAISE EXCEPTION 'W10I self-review expected independent_review_required, got % (actor %, package %, package version %, request %, reason %)',
      r.error_code,c.operator_id,c.reopen_january_id,reopen_january_package_version,
      '00000000-0000-4000-8000-000000000333'::uuid,'Self review W10I reopen';
  END IF;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,c.reopen_january_id,reopen_january_package_version,true,
    'Approve W10I January reopen','00000000-0000-4000-8000-000000000334');
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVED' OR r.resulting_period_version<>4 THEN RAISE EXCEPTION 'W10I January reopen failed'; END IF;
  SELECT * INTO r FROM public.post_accounting_journal(c.operator_id,c.draft_journal_id,c.draft_journal_version,
    pg_temp.w10i_req(361));
  IF r.error_code IS NULL OR r.status='POSTED' THEN
    RAISE EXCEPTION 'W10I stale controlled-manual draft posted after reopen';
  END IF;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,c.reopen_january_stale_id,reopen_january_stale_package_version,true,
    'Reject stale W10I January reopen','00000000-0000-4000-8000-000000000335');
  IF r.error_code IS DISTINCT FROM 'close_package_stale' OR r.decision<>'STALE' THEN RAISE EXCEPTION 'W10I stale reopen package was accepted'; END IF;
  read_model:=public.get_accounting_period_close_evidence(c.operator_id,c.period_january_id,clock_timestamp());
  IF read_model->'current_period'->>'status'<>'OPEN'
     OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(read_model->'packages') AS package_item(package_json)
       WHERE package_json->>'package_kind'='REOPEN'
         AND package_json->'evidence_snapshot'->'prior_finalization'->>'package_kind'='LOCK') THEN
    RAISE EXCEPTION 'W10I reopen did not preserve immutable finalization lineage';
  END IF;
  SELECT * INTO saved FROM public.save_accounting_period(c.operator_id,c.period_january_id,4,
    jsonb_build_object('start_date','1901-01-02','end_date','1901-01-31','status','OPEN'),
    'Probe posted boundary edit','synthetic://w10i/save-period/boundary',pg_temp.w10i_req(343));
  IF saved.error_code IS NULL THEN RAISE EXCEPTION 'W10A2 changed a period boundary after posting'; END IF;

  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_january_id,4,'CLOSE',
    'Reclose W10I January','synthetic://w10i/close/january-reclose',cutoff,pg_temp.w10i_req(344));
  IF p.error_code IS NOT NULL OR p.evidence_snapshot->>'state'<>'READY' THEN RAISE EXCEPTION 'W10I January reclose prepare failed: %',p.error_code; END IF;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,p.package_id,p.package_version,true,
    'Approve W10I January reclose',pg_temp.w10i_req(345));
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVED' OR r.resulting_period_version<>5 THEN RAISE EXCEPTION 'W10I January reclose failed'; END IF;

  -- W10I CASE: later fiscal period reaches its bank blocker after accepting the fiscal-year Balance Sheet boundary
  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_february_id,1,'CLOSE',
    'Prepare incomplete W10I February close','synthetic://w10i/close/february-incomplete',cutoff,pg_temp.w10i_req(350));
  IF p.error_code IS NOT NULL OR p.evidence_snapshot->>'state'<>'BLOCKED'
     OR NOT (p.evidence_snapshot->'exception_codes' ? 'BANK_RECONCILIATION_INCOMPLETE_OR_INCOMPATIBLE') THEN
     RAISE EXCEPTION 'W10I missing February statement coverage expected BLOCKED with BANK_RECONCILIATION_INCOMPLETE_OR_INCOMPATIBLE; got error %, state %, exceptions %, reports %, mappings %',
      p.error_code,p.evidence_snapshot->>'state',p.evidence_snapshot->'exception_codes',
      p.evidence_snapshot->'reports',p.evidence_snapshot->'mapping_versions';
  END IF;
  UPDATE w10i_fixture_context SET close_february_blocked_id=p.package_id WHERE profile_id=c.profile_id;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,p.package_id,p.package_version,true,
    'Reject incomplete W10I February close',pg_temp.w10i_req(351));
  IF r.error_code IS DISTINCT FROM 'close_evidence_incomplete' OR r.decision<>'REJECTED' THEN
    RAISE EXCEPTION 'W10I incomplete evidence was approved';
  END IF;

  -- W10I CASE: February bank statement coverage is added only after proving the missing-coverage blocker
  SELECT * INTO b FROM public.save_accounting_bank_statement_batch(c.operator_id,NULL,0,c.binding_id,c.binding_version,
    'synthetic://w10i/bank/statement/february',repeat('5',64),'W10I-STATEMENT-FEBRUARY',
    '1901-02-01','1901-02-28',95000,95000,'Record W10I February statement',pg_temp.w10i_req(206));
  IF b.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10I February bank batch failed: %',b.error_code; END IF;
  UPDATE w10i_fixture_context SET batch_february_id=b.batch_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10i_fixture_context;

  -- W10I CASE: empty February coverage requires no reconciliation allocation group

  -- W10I CASE: later fiscal period accepts the fiscal-year Balance Sheet boundary
  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_february_id,1,'CLOSE',
    'Prepare W10I February close','synthetic://w10i/close/february',cutoff,pg_temp.w10i_req(354));
  IF p.error_code IS NOT NULL OR p.evidence_snapshot->>'state'<>'READY' THEN RAISE EXCEPTION 'W10I February close readiness failed: %',p.error_code; END IF;
  UPDATE w10i_fixture_context SET close_february_id=p.package_id WHERE profile_id=c.profile_id;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,p.package_id,p.package_version,true,
    'Approve W10I February close',pg_temp.w10i_req(355));
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVED' OR r.resulting_period_version<>2 THEN RAISE EXCEPTION 'W10I February close failed'; END IF;

  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_january_id,5,'REOPEN',
    'Reject reopen before later finalized period','synthetic://w10i/reopen/january-late',clock_timestamp(),pg_temp.w10i_req(356));
  IF p.error_code IS DISTINCT FROM 'later_finalized_period_exists' THEN RAISE EXCEPTION 'W10I reopened a period before a later finalization'; END IF;
  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_february_id,2,'REOPEN',
    'Reopen latest W10I February period','synthetic://w10i/reopen/february',cutoff,pg_temp.w10i_req(357));
  IF p.error_code IS NOT NULL OR p.evidence_snapshot->'prior_finalization'->>'package_kind'<>'CLOSE' THEN RAISE EXCEPTION 'W10I tail reopen lineage missing'; END IF;
  UPDATE w10i_fixture_context SET reopen_february_id=p.package_id WHERE profile_id=c.profile_id;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,p.package_id,p.package_version,true,
    'Approve W10I February reopen',pg_temp.w10i_req(358));
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVED' OR r.resulting_period_version<>3 THEN RAISE EXCEPTION 'W10I February reopen failed'; END IF;
  cutoff:=clock_timestamp();
  SELECT * INTO p FROM public.prepare_accounting_period_close(c.operator_id,c.period_february_id,3,'CLOSE',
    'Reclose W10I February','synthetic://w10i/close/february-reclose',cutoff,pg_temp.w10i_req(359));
  IF p.error_code IS NOT NULL OR p.evidence_snapshot->>'state'<>'READY' THEN RAISE EXCEPTION 'W10I February reclose prepare failed'; END IF;
  SELECT * INTO r FROM public.review_accounting_period_close(c.reviewer_id,p.package_id,p.package_version,true,
    'Approve W10I February reclose',pg_temp.w10i_req(360));
  IF r.error_code IS NOT NULL OR r.decision<>'APPROVED' OR r.resulting_period_version<>4 THEN RAISE EXCEPTION 'W10I February reclose failed'; END IF;
  read_model:=public.get_accounting_period_close_evidence(c.operator_id,c.period_february_id,clock_timestamp());
  IF jsonb_array_length(read_model->'packages')<4 OR read_model->'current_period'->>'status'<>'CLOSED' THEN
    RAISE EXCEPTION 'W10I February package chain is incomplete';
  END IF;
END;
$w10i_finalizations$;

RESET ROLE;
DO $w10i_draft_preservation$
DECLARE c record;
BEGIN
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  IF NOT EXISTS(
    SELECT 1 FROM public.accounting_journal_versions j
    JOIN public.accounting_source_effects e
      ON e.profile_id=j.profile_id AND e.journal_id=j.journal_id AND e.journal_version=j.version
    WHERE j.profile_id=c.profile_id AND j.journal_id=c.draft_journal_id
      AND j.version=c.draft_journal_version AND j.status='DRAFT' AND j.posted_at IS NULL
      AND e.status='PREPARED' AND e.source_domain='CONTROLLED_MANUAL'
  ) OR EXISTS(
    SELECT 1 FROM public.accounting_journal_versions j
    WHERE j.profile_id=c.profile_id AND j.journal_id=c.draft_journal_id AND j.status='POSTED'
  ) THEN
    RAISE EXCEPTION 'W10I close/reopen did not preserve the unposted controlled-manual draft';
  END IF;
END;
$w10i_draft_preservation$;

DO $w10i_storage_security$
DECLARE c record;
BEGIN
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_catalog.pg_class
      WHERE oid='public.accounting_period_close_packages'::regclass)
     OR NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_catalog.pg_class
      WHERE oid='public.accounting_period_close_reviews'::regclass) THEN
    RAISE EXCEPTION 'W10I close evidence tables do not force RLS';
  END IF;
  IF has_table_privilege('service_role','public.accounting_period_close_packages','SELECT')
     OR has_table_privilege('service_role','public.accounting_period_close_packages','INSERT')
     OR has_table_privilege('service_role','public.accounting_period_close_packages','UPDATE')
     OR has_table_privilege('service_role','public.accounting_period_close_packages','DELETE')
     OR has_table_privilege('service_role','public.accounting_period_close_reviews','SELECT')
     OR has_table_privilege('service_role','public.accounting_period_close_reviews','INSERT')
     OR has_table_privilege('service_role','public.accounting_period_close_reviews','UPDATE')
     OR has_table_privilege('service_role','public.accounting_period_close_reviews','DELETE') THEN
    RAISE EXCEPTION 'W10I service role gained direct evidence-table access';
  END IF;
  IF has_function_privilege('anon','public.prepare_accounting_period_close(uuid,uuid,integer,text,text,text,timestamptz,uuid)'::regprocedure,'EXECUTE')
     OR has_function_privilege('authenticated','public.prepare_accounting_period_close(uuid,uuid,integer,text,text,text,timestamptz,uuid)'::regprocedure,'EXECUTE')
     OR NOT has_function_privilege('service_role','public.prepare_accounting_period_close(uuid,uuid,integer,text,text,text,timestamptz,uuid)'::regprocedure,'EXECUTE')
     OR has_function_privilege('service_role','public.accounting_period_close_capture(uuid,uuid,timestamptz)'::regprocedure,'EXECUTE')
     OR has_function_privilege('service_role','public.accounting_period_close_live_fingerprint(uuid)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'W10I RPC or helper ACL differs';
  END IF;
END;
$w10i_storage_security$;

SET LOCAL ROLE service_role;
DO $w10i_direct_dml$
DECLARE c record; v_blocked boolean:=false; v_sqlstate text;
BEGIN
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  BEGIN
    INSERT INTO public.accounting_period_close_packages(profile_id,period_id,package_version,package_kind,
      starting_period_version,period_start_date,period_end_date,accounting_cutoff,recorded_at_cutoff,
      preparer_user_id,reason,evidence_ref,evidence_snapshot,evidence_fingerprint,ledger_fingerprint,
      request_id,request_fingerprint)
    VALUES(c.profile_id,c.period_year_end_id,999,'CLOSE',1,'1900-01-01','1900-12-31','1900-12-31',clock_timestamp(),
      c.operator_id,'DML probe','synthetic://w10i/dml','{}',repeat('f',64),repeat('e',64),
      pg_temp.w10i_req(999),repeat('d',64));
  EXCEPTION WHEN insufficient_privilege THEN
    v_blocked:=true;
    GET STACKED DIAGNOSTICS v_sqlstate=RETURNED_SQLSTATE;
  END;
  IF NOT v_blocked OR v_sqlstate<>'42501' THEN RAISE EXCEPTION 'W10I direct package DML was not denied'; END IF;
END;
$w10i_direct_dml$;
RESET ROLE;

DO $w10i_immutability$
DECLARE c record; v_blocked boolean; v_state text;
BEGIN
  SELECT * INTO STRICT c FROM w10i_fixture_context;
  v_blocked:=false;
  BEGIN
    UPDATE public.accounting_period_close_packages SET reason='tampered' WHERE id=c.close_year_end_id;
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_state=RETURNED_SQLSTATE;
    v_blocked:=v_state='55000';
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'W10I package history is mutable'; END IF;
  v_blocked:=false;
  BEGIN
    DELETE FROM public.accounting_period_close_reviews WHERE package_id=c.close_year_end_id;
  EXCEPTION WHEN others THEN
    GET STACKED DIAGNOSTICS v_state=RETURNED_SQLSTATE;
    v_blocked:=v_state='55000';
  END;
  IF NOT v_blocked THEN RAISE EXCEPTION 'W10I review history is mutable'; END IF;
END;
$w10i_immutability$;

ROLLBACK;

DO $w10i_residue_assertion$
BEGIN
  IF EXISTS(SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10i-rollback-%')
     OR EXISTS(SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-000000000320')
     OR EXISTS(SELECT 1 FROM public.accounting_capability_events WHERE profile_id='00000000-0000-4000-8000-000000000320')
     OR EXISTS(SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10I-SYN-%')
     OR EXISTS(SELECT 1 FROM public.accounting_period_close_packages WHERE profile_id='00000000-0000-4000-8000-000000000320')
     OR EXISTS(SELECT 1 FROM public.accounting_period_close_reviews WHERE profile_id='00000000-0000-4000-8000-000000000320')
     OR EXISTS(SELECT 1 FROM public.accounting_journals WHERE profile_id='00000000-0000-4000-8000-000000000320')
     OR EXISTS(SELECT 1 FROM public.accounting_bank_bindings WHERE profile_id='00000000-0000-4000-8000-000000000320') THEN
    RAISE EXCEPTION 'W10I rollback residue detected';
  END IF;
END;
$w10i_residue_assertion$;
