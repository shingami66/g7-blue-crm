-- W10G-R1: additive, bounded read contracts for bank reconciliation operations.
-- These RPCs expose only masked bank identity and immutable reconciliation evidence.
BEGIN;

CREATE FUNCTION public.list_accounting_bank_bindings(
  p_actor_user_id uuid,
  p_as_of_date date,
  p_recorded_at_cutoff timestamptz,
  p_limit integer DEFAULT 200
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,extensions AS $list_bank_bindings$
DECLARE
  v_profile_id uuid;
  v_bindings jsonb;
  v_total bigint;
BEGIN
  IF p_actor_user_id IS NULL OR p_as_of_date IS NULL OR p_recorded_at_cutoff IS NULL
     OR p_limit IS NULL OR p_limit<1 OR p_limit>500 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_BANK_BINDING_READ_INVALID_INPUT';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE)
     OR (NOT public.get_accounting_capability(p_actor_user_id,'accounting:view')
         AND NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank')) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.accounting_profiles p
  JOIN public.accounting_profile_versions pv
    ON pv.profile_id=p.id AND pv.version=p.current_version
  WHERE p.singleton_key='g7' AND pv.activation_state='DEV_PROVISIONAL';
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('state','NOT_INITIALIZED','bindings','[]'::jsonb,
      'as_of_date',p_as_of_date,'recorded_at_cutoff',p_recorded_at_cutoff,'truncated',false);
  END IF;

  WITH eligible AS (
    SELECT DISTINCT ON (v.binding_id)
      v.binding_id,v.version,v.previous_version,v.account_id,v.account_version,
      v.masked_display_identity,v.currency,v.effective_from,v.effective_through,
      v.status,v.evidence_ref,v.prepared_by,v.prepared_at,v.reviewed_by,v.reviewed_at,v.reason
    FROM public.accounting_bank_binding_versions v
    WHERE v.profile_id=v_profile_id AND v.status='APPROVED'
      AND v.effective_from<=p_as_of_date
      AND (v.effective_through IS NULL OR v.effective_through>=p_as_of_date)
      AND v.created_at<=p_recorded_at_cutoff
    ORDER BY v.binding_id,v.effective_from DESC,v.version DESC
  ), current_at_cutoff AS (
    SELECT DISTINCT ON (v.binding_id) v.binding_id,v.version,v.status
    FROM public.accounting_bank_binding_versions v
    WHERE v.profile_id=v_profile_id AND v.created_at<=p_recorded_at_cutoff
    ORDER BY v.binding_id,v.version DESC
  ), binding_rows AS (
    SELECT e.*,c.version AS current_version,c.status AS current_status
    FROM eligible e
    JOIN current_at_cutoff c ON c.binding_id=e.binding_id
  ), ranked AS (
    SELECT b.*,count(*) OVER() AS total_count
    FROM binding_rows b
  ), limited AS (
    SELECT * FROM ranked
    ORDER BY masked_display_identity,binding_id
    LIMIT p_limit
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'binding_id',l.binding_id,
      'version',l.version,
      'previous_version',l.previous_version,
      'current_version',l.current_version,
      'current_status',l.current_status,
      'account_id',l.account_id,
      'account_version',l.account_version,
      'masked_display_identity',l.masked_display_identity,
      'currency',l.currency,
      'effective_from',l.effective_from,
      'effective_through',l.effective_through,
      'status',l.status,
      'evidence_ref',l.evidence_ref,
      'prepared_by',l.prepared_by,
      'prepared_at',l.prepared_at,
      'reviewed_by',l.reviewed_by,
      'reviewed_at',l.reviewed_at,
      'reason',l.reason
    ) ORDER BY l.masked_display_identity,l.binding_id),'[]'::jsonb),
    coalesce(max(l.total_count),0)
  INTO v_bindings,v_total
  FROM limited l;

  RETURN jsonb_build_object(
    'state','READY',
    'bindings',v_bindings,
    'as_of_date',p_as_of_date,
    'recorded_at_cutoff',p_recorded_at_cutoff,
    'truncated',v_total>p_limit
  );
END;
$list_bank_bindings$;

