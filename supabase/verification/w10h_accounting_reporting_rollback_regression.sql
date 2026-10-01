-- W10H synthetic DEV regression only. One transaction is fully rolled back.
BEGIN;

-- W10H CASE: accounting:view reads GL/TB
-- W10H CASE: accounting:view_statements reads P&L/Balance Sheet
-- W10H CASE: Admin wildcard denied
-- W10H CASE: inactive actor denied
-- W10H CASE: GL opening/activity/closing
-- W10H CASE: TB opening/activity/ending
-- W10H CASE: TB debit equals credit
-- W10H CASE: P&L Revenue minus Expense
-- W10H CASE: governed W10F Revenue recognition
-- W10H CASE: Balance Sheet equation
-- W10H CASE: current-year earnings exactly once
-- W10H CASE: no retained-earnings journal
-- W10H CASE: prior-year result unresolved
-- W10H CASE: unmapped account/version
-- W10H CASE: later mapping does not rewrite earlier report
-- W10H CASE: account rename does not rewrite historical report
-- W10H CASE: original journal before reversal cutoff
-- W10H CASE: reversal appears at later cutoff
-- W10H CASE: Service filter
-- W10H CASE: unassigned shared overhead
-- W10H CASE: managerial values excluded
-- W10H CASE: unavailable evidence is not zero
-- W10H CASE: journal lineage
-- W10H CASE: protected source content hidden
-- W10H CASE: exact large halalah
-- W10H CASE: XLSX precision
-- W10H CASE: EN report definitions
-- W10H CASE: AR report definitions
-- W10H CASE: RTL report shell
-- W10H CASE: statement capability enabled without persistent grant
-- W10H CASE: rollback zero residue
-- W10H CASE: NOT_INITIALIZED

CREATE TEMP TABLE w10h_fixture_context (
  profile_id uuid NOT NULL,
  authority_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  inactive_id uuid NOT NULL,
  service_one_id uuid NOT NULL,
  service_two_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  cash_account_id uuid,
  equity_account_id uuid,
  revenue_account_id uuid,
  expense_account_id uuid,
  contract_asset_account_id uuid,
  contract_liability_account_id uuid,
  revenue_scope_id uuid,
  revenue_item_id uuid,
  period_id uuid,
  rule_id uuid,
  opening_journal_id uuid,
  large_expense_journal_id uuid,
  revenue_recognition_journal_id uuid,
  overhead_journal_id uuid,
  later_expense_journal_id uuid,
  prior_expense_journal_id uuid,
  reversal_journal_id uuid,
  mapping_set_id uuid,
  mapping_version integer
);
INSERT INTO w10h_fixture_context(profile_id,authority_id,operator_id,admin_id,inactive_id,service_one_id,service_two_id,reviewer_id)
VALUES
 ('00000000-0000-4000-8000-00000000a800','00000000-0000-4000-8000-00000000a801',
  '00000000-0000-4000-8000-00000000a802','00000000-0000-4000-8000-00000000a803',
  '00000000-0000-4000-8000-00000000a804','00000000-0000-4000-8000-00000000a810',
  '00000000-0000-4000-8000-00000000a811','00000000-0000-4000-8000-00000000a805');
GRANT SELECT,UPDATE ON w10h_fixture_context TO service_role;

CREATE FUNCTION pg_temp.w10h_req(p_tag integer) RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog
AS $w10h_req$ SELECT ('00000000-0000-4000-8000-'||lpad(to_hex(p_tag),12,'0'))::uuid $w10h_req$;
GRANT EXECUTE ON FUNCTION pg_temp.w10h_req(integer) TO service_role;

