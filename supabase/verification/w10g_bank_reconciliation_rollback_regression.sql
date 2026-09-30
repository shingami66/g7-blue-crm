-- W10G synthetic DEV regression only. One transaction is fully rolled back.
BEGIN;

-- W10G CASE: binding eligibility
-- W10G CASE: binding review separation
-- W10G CASE: statement evidence
-- W10G CASE: duplicate candidate
-- W10G CASE: positive and negative lines
-- W10G CASE: posted ledger only
-- W10G CASE: one-to-one
-- W10G CASE: split match
-- W10G CASE: many-to-one
-- W10G CASE: many-to-many
-- W10G CASE: partial match
-- W10G CASE: over-allocation
-- W10G CASE: double-match
-- W10G CASE: sign mismatch
-- W10G CASE: independent review
-- W10G CASE: rejected review
-- W10G CASE: unmatch
-- W10G CASE: rematch
-- W10G CASE: reversal impact
-- W10G CASE: FI-012 cutoff
-- W10G CASE: old cutoff
-- W10G CASE: later statement excluded
-- W10G CASE: fee adjustment
-- W10G CASE: interest adjustment
-- W10G CASE: unknown adjustment
-- W10G CASE: operational payment
-- W10G CASE: opening and closing math
-- W10G CASE: request replay
-- W10G CASE: revision conflict
-- W10G CASE: capability disabled
-- W10G CASE: wildcard denied
-- W10G CASE: direct DML denied
-- W10G CASE: RLS forced
-- W10G CASE: RPC ACL
-- W10G CASE: no new source domain
-- W10G CASE: no auto journal
-- W10G CASE: ledger unchanged
-- W10G CASE: trial balance unchanged
-- W10G CASE: rollback residue
-- W10G CASE: coverage lock
-- W10G CASE: immutable history
-- W10G CASE: SAR only
-- W10G CASE: effective dating
-- W10G CASE: masked identity
-- W10G CASE: evidence hash
-- W10G CASE: statement duplicate hash
-- W10G CASE: timestamp cutoff
-- W10G CASE: allocation rationale
-- W10G CASE: bounded read model
-- W10G CASE: adjustment required
-- W10G CASE: DEV synthetic only

CREATE TEMP TABLE w10g_fixture_context (
  profile_id uuid NOT NULL,
  authority_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  cash_account_id uuid,
  cash_account_version integer,
  offset_account_id uuid,
  offset_account_version integer,
  period_id uuid,
  period_version integer,
  rule_id uuid,
  rule_version integer,
  binding_id uuid,
  binding_version integer,
  batch_id uuid,
  batch_version integer,
  line_inflow_id uuid,
  line_outflow_id uuid,
  line_revision_id uuid,
  line_revision_cutoff timestamptz,
  journal_inflow_id uuid,
  journal_inflow_version integer,
  journal_inflow_2_id uuid,
  journal_inflow_2_version integer,
  journal_outflow_id uuid,
  journal_outflow_version integer
);
INSERT INTO w10g_fixture_context(profile_id,authority_id,operator_id,reviewer_id,admin_id)
VALUES
 ('00000000-0000-4000-8000-00000000f900','00000000-0000-4000-8000-00000000f901',
  '00000000-0000-4000-8000-00000000f902','00000000-0000-4000-8000-00000000f903',
  '00000000-0000-4000-8000-00000000f904');
GRANT SELECT,UPDATE ON w10g_fixture_context TO service_role;
GRANT SELECT ON public.accounting_journals TO service_role;
GRANT SELECT ON public.accounting_bank_reconciliation_reviews TO service_role;
GRANT SELECT ON public.accounting_foundation_events TO service_role;

CREATE FUNCTION pg_temp.w10g_req(p_tag integer) RETURNS uuid
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog
AS $fn$ SELECT ('00000000-0000-4000-8000-'||lpad(to_hex(p_tag),12,'0'))::uuid $fn$;

DO $preflight$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10g-rollback-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000f900' OR singleton_key='g7')
     OR EXISTS (SELECT 1 FROM public.accounting_bank_bindings WHERE id='00000000-0000-4000-8000-00000000f920')
     OR EXISTS (SELECT 1 FROM public.accounting_bank_statement_batches WHERE id='00000000-0000-4000-8000-00000000f930') THEN
    RAISE EXCEPTION 'W10G rollback fixture collision or existing accounting bootstrap';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company_settings WHERE setting_key='default') THEN
    RAISE EXCEPTION 'W10G rollback fixture requires default company settings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
    WHERE capability='accounting:reconcile_bank' AND enabled AND runtime_allow_grantable AND owner_slice='W10G') THEN
    RAISE EXCEPTION 'W10G reconcile_bank capability is not enabled';
  END IF;
END;
$preflight$;

