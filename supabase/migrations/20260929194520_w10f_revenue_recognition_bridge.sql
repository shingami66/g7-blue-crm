-- W10F: explicit, evidenced Revenue recognition and W10D contract-asset control compatibility.
-- Invoice, cash, operational completion, and Event Cost Close remain separate facts.
BEGIN;

DO $preflight$
DECLARE d text;
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL
     OR to_regclass('public.accounting_capability_catalog') IS NULL
     OR to_regclass('public.accounting_inception_coverage') IS NULL
     OR to_regclass('public.accounting_journal_versions') IS NULL
     OR to_regclass('public.accounting_source_effects') IS NULL
     OR to_regclass('public.approved_billing_scopes') IS NULL
     OR to_regclass('public.approved_billing_scope_items') IS NULL
     OR to_regclass('public.accounting_ar_bridge_journal_lines') IS NULL
     OR to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)') IS NULL
     OR to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)') IS NULL THEN
    RAISE EXCEPTION 'W10F preflight: required W10B/W10C/W10D/ABS objects are missing';
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_capability_catalog WHERE capability='accounting:manage_revenue_recognition')
     OR to_regclass('public.accounting_revenue_arrangements') IS NOT NULL
     OR to_regprocedure('public.save_accounting_revenue_arrangement(uuid,uuid,uuid,integer,jsonb,text,text,text,text,text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'W10F preflight: Revenue Recognition target already exists';
  END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_account_versions'::regclass AND conname='accounting_account_versions_control_classification_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '8da59ae4171763c9180c93e72596bb7e' THEN RAISE EXCEPTION 'W10F preflight: protected account-control contract differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_capability_catalog'::regclass AND conname='accounting_capability_catalog_key_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM 'e2cbec72dd5b7e047492def2b92ba806' THEN RAISE EXCEPTION 'W10F preflight: capability key contract differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_capability_catalog'::regclass AND conname='accounting_capability_catalog_state_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '37d70f9d716933067d05adcabdb22cbc' THEN RAISE EXCEPTION 'W10F preflight: capability state contract differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_foundation_events'::regclass AND conname='accounting_foundation_events_event_type_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '5bb9b1ea3c0d9e906eb20af83dc74138' THEN RAISE EXCEPTION 'W10F preflight: foundation event-type contract differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_foundation_events'::regclass AND conname='accounting_foundation_events_entity_type_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM 'abcb36d0eafe55a3deed94219aa7bbc8' THEN RAISE EXCEPTION 'W10F preflight: foundation entity-type contract differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_journal_versions'::regclass AND conname='accounting_journal_versions_source_domain_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM 'd4850693b16b29a3e6c9cda5a400b7a9' THEN RAISE EXCEPTION 'W10F preflight: journal source-domain contract differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.accounting_source_effects'::regclass AND conname='accounting_source_effects_source_domain_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM 'd4850693b16b29a3e6c9cda5a400b7a9' THEN RAISE EXCEPTION 'W10F preflight: source-effect domain contract differs'; END IF;
  SELECT pg_get_constraintdef(oid) INTO d FROM pg_catalog.pg_constraint
    WHERE conrelid='public.audit_logs'::regclass AND conname='audit_logs_action_check';
  IF md5(regexp_replace(coalesce(d,''),'[[:space:]]','','g')) IS DISTINCT FROM '6275916735283c018720d69b34678238' THEN RAISE EXCEPTION 'W10F preflight: audit action contract differs'; END IF;
END;
$preflight$;

ALTER TABLE public.accounting_foundation_events
  DROP CONSTRAINT accounting_foundation_events_event_type_check,
  DROP CONSTRAINT accounting_foundation_events_entity_type_check,
  ADD CONSTRAINT accounting_foundation_events_event_type_check CHECK(event_type IN (
    'accounting_capability_changed','accounting_profile_updated','accounting_account_created','accounting_account_updated',
    'accounting_period_created','accounting_period_updated','accounting_posting_rule_created','accounting_posting_rule_updated',
    'accounting_journal_prepared','accounting_journal_posted','accounting_journal_reversed',
    'accounting_inception_package_created','accounting_inception_package_updated','accounting_inception_package_reviewed',
    'accounting_inception_package_rejected','accounting_inception_package_accepted',
    'accounting_ar_bridge_event_classified','accounting_ar_bridge_event_held',
    'accounting_ap_bridge_event_classified','accounting_ap_bridge_event_held',
    'accounting_expense_bridge_event_classified','accounting_expense_bridge_event_held',
    'accounting_revenue_arrangement_prepared','accounting_revenue_arrangement_held',
    'accounting_revenue_arrangement_reviewed','accounting_revenue_evidence_submitted',
    'accounting_revenue_evidence_reviewed','accounting_revenue_recognition_prepared',
    'accounting_revenue_correction_held')),
  ADD CONSTRAINT accounting_foundation_events_entity_type_check CHECK(entity_type IN (
    'capability_assignment','accounting_profile','accounting_account','accounting_period','accounting_posting_rule',
    'accounting_journal','accounting_inception_package','accounting_inception_review','accounting_inception_acceptance',
    'accounting_ar_bridge_event','accounting_ap_bridge_event','accounting_expense_bridge_event',
    'accounting_revenue_arrangement','accounting_revenue_performance_unit','accounting_revenue_performance_evidence',
    'accounting_revenue_recognition_event'));

ALTER TABLE public.accounting_capability_catalog
  DROP CONSTRAINT accounting_capability_catalog_key_check,
  DROP CONSTRAINT accounting_capability_catalog_state_check,
  ADD CONSTRAINT accounting_capability_catalog_key_check CHECK(capability IN (
    'accounting:view','accounting:manage_profile','accounting:manage_authority','accounting:manage_chart','accounting:manage_periods',
    'accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal','accounting:manage_inception',
    'accounting:manage_ar_bridge','accounting:manage_ap_bridge','accounting:manage_expense_bridge','accounting:manage_revenue_recognition',
    'accounting:reconcile_bank','accounting:close_period','accounting:reopen_period','accounting:view_statements')),
  ADD CONSTRAINT accounting_capability_catalog_state_check CHECK(
    (capability IN ('accounting:view','accounting:manage_profile') AND enabled AND runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_authority' AND enabled AND NOT runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability IN ('accounting:manage_chart','accounting:manage_periods') AND enabled AND runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability IN ('accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal') AND enabled AND runtime_allow_grantable AND owner_slice='W10B')
    OR (capability='accounting:manage_inception' AND enabled AND runtime_allow_grantable AND owner_slice='W10C')
    OR (capability='accounting:manage_ar_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10D')
    OR (capability IN ('accounting:manage_ap_bridge','accounting:manage_expense_bridge') AND enabled AND runtime_allow_grantable AND owner_slice='W10E')
    OR (capability='accounting:manage_revenue_recognition' AND enabled AND runtime_allow_grantable AND owner_slice='W10F')
    OR (capability='accounting:reconcile_bank' AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10G')
    OR (capability IN ('accounting:close_period','accounting:reopen_period') AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I')
    OR (capability='accounting:view_statements' AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10H'));
INSERT INTO public.accounting_capability_catalog(capability,enabled,runtime_allow_grantable,owner_slice)
VALUES('accounting:manage_revenue_recognition',true,true,'W10F');

ALTER TABLE public.accounting_journal_versions DROP CONSTRAINT accounting_journal_versions_source_domain_check,
  ADD CONSTRAINT accounting_journal_versions_source_domain_check
    CHECK(source_domain IN ('CONTROLLED_MANUAL','INCEPTION','AR_BRIDGE','AP_BRIDGE','EXPENSE_BRIDGE','REVENUE_RECOGNITION'));
ALTER TABLE public.accounting_source_effects DROP CONSTRAINT accounting_source_effects_source_domain_check,
  ADD CONSTRAINT accounting_source_effects_source_domain_check
    CHECK(source_domain IN ('CONTROLLED_MANUAL','INCEPTION','AR_BRIDGE','AP_BRIDGE','EXPENSE_BRIDGE','REVENUE_RECOGNITION'));
ALTER TABLE public.accounting_account_versions DROP CONSTRAINT accounting_account_versions_control_classification_check,
  ADD CONSTRAINT accounting_account_versions_control_classification_check CHECK(control_classification IN (
    'NONE','ACCOUNTS_RECEIVABLE','ACCOUNTS_PAYABLE','ACCRUED_LIABILITY','CUSTOMER_ADVANCE','SUPPLIER_ADVANCE',
    'CONTRACT_LIABILITY','CASH_ACCOUNTABILITY','EMPLOYEE_ADVANCE','EMPLOYEE_REIMBURSEMENT_LIABILITY','CONTRACT_ASSET'));

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
 OR (entity_type IN ('accounting_ar_bridge_event','accounting_ap_bridge_event','accounting_expense_bridge_event') AND action=ANY(ARRAY['classify'::text,'hold'::text]))
 OR (entity_type='accounting_revenue_arrangement' AND action=ANY(ARRAY['prepare'::text,'hold'::text,'review'::text]))
 OR (entity_type='accounting_revenue_performance_evidence' AND action=ANY(ARRAY['submit'::text,'approve'::text,'hold'::text]))
 OR (entity_type='accounting_revenue_recognition_event' AND action=ANY(ARRAY['prepare'::text,'post'::text,'correction_hold'::text])));

CREATE TABLE public.accounting_revenue_arrangements(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  approved_billing_scope_id uuid NOT NULL REFERENCES public.approved_billing_scopes(id) ON DELETE RESTRICT,
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id),UNIQUE(profile_id,approved_billing_scope_id));
CREATE TABLE public.accounting_revenue_arrangement_versions(
  profile_id uuid NOT NULL,arrangement_id uuid NOT NULL,version integer NOT NULL CHECK(version>0),previous_version integer,
  status text NOT NULL CHECK(status IN ('PREPARED','HELD')),
  source_snapshot jsonb NOT NULL CHECK(jsonb_typeof(source_snapshot)='object'),source_snapshot_sha256 text NOT NULL CHECK(source_snapshot_sha256~'^[0-9a-f]{64}$'),
  units_snapshot jsonb NOT NULL CHECK(jsonb_typeof(units_snapshot)='array'),consideration_halalah bigint NOT NULL CHECK(consideration_halalah>=0),
  source_approved_at timestamptz NOT NULL,currency text NOT NULL,principal_agent_basis text NOT NULL CHECK(principal_agent_basis IN ('PRINCIPAL','AGENT')),
  policy_version text NOT NULL CHECK(length(btrim(policy_version)) BETWEEN 1 AND 100),
  supersedes_arrangement_id uuid,modification_evidence_ref text,modification_evidence_sha256 text,
  held_code text,created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text NOT NULL,foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  PRIMARY KEY(profile_id,arrangement_id,version),
  FOREIGN KEY(profile_id,arrangement_id) REFERENCES public.accounting_revenue_arrangements(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,arrangement_id,previous_version) REFERENCES public.accounting_revenue_arrangement_versions(profile_id,arrangement_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,supersedes_arrangement_id) REFERENCES public.accounting_revenue_arrangements(profile_id,id) ON DELETE RESTRICT,
  CHECK((held_code IS NULL AND status='PREPARED') OR (held_code IS NOT NULL AND status='HELD')),
  CHECK((modification_evidence_ref IS NULL AND modification_evidence_sha256 IS NULL) OR
    (length(btrim(modification_evidence_ref)) BETWEEN 1 AND 2000 AND modification_evidence_sha256~'^[0-9a-f]{64}$')));
CREATE TABLE public.accounting_revenue_arrangement_reviews(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL,arrangement_id uuid NOT NULL,arrangement_version integer NOT NULL,
  decision text NOT NULL CHECK(decision IN ('APPROVED','HELD')),reviewer_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  UNIQUE(profile_id,arrangement_id,arrangement_version),
  FOREIGN KEY(profile_id,arrangement_id,arrangement_version) REFERENCES public.accounting_revenue_arrangement_versions(profile_id,arrangement_id,version) ON DELETE RESTRICT);
CREATE TABLE public.accounting_revenue_performance_units(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL,arrangement_id uuid NOT NULL,unit_key text NOT NULL CHECK(length(btrim(unit_key)) BETWEEN 1 AND 120),
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id),UNIQUE(profile_id,arrangement_id,unit_key),
  FOREIGN KEY(profile_id,arrangement_id) REFERENCES public.accounting_revenue_arrangements(profile_id,id) ON DELETE RESTRICT);
CREATE TABLE public.accounting_revenue_performance_unit_versions(
  profile_id uuid NOT NULL,unit_id uuid NOT NULL,arrangement_id uuid NOT NULL,arrangement_version integer NOT NULL,version integer NOT NULL CHECK(version>0),
  promised_output text NOT NULL CHECK(length(btrim(promised_output)) BETWEEN 1 AND 2000),allocated_halalah bigint NOT NULL CHECK(allocated_halalah>0),
  satisfaction_method text NOT NULL CHECK(satisfaction_method IN ('POINT_IN_TIME','OVER_TIME')),
  required_evidence_basis text NOT NULL CHECK(required_evidence_basis IN ('CUSTOMER_ACCEPTANCE','TRANSFER_OF_CONTROL','MEASURED_OUTPUT')),
  source_allocations jsonb NOT NULL CHECK(jsonb_typeof(source_allocations)='array'),created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  PRIMARY KEY(profile_id,unit_id,version),
  FOREIGN KEY(profile_id,unit_id) REFERENCES public.accounting_revenue_performance_units(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,arrangement_id,arrangement_version) REFERENCES public.accounting_revenue_arrangement_versions(profile_id,arrangement_id,version) ON DELETE RESTRICT);
CREATE TABLE public.accounting_revenue_performance_evidence(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL,arrangement_id uuid NOT NULL,unit_id uuid NOT NULL,
  evidence_key text NOT NULL CHECK(length(btrim(evidence_key)) BETWEEN 1 AND 160),current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(profile_id,id),UNIQUE(profile_id,unit_id,evidence_key),
  FOREIGN KEY(profile_id,arrangement_id) REFERENCES public.accounting_revenue_arrangements(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,unit_id) REFERENCES public.accounting_revenue_performance_units(profile_id,id) ON DELETE RESTRICT);
CREATE TABLE public.accounting_revenue_performance_evidence_versions(
  profile_id uuid NOT NULL,evidence_id uuid NOT NULL,unit_id uuid NOT NULL,arrangement_id uuid NOT NULL,arrangement_version integer NOT NULL,
  version integer NOT NULL CHECK(version>0),previous_version integer,status text NOT NULL CHECK(status IN ('SUBMITTED','HELD')),
  evidence_basis text NOT NULL CHECK(evidence_basis IN ('CUSTOMER_ACCEPTANCE','TRANSFER_OF_CONTROL','MEASURED_OUTPUT')),
  performance_from date NOT NULL,performance_through date NOT NULL,CHECK(performance_from<=performance_through),
  evidence_ref text NOT NULL CHECK(length(btrim(evidence_ref)) BETWEEN 1 AND 2000),evidence_sha256 text NOT NULL CHECK(evidence_sha256~'^[0-9a-f]{64}$'),
  recognized_to_date_halalah bigint CHECK(recognized_to_date_halalah>=0),correction_amount_halalah bigint CHECK(correction_amount_halalah>0),
  correction_of_recognition_event_id uuid,held_code text,rationale text NOT NULL CHECK(length(btrim(rationale)) BETWEEN 1 AND 2000),
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  PRIMARY KEY(profile_id,evidence_id,version),
  FOREIGN KEY(profile_id,evidence_id) REFERENCES public.accounting_revenue_performance_evidence(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,evidence_id,previous_version) REFERENCES public.accounting_revenue_performance_evidence_versions(profile_id,evidence_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,unit_id) REFERENCES public.accounting_revenue_performance_units(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,arrangement_id,arrangement_version) REFERENCES public.accounting_revenue_arrangement_versions(profile_id,arrangement_id,version) ON DELETE RESTRICT,
  CHECK((correction_of_recognition_event_id IS NULL AND correction_amount_halalah IS NULL AND recognized_to_date_halalah IS NOT NULL)
     OR (correction_of_recognition_event_id IS NOT NULL AND correction_amount_halalah IS NOT NULL AND recognized_to_date_halalah IS NULL)),
  CHECK((held_code IS NULL AND status='SUBMITTED') OR (held_code IS NOT NULL AND status='HELD')));
CREATE TABLE public.accounting_revenue_performance_evidence_reviews(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL,evidence_id uuid NOT NULL,evidence_version integer NOT NULL,
  decision text NOT NULL CHECK(decision IN ('APPROVED','HELD')),reviewer_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  UNIQUE(profile_id,evidence_id,evidence_version),
  FOREIGN KEY(profile_id,evidence_id,evidence_version) REFERENCES public.accounting_revenue_performance_evidence_versions(profile_id,evidence_id,version) ON DELETE RESTRICT);
CREATE TABLE public.accounting_revenue_recognition_events(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),profile_id uuid NOT NULL,arrangement_id uuid NOT NULL,arrangement_version integer NOT NULL,
  unit_id uuid NOT NULL,evidence_id uuid NOT NULL,evidence_version integer NOT NULL,correction_of_recognition_event_id uuid,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  source_record_key text NOT NULL CHECK(length(btrim(source_record_key)) BETWEEN 1 AND 200),economic_event_key text NOT NULL CHECK(length(btrim(economic_event_key)) BETWEEN 1 AND 200),
  signed_delta_halalah bigint NOT NULL CHECK(signed_delta_halalah<>0),accounting_date date NOT NULL,performance_from date NOT NULL,performance_through date NOT NULL,
  source_snapshot jsonb NOT NULL CHECK(jsonb_typeof(source_snapshot)='object'),source_snapshot_sha256 text NOT NULL CHECK(source_snapshot_sha256~'^[0-9a-f]{64}$'),
  expected_lines jsonb NOT NULL CHECK(jsonb_typeof(expected_lines)='array' AND jsonb_array_length(expected_lines) BETWEEN 2 AND 3),
  prepared_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  UNIQUE(profile_id,id),UNIQUE(profile_id,evidence_id,evidence_version),UNIQUE(profile_id,source_record_key,economic_event_key),
  FOREIGN KEY(profile_id,arrangement_id,arrangement_version) REFERENCES public.accounting_revenue_arrangement_versions(profile_id,arrangement_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,unit_id) REFERENCES public.accounting_revenue_performance_units(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,evidence_id,evidence_version) REFERENCES public.accounting_revenue_performance_evidence_versions(profile_id,evidence_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,correction_of_recognition_event_id) REFERENCES public.accounting_revenue_recognition_events(profile_id,id) ON DELETE RESTRICT);
CREATE TABLE public.accounting_revenue_recognition_journal_links(
  profile_id uuid NOT NULL,recognition_event_id uuid NOT NULL,journal_id uuid NOT NULL,prepared_version integer NOT NULL,
  source_effect_id uuid NOT NULL REFERENCES public.accounting_source_effects(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(profile_id,recognition_event_id),UNIQUE(profile_id,journal_id),UNIQUE(source_effect_id),
  FOREIGN KEY(profile_id,recognition_event_id) REFERENCES public.accounting_revenue_recognition_events(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,journal_id) REFERENCES public.accounting_journals(profile_id,id) ON DELETE RESTRICT);
CREATE TABLE public.accounting_revenue_recognition_journal_lines(
  profile_id uuid NOT NULL,recognition_event_id uuid NOT NULL,journal_id uuid NOT NULL,journal_version integer NOT NULL,line_number integer NOT NULL,
  mapping_key text NOT NULL,party_role text NOT NULL CHECK(party_role IN ('CONTRACT_ASSET','CONTRACT_LIABILITY','REVENUE')),
  service_id uuid NOT NULL,customer_id uuid NOT NULL,account_id uuid NOT NULL,account_version integer NOT NULL,side text NOT NULL CHECK(side IN ('DEBIT','CREDIT')),
  amount_halalah bigint NOT NULL CHECK(amount_halalah>0),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,recognition_event_id,journal_version,line_number),
  FOREIGN KEY(profile_id,recognition_event_id) REFERENCES public.accounting_revenue_recognition_events(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,journal_id) REFERENCES public.accounting_journals(profile_id,id) ON DELETE RESTRICT);

CREATE INDEX accounting_revenue_arrangements_service_idx ON public.accounting_revenue_arrangements(profile_id,service_id,created_at);
CREATE INDEX accounting_revenue_recognition_service_date_idx ON public.accounting_revenue_recognition_events(profile_id,service_id,accounting_date,created_at);
CREATE INDEX accounting_revenue_evidence_unit_idx ON public.accounting_revenue_performance_evidence_versions(profile_id,unit_id,created_at);

CREATE FUNCTION public.prevent_accounting_revenue_history_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $immutable$
BEGIN
  RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_REVENUE_HISTORY_IMMUTABLE';
END;$immutable$;
DO $immutable_triggers$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['accounting_revenue_arrangement_versions','accounting_revenue_arrangement_reviews',
    'accounting_revenue_performance_unit_versions','accounting_revenue_performance_evidence_versions',
    'accounting_revenue_performance_evidence_reviews','accounting_revenue_recognition_events',
    'accounting_revenue_recognition_journal_links','accounting_revenue_recognition_journal_lines'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_revenue_history_mutation()',t||'_immutable',t);
  END LOOP;
END;$immutable_triggers$;

DO $rls$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['accounting_revenue_arrangements','accounting_revenue_arrangement_versions','accounting_revenue_arrangement_reviews',
    'accounting_revenue_performance_units','accounting_revenue_performance_unit_versions','accounting_revenue_performance_evidence',
    'accounting_revenue_performance_evidence_versions','accounting_revenue_performance_evidence_reviews',
    'accounting_revenue_recognition_events','accounting_revenue_recognition_journal_links','accounting_revenue_recognition_journal_lines'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
  END LOOP;
  REVOKE ALL ON FUNCTION public.prevent_accounting_revenue_history_mutation() FROM PUBLIC,anon,authenticated,service_role;
END;$rls$;

-- The W10D AR bridge previously treated CONTRACT_ASSET as an ordinary asset.
-- W10F changes only that mapping to the protected control account.
DO $w10d_contract_asset$
DECLARE fn oid;src text;next_src text;old_text text;new_text text;owner_id oid;acl aclitem[];cfg text[];lang_name text;
  after_owner oid;after_acl aclitem[];after_cfg text[];vol "char";parallel "char";cost real;rows_count real;
  is_strict boolean;leaky boolean;definer boolean;after_vol "char";after_parallel "char";after_cost real;after_rows_count real;
  after_is_strict boolean;after_leaky boolean;after_definer boolean;after_lang_name text;
BEGIN
  fn:=to_regprocedure('public.accounting_ar_bridge_account_authorized(uuid,text,uuid,integer)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer,lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM 'a1daaf77732fa0224866ab0802b020b2' OR NOT definer OR vol<>'s'
     OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN RAISE EXCEPTION 'W10F preflight: W10D contract-asset account helper differs'; END IF;
  old_text:=$old$WHEN 'CONTRACT_ASSET' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND NOT av.is_protected AND av.control_classification='NONE'$old$;
  new_text:=$new$WHEN 'CONTRACT_ASSET' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND av.is_protected AND av.control_classification='CONTRACT_ASSET'$new$;
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10F preflight: W10D protected contract-asset branch differs'; END IF;
  next_src:=replace(src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.accounting_ar_bridge_account_authorized(p_profile_id uuid,p_mapping_key text,p_account_id uuid,p_account_version integer)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog, public AS %L$ddl$,next_src);
  SELECT p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO after_owner,after_acl,after_cfg,after_vol,after_parallel,after_cost,after_rows_count,after_is_strict,after_leaky,after_definer,after_lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg
     OR after_vol IS DISTINCT FROM vol OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict OR after_leaky IS DISTINCT FROM leaky
     OR after_definer IS DISTINCT FROM definer OR after_lang_name IS DISTINCT FROM lang_name THEN
    RAISE EXCEPTION 'W10F postflight: W10D helper metadata changed'; END IF;
END;$w10d_contract_asset$;

CREATE FUNCTION public.accounting_revenue_recognition_account_authorized(
  p_profile_id uuid,p_mapping_key text,p_account_id uuid,p_account_version integer
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $revenue_account_authorized$
  SELECT EXISTS(SELECT 1 FROM public.accounting_account_versions av WHERE av.profile_id=p_profile_id
    AND av.account_id=p_account_id AND av.version=p_account_version AND av.account_kind='POSTING' AND av.is_active
    AND NOT EXISTS(SELECT 1 FROM public.accounting_accounts child JOIN public.accounting_account_versions cv
      ON cv.profile_id=child.profile_id AND cv.account_id=child.id AND cv.version=child.current_version
      WHERE child.profile_id=p_profile_id AND cv.parent_account_id=av.account_id)
    AND CASE p_mapping_key
      WHEN 'CONTRACT_ASSET' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT' AND av.is_protected AND av.control_classification='CONTRACT_ASSET'
      WHEN 'CONTRACT_LIABILITY' THEN av.account_type='LIABILITY' AND av.normal_balance='CREDIT' AND av.is_protected AND av.control_classification='CONTRACT_LIABILITY'
      WHEN 'REVENUE' THEN av.account_type='REVENUE' AND av.normal_balance='CREDIT' AND NOT av.is_protected AND av.control_classification='NONE'
      ELSE false END);
$revenue_account_authorized$;

CREATE FUNCTION public.accounting_revenue_recognition_line_authorized(
  p_profile_id uuid,p_journal jsonb,p_line_number integer,p_mapping_key text,p_account_id uuid,p_account_version integer,p_actor_user_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $revenue_line_authorized$
  SELECT p_journal->>'source_domain'='REVENUE_RECOGNITION'
    AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_revenue_recognition')
    AND EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_events e
      JOIN public.accounting_revenue_arrangements a ON a.profile_id=e.profile_id AND a.id=e.arrangement_id
      WHERE e.profile_id=p_profile_id AND e.source_record_key=p_journal->>'source_record_key'
        AND e.economic_event_key=p_journal->>'economic_event_key' AND e.prepared_by=p_actor_user_id
        AND jsonb_typeof(e.expected_lines)='array' AND p_line_number BETWEEN 1 AND jsonb_array_length(e.expected_lines)
        AND e.expected_lines->(p_line_number-1)->>'mapping_key'=p_mapping_key
        AND (e.expected_lines->(p_line_number-1)->>'amount_halalah')::bigint>0
        AND public.accounting_revenue_recognition_account_authorized(p_profile_id,p_mapping_key,p_account_id,p_account_version));
$revenue_line_authorized$;

CREATE FUNCTION public.accounting_revenue_recognition_journal_link_authorized(
  p_profile_id uuid,p_journal_id uuid,p_prepared_version integer,p_actor_user_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $revenue_link_authorized$
  SELECT EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_journal_links l
    JOIN public.accounting_revenue_recognition_events e ON e.profile_id=l.profile_id AND e.id=l.recognition_event_id
    JOIN public.accounting_journal_versions j ON j.profile_id=l.profile_id AND j.journal_id=l.journal_id AND j.version=l.prepared_version
    WHERE l.profile_id=p_profile_id AND l.journal_id=p_journal_id AND l.prepared_version=p_prepared_version
      AND e.prepared_by=p_actor_user_id AND j.source_domain='REVENUE_RECOGNITION' AND j.posting_purpose='revenue_recognition'
      AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_revenue_recognition'));
$revenue_link_authorized$;

CREATE FUNCTION public.accounting_revenue_recognition_journal_account_authorized(
  p_profile_id uuid,p_journal_id uuid,p_journal_version integer,p_line_number integer,p_account_id uuid,p_account_version integer,p_actor_user_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $revenue_journal_account_authorized$
  SELECT EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_journal_lines l
    JOIN public.accounting_revenue_recognition_journal_links k ON k.profile_id=l.profile_id
      AND k.recognition_event_id=l.recognition_event_id AND k.journal_id=l.journal_id AND k.prepared_version=l.journal_version
    WHERE l.profile_id=p_profile_id AND l.journal_id=p_journal_id AND l.journal_version=p_journal_version
      AND l.line_number=p_line_number AND l.account_id=p_account_id AND l.account_version=p_account_version
      AND public.accounting_revenue_recognition_journal_link_authorized(p_profile_id,p_journal_id,k.prepared_version,p_actor_user_id)
      AND public.accounting_revenue_recognition_account_authorized(p_profile_id,l.mapping_key,p_account_id,p_account_version));
$revenue_journal_account_authorized$;

CREATE FUNCTION public.accounting_revenue_recognition_source_effect_link() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $revenue_effect$
DECLARE e public.accounting_revenue_recognition_events%ROWTYPE;j public.accounting_journal_versions%ROWTYPE;
  expected jsonb;x record;item jsonb;
BEGIN
  IF NEW.source_domain<>'REVENUE_RECOGNITION' THEN RETURN NEW; END IF;
  SELECT * INTO e FROM public.accounting_revenue_recognition_events WHERE profile_id=NEW.profile_id
    AND source_record_key=NEW.source_record_key AND economic_event_key=NEW.economic_event_key;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_REVENUE_RECOGNITION_EVENT_NOT_FOUND'; END IF;
  SELECT * INTO j FROM public.accounting_journal_versions WHERE profile_id=NEW.profile_id AND journal_id=NEW.journal_id
    AND version=NEW.journal_version AND source_domain='REVENUE_RECOGNITION' AND posting_purpose='revenue_recognition';
  IF NOT FOUND OR NEW.payload_fingerprint IS DISTINCT FROM j.payload_fingerprint
     OR e.source_snapshot_sha256 IS DISTINCT FROM encode(extensions.digest(convert_to(e.source_snapshot::text,'UTF8'),'sha256'),'hex') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_REVENUE_RECOGNITION_SOURCE_CONFLICT'; END IF;
  expected:=e.expected_lines;
  IF jsonb_array_length(expected)<>(SELECT count(*) FROM public.accounting_journal_line_versions
      WHERE profile_id=NEW.profile_id AND journal_id=NEW.journal_id AND journal_version=NEW.journal_version) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_REVENUE_RECOGNITION_JOURNAL_SHAPE_INVALID'; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.status<>'PREPARED' OR NEW.status<>'POSTED' OR NOT EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_journal_links
      WHERE profile_id=NEW.profile_id AND journal_id=NEW.journal_id AND prepared_version=NEW.journal_version-1 AND source_effect_id=NEW.id) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_REVENUE_RECOGNITION_EFFECT_TRANSITION_INVALID'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.status<>'PREPARED' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_REVENUE_RECOGNITION_EFFECT_STATUS_INVALID'; END IF;
  INSERT INTO public.accounting_revenue_recognition_journal_links(profile_id,recognition_event_id,journal_id,prepared_version,source_effect_id)
    VALUES(NEW.profile_id,e.id,NEW.journal_id,NEW.journal_version,NEW.id);
  FOR x IN SELECT l.* FROM public.accounting_journal_line_versions l WHERE l.profile_id=NEW.profile_id
      AND l.journal_id=NEW.journal_id AND l.journal_version=NEW.journal_version ORDER BY l.line_number LOOP
    item:=expected->(x.line_number-1);
    IF x.mapping_key IS DISTINCT FROM item->>'mapping_key' OR x.side IS DISTINCT FROM item->>'side'
       OR x.amount_halalah IS DISTINCT FROM (item->>'amount_halalah')::bigint
       OR NOT public.accounting_revenue_recognition_account_authorized(NEW.profile_id,x.mapping_key,x.account_id,x.account_version) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_REVENUE_RECOGNITION_ACCOUNT_INVALID'; END IF;
    INSERT INTO public.accounting_revenue_recognition_journal_lines(profile_id,recognition_event_id,journal_id,journal_version,line_number,
      mapping_key,party_role,service_id,customer_id,account_id,account_version,side,amount_halalah)
    VALUES(NEW.profile_id,e.id,NEW.journal_id,NEW.journal_version,x.line_number,x.mapping_key,item->>'party_role',e.service_id,e.customer_id,
      x.account_id,x.account_version,x.side,x.amount_halalah);
  END LOOP;
  RETURN NEW;
END;$revenue_effect$;
CREATE TRIGGER accounting_revenue_recognition_effect_link AFTER INSERT OR UPDATE OF status ON public.accounting_source_effects
  FOR EACH ROW EXECUTE FUNCTION public.accounting_revenue_recognition_source_effect_link();

-- Extend the existing W10B seams with exact-source, metadata-preserving replacements.
DO $engine$
DECLARE fn oid;src text;next_src text;old_text text;new_text text;owner_id oid;acl aclitem[];cfg text[];lang_name text;
  after_owner oid;after_acl aclitem[];after_cfg text[];vol "char";parallel "char";cost real;rows_count real;
  is_strict boolean;leaky boolean;definer boolean;after_vol "char";after_parallel "char";after_cost real;after_rows_count real;
  after_is_strict boolean;after_leaky boolean;after_definer boolean;after_lang_name text;
BEGIN
  fn:=to_regprocedure('public.save_accounting_account(uuid,uuid,integer,jsonb,text,text,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer,lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM '13a1aa5b241fc60b930d0433e644e5b1' OR NOT definer OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public, extensions'] THEN
    RAISE EXCEPTION 'W10F preflight: account-save function contract differs'; END IF;
  old_text:=$old$'EMPLOYEE_ADVANCE','EMPLOYEE_REIMBURSEMENT_LIABILITY'$old$;
  new_text:=$new$'EMPLOYEE_ADVANCE','EMPLOYEE_REIMBURSEMENT_LIABILITY','CONTRACT_ASSET'$new$;
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10F preflight: protected account-save allowlist differs'; END IF;
  next_src:=replace(src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.save_accounting_account(p_actor_user_id uuid,p_account_id uuid,p_expected_version integer,p_account jsonb,p_reason text,p_evidence_ref text,p_request_id uuid)
    RETURNS TABLE(error_code text,account_id uuid,version integer,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF
    SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public, extensions AS %L$ddl$,next_src);
  SELECT p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO after_owner,after_acl,after_cfg,after_vol,after_parallel,after_cost,after_rows_count,after_is_strict,after_leaky,after_definer,after_lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg
     OR after_vol IS DISTINCT FROM vol OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict OR after_leaky IS DISTINCT FROM leaky
     OR after_definer IS DISTINCT FROM definer OR after_lang_name IS DISTINCT FROM lang_name THEN RAISE EXCEPTION 'W10F postflight: account-save metadata changed'; END IF;

  fn:=to_regprocedure('public.validate_accounting_posting_rule_mapping()');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer,lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM '6c147eff9f74eb64f6f1c62cc46c3c7d' OR NOT definer OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN
    RAISE EXCEPTION 'W10F preflight: posting-mapping validator contract differs'; END IF;
  old_text:=$old$NOT (public.accounting_inception_mapping_authorized(NEW.profile_id,NEW.posting_rule_id,NEW.rule_version,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ar_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ap_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_expense_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version))$old$;
  new_text:=$new$NOT (public.accounting_inception_mapping_authorized(NEW.profile_id,NEW.posting_rule_id,NEW.rule_version,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ar_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ap_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_expense_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_revenue_recognition_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version))$new$;
  IF length(src)-length(replace(src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10F preflight: posting-mapping authorization anchor differs'; END IF;
  next_src:=replace(src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.validate_accounting_posting_rule_mapping() RETURNS trigger LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 SET search_path=pg_catalog, public AS %L$ddl$,next_src);
  SELECT p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO after_owner,after_acl,after_cfg,after_vol,after_parallel,after_cost,after_rows_count,after_is_strict,after_leaky,after_definer,after_lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg
     OR after_vol IS DISTINCT FROM vol OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict OR after_leaky IS DISTINCT FROM leaky
     OR after_definer IS DISTINCT FROM definer OR after_lang_name IS DISTINCT FROM lang_name THEN RAISE EXCEPTION 'W10F postflight: posting-mapping validator metadata changed'; END IF;

  fn:=to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer,lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM '4786a51bf6cb5dbcaeb8b84a6d7160a1' OR NOT definer OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN
    RAISE EXCEPTION 'W10F preflight: journal-prepare function contract differs'; END IF;
  next_src:=src;
  old_text:=$old$p_journal->>'source_domain' NOT IN ('INCEPTION','AR_BRIDGE','AP_BRIDGE','EXPENSE_BRIDGE')$old$;
  new_text:=$new$p_journal->>'source_domain' NOT IN ('INCEPTION','AR_BRIDGE','AP_BRIDGE','EXPENSE_BRIDGE','REVENUE_RECOGNITION')$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10F preflight: journal payload domain anchor differs'; END IF;
  next_src:=replace(next_src,old_text,new_text);
  old_text:=$old$v_source_domain NOT IN (concat('CONTROLLED_','MANUAL'),'INCEPTION','AR_BRIDGE','AP_BRIDGE','EXPENSE_BRIDGE')$old$;
  new_text:=$new$v_source_domain NOT IN (concat('CONTROLLED_','MANUAL'),'INCEPTION','AR_BRIDGE','AP_BRIDGE','EXPENSE_BRIDGE','REVENUE_RECOGNITION')$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10F preflight: journal source-domain guard differs'; END IF;
  next_src:=replace(next_src,old_text,new_text);
  old_text:=$old$IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:prepare_journal') AND NOT (v_source_domain='AR_BRIDGE' AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_ar_bridge')) AND NOT (v_source_domain='AP_BRIDGE' AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_ap_bridge')) AND NOT (v_source_domain='EXPENSE_BRIDGE' AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_expense_bridge')) THEN$old$;
  new_text:=$new$IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:prepare_journal') AND NOT (v_source_domain='AR_BRIDGE' AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_ar_bridge')) AND NOT (v_source_domain='AP_BRIDGE' AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_ap_bridge')) AND NOT (v_source_domain='EXPENSE_BRIDGE' AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_expense_bridge')) AND NOT (v_source_domain='REVENUE_RECOGNITION' AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_revenue_recognition')) THEN$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10F preflight: journal-prepare capability anchor differs'; END IF;
  next_src:=replace(next_src,old_text,new_text);
  old_text:=$old$public.accounting_inception_journal_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain='AR_BRIDGE' AND public.accounting_ar_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain='AP_BRIDGE' AND public.accounting_ap_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain='EXPENSE_BRIDGE' AND public.accounting_expense_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)))$old$;
  new_text:=$new$public.accounting_inception_journal_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain='AR_BRIDGE' AND public.accounting_ar_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain='AP_BRIDGE' AND public.accounting_ap_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain='EXPENSE_BRIDGE' AND public.accounting_expense_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain='REVENUE_RECOGNITION' AND public.accounting_revenue_recognition_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)))$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10F preflight: journal-prepare line authorization anchor differs'; END IF;
  next_src:=replace(next_src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.prepare_accounting_journal(p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_journal jsonb,p_reason text,p_evidence_ref text,p_request_id uuid)
    RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF
    SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,next_src);
  SELECT p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO after_owner,after_acl,after_cfg,after_vol,after_parallel,after_cost,after_rows_count,after_is_strict,after_leaky,after_definer,after_lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg
     OR after_vol IS DISTINCT FROM vol OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict OR after_leaky IS DISTINCT FROM leaky
     OR after_definer IS DISTINCT FROM definer OR after_lang_name IS DISTINCT FROM lang_name THEN RAISE EXCEPTION 'W10F postflight: journal-prepare metadata changed'; END IF;

  fn:=to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO src,owner_id,acl,cfg,vol,parallel,cost,rows_count,is_strict,leaky,definer,lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF fn IS NULL OR md5(src) IS DISTINCT FROM '1997a8a9eda6010f3e38b2a770ecff9a' OR NOT definer OR cfg IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN
    RAISE EXCEPTION 'W10F preflight: journal-post function contract differs'; END IF;
  next_src:=src;
  old_text:=$old$IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:post_journal') AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain='AR_BRIDGE') AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_ar_bridge')) AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain='AP_BRIDGE') AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_ap_bridge')) AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain='EXPENSE_BRIDGE') AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_expense_bridge')) THEN$old$;
  new_text:=$new$IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:post_journal') AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain='AR_BRIDGE') AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_ar_bridge')) AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain='AP_BRIDGE') AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_ap_bridge')) AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain='EXPENSE_BRIDGE') AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_expense_bridge')) AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain='REVENUE_RECOGNITION') AND public.get_accounting_capability(p_actor_user_id,'accounting:manage_revenue_recognition')) THEN$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10F preflight: journal-post capability anchor differs'; END IF;
  next_src:=replace(next_src,old_text,new_text);
  old_text:=$old$ IF v_header.status='POSTED' THEN$old$;
  new_text:=$new$  IF v_header.source_domain='REVENUE_RECOGNITION' AND (NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_revenue_recognition') OR NOT public.accounting_revenue_recognition_journal_link_authorized(v_profile_id,p_journal_id,v_header.version,v_header.prepared_by)) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_REVENUE_RECOGNITION_JOURNAL_NOT_AUTHORIZED';
  END IF;
  IF v_header.status='POSTED' THEN$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10F preflight: journal-post link guard differs'; END IF;
  next_src:=replace(next_src,old_text,new_text);
  old_text:=$old$OR NOT av.is_active OR ((av.is_protected OR av.control_classification<>'NONE') AND NOT (v_header.source_domain='INCEPTION' OR (v_header.source_domain='AR_BRIDGE' AND public.accounting_ar_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by)) OR (v_header.source_domain='AP_BRIDGE' AND public.accounting_ap_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by)) OR (v_header.source_domain='EXPENSE_BRIDGE' AND public.accounting_expense_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by))))$old$;
  new_text:=$new$OR NOT av.is_active OR ((av.is_protected OR av.control_classification<>'NONE') AND NOT (v_header.source_domain='INCEPTION' OR (v_header.source_domain='AR_BRIDGE' AND public.accounting_ar_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by)) OR (v_header.source_domain='AP_BRIDGE' AND public.accounting_ap_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by)) OR (v_header.source_domain='EXPENSE_BRIDGE' AND public.accounting_expense_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by)) OR (v_header.source_domain='REVENUE_RECOGNITION' AND public.accounting_revenue_recognition_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by))))$new$;
  IF length(next_src)-length(replace(next_src,old_text,''))<>length(old_text) THEN RAISE EXCEPTION 'W10F preflight: protected account gate differs'; END IF;
  next_src:=replace(next_src,old_text,new_text);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.post_accounting_journal(p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid)
    RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF
    SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,next_src);
  SELECT p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef,l.lanname
    INTO after_owner,after_acl,after_cfg,after_vol,after_parallel,after_cost,after_rows_count,after_is_strict,after_leaky,after_definer,after_lang_name
    FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE p.oid=fn;
  IF after_owner IS DISTINCT FROM owner_id OR after_acl IS DISTINCT FROM acl OR after_cfg IS DISTINCT FROM cfg
     OR after_vol IS DISTINCT FROM vol OR after_parallel IS DISTINCT FROM parallel OR after_cost IS DISTINCT FROM cost
     OR after_rows_count IS DISTINCT FROM rows_count OR after_is_strict IS DISTINCT FROM is_strict OR after_leaky IS DISTINCT FROM leaky
     OR after_definer IS DISTINCT FROM definer OR after_lang_name IS DISTINCT FROM lang_name THEN RAISE EXCEPTION 'W10F postflight: journal-post metadata changed'; END IF;

