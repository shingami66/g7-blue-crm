-- Exclude only ordinary controlled-manual drafts from W10H/W10I held-source completeness.
-- Preserve both deployed function definitions and their security metadata.
BEGIN;

DO $w10i_controlled_manual_draft_completeness$
DECLARE
  v_report_oid oid:=to_regprocedure(
    'public.get_w10h_accounting_report(uuid,text,date,date,timestamptz,uuid,uuid,integer,integer)'
  );
  v_close_oid oid:=to_regprocedure(
    'public.accounting_period_close_capture(uuid,uuid,timestamptz)'
  );
  v_report_before pg_catalog.pg_proc%ROWTYPE;
  v_close_before pg_catalog.pg_proc%ROWTYPE;
  v_report_after pg_catalog.pg_proc%ROWTYPE;
  v_close_after pg_catalog.pg_proc%ROWTYPE;
  v_report_definition text;
  v_close_definition text;
  v_report_old text:=$w10i_report_old$(e.status<>'POSTED' OR j.status<>'POSTED')$w10i_report_old$;
  v_close_old text:=$w10i_close_old$(e.status<>'POSTED' OR j.status IS DISTINCT FROM 'POSTED' OR j.posted_at IS NULL
      OR j.posted_at>p_recorded_at_cutoff)$w10i_close_old$;
  v_report_new text:=$w10i_report_new$NOT (e.status='PREPARED' AND j.status='DRAFT' AND e.source_domain='CONTROLLED_MANUAL')
      AND (e.status<>'POSTED' OR j.status<>'POSTED')$w10i_report_new$;
  v_close_new text:=$w10i_close_new$NOT (e.status='PREPARED' AND j.status='DRAFT' AND e.source_domain='CONTROLLED_MANUAL')
      AND (e.status<>'POSTED' OR j.status IS DISTINCT FROM 'POSTED' OR j.posted_at IS NULL
      OR j.posted_at>p_recorded_at_cutoff)$w10i_close_new$;
  v_report_expected_source text;
  v_close_expected_source text;
BEGIN
  IF v_report_oid IS NULL OR v_close_oid IS NULL THEN
    RAISE EXCEPTION 'W10I controlled-manual draft preflight: target RPC missing';
  END IF;

  SELECT p.* INTO STRICT v_report_before FROM pg_catalog.pg_proc p WHERE p.oid=v_report_oid;
  SELECT p.* INTO STRICT v_close_before FROM pg_catalog.pg_proc p WHERE p.oid=v_close_oid;
  v_report_definition:=pg_get_functiondef(v_report_oid);
  v_close_definition:=pg_get_functiondef(v_close_oid);

  IF pg_get_userbyid(v_report_before.proowner)<>'postgres'
     OR pg_get_userbyid(v_close_before.proowner)<>'postgres'
     OR NOT v_report_before.prosecdef OR NOT v_close_before.prosecdef
     OR NOT (v_report_before.proconfig @> ARRAY['search_path=pg_catalog, public'])
     OR NOT (v_close_before.proconfig @> ARRAY['search_path=pg_catalog, public'])
     OR length(v_report_before.prosrc)-length(replace(v_report_before.prosrc,v_report_old,''))<>length(v_report_old)
     OR length(v_close_before.prosrc)-length(replace(v_close_before.prosrc,v_close_old,''))<>length(v_close_old)
     OR length(v_report_definition)-length(replace(v_report_definition,v_report_old,''))<>length(v_report_old)
     OR length(v_close_definition)-length(replace(v_close_definition,v_close_old,''))<>length(v_close_old) THEN
    RAISE EXCEPTION 'W10I controlled-manual draft preflight: deployed function source or security differs';
  END IF;

  v_report_expected_source:=replace(v_report_before.prosrc,v_report_old,v_report_new);
  v_close_expected_source:=replace(v_close_before.prosrc,v_close_old,v_close_new);
  v_report_definition:=replace(v_report_definition,v_report_old,v_report_new);
  v_close_definition:=replace(v_close_definition,v_close_old,v_close_new);

  EXECUTE v_report_definition;
  EXECUTE v_close_definition;

  SELECT p.* INTO STRICT v_report_after FROM pg_catalog.pg_proc p WHERE p.oid=v_report_oid;
  SELECT p.* INTO STRICT v_close_after FROM pg_catalog.pg_proc p WHERE p.oid=v_close_oid;

  IF v_report_after.prosrc IS DISTINCT FROM v_report_expected_source
     OR v_close_after.prosrc IS DISTINCT FROM v_close_expected_source
     OR v_report_after.proowner IS DISTINCT FROM v_report_before.proowner
     OR v_close_after.proowner IS DISTINCT FROM v_close_before.proowner
     OR v_report_after.proacl IS DISTINCT FROM v_report_before.proacl
     OR v_close_after.proacl IS DISTINCT FROM v_close_before.proacl
     OR v_report_after.proconfig IS DISTINCT FROM v_report_before.proconfig
     OR v_close_after.proconfig IS DISTINCT FROM v_close_before.proconfig
     OR v_report_after.prosecdef IS DISTINCT FROM v_report_before.prosecdef
     OR v_close_after.prosecdef IS DISTINCT FROM v_close_before.prosecdef
     OR v_report_after.provolatile IS DISTINCT FROM v_report_before.provolatile
     OR v_close_after.provolatile IS DISTINCT FROM v_close_before.provolatile
     OR v_report_after.proparallel IS DISTINCT FROM v_report_before.proparallel
     OR v_close_after.proparallel IS DISTINCT FROM v_close_before.proparallel
     OR v_report_after.procost IS DISTINCT FROM v_report_before.procost
     OR v_close_after.procost IS DISTINCT FROM v_close_before.procost
     OR v_report_after.prorows IS DISTINCT FROM v_report_before.prorows
     OR v_close_after.prorows IS DISTINCT FROM v_close_before.prorows THEN
    RAISE EXCEPTION 'W10I controlled-manual draft postflight: function source or metadata differs';
  END IF;
END;
$w10i_controlled_manual_draft_completeness$;

COMMIT;