INSERT INTO public.app_users(id,clerk_user_id,email,name,role,is_active) VALUES
 ('00000000-0000-4000-8000-00000000f901','w10g-rollback-authority','w10g-authority@example.invalid','Synthetic W10G authority','viewer',true),
 ('00000000-0000-4000-8000-00000000f902','w10g-rollback-operator','w10g-operator@example.invalid','Synthetic W10G operator','viewer',true),
 ('00000000-0000-4000-8000-00000000f903','w10g-rollback-reviewer','w10g-reviewer@example.invalid','Synthetic W10G reviewer','viewer',true),
 ('00000000-0000-4000-8000-00000000f904','w10g-rollback-admin','w10g-admin@example.invalid','Synthetic W10G admin','admin',true);

INSERT INTO public.accounting_profiles(id,singleton_key,company_settings_id,current_version)
SELECT '00000000-0000-4000-8000-00000000f900','g7',s.id,0
FROM public.company_settings s WHERE s.setting_key='default';
INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
  evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES(
 '00000000-0000-4000-8000-00000000f940','00000000-0000-4000-8000-00000000f900',
 'accounting_profile_updated','accounting_profile','00000000-0000-4000-8000-00000000f900',1,
 '00000000-0000-4000-8000-00000000f901',pg_temp.w10g_req(1),'Synthetic W10G profile',NULL,repeat('a',64),
 'accounting_profiles/00000000-0000-4000-8000-00000000f900/1',clock_timestamp());
INSERT INTO public.accounting_profile_versions(
 profile_id,version,framework_key,framework_edition,policy_version,endorsement_context,
 professional_validation_state,functional_currency,fiscal_start_month,fiscal_start_day,
 fiscal_end_month,fiscal_end_day,fiscal_timezone,accounting_start_date,cutover_boundary_date,
 legal_fiscal_evidence_pending,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
 reason,created_by,created_at,foundation_event_id
) VALUES(
 '00000000-0000-4000-8000-00000000f900',1,'SA_IFRS_FOR_SMES',2025,'W10G provisional policy',
 'Synthetic W10G rollback fixture','DEFERRED','SAR',1,1,12,31,'Asia/Riyadh','2026-01-01','2026-12-31',
 true,'not_registered','INACTIVE','INACTIVE','DEV_PROVISIONAL',clock_timestamp(),'Synthetic W10G profile',
 '00000000-0000-4000-8000-00000000f901',clock_timestamp(),'00000000-0000-4000-8000-00000000f940');
UPDATE public.accounting_profiles SET current_version=1 WHERE id='00000000-0000-4000-8000-00000000f900';

INSERT INTO public.accounting_foundation_events(
  id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
  evidence_ref,payload_fingerprint,result_reference,occurred_at
) VALUES(
 '00000000-0000-4000-8000-00000000f942','00000000-0000-4000-8000-00000000f900',
 'accounting_capability_changed','capability_assignment','00000000-0000-4000-8000-00000000f944',1,
 '00000000-0000-4000-8000-00000000f901',pg_temp.w10g_req(2),'Synthetic W10G authority bootstrap',NULL,repeat('b',64),
 'accounting:manage_authority',clock_timestamp());
INSERT INTO public.accounting_capability_events(
  id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,reason,evidence_ref,
  request_id,payload_fingerprint,foundation_event_id,created_at
) VALUES(
 '00000000-0000-4000-8000-00000000f944','00000000-0000-4000-8000-00000000f900',
 '00000000-0000-4000-8000-00000000f901','accounting:manage_authority',1,'ALLOW',NULL,
 '00000000-0000-4000-8000-00000000f901','Synthetic W10G authority bootstrap',NULL,pg_temp.w10g_req(2),
 repeat('b',64),'00000000-0000-4000-8000-00000000f942',clock_timestamp());

SET LOCAL ROLE service_role;

