-- W10E1 synthetic DEV regression only. One transaction is fully rolled back.
BEGIN;

CREATE TEMP TABLE w10e1_fixture_context (
  profile_id uuid NOT NULL,
  authority_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  service_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  period_id uuid,
  period_version integer,
  rule_id uuid,
  rule_version integer
);
INSERT INTO w10e1_fixture_context(profile_id,authority_id,operator_id,admin_id,customer_id,service_id,supplier_id)
VALUES('00000000-0000-4000-8000-00000000e800','00000000-0000-4000-8000-00000000e801',
  '00000000-0000-4000-8000-00000000e802','00000000-0000-4000-8000-00000000e803',
  '00000000-0000-4000-8000-00000000e810','00000000-0000-4000-8000-00000000e811',
  '00000000-0000-4000-8000-00000000e820');
GRANT SELECT,UPDATE ON w10e1_fixture_context TO service_role;

CREATE TEMP TABLE w10e1_fixture_accounts(mapping_key text PRIMARY KEY,account_id uuid NOT NULL);
GRANT SELECT,INSERT ON w10e1_fixture_accounts TO service_role;

CREATE TEMP TABLE w10e1_case_results(case_number integer PRIMARY KEY,description text NOT NULL,passed boolean NOT NULL);
GRANT SELECT,INSERT ON w10e1_case_results TO service_role;

CREATE FUNCTION pg_temp.w10e1_req(p_tag integer) RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog
AS $w10e1_req$ SELECT ('00000000-0000-4000-8000-e'||lpad(to_hex(p_tag),11,'0'))::uuid $w10e1_req$;