CREATE FUNCTION public.get_accounting_bank_reconciliation_history(
  p_actor_user_id uuid,
  p_binding_id uuid,
  p_as_of_date date,
  p_recorded_at_cutoff timestamptz,
  p_limit integer DEFAULT 200
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,extensions AS $get_bank_reconciliation_history$
DECLARE
  v_profile_id uuid;
  v_groups jsonb;
  v_batches jsonb;
  v_group_total bigint;
  v_batch_total bigint;
  v_binding_exists boolean;
  v_nested_limit integer;
BEGIN
  IF p_actor_user_id IS NULL OR p_binding_id IS NULL OR p_as_of_date IS NULL OR p_recorded_at_cutoff IS NULL
     OR p_limit IS NULL OR p_limit<1 OR p_limit>500 THEN
    RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='ACCOUNTING_BANK_RECONCILIATION_HISTORY_INVALID_INPUT';
  END IF;
  v_nested_limit := least(p_limit,100);
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE)
     OR (NOT public.get_accounting_capability(p_actor_user_id,'accounting:view')
         AND NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank')) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_AUTHORITY_DENIED';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.accounting_profiles p
  JOIN public.accounting_profile_versions pv
    ON pv.profile_id=p.id AND pv.version=p.current_version
  WHERE p.singleton_key='g7' AND pv.activation_state='DEV_PROVISIONAL';
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('state','NOT_INITIALIZED','binding_id',p_binding_id,
      'statement_batches','[]'::jsonb,'groups','[]'::jsonb,
      'as_of_date',p_as_of_date,'recorded_at_cutoff',p_recorded_at_cutoff,
      'statement_batches_truncated',false,'groups_truncated',false);
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.accounting_bank_bindings b
    WHERE b.profile_id=v_profile_id AND b.id=p_binding_id)
  INTO v_binding_exists;
  IF NOT v_binding_exists THEN
    RETURN jsonb_build_object('state','NOT_FOUND','binding_id',p_binding_id,
      'statement_batches','[]'::jsonb,'groups','[]'::jsonb,
      'as_of_date',p_as_of_date,'recorded_at_cutoff',p_recorded_at_cutoff,
      'statement_batches_truncated',false,'groups_truncated',false);
  END IF;

  WITH batches AS (
    SELECT DISTINCT ON (b.batch_id)
      b.profile_id,b.batch_id,b.version,b.previous_version,b.binding_id,b.binding_version,
      b.source_document_ref,b.evidence_sha256,b.evidence_identity,b.coverage_start,b.coverage_end,
      b.opening_balance_halalah,b.closing_balance_halalah,b.currency,b.status,
      b.recorded_by,b.recorded_at,b.reason
    FROM public.accounting_bank_statement_batch_versions b
    WHERE b.profile_id=v_profile_id AND b.binding_id=p_binding_id AND b.status='RECORDED'
      AND b.coverage_start<=p_as_of_date
      AND b.coverage_end>=p_as_of_date-INTERVAL '100 years'
      AND b.recorded_at<=p_recorded_at_cutoff
    ORDER BY b.batch_id,b.version DESC
  ), ranked AS (
    SELECT b.*,count(*) OVER() AS total_count
    FROM batches b
  ), limited AS (
    SELECT * FROM ranked
    ORDER BY coverage_start,batch_id
    LIMIT p_limit
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'batch_id',l.batch_id,
      'version',l.version,
      'previous_version',l.previous_version,
      'binding_id',l.binding_id,
      'binding_version',l.binding_version,
      'source_document_ref',l.source_document_ref,
      'evidence_sha256',l.evidence_sha256,
      'evidence_identity',l.evidence_identity,
      'coverage_start',l.coverage_start,
      'coverage_end',l.coverage_end,
      'opening_balance_halalah',l.opening_balance_halalah::text,
      'closing_balance_halalah',l.closing_balance_halalah::text,
      'currency',l.currency,
      'status',l.status,
      'recorded_by',l.recorded_by,
      'recorded_at',l.recorded_at,
      'reason',l.reason
    ) ORDER BY l.coverage_start,l.batch_id),'[]'::jsonb),
    coalesce(max(l.total_count),0)
  INTO v_batches,v_batch_total
  FROM limited l;

  WITH versions AS (
    SELECT g.*,
      max(g.version) OVER(PARTITION BY g.group_id) AS current_version_at_cutoff
    FROM public.accounting_bank_reconciliation_group_versions g
    WHERE g.profile_id=v_profile_id AND g.binding_id=p_binding_id
      AND g.as_of_date<=p_as_of_date AND g.prepared_at<=p_recorded_at_cutoff
  ), ranked AS (
    SELECT g.*,count(*) OVER() AS total_count
    FROM versions g
  ), limited AS (
    SELECT * FROM ranked
    ORDER BY prepared_at DESC,group_id DESC,version DESC
    LIMIT p_limit
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'group_id',l.group_id,
      'version',l.version,
      'previous_version',l.previous_version,
      'current_version',l.current_version_at_cutoff,
      'is_current_version',l.version=l.current_version_at_cutoff,
      'binding_id',l.binding_id,
      'binding_version',l.binding_version,
      'as_of_date',l.as_of_date,
      'recorded_at_cutoff',l.recorded_at_cutoff,
      'status',l.status,
      'rationale',l.rationale,
      'evidence_ref',l.evidence_ref,
      'prepared_by',l.prepared_by,
      'prepared_at',l.prepared_at,
      'allocations',coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'allocation_number',a.allocation_number,
          'statement_line_id',a.statement_line_id,
          'statement_line_version',a.statement_line_version,
          'ledger_journal_id',a.ledger_journal_id,
          'ledger_journal_version',a.ledger_journal_version,
          'ledger_line_number',a.ledger_line_number,
          'statement_allocated_halalah',a.statement_allocated_halalah::text,
          'ledger_allocated_halalah',a.ledger_allocated_halalah::text,
          'rationale',a.rationale
        ) ORDER BY a.allocation_number)
        FROM (
          SELECT a.*
          FROM public.accounting_bank_reconciliation_allocations a
          WHERE a.profile_id=l.profile_id AND a.group_id=l.group_id AND a.group_version=l.version
            AND a.created_at<=p_recorded_at_cutoff
          ORDER BY a.allocation_number
          LIMIT v_nested_limit
        ) a
      ),'[]'::jsonb),
      'allocations_truncated',EXISTS(
        SELECT 1
        FROM public.accounting_bank_reconciliation_allocations a
        WHERE a.profile_id=l.profile_id AND a.group_id=l.group_id AND a.group_version=l.version
          AND a.created_at<=p_recorded_at_cutoff
        ORDER BY a.allocation_number
        OFFSET v_nested_limit LIMIT 1
      ),
      'review_history',coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'decision',r.decision,
          'reviewer_user_id',r.reviewer_user_id,
          'reason',r.reason,
          'recorded_at',r.recorded_at
        ) ORDER BY r.recorded_at,r.id)
        FROM (
          SELECT r.*
          FROM public.accounting_bank_reconciliation_reviews r
          WHERE r.profile_id=l.profile_id AND r.group_id=l.group_id AND r.group_version=l.version
            AND r.recorded_at<=p_recorded_at_cutoff
          ORDER BY r.recorded_at,r.id
          LIMIT v_nested_limit
        ) r
      ),'[]'::jsonb),
      'review_history_truncated',EXISTS(
        SELECT 1
        FROM public.accounting_bank_reconciliation_reviews r
        WHERE r.profile_id=l.profile_id AND r.group_id=l.group_id AND r.group_version=l.version
          AND r.recorded_at<=p_recorded_at_cutoff
        ORDER BY r.recorded_at,r.id
        OFFSET v_nested_limit LIMIT 1
      ),
      'latest_review_decision',(
        SELECT r.decision
        FROM public.accounting_bank_reconciliation_reviews r
        WHERE r.profile_id=l.profile_id AND r.group_id=l.group_id AND r.group_version=l.version
          AND r.recorded_at<=p_recorded_at_cutoff
        ORDER BY r.recorded_at DESC,r.id DESC LIMIT 1
      )
    ) ORDER BY l.prepared_at DESC,l.group_id DESC,l.version DESC),'[]'::jsonb),
    coalesce(max(l.total_count),0)
  INTO v_groups,v_group_total
  FROM limited l;

  RETURN jsonb_build_object(
    'state','READY',
    'binding_id',p_binding_id,
    'as_of_date',p_as_of_date,
    'recorded_at_cutoff',p_recorded_at_cutoff,
    'statement_batches',v_batches,
    'statement_batches_truncated',v_batch_total>p_limit,
    'groups',v_groups,
    'groups_truncated',v_group_total>p_limit
  );
END;
$get_bank_reconciliation_history$;

REVOKE ALL ON FUNCTION public.list_accounting_bank_bindings(uuid,date,timestamptz,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_accounting_bank_reconciliation_history(uuid,uuid,date,timestamptz,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_accounting_bank_bindings(uuid,date,timestamptz,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_bank_reconciliation_history(uuid,uuid,date,timestamptz,integer) TO service_role;
ALTER FUNCTION public.list_accounting_bank_bindings(uuid,date,timestamptz,integer) OWNER TO postgres;
ALTER FUNCTION public.get_accounting_bank_reconciliation_history(uuid,uuid,date,timestamptz,integer) OWNER TO postgres;

COMMIT;
