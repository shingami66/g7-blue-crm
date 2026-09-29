-- W10F synthetic DEV regression only. One transaction is fully rolled back.
BEGIN;

CREATE TEMP TABLE w10f_fixture_context (
  profile_id uuid NOT NULL,
  authority_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  period_id uuid,
  period_version integer,
  rule_id uuid,
  rule_version integer
);
INSERT INTO w10f_fixture_context(profile_id,authority_id,operator_id,admin_id,reviewer_id,customer_id)
VALUES('00000000-0000-4000-8000-00000000f800','00000000-0000-4000-8000-00000000f801',
  '00000000-0000-4000-8000-00000000f802','00000000-0000-4000-8000-00000000f803',
  '00000000-0000-4000-8000-00000000f804',
  '00000000-0000-4000-8000-00000000f810');
GRANT SELECT,UPDATE ON w10f_fixture_context TO service_role;

CREATE TEMP TABLE w10f_fixture_accounts(mapping_key text PRIMARY KEY,account_id uuid NOT NULL);
GRANT SELECT,INSERT ON w10f_fixture_accounts TO service_role;

CREATE TEMP TABLE w10f_fixture_invoice_map(
  label text PRIMARY KEY,service_id uuid NOT NULL,quotation_id uuid NOT NULL,
  amount numeric NOT NULL,invoice_date date NOT NULL,invoice_id uuid
);
INSERT INTO w10f_fixture_invoice_map(label,service_id,quotation_id,amount,invoice_date) VALUES
 ('linked_credit','00000000-0000-4000-8000-00000000f811','00000000-0000-4000-8000-00000000f821',50,CURRENT_DATE-5),
 ('application_target','00000000-0000-4000-8000-00000000f812','00000000-0000-4000-8000-00000000f822',15,CURRENT_DATE-4),
  ('allocation_target','00000000-0000-4000-8000-00000000f81c','00000000-0000-4000-8000-00000000f82b',15,CURRENT_DATE-3),
 ('receipt_target','00000000-0000-4000-8000-00000000f813','00000000-0000-4000-8000-00000000f823',100,CURRENT_DATE-3),
 ('unsupported_invoice','00000000-0000-4000-8000-00000000f814','00000000-0000-4000-8000-00000000f824',20,CURRENT_DATE-2),
 ('covered_invoice','00000000-0000-4000-8000-00000000f815','00000000-0000-4000-8000-00000000f825',5,CURRENT_DATE-2),
 ('future_accounting','00000000-0000-4000-8000-00000000f816','00000000-0000-4000-8000-00000000f826',11,CURRENT_DATE-2),
 ('revenue_correction','00000000-0000-4000-8000-00000000f817','00000000-0000-4000-8000-00000000f827',20,CURRENT_DATE-1),
  ('performance_asset','00000000-0000-4000-8000-00000000f819','00000000-0000-4000-8000-00000000f828',100,CURRENT_DATE),
  ('unsupported_non_sar','00000000-0000-4000-8000-00000000f81a','00000000-0000-4000-8000-00000000f829',25,CURRENT_DATE),
  ('unsupported_vat','00000000-0000-4000-8000-00000000f81b','00000000-0000-4000-8000-00000000f82a',100,CURRENT_DATE);
GRANT SELECT,UPDATE ON w10f_fixture_invoice_map TO service_role;

CREATE FUNCTION pg_temp.w10f_req(p_tag integer) RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog
AS $w10f_req$ SELECT ('00000000-0000-4000-8000-'||lpad(to_hex(p_tag),12,'0'))::uuid $w10f_req$;

CREATE FUNCTION pg_temp.w10f_fixture_post(
  p_source_type text,p_source_id uuid,p_classification text,p_accounting_date date,p_sequence integer
) RETURNS TABLE(event_id uuid,event_version integer,journal_id uuid,posted_version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_fixture_post$
DECLARE
  v_context pg_temp.w10f_fixture_context%ROWTYPE;
  v_saved record; v_retry record; v_conflict record; v_prepared record; v_prepare_retry record;
  v_effect_retry record; v_posted record; v_post_retry record; v_effect_count integer;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10f_fixture_context;
  SELECT * INTO v_saved FROM public.save_accounting_ar_bridge_event(
    v_context.operator_id,p_source_type,p_source_id,0,p_classification,p_accounting_date,
    'synthetic://w10f/'||p_source_type||'/'||p_source_id::text,repeat('d',64),
    'W10F synthetic rollback fixture',pg_temp.w10f_req(61440+p_sequence));
  IF v_saved.error_code IS NOT NULL OR v_saved.status<>'READY' OR v_saved.version<>1 THEN
    RAISE EXCEPTION 'W10F fixture source classification failed for %: % / %',p_source_type,v_saved.error_code,v_saved.status;
  END IF;
  SELECT * INTO v_retry FROM public.save_accounting_ar_bridge_event(
    v_context.operator_id,p_source_type,p_source_id,0,p_classification,p_accounting_date,
    'synthetic://w10f/'||p_source_type||'/'||p_source_id::text,repeat('d',64),
    'W10F synthetic rollback fixture',pg_temp.w10f_req(61440+p_sequence));
  IF v_retry.error_code IS NOT NULL OR v_retry.event_id<>v_saved.event_id OR NOT v_retry.idempotent_replay THEN
    RAISE EXCEPTION 'same request payload was not idempotent';
  END IF;
  SELECT * INTO v_conflict FROM public.save_accounting_ar_bridge_event(
    v_context.operator_id,p_source_type,p_source_id,0,p_classification,p_accounting_date,
    'synthetic://w10f/'||p_source_type||'/'||p_source_id::text,repeat('d',64),
    'changed payload with same request identity',pg_temp.w10f_req(61440+p_sequence));
  IF v_conflict.error_code IS DISTINCT FROM 'request_payload_conflict' THEN
    RAISE EXCEPTION 'same request identity accepted changed payload';
  END IF;

  SELECT * INTO v_prepared FROM public.prepare_accounting_ar_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Prepare W10F synthetic event',
    pg_temp.w10f_req(61696+p_sequence));
  IF v_prepared.error_code IS NOT NULL OR v_prepared.journal_id IS NULL OR v_prepared.status<>'DRAFT' THEN
    RAISE EXCEPTION 'W10F fixture prepare failed for %: %',p_source_type,v_prepared.error_code;
  END IF;
  SELECT * INTO v_prepare_retry FROM public.prepare_accounting_ar_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Prepare W10F synthetic event',
    pg_temp.w10f_req(61696+p_sequence));
  IF v_prepare_retry.error_code IS NOT NULL OR v_prepare_retry.journal_id<>v_prepared.journal_id
     OR NOT v_prepare_retry.idempotent_replay THEN
    RAISE EXCEPTION 'W10F prepare retry was not idempotent';
  END IF;
  SELECT * INTO v_effect_retry FROM public.prepare_accounting_ar_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Retry same W10F economic effect',
    pg_temp.w10f_req(62208+p_sequence));
  IF v_effect_retry.error_code IS NOT NULL OR v_effect_retry.journal_id<>v_prepared.journal_id
     OR NOT v_effect_retry.idempotent_replay THEN
    RAISE EXCEPTION 'duplicate economic effect retry created a second journal';
  END IF;
  SELECT count(*) INTO v_effect_count FROM public.accounting_source_effects se
  WHERE se.profile_id=v_context.profile_id AND se.source_domain='AR_BRIDGE'
    AND se.economic_event_key='W7/'||p_source_type||'/'||p_source_id::text||'/AR_EFFECT';
  IF v_effect_count<>1 THEN RAISE EXCEPTION 'duplicate economic-effect prevention failed'; END IF;

  SELECT * INTO v_posted FROM public.post_accounting_ar_bridge_journal(
    v_context.operator_id,v_prepared.journal_id,v_prepared.version,pg_temp.w10f_req(61952+p_sequence));
  IF v_posted.error_code IS NOT NULL OR v_posted.status<>'POSTED' OR v_posted.version<>2 THEN
    RAISE EXCEPTION 'W10F fixture post failed for %: %',p_source_type,v_posted.error_code;
  END IF;
  SELECT * INTO v_post_retry FROM public.post_accounting_ar_bridge_journal(
    v_context.operator_id,v_prepared.journal_id,v_prepared.version,pg_temp.w10f_req(61952+p_sequence));
  IF v_post_retry.error_code IS NOT NULL OR NOT v_post_retry.idempotent_replay THEN
    RAISE EXCEPTION 'W10F post retry was not idempotent';
  END IF;
  RETURN QUERY SELECT v_saved.event_id,v_saved.version,v_prepared.journal_id,v_posted.version;
END;
$w10f_fixture_post$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_fixture_post(text,uuid,text,date,integer) TO service_role;

CREATE FUNCTION pg_temp.w10f_fixture_hold(
  p_source_type text,p_source_id uuid,p_classification text,p_expected_held_code text,p_sequence integer
) RETURNS TABLE(event_id uuid,event_version integer,held_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_fixture_hold$
DECLARE
  v_context pg_temp.w10f_fixture_context%ROWTYPE; v_saved record; v_prepare record;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10f_fixture_context;
  SELECT * INTO v_saved FROM public.save_accounting_ar_bridge_event(
    v_context.operator_id,p_source_type,p_source_id,0,p_classification,NULL,NULL,NULL,
    'W10F unsupported synthetic treatment',pg_temp.w10f_req(62464+p_sequence));
  IF v_saved.error_code IS NOT NULL OR v_saved.status<>'HELD' THEN
    RAISE EXCEPTION 'unsupported classification was not held';
  END IF;
  SELECT ev.held_code INTO held_code FROM public.accounting_ar_bridge_event_versions ev
  WHERE ev.profile_id=v_context.profile_id AND ev.event_id=v_saved.event_id AND ev.version=v_saved.version;
  IF held_code IS DISTINCT FROM p_expected_held_code THEN
    RAISE EXCEPTION 'W10F held classification code differs: %',held_code;
  END IF;
  SELECT * INTO v_prepare FROM public.prepare_accounting_ar_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Reject held W10F event',pg_temp.w10f_req(62720+p_sequence));
  IF v_prepare.error_code IS DISTINCT FROM 'unsupported_classification'
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_journal_links jl
       WHERE jl.profile_id=v_context.profile_id AND jl.event_id=v_saved.event_id
         AND jl.event_version=v_saved.version)
     OR EXISTS (SELECT 1 FROM public.accounting_journal_versions jv
       WHERE jv.profile_id=v_context.profile_id AND jv.source_domain='AR_BRIDGE'
         AND jv.source_record_key='W7/'||p_source_type||'/'||p_source_id::text
         AND jv.economic_event_key='W7/'||p_source_type||'/'||p_source_id::text||'/AR_EFFECT'
         AND jv.posting_purpose='ar_bridge')
     OR EXISTS (SELECT 1 FROM public.accounting_source_effects se
       WHERE se.profile_id=v_context.profile_id AND se.source_domain='AR_BRIDGE'
         AND se.source_record_key='W7/'||p_source_type||'/'||p_source_id::text
         AND se.economic_event_key='W7/'||p_source_type||'/'||p_source_id::text||'/AR_EFFECT'
         AND se.posting_purpose='ar_bridge') THEN
    RAISE EXCEPTION 'held W10F event created a journal or source effect';
  END IF;
  RETURN QUERY SELECT v_saved.event_id,v_saved.version,held_code;
END;
$w10f_fixture_hold$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_fixture_hold(text,uuid,text,text,integer) TO service_role;

CREATE FUNCTION pg_temp.w10f_fixture_allocation_id(p_payment_id uuid,p_ordinal integer)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_alloc_id$
  SELECT a.id FROM public.customer_receipt_allocations a
  WHERE a.payment_id=p_payment_id ORDER BY a.created_at,a.id OFFSET p_ordinal LIMIT 1
$w10f_alloc_id$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_fixture_allocation_id(uuid,integer) TO service_role;