CREATE FUNCTION pg_temp.w10e1_assert(p_case integer,p_description text,p_passed boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10e1_assert$
BEGIN
  IF p_passed IS DISTINCT FROM true THEN RAISE EXCEPTION 'W10E1 case % failed: %',p_case,p_description; END IF;
  INSERT INTO pg_temp.w10e1_case_results(case_number,description,passed) VALUES(p_case,p_description,true);
END;
$w10e1_assert$;
GRANT EXECUTE ON FUNCTION pg_temp.w10e1_assert(integer,text,boolean) TO service_role;

CREATE FUNCTION pg_temp.w10e1_post(
  p_source_type text,p_source_id uuid,p_classification text,p_amount bigint,p_matched bigint,
  p_direct_classification text,p_accounting_date date,p_sequence integer,
  p_with_evidence boolean DEFAULT true,p_bind_cash boolean DEFAULT false
) RETURNS TABLE(error_code text,event_id uuid,event_version integer,journal_id uuid,journal_version integer,status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10e1_post$
DECLARE
  v_context pg_temp.w10e1_fixture_context%ROWTYPE;
  v_saved record; v_prepared record; v_posted record; v_cash_id uuid;
  v_evidence text; v_cash_evidence text;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10e1_fixture_context;
  SELECT a.account_id INTO v_cash_id FROM pg_temp.w10e1_fixture_accounts a WHERE a.mapping_key='cash_account';
  v_evidence:=CASE WHEN p_with_evidence THEN 'synthetic://w10e1/classification/'||p_source_type||'/'||p_source_id::text END;
  v_cash_evidence:=CASE WHEN p_bind_cash THEN 'synthetic://w10e1/cash-binding/'||p_source_type||'/'||p_source_id::text END;
  SELECT * INTO v_saved FROM public.save_accounting_ap_bridge_event(
    v_context.operator_id,p_source_type,p_source_id,0,p_classification,p_amount,p_matched,p_direct_classification,
    p_accounting_date,v_evidence,CASE WHEN p_with_evidence THEN repeat('e',64) END,
    v_cash_evidence,CASE WHEN p_bind_cash THEN repeat('f',64) END,
    CASE WHEN p_bind_cash THEN v_cash_id END,CASE WHEN p_bind_cash THEN 1 END,
    'W10E1 synthetic rollback fixture',pg_temp.w10e1_req(10000+p_sequence));
  IF v_saved.error_code IS NOT NULL THEN
    RETURN QUERY SELECT v_saved.error_code,v_saved.event_id,v_saved.version,NULL::uuid,NULL::integer,v_saved.status; RETURN;
  END IF;
  IF v_saved.status<>'READY' THEN
    RETURN QUERY SELECT NULL::text,v_saved.event_id,v_saved.version,NULL::uuid,NULL::integer,v_saved.status; RETURN;
  END IF;
  SELECT * INTO v_prepared FROM public.prepare_accounting_ap_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Prepare W10E1 synthetic event',pg_temp.w10e1_req(20000+p_sequence));
  IF v_prepared.error_code IS NOT NULL THEN
    RETURN QUERY SELECT v_prepared.error_code,v_saved.event_id,v_saved.version,v_prepared.journal_id,v_prepared.version,v_prepared.status; RETURN;
  END IF;
  SELECT * INTO v_posted FROM public.post_accounting_ap_bridge_journal(
    v_context.operator_id,v_prepared.journal_id,v_prepared.version,pg_temp.w10e1_req(30000+p_sequence));
  RETURN QUERY SELECT v_posted.error_code,v_saved.event_id,v_saved.version,v_posted.journal_id,v_posted.version,v_posted.status;
END;
$w10e1_post$;
GRANT EXECUTE ON FUNCTION pg_temp.w10e1_post(text,uuid,text,bigint,bigint,text,date,integer,boolean,boolean) TO service_role;

DO $preflight$
BEGIN
  IF EXISTS(SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10e1-rollback-%')
     OR EXISTS(SELECT 1 FROM public.customers WHERE customer_number LIKE 'W10E1-SYN-%')
     OR EXISTS(SELECT 1 FROM public.services WHERE service_number LIKE 'SVC-2099-91__')
     OR EXISTS(SELECT 1 FROM public.suppliers WHERE name LIKE 'W10E1 Synthetic Supplier%')
     OR EXISTS(SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000e800' OR singleton_key='g7')
     OR EXISTS(SELECT 1 FROM public.accounting_foundation_events
       WHERE id BETWEEN '00000000-0000-4000-8000-00000000e800' AND '00000000-0000-4000-8000-00000000e8ff') THEN
    RAISE EXCEPTION 'W10E1 rollback fixture collision or accounting profile already exists; inspect before running';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.company_settings WHERE setting_key='default') THEN
    RAISE EXCEPTION 'W10E1 rollback fixture requires default company settings';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_capability_catalog
      WHERE capability='accounting:manage_ap_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10E') THEN
    RAISE EXCEPTION 'W10E1 bridge capability is not enabled by the migration';
  END IF;
  IF NOT has_function_privilege('service_role','public.save_accounting_ap_bridge_event(uuid,text,uuid,integer,text,bigint,bigint,text,date,text,text,text,text,uuid,integer,text,uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.prepare_accounting_ap_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.post_accounting_ap_bridge_journal(uuid,uuid,integer,uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.get_accounting_ap_bridge_reconciliation(uuid,date,timestamptz,integer)','EXECUTE')
     OR EXISTS(SELECT 1 FROM (VALUES
       ('public.accounting_ap_bridge_events'),('public.accounting_ap_bridge_event_versions'),
       ('public.accounting_ap_bridge_journal_links'),('public.accounting_ap_bridge_journal_lines')
     ) AS t(table_name) WHERE has_table_privilege('service_role',table_name,'SELECT')) THEN
    RAISE EXCEPTION 'W10E1 service_role RPC/table grant contract differs';
  END IF;
END;
$preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
 ('00000000-0000-4000-8000-00000000e801','w10e1-rollback-authority','w10e1-authority@example.invalid','Synthetic W10E1 authority','viewer',true),
 ('00000000-0000-4000-8000-00000000e802','w10e1-rollback-operator','w10e1-operator@example.invalid','Synthetic W10E1 operator','viewer',true),
 ('00000000-0000-4000-8000-00000000e803','w10e1-rollback-admin','w10e1-admin@example.invalid','Synthetic W10E1 admin','admin',true);

INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT '00000000-0000-4000-8000-00000000e800','g7',s.id,0 FROM public.company_settings s WHERE s.setting_key='default';
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
  evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES('00000000-0000-4000-8000-00000000e840','00000000-0000-4000-8000-00000000e800',
  'accounting_profile_updated','accounting_profile','00000000-0000-4000-8000-00000000e800',1,
  '00000000-0000-4000-8000-00000000e801','00000000-0000-4000-8000-00000000e841',
  'Synthetic W10E1 rollback profile',NULL,repeat('a',64),
  'accounting_profiles/00000000-0000-4000-8000-00000000e800/1',transaction_timestamp());
INSERT INTO public.accounting_profile_versions(
  profile_id,version,previous_version,framework_key,framework_edition,policy_version,endorsement_context,
  professional_validation_state,professional_validation_evidence_ref,functional_currency,
  fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,fiscal_timezone,
  accounting_start_date,cutover_boundary_date,legal_fiscal_evidence_pending,legal_fiscal_evidence_ref,
  vat_mode,zatca_state,fatoora_state,activation_state,effective_from,reason,evidence_ref,created_by,created_at,foundation_event_id
) VALUES('00000000-0000-4000-8000-00000000e800',1,NULL,'SA_IFRS_FOR_SMES',2025,'W10 provisional policy',
  'Synthetic W10E1 rollback fixture','DEFERRED',NULL,'SAR',1,1,12,31,'Asia/Riyadh',
  '2000-01-01',CURRENT_DATE-1,true,NULL,'not_registered','INACTIVE','INACTIVE','DEV_PROVISIONAL',
  transaction_timestamp(),'Synthetic W10E1 profile',NULL,'00000000-0000-4000-8000-00000000e801',
  transaction_timestamp(),'00000000-0000-4000-8000-00000000e840');
UPDATE public.accounting_profiles SET current_version=1 WHERE id='00000000-0000-4000-8000-00000000e800';

INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
  evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES('00000000-0000-4000-8000-00000000e842','00000000-0000-4000-8000-00000000e800',
  'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000e844',1,
  '00000000-0000-4000-8000-00000000e801','00000000-0000-4000-8000-00000000e843',
  'Synthetic W10E1 authority bootstrap',NULL,repeat('b',64),'accounting:manage_authority',transaction_timestamp());
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,reason,evidence_ref,
  request_id,payload_fingerprint,foundation_event_id,created_at
) VALUES('00000000-0000-4000-8000-00000000e844','00000000-0000-4000-8000-00000000e800',
  '00000000-0000-4000-8000-00000000e801','accounting:manage_authority',1,'ALLOW',NULL,
  '00000000-0000-4000-8000-00000000e801','Synthetic W10E1 authority bootstrap',NULL,
  '00000000-0000-4000-8000-00000000e843',repeat('b',64),'00000000-0000-4000-8000-00000000e842',transaction_timestamp());

INSERT INTO public.customers(id,customer_number,company,contact,email,phone,city,status,created_by)
VALUES('00000000-0000-4000-8000-00000000e810','W10E1-SYN-CUSTOMER','W10E1 Synthetic Supplier Test',
  'Fixture Contact','w10e1-customer@example.invalid','+966500000810','Riyadh','active','w10e1-rollback-operator');
INSERT INTO public.services(id,service_number,customer_id,service_title,status)
VALUES('00000000-0000-4000-8000-00000000e811','SVC-2099-9101','00000000-0000-4000-8000-00000000e810',
  'W10E1 synthetic AP bridge Service','Inquiry');
INSERT INTO public.suppliers(id,name,contact,phone,service,status)
VALUES('00000000-0000-4000-8000-00000000e820','W10E1 Synthetic Supplier','Fixture Contact','+966500000820','Synthetic service','active');

SET LOCAL ROLE service_role;

DO $setup_accounting$
DECLARE
  v_context pg_temp.w10e1_fixture_context%ROWTYPE; v_result record; v_account jsonb;
  v_spec record; v_period jsonb; v_rule jsonb; v_mappings jsonb; v_grant record; v_request integer:=0;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10e1_fixture_context;
  FOR v_grant IN SELECT * FROM (VALUES
    ('accounting:manage_chart'),('accounting:manage_periods'),('accounting:manage_ap_bridge'),
    ('accounting:view'),('accounting:prepare_journal')
  ) AS g(capability) LOOP
    v_request:=v_request+1;
    SELECT * INTO v_result FROM public.set_accounting_capability(
      v_context.authority_id,v_context.operator_id,v_grant.capability,'ALLOW',NULL,0,
      'Synthetic W10E1 fixture capability',NULL,pg_temp.w10e1_req(4000+v_request));
    IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E1 capability grant failed for %: %',v_grant.capability,v_result.error_code; END IF;
  END LOOP;

  FOR v_spec IN SELECT * FROM (VALUES
    ('accounts_payable','W10E1-SYN-AP','Synthetic AP control','حساب ذمم دائنة اصطناعي','LIABILITY','CREDIT',true,'ACCOUNTS_PAYABLE'),
    ('accrued_liability','W10E1-SYN-ACCRUED','Synthetic accrued liability','التزام مستحق اصطناعي','LIABILITY','CREDIT',true,'ACCRUED_LIABILITY'),
    ('supplier_advance','W10E1-SYN-ADVANCE','Synthetic supplier advance','سلفة مورد اصطناعية','ASSET','DEBIT',true,'SUPPLIER_ADVANCE'),
     ('cash_account','W10E1-SYN-CASH','Synthetic cash account','حساب نقد اصطناعي','ASSET','DEBIT',true,'CASH_ACCOUNTABILITY'),
     ('cash_account_alt','W10E1-SYN-CASH-ALT','Synthetic alternate cash account','حساب نقد اصطناعي بديل','ASSET','DEBIT',true,'CASH_ACCOUNTABILITY'),
    ('direct_expense','W10E1-SYN-EXPENSE','Synthetic direct expense','مصروف مباشر اصطناعي','EXPENSE','DEBIT',false,'NONE'),
    ('direct_asset','W10E1-SYN-ASSET','Synthetic direct asset','أصل مباشر اصطناعي','ASSET','DEBIT',false,'NONE')
  ) AS a(mapping_key,account_code,name_en,name_ar,account_type,normal_balance,is_protected,control_classification) LOOP
    v_account:=jsonb_build_object('account_code',v_spec.account_code,'name_en',v_spec.name_en,'name_ar',v_spec.name_ar,
      'account_type',v_spec.account_type,'category','synthetic','normal_balance',v_spec.normal_balance,
      'account_kind','POSTING','parent_account_id',NULL,'is_active',true,'is_protected',v_spec.is_protected,
      'control_classification',v_spec.control_classification);
    SELECT * INTO v_result FROM public.save_accounting_account(
      v_context.operator_id,NULL,0,v_account,'Create W10E1 synthetic chart account',NULL,
      pg_temp.w10e1_req(5000+v_request));
    v_request:=v_request+1;
    IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN
      RAISE EXCEPTION 'W10E1 account creation failed for %: %',v_spec.mapping_key,v_result.error_code;
    END IF;
    INSERT INTO pg_temp.w10e1_fixture_accounts(mapping_key,account_id) VALUES(v_spec.mapping_key,v_result.account_id);
  END LOOP;

  v_period:=jsonb_build_object('start_date',make_date(extract(year FROM CURRENT_DATE)::integer,1,1),
    'end_date',make_date(extract(year FROM CURRENT_DATE)::integer,12,31),'status','OPEN');
  SELECT * INTO v_result FROM public.save_accounting_period(
    v_context.operator_id,NULL,0,v_period,'Create W10E1 synthetic OPEN period',NULL,pg_temp.w10e1_req(5100));
  IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN RAISE EXCEPTION 'W10E1 period setup failed: %',v_result.error_code; END IF;
  UPDATE pg_temp.w10e1_fixture_context SET period_id=v_result.period_id,period_version=v_result.version;

  SELECT jsonb_agg(jsonb_build_object('mapping_key',a.mapping_key,'account_id',a.account_id,
    'account_version',1,'allowed_side','EITHER','service_requirement','OPTIONAL') ORDER BY a.mapping_key)
    INTO v_mappings FROM pg_temp.w10e1_fixture_accounts a WHERE a.mapping_key<>'cash_account_alt';
  v_rule:=jsonb_build_object('rule_code','W10E1_SYN_AP_BRIDGE','name_en','Synthetic W10E1 AP bridge',
    'name_ar','قاعدة جسر الذمم الدائنة الاصطناعية','is_active',true,'mappings',v_mappings);
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    v_context.operator_id,NULL,0,v_rule,'Create W10E1 synthetic posting rule',NULL,pg_temp.w10e1_req(5101));
  IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN RAISE EXCEPTION 'W10E1 rule setup failed: %',v_result.error_code; END IF;
  UPDATE pg_temp.w10e1_fixture_context SET rule_id=v_result.posting_rule_id,rule_version=v_result.version;
