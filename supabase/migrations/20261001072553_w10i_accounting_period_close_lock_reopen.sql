-- W10I: immutable close/lock/reopen workflow. Period transitions share the
-- W10A2/W10B profile-scoped accounting-period advisory lock.
BEGIN;

DO $w10i_preflight$
DECLARE v_capability text;
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL
     OR to_regclass('public.accounting_period_versions') IS NULL
     OR to_regclass('public.accounting_journal_versions') IS NULL
     OR to_regclass('public.accounting_foundation_events') IS NULL
     OR to_regclass('public.accounting_capability_catalog') IS NULL
     OR to_regprocedure('public.get_accounting_capability(uuid,text)') IS NULL
     OR to_regprocedure('public.get_w10h_accounting_report(uuid,text,date,date,timestamptz,uuid,uuid,integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'W10I preflight: expected W10A-H period, journal, authority, and report contracts are missing';
  END IF;
  IF to_regclass('public.accounting_period_close_packages') IS NOT NULL
     OR to_regclass('public.accounting_period_close_reviews') IS NOT NULL
     OR to_regprocedure('public.prepare_accounting_period_close(uuid,uuid,integer,text,text,text,timestamptz,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'W10I preflight: W10I objects already exist';
  END IF;
  SELECT enabled::text||':'||runtime_allow_grantable::text||':'||owner_slice
    INTO v_capability
  FROM public.accounting_capability_catalog WHERE capability='accounting:close_period';
  IF v_capability IS DISTINCT FROM 'false:false:W10I' THEN
    RAISE EXCEPTION 'W10I preflight: close_period catalog state differs: %',v_capability;
  END IF;
  SELECT enabled::text||':'||runtime_allow_grantable::text||':'||owner_slice
    INTO v_capability
  FROM public.accounting_capability_catalog WHERE capability='accounting:reopen_period';
  IF v_capability IS DISTINCT FROM 'false:false:W10I' THEN
    RAISE EXCEPTION 'W10I preflight: reopen_period catalog state differs: %',v_capability;
  END IF;
END;
$w10i_preflight$;

ALTER TABLE public.accounting_foundation_events
  DROP CONSTRAINT accounting_foundation_events_event_type_check,
  ADD CONSTRAINT accounting_foundation_events_event_type_check CHECK (event_type IN (
    'accounting_capability_changed','accounting_profile_updated',
    'accounting_account_created','accounting_account_updated',
    'accounting_period_created','accounting_period_updated',
    'accounting_period_closed','accounting_period_locked','accounting_period_reopened',
    'accounting_posting_rule_created','accounting_posting_rule_updated',
    'accounting_journal_prepared','accounting_journal_posted','accounting_journal_reversed',
    'accounting_inception_package_created','accounting_inception_package_updated',
    'accounting_inception_package_reviewed','accounting_inception_package_rejected',
    'accounting_inception_package_accepted',
    'accounting_ar_bridge_event_classified','accounting_ar_bridge_event_held',
    'accounting_ap_bridge_event_classified','accounting_ap_bridge_event_held',
    'accounting_expense_bridge_event_classified','accounting_expense_bridge_event_held',
    'accounting_revenue_arrangement_prepared','accounting_revenue_arrangement_held',
    'accounting_revenue_arrangement_reviewed','accounting_revenue_evidence_submitted',
    'accounting_revenue_evidence_reviewed','accounting_revenue_recognition_prepared',
    'accounting_revenue_correction_held',
    'accounting_bank_binding_prepared','accounting_bank_binding_reviewed',
    'accounting_bank_statement_batch_recorded','accounting_bank_statement_line_recorded',
    'accounting_bank_reconciliation_prepared','accounting_bank_reconciliation_reviewed',
    'accounting_bank_reconciliation_unmatched'
  ));

ALTER TABLE public.accounting_capability_catalog
  DROP CONSTRAINT accounting_capability_catalog_state_check;
UPDATE public.accounting_capability_catalog
SET enabled=true,runtime_allow_grantable=true
WHERE capability IN ('accounting:close_period','accounting:reopen_period')
  AND owner_slice='W10I';
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
    OR (capability='accounting:manage_inception' AND enabled AND runtime_allow_grantable AND owner_slice='W10C')
    OR (capability='accounting:manage_ar_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10D')
    OR (capability IN ('accounting:manage_ap_bridge','accounting:manage_expense_bridge')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10E')
    OR (capability='accounting:manage_revenue_recognition'
      AND enabled AND runtime_allow_grantable AND owner_slice='W10F')
    OR (capability='accounting:reconcile_bank' AND enabled AND runtime_allow_grantable AND owner_slice='W10G')
    OR (capability IN ('accounting:close_period','accounting:reopen_period')
      AND enabled AND runtime_allow_grantable AND owner_slice='W10I')
    OR (capability='accounting:view_statements' AND enabled AND runtime_allow_grantable AND owner_slice='W10H')
  );

CREATE TABLE public.accounting_period_close_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  period_id uuid NOT NULL,
  package_version integer NOT NULL CHECK(package_version>0),
  package_kind text NOT NULL CHECK(package_kind IN ('CLOSE','LOCK','REOPEN')),
  package_state text NOT NULL DEFAULT 'PREPARED' CHECK(package_state='PREPARED'),
  starting_period_version integer NOT NULL CHECK(starting_period_version>0),
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  accounting_cutoff date NOT NULL,
  recorded_at_cutoff timestamptz NOT NULL,
  preparer_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  evidence_ref text NOT NULL CHECK(length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  previous_package_id uuid,
  previous_package_version integer,
  prepared_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  evidence_snapshot jsonb NOT NULL CHECK(jsonb_typeof(evidence_snapshot)='object'),
  exception_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  evidence_fingerprint text NOT NULL CHECK(evidence_fingerprint~'^[0-9a-f]{64}$'),
  ledger_fingerprint text NOT NULL CHECK(ledger_fingerprint~'^[0-9a-f]{64}$'),
  request_id uuid NOT NULL,
  request_fingerprint text NOT NULL CHECK(request_fingerprint~'^[0-9a-f]{64}$'),
  CONSTRAINT accounting_period_close_packages_period_version_key
    UNIQUE(profile_id,period_id,package_version),
  CONSTRAINT accounting_period_close_packages_id_version_key
    UNIQUE(profile_id,period_id,id,package_version),
  CONSTRAINT accounting_period_close_packages_request_key
    UNIQUE(profile_id,preparer_user_id,request_id),
  CONSTRAINT accounting_period_close_packages_identity_fkey
    FOREIGN KEY(profile_id,period_id) REFERENCES public.accounting_periods(profile_id,id) ON DELETE RESTRICT,
  CONSTRAINT accounting_period_close_packages_previous_fkey
    FOREIGN KEY(profile_id,period_id,previous_package_id,previous_package_version)
    REFERENCES public.accounting_period_close_packages(profile_id,period_id,id,package_version) ON DELETE RESTRICT,
  CONSTRAINT accounting_period_close_packages_previous_pair_check
    CHECK((previous_package_id IS NULL)=(previous_package_version IS NULL)),
  CONSTRAINT accounting_period_close_packages_boundary_check
    CHECK(isfinite(period_start_date) AND isfinite(period_end_date)
      AND period_end_date>=period_start_date AND accounting_cutoff=period_end_date
      AND isfinite(recorded_at_cutoff))
);

CREATE TABLE public.accounting_period_close_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  period_id uuid NOT NULL,
  package_id uuid NOT NULL,
  package_version integer NOT NULL,
  reviewer_user_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  decision text NOT NULL CHECK(decision IN ('APPROVED','REJECTED','STALE')),
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
  recomputed_evidence_fingerprint text CHECK(recomputed_evidence_fingerprint IS NULL OR recomputed_evidence_fingerprint~'^[0-9a-f]{64}$'),
  recomputed_ledger_fingerprint text CHECK(recomputed_ledger_fingerprint IS NULL OR recomputed_ledger_fingerprint~'^[0-9a-f]{64}$'),
  resulting_period_version integer,
  request_id uuid NOT NULL,
  request_fingerprint text NOT NULL CHECK(request_fingerprint~'^[0-9a-f]{64}$'),
  CONSTRAINT accounting_period_close_reviews_package_fkey
    FOREIGN KEY(profile_id,period_id,package_id,package_version)
    REFERENCES public.accounting_period_close_packages(profile_id,period_id,id,package_version) ON DELETE RESTRICT,
  CONSTRAINT accounting_period_close_reviews_actor_request_key
    UNIQUE(profile_id,reviewer_user_id,request_id),
  CONSTRAINT accounting_period_close_reviews_package_key
    UNIQUE(package_id,package_version),
  CONSTRAINT accounting_period_close_reviews_result_version_check
    CHECK(resulting_period_version IS NULL OR resulting_period_version>0)
);

CREATE FUNCTION public.reject_accounting_period_close_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $w10i_immutable$
BEGIN
  RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_PERIOD_CLOSE_EVIDENCE_APPEND_ONLY';
END;
$w10i_immutable$;
CREATE TRIGGER accounting_period_close_packages_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_period_close_packages
  FOR EACH ROW EXECUTE FUNCTION public.reject_accounting_period_close_mutation();
CREATE TRIGGER accounting_period_close_reviews_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_period_close_reviews
  FOR EACH ROW EXECUTE FUNCTION public.reject_accounting_period_close_mutation();

CREATE FUNCTION public.validate_accounting_period_close_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $w10i_review_guard$
DECLARE v_preparer uuid;
BEGIN
  IF TG_OP<>'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_PERIOD_CLOSE_EVIDENCE_APPEND_ONLY';
  END IF;
  SELECT p.preparer_user_id INTO v_preparer
  FROM public.accounting_period_close_packages p
  WHERE p.profile_id=NEW.profile_id AND p.period_id=NEW.period_id
    AND p.id=NEW.package_id AND p.package_version=NEW.package_version;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='ACCOUNTING_PERIOD_CLOSE_PACKAGE_NOT_FOUND';
  END IF;
  IF v_preparer=NEW.reviewer_user_id THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_CLOSE_INDEPENDENT_REVIEW_REQUIRED';
  END IF;
  RETURN NEW;
END;
$w10i_review_guard$;
CREATE TRIGGER accounting_period_close_reviews_validate
  BEFORE INSERT OR UPDATE OR DELETE ON public.accounting_period_close_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_accounting_period_close_review();

ALTER TABLE public.accounting_period_close_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_period_close_packages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_period_close_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_period_close_reviews FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.accounting_period_close_packages,public.accounting_period_close_reviews
  FROM PUBLIC,anon,authenticated,service_role;

-- Add guarded period transitions while retaining generic OPEN-period setup.
CREATE OR REPLACE FUNCTION public.validate_accounting_period_version()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $validate_period$
DECLARE
  v_identity public.accounting_periods%ROWTYPE;
  v_prior public.accounting_period_versions%ROWTYPE;
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
    IF NEW.previous_version IS NOT NULL OR v_identity.current_version<>0 OR NEW.status<>'OPEN' THEN
      RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_PERIOD_REVISION_CONFLICT';
    END IF;
  ELSE
    SELECT * INTO v_prior FROM public.accounting_period_versions prior
      WHERE prior.profile_id=NEW.profile_id AND prior.period_id=NEW.period_id
        AND prior.version=NEW.previous_version FOR SHARE;
    IF NOT FOUND OR NEW.previous_version<>NEW.version-1
       OR v_identity.current_version<>NEW.previous_version THEN
      RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_PERIOD_REVISION_CONFLICT';
    END IF;
    IF NEW.start_date IS DISTINCT FROM v_prior.start_date OR NEW.end_date IS DISTINCT FROM v_prior.end_date THEN
      IF EXISTS (
        SELECT 1 FROM public.accounting_journal_versions j
        WHERE j.profile_id=NEW.profile_id AND j.period_id=NEW.period_id AND j.status='POSTED'
      ) THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_BOUNDARY_IMMUTABLE_AFTER_POSTING';
      END IF;
    END IF;
    IF NEW.status IS DISTINCT FROM v_prior.status THEN
      IF v_prior.status='OPEN' AND NEW.status='CLOSED' THEN
        IF NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events e
          WHERE e.id=NEW.foundation_event_id AND e.event_type='accounting_period_closed') THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_CLOSE_REQUIRES_W10I';
        END IF;
      ELSIF v_prior.status='CLOSED' AND NEW.status='LOCKED' THEN
        IF NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events e
          WHERE e.id=NEW.foundation_event_id AND e.event_type='accounting_period_locked') THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_LOCK_REQUIRES_W10I';
        END IF;
      ELSIF v_prior.status IN ('CLOSED','LOCKED') AND NEW.status='OPEN' THEN
        IF NOT EXISTS(SELECT 1 FROM public.accounting_foundation_events e
          WHERE e.id=NEW.foundation_event_id AND e.event_type='accounting_period_reopened') THEN
          RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_REOPEN_REQUIRES_W10I';
        END IF;
      ELSE
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_TRANSITION_INVALID';
      END IF;
    ELSIF NEW.status<>'OPEN' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_FINAL_VERSION_IMMUTABLE';
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
  SELECT * INTO v_event FROM public.accounting_foundation_events e WHERE e.id=NEW.foundation_event_id;
  IF NOT FOUND OR v_event.profile_id IS DISTINCT FROM NEW.profile_id
     OR v_event.entity_type IS DISTINCT FROM 'accounting_period'
     OR v_event.entity_id IS DISTINCT FROM NEW.period_id
     OR v_event.entity_version IS DISTINCT FROM NEW.version
     OR v_event.actor_user_id IS DISTINCT FROM NEW.created_by
     OR (NEW.version=1 AND v_event.event_type IS DISTINCT FROM 'accounting_period_created')
     OR (NEW.version>1 AND v_event.event_type NOT IN (
       'accounting_period_updated','accounting_period_closed','accounting_period_locked','accounting_period_reopened'
     )) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_PERIOD_EVENT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$validate_period$;

