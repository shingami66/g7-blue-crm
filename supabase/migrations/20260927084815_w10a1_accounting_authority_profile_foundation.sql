-- W10A1: protected accounting capabilities and company profile foundation.
-- Documentation authority: W10A1 bounded implementation task.
-- This migration creates no profile instance, profile version, or user grant.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.app_users') IS NULL
     OR to_regclass('public.company_settings') IS NULL
     OR to_regclass('public.audit_logs') IS NULL THEN
    RAISE EXCEPTION 'w10a1 preflight: required app_users, company_settings, or audit_logs table missing';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('app_users','id','uuid'), ('app_users','is_active','boolean'),
      ('company_settings','id','uuid'), ('company_settings','setting_key','text'),
      ('company_settings','currency','text'), ('company_settings','vat_mode','text'),
      ('audit_logs','id','uuid'), ('audit_logs','action','text'),
      ('audit_logs','entity_type','text'), ('audit_logs','entity_id','uuid'),
      ('audit_logs','user_id','text'), ('audit_logs','details','jsonb'),
      ('audit_logs','timestamp','timestamp with time zone')
    ) AS required(table_name,column_name,type_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_attribute a
      WHERE a.attrelid = to_regclass('public.' || required.table_name)
        AND a.attname = required.column_name AND a.attnum > 0
        AND NOT a.attisdropped
        AND format_type(a.atttypid,a.atttypmod) LIKE required.type_name || '%'
    )
  ) THEN
    RAISE EXCEPTION 'w10a1 preflight: required column or type mismatch';
  END IF;

  IF to_regclass('public.accounting_profiles') IS NOT NULL
     OR to_regclass('public.accounting_profile_versions') IS NOT NULL
     OR to_regclass('public.accounting_capability_catalog') IS NOT NULL
     OR to_regclass('public.accounting_capability_events') IS NOT NULL
     OR to_regclass('public.accounting_foundation_events') IS NOT NULL THEN
    RAISE EXCEPTION 'w10a1 preflight: target accounting foundation relation already exists';
  END IF;
  IF to_regprocedure('public.get_accounting_capability(uuid,text)') IS NOT NULL
     OR to_regprocedure('public.get_accounting_profile(uuid)') IS NOT NULL
     OR to_regprocedure('public.list_accounting_capability_assignments(uuid,uuid)') IS NOT NULL
     OR to_regprocedure('public.update_accounting_profile(uuid,integer,jsonb,text,text,uuid)') IS NOT NULL
     OR to_regprocedure('public.set_accounting_capability(uuid,uuid,text,text,timestamp with time zone,integer,text,text,uuid)') IS NOT NULL
     OR to_regprocedure('public.guard_accounting_profile_identity()') IS NOT NULL
     OR to_regprocedure('public.prevent_accounting_foundation_history_mutation()') IS NOT NULL
     OR to_regprocedure('public.validate_accounting_profile_version()') IS NOT NULL THEN
    RAISE EXCEPTION 'w10a1 preflight: target accounting foundation function signature already exists';
  END IF;
  IF to_regprocedure('extensions.digest(bytea,text)') IS NULL THEN
    RAISE EXCEPTION 'w10a1 preflight: pgcrypto digest function unavailable in extensions schema';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    RAISE EXCEPTION 'w10a1 preflight: expected Supabase application roles missing';
  END IF;
END;
$preflight$;

CREATE TABLE public.accounting_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton_key text NOT NULL DEFAULT 'g7',
  company_settings_id uuid NOT NULL,
  current_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT accounting_profiles_singleton_key UNIQUE (singleton_key),
  CONSTRAINT accounting_profiles_singleton_check CHECK (singleton_key='g7'),
  CONSTRAINT accounting_profiles_company_settings_key UNIQUE (company_settings_id),
  CONSTRAINT accounting_profiles_company_settings_fkey
    FOREIGN KEY (company_settings_id) REFERENCES public.company_settings(id) ON DELETE RESTRICT
);

CREATE TABLE public.accounting_foundation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN (
    'accounting_capability_changed','accounting_profile_updated'
  )),
  entity_type text NOT NULL CHECK (entity_type IN ('capability_assignment','accounting_profile')),
  entity_id uuid NOT NULL,
  entity_version integer NOT NULL CHECK (entity_version > 0),
  actor_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  evidence_ref text CHECK (evidence_ref IS NULL OR length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  payload_fingerprint text NOT NULL CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),
  result_reference text NOT NULL CHECK (length(btrim(result_reference)) BETWEEN 1 AND 500),
  occurred_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT accounting_foundation_events_actor_request_key
    UNIQUE (profile_id,actor_user_id,request_id),
  CONSTRAINT accounting_foundation_events_entity_version_key
    UNIQUE (profile_id,entity_type,entity_id,entity_version)
);
CREATE INDEX accounting_foundation_events_entity_idx
  ON public.accounting_foundation_events(entity_type,entity_id,entity_version);