CREATE FUNCTION pg_temp.w10f_fixture_reversal_id(p_table_name text,p_source_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_reversal_id$
DECLARE v_id uuid;
BEGIN
  CASE p_table_name
    WHEN 'receipt' THEN SELECT r.id INTO v_id FROM public.customer_receipt_reversals r WHERE r.payment_id=p_source_id;
    WHEN 'allocation' THEN SELECT r.id INTO v_id FROM public.customer_receipt_allocation_reversals r WHERE r.allocation_id=p_source_id;
    WHEN 'credit_adjustment' THEN SELECT r.id INTO v_id FROM public.customer_internal_credit_adjustment_reversals r WHERE r.source_credit_adjustment_id=p_source_id;
    WHEN 'credit_application' THEN SELECT r.id INTO v_id FROM public.customer_credit_application_reversals r WHERE r.source_application_id=p_source_id;
    WHEN 'refund' THEN SELECT r.id INTO v_id FROM public.customer_refund_reversals r WHERE r.source_refund_id=p_source_id;
    ELSE RAISE EXCEPTION 'unsupported W10F fixture reversal source';
  END CASE;
  RETURN v_id;
END;
$w10f_reversal_id$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_fixture_reversal_id(text,uuid) TO service_role;

CREATE FUNCTION pg_temp.w10f_fixture_event_line_count(p_source_type text,p_source_id uuid,p_party_role text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_line_count$
  SELECT count(*)::integer FROM public.accounting_ar_bridge_journal_lines l
  JOIN public.accounting_ar_bridge_events e ON e.profile_id=l.profile_id AND e.id=l.event_id
  WHERE e.source_type=p_source_type AND e.source_record_id=p_source_id
    AND l.party_role=p_party_role
$w10f_line_count$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_fixture_event_line_count(text,uuid,text) TO service_role;

CREATE FUNCTION pg_temp.w10f_fixture_snapshot_matches(p_source_type text,p_source_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_snapshot_matches$
  SELECT EXISTS(
    SELECT 1 FROM public.accounting_ar_bridge_events e
    JOIN public.accounting_ar_bridge_event_versions v
      ON v.profile_id=e.profile_id AND v.event_id=e.id AND v.version=e.current_version
    WHERE e.source_type=p_source_type AND e.source_record_id=p_source_id
      AND v.source_snapshot=public.accounting_ar_bridge_source_snapshot(p_source_type,p_source_id)
  )
$w10f_snapshot_matches$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_fixture_snapshot_matches(text,uuid) TO service_role;

DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10f-rollback-%')
     OR EXISTS (SELECT 1 FROM public.customers WHERE customer_number LIKE 'W10F-SYN-%')
     OR EXISTS (SELECT 1 FROM public.services WHERE service_number LIKE 'SVC-2099-81__')
     OR EXISTS (SELECT 1 FROM public.quotations WHERE quotation_number LIKE 'W10F-SYN-Q-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000f800' OR singleton_key='g7')
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_events)
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_event_versions)
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_journal_links)
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_journal_lines)
     OR EXISTS (SELECT 1 FROM public.accounting_source_effects WHERE source_domain='AR_BRIDGE')
     OR EXISTS (SELECT 1 FROM public.accounting_inception_packages)
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events
       WHERE id BETWEEN '00000000-0000-4000-8000-00000000f800' AND '00000000-0000-4000-8000-00000000dfff')
     OR EXISTS (SELECT 1 FROM public.accounting_capability_events
       WHERE id BETWEEN '00000000-0000-4000-8000-00000000f800' AND '00000000-0000-4000-8000-00000000dfff') THEN
    RAISE EXCEPTION 'W10F rollback fixture collision or existing accounting bootstrap; inspect before running';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company_settings WHERE setting_key='default') THEN
    RAISE EXCEPTION 'W10F rollback fixture requires default company settings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
      WHERE capability='accounting:manage_ar_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10D') THEN
    RAISE EXCEPTION 'W10D AR bridge capability was not preserved by the migration';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
      WHERE capability='accounting:manage_revenue_recognition' AND enabled AND runtime_allow_grantable AND owner_slice='W10F') THEN
    RAISE EXCEPTION 'W10F revenue-recognition capability is not enabled by the migration';
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_capability_catalog
      WHERE owner_slice='W10F' AND capability<>'accounting:manage_revenue_recognition') THEN
    RAISE EXCEPTION 'W10F owns an unrelated accounting capability';
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_capability_catalog
      WHERE capability IN ('accounting:reconcile_bank','accounting:close_period','accounting:reopen_period')
        AND (enabled OR runtime_allow_grantable)) THEN
    RAISE EXCEPTION 'W10F enabled a later accounting capability';
  END IF;
END;
$preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
 ('00000000-0000-4000-8000-00000000f801','w10f-rollback-authority','w10f-authority@example.invalid','Synthetic W10F authority','viewer',true),
 ('00000000-0000-4000-8000-00000000f802','w10f-rollback-operator','w10f-operator@example.invalid','Synthetic W10F operator','viewer',true),
 ('00000000-0000-4000-8000-00000000f803','w10f-rollback-admin','w10f-admin@example.invalid','Synthetic CRM Admin','admin',true),
 ('00000000-0000-4000-8000-00000000f804','w10f-rollback-reviewer','w10f-reviewer@example.invalid','Synthetic W10F reviewer','viewer',true);

INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT '00000000-0000-4000-8000-00000000f800','g7',s.id,0
FROM public.company_settings s WHERE s.setting_key='default';
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES('00000000-0000-4000-8000-00000000f840','00000000-0000-4000-8000-00000000f800',
  'accounting_profile_updated','accounting_profile','00000000-0000-4000-8000-00000000f800',1,
  '00000000-0000-4000-8000-00000000f801','00000000-0000-4000-8000-00000000f841',
  'Synthetic W10F rollback profile',NULL,repeat('a',64),
  'accounting_profiles/00000000-0000-4000-8000-00000000f800/1',transaction_timestamp());
INSERT INTO public.accounting_profile_versions(
  profile_id,version,previous_version,framework_key,framework_edition,policy_version,
  endorsement_context,professional_validation_state,professional_validation_evidence_ref,
  functional_currency,fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,
  fiscal_timezone,accounting_start_date,cutover_boundary_date,legal_fiscal_evidence_pending,
  legal_fiscal_evidence_ref,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
  reason,evidence_ref,created_by,created_at,foundation_event_id
) VALUES('00000000-0000-4000-8000-00000000f800',1,NULL,'SA_IFRS_FOR_SMES',2025,'W10 provisional policy',
  'Synthetic W10F rollback fixture','DEFERRED',NULL,'SAR',1,1,12,31,'Asia/Riyadh',
  '2000-01-01','2000-12-31',true,NULL,'not_registered','INACTIVE','INACTIVE','DEV_PROVISIONAL',
  transaction_timestamp(),'Synthetic W10F profile',NULL,'00000000-0000-4000-8000-00000000f801',
  transaction_timestamp(),'00000000-0000-4000-8000-00000000f840');
UPDATE public.accounting_profiles SET current_version=1 WHERE id='00000000-0000-4000-8000-00000000f800';

INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES('00000000-0000-4000-8000-00000000f842','00000000-0000-4000-8000-00000000f800',
  'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000f844',1,
  '00000000-0000-4000-8000-00000000f801','00000000-0000-4000-8000-00000000f843',
  'Synthetic W10F authority bootstrap',NULL,repeat('b',64),'accounting:manage_authority',transaction_timestamp());
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,
  reason,evidence_ref,request_id,payload_fingerprint,foundation_event_id,created_at
) VALUES('00000000-0000-4000-8000-00000000f844','00000000-0000-4000-8000-00000000f800',
  '00000000-0000-4000-8000-00000000f801','accounting:manage_authority',1,'ALLOW',NULL,
  '00000000-0000-4000-8000-00000000f801','Synthetic authority bootstrap',NULL,
  '00000000-0000-4000-8000-00000000f843',repeat('b',64),
  '00000000-0000-4000-8000-00000000f842',transaction_timestamp());

INSERT INTO public.customers(id,customer_number,company,contact,email,phone,city,status,created_by)
VALUES('00000000-0000-4000-8000-00000000f810','W10F-SYN-CUSTOMER','W10F Synthetic Customer',
  'Fixture Contact','w10f-customer@example.invalid','+966500000810','Riyadh','active','w10f-rollback-operator'),
 ('00000000-0000-4000-8000-00000000f818','W10F-SYN-REVENUE-CUSTOMER','W10F Synthetic Revenue Correction',
  'Fixture Contact','w10f-revenue@example.invalid','+966500000818','Riyadh','active','w10f-rollback-operator');
INSERT INTO public.services(id,service_number,customer_id,service_title,status) VALUES
 ('00000000-0000-4000-8000-00000000f811','SVC-2099-8101','00000000-0000-4000-8000-00000000f810','W10F linked payment and credit','Inquiry'),
 ('00000000-0000-4000-8000-00000000f812','SVC-2099-8102','00000000-0000-4000-8000-00000000f810','W10F credit application target','Inquiry'),
 ('00000000-0000-4000-8000-00000000f813','SVC-2099-8103','00000000-0000-4000-8000-00000000f810','W10F receipt allocation target','Inquiry'),
 ('00000000-0000-4000-8000-00000000f814','SVC-2099-8104','00000000-0000-4000-8000-00000000f810','W10F unsupported invoice','Inquiry'),
 ('00000000-0000-4000-8000-00000000f815','SVC-2099-8105','00000000-0000-4000-8000-00000000f810','W10F inception covered invoice','Inquiry'),
 ('00000000-0000-4000-8000-00000000f816','SVC-2099-8106','00000000-0000-4000-8000-00000000f810','W10F future accounting date','Inquiry'),
 ('00000000-0000-4000-8000-00000000f817','SVC-2099-8107','00000000-0000-4000-8000-00000000f818','W10F unsupported credit correction','Inquiry'),
  ('00000000-0000-4000-8000-00000000f819','SVC-2099-8108','00000000-0000-4000-8000-00000000f810','W10F performance before invoice','Inquiry'),
  ('00000000-0000-4000-8000-00000000f81a','SVC-2099-8109','00000000-0000-4000-8000-00000000f810','W10F unsupported non-SAR authority','Inquiry'),
  ('00000000-0000-4000-8000-00000000f81b','SVC-2099-8110','00000000-0000-4000-8000-00000000f810','W10F unsupported VAT authority','Inquiry');
INSERT INTO public.services(id,service_number,customer_id,service_title,status) VALUES
  ('00000000-0000-4000-8000-00000000f81c','SVC-2099-8111','00000000-0000-4000-8000-00000000f810','W10F allocation modification authority','Inquiry');
INSERT INTO public.quotations(
  id,quotation_number,customer_id,event,date,valid_until,subtotal,discount,vat_amount,grand_total,
  status,vat_rate,service_id,snapshot_seller,snapshot_buyer
)
SELECT q.quotation_id,q.quotation_number,s.customer_id,'W10F synthetic accounting fixture',CURRENT_DATE,
  CURRENT_DATE+30,q.amount,0,0,q.amount,'draft',0,s.id,
  jsonb_build_object('currency','SAR','fixture',true),jsonb_build_object('customer_id',s.customer_id,'fixture',true)
