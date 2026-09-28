-- W10D: source-linked Accounts Receivable accounting bridge.
-- Additive only; this migration records classifications and accounting effects
-- without changing W7 operational financial history.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL
     OR to_regclass('public.accounting_foundation_events') IS NULL
     OR to_regclass('public.accounting_capability_catalog') IS NULL
     OR to_regclass('public.accounting_journal_versions') IS NULL
     OR to_regclass('public.accounting_source_effects') IS NULL
     OR to_regclass('public.accounting_inception_coverage') IS NULL
     OR to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)') IS NULL
     OR to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)') IS NULL
     OR to_regclass('public.customer_receipt_allocations') IS NULL
     OR to_regclass('public.customer_credit_applications') IS NULL
     OR to_regclass('public.customer_refunds') IS NULL THEN
    RAISE EXCEPTION 'W10D preflight: accepted W7/W10 accounting foundation is incomplete';
  END IF;
  IF EXISTS (SELECT 1 FROM public.accounting_capability_catalog WHERE capability='accounting:manage_ar_bridge')
     OR to_regclass('public.accounting_ar_bridge_events') IS NOT NULL
     OR to_regprocedure('public.save_accounting_ar_bridge_event(uuid,text,uuid,integer,text,date,text,text,text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'W10D preflight: target bridge already exists';
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
    'accounting_ar_bridge_event_classified','accounting_ar_bridge_event_held'
  )),
  ADD CONSTRAINT accounting_foundation_events_entity_type_check CHECK (entity_type IN (
    'capability_assignment','accounting_profile','accounting_account','accounting_period',
    'accounting_posting_rule','accounting_journal','accounting_inception_package',
    'accounting_inception_review','accounting_inception_acceptance','accounting_ar_bridge_event'
  ));

