-- Correct the W10B business-effect fingerprint without changing request retry identity.
BEGIN;

DO $correction$
DECLARE
  v_function_oid oid := to_regprocedure(
    'public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)'
  );
  v_source text;
  v_repaired text;
  v_old_fragment CONSTANT text := $old$'journal',p_journal,'reason',btrim(p_reason),$old$;
  v_new_fragment CONSTANT text := $new$'journal',p_journal,$new$;
  v_reason_fragment CONSTANT text := $reason$'reason',btrim(p_reason)$reason$;
BEGIN
  IF v_function_oid IS NULL
     OR to_regclass('public.accounting_source_effects') IS NULL THEN
    RAISE EXCEPTION 'W10B economic-effect correction preflight: journal dependencies are missing';
  END IF;

  SELECT p.prosrc
  INTO v_source
  FROM pg_catalog.pg_proc p
  WHERE p.oid = v_function_oid
    AND p.prosecdef
    AND p.provolatile = 'v'
    AND p.proparallel = 'u'
    AND p.proconfig = ARRAY['search_path=pg_catalog, public'];

  IF v_source IS NULL
     OR length(v_source) - length(replace(v_source, v_old_fragment, '')) <> length(v_old_fragment)
     OR length(v_source) - length(replace(v_source, v_reason_fragment, '')) <> 2 * length(v_reason_fragment)
     OR position('v_request_fingerprint:=' in v_source) = 0
     OR position('v_fingerprint:=' in v_source) = 0 THEN
    RAISE EXCEPTION 'W10B economic-effect correction preflight: prepare RPC source differs';
  END IF;

  v_repaired := replace(v_source, v_old_fragment, v_new_fragment);

  IF position(v_old_fragment in v_repaired) > 0
     OR length(v_repaired) - length(replace(v_repaired, v_reason_fragment, '')) <> length(v_reason_fragment) THEN
    RAISE EXCEPTION 'W10B economic-effect correction preflight: fingerprint patch was not exact';
  END IF;

  EXECUTE format(
    $ddl$CREATE OR REPLACE FUNCTION public.prepare_accounting_journal(
      p_actor_user_id uuid,
      p_journal_id uuid,
      p_expected_version integer,
      p_journal jsonb,
      p_reason text,
      p_evidence_ref text,
      p_request_id uuid
    )
    RETURNS TABLE(error_code text, journal_id uuid, version integer, status text, idempotent_replay boolean)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path=pg_catalog, public
    AS %L$ddl$,
    v_repaired
  );
END;
$correction$;

COMMIT;
