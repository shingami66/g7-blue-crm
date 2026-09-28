-- W10C: evidence-based inception coverage and first package-linked Trial Balance.
-- Adds no profile, chart, period, journal, grant, or opening balance.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL
     OR to_regclass('public.accounting_capability_catalog') IS NULL
     OR to_regclass('public.accounting_foundation_events') IS NULL
     OR to_regclass('public.accounting_journals') IS NULL
     OR to_regclass('public.accounting_journal_versions') IS NULL
     OR to_regclass('public.accounting_journal_line_versions') IS NULL
     OR to_regclass('public.accounting_source_effects') IS NULL
     OR to_regclass('public.accounting_posting_rules') IS NULL
     OR to_regclass('public.accounting_posting_rule_versions') IS NULL
     OR to_regclass('public.accounting_posting_rule_mappings') IS NULL
     OR to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)') IS NULL
     OR to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)') IS NULL
     OR to_regprocedure('public.get_accounting_trial_balance(uuid,date,timestamptz,uuid,integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'W10C preflight: accepted W10A/W10B accounting foundation is incomplete';
  END IF;
  IF to_regclass('public.accounting_inception_packages') IS NOT NULL
     OR to_regclass('public.accounting_inception_package_versions') IS NOT NULL
     OR to_regclass('public.accounting_inception_coverage') IS NOT NULL
     OR to_regclass('public.accounting_inception_reviews') IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.accounting_capability_catalog
       WHERE capability='accounting:manage_inception') THEN
    RAISE EXCEPTION 'W10C preflight: target inception foundation already exists';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
       WHERE capability='accounting:manage_chart' AND enabled AND runtime_allow_grantable AND owner_slice='W10A2')
     OR NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
       WHERE capability='accounting:prepare_journal' AND enabled AND runtime_allow_grantable AND owner_slice='W10B')
     OR NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
       WHERE capability='accounting:post_journal' AND enabled AND runtime_allow_grantable AND owner_slice='W10B') THEN
    RAISE EXCEPTION 'W10C preflight: W10A/W10B authority baseline differs';
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
    'accounting_inception_package_accepted'
  )),
  ADD CONSTRAINT accounting_foundation_events_entity_type_check CHECK (entity_type IN (
    'capability_assignment','accounting_profile','accounting_account','accounting_period',
    'accounting_posting_rule','accounting_journal','accounting_inception_package',
    'accounting_inception_review','accounting_inception_acceptance'
  ));

ALTER TABLE public.accounting_capability_catalog
  DROP CONSTRAINT accounting_capability_catalog_key_check,
  DROP CONSTRAINT accounting_capability_catalog_state_check,
  ADD CONSTRAINT accounting_capability_catalog_key_check CHECK (capability IN (
    'accounting:view','accounting:manage_profile','accounting:manage_authority',
    'accounting:manage_chart','accounting:manage_periods',
    'accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal',
    'accounting:manage_inception','accounting:reconcile_bank',
    'accounting:close_period','accounting:reopen_period','accounting:view_statements'
  )),
  ADD CONSTRAINT accounting_capability_catalog_state_check CHECK (
    (capability IN ('accounting:view','accounting:manage_profile')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_authority'
      AND enabled AND NOT runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability IN ('accounting:manage_chart','accounting:manage_periods')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability IN ('accounting:prepare_journal','accounting:post_journal',
      'accounting:reverse_journal') AND enabled AND runtime_allow_grantable AND owner_slice='W10B')
    OR (capability='accounting:manage_inception'
      AND enabled AND runtime_allow_grantable AND owner_slice='W10C')
    OR (capability='accounting:reconcile_bank'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10G')
    OR (capability IN ('accounting:close_period','accounting:reopen_period')
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I')
    OR (capability='accounting:view_statements'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10H')
  );
INSERT INTO public.accounting_capability_catalog(capability,enabled,runtime_allow_grantable,owner_slice)
VALUES('accounting:manage_inception',true,true,'W10C');

ALTER TABLE public.accounting_journal_versions
  DROP CONSTRAINT accounting_journal_versions_source_domain_check,
  ADD CONSTRAINT accounting_journal_versions_source_domain_check
    CHECK(source_domain IN ('CONTROLLED_MANUAL','INCEPTION'));
ALTER TABLE public.accounting_source_effects
  DROP CONSTRAINT accounting_source_effects_source_domain_check,
  ADD CONSTRAINT accounting_source_effects_source_domain_check
    CHECK(source_domain IN ('CONTROLLED_MANUAL','INCEPTION'));

CREATE TABLE public.accounting_inception_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id),
  UNIQUE(profile_id)
);
CREATE TABLE public.accounting_inception_package_versions (
  profile_id uuid NOT NULL, package_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
  previous_version integer, accounting_start_date date NOT NULL, cutover_boundary_date date NOT NULL,
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  PRIMARY KEY(profile_id,package_id,version),
  FOREIGN KEY(profile_id,package_id) REFERENCES public.accounting_inception_packages(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,package_id,previous_version)
    REFERENCES public.accounting_inception_package_versions(profile_id,package_id,version) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id), CHECK(cutover_boundary_date>=accounting_start_date)
);
ALTER TABLE public.accounting_inception_packages ADD CONSTRAINT accounting_inception_packages_current_version_fkey
  FOREIGN KEY(profile_id,id,current_version)
  REFERENCES public.accounting_inception_package_versions(profile_id,package_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_inception_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  source_domain text NOT NULL CHECK(source_domain ~ '^[A-Z][A-Z0-9_]{0,39}$'
    AND source_domain NOT IN ('CONTROLLED_MANUAL','INCEPTION')),
  source_record_key text NOT NULL CHECK(length(btrim(source_record_key)) BETWEEN 1 AND 200),
  economic_event_key text NOT NULL CHECK(length(btrim(economic_event_key)) BETWEEN 1 AND 200),
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id), UNIQUE(profile_id,source_record_key,economic_event_key)
);
CREATE TABLE public.accounting_inception_coverage_versions (
  profile_id uuid NOT NULL, coverage_id uuid NOT NULL, version integer NOT NULL CHECK(version>0),
  previous_version integer, package_id uuid NOT NULL, package_version integer NOT NULL, item_id uuid NOT NULL,
  classification text NOT NULL CHECK(classification IN (
    'RECONSTRUCTED_HISTORY','OPENING_BALANCE','POST_CUTOVER_SOURCE','UNRESOLVED')),
  resolution_state text NOT NULL CHECK(resolution_state IN ('RESOLVED','UNRESOLVED')),
  is_material boolean NOT NULL,
  reconciliation_category text NOT NULL CHECK(reconciliation_category IN (
    'ACCOUNTS_RECEIVABLE','ACCOUNTS_PAYABLE','EMPLOYEE_ACCOUNTABILITY',
    'FOUNDER_SOURCE','BANK_CASH','ASSET','LIABILITY','EXPENSE','OTHER')),
  party_type text NOT NULL CHECK(party_type IN ('NONE','CUSTOMER','SUPPLIER','EMPLOYEE','FOUNDER','BANK','CASH')),
  party_reference text CHECK(party_reference IS NULL OR length(btrim(party_reference)) BETWEEN 1 AND 200),
  reconciliation_reference text CHECK(reconciliation_reference IS NULL OR length(btrim(reconciliation_reference)) BETWEEN 1 AND 2000),
  evidence_count integer NOT NULL CHECK(evidence_count>=0),
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,coverage_id,version),
  FOREIGN KEY(profile_id,coverage_id) REFERENCES public.accounting_inception_coverage(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,coverage_id,previous_version)
    REFERENCES public.accounting_inception_coverage_versions(profile_id,coverage_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,package_id,package_version)
    REFERENCES public.accounting_inception_package_versions(profile_id,package_id,version) ON DELETE RESTRICT,
  UNIQUE(profile_id,package_id,package_version,item_id),
  CHECK((classification='UNRESOLVED' AND resolution_state='UNRESOLVED')
    OR (classification<>'UNRESOLVED' AND resolution_state='RESOLVED')),
  CHECK((party_type='NONE' AND party_reference IS NULL)
    OR (party_type<>'NONE' AND party_reference IS NOT NULL))
);
ALTER TABLE public.accounting_inception_coverage ADD CONSTRAINT accounting_inception_coverage_current_version_fkey
  FOREIGN KEY(profile_id,id,current_version)
  REFERENCES public.accounting_inception_coverage_versions(profile_id,coverage_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_inception_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid NOT NULL,
  package_id uuid NOT NULL, package_version integer NOT NULL,
  decision text NOT NULL CHECK(decision IN ('APPROVE','REJECT')),
  reviewer_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(profile_id,package_id,package_version)
    REFERENCES public.accounting_inception_package_versions(profile_id,package_id,version) ON DELETE RESTRICT,
  UNIQUE(profile_id,package_id,package_version), UNIQUE(foundation_event_id)
);
CREATE TABLE public.accounting_inception_mapping_authorizations (
  profile_id uuid NOT NULL, package_id uuid NOT NULL, package_version integer NOT NULL, item_id uuid NOT NULL,
  rule_id uuid NOT NULL, rule_version integer NOT NULL, mapping_key text NOT NULL,
  account_id uuid NOT NULL, account_version integer NOT NULL, side text NOT NULL CHECK(side IN ('DEBIT','CREDIT')),
  preparer_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  reviewer_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,rule_id,rule_version,mapping_key),
  FOREIGN KEY(profile_id,package_id,package_version)
    REFERENCES public.accounting_inception_package_versions(profile_id,package_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,account_id,account_version)
    REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT,
  CHECK(mapping_key ~ '^line_[1-9][0-9]{0,2}$' AND preparer_user_id<>reviewer_user_id)
);
CREATE TABLE public.accounting_inception_journal_links (
  profile_id uuid NOT NULL, package_id uuid NOT NULL, package_version integer NOT NULL, item_id uuid NOT NULL,
  journal_id uuid NOT NULL, prepared_version integer NOT NULL CHECK(prepared_version>0),
  prepared_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,package_id,package_version,item_id), UNIQUE(profile_id,journal_id),
  FOREIGN KEY(profile_id,package_id,package_version)
    REFERENCES public.accounting_inception_package_versions(profile_id,package_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,journal_id,prepared_version)
    REFERENCES public.accounting_journal_versions(profile_id,journal_id,version) ON DELETE RESTRICT
);
CREATE TABLE public.accounting_inception_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid NOT NULL,
  package_id uuid NOT NULL, package_version integer NOT NULL,
  accepted_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(), as_of_date date NOT NULL,
  recorded_at_cutoff timestamptz NOT NULL,
  trial_balance jsonb NOT NULL CHECK(jsonb_typeof(trial_balance)='object'),
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,package_id,package_version)
    REFERENCES public.accounting_inception_package_versions(profile_id,package_id,version) ON DELETE RESTRICT,
  UNIQUE(profile_id,package_id,package_version), UNIQUE(foundation_event_id)
);

