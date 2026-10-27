-- W11 M0-03 invoice-reference provenance supplement (DEV).
-- Read-only, single statement. Execute only against dpddrqjzqohexixgdqiq.
-- The result intentionally omits actor IDs, customer/service/scope UUIDs, invoice numbers,
-- raw audit JSON, and monetary values. It returns only the 14 already-published invoice
-- reference UUIDs, their action/timestamps, source-path counts, and aggregate linked context.
WITH ids(id) AS (VALUES
  ('040cdd06-76c7-4110-8307-73eea19c8e34'::uuid),
  ('0b9ac36f-ece0-4dff-a057-e4631d0d166f'::uuid),
  ('0eaf57a1-218d-481b-8240-9ad5bba64bc8'::uuid),
  ('1f1402cb-ec67-4db0-b8ad-332e9e09036c'::uuid),
  ('2a7b06c0-2167-4456-af74-1e2e0b1c22ca'::uuid),
  ('3175e652-bab7-4d90-8096-b4cb3c1daf37'::uuid),
  ('3eaf8f70-da39-4bda-a4f4-9601692c7ffa'::uuid),
  ('75154bb3-1c14-43fd-b9a5-a86cad2fb831'::uuid),
  ('7ce5a763-3180-43ad-b0f1-0a8fa2431b02'::uuid),
  ('99bb7f1b-5201-4992-bd7d-75c00ccb3097'::uuid),
  ('b3480d1a-e929-4461-8190-61fd3928d879'::uuid),
  ('d0a7179c-4319-4f9d-b821-eeb76778725f'::uuid),
  ('eba1b438-80fb-4cea-bd2d-822568e25357'::uuid),
  ('f78093d2-db60-481e-893e-fa4de40c23b5'::uuid)
),
audit AS (
  SELECT
    i.id,
    a.action,
    a."timestamp",
    a.details->>'event_type' AS event_type,
    a.details->>'invoice_type' AS invoice_type,
    a.details->>'new_state' AS new_state,
    CASE WHEN a.details->>'customer_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         THEN (a.details->>'customer_id')::uuid END AS customer_id,
    CASE WHEN a.details->>'service_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         THEN (a.details->>'service_id')::uuid END AS service_id,
    CASE WHEN a.details->>'approved_billing_scope_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         THEN (a.details->>'approved_billing_scope_id')::uuid END AS scope_id,
    a.details ?| ARRAY['amount','subtotal','grand_total','vat_amount','balance_due','amount_paid']
      OR COALESCE(a.details->>'new_state','') ~* '(amount|total|subtotal|vat|balance|paid|price|rate|halalah)'
      AS has_financial_fields
  FROM ids i
  LEFT JOIN public.audit_logs a
    ON a.entity_id=i.id
   AND lower(a.entity_type) IN ('invoice','invoices')
),
refs AS (
  SELECT DISTINCT customer_id, service_id, scope_id
  FROM audit
  WHERE action IS NOT NULL
),
source_hits AS (
  SELECT 'invoices.id' AS source, count(*)::text AS rows
  FROM public.invoices t JOIN ids i ON t.id=i.id
  UNION ALL SELECT 'invoice_items.invoice_id',count(*)::text
  FROM public.invoice_items t JOIN ids i ON t.invoice_id=i.id
  UNION ALL SELECT 'payments.invoice_id',count(*)::text
  FROM public.payments t JOIN ids i ON t.invoice_id=i.id
  UNION ALL SELECT 'customer_receipt_allocations.invoice_id',count(*)::text
  FROM public.customer_receipt_allocations t JOIN ids i ON t.invoice_id=i.id
  UNION ALL SELECT 'invoice_draft_update_mutations.invoice_id',count(*)::text
  FROM public.invoice_draft_update_mutations t JOIN ids i ON t.invoice_id=i.id
  UNION ALL SELECT 'customer_internal_credit_adjustments.invoice_id',count(*)::text
  FROM public.customer_internal_credit_adjustments t JOIN ids i ON t.invoice_id=i.id
  UNION ALL SELECT 'customer_credit_applications.target_invoice_id',count(*)::text
  FROM public.customer_credit_applications t JOIN ids i ON t.target_invoice_id=i.id
  UNION ALL SELECT 'accounting_ar_bridge_event_versions.invoice_id',count(*)::text
  FROM public.accounting_ar_bridge_event_versions t JOIN ids i ON t.invoice_id=i.id
  UNION ALL SELECT 'accounting_ar_bridge_events.source_record_id',count(*)::text
  FROM public.accounting_ar_bridge_events t JOIN ids i ON t.source_record_id=i.id
  UNION ALL SELECT 'accounting_ar_bridge_events.source_record_key',count(*)::text
  FROM public.accounting_ar_bridge_events t JOIN ids i ON position(i.id::text IN t.source_record_key)>0
  UNION ALL SELECT 'accounting_ar_bridge_journal_lines.invoice_id',count(*)::text
  FROM public.accounting_ar_bridge_journal_lines t JOIN ids i ON t.invoice_id=i.id
  UNION ALL SELECT 'accounting_ar_bridge_journal_lines.source_record_id',count(*)::text
  FROM public.accounting_ar_bridge_journal_lines t JOIN ids i ON t.source_record_id=i.id
  UNION ALL SELECT 'accounting_ar_bridge_journal_links.invoice_id',count(*)::text
  FROM public.accounting_ar_bridge_journal_links t JOIN ids i ON t.invoice_id=i.id
  UNION ALL SELECT 'accounting_ar_bridge_journal_links.source_record_id',count(*)::text
  FROM public.accounting_ar_bridge_journal_links t JOIN ids i ON t.source_record_id=i.id
  UNION ALL SELECT 'accounting_source_effects.source_record_key',count(*)::text
  FROM public.accounting_source_effects t JOIN ids i ON position(i.id::text IN t.source_record_key)>0
  UNION ALL SELECT 'accounting_journal_versions.source_record_key',count(*)::text
  FROM public.accounting_journal_versions t JOIN ids i ON position(i.id::text IN t.source_record_key)>0
  UNION ALL SELECT 'accounting_inception_coverage.source_record_key',count(*)::text
  FROM public.accounting_inception_coverage t JOIN ids i ON position(i.id::text IN t.source_record_key)>0
  UNION ALL SELECT 'accounting_revenue_recognition_events.source_record_key',count(*)::text
  FROM public.accounting_revenue_recognition_events t JOIN ids i ON position(i.id::text IN t.source_record_key)>0
  UNION ALL SELECT 'accounting_foundation_events.entity_id',count(*)::text
  FROM public.accounting_foundation_events t JOIN ids i ON t.entity_id=i.id
  UNION ALL SELECT 'accounting_ap_bridge_events.source_record_id',count(*)::text
  FROM public.accounting_ap_bridge_events t JOIN ids i ON t.source_record_id=i.id
  UNION ALL SELECT 'accounting_ap_bridge_events.source_record_key',count(*)::text
  FROM public.accounting_ap_bridge_events t JOIN ids i ON position(i.id::text IN t.source_record_key)>0
  UNION ALL SELECT 'accounting_ap_bridge_journal_lines.source_record_id',count(*)::text
  FROM public.accounting_ap_bridge_journal_lines t JOIN ids i ON t.source_record_id=i.id
  UNION ALL SELECT 'accounting_ap_bridge_journal_links.source_record_id',count(*)::text
  FROM public.accounting_ap_bridge_journal_links t JOIN ids i ON t.source_record_id=i.id
  UNION ALL SELECT 'accounting_expense_bridge_events.source_record_id',count(*)::text
  FROM public.accounting_expense_bridge_events t JOIN ids i ON t.source_record_id=i.id
  UNION ALL SELECT 'accounting_expense_bridge_events.source_record_key',count(*)::text
  FROM public.accounting_expense_bridge_events t JOIN ids i ON position(i.id::text IN t.source_record_key)>0
  UNION ALL SELECT 'accounting_expense_bridge_journal_lines.source_record_id',count(*)::text
  FROM public.accounting_expense_bridge_journal_lines t JOIN ids i ON t.source_record_id=i.id
  UNION ALL SELECT 'accounting_expense_bridge_journal_links.source_record_id',count(*)::text
  FROM public.accounting_expense_bridge_journal_links t JOIN ids i ON t.source_record_id=i.id
),
joined_services AS (
  SELECT a.id,a."timestamp" AS invoice_event_at,s.created_at AS service_created_at,s.deleted_at AS service_deleted_at
  FROM audit a
  JOIN public.services s ON s.id=a.service_id
  WHERE a.action IS NOT NULL
)
SELECT jsonb_build_object(
  'target','dpddrqjzqohexixgdqiq',
  'observed_at_utc',to_char(statement_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'snapshot',pg_current_snapshot()::text,
  'audit_ids',(SELECT jsonb_agg(jsonb_build_object(
    'id',id,
    'action',action,
    'timestamp_utc',to_char("timestamp" AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  ) ORDER BY id) FROM audit WHERE action IS NOT NULL),
  'audit_event_count',(SELECT count(*)::text FROM audit WHERE action IS NOT NULL),
  'distinct_ids_with_audit',(SELECT count(DISTINCT id)::text FROM audit WHERE action IS NOT NULL),
  'actions',(SELECT jsonb_object_agg(k,n) FROM (SELECT action k,count(*)::text n FROM audit WHERE action IS NOT NULL GROUP BY 1) x),
  'event_types',(SELECT jsonb_object_agg(k,n) FROM (SELECT event_type k,count(*)::text n FROM audit WHERE action IS NOT NULL GROUP BY 1) x),
  'invoice_types',(SELECT jsonb_object_agg(k,n) FROM (SELECT invoice_type k,count(*)::text n FROM audit WHERE action IS NOT NULL GROUP BY 1) x),
  'new_states',(SELECT jsonb_object_agg(k,n) FROM (SELECT new_state k,count(*)::text n FROM audit WHERE action IS NOT NULL GROUP BY 1) x),
  'records_with_financial_fields',(SELECT count(*)::text FROM audit WHERE action IS NOT NULL AND has_financial_fields),
  'source_hits',(SELECT jsonb_agg(to_jsonb(s) ORDER BY source) FROM source_hits s),
  'distinct_customer_refs',(SELECT count(DISTINCT customer_id)::text FROM refs WHERE customer_id IS NOT NULL),
  'current_customer_rows',(SELECT count(DISTINCT r.customer_id)::text FROM refs r JOIN public.customers c ON c.id=r.customer_id),
  'deleted_customer_rows',(SELECT count(DISTINCT r.customer_id)::text FROM refs r JOIN public.customers c ON c.id=r.customer_id
    WHERE COALESCE((to_jsonb(c)->>'is_deleted')::boolean,false) OR to_jsonb(c)->>'deleted_at' IS NOT NULL),
  'distinct_service_refs',(SELECT count(DISTINCT service_id)::text FROM refs WHERE service_id IS NOT NULL),
  'deleted_service_rows',(SELECT count(DISTINCT r.service_id)::text FROM refs r JOIN public.services s ON s.id=r.service_id WHERE s.deleted_at IS NOT NULL),
  'distinct_scope_refs',(SELECT count(DISTINCT scope_id)::text FROM refs WHERE scope_id IS NOT NULL),
  'current_approved_scopes',(SELECT count(DISTINCT r.scope_id)::text FROM refs r JOIN public.approved_billing_scopes b ON b.id=r.scope_id
    WHERE b.status='approved' AND b.superseded_by_scope_id IS NULL),
  'current_approved_source_quotes',(SELECT count(DISTINCT q.id)::text FROM refs r
    JOIN public.approved_billing_scopes b ON b.id=r.scope_id
    JOIN public.quotations q ON q.id=b.source_quotation_id
    WHERE b.status='approved' AND b.superseded_by_scope_id IS NULL AND NOT q.is_deleted AND q.status='approved'),
  'scope_service_mismatches',(SELECT count(*)::text FROM refs r JOIN public.approved_billing_scopes b ON b.id=r.scope_id
    WHERE b.service_id IS DISTINCT FROM r.service_id),
  'service_events_at_or_before_delete',(SELECT count(*)::text FROM joined_services WHERE invoice_event_at<=service_deleted_at),
  'service_events_after_delete',(SELECT count(*)::text FROM joined_services WHERE invoice_event_at>service_deleted_at),
  'service_created_min_utc',(SELECT to_char(min(service_created_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') FROM joined_services),
  'service_created_max_utc',(SELECT to_char(max(service_created_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') FROM joined_services),
  'service_deleted_min_utc',(SELECT to_char(min(service_deleted_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') FROM joined_services),
  'service_deleted_max_utc',(SELECT to_char(max(service_deleted_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') FROM joined_services),
  'service_role_delete_privilege',has_table_privilege('service_role','public.invoices','DELETE')
) AS evidence;
