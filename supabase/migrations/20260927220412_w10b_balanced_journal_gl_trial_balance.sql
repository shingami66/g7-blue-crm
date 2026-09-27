-- W10B: bounded balanced journal core and posted-only GL / Trial Balance inspection.
-- No chart, period, posting rule, journal, source adapter, or authority is seeded.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL
     OR to_regclass('public.accounting_profile_versions') IS NULL
     OR to_regclass('public.accounting_accounts') IS NULL
     OR to_regclass('public.accounting_account_versions') IS NULL
     OR to_regclass('public.accounting_periods') IS NULL
     OR to_regclass('public.accounting_period_versions') IS NULL
     OR to_regclass('public.accounting_capability_catalog') IS NULL
     OR to_regclass('public.accounting_foundation_events') IS NULL
     OR to_regclass('public.audit_logs') IS NULL THEN
    RAISE EXCEPTION 'w10b preflight: W10A accounting foundation is missing';
  END IF;
  IF to_regclass('public.accounting_posting_rules') IS NOT NULL
     OR to_regclass('public.accounting_journals') IS NOT NULL
     OR to_regclass('public.accounting_source_effects') IS NOT NULL THEN
    RAISE EXCEPTION 'w10b preflight: W10B target objects already exist';
  END IF;
  IF to_regprocedure('public.save_accounting_posting_rule(uuid,uuid,integer,jsonb,text,text,uuid)') IS NOT NULL
     OR to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)') IS NOT NULL
     OR to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)') IS NOT NULL
     OR to_regprocedure('public.reverse_accounting_journal(uuid,uuid,uuid,date,text,text,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'w10b preflight: W10B target RPC already exists';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
    WHERE capability='accounting:prepare_journal' AND NOT enabled
      AND NOT runtime_allow_grantable AND owner_slice='W10B')
     OR NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
    WHERE capability='accounting:post_journal' AND NOT enabled
      AND NOT runtime_allow_grantable AND owner_slice='W10B')
     OR NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
    WHERE capability='accounting:reverse_journal' AND NOT enabled
      AND NOT runtime_allow_grantable AND owner_slice='W10B') THEN
    RAISE EXCEPTION 'w10b preflight: W10B capability baseline differs';
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
    'accounting_journal_prepared','accounting_journal_posted',
    'accounting_journal_reversed'
  )),
  ADD CONSTRAINT accounting_foundation_events_entity_type_check CHECK (entity_type IN (
    'capability_assignment','accounting_profile','accounting_account','accounting_period',
    'accounting_posting_rule','accounting_journal'
  ));

ALTER TABLE public.accounting_period_versions
  DROP CONSTRAINT accounting_period_versions_status_check,
  ADD CONSTRAINT accounting_period_versions_status_check
    CHECK (status IN ('OPEN','CLOSED','LOCKED'));

CREATE OR REPLACE FUNCTION public.validate_accounting_period_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $validate_period$
DECLARE
  v_identity public.accounting_periods%ROWTYPE;
  v_event public.accounting_foundation_events%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10a2a-period:'||NEW.profile_id::text,0)
  );
  IF TG_OP<>'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_PERIOD_VERSION_APPEND_ONLY';
  END IF;
  IF NOT isfinite(NEW.start_date) OR NOT isfinite(NEW.end_date)
     OR NEW.end_date<NEW.start_date
     OR NEW.status NOT IN ('OPEN','CLOSED','LOCKED') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_BOUNDARY_INVALID';
  END IF;
  SELECT * INTO v_identity FROM public.accounting_periods p
    WHERE p.profile_id=NEW.profile_id AND p.id=NEW.period_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='ACCOUNTING_PERIOD_IDENTITY_NOT_FOUND';
  END IF;
  IF NEW.version=1 THEN
    IF NEW.previous_version IS NOT NULL OR v_identity.current_version<>0 THEN
      RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_PERIOD_REVISION_CONFLICT';
    END IF;
  ELSE
    IF NEW.previous_version<>NEW.version-1
       OR v_identity.current_version<>NEW.previous_version
       OR NOT EXISTS (
         SELECT 1 FROM public.accounting_period_versions prior
         WHERE prior.profile_id=NEW.profile_id AND prior.period_id=NEW.period_id
           AND prior.version=NEW.previous_version
       ) THEN
      RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_PERIOD_REVISION_CONFLICT';
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.accounting_periods p
    JOIN public.accounting_period_versions v
      ON v.profile_id=p.profile_id AND v.period_id=p.id AND v.version=p.current_version
    WHERE p.profile_id=NEW.profile_id AND p.id<>NEW.period_id
      AND NEW.start_date<=v.end_date AND NEW.end_date>=v.start_date
  ) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_OVERLAP';
  END IF;
  SELECT * INTO v_event FROM public.accounting_foundation_events e
    WHERE e.id=NEW.foundation_event_id;
  IF NOT FOUND OR v_event.profile_id IS DISTINCT FROM NEW.profile_id
     OR v_event.entity_type IS DISTINCT FROM 'accounting_period'
     OR v_event.entity_id IS DISTINCT FROM NEW.period_id
     OR v_event.entity_version IS DISTINCT FROM NEW.version
     OR v_event.actor_user_id IS DISTINCT FROM NEW.created_by
     OR (NEW.version<>1 AND v_event.event_type IS DISTINCT FROM 'accounting_period_updated')
     OR (NEW.version=1 AND v_event.event_type IS DISTINCT FROM 'accounting_period_created') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_EVENT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$validate_period$;

ALTER TABLE public.accounting_capability_catalog
  DROP CONSTRAINT accounting_capability_catalog_state_check;

UPDATE public.accounting_capability_catalog
SET enabled=true,runtime_allow_grantable=true
WHERE capability IN ('accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal')
  AND owner_slice='W10B';

ALTER TABLE public.accounting_capability_catalog
  ADD CONSTRAINT accounting_capability_catalog_state_check CHECK (
    (capability IN ('accounting:view','accounting:manage_profile')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_authority'
      AND enabled AND NOT runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability IN ('accounting:manage_chart','accounting:manage_periods')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability IN ('accounting:prepare_journal','accounting:post_journal',
      'accounting:reverse_journal') AND enabled AND runtime_allow_grantable AND owner_slice='W10B')
    OR (capability='accounting:reconcile_bank'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10G')
    OR (capability IN ('accounting:close_period','accounting:reopen_period')
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I')
    OR (capability='accounting:view_statements'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10H')
  );

CREATE TABLE public.accounting_posting_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  rule_code text NOT NULL CHECK (rule_code ~ '^[A-Z][A-Z0-9_]{1,39}$'),
  current_version integer NOT NULL DEFAULT 0 CHECK (current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id),
  UNIQUE(profile_id,rule_code)
);

CREATE TABLE public.accounting_posting_rule_versions (
  profile_id uuid NOT NULL,
  posting_rule_id uuid NOT NULL,
  version integer NOT NULL CHECK(version>0),
  previous_version integer,
  name_en text NOT NULL CHECK(length(btrim(name_en)) BETWEEN 1 AND 160),
  name_ar text NOT NULL CHECK(length(btrim(name_ar)) BETWEEN 1 AND 160),
  is_active boolean NOT NULL,
  effective_from timestamptz NOT NULL,
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  evidence_ref text CHECK(evidence_ref IS NULL OR length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  PRIMARY KEY(profile_id,posting_rule_id,version),
  FOREIGN KEY(profile_id,posting_rule_id)
    REFERENCES public.accounting_posting_rules(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,posting_rule_id,previous_version)
    REFERENCES public.accounting_posting_rule_versions(profile_id,posting_rule_id,version) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id)
);

ALTER TABLE public.accounting_posting_rules
  ADD CONSTRAINT accounting_posting_rules_current_version_fkey
  FOREIGN KEY(profile_id,id,current_version)
  REFERENCES public.accounting_posting_rule_versions(profile_id,posting_rule_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_posting_rule_mappings (
  profile_id uuid NOT NULL,
  posting_rule_id uuid NOT NULL,
  rule_version integer NOT NULL,
  mapping_key text NOT NULL CHECK(mapping_key ~ '^[a-z][a-z0-9_]{0,39}$'),
  account_id uuid NOT NULL,
  account_version integer NOT NULL,
  allowed_side text NOT NULL CHECK(allowed_side IN ('DEBIT','CREDIT','EITHER')),
  service_requirement text NOT NULL CHECK(service_requirement IN ('REQUIRED','OPTIONAL','FORBIDDEN')),
  PRIMARY KEY(profile_id,posting_rule_id,rule_version,mapping_key),
  FOREIGN KEY(profile_id,posting_rule_id,rule_version)
    REFERENCES public.accounting_posting_rule_versions(profile_id,posting_rule_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,account_id,account_version)
    REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT
);

CREATE TABLE public.accounting_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  correction_group_id uuid NOT NULL,
  reversal_of_journal_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id),
  FOREIGN KEY(profile_id,reversal_of_journal_id)
    REFERENCES public.accounting_journals(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,correction_group_id)
    REFERENCES public.accounting_journals(profile_id,id) ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED,
  UNIQUE(profile_id,reversal_of_journal_id)
);

CREATE TABLE public.accounting_journal_versions (
  profile_id uuid NOT NULL,
  journal_id uuid NOT NULL,
  version integer NOT NULL CHECK(version>0),
  previous_version integer,
  status text NOT NULL CHECK(status IN ('DRAFT','POSTED')),
  profile_version integer NOT NULL,
  period_id uuid NOT NULL,
  period_version integer NOT NULL,
  accounting_date date NOT NULL,
  posting_rule_id uuid NOT NULL,
  rule_version integer NOT NULL,
  source_domain text NOT NULL DEFAULT 'CONTROLLED_MANUAL' CHECK(source_domain='CONTROLLED_MANUAL'),
  source_record_key text NOT NULL CHECK(length(btrim(source_record_key)) BETWEEN 1 AND 200),
  economic_event_key text NOT NULL CHECK(length(btrim(economic_event_key)) BETWEEN 1 AND 200),
  posting_purpose text NOT NULL CHECK(length(btrim(posting_purpose)) BETWEEN 1 AND 80),
  description_en text NOT NULL CHECK(length(btrim(description_en)) BETWEEN 1 AND 500),
  description_ar text NOT NULL CHECK(length(btrim(description_ar)) BETWEEN 1 AND 500),
  currency text NOT NULL DEFAULT 'SAR' CHECK(currency='SAR'),
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  evidence_ref text CHECK(evidence_ref IS NULL OR length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  prepared_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  prepared_at timestamptz NOT NULL,
  posted_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  posted_at timestamptz,
  reversal_of_journal_id uuid,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,journal_id,version),
  FOREIGN KEY(profile_id,journal_id)
    REFERENCES public.accounting_journals(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,journal_id,previous_version)
    REFERENCES public.accounting_journal_versions(profile_id,journal_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,period_id,period_version)
    REFERENCES public.accounting_period_versions(profile_id,period_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,posting_rule_id,rule_version)
    REFERENCES public.accounting_posting_rule_versions(profile_id,posting_rule_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,reversal_of_journal_id)
    REFERENCES public.accounting_journals(profile_id,id) ON DELETE RESTRICT,
  UNIQUE(foundation_event_id),
  CHECK((status='DRAFT' AND posted_by IS NULL AND posted_at IS NULL)
     OR (status='POSTED' AND posted_by IS NOT NULL AND posted_at IS NOT NULL))
);

ALTER TABLE public.accounting_journals
  ADD CONSTRAINT accounting_journals_current_version_fkey
  FOREIGN KEY(profile_id,id,current_version)
  REFERENCES public.accounting_journal_versions(profile_id,journal_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_journal_line_versions (
  profile_id uuid NOT NULL,
  journal_id uuid NOT NULL,
  journal_version integer NOT NULL,
  line_number integer NOT NULL CHECK(line_number BETWEEN 1 AND 200),
  posting_rule_id uuid NOT NULL,
  rule_version integer NOT NULL,
  mapping_key text NOT NULL,
  account_id uuid NOT NULL,
  account_version integer NOT NULL,
  account_code_snapshot text NOT NULL,
  account_name_en_snapshot text NOT NULL,
  account_name_ar_snapshot text NOT NULL,
  account_type_snapshot text NOT NULL CHECK(account_type_snapshot IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  normal_balance_snapshot text NOT NULL CHECK(normal_balance_snapshot IN ('DEBIT','CREDIT')),
  side text NOT NULL CHECK(side IN ('DEBIT','CREDIT')),
  amount_halalah bigint NOT NULL CHECK(amount_halalah>0),
  service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  service_number_snapshot text,
  event_name_snapshot text,
  event_type_snapshot text,
  event_start_date_snapshot date,
  event_end_date_snapshot date,
  description_en text NOT NULL CHECK(length(btrim(description_en)) BETWEEN 1 AND 500),
  description_ar text NOT NULL CHECK(length(btrim(description_ar)) BETWEEN 1 AND 500),
  PRIMARY KEY(profile_id,journal_id,journal_version,line_number),
  FOREIGN KEY(profile_id,journal_id,journal_version)
    REFERENCES public.accounting_journal_versions(profile_id,journal_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,account_id,account_version)
    REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,posting_rule_id,rule_version,mapping_key)
    REFERENCES public.accounting_posting_rule_mappings(profile_id,posting_rule_id,rule_version,mapping_key) ON DELETE RESTRICT,
  CHECK((service_id IS NULL AND service_number_snapshot IS NULL AND event_name_snapshot IS NULL
      AND event_type_snapshot IS NULL AND event_start_date_snapshot IS NULL AND event_end_date_snapshot IS NULL)
     OR (service_id IS NOT NULL AND service_number_snapshot IS NOT NULL))
);

CREATE TABLE public.accounting_source_effects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  source_domain text NOT NULL CHECK(source_domain='CONTROLLED_MANUAL'),
  source_record_key text NOT NULL,
  economic_event_key text NOT NULL,
  posting_purpose text NOT NULL,
  journal_id uuid NOT NULL,
  journal_version integer NOT NULL,
  status text NOT NULL CHECK(status IN ('PREPARED','POSTED')),
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,source_domain,source_record_key,economic_event_key,posting_purpose),
  UNIQUE(profile_id,journal_id),
  FOREIGN KEY(profile_id,journal_id,journal_version)
    REFERENCES public.accounting_journal_versions(profile_id,journal_id,version) ON DELETE RESTRICT
);