CREATE TABLE public.accounting_profile_versions (
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  previous_version integer,
  framework_key text NOT NULL CHECK (framework_key='SA_IFRS_FOR_SMES'),
  framework_edition integer NOT NULL CHECK (framework_edition=2025),
  policy_version text NOT NULL CHECK (length(btrim(policy_version)) BETWEEN 1 AND 80),
  endorsement_context text NOT NULL CHECK (length(btrim(endorsement_context)) BETWEEN 1 AND 500),
  professional_validation_state text NOT NULL DEFAULT 'DEFERRED'
    CHECK (professional_validation_state='DEFERRED'),
  professional_validation_evidence_ref text,
  functional_currency text NOT NULL CHECK (functional_currency='SAR'),
  fiscal_start_month integer NOT NULL CHECK (fiscal_start_month=1),
  fiscal_start_day integer NOT NULL CHECK (fiscal_start_day=1),
  fiscal_end_month integer NOT NULL CHECK (fiscal_end_month=12),
  fiscal_end_day integer NOT NULL CHECK (fiscal_end_day=31),
  fiscal_timezone text NOT NULL CHECK (fiscal_timezone='Asia/Riyadh'),
  accounting_start_date date,
  cutover_boundary_date date,
  legal_fiscal_evidence_pending boolean NOT NULL DEFAULT true,
  legal_fiscal_evidence_ref text,
  vat_mode text NOT NULL DEFAULT 'not_registered' CHECK (vat_mode='not_registered'),
  zatca_state text NOT NULL DEFAULT 'INACTIVE' CHECK (zatca_state='INACTIVE'),
  fatoora_state text NOT NULL DEFAULT 'INACTIVE' CHECK (fatoora_state='INACTIVE'),
  activation_state text NOT NULL DEFAULT 'INACTIVE'
    CHECK (activation_state IN ('INACTIVE','DEV_PROVISIONAL')),
  effective_from timestamptz NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  evidence_ref text,
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  CONSTRAINT accounting_profile_versions_pkey PRIMARY KEY (profile_id,version),
  CONSTRAINT accounting_profile_versions_previous_fkey
    FOREIGN KEY (profile_id,previous_version)
    REFERENCES public.accounting_profile_versions(profile_id,version) ON DELETE RESTRICT,
  CONSTRAINT accounting_profile_versions_event_key UNIQUE (foundation_event_id),
  CONSTRAINT accounting_profile_versions_start_cutover_check
    CHECK (cutover_boundary_date IS NULL OR accounting_start_date IS NULL
      OR cutover_boundary_date >= accounting_start_date),
  CONSTRAINT accounting_profile_versions_dev_complete_check CHECK (
    activation_state <> 'DEV_PROVISIONAL' OR (
      accounting_start_date IS NOT NULL AND cutover_boundary_date IS NOT NULL
      AND vat_mode='not_registered' AND zatca_state='INACTIVE'
      AND fatoora_state='INACTIVE'
    )
  ),
  CONSTRAINT accounting_profile_versions_evidence_ref_check
    CHECK (evidence_ref IS NULL OR length(btrim(evidence_ref)) BETWEEN 1 AND 2000)
);