ALTER TABLE public.accounting_inception_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_inception_package_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_inception_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_inception_coverage_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_inception_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_inception_mapping_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_inception_journal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_inception_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.accounting_inception_packages,public.accounting_inception_package_versions,
  public.accounting_inception_coverage,public.accounting_inception_coverage_versions,
  public.accounting_inception_reviews,public.accounting_inception_mapping_authorizations,
  public.accounting_inception_journal_links,public.accounting_inception_acceptances
  FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.guard_accounting_inception_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $guard_inception_identity$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_INCEPTION_IDENTITY_IMMUTABLE';
  END IF;
  IF TG_TABLE_NAME='accounting_inception_packages' THEN
    IF OLD.id IS DISTINCT FROM NEW.id OR OLD.profile_id IS DISTINCT FROM NEW.profile_id
       OR OLD.created_at IS DISTINCT FROM NEW.created_at
       OR NEW.current_version<>OLD.current_version+1
       OR NOT EXISTS(SELECT 1 FROM public.accounting_inception_package_versions v
         WHERE v.profile_id=OLD.profile_id AND v.package_id=OLD.id AND v.version=NEW.current_version) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_INCEPTION_PACKAGE_IDENTITY_IMMUTABLE';
    END IF;
  ELSE
    IF OLD.id IS DISTINCT FROM NEW.id OR OLD.profile_id IS DISTINCT FROM NEW.profile_id
       OR OLD.source_domain IS DISTINCT FROM NEW.source_domain
       OR OLD.source_record_key IS DISTINCT FROM NEW.source_record_key
       OR OLD.economic_event_key IS DISTINCT FROM NEW.economic_event_key
       OR OLD.created_at IS DISTINCT FROM NEW.created_at
       OR NEW.current_version<>OLD.current_version+1
       OR NOT EXISTS(SELECT 1 FROM public.accounting_inception_coverage_versions v
         WHERE v.profile_id=OLD.profile_id AND v.coverage_id=OLD.id AND v.version=NEW.current_version) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_INCEPTION_COVERAGE_IDENTITY_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END;
$guard_inception_identity$;
CREATE TRIGGER accounting_inception_packages_guard
  BEFORE UPDATE OR DELETE ON public.accounting_inception_packages
  FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_inception_identity();
CREATE TRIGGER accounting_inception_coverage_guard
  BEFORE UPDATE OR DELETE ON public.accounting_inception_coverage
  FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_inception_identity();

CREATE TRIGGER accounting_inception_package_versions_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_inception_package_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_package_versions_no_truncate
  BEFORE TRUNCATE ON public.accounting_inception_package_versions
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_coverage_versions_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_inception_coverage_versions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_coverage_versions_no_truncate
  BEFORE TRUNCATE ON public.accounting_inception_coverage_versions
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_reviews_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_inception_reviews
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_reviews_no_truncate
  BEFORE TRUNCATE ON public.accounting_inception_reviews
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_mapping_authorizations_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_inception_mapping_authorizations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_mapping_authorizations_no_truncate
  BEFORE TRUNCATE ON public.accounting_inception_mapping_authorizations
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_journal_links_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_inception_journal_links
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_journal_links_no_truncate
  BEFORE TRUNCATE ON public.accounting_inception_journal_links
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_acceptances_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_inception_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_inception_acceptances_no_truncate
  BEFORE TRUNCATE ON public.accounting_inception_acceptances
  FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();

CREATE FUNCTION public.guard_accounting_inception_package_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $guard_inception_package_version$
DECLARE v_identity public.accounting_inception_packages%ROWTYPE;
  v_event public.accounting_foundation_events%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_INCEPTION_PACKAGE_APPEND_ONLY'; END IF;
  SELECT * INTO v_identity FROM public.accounting_inception_packages p
    WHERE p.profile_id=NEW.profile_id AND p.id=NEW.package_id FOR UPDATE;
  IF NOT FOUND OR (NEW.version=1 AND (NEW.previous_version IS NOT NULL OR v_identity.current_version<>0))
     OR (NEW.version>1 AND (NEW.previous_version<>NEW.version-1 OR v_identity.current_version<>NEW.previous_version)) THEN
    RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_INCEPTION_PACKAGE_REVISION_CONFLICT';
  END IF;
  SELECT * INTO v_event FROM public.accounting_foundation_events e WHERE e.id=NEW.foundation_event_id;
  IF NOT FOUND OR v_event.profile_id IS DISTINCT FROM NEW.profile_id
     OR v_event.entity_type IS DISTINCT FROM 'accounting_inception_package'
     OR v_event.entity_id IS DISTINCT FROM NEW.package_id OR v_event.entity_version IS DISTINCT FROM NEW.version
     OR v_event.actor_user_id IS DISTINCT FROM NEW.created_by
     OR (NEW.version=1 AND v_event.event_type IS DISTINCT FROM 'accounting_inception_package_created')
     OR (NEW.version>1 AND v_event.event_type IS DISTINCT FROM 'accounting_inception_package_updated')
     OR (NEW.payload->>'accounting_start_date')::date IS DISTINCT FROM NEW.accounting_start_date
     OR (NEW.payload->>'cutover_boundary_date')::date IS DISTINCT FROM NEW.cutover_boundary_date THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_INCEPTION_PACKAGE_EVENT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$guard_inception_package_version$;
CREATE TRIGGER accounting_inception_package_versions_validate
  BEFORE INSERT ON public.accounting_inception_package_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_inception_package_version();

CREATE FUNCTION public.guard_accounting_inception_coverage_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $guard_inception_coverage_version$
DECLARE v_identity public.accounting_inception_coverage%ROWTYPE;
  v_event public.accounting_foundation_events%ROWTYPE; v_item jsonb;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_INCEPTION_COVERAGE_APPEND_ONLY'; END IF;
  SELECT * INTO v_identity FROM public.accounting_inception_coverage c
    WHERE c.profile_id=NEW.profile_id AND c.id=NEW.coverage_id FOR UPDATE;
  IF NOT FOUND OR (NEW.version=1 AND (NEW.previous_version IS NOT NULL OR v_identity.current_version<>0))
     OR (NEW.version>1 AND (NEW.previous_version<>NEW.version-1 OR v_identity.current_version<>NEW.previous_version)) THEN
    RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_INCEPTION_COVERAGE_REVISION_CONFLICT';
  END IF;
  SELECT e.* INTO v_event FROM public.accounting_foundation_events e WHERE e.id=NEW.foundation_event_id;
  SELECT item.value INTO v_item FROM public.accounting_inception_package_versions pv
    CROSS JOIN LATERAL jsonb_array_elements(pv.payload->'items') item(value)
    WHERE pv.profile_id=NEW.profile_id AND pv.package_id=NEW.package_id
      AND pv.version=NEW.package_version AND item.value->>'item_id'=NEW.item_id::text
      AND item.value->>'source_domain'=v_identity.source_domain
      AND item.value->>'source_record_key'=v_identity.source_record_key
      AND item.value->>'economic_event_key'=v_identity.economic_event_key;
  IF NOT FOUND OR v_event.profile_id IS DISTINCT FROM NEW.profile_id
     OR v_event.entity_type IS DISTINCT FROM 'accounting_inception_package'
     OR v_event.entity_id IS DISTINCT FROM NEW.package_id
     OR v_event.entity_version IS DISTINCT FROM NEW.package_version
     OR v_event.actor_user_id IS DISTINCT FROM NEW.created_by
     OR NEW.classification IS DISTINCT FROM v_item->>'classification'
     OR NEW.resolution_state IS DISTINCT FROM v_item->>'resolution_state'
     OR NEW.is_material IS DISTINCT FROM (v_item->>'is_material')::boolean
     OR NEW.reconciliation_category IS DISTINCT FROM v_item->>'reconciliation_category'
     OR NEW.party_type IS DISTINCT FROM v_item->>'party_type'
     OR NEW.party_reference IS DISTINCT FROM v_item->>'party_reference'
     OR NEW.reconciliation_reference IS DISTINCT FROM v_item->>'reconciliation_reference'
     OR NEW.evidence_count IS DISTINCT FROM jsonb_array_length(v_item->'evidence_refs') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_INCEPTION_COVERAGE_MISMATCH';
  END IF;
  RETURN NEW;
END;
$guard_inception_coverage_version$;
CREATE TRIGGER accounting_inception_coverage_versions_validate
  BEFORE INSERT ON public.accounting_inception_coverage_versions
  FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_inception_coverage_version();

CREATE FUNCTION public.prevent_accounting_inception_source_replay()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $prevent_inception_replay$
BEGIN
  IF TG_OP='INSERT' AND NEW.source_domain<>'INCEPTION'
     AND EXISTS (
       SELECT 1 FROM public.accounting_inception_coverage c
       JOIN public.accounting_inception_coverage_versions v
         ON v.profile_id=c.profile_id AND v.coverage_id=c.id AND v.version=c.current_version
       WHERE c.profile_id=NEW.profile_id
         AND c.source_record_key=NEW.source_record_key
         AND c.economic_event_key=NEW.economic_event_key
         AND v.classification IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE','UNRESOLVED')
     ) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_SOURCE_COVERAGE_CONFLICT';
  END IF;
  RETURN NEW;
END;
$prevent_inception_replay$;
CREATE TRIGGER accounting_source_effects_inception_replay_guard
  BEFORE INSERT ON public.accounting_source_effects
  FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_inception_source_replay();