CREATE TABLE public.accounting_journal_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK(event_type IN (
    'RULE_SAVED','JOURNAL_PREPARED','JOURNAL_POSTED','JOURNAL_REVERSED'
  )),
  operation text NOT NULL CHECK(operation IN ('SAVE_RULE','PREPARE','POST','REVERSE')),
  journal_id uuid,
  posting_rule_id uuid,
  entity_version integer NOT NULL CHECK(entity_version>0),
  actor_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  payload_fingerprint text NOT NULL CHECK(payload_fingerprint ~ '^[0-9a-f]{64}$'),
  idempotent_replay boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(profile_id,journal_id) REFERENCES public.accounting_journals(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,posting_rule_id) REFERENCES public.accounting_posting_rules(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,journal_id,entity_version)
    REFERENCES public.accounting_journal_versions(profile_id,journal_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,posting_rule_id,entity_version)
    REFERENCES public.accounting_posting_rule_versions(profile_id,posting_rule_id,version) ON DELETE RESTRICT,
  UNIQUE(profile_id,actor_user_id,operation,request_id),
  CHECK((journal_id IS NOT NULL AND posting_rule_id IS NULL)
     OR (journal_id IS NULL AND posting_rule_id IS NOT NULL))
);

CREATE INDEX accounting_journal_versions_report_idx
  ON public.accounting_journal_versions(profile_id,status,accounting_date,posted_at);
CREATE INDEX accounting_journal_lines_account_idx
  ON public.accounting_journal_line_versions(profile_id,account_id,journal_id,journal_version)
  INCLUDE(side,amount_halalah);
CREATE INDEX accounting_journal_lines_service_idx
  ON public.accounting_journal_line_versions(profile_id,service_id,journal_id,journal_version);
CREATE INDEX accounting_source_effects_journal_idx
  ON public.accounting_source_effects(profile_id,journal_id,status);

CREATE FUNCTION public.guard_accounting_w10b_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $guard_identity$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_IDENTITY_IMMUTABLE';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.current_version<>0 THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_IDENTITY_INITIAL_VERSION_INVALID';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.profile_id IS DISTINCT FROM NEW.profile_id
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
     OR NEW.current_version<>OLD.current_version+1 THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_IDENTITY_REVISION_INVALID';
  END IF;
  IF TG_TABLE_NAME='accounting_posting_rules'
     AND OLD.rule_code IS DISTINCT FROM NEW.rule_code THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_IDENTITY_IMMUTABLE';
  END IF;
  IF TG_TABLE_NAME='accounting_journals'
     AND (OLD.correction_group_id IS DISTINCT FROM NEW.correction_group_id
       OR OLD.reversal_of_journal_id IS DISTINCT FROM NEW.reversal_of_journal_id) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_IDENTITY_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$guard_identity$;

CREATE FUNCTION public.validate_accounting_posting_rule_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $validate_rule$
DECLARE
  v_identity public.accounting_posting_rules%ROWTYPE;
  v_event public.accounting_foundation_events%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_RULE_VERSION_APPEND_ONLY';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10a2a-chart:'||NEW.profile_id::text,0)
  );
  SELECT * INTO v_identity FROM public.accounting_posting_rules r
   WHERE r.profile_id=NEW.profile_id AND r.id=NEW.posting_rule_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='ACCOUNTING_RULE_IDENTITY_NOT_FOUND';
  END IF;
  IF (NEW.version=1 AND (NEW.previous_version IS NOT NULL OR v_identity.current_version<>0))
     OR (NEW.version>1 AND (NEW.previous_version<>NEW.version-1
       OR v_identity.current_version<>NEW.previous_version
       OR NOT EXISTS(SELECT 1 FROM public.accounting_posting_rule_versions prior
        WHERE prior.profile_id=NEW.profile_id AND prior.posting_rule_id=NEW.posting_rule_id
          AND prior.version=NEW.previous_version))) THEN
    RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_RULE_REVISION_CONFLICT';
  END IF;
  SELECT * INTO v_event FROM public.accounting_foundation_events e
   WHERE e.id=NEW.foundation_event_id;
  IF NOT FOUND OR v_event.profile_id IS DISTINCT FROM NEW.profile_id
     OR v_event.entity_type IS DISTINCT FROM 'accounting_posting_rule'
     OR v_event.entity_id IS DISTINCT FROM NEW.posting_rule_id
     OR v_event.entity_version IS DISTINCT FROM NEW.version
     OR v_event.actor_user_id IS DISTINCT FROM NEW.created_by
     OR (NEW.version=1 AND v_event.event_type IS DISTINCT FROM 'accounting_posting_rule_created')
     OR (NEW.version>1 AND v_event.event_type IS DISTINCT FROM 'accounting_posting_rule_updated') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_RULE_EVENT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$validate_rule$;