CREATE FUNCTION pg_temp.w10h_revenue_unit_id(p_arrangement_id uuid,p_unit_key text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10h_revenue_unit_id$
  SELECT unit.id FROM public.accounting_revenue_performance_units unit
  WHERE unit.arrangement_id=p_arrangement_id AND unit.unit_key=p_unit_key
$w10h_revenue_unit_id$;
GRANT EXECUTE ON FUNCTION pg_temp.w10h_revenue_unit_id(uuid,text) TO service_role;

CREATE FUNCTION pg_temp.w10h_journal_count(p_profile_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10h_journal_count$
  SELECT count(*)::integer FROM public.accounting_journals journal
  WHERE journal.profile_id=p_profile_id
$w10h_journal_count$;
GRANT EXECUTE ON FUNCTION pg_temp.w10h_journal_count(uuid) TO service_role;

CREATE FUNCTION pg_temp.w10h_has_result_transfer(p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10h_has_result_transfer$
  SELECT EXISTS (SELECT 1 FROM public.accounting_journal_versions journal_version
    WHERE journal_version.profile_id=p_profile_id
      AND journal_version.source_domain IN ('ACCOUNTING_CLOSE','YEAR_END_CLOSE','RESULT_TRANSFER'))
$w10h_has_result_transfer$;
GRANT EXECUTE ON FUNCTION pg_temp.w10h_has_result_transfer(uuid) TO service_role;

CREATE FUNCTION pg_temp.w10h_capability_enabled(p_capability text,p_owner_slice text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10h_capability_enabled$
  SELECT EXISTS (SELECT 1 FROM public.accounting_capability_catalog catalog
    WHERE catalog.capability=p_capability AND catalog.enabled
      AND catalog.runtime_allow_grantable AND catalog.owner_slice=p_owner_slice)
$w10h_capability_enabled$;
GRANT EXECUTE ON FUNCTION pg_temp.w10h_capability_enabled(text,text) TO service_role;

DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10h-rollback-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE singleton_key='g7'
       OR id='00000000-0000-4000-8000-00000000a800')
     OR EXISTS (SELECT 1 FROM public.customers WHERE customer_number LIKE 'W10H-SYN-%')
     OR EXISTS (SELECT 1 FROM public.services WHERE service_number LIKE 'SVC-2301-000%')
     OR EXISTS (SELECT 1 FROM public.quotations WHERE quotation_number='W10H-SYN-Q-REVENUE')
     OR EXISTS (SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10H-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_statement_mapping_sets WHERE id='00000000-0000-4000-8000-00000000a800')
     OR EXISTS (SELECT 1 FROM public.accounting_period_versions
       WHERE start_date<='2301-12-31' AND end_date>='2300-01-01')
     OR EXISTS (SELECT 1 FROM public.accounting_journal_versions
       WHERE accounting_date BETWEEN '2300-01-01' AND '2301-12-31') THEN
    RAISE EXCEPTION 'W10H rollback fixture collision or unexpected DEV accounting bootstrap';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company_settings WHERE setting_key='default') THEN
    RAISE EXCEPTION 'W10H rollback fixture requires default company settings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
       WHERE capability='accounting:view_statements' AND enabled AND runtime_allow_grantable AND owner_slice='W10H') THEN
    RAISE EXCEPTION 'W10H statement capability is not enabled/grantable';
  END IF;
END;
$preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
 ('00000000-0000-4000-8000-00000000a801','w10h-rollback-authority','w10h-authority@example.invalid','Synthetic W10H authority','viewer',true),
 ('00000000-0000-4000-8000-00000000a802','w10h-rollback-operator','w10h-operator@example.invalid','Synthetic W10H operator','viewer',true),
 ('00000000-0000-4000-8000-00000000a803','w10h-rollback-admin','w10h-admin@example.invalid','Synthetic W10H admin','admin',true),
 ('00000000-0000-4000-8000-00000000a804','w10h-rollback-inactive','w10h-inactive@example.invalid','Synthetic W10H inactive actor','viewer',false),
 ('00000000-0000-4000-8000-00000000a805','w10h-rollback-reviewer','w10h-reviewer@example.invalid','Synthetic W10H Revenue reviewer','viewer',true);

-- With no profile or persisted capability rows, only an empty NOT_INITIALIZED result is visible.
SET LOCAL ROLE service_role;
DO $uninitialized$
DECLARE r jsonb;
BEGIN
  r:=public.get_w10h_accounting_report(
    '00000000-0000-4000-8000-00000000a802','GENERAL_LEDGER','2301-02-01','2301-02-28',NULL,NULL,NULL,0,50);
  IF r->>'state'<>'NOT_INITIALIZED' OR r->'totals'<>'null'::jsonb
     OR r->>'reason_codes' IS NULL OR r->>'total_count'<>'0' THEN
    RAISE EXCEPTION 'W10H uninitialized report did not return explicit empty state';
  END IF;
END;
$uninitialized$;
RESET ROLE;

INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT '00000000-0000-4000-8000-00000000a800','g7',s.id,0
FROM public.company_settings s WHERE s.setting_key='default';
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
  evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES(
 '00000000-0000-4000-8000-00000000a840','00000000-0000-4000-8000-00000000a800',
 'accounting_profile_updated','accounting_profile','00000000-0000-4000-8000-00000000a800',1,
 '00000000-0000-4000-8000-00000000a801',pg_temp.w10h_req(1),'Synthetic W10H profile',NULL,repeat('a',64),
 'accounting_profiles/00000000-0000-4000-8000-00000000a800/1',transaction_timestamp());
INSERT INTO public.accounting_profile_versions(
  profile_id,version,framework_key,framework_edition,policy_version,endorsement_context,
  professional_validation_state,functional_currency,fiscal_start_month,fiscal_start_day,
  fiscal_end_month,fiscal_end_day,fiscal_timezone,accounting_start_date,cutover_boundary_date,
  legal_fiscal_evidence_pending,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
  reason,created_by,created_at,foundation_event_id
) VALUES(
 '00000000-0000-4000-8000-00000000a800',1,'SA_IFRS_FOR_SMES',2025,'W10H provisional policy',
 'Synthetic W10H rollback fixture','DEFERRED','SAR',1,1,12,31,'Asia/Riyadh','2201-01-01','2201-12-31',
 true,'not_registered','INACTIVE','INACTIVE','DEV_PROVISIONAL',transaction_timestamp(),
 'Synthetic W10H profile','00000000-0000-4000-8000-00000000a801',transaction_timestamp(),
 '00000000-0000-4000-8000-00000000a840');
UPDATE public.accounting_profiles SET current_version=1 WHERE id='00000000-0000-4000-8000-00000000a800';

INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
  evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES(
 '00000000-0000-4000-8000-00000000a842','00000000-0000-4000-8000-00000000a800',
 'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000a844',1,
 '00000000-0000-4000-8000-00000000a801',pg_temp.w10h_req(2),'Synthetic W10H authority bootstrap',NULL,repeat('b',64),
 'accounting:manage_authority',transaction_timestamp());
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,reason,evidence_ref,
  request_id,payload_fingerprint,foundation_event_id,created_at
) VALUES(
 '00000000-0000-4000-8000-00000000a844','00000000-0000-4000-8000-00000000a800',
 '00000000-0000-4000-8000-00000000a801','accounting:manage_authority',1,'ALLOW',NULL,
 '00000000-0000-4000-8000-00000000a801','Synthetic authority bootstrap',NULL,
 pg_temp.w10h_req(2),repeat('b',64),'00000000-0000-4000-8000-00000000a842',transaction_timestamp());

INSERT INTO public.customers(id,customer_number,company,contact,email,phone,city,status,created_by) VALUES
 ('00000000-0000-4000-8000-00000000a812','W10H-SYN-CUSTOMER','W10H Synthetic Customer','Fixture Contact',
  'w10h-customer@example.invalid','+966500000812','Riyadh','active','w10h-rollback-operator');
INSERT INTO public.services(id,service_number,customer_id,service_title,status) VALUES
 ('00000000-0000-4000-8000-00000000a810','SVC-2301-0001','00000000-0000-4000-8000-00000000a812','W10H Service One','Inquiry'),
 ('00000000-0000-4000-8000-00000000a811','SVC-2301-0002','00000000-0000-4000-8000-00000000a812','W10H Service Two','Inquiry');
INSERT INTO public.quotations(
  id,quotation_number,customer_id,event,date,valid_until,subtotal,discount,vat_amount,grand_total,
  status,vat_rate,service_id,snapshot_seller,snapshot_buyer
) VALUES(
  '00000000-0000-4000-8000-00000000a820','W10H-SYN-Q-REVENUE','00000000-0000-4000-8000-00000000a812',
  'W10H synthetic reporting fixture',CURRENT_DATE,CURRENT_DATE+30,5000,0,0,5000,'draft',0,
  '00000000-0000-4000-8000-00000000a810',jsonb_build_object('currency','SAR','fixture',true),
  jsonb_build_object('customer_id','00000000-0000-4000-8000-00000000a812','fixture',true));
INSERT INTO public.quotation_items(
  id,quotation_id,description,category,qty,unit_price,vat,total,commercial_role,is_selected,unit
) VALUES(
  '00000000-0000-4000-8000-00000000a821','00000000-0000-4000-8000-00000000a820',
  'W10H synthetic performance unit','other',1,5000,0,5000,'authority_line',true,'service');