END;$engine$;

CREATE FUNCTION public.save_accounting_revenue_arrangement(
  p_actor uuid,p_service_id uuid,p_abs_id uuid,p_expected_version integer,p_units jsonb,
  p_principal_agent_basis text,p_policy_version text,p_modification_evidence_ref text,
  p_modification_evidence_sha256 text,p_reason text,p_request_id uuid
 ) RETURNS TABLE(error_code text,arrangement_id uuid,version integer,status text,held_code text,consideration_halalah text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $save_revenue_arrangement$
DECLARE profile uuid;s public.approved_billing_scopes%ROWTYPE;service_customer uuid;snapshot jsonb;snapshot_hash text;
  amount bigint:=0;arr public.accounting_revenue_arrangements%ROWTYPE;arr_id uuid;vnum integer;state text:='PREPARED';held text;
  predecessor uuid;prior_recognized bigint:=0;prev_consideration bigint;prev_units jsonb;prev_snapshot jsonb;unsupported boolean:=false;units jsonb;fid uuid;payload jsonb;u jsonb;unit_id uuid;unit_version integer;
  replay_state text;replay_held text;replay_amount bigint;replay_hash text;
BEGIN
  IF p_actor IS NULL OR p_service_id IS NULL OR p_abs_id IS NULL OR p_expected_version IS NULL OR p_expected_version<0
     OR p_units IS NULL OR jsonb_typeof(p_units)<>'array' OR coalesce(p_principal_agent_basis,'') NOT IN ('PRINCIPAL','AGENT')
     OR length(btrim(coalesce(p_policy_version,''))) NOT BETWEEN 1 AND 100 OR p_request_id IS NULL
     OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000
     OR ((p_modification_evidence_ref IS NULL)<>(p_modification_evidence_sha256 IS NULL))
     OR (p_modification_evidence_sha256 IS NOT NULL AND p_modification_evidence_sha256 !~ '^[0-9a-f]{64}$') THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,NULL::text,false;RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,NULL::text,false;RETURN;END IF;
  IF NOT public.get_accounting_capability(p_actor,'accounting:manage_revenue_recognition') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
  SELECT p.id INTO profile FROM public.accounting_profiles p JOIN public.accounting_profile_versions pv
    ON pv.profile_id=p.id AND pv.version=p.current_version WHERE p.singleton_key='g7' AND pv.activation_state='DEV_PROVISIONAL' FOR SHARE OF p;
  IF profile IS NULL THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,NULL::text,false;RETURN;END IF;
  SELECT * INTO s FROM public.approved_billing_scopes WHERE id=p_abs_id AND service_id=p_service_id FOR SHARE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,NULL::text,false;RETURN;END IF;
  SELECT customer_id INTO service_customer FROM public.services WHERE id=p_service_id AND deleted_at IS NULL FOR SHARE;
  IF service_customer IS NULL THEN held:='SERVICE_CUSTOMER_LINEAGE_UNAVAILABLE';END IF;

  SELECT jsonb_build_object('approved_billing_scope',jsonb_build_object(
      'id',s.id,'service_id',s.service_id,'source_quotation_id',s.source_quotation_id,'scope_version',s.scope_version,
      'status',s.status,'approved_at',s.approved_at,'superseded_at',s.superseded_at,'superseded_by_scope_id',s.superseded_by_scope_id,
      'supersedes_scope_id',s.supersedes_scope_id,'voided_at',s.voided_at,'source_currency',s.source_currency,
      'accepted_subtotal',s.accepted_subtotal,'accepted_vat_amount',s.accepted_vat_amount,'accepted_grand_total',s.accepted_grand_total,
      'source_vat_rate',s.source_vat_rate,'source_discount',s.source_discount,'line_safety_status',s.line_safety_status),
    'service_id',p_service_id,'customer_id',service_customer,
    'items',coalesce((SELECT jsonb_agg(jsonb_build_object('id',i.id,'source_quotation_item_id',i.source_quotation_item_id,
      'display_order',i.display_order,'decision',i.decision,'source_commercial_role',i.source_commercial_role,
      'source_parent_authority_line_id',i.source_parent_authority_line_id,'source_is_selected',i.source_is_selected,
       'source_category',i.source_category,'source_unit',i.source_unit,'source_qty',i.source_qty,
      'accepted_subtotal',i.accepted_subtotal,'accepted_vat_amount',i.accepted_vat_amount,'accepted_grand_total',i.accepted_grand_total,
      'source_discount_allocated',i.source_discount_allocated,'source_description',i.source_description)
      ORDER BY i.display_order,i.id) FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id=s.id),'[]'::jsonb))
    INTO snapshot;
  snapshot_hash:=encode(extensions.digest(convert_to(snapshot::text,'UTF8'),'sha256'),'hex');
  SELECT coalesce(sum(round((i.accepted_subtotal-i.source_discount_allocated)*100,0)),0)::bigint
    INTO amount
    FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id=s.id
      AND i.decision IN ('accepted','adjusted') AND (i.source_commercial_role='authority_line'
        OR (i.source_commercial_role='optional_add_on' AND i.source_is_selected IS TRUE));
  SELECT coalesce(bool_or(i.accepted_vat_amount<>0 OR i.accepted_grand_total<>i.accepted_subtotal-i.source_discount_allocated
      OR i.source_discount_allocated<0 OR i.source_commercial_role NOT IN ('authority_line','included_component','optional_add_on')
      OR (i.source_commercial_role='included_component' AND i.accepted_grand_total<>0)
      OR (i.source_commercial_role='optional_add_on' AND i.source_is_selected IS DISTINCT FROM true AND i.accepted_grand_total<>0)),false)
    OR s.accepted_vat_amount<>0 OR s.source_vat_rate<>0 OR upper(s.source_currency)<>'SAR'
    INTO unsupported
    FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id=s.id AND i.decision IN ('accepted','adjusted');
  IF coalesce(s.status,'')<>'approved' OR s.approved_at IS NULL OR s.line_safety_status<>'safe'
     OR s.superseded_at IS NOT NULL OR s.voided_at IS NOT NULL THEN held:=coalesce(held,'STALE_OR_UNAPPROVED_COMMERCIAL_AUTHORITY');END IF;
  IF coalesce(upper(s.source_currency),'')<>'SAR' THEN held:=coalesce(held,'NON_SAR_CONSIDERATION_UNSUPPORTED');END IF;
  IF coalesce(s.source_pricing_context::text,'{}') ~* '(variable|contingent|uncertain|principal.agent)' THEN held:=coalesce(held,'VARIABLE_CONSIDERATION_OR_AGENT_TREATMENT_UNSUPPORTED');END IF;
  IF s.accepted_vat_amount<>0 OR s.source_vat_rate<>0 OR EXISTS(SELECT 1 FROM public.approved_billing_scope_items i
      WHERE i.approved_billing_scope_id=s.id AND i.accepted_vat_amount<>0) THEN held:=coalesce(held,'VAT_OR_TAX_TREATMENT_UNSUPPORTED');END IF;
  IF unsupported THEN held:=coalesce(held,'APPROVED_SCOPE_TOTAL_OR_LINEAGE_MISMATCH');END IF;
  IF amount<>round(s.accepted_grand_total*100,0)::bigint THEN held:=coalesce(held,'APPROVED_SCOPE_TOTAL_OR_LINEAGE_MISMATCH');END IF;
  IF amount<=0 THEN held:=coalesce(held,'NO_SUPPORTED_CONSIDERATION');END IF;
  IF p_principal_agent_basis='AGENT' THEN held:=coalesce(held,'AGENT_TREATMENT_EVIDENCE_REQUIRED');END IF;

  IF s.supersedes_scope_id IS NOT NULL THEN
    SELECT id INTO predecessor FROM public.accounting_revenue_arrangements WHERE profile_id=profile AND service_id=p_service_id
      AND approved_billing_scope_id=s.supersedes_scope_id;
    IF predecessor IS NULL THEN held:=coalesce(held,'COMMERCIAL_MODIFICATION_LINEAGE_MISSING');
    ELSIF p_modification_evidence_ref IS NULL THEN held:=coalesce(held,'COMMERCIAL_MODIFICATION_EVIDENCE_REQUIRED');
    ELSE
      SELECT units_snapshot,source_snapshot,consideration_halalah INTO prev_units,prev_snapshot,prev_consideration FROM public.accounting_revenue_arrangement_versions
        WHERE profile_id=profile AND arrangement_id=predecessor ORDER BY version DESC LIMIT 1;
       WITH RECURSIVE arrangement_lineage(arrangement_id,parent_arrangement_id,depth) AS (
         SELECT pred_arr.id,pred_version.supersedes_arrangement_id,0
         FROM public.accounting_revenue_arrangements pred_arr
         JOIN public.accounting_revenue_arrangement_versions pred_version
           ON pred_version.profile_id=pred_arr.profile_id AND pred_version.arrangement_id=pred_arr.id
             AND pred_version.version=pred_arr.current_version
         WHERE pred_arr.profile_id=profile AND pred_arr.id=predecessor
         UNION ALL
         SELECT parent_arr.id,parent_version.supersedes_arrangement_id,lineage.depth+1
         FROM arrangement_lineage lineage
         JOIN public.accounting_revenue_arrangements parent_arr
           ON parent_arr.profile_id=profile AND parent_arr.id=lineage.parent_arrangement_id
         JOIN LATERAL (SELECT v.supersedes_arrangement_id FROM public.accounting_revenue_arrangement_versions v
           WHERE v.profile_id=profile AND v.arrangement_id=parent_arr.id ORDER BY v.version DESC LIMIT 1) parent_version ON true
         WHERE lineage.parent_arrangement_id IS NOT NULL AND lineage.depth<100
       )
       SELECT coalesce(sum(e.signed_delta_halalah),0)::bigint INTO prior_recognized
       FROM arrangement_lineage lineage
       JOIN public.accounting_revenue_recognition_events e
         ON e.profile_id=profile AND e.arrangement_id=lineage.arrangement_id
       JOIN public.accounting_revenue_recognition_journal_links l
         ON l.profile_id=e.profile_id AND l.recognition_event_id=e.id
       JOIN public.accounting_source_effects se
         ON se.profile_id=l.profile_id AND se.id=l.source_effect_id AND se.status='POSTED';
      IF amount<prior_recognized THEN held:=coalesce(held,'MODIFICATION_BELOW_RECOGNIZED_AMOUNT');END IF;
      IF amount<coalesce(prev_consideration,0) THEN held:=coalesce(held,'COMMERCIAL_MODIFICATION_REDUCTION_REQUIRES_REVIEW');
      ELSIF prior_recognized>0 AND amount<=coalesce(prev_consideration,0) THEN
        held:=coalesce(held,'MODIFICATION_AFTER_RECOGNITION_REQUIRES_REVIEW');
      END IF;
       IF prev_units IS NULL OR jsonb_typeof(prev_units)<>'array' OR jsonb_array_length(prev_units)=0
        OR jsonb_array_length(p_units)<>jsonb_array_length(prev_units)
        OR EXISTS(SELECT 1 FROM jsonb_array_elements(prev_units) old_u(value)
          FULL JOIN jsonb_array_elements(p_units) new_u(value) ON new_u.value->>'unit_key'=old_u.value->>'unit_key'
          WHERE old_u.value IS NULL OR new_u.value IS NULL
            OR new_u.value->>'promised_output' IS DISTINCT FROM old_u.value->>'promised_output'
            OR new_u.value->>'satisfaction_method' IS DISTINCT FROM old_u.value->>'satisfaction_method'
            OR new_u.value->>'required_evidence_basis' IS DISTINCT FROM old_u.value->>'required_evidence_basis')
         OR EXISTS(
           WITH RECURSIVE old_base AS (
             SELECT old_u.value->>'unit_key' unit_key,old_item.value->>'source_quotation_item_id' source_item_id,
               old_item.value->>'source_parent_authority_line_id' parent_item_id,old_item.value allocation_item,
               (old_a.value->>'amount_halalah')::bigint amount
             FROM jsonb_array_elements(prev_units) old_u(value)
             CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(old_u.value->'allocations')='array'
               THEN old_u.value->'allocations' ELSE '[]'::jsonb END) old_a(value)
             JOIN LATERAL jsonb_array_elements(prev_snapshot->'items') old_item(value)
               ON old_item.value->>'id'=old_a.value->>'source_item_id'
           ), old_walk AS (
             SELECT unit_key,source_item_id,parent_item_id,allocation_item,allocation_item root_item,amount,0 depth
             FROM old_base
             UNION ALL
             SELECT walk.unit_key,walk.source_item_id,parent.value->>'source_parent_authority_line_id',
               walk.allocation_item,parent.value,walk.amount,walk.depth+1
             FROM old_walk walk
             JOIN LATERAL jsonb_array_elements(prev_snapshot->'items') parent(value)
               ON parent.value->>'source_quotation_item_id'=walk.parent_item_id
             WHERE walk.parent_item_id IS NOT NULL AND walk.depth<100
           ), old_resolved AS (
             SELECT DISTINCT ON (unit_key,source_item_id) unit_key,
               encode(extensions.digest(convert_to(jsonb_build_array(
                 root_item->>'source_commercial_role',root_item->>'source_description',root_item->>'source_category',
                 root_item->>'source_unit',root_item->>'source_qty',allocation_item->>'source_commercial_role',
                 allocation_item->>'source_is_selected',allocation_item->>'source_description',
                 allocation_item->>'source_category',allocation_item->>'source_unit',allocation_item->>'source_qty'
               )::text,'UTF8'),'sha256'),'hex') allocation_key,
               allocation_item->>'source_commercial_role' source_commercial_role,
               allocation_item->>'source_is_selected' source_is_selected,source_item_id,amount
             FROM old_walk ORDER BY unit_key,source_item_id,depth DESC
           ), new_base AS (
             SELECT new_u.value->>'unit_key' unit_key,new_item.value->>'source_quotation_item_id' source_item_id,
               new_item.value->>'source_parent_authority_line_id' parent_item_id,new_item.value allocation_item,
               (new_a.value->>'amount_halalah')::bigint amount
             FROM jsonb_array_elements(p_units) new_u(value)
             CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(new_u.value->'allocations')='array'
               THEN new_u.value->'allocations' ELSE '[]'::jsonb END) new_a(value)
             JOIN LATERAL jsonb_array_elements(snapshot->'items') new_item(value)
               ON new_item.value->>'id'=new_a.value->>'source_item_id'
           ), new_walk AS (
             SELECT unit_key,source_item_id,parent_item_id,allocation_item,allocation_item root_item,amount,0 depth
             FROM new_base
             UNION ALL
             SELECT walk.unit_key,walk.source_item_id,parent.value->>'source_parent_authority_line_id',
               walk.allocation_item,parent.value,walk.amount,walk.depth+1
             FROM new_walk walk
             JOIN LATERAL jsonb_array_elements(snapshot->'items') parent(value)
               ON parent.value->>'source_quotation_item_id'=walk.parent_item_id
             WHERE walk.parent_item_id IS NOT NULL AND walk.depth<100
           ), new_resolved AS (
             SELECT DISTINCT ON (unit_key,source_item_id) unit_key,
               encode(extensions.digest(convert_to(jsonb_build_array(
                 root_item->>'source_commercial_role',root_item->>'source_description',root_item->>'source_category',
                 root_item->>'source_unit',root_item->>'source_qty',allocation_item->>'source_commercial_role',
                 allocation_item->>'source_is_selected',allocation_item->>'source_description',
                 allocation_item->>'source_category',allocation_item->>'source_unit',allocation_item->>'source_qty'
               )::text,'UTF8'),'sha256'),'hex') allocation_key,
               allocation_item->>'source_commercial_role' source_commercial_role,
               allocation_item->>'source_is_selected' source_is_selected,source_item_id,amount
             FROM new_walk ORDER BY unit_key,source_item_id,depth DESC
           ), ambiguous_lineage AS (
             SELECT 1 FROM old_resolved GROUP BY unit_key,allocation_key,source_commercial_role,source_is_selected
               HAVING count(DISTINCT source_item_id)>1
             UNION ALL
             SELECT 1 FROM new_resolved GROUP BY unit_key,allocation_key,source_commercial_role,source_is_selected
               HAVING count(DISTINCT source_item_id)>1
           ), old_alloc AS (
             SELECT unit_key,allocation_key,source_commercial_role,source_is_selected,sum(amount)::bigint amount
             FROM old_resolved GROUP BY unit_key,allocation_key,source_commercial_role,source_is_selected
           ), new_alloc AS (
             SELECT unit_key,allocation_key,source_commercial_role,source_is_selected,sum(amount)::bigint amount
             FROM new_resolved GROUP BY unit_key,allocation_key,source_commercial_role,source_is_selected
           )
           SELECT 1 FROM ambiguous_lineage
           UNION ALL
           SELECT 1 FROM old_alloc old FULL JOIN new_alloc new
             USING(unit_key,allocation_key,source_commercial_role,source_is_selected)
           WHERE old.amount IS NULL OR new.amount IS NULL OR new.amount<old.amount
         ) THEN
        held:=coalesce(held,'COMMERCIAL_MODIFICATION_PROMISE_OR_ALLOCATION_CHANGED');
      END IF;
    END IF;
  ELSIF EXISTS(SELECT 1 FROM public.accounting_revenue_arrangements a WHERE a.profile_id=profile AND a.service_id=p_service_id
      AND a.approved_billing_scope_id<>s.id) THEN
    held:=coalesce(held,'COMMERCIAL_MODIFICATION_LINEAGE_MISSING');
  END IF;

  IF held IS NULL THEN
    IF jsonb_array_length(p_units)=0 OR jsonb_array_length(p_units)>100 THEN held:='PERFORMANCE_UNIT_ALLOCATION_REQUIRED';
    ELSIF EXISTS(SELECT 1 FROM jsonb_array_elements(p_units) u WHERE jsonb_typeof(u)<>'object'
      OR length(btrim(coalesce(u->>'unit_key','')))=0 OR length(btrim(coalesce(u->>'promised_output','')))=0
      OR u->>'satisfaction_method' NOT IN ('POINT_IN_TIME','OVER_TIME')
      OR u->>'required_evidence_basis' NOT IN ('CUSTOMER_ACCEPTANCE','TRANSFER_OF_CONTROL','MEASURED_OUTPUT')
      OR jsonb_typeof(u->'allocations')<>'array' OR jsonb_array_length(u->'allocations')=0
      OR (u->>'satisfaction_method'='POINT_IN_TIME' AND u->>'required_evidence_basis' NOT IN ('CUSTOMER_ACCEPTANCE','TRANSFER_OF_CONTROL'))
      OR (u->>'satisfaction_method'='OVER_TIME' AND u->>'required_evidence_basis' NOT IN ('CUSTOMER_ACCEPTANCE','MEASURED_OUTPUT'))) THEN
      held:='PERFORMANCE_UNIT_ALLOCATION_INCOMPLETE';
    ELSIF (SELECT count(*)<>count(DISTINCT u->>'unit_key') FROM jsonb_array_elements(p_units) u) THEN
      held:='PERFORMANCE_UNIT_KEY_COLLISION';
    ELSIF EXISTS(SELECT 1 FROM jsonb_array_elements(p_units) u CROSS JOIN LATERAL jsonb_array_elements(u->'allocations') a
      WHERE nullif(a->>'source_item_id','') IS NULL OR nullif(a->>'amount_halalah','') IS NULL OR (a->>'amount_halalah')::bigint<=0)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_units) u CROSS JOIN LATERAL jsonb_array_elements(u->'allocations') a
        GROUP BY u->>'unit_key',a->>'source_item_id' HAVING count(*)>1) THEN held:='PERFORMANCE_UNIT_ALLOCATION_INVALID';
    ELSIF EXISTS(
      WITH expected AS (SELECT i.id source_item_id,round((i.accepted_subtotal-i.source_discount_allocated)*100,0)::bigint amount
        FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id=s.id AND i.decision IN ('accepted','adjusted')
          AND (i.source_commercial_role='authority_line' OR (i.source_commercial_role='optional_add_on' AND i.source_is_selected IS TRUE))
          AND i.accepted_subtotal-i.source_discount_allocated>0),
      supplied AS (SELECT (a->>'source_item_id')::uuid source_item_id,sum((a->>'amount_halalah')::bigint)::bigint amount
        FROM jsonb_array_elements(p_units) u CROSS JOIN LATERAL jsonb_array_elements(u->'allocations') a GROUP BY 1)
      SELECT 1 FROM expected e FULL OUTER JOIN supplied a USING(source_item_id) WHERE coalesce(e.amount,0)<>coalesce(a.amount,0)) THEN
      held:='PERFORMANCE_UNIT_ALLOCATION_DOES_NOT_RECONCILE';
    ELSIF (SELECT coalesce(sum((a->>'amount_halalah')::bigint),0)::bigint FROM jsonb_array_elements(p_units) u
        CROSS JOIN LATERAL jsonb_array_elements(u->'allocations') a)<>amount THEN
      held:='PERFORMANCE_UNIT_ALLOCATION_DOES_NOT_RECONCILE';
    END IF;
  END IF;
  IF held IS NOT NULL THEN state:='HELD'; END IF;

  IF service_customer IS NULL THEN
    RETURN QUERY SELECT 'source_customer_missing'::text,NULL::uuid,NULL::integer,NULL::text,'SERVICE_CUSTOMER_LINEAGE_UNAVAILABLE'::text,amount::text,false;RETURN;
  END IF;
  units:=CASE WHEN state='PREPARED' THEN p_units ELSE '[]'::jsonb END;
  payload:=jsonb_build_object('abs_id',s.id,'abs_version',s.scope_version,'snapshot_sha256',snapshot_hash,'units',units,
    'principal_agent_basis',p_principal_agent_basis,'policy_version',p_policy_version,'modification_ref',p_modification_evidence_ref,
    'modification_sha256',p_modification_evidence_sha256,'held_code',held);
  SELECT f.entity_id,f.entity_version,v.status,v.held_code,v.consideration_halalah,f.payload_fingerprint
    INTO arr_id,vnum,replay_state,replay_held,replay_amount,replay_hash FROM public.accounting_foundation_events f
    JOIN public.accounting_revenue_arrangement_versions v ON v.profile_id=f.profile_id AND v.arrangement_id=f.entity_id AND v.version=f.entity_version
    WHERE f.profile_id=profile AND f.request_id=p_request_id AND f.entity_type='accounting_revenue_arrangement' LIMIT 1;
  IF FOUND THEN
    IF replay_hash IS DISTINCT FROM encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex') THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,amount::text,false;RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,arr_id,vnum,replay_state,replay_held,replay_amount::text,true;RETURN;
  END IF;

  SELECT * INTO arr FROM public.accounting_revenue_arrangements WHERE profile_id=profile AND approved_billing_scope_id=s.id FOR UPDATE;
  IF FOUND THEN
    IF arr.current_version<>p_expected_version THEN RETURN QUERY SELECT 'revision_conflict'::text,arr.id,arr.current_version,NULL::text,NULL::text,amount::text,false;RETURN;END IF;
    IF EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_events e WHERE e.profile_id=profile AND e.arrangement_id=arr.id) THEN
      RETURN QUERY SELECT 'source_identity_immutable'::text,arr.id,arr.current_version,NULL::text,NULL::text,amount::text,false;RETURN;END IF;
    arr_id:=arr.id;vnum:=arr.current_version+1;
  ELSE
    IF p_expected_version<>0 THEN RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,0,NULL::text,NULL::text,amount::text,false;RETURN;END IF;
    INSERT INTO public.accounting_revenue_arrangements(profile_id,service_id,customer_id,approved_billing_scope_id)
      VALUES(profile,p_service_id,coalesce(service_customer,'00000000-0000-4000-8000-000000000000'),s.id) RETURNING id INTO arr_id;
    vnum:=1;
  END IF;
  fid:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
    evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(fid,profile,CASE WHEN state='HELD' THEN 'accounting_revenue_arrangement_held' ELSE 'accounting_revenue_arrangement_prepared' END,
    'accounting_revenue_arrangement',arr_id,vnum,p_actor,p_request_id,btrim(p_reason),p_modification_evidence_ref,
    encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex'),'accounting_revenue_arrangements/'||arr_id::text||'/'||vnum::text,clock_timestamp());
  INSERT INTO public.accounting_revenue_arrangement_versions(profile_id,arrangement_id,version,previous_version,status,source_snapshot,source_snapshot_sha256,
    units_snapshot,consideration_halalah,source_approved_at,currency,principal_agent_basis,policy_version,supersedes_arrangement_id,
    modification_evidence_ref,modification_evidence_sha256,held_code,created_by,reason,foundation_event_id)
  VALUES(profile,arr_id,vnum,CASE WHEN vnum=1 THEN NULL ELSE vnum-1 END,state,snapshot,snapshot_hash,units,amount,s.approved_at,
    upper(s.source_currency),p_principal_agent_basis,p_policy_version,predecessor,p_modification_evidence_ref,p_modification_evidence_sha256,held,p_actor,btrim(p_reason),fid);
  UPDATE public.accounting_revenue_arrangements SET current_version=vnum WHERE profile_id=profile AND id=arr_id;
  IF state='PREPARED' THEN
    FOR u IN SELECT value FROM jsonb_array_elements(p_units) LOOP
      INSERT INTO public.accounting_revenue_performance_units(profile_id,arrangement_id,unit_key)
        VALUES(profile,arr_id,u->>'unit_key') ON CONFLICT(profile_id,arrangement_id,unit_key) DO NOTHING;
      SELECT id,current_version INTO unit_id,unit_version FROM public.accounting_revenue_performance_units
        WHERE profile_id=profile AND arrangement_id=arr_id AND unit_key=u->>'unit_key' FOR UPDATE;
      unit_version:=unit_version+1;
      INSERT INTO public.accounting_revenue_performance_unit_versions(profile_id,unit_id,arrangement_id,arrangement_version,version,
        promised_output,allocated_halalah,satisfaction_method,required_evidence_basis,source_allocations,created_by,foundation_event_id)
      VALUES(profile,unit_id,arr_id,vnum,unit_version,u->>'promised_output',
        (SELECT sum((a->>'amount_halalah')::bigint)::bigint FROM jsonb_array_elements(u->'allocations') a),
        u->>'satisfaction_method',u->>'required_evidence_basis',u->'allocations',p_actor,fid);
      UPDATE public.accounting_revenue_performance_units SET current_version=unit_version WHERE profile_id=profile AND id=unit_id;
    END LOOP;
  END IF;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES(CASE WHEN state='HELD' THEN 'hold' ELSE 'prepare' END,'accounting_revenue_arrangement',arr_id,p_actor::text,
      jsonb_build_object('version',vnum,'abs_id',s.id,'consideration_halalah',amount::text,'held_code',held,'request_id',p_request_id),clock_timestamp());
  RETURN QUERY SELECT NULL::text,arr_id,vnum,state,held,amount::text,false;
EXCEPTION WHEN unique_violation THEN
  RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,NULL::text,false;
WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,NULL::text,false;
END;$save_revenue_arrangement$;

CREATE FUNCTION public.review_accounting_revenue_arrangement(
  p_actor uuid,p_arrangement_id uuid,p_arrangement_version integer,p_approve boolean,p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,review_id uuid,decision text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $review_revenue_arrangement$
DECLARE profile uuid;v public.accounting_revenue_arrangement_versions%ROWTYPE;arr public.accounting_revenue_arrangements%ROWTYPE;
  scope_status text;scope_superseded timestamptz;scope_voided timestamptz;fid uuid;rid uuid;payload jsonb;decision_text text;replay record;
BEGIN
  IF p_actor IS NULL OR p_arrangement_id IS NULL OR p_arrangement_version<1 OR p_request_id IS NULL
     OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active) THEN RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  IF NOT public.get_accounting_capability(p_actor,'accounting:manage_revenue_recognition') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
  SELECT a.profile_id INTO profile FROM public.accounting_revenue_arrangements a WHERE a.id=p_arrangement_id;
  SELECT * INTO v FROM public.accounting_revenue_arrangement_versions WHERE profile_id=profile AND arrangement_id=p_arrangement_id AND version=p_arrangement_version;
  IF NOT FOUND THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  SELECT * INTO arr FROM public.accounting_revenue_arrangements WHERE profile_id=profile AND id=p_arrangement_id;
  IF NOT FOUND OR arr.current_version<>p_arrangement_version THEN RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  IF p_actor=v.created_by THEN RETURN QUERY SELECT 'independent_review_required'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  SELECT status,superseded_at,voided_at INTO scope_status,scope_superseded,scope_voided FROM public.approved_billing_scopes WHERE id=arr.approved_billing_scope_id;
  decision_text:=CASE WHEN p_approve AND v.status='PREPARED' AND scope_status='approved' AND scope_superseded IS NULL AND scope_voided IS NULL
     AND v.principal_agent_basis='PRINCIPAL' THEN 'APPROVED' ELSE 'HELD' END;
  payload:=jsonb_build_object('arrangement_id',p_arrangement_id,'version',p_arrangement_version,'approve',p_approve,'decision',decision_text,'reason',btrim(p_reason));
  SELECT f.entity_type,f.payload_fingerprint,r.id,r.decision INTO replay FROM public.accounting_foundation_events f
    LEFT JOIN public.accounting_revenue_arrangement_reviews r ON r.foundation_event_id=f.id
    WHERE f.profile_id=profile AND f.request_id=p_request_id;
  IF FOUND THEN
    IF replay.entity_type IS DISTINCT FROM 'accounting_revenue_arrangement'
       OR replay.payload_fingerprint IS DISTINCT FROM encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex')
       OR replay.id IS NULL THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
    RETURN QUERY SELECT NULL::text,replay.id,replay.decision,true;RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_revenue_arrangement_reviews WHERE profile_id=profile AND arrangement_id=p_arrangement_id AND arrangement_version=p_arrangement_version) THEN
    RETURN QUERY SELECT 'review_exists'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  fid:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,
    payload_fingerprint,result_reference,occurred_at)
  VALUES(fid,profile,'accounting_revenue_arrangement_reviewed','accounting_revenue_arrangement',p_arrangement_id,p_arrangement_version,p_actor,p_request_id,
    btrim(p_reason),encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex'),
    'accounting_revenue_arrangement_reviews/'||p_arrangement_id::text||'/'||p_arrangement_version::text,clock_timestamp());
  INSERT INTO public.accounting_revenue_arrangement_reviews(profile_id,arrangement_id,arrangement_version,decision,reviewer_user_id,reason,foundation_event_id)
    VALUES(profile,p_arrangement_id,p_arrangement_version,decision_text,p_actor,btrim(p_reason),fid) RETURNING id INTO rid;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES(CASE WHEN decision_text='APPROVED' THEN 'review' ELSE 'hold' END,'accounting_revenue_arrangement',p_arrangement_id,p_actor::text,
      jsonb_build_object('version',p_arrangement_version,'decision',decision_text,'request_id',p_request_id),clock_timestamp());
  RETURN QUERY SELECT NULL::text,rid,decision_text,false;
