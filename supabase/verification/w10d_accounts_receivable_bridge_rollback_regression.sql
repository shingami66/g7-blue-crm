-- W10D synthetic DEV regression only. One transaction is fully rolled back.
BEGIN;

CREATE TEMP TABLE w10d_fixture_context (
  profile_id uuid NOT NULL,
  authority_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  period_id uuid,
  period_version integer,
  rule_id uuid,
  rule_version integer
);
INSERT INTO w10d_fixture_context(profile_id,authority_id,operator_id,admin_id,customer_id)
VALUES('00000000-0000-4000-8000-00000000d800','00000000-0000-4000-8000-00000000d801',
  '00000000-0000-4000-8000-00000000d802','00000000-0000-4000-8000-00000000d803',
  '00000000-0000-4000-8000-00000000d810');
GRANT SELECT,UPDATE ON w10d_fixture_context TO service_role;

CREATE TEMP TABLE w10d_fixture_accounts(mapping_key text PRIMARY KEY,account_id uuid NOT NULL);
GRANT SELECT,INSERT ON w10d_fixture_accounts TO service_role;

CREATE TEMP TABLE w10d_fixture_invoice_map(
  label text PRIMARY KEY,service_id uuid NOT NULL,quotation_id uuid NOT NULL,
  amount numeric NOT NULL,invoice_date date NOT NULL,invoice_id uuid
);
INSERT INTO w10d_fixture_invoice_map(label,service_id,quotation_id,amount,invoice_date) VALUES
 ('linked_credit','00000000-0000-4000-8000-00000000d811','00000000-0000-4000-8000-00000000d821',50,CURRENT_DATE-5),
 ('application_target','00000000-0000-4000-8000-00000000d812','00000000-0000-4000-8000-00000000d822',15,CURRENT_DATE-4),
 ('receipt_target','00000000-0000-4000-8000-00000000d813','00000000-0000-4000-8000-00000000d823',100,CURRENT_DATE-3),
 ('unsupported_invoice','00000000-0000-4000-8000-00000000d814','00000000-0000-4000-8000-00000000d824',20,CURRENT_DATE-2),
 ('covered_invoice','00000000-0000-4000-8000-00000000d815','00000000-0000-4000-8000-00000000d825',5,CURRENT_DATE-2),
 ('future_accounting','00000000-0000-4000-8000-00000000d816','00000000-0000-4000-8000-00000000d826',11,CURRENT_DATE-2),
 ('revenue_correction','00000000-0000-4000-8000-00000000d817','00000000-0000-4000-8000-00000000d827',20,CURRENT_DATE-1);
GRANT SELECT,UPDATE ON w10d_fixture_invoice_map TO service_role;

CREATE FUNCTION pg_temp.w10d_req(p_tag integer) RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog
AS $w10d_req$ SELECT ('00000000-0000-4000-8000-'||lpad(to_hex(p_tag),12,'0'))::uuid $w10d_req$;

CREATE FUNCTION pg_temp.w10d_fixture_post(
  p_source_type text,p_source_id uuid,p_classification text,p_accounting_date date,p_sequence integer
) RETURNS TABLE(event_id uuid,event_version integer,journal_id uuid,posted_version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10d_fixture_post$
DECLARE
  v_context pg_temp.w10d_fixture_context%ROWTYPE;
  v_saved record; v_retry record; v_conflict record; v_prepared record; v_prepare_retry record;
  v_effect_retry record; v_posted record; v_post_retry record; v_effect_count integer;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10d_fixture_context;
  SELECT * INTO v_saved FROM public.save_accounting_ar_bridge_event(
    v_context.operator_id,p_source_type,p_source_id,0,p_classification,p_accounting_date,
    'synthetic://w10d/'||p_source_type||'/'||p_source_id::text,repeat('d',64),
    'W10D synthetic rollback fixture',pg_temp.w10d_req(53248+p_sequence));
  IF v_saved.error_code IS NOT NULL OR v_saved.status<>'READY' OR v_saved.version<>1 THEN
    RAISE EXCEPTION 'W10D fixture source classification failed for %: % / %',p_source_type,v_saved.error_code,v_saved.status;
  END IF;
  SELECT * INTO v_retry FROM public.save_accounting_ar_bridge_event(
    v_context.operator_id,p_source_type,p_source_id,0,p_classification,p_accounting_date,
    'synthetic://w10d/'||p_source_type||'/'||p_source_id::text,repeat('d',64),
    'W10D synthetic rollback fixture',pg_temp.w10d_req(53248+p_sequence));
  IF v_retry.error_code IS NOT NULL OR v_retry.event_id<>v_saved.event_id OR NOT v_retry.idempotent_replay THEN
    RAISE EXCEPTION 'same request payload was not idempotent';
  END IF;
  SELECT * INTO v_conflict FROM public.save_accounting_ar_bridge_event(
    v_context.operator_id,p_source_type,p_source_id,0,p_classification,p_accounting_date,
    'synthetic://w10d/'||p_source_type||'/'||p_source_id::text,repeat('d',64),
    'changed payload with same request identity',pg_temp.w10d_req(53248+p_sequence));
  IF v_conflict.error_code IS DISTINCT FROM 'request_payload_conflict' THEN
    RAISE EXCEPTION 'same request identity accepted changed payload';
  END IF;

  SELECT * INTO v_prepared FROM public.prepare_accounting_ar_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Prepare W10D synthetic event',
    pg_temp.w10d_req(53504+p_sequence));
  IF v_prepared.error_code IS NOT NULL OR v_prepared.journal_id IS NULL OR v_prepared.status<>'DRAFT' THEN
    RAISE EXCEPTION 'W10D fixture prepare failed for %: %',p_source_type,v_prepared.error_code;
  END IF;
  SELECT * INTO v_prepare_retry FROM public.prepare_accounting_ar_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Prepare W10D synthetic event',
    pg_temp.w10d_req(53504+p_sequence));
  IF v_prepare_retry.error_code IS NOT NULL OR v_prepare_retry.journal_id<>v_prepared.journal_id
     OR NOT v_prepare_retry.idempotent_replay THEN
    RAISE EXCEPTION 'W10D prepare retry was not idempotent';
  END IF;
  SELECT * INTO v_effect_retry FROM public.prepare_accounting_ar_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Retry same W10D economic effect',
    pg_temp.w10d_req(54016+p_sequence));
  IF v_effect_retry.error_code IS NOT NULL OR v_effect_retry.journal_id<>v_prepared.journal_id
     OR NOT v_effect_retry.idempotent_replay THEN
    RAISE EXCEPTION 'duplicate economic effect retry created a second journal';
  END IF;
  SELECT count(*) INTO v_effect_count FROM public.accounting_source_effects se
  WHERE se.profile_id=v_context.profile_id AND se.source_domain='AR_BRIDGE'
    AND se.economic_event_key='W7/'||p_source_type||'/'||p_source_id::text||'/AR_EFFECT';
  IF v_effect_count<>1 THEN RAISE EXCEPTION 'duplicate economic-effect prevention failed'; END IF;

  SELECT * INTO v_posted FROM public.post_accounting_ar_bridge_journal(
    v_context.operator_id,v_prepared.journal_id,v_prepared.version,pg_temp.w10d_req(53760+p_sequence));
  IF v_posted.error_code IS NOT NULL OR v_posted.status<>'POSTED' OR v_posted.version<>2 THEN
    RAISE EXCEPTION 'W10D fixture post failed for %: %',p_source_type,v_posted.error_code;
  END IF;
  SELECT * INTO v_post_retry FROM public.post_accounting_ar_bridge_journal(
    v_context.operator_id,v_prepared.journal_id,v_prepared.version,pg_temp.w10d_req(53760+p_sequence));
  IF v_post_retry.error_code IS NOT NULL OR NOT v_post_retry.idempotent_replay THEN
    RAISE EXCEPTION 'W10D post retry was not idempotent';
  END IF;
  RETURN QUERY SELECT v_saved.event_id,v_saved.version,v_prepared.journal_id,v_posted.version;
