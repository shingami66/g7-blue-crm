-- W10H: versioned financial-statement mapping and exact posted-journal reports.
-- No chart, profile, period, mapping, journal, or authority is seeded.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.accounting_profiles') IS NULL
     OR to_regclass('public.accounting_profile_versions') IS NULL
     OR to_regclass('public.accounting_accounts') IS NULL
     OR to_regclass('public.accounting_account_versions') IS NULL
     OR to_regclass('public.accounting_journals') IS NULL
     OR to_regclass('public.accounting_journal_versions') IS NULL
     OR to_regclass('public.accounting_journal_line_versions') IS NULL
     OR to_regclass('public.accounting_capability_catalog') IS NULL
     OR to_regclass('public.accounting_inception_acceptances') IS NULL THEN
    RAISE EXCEPTION 'W10H preflight: required W10 accounting foundation is missing';
  END IF;
  IF to_regclass('public.accounting_statement_mapping_sets') IS NOT NULL
     OR to_regclass('public.accounting_statement_mapping_versions') IS NOT NULL
     OR to_regclass('public.accounting_statement_mapping_entries') IS NOT NULL
     OR to_regprocedure('public.save_accounting_statement_mapping(uuid,uuid,uuid,integer,timestamptz,text,text,jsonb,uuid)') IS NOT NULL
     OR to_regprocedure('public.get_w10h_accounting_report(uuid,text,date,date,timestamptz,uuid,uuid,integer,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'W10H preflight: reporting objects already exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounting_capability_catalog
    WHERE capability='accounting:view_statements' AND NOT enabled
      AND NOT runtime_allow_grantable AND owner_slice='W10H') THEN
    RAISE EXCEPTION 'W10H preflight: statement capability baseline differs';
  END IF;
END;
$preflight$;

ALTER TABLE public.accounting_capability_catalog
  DROP CONSTRAINT accounting_capability_catalog_state_check;
UPDATE public.accounting_capability_catalog
SET enabled=true,runtime_allow_grantable=true
WHERE capability='accounting:view_statements' AND owner_slice='W10H';
ALTER TABLE public.accounting_capability_catalog
  ADD CONSTRAINT accounting_capability_catalog_state_check CHECK (
    (capability IN ('accounting:view','accounting:manage_profile') AND enabled AND runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability='accounting:manage_authority' AND enabled AND NOT runtime_allow_grantable AND owner_slice='W10A1')
    OR (capability IN ('accounting:manage_chart','accounting:manage_periods') AND enabled AND runtime_allow_grantable AND owner_slice='W10A2')
    OR (capability IN ('accounting:prepare_journal','accounting:post_journal','accounting:reverse_journal') AND enabled AND runtime_allow_grantable AND owner_slice='W10B')
    OR (capability='accounting:manage_inception' AND enabled AND runtime_allow_grantable AND owner_slice='W10C')
    OR (capability='accounting:manage_ar_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10D')
    OR (capability IN ('accounting:manage_ap_bridge','accounting:manage_expense_bridge') AND enabled AND runtime_allow_grantable AND owner_slice='W10E')
    OR (capability='accounting:manage_revenue_recognition' AND enabled AND runtime_allow_grantable AND owner_slice='W10F')
    OR (capability='accounting:reconcile_bank' AND enabled AND runtime_allow_grantable AND owner_slice='W10G')
    OR (capability='accounting:view_statements' AND enabled AND runtime_allow_grantable AND owner_slice='W10H')
    OR (capability IN ('accounting:close_period','accounting:reopen_period') AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I')
  );

CREATE TABLE public.accounting_statement_mapping_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.accounting_profiles(id) ON DELETE RESTRICT,
  current_version integer NOT NULL DEFAULT 0 CHECK(current_version>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(profile_id,id), UNIQUE(profile_id)
);

CREATE TABLE public.accounting_statement_mapping_versions (
  profile_id uuid NOT NULL,
  mapping_set_id uuid NOT NULL,
  version integer NOT NULL CHECK(version>0),
  previous_version integer,
  effective_from timestamptz NOT NULL,
  reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
  evidence_ref text NOT NULL CHECK(length(btrim(evidence_ref)) BETWEEN 1 AND 2000),
  created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  payload_fingerprint text NOT NULL CHECK(length(payload_fingerprint)=32),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(profile_id,mapping_set_id,version),
  FOREIGN KEY(profile_id,mapping_set_id) REFERENCES public.accounting_statement_mapping_sets(profile_id,id) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,mapping_set_id,previous_version)
    REFERENCES public.accounting_statement_mapping_versions(profile_id,mapping_set_id,version) ON DELETE RESTRICT,
  UNIQUE(profile_id,request_id)
);
ALTER TABLE public.accounting_statement_mapping_sets
  ADD CONSTRAINT accounting_statement_mapping_sets_current_version_fkey
  FOREIGN KEY(profile_id,id,current_version)
  REFERENCES public.accounting_statement_mapping_versions(profile_id,mapping_set_id,version)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE public.accounting_statement_mapping_entries (
  profile_id uuid NOT NULL,
  mapping_set_id uuid NOT NULL,
  mapping_version integer NOT NULL,
  account_id uuid NOT NULL,
  account_version integer NOT NULL,
  statement_type text NOT NULL CHECK(statement_type IN ('PROFIT_LOSS','BALANCE_SHEET')),
  section_key text NOT NULL CHECK(section_key ~ '^[A-Z][A-Z0-9_]{0,39}$'),
  line_key text NOT NULL CHECK(line_key ~ '^[A-Z][A-Z0-9_]{0,59}$'),
  label_en text NOT NULL CHECK(length(btrim(label_en)) BETWEEN 1 AND 160),
  label_ar text NOT NULL CHECK(length(btrim(label_ar)) BETWEEN 1 AND 160),
  display_order integer NOT NULL CHECK(display_order BETWEEN 0 AND 100000),
  PRIMARY KEY(profile_id,mapping_set_id,mapping_version,account_id,account_version,statement_type),
  FOREIGN KEY(profile_id,mapping_set_id,mapping_version)
    REFERENCES public.accounting_statement_mapping_versions(profile_id,mapping_set_id,version) ON DELETE RESTRICT,
  FOREIGN KEY(profile_id,account_id,account_version)
    REFERENCES public.accounting_account_versions(profile_id,account_id,version) ON DELETE RESTRICT
);
CREATE INDEX accounting_statement_mapping_effective_idx
  ON public.accounting_statement_mapping_versions(profile_id,effective_from,created_at DESC,version DESC);

