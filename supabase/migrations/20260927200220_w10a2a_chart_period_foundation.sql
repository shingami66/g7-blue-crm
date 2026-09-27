-- W10A2a: versioned Chart of Accounts and OPEN accounting-period foundation.
-- Uses W10A1 profile, explicit capability resolver, foundation events, and audit history.
-- Creates no company account identities or accounting periods.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL
     OR to_regclass('public.accounting_profile_versions') IS NULL
     OR to_regclass('public.accounting_capability_catalog') IS NULL
     OR to_regclass('public.accounting_capability_events') IS NULL
     OR to_regclass('public.accounting_foundation_events') IS NULL
     OR to_regclass('public.audit_logs') IS NULL
     OR to_regclass('public.app_users') IS NULL THEN
    RAISE EXCEPTION 'w10a2a preflight: W10A1 accounting authority foundation missing';
  END IF;
  IF to_regclass('public.accounting_accounts') IS NOT NULL
     OR to_regclass('public.accounting_account_versions') IS NOT NULL
     OR to_regclass('public.accounting_periods') IS NOT NULL
     OR to_regclass('public.accounting_period_versions') IS NOT NULL THEN
    RAISE EXCEPTION 'w10a2a preflight: target chart or period relation already exists';
  END IF;
  IF to_regprocedure('public.save_accounting_account(uuid,uuid,integer,jsonb,text,text,uuid)') IS NOT NULL
     OR to_regprocedure('public.list_accounting_accounts(uuid)') IS NOT NULL
     OR to_regprocedure('public.save_accounting_period(uuid,uuid,integer,jsonb,text,text,uuid)') IS NOT NULL
     OR to_regprocedure('public.list_accounting_periods(uuid)') IS NOT NULL
     OR to_regprocedure('public.guard_accounting_identity()') IS NOT NULL
     OR to_regprocedure('public.validate_accounting_account_version()') IS NOT NULL
     OR to_regprocedure('public.validate_accounting_period_version()') IS NOT NULL THEN
    RAISE EXCEPTION 'w10a2a preflight: target chart or period function signature already exists';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.accounting_capability_catalog
    WHERE capability='accounting:manage_chart' AND NOT enabled
      AND NOT runtime_allow_grantable AND owner_slice='W10A2'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.accounting_capability_catalog
    WHERE capability='accounting:manage_periods' AND NOT enabled
      AND NOT runtime_allow_grantable AND owner_slice='W10A2'
  ) THEN
    RAISE EXCEPTION 'w10a2a preflight: W10A2 capabilities are not at their expected disabled baseline';
  END IF;
END;
$preflight$;

ALTER TABLE public.accounting_foundation_events
  DROP CONSTRAINT accounting_foundation_events_event_type_check,
  DROP CONSTRAINT accounting_foundation_events_entity_type_check,
  ADD CONSTRAINT accounting_foundation_events_event_type_check CHECK (event_type IN (
    'accounting_capability_changed','accounting_profile_updated',
    'accounting_account_created','accounting_account_updated',
    'accounting_period_created','accounting_period_updated'
  )),
  ADD CONSTRAINT accounting_foundation_events_entity_type_check CHECK (entity_type IN (
    'capability_assignment','accounting_profile','accounting_account','accounting_period'
  ));

ALTER TABLE public.accounting_capability_catalog
  DROP CONSTRAINT accounting_capability_catalog_state_check;

UPDATE public.accounting_capability_catalog
SET enabled=true,runtime_allow_grantable=true
WHERE capability IN ('accounting:manage_chart','accounting:manage_periods')
  AND owner_slice='W10A2';

