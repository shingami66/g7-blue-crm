-- W10I: validate Balance Sheet from_date against the fiscal-year boundary used by W10H.
-- Replace only the Balance Sheet boundary predicate; the selected profile version and
-- all FI-012 cutoffs, report completeness checks, and function security metadata remain intact.
BEGIN;

DO $w10i_balance_sheet_fiscal_year_boundary$
DECLARE
  v_oid oid:=to_regprocedure(
    'public.accounting_period_close_capture(uuid,uuid,timestamptz)'
  );
  v_before pg_catalog.pg_proc%ROWTYPE;
  v_after pg_catalog.pg_proc%ROWTYPE;
  v_definition text;
  v_expected_source text;
  v_old_boundary text:=$w10i_old$v_balance->>'from_date' IS DISTINCT FROM v_period.start_date::text$w10i_old$;
  v_new_boundary text:=$w10i_new$v_balance->>'from_date' IS DISTINCT FROM (CASE
        WHEN make_date(extract(year FROM v_period.end_date)::integer,v_profile_version.fiscal_start_month,1)
             +(v_profile_version.fiscal_start_day-1)>v_period.end_date
        THEN make_date(extract(year FROM v_period.end_date)::integer-1,v_profile_version.fiscal_start_month,1)
             +(v_profile_version.fiscal_start_day-1)
        ELSE make_date(extract(year FROM v_period.end_date)::integer,v_profile_version.fiscal_start_month,1)
             +(v_profile_version.fiscal_start_day-1)
      END)::text$w10i_new$;
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'W10I Balance Sheet boundary preflight: close capture RPC missing';
  END IF;

  SELECT p.* INTO STRICT v_before FROM pg_catalog.pg_proc p WHERE p.oid=v_oid;
  v_definition:=pg_get_functiondef(v_oid);

  IF pg_get_userbyid(v_before.proowner)<>'postgres'
     OR NOT v_before.prosecdef
     OR v_before.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog, public']::text[]
     OR length(v_before.prosrc)-length(replace(v_before.prosrc,v_old_boundary,''))<>length(v_old_boundary)
     OR length(v_definition)-length(replace(v_definition,v_old_boundary,''))<>length(v_old_boundary) THEN
    RAISE EXCEPTION 'W10I Balance Sheet boundary preflight: deployed function source or security differs';
  END IF;

  v_expected_source:=replace(v_before.prosrc,v_old_boundary,v_new_boundary);
  v_definition:=replace(v_definition,v_old_boundary,v_new_boundary);
  EXECUTE v_definition;

  SELECT p.* INTO STRICT v_after FROM pg_catalog.pg_proc p WHERE p.oid=v_oid;
  IF v_after.prosrc IS DISTINCT FROM v_expected_source
     OR v_after.proowner IS DISTINCT FROM v_before.proowner
     OR v_after.proacl IS DISTINCT FROM v_before.proacl
     OR v_after.proconfig IS DISTINCT FROM v_before.proconfig
     OR v_after.prosecdef IS DISTINCT FROM v_before.prosecdef
     OR v_after.provolatile IS DISTINCT FROM v_before.provolatile
     OR v_after.proparallel IS DISTINCT FROM v_before.proparallel
     OR v_after.procost IS DISTINCT FROM v_before.procost
     OR v_after.prorows IS DISTINCT FROM v_before.prorows
     OR v_after.proargtypes IS DISTINCT FROM v_before.proargtypes
     OR v_after.proallargtypes IS DISTINCT FROM v_before.proallargtypes
     OR v_after.proargmodes IS DISTINCT FROM v_before.proargmodes
     OR v_after.proargnames IS DISTINCT FROM v_before.proargnames
     OR v_after.prorettype IS DISTINCT FROM v_before.prorettype
     OR v_after.proretset IS DISTINCT FROM v_before.proretset
     OR v_after.prolang IS DISTINCT FROM v_before.prolang THEN
    RAISE EXCEPTION 'W10I Balance Sheet boundary postflight: function source or metadata differs';
  END IF;
END;
$w10i_balance_sheet_fiscal_year_boundary$;

COMMIT;