FROM (VALUES
 ('00000000-0000-4000-8000-00000000f821'::uuid,'W10F-SYN-Q-LINKED', '00000000-0000-4000-8000-00000000f811'::uuid,50::numeric),
 ('00000000-0000-4000-8000-00000000f822'::uuid,'W10F-SYN-Q-APPLICATION','00000000-0000-4000-8000-00000000f812'::uuid,15::numeric),
 ('00000000-0000-4000-8000-00000000f823'::uuid,'W10F-SYN-Q-RECEIPT','00000000-0000-4000-8000-00000000f813'::uuid,100::numeric),
 ('00000000-0000-4000-8000-00000000f824'::uuid,'W10F-SYN-Q-UNSUPPORTED','00000000-0000-4000-8000-00000000f814'::uuid,20::numeric),
 ('00000000-0000-4000-8000-00000000f825'::uuid,'W10F-SYN-Q-COVERED','00000000-0000-4000-8000-00000000f815'::uuid,5::numeric),
 ('00000000-0000-4000-8000-00000000f826'::uuid,'W10F-SYN-Q-FUTURE','00000000-0000-4000-8000-00000000f816'::uuid,11::numeric),
 ('00000000-0000-4000-8000-00000000f827'::uuid,'W10F-SYN-Q-REVENUE','00000000-0000-4000-8000-00000000f817'::uuid,20::numeric),
  ('00000000-0000-4000-8000-00000000f828'::uuid,'W10F-SYN-Q-PERFORMANCE-ASSET','00000000-0000-4000-8000-00000000f819'::uuid,100::numeric),
  ('00000000-0000-4000-8000-00000000f829'::uuid,'W10F-SYN-Q-NON-SAR','00000000-0000-4000-8000-00000000f81a'::uuid,25::numeric),
  ('00000000-0000-4000-8000-00000000f82a'::uuid,'W10F-SYN-Q-VAT','00000000-0000-4000-8000-00000000f81b'::uuid,100::numeric),
  ('00000000-0000-4000-8000-00000000f82b'::uuid,'W10F-SYN-Q-ALLOCATION','00000000-0000-4000-8000-00000000f81c'::uuid,15::numeric)
) AS q(quotation_id,quotation_number,service_id,amount)
JOIN public.services s ON s.id=q.service_id;
UPDATE public.quotations SET discount=10,grand_total=90 WHERE id='00000000-0000-4000-8000-00000000f828';
INSERT INTO public.quotation_items(
  id,quotation_id,description,category,qty,unit_price,vat,total,commercial_role,is_selected,unit
)
SELECT i.item_id,i.quotation_id,'W10F synthetic service','other',1,i.amount,0,i.amount,'authority_line',true,'service'
FROM (VALUES
 ('00000000-0000-4000-8000-00000000f831'::uuid,'00000000-0000-4000-8000-00000000f821'::uuid,50::numeric),
 ('00000000-0000-4000-8000-00000000f832'::uuid,'00000000-0000-4000-8000-00000000f822'::uuid,15::numeric),
 ('00000000-0000-4000-8000-00000000f833'::uuid,'00000000-0000-4000-8000-00000000f823'::uuid,100::numeric),
 ('00000000-0000-4000-8000-00000000f834'::uuid,'00000000-0000-4000-8000-00000000f824'::uuid,20::numeric),
 ('00000000-0000-4000-8000-00000000f835'::uuid,'00000000-0000-4000-8000-00000000f825'::uuid,5::numeric),
 ('00000000-0000-4000-8000-00000000f836'::uuid,'00000000-0000-4000-8000-00000000f826'::uuid,11::numeric),
 ('00000000-0000-4000-8000-00000000f837'::uuid,'00000000-0000-4000-8000-00000000f827'::uuid,20::numeric),
  ('00000000-0000-4000-8000-00000000f838'::uuid,'00000000-0000-4000-8000-00000000f828'::uuid,100::numeric),
  ('00000000-0000-4000-8000-00000000f839'::uuid,'00000000-0000-4000-8000-00000000f829'::uuid,25::numeric),
  ('00000000-0000-4000-8000-00000000f83a'::uuid,'00000000-0000-4000-8000-00000000f82a'::uuid,100::numeric),
  ('00000000-0000-4000-8000-00000000f83b'::uuid,'00000000-0000-4000-8000-00000000f82b'::uuid,15::numeric)
) AS i(item_id,quotation_id,amount);
UPDATE public.quotations SET snapshot_seller=jsonb_set(snapshot_seller,'{currency}','"USD"'::jsonb)
WHERE id='00000000-0000-4000-8000-00000000f829';
UPDATE public.quotations SET vat_rate=15,vat_amount=15,grand_total=115
WHERE id='00000000-0000-4000-8000-00000000f82a';
UPDATE public.quotation_items SET vat=15
WHERE id='00000000-0000-4000-8000-00000000f83a';

SET LOCAL ROLE service_role;

DO $setup_accounting$
DECLARE
  v_context pg_temp.w10f_fixture_context%ROWTYPE; v_result record; v_account jsonb;
  v_spec record; v_period jsonb; v_rule jsonb; v_mappings jsonb; v_id uuid;
  v_request integer:=0; v_grant record;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10f_fixture_context;
  IF public.get_accounting_capability(v_context.admin_id,'accounting:manage_ar_bridge') IS NOT FALSE
     OR public.get_accounting_capability(v_context.admin_id,'accounting:prepare_journal') IS NOT FALSE THEN
    RAISE EXCEPTION 'CRM Admin wildcard leaked into W10F accounting authority';
  END IF;
  FOR v_grant IN SELECT * FROM (VALUES
    ('accounting:manage_chart'),('accounting:manage_periods'),('accounting:manage_ar_bridge'),
    ('accounting:manage_inception'),('accounting:view'),('accounting:prepare_journal'),('accounting:manage_revenue_recognition')
  ) AS g(capability) LOOP
    v_request:=v_request+1;
    SELECT * INTO v_result FROM public.set_accounting_capability(
      v_context.authority_id,v_context.operator_id,v_grant.capability,'ALLOW',NULL,0,
      'Synthetic W10F fixture capability',NULL,pg_temp.w10f_req(63488+v_request));
    IF v_result.error_code IS NOT NULL THEN
      RAISE EXCEPTION 'W10F capability grant failed for %: %',v_grant.capability,v_result.error_code;
    END IF;
  END LOOP;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    v_context.authority_id,v_context.admin_id,'accounting:manage_ar_bridge','ALLOW',NULL,0,
    'Synthetic CRM Admin ALLOW probe',NULL,pg_temp.w10f_req(63512));
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'Admin explicit ALLOW probe failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    v_context.authority_id,v_context.admin_id,'accounting:manage_ar_bridge','DENY',NULL,1,
    'Synthetic CRM Admin DENY probe',NULL,pg_temp.w10f_req(63513));
  IF v_result.error_code IS NOT NULL
     OR public.get_accounting_capability(v_context.admin_id,'accounting:manage_ar_bridge') IS NOT FALSE THEN
    RAISE EXCEPTION 'explicit W10F DENY did not override ALLOW';
  END IF;

  FOR v_spec IN SELECT * FROM (VALUES
    ('AR_CONTROL','W10F-SYN-AR','Synthetic AR control','حساب ذمم اصطناعي','ASSET','DEBIT',true,'ACCOUNTS_RECEIVABLE'),
    ('CUSTOMER_ADVANCE','W10F-SYN-ADVANCE','Synthetic customer advance','دفعات عميل اصطناعية','LIABILITY','CREDIT',true,'CUSTOMER_ADVANCE'),
    ('CONTRACT_LIABILITY','W10F-SYN-CONTRACT-LIABILITY','Synthetic contract liability','التزام عقد اصطناعي','LIABILITY','CREDIT',true,'CONTRACT_LIABILITY'),
    ('CASH_ACCOUNT','W10F-SYN-CASH','Synthetic cash account','حساب نقد اصطناعي','ASSET','DEBIT',true,'CASH_ACCOUNTABILITY'),
    ('CONTRACT_ASSET','W10F-SYN-CONTRACT-ASSET','Synthetic contract asset','أصل عقد اصطناعي','ASSET','DEBIT',true,'CONTRACT_ASSET'),
    ('REVENUE','W10F-SYN-REVENUE','Synthetic revenue','إيراد اصطناعي','REVENUE','CREDIT',false,'NONE')
  ) AS a(mapping_key,account_code,name_en,name_ar,account_type,normal_balance,is_protected,control_classification) LOOP
    v_account:=jsonb_build_object('account_code',v_spec.account_code,'name_en',v_spec.name_en,
      'name_ar',v_spec.name_ar,'account_type',v_spec.account_type,'category','synthetic',
      'normal_balance',v_spec.normal_balance,'account_kind','POSTING','parent_account_id',NULL,
      'is_active',true,'is_protected',v_spec.is_protected,'control_classification',v_spec.control_classification);
    SELECT * INTO v_result FROM public.save_accounting_account(
      v_context.operator_id,NULL,0,v_account,'Create synthetic W10F bridge account',NULL,
      pg_temp.w10f_req(63744+v_request));
    v_request:=v_request+1;
    IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN
      RAISE EXCEPTION 'W10F account creation failed for %: %',v_spec.mapping_key,v_result.error_code;
    END IF;
    INSERT INTO pg_temp.w10f_fixture_accounts(mapping_key,account_id) VALUES(v_spec.mapping_key,v_result.account_id);
  END LOOP;

  v_period:=jsonb_build_object('start_date','2026-01-01','end_date','2026-12-31','status','OPEN');
  SELECT * INTO v_result FROM public.save_accounting_period(
    v_context.operator_id,NULL,0,v_period,'Create W10F synthetic OPEN period',NULL,pg_temp.w10f_req(63808));
  IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN
    RAISE EXCEPTION 'W10F OPEN period creation failed: %',v_result.error_code;
  END IF;
  UPDATE pg_temp.w10f_fixture_context SET period_id=v_result.period_id,period_version=v_result.version;

  SELECT jsonb_agg(jsonb_build_object(
    'mapping_key',lower(a.mapping_key),'account_id',a.account_id,'account_version',1,
    'allowed_side','EITHER','service_requirement','OPTIONAL') ORDER BY a.mapping_key)
  INTO v_mappings FROM pg_temp.w10f_fixture_accounts a;
  v_rule:=jsonb_build_object('rule_code','W10F_SYN_AR_BRIDGE','name_en','Synthetic W10F AR bridge',
    'name_ar','قاعدة جسر الذمم الاصطناعية','is_active',true,'mappings',v_mappings);
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    v_context.operator_id,NULL,0,v_rule,'Create W10F synthetic posting rule',NULL,pg_temp.w10f_req(63809));
  IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN
    RAISE EXCEPTION 'W10F posting rule creation failed: %',v_result.error_code;
  END IF;
  UPDATE pg_temp.w10f_fixture_context SET rule_id=v_result.posting_rule_id,rule_version=v_result.version;
END;
$setup_accounting$;

DO $source_invoice_setup$
DECLARE
  v_context pg_temp.w10f_fixture_context%ROWTYPE; v_spec record; v_result record; v_invoice_id uuid;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10f_fixture_context;
  FOR v_spec IN SELECT * FROM pg_temp.w10f_fixture_invoice_map WHERE label<>'performance_asset' ORDER BY label LOOP
    SELECT * INTO v_result FROM public.approve_quotation_and_activate_internal_abs(
      v_spec.quotation_id,'w10f-rollback-operator','admin');
    IF v_result.error_code IS NOT NULL OR NOT v_result.quotation_approved
       OR v_result.approved_billing_scope_id IS NULL THEN
      RAISE EXCEPTION 'W10F synthetic quotation approval failed for %: %',v_spec.label,v_result.error_code;
    END IF;
    IF v_spec.label IN ('unsupported_non_sar','unsupported_vat') THEN
      CONTINUE;
    END IF;
    SELECT * INTO v_result FROM public.create_invoice_atomic(
      v_spec.service_id,v_spec.quotation_id,'final',NULL,'w10f-rollback-operator','W10F synthetic invoice',
      'not_registered',jsonb_build_object('currency','SAR','fixture',true),
      jsonb_build_object('customer_id',v_context.customer_id,'fixture',true),
      jsonb_build_object('quotation_id',v_spec.quotation_id,'fixture',true),'{}'::jsonb,'{}'::jsonb,
      'w10f-fixture-'||v_spec.label,v_spec.invoice_date,v_spec.invoice_date+30);
    IF v_result.error_code IS NOT NULL OR v_result.invoice_id IS NULL THEN
      RAISE EXCEPTION 'W10F synthetic invoice create failed for %: %',v_spec.label,v_result.error_code;
    END IF;
    v_invoice_id:=v_result.invoice_id;
    SELECT * INTO v_result FROM public.issue_invoice_atomic(v_invoice_id,'w10f-rollback-operator');
    IF v_result.error_code IS NOT NULL OR v_result.invoice_id IS DISTINCT FROM v_invoice_id THEN
      RAISE EXCEPTION 'W10F synthetic invoice issue failed for %: %',v_spec.label,v_result.error_code;
    END IF;
    UPDATE pg_temp.w10f_fixture_invoice_map SET invoice_id=v_invoice_id WHERE label=v_spec.label;
  END LOOP;
