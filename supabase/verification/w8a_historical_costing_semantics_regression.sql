-- Read-only W8A DEV regression against the owner-authorized SVC-2026-0001 fixture.
-- Run after 20260922210000_w8a_historical_costing_semantics_repair is applied.
DO $$
DECLARE
    v_service_id uuid;
    v_before_receipt jsonb;
    v_after_receipt jsonb;
    v_before_second_commitment jsonb;
    v_before_scope_supersession jsonb;
    v_after_scope_supersession jsonb;
    v_before_future_expense jsonb;
    v_current jsonb;
BEGIN
    SELECT s.id INTO STRICT v_service_id
    FROM public.services s
    WHERE s.service_number = 'SVC-2026-0001'
      AND s.deleted_at IS NULL;

    v_before_receipt := public.get_event_costing(v_service_id, '2026-09-12'::date);
    v_after_receipt := public.get_event_costing(v_service_id, '2026-09-13'::date);
    v_before_second_commitment := public.get_event_costing(v_service_id, '2026-09-15'::date);
    v_before_scope_supersession := public.get_event_costing(v_service_id, '2026-09-19'::date);
    v_after_scope_supersession := public.get_event_costing(v_service_id, '2026-09-20'::date);
    v_before_future_expense := public.get_event_costing(v_service_id, '2026-09-21'::date);
    v_current := public.get_event_costing(v_service_id, '2026-09-22'::date);

    IF (v_before_receipt->>'accepted_commitment')::numeric IS DISTINCT FROM 0::numeric
       OR (v_before_receipt->>'open_commitment')::numeric IS DISTINCT FROM 10000::numeric THEN
        RAISE EXCEPTION 'W8A regression: receipt submitted/reviewed on Sep 13 affected Sep 12';
    END IF;
    IF (v_after_receipt->>'accepted_commitment')::numeric IS DISTINCT FROM 10000::numeric
       OR (v_after_receipt->>'open_commitment')::numeric IS DISTINCT FROM 0::numeric THEN
        RAISE EXCEPTION 'W8A regression: accepted Sep 13 receipt was not reflected as of Sep 13';
    END IF;
    IF (v_before_second_commitment->>'approved_commitment')::numeric IS DISTINCT FROM 10000::numeric
       OR (v_before_second_commitment->>'accepted_commitment')::numeric IS DISTINCT FROM 10000::numeric
       OR (v_before_second_commitment->>'open_commitment')::numeric IS DISTINCT FROM 0::numeric THEN
        RAISE EXCEPTION 'W8A regression: commitment approved Sep 16 affected Sep 15';
    END IF;
    IF v_before_scope_supersession->'commercial_authority'->>'source_version' IS DISTINCT FROM '1'
       OR v_after_scope_supersession->'commercial_authority'->>'source_version' IS DISTINCT FROM '2' THEN
        RAISE EXCEPTION 'W8A regression: Approved Billing Scope supersession did not preserve the Sep 19/20 authority boundary';
    END IF;
    IF (v_before_future_expense->'source_counts'->>'event_expenses_pending')::integer IS DISTINCT FROM 0
       OR EXISTS (
           SELECT 1
           FROM jsonb_array_elements(v_before_future_expense->'drill'->'event_expenses') e
           WHERE e->>'expense_number' = 'EXP-2026-0006'
       ) THEN
        RAISE EXCEPTION 'W8A regression: Sep 22 submitted expense affected Sep 21 completeness or detail';
    END IF;
    IF (v_current->>'actual_cost')::numeric IS DISTINCT FROM 10000.01::numeric
       OR (v_current->>'paid_cost')::numeric IS DISTINCT FROM 0.01::numeric
       OR (v_current->>'outstanding_cost')::numeric IS DISTINCT FROM 10000::numeric THEN
        RAISE EXCEPTION 'W8A regression: approved company_direct/company_funds expense is not counted as paid';
    END IF;
    IF (v_current->'source_counts'->>'event_expenses_pending')::integer IS DISTINCT FROM 1 THEN
        RAISE EXCEPTION 'W8A regression: current submitted event expense was not disclosed as pending';
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_current->'drill'->'supplier_payments') p
        WHERE p->>'payment_number' = 'SPAY-2026-0001'
          AND p->>'reversed' = 'true'
    ) THEN
        RAISE EXCEPTION 'W8A regression: same-day supplier payment reversal is not reflected in its historical drill flag';
    END IF;
END;
$$;
