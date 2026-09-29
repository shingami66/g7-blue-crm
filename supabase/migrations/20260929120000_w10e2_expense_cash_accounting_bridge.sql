-- W10E2: source-linked expense and employee cash-accountability accounting bridge.
-- W5 operational records remain authoritative; this migration adds accounting lineage only.
BEGIN;

DO $preflight$
DECLARE d text;
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL OR to_regclass('public.accounting_journal_versions') IS NULL
     OR to_regclass('public.accounting_source_effects') IS NULL OR to_regclass('public.accounting_inception_coverage') IS NULL
     OR to_regclass('public.expenses') IS NULL OR to_regclass('public.employee_cash_advances') IS NULL
     OR to_regclass('public.cash_advance_returns') IS NULL OR to_regclass('public.cash_advance_expense_settlements') IS NULL
     OR to_regclass('public.expense_reimbursement_settlements') IS NULL OR to_regclass('public.petty_cash_funds') IS NULL
     OR to_regclass('public.petty_cash_transactions') IS NULL OR to_regclass('public.expense_documents') IS NULL
     OR to_regclass('public.expense_evidence_exceptions') IS NULL OR to_regclass('public.audit_logs') IS NULL
     OR to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)') IS NULL
     OR to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)') IS NULL THEN
    RAISE EXCEPTION 'W10E2 preflight: required W5/W10 foundation missing';
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_capability_catalog WHERE capability='accounting:manage_expense_bridge')
     OR to_regclass('public.accounting_expense_bridge_events') IS NOT NULL
     OR to_regprocedure('public.save_accounting_expense_bridge_event(uuid,text,uuid,integer,jsonb,text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'W10E2 preflight: target bridge already exists';
  END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_account_versions'::regclass AND conname='accounting_account_versions_control_classification_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '7d03887b60b5de290b263bbb8653f3f1' THEN RAISE EXCEPTION 'W10E2 preflight: account classification baseline differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_capability_catalog'::regclass AND conname='accounting_capability_catalog_key_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '93f6429ce7cf9673f951523aaa14829f' THEN RAISE EXCEPTION 'W10E2 preflight: capability key baseline differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_capability_catalog'::regclass AND conname='accounting_capability_catalog_state_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '3785035d4ff5c410ce5c63f72459e004' THEN RAISE EXCEPTION 'W10E2 preflight: capability state baseline differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_foundation_events'::regclass AND conname='accounting_foundation_events_event_type_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '7b184d47ae03702d17db3ed4f477fa00' THEN RAISE EXCEPTION 'W10E2 preflight: event-type baseline differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_foundation_events'::regclass AND conname='accounting_foundation_events_entity_type_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM 'a7f79cd74dae2cbaae093ddef41e5d79' THEN RAISE EXCEPTION 'W10E2 preflight: entity-type baseline differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_journal_versions'::regclass AND conname='accounting_journal_versions_source_domain_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '0481343b848f01313d33f6b3dd4c0b1c' THEN RAISE EXCEPTION 'W10E2 preflight: journal-domain baseline differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_source_effects'::regclass AND conname='accounting_source_effects_source_domain_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '0481343b848f01313d33f6b3dd4c0b1c' THEN RAISE EXCEPTION 'W10E2 preflight: source-effect-domain baseline differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.audit_logs'::regclass AND conname='audit_logs_action_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '2bf4146fa7f50f0d52b26f0ee54b66e2' THEN RAISE EXCEPTION 'W10E2 preflight: audit-action baseline differs'; END IF;
END;
$preflight$;

ALTER TABLE public.accounting_foundation_events DROP CONSTRAINT accounting_foundation_events_event_type_check,
  DROP CONSTRAINT accounting_foundation_events_entity_type_check,
  ADD CONSTRAINT accounting_foundation_events_event_type_check CHECK(event_type IN (
    'accounting_capability_changed','accounting_profile_updated','accounting_account_created','accounting_account_updated',
    'accounting_period_created','accounting_period_updated','accounting_posting_rule_created','accounting_posting_rule_updated',
    'accounting_journal_prepared','accounting_journal_posted','accounting_journal_reversed',
    'accounting_inception_package_created','accounting_inception_package_updated','accounting_inception_package_reviewed',
    'accounting_inception_package_rejected','accounting_inception_package_accepted',
    'accounting_ar_bridge_event_classified','accounting_ar_bridge_event_held','accounting_ap_bridge_event_classified',
    'accounting_ap_bridge_event_held','accounting_expense_bridge_event_classified','accounting_expense_bridge_event_held')),
  ADD CONSTRAINT accounting_foundation_events_entity_type_check CHECK(entity_type IN (
    'capability_assignment','accounting_profile','accounting_account','accounting_period','accounting_posting_rule',
    'accounting_journal','accounting_inception_package','accounting_inception_review','accounting_inception_acceptance',
    'accounting_ar_bridge_event','accounting_ap_bridge_event','accounting_expense_bridge_event'));
ALTER TABLE public.accounting_capability_catalog DROP CONSTRAINT accounting_capability_catalog_key_check,
  DROP CONSTRAINT accounting_capability_catalog_state_check,
  ADD CONSTRAINT accounting_capability_catalog_key_check CHECK(capability IN (
    'accounting:view','accounting:manage_profile','accounting:manage_authority','accounting:manage_chart','accounting:manage_periods',
    'accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal','accounting:manage_inception',
    'accounting:manage_ar_bridge','accounting:manage_ap_bridge','accounting:manage_expense_bridge','accounting:reconcile_bank',
    'accounting:close_period','accounting:reopen_period','accounting:view_statements')),
  ADD CONSTRAINT accounting_capability_catalog_state_check CHECK(
    (capability IN ('accounting:view','accounting:manage_profile') AND enabled AND runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_authority' AND enabled AND NOT runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability IN ('accounting:manage_chart','accounting:manage_periods') AND enabled AND runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability IN ('accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal') AND enabled AND runtime_allow_grantable AND owner_slice='W10B')
    OR (capability='accounting:manage_inception' AND enabled AND runtime_allow_grantable AND owner_slice='W10C')
    OR (capability='accounting:manage_ar_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10D')
    OR (capability IN ('accounting:manage_ap_bridge','accounting:manage_expense_bridge') AND enabled AND runtime_allow_grantable AND owner_slice='W10E')
    OR (capability='accounting:reconcile_bank' AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10G')
    OR (capability IN ('accounting:close_period','accounting:reopen_period') AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I')
    OR (capability='accounting:view_statements' AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10H'));
INSERT INTO public.accounting_capability_catalog(capability,enabled,runtime_allow_grantable,owner_slice)
VALUES('accounting:manage_expense_bridge',true,true,'W10E');
ALTER TABLE public.accounting_journal_versions DROP CONSTRAINT accounting_journal_versions_source_domain_check,
  ADD CONSTRAINT accounting_journal_versions_source_domain_check CHECK(source_domain IN ('CONTROLLED_MANUAL','INCEPTION','AR_BRIDGE','AP_BRIDGE','EXPENSE_BRIDGE'));
ALTER TABLE public.accounting_source_effects DROP CONSTRAINT accounting_source_effects_source_domain_check,
  ADD CONSTRAINT accounting_source_effects_source_domain_check CHECK(source_domain IN ('CONTROLLED_MANUAL','INCEPTION','AR_BRIDGE','AP_BRIDGE','EXPENSE_BRIDGE'));
ALTER TABLE public.accounting_account_versions DROP CONSTRAINT accounting_account_versions_control_classification_check,
  ADD CONSTRAINT accounting_account_versions_control_classification_check CHECK(control_classification IN (
    'NONE','ACCOUNTS_RECEIVABLE','ACCOUNTS_PAYABLE','ACCRUED_LIABILITY','CUSTOMER_ADVANCE','SUPPLIER_ADVANCE',
    'CONTRACT_LIABILITY','CASH_ACCOUNTABILITY','EMPLOYEE_ADVANCE','EMPLOYEE_REIMBURSEMENT_LIABILITY'));

ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK(action=ANY(ARRAY[
  'create'::text,'update'::text,'delete'::text,'restore'::text,'status_change'::text,'payment_recorded'::text,'correction'::text,
  'procurement_package_created'::text,'procurement_package_updated'::text,'procurement_package_requirements_set'::text,
  'procurement_package_supplier_selected'::text,'procurement_package_supplier_cleared'::text,
  'expense_submitted'::text,'expense_approved'::text,'expense_rejected'::text,'expense_cancelled'::text,
  'expense_evidence_exception_recorded'::text,'expense_evidence_exception_disposed'::text,'expense_document_attached'::text,
  'expense_reimbursement_settled'::text,'cash_advance_requested'::text,'cash_advance_approved'::text,'cash_advance_rejected'::text,
  'cash_advance_cancelled'::text,'cash_advance_issued'::text,'cash_advance_expense_settled'::text,'cash_advance_returned'::text,
  'petty_cash_transaction_recorded'::text,'expense_finance_reviewed'::text,
  'supplier_bill_recorded'::text,'supplier_bill_updated'::text,'supplier_bill_documents_attached'::text,'supplier_bill_approved'::text,
  'supplier_payment_recorded'::text,'supplier_payment_reversed'::text,'supplier_advance_authorized'::text,
  'supplier_advance_payment_recorded'::text,'supplier_advance_payment_reversed'::text,'supplier_advance_allocated'::text,
  'supplier_advance_allocation_corrected'::text,'supplier_advance_refund_recorded'::text,'customer_receipt_recorded'::text,
  'customer_receipt_allocated'::text,'customer_receipt_allocation_reversed'::text,'customer_receipt_reversed'::text
]) OR (entity_type='accounting_journal' AND action=ANY(ARRAY['prepare'::text,'post'::text,'reverse'::text]))
 OR (entity_type='accounting_inception_package' AND action=ANY(ARRAY['save'::text,'approve'::text,'reject'::text,'prepare'::text,'accept'::text]))
 OR (entity_type IN ('accounting_ar_bridge_event','accounting_ap_bridge_event','accounting_expense_bridge_event')
     AND action=ANY(ARRAY['classify'::text,'hold'::text])));

CREATE TABLE public.accounting_expense_bridge_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
 source_type text NOT NULL CHECK(source_type IN ('EXPENSE','EXPENSE_REIMBURSEMENT_SETTLEMENT','CASH_ADVANCE_ISSUE',
   'CASH_ADVANCE_EXPENSE_SETTLEMENT','CASH_ADVANCE_RETURN','PETTY_CASH_TRANSACTION','CASH_ADVANCE_GOVERNANCE_EVENT','PETTY_CASH_FUND_GOVERNANCE_EVENT')),
 source_record_id uuid NOT NULL,source_record_key text NOT NULL CHECK(length(btrim(source_record_key)) BETWEEN 1 AND 200),
 economic_event_key text NOT NULL CHECK(length(btrim(economic_event_key)) BETWEEN 1 AND 200),
 current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(profile_id,id),UNIQUE(profile_id,source_type,source_record_id),UNIQUE(profile_id,source_record_key,economic_event_key));
CREATE TABLE public.accounting_expense_bridge_event_versions(
 profile_id uuid NOT NULL,event_id uuid NOT NULL,version integer NOT NULL CHECK(version>0),previous_version integer,
 status text NOT NULL CHECK(status IN ('READY','HELD','NO_EFFECT')),
 classification text NOT NULL CHECK(classification IN ('EMPLOYEE_PAID_EXPENSE','COMPANY_DIRECT_EXPENSE','REIMBURSEMENT_CASH',
   'REIMBURSEMENT_ADVANCE_OFFSET','CASH_ADVANCE_ISSUE','CASH_ADVANCE_EXPENSE_SETTLEMENT','CASH_ADVANCE_RETURN',
   'PETTY_REPLENISHMENT','PETTY_EXPENSE_DISBURSEMENT','PETTY_TREASURY_WITHDRAWAL','PETTY_RETURN_TO_TREASURY',
   'PETTY_RETURN_FROM_TREASURY','NO_MONETARY_EFFECT','HELD_UNSUPPORTED_TREATMENT')),
 source_snapshot jsonb NOT NULL CHECK(jsonb_typeof(source_snapshot)='object'),source_snapshot_sha256 text NOT NULL CHECK(source_snapshot_sha256~'^[0-9a-f]{64}$'),
 amount_halalah bigint NOT NULL CHECK(amount_halalah>=0),direct_classification text CHECK(direct_classification IS NULL OR direct_classification IN ('DIRECT_EXPENSE','CAPITAL_ASSET','PREPAID_EXPENSE')),
 service_attribution text NOT NULL CHECK(service_attribution IN ('SERVICE','OVERHEAD')),
 employee_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
 expense_id uuid REFERENCES public.expenses(id) ON DELETE RESTRICT,advance_id uuid REFERENCES public.employee_cash_advances(id) ON DELETE RESTRICT,
 fund_id uuid REFERENCES public.petty_cash_funds(id) ON DELETE RESTRICT,
  expense_account_id uuid,expense_account_version integer,control_account_id uuid,control_account_version integer,
  advance_account_id uuid,advance_account_version integer,
 cash_account_id uuid,cash_account_version integer,related_advance_id uuid REFERENCES public.employee_cash_advances(id) ON DELETE RESTRICT,
 return_direction text CHECK(return_direction IS NULL OR return_direction IN ('TO_TREASURY','FROM_TREASURY')),
 accounting_date date,source_business_date date,source_occurred_at timestamptz,source_recorded_at timestamptz NOT NULL,
 evidence_ref text,evidence_sha256 text,cash_binding_evidence_ref text,cash_binding_evidence_sha256 text,
 advance_provenance_evidence_ref text,advance_provenance_evidence_sha256 text,
 held_code text CHECK(held_code IS NULL OR held_code IN ('source_not_eligible','unsupported_source_treatment',
   'classification_evidence_missing','cash_account_evidence_missing','ADVANCE_OFFSET_PROVENANCE_REQUIRED',
   'PETTY_CASH_RETURN_PROVENANCE_REQUIRED','inception_coverage_conflict','source_payload_conflict')),
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
 payload_fingerprint text NOT NULL CHECK(payload_fingerprint~'^[0-9a-f]{64}$'),
 foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(profile_id,event_id,version),
 FOREIGN KEY(profile_id,event_id) REFERENCES public.accounting_expense_bridge_events(profile_id,id) ON DELETE RESTRICT,
 FOREIGN KEY(profile_id,event_id,previous_version) REFERENCES public.accounting_expense_bridge_event_versions(profile_id,event_id,version) ON DELETE RESTRICT,
 FOREIGN KEY(profile_id,expense_account_id,expense_account_version) REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,control_account_id,control_account_version) REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT,FOREIGN KEY(profile_id,advance_account_id,advance_account_version) REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT,
 FOREIGN KEY(profile_id,cash_account_id,cash_account_version) REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT,
 UNIQUE(foundation_event_id),CHECK((evidence_ref IS NULL)=(evidence_sha256 IS NULL)),
 CHECK((cash_binding_evidence_ref IS NULL)=(cash_binding_evidence_sha256 IS NULL)),
 CHECK((advance_provenance_evidence_ref IS NULL)=(advance_provenance_evidence_sha256 IS NULL)),
  CHECK((expense_account_id IS NULL)=(expense_account_version IS NULL)),CHECK((control_account_id IS NULL)=(control_account_version IS NULL)),CHECK((advance_account_id IS NULL)=(advance_account_version IS NULL)),
 CHECK((cash_account_id IS NULL)=(cash_account_version IS NULL)),
  CHECK(status<>'NO_EFFECT' OR (classification='NO_MONETARY_EFFECT' AND direct_classification IS NULL
     AND expense_account_id IS NULL AND control_account_id IS NULL AND advance_account_id IS NULL AND cash_account_id IS NULL
    AND related_advance_id IS NULL AND return_direction IS NULL AND evidence_ref IS NULL AND evidence_sha256 IS NULL
    AND cash_binding_evidence_ref IS NULL AND cash_binding_evidence_sha256 IS NULL
    AND advance_provenance_evidence_ref IS NULL AND advance_provenance_evidence_sha256 IS NULL)),
 CHECK((status='READY' AND held_code IS NULL AND accounting_date IS NOT NULL AND amount_halalah>0)
    OR (status='HELD' AND held_code IS NOT NULL) OR (status='NO_EFFECT' AND held_code IS NULL AND accounting_date IS NULL)));
ALTER TABLE public.accounting_expense_bridge_events ADD CONSTRAINT accounting_expense_bridge_events_current_version_fkey
 FOREIGN KEY(profile_id,id,current_version) REFERENCES public.accounting_expense_bridge_event_versions(profile_id,event_id,version) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE public.accounting_expense_bridge_journal_links(
 profile_id uuid NOT NULL,event_id uuid NOT NULL,event_version integer NOT NULL,journal_id uuid NOT NULL,prepared_version integer NOT NULL,
 source_effect_id uuid NOT NULL UNIQUE REFERENCES public.accounting_source_effects(id) ON DELETE RESTRICT,
 expense_id uuid REFERENCES public.expenses(id) ON DELETE RESTRICT,advance_id uuid REFERENCES public.employee_cash_advances(id) ON DELETE RESTRICT,
 employee_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,fund_id uuid REFERENCES public.petty_cash_funds(id) ON DELETE RESTRICT,
 service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,source_type text NOT NULL,source_record_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(profile_id,event_id,event_version),
 FOREIGN KEY(profile_id,event_id,event_version) REFERENCES public.accounting_expense_bridge_event_versions(profile_id,event_id,version) ON DELETE RESTRICT,
 FOREIGN KEY(profile_id,journal_id,prepared_version) REFERENCES public.accounting_journal_versions(profile_id,journal_id,version) ON DELETE RESTRICT);
CREATE TABLE public.accounting_expense_bridge_journal_lines(
 profile_id uuid NOT NULL,event_id uuid NOT NULL,event_version integer NOT NULL,journal_id uuid NOT NULL,journal_version integer NOT NULL,line_number integer NOT NULL,
 party_role text NOT NULL CHECK(party_role IN ('DIRECT_EXPENSE','DIRECT_ASSET','EMPLOYEE_REIMBURSEMENT_LIABILITY','EMPLOYEE_ADVANCE','CASH_ACCOUNTABILITY','CASH_ACCOUNT')),
 employee_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,expense_id uuid REFERENCES public.expenses(id) ON DELETE RESTRICT,
 advance_id uuid REFERENCES public.employee_cash_advances(id) ON DELETE RESTRICT,fund_id uuid REFERENCES public.petty_cash_funds(id) ON DELETE RESTRICT,
 service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,source_type text NOT NULL,source_record_id uuid NOT NULL,
 account_id uuid NOT NULL,account_version integer NOT NULL,amount_halalah bigint NOT NULL CHECK(amount_halalah>0),side text NOT NULL CHECK(side IN ('DEBIT','CREDIT')),
 PRIMARY KEY(profile_id,event_id,event_version,journal_id,journal_version,line_number),
 FOREIGN KEY(profile_id,event_id,event_version) REFERENCES public.accounting_expense_bridge_event_versions(profile_id,event_id,version) ON DELETE RESTRICT,
 FOREIGN KEY(profile_id,journal_id,journal_version,line_number) REFERENCES public.accounting_journal_line_versions(profile_id,journal_id,journal_version,line_number) ON DELETE RESTRICT,
 FOREIGN KEY(profile_id,account_id,account_version) REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT);

CREATE FUNCTION public.prevent_accounting_expense_bridge_history_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $immutable$
BEGIN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_EXPENSE_BRIDGE_HISTORY_IMMUTABLE'; END;$immutable$;
CREATE TRIGGER accounting_expense_bridge_versions_immutable BEFORE UPDATE OR DELETE ON public.accounting_expense_bridge_event_versions
 FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_expense_bridge_history_mutation();
CREATE TRIGGER accounting_expense_bridge_links_immutable BEFORE UPDATE OR DELETE ON public.accounting_expense_bridge_journal_links
 FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_expense_bridge_history_mutation();
CREATE TRIGGER accounting_expense_bridge_lines_immutable BEFORE UPDATE OR DELETE ON public.accounting_expense_bridge_journal_lines
 FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_expense_bridge_history_mutation();
ALTER TABLE public.accounting_expense_bridge_events ENABLE ROW LEVEL SECURITY; ALTER TABLE public.accounting_expense_bridge_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_expense_bridge_event_versions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.accounting_expense_bridge_event_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_expense_bridge_journal_links ENABLE ROW LEVEL SECURITY; ALTER TABLE public.accounting_expense_bridge_journal_links FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_expense_bridge_journal_lines ENABLE ROW LEVEL SECURITY; ALTER TABLE public.accounting_expense_bridge_journal_lines FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.accounting_expense_bridge_events,public.accounting_expense_bridge_event_versions,
 public.accounting_expense_bridge_journal_links,public.accounting_expense_bridge_journal_lines FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.accounting_expense_bridge_source_snapshot(p_source_type text,p_source_record_id uuid,p_cutoff timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $snapshot$
DECLARE e uuid;a uuid;who uuid;fund uuid;svc uuid;amt numeric;bd date;occurred timestamptz;recorded timestamptz;
 ctx text;origin text;method text;subtype text;src_status text;eligible boolean;attrs jsonb;
BEGIN
 IF p_source_record_id IS NULL THEN RETURN NULL;END IF;
 CASE p_source_type
 WHEN 'EXPENSE' THEN
  SELECT x.id,x.cash_advance_id,x.claimant_id,x.petty_cash_fund_id,x.service_id,x.amount,x.expense_date,x.approved_at,
    coalesce(ap.t,x.approved_at,x.submitted_at),x.context_type,x.origin_type,x.payment_method,NULL::text,
    coalesce((SELECT CASE l.action WHEN 'expense_submitted' THEN 'submitted' WHEN 'expense_approved' THEN 'approved'
      WHEN 'expense_rejected' THEN 'rejected' WHEN 'expense_cancelled' THEN 'cancelled' END
      FROM public.audit_logs l WHERE l.entity_type='expense' AND l.entity_id=x.id::text
       AND l.action IN ('expense_submitted','expense_approved','expense_rejected','expense_cancelled')
       AND (p_cutoff IS NULL OR l.timestamp<=p_cutoff) ORDER BY l.timestamp DESC,l.id DESC LIMIT 1),'unknown'),
   ap.t IS NOT NULL AND (p_cutoff IS NULL OR ap.t<=p_cutoff) AND NOT EXISTS(SELECT 1 FROM public.audit_logs c
    WHERE c.entity_type='expense' AND c.entity_id=x.id::text AND c.action='expense_cancelled' AND (p_cutoff IS NULL OR c.timestamp<=p_cutoff)),
   jsonb_build_object('expense_number',x.expense_number,'expense_category_text_excluded_from_account_authority',x.expense_category,
     'approval_audit_present',ap.t IS NOT NULL,'payment_reference_excluded_from_account_selection',true)
  INTO e,a,who,fund,svc,amt,bd,occurred,recorded,ctx,origin,method,subtype,src_status,eligible,attrs
  FROM public.expenses x LEFT JOIN LATERAL(SELECT min(l.timestamp) t FROM public.audit_logs l WHERE l.entity_type='expense'
    AND l.entity_id=x.id::text AND l.action='expense_approved') ap ON true WHERE x.id=p_source_record_id;
 WHEN 'EXPENSE_REIMBURSEMENT_SETTLEMENT' THEN
  SELECT s.expense_id,NULL::uuid,x.claimant_id,NULL::uuid,x.service_id,s.amount,(s.settled_at AT TIME ZONE 'Asia/Riyadh')::date,
    s.settled_at,s.settled_at,x.context_type,x.origin_type,x.payment_method,s.settlement_method,'settled',
    x.origin_type='employee_paid' AND x.payment_method='personal_funds'
     AND EXISTS(SELECT 1 FROM public.audit_logs l WHERE l.entity_type='expense' AND l.entity_id=x.id::text AND l.action='expense_approved' AND l.timestamp<=s.settled_at)
     AND (p_cutoff IS NULL OR s.settled_at<=p_cutoff),
   jsonb_build_object('settlement_id',s.id,'payment_reference_excluded_from_account_selection',true)
  INTO e,a,who,fund,svc,amt,bd,occurred,recorded,ctx,origin,method,subtype,src_status,eligible,attrs
  FROM public.expense_reimbursement_settlements s JOIN public.expenses x ON x.id=s.expense_id WHERE s.id=p_source_record_id;
 WHEN 'CASH_ADVANCE_ISSUE' THEN
   SELECT NULL::uuid,x.id,x.recipient_id,NULL::uuid,x.service_id,x.amount_issued,(x.issued_at AT TIME ZONE 'Asia/Riyadh')::date,x.issued_at,
    i.t,x.context_type,NULL::text,NULL::text,NULL::text,'issued',
    i.t IS NOT NULL AND (p_cutoff IS NULL OR i.t<=p_cutoff),
   jsonb_build_object('advance_number',x.advance_number,'issued_at',x.issued_at,'mutable_balance_summaries_excluded',true,
     'payment_reference_excluded_from_account_selection',true)
  INTO e,a,who,fund,svc,amt,bd,occurred,recorded,ctx,origin,method,subtype,src_status,eligible,attrs
  FROM public.employee_cash_advances x LEFT JOIN LATERAL(SELECT min(l.timestamp) t FROM public.audit_logs l
   WHERE l.entity_type='employee_cash_advance' AND l.entity_id=x.id::text AND l.action='cash_advance_issued') i ON true
   WHERE x.id=p_source_record_id;
 WHEN 'CASH_ADVANCE_EXPENSE_SETTLEMENT' THEN
   SELECT s.expense_id,s.cash_advance_id,a.recipient_id,NULL::uuid,x.service_id,s.amount,(s.settled_at AT TIME ZONE 'Asia/Riyadh')::date,
    s.settled_at,s.settled_at,x.context_type,x.origin_type,x.payment_method,NULL::text,'settled',
    x.origin_type='company_direct' AND x.payment_method='cash_advance' AND x.cash_advance_id=s.cash_advance_id
       AND x.context_type=a.context_type AND x.service_id IS NOT DISTINCT FROM a.service_id
      AND a.issued_at<=s.settled_at
      AND EXISTS(SELECT 1 FROM public.audit_logs i WHERE i.entity_type='employee_cash_advance'
       AND i.entity_id=a.id::text AND i.action='cash_advance_issued' AND i.timestamp<=s.settled_at)
     AND EXISTS(SELECT 1 FROM public.audit_logs l WHERE l.entity_type='expense' AND l.entity_id=x.id::text AND l.action='expense_approved' AND l.timestamp<=s.settled_at)
     AND (p_cutoff IS NULL OR s.settled_at<=p_cutoff),jsonb_build_object('settlement_id',s.id,'expense_id',s.expense_id)
  INTO e,a,who,fund,svc,amt,bd,occurred,recorded,ctx,origin,method,subtype,src_status,eligible,attrs
  FROM public.cash_advance_expense_settlements s JOIN public.employee_cash_advances a ON a.id=s.cash_advance_id
   JOIN public.expenses x ON x.id=s.expense_id WHERE s.id=p_source_record_id;
 WHEN 'CASH_ADVANCE_RETURN' THEN
  SELECT NULL::uuid,r.cash_advance_id,a.recipient_id,NULL::uuid,a.service_id,r.amount,(r.returned_at AT TIME ZONE 'Asia/Riyadh')::date,
    r.returned_at,r.returned_at,a.context_type,NULL::text,NULL::text,NULL::text,'returned',
    a.issued_at<=r.returned_at AND EXISTS(SELECT 1 FROM public.audit_logs i WHERE i.entity_type='employee_cash_advance'
      AND i.entity_id=a.id::text AND i.action='cash_advance_issued' AND i.timestamp<=r.returned_at)
      AND (p_cutoff IS NULL OR r.returned_at<=p_cutoff),
   jsonb_build_object('return_id',r.id,'receipt_reference_excluded_from_account_selection',true,'mutable_balance_summaries_excluded',true)
  INTO e,a,who,fund,svc,amt,bd,occurred,recorded,ctx,origin,method,subtype,src_status,eligible,attrs
  FROM public.cash_advance_returns r JOIN public.employee_cash_advances a ON a.id=r.cash_advance_id WHERE r.id=p_source_record_id;
 WHEN 'PETTY_CASH_TRANSACTION' THEN
  SELECT t.expense_id,NULL::uuid,coalesce(x.claimant_id,f.custodian_id),t.fund_id,x.service_id,t.amount,
   (t.recorded_at AT TIME ZONE 'Asia/Riyadh')::date,t.recorded_at,t.recorded_at,coalesce(x.context_type,'company'),x.origin_type,
    x.payment_method,t.transaction_type,CASE WHEN t.transaction_type='disbursement' THEN 'expense_approved_at_disbursement' ELSE t.transaction_type END,
    (t.transaction_type<>'disbursement' OR (x.origin_type='company_direct' AND x.payment_method='petty_cash'
     AND x.petty_cash_fund_id=t.fund_id AND EXISTS(SELECT 1 FROM public.audit_logs l WHERE l.entity_type='expense'
       AND l.entity_id=x.id::text AND l.action='expense_approved' AND l.timestamp<=t.recorded_at)))
     AND (p_cutoff IS NULL OR t.recorded_at<=p_cutoff),
   jsonb_build_object('transaction_id',t.id,'reference_excluded_from_account_selection',true,
     'balance_before_after_excluded_from_historical_truth',true,'mutable_fund_balance_excluded',true)
  INTO e,a,who,fund,svc,amt,bd,occurred,recorded,ctx,origin,method,subtype,src_status,eligible,attrs
  FROM public.petty_cash_transactions t JOIN public.petty_cash_funds f ON f.id=t.fund_id LEFT JOIN public.expenses x ON x.id=t.expense_id
   WHERE t.id=p_source_record_id;
  WHEN 'CASH_ADVANCE_GOVERNANCE_EVENT' THEN
   SELECT NULL::uuid,x.id,x.recipient_id,NULL::uuid,x.service_id,0::numeric,(l.timestamp AT TIME ZONE 'Asia/Riyadh')::date,l.timestamp,l.timestamp,
    x.context_type,NULL::text,NULL::text,l.action,l.action,true,
    jsonb_build_object('audit_id',l.id,'audit_action',l.action,'audit_details',l.details,'mutable_balance_summaries_excluded',true)
   INTO e,a,who,fund,svc,amt,bd,occurred,recorded,ctx,origin,method,subtype,src_status,eligible,attrs
   FROM public.audit_logs l JOIN public.employee_cash_advances x ON x.id=l.entity_id::uuid
   WHERE l.id=p_source_record_id AND l.entity_type='employee_cash_advance'
    AND l.action IN ('cash_advance_requested','cash_advance_approved','cash_advance_rejected')
    AND (p_cutoff IS NULL OR l.timestamp<=p_cutoff);
  WHEN 'PETTY_CASH_FUND_GOVERNANCE_EVENT' THEN
   SELECT NULL::uuid,NULL::uuid,NULL::uuid,l.entity_id::uuid,NULL::uuid,0::numeric,(l.timestamp AT TIME ZONE 'Asia/Riyadh')::date,l.timestamp,l.timestamp,
    'company',NULL::text,NULL::text,l.action,l.action,true,
    jsonb_build_object('audit_id',l.id,'audit_action',l.action,'audit_details',l.details,'mutable_fund_balance_excluded',true)
   INTO e,a,who,fund,svc,amt,bd,occurred,recorded,ctx,origin,method,subtype,src_status,eligible,attrs
   FROM public.audit_logs l WHERE l.id=p_source_record_id AND l.entity_type='petty_cash_fund'
    AND l.action IN ('create','update','status_change') AND (p_cutoff IS NULL OR l.timestamp<=p_cutoff);
  ELSE RETURN NULL;END CASE;
 IF NOT FOUND OR recorded IS NULL OR (p_cutoff IS NOT NULL AND recorded>p_cutoff) THEN RETURN NULL;END IF;
 IF e IS NOT NULL THEN attrs:=attrs||jsonb_build_object(
   'attached_documents',coalesce((SELECT jsonb_agg(jsonb_build_object('document_id',d.id,'document_type',d.document_type,'purpose',d.purpose,
   'mime_type',d.mime_type,'file_size',d.file_size,'uploaded_by',d.uploaded_by,'created_at',d.created_at,'attached_at',ed.attached_at)
   ORDER BY ed.attached_at,d.id) FROM public.expense_documents ed JOIN public.business_documents d ON d.id=ed.document_id
   WHERE ed.expense_id=e AND (p_cutoff IS NULL OR ed.attached_at<=p_cutoff) AND (p_cutoff IS NULL OR d.created_at<=p_cutoff)),'[]'::jsonb),
   'evidence_exceptions',coalesce((SELECT jsonb_agg(jsonb_build_object('exception_id',x.id,'reason',x.reason,'accountable_owner_id',x.accountable_owner_id,
    'review_before',x.review_before,'created_by',x.created_by,'created_at',x.created_at,
    'audit_lineage',coalesce((SELECT jsonb_agg(jsonb_build_object('action',l.action,'details',l.details,'recorded_at',l.timestamp)
    ORDER BY l.timestamp) FROM public.audit_logs l WHERE l.entity_type='expense_evidence_exception' AND l.entity_id=x.id::text
      AND (p_cutoff IS NULL OR l.timestamp<=p_cutoff)),'[]'::jsonb)) ORDER BY x.created_at,x.id)
   FROM public.expense_evidence_exceptions x WHERE x.expense_id=e AND (p_cutoff IS NULL OR x.created_at<=p_cutoff)),'[]'::jsonb));END IF;
 RETURN jsonb_build_object('source_type',p_source_type,'source_record_id',p_source_record_id,
  'source_record_key','W5/'||p_source_type||'/'||p_source_record_id::text,'economic_event_key','W5/'||p_source_type||'/'||p_source_record_id::text||'/EFFECT',
  'expense_id',e,'advance_id',a,'employee_id',who,'fund_id',fund,'service_id',svc,'context_type',ctx,'origin_type',origin,
  'payment_method',method,'source_subtype',subtype,'source_status',src_status,'amount_halalah',round(amt*100)::bigint::text,
  'source_business_date',bd,'source_occurred_at',occurred,'source_recorded_at',recorded,'eligible',coalesce(eligible,false),
  'attributes',coalesce(attrs,'{}'::jsonb));
END;$snapshot$;

CREATE FUNCTION public.accounting_expense_bridge_expected_lines(t text,c text,a bigint,d text,m text,r text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $lines$
DECLARE k text;role text;
BEGIN
 k:=CASE WHEN d='DIRECT_EXPENSE' THEN 'direct_expense' WHEN d IN ('CAPITAL_ASSET','PREPAID_EXPENSE') THEN 'direct_asset' END;
 role:=CASE WHEN k='direct_expense' THEN 'DIRECT_EXPENSE' ELSE 'DIRECT_ASSET' END;
 IF t IN ('CASH_ADVANCE_GOVERNANCE_EVENT','PETTY_CASH_FUND_GOVERNANCE_EVENT') AND c='NO_MONETARY_EFFECT' THEN RETURN '[]'::jsonb;
 ELSIF t='EXPENSE' AND c='NO_MONETARY_EFFECT' THEN RETURN '[]'::jsonb;
 ELSIF t='EXPENSE' AND c='EMPLOYEE_PAID_EXPENSE' AND k IS NOT NULL THEN RETURN jsonb_build_array(
  jsonb_build_object('key',k,'role',role,'side','DEBIT','amount',a),jsonb_build_object('key','employee_reimbursement_liability','role','EMPLOYEE_REIMBURSEMENT_LIABILITY','side','CREDIT','amount',a));
 ELSIF t='EXPENSE' AND c='COMPANY_DIRECT_EXPENSE' AND k IS NOT NULL THEN RETURN jsonb_build_array(
  jsonb_build_object('key',k,'role',role,'side','DEBIT','amount',a),jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','CREDIT','amount',a));
 ELSIF t='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND c='REIMBURSEMENT_CASH' THEN RETURN jsonb_build_array(
  jsonb_build_object('key','employee_reimbursement_liability','role','EMPLOYEE_REIMBURSEMENT_LIABILITY','side','DEBIT','amount',a),jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','CREDIT','amount',a));
 ELSIF t='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND c='REIMBURSEMENT_ADVANCE_OFFSET' THEN RETURN jsonb_build_array(
  jsonb_build_object('key','employee_reimbursement_liability','role','EMPLOYEE_REIMBURSEMENT_LIABILITY','side','DEBIT','amount',a),jsonb_build_object('key','employee_advance','role','EMPLOYEE_ADVANCE','side','CREDIT','amount',a));
 ELSIF t='CASH_ADVANCE_ISSUE' AND c='CASH_ADVANCE_ISSUE' THEN RETURN jsonb_build_array(
  jsonb_build_object('key','employee_advance','role','EMPLOYEE_ADVANCE','side','DEBIT','amount',a),jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','CREDIT','amount',a));
 ELSIF t='CASH_ADVANCE_EXPENSE_SETTLEMENT' AND c='CASH_ADVANCE_EXPENSE_SETTLEMENT' AND k IS NOT NULL THEN RETURN jsonb_build_array(
  jsonb_build_object('key',k,'role',role,'side','DEBIT','amount',a),jsonb_build_object('key','employee_advance','role','EMPLOYEE_ADVANCE','side','CREDIT','amount',a));
 ELSIF t='CASH_ADVANCE_RETURN' AND c='CASH_ADVANCE_RETURN' THEN RETURN jsonb_build_array(
  jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','DEBIT','amount',a),jsonb_build_object('key','employee_advance','role','EMPLOYEE_ADVANCE','side','CREDIT','amount',a));
 ELSIF t='PETTY_CASH_TRANSACTION' AND m='replenishment' AND c='PETTY_REPLENISHMENT' THEN RETURN jsonb_build_array(
  jsonb_build_object('key','petty_cash','role','CASH_ACCOUNTABILITY','side','DEBIT','amount',a),jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','CREDIT','amount',a));
 ELSIF t='PETTY_CASH_TRANSACTION' AND m='disbursement' AND c='PETTY_EXPENSE_DISBURSEMENT' AND k IS NOT NULL THEN RETURN jsonb_build_array(
  jsonb_build_object('key',k,'role',role,'side','DEBIT','amount',a),jsonb_build_object('key','petty_cash','role','CASH_ACCOUNTABILITY','side','CREDIT','amount',a));
 ELSIF t='PETTY_CASH_TRANSACTION' AND m='treasury_withdrawal' AND c='PETTY_TREASURY_WITHDRAWAL' THEN RETURN jsonb_build_array(
  jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','DEBIT','amount',a),jsonb_build_object('key','petty_cash','role','CASH_ACCOUNTABILITY','side','CREDIT','amount',a));
 ELSIF t='PETTY_CASH_TRANSACTION' AND m='return' AND r='FROM_TREASURY' AND c='PETTY_RETURN_FROM_TREASURY' THEN RETURN jsonb_build_array(
  jsonb_build_object('key','petty_cash','role','CASH_ACCOUNTABILITY','side','DEBIT','amount',a),jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','CREDIT','amount',a));
 END IF;RETURN NULL;
END;$lines$;

CREATE FUNCTION public.accounting_expense_bridge_account_authorized(p uuid,k text,a uuid,v integer)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $acct$
 SELECT EXISTS(SELECT 1 FROM public.accounting_account_versions x WHERE x.profile_id=p AND x.account_id=a AND x.version=v
  AND x.account_kind='POSTING' AND x.is_active AND NOT EXISTS(SELECT 1 FROM public.accounting_accounts c
    JOIN public.accounting_account_versions cv ON cv.profile_id=c.profile_id AND cv.account_id=c.id AND cv.version=c.current_version
    WHERE c.profile_id=p AND cv.parent_account_id=x.account_id)
  AND CASE k WHEN 'employee_reimbursement_liability' THEN x.account_type='LIABILITY' AND x.normal_balance='CREDIT' AND x.is_protected AND x.control_classification='EMPLOYEE_REIMBURSEMENT_LIABILITY'
   WHEN 'employee_advance' THEN x.account_type='ASSET' AND x.normal_balance='DEBIT' AND x.is_protected AND x.control_classification='EMPLOYEE_ADVANCE'
   WHEN 'petty_cash' THEN x.account_type='ASSET' AND x.normal_balance='DEBIT' AND x.is_protected AND x.control_classification='CASH_ACCOUNTABILITY'
   WHEN 'cash_account' THEN x.account_type='ASSET' AND x.normal_balance='DEBIT' AND ((x.is_protected AND x.control_classification='CASH_ACCOUNTABILITY') OR (NOT x.is_protected AND x.control_classification='NONE'))
   WHEN 'direct_expense' THEN x.account_type='EXPENSE' AND x.normal_balance='DEBIT' AND NOT x.is_protected AND x.control_classification='NONE'
   WHEN 'direct_asset' THEN x.account_type='ASSET' AND x.normal_balance='DEBIT' AND NOT x.is_protected AND x.control_classification='NONE' ELSE false END);
$acct$;

CREATE FUNCTION public.accounting_expense_bridge_source_inventory(d date,c timestamptz,n integer)
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $inventory$
 SELECT q.item FROM (
   SELECT public.accounting_expense_bridge_source_snapshot('EXPENSE',e.id,c) item FROM public.expenses e WHERE e.expense_date<=d
    AND EXISTS(SELECT 1 FROM public.audit_logs a WHERE a.entity_type='expense' AND a.entity_id=e.id::text
      AND a.action='expense_approved' AND a.timestamp<=coalesce(c,'infinity'::timestamptz))
    AND (NOT EXISTS(SELECT 1 FROM public.audit_logs a WHERE a.entity_type='expense' AND a.entity_id=e.id::text
       AND a.action='expense_cancelled' AND a.timestamp<=coalesce(c,'infinity'::timestamptz))
      OR EXISTS(SELECT 1 FROM public.accounting_expense_bridge_events b WHERE b.source_type='EXPENSE' AND b.source_record_id=e.id
       AND b.created_at<=coalesce(c,'infinity'::timestamptz)))
  UNION ALL SELECT public.accounting_expense_bridge_source_snapshot('EXPENSE_REIMBURSEMENT_SETTLEMENT',x.id,c) FROM public.expense_reimbursement_settlements x WHERE (x.settled_at AT TIME ZONE 'Asia/Riyadh')::date<=d
  UNION ALL SELECT public.accounting_expense_bridge_source_snapshot('CASH_ADVANCE_ISSUE',a.id,c) FROM public.employee_cash_advances a WHERE a.issued_at IS NOT NULL AND (a.issued_at AT TIME ZONE 'Asia/Riyadh')::date<=d
  UNION ALL SELECT public.accounting_expense_bridge_source_snapshot('CASH_ADVANCE_EXPENSE_SETTLEMENT',x.id,c) FROM public.cash_advance_expense_settlements x WHERE (x.settled_at AT TIME ZONE 'Asia/Riyadh')::date<=d
  UNION ALL SELECT public.accounting_expense_bridge_source_snapshot('CASH_ADVANCE_RETURN',x.id,c) FROM public.cash_advance_returns x WHERE (x.returned_at AT TIME ZONE 'Asia/Riyadh')::date<=d
   UNION ALL SELECT public.accounting_expense_bridge_source_snapshot('PETTY_CASH_TRANSACTION',x.id,c) FROM public.petty_cash_transactions x WHERE (x.recorded_at AT TIME ZONE 'Asia/Riyadh')::date<=d
   UNION ALL SELECT public.accounting_expense_bridge_source_snapshot('CASH_ADVANCE_GOVERNANCE_EVENT',l.id,c) FROM public.audit_logs l WHERE l.entity_type='employee_cash_advance' AND l.action IN ('cash_advance_requested','cash_advance_approved','cash_advance_rejected') AND (l.timestamp AT TIME ZONE 'Asia/Riyadh')::date<=d
   UNION ALL SELECT public.accounting_expense_bridge_source_snapshot('PETTY_CASH_FUND_GOVERNANCE_EVENT',l.id,c) FROM public.audit_logs l WHERE l.entity_type='petty_cash_fund' AND l.action IN ('create','update','status_change') AND (l.timestamp AT TIME ZONE 'Asia/Riyadh')::date<=d
 ) q(item) WHERE q.item IS NOT NULL ORDER BY q.item->>'source_type',q.item->>'source_record_id' LIMIT n;
 $inventory$;
CREATE FUNCTION public.accounting_expense_bridge_line_authorized(
 p_profile uuid,p_journal jsonb,p_line integer,p_key text,p_account uuid,p_account_version integer,p_actor uuid
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $line$
DECLARE e public.accounting_expense_bridge_events%ROWTYPE;v public.accounting_expense_bridge_event_versions%ROWTYPE;
 x jsonb;expected jsonb;lines jsonb;wanted uuid;wanted_version integer;
BEGIN
 IF p_journal->>'source_domain'<>'EXPENSE_BRIDGE' OR NOT public.get_accounting_capability(p_actor,'accounting:manage_expense_bridge') THEN RETURN false;END IF;
 SELECT * INTO e FROM public.accounting_expense_bridge_events WHERE profile_id=p_profile AND source_record_key=p_journal->>'source_record_key'
  AND economic_event_key=p_journal->>'economic_event_key';
 IF NOT FOUND THEN RETURN false;END IF;
 SELECT * INTO v FROM public.accounting_expense_bridge_event_versions WHERE profile_id=p_profile AND event_id=e.id AND version=e.current_version AND status='READY';
 IF NOT FOUND OR public.accounting_expense_bridge_source_snapshot(e.source_type,e.source_record_id) IS DISTINCT FROM v.source_snapshot
   OR encode(extensions.digest(convert_to(v.source_snapshot::text,'UTF8'),'sha256'),'hex') IS DISTINCT FROM v.source_snapshot_sha256
   OR p_journal->>'posting_purpose'<>'expense_bridge' OR p_journal->>'accounting_date' IS DISTINCT FROM v.accounting_date::text THEN RETURN false;END IF;
  expected:=public.accounting_expense_bridge_expected_lines(e.source_type,v.classification,v.amount_halalah,v.direct_classification,
    CASE WHEN e.source_type IN ('EXPENSE_REIMBURSEMENT_SETTLEMENT','PETTY_CASH_TRANSACTION') THEN v.source_snapshot->>'source_subtype'
     ELSE v.source_snapshot->>'payment_method' END,v.return_direction);lines:=coalesce(p_journal->'lines','[]'::jsonb);
 IF expected IS NULL OR jsonb_array_length(lines)<>jsonb_array_length(expected) OR p_line NOT BETWEEN 1 AND jsonb_array_length(expected) THEN RETURN false;END IF;
 x:=lines->(p_line-1);
 IF x->>'mapping_key' IS DISTINCT FROM expected->(p_line-1)->>'key' OR p_key IS DISTINCT FROM expected->(p_line-1)->>'key'
   OR x->>'side' IS DISTINCT FROM expected->(p_line-1)->>'side'
   OR (x->>'amount_halalah')::bigint IS DISTINCT FROM (expected->(p_line-1)->>'amount')::bigint
   OR nullif(x->>'service_id','') IS DISTINCT FROM v.service_id::text THEN RETURN false;END IF;
 wanted:=CASE WHEN p_key IN ('direct_expense','direct_asset') THEN v.expense_account_id
   WHEN p_key IN ('employee_reimbursement_liability','petty_cash') THEN v.control_account_id WHEN p_key='employee_advance' THEN v.advance_account_id
   WHEN p_key='cash_account' THEN v.cash_account_id END;
 wanted_version:=CASE WHEN p_key IN ('direct_expense','direct_asset') THEN v.expense_account_version
   WHEN p_key IN ('employee_reimbursement_liability','petty_cash') THEN v.control_account_version WHEN p_key='employee_advance' THEN v.advance_account_version
   WHEN p_key='cash_account' THEN v.cash_account_version END;
 RETURN wanted=p_account AND wanted_version=p_account_version
   AND public.accounting_expense_bridge_account_authorized(p_profile,p_key,p_account,p_account_version);
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END;$line$;

CREATE FUNCTION public.accounting_expense_bridge_journal_link_authorized(p_profile uuid,p_journal uuid,p_version integer,p_actor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $linkauth$
 SELECT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links l
  JOIN public.accounting_expense_bridge_event_versions v ON v.profile_id=l.profile_id AND v.event_id=l.event_id AND v.version=l.event_version
  WHERE l.profile_id=p_profile AND l.journal_id=p_journal AND l.prepared_version=p_version AND v.status='READY' AND v.created_by=p_actor);
$linkauth$;

CREATE FUNCTION public.accounting_expense_bridge_journal_account_authorized(
 p_profile uuid,p_journal uuid,p_version integer,p_line integer,p_account uuid,p_account_version integer,p_actor uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $lineauth$
 SELECT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l
  JOIN public.accounting_expense_bridge_journal_links x ON x.profile_id=l.profile_id AND x.event_id=l.event_id
   AND x.event_version=l.event_version AND x.journal_id=l.journal_id AND x.prepared_version=l.journal_version
  WHERE l.profile_id=p_profile AND l.journal_id=p_journal AND l.journal_version=p_version AND l.line_number=p_line
   AND l.account_id=p_account AND l.account_version=p_account_version
   AND public.accounting_expense_bridge_journal_link_authorized(p_profile,p_journal,p_version,p_actor)
   AND public.accounting_expense_bridge_account_authorized(p_profile,CASE l.party_role
    WHEN 'DIRECT_EXPENSE' THEN 'direct_expense' WHEN 'DIRECT_ASSET' THEN 'direct_asset' WHEN 'EMPLOYEE_REIMBURSEMENT_LIABILITY' THEN 'employee_reimbursement_liability' WHEN 'EMPLOYEE_ADVANCE' THEN 'employee_advance' WHEN 'CASH_ACCOUNTABILITY' THEN 'petty_cash'
    WHEN 'CASH_ACCOUNT' THEN 'cash_account' END,p_account,p_account_version));
$lineauth$;

CREATE FUNCTION public.accounting_expense_bridge_source_effect_link() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $effect$
DECLARE e public.accounting_expense_bridge_events%ROWTYPE;v public.accounting_expense_bridge_event_versions%ROWTYPE;
 j public.accounting_journal_versions%ROWTYPE;expected jsonb;x record;item jsonb;k text;aid uuid;av integer;
BEGIN
 IF NEW.source_domain<>'EXPENSE_BRIDGE' THEN RETURN NEW;END IF;
 SELECT * INTO e FROM public.accounting_expense_bridge_events WHERE profile_id=NEW.profile_id
  AND source_record_key=NEW.source_record_key AND economic_event_key=NEW.economic_event_key;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_EXPENSE_BRIDGE_EVENT_NOT_FOUND';END IF;
 SELECT * INTO v FROM public.accounting_expense_bridge_event_versions WHERE profile_id=NEW.profile_id
  AND event_id=e.id AND version=e.current_version AND status='READY';
 SELECT * INTO j FROM public.accounting_journal_versions WHERE profile_id=NEW.profile_id AND journal_id=NEW.journal_id
  AND version=NEW.journal_version AND source_domain='EXPENSE_BRIDGE' AND posting_purpose='expense_bridge';
 IF NOT FOUND OR v.event_id IS NULL OR public.accounting_expense_bridge_source_snapshot(e.source_type,e.source_record_id) IS DISTINCT FROM v.source_snapshot
  OR NEW.payload_fingerprint IS DISTINCT FROM j.payload_fingerprint THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_EXPENSE_BRIDGE_SOURCE_CONFLICT';END IF;
  expected:=public.accounting_expense_bridge_expected_lines(e.source_type,v.classification,v.amount_halalah,v.direct_classification,
   CASE WHEN e.source_type IN ('EXPENSE_REIMBURSEMENT_SETTLEMENT','PETTY_CASH_TRANSACTION') THEN v.source_snapshot->>'source_subtype'
    ELSE v.source_snapshot->>'payment_method' END,v.return_direction);
 IF expected IS NULL OR jsonb_array_length(expected)<>(SELECT count(*) FROM public.accounting_journal_line_versions
  WHERE profile_id=NEW.profile_id AND journal_id=NEW.journal_id AND journal_version=NEW.journal_version) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_EXPENSE_BRIDGE_JOURNAL_SHAPE_INVALID';END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.status<>'PREPARED' OR NEW.status<>'POSTED' OR NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links
   WHERE profile_id=NEW.profile_id AND journal_id=NEW.journal_id AND prepared_version=NEW.journal_version-1 AND source_effect_id=NEW.id) THEN
   RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_EXPENSE_BRIDGE_EFFECT_TRANSITION_INVALID';END IF;
  RETURN NEW;
 END IF;
 IF NEW.status<>'PREPARED' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_EXPENSE_BRIDGE_EFFECT_STATUS_INVALID';END IF;
 INSERT INTO public.accounting_expense_bridge_journal_links(profile_id,event_id,event_version,journal_id,prepared_version,source_effect_id,
  expense_id,advance_id,employee_id,fund_id,service_id,source_type,source_record_id)
  VALUES(NEW.profile_id,e.id,v.version,NEW.journal_id,NEW.journal_version,NEW.id,v.expense_id,
   coalesce(v.advance_id,v.related_advance_id),v.employee_id,v.fund_id,v.service_id,e.source_type,e.source_record_id);
 FOR x IN SELECT l.* FROM public.accounting_journal_line_versions l WHERE l.profile_id=NEW.profile_id
  AND l.journal_id=NEW.journal_id AND l.journal_version=NEW.journal_version ORDER BY l.line_number LOOP
  item:=expected->(x.line_number-1);k:=item->>'key';
  aid:=CASE WHEN k IN ('direct_expense','direct_asset') THEN v.expense_account_id
   WHEN k IN ('employee_reimbursement_liability','petty_cash') THEN v.control_account_id WHEN k='employee_advance' THEN v.advance_account_id
   WHEN k='cash_account' THEN v.cash_account_id END;
  av:=CASE WHEN k IN ('direct_expense','direct_asset') THEN v.expense_account_version
   WHEN k IN ('employee_reimbursement_liability','petty_cash') THEN v.control_account_version WHEN k='employee_advance' THEN v.advance_account_version
   WHEN k='cash_account' THEN v.cash_account_version END;
  IF x.mapping_key IS DISTINCT FROM k OR x.side IS DISTINCT FROM item->>'side'
    OR x.amount_halalah IS DISTINCT FROM (item->>'amount')::bigint OR x.account_id IS DISTINCT FROM aid OR x.account_version IS DISTINCT FROM av THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_EXPENSE_BRIDGE_ACCOUNT_INVALID';END IF;
  INSERT INTO public.accounting_expense_bridge_journal_lines(profile_id,event_id,event_version,journal_id,journal_version,line_number,
   party_role,employee_id,expense_id,advance_id,fund_id,service_id,source_type,source_record_id,account_id,account_version,amount_halalah,side)
  VALUES(NEW.profile_id,e.id,v.version,NEW.journal_id,NEW.journal_version,x.line_number,item->>'role',v.employee_id,v.expense_id,
   coalesce(v.advance_id,v.related_advance_id),v.fund_id,v.service_id,e.source_type,e.source_record_id,x.account_id,x.account_version,x.amount_halalah,x.side);
 END LOOP;
 RETURN NEW;
END;$effect$;
CREATE TRIGGER accounting_expense_bridge_effect_link AFTER INSERT OR UPDATE OF status ON public.accounting_source_effects
  FOR EACH ROW EXECUTE FUNCTION public.accounting_expense_bridge_source_effect_link();
CREATE FUNCTION public.save_accounting_expense_bridge_event(
 p_actor uuid,p_type text,p_source_id uuid,p_expected integer,p_contract jsonb,p_reason text,p_request uuid
) RETURNS TABLE(error_code text,event_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $save$
DECLARE profile uuid;snapshot jsonb;snapshot_hash text;source_key text;economic_key text;e public.accounting_expense_bridge_events%ROWTYPE;
 f public.accounting_foundation_events%ROWTYPE;vnum integer;amount bigint;state text;held text;class text;direct text;attrib text;acct_date date;
 expacct uuid;expver integer;ctrl uuid;ctrlver integer;advanceacct uuid;advancever integer;cash uuid;cashver integer;related uuid;direction text;
 evidence text;evidence_hash text;cash_ref text;cash_hash text;adv_ref text;adv_hash text;lines jsonb;item jsonb;key text;aid uuid;aver integer;fid uuid;fp text;
BEGIN
 IF p_actor IS NULL OR p_type NOT IN ('EXPENSE','EXPENSE_REIMBURSEMENT_SETTLEMENT','CASH_ADVANCE_ISSUE',
    'CASH_ADVANCE_EXPENSE_SETTLEMENT','CASH_ADVANCE_RETURN','PETTY_CASH_TRANSACTION','CASH_ADVANCE_GOVERNANCE_EVENT','PETTY_CASH_FUND_GOVERNANCE_EVENT') OR p_source_id IS NULL
   OR p_expected IS NULL OR p_expected<0 OR p_contract IS NULL OR jsonb_typeof(p_contract)<>'object' OR p_request IS NULL
   OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000
   OR p_contract-ARRAY['classification','direct_classification','accounting_date','service_attribution','expense_account_id','expense_account_version',
     'control_account_id','control_account_version','advance_account_id','advance_account_version','cash_account_id','cash_account_version','cash_binding_evidence_ref','cash_binding_evidence_sha256',
     'evidence_ref','evidence_sha256','related_advance_id','advance_provenance_evidence_ref','advance_provenance_evidence_sha256','return_direction']<>'{}'::jsonb THEN
  RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active) THEN
  RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 IF NOT public.get_accounting_capability(p_actor,'accounting:manage_expense_bridge') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
 SELECT p.id INTO profile FROM public.accounting_profiles p JOIN public.accounting_profile_versions pv
  ON pv.profile_id=p.id AND pv.version=p.current_version WHERE p.singleton_key='g7' AND pv.activation_state='DEV_PROVISIONAL' FOR SHARE OF p;
 IF NOT FOUND THEN RETURN QUERY SELECT 'profile_not_active'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 snapshot:=public.accounting_expense_bridge_source_snapshot(p_type,p_source_id);
 IF snapshot IS NULL THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  IF NOT coalesce((snapshot->>'eligible')::boolean,false) THEN
   RETURN QUERY SELECT 'source_not_eligible'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 class:=p_contract->>'classification';direct:=nullif(p_contract->>'direct_classification','');
 attrib:=p_contract->>'service_attribution';acct_date:=nullif(p_contract->>'accounting_date','')::date;
 expacct:=nullif(p_contract->>'expense_account_id','')::uuid;expver:=nullif(p_contract->>'expense_account_version','')::integer;
  ctrl:=nullif(p_contract->>'control_account_id','')::uuid;ctrlver:=nullif(p_contract->>'control_account_version','')::integer;advanceacct:=nullif(p_contract->>'advance_account_id','')::uuid;advancever:=nullif(p_contract->>'advance_account_version','')::integer;
 cash:=nullif(p_contract->>'cash_account_id','')::uuid;cashver:=nullif(p_contract->>'cash_account_version','')::integer;
 related:=nullif(p_contract->>'related_advance_id','')::uuid;direction:=nullif(p_contract->>'return_direction','');
 evidence:=nullif(btrim(p_contract->>'evidence_ref'),'');evidence_hash:=nullif(p_contract->>'evidence_sha256','');
 cash_ref:=nullif(btrim(p_contract->>'cash_binding_evidence_ref'),'');cash_hash:=nullif(p_contract->>'cash_binding_evidence_sha256','');
 adv_ref:=nullif(btrim(p_contract->>'advance_provenance_evidence_ref'),'');adv_hash:=nullif(p_contract->>'advance_provenance_evidence_sha256','');
   IF (expacct IS NULL)<>(expver IS NULL) OR (ctrl IS NULL)<>(ctrlver IS NULL) OR (advanceacct IS NULL)<>(advancever IS NULL) OR ((cash IS NULL)<>(cashver IS NULL) AND NOT (p_type='PETTY_CASH_TRANSACTION' AND snapshot->>'source_subtype'='return'))
    OR (evidence IS NULL)<>(evidence_hash IS NULL) OR ((cash_ref IS NULL)<>(cash_hash IS NULL) AND NOT (p_type='PETTY_CASH_TRANSACTION' AND snapshot->>'source_subtype'='return')) OR ((adv_ref IS NULL)<>(adv_hash IS NULL) AND NOT (p_type='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND snapshot->>'source_subtype'='advance_offset'))
   OR (evidence_hash IS NOT NULL AND evidence_hash!~'^[0-9a-f]{64}$')
    OR (cash_hash IS NOT NULL AND cash_hash!~'^[0-9a-f]{64}$' AND NOT (p_type='PETTY_CASH_TRANSACTION' AND snapshot->>'source_subtype'='return')) OR (adv_hash IS NOT NULL AND adv_hash!~'^[0-9a-f]{64}$' AND NOT (p_type='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND snapshot->>'source_subtype'='advance_offset'))
    OR attrib IS NULL OR attrib NOT IN ('SERVICE','OVERHEAD')
    OR (p_type='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND snapshot->>'source_subtype' NOT IN ('bank_transfer','cash','advance_offset'))
   OR (attrib='SERVICE' AND nullif(snapshot->>'service_id','') IS NULL)
   OR (attrib='OVERHEAD' AND nullif(snapshot->>'service_id','') IS NOT NULL) THEN
  RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  IF p_type='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND snapshot->>'source_subtype'='advance_offset' THEN
   class:='REIMBURSEMENT_ADVANCE_OFFSET';
    IF related IS NULL OR adv_ref IS NULL OR adv_hash IS NULL OR adv_hash!~'^[0-9a-f]{64}$' OR
      NOT EXISTS(SELECT 1 FROM public.employee_cash_advances a JOIN public.audit_logs i
       ON i.entity_type='employee_cash_advance' AND i.entity_id=a.id::text AND i.action='cash_advance_issued'
       WHERE a.id=related AND a.recipient_id=nullif(snapshot->>'employee_id','')::uuid
        AND a.context_type=snapshot->>'context_type' AND a.service_id IS NOT DISTINCT FROM nullif(snapshot->>'service_id','')::uuid
        AND a.issued_at<=nullif(snapshot->>'source_occurred_at','')::timestamptz
        AND i.timestamp<=nullif(snapshot->>'source_occurred_at','')::timestamptz) THEN
    state:='HELD';held:='ADVANCE_OFFSET_PROVENANCE_REQUIRED';
   END IF;
  ELSIF p_type='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND
    (snapshot->>'source_subtype'='advance_offset' OR class='REIMBURSEMENT_ADVANCE_OFFSET' OR related IS NOT NULL OR adv_ref IS NOT NULL) THEN
   state:='HELD';held:='unsupported_source_treatment';
  END IF;
 snapshot_hash:=encode(extensions.digest(convert_to(snapshot::text,'UTF8'),'sha256'),'hex');
 source_key:=snapshot->>'source_record_key';economic_key:=snapshot->>'economic_event_key';amount:=(snapshot->>'amount_halalah')::bigint;
  lines:=public.accounting_expense_bridge_expected_lines(p_type,class,amount,direct,
    CASE WHEN p_type IN ('EXPENSE_REIMBURSEMENT_SETTLEMENT','PETTY_CASH_TRANSACTION') THEN snapshot->>'source_subtype'
     ELSE snapshot->>'payment_method' END,direction);
  IF p_type IN ('CASH_ADVANCE_GOVERNANCE_EVENT','PETTY_CASH_FUND_GOVERNANCE_EVENT') THEN
   IF class IS DISTINCT FROM 'NO_MONETARY_EFFECT' THEN state:='HELD';held:='unsupported_source_treatment';class:='HELD_UNSUPPORTED_TREATMENT';lines:=NULL;
   ELSE state:='NO_EFFECT';held:=NULL;class:='NO_MONETARY_EFFECT';lines:='[]'::jsonb;END IF;
   direct:=NULL;acct_date:=NULL;expacct:=NULL;expver:=NULL;ctrl:=NULL;ctrlver:=NULL;advanceacct:=NULL;advancever:=NULL;cash:=NULL;cashver:=NULL;
   related:=NULL;direction:=NULL;evidence:=NULL;evidence_hash:=NULL;cash_ref:=NULL;cash_hash:=NULL;adv_ref:=NULL;adv_hash:=NULL;
  END IF;
  IF state IS NULL THEN
    state:=CASE WHEN lines IS NULL THEN 'HELD' ELSE 'READY' END;
    IF state='HELD' THEN held:='unsupported_source_treatment';END IF;
  END IF;
 IF state<>'HELD' AND NOT coalesce((snapshot->>'eligible')::boolean,false) THEN state:='HELD';held:='source_not_eligible';END IF;
  IF p_type='EXPENSE' AND snapshot->>'payment_method' IN ('petty_cash','cash_advance') AND state<>'HELD' THEN
   state:='NO_EFFECT';held:=NULL;class:='NO_MONETARY_EFFECT';direct:=NULL;acct_date:=NULL;lines:='[]'::jsonb;
    expacct:=NULL;expver:=NULL;ctrl:=NULL;ctrlver:=NULL;advanceacct:=NULL;advancever:=NULL;cash:=NULL;cashver:=NULL;related:=NULL;direction:=NULL;
   evidence:=NULL;evidence_hash:=NULL;cash_ref:=NULL;cash_hash:=NULL;adv_ref:=NULL;adv_hash:=NULL;
  END IF;
 IF state='READY' AND (acct_date IS NULL OR evidence IS NULL OR evidence_hash IS NULL) THEN state:='HELD';held:='classification_evidence_missing';END IF;
 IF state='READY' AND p_type='EXPENSE' AND class='EMPLOYEE_PAID_EXPENSE'
   AND (snapshot->>'origin_type'<>'employee_paid' OR snapshot->>'payment_method'<>'personal_funds') THEN state:='HELD';held:='unsupported_source_treatment';END IF;
 IF state='READY' AND p_type='EXPENSE' AND class='COMPANY_DIRECT_EXPENSE'
   AND (snapshot->>'origin_type'<>'company_direct' OR snapshot->>'payment_method'<>'company_funds') THEN state:='HELD';held:='unsupported_source_treatment';END IF;
 IF state='READY' AND p_type='EXPENSE_REIMBURSEMENT_SETTLEMENT'
   AND (snapshot->>'origin_type'<>'employee_paid' OR snapshot->>'payment_method'<>'personal_funds') THEN state:='HELD';held:='unsupported_source_treatment';END IF;
  IF p_type='PETTY_CASH_TRANSACTION' AND snapshot->>'source_subtype'='return'
    AND (direction IS DISTINCT FROM 'FROM_TREASURY' OR class<>'PETTY_RETURN_FROM_TREASURY'
       OR cash IS NULL OR cashver IS NULL OR cash_ref IS NULL OR cash_hash IS NULL OR cash_hash!~'^[0-9a-f]{64}$' OR NOT public.accounting_expense_bridge_account_authorized(profile,'cash_account',cash,cashver)) THEN
  state:='HELD';held:='PETTY_CASH_RETURN_PROVENANCE_REQUIRED';END IF;
 IF state='READY' AND (lines IS NULL OR jsonb_array_length(lines)=0) THEN state:='HELD';held:='unsupported_source_treatment';END IF;
 IF state='READY' THEN
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(lines) x WHERE x->>'key'='cash_account')
    AND (cash IS NULL OR cash_ref IS NULL OR cash_hash IS NULL) THEN state:='HELD';held:='cash_account_evidence_missing';END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(lines) x WHERE x->>'key' IN ('direct_expense','direct_asset'))
    AND NOT public.accounting_expense_bridge_account_authorized(profile,CASE WHEN direct='DIRECT_EXPENSE' THEN 'direct_expense' ELSE 'direct_asset' END,expacct,expver)
    THEN state:='HELD';held:='classification_evidence_missing';END IF;
  IF (EXISTS(SELECT 1 FROM jsonb_array_elements(lines) x WHERE x->>'key'='employee_reimbursement_liability') AND NOT public.accounting_expense_bridge_account_authorized(profile,'employee_reimbursement_liability',ctrl,ctrlver)) OR (EXISTS(SELECT 1 FROM jsonb_array_elements(lines) x WHERE x->>'key'='employee_advance') AND NOT public.accounting_expense_bridge_account_authorized(profile,'employee_advance',advanceacct,advancever)) OR (EXISTS(SELECT 1 FROM jsonb_array_elements(lines) x WHERE x->>'key'='petty_cash') AND NOT public.accounting_expense_bridge_account_authorized(profile,'petty_cash',ctrl,ctrlver)) THEN state:='HELD';held:='classification_evidence_missing';END IF;
  END IF;
  IF cash IS NOT NULL AND NOT public.accounting_expense_bridge_account_authorized(profile,'cash_account',cash,cashver)
    THEN state:='HELD';held:='cash_account_evidence_missing';END IF;
 END IF;
 IF state='READY' AND p_type='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND snapshot->>'source_subtype'='advance_offset'
   AND (related IS NULL OR adv_ref IS NULL OR adv_hash IS NULL) THEN state:='HELD';held:='ADVANCE_OFFSET_PROVENANCE_REQUIRED';END IF;
  IF state='READY' AND p_type='PETTY_CASH_TRANSACTION' AND snapshot->>'source_subtype'='return'
    AND class<>'PETTY_RETURN_FROM_TREASURY' THEN state:='HELD';held:='PETTY_CASH_RETURN_PROVENANCE_REQUIRED';END IF;
 IF EXISTS(SELECT 1 FROM public.accounting_inception_coverage c JOIN public.accounting_inception_coverage_versions cv
   ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id AND cv.version=c.current_version
   WHERE c.profile_id=profile AND c.source_record_key=source_key AND c.economic_event_key=economic_key
    AND cv.classification IN ('OPENING_BALANCE','RECONSTRUCTED_HISTORY','UNRESOLVED')) AND state='READY' THEN
  state:='HELD';held:='inception_coverage_conflict';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e2-profile:'||profile::text,0));
 SELECT * INTO f FROM public.accounting_foundation_events WHERE profile_id=profile AND actor_user_id=p_actor AND request_id=p_request;
 fp:=encode(extensions.digest(convert_to(jsonb_build_object('source_type',p_type,'source_record_id',p_source_id,'expected_version',p_expected,
   'contract',p_contract,'snapshot_sha256',snapshot_hash,'reason',btrim(p_reason))::text,'UTF8'),'sha256'),'hex');
 IF FOUND THEN
  IF f.payload_fingerprint<>fp THEN RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  RETURN QUERY SELECT NULL::text,f.entity_id,f.entity_version,
    coalesce((SELECT v.status FROM public.accounting_expense_bridge_event_versions v WHERE v.event_id=f.entity_id AND v.version=f.entity_version),'HELD'),true;RETURN;
 END IF;
 SELECT * INTO e FROM public.accounting_expense_bridge_events WHERE profile_id=profile AND source_type=p_type AND source_record_id=p_source_id FOR UPDATE;
 IF FOUND THEN
  IF e.current_version<>p_expected THEN RETURN QUERY SELECT 'revision_conflict'::text,e.id,e.current_version,NULL::text,false;RETURN;END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_expense_bridge_event_versions v WHERE v.profile_id=profile AND v.event_id=e.id AND v.source_snapshot_sha256<>snapshot_hash)
    THEN RETURN QUERY SELECT 'source_payload_conflict'::text,e.id,e.current_version,NULL::text,false;RETURN;END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links x WHERE x.profile_id=profile AND x.event_id=e.id)
    THEN RETURN QUERY SELECT 'source_identity_immutable'::text,e.id,e.current_version,NULL::text,false;RETURN;END IF;
  vnum:=e.current_version+1;
 ELSE
  IF p_expected<>0 THEN RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,0,NULL::text,false;RETURN;END IF;
  INSERT INTO public.accounting_expense_bridge_events(profile_id,source_type,source_record_id,source_record_key,economic_event_key)
   VALUES(profile,p_type,p_source_id,source_key,economic_key) RETURNING * INTO e;vnum:=1;
 END IF;
 fid:=gen_random_uuid();
 INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
   reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
 VALUES(fid,profile,CASE WHEN state='HELD' THEN 'accounting_expense_bridge_event_held' ELSE 'accounting_expense_bridge_event_classified' END,
  'accounting_expense_bridge_event',e.id,vnum,p_actor,p_request,btrim(p_reason),evidence,fp,
  'accounting_expense_bridge_events/'||e.id::text||'/'||vnum::text,clock_timestamp());
 INSERT INTO public.accounting_expense_bridge_event_versions(profile_id,event_id,version,previous_version,status,classification,source_snapshot,
  source_snapshot_sha256,amount_halalah,direct_classification,service_attribution,employee_id,service_id,expense_id,advance_id,fund_id,
   expense_account_id,expense_account_version,control_account_id,control_account_version,advance_account_id,advance_account_version,cash_account_id,cash_account_version,related_advance_id,
  return_direction,accounting_date,source_business_date,source_occurred_at,source_recorded_at,evidence_ref,evidence_sha256,
  cash_binding_evidence_ref,cash_binding_evidence_sha256,advance_provenance_evidence_ref,advance_provenance_evidence_sha256,held_code,reason,
  created_by,payload_fingerprint,foundation_event_id)
 VALUES(profile,e.id,vnum,CASE WHEN vnum=1 THEN NULL ELSE vnum-1 END,state,coalesce(class,'HELD_UNSUPPORTED_TREATMENT'),snapshot,
  snapshot_hash,amount,direct,attrib,nullif(snapshot->>'employee_id','')::uuid,nullif(snapshot->>'service_id','')::uuid,
  nullif(snapshot->>'expense_id','')::uuid,nullif(snapshot->>'advance_id','')::uuid,nullif(snapshot->>'fund_id','')::uuid,
    expacct,expver,ctrl,ctrlver,advanceacct,advancever,cash,cashver,related,direction,CASE WHEN state='NO_EFFECT' THEN NULL ELSE acct_date END,
  nullif(snapshot->>'source_business_date','')::date,nullif(snapshot->>'source_occurred_at','')::timestamptz,
  (snapshot->>'source_recorded_at')::timestamptz,evidence,evidence_hash,cash_ref,cash_hash,adv_ref,adv_hash,held,btrim(p_reason),
  p_actor,fp,fid);
 UPDATE public.accounting_expense_bridge_events SET current_version=vnum WHERE profile_id=profile AND id=e.id;
 INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
 VALUES(CASE WHEN state='HELD' THEN 'hold' ELSE 'classify' END,'accounting_expense_bridge_event',e.id,p_actor::text,
   jsonb_build_object('version',vnum,'request_id',p_request,'source_type',p_type,'source_record_id',p_source_id,'held_code',held),clock_timestamp());
 RETURN QUERY SELECT NULL::text,e.id,vnum,state,false;
EXCEPTION WHEN unique_violation THEN RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false;
 WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false;
 END;$save$;
CREATE FUNCTION public.prepare_accounting_expense_bridge_event(
 p_actor uuid,p_event_id uuid,p_event_version integer,p_period uuid,p_period_version integer,p_rule uuid,p_rule_version integer,
 p_reason text,p_request uuid
) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $prepare$
DECLARE profile uuid;e public.accounting_expense_bridge_events%ROWTYPE;v public.accounting_expense_bridge_event_versions%ROWTYPE;
 snapshot jsonb;expected jsonb;lines jsonb;payload jsonb;result record;balance bigint;expense_total bigint;advance uuid;x jsonb;
BEGIN
 IF p_actor IS NULL OR p_event_id IS NULL OR p_event_version<1 OR p_period IS NULL OR p_period_version IS NULL OR p_rule IS NULL OR p_rule_version IS NULL
  OR p_request IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000 THEN
  RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active) THEN
  RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 IF NOT public.get_accounting_capability(p_actor,'accounting:manage_expense_bridge') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
 SELECT p.id INTO profile FROM public.accounting_profiles p JOIN public.accounting_profile_versions pv
  ON pv.profile_id=p.id AND pv.version=p.current_version WHERE p.singleton_key='g7' AND pv.activation_state='DEV_PROVISIONAL' FOR SHARE OF p;
 SELECT * INTO e FROM public.accounting_expense_bridge_events WHERE profile_id=profile AND id=p_event_id FOR UPDATE;
 IF NOT FOUND THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 SELECT * INTO v FROM public.accounting_expense_bridge_event_versions WHERE profile_id=profile AND event_id=e.id AND version=p_event_version;
 IF e.current_version<>p_event_version THEN RETURN QUERY SELECT 'revision_conflict'::text,e.id,e.current_version,NULL::text,false;RETURN;END IF;
 IF NOT FOUND OR v.status<>'READY' THEN RETURN QUERY SELECT 'unsupported_classification'::text,e.id,p_event_version,NULL::text,false;RETURN;END IF;
 snapshot:=public.accounting_expense_bridge_source_snapshot(e.source_type,e.source_record_id);
 IF snapshot IS NULL OR snapshot IS DISTINCT FROM v.source_snapshot OR
   encode(extensions.digest(convert_to(snapshot::text,'UTF8'),'sha256'),'hex') IS DISTINCT FROM v.source_snapshot_sha256 THEN
  RETURN QUERY SELECT 'source_payload_conflict'::text,e.id,p_event_version,NULL::text,false;RETURN;END IF;
 IF EXISTS(SELECT 1 FROM public.accounting_inception_coverage c JOIN public.accounting_inception_coverage_versions cv
   ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id AND cv.version=c.current_version
   WHERE c.profile_id=profile AND c.source_record_key=e.source_record_key AND c.economic_event_key=e.economic_event_key
    AND cv.classification IN ('OPENING_BALANCE','RECONSTRUCTED_HISTORY','UNRESOLVED')) THEN
  RETURN QUERY SELECT 'duplicate_coverage'::text,e.id,p_event_version,NULL::text,false;RETURN;END IF;
  expected:=public.accounting_expense_bridge_expected_lines(e.source_type,v.classification,v.amount_halalah,
    v.direct_classification,CASE WHEN e.source_type IN ('EXPENSE_REIMBURSEMENT_SETTLEMENT','PETTY_CASH_TRANSACTION')
      THEN snapshot->>'source_subtype' ELSE snapshot->>'payment_method' END,v.return_direction);
 IF expected IS NULL OR jsonb_array_length(expected)=0 THEN
  RETURN QUERY SELECT 'unsupported_classification'::text,e.id,p_event_version,NULL::text,false;RETURN;END IF;

 IF e.source_type='EXPENSE_REIMBURSEMENT_SETTLEMENT' THEN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e2-expense:'||v.expense_id::text,0));
  SELECT coalesce(sum(CASE WHEN l.side='CREDIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0) INTO balance
  FROM public.accounting_expense_bridge_journal_lines l JOIN public.accounting_expense_bridge_journal_links x
    ON x.profile_id=l.profile_id AND x.event_id=l.event_id AND x.event_version=l.event_version
    JOIN public.accounting_source_effects se ON se.id=x.source_effect_id AND se.status IN ('PREPARED','POSTED')
  WHERE l.profile_id=profile AND l.expense_id=v.expense_id AND l.party_role='EMPLOYEE_REIMBURSEMENT_LIABILITY';
  IF v.amount_halalah>balance OR NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l
    JOIN public.accounting_expense_bridge_journal_links x ON x.profile_id=l.profile_id AND x.event_id=l.event_id AND x.event_version=l.event_version
    JOIN public.accounting_source_effects se ON se.id=x.source_effect_id AND se.status='POSTED'
    WHERE l.profile_id=profile AND l.expense_id=v.expense_id AND l.source_type='EXPENSE' AND l.party_role='EMPLOYEE_REIMBURSEMENT_LIABILITY') THEN
   RETURN QUERY SELECT 'reimbursement_ceiling_exceeded'::text,e.id,p_event_version,NULL::text,false;RETURN;END IF;
 END IF;
 advance:=coalesce(v.advance_id,v.related_advance_id);
 IF e.source_type IN ('CASH_ADVANCE_EXPENSE_SETTLEMENT','CASH_ADVANCE_RETURN')
    OR (e.source_type='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND v.classification='REIMBURSEMENT_ADVANCE_OFFSET') THEN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e2-advance:'||advance::text,0));
  SELECT coalesce(sum(CASE WHEN l.side='DEBIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0) INTO balance
  FROM public.accounting_expense_bridge_journal_lines l JOIN public.accounting_expense_bridge_journal_links x
    ON x.profile_id=l.profile_id AND x.event_id=l.event_id AND x.event_version=l.event_version
    JOIN public.accounting_source_effects se ON se.id=x.source_effect_id AND se.status IN ('PREPARED','POSTED')
  WHERE l.profile_id=profile AND l.advance_id=advance AND l.party_role='EMPLOYEE_ADVANCE';
  IF balance<=0 OR NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_lines l
    JOIN public.accounting_expense_bridge_journal_links x ON x.profile_id=l.profile_id AND x.event_id=l.event_id AND x.event_version=l.event_version
    JOIN public.accounting_source_effects se ON se.id=x.source_effect_id AND se.status='POSTED'
    WHERE l.profile_id=profile AND l.advance_id=advance AND l.source_type='CASH_ADVANCE_ISSUE' AND l.party_role='EMPLOYEE_ADVANCE') THEN
   RETURN QUERY SELECT 'cash_advance_effect_missing'::text,e.id,p_event_version,NULL::text,false;RETURN;END IF;
  IF v.amount_halalah>balance THEN RETURN QUERY SELECT 'advance_balance_exceeded'::text,e.id,p_event_version,NULL::text,false;RETURN;END IF;
 END IF;
 IF e.source_type='CASH_ADVANCE_EXPENSE_SETTLEMENT' THEN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e2-expense:'||v.expense_id::text,0));
  SELECT round(amount*100)::bigint INTO expense_total FROM public.expenses WHERE id=v.expense_id;
  SELECT coalesce(sum(l.amount_halalah),0) INTO balance FROM public.accounting_expense_bridge_journal_lines l
   JOIN public.accounting_expense_bridge_journal_links x ON x.profile_id=l.profile_id AND x.event_id=l.event_id AND x.event_version=l.event_version
   JOIN public.accounting_source_effects se ON se.id=x.source_effect_id AND se.status IN ('PREPARED','POSTED')
    WHERE l.profile_id=profile AND l.expense_id=v.expense_id AND l.source_type='CASH_ADVANCE_EXPENSE_SETTLEMENT' AND l.party_role IN ('DIRECT_EXPENSE','DIRECT_ASSET') AND l.side='DEBIT';
  IF balance+v.amount_halalah>expense_total THEN
   RETURN QUERY SELECT 'expense_settlement_exceeds_expense'::text,e.id,p_event_version,NULL::text,false;RETURN;END IF;
 END IF;
 IF e.source_type='PETTY_CASH_TRANSACTION' AND snapshot->>'source_subtype'='disbursement' THEN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e2-fund:'||v.fund_id::text,0));
  SELECT coalesce(sum(CASE WHEN l.side='DEBIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0) INTO balance
   FROM public.accounting_expense_bridge_journal_lines l JOIN public.accounting_expense_bridge_journal_links x
    ON x.profile_id=l.profile_id AND x.event_id=l.event_id AND x.event_version=l.event_version
    JOIN public.accounting_source_effects se ON se.id=x.source_effect_id AND se.status IN ('PREPARED','POSTED')
   WHERE l.profile_id=profile AND l.fund_id=v.fund_id AND l.party_role='CASH_ACCOUNTABILITY';
  IF v.amount_halalah>balance THEN RETURN QUERY SELECT 'petty_cash_balance_insufficient'::text,e.id,p_event_version,NULL::text,false;RETURN;END IF;
 END IF;
  IF e.source_type='PETTY_CASH_TRANSACTION' AND snapshot->>'source_subtype'='treasury_withdrawal' THEN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e2-fund:'||v.fund_id::text,0));
  SELECT coalesce(sum(CASE WHEN l.side='DEBIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0) INTO balance
   FROM public.accounting_expense_bridge_journal_lines l JOIN public.accounting_expense_bridge_journal_links x
    ON x.profile_id=l.profile_id AND x.event_id=l.event_id AND x.event_version=l.event_version
    JOIN public.accounting_source_effects se ON se.id=x.source_effect_id AND se.status IN ('PREPARED','POSTED')
   WHERE l.profile_id=profile AND l.fund_id=v.fund_id AND l.party_role='CASH_ACCOUNTABILITY';
  IF v.amount_halalah>balance THEN RETURN QUERY SELECT 'petty_cash_balance_insufficient'::text,e.id,p_event_version,NULL::text,false;RETURN;END IF;
 END IF;

 SELECT coalesce(jsonb_agg(jsonb_build_object('mapping_key',z->>'key','side',z->>'side','amount_halalah',z->>'amount',
  'service_id',v.service_id,'description_en','Expense bridge source effect','description_ar','أثر جسر المصروفات') ORDER BY n),'[]'::jsonb)
 INTO lines FROM jsonb_array_elements(expected) WITH ORDINALITY AS q(z,n);
 payload:=jsonb_build_object('source_domain','EXPENSE_BRIDGE','accounting_date',v.accounting_date,'period_id',p_period,
  'period_version',p_period_version,'posting_rule_id',p_rule,'rule_version',p_rule_version,
  'source_record_key',e.source_record_key,'economic_event_key',e.economic_event_key,'posting_purpose','expense_bridge',
  'description_en','Expense bridge '||e.source_type||' '||e.source_record_id::text,'description_ar','جسر المصروفات '||e.source_record_id::text,
  'lines',lines);
 SELECT * INTO result FROM public.prepare_accounting_journal(p_actor,NULL,0,payload,btrim(p_reason),v.evidence_ref,p_request);
 IF result.error_code IS NOT NULL THEN RETURN QUERY SELECT result.error_code,result.journal_id,result.version,result.status,result.idempotent_replay;RETURN;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.accounting_expense_bridge_journal_links l WHERE l.profile_id=profile AND l.event_id=e.id
  AND l.event_version=p_event_version AND l.journal_id=result.journal_id) THEN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_EXPENSE_BRIDGE_LINK_MISSING';END IF;
 RETURN QUERY SELECT NULL::text,result.journal_id,result.version,result.status,result.idempotent_replay;
END;$prepare$;

CREATE FUNCTION public.post_accounting_expense_bridge_journal(p_actor uuid,p_journal uuid,p_expected integer,p_request uuid)
RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $post$
DECLARE profile uuid;header public.accounting_journal_versions%ROWTYPE;prepared integer;result record;
BEGIN
 IF p_actor IS NULL OR p_journal IS NULL OR p_expected IS NULL OR p_request IS NULL THEN
  RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active) THEN
  RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 IF NOT public.get_accounting_capability(p_actor,'accounting:manage_expense_bridge') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
 SELECT profile_id INTO profile FROM public.accounting_journals WHERE id=p_journal;
 SELECT j.* INTO header FROM public.accounting_journal_versions j JOIN public.accounting_journals h
  ON h.profile_id=j.profile_id AND h.id=j.journal_id AND h.current_version=j.version
  WHERE j.profile_id=profile AND j.journal_id=p_journal;
 IF NOT FOUND OR header.source_domain<>'EXPENSE_BRIDGE' THEN
  RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 SELECT prepared_version INTO prepared FROM public.accounting_expense_bridge_journal_links WHERE profile_id=profile AND journal_id=p_journal;
 IF NOT FOUND OR NOT public.accounting_expense_bridge_journal_link_authorized(profile,p_journal,prepared,header.prepared_by) THEN
  RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
 SELECT * INTO result FROM public.post_accounting_journal(p_actor,p_journal,p_expected,p_request);
 RETURN QUERY SELECT result.error_code,result.journal_id,result.version,result.status,result.idempotent_replay;
 END;$post$;
-- Extend W10B journal seams fail-closed: new domain and protected accounts are authorized only through this bridge.
DO $engine$
DECLARE fn oid;src text;next_src text;old_text text;new_text text;owner_id oid;acl aclitem[];cfg text[];
 after_owner oid;after_acl aclitem[];after_cfg text[];
 vol "char";parallel "char";cost real;rows_count real;is_strict boolean;leaky boolean;definer boolean;
BEGIN
 fn:=to_regprocedure('public.save_accounting_account(uuid,uuid,integer,jsonb,text,text,uuid)');
 SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef
  INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer FROM pg_catalog.pg_proc p WHERE p.oid=fn;
 IF fn IS NULL OR src IS NULL OR NOT definer OR vol<>'v' OR parallel<>'u' OR cost<>100 OR rows_count<>1000
  OR is_strict OR leaky OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, extensions'] THEN
  RAISE EXCEPTION 'W10E2 preflight: account-save contract differs';END IF;
 old_text:='''EMPLOYEE_ADVANCE''';new_text:='''EMPLOYEE_ADVANCE'',''EMPLOYEE_REIMBURSEMENT_LIABILITY''';
 IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10E2 preflight: protected classification allowlist differs';END IF;
 next_src:=replace(src,old_text,new_text);
 EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.save_accounting_account(p_actor_user_id uuid,p_account_id uuid,p_expected_version integer,p_account jsonb,p_reason text,p_evidence_ref text,p_request_id uuid)
  RETURNS TABLE(error_code text,account_id uuid,version integer,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public, extensions AS %L$ddl$,next_src);
 SELECT p.proowner,p.proacl,p.proconfig INTO after_owner,after_acl,after_cfg FROM pg_catalog.pg_proc p WHERE p.oid=fn;
 IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg THEN RAISE EXCEPTION 'W10E2 postflight: account-save ACL changed';END IF;

 fn:=to_regprocedure('public.validate_accounting_posting_rule_mapping()');
 SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef
  INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer FROM pg_catalog.pg_proc p WHERE p.oid=fn;
 IF fn IS NULL OR src IS NULL OR NOT definer OR vol<>'v' OR parallel<>'u' OR cost<>100 OR rows_count<>0 OR is_strict OR leaky
  OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN RAISE EXCEPTION 'W10E2 preflight: mapping validator differs';END IF;
 old_text:='NOT (public.accounting_inception_mapping_authorized(NEW.profile_id,NEW.posting_rule_id,NEW.rule_version,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ar_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ap_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version))';
 new_text:='NOT (public.accounting_inception_mapping_authorized(NEW.profile_id,NEW.posting_rule_id,NEW.rule_version,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ar_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ap_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_expense_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version))';
 IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10E2 preflight: posting-mapping authorization anchor differs';END IF;
 next_src:=replace(src,old_text,new_text);
 EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.validate_accounting_posting_rule_mapping() RETURNS trigger LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 SET search_path=pg_catalog, public AS %L$ddl$,next_src);
 SELECT p.proowner,p.proacl,p.proconfig INTO after_owner,after_acl,after_cfg FROM pg_catalog.pg_proc p WHERE p.oid=fn;
 IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg THEN RAISE EXCEPTION 'W10E2 postflight: mapping-validator ACL changed';END IF;

 fn:=to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)');
 SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef
  INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer FROM pg_catalog.pg_proc p WHERE p.oid=fn;
 IF fn IS NULL OR src IS NULL OR NOT definer OR vol<>'v' OR parallel<>'u' OR cost<>100 OR rows_count<>1000 OR is_strict OR leaky
  OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN RAISE EXCEPTION 'W10E2 preflight: journal-prepare contract differs';END IF;
 next_src:=src;
 old_text:='p_journal->>''source_domain'' NOT IN (''INCEPTION'',''AR_BRIDGE'',''AP_BRIDGE'')';
 new_text:='p_journal->>''source_domain'' NOT IN (''INCEPTION'',''AR_BRIDGE'',''AP_BRIDGE'',''EXPENSE_BRIDGE'')';
 IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10E2 preflight: journal-prepare payload gate differs';END IF;
 next_src:=replace(next_src,old_text,new_text);
 old_text:='v_source_domain NOT IN (concat(''CONTROLLED_'',''MANUAL''),''INCEPTION'',''AR_BRIDGE'',''AP_BRIDGE'')';
 new_text:='v_source_domain NOT IN (concat(''CONTROLLED_'',''MANUAL''),''INCEPTION'',''AR_BRIDGE'',''AP_BRIDGE'',''EXPENSE_BRIDGE'')';
 IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10E2 preflight: journal-prepare domain gate differs';END IF;
 next_src:=replace(next_src,old_text,new_text);
 old_text:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:prepare_journal'') AND NOT (v_source_domain=''AR_BRIDGE'' AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ar_bridge'')) AND NOT (v_source_domain=''AP_BRIDGE'' AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ap_bridge'')) THEN';
 new_text:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:prepare_journal'') AND NOT (v_source_domain=''AR_BRIDGE'' AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ar_bridge'')) AND NOT (v_source_domain=''AP_BRIDGE'' AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ap_bridge'')) AND NOT (v_source_domain=''EXPENSE_BRIDGE'' AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_expense_bridge'')) THEN';
 IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10E2 preflight: journal-prepare authority gate differs';END IF;
 next_src:=replace(next_src,old_text,new_text);
 old_text:='public.accounting_inception_journal_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain=''AR_BRIDGE'' AND public.accounting_ar_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain=''AP_BRIDGE'' AND public.accounting_ap_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)))';
 new_text:='public.accounting_inception_journal_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain=''AR_BRIDGE'' AND public.accounting_ar_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain=''AP_BRIDGE'' AND public.accounting_ap_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain=''EXPENSE_BRIDGE'' AND public.accounting_expense_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)))';
 IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10E2 preflight: journal-prepare line gate differs';END IF;
 next_src:=replace(next_src,old_text,new_text);
 EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.prepare_accounting_journal(p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_journal jsonb,p_reason text,p_evidence_ref text,p_request_id uuid)
  RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,next_src);
 SELECT p.proowner,p.proacl,p.proconfig INTO after_owner,after_acl,after_cfg FROM pg_catalog.pg_proc p WHERE p.oid=fn;
 IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg THEN RAISE EXCEPTION 'W10E2 postflight: journal-prepare ACL changed';END IF;

 fn:=to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)');
 SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef
  INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer FROM pg_catalog.pg_proc p WHERE p.oid=fn;
 IF fn IS NULL OR src IS NULL OR NOT definer OR vol<>'v' OR parallel<>'u' OR cost<>100 OR rows_count<>1000 OR is_strict OR leaky
  OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN RAISE EXCEPTION 'W10E2 preflight: journal-post contract differs';END IF;
 next_src:=src;
 old_text:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:post_journal'') AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain=''AR_BRIDGE'') AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ar_bridge'')) AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain=''AP_BRIDGE'') AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ap_bridge'')) THEN';
 new_text:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:post_journal'') AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain=''AR_BRIDGE'') AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ar_bridge'')) AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain=''AP_BRIDGE'') AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ap_bridge'')) AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain=''EXPENSE_BRIDGE'') AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_expense_bridge'')) THEN';
 IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10E2 preflight: journal-post authority gate differs';END IF;
 next_src:=replace(next_src,old_text,new_text);
 old_text:='  IF v_header.status=''POSTED'' THEN';
 new_text:=$guard$
 IF v_header.source_domain='EXPENSE_BRIDGE' AND (NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_expense_bridge')
   OR NOT public.accounting_expense_bridge_journal_link_authorized(v_profile_id,p_journal_id,v_header.version,v_header.prepared_by)) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_EXPENSE_BRIDGE_JOURNAL_NOT_AUTHORIZED';
 END IF;
 IF v_header.status='POSTED' THEN
 $guard$;
 IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10E2 preflight: journal-post link guard differs';END IF;
 next_src:=replace(next_src,old_text,new_text);
 old_text:='OR NOT av.is_active OR ((av.is_protected OR av.control_classification<>''NONE'') AND NOT (v_header.source_domain=''INCEPTION'' OR (v_header.source_domain=''AR_BRIDGE'' AND public.accounting_ar_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by)) OR (v_header.source_domain=''AP_BRIDGE'' AND public.accounting_ap_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by))))';
 new_text:='OR NOT av.is_active OR ((av.is_protected OR av.control_classification<>''NONE'') AND NOT (v_header.source_domain=''INCEPTION'' OR (v_header.source_domain=''AR_BRIDGE'' AND public.accounting_ar_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by)) OR (v_header.source_domain=''AP_BRIDGE'' AND public.accounting_ap_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by)) OR (v_header.source_domain=''EXPENSE_BRIDGE'' AND public.accounting_expense_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by))))';
 IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10E2 preflight: protected-account gate differs';END IF;
 next_src:=replace(next_src,old_text,new_text);
 EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.post_accounting_journal(p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid)
  RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,next_src);
 SELECT p.proowner,p.proacl,p.proconfig INTO after_owner,after_acl,after_cfg FROM pg_catalog.pg_proc p WHERE p.oid=fn;
 IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg THEN RAISE EXCEPTION 'W10E2 postflight: journal-post ACL changed';END IF;

 fn:=to_regprocedure('public.reverse_accounting_journal(uuid,uuid,uuid,date,text,text,uuid)');
 SELECT p.prosrc,p.proowner,p.proacl,p.proconfig INTO src,owner_id,acl,cfg FROM pg_catalog.pg_proc p WHERE p.oid=fn;
 IF fn IS NULL OR src IS NULL OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN RAISE EXCEPTION 'W10E2 preflight: journal-reversal contract differs';END IF;
 old_text:='IF NOT FOUND OR v_original.status<>''POSTED'' OR v_original_identity.reversal_of_journal_id IS NOT NULL OR v_original.source_domain=''INCEPTION'' OR v_original.source_domain=''AP_BRIDGE'' THEN';
 new_text:='IF NOT FOUND OR v_original.status<>''POSTED'' OR v_original_identity.reversal_of_journal_id IS NOT NULL OR v_original.source_domain=''INCEPTION'' OR v_original.source_domain=''AP_BRIDGE'' OR v_original.source_domain=''EXPENSE_BRIDGE'' THEN';
 IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10E2 preflight: generic reversal gate differs';END IF;
 next_src:=replace(src,old_text,new_text);
 EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.reverse_accounting_journal(p_actor_user_id uuid,p_original_journal_id uuid,p_period_id uuid,p_accounting_date date,p_reason text,p_evidence_ref text,p_request_id uuid)
  RETURNS TABLE(error_code text,journal_id uuid,version integer,original_journal_id uuid,idempotent_replay boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog, public AS %L$ddl$,next_src);
 SELECT p.proowner,p.proacl,p.proconfig INTO after_owner,after_acl,after_cfg FROM pg_catalog.pg_proc p WHERE p.oid=fn;
 IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg THEN RAISE EXCEPTION 'W10E2 postflight: journal-reversal ACL changed';END IF;
 END;$engine$;