ALTER TABLE public.accounting_capability_catalog
  ADD CONSTRAINT accounting_capability_catalog_state_check CHECK (
    (capability IN ('accounting:view','accounting:manage_profile')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_authority'
      AND enabled AND NOT runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability IN ('accounting:manage_chart','accounting:manage_periods')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability IN ('accounting:prepare_journal','accounting:post_journal',
      'accounting:reverse_journal') AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10B')
    OR (capability='accounting:reconcile_bank'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10G')
    OR (capability IN ('accounting:close_period','accounting:reopen_period')
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I')
    OR (capability='accounting:view_statements'
      AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10H')
  );

CREATE TABLE public.accounting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  current_version integer NOT NULL DEFAULT 0 CHECK (current_version >= 0),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT accounting_accounts_profile_id_key UNIQUE (profile_id,id)
);

CREATE TABLE public.accounting_account_versions (
  profile_id uuid NOT NULL,
  account_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  previous_version integer,
  account_code text NOT NULL CHECK (length(btrim(account_code)) BETWEEN 1 AND 40),
  name_en text NOT NULL CHECK (length(btrim(name_en)) BETWEEN 1 AND 160),
  name_ar text NOT NULL CHECK (length(btrim(name_ar)) BETWEEN 1 AND 160),
  account_type text NOT NULL CHECK (account_type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  category text NOT NULL CHECK (length(btrim(category)) BETWEEN 1 AND 80),
  normal_balance text NOT NULL CHECK (normal_balance IN ('DEBIT','CREDIT')),
  account_kind text NOT NULL CHECK (account_kind IN ('POSTING','NON_POSTING')),
  parent_account_id uuid,
  is_active boolean NOT NULL,
  is_protected boolean NOT NULL DEFAULT false,
  control_classification text NOT NULL DEFAULT 'NONE' CHECK (control_classification IN (
    'NONE','ACCOUNTS_RECEIVABLE','ACCOUNTS_PAYABLE','CUSTOMER_ADVANCE',
    'SUPPLIER_ADVANCE','CONTRACT_LIABILITY','CASH_ACCOUNTABILITY','EMPLOYEE_ADVANCE'
  )),
  effective_from timestamptz NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  evidence_ref text CHECK (evidence_ref IS NULL OR length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  CONSTRAINT accounting_account_versions_pkey PRIMARY KEY (profile_id,account_id,version),
  CONSTRAINT accounting_account_versions_identity_fkey
    FOREIGN KEY (profile_id,account_id)
    REFERENCES public.accounting_accounts(profile_id,id) ON DELETE RESTRICT,
  CONSTRAINT accounting_account_versions_previous_fkey
    FOREIGN KEY (profile_id,account_id,previous_version)
    REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT,
  CONSTRAINT accounting_account_versions_parent_fkey
    FOREIGN KEY (profile_id,parent_account_id)
    REFERENCES public.accounting_accounts(profile_id,id) ON DELETE RESTRICT,
  CONSTRAINT accounting_account_versions_event_key UNIQUE (foundation_event_id),
  CONSTRAINT accounting_account_versions_control_protected_check
    CHECK (control_classification='NONE' OR is_protected)
);

ALTER TABLE public.accounting_accounts
  ADD CONSTRAINT accounting_accounts_current_version_fkey
  FOREIGN KEY (profile_id,id,current_version)
  REFERENCES public.accounting_account_versions(profile_id,account_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  current_version integer NOT NULL DEFAULT 0 CHECK (current_version >= 0),
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  CONSTRAINT accounting_periods_profile_id_key UNIQUE (profile_id,id)
);

CREATE TABLE public.accounting_period_versions (
  profile_id uuid NOT NULL,
  period_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  previous_version integer,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status='OPEN'),
  effective_from timestamptz NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  evidence_ref text CHECK (evidence_ref IS NULL OR length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  foundation_event_id uuid NOT NULL REFERENCES public.accounting_foundation_events(id) ON DELETE RESTRICT,
  CONSTRAINT accounting_period_versions_pkey PRIMARY KEY (profile_id,period_id,version),
  CONSTRAINT accounting_period_versions_identity_fkey
    FOREIGN KEY (profile_id,period_id)
    REFERENCES public.accounting_periods(profile_id,id) ON DELETE RESTRICT,
  CONSTRAINT accounting_period_versions_previous_fkey
    FOREIGN KEY (profile_id,period_id,previous_version)
    REFERENCES public.accounting_period_versions(profile_id,period_id,version) ON DELETE RESTRICT,
  CONSTRAINT accounting_period_versions_event_key UNIQUE (foundation_event_id),
  CONSTRAINT accounting_period_versions_date_boundary_check
    CHECK (isfinite(start_date) AND isfinite(end_date) AND end_date >= start_date)
);

ALTER TABLE public.accounting_periods
  ADD CONSTRAINT accounting_periods_current_version_fkey
  FOREIGN KEY (profile_id,id,current_version)
  REFERENCES public.accounting_period_versions(profile_id,period_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE FUNCTION public.guard_accounting_identity()
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
  RETURN NEW;
END;
$guard_identity$;

CREATE FUNCTION public.validate_accounting_account_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $validate_account$
DECLARE
  v_identity public.accounting_accounts%ROWTYPE;
  v_prior public.accounting_account_versions%ROWTYPE;
  v_parent public.accounting_account_versions%ROWTYPE;
  v_cycle boolean;
  v_event public.accounting_foundation_events%ROWTYPE;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('w10a2a-chart:'||NEW.profile_id::text,0)
  );
  IF TG_OP<>'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_ACCOUNT_VERSION_APPEND_ONLY';
  END IF;
  SELECT * INTO v_identity FROM public.accounting_accounts a
    WHERE a.profile_id=NEW.profile_id AND a.id=NEW.account_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='ACCOUNTING_ACCOUNT_IDENTITY_NOT_FOUND';
  END IF;
  IF NEW.version=1 THEN
    IF NEW.previous_version IS NOT NULL OR v_identity.current_version<>0 THEN
      RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_ACCOUNT_REVISION_CONFLICT';
    END IF;
  ELSE
    SELECT * INTO v_prior FROM public.accounting_account_versions v
      WHERE v.profile_id=NEW.profile_id AND v.account_id=NEW.account_id
        AND v.version=NEW.previous_version FOR SHARE;
    IF NOT FOUND OR NEW.previous_version<>NEW.version-1
       OR v_identity.current_version<>NEW.previous_version THEN
      RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_ACCOUNT_REVISION_CONFLICT';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.accounting_accounts a
    JOIN public.accounting_account_versions v
      ON v.profile_id=a.profile_id AND v.account_id=a.id AND v.version=a.current_version
    WHERE a.profile_id=NEW.profile_id AND a.id<>NEW.account_id
      AND v.account_code=NEW.account_code
  ) THEN
    RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='ACCOUNTING_ACCOUNT_CODE_CONFLICT';
  END IF;

  IF NEW.parent_account_id IS NOT NULL THEN
    SELECT v.* INTO v_parent FROM public.accounting_accounts a
    JOIN public.accounting_account_versions v
      ON v.profile_id=a.profile_id AND v.account_id=a.id AND v.version=a.current_version
    WHERE a.profile_id=NEW.profile_id AND a.id=NEW.parent_account_id FOR SHARE OF a,v;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='ACCOUNTING_ACCOUNT_PARENT_NOT_FOUND';
    END IF;
    IF v_parent.account_kind<>'NON_POSTING' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_ACCOUNT_PARENT_MUST_BE_NON_POSTING';
    END IF;
    WITH RECURSIVE ancestors(account_id,parent_account_id) AS (
      SELECT a.id,v.parent_account_id
      FROM public.accounting_accounts a
      JOIN public.accounting_account_versions v
        ON v.profile_id=a.profile_id AND v.account_id=a.id AND v.version=a.current_version
      WHERE a.profile_id=NEW.profile_id AND a.id=NEW.parent_account_id
      UNION
      SELECT a.id,v.parent_account_id
      FROM ancestors x
      JOIN public.accounting_accounts a
        ON a.profile_id=NEW.profile_id AND a.id=x.parent_account_id
      JOIN public.accounting_account_versions v
        ON v.profile_id=a.profile_id AND v.account_id=a.id AND v.version=a.current_version
    )
    SELECT EXISTS (SELECT 1 FROM ancestors WHERE account_id=NEW.account_id)
      INTO v_cycle;
    IF v_cycle THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_ACCOUNT_HIERARCHY_CYCLE';
    END IF;
  END IF;

  IF NEW.account_kind='POSTING' AND EXISTS (
    SELECT 1 FROM public.accounting_accounts a
    JOIN public.accounting_account_versions v
      ON v.profile_id=a.profile_id AND v.account_id=a.id AND v.version=a.current_version
    WHERE a.profile_id=NEW.profile_id AND v.parent_account_id=NEW.account_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_ACCOUNT_HAS_CHILDREN';
  END IF;

  IF NEW.version>1 AND (
    v_prior.is_protected OR v_prior.control_classification<>'NONE'
  ) THEN
    IF NOT NEW.is_protected
       OR NEW.control_classification IS DISTINCT FROM v_prior.control_classification
       OR NEW.account_code IS DISTINCT FROM v_prior.account_code
       OR NEW.account_type IS DISTINCT FROM v_prior.account_type
       OR NEW.category IS DISTINCT FROM v_prior.category
       OR NEW.normal_balance IS DISTINCT FROM v_prior.normal_balance
       OR NEW.account_kind IS DISTINCT FROM v_prior.account_kind
       OR NEW.parent_account_id IS DISTINCT FROM v_prior.parent_account_id THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PROTECTED_ACCOUNT_INVARIANT';
    END IF;
  END IF;
  SELECT * INTO v_event FROM public.accounting_foundation_events e
    WHERE e.id=NEW.foundation_event_id;
  IF NOT FOUND OR v_event.profile_id IS DISTINCT FROM NEW.profile_id
     OR v_event.entity_type IS DISTINCT FROM 'accounting_account'
     OR v_event.entity_id IS DISTINCT FROM NEW.account_id
     OR v_event.entity_version IS DISTINCT FROM NEW.version
     OR v_event.actor_user_id IS DISTINCT FROM NEW.created_by
     OR (NEW.version IS DISTINCT FROM 1
         AND v_event.event_type IS DISTINCT FROM 'accounting_account_updated')
     OR (NEW.version=1
         AND v_event.event_type IS DISTINCT FROM 'accounting_account_created') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_ACCOUNT_EVENT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$validate_account$;

CREATE FUNCTION public.validate_accounting_period_version()
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
     OR NEW.end_date<NEW.start_date OR NEW.status<>'OPEN' THEN
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
     OR (NEW.version IS DISTINCT FROM 1
         AND v_event.event_type IS DISTINCT FROM 'accounting_period_updated')
     OR (NEW.version=1
         AND v_event.event_type IS DISTINCT FROM 'accounting_period_created') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_EVENT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$validate_period$;

CREATE TRIGGER accounting_accounts_guard_identity
BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_accounts
FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_identity();
CREATE TRIGGER accounting_accounts_guard_truncate
BEFORE TRUNCATE ON public.accounting_accounts
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_account_versions_validate
BEFORE INSERT ON public.accounting_account_versions
FOR EACH ROW EXECUTE FUNCTION public.validate_accounting_account_version();
CREATE TRIGGER accounting_account_versions_immutable
BEFORE UPDATE OR DELETE ON public.accounting_account_versions
FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_account_versions_no_truncate
BEFORE TRUNCATE ON public.accounting_account_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_periods_guard_identity
BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_periods
FOR EACH ROW EXECUTE FUNCTION public.guard_accounting_identity();
CREATE TRIGGER accounting_periods_guard_truncate
BEFORE TRUNCATE ON public.accounting_periods
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_period_versions_validate
BEFORE INSERT ON public.accounting_period_versions
FOR EACH ROW EXECUTE FUNCTION public.validate_accounting_period_version();
CREATE TRIGGER accounting_period_versions_immutable
BEFORE UPDATE OR DELETE ON public.accounting_period_versions
FOR EACH ROW EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();
CREATE TRIGGER accounting_period_versions_no_truncate
BEFORE TRUNCATE ON public.accounting_period_versions
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_accounting_foundation_history_mutation();

CREATE FUNCTION public.save_accounting_account(
  p_actor_user_id uuid,p_account_id uuid,p_expected_version integer,p_account jsonb,
  p_reason text,p_evidence_ref text,p_request_id uuid
)
RETURNS TABLE(error_code text,account_id uuid,version integer,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,extensions AS $save_account$
DECLARE
  v_profile_id uuid;
  v_identity public.accounting_accounts%ROWTYPE;
  v_prior_event public.accounting_foundation_events%ROWTYPE;
  v_profile_lock bigint;
  v_request_lock bigint;
  v_lock bigint;
  v_id uuid;
  v_version integer;
  v_previous integer;
  v_foundation_id uuid;
  v_event_type text;
  v_fingerprint text;
  v_parent uuid;
  v_now timestamptz:=transaction_timestamp();
  v_keys text[]:=ARRAY[
    'account_code','name_en','name_ar','account_type','category','normal_balance',
    'account_kind','parent_account_id','is_active','is_protected','control_classification'
  ];
BEGIN
  IF p_actor_user_id IS NULL OR p_expected_version IS NULL OR p_expected_version<0
     OR p_request_id IS NULL OR p_account IS NULL OR jsonb_typeof(p_account)<>'object'
     OR ((p_account_id IS NULL)<>(p_expected_version=0))
     OR p_expected_version>2147483646 OR NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason))>2000
     OR (p_evidence_ref IS NOT NULL AND (NULLIF(btrim(p_evidence_ref),'') IS NULL OR length(btrim(p_evidence_ref))>2000)) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_account))<>11 OR NOT (p_account ?& v_keys) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF jsonb_typeof(p_account->'account_code') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_account->'name_en') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_account->'name_ar') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_account->'account_type') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_account->'category') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_account->'normal_balance') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_account->'account_kind') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_account->'parent_account_id') NOT IN ('string','null')
     OR jsonb_typeof(p_account->'is_active') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(p_account->'is_protected') IS DISTINCT FROM 'boolean'
     OR jsonb_typeof(p_account->'control_classification') IS DISTINCT FROM 'string' THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF NULLIF(btrim(p_account->>'account_code'),'') IS NULL OR length(btrim(p_account->>'account_code'))>40
     OR NULLIF(btrim(p_account->>'name_en'),'') IS NULL OR length(btrim(p_account->>'name_en'))>160
     OR NULLIF(btrim(p_account->>'name_ar'),'') IS NULL OR length(btrim(p_account->>'name_ar'))>160
     OR NULLIF(btrim(p_account->>'category'),'') IS NULL OR length(btrim(p_account->>'category'))>80
     OR p_account->>'account_type' NOT IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')
     OR p_account->>'normal_balance' NOT IN ('DEBIT','CREDIT')
     OR p_account->>'account_kind' NOT IN ('POSTING','NON_POSTING')
     OR p_account->>'control_classification' NOT IN (
       'NONE','ACCOUNTS_RECEIVABLE','ACCOUNTS_PAYABLE','CUSTOMER_ADVANCE',
       'SUPPLIER_ADVANCE','CONTRACT_LIABILITY','CASH_ACCOUNTABILITY','EMPLOYEE_ADVANCE'
     ) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF p_account->>'parent_account_id' IS NOT NULL
     AND p_account->>'parent_account_id'<>'null' THEN
    v_parent:=(p_account->>'parent_account_id')::uuid;
  END IF;
  IF p_account->>'control_classification'<>'NONE' AND p_account->'is_protected' IS DISTINCT FROM 'true'::jsonb THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  PERFORM 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE FOR SHARE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;

  v_profile_lock:=pg_catalog.hashtextextended('w10a2a-chart:'||v_profile_id::text,0);
  v_request_lock:=pg_catalog.hashtextextended('w10a2a-request:'||v_profile_id::text||':'||p_actor_user_id::text||':'||p_request_id::text,0);
  FOR v_lock IN
    SELECT DISTINCT lock_id FROM unnest(ARRAY[v_profile_lock,v_request_lock]) AS locks(lock_id) ORDER BY lock_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock);
  END LOOP;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_chart') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'account_id',p_account_id,'expected_version',p_expected_version,'account',p_account,
    'reason',btrim(p_reason),'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');
  SELECT * INTO v_prior_event FROM public.accounting_foundation_events e
    WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_prior_event.event_type IN ('accounting_account_created','accounting_account_updated')
       AND v_prior_event.payload_fingerprint=v_fingerprint THEN
      RETURN QUERY SELECT NULL::text,v_prior_event.entity_id,v_prior_event.entity_version,true; RETURN;
    END IF;
    RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  IF p_account_id IS NULL THEN
    v_id:=gen_random_uuid(); v_version:=1; v_previous:=NULL;
    INSERT INTO public.accounting_accounts(id,profile_id,current_version)
      VALUES (v_id,v_profile_id,0);
    v_event_type:='accounting_account_created';
  ELSE
    SELECT * INTO v_identity FROM public.accounting_accounts a
      WHERE a.profile_id=v_profile_id AND a.id=p_account_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'account_not_found'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
    IF v_identity.current_version<>p_expected_version THEN
      RETURN QUERY SELECT 'revision_conflict'::text,v_identity.id,v_identity.current_version,false; RETURN;
    END IF;
    v_id:=v_identity.id; v_version:=v_identity.current_version+1; v_previous:=v_identity.current_version;
    v_event_type:='accounting_account_updated';
  END IF;

  INSERT INTO public.accounting_foundation_events(
    profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
    reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES (
    v_profile_id,v_event_type,'accounting_account',v_id,v_version,p_actor_user_id,p_request_id,
    btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),v_fingerprint,
    'accounting_accounts/'||v_id::text||'/'||v_version::text,v_now
  ) RETURNING id INTO v_foundation_id;
  INSERT INTO public.accounting_account_versions(
    profile_id,account_id,version,previous_version,account_code,name_en,name_ar,account_type,
    category,normal_balance,account_kind,parent_account_id,is_active,is_protected,
    control_classification,effective_from,reason,evidence_ref,created_by,created_at,foundation_event_id
  ) VALUES (
    v_profile_id,v_id,v_version,v_previous,btrim(p_account->>'account_code'),
    btrim(p_account->>'name_en'),btrim(p_account->>'name_ar'),p_account->>'account_type',
    btrim(p_account->>'category'),p_account->>'normal_balance',p_account->>'account_kind',
    v_parent,(p_account->>'is_active')::boolean,(p_account->>'is_protected')::boolean,
    p_account->>'control_classification',v_now,btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),
    p_actor_user_id,v_now,v_foundation_id
  );
  UPDATE public.accounting_accounts SET current_version=v_version
    WHERE profile_id=v_profile_id AND id=v_id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES (
    CASE WHEN v_version=1 THEN 'create' ELSE 'update' END,'accounting_account',v_id,
    p_actor_user_id::text,jsonb_build_object(
      'event_type',v_event_type,'profile_id',v_profile_id,'version',v_version,
      'request_id',p_request_id,'account_code',btrim(p_account->>'account_code')
    ),v_now
  );
  RETURN QUERY SELECT NULL::text,v_id,v_version,false;