CREATE FUNCTION public.validate_accounting_inception_payload(p_profile_id uuid,p_payload jsonb)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $validate_inception_payload$
DECLARE
  v_item jsonb; v_line jsonb; v_ref jsonb; v_evidence jsonb; v_period record;
  v_account record; v_start date; v_cutover date; v_debits numeric; v_credits numeric;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object'
     OR (SELECT count(*) FROM jsonb_object_keys(p_payload))<>5
     OR NOT (p_payload ?& ARRAY['accounting_start_date','cutover_boundary_date',
       'evidence_inventory','items','reconciliation_references'])
     OR coalesce(p_payload->>'accounting_start_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     OR coalesce(p_payload->>'cutover_boundary_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
     OR jsonb_typeof(p_payload->'evidence_inventory')<>'array'
     OR jsonb_typeof(p_payload->'items')<>'array'
     OR jsonb_typeof(p_payload->'reconciliation_references')<>'array' THEN
    RETURN 'invalid_input';
  END IF;
  v_start:=(p_payload->>'accounting_start_date')::date;
  v_cutover:=(p_payload->>'cutover_boundary_date')::date;
  IF NOT isfinite(v_start) OR NOT isfinite(v_cutover) OR v_cutover<v_start THEN RETURN 'invalid_period_boundary'; END IF;
  IF jsonb_array_length(p_payload->'items') NOT BETWEEN 1 AND 500
     OR jsonb_array_length(p_payload->'evidence_inventory')>500
     OR jsonb_array_length(p_payload->'reconciliation_references')>500 THEN RETURN 'invalid_input'; END IF;
  IF (SELECT count(DISTINCT value->>'item_id') FROM jsonb_array_elements(p_payload->'items'))<>
       jsonb_array_length(p_payload->'items')
     OR (SELECT count(*) FROM (
       SELECT value->>'source_record_key',value->>'economic_event_key'
       FROM jsonb_array_elements(p_payload->'items')
       GROUP BY value->>'source_record_key',value->>'economic_event_key' HAVING count(*)>1
     ) duplicates)>0 THEN RETURN 'duplicate_coverage'; END IF;

  IF (SELECT count(DISTINCT (value->>'evidence_id')||':'||(value->>'version'))
      FROM jsonb_array_elements(p_payload->'evidence_inventory'))<>
      jsonb_array_length(p_payload->'evidence_inventory') THEN RETURN 'evidence_required'; END IF;
   FOR v_ref IN SELECT value FROM jsonb_array_elements(p_payload->'reconciliation_references') LOOP
     IF jsonb_typeof(v_ref)<>'object'
        OR (SELECT count(*) FROM jsonb_object_keys(v_ref))<>2
        OR NOT (v_ref ?& ARRAY['category','reference'])
        OR coalesce(v_ref->>'category','') NOT IN (
          'ACCOUNTS_RECEIVABLE','ACCOUNTS_PAYABLE','EMPLOYEE_ACCOUNTABILITY',
          'FOUNDER_SOURCE','BANK_CASH','ASSET','LIABILITY','EXPENSE','OTHER')
        OR length(btrim(coalesce(v_ref->>'reference','')))=0
        OR length(v_ref->>'reference')>2000 THEN RETURN 'invalid_input'; END IF;
   END LOOP;
   FOR v_evidence IN SELECT value FROM jsonb_array_elements(p_payload->'evidence_inventory') LOOP
    IF jsonb_typeof(v_evidence)<>'object'
       OR (SELECT count(*) FROM jsonb_object_keys(v_evidence))<>5
       OR NOT (v_evidence ?& ARRAY['evidence_id','version','evidence_type','evidence_ref','sha256'])
       OR coalesce(v_evidence->>'evidence_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR coalesce(v_evidence->>'version','') !~ '^[1-9][0-9]{0,8}$'
       OR coalesce(v_evidence->>'evidence_type','') NOT IN (
         'BANK_STATEMENT','BANK_CONFIRMATION','RECEIVABLE_DETAIL','PAYABLE_DETAIL',
         'EMPLOYEE_ACCOUNTABILITY','FOUNDER_AGREEMENT','FIXED_ASSET_SUPPORT',
         'PREPAYMENT_SUPPORT','EXPENSE_SUPPORT','OTHER')
       OR length(btrim(coalesce(v_evidence->>'evidence_ref','')))=0
       OR length(v_evidence->>'evidence_ref')>2000
       OR coalesce(v_evidence->>'sha256','') !~ '^[0-9a-f]{64}$' THEN
      RETURN 'evidence_required';
    END IF;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
    IF jsonb_typeof(v_item)<>'object'
       OR (SELECT count(*) FROM jsonb_object_keys(v_item))<>13
       OR NOT (v_item ?& ARRAY['item_id','source_domain','source_record_key','economic_event_key',
         'classification','resolution_state','is_material','reconciliation_category',
         'reconciliation_reference','party_type','party_reference','evidence_refs','journal'])
       OR coalesce(v_item->>'item_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR coalesce(v_item->>'source_domain','') !~ '^[A-Z][A-Z0-9_]{0,39}$'
       OR v_item->>'source_domain' IN ('CONTROLLED_MANUAL','INCEPTION')
       OR length(btrim(coalesce(v_item->>'source_record_key','')))=0
       OR length(btrim(coalesce(v_item->>'economic_event_key','')))=0
       OR length(v_item->>'source_record_key')>200 OR length(v_item->>'economic_event_key')>200
       OR coalesce(v_item->>'classification','') NOT IN (
         'RECONSTRUCTED_HISTORY','OPENING_BALANCE','POST_CUTOVER_SOURCE','UNRESOLVED')
       OR coalesce(v_item->>'resolution_state','') NOT IN ('RESOLVED','UNRESOLVED')
       OR coalesce(v_item->>'is_material','') NOT IN ('true','false')
       OR coalesce(v_item->>'reconciliation_category','') NOT IN (
         'ACCOUNTS_RECEIVABLE','ACCOUNTS_PAYABLE','EMPLOYEE_ACCOUNTABILITY',
         'FOUNDER_SOURCE','BANK_CASH','ASSET','LIABILITY','EXPENSE','OTHER')
       OR coalesce(v_item->>'party_type','') NOT IN (
         'NONE','CUSTOMER','SUPPLIER','EMPLOYEE','FOUNDER','BANK','CASH')
       OR jsonb_typeof(v_item->'evidence_refs')<>'array'
       OR (v_item->>'party_type'='NONE' AND v_item->>'party_reference' IS NOT NULL)
       OR (v_item->>'party_type'<>'NONE' AND length(btrim(coalesce(v_item->>'party_reference','')))=0) THEN
      RETURN 'invalid_input';
    END IF;
    IF (v_item->>'reconciliation_category'='ACCOUNTS_RECEIVABLE' AND v_item->>'party_type'<>'CUSTOMER')
       OR (v_item->>'reconciliation_category'='ACCOUNTS_PAYABLE' AND v_item->>'party_type'<>'SUPPLIER')
       OR (v_item->>'reconciliation_category'='EMPLOYEE_ACCOUNTABILITY' AND v_item->>'party_type'<>'EMPLOYEE')
       OR (v_item->>'reconciliation_category'='FOUNDER_SOURCE' AND v_item->>'party_type'<>'FOUNDER')
       OR (v_item->>'reconciliation_category'='BANK_CASH' AND v_item->>'party_type' NOT IN ('BANK','CASH')) THEN
      RETURN 'unsupported_classification';
    END IF;
    IF v_item->>'classification'='UNRESOLVED' THEN
      IF v_item->>'resolution_state'<>'UNRESOLVED' OR v_item->'journal'<>'null'::jsonb THEN RETURN 'unsupported_classification'; END IF;
    ELSIF v_item->>'classification'='POST_CUTOVER_SOURCE' THEN
      IF v_item->>'resolution_state'<>'RESOLVED' OR v_item->'journal'<>'null'::jsonb THEN RETURN 'unsupported_classification'; END IF;
    ELSE
      IF v_item->>'resolution_state'<>'RESOLVED' OR jsonb_typeof(v_item->'journal')<>'object'
         OR jsonb_array_length(v_item->'evidence_refs')=0
         OR length(btrim(coalesce(v_item->>'reconciliation_reference','')))=0
         OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'reconciliation_references') r
           WHERE r->>'category'=v_item->>'reconciliation_category'
             AND r->>'reference'=v_item->>'reconciliation_reference') THEN
        RETURN 'evidence_required';
      END IF;
      IF (SELECT count(*) FROM jsonb_object_keys(v_item->'journal'))<>6
         OR NOT (v_item->'journal' ?& ARRAY['accounting_date','period_id','period_version',
           'description_en','description_ar','lines'])
         OR coalesce(v_item->'journal'->>'accounting_date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         OR jsonb_typeof(v_item->'journal'->'lines')<>'array'
         OR jsonb_array_length(v_item->'journal'->'lines') NOT BETWEEN 2 AND 200 THEN RETURN 'invalid_input'; END IF;
      IF v_item->>'classification'='OPENING_BALANCE'
         AND (v_item->'journal'->>'accounting_date')::date<>v_cutover THEN RETURN 'period_date_mismatch'; END IF;
      IF v_item->>'classification'='RECONSTRUCTED_HISTORY'
         AND ((v_item->'journal'->>'accounting_date')::date<v_start
           OR (v_item->'journal'->>'accounting_date')::date>v_cutover) THEN RETURN 'period_date_mismatch'; END IF;
      SELECT pv.status,pv.start_date,pv.end_date INTO v_period
      FROM public.accounting_periods p
      JOIN public.accounting_period_versions pv ON pv.profile_id=p.profile_id
        AND pv.period_id=p.id AND pv.version=p.current_version
      WHERE p.profile_id=p_profile_id AND p.id=(v_item->'journal'->>'period_id')::uuid
        AND pv.version=(v_item->'journal'->>'period_version')::integer;
      IF NOT FOUND OR v_period.status<>'OPEN'
         OR (v_item->'journal'->>'accounting_date')::date NOT BETWEEN v_period.start_date AND v_period.end_date THEN
        RETURN 'period_not_open';
      END IF;
      v_debits:=0; v_credits:=0;
      FOR v_line IN SELECT value FROM jsonb_array_elements(v_item->'journal'->'lines') LOOP
        IF jsonb_typeof(v_line)<>'object'
           OR (SELECT count(*) FROM jsonb_object_keys(v_line))<>6
           OR NOT (v_line ?& ARRAY['account_id','account_version','side','amount_halalah','description_en','description_ar'])
           OR coalesce(v_line->>'account_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
           OR coalesce(v_line->>'account_version','') !~ '^[1-9][0-9]{0,8}$'
           OR coalesce(v_line->>'side','') NOT IN ('DEBIT','CREDIT')
           OR coalesce(v_line->>'amount_halalah','') !~ '^[1-9][0-9]{0,18}$' THEN RETURN 'invalid_input'; END IF;
        SELECT av.account_kind,av.is_active,av.is_protected,av.control_classification INTO v_account
        FROM public.accounting_accounts a
        JOIN public.accounting_account_versions av ON av.profile_id=a.profile_id
          AND av.account_id=a.id AND av.version=a.current_version
        WHERE a.profile_id=p_profile_id AND a.id=(v_line->>'account_id')::uuid
          AND a.current_version=(v_line->>'account_version')::integer
          AND NOT EXISTS(SELECT 1 FROM public.accounting_accounts child
            JOIN public.accounting_account_versions cv ON cv.profile_id=child.profile_id
              AND cv.account_id=child.id AND cv.version=child.current_version
            WHERE child.profile_id=p_profile_id AND cv.parent_account_id=av.account_id);
        IF NOT FOUND OR v_account.account_kind<>'POSTING' OR NOT v_account.is_active THEN RETURN 'account_not_posting'; END IF;
        IF (v_account.is_protected OR v_account.control_classification<>'NONE')
           AND (jsonb_array_length(v_item->'evidence_refs')=0 OR v_item->>'reconciliation_reference' IS NULL) THEN
          RETURN 'evidence_required';
        END IF;
        IF (v_account.control_classification='ACCOUNTS_RECEIVABLE' AND v_item->>'party_type'<>'CUSTOMER')
           OR (v_account.control_classification='ACCOUNTS_PAYABLE' AND v_item->>'party_type'<>'SUPPLIER')
           OR (v_account.control_classification IN ('EMPLOYEE_ADVANCE','CASH_ACCOUNTABILITY') AND v_item->>'party_type'<>'EMPLOYEE')
           OR (v_account.control_classification='CUSTOMER_ADVANCE' AND v_item->>'party_type'<>'CUSTOMER')
           OR (v_account.control_classification='SUPPLIER_ADVANCE' AND v_item->>'party_type'<>'SUPPLIER')
           OR (v_account.control_classification='CONTRACT_LIABILITY' AND v_item->>'party_type'<>'CUSTOMER') THEN
          RETURN 'unsupported_classification';
        END IF;
        IF EXISTS(SELECT 1 FROM public.accounting_source_effects se
          WHERE se.profile_id=p_profile_id AND se.source_record_key=v_item->>'source_record_key'
            AND se.economic_event_key=v_item->>'economic_event_key' AND se.source_domain<>'INCEPTION') THEN
          RETURN 'economic_effect_conflict';
        END IF;
        IF v_line->>'side'='DEBIT' THEN v_debits:=v_debits+(v_line->>'amount_halalah')::numeric;
        ELSE v_credits:=v_credits+(v_line->>'amount_halalah')::numeric; END IF;
      END LOOP;
      IF v_debits<>v_credits THEN RETURN 'journal_unbalanced'; END IF;
    END IF;
    IF (SELECT count(DISTINCT (value->>'evidence_id')||':'||(value->>'version'))
       FROM jsonb_array_elements(v_item->'evidence_refs'))<>
       jsonb_array_length(v_item->'evidence_refs') THEN RETURN 'evidence_required'; END IF;
     FOR v_ref IN SELECT value FROM jsonb_array_elements(v_item->'evidence_refs') LOOP
      IF jsonb_typeof(v_ref)<>'object'
         OR (SELECT count(*) FROM jsonb_object_keys(v_ref))<>2
         OR NOT (v_ref ?& ARRAY['evidence_id','version'])
         OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload->'evidence_inventory') e
           WHERE e->>'evidence_id'=v_ref->>'evidence_id' AND e->>'version'=v_ref->>'version') THEN
        RETURN 'evidence_required';
      END IF;
    END LOOP;
  END LOOP;
  RETURN NULL;
EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
  RETURN 'invalid_input';
END;
$validate_inception_payload$;

CREATE FUNCTION public.accounting_inception_mapping_authorized(
  p_profile_id uuid,p_rule_id uuid,p_rule_version integer,p_mapping_key text,
  p_account_id uuid,p_account_version integer
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $inception_mapping_authorized$
  SELECT EXISTS (
    SELECT 1 FROM public.accounting_inception_mapping_authorizations a
    JOIN public.accounting_inception_reviews r
      ON r.profile_id=a.profile_id AND r.package_id=a.package_id
       AND r.package_version=a.package_version AND r.decision='APPROVE'
       AND r.reviewer_user_id=a.reviewer_user_id
    WHERE a.profile_id=p_profile_id AND a.rule_id=p_rule_id
      AND a.rule_version=p_rule_version AND a.mapping_key=p_mapping_key
      AND a.account_id=p_account_id AND a.account_version=p_account_version
      AND a.preparer_user_id<>a.reviewer_user_id
  );
$inception_mapping_authorized$;

CREATE FUNCTION public.accounting_inception_journal_line_authorized(
  p_profile_id uuid,p_payload jsonb,p_line_number integer,p_mapping_key text,
  p_account_id uuid,p_account_version integer,p_actor_user_id uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $inception_line_authorized$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounting_inception_package_versions pv
    JOIN public.accounting_inception_reviews r
      ON r.profile_id=pv.profile_id AND r.package_id=pv.package_id
       AND r.package_version=pv.version AND r.decision='APPROVE'
    CROSS JOIN LATERAL jsonb_array_elements(pv.payload->'items') item(value)
    JOIN public.accounting_inception_coverage c
      ON c.profile_id=pv.profile_id AND c.source_domain=item.value->>'source_domain'
       AND c.source_record_key=item.value->>'source_record_key'
       AND c.economic_event_key=item.value->>'economic_event_key'
    JOIN public.accounting_inception_coverage_versions cv
      ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id
       AND cv.version=c.current_version AND cv.package_id=pv.package_id
       AND cv.package_version=pv.version AND cv.item_id=(item.value->>'item_id')::uuid
    CROSS JOIN LATERAL jsonb_array_elements(item.value->'journal'->'lines')
      WITH ORDINALITY plan_line(value,ordinality)
    JOIN public.accounting_posting_rule_mappings m
      ON m.profile_id=p_profile_id AND m.posting_rule_id=(p_payload->>'posting_rule_id')::uuid
       AND m.rule_version=(p_payload->>'rule_version')::integer
       AND m.mapping_key=p_mapping_key AND m.account_id=p_account_id
       AND m.account_version=p_account_version
    WHERE pv.profile_id=p_profile_id AND pv.created_by=p_actor_user_id
      AND r.reviewer_user_id<>p_actor_user_id
      AND item.value->>'classification' IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE')
      AND item.value->>'resolution_state'='RESOLVED'
      AND item.value->>'source_record_key'=p_payload->>'source_record_key'
      AND item.value->>'economic_event_key'=p_payload->>'economic_event_key'
      AND p_payload->>'source_domain'='INCEPTION'
      AND p_payload->>'posting_purpose'='inception'
      AND p_payload->>'accounting_date'=item.value->'journal'->>'accounting_date'
      AND p_payload->>'period_id'=item.value->'journal'->>'period_id'
      AND p_payload->>'period_version'=item.value->'journal'->>'period_version'
      AND p_payload->>'description_en'=item.value->'journal'->>'description_en'
      AND p_payload->>'description_ar'=item.value->'journal'->>'description_ar'
      AND plan_line.ordinality=p_line_number
      AND p_mapping_key='line_'||p_line_number::text
      AND plan_line.value->>'account_id'=p_account_id::text
      AND plan_line.value->>'account_version'=p_account_version::text
      AND plan_line.value->>'side'=p_payload->'lines'->(p_line_number-1)->>'side'
      AND plan_line.value->>'amount_halalah'=p_payload->'lines'->(p_line_number-1)->>'amount_halalah'
      AND plan_line.value->>'description_en'=p_payload->'lines'->(p_line_number-1)->>'description_en'
      AND plan_line.value->>'description_ar'=p_payload->'lines'->(p_line_number-1)->>'description_ar'
      AND p_payload->'lines'->(p_line_number-1)->>'mapping_key'=p_mapping_key
      AND p_payload->'lines'->(p_line_number-1)->>'service_id' IS NULL
      AND cv.classification=item.value->>'classification'
      AND cv.resolution_state='RESOLVED' AND cv.evidence_count>0
  );
$inception_line_authorized$;

CREATE FUNCTION public.accounting_inception_journal_link_authorized(
  p_profile_id uuid,p_journal_id uuid,p_version integer,p_prepared_by uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $inception_journal_link_authorized$
  SELECT EXISTS (
    SELECT 1 FROM public.accounting_inception_journal_links l
    JOIN public.accounting_inception_reviews r
      ON r.profile_id=l.profile_id AND r.package_id=l.package_id
       AND r.package_version=l.package_version AND r.decision='APPROVE'
       AND r.reviewer_user_id<>l.prepared_by
    JOIN public.accounting_journal_versions jv
      ON jv.profile_id=l.profile_id AND jv.journal_id=l.journal_id
       AND jv.version=l.prepared_version AND jv.source_domain='INCEPTION'
       AND jv.prepared_by=l.prepared_by
    WHERE l.profile_id=p_profile_id AND l.journal_id=p_journal_id
      AND l.prepared_version=p_version AND l.prepared_by=p_prepared_by
  );
$inception_journal_link_authorized$;

CREATE FUNCTION public.save_accounting_inception_package(
  p_actor_user_id uuid,p_package_id uuid,p_expected_version integer,p_package jsonb,
  p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,package_id uuid,version integer,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $save_inception_package$
DECLARE
  v_profile_id uuid; v_profile_version integer; v_start date; v_cutover date;
  v_version integer; v_new_version integer; v_package_id uuid; v_event_id uuid;
  v_fingerprint text; v_request_fingerprint text; v_previous public.accounting_foundation_events%ROWTYPE;
  v_error text; v_item jsonb; v_coverage_id uuid; v_coverage_version integer;
  v_domain text; v_source text; v_economic text; v_item_id uuid;
BEGIN
  IF p_actor_user_id IS NULL OR p_expected_version IS NULL OR p_request_id IS NULL
     OR length(btrim(coalesce(p_reason,'')))=0
     OR (p_package_id IS NULL AND p_expected_version<>0)
     OR (p_package_id IS NOT NULL AND p_expected_version=0) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_inception') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id,pv.version,pv.accounting_start_date,pv.cutover_boundary_date
    INTO v_profile_id,v_profile_version,v_start,v_cutover
  FROM public.accounting_profiles p
  JOIN public.accounting_profile_versions pv
    ON pv.profile_id=p.id AND pv.version=p.current_version
  WHERE p.singleton_key='g7' AND p.current_version>0
    AND pv.activation_state='DEV_PROVISIONAL' AND pv.vat_mode='not_registered'
    AND pv.zatca_state='INACTIVE' AND pv.fatoora_state='INACTIVE'
  FOR SHARE OF p;
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  v_error:=public.validate_accounting_inception_payload(v_profile_id,p_package);
  IF v_error IS NOT NULL THEN RETURN QUERY SELECT v_error,NULL::uuid,NULL::integer,false; RETURN; END IF;
  IF (p_package->>'accounting_start_date')::date IS DISTINCT FROM v_start
     OR (p_package->>'cutover_boundary_date')::date IS DISTINCT FROM v_cutover THEN
    RETURN QUERY SELECT 'profile_version_changed'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10b-profile:'||v_profile_id::text,0));
  v_request_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'package_id',p_package_id,'expected_version',p_expected_version,'package',p_package,
    'reason',btrim(p_reason))::text,'UTF8'),'sha256'),'hex');
  SELECT e.* INTO v_previous FROM public.accounting_foundation_events e
    WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.payload_fingerprint<>v_request_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,v_previous.entity_id,v_previous.entity_version,true; RETURN;
  END IF;

  IF p_package_id IS NULL THEN
    IF p_expected_version<>0 THEN RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
    v_package_id:=gen_random_uuid(); v_version:=0; v_new_version:=1;
    INSERT INTO public.accounting_inception_packages(id,profile_id,current_version)
      VALUES(v_package_id,v_profile_id,0);
  ELSE
    SELECT p.current_version INTO v_version FROM public.accounting_inception_packages p
      WHERE p.profile_id=v_profile_id AND p.id=p_package_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'package_not_found'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
    IF v_version<>p_expected_version THEN RETURN QUERY SELECT 'revision_conflict'::text,p_package_id,v_version,false; RETURN; END IF;
    IF EXISTS(SELECT 1 FROM public.accounting_inception_acceptances a
      WHERE a.profile_id=v_profile_id AND a.package_id=p_package_id)
       OR EXISTS(SELECT 1 FROM public.accounting_inception_journal_links l
         WHERE l.profile_id=v_profile_id AND l.package_id=p_package_id) THEN
      RETURN QUERY SELECT 'journal_not_draft'::text,p_package_id,v_version,false; RETURN;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.accounting_inception_coverage_versions cv
      WHERE cv.profile_id=v_profile_id AND cv.package_id=p_package_id
        AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_package->'items') item
          WHERE item->>'item_id'=cv.item_id::text)
    ) THEN
      RETURN QUERY SELECT 'incomplete_coverage'::text,p_package_id,v_version,false; RETURN;
    END IF;
    v_package_id:=p_package_id; v_new_version:=v_version+1;
  END IF;

  v_start:=(p_package->>'accounting_start_date')::date;
  v_cutover:=(p_package->>'cutover_boundary_date')::date;
  v_fingerprint:=encode(extensions.digest(convert_to(p_package::text,'UTF8'),'sha256'),'hex');
  v_event_id:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(v_event_id,v_profile_id,
    CASE WHEN v_new_version=1 THEN 'accounting_inception_package_created' ELSE 'accounting_inception_package_updated' END,
    'accounting_inception_package',v_package_id,v_new_version,p_actor_user_id,p_request_id,
    btrim(p_reason),NULL,v_request_fingerprint,
    'accounting_inception_packages/'||v_package_id||'/'||v_new_version,clock_timestamp());
  INSERT INTO public.accounting_inception_package_versions(
    profile_id,package_id,version,previous_version,accounting_start_date,cutover_boundary_date,
    payload,payload_fingerprint,created_by,foundation_event_id
  ) VALUES(v_profile_id,v_package_id,v_new_version,NULLIF(v_version,0),v_start,v_cutover,
    p_package,v_fingerprint,p_actor_user_id,v_event_id);
  UPDATE public.accounting_inception_packages SET current_version=v_new_version
    WHERE profile_id=v_profile_id AND id=v_package_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_package->'items') LOOP
    v_domain:=v_item->>'source_domain'; v_source:=v_item->>'source_record_key';
    v_economic:=v_item->>'economic_event_key'; v_item_id:=(v_item->>'item_id')::uuid;
    SELECT c.id,c.current_version INTO v_coverage_id,v_coverage_version
      FROM public.accounting_inception_coverage c
      WHERE c.profile_id=v_profile_id AND c.source_record_key=v_source
        AND c.economic_event_key=v_economic FOR UPDATE;
    IF FOUND THEN
      IF NOT EXISTS(SELECT 1 FROM public.accounting_inception_coverage c
        JOIN public.accounting_inception_coverage_versions cv
          ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id AND cv.version=c.current_version
        WHERE c.profile_id=v_profile_id AND c.id=v_coverage_id
          AND c.source_domain=v_domain AND cv.package_id=v_package_id) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_INCEPTION_DUPLICATE_COVERAGE';
      END IF;
      v_coverage_version:=v_coverage_version+1;
    ELSE
      v_coverage_id:=gen_random_uuid(); v_coverage_version:=1;
      INSERT INTO public.accounting_inception_coverage(
        id,profile_id,source_domain,source_record_key,economic_event_key,current_version
      ) VALUES(v_coverage_id,v_profile_id,v_domain,v_source,v_economic,0);
    END IF;
    INSERT INTO public.accounting_inception_coverage_versions(
      profile_id,coverage_id,version,previous_version,package_id,package_version,item_id,
      classification,resolution_state,is_material,reconciliation_category,party_type,
      party_reference,reconciliation_reference,evidence_count,payload_fingerprint,
      created_by,foundation_event_id
    ) VALUES(v_profile_id,v_coverage_id,v_coverage_version,
      CASE WHEN v_coverage_version=1 THEN NULL ELSE v_coverage_version-1 END,
      v_package_id,v_new_version,v_item_id,v_item->>'classification',
      v_item->>'resolution_state',(v_item->>'is_material')::boolean,
      v_item->>'reconciliation_category',v_item->>'party_type',v_item->>'party_reference',
      v_item->>'reconciliation_reference',jsonb_array_length(v_item->'evidence_refs'),
      encode(extensions.digest(convert_to(v_item::text,'UTF8'),'sha256'),'hex'),
      p_actor_user_id,v_event_id);
    UPDATE public.accounting_inception_coverage SET current_version=v_coverage_version
      WHERE profile_id=v_profile_id AND id=v_coverage_id;
  END LOOP;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES('save','accounting_inception_package',v_package_id,p_actor_user_id::text,
    jsonb_build_object('request_id',p_request_id,'version',v_new_version,
      'item_count',jsonb_array_length(p_package->'items'),'fingerprint',v_fingerprint),clock_timestamp());
  RETURN QUERY SELECT NULL::text,v_package_id,v_new_version,false;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'duplicate_coverage'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN invalid_text_representation OR datetime_field_overflow THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN check_violation THEN
    v_error:=SQLERRM;
    RETURN QUERY SELECT CASE v_error
      WHEN 'ACCOUNTING_INCEPTION_DUPLICATE_COVERAGE' THEN 'duplicate_coverage'
      WHEN 'ACCOUNTING_INCEPTION_PACKAGE_REVISION_CONFLICT' THEN 'revision_conflict'
      ELSE 'invalid_input' END::text,NULL::uuid,NULL::integer,false; RETURN;
