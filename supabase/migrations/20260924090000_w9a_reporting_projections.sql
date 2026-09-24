-- W9A1 additive reporting projections.
--
-- These functions are read-only server projections. Accounts Payable delegates
-- balances to the W6 supplier_bill_payment_balances view. Event Economics
-- delegates all costing formulas to W8 get_event_costing and reads only the
-- immutable W8B close snapshot for final-close presentation.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.supplier_bill_payment_balances') IS NULL
        OR to_regclass('public.supplier_bills') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w9a_ap_reporting_foundation_missing';
    END IF;

    IF to_regprocedure('public.get_event_costing(uuid,date)') IS NULL
        OR to_regclass('public.event_cost_close_versions') IS NULL
        OR to_regclass('public.event_cost_close_reopenings') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w9a_event_reporting_foundation_missing';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_accounts_payable_report(
    p_status text DEFAULT NULL,
    p_supplier_search text DEFAULT NULL,
    p_service_search text DEFAULT NULL,
    p_supplier_id uuid DEFAULT NULL,
    p_service_id uuid DEFAULT NULL,
    p_due_from date DEFAULT NULL,
    p_due_to date DEFAULT NULL,
    p_page_size integer DEFAULT 20,
    p_page_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
WITH params AS (
    SELECT
        NULLIF(btrim(p_status), '') AS status,
        NULLIF(btrim(p_supplier_search), '') AS supplier_search,
        NULLIF(btrim(p_service_search), '') AS service_search,
        p_supplier_id AS supplier_id,
        p_service_id AS service_id,
        p_due_from AS due_from,
        p_due_to AS due_to,
        LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100) AS page_size,
        GREATEST(COALESCE(p_page_offset, 0), 0) AS page_offset
), filtered AS (
    SELECT
        b.supplier_bill_id,
        b.bill_number,
        b.supplier_id,
        b.service_id,
        b.currency,
        b.payable_amount,
        b.paid_amount,
        b.outstanding_amount,
        b.payment_status,
        b.advance_allocated_amount,
        sb.invoice_date,
        sb.due_date,
        sb.supplier_name_snapshot
    FROM public.supplier_bill_payment_balances b
    JOIN public.supplier_bills sb ON sb.id = b.supplier_bill_id
    CROSS JOIN params p
    WHERE sb.status = 'approved'
      AND (p.status IS NULL OR b.payment_status = p.status)
      AND (p.supplier_search IS NULL OR sb.supplier_name_snapshot ILIKE '%' || p.supplier_search || '%')
      AND (
          p.service_search IS NULL
          OR EXISTS (
              SELECT 1 FROM public.services s
              WHERE s.id = b.service_id
                AND s.deleted_at IS NULL
                AND (s.service_number ILIKE '%' || p.service_search || '%' OR s.service_title ILIKE '%' || p.service_search || '%')
          )
      )
      AND (p.supplier_id IS NULL OR b.supplier_id = p.supplier_id)
      AND (p.service_id IS NULL OR b.service_id = p.service_id)
      AND (p.due_from IS NULL OR sb.due_date >= p.due_from)
      AND (p.due_to IS NULL OR sb.due_date <= p.due_to)
), page AS (
    SELECT f.*
    FROM filtered f
    ORDER BY f.invoice_date DESC, f.bill_number ASC, f.supplier_bill_id ASC
    LIMIT (SELECT page_size FROM params)
    OFFSET (SELECT page_offset FROM params)
)
SELECT jsonb_build_object(
    'current_only', true,
    'source', 'supplier_bill_payment_balances',
    'payable_amount', COALESCE((SELECT sum(f.payable_amount) FROM filtered f), 0),
    'paid_amount', COALESCE((SELECT sum(f.paid_amount) FROM filtered f), 0),
    'outstanding_amount', COALESCE((SELECT sum(f.outstanding_amount) FROM filtered f), 0),
    'open_bill_count', (SELECT count(*) FROM filtered f WHERE f.outstanding_amount > 0),
    'detail_total_count', (SELECT count(*) FROM filtered),
    'detail_rows', COALESCE(
        (SELECT jsonb_agg(to_jsonb(page) ORDER BY page.invoice_date DESC, page.bill_number ASC, page.supplier_bill_id ASC) FROM page),
        '[]'::jsonb
    )
);
$$;