END;
$setup_accounting$;

-- Seed W6 source facts and inspect rollback-only accounting rows as the fixture owner.
RESET ROLE;

INSERT INTO public.approved_commitments(
  id,service_id,supplier_id,commitment_source,source_reference,original_approved_amount,currency,status,
  approved_at,approved_by,created_by,updated_by
) VALUES
 ('00000000-0000-4000-8000-00000000e821','00000000-0000-4000-8000-00000000e811','00000000-0000-4000-8000-00000000e820','other_authorized','W10E1 synthetic commitment 1',500,'SAR','open',transaction_timestamp()-interval '10 days','w10e1-rollback-operator','w10e1-rollback-operator','w10e1-rollback-operator'),
 ('00000000-0000-4000-8000-00000000e822','00000000-0000-4000-8000-00000000e811','00000000-0000-4000-8000-00000000e820','other_authorized','W10E1 synthetic commitment 2',1000,'SAR','open',transaction_timestamp()-interval '10 days','w10e1-rollback-operator','w10e1-rollback-operator','w10e1-rollback-operator'),
 ('00000000-0000-4000-8000-00000000e823','00000000-0000-4000-8000-00000000e811','00000000-0000-4000-8000-00000000e820','other_authorized','W10E1 synthetic commitment 3',100,'SAR','open',transaction_timestamp()-interval '10 days','w10e1-rollback-operator','w10e1-rollback-operator','w10e1-rollback-operator');

INSERT INTO public.service_receipts(
  id,service_id,supplier_id,commitment_id,acceptance_status,performance_date,delivered_scope,
  received_amount,submitted_by,reviewed_at,reviewed_by,created_at,updated_at,created_by,updated_by
) VALUES
 ('00000000-0000-4000-8000-00000000e831','00000000-0000-4000-8000-00000000e811','00000000-0000-4000-8000-00000000e820','00000000-0000-4000-8000-00000000e821','ACCEPTED',CURRENT_DATE-8,'Accepted synthetic service receipt one',100,'w10e1-rollback-operator',transaction_timestamp()-interval '8 days','w10e1-rollback-operator',transaction_timestamp()-interval '8 days',transaction_timestamp()-interval '8 days','w10e1-rollback-operator','w10e1-rollback-operator'),
 ('00000000-0000-4000-8000-00000000e832','00000000-0000-4000-8000-00000000e811','00000000-0000-4000-8000-00000000e820','00000000-0000-4000-8000-00000000e823','ACCEPTED',CURRENT_DATE-7,'Accepted receipt with no supported valuation',NULL,'w10e1-rollback-operator',transaction_timestamp()-interval '7 days','w10e1-rollback-operator',transaction_timestamp()-interval '7 days',transaction_timestamp()-interval '7 days','w10e1-rollback-operator','w10e1-rollback-operator'),
 ('00000000-0000-4000-8000-00000000e833','00000000-0000-4000-8000-00000000e811','00000000-0000-4000-8000-00000000e820','00000000-0000-4000-8000-00000000e822','ACCEPTED',CURRENT_DATE-6,'Accepted receipt shared by synthetic bills',300,'w10e1-rollback-operator',transaction_timestamp()-interval '6 days','w10e1-rollback-operator',transaction_timestamp()-interval '6 days',transaction_timestamp()-interval '6 days','w10e1-rollback-operator','w10e1-rollback-operator'),
 ('00000000-0000-4000-8000-00000000e834','00000000-0000-4000-8000-00000000e811','00000000-0000-4000-8000-00000000e820','00000000-0000-4000-8000-00000000e823','ACCEPTED',CURRENT_DATE-5,'Accepted receipt for direct bill support',20,'w10e1-rollback-operator',transaction_timestamp()-interval '5 days','w10e1-rollback-operator',transaction_timestamp()-interval '5 days',transaction_timestamp()-interval '5 days','w10e1-rollback-operator','w10e1-rollback-operator');

INSERT INTO public.service_receipt_corrections(
  id,receipt_id,correction_number,prior_acceptance_status,prior_received_amount,prior_decision_at,prior_decision_by,
  corrected_acceptance_status,corrected_received_amount,correction_reason,corrected_at,corrected_by,request_id,created_by
) VALUES
 ('00000000-0000-4000-8000-00000000e841','00000000-0000-4000-8000-00000000e831',1,'ACCEPTED',100,transaction_timestamp()-interval '8 days','w10e1-rollback-operator','ACCEPTED',90,'Correct synthetic receipt valuation',CURRENT_DATE::timestamptz,'w10e1-rollback-operator','00000000-0000-4000-8000-00000000e842','w10e1-rollback-operator'),
 ('00000000-0000-4000-8000-00000000e843','00000000-0000-4000-8000-00000000e833',1,'ACCEPTED',300,transaction_timestamp()-interval '6 days','w10e1-rollback-operator','ACCEPTED',285,'Correction exceeds remaining accrued amount after bill matching',CURRENT_DATE::timestamptz,'w10e1-rollback-operator','00000000-0000-4000-8000-00000000e844','w10e1-rollback-operator');

INSERT INTO public.supplier_bills(
  id,bill_number,service_id,supplier_id,commitment_id,service_receipt_id,invoice_number,invoice_date,due_date,
  currency,subtotal,vat_amount,total_amount,supplier_name_snapshot,supplier_legal_name_snapshot,
  supplier_vat_registration_status_snapshot,status,recorded_by,recorded_at,updated_by,updated_at,approved_by,approved_at,record_request_id
)
SELECT x.id,x.bill_number,'00000000-0000-4000-8000-00000000e811','00000000-0000-4000-8000-00000000e820',
  x.commitment_id,x.receipt_id,x.invoice_number,CURRENT_DATE-4,CURRENT_DATE+30,'SAR',x.amount,0,x.amount,
  'W10E1 Synthetic Supplier','W10E1 Synthetic Supplier Legal','unknown','approved',
  '00000000-0000-4000-8000-00000000e802',transaction_timestamp()-interval '4 days',
  '00000000-0000-4000-8000-00000000e802',transaction_timestamp()-interval '4 days',
  '00000000-0000-4000-8000-00000000e802',transaction_timestamp()-interval '4 days',x.request_id
FROM (VALUES
 ('00000000-0000-4000-8000-00000000e851'::uuid,'BILL-'||to_char(CURRENT_DATE,'YYYY')||'-9001','00000000-0000-4000-8000-00000000e822'::uuid,'00000000-0000-4000-8000-00000000e833'::uuid,'W10E1-INVOICE-01',100::numeric,'00000000-0000-4000-8000-00000000e851'::uuid),
 ('00000000-0000-4000-8000-00000000e852'::uuid,'BILL-'||to_char(CURRENT_DATE,'YYYY')||'-9002','00000000-0000-4000-8000-00000000e822'::uuid,'00000000-0000-4000-8000-00000000e833'::uuid,'W10E1-INVOICE-02',100::numeric,'00000000-0000-4000-8000-00000000e852'::uuid),
 ('00000000-0000-4000-8000-00000000e853'::uuid,'BILL-'||to_char(CURRENT_DATE,'YYYY')||'-9003','00000000-0000-4000-8000-00000000e822'::uuid,'00000000-0000-4000-8000-00000000e833'::uuid,'W10E1-INVOICE-03',200::numeric,'00000000-0000-4000-8000-00000000e853'::uuid),
 ('00000000-0000-4000-8000-00000000e854'::uuid,'BILL-'||to_char(CURRENT_DATE,'YYYY')||'-9004','00000000-0000-4000-8000-00000000e823'::uuid,'00000000-0000-4000-8000-00000000e832'::uuid,'W10E1-INVOICE-04',20::numeric,'00000000-0000-4000-8000-00000000e854'::uuid),
 ('00000000-0000-4000-8000-00000000e855'::uuid,'BILL-'||to_char(CURRENT_DATE,'YYYY')||'-9005','00000000-0000-4000-8000-00000000e823'::uuid,'00000000-0000-4000-8000-00000000e832'::uuid,'W10E1-INVOICE-05',10::numeric,'00000000-0000-4000-8000-00000000e855'::uuid),
 ('00000000-0000-4000-8000-00000000e856'::uuid,'BILL-'||to_char(CURRENT_DATE,'YYYY')||'-9006','00000000-0000-4000-8000-00000000e823'::uuid,'00000000-0000-4000-8000-00000000e832'::uuid,'W10E1-INVOICE-06',5::numeric,'00000000-0000-4000-8000-00000000e856'::uuid),
 ('00000000-0000-4000-8000-00000000e857'::uuid,'BILL-'||to_char(CURRENT_DATE,'YYYY')||'-9007','00000000-0000-4000-8000-00000000e822'::uuid,'00000000-0000-4000-8000-00000000e833'::uuid,'W10E1-INVOICE-07',3::numeric,'00000000-0000-4000-8000-00000000e857'::uuid)
) AS x(id,bill_number,commitment_id,receipt_id,invoice_number,amount,request_id);

