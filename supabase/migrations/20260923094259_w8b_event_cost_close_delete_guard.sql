-- Follow the W8B runtime repair migration so fresh installs create the guard after its dependencies.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_event_cost_authority_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_row jsonb;
    v_relation_id uuid;
    v_old_service_id uuid;
    v_new_service_id uuid;
    v_service_id uuid;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_row := to_jsonb(OLD);
        IF TG_TABLE_NAME = 'approved_commitment_amendments' THEN
            v_relation_id := (v_row ->> 'commitment_id')::uuid;
            SELECT c.service_id INTO v_old_service_id FROM public.approved_commitments c WHERE c.id = v_relation_id;
        ELSIF TG_TABLE_NAME = 'service_receipt_corrections' THEN
            v_relation_id := (v_row ->> 'receipt_id')::uuid;
            SELECT c.service_id INTO v_old_service_id
            FROM public.service_receipts sr
            JOIN public.approved_commitments c ON c.id = sr.commitment_id
            WHERE sr.id = v_relation_id;
        ELSIF TG_TABLE_NAME = 'supplier_advance_authorization_releases' THEN
            v_relation_id := (v_row ->> 'supplier_advance_id')::uuid;
            SELECT a.service_id INTO v_old_service_id FROM public.supplier_advances a WHERE a.id = v_relation_id;
        ELSIF TG_TABLE_NAME = 'expense_evidence_exceptions' THEN
            v_relation_id := (v_row ->> 'expense_id')::uuid;
            SELECT e.service_id INTO v_old_service_id FROM public.expenses e WHERE e.id = v_relation_id;
        ELSE
            v_old_service_id := NULLIF(v_row ->> 'service_id', '')::uuid;
        END IF;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_row := to_jsonb(NEW);
        IF TG_TABLE_NAME = 'approved_commitment_amendments' THEN
            v_relation_id := (v_row ->> 'commitment_id')::uuid;
            SELECT c.service_id INTO v_new_service_id FROM public.approved_commitments c WHERE c.id = v_relation_id;
        ELSIF TG_TABLE_NAME = 'service_receipt_corrections' THEN
            v_relation_id := (v_row ->> 'receipt_id')::uuid;
            SELECT c.service_id INTO v_new_service_id
            FROM public.service_receipts sr
            JOIN public.approved_commitments c ON c.id = sr.commitment_id
            WHERE sr.id = v_relation_id;
        ELSIF TG_TABLE_NAME = 'supplier_advance_authorization_releases' THEN
            v_relation_id := (v_row ->> 'supplier_advance_id')::uuid;
            SELECT a.service_id INTO v_new_service_id FROM public.supplier_advances a WHERE a.id = v_relation_id;
        ELSIF TG_TABLE_NAME = 'expense_evidence_exceptions' THEN
            v_relation_id := (v_row ->> 'expense_id')::uuid;
            SELECT e.service_id INTO v_new_service_id FROM public.expenses e WHERE e.id = v_relation_id;
        ELSE
            v_new_service_id := NULLIF(v_row ->> 'service_id', '')::uuid;
        END IF;
    END IF;

    -- For a row reassignment, acquire service locks in stable UUID order.
    IF v_old_service_id IS NOT NULL
       AND v_new_service_id IS NOT NULL
       AND v_old_service_id IS DISTINCT FROM v_new_service_id
    THEN
        IF v_old_service_id < v_new_service_id THEN
            PERFORM public.assert_event_cost_authority_open(v_old_service_id);
            PERFORM public.assert_event_cost_authority_open(v_new_service_id);
        ELSE
            PERFORM public.assert_event_cost_authority_open(v_new_service_id);
            PERFORM public.assert_event_cost_authority_open(v_old_service_id);
        END IF;
    ELSE
        v_service_id := COALESCE(v_old_service_id, v_new_service_id);
        IF v_service_id IS NOT NULL THEN
            PERFORM public.assert_event_cost_authority_open(v_service_id);
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS a_event_cost_close_budget_guard ON public.event_cost_budgets;
CREATE TRIGGER a_event_cost_close_budget_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.event_cost_budgets
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_etc_guard ON public.event_cost_etc_forecasts;
CREATE TRIGGER a_event_cost_close_etc_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.event_cost_etc_forecasts
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_commitment_guard ON public.approved_commitments;
CREATE TRIGGER a_event_cost_close_commitment_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.approved_commitments
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_commitment_amendment_guard ON public.approved_commitment_amendments;
CREATE TRIGGER a_event_cost_close_commitment_amendment_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.approved_commitment_amendments
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_receipt_guard ON public.service_receipts;
CREATE TRIGGER a_event_cost_close_receipt_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.service_receipts
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_receipt_correction_guard ON public.service_receipt_corrections;
CREATE TRIGGER a_event_cost_close_receipt_correction_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.service_receipt_corrections
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_supplier_bill_guard ON public.supplier_bills;
CREATE TRIGGER a_event_cost_close_supplier_bill_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.supplier_bills
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_expense_guard ON public.expenses;
CREATE TRIGGER a_event_cost_close_expense_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.expenses
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_evidence_exception_guard ON public.expense_evidence_exceptions;
CREATE TRIGGER a_event_cost_close_evidence_exception_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.expense_evidence_exceptions
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_cash_advance_guard ON public.employee_cash_advances;
CREATE TRIGGER a_event_cost_close_cash_advance_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.employee_cash_advances
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_supplier_advance_guard ON public.supplier_advances;
CREATE TRIGGER a_event_cost_close_supplier_advance_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.supplier_advances
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

DROP TRIGGER IF EXISTS a_event_cost_close_supplier_advance_release_guard ON public.supplier_advance_authorization_releases;
CREATE TRIGGER a_event_cost_close_supplier_advance_release_guard
    BEFORE INSERT OR UPDATE OR DELETE ON public.supplier_advance_authorization_releases
    FOR EACH ROW EXECUTE FUNCTION public.guard_event_cost_authority_mutation();

COMMIT;