CREATE FUNCTION public.validate_accounting_statement_mapping_entry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $validate_statement_mapping$
DECLARE v_account_type text;
BEGIN
  SELECT account_type INTO v_account_type FROM public.accounting_account_versions
    WHERE profile_id=NEW.profile_id AND account_id=NEW.account_id AND version=NEW.account_version;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23503',MESSAGE='ACCOUNTING_STATEMENT_ACCOUNT_VERSION_NOT_FOUND'; END IF;
  IF (v_account_type IN ('REVENUE','EXPENSE') AND NEW.statement_type<>'PROFIT_LOSS')
     OR (v_account_type IN ('ASSET','LIABILITY','EQUITY') AND NEW.statement_type<>'BALANCE_SHEET') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_STATEMENT_TYPE_ACCOUNT_MISMATCH';
  END IF;
  IF (NEW.statement_type='PROFIT_LOSS' AND
       ((v_account_type='REVENUE' AND NEW.section_key<>'REVENUE') OR (v_account_type='EXPENSE' AND NEW.section_key<>'EXPENSE')))
     OR (NEW.statement_type='BALANCE_SHEET' AND
       ((v_account_type='ASSET' AND NEW.section_key<>'ASSETS')
        OR (v_account_type='LIABILITY' AND NEW.section_key<>'LIABILITIES')
        OR (v_account_type='EQUITY' AND NEW.section_key<>'EQUITY'))) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_STATEMENT_SECTION_ACCOUNT_MISMATCH';
  END IF;
  RETURN NEW;
END;
$validate_statement_mapping$;
CREATE TRIGGER accounting_statement_mapping_entry_validate
  BEFORE INSERT ON public.accounting_statement_mapping_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_accounting_statement_mapping_entry();

CREATE FUNCTION public.reject_accounting_statement_mapping_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $reject_statement_mapping_mutation$
BEGIN
  RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_STATEMENT_MAPPING_APPEND_ONLY';
END;
$reject_statement_mapping_mutation$;
CREATE TRIGGER accounting_statement_mapping_versions_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_statement_mapping_versions
  FOR EACH ROW EXECUTE FUNCTION public.reject_accounting_statement_mapping_mutation();
CREATE TRIGGER accounting_statement_mapping_entries_immutable
  BEFORE UPDATE OR DELETE ON public.accounting_statement_mapping_entries
  FOR EACH ROW EXECUTE FUNCTION public.reject_accounting_statement_mapping_mutation();

CREATE FUNCTION public.save_accounting_statement_mapping(
  p_actor_user_id uuid,p_profile_id uuid,p_mapping_set_id uuid,p_expected_version integer,
  p_effective_from timestamptz,p_reason text,p_evidence_ref text,p_entries jsonb,p_request_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $save_statement_mapping$
DECLARE
  v_set_id uuid; v_current integer; v_version integer; v_fingerprint text; v_existing public.accounting_statement_mapping_versions%ROWTYPE;
  v_entry_count integer;
BEGIN
  IF p_actor_user_id IS NULL OR p_profile_id IS NULL OR p_expected_version IS NULL
     OR p_effective_from IS NULL OR NOT isfinite(p_effective_from) OR p_request_id IS NULL
     OR length(btrim(coalesce(p_reason,'')))=0 OR length(btrim(coalesce(p_evidence_ref,'')))=0 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_STATEMENT_MAPPING_INPUT_INVALID';
  END IF;
  IF p_entries IS NULL OR jsonb_typeof(p_entries) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_STATEMENT_MAPPING_INPUT_INVALID';
  END IF;
  IF jsonb_array_length(p_entries)=0 OR jsonb_array_length(p_entries)>2000 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_STATEMENT_MAPPING_INPUT_INVALID';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_entries) AS e(
      statement_type text,section_key text,line_key text,label_en text,label_ar text,display_order integer
    ) GROUP BY e.statement_type,e.line_key
    HAVING min(e.section_key) IS DISTINCT FROM max(e.section_key)
       OR min(e.label_en) IS DISTINCT FROM max(e.label_en)
       OR min(e.label_ar) IS DISTINCT FROM max(e.label_ar)
       OR min(e.display_order) IS DISTINCT FROM max(e.display_order)
  ) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_STATEMENT_MAPPING_LINE_CONFLICT';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_chart') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_profiles p WHERE p.id=p_profile_id AND p.singleton_key='g7') THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_PROFILE_NOT_FOUND';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('w10h-map:'||p_profile_id::text,0));
  v_fingerprint:=md5(coalesce(p_mapping_set_id::text,'<new>')||'|'||p_expected_version::text||'|'||
    p_entries::text||'|'||p_effective_from::text||'|'||p_reason||'|'||p_evidence_ref);
  SELECT * INTO v_existing FROM public.accounting_statement_mapping_versions
    WHERE profile_id=p_profile_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_existing.payload_fingerprint<>v_fingerprint THEN
      RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='ACCOUNTING_REQUEST_ID_CONFLICT';
    END IF;
    RETURN jsonb_build_object('mapping_set_id',v_existing.mapping_set_id,'version',v_existing.version,'idempotent_replay',true);
  END IF;
  IF p_mapping_set_id IS NULL THEN
    IF p_expected_version<>0 OR EXISTS(SELECT 1 FROM public.accounting_statement_mapping_sets WHERE profile_id=p_profile_id) THEN
      RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_STATEMENT_MAPPING_REVISION_CONFLICT';
    END IF;
    INSERT INTO public.accounting_statement_mapping_sets(profile_id) VALUES(p_profile_id) RETURNING id INTO v_set_id;
    v_current:=0;
  ELSE
    SELECT id,current_version INTO v_set_id,v_current FROM public.accounting_statement_mapping_sets
      WHERE profile_id=p_profile_id AND id=p_mapping_set_id FOR UPDATE;
    IF NOT FOUND OR v_current<>p_expected_version THEN
      RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='ACCOUNTING_STATEMENT_MAPPING_REVISION_CONFLICT';
    END IF;
  END IF;
  v_version:=v_current+1;
  INSERT INTO public.accounting_statement_mapping_versions(
    profile_id,mapping_set_id,version,previous_version,effective_from,reason,evidence_ref,
    created_by,request_id,payload_fingerprint
  ) VALUES(p_profile_id,v_set_id,v_version,NULLIF(v_current,0),p_effective_from,
    btrim(p_reason),btrim(p_evidence_ref),p_actor_user_id,p_request_id,v_fingerprint);
  INSERT INTO public.accounting_statement_mapping_entries(
    profile_id,mapping_set_id,mapping_version,account_id,account_version,statement_type,
    section_key,line_key,label_en,label_ar,display_order
  )
  SELECT p_profile_id,v_set_id,v_version,e.account_id,e.account_version,e.statement_type,
    e.section_key,e.line_key,e.label_en,e.label_ar,e.display_order
  FROM jsonb_to_recordset(p_entries) AS e(
    account_id uuid,account_version integer,statement_type text,section_key text,line_key text,
    label_en text,label_ar text,display_order integer
  );
  GET DIAGNOSTICS v_entry_count=ROW_COUNT;
  IF v_entry_count<>jsonb_array_length(p_entries) THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_STATEMENT_MAPPING_ENTRY_INVALID';
  END IF;
  UPDATE public.accounting_statement_mapping_sets SET current_version=v_version
    WHERE profile_id=p_profile_id AND id=v_set_id;
  RETURN jsonb_build_object('mapping_set_id',v_set_id,'version',v_version,'idempotent_replay',false);