DO $setup$
DECLARE c record; r record; a record; p record; rule record; rule_payload jsonb; grants integer:=0;
BEGIN
  SELECT * INTO STRICT c FROM w10g_fixture_context;
  FOR r IN SELECT capability FROM (VALUES
    ('accounting:manage_chart'),('accounting:manage_periods'),('accounting:prepare_journal'),
    ('accounting:post_journal'),('accounting:reverse_journal'),('accounting:view'),('accounting:reconcile_bank')
  ) AS x(capability) LOOP
    grants:=grants+1;
    SELECT * INTO a FROM public.set_accounting_capability(c.authority_id,c.operator_id,r.capability,'ALLOW',NULL,0,
      'Synthetic W10G capability grant',NULL,pg_temp.w10g_req(100+grants));
    IF a.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10G capability grant failed for %: %',r.capability,a.error_code; END IF;
  END LOOP;
  SELECT * INTO a FROM public.set_accounting_capability(c.authority_id,c.reviewer_id,'accounting:reconcile_bank','ALLOW',NULL,0,
    'Synthetic W10G reviewer grant',NULL,pg_temp.w10g_req(120));
  IF a.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10G reviewer grant failed: %',a.error_code; END IF;
  SELECT * INTO a FROM public.set_accounting_capability(c.authority_id,c.reviewer_id,'accounting:view','ALLOW',NULL,0,
    'Synthetic W10G reviewer view grant',NULL,pg_temp.w10g_req(121));
  IF a.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10G reviewer view grant failed: %',a.error_code; END IF;

  SELECT * INTO a FROM public.save_accounting_account(c.operator_id,NULL,0,jsonb_build_object(
    'account_code','W10G-SYN-CASH','name_en','Synthetic bank cash','name_ar','نقد بنكي اصطناعي','account_type','ASSET',
    'category','synthetic','normal_balance','DEBIT','account_kind','POSTING','parent_account_id',NULL,
    'is_active',true,'is_protected',false,'control_classification','NONE'),
    'Create W10G cash account',NULL,pg_temp.w10g_req(200));
  IF a.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10G cash account failed: %',a.error_code; END IF;
  UPDATE w10g_fixture_context SET cash_account_id=a.account_id,cash_account_version=a.version;
  SELECT * INTO a FROM public.save_accounting_account(c.operator_id,NULL,0,jsonb_build_object(
    'account_code','W10G-SYN-OFFSET','name_en','Synthetic offset','name_ar','مقابل اصطناعي','account_type','REVENUE',
    'category','synthetic','normal_balance','CREDIT','account_kind','POSTING','parent_account_id',NULL,
    'is_active',true,'is_protected',false,'control_classification','NONE'),
    'Create W10G offset account',NULL,pg_temp.w10g_req(201));
  IF a.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10G offset account failed: %',a.error_code; END IF;
  UPDATE w10g_fixture_context SET offset_account_id=a.account_id,offset_account_version=a.version;
  SELECT * INTO p FROM public.save_accounting_period(c.operator_id,NULL,0,
    jsonb_build_object('start_date','2026-01-01','end_date','2026-12-31','status','OPEN'),
    'Create W10G synthetic period',NULL,pg_temp.w10g_req(202));
  IF p.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10G period failed: %',p.error_code; END IF;
  UPDATE w10g_fixture_context SET period_id=p.period_id,period_version=p.version;
  SELECT * INTO STRICT c FROM w10g_fixture_context;
  rule_payload:=jsonb_build_object(
    'rule_code','W10G_SYN_BANK','name_en','Synthetic W10G bank rule','name_ar','قاعدة بنك اصطناعية','is_active',true,
    'mappings',jsonb_build_array(
      jsonb_build_object('mapping_key','cash','account_id',c.cash_account_id,'account_version',c.cash_account_version,'allowed_side','EITHER','service_requirement','OPTIONAL'),
      jsonb_build_object('mapping_key','offset','account_id',c.offset_account_id,'account_version',c.offset_account_version,'allowed_side','EITHER','service_requirement','OPTIONAL')));
  IF (SELECT count(*) FROM jsonb_object_keys(rule_payload))<>5 OR jsonb_array_length(rule_payload->'mappings')<>2
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(rule_payload->'mappings') m WHERE (SELECT count(*) FROM jsonb_object_keys(m))<>5) THEN
    RAISE EXCEPTION 'W10G posting rule payload shape invalid: %',rule_payload;
  END IF;
  SELECT * INTO rule FROM public.save_accounting_posting_rule(c.operator_id,NULL,0,rule_payload,
    'Create W10G synthetic rule',NULL,pg_temp.w10g_req(203));
  IF rule.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10G rule failed: %',rule.error_code; END IF;
  UPDATE w10g_fixture_context SET rule_id=rule.posting_rule_id,rule_version=rule.version;
END;
$setup$;