EXCEPTION
  WHEN invalid_text_representation OR datetime_field_overflow OR numeric_value_out_of_range THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN unique_violation THEN
    IF SQLERRM='ACCOUNTING_ACCOUNT_CODE_CONFLICT' THEN
      RETURN QUERY SELECT 'account_code_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    RAISE;
  WHEN foreign_key_violation THEN
    IF SQLERRM='ACCOUNTING_ACCOUNT_PARENT_NOT_FOUND' THEN
      RETURN QUERY SELECT 'parent_not_found'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    RAISE;
  WHEN check_violation THEN
    IF SQLERRM='ACCOUNTING_ACCOUNT_PARENT_MUST_BE_NON_POSTING' THEN
      RETURN QUERY SELECT 'parent_must_be_non_posting'::text,NULL::uuid,NULL::integer,false; RETURN;
    ELSIF SQLERRM='ACCOUNTING_ACCOUNT_HIERARCHY_CYCLE' THEN
      RETURN QUERY SELECT 'account_cycle'::text,NULL::uuid,NULL::integer,false; RETURN;
    ELSIF SQLERRM='ACCOUNTING_ACCOUNT_HAS_CHILDREN' THEN
      RETURN QUERY SELECT 'account_has_children'::text,NULL::uuid,NULL::integer,false; RETURN;
    ELSIF SQLERRM='ACCOUNTING_PROTECTED_ACCOUNT_INVARIANT' THEN
      RETURN QUERY SELECT 'protected_account_invariant'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
