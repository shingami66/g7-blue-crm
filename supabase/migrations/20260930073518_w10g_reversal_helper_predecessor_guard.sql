-- W10G additive contract repair: guard the deployed reversal-impact helper
-- before preserving its owner-only, posted-journal implementation.
BEGIN;

DO $w10g_helper_preflight$
DECLARE
  v_oid oid;
  v_def text;
  v_config text[];
  v_owner text;
BEGIN
  SELECT p.oid,pg_get_functiondef(p.oid),p.proconfig,pg_get_userbyid(p.proowner)
    INTO v_oid,v_def,v_config,v_owner
  FROM pg_proc p
  WHERE p.oid=to_regprocedure('public.accounting_bank_reconciliation_reversal_impact()');
  IF v_oid IS NULL
     OR v_owner IS DISTINCT FROM 'postgres'
     OR v_config IS NULL
     OR NOT ('search_path=pg_catalog, public'=ANY(v_config))
     OR position('NEW.reversal_of_journal_id IS NULL OR NEW.status<>''POSTED'' THEN RETURN NEW; END IF;' IN v_def)=0
     OR position('nextval(''public.accounting_bank_reconciliation_event_version_seq'')' IN v_def)=0
     OR position('IMPACT_REVIEW_REQUIRED' IN v_def)=0
     OR position('accounting_bank_reconciliation_reviewed' IN v_def)=0 THEN
    RAISE EXCEPTION 'W10G helper predecessor contract is not the expected deployed implementation';
  END IF;
END;
$w10g_helper_preflight$;

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

DO $w10g_helper_postflight$
DECLARE
  v_oid oid;
  v_def text;
  v_config text[];
BEGIN
  SELECT p.oid,pg_get_functiondef(p.oid),p.proconfig
    INTO v_oid,v_def,v_config
  FROM pg_proc p
  WHERE p.oid=to_regprocedure('public.accounting_bank_reconciliation_reversal_impact()')
    AND p.prorettype='pg_catalog.trigger'::regtype;
  IF v_oid IS NULL
     OR NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=v_oid AND p.prosecdef AND pg_get_userbyid(p.proowner)='postgres')
     OR v_config IS NULL
     OR NOT ('search_path=pg_catalog, public'=ANY(v_config))
     OR position('NEW.reversal_of_journal_id IS NULL OR NEW.status<>''POSTED'' THEN RETURN NEW; END IF;' IN v_def)=0
     OR position('nextval(''public.accounting_bank_reconciliation_event_version_seq'')' IN v_def)=0
     OR position('IMPACT_REVIEW_REQUIRED' IN v_def)=0
     OR position('accounting_bank_reconciliation_reviewed' IN v_def)=0 THEN
    RAISE EXCEPTION 'W10G helper postflight metadata or source contract changed';
  END IF;
  IF has_function_privilege('anon','public.accounting_bank_reconciliation_reversal_impact()','EXECUTE')
     OR has_function_privilege('authenticated','public.accounting_bank_reconciliation_reversal_impact()','EXECUTE')
     OR has_function_privilege('service_role','public.accounting_bank_reconciliation_reversal_impact()','EXECUTE') THEN
    RAISE EXCEPTION 'W10G helper postflight ACL is not owner-only';
  END IF;
END;
$w10g_helper_postflight$;

COMMIT;