INSERT INTO public.supplier_payments(
  id,payment_number,supplier_bill_id,supplier_id,service_id,payment_date,amount,method,recorded_by,recorded_at,record_request_id
) VALUES
 ('00000000-0000-4000-8000-00000000e861','SPAY-'||to_char(CURRENT_DATE,'YYYY')||'-9001','00000000-0000-4000-8000-00000000e851','00000000-0000-4000-8000-00000000e820','00000000-0000-4000-8000-00000000e811',CURRENT_DATE-3,20,'cash','00000000-0000-4000-8000-00000000e802',transaction_timestamp()-interval '3 days','00000000-0000-4000-8000-00000000e861'),
 ('00000000-0000-4000-8000-00000000e862','SPAY-'||to_char(CURRENT_DATE,'YYYY')||'-9002','00000000-0000-4000-8000-00000000e854','00000000-0000-4000-8000-00000000e820','00000000-0000-4000-8000-00000000e811',CURRENT_DATE-2,1,'cash','00000000-0000-4000-8000-00000000e802',transaction_timestamp()-interval '2 days','00000000-0000-4000-8000-00000000e862');
INSERT INTO public.supplier_payment_reversals(id,supplier_payment_id,reason,reversed_by,reversed_at,reversal_request_id)
VALUES('00000000-0000-4000-8000-00000000e871','00000000-0000-4000-8000-00000000e861',
  'Synthetic payment correction', '00000000-0000-4000-8000-00000000e802',transaction_timestamp()+interval '2 days',
  '00000000-0000-4000-8000-00000000e871');

INSERT INTO public.supplier_advances(
  id,advance_number,commitment_id,service_id,supplier_id,currency,authorized_amount,reason,evidence_sha256,
  authorized_by,authorized_at,authorization_request_id,created_at
) VALUES
 ('00000000-0000-4000-8000-00000000e881','W10E1-ADVANCE-01','00000000-0000-4000-8000-00000000e822','00000000-0000-4000-8000-00000000e811','00000000-0000-4000-8000-00000000e820','SAR',10,'Synthetic advance authorization',repeat('a',64),'00000000-0000-4000-8000-00000000e802',transaction_timestamp()-interval '5 days','00000000-0000-4000-8000-00000000e881',transaction_timestamp()-interval '5 days'),
 ('00000000-0000-4000-8000-00000000e882','W10E1-ADVANCE-02','00000000-0000-4000-8000-00000000e822','00000000-0000-4000-8000-00000000e811','00000000-0000-4000-8000-00000000e820','SAR',50,'Synthetic advance authorization',repeat('b',64),'00000000-0000-4000-8000-00000000e802',transaction_timestamp()-interval '5 days','00000000-0000-4000-8000-00000000e882',transaction_timestamp()-interval '5 days');
INSERT INTO public.supplier_advance_payments(
  id,payment_number,supplier_advance_id,supplier_id,service_id,payment_date,amount,method,recorded_by,recorded_at,record_request_id
) VALUES
 ('00000000-0000-4000-8000-00000000e863','SPAY-'||to_char(CURRENT_DATE,'YYYY')||'-9003','00000000-0000-4000-8000-00000000e881','00000000-0000-4000-8000-00000000e820','00000000-0000-4000-8000-00000000e811',CURRENT_DATE-2,10,'cash','00000000-0000-4000-8000-00000000e802',transaction_timestamp()-interval '2 days','00000000-0000-4000-8000-00000000e863'),
 ('00000000-0000-4000-8000-00000000e864','SPAY-'||to_char(CURRENT_DATE,'YYYY')||'-9004','00000000-0000-4000-8000-00000000e882','00000000-0000-4000-8000-00000000e820','00000000-0000-4000-8000-00000000e811',CURRENT_DATE-2,10,'cash','00000000-0000-4000-8000-00000000e802',transaction_timestamp()-interval '2 days','00000000-0000-4000-8000-00000000e864');
INSERT INTO public.supplier_advance_payment_reversals(id,supplier_advance_payment_id,reason,reversed_by,reversed_at,reversal_request_id)
VALUES('00000000-0000-4000-8000-00000000e872','00000000-0000-4000-8000-00000000e863',
  'Synthetic advance payment correction','00000000-0000-4000-8000-00000000e802',transaction_timestamp(),
  '00000000-0000-4000-8000-00000000e872');
INSERT INTO public.supplier_advance_allocations(
  id,allocation_number,supplier_advance_id,supplier_bill_id,amount,allocated_by,allocated_at,allocation_request_id
) VALUES('00000000-0000-4000-8000-00000000e891','W10E1-ALLOC-01','00000000-0000-4000-8000-00000000e882',
  '00000000-0000-4000-8000-00000000e852',5,'00000000-0000-4000-8000-00000000e802',
  transaction_timestamp()-interval '1 day','00000000-0000-4000-8000-00000000e891');
INSERT INTO public.supplier_advance_allocation_reversals(
  id,supplier_advance_allocation_id,reason,corrected_by,corrected_at,correction_request_id
) VALUES('00000000-0000-4000-8000-00000000e873','00000000-0000-4000-8000-00000000e891',
  'Synthetic advance allocation correction','00000000-0000-4000-8000-00000000e802',
  transaction_timestamp(),'00000000-0000-4000-8000-00000000e873');
INSERT INTO public.supplier_advance_refunds(
  id,refund_number,supplier_advance_id,business_date,amount,reason,evidence_sha256,recorded_by,recorded_at,record_request_id
) VALUES('00000000-0000-4000-8000-00000000e892','W10E1-REFUND-01','00000000-0000-4000-8000-00000000e882',
  CURRENT_DATE-1,2,'Synthetic supplier advance refund',repeat('c',64),
  '00000000-0000-4000-8000-00000000e802',transaction_timestamp()-interval '1 day','00000000-0000-4000-8000-00000000e892');