CREATE FUNCTION public.validate_accounting_posting_rule_mapping()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $validate_mapping$
DECLARE v_account public.accounting_account_versions%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_RULE_MAPPING_APPEND_ONLY';
  END IF;
  SELECT av.* INTO v_account
  FROM public.accounting_accounts a
  JOIN public.accounting_account_versions av
    ON av.profile_id=a.profile_id AND av.account_id=a.id AND av.version=a.current_version
  WHERE a.profile_id=NEW.profile_id AND a.id=NEW.account_id
    AND av.version=NEW.account_version;
  IF NOT FOUND OR v_account.account_kind<>'POSTING' OR NOT v_account.is_active
     OR v_account.is_protected OR v_account.control_classification<>'NONE'
     OR EXISTS (
       SELECT 1 FROM public.accounting_accounts child
       JOIN public.accounting_account_versions cv
         ON cv.profile_id=child.profile_id AND cv.account_id=child.id
          AND cv.version=child.current_version
       WHERE child.profile_id=NEW.profile_id AND cv.parent_account_id=NEW.account_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_RULE_MAPPING_INVALID';
  END IF;
  RETURN NEW;
END;
$validate_mapping$;

CREATE FUNCTION public.validate_accounting_journal_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $validate_journal$
DECLARE
  v_identity public.accounting_journals%ROWTYPE;
  v_event public.accounting_foundation_events%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_JOURNAL_VERSION_APPEND_ONLY';
  END IF;
  SELECT * INTO v_identity FROM public.accounting_journals j
   WHERE j.profile_id=NEW.profile_id AND j.id=NEW.journal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='ACCOUNTING_JOURNAL_IDENTITY_NOT_FOUND';
  END IF;
  IF (NEW.version=1 AND (NEW.previous_version IS NOT NULL OR v_identity.current_version<>0))
     OR (NEW.version>1 AND (NEW.previous_version<>NEW.version-1
       OR v_identity.current_version<>NEW.previous_version
       OR NOT EXISTS(SELECT 1 FROM public.accounting_journal_versions prior
        WHERE prior.profile_id=NEW.profile_id AND prior.journal_id=NEW.journal_id
          AND prior.version=NEW.previous_version))) THEN
    RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_JOURNAL_REVISION_CONFLICT';
  END IF;
  SELECT * INTO v_event FROM public.accounting_foundation_events e
   WHERE e.id=NEW.foundation_event_id;
  IF NOT FOUND OR v_event.profile_id IS DISTINCT FROM NEW.profile_id
     OR v_event.entity_type IS DISTINCT FROM 'accounting_journal'
     OR v_event.entity_id IS DISTINCT FROM NEW.journal_id
     OR v_event.entity_version IS DISTINCT FROM NEW.version
     OR v_identity.reversal_of_journal_id IS DISTINCT FROM NEW.reversal_of_journal_id
     OR (NEW.status='POSTED' AND v_event.actor_user_id IS DISTINCT FROM NEW.posted_by)
     OR (NEW.status='DRAFT' AND v_event.actor_user_id IS DISTINCT FROM NEW.prepared_by)
     OR (NEW.status='DRAFT' AND v_event.event_type IS DISTINCT FROM 'accounting_journal_prepared')
     OR (NEW.status='POSTED' AND NEW.version>1
       AND v_event.event_type NOT IN ('accounting_journal_posted','accounting_journal_reversed')) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_JOURNAL_EVENT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$validate_journal$;

CREATE FUNCTION public.guard_accounting_source_effect()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $guard_effect$
BEGIN
  IF TG_OP='DELETE' OR TG_OP='TRUNCATE' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_SOURCE_EFFECT_IMMUTABLE';
  END IF;
  IF TG_OP='UPDATE' AND (
    OLD.id IS DISTINCT FROM NEW.id OR OLD.profile_id IS DISTINCT FROM NEW.profile_id
    OR OLD.source_domain IS DISTINCT FROM NEW.source_domain
    OR OLD.source_record_key IS DISTINCT FROM NEW.source_record_key
    OR OLD.economic_event_key IS DISTINCT FROM NEW.economic_event_key
    OR OLD.posting_purpose IS DISTINCT FROM NEW.posting_purpose
    OR OLD.journal_id IS DISTINCT FROM NEW.journal_id
    OR OLD.created_at IS DISTINCT FROM NEW.created_at
    OR NOT (
      (OLD.status='PREPARED' AND NEW.status='PREPARED' AND NEW.journal_version>OLD.journal_version)
      OR (OLD.status='PREPARED' AND NEW.status='POSTED' AND NEW.journal_version>=OLD.journal_version)
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_SOURCE_EFFECT_IMMUTABLE';
  END IF;
  NEW.updated_at:=clock_timestamp();
  RETURN NEW;
END;
$guard_effect$;

CREATE TRIGGER accounting_posting_rules_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_posting_rules
FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_w10b_identity();
CREATE TRIGGER accounting_posting_rules_no_truncate
BEFORE TRUNCATE ON public.accounting_posting_rules
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_posting_rule_versions_validate
BEFORE INSERT ON public.accounting_posting_rule_versions
FOR EACH ROW EXECUTE FUNCTION public.validate_accounting_posting_rule_version();
CREATE TRIGGER accounting_posting_rule_versions_immutable
BEFORE UPDATE OR DELETE ON public.accounting_posting_rule_versions
FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_posting_rule_versions_no_truncate
BEFORE TRUNCATE ON public.accounting_posting_rule_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_posting_rule_mappings_validate
BEFORE INSERT ON public.accounting_posting_rule_mappings
FOR EACH ROW EXECUTE FUNCTION public.validate_accounting_posting_rule_mapping();
CREATE TRIGGER accounting_posting_rule_mappings_immutable
BEFORE UPDATE OR DELETE ON public.accounting_posting_rule_mappings
FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_posting_rule_mappings_no_truncate
BEFORE TRUNCATE ON public.accounting_posting_rule_mappings
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_journals_guard
BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_journals
FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_w10b_identity();
CREATE TRIGGER accounting_journals_no_truncate
BEFORE TRUNCATE ON public.accounting_journals
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_journal_versions_validate
BEFORE INSERT ON public.accounting_journal_versions
FOR EACH ROW EXECUTE FUNCTION public.validate_accounting_journal_version();
CREATE TRIGGER accounting_journal_versions_immutable
BEFORE UPDATE OR DELETE ON public.accounting_journal_versions
FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_journal_versions_no_truncate
BEFORE TRUNCATE ON public.accounting_journal_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_journal_lines_immutable
BEFORE UPDATE OR DELETE ON public.accounting_journal_line_versions
FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_journal_lines_no_truncate
BEFORE TRUNCATE ON public.accounting_journal_line_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_source_effects_guard
BEFORE UPDATE OR DELETE ON public.accounting_source_effects
FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_source_effect();
CREATE TRIGGER accounting_source_effects_no_truncate
BEFORE TRUNCATE ON public.accounting_source_effects
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_journal_events_immutable
BEFORE UPDATE OR DELETE ON public.accounting_journal_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_journal_events_no_truncate
BEFORE TRUNCATE ON public.accounting_journal_events
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();

CREATE FUNCTION public.save_accounting_posting_rule(
  p_actor_user_id uuid,p_posting_rule_id uuid,p_expected_version integer,
  p_rule jsonb,p_reason text,p_evidence_ref text,p_request_id uuid
)
RETURNS TABLE(error_code text,posting_rule_id uuid,version integer,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $save_rule$
DECLARE
  v_profile_id uuid; v_profile_version integer; v_activation text;
  v_rule_id uuid; v_rule_code text; v_new_version integer; v_prior_version integer;
  v_fingerprint text; v_request_fingerprint text; v_event_id uuid; v_item jsonb;
  v_mapping_count integer:=0; v_identity public.accounting_posting_rules%ROWTYPE;
  v_previous_event public.accounting_journal_events%ROWTYPE;
BEGIN
  IF p_actor_user_id IS NULL OR p_request_id IS NULL OR p_expected_version IS NULL
     OR p_rule IS NULL OR jsonb_typeof(p_rule)<>'object'
     OR length(btrim(coalesce(p_reason,'')))=0
     OR (SELECT count(*) FROM jsonb_object_keys(p_rule))<>5
     OR NOT (p_rule ?& ARRAY['rule_code','name_en','name_ar','is_active','mappings'])
     OR jsonb_typeof(p_rule->'mappings')<>'array'
     OR jsonb_array_length(p_rule->'mappings')<2
     OR jsonb_array_length(p_rule->'mappings')>200 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u
    WHERE u.id=p_actor_user_id AND u.is_active IS TRUE) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_chart') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id,v.version,v.activation_state INTO v_profile_id,v_profile_version,v_activation
  FROM public.accounting_profiles p
  JOIN public.accounting_profile_versions v
    ON v.profile_id=p.id AND v.version=p.current_version
  WHERE p.singleton_key='g7' AND p.current_version>0;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF v_activation<>'DEV_PROVISIONAL' THEN
    RETURN QUERY SELECT 'profile_not_active'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10b-profile:'||v_profile_id::text,0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10b-request:'||v_profile_id::text||':'||
      p_actor_user_id::text||':SAVE_RULE:'||p_request_id::text,0)
  );
  v_request_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'posting_rule_id',p_posting_rule_id,'expected_version',p_expected_version,
    'rule',p_rule,'reason',btrim(p_reason),'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');
  SELECT e.* INTO v_previous_event FROM public.accounting_journal_events e
  WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id
    AND e.operation='SAVE_RULE' AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_previous_event.payload_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,v_previous_event.posting_rule_id,
      v_previous_event.entity_version,true; RETURN;
  END IF;
  v_rule_code:=upper(btrim(p_rule->>'rule_code'));
  IF v_rule_code !~ '^[A-Z][A-Z0-9_]{1,39}$'
     OR length(btrim(coalesce(p_rule->>'name_en','')))=0
     OR length(btrim(coalesce(p_rule->>'name_ar','')))=0
     OR jsonb_typeof(p_rule->'is_active')<>'boolean' THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF p_posting_rule_id IS NULL THEN
    IF p_expected_version<>0 THEN
      RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    INSERT INTO public.accounting_posting_rules(profile_id,rule_code,current_version)
      VALUES(v_profile_id,v_rule_code,0) RETURNING id INTO v_rule_id;
    v_prior_version:=NULL; v_new_version:=1;
    v_event_id:=gen_random_uuid();
    INSERT INTO public.accounting_foundation_events(
      id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
      request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
    ) VALUES (
      v_event_id,v_profile_id,'accounting_posting_rule_created','accounting_posting_rule',
      v_rule_id,v_new_version,p_actor_user_id,p_request_id,btrim(p_reason),
      NULLIF(btrim(p_evidence_ref),''),v_request_fingerprint,
      'accounting_posting_rules/'||v_rule_id::text||'/1',clock_timestamp()
    );
  ELSE
    SELECT r.* INTO v_identity FROM public.accounting_posting_rules r
      WHERE r.profile_id=v_profile_id AND r.id=p_posting_rule_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN QUERY SELECT 'posting_rule_not_found'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    IF v_identity.current_version<>p_expected_version THEN
      RETURN QUERY SELECT 'revision_conflict'::text,v_identity.id,v_identity.current_version,false; RETURN;
    END IF;
    IF v_identity.rule_code<>v_rule_code THEN
      RETURN QUERY SELECT 'source_identity_immutable'::text,v_identity.id,v_identity.current_version,false; RETURN;
    END IF;
    v_rule_id:=v_identity.id; v_prior_version:=v_identity.current_version;
    v_new_version:=v_prior_version+1; v_event_id:=gen_random_uuid();
    INSERT INTO public.accounting_foundation_events(
      id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
      request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
    ) VALUES (
      v_event_id,v_profile_id,'accounting_posting_rule_updated','accounting_posting_rule',
      v_rule_id,v_new_version,p_actor_user_id,p_request_id,btrim(p_reason),
      NULLIF(btrim(p_evidence_ref),''),v_request_fingerprint,
      'accounting_posting_rules/'||v_rule_id::text||'/'||v_new_version::text,clock_timestamp()
    );
  END IF;

  INSERT INTO public.accounting_posting_rule_versions(
    profile_id,posting_rule_id,version,previous_version,name_en,name_ar,is_active,
    effective_from,reason,evidence_ref,created_by,created_at,foundation_event_id
  ) VALUES (
    v_profile_id,v_rule_id,v_new_version,v_prior_version,btrim(p_rule->>'name_en'),
    btrim(p_rule->>'name_ar'),(p_rule->>'is_active')::boolean,clock_timestamp(),
    btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),p_actor_user_id,clock_timestamp(),v_event_id
  );

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_rule->'mappings') LOOP
    IF jsonb_typeof(v_item)<>'object'
       OR (SELECT count(*) FROM jsonb_object_keys(v_item))<>5
       OR NOT (v_item ?& ARRAY['mapping_key','account_id','account_version','allowed_side','service_requirement'])
       OR coalesce(v_item->>'mapping_key','') !~ '^[a-z][a-z0-9_]{0,39}$'
       OR coalesce(v_item->>'allowed_side','') NOT IN ('DEBIT','CREDIT','EITHER')
       OR coalesce(v_item->>'service_requirement','') NOT IN ('REQUIRED','OPTIONAL','FORBIDDEN') THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_RULE_MAPPING_INPUT_INVALID';
    END IF;
    INSERT INTO public.accounting_posting_rule_mappings(
      profile_id,posting_rule_id,rule_version,mapping_key,account_id,account_version,
      allowed_side,service_requirement
    ) VALUES (
      v_profile_id,v_rule_id,v_new_version,v_item->>'mapping_key',
      (v_item->>'account_id')::uuid,(v_item->>'account_version')::integer,
      v_item->>'allowed_side',v_item->>'service_requirement'
    );
    v_mapping_count:=v_mapping_count+1;
  END LOOP;
  IF v_mapping_count<2 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_RULE_MAPPING_INPUT_INVALID';
  END IF;
  UPDATE public.accounting_posting_rules SET current_version=v_new_version
    WHERE profile_id=v_profile_id AND id=v_rule_id;
  INSERT INTO public.accounting_journal_events(
    profile_id,event_type,operation,posting_rule_id,entity_version,actor_user_id,
    request_id,payload_fingerprint
  ) VALUES (
    v_profile_id,'RULE_SAVED','SAVE_RULE',v_rule_id,v_new_version,p_actor_user_id,
    p_request_id,v_request_fingerprint
  );
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES('save','accounting_posting_rule',v_rule_id,p_actor_user_id::text,
    jsonb_build_object('profile_id',v_profile_id,'version',v_new_version,
      'request_id',p_request_id,'rule_code',v_rule_code),clock_timestamp());
  RETURN QUERY SELECT NULL::text,v_rule_id,v_new_version,false;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'mapping_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN check_violation THEN
    IF SQLERRM='ACCOUNTING_RULE_MAPPING_INVALID' THEN
      RETURN QUERY SELECT 'mapping_invalid'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
END;
$save_rule$;

CREATE FUNCTION public.list_accounting_posting_rules(p_actor_user_id uuid)
RETURNS TABLE(
  posting_rule_id uuid,profile_id uuid,version integer,is_current boolean,previous_version integer,
  rule_code text,name_en text,name_ar text,is_active boolean,effective_from timestamptz,
  reason text,evidence_ref text,created_by uuid,created_at timestamptz,mappings jsonb
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $list_rules$
DECLARE v_profile_id uuid;
BEGIN
  IF p_actor_user_id IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE
  ) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED'; END IF;
  IF NOT (public.get_accounting_capability(p_actor_user_id,'accounting:view')
      OR public.get_accounting_capability(p_actor_user_id,'accounting:manage_chart')) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT rv.posting_rule_id,rv.profile_id,rv.version,(r.current_version=rv.version),rv.previous_version,
    r.rule_code,rv.name_en,rv.name_ar,rv.is_active,rv.effective_from,rv.reason,rv.evidence_ref,
    rv.created_by,rv.created_at,
    coalesce((SELECT jsonb_agg(jsonb_build_object(
      'mapping_key',m.mapping_key,'account_id',m.account_id,'account_version',m.account_version,
      'allowed_side',m.allowed_side,'service_requirement',m.service_requirement
    ) ORDER BY m.mapping_key) FROM public.accounting_posting_rule_mappings m
      WHERE m.profile_id=rv.profile_id AND m.posting_rule_id=rv.posting_rule_id
        AND m.rule_version=rv.version),'[]'::jsonb)
  FROM public.accounting_posting_rule_versions rv
  JOIN public.accounting_posting_rules r
    ON r.profile_id=rv.profile_id AND r.id=rv.posting_rule_id
  WHERE rv.profile_id=v_profile_id
  ORDER BY r.rule_code,rv.version;