END;
$source_invoice_setup$;

RESET ROLE;

CREATE FUNCTION pg_temp.w10f_scope_item(p_service_id uuid)
RETURNS TABLE(scope_id uuid,item_id uuid,net_halalah bigint,discount_halalah bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_scope_item$
  SELECT s.id,i.id,round((i.accepted_subtotal-i.source_discount_allocated)*100,0)::bigint,
    round(i.source_discount_allocated*100,0)::bigint
  FROM public.approved_billing_scopes s JOIN public.approved_billing_scope_items i ON i.approved_billing_scope_id=s.id
  WHERE s.service_id=p_service_id AND s.status='approved' AND s.superseded_at IS NULL AND s.voided_at IS NULL
    AND i.decision IN ('accepted','adjusted')
    AND i.source_commercial_role='authority_line' AND i.source_is_selected IS TRUE
  ORDER BY i.id LIMIT 1
$w10f_scope_item$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_scope_item(uuid) TO service_role;

CREATE FUNCTION pg_temp.w10f_fixture_amendment(
  p_source_quote_id uuid,p_new_authority_unit_price numeric,p_discount numeric,p_tag integer
) RETURNS TABLE(successor_quotation_id uuid,successor_scope_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_fixture_amendment$
DECLARE created record; updated record; approved record; quotation_payload jsonb; line_payload jsonb; draft_updated_at timestamptz;
BEGIN
  SELECT * INTO created FROM public.create_approved_commercial_amendment(
    p_source_quote_id,'W10F synthetic commercial modification','w10f-fixture-create-'||p_tag::text,
    'w10f-rollback-admin','admin');
  IF created.error_code IS NOT NULL OR created.successor_quotation_id IS NULL THEN
    RAISE EXCEPTION 'W10F synthetic amendment creation failed: %',created.error_code;
  END IF;
  successor_quotation_id:=created.successor_quotation_id;
  SELECT q.updated_at,jsonb_build_object('event',q.event,'date',q.date,'valid_until',q.valid_until,'discount',p_discount),
    jsonb_agg(jsonb_build_object('line_key',qi.id::text,'parent_line_key',parent.id::text,
      'commercial_role',qi.commercial_role,'description',qi.description,'description_ar',qi.description_ar,
      'details',qi.details,'category',qi.category,'qty',qi.qty::text,'unit',qi.unit,
      'unit_price',CASE WHEN qi.commercial_role='authority_line' THEN p_new_authority_unit_price::text ELSE qi.unit_price::text END,
      'is_selected',qi.is_selected) ORDER BY qi.created_at,qi.id)
  INTO draft_updated_at,quotation_payload,line_payload
  FROM public.quotations q JOIN public.quotation_items qi ON qi.quotation_id=q.id
  LEFT JOIN public.quotation_items parent ON parent.id=qi.parent_authority_line_id
  WHERE q.id=successor_quotation_id
  GROUP BY q.updated_at,q.event,q.date,q.valid_until;
  SELECT * INTO updated FROM public.update_approved_commercial_amendment_draft(
    successor_quotation_id,quotation_payload,line_payload,draft_updated_at,'w10f-rollback-admin');
  IF updated.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10F synthetic amendment update failed: %',updated.error_code;END IF;
  SELECT * INTO approved FROM public.approve_approved_commercial_amendment(
    p_source_quote_id,successor_quotation_id,'w10f-fixture-approve-'||p_tag::text,
    'w10f-rollback-admin','admin');
  IF approved.error_code IS NOT NULL OR approved.successor_scope_id IS NULL
     OR approved.quotation_status IS DISTINCT FROM 'approved' OR approved.abs_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'W10F synthetic amendment approval failed: %',approved.error_code;
  END IF;
  successor_scope_id:=approved.successor_scope_id;
  RETURN NEXT;
END;
$w10f_fixture_amendment$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_fixture_amendment(uuid,numeric,numeric,integer) TO service_role;

CREATE FUNCTION pg_temp.w10f_unit_id(p_arrangement_id uuid,p_unit_key text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_unit_id$
  SELECT u.id FROM public.accounting_revenue_performance_units u
  WHERE u.arrangement_id=p_arrangement_id AND u.unit_key=p_unit_key
$w10f_unit_id$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_unit_id(uuid,text) TO service_role;

CREATE FUNCTION pg_temp.w10f_fixture_recognize(p_unit_id uuid,p_evidence_key text,p_basis text,p_amount text,p_tag integer)
RETURNS TABLE(event_id uuid,evidence_id uuid,journal_id uuid,signed_delta_halalah bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_fixture_recognize$
DECLARE c pg_temp.w10f_fixture_context%ROWTYPE; saved record; retry record; conflict record;
  reviewed record; prepared record; prepared_retry record; posted record; posted_retry record; v_event uuid; v_delta bigint;
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10f_fixture_context;
  SELECT * INTO saved FROM public.save_accounting_revenue_performance_evidence(
    c.operator_id,p_unit_id,p_evidence_key,0,p_basis,CURRENT_DATE-2,CURRENT_DATE,
    'synthetic://w10f/performance/'||p_evidence_key,repeat('a',64),p_amount,NULL,NULL,
    'Synthetic W10F performance evidence',pg_temp.w10f_req(62976+p_tag));
  IF saved.error_code IS NOT NULL OR saved.status<>'SUBMITTED' OR saved.version<>1 THEN
    RAISE EXCEPTION 'W10F evidence save failed for %: % / %',p_evidence_key,saved.error_code,saved.status;
  END IF;
  SELECT * INTO retry FROM public.save_accounting_revenue_performance_evidence(
    c.operator_id,p_unit_id,p_evidence_key,0,p_basis,CURRENT_DATE-2,CURRENT_DATE,
    'synthetic://w10f/performance/'||p_evidence_key,repeat('a',64),p_amount,NULL,NULL,
    'Synthetic W10F performance evidence',pg_temp.w10f_req(62976+p_tag));
  IF retry.error_code IS NOT NULL OR retry.evidence_id<>saved.evidence_id OR NOT retry.idempotent_replay THEN
    RAISE EXCEPTION 'W10F evidence retry was not idempotent';
  END IF;
  SELECT * INTO conflict FROM public.save_accounting_revenue_performance_evidence(
    c.operator_id,p_unit_id,p_evidence_key,0,p_basis,CURRENT_DATE-2,CURRENT_DATE,
    'synthetic://w10f/performance/'||p_evidence_key,repeat('a',64),p_amount,NULL,NULL,
    'Changed W10F evidence payload',pg_temp.w10f_req(62976+p_tag));
  IF conflict.error_code IS DISTINCT FROM 'request_payload_conflict' THEN
    RAISE EXCEPTION 'W10F request identity accepted changed payload';
  END IF;
  SELECT * INTO reviewed FROM public.review_accounting_revenue_performance_evidence(
    c.reviewer_id,saved.evidence_id,saved.version,true,'Independent synthetic evidence review',pg_temp.w10f_req(63040+p_tag));
  IF reviewed.error_code IS NOT NULL OR reviewed.decision<>'APPROVED' THEN
    RAISE EXCEPTION 'W10F evidence review failed: % / %',reviewed.error_code,reviewed.decision;
  END IF;
  SELECT * INTO prepared FROM public.prepare_accounting_revenue_recognition(
    c.operator_id,saved.evidence_id,saved.version,c.period_id,c.period_version,c.rule_id,c.rule_version,CURRENT_DATE,
    'Prepare W10F synthetic recognition',pg_temp.w10f_req(63104+p_tag));
  IF prepared.error_code IS NOT NULL OR prepared.journal_id IS NULL OR prepared.status<>'DRAFT' THEN
    RAISE EXCEPTION 'W10F recognition prepare failed: %',prepared.error_code;
  END IF;
  SELECT * INTO prepared_retry FROM public.prepare_accounting_revenue_recognition(
    c.operator_id,saved.evidence_id,saved.version,c.period_id,c.period_version,c.rule_id,c.rule_version,CURRENT_DATE,
    'Prepare W10F synthetic recognition',pg_temp.w10f_req(63104+p_tag));
  IF prepared_retry.error_code IS NOT NULL OR prepared_retry.journal_id<>prepared.journal_id OR NOT prepared_retry.idempotent_replay THEN
    RAISE EXCEPTION 'W10F recognition prepare retry was not idempotent';
  END IF;
  SELECT * INTO posted FROM public.post_accounting_revenue_recognition_journal(
    c.operator_id,prepared.journal_id,prepared.version,pg_temp.w10f_req(63168+p_tag));
  IF posted.error_code IS NOT NULL OR posted.status<>'POSTED' THEN RAISE EXCEPTION 'W10F post failed: %',posted.error_code;END IF;
  SELECT * INTO posted_retry FROM public.post_accounting_revenue_recognition_journal(
    c.operator_id,prepared.journal_id,prepared.version,pg_temp.w10f_req(63168+p_tag));
  IF posted_retry.error_code IS NOT NULL OR NOT posted_retry.idempotent_replay THEN
    RAISE EXCEPTION 'W10F post retry was not idempotent';
  END IF;
  SELECT id,signed_delta_halalah INTO v_event,v_delta FROM public.accounting_revenue_recognition_events
    WHERE profile_id=c.profile_id AND evidence_id=saved.evidence_id AND evidence_version=saved.version;
  RETURN QUERY SELECT v_event,saved.evidence_id,prepared.journal_id,v_delta;
END;
$w10f_fixture_recognize$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_fixture_recognize(uuid,text,text,text,integer) TO service_role;

CREATE FUNCTION pg_temp.w10f_fixture_correct(p_unit_id uuid,p_original_event_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10f_fixture_correct$
DECLARE c pg_temp.w10f_fixture_context%ROWTYPE; saved record; reviewed record; prepared record; posted record; v_event uuid;
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10f_fixture_context;
  SELECT * INTO saved FROM public.save_accounting_revenue_performance_evidence(
    c.operator_id,p_unit_id,'correction-1',0,'CUSTOMER_ACCEPTANCE',CURRENT_DATE-2,CURRENT_DATE,
    'synthetic://w10f/correction/'||p_original_event_id::text,repeat('b',64),NULL,p_original_event_id,'1000',
    'Explicit synthetic Revenue correction',pg_temp.w10f_req(63200));
  IF saved.error_code IS NOT NULL OR saved.status<>'SUBMITTED' THEN RAISE EXCEPTION 'W10F correction evidence save failed: %',saved.error_code;END IF;
  SELECT * INTO reviewed FROM public.review_accounting_revenue_performance_evidence(
    c.reviewer_id,saved.evidence_id,saved.version,true,'Independent synthetic correction review',pg_temp.w10f_req(63201));
  IF reviewed.error_code IS NOT NULL OR reviewed.decision<>'APPROVED' THEN RAISE EXCEPTION 'W10F correction review failed';END IF;
  SELECT * INTO prepared FROM public.prepare_accounting_revenue_recognition(
    c.operator_id,saved.evidence_id,saved.version,c.period_id,c.period_version,c.rule_id,c.rule_version,CURRENT_DATE,
    'Prepare W10F synthetic correction',pg_temp.w10f_req(63202));
  IF prepared.error_code IS NOT NULL OR prepared.journal_id IS NULL THEN RAISE EXCEPTION 'W10F correction prepare failed: %',prepared.error_code;END IF;
  SELECT * INTO posted FROM public.post_accounting_revenue_recognition_journal(
    c.operator_id,prepared.journal_id,prepared.version,pg_temp.w10f_req(63203));
  IF posted.error_code IS NOT NULL OR posted.status<>'POSTED' THEN RAISE EXCEPTION 'W10F correction post failed: %',posted.error_code;END IF;
  SELECT id INTO v_event FROM public.accounting_revenue_recognition_events
    WHERE profile_id=c.profile_id AND evidence_id=saved.evidence_id AND evidence_version=saved.version;
  RETURN v_event;
END;
$w10f_fixture_correct$;
GRANT EXECUTE ON FUNCTION pg_temp.w10f_fixture_correct(uuid,uuid) TO service_role;

SET LOCAL ROLE service_role;

DO $w10f_capability_setup$
DECLARE c pg_temp.w10f_fixture_context%ROWTYPE; r record;
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10f_fixture_context;
  SELECT * INTO r FROM public.set_accounting_capability(c.authority_id,c.reviewer_id,
    'accounting:manage_revenue_recognition','ALLOW',NULL,0,'Synthetic W10F reviewer grant',NULL,pg_temp.w10f_req(63744));
  IF r.error_code IS NOT NULL OR public.get_accounting_capability(c.reviewer_id,'accounting:manage_revenue_recognition') IS NOT TRUE THEN
    RAISE EXCEPTION 'W10F reviewer capability setup failed: %',r.error_code;
  END IF;
END;
$w10f_capability_setup$;

DO $w10f_regression$
DECLARE c pg_temp.w10f_fixture_context%ROWTYPE; r record; review_result record; bridge record; invoice_result record; tb record;
  scope_id uuid; asset_scope uuid; asset_original_scope uuid; asset_positive_scope uuid; asset_reduction_scope uuid;
  agent_scope uuid; invoice_first uuid; asset_invoice uuid; asset_service uuid; asset_quote uuid;
  asset_original_quote uuid; asset_positive_quote uuid; application_scope uuid; application_successor_scope uuid;
  application_quote uuid; application_successor_quote uuid; allocation_scope uuid; allocation_successor_scope uuid;
  allocation_quote uuid; allocation_successor_quote uuid; non_sar_scope uuid; vat_scope uuid; covered_scope uuid;
  item record; agent_item record; units jsonb; arrangement_id uuid; unit_pit uuid; unit_ot uuid;
  asset_positive_arrangement uuid; application_arrangement uuid; allocation_arrangement uuid;
  covered_arrangement uuid; covered_unit uuid;
  event_one record; event_two record; event_three record; correction_event uuid; before_cutoff timestamptz;
  before_report jsonb; historical_report jsonb; current_report jsonb; date_report jsonb; event_row jsonb;
  coverage_payload jsonb; coverage_result record; readiness jsonb; service_result record; credit_result record;
  evidence_result record; prepared_result record; mod_units jsonb; mod_result record; successor record;
BEGIN
  SELECT * INTO STRICT c FROM pg_temp.w10f_fixture_context;
  IF public.get_accounting_capability(c.admin_id,'accounting:manage_revenue_recognition') IS NOT FALSE THEN
    RAISE EXCEPTION 'CRM Admin wildcard leaked into W10F accounting authority';
  END IF;
  FOR r IN SELECT unnest(ARRAY[
    'accounting_revenue_arrangements','accounting_revenue_arrangement_versions','accounting_revenue_arrangement_reviews',
    'accounting_revenue_performance_units','accounting_revenue_performance_unit_versions','accounting_revenue_performance_evidence',
    'accounting_revenue_performance_evidence_versions','accounting_revenue_performance_evidence_reviews',
    'accounting_revenue_recognition_events','accounting_revenue_recognition_journal_links','accounting_revenue_recognition_journal_lines'
  ]) AS table_name LOOP
    IF NOT (SELECT x.relrowsecurity AND x.relforcerowsecurity FROM pg_catalog.pg_class x WHERE x.oid=('public.'||r.table_name)::regclass)
       OR has_table_privilege('service_role','public.'||r.table_name,'SELECT')
       OR has_table_privilege('service_role','public.'||r.table_name,'INSERT') THEN
      RAISE EXCEPTION 'W10F table is not forced-RLS and RPC-only: %',r.table_name;
    END IF;
  END LOOP;

  before_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,clock_timestamp(),500);
  IF before_report->>'revenue_posted_halalah'<>'0' OR before_report->>'recognition_event_count'<>'0' THEN
    RAISE EXCEPTION 'W10F fixture expected no Revenue before its synthetic performance controls';
  END IF;
  UPDATE public.services SET status='In Progress' WHERE id='00000000-0000-4000-8000-00000000f813';
  SELECT * INTO service_result FROM public.complete_service(
    '00000000-0000-4000-8000-00000000f813','w10f-rollback-admin','admin');
  IF service_result.error_code IS NOT NULL OR service_result.service_status IS DISTINCT FROM 'Completed' THEN
    RAISE EXCEPTION 'W10F Service completion control failed: %',service_result.error_code;
  END IF;
  current_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,clock_timestamp(),500);
  IF current_report->>'revenue_posted_halalah'<>'0' OR current_report->>'recognition_event_count'<>'0' THEN
    RAISE EXCEPTION 'Service completion alone created Revenue';
  END IF;

  UPDATE public.services SET status='In Progress' WHERE id='00000000-0000-4000-8000-00000000f814';
  SELECT * INTO service_result FROM public.complete_service(
    '00000000-0000-4000-8000-00000000f814','w10f-rollback-admin','admin');
  IF service_result.error_code IS NOT NULL OR service_result.service_status IS DISTINCT FROM 'Completed' THEN
    RAISE EXCEPTION 'W10F Event Cost Close service completion setup failed: %',service_result.error_code;
  END IF;
  INSERT INTO public.service_lifecycle_states(
    service_id,legacy_status,commercial_state,payment_state,readiness_state,execution_state,completion_state,close_state
  ) VALUES('00000000-0000-4000-8000-00000000f814','Completed','approved','unassessed','not_applicable','ended','confirmed','closed')
  ON CONFLICT(service_id) DO UPDATE SET legacy_status='Completed',commercial_state='approved',payment_state='unassessed',
    readiness_state='not_applicable',execution_state='ended',completion_state='confirmed',close_state='closed',updated_at=clock_timestamp();
  INSERT INTO public.event_cost_budgets(
    service_id,budget_version,base_budget_amount,contingency_amount,reason,approved_by,approved_at,request_id
  ) VALUES('00000000-0000-4000-8000-00000000f814',1,0,0,'W10F synthetic Event Cost Close budget',
    'w10f-rollback-admin',clock_timestamp(),pg_temp.w10f_req(64201));
  INSERT INTO public.event_cost_etc_forecasts(
    service_id,forecast_version,etc_amount,forecast_date,reason,recorded_by,recorded_at,request_id
  ) VALUES('00000000-0000-4000-8000-00000000f814',1,0,CURRENT_DATE,'W10F synthetic Event Cost Close ETC',
    'w10f-rollback-admin',clock_timestamp(),pg_temp.w10f_req(64202));
  readiness:=public.get_event_cost_close_readiness('00000000-0000-4000-8000-00000000f814',CURRENT_DATE);
  IF COALESCE((readiness->>'ready')::boolean,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'W10F synthetic Event Cost Close fixture is not ready: %',readiness->'blockers';
  END IF;
  SELECT * INTO service_result FROM public.close_event_cost(
    '00000000-0000-4000-8000-00000000f814','W10F synthetic Event Cost Close',pg_temp.w10f_req(64203),c.admin_id::text,'admin');
  IF service_result.error_code IS NOT NULL OR service_result.close_id IS NULL THEN
    RAISE EXCEPTION 'W10F Event Cost Close fixture failed: %',service_result.error_code;
  END IF;
  current_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,clock_timestamp(),500);
  IF current_report->>'revenue_posted_halalah'<>'0' OR current_report->>'recognition_event_count'<>'0' THEN
    RAISE EXCEPTION 'Event Cost Close alone created Revenue';
  END IF;

  SELECT quotation_id,service_id INTO asset_original_quote,asset_service
  FROM pg_temp.w10f_fixture_invoice_map WHERE label='performance_asset';
  SELECT * INTO r FROM public.approve_quotation_and_activate_internal_abs(asset_original_quote,'w10f-rollback-operator','admin');
  IF r.error_code IS NOT NULL OR r.approved_billing_scope_id IS NULL THEN
    RAISE EXCEPTION 'W10F asset ABS approval failed: %',r.error_code;
  END IF;
  asset_original_scope:=r.approved_billing_scope_id;
  asset_scope:=asset_original_scope;

  SELECT id INTO STRICT covered_scope FROM public.approved_billing_scopes
  WHERE source_quotation_id='00000000-0000-4000-8000-00000000f825' AND status='approved';
  coverage_payload:=jsonb_build_object('accounting_start_date','2000-01-01','cutover_boundary_date','2000-12-31',
    'evidence_inventory','[]'::jsonb,'reconciliation_references','[]'::jsonb,'items',jsonb_build_array(
      jsonb_build_object('item_id','00000000-0000-4000-8000-00000000f842','source_domain','REVENUE_RECOGNITION',
        'source_record_key','ABS/'||asset_scope::text,'economic_event_key','ABS/'||asset_scope::text||'/REVENUE',
        'classification','POST_CUTOVER_SOURCE','resolution_state','RESOLVED','is_material',false,
        'reconciliation_category','OTHER','reconciliation_reference',NULL,'party_type','NONE','party_reference',NULL,
        'evidence_refs','[]'::jsonb,'journal',NULL),
      jsonb_build_object('item_id','00000000-0000-4000-8000-00000000f843','source_domain','REVENUE_RECOGNITION',
        'source_record_key','ABS/'||covered_scope::text,'economic_event_key','ABS/'||covered_scope::text||'/REVENUE',
        'classification','UNRESOLVED','resolution_state','UNRESOLVED','is_material',true,
        'reconciliation_category','OTHER','reconciliation_reference',NULL,'party_type','NONE','party_reference',NULL,
        'evidence_refs','[]'::jsonb,'journal',NULL)));
  SELECT * INTO coverage_result FROM public.save_accounting_inception_package(
    c.operator_id,NULL,0,coverage_payload,'W10F synthetic replay coverage fixture',pg_temp.w10f_req(64204));
  IF coverage_result.error_code IS NOT NULL OR coverage_result.package_id IS NULL THEN
    RAISE EXCEPTION 'W10F W10C synthetic coverage fixture failed: %',coverage_result.error_code;
  END IF;

  SELECT id INTO STRICT non_sar_scope FROM public.approved_billing_scopes
  WHERE source_quotation_id='00000000-0000-4000-8000-00000000f829' AND status='approved';
  SELECT * INTO r FROM public.save_accounting_revenue_arrangement(c.operator_id,
    '00000000-0000-4000-8000-00000000f81a',non_sar_scope,0,'[]'::jsonb,'PRINCIPAL','W10F-1',
    NULL,NULL,'Synthetic non-SAR revenue authority hold',pg_temp.w10f_req(64210));
  IF r.error_code IS NOT NULL OR r.status<>'HELD' OR r.held_code IS DISTINCT FROM 'NON_SAR_CONSIDERATION_UNSUPPORTED' THEN
    RAISE EXCEPTION 'W10F non-SAR commercial authority was not held: % / %',r.error_code,r.held_code;
  END IF;
  SELECT id INTO STRICT vat_scope FROM public.approved_billing_scopes
  WHERE source_quotation_id='00000000-0000-4000-8000-00000000f82a' AND status='approved';
  SELECT * INTO r FROM public.save_accounting_revenue_arrangement(c.operator_id,
    '00000000-0000-4000-8000-00000000f81b',vat_scope,0,'[]'::jsonb,'PRINCIPAL','W10F-1',
    NULL,NULL,'Synthetic non-zero VAT revenue authority hold',pg_temp.w10f_req(64211));
  IF r.error_code IS NOT NULL OR r.status<>'HELD' OR r.held_code IS DISTINCT FROM 'VAT_OR_TAX_TREATMENT_UNSUPPORTED' THEN
    RAISE EXCEPTION 'W10F VAT-dependent commercial authority was not held: % / %',r.error_code,r.held_code;
  END IF;

  SELECT * INTO STRICT item FROM pg_temp.w10f_scope_item('00000000-0000-4000-8000-00000000f812');
  application_scope:=item.scope_id;
  units:=jsonb_build_array(
    jsonb_build_object('unit_key','application-unit-a','promised_output','Transfer the first defined service output',
      'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
      'allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','750'))),
    jsonb_build_object('unit_key','application-unit-b','promised_output','Transfer the second defined service output',
      'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
      'allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','750'))));
  SELECT * INTO r FROM public.save_accounting_revenue_arrangement(c.operator_id,
    '00000000-0000-4000-8000-00000000f812',application_scope,0,units,'PRINCIPAL','W10F-1',NULL,NULL,
    'Synthetic pre-modification allocation baseline',pg_temp.w10f_req(64212));
  IF r.error_code IS NOT NULL OR r.status<>'PREPARED' OR r.consideration_halalah<>'1500' THEN
    RAISE EXCEPTION 'W10F application-target baseline arrangement failed: % / %',r.error_code,r.held_code;
  END IF;
  application_arrangement:=r.arrangement_id;
  SELECT * INTO review_result FROM public.review_accounting_revenue_arrangement(c.reviewer_id,
    application_arrangement,r.version,true,'Review synthetic modification baseline',pg_temp.w10f_req(64213));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'APPROVED' THEN
    RAISE EXCEPTION 'W10F application-target baseline review failed';
  END IF;
  SELECT quotation_id INTO STRICT application_quote FROM pg_temp.w10f_fixture_invoice_map WHERE label='application_target';
  SELECT * INTO successor FROM pg_temp.w10f_fixture_amendment(application_quote,20,0,1);
  application_successor_quote:=successor.successor_quotation_id;
  application_successor_scope:=successor.successor_scope_id;
  SELECT * INTO STRICT item FROM pg_temp.w10f_scope_item('00000000-0000-4000-8000-00000000f812');
  IF item.scope_id IS DISTINCT FROM application_successor_scope THEN
    RAISE EXCEPTION 'W10F application amendment did not create its approved successor scope';
  END IF;
  mod_units:=jsonb_build_array(
    jsonb_build_object('unit_key','application-unit-a','promised_output','Transfer a changed first service output',
      'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
      'allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','750'))),
    jsonb_build_object('unit_key','application-unit-b','promised_output','Transfer the second defined service output',
      'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
      'allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','750'))));
  SELECT * INTO mod_result FROM public.save_accounting_revenue_arrangement(c.operator_id,
    '00000000-0000-4000-8000-00000000f812',application_successor_scope,0,mod_units,'PRINCIPAL','W10F-1',
    'synthetic://w10f/modifications/application-promise',repeat('1',64),
    'Hold changed promised output after W7 amendment',pg_temp.w10f_req(64230));
  IF mod_result.error_code IS NOT NULL OR mod_result.status<>'HELD'
     OR mod_result.held_code IS DISTINCT FROM 'COMMERCIAL_MODIFICATION_PROMISE_OR_ALLOCATION_CHANGED' THEN
    RAISE EXCEPTION 'W10F accepted an altered promised output: % / %',mod_result.error_code,mod_result.held_code;
  END IF;
  application_arrangement:=mod_result.arrangement_id;
  SELECT * INTO review_result FROM public.review_accounting_revenue_arrangement(c.reviewer_id,
    application_arrangement,mod_result.version,false,'Hold changed commercial promise',pg_temp.w10f_req(64231));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'HELD' THEN
    RAISE EXCEPTION 'W10F changed-promise arrangement was not reviewed HELD';
  END IF;

  SELECT quotation_id INTO STRICT allocation_quote FROM pg_temp.w10f_fixture_invoice_map WHERE label='allocation_target';
  SELECT * INTO STRICT item FROM pg_temp.w10f_scope_item('00000000-0000-4000-8000-00000000f81c');
  allocation_scope:=item.scope_id;
  mod_units:=jsonb_build_array(
    jsonb_build_object('unit_key','allocation-unit-a','promised_output','Transfer the first defined service output',
      'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
      'allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','750'))),
    jsonb_build_object('unit_key','allocation-unit-b','promised_output','Transfer the second defined service output',
      'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
      'allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','750'))));
  SELECT * INTO r FROM public.save_accounting_revenue_arrangement(c.operator_id,
    '00000000-0000-4000-8000-00000000f81c',allocation_scope,0,mod_units,'PRINCIPAL','W10F-1',NULL,NULL,
    'Synthetic allocation modification baseline',pg_temp.w10f_req(64232));
  IF r.error_code IS NOT NULL OR r.status<>'PREPARED' OR r.consideration_halalah<>'1500' THEN
    RAISE EXCEPTION 'W10F allocation modification baseline failed: % / %',r.error_code,r.held_code;
  END IF;
  allocation_arrangement:=r.arrangement_id;
  SELECT * INTO review_result FROM public.review_accounting_revenue_arrangement(c.reviewer_id,
    allocation_arrangement,r.version,true,'Review allocation modification baseline',pg_temp.w10f_req(64233));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'APPROVED' THEN
    RAISE EXCEPTION 'W10F allocation modification baseline review failed';
  END IF;
  SELECT * INTO successor FROM pg_temp.w10f_fixture_amendment(allocation_quote,20,0,2);
  allocation_successor_quote:=successor.successor_quotation_id;
  allocation_successor_scope:=successor.successor_scope_id;
  SELECT * INTO STRICT item FROM pg_temp.w10f_scope_item('00000000-0000-4000-8000-00000000f81c');
  mod_units:=jsonb_build_array(
    jsonb_build_object('unit_key','allocation-unit-a','promised_output','Transfer the first defined service output',
      'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
      'allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','1500'))),
    jsonb_build_object('unit_key','allocation-unit-b','promised_output','Transfer the second defined service output',
      'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
      'allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','500'))));
  SELECT * INTO mod_result FROM public.save_accounting_revenue_arrangement(c.operator_id,
    '00000000-0000-4000-8000-00000000f81c',allocation_successor_scope,0,mod_units,'PRINCIPAL','W10F-1',
    'synthetic://w10f/modifications/allocation-shift',repeat('2',64),
    'Hold changed unit allocation after W7 amendment',pg_temp.w10f_req(64234));
  IF mod_result.error_code IS NOT NULL OR mod_result.status<>'HELD'
     OR mod_result.held_code IS DISTINCT FROM 'COMMERCIAL_MODIFICATION_PROMISE_OR_ALLOCATION_CHANGED' THEN
    RAISE EXCEPTION 'W10F accepted a shifted performance allocation: % / %',mod_result.error_code,mod_result.held_code;
  END IF;
  SELECT * INTO review_result FROM public.review_accounting_revenue_arrangement(c.reviewer_id,
    mod_result.arrangement_id,mod_result.version,false,'Hold changed unit allocation',pg_temp.w10f_req(64235));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'HELD' THEN
    RAISE EXCEPTION 'W10F changed-allocation arrangement was not reviewed HELD';
  END IF;
  FOR r IN SELECT unnest(ARRAY[
    'public.save_accounting_revenue_arrangement(uuid,uuid,uuid,integer,jsonb,text,text,text,text,text,uuid)',
    'public.review_accounting_revenue_arrangement(uuid,uuid,integer,boolean,text,uuid)',
    'public.save_accounting_revenue_performance_evidence(uuid,uuid,text,integer,text,date,date,text,text,text,uuid,text,text,uuid)',
    'public.review_accounting_revenue_performance_evidence(uuid,uuid,integer,boolean,text,uuid)',
    'public.prepare_accounting_revenue_recognition(uuid,uuid,integer,uuid,integer,uuid,integer,date,text,uuid)',
    'public.post_accounting_revenue_recognition_journal(uuid,uuid,integer,uuid)',
    'public.get_accounting_revenue_recognition_reconciliation(uuid,date,timestamptz,integer)'
  ]) AS signature LOOP
    IF NOT has_function_privilege('service_role',r.signature,'EXECUTE') OR has_function_privilege('anon',r.signature,'EXECUTE')
       OR has_function_privilege('authenticated',r.signature,'EXECUTE') THEN
      RAISE EXCEPTION 'W10F RPC grant boundary is invalid: %',r.signature;
    END IF;
  END LOOP;

  SELECT * INTO STRICT item FROM pg_temp.w10f_scope_item('00000000-0000-4000-8000-00000000f815');
  IF item.scope_id IS DISTINCT FROM covered_scope OR item.net_halalah<>500 THEN
    RAISE EXCEPTION 'W10F W10C replay fixture source identity differs';
  END IF;
  units:=jsonb_build_array(jsonb_build_object('unit_key','covered-output','promised_output','Synthetic covered output',
    'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
    'allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','500'))));
  SELECT * INTO r FROM public.save_accounting_revenue_arrangement(c.operator_id,
    '00000000-0000-4000-8000-00000000f815',covered_scope,0,units,'PRINCIPAL','W10F-1',NULL,NULL,
    'Synthetic W10C covered arrangement',pg_temp.w10f_req(64220));
  IF r.error_code IS NOT NULL OR r.status<>'PREPARED' THEN RAISE EXCEPTION 'W10F covered arrangement save failed';END IF;
  covered_arrangement:=r.arrangement_id;
  SELECT * INTO review_result FROM public.review_accounting_revenue_arrangement(c.reviewer_id,
    covered_arrangement,r.version,true,'Review W10C covered arrangement',pg_temp.w10f_req(64221));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'APPROVED' THEN
    RAISE EXCEPTION 'W10F W10C covered arrangement review failed';
  END IF;
  covered_unit:=pg_temp.w10f_unit_id(covered_arrangement,'covered-output');
  SELECT * INTO evidence_result FROM public.save_accounting_revenue_performance_evidence(c.operator_id,covered_unit,
    'covered-replay',0,'CUSTOMER_ACCEPTANCE',CURRENT_DATE,CURRENT_DATE,'synthetic://w10f/covered-replay',repeat('f',64),
    '500',NULL,NULL,'Synthetic W10C replay evidence',pg_temp.w10f_req(64222));
  IF evidence_result.error_code IS NOT NULL OR evidence_result.status<>'SUBMITTED' THEN
    RAISE EXCEPTION 'W10F W10C replay evidence save failed: % / %',evidence_result.error_code,evidence_result.held_code;
  END IF;
  SELECT * INTO review_result FROM public.review_accounting_revenue_performance_evidence(c.reviewer_id,
    evidence_result.evidence_id,evidence_result.version,true,'Review synthetic W10C replay evidence',pg_temp.w10f_req(64223));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'APPROVED' THEN
    RAISE EXCEPTION 'W10F W10C replay evidence review failed';
  END IF;
  SELECT * INTO prepared_result FROM public.prepare_accounting_revenue_recognition(c.operator_id,evidence_result.evidence_id,
    evidence_result.version,c.period_id,c.period_version,c.rule_id,c.rule_version,CURRENT_DATE,
    'Reject W10C inception-covered Revenue replay',pg_temp.w10f_req(64224));
  IF prepared_result.error_code IS DISTINCT FROM 'duplicate_coverage'
     OR EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_events WHERE profile_id=c.profile_id
       AND evidence_id=evidence_result.evidence_id) THEN
    RAISE EXCEPTION 'W10C coverage did not block replay before Revenue journal creation: %',prepared_result.error_code;
  END IF;

  SELECT invoice_id INTO STRICT invoice_first FROM pg_temp.w10f_fixture_invoice_map WHERE label='linked_credit';
  SELECT * INTO bridge FROM pg_temp.w10f_fixture_post('INVOICE',invoice_first,'UNCONDITIONAL_CONTRACT_LIABILITY',CURRENT_DATE,1);
  before_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,clock_timestamp(),500);
  IF before_report->>'revenue_posted_halalah'<>'0' OR before_report->>'recognition_event_count'<>'0'
     OR before_report->>'contract_liability_balance_halalah'<>'5000' THEN
    RAISE EXCEPTION 'Invoice alone created Revenue or did not create Contract Liability';
  END IF;
  SELECT * INTO r FROM public.record_invoice_payment(invoice_first,1,CURRENT_DATE,'bank_transfer',
    'Synthetic W10F payment without performance evidence','w10f-rollback-operator',pg_temp.w10f_req(64010));
  IF r.error_code IS NOT NULL OR r.payment_id IS NULL THEN RAISE EXCEPTION 'W10F payment-only probe failed: %',r.error_code;END IF;
  current_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,clock_timestamp(),500);
  IF current_report->>'revenue_posted_halalah'<>'0' OR current_report->>'recognition_event_count'<>'0' THEN
    RAISE EXCEPTION 'Payment alone changed W10F Revenue';
  END IF;

  SELECT * INTO STRICT item FROM pg_temp.w10f_scope_item('00000000-0000-4000-8000-00000000f811');
  IF item.net_halalah<>5000 THEN RAISE EXCEPTION 'Invoice-first consideration differs from fixture';END IF;
  units:=jsonb_build_array(jsonb_build_object('unit_key','acceptance','promised_output','Customer accepts the contracted service',
    'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
    'allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah',item.net_halalah::text))));
  SELECT * INTO r FROM public.save_accounting_revenue_arrangement(c.operator_id,'00000000-0000-4000-8000-00000000f811',
    item.scope_id,0,units,'PRINCIPAL','W10F-1',NULL,NULL,'Synthetic W10F invoice-first arrangement',pg_temp.w10f_req(64011));
  IF r.error_code IS NOT NULL OR r.status<>'PREPARED' OR r.consideration_halalah<>'5000' THEN RAISE EXCEPTION 'W10F invoice-first arrangement failed';END IF;
  arrangement_id:=r.arrangement_id;
  SELECT * INTO review_result FROM public.review_accounting_revenue_arrangement(c.reviewer_id,arrangement_id,r.version,true,
    'Independent synthetic arrangement review',pg_temp.w10f_req(64012));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'APPROVED' THEN RAISE EXCEPTION 'W10F arrangement review failed';END IF;
  unit_pit:=pg_temp.w10f_unit_id(arrangement_id,'acceptance');
  SELECT * INTO event_one FROM pg_temp.w10f_fixture_recognize(unit_pit,'pit-acceptance','CUSTOMER_ACCEPTANCE','5000',1);
  SELECT * INTO evidence_result FROM public.save_accounting_revenue_performance_evidence(c.operator_id,unit_pit,
    'pit-acceptance',1,'CUSTOMER_ACCEPTANCE',CURRENT_DATE-2,CURRENT_DATE,
    'synthetic://w10f/performance/pit-acceptance',repeat('a',64),'5000',NULL,NULL,
    'Attempt to revise evidence after its immutable Revenue effect',pg_temp.w10f_req(64236));
  IF evidence_result.error_code IS DISTINCT FROM 'source_identity_immutable' THEN
    RAISE EXCEPTION 'W10F allowed evidence identity revision after recognition: %',evidence_result.error_code;
  END IF;
  SELECT * INTO evidence_result FROM public.save_accounting_revenue_performance_evidence(c.operator_id,unit_pit,
    'over-ceiling',0,'CUSTOMER_ACCEPTANCE',CURRENT_DATE-2,CURRENT_DATE,
    'synthetic://w10f/performance/over-ceiling',repeat('e',64),'5001',NULL,NULL,
    'Synthetic unit ceiling control',pg_temp.w10f_req(64237));
  IF evidence_result.error_code IS NOT NULL OR evidence_result.status<>'HELD'
     OR evidence_result.held_code IS DISTINCT FROM 'RECOGNITION_AMOUNT_OUTSIDE_UNIT_CEILING' THEN
    RAISE EXCEPTION 'W10F unit recognition ceiling was not held: % / %',evidence_result.error_code,evidence_result.held_code;
  END IF;
  SELECT * INTO review_result FROM public.review_accounting_revenue_performance_evidence(c.reviewer_id,
    evidence_result.evidence_id,evidence_result.version,true,'Hold evidence above its performance unit allocation',pg_temp.w10f_req(64238));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'HELD' THEN
    RAISE EXCEPTION 'W10F above-ceiling evidence was not reviewed HELD';
  END IF;
  before_cutoff:=clock_timestamp();
  correction_event:=pg_temp.w10f_fixture_correct(unit_pit,event_one.event_id);
  historical_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,before_cutoff,500);
  current_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,clock_timestamp(),500);
  IF historical_report->>'recognized_to_date_halalah'<>'5000' OR historical_report->>'recognition_event_count'<>'1'
     OR current_report->>'recognized_to_date_halalah'<>'4000' OR current_report->>'revenue_posted_halalah'<>'4000'
     OR current_report->>'contract_liability_balance_halalah'<>'1000'
     OR current_report->>'contract_balance_difference_count'<>'0' THEN
    RAISE EXCEPTION 'W10F PIT, correction, historical cutoff, or Contract Liability release differs';
  END IF;
  SELECT e INTO event_row FROM jsonb_array_elements(current_report->'recognition_events') e
    WHERE e->>'recognition_event_id'=correction_event::text;
  IF event_row IS NULL OR event_row->>'signed_delta_halalah'<>'-1000'
     OR event_row->>'correction_of_recognition_event_id' IS DISTINCT FROM event_one.event_id::text THEN
    RAISE EXCEPTION 'W10F correction did not retain original recognition lineage';
  END IF;
  SELECT * INTO r FROM public.save_accounting_revenue_performance_evidence(c.operator_id,unit_pit,'date-boundary',0,
    'CUSTOMER_ACCEPTANCE',CURRENT_DATE-2,CURRENT_DATE,'synthetic://w10f/date-boundary',repeat('c',64),'5000',NULL,NULL,
    'Date-boundary probe',pg_temp.w10f_req(64013));
  SELECT * INTO review_result FROM public.review_accounting_revenue_performance_evidence(c.reviewer_id,r.evidence_id,r.version,true,
    'Independent date-boundary review',pg_temp.w10f_req(64014));
  SELECT * INTO r FROM public.prepare_accounting_revenue_recognition(c.operator_id,r.evidence_id,r.version,c.period_id,c.period_version,
    c.rule_id,c.rule_version,CURRENT_DATE-1,'Reject before performance date',pg_temp.w10f_req(64015));
  IF r.error_code IS DISTINCT FROM 'recognition_before_performance' THEN RAISE EXCEPTION 'W10F accepted recognition before performance';END IF;

   asset_quote:=asset_original_quote;
   asset_scope:=asset_original_scope;
  SELECT * INTO STRICT item FROM pg_temp.w10f_scope_item(asset_service);
  IF item.net_halalah<>9000 OR item.discount_halalah<>1000 THEN RAISE EXCEPTION 'W10F lost stored W2C discount allocation';END IF;
  units:=jsonb_build_array(
    jsonb_build_object('unit_key','delivery-pit','promised_output','Customer accepts the first output','satisfaction_method','POINT_IN_TIME',
      'required_evidence_basis','CUSTOMER_ACCEPTANCE','allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','5000'))),
    jsonb_build_object('unit_key','delivery-ot','promised_output','Measured service output transfers over time','satisfaction_method','OVER_TIME',
      'required_evidence_basis','MEASURED_OUTPUT','allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','4000'))));
  SELECT * INTO r FROM public.save_accounting_revenue_arrangement(c.operator_id,asset_service,asset_scope,0,units,'PRINCIPAL','W10F-1',
    NULL,NULL,'Synthetic W10F performance-first arrangement',pg_temp.w10f_req(64016));
  IF r.error_code IS NOT NULL OR r.status<>'PREPARED' OR r.consideration_halalah<>'9000' THEN RAISE EXCEPTION 'W10F asset arrangement failed';END IF;
  arrangement_id:=r.arrangement_id;
  SELECT * INTO review_result FROM public.review_accounting_revenue_arrangement(c.reviewer_id,arrangement_id,r.version,true,
    'Independent synthetic arrangement review',pg_temp.w10f_req(64017));
  unit_pit:=pg_temp.w10f_unit_id(arrangement_id,'delivery-pit');
  unit_ot:=pg_temp.w10f_unit_id(arrangement_id,'delivery-ot');
  SELECT * INTO event_two FROM pg_temp.w10f_fixture_recognize(unit_pit,'pit-delivery','CUSTOMER_ACCEPTANCE','5000',2);
  SELECT * INTO event_two FROM pg_temp.w10f_fixture_recognize(unit_ot,'ot-output-1','MEASURED_OUTPUT','2000',3);
  SELECT * INTO event_two FROM pg_temp.w10f_fixture_recognize(unit_ot,'ot-output-2','MEASURED_OUTPUT','3000',4);
  IF event_two.signed_delta_halalah<>1000 THEN RAISE EXCEPTION 'W10F over-time cumulative recognition did not post a delta';END IF;
  SELECT * INTO event_three FROM pg_temp.w10f_fixture_recognize(unit_ot,'ot-output-3','MEASURED_OUTPUT','4000',5);
  IF event_three.signed_delta_halalah<>1000 THEN RAISE EXCEPTION 'W10F final over-time delta is incorrect';END IF;

  SELECT * INTO STRICT agent_item FROM pg_temp.w10f_scope_item('00000000-0000-4000-8000-00000000f814');
  SELECT * INTO r FROM public.save_accounting_revenue_arrangement(c.operator_id,'00000000-0000-4000-8000-00000000f814',
    agent_item.scope_id,0,jsonb_build_array(jsonb_build_object('unit_key','agent-output','promised_output','Supplier delivered work',
      'satisfaction_method','POINT_IN_TIME','required_evidence_basis','CUSTOMER_ACCEPTANCE',
      'allocations',jsonb_build_array(jsonb_build_object('source_item_id',agent_item.item_id,'amount_halalah',agent_item.net_halalah::text)))),
    'AGENT','W10F-1',NULL,NULL,'Synthetic unsupported Agent treatment',pg_temp.w10f_req(64018));
  IF r.error_code IS NOT NULL OR r.status<>'HELD' OR r.held_code IS NULL THEN RAISE EXCEPTION 'Unsupported Agent treatment was not held';END IF;
  SELECT * INTO review_result FROM public.review_accounting_revenue_arrangement(c.reviewer_id,r.arrangement_id,r.version,true,
    'Review unsupported Agent treatment',pg_temp.w10f_req(64019));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'HELD' THEN RAISE EXCEPTION 'Agent arrangement was approved';END IF;

  SELECT * INTO invoice_result FROM public.create_invoice_atomic(asset_service,asset_quote,'final',NULL,'w10f-rollback-operator',
    'Synthetic W10F invoice after performance','not_registered',jsonb_build_object('currency','SAR','fixture',true),
    jsonb_build_object('customer_id',c.customer_id,'fixture',true),jsonb_build_object('quotation_id',asset_quote,'fixture',true),
    '{}'::jsonb,'{}'::jsonb,'w10f-fixture-performance-asset',CURRENT_DATE,CURRENT_DATE+30);
  IF invoice_result.error_code IS NOT NULL OR invoice_result.invoice_id IS NULL THEN RAISE EXCEPTION 'Later invoice creation failed';END IF;
  asset_invoice:=invoice_result.invoice_id;
  SELECT * INTO invoice_result FROM public.issue_invoice_atomic(asset_invoice,'w10f-rollback-operator');
  IF invoice_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'Later invoice issue failed';END IF;
  SELECT * INTO bridge FROM pg_temp.w10f_fixture_post('INVOICE',asset_invoice,'UNCONDITIONAL_CONTRACT_ASSET',CURRENT_DATE,2);
  current_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,clock_timestamp(),500);
  IF current_report->>'authoritative_consideration_halalah'<>'33000'
     OR current_report->>'performance_unit_allocations_halalah'<>'17500'
     OR current_report->>'recognized_to_date_halalah'<>'13000'
     OR current_report->>'revenue_posted_halalah'<>'13000'
     OR current_report->>'contract_asset_balance_halalah'<>'0'
     OR current_report->>'contract_liability_balance_halalah'<>'1000'
     OR current_report->>'contract_balance_difference_count'<>'0'
     OR current_report->>'recognition_event_count'<>'6'
     OR current_report->>'truncated'<>'false' THEN RAISE EXCEPTION 'W10F reconciliation or W10D Contract Asset clearing differs';END IF;
  IF jsonb_array_length(current_report->'recognition_events')<>6 OR current_report->>'fi012_timing_difference_count'<>'0' THEN
    RAISE EXCEPTION 'W10F recognition event or FI-012 result differs';
  END IF;
  date_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE-1,clock_timestamp(),500);
  IF date_report->>'revenue_posted_halalah'<>'0' OR date_report->>'recognition_event_count'<>'0' THEN
    RAISE EXCEPTION 'W10F accounting-date cutoff included current-day events';
  END IF;

  SELECT * INTO successor FROM pg_temp.w10f_fixture_amendment(asset_quote,110,10,3);
  asset_positive_quote:=successor.successor_quotation_id;
  asset_positive_scope:=successor.successor_scope_id;
  SELECT * INTO STRICT item FROM pg_temp.w10f_scope_item(asset_service);
  IF item.scope_id IS DISTINCT FROM asset_positive_scope OR item.net_halalah<>10000 THEN
    RAISE EXCEPTION 'W10F positive commercial successor does not preserve the increased net consideration';
  END IF;
  units:=jsonb_build_array(
    jsonb_build_object('unit_key','delivery-pit','promised_output','Customer accepts the first output','satisfaction_method','POINT_IN_TIME',
      'required_evidence_basis','CUSTOMER_ACCEPTANCE','allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','5000'))),
    jsonb_build_object('unit_key','delivery-ot','promised_output','Measured service output transfers over time','satisfaction_method','OVER_TIME',
      'required_evidence_basis','MEASURED_OUTPUT','allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','5000'))));
  SELECT * INTO mod_result FROM public.save_accounting_revenue_arrangement(c.operator_id,asset_service,asset_positive_scope,0,units,
    'PRINCIPAL','W10F-1','synthetic://w10f/modifications/positive-consideration',repeat('3',64),
    'Preserve performance promises after positive W7 modification',pg_temp.w10f_req(64310));
  IF mod_result.error_code IS NOT NULL OR mod_result.status<>'PREPARED' OR mod_result.consideration_halalah<>'10000' THEN
    RAISE EXCEPTION 'W10F positive commercial modification was held: % / %',mod_result.error_code,mod_result.held_code;
  END IF;
  asset_positive_arrangement:=mod_result.arrangement_id;
  SELECT * INTO review_result FROM public.review_accounting_revenue_arrangement(c.reviewer_id,
    asset_positive_arrangement,mod_result.version,true,'Review W10F positive consideration successor',pg_temp.w10f_req(64311));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'APPROVED' THEN
    RAISE EXCEPTION 'W10F positive commercial successor review failed';
  END IF;
  SELECT * INTO STRICT unit_ot FROM pg_temp.w10f_unit_id(asset_positive_arrangement,'delivery-ot');
  SELECT * INTO event_three FROM pg_temp.w10f_fixture_recognize(unit_ot,'ot-commercial-increase','MEASURED_OUTPUT','5000',6);
  IF event_three.signed_delta_halalah<>1000 THEN
    RAISE EXCEPTION 'W10F positive modification did not recognize only its incremental performance delta';
  END IF;

  current_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,clock_timestamp(),500);
  SELECT * INTO credit_result FROM public.record_customer_internal_credit_adjustment(
    c.customer_id,asset_service,asset_invoice,1.00,'invoice_correction','Synthetic W10F customer invoice correction',CURRENT_DATE,
    pg_temp.w10f_req(64320),'w10f-rollback-operator',NULL,NULL);
  IF credit_result.error_code IS NOT NULL OR credit_result.credit_adjustment_id IS NULL THEN
    RAISE EXCEPTION 'W10F customer credit adjustment control failed: %',credit_result.error_code;
  END IF;
  SELECT * INTO r FROM public.refund_customer_credit(c.customer_id,credit_result.credit_adjustment_id,1.00,CURRENT_DATE,
    'Synthetic W10F customer credit refund','bank_transfer','W10F-REFUND',pg_temp.w10f_req(64321),'w10f-rollback-operator');
  IF r.error_code IS NOT NULL OR r.refund_id IS NULL THEN
    RAISE EXCEPTION 'W10F customer refund control failed: %',r.error_code;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.audit_logs WHERE entity_type='customer_refund' AND entity_id=r.refund_id
      AND details->>'revenue_classification'='none' AND details->>'payment_reversal'='false') THEN
    RAISE EXCEPTION 'W10F customer refund was not kept outside Revenue and payment reversal';
  END IF;
  SELECT * INTO bridge FROM pg_temp.w10f_fixture_hold(
    'CREDIT_ADJUSTMENT',credit_result.credit_adjustment_id,'HELD_REVENUE_CORRECTION','revenue_correction_required',25);
  SELECT * INTO bridge FROM pg_temp.w10f_fixture_hold(
    'REFUND',r.refund_id,'HELD_REVENUE_CORRECTION','revenue_correction_required',26);
  date_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,clock_timestamp(),500);
  IF date_report->>'revenue_posted_halalah' IS DISTINCT FROM current_report->>'revenue_posted_halalah'
     OR date_report->>'recognition_event_count' IS DISTINCT FROM current_report->>'recognition_event_count'
     OR date_report->>'credits_refunds_requiring_revenue_review_count'<>'2' THEN
    RAISE EXCEPTION 'W10F customer credit/refund changed posted Revenue';
  END IF;

  SELECT * INTO successor FROM pg_temp.w10f_fixture_amendment(asset_positive_quote,105,10,4);
  asset_reduction_scope:=successor.successor_scope_id;
  SELECT * INTO STRICT item FROM pg_temp.w10f_scope_item(asset_service);
  units:=jsonb_build_array(
    jsonb_build_object('unit_key','delivery-pit','promised_output','Customer accepts the first output','satisfaction_method','POINT_IN_TIME',
      'required_evidence_basis','CUSTOMER_ACCEPTANCE','allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','5000'))),
    jsonb_build_object('unit_key','delivery-ot','promised_output','Measured service output transfers over time','satisfaction_method','OVER_TIME',
      'required_evidence_basis','MEASURED_OUTPUT','allocations',jsonb_build_array(jsonb_build_object('source_item_id',item.item_id,'amount_halalah','4500'))));
  SELECT * INTO mod_result FROM public.save_accounting_revenue_arrangement(c.operator_id,asset_service,asset_reduction_scope,0,units,
    'PRINCIPAL','W10F-1','synthetic://w10f/modifications/below-recognized',repeat('4',64),
    'Hold consideration below already recognized Revenue',pg_temp.w10f_req(64330));
  IF mod_result.error_code IS NOT NULL OR mod_result.status<>'HELD'
     OR mod_result.held_code IS DISTINCT FROM 'MODIFICATION_BELOW_RECOGNIZED_AMOUNT' THEN
    RAISE EXCEPTION 'W10F accepted commercial consideration below recognized history: % / %',mod_result.error_code,mod_result.held_code;
  END IF;
  SELECT * INTO review_result FROM public.review_accounting_revenue_arrangement(c.reviewer_id,
    mod_result.arrangement_id,mod_result.version,false,'Hold below-recognized modification',pg_temp.w10f_req(64331));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'HELD' THEN
    RAISE EXCEPTION 'W10F below-recognized modification was not reviewed HELD';
  END IF;

  SELECT * INTO evidence_result FROM public.save_accounting_revenue_performance_evidence(c.operator_id,unit_pit,
    'stale-after-modification',0,'CUSTOMER_ACCEPTANCE',CURRENT_DATE-2,CURRENT_DATE,
    'synthetic://w10f/performance/stale-after-modification',repeat('5',64),'5000',NULL,NULL,
    'Synthetic stale commercial authority control',pg_temp.w10f_req(64340));
  IF evidence_result.error_code IS NOT NULL OR evidence_result.status<>'SUBMITTED' THEN
    RAISE EXCEPTION 'W10F stale authority evidence setup failed: %',evidence_result.error_code;
  END IF;
  SELECT * INTO review_result FROM public.review_accounting_revenue_performance_evidence(c.reviewer_id,
    evidence_result.evidence_id,evidence_result.version,true,'Review stale authority control evidence',pg_temp.w10f_req(64341));
  IF review_result.error_code IS NOT NULL OR review_result.decision<>'APPROVED' THEN
    RAISE EXCEPTION 'W10F stale authority evidence review failed';
  END IF;
  SELECT * INTO prepared_result FROM public.prepare_accounting_revenue_recognition(c.operator_id,evidence_result.evidence_id,
    evidence_result.version,c.period_id,c.period_version,c.rule_id,c.rule_version,CURRENT_DATE,
    'Reject stale original commercial authority',pg_temp.w10f_req(64342));
  IF prepared_result.error_code IS DISTINCT FROM 'stale_commercial_authority' THEN
    RAISE EXCEPTION 'W10F prepared Revenue against superseded commercial authority: %',prepared_result.error_code;
  END IF;

  current_report:=public.get_accounting_revenue_recognition_reconciliation(c.operator_id,CURRENT_DATE,clock_timestamp(),500);
  IF current_report->>'authoritative_consideration_halalah'<>'33500'
     OR current_report->>'performance_unit_allocations_halalah'<>'27500'
     OR current_report->>'recognized_to_date_halalah'<>'14000'
     OR current_report->>'revenue_posted_halalah'<>'14000'
     OR current_report->>'contract_asset_balance_halalah'<>'1000'
     OR current_report->>'contract_liability_balance_halalah'<>'1000'
     OR current_report->>'contract_balance_difference_count'<>'0'
     OR current_report->>'recognition_event_count'<>'7'
     OR current_report->>'superseded_or_stale_authority_count'<>'4'
     OR current_report->>'credits_refunds_requiring_revenue_review_count'<>'2'
     OR current_report->>'inception_covered_count'<>'1'
     OR current_report->>'fi012_timing_difference_count'<>'0'
     OR current_report->>'truncated'<>'false' THEN
    RAISE EXCEPTION 'W10F final reconciliation after commercial, credit, and refund controls differs';
  END IF;
  IF jsonb_array_length(current_report->'recognition_events')<>7 THEN
    RAISE EXCEPTION 'W10F final recognition event detail count differs';
  END IF;
  SELECT * INTO tb FROM public.get_accounting_trial_balance(c.operator_id,CURRENT_DATE,clock_timestamp(),NULL,0,100);
  IF tb.report->>'debits_equal_credits'<>'true'
     OR tb.report->>'debit_balance_total_halalah' IS DISTINCT FROM tb.report->>'credit_balance_total_halalah' THEN
    RAISE EXCEPTION 'W10F synthetic GL/trial balance is unbalanced';
  END IF;
