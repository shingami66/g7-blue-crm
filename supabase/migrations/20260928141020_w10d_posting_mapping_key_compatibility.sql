BEGIN;

-- W10B posting-rule mapping keys are canonical lowercase identifiers. Keep
-- W10D party roles uppercase while using those identifiers at the journal seam.
CREATE OR REPLACE FUNCTION public.accounting_ar_bridge_posting_spec(
  p_source_type text,p_classification text,p_source_snapshot jsonb
)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10d_posting_spec_v2$
  SELECT CASE
    WHEN p_source_type='INVOICE' AND p_classification='UNCONDITIONAL_CONTRACT_LIABILITY'
      THEN jsonb_build_object('debit_key','ar_control','credit_key','contract_liability','debit_role','AR_CONTROL','credit_role','CONTRACT_LIABILITY')
    WHEN p_source_type='INVOICE' AND p_classification='UNCONDITIONAL_CONTRACT_ASSET'
      THEN jsonb_build_object('debit_key','ar_control','credit_key','contract_asset','debit_role','AR_CONTROL','credit_role','CONTRACT_ASSET')
    WHEN p_source_type IN ('PAYMENT','RECEIPT') AND p_classification='CUSTOMER_ADVANCE'
      THEN jsonb_build_object('debit_key','cash_account','credit_key','customer_advance','debit_role','CASH_ACCOUNT','credit_role','CUSTOMER_ADVANCE')
    WHEN p_source_type='ALLOCATION' AND p_classification='SETTLEMENT'
      THEN jsonb_build_object('debit_key','customer_advance','credit_key','ar_control','debit_role','CUSTOMER_ADVANCE','credit_role','AR_CONTROL')
    WHEN p_source_type='ALLOCATION_REVERSAL' AND p_classification='REVERSAL'
      THEN jsonb_build_object('debit_key','ar_control','credit_key','customer_advance','debit_role','AR_CONTROL','credit_role','CUSTOMER_ADVANCE')
    WHEN p_source_type='RECEIPT_REVERSAL' AND p_classification='REVERSAL'
      THEN jsonb_build_object('debit_key','customer_advance','credit_key','cash_account','debit_role','CUSTOMER_ADVANCE','credit_role','CASH_ACCOUNT')
    WHEN p_source_type='CREDIT_ADJUSTMENT' AND p_classification='CUSTOMER_LIABILITY'
      THEN jsonb_build_object('debit_key','contract_liability','credit_key','customer_advance','debit_role','CONTRACT_LIABILITY','credit_role','CUSTOMER_ADVANCE')
    WHEN p_source_type='CREDIT_ADJUSTMENT' AND p_classification='UNCONDITIONAL_CONTRACT_LIABILITY'
      THEN jsonb_build_object('debit_key','contract_liability','credit_key','ar_control','debit_role','CONTRACT_LIABILITY','credit_role','AR_CONTROL')
    WHEN p_source_type='CREDIT_ADJUSTMENT_REVERSAL' AND p_classification='REVERSAL' THEN (
      SELECT CASE original_version.classification
        WHEN 'CUSTOMER_LIABILITY'
          THEN jsonb_build_object('debit_key','customer_advance','credit_key','contract_liability','debit_role','CUSTOMER_ADVANCE','credit_role','CONTRACT_LIABILITY')
        WHEN 'UNCONDITIONAL_CONTRACT_LIABILITY'
          THEN jsonb_build_object('debit_key','ar_control','credit_key','contract_liability','debit_role','AR_CONTROL','credit_role','CONTRACT_LIABILITY')
        ELSE NULL::jsonb END
      FROM public.accounting_ar_bridge_events original_event
      JOIN public.accounting_ar_bridge_event_versions original_version
        ON original_version.profile_id=original_event.profile_id AND original_version.event_id=original_event.id
      JOIN public.accounting_ar_bridge_journal_links original_link
        ON original_link.profile_id=original_version.profile_id AND original_link.event_id=original_version.event_id
        AND original_link.event_version=original_version.version
      JOIN public.accounting_source_effects original_effect
        ON original_effect.profile_id=original_link.profile_id AND original_effect.id=original_link.source_effect_id
        AND original_effect.status='POSTED'
      WHERE original_event.source_type='CREDIT_ADJUSTMENT'
        AND original_event.source_record_id=(p_source_snapshot->>'reverses_source_record_id')::uuid
      LIMIT 1)
    WHEN p_source_type='CREDIT_APPLICATION' AND p_classification='SETTLEMENT'
      THEN jsonb_build_object('debit_key','customer_advance','credit_key','ar_control','debit_role','CUSTOMER_ADVANCE','credit_role','AR_CONTROL')
    WHEN p_source_type='CREDIT_APPLICATION_REVERSAL' AND p_classification='REVERSAL'
      THEN jsonb_build_object('debit_key','ar_control','credit_key','customer_advance','debit_role','AR_CONTROL','credit_role','CUSTOMER_ADVANCE')
    WHEN p_source_type='REFUND' AND p_classification='CUSTOMER_LIABILITY_REFUND'
      THEN jsonb_build_object('debit_key','customer_advance','credit_key','cash_account','debit_role','CUSTOMER_ADVANCE','credit_role','CASH_ACCOUNT')
    WHEN p_source_type='REFUND_REVERSAL' AND p_classification='REVERSAL'
      THEN jsonb_build_object('debit_key','cash_account','credit_key','customer_advance','debit_role','CASH_ACCOUNT','credit_role','CUSTOMER_ADVANCE')
    ELSE NULL::jsonb END;
