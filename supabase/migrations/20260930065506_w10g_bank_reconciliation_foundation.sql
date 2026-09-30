-- W10G: bounded, manual, evidence-first Bank Reconciliation foundation.
-- Reconciliation records external evidence and matching state; it never posts a journal.
BEGIN;

DO $w10g_preflight$
DECLARE
  v_state text;
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL
     OR to_regclass('public.accounting_accounts') IS NULL
     OR to_regclass('public.accounting_account_versions') IS NULL
     OR to_regclass('public.accounting_journal_versions') IS NULL
     OR to_regclass('public.accounting_journal_line_versions') IS NULL
     OR to_regclass('public.accounting_capability_catalog') IS NULL
     OR to_regclass('public.accounting_foundation_events') IS NULL
     OR to_regprocedure('public.get_accounting_capability(uuid,text)') IS NULL THEN
    RAISE EXCEPTION 'W10G preflight: W10A/W10B authority and posted-ledger objects are missing';
  END IF;
  SELECT c.enabled::text||':'||c.runtime_allow_grantable::text||':'||c.owner_slice
    INTO v_state
  FROM public.accounting_capability_catalog c
  WHERE c.capability='accounting:reconcile_bank';
  IF v_state IS DISTINCT FROM 'false:false:W10G' THEN
    RAISE EXCEPTION 'W10G preflight: reconcile_bank capability state differs: %',v_state;
  END IF;
  IF to_regclass('public.accounting_bank_bindings') IS NOT NULL
     OR to_regclass('public.accounting_bank_statement_batches') IS NOT NULL
     OR to_regclass('public.accounting_bank_reconciliation_groups') IS NOT NULL
     OR to_regprocedure('public.save_accounting_bank_binding(uuid,uuid,integer,uuid,integer,text,text,date,date,text,text,text,text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'W10G preflight: target objects already exist';
  END IF;
END;
$w10g_preflight$;

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
    'accounting_revenue_arrangement_prepared','accounting_revenue_arrangement_held','accounting_revenue_arrangement_reviewed',
    'accounting_revenue_evidence_submitted','accounting_revenue_evidence_reviewed','accounting_revenue_recognition_prepared',
    'accounting_revenue_correction_held',
    'accounting_bank_binding_prepared','accounting_bank_binding_reviewed','accounting_bank_statement_batch_recorded',
    'accounting_bank_statement_line_recorded','accounting_bank_reconciliation_prepared',
    'accounting_bank_reconciliation_reviewed','accounting_bank_reconciliation_unmatched')),
  ADD CONSTRAINT accounting_foundation_events_entity_type_check CHECK(entity_type IN (
    'capability_assignment','accounting_profile','accounting_account','accounting_period','accounting_posting_rule',
    'accounting_journal','accounting_inception_package','accounting_inception_review','accounting_inception_acceptance',
    'accounting_ar_bridge_event','accounting_ap_bridge_event','accounting_expense_bridge_event',
    'accounting_revenue_arrangement','accounting_revenue_performance_unit','accounting_revenue_performance_evidence',
    'accounting_revenue_recognition_event','accounting_revenue_arrangement_review',
    'accounting_revenue_performance_evidence_review','accounting_bank_binding','accounting_bank_statement_batch',
    'accounting_bank_statement_line','accounting_bank_reconciliation'));

ALTER TABLE public.accounting_capability_catalog
  DROP CONSTRAINT accounting_capability_catalog_state_check;
UPDATE public.accounting_capability_catalog
SET enabled=true,runtime_allow_grantable=true
WHERE capability='accounting:reconcile_bank' AND owner_slice='W10G';
ALTER TABLE public.accounting_capability_catalog
  ADD CONSTRAINT accounting_capability_catalog_state_check CHECK(
    (capability IN ('accounting:view','accounting:manage_profile') AND enabled AND runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_authority' AND enabled AND NOT runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability IN ('accounting:manage_chart','accounting:manage_periods') AND enabled AND runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability IN ('accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal') AND enabled AND runtime_allow_grantable AND owner_slice='W10B')
    OR (capability='accounting:manage_inception' AND enabled AND runtime_allow_grantable AND owner_slice='W10C')
    OR (capability='accounting:manage_ar_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10D')
    OR (capability IN ('accounting:manage_ap_bridge','accounting:manage_expense_bridge') AND enabled AND runtime_allow_grantable AND owner_slice='W10E')
    OR (capability='accounting:manage_revenue_recognition' AND enabled AND runtime_allow_grantable AND owner_slice='W10F')
    OR (capability='accounting:reconcile_bank' AND enabled AND runtime_allow_grantable AND owner_slice='W10G')
    OR (capability IN ('accounting:close_period','accounting:reopen_period') AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I')
    OR (capability='accounting:view_statements' AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10H'));
CREATE TABLE public.accounting_bank_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id)
);

CREATE TABLE public.accounting_bank_binding_versions (
  profile_id uuid NOT NULL,
  binding_id uuid NOT NULL,
  version integer NOT NULL CHECK(version>0),
  previous_version integer,
  status text NOT NULL CHECK(status IN ('PREPARED','APPROVED','REJECTED','RETIRED')),
  account_id uuid NOT NULL,
  account_version integer NOT NULL,
  bank_identity_ref text NOT NULL CHECK(length(btrim(bank_identity_ref)) BETWEEN 1 AND 2000),
  bank_identity_sha256 text NOT NULL CHECK(bank_identity_sha256~'^[0-9a-f]{64}$'),
  currency text NOT NULL DEFAULT 'SAR' CHECK(currency='SAR'),
  effective_from date NOT NULL,
  effective_through date,
  masked_display_identity text NOT NULL CHECK(length(btrim(masked_display_identity)) BETWEEN 1 AND 200),
  evidence_ref text NOT NULL CHECK(length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  evidence_sha256 text NOT NULL CHECK(evidence_sha256~'^[0-9a-f]{64}$'),
  prepared_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reviewed_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  request_id uuid NOT NULL,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint~'^[0-9a-f]{64}$'),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,binding_id,version),
  FOREIGN KEY(profile_id,binding_id) REFERENCES public.accounting_bank_bindings(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,binding_id,previous_version)
    REFERENCES public.accounting_bank_binding_versions(profile_id,binding_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,account_id,account_version)
    REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id), UNIQUE(profile_id,prepared_by,request_id),
  CHECK(effective_through IS NULL OR effective_through>=effective_from),
  CHECK((status IN ('PREPARED','REJECTED') AND reviewed_by IS NULL AND reviewed_at IS NULL)
     OR (status IN ('APPROVED','RETIRED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);

CREATE TABLE public.accounting_bank_binding_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  binding_id uuid NOT NULL,
  binding_version integer NOT NULL,
  decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED','RETIRED')),
  reviewer_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  request_id uuid NOT NULL,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint~'^[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id), UNIQUE(profile_id,reviewer_user_id,request_id),
  FOREIGN KEY(profile_id,binding_id,binding_version)
    REFERENCES public.accounting_bank_binding_versions(profile_id,binding_id,version) ON DELETE RESTRICT
);

ALTER TABLE public.accounting_bank_bindings
  ADD CONSTRAINT accounting_bank_bindings_current_version_fkey
  FOREIGN KEY(profile_id,id,current_version)
  REFERENCES public.accounting_bank_binding_versions(profile_id,binding_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_bank_statement_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id)
);

CREATE TABLE public.accounting_bank_statement_batch_versions (
  profile_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  version integer NOT NULL CHECK(version>0),
  previous_version integer,
  binding_id uuid NOT NULL,
  binding_version integer NOT NULL,
  source_document_ref text NOT NULL CHECK(length(btrim(source_document_ref)) BETWEEN 1 AND 2000),
  evidence_sha256 text NOT NULL CHECK(evidence_sha256~'^[0-9a-f]{64}$'),
  evidence_identity text NOT NULL CHECK(length(btrim(evidence_identity)) BETWEEN 1 AND 300),
  coverage_start date NOT NULL,
  coverage_end date NOT NULL,
  opening_balance_halalah bigint NOT NULL,
  closing_balance_halalah bigint NOT NULL,
  currency text NOT NULL DEFAULT 'SAR' CHECK(currency='SAR'),
  status text NOT NULL CHECK(status IN ('RECORDED','REJECTED')),
  recorded_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  request_id uuid NOT NULL,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint~'^[0-9a-f]{64}$'),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,batch_id,version),
  FOREIGN KEY(profile_id,batch_id) REFERENCES public.accounting_bank_statement_batches(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,batch_id,previous_version)
    REFERENCES public.accounting_bank_statement_batch_versions(profile_id,batch_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,binding_id,binding_version)
    REFERENCES public.accounting_bank_binding_versions(profile_id,binding_id,version) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id), UNIQUE(profile_id,recorded_by,request_id),
  CHECK(coverage_end>=coverage_start)
);