ALTER TABLE public.accounting_capability_catalog
  DROP CONSTRAINT accounting_capability_catalog_key_check,
  DROP CONSTRAINT accounting_capability_catalog_state_check,
  ADD CONSTRAINT accounting_capability_catalog_key_check CHECK (capability IN (
    'accounting:view','accounting:manage_profile','accounting:manage_authority',
    'accounting:manage_chart','accounting:manage_periods',
    'accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal',
    'accounting:manage_inception','accounting:manage_ar_bridge','accounting:reconcile_bank',
    'accounting:close_period','accounting:reopen_period','accounting:view_statements'
  )),
  ADD CONSTRAINT accounting_capability_catalog_state_check CHECK (
    (capability IN ('accounting:view','accounting:manage_profile')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_authority'
      AND enabled AND NOT runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability IN ('accounting:manage_chart','accounting:manage_periods')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability IN ('accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10B')
    OR (capability='accounting:manage_inception'
      AND enabled AND runtime_allow_grantable AND owner_slice='W10C')
    OR (capability='accounting:manage_ar_bridge'
      AND enabled AND runtime_allow_grantable AND owner_slice='W10D')
    OR (capability='accounting:reconcile_bank'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10G')
    OR (capability IN ('accounting:close_period','accounting:reopen_period')
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I')
    OR (capability='accounting:view_statements'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10H')
  );
INSERT INTO public.accounting_capability_catalog(capability,enabled,runtime_allow_grantable,owner_slice)
VALUES('accounting:manage_ar_bridge',true,true,'W10D');

ALTER TABLE public.accounting_journal_versions
  DROP CONSTRAINT accounting_journal_versions_source_domain_check,
  ADD CONSTRAINT accounting_journal_versions_source_domain_check
    CHECK(source_domain IN ('CONTROLLED_MANUAL','INCEPTION','AR_BRIDGE'));
ALTER TABLE public.accounting_source_effects
  DROP CONSTRAINT accounting_source_effects_source_domain_check,
  ADD CONSTRAINT accounting_source_effects_source_domain_check
    CHECK(source_domain IN ('CONTROLLED_MANUAL','INCEPTION','AR_BRIDGE'));

CREATE TABLE public.accounting_ar_bridge_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  source_type text NOT NULL CHECK(source_type IN (
    'INVOICE','PAYMENT','RECEIPT','ALLOCATION','RECEIPT_REVERSAL','ALLOCATION_REVERSAL',
    'CREDIT_ADJUSTMENT','CREDIT_ADJUSTMENT_REVERSAL','CREDIT_APPLICATION',
    'CREDIT_APPLICATION_REVERSAL','REFUND','REFUND_REVERSAL')),
  source_record_id uuid NOT NULL,
  source_record_key text NOT NULL CHECK(length(btrim(source_record_key)) BETWEEN 1 AND 200),
  economic_event_key text NOT NULL CHECK(length(btrim(economic_event_key)) BETWEEN 1 AND 200),
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id),
  UNIQUE(profile_id,source_type,source_record_id),
  UNIQUE(profile_id,source_record_key,economic_event_key)
);

CREATE TABLE public.accounting_ar_bridge_event_versions (
  profile_id uuid NOT NULL,
  event_id uuid NOT NULL,
  version integer NOT NULL CHECK(version>0),
  previous_version integer,
  status text NOT NULL CHECK(status IN ('READY','HELD')),
  classification text NOT NULL CHECK(classification IN (
    'UNCONDITIONAL_CONTRACT_LIABILITY','UNCONDITIONAL_CONTRACT_ASSET',
    'CUSTOMER_ADVANCE','SETTLEMENT','REVERSAL','CUSTOMER_LIABILITY',
    'CUSTOMER_LIABILITY_REFUND','HELD_UNSUPPORTED_ENTITLEMENT','HELD_UNSUPPORTED_CASH',
    'HELD_REVENUE_CORRECTION','HELD_UNSUPPORTED_TREATMENT')),
  source_snapshot jsonb NOT NULL CHECK(jsonb_typeof(source_snapshot)='object'),
  source_snapshot_sha256 text NOT NULL CHECK(source_snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  amount_halalah bigint NOT NULL CHECK(amount_halalah>0),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT,
  source_business_date date,
  source_occurred_at timestamptz,
  source_recorded_at timestamptz NOT NULL,
  accounting_date date,
  evidence_ref text CHECK(evidence_ref IS NULL OR length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  evidence_sha256 text CHECK(evidence_sha256 IS NULL OR evidence_sha256 ~ '^[0-9a-f]{64}$'),
  held_code text CHECK(held_code IS NULL OR held_code IN (
    'source_not_eligible','unsupported_entitlement','cash_account_evidence_missing',
    'classification_evidence_missing','revenue_correction_required','original_effect_missing',
    'source_payload_conflict','unsupported_source_treatment')),
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,event_id,version),
  FOREIGN KEY(profile_id,event_id) REFERENCES public.accounting_ar_bridge_events(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,event_id,previous_version)
    REFERENCES public.accounting_ar_bridge_event_versions(profile_id,event_id,version) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id),
  CHECK((evidence_ref IS NULL)=(evidence_sha256 IS NULL)),
  CHECK((status='READY' AND held_code IS NULL AND accounting_date IS NOT NULL)
     OR (status='HELD' AND held_code IS NOT NULL))
);
ALTER TABLE public.accounting_ar_bridge_events
  ADD CONSTRAINT accounting_ar_bridge_events_current_version_fkey
  FOREIGN KEY(profile_id,id,current_version)
  REFERENCES public.accounting_ar_bridge_event_versions(profile_id,event_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_ar_bridge_journal_links (
  profile_id uuid NOT NULL,
  event_id uuid NOT NULL,
  event_version integer NOT NULL,
  journal_id uuid NOT NULL,
  prepared_version integer NOT NULL,
  source_effect_id uuid NOT NULL REFERENCES public.accounting_source_effects(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_record_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,event_id,event_version),
  UNIQUE(profile_id,journal_id,prepared_version),
  FOREIGN KEY(profile_id,event_id,event_version)
    REFERENCES public.accounting_ar_bridge_event_versions(profile_id,event_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,journal_id,prepared_version)
    REFERENCES public.accounting_journal_versions(profile_id,journal_id,version) ON DELETE RESTRICT
);
CREATE TABLE public.accounting_ar_bridge_journal_lines (
  profile_id uuid NOT NULL,
  event_id uuid NOT NULL,
  event_version integer NOT NULL,
  journal_id uuid NOT NULL,
  journal_version integer NOT NULL,
  line_number integer NOT NULL CHECK(line_number BETWEEN 1 AND 2),
  party_role text NOT NULL CHECK(party_role IN ('AR_CONTROL','CUSTOMER_ADVANCE','CASH_ACCOUNT','CONTRACT_LIABILITY','CONTRACT_ASSET')),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_record_id uuid NOT NULL,
  account_id uuid NOT NULL,
  account_version integer NOT NULL,
  amount_halalah bigint NOT NULL CHECK(amount_halalah>0),
  side text NOT NULL CHECK(side IN ('DEBIT','CREDIT')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,event_id,event_version,line_number),
  FOREIGN KEY(profile_id,event_id,event_version)
    REFERENCES public.accounting_ar_bridge_event_versions(profile_id,event_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,journal_id,journal_version,line_number)
    REFERENCES public.accounting_journal_line_versions(profile_id,journal_id,journal_version,line_number) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,account_id,account_version)
    REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT
);

CREATE INDEX accounting_ar_bridge_versions_report_idx
  ON public.accounting_ar_bridge_event_versions(profile_id,status,source_business_date,source_recorded_at,accounting_date);
CREATE INDEX accounting_ar_bridge_lines_party_idx
  ON public.accounting_ar_bridge_journal_lines(profile_id,customer_id,party_role,journal_id);

ALTER TABLE public.accounting_ar_bridge_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ar_bridge_event_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ar_bridge_journal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_ar_bridge_journal_lines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.accounting_ar_bridge_events,public.accounting_ar_bridge_event_versions,
  public.accounting_ar_bridge_journal_links,public.accounting_ar_bridge_journal_lines
  FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.prevent_accounting_ar_bridge_history_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $ar_bridge_immutable$
BEGIN
  RAISE EXCEPTION 'accounting_ar_bridge_history_immutable';
END;
$ar_bridge_immutable$;
CREATE TRIGGER accounting_ar_bridge_versions_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_ar_bridge_event_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_ar_bridge_history_mutation();
CREATE TRIGGER accounting_ar_bridge_versions_no_truncate
  BEFORE TRUNCATE ON public.accounting_ar_bridge_event_versions
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_ar_bridge_history_mutation();
CREATE TRIGGER accounting_ar_bridge_links_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_ar_bridge_journal_links
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_ar_bridge_history_mutation();
CREATE TRIGGER accounting_ar_bridge_links_no_truncate
  BEFORE TRUNCATE ON public.accounting_ar_bridge_journal_links
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_ar_bridge_history_mutation();
CREATE TRIGGER accounting_ar_bridge_lines_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_ar_bridge_journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_ar_bridge_history_mutation();
CREATE TRIGGER accounting_ar_bridge_lines_no_truncate
  BEFORE TRUNCATE ON public.accounting_ar_bridge_journal_lines
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_ar_bridge_history_mutation();

CREATE FUNCTION public.accounting_ar_bridge_source_snapshot(p_source_type text,p_source_record_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ar_source_snapshot$
DECLARE
  v_customer uuid; v_service uuid; v_invoice uuid; v_amount numeric;
  v_business_date date; v_occurred_at timestamptz; v_recorded_at timestamptz;
  v_eligible boolean; v_reverses_type text; v_reverses_id uuid; v_attributes jsonb;
BEGIN
  IF p_source_type IS NULL OR p_source_record_id IS NULL THEN RETURN NULL; END IF;
  CASE p_source_type
    WHEN 'INVOICE' THEN
      SELECT i.customer_id,i.service_id,i.id,i.grand_total,i.date,i.issued_at,coalesce(i.issued_at,i.created_at),
        i.issued_at IS NOT NULL AND lower(coalesce(i.status,'')) NOT IN ('draft','cancelled','canceled','voided')
          AND i.voided_at IS NULL AND NOT coalesce(i.is_deleted,false),
        jsonb_build_object('invoice_number',i.invoice_number,'due_date',i.due_date,
          'issued_at',i.issued_at,'voided_at',i.voided_at,'created_at',i.created_at,'grand_total',i.grand_total)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.invoices i WHERE i.id=p_source_record_id;
    WHEN 'PAYMENT' THEN
      SELECT p.customer_id,i.service_id,i.invoice_id,p.amount,p.date,p.created_at,p.created_at,
        p.invoice_id IS NOT NULL AND lower(coalesce(p.status,''))='confirmed' AND NOT coalesce(p.is_deleted,false),
        jsonb_build_object('payment_number',p.payment_number,'invoice_id',p.invoice_id,'status',p.status,
          'method',p.method,'reference',p.reference,'created_at',p.created_at)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.payments p LEFT JOIN public.invoices i ON i.id=p.invoice_id
      WHERE p.id=p_source_record_id AND p.invoice_id IS NOT NULL;
    WHEN 'RECEIPT' THEN
      SELECT p.customer_id,NULL::uuid,NULL::uuid,p.amount,p.date,p.created_at,p.created_at,
        p.invoice_id IS NULL AND NOT coalesce(p.is_deleted,false),
        jsonb_build_object('payment_number',p.payment_number,'method',p.method,
          'reference',p.reference,'notes',p.notes,'created_at',p.created_at)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.payments p WHERE p.id=p_source_record_id AND p.invoice_id IS NULL;
    WHEN 'ALLOCATION' THEN
      SELECT a.customer_id,i.service_id,a.invoice_id,a.amount,(a.allocated_at AT TIME ZONE 'Asia/Riyadh')::date,
        a.allocated_at,a.created_at,true,
        jsonb_build_object('payment_id',a.payment_id,'invoice_id',a.invoice_id,'allocated_at',a.allocated_at,
          'created_at',a.created_at,'payment_invoice_id',p.invoice_id)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.customer_receipt_allocations a
      JOIN public.invoices i ON i.id=a.invoice_id
      JOIN public.payments p ON p.id=a.payment_id
      WHERE a.id=p_source_record_id;
    WHEN 'ALLOCATION_REVERSAL' THEN
      SELECT a.customer_id,i.service_id,a.invoice_id,a.amount,(r.reversed_at AT TIME ZONE 'Asia/Riyadh')::date,
        r.reversed_at,r.created_at,true,
        'ALLOCATION',a.id,jsonb_build_object('allocation_id',a.id,'payment_id',a.payment_id,
          'reversed_at',r.reversed_at,'reason',r.reason,'created_at',r.created_at)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,
        v_reverses_type,v_reverses_id,v_attributes
      FROM public.customer_receipt_allocation_reversals r
      JOIN public.customer_receipt_allocations a ON a.id=r.allocation_id
      JOIN public.invoices i ON i.id=a.invoice_id
      WHERE r.id=p_source_record_id;
    WHEN 'RECEIPT_REVERSAL' THEN
      SELECT p.customer_id,NULL::uuid,NULL::uuid,p.amount,(r.reversed_at AT TIME ZONE 'Asia/Riyadh')::date,
        r.reversed_at,r.created_at,
        p.invoice_id IS NULL,'RECEIPT',p.id,jsonb_build_object('payment_id',p.id,'reversed_at',r.reversed_at,
          'reason',r.reason,'created_at',r.created_at)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,
        v_reverses_type,v_reverses_id,v_attributes
      FROM public.customer_receipt_reversals r JOIN public.payments p ON p.id=r.payment_id
      WHERE r.id=p_source_record_id;
    WHEN 'CREDIT_ADJUSTMENT' THEN
      SELECT c.customer_id,c.service_id,c.invoice_id,c.amount,c.effective_date,c.created_at,c.created_at,true,
        jsonb_build_object('reason_code',c.reason_code,'reason',c.reason,'source_scope',c.source_approved_billing_scope_id,
          'successor_scope',c.successor_approved_billing_scope_id,'net_receivable_after',c.net_receivable_after,
          'customer_credit_balance_after',c.customer_credit_balance_after,
          'prior_credit_adjustment_count',(SELECT count(*) FROM public.customer_internal_credit_adjustments prior
            WHERE prior.customer_id=c.customer_id AND prior.created_at<=c.created_at AND prior.id<>c.id),
          'created_at',c.created_at)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.customer_internal_credit_adjustments c WHERE c.id=p_source_record_id;
    WHEN 'CREDIT_ADJUSTMENT_REVERSAL' THEN
      SELECT c.customer_id,c.service_id,c.invoice_id,r.amount,r.effective_date,r.created_at,r.created_at,true,
        'CREDIT_ADJUSTMENT',c.id,jsonb_build_object('source_credit_adjustment_id',c.id,
          'effective_date',r.effective_date,'reason',r.reason,'created_at',r.created_at)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,
        v_reverses_type,v_reverses_id,v_attributes
      FROM public.customer_internal_credit_adjustment_reversals r
      JOIN public.customer_internal_credit_adjustments c ON c.id=r.source_credit_adjustment_id
      WHERE r.id=p_source_record_id;
    WHEN 'CREDIT_APPLICATION' THEN
      SELECT a.customer_id,i.service_id,a.target_invoice_id,a.amount,a.business_date,a.created_at,a.created_at,true,
        jsonb_build_object('source_credit_adjustment_id',a.source_credit_adjustment_id,
          'target_invoice_id',a.target_invoice_id,'reason',a.reason,'created_at',a.created_at)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.customer_credit_applications a JOIN public.invoices i ON i.id=a.target_invoice_id
      WHERE a.id=p_source_record_id;
    WHEN 'CREDIT_APPLICATION_REVERSAL' THEN
      SELECT a.customer_id,i.service_id,a.target_invoice_id,r.amount,r.business_date,r.created_at,r.created_at,true,
        'CREDIT_APPLICATION',a.id,jsonb_build_object('source_application_id',a.id,
          'source_credit_adjustment_id',a.source_credit_adjustment_id,'target_invoice_id',a.target_invoice_id,
          'reason',r.reason,'created_at',r.created_at)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,
        v_reverses_type,v_reverses_id,v_attributes
      FROM public.customer_credit_application_reversals r
      JOIN public.customer_credit_applications a ON a.id=r.source_application_id
      JOIN public.invoices i ON i.id=a.target_invoice_id
      WHERE r.id=p_source_record_id;
    WHEN 'REFUND' THEN
      SELECT r.customer_id,r.service_id,c.invoice_id,r.amount,r.business_date,r.created_at,r.created_at,true,
        jsonb_build_object('source_credit_adjustment_id',r.source_credit_adjustment_id,
          'reason',r.reason,'refund_method',r.refund_method,'reference',r.reference,'created_at',r.created_at)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,v_attributes
      FROM public.customer_refunds r
      JOIN public.customer_internal_credit_adjustments c ON c.id=r.source_credit_adjustment_id
      WHERE r.id=p_source_record_id;
    WHEN 'REFUND_REVERSAL' THEN
      SELECT r.customer_id,c.service_id,c.invoice_id,r.amount,r.business_date,r.created_at,r.created_at,true,
        'REFUND',f.id,jsonb_build_object('source_refund_id',f.id,'source_credit_adjustment_id',f.source_credit_adjustment_id,
          'reason',r.reason,'created_at',r.created_at)
      INTO v_customer,v_service,v_invoice,v_amount,v_business_date,v_occurred_at,v_recorded_at,v_eligible,
        v_reverses_type,v_reverses_id,v_attributes
      FROM public.customer_refund_reversals r
      JOIN public.customer_refunds f ON f.id=r.source_refund_id
      JOIN public.customer_internal_credit_adjustments c ON c.id=f.source_credit_adjustment_id
      WHERE r.id=p_source_record_id;
    ELSE
      RETURN NULL;
  END CASE;
  IF NOT FOUND OR v_customer IS NULL OR v_amount IS NULL OR v_amount<=0 THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'source_type',p_source_type,'source_record_id',p_source_record_id,
    'source_record_key','W7/'||p_source_type||'/'||p_source_record_id::text,
    'economic_event_key','W7/'||p_source_type||'/'||p_source_record_id::text||'/AR_EFFECT',
    'customer_id',v_customer,'service_id',v_service,'invoice_id',v_invoice,
    'amount_halalah',round(v_amount*100)::bigint::text,
    'source_business_date',v_business_date,'source_occurred_at',v_occurred_at,
    'source_recorded_at',v_recorded_at,'eligible',coalesce(v_eligible,false),
    'reverses_source_type',v_reverses_type,'reverses_source_record_id',v_reverses_id,
    'attributes',coalesce(v_attributes,'{}'::jsonb));
END;
$ar_source_snapshot$;

CREATE FUNCTION public.accounting_ar_bridge_posting_spec(
  p_source_type text,p_classification text,p_source_snapshot jsonb
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ar_posting_spec$
  SELECT CASE
    WHEN p_source_type='INVOICE' AND p_classification='UNCONDITIONAL_CONTRACT_LIABILITY'
      THEN jsonb_build_object('debit_key','AR_CONTROL','credit_key','CONTRACT_LIABILITY','debit_role','AR_CONTROL','credit_role','CONTRACT_LIABILITY')
    WHEN p_source_type='INVOICE' AND p_classification='UNCONDITIONAL_CONTRACT_ASSET'
      THEN jsonb_build_object('debit_key','AR_CONTROL','credit_key','CONTRACT_ASSET','debit_role','AR_CONTROL','credit_role','CONTRACT_ASSET')
    WHEN p_source_type IN ('PAYMENT','RECEIPT') AND p_classification='CUSTOMER_ADVANCE'
      THEN jsonb_build_object('debit_key','CASH_ACCOUNT','credit_key','CUSTOMER_ADVANCE','debit_role','CASH_ACCOUNT','credit_role','CUSTOMER_ADVANCE')
    WHEN p_source_type='ALLOCATION' AND p_classification='SETTLEMENT'
      THEN jsonb_build_object('debit_key','CUSTOMER_ADVANCE','credit_key','AR_CONTROL','debit_role','CUSTOMER_ADVANCE','credit_role','AR_CONTROL')
    WHEN p_source_type='ALLOCATION_REVERSAL' AND p_classification='REVERSAL'
      THEN jsonb_build_object('debit_key','AR_CONTROL','credit_key','CUSTOMER_ADVANCE','debit_role','AR_CONTROL','credit_role','CUSTOMER_ADVANCE')
    WHEN p_source_type='RECEIPT_REVERSAL' AND p_classification='REVERSAL'
      THEN jsonb_build_object('debit_key','CUSTOMER_ADVANCE','credit_key','CASH_ACCOUNT','debit_role','CUSTOMER_ADVANCE','credit_role','CASH_ACCOUNT')
    WHEN p_source_type='CREDIT_ADJUSTMENT' AND p_classification='CUSTOMER_LIABILITY'
      THEN jsonb_build_object('debit_key','CONTRACT_LIABILITY','credit_key','CUSTOMER_ADVANCE','debit_role','CONTRACT_LIABILITY','credit_role','CUSTOMER_ADVANCE')
    WHEN p_source_type='CREDIT_ADJUSTMENT' AND p_classification='UNCONDITIONAL_CONTRACT_LIABILITY'
      THEN jsonb_build_object('debit_key','CONTRACT_LIABILITY','credit_key','AR_CONTROL','debit_role','CONTRACT_LIABILITY','credit_role','AR_CONTROL')
    WHEN p_source_type='CREDIT_ADJUSTMENT_REVERSAL' AND p_classification='REVERSAL' THEN (
      SELECT CASE original_version.classification
        WHEN 'CUSTOMER_LIABILITY'
          THEN jsonb_build_object('debit_key','CUSTOMER_ADVANCE','credit_key','CONTRACT_LIABILITY','debit_role','CUSTOMER_ADVANCE','credit_role','CONTRACT_LIABILITY')
        WHEN 'UNCONDITIONAL_CONTRACT_LIABILITY'
          THEN jsonb_build_object('debit_key','AR_CONTROL','credit_key','CONTRACT_LIABILITY','debit_role','AR_CONTROL','credit_role','CONTRACT_LIABILITY')
        ELSE NULL::jsonb END
      FROM public.accounting_ar_bridge_events original_event
      JOIN public.accounting_ar_bridge_event_versions original_version
        ON original_version.profile_id=original_event.profile_id AND original_version.event_id=original_event.id
      JOIN public.accounting_ar_bridge_journal_links original_link
        ON original_link.profile_id=original_version.profile_id AND original_link.event_id=original_version.event_id
        AND original_link.event_version=original_version.version
      JOIN public.accounting_source_effects original_effect
        ON original_effect.profile_id=original_link.profile_id AND original_effect.id=original_link.source_effect_id
        AND original_effect.status='POSTED'
      WHERE original_event.source_type='CREDIT_ADJUSTMENT'
        AND original_event.source_record_id=(p_source_snapshot->>'reverses_source_record_id')::uuid
      LIMIT 1)
    WHEN p_source_type='CREDIT_APPLICATION' AND p_classification='SETTLEMENT'
      THEN jsonb_build_object('debit_key','CUSTOMER_ADVANCE','credit_key','AR_CONTROL','debit_role','CUSTOMER_ADVANCE','credit_role','AR_CONTROL')
    WHEN p_source_type='CREDIT_APPLICATION_REVERSAL' AND p_classification='REVERSAL'
      THEN jsonb_build_object('debit_key','AR_CONTROL','credit_key','CUSTOMER_ADVANCE','debit_role','AR_CONTROL','credit_role','CUSTOMER_ADVANCE')
    WHEN p_source_type='REFUND' AND p_classification='CUSTOMER_LIABILITY_REFUND'
      THEN jsonb_build_object('debit_key','CUSTOMER_ADVANCE','credit_key','CASH_ACCOUNT','debit_role','CUSTOMER_ADVANCE','credit_role','CASH_ACCOUNT')
    WHEN p_source_type='REFUND_REVERSAL' AND p_classification='REVERSAL'
      THEN jsonb_build_object('debit_key','CASH_ACCOUNT','credit_key','CUSTOMER_ADVANCE','debit_role','CASH_ACCOUNT','credit_role','CUSTOMER_ADVANCE')
    ELSE NULL::jsonb END;
$ar_posting_spec$;

CREATE FUNCTION public.accounting_ar_bridge_account_authorized(
  p_profile_id uuid,p_mapping_key text,p_account_id uuid,p_account_version integer
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ar_account_authorized$
  SELECT EXISTS(
    SELECT 1 FROM public.accounting_account_versions av
    WHERE av.profile_id=p_profile_id AND av.account_id=p_account_id AND av.version=p_account_version
      AND av.account_kind='POSTING' AND av.is_active
      AND NOT EXISTS(SELECT 1 FROM public.accounting_accounts child
        JOIN public.accounting_account_versions cv ON cv.profile_id=child.profile_id
          AND cv.account_id=child.id AND cv.version=child.current_version
        WHERE child.profile_id=p_profile_id AND cv.parent_account_id=av.account_id)
      AND CASE p_mapping_key
        WHEN 'AR_CONTROL' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND av.is_protected AND av.control_classification='ACCOUNTS_RECEIVABLE'
        WHEN 'CUSTOMER_ADVANCE' THEN av.account_type='LIABILITY' AND av.normal_balance='CREDIT'
          AND av.is_protected AND av.control_classification='CUSTOMER_ADVANCE'
        WHEN 'CONTRACT_LIABILITY' THEN av.account_type='LIABILITY' AND av.normal_balance='CREDIT'
          AND av.is_protected AND av.control_classification='CONTRACT_LIABILITY'
        WHEN 'CASH_ACCOUNT' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND ((av.is_protected AND av.control_classification='CASH_ACCOUNTABILITY')
            OR (NOT av.is_protected AND av.control_classification='NONE'))
        WHEN 'CONTRACT_ASSET' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND NOT av.is_protected AND av.control_classification='NONE'
        ELSE false END);
$ar_account_authorized$;

CREATE FUNCTION public.accounting_ar_bridge_mapping_authorized(
  p_profile_id uuid,p_posting_rule_id uuid,p_rule_version integer,p_mapping_key text,
  p_account_id uuid,p_account_version integer
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ar_mapping_authorized$
  SELECT EXISTS(SELECT 1 FROM public.accounting_posting_rule_mappings m
    WHERE m.profile_id=p_profile_id AND m.posting_rule_id=p_posting_rule_id
      AND m.rule_version=p_rule_version AND m.mapping_key=p_mapping_key
      AND m.account_id=p_account_id AND m.account_version=p_account_version)
    AND public.accounting_ar_bridge_account_authorized(p_profile_id,p_mapping_key,p_account_id,p_account_version);
$ar_mapping_authorized$;

CREATE FUNCTION public.accounting_ar_bridge_line_authorized(
  p_profile_id uuid,p_journal jsonb,p_line_number integer,p_mapping_key text,
  p_account_id uuid,p_account_version integer,p_actor_user_id uuid
) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ar_line_authorized$
DECLARE
  v_event public.accounting_ar_bridge_events%ROWTYPE;
  v_event_version public.accounting_ar_bridge_event_versions%ROWTYPE;
  v_snapshot jsonb; v_spec jsonb; v_line jsonb; v_expected_key text; v_expected_role text;
  v_expected_side text; v_role text;
BEGIN
  IF p_journal IS NULL OR p_journal->>'source_domain'<>'AR_BRIDGE'
     OR p_line_number NOT BETWEEN 1 AND 2
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_ar_bridge') THEN
    RETURN false;
  END IF;
  SELECT e.* INTO v_event FROM public.accounting_ar_bridge_events e
  WHERE e.profile_id=p_profile_id AND e.source_record_key=p_journal->>'source_record_key'
    AND e.economic_event_key=p_journal->>'economic_event_key';
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT ev.* INTO v_event_version FROM public.accounting_ar_bridge_event_versions ev
  WHERE ev.profile_id=v_event.profile_id AND ev.event_id=v_event.id
    AND ev.version=v_event.current_version AND ev.status='READY';
  IF NOT FOUND THEN RETURN false; END IF;
  v_snapshot:=public.accounting_ar_bridge_source_snapshot(v_event.source_type,v_event.source_record_id);
  IF v_snapshot IS NULL OR v_snapshot<>v_event_version.source_snapshot
     OR encode(extensions.digest(convert_to(v_snapshot::text,'UTF8'),'sha256'),'hex')
       <>v_event_version.source_snapshot_sha256 THEN
    RETURN false;
  END IF;
   v_spec:=public.accounting_ar_bridge_posting_spec(
     v_event.source_type,v_event_version.classification,v_event_version.source_snapshot);
  IF v_spec IS NULL OR p_journal->>'posting_purpose'<>'ar_bridge'
     OR p_journal->>'period_id' IS NULL OR p_journal->>'period_version' IS NULL
     OR p_journal->>'accounting_date' IS DISTINCT FROM v_event_version.accounting_date::text
     OR jsonb_array_length(coalesce(p_journal->'lines','[]'::jsonb))<>2 THEN
    RETURN false;
  END IF;
  v_line:=p_journal->'lines'->(p_line_number-1);
  IF p_line_number=1 THEN
    v_expected_key:=v_spec->>'debit_key'; v_expected_role:=v_spec->>'debit_role'; v_expected_side:='DEBIT';
  ELSE
    v_expected_key:=v_spec->>'credit_key'; v_expected_role:=v_spec->>'credit_role'; v_expected_side:='CREDIT';
  END IF;
  IF p_mapping_key IS DISTINCT FROM v_expected_key
     OR v_line->>'mapping_key' IS DISTINCT FROM v_expected_key
     OR v_line->>'side' IS DISTINCT FROM v_expected_side
     OR v_line->>'amount_halalah' IS DISTINCT FROM v_event_version.amount_halalah::text
     OR nullif(v_line->>'service_id','') IS DISTINCT FROM v_event_version.service_id::text
     OR (v_expected_role='CONTRACT_LIABILITY'
       AND v_event.source_type IN ('CREDIT_ADJUSTMENT','CREDIT_ADJUSTMENT_REVERSAL')
       AND (NOT EXISTS(
           SELECT 1 FROM public.accounting_ar_bridge_events invoice_event
           JOIN public.accounting_ar_bridge_event_versions invoice_version
             ON invoice_version.profile_id=invoice_event.profile_id AND invoice_version.event_id=invoice_event.id
             AND invoice_version.status='READY' AND invoice_version.classification='UNCONDITIONAL_CONTRACT_LIABILITY'
           JOIN public.accounting_ar_bridge_journal_links invoice_link
             ON invoice_link.profile_id=invoice_version.profile_id AND invoice_link.event_id=invoice_version.event_id
             AND invoice_link.event_version=invoice_version.version
           JOIN public.accounting_source_effects invoice_effect
             ON invoice_effect.profile_id=invoice_link.profile_id AND invoice_effect.id=invoice_link.source_effect_id
             AND invoice_effect.status='POSTED'
           JOIN public.accounting_ar_bridge_journal_lines invoice_line
             ON invoice_line.profile_id=invoice_link.profile_id AND invoice_line.event_id=invoice_link.event_id
             AND invoice_line.event_version=invoice_link.event_version AND invoice_line.journal_id=invoice_link.journal_id
             AND invoice_line.journal_version=invoice_link.prepared_version AND invoice_line.party_role='CONTRACT_LIABILITY'
           WHERE invoice_event.profile_id=p_profile_id AND invoice_event.source_type='INVOICE'
             AND invoice_event.source_record_id=v_event_version.invoice_id
             AND invoice_version.invoice_id=v_event_version.invoice_id
             AND invoice_version.customer_id=v_event_version.customer_id
             AND invoice_line.account_id=p_account_id AND invoice_line.account_version=p_account_version
         ) OR coalesce((
           SELECT sum(CASE WHEN balance_line.side='CREDIT' THEN balance_line.amount_halalah
             ELSE -balance_line.amount_halalah END)
           FROM public.accounting_ar_bridge_journal_lines balance_line
           JOIN public.accounting_ar_bridge_journal_links balance_link
             ON balance_link.profile_id=balance_line.profile_id AND balance_link.event_id=balance_line.event_id
             AND balance_link.event_version=balance_line.event_version AND balance_link.journal_id=balance_line.journal_id
             AND balance_link.prepared_version=balance_line.journal_version
           JOIN public.accounting_source_effects balance_effect
             ON balance_effect.profile_id=balance_link.profile_id AND balance_effect.id=balance_link.source_effect_id
             AND balance_effect.status='POSTED'
           WHERE balance_line.profile_id=p_profile_id AND balance_line.customer_id=v_event_version.customer_id
             AND balance_line.invoice_id=v_event_version.invoice_id
             AND balance_line.party_role='CONTRACT_LIABILITY' AND balance_line.account_id=p_account_id
             AND balance_line.account_version=p_account_version
         ),0)<v_event_version.amount_halalah))
     OR NOT public.accounting_ar_bridge_account_authorized(
       p_profile_id,v_expected_key,p_account_id,p_account_version) THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$ar_line_authorized$;

CREATE FUNCTION public.accounting_ar_bridge_journal_link_authorized(
  p_profile_id uuid,p_journal_id uuid,p_prepared_version integer,p_prepared_by uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ar_journal_authorized$
  SELECT EXISTS(
    SELECT 1 FROM public.accounting_ar_bridge_journal_links l
    JOIN public.accounting_ar_bridge_event_versions ev
      ON ev.profile_id=l.profile_id AND ev.event_id=l.event_id AND ev.version=l.event_version
      AND ev.status='READY'
    JOIN public.accounting_journal_versions jv
      ON jv.profile_id=l.profile_id AND jv.journal_id=l.journal_id
      AND jv.version=l.prepared_version AND jv.source_domain='AR_BRIDGE'
      AND jv.prepared_by=p_prepared_by
    JOIN public.accounting_source_effects se
      ON se.profile_id=l.profile_id AND se.id=l.source_effect_id
      AND se.source_domain='AR_BRIDGE' AND se.journal_id=l.journal_id
      AND se.status IN ('PREPARED','POSTED')
    WHERE l.profile_id=p_profile_id AND l.journal_id=p_journal_id
      AND l.prepared_version=p_prepared_version AND l.customer_id=ev.customer_id
      AND l.source_record_id=(ev.source_snapshot->>'source_record_id')::uuid
      AND EXISTS(SELECT 1 FROM public.accounting_ar_bridge_journal_lines ll
        WHERE ll.profile_id=l.profile_id AND ll.event_id=l.event_id
          AND ll.event_version=l.event_version AND ll.journal_id=l.journal_id
          AND ll.journal_version=l.prepared_version AND ll.customer_id=l.customer_id)
  );
$ar_journal_authorized$;

CREATE FUNCTION public.accounting_ar_bridge_journal_account_authorized(
  p_profile_id uuid,p_journal_id uuid,p_journal_version integer,p_line_number integer,
  p_account_id uuid,p_account_version integer,p_prepared_by uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ar_journal_account_authorized$
  SELECT EXISTS(
    SELECT 1 FROM public.accounting_ar_bridge_journal_links l
    JOIN public.accounting_ar_bridge_journal_lines ll
      ON ll.profile_id=l.profile_id AND ll.event_id=l.event_id AND ll.event_version=l.event_version
      AND ll.journal_id=l.journal_id AND ll.journal_version=l.prepared_version
    WHERE l.profile_id=p_profile_id AND l.journal_id=p_journal_id
      AND l.prepared_version=p_journal_version AND ll.line_number=p_line_number
      AND ll.account_id=p_account_id AND ll.account_version=p_account_version
      AND public.accounting_ar_bridge_journal_link_authorized(
        p_profile_id,p_journal_id,p_journal_version,p_prepared_by)
      AND public.accounting_ar_bridge_account_authorized(
        p_profile_id,ll.party_role,p_account_id,p_account_version)
  );
$ar_journal_account_authorized$;

CREATE FUNCTION public.accounting_ar_bridge_source_effect_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $ar_effect_link$
DECLARE
  v_event public.accounting_ar_bridge_events%ROWTYPE;
  v_version public.accounting_ar_bridge_event_versions%ROWTYPE;
  v_spec jsonb; v_journal public.accounting_journal_versions%ROWTYPE;
  v_line record; v_role text; v_count integer:=0;
BEGIN
  IF NEW.source_domain<>'AR_BRIDGE' THEN RETURN NEW; END IF;
  SELECT e.* INTO v_event FROM public.accounting_ar_bridge_events e
  WHERE e.profile_id=NEW.profile_id AND e.source_record_key=NEW.source_record_key
    AND e.economic_event_key=NEW.economic_event_key;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_EVENT_NOT_FOUND'; END IF;
  SELECT ev.* INTO v_version FROM public.accounting_ar_bridge_event_versions ev
  WHERE ev.profile_id=v_event.profile_id AND ev.event_id=v_event.id
    AND ev.version=v_event.current_version AND ev.status='READY';
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_EVENT_NOT_READY'; END IF;
  IF public.accounting_ar_bridge_source_snapshot(v_event.source_type,v_event.source_record_id)
       IS DISTINCT FROM v_version.source_snapshot
     OR NEW.payload_fingerprint IS DISTINCT FROM (
       SELECT jv.payload_fingerprint FROM public.accounting_journal_versions jv
       WHERE jv.profile_id=NEW.profile_id AND jv.journal_id=NEW.journal_id AND jv.version=NEW.journal_version) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_SOURCE_CONFLICT';
  END IF;
  SELECT jv.* INTO v_journal FROM public.accounting_journal_versions jv
  WHERE jv.profile_id=NEW.profile_id AND jv.journal_id=NEW.journal_id
    AND jv.version=NEW.journal_version AND jv.source_domain='AR_BRIDGE'
    AND jv.source_record_key=NEW.source_record_key AND jv.economic_event_key=NEW.economic_event_key
    AND jv.posting_purpose='ar_bridge';
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_JOURNAL_LINK_INVALID'; END IF;
   v_spec:=public.accounting_ar_bridge_posting_spec(v_event.source_type,v_version.classification,v_version.source_snapshot);
  IF v_spec IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_TREATMENT_HELD'; END IF;
  SELECT count(*) INTO v_count FROM public.accounting_journal_line_versions l
  WHERE l.profile_id=NEW.profile_id AND l.journal_id=NEW.journal_id AND l.journal_version=NEW.journal_version;
  IF TG_OP='UPDATE' THEN
    IF OLD.status<>'PREPARED' OR NEW.status<>'POSTED' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_EFFECT_TRANSITION_INVALID';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.accounting_ar_bridge_journal_links l
       WHERE l.profile_id=NEW.profile_id AND l.journal_id=NEW.journal_id
         AND l.prepared_version=NEW.journal_version-1 AND l.source_effect_id=NEW.id) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_JOURNAL_LINK_MISSING';
    END IF;
    RETURN NEW;
  END IF;
  IF v_count<>2 OR NEW.status<>'PREPARED' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_JOURNAL_SHAPE_INVALID';
  END IF;
  INSERT INTO public.accounting_ar_bridge_journal_links(
    profile_id,event_id,event_version,journal_id,prepared_version,source_effect_id,
    customer_id,service_id,invoice_id,source_type,source_record_id
  ) VALUES(NEW.profile_id,v_event.id,v_version.version,NEW.journal_id,NEW.journal_version,NEW.id,
    v_version.customer_id,v_version.service_id,v_version.invoice_id,v_event.source_type,v_event.source_record_id);
  FOR v_line IN
    SELECT l.* FROM public.accounting_journal_line_versions l
    WHERE l.profile_id=NEW.profile_id AND l.journal_id=NEW.journal_id AND l.journal_version=NEW.journal_version
    ORDER BY l.line_number
  LOOP
    v_role:=CASE v_line.mapping_key
      WHEN 'AR_CONTROL' THEN 'AR_CONTROL'
      WHEN 'CUSTOMER_ADVANCE' THEN 'CUSTOMER_ADVANCE'
      WHEN 'CASH_ACCOUNT' THEN 'CASH_ACCOUNT'
      WHEN 'CONTRACT_LIABILITY' THEN 'CONTRACT_LIABILITY'
      WHEN 'CONTRACT_ASSET' THEN 'CONTRACT_ASSET'
      ELSE NULL END;
    IF v_role IS NULL OR NOT public.accounting_ar_bridge_account_authorized(
        NEW.profile_id,v_role,v_line.account_id,v_line.account_version) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_ACCOUNT_INVALID';
    END IF;
    INSERT INTO public.accounting_ar_bridge_journal_lines(
      profile_id,event_id,event_version,journal_id,journal_version,line_number,party_role,
      customer_id,service_id,invoice_id,source_type,source_record_id,account_id,account_version,amount_halalah,side
    ) VALUES(NEW.profile_id,v_event.id,v_version.version,NEW.journal_id,NEW.journal_version,
      v_line.line_number,v_role,v_version.customer_id,v_version.service_id,v_version.invoice_id,
      v_event.source_type,v_event.source_record_id,v_line.account_id,v_line.account_version,
      v_line.amount_halalah,v_line.side);
  END LOOP;
  RETURN NEW;
END;
$ar_effect_link$;
CREATE TRIGGER accounting_ar_bridge_source_effect_link
  AFTER INSERT OR UPDATE OF status ON public.accounting_source_effects
  FOR EACH ROW EXECUTE FUNCTION public.accounting_ar_bridge_source_effect_link();

CREATE FUNCTION public.save_accounting_ar_bridge_event(
  p_actor_user_id uuid,p_source_type text,p_source_record_id uuid,p_expected_version integer,
  p_classification text,p_accounting_date date,p_evidence_ref text,p_evidence_sha256 text,
  p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,event_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $save_ar_bridge_event$
DECLARE
  v_profile_id uuid; v_snapshot jsonb; v_hash text; v_source_key text; v_economic_key text;
  v_event public.accounting_ar_bridge_events%ROWTYPE; v_prior public.accounting_foundation_events%ROWTYPE;
  v_version integer; v_status text; v_held_code text; v_spec jsonb; v_fingerprint text; v_foundation_id uuid;
   v_reverses_type text; v_reverses_id uuid; v_original_event uuid; v_original_classification text;
BEGIN
  IF p_actor_user_id IS NULL OR p_source_type IS NULL OR p_source_record_id IS NULL
     OR p_expected_version IS NULL OR p_expected_version<0 OR p_classification IS NULL
     OR p_request_id IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000
     OR (p_evidence_ref IS NULL)<>(p_evidence_sha256 IS NULL)
     OR (p_evidence_ref IS NOT NULL AND (length(btrim(p_evidence_ref)) NOT BETWEEN 1 AND 2000
       OR p_evidence_sha256 !~ '^[0-9a-f]{64}$')) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_ar_bridge') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p
    JOIN public.accounting_profile_versions pv ON pv.profile_id=p.id AND pv.version=p.current_version
    WHERE p.singleton_key='g7' AND pv.activation_state='DEV_PROVISIONAL' FOR SHARE OF p;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'profile_not_active'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  v_snapshot:=public.accounting_ar_bridge_source_snapshot(p_source_type,p_source_record_id);
  IF v_snapshot IS NULL THEN
    RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  v_hash:=encode(extensions.digest(convert_to(v_snapshot::text,'UTF8'),'sha256'),'hex');
  v_source_key:=v_snapshot->>'source_record_key'; v_economic_key:=v_snapshot->>'economic_event_key';
   v_spec:=public.accounting_ar_bridge_posting_spec(p_source_type,p_classification,v_snapshot);
  v_status:=CASE WHEN v_spec IS NULL THEN 'HELD' ELSE 'READY' END;
   v_held_code:=CASE
    WHEN v_spec IS NOT NULL AND NOT coalesce((v_snapshot->>'eligible')::boolean,false) THEN 'source_not_eligible'
    WHEN p_classification='HELD_UNSUPPORTED_ENTITLEMENT' THEN 'unsupported_entitlement'
    WHEN p_classification='HELD_UNSUPPORTED_CASH' THEN 'cash_account_evidence_missing'
    WHEN p_classification='HELD_REVENUE_CORRECTION' THEN 'revenue_correction_required'
    WHEN v_spec IS NULL THEN 'unsupported_source_treatment'
    ELSE NULL END;
  IF v_held_code='source_not_eligible' THEN v_status:='HELD'; END IF;
   IF p_source_type='CREDIT_ADJUSTMENT' THEN
     IF v_snapshot->'attributes'->>'reason_code'<>'customer_scope_reduction'
        OR nullif(v_snapshot->'attributes'->>'source_scope','') IS NULL
        OR nullif(v_snapshot->'attributes'->>'successor_scope','') IS NULL THEN
       v_status:='HELD'; v_held_code:='revenue_correction_required';
     ELSIF p_classification='CUSTOMER_LIABILITY'
        AND (round((v_snapshot->'attributes'->>'customer_credit_balance_after')::numeric*100)::bigint
             <> (v_snapshot->>'amount_halalah')::bigint
          OR EXISTS(SELECT 1 FROM public.customer_internal_credit_adjustments prior
            WHERE prior.customer_id=(v_snapshot->>'customer_id')::uuid
              AND prior.id<>p_source_record_id
              AND prior.created_at<=(v_snapshot->>'source_recorded_at')::timestamptz)) THEN
       v_status:='HELD'; v_held_code:='unsupported_source_treatment';
     ELSIF p_classification='UNCONDITIONAL_CONTRACT_LIABILITY'
        AND coalesce((v_snapshot->'attributes'->>'customer_credit_balance_after')::numeric,0)<>0 THEN
       v_status:='HELD'; v_held_code:='unsupported_source_treatment';
     END IF;
     IF v_status='READY' AND p_classification IN ('CUSTOMER_LIABILITY','UNCONDITIONAL_CONTRACT_LIABILITY')
        AND NOT EXISTS(
          SELECT 1 FROM public.accounting_ar_bridge_events original_invoice
          JOIN public.accounting_ar_bridge_event_versions original_version
            ON original_version.profile_id=original_invoice.profile_id AND original_version.event_id=original_invoice.id
            AND original_version.status='READY'
            AND original_version.classification='UNCONDITIONAL_CONTRACT_LIABILITY'
          JOIN public.accounting_ar_bridge_journal_links original_link
            ON original_link.profile_id=original_version.profile_id AND original_link.event_id=original_version.event_id
            AND original_link.event_version=original_version.version
          JOIN public.accounting_source_effects original_effect
            ON original_effect.profile_id=original_link.profile_id AND original_effect.id=original_link.source_effect_id
            AND original_effect.status='POSTED'
          WHERE original_invoice.profile_id=v_profile_id AND original_invoice.source_type='INVOICE'
            AND original_invoice.source_record_id=(v_snapshot->>'invoice_id')::uuid
            AND original_version.customer_id=(v_snapshot->>'customer_id')::uuid
        ) THEN
       v_status:='HELD'; v_held_code:='original_effect_missing';
     END IF;
   END IF;
  IF p_classification IN ('UNCONDITIONAL_CONTRACT_LIABILITY','UNCONDITIONAL_CONTRACT_ASSET',
      'CUSTOMER_ADVANCE','CUSTOMER_LIABILITY','CUSTOMER_LIABILITY_REFUND')
     AND (p_evidence_ref IS NULL OR p_evidence_sha256 IS NULL) THEN
    v_status:='HELD';
    v_held_code:=CASE WHEN p_source_type IN ('PAYMENT','RECEIPT','REFUND')
      THEN 'cash_account_evidence_missing' ELSE 'classification_evidence_missing' END;
  END IF;
  v_reverses_type:=v_snapshot->>'reverses_source_type';
  v_reverses_id:=nullif(v_snapshot->>'reverses_source_record_id','')::uuid;
   IF v_status='READY' AND (v_reverses_type IS NOT NULL OR p_source_type IN ('CREDIT_APPLICATION','REFUND','ALLOCATION')) THEN
     SELECT e.id,ev.classification INTO v_original_event,v_original_classification
     FROM public.accounting_ar_bridge_events e
     JOIN public.accounting_ar_bridge_event_versions ev
       ON ev.profile_id=e.profile_id AND ev.event_id=e.id AND ev.status='READY'
     JOIN public.accounting_ar_bridge_journal_links l
       ON l.profile_id=ev.profile_id AND l.event_id=ev.event_id AND l.event_version=ev.version
     JOIN public.accounting_source_effects se
       ON se.profile_id=l.profile_id AND se.id=l.source_effect_id AND se.status='POSTED'
     WHERE e.profile_id=v_profile_id AND e.source_type=coalesce(v_reverses_type,
       CASE
         WHEN p_source_type IN ('CREDIT_APPLICATION','REFUND') THEN 'CREDIT_ADJUSTMENT'
         WHEN p_source_type='ALLOCATION' THEN CASE
           WHEN nullif(v_snapshot->'attributes'->>'payment_invoice_id','') IS NULL THEN 'RECEIPT'
           ELSE 'PAYMENT' END
       END)
        AND e.source_record_id=coalesce(v_reverses_id,
          nullif(v_snapshot->'attributes'->>'source_credit_adjustment_id','')::uuid,
          nullif(v_snapshot->'attributes'->>'payment_id','')::uuid)
     ORDER BY ev.version DESC LIMIT 1;
      IF v_original_event IS NULL
          OR (p_source_type IN ('CREDIT_APPLICATION','REFUND')
            AND v_original_classification<>'CUSTOMER_LIABILITY')
          OR (p_source_type='ALLOCATION' AND v_original_classification<>'CUSTOMER_ADVANCE') THEN
      v_status:='HELD'; v_held_code:='original_effect_missing';
    END IF;
  END IF;
  IF v_status='READY' AND p_source_type IN ('CREDIT_APPLICATION','ALLOCATION') AND NOT EXISTS(
     SELECT 1 FROM public.accounting_ar_bridge_events invoice_event
     JOIN public.accounting_ar_bridge_event_versions invoice_version
       ON invoice_version.profile_id=invoice_event.profile_id AND invoice_version.event_id=invoice_event.id
       AND invoice_version.status='READY'
       AND invoice_version.classification IN ('UNCONDITIONAL_CONTRACT_LIABILITY','UNCONDITIONAL_CONTRACT_ASSET')
     JOIN public.accounting_ar_bridge_journal_links invoice_link
       ON invoice_link.profile_id=invoice_version.profile_id AND invoice_link.event_id=invoice_version.event_id
       AND invoice_link.event_version=invoice_version.version
     JOIN public.accounting_source_effects invoice_effect
       ON invoice_effect.profile_id=invoice_link.profile_id AND invoice_effect.id=invoice_link.source_effect_id
       AND invoice_effect.status='POSTED'
     WHERE invoice_event.profile_id=v_profile_id AND invoice_event.source_type='INVOICE'
       AND invoice_event.source_record_id=(v_snapshot->>'invoice_id')::uuid
       AND invoice_version.invoice_id=(v_snapshot->>'invoice_id')::uuid
       AND invoice_version.customer_id=(v_snapshot->>'customer_id')::uuid
   ) THEN
     v_status:='HELD'; v_held_code:='original_effect_missing';
   END IF;
  IF v_status='READY' AND p_accounting_date IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10d-profile:'||v_profile_id::text,0));
  SELECT e.* INTO v_prior FROM public.accounting_foundation_events e
  WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id;
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'source_type',p_source_type,'source_record_id',p_source_record_id,'expected_version',p_expected_version,
    'classification',p_classification,'accounting_date',p_accounting_date,'source_snapshot_sha256',v_hash,
    'evidence_ref',p_evidence_ref,'evidence_sha256',p_evidence_sha256,'reason',btrim(p_reason)
  )::text,'UTF8'),'sha256'),'hex');
  IF FOUND THEN
    IF v_prior.payload_fingerprint<>v_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,v_prior.entity_id,v_prior.entity_version,
      CASE WHEN v_prior.event_type='accounting_ar_bridge_event_held' THEN 'HELD' ELSE 'READY' END,true; RETURN;
  END IF;
  SELECT e.* INTO v_event FROM public.accounting_ar_bridge_events e
  WHERE e.profile_id=v_profile_id AND e.source_type=p_source_type AND e.source_record_id=p_source_record_id
  FOR UPDATE;
  IF FOUND THEN
    IF v_event.current_version<>p_expected_version THEN
      RETURN QUERY SELECT 'revision_conflict'::text,v_event.id,v_event.current_version,NULL::text,false; RETURN;
    END IF;
    IF EXISTS(SELECT 1 FROM public.accounting_ar_bridge_event_versions old
      WHERE old.profile_id=v_profile_id AND old.event_id=v_event.id
        AND old.source_snapshot_sha256<>v_hash) THEN
      RETURN QUERY SELECT 'source_payload_conflict'::text,v_event.id,v_event.current_version,NULL::text,false; RETURN;
    END IF;
    IF EXISTS(SELECT 1 FROM public.accounting_ar_bridge_journal_links l
       WHERE l.profile_id=v_profile_id AND l.event_id=v_event.id) THEN
      RETURN QUERY SELECT 'source_identity_immutable'::text,v_event.id,v_event.current_version,NULL::text,false; RETURN;
    END IF;
    v_version:=v_event.current_version+1;
  ELSE
    IF p_expected_version<>0 THEN
      RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,0,NULL::text,false; RETURN;
    END IF;
    INSERT INTO public.accounting_ar_bridge_events(profile_id,source_type,source_record_id,source_record_key,economic_event_key)
    VALUES(v_profile_id,p_source_type,p_source_record_id,v_source_key,v_economic_key) RETURNING * INTO v_event;
    v_version:=1;
  END IF;
  v_foundation_id:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
    reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(v_foundation_id,v_profile_id,
    CASE WHEN v_status='HELD' THEN 'accounting_ar_bridge_event_held' ELSE 'accounting_ar_bridge_event_classified' END,
    'accounting_ar_bridge_event',v_event.id,v_version,p_actor_user_id,p_request_id,btrim(p_reason),
    p_evidence_ref,v_fingerprint,'accounting_ar_bridge_events/'||v_event.id::text||'/'||v_version::text,clock_timestamp());
  INSERT INTO public.accounting_ar_bridge_event_versions(
    profile_id,event_id,version,previous_version,status,classification,source_snapshot,
    source_snapshot_sha256,amount_halalah,customer_id,service_id,invoice_id,source_business_date,
    source_occurred_at,source_recorded_at,accounting_date,evidence_ref,evidence_sha256,held_code,
    reason,created_by,payload_fingerprint,foundation_event_id
  ) VALUES(v_profile_id,v_event.id,v_version,CASE WHEN v_version=1 THEN NULL ELSE v_version-1 END,
    v_status,p_classification,v_snapshot,
    v_hash,(v_snapshot->>'amount_halalah')::bigint,(v_snapshot->>'customer_id')::uuid,
    nullif(v_snapshot->>'service_id','')::uuid,nullif(v_snapshot->>'invoice_id','')::uuid,
    nullif(v_snapshot->>'source_business_date','')::date,nullif(v_snapshot->>'source_occurred_at','')::timestamptz,
    (v_snapshot->>'source_recorded_at')::timestamptz,p_accounting_date,p_evidence_ref,p_evidence_sha256,
    v_held_code,btrim(p_reason),p_actor_user_id,v_fingerprint,v_foundation_id);
  UPDATE public.accounting_ar_bridge_events SET current_version=v_version
    WHERE profile_id=v_profile_id AND id=v_event.id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES(CASE WHEN v_status='HELD' THEN 'hold' ELSE 'classify' END,'accounting_ar_bridge_event',v_event.id,
    p_actor_user_id::text,jsonb_build_object('version',v_version,'request_id',p_request_id,
      'source_type',p_source_type,'source_record_id',p_source_record_id,'held_code',v_held_code),clock_timestamp());
  RETURN QUERY SELECT NULL::text,v_event.id,v_version,v_status,false;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
END;
$save_ar_bridge_event$;

CREATE FUNCTION public.accounting_ar_bridge_source_inventory(
  p_as_of_date date,p_recorded_at_cutoff timestamptz,p_limit integer
) RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $ar_source_inventory$
  WITH source_ids(source_type,source_record_id) AS (
    (SELECT 'INVOICE',i.id FROM public.invoices i
      WHERE i.issued_at IS NOT NULL
        AND coalesce(i.issued_at,i.created_at)<=p_recorded_at_cutoff
        AND coalesce(i.date,((i.issued_at AT TIME ZONE 'Asia/Riyadh')::date))<=p_as_of_date
      ORDER BY i.id LIMIT p_limit)
    UNION ALL
    (SELECT 'PAYMENT',p.id FROM public.payments p
      WHERE p.invoice_id IS NOT NULL AND NOT coalesce(p.is_deleted,false)
        AND p.created_at<=p_recorded_at_cutoff
        AND coalesce(p.date,((p.created_at AT TIME ZONE 'Asia/Riyadh')::date))<=p_as_of_date
      ORDER BY p.id LIMIT p_limit)
    UNION ALL
    (SELECT 'RECEIPT',p.id FROM public.payments p
      WHERE p.invoice_id IS NULL AND NOT coalesce(p.is_deleted,false)
        AND p.created_at<=p_recorded_at_cutoff
        AND coalesce(p.date,((p.created_at AT TIME ZONE 'Asia/Riyadh')::date))<=p_as_of_date
      ORDER BY p.id LIMIT p_limit)
    UNION ALL
    (SELECT 'ALLOCATION',a.id FROM public.customer_receipt_allocations a
      WHERE a.created_at<=p_recorded_at_cutoff
        AND (a.allocated_at AT TIME ZONE 'Asia/Riyadh')::date<=p_as_of_date
      ORDER BY a.id LIMIT p_limit)
    UNION ALL
    (SELECT 'RECEIPT_REVERSAL',r.id FROM public.customer_receipt_reversals r
      WHERE r.created_at<=p_recorded_at_cutoff
        AND (r.reversed_at AT TIME ZONE 'Asia/Riyadh')::date<=p_as_of_date
      ORDER BY r.id LIMIT p_limit)
    UNION ALL
    (SELECT 'ALLOCATION_REVERSAL',r.id FROM public.customer_receipt_allocation_reversals r
      WHERE r.created_at<=p_recorded_at_cutoff
        AND (r.reversed_at AT TIME ZONE 'Asia/Riyadh')::date<=p_as_of_date
      ORDER BY r.id LIMIT p_limit)
    UNION ALL
    (SELECT 'CREDIT_ADJUSTMENT',c.id FROM public.customer_internal_credit_adjustments c
      WHERE c.created_at<=p_recorded_at_cutoff
        AND coalesce(c.effective_date,(c.created_at AT TIME ZONE 'Asia/Riyadh')::date)<=p_as_of_date
      ORDER BY c.id LIMIT p_limit)
    UNION ALL
    (SELECT 'CREDIT_ADJUSTMENT_REVERSAL',r.id FROM public.customer_internal_credit_adjustment_reversals r
      WHERE r.created_at<=p_recorded_at_cutoff
        AND coalesce(r.effective_date,(r.created_at AT TIME ZONE 'Asia/Riyadh')::date)<=p_as_of_date
      ORDER BY r.id LIMIT p_limit)
    UNION ALL
    (SELECT 'CREDIT_APPLICATION',a.id FROM public.customer_credit_applications a
      WHERE a.created_at<=p_recorded_at_cutoff
        AND coalesce(a.business_date,(a.created_at AT TIME ZONE 'Asia/Riyadh')::date)<=p_as_of_date
      ORDER BY a.id LIMIT p_limit)
    UNION ALL
    (SELECT 'CREDIT_APPLICATION_REVERSAL',r.id FROM public.customer_credit_application_reversals r
      WHERE r.created_at<=p_recorded_at_cutoff
        AND coalesce(r.business_date,(r.created_at AT TIME ZONE 'Asia/Riyadh')::date)<=p_as_of_date
      ORDER BY r.id LIMIT p_limit)
    UNION ALL
    (SELECT 'REFUND',r.id FROM public.customer_refunds r
      WHERE r.created_at<=p_recorded_at_cutoff
        AND coalesce(r.business_date,(r.created_at AT TIME ZONE 'Asia/Riyadh')::date)<=p_as_of_date
      ORDER BY r.id LIMIT p_limit)
    UNION ALL
    (SELECT 'REFUND_REVERSAL',r.id FROM public.customer_refund_reversals r
      WHERE r.created_at<=p_recorded_at_cutoff
        AND coalesce(r.business_date,(r.created_at AT TIME ZONE 'Asia/Riyadh')::date)<=p_as_of_date
      ORDER BY r.id LIMIT p_limit)
  ), bounded_source_ids AS MATERIALIZED (
    SELECT s.source_type,s.source_record_id FROM source_ids s
    ORDER BY s.source_type,s.source_record_id LIMIT p_limit
  ), snapshots AS MATERIALIZED (
    SELECT public.accounting_ar_bridge_source_snapshot(s.source_type,s.source_record_id) AS item
    FROM bounded_source_ids s
  )
  SELECT item FROM snapshots
  WHERE item IS NOT NULL
    AND (item->>'source_recorded_at')::timestamptz<=p_recorded_at_cutoff
    AND coalesce(nullif(item->>'source_business_date','')::date,
      ((item->>'source_occurred_at')::timestamptz AT TIME ZONE 'Asia/Riyadh')::date)<=p_as_of_date
  ORDER BY item->>'source_type',item->>'source_record_id';
$ar_source_inventory$;

CREATE FUNCTION public.prepare_accounting_ar_bridge_event(
  p_actor_user_id uuid,p_event_id uuid,p_event_version integer,p_period_id uuid,
  p_period_version integer,p_posting_rule_id uuid,p_rule_version integer,p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $prepare_ar_bridge_event$
DECLARE
  v_profile_id uuid; v_event public.accounting_ar_bridge_events%ROWTYPE;
  v_event_version public.accounting_ar_bridge_event_versions%ROWTYPE;
  v_spec jsonb; v_journal jsonb; v_result record; v_snapshot jsonb;
  v_source_record_key text; v_economic_event_key text;
BEGIN
  IF p_actor_user_id IS NULL OR p_event_id IS NULL OR p_event_version IS NULL OR p_event_version<1
     OR p_period_id IS NULL OR p_period_version IS NULL OR p_posting_rule_id IS NULL
     OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 2000 OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_ar_bridge') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p
    JOIN public.accounting_profile_versions pv ON pv.profile_id=p.id AND pv.version=p.current_version
    WHERE p.singleton_key='g7' AND pv.activation_state='DEV_PROVISIONAL' FOR SHARE OF p;
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_not_active'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  SELECT e.* INTO v_event FROM public.accounting_ar_bridge_events e
    WHERE e.profile_id=v_profile_id AND e.id=p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  IF v_event.current_version<>p_event_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,v_event.id,v_event.current_version,NULL::text,false; RETURN;
  END IF;
  SELECT ev.* INTO v_event_version FROM public.accounting_ar_bridge_event_versions ev
    WHERE ev.profile_id=v_profile_id AND ev.event_id=v_event.id AND ev.version=p_event_version;
  IF NOT FOUND OR v_event_version.status<>'READY' THEN
    RETURN QUERY SELECT 'unsupported_classification'::text,v_event.id,p_event_version,NULL::text,false; RETURN;
  END IF;
  v_snapshot:=public.accounting_ar_bridge_source_snapshot(v_event.source_type,v_event.source_record_id);
  IF v_snapshot IS NULL OR v_snapshot IS DISTINCT FROM v_event_version.source_snapshot
     OR encode(extensions.digest(convert_to(v_snapshot::text,'UTF8'),'sha256'),'hex')
       <>v_event_version.source_snapshot_sha256 THEN
    RETURN QUERY SELECT 'source_payload_conflict'::text,v_event.id,p_event_version,NULL::text,false; RETURN;
  END IF;
   v_spec:=public.accounting_ar_bridge_posting_spec(
     v_event.source_type,v_event_version.classification,v_event_version.source_snapshot);
  IF v_spec IS NULL THEN
    RETURN QUERY SELECT 'unsupported_classification'::text,v_event.id,p_event_version,NULL::text,false; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_inception_coverage c
    JOIN public.accounting_inception_coverage_versions cv
      ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id AND cv.version=c.current_version
    WHERE c.profile_id=v_profile_id AND c.source_record_key=v_event.source_record_key
      AND c.economic_event_key=v_event.economic_event_key
      AND cv.classification IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE','UNRESOLVED')) THEN
    RETURN QUERY SELECT 'duplicate_coverage'::text,v_event.id,p_event_version,NULL::text,false; RETURN;
  END IF;
  v_source_record_key:=v_event.source_record_key;
  v_economic_event_key:=v_event.economic_event_key;
  v_journal:=jsonb_build_object(
    'source_domain','AR_BRIDGE','accounting_date',v_event_version.accounting_date,
    'period_id',p_period_id,'period_version',p_period_version,
    'posting_rule_id',p_posting_rule_id,'rule_version',p_rule_version,
    'source_record_key',v_source_record_key,'economic_event_key',v_economic_event_key,
    'posting_purpose','ar_bridge',
    'description_en','AR bridge '||v_event.source_type||' '||v_event.source_record_id::text,
    'description_ar','جسر الذمم '||v_event.source_record_id::text,
    'lines',jsonb_build_array(
      jsonb_build_object('mapping_key',v_spec->>'debit_key','side','DEBIT',
        'amount_halalah',v_event_version.amount_halalah::text,'service_id',v_event_version.service_id,
        'description_en','AR bridge debit','description_ar','مدين جسر الذمم'),
      jsonb_build_object('mapping_key',v_spec->>'credit_key','side','CREDIT',
        'amount_halalah',v_event_version.amount_halalah::text,'service_id',v_event_version.service_id,
        'description_en','AR bridge credit','description_ar','دائن جسر الذمم')));
  SELECT * INTO v_result FROM public.prepare_accounting_journal(
    p_actor_user_id,NULL,0,v_journal,btrim(p_reason),v_event_version.evidence_ref,p_request_id);
  IF v_result.error_code IS NOT NULL THEN
    RETURN QUERY SELECT v_result.error_code,v_result.journal_id,v_result.version,v_result.status,v_result.idempotent_replay; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_ar_bridge_journal_links l
      WHERE l.profile_id=v_profile_id AND l.event_id=v_event.id AND l.event_version=p_event_version
        AND l.journal_id=v_result.journal_id) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_JOURNAL_LINK_MISSING';
  END IF;
  RETURN QUERY SELECT NULL::text,v_result.journal_id,v_result.version,v_result.status,v_result.idempotent_replay;
END;
$prepare_ar_bridge_event$;

CREATE FUNCTION public.post_accounting_ar_bridge_journal(
  p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid
) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $post_ar_bridge_journal$
DECLARE v_profile_id uuid; v_header public.accounting_journal_versions%ROWTYPE;
  v_prepared_version integer; v_result record;
BEGIN
  IF p_actor_user_id IS NULL OR p_journal_id IS NULL OR p_expected_version IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_ar_bridge') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT j.profile_id INTO v_profile_id FROM public.accounting_journals j WHERE j.id=p_journal_id;
  SELECT v.* INTO v_header FROM public.accounting_journal_versions v
    JOIN public.accounting_journals j ON j.profile_id=v.profile_id AND j.id=v.journal_id
      AND j.current_version=v.version
    WHERE v.profile_id=v_profile_id AND v.journal_id=p_journal_id;
  IF NOT FOUND OR v_header.source_domain<>'AR_BRIDGE' THEN
    RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT l.prepared_version INTO v_prepared_version
  FROM public.accounting_ar_bridge_journal_links l
  WHERE l.profile_id=v_profile_id AND l.journal_id=p_journal_id;
  IF NOT FOUND OR NOT public.accounting_ar_bridge_journal_link_authorized(
       v_profile_id,p_journal_id,v_prepared_version,v_header.prepared_by) THEN
    RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT * INTO v_result FROM public.post_accounting_journal(
    p_actor_user_id,p_journal_id,p_expected_version,p_request_id);
  RETURN QUERY SELECT v_result.error_code,v_result.journal_id,v_result.version,v_result.status,v_result.idempotent_replay;
END;
$post_ar_bridge_journal$;

CREATE FUNCTION public.get_accounting_ar_bridge_reconciliation(
  p_actor_user_id uuid,p_as_of_date date,p_recorded_at_cutoff timestamptz,p_limit integer DEFAULT 200
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $get_ar_bridge_reconciliation$
DECLARE v_profile_id uuid; v_result jsonb;
BEGIN
  IF p_actor_user_id IS NULL OR p_as_of_date IS NULL OR p_recorded_at_cutoff IS NULL
     OR p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'ACCOUNTING_AR_BRIDGE_INVALID_INPUT'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT (public.get_accounting_capability(p_actor_user_id,'accounting:view')
       OR public.get_accounting_capability(p_actor_user_id,'accounting:manage_ar_bridge')) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT id INTO v_profile_id FROM public.accounting_profiles WHERE singleton_key='g7';
  IF NOT FOUND THEN RETURN jsonb_build_object('state','NOT_INITIALIZED'); END IF;
  WITH inventory AS MATERIALIZED (
    SELECT item FROM public.accounting_ar_bridge_source_inventory(p_as_of_date,p_recorded_at_cutoff,p_limit+1)
  ), joined AS MATERIALIZED (
    SELECT i.item,e.id AS event_id,ev.version AS event_version,ev.status AS event_status,
      ev.classification,ev.customer_id,ev.service_id,ev.invoice_id,ev.amount_halalah,
      ev.source_business_date,ev.source_recorded_at,ev.accounting_date,ev.held_code,ev.source_snapshot_sha256,
      l.journal_id,l.prepared_version,se.id AS source_effect_id,
      reversal.classification AS reversed_classification,
      posted.journal_id AS posted_journal_id,posted.accounting_date AS posted_accounting_date,
      posted.posted_at AS posted_at,coalesce(posted.ar_delta,0)::bigint AS posted_ar_delta,
      coalesce(covered.is_covered,false) AS is_inception_covered,
      coalesce(effect_count.count_effects,0) AS effect_count
    FROM inventory i
    LEFT JOIN public.accounting_ar_bridge_events e ON e.profile_id=v_profile_id
      AND e.source_record_key=i.item->>'source_record_key' AND e.economic_event_key=i.item->>'economic_event_key'
    LEFT JOIN LATERAL (
      SELECT x.* FROM public.accounting_ar_bridge_event_versions x
      WHERE x.profile_id=v_profile_id AND x.event_id=e.id
        AND x.created_at<=p_recorded_at_cutoff AND x.source_recorded_at<=p_recorded_at_cutoff
      ORDER BY x.version DESC LIMIT 1
    ) ev ON true
    LEFT JOIN public.accounting_ar_bridge_journal_links l ON l.profile_id=v_profile_id
      AND l.event_id=e.id AND l.event_version=ev.version AND l.created_at<=p_recorded_at_cutoff
    LEFT JOIN public.accounting_source_effects se ON se.id=l.source_effect_id
    LEFT JOIN LATERAL (
      SELECT source_version.classification FROM public.accounting_ar_bridge_events source_event
      JOIN public.accounting_ar_bridge_event_versions source_version
        ON source_version.profile_id=source_event.profile_id AND source_version.event_id=source_event.id
        AND source_version.created_at<=p_recorded_at_cutoff
      WHERE source_event.profile_id=v_profile_id AND source_event.source_type='CREDIT_ADJUSTMENT'
        AND source_event.source_record_id=nullif(i.item->>'reverses_source_record_id','')::uuid
      ORDER BY source_version.version DESC LIMIT 1
    ) reversal ON i.item->>'source_type'='CREDIT_ADJUSTMENT_REVERSAL'
    LEFT JOIN LATERAL (
      SELECT jv.journal_id,jv.accounting_date,jv.posted_at,
        sum(CASE WHEN ll.party_role='AR_CONTROL' THEN
          CASE WHEN jl.side='DEBIT' THEN jl.amount_halalah ELSE -jl.amount_halalah END ELSE 0 END) AS ar_delta
      FROM public.accounting_journal_versions jv
      JOIN public.accounting_journal_line_versions jl ON jl.profile_id=jv.profile_id
        AND jl.journal_id=jv.journal_id AND jl.journal_version=jv.version
      JOIN public.accounting_ar_bridge_journal_lines ll ON ll.profile_id=jl.profile_id
        AND ll.journal_id=jl.journal_id AND ll.journal_version=l.prepared_version
        AND ll.line_number=jl.line_number AND ll.event_id=l.event_id AND ll.event_version=l.event_version
      WHERE l.journal_id IS NOT NULL AND jv.profile_id=v_profile_id AND jv.journal_id=l.journal_id
        AND jv.status='POSTED' AND jv.posted_at<=p_recorded_at_cutoff AND jv.accounting_date<=p_as_of_date
      GROUP BY jv.journal_id,jv.accounting_date,jv.posted_at ORDER BY jv.posted_at DESC LIMIT 1
    ) posted ON true
    LEFT JOIN LATERAL (
      SELECT EXISTS(SELECT 1 FROM public.accounting_inception_coverage c
        JOIN LATERAL (
          SELECT x.* FROM public.accounting_inception_coverage_versions x
          WHERE x.profile_id=c.profile_id AND x.coverage_id=c.id AND x.created_at<=p_recorded_at_cutoff
          ORDER BY x.version DESC LIMIT 1
        ) cv ON true
        WHERE c.profile_id=v_profile_id AND c.source_record_key=i.item->>'source_record_key'
          AND c.economic_event_key=i.item->>'economic_event_key'
          AND cv.classification IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE','UNRESOLVED')) AS is_covered
    ) covered ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS count_effects FROM public.accounting_source_effects x
      WHERE x.profile_id=v_profile_id AND x.source_domain='AR_BRIDGE'
        AND x.source_record_key=i.item->>'source_record_key' AND x.economic_event_key=i.item->>'economic_event_key'
        AND x.posting_purpose='ar_bridge' AND x.created_at<=p_recorded_at_cutoff
    ) effect_count ON true
  ), details AS (
    SELECT j.*,CASE
      WHEN j.is_inception_covered THEN 'INCEPTION_COVERED'
      WHEN j.effect_count>1 THEN 'DUPLICATE_CONFLICT'
      WHEN j.event_id IS NULL OR j.event_version IS NULL THEN 'MISSING_EFFECT'
      WHEN j.event_status='HELD' THEN 'HELD'
      WHEN j.posted_journal_id IS NOT NULL THEN 'POSTED'
      WHEN j.source_effect_id IS NOT NULL THEN 'PREPARED'
      ELSE 'MISSING_EFFECT' END AS reconciliation_status,
      CASE
        WHEN j.item->>'source_type'='CREDIT_ADJUSTMENT' AND j.classification='CUSTOMER_LIABILITY' THEN 0
        WHEN j.item->>'source_type'='CREDIT_ADJUSTMENT' AND j.classification IS NULL
          AND round(((j.item->'attributes'->>'customer_credit_balance_after')::numeric)*100)::bigint
            = (j.item->>'amount_halalah')::bigint
          AND coalesce((j.item->'attributes'->>'prior_credit_adjustment_count')::bigint,0)=0 THEN 0
        WHEN j.item->>'source_type'='CREDIT_ADJUSTMENT_REVERSAL'
          AND j.reversed_classification='CUSTOMER_LIABILITY' THEN 0
        ELSE CASE j.item->>'source_type'
          WHEN 'INVOICE' THEN 1 WHEN 'ALLOCATION' THEN -1 WHEN 'ALLOCATION_REVERSAL' THEN 1
          WHEN 'CREDIT_ADJUSTMENT' THEN -1 WHEN 'CREDIT_ADJUSTMENT_REVERSAL' THEN 1
          WHEN 'CREDIT_APPLICATION' THEN -1 WHEN 'CREDIT_APPLICATION_REVERSAL' THEN 1
          ELSE 0 END * coalesce(j.amount_halalah,(j.item->>'amount_halalah')::bigint)
      END AS expected_ar_delta
    FROM joined j
  ), visible AS MATERIALIZED (
    SELECT d.* FROM details d
    ORDER BY d.item->>'source_type',d.item->>'source_record_id' LIMIT p_limit
  ), party AS (
    SELECT coalesce(customer_id,(item->>'customer_id')::uuid) AS customer_id,
      coalesce(service_id,nullif(item->>'service_id','')::uuid) AS service_id,
      coalesce(invoice_id,nullif(item->>'invoice_id','')::uuid) AS invoice_id,
      sum(expected_ar_delta)::bigint AS source_ar_delta_halalah,
      sum(posted_ar_delta)::bigint AS posted_ar_delta_halalah
    FROM visible WHERE NOT is_inception_covered
    GROUP BY coalesce(customer_id,(item->>'customer_id')::uuid),
      coalesce(service_id,nullif(item->>'service_id','')::uuid),
      coalesce(invoice_id,nullif(item->>'invoice_id','')::uuid)
  )
  SELECT jsonb_build_object(
    'state','READY','as_of_date',p_as_of_date,'recorded_at_cutoff',p_recorded_at_cutoff,
    'source_event_count',(SELECT count(*) FROM visible),
    'posted_effect_count',(SELECT count(*) FROM visible WHERE reconciliation_status='POSTED'),
    'held_unresolved_count',(SELECT count(*) FROM visible WHERE reconciliation_status='HELD'),
    'inception_covered_count',(SELECT count(*) FROM visible WHERE reconciliation_status='INCEPTION_COVERED'),
    'missing_effect_count',(SELECT count(*) FROM visible WHERE reconciliation_status='MISSING_EFFECT'),
    'duplicate_conflict_count',(SELECT count(*) FROM visible WHERE effect_count>1),
    'party_difference_count',(SELECT count(*) FROM party WHERE source_ar_delta_halalah<>posted_ar_delta_halalah),
    'timing_difference_count',(SELECT count(*) FROM visible WHERE reconciliation_status='POSTED'
      AND source_business_date IS NOT NULL AND posted_accounting_date IS DISTINCT FROM source_business_date),
    'truncated',(SELECT count(*)>p_limit FROM inventory),
    'events',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'source_type',item->>'source_type','source_record_id',item->>'source_record_id',
      'source_record_key',item->>'source_record_key','economic_event_key',item->>'economic_event_key',
      'reconciliation_status',reconciliation_status,'event_id',event_id,'event_version',event_version,
      'classification',classification,'customer_id',coalesce(customer_id,(item->>'customer_id')::uuid),
      'service_id',coalesce(service_id,nullif(item->>'service_id','')::uuid),
      'invoice_id',coalesce(invoice_id,nullif(item->>'invoice_id','')::uuid),
      'amount_halalah',coalesce(amount_halalah,(item->>'amount_halalah')::bigint)::text,
      'source_business_date',coalesce(source_business_date,nullif(item->>'source_business_date','')::date),
      'source_recorded_at',coalesce(source_recorded_at,(item->>'source_recorded_at')::timestamptz),
      'accounting_date',accounting_date,'posted_accounting_date',posted_accounting_date,
      'posted_at',posted_at,'journal_id',posted_journal_id,'held_code',held_code,
      'expected_ar_delta_halalah',expected_ar_delta::text,'posted_ar_delta_halalah',posted_ar_delta::text,
      'source_snapshot_sha256',source_snapshot_sha256) ORDER BY item->>'source_type',item->>'source_record_id')
      FROM visible),'[]'::jsonb),
    'party_balances',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'customer_id',customer_id,'service_id',service_id,'invoice_id',invoice_id,
      'source_ar_delta_halalah',source_ar_delta_halalah::text,
      'posted_ar_delta_halalah',posted_ar_delta_halalah::text,
      'difference_halalah',(source_ar_delta_halalah-posted_ar_delta_halalah)::text)
      ORDER BY customer_id,service_id,invoice_id) FROM party),'[]'::jsonb)
  ) INTO v_result;
  RETURN v_result;
