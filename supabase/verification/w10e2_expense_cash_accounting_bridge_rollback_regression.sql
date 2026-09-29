-- W10E2 synthetic DEV regression only. One transaction is fully rolled back.
BEGIN;

CREATE TEMP TABLE w10e2_fixture_context (
  profile_id uuid NOT NULL, authority_id uuid NOT NULL, operator_id uuid NOT NULL,
  admin_id uuid NOT NULL, employee_id uuid NOT NULL, finance_reviewer_id uuid NOT NULL, customer_id uuid NOT NULL,
  service_id uuid NOT NULL, period_id uuid, period_version integer,
  rule_id uuid, rule_version integer
);
INSERT INTO w10e2_fixture_context(profile_id,authority_id,operator_id,admin_id,employee_id,finance_reviewer_id,customer_id,service_id)
VALUES('00000000-0000-4000-8000-00000000e900','00000000-0000-4000-8000-00000000e901',
  '00000000-0000-4000-8000-00000000e902','00000000-0000-4000-8000-00000000e903',
  '00000000-0000-4000-8000-00000000e904','00000000-0000-4000-8000-00000000e905',
  '00000000-0000-4000-8000-00000000e910',
  '00000000-0000-4000-8000-00000000e911');
GRANT SELECT,UPDATE ON w10e2_fixture_context TO service_role;

CREATE TEMP TABLE w10e2_fixture_accounts(mapping_key text PRIMARY KEY,account_id uuid NOT NULL);
GRANT SELECT,INSERT ON w10e2_fixture_accounts TO service_role;
CREATE TEMP TABLE w10e2_case_results(case_number integer PRIMARY KEY,description text NOT NULL,passed boolean NOT NULL);
GRANT SELECT,INSERT ON w10e2_case_results TO service_role;
CREATE TEMP TABLE w10e2_ids(label text PRIMARY KEY,entity_id uuid NOT NULL);
GRANT SELECT,INSERT ON w10e2_ids TO service_role;