END;
$save_inception_package$;

CREATE FUNCTION public.review_accounting_inception_package(
  p_actor_user_id uuid,p_package_id uuid,p_package_version integer,p_approve boolean,
  p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,review_id uuid,decision text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $review_inception_package$
DECLARE
  v_profile_id uuid; v_creator uuid; v_payload jsonb; v_error text; v_review_id uuid;
  v_event_id uuid; v_fingerprint text; v_previous public.accounting_foundation_events%ROWTYPE;
  v_decision text;
BEGIN
  IF p_actor_user_id IS NULL OR p_package_id IS NULL OR p_package_version IS NULL
     OR p_package_version<1 OR p_approve IS NULL OR p_request_id IS NULL
     OR length(btrim(coalesce(p_reason,'')))=0 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::text,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::text,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_inception') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT pv.profile_id,pv.created_by,pv.payload INTO v_profile_id,v_creator,v_payload
  FROM public.accounting_inception_package_versions pv
  WHERE pv.package_id=p_package_id AND pv.version=p_package_version;
  IF NOT FOUND THEN RETURN QUERY SELECT 'package_not_found'::text,NULL::uuid,NULL::text,false; RETURN; END IF;
  IF p_actor_user_id=v_creator THEN RETURN QUERY SELECT 'separation_required'::text,NULL::uuid,NULL::text,false; RETURN; END IF;
  v_error:=public.validate_accounting_inception_payload(v_profile_id,v_payload);
  IF v_error IS NOT NULL THEN RETURN QUERY SELECT v_error,NULL::uuid,NULL::text,false; RETURN; END IF;
  IF p_approve AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_payload->'items') item
    WHERE item->>'is_material'='true'
      AND (item->>'classification'='UNRESOLVED' OR item->>'resolution_state'<>'RESOLVED')
  ) THEN RETURN QUERY SELECT 'unresolved_material_evidence'::text,NULL::uuid,NULL::text,false; RETURN; END IF;
  IF p_approve AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_payload->'items') item
    WHERE item->>'classification' IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE')
      AND NOT EXISTS (
        SELECT 1 FROM public.accounting_inception_coverage c
        JOIN public.accounting_inception_coverage_versions cv
          ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id AND cv.version=c.current_version
        WHERE c.profile_id=v_profile_id
          AND c.source_record_key=item->>'source_record_key'
          AND c.economic_event_key=item->>'economic_event_key'
          AND c.source_domain=item->>'source_domain'
          AND cv.package_id=p_package_id AND cv.package_version=p_package_version
          AND cv.item_id=(item->>'item_id')::uuid AND cv.classification=item->>'classification'
          AND cv.resolution_state='RESOLVED' AND cv.evidence_count>0
      )
  ) THEN RETURN QUERY SELECT 'incomplete_coverage'::text,NULL::uuid,NULL::text,false; RETURN; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10b-profile:'||v_profile_id::text,0));
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'package_id',p_package_id,'version',p_package_version,'approve',p_approve,'reason',btrim(p_reason)
  )::text,'UTF8'),'sha256'),'hex');
  SELECT e.* INTO v_previous FROM public.accounting_foundation_events e
    WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.payload_fingerprint<>v_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::text,false; RETURN;
    END IF;
    SELECT id,decision INTO v_review_id,v_decision
      FROM public.accounting_inception_reviews WHERE foundation_event_id=v_previous.id;
    RETURN QUERY SELECT NULL::text,v_review_id,v_decision,true; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_inception_reviews r
    WHERE r.profile_id=v_profile_id AND r.package_id=p_package_id AND r.package_version=p_package_version) THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::text,false; RETURN;
  END IF;
  v_decision:=CASE WHEN p_approve THEN 'APPROVE' ELSE 'REJECT' END;
  v_review_id:=gen_random_uuid(); v_event_id:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(v_event_id,v_profile_id,
    CASE WHEN p_approve THEN 'accounting_inception_package_reviewed' ELSE 'accounting_inception_package_rejected' END,
    'accounting_inception_review',v_review_id,1,p_actor_user_id,p_request_id,btrim(p_reason),
    NULL,v_fingerprint,'accounting_inception_reviews/'||v_review_id,clock_timestamp());
  INSERT INTO public.accounting_inception_reviews(
    id,profile_id,package_id,package_version,decision,reviewer_user_id,reason,payload_fingerprint,foundation_event_id
  ) VALUES(v_review_id,v_profile_id,p_package_id,p_package_version,v_decision,p_actor_user_id,
    btrim(p_reason),v_fingerprint,v_event_id);
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES(CASE WHEN p_approve THEN 'approve' ELSE 'reject' END,'accounting_inception_package',
    p_package_id,p_actor_user_id::text,jsonb_build_object('request_id',p_request_id,
      'package_version',p_package_version,'review_id',v_review_id,'decision',v_decision),clock_timestamp());
  RETURN QUERY SELECT NULL::text,v_review_id,v_decision,false;
