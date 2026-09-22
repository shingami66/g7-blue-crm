-- W7C commercial-reduction compatibility repair.
--
-- The applied W7C migration validates that the successor authority is lower,
-- but it must also bind the Internal Credit Adjustment amount to the exact
-- source-to-successor commercial reduction.  This additive trigger closes the
-- gap without rewriting or reapplying the historical W7C migration.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.customer_internal_credit_adjustments') IS NULL
        OR to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regprocedure('public.record_customer_internal_credit_adjustment(uuid,uuid,uuid,numeric,text,text,date,uuid,text,uuid,uuid)') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w7c_commercial_reduction_guard_foundation_missing';
    END IF;

    IF to_regprocedure('public.prevent_w7c_commercial_reduction_mismatch()') IS NOT NULL
        OR EXISTS (
            SELECT 1
            FROM pg_trigger t
            JOIN pg_class c ON c.oid = t.tgrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = 'customer_internal_credit_adjustments'
              AND t.tgname = 'customer_internal_credit_adjustments_commercial_reduction_guard'
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w7c_commercial_reduction_guard_already_exists';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_w7c_commercial_reduction_mismatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_expected_amount numeric(12,2);
BEGIN
    IF NEW.reason_code <> 'customer_scope_reduction' THEN
        RETURN NEW;
    END IF;

    SELECT round(source_scope.accepted_grand_total - successor_scope.accepted_grand_total, 2)
    INTO v_expected_amount
    FROM public.approved_billing_scopes source_scope
    JOIN public.approved_billing_scopes successor_scope
      ON successor_scope.id = NEW.successor_approved_billing_scope_id
     AND successor_scope.service_id = NEW.service_id
    WHERE source_scope.id = NEW.source_approved_billing_scope_id
      AND source_scope.service_id = NEW.service_id;

    IF v_expected_amount IS NULL OR v_expected_amount <> NEW.amount THEN
        RAISE EXCEPTION USING MESSAGE = 'w7c_commercial_reduction_amount_mismatch';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER customer_internal_credit_adjustments_commercial_reduction_guard
    BEFORE INSERT ON public.customer_internal_credit_adjustments
    FOR EACH ROW EXECUTE FUNCTION public.prevent_w7c_commercial_reduction_mismatch();

REVOKE ALL ON FUNCTION public.prevent_w7c_commercial_reduction_mismatch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_w7c_commercial_reduction_mismatch() TO service_role;

COMMENT ON FUNCTION public.prevent_w7c_commercial_reduction_mismatch() IS
    'W7C compatibility guard: a customer-scope reduction credit must equal the linked source-to-successor approved-scope reduction.';

COMMIT;