END;
$w10d_fixture_post$;
GRANT EXECUTE ON FUNCTION pg_temp.w10d_fixture_post(text,uuid,text,date,integer) TO service_role;

CREATE FUNCTION pg_temp.w10d_fixture_hold(
  p_source_type text,p_source_id uuid,p_classification text,p_expected_held_code text,p_sequence integer
) RETURNS TABLE(event_id uuid,event_version integer,held_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10d_fixture_hold$
DECLARE
  v_context pg_temp.w10d_fixture_context%ROWTYPE; v_saved record; v_prepare record;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10d_fixture_context;
  SELECT * INTO v_saved FROM public.save_accounting_ar_bridge_event(
    v_context.operator_id,p_source_type,p_source_id,0,p_classification,NULL,NULL,NULL,
    'W10D unsupported synthetic treatment',pg_temp.w10d_req(54272+p_sequence));
  IF v_saved.error_code IS NOT NULL OR v_saved.status<>'HELD' THEN
    RAISE EXCEPTION 'unsupported classification was not held';
  END IF;
  SELECT ev.held_code INTO held_code FROM public.accounting_ar_bridge_event_versions ev
  WHERE ev.profile_id=v_context.profile_id AND ev.event_id=v_saved.event_id AND ev.version=v_saved.version;
  IF held_code IS DISTINCT FROM p_expected_held_code THEN
    RAISE EXCEPTION 'W10D held classification code differs: %',held_code;
  END IF;
  SELECT * INTO v_prepare FROM public.prepare_accounting_ar_bridge_event(
    v_context.operator_id,v_saved.event_id,v_saved.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Reject held W10D event',pg_temp.w10d_req(54528+p_sequence));
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
    RAISE EXCEPTION 'held W10D event created a journal or source effect';
  END IF;
  RETURN QUERY SELECT v_saved.event_id,v_saved.version,held_code;
END;
$w10d_fixture_hold$;
GRANT EXECUTE ON FUNCTION pg_temp.w10d_fixture_hold(text,uuid,text,text,integer) TO service_role;

CREATE FUNCTION pg_temp.w10d_fixture_allocation_id(p_payment_id uuid,p_ordinal integer)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10d_alloc_id$
  SELECT a.id FROM public.customer_receipt_allocations a
  WHERE a.payment_id=p_payment_id ORDER BY a.created_at,a.id OFFSET p_ordinal LIMIT 1
$w10d_alloc_id$;
GRANT EXECUTE ON FUNCTION pg_temp.w10d_fixture_allocation_id(uuid,integer) TO service_role;

CREATE FUNCTION pg_temp.w10d_fixture_reversal_id(p_table_name text,p_source_id uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10d_reversal_id$
DECLARE v_id uuid;
BEGIN
  CASE p_table_name
    WHEN 'receipt' THEN SELECT r.id INTO v_id FROM public.customer_receipt_reversals r WHERE r.payment_id=p_source_id;
    WHEN 'allocation' THEN SELECT r.id INTO v_id FROM public.customer_receipt_allocation_reversals r WHERE r.allocation_id=p_source_id;
    WHEN 'credit_adjustment' THEN SELECT r.id INTO v_id FROM public.customer_internal_credit_adjustment_reversals r WHERE r.source_credit_adjustment_id=p_source_id;
    WHEN 'credit_application' THEN SELECT r.id INTO v_id FROM public.customer_credit_application_reversals r WHERE r.source_application_id=p_source_id;
    WHEN 'refund' THEN SELECT r.id INTO v_id FROM public.customer_refund_reversals r WHERE r.source_refund_id=p_source_id;
    ELSE RAISE EXCEPTION 'unsupported W10D fixture reversal source';
  END CASE;
  RETURN v_id;
END;
$w10d_reversal_id$;
GRANT EXECUTE ON FUNCTION pg_temp.w10d_fixture_reversal_id(text,uuid) TO service_role;

CREATE FUNCTION pg_temp.w10d_fixture_event_line_count(p_source_type text,p_source_id uuid,p_party_role text)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10d_line_count$
  SELECT count(*)::integer FROM public.accounting_ar_bridge_journal_lines l
  JOIN public.accounting_ar_bridge_events e ON e.profile_id=l.profile_id AND e.id=l.event_id
  WHERE e.source_type=p_source_type AND e.source_record_id=p_source_id
    AND l.party_role=p_party_role
$w10d_line_count$;
GRANT EXECUTE ON FUNCTION pg_temp.w10d_fixture_event_line_count(text,uuid,text) TO service_role;

CREATE FUNCTION pg_temp.w10d_fixture_snapshot_matches(p_source_type text,p_source_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10d_snapshot_matches$
  SELECT EXISTS(
    SELECT 1 FROM public.accounting_ar_bridge_events e
    JOIN public.accounting_ar_bridge_event_versions v
      ON v.profile_id=e.profile_id AND v.event_id=e.id AND v.version=e.current_version
    WHERE e.source_type=p_source_type AND e.source_record_id=p_source_id
      AND v.source_snapshot=public.accounting_ar_bridge_source_snapshot(p_source_type,p_source_id)
  )
$w10d_snapshot_matches$;
GRANT EXECUTE ON FUNCTION pg_temp.w10d_fixture_snapshot_matches(text,uuid) TO service_role;

DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10d-rollback-%')
     OR EXISTS (SELECT 1 FROM public.customers WHERE customer_number LIKE 'W10D-SYN-%')
     OR EXISTS (SELECT 1 FROM public.services WHERE service_number LIKE 'SVC-2099-81__')
     OR EXISTS (SELECT 1 FROM public.quotations WHERE quotation_number LIKE 'W10D-SYN-Q-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000d800' OR singleton_key='g7')
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_events)
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_event_versions)
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_journal_links)
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_journal_lines)
     OR EXISTS (SELECT 1 FROM public.accounting_source_effects WHERE source_domain='AR_BRIDGE')
     OR EXISTS (SELECT 1 FROM public.accounting_inception_packages)
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events
       WHERE id BETWEEN '00000000-0000-4000-8000-00000000d800' AND '00000000-0000-4000-8000-00000000dfff')
     OR EXISTS (SELECT 1 FROM public.accounting_capability_events
       WHERE id BETWEEN '00000000-0000-4000-8000-00000000d800' AND '00000000-0000-4000-8000-00000000dfff') THEN
    RAISE EXCEPTION 'W10D rollback fixture collision or existing accounting bootstrap; inspect before running';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company_settings WHERE setting_key='default') THEN
    RAISE EXCEPTION 'W10D rollback fixture requires default company settings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
      WHERE capability='accounting:manage_ar_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10D') THEN
    RAISE EXCEPTION 'W10D bridge capability is not enabled by the migration';
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_capability_catalog
      WHERE capability IN ('accounting:reconcile_bank','accounting:close_period','accounting:reopen_period')
        AND (enabled OR runtime_allow_grantable)) THEN
    RAISE EXCEPTION 'W10D enabled a later accounting capability';
  END IF;
END;
$preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
 ('00000000-0000-4000-8000-00000000d801','w10d-rollback-authority','w10d-authority@example.invalid','Synthetic W10D authority','viewer',true),
 ('00000000-0000-4000-8000-00000000d802','w10d-rollback-operator','w10d-operator@example.invalid','Synthetic W10D operator','viewer',true),
 ('00000000-0000-4000-8000-00000000d803','w10d-rollback-admin','w10d-admin@example.invalid','Synthetic CRM Admin','admin',true);

INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT '00000000-0000-4000-8000-00000000d800','g7',s.id,0
FROM public.company_settings s WHERE s.setting_key='default';
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES('00000000-0000-4000-8000-00000000d840','00000000-0000-4000-8000-00000000d800',
  'accounting_profile_updated','accounting_profile','00000000-0000-4000-8000-00000000d800',1,
  '00000000-0000-4000-8000-00000000d801','00000000-0000-4000-8000-00000000d841',
  'Synthetic W10D rollback profile',NULL,repeat('a',64),
  'accounting_profiles/00000000-0000-4000-8000-00000000d800/1',transaction_timestamp());
