-- W10G additive repair: lifecycle review events need immutable foundation-event
-- identities distinct from the prepared reconciliation group version.
BEGIN;

DO $w10g_repair_preflight$
BEGIN
  IF to_regclass('public.accounting_bank_reconciliation_event_version_seq') IS NOT NULL THEN
    RAISE EXCEPTION 'W10G event identity repair sequence already exists';
  END IF;
END;
$w10g_repair_preflight$;

CREATE SEQUENCE public.accounting_bank_reconciliation_event_version_seq
  AS integer START WITH 1000000000 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
REVOKE ALL ON SEQUENCE public.accounting_bank_reconciliation_event_version_seq
  FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.accounting_bank_reconciliation_reversal_impact()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $fn$
DECLARE
  v_alloc record;
  v_fid uuid;
  v_event_version integer;
BEGIN
  IF NEW.reversal_of_journal_id IS NULL THEN RETURN NEW; END IF;
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

CREATE OR REPLACE FUNCTION public.review_accounting_bank_reconciliation(
  p_actor_user_id uuid,p_group_id uuid,p_group_version integer,p_approve boolean,p_reason text,p_request_id uuid)
RETURNS TABLE(error_code text,group_id uuid,group_version integer,decision text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path=pg_catalog,public,extensions AS $fn$
DECLARE
  v_profile uuid; v_preparer uuid; v_stmt bigint; v_ledger bigint; v_fp text; v_fid uuid; v_review record;
  v_event_version integer;
BEGIN
  SELECT p.id INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile IS NULL OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  SELECT g.prepared_by INTO v_preparer FROM public.accounting_bank_reconciliation_group_versions g
  WHERE g.profile_id=v_profile AND g.group_id=p_group_id AND g.version=p_group_version AND g.status='PREPARED';
  IF NOT FOUND THEN RETURN QUERY SELECT 'reconciliation_not_found'::text,p_group_id,p_group_version,NULL::text,false; RETURN; END IF;
  IF v_preparer=p_actor_user_id THEN RETURN QUERY SELECT 'independent_review_required'::text,p_group_id,p_group_version,NULL::text,false; RETURN; END IF;
  SELECT coalesce(sum(abs(a.statement_allocated_halalah)),0),coalesce(sum(abs(a.ledger_allocated_halalah)),0) INTO v_stmt,v_ledger
  FROM public.accounting_bank_reconciliation_allocations a WHERE a.profile_id=v_profile AND a.group_id=p_group_id AND a.group_version=p_group_version;
  IF v_stmt IS DISTINCT FROM v_ledger THEN RETURN QUERY SELECT 'mismatched_allocation_totals'::text,p_group_id,p_group_version,NULL::text,false; RETURN; END IF;
  v_fp:=encode(extensions.digest(convert_to(jsonb_build_object('group_id',p_group_id,'group_version',p_group_version,'approve',p_approve,'reason',p_reason)::text,'UTF8'),'sha256'),'hex');
  SELECT r.* INTO v_review FROM public.accounting_bank_reconciliation_reviews r
  WHERE r.profile_id=v_profile AND r.reviewer_user_id=p_actor_user_id AND r.request_id=p_request_id;
  IF FOUND THEN
    IF v_review.payload_fingerprint IS DISTINCT FROM v_fp THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,p_group_id,v_review.group_version,v_review.decision,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,p_group_id,v_review.group_version,v_review.decision,true; RETURN;
  END IF;
  v_event_version:=nextval('public.accounting_bank_reconciliation_event_version_seq');
  INSERT INTO public.accounting_foundation_events(profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(v_profile,'accounting_bank_reconciliation_reviewed','accounting_bank_reconciliation',p_group_id,v_event_version,p_actor_user_id,p_request_id,p_reason,NULL,v_fp,'accounting_bank_reconciliation/'||p_group_id::text||'/'||p_group_version::text,clock_timestamp())
  RETURNING id INTO v_fid;
  INSERT INTO public.accounting_bank_reconciliation_reviews(profile_id,group_id,group_version,decision,reviewer_user_id,reason,request_id,payload_fingerprint,foundation_event_id)
  VALUES(v_profile,p_group_id,p_group_version,CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,p_actor_user_id,p_reason,p_request_id,v_fp,v_fid);
  RETURN QUERY SELECT NULL::text,p_group_id,p_group_version,CASE WHEN p_approve THEN 'APPROVED' ELSE 'REJECTED' END,false;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.unmatch_accounting_bank_reconciliation(
  p_actor_user_id uuid,p_group_id uuid,p_group_version integer,p_reason text,p_request_id uuid)
RETURNS TABLE(error_code text,group_id uuid,group_version integer,decision text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER VOLATILE SET search_path=pg_catalog,public,extensions AS $fn$
DECLARE
  v_profile uuid; v_fp text; v_fid uuid; v_review record; v_event_version integer;
BEGIN
  SELECT p.id INTO v_profile FROM public.accounting_profiles p WHERE p.singleton_key='g7';
  IF v_profile IS NULL OR NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=p_actor_user_id AND u.is_active)
     OR NOT public.get_accounting_capability(p_actor_user_id,'accounting:reconcile_bank') THEN
    RETURN QUERY SELECT 'authority_denied'::text,NULL::uuid,NULL::integer,NULL::text,false; RETURN;
  END IF;
  IF p_group_id IS NULL OR p_group_version<1 OR p_reason IS NULL OR p_request_id IS NULL THEN
    RETURN QUERY SELECT 'invalid_input'::text,p_group_id,p_group_version,NULL::text,false; RETURN; END IF;
  v_fp:=encode(extensions.digest(convert_to(jsonb_build_object('group_id',p_group_id,'group_version',p_group_version,'reason',p_reason)::text,'UTF8'),'sha256'),'hex');
  SELECT r.* INTO v_review FROM public.accounting_bank_reconciliation_reviews r
  WHERE r.profile_id=v_profile AND r.reviewer_user_id=p_actor_user_id AND r.request_id=p_request_id;
  IF FOUND THEN
    IF v_review.payload_fingerprint IS DISTINCT FROM v_fp THEN
      RETURN QUERY SELECT 'request_payload_conflict'::text,p_group_id,v_review.group_version,v_review.decision,false; RETURN;
    END IF;
    RETURN QUERY SELECT NULL::text,p_group_id,v_review.group_version,v_review.decision,true; RETURN;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.accounting_bank_reconciliation_reviews r WHERE r.profile_id=v_profile AND r.group_id=p_group_id AND r.group_version=p_group_version AND r.decision='APPROVED') THEN
    RETURN QUERY SELECT 'reconciliation_not_approved'::text,p_group_id,p_group_version,NULL::text,false; RETURN; END IF;
  v_event_version:=nextval('public.accounting_bank_reconciliation_event_version_seq');
  INSERT INTO public.accounting_foundation_events(profile_id,event_type,entity_type,entity_id,entity_version,actor_user_id,request_id,reason,evidence_ref,payload_fingerprint,result_reference,occurred_at)
  VALUES(v_profile,'accounting_bank_reconciliation_unmatched','accounting_bank_reconciliation',p_group_id,v_event_version,p_actor_user_id,p_request_id,p_reason,NULL,v_fp,'accounting_bank_reconciliation/'||p_group_id::text||'/'||p_group_version::text,clock_timestamp())
  RETURNING id INTO v_fid;
  INSERT INTO public.accounting_bank_reconciliation_reviews(profile_id,group_id,group_version,decision,reviewer_user_id,reason,request_id,payload_fingerprint,foundation_event_id)
  VALUES(v_profile,p_group_id,p_group_version,'UNMATCHED',p_actor_user_id,p_reason,p_request_id,v_fp,v_fid);
  RETURN QUERY SELECT NULL::text,p_group_id,p_group_version,'UNMATCHED'::text,false;
END;
$fn$;

COMMIT;