END;
$w10f_regression$;
RESET ROLE;

ROLLBACK;

DO $w10f_residue_assertion$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10f-rollback-%')
     OR EXISTS (SELECT 1 FROM public.customers WHERE customer_number LIKE 'W10F-SYN-%')
     OR EXISTS (SELECT 1 FROM public.services WHERE service_number LIKE 'SVC-2099-81__')
     OR EXISTS (SELECT 1 FROM public.quotations WHERE quotation_number LIKE 'W10F-SYN-Q-%')
     OR EXISTS (SELECT 1 FROM public.invoices i JOIN public.services s ON s.id=i.service_id WHERE s.service_number LIKE 'SVC-2099-81__')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000f800')
     OR EXISTS (SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10F-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_revenue_arrangements WHERE profile_id='00000000-0000-4000-8000-00000000f800')
     OR EXISTS (SELECT 1 FROM public.accounting_revenue_performance_evidence_versions WHERE profile_id='00000000-0000-4000-8000-00000000f800')
     OR EXISTS (SELECT 1 FROM public.accounting_revenue_recognition_events WHERE profile_id='00000000-0000-4000-8000-00000000f800')
     OR EXISTS (SELECT 1 FROM public.accounting_source_effects WHERE profile_id='00000000-0000-4000-8000-00000000f800' AND source_domain='REVENUE_RECOGNITION')
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000f000' AND '00000000-0000-4000-8000-00000000ffff')
     OR EXISTS (SELECT 1 FROM public.accounting_journal_events WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000f000' AND '00000000-0000-4000-8000-00000000ffff')
     OR EXISTS (SELECT 1 FROM public.accounting_capability_events WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000f000' AND '00000000-0000-4000-8000-00000000ffff')
     OR EXISTS (SELECT 1 FROM public.audit_logs WHERE details->>'request_id' BETWEEN '00000000-0000-4000-8000-00000000f000' AND '00000000-0000-4000-8000-00000000ffff') THEN
    RAISE EXCEPTION 'W10F synthetic residue detected after rollback';
  END IF;
END;
$w10f_residue_assertion$;
