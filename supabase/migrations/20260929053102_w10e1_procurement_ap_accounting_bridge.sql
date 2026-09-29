-- W10E1: source-linked Procurement / Accounts Payable accounting bridge.
-- Additive only; source facts remain authoritative and operational rows are never rewritten.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL
     OR to_regclass('public.accounting_foundation_events') IS NULL
     OR to_regclass('public.accounting_capability_catalog') IS NULL
     OR to_regclass('public.accounting_journal_versions') IS NULL
     OR to_regclass('public.accounting_source_effects') IS NULL
     OR to_regclass('public.accounting_inception_coverage') IS NULL
     OR to_regclass('public.service_receipts') IS NULL
     OR to_regclass('public.service_receipt_corrections') IS NULL
     OR to_regclass('public.supplier_bills') IS NULL
     OR to_regclass('public.supplier_payments') IS NULL
     OR to_regclass('public.supplier_payment_reversals') IS NULL
     OR to_regclass('public.supplier_advance_payments') IS NULL
     OR to_regclass('public.supplier_advance_payment_reversals') IS NULL
     OR to_regclass('public.supplier_advance_allocations') IS NULL
     OR to_regclass('public.supplier_advance_allocation_reversals') IS NULL
     OR to_regclass('public.supplier_advance_refunds') IS NULL
      OR to_regclass('public.audit_logs') IS NULL
     OR to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)') IS NULL
     OR to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)') IS NULL THEN
    RAISE EXCEPTION 'W10E1 preflight: accepted W4/W6/W10 accounting foundation is incomplete';
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_capability_catalog WHERE capability='accounting:manage_ap_bridge')
     OR to_regclass('public.accounting_ap_bridge_events') IS NOT NULL
      OR to_regclass('public.accounting_ap_bridge_event_versions') IS NOT NULL
      OR to_regclass('public.accounting_ap_bridge_journal_links') IS NOT NULL
      OR to_regclass('public.accounting_ap_bridge_journal_lines') IS NOT NULL
      OR to_regprocedure('public.save_accounting_ap_bridge_event(uuid,text,uuid,integer,text,bigint,bigint,text,date,text,text,text,text,uuid,integer,text,uuid)') IS NOT NULL
      OR to_regprocedure('public.prepare_accounting_ap_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid)') IS NOT NULL
      OR to_regprocedure('public.post_accounting_ap_bridge_journal(uuid,uuid,integer,uuid)') IS NOT NULL
      OR to_regprocedure('public.get_accounting_ap_bridge_reconciliation(uuid,date,timestamptz,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'W10E1 preflight: target bridge already exists';
  END IF;
END;
$preflight$;

ALTER TABLE public.accounting_foundation_events
  DROP CONSTRAINT accounting_foundation_events_event_type_check,
  DROP CONSTRAINT accounting_foundation_events_entity_type_check,
  ADD CONSTRAINT accounting_foundation_events_event_type_check CHECK (event_type IN (
    'accounting_capability_changed','accounting_profile_updated',
    'accounting_account_created','accounting_account_updated',
    'accounting_period_created','accounting_period_updated',
    'accounting_posting_rule_created','accounting_posting_rule_updated',
    'accounting_journal_prepared','accounting_journal_posted','accounting_journal_reversed',
    'accounting_inception_package_created','accounting_inception_package_updated',
    'accounting_inception_package_reviewed','accounting_inception_package_rejected',
    'accounting_inception_package_accepted',
    'accounting_ar_bridge_event_classified','accounting_ar_bridge_event_held',
    'accounting_ap_bridge_event_classified','accounting_ap_bridge_event_held'
  )),
  ADD CONSTRAINT accounting_foundation_events_entity_type_check CHECK (entity_type IN (
    'capability_assignment','accounting_profile','accounting_account','accounting_period',
    'accounting_posting_rule','accounting_journal','accounting_inception_package',
    'accounting_inception_review','accounting_inception_acceptance',
    'accounting_ar_bridge_event','accounting_ap_bridge_event'
  ));

ALTER TABLE public.accounting_capability_catalog
  DROP CONSTRAINT accounting_capability_catalog_key_check,
  DROP CONSTRAINT accounting_capability_catalog_state_check,
  ADD CONSTRAINT accounting_capability_catalog_key_check CHECK (capability IN (
    'accounting:view','accounting:manage_profile','accounting:manage_authority',
    'accounting:manage_chart','accounting:manage_periods',
    'accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal',
    'accounting:manage_inception','accounting:manage_ar_bridge','accounting:manage_ap_bridge',
    'accounting:reconcile_bank','accounting:close_period','accounting:reopen_period','accounting:view_statements'
  )),
  ADD CONSTRAINT accounting_capability_catalog_state_check CHECK (
    (capability IN ('accounting:view','accounting:manage_profile')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_authority' AND enabled AND NOT runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability IN ('accounting:manage_chart','accounting:manage_periods')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability IN ('accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10B')
    OR (capability='accounting:manage_inception' AND enabled AND runtime_allow_grantable AND owner_slice='W10C')
    OR (capability='accounting:manage_ar_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10D')
    OR (capability='accounting:manage_ap_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10E')
    OR (capability='accounting:reconcile_bank' AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10G')
    OR (capability IN ('accounting:close_period','accounting:reopen_period')
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I')
    OR (capability='accounting:view_statements' AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10H')
  );
INSERT INTO public.accounting_capability_catalog(capability,enabled,runtime_allow_grantable,owner_slice)
VALUES('accounting:manage_ap_bridge',true,true,'W10E');

DO $audit_action_preflight$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO v_definition
  FROM pg_catalog.pg_constraint c
  WHERE c.conrelid='public.audit_logs'::regclass AND c.conname='audit_logs_action_check';
  IF v_definition IS NULL OR md5(regexp_replace(v_definition,'[[:space:]]','','g'))
      IS DISTINCT FROM '9e1b901c370c6ffb7d776dacb5ba54c6' THEN
    RAISE EXCEPTION 'W10E1 preflight: audit action baseline differs';
  END IF;
END;
$audit_action_preflight$;

ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
  action = ANY (ARRAY[
    'create'::text, 'update'::text, 'delete'::text, 'restore'::text, 'status_change'::text,
    'payment_recorded'::text, 'correction'::text,
    'procurement_package_created'::text, 'procurement_package_updated'::text,
    'procurement_package_requirements_set'::text, 'procurement_package_supplier_selected'::text,
    'procurement_package_supplier_cleared'::text, 'expense_submitted'::text,
    'expense_approved'::text, 'expense_rejected'::text, 'expense_cancelled'::text,
    'expense_evidence_exception_recorded'::text, 'expense_evidence_exception_disposed'::text,
    'expense_document_attached'::text, 'expense_reimbursement_settled'::text,
    'cash_advance_requested'::text, 'cash_advance_approved'::text, 'cash_advance_rejected'::text,
    'cash_advance_cancelled'::text, 'cash_advance_issued'::text,
    'cash_advance_expense_settled'::text, 'cash_advance_returned'::text,
    'petty_cash_transaction_recorded'::text, 'expense_finance_reviewed'::text,
    'supplier_bill_recorded'::text, 'supplier_bill_updated'::text,
    'supplier_bill_documents_attached'::text, 'supplier_bill_approved'::text,
    'supplier_payment_recorded'::text, 'supplier_payment_reversed'::text,
    'supplier_advance_authorized'::text, 'supplier_advance_payment_recorded'::text,
    'supplier_advance_payment_reversed'::text, 'supplier_advance_allocated'::text,
    'supplier_advance_allocation_corrected'::text, 'supplier_advance_refund_recorded'::text,
    'customer_receipt_recorded'::text, 'customer_receipt_allocated'::text,
    'customer_receipt_allocation_reversed'::text, 'customer_receipt_reversed'::text
  ])
  OR (entity_type='accounting_journal' AND action = ANY (ARRAY['prepare'::text, 'post'::text, 'reverse'::text]))
  OR (entity_type='accounting_inception_package' AND action = ANY (ARRAY['save'::text, 'approve'::text, 'reject'::text, 'prepare'::text, 'accept'::text]))
  OR (entity_type='accounting_ar_bridge_event' AND action = ANY (ARRAY['classify'::text, 'hold'::text]))
  OR (entity_type='accounting_ap_bridge_event' AND action = ANY (ARRAY['classify'::text, 'hold'::text]))
);

ALTER TABLE public.accounting_journal_versions
  DROP CONSTRAINT accounting_journal_versions_source_domain_check,
  ADD CONSTRAINT accounting_journal_versions_source_domain_check
    CHECK(source_domain IN ('CONTROLLED_MANUAL','INCEPTION','AR_BRIDGE','AP_BRIDGE'));
ALTER TABLE public.accounting_source_effects
  DROP CONSTRAINT accounting_source_effects_source_domain_check,
  ADD CONSTRAINT accounting_source_effects_source_domain_check
    CHECK(source_domain IN ('CONTROLLED_MANUAL','INCEPTION','AR_BRIDGE','AP_BRIDGE'));

ALTER TABLE public.accounting_account_versions
  DROP CONSTRAINT accounting_account_versions_control_classification_check,
  ADD CONSTRAINT accounting_account_versions_control_classification_check CHECK (control_classification IN (
    'NONE','ACCOUNTS_RECEIVABLE','ACCOUNTS_PAYABLE','ACCRUED_LIABILITY','CUSTOMER_ADVANCE',
    'SUPPLIER_ADVANCE','CONTRACT_LIABILITY','CASH_ACCOUNTABILITY','EMPLOYEE_ADVANCE'
  ));

CREATE TABLE public.accounting_ap_bridge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  source_type text NOT NULL CHECK(source_type IN (
    'SERVICE_RECEIPT','SERVICE_RECEIPT_CORRECTION','SUPPLIER_BILL','SUPPLIER_PAYMENT',
    'SUPPLIER_PAYMENT_REVERSAL','SUPPLIER_ADVANCE_PAYMENT','SUPPLIER_ADVANCE_PAYMENT_REVERSAL',
    'SUPPLIER_ADVANCE_ALLOCATION','SUPPLIER_ADVANCE_ALLOCATION_REVERSAL','SUPPLIER_ADVANCE_REFUND'
  )),
  source_record_id uuid NOT NULL,
  source_record_key text NOT NULL CHECK(length(btrim(source_record_key)) BETWEEN 1 AND 200),
  economic_event_key text NOT NULL CHECK(length(btrim(economic_event_key)) BETWEEN 1 AND 200),
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id),
  UNIQUE(profile_id,source_type,source_record_id),
  UNIQUE(profile_id,source_record_key,economic_event_key)
);

CREATE TABLE public.accounting_ap_bridge_event_versions (
  profile_id uuid NOT NULL,
  event_id uuid NOT NULL,
  version integer NOT NULL CHECK(version>0),
  previous_version integer,
  status text NOT NULL CHECK(status IN ('READY','HELD')),
  classification text NOT NULL CHECK(classification IN (
    'RECEIPT_ACCRUAL','RECEIPT_CORRECTION_DECREASE','RECEIPT_CORRECTION_INCREASE',
    'SUPPLIER_BILL','SUPPLIER_PAYMENT','SUPPLIER_PAYMENT_REVERSAL',
    'SUPPLIER_ADVANCE_PAYMENT','SUPPLIER_ADVANCE_PAYMENT_REVERSAL',
    'SUPPLIER_ADVANCE_ALLOCATION','SUPPLIER_ADVANCE_ALLOCATION_REVERSAL','SUPPLIER_ADVANCE_REFUND',
    'HELD_UNSUPPORTED_TREATMENT'
  )),
  source_snapshot jsonb NOT NULL CHECK(jsonb_typeof(source_snapshot)='object'),
  source_snapshot_sha256 text NOT NULL CHECK(source_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
   amount_halalah bigint NOT NULL CHECK(amount_halalah>=0),
  matched_receipt_halalah bigint NOT NULL DEFAULT 0 CHECK(matched_receipt_halalah>=0),
  direct_classification text CHECK(direct_classification IS NULL OR direct_classification IN ('DIRECT_EXPENSE','CAPITAL_ASSET','PREPAID_EXPENSE')),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  receipt_id uuid REFERENCES public.service_receipts(id) ON DELETE RESTRICT,
  bill_id uuid REFERENCES public.supplier_bills(id) ON DELETE RESTRICT,
  advance_id uuid REFERENCES public.supplier_advances(id) ON DELETE RESTRICT,
  source_business_date date,
  source_occurred_at timestamptz,
  source_recorded_at timestamptz NOT NULL,
  accounting_date date,
  cash_account_id uuid,
  cash_account_version integer,
  evidence_ref text CHECK(evidence_ref IS NULL OR length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  evidence_sha256 text CHECK(evidence_sha256 IS NULL OR evidence_sha256 ~ '^[0-9a-f]{64}$'),
  cash_binding_evidence_ref text CHECK(cash_binding_evidence_ref IS NULL OR length(btrim(cash_binding_evidence_ref)) BETWEEN 1 AND 2000),
  cash_binding_evidence_sha256 text CHECK(cash_binding_evidence_sha256 IS NULL OR cash_binding_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  held_code text CHECK(held_code IS NULL OR held_code IN (
    'source_not_eligible','unsupported_source_treatment','classification_evidence_missing',
    'cash_account_evidence_missing','source_payload_conflict','original_effect_missing',
    'vat_not_supported','receipt_accrual_missing','receipt_match_exceeds_accrual',
     'direct_residual_evidence_missing','economic_effect_conflict','inception_coverage_conflict','cash_binding_mismatch'
  )),
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,event_id,version),
  FOREIGN KEY(profile_id,event_id) REFERENCES public.accounting_ap_bridge_events(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,event_id,previous_version)
    REFERENCES public.accounting_ap_bridge_event_versions(profile_id,event_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,cash_account_id,cash_account_version)
    REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id),
  CHECK((evidence_ref IS NULL)=(evidence_sha256 IS NULL)),
  CHECK((cash_binding_evidence_ref IS NULL)=(cash_binding_evidence_sha256 IS NULL)),
  CHECK((cash_account_id IS NULL)=(cash_account_version IS NULL)),
   CHECK((status='READY' AND held_code IS NULL AND accounting_date IS NOT NULL AND amount_halalah>0)
     OR (status='HELD' AND held_code IS NOT NULL))
);
ALTER TABLE public.accounting_ap_bridge_events
  ADD CONSTRAINT accounting_ap_bridge_events_current_version_fkey
  FOREIGN KEY(profile_id,id,current_version)
  REFERENCES public.accounting_ap_bridge_event_versions(profile_id,event_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_ap_bridge_journal_links (
  profile_id uuid NOT NULL,
  event_id uuid NOT NULL,
  event_version integer NOT NULL,
  journal_id uuid NOT NULL,
  prepared_version integer NOT NULL,
  source_effect_id uuid NOT NULL REFERENCES public.accounting_source_effects(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  receipt_id uuid REFERENCES public.service_receipts(id) ON DELETE RESTRICT,
  bill_id uuid REFERENCES public.supplier_bills(id) ON DELETE RESTRICT,
  advance_id uuid REFERENCES public.supplier_advances(id) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_record_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,event_id,event_version),
  UNIQUE(profile_id,journal_id,prepared_version),
  FOREIGN KEY(profile_id,event_id,event_version)
    REFERENCES public.accounting_ap_bridge_event_versions(profile_id,event_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,journal_id,prepared_version)
    REFERENCES public.accounting_journal_versions(profile_id,journal_id,version) ON DELETE RESTRICT
);
CREATE TABLE public.accounting_ap_bridge_journal_lines (
  profile_id uuid NOT NULL,
  event_id uuid NOT NULL,
  event_version integer NOT NULL,
  journal_id uuid NOT NULL,
  journal_version integer NOT NULL,
  line_number integer NOT NULL CHECK(line_number BETWEEN 1 AND 3),
  party_role text NOT NULL CHECK(party_role IN ('ACCOUNTS_PAYABLE','ACCRUED_LIABILITY','SUPPLIER_ADVANCE','CASH_ACCOUNT','DIRECT_EXPENSE','DIRECT_ASSET')),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  receipt_id uuid REFERENCES public.service_receipts(id) ON DELETE RESTRICT,
  bill_id uuid REFERENCES public.supplier_bills(id) ON DELETE RESTRICT,
  advance_id uuid REFERENCES public.supplier_advances(id) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_record_id uuid NOT NULL,
  account_id uuid NOT NULL,
  account_version integer NOT NULL,
  amount_halalah bigint NOT NULL CHECK(amount_halalah>0),
  side text NOT NULL CHECK(side IN ('DEBIT','CREDIT')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,event_id,event_version,line_number),
  FOREIGN KEY(profile_id,event_id,event_version)
    REFERENCES public.accounting_ap_bridge_event_versions(profile_id,event_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,journal_id,journal_version,line_number)
    REFERENCES public.accounting_journal_line_versions(profile_id,journal_id,journal_version,line_number) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,account_id,account_version)
    REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT
);
CREATE INDEX accounting_ap_bridge_versions_report_idx
  ON public.accounting_ap_bridge_event_versions(profile_id,status,source_business_date,source_recorded_at,accounting_date);
CREATE INDEX accounting_ap_bridge_lines_party_idx
  ON public.accounting_ap_bridge_journal_lines(profile_id,supplier_id,party_role,journal_id);

ALTER TABLE public.accounting_ap_bridge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ap_bridge_event_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ap_bridge_journal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ap_bridge_journal_lines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.accounting_ap_bridge_events,public.accounting_ap_bridge_event_versions,
  public.accounting_ap_bridge_journal_links,public.accounting_ap_bridge_journal_lines
  FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.prevent_accounting_ap_bridge_history_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $ap_bridge_immutable$
BEGIN RAISE EXCEPTION 'accounting_ap_bridge_history_immutable'; END;
$ap_bridge_immutable$;
CREATE TRIGGER accounting_ap_bridge_versions_immutable BEFORE UPDATE OR DELETE
  ON public.accounting_ap_bridge_event_versions FOR EACH ROW
  EXECUTE FUNCTION public.prevent_accounting_ap_bridge_history_mutation();
CREATE TRIGGER accounting_ap_bridge_versions_no_truncate BEFORE TRUNCATE
  ON public.accounting_ap_bridge_event_versions FOR EACH STATEMENT
  EXECUTE FUNCTION public.prevent_accounting_ap_bridge_history_mutation();
CREATE TRIGGER accounting_ap_bridge_links_immutable BEFORE UPDATE OR DELETE
  ON public.accounting_ap_bridge_journal_links FOR EACH ROW
  EXECUTE FUNCTION public.prevent_accounting_ap_bridge_history_mutation();
CREATE TRIGGER accounting_ap_bridge_links_no_truncate BEFORE TRUNCATE
  ON public.accounting_ap_bridge_journal_links FOR EACH STATEMENT
  EXECUTE FUNCTION public.prevent_accounting_ap_bridge_history_mutation();
CREATE TRIGGER accounting_ap_bridge_lines_immutable BEFORE UPDATE OR DELETE
  ON public.accounting_ap_bridge_journal_lines FOR EACH ROW
  EXECUTE FUNCTION public.prevent_accounting_ap_bridge_history_mutation();
CREATE TRIGGER accounting_ap_bridge_lines_no_truncate BEFORE TRUNCATE
  ON public.accounting_ap_bridge_journal_lines FOR EACH STATEMENT
  EXECUTE FUNCTION public.prevent_accounting_ap_bridge_history_mutation();

CREATE FUNCTION public.accounting_ap_bridge_source_snapshot(p_source_type text,p_source_record_id uuid,p_recorded_at_cutoff timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ap_source_snapshot$
DECLARE
  v_supplier uuid; v_service uuid; v_receipt uuid; v_bill uuid; v_advance uuid;
  v_amount numeric; v_business_date date; v_occurred_at timestamptz; v_recorded_at timestamptz;
  v_eligible boolean; v_reverses_type text; v_reverses_id uuid; v_attributes jsonb;
BEGIN
  IF p_source_type IS NULL OR p_source_record_id IS NULL THEN RETURN NULL; END IF;
  CASE p_source_type
    WHEN 'SERVICE_RECEIPT' THEN
      SELECT r.supplier_id,r.service_id,r.id,NULL::uuid,NULL::uuid,NULL::numeric,
         r.performance_date,coalesce((SELECT c.prior_decision_at FROM public.service_receipt_corrections c
           WHERE c.receipt_id=r.id ORDER BY c.correction_number LIMIT 1),r.reviewed_at),
         coalesce((SELECT c.prior_decision_at FROM public.service_receipt_corrections c
           WHERE c.receipt_id=r.id ORDER BY c.correction_number LIMIT 1),r.reviewed_at,r.created_at),
         coalesce((SELECT c.prior_acceptance_status FROM public.service_receipt_corrections c
           WHERE c.receipt_id=r.id ORDER BY c.correction_number LIMIT 1),r.acceptance_status)
           IN ('ACCEPTED','ACCEPTED_WITH_CONDITIONS'),
         jsonb_build_object('commitment_id',r.commitment_id,'acceptance_status',coalesce((SELECT c.prior_acceptance_status FROM public.service_receipt_corrections c
           WHERE c.receipt_id=r.id ORDER BY c.correction_number LIMIT 1),r.acceptance_status),
           'performance_date',r.performance_date,'received_amount_excluded',true,
           'reviewed_at',coalesce((SELECT c.prior_decision_at FROM public.service_receipt_corrections c
             WHERE c.receipt_id=r.id ORDER BY c.correction_number LIMIT 1),r.reviewed_at))
      INTO v_supplier,v_service,v_receipt,v_bill,v_advance,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.service_receipts r WHERE r.id=p_source_record_id;
    WHEN 'SERVICE_RECEIPT_CORRECTION' THEN
      SELECT r.supplier_id,r.service_id,r.id,NULL::uuid,NULL::uuid,NULL::numeric,
        (c.corrected_at AT TIME ZONE 'Asia/Riyadh')::date,c.corrected_at,c.created_at,
        c.prior_acceptance_status IN ('ACCEPTED','ACCEPTED_WITH_CONDITIONS')
          OR c.corrected_acceptance_status IN ('ACCEPTED','ACCEPTED_WITH_CONDITIONS'),
        'SERVICE_RECEIPT',r.id,
        jsonb_build_object('receipt_id',r.id,'commitment_id',r.commitment_id,
          'prior_acceptance_status',c.prior_acceptance_status,'corrected_acceptance_status',c.corrected_acceptance_status,
          'correction_reason',c.correction_reason,'prior_received_amount_excluded',true,
          'corrected_received_amount_excluded',true,'correction_number',c.correction_number)
      INTO v_supplier,v_service,v_receipt,v_bill,v_advance,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,
        v_reverses_type,v_reverses_id,v_attributes
      FROM public.service_receipt_corrections c JOIN public.service_receipts r ON r.id=c.receipt_id
      WHERE c.id=p_source_record_id;
    WHEN 'SUPPLIER_BILL' THEN
      SELECT b.supplier_id,b.service_id,b.service_receipt_id,b.id,NULL::uuid,b.total_amount,
        b.invoice_date,b.approved_at,b.recorded_at,
         b.status='approved' AND b.currency='SAR'
           AND (p_recorded_at_cutoff IS NULL OR b.approved_at<=p_recorded_at_cutoff),
        jsonb_build_object('bill_number',b.bill_number,'commitment_id',b.commitment_id,
          'invoice_number',b.invoice_number,'invoice_date',b.invoice_date,'due_date',b.due_date,
          'subtotal',b.subtotal,'vat_amount',b.vat_amount,'total_amount',b.total_amount,
          'status',b.status,'approved_at',b.approved_at,'recorded_at',b.recorded_at)
      INTO v_supplier,v_service,v_receipt,v_bill,v_advance,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.supplier_bills b WHERE b.id=p_source_record_id;
    WHEN 'SUPPLIER_PAYMENT' THEN
      SELECT p.supplier_id,p.service_id,b.service_receipt_id,b.id,NULL::uuid,p.amount,
        p.payment_date,p.recorded_at,p.recorded_at,
        p.supplier_id=b.supplier_id AND p.service_id=b.service_id
          AND b.status='approved' AND b.currency='SAR'
          AND (p_recorded_at_cutoff IS NULL OR b.approved_at<=p_recorded_at_cutoff),
        jsonb_build_object('payment_number',p.payment_number,'supplier_bill_id',b.id,'commitment_id',b.commitment_id,
          'method',p.method,'reference_excluded_from_account_selection',true,
          'iban_excluded_from_account_selection',true,'bank_name_snapshot',p.bank_name_snapshot)
      INTO v_supplier,v_service,v_receipt,v_bill,v_advance,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.supplier_payments p JOIN public.supplier_bills b ON b.id=p.supplier_bill_id
      WHERE p.id=p_source_record_id;
    WHEN 'SUPPLIER_PAYMENT_REVERSAL' THEN
      SELECT p.supplier_id,p.service_id,b.service_receipt_id,b.id,NULL::uuid,p.amount,
        (r.reversed_at AT TIME ZONE 'Asia/Riyadh')::date,r.reversed_at,r.reversed_at,true,
        'SUPPLIER_PAYMENT',p.id,jsonb_build_object('payment_id',p.id,'reversal_reason',r.reason,
          'reversed_at',r.reversed_at,'method_excluded_from_account_selection',true)
      INTO v_supplier,v_service,v_receipt,v_bill,v_advance,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,
        v_reverses_type,v_reverses_id,v_attributes
      FROM public.supplier_payment_reversals r JOIN public.supplier_payments p ON p.id=r.supplier_payment_id
      JOIN public.supplier_bills b ON b.id=p.supplier_bill_id WHERE r.id=p_source_record_id;
    WHEN 'SUPPLIER_ADVANCE_PAYMENT' THEN
      SELECT p.supplier_id,p.service_id,NULL::uuid,NULL::uuid,p.supplier_advance_id,p.amount,
        p.payment_date,p.recorded_at,p.recorded_at,
        p.supplier_id=a.supplier_id AND p.service_id=a.service_id
          AND p.amount<=a.authorized_amount AND a.currency='SAR'
          AND (p_recorded_at_cutoff IS NULL OR a.authorized_at<=p_recorded_at_cutoff),
        jsonb_build_object('advance_number',a.advance_number,'commitment_id',a.commitment_id,
          'authorized_amount',a.authorized_amount,'authorized_at',a.authorized_at,
          'authorization_request_id',a.authorization_request_id,'authorization_evidence_sha256',a.evidence_sha256,
          'method',p.method,'reference_excluded_from_account_selection',true,
          'iban_excluded_from_account_selection',true)
      INTO v_supplier,v_service,v_receipt,v_bill,v_advance,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.supplier_advance_payments p JOIN public.supplier_advances a ON a.id=p.supplier_advance_id
      WHERE p.id=p_source_record_id;
    WHEN 'SUPPLIER_ADVANCE_PAYMENT_REVERSAL' THEN
      SELECT p.supplier_id,p.service_id,NULL::uuid,NULL::uuid,p.supplier_advance_id,p.amount,
        (r.reversed_at AT TIME ZONE 'Asia/Riyadh')::date,r.reversed_at,r.reversed_at,true,
        'SUPPLIER_ADVANCE_PAYMENT',p.id,jsonb_build_object('advance_payment_id',p.id,
          'reversal_reason',r.reason,'reversed_at',r.reversed_at,'method_excluded_from_account_selection',true)
      INTO v_supplier,v_service,v_receipt,v_bill,v_advance,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,
        v_reverses_type,v_reverses_id,v_attributes
      FROM public.supplier_advance_payment_reversals r
      JOIN public.supplier_advance_payments p ON p.id=r.supplier_advance_payment_id WHERE r.id=p_source_record_id;
    WHEN 'SUPPLIER_ADVANCE_ALLOCATION' THEN
      SELECT adv.supplier_id,adv.service_id,b.service_receipt_id,b.id,a.supplier_advance_id,a.amount,
        (a.allocated_at AT TIME ZONE 'Asia/Riyadh')::date,a.allocated_at,a.allocated_at,
        adv.supplier_id=b.supplier_id AND adv.service_id=b.service_id AND adv.commitment_id=b.commitment_id
          AND b.status='approved' AND b.currency='SAR'
          AND (p_recorded_at_cutoff IS NULL OR (b.approved_at<=p_recorded_at_cutoff AND adv.authorized_at<=p_recorded_at_cutoff)),
        jsonb_build_object('advance_id',a.supplier_advance_id,'supplier_bill_id',b.id,'commitment_id',adv.commitment_id,
          'allocated_at',a.allocated_at,'allocation_request_id',a.allocation_request_id,
          'cash_movement',false,'expense_recognition',false)
      INTO v_supplier,v_service,v_receipt,v_bill,v_advance,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.supplier_advance_allocations a JOIN public.supplier_bills b ON b.id=a.supplier_bill_id
      JOIN public.supplier_advances adv ON adv.id=a.supplier_advance_id WHERE a.id=p_source_record_id;
    WHEN 'SUPPLIER_ADVANCE_ALLOCATION_REVERSAL' THEN
      SELECT adv.supplier_id,adv.service_id,b.service_receipt_id,b.id,a.supplier_advance_id,a.amount,
        (r.corrected_at AT TIME ZONE 'Asia/Riyadh')::date,r.corrected_at,r.corrected_at,true,
        'SUPPLIER_ADVANCE_ALLOCATION',a.id,jsonb_build_object('allocation_id',a.id,
          'correction_reason',r.reason,'corrected_at',r.corrected_at,'cash_movement',false,'expense_recognition',false)
      INTO v_supplier,v_service,v_receipt,v_bill,v_advance,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,
        v_reverses_type,v_reverses_id,v_attributes
      FROM public.supplier_advance_allocation_reversals r
      JOIN public.supplier_advance_allocations a ON a.id=r.supplier_advance_allocation_id
      JOIN public.supplier_bills b ON b.id=a.supplier_bill_id WHERE r.id=p_source_record_id;
    WHEN 'SUPPLIER_ADVANCE_REFUND' THEN
      SELECT a.supplier_id,a.service_id,NULL::uuid,NULL::uuid,r.supplier_advance_id,r.amount,
        r.business_date,r.recorded_at,r.recorded_at,true,
        jsonb_build_object('refund_number',r.refund_number,'reason',r.reason,'reference_excluded_from_account_selection',true,
          'evidence_sha256',r.evidence_sha256,'refund_reversal_supported',false)
      INTO v_supplier,v_service,v_receipt,v_bill,v_advance,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.supplier_advance_refunds r JOIN public.supplier_advances a ON a.id=r.supplier_advance_id
      WHERE r.id=p_source_record_id;
    ELSE RETURN NULL;
  END CASE;
  IF NOT FOUND OR v_supplier IS NULL OR v_recorded_at IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'source_type',p_source_type,'source_record_id',p_source_record_id,
    'source_record_key','W6/'||p_source_type||'/'||p_source_record_id::text,
    'economic_event_key','W6/'||p_source_type||'/'||p_source_record_id::text||'/AP_EFFECT',
    'supplier_id',v_supplier,'service_id',v_service,'receipt_id',v_receipt,'bill_id',v_bill,'advance_id',v_advance,
    'amount_halalah',coalesce(round(v_amount*100)::bigint,0)::text,
    'source_business_date',v_business_date,'source_occurred_at',v_occurred_at,
    'source_recorded_at',v_recorded_at,'eligible',coalesce(v_eligible,false),
    'reverses_source_type',v_reverses_type,'reverses_source_record_id',v_reverses_id,
    'attributes',coalesce(v_attributes,'{}'::jsonb));
END;
$ap_source_snapshot$;

CREATE FUNCTION public.accounting_ap_bridge_account_authorized(
  p_profile_id uuid,p_mapping_key text,p_account_id uuid,p_account_version integer
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ap_account_authorized$
  SELECT EXISTS(
    SELECT 1 FROM public.accounting_account_versions av
    WHERE av.profile_id=p_profile_id AND av.account_id=p_account_id AND av.version=p_account_version
      AND av.account_kind='POSTING' AND av.is_active
      AND NOT EXISTS(SELECT 1 FROM public.accounting_accounts child
        JOIN public.accounting_account_versions cv ON cv.profile_id=child.profile_id
          AND cv.account_id=child.id AND cv.version=child.current_version
        WHERE child.profile_id=p_profile_id AND cv.parent_account_id=av.account_id)
      AND CASE p_mapping_key
        WHEN 'accounts_payable' THEN av.account_type='LIABILITY' AND av.normal_balance='CREDIT'
          AND av.is_protected AND av.control_classification='ACCOUNTS_PAYABLE'
        WHEN 'accrued_liability' THEN av.account_type='LIABILITY' AND av.normal_balance='CREDIT'
          AND av.is_protected AND av.control_classification='ACCRUED_LIABILITY'
        WHEN 'supplier_advance' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND av.is_protected AND av.control_classification='SUPPLIER_ADVANCE'
        WHEN 'cash_account' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND ((av.is_protected AND av.control_classification='CASH_ACCOUNTABILITY')
            OR (NOT av.is_protected AND av.control_classification='NONE'))
        WHEN 'direct_expense' THEN av.account_type='EXPENSE' AND av.normal_balance='DEBIT'
          AND NOT av.is_protected AND av.control_classification='NONE'
        WHEN 'direct_asset' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND NOT av.is_protected AND av.control_classification='NONE'
        ELSE false END);
$ap_account_authorized$;

CREATE FUNCTION public.accounting_ap_bridge_expected_lines(
  p_source_type text,p_classification text,p_amount bigint,p_matched bigint,p_direct_classification text
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog
AS $ap_expected_lines$
DECLARE v_direct_key text;
BEGIN
  v_direct_key:=CASE WHEN p_direct_classification='DIRECT_EXPENSE' THEN 'direct_expense'
    WHEN p_direct_classification IN ('CAPITAL_ASSET','PREPAID_EXPENSE') THEN 'direct_asset' ELSE NULL END;
  IF p_source_type='SERVICE_RECEIPT' AND p_classification='RECEIPT_ACCRUAL' AND v_direct_key IS NOT NULL THEN
    RETURN jsonb_build_array(jsonb_build_object('key',v_direct_key,'role',CASE WHEN v_direct_key='direct_expense' THEN 'DIRECT_EXPENSE' ELSE 'DIRECT_ASSET' END,'side','DEBIT','amount',p_amount),
      jsonb_build_object('key','accrued_liability','role','ACCRUED_LIABILITY','side','CREDIT','amount',p_amount));
  ELSIF p_source_type='SERVICE_RECEIPT_CORRECTION' AND p_classification IN ('RECEIPT_CORRECTION_DECREASE','RECEIPT_CORRECTION_INCREASE') AND v_direct_key IS NOT NULL THEN
    RETURN CASE WHEN p_classification='RECEIPT_CORRECTION_DECREASE' THEN
      jsonb_build_array(jsonb_build_object('key','accrued_liability','role','ACCRUED_LIABILITY','side','DEBIT','amount',p_amount),
        jsonb_build_object('key',v_direct_key,'role',CASE WHEN v_direct_key='direct_expense' THEN 'DIRECT_EXPENSE' ELSE 'DIRECT_ASSET' END,'side','CREDIT','amount',p_amount))
      ELSE jsonb_build_array(jsonb_build_object('key',v_direct_key,'role',CASE WHEN v_direct_key='direct_expense' THEN 'DIRECT_EXPENSE' ELSE 'DIRECT_ASSET' END,'side','DEBIT','amount',p_amount),
        jsonb_build_object('key','accrued_liability','role','ACCRUED_LIABILITY','side','CREDIT','amount',p_amount)) END;
  ELSIF p_source_type='SUPPLIER_BILL' AND p_classification='SUPPLIER_BILL'
      AND p_matched BETWEEN 0 AND p_amount AND (p_matched=p_amount OR v_direct_key IS NOT NULL) THEN
    RETURN (CASE WHEN p_matched>0 THEN jsonb_build_array(jsonb_build_object('key','accrued_liability','role','ACCRUED_LIABILITY','side','DEBIT','amount',p_matched)) ELSE '[]'::jsonb END)
      ||(CASE WHEN p_amount>p_matched THEN jsonb_build_array(jsonb_build_object('key',v_direct_key,'role',CASE WHEN v_direct_key='direct_expense' THEN 'DIRECT_EXPENSE' ELSE 'DIRECT_ASSET' END,'side','DEBIT','amount',p_amount-p_matched)) ELSE '[]'::jsonb END)
      ||jsonb_build_array(jsonb_build_object('key','accounts_payable','role','ACCOUNTS_PAYABLE','side','CREDIT','amount',p_amount));
  ELSIF p_source_type='SUPPLIER_PAYMENT' AND p_classification='SUPPLIER_PAYMENT' THEN
    RETURN jsonb_build_array(jsonb_build_object('key','accounts_payable','role','ACCOUNTS_PAYABLE','side','DEBIT','amount',p_amount),jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','CREDIT','amount',p_amount));
  ELSIF p_source_type='SUPPLIER_PAYMENT_REVERSAL' AND p_classification='SUPPLIER_PAYMENT_REVERSAL' THEN
    RETURN jsonb_build_array(jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','DEBIT','amount',p_amount),jsonb_build_object('key','accounts_payable','role','ACCOUNTS_PAYABLE','side','CREDIT','amount',p_amount));
  ELSIF p_source_type='SUPPLIER_ADVANCE_PAYMENT' AND p_classification='SUPPLIER_ADVANCE_PAYMENT' THEN
    RETURN jsonb_build_array(jsonb_build_object('key','supplier_advance','role','SUPPLIER_ADVANCE','side','DEBIT','amount',p_amount),jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','CREDIT','amount',p_amount));
  ELSIF p_source_type='SUPPLIER_ADVANCE_PAYMENT_REVERSAL' AND p_classification='SUPPLIER_ADVANCE_PAYMENT_REVERSAL' THEN
    RETURN jsonb_build_array(jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','DEBIT','amount',p_amount),jsonb_build_object('key','supplier_advance','role','SUPPLIER_ADVANCE','side','CREDIT','amount',p_amount));
  ELSIF p_source_type='SUPPLIER_ADVANCE_ALLOCATION' AND p_classification='SUPPLIER_ADVANCE_ALLOCATION' THEN
    RETURN jsonb_build_array(jsonb_build_object('key','accounts_payable','role','ACCOUNTS_PAYABLE','side','DEBIT','amount',p_amount),jsonb_build_object('key','supplier_advance','role','SUPPLIER_ADVANCE','side','CREDIT','amount',p_amount));
  ELSIF p_source_type='SUPPLIER_ADVANCE_ALLOCATION_REVERSAL' AND p_classification='SUPPLIER_ADVANCE_ALLOCATION_REVERSAL' THEN
    RETURN jsonb_build_array(jsonb_build_object('key','supplier_advance','role','SUPPLIER_ADVANCE','side','DEBIT','amount',p_amount),jsonb_build_object('key','accounts_payable','role','ACCOUNTS_PAYABLE','side','CREDIT','amount',p_amount));
  ELSIF p_source_type='SUPPLIER_ADVANCE_REFUND' AND p_classification='SUPPLIER_ADVANCE_REFUND' THEN
    RETURN jsonb_build_array(jsonb_build_object('key','cash_account','role','CASH_ACCOUNT','side','DEBIT','amount',p_amount),jsonb_build_object('key','supplier_advance','role','SUPPLIER_ADVANCE','side','CREDIT','amount',p_amount));
  END IF;
  RETURN NULL;
END;
$ap_expected_lines$;

CREATE FUNCTION public.accounting_ap_bridge_line_authorized(
  p_profile_id uuid,p_journal jsonb,p_line_number integer,p_mapping_key text,
  p_account_id uuid,p_account_version integer,p_actor_user_id uuid
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ap_line_authorized$
DECLARE v_event public.accounting_ap_bridge_events%ROWTYPE; v_version public.accounting_ap_bridge_event_versions%ROWTYPE;
  v_lines jsonb; v_expected jsonb; v_line jsonb; v_item jsonb;
BEGIN
  IF p_journal IS NULL OR p_journal->>'source_domain'<>'AP_BRIDGE'
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_ap_bridge') THEN RETURN false; END IF;
  SELECT e.* INTO v_event FROM public.accounting_ap_bridge_events e WHERE e.profile_id=p_profile_id
    AND e.source_record_key=p_journal->>'source_record_key' AND e.economic_event_key=p_journal->>'economic_event_key';
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT ev.* INTO v_version FROM public.accounting_ap_bridge_event_versions ev
    WHERE ev.profile_id=v_event.profile_id AND ev.event_id=v_event.id AND ev.version=v_event.current_version AND ev.status='READY';
  IF NOT FOUND OR public.accounting_ap_bridge_source_snapshot(v_event.source_type,v_event.source_record_id) IS DISTINCT FROM v_version.source_snapshot
     OR encode(extensions.digest(convert_to(v_version.source_snapshot::text,'UTF8'),'sha256'),'hex') IS DISTINCT FROM v_version.source_snapshot_sha256
     OR p_journal->>'posting_purpose'<>'ap_bridge' OR p_journal->>'accounting_date' IS DISTINCT FROM v_version.accounting_date::text THEN RETURN false; END IF;
  v_expected:=public.accounting_ap_bridge_expected_lines(v_event.source_type,v_version.classification,v_version.amount_halalah,v_version.matched_receipt_halalah,v_version.direct_classification);
  v_lines:=coalesce(p_journal->'lines','[]'::jsonb);
  IF v_expected IS NULL OR jsonb_array_length(v_lines)<>jsonb_array_length(v_expected) OR p_line_number NOT BETWEEN 1 AND jsonb_array_length(v_expected) THEN RETURN false; END IF;
  v_line:=v_lines->(p_line_number-1); v_item:=v_expected->(p_line_number-1);
  IF v_line->>'mapping_key' IS DISTINCT FROM v_item->>'key' OR p_mapping_key IS DISTINCT FROM v_item->>'key'
     OR v_line->>'side' IS DISTINCT FROM v_item->>'side' OR (v_line->>'amount_halalah')::bigint IS DISTINCT FROM (v_item->>'amount')::bigint
     OR nullif(v_line->>'service_id','') IS DISTINCT FROM v_version.service_id::text
     OR NOT public.accounting_ap_bridge_account_authorized(p_profile_id,p_mapping_key,p_account_id,p_account_version) THEN RETURN false; END IF;
  IF p_mapping_key='cash_account' AND (v_version.cash_account_id IS DISTINCT FROM p_account_id
      OR v_version.cash_account_version IS DISTINCT FROM p_account_version
      OR v_version.cash_binding_evidence_ref IS NULL OR v_version.cash_binding_evidence_sha256 IS NULL) THEN RETURN false; END IF;
  RETURN true;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END;
$ap_line_authorized$;

CREATE FUNCTION public.accounting_ap_bridge_journal_link_authorized(
  p_profile_id uuid,p_journal_id uuid,p_journal_version integer,p_prepared_by uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ap_link_authorized$
  SELECT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_journal_links l
    JOIN public.accounting_ap_bridge_event_versions ev ON ev.profile_id=l.profile_id AND ev.event_id=l.event_id AND ev.version=l.event_version
    WHERE l.profile_id=p_profile_id AND l.journal_id=p_journal_id AND l.prepared_version=p_journal_version
      AND ev.status='READY' AND ev.created_by=p_prepared_by);
$ap_link_authorized$;
CREATE FUNCTION public.accounting_ap_bridge_journal_account_authorized(
  p_profile_id uuid,p_journal_id uuid,p_journal_version integer,p_line_number integer,
  p_account_id uuid,p_account_version integer,p_prepared_by uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ap_journal_account_authorized$
  SELECT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_journal_lines ll
    JOIN public.accounting_ap_bridge_journal_links l ON l.profile_id=ll.profile_id AND l.event_id=ll.event_id
      AND l.event_version=ll.event_version AND l.journal_id=ll.journal_id AND l.prepared_version=ll.journal_version
    WHERE ll.profile_id=p_profile_id AND ll.journal_id=p_journal_id AND ll.journal_version=p_journal_version
      AND ll.line_number=p_line_number AND ll.account_id=p_account_id AND ll.account_version=p_account_version
      AND public.accounting_ap_bridge_journal_link_authorized(p_profile_id,p_journal_id,p_journal_version,p_prepared_by)
      AND public.accounting_ap_bridge_account_authorized(p_profile_id,CASE ll.party_role
        WHEN 'ACCOUNTS_PAYABLE' THEN 'accounts_payable' WHEN 'ACCRUED_LIABILITY' THEN 'accrued_liability'
        WHEN 'SUPPLIER_ADVANCE' THEN 'supplier_advance' WHEN 'CASH_ACCOUNT' THEN 'cash_account'
        WHEN 'DIRECT_EXPENSE' THEN 'direct_expense' WHEN 'DIRECT_ASSET' THEN 'direct_asset' END,p_account_id,p_account_version));
$ap_journal_account_authorized$;

CREATE FUNCTION public.accounting_ap_bridge_source_effect_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $ap_effect_link$
DECLARE v_event public.accounting_ap_bridge_events%ROWTYPE; v_version public.accounting_ap_bridge_event_versions%ROWTYPE;
  v_expected jsonb; v_journal public.accounting_journal_versions%ROWTYPE; v_line record; v_item jsonb;
BEGIN
  IF NEW.source_domain<>'AP_BRIDGE' THEN RETURN NEW; END IF;
  SELECT e.* INTO v_event FROM public.accounting_ap_bridge_events e WHERE e.profile_id=NEW.profile_id
    AND e.source_record_key=NEW.source_record_key AND e.economic_event_key=NEW.economic_event_key;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AP_BRIDGE_EVENT_NOT_FOUND'; END IF;
  SELECT ev.* INTO v_version FROM public.accounting_ap_bridge_event_versions ev WHERE ev.profile_id=v_event.profile_id
    AND ev.event_id=v_event.id AND ev.version=v_event.current_version AND ev.status='READY';
  IF NOT FOUND OR public.accounting_ap_bridge_source_snapshot(v_event.source_type,v_event.source_record_id) IS DISTINCT FROM v_version.source_snapshot
     OR encode(extensions.digest(convert_to(v_version.source_snapshot::text,'UTF8'),'sha256'),'hex') IS DISTINCT FROM v_version.source_snapshot_sha256
     OR NEW.payload_fingerprint IS DISTINCT FROM (SELECT jv.payload_fingerprint FROM public.accounting_journal_versions jv
       WHERE jv.profile_id=NEW.profile_id AND jv.journal_id=NEW.journal_id AND jv.version=NEW.journal_version) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AP_BRIDGE_SOURCE_CONFLICT'; END IF;
  SELECT jv.* INTO v_journal FROM public.accounting_journal_versions jv WHERE jv.profile_id=NEW.profile_id
    AND jv.journal_id=NEW.journal_id AND jv.version=NEW.journal_version AND jv.source_domain='AP_BRIDGE'
    AND jv.source_record_key=NEW.source_record_key AND jv.economic_event_key=NEW.economic_event_key AND jv.posting_purpose='ap_bridge';
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AP_BRIDGE_JOURNAL_INVALID'; END IF;
  v_expected:=public.accounting_ap_bridge_expected_lines(v_event.source_type,v_version.classification,v_version.amount_halalah,v_version.matched_receipt_halalah,v_version.direct_classification);
  IF v_expected IS NULL OR jsonb_array_length(v_expected)<>(SELECT count(*) FROM public.accounting_journal_line_versions l
      WHERE l.profile_id=NEW.profile_id AND l.journal_id=NEW.journal_id AND l.journal_version=NEW.journal_version) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AP_BRIDGE_JOURNAL_SHAPE_INVALID'; END IF;
  IF TG_OP='UPDATE' THEN
    IF OLD.status<>'PREPARED' OR NEW.status<>'POSTED' OR NOT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_journal_links l
       WHERE l.profile_id=NEW.profile_id AND l.journal_id=NEW.journal_id AND l.prepared_version=NEW.journal_version-1 AND l.source_effect_id=NEW.id) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AP_BRIDGE_EFFECT_TRANSITION_INVALID'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.status<>'PREPARED' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AP_BRIDGE_EFFECT_STATUS_INVALID'; END IF;
  INSERT INTO public.accounting_ap_bridge_journal_links(profile_id,event_id,event_version,journal_id,prepared_version,source_effect_id,
    supplier_id,service_id,receipt_id,bill_id,advance_id,source_type,source_record_id)
  VALUES(NEW.profile_id,v_event.id,v_version.version,NEW.journal_id,NEW.journal_version,NEW.id,v_version.supplier_id,
    v_version.service_id,v_version.receipt_id,v_version.bill_id,v_version.advance_id,v_event.source_type,v_event.source_record_id);
  FOR v_line IN SELECT l.* FROM public.accounting_journal_line_versions l WHERE l.profile_id=NEW.profile_id
      AND l.journal_id=NEW.journal_id AND l.journal_version=NEW.journal_version ORDER BY l.line_number LOOP
    v_item:=v_expected->(v_line.line_number-1);
    IF v_line.mapping_key IS DISTINCT FROM v_item->>'key' OR v_line.side IS DISTINCT FROM v_item->>'side'
       OR v_line.amount_halalah IS DISTINCT FROM (v_item->>'amount')::bigint
       OR NOT public.accounting_ap_bridge_account_authorized(NEW.profile_id,v_line.mapping_key,v_line.account_id,v_line.account_version) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AP_BRIDGE_ACCOUNT_INVALID'; END IF;
    INSERT INTO public.accounting_ap_bridge_journal_lines(profile_id,event_id,event_version,journal_id,journal_version,
      line_number,party_role,supplier_id,service_id,receipt_id,bill_id,advance_id,source_type,source_record_id,
      account_id,account_version,amount_halalah,side)
    VALUES(NEW.profile_id,v_event.id,v_version.version,NEW.journal_id,NEW.journal_version,v_line.line_number,v_item->>'role',
      v_version.supplier_id,v_version.service_id,v_version.receipt_id,v_version.bill_id,v_version.advance_id,
      v_event.source_type,v_event.source_record_id,v_line.account_id,v_line.account_version,v_line.amount_halalah,v_line.side);
  END LOOP;
  RETURN NEW;
END;
$ap_effect_link$;
CREATE TRIGGER accounting_ap_bridge_source_effect_link AFTER INSERT OR UPDATE OF status
  ON public.accounting_source_effects FOR EACH ROW EXECUTE FUNCTION public.accounting_ap_bridge_source_effect_link();

CREATE FUNCTION public.save_accounting_ap_bridge_event(
  p_actor_user_id uuid,p_source_type text,p_source_record_id uuid,p_expected_version integer,
  p_classification text,p_amount_halalah bigint,p_matched_receipt_halalah bigint,p_direct_classification text,
  p_accounting_date date,p_evidence_ref text,p_evidence_sha256 text,p_cash_binding_evidence_ref text,
  p_cash_binding_evidence_sha256 text,p_cash_account_id uuid,p_cash_account_version integer,p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,event_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $save_ap_bridge_event$
DECLARE v_profile_id uuid; v_snapshot jsonb; v_hash text; v_source_key text; v_economic_key text;
  v_event public.accounting_ap_bridge_events%ROWTYPE; v_prior public.accounting_foundation_events%ROWTYPE;
  v_version integer; v_amount bigint; v_status text; v_held_code text; v_lines jsonb; v_fingerprint text;
  v_foundation_id uuid; v_original_type text; v_original_id uuid; v_original_version public.accounting_ap_bridge_event_versions%ROWTYPE;
  v_direct text; v_cash_needed boolean; v_receipt_open bigint;
BEGIN
  IF p_actor_user_id IS NULL OR p_source_type IS NULL OR p_source_record_id IS NULL OR p_expected_version IS NULL OR p_expected_version<0
     OR p_classification IS NULL OR p_request_id IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000
     OR (p_evidence_ref IS NULL)<>(p_evidence_sha256 IS NULL)
     OR (p_cash_binding_evidence_ref IS NULL)<>(p_cash_binding_evidence_sha256 IS NULL)
     OR (p_cash_account_id IS NULL)<>(p_cash_account_version IS NULL)
     OR (p_evidence_ref IS NOT NULL AND (length(btrim(p_evidence_ref)) NOT BETWEEN 1 AND 2000 OR p_evidence_sha256 !~ '^[0-9a-f]{64}$'))
     OR (p_cash_binding_evidence_ref IS NOT NULL AND (length(btrim(p_cash_binding_evidence_ref)) NOT BETWEEN 1 AND 2000 OR p_cash_binding_evidence_sha256 !~ '^[0-9a-f]{64}$'))
       OR (p_source_type='SERVICE_RECEIPT_CORRECTION' AND p_amount_halalah IS NULL)
      OR (p_source_type NOT IN ('SERVICE_RECEIPT','SERVICE_RECEIPT_CORRECTION') AND p_amount_halalah IS NOT NULL)
      OR (p_source_type NOT IN ('SUPPLIER_PAYMENT','SUPPLIER_PAYMENT_REVERSAL','SUPPLIER_ADVANCE_PAYMENT',
          'SUPPLIER_ADVANCE_PAYMENT_REVERSAL','SUPPLIER_ADVANCE_REFUND')
          AND (p_cash_binding_evidence_ref IS NOT NULL OR p_cash_account_id IS NOT NULL))
     OR p_matched_receipt_halalah IS NULL OR p_matched_receipt_halalah<0 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_ap_bridge') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED'; END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p JOIN public.accounting_profile_versions pv
    ON pv.profile_id=p.id AND pv.version=p.current_version WHERE p.singleton_key='g7' AND pv.activation_state='DEV_PROVISIONAL' FOR SHARE OF p;
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_not_active'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  v_snapshot:=public.accounting_ap_bridge_source_snapshot(p_source_type,p_source_record_id);
  IF v_snapshot IS NULL THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  v_hash:=encode(extensions.digest(convert_to(v_snapshot::text,'UTF8'),'sha256'),'hex');
  v_source_key:=v_snapshot->>'source_record_key'; v_economic_key:=v_snapshot->>'economic_event_key';
   v_amount:=CASE WHEN p_source_type IN ('SERVICE_RECEIPT','SERVICE_RECEIPT_CORRECTION') THEN coalesce(p_amount_halalah,0)
    ELSE (v_snapshot->>'amount_halalah')::bigint END;
   IF (p_amount_halalah IS NOT NULL AND p_amount_halalah<=0)
      OR (p_source_type NOT IN ('SERVICE_RECEIPT','SERVICE_RECEIPT_CORRECTION') AND coalesce(v_amount,0)<=0)
      OR (p_source_type NOT IN ('SUPPLIER_BILL') AND p_matched_receipt_halalah<>0)
     OR (p_source_type='SUPPLIER_BILL' AND p_matched_receipt_halalah>v_amount) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  v_direct:=p_direct_classification;
   v_lines:=CASE WHEN p_source_type IN ('SERVICE_RECEIPT','SERVICE_RECEIPT_CORRECTION') AND p_amount_halalah IS NULL THEN NULL
     ELSE public.accounting_ap_bridge_expected_lines(p_source_type,p_classification,v_amount,p_matched_receipt_halalah,v_direct) END;
  v_status:=CASE WHEN v_lines IS NULL THEN 'HELD' ELSE 'READY' END;
  v_held_code:=CASE WHEN v_lines IS NULL THEN 'unsupported_source_treatment' END;
  IF coalesce((v_snapshot->>'eligible')::boolean,false)=false THEN v_status:='HELD'; v_held_code:='source_not_eligible'; END IF;
   IF p_source_type IN ('SERVICE_RECEIPT','SERVICE_RECEIPT_CORRECTION')
      AND (p_amount_halalah IS NULL OR p_evidence_ref IS NULL OR v_direct IS NULL) THEN
    v_status:='HELD'; v_held_code:='classification_evidence_missing'; END IF;
  IF p_source_type='SUPPLIER_BILL' THEN
    IF coalesce((v_snapshot->'attributes'->>'vat_amount')::numeric,0)<>0 THEN v_status:='HELD'; v_held_code:='vat_not_supported'; END IF;
    IF p_matched_receipt_halalah<v_amount AND (v_direct IS NULL OR p_evidence_ref IS NULL) THEN
      v_status:='HELD'; v_held_code:='direct_residual_evidence_missing'; END IF;
  END IF;
  v_cash_needed:=p_source_type IN ('SUPPLIER_PAYMENT','SUPPLIER_PAYMENT_REVERSAL','SUPPLIER_ADVANCE_PAYMENT','SUPPLIER_ADVANCE_PAYMENT_REVERSAL','SUPPLIER_ADVANCE_REFUND');
  IF v_cash_needed AND (p_cash_binding_evidence_ref IS NULL OR p_cash_account_id IS NULL OR p_cash_account_version IS NULL) THEN
    v_status:='HELD'; v_held_code:='cash_account_evidence_missing'; END IF;
   IF p_accounting_date IS NULL THEN RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  IF v_status='READY' AND p_source_type='SUPPLIER_BILL' AND coalesce((v_snapshot->'attributes'->>'vat_amount')::numeric,0)<>0 THEN
    v_status:='HELD';v_held_code:='vat_not_supported'; END IF;
  v_original_type:=v_snapshot->>'reverses_source_type'; v_original_id:=nullif(v_snapshot->>'reverses_source_record_id','')::uuid;
  IF p_source_type IN ('SERVICE_RECEIPT_CORRECTION','SUPPLIER_PAYMENT_REVERSAL',
      'SUPPLIER_ADVANCE_PAYMENT_REVERSAL','SUPPLIER_ADVANCE_ALLOCATION_REVERSAL') THEN
    SELECT ev.* INTO v_original_version FROM public.accounting_ap_bridge_events e
      JOIN public.accounting_ap_bridge_event_versions ev ON ev.profile_id=e.profile_id AND ev.event_id=e.id AND ev.version=e.current_version
      JOIN public.accounting_ap_bridge_journal_links l ON l.profile_id=ev.profile_id AND l.event_id=ev.event_id AND l.event_version=ev.version
      JOIN public.accounting_source_effects se ON se.id=l.source_effect_id AND se.status='POSTED'
      WHERE e.profile_id=v_profile_id AND e.source_type=v_original_type AND e.source_record_id=v_original_id;
    IF NOT FOUND THEN v_status:='HELD'; v_held_code:='original_effect_missing';
    ELSIF p_source_type IN ('SUPPLIER_PAYMENT_REVERSAL','SUPPLIER_ADVANCE_PAYMENT_REVERSAL','SUPPLIER_ADVANCE_ALLOCATION_REVERSAL') AND v_original_version.amount_halalah<>v_amount THEN
      v_status:='HELD';v_held_code:='source_payload_conflict';
    ELSIF p_source_type IN ('SUPPLIER_PAYMENT_REVERSAL','SUPPLIER_ADVANCE_PAYMENT_REVERSAL')
        AND (v_original_version.cash_account_id IS DISTINCT FROM p_cash_account_id
          OR v_original_version.cash_account_version IS DISTINCT FROM p_cash_account_version) THEN
      v_status:='HELD';v_held_code:='cash_binding_mismatch';
    ELSIF p_source_type='SERVICE_RECEIPT_CORRECTION' AND v_original_version.direct_classification IS DISTINCT FROM v_direct THEN
      v_status:='HELD';v_held_code:='classification_evidence_missing';
    END IF;
  END IF;
  IF p_source_type='SERVICE_RECEIPT_CORRECTION' THEN
    SELECT coalesce(sum(CASE WHEN l.side='CREDIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0)
      INTO v_receipt_open FROM public.accounting_ap_bridge_journal_lines l
      JOIN public.accounting_ap_bridge_journal_links bl ON bl.profile_id=l.profile_id AND bl.event_id=l.event_id AND bl.event_version=l.event_version
      JOIN public.accounting_source_effects se ON se.id=bl.source_effect_id AND se.status='POSTED'
      WHERE l.profile_id=v_profile_id AND l.receipt_id=(v_snapshot->>'receipt_id')::uuid AND l.party_role='ACCRUED_LIABILITY';
    IF (p_classification='RECEIPT_CORRECTION_DECREASE' AND v_amount>v_receipt_open)
        OR ((v_snapshot->'attributes'->>'corrected_acceptance_status') NOT IN ('ACCEPTED','ACCEPTED_WITH_CONDITIONS')
         AND (p_classification<>'RECEIPT_CORRECTION_DECREASE' OR v_amount<>v_receipt_open)) THEN
      v_status:='HELD';v_held_code:='receipt_match_exceeds_accrual';
    END IF;
  END IF;
  IF p_source_type='SUPPLIER_PAYMENT' AND NOT EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_events e JOIN public.accounting_ap_bridge_event_versions ev
      ON ev.profile_id=e.profile_id AND ev.event_id=e.id AND ev.version=e.current_version AND ev.status='READY'
    JOIN public.accounting_ap_bridge_journal_links l ON l.profile_id=ev.profile_id AND l.event_id=ev.event_id AND l.event_version=ev.version
    JOIN public.accounting_source_effects se ON se.id=l.source_effect_id AND se.status='POSTED'
     WHERE e.profile_id=v_profile_id AND e.source_type='SUPPLIER_BILL' AND e.source_record_id=(v_snapshot->>'bill_id')::uuid
       AND ev.supplier_id=(v_snapshot->>'supplier_id')::uuid AND ev.service_id=(v_snapshot->>'service_id')::uuid
       AND ev.source_snapshot->'attributes'->>'commitment_id' IS NOT DISTINCT FROM v_snapshot->'attributes'->>'commitment_id') THEN
    v_status:='HELD';v_held_code:='original_effect_missing';
  END IF;
  IF p_source_type IN ('SUPPLIER_ADVANCE_ALLOCATION','SUPPLIER_ADVANCE_REFUND') AND NOT EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_events e JOIN public.accounting_ap_bridge_event_versions ev
      ON ev.profile_id=e.profile_id AND ev.event_id=e.id AND ev.version=e.current_version AND ev.status='READY'
    JOIN public.accounting_ap_bridge_journal_links l ON l.profile_id=ev.profile_id AND l.event_id=ev.event_id AND l.event_version=ev.version
    JOIN public.accounting_source_effects se ON se.id=l.source_effect_id AND se.status='POSTED'
    WHERE e.profile_id=v_profile_id AND e.source_type='SUPPLIER_ADVANCE_PAYMENT' AND ev.advance_id=(v_snapshot->>'advance_id')::uuid) THEN
    v_status:='HELD';v_held_code:='original_effect_missing';
  END IF;
  IF p_source_type='SUPPLIER_ADVANCE_ALLOCATION' AND NOT EXISTS(
    SELECT 1 FROM public.accounting_ap_bridge_events e JOIN public.accounting_ap_bridge_event_versions ev
      ON ev.profile_id=e.profile_id AND ev.event_id=e.id AND ev.version=e.current_version AND ev.status='READY'
    JOIN public.accounting_ap_bridge_journal_links l ON l.profile_id=ev.profile_id AND l.event_id=ev.event_id AND l.event_version=ev.version
    JOIN public.accounting_source_effects se ON se.id=l.source_effect_id AND se.status='POSTED'
    WHERE e.profile_id=v_profile_id AND e.source_type='SUPPLIER_BILL' AND e.source_record_id=(v_snapshot->>'bill_id')::uuid) THEN
    v_status:='HELD';v_held_code:='original_effect_missing';
  END IF;
  IF p_source_type='SUPPLIER_BILL' AND p_matched_receipt_halalah>0 AND NOT EXISTS(
      SELECT 1 FROM public.accounting_ap_bridge_events e JOIN public.accounting_ap_bridge_event_versions ev
        ON ev.profile_id=e.profile_id AND ev.event_id=e.id AND ev.version=e.current_version
      JOIN public.accounting_ap_bridge_journal_links l ON l.profile_id=ev.profile_id AND l.event_id=ev.event_id AND l.event_version=ev.version
      JOIN public.accounting_source_effects se ON se.id=l.source_effect_id AND se.status='POSTED'
       WHERE e.profile_id=v_profile_id AND e.source_type='SERVICE_RECEIPT' AND ev.status='READY'
         AND e.source_record_id=nullif(v_snapshot->'attributes'->>'receipt_id','')::uuid
         AND ev.supplier_id=(v_snapshot->>'supplier_id')::uuid
         AND ev.service_id IS NOT DISTINCT FROM nullif(v_snapshot->>'service_id','')::uuid
         AND ev.source_snapshot->'attributes'->>'commitment_id' IS NOT DISTINCT FROM v_snapshot->'attributes'->>'commitment_id') THEN
    v_status:='HELD';v_held_code:='receipt_accrual_missing';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e1-profile:'||v_profile_id::text,0));
  SELECT e.* INTO v_prior FROM public.accounting_foundation_events e WHERE e.profile_id=v_profile_id
    AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id;
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object('source_type',p_source_type,
    'source_record_id',p_source_record_id,'expected_version',p_expected_version,'classification',p_classification,
    'amount_halalah',v_amount,'matched_receipt_halalah',p_matched_receipt_halalah,'direct_classification',v_direct,
    'accounting_date',p_accounting_date,'source_snapshot_sha256',v_hash,'evidence_ref',p_evidence_ref,
    'evidence_sha256',p_evidence_sha256,'cash_binding_evidence_ref',p_cash_binding_evidence_ref,
    'cash_binding_evidence_sha256',p_cash_binding_evidence_sha256,'cash_account_id',p_cash_account_id,
    'cash_account_version',p_cash_account_version,'reason',btrim(p_reason))::text,'UTF8'),'sha256'),'hex');
  IF FOUND THEN
    IF v_prior.payload_fingerprint<>v_fingerprint THEN RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
    RETURN QUERY SELECT NULL::text,v_prior.entity_id,v_prior.entity_version,
      CASE WHEN v_prior.event_type='accounting_ap_bridge_event_held' THEN 'HELD' ELSE 'READY' END,true; RETURN;
  END IF;
  SELECT e.* INTO v_event FROM public.accounting_ap_bridge_events e WHERE e.profile_id=v_profile_id
    AND e.source_type=p_source_type AND e.source_record_id=p_source_record_id FOR UPDATE;
  IF FOUND THEN
    IF v_event.current_version<>p_expected_version THEN RETURN QUERY SELECT 'revision_conflict'::text,v_event.id,v_event.current_version,NULL::text,false; RETURN; END IF;
    IF EXISTS(SELECT 1 FROM public.accounting_ap_bridge_event_versions old WHERE old.profile_id=v_profile_id
      AND old.event_id=v_event.id AND old.source_snapshot_sha256<>v_hash) THEN
      RETURN QUERY SELECT 'source_payload_conflict'::text,v_event.id,v_event.current_version,NULL::text,false; RETURN; END IF;
    IF EXISTS(SELECT 1 FROM public.accounting_ap_bridge_journal_links l WHERE l.profile_id=v_profile_id AND l.event_id=v_event.id) THEN
      RETURN QUERY SELECT 'source_identity_immutable'::text,v_event.id,v_event.current_version,NULL::text,false; RETURN; END IF;
    v_version:=v_event.current_version+1;
  ELSE
    IF p_expected_version<>0 THEN RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,0,NULL::text,false; RETURN; END IF;
    INSERT INTO public.accounting_ap_bridge_events(profile_id,source_type,source_record_id,source_record_key,economic_event_key)
      VALUES(v_profile_id,p_source_type,p_source_record_id,v_source_key,v_economic_key) RETURNING * INTO v_event;
    v_version:=1;
  END IF;
  v_foundation_id:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(v_foundation_id,v_profile_id,CASE WHEN v_status='HELD' THEN 'accounting_ap_bridge_event_held' ELSE 'accounting_ap_bridge_event_classified' END,
    'accounting_ap_bridge_event',v_event.id,v_version,p_actor_user_id,p_request_id,btrim(p_reason),p_evidence_ref,v_fingerprint,
    'accounting_ap_bridge_events/'||v_event.id::text||'/'||v_version::text,clock_timestamp());
  INSERT INTO public.accounting_ap_bridge_event_versions(profile_id,event_id,version,previous_version,status,classification,
    source_snapshot,source_snapshot_sha256,amount_halalah,matched_receipt_halalah,direct_classification,supplier_id,service_id,
    receipt_id,bill_id,advance_id,source_business_date,source_occurred_at,source_recorded_at,accounting_date,cash_account_id,
    cash_account_version,evidence_ref,evidence_sha256,cash_binding_evidence_ref,cash_binding_evidence_sha256,held_code,reason,
    created_by,payload_fingerprint,foundation_event_id)
  VALUES(v_profile_id,v_event.id,v_version,CASE WHEN v_version=1 THEN NULL ELSE v_version-1 END,v_status,p_classification,
    v_snapshot,v_hash,v_amount,p_matched_receipt_halalah,v_direct,(v_snapshot->>'supplier_id')::uuid,
    nullif(v_snapshot->>'service_id','')::uuid,nullif(v_snapshot->>'receipt_id','')::uuid,
    nullif(v_snapshot->>'bill_id','')::uuid,nullif(v_snapshot->>'advance_id','')::uuid,
    nullif(v_snapshot->>'source_business_date','')::date,nullif(v_snapshot->>'source_occurred_at','')::timestamptz,
    (v_snapshot->>'source_recorded_at')::timestamptz,p_accounting_date,p_cash_account_id,p_cash_account_version,
    p_evidence_ref,p_evidence_sha256,p_cash_binding_evidence_ref,p_cash_binding_evidence_sha256,v_held_code,btrim(p_reason),
    p_actor_user_id,v_fingerprint,v_foundation_id);
  UPDATE public.accounting_ap_bridge_events SET current_version=v_version WHERE profile_id=v_profile_id AND id=v_event.id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES(CASE WHEN v_status='HELD' THEN 'hold' ELSE 'classify' END,'accounting_ap_bridge_event',v_event.id,p_actor_user_id::text,
    jsonb_build_object('version',v_version,'request_id',p_request_id,'source_type',p_source_type,
      'source_record_id',p_source_record_id,'held_code',v_held_code),clock_timestamp());
  RETURN QUERY SELECT NULL::text,v_event.id,v_version,v_status,false;
EXCEPTION WHEN unique_violation THEN
  RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
WHEN invalid_text_representation OR numeric_value_out_of_range THEN
  RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
END;
$save_ap_bridge_event$;

CREATE FUNCTION public.accounting_ap_bridge_source_inventory(p_as_of_date date,p_recorded_at_cutoff timestamptz,p_limit integer)
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ap_source_inventory$
  WITH source_ids(source_type,source_record_id,source_date,recorded_at) AS (
    (SELECT 'SERVICE_RECEIPT',r.id,r.performance_date,r.created_at FROM public.service_receipts r
      WHERE r.created_at<=p_recorded_at_cutoff AND r.performance_date<=p_as_of_date
        AND coalesce((SELECT c.prior_acceptance_status FROM public.service_receipt_corrections c
          WHERE c.receipt_id=r.id ORDER BY c.correction_number LIMIT 1),r.acceptance_status)
          IN ('ACCEPTED','ACCEPTED_WITH_CONDITIONS') ORDER BY r.id LIMIT p_limit)
    UNION ALL
    (SELECT 'SERVICE_RECEIPT_CORRECTION',c.id,(c.corrected_at AT TIME ZONE 'Asia/Riyadh')::date,c.created_at
      FROM public.service_receipt_corrections c WHERE c.created_at<=p_recorded_at_cutoff
        AND c.corrected_at<=p_recorded_at_cutoff AND (c.corrected_at AT TIME ZONE 'Asia/Riyadh')::date<=p_as_of_date
      ORDER BY c.id LIMIT p_limit)
    UNION ALL
    (SELECT 'SUPPLIER_BILL',b.id,b.invoice_date,b.recorded_at FROM public.supplier_bills b
      WHERE b.recorded_at<=p_recorded_at_cutoff AND b.approved_at<=p_recorded_at_cutoff AND b.invoice_date<=p_as_of_date
      ORDER BY b.id LIMIT p_limit)
    UNION ALL
    (SELECT 'SUPPLIER_PAYMENT',p.id,p.payment_date,p.recorded_at FROM public.supplier_payments p
      WHERE p.recorded_at<=p_recorded_at_cutoff AND p.payment_date<=p_as_of_date ORDER BY p.id LIMIT p_limit)
    UNION ALL
    (SELECT 'SUPPLIER_PAYMENT_REVERSAL',r.id,(r.reversed_at AT TIME ZONE 'Asia/Riyadh')::date,r.reversed_at
      FROM public.supplier_payment_reversals r WHERE r.reversed_at<=p_recorded_at_cutoff
        AND (r.reversed_at AT TIME ZONE 'Asia/Riyadh')::date<=p_as_of_date ORDER BY r.id LIMIT p_limit)
    UNION ALL
    (SELECT 'SUPPLIER_ADVANCE_PAYMENT',p.id,p.payment_date,p.recorded_at FROM public.supplier_advance_payments p
      WHERE p.recorded_at<=p_recorded_at_cutoff AND p.payment_date<=p_as_of_date ORDER BY p.id LIMIT p_limit)
    UNION ALL
    (SELECT 'SUPPLIER_ADVANCE_PAYMENT_REVERSAL',r.id,(r.reversed_at AT TIME ZONE 'Asia/Riyadh')::date,r.reversed_at
      FROM public.supplier_advance_payment_reversals r WHERE r.reversed_at<=p_recorded_at_cutoff
        AND (r.reversed_at AT TIME ZONE 'Asia/Riyadh')::date<=p_as_of_date ORDER BY r.id LIMIT p_limit)
    UNION ALL
    (SELECT 'SUPPLIER_ADVANCE_ALLOCATION',a.id,(a.allocated_at AT TIME ZONE 'Asia/Riyadh')::date,a.allocated_at
      FROM public.supplier_advance_allocations a WHERE a.allocated_at<=p_recorded_at_cutoff
        AND (a.allocated_at AT TIME ZONE 'Asia/Riyadh')::date<=p_as_of_date ORDER BY a.id LIMIT p_limit)
    UNION ALL
    (SELECT 'SUPPLIER_ADVANCE_ALLOCATION_REVERSAL',r.id,(r.corrected_at AT TIME ZONE 'Asia/Riyadh')::date,r.corrected_at
      FROM public.supplier_advance_allocation_reversals r WHERE r.corrected_at<=p_recorded_at_cutoff
        AND (r.corrected_at AT TIME ZONE 'Asia/Riyadh')::date<=p_as_of_date ORDER BY r.id LIMIT p_limit)
    UNION ALL
    (SELECT 'SUPPLIER_ADVANCE_REFUND',r.id,r.business_date,r.recorded_at FROM public.supplier_advance_refunds r
      WHERE r.recorded_at<=p_recorded_at_cutoff AND r.business_date<=p_as_of_date ORDER BY r.id LIMIT p_limit)
  ), bounded AS MATERIALIZED (SELECT * FROM source_ids ORDER BY source_type,source_record_id LIMIT p_limit)
   SELECT public.accounting_ap_bridge_source_snapshot(b.source_type,b.source_record_id,p_recorded_at_cutoff)
     FROM bounded b WHERE public.accounting_ap_bridge_source_snapshot(b.source_type,b.source_record_id,p_recorded_at_cutoff) IS NOT NULL
       AND coalesce((public.accounting_ap_bridge_source_snapshot(b.source_type,b.source_record_id,p_recorded_at_cutoff)->>'eligible')::boolean,false)
      AND (public.accounting_ap_bridge_source_snapshot(b.source_type,b.source_record_id,p_recorded_at_cutoff)->>'source_recorded_at')::timestamptz<=p_recorded_at_cutoff
      AND coalesce(nullif(public.accounting_ap_bridge_source_snapshot(b.source_type,b.source_record_id,p_recorded_at_cutoff)->>'source_business_date','')::date,
        ((public.accounting_ap_bridge_source_snapshot(b.source_type,b.source_record_id,p_recorded_at_cutoff)->>'source_occurred_at')::timestamptz AT TIME ZONE 'Asia/Riyadh')::date)<=p_as_of_date;
$ap_source_inventory$;

CREATE FUNCTION public.prepare_accounting_ap_bridge_event(
  p_actor_user_id uuid,p_event_id uuid,p_event_version integer,p_period_id uuid,p_period_version integer,
  p_posting_rule_id uuid,p_rule_version integer,p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $prepare_ap_bridge_event$
DECLARE v_profile_id uuid; v_event public.accounting_ap_bridge_events%ROWTYPE; v_ev public.accounting_ap_bridge_event_versions%ROWTYPE;
  v_snapshot jsonb; v_lines jsonb; v_journal jsonb; v_result record; v_linked jsonb; v_balance bigint;
BEGIN
  IF p_actor_user_id IS NULL OR p_event_id IS NULL OR p_event_version IS NULL OR p_event_version<1 OR p_period_id IS NULL
     OR p_period_version IS NULL OR p_posting_rule_id IS NULL OR p_rule_version IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000 OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_ap_bridge') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED'; END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p JOIN public.accounting_profile_versions pv
    ON pv.profile_id=p.id AND pv.version=p.current_version WHERE p.singleton_key='g7' AND pv.activation_state='DEV_PROVISIONAL' FOR SHARE OF p;
  SELECT e.* INTO v_event FROM public.accounting_ap_bridge_events e WHERE e.profile_id=v_profile_id AND e.id=p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  SELECT ev.* INTO v_ev FROM public.accounting_ap_bridge_event_versions ev WHERE ev.profile_id=v_profile_id AND ev.event_id=p_event_id AND ev.version=p_event_version;
  IF v_event.current_version<>p_event_version THEN RETURN QUERY SELECT 'revision_conflict'::text,v_event.id,v_event.current_version,NULL::text,false; RETURN; END IF;
  IF NOT FOUND OR v_ev.status<>'READY' THEN RETURN QUERY SELECT 'unsupported_classification'::text,v_event.id,p_event_version,NULL::text,false; RETURN; END IF;
  v_snapshot:=public.accounting_ap_bridge_source_snapshot(v_event.source_type,v_event.source_record_id);
  IF v_snapshot IS NULL OR v_snapshot IS DISTINCT FROM v_ev.source_snapshot OR encode(extensions.digest(convert_to(v_snapshot::text,'UTF8'),'sha256'),'hex')<>v_ev.source_snapshot_sha256 THEN
    RETURN QUERY SELECT 'source_payload_conflict'::text,v_event.id,p_event_version,NULL::text,false; RETURN; END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_inception_coverage c JOIN public.accounting_inception_coverage_versions cv
    ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id AND cv.version=c.current_version
    WHERE c.profile_id=v_profile_id AND c.source_record_key=v_event.source_record_key AND c.economic_event_key=v_event.economic_event_key
      AND cv.classification IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE','UNRESOLVED')) THEN
    RETURN QUERY SELECT 'duplicate_coverage'::text,v_event.id,p_event_version,NULL::text,false; RETURN; END IF;
  IF v_event.source_type='SUPPLIER_BILL' AND v_ev.matched_receipt_halalah>0 THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e1-receipt:'||v_ev.receipt_id::text,0));
     SELECT coalesce(sum(CASE WHEN l.side='CREDIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0)
       INTO v_balance FROM public.accounting_ap_bridge_journal_lines l
       JOIN public.accounting_ap_bridge_journal_links bl ON bl.profile_id=l.profile_id AND bl.event_id=l.event_id AND bl.event_version=l.event_version
       JOIN public.accounting_source_effects se ON se.id=bl.source_effect_id AND se.status IN ('PREPARED','POSTED')
       WHERE l.profile_id=v_profile_id AND l.receipt_id=v_ev.receipt_id AND l.party_role='ACCRUED_LIABILITY'
         AND l.event_id<>v_event.id;
     IF v_ev.matched_receipt_halalah>v_balance THEN
      RETURN QUERY SELECT 'receipt_match_exceeds_accrual'::text,v_event.id,p_event_version,NULL::text,false; RETURN; END IF;
  END IF;
   IF v_event.source_type='SERVICE_RECEIPT_CORRECTION' AND v_ev.classification='RECEIPT_CORRECTION_DECREASE' THEN
     PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e1-receipt:'||v_ev.receipt_id::text,0));
     SELECT coalesce(sum(CASE WHEN l.side='CREDIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0)
       INTO v_balance FROM public.accounting_ap_bridge_journal_lines l
       JOIN public.accounting_ap_bridge_journal_links bl ON bl.profile_id=l.profile_id AND bl.event_id=l.event_id AND bl.event_version=l.event_version
       JOIN public.accounting_source_effects se ON se.id=bl.source_effect_id AND se.status IN ('PREPARED','POSTED')
       WHERE l.profile_id=v_profile_id AND l.receipt_id=v_ev.receipt_id AND l.party_role='ACCRUED_LIABILITY'
         AND l.event_id<>v_event.id;
     IF v_ev.amount_halalah>v_balance THEN
       RETURN QUERY SELECT 'receipt_match_exceeds_accrual'::text,v_event.id,p_event_version,NULL::text,false; RETURN;
     END IF;
   END IF;
  IF v_event.source_type='SUPPLIER_PAYMENT' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e1-bill:'||v_ev.bill_id::text,0));
    SELECT coalesce(sum(CASE WHEN l.side='CREDIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0)
      INTO v_balance FROM public.accounting_ap_bridge_journal_lines l
      JOIN public.accounting_ap_bridge_journal_links bl ON bl.profile_id=l.profile_id AND bl.event_id=l.event_id AND bl.event_version=l.event_version
      JOIN public.accounting_source_effects se ON se.id=bl.source_effect_id AND se.status IN ('PREPARED','POSTED')
       WHERE l.profile_id=v_profile_id AND l.bill_id=v_ev.bill_id AND l.party_role='ACCOUNTS_PAYABLE' AND l.event_id<>v_event.id;
    IF v_ev.amount_halalah>v_balance THEN RETURN QUERY SELECT 'payable_balance_insufficient'::text,v_event.id,p_event_version,NULL::text,false; RETURN; END IF;
  ELSIF v_event.source_type IN ('SUPPLIER_ADVANCE_ALLOCATION','SUPPLIER_ADVANCE_REFUND') THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e1-advance:'||v_ev.advance_id::text,0));
     IF v_event.source_type='SUPPLIER_ADVANCE_ALLOCATION' THEN
       PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e1-bill:'||v_ev.bill_id::text,0));
     END IF;
    SELECT coalesce(sum(CASE WHEN l.side='DEBIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0)
      INTO v_balance FROM public.accounting_ap_bridge_journal_lines l
      JOIN public.accounting_ap_bridge_journal_links bl ON bl.profile_id=l.profile_id AND bl.event_id=l.event_id AND bl.event_version=l.event_version
      JOIN public.accounting_source_effects se ON se.id=bl.source_effect_id AND se.status IN ('PREPARED','POSTED')
       WHERE l.profile_id=v_profile_id AND l.advance_id=v_ev.advance_id AND l.party_role='SUPPLIER_ADVANCE' AND l.event_id<>v_event.id;
    IF v_ev.amount_halalah>v_balance THEN RETURN QUERY SELECT 'supplier_advance_balance_insufficient'::text,v_event.id,p_event_version,NULL::text,false; RETURN; END IF;
    IF v_event.source_type='SUPPLIER_ADVANCE_ALLOCATION' THEN
      SELECT coalesce(sum(CASE WHEN l.side='CREDIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0)
        INTO v_balance FROM public.accounting_ap_bridge_journal_lines l
        JOIN public.accounting_ap_bridge_journal_links bl ON bl.profile_id=l.profile_id AND bl.event_id=l.event_id AND bl.event_version=l.event_version
        JOIN public.accounting_source_effects se ON se.id=bl.source_effect_id AND se.status IN ('PREPARED','POSTED')
         WHERE l.profile_id=v_profile_id AND l.bill_id=v_ev.bill_id AND l.party_role='ACCOUNTS_PAYABLE' AND l.event_id<>v_event.id;
      IF v_ev.amount_halalah>v_balance THEN RETURN QUERY SELECT 'payable_balance_insufficient'::text,v_event.id,p_event_version,NULL::text,false; RETURN; END IF;
    END IF;
   ELSIF v_event.source_type IN ('SUPPLIER_ADVANCE_PAYMENT','SUPPLIER_ADVANCE_PAYMENT_REVERSAL') THEN
     PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10e1-advance:'||v_ev.advance_id::text,0));
     IF v_event.source_type='SUPPLIER_ADVANCE_PAYMENT' THEN
       SELECT coalesce(sum(CASE WHEN l.side='DEBIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0)
         INTO v_balance FROM public.accounting_ap_bridge_journal_lines l
         JOIN public.accounting_ap_bridge_journal_links bl ON bl.profile_id=l.profile_id AND bl.event_id=l.event_id AND bl.event_version=l.event_version
         JOIN public.accounting_source_effects se ON se.id=bl.source_effect_id AND se.status IN ('PREPARED','POSTED')
         JOIN public.accounting_ap_bridge_events e ON e.profile_id=l.profile_id AND e.id=l.event_id
         WHERE l.profile_id=v_profile_id AND l.advance_id=v_ev.advance_id AND l.party_role='SUPPLIER_ADVANCE'
           AND e.source_type IN ('SUPPLIER_ADVANCE_PAYMENT','SUPPLIER_ADVANCE_PAYMENT_REVERSAL') AND e.id<>v_event.id;
       IF v_balance+v_ev.amount_halalah>round((v_ev.source_snapshot->'attributes'->>'authorized_amount')::numeric*100)::bigint THEN
         RETURN QUERY SELECT 'advance_authorization_exceeded'::text,v_event.id,p_event_version,NULL::text,false; RETURN;
       END IF;
     ELSE
       SELECT coalesce(sum(CASE WHEN l.side='DEBIT' THEN l.amount_halalah ELSE -l.amount_halalah END),0)
         INTO v_balance FROM public.accounting_ap_bridge_journal_lines l
         JOIN public.accounting_ap_bridge_journal_links bl ON bl.profile_id=l.profile_id AND bl.event_id=l.event_id AND bl.event_version=l.event_version
         JOIN public.accounting_source_effects se ON se.id=bl.source_effect_id AND se.status IN ('PREPARED','POSTED')
         WHERE l.profile_id=v_profile_id AND l.advance_id=v_ev.advance_id AND l.party_role='SUPPLIER_ADVANCE'
           AND l.event_id<>v_event.id;
       IF v_ev.amount_halalah>v_balance THEN
         RETURN QUERY SELECT 'supplier_advance_balance_insufficient'::text,v_event.id,p_event_version,NULL::text,false; RETURN;
       END IF;
     END IF;
  END IF;
  v_lines:=public.accounting_ap_bridge_expected_lines(v_event.source_type,v_ev.classification,v_ev.amount_halalah,v_ev.matched_receipt_halalah,v_ev.direct_classification);
  IF v_lines IS NULL THEN RETURN QUERY SELECT 'unsupported_classification'::text,v_event.id,p_event_version,NULL::text,false; RETURN; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('mapping_key',x->>'key','side',x->>'side','amount_halalah',(x->>'amount'),
      'service_id',v_ev.service_id,'description_en','AP bridge source effect','description_ar','أثر جسر الذمم الدائنة') ORDER BY n),'[]'::jsonb)
    INTO v_linked FROM jsonb_array_elements(v_lines) WITH ORDINALITY AS t(x,n);
  v_journal:=jsonb_build_object('source_domain','AP_BRIDGE','accounting_date',v_ev.accounting_date,
    'period_id',p_period_id,'period_version',p_period_version,'posting_rule_id',p_posting_rule_id,'rule_version',p_rule_version,
    'source_record_key',v_event.source_record_key,'economic_event_key',v_event.economic_event_key,'posting_purpose','ap_bridge',
    'description_en','AP bridge '||v_event.source_type||' '||v_event.source_record_id::text,
    'description_ar','جسر الذمم الدائنة '||v_event.source_record_id::text,'lines',v_linked);
  SELECT * INTO v_result FROM public.prepare_accounting_journal(p_actor_user_id,NULL,0,v_journal,btrim(p_reason),v_ev.evidence_ref,p_request_id);
  IF v_result.error_code IS NOT NULL THEN RETURN QUERY SELECT v_result.error_code,v_result.journal_id,v_result.version,v_result.status,v_result.idempotent_replay; RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_ap_bridge_journal_links l WHERE l.profile_id=v_profile_id AND l.event_id=v_event.id
      AND l.event_version=p_event_version AND l.journal_id=v_result.journal_id) THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AP_BRIDGE_LINK_MISSING'; END IF;
  RETURN QUERY SELECT NULL::text,v_result.journal_id,v_result.version,v_result.status,v_result.idempotent_replay;
END;
$prepare_ap_bridge_event$;

CREATE FUNCTION public.post_accounting_ap_bridge_journal(p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid)
RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $post_ap_bridge_journal$
DECLARE v_profile_id uuid; v_header public.accounting_journal_versions%ROWTYPE; v_prepared_version integer; v_result record;
BEGIN
  IF p_actor_user_id IS NULL OR p_journal_id IS NULL OR p_expected_version IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_ap_bridge') THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED'; END IF;
  SELECT j.profile_id INTO v_profile_id FROM public.accounting_journals j WHERE j.id=p_journal_id;
  SELECT v.* INTO v_header FROM public.accounting_journal_versions v JOIN public.accounting_journals j
    ON j.profile_id=v.profile_id AND j.id=v.journal_id AND j.current_version=v.version
    WHERE v.profile_id=v_profile_id AND v.journal_id=p_journal_id;
  IF NOT FOUND OR v_header.source_domain<>'AP_BRIDGE' THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  SELECT l.prepared_version INTO v_prepared_version FROM public.accounting_ap_bridge_journal_links l
    WHERE l.profile_id=v_profile_id AND l.journal_id=p_journal_id;
  IF NOT FOUND OR NOT public.accounting_ap_bridge_journal_link_authorized(v_profile_id,p_journal_id,v_prepared_version,v_header.prepared_by) THEN
    RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  SELECT * INTO v_result FROM public.post_accounting_journal(p_actor_user_id,p_journal_id,p_expected_version,p_request_id);
  RETURN QUERY SELECT v_result.error_code,v_result.journal_id,v_result.version,v_result.status,v_result.idempotent_replay;
END;
$post_ap_bridge_journal$;

CREATE FUNCTION public.get_accounting_ap_bridge_reconciliation(p_actor_user_id uuid,p_as_of_date date,p_recorded_at_cutoff timestamptz,p_limit integer DEFAULT 200)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $get_ap_bridge_reconciliation$
DECLARE v_profile_id uuid; v_cutover date; v_result jsonb;
BEGIN
  IF p_actor_user_id IS NULL OR p_as_of_date IS NULL OR p_recorded_at_cutoff IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'ACCOUNTING_AP_BRIDGE_INVALID_INPUT'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT (public.get_accounting_capability(p_actor_user_id,'accounting:view') OR public.get_accounting_capability(p_actor_user_id,'accounting:manage_ap_bridge')) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED'; END IF;
  SELECT p.id,pv.cutover_boundary_date INTO v_profile_id,v_cutover FROM public.accounting_profiles p
    JOIN public.accounting_profile_versions pv ON pv.profile_id=p.id AND pv.version=p.current_version WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN jsonb_build_object('state','NOT_INITIALIZED'); END IF;
  WITH inventory AS MATERIALIZED (SELECT item FROM public.accounting_ap_bridge_source_inventory(p_as_of_date,p_recorded_at_cutoff,p_limit+1)),
  joined AS MATERIALIZED (
    SELECT i.item,e.id event_id,ev.version event_version,ev.status event_status,ev.classification,ev.supplier_id,ev.service_id,
      ev.receipt_id,ev.bill_id,ev.advance_id,ev.amount_halalah,ev.matched_receipt_halalah,ev.source_business_date,
      ev.source_recorded_at,ev.accounting_date,ev.held_code,l.journal_id,jv.status effect_status,
      (SELECT count(*)::integer FROM public.accounting_source_effects sx WHERE sx.profile_id=v_profile_id
        AND sx.source_domain='AP_BRIDGE' AND sx.source_record_key=i.item->>'source_record_key'
        AND sx.economic_event_key=i.item->>'economic_event_key') effect_count,
      CASE WHEN jv.status='POSTED' AND jv.accounting_date<=p_as_of_date THEN jv.accounting_date END posted_accounting_date,
      jv.posted_at,
      coalesce(cv.classification='POST_CUTOVER_SOURCE',false) post_cutover_covered,
      coalesce(cv.classification IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE','UNRESOLVED'),false) inception_conflict
    FROM inventory i LEFT JOIN public.accounting_ap_bridge_events e ON e.profile_id=v_profile_id
      AND e.source_record_key=i.item->>'source_record_key' AND e.economic_event_key=i.item->>'economic_event_key'
      AND e.created_at<=p_recorded_at_cutoff
    LEFT JOIN LATERAL (SELECT x.* FROM public.accounting_ap_bridge_event_versions x WHERE x.profile_id=v_profile_id AND x.event_id=e.id
      AND x.created_at<=p_recorded_at_cutoff AND x.source_recorded_at<=p_recorded_at_cutoff ORDER BY x.version DESC LIMIT 1) ev ON true
    LEFT JOIN public.accounting_ap_bridge_journal_links l ON l.profile_id=v_profile_id AND l.event_id=e.id AND l.event_version=ev.version AND l.created_at<=p_recorded_at_cutoff
    LEFT JOIN public.accounting_source_effects se ON se.id=l.source_effect_id AND se.created_at<=p_recorded_at_cutoff
    LEFT JOIN LATERAL (SELECT x.* FROM public.accounting_journal_versions x WHERE x.profile_id=v_profile_id AND x.journal_id=l.journal_id
      AND x.created_at<=p_recorded_at_cutoff AND (x.status<>'POSTED' OR x.posted_at<=p_recorded_at_cutoff)
      ORDER BY x.version DESC LIMIT 1) jv ON se.id IS NOT NULL
    LEFT JOIN LATERAL (SELECT x.classification FROM public.accounting_inception_coverage c JOIN public.accounting_inception_coverage_versions x
      ON x.profile_id=c.profile_id AND x.coverage_id=c.id
      WHERE c.profile_id=v_profile_id AND c.source_record_key=i.item->>'source_record_key' AND c.economic_event_key=i.item->>'economic_event_key'
      AND x.created_at<=p_recorded_at_cutoff ORDER BY x.version DESC LIMIT 1) cv ON true
  ), visible AS (
      SELECT d.*,CASE WHEN inception_conflict THEN 'INCEPTION_COVERED' WHEN event_id IS NULL OR event_version IS NULL THEN 'MISSING_CLASSIFICATION'
        WHEN event_status='HELD' THEN 'HELD'
        WHEN effect_status='POSTED' AND posted_at IS NOT NULL AND posted_accounting_date IS NOT NULL THEN 'POSTED'
        WHEN effect_status='POSTED' AND posted_at IS NOT NULL THEN 'ACCOUNTING_DATE_AFTER_CUTOFF'
        WHEN effect_status='DRAFT' THEN 'PREPARED' ELSE 'MISSING_EFFECT' END reconciliation_status FROM joined d
     ORDER BY d.item->>'source_type',d.item->>'source_record_id' LIMIT p_limit
   ), posted_lineage AS MATERIALIZED (
     SELECT l.supplier_id,l.service_id,l.party_role,l.side,l.amount_halalah,
       jl.side ledger_side,jl.amount_halalah ledger_amount,av.control_classification,
       v.item->>'source_type' source_type,v.event_id,v.event_version,v.amount_halalah source_amount,
       v.matched_receipt_halalah,v.source_business_date,v.posted_accounting_date,v.posted_at,v.journal_id
     FROM visible v JOIN public.accounting_ap_bridge_journal_lines l ON l.profile_id=v_profile_id
       AND l.event_id=v.event_id AND l.event_version=v.event_version
     JOIN public.accounting_journal_line_versions jl ON jl.profile_id=l.profile_id AND jl.journal_id=l.journal_id
       AND jl.journal_version=l.journal_version AND jl.line_number=l.line_number
     JOIN public.accounting_account_versions av ON av.profile_id=jl.profile_id AND av.account_id=jl.account_id AND av.version=jl.account_version
     WHERE v.reconciliation_status='POSTED'
   ), role_totals AS (
     SELECT party_role,sum(CASE WHEN party_role='SUPPLIER_ADVANCE'
       THEN CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END
       ELSE CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END END)::bigint subledger_halalah
     FROM posted_lineage WHERE party_role IN ('ACCOUNTS_PAYABLE','ACCRUED_LIABILITY','SUPPLIER_ADVANCE') GROUP BY party_role
   ), ledger_totals AS (
     SELECT control_classification,sum(CASE WHEN control_classification='SUPPLIER_ADVANCE'
       THEN CASE WHEN ledger_side='DEBIT' THEN ledger_amount ELSE -ledger_amount END
       ELSE CASE WHEN ledger_side='CREDIT' THEN ledger_amount ELSE -ledger_amount END END)::bigint ledger_halalah
     FROM posted_lineage WHERE control_classification IN ('ACCOUNTS_PAYABLE','ACCRUED_LIABILITY','SUPPLIER_ADVANCE')
     GROUP BY control_classification
   ), control_balances AS (
     SELECT r.party_role,coalesce(s.subledger_halalah,0)::bigint subledger_halalah,
       coalesce(l.ledger_halalah,0)::bigint ledger_halalah,
       (coalesce(l.ledger_halalah,0)-coalesce(s.subledger_halalah,0))::bigint difference_halalah
     FROM (VALUES('ACCOUNTS_PAYABLE'::text),('ACCRUED_LIABILITY'::text),('SUPPLIER_ADVANCE'::text)) r(party_role)
     LEFT JOIN role_totals s ON s.party_role=r.party_role LEFT JOIN ledger_totals l ON l.control_classification=r.party_role
   ), supplier_balances AS (
     SELECT supplier_id,
       sum(CASE WHEN party_role='ACCOUNTS_PAYABLE' THEN CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint accounts_payable_halalah,
       sum(CASE WHEN party_role='ACCRUED_LIABILITY' THEN CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint accrued_unbilled_halalah,
       sum(CASE WHEN party_role='SUPPLIER_ADVANCE' THEN CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint supplier_advance_halalah,
       sum(CASE WHEN party_role IN ('ACCOUNTS_PAYABLE','ACCRUED_LIABILITY','SUPPLIER_ADVANCE') THEN
         CASE WHEN party_role='SUPPLIER_ADVANCE' THEN
           CASE WHEN ledger_side='DEBIT' THEN ledger_amount ELSE -ledger_amount END-
           CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END
         ELSE CASE WHEN ledger_side='CREDIT' THEN ledger_amount ELSE -ledger_amount END-
           CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END END ELSE 0 END)::bigint difference_halalah
     FROM posted_lineage GROUP BY supplier_id
   ), service_balances AS (
     SELECT service_id,
       sum(CASE WHEN party_role='ACCOUNTS_PAYABLE' THEN CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint accounts_payable_halalah,
       sum(CASE WHEN party_role='ACCRUED_LIABILITY' THEN CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint accrued_unbilled_halalah,
       sum(CASE WHEN party_role='SUPPLIER_ADVANCE' THEN CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END ELSE 0 END)::bigint supplier_advance_halalah,
       sum(CASE WHEN party_role IN ('ACCOUNTS_PAYABLE','ACCRUED_LIABILITY','SUPPLIER_ADVANCE') THEN
         CASE WHEN party_role='SUPPLIER_ADVANCE' THEN
           CASE WHEN ledger_side='DEBIT' THEN ledger_amount ELSE -ledger_amount END-
           CASE WHEN side='DEBIT' THEN amount_halalah ELSE -amount_halalah END
         ELSE CASE WHEN ledger_side='CREDIT' THEN ledger_amount ELSE -ledger_amount END-
           CASE WHEN side='CREDIT' THEN amount_halalah ELSE -amount_halalah END END ELSE 0 END)::bigint difference_halalah
     FROM posted_lineage WHERE service_id IS NOT NULL GROUP BY service_id
   )
  SELECT jsonb_build_object('state','READY','as_of_date',p_as_of_date,'recorded_at_cutoff',p_recorded_at_cutoff,
    'cutover_boundary_date',v_cutover,'bank_reconciled',false,'source_event_count',(SELECT count(*) FROM visible),
    'posted_effect_count',(SELECT count(*) FROM visible WHERE reconciliation_status='POSTED'),
    'held_count',(SELECT count(*) FROM visible WHERE reconciliation_status='HELD'),
    'missing_effect_count',(SELECT count(*) FROM visible WHERE reconciliation_status IN ('MISSING_CLASSIFICATION','MISSING_EFFECT')),
    'inception_conflict_count',(SELECT count(*) FROM visible WHERE reconciliation_status='INCEPTION_COVERED'),
     'expected_effect_count',(SELECT count(*) FROM visible WHERE reconciliation_status<>'INCEPTION_COVERED'),
     'duplicate_conflict_count',(SELECT count(*) FROM visible WHERE effect_count>1),
     'control_difference_count',(SELECT count(*) FROM control_balances WHERE difference_halalah<>0),
     'supplier_difference_count',(SELECT count(*) FROM supplier_balances WHERE difference_halalah<>0),
     'service_difference_count',(SELECT count(*) FROM service_balances WHERE difference_halalah<>0),
     'accrued_unbilled_halalah',coalesce((SELECT subledger_halalah FROM control_balances WHERE party_role='ACCRUED_LIABILITY'),0)::text,
     'accounts_payable_halalah',coalesce((SELECT subledger_halalah FROM control_balances WHERE party_role='ACCOUNTS_PAYABLE'),0)::text,
     'supplier_advance_halalah',coalesce((SELECT subledger_halalah FROM control_balances WHERE party_role='SUPPLIER_ADVANCE'),0)::text,
     'control_balances',coalesce((SELECT jsonb_agg(jsonb_build_object('party_role',party_role,
       'subledger_halalah',subledger_halalah::text,'ledger_halalah',ledger_halalah::text,'difference_halalah',difference_halalah::text)
       ORDER BY party_role) FROM control_balances),'[]'::jsonb),
     'supplier_balances',coalesce((SELECT jsonb_agg(jsonb_build_object('supplier_id',supplier_id,
       'accounts_payable_halalah',accounts_payable_halalah::text,'accrued_unbilled_halalah',accrued_unbilled_halalah::text,
       'supplier_advance_halalah',supplier_advance_halalah::text,'difference_halalah',difference_halalah::text)
       ORDER BY supplier_id) FROM supplier_balances),'[]'::jsonb),
     'service_balances',coalesce((SELECT jsonb_agg(jsonb_build_object('service_id',service_id,
       'accounts_payable_halalah',accounts_payable_halalah::text,'accrued_unbilled_halalah',accrued_unbilled_halalah::text,
       'supplier_advance_halalah',supplier_advance_halalah::text,'difference_halalah',difference_halalah::text)
       ORDER BY service_id) FROM service_balances),'[]'::jsonb),
     'matching_coverage',jsonb_build_object('bill_amount_halalah',coalesce((SELECT sum(amount_halalah) FROM visible
       WHERE item->>'source_type'='SUPPLIER_BILL' AND reconciliation_status='POSTED'),0)::text,
       'matched_receipt_halalah',coalesce((SELECT sum(matched_receipt_halalah) FROM visible
       WHERE item->>'source_type'='SUPPLIER_BILL' AND reconciliation_status='POSTED'),0)::text,
       'direct_residual_halalah',coalesce((SELECT sum(amount_halalah-matched_receipt_halalah) FROM visible
       WHERE item->>'source_type'='SUPPLIER_BILL' AND reconciliation_status='POSTED'),0)::text),
     'timing_difference_count',(SELECT count(*) FROM visible WHERE reconciliation_status='POSTED'
       AND source_business_date IS NOT NULL AND posted_accounting_date IS DISTINCT FROM source_business_date),
     'timing_differences',coalesce((SELECT jsonb_agg(jsonb_build_object('source_type',item->>'source_type',
       'source_record_id',item->>'source_record_id','supplier_id',coalesce(supplier_id,(item->>'supplier_id')::uuid),
       'service_id',coalesce(service_id,nullif(item->>'service_id','')::uuid),
       'source_business_date',coalesce(source_business_date,nullif(item->>'source_business_date','')::date),
       'accounting_date',posted_accounting_date,'days_difference',posted_accounting_date-source_business_date,
       'amount_halalah',coalesce(amount_halalah,(item->>'amount_halalah')::bigint)::text)
       ORDER BY item->>'source_type',item->>'source_record_id') FROM visible WHERE reconciliation_status='POSTED'
       AND source_business_date IS NOT NULL AND posted_accounting_date IS DISTINCT FROM source_business_date),'[]'::jsonb),
    'truncated',(SELECT count(*)>p_limit FROM inventory),
    'events',coalesce((SELECT jsonb_agg(jsonb_build_object('source_type',item->>'source_type','source_record_id',item->>'source_record_id',
      'source_record_key',item->>'source_record_key','economic_event_key',item->>'economic_event_key','reconciliation_status',reconciliation_status,
      'event_id',event_id,'event_version',event_version,'classification',classification,'supplier_id',coalesce(supplier_id,(item->>'supplier_id')::uuid),
      'service_id',coalesce(service_id,nullif(item->>'service_id','')::uuid),'receipt_id',coalesce(receipt_id,nullif(item->>'receipt_id','')::uuid),
      'bill_id',coalesce(bill_id,nullif(item->>'bill_id','')::uuid),'advance_id',coalesce(advance_id,nullif(item->>'advance_id','')::uuid),
      'amount_halalah',coalesce(amount_halalah,(item->>'amount_halalah')::bigint)::text,'matched_receipt_halalah',matched_receipt_halalah::text,
      'source_business_date',coalesce(source_business_date,nullif(item->>'source_business_date','')::date),
      'source_recorded_at',coalesce(source_recorded_at,(item->>'source_recorded_at')::timestamptz),'accounting_date',accounting_date,
      'posted_accounting_date',posted_accounting_date,'posted_at',posted_at,'journal_id',journal_id,'held_code',held_code,
      'post_cutover_covered',post_cutover_covered,'inception_conflict',inception_conflict) ORDER BY item->>'source_type',item->>'source_record_id') FROM visible),'[]'::jsonb)) INTO v_result;
  RETURN v_result;
END;
$get_ap_bridge_reconciliation$;

-- Extend the W10D journal seam without altering W10A-C or W10D behavior.
DO $w10e1_account_engine_extension$
DECLARE v_function oid; v_source text; v_repaired text; v_old text; v_new text;
  v_owner oid; v_acl aclitem[]; v_config text[]; v_after_owner oid; v_after_acl aclitem[]; v_after_config text[];
  v_volatility "char"; v_parallel "char"; v_cost real; v_rows real; v_strict boolean; v_leakproof boolean; v_security boolean;
BEGIN
  v_function:=to_regprocedure('public.save_accounting_account(uuid,uuid,integer,jsonb,text,text,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef
    INTO v_source,v_owner,v_acl,v_config,v_volatility,v_parallel,v_cost,v_rows,v_strict,v_leakproof,v_security FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_function IS NULL OR v_source IS NULL OR NOT v_security OR v_volatility<>'v' OR v_parallel<>'u' OR v_cost<>100 OR v_rows<>1000 OR v_strict OR v_leakproof
     OR v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN RAISE EXCEPTION 'W10E1 preflight: account save RPC contract differs'; END IF;
  v_old:='''ACCOUNTS_PAYABLE'',''CUSTOMER_ADVANCE''';
  v_new:='''ACCOUNTS_PAYABLE'',''ACCRUED_LIABILITY'',''CUSTOMER_ADVANCE''';
  IF position(v_old in v_source)=0 OR length(v_source)-length(replace(v_source,v_old,''))<>length(v_old) THEN RAISE EXCEPTION 'W10E1 preflight: account classification allowlist differs'; END IF;
  v_repaired:=replace(v_source,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.save_accounting_account(p_actor_user_id uuid,p_account_id uuid,p_expected_version integer,p_account jsonb,p_reason text,p_evidence_ref text,p_request_id uuid)
    RETURNS TABLE(error_code text,account_id uuid,version integer,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);
  SELECT p.proowner,p.proacl,p.proconfig INTO v_after_owner,v_after_acl,v_after_config FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl OR v_after_config IS DISTINCT FROM v_config THEN RAISE EXCEPTION 'W10E1 postflight: account save ACL or configuration changed'; END IF;

  v_function:=to_regprocedure('public.validate_accounting_posting_rule_mapping()');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef
    INTO v_source,v_owner,v_acl,v_config,v_volatility,v_parallel,v_cost,v_rows,v_strict,v_leakproof,v_security FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_function IS NULL OR v_source IS NULL OR NOT v_security OR v_volatility<>'v' OR v_parallel<>'u' OR v_cost<>100 OR v_rows<>0 OR v_strict OR v_leakproof
     OR v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN RAISE EXCEPTION 'W10E1 preflight: mapping validator contract differs'; END IF;
  v_old:='NOT (public.accounting_inception_mapping_authorized(NEW.profile_id,NEW.posting_rule_id,NEW.rule_version,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ar_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version))';
  v_new:='NOT (public.accounting_inception_mapping_authorized(NEW.profile_id,NEW.posting_rule_id,NEW.rule_version,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ar_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version) OR public.accounting_ap_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,NEW.account_id,NEW.account_version))';
  IF length(v_source)-length(replace(v_source,v_old,''))<>length(v_old) THEN RAISE EXCEPTION 'W10E1 preflight: mapping authorization anchor differs'; END IF;
  v_repaired:=replace(v_source,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.validate_accounting_posting_rule_mapping() RETURNS trigger LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);
  SELECT p.proowner,p.proacl,p.proconfig INTO v_after_owner,v_after_acl,v_after_config FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl OR v_after_config IS DISTINCT FROM v_config THEN RAISE EXCEPTION 'W10E1 postflight: mapping validator ACL changed'; END IF;

  v_function:=to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef
    INTO v_source,v_owner,v_acl,v_config,v_volatility,v_parallel,v_cost,v_rows,v_strict,v_leakproof,v_security FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_function IS NULL OR v_source IS NULL OR NOT v_security OR v_volatility<>'v' OR v_parallel<>'u' OR v_cost<>100 OR v_rows<>1000 OR v_strict OR v_leakproof
     OR v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN RAISE EXCEPTION 'W10E1 preflight: journal prepare contract differs'; END IF;
  v_repaired:=v_source;
  v_old:='p_journal->>''source_domain'' NOT IN (''INCEPTION'',''AR_BRIDGE'')'; v_new:='p_journal->>''source_domain'' NOT IN (''INCEPTION'',''AR_BRIDGE'',''AP_BRIDGE'')';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN RAISE EXCEPTION 'W10E1 preflight: prepare payload gate differs'; END IF; v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='v_source_domain NOT IN (concat(''CONTROLLED_'',''MANUAL''),''INCEPTION'',''AR_BRIDGE'')'; v_new:='v_source_domain NOT IN (concat(''CONTROLLED_'',''MANUAL''),''INCEPTION'',''AR_BRIDGE'',''AP_BRIDGE'')';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN RAISE EXCEPTION 'W10E1 preflight: prepare domain gate differs'; END IF; v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:prepare_journal'') AND NOT (v_source_domain=''AR_BRIDGE'' AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ar_bridge'')) THEN';
  v_new:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:prepare_journal'') AND NOT (v_source_domain=''AR_BRIDGE'' AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ar_bridge'')) AND NOT (v_source_domain=''AP_BRIDGE'' AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ap_bridge'')) THEN';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN RAISE EXCEPTION 'W10E1 preflight: prepare authority gate differs'; END IF; v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='public.accounting_inception_journal_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain=''AR_BRIDGE'' AND public.accounting_ar_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)))';
  v_new:='public.accounting_inception_journal_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain=''AR_BRIDGE'' AND public.accounting_ar_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)) OR (v_source_domain=''AP_BRIDGE'' AND public.accounting_ap_bridge_line_authorized(v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)))';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN RAISE EXCEPTION 'W10E1 preflight: prepare line authorization gate differs'; END IF; v_repaired:=replace(v_repaired,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.prepare_accounting_journal(p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_journal jsonb,p_reason text,p_evidence_ref text,p_request_id uuid)
    RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);
  SELECT p.proowner,p.proacl,p.proconfig INTO v_after_owner,v_after_acl,v_after_config FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl OR v_after_config IS DISTINCT FROM v_config THEN RAISE EXCEPTION 'W10E1 postflight: journal prepare ACL changed'; END IF;

  v_function:=to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef
    INTO v_source,v_owner,v_acl,v_config,v_volatility,v_parallel,v_cost,v_rows,v_strict,v_leakproof,v_security FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_function IS NULL OR v_source IS NULL OR NOT v_security OR v_volatility<>'v' OR v_parallel<>'u' OR v_cost<>100 OR v_rows<>1000 OR v_strict OR v_leakproof
     OR v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN RAISE EXCEPTION 'W10E1 preflight: journal post contract differs'; END IF;
  v_repaired:=v_source;
  v_old:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:post_journal'') AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain=''AR_BRIDGE'') AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ar_bridge'')) THEN';
  v_new:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:post_journal'') AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain=''AR_BRIDGE'') AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ar_bridge'')) AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax WHERE ax.journal_id=p_journal_id AND ax.source_domain=''AP_BRIDGE'') AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ap_bridge'')) THEN';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN RAISE EXCEPTION 'W10E1 preflight: post authority gate differs'; END IF; v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='  IF v_header.status=''POSTED'' THEN';
  v_new:=$ap_post_guard$
  IF v_header.source_domain='AP_BRIDGE' AND (NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_ap_bridge')
     OR NOT public.accounting_ap_bridge_journal_link_authorized(v_profile_id,p_journal_id,v_header.version,v_header.prepared_by)) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AP_BRIDGE_JOURNAL_NOT_AUTHORIZED';
  END IF;
  IF v_header.status='POSTED' THEN
  $ap_post_guard$;
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN RAISE EXCEPTION 'W10E1 preflight: post link guard differs'; END IF; v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='OR NOT av.is_active OR ((av.is_protected OR av.control_classification<>''NONE'') AND NOT (v_header.source_domain=''INCEPTION'' OR (v_header.source_domain=''AR_BRIDGE'' AND public.accounting_ar_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by))))';
  v_new:='OR NOT av.is_active OR ((av.is_protected OR av.control_classification<>''NONE'') AND NOT (v_header.source_domain=''INCEPTION'' OR (v_header.source_domain=''AR_BRIDGE'' AND public.accounting_ar_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by)) OR (v_header.source_domain=''AP_BRIDGE'' AND public.accounting_ap_bridge_journal_account_authorized(v_profile_id,p_journal_id,v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by))))';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN RAISE EXCEPTION 'W10E1 preflight: post protected-account gate differs'; END IF; v_repaired:=replace(v_repaired,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.post_accounting_journal(p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid)
    RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean) LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);
  SELECT p.proowner,p.proacl,p.proconfig INTO v_after_owner,v_after_acl,v_after_config FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl OR v_after_config IS DISTINCT FROM v_config THEN RAISE EXCEPTION 'W10E1 postflight: journal post ACL changed'; END IF;

  v_function:=to_regprocedure('public.reverse_accounting_journal(uuid,uuid,uuid,date,text,text,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,p.proisstrict,p.proleakproof,p.prosecdef
    INTO v_source,v_owner,v_acl,v_config,v_volatility,v_parallel,v_cost,v_rows,v_strict,v_leakproof,v_security FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_function IS NULL OR v_source IS NULL OR NOT v_security OR v_volatility<>'v' OR v_parallel<>'u' OR v_cost<>100 OR v_rows<>1000 OR v_strict OR v_leakproof
     OR v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN RAISE EXCEPTION 'W10E1 preflight: generic journal reversal contract differs'; END IF;
  v_old:='IF NOT FOUND OR v_original.status<>''POSTED'' OR v_original_identity.reversal_of_journal_id IS NOT NULL OR v_original.source_domain=''INCEPTION'' THEN';
  v_new:='IF NOT FOUND OR v_original.status<>''POSTED'' OR v_original_identity.reversal_of_journal_id IS NOT NULL OR v_original.source_domain=''INCEPTION'' OR v_original.source_domain=''AP_BRIDGE'' THEN';
  IF length(v_source)-length(replace(v_source,v_old,''))<>length(v_old) THEN RAISE EXCEPTION 'W10E1 preflight: generic reversal source-domain gate differs'; END IF;
  v_repaired:=replace(v_source,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.reverse_accounting_journal(p_actor_user_id uuid,p_original_journal_id uuid,p_period_id uuid,p_accounting_date date,p_reason text,p_evidence_ref text,p_request_id uuid)
    RETURNS TABLE(error_code text,journal_id uuid,version integer,original_journal_id uuid,idempotent_replay boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);
  SELECT p.proowner,p.proacl,p.proconfig INTO v_after_owner,v_after_acl,v_after_config FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl OR v_after_config IS DISTINCT FROM v_config THEN RAISE EXCEPTION 'W10E1 postflight: generic journal reversal ACL changed'; END IF;
END;
$w10e1_account_engine_extension$;

REVOKE ALL ON FUNCTION public.prevent_accounting_ap_bridge_history_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ap_bridge_source_snapshot(text,uuid,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ap_bridge_account_authorized(uuid,text,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ap_bridge_expected_lines(text,text,bigint,bigint,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ap_bridge_line_authorized(uuid,jsonb,integer,text,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ap_bridge_journal_link_authorized(uuid,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ap_bridge_journal_account_authorized(uuid,uuid,integer,integer,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ap_bridge_source_effect_link() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ap_bridge_source_inventory(date,timestamptz,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_accounting_ap_bridge_event(uuid,text,uuid,integer,text,bigint,bigint,text,date,text,text,text,text,uuid,integer,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prepare_accounting_ap_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.post_accounting_ap_bridge_journal(uuid,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_accounting_ap_bridge_reconciliation(uuid,date,timestamptz,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_accounting_ap_bridge_event(uuid,text,uuid,integer,text,bigint,bigint,text,date,text,text,text,text,uuid,integer,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_accounting_ap_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_accounting_ap_bridge_journal(uuid,uuid,integer,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_ap_bridge_reconciliation(uuid,date,timestamptz,integer) TO service_role;

COMMIT;
