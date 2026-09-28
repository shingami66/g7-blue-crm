-- Qualify reversal source-effect columns that collide with RETURNS TABLE output names.
BEGIN;

DO $correction$
DECLARE
  v_function_oid oid := to_regprocedure(
    'public.reverse_accounting_journal(uuid,uuid,uuid,date,text,text,uuid)'
  );
  v_source text;
  v_repaired text;
  v_expected_source_md5 CONSTANT text := 'cd78ba012a55a491898ec2fc4fc53178';
  v_old_fragment CONSTANT text := $old$WHERE profile_id=v_profile_id AND journal_id=v_reversal_id AND status='PREPARED';$old$;
  v_new_fragment CONSTANT text := $new$WHERE public.accounting_source_effects.profile_id=v_profile_id AND public.accounting_source_effects.journal_id=v_reversal_id AND public.accounting_source_effects.status='PREPARED';$new$;
BEGIN
  IF v_function_oid IS NULL THEN
    RAISE EXCEPTION 'W10B reversal status correction preflight: reverse RPC is missing';
  END IF;

  SELECT p.prosrc
  INTO v_source
  FROM pg_catalog.pg_proc p
  WHERE p.oid = v_function_oid
    AND p.prosecdef
    AND p.provolatile = 'v'
    AND p.proparallel = 'u'
    AND p.proconfig = ARRAY['search_path=pg_catalog, public']
    AND p.proowner = 'postgres'::regrole
    AND p.proacl IS NOT NULL
    AND has_function_privilege('service_role', p.oid, 'EXECUTE')
    AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    AND NOT EXISTS (
      SELECT 1
      FROM aclexplode(p.proacl) a
      WHERE a.privilege_type = 'EXECUTE'
        AND a.grantee NOT IN (
          p.proowner,
          (SELECT r.oid FROM pg_catalog.pg_roles r WHERE r.rolname='service_role')
        )
    );

  IF v_source IS NULL
     OR md5(v_source) <> v_expected_source_md5
     OR length(v_source) - length(replace(v_source, v_old_fragment, '')) <> length(v_old_fragment)
     OR position('UPDATE public.accounting_source_effects SET status=' in v_source) = 0 THEN
    RAISE EXCEPTION 'W10B reversal status correction preflight: reverse RPC source differs';
  END IF;

  v_repaired := replace(v_source, v_old_fragment, v_new_fragment);

  IF position(v_old_fragment in v_repaired) > 0
     OR length(v_repaired) - length(replace(v_repaired, v_new_fragment, '')) <> length(v_new_fragment) THEN
    RAISE EXCEPTION 'W10B reversal status correction preflight: predicate patch was not exact';
  END IF;

  EXECUTE format(
    $ddl$CREATE OR REPLACE FUNCTION public.reverse_accounting_journal(
      p_actor_user_id uuid,
      p_original_journal_id uuid,
      p_period_id uuid,
      p_accounting_date date,
      p_reason text,
      p_evidence_ref text,
      p_request_id uuid
    )
    RETURNS TABLE(error_code text, journal_id uuid, version integer, original_journal_id uuid, idempotent_replay boolean)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path=pg_catalog,public
    AS %L$ddl$,
    v_repaired
  );
END;
$correction$;

COMMIT;
