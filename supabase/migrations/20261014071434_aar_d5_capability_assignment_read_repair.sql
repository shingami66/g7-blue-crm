-- Widen the governed assignment read to every enabled accounting capability.
BEGIN;

CREATE OR REPLACE FUNCTION public.list_accounting_capability_assignments(p_actor_user_id uuid,p_target_user_id uuid)
RETURNS TABLE(capability text,effect text,revision integer,expires_at timestamptz,actor_user_id uuid,created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $list$
BEGIN
  PERFORM 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active IS TRUE FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_ACTOR_INACTIVE_OR_MISSING'; END IF;
  IF NOT public.get_accounting_capability(p_actor_user_id,'accounting:manage_authority') THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCOUNTING_CAPABILITY_DENIED';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_target_user_id) THEN
    RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='ACCOUNTING_TARGET_USER_NOT_FOUND';
  END IF;
  RETURN QUERY
    SELECT e.capability,e.effect,e.revision,e.expires_at,e.actor_user_id,e.created_at
    FROM public.accounting_profiles p
    JOIN public.accounting_capability_events e ON e.profile_id=p.id
    JOIN public.accounting_capability_catalog c
      ON c.capability=e.capability AND c.enabled
    WHERE p.singleton_key='g7' AND e.target_user_id=p_target_user_id
      AND e.revision=(SELECT max(latest.revision) FROM public.accounting_capability_events latest
        WHERE latest.profile_id=e.profile_id AND latest.target_user_id=e.target_user_id AND latest.capability=e.capability)
    ORDER BY e.capability;
END;
$list$;

COMMIT;