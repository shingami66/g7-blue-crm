-- W10B corrective: keep shared identity-trigger field access table-specific.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_accounting_w10b_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public AS $guard_identity$
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_IDENTITY_IMMUTABLE';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.current_version<>0 THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='ACCOUNTING_IDENTITY_INITIAL_VERSION_INVALID';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.profile_id IS DISTINCT FROM NEW.profile_id
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
     OR NEW.current_version<>OLD.current_version+1 THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_IDENTITY_REVISION_INVALID';
  END IF;
  IF TG_TABLE_NAME='accounting_posting_rules' THEN
    IF OLD.rule_code IS DISTINCT FROM NEW.rule_code THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_IDENTITY_IMMUTABLE';
    END IF;
  ELSIF TG_TABLE_NAME='accounting_journals' THEN
    IF OLD.correction_group_id IS DISTINCT FROM NEW.correction_group_id
       OR OLD.reversal_of_journal_id IS DISTINCT FROM NEW.reversal_of_journal_id THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='ACCOUNTING_IDENTITY_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END;
$guard_identity$;

REVOKE ALL ON FUNCTION public.guard_accounting_w10b_identity()
  FROM PUBLIC,anon,authenticated,service_role;

COMMIT;