EXCEPTION WHEN unique_violation THEN RETURN QUERY SELECT 'review_exists'::text,NULL::uuid,NULL::text,false;
END;$review_revenue_arrangement$;

CREATE FUNCTION public.save_accounting_revenue_performance_evidence(
  p_actor uuid,p_unit_id uuid,p_evidence_key text,p_expected_version integer,p_evidence_basis text,p_performance_from date,p_performance_through date,
  p_evidence_ref text,p_evidence_sha256 text,p_recognized_to_date_halalah text,p_correction_of_recognition_event_id uuid,
  p_correction_amount_halalah text,p_rationale text,p_request_id uuid
) RETURNS TABLE(error_code text,evidence_id uuid,version integer,status text,held_code text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $save_revenue_evidence$
DECLARE profile uuid;unitrow public.accounting_revenue_performance_units%ROWTYPE;uv public.accounting_revenue_performance_unit_versions%ROWTYPE;
  arr public.accounting_revenue_arrangements%ROWTYPE;av public.accounting_revenue_arrangement_versions%ROWTYPE;reviewed text;
  ev public.accounting_revenue_performance_evidence%ROWTYPE;ev_id uuid;vnum integer;held text;state text:='SUBMITTED';fid uuid;payload jsonb;replay record;
  recognized_to_date bigint;correction_amount bigint;
BEGIN
  IF p_actor IS NULL OR p_unit_id IS NULL OR length(btrim(coalesce(p_evidence_key,''))) NOT BETWEEN 1 AND 160 OR p_expected_version IS NULL OR p_expected_version<0
    OR coalesce(p_evidence_basis,'') NOT IN ('CUSTOMER_ACCEPTANCE','TRANSFER_OF_CONTROL','MEASURED_OUTPUT') OR p_performance_from IS NULL OR p_performance_through IS NULL
    OR p_performance_from>p_performance_through OR length(btrim(coalesce(p_evidence_ref,''))) NOT BETWEEN 1 AND 2000
    OR p_evidence_sha256 IS NULL OR p_evidence_sha256 !~ '^[0-9a-f]{64}$' OR length(btrim(coalesce(p_rationale,''))) NOT BETWEEN 1 AND 2000 OR p_request_id IS NULL
    OR (p_recognized_to_date_halalah IS NOT NULL AND p_recognized_to_date_halalah !~ '^(0|[1-9][0-9]*)$')
    OR (p_correction_amount_halalah IS NOT NULL AND p_correction_amount_halalah !~ '^[1-9][0-9]*$')
    OR ((p_correction_of_recognition_event_id IS NULL)<>(p_correction_amount_halalah IS NULL))
    OR (p_correction_of_recognition_event_id IS NULL AND p_recognized_to_date_halalah IS NULL)
    OR (p_correction_of_recognition_event_id IS NOT NULL AND (p_correction_amount_halalah IS NULL OR p_recognized_to_date_halalah IS NOT NULL)) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,false;RETURN;END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active) THEN RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,false;RETURN;END IF;
  IF NOT public.get_accounting_capability(p_actor,'accounting:manage_revenue_recognition') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
  recognized_to_date:=CASE WHEN p_recognized_to_date_halalah IS NULL THEN NULL ELSE p_recognized_to_date_halalah::bigint END;
  correction_amount:=CASE WHEN p_correction_amount_halalah IS NULL THEN NULL ELSE p_correction_amount_halalah::bigint END;
  SELECT * INTO unitrow FROM public.accounting_revenue_performance_units WHERE id=p_unit_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,false;RETURN;END IF;
  profile:=unitrow.profile_id;arr.id:=unitrow.arrangement_id;arr.profile_id:=profile;
  SELECT a.* INTO arr FROM public.accounting_revenue_arrangements a WHERE a.profile_id=profile AND a.id=unitrow.arrangement_id;
  SELECT * INTO av FROM public.accounting_revenue_arrangement_versions WHERE profile_id=profile AND arrangement_id=arr.id AND version=arr.current_version;
  SELECT decision INTO reviewed FROM public.accounting_revenue_arrangement_reviews WHERE profile_id=profile AND arrangement_id=arr.id AND arrangement_version=arr.current_version;
  IF reviewed IS DISTINCT FROM 'APPROVED' THEN RETURN QUERY SELECT 'arrangement_not_approved'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,false;RETURN;END IF;
  SELECT * INTO uv FROM public.accounting_revenue_performance_unit_versions WHERE profile_id=profile AND unit_id=p_unit_id AND version=unitrow.current_version;
  IF uv.arrangement_version<>arr.current_version OR p_evidence_basis<>uv.required_evidence_basis THEN held:='EVIDENCE_BASIS_UNSUPPORTED';END IF;
  IF uv.satisfaction_method='OVER_TIME' AND p_evidence_basis NOT IN ('MEASURED_OUTPUT','CUSTOMER_ACCEPTANCE') THEN held:=coalesce(held,'UNSUPPORTED_PROGRESS_MEASURE');END IF;
  IF uv.satisfaction_method='POINT_IN_TIME' AND p_correction_of_recognition_event_id IS NULL
     AND recognized_to_date IS DISTINCT FROM uv.allocated_halalah THEN held:=coalesce(held,'POINT_IN_TIME_TRANSFER_AMOUNT_MISMATCH');END IF;
  IF p_correction_of_recognition_event_id IS NOT NULL THEN
    IF p_evidence_ref IS NULL OR p_evidence_sha256 IS NULL OR length(btrim(coalesce(p_rationale,'')))=0 THEN held:='REVENUE_CORRECTION_EVIDENCE_REQUIRED';
    ELSIF NOT EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_events r JOIN public.accounting_revenue_recognition_journal_links l
        ON l.profile_id=r.profile_id AND l.recognition_event_id=r.id JOIN public.accounting_source_effects se
        ON se.profile_id=l.profile_id AND se.id=l.source_effect_id AND se.status='POSTED'
        WHERE r.profile_id=profile AND r.id=p_correction_of_recognition_event_id AND r.signed_delta_halalah>0 AND r.unit_id=p_unit_id) THEN
      held:=coalesce(held,'REVENUE_CORRECTION_LINEAGE_INVALID');
    END IF;
  ELSIF recognized_to_date IS NULL OR recognized_to_date<=0 OR recognized_to_date>uv.allocated_halalah THEN
    held:=coalesce(held,'RECOGNITION_AMOUNT_OUTSIDE_UNIT_CEILING');
  END IF;
  IF held IS NOT NULL THEN state:='HELD'; END IF;
  payload:=jsonb_build_object('unit_id',p_unit_id,'arrangement_id',arr.id,'arrangement_version',arr.current_version,'evidence_key',btrim(p_evidence_key),
    'basis',p_evidence_basis,'performance_from',p_performance_from,'performance_through',p_performance_through,'evidence_ref',btrim(p_evidence_ref),
    'evidence_sha256',lower(p_evidence_sha256),'recognized_to_date_halalah',recognized_to_date::text,'correction_of',p_correction_of_recognition_event_id,
    'correction_amount_halalah',correction_amount::text,'held_code',held,'rationale',btrim(p_rationale));
  SELECT f.entity_type,f.payload_fingerprint,v.evidence_id,v.version,v.status,v.held_code INTO replay
    FROM public.accounting_foundation_events f LEFT JOIN public.accounting_revenue_performance_evidence_versions v
      ON v.profile_id=f.profile_id AND v.evidence_id=f.entity_id AND v.version=f.entity_version
    WHERE f.profile_id=profile AND f.request_id=p_request_id;
  IF FOUND THEN
    IF replay.entity_type IS DISTINCT FROM 'accounting_revenue_performance_evidence'
       OR replay.payload_fingerprint IS DISTINCT FROM encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex')
       OR replay.evidence_id IS NULL THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,false;RETURN;END IF;
    RETURN QUERY SELECT NULL::text,replay.evidence_id,replay.version,replay.status,replay.held_code,true;RETURN;
  END IF;
  SELECT * INTO ev FROM public.accounting_revenue_performance_evidence WHERE profile_id=profile AND unit_id=p_unit_id AND evidence_key=p_evidence_key FOR UPDATE;
  IF FOUND THEN
    IF ev.current_version<>p_expected_version THEN RETURN QUERY SELECT 'revision_conflict'::text,ev.id,ev.current_version,NULL::text,NULL::text,false;RETURN;END IF;
    IF EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_events e WHERE e.profile_id=profile AND e.evidence_id=ev.id) THEN
      RETURN QUERY SELECT 'source_identity_immutable'::text,ev.id,ev.current_version,NULL::text,NULL::text,false;RETURN;END IF;
    ev_id:=ev.id;vnum:=ev.current_version+1;
  ELSE
    IF p_expected_version<>0 THEN RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,0,NULL::text,NULL::text,false;RETURN;END IF;
    INSERT INTO public.accounting_revenue_performance_evidence(profile_id,arrangement_id,unit_id,evidence_key)
      VALUES(profile,arr.id,p_unit_id,btrim(p_evidence_key)) RETURNING id INTO ev_id;vnum:=1;
  END IF;
  fid:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,
    payload_fingerprint,result_reference,occurred_at)
  VALUES(fid,profile,CASE WHEN held IS NULL THEN 'accounting_revenue_evidence_submitted' ELSE 'accounting_revenue_correction_held' END,
    'accounting_revenue_performance_evidence',ev_id,vnum,p_actor,p_request_id,btrim(p_rationale),p_evidence_ref,
    encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex'),'accounting_revenue_performance_evidence/'||ev_id::text||'/'||vnum::text,clock_timestamp());
  INSERT INTO public.accounting_revenue_performance_evidence_versions(profile_id,evidence_id,unit_id,arrangement_id,arrangement_version,version,previous_version,
    status,evidence_basis,performance_from,performance_through,evidence_ref,evidence_sha256,recognized_to_date_halalah,correction_amount_halalah,
    correction_of_recognition_event_id,held_code,rationale,created_by,foundation_event_id)
  VALUES(profile,ev_id,p_unit_id,arr.id,arr.current_version,vnum,CASE WHEN vnum=1 THEN NULL ELSE vnum-1 END,state,p_evidence_basis,
    p_performance_from,p_performance_through,btrim(p_evidence_ref),lower(p_evidence_sha256),recognized_to_date,correction_amount,
    p_correction_of_recognition_event_id,held,btrim(p_rationale),p_actor,fid);
  UPDATE public.accounting_revenue_performance_evidence SET current_version=vnum WHERE profile_id=profile AND id=ev_id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES(CASE WHEN held IS NULL THEN 'submit' ELSE 'correction_hold' END,'accounting_revenue_performance_evidence',ev_id,p_actor::text,
      jsonb_build_object('version',vnum,'status',state,'held_code',held,'unit_id',p_unit_id,'request_id',p_request_id),clock_timestamp());
  RETURN QUERY SELECT NULL::text,ev_id,vnum,state,held,false;
EXCEPTION WHEN unique_violation THEN RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,false;
WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,NULL::text,false;
END;$save_revenue_evidence$;

CREATE FUNCTION public.review_accounting_revenue_performance_evidence(
  p_actor uuid,p_evidence_id uuid,p_evidence_version integer,p_approve boolean,p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,review_id uuid,decision text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $review_revenue_evidence$
DECLARE profile uuid;v public.accounting_revenue_performance_evidence_versions%ROWTYPE;ev public.accounting_revenue_performance_evidence%ROWTYPE;
  reviewer text;fid uuid;rid uuid;decision_text text;payload jsonb;replay record;
BEGIN
  IF p_actor IS NULL OR p_evidence_id IS NULL OR p_evidence_version<1 OR p_request_id IS NULL
    OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000 THEN RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active) THEN RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  IF NOT public.get_accounting_capability(p_actor,'accounting:manage_revenue_recognition') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
  SELECT e.profile_id INTO profile FROM public.accounting_revenue_performance_evidence e WHERE e.id=p_evidence_id;
  SELECT * INTO ev FROM public.accounting_revenue_performance_evidence WHERE profile_id=profile AND id=p_evidence_id;
  SELECT * INTO v FROM public.accounting_revenue_performance_evidence_versions WHERE profile_id=profile AND evidence_id=p_evidence_id AND version=p_evidence_version;
  IF NOT FOUND OR ev.current_version<>p_evidence_version THEN RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  IF p_actor=v.created_by THEN RETURN QUERY SELECT 'independent_review_required'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  decision_text:=CASE WHEN p_approve AND v.status='SUBMITTED' AND v.held_code IS NULL THEN 'APPROVED' ELSE 'HELD' END;
  payload:=jsonb_build_object('evidence_id',p_evidence_id,'version',p_evidence_version,'approve',p_approve,'decision',decision_text,'reason',btrim(p_reason));
  SELECT f.entity_type,f.payload_fingerprint,r.id,r.decision INTO replay FROM public.accounting_foundation_events f
    LEFT JOIN public.accounting_revenue_performance_evidence_reviews r ON r.foundation_event_id=f.id
    WHERE f.profile_id=profile AND f.request_id=p_request_id;
  IF FOUND THEN
    IF replay.entity_type IS DISTINCT FROM 'accounting_revenue_performance_evidence'
       OR replay.payload_fingerprint IS DISTINCT FROM encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex')
       OR replay.id IS NULL THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
    RETURN QUERY SELECT NULL::text,replay.id,replay.decision,true;RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_revenue_performance_evidence_reviews WHERE profile_id=profile AND evidence_id=p_evidence_id AND evidence_version=p_evidence_version) THEN
    RETURN QUERY SELECT 'review_exists'::text,NULL::uuid,NULL::text,false;RETURN;END IF;
  fid:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,
    payload_fingerprint,result_reference,occurred_at)
  VALUES(fid,profile,'accounting_revenue_evidence_reviewed','accounting_revenue_performance_evidence',p_evidence_id,p_evidence_version,p_actor,p_request_id,
    btrim(p_reason),v.evidence_ref,encode(extensions.digest(convert_to(payload::text,'UTF8'),'sha256'),'hex'),
    'accounting_revenue_performance_evidence_reviews/'||p_evidence_id::text||'/'||p_evidence_version::text,clock_timestamp());
  INSERT INTO public.accounting_revenue_performance_evidence_reviews(profile_id,evidence_id,evidence_version,decision,reviewer_user_id,reason,foundation_event_id)
    VALUES(profile,p_evidence_id,p_evidence_version,decision_text,p_actor,btrim(p_reason),fid) RETURNING id INTO rid;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES(CASE WHEN decision_text='APPROVED' THEN 'approve' ELSE 'hold' END,'accounting_revenue_performance_evidence',p_evidence_id,p_actor::text,
      jsonb_build_object('version',p_evidence_version,'decision',decision_text,'request_id',p_request_id),clock_timestamp());
  RETURN QUERY SELECT NULL::text,rid,decision_text,false;