INSERT INTO public.accounting_profile_versions(
  profile_id,version,previous_version,framework_key,framework_edition,policy_version,
  endorsement_context,professional_validation_state,professional_validation_evidence_ref,
  functional_currency,fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,
  fiscal_timezone,accounting_start_date,cutover_boundary_date,legal_fiscal_evidence_pending,
  legal_fiscal_evidence_ref,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
  reason,evidence_ref,created_by,created_at,foundation_event_id
) VALUES('00000000-0000-4000-8000-00000000d800',1,NULL,'SA_IFRS_FOR_SMES',2025,'W10 provisional policy',
  'Synthetic W10D rollback fixture','DEFERRED',NULL,'SAR',1,1,12,31,'Asia/Riyadh',
  '2000-01-01','2000-12-31',true,NULL,'not_registered','INACTIVE','INACTIVE','DEV_PROVISIONAL',
  transaction_timestamp(),'Synthetic W10D profile',NULL,'00000000-0000-4000-8000-00000000d801',
  transaction_timestamp(),'00000000-0000-4000-8000-00000000d840');
UPDATE public.accounting_profiles SET current_version=1 WHERE id='00000000-0000-4000-8000-00000000d800';

INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
  request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES('00000000-0000-4000-8000-00000000d842','00000000-0000-4000-8000-00000000d800',
  'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000d844',1,
  '00000000-0000-4000-8000-00000000d801','00000000-0000-4000-8000-00000000d843',
  'Synthetic W10D authority bootstrap',NULL,repeat('b',64),'accounting:manage_authority',transaction_timestamp());
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,
  reason,evidence_ref,request_id,payload_fingerprint,foundation_event_id,created_at
) VALUES('00000000-0000-4000-8000-00000000d844','00000000-0000-4000-8000-00000000d800',
  '00000000-0000-4000-8000-00000000d801','accounting:manage_authority',1,'ALLOW',NULL,
  '00000000-0000-4000-8000-00000000d801','Synthetic authority bootstrap',NULL,
  '00000000-0000-4000-8000-00000000d843',repeat('b',64),
  '00000000-0000-4000-8000-00000000d842',transaction_timestamp());

INSERT INTO public.customers(id,customer_number,company,contact,email,phone,city,status,created_by)
VALUES('00000000-0000-4000-8000-00000000d810','W10D-SYN-CUSTOMER','W10D Synthetic Customer',
  'Fixture Contact','w10d-customer@example.invalid','+966500000810','Riyadh','active','w10d-rollback-operator'),
 ('00000000-0000-4000-8000-00000000d818','W10D-SYN-REVENUE-CUSTOMER','W10D Synthetic Revenue Correction',
  'Fixture Contact','w10d-revenue@example.invalid','+966500000818','Riyadh','active','w10d-rollback-operator');
INSERT INTO public.services(id,service_number,customer_id,service_title,status) VALUES
 ('00000000-0000-4000-8000-00000000d811','SVC-2099-8101','00000000-0000-4000-8000-00000000d810','W10D linked payment and credit','Inquiry'),
 ('00000000-0000-4000-8000-00000000d812','SVC-2099-8102','00000000-0000-4000-8000-00000000d810','W10D credit application target','Inquiry'),
 ('00000000-0000-4000-8000-00000000d813','SVC-2099-8103','00000000-0000-4000-8000-00000000d810','W10D receipt allocation target','Inquiry'),
 ('00000000-0000-4000-8000-00000000d814','SVC-2099-8104','00000000-0000-4000-8000-00000000d810','W10D unsupported invoice','Inquiry'),
 ('00000000-0000-4000-8000-00000000d815','SVC-2099-8105','00000000-0000-4000-8000-00000000d810','W10D inception covered invoice','Inquiry'),
 ('00000000-0000-4000-8000-00000000d816','SVC-2099-8106','00000000-0000-4000-8000-00000000d810','W10D future accounting date','Inquiry'),
 ('00000000-0000-4000-8000-00000000d817','SVC-2099-8107','00000000-0000-4000-8000-00000000d818','W10D unsupported credit correction','Inquiry');
INSERT INTO public.quotations(
  id,quotation_number,customer_id,event,date,valid_until,subtotal,discount,vat_amount,grand_total,
  status,vat_rate,service_id,snapshot_seller,snapshot_buyer
)
SELECT q.quotation_id,q.quotation_number,s.customer_id,'W10D synthetic accounting fixture',CURRENT_DATE,
  CURRENT_DATE+30,q.amount,0,0,q.amount,'draft',0,s.id,
  jsonb_build_object('currency','SAR','fixture',true),jsonb_build_object('customer_id',s.customer_id,'fixture',true)
FROM (VALUES
 ('00000000-0000-4000-8000-00000000d821'::uuid,'W10D-SYN-Q-LINKED', '00000000-0000-4000-8000-00000000d811'::uuid,50::numeric),
 ('00000000-0000-4000-8000-00000000d822'::uuid,'W10D-SYN-Q-APPLICATION','00000000-0000-4000-8000-00000000d812'::uuid,15::numeric),
 ('00000000-0000-4000-8000-00000000d823'::uuid,'W10D-SYN-Q-RECEIPT','00000000-0000-4000-8000-00000000d813'::uuid,100::numeric),
 ('00000000-0000-4000-8000-00000000d824'::uuid,'W10D-SYN-Q-UNSUPPORTED','00000000-0000-4000-8000-00000000d814'::uuid,20::numeric),
 ('00000000-0000-4000-8000-00000000d825'::uuid,'W10D-SYN-Q-COVERED','00000000-0000-4000-8000-00000000d815'::uuid,5::numeric),
 ('00000000-0000-4000-8000-00000000d826'::uuid,'W10D-SYN-Q-FUTURE','00000000-0000-4000-8000-00000000d816'::uuid,11::numeric),
 ('00000000-0000-4000-8000-00000000d827'::uuid,'W10D-SYN-Q-REVENUE','00000000-0000-4000-8000-00000000d817'::uuid,20::numeric)
) AS q(quotation_id,quotation_number,service_id,amount)
JOIN public.services s ON s.id=q.service_id;
INSERT INTO public.quotation_items(
  id,quotation_id,description,category,qty,unit_price,vat,total,commercial_role,is_selected,unit
)
SELECT i.item_id,i.quotation_id,'W10D synthetic service','other',1,i.amount,0,i.amount,'authority_line',true,'service'
FROM (VALUES
 ('00000000-0000-4000-8000-00000000d831'::uuid,'00000000-0000-4000-8000-00000000d821'::uuid,50::numeric),
 ('00000000-0000-4000-8000-00000000d832'::uuid,'00000000-0000-4000-8000-00000000d822'::uuid,15::numeric),
 ('00000000-0000-4000-8000-00000000d833'::uuid,'00000000-0000-4000-8000-00000000d823'::uuid,100::numeric),
 ('00000000-0000-4000-8000-00000000d834'::uuid,'00000000-0000-4000-8000-00000000d824'::uuid,20::numeric),
 ('00000000-0000-4000-8000-00000000d835'::uuid,'00000000-0000-4000-8000-00000000d825'::uuid,5::numeric),
 ('00000000-0000-4000-8000-00000000d836'::uuid,'00000000-0000-4000-8000-00000000d826'::uuid,11::numeric),
 ('00000000-0000-4000-8000-00000000d837'::uuid,'00000000-0000-4000-8000-00000000d827'::uuid,20::numeric)
) AS i(item_id,quotation_id,amount);

SET LOCAL ROLE service_role;