END;
$save_statement_mapping$;

CREATE FUNCTION public.get_w10h_accounting_report(
  p_actor_user_id uuid,p_report_type text,p_from_date date,p_through_date date,
  p_recorded_at_cutoff timestamptz,p_account_id uuid,p_service_id uuid,p_offset integer,p_limit integer
)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10h_report$
DECLARE
  v_capability text; v_profile_id uuid; v_cutoff timestamptz; v_now timestamptz;
  v_mapping_set_id uuid; v_mapping_version integer; v_mapping_cutoff timestamptz;
  v_report jsonb; v_reasons text[]:=ARRAY[]::text[]; v_state text:='READY';
  v_row_count bigint:=0; v_missing_count bigint:=0; v_missing_pnl_count bigint:=0; v_unresolved_count bigint:=0;
  v_assets numeric:=0; v_liabilities numeric:=0; v_equity numeric:=0; v_earnings numeric:=0;
  v_current_fy_start date; v_fiscal_start_month integer; v_fiscal_start_day integer; v_fiscal_timezone text;
  v_prior_result boolean:=false; v_transfer_recorded boolean:=false;
BEGIN
  v_capability:=CASE WHEN p_report_type IN ('GENERAL_LEDGER','TRIAL_BALANCE') THEN 'accounting:view'
    WHEN p_report_type IN ('PROFIT_AND_LOSS','BALANCE_SHEET') THEN 'accounting:view_statements' END;
  IF v_capability IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_REPORT_TYPE_INVALID'; END IF;
  IF p_actor_user_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  IF p_from_date IS NULL OR p_through_date IS NULL OR NOT isfinite(p_from_date) OR NOT isfinite(p_through_date)
     OR p_through_date<p_from_date OR (p_recorded_at_cutoff IS NOT NULL AND NOT isfinite(p_recorded_at_cutoff))
     OR p_offset IS NULL OR p_offset<0 OR p_offset>50000 OR p_limit IS NULL OR p_limit<1 OR p_limit>500 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_REPORT_INPUT_INVALID';
  END IF;
  v_cutoff:=coalesce(p_recorded_at_cutoff,clock_timestamp()); v_now:=clock_timestamp();
  SELECT id INTO v_profile_id FROM public.accounting_profiles WHERE singleton_key='g7';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('report_type',p_report_type,'state','NOT_INITIALIZED','reason_codes',jsonb_build_array('PROFILE_NOT_INITIALIZED'),
      'from_date',p_from_date,'through_date',p_through_date,'recorded_at_cutoff',v_cutoff,
      'generated_at',v_now,'mapping_version',NULL,'total_count',0,'has_more',false,'rows','[]'::jsonb,
      'totals',NULL,'service_id',p_service_id,'account_id',p_account_id);
  END IF;

  -- There is no capability row before the first profile exists. The only response
  -- available in that state contains no accounting data; initialized profiles still
  -- require the persisted accounting capability below.
  IF NOT public.get_accounting_capability(p_actor_user_id,v_capability) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;
  SELECT pv.fiscal_start_month,pv.fiscal_start_day,pv.fiscal_timezone
    INTO v_fiscal_start_month,v_fiscal_start_day,v_fiscal_timezone
  FROM public.accounting_profile_versions pv
  WHERE pv.profile_id=v_profile_id AND pv.created_at<=v_cutoff
    AND pv.effective_from<((p_through_date::timestamp+interval '1 day') AT TIME ZONE 'Asia/Riyadh')
  ORDER BY pv.effective_from DESC,pv.version DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('report_type',p_report_type,'state','NOT_INITIALIZED',
      'reason_codes',jsonb_build_array('PROFILE_NOT_INITIALIZED_AT_RECORDED_CUTOFF'),
      'from_date',p_from_date,'through_date',p_through_date,'recorded_at_cutoff',v_cutoff,
      'generated_at',v_now,'mapping_version',NULL,'total_count',0,'has_more',false,'rows','[]'::jsonb,
      'totals',NULL,'service_id',p_service_id,'account_id',p_account_id);
  END IF;

  -- Do not claim reconciliation completeness for a boundary that is not represented by
  -- the existing source-specific reconciliation snapshots.
  SELECT count(*) INTO v_unresolved_count FROM public.accounting_source_effects e
    JOIN public.accounting_journal_versions j ON j.profile_id=e.profile_id AND j.journal_id=e.journal_id AND j.version=e.journal_version
    WHERE e.profile_id=v_profile_id AND e.created_at<=v_cutoff AND j.accounting_date<=p_through_date
      AND (e.status<>'POSTED' OR j.status<>'POSTED');
  IF v_unresolved_count>0 THEN v_reasons:=array_append(v_reasons,'HELD_OR_UNRESOLVED_SOURCE_EFFECTS'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_profile_versions pv
      WHERE pv.profile_id=v_profile_id AND pv.effective_from<=v_cutoff AND pv.created_at<=v_cutoff) THEN
    v_reasons:=array_append(v_reasons,'PROFILE_NOT_INITIALIZED_AT_RECORDED_CUTOFF');
  ELSIF EXISTS(SELECT 1 FROM public.accounting_profile_versions pv
      WHERE pv.profile_id=v_profile_id AND pv.effective_from<=v_cutoff AND pv.created_at<=v_cutoff
        AND pv.cutover_boundary_date IS NOT NULL)
     AND NOT EXISTS(SELECT 1 FROM public.accounting_inception_acceptances a
      WHERE a.profile_id=v_profile_id AND a.accepted_at<=v_cutoff
        AND a.as_of_date>=p_through_date AND a.recorded_at_cutoff<=v_cutoff) THEN
    v_reasons:=array_append(v_reasons,'INCOMPLETE_INCEPTION_ACCEPTANCE');
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_inception_package_versions ip
      JOIN public.accounting_inception_packages p ON p.profile_id=ip.profile_id AND p.id=ip.package_id AND p.current_version=ip.version
      LEFT JOIN public.accounting_inception_acceptances a ON a.profile_id=ip.profile_id AND a.package_id=ip.package_id AND a.package_version=ip.version AND a.accepted_at<=v_cutoff
      WHERE ip.profile_id=v_profile_id AND ip.created_at<=v_cutoff AND a.id IS NULL) THEN
    v_reasons:=array_append(v_reasons,'INCOMPLETE_INCEPTION_ACCEPTANCE');
  END IF;
  IF EXISTS(SELECT 1 FROM public.accounting_journal_versions j
      WHERE j.profile_id=v_profile_id AND j.status='POSTED' AND j.accounting_date<=p_through_date AND j.posted_at<=v_cutoff
        AND j.source_domain NOT IN ('CONTROLLED_MANUAL','INCEPTION')) THEN
    v_reasons:=array_append(v_reasons,'SOURCE_RECONCILIATION_NOT_BOUNDARY_VERIFIED');
  END IF;
  -- Existing reconciliation RPCs are deliberately not treated as compatible unless their
  -- effective and knowledge boundaries match this exact request.
  IF cardinality(v_reasons)>0 THEN v_state:='PARTIAL'; END IF;

  IF p_report_type IN ('PROFIT_AND_LOSS','BALANCE_SHEET') THEN
    v_mapping_cutoff:=(p_through_date::timestamp+interval '1 day') AT TIME ZONE v_fiscal_timezone;
    SELECT s.id,m.version INTO v_mapping_set_id,v_mapping_version
    FROM public.accounting_statement_mapping_sets s
    JOIN LATERAL (
      SELECT mv.version FROM public.accounting_statement_mapping_versions mv
      WHERE mv.profile_id=s.profile_id AND mv.mapping_set_id=s.id
        AND mv.effective_from<v_mapping_cutoff AND mv.created_at<=v_cutoff
      ORDER BY mv.effective_from DESC,mv.version DESC LIMIT 1
    ) m ON true
    WHERE s.profile_id=v_profile_id ORDER BY s.created_at LIMIT 1;
    IF v_mapping_version IS NULL THEN
      RETURN jsonb_build_object('report_type',p_report_type,'state','MAPPING_REQUIRED','reason_codes',jsonb_build_array('STATEMENT_MAPPING_REQUIRED'),
        'from_date',p_from_date,'through_date',p_through_date,'recorded_at_cutoff',v_cutoff,
        'generated_at',v_now,'mapping_version',NULL,'total_count',0,'rows','[]'::jsonb,
        'totals',NULL,'service_id',p_service_id,'account_id',p_account_id);
    END IF;
  END IF;

  IF p_report_type='GENERAL_LEDGER' THEN
    WITH base AS (
      SELECT v.journal_id,v.version AS journal_version,v.source_domain,v.accounting_date,v.posted_at,
        v.reversal_of_journal_id,j.correction_group_id,l.line_number,l.account_id,l.account_version,
        l.account_code_snapshot,l.account_name_en_snapshot,l.account_name_ar_snapshot,l.account_type_snapshot,
        l.normal_balance_snapshot,l.side,l.amount_halalah,l.service_id,l.service_number_snapshot,
        l.event_name_snapshot,l.event_type_snapshot,l.event_start_date_snapshot,l.event_end_date_snapshot
      FROM public.accounting_journal_versions v
      JOIN public.accounting_journals j ON j.profile_id=v.profile_id AND j.id=v.journal_id
      JOIN public.accounting_journal_line_versions l ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
      WHERE v.profile_id=v_profile_id AND v.status='POSTED' AND v.posted_at<=v_cutoff
        AND v.accounting_date<=p_through_date AND (p_account_id IS NULL OR l.account_id=p_account_id)
        AND (p_service_id IS NULL OR l.service_id=p_service_id)
    ), summary AS (
      SELECT account_id,account_version,account_code_snapshot,account_name_en_snapshot,account_name_ar_snapshot,
        account_type_snapshot,normal_balance_snapshot,
        coalesce(sum(CASE WHEN accounting_date<p_from_date THEN CASE WHEN side='DEBIT' THEN amount_halalah::numeric ELSE -amount_halalah::numeric END ELSE 0 END),0) opening,
        coalesce(sum(CASE WHEN accounting_date BETWEEN p_from_date AND p_through_date AND side='DEBIT' THEN amount_halalah::numeric ELSE 0 END),0) debit_activity,
        coalesce(sum(CASE WHEN accounting_date BETWEEN p_from_date AND p_through_date AND side='CREDIT' THEN amount_halalah::numeric ELSE 0 END),0) credit_activity
      FROM base GROUP BY account_id,account_version,account_code_snapshot,account_name_en_snapshot,account_name_ar_snapshot,account_type_snapshot,normal_balance_snapshot
    ), rows AS (
      SELECT jsonb_agg(jsonb_build_object('account_id',account_id,'account_version',account_version,
        'account_code',account_code_snapshot,'account_name_en',account_name_en_snapshot,'account_name_ar',account_name_ar_snapshot,
        'account_type',account_type_snapshot,'normal_balance',normal_balance_snapshot,
        'opening_balance_halalah',opening::text,'debit_activity_halalah',debit_activity::text,
        'credit_activity_halalah',credit_activity::text,'closing_balance_halalah',(opening+debit_activity-credit_activity)::text)
        ORDER BY account_code_snapshot,account_id) AS data,count(*) AS n FROM summary
    ), entries AS (
      SELECT count(*) n FROM base WHERE accounting_date BETWEEN p_from_date AND p_through_date
    ), details AS (
      SELECT jsonb_agg(jsonb_build_object('journal_id',journal_id,'journal_version',journal_version,
        'source_domain',source_domain,'accounting_date',accounting_date,'posted_at',posted_at,
        'reversal_of_journal_id',reversal_of_journal_id,'correction_group_id',correction_group_id,
        'line_number',line_number,'account_id',account_id,'account_version',account_version,
        'account_code',account_code_snapshot,'account_name_en',account_name_en_snapshot,'account_name_ar',account_name_ar_snapshot,
        'account_type',account_type_snapshot,'normal_balance',normal_balance_snapshot,'side',side,
        'amount_halalah',amount_halalah::text,'service_id',service_id,'service_number',service_number_snapshot,
        'event_name',event_name_snapshot,'event_type',event_type_snapshot,'event_start_date',event_start_date_snapshot,
        'event_end_date',event_end_date_snapshot) ORDER BY accounting_date,posted_at,journal_id,line_number) AS data
      FROM (SELECT * FROM base WHERE accounting_date BETWEEN p_from_date AND p_through_date
        ORDER BY accounting_date,posted_at,journal_id,line_number OFFSET p_offset LIMIT p_limit) page
    )
    SELECT jsonb_build_object('report_type',p_report_type,'state',v_state,'reason_codes',to_jsonb(v_reasons),
      'from_date',p_from_date,'through_date',p_through_date,'recorded_at_cutoff',v_cutoff,'generated_at',v_now,
      'mapping_version',NULL,'total_count',entries.n,'has_more',p_offset+p_limit<entries.n,
      'accounts',(SELECT data FROM rows),'rows',coalesce(details.data,'[]'::jsonb),
      'service_id',p_service_id,'account_id',p_account_id) INTO v_report FROM entries,details;
  ELSIF p_report_type='TRIAL_BALANCE' THEN
    WITH base AS (
      SELECT l.account_id,l.account_version,l.account_code_snapshot,l.account_name_en_snapshot,l.account_name_ar_snapshot,
        l.account_type_snapshot,l.normal_balance_snapshot,l.side,l.amount_halalah,v.accounting_date,v.posted_at,v.journal_id,
        v.version AS journal_version,v.source_domain,v.reversal_of_journal_id,j.correction_group_id,l.line_number,
        l.service_id,l.service_number_snapshot,l.event_name_snapshot,l.event_type_snapshot
      FROM public.accounting_journal_versions v
      JOIN public.accounting_journals j ON j.profile_id=v.profile_id AND j.id=v.journal_id
      JOIN public.accounting_journal_line_versions l ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
      WHERE v.profile_id=v_profile_id AND v.status='POSTED' AND v.accounting_date<=p_through_date AND v.posted_at<=v_cutoff
        AND (p_service_id IS NULL OR l.service_id=p_service_id)
    ), account_values AS (
      SELECT account_id,account_version,account_code_snapshot,account_name_en_snapshot,account_name_ar_snapshot,
        account_type_snapshot,normal_balance_snapshot,
        coalesce(sum(amount_halalah::numeric) FILTER(WHERE accounting_date<p_from_date AND side='DEBIT'),0) opening_debits,
        coalesce(sum(amount_halalah::numeric) FILTER(WHERE accounting_date<p_from_date AND side='CREDIT'),0) opening_credits,
        coalesce(sum(amount_halalah::numeric) FILTER(WHERE accounting_date BETWEEN p_from_date AND p_through_date AND side='DEBIT'),0) period_debits,
        coalesce(sum(amount_halalah::numeric) FILTER(WHERE accounting_date BETWEEN p_from_date AND p_through_date AND side='CREDIT'),0) period_credits,
        jsonb_agg(DISTINCT jsonb_build_object('journal_id',journal_id,'journal_version',journal_version,'source_domain',source_domain,
          'accounting_date',accounting_date,'posted_at',posted_at,'reversal_of_journal_id',reversal_of_journal_id,
          'correction_group_id',correction_group_id,'line_number',line_number,'side',side,
          'amount_halalah',amount_halalah::text,'service_id',service_id,'service_number',service_number_snapshot)) AS journal_evidence,
        jsonb_agg(DISTINCT jsonb_build_object('service_id',service_id,'service_number',service_number_snapshot,
          'event_name',event_name_snapshot,'event_type',event_type_snapshot)) AS service_attribution
      FROM base GROUP BY account_id,account_version,account_code_snapshot,account_name_en_snapshot,account_name_ar_snapshot,account_type_snapshot,normal_balance_snapshot
    ), balances AS (
      SELECT *,opening_debits-opening_credits+period_debits-period_credits net
      FROM account_values
    ), page AS (
      SELECT * FROM balances WHERE p_account_id IS NULL OR account_id=p_account_id
      ORDER BY account_code_snapshot,account_id,account_version OFFSET p_offset LIMIT p_limit
    ), filtered AS (
      SELECT count(*) n FROM balances WHERE p_account_id IS NULL OR account_id=p_account_id
    ), totals AS (
      SELECT coalesce(sum(greatest(net,0)),0) debit_total,coalesce(sum(greatest(-net,0)),0) credit_total,count(*) n FROM balances
    )
    SELECT jsonb_build_object('report_type',p_report_type,'state',v_state,'reason_codes',to_jsonb(v_reasons),
      'from_date',p_from_date,'through_date',p_through_date,'recorded_at_cutoff',v_cutoff,'generated_at',v_now,
      'mapping_version',NULL,'total_count',filtered.n,'has_more',p_offset+p_limit<filtered.n,
      'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('account_id',account_id,'account_version',account_version,
        'account_code',account_code_snapshot,'account_name_en',account_name_en_snapshot,'account_name_ar',account_name_ar_snapshot,
        'account_type',account_type_snapshot,'normal_balance',normal_balance_snapshot,
        'opening_debit_halalah',opening_debits::text,'opening_credit_halalah',opening_credits::text,
        'period_debit_halalah',period_debits::text,'period_credit_halalah',period_credits::text,
        'ending_debit_halalah',greatest(net,0)::text,'ending_credit_halalah',greatest(-net,0)::text,
        'journal_evidence',journal_evidence,'service_attribution',service_attribution)
         ORDER BY account_code_snapshot,account_id,account_version) FROM page),'[]'::jsonb),
      'totals',jsonb_build_object('ending_debit_halalah',totals.debit_total::text,'ending_credit_halalah',totals.credit_total::text,
        'debits_equal_credits',totals.debit_total=totals.credit_total,'account_count',totals.n),
      'service_id',p_service_id,'account_id',p_account_id) INTO v_report FROM totals,filtered;
  ELSIF p_report_type='PROFIT_AND_LOSS' THEN
    WITH mapped AS (
      SELECT e.section_key,e.line_key,e.label_en,e.label_ar,e.display_order,l.account_id,l.account_version,
        l.account_code_snapshot,l.account_name_en_snapshot,l.account_name_ar_snapshot,
        jsonb_agg(DISTINCT jsonb_build_object('journal_id',v.journal_id,'journal_version',v.version,'source_domain',v.source_domain,
          'accounting_date',v.accounting_date,'posted_at',v.posted_at,'reversal_of_journal_id',v.reversal_of_journal_id,
          'correction_group_id',j.correction_group_id,'service_id',l.service_id,'service_number',l.service_number_snapshot,
          'event_name',l.event_name_snapshot,'event_type',l.event_type_snapshot,'line_number',l.line_number,
          'side',l.side,'amount_halalah',l.amount_halalah::text)) AS journal_evidence,
        sum(CASE WHEN l.account_type_snapshot='REVENUE' THEN
          CASE WHEN l.side='CREDIT' THEN l.amount_halalah::numeric ELSE -l.amount_halalah::numeric END
          ELSE CASE WHEN l.side='DEBIT' THEN l.amount_halalah::numeric ELSE -l.amount_halalah::numeric END END) amount
      FROM public.accounting_journal_versions v
      JOIN public.accounting_journals j ON j.profile_id=v.profile_id AND j.id=v.journal_id
      JOIN public.accounting_journal_line_versions l ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
      LEFT JOIN public.accounting_statement_mapping_entries e ON e.profile_id=l.profile_id AND e.mapping_set_id=v_mapping_set_id
        AND e.mapping_version=v_mapping_version AND e.account_id=l.account_id AND e.account_version=l.account_version
        AND e.statement_type='PROFIT_LOSS'
      WHERE v.profile_id=v_profile_id AND v.status='POSTED' AND v.accounting_date BETWEEN p_from_date AND p_through_date
        AND v.posted_at<=v_cutoff AND l.account_type_snapshot IN ('REVENUE','EXPENSE')
        AND (p_service_id IS NULL OR l.service_id=p_service_id) AND (p_account_id IS NULL OR l.account_id=p_account_id)
      GROUP BY e.section_key,e.line_key,e.label_en,e.label_ar,e.display_order,l.account_id,l.account_version,
        l.account_code_snapshot,l.account_name_en_snapshot,l.account_name_ar_snapshot
    ), missing AS (
      SELECT count(DISTINCT (l.account_id,l.account_version)) n FROM public.accounting_journal_versions v
      JOIN public.accounting_journal_line_versions l ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
      LEFT JOIN public.accounting_statement_mapping_entries e ON e.profile_id=l.profile_id AND e.mapping_set_id=v_mapping_set_id
        AND e.mapping_version=v_mapping_version AND e.account_id=l.account_id AND e.account_version=l.account_version AND e.statement_type='PROFIT_LOSS'
      WHERE v.profile_id=v_profile_id AND v.status='POSTED' AND v.accounting_date BETWEEN p_from_date AND p_through_date
        AND v.posted_at<=v_cutoff AND l.account_type_snapshot IN ('REVENUE','EXPENSE') AND e.account_id IS NULL
        AND (p_service_id IS NULL OR l.service_id=p_service_id) AND (p_account_id IS NULL OR l.account_id=p_account_id)
    ), line_rows AS (
      SELECT section_key,line_key,label_en,label_ar,min(display_order) display_order,
        sum(amount) amount FROM mapped WHERE line_key IS NOT NULL GROUP BY section_key,line_key,label_en,label_ar
    ), account_rows AS (
      SELECT count(*) n FROM mapped WHERE line_key IS NOT NULL
    ), page AS (
      SELECT * FROM mapped WHERE line_key IS NOT NULL
      ORDER BY display_order,line_key,account_code_snapshot,account_id,account_version OFFSET p_offset LIMIT p_limit
    ), page_data AS (
      SELECT jsonb_agg(jsonb_build_object('section_key',section_key,'line_key',line_key,'label_en',label_en,'label_ar',label_ar,
        'display_order',display_order,'account_id',account_id,'account_version',account_version,'account_code',account_code_snapshot,
        'account_name_en',account_name_en_snapshot,'account_name_ar',account_name_ar_snapshot,'amount_halalah',amount::text,
        'journal_evidence',journal_evidence)
        ORDER BY display_order,line_key,account_code_snapshot,account_id,account_version) data FROM page
    ), line_totals AS (
      SELECT coalesce(sum(amount) FILTER(WHERE section_key='REVENUE'),0) revenue,
        coalesce(sum(amount) FILTER(WHERE section_key='EXPENSE'),0) expense,count(*) n FROM line_rows
    )
    SELECT CASE WHEN missing.n>0 THEN 'MAPPING_REQUIRED' ELSE v_state END,
      CASE WHEN missing.n>0 THEN array_append(v_reasons,'STATEMENT_MAPPING_MISSING_FOR_ACCOUNT_VERSION') ELSE v_reasons END,
      jsonb_build_object('report_type',p_report_type,'from_date',p_from_date,'through_date',p_through_date,
        'recorded_at_cutoff',v_cutoff,'generated_at',v_now,'mapping_version',v_mapping_version,
        'rows',coalesce(page_data.data,'[]'::jsonb),'line_totals',coalesce((SELECT jsonb_agg(jsonb_build_object(
          'section_key',section_key,'line_key',line_key,'label_en',label_en,'label_ar',label_ar,'display_order',display_order,
          'amount_halalah',amount::text) ORDER BY display_order,line_key) FROM line_rows),'[]'::jsonb),
        'totals',CASE WHEN missing.n>0 THEN NULL ELSE jsonb_build_object(
          'revenue_halalah',line_totals.revenue::text,'expense_halalah',line_totals.expense::text,
          'profit_loss_halalah',(line_totals.revenue-line_totals.expense)::text) END,
        'total_count',account_rows.n,'has_more',p_offset+p_limit<account_rows.n,'service_id',p_service_id,'account_id',p_account_id)
      INTO v_state,v_reasons,v_report FROM missing,account_rows,page_data,line_totals;
    v_report:=v_report||jsonb_build_object('state',v_state,'reason_codes',to_jsonb(v_reasons));
  ELSE
    v_current_fy_start:=make_date(extract(year FROM p_through_date)::integer,v_fiscal_start_month,1)+(v_fiscal_start_day-1);
    IF v_current_fy_start>p_through_date THEN
      v_current_fy_start:=make_date(extract(year FROM p_through_date)::integer-1,v_fiscal_start_month,1)+(v_fiscal_start_day-1);
    END IF;
    SELECT count(DISTINCT (l.account_id,l.account_version)) INTO v_missing_count
    FROM public.accounting_journal_versions v
    JOIN public.accounting_journal_line_versions l ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
    LEFT JOIN public.accounting_statement_mapping_entries e ON e.profile_id=l.profile_id AND e.mapping_set_id=v_mapping_set_id
      AND e.mapping_version=v_mapping_version AND e.account_id=l.account_id AND e.account_version=l.account_version
      AND e.statement_type='BALANCE_SHEET'
    WHERE v.profile_id=v_profile_id AND v.status='POSTED' AND v.accounting_date<=p_through_date AND v.posted_at<=v_cutoff
      AND l.account_type_snapshot IN ('ASSET','LIABILITY','EQUITY') AND e.account_id IS NULL
      AND (p_service_id IS NULL OR l.service_id=p_service_id);
    SELECT EXISTS(SELECT 1 FROM public.accounting_journal_versions v JOIN public.accounting_journal_line_versions l
      ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
      WHERE v.profile_id=v_profile_id AND v.status='POSTED' AND v.posted_at<=v_cutoff AND v.accounting_date BETWEEN v_current_fy_start AND p_through_date
        AND v.source_domain IN ('ACCOUNTING_CLOSE','YEAR_END_CLOSE','RESULT_TRANSFER')
        AND l.account_type_snapshot='EQUITY' AND (p_service_id IS NULL OR l.service_id=p_service_id)) INTO v_transfer_recorded;
    SELECT count(DISTINCT (l.account_id,l.account_version)) INTO v_missing_pnl_count
    FROM public.accounting_journal_versions v
    JOIN public.accounting_journal_line_versions l ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
    LEFT JOIN public.accounting_statement_mapping_entries e ON e.profile_id=l.profile_id AND e.mapping_set_id=v_mapping_set_id
      AND e.mapping_version=v_mapping_version AND e.account_id=l.account_id AND e.account_version=l.account_version
      AND e.statement_type='PROFIT_LOSS'
    WHERE v.profile_id=v_profile_id AND v.status='POSTED'
      AND v.accounting_date BETWEEN v_current_fy_start AND p_through_date AND v.posted_at<=v_cutoff
      AND l.account_type_snapshot IN ('REVENUE','EXPENSE') AND e.account_id IS NULL
      AND (p_service_id IS NULL OR l.service_id=p_service_id);
    IF v_transfer_recorded THEN v_missing_pnl_count:=0; END IF;
    SELECT EXISTS(SELECT 1 FROM public.accounting_journal_versions v JOIN public.accounting_journal_line_versions l
      ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
      WHERE v.profile_id=v_profile_id AND v.status='POSTED' AND v.posted_at<=v_cutoff AND v.accounting_date<v_current_fy_start
        AND l.account_type_snapshot IN ('REVENUE','EXPENSE') AND (p_service_id IS NULL OR l.service_id=p_service_id)) INTO v_prior_result;
    IF v_missing_count>0 OR v_missing_pnl_count>0 THEN
      v_state:='MAPPING_REQUIRED';
      v_reasons:=array_append(v_reasons,'STATEMENT_MAPPING_MISSING_FOR_ACCOUNT_VERSION');
    ELSIF v_prior_result THEN
      v_state:='PARTIAL';
      v_reasons:=array_append(v_reasons,'PRIOR_RESULT_NOT_CLOSED');
    END IF;
    WITH mapped AS (
      SELECT e.section_key,e.line_key,e.label_en,e.label_ar,e.display_order,l.account_id,l.account_version,
        l.account_code_snapshot,l.account_name_en_snapshot,l.account_name_ar_snapshot,l.account_type_snapshot,l.side,l.amount_halalah,
        v.accounting_date,v.posted_at,v.journal_id,v.version AS journal_version,v.source_domain,v.reversal_of_journal_id,
        j.correction_group_id,l.line_number,l.service_id,l.service_number_snapshot,l.event_name_snapshot,l.event_type_snapshot
      FROM public.accounting_journal_versions v
      JOIN public.accounting_journals j ON j.profile_id=v.profile_id AND j.id=v.journal_id
      JOIN public.accounting_journal_line_versions l ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
      LEFT JOIN public.accounting_statement_mapping_entries e ON e.profile_id=l.profile_id AND e.mapping_set_id=v_mapping_set_id
        AND e.mapping_version=v_mapping_version AND e.account_id=l.account_id AND e.account_version=l.account_version AND e.statement_type='BALANCE_SHEET'
      WHERE v.profile_id=v_profile_id AND v.status='POSTED' AND v.accounting_date<=p_through_date AND v.posted_at<=v_cutoff
        AND l.account_type_snapshot IN ('ASSET','LIABILITY','EQUITY')
        AND (p_service_id IS NULL OR l.service_id=p_service_id)
    ), account_rows AS (
      SELECT section_key,line_key,label_en,label_ar,min(display_order) display_order,account_id,account_version,
        account_code_snapshot,account_name_en_snapshot,account_name_ar_snapshot,account_type_snapshot,
        sum(CASE WHEN account_type_snapshot='ASSET' THEN CASE WHEN side='DEBIT' THEN amount_halalah::numeric ELSE -amount_halalah::numeric END
          ELSE CASE WHEN side='CREDIT' THEN amount_halalah::numeric ELSE -amount_halalah::numeric END END) amount,
        jsonb_agg(DISTINCT jsonb_build_object('journal_id',journal_id,'journal_version',journal_version,'source_domain',source_domain,
          'accounting_date',accounting_date,'posted_at',posted_at,'reversal_of_journal_id',reversal_of_journal_id,
          'correction_group_id',correction_group_id,'service_id',service_id,'service_number',service_number_snapshot,
          'event_name',event_name_snapshot,'event_type',event_type_snapshot,'line_number',line_number,
          'side',side,'amount_halalah',amount_halalah::text)) AS journal_evidence
      FROM mapped WHERE line_key IS NOT NULL
      GROUP BY section_key,line_key,label_en,label_ar,account_id,account_version,account_code_snapshot,account_name_en_snapshot,account_name_ar_snapshot,account_type_snapshot
    ), page AS (
      SELECT * FROM account_rows WHERE p_account_id IS NULL OR account_id=p_account_id
      ORDER BY display_order,line_key,account_code_snapshot,account_id,account_version OFFSET p_offset LIMIT p_limit
    ), filtered AS (
      SELECT count(*) n FROM account_rows WHERE p_account_id IS NULL OR account_id=p_account_id
    ), totals AS (
      SELECT coalesce(sum(amount) FILTER(WHERE account_type_snapshot='ASSET'),0) assets,
        coalesce(sum(amount) FILTER(WHERE account_type_snapshot='LIABILITY'),0) liabilities,
        coalesce(sum(amount) FILTER(WHERE account_type_snapshot='EQUITY'),0) equity,count(*) n FROM account_rows
    ), fy AS (
      SELECT coalesce(sum(CASE WHEN l.account_type_snapshot='REVENUE' THEN CASE WHEN l.side='CREDIT' THEN l.amount_halalah::numeric ELSE -l.amount_halalah::numeric END
        ELSE CASE WHEN l.side='DEBIT' THEN l.amount_halalah::numeric ELSE -l.amount_halalah::numeric END END),0) result
      FROM public.accounting_journal_versions v JOIN public.accounting_journal_line_versions l
        ON l.profile_id=v.profile_id AND l.journal_id=v.journal_id AND l.journal_version=v.version
      JOIN public.accounting_statement_mapping_entries e ON e.profile_id=l.profile_id AND e.mapping_set_id=v_mapping_set_id
        AND e.mapping_version=v_mapping_version AND e.account_id=l.account_id AND e.account_version=l.account_version
        AND e.statement_type='PROFIT_LOSS'
      WHERE v.profile_id=v_profile_id AND v.status='POSTED' AND v.accounting_date BETWEEN v_current_fy_start AND p_through_date
        AND v.posted_at<=v_cutoff AND l.account_type_snapshot IN ('REVENUE','EXPENSE')
        AND (p_service_id IS NULL OR l.service_id=p_service_id)
    )
    SELECT coalesce(fy.result,0),
      jsonb_build_object('report_type',p_report_type,'from_date',v_current_fy_start,'through_date',p_through_date,
        'recorded_at_cutoff',v_cutoff,'generated_at',v_now,'mapping_version',v_mapping_version,
        'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('section_key',section_key,'line_key',line_key,'label_en',label_en,'label_ar',label_ar,
          'display_order',display_order,'account_id',account_id,'account_version',account_version,'account_code',account_code_snapshot,
          'account_name_en',account_name_en_snapshot,'account_name_ar',account_name_ar_snapshot,'amount_halalah',amount::text,
          'journal_evidence',journal_evidence)
          ORDER BY display_order,line_key,account_code_snapshot,account_id,account_version) FROM page),'[]'::jsonb),
        'totals',CASE WHEN v_missing_count>0 OR v_missing_pnl_count>0 THEN NULL ELSE jsonb_build_object(
          'assets_halalah',totals.assets::text,'liabilities_halalah',totals.liabilities::text,
          'equity_before_current_result_halalah',totals.equity::text,
          'current_year_earnings_halalah',CASE WHEN v_transfer_recorded THEN '0' ELSE (SELECT result::text FROM fy) END,
          'presented_equity_halalah',(totals.equity+CASE WHEN v_transfer_recorded THEN 0 ELSE fy.result END)::text,
          'equation_difference_halalah',(totals.assets-totals.liabilities-totals.equity-CASE WHEN v_transfer_recorded THEN 0 ELSE fy.result END)::text,
          'current_result_already_transferred',v_transfer_recorded,'prior_year_result_unresolved',v_prior_result) END,
          'total_count',filtered.n,'has_more',p_offset+p_limit<filtered.n,'service_id',p_service_id,'account_id',p_account_id)
      INTO v_earnings,v_report FROM totals,fy,filtered;
    IF v_missing_count=0 AND v_missing_pnl_count=0 AND v_report#>>'{totals,equation_difference_halalah}'<>'0' THEN
      IF v_state='READY' THEN v_state:='PARTIAL'; END IF;
      v_reasons:=array_append(v_reasons,'BALANCE_SHEET_EQUATION_DIFFERENCE');
    END IF;
    v_report:=v_report||jsonb_build_object('state',v_state,'reason_codes',to_jsonb(v_reasons));
  END IF;
  RETURN v_report;
END;
$w10h_report$;

ALTER TABLE public.accounting_statement_mapping_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_statement_mapping_sets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_statement_mapping_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_statement_mapping_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_statement_mapping_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_statement_mapping_entries FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.accounting_statement_mapping_sets,public.accounting_statement_mapping_versions,
  public.accounting_statement_mapping_entries FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.validate_accounting_statement_mapping_entry() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reject_accounting_statement_mapping_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_accounting_statement_mapping(uuid,uuid,uuid,integer,timestamptz,text,text,jsonb,uuid)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.get_w10h_accounting_report(uuid,text,date,date,timestamptz,uuid,uuid,integer,integer)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_accounting_statement_mapping(uuid,uuid,uuid,integer,timestamptz,text,text,jsonb,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_w10h_accounting_report(uuid,text,date,date,timestamptz,uuid,uuid,integer,integer) TO service_role;

COMMIT;