EXCEPTION WHEN unique_violation THEN RETURN QUERY SELECT 'review_exists'::text,NULL::uuid,NULL::text,false;
END;$review_revenue_evidence$;

CREATE FUNCTION public.prepare_accounting_revenue_recognition(
  p_actor uuid,p_evidence_id uuid,p_evidence_version integer,p_period_id uuid,p_period_version integer,
  p_posting_rule_id uuid,p_rule_version integer,p_accounting_date date,p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions AS $prepare_revenue_recognition$
DECLARE profile uuid;ev public.accounting_revenue_performance_evidence%ROWTYPE;evv public.accounting_revenue_performance_evidence_versions%ROWTYPE;
  unitrow public.accounting_revenue_performance_units%ROWTYPE;uv public.accounting_revenue_performance_unit_versions%ROWTYPE;
  arr public.accounting_revenue_arrangements%ROWTYPE;av public.accounting_revenue_arrangement_versions%ROWTYPE;ar_review text;ev_review text;
  source_scope public.approved_billing_scopes%ROWTYPE;prior bigint:=0;arr_prior bigint:=0;delta bigint;liability bigint:=0;pending_liability bigint:=0;
  liab_part bigint:=0;asset_part bigint:=0;correction_liab bigint:=0;correction_asset bigint:=0;original_liab bigint:=0;original_asset bigint:=0;
  lines jsonb:='[]'::jsonb;source_key text;economic_key text;snapshot jsonb;fp text;event_id uuid;fid uuid;result record;existing record;payload jsonb;
BEGIN
  IF p_actor IS NULL OR p_evidence_id IS NULL OR p_evidence_version IS NULL OR p_evidence_version<1 OR p_period_id IS NULL
     OR p_period_version IS NULL OR p_posting_rule_id IS NULL OR p_rule_version IS NULL OR p_accounting_date IS NULL OR p_request_id IS NULL
     OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active) THEN RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  IF NOT public.get_accounting_capability(p_actor,'accounting:manage_revenue_recognition') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
  SELECT e.profile_id INTO profile FROM public.accounting_revenue_performance_evidence e WHERE e.id=p_evidence_id;
  IF profile IS NULL THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10f-revenue:'||profile::text||':'||p_evidence_id::text,0));
  SELECT * INTO ev FROM public.accounting_revenue_performance_evidence WHERE profile_id=profile AND id=p_evidence_id FOR UPDATE;
  SELECT * INTO evv FROM public.accounting_revenue_performance_evidence_versions WHERE profile_id=profile AND evidence_id=p_evidence_id AND version=p_evidence_version;
  IF NOT FOUND OR ev.current_version<>p_evidence_version THEN RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  SELECT * INTO existing FROM public.accounting_revenue_recognition_events WHERE profile_id=profile AND evidence_id=p_evidence_id AND evidence_version=p_evidence_version;
  IF FOUND THEN
    IF existing.accounting_date IS DISTINCT FROM p_accounting_date THEN RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
    SELECT j.journal_id,j.version,j.status INTO existing FROM public.accounting_revenue_recognition_journal_links l
      JOIN public.accounting_journal_versions j ON j.profile_id=l.profile_id AND j.journal_id=l.journal_id AND j.version=(SELECT current_version FROM public.accounting_journals WHERE profile_id=l.profile_id AND id=l.journal_id)
      WHERE l.profile_id=profile AND l.recognition_event_id=(SELECT id FROM public.accounting_revenue_recognition_events WHERE profile_id=profile AND evidence_id=p_evidence_id AND evidence_version=p_evidence_version);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_REVENUE_RECOGNITION_JOURNAL_LINK_MISSING';END IF;
    RETURN QUERY SELECT NULL::text,existing.journal_id,existing.version,existing.status,true;RETURN;
  END IF;
  IF p_accounting_date<evv.performance_through THEN
    RETURN QUERY SELECT 'recognition_before_performance'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;
  END IF;
  IF evv.status<>'SUBMITTED' OR evv.held_code IS NOT NULL THEN RETURN QUERY SELECT 'unsupported_evidence'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_revenue_performance_evidence_reviews r WHERE r.profile_id=profile AND r.evidence_id=p_evidence_id
      AND r.evidence_version=p_evidence_version AND r.decision='APPROVED') THEN RETURN QUERY SELECT 'evidence_not_approved'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  SELECT * INTO unitrow FROM public.accounting_revenue_performance_units WHERE profile_id=profile AND id=ev.unit_id;
  SELECT * INTO uv FROM public.accounting_revenue_performance_unit_versions WHERE profile_id=profile AND unit_id=unitrow.id AND version=unitrow.current_version;
  SELECT * INTO arr FROM public.accounting_revenue_arrangements WHERE profile_id=profile AND id=ev.arrangement_id;
  SELECT * INTO av FROM public.accounting_revenue_arrangement_versions WHERE profile_id=profile AND arrangement_id=arr.id AND version=evv.arrangement_version;
  SELECT decision INTO ar_review FROM public.accounting_revenue_arrangement_reviews WHERE profile_id=profile AND arrangement_id=arr.id AND arrangement_version=evv.arrangement_version;
  SELECT decision INTO ev_review FROM public.accounting_revenue_performance_evidence_reviews WHERE profile_id=profile AND evidence_id=ev.id AND evidence_version=evv.version;
  IF ar_review IS DISTINCT FROM 'APPROVED' OR ev_review IS DISTINCT FROM 'APPROVED' OR av.status<>'PREPARED'
     OR av.principal_agent_basis<>'PRINCIPAL' OR arr.current_version<>evv.arrangement_version OR unitrow.arrangement_id<>arr.id THEN
    RETURN QUERY SELECT 'unsupported_evidence'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  SELECT * INTO source_scope FROM public.approved_billing_scopes WHERE id=arr.approved_billing_scope_id;
  IF source_scope.status<>'approved' OR source_scope.approved_at IS DISTINCT FROM av.source_approved_at
     OR source_scope.superseded_at IS NOT NULL OR source_scope.voided_at IS NOT NULL THEN
    RETURN QUERY SELECT 'stale_commercial_authority'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_inception_coverage c JOIN public.accounting_inception_coverage_versions cv
      ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id AND cv.version=c.current_version
    WHERE c.profile_id=profile AND c.source_domain='REVENUE_RECOGNITION'
      AND (c.source_record_key='ABS/'||arr.approved_billing_scope_id::text OR c.source_record_key='SERVICE/'||arr.service_id::text
        OR c.economic_event_key='ABS/'||arr.approved_billing_scope_id::text||'/REVENUE')
      AND cv.classification IN ('OPENING_BALANCE','RECONSTRUCTED_HISTORY','UNRESOLVED')) THEN
    RETURN QUERY SELECT 'duplicate_coverage'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10f-service:'||profile::text||':'||arr.service_id::text,0));
  IF evv.correction_of_recognition_event_id IS NULL THEN
    IF uv.satisfaction_method='POINT_IN_TIME' AND evv.recognized_to_date_halalah<>uv.allocated_halalah THEN
      RETURN QUERY SELECT 'point_in_time_evidence_incomplete'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
     WITH RECURSIVE arrangement_lineage(arrangement_id,parent_arrangement_id,depth) AS (
       SELECT arr.id,av.supersedes_arrangement_id,0
       UNION ALL
       SELECT parent_arr.id,parent_version.supersedes_arrangement_id,lineage.depth+1
       FROM arrangement_lineage lineage
       JOIN public.accounting_revenue_arrangements parent_arr
         ON parent_arr.profile_id=profile AND parent_arr.id=lineage.parent_arrangement_id
       JOIN LATERAL (SELECT v.supersedes_arrangement_id
         FROM public.accounting_revenue_arrangement_versions v
         WHERE v.profile_id=profile AND v.arrangement_id=parent_arr.id
         ORDER BY v.version DESC LIMIT 1) parent_version ON true
       WHERE lineage.parent_arrangement_id IS NOT NULL AND lineage.depth<100
     )
     SELECT coalesce(sum(e.signed_delta_halalah) FILTER(WHERE lineage_unit.unit_key=unitrow.unit_key),0)::bigint,
       coalesce(sum(e.signed_delta_halalah),0)::bigint INTO prior,arr_prior
     FROM arrangement_lineage lineage
     JOIN public.accounting_revenue_recognition_events e
       ON e.profile_id=profile AND e.arrangement_id=lineage.arrangement_id
     JOIN public.accounting_revenue_performance_units lineage_unit
       ON lineage_unit.profile_id=e.profile_id AND lineage_unit.arrangement_id=e.arrangement_id AND lineage_unit.id=e.unit_id
     JOIN public.accounting_revenue_recognition_journal_links l
       ON l.profile_id=e.profile_id AND l.recognition_event_id=e.id
     JOIN public.accounting_source_effects se
       ON se.profile_id=l.profile_id AND se.id=l.source_effect_id AND se.status IN ('PREPARED','POSTED');
    IF evv.recognized_to_date_halalah<prior THEN RETURN QUERY SELECT 'negative_delta_requires_correction'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
    delta:=evv.recognized_to_date_halalah-prior;
    IF delta=0 THEN RETURN QUERY SELECT 'no_new_recognition_delta'::text,NULL::uuid,NULL::integer,NULL::text,true;RETURN;END IF;
    IF evv.recognized_to_date_halalah>uv.allocated_halalah THEN RETURN QUERY SELECT 'recognition_ceiling_exceeded'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
    IF arr_prior+delta>av.consideration_halalah THEN RETURN QUERY SELECT 'recognition_ceiling_exceeded'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
    SELECT coalesce(sum(CASE WHEN jl.side='CREDIT' THEN jl.amount_halalah ELSE -jl.amount_halalah END),0)::bigint INTO liability
      FROM public.accounting_journal_line_versions jl JOIN public.accounting_journal_versions jv
        ON jv.profile_id=jl.profile_id AND jv.journal_id=jl.journal_id AND jv.version=jl.journal_version
      JOIN public.accounting_account_versions ac ON ac.profile_id=jl.profile_id AND ac.account_id=jl.account_id AND ac.version=jl.account_version
      WHERE jl.profile_id=profile AND jl.service_id=arr.service_id AND ac.control_classification='CONTRACT_LIABILITY'
        AND jv.status='POSTED' AND jv.accounting_date<=p_accounting_date AND jv.posted_at<=clock_timestamp();
    SELECT coalesce(sum((ln->>'amount_halalah')::bigint),0)::bigint INTO pending_liability
      FROM public.accounting_revenue_recognition_events e JOIN public.accounting_revenue_recognition_journal_links l
        ON l.profile_id=e.profile_id AND l.recognition_event_id=e.id JOIN public.accounting_source_effects se
        ON se.profile_id=l.profile_id AND se.id=l.source_effect_id AND se.status='PREPARED'
      CROSS JOIN LATERAL jsonb_array_elements(e.expected_lines) ln
      WHERE e.profile_id=profile AND e.service_id=arr.service_id AND ln->>'mapping_key'='CONTRACT_LIABILITY' AND ln->>'side'='DEBIT';
    liab_part:=least(delta,greatest(liability-pending_liability,0));asset_part:=delta-liab_part;
    IF liab_part>0 THEN lines:=lines||jsonb_build_array(jsonb_build_object('mapping_key','CONTRACT_LIABILITY','party_role','CONTRACT_LIABILITY','side','DEBIT','amount_halalah',liab_part::text));END IF;
    IF asset_part>0 THEN lines:=lines||jsonb_build_array(jsonb_build_object('mapping_key','CONTRACT_ASSET','party_role','CONTRACT_ASSET','side','DEBIT','amount_halalah',asset_part::text));END IF;
    lines:=lines||jsonb_build_array(jsonb_build_object('mapping_key','REVENUE','party_role','REVENUE','side','CREDIT','amount_halalah',delta::text));
  ELSE
    SELECT r.* INTO existing FROM public.accounting_revenue_recognition_events r WHERE r.profile_id=profile AND r.id=evv.correction_of_recognition_event_id
      AND r.unit_id=unitrow.id AND r.signed_delta_halalah>0 FOR SHARE;
    IF NOT FOUND OR evv.correction_amount_halalah IS NULL OR evv.correction_amount_halalah<=0 THEN
      RETURN QUERY SELECT 'revenue_correction_lineage_invalid'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
    SELECT coalesce(sum(l.amount_halalah) FILTER(WHERE l.party_role='CONTRACT_LIABILITY' AND l.side='DEBIT'),0)::bigint,
      coalesce(sum(l.amount_halalah) FILTER(WHERE l.party_role='CONTRACT_ASSET' AND l.side='DEBIT'),0)::bigint
      INTO original_liab,original_asset FROM public.accounting_revenue_recognition_journal_lines l
      WHERE l.profile_id=profile AND l.recognition_event_id=existing.id;
    SELECT coalesce(sum((x->>'amount_halalah')::bigint) FILTER(WHERE x->>'mapping_key'='CONTRACT_LIABILITY'),0)::bigint,
      coalesce(sum((x->>'amount_halalah')::bigint) FILTER(WHERE x->>'mapping_key'='CONTRACT_ASSET'),0)::bigint
      INTO correction_liab,correction_asset FROM public.accounting_revenue_recognition_events c
      JOIN public.accounting_revenue_recognition_journal_links l ON l.profile_id=c.profile_id AND l.recognition_event_id=c.id
      JOIN public.accounting_source_effects se ON se.profile_id=l.profile_id AND se.id=l.source_effect_id AND se.status IN ('PREPARED','POSTED')
      CROSS JOIN LATERAL jsonb_array_elements(c.expected_lines) x
      WHERE c.profile_id=profile AND c.correction_of_recognition_event_id=existing.id AND c.signed_delta_halalah<0
        AND x->>'side'='CREDIT' AND x->>'mapping_key' IN ('CONTRACT_LIABILITY','CONTRACT_ASSET');
    delta:=evv.correction_amount_halalah;
    IF delta>existing.signed_delta_halalah-correction_liab-correction_asset OR delta>original_liab+original_asset-correction_liab-correction_asset THEN
      RETURN QUERY SELECT 'revenue_correction_ceiling_exceeded'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
    liab_part:=least(delta,greatest(original_liab-correction_liab,0));asset_part:=delta-liab_part;
    IF asset_part>greatest(original_asset-correction_asset,0) THEN RETURN QUERY SELECT 'revenue_correction_ceiling_exceeded'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
    delta:=-delta;
    lines:=jsonb_build_array(jsonb_build_object('mapping_key','REVENUE','party_role','REVENUE','side','DEBIT','amount_halalah',abs(delta)::text));
    IF liab_part>0 THEN lines:=lines||jsonb_build_array(jsonb_build_object('mapping_key','CONTRACT_LIABILITY','party_role','CONTRACT_LIABILITY','side','CREDIT','amount_halalah',liab_part::text));END IF;
    IF asset_part>0 THEN lines:=lines||jsonb_build_array(jsonb_build_object('mapping_key','CONTRACT_ASSET','party_role','CONTRACT_ASSET','side','CREDIT','amount_halalah',asset_part::text));END IF;
  END IF;

  source_key:='ABS/'||arr.approved_billing_scope_id::text;
  economic_key:='REVENUE_EVIDENCE/'||ev.id::text||'/V'||evv.version::text;
  snapshot:=jsonb_build_object('arrangement_id',arr.id,'arrangement_version',av.version,'abs_id',arr.approved_billing_scope_id,
    'abs_snapshot_sha256',av.source_snapshot_sha256,'unit_id',unitrow.id,'unit_version',uv.version,'evidence_id',ev.id,'evidence_version',evv.version,
    'evidence_basis',evv.evidence_basis,'evidence_ref',evv.evidence_ref,'evidence_sha256',evv.evidence_sha256,
    'performance_from',evv.performance_from,'performance_through',evv.performance_through,'signed_delta_halalah',delta::text,
    'correction_of_recognition_event_id',evv.correction_of_recognition_event_id,'correction_amount_halalah',evv.correction_amount_halalah::text);
  fp:=encode(extensions.digest(convert_to(snapshot::text,'UTF8'),'sha256'),'hex');
  SELECT id INTO event_id FROM public.accounting_revenue_recognition_events WHERE profile_id=profile
    AND source_record_key=source_key AND economic_event_key=economic_key;
  IF event_id IS NOT NULL THEN RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  event_id:=gen_random_uuid();
  fid:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,
    payload_fingerprint,result_reference,occurred_at)
  VALUES(fid,profile,'accounting_revenue_recognition_prepared','accounting_revenue_recognition_event',event_id,1,p_actor,p_request_id,btrim(p_reason),evv.evidence_ref,
    encode(extensions.digest(convert_to(jsonb_build_object('snapshot',snapshot,'lines',lines,'accounting_date',p_accounting_date)::text,'UTF8'),'sha256'),'hex'),
    'accounting_revenue_recognition_events/'||economic_key,clock_timestamp());
  INSERT INTO public.accounting_revenue_recognition_events(id,profile_id,arrangement_id,arrangement_version,unit_id,evidence_id,evidence_version,
    correction_of_recognition_event_id,service_id,customer_id,source_record_key,economic_event_key,signed_delta_halalah,accounting_date,performance_from,
    performance_through,source_snapshot,source_snapshot_sha256,expected_lines,prepared_by,reason,foundation_event_id)
  VALUES(event_id,profile,arr.id,av.version,unitrow.id,ev.id,evv.version,evv.correction_of_recognition_event_id,arr.service_id,arr.customer_id,
    source_key,economic_key,delta,p_accounting_date,evv.performance_from,evv.performance_through,snapshot,fp,lines,p_actor,btrim(p_reason),fid)
  RETURNING id INTO event_id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES('prepare','accounting_revenue_recognition_event',event_id,p_actor::text,jsonb_build_object('evidence_id',ev.id,'version',evv.version,
      'signed_delta_halalah',delta::text,'accounting_date',p_accounting_date,'request_id',p_request_id),clock_timestamp());
  payload:=jsonb_build_object('source_domain','REVENUE_RECOGNITION','accounting_date',p_accounting_date,'period_id',p_period_id,
    'period_version',p_period_version,'posting_rule_id',p_posting_rule_id,'rule_version',p_rule_version,'source_record_key',source_key,
    'economic_event_key',economic_key,'posting_purpose','revenue_recognition','description_en','Revenue recognition evidence '||ev.id::text,
    'description_ar','إثبات الاعتراف بالإيراد '||ev.id::text,'lines',coalesce((SELECT jsonb_agg(jsonb_build_object('mapping_key',ln->>'mapping_key',
      'side',ln->>'side','amount_halalah',ln->>'amount_halalah','service_id',arr.service_id,'description_en','Revenue recognition','description_ar','الاعتراف بالإيراد') ORDER BY n)
      FROM jsonb_array_elements(lines) WITH ORDINALITY q(ln,n)),'[]'::jsonb));
  SELECT * INTO result FROM public.prepare_accounting_journal(p_actor,NULL,0,payload,btrim(p_reason),evv.evidence_ref,p_request_id);
  IF result.error_code IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_REVENUE_RECOGNITION_PREPARE_FAILED:'||result.error_code;END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_journal_links l WHERE l.profile_id=profile
      AND l.recognition_event_id=event_id AND l.journal_id=result.journal_id) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_REVENUE_RECOGNITION_JOURNAL_LINK_MISSING';END IF;
  RETURN QUERY SELECT NULL::text,result.journal_id,result.version,result.status,result.idempotent_replay;