END;
$list_rules$;

CREATE FUNCTION public.prepare_accounting_journal(
  p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,
  p_journal jsonb,p_reason text,p_evidence_ref text,p_request_id uuid
)
RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $prepare_journal$
DECLARE
  v_profile_id uuid; v_profile_version integer; v_activation text;
  v_period_id uuid; v_period_version integer; v_period_status text;
  v_period_start date; v_period_end date; v_date date;
  v_rule_id uuid; v_rule_version integer; v_journal_id uuid;
  v_version integer; v_new_version integer; v_previous integer;
  v_fingerprint text; v_request_fingerprint text; v_event_id uuid;
  v_item jsonb; v_mapping public.accounting_posting_rule_mappings%ROWTYPE;
  v_account public.accounting_account_versions%ROWTYPE;
  v_service record; v_line_number integer:=0;
  v_debits numeric:=0; v_credits numeric:=0; v_line_count integer:=0;
  v_identity public.accounting_journals%ROWTYPE;
  v_old public.accounting_journal_versions%ROWTYPE;
  v_effect public.accounting_source_effects%ROWTYPE;
  v_previous_event public.accounting_journal_events%ROWTYPE;
  v_source_record text; v_economic_event text; v_purpose text;
  v_status text; v_error text;
BEGIN
  IF p_actor_user_id IS NULL OR p_request_id IS NULL OR p_expected_version IS NULL
     OR p_journal IS NULL OR jsonb_typeof(p_journal)<>'object'
     OR (SELECT count(*) FROM jsonb_object_keys(p_journal))<>11
     OR NOT (p_journal ?& ARRAY['accounting_date','period_id','period_version',
       'posting_rule_id','rule_version','source_record_key','economic_event_key',
       'posting_purpose','description_en','description_ar','lines'])
     OR jsonb_typeof(p_journal->'lines')<>'array'
     OR jsonb_array_length(p_journal->'lines')<2
     OR jsonb_array_length(p_journal->'lines')>200
     OR length(btrim(coalesce(p_reason,'')))=0 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u
    WHERE u.id=p_actor_user_id AND u.is_active IS TRUE) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:prepare_journal') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id,v.version,v.activation_state INTO v_profile_id,v_profile_version,v_activation
  FROM public.accounting_profiles p
  JOIN public.accounting_profile_versions v
    ON v.profile_id=p.id AND v.version=p.current_version
  WHERE p.singleton_key='g7' AND p.current_version>0
    AND v.functional_currency='SAR' AND v.vat_mode='not_registered'
    AND v.zatca_state='INACTIVE' AND v.fatoora_state='INACTIVE'
  FOR SHARE OF p;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_activation<>'DEV_PROVISIONAL' THEN
    RETURN QUERY SELECT 'profile_not_active'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  v_period_id:=(p_journal->>'period_id')::uuid;
  v_period_version:=(p_journal->>'period_version')::integer;
  v_date:=(p_journal->>'accounting_date')::date;
  v_rule_id:=(p_journal->>'posting_rule_id')::uuid;
  v_rule_version:=(p_journal->>'rule_version')::integer;
  v_source_record:=btrim(p_journal->>'source_record_key');
  v_economic_event:=btrim(p_journal->>'economic_event_key');
  v_purpose:=btrim(p_journal->>'posting_purpose');
  IF v_source_record IS NULL OR length(v_source_record)>200
     OR v_economic_event IS NULL OR length(v_economic_event)>200
     OR v_purpose IS NULL OR length(v_purpose)>80
     OR length(btrim(coalesce(p_journal->>'description_en','')))=0
     OR length(btrim(coalesce(p_journal->>'description_ar','')))=0 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10b-profile:'||v_profile_id::text,0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10b-request:'||v_profile_id::text||':'||
      p_actor_user_id::text||':PREPARE:'||p_request_id::text,0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10a2a-period:'||v_profile_id::text,0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10a2a-chart:'||v_profile_id::text,0)
  );

  v_request_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'journal_id',p_journal_id,'expected_version',p_expected_version,'journal',p_journal,
    'reason',btrim(p_reason),'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'journal',p_journal,'reason',btrim(p_reason),
    'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');
  SELECT e.* INTO v_previous_event FROM public.accounting_journal_events e
  WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id
    AND e.operation='PREPARE' AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_previous_event.payload_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
    END IF;
    SELECT j.current_version,jv.status INTO v_version,v_status
    FROM public.accounting_journals j
    JOIN public.accounting_journal_versions jv
      ON jv.profile_id=j.profile_id AND jv.journal_id=j.id AND jv.version=j.current_version
    WHERE j.profile_id=v_profile_id AND j.id=v_previous_event.journal_id;
    RETURN QUERY SELECT NULL::text,v_previous_event.journal_id,v_previous_event.entity_version,
      coalesce(v_status,'DRAFT'),true; RETURN;
  END IF;

  SELECT pv.status,pv.start_date,pv.end_date INTO v_period_status,v_period_start,v_period_end
  FROM public.accounting_periods p
  JOIN public.accounting_period_versions pv
    ON pv.profile_id=p.profile_id AND pv.period_id=p.id AND pv.version=p.current_version
  WHERE p.profile_id=v_profile_id AND p.id=v_period_id
    AND pv.version=v_period_version;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'period_not_found'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_period_status<>'OPEN' THEN
    RETURN QUERY SELECT 'period_not_open'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_date<v_period_start OR v_date>v_period_end THEN
    RETURN QUERY SELECT 'period_date_mismatch'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_posting_rules r
      JOIN public.accounting_posting_rule_versions rv
        ON rv.profile_id=r.profile_id AND rv.posting_rule_id=r.id AND rv.version=r.current_version
      WHERE r.profile_id=v_profile_id AND r.id=v_rule_id AND r.current_version=v_rule_version
        AND rv.is_active AND rv.effective_from<=clock_timestamp()) THEN
    RETURN QUERY SELECT 'posting_rule_unavailable'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;

  SELECT se.* INTO v_effect FROM public.accounting_source_effects se
  WHERE se.profile_id=v_profile_id AND se.source_domain='CONTROLLED_MANUAL'
    AND se.source_record_key=v_source_record AND se.economic_event_key=v_economic_event
    AND se.posting_purpose=v_purpose;
  IF FOUND THEN
    IF p_journal_id IS NULL OR v_effect.journal_id<>p_journal_id THEN
      IF v_effect.payload_fingerprint<>v_fingerprint THEN
        RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
      END IF;
      SELECT j.current_version,jv.status INTO v_version,v_status
      FROM public.accounting_journals j
      JOIN public.accounting_journal_versions jv
        ON jv.profile_id=j.profile_id AND jv.journal_id=j.id AND jv.version=j.current_version
      WHERE j.profile_id=v_profile_id AND j.id=v_effect.journal_id;
      INSERT INTO public.accounting_journal_events(
        profile_id,event_type,operation,journal_id,entity_version,actor_user_id,
        request_id,payload_fingerprint,idempotent_replay
      ) VALUES(v_profile_id,'JOURNAL_PREPARED','PREPARE',v_effect.journal_id,
        v_version,p_actor_user_id,p_request_id,v_request_fingerprint,true);
      RETURN QUERY SELECT NULL::text,v_effect.journal_id,v_version,v_status,true; RETURN;
    END IF;
    IF v_effect.status='POSTED' THEN
      RETURN QUERY SELECT 'journal_not_draft'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
    END IF;
  END IF;

  IF p_journal_id IS NULL THEN
    IF p_expected_version<>0 THEN
      RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
    END IF;
    IF v_effect.id IS NOT NULL THEN
      IF v_effect.payload_fingerprint<>v_fingerprint THEN
        RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
      END IF;
      SELECT j.current_version,jv.status INTO v_version,v_status
      FROM public.accounting_journals j
      JOIN public.accounting_journal_versions jv
        ON jv.profile_id=j.profile_id AND jv.journal_id=j.id AND jv.version=j.current_version
      WHERE j.profile_id=v_profile_id AND j.id=v_effect.journal_id;
      INSERT INTO public.accounting_journal_events(
        profile_id,event_type,operation,journal_id,entity_version,actor_user_id,
        request_id,payload_fingerprint,idempotent_replay
      ) VALUES(v_profile_id,'JOURNAL_PREPARED','PREPARE',v_effect.journal_id,
        v_version,p_actor_user_id,p_request_id,v_request_fingerprint,true);
      RETURN QUERY SELECT NULL::text,v_effect.journal_id,v_version,v_status,true; RETURN;
    END IF;
    v_journal_id:=gen_random_uuid();
    INSERT INTO public.accounting_journals(
      id,profile_id,current_version,correction_group_id,reversal_of_journal_id,created_at
    ) VALUES(v_journal_id,v_profile_id,0,v_journal_id,NULL,clock_timestamp());
    v_previous:=NULL; v_new_version:=1;
  ELSE
    SELECT j.* INTO v_identity FROM public.accounting_journals j
      WHERE j.profile_id=v_profile_id AND j.id=p_journal_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN QUERY SELECT 'journal_not_found'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
    END IF;
    IF v_identity.reversal_of_journal_id IS NOT NULL THEN
      RETURN QUERY SELECT 'journal_not_draft'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
    END IF;
    IF v_identity.current_version<>p_expected_version THEN
      RETURN QUERY SELECT 'revision_conflict'::text,v_identity.id,v_identity.current_version,NULL::text,false; RETURN;
    END IF;
    SELECT jv.* INTO v_old FROM public.accounting_journal_versions jv
      WHERE jv.profile_id=v_profile_id AND jv.journal_id=p_journal_id
        AND jv.version=v_identity.current_version FOR SHARE;
    IF NOT FOUND OR v_old.status<>'DRAFT' THEN
      RETURN QUERY SELECT 'journal_not_draft'::text,v_identity.id,v_identity.current_version,NULL::text,false; RETURN;
    END IF;
    IF v_old.source_domain<>'CONTROLLED_MANUAL'
       OR v_old.source_record_key<>v_source_record
       OR v_old.economic_event_key<>v_economic_event
       OR v_old.posting_purpose<>v_purpose THEN
      RETURN QUERY SELECT 'source_identity_immutable'::text,v_identity.id,v_identity.current_version,NULL::text,false; RETURN;
    END IF;
    IF v_effect.id IS NOT NULL AND v_effect.journal_id<>p_journal_id THEN
      IF v_effect.payload_fingerprint<>v_fingerprint THEN
        RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
      END IF;
      RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
    END IF;
    v_journal_id:=p_journal_id; v_previous:=v_identity.current_version;
    v_new_version:=v_previous+1;
  END IF;

  v_event_id:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(v_event_id,v_profile_id,'accounting_journal_prepared','accounting_journal',
    v_journal_id,v_new_version,p_actor_user_id,p_request_id,btrim(p_reason),
    NULLIF(btrim(p_evidence_ref),''),v_fingerprint,
    'accounting_journals/'||v_journal_id::text||'/'||v_new_version::text,clock_timestamp());

  INSERT INTO public.accounting_journal_versions(
    profile_id,journal_id,version,previous_version,status,profile_version,period_id,period_version,
    accounting_date,posting_rule_id,rule_version,source_domain,source_record_key,economic_event_key,
    posting_purpose,description_en,description_ar,currency,reason,evidence_ref,prepared_by,prepared_at,
    posted_by,posted_at,reversal_of_journal_id,payload_fingerprint,foundation_event_id,created_at
  ) VALUES(v_profile_id,v_journal_id,v_new_version,v_previous,'DRAFT',v_profile_version,
    v_period_id,v_period_version,v_date,v_rule_id,v_rule_version,'CONTROLLED_MANUAL',
    v_source_record,v_economic_event,v_purpose,btrim(p_journal->>'description_en'),
    btrim(p_journal->>'description_ar'),'SAR',btrim(p_reason),
    NULLIF(btrim(p_evidence_ref),''),p_actor_user_id,clock_timestamp(),NULL,NULL,NULL,
    v_fingerprint,v_event_id,clock_timestamp());

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_journal->'lines') LOOP
    v_line_number:=v_line_number+1;
    IF jsonb_typeof(v_item)<>'object'
       OR (SELECT count(*) FROM jsonb_object_keys(v_item))<>6
       OR NOT (v_item ?& ARRAY['mapping_key','side','amount_halalah','service_id','description_en','description_ar'])
       OR coalesce(v_item->>'side','') NOT IN ('DEBIT','CREDIT')
       OR coalesce(v_item->>'amount_halalah','') !~ '^[1-9][0-9]{0,18}$'
       OR length(btrim(coalesce(v_item->>'description_en','')))=0
       OR length(btrim(coalesce(v_item->>'description_ar','')))=0 THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_JOURNAL_LINE_INVALID';
    END IF;
    SELECT m.* INTO v_mapping FROM public.accounting_posting_rule_mappings m
    WHERE m.profile_id=v_profile_id AND m.posting_rule_id=v_rule_id
      AND m.rule_version=v_rule_version AND m.mapping_key=v_item->>'mapping_key';
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_JOURNAL_MAPPING_INVALID'; END IF;
    IF v_mapping.allowed_side NOT IN ('EITHER',v_item->>'side') THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_JOURNAL_MAPPING_INVALID';
    END IF;
    IF (v_mapping.service_requirement='REQUIRED' AND NULLIF(v_item->>'service_id','') IS NULL)
       OR (v_mapping.service_requirement='FORBIDDEN' AND NULLIF(v_item->>'service_id','') IS NOT NULL) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_SERVICE_DIMENSION_INVALID';
    END IF;
    SELECT av.* INTO v_account
    FROM public.accounting_accounts a
    JOIN public.accounting_account_versions av
      ON av.profile_id=a.profile_id AND av.account_id=a.id AND av.version=a.current_version
    WHERE a.profile_id=v_profile_id AND a.id=v_mapping.account_id
      AND a.current_version=v_mapping.account_version
      AND av.is_active AND av.account_kind='POSTING'
      AND NOT av.is_protected AND av.control_classification='NONE'
      AND NOT EXISTS(SELECT 1 FROM public.accounting_accounts child
        JOIN public.accounting_account_versions cv ON cv.profile_id=child.profile_id
          AND cv.account_id=child.id AND cv.version=child.current_version
        WHERE child.profile_id=v_profile_id AND cv.parent_account_id=av.account_id);
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_JOURNAL_ACCOUNT_INVALID'; END IF;
    IF length(v_item->>'amount_halalah')>19
       OR (v_item->>'amount_halalah')::numeric>9223372036854775807 THEN
      RAISE EXCEPTION USING ERRCODE='22003',MESSAGE='ACCOUNTING_AMOUNT_OVERFLOW';
    END IF;
    IF NULLIF(v_item->>'service_id','') IS NOT NULL THEN
      SELECT s.service_number,s.event_name,s.event_type,s.event_start_date,s.event_end_date
        INTO v_service FROM public.services s WHERE s.id=(v_item->>'service_id')::uuid;
      IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_SERVICE_NOT_FOUND'; END IF;
    ELSE
      SELECT NULL::text AS service_number,NULL::text AS event_name,NULL::text AS event_type,
        NULL::date AS event_start_date,NULL::date AS event_end_date INTO v_service;
    END IF;
    INSERT INTO public.accounting_journal_line_versions(
      profile_id,journal_id,journal_version,line_number,posting_rule_id,rule_version,mapping_key,
      account_id,account_version,account_code_snapshot,account_name_en_snapshot,
      account_name_ar_snapshot,account_type_snapshot,normal_balance_snapshot,side,amount_halalah,
      service_id,service_number_snapshot,event_name_snapshot,event_type_snapshot,
      event_start_date_snapshot,event_end_date_snapshot,description_en,description_ar
    ) VALUES(v_profile_id,v_journal_id,v_new_version,v_line_number,v_rule_id,v_rule_version,
      v_mapping.mapping_key,v_account.account_id,v_account.version,v_account.account_code,
      v_account.name_en,v_account.name_ar,v_account.account_type,v_account.normal_balance,
      v_item->>'side',(v_item->>'amount_halalah')::bigint,
      CASE WHEN v_item->>'service_id' IS NULL OR v_item->>'service_id'='' THEN NULL
        ELSE (v_item->>'service_id')::uuid END,
      v_service.service_number,v_service.event_name,v_service.event_type,
      v_service.event_start_date,v_service.event_end_date,
      btrim(v_item->>'description_en'),btrim(v_item->>'description_ar'));
    IF v_item->>'side'='DEBIT' THEN v_debits:=v_debits+(v_item->>'amount_halalah')::numeric;
      ELSE v_credits:=v_credits+(v_item->>'amount_halalah')::numeric; END IF;
    v_line_count:=v_line_count+1;
  END LOOP;
  IF v_line_count<2 OR v_debits<>v_credits THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_JOURNAL_UNBALANCED';
  END IF;
  UPDATE public.accounting_journals SET current_version=v_new_version
    WHERE profile_id=v_profile_id AND id=v_journal_id;
  IF v_effect.id IS NULL THEN
    INSERT INTO public.accounting_source_effects(
      profile_id,source_domain,source_record_key,economic_event_key,posting_purpose,
      journal_id,journal_version,status,payload_fingerprint
    ) VALUES(v_profile_id,'CONTROLLED_MANUAL',v_source_record,v_economic_event,v_purpose,
      v_journal_id,v_new_version,'PREPARED',v_fingerprint);
  ELSE
    UPDATE public.accounting_source_effects SET journal_version=v_new_version,
      payload_fingerprint=v_fingerprint
    WHERE id=v_effect.id AND journal_id=v_journal_id AND status='PREPARED';
  END IF;
  INSERT INTO public.accounting_journal_events(
    profile_id,event_type,operation,journal_id,entity_version,actor_user_id,request_id,payload_fingerprint
  ) VALUES(v_profile_id,'JOURNAL_PREPARED','PREPARE',v_journal_id,v_new_version,
    p_actor_user_id,p_request_id,v_request_fingerprint);
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES('prepare','accounting_journal',v_journal_id,p_actor_user_id::text,
    jsonb_build_object('profile_id',v_profile_id,'version',v_new_version,
      'request_id',p_request_id,'source_domain','CONTROLLED_MANUAL'),clock_timestamp());
  RETURN QUERY SELECT NULL::text,v_journal_id,v_new_version,'DRAFT'::text,false;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  WHEN check_violation THEN
    v_error:=SQLERRM;
    RETURN QUERY SELECT CASE v_error
      WHEN 'ACCOUNTING_JOURNAL_UNBALANCED' THEN 'journal_unbalanced'
      WHEN 'ACCOUNTING_JOURNAL_MAPPING_INVALID' THEN 'mapping_invalid'
      WHEN 'ACCOUNTING_JOURNAL_ACCOUNT_INVALID' THEN 'account_not_posting'
      WHEN 'ACCOUNTING_SERVICE_DIMENSION_INVALID' THEN 'service_dimension_invalid'
      WHEN 'ACCOUNTING_SERVICE_NOT_FOUND' THEN 'service_not_found'
      WHEN 'ACCOUNTING_JOURNAL_LINE_INVALID' THEN 'invalid_input'
      ELSE 'invalid_input' END::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