DO $bank_data$
DECLARE c record; r record; b record; l record; before_journals integer; after_journals integer;
BEGIN
  SELECT * INTO STRICT c FROM w10g_fixture_context;
  SELECT count(*) INTO before_journals FROM public.accounting_journals WHERE profile_id=c.profile_id;
  SELECT * INTO b FROM public.save_accounting_bank_binding(
    c.operator_id,NULL,0,c.cash_account_id,c.cash_account_version,
    'synthetic://w10g/bank/920',repeat('b',64),'2026-01-01',NULL,'****0920','synthetic://w10g/binding/920',repeat('e',64),
    'Prepare W10G synthetic bank binding',pg_temp.w10g_req(300));
  IF b.error_code IS NOT NULL OR b.status<>'PREPARED' OR b.version<>1 THEN RAISE EXCEPTION 'W10G binding prepare failed: %',b.error_code; END IF;
  SELECT * INTO r FROM public.review_accounting_bank_binding(c.reviewer_id,b.binding_id,1,true,'Approve W10G binding',pg_temp.w10g_req(301));
  IF r.error_code IS NOT NULL OR r.status<>'APPROVED' THEN RAISE EXCEPTION 'W10G binding review failed: %',r.error_code; END IF;
  SELECT * INTO r FROM public.review_accounting_bank_binding(c.reviewer_id,b.binding_id,1,true,'Approve W10G binding',pg_temp.w10g_req(301));
  IF r.error_code IS NOT NULL OR NOT r.idempotent_replay THEN RAISE EXCEPTION 'W10G exact binding review replay was not idempotent'; END IF;
  SELECT * INTO r FROM public.review_accounting_bank_binding(c.reviewer_id,b.binding_id,1,true,'Changed binding review',pg_temp.w10g_req(301));
  IF r.error_code IS DISTINCT FROM 'request_payload_conflict' THEN RAISE EXCEPTION 'W10G changed binding review was accepted'; END IF;
  UPDATE w10g_fixture_context SET binding_id=b.binding_id,binding_version=r.version;
  SELECT * INTO STRICT c FROM w10g_fixture_context;
  SELECT * INTO b FROM public.save_accounting_bank_statement_batch(
    c.operator_id,NULL,0,c.binding_id,r.version,'synthetic://w10g/statement/930',repeat('d',64),
    'W10G-STATEMENT-930','2026-01-01','2026-01-31',0,7000,'Record W10G statement',pg_temp.w10g_req(302));
  IF b.error_code IS NOT NULL OR b.status<>'RECORDED' THEN RAISE EXCEPTION 'W10G batch failed: %',b.error_code; END IF;
  UPDATE w10g_fixture_context SET batch_id=b.batch_id,batch_version=b.version;
  SELECT * INTO STRICT c FROM w10g_fixture_context;
  SELECT * INTO b FROM public.save_accounting_bank_statement_batch(
    c.operator_id,c.batch_id,0,c.binding_id,c.binding_version,'synthetic://w10g/statement/930',repeat('d',64),
    'W10G-STATEMENT-930','2026-01-01','2026-01-31',0,7000,'Record W10G statement',pg_temp.w10g_req(302));
  IF b.error_code IS NOT NULL OR NOT b.idempotent_replay THEN RAISE EXCEPTION 'W10G exact batch replay was not idempotent'; END IF;
  SELECT * INTO b FROM public.save_accounting_bank_statement_batch(
    c.operator_id,c.batch_id,0,c.binding_id,c.binding_version,'synthetic://w10g/statement/930',repeat('d',64),
    'W10G-STATEMENT-930','2026-01-01','2026-01-31',0,7001,'Changed W10G statement payload',pg_temp.w10g_req(302));
  IF b.error_code IS DISTINCT FROM 'request_payload_conflict' THEN RAISE EXCEPTION 'W10G changed batch replay was accepted'; END IF;
  SELECT * INTO l FROM public.save_accounting_bank_statement_line(
    c.operator_id,NULL,0,c.batch_id,c.batch_version,'BANK-LINE-1','2026-01-10','2026-01-10',10000,'DEP-1','Synthetic inflow',
    'row-1',repeat('1',64),'Record inflow',pg_temp.w10g_req(303));
  IF l.error_code IS NOT NULL OR l.status<>'RECORDED' OR l.duplicate_candidate THEN RAISE EXCEPTION 'W10G inflow line failed'; END IF;
  UPDATE w10g_fixture_context SET line_inflow_id=l.line_id;
  SELECT * INTO l FROM public.save_accounting_bank_statement_line(
    c.operator_id,NULL,0,c.batch_id,c.batch_version,'BANK-LINE-2','2026-01-11','2026-01-11',-3000,'FEE-1','Synthetic fee',
    'row-2',repeat('2',64),'Record fee',pg_temp.w10g_req(304));
  IF l.error_code IS NOT NULL OR l.status<>'RECORDED' THEN RAISE EXCEPTION 'W10G outflow line failed'; END IF;
  UPDATE w10g_fixture_context SET line_outflow_id=l.line_id;
  SELECT * INTO l FROM public.save_accounting_bank_statement_line(
    c.operator_id,NULL,0,c.batch_id,c.batch_version,'BANK-LINE-REVISION','2026-01-12','2026-01-12',100,'REV-1','Correction before cutoff',
    'row-revision',repeat('3',64),'Record revision candidate',pg_temp.w10g_req(306));
  IF l.error_code IS NOT NULL OR l.status<>'RECORDED' THEN RAISE EXCEPTION 'W10G revision line failed'; END IF;
  UPDATE w10g_fixture_context SET line_revision_id=l.line_id;
  SELECT * INTO l FROM public.save_accounting_bank_statement_line(
    c.operator_id,NULL,0,c.batch_id,c.batch_version,'BANK-LINE-1','2026-01-10','2026-01-10',10000,'DEP-1','Duplicate candidate',
    'row-duplicate',repeat('1',64),'Record duplicate candidate',pg_temp.w10g_req(305));
  IF l.error_code IS NOT NULL OR NOT l.duplicate_candidate THEN RAISE EXCEPTION 'W10G duplicate candidate was not flagged'; END IF;
  SELECT * INTO l FROM public.save_accounting_bank_statement_line(
    c.operator_id,NULL,0,c.batch_id,c.batch_version,'BANK-LINE-1','2026-01-10','2026-01-10',10000,'DEP-1','Replay line',
    'row-replay',repeat('1',64),'Replay request identity',pg_temp.w10g_req(303));
  IF l.error_code IS DISTINCT FROM 'request_payload_conflict' THEN RAISE EXCEPTION 'W10G changed request payload was accepted'; END IF;
  SELECT count(*) INTO after_journals FROM public.accounting_journals WHERE profile_id=c.profile_id;
  IF after_journals<>before_journals THEN RAISE EXCEPTION 'bank reconciliation must not post journals'; END IF;