EXCEPTION WHEN unique_violation THEN RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false;
WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false;
END;$prepare_revenue_recognition$;

CREATE FUNCTION public.post_accounting_revenue_recognition_journal(p_actor uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid)
RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $post_revenue_recognition$
DECLARE profile uuid;header public.accounting_journal_versions%ROWTYPE;prepared integer;result record;
BEGIN
  IF p_actor IS NULL OR p_journal_id IS NULL OR p_expected_version IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active) THEN RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  IF NOT public.get_accounting_capability(p_actor,'accounting:manage_revenue_recognition') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
  SELECT profile_id INTO profile FROM public.accounting_journals WHERE id=p_journal_id;
  SELECT j.* INTO header FROM public.accounting_journal_versions j JOIN public.accounting_journals h
    ON h.profile_id=j.profile_id AND h.id=j.journal_id AND h.current_version=j.version WHERE j.profile_id=profile AND j.journal_id=p_journal_id;
  IF NOT FOUND OR header.source_domain<>'REVENUE_RECOGNITION' THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  SELECT prepared_version INTO prepared FROM public.accounting_revenue_recognition_journal_links WHERE profile_id=profile AND journal_id=p_journal_id;
  IF NOT FOUND OR NOT public.accounting_revenue_recognition_journal_link_authorized(profile,p_journal_id,prepared,header.prepared_by) THEN
    RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false;RETURN;END IF;
  SELECT * INTO result FROM public.post_accounting_journal(p_actor,p_journal_id,p_expected_version,p_request_id);
  RETURN QUERY SELECT result.error_code,result.journal_id,result.version,result.status,result.idempotent_replay;
