-- W8A targeted correction: reconstruct historical cost and authority from
-- effective source events, and classify company-funded direct expenses as paid.
BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.get_event_costing(uuid,date)') IS NULL THEN
        RAISE EXCEPTION 'W8A preflight: get_event_costing(uuid,date) is missing';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_event_costing(
    p_service_id uuid,
    p_as_of_date date DEFAULT (timezone('Asia/Riyadh', transaction_timestamp()))::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    IF p_service_id IS NULL OR p_as_of_date IS NULL THEN
        RETURN jsonb_build_object('status', 'UNAVAILABLE', 'reason_codes', jsonb_build_array('invalid_request'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = p_service_id AND deleted_at IS NULL) THEN
        RETURN jsonb_build_object('status', 'UNAVAILABLE', 'reason_codes', jsonb_build_array('service_not_found'));
    END IF;

    WITH
    asof_budget AS (
        SELECT b.* FROM public.event_cost_budgets b
        WHERE b.service_id = p_service_id
          AND (timezone('Asia/Riyadh', b.approved_at))::date <= p_as_of_date
        ORDER BY b.approved_at DESC, b.budget_version DESC LIMIT 1
    ),
    asof_etc AS (
        SELECT f.* FROM public.event_cost_etc_forecasts f
        WHERE f.service_id = p_service_id
          AND f.forecast_date <= p_as_of_date
          AND (timezone('Asia/Riyadh', f.recorded_at))::date <= p_as_of_date
        ORDER BY f.forecast_date DESC, f.recorded_at DESC, f.forecast_version DESC LIMIT 1
    ),
    abs_history AS (
        SELECT count(*) > 0 AS has_history
        FROM public.approved_billing_scopes s WHERE s.service_id = p_service_id
    ),
    commercial AS (
        SELECT s.accepted_grand_total AS amount, 'approved_billing_scope'::text AS source_type,
               s.id AS source_id, s.scope_version::text AS source_version
        FROM public.approved_billing_scopes s
        WHERE s.service_id = p_service_id
          AND s.approved_at IS NOT NULL
          AND (timezone('Asia/Riyadh', s.approved_at))::date <= p_as_of_date
          AND (s.superseded_at IS NULL OR (timezone('Asia/Riyadh', s.superseded_at))::date > p_as_of_date)
          AND (s.voided_at IS NULL OR (timezone('Asia/Riyadh', s.voided_at))::date > p_as_of_date)
        ORDER BY s.approved_at DESC, s.scope_version DESC, s.id ASC LIMIT 1
    ),
    commercial_fallback AS (
        SELECT q.grand_total AS amount, 'approved_quotation_legacy'::text AS source_type,
               q.id AS source_id, q.quotation_number AS source_version
        FROM public.quotations q
        CROSS JOIN abs_history h
        LEFT JOIN LATERAL (
            SELECT al."timestamp" AS approved_at
            FROM public.audit_logs al
            WHERE al.entity_type = 'quotation'
              AND al.entity_id = q.id
              AND al.action = 'status_change'
              AND al.details->>'event_type' = 'quotation_approved'
            ORDER BY al."timestamp" ASC, al.id ASC LIMIT 1
        ) approval ON true
        WHERE q.service_id = p_service_id
          AND q.status = 'approved'
          AND q.is_deleted = false
          AND h.has_history = false
          AND (q.superseded_at IS NULL OR (timezone('Asia/Riyadh', q.superseded_at))::date > p_as_of_date)
          AND (timezone('Asia/Riyadh', COALESCE(approval.approved_at, q.created_at)))::date <= p_as_of_date
        ORDER BY COALESCE(approval.approved_at, q.created_at) DESC, q.created_at DESC, q.id ASC
        LIMIT 1
    ),
    commercial_authority AS (
        SELECT * FROM commercial
        UNION ALL
        SELECT * FROM commercial_fallback WHERE NOT EXISTS (SELECT 1 FROM commercial)
    ),
    receipt_asof AS (
        SELECT r.id, r.commitment_id,
               CASE
                   WHEN future_correction.id IS NOT NULL THEN
                       CASE
                           WHEN future_correction.prior_decision_at IS NULL
                             OR (timezone('Asia/Riyadh', future_correction.prior_decision_at))::date > p_as_of_date
                           THEN 'PENDING'
                           ELSE future_correction.prior_acceptance_status
                       END
                   WHEN past_correction.id IS NOT NULL THEN past_correction.corrected_acceptance_status
                   WHEN r.reviewed_at IS NOT NULL
                     AND (timezone('Asia/Riyadh', r.reviewed_at))::date > p_as_of_date
                   THEN 'PENDING'
                   ELSE r.acceptance_status
               END AS acceptance_status_asof,
               CASE
                   WHEN future_correction.id IS NOT NULL THEN future_correction.prior_received_amount
                   WHEN past_correction.id IS NOT NULL THEN past_correction.corrected_received_amount
                   ELSE r.received_amount
        END AS received_amount_asof
        FROM public.service_receipts r
        JOIN public.approved_commitments commitment
          ON commitment.id = r.commitment_id
         AND commitment.service_id = p_service_id
         AND (timezone('Asia/Riyadh', commitment.approved_at))::date <= p_as_of_date
        LEFT JOIN LATERAL (
            SELECT c.* FROM public.service_receipt_corrections c
            WHERE c.receipt_id = r.id
              AND (timezone('Asia/Riyadh', c.corrected_at))::date > p_as_of_date
            ORDER BY c.corrected_at ASC, c.correction_number ASC, c.id ASC LIMIT 1
        ) future_correction ON true
        LEFT JOIN LATERAL (
            SELECT c.* FROM public.service_receipt_corrections c
            WHERE c.receipt_id = r.id
              AND (timezone('Asia/Riyadh', c.corrected_at))::date <= p_as_of_date
            ORDER BY c.corrected_at DESC, c.correction_number DESC, c.id DESC LIMIT 1
        ) past_correction ON true
        WHERE r.service_id = p_service_id
          AND r.performance_date <= p_as_of_date
          AND (timezone('Asia/Riyadh', r.submitted_at))::date <= p_as_of_date
    ),
    receipt_totals AS (
        SELECT r.commitment_id,
               COALESCE(sum(r.received_amount_asof) FILTER (
                   WHERE r.acceptance_status_asof IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS')
               ), 0)::numeric AS accepted_amount,
               COALESCE(sum(r.received_amount_asof) FILTER (
                   WHERE r.acceptance_status_asof = 'PENDING'
               ), 0)::numeric AS pending_amount
        FROM receipt_asof r
        GROUP BY r.commitment_id
    ),
    commitment_rows AS (
        SELECT c.id, c.service_id, c.approved_at,
               c.original_approved_amount + COALESCE(amendments.total_delta, 0)::numeric AS authorized_amount,
               COALESCE(r.accepted_amount, 0)::numeric AS accepted_amount,
               COALESCE(r.pending_amount, 0)::numeric AS pending_amount,
               CASE
                   WHEN c.cancelled_at IS NOT NULL
                     AND (timezone('Asia/Riyadh', c.cancelled_at))::date <= p_as_of_date THEN 'cancelled'
                   WHEN c.closed_at IS NOT NULL
                     AND (timezone('Asia/Riyadh', c.closed_at))::date <= p_as_of_date THEN 'closed'
                   ELSE 'open'
               END AS status,
               CASE
                   WHEN c.cancelled_at IS NOT NULL
                     AND (timezone('Asia/Riyadh', c.cancelled_at))::date <= p_as_of_date THEN 0::numeric
                   WHEN c.closed_at IS NOT NULL
                     AND (timezone('Asia/Riyadh', c.closed_at))::date <= p_as_of_date THEN 0::numeric
                   ELSE c.original_approved_amount + COALESCE(amendments.total_delta, 0)::numeric
                        - COALESCE(r.accepted_amount, 0)::numeric
                        - COALESCE(r.pending_amount, 0)::numeric
               END AS open_commitment_amount
        FROM public.approved_commitments c
        LEFT JOIN LATERAL (
            SELECT sum(am.amount_delta) AS total_delta
            FROM public.approved_commitment_amendments am
            WHERE am.commitment_id = c.id
              AND (timezone('Asia/Riyadh', am.approved_at))::date <= p_as_of_date
        ) amendments ON true
        LEFT JOIN receipt_totals r ON r.commitment_id = c.id
        WHERE c.service_id = p_service_id
          AND (timezone('Asia/Riyadh', c.approved_at))::date <= p_as_of_date
          AND NOT (
              c.cancelled_at IS NOT NULL
              AND (timezone('Asia/Riyadh', c.cancelled_at))::date <= p_as_of_date
          )
    ),
    commitment_totals AS (
        SELECT count(*)::integer AS source_count,
               COALESCE(sum(authorized_amount), 0)::numeric AS approved_commitment,
               COALESCE(sum(accepted_amount), 0)::numeric AS accepted_commitment,
               COALESCE(sum(pending_amount), 0)::numeric AS pending_commitment,
               COALESCE(sum(open_commitment_amount), 0)::numeric AS open_commitment
        FROM commitment_rows
    ),
    supplier_payment_events AS (
        SELECT p.id, p.payment_number, p.supplier_bill_id, p.service_id,
               p.payment_date, p.amount,
               EXISTS (
                   SELECT 1 FROM public.supplier_payment_reversals r
                   WHERE r.supplier_payment_id = p.id
                     AND (timezone('Asia/Riyadh', r.reversed_at))::date <= p_as_of_date
               ) AS reversed
        FROM public.supplier_payments p
        WHERE p.service_id = p_service_id
          AND p.payment_date <= p_as_of_date
          AND (timezone('Asia/Riyadh', p.recorded_at))::date <= p_as_of_date
    ),
    supplier_payment_totals AS (
        SELECT p.supplier_bill_id,
               COALESCE(sum(p.amount) FILTER (WHERE NOT p.reversed), 0)::numeric AS paid_amount
        FROM supplier_payment_events p
        GROUP BY p.supplier_bill_id
    ),
    advance_allocation_events AS (
        SELECT a.id, a.allocation_number, a.supplier_bill_id, a.allocated_at, a.amount,
               EXISTS (
                   SELECT 1 FROM public.supplier_advance_allocation_reversals r
                   WHERE r.supplier_advance_allocation_id = a.id
                     AND (timezone('Asia/Riyadh', r.corrected_at))::date <= p_as_of_date
               ) AS reversed
        FROM public.supplier_advance_allocations a
        JOIN public.supplier_bills b ON b.id = a.supplier_bill_id
        WHERE b.service_id = p_service_id
          AND (timezone('Asia/Riyadh', a.allocated_at))::date <= p_as_of_date
    ),
    advance_allocation_totals AS (
        SELECT a.supplier_bill_id,
               COALESCE(sum(a.amount) FILTER (WHERE NOT a.reversed), 0)::numeric AS advance_allocated_amount
        FROM advance_allocation_events a
        GROUP BY a.supplier_bill_id
    ),
    bill_rows AS (
        SELECT b.id, b.bill_number, b.invoice_date, b.due_date, b.total_amount,
               CASE
                   WHEN b.approved_at IS NOT NULL
                     AND (timezone('Asia/Riyadh', b.approved_at))::date <= p_as_of_date THEN 'approved'
                   ELSE 'pending'
               END AS status,
               b.approved_at, b.commitment_id,
               COALESCE(p.paid_amount, 0)::numeric AS paid_amount,
               COALESCE(a.advance_allocated_amount, 0)::numeric AS advance_allocated_amount
        FROM public.supplier_bills b
        LEFT JOIN supplier_payment_totals p ON p.supplier_bill_id = b.id
        LEFT JOIN advance_allocation_totals a ON a.supplier_bill_id = b.id
        WHERE b.service_id = p_service_id
          AND b.invoice_date <= p_as_of_date
          AND (timezone('Asia/Riyadh', b.recorded_at))::date <= p_as_of_date
    ),
    bill_totals AS (
        SELECT count(*) FILTER (WHERE status = 'approved')::integer AS approved_count,
               count(*) FILTER (WHERE status = 'pending')::integer AS pending_count,
               COALESCE(sum(total_amount) FILTER (WHERE status = 'approved'), 0)::numeric AS actual_cost,
               COALESCE(sum(least(total_amount, paid_amount + advance_allocated_amount))
                   FILTER (WHERE status = 'approved'), 0)::numeric AS paid_cost
        FROM bill_rows
    ),
    expense_rows AS (
        SELECT e.id, e.expense_number, e.expense_date, e.amount,
               expense_status.status,
               e.approved_at,
               CASE
                   WHEN expense_status.status = 'approved'
                    AND e.origin_type = 'company_direct' AND e.payment_method = 'company_funds'
                   THEN e.amount
                   WHEN expense_status.status <> 'approved' OR expense_status.status IS NULL
                   THEN 0::numeric
                   ELSE COALESCE(r.reimbursed_amount, 0)
                      + COALESCE(a.advance_allocated_amount, 0)
                      + COALESCE(p.petty_cash_allocated_amount, 0)
               END AS paid_amount
        FROM public.expenses e
        LEFT JOIN (
            SELECT ers.expense_id, COALESCE(sum(ers.amount), 0)::numeric AS reimbursed_amount
            FROM public.expense_reimbursement_settlements ers
            JOIN public.expenses source_expense ON source_expense.id = ers.expense_id
            WHERE source_expense.service_id = p_service_id
              AND source_expense.context_type = 'event'
              AND (timezone('Asia/Riyadh', ers.settled_at))::date <= p_as_of_date
            GROUP BY ers.expense_id
        ) r ON r.expense_id = e.id
        LEFT JOIN (
            SELECT caes.expense_id, COALESCE(sum(caes.amount), 0)::numeric AS advance_allocated_amount
            FROM public.cash_advance_expense_settlements caes
            JOIN public.expenses source_expense ON source_expense.id = caes.expense_id
            WHERE source_expense.service_id = p_service_id
              AND source_expense.context_type = 'event'
              AND (timezone('Asia/Riyadh', caes.settled_at))::date <= p_as_of_date
            GROUP BY caes.expense_id
        ) a ON a.expense_id = e.id
        LEFT JOIN (
            SELECT pct.expense_id, COALESCE(sum(pct.amount), 0)::numeric AS petty_cash_allocated_amount
            FROM public.petty_cash_transactions pct
            JOIN public.expenses source_expense ON source_expense.id = pct.expense_id
            WHERE source_expense.service_id = p_service_id
              AND source_expense.context_type = 'event'
              AND pct.transaction_type = 'disbursement'
              AND pct.expense_id IS NOT NULL
              AND (timezone('Asia/Riyadh', pct.recorded_at))::date <= p_as_of_date
            GROUP BY pct.expense_id
        ) p ON p.expense_id = e.id
        LEFT JOIN LATERAL (
            SELECT event_state.status
            FROM (VALUES
                (e.submitted_at, 1, 'submitted'::text),
                (e.approved_at, 2, 'approved'::text),
                (e.rejected_at, 3, 'rejected'::text),
                (e.cancelled_at, 4, 'cancelled'::text)
            ) AS event_state(effective_at, priority, status)
            WHERE event_state.effective_at IS NOT NULL
              AND (timezone('Asia/Riyadh', event_state.effective_at))::date <= p_as_of_date
            ORDER BY event_state.effective_at DESC, event_state.priority DESC
            LIMIT 1
        ) expense_status ON true
        WHERE e.service_id = p_service_id
          AND e.context_type = 'event'
          AND e.submitted_at IS NOT NULL
          AND e.expense_date <= p_as_of_date
          AND (timezone('Asia/Riyadh', e.submitted_at))::date <= p_as_of_date
    ),
    expense_totals AS (
        SELECT count(*) FILTER (WHERE status = 'approved')::integer AS approved_count,
               count(*) FILTER (WHERE status = 'submitted')::integer AS pending_count,
               COALESCE(sum(amount) FILTER (WHERE status = 'approved'), 0)::numeric AS actual_cost,
               COALESCE(sum(least(amount, paid_amount)) FILTER (WHERE status = 'approved'), 0)::numeric AS paid_cost
        FROM expense_rows
    ),
    totals AS (
        SELECT c.approved_commitment, c.accepted_commitment, c.pending_commitment, c.open_commitment,
               c.source_count AS commitment_count,
               b.approved_count AS bill_count, b.pending_count AS pending_bill_count,
               b.actual_cost AS bill_actual_cost, b.paid_cost AS bill_paid_cost,
               e.approved_count AS expense_count, e.pending_count AS pending_expense_count,
               e.actual_cost AS expense_actual_cost, e.paid_cost AS expense_paid_cost,
               ab.base_budget_amount, ab.contingency_amount, ab.approved_budget_cost,
               ae.etc_amount, ca.amount AS commercial_amount,
               ca.source_type AS commercial_source_type, ca.source_id AS commercial_source_id,
               ca.source_version AS commercial_source_version
        FROM commitment_totals c CROSS JOIN bill_totals b CROSS JOIN expense_totals e
        LEFT JOIN asof_budget ab ON true
        LEFT JOIN asof_etc ae ON true
        LEFT JOIN commercial_authority ca ON true
    ),
    calculated AS (
        SELECT t.*,
               round(t.bill_actual_cost + t.expense_actual_cost, 2) AS actual_cost,
               round(t.bill_paid_cost + t.expense_paid_cost, 2) AS paid_cost
        FROM totals t
    )
    SELECT jsonb_build_object(
        'status', CASE WHEN t.base_budget_amount IS NULL OR t.etc_amount IS NULL OR t.commercial_amount IS NULL
                       OR t.pending_bill_count > 0 OR t.pending_expense_count > 0 THEN 'PARTIAL' ELSE 'COMPLETE' END,
        'as_of_date', p_as_of_date,
        'service_id', p_service_id,
        'budget', jsonb_build_object(
            'available', t.base_budget_amount IS NOT NULL,
            'base_budget', t.base_budget_amount,
            'contingency', t.contingency_amount,
            'approved_budget_cost', t.approved_budget_cost
        ),
        'approved_commitment', t.approved_commitment,
        'accepted_commitment', t.accepted_commitment,
        'pending_commitment', t.pending_commitment,
        'open_commitment', t.open_commitment,
        'actual_cost', t.actual_cost,
        'paid_cost', t.paid_cost,
        'outstanding_cost', greatest(t.actual_cost - t.paid_cost, 0),
        'etc', t.etc_amount,
        'eac', CASE WHEN t.etc_amount IS NULL THEN NULL ELSE round(t.actual_cost + t.etc_amount, 2) END,
        'net_approved_commercial_value', t.commercial_amount,
        'forecast_margin', CASE WHEN t.etc_amount IS NULL OR t.commercial_amount IS NULL THEN NULL
                                ELSE round(t.commercial_amount - (t.actual_cost + t.etc_amount), 2) END,
        'commercial_authority', jsonb_build_object(
            'source_type', t.commercial_source_type, 'source_id', t.commercial_source_id,
            'source_version', t.commercial_source_version
        ),
        'completeness', jsonb_build_object(
            'status', CASE WHEN t.base_budget_amount IS NULL OR t.etc_amount IS NULL OR t.commercial_amount IS NULL
                           OR t.pending_bill_count > 0 OR t.pending_expense_count > 0 THEN 'PARTIAL' ELSE 'COMPLETE' END,
            'reason_codes', to_jsonb(array_remove(ARRAY[
                CASE WHEN t.base_budget_amount IS NULL THEN 'budget_unavailable' END,
                CASE WHEN t.etc_amount IS NULL THEN 'etc_unavailable' END,
                CASE WHEN t.commercial_amount IS NULL THEN 'commercial_authority_unavailable' END,
                CASE WHEN t.pending_bill_count > 0 THEN 'pending_supplier_bills' END,
                CASE WHEN t.pending_expense_count > 0 THEN 'pending_event_expenses' END
            ], NULL))
        ),
        'source_counts', jsonb_build_object(
            'commitments', t.commitment_count,
            'supplier_bills_approved', t.bill_count,
            'supplier_bills_pending', t.pending_bill_count,
            'event_expenses_approved', t.expense_count,
            'event_expenses_pending', t.pending_expense_count
        ),
        'drill', jsonb_build_object(
            'budget_versions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', b.id, 'version', b.budget_version, 'base_budget', b.base_budget_amount,
                'contingency', b.contingency_amount, 'approved_budget_cost', b.approved_budget_cost,
                'approved_at', b.approved_at, 'superseded_at', b.superseded_at
            ) ORDER BY b.budget_version DESC)
              FROM (SELECT * FROM public.event_cost_budgets
                    WHERE service_id = p_service_id
                      AND (timezone('Asia/Riyadh', approved_at))::date <= p_as_of_date
                    ORDER BY budget_version DESC LIMIT 50) b), '[]'::jsonb),
            'commitments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', c.id, 'authorized_amount', c.authorized_amount, 'accepted_amount', c.accepted_amount,
                'pending_amount', c.pending_amount, 'open_commitment_amount', c.open_commitment_amount,
                'status', c.status, 'approved_at', c.approved_at
            ) ORDER BY c.approved_at DESC, c.id ASC)
              FROM (SELECT * FROM commitment_rows ORDER BY approved_at DESC, id ASC LIMIT 50) c), '[]'::jsonb),
            'supplier_bills', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', b.id, 'bill_number', b.bill_number, 'invoice_date', b.invoice_date,
                'total_amount', b.total_amount, 'paid_amount', least(b.total_amount, b.paid_amount + b.advance_allocated_amount),
                'outstanding_amount', greatest(b.total_amount - b.paid_amount - b.advance_allocated_amount, 0), 'status', b.status
            ) ORDER BY b.invoice_date DESC, b.id ASC)
              FROM (SELECT * FROM bill_rows ORDER BY invoice_date DESC, id ASC LIMIT 50) b), '[]'::jsonb),
            'event_expenses', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', e.id, 'expense_number', e.expense_number, 'expense_date', e.expense_date,
                'amount', e.amount, 'paid_amount', least(e.amount, e.paid_amount),
                'outstanding_amount', greatest(e.amount - e.paid_amount, 0), 'status', e.status
            ) ORDER BY e.expense_date DESC, e.id ASC)
              FROM (SELECT * FROM expense_rows ORDER BY expense_date DESC, id ASC LIMIT 50) e), '[]'::jsonb),
            'supplier_payments', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', p.id, 'payment_number', p.payment_number, 'supplier_bill_id', p.supplier_bill_id,
                'payment_date', p.payment_date, 'amount', p.amount, 'reversed', p.reversed
            ) ORDER BY p.payment_date DESC, p.payment_number DESC, p.id ASC)
              FROM (SELECT * FROM supplier_payment_events
                    ORDER BY payment_date DESC, payment_number DESC, id ASC LIMIT 50) p), '[]'::jsonb),
            'advance_allocations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', a.id, 'allocation_number', a.allocation_number, 'supplier_bill_id', a.supplier_bill_id,
                'allocated_at', a.allocated_at, 'amount', a.amount, 'reversed', a.reversed
            ) ORDER BY a.allocated_at DESC, a.allocation_number DESC, a.id ASC)
              FROM (SELECT * FROM advance_allocation_events
                    ORDER BY allocated_at DESC, allocation_number DESC, id ASC LIMIT 50) a), '[]'::jsonb),
            'etc_versions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'id', f.id, 'version', f.forecast_version, 'etc_amount', f.etc_amount,
                'forecast_date', f.forecast_date, 'recorded_at', f.recorded_at, 'superseded_at', f.superseded_at
            ) ORDER BY f.forecast_date DESC, f.forecast_version DESC)
              FROM (SELECT * FROM public.event_cost_etc_forecasts
                    WHERE service_id = p_service_id
                      AND forecast_date <= p_as_of_date
                      AND (timezone('Asia/Riyadh', recorded_at))::date <= p_as_of_date
                    ORDER BY forecast_date DESC, forecast_version DESC LIMIT 50) f), '[]'::jsonb)
        )
    ) INTO v_result
    FROM calculated t;

    RETURN COALESCE(v_result, jsonb_build_object('status', 'UNAVAILABLE', 'reason_codes', jsonb_build_array('source_unavailable')));
END;
$$;

REVOKE ALL ON FUNCTION public.get_event_costing(uuid,date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_costing(uuid,date) TO service_role;

COMMENT ON FUNCTION public.get_event_costing(uuid,date) IS
    'Bounded service-scoped managerial Event Costing read model reconstructed from effective source events in Asia/Riyadh business-date order; not accounting profit.';

COMMIT;