ALTER TABLE public.accounting_bank_statement_batches
  ADD CONSTRAINT accounting_bank_statement_batches_current_version_fkey
  FOREIGN KEY(profile_id,id,current_version)
  REFERENCES public.accounting_bank_statement_batch_versions(profile_id,batch_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_bank_statement_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  batch_id uuid NOT NULL,
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id),
  FOREIGN KEY(profile_id,batch_id) REFERENCES public.accounting_bank_statement_batches(profile_id,id) ON DELETE RESTRICT
);

CREATE TABLE public.accounting_bank_statement_line_versions (
  profile_id uuid NOT NULL,
  line_id uuid NOT NULL,
  version integer NOT NULL CHECK(version>0),
  previous_version integer,
  batch_id uuid NOT NULL,
  batch_version integer NOT NULL,
  stable_line_identity text NOT NULL CHECK(length(btrim(stable_line_identity)) BETWEEN 1 AND 300),
  transaction_date date NOT NULL,
  value_date date,
  signed_amount_halalah bigint NOT NULL CHECK(signed_amount_halalah<>0),
  direction text NOT NULL CHECK(direction IN ('INFLOW','OUTFLOW')),
  reference text,
  description text,
  source_row_identity text NOT NULL CHECK(length(btrim(source_row_identity)) BETWEEN 1 AND 300),
  duplicate_fingerprint text NOT NULL CHECK(duplicate_fingerprint~'^[0-9a-f]{64}$'),
  duplicate_candidate boolean NOT NULL DEFAULT false,
  recorded_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  request_id uuid NOT NULL,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint~'^[0-9a-f]{64}$'),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,line_id,version),
  FOREIGN KEY(profile_id,line_id) REFERENCES public.accounting_bank_statement_lines(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,line_id,previous_version)
    REFERENCES public.accounting_bank_statement_line_versions(profile_id,line_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,batch_id,batch_version)
    REFERENCES public.accounting_bank_statement_batch_versions(profile_id,batch_id,version) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id), UNIQUE(profile_id,recorded_by,request_id),
  CHECK((direction='INFLOW' AND signed_amount_halalah>0) OR (direction='OUTFLOW' AND signed_amount_halalah<0)),
  CHECK(value_date IS NULL OR value_date>=transaction_date)
);

ALTER TABLE public.accounting_bank_statement_lines
  ADD CONSTRAINT accounting_bank_statement_lines_current_version_fkey
  FOREIGN KEY(profile_id,id,current_version)
  REFERENCES public.accounting_bank_statement_line_versions(profile_id,line_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_bank_reconciliation_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id)
);

CREATE TABLE public.accounting_bank_reconciliation_group_versions (
  profile_id uuid NOT NULL,
  group_id uuid NOT NULL,
  version integer NOT NULL CHECK(version>0),
  previous_version integer,
  binding_id uuid NOT NULL,
  binding_version integer NOT NULL,
  as_of_date date NOT NULL,
  recorded_at_cutoff timestamptz NOT NULL,
  status text NOT NULL CHECK(status='PREPARED'),
  rationale text NOT NULL CHECK(length(btrim(rationale)) BETWEEN 1 AND 2000),
  evidence_ref text,
  prepared_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  request_id uuid NOT NULL,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint~'^[0-9a-f]{64}$'),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,group_id,version),
  FOREIGN KEY(profile_id,group_id) REFERENCES public.accounting_bank_reconciliation_groups(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,group_id,previous_version)
    REFERENCES public.accounting_bank_reconciliation_group_versions(profile_id,group_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,binding_id,binding_version)
    REFERENCES public.accounting_bank_binding_versions(profile_id,binding_id,version) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id), UNIQUE(profile_id,prepared_by,request_id)
);

CREATE TABLE public.accounting_bank_reconciliation_allocations (
  profile_id uuid NOT NULL,
  group_id uuid NOT NULL,
  group_version integer NOT NULL,
  allocation_number integer NOT NULL CHECK(allocation_number>0),
  statement_line_id uuid NOT NULL,
  statement_line_version integer NOT NULL,
  ledger_journal_id uuid NOT NULL,
  ledger_journal_version integer NOT NULL,
  ledger_line_number integer NOT NULL CHECK(ledger_line_number BETWEEN 1 AND 200),
  statement_allocated_halalah bigint NOT NULL CHECK(statement_allocated_halalah<>0),
  ledger_allocated_halalah bigint NOT NULL CHECK(ledger_allocated_halalah<>0),
  rationale text NOT NULL CHECK(length(btrim(rationale)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,group_id,group_version,allocation_number),
  FOREIGN KEY(profile_id,group_id,group_version)
    REFERENCES public.accounting_bank_reconciliation_group_versions(profile_id,group_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,statement_line_id,statement_line_version)
    REFERENCES public.accounting_bank_statement_line_versions(profile_id,line_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,ledger_journal_id,ledger_journal_version,ledger_line_number)
    REFERENCES public.accounting_journal_line_versions(profile_id,journal_id,journal_version,line_number) ON DELETE RESTRICT,
  CHECK(statement_allocated_halalah*ledger_allocated_halalah>0)
);

CREATE TABLE public.accounting_bank_reconciliation_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  group_id uuid NOT NULL,
  group_version integer NOT NULL,
  decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED','UNMATCHED','IMPACT_REVIEW_REQUIRED')),
  reviewer_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  request_id uuid NOT NULL,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint~'^[0-9a-f]{64}$'),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id), UNIQUE(profile_id,reviewer_user_id,request_id),
  FOREIGN KEY(profile_id,group_id,group_version)
    REFERENCES public.accounting_bank_reconciliation_group_versions(profile_id,group_id,version) ON DELETE RESTRICT
);

CREATE INDEX accounting_bank_binding_versions_effective_idx
  ON public.accounting_bank_binding_versions(profile_id,account_id,effective_from,effective_through,created_at);
CREATE INDEX accounting_bank_statement_batch_versions_cutoff_idx
  ON public.accounting_bank_statement_batch_versions(profile_id,binding_id,coverage_end,recorded_at);
CREATE INDEX accounting_bank_statement_line_versions_match_idx
  ON public.accounting_bank_statement_line_versions(profile_id,batch_id,transaction_date,duplicate_fingerprint,recorded_at);
CREATE INDEX accounting_bank_reconciliation_allocations_statement_idx
  ON public.accounting_bank_reconciliation_allocations(profile_id,statement_line_id,statement_line_version);
CREATE INDEX accounting_bank_reconciliation_allocations_ledger_idx
  ON public.accounting_bank_reconciliation_allocations(profile_id,ledger_journal_id,ledger_journal_version,ledger_line_number);
CREATE INDEX accounting_bank_reconciliation_reviews_status_idx
  ON public.accounting_bank_reconciliation_reviews(profile_id,group_id,group_version,recorded_at);

CREATE OR REPLACE FUNCTION public.prevent_accounting_bank_history_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
BEGIN
  RAISE EXCEPTION 'accounting bank reconciliation history is append-only';
END;
$fn$;

CREATE TRIGGER accounting_bank_binding_versions_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_bank_binding_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_bank_history_mutation();
CREATE TRIGGER accounting_bank_binding_reviews_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_bank_binding_reviews
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_bank_history_mutation();
CREATE TRIGGER accounting_bank_statement_batch_versions_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_bank_statement_batch_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_bank_history_mutation();
CREATE TRIGGER accounting_bank_statement_line_versions_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_bank_statement_line_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_bank_history_mutation();
CREATE TRIGGER accounting_bank_reconciliation_group_versions_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_bank_reconciliation_group_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_bank_history_mutation();
CREATE TRIGGER accounting_bank_reconciliation_allocations_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_bank_reconciliation_allocations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_bank_history_mutation();
CREATE TRIGGER accounting_bank_reconciliation_reviews_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_bank_reconciliation_reviews
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_bank_history_mutation();

CREATE OR REPLACE FUNCTION public.accounting_bank_reconciliation_reversal_impact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE
  v_alloc record;
  v_fid uuid;