END;
$prepare_journal$;

CREATE FUNCTION public.post_accounting_journal(
  p_actor_user_id uuid,p_journal_id uuid,p_expected_version integer,p_request_id uuid
)
RETURNS TABLE(error_code text,journal_id uuid,version integer,status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $post_journal$
DECLARE
  v_profile_id uuid; v_profile_version integer; v_activation text;
  v_identity public.accounting_journals%ROWTYPE;
  v_header public.accounting_journal_versions%ROWTYPE;
  v_effect public.accounting_source_effects%ROWTYPE;
  v_previous_event public.accounting_journal_events%ROWTYPE;
  v_period_status text; v_period_version integer; v_start date; v_end date;
  v_rule_version integer; v_rule_active boolean;
  v_fingerprint text; v_event_id uuid; v_new_version integer; v_posted_at timestamptz;
  v_debits numeric; v_credits numeric; v_error text;
BEGIN
  IF p_actor_user_id IS NULL OR p_journal_id IS NULL OR p_expected_version IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u
    WHERE u.id=p_actor_user_id AND u.is_active IS TRUE) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:post_journal') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT j.profile_id INTO v_profile_id FROM public.accounting_journals j WHERE j.id=p_journal_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'journal_not_found'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT p.id,v.version,v.activation_state INTO v_profile_id,v_profile_version,v_activation
  FROM public.accounting_profiles p
  JOIN public.accounting_profile_versions v
    ON v.profile_id=p.id AND v.version=p.current_version
  WHERE p.id=v_profile_id AND p.singleton_key='g7' AND p.current_version>0
    AND v.functional_currency='SAR' AND v.vat_mode='not_registered'
    AND v.zatca_state='INACTIVE' AND v.fatoora_state='INACTIVE'
  FOR SHARE OF p;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_activation<>'DEV_PROVISIONAL' THEN
    RETURN QUERY SELECT 'profile_not_active'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10b-profile:'||v_profile_id::text,0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10b-request:'||v_profile_id::text||':'||
      p_actor_user_id::text||':POST:'||p_request_id::text,0)
  );
  SELECT e.* INTO v_previous_event FROM public.accounting_journal_events e
  WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id
    AND e.operation='POST' AND e.request_id=p_request_id;
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'journal_id',p_journal_id,'expected_version',p_expected_version
  )::text,'UTF8'),'sha256'),'hex');
  IF FOUND THEN
    IF v_previous_event.payload_fingerprint IS DISTINCT FROM v_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,v_previous_event.journal_id,v_previous_event.entity_version,'POSTED'::text,true; RETURN;
  END IF;

  SELECT j.* INTO v_identity FROM public.accounting_journals j
    WHERE j.profile_id=v_profile_id AND j.id=p_journal_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'journal_not_found'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT jv.* INTO v_header FROM public.accounting_journal_versions jv
    WHERE jv.profile_id=v_profile_id AND jv.journal_id=p_journal_id
      AND jv.version=v_identity.current_version;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'journal_not_found'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_header.status='POSTED' THEN
    RETURN QUERY SELECT 'revision_conflict'::text,p_journal_id,v_identity.current_version,'POSTED'::text,false; RETURN;
  END IF;
  IF v_identity.reversal_of_journal_id IS NOT NULL THEN
    RETURN QUERY SELECT 'journal_not_draft'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_identity.current_version<>p_expected_version OR v_header.status<>'DRAFT' THEN
    RETURN QUERY SELECT 'revision_conflict'::text,p_journal_id,v_identity.current_version,'DRAFT'::text,false; RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10a2a-period:'||v_profile_id::text,0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10a2a-chart:'||v_profile_id::text,0)
  );
  SELECT pv.status,pv.version,pv.start_date,pv.end_date INTO
    v_period_status,v_period_version,v_start,v_end
  FROM public.accounting_periods p
  JOIN public.accounting_period_versions pv
    ON pv.profile_id=p.profile_id AND pv.period_id=p.id AND pv.version=p.current_version
  WHERE p.profile_id=v_profile_id AND p.id=v_header.period_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'period_not_found'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_period_status<>'OPEN' THEN
    RETURN QUERY SELECT 'period_not_open'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_period_version<>v_header.period_version THEN
    RETURN QUERY SELECT 'period_version_changed'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_header.accounting_date<v_start OR v_header.accounting_date>v_end THEN
    RETURN QUERY SELECT 'period_date_mismatch'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF v_header.profile_version<>v_profile_version THEN
    RETURN QUERY SELECT 'profile_version_changed'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT rv.version,rv.is_active INTO v_rule_version,v_rule_active
  FROM public.accounting_posting_rules r
  JOIN public.accounting_posting_rule_versions rv
    ON rv.profile_id=r.profile_id AND rv.posting_rule_id=r.id AND rv.version=r.current_version
  WHERE r.profile_id=v_profile_id AND r.id=v_header.posting_rule_id;
  IF NOT FOUND OR v_rule_version<>v_header.rule_version OR NOT v_rule_active THEN
    RETURN QUERY SELECT 'posting_rule_changed'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF EXISTS(
    SELECT 1 FROM public.accounting_journal_line_versions l
    JOIN public.accounting_posting_rule_mappings m
      ON m.profile_id=l.profile_id AND m.posting_rule_id=l.posting_rule_id
       AND m.rule_version=l.rule_version AND m.mapping_key=l.mapping_key
    LEFT JOIN public.accounting_accounts a
      ON a.profile_id=l.profile_id AND a.id=l.account_id
    LEFT JOIN public.accounting_account_versions av
      ON av.profile_id=a.profile_id AND av.account_id=a.id AND av.version=a.current_version
    WHERE l.profile_id=v_profile_id AND l.journal_id=p_journal_id
      AND l.journal_version=v_header.version
      AND (a.current_version<>l.account_version OR av.account_kind<>'POSTING'
        OR NOT av.is_active OR av.is_protected OR av.control_classification<>'NONE'
        OR m.account_id<>l.account_id OR m.account_version<>l.account_version
        OR (m.allowed_side NOT IN ('EITHER',l.side))
        OR EXISTS(SELECT 1 FROM public.accounting_accounts child
          JOIN public.accounting_account_versions cv ON cv.profile_id=child.profile_id
            AND cv.account_id=child.id AND cv.version=child.current_version
          WHERE child.profile_id=v_profile_id AND cv.parent_account_id=l.account_id))
  ) THEN
    RETURN QUERY SELECT 'account_not_posting'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT coalesce(sum(l.amount_halalah) FILTER(WHERE l.side='DEBIT'),0),
         coalesce(sum(l.amount_halalah) FILTER(WHERE l.side='CREDIT'),0)
    INTO v_debits,v_credits
  FROM public.accounting_journal_line_versions l
  WHERE l.profile_id=v_profile_id AND l.journal_id=p_journal_id
    AND l.journal_version=v_header.version;
  IF v_debits<>v_credits OR (SELECT count(*) FROM public.accounting_journal_line_versions l
      WHERE l.profile_id=v_profile_id AND l.journal_id=p_journal_id
        AND l.journal_version=v_header.version)<2 THEN
    RETURN QUERY SELECT 'journal_unbalanced'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT se.* INTO v_effect FROM public.accounting_source_effects se
  WHERE se.profile_id=v_profile_id AND se.journal_id=p_journal_id;
  IF NOT FOUND OR v_effect.status<>'PREPARED' OR v_effect.journal_version<>v_header.version
     OR v_effect.payload_fingerprint<>v_header.payload_fingerprint THEN
    RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  v_new_version:=v_header.version+1; v_event_id:=gen_random_uuid(); v_posted_at:=clock_timestamp();
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(v_event_id,v_profile_id,'accounting_journal_posted','accounting_journal',
    p_journal_id,v_new_version,p_actor_user_id,p_request_id,v_header.reason,
    v_header.evidence_ref,v_header.payload_fingerprint,
    'accounting_journals/'||p_journal_id::text||'/'||v_new_version::text,v_posted_at);
  INSERT INTO public.accounting_journal_versions(
    profile_id,journal_id,version,previous_version,status,profile_version,period_id,period_version,
    accounting_date,posting_rule_id,rule_version,source_domain,source_record_key,economic_event_key,
    posting_purpose,description_en,description_ar,currency,reason,evidence_ref,prepared_by,prepared_at,
    posted_by,posted_at,reversal_of_journal_id,payload_fingerprint,foundation_event_id,created_at
  ) VALUES(v_profile_id,p_journal_id,v_new_version,v_header.version,'POSTED',v_header.profile_version,
    v_header.period_id,v_header.period_version,v_header.accounting_date,v_header.posting_rule_id,
    v_header.rule_version,v_header.source_domain,v_header.source_record_key,v_header.economic_event_key,
    v_header.posting_purpose,v_header.description_en,v_header.description_ar,v_header.currency,
    v_header.reason,v_header.evidence_ref,v_header.prepared_by,v_header.prepared_at,
    p_actor_user_id,v_posted_at,NULL,v_header.payload_fingerprint,v_event_id,v_posted_at);
  INSERT INTO public.accounting_journal_line_versions(
    profile_id,journal_id,journal_version,line_number,posting_rule_id,rule_version,mapping_key,
    account_id,account_version,account_code_snapshot,account_name_en_snapshot,
    account_name_ar_snapshot,account_type_snapshot,normal_balance_snapshot,side,amount_halalah,
    service_id,service_number_snapshot,event_name_snapshot,event_type_snapshot,
    event_start_date_snapshot,event_end_date_snapshot,description_en,description_ar
  )
  SELECT l.profile_id,l.journal_id,v_new_version,l.line_number,l.posting_rule_id,l.rule_version,l.mapping_key,
    l.account_id,l.account_version,l.account_code_snapshot,l.account_name_en_snapshot,
    l.account_name_ar_snapshot,l.account_type_snapshot,l.normal_balance_snapshot,l.side,l.amount_halalah,
    l.service_id,l.service_number_snapshot,l.event_name_snapshot,l.event_type_snapshot,
    l.event_start_date_snapshot,l.event_end_date_snapshot,l.description_en,l.description_ar
  FROM public.accounting_journal_line_versions l
  WHERE l.profile_id=v_profile_id AND l.journal_id=p_journal_id AND l.journal_version=v_header.version;
  UPDATE public.accounting_journals SET current_version=v_new_version
    WHERE profile_id=v_profile_id AND id=p_journal_id;
  UPDATE public.accounting_source_effects SET status='POSTED',journal_version=v_new_version
    WHERE id=v_effect.id AND status='PREPARED';
  INSERT INTO public.accounting_journal_events(
    profile_id,event_type,operation,journal_id,entity_version,actor_user_id,request_id,payload_fingerprint
  ) VALUES(v_profile_id,'JOURNAL_POSTED','POST',p_journal_id,v_new_version,
    p_actor_user_id,p_request_id,v_fingerprint);
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES('post','accounting_journal',p_journal_id,p_actor_user_id::text,
    jsonb_build_object('profile_id',v_profile_id,'version',v_new_version,
      'request_id',p_request_id,'accounting_date',v_header.accounting_date,
      'posted_at',v_posted_at),v_posted_at);
  RETURN QUERY SELECT NULL::text,p_journal_id,v_new_version,'POSTED'::text,false;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'economic_effect_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  WHEN check_violation THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