END;
$save_account$;

CREATE FUNCTION public.list_accounting_accounts(p_actor_user_id uuid)
RETURNS TABLE(
  account_id uuid,profile_id uuid,version integer,is_current boolean,previous_version integer,
  account_code text,name_en text,name_ar text,account_type text,category text,normal_balance text,
  account_kind text,parent_account_id uuid,is_active boolean,is_protected boolean,
  control_classification text,effective_from timestamptz,reason text,evidence_ref text,
  created_by uuid,created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $list_accounts$
DECLARE v_profile_id uuid;
BEGIN
  IF p_actor_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE
  ) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED'; END IF;
  IF NOT (
    public.get_accounting_capability(p_actor_user_id,'accounting:view')
    OR public.get_accounting_capability(p_actor_user_id,'accounting:manage_chart')
  ) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT v.account_id,v.profile_id,v.version,(a.current_version=v.version),v.previous_version,
    v.account_code,v.name_en,v.name_ar,v.account_type,v.category,v.normal_balance,
    v.account_kind,v.parent_account_id,v.is_active,v.is_protected,v.control_classification,
    v.effective_from,v.reason,v.evidence_ref,v.created_by,v.created_at
  FROM public.accounting_account_versions v
  JOIN public.accounting_accounts a ON a.profile_id=v.profile_id AND a.id=v.account_id
  WHERE v.profile_id=v_profile_id
  ORDER BY v.account_code,v.version;