CREATE OR REPLACE FUNCTION public.get_event_economics_report(
    p_as_of_date date,
    p_search text DEFAULT NULL,
    p_completeness text DEFAULT NULL,
    p_close_state text DEFAULT NULL,
    p_page_size integer DEFAULT 20,
    p_page_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
WITH params AS (
    SELECT
        COALESCE(p_as_of_date, (timezone('Asia/Riyadh', transaction_timestamp()))::date) AS as_of_date,
        NULLIF(btrim(p_search), '') AS search_text,
        NULLIF(btrim(p_completeness), '') AS completeness,
        NULLIF(btrim(p_close_state), '') AS close_state,
        LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100) AS page_size,
        GREATEST(COALESCE(p_page_offset, 0), 0) AS page_offset,
        500 AS completeness_scan_limit
), service_rows AS (
    SELECT s.id AS service_id, s.service_number, s.service_title, s.customer_id
    FROM public.services s
    CROSS JOIN params p
    WHERE s.deleted_at IS NULL
      AND (
          p.search_text IS NULL
          OR s.service_number ILIKE '%' || p.search_text || '%'
          OR s.service_title ILIKE '%' || p.search_text || '%'
      )
), service_scope AS (
    SELECT
        s.*,
        close_snapshot.close_version,
        close_snapshot.effective_date AS close_effective_date,
        close_snapshot.actual_cost AS final_actual_cost,
        close_snapshot.final_managerial_event_margin AS final_managerial_margin,
        close_snapshot.closed_at,
        CASE WHEN close_snapshot.close_version IS NULL THEN 'open' ELSE 'closed' END AS close_state
    FROM service_rows s
    CROSS JOIN params p
    LEFT JOIN LATERAL (
        SELECT c.close_version, c.effective_date, c.actual_cost,
               c.final_managerial_event_margin, c.closed_at
        FROM public.event_cost_close_versions c
        LEFT JOIN public.event_cost_close_reopenings r
          ON r.event_cost_close_version_id = c.id
        WHERE c.service_id = s.service_id
          AND (r.id IS NULL OR r.reopened_at >= ((p.as_of_date + 1)::timestamp AT TIME ZONE 'Asia/Riyadh'))
          AND c.effective_date <= p.as_of_date
        ORDER BY c.close_version DESC
        LIMIT 1
    ) close_snapshot ON true
), close_filtered AS (
    SELECT s.*
    FROM service_scope s
    CROSS JOIN params p
    WHERE p.close_state IS NULL OR s.close_state = p.close_state
), page_scope AS MATERIALIZED (
    SELECT s.*
    FROM close_filtered s
    CROSS JOIN params p
    WHERE p.completeness IS NULL
    ORDER BY s.service_number ASC, s.service_id ASC
    LIMIT (SELECT page_size FROM params)
    OFFSET (SELECT page_offset FROM params)
), completeness_scope AS MATERIALIZED (
    SELECT s.*
    FROM close_filtered s
    CROSS JOIN params p
    WHERE p.completeness IS NOT NULL
    ORDER BY s.service_number ASC, s.service_id ASC
    LIMIT ((SELECT completeness_scan_limit FROM params) + 1)
), cost_scope AS MATERIALIZED (
    SELECT s.*
    FROM completeness_scope s
    CROSS JOIN params p
    WHERE p.completeness IS NOT NULL
    UNION ALL
    SELECT s.*
    FROM page_scope s
), costed AS (
    SELECT
        s.*,
        public.get_event_costing(s.service_id, p.as_of_date) AS costing
    FROM cost_scope s
    CROSS JOIN params p
), classified AS (
    SELECT
        c.*,
        COALESCE(c.costing->'completeness'->>'status', c.costing->>'status', 'UNAVAILABLE') AS completeness_status,
        COALESCE(c.costing->'completeness'->'reason_codes', '[]'::jsonb) AS completeness_reason_codes
    FROM costed c
), filtered AS (
    SELECT c.*
    FROM classified c
    CROSS JOIN params p
    WHERE (p.completeness IS NULL OR c.completeness_status = p.completeness)
), page AS (
    SELECT f.*
    FROM filtered f
    ORDER BY f.service_number ASC, f.service_id ASC
    LIMIT (SELECT page_size FROM params)
    OFFSET CASE WHEN (SELECT completeness FROM params) IS NULL THEN 0 ELSE (SELECT page_offset FROM params) END
)
SELECT jsonb_build_object(
    'as_of_date', (SELECT as_of_date FROM params),
    'report_state', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT count(*) FROM completeness_scope) > (SELECT completeness_scan_limit FROM params)
        THEN 'unavailable'
        ELSE 'ready'
    END,
    'error', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT count(*) FROM completeness_scope) > (SELECT completeness_scan_limit FROM params)
        THEN 'event_completeness_filter_bounded'
        ELSE NULL
    END,
    'detail_total_count', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT count(*) FROM completeness_scope) > (SELECT completeness_scan_limit FROM params)
        THEN NULL
        WHEN (SELECT completeness FROM params) IS NULL THEN (SELECT count(*) FROM close_filtered)
        ELSE (SELECT count(*) FROM filtered)
    END,
    'detail_rows', COALESCE(
        CASE WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT count(*) FROM completeness_scope) > (SELECT completeness_scan_limit FROM params)
             THEN NULL
             ELSE (SELECT jsonb_agg(
            jsonb_build_object(
                'service_id', page.service_id,
                'service_number', page.service_number,
                'service_title', page.service_title,
                'customer_id', page.customer_id,
                'approved_budget_cost', NULLIF(page.costing->'budget'->>'approved_budget_cost', '')::numeric,
                'open_commitment', NULLIF(page.costing->>'open_commitment', '')::numeric,
                'actual_cost', NULLIF(page.costing->>'actual_cost', '')::numeric,
                'paid_cost', NULLIF(page.costing->>'paid_cost', '')::numeric,
                'outstanding_cost', NULLIF(page.costing->>'outstanding_cost', '')::numeric,
                'etc', NULLIF(page.costing->>'etc', '')::numeric,
                'eac', NULLIF(page.costing->>'eac', '')::numeric,
                'net_approved_commercial_value', NULLIF(page.costing->>'net_approved_commercial_value', '')::numeric,
                'forecast_margin', NULLIF(page.costing->>'forecast_margin', '')::numeric,
                'completeness_status', page.completeness_status,
                'completeness_reason_codes', page.completeness_reason_codes,
                'close_state', page.close_state,
                'close_version', page.close_version,
                'close_effective_date', page.close_effective_date,
                'final_actual_cost', page.final_actual_cost,
                'final_managerial_margin', page.final_managerial_margin,
                'closed_at', page.closed_at
            )
            ORDER BY page.service_number ASC, page.service_id ASC
        ) FROM page) END,
        '[]'::jsonb
    )
);
$$;

REVOKE ALL ON FUNCTION public.get_accounts_payable_report(text,text,text,uuid,uuid,date,date,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_event_economics_report(date,text,text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_accounts_payable_report(text,text,text,uuid,uuid,date,date,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_event_economics_report(date,text,text,text,integer,integer) TO service_role;

COMMENT ON FUNCTION public.get_accounts_payable_report(text,text,text,uuid,uuid,date,date,integer,integer) IS
    'W9A1 current-only Accounts Payable projection over the W6 supplier bill payment balance authority.';
COMMENT ON FUNCTION public.get_event_economics_report(date,text,text,text,integer,integer) IS
    'W9A1 bounded managerial Event Economics projection delegating cost formulas to W8 Event Costing and W8B close snapshots; not accounting.';

COMMIT;
