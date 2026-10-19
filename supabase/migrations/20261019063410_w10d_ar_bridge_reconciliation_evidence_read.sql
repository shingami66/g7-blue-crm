BEGIN;

DO $w10d_ar_evidence_read_preflight$
BEGIN
  IF to_regprocedure('public.get_accounting_ar_bridge_reconciliation(uuid,date,timestamptz,integer)') IS NULL
     OR to_regclass('public.accounting_profiles') IS NULL
     OR to_regclass('public.accounting_ar_bridge_event_versions') IS NULL
     OR to_regclass('public.accounting_ar_bridge_journal_links') IS NULL THEN
    RAISE EXCEPTION 'W10D evidence-read preflight: accepted AR bridge contract is incomplete';
  END IF;
  IF to_regprocedure('public.get_accounting_ar_bridge_reconciliation_with_evidence(uuid,date,timestamptz,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'W10D evidence-read preflight: target function already exists';
  END IF;
END;
$w10d_ar_evidence_read_preflight$;

CREATE FUNCTION public.get_accounting_ar_bridge_reconciliation_with_evidence(
  p_actor_user_id uuid,
  p_as_of_date date,
  p_recorded_at_cutoff timestamptz,
  p_limit integer DEFAULT 200
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public
AS $ar_bridge_reconciliation_evidence$
DECLARE
  v_result jsonb;
  v_profile_id uuid;
  v_events jsonb;
  v_partial_identity_count integer;
  v_missing_version_count integer;
  v_missing_journal_link_count integer;
  v_journal_link_mismatch_count integer;
BEGIN
  IF p_actor_user_id IS NULL OR p_as_of_date IS NULL OR p_recorded_at_cutoff IS NULL
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'ACCOUNTING_AR_BRIDGE_INVALID_INPUT';
  END IF;

  -- The existing W10D RPC remains the single authority check and source/as-of
  -- selection contract for this evidence-only projection.
  v_result := public.get_accounting_ar_bridge_reconciliation(
    p_actor_user_id, p_as_of_date, p_recorded_at_cutoff, p_limit
  );
  IF v_result->>'state' = 'NOT_INITIALIZED' THEN
    RETURN v_result;
  END IF;
  IF v_result->>'state' IS DISTINCT FROM 'READY' THEN
    RAISE EXCEPTION 'ACCOUNTING_AR_BRIDGE_RECONCILIATION_INVALID';
  END IF;

  SELECT p.id INTO v_profile_id
  FROM public.accounting_profiles AS p
  WHERE p.singleton_key='g7';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNTING_AR_BRIDGE_PROFILE_NOT_FOUND';
  END IF;

  WITH source_events AS MATERIALIZED (
    SELECT e.item, e.ordinality,
      nullif(e.item->>'event_id','')::uuid AS event_id,
      nullif(e.item->>'event_version','')::integer AS event_version,
      e.item->>'reconciliation_status' AS reconciliation_status,
      nullif(e.item->>'journal_id','')::uuid AS posted_journal_id
    FROM jsonb_array_elements(v_result->'events')
      WITH ORDINALITY AS e(item,ordinality)
  ),
  evidence AS MATERIALIZED (
    SELECT source_events.*,
      event_version.event_id AS evidence_event_id,
      event_version.reason,
      event_version.evidence_ref,
      event_version.evidence_sha256,
      event_version.created_by,
      event_version.created_at,
      journal_link.event_id AS linked_event_id,
      journal_link.journal_id AS linked_journal_id,
      journal_link.prepared_version
    FROM source_events
    LEFT JOIN public.accounting_ar_bridge_event_versions AS event_version
      ON event_version.profile_id=v_profile_id
      AND event_version.event_id=source_events.event_id
      AND event_version.version=source_events.event_version
      AND event_version.created_at<=p_recorded_at_cutoff
      AND event_version.source_recorded_at<=p_recorded_at_cutoff
    LEFT JOIN public.accounting_ar_bridge_journal_links AS journal_link
      ON source_events.reconciliation_status IN ('PREPARED','POSTED')
      AND journal_link.profile_id=v_profile_id
      AND journal_link.event_id=event_version.event_id
      AND journal_link.event_version=event_version.version
      AND journal_link.created_at<=p_recorded_at_cutoff
  )
  SELECT
    count(*) FILTER (
      WHERE (event_id IS NULL) <> (event_version IS NULL)
    )::integer,
    count(*) FILTER (
      WHERE event_id IS NOT NULL AND event_version IS NOT NULL
        AND evidence_event_id IS NULL
    )::integer,
    count(*) FILTER (
      WHERE reconciliation_status IN ('PREPARED','POSTED')
        AND event_id IS NOT NULL AND event_version IS NOT NULL
        AND linked_event_id IS NULL
    )::integer,
    count(*) FILTER (
      WHERE posted_journal_id IS NOT NULL AND linked_journal_id IS NOT NULL
        AND posted_journal_id IS DISTINCT FROM linked_journal_id
    )::integer,
    coalesce(jsonb_agg(
      CASE
        WHEN event_id IS NULL AND event_version IS NULL THEN item
        ELSE item || jsonb_build_object(
          'journal_id',coalesce(to_jsonb(posted_journal_id),to_jsonb(linked_journal_id)),
          'prepared_journal_version',prepared_version,
          'classification_reason',reason,
          'classification_evidence_ref',evidence_ref,
          'classification_evidence_sha256',evidence_sha256,
          'classified_by',created_by,
          'classified_at',created_at
        )
      END
      ORDER BY ordinality
    ),'[]'::jsonb)
  INTO v_partial_identity_count,v_missing_version_count,
       v_missing_journal_link_count,v_journal_link_mismatch_count,v_events
  FROM evidence;

  IF v_partial_identity_count<>0 OR v_missing_version_count<>0
     OR v_missing_journal_link_count<>0 OR v_journal_link_mismatch_count<>0 THEN
    RAISE EXCEPTION 'ACCOUNTING_AR_BRIDGE_EVIDENCE_INCOMPLETE';
  END IF;

  RETURN jsonb_set(v_result,'{events}',v_events,false);
END;
$ar_bridge_reconciliation_evidence$;

REVOKE ALL ON FUNCTION public.get_accounting_ar_bridge_reconciliation_with_evidence(uuid,date,timestamptz,integer)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_accounting_ar_bridge_reconciliation_with_evidence(uuid,date,timestamptz,integer)
  TO service_role;

COMMIT;
