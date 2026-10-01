-- W10I: let W10H carry an accepted cutover opening balance into later reports.
-- Keep the existing at-or-before-cutover acceptance condition for prior periods.
BEGIN;

DO $w10i_w10h_report_preflight$
DECLARE
  v_oid oid:=to_regprocedure(
    'public.get_w10h_accounting_report(uuid,text,date,date,timestamptz,uuid,uuid,integer,integer)'
  );
  v_source text;
  v_definition text;
  v_old text:='a.as_of_date>=p_through_date';
  v_new text;
  v_owner text;
  v_config text[];
  v_security_definer boolean;
BEGIN
  IF v_oid IS NULL THEN RAISE EXCEPTION 'W10I W10H compatibility preflight: report RPC missing'; END IF;
  SELECT p.prosrc,pg_get_functiondef(p.oid),pg_get_userbyid(p.proowner),p.proconfig,p.prosecdef
    INTO v_source,v_definition,v_owner,v_config,v_security_definer
  FROM pg_catalog.pg_proc p WHERE p.oid=v_oid;
  IF v_owner<>'postgres' OR NOT v_security_definer
     OR NOT (v_config @> ARRAY['search_path=pg_catalog, public'])
     OR length(v_source)-length(replace(v_source,v_old,''))<>length(v_old)
     OR length(v_definition)-length(replace(v_definition,v_old,''))<>length(v_old) THEN
    RAISE EXCEPTION 'W10I W10H compatibility preflight: report definition differs';
  END IF;
  v_new:=$w10i_cutover_predicate$(a.as_of_date>=p_through_date OR (
    a.as_of_date<=p_through_date AND EXISTS (
      SELECT 1 FROM public.accounting_profile_versions pv_cutover
      WHERE pv_cutover.profile_id=a.profile_id
        AND pv_cutover.cutover_boundary_date=a.as_of_date
        AND pv_cutover.created_at<=v_cutoff
        AND pv_cutover.effective_from<((p_through_date::timestamp+interval '1 day') AT TIME ZONE 'Asia/Riyadh')
    )
  ))$w10i_cutover_predicate$;
  EXECUTE replace(v_definition,v_old,v_new);
END;
$w10i_w10h_report_preflight$;

DO $w10i_w10h_report_postflight$
DECLARE v_proc pg_catalog.pg_proc%ROWTYPE;
BEGIN
  SELECT p.* INTO v_proc FROM pg_catalog.pg_proc p
  WHERE p.oid=to_regprocedure(
    'public.get_w10h_accounting_report(uuid,text,date,date,timestamptz,uuid,uuid,integer,integer)'
  );
  IF NOT FOUND OR NOT v_proc.prosecdef OR v_proc.proowner<>
       (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname='postgres')
     OR NOT (v_proc.proconfig @> ARRAY['search_path=pg_catalog, public'])
     OR position('pv_cutover.cutover_boundary_date=a.as_of_date' IN v_proc.prosrc)=0
     OR position('a.as_of_date>=p_through_date' IN v_proc.prosrc)=0
     OR NOT has_function_privilege('service_role',v_proc.oid,'EXECUTE')
     OR has_function_privilege('anon',v_proc.oid,'EXECUTE')
     OR has_function_privilege('authenticated',v_proc.oid,'EXECUTE') THEN
    RAISE EXCEPTION 'W10I W10H compatibility postflight: report behavior or security differs';
  END IF;
END;
$w10i_w10h_report_postflight$;

COMMIT;