$w10d_posting_spec_v2$;

CREATE OR REPLACE FUNCTION public.accounting_ar_bridge_account_authorized(
  p_profile_id uuid,p_mapping_key text,p_account_id uuid,p_account_version integer
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10d_account_authorized_v2$
  SELECT EXISTS(
    SELECT 1 FROM public.accounting_account_versions av
    WHERE av.profile_id=p_profile_id AND av.account_id=p_account_id AND av.version=p_account_version
      AND av.account_kind='POSTING' AND av.is_active
      AND NOT EXISTS(SELECT 1 FROM public.accounting_accounts child
        JOIN public.accounting_account_versions cv ON cv.profile_id=child.profile_id
          AND cv.account_id=child.id AND cv.version=child.current_version
        WHERE child.profile_id=p_profile_id AND cv.parent_account_id=av.account_id)
      AND CASE upper(p_mapping_key)
        WHEN 'AR_CONTROL' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND av.is_protected AND av.control_classification='ACCOUNTS_RECEIVABLE'
        WHEN 'CUSTOMER_ADVANCE' THEN av.account_type='LIABILITY' AND av.normal_balance='CREDIT'
          AND av.is_protected AND av.control_classification='CUSTOMER_ADVANCE'
        WHEN 'CONTRACT_LIABILITY' THEN av.account_type='LIABILITY' AND av.normal_balance='CREDIT'
          AND av.is_protected AND av.control_classification='CONTRACT_LIABILITY'
        WHEN 'CASH_ACCOUNT' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND ((av.is_protected AND av.control_classification='CASH_ACCOUNTABILITY')
            OR (NOT av.is_protected AND av.control_classification='NONE'))
        WHEN 'CONTRACT_ASSET' THEN av.account_type='ASSET' AND av.normal_balance='DEBIT'
          AND NOT av.is_protected AND av.control_classification='NONE'
        ELSE false END);
$w10d_account_authorized_v2$;

CREATE OR REPLACE FUNCTION public.accounting_ar_bridge_source_effect_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $w10d_effect_link_v2$
DECLARE
  v_event public.accounting_ar_bridge_events%ROWTYPE;
  v_version public.accounting_ar_bridge_event_versions%ROWTYPE;
  v_spec jsonb; v_journal public.accounting_journal_versions%ROWTYPE;
  v_line record; v_role text; v_count integer:=0;
BEGIN
  IF NEW.source_domain<>'AR_BRIDGE' THEN RETURN NEW; END IF;
  SELECT e.* INTO v_event FROM public.accounting_ar_bridge_events e
  WHERE e.profile_id=NEW.profile_id AND e.source_record_key=NEW.source_record_key
    AND e.economic_event_key=NEW.economic_event_key;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_EVENT_NOT_FOUND'; END IF;
  SELECT ev.* INTO v_version FROM public.accounting_ar_bridge_event_versions ev
  WHERE ev.profile_id=v_event.profile_id AND ev.event_id=v_event.id
    AND ev.version=v_event.current_version AND ev.status='READY';
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_EVENT_NOT_READY'; END IF;
  IF public.accounting_ar_bridge_source_snapshot(v_event.source_type,v_event.source_record_id)
       IS DISTINCT FROM v_version.source_snapshot
     OR NEW.payload_fingerprint IS DISTINCT FROM (
       SELECT jv.payload_fingerprint FROM public.accounting_journal_versions jv
       WHERE jv.profile_id=NEW.profile_id AND jv.journal_id=NEW.journal_id AND jv.version=NEW.journal_version) THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_SOURCE_CONFLICT';
  END IF;
  SELECT jv.* INTO v_journal FROM public.accounting_journal_versions jv
  WHERE jv.profile_id=NEW.profile_id AND jv.journal_id=NEW.journal_id
    AND jv.version=NEW.journal_version AND jv.source_domain='AR_BRIDGE'
    AND jv.source_record_key=NEW.source_record_key AND jv.economic_event_key=NEW.economic_event_key
    AND jv.posting_purpose='ar_bridge';
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_JOURNAL_LINK_INVALID'; END IF;
  v_spec:=public.accounting_ar_bridge_posting_spec(v_event.source_type,v_version.classification,v_version.source_snapshot);
  IF v_spec IS NULL THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_TREATMENT_HELD'; END IF;
  SELECT count(*) INTO v_count FROM public.accounting_journal_line_versions l
  WHERE l.profile_id=NEW.profile_id AND l.journal_id=NEW.journal_id AND l.journal_version=NEW.journal_version;
  IF TG_OP='UPDATE' THEN
    IF OLD.status<>'PREPARED' OR NEW.status<>'POSTED' THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_EFFECT_TRANSITION_INVALID';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.accounting_ar_bridge_journal_links l
       WHERE l.profile_id=NEW.profile_id AND l.journal_id=NEW.journal_id
         AND l.prepared_version=NEW.journal_version-1 AND l.source_effect_id=NEW.id) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_JOURNAL_LINK_MISSING';
    END IF;
    RETURN NEW;
  END IF;
  IF v_count<>2 OR NEW.status<>'PREPARED' THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_JOURNAL_SHAPE_INVALID';
  END IF;
  INSERT INTO public.accounting_ar_bridge_journal_links(
    profile_id,event_id,event_version,journal_id,prepared_version,source_effect_id,
    customer_id,service_id,invoice_id,source_type,source_record_id
  ) VALUES(NEW.profile_id,v_event.id,v_version.version,NEW.journal_id,NEW.journal_version,NEW.id,
    v_version.customer_id,v_version.service_id,v_version.invoice_id,v_event.source_type,v_event.source_record_id);
  FOR v_line IN
    SELECT l.* FROM public.accounting_journal_line_versions l
    WHERE l.profile_id=NEW.profile_id AND l.journal_id=NEW.journal_id AND l.journal_version=NEW.journal_version
    ORDER BY l.line_number
  LOOP
    v_role:=CASE upper(v_line.mapping_key)
      WHEN 'AR_CONTROL' THEN 'AR_CONTROL'
      WHEN 'CUSTOMER_ADVANCE' THEN 'CUSTOMER_ADVANCE'
      WHEN 'CASH_ACCOUNT' THEN 'CASH_ACCOUNT'
      WHEN 'CONTRACT_LIABILITY' THEN 'CONTRACT_LIABILITY'
      WHEN 'CONTRACT_ASSET' THEN 'CONTRACT_ASSET'
      ELSE NULL END;
    IF v_role IS NULL OR NOT public.accounting_ar_bridge_account_authorized(
        NEW.profile_id,v_role,v_line.account_id,v_line.account_version) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_AR_BRIDGE_ACCOUNT_INVALID';
    END IF;
    INSERT INTO public.accounting_ar_bridge_journal_lines(
      profile_id,event_id,event_version,journal_id,journal_version,line_number,party_role,
      customer_id,service_id,invoice_id,source_type,source_record_id,account_id,account_version,amount_halalah,side
    ) VALUES(NEW.profile_id,v_event.id,v_version.version,NEW.journal_id,NEW.journal_version,
      v_line.line_number,v_role,v_version.customer_id,v_version.service_id,v_version.invoice_id,
      v_event.source_type,v_event.source_record_id,v_line.account_id,v_line.account_version,
      v_line.amount_halalah,v_line.side);
  END LOOP;
  RETURN NEW;
END;
$w10d_effect_link_v2$;

REVOKE ALL ON FUNCTION public.accounting_ar_bridge_posting_spec(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_account_authorized(uuid,text,uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.accounting_ar_bridge_source_effect_link() FROM PUBLIC,anon,authenticated,service_role;

COMMIT;
