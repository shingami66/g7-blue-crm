-- W10H additive correction: Expense debit balances reduce current-year earnings.
BEGIN;

DO $w10h_current_result_sign_repair$
DECLARE
  v_signature constant regprocedure :=
    'public.get_w10h_accounting_report(uuid,text,date,date,timestamptz,uuid,uuid,integer,integer)'::regprocedure;
  v_definition text;
  v_old_expression constant text := $old$
        ELSE CASE WHEN l.side='DEBIT' THEN l.amount_halalah::numeric ELSE -l.amount_halalah::numeric END END),0) result$old$;
  v_new_expression constant text := $new$
        ELSE CASE WHEN l.side='DEBIT' THEN -l.amount_halalah::numeric ELSE l.amount_halalah::numeric END END),0) result$new$;
  v_without_old text;
BEGIN
  v_definition:=pg_get_functiondef(v_signature);
  v_without_old:=replace(v_definition,v_old_expression,'');
  IF v_without_old=v_definition
     OR position(v_old_expression IN v_without_old)>0
     OR position(v_new_expression IN v_definition)>0 THEN
    RAISE EXCEPTION 'W10H current-result repair expected exactly one uncorrected Expense sign expression';
  END IF;
  EXECUTE replace(v_definition,v_old_expression,v_new_expression);
END;
$w10h_current_result_sign_repair$;

DO $w10h_current_result_sign_verify$
DECLARE
  v_definition text;
  v_corrected_expression constant text := $fixed$
        ELSE CASE WHEN l.side='DEBIT' THEN -l.amount_halalah::numeric ELSE l.amount_halalah::numeric END END),0) result$fixed$;
  v_without_fixed text;
BEGIN
  v_definition:=pg_get_functiondef(
    'public.get_w10h_accounting_report(uuid,text,date,date,timestamptz,uuid,uuid,integer,integer)'::regprocedure);
  v_without_fixed:=replace(v_definition,v_corrected_expression,'');
  IF v_without_fixed=v_definition OR position(v_corrected_expression IN v_without_fixed)>0 THEN
    RAISE EXCEPTION 'W10H current-result sign correction was not installed exactly once';
  END IF;
END;
$w10h_current_result_sign_verify$;

COMMIT;