EXCEPTION WHEN unique_violation THEN
  RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::text,false; RETURN;
END;
$review_inception_package$;

CREATE FUNCTION public.get_accounting_inception_package(
  p_actor_user_id uuid,p_package_id uuid
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $get_inception_package$
DECLARE v_profile_id uuid; v_result jsonb;
BEGIN
  IF p_actor_user_id IS NULL OR p_package_id IS NULL
     OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  IF NOT (public.get_accounting_capability(p_actor_user_id,'accounting:view')
       OR public.get_accounting_capability(p_actor_user_id,'accounting:manage_inception')) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT jsonb_build_object(
    'package_id',p.id,'profile_id',p.profile_id,'current_version',p.current_version,
    'created_at',p.created_at,'version',jsonb_build_object(
      'version',pv.version,'previous_version',pv.previous_version,'accounting_start_date',pv.accounting_start_date,
      'cutover_boundary_date',pv.cutover_boundary_date,'payload',pv.payload,
      'payload_fingerprint',pv.payload_fingerprint,'created_by',pv.created_by,
      'created_at',pv.created_at),
    'versions',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'version',allv.version,'previous_version',allv.previous_version,
      'accounting_start_date',allv.accounting_start_date,
      'cutover_boundary_date',allv.cutover_boundary_date,'payload',allv.payload,
      'payload_fingerprint',allv.payload_fingerprint,'created_by',allv.created_by,
      'created_at',allv.created_at) ORDER BY allv.version)
      FROM public.accounting_inception_package_versions allv
      WHERE allv.profile_id=p.profile_id AND allv.package_id=p.id),'[]'::jsonb),
    'coverage_history',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'coverage_id',c.id,'source_domain',c.source_domain,
      'source_record_key',c.source_record_key,'economic_event_key',c.economic_event_key,
      'version',cv.version,'previous_version',cv.previous_version,
      'package_version',cv.package_version,'item_id',cv.item_id,
      'classification',cv.classification,'resolution_state',cv.resolution_state,
      'is_material',cv.is_material,'reconciliation_category',cv.reconciliation_category,
      'party_type',cv.party_type,'party_reference',cv.party_reference,
      'reconciliation_reference',cv.reconciliation_reference,'evidence_count',cv.evidence_count,
      'payload_fingerprint',cv.payload_fingerprint,'created_by',cv.created_by,'created_at',cv.created_at)
      ORDER BY cv.package_version,c.source_domain,c.source_record_key,c.economic_event_key,cv.version)
      FROM public.accounting_inception_coverage c
      JOIN public.accounting_inception_coverage_versions cv
        ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id
      WHERE cv.package_id=p.id AND c.profile_id=p.profile_id),'[]'::jsonb),
    'review_history',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'review_id',r.id,'package_version',r.package_version,'decision',r.decision,
      'reviewer_user_id',r.reviewer_user_id,'reason',r.reason,'reviewed_at',r.reviewed_at)
      ORDER BY r.package_version)
      FROM public.accounting_inception_reviews r
      WHERE r.profile_id=p.profile_id AND r.package_id=p.id),'[]'::jsonb),
    'coverage',coalesce((SELECT jsonb_agg(jsonb_build_object(
      'coverage_id',c.id,'source_domain',c.source_domain,'source_record_key',c.source_record_key,
      'economic_event_key',c.economic_event_key,'version',cv.version,
      'item_id',cv.item_id,'classification',cv.classification,
      'resolution_state',cv.resolution_state,'is_material',cv.is_material,
      'reconciliation_category',cv.reconciliation_category,'party_type',cv.party_type,
      'party_reference',cv.party_reference,'reconciliation_reference',cv.reconciliation_reference,
      'evidence_count',cv.evidence_count) ORDER BY c.source_domain,c.source_record_key,c.economic_event_key)
      FROM public.accounting_inception_coverage c
      JOIN public.accounting_inception_coverage_versions cv
        ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id AND cv.version=c.current_version
      WHERE cv.package_id=p.id AND cv.package_version=p.current_version),'[]'::jsonb),
    'review',(SELECT jsonb_build_object('review_id',r.id,'decision',r.decision,
      'reviewer_user_id',r.reviewer_user_id,'reason',r.reason,'reviewed_at',r.reviewed_at)
      FROM public.accounting_inception_reviews r
      WHERE r.profile_id=p.profile_id AND r.package_id=p.id AND r.package_version=p.current_version),
    'acceptance',(SELECT jsonb_build_object('acceptance_id',a.id,'accepted_by',a.accepted_by,
      'accepted_at',a.accepted_at,'as_of_date',a.as_of_date,'recorded_at_cutoff',a.recorded_at_cutoff,
      'trial_balance',a.trial_balance)
      FROM public.accounting_inception_acceptances a
      WHERE a.profile_id=p.profile_id AND a.package_id=p.id AND a.package_version=p.current_version)
  ) INTO v_result
  FROM public.accounting_inception_packages p
  JOIN public.accounting_inception_package_versions pv
    ON pv.profile_id=p.profile_id AND pv.package_id=p.id AND pv.version=p.current_version
  WHERE p.id=p_package_id;
  RETURN v_result;