-- Hash every non-W10I accounting table so source/reconciliation changes after
-- package preparation make approval stale. W10I evidence and audit/event rows
-- are excluded because the workflow appends those while approving itself.
CREATE FUNCTION public.accounting_period_close_live_fingerprint(p_profile_id uuid)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,public AS $w10i_live_fingerprint$
DECLARE
  v_table record;
  v_table_hash text;
  v_parts text:='';
BEGIN
  FOR v_table IN
    SELECT c.relname
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND c.relname LIKE 'accounting\_%' ESCAPE '\'
      AND c.relname NOT IN (
        'accounting_foundation_events','accounting_periods','accounting_period_versions',
        'accounting_period_close_packages','accounting_period_close_reviews'
      )
    ORDER BY c.relname
  LOOP
    EXECUTE format(
      'SELECT encode(extensions.digest(convert_to(coalesce(string_agg(encode(extensions.digest(convert_to(to_jsonb(t)::text,''UTF8''),''sha256''),''hex''), '','' ORDER BY to_jsonb(t)::text),''''),''UTF8''),''sha256''),''hex'') FROM public.%I t WHERE to_jsonb(t)->>''profile_id''=$1 OR to_jsonb(t)->>''profile_id'' IS NULL',
      v_table.relname
    ) INTO v_table_hash USING p_profile_id;
    v_parts:=v_parts||v_table.relname||':'||coalesce(v_table_hash,'');
  END LOOP;
  RETURN encode(extensions.digest(convert_to(v_parts,'UTF8'),'sha256'),'hex');
END;
$w10i_live_fingerprint$;

CREATE FUNCTION public.accounting_period_close_capture(
  p_actor_user_id uuid,p_period_id uuid,p_recorded_at_cutoff timestamptz
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,public AS $w10i_capture$
DECLARE
  v_profile public.accounting_profiles%ROWTYPE;
  v_profile_version public.accounting_profile_versions%ROWTYPE;
  v_period public.accounting_period_versions%ROWTYPE;
  v_ar jsonb; v_ap jsonb; v_expense jsonb; v_revenue jsonb;
  v_trial jsonb; v_pnl jsonb; v_balance jsonb;
  v_banks jsonb:='[]'::jsonb; v_bank jsonb; v_binding record;
  v_raw jsonb; v_summary jsonb; v_reasons text[]:=ARRAY[]::text[];
  v_inception jsonb; v_held_effect_count bigint:=0; v_bank_count integer:=0;
  v_safe_report_reasons text[]:=ARRAY['SOURCE_RECONCILIATION_NOT_BOUNDARY_VERIFIED'];
  v_unresolved_report_reasons text[];
  v_mapping_versions jsonb;
  v_evidence_fingerprint text; v_ledger_fingerprint text;
  v_has_bank_batch boolean;
BEGIN
  SELECT p.* INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('state','BLOCKED','exception_codes',jsonb_build_array('PROFILE_NOT_INITIALIZED'));
  END IF;
  SELECT pv.* INTO v_period FROM public.accounting_period_versions pv
  JOIN public.accounting_periods p ON p.profile_id=pv.profile_id AND p.id=pv.period_id
    AND p.current_version=pv.version
  WHERE pv.profile_id=v_profile.id AND pv.period_id=p_period_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('state','BLOCKED','exception_codes',jsonb_build_array('PERIOD_NOT_FOUND'));
  END IF;
  SELECT pv.* INTO v_profile_version FROM public.accounting_profile_versions pv
  WHERE pv.profile_id=v_profile.id AND pv.created_at<=p_recorded_at_cutoff
    AND pv.effective_from<((v_period.end_date::timestamp+interval '1 day') AT TIME ZONE 'Asia/Riyadh')
  ORDER BY pv.effective_from DESC,pv.version DESC LIMIT 1;
  IF NOT FOUND OR v_profile_version.activation_state<>'DEV_PROVISIONAL' THEN
    v_reasons:=array_append(v_reasons,'PROFILE_NOT_ACTIVE_AT_CUTOFF');
  END IF;
  IF v_period.status NOT IN ('OPEN','CLOSED') THEN
    v_reasons:=array_append(v_reasons,'PERIOD_STATE_NOT_CLOSEABLE');
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_journal_versions j
    WHERE j.profile_id=v_profile.id AND j.status='POSTED'
      AND j.source_domain IN ('ACCOUNTING_CLOSE','YEAR_END_CLOSE','RESULT_TRANSFER')) THEN
    v_reasons:=array_append(v_reasons,'UNAUTHORIZED_RESULT_TRANSFER_SOURCE_PRESENT');
  END IF;

  SELECT count(*) INTO v_held_effect_count
  FROM public.accounting_source_effects e
  LEFT JOIN public.accounting_journal_versions j
    ON j.profile_id=e.profile_id AND j.journal_id=e.journal_id AND j.version=e.journal_version
  WHERE e.profile_id=v_profile.id AND e.created_at<=p_recorded_at_cutoff
    AND (j.accounting_date IS NULL OR j.accounting_date<=v_period.end_date)
    AND (e.status<>'POSTED' OR j.status IS DISTINCT FROM 'POSTED' OR j.posted_at IS NULL
      OR j.posted_at>p_recorded_at_cutoff);
  IF v_held_effect_count>0 THEN
    v_reasons:=array_append(v_reasons,'HELD_OR_UNRESOLVED_SOURCE_EFFECTS');
  END IF;

  IF v_profile_version.cutover_boundary_date IS NOT NULL THEN
    SELECT jsonb_build_object('package_id',a.package_id,'package_version',a.package_version,
      'as_of_date',a.as_of_date,'recorded_at_cutoff',a.recorded_at_cutoff,
      'accepted_at',a.accepted_at,'fingerprint',a.payload_fingerprint)
    INTO v_inception
    FROM public.accounting_inception_acceptances a
    WHERE a.profile_id=v_profile.id AND a.accepted_at<=p_recorded_at_cutoff
      AND a.recorded_at_cutoff<=p_recorded_at_cutoff
      AND a.as_of_date=v_profile_version.cutover_boundary_date
    ORDER BY a.accepted_at DESC,a.id DESC LIMIT 1;
    IF v_period.end_date<v_profile_version.cutover_boundary_date OR v_inception IS NULL THEN
      v_reasons:=array_append(v_reasons,'INCEPTION_ACCEPTANCE_UNAVAILABLE_OR_INCOMPATIBLE');
    END IF;
  ELSE
    v_inception:=jsonb_build_object('state','NOT_REQUIRED','reason_code','NO_CUTOVER_BOUNDARY');
  END IF;

  BEGIN
    v_ar:=public.get_accounting_ar_bridge_reconciliation(p_actor_user_id,v_period.end_date,p_recorded_at_cutoff,500);
  EXCEPTION WHEN OTHERS THEN
    v_ar:=jsonb_build_object('state','UNAVAILABLE');
  END;
  BEGIN
    v_ap:=public.get_accounting_ap_bridge_reconciliation(p_actor_user_id,v_period.end_date,p_recorded_at_cutoff,500);
  EXCEPTION WHEN OTHERS THEN
    v_ap:=jsonb_build_object('state','UNAVAILABLE');
  END;
  BEGIN
    v_expense:=public.get_accounting_expense_bridge_reconciliation(p_actor_user_id,v_period.end_date,p_recorded_at_cutoff,500);
  EXCEPTION WHEN OTHERS THEN
    v_expense:=jsonb_build_object('state','UNAVAILABLE');
  END;
  BEGIN
    v_revenue:=public.get_accounting_revenue_recognition_reconciliation(p_actor_user_id,v_period.end_date,p_recorded_at_cutoff,500);
  EXCEPTION WHEN OTHERS THEN
    v_revenue:=jsonb_build_object('state','UNAVAILABLE');
  END;
  IF v_ar->>'state'<>'READY'
     OR v_ar->>'as_of_date' IS DISTINCT FROM v_period.end_date::text
     OR (v_ar->>'recorded_at_cutoff')::timestamptz IS DISTINCT FROM p_recorded_at_cutoff
     OR coalesce((v_ar->>'held_unresolved_count')::integer,1)>0
     OR coalesce((v_ar->>'missing_effect_count')::integer,1)>0
     OR coalesce((v_ar->>'duplicate_conflict_count')::integer,1)>0
     OR coalesce((v_ar->>'party_difference_count')::integer,1)>0
     OR coalesce((v_ar->>'truncated')::boolean,true) THEN
    v_reasons:=array_append(v_reasons,'AR_RECONCILIATION_INCOMPLETE_OR_INCOMPATIBLE');
  END IF;
  IF v_ap->>'state'<>'READY'
     OR v_ap->>'as_of_date' IS DISTINCT FROM v_period.end_date::text
     OR (v_ap->>'recorded_at_cutoff')::timestamptz IS DISTINCT FROM p_recorded_at_cutoff
     OR coalesce((v_ap->>'held_count')::integer,1)>0
     OR coalesce((v_ap->>'missing_effect_count')::integer,1)>0
     OR coalesce((v_ap->>'duplicate_conflict_count')::integer,1)>0
     OR coalesce((v_ap->>'control_difference_count')::integer,1)>0
     OR coalesce((v_ap->>'supplier_difference_count')::integer,1)>0
     OR coalesce((v_ap->>'service_difference_count')::integer,1)>0
     OR coalesce((v_ap->>'truncated')::boolean,true) THEN
    v_reasons:=array_append(v_reasons,'AP_RECONCILIATION_INCOMPLETE_OR_INCOMPATIBLE');
  END IF;
  IF v_expense->>'state'<>'READY'
     OR v_expense->>'as_of_date' IS DISTINCT FROM v_period.end_date::text
     OR (v_expense->>'recorded_at_cutoff')::timestamptz IS DISTINCT FROM p_recorded_at_cutoff
     OR coalesce((v_expense->>'held_count')::integer,1)>0
     OR coalesce((v_expense->>'missing_effect_count')::integer,1)>0
     OR coalesce((v_expense->>'duplicate_conflict_count')::integer,1)>0
     OR coalesce((v_expense->>'source_payload_conflict_count')::integer,1)>0
     OR coalesce((v_expense->>'truncated')::boolean,true)
     OR coalesce((v_expense->>'control_difference_count')::integer,1)>0
     OR coalesce((v_expense->>'employee_difference_count')::integer,1)>0
     OR coalesce((v_expense->>'fund_difference_count')::integer,1)>0
     OR coalesce((v_expense->>'service_difference_count')::integer,1)>0 THEN
    v_reasons:=array_append(v_reasons,'EXPENSE_CASH_RECONCILIATION_INCOMPLETE_OR_INCOMPATIBLE');
  END IF;
  IF v_revenue->>'state'<>'READY'
     OR v_revenue->>'as_of_date' IS DISTINCT FROM v_period.end_date::text
     OR (v_revenue->>'recorded_at_cutoff')::timestamptz IS DISTINCT FROM p_recorded_at_cutoff
     OR coalesce((v_revenue->>'held_evidence_count')::integer,1)>0
     OR coalesce((v_revenue->>'contract_balance_difference_count')::integer,1)>0
     OR coalesce((v_revenue->>'superseded_or_stale_authority_count')::integer,1)>0
     OR coalesce((v_revenue->>'service_customer_difference_count')::integer,1)>0
     OR coalesce((v_revenue->>'credits_refunds_requiring_revenue_review_count')::integer,1)>0
     OR coalesce((v_revenue->>'truncated')::boolean,true) THEN
    v_reasons:=array_append(v_reasons,'REVENUE_RECONCILIATION_INCOMPLETE_OR_INCOMPATIBLE');
  END IF;

  FOR v_binding IN
    SELECT DISTINCT ON (b.binding_id) b.binding_id,b.version
    FROM public.accounting_bank_binding_versions b
    WHERE b.profile_id=v_profile.id AND b.status='APPROVED'
      AND b.effective_from<=v_period.end_date
      AND (b.effective_through IS NULL OR b.effective_through>=v_period.start_date)
      AND b.created_at<=p_recorded_at_cutoff
    ORDER BY b.binding_id,b.effective_from DESC,b.version DESC
  LOOP
    v_bank_count:=v_bank_count+1;
    SELECT EXISTS(SELECT 1 FROM public.accounting_bank_statement_batch_versions b
      WHERE b.profile_id=v_profile.id AND b.binding_id=v_binding.binding_id
        AND b.status='RECORDED' AND b.created_at<=p_recorded_at_cutoff
        AND b.coverage_start<=v_period.start_date AND b.coverage_end>=v_period.end_date)
      INTO v_has_bank_batch;
    BEGIN
      v_bank:=public.get_accounting_bank_reconciliation(
        p_actor_user_id,v_binding.binding_id,v_period.end_date,p_recorded_at_cutoff,500
      );
    EXCEPTION WHEN OTHERS THEN
      v_bank:=jsonb_build_object('state','UNAVAILABLE');
    END;
    v_banks:=v_banks||jsonb_build_array(jsonb_build_object(
      'binding_id',v_binding.binding_id,'binding_version',v_binding.version,
      'state',v_bank->>'state','as_of_date',v_bank->>'as_of_date',
      'recorded_at_cutoff',v_bank->>'recorded_at_cutoff',
      'snapshot_sha256',encode(extensions.digest(convert_to((v_bank-'generated_at')::text,'UTF8'),'sha256'),'hex'),
      'statement_coverage_verified',v_has_bank_batch,
      'unmatched_statement_amount_halalah',v_bank->>'unmatched_statement_amount_halalah',
      'unmatched_ledger_amount_halalah',v_bank->>'unmatched_ledger_amount_halalah',
      'duplicate_statement_candidates',v_bank->>'duplicate_statement_candidates',
      'impact_review_required_count',v_bank->>'impact_review_required_count'
    ));
    IF v_bank->>'state'<>'READY'
       OR v_bank->>'as_of_date' IS DISTINCT FROM v_period.end_date::text
       OR (v_bank->>'recorded_at_cutoff')::timestamptz IS DISTINCT FROM p_recorded_at_cutoff
       OR NOT v_has_bank_batch
       OR coalesce((v_bank->>'unmatched_statement_amount_halalah')::numeric,1)<>0
       OR coalesce((v_bank->>'unmatched_ledger_amount_halalah')::numeric,1)<>0
       OR coalesce((v_bank->>'duplicate_statement_candidates')::integer,1)>0
       OR coalesce((v_bank->>'impact_review_required_count')::integer,1)>0 THEN
      v_reasons:=array_append(v_reasons,'BANK_RECONCILIATION_INCOMPLETE_OR_INCOMPATIBLE');
    END IF;
  END LOOP;
  IF v_bank_count=0 THEN
    v_reasons:=array_append(v_reasons,'BANK_RECONCILIATION_UNAVAILABLE');
  END IF;

  BEGIN
    v_trial:=public.get_w10h_accounting_report(
      p_actor_user_id,'TRIAL_BALANCE',v_period.start_date,v_period.end_date,p_recorded_at_cutoff,NULL,NULL,0,500
    );
  EXCEPTION WHEN OTHERS THEN
    v_trial:=jsonb_build_object('state','UNAVAILABLE');
  END;
  BEGIN
    v_pnl:=public.get_w10h_accounting_report(
      p_actor_user_id,'PROFIT_AND_LOSS',v_period.start_date,v_period.end_date,p_recorded_at_cutoff,NULL,NULL,0,500
    );
  EXCEPTION WHEN OTHERS THEN
    v_pnl:=jsonb_build_object('state','UNAVAILABLE');
  END;
  BEGIN
    v_balance:=public.get_w10h_accounting_report(
      p_actor_user_id,'BALANCE_SHEET',v_period.start_date,v_period.end_date,p_recorded_at_cutoff,NULL,NULL,0,500
    );
  EXCEPTION WHEN OTHERS THEN
    v_balance:=jsonb_build_object('state','UNAVAILABLE');
  END;
  v_unresolved_report_reasons:=ARRAY[]::text[];
  v_unresolved_report_reasons:=v_unresolved_report_reasons||coalesce(ARRAY(
    SELECT jsonb_array_elements_text(coalesce(v_trial->'reason_codes','[]'::jsonb))
    UNION SELECT jsonb_array_elements_text(coalesce(v_pnl->'reason_codes','[]'::jsonb))
    UNION SELECT jsonb_array_elements_text(coalesce(v_balance->'reason_codes','[]'::jsonb))
  ),ARRAY[]::text[]);
  SELECT coalesce(array_agg(DISTINCT reason ORDER BY reason),ARRAY[]::text[])
    INTO v_unresolved_report_reasons
  FROM unnest(v_unresolved_report_reasons) AS codes(reason)
  WHERE reason<>ALL(v_safe_report_reasons);
  IF v_trial->>'state' NOT IN ('READY','PARTIAL')
     OR v_pnl->>'state' NOT IN ('READY','PARTIAL')
     OR v_balance->>'state' NOT IN ('READY','PARTIAL')
     OR coalesce((v_trial->>'has_more')::boolean,true)
     OR coalesce((v_pnl->>'has_more')::boolean,true)
     OR coalesce((v_balance->>'has_more')::boolean,true)
     OR v_unresolved_report_reasons IS DISTINCT FROM ARRAY[]::text[]
     OR coalesce((v_trial->'totals'->>'debits_equal_credits')::boolean,false) IS NOT TRUE
      OR v_trial->'totals'->>'ending_debit_halalah' IS NULL
      OR v_trial->'totals'->>'ending_credit_halalah' IS NULL
      OR v_trial->'totals'->>'ending_debit_halalah' IS DISTINCT FROM v_trial->'totals'->>'ending_credit_halalah'
      OR v_pnl->'totals'->>'revenue_halalah' IS NULL
      OR v_pnl->'totals'->>'expense_halalah' IS NULL
      OR v_pnl->'totals'->>'profit_loss_halalah' IS NULL
      OR v_balance->'totals'->>'equation_difference_halalah' IS DISTINCT FROM '0'
      OR v_trial->>'from_date' IS DISTINCT FROM v_period.start_date::text
      OR v_pnl->>'from_date' IS DISTINCT FROM v_period.start_date::text
      OR v_balance->>'from_date' IS DISTINCT FROM v_period.start_date::text
     OR v_trial->>'through_date' IS DISTINCT FROM v_period.end_date::text
     OR v_pnl->>'through_date' IS DISTINCT FROM v_period.end_date::text
     OR v_balance->>'through_date' IS DISTINCT FROM v_period.end_date::text
     OR (v_trial->>'recorded_at_cutoff')::timestamptz IS DISTINCT FROM p_recorded_at_cutoff
     OR (v_pnl->>'recorded_at_cutoff')::timestamptz IS DISTINCT FROM p_recorded_at_cutoff
     OR (v_balance->>'recorded_at_cutoff')::timestamptz IS DISTINCT FROM p_recorded_at_cutoff THEN
    v_reasons:=array_append(v_reasons,'REPORT_COMPLETENESS_OR_TRIAL_BALANCE_HOLD');
  END IF;
  IF v_held_effect_count>0 AND NOT ('HELD_OR_UNRESOLVED_SOURCE_EFFECTS'=ANY(v_unresolved_report_reasons)) THEN
    v_reasons:=array_append(v_reasons,'HELD_OR_UNRESOLVED_SOURCE_EFFECTS');
  END IF;
  SELECT coalesce(array_agg(DISTINCT reason ORDER BY reason),ARRAY[]::text[])
    INTO v_reasons FROM unnest(v_reasons) AS all_reasons(reason);

  v_mapping_versions:=jsonb_build_object(
    'profile_version',v_profile_version.version,
    'trial_balance_mapping_version',v_trial->'mapping_version',
    'profit_and_loss_mapping_version',v_pnl->'mapping_version',
    'balance_sheet_mapping_version',v_balance->'mapping_version'
  );
  v_raw:=jsonb_build_object(
    'profile_version',v_profile_version.version,'period_id',v_period.period_id,
    'period_version',v_period.version,'period_start_date',v_period.start_date,
    'period_end_date',v_period.end_date,'accounting_cutoff',v_period.end_date,
    'recorded_at_cutoff',p_recorded_at_cutoff,'mapping_versions',v_mapping_versions,
    'inception',v_inception,'held_effect_count',v_held_effect_count,
    'ar',v_ar,'ap',v_ap,'expense_cash',v_expense,'revenue',v_revenue,
    'banks',v_banks,'trial_balance',v_trial-'generated_at',
    'profit_and_loss',v_pnl-'generated_at','balance_sheet',v_balance-'generated_at'
  );
  v_evidence_fingerprint:=encode(extensions.digest(convert_to(v_raw::text,'UTF8'),'sha256'),'hex');
  v_ledger_fingerprint:=public.accounting_period_close_live_fingerprint(v_profile.id);

  v_summary:=jsonb_build_object(
    'state',CASE WHEN cardinality(v_reasons)=0 THEN 'READY' ELSE 'BLOCKED' END,
    'accounting_cutoff',v_period.end_date,'recorded_at_cutoff',p_recorded_at_cutoff,
    'period_id',v_period.period_id,'period_version',v_period.version,
    'period_start_date',v_period.start_date,'period_end_date',v_period.end_date,
    'profile_version',v_profile_version.version,'mapping_versions',v_mapping_versions,
    'inception',v_inception,
    'reconciliations',jsonb_build_object(
      'ar',jsonb_build_object('state',v_ar->>'state','snapshot_sha256',encode(extensions.digest(convert_to((v_ar-'generated_at')::text,'UTF8'),'sha256'),'hex'),
        'held_unresolved_count',v_ar->'held_unresolved_count','missing_effect_count',v_ar->'missing_effect_count',
        'duplicate_conflict_count',v_ar->'duplicate_conflict_count','party_difference_count',v_ar->'party_difference_count'),
      'ap',jsonb_build_object('state',v_ap->>'state','snapshot_sha256',encode(extensions.digest(convert_to((v_ap-'generated_at')::text,'UTF8'),'sha256'),'hex'),
        'held_count',v_ap->'held_count','missing_effect_count',v_ap->'missing_effect_count',
        'duplicate_conflict_count',v_ap->'duplicate_conflict_count','control_difference_count',v_ap->'control_difference_count',
        'supplier_difference_count',v_ap->'supplier_difference_count','service_difference_count',v_ap->'service_difference_count'),
      'expense_cash',jsonb_build_object('state',v_expense->>'state','snapshot_sha256',encode(extensions.digest(convert_to((v_expense-'generated_at')::text,'UTF8'),'sha256'),'hex'),
        'held_count',v_expense->'held_count','missing_effect_count',v_expense->'missing_effect_count',
        'control_difference_count',v_expense->'control_difference_count','employee_difference_count',v_expense->'employee_difference_count',
        'fund_difference_count',v_expense->'fund_difference_count','service_difference_count',v_expense->'service_difference_count'),
      'revenue',jsonb_build_object('state',v_revenue->>'state','snapshot_sha256',encode(extensions.digest(convert_to((v_revenue-'generated_at')::text,'UTF8'),'sha256'),'hex'),
        'held_evidence_count',v_revenue->'held_evidence_count','contract_balance_difference_count',v_revenue->'contract_balance_difference_count',
        'superseded_or_stale_authority_count',v_revenue->'superseded_or_stale_authority_count',
        'service_customer_difference_count',v_revenue->'service_customer_difference_count',
        'credits_refunds_requiring_revenue_review_count',v_revenue->'credits_refunds_requiring_revenue_review_count'),
      'bank',v_banks
    ),
    'reports',jsonb_build_object(
      'trial_balance',jsonb_build_object('state',v_trial->>'state','snapshot_sha256',encode(extensions.digest(convert_to((v_trial-'generated_at')::text,'UTF8'),'sha256'),'hex'),
        'reason_codes',v_trial->'reason_codes','has_more',v_trial->'has_more','totals',v_trial->'totals'),
      'profit_and_loss',jsonb_build_object('state',v_pnl->>'state','snapshot_sha256',encode(extensions.digest(convert_to((v_pnl-'generated_at')::text,'UTF8'),'sha256'),'hex'),
        'reason_codes',v_pnl->'reason_codes','has_more',v_pnl->'has_more','mapping_version',v_pnl->'mapping_version'),
      'balance_sheet',jsonb_build_object('state',v_balance->>'state','snapshot_sha256',encode(extensions.digest(convert_to((v_balance-'generated_at')::text,'UTF8'),'sha256'),'hex'),
        'reason_codes',v_balance->'reason_codes','has_more',v_balance->'has_more','mapping_version',v_balance->'mapping_version')
    ),
    'held_source_effect_count',v_held_effect_count,
    'exception_codes',to_jsonb(v_reasons),
    'evidence_fingerprint',v_evidence_fingerprint,
    'ledger_fingerprint',v_ledger_fingerprint
  );
  RETURN v_summary;
END;
$w10i_capture$;

-- Internal shared lock set: period and journal APIs already take the first
-- advisory lock; these SHARE locks serialize W10C-H evidence mutations too.
CREATE FUNCTION public.accounting_period_close_lock_evidence_tables()
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,public AS $w10i_lock_evidence$
DECLARE v_table record;
BEGIN
  FOR v_table IN
    SELECT c.relname FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND c.relname LIKE 'accounting\_%' ESCAPE '\'
      AND c.relname NOT IN (
        'accounting_foundation_events','accounting_periods','accounting_period_versions',
        'accounting_period_close_packages','accounting_period_close_reviews'
      )
    ORDER BY c.relname
  LOOP
    EXECUTE format('LOCK TABLE public.%I IN SHARE MODE',v_table.relname);
  END LOOP;
END;
$w10i_lock_evidence$;

CREATE FUNCTION public.prepare_accounting_period_close(
  p_actor_user_id uuid,p_period_id uuid,p_expected_period_version integer,
  p_package_kind text,p_reason text,p_evidence_ref text,
  p_recorded_at_cutoff timestamptz,p_request_id uuid
) RETURNS TABLE(error_code text,package_id uuid,package_version integer,
  package_state text,evidence_snapshot jsonb,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $prepare_period_close$
DECLARE
  v_profile_id uuid; v_period public.accounting_period_versions%ROWTYPE;
  v_prior public.accounting_period_close_packages%ROWTYPE;
  v_prior_finalization record;
  v_existing public.accounting_period_close_packages%ROWTYPE;
  v_profile_lock bigint; v_request_lock bigint; v_lock bigint;
  v_request_fingerprint text; v_snapshot jsonb; v_exceptions text[];
  v_package_id uuid; v_version integer; v_event_id uuid;
  v_capability text; v_prior_closed_version integer;
  v_now timestamptz:=transaction_timestamp();
BEGIN
  IF p_actor_user_id IS NULL OR p_period_id IS NULL OR p_expected_period_version IS NULL
      OR p_expected_period_version<1 OR p_request_id IS NULL OR p_package_kind IS NULL
     OR p_package_kind NOT IN ('CLOSE','LOCK','REOPEN')
     OR NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason))>2000
     OR NULLIF(btrim(p_evidence_ref),'') IS NULL OR length(btrim(p_evidence_ref))>2000
     OR p_recorded_at_cutoff IS NULL OR NOT isfinite(p_recorded_at_cutoff)
     OR p_recorded_at_cutoff>clock_timestamp() THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
  END IF;
   PERFORM 1 FROM public.app_users u
   WHERE u.id=p_actor_user_id AND u.is_active IS TRUE FOR SHARE;
   IF NOT FOUND THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
  END IF;
  v_capability:=CASE WHEN p_package_kind='REOPEN' THEN 'accounting:reopen_period' ELSE 'accounting:close_period' END;
  IF NOT public.get_accounting_capability(p_actor_user_id,v_capability) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN QUERY SELECT 'profile_not_initialized'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN; END IF;
  v_profile_lock:=pg_catalog.hashtextextended('w10a2a-period:'||v_profile_id::text,0);
  v_request_lock:=pg_catalog.hashtextextended('w10i-close-request:'||v_profile_id::text||':'||p_actor_user_id::text||':'||p_request_id::text,0);
  FOR v_lock IN SELECT DISTINCT lock_id FROM unnest(ARRAY[v_profile_lock,v_request_lock]) AS locks(lock_id) ORDER BY lock_id
  LOOP PERFORM pg_catalog.pg_advisory_xact_lock(v_lock); END LOOP;
  v_request_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'period_id',p_period_id,'expected_period_version',p_expected_period_version,'package_kind',p_package_kind,
    'reason',btrim(p_reason),'evidence_ref',btrim(p_evidence_ref),'recorded_at_cutoff',p_recorded_at_cutoff
  )::text,'UTF8'),'sha256'),'hex');
  SELECT * INTO v_existing FROM public.accounting_period_close_packages p
  WHERE p.profile_id=v_profile_id AND p.preparer_user_id=p_actor_user_id AND p.request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.request_fingerprint<>v_request_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,v_existing.id,v_existing.package_version,v_existing.package_state,
      v_existing.evidence_snapshot,true; RETURN;
  END IF;
  SELECT pv.* INTO v_period FROM public.accounting_period_versions pv
  JOIN public.accounting_periods p ON p.profile_id=pv.profile_id AND p.id=pv.period_id AND p.current_version=pv.version
  WHERE pv.profile_id=v_profile_id AND pv.period_id=p_period_id FOR SHARE OF p;
  IF NOT FOUND THEN RETURN QUERY SELECT 'period_not_found'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN; END IF;
  IF v_period.version<>p_expected_period_version THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
  END IF;
  IF p_package_kind='CLOSE' AND v_period.status<>'OPEN' THEN
    RETURN QUERY SELECT 'period_not_open'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
  ELSIF p_package_kind='LOCK' AND v_period.status<>'CLOSED' THEN
    RETURN QUERY SELECT 'period_not_closed'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
  ELSIF p_package_kind='REOPEN' AND v_period.status NOT IN ('CLOSED','LOCKED') THEN
    RETURN QUERY SELECT 'period_not_finalized'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
  END IF;
  IF p_package_kind IN ('CLOSE','LOCK') AND EXISTS(
    SELECT 1 FROM public.accounting_periods p
    JOIN public.accounting_period_versions pv ON pv.profile_id=p.profile_id AND pv.period_id=p.id AND pv.version=p.current_version
    WHERE p.profile_id=v_profile_id AND p.id<>p_period_id
      AND pv.start_date<v_period.start_date AND pv.status='OPEN'
  ) THEN
    RETURN QUERY SELECT 'earlier_period_open'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
  END IF;
  IF p_package_kind='LOCK' AND EXISTS(
    SELECT 1 FROM public.accounting_periods p
    JOIN public.accounting_period_versions pv ON pv.profile_id=p.profile_id AND pv.period_id=p.id AND pv.version=p.current_version
    WHERE p.profile_id=v_profile_id AND p.id<>p_period_id
       AND pv.end_date<v_period.start_date AND pv.status='OPEN'
  ) THEN
     RETURN QUERY SELECT 'earlier_period_open'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
  END IF;
  IF p_package_kind='REOPEN' AND EXISTS(
    SELECT 1 FROM public.accounting_periods p
    JOIN public.accounting_period_versions pv ON pv.profile_id=p.profile_id AND pv.period_id=p.id AND pv.version=p.current_version
    WHERE p.profile_id=v_profile_id AND p.id<>p_period_id
      AND pv.start_date>v_period.start_date AND pv.status IN ('CLOSED','LOCKED')
  ) THEN
    RETURN QUERY SELECT 'later_finalized_period_exists'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
  END IF;
  IF p_package_kind IN ('CLOSE','LOCK') THEN
    PERFORM public.accounting_period_close_lock_evidence_tables();
    v_snapshot:=public.accounting_period_close_capture(p_actor_user_id,p_period_id,p_recorded_at_cutoff);
    v_exceptions:=ARRAY(SELECT jsonb_array_elements_text(coalesce(v_snapshot->'exception_codes','[]'::jsonb)));
    IF p_package_kind='LOCK' THEN
      SELECT p.* INTO v_prior FROM public.accounting_period_close_packages p
      JOIN public.accounting_period_close_reviews r
        ON r.profile_id=p.profile_id AND r.period_id=p.period_id AND r.package_id=p.id
          AND r.package_version=p.package_version AND r.decision='APPROVED'
      WHERE p.profile_id=v_profile_id AND p.period_id=p_period_id AND p.package_kind='CLOSE'
      ORDER BY p.package_version DESC LIMIT 1;
      IF FOUND THEN
        SELECT r.resulting_period_version INTO v_prior_closed_version
        FROM public.accounting_period_close_reviews r
        WHERE r.package_id=v_prior.id AND r.package_version=v_prior.package_version
          AND r.decision='APPROVED';
      END IF;
      IF NOT FOUND OR v_prior_closed_version IS DISTINCT FROM v_period.version THEN
        v_exceptions:=array_append(v_exceptions,'APPROVED_CLOSE_EVIDENCE_UNAVAILABLE');
      ELSIF v_prior.ledger_fingerprint IS DISTINCT FROM v_snapshot->>'ledger_fingerprint' THEN
        v_exceptions:=array_append(v_exceptions,'EVIDENCE_CHANGED_SINCE_CLOSE');
      END IF;
      v_snapshot:=jsonb_set(v_snapshot,'{prior_close_package}',coalesce(to_jsonb(v_prior.id), 'null'::jsonb),true);
    END IF;
  ELSE
    SELECT p.id,p.package_version,p.package_kind,p.evidence_fingerprint,
      r.reviewer_user_id,r.recorded_at,r.resulting_period_version
    INTO v_prior_finalization
    FROM public.accounting_period_close_packages p
    JOIN public.accounting_period_close_reviews r
      ON r.profile_id=p.profile_id AND r.period_id=p.period_id
        AND r.package_id=p.id AND r.package_version=p.package_version
        AND r.decision='APPROVED'
    WHERE p.profile_id=v_profile_id AND p.period_id=p_period_id
      AND p.package_kind=CASE v_period.status WHEN 'LOCKED' THEN 'LOCK' ELSE 'CLOSE' END
      AND r.resulting_period_version=v_period.version
    ORDER BY p.package_version DESC LIMIT 1;
    IF NOT FOUND THEN
      RETURN QUERY SELECT 'close_package_not_found'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
    END IF;
    v_snapshot:=jsonb_build_object(
      'state','READY','accounting_cutoff',v_period.end_date,'recorded_at_cutoff',p_recorded_at_cutoff,
      'period_id',p_period_id,'period_version',v_period.version,'period_start_date',v_period.start_date,
      'period_end_date',v_period.end_date,'prior_status',v_period.status,
      'prior_finalization',jsonb_build_object('package_id',v_prior_finalization.id,
        'package_version',v_prior_finalization.package_version,'package_kind',v_prior_finalization.package_kind,
        'evidence_fingerprint',v_prior_finalization.evidence_fingerprint,
        'reviewer_user_id',v_prior_finalization.reviewer_user_id,
        'reviewed_at',v_prior_finalization.recorded_at,
        'resulting_period_version',v_prior_finalization.resulting_period_version),
      'prior_close_packages',coalesce((SELECT jsonb_agg(jsonb_build_object(
        'package_id',p.id,'package_version',p.package_version,'package_kind',p.package_kind,
        'prepared_at',p.prepared_at,'evidence_fingerprint',p.evidence_fingerprint,
        'ledger_fingerprint',p.ledger_fingerprint,'review_decision',r.decision,'reviewed_at',r.recorded_at
      ) ORDER BY p.package_version) FROM public.accounting_period_close_packages p
        LEFT JOIN public.accounting_period_close_reviews r ON r.package_id=p.id AND r.package_version=p.package_version
      WHERE p.profile_id=v_profile_id AND p.period_id=p_period_id),'[]'::jsonb),
      'exception_codes','[]'::jsonb
    );
    v_exceptions:=ARRAY[]::text[];
    v_snapshot:=jsonb_set(v_snapshot,'{ledger_fingerprint}',
      to_jsonb(public.accounting_period_close_live_fingerprint(v_profile_id)),true);
    v_snapshot:=jsonb_set(v_snapshot,'{evidence_fingerprint}',
      to_jsonb(encode(extensions.digest(convert_to(v_snapshot::text,'UTF8'),'sha256'),'hex')),true);
  END IF;
  SELECT * INTO v_prior FROM public.accounting_period_close_packages p
    WHERE p.profile_id=v_profile_id AND p.period_id=p_period_id
    ORDER BY p.package_version DESC LIMIT 1;
  v_version:=coalesce(v_prior.package_version,0)+1;
  v_package_id:=gen_random_uuid();
  INSERT INTO public.accounting_period_close_packages(
    id,profile_id,period_id,package_version,package_kind,package_state,starting_period_version,
    period_start_date,period_end_date,accounting_cutoff,recorded_at_cutoff,preparer_user_id,
    reason,evidence_ref,previous_package_id,previous_package_version,prepared_at,evidence_snapshot,
    exception_codes,evidence_fingerprint,ledger_fingerprint,request_id,request_fingerprint
  ) VALUES(
    v_package_id,v_profile_id,p_period_id,v_version,p_package_kind,'PREPARED',v_period.version,
    v_period.start_date,v_period.end_date,v_period.end_date,p_recorded_at_cutoff,p_actor_user_id,
    btrim(p_reason),btrim(p_evidence_ref),v_prior.id,v_prior.package_version,v_now,v_snapshot,
    v_exceptions,coalesce(v_snapshot->>'evidence_fingerprint',encode(extensions.digest(convert_to(v_snapshot::text,'UTF8'),'sha256'),'hex')),
    coalesce(v_snapshot->>'ledger_fingerprint',encode(extensions.digest(convert_to(v_snapshot::text,'UTF8'),'sha256'),'hex')),
    p_request_id,v_request_fingerprint
  );
  RETURN QUERY SELECT NULL::text,v_package_id,v_version,'PREPARED'::text,v_snapshot,false;
EXCEPTION
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::text,NULL::jsonb,false; RETURN;
END;
$prepare_period_close$;

CREATE FUNCTION public.review_accounting_period_close(
  p_actor_user_id uuid,p_package_id uuid,p_package_version integer,
  p_approve boolean,p_reason text,p_request_id uuid
) RETURNS TABLE(error_code text,package_id uuid,package_version integer,
  decision text,resulting_period_version integer,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $review_period_close$
DECLARE
  v_profile_id uuid; v_package public.accounting_period_close_packages%ROWTYPE;
  v_prior_review public.accounting_period_close_reviews%ROWTYPE;
  v_period public.accounting_period_versions%ROWTYPE;
  v_snapshot jsonb; v_decision text; v_capability text; v_fingerprint text;
  v_request_fingerprint text; v_profile_lock bigint; v_request_lock bigint; v_lock bigint;
  v_event_id uuid; v_event_type text; v_new_version integer; v_now timestamptz:=transaction_timestamp();
  v_profile public.accounting_profiles%ROWTYPE;
  v_profile_version public.accounting_profile_versions%ROWTYPE;
BEGIN
  IF p_actor_user_id IS NULL OR p_package_id IS NULL OR p_package_version IS NULL
     OR p_package_version<1 OR p_approve IS NULL OR p_request_id IS NULL
     OR NULLIF(btrim(p_reason),'') IS NULL OR length(btrim(p_reason))>2000 THEN
    RETURN QUERY SELECT 'invalid_input'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN;
  END IF;
   PERFORM 1 FROM public.app_users u
   WHERE u.id=p_actor_user_id AND u.is_active IS TRUE FOR SHARE;
   IF NOT FOUND THEN
    RETURN QUERY SELECT 'actor_inactive'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN;
  END IF;
  SELECT p.* INTO v_package FROM public.accounting_period_close_packages p WHERE p.id=p_package_id;
  IF NOT FOUND THEN RETURN QUERY SELECT 'close_package_not_found'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN; END IF;
  v_capability:=CASE WHEN v_package.package_kind='REOPEN' THEN 'accounting:reopen_period' ELSE 'accounting:close_period' END;
  IF NOT public.get_accounting_capability(p_actor_user_id,v_capability) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  v_profile_id:=v_package.profile_id;
  v_profile_lock:=pg_catalog.hashtextextended('w10a2a-period:'||v_profile_id::text,0);
  v_request_lock:=pg_catalog.hashtextextended('w10i-review-request:'||v_profile_id::text||':'||p_actor_user_id::text||':'||p_request_id::text,0);
  FOR v_lock IN SELECT DISTINCT lock_id FROM unnest(ARRAY[v_profile_lock,v_request_lock]) AS locks(lock_id) ORDER BY lock_id
  LOOP PERFORM pg_catalog.pg_advisory_xact_lock(v_lock); END LOOP;
  v_request_fingerprint:=encode(extensions.digest(convert_to(jsonb_build_object(
    'package_id',p_package_id,'package_version',p_package_version,'approve',p_approve,
    'reason',btrim(p_reason)
  )::text,'UTF8'),'sha256'),'hex');
  SELECT * INTO v_prior_review FROM public.accounting_period_close_reviews r
    WHERE r.profile_id=v_profile_id AND r.reviewer_user_id=p_actor_user_id AND r.request_id=p_request_id;
  IF FOUND THEN
    IF v_prior_review.request_fingerprint<>v_request_fingerprint THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,v_prior_review.package_id,v_prior_review.package_version,
      v_prior_review.decision,v_prior_review.resulting_period_version,true; RETURN;
  END IF;
  SELECT * INTO v_package FROM public.accounting_period_close_packages p
    WHERE p.profile_id=v_profile_id AND p.period_id=v_package.period_id
      AND p.id=p_package_id AND p.package_version=p_package_version FOR SHARE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'close_package_not_found'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN; END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_period_close_reviews r
      WHERE r.package_id=p_package_id AND r.package_version=p_package_version) THEN
    RETURN QUERY SELECT 'review_exists'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN;
  END IF;
  IF p_actor_user_id=v_package.preparer_user_id THEN
    RETURN QUERY SELECT 'independent_review_required'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN;
  END IF;
  SELECT pv.* INTO v_period FROM public.accounting_period_versions pv
  JOIN public.accounting_periods p ON p.profile_id=pv.profile_id AND p.id=pv.period_id AND p.current_version=pv.version
  WHERE pv.profile_id=v_profile_id AND pv.period_id=v_package.period_id FOR UPDATE OF p;
  IF NOT FOUND OR v_period.version<>v_package.starting_period_version
     OR v_period.start_date<>v_package.period_start_date OR v_period.end_date<>v_package.period_end_date THEN
    v_decision:='STALE';
    INSERT INTO public.accounting_period_close_reviews(
      profile_id,period_id,package_id,package_version,reviewer_user_id,decision,reason,
      recomputed_evidence_fingerprint,recomputed_ledger_fingerprint,request_id,request_fingerprint
    ) VALUES(v_profile_id,v_package.period_id,p_package_id,p_package_version,p_actor_user_id,v_decision,
      btrim(p_reason),NULL,NULL,p_request_id,v_request_fingerprint);
    RETURN QUERY SELECT 'close_package_stale'::text,p_package_id,p_package_version,v_decision,NULL::integer,false; RETURN;
  END IF;
  IF v_package.package_kind IN ('CLOSE','LOCK') THEN
    PERFORM public.accounting_period_close_lock_evidence_tables();
    v_snapshot:=public.accounting_period_close_capture(p_actor_user_id,v_package.period_id,v_package.recorded_at_cutoff);
    v_fingerprint:=v_snapshot->>'evidence_fingerprint';
    IF v_fingerprint IS DISTINCT FROM v_package.evidence_fingerprint
       OR v_snapshot->>'ledger_fingerprint' IS DISTINCT FROM v_package.ledger_fingerprint THEN
      INSERT INTO public.accounting_period_close_reviews(
        profile_id,period_id,package_id,package_version,reviewer_user_id,decision,reason,
        recomputed_evidence_fingerprint,recomputed_ledger_fingerprint,request_id,request_fingerprint
      ) VALUES(v_profile_id,v_package.period_id,p_package_id,p_package_version,p_actor_user_id,'STALE',
        btrim(p_reason),v_fingerprint,v_snapshot->>'ledger_fingerprint',p_request_id,v_request_fingerprint);
      RETURN QUERY SELECT 'close_package_stale'::text,p_package_id,p_package_version,'STALE'::text,NULL::integer,false; RETURN;
    END IF;
    IF cardinality(v_package.exception_codes)>0 OR v_snapshot->>'state'<>'READY' THEN
      INSERT INTO public.accounting_period_close_reviews(
        profile_id,period_id,package_id,package_version,reviewer_user_id,decision,reason,
        recomputed_evidence_fingerprint,recomputed_ledger_fingerprint,request_id,request_fingerprint
      ) VALUES(v_profile_id,v_package.period_id,p_package_id,p_package_version,p_actor_user_id,'REJECTED',
        btrim(p_reason),v_fingerprint,v_snapshot->>'ledger_fingerprint',p_request_id,v_request_fingerprint);
      RETURN QUERY SELECT 'close_evidence_incomplete'::text,p_package_id,p_package_version,'REJECTED'::text,NULL::integer,false; RETURN;
    END IF;
  ELSE
    v_snapshot:=jsonb_build_object('period_id',v_package.period_id,'period_version',v_period.version,
      'status',v_period.status,'period_start_date',v_period.start_date,'period_end_date',v_period.end_date);
    IF EXISTS(
      SELECT 1 FROM public.accounting_periods p
      JOIN public.accounting_period_versions pv ON pv.profile_id=p.profile_id AND pv.period_id=p.id AND pv.version=p.current_version
      WHERE p.profile_id=v_profile_id AND p.id<>v_package.period_id
        AND pv.start_date>v_period.start_date AND pv.status IN ('CLOSED','LOCKED')
    ) THEN
      INSERT INTO public.accounting_period_close_reviews(
        profile_id,period_id,package_id,package_version,reviewer_user_id,decision,reason,
        request_id,request_fingerprint
      ) VALUES(v_profile_id,v_package.period_id,p_package_id,p_package_version,p_actor_user_id,'REJECTED',
        btrim(p_reason),p_request_id,v_request_fingerprint);
      RETURN QUERY SELECT 'later_finalized_period_exists'::text,p_package_id,p_package_version,'REJECTED'::text,NULL::integer,false; RETURN;
    END IF;
  END IF;

  IF NOT p_approve THEN
    INSERT INTO public.accounting_period_close_reviews(
      profile_id,period_id,package_id,package_version,reviewer_user_id,decision,reason,
      recomputed_evidence_fingerprint,recomputed_ledger_fingerprint,request_id,request_fingerprint
    ) VALUES(v_profile_id,v_package.period_id,p_package_id,p_package_version,p_actor_user_id,'REJECTED',
      btrim(p_reason),v_snapshot->>'evidence_fingerprint',v_snapshot->>'ledger_fingerprint',p_request_id,v_request_fingerprint);
    RETURN QUERY SELECT NULL::text,p_package_id,p_package_version,'REJECTED'::text,NULL::integer,false; RETURN;
  END IF;

  SELECT p.* INTO v_profile FROM public.accounting_profiles p WHERE p.id=v_profile_id;
  SELECT pv.* INTO v_profile_version FROM public.accounting_profile_versions pv
  WHERE pv.profile_id=v_profile_id AND pv.created_at<=v_package.recorded_at_cutoff
    AND pv.effective_from<((v_period.end_date::timestamp+interval '1 day') AT TIME ZONE 'Asia/Riyadh')
  ORDER BY pv.effective_from DESC,pv.version DESC LIMIT 1;
  IF v_package.package_kind='LOCK' AND
     v_profile_version.version IS NOT NULL
     AND extract(month FROM v_period.end_date)::integer=v_profile_version.fiscal_end_month
     AND extract(day FROM v_period.end_date)::integer=v_profile_version.fiscal_end_day THEN
    INSERT INTO public.accounting_period_close_reviews(
      profile_id,period_id,package_id,package_version,reviewer_user_id,decision,reason,
      recomputed_evidence_fingerprint,recomputed_ledger_fingerprint,request_id,request_fingerprint
    ) VALUES(v_profile_id,v_package.period_id,p_package_id,p_package_version,p_actor_user_id,'REJECTED',
      btrim(p_reason),v_snapshot->>'evidence_fingerprint',v_snapshot->>'ledger_fingerprint',p_request_id,v_request_fingerprint);
    RETURN QUERY SELECT 'year_end_result_treatment_pending'::text,p_package_id,p_package_version,'REJECTED'::text,NULL::integer,false; RETURN;
  END IF;
  IF v_package.package_kind='CLOSE' AND v_period.status<>'OPEN' THEN
    RETURN QUERY SELECT 'period_not_open'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN;
  ELSIF v_package.package_kind='LOCK' AND v_period.status<>'CLOSED' THEN
    RETURN QUERY SELECT 'period_not_closed'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN;
  ELSIF v_package.package_kind='REOPEN' AND v_period.status NOT IN ('CLOSED','LOCKED') THEN
    RETURN QUERY SELECT 'period_not_finalized'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN;
  END IF;

  v_new_version:=v_period.version+1;
  v_event_type:=CASE v_package.package_kind WHEN 'CLOSE' THEN 'accounting_period_closed'
    WHEN 'LOCK' THEN 'accounting_period_locked' ELSE 'accounting_period_reopened' END;
  v_event_id:=gen_random_uuid();
  INSERT INTO public.accounting_foundation_events(
    id,profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,
    request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at
  ) VALUES(v_event_id,v_profile_id,v_event_type,'accounting_period',v_package.period_id,v_new_version,
    p_actor_user_id,p_request_id,btrim(p_reason),v_package.evidence_ref,
    encode(extensions.digest(convert_to(jsonb_build_object('package_id',p_package_id,'package_version',p_package_version,
      'kind',v_package.package_kind,'snapshot',v_snapshot)::text,'UTF8'),'sha256'),'hex'),
    'accounting_periods/'||v_package.period_id::text||'/'||v_new_version::text,v_now);
  INSERT INTO public.accounting_period_versions(
    profile_id,period_id,version,previous_version,start_date,end_date,status,effective_from,
    reason,evidence_ref,created_by,created_at,foundation_event_id
  ) VALUES(v_profile_id,v_package.period_id,v_new_version,v_period.version,v_period.start_date,v_period.end_date,
    CASE v_package.package_kind WHEN 'CLOSE' THEN 'CLOSED' WHEN 'LOCK' THEN 'LOCKED' ELSE 'OPEN' END,
    v_now,btrim(p_reason),v_package.evidence_ref,p_actor_user_id,v_now,v_event_id);
  UPDATE public.accounting_periods SET current_version=v_new_version
    WHERE profile_id=v_profile_id AND id=v_package.period_id;
  INSERT INTO public.accounting_period_close_reviews(
    profile_id,period_id,package_id,package_version,reviewer_user_id,decision,reason,
    recomputed_evidence_fingerprint,recomputed_ledger_fingerprint,resulting_period_version,
    request_id,request_fingerprint
  ) VALUES(v_profile_id,v_package.period_id,p_package_id,p_package_version,p_actor_user_id,'APPROVED',
    btrim(p_reason),v_snapshot->>'evidence_fingerprint',v_snapshot->>'ledger_fingerprint',v_new_version,
    p_request_id,v_request_fingerprint);
  INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
  VALUES(v_package.package_kind||'_ACCOUNTING_PERIOD','accounting_period',v_package.period_id,
    p_actor_user_id::text,jsonb_build_object('package_id',p_package_id,'package_version',p_package_version,
      'prior_period_version',v_period.version,'period_version',v_new_version,
      'status',CASE v_package.package_kind WHEN 'CLOSE' THEN 'CLOSED' WHEN 'LOCK' THEN 'LOCKED' ELSE 'OPEN' END,
      'recorded_at_cutoff',v_package.recorded_at_cutoff),v_now);
  RETURN QUERY SELECT NULL::text,p_package_id,p_package_version,'APPROVED'::text,v_new_version,false;
EXCEPTION
  WHEN serialization_failure THEN
    RETURN QUERY SELECT 'revision_conflict'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN;
  WHEN unique_violation THEN
    RETURN QUERY SELECT 'review_exists'::text,NULL::uuid,NULL::integer,NULL::text,NULL::integer,false; RETURN;
END;
$review_period_close$;

CREATE FUNCTION public.get_accounting_period_close_evidence(
  p_actor_user_id uuid,p_period_id uuid,p_recorded_at_cutoff timestamptz
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $get_period_close_evidence$
DECLARE v_profile_id uuid; v_period jsonb; v_current_period jsonb; v_history jsonb;
BEGIN
  IF p_actor_user_id IS NULL OR p_period_id IS NULL OR p_recorded_at_cutoff IS NULL
      OR NOT isfinite(p_recorded_at_cutoff) OR p_recorded_at_cutoff>clock_timestamp() THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_PERIOD_CLOSE_INVALID_INPUT';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:view') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT p.id INTO v_profile_id FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF NOT FOUND THEN RETURN jsonb_build_object('state','NOT_INITIALIZED'); END IF;
  SELECT jsonb_build_object('period_id',pv.period_id,'profile_id',pv.profile_id,
      'version',pv.version,'status',pv.status,'start_date',pv.start_date,'end_date',pv.end_date,
      'effective_from',pv.effective_from,'reason',pv.reason,'evidence_ref',pv.evidence_ref,
      'created_by',pv.created_by,'created_at',pv.created_at)
    INTO v_period
  FROM public.accounting_period_versions pv
  WHERE pv.profile_id=v_profile_id AND pv.period_id=p_period_id
    AND pv.created_at<=p_recorded_at_cutoff
  ORDER BY pv.version DESC LIMIT 1;
  IF v_period IS NULL THEN RETURN jsonb_build_object('state','NOT_FOUND'); END IF;
  SELECT jsonb_build_object('period_id',pv.period_id,'profile_id',pv.profile_id,
      'version',pv.version,'status',pv.status,'start_date',pv.start_date,'end_date',pv.end_date,
      'effective_from',pv.effective_from,'reason',pv.reason,'evidence_ref',pv.evidence_ref,
      'created_by',pv.created_by,'created_at',pv.created_at)
    INTO v_current_period
  FROM public.accounting_periods p
  JOIN public.accounting_period_versions pv
    ON pv.profile_id=p.profile_id AND pv.period_id=p.id AND pv.version=p.current_version
  WHERE p.profile_id=v_profile_id AND p.id=p_period_id;
  IF v_current_period IS NULL THEN RETURN jsonb_build_object('state','NOT_FOUND'); END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'package_id',p.id,'package_version',p.package_version,'package_kind',p.package_kind,
      'package_state',p.package_state,'starting_period_version',p.starting_period_version,
      'period_start_date',p.period_start_date,'period_end_date',p.period_end_date,
      'accounting_cutoff',p.accounting_cutoff,'recorded_at_cutoff',p.recorded_at_cutoff,
      'preparer_user_id',p.preparer_user_id,'prepared_at',p.prepared_at,
      'reason',p.reason,'evidence_ref',p.evidence_ref,'previous_package_id',p.previous_package_id,
      'previous_package_version',p.previous_package_version,'evidence_snapshot',p.evidence_snapshot,
      'exception_codes',to_jsonb(p.exception_codes),'evidence_fingerprint',p.evidence_fingerprint,
      'ledger_fingerprint',p.ledger_fingerprint,'review',CASE WHEN r.id IS NULL THEN NULL ELSE
        jsonb_build_object('reviewer_user_id',r.reviewer_user_id,'decision',r.decision,
          'reason',r.reason,'recorded_at',r.recorded_at,'resulting_period_version',r.resulting_period_version) END
    ) ORDER BY p.package_version),'[]'::jsonb)
    INTO v_history
  FROM public.accounting_period_close_packages p
  LEFT JOIN public.accounting_period_close_reviews r
    ON r.profile_id=p.profile_id AND r.period_id=p.period_id
      AND r.package_id=p.id AND r.package_version=p.package_version
      AND r.recorded_at<=p_recorded_at_cutoff
  WHERE p.profile_id=v_profile_id AND p.period_id=p_period_id
    AND p.prepared_at<=p_recorded_at_cutoff;
  RETURN jsonb_build_object('state','READY','period',v_period,'current_period',v_current_period,
    'packages',v_history,'recorded_at_cutoff',p_recorded_at_cutoff);
END;
$get_period_close_evidence$;

ALTER FUNCTION public.accounting_period_close_live_fingerprint(uuid) OWNER TO postgres;
ALTER FUNCTION public.accounting_period_close_capture(uuid,uuid,timestamptz) OWNER TO postgres;
ALTER FUNCTION public.accounting_period_close_lock_evidence_tables() OWNER TO postgres;
ALTER FUNCTION public.reject_accounting_period_close_mutation() OWNER TO postgres;
ALTER FUNCTION public.validate_accounting_period_close_review() OWNER TO postgres;
ALTER FUNCTION public.prepare_accounting_period_close(uuid,uuid,integer,text,text,text,timestamptz,uuid) OWNER TO postgres;
ALTER FUNCTION public.review_accounting_period_close(uuid,uuid,integer,boolean,text,uuid) OWNER TO postgres;
ALTER FUNCTION public.get_accounting_period_close_evidence(uuid,uuid,timestamptz) OWNER TO postgres;
ALTER FUNCTION public.validate_accounting_period_version() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.accounting_period_close_live_fingerprint(uuid) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_period_close_capture(uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_period_close_lock_evidence_tables() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reject_accounting_period_close_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.validate_accounting_period_close_review() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.validate_accounting_period_version() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prepare_accounting_period_close(uuid,uuid,integer,text,text,text,timestamptz,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.review_accounting_period_close(uuid,uuid,integer,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_accounting_period_close_evidence(uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_accounting_period_close(uuid,uuid,integer,text,text,text,timestamptz,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_accounting_period_close(uuid,uuid,integer,boolean,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_period_close_evidence(uuid,uuid,timestamptz) TO service_role;

DO $w10i_postflight$
DECLARE v_bad text;
BEGIN
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_catalog.pg_class
      WHERE oid='public.accounting_period_close_packages'::regclass)
     OR NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_catalog.pg_class
      WHERE oid='public.accounting_period_close_reviews'::regclass) THEN
    RAISE EXCEPTION 'W10I postflight: close evidence tables must use enabled and forced RLS';
  END IF;
  IF has_table_privilege('service_role','public.accounting_period_close_packages','SELECT')
     OR has_table_privilege('service_role','public.accounting_period_close_packages','INSERT')
     OR has_table_privilege('service_role','public.accounting_period_close_packages','UPDATE')
     OR has_table_privilege('service_role','public.accounting_period_close_packages','DELETE')
     OR has_table_privilege('service_role','public.accounting_period_close_reviews','SELECT')
     OR has_table_privilege('service_role','public.accounting_period_close_reviews','INSERT')
     OR has_table_privilege('service_role','public.accounting_period_close_reviews','UPDATE')
     OR has_table_privilege('service_role','public.accounting_period_close_reviews','DELETE') THEN
    RAISE EXCEPTION 'W10I postflight: close evidence tables must remain RPC-only';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'accounting_period_close_live_fingerprint','accounting_period_close_capture',
      'accounting_period_close_lock_evidence_tables','reject_accounting_period_close_mutation',
      'validate_accounting_period_close_review','validate_accounting_period_version',
      'prepare_accounting_period_close','review_accounting_period_close',
      'get_accounting_period_close_evidence'
    ) AND (NOT p.prosecdef OR pg_catalog.pg_get_userbyid(p.proowner)<>'postgres'
      OR NOT EXISTS(SELECT 1 FROM unnest(coalesce(p.proconfig,ARRAY[]::text[])) s(setting)
        WHERE replace(s.setting,' ','')='search_path=pg_catalog,public'))
  ) THEN
    RAISE EXCEPTION 'W10I postflight: function owner, SECURITY DEFINER, or fixed search_path differs';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'prepare_accounting_period_close','review_accounting_period_close',
      'get_accounting_period_close_evidence'
    ) AND (has_function_privilege('anon',p.oid,'EXECUTE')
      OR has_function_privilege('authenticated',p.oid,'EXECUTE')
      OR NOT has_function_privilege('service_role',p.oid,'EXECUTE'))
  ) THEN
    RAISE EXCEPTION 'W10I postflight: RPC execution ACL must be service-role only';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'accounting_period_close_live_fingerprint','accounting_period_close_capture',
      'accounting_period_close_lock_evidence_tables','reject_accounting_period_close_mutation',
      'validate_accounting_period_close_review','validate_accounting_period_version'
    ) AND (has_function_privilege('anon',p.oid,'EXECUTE')
      OR has_function_privilege('authenticated',p.oid,'EXECUTE')
      OR has_function_privilege('service_role',p.oid,'EXECUTE'))
  ) THEN
    RAISE EXCEPTION 'W10I postflight: internal helper execution must remain postgres-only';
  END IF;
  SELECT string_agg(capability||'='||enabled||'/'||runtime_allow_grantable||'/'||owner_slice,',')
    INTO v_bad FROM public.accounting_capability_catalog
    WHERE capability IN ('accounting:close_period','accounting:reopen_period')
      AND (NOT enabled OR NOT runtime_allow_grantable OR owner_slice<>'W10I');
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'W10I postflight: W10I capabilities not activated: %',v_bad; END IF;
END;
$w10i_postflight$;

COMMIT;