END;
$post_journal$;

CREATE FUNCTION public.reverse_accounting_journal(
  p_actor_user_id uuid,p_original_journal_id uuid,p_period_id uuid,p_accounting_date date,
  p_reason text,p_evidence_ref text,p_request_id uuid
)
RETURNS TABLE(error_code text,journal_id uuid,version integer,original_journal_id uuid,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $reverse_journal$
DECLARE
  v_profile_id uuid; v_profile_version integer; v_activation text;
  v_original public.accounting_journal_versions%ROWTYPE;
  v_original_identity public.accounting_journals%ROWTYPE;
  v_reversal_id uuid; v_event_id uuid; v_v1_event uuid; v_v2 integer:=2;
  v_period_version integer; v_period_status text; v_start date; v_end date;
  v_fingerprint text; v_request_fingerprint text; v_previous_event public.accounting_journal_events%ROWTYPE;
  v_posted_at timestamptz; v_debits numeric; v_credits numeric;
BEGIN
  IF p_actor_user_id IS NULL OR p_original_journal_id IS NULL OR p_period_id IS NULL
     OR p_accounting_date IS NULL OR p_request_id IS NULL OR length(btrim(coalesce(p_reason,'')))=0 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u
    WHERE u.id=p_actor_user_id AND u.is_active IS TRUE) THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:reverse_journal') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT j.profile_id INTO v_profile_id FROM public.accounting_journals j
    WHERE j.id=p_original_journal_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'journal_not_found'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;
  SELECT p.id,v.version,v.activation_state INTO v_profile_id,v_profile_version,v_activation
  FROM public.accounting_profiles p
  JOIN public.accounting_profile_versions v
    ON v.profile_id=p.id AND v.version=p.current_version
  WHERE p.id=v_profile_id AND p.singleton_key='g7' AND p.current_version>0
    AND v.functional_currency='SAR' AND v.vat_mode='not_registered'
    AND v.zatca_state='INACTIVE' AND v.fatoora_state='INACTIVE'
  FOR SHARE OF p;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;
  IF v_activation<>'DEV_PROVISIONAL' THEN
    RETURN QUERY SELECT 'profile_not_active'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10b-profile:'||v_profile_id::text,0)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10b-request:'||v_profile_id::text||':'||
      p_actor_user_id::text||':REVERSE:'||p_request_id::text,0)
  );
  SELECT e.* INTO v_previous_event FROM public.accounting_journal_events e
  WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id
    AND e.operation='REVERSE' AND e.request_id=p_request_id;
  v_request_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'original_journal_id',p_original_journal_id,'period_id',p_period_id,
    'accounting_date',p_accounting_date,'reason',btrim(p_reason),
    'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');
  IF FOUND THEN
    IF v_previous_event.payload_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,v_previous_event.journal_id,v_previous_event.entity_version,
      p_original_journal_id,true; RETURN;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10a2a-period:'||v_profile_id::text,0)
  );
  SELECT j.* INTO v_original_identity FROM public.accounting_journals j
    WHERE j.profile_id=v_profile_id AND j.id=p_original_journal_id FOR UPDATE;
  SELECT jv.* INTO v_original FROM public.accounting_journal_versions jv
    WHERE jv.profile_id=v_profile_id AND jv.journal_id=p_original_journal_id
      AND jv.version=v_original_identity.current_version;
  IF NOT FOUND OR v_original.status<>'POSTED' OR v_original_identity.reversal_of_journal_id IS NOT NULL THEN
    RETURN QUERY SELECT 'journal_not_posted'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_journals j
      WHERE j.profile_id=v_profile_id AND j.reversal_of_journal_id=p_original_journal_id) THEN
    RETURN QUERY SELECT 'already_reversed'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;
  SELECT pv.version,pv.status,pv.start_date,pv.end_date
    INTO v_period_version,v_period_status,v_start,v_end
  FROM public.accounting_periods p
  JOIN public.accounting_period_versions pv
    ON pv.profile_id=p.profile_id AND pv.period_id=p.id AND pv.version=p.current_version
  WHERE p.profile_id=v_profile_id AND p.id=p_period_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'period_not_found'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;
  IF v_period_status<>'OPEN' THEN
    RETURN QUERY SELECT 'period_not_open'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;
  IF p_accounting_date<v_start OR p_accounting_date>v_end THEN
    RETURN QUERY SELECT 'period_date_mismatch'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;
  SELECT coalesce(sum(l.amount_halalah) FILTER(WHERE l.side='DEBIT'),0),
         coalesce(sum(l.amount_halalah) FILTER(WHERE l.side='CREDIT'),0)
    INTO v_debits,v_credits
  FROM public.accounting_journal_line_versions l
  WHERE l.profile_id=v_profile_id AND l.journal_id=p_original_journal_id
    AND l.journal_version=v_original.version;
  IF v_debits<>v_credits OR (SELECT count(*) FROM public.accounting_journal_line_versions l
      WHERE l.profile_id=v_profile_id AND l.journal_id=p_original_journal_id
        AND l.journal_version=v_original.version)<2 THEN
    RETURN QUERY SELECT 'journal_unbalanced'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  END IF;

  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'original_journal_id',p_original_journal_id,'period_id',p_period_id,
    'accounting_date',p_accounting_date,'reverse','FULL'
  )::text,'UTF8'),'sha256'),'hex');
  v_reversal_id:=gen_random_uuid(); v_v1_event:=gen_random_uuid(); v_event_id:=gen_random_uuid();
  v_posted_at:=clock_timestamp();
  INSERT INTO public.accounting_journals(
    id,profile_id,current_version,correction_group_id,reversal_of_journal_id,created_at
  ) VALUES(v_reversal_id,v_profile_id,0,v_original_identity.correction_group_id,
    p_original_journal_id,v_posted_at);
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(v_v1_event,v_profile_id,'accounting_journal_prepared','accounting_journal',
    v_reversal_id,1,p_actor_user_id,p_request_id,btrim(p_reason),
    NULLIF(btrim(p_evidence_ref),''),v_fingerprint,
    'accounting_journals/'||v_reversal_id::text||'/1',v_posted_at);
  INSERT INTO public.accounting_journal_versions(
    profile_id,journal_id,version,previous_version,status,profile_version,period_id,period_version,
    accounting_date,posting_rule_id,rule_version,source_domain,source_record_key,economic_event_key,
    posting_purpose,description_en,description_ar,currency,reason,evidence_ref,prepared_by,prepared_at,
    posted_by,posted_at,reversal_of_journal_id,payload_fingerprint,foundation_event_id,created_at
  ) VALUES(v_profile_id,v_reversal_id,1,NULL,'DRAFT',v_profile_version,p_period_id,v_period_version,
    p_accounting_date,v_original.posting_rule_id,v_original.rule_version,'CONTROLLED_MANUAL',
    p_original_journal_id::text,'full_reversal','reversal',
    left('Reversal: '||v_original.description_en,500),left('عكس: '||v_original.description_ar,500),
    'SAR',btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),p_actor_user_id,v_posted_at,
    NULL,NULL,p_original_journal_id,v_fingerprint,v_v1_event,v_posted_at);
  UPDATE public.accounting_journals SET current_version=1
    WHERE profile_id=v_profile_id AND id=v_reversal_id;
  INSERT INTO public.accounting_journal_line_versions(
    profile_id,journal_id,journal_version,line_number,posting_rule_id,rule_version,mapping_key,
    account_id,account_version,account_code_snapshot,account_name_en_snapshot,
    account_name_ar_snapshot,account_type_snapshot,normal_balance_snapshot,side,amount_halalah,
    service_id,service_number_snapshot,event_name_snapshot,event_type_snapshot,
    event_start_date_snapshot,event_end_date_snapshot,description_en,description_ar
  )
  SELECT l.profile_id,v_reversal_id,1,l.line_number,l.posting_rule_id,l.rule_version,l.mapping_key,
    l.account_id,l.account_version,l.account_code_snapshot,l.account_name_en_snapshot,
    l.account_name_ar_snapshot,l.account_type_snapshot,l.normal_balance_snapshot,
    CASE l.side WHEN 'DEBIT' THEN 'CREDIT' ELSE 'DEBIT' END,l.amount_halalah,
    l.service_id,l.service_number_snapshot,l.event_name_snapshot,l.event_type_snapshot,
    l.event_start_date_snapshot,l.event_end_date_snapshot,l.description_en,l.description_ar
  FROM public.accounting_journal_line_versions l
  WHERE l.profile_id=v_profile_id AND l.journal_id=p_original_journal_id
    AND l.journal_version=v_original.version;
  INSERT INTO public.accounting_source_effects(
    profile_id,source_domain,source_record_key,economic_event_key,posting_purpose,
    journal_id,journal_version,status,payload_fingerprint
  ) VALUES(v_profile_id,'CONTROLLED_MANUAL',p_original_journal_id::text,'full_reversal',
    'reversal',v_reversal_id,1,'PREPARED',v_fingerprint);
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(v_event_id,v_profile_id,'accounting_journal_reversed','accounting_journal',
    v_reversal_id,2,p_actor_user_id,p_request_id,btrim(p_reason),
    NULLIF(btrim(p_evidence_ref),''),v_fingerprint,
    'accounting_journals/'||v_reversal_id::text||'/2',v_posted_at);
  INSERT INTO public.accounting_journal_versions(
    profile_id,journal_id,version,previous_version,status,profile_version,period_id,period_version,
    accounting_date,posting_rule_id,rule_version,source_domain,source_record_key,economic_event_key,
    posting_purpose,description_en,description_ar,currency,reason,evidence_ref,prepared_by,prepared_at,
    posted_by,posted_at,reversal_of_journal_id,payload_fingerprint,foundation_event_id,created_at
  )
  SELECT v_profile_id,v_reversal_id,2,1,'POSTED',v.profile_version,v.period_id,v.period_version,
    v.accounting_date,v.posting_rule_id,v.rule_version,v.source_domain,v.source_record_key,
    v.economic_event_key,v.posting_purpose,v.description_en,v.description_ar,v.currency,
    v.reason,v.evidence_ref,v.prepared_by,v.prepared_at,p_actor_user_id,v_posted_at,
    p_original_journal_id,v.payload_fingerprint,v_event_id,v_posted_at
  FROM public.accounting_journal_versions v
  WHERE v.profile_id=v_profile_id AND v.journal_id=v_reversal_id AND v.version=1;
  INSERT INTO public.accounting_journal_line_versions(
    profile_id,journal_id,journal_version,line_number,posting_rule_id,rule_version,mapping_key,
    account_id,account_version,account_code_snapshot,account_name_en_snapshot,
    account_name_ar_snapshot,account_type_snapshot,normal_balance_snapshot,side,amount_halalah,
    service_id,service_number_snapshot,event_name_snapshot,event_type_snapshot,
    event_start_date_snapshot,event_end_date_snapshot,description_en,description_ar
  )
  SELECT l.profile_id,l.journal_id,2,l.line_number,l.posting_rule_id,l.rule_version,l.mapping_key,
    l.account_id,l.account_version,l.account_code_snapshot,l.account_name_en_snapshot,
    l.account_name_ar_snapshot,l.account_type_snapshot,l.normal_balance_snapshot,l.side,l.amount_halalah,
    l.service_id,l.service_number_snapshot,l.event_name_snapshot,l.event_type_snapshot,
    l.event_start_date_snapshot,l.event_end_date_snapshot,l.description_en,l.description_ar
  FROM public.accounting_journal_line_versions l
  WHERE l.profile_id=v_profile_id AND l.journal_id=v_reversal_id AND l.journal_version=1;
  UPDATE public.accounting_journals SET current_version=2
    WHERE profile_id=v_profile_id AND id=v_reversal_id;
  UPDATE public.accounting_source_effects SET status='POSTED',journal_version=2
    WHERE profile_id=v_profile_id AND journal_id=v_reversal_id AND status='PREPARED';
  INSERT INTO public.accounting_journal_events(
    profile_id,event_type,operation,journal_id,entity_version,actor_user_id,request_id,payload_fingerprint
  ) VALUES(v_profile_id,'JOURNAL_REVERSED','REVERSE',v_reversal_id,2,
    p_actor_user_id,p_request_id,v_request_fingerprint);
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES('reverse','accounting_journal',v_reversal_id,p_actor_user_id::text,
    jsonb_build_object('profile_id',v_profile_id,'version',2,
      'request_id',p_request_id,'original_journal_id',p_original_journal_id,
      'accounting_date',p_accounting_date,'posted_at',v_posted_at),v_posted_at);
  RETURN QUERY SELECT NULL::text,v_reversal_id,2,p_original_journal_id,false;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'already_reversed'::text,NULL::uuid,NULL::integer,p_original_journal_id,false; RETURN;
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::uuid,false; RETURN;
END;
$reverse_journal$;