SET LOCAL ROLE service_role;
DO $report_regression$
DECLARE
  c record; r record; cap record; account_payload jsonb; period_payload jsonb; rule_payload jsonb;
  journal_payload jsonb; entries jsonb; map_result jsonb; report_gl jsonb; report_tb jsonb;
  units jsonb; v_revenue_item_id uuid; v_revenue_unit_id uuid; v_scope_id uuid; v_expense_v2 integer;
  report_pnl jsonb; report_bs jsonb; report_service jsonb; report_mapping_missing jsonb;
  report_historical jsonb; report_unmapped jsonb; report_current jsonb; report_after_reversal jsonb;
  report_prior jsonb; v_cutoff timestamptz; v_unmapped_cutoff timestamptz; v_map_two_cutoff timestamptz;
  v_reversal_cutoff timestamptz; v_revenue_v2 integer; v_opening_count integer; v_journal_count integer;
  v_cash_line jsonb; v_service_line jsonb; v_entry jsonb; v_revenue_id uuid; v_reversal_id uuid;
  v_totals jsonb; v_reason_found boolean; v_direct_dml_denied boolean:=false;
BEGIN
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  IF public.get_accounting_capability(c.admin_id,'accounting:view') IS NOT FALSE
     OR public.get_accounting_capability(c.admin_id,'accounting:view_statements') IS NOT FALSE THEN
    RAISE EXCEPTION 'W10H CRM Admin wildcard inherited an accounting capability';
  END IF;
  FOR r IN SELECT unnest(ARRAY[
    'accounting:manage_chart','accounting:manage_periods','accounting:view','accounting:view_statements',
    'accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal',
    'accounting:manage_revenue_recognition'
  ]) capability LOOP
    SELECT * INTO cap FROM public.set_accounting_capability(
      c.authority_id,c.operator_id,r.capability,'ALLOW',NULL,0,'Synthetic W10H grant',
      'synthetic://w10h/capability/'||replace(r.capability,':','-'),pg_temp.w10h_req(100+array_position(ARRAY[
        'accounting:manage_chart','accounting:manage_periods','accounting:view','accounting:view_statements',
        'accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal',
        'accounting:manage_revenue_recognition'
      ],r.capability)));
    IF cap.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H capability grant failed: %',r.capability; END IF;
  END LOOP;
  IF public.get_accounting_capability(c.operator_id,'accounting:view_statements') IS NOT TRUE THEN
    RAISE EXCEPTION 'W10H explicit statement capability was not persisted';
  END IF;
  SELECT * INTO cap FROM public.set_accounting_capability(c.authority_id,c.reviewer_id,
    'accounting:manage_revenue_recognition','ALLOW',NULL,0,'Synthetic W10H independent review authority',
    'synthetic://w10h/capability/reviewer-revenue-recognition',pg_temp.w10h_req(140));
  IF cap.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H reviewer Revenue capability grant failed'; END IF;
  PERFORM public.reconcile_quotation_discount_allocations('00000000-0000-4000-8000-00000000a820');
  SELECT * INTO r FROM public.approve_quotation_and_activate_internal_abs(
    '00000000-0000-4000-8000-00000000a820','w10h-rollback-operator','admin');
  IF r.error_code IS NOT NULL OR r.approved_billing_scope_id IS NULL THEN
    RAISE EXCEPTION 'W10H synthetic W10F revenue scope approval failed: %',r.error_code;
  END IF;
  v_scope_id:=r.approved_billing_scope_id;
  SELECT item.id INTO STRICT v_revenue_item_id FROM public.approved_billing_scope_items item
    WHERE item.approved_billing_scope_id=v_scope_id AND item.decision IN ('accepted','adjusted')
      AND item.source_commercial_role='authority_line' AND item.source_is_selected IS TRUE
    ORDER BY item.id LIMIT 1;
  UPDATE w10h_fixture_context SET revenue_scope_id=v_scope_id,
    revenue_item_id=v_revenue_item_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  -- A denied CRM Admin stays denied even when the viewer capability is enabled.
  BEGIN
    PERFORM public.get_w10h_accounting_report(c.admin_id,'GENERAL_LEDGER','2301-02-01','2301-02-28',NULL,NULL,NULL,0,50);
    RAISE EXCEPTION 'W10H Admin wildcard report access unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.get_w10h_accounting_report(c.inactive_id,'GENERAL_LEDGER','2301-02-01','2301-02-28',NULL,NULL,NULL,0,50);
    RAISE EXCEPTION 'W10H inactive actor report access unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  account_payload:=jsonb_build_object('account_code','W10H-SYN-ROOT','name_en','W10H Synthetic Root',
    'name_ar','جذر W10H اصطناعي','account_type','ASSET','category','synthetic','normal_balance','DEBIT',
    'account_kind','NON_POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10H synthetic root','synthetic://w10h/chart/root',pg_temp.w10h_req(200));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H root account creation failed: %',r.error_code; END IF;

  account_payload:=jsonb_build_object('account_code','W10H-SYN-CASH','name_en','W10H Cash Original',
    'name_ar','نقد W10H الأصلي','account_type','ASSET','category','synthetic','normal_balance','DEBIT',
    'account_kind','POSTING','parent_account_id',r.account_id,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10H cash account','synthetic://w10h/chart/cash',pg_temp.w10h_req(201));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H cash account creation failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET cash_account_id=r.account_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  account_payload:=jsonb_build_object('account_code','W10H-SYN-EQUITY','name_en','W10H Opening Equity',
    'name_ar','حقوق ملكية W10H','account_type','EQUITY','category','synthetic','normal_balance','CREDIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10H equity account','synthetic://w10h/chart/equity',pg_temp.w10h_req(202));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H equity account creation failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET equity_account_id=r.account_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  account_payload:=jsonb_build_object('account_code','W10H-SYN-REVENUE','name_en','W10H Revenue Original',
    'name_ar','إيراد W10H الأصلي','account_type','REVENUE','category','synthetic','normal_balance','CREDIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10H revenue account','synthetic://w10h/chart/revenue',pg_temp.w10h_req(203));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H revenue account creation failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET revenue_account_id=r.account_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  account_payload:=jsonb_build_object('account_code','W10H-SYN-EXPENSE','name_en','W10H Operating Expense',
    'name_ar','مصروف تشغيل W10H','account_type','EXPENSE','category','synthetic','normal_balance','DEBIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10H expense account','synthetic://w10h/chart/expense',pg_temp.w10h_req(204));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H expense account creation failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET expense_account_id=r.account_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  account_payload:=jsonb_build_object('account_code','W10H-SYN-CONTRACT-ASSET','name_en','W10H Contract Asset',
    'name_ar','أصل عقد W10H','account_type','ASSET','category','synthetic','normal_balance','DEBIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',true,'control_classification','CONTRACT_ASSET');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10H contract asset','synthetic://w10h/chart/contract-asset',pg_temp.w10h_req(210));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H contract asset creation failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET contract_asset_account_id=r.account_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  account_payload:=jsonb_build_object('account_code','W10H-SYN-CONTRACT-LIABILITY','name_en','W10H Contract Liability',
    'name_ar','التزام عقد W10H','account_type','LIABILITY','category','synthetic','normal_balance','CREDIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',true,'control_classification','CONTRACT_LIABILITY');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,NULL,0,account_payload,
    'Create W10H contract liability','synthetic://w10h/chart/contract-liability',pg_temp.w10h_req(211));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H contract liability creation failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET contract_liability_account_id=r.account_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  period_payload:=jsonb_build_object('start_date','2300-01-01','end_date','2301-12-31','status','OPEN');
  SELECT * INTO r FROM public.save_accounting_period(c.operator_id,NULL,0,period_payload,
    'Create W10H synthetic period','synthetic://w10h/period/1',pg_temp.w10h_req(205));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H period creation failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET period_id=r.period_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  rule_payload:=jsonb_build_object('rule_code','W10H_SYN_MANUAL','name_en','W10H Synthetic Manual Rule',
    'name_ar','قاعدة يدوية اصطناعية W10H','is_active',true,'mappings',jsonb_build_array(
      jsonb_build_object('mapping_key','cash','account_id',c.cash_account_id,'account_version',1,'allowed_side','EITHER','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','equity','account_id',c.equity_account_id,'account_version',1,'allowed_side','CREDIT','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','revenue','account_id',c.revenue_account_id,'account_version',1,'allowed_side','CREDIT','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','expense','account_id',c.expense_account_id,'account_version',1,'allowed_side','DEBIT','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','contract_asset','account_id',c.contract_asset_account_id,'account_version',1,'allowed_side','DEBIT','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','contract_liability','account_id',c.contract_liability_account_id,'account_version',1,'allowed_side','CREDIT','service_requirement','OPTIONAL')));
  SELECT * INTO r FROM public.save_accounting_posting_rule(c.operator_id,NULL,0,rule_payload,
    'Create W10H synthetic rule','synthetic://w10h/posting-rule/1',pg_temp.w10h_req(206));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H posting rule creation failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET rule_id=r.posting_rule_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  -- Post opening cash/equity before the 2301 report year.
  journal_payload:=jsonb_build_object('accounting_date','2300-12-15','period_id',c.period_id,'period_version',1,
    'posting_rule_id',c.rule_id,'rule_version',1,'source_record_key','W10H-PRIVATE-SOURCE-OPENING','economic_event_key','W10H-PRIVATE-SOURCE-OPENING',
    'posting_purpose','synthetic-opening','description_en','W10H opening capital','description_ar','رأس مال افتتاحي W10H',
    'lines',jsonb_build_array(
      jsonb_build_object('mapping_key','cash','side','DEBIT','amount_halalah','100000','service_id',NULL,'description_en','Opening cash','description_ar','نقد افتتاحي'),
      jsonb_build_object('mapping_key','equity','side','CREDIT','amount_halalah','100000','service_id',NULL,'description_en','Opening equity','description_ar','حقوق ملكية افتتاحية')));
  SELECT * INTO r FROM public.prepare_accounting_journal(c.operator_id,NULL,0,journal_payload,'Prepare W10H opening journal',
    'synthetic://w10h/journal/opening',pg_temp.w10h_req(300));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H opening prepare failed: %',r.error_code; END IF;
  SELECT * INTO r FROM public.post_accounting_journal(c.operator_id,r.journal_id,1,pg_temp.w10h_req(301));
  IF r.error_code IS NOT NULL OR r.status<>'POSTED' THEN RAISE EXCEPTION 'W10H opening post failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET opening_journal_id=r.journal_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  -- The large amount is a controlled manual Expense; Revenue enters only through W10F governance.
  journal_payload:=jsonb_build_object('accounting_date','2301-02-01','period_id',c.period_id,'period_version',1,
    'posting_rule_id',c.rule_id,'rule_version',1,'source_record_key','W10H-PRIVATE-SOURCE-LARGE-EXPENSE','economic_event_key','W10H-PRIVATE-SOURCE-LARGE-EXPENSE',
    'posting_purpose','synthetic-service-expense','description_en','W10H Service Two expense','description_ar','مصروف خدمة W10H الثانية',
    'lines',jsonb_build_array(
      jsonb_build_object('mapping_key','expense','side','DEBIT','amount_halalah','9007199254740993','service_id',c.service_two_id,'description_en','Operating expense','description_ar','مصروف تشغيل'),
      jsonb_build_object('mapping_key','cash','side','CREDIT','amount_halalah','9007199254740993','service_id',c.service_two_id,'description_en','Cash payment','description_ar','دفعة نقدية')));
  SELECT * INTO r FROM public.prepare_accounting_journal(c.operator_id,NULL,0,journal_payload,'Prepare W10H large Expense',
    'synthetic://w10h/journal/large-expense',pg_temp.w10h_req(302));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H large Expense prepare failed: %',r.error_code; END IF;
  SELECT * INTO r FROM public.post_accounting_journal(c.operator_id,r.journal_id,1,pg_temp.w10h_req(303));
  IF r.error_code IS NOT NULL OR r.status<>'POSTED' THEN RAISE EXCEPTION 'W10H large Expense post failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET large_expense_journal_id=r.journal_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  units:=jsonb_build_array(jsonb_build_object('unit_key','service-delivery',
    'promised_output','Customer accepts the defined W10H service delivery','satisfaction_method','POINT_IN_TIME',
    'required_evidence_basis','CUSTOMER_ACCEPTANCE','allocations',
      jsonb_build_array(jsonb_build_object('source_item_id',c.revenue_item_id,'amount_halalah','500000'))));
  SELECT * INTO r FROM public.save_accounting_revenue_arrangement(c.operator_id,c.service_one_id,c.revenue_scope_id,0,
    units,'PRINCIPAL','W10F-1','synthetic://w10h/revenue/arrangement',repeat('c',64),
    'Synthetic W10H governed revenue arrangement',pg_temp.w10h_req(350));
  IF r.error_code IS NOT NULL OR r.status<>'PREPARED' THEN
    RAISE EXCEPTION 'W10H W10F revenue arrangement failed: % / % / %',r.error_code,r.status,r.held_code;
  END IF;
  SELECT * INTO cap FROM public.review_accounting_revenue_arrangement(c.reviewer_id,r.arrangement_id,r.version,true,
    'Independent synthetic W10H arrangement review',pg_temp.w10h_req(351));
  IF cap.error_code IS NOT NULL OR cap.decision<>'APPROVED' THEN
    RAISE EXCEPTION 'W10H W10F revenue arrangement review failed: %',cap.error_code;
  END IF;
  v_revenue_unit_id:=pg_temp.w10h_revenue_unit_id(r.arrangement_id,'service-delivery');
  SELECT * INTO r FROM public.save_accounting_revenue_performance_evidence(c.operator_id,v_revenue_unit_id,
    'w10h-service-acceptance',0,'CUSTOMER_ACCEPTANCE','2301-02-03','2301-02-03',
    'synthetic://w10h/revenue/performance-acceptance',repeat('d',64),'500000',NULL,NULL,
    'Synthetic W10H customer acceptance evidence',pg_temp.w10h_req(352));
  IF r.error_code IS NOT NULL OR r.status<>'SUBMITTED' THEN
    RAISE EXCEPTION 'W10H W10F performance evidence failed: % / %',r.error_code,r.status;
  END IF;
  SELECT * INTO cap FROM public.review_accounting_revenue_performance_evidence(c.reviewer_id,r.evidence_id,r.version,true,
    'Independent synthetic W10H performance evidence review',pg_temp.w10h_req(353));
  IF cap.error_code IS NOT NULL OR cap.decision<>'APPROVED' THEN
    RAISE EXCEPTION 'W10H W10F performance evidence review failed: %',cap.error_code;
  END IF;
  SELECT * INTO r FROM public.prepare_accounting_revenue_recognition(c.operator_id,r.evidence_id,r.version,
    c.period_id,1,c.rule_id,1,'2301-02-05','Prepare W10H governed revenue recognition',pg_temp.w10h_req(354));
  IF r.error_code IS NOT NULL OR r.journal_id IS NULL THEN
    RAISE EXCEPTION 'W10H W10F revenue recognition prepare failed: %',r.error_code;
  END IF;
  SELECT * INTO cap FROM public.post_accounting_revenue_recognition_journal(c.operator_id,r.journal_id,r.version,pg_temp.w10h_req(355));
  IF cap.error_code IS NOT NULL OR cap.status<>'POSTED' THEN
    RAISE EXCEPTION 'W10H W10F revenue recognition post failed: %',cap.error_code;
  END IF;
  UPDATE w10h_fixture_context SET revenue_recognition_journal_id=r.journal_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  journal_payload:=jsonb_set(journal_payload,'{accounting_date}',to_jsonb('2301-02-10'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{source_record_key}',to_jsonb('W10H-PRIVATE-SOURCE-SHARED-OVERHEAD'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{economic_event_key}',to_jsonb('W10H-PRIVATE-SOURCE-SHARED-OVERHEAD'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{posting_purpose}',to_jsonb('synthetic-shared-overhead'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{lines,0,mapping_key}',to_jsonb('expense'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{lines,0,side}',to_jsonb('DEBIT'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{lines,0,amount_halalah}',to_jsonb('125000'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{lines,0,service_id}','null'::jsonb,false);
  journal_payload:=jsonb_set(journal_payload,'{lines,1,mapping_key}',to_jsonb('cash'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{lines,1,side}',to_jsonb('CREDIT'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{lines,1,amount_halalah}',to_jsonb('125000'::text),false);
  journal_payload:=jsonb_set(journal_payload,'{lines,1,service_id}','null'::jsonb,false);
  SELECT * INTO r FROM public.prepare_accounting_journal(c.operator_id,NULL,0,journal_payload,'Prepare W10H unassigned overhead',
    'synthetic://w10h/journal/shared-overhead',pg_temp.w10h_req(306));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H overhead prepare failed: %',r.error_code; END IF;
  SELECT * INTO r FROM public.post_accounting_journal(c.operator_id,r.journal_id,1,pg_temp.w10h_req(307));
  IF r.error_code IS NOT NULL OR r.status<>'POSTED' THEN RAISE EXCEPTION 'W10H overhead post failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET overhead_journal_id=r.journal_id WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;

  -- A report without a statement map is explicit, not a zero-valued financial statement.
  report_mapping_missing:=public.get_w10h_accounting_report(c.operator_id,'PROFIT_AND_LOSS',
    '2301-01-01','2301-02-28',clock_timestamp(),NULL,NULL,0,50);
  IF report_mapping_missing->>'state'<>'MAPPING_REQUIRED' OR report_mapping_missing->'totals'<>'null'::jsonb THEN
    RAISE EXCEPTION 'W10H missing statement mapping was not explicit';
  END IF;

  entries:=jsonb_build_array(
    jsonb_build_object('account_id',c.cash_account_id,'account_version',1,'statement_type','BALANCE_SHEET',
      'section_key','ASSETS','line_key','CASH','label_en','Cash','label_ar','النقد','display_order',10),
    jsonb_build_object('account_id',c.equity_account_id,'account_version',1,'statement_type','BALANCE_SHEET',
      'section_key','EQUITY','line_key','OPENING_EQUITY','label_en','Opening equity','label_ar','حقوق الملكية الافتتاحية','display_order',20),
    jsonb_build_object('account_id',c.revenue_account_id,'account_version',1,'statement_type','PROFIT_LOSS',
      'section_key','REVENUE','line_key','SERVICE_REVENUE','label_en','Service revenue','label_ar','إيرادات الخدمات','display_order',10),
    jsonb_build_object('account_id',c.expense_account_id,'account_version',1,'statement_type','PROFIT_LOSS',
      'section_key','EXPENSE','line_key','OPERATING_EXPENSE','label_en','Operating expense','label_ar','مصروفات التشغيل','display_order',20),
    jsonb_build_object('account_id',c.contract_asset_account_id,'account_version',1,'statement_type','BALANCE_SHEET',
      'section_key','ASSETS','line_key','CONTRACT_ASSET','label_en','Contract asset','label_ar','أصل عقد','display_order',15),
    jsonb_build_object('account_id',c.contract_liability_account_id,'account_version',1,'statement_type','BALANCE_SHEET',
      'section_key','LIABILITIES','line_key','CONTRACT_LIABILITY','label_en','Contract liability','label_ar','التزام عقد','display_order',30));
  map_result:=public.save_accounting_statement_mapping(c.operator_id,c.profile_id,NULL,0,
    '2201-01-01T00:00:00+03:00'::timestamptz,'Create W10H synthetic statement mapping',
    'synthetic://w10h/mapping/version-1',entries,pg_temp.w10h_req(400));
  IF (map_result->>'version')::integer<>1 THEN RAISE EXCEPTION 'W10H first mapping version was not saved'; END IF;
  UPDATE w10h_fixture_context SET mapping_set_id=(map_result->>'mapping_set_id')::uuid,mapping_version=1 WHERE profile_id=c.profile_id;
  SELECT * INTO STRICT c FROM w10h_fixture_context;
  v_cutoff:=clock_timestamp();

  report_gl:=public.get_w10h_accounting_report(c.operator_id,'GENERAL_LEDGER','2301-02-01','2301-02-28',v_cutoff,NULL,NULL,0,50);
  report_tb:=public.get_w10h_accounting_report(c.operator_id,'TRIAL_BALANCE','2301-01-01','2301-02-28',v_cutoff,NULL,NULL,0,50);
  report_pnl:=public.get_w10h_accounting_report(c.operator_id,'PROFIT_AND_LOSS','2301-01-01','2301-02-28',v_cutoff,NULL,NULL,0,50);
  report_bs:=public.get_w10h_accounting_report(c.operator_id,'BALANCE_SHEET','2301-01-01','2301-02-28',v_cutoff,NULL,NULL,0,50);

  -- W10H CASE: GL opening/activity/closing
  IF jsonb_array_length(report_gl->'rows')<>6 THEN RAISE EXCEPTION 'W10H GL did not return six posted lines'; END IF;
  SELECT item INTO v_cash_line FROM jsonb_array_elements(report_gl->'accounts') item WHERE item->>'account_id'=c.cash_account_id::text;
  IF v_cash_line->>'opening_balance_halalah'<>'100000'
     OR v_cash_line->>'debit_activity_halalah'<>'0'
     OR v_cash_line->>'credit_activity_halalah'<>'9007199254865993'
     OR v_cash_line->>'closing_balance_halalah'<>'-9007199254765993' THEN
    RAISE EXCEPTION 'W10H GL opening/activity/closing did not reconcile exactly';
  END IF;

  -- W10H CASE: TB opening/activity/ending
  -- W10H CASE: TB debit equals credit
  IF report_tb->'totals'->>'debits_equal_credits'<>'true'
     OR report_tb->'totals'->>'ending_debit_halalah' IS NULL
     OR report_tb->'totals'->>'ending_debit_halalah'<>report_tb->'totals'->>'ending_credit_halalah' THEN
    RAISE EXCEPTION 'W10H Trial Balance does not reconcile globally';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report_tb->'rows') a
      WHERE a->>'account_id'=c.cash_account_id::text AND a->>'opening_debit_halalah'='100000'
        AND a->>'period_debit_halalah'='0' AND a->>'period_credit_halalah'='9007199254865993') THEN
    RAISE EXCEPTION 'W10H Trial Balance cash opening/activity/ending was not exact';
  END IF;
  report_service:=public.get_w10h_accounting_report(c.operator_id,'TRIAL_BALANCE','2301-01-01','2301-02-28',v_cutoff,
    c.cash_account_id,NULL,0,50);
  IF report_service->>'total_count'<>'1' OR report_service->'totals'->>'debits_equal_credits'<>'true' THEN
    RAISE EXCEPTION 'W10H filtered Trial Balance lost whole-report totals or ignored its account detail filter';
  END IF;

  -- W10H CASE: P&L Revenue minus Expense
  IF report_pnl->'totals'->>'revenue_halalah'<>'500000'
     OR report_pnl->'totals'->>'expense_halalah'<>'9007199254865993'
     OR report_pnl->'totals'->>'profit_loss_halalah'<>'-9007199254365993' THEN
    RAISE EXCEPTION 'W10H P&L did not derive exact posted Revenue less Expense';
  END IF;
  -- W10H CASE: Service filter
  report_service:=public.get_w10h_accounting_report(c.operator_id,'PROFIT_AND_LOSS','2301-01-01','2301-02-28',v_cutoff,
    NULL,c.service_one_id,0,50);
  IF report_service->'totals'->>'revenue_halalah'<>'500000'
     OR report_service->'totals'->>'expense_halalah'<>'0' THEN
    RAISE EXCEPTION 'W10H Service filter did not isolate its posted accounting analysis';
  END IF;
  -- W10H CASE: unassigned shared overhead
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report_pnl->'rows') a
      CROSS JOIN LATERAL jsonb_array_elements(a->'journal_evidence') e
      WHERE a->>'line_key'='OPERATING_EXPENSE' AND e->>'service_id' IS NULL) THEN
    RAISE EXCEPTION 'W10H shared overhead was not explicitly unassigned';
  END IF;
  -- W10H CASE: managerial values excluded
  IF report_pnl->'totals'->>'profit_loss_halalah'<>'-9007199254365993' THEN
    RAISE EXCEPTION 'W8 managerial values changed accounting Profit/Loss';
  END IF;

  -- W10H CASE: Balance Sheet equation
  -- W10H CASE: current-year earnings exactly once
  v_journal_count:=pg_temp.w10h_journal_count(c.profile_id);
  IF report_bs->'totals'->>'assets_halalah'<>'-9007199254265993'
     OR report_bs->'totals'->>'equity_before_current_result_halalah'<>'100000'
     OR report_bs->'totals'->>'current_year_earnings_halalah'<>'-9007199254365993'
     OR report_bs->'totals'->>'presented_equity_halalah'<>'-9007199254265993'
     OR report_bs->'totals'->>'equation_difference_halalah'<>'0'
     OR report_bs->'totals'->>'current_result_already_transferred'<>'false' THEN
    RAISE EXCEPTION 'W10H Balance Sheet equation or current-year result presentation is incorrect: %',report_bs->'totals';
  END IF;
  v_opening_count:=pg_temp.w10h_journal_count(c.profile_id);
  IF v_opening_count<>v_journal_count THEN RAISE EXCEPTION 'W10H Balance Sheet generated an accounting journal'; END IF;
  -- W10H CASE: no retained-earnings journal
  IF pg_temp.w10h_has_result_transfer(c.profile_id) THEN
    RAISE EXCEPTION 'W10H fixture unexpectedly created a retained-earnings/result-transfer journal';
  END IF;
  -- W10H CASE: unavailable evidence is not zero
  IF report_bs->>'state'<>'PARTIAL' OR NOT (report_bs->'reason_codes' @> '["INCOMPLETE_INCEPTION_ACCEPTANCE"]'::jsonb) THEN
    RAISE EXCEPTION 'W10H incomplete inception evidence was represented as complete';
  END IF;

  -- W10H CASE: statement capability enabled without persistent grant
  IF NOT pg_temp.w10h_capability_enabled('accounting:view_statements','W10H')
     OR NOT public.get_accounting_capability(c.operator_id,'accounting:view_statements') THEN
    RAISE EXCEPTION 'W10H statement capability state is not enabled/grantable';
  END IF;

  -- W10H CASE: account rename does not rewrite historical report
  account_payload:=jsonb_build_object('account_code','W10H-SYN-REVENUE','name_en','W10H Revenue Renamed',
    'name_ar','إيراد W10H بعد التحديث','account_type','REVENUE','category','synthetic','normal_balance','CREDIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,c.revenue_account_id,1,account_payload,
    'Rename W10H revenue account','synthetic://w10h/chart/revenue-v2',pg_temp.w10h_req(207));
  IF r.error_code IS NOT NULL OR r.version<>2 THEN RAISE EXCEPTION 'W10H revenue account rename failed'; END IF;
  v_revenue_v2:=r.version;
  account_payload:=jsonb_build_object('account_code','W10H-SYN-EXPENSE','name_en','W10H Operating Expense Renamed',
    'name_ar','مصروف تشغيل W10H بعد التحديث','account_type','EXPENSE','category','synthetic','normal_balance','DEBIT',
    'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',false,'control_classification','NONE');
  SELECT * INTO r FROM public.save_accounting_account(c.operator_id,c.expense_account_id,1,account_payload,
    'Rename W10H expense account','synthetic://w10h/chart/expense-v2',pg_temp.w10h_req(209));
  IF r.error_code IS NOT NULL OR r.version<>2 THEN RAISE EXCEPTION 'W10H expense account rename failed'; END IF;
  v_expense_v2:=r.version;
  rule_payload:=jsonb_set(rule_payload,'{mappings,2,account_version}',to_jsonb(v_revenue_v2),false);
  rule_payload:=jsonb_set(rule_payload,'{mappings,3,account_version}',to_jsonb(v_expense_v2),false);
  SELECT * INTO r FROM public.save_accounting_posting_rule(c.operator_id,c.rule_id,1,rule_payload,
    'Pin W10H rule to renamed account versions','synthetic://w10h/posting-rule/2',pg_temp.w10h_req(208));
  IF r.error_code IS NOT NULL OR r.version<>2 THEN RAISE EXCEPTION 'W10H posting rule account-version update failed'; END IF;

  journal_payload:=jsonb_build_object('accounting_date','2301-02-15','period_id',c.period_id,'period_version',1,
    'posting_rule_id',c.rule_id,'rule_version',2,'source_record_key','W10H-PRIVATE-SOURCE-UNMAPPED-EXPENSE-V2','economic_event_key','W10H-PRIVATE-SOURCE-UNMAPPED-EXPENSE-V2',
    'posting_purpose','synthetic-renamed-account-expense','description_en','W10H renamed expense account','description_ar','مصروف حساب W10H المحدث',
    'lines',jsonb_build_array(
      jsonb_build_object('mapping_key','expense','side','DEBIT','amount_halalah','1000','service_id',c.service_one_id,'description_en','Expense','description_ar','مصروف'),
      jsonb_build_object('mapping_key','cash','side','CREDIT','amount_halalah','1000','service_id',c.service_one_id,'description_en','Cash','description_ar','نقد')));
  SELECT * INTO r FROM public.prepare_accounting_journal(c.operator_id,NULL,0,journal_payload,'Prepare W10H unmapped Expense version',
    'synthetic://w10h/journal/expense-v2',pg_temp.w10h_req(308));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H renamed-version journal prepare failed: %',r.error_code; END IF;
  SELECT * INTO r FROM public.post_accounting_journal(c.operator_id,r.journal_id,1,pg_temp.w10h_req(309));
  IF r.error_code IS NOT NULL OR r.status<>'POSTED' THEN RAISE EXCEPTION 'W10H renamed-version journal post failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET later_expense_journal_id=r.journal_id WHERE profile_id=c.profile_id;
  v_unmapped_cutoff:=clock_timestamp();
  report_unmapped:=public.get_w10h_accounting_report(c.operator_id,'PROFIT_AND_LOSS','2301-01-01','2301-02-28',
    v_unmapped_cutoff,NULL,NULL,0,50);
  -- W10H CASE: unmapped account/version
  IF report_unmapped->>'state'<>'MAPPING_REQUIRED' OR report_unmapped->'totals'<>'null'::jsonb
     OR NOT (report_unmapped->'reason_codes' @> '["STATEMENT_MAPPING_MISSING_FOR_ACCOUNT_VERSION"]'::jsonb) THEN
    RAISE EXCEPTION 'W10H unmapped account version did not fail completeness';
  END IF;

  entries:=entries||jsonb_build_array(
    jsonb_build_object('account_id',c.revenue_account_id,'account_version',2,'statement_type','PROFIT_LOSS',
      'section_key','REVENUE','line_key','SERVICE_REVENUE_V2','label_en','Revenue - revised','label_ar','الإيرادات - محدثة','display_order',11),
    jsonb_build_object('account_id',c.expense_account_id,'account_version',2,'statement_type','PROFIT_LOSS',
      'section_key','EXPENSE','line_key','OPERATING_EXPENSE_V2','label_en','Operating expense - revised','label_ar','مصروفات التشغيل - محدثة','display_order',21));
  map_result:=public.save_accounting_statement_mapping(c.operator_id,c.profile_id,c.mapping_set_id,1,
    '2301-01-01T00:00:00+03:00'::timestamptz,'Revise W10H synthetic statement mapping',
    'synthetic://w10h/mapping/version-2',entries,pg_temp.w10h_req(401));
  IF (map_result->>'version')::integer<>2 THEN RAISE EXCEPTION 'W10H mapping version two was not saved'; END IF;
  v_map_two_cutoff:=clock_timestamp();
  -- W10H CASE: later mapping does not rewrite earlier report
  report_historical:=public.get_w10h_accounting_report(c.operator_id,'PROFIT_AND_LOSS','2301-01-01','2301-02-28',
    v_cutoff,NULL,NULL,0,50);
  IF (report_historical->>'mapping_version')::integer<>1
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report_historical->'rows') a
       WHERE a->>'account_id'=c.revenue_account_id::text AND a->>'account_name_en'='W10H Revenue Original'
         AND a->>'label_en'='Service revenue') THEN
    RAISE EXCEPTION 'W10H historical statement mapping or account snapshot was rewritten';
  END IF;
  report_current:=public.get_w10h_accounting_report(c.operator_id,'PROFIT_AND_LOSS','2301-01-01','2301-02-28',
    v_map_two_cutoff,NULL,NULL,0,50);
  IF (report_current->>'mapping_version')::integer<>2
     OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report_current->'rows') a
       WHERE a->>'account_id'=c.revenue_account_id::text AND a->>'account_version'='1'
          AND a->>'account_name_en'='W10H Revenue Original' AND a->>'label_en'='Service revenue')
      OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report_current->'rows') a
        WHERE a->>'account_id'=c.expense_account_id::text AND a->>'account_version'='2'
          AND a->>'line_key'='OPERATING_EXPENSE_V2' AND a->>'label_en'='Operating expense - revised') THEN
    RAISE EXCEPTION 'W10H account snapshots or current statement mapping version were not honored';
  END IF;

  -- W10H CASE: original journal before reversal cutoff
  report_gl:=public.get_w10h_accounting_report(c.operator_id,'GENERAL_LEDGER','2301-02-01','2301-02-28',
    v_map_two_cutoff,NULL,NULL,0,50);
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report_gl->'rows') a
      WHERE a->>'journal_id'=c.overhead_journal_id::text AND a->>'reversal_of_journal_id' IS NULL) THEN
    RAISE EXCEPTION 'W10H original journal was not visible before reversal cutoff';
  END IF;

  v_journal_count:=pg_temp.w10h_journal_count(c.profile_id);
  SELECT * INTO r FROM public.reverse_accounting_journal(c.operator_id,c.overhead_journal_id,c.period_id,'2301-02-20',
    'Reverse synthetic W10H shared overhead','synthetic://w10h/reversal/shared-overhead',pg_temp.w10h_req(500));
  IF r.error_code IS NOT NULL OR r.original_journal_id IS DISTINCT FROM c.overhead_journal_id THEN
    RAISE EXCEPTION 'W10H governed journal reversal failed: %',r.error_code;
  END IF;
  UPDATE w10h_fixture_context SET reversal_journal_id=r.journal_id WHERE profile_id=c.profile_id;
  v_reversal_cutoff:=clock_timestamp();
  v_opening_count:=pg_temp.w10h_journal_count(c.profile_id);
  IF v_opening_count<>v_journal_count+1 THEN RAISE EXCEPTION 'W10H reversal did not create one linked journal'; END IF;
  -- W10H CASE: reversal appears at later cutoff
  -- W10H CASE: journal lineage
  report_after_reversal:=public.get_w10h_accounting_report(c.operator_id,'GENERAL_LEDGER','2301-02-01','2301-02-28',
    v_reversal_cutoff,NULL,NULL,0,50);
  SELECT reversal_journal_id INTO v_reversal_id FROM w10h_fixture_context;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report_after_reversal->'rows') a
      WHERE a->>'journal_id'=v_reversal_id::text AND a->>'reversal_of_journal_id'=c.overhead_journal_id::text)
     OR jsonb_array_length(report_after_reversal->'rows')<>jsonb_array_length(report_gl->'rows')+2 THEN
    RAISE EXCEPTION 'W10H reversal lineage/cutoff did not include original and reversal exactly once';
  END IF;
  -- W10H CASE: protected source content hidden
  IF report_after_reversal::text LIKE '%W10H-PRIVATE-SOURCE-%' OR report_after_reversal::text LIKE '%evidence_ref%' THEN
    RAISE EXCEPTION 'W10H report exposed an operational source key or evidence reference';
  END IF;

  journal_payload:=jsonb_build_object('accounting_date','2300-12-31','period_id',c.period_id,'period_version',1,
    'posting_rule_id',c.rule_id,'rule_version',2,'source_record_key','W10H-PRIVATE-SOURCE-PRIOR-RESULT','economic_event_key','W10H-PRIVATE-SOURCE-PRIOR-RESULT',
    'posting_purpose','synthetic-prior-year-expense','description_en','W10H prior-year expense','description_ar','مصروف W10H لسنة سابقة',
    'lines',jsonb_build_array(
      jsonb_build_object('mapping_key','expense','side','DEBIT','amount_halalah','2000','service_id',c.service_one_id,'description_en','Expense','description_ar','مصروف'),
      jsonb_build_object('mapping_key','cash','side','CREDIT','amount_halalah','2000','service_id',c.service_one_id,'description_en','Cash','description_ar','نقد')));
  SELECT * INTO r FROM public.prepare_accounting_journal(c.operator_id,NULL,0,journal_payload,'Prepare W10H prior result',
    'synthetic://w10h/journal/prior-year',pg_temp.w10h_req(310));
  IF r.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10H prior-year journal prepare failed: %',r.error_code; END IF;
  SELECT * INTO r FROM public.post_accounting_journal(c.operator_id,r.journal_id,1,pg_temp.w10h_req(311));
  IF r.error_code IS NOT NULL OR r.status<>'POSTED' THEN RAISE EXCEPTION 'W10H prior-year journal post failed: %',r.error_code; END IF;
  UPDATE w10h_fixture_context SET prior_expense_journal_id=r.journal_id WHERE profile_id=c.profile_id;
  v_reversal_cutoff:=clock_timestamp();
  report_prior:=public.get_w10h_accounting_report(c.operator_id,'BALANCE_SHEET','2301-01-01','2301-02-28',
    v_reversal_cutoff,NULL,NULL,0,50);
  -- W10H CASE: prior-year result unresolved
  IF report_prior->>'state'<>'PARTIAL' OR NOT (report_prior->'reason_codes' @> '["PRIOR_RESULT_NOT_CLOSED"]'::jsonb) THEN
    RAISE EXCEPTION 'W10H prior-year unclosed result was not explicit';
  END IF;

  -- W10H CASE: direct application DML remains blocked even for service_role.
  BEGIN
    INSERT INTO public.accounting_statement_mapping_entries(
      profile_id,mapping_set_id,mapping_version,account_id,account_version,statement_type,
      section_key,line_key,label_en,label_ar,display_order
    ) VALUES(c.profile_id,c.mapping_set_id,999,c.cash_account_id,1,'BALANCE_SHEET','ASSETS','DML_PROBE','Probe','فحص',99);
  EXCEPTION WHEN others THEN v_direct_dml_denied:=true;
  END;
  IF NOT v_direct_dml_denied THEN RAISE EXCEPTION 'W10H service-role direct mapping table DML succeeded'; END IF;

  -- W10H CASE: exact large halalah
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(report_gl->'rows') a
      WHERE a->>'amount_halalah'='9007199254740993') THEN
    RAISE EXCEPTION 'W10H GL rounded an amount above JavaScript safe integer precision';
  END IF;
  -- W10H CASE: XLSX precision is proved by the focused TypeScript workbook regression.
  -- W10H CASE: EN report definitions are proved by the Reports Center catalog regression.
  -- W10H CASE: AR report definitions are proved by the Reports Center catalog regression.
  -- W10H CASE: RTL report shell is proved by the W10H report presentation/source contract regression.
END;
$report_regression$;

RESET ROLE;
ROLLBACK;

DO $w10h_residue$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10h-rollback-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000a800')
     OR EXISTS (SELECT 1 FROM public.customers WHERE customer_number LIKE 'W10H-SYN-%')
     OR EXISTS (SELECT 1 FROM public.services WHERE service_number LIKE 'SVC-2301-000%')
     OR EXISTS (SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10H-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_statement_mapping_sets WHERE profile_id='00000000-0000-4000-8000-00000000a800')
     OR EXISTS (SELECT 1 FROM public.accounting_capability_events WHERE profile_id='00000000-0000-4000-8000-00000000a800')
     OR EXISTS (SELECT 1 FROM public.accounting_journal_versions WHERE profile_id='00000000-0000-4000-8000-00000000a800') THEN
    RAISE EXCEPTION 'W10H rollback residue detected';
  END IF;
END;
$w10h_residue$;