END;
$get_inception_package$;

CREATE FUNCTION public.list_accounting_inception_packages(p_actor_user_id uuid)
RETURNS TABLE(package_id uuid,current_version integer,accounting_start_date date,
  cutover_boundary_date date,created_at timestamptz,accepted boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $list_inception_packages$
DECLARE v_profile_id uuid;
BEGIN
  IF p_actor_user_id IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active
  ) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED'; END IF;
  IF NOT (public.get_accounting_capability(p_actor_user_id,'accounting:view')
       OR public.get_accounting_capability(p_actor_user_id,'accounting:manage_inception')) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT id INTO v_profile_id FROM public.accounting_profiles WHERE singleton_key='g7';
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT p.id,p.current_version,pv.accounting_start_date,pv.cutover_boundary_date,p.created_at,
    EXISTS(SELECT 1 FROM public.accounting_inception_acceptances a
      WHERE a.profile_id=p.profile_id AND a.package_id=p.id AND a.package_version=p.current_version)
  FROM public.accounting_inception_packages p
  JOIN public.accounting_inception_package_versions pv
    ON pv.profile_id=p.profile_id AND pv.package_id=p.id AND pv.version=p.current_version
  WHERE p.profile_id=v_profile_id ORDER BY p.created_at,p.id;
END;
$list_inception_packages$;

CREATE FUNCTION public.prepare_accounting_inception_journal(
  p_actor_user_id uuid,p_package_id uuid,p_package_version integer,p_item_id uuid,
  p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $prepare_inception_journal$
DECLARE
  v_profile_id uuid; v_current_version integer; v_creator uuid; v_payload jsonb; v_item jsonb;
  v_review_user uuid; v_review_decision text; v_error text; v_fingerprint text;
  v_rule_id uuid; v_rule_code text; v_rule_event uuid; v_rule_version integer:=1;
  v_line jsonb; v_line_number integer; v_mapping_key text; v_journal jsonb;
  v_rpc record; v_link public.accounting_inception_journal_links%ROWTYPE;
  v_current_journal_version integer; v_current_status text; v_evidence_ref text;
BEGIN
  IF p_actor_user_id IS NULL OR p_package_id IS NULL OR p_package_version IS NULL
     OR p_package_version<1 OR p_item_id IS NULL OR p_request_id IS NULL
     OR length(btrim(coalesce(p_reason,'')))=0 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_inception')
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:prepare_journal') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.profile_id,p.current_version,pv.created_by,pv.payload
    INTO v_profile_id,v_current_version,v_creator,v_payload
  FROM public.accounting_inception_packages p
  JOIN public.accounting_inception_package_versions pv
    ON pv.profile_id=p.profile_id AND pv.package_id=p.id AND pv.version=p.current_version
  WHERE p.id=p_package_id FOR UPDATE OF p;
  IF NOT FOUND THEN RETURN QUERY SELECT 'package_not_found'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  IF v_current_version<>p_package_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF p_actor_user_id<>v_creator THEN
    RETURN QUERY SELECT 'separation_required'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_inception_acceptances a
    WHERE a.profile_id=v_profile_id AND a.package_id=p_package_id) THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  v_error:=public.validate_accounting_inception_payload(v_profile_id,v_payload);
  IF v_error IS NOT NULL THEN RETURN QUERY SELECT v_error,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  SELECT value INTO v_item FROM jsonb_array_elements(v_payload->'items')
    WHERE value->>'item_id'=p_item_id::text;
  IF NOT FOUND OR v_item->>'classification' NOT IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE')
     OR v_item->>'resolution_state'<>'RESOLVED' OR jsonb_typeof(v_item->'journal')<>'object' THEN
    RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT cv.coverage_id INTO v_link.journal_id
  FROM public.accounting_inception_coverage_versions cv
  WHERE cv.profile_id=v_profile_id AND cv.package_id=p_package_id
    AND cv.package_version=p_package_version AND cv.item_id=p_item_id
    AND cv.classification=v_item->>'classification' AND cv.resolution_state='RESOLVED'
    AND cv.evidence_count>0
  ORDER BY cv.version DESC LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT 'incomplete_coverage'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN; END IF;
  v_link.journal_id:=NULL;
  SELECT r.reviewer_user_id,r.decision INTO v_review_user,v_review_decision
  FROM public.accounting_inception_reviews r
  WHERE r.profile_id=v_profile_id AND r.package_id=p_package_id
    AND r.package_version=p_package_version;
  IF NOT FOUND OR v_review_decision<>'APPROVE' OR v_review_user=p_actor_user_id THEN
    RETURN QUERY SELECT 'review_required'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10b-profile:'||v_profile_id::text,0));
  SELECT * INTO v_link FROM public.accounting_inception_journal_links l
    WHERE l.profile_id=v_profile_id AND l.package_id=p_package_id
      AND l.package_version=p_package_version AND l.item_id=p_item_id;
  IF FOUND THEN
    SELECT j.current_version,jv.status INTO v_current_journal_version,v_current_status
    FROM public.accounting_journals j
    JOIN public.accounting_journal_versions jv
      ON jv.profile_id=j.profile_id AND jv.journal_id=j.id AND jv.version=j.current_version
    WHERE j.profile_id=v_profile_id AND j.id=v_link.journal_id;
    IF v_current_status='DRAFT' THEN
      RETURN QUERY SELECT NULL::text,v_link.journal_id,v_current_journal_version,'DRAFT'::text,true; RETURN;
    END IF;
    RETURN QUERY SELECT 'journal_not_draft'::text,v_link.journal_id,v_current_journal_version,
      coalesce(v_current_status,'POSTED'),false; RETURN;
  END IF;

  v_rule_id:=gen_random_uuid();
  v_rule_code:='W10C_'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,32));
  INSERT INTO public.accounting_posting_rules(id,profile_id,rule_code,current_version)
    VALUES(v_rule_id,v_profile_id,v_rule_code,0);
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'package_id',p_package_id,'package_version',p_package_version,'item_id',p_item_id,
    'classification',v_item->>'classification','journal',v_item->'journal'
  )::text,'UTF8'),'sha256'),'hex');
  v_rule_event:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(v_rule_event,v_profile_id,'accounting_posting_rule_created','accounting_posting_rule',
    v_rule_id,v_rule_version,p_actor_user_id,gen_random_uuid(),btrim(p_reason),
    NULL,v_fingerprint,'accounting_posting_rules/'||v_rule_id||'/1',clock_timestamp());
  INSERT INTO public.accounting_posting_rule_versions(
    profile_id,posting_rule_id,version,previous_version,name_en,name_ar,is_active,
    effective_from,reason,evidence_ref,created_by,foundation_event_id
  ) VALUES(v_profile_id,v_rule_id,1,NULL,
    left('Inception: '||v_item->'journal'->>'description_en',160),
    left('افتتاح: '||v_item->'journal'->>'description_ar',160),
    true,clock_timestamp(),btrim(p_reason),NULL,p_actor_user_id,v_rule_event);
  UPDATE public.accounting_posting_rules SET current_version=1
    WHERE profile_id=v_profile_id AND id=v_rule_id;

  FOR v_line,v_line_number IN
    SELECT value,ordinality::integer FROM jsonb_array_elements(v_item->'journal'->'lines')
      WITH ORDINALITY
  LOOP
    v_mapping_key:='line_'||v_line_number::text;
    INSERT INTO public.accounting_inception_mapping_authorizations(
      profile_id,package_id,package_version,item_id,rule_id,rule_version,mapping_key,
      account_id,account_version,side,preparer_user_id,reviewer_user_id,payload_fingerprint
    ) VALUES(v_profile_id,p_package_id,p_package_version,p_item_id,v_rule_id,v_rule_version,
      v_mapping_key,(v_line->>'account_id')::uuid,(v_line->>'account_version')::integer,
      v_line->>'side',p_actor_user_id,v_review_user,v_fingerprint);
    INSERT INTO public.accounting_posting_rule_mappings(
      profile_id,posting_rule_id,rule_version,mapping_key,account_id,account_version,
      allowed_side,service_requirement
    ) VALUES(v_profile_id,v_rule_id,v_rule_version,v_mapping_key,
      (v_line->>'account_id')::uuid,(v_line->>'account_version')::integer,
      v_line->>'side','FORBIDDEN');
  END LOOP;

  SELECT jsonb_build_object(
    'accounting_date',v_item->'journal'->'accounting_date',
    'period_id',v_item->'journal'->'period_id',
    'period_version',v_item->'journal'->'period_version',
    'posting_rule_id',v_rule_id,'rule_version',v_rule_version,
    'source_domain','INCEPTION',
    'source_record_key',v_item->>'source_record_key',
    'economic_event_key',v_item->>'economic_event_key',
    'posting_purpose','inception',
    'description_en',v_item->'journal'->'description_en',
    'description_ar',v_item->'journal'->'description_ar',
    'lines',(SELECT jsonb_agg(jsonb_build_object(
      'mapping_key','line_'||x.ordinality::text,'side',x.value->'side',
      'amount_halalah',x.value->'amount_halalah','service_id',NULL,
      'description_en',x.value->'description_en','description_ar',x.value->'description_ar'
    ) ORDER BY x.ordinality) FROM jsonb_array_elements(v_item->'journal'->'lines')
      WITH ORDINALITY x(value,ordinality))
  ) INTO v_journal;
  SELECT value->>'evidence_ref' INTO v_evidence_ref
  FROM jsonb_array_elements(v_payload->'evidence_inventory')
  WHERE value->>'evidence_id'=v_item->'evidence_refs'->0->>'evidence_id'
    AND value->>'version'=v_item->'evidence_refs'->0->>'version';
  SELECT * INTO v_rpc FROM public.prepare_accounting_journal(
    p_actor_user_id,NULL,0,v_journal,btrim(p_reason),v_evidence_ref,p_request_id);
  IF v_rpc.error_code IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='W10C_PREPARE:'||v_rpc.error_code;
  END IF;
  INSERT INTO public.accounting_inception_journal_links(
    profile_id,package_id,package_version,item_id,journal_id,prepared_version,
    prepared_by,payload_fingerprint
  ) VALUES(v_profile_id,p_package_id,p_package_version,p_item_id,
    v_rpc.journal_id,v_rpc.version,v_creator,v_fingerprint);
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES('prepare','accounting_inception_package',p_package_id,p_actor_user_id::text,
    jsonb_build_object('request_id',p_request_id,'package_version',p_package_version,
      'item_id',p_item_id,'journal_id',v_rpc.journal_id,'journal_version',v_rpc.version,
      'classification',v_item->>'classification'),clock_timestamp());
  RETURN QUERY SELECT NULL::text,v_rpc.journal_id,v_rpc.version,v_rpc.status,v_rpc.idempotent_replay;