CREATE FUNCTION public.get_accounting_journal(p_actor_user_id uuid,p_journal_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $get_journal$
DECLARE v_profile_id uuid; v_result jsonb;
BEGIN
  IF p_actor_user_id IS NULL OR p_journal_id IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE
  ) OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:view') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT id INTO v_profile_id FROM public.accounting_profiles WHERE singleton_key='g7';
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'journal_id',j.id,'profile_id',j.profile_id,'correction_group_id',j.correction_group_id,
    'reversal_of_journal_id',j.reversal_of_journal_id,'current_version',j.current_version,
    'versions',coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'version',v.version,'previous_version',v.previous_version,'status',v.status,
        'profile_version',v.profile_version,'period_id',v.period_id,'period_version',v.period_version,
        'accounting_date',v.accounting_date,'posting_rule_id',v.posting_rule_id,
        'rule_version',v.rule_version,'source_domain',v.source_domain,
        'source_record_key',v.source_record_key,'economic_event_key',v.economic_event_key,
        'posting_purpose',v.posting_purpose,'description_en',v.description_en,
        'description_ar',v.description_ar,'currency',v.currency,'reason',v.reason,
        'evidence_ref',v.evidence_ref,'prepared_by',v.prepared_by,'prepared_at',v.prepared_at,
        'posted_by',v.posted_by,'posted_at',v.posted_at,
        'lines',coalesce((
          SELECT jsonb_agg(jsonb_build_object(
            'line_number',l.line_number,'mapping_key',l.mapping_key,
            'account_id',l.account_id,'account_version',l.account_version,
            'account_code',l.account_code_snapshot,'name_en',l.account_name_en_snapshot,
            'name_ar',l.account_name_ar_snapshot,'account_type',l.account_type_snapshot,
            'normal_balance',l.normal_balance_snapshot,'side',l.side,
            'amount_halalah',l.amount_halalah::text,'service_id',l.service_id,
            'service_number',l.service_number_snapshot,'event_name',l.event_name_snapshot,
            'event_type',l.event_type_snapshot,'event_start_date',l.event_start_date_snapshot,
            'event_end_date',l.event_end_date_snapshot,
            'description_en',l.description_en,'description_ar',l.description_ar
          ) ORDER BY l.line_number)
          FROM public.accounting_journal_line_versions l
          WHERE l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
        ),'[]'::jsonb)
      ) ORDER BY v.version)
      FROM public.accounting_journal_versions v
      WHERE v.profile_id=j.profile_id AND v.journal_id=j.id
    ),'[]'::jsonb)
  ) INTO v_result
  FROM public.accounting_journals j
  WHERE j.profile_id=v_profile_id AND j.id=p_journal_id;
  RETURN v_result;
END;
$get_journal$;