END;
$get_ar_bridge_reconciliation$;

-- Extend W10C's typed journal seam without changing its INCEPTION behavior.
DO $w10d_engine_extension$
DECLARE
  v_function oid; v_source text; v_repaired text; v_old text; v_new text;
  v_owner oid; v_acl aclitem[]; v_config text[];
  v_after_owner oid; v_after_acl aclitem[]; v_after_config text[];
  v_volatility "char"; v_parallel "char"; v_cost real; v_rows real;
  v_strict boolean; v_leakproof boolean; v_security boolean;
BEGIN
  v_function:=to_regprocedure('public.validate_accounting_posting_rule_mapping()');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.prosecdef
    INTO v_source,v_owner,v_acl,v_config,v_volatility,v_parallel,v_cost,v_rows,v_strict,v_leakproof,v_security
  FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_function IS NULL OR v_source IS NULL OR NOT v_security OR v_volatility<>'v'
     OR v_parallel<>'u' OR v_cost<>100 OR v_rows<>0 OR v_strict OR v_leakproof
     OR v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN
    RAISE EXCEPTION 'W10D preflight: posting-rule mapping validator contract differs';
  END IF;
  v_old:='NOT public.accounting_inception_mapping_authorized(NEW.profile_id,NEW.posting_rule_id,'
    ||'NEW.rule_version,NEW.mapping_key,NEW.account_id,NEW.account_version)';
  v_new:='NOT (public.accounting_inception_mapping_authorized(NEW.profile_id,NEW.posting_rule_id,'
    ||'NEW.rule_version,NEW.mapping_key,NEW.account_id,NEW.account_version) OR '
    ||'public.accounting_ar_bridge_account_authorized(NEW.profile_id,NEW.mapping_key,'
    ||'NEW.account_id,NEW.account_version))';
  IF length(v_source)-length(replace(v_source,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10D preflight: posting-rule mapping authorization anchor differs';
  END IF;
  v_repaired:=replace(v_source,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.validate_accounting_posting_rule_mapping()
    RETURNS trigger LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF
    SECURITY DEFINER PARALLEL UNSAFE COST 100 SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);
  SELECT p.proowner,p.proacl,p.proconfig INTO v_after_owner,v_after_acl,v_after_config
    FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl
     OR v_after_config IS DISTINCT FROM v_config THEN
    RAISE EXCEPTION 'W10D postflight: posting-rule mapping validator owner, ACL, or configuration changed';
  END IF;

  v_function:=to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.prosecdef
    INTO v_source,v_owner,v_acl,v_config,v_volatility,v_parallel,v_cost,v_rows,v_strict,v_leakproof,v_security
  FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_function IS NULL OR v_source IS NULL OR NOT v_security OR v_volatility<>'v'
     OR v_parallel<>'u' OR v_cost<>100 OR v_rows<>1000 OR v_strict OR v_leakproof
     OR v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN
    RAISE EXCEPTION 'W10D preflight: journal prepare contract differs';
  END IF;
  v_repaired:=v_source;
  v_old:='p_journal->>''source_domain'' IS DISTINCT FROM ''INCEPTION''';
  v_new:='p_journal->>''source_domain'' NOT IN (''INCEPTION'',''AR_BRIDGE'')';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10D preflight: journal prepare source-domain payload anchor differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='v_source_domain NOT IN (concat(''CONTROLLED_'',''MANUAL''),''INCEPTION'')';
  v_new:='v_source_domain NOT IN (concat(''CONTROLLED_'',''MANUAL''),''INCEPTION'',''AR_BRIDGE'')';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10D preflight: journal prepare source-domain gate differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:prepare_journal'') THEN';
  v_new:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:prepare_journal'')'
    ||' AND NOT (v_source_domain=''AR_BRIDGE'' AND public.get_accounting_capability('
    ||'p_actor_user_id,''accounting:manage_ar_bridge'')) THEN';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10D preflight: journal prepare authority gate differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='public.accounting_inception_journal_line_authorized(v_profile_id,p_journal,'
    ||'v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)))';
  v_new:='public.accounting_inception_journal_line_authorized(v_profile_id,p_journal,'
    ||'v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id))'
    ||' OR (v_source_domain=''AR_BRIDGE'' AND public.accounting_ar_bridge_line_authorized('
    ||'v_profile_id,p_journal,v_line_number,v_mapping.mapping_key,v_mapping.account_id,'
    ||'v_mapping.account_version,p_actor_user_id)))';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10D preflight: journal prepare protected-account gate differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.prepare_accounting_journal(
    p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_journal jsonb,
    p_reason text,p_evidence_ref text,p_request_id uuid
  ) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
    LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER
    PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);
  SELECT p.proowner,p.proacl,p.proconfig INTO v_after_owner,v_after_acl,v_after_config
    FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl
     OR v_after_config IS DISTINCT FROM v_config THEN
    RAISE EXCEPTION 'W10D postflight: journal prepare owner, ACL, or configuration changed';
  END IF;

  v_function:=to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.prosecdef
    INTO v_source,v_owner,v_acl,v_config,v_volatility,v_parallel,v_cost,v_rows,v_strict,v_leakproof,v_security
  FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_function IS NULL OR v_source IS NULL OR NOT v_security OR v_volatility<>'v'
     OR v_parallel<>'u' OR v_cost<>100 OR v_rows<>1000 OR v_strict OR v_leakproof
     OR v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN
    RAISE EXCEPTION 'W10D preflight: journal post contract differs';
  END IF;
  v_repaired:=v_source;
  v_old:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:post_journal'') THEN';
  v_new:='IF NOT public.get_accounting_capability(p_actor_user_id,''accounting:post_journal'')'
    ||' AND NOT (EXISTS(SELECT 1 FROM public.accounting_journal_versions ax'
    ||' WHERE ax.journal_id=p_journal_id AND ax.source_domain=''AR_BRIDGE'')'
    ||' AND public.get_accounting_capability(p_actor_user_id,''accounting:manage_ar_bridge'')) THEN';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10D preflight: journal post authority gate differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='  IF v_header.status=''POSTED'' THEN';
  v_new:=$post_guard$
  IF v_header.source_domain='AR_BRIDGE' AND (
       NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_ar_bridge')
       OR NOT public.accounting_ar_bridge_journal_link_authorized(
         v_profile_id,p_journal_id,v_header.version,v_header.prepared_by)
     ) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AR_BRIDGE_JOURNAL_NOT_AUTHORIZED';
  END IF;
  IF v_header.status='POSTED' THEN
  $post_guard$;
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10D preflight: journal post link-authorization anchor differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='OR NOT av.is_active OR ((av.is_protected OR av.control_classification<>''NONE'') AND v_header.source_domain<>''INCEPTION'')';
  v_new:='OR NOT av.is_active OR ((av.is_protected OR av.control_classification<>''NONE'') AND NOT ('
    ||'v_header.source_domain=''INCEPTION'' OR (v_header.source_domain=''AR_BRIDGE'' AND '
    ||'public.accounting_ar_bridge_journal_account_authorized(v_profile_id,p_journal_id,'
    ||'v_header.version,l.line_number,l.account_id,l.account_version,v_header.prepared_by))))';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10D preflight: journal post protected-account gate differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.post_accounting_journal(
    p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid
  ) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
    LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER
    PARALLEL UNSAFE COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);
  SELECT p.proowner,p.proacl,p.proconfig INTO v_after_owner,v_after_acl,v_after_config
    FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl
     OR v_after_config IS DISTINCT FROM v_config THEN
    RAISE EXCEPTION 'W10D postflight: journal post owner, ACL, or configuration changed';
  END IF;

END;
$w10d_engine_extension$;

REVOKE ALL ON FUNCTION public.prevent_accounting_ar_bridge_history_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_source_snapshot(text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_posting_spec(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_account_authorized(uuid,text,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_mapping_authorized(uuid,uuid,integer,text,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_line_authorized(uuid,jsonb,integer,text,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_journal_link_authorized(uuid,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_journal_account_authorized(uuid,uuid,integer,integer,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_source_effect_link() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_source_inventory(date,timestamptz,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_accounting_ar_bridge_event(uuid,text,uuid,integer,text,date,text,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prepare_accounting_ar_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.post_accounting_ar_bridge_journal(uuid,uuid,integer,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_accounting_ar_bridge_reconciliation(uuid,date,timestamptz,integer) FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.save_accounting_ar_bridge_event(uuid,text,uuid,integer,text,date,text,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_accounting_ar_bridge_event(uuid,uuid,integer,uuid,integer,uuid,integer,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_accounting_ar_bridge_journal(uuid,uuid,integer,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_ar_bridge_reconciliation(uuid,date,timestamptz,integer) TO service_role;

COMMIT;
