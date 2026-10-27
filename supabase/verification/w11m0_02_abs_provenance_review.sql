-- W11 M0-02 approved-quotation / missing-ABS provenance supplement (DEV).
-- Read-only, single statement. Execute only against dpddrqjzqohexixgdqiq.
-- Captures current target rows, exact-target audit counts, ABS status counts, and linked
-- invoice/payment/credit/AR counts. It does not query raw audit payloads or reconstruct history.
WITH targets(service_id, quotation_id) AS (
  VALUES
    ('3082b962-009c-4e4f-b5c4-ec2adcb27027'::uuid, '30d1f7a6-09a9-4e44-9a0a-f6c15eca5b8f'::uuid),
    ('dc395544-9d24-4869-b6c7-ac020dea959f'::uuid, '82dc2e82-19fa-478a-b9a3-6ea6da4a6168'::uuid)
),
records AS (
  SELECT
    t.service_id,
    t.quotation_id,
    s.status AS service_status,
    s.created_at AS service_created_at,
    s.deleted_at AS service_deleted_at,
    q.status AS quotation_status,
    q.created_at AS quotation_created_at,
    q.updated_at AS quotation_updated_at,
    q.is_deleted AS quotation_is_deleted,
    q.superseded_by_quotation_id,
    q.grand_total::text AS quotation_grand_total,
    s.customer_id IS NOT DISTINCT FROM q.customer_id AS service_quote_customer_matches
  FROM targets t
  LEFT JOIN public.services s ON s.id=t.service_id
  LEFT JOIN public.quotations q ON q.id=t.quotation_id AND q.service_id=t.service_id
),
scopes AS (
  SELECT b.id, b.service_id, b.source_quotation_id, b.status
  FROM public.approved_billing_scopes b
  JOIN targets t ON t.service_id=b.service_id OR t.quotation_id=b.source_quotation_id
),
matching_invoices AS (
  SELECT DISTINCT i.id
  FROM public.invoices i
  JOIN targets t ON i.service_id=t.service_id
  UNION
  SELECT DISTINCT i.id
  FROM public.invoices i
  JOIN targets t ON i.approved_quotation_id=t.quotation_id
  UNION
  SELECT DISTINCT i.id
  FROM public.invoices i
  JOIN scopes s ON i.approved_billing_scope_id=s.id
)
SELECT jsonb_build_object(
  'target','dpddrqjzqohexixgdqiq',
  'observed_at_utc',to_char(statement_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'snapshot',pg_current_snapshot()::text,
  'records',(SELECT jsonb_agg(jsonb_build_object(
    'service_id',service_id,
    'quotation_id',quotation_id,
    'service_status',service_status,
    'service_created_at_utc',to_char(service_created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'service_deleted_at_utc',to_char(service_deleted_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'quotation_status',quotation_status,
    'quotation_created_at_utc',to_char(quotation_created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'quotation_updated_at_utc',to_char(quotation_updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'quotation_is_deleted',quotation_is_deleted,
    'superseded_by_quotation_id',superseded_by_quotation_id,
    'quotation_grand_total',quotation_grand_total
  ) ORDER BY service_id) FROM records),
  'linked_customer_rows',(SELECT count(DISTINCT c.id)::text FROM targets t
    JOIN public.services s ON s.id=t.service_id JOIN public.customers c ON c.id=s.customer_id),
  'linked_customer_soft_deleted_rows',(SELECT count(DISTINCT c.id)::text FROM targets t
    JOIN public.services s ON s.id=t.service_id JOIN public.customers c ON c.id=s.customer_id
    WHERE COALESCE((to_jsonb(c)->>'is_deleted')::boolean,false) OR to_jsonb(c)->>'deleted_at' IS NOT NULL),
  'service_quote_customer_mismatch_rows',(SELECT count(*)::text FROM records WHERE service_quote_customer_matches IS FALSE),
  'quotation_approved_at_column_exists',EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='quotations' AND column_name='approved_at'
  ),
  'abs_status_counts',(SELECT COALESCE(jsonb_agg(jsonb_build_object('status',status,'rows',rows) ORDER BY status),'[]'::jsonb)
    FROM (SELECT status,count(*)::text AS rows FROM scopes GROUP BY status) x),
  'scope_pair_mismatch_rows',(SELECT count(*)::text FROM scopes s WHERE NOT EXISTS (SELECT 1 FROM targets t WHERE t.service_id=s.service_id AND t.quotation_id=s.source_quotation_id)),
  'service_audit_rows',(SELECT count(*)::text FROM public.audit_logs a JOIN targets t
    ON a.entity_id=t.service_id AND lower(a.entity_type) IN ('service','services')),
  'quotation_audit_rows',(SELECT count(*)::text FROM public.audit_logs a JOIN targets t
    ON a.entity_id=t.quotation_id AND lower(a.entity_type) IN ('quotation','quotations')),
  'invoice_rows',(SELECT count(*)::text FROM matching_invoices),
  'payment_rows',(SELECT count(*)::text FROM public.payments p JOIN matching_invoices i ON i.id=p.invoice_id),
  'credit_adjustment_rows',(SELECT count(*)::text FROM public.customer_internal_credit_adjustments c JOIN matching_invoices i ON i.id=c.invoice_id),
  'credit_application_rows',(SELECT count(*)::text FROM public.customer_credit_applications c JOIN matching_invoices i ON i.id=c.target_invoice_id),
  'ar_bridge_event_rows',(SELECT count(*)::text FROM public.accounting_ar_bridge_events e JOIN matching_invoices i ON i.id=e.source_record_id),
  'ar_bridge_link_rows',(SELECT count(*)::text FROM public.accounting_ar_bridge_journal_links l JOIN matching_invoices i
    ON i.id=l.invoice_id OR i.id=l.source_record_id),
  'accounting_reference_rows',jsonb_build_object(
    'source_effects',(SELECT count(*)::text FROM public.accounting_source_effects x JOIN targets t
      ON position(t.service_id::text IN COALESCE(x.source_record_key,''))>0 OR position(t.quotation_id::text IN COALESCE(x.source_record_key,''))>0),
    'journal_versions',(SELECT count(*)::text FROM public.accounting_journal_versions x JOIN targets t
      ON position(t.service_id::text IN COALESCE(x.source_record_key,''))>0 OR position(t.quotation_id::text IN COALESCE(x.source_record_key,''))>0),
    'inception_coverage',(SELECT count(*)::text FROM public.accounting_inception_coverage x JOIN targets t
      ON position(t.service_id::text IN COALESCE(x.source_record_key,''))>0 OR position(t.quotation_id::text IN COALESCE(x.source_record_key,''))>0),
    'revenue_recognition',(SELECT count(*)::text FROM public.accounting_revenue_recognition_events x JOIN targets t
      ON position(t.service_id::text IN COALESCE(x.source_record_key,''))>0 OR position(t.quotation_id::text IN COALESCE(x.source_record_key,''))>0),
    'foundation_events',(SELECT count(*)::text FROM public.accounting_foundation_events x JOIN targets t
      ON x.entity_id IN (t.service_id,t.quotation_id)),
    'ar_bridge_events',(SELECT count(*)::text FROM public.accounting_ar_bridge_events x JOIN targets t
      ON x.source_record_id IN (t.service_id,t.quotation_id)
      OR position(t.service_id::text IN COALESCE(x.source_record_key,''))>0
      OR position(t.quotation_id::text IN COALESCE(x.source_record_key,''))>0),
    'ar_bridge_journal_lines',(SELECT count(*)::text FROM public.accounting_ar_bridge_journal_lines x JOIN targets t
      ON x.invoice_id IN (t.service_id,t.quotation_id) OR x.source_record_id IN (t.service_id,t.quotation_id)),
    'ar_bridge_journal_links',(SELECT count(*)::text FROM public.accounting_ar_bridge_journal_links x JOIN targets t
      ON x.invoice_id IN (t.service_id,t.quotation_id) OR x.source_record_id IN (t.service_id,t.quotation_id)),
    'ap_bridge_events',(SELECT count(*)::text FROM public.accounting_ap_bridge_events x JOIN targets t
      ON x.source_record_id IN (t.service_id,t.quotation_id)
      OR position(t.service_id::text IN COALESCE(x.source_record_key,''))>0
      OR position(t.quotation_id::text IN COALESCE(x.source_record_key,''))>0),
    'ap_bridge_journal_lines',(SELECT count(*)::text FROM public.accounting_ap_bridge_journal_lines x JOIN targets t
      ON x.source_record_id IN (t.service_id,t.quotation_id)),
    'ap_bridge_journal_links',(SELECT count(*)::text FROM public.accounting_ap_bridge_journal_links x JOIN targets t
      ON x.source_record_id IN (t.service_id,t.quotation_id)),
    'expense_bridge_events',(SELECT count(*)::text FROM public.accounting_expense_bridge_events x JOIN targets t
      ON x.source_record_id IN (t.service_id,t.quotation_id)
      OR position(t.service_id::text IN COALESCE(x.source_record_key,''))>0
      OR position(t.quotation_id::text IN COALESCE(x.source_record_key,''))>0),
    'expense_bridge_journal_lines',(SELECT count(*)::text FROM public.accounting_expense_bridge_journal_lines x JOIN targets t
      ON x.source_record_id IN (t.service_id,t.quotation_id)),
    'expense_bridge_journal_links',(SELECT count(*)::text FROM public.accounting_expense_bridge_journal_links x JOIN targets t
      ON x.source_record_id IN (t.service_id,t.quotation_id))
  )
) AS evidence;