DO $w10e1_campaign$
DECLARE
  v_context pg_temp.w10e1_fixture_context%ROWTYPE; v_result record; v_retry record; v_conflict record;
  v_saved record; v_prepared record; v_cash uuid; v_receipt_lines integer; v_event_count integer;
   v_report jsonb; v_event jsonb; v_balance record; v_tb record; v_denied boolean:=false;
   v_cash_alt uuid; v_mismatch_event uuid; v_mismatch_version integer; v_payment_cash_mismatch_held boolean;
   v_advance_cash_mismatch_held boolean;
  v_pkg uuid:='00000000-0000-4000-8000-00000000e8a0'; v_cov uuid:='00000000-0000-4000-8000-00000000e8a1';
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10e1_fixture_context;
  SELECT account_id INTO v_cash FROM pg_temp.w10e1_fixture_accounts WHERE mapping_key='cash_account';
   SELECT account_id INTO v_cash_alt FROM pg_temp.w10e1_fixture_accounts WHERE mapping_key='cash_account_alt';

  SELECT * INTO v_result FROM pg_temp.w10e1_post('SERVICE_RECEIPT','00000000-0000-4000-8000-00000000e831',
    'RECEIPT_ACCRUAL',10000,0,'DIRECT_EXPENSE',CURRENT_DATE-8,1,true,false);
  PERFORM pg_temp.w10e1_assert(1,'accepted receipt with supported expense valuation',v_result.status='POSTED' AND v_result.error_code IS NULL);
  PERFORM pg_temp.w10e1_assert(3,'receipt accrual to accrued liability',EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_result.event_id
      AND l.party_role='ACCRUED_LIABILITY' AND l.side='CREDIT' AND l.amount_halalah=10000));

  SELECT * INTO v_result FROM pg_temp.w10e1_post('SERVICE_RECEIPT','00000000-0000-4000-8000-00000000e832',
    'RECEIPT_ACCRUAL',NULL,0,NULL,CURRENT_DATE-7,2,false,false);
  PERFORM pg_temp.w10e1_assert(2,'accepted receipt with unsupported valuation held',v_result.status='HELD'
    AND v_result.journal_id IS NULL AND (SELECT held_code FROM public.accounting_ap_bridge_event_versions
      WHERE event_id=v_result.event_id AND version=v_result.event_version)='classification_evidence_missing');

  SELECT * INTO v_result FROM pg_temp.w10e1_post('SERVICE_RECEIPT','00000000-0000-4000-8000-00000000e833',
    'RECEIPT_ACCRUAL',30000,0,'DIRECT_EXPENSE',CURRENT_DATE-6,3,true,false);
  IF v_result.status<>'POSTED' THEN RAISE EXCEPTION 'shared receipt accrual failed: %',v_result.error_code; END IF;

  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_BILL','00000000-0000-4000-8000-00000000e851',
    'SUPPLIER_BILL',NULL,6000,'DIRECT_EXPENSE',CURRENT_DATE-4,4,true,false);
  PERFORM pg_temp.w10e1_assert(4,'partial Supplier Bill matching',v_result.status='POSTED' AND EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_result.event_id
      AND l.party_role='ACCRUED_LIABILITY' AND l.side='DEBIT' AND l.amount_halalah=6000));
  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_BILL','00000000-0000-4000-8000-00000000e852',
    'SUPPLIER_BILL',NULL,10000,NULL,CURRENT_DATE-4,5,false,false);
  PERFORM pg_temp.w10e1_assert(5,'full matching',v_result.status='POSTED' AND NOT EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_result.event_id AND l.party_role='DIRECT_EXPENSE'));
  SELECT count(*) INTO v_receipt_lines FROM public.accounting_ap_bridge_journal_lines l
    WHERE l.receipt_id='00000000-0000-4000-8000-00000000e833' AND l.party_role='ACCOUNTS_PAYABLE'
      AND l.side='CREDIT' AND l.event_id IN (
        SELECT event_id FROM public.accounting_ap_bridge_events WHERE source_type='SUPPLIER_BILL'
          AND source_record_id IN ('00000000-0000-4000-8000-00000000e851','00000000-0000-4000-8000-00000000e852'));
  PERFORM pg_temp.w10e1_assert(6,'multiple bills against one eligible accrual',v_receipt_lines=2);

  SELECT * INTO v_saved FROM public.save_accounting_ap_bridge_event(
    v_context.operator_id,'SUPPLIER_BILL','00000000-0000-4000-8000-00000000e853',0,'SUPPLIER_BILL',NULL,15000,
    'DIRECT_EXPENSE',CURRENT_DATE-4,'synthetic://w10e1/ceiling',repeat('e',64),NULL,NULL,NULL,NULL,
    'W10E1 ceiling regression',pg_temp.w10e1_req(10006));
  SELECT * INTO v_prepared FROM public.prepare_accounting_ap_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Attempt ceiling excess',pg_temp.w10e1_req(20006));
  PERFORM pg_temp.w10e1_assert(7,'bill match ceiling rejection',v_prepared.error_code='receipt_match_exceeds_accrual'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_journal_links WHERE event_id=v_saved.event_id));

  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_BILL','00000000-0000-4000-8000-00000000e854',
    'SUPPLIER_BILL',NULL,0,'DIRECT_EXPENSE',CURRENT_DATE-4,7,true,false);
  PERFORM pg_temp.w10e1_assert(8,'bill without prior accrual direct supported',v_result.status='POSTED' AND EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_result.event_id
      AND l.party_role='DIRECT_EXPENSE' AND l.side='DEBIT' AND l.amount_halalah=2000));
  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_BILL','00000000-0000-4000-8000-00000000e855',
    'SUPPLIER_BILL',NULL,0,NULL,CURRENT_DATE-4,8,false,false);
  PERFORM pg_temp.w10e1_assert(9,'unsupported residual bill classification held',v_result.status='HELD'
    AND (SELECT held_code FROM public.accounting_ap_bridge_event_versions WHERE event_id=v_result.event_id
      AND version=v_result.event_version)='direct_residual_evidence_missing' AND v_result.journal_id IS NULL);

  SELECT * INTO v_result FROM pg_temp.w10e1_post('SERVICE_RECEIPT_CORRECTION','00000000-0000-4000-8000-00000000e841',
    'RECEIPT_CORRECTION_DECREASE',1000,0,'DIRECT_EXPENSE',CURRENT_DATE,9,true,false);
  PERFORM pg_temp.w10e1_assert(10,'correction supported delta',v_result.status='POSTED' AND EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_result.event_id
      AND l.party_role='ACCRUED_LIABILITY' AND l.side='DEBIT' AND l.amount_halalah=1000));
  SELECT * INTO v_result FROM pg_temp.w10e1_post('SERVICE_RECEIPT_CORRECTION','00000000-0000-4000-8000-00000000e843',
    'RECEIPT_CORRECTION_DECREASE',15000,0,'DIRECT_EXPENSE',CURRENT_DATE,10,true,false);
  PERFORM pg_temp.w10e1_assert(11,'correction conflicting with already matched bill held',v_result.status='HELD'
    AND (SELECT held_code FROM public.accounting_ap_bridge_event_versions WHERE event_id=v_result.event_id
      AND version=v_result.event_version)='receipt_match_exceeds_accrual' AND v_result.journal_id IS NULL);

  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_PAYMENT','00000000-0000-4000-8000-00000000e861',
    'SUPPLIER_PAYMENT',NULL,0,NULL,CURRENT_DATE-3,11,true,true);
  PERFORM pg_temp.w10e1_assert(12,'supplier payment',v_result.status='POSTED' AND EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_result.event_id
      AND l.party_role='CASH_ACCOUNT' AND l.side='CREDIT' AND l.account_id=v_cash));
   SELECT * INTO v_saved FROM public.save_accounting_ap_bridge_event(
     v_context.operator_id,'SUPPLIER_PAYMENT_REVERSAL','00000000-0000-4000-8000-00000000e871',0,
     'SUPPLIER_PAYMENT_REVERSAL',NULL,0,NULL,CURRENT_DATE+2,NULL,NULL,
     'synthetic://w10e1/cash-binding/payment-mismatch',repeat('f',64),v_cash_alt,1,
     'W10E1 mismatched payment reversal cash account',pg_temp.w10e1_req(10134));
   v_payment_cash_mismatch_held:=v_saved.error_code IS NULL AND v_saved.status='HELD'
     AND EXISTS(SELECT 1 FROM public.accounting_ap_bridge_event_versions WHERE event_id=v_saved.event_id
       AND version=v_saved.version AND held_code='cash_binding_mismatch');
   v_mismatch_event:=v_saved.event_id; v_mismatch_version:=v_saved.version;
   SELECT * INTO v_saved FROM public.save_accounting_ap_bridge_event(
     v_context.operator_id,'SUPPLIER_PAYMENT_REVERSAL','00000000-0000-4000-8000-00000000e871',v_mismatch_version,
     'SUPPLIER_PAYMENT_REVERSAL',NULL,0,NULL,CURRENT_DATE+2,NULL,NULL,
     'synthetic://w10e1/cash-binding/payment-corrected',repeat('f',64),v_cash,1,
     'W10E1 corrected payment reversal cash account',pg_temp.w10e1_req(10135));
   SELECT * INTO v_prepared FROM public.prepare_accounting_ap_bridge_event(
     v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
     v_context.rule_id,v_context.rule_version,'Prepare corrected W10E1 payment reversal',pg_temp.w10e1_req(20134));
   SELECT * INTO v_result FROM public.post_accounting_ap_bridge_journal(
     v_context.operator_id,v_prepared.journal_id,v_prepared.version,pg_temp.w10e1_req(30134));
   PERFORM pg_temp.w10e1_assert(13,'payment reversal holds a mismatched cash binding before a supported correction',
     v_payment_cash_mismatch_held AND v_result.status='POSTED' AND EXISTS(
       SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_mismatch_event AND l.journal_id=v_result.journal_id
         AND l.party_role='CASH_ACCOUNT' AND l.side='DEBIT' AND l.account_id=v_cash));

  PERFORM pg_temp.w10e1_assert(14,'advance authorization no journal',NOT EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_events WHERE source_record_id='00000000-0000-4000-8000-00000000e881')
    AND EXISTS(SELECT 1 FROM public.supplier_advances WHERE id='00000000-0000-4000-8000-00000000e881'));
  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_ADVANCE_PAYMENT','00000000-0000-4000-8000-00000000e863',
    'SUPPLIER_ADVANCE_PAYMENT',NULL,0,NULL,CURRENT_DATE-2,13,true,true);
  SELECT * INTO v_retry FROM pg_temp.w10e1_post('SUPPLIER_ADVANCE_PAYMENT','00000000-0000-4000-8000-00000000e864',
    'SUPPLIER_ADVANCE_PAYMENT',NULL,0,NULL,CURRENT_DATE-2,20,true,true);
  PERFORM pg_temp.w10e1_assert(15,'advance payments for allocation and correction paths',v_result.status='POSTED' AND v_retry.status='POSTED' AND EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_result.event_id
      AND l.party_role='SUPPLIER_ADVANCE' AND l.side='DEBIT' AND l.amount_halalah=1000) AND EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_retry.event_id
      AND l.party_role='SUPPLIER_ADVANCE' AND l.side='DEBIT' AND l.amount_halalah=1000));
   SELECT * INTO v_saved FROM public.save_accounting_ap_bridge_event(
     v_context.operator_id,'SUPPLIER_ADVANCE_PAYMENT_REVERSAL','00000000-0000-4000-8000-00000000e872',0,
     'SUPPLIER_ADVANCE_PAYMENT_REVERSAL',NULL,0,NULL,CURRENT_DATE+2,NULL,NULL,
     'synthetic://w10e1/cash-binding/advance-mismatch',repeat('f',64),v_cash_alt,1,
     'W10E1 mismatched advance reversal cash account',pg_temp.w10e1_req(10136));
   v_advance_cash_mismatch_held:=v_saved.error_code IS NULL AND v_saved.status='HELD'
     AND EXISTS(SELECT 1 FROM public.accounting_ap_bridge_event_versions WHERE event_id=v_saved.event_id
       AND version=v_saved.version AND held_code='cash_binding_mismatch');
   v_mismatch_event:=v_saved.event_id; v_mismatch_version:=v_saved.version;
   SELECT * INTO v_saved FROM public.save_accounting_ap_bridge_event(
     v_context.operator_id,'SUPPLIER_ADVANCE_PAYMENT_REVERSAL','00000000-0000-4000-8000-00000000e872',v_mismatch_version,
     'SUPPLIER_ADVANCE_PAYMENT_REVERSAL',NULL,0,NULL,CURRENT_DATE+2,NULL,NULL,
     'synthetic://w10e1/cash-binding/advance-corrected',repeat('f',64),v_cash,1,
     'W10E1 corrected advance reversal cash account',pg_temp.w10e1_req(10137));
   SELECT * INTO v_prepared FROM public.prepare_accounting_ap_bridge_event(
     v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
     v_context.rule_id,v_context.rule_version,'Prepare corrected W10E1 advance reversal',pg_temp.w10e1_req(20135));
   SELECT * INTO v_result FROM public.post_accounting_ap_bridge_journal(
     v_context.operator_id,v_prepared.journal_id,v_prepared.version,pg_temp.w10e1_req(30135));
   PERFORM pg_temp.w10e1_assert(16,'advance payment reversal holds a mismatched cash binding before a supported correction',
     v_advance_cash_mismatch_held AND v_result.status='POSTED' AND EXISTS(
       SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_mismatch_event AND l.journal_id=v_result.journal_id
         AND l.party_role='SUPPLIER_ADVANCE' AND l.side='CREDIT' AND l.amount_halalah=1000));
  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_ADVANCE_ALLOCATION','00000000-0000-4000-8000-00000000e891',
    'SUPPLIER_ADVANCE_ALLOCATION',NULL,0,NULL,CURRENT_DATE-1,15,true,false);
  PERFORM pg_temp.w10e1_assert(17,'advance allocation',v_result.status='POSTED' AND NOT EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_result.event_id AND l.party_role='CASH_ACCOUNT'));
  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_ADVANCE_ALLOCATION_REVERSAL','00000000-0000-4000-8000-00000000e873',
    'SUPPLIER_ADVANCE_ALLOCATION_REVERSAL',NULL,0,NULL,CURRENT_DATE+3,16,true,false);
  PERFORM pg_temp.w10e1_assert(18,'allocation reversal',v_result.status='POSTED' AND EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_result.event_id
      AND l.party_role='ACCOUNTS_PAYABLE' AND l.side='CREDIT' AND l.amount_halalah=500));
  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_ADVANCE_REFUND','00000000-0000-4000-8000-00000000e892',
    'SUPPLIER_ADVANCE_REFUND',NULL,0,NULL,CURRENT_DATE-1,17,true,true);
  PERFORM pg_temp.w10e1_assert(19,'advance refund',v_result.status='POSTED' AND EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_journal_lines l WHERE l.event_id=v_result.event_id
      AND l.party_role='SUPPLIER_ADVANCE' AND l.side='CREDIT' AND l.amount_halalah=200));
  SELECT * INTO v_result FROM public.save_accounting_ap_bridge_event(
    v_context.operator_id,'SUPPLIER_ADVANCE_REFUND_REVERSAL','00000000-0000-4000-8000-00000000e8b0',0,
    'SUPPLIER_ADVANCE_REFUND_REVERSAL',NULL,0,NULL,CURRENT_DATE,NULL,NULL,NULL,NULL,NULL,NULL,
    'Unsupported synthetic refund reversal',pg_temp.w10e1_req(1018));
  PERFORM pg_temp.w10e1_assert(20,'no invented refund reversal',v_result.error_code='unsupported_source'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_events WHERE source_type='SUPPLIER_ADVANCE_REFUND_REVERSAL'));

  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_PAYMENT','00000000-0000-4000-8000-00000000e862',
    'SUPPLIER_PAYMENT',NULL,0,NULL,CURRENT_DATE-2,18,true,false);
  PERFORM pg_temp.w10e1_assert(21,'explicit bank cash binding requirement',v_result.status='HELD'
    AND (SELECT held_code FROM public.accounting_ap_bridge_event_versions WHERE event_id=v_result.event_id
      AND version=v_result.event_version)='cash_account_evidence_missing');

  SELECT * INTO v_retry FROM public.save_accounting_ap_bridge_event(
    v_context.operator_id,'SERVICE_RECEIPT','00000000-0000-4000-8000-00000000e831',0,'RECEIPT_ACCRUAL',10000,0,
    'DIRECT_EXPENSE',CURRENT_DATE-8,'synthetic://w10e1/classification/SERVICE_RECEIPT/00000000-0000-4000-8000-00000000e831',
    repeat('e',64),NULL,NULL,NULL,NULL,'W10E1 synthetic rollback fixture',pg_temp.w10e1_req(10001));
  PERFORM pg_temp.w10e1_assert(22,'same request retry idempotency',v_retry.error_code IS NULL AND v_retry.idempotent_replay
    AND EXISTS(SELECT 1 FROM public.accounting_ap_bridge_events e WHERE e.id=v_retry.event_id
      AND e.source_record_id='00000000-0000-4000-8000-00000000e831'));
  SELECT * INTO v_conflict FROM public.save_accounting_ap_bridge_event(
    v_context.operator_id,'SERVICE_RECEIPT','00000000-0000-4000-8000-00000000e831',0,'RECEIPT_ACCRUAL',10000,0,
    'PREPAID_EXPENSE',CURRENT_DATE-8,'synthetic://w10e1/classification/SERVICE_RECEIPT/00000000-0000-4000-8000-00000000e831',
    repeat('e',64),NULL,NULL,NULL,NULL,'Changed payload for same request',pg_temp.w10e1_req(10001));
  PERFORM pg_temp.w10e1_assert(23,'changed payload same request identity collision',v_conflict.error_code='request_payload_conflict');
  SELECT * INTO v_prepared FROM public.prepare_accounting_ap_bridge_event(
    v_context.operator_id,v_retry.event_id,v_retry.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Retry same W10E1 economic effect',pg_temp.w10e1_req(21001));
  SELECT count(*) INTO v_event_count FROM public.accounting_source_effects se
    WHERE se.profile_id=v_context.profile_id AND se.source_domain='AP_BRIDGE'
      AND se.source_record_key='W6/SERVICE_RECEIPT/00000000-0000-4000-8000-00000000e831'
      AND se.economic_event_key='W6/SERVICE_RECEIPT/00000000-0000-4000-8000-00000000e831/AP_EFFECT';
  PERFORM pg_temp.w10e1_assert(24,'duplicate economic-effect prevention',v_prepared.error_code IS NULL
    AND v_prepared.idempotent_replay AND v_event_count=1);

  BEGIN
    SELECT * INTO v_result FROM public.prepare_accounting_journal(
      v_context.operator_id,NULL,0,jsonb_build_object('source_domain','CONTROLLED_MANUAL',
        'accounting_date',CURRENT_DATE,'period_id',v_context.period_id,'period_version',v_context.period_version,
        'posting_rule_id',v_context.rule_id,'rule_version',v_context.rule_version,
        'source_record_key','W10E1/SYN/MANUAL','economic_event_key','W10E1/SYN/MANUAL/EFFECT',
        'posting_purpose','manual','description_en','Synthetic manual protected account probe',
        'description_ar','اختبار حساب محمي اصطناعي','lines',jsonb_build_array(
          jsonb_build_object('mapping_key','accounts_payable','side','DEBIT','amount_halalah','1000','service_id',v_context.service_id,'description_en','probe','description_ar','اختبار'),
          jsonb_build_object('mapping_key','direct_expense','side','CREDIT','amount_halalah','1000','service_id',v_context.service_id,'description_en','probe','description_ar','اختبار'))),
      'Attempt ordinary manual protected-account posting',NULL,pg_temp.w10e1_req(1025));
    v_denied:=v_result.error_code IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN v_denied:=true;
  END;
  PERFORM pg_temp.w10e1_assert(25,'ordinary manual protected bypass rejected',v_denied
    AND NOT EXISTS(SELECT 1 FROM public.accounting_source_effects WHERE source_domain='CONTROLLED_MANUAL'
      AND source_record_key='W10E1/SYN/MANUAL'));

  INSERT INTO public.accounting_inception_packages(id,profile_id,current_version)
  VALUES(v_pkg,v_context.profile_id,0);
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
    evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES('00000000-0000-4000-8000-00000000e8a2',v_context.profile_id,'accounting_inception_package_created',
    'accounting_inception_package',v_pkg,1,v_context.operator_id,pg_temp.w10e1_req(1026),
    'Synthetic W10C coverage bootstrap',NULL,repeat('c',64),'accounting_inception_packages/'||v_pkg::text||'/1',clock_timestamp());
  INSERT INTO public.accounting_inception_package_versions(
    profile_id,package_id,version,previous_version,accounting_start_date,cutover_boundary_date,payload,
    payload_fingerprint,created_by,foundation_event_id
  ) VALUES(v_context.profile_id,v_pkg,1,NULL,'2000-01-01',CURRENT_DATE,
    jsonb_build_object('synthetic',true,'accounting_start_date','2000-01-01','cutover_boundary_date',CURRENT_DATE,
      'items',jsonb_build_array(jsonb_build_object(
        'item_id','00000000-0000-4000-8000-00000000e8a4','source_domain','AP_BRIDGE',
        'source_record_key','W6/SUPPLIER_BILL/00000000-0000-4000-8000-00000000e856',
        'economic_event_key','W6/SUPPLIER_BILL/00000000-0000-4000-8000-00000000e856/AP_EFFECT',
        'classification','RECONSTRUCTED_HISTORY','resolution_state','RESOLVED','is_material',true,
        'reconciliation_category','ACCOUNTS_PAYABLE','party_type','SUPPLIER',
        'party_reference',v_context.supplier_id::text,'reconciliation_reference','Synthetic W10C historical payable coverage',
        'evidence_refs',jsonb_build_array('synthetic://w10e1/w10c-evidence')))),
    repeat('c',64),v_context.operator_id,'00000000-0000-4000-8000-00000000e8a2');
  UPDATE public.accounting_inception_packages SET current_version=1 WHERE profile_id=v_context.profile_id AND id=v_pkg;
  INSERT INTO public.accounting_inception_coverage(
    id,profile_id,source_domain,source_record_key,economic_event_key,current_version
  ) VALUES(v_cov,v_context.profile_id,'AP_BRIDGE','W6/SUPPLIER_BILL/00000000-0000-4000-8000-00000000e856',
    'W6/SUPPLIER_BILL/00000000-0000-4000-8000-00000000e856/AP_EFFECT',0);
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
    evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES('00000000-0000-4000-8000-00000000e8a3',v_context.profile_id,'accounting_inception_package_updated',
    'accounting_inception_package',v_pkg,2,v_context.operator_id,pg_temp.w10e1_req(1027),
    'Synthetic W10C coverage item',NULL,repeat('d',64),'accounting_inception_packages/'||v_pkg::text||'/2',clock_timestamp());
  INSERT INTO public.accounting_inception_package_versions(
    profile_id,package_id,version,previous_version,accounting_start_date,cutover_boundary_date,payload,
    payload_fingerprint,created_by,foundation_event_id
  ) VALUES(v_context.profile_id,v_pkg,2,1,'2000-01-01',CURRENT_DATE,
    jsonb_build_object('synthetic',true,'accounting_start_date','2000-01-01','cutover_boundary_date',CURRENT_DATE,
      'items',jsonb_build_array(jsonb_build_object(
        'item_id','00000000-0000-4000-8000-00000000e8a4','source_domain','AP_BRIDGE',
        'source_record_key','W6/SUPPLIER_BILL/00000000-0000-4000-8000-00000000e856',
        'economic_event_key','W6/SUPPLIER_BILL/00000000-0000-4000-8000-00000000e856/AP_EFFECT',
        'classification','RECONSTRUCTED_HISTORY','resolution_state','RESOLVED','is_material',true,
        'reconciliation_category','ACCOUNTS_PAYABLE','party_type','SUPPLIER',
        'party_reference',v_context.supplier_id::text,'reconciliation_reference','Synthetic W10C historical payable coverage',
        'evidence_refs',jsonb_build_array('synthetic://w10e1/w10c-evidence')))),
    repeat('d',64),v_context.operator_id,'00000000-0000-4000-8000-00000000e8a3');
  UPDATE public.accounting_inception_packages SET current_version=2 WHERE profile_id=v_context.profile_id AND id=v_pkg;
  INSERT INTO public.accounting_inception_coverage_versions(
    profile_id,coverage_id,version,previous_version,package_id,package_version,item_id,classification,
    resolution_state,is_material,reconciliation_category,party_type,party_reference,reconciliation_reference,
    evidence_count,payload_fingerprint,created_by,foundation_event_id
  ) VALUES(v_context.profile_id,v_cov,1,NULL,v_pkg,2,'00000000-0000-4000-8000-00000000e8a4',
    'RECONSTRUCTED_HISTORY','RESOLVED',true,'ACCOUNTS_PAYABLE','SUPPLIER',v_context.supplier_id::text,
    'Synthetic W10C historical payable coverage',1,repeat('d',64),v_context.operator_id,'00000000-0000-4000-8000-00000000e8a3');
  UPDATE public.accounting_inception_coverage SET current_version=1 WHERE profile_id=v_context.profile_id AND id=v_cov;
  SELECT * INTO v_saved FROM public.save_accounting_ap_bridge_event(
    v_context.operator_id,'SUPPLIER_BILL','00000000-0000-4000-8000-00000000e856',0,'SUPPLIER_BILL',NULL,0,
    'DIRECT_EXPENSE',CURRENT_DATE-4,'synthetic://w10e1/w10c-coverage',repeat('e',64),NULL,NULL,NULL,NULL,
    'W10E1 W10C replay protection',pg_temp.w10e1_req(1028));
  SELECT * INTO v_prepared FROM public.prepare_accounting_ap_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'W10C duplicate coverage must block prepare',pg_temp.w10e1_req(2028));
  PERFORM pg_temp.w10e1_assert(26,'W10C inception replay protection',v_prepared.error_code='duplicate_coverage'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_journal_links WHERE event_id=v_saved.event_id));

  SELECT * INTO v_result FROM pg_temp.w10e1_post('SUPPLIER_BILL','00000000-0000-4000-8000-00000000e857',
    'SUPPLIER_BILL',NULL,0,'DIRECT_EXPENSE',CURRENT_DATE+1,19,true,false);
  IF v_result.status<>'POSTED' THEN RAISE EXCEPTION 'future-date synthetic bill failed: %',v_result.error_code; END IF;
  v_report:=public.get_accounting_ap_bridge_reconciliation(v_context.operator_id,CURRENT_DATE,clock_timestamp(),500);
  SELECT e INTO v_event FROM jsonb_array_elements(v_report->'events') e WHERE e->>'source_record_id'='00000000-0000-4000-8000-00000000e857';
  PERFORM pg_temp.w10e1_assert(27,'accounting date cutoff',v_event IS NOT NULL
    AND v_event->>'reconciliation_status'='ACCOUNTING_DATE_AFTER_CUTOFF' AND v_event->>'posted_accounting_date' IS NULL);
  v_report:=public.get_accounting_ap_bridge_reconciliation(
    v_context.operator_id,CURRENT_DATE+10,transaction_timestamp()-interval '1 second',500);
  SELECT e INTO v_event FROM jsonb_array_elements(v_report->'events') e WHERE e->>'source_record_id'='00000000-0000-4000-8000-00000000e831';
  PERFORM pg_temp.w10e1_assert(28,'recorded-at cutoff',v_event IS NOT NULL
    AND v_event->>'reconciliation_status'='MISSING_CLASSIFICATION' AND v_event->>'event_version' IS NULL);
  v_report:=public.get_accounting_ap_bridge_reconciliation(v_context.operator_id,CURRENT_DATE+1,clock_timestamp(),500);
  PERFORM pg_temp.w10e1_assert(29,'original/reversal historical cutoff',
    EXISTS(SELECT 1 FROM jsonb_array_elements(v_report->'events') e WHERE e->>'source_record_id'='00000000-0000-4000-8000-00000000e861'
      AND e->>'reconciliation_status'='POSTED')
    AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_report->'events') e WHERE e->>'source_record_id'='00000000-0000-4000-8000-00000000e871'));

  v_report:=public.get_accounting_ap_bridge_reconciliation(v_context.operator_id,CURRENT_DATE+10,clock_timestamp()+interval '1 minute',500);
  PERFORM pg_temp.w10e1_assert(30,'supplier/AP/accrual/advance reconciliation',v_report->>'state'='READY'
    AND v_report->>'bank_reconciled'='false' AND v_report->>'control_difference_count'='0'
    AND v_report->>'supplier_difference_count'='0' AND v_report->>'service_difference_count'='0'
    AND v_report->>'accounts_payable_halalah'='20300' AND v_report->>'accrued_unbilled_halalah'='23000'
    AND v_report->>'supplier_advance_halalah'='800');
  -- W9 supplier_bill_payment_balances is current-only; it does not provide a historical cutoff.
  SELECT b.outstanding_amount INTO v_balance FROM public.supplier_bill_payment_balances b
    WHERE b.supplier_bill_id='00000000-0000-4000-8000-00000000e851';
  PERFORM pg_temp.w10e1_assert(31,'balanced GL/TB',v_balance.outstanding_amount=100 AND EXISTS(
    SELECT 1 FROM public.get_accounting_trial_balance(v_context.operator_id,CURRENT_DATE+10,clock_timestamp()+interval '1 minute',NULL,0,100) t
    WHERE t.report->>'debits_equal_credits'='true'
      AND t.report->>'debit_balance_total_halalah'=t.report->>'credit_balance_total_halalah'));

  SELECT count(*) INTO v_event_count FROM pg_temp.w10e1_case_results WHERE passed;
  IF v_event_count<>31 THEN RAISE EXCEPTION 'W10E1 fixture completed % of 31 pre-rollback accounting assertions',v_event_count; END IF;
  PERFORM pg_temp.w10e1_assert(32,'explicit rollback',true);
  PERFORM pg_temp.w10e1_assert(33,'rollback leaves zero synthetic residue',true);
  IF (SELECT count(*) FROM pg_temp.w10e1_case_results WHERE passed)<>33 THEN
    RAISE EXCEPTION 'W10E1 fixture did not record all 33 scenarios';
  END IF;
