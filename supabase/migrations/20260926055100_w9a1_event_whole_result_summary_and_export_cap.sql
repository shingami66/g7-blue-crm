BEGIN;

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
), summary_scope AS MATERIALIZED (
    SELECT s.*
    FROM close_filtered s
    CROSS JOIN params p
    WHERE p.completeness IS NULL
    ORDER BY s.service_number ASC, s.service_id ASC
    LIMIT ((SELECT completeness_scan_limit FROM params) + 1)
), summary_scope_count AS MATERIALIZED (
    SELECT count(*) AS candidate_count FROM summary_scope
), completeness_scope AS MATERIALIZED (
    SELECT s.*
    FROM close_filtered s
    CROSS JOIN params p
    WHERE p.completeness IS NOT NULL
    ORDER BY s.service_number ASC, s.service_id ASC
    LIMIT ((SELECT completeness_scan_limit FROM params) + 1)
), completeness_scope_count AS MATERIALIZED (
    SELECT count(*) AS candidate_count FROM completeness_scope
), whole_scope_counts AS MATERIALIZED (
    SELECT
        count(*) AS total_count,
        count(*) FILTER (WHERE s.close_state = 'open') AS open_count,
        count(*) FILTER (WHERE s.close_state = 'closed') AS closed_count
    FROM close_filtered s
    WHERE (SELECT completeness FROM params) IS NULL
), cost_scope AS MATERIALIZED (
    SELECT s.*
    FROM summary_scope s
    CROSS JOIN params p
    CROSS JOIN summary_scope_count scope_count
    WHERE p.completeness IS NULL
      AND scope_count.candidate_count <= (SELECT completeness_scan_limit FROM params)
    UNION ALL
    SELECT s.*
    FROM page_scope s
    CROSS JOIN params p
    CROSS JOIN summary_scope_count scope_count
    WHERE p.completeness IS NULL
      AND scope_count.candidate_count > (SELECT completeness_scan_limit FROM params)
    UNION ALL
    SELECT s.*
    FROM completeness_scope s
    CROSS JOIN params p
    CROSS JOIN completeness_scope_count scope_count
    WHERE p.completeness IS NOT NULL
      AND scope_count.candidate_count <= (SELECT completeness_scan_limit FROM params)
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
    WHERE p.completeness IS NULL OR c.completeness_status = p.completeness
), page AS (
    SELECT f.*
    FROM filtered f
    ORDER BY f.service_number ASC, f.service_id ASC
    LIMIT (SELECT page_size FROM params)
    OFFSET (
        CASE
            WHEN (SELECT completeness FROM params) IS NOT NULL
              OR (SELECT candidate_count FROM summary_scope_count)
                 <= (SELECT completeness_scan_limit FROM params)
            THEN (SELECT page_offset FROM params)
            ELSE 0
        END
    )
)
SELECT jsonb_build_object(
    'as_of_date', (SELECT as_of_date FROM params),
    'report_state', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT candidate_count FROM completeness_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN 'unavailable'
        ELSE 'ready'
    END,
    'error', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT candidate_count FROM completeness_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN 'event_completeness_filter_bounded'
        ELSE NULL
    END,
    'detail_total_count', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT candidate_count FROM completeness_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN NULL
        WHEN (SELECT completeness FROM params) IS NULL THEN (SELECT total_count FROM whole_scope_counts)
        ELSE (SELECT count(*) FROM filtered)
    END,
    'open_count', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT candidate_count FROM completeness_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN NULL
        WHEN (SELECT completeness FROM params) IS NULL THEN (SELECT open_count FROM whole_scope_counts)
        ELSE (SELECT count(*) FROM filtered f WHERE f.close_state = 'open')
    END,
    'closed_count', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT candidate_count FROM completeness_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN NULL
        WHEN (SELECT completeness FROM params) IS NULL THEN (SELECT closed_count FROM whole_scope_counts)
        ELSE (SELECT count(*) FROM filtered f WHERE f.close_state = 'closed')
    END,
    'completeness_summary_state', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT candidate_count FROM completeness_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN 'unavailable'
        WHEN (SELECT completeness FROM params) IS NULL
         AND (SELECT candidate_count FROM summary_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN 'unavailable'
        ELSE 'available'
    END,
    'complete_count', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT candidate_count FROM completeness_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN NULL
        WHEN (SELECT completeness FROM params) IS NULL
         AND (SELECT candidate_count FROM summary_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN NULL
        ELSE (SELECT count(*) FROM filtered f WHERE f.completeness_status = 'COMPLETE')
    END,
    'partial_count', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT candidate_count FROM completeness_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN NULL
        WHEN (SELECT completeness FROM params) IS NULL
         AND (SELECT candidate_count FROM summary_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN NULL
        ELSE (SELECT count(*) FROM filtered f WHERE f.completeness_status = 'PARTIAL')
    END,
    'unavailable_count', CASE
        WHEN (SELECT completeness FROM params) IS NOT NULL
         AND (SELECT candidate_count FROM completeness_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN NULL
        WHEN (SELECT completeness FROM params) IS NULL
         AND (SELECT candidate_count FROM summary_scope_count) > (SELECT completeness_scan_limit FROM params)
        THEN NULL
        ELSE (SELECT count(*) FROM filtered f WHERE f.completeness_status = 'UNAVAILABLE')
    END,
    'detail_rows', COALESCE(
        CASE WHEN (SELECT completeness FROM params) IS NOT NULL
          AND (SELECT candidate_count FROM completeness_scope_count) > (SELECT completeness_scan_limit FROM params)
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

REVOKE ALL ON FUNCTION public.get_event_economics_report(date,text,text,text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_economics_report(date,text,text,text,integer,integer) TO service_role;

COMMENT ON FUNCTION public.get_event_economics_report(date,text,text,text,integer,integer) IS
    'W9A1 bounded managerial Event Economics projection delegating cost formulas to W8 Event Costing and W8B close snapshots; returns authoritative bounded whole-filter summary metadata; not accounting.';

COMMIT;