END;
$list_accounts$;

CREATE FUNCTION public.save_accounting_period(
  p_actor_user_id uuid,p_period_id uuid,p_expected_version integer,p_period jsonb,
  p_reason text,p_evidence_ref text,p_request_id uuid
)
RETURNS TABLE(error_code text,period_id uuid,version integer,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,extensions AS $save_period$
DECLARE
  v_profile_id uuid;
  v_identity public.accounting_periods%ROWTYPE;
  v_prior_event public.accounting_foundation_events%ROWTYPE;
  v_profile_lock bigint;
  v_request_lock bigint;
  v_lock bigint;
  v_id uuid;
  v_version integer;
  v_previous integer;
  v_foundation_id uuid;
  v_event_type text;
  v_fingerprint text;
  v_start_date date;
  v_end_date date;
  v_now timestamptz:=transaction_timestamp();
  v_keys text[]:=ARRAY['start_date','end_date','status'];
BEGIN
  IF p_actor_user_id IS NULL OR p_expected_version IS NULL OR p_expected_version<0
     OR p_request_id IS NULL OR p_period IS NULL OR jsonb_typeof(p_period)<>'object'
     OR ((p_period_id IS NULL)<>(p_expected_version=0))
     OR p_expected_version>2147483646 OR NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason))>2000
     OR (p_evidence_ref IS NOT NULL AND (NULLIF(btrim(p_evidence_ref),'') IS NULL OR length(btrim(p_evidence_ref))>2000)) THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(p_period))<>3 OR NOT (p_period ?& v_keys)
     OR jsonb_typeof(p_period->'start_date') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_period->'end_date') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_period->'status') IS DISTINCT FROM 'string'
     OR p_period->>'status'<>'OPEN' THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  IF p_period->>'start_date' !~ '^\d{4}-\d{2}-\d{2}$'
     OR p_period->>'end_date' !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;
  v_start_date:=(p_period->>'start_date')::date;
  v_end_date:=(p_period->>'end_date')::date;
  IF NOT isfinite(v_start_date) OR NOT isfinite(v_end_date) OR v_end_date<v_start_date THEN
    RETURN QUERY SELECT 'invalid_period_boundary'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  PERFORM 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE FOR SHARE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;

  v_profile_lock:=pg_catalog.hashtextextended('w10a2a-period:'||v_profile_id::text,0);
  v_request_lock:=pg_catalog.hashtextextended('w10a2a-request:'||v_profile_id::text||':'||p_actor_user_id::text||':'||p_request_id::text,0);
  FOR v_lock IN
    SELECT DISTINCT lock_id FROM unnest(ARRAY[v_profile_lock,v_request_lock]) AS locks(lock_id) ORDER BY lock_id
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(v_lock);
  END LOOP;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_periods') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  v_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'period_id',p_period_id,'expected_version',p_expected_version,'period',p_period,
    'reason',btrim(p_reason),'evidence_ref',NULLIF(btrim(p_evidence_ref),'')
  )::text,'UTF8'),'sha256'),'hex');
  SELECT * INTO v_prior_event FROM public.accounting_foundation_events e
    WHERE e.profile_id=v_profile_id AND e.actor_user_id=p_actor_user_id AND e.request_id=p_request_id;
  IF FOUND THEN
    IF v_prior_event.event_type IN ('accounting_period_created','accounting_period_updated')
       AND v_prior_event.payload_fingerprint=v_fingerprint THEN
      RETURN QUERY SELECT NULL::text,v_prior_event.entity_id,v_prior_event.entity_version,true; RETURN;
    END IF;
    RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
  END IF;

  IF p_period_id IS NULL THEN
    v_id:=gen_random_uuid(); v_version:=1; v_previous:=NULL;
    INSERT INTO public.accounting_periods(id,profile_id,current_version)
      VALUES (v_id,v_profile_id,0);
    v_event_type:='accounting_period_created';
  ELSE
    SELECT * INTO v_identity FROM public.accounting_periods p
      WHERE p.profile_id=v_profile_id AND p.id=p_period_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'period_not_found'::text,NULL::uuid,NULL::integer,false; RETURN; END IF;
    IF v_identity.current_version<>p_expected_version THEN
      RETURN QUERY SELECT 'revision_conflict'::text,v_identity.id,v_identity.current_version,false; RETURN;
    END IF;
    v_id:=v_identity.id; v_version:=v_identity.current_version+1; v_previous:=v_identity.current_version;
    v_event_type:='accounting_period_updated';
  END IF;

  INSERT INTO public.accounting_foundation_events(
    profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
    reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES (
    v_profile_id,v_event_type,'accounting_period',v_id,v_version,p_actor_user_id,p_request_id,
    btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),v_fingerprint,
    'accounting_periods/'||v_id::text||'/'||v_version::text,v_now
  ) RETURNING id INTO v_foundation_id;
  INSERT INTO public.accounting_period_versions(
    profile_id,period_id,version,previous_version,start_date,end_date,status,effective_from,
    reason,evidence_ref,created_by,created_at,foundation_event_id
  ) VALUES (
    v_profile_id,v_id,v_version,v_previous,v_start_date,v_end_date,'OPEN',v_now,
    btrim(p_reason),NULLIF(btrim(p_evidence_ref),''),p_actor_user_id,v_now,v_foundation_id
  );
  UPDATE public.accounting_periods SET current_version=v_version
    WHERE profile_id=v_profile_id AND id=v_id;
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES (
    CASE WHEN v_version=1 THEN 'create' ELSE 'update' END,'accounting_period',v_id,
    p_actor_user_id::text,jsonb_build_object(
      'event_type',v_event_type,'profile_id',v_profile_id,'version',v_version,
      'request_id',p_request_id,'start_date',v_start_date,'end_date',v_end_date,'status','OPEN'
    ),v_now
  );
  RETURN QUERY SELECT NULL::text,v_id,v_version,false;