DO $setup_accounting$
DECLARE
  v_context pg_temp.w10d_fixture_context%ROWTYPE; v_result record; v_account jsonb;
  v_spec record; v_period jsonb; v_rule jsonb; v_mappings jsonb; v_id uuid;
  v_request integer:=0; v_grant record;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10d_fixture_context;
  IF public.get_accounting_capability(v_context.admin_id,'accounting:manage_ar_bridge') IS NOT FALSE
     OR public.get_accounting_capability(v_context.admin_id,'accounting:prepare_journal') IS NOT FALSE THEN
    RAISE EXCEPTION 'CRM Admin wildcard leaked into W10D accounting authority';
  END IF;
  FOR v_grant IN SELECT * FROM (VALUES
    ('accounting:manage_chart'),('accounting:manage_periods'),('accounting:manage_ar_bridge'),
    ('accounting:manage_inception'),('accounting:view'),('accounting:prepare_journal')
  ) AS g(capability) LOOP
    v_request:=v_request+1;
    SELECT * INTO v_result FROM public.set_accounting_capability(
      v_context.authority_id,v_context.operator_id,v_grant.capability,'ALLOW',NULL,0,
      'Synthetic W10D fixture capability',NULL,pg_temp.w10d_req(55296+v_request));
    IF v_result.error_code IS NOT NULL THEN
      RAISE EXCEPTION 'W10D capability grant failed for %: %',v_grant.capability,v_result.error_code;
    END IF;
  END LOOP;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    v_context.authority_id,v_context.admin_id,'accounting:manage_ar_bridge','ALLOW',NULL,0,
    'Synthetic CRM Admin ALLOW probe',NULL,pg_temp.w10d_req(55320));
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'Admin explicit ALLOW probe failed'; END IF;
  SELECT * INTO v_result FROM public.set_accounting_capability(
    v_context.authority_id,v_context.admin_id,'accounting:manage_ar_bridge','DENY',NULL,1,
    'Synthetic CRM Admin DENY probe',NULL,pg_temp.w10d_req(55321));
  IF v_result.error_code IS NOT NULL
     OR public.get_accounting_capability(v_context.admin_id,'accounting:manage_ar_bridge') IS NOT FALSE THEN
    RAISE EXCEPTION 'explicit W10D DENY did not override ALLOW';
  END IF;

  FOR v_spec IN SELECT * FROM (VALUES
    ('AR_CONTROL','W10D-SYN-AR','Synthetic AR control','حساب ذمم اصطناعي','ASSET','DEBIT',true,'ACCOUNTS_RECEIVABLE'),
    ('CUSTOMER_ADVANCE','W10D-SYN-ADVANCE','Synthetic customer advance','دفعات عميل اصطناعية','LIABILITY','CREDIT',true,'CUSTOMER_ADVANCE'),
    ('CONTRACT_LIABILITY','W10D-SYN-CONTRACT-LIABILITY','Synthetic contract liability','التزام عقد اصطناعي','LIABILITY','CREDIT',true,'CONTRACT_LIABILITY'),
    ('CASH_ACCOUNT','W10D-SYN-CASH','Synthetic cash account','حساب نقد اصطناعي','ASSET','DEBIT',true,'CASH_ACCOUNTABILITY'),
    ('CONTRACT_ASSET','W10D-SYN-CONTRACT-ASSET','Synthetic contract asset','أصل عقد اصطناعي','ASSET','DEBIT',false,'NONE')
  ) AS a(mapping_key,account_code,name_en,name_ar,account_type,normal_balance,is_protected,control_classification) LOOP
    v_account:=jsonb_build_object('account_code',v_spec.account_code,'name_en',v_spec.name_en,
      'name_ar',v_spec.name_ar,'account_type',v_spec.account_type,'category','synthetic',
      'normal_balance',v_spec.normal_balance,'account_kind','POSTING','parent_account_id',NULL,
      'is_active',true,'is_protected',v_spec.is_protected,'control_classification',v_spec.control_classification);
    SELECT * INTO v_result FROM public.save_accounting_account(
      v_context.operator_id,NULL,0,v_account,'Create synthetic W10D bridge account',NULL,
      pg_temp.w10d_req(55552+v_request));
    v_request:=v_request+1;
    IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN
      RAISE EXCEPTION 'W10D account creation failed for %: %',v_spec.mapping_key,v_result.error_code;
    END IF;
    INSERT INTO pg_temp.w10d_fixture_accounts(mapping_key,account_id) VALUES(v_spec.mapping_key,v_result.account_id);
  END LOOP;

  v_period:=jsonb_build_object('start_date','2026-01-01','end_date','2026-12-31','status','OPEN');
  SELECT * INTO v_result FROM public.save_accounting_period(
    v_context.operator_id,NULL,0,v_period,'Create W10D synthetic OPEN period',NULL,pg_temp.w10d_req(55616));
  IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN
    RAISE EXCEPTION 'W10D OPEN period creation failed: %',v_result.error_code;
  END IF;
  UPDATE pg_temp.w10d_fixture_context SET period_id=v_result.period_id,period_version=v_result.version;

  SELECT jsonb_agg(jsonb_build_object(
    'mapping_key',lower(a.mapping_key),'account_id',a.account_id,'account_version',1,
    'allowed_side','EITHER','service_requirement','OPTIONAL') ORDER BY a.mapping_key)
  INTO v_mappings FROM pg_temp.w10d_fixture_accounts a;
  v_rule:=jsonb_build_object('rule_code','W10D_SYN_AR_BRIDGE','name_en','Synthetic W10D AR bridge',
    'name_ar','قاعدة جسر الذمم الاصطناعية','is_active',true,'mappings',v_mappings);
  SELECT * INTO v_result FROM public.save_accounting_posting_rule(
    v_context.operator_id,NULL,0,v_rule,'Create W10D synthetic posting rule',NULL,pg_temp.w10d_req(55617));
  IF v_result.error_code IS NOT NULL OR v_result.version<>1 THEN
    RAISE EXCEPTION 'W10D posting rule creation failed: %',v_result.error_code;
  END IF;
  UPDATE pg_temp.w10d_fixture_context SET rule_id=v_result.posting_rule_id,rule_version=v_result.version;
END;
$setup_accounting$;

DO $source_invoice_setup$
DECLARE
  v_context pg_temp.w10d_fixture_context%ROWTYPE; v_spec record; v_result record; v_invoice_id uuid;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10d_fixture_context;
  FOR v_spec IN SELECT * FROM pg_temp.w10d_fixture_invoice_map ORDER BY label LOOP
    SELECT * INTO v_result FROM public.approve_quotation_and_activate_internal_abs(
      v_spec.quotation_id,'w10d-rollback-operator','admin');
    IF v_result.error_code IS NOT NULL OR NOT v_result.quotation_approved
       OR v_result.approved_billing_scope_id IS NULL THEN
      RAISE EXCEPTION 'W10D synthetic quotation approval failed for %: %',v_spec.label,v_result.error_code;
    END IF;
    SELECT * INTO v_result FROM public.create_invoice_atomic(
      v_spec.service_id,v_spec.quotation_id,'final',NULL,'w10d-rollback-operator','W10D synthetic invoice',
      'not_registered',jsonb_build_object('currency','SAR','fixture',true),
      jsonb_build_object('customer_id',v_context.customer_id,'fixture',true),
      jsonb_build_object('quotation_id',v_spec.quotation_id,'fixture',true),'{}'::jsonb,'{}'::jsonb,
      'w10d-fixture-'||v_spec.label,v_spec.invoice_date,v_spec.invoice_date+30);
    IF v_result.error_code IS NOT NULL OR v_result.invoice_id IS NULL THEN
      RAISE EXCEPTION 'W10D synthetic invoice create failed for %: %',v_spec.label,v_result.error_code;
    END IF;
    v_invoice_id:=v_result.invoice_id;
    SELECT * INTO v_result FROM public.issue_invoice_atomic(v_invoice_id,'w10d-rollback-operator');
    IF v_result.error_code IS NOT NULL OR v_result.invoice_id IS DISTINCT FROM v_invoice_id THEN
      RAISE EXCEPTION 'W10D synthetic invoice issue failed for %: %',v_spec.label,v_result.error_code;
    END IF;
    UPDATE pg_temp.w10d_fixture_invoice_map SET invoice_id=v_invoice_id WHERE label=v_spec.label;
  END LOOP;