END;
$w10e1_campaign$;

SELECT case_number,description,passed FROM w10e1_case_results ORDER BY case_number;
RESET ROLE;
ROLLBACK;

DO $residue_assertion$
BEGIN
  IF EXISTS(SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10e1-rollback-%')
     OR EXISTS(SELECT 1 FROM public.customers WHERE customer_number LIKE 'W10E1-SYN-%')
     OR EXISTS(SELECT 1 FROM public.services WHERE service_number LIKE 'SVC-2099-91__')
     OR EXISTS(SELECT 1 FROM public.suppliers WHERE name LIKE 'W10E1 Synthetic Supplier%')
     OR EXISTS(SELECT 1 FROM public.approved_commitments WHERE source_reference LIKE 'W10E1 synthetic commitment%')
     OR EXISTS(SELECT 1 FROM public.service_receipts WHERE delivered_scope LIKE '%synthetic%')
     OR EXISTS(SELECT 1 FROM public.service_receipt_corrections WHERE id BETWEEN '00000000-0000-4000-8000-00000000e800' AND '00000000-0000-4000-8000-00000000e8ff')
     OR EXISTS(SELECT 1 FROM public.supplier_bills WHERE invoice_number LIKE 'W10E1-INVOICE-%')
     OR EXISTS(SELECT 1 FROM public.supplier_payments WHERE payment_number LIKE 'SPAY-%' AND id BETWEEN '00000000-0000-4000-8000-00000000e800' AND '00000000-0000-4000-8000-00000000e8ff')
     OR EXISTS(SELECT 1 FROM public.supplier_payment_reversals WHERE id BETWEEN '00000000-0000-4000-8000-00000000e800' AND '00000000-0000-4000-8000-00000000e8ff')
     OR EXISTS(SELECT 1 FROM public.supplier_advances WHERE advance_number LIKE 'W10E1-ADVANCE-%')
     OR EXISTS(SELECT 1 FROM public.supplier_advance_payments WHERE id BETWEEN '00000000-0000-4000-8000-00000000e800' AND '00000000-0000-4000-8000-00000000e8ff')
     OR EXISTS(SELECT 1 FROM public.supplier_advance_payment_reversals WHERE id BETWEEN '00000000-0000-4000-8000-00000000e800' AND '00000000-0000-4000-8000-00000000e8ff')
     OR EXISTS(SELECT 1 FROM public.supplier_advance_allocations WHERE id BETWEEN '00000000-0000-4000-8000-00000000e800' AND '00000000-0000-4000-8000-00000000e8ff')
     OR EXISTS(SELECT 1 FROM public.supplier_advance_allocation_reversals WHERE id BETWEEN '00000000-0000-4000-8000-00000000e800' AND '00000000-0000-4000-8000-00000000e8ff')
     OR EXISTS(SELECT 1 FROM public.supplier_advance_refunds WHERE refund_number LIKE 'W10E1-REFUND-%')
     OR EXISTS(SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10E1-SYN-%')
     OR EXISTS(SELECT 1 FROM public.accounting_period_versions WHERE start_date=make_date(extract(year FROM CURRENT_DATE)::integer,1,1)
       AND end_date=make_date(extract(year FROM CURRENT_DATE)::integer,12,31))
     OR EXISTS(SELECT 1 FROM public.accounting_posting_rules WHERE rule_code='W10E1_SYN_AP_BRIDGE')
     OR EXISTS(SELECT 1 FROM public.accounting_ap_bridge_events WHERE profile_id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_ap_bridge_event_versions WHERE profile_id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_ap_bridge_journal_links WHERE profile_id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_ap_bridge_journal_lines WHERE profile_id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_source_effects WHERE profile_id='00000000-0000-4000-8000-00000000e800' AND source_domain='AP_BRIDGE')
     OR EXISTS(SELECT 1 FROM public.accounting_journals WHERE profile_id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_journal_versions WHERE profile_id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_journal_line_versions WHERE profile_id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_inception_packages WHERE profile_id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_inception_coverage WHERE profile_id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_inception_coverage_versions WHERE profile_id='00000000-0000-4000-8000-00000000e800')
     OR EXISTS(SELECT 1 FROM public.accounting_foundation_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-e00000000000' AND '00000000-0000-4000-8000-efffffffffff')
     OR EXISTS(SELECT 1 FROM public.accounting_journal_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-e00000000000' AND '00000000-0000-4000-8000-efffffffffff')
     OR EXISTS(SELECT 1 FROM public.accounting_capability_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-e00000000000' AND '00000000-0000-4000-8000-efffffffffff')
     OR EXISTS(SELECT 1 FROM public.audit_logs WHERE details->>'request_id'
       BETWEEN '00000000-0000-4000-8000-e00000000000' AND '00000000-0000-4000-8000-efffffffffff') THEN
    RAISE EXCEPTION 'W10E1 synthetic residue detected after rollback';
  END IF;
END;
$residue_assertion$;