ALTER TABLE public.accounting_profiles
  ADD CONSTRAINT accounting_profiles_current_version_fkey
  FOREIGN KEY (id,current_version)
  REFERENCES public.accounting_profile_versions(profile_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_capability_catalog (
  capability text PRIMARY KEY,
  enabled boolean NOT NULL,
  runtime_allow_grantable boolean NOT NULL,
  owner_slice text NOT NULL,
  CONSTRAINT accounting_capability_catalog_key_check CHECK (capability IN (
    'accounting:view','accounting:manage_profile','accounting:manage_authority',
    'accounting:manage_chart','accounting:manage_periods',
    'accounting:prepare_journal','accounting:post_journal',
    'accounting:reverse_journal','accounting:reconcile_bank',
    'accounting:close_period','accounting:reopen_period','accounting:view_statements'
  )),
  CONSTRAINT accounting_capability_catalog_slice_check CHECK (owner_slice IN ('W10A1','W10A2','W10B','W10C','W10D','W10E','W10F','W10G','W10H','W10I')),
  CONSTRAINT accounting_capability_catalog_state_check CHECK (
    (capability IN ('accounting:view','accounting:manage_profile')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_authority'
      AND enabled AND NOT runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_chart'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability='accounting:manage_periods'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability IN ('accounting:prepare_journal','accounting:post_journal',
      'accounting:reverse_journal') AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10B')
    OR (capability='accounting:reconcile_bank'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10G')
    OR (capability IN ('accounting:close_period','accounting:reopen_period')
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I')
    OR (capability='accounting:view_statements'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10H')
  )
);

CREATE TABLE public.accounting_capability_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  target_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  capability text NOT NULL REFERENCES public.accounting_capability_catalog(capability) ON DELETE RESTRICT,
  revision integer NOT NULL CHECK (revision > 0),
  effect text NOT NULL CHECK (effect IN ('ALLOW','DENY','REVOKE')),
  expires_at timestamptz,
  actor_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  evidence_ref text CHECK (evidence_ref IS NULL OR length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  request_id uuid NOT NULL,
  payload_fingerprint text NOT NULL CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT accounting_capability_events_revision_key
    UNIQUE (profile_id,target_user_id,capability,revision),
  CONSTRAINT accounting_capability_events_event_key UNIQUE (foundation_event_id),
  CONSTRAINT accounting_capability_events_expiry_check CHECK (
    expires_at IS NULL OR expires_at > created_at
  )
);

INSERT INTO public.accounting_capability_catalog(capability,enabled,runtime_allow_grantable,owner_slice) VALUES
 ('accounting:view',true,true,'W10A1'),
 ('accounting:manage_profile',true,true,'W10A1'),
 ('accounting:manage_authority',true,false,'W10A1'),
 ('accounting:manage_chart',false,false,'W10A2'),
 ('accounting:manage_periods',false,false,'W10A2'),
 ('accounting:prepare_journal',false,false,'W10B'),
 ('accounting:post_journal',false,false,'W10B'),
 ('accounting:reverse_journal',false,false,'W10B'),
 ('accounting:reconcile_bank',false,false,'W10G'),
 ('accounting:close_period',false,false,'W10I'),
 ('accounting:reopen_period',false,false,'W10I'),
 ('accounting:view_statements',false,false,'W10H');

CREATE FUNCTION public.get_accounting_capability(p_actor_user_id uuid,p_capability text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $resolve$
DECLARE v_profile_id uuid; v_enabled boolean; v_effect text; v_expires timestamptz;
BEGIN
  IF p_actor_user_id IS NULL OR p_capability IS NULL OR p_capability !~ '^accounting:' THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE) THEN RETURN false; END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile_id IS NULL THEN RETURN false; END IF;
  SELECT c.enabled INTO v_enabled FROM public.accounting_capability_catalog c WHERE c.capability=p_capability;
  IF NOT COALESCE(v_enabled,false) THEN RETURN false; END IF;
  SELECT e.effect,e.expires_at INTO v_effect,v_expires
    FROM public.accounting_capability_events e
    WHERE e.profile_id=v_profile_id AND e.target_user_id=p_actor_user_id AND e.capability=p_capability
    ORDER BY e.revision DESC LIMIT 1;
  RETURN COALESCE(v_effect='ALLOW' AND (v_expires IS NULL OR v_expires>statement_timestamp()),false);
END;
$resolve$;

CREATE FUNCTION public.guard_accounting_profile_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $guard$
DECLARE v_settings_key text;
BEGIN
  IF TG_OP='INSERT' THEN
    SELECT cs.setting_key INTO v_settings_key FROM public.company_settings cs
      WHERE cs.id=NEW.company_settings_id;
    IF NOT FOUND OR v_settings_key IS DISTINCT FROM 'default' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_COMPANY_SETTINGS_IDENTITY_INVALID';
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_PROFILE_IDENTITY_IMMUTABLE';
  END IF;
  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.singleton_key IS DISTINCT FROM NEW.singleton_key
     OR OLD.company_settings_id IS DISTINCT FROM NEW.company_settings_id THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_PROFILE_IDENTITY_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$guard$;

CREATE FUNCTION public.prevent_accounting_foundation_history_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $immutable$
BEGIN
  RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_FOUNDATION_HISTORY_IMMUTABLE';
END;
$immutable$;

CREATE FUNCTION public.validate_accounting_profile_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $validate$
DECLARE v_prior public.accounting_profile_versions%ROWTYPE;
        v_currency text;
        v_vat_mode text;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_PROFILE_VERSION_APPEND_ONLY'; END IF;
  IF NEW.version=1 THEN
    IF NEW.previous_version IS NOT NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PROFILE_INITIAL_REVISION_INVALID'; END IF;
  ELSE
    SELECT * INTO v_prior FROM public.accounting_profile_versions
      WHERE profile_id=NEW.profile_id AND version=NEW.previous_version FOR SHARE;
    IF NOT FOUND OR NEW.previous_version<>NEW.version-1 THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_PROFILE_REVISION_CONFLICT'; END IF;
    IF v_prior.activation_state='DEV_PROVISIONAL' AND (
      NEW.framework_key IS DISTINCT FROM v_prior.framework_key
      OR NEW.framework_edition IS DISTINCT FROM v_prior.framework_edition
      OR NEW.functional_currency IS DISTINCT FROM v_prior.functional_currency
      OR NEW.fiscal_start_month IS DISTINCT FROM v_prior.fiscal_start_month
      OR NEW.fiscal_start_day IS DISTINCT FROM v_prior.fiscal_start_day
      OR NEW.fiscal_end_month IS DISTINCT FROM v_prior.fiscal_end_month
      OR NEW.fiscal_end_day IS DISTINCT FROM v_prior.fiscal_end_day
      OR NEW.fiscal_timezone IS DISTINCT FROM v_prior.fiscal_timezone
      OR NEW.accounting_start_date IS DISTINCT FROM v_prior.accounting_start_date
      OR NEW.cutover_boundary_date IS DISTINCT FROM v_prior.cutover_boundary_date
      OR NEW.activation_state IS DISTINCT FROM 'DEV_PROVISIONAL'
    ) THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_PROFILE_TRANSITION_REQUIRED'; END IF;
  END IF;
  IF NEW.activation_state='DEV_PROVISIONAL' THEN
    SELECT cs.currency,cs.vat_mode INTO v_currency,v_vat_mode
      FROM public.accounting_profiles p
      JOIN public.company_settings cs ON cs.id=p.company_settings_id
      WHERE p.id=NEW.profile_id AND cs.setting_key='default' FOR SHARE OF cs;
    IF NOT FOUND OR v_currency IS DISTINCT FROM 'SAR' OR v_vat_mode IS DISTINCT FROM 'not_registered' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_COMPANY_SETTINGS_MISMATCH';
    END IF;
  END IF;
  RETURN NEW;
END;
$validate$;

CREATE TRIGGER accounting_profiles_guard_identity
BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_profile_identity();
CREATE TRIGGER accounting_profiles_guard_truncate
BEFORE TRUNCATE ON public.accounting_profiles
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_profile_versions_validate
BEFORE INSERT OR UPDATE ON public.accounting_profile_versions
FOR EACH ROW EXECUTE FUNCTION public.validate_accounting_profile_version();
CREATE TRIGGER accounting_profile_versions_immutable
BEFORE UPDATE OR DELETE ON public.accounting_profile_versions
FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_profile_versions_no_truncate
BEFORE TRUNCATE ON public.accounting_profile_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_capability_events_immutable
BEFORE UPDATE OR DELETE ON public.accounting_capability_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_capability_events_no_truncate
BEFORE TRUNCATE ON public.accounting_capability_events
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_foundation_events_immutable
BEFORE UPDATE OR DELETE ON public.accounting_foundation_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_foundation_events_no_truncate
BEFORE TRUNCATE ON public.accounting_foundation_events
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();

CREATE FUNCTION public.list_accounting_capability_assignments(p_actor_user_id uuid,p_target_user_id uuid)
RETURNS TABLE(capability text,effect text,revision integer,expires_at timestamptz,actor_user_id uuid,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $list$
BEGIN
  PERFORM 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_ACTOR_INACTIVE_OR_MISSING'; END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_authority') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_CAPABILITY_DENIED';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_target_user_id) THEN
    RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='ACCOUNTING_TARGET_USER_NOT_FOUND';
  END IF;
  RETURN QUERY
    SELECT e.capability,e.effect,e.revision,e.expires_at,e.actor_user_id,e.created_at
    FROM public.accounting_profiles p
    JOIN public.accounting_capability_events e ON e.profile_id=p.id
    JOIN public.accounting_capability_catalog c
      ON c.capability=e.capability AND c.enabled AND c.owner_slice='W10A1'
    WHERE p.singleton_key='g7' AND e.target_user_id=p_target_user_id
      AND e.revision=(SELECT max(latest.revision) FROM public.accounting_capability_events latest
        WHERE latest.profile_id=e.profile_id AND latest.target_user_id=e.target_user_id AND latest.capability=e.capability)
    ORDER BY e.capability;
END;
$list$;

CREATE FUNCTION public.get_accounting_profile(p_actor_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $read_profile$
DECLARE v_profile public.accounting_profiles%ROWTYPE;
        v_version public.accounting_profile_versions%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_ACTOR_INACTIVE_OR_MISSING'; END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:view')
     AND NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_profile') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_CAPABILITY_DENIED';
  END IF;
  SELECT * INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN jsonb_build_object('state','NOT_INITIALIZED'); END IF;
  SELECT * INTO v_version FROM public.accounting_profile_versions v
    WHERE v.profile_id=v_profile.id AND v.version=v_profile.current_version;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='XX001',MESSAGE='ACCOUNTING_PROFILE_VERSION_UNAVAILABLE'; END IF;
  RETURN jsonb_build_object(
    'id',v_profile.id,'singleton_key',v_profile.singleton_key,'company_settings_id',v_profile.company_settings_id,
    'version',v_version.version,'framework_key',v_version.framework_key,'framework_edition',v_version.framework_edition,
    'policy_version',v_version.policy_version,'endorsement_context',v_version.endorsement_context,
    'professional_validation_state',v_version.professional_validation_state,
    'professional_validation_evidence_ref',v_version.professional_validation_evidence_ref,
    'functional_currency',v_version.functional_currency,'fiscal_start_month',v_version.fiscal_start_month,
    'fiscal_start_day',v_version.fiscal_start_day,'fiscal_end_month',v_version.fiscal_end_month,
    'fiscal_end_day',v_version.fiscal_end_day,'fiscal_timezone',v_version.fiscal_timezone,
    'accounting_start_date',v_version.accounting_start_date,'cutover_boundary_date',v_version.cutover_boundary_date,
    'legal_fiscal_evidence_pending',v_version.legal_fiscal_evidence_pending,
    'legal_fiscal_evidence_ref',v_version.legal_fiscal_evidence_ref,'vat_mode',v_version.vat_mode,
    'zatca_state',v_version.zatca_state,'fatoora_state',v_version.fatoora_state,
    'activation_state',v_version.activation_state,'effective_from',v_version.effective_from,
    'reason',v_version.reason,'evidence_ref',v_version.evidence_ref,'created_by',v_version.created_by,'created_at',v_version.created_at
  );
END;
$read_profile$;

CREATE FUNCTION public.set_accounting_capability(
  p_actor_user_id uuid,p_target_user_id uuid,p_capability text,p_effect text,
  p_expires_at timestamptz,p_expected_revision integer,p_reason text,p_evidence_ref text,p_request_id uuid
)
RETURNS TABLE(error_code text,capability_event_id uuid,revision integer,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,extensions AS $set_capability$
DECLARE v_profile_id uuid; v_catalog public.accounting_capability_catalog%ROWTYPE;
        v_current_revision integer; v_new_revision integer; v_actor_ok boolean;
        v_target_count integer; v_fingerprint text; v_prior_event public.accounting_foundation_events%ROWTYPE;
        v_foundation_id uuid; v_capability_event_id uuid; v_now timestamptz:=transaction_timestamp();
        v_assignment_lock bigint; v_request_lock bigint; v_authority_lock bigint; v_lock bigint;
BEGIN
  IF p_actor_user_id IS NULL OR p_target_user_id IS NULL OR p_capability IS NULL
     OR p_effect IS NULL OR p_actor_user_id=p_target_user_id
     OR p_request_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0
     OR p_effect NOT IN ('ALLOW','DENY','REVOKE') OR NULLIF(btrim(p_reason),'') IS NULL
     OR length(btrim(p_reason))>2000
     OR (p_evidence_ref IS NOT NULL AND (NULLIF(btrim(p_evidence_ref),'') IS NULL OR length(btrim(p_evidence_ref))>2000)) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  PERFORM u.id FROM public.app_users u
    WHERE u.id IN (p_actor_user_id,p_target_user_id) ORDER BY u.id FOR SHARE;
  GET DIAGNOSTICS v_target_count=ROW_COUNT;
  IF v_target_count<>2 THEN RETURN QUERY SELECT 'user_not_found'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  SELECT u.is_active INTO v_actor_ok FROM public.app_users u WHERE u.id=p_actor_user_id;
  IF v_actor_ok IS DISTINCT FROM true THEN RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  v_assignment_lock:=pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_target_user_id::text||':'||p_capability,0);
  v_authority_lock:=pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_actor_user_id::text||':accounting:manage_authority',0);
  v_request_lock:=pg_catalog.hashtextextended('w10a1-request:'||v_profile_id::text||':'||p_actor_user_id::text||':'||p_request_id::text,0);
  FOR v_lock IN
    SELECT DISTINCT lock_id FROM unnest(ARRAY[v_assignment_lock,v_authority_lock,v_request_lock]) AS locks(lock_id)
    ORDER BY lock_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock);
  END LOOP;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_authority') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  SELECT COALESCE(max(e.revision),0) INTO v_current_revision FROM public.accounting_capability_events e
   WHERE e.profile_id=v_profile_id AND e.target_user_id=p_target_user_id AND e.capability=p_capability;
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'target',p_target_user_id,'capability',p_capability,'effect',p_effect,
    'expires_at',p_expires_at,'expected_revision',p_expected_revision,
    'reason',btrim(p_reason),'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');
  SELECT * INTO v_prior_event FROM public.accounting_foundation_events e
   WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_prior_event.event_type='accounting_capability_changed'
       AND v_prior_event.payload_fingerprint=v_fingerprint THEN
      RETURN QUERY SELECT NULL::text,v_prior_event.entity_id,v_prior_event.entity_version,true; RETURN;
    END IF;
    RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  SELECT * INTO v_catalog FROM public.accounting_capability_catalog c WHERE c.capability=p_capability;
  IF NOT FOUND THEN RETURN QUERY SELECT 'unknown_capability'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  IF NOT v_catalog.enabled THEN
    RETURN QUERY SELECT 'capability_disabled'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF p_effect='ALLOW' AND (NOT v_catalog.enabled OR NOT v_catalog.runtime_allow_grantable
     OR p_capability='accounting:manage_authority') THEN
    RETURN QUERY SELECT 'capability_not_grantable'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF p_effect='ALLOW' AND p_expires_at IS NOT NULL AND p_expires_at<=v_now THEN
    RETURN QUERY SELECT 'invalid_expiry'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF p_effect<>'ALLOW' AND p_expires_at IS NOT NULL THEN
    RETURN QUERY SELECT 'invalid_expiry'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF v_current_revision<>p_expected_revision THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,v_current_revision,false; RETURN;
  END IF;
  v_new_revision:=v_current_revision+1;
  v_capability_event_id:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(
    profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
    reason,evidence_ref,payload_fingerprint,result_reference
  ) VALUES (
    v_profile_id,'accounting_capability_changed','capability_assignment',v_capability_event_id,
    v_new_revision,p_actor_user_id,p_request_id,btrim(p_reason),NULLIF(btrim(p_evidence_ref),
    ''),v_fingerprint,p_capability
  ) RETURNING id INTO v_foundation_id;
  INSERT INTO public.accounting_capability_events(
    id,profile_id,target_user_id,capability,revision,effect,expires_at,actor_user_id,
    reason,evidence_ref,request_id,payload_fingerprint,foundation_event_id,created_at
  ) VALUES (
    v_capability_event_id,v_profile_id,p_target_user_id,p_capability,v_new_revision,
    p_effect,p_expires_at,p_actor_user_id,btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),
    p_request_id,v_fingerprint,v_foundation_id,v_now
  );
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES ('create','accounting_capability_event',v_capability_event_id,p_actor_user_id::text,
    jsonb_build_object('event_type','accounting_capability_changed','profile_id',v_profile_id,
      'target_user_id',p_target_user_id,'capability',p_capability,'effect',p_effect,
      'revision',v_new_revision,'request_id',p_request_id),v_now);
  RETURN QUERY SELECT NULL::text,v_capability_event_id,v_new_revision,false;