CREATE FUNCTION pg_temp.w10e2_req(p_tag integer) RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog
AS $w10e2_req$ SELECT ('00000000-0000-4000-8000-'||lpad(to_hex(p_tag),12,'0'))::uuid $w10e2_req$;
CREATE FUNCTION pg_temp.w10e2_assert(p_case integer,p_description text,p_passed boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $w10e2_assert$
BEGIN
  IF p_passed IS DISTINCT FROM true THEN RAISE EXCEPTION 'W10E2 case % failed: %',p_case,p_description; END IF;
  INSERT INTO pg_temp.w10e2_case_results(case_number,description,passed) VALUES(p_case,p_description,true);
END;
$w10e2_assert$;
GRANT EXECUTE ON FUNCTION pg_temp.w10e2_assert(integer,text,boolean) TO service_role;

CREATE FUNCTION pg_temp.w10e2_make_expense(
  p_sequence integer,p_amount numeric,p_origin text,p_payment text,p_advance uuid,p_fund uuid,
  p_evidence_exception boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $w10e2_make_expense$
DECLARE c pg_temp.w10e2_fixture_context%ROWTYPE; submitted record; evidence record; exception_disposition record;
  finance_review record; approved record; expense_id uuid; document_id uuid;
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10e2_fixture_context;
  SELECT * INTO submitted FROM public.submit_expense(
    'W10E2-EXP-'||lpad(p_sequence::text,4,'0'),'event',c.service_id,'Synthetic category is not accounting authority',
    'W10E2 synthetic expense source',p_amount,CURRENT_DATE-1,p_origin,p_payment,p_advance,p_fund,
    CASE WHEN p_origin='employee_paid' THEN c.employee_id END,pg_temp.w10e2_req(40000+p_sequence),c.operator_id::text,'admin');
  IF submitted.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 Expense submit failed (%): %',p_sequence,submitted.error_code; END IF;
  expense_id:=submitted.expense_id;
  IF p_evidence_exception THEN
    SELECT * INTO evidence FROM public.record_expense_evidence_exception(expense_id,
      'Synthetic receipt evidence unavailable for accounting test',c.employee_id,CURRENT_DATE+30,
      pg_temp.w10e2_req(840000+p_sequence),c.operator_id::text,'admin');
    IF evidence.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 evidence exception failed (%): %',p_sequence,evidence.error_code; END IF;
    SELECT * INTO exception_disposition FROM public.dispose_expense_evidence_exception(evidence.exception_id,'accepted',
      'Accepted operationally for synthetic scenario',pg_temp.w10e2_req(850000+p_sequence),c.admin_id::text,'admin');
    IF exception_disposition.error_code IS NOT NULL THEN
      RAISE EXCEPTION 'W10E2 evidence exception disposition failed (%): %',p_sequence,exception_disposition.error_code;
    END IF;
  ELSE
    document_id:=pg_temp.w10e2_req(830000+p_sequence);
    INSERT INTO public.business_documents(id,object_path,original_filename,mime_type,file_size,document_type,purpose,uploaded_by)
    VALUES(document_id,'business-documents/'||document_id::text||'.pdf','w10e2-evidence-'||p_sequence::text||'.pdf',
      'application/pdf',128,'expense_receipt','Expense evidence',c.operator_id);
    SELECT * INTO evidence FROM public.attach_expense_document(expense_id,document_id,
      pg_temp.w10e2_req(860000+p_sequence),c.operator_id::text,'admin');
    IF evidence.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 evidence attachment failed (%): %',p_sequence,evidence.error_code; END IF;
  END IF;
  SELECT * INTO finance_review FROM public.review_expense_finance(expense_id,
    pg_temp.w10e2_req(870000+p_sequence),c.finance_reviewer_id::text,'accountant');
  IF finance_review.error_code IS NOT NULL THEN
    RAISE EXCEPTION 'W10E2 Finance Review failed (%): %',p_sequence,finance_review.error_code;
  END IF;
  SELECT * INTO approved FROM public.approve_expense(expense_id,pg_temp.w10e2_req(50000+p_sequence),c.admin_id::text,'admin');
  IF approved.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 Expense approve failed (%): %',p_sequence,approved.error_code; END IF;
  RETURN expense_id;
END;
$w10e2_make_expense$;
GRANT EXECUTE ON FUNCTION pg_temp.w10e2_make_expense(integer,numeric,text,text,uuid,uuid,boolean) TO service_role;

CREATE FUNCTION pg_temp.w10e2_contract(
  p_source_type text,p_source_id uuid,p_classification text,p_direct text,p_date date,
  p_control_key text,p_use_advance_account boolean,p_bind_cash boolean,p_related_advance uuid,
  p_advance_provenance boolean,p_return_direction text,p_evidence boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $w10e2_contract$
DECLARE item jsonb;expense_account uuid;control_account uuid;advance_account uuid;cash_account uuid;
BEGIN
  item:=public.accounting_expense_bridge_source_snapshot(p_source_type,p_source_id);
  SELECT account_id INTO expense_account FROM pg_temp.w10e2_fixture_accounts
    WHERE mapping_key=CASE WHEN p_direct='DIRECT_EXPENSE' THEN 'direct_expense' ELSE 'direct_asset' END;
  SELECT account_id INTO control_account FROM pg_temp.w10e2_fixture_accounts WHERE mapping_key=p_control_key;
  SELECT account_id INTO advance_account FROM pg_temp.w10e2_fixture_accounts WHERE mapping_key='employee_advance';
  SELECT account_id INTO cash_account FROM pg_temp.w10e2_fixture_accounts WHERE mapping_key='cash_account';
  RETURN jsonb_build_object(
    'classification',p_classification,'direct_classification',p_direct,'accounting_date',p_date,
    'service_attribution',CASE WHEN nullif(item->>'service_id','') IS NULL THEN 'OVERHEAD' ELSE 'SERVICE' END,
    'expense_account_id',CASE WHEN p_direct IS NULL THEN NULL ELSE expense_account END,
    'expense_account_version',CASE WHEN p_direct IS NULL THEN NULL ELSE 1 END,
    'control_account_id',control_account,'control_account_version',CASE WHEN control_account IS NULL THEN NULL ELSE 1 END,
    'advance_account_id',CASE WHEN p_use_advance_account THEN advance_account END,
    'advance_account_version',CASE WHEN p_use_advance_account THEN 1 END,
    'cash_account_id',CASE WHEN p_bind_cash THEN cash_account END,
    'cash_account_version',CASE WHEN p_bind_cash THEN 1 END,
    'cash_binding_evidence_ref',CASE WHEN p_bind_cash THEN 'synthetic://w10e2/cash-binding/'||p_source_type||'/'||p_source_id::text END,
    'cash_binding_evidence_sha256',CASE WHEN p_bind_cash THEN repeat('f',64) END,
    'evidence_ref',CASE WHEN p_evidence THEN 'synthetic://w10e2/classification/'||p_source_type||'/'||p_source_id::text END,
    'evidence_sha256',CASE WHEN p_evidence THEN repeat('e',64) END,
    'related_advance_id',p_related_advance,
    'advance_provenance_evidence_ref',CASE WHEN p_advance_provenance THEN 'synthetic://w10e2/advance-offset/'||p_related_advance::text END,
    'advance_provenance_evidence_sha256',CASE WHEN p_advance_provenance THEN repeat('a',64) END,
    'return_direction',p_return_direction);
END;
$w10e2_contract$;
GRANT EXECUTE ON FUNCTION pg_temp.w10e2_contract(text,uuid,text,text,date,text,boolean,boolean,uuid,boolean,text,boolean) TO service_role;

CREATE FUNCTION pg_temp.w10e2_post(
  p_source_type text,p_source_id uuid,p_contract jsonb,p_sequence integer
) RETURNS TABLE(error_code text,event_id uuid,event_version integer,journal_id uuid,journal_version integer,status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $w10e2_post$
DECLARE c pg_temp.w10e2_fixture_context%ROWTYPE; saved record; prepared record; posted record; expected_version integer:=0;
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10e2_fixture_context;
  SELECT current_version INTO expected_version FROM public.accounting_expense_bridge_events
    WHERE profile_id=c.profile_id AND source_type=p_source_type AND source_record_id=p_source_id;
  expected_version:=coalesce(expected_version,0);
  SELECT * INTO saved FROM public.save_accounting_expense_bridge_event(
    c.operator_id,p_source_type,p_source_id,expected_version,p_contract,'W10E2 synthetic rollback accounting evidence',
    pg_temp.w10e2_req(10000+p_sequence));
  IF saved.error_code IS NOT NULL THEN
    RETURN QUERY SELECT saved.error_code,saved.event_id,saved.version,NULL::uuid,NULL::integer,saved.status; RETURN;
  END IF;
  IF saved.status<>'READY' THEN
    RETURN QUERY SELECT NULL::text,saved.event_id,saved.version,NULL::uuid,NULL::integer,saved.status; RETURN;
  END IF;
  SELECT * INTO prepared FROM public.prepare_accounting_expense_bridge_event(
    c.operator_id,saved.event_id,saved.version,c.period_id,c.period_version,c.rule_id,c.rule_version,
    'Prepare W10E2 synthetic event',pg_temp.w10e2_req(20000+p_sequence));
  IF prepared.error_code IS NOT NULL THEN
    RETURN QUERY SELECT prepared.error_code,saved.event_id,saved.version,prepared.journal_id,prepared.version,'READY'::text; RETURN;
  END IF;
  SELECT * INTO posted FROM public.post_accounting_expense_bridge_journal(
    c.operator_id,prepared.journal_id,prepared.version,pg_temp.w10e2_req(30000+p_sequence));
  RETURN QUERY SELECT posted.error_code,saved.event_id,saved.version,posted.journal_id,posted.version,posted.status;
END;
$w10e2_post$;
GRANT EXECUTE ON FUNCTION pg_temp.w10e2_post(text,uuid,jsonb,integer) TO service_role;

CREATE FUNCTION pg_temp.w10e2_rehold(p_source_type text,p_source_id uuid,p_sequence integer) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $w10e2_rehold$
DECLARE c pg_temp.w10e2_fixture_context%ROWTYPE;e public.accounting_expense_bridge_events%ROWTYPE;result record;contract jsonb;
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10e2_fixture_context;
  SELECT * INTO STRICT e FROM public.accounting_expense_bridge_events WHERE profile_id=c.profile_id
    AND source_type=p_source_type AND source_record_id=p_source_id;
  contract:=pg_temp.w10e2_contract(p_source_type,p_source_id,'HELD_UNSUPPORTED_TREATMENT',NULL,NULL,NULL,false,false,NULL,false,NULL,false);
  SELECT * INTO result FROM public.save_accounting_expense_bridge_event(
    c.operator_id,p_source_type,p_source_id,e.current_version,contract,'W10E2 failed ceiling retained as held',
    pg_temp.w10e2_req(11000+p_sequence));
  RETURN result.status;
END;
$w10e2_rehold$;
GRANT EXECUTE ON FUNCTION pg_temp.w10e2_rehold(text,uuid,integer) TO service_role;

CREATE FUNCTION pg_temp.w10e2_make_advance(p_sequence integer,p_amount numeric,p_issue boolean DEFAULT true) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $w10e2_make_advance$
DECLARE c pg_temp.w10e2_fixture_context%ROWTYPE;result record;advance_id uuid;
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10e2_fixture_context;
  SELECT * INTO result FROM public.request_cash_advance('W10E2-ADV-'||lpad(p_sequence::text,4,'0'),
    'event',c.service_id,c.employee_id,'Synthetic W10E2 employee cash advance',p_amount,
    pg_temp.w10e2_req(70000+p_sequence),c.operator_id::text,'admin');
  IF result.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 cash advance request failed (%): %',p_sequence,result.error_code; END IF;
  advance_id:=result.advance_id;
  SELECT * INTO result FROM public.approve_cash_advance(advance_id,pg_temp.w10e2_req(71000+p_sequence),c.admin_id::text,'admin');
  IF result.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 cash advance approval failed (%): %',p_sequence,result.error_code; END IF;
  IF p_issue THEN
    SELECT * INTO result FROM public.issue_cash_advance(advance_id,'synthetic issue',pg_temp.w10e2_req(72000+p_sequence),c.operator_id::text,'admin');
    IF result.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 cash advance issue failed (%): %',p_sequence,result.error_code; END IF;
  END IF;
  RETURN advance_id;
END;
$w10e2_make_advance$;
GRANT EXECUTE ON FUNCTION pg_temp.w10e2_make_advance(integer,numeric,boolean) TO service_role;

CREATE FUNCTION pg_temp.w10e2_make_fund(p_sequence integer,p_float numeric) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $w10e2_make_fund$
DECLARE c pg_temp.w10e2_fixture_context%ROWTYPE;result record;
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10e2_fixture_context;
  SELECT * INTO result FROM public.create_petty_cash_fund('W10E2 Petty Cash '||p_sequence,c.admin_id,p_float,
    pg_temp.w10e2_req(73000+p_sequence),c.operator_id::text,'admin');
  IF result.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 Petty Cash fund creation failed: %',result.error_code; END IF;
  RETURN result.fund_id;
END;
$w10e2_make_fund$;
GRANT EXECUTE ON FUNCTION pg_temp.w10e2_make_fund(integer,numeric) TO service_role;

DO $preflight$
BEGIN
  IF EXISTS(SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10e2-rollback-%')
     OR EXISTS(SELECT 1 FROM public.customers WHERE customer_number LIKE 'W10E2-SYN-%')
     OR EXISTS(SELECT 1 FROM public.services WHERE service_number LIKE 'SVC-2099-92__')
     OR EXISTS(SELECT 1 FROM public.expenses WHERE expense_number LIKE 'W10E2-EXP-%')
     OR EXISTS(SELECT 1 FROM public.employee_cash_advances WHERE advance_number LIKE 'W10E2-ADV-%')
     OR EXISTS(SELECT 1 FROM public.petty_cash_funds WHERE fund_name LIKE 'W10E2 Petty Cash%')
     OR EXISTS(SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000e900' OR singleton_key='g7')
     OR EXISTS(SELECT 1 FROM public.accounting_foundation_events
       WHERE id BETWEEN '00000000-0000-4000-8000-00000000e900' AND '00000000-0000-4000-8000-00000000e9ff') THEN
    RAISE EXCEPTION 'W10E2 rollback fixture collision or accounting profile already exists; inspect before running';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.company_settings WHERE setting_key='default') THEN
    RAISE EXCEPTION 'W10E2 rollback fixture requires default company settings';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_capability_catalog
    WHERE capability='accounting:manage_expense_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10E') THEN
    RAISE EXCEPTION 'W10E2 expense bridge capability is not enabled by the migration';
  END IF;
  IF NOT has_function_privilege('service_role','public.save_accounting_expense_bridge_event(uuid,text,uuid,integer,jsonb,text,uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.prepare_accounting_expense_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.post_accounting_expense_bridge_journal(uuid,uuid,integer,uuid)','EXECUTE')
     OR NOT has_function_privilege('service_role','public.get_accounting_expense_bridge_reconciliation(uuid,date,timestamptz,integer)','EXECUTE')
     OR EXISTS(SELECT 1 FROM (VALUES ('public.accounting_expense_bridge_events'),('public.accounting_expense_bridge_event_versions'),
       ('public.accounting_expense_bridge_journal_links'),('public.accounting_expense_bridge_journal_lines')) t(table_name)
       WHERE has_table_privilege('service_role',table_name,'SELECT')) THEN
    RAISE EXCEPTION 'W10E2 service_role RPC/table grant contract differs';
  END IF;
  PERFORM pg_temp.w10e2_assert(40,'zero synthetic residue',
    NOT EXISTS(SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10e2-rollback-%')
    AND NOT EXISTS(SELECT 1 FROM public.expenses WHERE expense_number LIKE 'W10E2-EXP-%')
    AND NOT EXISTS(SELECT 1 FROM public.employee_cash_advances WHERE advance_number LIKE 'W10E2-ADV-%')
    AND NOT EXISTS(SELECT 1 FROM public.petty_cash_funds WHERE fund_name LIKE 'W10E2 Petty Cash%'));
END;
$preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
 ('00000000-0000-4000-8000-00000000e901','w10e2-rollback-authority','w10e2-authority@example.invalid','Synthetic W10E2 authority','admin',true),
 ('00000000-0000-4000-8000-00000000e902','w10e2-rollback-operator','w10e2-operator@example.invalid','Synthetic W10E2 operator','admin',true),
 ('00000000-0000-4000-8000-00000000e903','w10e2-rollback-approver','w10e2-approver@example.invalid','Synthetic W10E2 approver','admin',true),
 ('00000000-0000-4000-8000-00000000e904','w10e2-rollback-employee','w10e2-employee@example.invalid','Synthetic W10E2 employee','viewer',true),
 ('00000000-0000-4000-8000-00000000e905','w10e2-rollback-finance-reviewer','w10e2-finance-reviewer@example.invalid','Synthetic W10E2 finance reviewer','accountant',true);
INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT '00000000-0000-4000-8000-00000000e900','g7',s.id,0 FROM public.company_settings s WHERE s.setting_key='default';
INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,
 actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
VALUES('00000000-0000-4000-8000-00000000e940','00000000-0000-4000-8000-00000000e900',
 'accounting_profile_updated','accounting_profile','00000000-0000-4000-8000-00000000e900',1,
 '00000000-0000-4000-8000-00000000e901','00000000-0000-4000-8000-00000000e941',
 'Synthetic W10E2 rollback profile',NULL,repeat('a',64),'accounting_profiles/00000000-0000-4000-8000-00000000e900/1',transaction_timestamp());
INSERT INTO public.accounting_profile_versions(profile_id,version,previous_version,framework_key,framework_edition,
 policy_version,endorsement_context,professional_validation_state,professional_validation_evidence_ref,functional_currency,
 fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,fiscal_timezone,accounting_start_date,
 cutover_boundary_date,legal_fiscal_evidence_pending,legal_fiscal_evidence_ref,vat_mode,zatca_state,fatoora_state,
 activation_state,effective_from,reason,evidence_ref,created_by,created_at,foundation_event_id)
VALUES('00000000-0000-4000-8000-00000000e900',1,NULL,'SA_IFRS_FOR_SMES',2025,'W10 provisional policy',
 'Synthetic W10E2 rollback fixture','DEFERRED',NULL,'SAR',1,1,12,31,'Asia/Riyadh','2000-01-01',CURRENT_DATE-1,
 true,NULL,'not_registered','INACTIVE','INACTIVE','DEV_PROVISIONAL',transaction_timestamp(),
 'Synthetic W10E2 profile',NULL,'00000000-0000-4000-8000-00000000e901',transaction_timestamp(),'00000000-0000-4000-8000-00000000e940');
UPDATE public.accounting_profiles SET current_version=1 WHERE id='00000000-0000-4000-8000-00000000e900';
INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,
 actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
VALUES('00000000-0000-4000-8000-00000000e942','00000000-0000-4000-8000-00000000e900',
 'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000e944',1,
 '00000000-0000-4000-8000-00000000e901','00000000-0000-4000-8000-00000000e943',
 'Synthetic W10E2 authority bootstrap',NULL,repeat('b',64),'accounting:manage_authority',transaction_timestamp());
INSERT INTO public.accounting_capability_events(id,profile_id,target_user_id,capability,revision,effect,expires_at,
 actor_user_id,reason,evidence_ref,request_id,payload_fingerprint,foundation_event_id,created_at)
VALUES('00000000-0000-4000-8000-00000000e944','00000000-0000-4000-8000-00000000e900',
 '00000000-0000-4000-8000-00000000e901','accounting:manage_authority',1,'ALLOW',NULL,
 '00000000-0000-4000-8000-00000000e901','Synthetic W10E2 authority bootstrap',NULL,
 '00000000-0000-4000-8000-00000000e943',repeat('b',64),'00000000-0000-4000-8000-00000000e942',transaction_timestamp());
INSERT INTO public.customers(id,customer_number,company,contact,email,phone,city,status,created_by)
VALUES('00000000-0000-4000-8000-00000000e910','W10E2-SYN-CUSTOMER','W10E2 Synthetic Expense Test',
 'Fixture Contact','w10e2-customer@example.invalid','+966500000910','Riyadh','active','00000000-0000-4000-8000-00000000e902');
INSERT INTO public.services(id,service_number,customer_id,service_title,status)
VALUES('00000000-0000-4000-8000-00000000e911','SVC-2099-9201','00000000-0000-4000-8000-00000000e910',
 'W10E2 synthetic expense bridge Service','Inquiry');

SET LOCAL ROLE service_role;
DO $setup_accounting$
DECLARE c pg_temp.w10e2_fixture_context%ROWTYPE; result record; spec record; account jsonb; period jsonb; rule jsonb; mappings jsonb;
 cap record; request_sequence integer:=0;
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10e2_fixture_context;
  FOR cap IN SELECT * FROM (VALUES ('accounting:manage_chart'),('accounting:manage_periods'),
    ('accounting:manage_expense_bridge'),('accounting:view'),('accounting:prepare_journal')) g(capability) LOOP
    request_sequence:=request_sequence+1;
    SELECT * INTO result FROM public.set_accounting_capability(c.authority_id,c.operator_id,cap.capability,'ALLOW',NULL,0,
      'Synthetic W10E2 fixture capability',NULL,pg_temp.w10e2_req(4000+request_sequence));
    IF result.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 capability grant failed for %: %',cap.capability,result.error_code; END IF;
  END LOOP;
  FOR spec IN SELECT * FROM (VALUES
    ('employee_reimbursement_liability','W10E2-SYN-REIMB-LIAB','Synthetic employee reimbursement liability','التزام موظفي سداد اصطناعي','LIABILITY','CREDIT',true,'EMPLOYEE_REIMBURSEMENT_LIABILITY'),
    ('employee_advance','W10E2-SYN-EMP-ADV','Synthetic employee advance','سلفة موظف اصطناعية','ASSET','DEBIT',true,'EMPLOYEE_ADVANCE'),
    ('petty_cash','W10E2-SYN-PETTY','Synthetic Petty Cash accountability','عهدة نقدية اصطناعية','ASSET','DEBIT',true,'CASH_ACCOUNTABILITY'),
    ('cash_account','W10E2-SYN-CASH','Synthetic explicitly bound cash asset','نقد اصطناعي مرتبط صراحة','ASSET','DEBIT',false,'NONE'),
    ('cash_account_alt','W10E2-SYN-CASH-ALT','Synthetic alternate cash asset','نقد اصطناعي بديل','ASSET','DEBIT',false,'NONE'),
    ('direct_expense','W10E2-SYN-EXPENSE','Synthetic direct expense','مصروف مباشر اصطناعي','EXPENSE','DEBIT',false,'NONE'),
    ('direct_asset','W10E2-SYN-ASSET','Synthetic direct asset','أصل مباشر اصطناعي','ASSET','DEBIT',false,'NONE')
  ) AS a(mapping_key,account_code,name_en,name_ar,account_type,normal_balance,is_protected,control_classification) LOOP
    account:=jsonb_build_object('account_code',spec.account_code,'name_en',spec.name_en,'name_ar',spec.name_ar,
      'account_type',spec.account_type,'category','synthetic','normal_balance',spec.normal_balance,'account_kind','POSTING',
      'parent_account_id',NULL,'is_active',true,'is_protected',spec.is_protected,'control_classification',spec.control_classification);
    SELECT * INTO result FROM public.save_accounting_account(c.operator_id,NULL,0,account,'Create W10E2 synthetic chart account',NULL,
      pg_temp.w10e2_req(5000+request_sequence));
    request_sequence:=request_sequence+1;
    IF result.error_code IS NOT NULL OR result.version<>1 THEN RAISE EXCEPTION 'W10E2 account creation failed for %: %',spec.mapping_key,result.error_code; END IF;
    INSERT INTO pg_temp.w10e2_fixture_accounts(mapping_key,account_id) VALUES(spec.mapping_key,result.account_id);
  END LOOP;
  period:=jsonb_build_object('start_date',make_date(extract(year FROM CURRENT_DATE)::integer,1,1),
    'end_date',make_date(extract(year FROM CURRENT_DATE)::integer,12,31),'status','OPEN');
  SELECT * INTO result FROM public.save_accounting_period(c.operator_id,NULL,0,period,'Create W10E2 synthetic OPEN period',NULL,pg_temp.w10e2_req(5100));
  IF result.error_code IS NOT NULL OR result.version<>1 THEN RAISE EXCEPTION 'W10E2 period setup failed: %',result.error_code; END IF;
  UPDATE pg_temp.w10e2_fixture_context SET period_id=result.period_id,period_version=result.version;
  SELECT jsonb_agg(jsonb_build_object('mapping_key',a.mapping_key,'account_id',a.account_id,
    'account_version',1,'allowed_side','EITHER','service_requirement','OPTIONAL') ORDER BY a.mapping_key)
    INTO mappings FROM pg_temp.w10e2_fixture_accounts a WHERE a.mapping_key<>'cash_account_alt';
  rule:=jsonb_build_object('rule_code','W10E2_SYN_EXPENSE_BRIDGE','name_en','Synthetic W10E2 expense bridge',
    'name_ar','قاعدة جسر المصروفات الاصطناعية','is_active',true,'mappings',mappings);
  SELECT * INTO result FROM public.save_accounting_posting_rule(c.operator_id,NULL,0,rule,
    'Create W10E2 synthetic posting rule',NULL,pg_temp.w10e2_req(5101));
  IF result.error_code IS NOT NULL OR result.version<>1 THEN RAISE EXCEPTION 'W10E2 rule setup failed: %',result.error_code; END IF;
  UPDATE pg_temp.w10e2_fixture_context SET rule_id=result.posting_rule_id,rule_version=result.version;
END;
$setup_accounting$;
RESET ROLE;

-- Expense documents and the accepted evidence exception are created through W5 RPCs before Finance Review.
SET LOCAL ROLE service_role;
DO $seed_evidence$
DECLARE expense_id uuid;
BEGIN
  expense_id:=pg_temp.w10e2_make_expense(1,100,'employee_paid','personal_funds',NULL,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('employee_expense_1',expense_id);
  expense_id:=pg_temp.w10e2_make_expense(2,50,'employee_paid','personal_funds',NULL,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('employee_expense_2',expense_id);
  expense_id:=pg_temp.w10e2_make_expense(3,75,'employee_paid','personal_funds',NULL,NULL,true);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('employee_expense_3',expense_id);
END;
$seed_evidence$;
RESET ROLE;

DO $w10e2_campaign$
DECLARE
  c pg_temp.w10e2_fixture_context%ROWTYPE; result record; saved record; prepared record; w5 record; report jsonb; event jsonb;
  e1 uuid;e2 uuid;e3 uuid;e4 uuid;e5 uuid;e6 uuid;e7 uuid;e8 uuid;e9 uuid;e10 uuid;e11 uuid;e12 uuid;e13 uuid;e14 uuid;e15 uuid;e16 uuid;
  advance1 uuid;advance2 uuid;advance_rejected uuid;fund_id uuid;settlement_id uuid;petty_tx_id uuid;governance_id uuid;
  contract jsonb;case_count integer;v_case_count integer;future_settlement_id uuid;future_cutoff timestamptz;record_cutoff timestamptz;
  v_event_id uuid;v_event_version integer;v_journal uuid;recognized_expense_event uuid;denied boolean:=false;duplicate_source_denied boolean:=false;
  future_absent boolean:=false;future_present boolean:=false;balance numeric;tb record;
  w10c_package_id uuid:='00000000-0000-4000-8000-00000000e9a0'; coverage_reconstructed uuid:='00000000-0000-4000-8000-00000000e9a6';
  coverage_postcutover uuid:='00000000-0000-4000-8000-00000000e9a7'; package_item_recon uuid:='00000000-0000-4000-8000-00000000e9a4';
  package_item_post uuid:='00000000-0000-4000-8000-00000000e9a5';
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10e2_fixture_context;
  e1:=(SELECT entity_id FROM pg_temp.w10e2_ids WHERE label='employee_expense_1');
  e2:=(SELECT entity_id FROM pg_temp.w10e2_ids WHERE label='employee_expense_2');
  e3:=(SELECT entity_id FROM pg_temp.w10e2_ids WHERE label='employee_expense_3');

  contract:=pg_temp.w10e2_contract('EXPENSE',e1,'EMPLOYEE_PAID_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    'employee_reimbursement_liability',false,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE',e1,contract,1);
  PERFORM pg_temp.w10e2_assert(1,'supported employee-paid Expense recognition',result.status='POSTED' AND result.error_code IS NULL
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='EMPLOYEE_REIMBURSEMENT_LIABILITY' AND l.side='CREDIT' AND l.amount_halalah=10000)
    AND (SELECT source_snapshot->'attributes'->'attached_documents'->0->>'document_type'
      FROM public.accounting_expense_bridge_event_versions WHERE event_id=result.event_id AND version=result.event_version)='expense_receipt');

  contract:=pg_temp.w10e2_contract('EXPENSE',e2,'HELD_UNSUPPORTED_TREATMENT',NULL,NULL,NULL,false,false,NULL,false,NULL,false);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE',e2,contract,2);
  PERFORM pg_temp.w10e2_assert(2,'unsupported Expense classification held',result.status='HELD' AND result.journal_id IS NULL
    AND (SELECT held_code FROM public.accounting_expense_bridge_event_versions WHERE event_id=result.event_id AND version=result.event_version)='unsupported_source_treatment');

  contract:=pg_temp.w10e2_contract('EXPENSE',e3,'EMPLOYEE_PAID_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    'employee_reimbursement_liability',false,false,NULL,false,NULL,false);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE',e3,contract,3);
  PERFORM pg_temp.w10e2_assert(3,'accepted evidence exception remains accounting-held',result.status='HELD' AND result.journal_id IS NULL
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_event_versions v
      CROSS JOIN LATERAL jsonb_array_elements(v.source_snapshot->'attributes'->'evidence_exceptions') x
      WHERE v.event_id=result.event_id AND x->>'accountable_owner_id'=c.employee_id::text
        AND x->'audit_lineage' @> '[{"action":"expense_evidence_exception_disposed"}]'::jsonb)
    AND (SELECT held_code FROM public.accounting_expense_bridge_event_versions WHERE event_id=result.event_id AND version=result.event_version)='classification_evidence_missing');

  SELECT * INTO w5 FROM public.settle_expense_reimbursement(e1,'W10E2-SET-0001',40,'bank_transfer','synthetic transfer 1',
    'Partial synthetic reimbursement',pg_temp.w10e2_req(6101),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 partial reimbursement failed: %',w5.error_code; END IF;
  settlement_id:=w5.settlement_id;
  contract:=pg_temp.w10e2_contract('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,'REIMBURSEMENT_CASH',NULL,CURRENT_DATE-1,
    'employee_reimbursement_liability',false,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,contract,4);
  PERFORM pg_temp.w10e2_assert(4,'partial employee reimbursement',result.status='POSTED' AND EXISTS(
    SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='EMPLOYEE_REIMBURSEMENT_LIABILITY' AND l.side='DEBIT' AND l.amount_halalah=4000));
  SELECT * INTO w5 FROM public.settle_expense_reimbursement(e1,'W10E2-SET-0002',60,'cash','synthetic transfer 2',
    'Final synthetic reimbursement',pg_temp.w10e2_req(6102),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 final reimbursement failed: %',w5.error_code; END IF;
  settlement_id:=w5.settlement_id;
  contract:=pg_temp.w10e2_contract('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,'REIMBURSEMENT_CASH',NULL,CURRENT_DATE-1,
    'employee_reimbursement_liability',false,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,contract,5);
  PERFORM pg_temp.w10e2_assert(5,'full reimbursement clears recognized liability',result.status='POSTED' AND EXISTS(
    SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='EMPLOYEE_REIMBURSEMENT_LIABILITY' AND l.side='DEBIT' AND l.amount_halalah=6000));

  SELECT * INTO w5 FROM public.settle_expense_reimbursement(e2,'W10E2-SET-OVER-LIABILITY',1,'bank_transfer','synthetic over cap',
    'Expense has no recognized reimbursement liability',pg_temp.w10e2_req(6103),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 adversarial settlement seed failed: %',w5.error_code; END IF;
  settlement_id:=w5.settlement_id;
  contract:=pg_temp.w10e2_contract('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,'REIMBURSEMENT_CASH',NULL,CURRENT_DATE-1,
    'employee_reimbursement_liability',false,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,contract,6);
  PERFORM pg_temp.w10e2_assert(6,'reimbursement ceiling rejects amount above recognized liability',result.error_code='reimbursement_ceiling_exceeded'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links WHERE event_id=result.event_id));
  IF pg_temp.w10e2_rehold('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,6) IS DISTINCT FROM 'HELD' THEN
    RAISE EXCEPTION 'W10E2 over-ceiling reimbursement was not retained as HELD'; END IF;

  e4:=pg_temp.w10e2_make_expense(4,25,'company_direct','company_funds',NULL,NULL);
  contract:=pg_temp.w10e2_contract('EXPENSE',e4,'COMPANY_DIRECT_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    NULL,false,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE',e4,contract,7);
  PERFORM pg_temp.w10e2_assert(7,'explicit cash bank binding is mandatory',result.status='HELD'
    AND (SELECT held_code FROM public.accounting_expense_bridge_event_versions WHERE event_id=result.event_id AND version=result.event_version)='cash_account_evidence_missing');

  advance1:=pg_temp.w10e2_make_advance(1,500,true);
  contract:=pg_temp.w10e2_contract('CASH_ADVANCE_ISSUE',advance1,'CASH_ADVANCE_ISSUE',NULL,CURRENT_DATE-1,
    'employee_advance',true,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('CASH_ADVANCE_ISSUE',advance1,contract,13);
  PERFORM pg_temp.w10e2_assert(13,'cash advance issue posts to separate advance and cash accounts',result.status='POSTED'
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='EMPLOYEE_ADVANCE' AND l.side='DEBIT' AND l.amount_halalah=50000)
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='CASH_ACCOUNT' AND l.side='CREDIT' AND l.amount_halalah=50000));

  e5:=pg_temp.w10e2_make_expense(5,200,'employee_paid','personal_funds',NULL,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('employee_expense_5',e5);
  contract:=pg_temp.w10e2_contract('EXPENSE',e5,'EMPLOYEE_PAID_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    'employee_reimbursement_liability',false,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE',e5,contract,12);
  IF result.error_code IS NOT NULL OR result.status IS DISTINCT FROM 'POSTED' THEN
    RAISE EXCEPTION 'W10E2 advance-offset Expense recognition failed: %',coalesce(result.error_code,result.status); END IF;
  recognized_expense_event:=result.event_id;
  SELECT * INTO w5 FROM public.settle_expense_reimbursement(e5,'W10E2-SET-OFFSET-0001',25,'advance_offset',NULL,
    'Synthetic advance offset with explicit provenance',pg_temp.w10e2_req(6110),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 advance offset settlement failed: %',w5.error_code; END IF;
  settlement_id:=w5.settlement_id;
  contract:=pg_temp.w10e2_contract('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,'REIMBURSEMENT_ADVANCE_OFFSET',NULL,CURRENT_DATE-1,
    'employee_reimbursement_liability',true,false,advance1,true,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,contract,8);
  PERFORM pg_temp.w10e2_assert(8,'advance offset requires structured provenance',result.status='POSTED'
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=recognized_expense_event
      AND l.party_role='EMPLOYEE_REIMBURSEMENT_LIABILITY' AND l.side='CREDIT' AND l.amount_halalah=20000)
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='EMPLOYEE_ADVANCE' AND l.side='CREDIT' AND l.amount_halalah=2500));

  SELECT * INTO w5 FROM public.settle_expense_reimbursement(e5,'W10E2-SET-OFFSET-0002',10,'advance_offset',NULL,
    'Synthetic advance offset without accounting provenance',pg_temp.w10e2_req(6111),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 provenance challenge settlement failed: %',w5.error_code; END IF;
  settlement_id:=w5.settlement_id;
  contract:=pg_temp.w10e2_contract('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,'REIMBURSEMENT_ADVANCE_OFFSET',NULL,CURRENT_DATE-1,
    'employee_reimbursement_liability',true,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE_REIMBURSEMENT_SETTLEMENT',settlement_id,contract,9);
  PERFORM pg_temp.w10e2_assert(9,'advance offset without provenance held',result.status='HELD'
    AND (SELECT held_code FROM public.accounting_expense_bridge_event_versions WHERE event_id=result.event_id AND version=result.event_version)='ADVANCE_OFFSET_PROVENANCE_REQUIRED'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links WHERE event_id=result.event_id));

  contract:=pg_temp.w10e2_contract('EXPENSE',e4,'COMPANY_DIRECT_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    NULL,false,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE',e4,contract,10);
  PERFORM pg_temp.w10e2_assert(10,'company direct Expense posts only with explicit cash binding',result.status='POSTED'
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='CASH_ACCOUNT' AND l.side='CREDIT' AND l.amount_halalah=2500));

  e11:=pg_temp.w10e2_make_expense(11,30,'company_direct','company_funds',NULL,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('company_expense_11',e11);
  contract:=pg_temp.w10e2_contract('EXPENSE',e11,'COMPANY_DIRECT_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    NULL,false,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE',e11,contract,11);
  PERFORM pg_temp.w10e2_assert(11,'company direct Expense without cash binding held',result.status='HELD'
    AND (SELECT held_code FROM public.accounting_expense_bridge_event_versions WHERE event_id=result.event_id AND version=result.event_version)='cash_account_evidence_missing');

  SELECT * INTO w5 FROM public.request_cash_advance('W10E2-ADV-REJECTED','event',c.service_id,c.employee_id,
    'Synthetic rejected advance',35,pg_temp.w10e2_req(74001),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 rejected advance request failed: %',w5.error_code; END IF;
  advance_rejected:=w5.advance_id;
  SELECT * INTO w5 FROM public.reject_cash_advance(advance_rejected,'Synthetic rejection for accounting coverage',
    pg_temp.w10e2_req(74002),c.admin_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 advance rejection failed: %',w5.error_code; END IF;
  case_count:=0;
  FOR result IN SELECT l.id FROM public.audit_logs l
    WHERE l.entity_type='employee_cash_advance'
      AND ((l.entity_id=advance1 AND l.action IN ('cash_advance_requested','cash_advance_approved'))
        OR (l.entity_id=advance_rejected AND l.action='cash_advance_rejected'))
    ORDER BY l.timestamp,l.id LOOP
    contract:=pg_temp.w10e2_contract('CASH_ADVANCE_GOVERNANCE_EVENT',result.id,'NO_MONETARY_EFFECT',NULL,NULL,NULL,
      false,false,NULL,false,NULL,false);
    SELECT * INTO w5 FROM pg_temp.w10e2_post('CASH_ADVANCE_GOVERNANCE_EVENT',result.id,contract,120+case_count);
    IF w5.status<>'NO_EFFECT' OR w5.journal_id IS NOT NULL THEN RAISE EXCEPTION 'W10E2 cash advance governance event created monetary effect'; END IF;
    case_count:=case_count+1;
  END LOOP;
  PERFORM pg_temp.w10e2_assert(12,'advance request approval and rejection have no journal',case_count=3
    AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links l
      JOIN public.accounting_expense_bridge_events e ON e.id=l.event_id WHERE e.source_type='CASH_ADVANCE_GOVERNANCE_EVENT'));

  e6:=pg_temp.w10e2_make_expense(6,100,'company_direct','cash_advance',advance1,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('cash_advance_expense_6',e6);
  SELECT * INTO w5 FROM public.settle_cash_advance_spend(advance1,e6,100,'Synthetic full settlement',
    pg_temp.w10e2_req(75006),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 full advance settlement failed: %',w5.error_code; END IF;
  settlement_id:=w5.allocation_id;
  contract:=pg_temp.w10e2_contract('CASH_ADVANCE_EXPENSE_SETTLEMENT',settlement_id,'CASH_ADVANCE_EXPENSE_SETTLEMENT',
    'DIRECT_EXPENSE',CURRENT_DATE-1,'employee_advance',true,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('CASH_ADVANCE_EXPENSE_SETTLEMENT',settlement_id,contract,14);
  PERFORM pg_temp.w10e2_assert(14,'cash advance Expense settlement fully posts supported source',result.status='POSTED'
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='DIRECT_EXPENSE' AND l.side='DEBIT' AND l.amount_halalah=10000));

  e7:=pg_temp.w10e2_make_expense(7,50,'company_direct','cash_advance',advance1,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('cash_advance_expense_7',e7);
  SELECT * INTO w5 FROM public.settle_cash_advance_spend(advance1,e7,40,'Synthetic partial settlement',
    pg_temp.w10e2_req(75007),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 partial advance settlement failed: %',w5.error_code; END IF;
  settlement_id:=w5.allocation_id;
  contract:=pg_temp.w10e2_contract('CASH_ADVANCE_EXPENSE_SETTLEMENT',settlement_id,'CASH_ADVANCE_EXPENSE_SETTLEMENT',
    'DIRECT_EXPENSE',CURRENT_DATE-1,'employee_advance',true,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('CASH_ADVANCE_EXPENSE_SETTLEMENT',settlement_id,contract,15);
  PERFORM pg_temp.w10e2_assert(15,'partial advance settlement',result.status='POSTED'
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='EMPLOYEE_ADVANCE' AND l.side='CREDIT' AND l.amount_halalah=4000));

  e8:=pg_temp.w10e2_make_expense(8,15,'company_direct','cash_advance',advance1,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('cash_advance_expense_8',e8);
  SELECT * INTO w5 FROM public.settle_cash_advance_spend(advance1,e8,400,'Synthetic over remaining advance',
    pg_temp.w10e2_req(75008),c.operator_id::text,'admin');
  PERFORM pg_temp.w10e2_assert(16,'W5 rejects settlement above remaining advance',w5.error_code='allocation_exceeds_remaining_advance_balance'
    AND NOT EXISTS(SELECT 1 FROM public.cash_advance_expense_settlements WHERE request_id=pg_temp.w10e2_req(75008)));

  advance2:=pg_temp.w10e2_make_advance(2,200,true);
  contract:=pg_temp.w10e2_contract('CASH_ADVANCE_ISSUE',advance2,'CASH_ADVANCE_ISSUE',NULL,CURRENT_DATE-1,
    'employee_advance',true,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('CASH_ADVANCE_ISSUE',advance2,contract,170);
  IF result.status<>'POSTED' THEN RAISE EXCEPTION 'W10E2 second advance issue failed: %',result.error_code; END IF;
  e9:=pg_temp.w10e2_make_expense(9,50,'company_direct','cash_advance',advance2,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('cash_advance_expense_9',e9);
  SELECT * INTO w5 FROM public.settle_cash_advance_spend(advance2,e9,30,'Synthetic valid first allocation',
    pg_temp.w10e2_req(75009),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 first Expense allocation failed: %',w5.error_code; END IF;
  settlement_id:=w5.allocation_id;
  contract:=pg_temp.w10e2_contract('CASH_ADVANCE_EXPENSE_SETTLEMENT',settlement_id,'CASH_ADVANCE_EXPENSE_SETTLEMENT',
    'DIRECT_EXPENSE',CURRENT_DATE-1,'employee_advance',true,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('CASH_ADVANCE_EXPENSE_SETTLEMENT',settlement_id,contract,171);
  IF result.status<>'POSTED' THEN RAISE EXCEPTION 'W10E2 valid first Expense allocation did not post: %',result.error_code; END IF;
  INSERT INTO public.cash_advance_expense_settlements(cash_advance_id,expense_id,amount,request_id,settled_by,settled_at,notes)
    VALUES(advance2,e9,25,pg_temp.w10e2_req(75010),c.operator_id,transaction_timestamp(),'Synthetic adversarial over-Expense allocation')
    RETURNING id INTO settlement_id;
  UPDATE public.employee_cash_advances SET amount_spent_settled=amount_spent_settled+25,updated_at=clock_timestamp() WHERE id=advance2;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES('cash_advance_expense_settled','cash_advance_expense_settlement',settlement_id,c.operator_id::text,
      jsonb_build_object('operation','settle_cash_advance_spend','request_id',pg_temp.w10e2_req(75010)::text,
        'cash_advance_id',advance2,'expense_id',e9,'amount',25),transaction_timestamp());
  contract:=pg_temp.w10e2_contract('CASH_ADVANCE_EXPENSE_SETTLEMENT',settlement_id,'CASH_ADVANCE_EXPENSE_SETTLEMENT',
    'DIRECT_EXPENSE',CURRENT_DATE-1,'employee_advance',true,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('CASH_ADVANCE_EXPENSE_SETTLEMENT',settlement_id,contract,17);
  PERFORM pg_temp.w10e2_assert(17,'W10 bridge caps cumulative settlements at Expense amount',result.error_code='expense_settlement_exceeds_expense'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links WHERE event_id=result.event_id));
  IF pg_temp.w10e2_rehold('CASH_ADVANCE_EXPENSE_SETTLEMENT',settlement_id,17) IS DISTINCT FROM 'HELD' THEN
    RAISE EXCEPTION 'W10E2 over-Expense settlement was not retained HELD'; END IF;

  SELECT * INTO w5 FROM public.record_cash_advance_return(advance1,300,'W10E2-ADV-RETURN-1',
    'Synthetic first advance return',pg_temp.w10e2_req(75101),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 advance return failed: %',w5.error_code; END IF;
  settlement_id:=w5.return_id;
  contract:=pg_temp.w10e2_contract('CASH_ADVANCE_RETURN',settlement_id,'CASH_ADVANCE_RETURN',NULL,CURRENT_DATE-1,
    'employee_advance',true,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('CASH_ADVANCE_RETURN',settlement_id,contract,18);
  PERFORM pg_temp.w10e2_assert(18,'Cash Advance return reduces employee advance with treasury cash evidence',result.status='POSTED'
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='EMPLOYEE_ADVANCE' AND l.side='CREDIT' AND l.amount_halalah=30000));
  SELECT * INTO w5 FROM public.record_cash_advance_return(advance1,30,'W10E2-ADV-RETURN-2',
    'Synthetic final advance return',pg_temp.w10e2_req(75102),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 final advance return failed: %',w5.error_code; END IF;
  settlement_id:=w5.return_id;
  contract:=pg_temp.w10e2_contract('CASH_ADVANCE_RETURN',settlement_id,'CASH_ADVANCE_RETURN',NULL,CURRENT_DATE-1,
    'employee_advance',true,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('CASH_ADVANCE_RETURN',settlement_id,contract,19);
  PERFORM pg_temp.w10e2_assert(19,'Cash Advance return has no negative Expense line',result.status='POSTED'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role IN ('DIRECT_EXPENSE','DIRECT_ASSET')));

  fund_id:=pg_temp.w10e2_make_fund(1,600);
  SELECT * INTO w5 FROM public.update_petty_cash_fund(fund_id,'W10E2 Petty Cash 1',c.admin_id,600,
    pg_temp.w10e2_req(76001),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 fund update failed: %',w5.error_code; END IF;
  SELECT * INTO w5 FROM public.record_petty_cash_transaction(fund_id,'replenishment',200,'W10E2 replenishment',NULL,
    'Synthetic Petty Cash replenishment',pg_temp.w10e2_req(76101),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 Petty Cash replenishment failed: %',w5.error_code; END IF;
  petty_tx_id:=w5.transaction_id;
  contract:=pg_temp.w10e2_contract('PETTY_CASH_TRANSACTION',petty_tx_id,'PETTY_REPLENISHMENT',NULL,CURRENT_DATE-1,
    'petty_cash',false,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('PETTY_CASH_TRANSACTION',petty_tx_id,contract,21);
  PERFORM pg_temp.w10e2_assert(21,'Petty Cash replenishment posts accountability and bound treasury cash',result.status='POSTED'
    AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role='CASH_ACCOUNTABILITY' AND l.side='DEBIT' AND l.amount_halalah=20000));

  e10:=pg_temp.w10e2_make_expense(10,75,'company_direct','petty_cash',NULL,fund_id);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('petty_cash_expense_10',e10);
  SELECT * INTO w5 FROM public.record_petty_cash_transaction(fund_id,'disbursement',75,'W10E2 disbursement',e10,
    'Synthetic Petty Cash expense disbursement',pg_temp.w10e2_req(76102),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 Petty Cash disbursement failed: %',w5.error_code; END IF;
  petty_tx_id:=w5.transaction_id;
  contract:=pg_temp.w10e2_contract('PETTY_CASH_TRANSACTION',petty_tx_id,'PETTY_EXPENSE_DISBURSEMENT','DIRECT_EXPENSE',
    CURRENT_DATE-1,'petty_cash',false,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('PETTY_CASH_TRANSACTION',petty_tx_id,contract,22);
  IF result.status<>'POSTED' THEN RAISE EXCEPTION 'W10E2 Petty Cash expense disbursement did not post: %',result.error_code; END IF;
  PERFORM pg_temp.w10e2_assert(22,'Petty Cash expense disbursement recognizes the approved Expense',
    result.status='POSTED' AND EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l
      WHERE l.event_id=result.event_id AND l.party_role='DIRECT_EXPENSE' AND l.side='DEBIT' AND l.amount_halalah=7500));
  contract:=pg_temp.w10e2_contract('EXPENSE',e10,'NO_MONETARY_EFFECT',NULL,NULL,NULL,false,false,NULL,false,NULL,false);
  SELECT * INTO saved FROM public.save_accounting_expense_bridge_event(c.operator_id,'EXPENSE',e10,0,contract,
    'W10E2 linked Petty Cash Expense has no second accounting effect',pg_temp.w10e2_req(1023));
  PERFORM pg_temp.w10e2_assert(23,'linked Petty Cash Expense has one effect',saved.status='NO_EFFECT'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links l WHERE l.event_id=saved.event_id)
    AND (SELECT count(*) FROM public.accounting_expense_bridge_journal_links l JOIN public.accounting_expense_bridge_events x ON x.id=l.event_id
      WHERE x.source_type='PETTY_CASH_TRANSACTION' AND x.source_record_id=petty_tx_id)=1);

  SELECT * INTO w5 FROM public.record_petty_cash_transaction(fund_id,'treasury_withdrawal',25,'W10E2 withdrawal',NULL,
    'Synthetic treasury withdrawal',pg_temp.w10e2_req(76103),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 treasury withdrawal failed: %',w5.error_code; END IF;
  petty_tx_id:=w5.transaction_id;
  contract:=pg_temp.w10e2_contract('PETTY_CASH_TRANSACTION',petty_tx_id,'PETTY_TREASURY_WITHDRAWAL',NULL,CURRENT_DATE-1,
    'petty_cash',false,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('PETTY_CASH_TRANSACTION',petty_tx_id,contract,24);
  PERFORM pg_temp.w10e2_assert(24,'Petty Cash treasury withdrawal posts without Expense',result.status='POSTED'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l WHERE l.event_id=result.event_id
      AND l.party_role IN ('DIRECT_EXPENSE','DIRECT_ASSET')));

  SELECT * INTO w5 FROM public.record_petty_cash_transaction(fund_id,'return',10,'W10E2 ambiguous return',NULL,
    'Synthetic return without treasury provenance',pg_temp.w10e2_req(76104),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 ambiguous Petty Cash return source failed: %',w5.error_code; END IF;
  petty_tx_id:=w5.transaction_id;
  contract:=pg_temp.w10e2_contract('PETTY_CASH_TRANSACTION',petty_tx_id,'PETTY_RETURN_FROM_TREASURY',NULL,CURRENT_DATE-1,
    'petty_cash',false,false,NULL,false,NULL,false);
  SELECT * INTO result FROM pg_temp.w10e2_post('PETTY_CASH_TRANSACTION',petty_tx_id,contract,25);
  PERFORM pg_temp.w10e2_assert(25,'generic Petty Cash return provenance held',result.status='HELD'
    AND (SELECT held_code FROM public.accounting_expense_bridge_event_versions WHERE event_id=result.event_id AND version=result.event_version)='PETTY_CASH_RETURN_PROVENANCE_REQUIRED'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links WHERE event_id=result.event_id));

  SELECT * INTO saved FROM public.accounting_expense_bridge_events
    WHERE profile_id=c.profile_id AND source_type='EXPENSE' AND source_record_id=e4;
  v_event_id:=saved.id;v_event_version:=saved.current_version;
  SELECT * INTO result FROM public.save_accounting_expense_bridge_event(c.operator_id,'EXPENSE',e4,1,
    pg_temp.w10e2_contract('EXPENSE',e4,'COMPANY_DIRECT_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,NULL,false,true,NULL,false,NULL,true),
    'W10E2 synthetic rollback accounting evidence',pg_temp.w10e2_req(10010));
  PERFORM pg_temp.w10e2_assert(26,'bridge request retry is idempotent',result.error_code IS NULL AND result.idempotent_replay
    AND result.event_id=v_event_id);
  SELECT * INTO result FROM public.save_accounting_expense_bridge_event(c.operator_id,'EXPENSE',e4,1,
    pg_temp.w10e2_contract('EXPENSE',e4,'COMPANY_DIRECT_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,NULL,false,false,NULL,false,NULL,true),
    'Changed W10E2 payload for same request',pg_temp.w10e2_req(10010));
  PERFORM pg_temp.w10e2_assert(27,'same request payload collision is rejected',result.error_code='request_payload_conflict');
  SELECT * INTO result FROM public.save_accounting_expense_bridge_event(c.operator_id,'EXPENSE',e4,v_event_version,
    pg_temp.w10e2_contract('EXPENSE',e4,'COMPANY_DIRECT_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,NULL,false,true,NULL,false,NULL,true),
    'Attempt duplicate W10E2 source effect',pg_temp.w10e2_req(10028));
  duplicate_source_denied:=result.error_code='source_identity_immutable'
    AND (SELECT count(*) FROM public.accounting_expense_bridge_journal_links WHERE event_id=v_event_id)=1;

  BEGIN
    SELECT * INTO result FROM public.prepare_accounting_journal(c.operator_id,NULL,0,jsonb_build_object(
      'source_domain','CONTROLLED_MANUAL','accounting_date',CURRENT_DATE,'period_id',c.period_id,
      'period_version',c.period_version,'posting_rule_id',c.rule_id,'rule_version',c.rule_version,
      'source_record_key','W10E2/SYN/MANUAL','economic_event_key','W10E2/SYN/MANUAL/EFFECT',
      'posting_purpose','manual','description_en','Synthetic manual protected account probe',
      'description_ar','اختبار حساب محمي اصطناعي','lines',jsonb_build_array(
        jsonb_build_object('mapping_key','employee_advance','side','DEBIT','amount_halalah','1000','service_id',c.service_id,'description_en','probe','description_ar','اختبار'),
        jsonb_build_object('mapping_key','direct_expense','side','CREDIT','amount_halalah','1000','service_id',c.service_id,'description_en','probe','description_ar','اختبار'))),
      'Attempt ordinary manual protected-account posting',NULL,pg_temp.w10e2_req(1029));
    denied:=result.error_code IS NOT NULL;
  EXCEPTION WHEN OTHERS THEN denied:=true;
  END;
  PERFORM pg_temp.w10e2_assert(29,'ordinary manual protected-account bypass rejection',denied
    AND NOT EXISTS(SELECT 1 FROM public.accounting_source_effects WHERE source_domain='CONTROLLED_MANUAL'
      AND source_record_key='W10E2/SYN/MANUAL'));

  e12:=pg_temp.w10e2_make_expense(12,45,'employee_paid','personal_funds',NULL,NULL);
  e13:=pg_temp.w10e2_make_expense(13,55,'employee_paid','personal_funds',NULL,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('w10c_reconstructed_expense',e12),('w10c_postcutover_expense',e13);
  INSERT INTO public.accounting_inception_packages(id,profile_id,current_version) VALUES(w10c_package_id,c.profile_id,0);
  INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,
    actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES('00000000-0000-4000-8000-00000000e9a8',c.profile_id,'accounting_inception_package_created',
    'accounting_inception_package',w10c_package_id,1,c.operator_id,pg_temp.w10e2_req(1026),
    'Synthetic W10C coverage bootstrap',NULL,repeat('c',64),'accounting_inception_packages/'||w10c_package_id::text||'/1',clock_timestamp());
  INSERT INTO public.accounting_inception_package_versions(profile_id,package_id,version,previous_version,
    accounting_start_date,cutover_boundary_date,payload,payload_fingerprint,created_by,foundation_event_id)
  VALUES(c.profile_id,w10c_package_id,1,NULL,'2000-01-01',CURRENT_DATE,
    jsonb_build_object('synthetic',true,'accounting_start_date','2000-01-01','cutover_boundary_date',CURRENT_DATE,
      'items',jsonb_build_array(
        jsonb_build_object('item_id',package_item_recon,'source_domain','EXPENSE_BRIDGE',
          'source_record_key',public.accounting_expense_bridge_source_snapshot('EXPENSE',e12)->>'source_record_key',
          'economic_event_key',public.accounting_expense_bridge_source_snapshot('EXPENSE',e12)->>'economic_event_key',
          'classification','RECONSTRUCTED_HISTORY','resolution_state','RESOLVED','is_material',true,
          'reconciliation_category','EMPLOYEE_ACCOUNTABILITY','party_type','EMPLOYEE','party_reference',c.employee_id::text,
          'reconciliation_reference','Synthetic W10C historical Employee expense','evidence_refs',jsonb_build_array('synthetic://w10e2/w10c-evidence')),
        jsonb_build_object('item_id',package_item_post,'source_domain','EXPENSE_BRIDGE',
          'source_record_key',public.accounting_expense_bridge_source_snapshot('EXPENSE',e13)->>'source_record_key',
          'economic_event_key',public.accounting_expense_bridge_source_snapshot('EXPENSE',e13)->>'economic_event_key',
          'classification','POST_CUTOVER_SOURCE','resolution_state','RESOLVED','is_material',true,
          'reconciliation_category','EMPLOYEE_ACCOUNTABILITY','party_type','EMPLOYEE','party_reference',c.employee_id::text,
          'reconciliation_reference','Synthetic W10C post-cutover Employee expense','evidence_refs',jsonb_build_array('synthetic://w10e2/w10c-evidence')))),
    repeat('c',64),c.operator_id,'00000000-0000-4000-8000-00000000e9a8');
  UPDATE public.accounting_inception_packages SET current_version=1 WHERE profile_id=c.profile_id AND id=w10c_package_id;
  INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,
    actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES('00000000-0000-4000-8000-00000000e9a9',c.profile_id,'accounting_inception_package_updated',
    'accounting_inception_package',w10c_package_id,2,c.operator_id,pg_temp.w10e2_req(1027),
    'Synthetic W10C coverage items',NULL,repeat('d',64),'accounting_inception_packages/'||w10c_package_id::text||'/2',clock_timestamp());
  INSERT INTO public.accounting_inception_package_versions(profile_id,package_id,version,previous_version,
    accounting_start_date,cutover_boundary_date,payload,payload_fingerprint,created_by,foundation_event_id)
  SELECT p.profile_id,w10c_package_id,2,1,p.accounting_start_date,p.cutover_boundary_date,p.payload,
    repeat('d',64),c.operator_id,'00000000-0000-4000-8000-00000000e9a9'
  FROM public.accounting_inception_package_versions p WHERE p.profile_id=c.profile_id AND p.package_id=w10c_package_id AND p.version=1;
  UPDATE public.accounting_inception_packages SET current_version=2 WHERE profile_id=c.profile_id AND id=w10c_package_id;
  INSERT INTO public.accounting_inception_coverage(id,profile_id,source_domain,source_record_key,economic_event_key,current_version)
  SELECT coverage_reconstructed,c.profile_id,'EXPENSE_BRIDGE',s->>'source_record_key',s->>'economic_event_key',0
    FROM (SELECT public.accounting_expense_bridge_source_snapshot('EXPENSE',e12) s) q;
  INSERT INTO public.accounting_inception_coverage(id,profile_id,source_domain,source_record_key,economic_event_key,current_version)
  SELECT coverage_postcutover,c.profile_id,'EXPENSE_BRIDGE',s->>'source_record_key',s->>'economic_event_key',0
    FROM (SELECT public.accounting_expense_bridge_source_snapshot('EXPENSE',e13) s) q;
  INSERT INTO public.accounting_inception_coverage_versions(profile_id,coverage_id,version,previous_version,package_id,
    package_version,item_id,classification,resolution_state,is_material,reconciliation_category,party_type,party_reference,
    reconciliation_reference,evidence_count,payload_fingerprint,created_by,foundation_event_id)
    VALUES(c.profile_id,coverage_reconstructed,1,NULL,w10c_package_id,2,package_item_recon,'RECONSTRUCTED_HISTORY','RESOLVED',true,
    'EMPLOYEE_ACCOUNTABILITY','EMPLOYEE',c.employee_id::text,'Synthetic W10C historical Employee expense',1,repeat('d',64),c.operator_id,'00000000-0000-4000-8000-00000000e9a9'),
    (c.profile_id,coverage_postcutover,1,NULL,w10c_package_id,2,package_item_post,'POST_CUTOVER_SOURCE','RESOLVED',true,
    'EMPLOYEE_ACCOUNTABILITY','EMPLOYEE',c.employee_id::text,'Synthetic W10C post-cutover Employee expense',1,repeat('d',64),c.operator_id,'00000000-0000-4000-8000-00000000e9a9');
  UPDATE public.accounting_inception_coverage SET current_version=1 WHERE profile_id=c.profile_id AND id IN (coverage_reconstructed,coverage_postcutover);
  contract:=pg_temp.w10e2_contract('EXPENSE',e12,'EMPLOYEE_PAID_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    'employee_reimbursement_liability',false,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE',e12,contract,30);
  contract:=pg_temp.w10e2_contract('EXPENSE',e13,'EMPLOYEE_PAID_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    'employee_reimbursement_liability',false,false,NULL,false,NULL,true);
  SELECT * INTO w5 FROM pg_temp.w10e2_post('EXPENSE',e13,contract,31);
  PERFORM pg_temp.w10e2_assert(30,'W10C inception replay protection',result.status='HELD'
    AND (SELECT held_code FROM public.accounting_expense_bridge_event_versions WHERE event_id=result.event_id AND version=result.event_version)='inception_coverage_conflict'
    AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links WHERE event_id=result.event_id)
    AND w5.status='POSTED');

  e14:=pg_temp.w10e2_make_expense(14,20,'company_direct','company_funds',NULL,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('future_accounting_date_expense',e14);
  contract:=pg_temp.w10e2_contract('EXPENSE',e14,'COMPANY_DIRECT_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE+1,
    NULL,false,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE',e14,contract,32);
  report:=public.get_accounting_expense_bridge_reconciliation(c.operator_id,CURRENT_DATE,
    clock_timestamp()+interval '1 minute',500);
  SELECT x INTO event FROM jsonb_array_elements(report->'events') q(x) WHERE x->>'source_record_id'=e14::text;
  PERFORM pg_temp.w10e2_assert(31,'accounting date cutoff',result.status='POSTED'
    AND event->>'reconciliation_status'='ACCOUNTING_DATE_AFTER_CUTOFF');

  e15:=pg_temp.w10e2_make_expense(15,20,'employee_paid','personal_funds',NULL,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('record_cutoff_expense',e15);
  -- Pin the cutoff to the persisted source timestamp so the source remains visible
  -- while the bridge classification, created afterward, stays outside the cutoff.
  record_cutoff:=(public.accounting_expense_bridge_source_snapshot('EXPENSE',e15)->>'source_recorded_at')::timestamptz;
  contract:=pg_temp.w10e2_contract('EXPENSE',e15,'EMPLOYEE_PAID_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    'employee_reimbursement_liability',false,false,NULL,false,NULL,true);
  SELECT * INTO saved FROM public.save_accounting_expense_bridge_event(c.operator_id,'EXPENSE',e15,0,contract,
    'W10E2 synthetic record cutoff classification',pg_temp.w10e2_req(900032));
  report:=public.get_accounting_expense_bridge_reconciliation(c.operator_id,CURRENT_DATE+10,record_cutoff,500);
  SELECT x INTO event FROM jsonb_array_elements(report->'events') q(x) WHERE x->>'source_record_id'=e15::text;
  IF (saved.status='READY' AND event IS NOT NULL AND event->>'reconciliation_status'='MISSING_CLASSIFICATION'
      AND event->>'event_version' IS NULL) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'W10E2 case 32 failed: recorded-at cutoff (error=%; saved=%; source_eligible=%; source_recorded_at=%; reconciliation=%; event_version=%)',
      saved.error_code,saved.status,public.accounting_expense_bridge_source_snapshot('EXPENSE',e15)->>'eligible',
      public.accounting_expense_bridge_source_snapshot('EXPENSE',e15)->>'source_recorded_at',
      event->>'reconciliation_status',event->>'event_version';
  END IF;
  PERFORM pg_temp.w10e2_assert(32,'recorded-at cutoff',true);
  contract:=pg_temp.w10e2_contract('EXPENSE',e15,'EMPLOYEE_PAID_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    'employee_reimbursement_liability',false,false,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE',e15,contract,33);
  IF result.status<>'POSTED' THEN RAISE EXCEPTION 'W10E2 recorded-cutoff Expense failed to post afterward: %',result.error_code; END IF;

  e16:=pg_temp.w10e2_make_expense(16,20,'employee_paid','personal_funds',NULL,NULL);
  INSERT INTO pg_temp.w10e2_ids(label,entity_id) VALUES('future_settlement_expense',e16);
  contract:=pg_temp.w10e2_contract('EXPENSE',e16,'EMPLOYEE_PAID_EXPENSE','DIRECT_EXPENSE',CURRENT_DATE-1,
    'employee_reimbursement_liability',false,false,NULL,false,NULL,true);
  SELECT * INTO w5 FROM pg_temp.w10e2_post('EXPENSE',e16,contract,36);
  IF w5.status<>'POSTED' THEN RAISE EXCEPTION 'W10E2 future-settlement Expense recognition failed: %',w5.error_code; END IF;
  future_cutoff:=transaction_timestamp()+interval '3 days';
  INSERT INTO public.expense_reimbursement_settlements(settlement_number,expense_id,amount,settlement_method,
    payment_reference,request_id,settled_by,settled_at,notes)
  VALUES('W10E2-FUTURE-SETTLEMENT',e16,10,'bank_transfer','synthetic future settlement',pg_temp.w10e2_req(76116),
    c.operator_id,transaction_timestamp()+interval '1 day','Synthetic future-dated source for cutoff check')
  RETURNING id INTO future_settlement_id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES('expense_reimbursement_settled','expense_reimbursement_settlement',future_settlement_id,c.operator_id::text,
    jsonb_build_object('operation','settle_expense_reimbursement','request_id',pg_temp.w10e2_req(76116)::text,
      'expense_id',e16,'amount',10,'settlement_method','bank_transfer'),transaction_timestamp()+interval '1 day');
  report:=public.get_accounting_expense_bridge_reconciliation(c.operator_id,CURRENT_DATE,
    transaction_timestamp()+interval '3 days',500);
  future_absent:=NOT EXISTS(SELECT 1 FROM jsonb_array_elements(report->'events') x WHERE x->>'source_record_id'=future_settlement_id::text);
  report:=public.get_accounting_expense_bridge_reconciliation(c.operator_id,CURRENT_DATE+2,future_cutoff,500);
  future_present:=EXISTS(SELECT 1 FROM jsonb_array_elements(report->'events') x WHERE x->>'source_record_id'=future_settlement_id::text
      AND x->>'reconciliation_status'='MISSING_CLASSIFICATION');
  PERFORM pg_temp.w10e2_assert(33,'future settlement source cutoff',future_absent AND future_present);
  contract:=pg_temp.w10e2_contract('EXPENSE_REIMBURSEMENT_SETTLEMENT',future_settlement_id,'REIMBURSEMENT_CASH',NULL,
    CURRENT_DATE+1,'employee_reimbursement_liability',false,true,NULL,false,NULL,true);
  SELECT * INTO result FROM pg_temp.w10e2_post('EXPENSE_REIMBURSEMENT_SETTLEMENT',future_settlement_id,contract,34);
  IF result.status<>'POSTED' THEN RAISE EXCEPTION 'W10E2 future-dated reimbursement source failed to post: %',result.error_code; END IF;

  SELECT * INTO w5 FROM public.set_petty_cash_fund_status(fund_id,'suspended',pg_temp.w10e2_req(76002),c.operator_id::text,'admin');
  IF w5.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10E2 Petty Cash fund status update failed: %',w5.error_code; END IF;
  case_count:=0;
  FOR result IN SELECT l.id FROM public.audit_logs l WHERE l.entity_type='petty_cash_fund' AND l.entity_id=fund_id
    AND l.action IN ('create','update','status_change') ORDER BY l.timestamp,l.id LOOP
    contract:=pg_temp.w10e2_contract('PETTY_CASH_FUND_GOVERNANCE_EVENT',result.id,'NO_MONETARY_EFFECT',NULL,NULL,NULL,
      false,false,NULL,false,NULL,false);
    SELECT * INTO w5 FROM pg_temp.w10e2_post('PETTY_CASH_FUND_GOVERNANCE_EVENT',result.id,contract,200+case_count);
    IF w5.status<>'NO_EFFECT' OR w5.journal_id IS NOT NULL THEN RAISE EXCEPTION 'W10E2 Petty Cash governance event created monetary effect'; END IF;
    case_count:=case_count+1;
  END LOOP;
  PERFORM pg_temp.w10e2_assert(20,'Petty Cash fund create custodian limit and status have no journal',case_count=3
    AND NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links l
      JOIN public.accounting_expense_bridge_events e ON e.id=l.event_id WHERE e.source_type='PETTY_CASH_FUND_GOVERNANCE_EVENT'));

  SELECT * INTO prepared FROM public.prepare_accounting_expense_bridge_event(c.operator_id,v_event_id,v_event_version,
    c.period_id,c.period_version,c.rule_id,c.rule_version,'W10E2 duplicate prepare idempotency probe',pg_temp.w10e2_req(21028));
  SELECT count(*) INTO case_count FROM public.accounting_source_effects se
    WHERE se.profile_id=c.profile_id AND se.source_domain='EXPENSE_BRIDGE'
      AND se.source_record_key='W5/EXPENSE/'||e4::text AND se.economic_event_key='W5/EXPENSE/'||e4::text||'/EFFECT';
  PERFORM pg_temp.w10e2_assert(28,'duplicate source effect prevention',duplicate_source_denied
    AND prepared.error_code IS NULL AND prepared.idempotent_replay AND case_count=1);

  report:=public.get_accounting_expense_bridge_reconciliation(c.operator_id,CURRENT_DATE+10,
    transaction_timestamp()+interval '3 days',500);
  IF (report->>'state'='READY' AND report->>'employee_difference_count'='0'
      AND jsonb_array_length(report->'employee_balances')=1) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'W10E2 case 34 failed: employee reconciliation (state=%; difference_count=%; balances=%; controls=%)',
      report->>'state',report->>'employee_difference_count',report->'employee_balances',report->'control_balances';
  END IF;
  PERFORM pg_temp.w10e2_assert(34,'employee reconciliation',true);
  PERFORM pg_temp.w10e2_assert(35,'advance reconciliation',report->>'state'='READY'
    AND report->>'control_difference_count'='0' AND report->>'employee_advance_balance_halalah'='17500');
  PERFORM pg_temp.w10e2_assert(36,'Petty Cash fund reconciliation',report->>'fund_difference_count'='0'
    AND jsonb_array_length(report->'fund_balances')=1 AND report->>'petty_cash_accountability_halalah'='10000');
  PERFORM pg_temp.w10e2_assert(37,'Service reconciliation',report->>'service_difference_count'='0'
    AND jsonb_array_length(report->'service_balances')>=1);

  UPDATE public.employee_cash_advances SET amount_spent_settled=100,updated_at=clock_timestamp() WHERE id=advance1;
  UPDATE public.employee_cash_advances SET amount_spent_settled=1,updated_at=clock_timestamp() WHERE id=advance2;
  UPDATE public.petty_cash_funds SET current_balance=123,updated_at=clock_timestamp() WHERE id=fund_id;
  report:=public.get_accounting_expense_bridge_reconciliation(c.operator_id,CURRENT_DATE+10,
    transaction_timestamp()+interval '3 days',500);
  SELECT * INTO tb FROM public.get_accounting_trial_balance(c.operator_id,CURRENT_DATE+10,
    transaction_timestamp()+interval '3 days',NULL,0,100);
  PERFORM pg_temp.w10e2_assert(38,'balanced GL and trial balance; mutable W5 summary is not authority',report->>'control_difference_count'='0'
    AND report->>'employee_advance_balance_halalah'='17500'
    AND report->>'employee_advance_balance_halalah'<>round(((SELECT remaining_balance FROM public.employee_cash_advances WHERE id=advance1)
      +(SELECT remaining_balance FROM public.employee_cash_advances WHERE id=advance2))*100)::text
    AND report->>'petty_cash_accountability_halalah'='10000'
    AND report->>'petty_cash_accountability_halalah'<>round((SELECT current_balance*100 FROM public.petty_cash_funds WHERE id=fund_id)::numeric)::text
    AND tb.report->>'debits_equal_credits'='true'
    AND tb.report->>'debit_balance_total_halalah'=tb.report->>'credit_balance_total_halalah');

  SELECT count(*) INTO v_case_count FROM pg_temp.w10e2_case_results WHERE passed;
  IF v_case_count<>39 THEN RAISE EXCEPTION 'W10E2 fixture completed % of 39 pre-rollback accounting assertions',v_case_count; END IF;
  PERFORM pg_temp.w10e2_assert(39,'explicit rollback',true);
  IF (SELECT count(*) FROM pg_temp.w10e2_case_results WHERE passed)<>40 THEN
    RAISE EXCEPTION 'W10E2 fixture did not record all 40 scenarios';
  END IF;
END;
$w10e2_campaign$;

SELECT case_number,description,passed FROM w10e2_case_results ORDER BY case_number;
RESET ROLE;
ROLLBACK;

DO $residue_assertion$
BEGIN
  IF EXISTS(SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10e2-rollback-%')
     OR EXISTS(SELECT 1 FROM public.customers WHERE customer_number LIKE 'W10E2-SYN-%')
     OR EXISTS(SELECT 1 FROM public.services WHERE service_number LIKE 'SVC-2099-92__')
     OR EXISTS(SELECT 1 FROM public.expenses WHERE expense_number LIKE 'W10E2-EXP-%')
     OR EXISTS(SELECT 1 FROM public.employee_cash_advances WHERE advance_number LIKE 'W10E2-ADV-%')
     OR EXISTS(SELECT 1 FROM public.petty_cash_funds WHERE fund_name LIKE 'W10E2 Petty Cash%')
     OR EXISTS(SELECT 1 FROM public.business_documents WHERE id='00000000-0000-4000-8000-00000000e920')
     OR EXISTS(SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10E2-SYN-%')
     OR EXISTS(SELECT 1 FROM public.accounting_period_versions WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_posting_rules WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_expense_bridge_events WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_expense_bridge_event_versions WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_source_effects WHERE profile_id='00000000-0000-4000-8000-00000000e900' AND source_domain='EXPENSE_BRIDGE')
     OR EXISTS(SELECT 1 FROM public.accounting_journals WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_journal_versions WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_inception_packages WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_inception_coverage WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_inception_coverage_versions WHERE profile_id='00000000-0000-4000-8000-00000000e900')
     OR EXISTS(SELECT 1 FROM public.accounting_foundation_events
       WHERE id BETWEEN '00000000-0000-4000-8000-00000000e900' AND '00000000-0000-4000-8000-00000000e9ff') THEN
    RAISE EXCEPTION 'W10E2 rollback fixture left synthetic residue';
  END IF;
END;
$residue_assertion$;
SELECT 40 AS case_number,'zero synthetic residue' AS description,true AS passed;
