-- W10G additive repair: preserve the deployed review contract, then harden the
-- reversal-impact trigger helper as an owner-only implementation detail.
BEGIN;

DO $w10g_repair_preflight$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.oid=to_regprocedure('public.review_accounting_bank_reconciliation(uuid,uuid,integer,boolean,text,uuid)');
  IF v_def IS NULL OR position('nextval(''public.accounting_bank_reconciliation_event_version_seq''' IN v_def)=0 THEN
    RAISE EXCEPTION 'W10G review event-identity predecessor contract is not present';
  END IF;
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public'
    AND p.oid=to_regprocedure('public.unmatch_accounting_bank_reconciliation(uuid,uuid,integer,text,uuid)');
  IF v_def IS NULL OR position('nextval(''public.accounting_bank_reconciliation_event_version_seq''' IN v_def)=0 THEN
    RAISE EXCEPTION 'W10G unmatch event-identity predecessor contract is not present';
  END IF;
END;
$w10g_repair_preflight$;

CREATE OR REPLACE FUNCTION public.accounting_bank_reconciliation_reversal_impact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE
  v_alloc record;
  v_fid uuid;
  v_event_version integer;
BEGIN
  IF NEW.reversal_of_journal_id IS NULL OR NEW.status<>'POSTED' THEN RETURN NEW; END IF;
  FOR v_alloc IN
    SELECT DISTINCT a.profile_id,a.group_id,a.group_version,r.reviewer_user_id
    FROM public.accounting_bank_reconciliation_allocations a
    JOIN LATERAL (
      SELECT r.* FROM public.accounting_bank_reconciliation_reviews r
      WHERE r.profile_id=a.profile_id AND r.group_id=a.group_id AND r.group_version=a.group_version
      ORDER BY r.recorded_at DESC,r.id DESC LIMIT 1
    ) r ON r.decision='APPROVED'
    WHERE a.profile_id=NEW.profile_id AND a.ledger_journal_id=NEW.reversal_of_journal_id
  LOOP
    v_event_version:=nextval('public.accounting_bank_reconciliation_event_version_seq');
    INSERT INTO public.accounting_foundation_events(
      profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,
      reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
    VALUES(NEW.profile_id,'accounting_bank_reconciliation_reviewed','accounting_bank_reconciliation',v_alloc.group_id,
      v_event_version,coalesce(NEW.posted_by,NEW.prepared_by),gen_random_uuid(),
      'Reversed ledger cash journal requires reconciliation impact review',NULL,
      encode(extensions.digest(convert_to(NEW.reversal_of_journal_id::text||':'||v_alloc.group_id::text,'UTF8'),'sha256'),'hex'),
      'accounting_bank_reconciliation/'||v_alloc.group_id::text||'/'||v_alloc.group_version::text,clock_timestamp())
    RETURNING id INTO v_fid;
    INSERT INTO public.accounting_bank_reconciliation_reviews(
      profile_id,group_id,group_version,decision,reviewer_user_id,reason,request_id,payload_fingerprint,foundation_event_id)
    VALUES(v_alloc.profile_id,v_alloc.group_id,v_alloc.group_version,'IMPACT_REVIEW_REQUIRED',
      coalesce(NEW.posted_by,NEW.prepared_by),'Reversal of reconciled cash journal requires explicit impact review',
      gen_random_uuid(),encode(extensions.digest(convert_to(NEW.reversal_of_journal_id::text||':'||v_alloc.group_id::text||':impact','UTF8'),'sha256'),'hex'),v_fid);
  END LOOP;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.accounting_bank_reconciliation_reversal_impact()
  FROM PUBLIC,anon,authenticated,service_role;

DO $w10g_repair_postflight$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.oid=to_regprocedure('public.accounting_bank_reconciliation_reversal_impact()')
      AND p.prosecdef AND pg_get_userbyid(p.proowner)='postgres'
      AND 'search_path=pg_catalog, public'=ANY(p.proconfig)
      AND position('NEW.status<>''POSTED''' IN pg_get_functiondef(p.oid))>0
  ) THEN RAISE EXCEPTION 'W10G reversal-impact helper contract was not preserved'; END IF;
  IF has_function_privilege('anon','public.accounting_bank_reconciliation_reversal_impact()','EXECUTE')
     OR has_function_privilege('authenticated','public.accounting_bank_reconciliation_reversal_impact()','EXECUTE')
     OR has_function_privilege('service_role','public.accounting_bank_reconciliation_reversal_impact()','EXECUTE') THEN
    RAISE EXCEPTION 'W10G reversal-impact helper remains application-executable';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.oid=to_regprocedure('public.review_accounting_bank_reconciliation(uuid,uuid,integer,boolean,text,uuid)')
      AND p.prosecdef AND pg_get_userbyid(p.proowner)='postgres'
      AND 'search_path=pg_catalog, public, extensions'=ANY(p.proconfig)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.oid=to_regprocedure('public.unmatch_accounting_bank_reconciliation(uuid,uuid,integer,text,uuid)')
      AND p.prosecdef AND pg_get_userbyid(p.proowner)='postgres'
      AND 'search_path=pg_catalog, public, extensions'=ANY(p.proconfig)
  ) THEN RAISE EXCEPTION 'W10G review or unmatch RPC contract drifted'; END IF;
END;
$w10g_repair_postflight$;

COMMIT;