CREATE FUNCTION public.get_accounting_expense_bridge_reconciliation(
 p_actor uuid,p_as_of date,p_cutoff timestamptz,p_limit integer DEFAULT 200
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $reconcile$
DECLARE profile uuid;cutover date;result jsonb;
BEGIN
 IF p_actor IS NULL OR p_as_of IS NULL OR p_cutoff IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'ACCOUNTING_EXPENSE_BRIDGE_INVALID_INPUT';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active)
  OR NOT (public.get_accounting_capability(p_actor,'accounting:view') OR public.get_accounting_capability(p_actor,'accounting:manage_expense_bridge')) THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
  SELECT p.id,pv.cutover_boundary_date INTO profile,cutover FROM public.accounting_profiles p
   JOIN LATERAL(SELECT x.* FROM public.accounting_profile_versions x WHERE x.profile_id=p.id AND x.created_at<=p_cutoff
     ORDER BY x.version DESC LIMIT 1) pv ON true WHERE p.singleton_key='g7';
 IF NOT FOUND THEN RETURN jsonb_build_object('state','NOT_INITIALIZED');END IF;
  WITH inventory AS MATERIALIZED (
   SELECT item FROM public.accounting_expense_bridge_source_inventory(p_as_of,p_cutoff,p_limit+1)
  ), joined AS MATERIALIZED (
   SELECT i.item,e.id event_id,v.version event_version,v.status event_status,v.classification,v.direct_classification,
    v.service_attribution,v.return_direction,v.employee_id,v.service_id,v.expense_id,
    coalesce(v.advance_id,v.related_advance_id) advance_id,v.fund_id,v.amount_halalah,v.source_business_date,v.source_recorded_at,
    v.accounting_date,v.held_code,l.journal_id,jv.version effective_journal_version,jv.status journal_status,
    jv.accounting_date journal_accounting_date,jv.posted_at,
    (v.version IS NOT NULL AND v.source_snapshot IS DISTINCT FROM i.item) source_conflict,
     (SELECT count(*)::integer FROM public.accounting_source_effects se WHERE se.profile_id=profile AND se.source_domain='EXPENSE_BRIDGE'
      AND se.source_record_key=i.item->>'source_record_key' AND se.economic_event_key=i.item->>'economic_event_key'
      AND se.created_at<=p_cutoff) effect_count,
    coalesce(cv.classification='POST_CUTOVER_SOURCE',false) post_cutover_covered,
    coalesce(cv.classification IN ('OPENING_BALANCE','RECONSTRUCTED_HISTORY','UNRESOLVED'),false) inception_conflict
   FROM inventory i LEFT JOIN public.accounting_expense_bridge_events e ON e.profile_id=profile
    AND e.source_record_key=i.item->>'source_record_key' AND e.economic_event_key=i.item->>'economic_event_key' AND e.created_at<=p_cutoff
   LEFT JOIN LATERAL(SELECT x.* FROM public.accounting_expense_bridge_event_versions x WHERE x.profile_id=profile
    AND x.event_id=e.id AND x.created_at<=p_cutoff AND x.source_recorded_at<=p_cutoff ORDER BY x.version DESC LIMIT 1) v ON true
   LEFT JOIN public.accounting_expense_bridge_journal_links l ON l.profile_id=profile AND l.event_id=e.id AND l.event_version=v.version AND l.created_at<=p_cutoff
   LEFT JOIN public.accounting_source_effects se ON se.id=l.source_effect_id AND se.created_at<=p_cutoff
   LEFT JOIN LATERAL(SELECT x.* FROM public.accounting_journal_versions x WHERE x.profile_id=profile AND x.journal_id=l.journal_id
    AND x.created_at<=p_cutoff AND (x.status<>'POSTED' OR x.posted_at<=p_cutoff) ORDER BY x.version DESC LIMIT 1) jv ON se.id IS NOT NULL
   LEFT JOIN LATERAL(SELECT x.classification FROM public.accounting_inception_coverage c
    JOIN public.accounting_inception_coverage_versions x ON x.profile_id=c.profile_id AND x.coverage_id=c.id
    WHERE c.profile_id=profile AND c.source_record_key=i.item->>'source_record_key'
     AND c.economic_event_key=i.item->>'economic_event_key' AND x.created_at<=p_cutoff ORDER BY x.version DESC LIMIT 1) cv ON true
  ), visible AS MATERIALIZED (
   SELECT d.*,CASE WHEN inception_conflict THEN 'INCEPTION_COVERED'
    WHEN source_conflict THEN 'SOURCE_PAYLOAD_CONFLICT'
    WHEN event_id IS NULL OR event_version IS NULL THEN 'MISSING_CLASSIFICATION'
    WHEN event_status='HELD' THEN 'HELD' WHEN event_status='NO_EFFECT' THEN 'NO_EFFECT'
    WHEN journal_status='POSTED' AND posted_at IS NOT NULL AND journal_accounting_date>p_as_of THEN 'ACCOUNTING_DATE_AFTER_CUTOFF'
    WHEN journal_status='POSTED' AND posted_at IS NOT NULL THEN 'POSTED'
    WHEN journal_status='DRAFT' THEN 'PREPARED' ELSE 'MISSING_EFFECT' END reconciliation_status
   FROM joined d ORDER BY item->>'source_type',item->>'source_record_id' LIMIT p_limit
  ), expected_detail AS MATERIALIZED (
   SELECT v.event_id,v.event_version,v.employee_id,v.expense_id,v.advance_id,v.fund_id,v.service_id,
    v.item->>'source_type' source_type,(v.item->>'source_record_id')::uuid source_record_id,
    x.line->>'role' party_role,x.line->>'side' side,(x.line->>'amount')::bigint amount_halalah
   FROM visible v CROSS JOIN LATERAL jsonb_array_elements(public.accounting_expense_bridge_expected_lines(
    v.item->>'source_type',v.classification,v.amount_halalah,v.direct_classification,
    CASE WHEN v.item->>'source_type' IN ('EXPENSE_REIMBURSEMENT_SETTLEMENT','PETTY_CASH_TRANSACTION')
     THEN v.item->>'source_subtype' ELSE v.item->>'payment_method' END,v.return_direction)) AS x(line)
   WHERE v.event_status='READY' AND NOT v.inception_conflict AND NOT v.source_conflict AND v.accounting_date<=p_as_of
  ), truncation AS MATERIALIZED (
   SELECT count(*)>p_limit truncated FROM inventory
  ), posted AS MATERIALIZED (
   SELECT l.*,ev.source_snapshot->>'source_subtype' source_subtype,jl.side ledger_side,jl.amount_halalah ledger_amount,
    av.control_classification,jv.accounting_date,jv.posted_at
   FROM public.accounting_expense_bridge_journal_lines l
   JOIN public.accounting_expense_bridge_journal_links x ON x.profile_id=l.profile_id AND x.event_id=l.event_id
    AND x.event_version=l.event_version AND x.journal_id=l.journal_id AND x.prepared_version=l.journal_version AND x.created_at<=p_cutoff
   JOIN public.accounting_expense_bridge_event_versions ev ON ev.profile_id=l.profile_id AND ev.event_id=l.event_id AND ev.version=l.event_version
    AND ev.created_at<=p_cutoff AND ev.source_recorded_at<=p_cutoff
   JOIN public.accounting_journal_versions jv ON jv.profile_id=l.profile_id AND jv.journal_id=l.journal_id
    AND jv.status='POSTED' AND jv.source_domain='EXPENSE_BRIDGE' AND jv.posted_at<=p_cutoff AND jv.accounting_date<=p_as_of
   JOIN public.accounting_journal_line_versions jl ON jl.profile_id=l.profile_id AND jl.journal_id=l.journal_id
    AND jl.journal_version=jv.version AND jl.line_number=l.line_number
   JOIN public.accounting_account_versions av ON av.profile_id=jl.profile_id AND av.account_id=jl.account_id AND av.version=jl.account_version
   WHERE l.profile_id=profile
  ), subledger AS (
   SELECT party_role,sum(CASE WHEN party_role IN ('EMPLOYEE_ADVANCE','CASH_ACCOUNTABILITY')
    THEN CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END
    ELSE CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END END)::bigint amount
   FROM expected_detail WHERE party_role IN ('EMPLOYEE_REIMBURSEMENT_LIABILITY','EMPLOYEE_ADVANCE','CASH_ACCOUNTABILITY') GROUP BY party_role
  ), ledger AS (
   SELECT av.control_classification party_role,sum(CASE WHEN av.control_classification IN ('EMPLOYEE_ADVANCE','CASH_ACCOUNTABILITY')
    THEN CASE WHEN jl.side='DEBIT' THEN jl.amount_halalah ELSE -jl.amount_halalah END
    ELSE CASE WHEN jl.side='CREDIT' THEN jl.amount_halalah ELSE -jl.amount_halalah END END)::bigint amount
   FROM public.accounting_journal_line_versions jl JOIN public.accounting_journal_versions jv
    ON jv.profile_id=jl.profile_id AND jv.journal_id=jl.journal_id AND jv.version=jl.journal_version
   JOIN public.accounting_account_versions av ON av.profile_id=jl.profile_id AND av.account_id=jl.account_id AND av.version=jl.account_version
   WHERE jv.profile_id=profile AND jv.source_domain='EXPENSE_BRIDGE' AND jv.status='POSTED'
    AND jv.accounting_date<=p_as_of AND jv.posted_at<=p_cutoff
    AND av.control_classification IN ('EMPLOYEE_REIMBURSEMENT_LIABILITY','EMPLOYEE_ADVANCE','CASH_ACCOUNTABILITY')
   GROUP BY av.control_classification
  ), controls AS (
   SELECT r.role,coalesce(s.amount,0)::bigint subledger,coalesce(l.amount,0)::bigint ledger,
    (coalesce(l.amount,0)-coalesce(s.amount,0))::bigint difference
   FROM (VALUES('EMPLOYEE_REIMBURSEMENT_LIABILITY'::text),('EMPLOYEE_ADVANCE'::text),('CASH_ACCOUNTABILITY'::text)) r(role)
    LEFT JOIN subledger s ON s.party_role=r.role LEFT JOIN ledger l ON l.party_role=r.role
  ), expected_employees AS (
   SELECT employee_id,
    sum(CASE WHEN party_role='EMPLOYEE_REIMBURSEMENT_LIABILITY' THEN CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint reimbursement_liability,
    sum(CASE WHEN party_role='EMPLOYEE_ADVANCE' THEN CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint advance_balance
   FROM expected_detail WHERE employee_id IS NOT NULL GROUP BY employee_id
  ), actual_employees AS (
   SELECT employee_id,
    sum(CASE WHEN party_role='EMPLOYEE_REIMBURSEMENT_LIABILITY' THEN CASE WHEN ledger_side='CREDIT' THEN ledger_amount ELSE -ledger_amount END ELSE 0 END)::bigint reimbursement_liability,
    sum(CASE WHEN party_role='EMPLOYEE_ADVANCE' THEN CASE WHEN ledger_side='DEBIT' THEN ledger_amount ELSE -ledger_amount END ELSE 0 END)::bigint advance_balance
   FROM posted WHERE employee_id IS NOT NULL GROUP BY employee_id
  ), employees AS (
   SELECT coalesce(e.employee_id,a.employee_id) employee_id,coalesce(e.reimbursement_liability,0)::bigint expected_reimbursement_liability,
    coalesce(a.reimbursement_liability,0)::bigint ledger_reimbursement_liability,
    (coalesce(a.reimbursement_liability,0)-coalesce(e.reimbursement_liability,0))::bigint reimbursement_difference,
    coalesce(e.advance_balance,0)::bigint expected_advance_balance,coalesce(a.advance_balance,0)::bigint ledger_advance_balance,
    (coalesce(a.advance_balance,0)-coalesce(e.advance_balance,0))::bigint advance_difference,
    (abs(coalesce(a.reimbursement_liability,0)-coalesce(e.reimbursement_liability,0))+
     abs(coalesce(a.advance_balance,0)-coalesce(e.advance_balance,0)))::bigint difference
   FROM expected_employees e FULL OUTER JOIN actual_employees a USING(employee_id)
  ), expected_funds AS (
   SELECT fund_id,sum(CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END)::bigint petty_balance
   FROM expected_detail WHERE fund_id IS NOT NULL AND party_role='CASH_ACCOUNTABILITY' GROUP BY fund_id
  ), actual_funds AS (
   SELECT fund_id,sum(CASE WHEN ledger_side='DEBIT' THEN ledger_amount ELSE -ledger_amount END)::bigint petty_balance
   FROM posted WHERE fund_id IS NOT NULL AND party_role='CASH_ACCOUNTABILITY' GROUP BY fund_id
  ), funds AS (
   SELECT coalesce(e.fund_id,a.fund_id) fund_id,coalesce(e.petty_balance,0)::bigint expected_petty_balance,
    coalesce(a.petty_balance,0)::bigint ledger_petty_balance,(coalesce(a.petty_balance,0)-coalesce(e.petty_balance,0))::bigint difference
   FROM expected_funds e FULL OUTER JOIN actual_funds a USING(fund_id)
  ), expected_services AS (
   SELECT service_id,
    sum(CASE WHEN party_role IN ('DIRECT_EXPENSE','DIRECT_ASSET') THEN CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint expense_asset,
    sum(CASE WHEN party_role='EMPLOYEE_REIMBURSEMENT_LIABILITY' THEN CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint reimbursement_liability,
    sum(CASE WHEN party_role='EMPLOYEE_ADVANCE' THEN CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint employee_advance,
    sum(CASE WHEN party_role='CASH_ACCOUNTABILITY' THEN CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint petty_cash
   FROM expected_detail WHERE service_id IS NOT NULL GROUP BY service_id
  ), actual_services AS (
   SELECT service_id,
    sum(CASE WHEN party_role IN ('DIRECT_EXPENSE','DIRECT_ASSET') THEN CASE WHEN ledger_side='DEBIT' THEN ledger_amount ELSE -ledger_amount END ELSE 0 END)::bigint expense_asset,
    sum(CASE WHEN party_role='EMPLOYEE_REIMBURSEMENT_LIABILITY' THEN CASE WHEN ledger_side='CREDIT' THEN ledger_amount ELSE -ledger_amount END ELSE 0 END)::bigint reimbursement_liability,
    sum(CASE WHEN party_role='EMPLOYEE_ADVANCE' THEN CASE WHEN ledger_side='DEBIT' THEN ledger_amount ELSE -ledger_amount END ELSE 0 END)::bigint employee_advance,
    sum(CASE WHEN party_role='CASH_ACCOUNTABILITY' THEN CASE WHEN ledger_side='DEBIT' THEN ledger_amount ELSE -ledger_amount END ELSE 0 END)::bigint petty_cash
   FROM posted WHERE service_id IS NOT NULL GROUP BY service_id
  ), services AS (
   SELECT coalesce(e.service_id,a.service_id) service_id,
    coalesce(e.expense_asset,0)::bigint expected_expense_asset,coalesce(a.expense_asset,0)::bigint ledger_expense_asset,
    (coalesce(a.expense_asset,0)-coalesce(e.expense_asset,0))::bigint expense_asset_difference,
    coalesce(e.reimbursement_liability,0)::bigint expected_reimbursement_liability,coalesce(a.reimbursement_liability,0)::bigint ledger_reimbursement_liability,
    (coalesce(a.reimbursement_liability,0)-coalesce(e.reimbursement_liability,0))::bigint reimbursement_difference,
    coalesce(e.employee_advance,0)::bigint expected_employee_advance,coalesce(a.employee_advance,0)::bigint ledger_employee_advance,
    (coalesce(a.employee_advance,0)-coalesce(e.employee_advance,0))::bigint advance_difference,
    coalesce(e.petty_cash,0)::bigint expected_petty_cash,coalesce(a.petty_cash,0)::bigint ledger_petty_cash,
    (coalesce(a.petty_cash,0)-coalesce(e.petty_cash,0))::bigint petty_difference,
    (abs(coalesce(a.expense_asset,0)-coalesce(e.expense_asset,0))+
     abs(coalesce(a.reimbursement_liability,0)-coalesce(e.reimbursement_liability,0))+
     abs(coalesce(a.employee_advance,0)-coalesce(e.employee_advance,0))+
     abs(coalesce(a.petty_cash,0)-coalesce(e.petty_cash,0)))::bigint difference
   FROM expected_services e FULL OUTER JOIN actual_services a USING(service_id)
  )
  SELECT jsonb_build_object('state',CASE WHEN tr.truncated THEN 'TRUNCATED' ELSE 'READY' END,'as_of_date',p_as_of,
   'recorded_at_cutoff',p_cutoff,'cutover_boundary_date',cutover,'bank_reconciled',false,'source_event_count_partial',tr.truncated,
  'source_event_count',(SELECT count(*) FROM visible),'posted_effect_count',(SELECT count(*) FROM visible WHERE reconciliation_status='POSTED'),
   'held_count',(SELECT count(*) FROM visible WHERE reconciliation_status IN ('HELD','SOURCE_PAYLOAD_CONFLICT')),'no_effect_count',(SELECT count(*) FROM visible WHERE reconciliation_status='NO_EFFECT'),
   'missing_effect_count',(SELECT count(*) FROM visible WHERE reconciliation_status IN ('MISSING_CLASSIFICATION','MISSING_EFFECT','PREPARED','ACCOUNTING_DATE_AFTER_CUTOFF','SOURCE_PAYLOAD_CONFLICT')),
  'inception_conflict_count',(SELECT count(*) FROM visible WHERE reconciliation_status='INCEPTION_COVERED'),
   'expected_effect_count',(SELECT count(*) FROM visible WHERE reconciliation_status NOT IN ('INCEPTION_COVERED','NO_EFFECT','SOURCE_PAYLOAD_CONFLICT')),
   'source_payload_conflict_count',(SELECT count(*) FROM visible WHERE reconciliation_status='SOURCE_PAYLOAD_CONFLICT'),
   'duplicate_conflict_count',(SELECT count(*) FROM visible WHERE effect_count>1),
   'control_difference_count',CASE WHEN tr.truncated THEN NULL ELSE (SELECT count(*) FROM controls WHERE difference<>0) END,
   'employee_difference_count',CASE WHEN tr.truncated THEN NULL ELSE (SELECT count(*) FROM employees WHERE difference<>0) END,
   'fund_difference_count',CASE WHEN tr.truncated THEN NULL ELSE (SELECT count(*) FROM funds WHERE difference<>0) END,
   'service_difference_count',CASE WHEN tr.truncated THEN NULL ELSE (SELECT count(*) FROM services WHERE difference<>0) END,
  'recognized_expense_asset_halalah',coalesce((SELECT sum(amount_halalah) FROM posted WHERE party_role IN ('DIRECT_EXPENSE','DIRECT_ASSET') AND side='DEBIT'),0)::text,
   'employee_reimbursement_liability_halalah',coalesce((SELECT ledger FROM controls WHERE role='EMPLOYEE_REIMBURSEMENT_LIABILITY'),0)::text,
   'employee_advance_balance_halalah',coalesce((SELECT ledger FROM controls WHERE role='EMPLOYEE_ADVANCE'),0)::text,
   'petty_cash_accountability_halalah',coalesce((SELECT ledger FROM controls WHERE role='CASH_ACCOUNTABILITY'),0)::text,
   'reimbursements_paid_halalah',coalesce((SELECT sum(ledger_amount) FROM posted WHERE source_type='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND party_role='CASH_ACCOUNT' AND ledger_side='CREDIT'),0)::text,
   'reimbursement_advance_offsets_halalah',coalesce((SELECT sum(ledger_amount) FROM posted WHERE source_type='EXPENSE_REIMBURSEMENT_SETTLEMENT' AND party_role='EMPLOYEE_ADVANCE' AND ledger_side='CREDIT'),0)::text,
   'advance_settlements_halalah',coalesce((SELECT sum(ledger_amount) FROM posted WHERE source_type='CASH_ADVANCE_EXPENSE_SETTLEMENT' AND party_role='EMPLOYEE_ADVANCE' AND ledger_side='CREDIT'),0)::text,
   'advance_returns_halalah',coalesce((SELECT sum(ledger_amount) FROM posted WHERE source_type='CASH_ADVANCE_RETURN' AND party_role='EMPLOYEE_ADVANCE' AND ledger_side='CREDIT'),0)::text,
   'petty_replenishments_halalah',coalesce((SELECT sum(ledger_amount) FROM posted WHERE source_type='PETTY_CASH_TRANSACTION' AND source_subtype='replenishment' AND party_role='CASH_ACCOUNTABILITY' AND ledger_side='DEBIT'),0)::text,
   'petty_disbursements_halalah',coalesce((SELECT sum(ledger_amount) FROM posted WHERE source_type='PETTY_CASH_TRANSACTION' AND source_subtype='disbursement' AND party_role='CASH_ACCOUNTABILITY' AND ledger_side='CREDIT'),0)::text,
   'petty_treasury_transfers_halalah',coalesce((SELECT sum(CASE WHEN ledger_side='DEBIT' THEN ledger_amount ELSE -ledger_amount END) FROM posted
     WHERE source_type='PETTY_CASH_TRANSACTION' AND source_subtype IN ('replenishment','treasury_withdrawal','return') AND party_role='CASH_ACCOUNTABILITY'),0)::text,
   'control_balances',CASE WHEN tr.truncated THEN NULL ELSE coalesce((SELECT jsonb_agg(jsonb_build_object('party_role',role,'subledger_halalah',subledger::text,'ledger_halalah',ledger::text,'difference_halalah',difference::text) ORDER BY role) FROM controls),'[]'::jsonb) END,
    'employee_balances',CASE WHEN tr.truncated THEN NULL ELSE coalesce((SELECT jsonb_agg(jsonb_build_object('employee_id',employee_id,
     'reimbursement_liability_halalah',ledger_reimbursement_liability::text,'reimbursement_liability_expected_halalah',expected_reimbursement_liability::text,
     'reimbursement_liability_difference_halalah',reimbursement_difference::text,'advance_balance_halalah',ledger_advance_balance::text,
     'advance_balance_expected_halalah',expected_advance_balance::text,'advance_balance_difference_halalah',advance_difference::text,
     'difference_halalah',difference::text) ORDER BY employee_id) FROM employees),'[]'::jsonb) END,
   'fund_balances',CASE WHEN tr.truncated THEN NULL ELSE coalesce((SELECT jsonb_agg(jsonb_build_object('fund_id',fund_id,'petty_cash_halalah',ledger_petty_balance::text,
     'petty_cash_expected_halalah',expected_petty_balance::text,'difference_halalah',difference::text) ORDER BY fund_id) FROM funds),'[]'::jsonb) END,
   'service_balances',CASE WHEN tr.truncated THEN NULL ELSE coalesce((SELECT jsonb_agg(jsonb_build_object('service_id',service_id,
     'recognized_expense_asset_halalah',ledger_expense_asset::text,'recognized_expense_asset_expected_halalah',expected_expense_asset::text,
     'reimbursement_liability_halalah',ledger_reimbursement_liability::text,'reimbursement_liability_expected_halalah',expected_reimbursement_liability::text,
     'employee_advance_halalah',ledger_employee_advance::text,'employee_advance_expected_halalah',expected_employee_advance::text,
     'petty_cash_halalah',ledger_petty_cash::text,'petty_cash_expected_halalah',expected_petty_cash::text,'difference_halalah',difference::text)
     ORDER BY service_id) FROM services),'[]'::jsonb) END,
   'timing_difference_count',(SELECT count(*) FROM visible WHERE journal_status='POSTED' AND journal_accounting_date IS DISTINCT FROM source_business_date),
  'timing_differences',coalesce((SELECT jsonb_agg(jsonb_build_object('source_type',item->>'source_type','source_record_id',item->>'source_record_id',
     'source_business_date',source_business_date,'accounting_date',journal_accounting_date,'days_difference',journal_accounting_date-source_business_date,
    'amount_halalah',amount_halalah::text) ORDER BY item->>'source_type',item->>'source_record_id') FROM visible
     WHERE journal_status='POSTED' AND journal_accounting_date IS DISTINCT FROM source_business_date),'[]'::jsonb),
   'truncated',tr.truncated,
  'events',coalesce((SELECT jsonb_agg(jsonb_build_object('source_type',item->>'source_type','source_record_id',item->>'source_record_id',
    'source_record_key',item->>'source_record_key','economic_event_key',item->>'economic_event_key','reconciliation_status',reconciliation_status,
    'event_id',event_id,'event_version',event_version,'classification',classification,
    'employee_id',coalesce(employee_id,nullif(item->>'employee_id','')::uuid),'service_id',coalesce(service_id,nullif(item->>'service_id','')::uuid),
    'expense_id',coalesce(expense_id,nullif(item->>'expense_id','')::uuid),'advance_id',coalesce(advance_id,nullif(item->>'advance_id','')::uuid),
    'fund_id',coalesce(fund_id,nullif(item->>'fund_id','')::uuid),'amount_halalah',coalesce(amount_halalah,(item->>'amount_halalah')::bigint)::text,
    'source_business_date',coalesce(source_business_date,nullif(item->>'source_business_date','')::date),
    'source_recorded_at',coalesce(source_recorded_at,(item->>'source_recorded_at')::timestamptz),
      'accounting_date',coalesce(journal_accounting_date,accounting_date),'posted_at',posted_at,'journal_id',journal_id,'held_code',coalesce(held_code,CASE WHEN source_conflict THEN 'source_payload_conflict' END),
     'post_cutover_covered',post_cutover_covered,'inception_conflict',inception_conflict,'source_conflict',source_conflict)
     ORDER BY item->>'source_type',item->>'source_record_id') FROM visible),'[]'::jsonb)) INTO result
   FROM truncation tr;
 RETURN result;
 END;$reconcile$;
REVOKE ALL ON FUNCTION public.prevent_accounting_expense_bridge_history_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_expense_bridge_source_snapshot(text,uuid,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_expense_bridge_expected_lines(text,text,bigint,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_expense_bridge_account_authorized(uuid,text,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_expense_bridge_source_inventory(date,timestamptz,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_expense_bridge_line_authorized(uuid,jsonb,integer,text,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_expense_bridge_journal_link_authorized(uuid,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_expense_bridge_journal_account_authorized(uuid,uuid,integer,integer,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_expense_bridge_source_effect_link() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_accounting_expense_bridge_event(uuid,text,uuid,integer,jsonb,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prepare_accounting_expense_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.post_accounting_expense_bridge_journal(uuid,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_accounting_expense_bridge_reconciliation(uuid,date,timestamptz,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_accounting_expense_bridge_event(uuid,text,uuid,integer,jsonb,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_accounting_expense_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_accounting_expense_bridge_journal(uuid,uuid,integer,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_expense_bridge_reconciliation(uuid,date,timestamptz,integer) TO service_role;

COMMIT;