END;
$set_capability$;

CREATE FUNCTION public.update_accounting_profile(
  p_actor_user_id uuid,p_expected_version integer,p_profile jsonb,p_reason text,p_evidence_ref text,p_request_id uuid
)
RETURNS TABLE(error_code text,profile_id uuid,version integer,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,extensions AS $update_profile$
DECLARE v_profile public.accounting_profiles%ROWTYPE; v_old public.accounting_profile_versions%ROWTYPE;
        v_company_currency text; v_company_vat_mode text; v_now timestamptz:=transaction_timestamp();
        v_fingerprint text; v_prior_event public.accounting_foundation_events%ROWTYPE;
        v_profile_id uuid; v_profile_lock bigint; v_request_lock bigint; v_lock bigint;
        v_foundation_id uuid; v_version integer; v_keys text[]:=ARRAY[
 'framework_key','framework_edition','policy_version','endorsement_context',
 'professional_validation_state','professional_validation_evidence_ref','functional_currency',
 'fiscal_start_month','fiscal_start_day','fiscal_end_month','fiscal_end_day','fiscal_timezone',
 'accounting_start_date','cutover_boundary_date','legal_fiscal_evidence_pending',
 'legal_fiscal_evidence_ref','vat_mode','zatca_state','fatoora_state','activation_state'
];
BEGIN
  IF p_actor_user_id IS NULL OR p_expected_version IS NULL OR p_expected_version<0
    OR p_request_id IS NULL OR p_profile IS NULL OR jsonb_typeof(p_profile)<>'object'
    OR NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason))>2000
    OR (p_evidence_ref IS NOT NULL AND (NULLIF(btrim(p_evidence_ref),'') IS NULL OR length(btrim(p_evidence_ref))>2000)) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF jsonb_object_length(p_profile)<>20 OR NOT (p_profile ?& v_keys) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF jsonb_typeof(p_profile->'framework_key') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'framework_edition') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_profile->'policy_version') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'endorsement_context') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'professional_validation_state') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'professional_validation_evidence_ref') NOT IN ('string','null')
    OR jsonb_typeof(p_profile->'functional_currency') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'fiscal_start_month') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_profile->'fiscal_start_day') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_profile->'fiscal_end_month') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_profile->'fiscal_end_day') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_profile->'fiscal_timezone') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'accounting_start_date') NOT IN ('string','null')
    OR jsonb_typeof(p_profile->'cutover_boundary_date') NOT IN ('string','null')
    OR jsonb_typeof(p_profile->'legal_fiscal_evidence_pending') IS DISTINCT FROM 'boolean'
    OR jsonb_typeof(p_profile->'legal_fiscal_evidence_ref') NOT IN ('string','null')
    OR jsonb_typeof(p_profile->'vat_mode') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'zatca_state') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'fatoora_state') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_profile->'activation_state') IS DISTINCT FROM 'string' THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  PERFORM 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE FOR SHARE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  v_profile_lock:=pg_catalog.hashtextextended('w10a1-assignment:'||v_profile_id::text||':'||p_actor_user_id::text||':accounting:manage_profile',0);
  v_request_lock:=pg_catalog.hashtextextended('w10a1-request:'||v_profile_id::text||':'||p_actor_user_id::text||':'||p_request_id::text,0);
  FOR v_lock IN
    SELECT DISTINCT lock_id FROM unnest(ARRAY[v_profile_lock,v_request_lock]) AS locks(lock_id)
    ORDER BY lock_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock);
  END LOOP;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_profile') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  SELECT * INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7' FOR UPDATE;
  IF NOT FOUND OR v_profile.id IS DISTINCT FROM v_profile_id THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'expected_version',p_expected_version,'profile',p_profile,'reason',btrim(p_reason),
    'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');
  SELECT * INTO v_prior_event FROM public.accounting_foundation_events e
    WHERE e.profile_id=v_profile.id AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_prior_event.event_type='accounting_profile_updated' AND v_prior_event.payload_fingerprint=v_fingerprint THEN
      RETURN QUERY SELECT NULL::text,v_profile.id,v_prior_event.entity_version,true; RETURN;
    END IF;
    RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF v_profile.current_version<>p_expected_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,v_profile.id,v_profile.current_version,false; RETURN;
  END IF;
  SELECT * INTO v_old FROM public.accounting_profile_versions v
    WHERE v.profile_id=v_profile.id AND v.version=v_profile.current_version FOR SHARE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_version_unavailable'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  IF v_old.activation_state='DEV_PROVISIONAL' AND (
    p_profile->>'framework_key' IS DISTINCT FROM v_old.framework_key
    OR (p_profile->>'framework_edition')::integer IS DISTINCT FROM v_old.framework_edition
    OR p_profile->>'functional_currency' IS DISTINCT FROM v_old.functional_currency
    OR (p_profile->>'fiscal_start_month')::integer IS DISTINCT FROM v_old.fiscal_start_month
    OR (p_profile->>'fiscal_start_day')::integer IS DISTINCT FROM v_old.fiscal_start_day
    OR (p_profile->>'fiscal_end_month')::integer IS DISTINCT FROM v_old.fiscal_end_month
    OR (p_profile->>'fiscal_end_day')::integer IS DISTINCT FROM v_old.fiscal_end_day
    OR p_profile->>'fiscal_timezone' IS DISTINCT FROM v_old.fiscal_timezone
    OR (p_profile->>'accounting_start_date')::date IS DISTINCT FROM v_old.accounting_start_date
    OR (p_profile->>'cutover_boundary_date')::date IS DISTINCT FROM v_old.cutover_boundary_date
  ) THEN RETURN QUERY SELECT 'transition_required'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  IF p_profile->>'framework_key' IS DISTINCT FROM 'SA_IFRS_FOR_SMES'
    OR (p_profile->>'framework_edition')::integer IS DISTINCT FROM 2025
    OR p_profile->>'functional_currency' IS DISTINCT FROM 'SAR'
    OR (p_profile->>'fiscal_start_month')::integer IS DISTINCT FROM 1
    OR (p_profile->>'fiscal_start_day')::integer IS DISTINCT FROM 1
    OR (p_profile->>'fiscal_end_month')::integer IS DISTINCT FROM 12
    OR (p_profile->>'fiscal_end_day')::integer IS DISTINCT FROM 31
    OR p_profile->>'fiscal_timezone' IS DISTINCT FROM 'Asia/Riyadh'
    OR p_profile->>'professional_validation_state' IS DISTINCT FROM 'DEFERRED'
    OR p_profile->>'vat_mode' IS DISTINCT FROM 'not_registered'
    OR p_profile->>'zatca_state' IS DISTINCT FROM 'INACTIVE'
    OR p_profile->>'fatoora_state' IS DISTINCT FROM 'INACTIVE'
    OR p_profile->>'activation_state' NOT IN ('INACTIVE','DEV_PROVISIONAL')
    OR p_profile->>'activation_state' IS NULL THEN
    RETURN QUERY SELECT 'unsupported_profile_value'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF (p_profile->>'activation_state')='DEV_PROVISIONAL' THEN
    IF NULLIF(p_profile->>'accounting_start_date','') IS NULL
      OR NULLIF(p_profile->>'cutover_boundary_date','') IS NULL
      OR (p_profile->>'accounting_start_date')::date>(p_profile->>'cutover_boundary_date')::date THEN
      RETURN QUERY SELECT 'profile_incomplete'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    SELECT cs.currency,cs.vat_mode INTO v_company_currency,v_company_vat_mode
      FROM public.company_settings cs WHERE cs.id=v_profile.company_settings_id
      AND cs.setting_key='default' FOR SHARE;
    IF NOT FOUND OR v_company_currency IS DISTINCT FROM 'SAR' OR v_company_vat_mode IS DISTINCT FROM 'not_registered' THEN
      RETURN QUERY SELECT 'company_settings_mismatch'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
  END IF;
  v_version:=v_profile.current_version+1;
  INSERT INTO public.accounting_foundation_events(
    profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
    reason,evidence_ref,payload_fingerprint,result_reference
  ) VALUES (
    v_profile.id,'accounting_profile_updated','accounting_profile',v_profile.id,v_version,
    p_actor_user_id,p_request_id,btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),
    v_fingerprint,'accounting_profiles/'||v_profile.id||'/'||v_version
  ) RETURNING id INTO v_foundation_id;
  INSERT INTO public.accounting_profile_versions(
    profile_id,version,previous_version,framework_key,framework_edition,policy_version,
    endorsement_context,professional_validation_state,professional_validation_evidence_ref,
    functional_currency,fiscal_start_month,fiscal_start_day,fiscal_end_month,fiscal_end_day,
    fiscal_timezone,accounting_start_date,cutover_boundary_date,legal_fiscal_evidence_pending,
    legal_fiscal_evidence_ref,vat_mode,zatca_state,fatoora_state,activation_state,effective_from,
    reason,evidence_ref,created_by,created_at,foundation_event_id
  ) VALUES (
    v_profile.id,v_version,v_old.version,p_profile->>'framework_key',
    (p_profile->>'framework_edition')::integer,p_profile->>'policy_version',p_profile->>'endorsement_context',
    p_profile->>'professional_validation_state',NULLIF(p_profile->>'professional_validation_evidence_ref',''),
    p_profile->>'functional_currency',(p_profile->>'fiscal_start_month')::integer,
    (p_profile->>'fiscal_start_day')::integer,(p_profile->>'fiscal_end_month')::integer,
    (p_profile->>'fiscal_end_day')::integer,p_profile->>'fiscal_timezone',
    NULLIF(p_profile->>'accounting_start_date','')::date,NULLIF(p_profile->>'cutover_boundary_date','')::date,
    (p_profile->>'legal_fiscal_evidence_pending')::boolean,
    NULLIF(p_profile->>'legal_fiscal_evidence_ref',''),p_profile->>'vat_mode',p_profile->>'zatca_state',
    p_profile->>'fatoora_state',p_profile->>'activation_state',v_now,btrim(p_reason),
    NULLIF(btrim(p_evidence_ref),''),p_actor_user_id,v_now,v_foundation_id
  );
  UPDATE public.accounting_profiles SET current_version=v_version WHERE id=v_profile.id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES ('update','accounting_profile',v_profile.id,p_actor_user_id::text,
    jsonb_build_object('event_type','accounting_profile_updated','version',v_version,
      'request_id',p_request_id,'activation_state',p_profile->>'activation_state'),v_now);
  RETURN QUERY SELECT NULL::text,v_profile.id,v_version,false;
EXCEPTION
  WHEN invalid_text_representation OR datetime_field_overflow OR numeric_value_out_of_range THEN
    RETURN QUERY SELECT 'unsupported_profile_value'::text,NULL::uuid,NULL::integer,false;
    RETURN;
END;
$update_profile$;

ALTER TABLE public.accounting_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_profile_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_capability_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_capability_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_foundation_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.accounting_profiles,public.accounting_profile_versions,
  public.accounting_capability_catalog,public.accounting_capability_events,
  public.accounting_foundation_events FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_accounting_capability(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_accounting_profile(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.list_accounting_capability_assignments(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.update_accounting_profile(uuid,integer,jsonb,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.set_accounting_capability(uuid,uuid,text,text,timestamp with time zone,integer,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_accounting_profile_identity() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prevent_accounting_foundation_history_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.validate_accounting_profile_version() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_capability(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_profile(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_accounting_capability_assignments(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_accounting_profile(uuid,integer,jsonb,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_accounting_capability(uuid,uuid,text,text,timestamp with time zone,integer,text,text,uuid) TO service_role;

COMMIT;