END;
$source_invoice_setup$;

DO $rpc_regression$
DECLARE
  v_context pg_temp.w10d_fixture_context%ROWTYPE; v_result record; v_bridge record;
  v_invoice_linked uuid; v_invoice_target uuid; v_invoice_receipt uuid; v_invoice_unsupported uuid;
  v_invoice_covered uuid; v_invoice_future uuid; v_invoice_revenue uuid;
  v_payment_id uuid; v_receipt_id uuid; v_allocation_one uuid; v_allocation_two uuid;
  v_reversal_id uuid; v_credit_id uuid; v_application_id uuid; v_refund_id uuid;
  v_source_scope uuid; v_successor_scope uuid; v_scope_item uuid; v_invoice_amount numeric;
  v_payload jsonb; v_item jsonb; v_package record; v_event_id uuid; v_event_version integer;
  v_prepare record; v_report jsonb; v_event jsonb; v_party jsonb; v_cutoff timestamptz;
  v_cash_count integer; v_allocation_cash_count integer; v_line_count integer;
  v_function_signature text; v_table text; v_manual_journal jsonb;
BEGIN
  SELECT * INTO STRICT v_context FROM pg_temp.w10d_fixture_context;
  SELECT invoice_id INTO STRICT v_invoice_linked FROM pg_temp.w10d_fixture_invoice_map WHERE label='linked_credit';
  SELECT invoice_id INTO STRICT v_invoice_target FROM pg_temp.w10d_fixture_invoice_map WHERE label='application_target';
  SELECT invoice_id INTO STRICT v_invoice_receipt FROM pg_temp.w10d_fixture_invoice_map WHERE label='receipt_target';
  SELECT invoice_id INTO STRICT v_invoice_unsupported FROM pg_temp.w10d_fixture_invoice_map WHERE label='unsupported_invoice';
  SELECT invoice_id INTO STRICT v_invoice_covered FROM pg_temp.w10d_fixture_invoice_map WHERE label='covered_invoice';
  SELECT invoice_id INTO STRICT v_invoice_future FROM pg_temp.w10d_fixture_invoice_map WHERE label='future_accounting';
  SELECT invoice_id INTO STRICT v_invoice_revenue FROM pg_temp.w10d_fixture_invoice_map WHERE label='revenue_correction';

  IF public.get_accounting_capability(v_context.admin_id,'accounting:manage_ar_bridge') IS NOT FALSE
     OR public.get_accounting_capability(v_context.admin_id,'accounting:view') IS NOT FALSE THEN
    RAISE EXCEPTION 'CRM Admin wildcard leaked into W10D accounting authority';
  END IF;
  FOR v_table IN SELECT unnest(ARRAY[
    'accounting_ar_bridge_events','accounting_ar_bridge_event_versions',
    'accounting_ar_bridge_journal_links','accounting_ar_bridge_journal_lines']) LOOP
    IF NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class c
      WHERE c.oid=('public.'||v_table)::regclass)
       OR has_table_privilege('service_role','public.'||v_table,'SELECT')
       OR has_table_privilege('service_role','public.'||v_table,'INSERT') THEN
      RAISE EXCEPTION 'W10D bridge table is not RLS and RPC-only: %',v_table;
    END IF;
  END LOOP;
  FOR v_function_signature IN SELECT unnest(ARRAY[
    'public.save_accounting_ar_bridge_event(uuid,text,uuid,integer,text,date,text,text,text,uuid)',
    'public.prepare_accounting_ar_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid)',
    'public.post_accounting_ar_bridge_journal(uuid,uuid,integer,uuid)',
    'public.get_accounting_ar_bridge_reconciliation(uuid,date,timestamptz,integer)']) LOOP
    IF NOT has_function_privilege('service_role',v_function_signature,'EXECUTE')
       OR has_function_privilege('anon',v_function_signature,'EXECUTE')
       OR has_function_privilege('authenticated',v_function_signature,'EXECUTE') THEN
      RAISE EXCEPTION 'W10D RPC grant boundary is invalid: %',v_function_signature;
    END IF;
  END LOOP;
  BEGIN
    PERFORM 1 FROM public.accounting_ar_bridge_events;
    RAISE EXCEPTION 'service_role unexpectedly read W10D bridge tables directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.accounting_ar_bridge_events(profile_id,source_type,source_record_id,source_record_key,economic_event_key)
      VALUES(v_context.profile_id,'INVOICE',v_invoice_linked,'W10D-SYN-DIRECT','W10D-SYN-DIRECT/AR_EFFECT');
    RAISE EXCEPTION 'service_role unexpectedly wrote W10D bridge data directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'INVOICE',v_invoice_linked,'UNCONDITIONAL_CONTRACT_LIABILITY',CURRENT_DATE,1);
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'INVOICE',v_invoice_target,'UNCONDITIONAL_CONTRACT_LIABILITY',CURRENT_DATE,2);
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'INVOICE',v_invoice_receipt,'UNCONDITIONAL_CONTRACT_LIABILITY',CURRENT_DATE,3);
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'INVOICE',v_invoice_future,'UNCONDITIONAL_CONTRACT_LIABILITY',CURRENT_DATE+1,4);
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'INVOICE',v_invoice_revenue,'UNCONDITIONAL_CONTRACT_LIABILITY',CURRENT_DATE,5);
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_hold(
    'INVOICE',v_invoice_unsupported,'HELD_UNSUPPORTED_ENTITLEMENT','unsupported_entitlement',1);

  SELECT * INTO v_result FROM public.record_invoice_payment(
    v_invoice_covered,1,CURRENT_DATE,'bank_transfer','W10D synthetic pre-origin payment',
    'w10d-rollback-operator',pg_temp.w10d_req(54289));
  IF v_result.error_code IS NOT NULL OR v_result.payment_id IS NULL THEN
    RAISE EXCEPTION 'W10D pre-origin invoice payment source creation failed: %',v_result.error_code;
  END IF;
  v_payment_id:=v_result.payment_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'PAYMENT',v_payment_id,'CUSTOMER_ADVANCE',CURRENT_DATE,22);
  v_allocation_one:=pg_temp.w10d_fixture_allocation_id(v_payment_id,0);
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_hold(
    'ALLOCATION',v_allocation_one,'SETTLEMENT','original_effect_missing',3);
  IF v_bridge.held_code IS DISTINCT FROM 'original_effect_missing' THEN
    RAISE EXCEPTION 'allocation without a posted invoice origin was not held';
  END IF;

  SELECT * INTO v_result FROM public.record_invoice_payment(
    v_invoice_linked,50,CURRENT_DATE-1,'bank_transfer','W10D synthetic linked payment',
    'w10d-rollback-operator',pg_temp.w10d_req(54273));
  IF v_result.error_code IS NOT NULL OR v_result.payment_id IS NULL OR v_result.balance_due<>0 THEN
    RAISE EXCEPTION 'W10D linked legacy payment source creation failed: %',v_result.error_code;
  END IF;
  v_payment_id:=v_result.payment_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'PAYMENT',v_payment_id,'CUSTOMER_ADVANCE',CURRENT_DATE,6);
  v_allocation_one:=pg_temp.w10d_fixture_allocation_id(v_payment_id,0);
  IF v_allocation_one IS NULL OR pg_temp.w10d_fixture_allocation_id(v_payment_id,1) IS NOT NULL THEN
    RAISE EXCEPTION 'invoice-linked payment did not create exactly one W7 allocation';
  END IF;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'ALLOCATION',v_allocation_one,'SETTLEMENT',CURRENT_DATE,7);
  v_cash_count:=pg_temp.w10d_fixture_event_line_count('PAYMENT',v_payment_id,'CASH_ACCOUNT');
  v_allocation_cash_count:=pg_temp.w10d_fixture_event_line_count('ALLOCATION',v_allocation_one,'CASH_ACCOUNT');
  IF v_cash_count<>1 OR v_allocation_cash_count<>0 THEN
    RAISE EXCEPTION 'invoice-linked payment must produce one cash effect';
  END IF;

  SELECT * INTO v_result FROM public.record_customer_receipt(
    v_context.customer_id,20,CURRENT_DATE,'bank_transfer','W10D synthetic independent receipt',
    'W10D rollback fixture','w10d-rollback-operator',pg_temp.w10d_req(54274));
  IF v_result.error_code IS NOT NULL OR v_result.payment_id IS NULL THEN
    RAISE EXCEPTION 'W10D independent receipt source creation failed: %',v_result.error_code;
  END IF;
  v_receipt_id:=v_result.payment_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'RECEIPT',v_receipt_id,'CUSTOMER_ADVANCE',CURRENT_DATE,8);
  SELECT * INTO v_result FROM public.allocate_customer_receipt(
    v_receipt_id,v_invoice_receipt,10,'w10d-rollback-operator',pg_temp.w10d_req(54275));
  IF v_result.error_code IS NOT NULL OR v_result.allocation_id IS NULL OR v_result.receipt_unapplied_amount<>10 THEN
    RAISE EXCEPTION 'partial independent receipt allocation failed: %',v_result.error_code;
  END IF;
  v_allocation_one:=v_result.allocation_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'ALLOCATION',v_allocation_one,'SETTLEMENT',CURRENT_DATE,9);
  SELECT * INTO v_result FROM public.allocate_customer_receipt(
    v_receipt_id,v_invoice_target,10,'w10d-rollback-operator',pg_temp.w10d_req(54276));
  IF v_result.error_code IS NOT NULL OR v_result.allocation_id IS NULL OR v_result.receipt_unapplied_amount<>0 THEN
    RAISE EXCEPTION 'full independent receipt allocation failed: %',v_result.error_code;
  END IF;
  v_allocation_two:=v_result.allocation_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'ALLOCATION',v_allocation_two,'SETTLEMENT',CURRENT_DATE,10);

  SELECT * INTO v_result FROM public.reverse_customer_receipt_allocation(
    v_allocation_two,'Reverse synthetic full receipt allocation','w10d-rollback-operator',pg_temp.w10d_req(54277));
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'full allocation reversal failed: %',v_result.error_code; END IF;
  v_reversal_id:=pg_temp.w10d_fixture_reversal_id('allocation',v_allocation_two);
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'ALLOCATION_REVERSAL',v_reversal_id,'REVERSAL',CURRENT_DATE+1,11);
  SELECT * INTO v_result FROM public.reverse_customer_receipt_allocation(
    v_allocation_one,'Reverse synthetic partial receipt allocation','w10d-rollback-operator',pg_temp.w10d_req(54278));
  IF v_result.error_code IS NOT NULL THEN RAISE EXCEPTION 'partial allocation reversal failed: %',v_result.error_code; END IF;
  v_reversal_id:=pg_temp.w10d_fixture_reversal_id('allocation',v_allocation_one);
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'ALLOCATION_REVERSAL',v_reversal_id,'REVERSAL',CURRENT_DATE+1,12);
  SELECT * INTO v_result FROM public.reverse_customer_receipt(
    v_receipt_id,'Reverse synthetic independent receipt','w10d-rollback-operator',pg_temp.w10d_req(54279));
  IF v_result.error_code IS NOT NULL OR v_result.receipt_status<>'reversed' THEN
    RAISE EXCEPTION 'independent receipt reversal failed: %',v_result.error_code;
  END IF;
  v_reversal_id:=pg_temp.w10d_fixture_reversal_id('receipt',v_receipt_id);
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'RECEIPT_REVERSAL',v_reversal_id,'REVERSAL',CURRENT_DATE+1,13);
  IF NOT pg_temp.w10d_fixture_snapshot_matches('RECEIPT',v_receipt_id) THEN
    RAISE EXCEPTION 'receipt reversal changed the immutable original receipt snapshot';
  END IF;

  SELECT i.approved_billing_scope_id INTO STRICT v_source_scope
  FROM public.invoices i WHERE i.id=v_invoice_linked;
  SELECT * INTO v_result FROM public.create_approved_billing_scope_successor(
    v_source_scope,'customer_scope_revision','W10D synthetic reduced commercial scope',
    'w10d-rollback-operator','admin');
  IF v_result.error_code IS NOT NULL OR v_result.successor_scope_id IS NULL THEN
    RAISE EXCEPTION 'W10D synthetic billing-scope successor failed: %',v_result.error_code;
  END IF;
  v_successor_scope:=v_result.successor_scope_id;
  SELECT id INTO STRICT v_scope_item FROM public.approved_billing_scope_items
    WHERE approved_billing_scope_id=v_successor_scope ORDER BY display_order,id LIMIT 1;
  SELECT * INTO v_result FROM public.edit_approved_billing_scope_item(
    v_successor_scope,v_scope_item,'adjusted',1,40,'customer_scope_revision',
    'W10D synthetic ten-unit reduction',1);
  IF v_result.error_code IS NOT NULL OR v_result.accepted_grand_total<>40 THEN
    RAISE EXCEPTION 'W10D synthetic successor reduction failed: %',v_result.error_code;
  END IF;
  SELECT * INTO v_result FROM public.record_customer_internal_credit_adjustment(
    v_context.customer_id,'00000000-0000-4000-8000-00000000d811',v_invoice_linked,10,
    'customer_scope_reduction','W10D synthetic approved scope reduction',CURRENT_DATE,
    pg_temp.w10d_req(54280),'w10d-rollback-operator',v_source_scope,v_successor_scope);
  IF v_result.error_code IS NOT NULL OR v_result.credit_adjustment_id IS NULL
     OR v_result.customer_credit_balance<>10 THEN
    RAISE EXCEPTION 'supported W10D credit adjustment source creation failed: %',v_result.error_code;
  END IF;
  v_credit_id:=v_result.credit_adjustment_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'CREDIT_ADJUSTMENT',v_credit_id,'CUSTOMER_LIABILITY',CURRENT_DATE,14);

  SELECT * INTO v_result FROM public.apply_customer_credit(
    v_context.customer_id,v_credit_id,v_invoice_target,4,CURRENT_DATE,
    'W10D synthetic credit application',pg_temp.w10d_req(54281),'w10d-rollback-operator');
  IF v_result.error_code IS NOT NULL OR v_result.application_id IS NULL THEN
    RAISE EXCEPTION 'W10D credit application source creation failed: %',v_result.error_code;
  END IF;
  v_application_id:=v_result.application_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'CREDIT_APPLICATION',v_application_id,'SETTLEMENT',CURRENT_DATE,15);
  SELECT * INTO v_result FROM public.reverse_customer_credit_application(
    v_context.customer_id,v_application_id,4,CURRENT_DATE,'Reverse synthetic credit application',
    pg_temp.w10d_req(54282),'w10d-rollback-operator');
  IF v_result.error_code IS NOT NULL OR v_result.reversal_id IS NULL THEN
    RAISE EXCEPTION 'W10D credit application reversal failed: %',v_result.error_code;
  END IF;
  v_reversal_id:=v_result.reversal_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'CREDIT_APPLICATION_REVERSAL',v_reversal_id,'REVERSAL',CURRENT_DATE+1,16);

  SELECT * INTO v_result FROM public.refund_customer_credit(
    v_context.customer_id,v_credit_id,3,CURRENT_DATE,'W10D synthetic customer refund','bank_transfer',
    'W10D synthetic refund',pg_temp.w10d_req(54283),'w10d-rollback-operator');
  IF v_result.error_code IS NOT NULL OR v_result.refund_id IS NULL THEN
    RAISE EXCEPTION 'W10D refund source creation failed: %',v_result.error_code;
  END IF;
  v_refund_id:=v_result.refund_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'REFUND',v_refund_id,'CUSTOMER_LIABILITY_REFUND',CURRENT_DATE,17);
  SELECT * INTO v_result FROM public.reverse_customer_refund(
    v_context.customer_id,v_refund_id,3,CURRENT_DATE,'Reverse synthetic refund',
    pg_temp.w10d_req(54284),'w10d-rollback-operator');
  IF v_result.error_code IS NOT NULL OR v_result.reversal_id IS NULL THEN
    RAISE EXCEPTION 'W10D refund reversal failed: %',v_result.error_code;
  END IF;
  v_reversal_id:=v_result.reversal_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'REFUND_REVERSAL',v_reversal_id,'REVERSAL',CURRENT_DATE+1,18);

  SELECT * INTO v_result FROM public.reverse_customer_internal_credit_adjustment(
    v_context.customer_id,v_credit_id,10,CURRENT_DATE,'Reverse synthetic customer liability',
    pg_temp.w10d_req(54285),'w10d-rollback-operator');
  IF v_result.error_code IS NOT NULL OR v_result.reversal_id IS NULL THEN
    RAISE EXCEPTION 'W10D credit adjustment reversal failed: %',v_result.error_code;
  END IF;
  v_reversal_id:=v_result.reversal_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'CREDIT_ADJUSTMENT_REVERSAL',v_reversal_id,'REVERSAL',CURRENT_DATE+1,19);

  SELECT * INTO v_result FROM public.record_invoice_payment(
    v_invoice_revenue,20,CURRENT_DATE,'bank_transfer','W10D synthetic correction settlement',
    'w10d-rollback-operator',pg_temp.w10d_req(54286));
  IF v_result.error_code IS NOT NULL OR v_result.payment_id IS NULL THEN
    RAISE EXCEPTION 'W10D synthetic revenue correction settlement failed: %',v_result.error_code;
  END IF;
  v_payment_id:=v_result.payment_id;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'PAYMENT',v_payment_id,'CUSTOMER_ADVANCE',CURRENT_DATE,20);
  v_allocation_one:=pg_temp.w10d_fixture_allocation_id(v_payment_id,0);
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_post(
    'ALLOCATION',v_allocation_one,'SETTLEMENT',CURRENT_DATE,21);
  SELECT * INTO v_result FROM public.record_customer_internal_credit_adjustment(
    '00000000-0000-4000-8000-00000000d818','00000000-0000-4000-8000-00000000d817',
    v_invoice_revenue,5,'pricing_correction','W10D synthetic unsupported revenue correction',CURRENT_DATE,
    pg_temp.w10d_req(54287),'w10d-rollback-operator',NULL,NULL);
  IF v_result.error_code IS NOT NULL OR v_result.credit_adjustment_id IS NULL THEN
    RAISE EXCEPTION 'W10D unsupported revenue correction source creation failed: %',v_result.error_code;
  END IF;
  SELECT * INTO v_bridge FROM pg_temp.w10d_fixture_hold(
    'CREDIT_ADJUSTMENT',v_result.credit_adjustment_id,'HELD_REVENUE_CORRECTION','revenue_correction_required',2);

  v_payload:=jsonb_build_object(
    'accounting_start_date','2000-01-01','cutover_boundary_date','2000-12-31',
    'evidence_inventory','[]'::jsonb,'reconciliation_references','[]'::jsonb,
    'items',jsonb_build_array(jsonb_build_object(
      'item_id','00000000-0000-4000-8000-00000000d890','source_domain','W7',
      'source_record_key','W7/INVOICE/'||v_invoice_covered::text,
      'economic_event_key','W7/INVOICE/'||v_invoice_covered::text||'/AR_EFFECT',
      'classification','UNRESOLVED','resolution_state','UNRESOLVED','is_material',true,
      'reconciliation_category','OTHER','reconciliation_reference',NULL,
      'party_type','NONE','party_reference',NULL,'evidence_refs','[]'::jsonb,'journal',NULL)));
  SELECT * INTO v_package FROM public.save_accounting_inception_package(
    v_context.operator_id,NULL,0,v_payload,'Create W10D coverage replay guard',pg_temp.w10d_req(54288));
  IF v_package.error_code IS NOT NULL OR v_package.package_id IS NULL THEN
    RAISE EXCEPTION 'W10D inception coverage setup failed: %',v_package.error_code;
  END IF;
  SELECT * INTO v_result FROM public.save_accounting_ar_bridge_event(
    v_context.operator_id,'INVOICE',v_invoice_covered,0,'UNCONDITIONAL_CONTRACT_LIABILITY',CURRENT_DATE,
    'synthetic://w10d/coverage/'||v_invoice_covered::text,repeat('d',64),
    'W10D covered invoice replay probe',pg_temp.w10d_req(53280));
  IF v_result.error_code IS NOT NULL OR v_result.status<>'READY' THEN
    RAISE EXCEPTION 'W10D covered source classification failed: %',v_result.error_code;
  END IF;
  SELECT * INTO v_prepare FROM public.prepare_accounting_ar_bridge_event(
    v_context.operator_id,v_result.event_id,v_result.version,v_context.period_id,v_context.period_version,
    v_context.rule_id,v_context.rule_version,'Reject inception-covered replay',pg_temp.w10d_req(53536));
  IF v_prepare.error_code IS DISTINCT FROM 'duplicate_coverage' THEN
    RAISE EXCEPTION 'inception-covered event was not rejected';
  END IF;

  v_manual_journal:=jsonb_build_object('accounting_date',CURRENT_DATE,
    'period_id',v_context.period_id,'period_version',v_context.period_version,
    'posting_rule_id',v_context.rule_id,'rule_version',v_context.rule_version,
    'source_record_key','W10D-SYN-MANUAL-AR-BYPASS','economic_event_key','W10D-SYN-MANUAL-AR-BYPASS/EFFECT',
    'posting_purpose','w10d-protected-account-bypass-probe',
    'description_en','Synthetic manual protected AR probe','description_ar','اختبار ذمم يدوي اصطناعي',
    'lines',jsonb_build_array(
      jsonb_build_object('mapping_key','ar_control','side','DEBIT','amount_halalah','1000','service_id',NULL,
        'description_en','Protected AR debit','description_ar','مدين ذمم محمي'),
      jsonb_build_object('mapping_key','contract_liability','side','CREDIT','amount_halalah','1000','service_id',NULL,
        'description_en','Contract liability credit','description_ar','دائن التزام عقد')));
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    v_context.operator_id,NULL,0,v_manual_journal,'W10D manual AR bypass probe',NULL,pg_temp.w10d_req(54800));
  IF v_result.error_code IS DISTINCT FROM 'account_not_posting' OR v_result.journal_id IS NOT NULL THEN
    RAISE EXCEPTION 'protected AR control bypass was accepted';
  END IF;

  v_report:=public.get_accounting_ar_bridge_reconciliation(
    v_context.operator_id,CURRENT_DATE+1,clock_timestamp(),1);
  IF v_report->>'truncated'<>'true' OR jsonb_array_length(v_report->'events')>1 THEN
    RAISE EXCEPTION 'bounded W10D reconciliation limit was not enforced';
  END IF;
  v_report:=public.get_accounting_ar_bridge_reconciliation(
    v_context.operator_id,CURRENT_DATE+1,clock_timestamp(),500);
  IF v_report->>'state'<>'READY' THEN RAISE EXCEPTION 'W10D AR reconciliation did not return READY'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(v_report->'events') e
      WHERE e->>'source_type'='CREDIT_ADJUSTMENT' AND e->>'held_code'='revenue_correction_required')=0 THEN
    RAISE EXCEPTION 'W10D reconciliation omitted explicitly held revenue correction';
  END IF;
  SELECT e INTO v_event FROM jsonb_array_elements(v_report->'events') e
    WHERE e->>'source_record_id'=v_invoice_future::text;
  IF v_event IS NULL OR v_event->>'reconciliation_status'<>'POSTED'
     OR v_event->>'posted_accounting_date' IS DISTINCT FROM (CURRENT_DATE+1)::text THEN
    RAISE EXCEPTION 'W10D accounting-date as-of report did not include the entry at its date';
  END IF;
  SELECT e INTO v_event FROM jsonb_array_elements(v_report->'events') e
    WHERE e->>'source_record_id'=v_invoice_receipt::text;
  IF v_event IS NULL OR v_event->>'reconciliation_status'<>'POSTED'
     OR v_event->>'expected_ar_delta_halalah' IS DISTINCT FROM v_event->>'posted_ar_delta_halalah' THEN
    RAISE EXCEPTION 'AR party reconciliation is not balanced';
  END IF;
  SELECT p INTO v_party FROM jsonb_array_elements(v_report->'party_balances') p
    WHERE p->>'invoice_id'=v_invoice_receipt::text;
  IF v_party IS NULL OR v_party->>'difference_halalah'<>'0' THEN
    RAISE EXCEPTION 'AR party reconciliation is not balanced';
  END IF;

  v_report:=public.get_accounting_ar_bridge_reconciliation(
    v_context.operator_id,CURRENT_DATE,clock_timestamp(),500);
  SELECT e INTO v_event FROM jsonb_array_elements(v_report->'events') e
    WHERE e->>'source_record_id'=v_invoice_future::text;
  IF v_event IS NULL OR v_event->>'posted_accounting_date' IS NOT NULL
     OR v_event->>'posted_ar_delta_halalah'<>'0' THEN
    RAISE EXCEPTION 'accounting-date cutoff included a future entry';
  END IF;
  SELECT e INTO v_event FROM jsonb_array_elements(v_report->'events') e
    WHERE e->>'source_record_id'=pg_temp.w10d_fixture_reversal_id('allocation',v_allocation_two)::text;
  IF v_event IS NULL OR v_event->>'posted_accounting_date' IS NOT NULL THEN
    RAISE EXCEPTION 'historical cutoff included a later allocation reversal';
  END IF;
  SELECT e INTO v_event FROM jsonb_array_elements(v_report->'events') e
    WHERE e->>'source_record_id'=v_allocation_two::text;
  IF v_event IS NULL OR v_event->>'posted_accounting_date' IS DISTINCT FROM CURRENT_DATE::text THEN
    RAISE EXCEPTION 'historical cutoff omitted the original allocation effect';
  END IF;

  v_cutoff:=transaction_timestamp()-interval '1 second';
  v_report:=public.get_accounting_ar_bridge_reconciliation(
    v_context.operator_id,CURRENT_DATE+30,v_cutoff,500);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_report->'events') e
      WHERE e->>'source_record_id'=v_invoice_linked::text) THEN
    RAISE EXCEPTION 'recorded-at cutoff included a future event';
  END IF;

  SELECT * INTO v_result FROM public.get_accounting_trial_balance(
    v_context.operator_id,CURRENT_DATE+30,clock_timestamp(),NULL,0,100);
  IF v_result.report->>'debits_equal_credits'<>'true'
     OR v_result.report->>'debit_balance_total_halalah' IS DISTINCT FROM
       v_result.report->>'credit_balance_total_halalah' THEN
    RAISE EXCEPTION 'trial balance is not balanced';
  END IF;
