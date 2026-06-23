-- 20260623100000_customer_report_metrics_view.sql
-- Creates a read-only view for aggregated customer metrics (services and quotations).

CREATE OR REPLACE VIEW public.customer_report_metrics
WITH (security_invoker = true)
AS
SELECT
  c.id AS customer_id,
  COALESCE(sc.services_count, 0)::integer AS services_count,
  COALESCE(qs.quotations_count, 0)::integer AS quotations_count,
  COALESCE(qs.approved_quotations_count, 0)::integer AS approved_quotations_count,
  COALESCE(qs.draft_quotations_count, 0)::integer AS draft_quotations_count,
  COALESCE(qs.total_quoted_amount, 0)::numeric(14, 2) AS total_quoted_amount
FROM public.customers c
LEFT JOIN (
  SELECT
    customer_id,
    COUNT(*)::integer AS services_count
  FROM public.services
  WHERE deleted_at IS NULL
  GROUP BY customer_id
) sc ON sc.customer_id = c.id
LEFT JOIN (
  SELECT
    customer_id,
    COUNT(*)::integer AS quotations_count,
    COUNT(*) FILTER (WHERE status = 'approved')::integer AS approved_quotations_count,
    COUNT(*) FILTER (WHERE status = 'draft')::integer AS draft_quotations_count,
    COALESCE(SUM(grand_total), 0)::numeric(14, 2) AS total_quoted_amount
  FROM public.quotations
  WHERE COALESCE(is_deleted, false) = false
  GROUP BY customer_id
) qs ON qs.customer_id = c.id
WHERE COALESCE(c.is_deleted, false) = false;

-- Grant access to authenticated users
GRANT SELECT ON public.customer_report_metrics TO authenticated;
GRANT SELECT ON public.customer_report_metrics TO service_role;