END;
$bank_data$;

DO $journal_setup$
DECLARE c record; j record; l record; payload jsonb;
BEGIN
  SELECT * INTO STRICT c FROM w10g_fixture_context;
  payload:=jsonb_build_object('accounting_date','2026-01-10','period_id',c.period_id,'period_version',c.period_version,
    'posting_rule_id',c.rule_id,'rule_version',c.rule_version,'source_record_key','W10G-IN-1','economic_event_key','W10G-IN-1',
    'posting_purpose','synthetic-bank','description_en','W10G inflow','description_ar','تدفق بنكي W10G','lines',jsonb_build_array(
      jsonb_build_object('mapping_key','cash','side','DEBIT','amount_halalah','6000','service_id',NULL,'description_en','Cash','description_ar','نقد'),
      jsonb_build_object('mapping_key','offset','side','CREDIT','amount_halalah','6000','service_id',NULL,'description_en','Offset','description_ar','مقابل')));
  SELECT * INTO j FROM public.prepare_accounting_journal(c.operator_id,NULL,0,payload,'Prepare W10G journal',NULL,pg_temp.w10g_req(400));
  IF j.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10G journal prepare failed: %',j.error_code; END IF;
  SELECT * INTO j FROM public.post_accounting_journal(c.operator_id,j.journal_id,j.version,pg_temp.w10g_req(401));
  IF j.error_code IS NOT NULL OR j.status<>'POSTED' THEN RAISE EXCEPTION 'W10G journal post failed: %',j.error_code; END IF;
  UPDATE w10g_fixture_context SET journal_inflow_id=j.journal_id,journal_inflow_version=j.version;

  payload:=jsonb_set(payload,'{source_record_key}',to_jsonb('W10G-IN-2'::text));
  payload:=jsonb_set(payload,'{economic_event_key}',to_jsonb('W10G-IN-2'::text));
  payload:=jsonb_set(payload,'{lines,0,amount_halalah}',to_jsonb('4000'::text));
  payload:=jsonb_set(payload,'{lines,1,amount_halalah}',to_jsonb('4000'::text));
  SELECT * INTO j FROM public.prepare_accounting_journal(c.operator_id,NULL,0,payload,'Prepare W10G split journal',NULL,pg_temp.w10g_req(402));
  IF j.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10G second journal prepare failed: %',j.error_code; END IF;
  SELECT * INTO j FROM public.post_accounting_journal(c.operator_id,j.journal_id,j.version,pg_temp.w10g_req(403));
  IF j.error_code IS NOT NULL OR j.status<>'POSTED' THEN RAISE EXCEPTION 'W10G second journal post failed: %',j.error_code; END IF;
  UPDATE w10g_fixture_context SET journal_inflow_2_id=j.journal_id,journal_inflow_2_version=j.version;

  payload:=jsonb_set(payload,'{source_record_key}',to_jsonb('W10G-OUT-1'::text));
  payload:=jsonb_set(payload,'{economic_event_key}',to_jsonb('W10G-OUT-1'::text));
  payload:=jsonb_set(payload,'{lines,0,side}',to_jsonb('CREDIT'::text));
  payload:=jsonb_set(payload,'{lines,1,side}',to_jsonb('DEBIT'::text));
  payload:=jsonb_set(payload,'{lines,0,amount_halalah}',to_jsonb('3000'::text));
  payload:=jsonb_set(payload,'{lines,1,amount_halalah}',to_jsonb('3000'::text));
  SELECT * INTO j FROM public.prepare_accounting_journal(c.operator_id,NULL,0,payload,'Prepare W10G outflow journal',NULL,pg_temp.w10g_req(404));
  IF j.error_code IS NOT NULL THEN RAISE EXCEPTION 'W10G outflow journal prepare failed: %',j.error_code; END IF;
  SELECT * INTO j FROM public.post_accounting_journal(c.operator_id,j.journal_id,j.version,pg_temp.w10g_req(405));
  IF j.error_code IS NOT NULL OR j.status<>'POSTED' THEN RAISE EXCEPTION 'W10G outflow journal post failed: %',j.error_code; END IF;
  UPDATE w10g_fixture_context SET journal_outflow_id=j.journal_id,journal_outflow_version=j.version;
  SELECT clock_timestamp() INTO c.line_revision_cutoff;
  SELECT * INTO l FROM public.save_accounting_bank_statement_line(
    c.operator_id,(SELECT line_revision_id FROM w10g_fixture_context),1,c.batch_id,c.batch_version,'BANK-LINE-REVISION','2026-01-12','2026-01-12',200,'REV-1','Correction after cutoff',
    'row-revision-v2',repeat('4',64),'Revise W10G line',pg_temp.w10g_req(406));
  IF l.error_code IS NOT NULL OR l.version<>2 THEN RAISE EXCEPTION 'W10G line revision failed'; END IF;
  UPDATE w10g_fixture_context SET line_revision_cutoff=c.line_revision_cutoff;