EXCEPTION
  WHEN invalid_text_representation OR datetime_field_overflow OR numeric_value_out_of_range THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN check_violation THEN
    IF SQLERRM='ACCOUNTING_PERIOD_OVERLAP' THEN
      RETURN QUERY SELECT 'period_overlap'::text,NULL::uuid,NULL::integer,false; RETURN;
    ELSIF SQLERRM='ACCOUNTING_PERIOD_BOUNDARY_INVALID' THEN
      RETURN QUERY SELECT 'invalid_period_boundary'::text,NULL::uuid,NULL::integer,false; RETURN;
    END IF;
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,false; RETURN;
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,false; RETURN;
END;
$save_period$;

CREATE FUNCTION public.list_accounting_periods(p_actor_user_id uuid)
RETURNS TABLE(
  period_id uuid,profile_id uuid,version integer,is_current boolean,previous_version integer,
  start_date date,end_date date,status text,effective_from timestamptz,reason text,
  evidence_ref text,created_by uuid,created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $list_periods$
DECLARE v_profile_id uuid;
BEGIN
  IF p_actor_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE
  ) THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED'; END IF;
  IF NOT (
    public.get_accounting_capability(p_actor_user_id,'accounting:view')
    OR public.get_accounting_capability(p_actor_user_id,'accounting:manage_periods')
  ) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT v.period_id,v.profile_id,v.version,(p.current_version=v.version),v.previous_version,
    v.start_date,v.end_date,v.status,v.effective_from,v.reason,v.evidence_ref,v.created_by,v.created_at
  FROM public.accounting_period_versions v
  JOIN public.accounting_periods p ON p.profile_id=v.profile_id AND p.id=v.period_id
  WHERE v.profile_id=v_profile_id
  ORDER BY v.start_date,v.end_date,v.version;
END;
$list_periods$;

ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_account_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_period_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.accounting_accounts,public.accounting_account_versions,
  public.accounting_periods,public.accounting_period_versions FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_accounting_account(uuid,uuid,integer,jsonb,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.list_accounting_accounts(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_accounting_period(uuid,uuid,integer,jsonb,text,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.list_accounting_periods(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_accounting_identity() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.validate_accounting_account_version() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.validate_accounting_period_version() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_accounting_account(uuid,uuid,integer,jsonb,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_accounting_accounts(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_accounting_period(uuid,uuid,integer,jsonb,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_accounting_periods(uuid) TO service_role;

COMMIT;