END;$post_revenue_recognition$;

CREATE FUNCTION public.get_accounting_revenue_recognition_reconciliation(
  p_actor uuid,p_as_of date,p_cutoff timestamptz,p_limit integer DEFAULT 200
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $reconcile_revenue$
DECLARE profile uuid;arrangements jsonb;held_evidence jsonb;recognition_events jsonb;contracts jsonb;contract_diff_count integer;credits_count integer;
  coverage_count integer;timing_count integer;revenue bigint;asset bigint;liability bigint;consideration bigint;
  allocated bigint;recognized bigint;arrangement_count integer;held_evidence_count integer;recognition_event_count integer;
  stale_count integer;customer_diff_count integer;
  state text:='READY';
BEGIN
  IF p_actor IS NULL OR p_as_of IS NULL OR p_cutoff IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'ACCOUNTING_REVENUE_RECONCILIATION_INVALID_INPUT';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users WHERE id=p_actor AND is_active)
     OR NOT (public.get_accounting_capability(p_actor,'accounting:view') OR public.get_accounting_capability(p_actor,'accounting:manage_revenue_recognition')) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';END IF;
  SELECT id INTO profile FROM public.accounting_profiles WHERE singleton_key='g7';
  IF profile IS NULL THEN RETURN jsonb_build_object('state','NOT_INITIALIZED','bank_reconciled',false);END IF;
  WITH ranked AS (
    SELECT v.*,a.service_id,a.customer_id,a.approved_billing_scope_id,
      row_number() OVER(PARTITION BY a.id ORDER BY v.version DESC) rn
    FROM public.accounting_revenue_arrangement_versions v JOIN public.accounting_revenue_arrangements a
      ON a.profile_id=v.profile_id AND a.id=v.arrangement_id
    WHERE v.profile_id=profile AND v.created_at<=p_cutoff AND v.source_approved_at<=p_cutoff
  ), visible AS (SELECT *,row_number() OVER(ORDER BY arrangement_id)::integer display_number FROM ranked WHERE rn=1),
  event_totals AS (
    SELECT e.arrangement_id,sum(e.signed_delta_halalah)::bigint recognized_to_date,
      count(*) FILTER(WHERE jv.accounting_date IS DISTINCT FROM e.performance_through)::integer timing_differences
    FROM public.accounting_revenue_recognition_events e JOIN public.accounting_revenue_recognition_journal_links l
      ON l.profile_id=e.profile_id AND l.recognition_event_id=e.id
    JOIN public.accounting_source_effects se ON se.profile_id=l.profile_id AND se.id=l.source_effect_id AND se.status='POSTED'
    JOIN public.accounting_journals j ON j.profile_id=l.profile_id AND j.id=l.journal_id
    JOIN public.accounting_journal_versions jv ON jv.profile_id=j.profile_id AND jv.journal_id=j.id AND jv.version=j.current_version
    WHERE e.profile_id=profile AND e.created_at<=p_cutoff AND e.accounting_date<=p_as_of AND jv.status='POSTED' AND jv.posted_at<=p_cutoff
    GROUP BY e.arrangement_id
  ), unit_totals AS (
    SELECT a.id arrangement_id,coalesce(sum(u.allocated_halalah),0)::bigint allocated_halalah,
      count(*) FILTER(WHERE u.allocated_halalah IS NOT NULL)::integer unit_count
    FROM visible a LEFT JOIN public.accounting_revenue_performance_unit_versions u
      ON u.profile_id=a.profile_id AND u.arrangement_id=a.arrangement_id AND u.arrangement_version=a.version
    WHERE a.rn=1 GROUP BY a.id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('arrangement_id',v.arrangement_id,'service_id',v.service_id,'customer_id',v.customer_id,
      'approved_billing_scope_id',v.approved_billing_scope_id,'version',v.version,'status',v.status,'held_code',v.held_code,
      'consideration_halalah',v.consideration_halalah::text,'allocated_halalah',coalesce(u.allocated_halalah,0)::text,
      'unallocated_halalah',greatest(v.consideration_halalah-coalesce(u.allocated_halalah,0),0)::text,
      'recognized_to_date_halalah',coalesce(e.recognized_to_date,0)::text,
      'remaining_unrecognized_halalah',greatest(v.consideration_halalah-coalesce(e.recognized_to_date,0),0)::text,
      'supersedes_arrangement_id',v.supersedes_arrangement_id,
      'stale_authority',coalesce(s.superseded_at<=p_cutoff,false) OR coalesce(s.voided_at<=p_cutoff,false),
      'service_customer_difference',srv.customer_id IS DISTINCT FROM v.customer_id,
      'source_snapshot_sha256',v.source_snapshot_sha256,'source_snapshot',v.source_snapshot,
      'units',v.units_snapshot,'arrangement_review',ar.decision,'unit_count',coalesce(u.unit_count,0)) ORDER BY v.service_id,v.arrangement_id)
      FILTER(WHERE v.display_number<=p_limit),'[]'::jsonb),
    coalesce(sum(v.consideration_halalah) FILTER(WHERE s.superseded_at IS NULL OR s.superseded_at>p_cutoff),0)::bigint,
    coalesce(sum(u.allocated_halalah) FILTER(WHERE s.superseded_at IS NULL OR s.superseded_at>p_cutoff),0)::bigint,
    coalesce(sum(e.recognized_to_date),0)::bigint,coalesce(sum(e.timing_differences),0)::integer,
    count(*)::integer,count(*) FILTER(WHERE coalesce(s.superseded_at<=p_cutoff,false) OR coalesce(s.voided_at<=p_cutoff,false))::integer,
    count(*) FILTER(WHERE srv.customer_id IS DISTINCT FROM v.customer_id)::integer
  INTO arrangements,consideration,allocated,recognized,timing_count,arrangement_count,stale_count,customer_diff_count
  FROM visible v LEFT JOIN unit_totals u ON u.arrangement_id=v.arrangement_id
    LEFT JOIN event_totals e ON e.arrangement_id=v.arrangement_id
    LEFT JOIN public.approved_billing_scopes s ON s.id=v.approved_billing_scope_id
    LEFT JOIN public.services srv ON srv.id=v.service_id
    LEFT JOIN public.accounting_revenue_arrangement_reviews ar ON ar.profile_id=v.profile_id AND ar.arrangement_id=v.arrangement_id
      AND ar.arrangement_version=v.version AND ar.recorded_at<=p_cutoff;
  SELECT coalesce(jsonb_agg(jsonb_build_object('evidence_id',v.evidence_id,'unit_id',v.unit_id,'arrangement_id',v.arrangement_id,
      'evidence_version',v.version,'status',v.status,'held_code',v.held_code,'evidence_basis',v.evidence_basis,
      'performance_from',v.performance_from,'performance_through',v.performance_through,'evidence_ref',v.evidence_ref,
      'created_at',v.created_at,'review_decision',v.decision) ORDER BY v.created_at,v.evidence_id)
      FILTER(WHERE v.display_number<=p_limit),'[]'::jsonb),count(*)::integer
    INTO held_evidence,held_evidence_count FROM (
      SELECT v.*,r.decision,row_number() OVER(ORDER BY v.created_at,v.evidence_id)::integer display_number
      FROM public.accounting_revenue_performance_evidence_versions v
    LEFT JOIN public.accounting_revenue_performance_evidence_reviews r ON r.profile_id=v.profile_id AND r.evidence_id=v.evidence_id
      AND r.evidence_version=v.version AND r.recorded_at<=p_cutoff
    WHERE v.profile_id=profile AND v.created_at<=p_cutoff AND (v.status='HELD' OR r.decision='HELD' OR r.decision IS NULL)
      AND v.version=(SELECT max(x.version) FROM public.accounting_revenue_performance_evidence_versions x
        WHERE x.profile_id=v.profile_id AND x.evidence_id=v.evidence_id AND x.created_at<=p_cutoff)
    ) v;
  WITH visible_events AS (
    SELECT e.*,l.journal_id,se.status effect_status,jv.status journal_status,jv.posted_at,
      row_number() OVER(ORDER BY e.accounting_date,e.created_at,e.id)::integer display_number
    FROM public.accounting_revenue_recognition_events e
    LEFT JOIN public.accounting_revenue_recognition_journal_links l ON l.profile_id=e.profile_id AND l.recognition_event_id=e.id
    LEFT JOIN public.accounting_source_effects se ON se.profile_id=l.profile_id AND se.id=l.source_effect_id
    LEFT JOIN public.accounting_journals j ON j.profile_id=l.profile_id AND j.id=l.journal_id
    LEFT JOIN public.accounting_journal_versions jv ON jv.profile_id=j.profile_id AND jv.journal_id=j.id
      AND jv.version=j.current_version AND jv.created_at<=p_cutoff
    WHERE e.profile_id=profile AND e.created_at<=p_cutoff AND e.accounting_date<=p_as_of
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('recognition_event_id',e.id,'arrangement_id',e.arrangement_id,
      'arrangement_version',e.arrangement_version,'unit_id',e.unit_id,'evidence_id',e.evidence_id,'evidence_version',e.evidence_version,
      'service_id',e.service_id,'customer_id',e.customer_id,'accounting_date',e.accounting_date,
      'performance_from',e.performance_from,'performance_through',e.performance_through,'signed_delta_halalah',e.signed_delta_halalah::text,
      'correction_of_recognition_event_id',e.correction_of_recognition_event_id,'journal_id',e.journal_id,
      'journal_status',CASE WHEN e.journal_status='POSTED' AND e.posted_at<=p_cutoff THEN 'POSTED' ELSE coalesce(e.journal_status,'UNLINKED') END,
      'posted_at',CASE WHEN e.journal_status='POSTED' AND e.posted_at<=p_cutoff THEN e.posted_at ELSE NULL END,
      'source_snapshot_sha256',e.source_snapshot_sha256) ORDER BY e.accounting_date,e.created_at,e.id)
      FILTER(WHERE e.display_number<=p_limit),'[]'::jsonb),count(*)::integer
    INTO recognition_events,recognition_event_count FROM visible_events e;

  WITH posted_lines AS (
    SELECT jl.service_id,av.control_classification,av.account_type,jl.side,jl.amount_halalah
    FROM public.accounting_journal_line_versions jl JOIN public.accounting_journal_versions jv
      ON jv.profile_id=jl.profile_id AND jv.journal_id=jl.journal_id AND jv.version=jl.journal_version
    JOIN public.accounting_account_versions av ON av.profile_id=jl.profile_id AND av.account_id=jl.account_id AND av.version=jl.account_version
    WHERE jl.profile_id=profile AND jv.status='POSTED' AND jv.accounting_date<=p_as_of AND jv.posted_at<=p_cutoff
      AND jv.source_domain IN ('AR_BRIDGE','REVENUE_RECOGNITION')
  ), balances AS (
    SELECT coalesce(sum(CASE WHEN control_classification='CONTRACT_ASSET' THEN CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END),0)::bigint contract_asset,
      coalesce(sum(CASE WHEN control_classification='CONTRACT_LIABILITY' THEN CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END),0)::bigint contract_liability,
      coalesce(sum(CASE WHEN account_type='REVENUE' THEN CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END),0)::bigint revenue
    FROM posted_lines
  ) SELECT contract_asset,contract_liability,revenue INTO asset,liability,revenue FROM balances;
  WITH expected AS (
    SELECT l.service_id,l.party_role,sum(CASE WHEN l.party_role='CONTRACT_ASSET' THEN CASE WHEN l.side='DEBIT' THEN l.amount_halalah ELSE -l.amount_halalah END
      ELSE CASE WHEN l.side='CREDIT' THEN l.amount_halalah ELSE -l.amount_halalah END END)::bigint amount
    FROM public.accounting_ar_bridge_journal_lines l JOIN public.accounting_ar_bridge_journal_links k
      ON k.profile_id=l.profile_id AND k.event_id=l.event_id AND k.event_version=l.event_version
    JOIN public.accounting_source_effects se ON se.profile_id=k.profile_id AND se.id=k.source_effect_id AND se.status='POSTED'
    JOIN public.accounting_journal_versions jv ON jv.profile_id=k.profile_id AND jv.journal_id=k.journal_id AND jv.status='POSTED'
    WHERE l.profile_id=profile AND l.party_role IN ('CONTRACT_ASSET','CONTRACT_LIABILITY') AND jv.accounting_date<=p_as_of AND jv.posted_at<=p_cutoff
    GROUP BY l.service_id,l.party_role
    UNION ALL
    SELECT l.service_id,l.party_role,sum(CASE WHEN l.party_role='CONTRACT_ASSET' THEN CASE WHEN l.side='DEBIT' THEN l.amount_halalah ELSE -l.amount_halalah END
      ELSE CASE WHEN l.side='CREDIT' THEN l.amount_halalah ELSE -l.amount_halalah END END)::bigint
    FROM public.accounting_revenue_recognition_journal_lines l JOIN public.accounting_revenue_recognition_journal_links k
      ON k.profile_id=l.profile_id AND k.recognition_event_id=l.recognition_event_id AND k.journal_id=l.journal_id AND k.prepared_version=l.journal_version
    JOIN public.accounting_journals h ON h.profile_id=k.profile_id AND h.id=k.journal_id
    JOIN public.accounting_journal_versions jv ON jv.profile_id=h.profile_id AND jv.journal_id=h.id AND jv.version=h.current_version
    JOIN public.accounting_source_effects se ON se.profile_id=k.profile_id AND se.id=k.source_effect_id AND se.status='POSTED'
    WHERE l.profile_id=profile AND l.party_role IN ('CONTRACT_ASSET','CONTRACT_LIABILITY') AND jv.status='POSTED' AND jv.accounting_date<=p_as_of AND jv.posted_at<=p_cutoff
    GROUP BY l.service_id,l.party_role
  ), expected_summed AS (SELECT service_id,party_role,sum(amount)::bigint amount FROM expected GROUP BY service_id,party_role),
  ledger AS (
    SELECT jl.service_id,av.control_classification party_role,sum(CASE WHEN av.control_classification='CONTRACT_ASSET'
      THEN CASE WHEN jl.side='DEBIT' THEN jl.amount_halalah ELSE -jl.amount_halalah END
      ELSE CASE WHEN jl.side='CREDIT' THEN jl.amount_halalah ELSE -jl.amount_halalah END END)::bigint amount
    FROM public.accounting_journal_line_versions jl JOIN public.accounting_journal_versions jv
      ON jv.profile_id=jl.profile_id AND jv.journal_id=jl.journal_id AND jv.version=jl.journal_version
    JOIN public.accounting_account_versions av ON av.profile_id=jl.profile_id AND av.account_id=jl.account_id AND av.version=jl.account_version
    WHERE jl.profile_id=profile AND jv.source_domain IN ('AR_BRIDGE','REVENUE_RECOGNITION') AND jv.status='POSTED'
      AND jv.accounting_date<=p_as_of AND jv.posted_at<=p_cutoff AND av.control_classification IN ('CONTRACT_ASSET','CONTRACT_LIABILITY')
    GROUP BY jl.service_id,av.control_classification
  ), diff AS (SELECT coalesce(e.service_id,l.service_id) service_id,coalesce(e.party_role,l.party_role) party_role,
      coalesce(e.amount,0)::bigint expected,coalesce(l.amount,0)::bigint ledger,
      (coalesce(l.amount,0)-coalesce(e.amount,0))::bigint difference FROM expected_summed e FULL JOIN ledger l USING(service_id,party_role)),
  diff_rows AS (SELECT d.*,row_number() OVER(ORDER BY service_id,party_role)::integer display_number FROM diff d WHERE difference<>0)
  SELECT count(*)::integer,coalesce(jsonb_agg(jsonb_build_object('service_id',service_id,'control',party_role,
      'subledger_halalah',expected::text,'ledger_halalah',ledger::text,'difference_halalah',difference::text) ORDER BY service_id,party_role)
      FILTER(WHERE display_number<=p_limit),'[]'::jsonb)
    INTO contract_diff_count,contracts FROM diff_rows;
  SELECT count(*)::integer INTO credits_count FROM public.accounting_ar_bridge_events e
    JOIN LATERAL(SELECT x.* FROM public.accounting_ar_bridge_event_versions x WHERE x.profile_id=e.profile_id AND x.event_id=e.id
      AND x.created_at<=p_cutoff AND x.source_recorded_at<=p_cutoff ORDER BY x.version DESC LIMIT 1) v ON true
    WHERE e.profile_id=profile AND e.source_type IN ('CREDIT_ADJUSTMENT','CREDIT_ADJUSTMENT_REVERSAL','REFUND','REFUND_REVERSAL')
      AND v.created_at<=p_cutoff AND v.source_recorded_at<=p_cutoff AND (v.service_id IS NULL OR v.accounting_date<=p_as_of)
      AND NOT EXISTS(SELECT 1 FROM public.accounting_revenue_recognition_events r WHERE r.profile_id=profile
        AND r.correction_of_recognition_event_id IS NOT NULL AND r.source_snapshot->>'ar_source_record_id'=e.source_record_id::text);
  SELECT count(*)::integer INTO coverage_count FROM public.accounting_inception_coverage c JOIN LATERAL(
      SELECT x.* FROM public.accounting_inception_coverage_versions x WHERE x.profile_id=c.profile_id AND x.coverage_id=c.id
        AND x.created_at<=p_cutoff ORDER BY x.version DESC LIMIT 1) cv ON true
    WHERE c.profile_id=profile AND c.source_domain='REVENUE_RECOGNITION'
      AND cv.classification IN ('OPENING_BALANCE','RECONSTRUCTED_HISTORY','UNRESOLVED') AND c.created_at<=p_cutoff;
  IF arrangement_count>p_limit OR held_evidence_count>p_limit OR recognition_event_count>p_limit OR contract_diff_count>p_limit THEN state:='TRUNCATED';END IF;
  RETURN jsonb_build_object('state',state,'as_of_date',p_as_of,'recorded_at_cutoff',p_cutoff,'bank_reconciled',false,
    'authoritative_consideration_halalah',consideration::text,'performance_unit_allocations_halalah',allocated::text,
    'unallocated_consideration_halalah',greatest(consideration-allocated,0)::text,'recognized_to_date_halalah',recognized::text,
    'remaining_unrecognized_consideration_halalah',greatest(consideration-recognized,0)::text,'revenue_posted_halalah',revenue::text,
    'contract_asset_balance_halalah',asset::text,'contract_liability_balance_halalah',liability::text,
    'contract_balance_difference_count',contract_diff_count,'contract_balances',contracts,'held_evidence',held_evidence,
    'arrangement_count',arrangement_count,'held_evidence_count',held_evidence_count,
    'recognition_event_count',recognition_event_count,'recognition_events',recognition_events,
    'superseded_or_stale_authority_count',stale_count,'service_customer_difference_count',customer_diff_count,
    'credits_refunds_requiring_revenue_review_count',credits_count,'inception_covered_count',coverage_count,
    'fi012_timing_difference_count',timing_count,'truncated',state='TRUNCATED','arrangements',arrangements);