END;
$rpc_regression$;
RESET ROLE;

ROLLBACK;

DO $residue_assertion$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10d-rollback-%')
     OR EXISTS (SELECT 1 FROM public.customers WHERE customer_number LIKE 'W10D-SYN-%')
     OR EXISTS (SELECT 1 FROM public.services WHERE service_number LIKE 'SVC-2099-81__')
     OR EXISTS (SELECT 1 FROM public.quotations WHERE quotation_number LIKE 'W10D-SYN-Q-%')
     OR EXISTS (SELECT 1 FROM public.invoices i JOIN public.services s ON s.id=i.service_id
       WHERE s.service_number LIKE 'SVC-2099-81__')
     OR EXISTS (SELECT 1 FROM public.payments p JOIN public.customers c ON c.id=p.customer_id
       WHERE c.customer_number LIKE 'W10D-SYN-%')
     OR EXISTS (SELECT 1 FROM public.customer_receipt_allocations a
       JOIN public.customers c ON c.id=a.customer_id WHERE c.customer_number LIKE 'W10D-SYN-%')
     OR EXISTS (SELECT 1 FROM public.customer_internal_credit_adjustments a
       WHERE a.customer_id IN (SELECT id FROM public.customers WHERE customer_number LIKE 'W10D-SYN-%'))
     OR EXISTS (SELECT 1 FROM public.customer_credit_applications a
       WHERE a.customer_id IN (SELECT id FROM public.customers WHERE customer_number LIKE 'W10D-SYN-%'))
     OR EXISTS (SELECT 1 FROM public.customer_refunds r
       WHERE r.customer_id IN (SELECT id FROM public.customers WHERE customer_number LIKE 'W10D-SYN-%'))
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000d800')
     OR EXISTS (SELECT 1 FROM public.accounting_account_versions WHERE account_code LIKE 'W10D-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_period_versions
       WHERE start_date='2026-01-01' AND end_date='2026-12-31')
     OR EXISTS (SELECT 1 FROM public.accounting_posting_rules WHERE rule_code='W10D_SYN_AR_BRIDGE')
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_events)
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_event_versions)
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_journal_links)
     OR EXISTS (SELECT 1 FROM public.accounting_ar_bridge_journal_lines)
     OR EXISTS (SELECT 1 FROM public.accounting_source_effects WHERE source_domain='AR_BRIDGE')
     OR EXISTS (SELECT 1 FROM public.customer_receipt_reversals r
       JOIN public.payments p ON p.id=r.payment_id JOIN public.customers c ON c.id=p.customer_id
       WHERE c.customer_number LIKE 'W10D-SYN-%')
     OR EXISTS (SELECT 1 FROM public.customer_receipt_allocation_reversals r
       JOIN public.customer_receipt_allocations a ON a.id=r.allocation_id
       JOIN public.customers c ON c.id=a.customer_id WHERE c.customer_number LIKE 'W10D-SYN-%')
     OR EXISTS (SELECT 1 FROM public.customer_internal_credit_adjustment_reversals r
       JOIN public.customer_internal_credit_adjustments a ON a.id=r.source_credit_adjustment_id
       JOIN public.customers c ON c.id=a.customer_id WHERE c.customer_number LIKE 'W10D-SYN-%')
     OR EXISTS (SELECT 1 FROM public.customer_credit_application_reversals r
       JOIN public.customer_credit_applications a ON a.id=r.source_application_id
       JOIN public.customers c ON c.id=a.customer_id WHERE c.customer_number LIKE 'W10D-SYN-%')
     OR EXISTS (SELECT 1 FROM public.customer_refund_reversals r
       JOIN public.customer_refunds a ON a.id=r.source_refund_id
       JOIN public.customers c ON c.id=a.customer_id WHERE c.customer_number LIKE 'W10D-SYN-%')
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000d000'
         AND '00000000-0000-4000-8000-00000000dfff')
     OR EXISTS (SELECT 1 FROM public.accounting_journal_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000d000'
         AND '00000000-0000-4000-8000-00000000dfff')
     OR EXISTS (SELECT 1 FROM public.accounting_capability_events
       WHERE request_id BETWEEN '00000000-0000-4000-8000-00000000d000'
         AND '00000000-0000-4000-8000-00000000dfff')
     OR EXISTS (SELECT 1 FROM public.audit_logs
       WHERE details->>'request_id' BETWEEN '00000000-0000-4000-8000-00000000d000'
         AND '00000000-0000-4000-8000-00000000dfff') THEN
    RAISE EXCEPTION 'W10D synthetic residue detected after rollback';
  END IF;
END;
$residue_assertion$;
