-- W7D runtime repair: qualify the detail-page aggregate against the TABLE output name.
-- The original migration is already applied and is intentionally not rewritten.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_accounts_receivable_report(
    p_as_of_date date,
    p_from_date date,
    p_to_date date,
    p_page_size integer,
    p_page_offset integer
)
RETURNS TABLE(
    as_of_date date,
    period_from date,
    period_to date,
    billed_amount numeric,
    collected_cash_amount numeric,
    total_outstanding numeric,
    total_overdue numeric,
    not_due_amount numeric,
    ageing_1_30_amount numeric,
    ageing_31_60_amount numeric,
    ageing_61_90_amount numeric,
    ageing_91_plus_amount numeric,
    detail_total_count bigint,
    detail_rows jsonb,
    outstanding_customer_count bigint,
    outstanding_customer_rows jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF p_as_of_date IS NULL
        OR p_page_size IS NULL OR p_page_size < 1 OR p_page_size > 100
        OR p_page_offset IS NULL OR p_page_offset < 0
        OR (p_from_date IS NOT NULL AND p_to_date IS NOT NULL AND p_from_date > p_to_date)
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w7d_invalid_accounts_receivable_report_input';
    END IF;

    RETURN QUERY
    WITH params AS (
        SELECT
            p_as_of_date AS as_of_date,
            p_from_date AS period_from,
            LEAST(COALESCE(p_to_date, p_as_of_date), p_as_of_date) AS period_to,
            ((p_as_of_date + 1)::timestamp AT TIME ZONE 'Asia/Riyadh') AS cutoff_exclusive
    ), eligible_invoices AS (
        SELECT
            i.id,
            i.invoice_number,
            i.customer_id,
            i.service_id,
            i.date AS issue_date,
            i.due_date,
            i.grand_total::numeric(12,2) AS gross_amount,
            c.customer_number,
            c.company AS customer_name,
            s.service_number,
            s.service_title
        FROM public.invoices i
        LEFT JOIN public.customers c ON c.id = i.customer_id
        LEFT JOIN public.services s ON s.id = i.service_id
        CROSS JOIN params p
        WHERE COALESCE(i.is_deleted, false) = false
          AND i.issued_at IS NOT NULL
          AND i.status NOT IN ('draft', 'cancelled', 'voided')
          AND i.issued_at < p.cutoff_exclusive
    ), adjustment_reversals AS (
        SELECT r.source_credit_adjustment_id, SUM(r.amount)::numeric(12,2) AS reversed_amount
        FROM public.customer_internal_credit_adjustment_reversals r
        CROSS JOIN params p
        WHERE r.effective_date <= p.as_of_date
        GROUP BY r.source_credit_adjustment_id
    ), adjustment_by_invoice AS (
        SELECT c.invoice_id,
            SUM(GREATEST(ROUND(c.amount - COALESCE(r.reversed_amount, 0), 2), 0))::numeric(12,2)
                AS credit_adjustment_amount
        FROM public.customer_internal_credit_adjustments c
        LEFT JOIN adjustment_reversals r ON r.source_credit_adjustment_id = c.id
        JOIN eligible_invoices i ON i.id = c.invoice_id
        CROSS JOIN params p
        WHERE c.effective_date <= p.as_of_date
        GROUP BY c.invoice_id
    ), application_reversals AS (
        SELECT r.source_application_id, SUM(r.amount)::numeric(12,2) AS reversed_amount
        FROM public.customer_credit_application_reversals r
        CROSS JOIN params p
        WHERE r.business_date <= p.as_of_date
        GROUP BY r.source_application_id
    ), application_by_invoice AS (
        SELECT a.target_invoice_id,
            SUM(GREATEST(ROUND(a.amount - COALESCE(r.reversed_amount, 0), 2), 0))::numeric(12,2)
                AS credit_application_amount
        FROM public.customer_credit_applications a
        LEFT JOIN application_reversals r ON r.source_application_id = a.id
        JOIN eligible_invoices i ON i.id = a.target_invoice_id
        CROSS JOIN params p
        WHERE a.business_date <= p.as_of_date
        GROUP BY a.target_invoice_id
    ), active_allocations AS (
        SELECT a.invoice_id, SUM(a.amount)::numeric(12,2) AS settled_amount
        FROM public.customer_receipt_allocations a
        JOIN public.payments pay ON pay.id = a.payment_id
        CROSS JOIN params p
        WHERE COALESCE(pay.is_deleted, false) = false
          AND pay.status = 'confirmed'
          AND pay.date <= p.as_of_date
          AND a.allocated_at < p.cutoff_exclusive
          AND NOT EXISTS (
              SELECT 1
              FROM public.customer_receipt_allocation_reversals ar
              WHERE ar.allocation_id = a.id
                AND ar.reversed_at < p.cutoff_exclusive
          )
          AND NOT EXISTS (
              SELECT 1
              FROM public.customer_receipt_reversals rr
              WHERE rr.payment_id = a.payment_id
                AND rr.reversed_at < p.cutoff_exclusive
          )
        GROUP BY a.invoice_id
    ), receivable_base AS (
        SELECT
            i.*,
            COALESCE(a.credit_adjustment_amount, 0)::numeric(12,2) AS credit_adjustment_amount,
            COALESCE(c.credit_application_amount, 0)::numeric(12,2) AS credit_application_amount,
            COALESCE(s.settled_amount, 0)::numeric(12,2) AS settled_amount
        FROM eligible_invoices i
        LEFT JOIN adjustment_by_invoice a ON a.invoice_id = i.id
        LEFT JOIN application_by_invoice c ON c.target_invoice_id = i.id
        LEFT JOIN active_allocations s ON s.invoice_id = i.id
    ), receivable_amounts AS (
        SELECT
            b.*,
            GREATEST(ROUND(b.gross_amount - b.credit_adjustment_amount - b.credit_application_amount, 2), 0)::numeric(12,2)
                AS net_receivable_amount
        FROM receivable_base b
    ), classified AS (
        SELECT
            r.*,
            GREATEST(ROUND(r.net_receivable_amount - r.settled_amount, 2), 0)::numeric(12,2)
                AS outstanding_amount,
            CASE
                WHEN GREATEST(ROUND(r.net_receivable_amount - r.settled_amount, 2), 0) > 0
                     AND p.as_of_date > r.due_date
                THEN p.as_of_date - r.due_date
                ELSE 0
            END AS days_past_due,
            CASE
                WHEN GREATEST(ROUND(r.net_receivable_amount - r.settled_amount, 2), 0) <= 0
                     OR p.as_of_date <= r.due_date THEN 'not_due'
                WHEN p.as_of_date - r.due_date BETWEEN 1 AND 30 THEN '1_30'
                WHEN p.as_of_date - r.due_date BETWEEN 31 AND 60 THEN '31_60'
                WHEN p.as_of_date - r.due_date BETWEEN 61 AND 90 THEN '61_90'
                ELSE '91_plus'
            END AS ageing_bucket
        FROM receivable_amounts r
        CROSS JOIN params p
    ), cash_period AS (
        SELECT
            COALESCE(SUM(i.gross_amount) FILTER (
                WHERE (p.period_from IS NULL OR i.issue_date >= p.period_from)
                  AND i.issue_date <= p.period_to
            ), 0)::numeric(12,2) AS billed_amount,
            COALESCE((
                SELECT SUM(pay.amount)
                FROM public.payments pay
                WHERE COALESCE(pay.is_deleted, false) = false
                  AND pay.status = 'confirmed'
                  AND pay.date <= p.as_of_date
                  AND (p.period_from IS NULL OR pay.date >= p.period_from)
                  AND pay.date <= p.period_to
                  AND NOT EXISTS (
                      SELECT 1
                      FROM public.customer_receipt_reversals rr
                      WHERE rr.payment_id = pay.id
                        AND rr.reversed_at < p.cutoff_exclusive
                  )
            ), 0)::numeric(12,2) AS collected_cash_amount
        FROM params p
        LEFT JOIN eligible_invoices i ON true
        GROUP BY p.period_from, p.period_to, p.as_of_date, p.cutoff_exclusive
    ), detail_page AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'invoice_id', d.id,
                'invoice_number', d.invoice_number,
                'customer_id', d.customer_id,
                'customer_number', d.customer_number,
                'customer_name', d.customer_name,
                'service_id', d.service_id,
                'service_number', d.service_number,
                'service_title', d.service_title,
                'issue_date', d.issue_date,
                'due_date', d.due_date,
                'gross_amount', d.gross_amount,
                'credit_adjustment_amount', d.credit_adjustment_amount,
                'credit_application_amount', d.credit_application_amount,
                'net_receivable_amount', d.net_receivable_amount,
                'settled_amount', d.settled_amount,
                'outstanding_amount', d.outstanding_amount,
                'days_past_due', d.days_past_due,
                'ageing_bucket', d.ageing_bucket
            )
            ORDER BY d.outstanding_amount DESC, d.due_date ASC, d.invoice_number ASC, d.id ASC
        ) AS detail_rows
        FROM (
            SELECT d.*
            FROM classified d
            ORDER BY d.outstanding_amount DESC, d.due_date ASC, d.invoice_number ASC, d.id ASC
            LIMIT p_page_size OFFSET p_page_offset
        ) d
    ), customer_totals AS (
        SELECT
            d.customer_id,
            d.customer_number,
            d.customer_name,
            SUM(d.outstanding_amount)::numeric(12,2) AS amount
        FROM classified d
        WHERE d.outstanding_amount > 0
        GROUP BY d.customer_id, d.customer_number, d.customer_name
    ), customer_page AS (
        SELECT
            COUNT(*)::bigint AS customer_count,
            COALESCE((
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'customer_id', c.customer_id,
                        'customer_number', c.customer_number,
                        'customer_name', c.customer_name,
                        'amount', c.amount
                    )
                    ORDER BY c.amount DESC, c.customer_number ASC NULLS LAST, c.customer_id ASC
                )
                FROM (
                    SELECT c.*
                    FROM customer_totals c
                    ORDER BY c.amount DESC, c.customer_number ASC NULLS LAST, c.customer_id ASC
                    LIMIT 10
                ) c
            ), '[]'::jsonb) AS customer_rows
        FROM customer_totals
    )
    SELECT
        p.as_of_date,
        p.period_from,
        p.period_to,
        c.billed_amount,
        c.collected_cash_amount,
        COALESCE(SUM(d.outstanding_amount), 0)::numeric(12,2),
        COALESCE(SUM(d.outstanding_amount) FILTER (WHERE d.days_past_due > 0), 0)::numeric(12,2),
        COALESCE(SUM(d.outstanding_amount) FILTER (WHERE d.ageing_bucket = 'not_due'), 0)::numeric(12,2),
        COALESCE(SUM(d.outstanding_amount) FILTER (WHERE d.ageing_bucket = '1_30'), 0)::numeric(12,2),
        COALESCE(SUM(d.outstanding_amount) FILTER (WHERE d.ageing_bucket = '31_60'), 0)::numeric(12,2),
        COALESCE(SUM(d.outstanding_amount) FILTER (WHERE d.ageing_bucket = '61_90'), 0)::numeric(12,2),
        COALESCE(SUM(d.outstanding_amount) FILTER (WHERE d.ageing_bucket = '91_plus'), 0)::numeric(12,2),
        COUNT(d.id)::bigint,
        COALESCE((SELECT dp.detail_rows FROM detail_page dp), '[]'::jsonb),
        cp.customer_count,
        cp.customer_rows
    FROM params p
    CROSS JOIN cash_period c
    CROSS JOIN customer_page cp
    LEFT JOIN classified d ON true
    GROUP BY p.as_of_date, p.period_from, p.period_to, c.billed_amount, c.collected_cash_amount,
        cp.customer_count, cp.customer_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.get_accounts_receivable_report(date,date,date,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_accounts_receivable_report(date,date,date,integer,integer) TO service_role;

COMMENT ON FUNCTION public.get_accounts_receivable_report(date,date,date,integer,integer) IS
    'W7D authoritative current or historical AR report. Reconstructs receivables at an explicit as-of date and returns bounded deterministic detail rows.';

COMMIT;