BEGIN
  IF NEW.reversal_of_journal_id IS NULL THEN RETURN NEW; END IF;
  FOR v_alloc IN
    SELECT DISTINCT a.profile_id,a.group_id,a.group_version,r.reviewer_user_id
    FROM public.accounting_bank_reconciliation_allocations a
    JOIN LATERAL (
      SELECT r.* FROM public.accounting_bank_reconciliation_reviews r
      WHERE r.profile_id=a.profile_id AND r.group_id=a.group_id AND r.group_version=a.group_version
      ORDER BY r.recorded_at DESC,r.id DESC LIMIT 1
    ) r ON r.decision='APPROVED'
    WHERE a.profile_id=NEW.profile_id AND a.ledger_journal_id=NEW.reversal_of_journal_id
  LOOP
    INSERT INTO public.accounting_foundation_events(
      profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
      reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
    VALUES(NEW.profile_id,'accounting_bank_reconciliation_reviewed','accounting_bank_reconciliation',v_alloc.group_id,
      v_alloc.group_version,coalesce(NEW.posted_by,NEW.prepared_by),gen_random_uuid(),
      'Reversed ledger cash journal requires reconciliation impact review',NULL,
      encode(extensions.digest(convert_to(NEW.reversal_of_journal_id::text||':'||v_alloc.group_id::text,'UTF8'),'sha256'),'hex'),
      'accounting_bank_reconciliation/'||v_alloc.group_id::text||'/'||v_alloc.group_version::text,clock_timestamp())
    RETURNING id INTO v_fid;
    INSERT INTO public.accounting_bank_reconciliation_reviews(
      profile_id,group_id,group_version,decision,reviewer_user_id,reason,request_id,payload_fingerprint,foundation_event_id)
    VALUES(v_alloc.profile_id,v_alloc.group_id,v_alloc.group_version,'IMPACT_REVIEW_REQUIRED',
      coalesce(NEW.posted_by,NEW.prepared_by),'Reversal of reconciled cash journal requires explicit impact review',
      gen_random_uuid(),encode(extensions.digest(convert_to(NEW.reversal_of_journal_id::text||':'||v_alloc.group_id::text||':impact','UTF8'),'sha256'),'hex'),v_fid);
  END LOOP;
  RETURN NEW;
END;
$fn$;

CREATE TRIGGER accounting_bank_reconciliation_reversal_impact
  AFTER INSERT ON public.accounting_journal_versions
  FOR EACH ROW WHEN (NEW.reversal_of_journal_id IS NOT NULL)
  EXECUTE FUNCTION public.accounting_bank_reconciliation_reversal_impact();

CREATE OR REPLACE FUNCTION public.save_accounting_bank_binding(
  p_actor_user_id uuid,p_binding_id uuid,p_expected_version integer,p_account_id uuid,p_account_version integer,
  p_bank_identity_ref text,p_bank_identity_sha256 text,p_effective_from date,p_effective_through date,
  p_masked_display_identity text,p_evidence_ref text,p_evidence_sha256 text,p_reason text,p_request_id uuid)
RETURNS TABLE(error_code text,binding_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path=pg_catalog,public,extensions AS $fn$
DECLARE
  v_profile uuid; v_binding uuid; v_prev integer; v_new integer; v_fp text; v_existing record; v_fid uuid;
BEGIN
  SELECT p.id INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile IS NULL THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF p_expected_version<0 OR p_account_version<1 OR p_effective_through IS NOT NULL AND p_effective_through<p_effective_from
     OR p_bank_identity_ref IS NULL OR p_bank_identity_sha256 !~ '^[0-9a-f]{64}$'
     OR p_masked_display_identity IS NULL OR p_evidence_ref IS NULL OR p_evidence_sha256 !~ '^[0-9a-f]{64}$'
     OR p_reason IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  v_binding:=coalesce(p_binding_id,gen_random_uuid());
  SELECT b.current_version INTO v_prev FROM public.accounting_bank_bindings b WHERE b.profile_id=v_profile AND b.id=v_binding FOR UPDATE;
  IF p_binding_id IS NULL AND v_prev IS NOT NULL OR p_binding_id IS NOT NULL AND v_prev IS NULL
     OR coalesce(v_prev,0) IS DISTINCT FROM p_expected_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,v_binding,coalesce(v_prev,0),NULL::text,false; RETURN;
  END IF;
  v_new:=p_expected_version+1;
  v_fp:=encode(extensions.digest(convert_to(jsonb_build_object('binding_id',v_binding,'account_id',p_account_id,'account_version',p_account_version,'bank_identity_ref',p_bank_identity_ref,'bank_identity_sha256',p_bank_identity_sha256,'effective_from',p_effective_from,'effective_through',p_effective_through,'masked_display_identity',p_masked_display_identity,'evidence_ref',p_evidence_ref,'evidence_sha256',p_evidence_sha256,'reason',p_reason)::text,'UTF8'),'sha256'),'hex');
  SELECT * INTO v_existing FROM public.accounting_bank_binding_versions v
  WHERE v.profile_id=v_profile AND v.prepared_by=p_actor_user_id AND v.request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.payload_fingerprint IS DISTINCT FROM v_fp THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,v_existing.binding_id,v_existing.version,v_existing.status,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,v_existing.binding_id,v_existing.version,v_existing.status,true; RETURN;
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.accounting_account_versions av
    JOIN public.accounting_accounts a ON a.profile_id=av.profile_id AND a.id=av.account_id AND a.current_version=av.version
    WHERE av.profile_id=v_profile AND av.account_id=p_account_id AND av.version=p_account_version
      AND av.account_kind='POSTING' AND av.account_type='ASSET' AND av.normal_balance='DEBIT' AND av.is_active
      AND NOT EXISTS(SELECT 1 FROM public.accounting_account_versions child
        WHERE child.profile_id=av.profile_id AND child.parent_account_id=av.account_id AND child.is_active)
  ) THEN
    RETURN QUERY SELECT 'bank_account_not_eligible'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.accounting_bank_binding_versions x
    WHERE x.profile_id=v_profile AND x.status='APPROVED' AND x.account_id=p_account_id AND x.account_version=p_account_version
      AND x.binding_id<>v_binding AND x.effective_from<=coalesce(p_effective_through,'9999-12-31'::date)
      AND coalesce(x.effective_through,'9999-12-31'::date)>=p_effective_from
  ) THEN
    RETURN QUERY SELECT 'bank_binding_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF p_binding_id IS NULL THEN
    INSERT INTO public.accounting_bank_bindings(id,profile_id,current_version) VALUES(v_binding,v_profile,0);
  END IF;
  INSERT INTO public.accounting_foundation_events(profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(v_profile,'accounting_bank_binding_prepared','accounting_bank_binding',v_binding,v_new,p_actor_user_id,p_request_id,p_reason,p_evidence_ref,v_fp,'accounting_bank_binding/'||v_binding::text||'/'||v_new::text,clock_timestamp())
  RETURNING id INTO v_fid;
  INSERT INTO public.accounting_bank_binding_versions(profile_id,binding_id,version,previous_version,status,account_id,account_version,bank_identity_ref,bank_identity_sha256,currency,effective_from,effective_through,masked_display_identity,evidence_ref,evidence_sha256,prepared_by,reason,request_id,payload_fingerprint,foundation_event_id)
  VALUES(v_profile,v_binding,v_new,NULLIF(p_expected_version,0),'PREPARED',p_account_id,p_account_version,p_bank_identity_ref,p_bank_identity_sha256,'SAR',p_effective_from,p_effective_through,p_masked_display_identity,p_evidence_ref,p_evidence_sha256,p_actor_user_id,p_reason,p_request_id,v_fp,v_fid);
  UPDATE public.accounting_bank_bindings SET current_version=v_new WHERE profile_id=v_profile AND id=v_binding;
  RETURN QUERY SELECT NULL::text,v_binding,v_new,'PREPARED'::text,false;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.review_accounting_bank_binding(
  p_actor_user_id uuid,p_binding_id uuid,p_binding_version integer,p_approve boolean,p_reason text,p_request_id uuid)
RETURNS TABLE(error_code text,binding_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path=pg_catalog,public,extensions AS $fn$
DECLARE v_profile uuid; v_src record; v_review record; v_new integer; v_fp text; v_fid uuid;
BEGIN
  SELECT p.id INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile IS NULL OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT v.* INTO v_src FROM public.accounting_bank_binding_versions v
  WHERE v.profile_id=v_profile AND v.binding_id=p_binding_id AND v.version=p_binding_version;
  IF NOT FOUND OR v_src.status<>'PREPARED' THEN
    RETURN QUERY SELECT 'binding_version_unavailable'::text,p_binding_id,p_binding_version,NULL::text,false; RETURN;
  END IF;
  IF v_src.prepared_by=p_actor_user_id THEN
    RETURN QUERY SELECT 'independent_review_required'::text,p_binding_id,p_binding_version,NULL::text,false; RETURN;
  END IF;
  v_new:=p_binding_version+1;
  v_fp:=encode(extensions.digest(convert_to(jsonb_build_object('binding_id',p_binding_id,'binding_version',p_binding_version,'approve',p_approve,'reason',p_reason)::text,'UTF8'),'sha256'),'hex');
  SELECT r.* INTO v_review FROM public.accounting_bank_binding_reviews r
  WHERE r.profile_id=v_profile AND r.reviewer_user_id=p_actor_user_id AND r.request_id=p_request_id;
  IF FOUND THEN
    IF v_review.payload_fingerprint IS DISTINCT FROM v_fp THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,p_binding_id,v_review.binding_version,v_review.decision,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,p_binding_id,v_review.binding_version,v_review.decision,true; RETURN;
  END IF;
  INSERT INTO public.accounting_foundation_events(profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(v_profile,'accounting_bank_binding_reviewed','accounting_bank_binding',p_binding_id,v_new,p_actor_user_id,p_request_id,p_reason,v_src.evidence_ref,v_fp,'accounting_bank_binding/'||p_binding_id::text||'/'||v_new::text,clock_timestamp())
  RETURNING id INTO v_fid;
  INSERT INTO public.accounting_bank_binding_versions(profile_id,binding_id,version,previous_version,status,account_id,account_version,bank_identity_ref,bank_identity_sha256,currency,effective_from,effective_through,masked_display_identity,evidence_ref,evidence_sha256,prepared_by,prepared_at,reviewed_by,reviewed_at,reason,request_id,payload_fingerprint,foundation_event_id)
  VALUES(v_profile,p_binding_id,v_new,p_binding_version,CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,v_src.account_id,v_src.account_version,v_src.bank_identity_ref,v_src.bank_identity_sha256,v_src.currency,v_src.effective_from,v_src.effective_through,v_src.masked_display_identity,v_src.evidence_ref,v_src.evidence_sha256,v_src.prepared_by,v_src.prepared_at,p_actor_user_id,clock_timestamp(),p_reason,p_request_id,v_fp,v_fid);
  INSERT INTO public.accounting_bank_binding_reviews(profile_id,binding_id,binding_version,decision,reviewer_user_id,reason,request_id,payload_fingerprint,foundation_event_id)
  VALUES(v_profile,p_binding_id,v_new,CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,p_actor_user_id,p_reason,p_request_id,v_fp,v_fid);
  UPDATE public.accounting_bank_bindings SET current_version=v_new WHERE profile_id=v_profile AND id=p_binding_id;
  RETURN QUERY SELECT NULL::text,p_binding_id,v_new,CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,false;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.save_accounting_bank_statement_batch(
  p_actor_user_id uuid,p_batch_id uuid,p_expected_version integer,p_binding_id uuid,p_binding_version integer,
  p_source_document_ref text,p_evidence_sha256 text,p_evidence_identity text,p_coverage_start date,p_coverage_end date,
  p_opening_balance_halalah bigint,p_closing_balance_halalah bigint,p_reason text,p_request_id uuid)
RETURNS TABLE(error_code text,batch_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path=pg_catalog,public,extensions AS $fn$
DECLARE v_profile uuid; v_batch uuid; v_prev integer; v_new integer; v_fp text; v_fid uuid; v_existing record; v_replay boolean:=false;
BEGIN
  SELECT p.id INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile IS NULL OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF p_expected_version<0 OR p_binding_version<1 OR p_source_document_ref IS NULL OR p_evidence_sha256 !~ '^[0-9a-f]{64}$'
     OR p_evidence_identity IS NULL OR p_coverage_end<p_coverage_start OR p_reason IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_bank_binding_versions v WHERE v.profile_id=v_profile AND v.binding_id=p_binding_id AND v.version=p_binding_version AND v.status='APPROVED') THEN
    RETURN QUERY SELECT 'binding_not_approved'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  SELECT * INTO v_existing FROM public.accounting_bank_statement_batch_versions b WHERE b.profile_id=v_profile AND b.recorded_by=p_actor_user_id AND b.request_id=p_request_id;
  v_replay:=FOUND;
  v_batch:=coalesce(p_batch_id,CASE WHEN v_replay THEN v_existing.batch_id END,gen_random_uuid());
  v_fp:=encode(extensions.digest(convert_to(jsonb_build_object('batch_id',v_batch,'binding_id',p_binding_id,'binding_version',p_binding_version,'source_document_ref',p_source_document_ref,'evidence_sha256',p_evidence_sha256,'evidence_identity',p_evidence_identity,'coverage_start',p_coverage_start,'coverage_end',p_coverage_end,'opening',p_opening_balance_halalah,'closing',p_closing_balance_halalah,'reason',p_reason)::text,'UTF8'),'sha256'),'hex');
  IF v_replay THEN
    IF v_existing.payload_fingerprint IS DISTINCT FROM v_fp THEN RETURN QUERY SELECT 'request_payload_conflict'::text,v_existing.batch_id,v_existing.version,v_existing.status,false; RETURN; END IF;
    RETURN QUERY SELECT NULL::text,v_existing.batch_id,v_existing.version,v_existing.status,true; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_bank_statement_batch_versions b WHERE b.profile_id=v_profile AND b.evidence_identity=p_evidence_identity AND b.evidence_sha256=p_evidence_sha256) THEN
    RETURN QUERY SELECT 'duplicate_statement_evidence'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  SELECT b.current_version INTO v_prev FROM public.accounting_bank_statement_batches b WHERE b.profile_id=v_profile AND b.id=v_batch FOR UPDATE;
  IF p_batch_id IS NULL AND v_prev IS NOT NULL OR p_batch_id IS NOT NULL AND v_prev IS NULL OR coalesce(v_prev,0) IS DISTINCT FROM p_expected_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,v_batch,coalesce(v_prev,0),NULL::text,false; RETURN; END IF;
  v_new:=p_expected_version+1;
  IF p_batch_id IS NULL THEN INSERT INTO public.accounting_bank_statement_batches(id,profile_id,current_version) VALUES(v_batch,v_profile,0); END IF;
  INSERT INTO public.accounting_foundation_events(profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(v_profile,'accounting_bank_statement_batch_recorded','accounting_bank_statement_batch',v_batch,v_new,p_actor_user_id,p_request_id,p_reason,p_source_document_ref,v_fp,'accounting_bank_statement_batch/'||v_batch::text||'/'||v_new::text,clock_timestamp())
  RETURNING id INTO v_fid;
  INSERT INTO public.accounting_bank_statement_batch_versions(profile_id,batch_id,version,previous_version,binding_id,binding_version,source_document_ref,evidence_sha256,evidence_identity,coverage_start,coverage_end,opening_balance_halalah,closing_balance_halalah,status,recorded_by,reason,request_id,payload_fingerprint,foundation_event_id)
  VALUES(v_profile,v_batch,v_new,NULLIF(p_expected_version,0),p_binding_id,p_binding_version,p_source_document_ref,p_evidence_sha256,p_evidence_identity,p_coverage_start,p_coverage_end,p_opening_balance_halalah,p_closing_balance_halalah,'RECORDED',p_actor_user_id,p_reason,p_request_id,v_fp,v_fid);
  UPDATE public.accounting_bank_statement_batches SET current_version=v_new WHERE profile_id=v_profile AND id=v_batch;
  RETURN QUERY SELECT NULL::text,v_batch,v_new,'RECORDED'::text,false;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.save_accounting_bank_statement_line(
  p_actor_user_id uuid,p_line_id uuid,p_expected_version integer,p_batch_id uuid,p_batch_version integer,
  p_stable_line_identity text,p_transaction_date date,p_value_date date,p_signed_amount_halalah bigint,
  p_reference text,p_description text,p_source_row_identity text,p_duplicate_fingerprint text,p_reason text,p_request_id uuid)
RETURNS TABLE(error_code text,line_id uuid,version integer,status text,duplicate_candidate boolean,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path=pg_catalog,public,extensions AS $fn$
DECLARE v_profile uuid; v_line uuid; v_prev integer; v_new integer; v_fp text; v_fid uuid; v_dup boolean; v_existing record;
BEGIN
  SELECT p.id INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile IS NULL OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,NULL::text,false,false; RETURN;
  END IF;
  IF p_expected_version<0 OR p_batch_version<1 OR p_stable_line_identity IS NULL OR p_source_row_identity IS NULL
     OR p_duplicate_fingerprint !~ '^[0-9a-f]{64}$' OR p_signed_amount_halalah=0 OR p_value_date IS NOT NULL AND p_value_date<p_transaction_date
     OR p_reason IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false,false; RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_batch_versions b WHERE b.profile_id=v_profile AND b.batch_id=p_batch_id AND b.version=p_batch_version AND b.status='RECORDED') THEN
    RETURN QUERY SELECT 'statement_batch_not_found'::text,NULL::uuid,NULL::integer,NULL::text,false,false; RETURN; END IF;
  v_line:=coalesce(p_line_id,gen_random_uuid());
  SELECT l.current_version INTO v_prev FROM public.accounting_bank_statement_lines l WHERE l.profile_id=v_profile AND l.id=v_line FOR UPDATE;
  IF p_line_id IS NULL AND v_prev IS NOT NULL OR p_line_id IS NOT NULL AND v_prev IS NULL OR coalesce(v_prev,0) IS DISTINCT FROM p_expected_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,v_line,coalesce(v_prev,0),NULL::text,false,false; RETURN; END IF;
  v_new:=p_expected_version+1;
  v_fp:=encode(extensions.digest(convert_to(jsonb_build_object('line_id',v_line,'batch_id',p_batch_id,'batch_version',p_batch_version,'stable_line_identity',p_stable_line_identity,'transaction_date',p_transaction_date,'value_date',p_value_date,'signed_amount_halalah',p_signed_amount_halalah,'reference',p_reference,'description',p_description,'source_row_identity',p_source_row_identity,'duplicate_fingerprint',p_duplicate_fingerprint,'reason',p_reason)::text,'UTF8'),'sha256'),'hex');
  SELECT * INTO v_existing FROM public.accounting_bank_statement_line_versions l WHERE l.profile_id=v_profile AND l.recorded_by=p_actor_user_id AND l.request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.payload_fingerprint IS DISTINCT FROM v_fp THEN RETURN QUERY SELECT 'request_payload_conflict'::text,v_existing.line_id,v_existing.version,'RECORDED'::text,v_existing.duplicate_candidate,false; RETURN; END IF;
    RETURN QUERY SELECT NULL::text,v_existing.line_id,v_existing.version,'RECORDED'::text,v_existing.duplicate_candidate,true; RETURN;
  END IF;
  v_dup:=EXISTS(
    SELECT 1 FROM public.accounting_bank_statement_line_versions l
    WHERE l.profile_id=v_profile AND l.batch_id=p_batch_id AND l.line_id<>v_line
      AND (l.duplicate_fingerprint=p_duplicate_fingerprint OR l.stable_line_identity=p_stable_line_identity)
  );
  IF p_line_id IS NULL THEN INSERT INTO public.accounting_bank_statement_lines(id,profile_id,batch_id,current_version) VALUES(v_line,v_profile,p_batch_id,0); END IF;
  INSERT INTO public.accounting_foundation_events(profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(v_profile,'accounting_bank_statement_line_recorded','accounting_bank_statement_line',v_line,v_new,p_actor_user_id,p_request_id,p_reason,p_source_row_identity,v_fp,'accounting_bank_statement_line/'||v_line::text||'/'||v_new::text,clock_timestamp())
  RETURNING id INTO v_fid;
  INSERT INTO public.accounting_bank_statement_line_versions(profile_id,line_id,version,previous_version,batch_id,batch_version,stable_line_identity,transaction_date,value_date,signed_amount_halalah,direction,reference,description,source_row_identity,duplicate_fingerprint,duplicate_candidate,recorded_by,request_id,payload_fingerprint,foundation_event_id)
  VALUES(v_profile,v_line,v_new,NULLIF(p_expected_version,0),p_batch_id,p_batch_version,p_stable_line_identity,p_transaction_date,p_value_date,p_signed_amount_halalah,CASE WHEN p_signed_amount_halalah>0 THEN 'INFLOW' ELSE 'OUTFLOW' END,p_reference,p_description,p_source_row_identity,p_duplicate_fingerprint,v_dup,p_actor_user_id,p_request_id,v_fp,v_fid);
  UPDATE public.accounting_bank_statement_lines SET current_version=v_new WHERE profile_id=v_profile AND id=v_line;
  RETURN QUERY SELECT NULL::text,v_line,v_new,'RECORDED'::text,v_dup,false;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.prepare_accounting_bank_reconciliation(
  p_actor_user_id uuid,p_group_id uuid,p_expected_version integer,p_binding_id uuid,p_binding_version integer,
  p_as_of_date date,p_recorded_at_cutoff timestamptz,p_allocations jsonb,p_rationale text,p_evidence_ref text,p_request_id uuid)
RETURNS TABLE(error_code text,group_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path=pg_catalog,public,extensions AS $fn$
DECLARE v_profile uuid; v_group uuid; v_prev integer; v_new integer; v_fp text; v_fid uuid; v_item jsonb; v_num integer:=0; v_stmt bigint:=0; v_ledger bigint:=0; v_line record; v_jline record; v_existing record; v_bind record; v_used bigint;
BEGIN
  SELECT p.id INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile IS NULL OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF p_expected_version<0 OR p_binding_version<1 OR p_as_of_date IS NULL OR p_recorded_at_cutoff IS NULL
     OR jsonb_typeof(p_allocations)<>'array' OR jsonb_array_length(p_allocations)=0 OR p_rationale IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  SELECT b.* INTO v_bind FROM public.accounting_bank_binding_versions b
  WHERE b.profile_id=v_profile AND b.binding_id=p_binding_id AND b.version=p_binding_version AND b.status='APPROVED'
    AND b.effective_from<=p_as_of_date AND (b.effective_through IS NULL OR b.effective_through>=p_as_of_date);
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'binding_not_approved'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  v_group:=coalesce(p_group_id,gen_random_uuid());
  SELECT g.current_version INTO v_prev FROM public.accounting_bank_reconciliation_groups g WHERE g.profile_id=v_profile AND g.id=v_group FOR UPDATE;
  IF p_group_id IS NULL AND v_prev IS NOT NULL OR p_group_id IS NOT NULL AND v_prev IS NULL OR coalesce(v_prev,0) IS DISTINCT FROM p_expected_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,v_group,coalesce(v_prev,0),NULL::text,false; RETURN; END IF;
  v_new:=p_expected_version+1;
  v_fp:=encode(extensions.digest(convert_to(jsonb_build_object('group_id',v_group,'binding_id',p_binding_id,'binding_version',p_binding_version,'as_of_date',p_as_of_date,'recorded_at_cutoff',p_recorded_at_cutoff,'allocations',p_allocations,'rationale',p_rationale,'evidence_ref',p_evidence_ref)::text,'UTF8'),'sha256'),'hex');
  SELECT * INTO v_existing FROM public.accounting_bank_reconciliation_group_versions g WHERE g.profile_id=v_profile AND g.prepared_by=p_actor_user_id AND g.request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.payload_fingerprint IS DISTINCT FROM v_fp THEN RETURN QUERY SELECT 'request_payload_conflict'::text,v_existing.group_id,v_existing.version,v_existing.status,false; RETURN; END IF;
    RETURN QUERY SELECT NULL::text,v_existing.group_id,v_existing.version,v_existing.status,true; RETURN;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_profile::text||':'||p_binding_id::text,0));
  IF p_group_id IS NULL THEN INSERT INTO public.accounting_bank_reconciliation_groups(id,profile_id,current_version) VALUES(v_group,v_profile,0); END IF;
  INSERT INTO public.accounting_foundation_events(profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(v_profile,'accounting_bank_reconciliation_prepared','accounting_bank_reconciliation',v_group,v_new,p_actor_user_id,p_request_id,p_rationale,p_evidence_ref,v_fp,'accounting_bank_reconciliation/'||v_group::text||'/'||v_new::text,clock_timestamp())
  RETURNING id INTO v_fid;
  INSERT INTO public.accounting_bank_reconciliation_group_versions(profile_id,group_id,version,previous_version,binding_id,binding_version,as_of_date,recorded_at_cutoff,status,rationale,evidence_ref,prepared_by,request_id,payload_fingerprint,foundation_event_id)
  VALUES(v_profile,v_group,v_new,NULLIF(p_expected_version,0),p_binding_id,p_binding_version,p_as_of_date,p_recorded_at_cutoff,'PREPARED',p_rationale,p_evidence_ref,p_actor_user_id,p_request_id,v_fp,v_fid);
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_allocations)
  LOOP
    v_num:=v_num+1;
    IF jsonb_typeof(v_item->'statement_line_id')<>'string' OR jsonb_typeof(v_item->'ledger_journal_id')<>'string'
       OR (v_item->>'statement_allocated_halalah') IS NULL OR (v_item->>'ledger_allocated_halalah') IS NULL THEN
      RAISE EXCEPTION 'W10G invalid allocation payload';
    END IF;
    SELECT l.* INTO v_line FROM public.accounting_bank_statement_line_versions l
    WHERE l.profile_id=v_profile AND l.line_id=(v_item->>'statement_line_id')::uuid AND l.version=(v_item->>'statement_line_version')::integer;
     IF NOT FOUND OR v_line.recorded_at>p_recorded_at_cutoff OR v_line.transaction_date>p_as_of_date
        OR EXISTS(SELECT 1 FROM public.accounting_bank_statement_line_versions later
          WHERE later.profile_id=v_line.profile_id AND later.line_id=v_line.line_id AND later.version>v_line.version
            AND later.recorded_at<=p_recorded_at_cutoff)
        OR NOT EXISTS(SELECT 1 FROM public.accounting_bank_statement_batch_versions b WHERE b.profile_id=v_profile AND b.batch_id=v_line.batch_id AND b.version=v_line.batch_version AND b.binding_id=p_binding_id)
        OR EXISTS(SELECT 1 FROM public.accounting_bank_statement_batch_versions later_batch
          WHERE later_batch.profile_id=v_line.profile_id AND later_batch.batch_id=v_line.batch_id
            AND later_batch.version>v_line.batch_version AND later_batch.recorded_at<=p_recorded_at_cutoff) THEN
      RAISE EXCEPTION 'W10G statement line unavailable';
    END IF;
    SELECT j.* INTO v_jline FROM public.accounting_journal_line_versions j
    WHERE j.profile_id=v_profile AND j.journal_id=(v_item->>'ledger_journal_id')::uuid AND j.journal_version=(v_item->>'ledger_journal_version')::integer AND j.line_number=(v_item->>'ledger_line_number')::integer;
    IF NOT FOUND OR v_jline.account_id IS DISTINCT FROM v_bind.account_id OR v_jline.account_version IS DISTINCT FROM v_bind.account_version
       OR (SELECT jv.status FROM public.accounting_journal_versions jv WHERE jv.profile_id=v_profile AND jv.journal_id=v_jline.journal_id AND jv.version=v_jline.journal_version)<>'POSTED'
       OR (SELECT jv.accounting_date FROM public.accounting_journal_versions jv WHERE jv.profile_id=v_profile AND jv.journal_id=v_jline.journal_id AND jv.version=v_jline.journal_version)>p_as_of_date
       OR (SELECT jv.posted_at FROM public.accounting_journal_versions jv WHERE jv.profile_id=v_profile AND jv.journal_id=v_jline.journal_id AND jv.version=v_jline.journal_version)>p_recorded_at_cutoff THEN
      RAISE EXCEPTION 'W10G ledger line is not eligible';
    END IF;
    IF v_line.signed_amount_halalah*(v_item->>'statement_allocated_halalah')::bigint<0 OR v_jline.side='DEBIT' AND (v_item->>'ledger_allocated_halalah')::bigint<0 OR v_jline.side='CREDIT' AND (v_item->>'ledger_allocated_halalah')::bigint>0 THEN RAISE EXCEPTION 'W10G allocation sign mismatch'; END IF;
    SELECT coalesce(sum(abs(a.statement_allocated_halalah)),0) INTO v_used
    FROM public.accounting_bank_reconciliation_allocations a
    WHERE a.profile_id=v_profile AND a.statement_line_id=v_line.line_id
      AND EXISTS (SELECT 1 FROM public.accounting_bank_reconciliation_reviews r
        WHERE r.profile_id=a.profile_id AND r.group_id=a.group_id AND r.group_version=a.group_version
          AND r.decision IN ('APPROVED','IMPACT_REVIEW_REQUIRED')
          AND NOT EXISTS (SELECT 1 FROM public.accounting_bank_reconciliation_reviews later
            WHERE later.profile_id=r.profile_id AND later.group_id=r.group_id AND later.group_version=r.group_version AND later.recorded_at>r.recorded_at));
    IF abs((v_item->>'statement_allocated_halalah')::bigint)>abs(v_line.signed_amount_halalah)-v_used THEN RAISE EXCEPTION 'W10G statement coverage exceeded'; END IF;
    SELECT coalesce(sum(abs(a.ledger_allocated_halalah)),0) INTO v_used
    FROM public.accounting_bank_reconciliation_allocations a
    WHERE a.profile_id=v_profile AND a.ledger_journal_id=v_jline.journal_id AND a.ledger_journal_version=v_jline.journal_version AND a.ledger_line_number=v_jline.line_number
      AND EXISTS (SELECT 1 FROM public.accounting_bank_reconciliation_reviews r
        WHERE r.profile_id=a.profile_id AND r.group_id=a.group_id AND r.group_version=a.group_version
          AND r.decision IN ('APPROVED','IMPACT_REVIEW_REQUIRED')
          AND NOT EXISTS (SELECT 1 FROM public.accounting_bank_reconciliation_reviews later
            WHERE later.profile_id=r.profile_id AND later.group_id=r.group_id AND later.group_version=r.group_version AND later.recorded_at>r.recorded_at));
    IF abs((v_item->>'ledger_allocated_halalah')::bigint)>v_jline.amount_halalah-v_used THEN RAISE EXCEPTION 'W10G ledger coverage exceeded'; END IF;
    v_stmt:=v_stmt+abs(coalesce((v_item->>'statement_allocated_halalah')::bigint,0));
    v_ledger:=v_ledger+abs(coalesce((v_item->>'ledger_allocated_halalah')::bigint,0));
    INSERT INTO public.accounting_bank_reconciliation_allocations(profile_id,group_id,group_version,allocation_number,statement_line_id,statement_line_version,ledger_journal_id,ledger_journal_version,ledger_line_number,statement_allocated_halalah,ledger_allocated_halalah,rationale)
    VALUES(v_profile,v_group,v_new,(v_num),(v_item->>'statement_line_id')::uuid,(v_item->>'statement_line_version')::integer,(v_item->>'ledger_journal_id')::uuid,(v_item->>'ledger_journal_version')::integer,(v_item->>'ledger_line_number')::integer,(v_item->>'statement_allocated_halalah')::bigint,(v_item->>'ledger_allocated_halalah')::bigint,coalesce(v_item->>'rationale',p_rationale));
  END LOOP;
  IF v_stmt IS DISTINCT FROM v_ledger THEN RAISE EXCEPTION 'W10G matched allocation totals do not balance'; END IF;
  UPDATE public.accounting_bank_reconciliation_groups SET current_version=v_new WHERE profile_id=v_profile AND id=v_group;
  RETURN QUERY SELECT NULL::text,v_group,v_new,'PREPARED'::text,false;
EXCEPTION WHEN others THEN
  IF SQLSTATE='P0001' THEN RAISE; END IF;
  RAISE;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.review_accounting_bank_reconciliation(
  p_actor_user_id uuid,p_group_id uuid,p_group_version integer,p_approve boolean,p_reason text,p_request_id uuid)
RETURNS TABLE(error_code text,group_id uuid,group_version integer,decision text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path=pg_catalog,public,extensions AS $fn$
DECLARE v_profile uuid; v_preparer uuid; v_stmt bigint; v_ledger bigint; v_fp text; v_fid uuid; v_review record;
BEGIN
  SELECT p.id INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile IS NULL OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT g.prepared_by INTO v_preparer FROM public.accounting_bank_reconciliation_group_versions g
  WHERE g.profile_id=v_profile AND g.group_id=p_group_id AND g.version=p_group_version AND g.status='PREPARED';
  IF NOT FOUND THEN RETURN QUERY SELECT 'reconciliation_not_found'::text,p_group_id,p_group_version,NULL::text,false; RETURN; END IF;
  IF v_preparer=p_actor_user_id THEN RETURN QUERY SELECT 'independent_review_required'::text,p_group_id,p_group_version,NULL::text,false; RETURN; END IF;
  SELECT coalesce(sum(abs(a.statement_allocated_halalah)),0),coalesce(sum(abs(a.ledger_allocated_halalah)),0) INTO v_stmt,v_ledger
  FROM public.accounting_bank_reconciliation_allocations a WHERE a.profile_id=v_profile AND a.group_id=p_group_id AND a.group_version=p_group_version;
  IF v_stmt IS DISTINCT FROM v_ledger THEN RETURN QUERY SELECT 'mismatched_allocation_totals'::text,p_group_id,p_group_version,NULL::text,false; RETURN; END IF;
  v_fp:=encode(extensions.digest(convert_to(jsonb_build_object('group_id',p_group_id,'group_version',p_group_version,'approve',p_approve,'reason',p_reason)::text,'UTF8'),'sha256'),'hex');
  SELECT r.* INTO v_review FROM public.accounting_bank_reconciliation_reviews r
  WHERE r.profile_id=v_profile AND r.reviewer_user_id=p_actor_user_id AND r.request_id=p_request_id;
  IF FOUND THEN
    IF v_review.payload_fingerprint IS DISTINCT FROM v_fp THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,p_group_id,v_review.group_version,v_review.decision,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,p_group_id,v_review.group_version,v_review.decision,true; RETURN;
  END IF;
  INSERT INTO public.accounting_foundation_events(profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(v_profile,'accounting_bank_reconciliation_reviewed','accounting_bank_reconciliation',p_group_id,p_group_version,p_actor_user_id,p_request_id,p_reason,NULL,v_fp,'accounting_bank_reconciliation/'||p_group_id::text||'/'||p_group_version::text,clock_timestamp())
  RETURNING id INTO v_fid;
  INSERT INTO public.accounting_bank_reconciliation_reviews(profile_id,group_id,group_version,decision,reviewer_user_id,reason,request_id,payload_fingerprint,foundation_event_id)
  VALUES(v_profile,p_group_id,p_group_version,CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,p_actor_user_id,p_reason,p_request_id,v_fp,v_fid);
  RETURN QUERY SELECT NULL::text,p_group_id,p_group_version,CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,false;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.unmatch_accounting_bank_reconciliation(
  p_actor_user_id uuid,p_group_id uuid,p_group_version integer,p_reason text,p_request_id uuid)
RETURNS TABLE(error_code text,group_id uuid,group_version integer,decision text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path=pg_catalog,public,extensions AS $fn$
DECLARE v_profile uuid; v_fp text; v_fid uuid; v_review record;
BEGIN
  SELECT p.id INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile IS NULL OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF p_group_id IS NULL OR p_group_version<1 OR p_reason IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,p_group_id,p_group_version,NULL::text,false; RETURN; END IF;
  v_fp:=encode(extensions.digest(convert_to(jsonb_build_object('group_id',p_group_id,'group_version',p_group_version,'reason',p_reason)::text,'UTF8'),'sha256'),'hex');
  SELECT r.* INTO v_review FROM public.accounting_bank_reconciliation_reviews r
  WHERE r.profile_id=v_profile AND r.reviewer_user_id=p_actor_user_id AND r.request_id=p_request_id;
  IF FOUND THEN
    IF v_review.payload_fingerprint IS DISTINCT FROM v_fp THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,p_group_id,v_review.group_version,v_review.decision,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,p_group_id,v_review.group_version,v_review.decision,true; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_bank_reconciliation_reviews r WHERE r.profile_id=v_profile AND r.group_id=p_group_id AND r.group_version=p_group_version AND r.decision='APPROVED') THEN
    RETURN QUERY SELECT 'reconciliation_not_approved'::text,p_group_id,p_group_version,NULL::text,false; RETURN; END IF;
  INSERT INTO public.accounting_foundation_events(profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(v_profile,'accounting_bank_reconciliation_unmatched','accounting_bank_reconciliation',p_group_id,p_group_version,p_actor_user_id,p_request_id,p_reason,NULL,v_fp,'accounting_bank_reconciliation/'||p_group_id::text||'/'||p_group_version::text,clock_timestamp())
  RETURNING id INTO v_fid;
  INSERT INTO public.accounting_bank_reconciliation_reviews(profile_id,group_id,group_version,decision,reviewer_user_id,reason,request_id,payload_fingerprint,foundation_event_id)
  VALUES(v_profile,p_group_id,p_group_version,'UNMATCHED',p_actor_user_id,p_reason,p_request_id,v_fp,v_fid);
  RETURN QUERY SELECT NULL::text,p_group_id,p_group_version,'UNMATCHED'::text,false;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.get_accounting_bank_reconciliation(
  p_actor_user_id uuid,p_binding_id uuid,p_as_of_date date,p_recorded_at_cutoff timestamptz,p_limit integer DEFAULT 200)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path=pg_catalog,public,extensions AS $fn$
DECLARE v_profile uuid; v_binding record; v_result jsonb;
BEGIN
  SELECT p.id INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile IS NULL OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR (NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank') AND NOT public.get_accounting_capability(p_actor_user_id,'accounting:view')) THEN
    RAISE EXCEPTION 'accounting capability required' USING ERRCODE='42501';
  END IF;
  IF p_limit IS NULL OR p_limit<1 OR p_limit>500 OR p_as_of_date IS NULL OR p_recorded_at_cutoff IS NULL THEN RAISE EXCEPTION 'invalid W10G reconciliation boundary'; END IF;
  SELECT b.* INTO v_binding FROM public.accounting_bank_binding_versions b
  WHERE b.profile_id=v_profile AND b.binding_id=p_binding_id AND b.status='APPROVED'
    AND b.effective_from<=p_as_of_date AND (b.effective_through IS NULL OR b.effective_through>=p_as_of_date)
    AND b.created_at<=p_recorded_at_cutoff
  ORDER BY b.effective_from DESC,b.version DESC LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('state','NOT_INITIALIZED','binding_id',p_binding_id,'bank_reconciled',false); END IF;
  WITH batches AS (
    SELECT DISTINCT ON (b.batch_id) b.* FROM public.accounting_bank_statement_batch_versions b
    WHERE b.profile_id=v_profile AND b.binding_id=p_binding_id AND b.status='RECORDED'
      AND b.coverage_start<=p_as_of_date AND b.recorded_at<=p_recorded_at_cutoff
      AND b.coverage_end>=p_as_of_date-INTERVAL '100 years'
    ORDER BY b.batch_id,b.version DESC
  ), lines AS (
    SELECT DISTINCT ON (l.line_id) l.* FROM public.accounting_bank_statement_line_versions l JOIN batches b ON b.profile_id=l.profile_id AND b.batch_id=l.batch_id AND b.version=l.batch_version
    WHERE l.recorded_at<=p_recorded_at_cutoff AND l.transaction_date<=p_as_of_date
    ORDER BY l.line_id,l.version DESC
  ), ledger AS (
    SELECT j.journal_id,j.version AS journal_version,l.line_number,l.amount_halalah,CASE WHEN l.side='DEBIT' THEN l.amount_halalah ELSE -l.amount_halalah END AS signed_amount,j.accounting_date,j.posted_at
    FROM public.accounting_journal_versions j JOIN public.accounting_journal_line_versions l ON l.profile_id=j.profile_id AND l.journal_id=j.journal_id AND l.journal_version=j.version
    WHERE j.profile_id=v_profile AND j.status='POSTED' AND j.accounting_date<=p_as_of_date AND j.posted_at<=p_recorded_at_cutoff
      AND l.account_id=v_binding.account_id AND l.account_version=v_binding.account_version
  ), reviews AS (
    SELECT DISTINCT ON (r.group_id,r.group_version) r.* FROM public.accounting_bank_reconciliation_reviews r
    WHERE r.profile_id=v_profile AND r.recorded_at<=p_recorded_at_cutoff ORDER BY r.group_id,r.group_version,r.recorded_at DESC,r.id DESC
  ), approved_alloc AS (
    SELECT a.* FROM public.accounting_bank_reconciliation_allocations a JOIN reviews r ON r.profile_id=a.profile_id AND r.group_id=a.group_id AND r.group_version=a.group_version
    WHERE r.decision IN ('APPROVED','IMPACT_REVIEW_REQUIRED')
  ), matched_stmt AS (SELECT statement_line_id,sum(statement_allocated_halalah) AS matched FROM approved_alloc GROUP BY statement_line_id), matched_ledger AS (SELECT ledger_journal_id,ledger_journal_version,ledger_line_number,sum(ledger_allocated_halalah) AS matched FROM approved_alloc GROUP BY ledger_journal_id,ledger_journal_version,ledger_line_number),
  summary AS (
    SELECT coalesce((SELECT sum(l.signed_amount_halalah) FROM lines l),0)::bigint AS statement_net,
      coalesce((SELECT sum(CASE WHEN l.signed_amount_halalah>0 THEN l.signed_amount_halalah ELSE 0 END) FROM lines l),0)::bigint AS statement_inflows,
      coalesce((SELECT sum(CASE WHEN l.signed_amount_halalah<0 THEN -l.signed_amount_halalah ELSE 0 END) FROM lines l),0)::bigint AS statement_outflows,
      coalesce((SELECT sum(x.signed_amount) FROM ledger x),0)::bigint AS ledger_net,
      coalesce((SELECT sum(CASE WHEN x.signed_amount>0 THEN x.signed_amount ELSE 0 END) FROM ledger x),0)::bigint AS ledger_inflows,
      coalesce((SELECT sum(CASE WHEN x.signed_amount<0 THEN -x.signed_amount ELSE 0 END) FROM ledger x),0)::bigint AS ledger_outflows,
      coalesce((SELECT sum(a.statement_allocated_halalah) FROM approved_alloc a),0)::bigint AS matched_amount,
      coalesce((SELECT sum(abs(l.signed_amount_halalah)-abs(coalesce(m.matched,0))) FROM lines l LEFT JOIN matched_stmt m ON m.statement_line_id=l.line_id),0)::bigint AS unmatched_statement_amount,
      coalesce((SELECT sum(abs(x.amount_halalah)-abs(coalesce(m.matched,0))) FROM ledger x LEFT JOIN matched_ledger m ON m.ledger_journal_id=x.journal_id AND m.ledger_journal_version=x.journal_version AND m.ledger_line_number=x.line_number),0)::bigint AS unmatched_ledger_amount,
      coalesce((SELECT count(*) FROM lines l WHERE l.duplicate_candidate),0)::integer AS duplicate_statement_candidates,
      coalesce((SELECT count(*) FROM approved_alloc a JOIN reviews r ON r.group_id=a.group_id AND r.group_version=a.group_version WHERE r.decision='IMPACT_REVIEW_REQUIRED'),0)::integer AS impact_review_required
  )
  SELECT jsonb_build_object('state',CASE WHEN s.unmatched_statement_amount<>0 OR s.unmatched_ledger_amount<>0 THEN 'TRUNCATED' ELSE 'READY' END,
    'binding_id',p_binding_id,'binding_version',v_binding.version,'account_id',v_binding.account_id,'account_version',v_binding.account_version,
    'currency','SAR','as_of_date',p_as_of_date,'recorded_at_cutoff',p_recorded_at_cutoff,
    'statement_opening_balance_halalah',coalesce((SELECT b.opening_balance_halalah FROM batches b ORDER BY b.coverage_start LIMIT 1),0),
    'statement_closing_balance_halalah',coalesce((SELECT b.closing_balance_halalah FROM batches b ORDER BY b.coverage_end DESC LIMIT 1),0),
    'ledger_opening_balance_halalah',coalesce((SELECT sum(x.signed_amount) FROM ledger x WHERE x.accounting_date < coalesce((SELECT min(b.coverage_start) FROM batches b),p_as_of_date)),0),
    'ledger_closing_balance_halalah',s.ledger_net,
    'statement_inflows_halalah',s.statement_inflows,'statement_outflows_halalah',s.statement_outflows,
    'ledger_inflows_halalah',s.ledger_inflows,'ledger_outflows_halalah',s.ledger_outflows,
    'matched_amount_halalah',s.matched_amount,'partially_matched_amount_halalah',s.matched_amount,
    'unmatched_statement_amount_halalah',s.unmatched_statement_amount,'unmatched_ledger_amount_halalah',s.unmatched_ledger_amount,
    'duplicate_statement_candidates',s.duplicate_statement_candidates,'timing_difference_halalah',s.statement_net-s.ledger_net,
    'impact_review_required_count',s.impact_review_required,'adjustment_required_statement_items',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.transaction_date,q.line_id) FROM (SELECT l.* FROM lines l LEFT JOIN matched_stmt m ON m.statement_line_id=l.line_id WHERE abs(l.signed_amount_halalah)>abs(coalesce(m.matched,0)) ORDER BY l.transaction_date,l.line_id LIMIT p_limit) q),'[]'::jsonb),
    'unexplained_difference_halalah',(s.statement_net-s.ledger_net),'preparation_review_status',CASE WHEN s.impact_review_required>0 THEN 'IMPACT_REVIEW_REQUIRED' ELSE 'REVIEWED' END,
    'evidence_cutoff',p_recorded_at_cutoff,'statement_lines',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.transaction_date,q.line_id) FROM (SELECT l.* FROM lines l ORDER BY l.transaction_date,l.line_id LIMIT p_limit) q),'[]'::jsonb),
    'ledger_cash_lines',coalesce((SELECT jsonb_agg(to_jsonb(q) ORDER BY q.accounting_date,q.journal_id,q.line_number) FROM (SELECT x.* FROM ledger x ORDER BY x.accounting_date,x.journal_id,x.line_number LIMIT p_limit) q),'[]'::jsonb))
  INTO v_result FROM summary s;
  RETURN v_result;
END;
$fn$;

ALTER TABLE public.accounting_bank_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_bindings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_binding_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_binding_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_binding_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_binding_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_statement_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_statement_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_statement_batch_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_statement_batch_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_statement_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_statement_line_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_statement_line_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_reconciliation_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_reconciliation_groups FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_reconciliation_group_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_reconciliation_group_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_reconciliation_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_reconciliation_allocations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_reconciliation_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_bank_reconciliation_reviews FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.accounting_bank_bindings,public.accounting_bank_binding_versions,public.accounting_bank_binding_reviews,
  public.accounting_bank_statement_batches,public.accounting_bank_statement_batch_versions,public.accounting_bank_statement_lines,
  public.accounting_bank_statement_line_versions,public.accounting_bank_reconciliation_groups,public.accounting_bank_reconciliation_group_versions,
  public.accounting_bank_reconciliation_allocations,public.accounting_bank_reconciliation_reviews FROM anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_accounting_bank_binding(uuid,uuid,integer,uuid,integer,text,text,date,date,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.review_accounting_bank_binding(uuid,uuid,integer,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_accounting_bank_statement_batch(uuid,uuid,integer,uuid,integer,text,text,text,date,date,bigint,bigint,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.save_accounting_bank_statement_line(uuid,uuid,integer,uuid,integer,text,date,date,bigint,text,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.prepare_accounting_bank_reconciliation(uuid,uuid,integer,uuid,integer,date,timestamptz,jsonb,text,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.review_accounting_bank_reconciliation(uuid,uuid,integer,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.unmatch_accounting_bank_reconciliation(uuid,uuid,integer,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_accounting_bank_reconciliation(uuid,uuid,date,timestamptz,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_accounting_bank_binding(uuid,uuid,integer,uuid,integer,text,text,date,date,text,text,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_accounting_bank_binding(uuid,uuid,integer,boolean,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_accounting_bank_statement_batch(uuid,uuid,integer,uuid,integer,text,text,text,date,date,bigint,bigint,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_accounting_bank_statement_line(uuid,uuid,integer,uuid,integer,text,date,date,bigint,text,text,text,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_accounting_bank_reconciliation(uuid,uuid,integer,uuid,integer,date,timestamptz,jsonb,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_accounting_bank_reconciliation(uuid,uuid,integer,boolean,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.unmatch_accounting_bank_reconciliation(uuid,uuid,integer,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_bank_reconciliation(uuid,uuid,date,timestamptz,integer) TO service_role;
ALTER FUNCTION public.prevent_accounting_bank_history_mutation() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.prevent_accounting_bank_history_mutation() FROM PUBLIC,anon,authenticated,service_role;

DO $w10g_postflight$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.accounting_capability_catalog WHERE capability='accounting:reconcile_bank' AND enabled AND runtime_allow_grantable AND owner_slice='W10G')
     OR to_regprocedure('public.save_accounting_bank_binding(uuid,uuid,integer,uuid,integer,text,text,date,date,text,text,text,text,uuid)') IS NULL
     OR to_regprocedure('public.get_accounting_bank_reconciliation(uuid,uuid,date,timestamptz,integer)') IS NULL THEN
    RAISE EXCEPTION 'W10G postflight: capability or RPC contract missing';
  END IF;
END;
$w10g_postflight$;

COMMIT;