EXCEPTION
  WHEN raise_exception THEN
    v_error:=replace(SQLERRM,'W10C_PREPARE:','');
    IF SQLERRM LIKE 'W10C_PREPARE:%' THEN
      RETURN QUERY SELECT v_error,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
    END IF;
    RAISE;
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'duplicate_coverage'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  WHEN check_violation THEN
    RETURN QUERY SELECT 'mapping_invalid'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
END;
$prepare_inception_journal$;

CREATE FUNCTION public.post_accounting_inception_journal(
  p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid
) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $post_inception_journal$
DECLARE
  v_profile_id uuid; v_preparer uuid; v_reviewer uuid; v_decision text; v_linked_version integer;
  v_rpc record;
BEGIN
  IF p_actor_user_id IS NULL OR p_journal_id IS NULL OR p_expected_version IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_inception')
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:post_journal') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT l.profile_id,l.prepared_by,l.prepared_version,r.reviewer_user_id,r.decision
    INTO v_profile_id,v_preparer,v_linked_version,v_reviewer,v_decision
  FROM public.accounting_inception_journal_links l
  JOIN public.accounting_inception_reviews r
    ON r.profile_id=l.profile_id AND r.package_id=l.package_id
      AND r.package_version=l.package_version
  WHERE l.journal_id=p_journal_id;
  IF NOT FOUND OR v_preparer=v_reviewer OR v_decision<>'APPROVE'
     OR p_actor_user_id<>v_reviewer THEN
    RETURN QUERY SELECT 'review_required'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF p_expected_version<>v_linked_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,p_journal_id,v_linked_version,'DRAFT'::text,false; RETURN;
  END IF;
  SELECT * INTO v_rpc FROM public.post_accounting_journal(
    p_actor_user_id,p_journal_id,p_expected_version,p_request_id);
  RETURN QUERY SELECT v_rpc.error_code,v_rpc.journal_id,v_rpc.version,v_rpc.status,v_rpc.idempotent_replay;
END;
$post_inception_journal$;

CREATE FUNCTION public.accept_accounting_inception_package(
  p_actor_user_id uuid,p_package_id uuid,p_package_version integer,p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,acceptance_id uuid,trial_balance jsonb,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $accept_inception_package$
DECLARE
  v_profile_id uuid; v_current_version integer; v_payload jsonb; v_cutover date;
  v_creator uuid; v_reviewer uuid; v_decision text; v_error text;
  v_request_fingerprint text; v_fingerprint text; v_event_id uuid; v_acceptance_id uuid;
  v_previous public.accounting_foundation_events%ROWTYPE; v_trial_balance jsonb;
  v_complete boolean; v_generated_at timestamptz; v_debit numeric; v_credit numeric;
BEGIN
  IF p_actor_user_id IS NULL OR p_package_id IS NULL OR p_package_version IS NULL
     OR p_package_version<1 OR p_request_id IS NULL OR length(btrim(coalesce(p_reason,'')))=0 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_inception')
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:view') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.profile_id,p.current_version,pv.payload,pv.cutover_boundary_date,pv.created_by
    INTO v_profile_id,v_current_version,v_payload,v_cutover,v_creator
  FROM public.accounting_inception_packages p
  JOIN public.accounting_inception_package_versions pv
    ON pv.profile_id=p.profile_id AND pv.package_id=p.id AND pv.version=p.current_version
  WHERE p.id=p_package_id FOR UPDATE OF p;
  IF NOT FOUND THEN RETURN QUERY SELECT 'package_not_found'::text,NULL::uuid,NULL::jsonb,false; RETURN; END IF;
  IF v_current_version<>p_package_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;
  v_error:=public.validate_accounting_inception_payload(v_profile_id,v_payload);
  IF v_error IS NOT NULL THEN RETURN QUERY SELECT v_error,NULL::uuid,NULL::jsonb,false; RETURN; END IF;
  SELECT r.reviewer_user_id,r.decision INTO v_reviewer,v_decision
  FROM public.accounting_inception_reviews r
  WHERE r.profile_id=v_profile_id AND r.package_id=p_package_id
    AND r.package_version=p_package_version;
  IF NOT FOUND OR v_decision<>'APPROVE' OR v_reviewer=v_creator
     OR p_actor_user_id<>v_reviewer THEN
    RETURN QUERY SELECT 'review_required'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_payload->'items') i
    WHERE i->>'classification'='UNRESOLVED' OR i->>'resolution_state'<>'RESOLVED') THEN
    RETURN QUERY SELECT 'unresolved_material_evidence'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(v_payload->'items') i
    WHERE i->>'classification' IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE')) THEN
    RETURN QUERY SELECT 'incomplete_coverage'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_payload->'items') i
    WHERE i->>'classification' IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE')
      AND NOT EXISTS(
        SELECT 1 FROM public.accounting_inception_journal_links l
        JOIN public.accounting_journals j
          ON j.profile_id=l.profile_id AND j.id=l.journal_id
        JOIN public.accounting_journal_versions jv
          ON jv.profile_id=j.profile_id AND jv.journal_id=j.id AND jv.version=j.current_version
        WHERE l.profile_id=v_profile_id AND l.package_id=p_package_id
          AND l.package_version=p_package_version AND l.item_id=(i->>'item_id')::uuid
          AND jv.status='POSTED' AND jv.source_domain='INCEPTION'
          AND jv.accounting_date<=v_cutover
      )
  ) THEN RETURN QUERY SELECT 'incomplete_coverage'::text,NULL::uuid,NULL::jsonb,false; RETURN; END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_journal_versions jv
      WHERE jv.profile_id=v_profile_id AND jv.status='POSTED'
        AND jv.accounting_date<=v_cutover AND jv.source_domain<>'INCEPTION') THEN
    RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_journal_versions jv
      WHERE jv.profile_id=v_profile_id AND jv.status='POSTED'
        AND jv.accounting_date<=v_cutover AND jv.source_domain='INCEPTION'
        AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_journal_links l
          WHERE l.profile_id=jv.profile_id AND l.journal_id=jv.journal_id
            AND l.package_id=p_package_id AND l.package_version=p_package_version)) THEN
    RETURN QUERY SELECT 'unsupported_source'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10b-profile:'||v_profile_id::text,0));
  v_request_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'package_id',p_package_id,'package_version',p_package_version,'reason',btrim(p_reason)
  )::text,'UTF8'),'sha256'),'hex');
  SELECT e.* INTO v_previous FROM public.accounting_foundation_events e
    WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id
      AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.payload_fingerprint<>v_request_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::jsonb,false; RETURN;
    END IF;
    SELECT a.id,a.trial_balance INTO v_acceptance_id,v_trial_balance
      FROM public.accounting_inception_acceptances a WHERE a.foundation_event_id=v_previous.id;
    RETURN QUERY SELECT NULL::text,v_acceptance_id,v_trial_balance,true; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_inception_acceptances a
    WHERE a.profile_id=v_profile_id AND a.package_id=p_package_id) THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;
  SELECT report,is_complete,generated_at INTO v_trial_balance,v_complete,v_generated_at
  FROM public.get_accounting_trial_balance(p_actor_user_id,v_cutover,clock_timestamp(),NULL,0,500);
  IF NOT coalesce(v_complete,false)
     OR coalesce((v_trial_balance->>'account_count')::integer,0)<1
     OR coalesce((v_trial_balance->>'debits_equal_credits')::boolean,false) IS NOT TRUE THEN
    RETURN QUERY SELECT 'trial_balance_incomplete'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;
  v_debit:=(v_trial_balance->>'debit_balance_total_halalah')::numeric;
  v_credit:=(v_trial_balance->>'credit_balance_total_halalah')::numeric;
  IF v_debit<>v_credit THEN
    RETURN QUERY SELECT 'journal_unbalanced'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  END IF;
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'request_fingerprint',v_request_fingerprint,'trial_balance',v_trial_balance
  )::text,'UTF8'),'sha256'),'hex');
  v_acceptance_id:=gen_random_uuid(); v_event_id:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(v_event_id,v_profile_id,'accounting_inception_package_accepted',
    'accounting_inception_acceptance',v_acceptance_id,1,p_actor_user_id,p_request_id,
    btrim(p_reason),NULL,v_request_fingerprint,
    'accounting_inception_acceptances/'||v_acceptance_id,clock_timestamp());
  INSERT INTO public.accounting_inception_acceptances(
    id,profile_id,package_id,package_version,accepted_by,as_of_date,recorded_at_cutoff,
    trial_balance,payload_fingerprint,foundation_event_id
  ) VALUES(v_acceptance_id,v_profile_id,p_package_id,p_package_version,p_actor_user_id,
    v_cutover,(v_trial_balance->>'recorded_at_cutoff')::timestamptz,
    v_trial_balance,v_fingerprint,v_event_id);
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES('accept','accounting_inception_package',p_package_id,p_actor_user_id::text,
    jsonb_build_object('request_id',p_request_id,'package_version',p_package_version,
      'acceptance_id',v_acceptance_id,'as_of_date',v_cutover,
      'trial_balance_fingerprint',v_fingerprint),clock_timestamp());
  RETURN QUERY SELECT NULL::text,v_acceptance_id,v_trial_balance,false;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  WHEN invalid_text_representation OR datetime_field_overflow THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::jsonb,false; RETURN;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::jsonb,false; RETURN;