END;$reconcile_revenue$;

REVOKE ALL ON FUNCTION public.prevent_accounting_revenue_history_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_revenue_recognition_account_authorized(uuid,text,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_revenue_recognition_line_authorized(uuid,jsonb,integer,text,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_revenue_recognition_journal_link_authorized(uuid,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_revenue_recognition_journal_account_authorized(uuid,uuid,integer,integer,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_revenue_recognition_source_effect_link() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_accounting_revenue_arrangement(uuid,uuid,uuid,integer,jsonb,text,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.review_accounting_revenue_arrangement(uuid,uuid,integer,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_accounting_revenue_performance_evidence(uuid,uuid,text,integer,text,date,date,text,text,text,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.review_accounting_revenue_performance_evidence(uuid,uuid,integer,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.prepare_accounting_revenue_recognition(uuid,uuid,integer,uuid,integer,uuid,integer,date,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.post_accounting_revenue_recognition_journal(uuid,uuid,integer,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_accounting_revenue_recognition_reconciliation(uuid,date,timestamptz,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_accounting_revenue_arrangement(uuid,uuid,uuid,integer,jsonb,text,text,text,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_accounting_revenue_arrangement(uuid,uuid,integer,boolean,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_accounting_revenue_performance_evidence(uuid,uuid,text,integer,text,date,date,text,text,text,uuid,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_accounting_revenue_performance_evidence(uuid,uuid,integer,boolean,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_accounting_revenue_recognition(uuid,uuid,integer,uuid,integer,uuid,integer,date,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_accounting_revenue_recognition_journal(uuid,uuid,integer,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_revenue_recognition_reconciliation(uuid,date,timestamptz,integer) TO service_role;

COMMIT;
