-- W10E1 corrective migration: read Service Receipt identity from the source snapshot root.
BEGIN;

DO $w10e1_receipt_match_snapshot_path_correction$
DECLARE
  v_function oid;
  v_source text;
  v_repaired text;
  v_old text;
  v_new text;
  v_owner oid;
  v_acl aclitem[];
  v_config text[];
  v_after_owner oid;
  v_after_acl aclitem[];
  v_after_config text[];
  v_volatility "char";
  v_parallel "char";
  v_cost real;
  v_rows real;
  v_strict boolean;
  v_leakproof boolean;
  v_security boolean;
BEGIN
  v_function:=to_regprocedure('public.save_accounting_ap_bridge_event(uuid,text,uuid,integer,text,bigint,bigint,text,date,text,text,text,text,uuid,integer,text,uuid)');
  SELECT p.prosrc,p.proowner,p.proacl,p.proconfig,p.provolatile,p.proparallel,p.procost,p.prorows,
    p.proisstrict,p.proleakproof,p.prosecdef
    INTO v_source,v_owner,v_acl,v_config,v_volatility,v_parallel,v_cost,v_rows,v_strict,v_leakproof,v_security
    FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_function IS NULL OR v_source IS NULL OR NOT v_security OR v_volatility<>'v' OR v_parallel<>'u'
     OR v_cost<>100 OR v_rows<>1000 OR v_strict OR v_leakproof
     OR v_config IS DISTINCT FROM ARRAY['search_path=pg_catalog, public'] THEN
    RAISE EXCEPTION 'W10E1 correction preflight: AP save RPC contract differs';
  END IF;

  v_old:='e.source_record_id=nullif(v_snapshot->''attributes''->>''receipt_id'','''')::uuid';
  v_new:='e.source_record_id=nullif(v_snapshot->>''receipt_id'','''')::uuid';
  IF length(v_source)-length(replace(v_source,v_old,''))<>length(v_old)
     OR position(v_new in v_source)>0 THEN
    RAISE EXCEPTION 'W10E1 correction preflight: receipt snapshot path anchor differs';
  END IF;
  v_repaired:=replace(v_source,v_old,v_new);

  EXECUTE format($ddl$CREATE OR REPLACE FUNCTION public.save_accounting_ap_bridge_event(
    p_actor_user_id uuid,p_source_type text,p_source_record_id uuid,p_expected_version integer,
    p_classification text,p_amount_halalah bigint,p_matched_receipt_halalah bigint,p_direct_classification text,
    p_accounting_date date,p_evidence_ref text,p_evidence_sha256 text,p_cash_binding_evidence_ref text,
    p_cash_binding_evidence_sha256 text,p_cash_account_id uuid,p_cash_account_version integer,p_reason text,p_request_id uuid
  ) RETURNS TABLE(error_code text,event_id uuid,version integer,status text,idempotent_replay boolean)
    LANGUAGE plpgsql CALLED ON NULL INPUT VOLATILE NOT LEAKPROOF SECURITY DEFINER PARALLEL UNSAFE
    COST 100 ROWS 1000 SET search_path=pg_catalog, public AS %L$ddl$,v_repaired);

  SELECT p.proowner,p.proacl,p.proconfig,p.prosrc
    INTO v_after_owner,v_after_acl,v_after_config,v_source FROM pg_catalog.pg_proc p WHERE p.oid=v_function;
  IF v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl
     OR v_after_config IS DISTINCT FROM v_config OR v_source IS DISTINCT FROM v_repaired
     OR length(v_source)-length(replace(v_source,v_new,''))<>length(v_new) THEN
    RAISE EXCEPTION 'W10E1 correction postflight: AP save RPC definition or security changed';
  END IF;
END;
$w10e1_receipt_match_snapshot_path_correction$;

COMMIT;