END;
$accept_inception_package$;

DO $w10c_engine_patch$
DECLARE
  v_function oid; v_source text; v_repaired text; v_old text; v_new text;
BEGIN
  v_function:=to_regprocedure('public.validate_accounting_posting_rule_mapping()');
  SELECT p.prosrc INTO v_source FROM pg_catalog.pg_proc p
    WHERE p.oid=v_function AND p.prosecdef AND p.provolatile='v'
      AND p.proconfig @> ARRAY['search_path=pg_catalog, public'];
  v_old:='OR v_account.is_protected OR v_account.control_classification<>''NONE''';
  v_new:='OR ((v_account.is_protected OR v_account.control_classification<>''NONE'')'
    ||' AND NOT public.accounting_inception_mapping_authorized(NEW.profile_id,'
    ||'NEW.posting_rule_id,NEW.rule_version,NEW.mapping_key,NEW.account_id,NEW.account_version))';
  IF v_source IS NULL OR length(v_source)-length(replace(v_source,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10C preflight: posting-rule mapping validator source differs';
  END IF;
  v_repaired:=replace(v_source,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.validate_accounting_posting_rule_mapping()
    RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);

  v_function:=to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)');
  SELECT p.prosrc INTO v_source FROM pg_catalog.pg_proc p
    WHERE p.oid=v_function AND p.prosecdef AND p.provolatile='v'
      AND p.proconfig @> ARRAY['search_path=pg_catalog, public'];
  v_old:=$keys$(SELECT count(*) FROM jsonb_object_keys(p_journal))<>11$keys$;
  v_new:=$keys$(SELECT count(*) FROM jsonb_object_keys(p_journal)) NOT IN (11,12)
      OR ((SELECT count(*) FROM jsonb_object_keys(p_journal))=11 AND p_journal ? 'source_domain')
      OR ((SELECT count(*) FROM jsonb_object_keys(p_journal))=12 AND p_journal->>'source_domain' IS DISTINCT FROM 'INCEPTION')$keys$;
  IF v_source IS NULL OR length(v_source)-length(replace(v_source,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10C preflight: journal prepare key validation source differs';
  END IF;
  v_repaired:=replace(v_source,v_old,v_new);
  v_old:='  v_source_record text; v_economic_event text; v_purpose text;';
  v_new:='  v_source_record text; v_economic_event text; v_purpose text;'||E'\n'
    ||'  v_source_domain text;';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10C preflight: journal prepare declaration source differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:=$auth$
  IF NOT EXISTS(SELECT 1 FROM public.app_users u
    WHERE u.id=p_actor_user_id AND u.is_active IS TRUE) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:prepare_journal') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  $auth$;
  v_new:=$auth$
  IF NOT EXISTS(SELECT 1 FROM public.app_users u
    WHERE u.id=p_actor_user_id AND u.is_active IS TRUE) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  v_source_domain:=coalesce(p_journal->>'source_domain',concat('CONTROLLED_','MANUAL'));
  IF v_source_domain NOT IN (concat('CONTROLLED_','MANUAL'),'INCEPTION') THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_source_domain='INCEPTION'
     AND NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_inception') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:prepare_journal') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  $auth$;
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10C preflight: journal prepare authority source differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:=$source_key$  v_purpose:=btrim(p_journal->>'posting_purpose');$source_key$;
  v_new:=$source_key$
  v_purpose:=btrim(p_journal->>'posting_purpose');
  IF v_source_domain<>'INCEPTION' AND EXISTS(
      SELECT 1 FROM public.accounting_inception_coverage c
      JOIN public.accounting_inception_coverage_versions cv
        ON cv.profile_id=c.profile_id AND cv.coverage_id=c.id AND cv.version=c.current_version
      WHERE c.profile_id=v_profile_id AND c.source_record_key=v_source_record
        AND c.economic_event_key=v_economic_event
        AND cv.classification IN ('RECONSTRUCTED_HISTORY','OPENING_BALANCE','UNRESOLVED')
    ) THEN
    RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  $source_key$;
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10C preflight: journal prepare source coverage guard differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  v_old:='''CONTROLLED_MANUAL''';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>5*length(v_old) THEN
    RAISE EXCEPTION 'W10C preflight: journal prepare source-domain sites differ';
  END IF;
  v_repaired:=replace(v_repaired,v_old,'v_source_domain');
  v_old:='AND NOT av.is_protected AND av.control_classification=''NONE''';
  v_new:='AND ((v_source_domain=''CONTROLLED_MANUAL'' AND NOT av.is_protected'
    ||' AND av.control_classification=''NONE'') OR (v_source_domain=''INCEPTION'' AND'
    ||' public.accounting_inception_journal_line_authorized(v_profile_id,p_journal,'
    ||'v_line_number,v_mapping.mapping_key,v_mapping.account_id,v_mapping.account_version,p_actor_user_id)))';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10C preflight: journal prepare account gate differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  IF position('v_source_domain' in v_repaired)=0
     OR position('accounting_inception_journal_line_authorized' in v_repaired)=0
     OR position('v_source_domain=''INCEPTION''' in v_repaired)=0
     OR position('accounting:manage_inception' in v_repaired)=0 THEN
    RAISE EXCEPTION 'W10C preflight: journal prepare extension was incomplete';
  END IF;
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.prepare_accounting_journal(
    p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_journal jsonb,
    p_reason text,p_evidence_ref text,p_request_id uuid
  ) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);

  v_function:=to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)');
  SELECT p.prosrc INTO v_source FROM pg_catalog.pg_proc p
    WHERE p.oid=v_function AND p.prosecdef AND p.provolatile='v'
      AND p.proconfig @> ARRAY['search_path=pg_catalog, public'];
  v_old:='  IF v_header.status=''POSTED'' THEN';
  v_new:=$post_guard$
  IF v_header.source_domain='INCEPTION' AND (
       NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_inception')
       OR NOT public.accounting_inception_journal_link_authorized(
         v_profile_id,p_journal_id,v_header.version,v_header.prepared_by)
     ) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_INCEPTION_JOURNAL_NOT_AUTHORIZED';
  END IF;
  IF v_header.status='POSTED' THEN
  $post_guard$;
  IF v_source IS NULL OR length(v_source)-length(replace(v_source,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10C preflight: journal post authority source differs';
  END IF;
  v_repaired:=replace(v_source,v_old,v_new);
  v_old:='OR NOT av.is_active OR av.is_protected OR av.control_classification<>''NONE''';
  v_new:='OR NOT av.is_active OR ((av.is_protected OR av.control_classification<>''NONE'')'
    ||' AND v_header.source_domain<>''INCEPTION'')';
  IF length(v_repaired)-length(replace(v_repaired,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10C preflight: journal post account gate differs';
  END IF;
  v_repaired:=replace(v_repaired,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.post_accounting_journal(
    p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid
  ) RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);

  v_function:=to_regprocedure('public.reverse_accounting_journal(uuid,uuid,uuid,date,text,text,uuid)');
  SELECT p.prosrc INTO v_source FROM pg_catalog.pg_proc p
    WHERE p.oid=v_function AND p.prosecdef AND p.provolatile='v'
      AND p.proconfig @> ARRAY['search_path=pg_catalog, public'];
  v_old:='IF NOT FOUND OR v_original.status<>''POSTED'' OR v_original_identity.reversal_of_journal_id IS NOT NULL THEN';
  v_new:='IF NOT FOUND OR v_original.status<>''POSTED'' OR v_original_identity.reversal_of_journal_id IS NOT NULL'
    ||' OR v_original.source_domain=''INCEPTION'' THEN';
  IF v_source IS NULL OR length(v_source)-length(replace(v_source,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10C preflight: journal reversal source differs';
  END IF;
  v_repaired:=replace(v_source,v_old,v_new);
  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.reverse_accounting_journal(
    p_actor_user_id uuid,p_original_journal_id uuid,p_period_id uuid,p_accounting_date date,
    p_reason text,p_evidence_ref text,p_request_id uuid
  ) RETURNS TABLE(error_code text,journal_id uuid,version integer,original_journal_id uuid,idempotent_replay boolean)
    LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);
END;
$w10c_engine_patch$;

REVOKE ALL ON FUNCTION public.guard_accounting_inception_identity() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_accounting_inception_package_version() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_accounting_inception_coverage_version() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prevent_accounting_inception_source_replay() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.validate_accounting_inception_payload(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_inception_mapping_authorized(uuid,uuid,integer,text,uuid,integer)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_inception_journal_line_authorized(uuid,jsonb,integer,text,uuid,integer,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_inception_journal_link_authorized(uuid,uuid,integer,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_accounting_inception_package(uuid,uuid,integer,jsonb,text,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.review_accounting_inception_package(uuid,uuid,integer,boolean,text,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prepare_accounting_inception_journal(uuid,uuid,integer,uuid,text,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.post_accounting_inception_journal(uuid,uuid,integer,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accept_accounting_inception_package(uuid,uuid,integer,text,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_accounting_inception_package(uuid,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.list_accounting_inception_packages(uuid)
  FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.save_accounting_inception_package(uuid,uuid,integer,jsonb,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_accounting_inception_package(uuid,uuid,integer,boolean,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_accounting_inception_journal(uuid,uuid,integer,uuid,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_accounting_inception_journal(uuid,uuid,integer,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_accounting_inception_package(uuid,uuid,integer,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_inception_package(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_accounting_inception_packages(uuid) TO service_role;

COMMIT;