CREATE FUNCTION public.get_accounting_general_ledger(
  p_actor_user_id uuid,p_from_date date,p_through_date date,p_recorded_at_cutoff timestamptz,
  p_account_id uuid,p_service_id uuid,p_offset integer,p_limit integer
)
RETURNS TABLE(report jsonb,is_complete boolean,generated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $general_ledger$
DECLARE v_profile_id uuid; v_cutoff timestamptz; v_count bigint; v_entries jsonb; v_now timestamptz;
BEGIN
  IF p_actor_user_id IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE
  ) OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:view') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  IF p_from_date IS NULL OR p_through_date IS NULL OR NOT isfinite(p_from_date)
     OR NOT isfinite(p_through_date) OR p_through_date<p_from_date
     OR (p_recorded_at_cutoff IS NOT NULL AND NOT isfinite(p_recorded_at_cutoff))
     OR p_offset IS NULL OR p_offset<0 OR p_offset>50000
     OR p_limit IS NULL OR p_limit<1 OR p_limit>500 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_REPORT_INPUT_INVALID';
  END IF;
  SELECT id INTO v_profile_id FROM public.accounting_profiles WHERE singleton_key='g7';
  IF NOT FOUND THEN
    RETURN QUERY SELECT jsonb_build_object('entries','[]'::jsonb,'from_date',p_from_date,
      'through_date',p_through_date,'recorded_at_cutoff',p_recorded_at_cutoff),
      true,clock_timestamp(); RETURN;
  END IF;
  v_cutoff:=coalesce(p_recorded_at_cutoff,clock_timestamp()); v_now:=clock_timestamp();
  SELECT count(*) INTO v_count
  FROM public.accounting_journal_versions v
  JOIN public.accounting_journal_line_versions l
    ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
  WHERE v.profile_id=v_profile_id AND v.status='POSTED'
    AND v.accounting_date BETWEEN p_from_date AND p_through_date
    AND v.posted_at<=v_cutoff
    AND (p_account_id IS NULL OR l.account_id=p_account_id)
    AND (p_service_id IS NULL OR l.service_id=p_service_id);
  SELECT coalesce(jsonb_agg(q.entry ORDER BY q.accounting_date,q.posted_at,q.journal_id,q.line_number),'[]'::jsonb)
    INTO v_entries
  FROM (
    SELECT v.accounting_date,v.posted_at,v.journal_id,l.line_number,
      jsonb_build_object('journal_id',v.journal_id,'journal_version',v.version,
        'accounting_date',v.accounting_date,'posted_at',v.posted_at,
        'posted_by',v.posted_by,'reversal_of_journal_id',v.reversal_of_journal_id,
        'correction_group_id',j.correction_group_id,
        'account_id',l.account_id,'account_version',l.account_version,
        'account_code',l.account_code_snapshot,'account_name_en',l.account_name_en_snapshot,
        'account_name_ar',l.account_name_ar_snapshot,'side',l.side,
        'amount_halalah',l.amount_halalah::text,'service_id',l.service_id,
        'service_number',l.service_number_snapshot,'event_name',l.event_name_snapshot,
        'event_type',l.event_type_snapshot,'event_start_date',l.event_start_date_snapshot,
        'event_end_date',l.event_end_date_snapshot,'line_number',l.line_number,
        'description_en',l.description_en,'description_ar',l.description_ar) AS entry
    FROM public.accounting_journal_versions v
    JOIN public.accounting_journals j
      ON j.profile_id=v.profile_id AND j.id=v.journal_id
    JOIN public.accounting_journal_line_versions l
      ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
    WHERE v.profile_id=v_profile_id AND v.status='POSTED'
      AND v.accounting_date BETWEEN p_from_date AND p_through_date
      AND v.posted_at<=v_cutoff
      AND (p_account_id IS NULL OR l.account_id=p_account_id)
      AND (p_service_id IS NULL OR l.service_id=p_service_id)
    ORDER BY v.accounting_date,v.posted_at,v.journal_id,l.line_number
    OFFSET p_offset LIMIT p_limit
  ) q;
  RETURN QUERY SELECT jsonb_build_object('entries',v_entries,'from_date',p_from_date,
    'through_date',p_through_date,'recorded_at_cutoff',v_cutoff),v_count<=p_offset+p_limit,v_now;
END;
$general_ledger$;

CREATE FUNCTION public.get_accounting_trial_balance(
  p_actor_user_id uuid,p_as_of_date date,p_recorded_at_cutoff timestamptz,
  p_service_id uuid,p_offset integer,p_limit integer
)
RETURNS TABLE(report jsonb,is_complete boolean,generated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $trial_balance$
DECLARE
  v_profile_id uuid; v_cutoff timestamptz; v_now timestamptz;
  v_debit_balance numeric:=0; v_credit_balance numeric:=0;
  v_entry_count bigint:=0; v_accounts jsonb;
BEGIN
  IF p_actor_user_id IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE
  ) OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:view') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  IF p_as_of_date IS NULL OR NOT isfinite(p_as_of_date)
     OR (p_recorded_at_cutoff IS NOT NULL AND NOT isfinite(p_recorded_at_cutoff))
     OR p_offset IS NULL OR p_offset<0 OR p_offset>50000
     OR p_limit IS NULL OR p_limit<1 OR p_limit>500 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_REPORT_INPUT_INVALID';
  END IF;
  SELECT id INTO v_profile_id FROM public.accounting_profiles WHERE singleton_key='g7';
  v_cutoff:=coalesce(p_recorded_at_cutoff,clock_timestamp()); v_now:=clock_timestamp();
  IF NOT FOUND THEN
    RETURN QUERY SELECT jsonb_build_object('as_of_date',p_as_of_date,
      'recorded_at_cutoff',v_cutoff,'service_id',p_service_id,'accounts','[]'::jsonb,
      'debit_balance_total_halalah','0','credit_balance_total_halalah','0',
      'debits_equal_credits',true,'account_count',0),true,v_now; RETURN;
  END IF;
  WITH base AS (
    SELECT l.account_id,l.account_code_snapshot,l.account_name_en_snapshot,
      l.account_name_ar_snapshot,l.account_type_snapshot,l.normal_balance_snapshot,
      l.side,l.amount_halalah,v.accounting_date,v.posted_at,v.journal_id,l.line_number
    FROM public.accounting_journal_versions v
    JOIN public.accounting_journal_line_versions l
      ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
    WHERE v.profile_id=v_profile_id AND v.status='POSTED'
      AND v.accounting_date<=p_as_of_date AND v.posted_at<=v_cutoff
      AND (p_service_id IS NULL OR l.service_id=p_service_id)
  ), balances AS (
    SELECT b.account_id,
      coalesce(sum(b.amount_halalah::numeric) FILTER(WHERE b.side='DEBIT'),0) AS debits,
      coalesce(sum(b.amount_halalah::numeric) FILTER(WHERE b.side='CREDIT'),0) AS credits
    FROM base b GROUP BY b.account_id
  ), labels AS (
    SELECT DISTINCT ON(b.account_id) b.account_id,b.account_code_snapshot,
      b.account_name_en_snapshot,b.account_name_ar_snapshot,b.account_type_snapshot,
      b.normal_balance_snapshot
    FROM base b ORDER BY b.account_id,b.accounting_date DESC,b.posted_at DESC,b.journal_id DESC,b.line_number DESC
  ), account_balances AS (
    SELECT l.account_id,l.account_code_snapshot,l.account_name_en_snapshot,
      l.account_name_ar_snapshot,l.account_type_snapshot,l.normal_balance_snapshot,
      b.debits,b.credits,greatest(b.debits-b.credits,0) AS debit_balance,
      greatest(b.credits-b.debits,0) AS credit_balance
    FROM balances b JOIN labels l USING(account_id)
  )
  SELECT coalesce(sum(ab.debit_balance),0),coalesce(sum(ab.credit_balance),0),count(*)
    INTO v_debit_balance,v_credit_balance,v_entry_count FROM account_balances ab;
  WITH base AS (
    SELECT l.account_id,l.account_code_snapshot,l.account_name_en_snapshot,
      l.account_name_ar_snapshot,l.account_type_snapshot,l.normal_balance_snapshot,
      l.side,l.amount_halalah,v.accounting_date,v.posted_at,v.journal_id,l.line_number
    FROM public.accounting_journal_versions v
    JOIN public.accounting_journal_line_versions l
      ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
    WHERE v.profile_id=v_profile_id AND v.status='POSTED'
      AND v.accounting_date<=p_as_of_date AND v.posted_at<=v_cutoff
      AND (p_service_id IS NULL OR l.service_id=p_service_id)
  ), balances AS (
    SELECT b.account_id,
      coalesce(sum(b.amount_halalah::numeric) FILTER(WHERE b.side='DEBIT'),0) AS debits,
      coalesce(sum(b.amount_halalah::numeric) FILTER(WHERE b.side='CREDIT'),0) AS credits
    FROM base b GROUP BY b.account_id
  ), labels AS (
    SELECT DISTINCT ON(b.account_id) b.account_id,b.account_code_snapshot,
      b.account_name_en_snapshot,b.account_name_ar_snapshot,b.account_type_snapshot,
      b.normal_balance_snapshot
    FROM base b ORDER BY b.account_id,b.accounting_date DESC,b.posted_at DESC,b.journal_id DESC,b.line_number DESC
  ), account_balances AS (
    SELECT l.account_id,l.account_code_snapshot,l.account_name_en_snapshot,
      l.account_name_ar_snapshot,l.account_type_snapshot,l.normal_balance_snapshot,
      b.debits,b.credits,greatest(b.debits-b.credits,0) AS debit_balance,
      greatest(b.credits-b.debits,0) AS credit_balance
    FROM balances b JOIN labels l USING(account_id)
  )
  SELECT coalesce(jsonb_agg(q.entry ORDER BY q.account_code_snapshot,q.account_id),'[]'::jsonb)
    INTO v_accounts
  FROM (
    SELECT ab.account_id,ab.account_code_snapshot,
      jsonb_build_object('account_id',ab.account_id,'account_code',ab.account_code_snapshot,
        'account_name_en',ab.account_name_en_snapshot,'account_name_ar',ab.account_name_ar_snapshot,
        'account_type',ab.account_type_snapshot,'normal_balance',ab.normal_balance_snapshot,
        'debit_activity_halalah',ab.debits::text,'credit_activity_halalah',ab.credits::text,
        'debit_balance_halalah',ab.debit_balance::text,'credit_balance_halalah',ab.credit_balance::text) AS entry
    FROM account_balances ab ORDER BY ab.account_code_snapshot,ab.account_id
    OFFSET p_offset LIMIT p_limit
  ) q;
  RETURN QUERY SELECT jsonb_build_object('as_of_date',p_as_of_date,
    'recorded_at_cutoff',v_cutoff,'service_id',p_service_id,'accounts',coalesce(v_accounts,'[]'::jsonb),
    'debit_balance_total_halalah',v_debit_balance::text,
    'credit_balance_total_halalah',v_credit_balance::text,
    'debits_equal_credits',v_debit_balance=v_credit_balance,
    'account_count',v_entry_count),v_entry_count<=p_offset+p_limit,v_now;
END;
$trial_balance$;

ALTER TABLE public.accounting_posting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_posting_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_posting_rule_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal_line_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_source_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_journal_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.accounting_posting_rules,public.accounting_posting_rule_versions,
  public.accounting_posting_rule_mappings,public.accounting_journals,public.accounting_journal_versions,
  public.accounting_journal_line_versions,public.accounting_source_effects,public.accounting_journal_events
  FROM PUBLIC,anon,authenticated,service_role;

REVOKE ALL ON FUNCTION public.guard_accounting_w10b_identity() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.validate_accounting_posting_rule_version() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.validate_accounting_posting_rule_mapping() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.validate_accounting_journal_version() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_accounting_source_effect() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_accounting_posting_rule(uuid,uuid,integer,jsonb,text,text,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.list_accounting_posting_rules(uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.post_accounting_journal(uuid,uuid,integer,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reverse_accounting_journal(uuid,uuid,uuid,date,text,text,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_accounting_journal(uuid,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_accounting_general_ledger(uuid,date,date,timestamptz,uuid,uuid,integer,integer)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_accounting_trial_balance(uuid,date,timestamptz,uuid,integer,integer)
  FROM PUBLIC,anon,authenticated,service_role;

GRANT EXECUTE ON FUNCTION public.save_accounting_posting_rule(uuid,uuid,integer,jsonb,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_accounting_posting_rules(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_accounting_journal(uuid,uuid,integer,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_accounting_journal(uuid,uuid,uuid,date,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_journal(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_general_ledger(uuid,date,date,timestamptz,uuid,uuid,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_trial_balance(uuid,date,timestamptz,uuid,integer,integer) TO service_role;

COMMIT;