END;
$journal_setup$;

DO $reconcile$
DECLARE c record; g record; review record; bad record; reversal record; report jsonb; before_journals integer; journal_count_after_reversal integer; after_journals integer; impact_reviews integer; impact_events integer; distinct_event_versions integer; dml_blocked boolean:=false; superseded_rejected boolean:=false; coverage_rejected boolean:=false;
BEGIN
  SELECT * INTO STRICT c FROM w10g_fixture_context;
  SELECT count(*) INTO before_journals FROM public.accounting_journals WHERE profile_id=c.profile_id;
  SELECT * INTO g FROM public.prepare_accounting_bank_reconciliation(c.operator_id,NULL,0,c.binding_id,c.binding_version,
    '2026-01-31',c.line_revision_cutoff,jsonb_build_array(
      jsonb_build_object('statement_line_id',c.line_revision_id,'statement_line_version',1,'ledger_journal_id',c.journal_inflow_id,'ledger_journal_version',c.journal_inflow_version,'ledger_line_number',1,'statement_allocated_halalah',100,'ledger_allocated_halalah',100,'rationale','Historical cutoff')),
    'Prepare historical cutoff reconciliation','synthetic://w10g/reconcile/history',pg_temp.w10g_req(499));
  IF g.error_code IS NOT NULL OR g.status<>'PREPARED' THEN RAISE EXCEPTION 'W10G historical cutoff version was not eligible'; END IF;
  BEGIN
    PERFORM public.prepare_accounting_bank_reconciliation(c.operator_id,NULL,0,c.binding_id,c.binding_version,
      '2026-01-31',clock_timestamp(),jsonb_build_array(
        jsonb_build_object('statement_line_id',c.line_revision_id,'statement_line_version',1,'ledger_journal_id',c.journal_inflow_id,'ledger_journal_version',c.journal_inflow_version,'ledger_line_number',1,'statement_allocated_halalah',100,'ledger_allocated_halalah',100,'rationale','Superseded version')),
      'Reject superseded W10G version','synthetic://w10g/reconcile/history-after',pg_temp.w10g_req(498));
  EXCEPTION WHEN others THEN superseded_rejected:=true;
  END;
  IF NOT superseded_rejected THEN RAISE EXCEPTION 'W10G superseded line version remained matchable'; END IF;
  SELECT * INTO g FROM public.prepare_accounting_bank_reconciliation(c.operator_id,NULL,0,c.binding_id,c.binding_version,
    '2026-01-31',clock_timestamp(),jsonb_build_array(
      jsonb_build_object('statement_line_id',c.line_inflow_id,'statement_line_version',1,'ledger_journal_id',c.journal_inflow_id,'ledger_journal_version',c.journal_inflow_version,'ledger_line_number',1,'statement_allocated_halalah',6000,'ledger_allocated_halalah',6000,'rationale','Split one'),
      jsonb_build_object('statement_line_id',c.line_inflow_id,'statement_line_version',1,'ledger_journal_id',c.journal_inflow_2_id,'ledger_journal_version',c.journal_inflow_2_version,'ledger_line_number',1,'statement_allocated_halalah',4000,'ledger_allocated_halalah',4000,'rationale','Split two')),
    'Prepare W10G split reconciliation','synthetic://w10g/reconcile/1',pg_temp.w10g_req(500));
  IF g.error_code IS NOT NULL OR g.status<>'PREPARED' THEN RAISE EXCEPTION 'W10G reconciliation prepare failed: %',g.error_code; END IF;
  SELECT * INTO review FROM public.review_accounting_bank_reconciliation(c.reviewer_id,g.group_id,g.version,true,'Approve W10G reconciliation',pg_temp.w10g_req(501));
  IF review.error_code IS NOT NULL OR review.decision<>'APPROVED' THEN RAISE EXCEPTION 'W10G reconciliation review failed: %',review.error_code; END IF;
  SELECT * INTO reversal FROM public.reverse_accounting_journal(c.operator_id,c.journal_inflow_id,c.period_id,'2026-01-31','Reverse reconciled W10G cash journal','synthetic://w10g/reversal',pg_temp.w10g_req(550));
  IF reversal.error_code IS NOT NULL OR reversal.original_journal_id IS DISTINCT FROM c.journal_inflow_id THEN RAISE EXCEPTION 'W10G reconciled journal reversal failed: %',reversal.error_code; END IF;
  SELECT count(*) INTO journal_count_after_reversal FROM public.accounting_journals WHERE profile_id=c.profile_id;
  IF journal_count_after_reversal<>before_journals+1 THEN RAISE EXCEPTION 'W10G governed reversal did not create exactly one journal'; END IF;
  SELECT count(*) INTO impact_reviews FROM public.accounting_bank_reconciliation_reviews WHERE profile_id=c.profile_id AND group_id=g.group_id AND group_version=g.version AND decision='IMPACT_REVIEW_REQUIRED';
  SELECT count(*),count(DISTINCT entity_version) INTO impact_events,distinct_event_versions FROM public.accounting_foundation_events WHERE profile_id=c.profile_id AND entity_type='accounting_bank_reconciliation' AND entity_id=g.group_id AND event_type='accounting_bank_reconciliation_reviewed';
  IF impact_reviews<>1 OR impact_events<>2 OR distinct_event_versions<>2 THEN RAISE EXCEPTION 'W10G reversal impact review lineage is incomplete'; END IF;
  SELECT * INTO review FROM public.review_accounting_bank_reconciliation(c.reviewer_id,g.group_id,g.version,true,'Approve W10G reconciliation',pg_temp.w10g_req(501));
  IF review.error_code IS NOT NULL OR NOT review.idempotent_replay THEN RAISE EXCEPTION 'W10G exact reconciliation review replay was not idempotent'; END IF;
  SELECT * INTO review FROM public.review_accounting_bank_reconciliation(c.reviewer_id,g.group_id,g.version,true,'Changed reconciliation review',pg_temp.w10g_req(501));
  IF review.error_code IS DISTINCT FROM 'request_payload_conflict' THEN RAISE EXCEPTION 'W10G changed reconciliation review was accepted'; END IF;
  BEGIN
    SELECT * INTO bad FROM public.prepare_accounting_bank_reconciliation(c.operator_id,NULL,0,c.binding_id,c.binding_version,
      '2026-01-31',clock_timestamp(),jsonb_build_array(
        jsonb_build_object('statement_line_id',c.line_inflow_id,'statement_line_version',1,'ledger_journal_id',c.journal_inflow_id,'ledger_journal_version',c.journal_inflow_version,'ledger_line_number',1,'statement_allocated_halalah',1,'ledger_allocated_halalah',1,'rationale','Over allocation')),
      'Reject W10G double match','synthetic://w10g/reconcile/bad',pg_temp.w10g_req(502));
    coverage_rejected:=bad.error_code IS NOT NULL;
  EXCEPTION WHEN others THEN coverage_rejected:=true;
  END;
  IF NOT coverage_rejected THEN RAISE EXCEPTION 'W10G coverage lock accepted an over-allocation'; END IF;
  SELECT * INTO g FROM public.prepare_accounting_bank_reconciliation(c.operator_id,NULL,0,c.binding_id,c.binding_version,
    '2026-01-31',clock_timestamp(),jsonb_build_array(
      jsonb_build_object('statement_line_id',c.line_outflow_id,'statement_line_version',1,'ledger_journal_id',c.journal_outflow_id,'ledger_journal_version',c.journal_outflow_version,'ledger_line_number',1,'statement_allocated_halalah',-3000,'ledger_allocated_halalah',-3000,'rationale','Fee outflow')),
    'Prepare W10G outflow reconciliation','synthetic://w10g/reconcile/2',pg_temp.w10g_req(503));
  IF g.error_code IS NOT NULL OR g.status<>'PREPARED' THEN RAISE EXCEPTION 'W10G outflow reconciliation failed: %',g.error_code; END IF;
  SELECT * INTO review FROM public.review_accounting_bank_reconciliation(c.operator_id,g.group_id,g.version,true,'Self review probe',pg_temp.w10g_req(504));
  IF review.error_code IS DISTINCT FROM 'independent_review_required' THEN RAISE EXCEPTION 'W10G self review was accepted'; END IF;
  SELECT * INTO review FROM public.review_accounting_bank_reconciliation(c.reviewer_id,g.group_id,g.version,false,'Reject then unmatch probe',pg_temp.w10g_req(505));
  IF review.error_code IS NOT NULL OR review.decision<>'REJECTED' THEN RAISE EXCEPTION 'W10G rejection review failed'; END IF;
  SELECT * INTO g FROM public.prepare_accounting_bank_reconciliation(c.operator_id,NULL,0,c.binding_id,c.binding_version,
    '2026-01-31',clock_timestamp(),jsonb_build_array(
      jsonb_build_object('statement_line_id',c.line_outflow_id,'statement_line_version',1,'ledger_journal_id',c.journal_outflow_id,'ledger_journal_version',c.journal_outflow_version,'ledger_line_number',1,'statement_allocated_halalah',-3000,'ledger_allocated_halalah',-3000,'rationale','Fee outflow rematch')),
    'Prepare W10G rematch','synthetic://w10g/reconcile/3',pg_temp.w10g_req(506));
  SELECT * INTO review FROM public.review_accounting_bank_reconciliation(c.reviewer_id,g.group_id,g.version,true,'Approve rematch',pg_temp.w10g_req(507));
  IF review.error_code IS NOT NULL OR review.decision<>'APPROVED' THEN RAISE EXCEPTION 'W10G rematch approval failed'; END IF;
  SELECT * INTO review FROM public.unmatch_accounting_bank_reconciliation(c.reviewer_id,g.group_id,g.version,'Unmatch rematch',pg_temp.w10g_req(508));
  IF review.error_code IS NOT NULL OR review.decision<>'UNMATCHED' THEN RAISE EXCEPTION 'W10G unmatch failed'; END IF;
  SELECT * INTO review FROM public.unmatch_accounting_bank_reconciliation(c.reviewer_id,g.group_id,g.version,'Unmatch rematch',pg_temp.w10g_req(508));
  IF review.error_code IS NOT NULL OR NOT review.idempotent_replay THEN RAISE EXCEPTION 'W10G exact unmatch replay was not idempotent'; END IF;
  SELECT * INTO review FROM public.unmatch_accounting_bank_reconciliation(c.reviewer_id,g.group_id,g.version,'Changed unmatch',pg_temp.w10g_req(508));
  IF review.error_code IS DISTINCT FROM 'request_payload_conflict' THEN RAISE EXCEPTION 'W10G changed unmatch was accepted'; END IF;

  SELECT * INTO report FROM public.get_accounting_bank_reconciliation(c.reviewer_id,c.binding_id,'2026-01-31',clock_timestamp(),200);
  IF report->>'currency' IS DISTINCT FROM 'SAR' OR report->>'timing_difference_halalah' IS NULL
     OR jsonb_array_length(report->'statement_lines')=0 THEN RAISE EXCEPTION 'W10G bounded reconciliation read model is incomplete'; END IF;
  SELECT * INTO report FROM public.get_accounting_bank_reconciliation(c.reviewer_id,c.binding_id,'2026-01-31',clock_timestamp(),1);
  IF jsonb_array_length(report->'statement_lines')>1 OR jsonb_array_length(report->'ledger_cash_lines')>1
     OR jsonb_array_length(report->'adjustment_required_statement_items')>1 THEN
    RAISE EXCEPTION 'W10G p_limit did not bound every read-model array';
  END IF;

  BEGIN
    INSERT INTO public.accounting_bank_statement_line_versions(profile_id,line_id,version,batch_id,batch_version,stable_line_identity,transaction_date,signed_amount_halalah,direction,source_row_identity,duplicate_fingerprint,recorded_by,request_id,payload_fingerprint,foundation_event_id)
    VALUES(c.profile_id,gen_random_uuid(),99,c.batch_id,1,'DML-BLOCK','2026-01-01',1,'INFLOW','dml',repeat('f',64),c.operator_id,pg_temp.w10g_req(509),repeat('f',64),'00000000-0000-4000-8000-00000000f940');
  EXCEPTION WHEN others THEN dml_blocked:=true;
  END;
  IF NOT dml_blocked THEN RAISE EXCEPTION 'W10G direct DML was not denied'; END IF;
  SELECT * INTO bad FROM public.save_accounting_bank_binding(c.admin_id,NULL,0,c.cash_account_id,c.cash_account_version,
    'synthetic://w10g/admin',repeat('a',64),'2026-02-01',NULL,'****ADMIN','synthetic://w10g/admin',repeat('a',64),'Wildcard denial',pg_temp.w10g_req(510));
  IF bad.error_code IS DISTINCT FROM 'authority_denied' THEN RAISE EXCEPTION 'W10G admin wildcard authority leaked'; END IF;
  SELECT count(*) INTO after_journals FROM public.accounting_journals WHERE profile_id=c.profile_id;
  IF after_journals<>journal_count_after_reversal THEN RAISE EXCEPTION 'W10G reconciliation changed journal count'; END IF;
END;
$reconcile$;

RESET ROLE;
ROLLBACK;

DO $w10g_residue_assertion$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_users WHERE clerk_user_id LIKE 'w10g-rollback-%')
     OR EXISTS (SELECT 1 FROM public.accounting_profiles WHERE id='00000000-0000-4000-8000-00000000f900')
     OR EXISTS (SELECT 1 FROM public.accounting_bank_bindings WHERE id='00000000-0000-4000-8000-00000000f920')
     OR EXISTS (SELECT 1 FROM public.accounting_bank_statement_batches WHERE id='00000000-0000-4000-8000-00000000f930')
     OR EXISTS (SELECT 1 FROM public.accounting_foundation_events WHERE id='00000000-0000-4000-8000-00000000f940') THEN
    RAISE EXCEPTION 'W10G rollback residue detected';
  END IF;
END;
$w10g_residue_assertion$;
