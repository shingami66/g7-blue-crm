-- W11 M0-04 exact-nine DEV provenance review.
-- DEV project: dpddrqjzqohexixgdqiq only.
-- One SELECT statement; no DDL, DML, fixture creation, setting changes, or mutations.
-- Returns only fixed Customer IDs, generated Customer numbers, lifecycle timestamps/statuses,
-- safe audit metadata, and bounded relationship counts. No names, contacts, raw audit payloads,
-- credentials, tokens, or financial reconstruction.
-- Run through Supabase DEV execute_sql; all rows share this statement snapshot/cutoff.
WITH target_customers(customer_id) AS (
  VALUES
    ('7f02982d-2468-46ca-ae2b-185f556f3fee'::uuid),
    ('784c2e16-f8cf-467a-ad33-95569e3cf9cc'::uuid),
    ('d7909f6a-6ed1-48d7-8740-af5e7a44310a'::uuid),
    ('d1b9619f-6e8f-4902-ad26-844069d31d3c'::uuid),
    ('f682f4d0-1300-4392-a392-a838807c6314'::uuid),
    ('0476d4a9-d77b-4988-805a-1a319403748e'::uuid),
    ('21db71fc-ac14-44c1-b5f6-03fcfcf64fc9'::uuid),
    ('2168cc59-0205-4218-a141-15a9ac666877'::uuid),
    ('9bcf5c65-7b3e-4f90-b5d7-276f40d8d27e'::uuid)
),
observed AS (
  SELECT statement_timestamp() AS recorded_at_cutoff,
         pg_current_snapshot()::text AS snapshot_id
),
target_services AS (
  SELECT s.id, s.customer_id, s.service_number, s.status, s.created_at,
         s.updated_at, s.deleted_at, sl.legacy_status
  FROM public.services s
  JOIN target_customers t ON t.customer_id = s.customer_id
  LEFT JOIN public.service_lifecycle_states sl ON sl.service_id = s.id
),
target_quotations AS (
  SELECT q.id, q.customer_id, q.service_id, q.quotation_number, q.status,
         q.is_deleted, q.deleted_at, q.superseded_at, q.grand_total,
         q.created_at, q.updated_at
  FROM public.quotations q
  JOIN target_customers t ON t.customer_id = q.customer_id
),
target_scopes AS (
  SELECT a.id, a.service_id, a.source_quotation_id, a.scope_version, a.status,
         a.accepted_grand_total, a.approved_at, a.voided_at, a.superseded_at
  FROM public.approved_billing_scopes a
  WHERE a.service_id IN (SELECT id FROM target_services)
),
target_invoices AS (
  SELECT i.id, i.customer_id, i.service_id, i.approved_quotation_id,
         i.approved_billing_scope_id
  FROM public.invoices i
  WHERE i.customer_id IN (SELECT customer_id FROM target_customers)
     OR i.service_id IN (SELECT id FROM target_services)
     OR i.approved_quotation_id IN (SELECT id FROM target_quotations)
     OR i.approved_billing_scope_id IN (SELECT id FROM target_scopes)
),
target_payments AS (
  SELECT p.id, p.customer_id, p.invoice_id
  FROM public.payments p
  WHERE p.customer_id IN (SELECT customer_id FROM target_customers)
     OR p.invoice_id IN (SELECT id FROM target_invoices)
),
customer_rows AS (
  SELECT c.id AS customer_id, c.customer_number, c.created_at, c.updated_at,
         c.is_deleted, c.deleted_at,
         (SELECT count(*) FROM public.audit_logs a WHERE a.entity_id = c.id) AS customer_audit_count,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'service_id', s.id,
             'service_number', s.service_number,
             'status', s.status,
             'lifecycle_status', s.legacy_status,
             'created_at', s.created_at,
             'updated_at', s.updated_at,
             'deleted_at', s.deleted_at
           ) ORDER BY s.service_number)
           FROM target_services s WHERE s.customer_id = c.id
         ), '[]'::jsonb) AS services,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'quotation_id', q.id,
             'quotation_number', q.quotation_number,
             'service_id', q.service_id,
             'status', q.status,
             'is_deleted', q.is_deleted,
             'deleted_at', q.deleted_at,
             'superseded_at', q.superseded_at,
             'grand_total_commercial_only', q.grand_total::text,
             'created_at', q.created_at,
             'updated_at', q.updated_at
           ) ORDER BY q.quotation_number)
           FROM target_quotations q WHERE q.customer_id = c.id
         ), '[]'::jsonb) AS quotations
  FROM public.customers c
  JOIN target_customers t ON t.customer_id = c.id
),
relevant_audit AS (
  SELECT a.entity_type, a.entity_id, a.action, a.timestamp,
         a.details->>'event_type' AS event_type,
         a.details->>'service_id' AS service_id_ref,
         a.details->>'invoice_id' AS invoice_id_ref,
         COALESCE((
           SELECT jsonb_agg(k.key ORDER BY k.key)
           FROM jsonb_object_keys(a.details) AS k(key)
           WHERE lower(k.key) LIKE '%amount%'
              OR lower(k.key) LIKE '%total%'
              OR lower(k.key) LIKE '%subtotal%'
              OR lower(k.key) LIKE '%vat%'
         ), '[]'::jsonb) AS monetary_detail_keys
  FROM public.audit_logs a
  WHERE a.entity_id IN (SELECT customer_id FROM target_customers)
     OR a.entity_id IN (SELECT id FROM target_services)
     OR a.entity_id IN (SELECT id FROM target_quotations)
     OR a.entity_id IN (SELECT id FROM target_scopes)
     OR a.details->>'service_id' IN (SELECT id::text FROM target_services)
),
audit_action_groups AS (
  SELECT entity_type, action, COALESCE(event_type, '<NULL>') AS event_type,
         count(*) AS event_count, min(timestamp) AS first_at,
         max(timestamp) AS last_at, count(DISTINCT timestamp) AS distinct_times
  FROM relevant_audit
  GROUP BY entity_type, action, COALESCE(event_type, '<NULL>')
),
downstream_counts(relation_name, row_count) AS (
  SELECT 'projects', count(*) FROM public.projects x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
  UNION ALL SELECT 'invoices', count(*) FROM target_invoices
  UNION ALL SELECT 'payments', count(*) FROM target_payments
  UNION ALL SELECT 'customer_receipt_allocations', count(*) FROM public.customer_receipt_allocations x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
       OR x.invoice_id IN (SELECT id FROM target_invoices)
       OR x.payment_id IN (SELECT id FROM target_payments)
  UNION ALL SELECT 'customer_credit_applications', count(*) FROM public.customer_credit_applications x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
       OR x.target_invoice_id IN (SELECT id FROM target_invoices)
  UNION ALL SELECT 'customer_credit_application_reversals', count(*) FROM public.customer_credit_application_reversals x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
  UNION ALL SELECT 'customer_internal_credit_adjustments', count(*) FROM public.customer_internal_credit_adjustments x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
       OR x.service_id IN (SELECT id FROM target_services)
       OR x.invoice_id IN (SELECT id FROM target_invoices)
  UNION ALL SELECT 'customer_internal_credit_adjustment_reversals', count(*) FROM public.customer_internal_credit_adjustment_reversals x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
  UNION ALL SELECT 'customer_refunds', count(*) FROM public.customer_refunds x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
       OR x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'customer_refund_reversals', count(*) FROM public.customer_refund_reversals x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
  UNION ALL SELECT 'accounting_ar_bridge_events', count(*) FROM public.accounting_ar_bridge_events x
    WHERE x.id IN (SELECT event_id FROM public.accounting_ar_bridge_event_versions v
      WHERE v.customer_id IN (SELECT customer_id FROM target_customers)
         OR v.service_id IN (SELECT id FROM target_services)
         OR v.invoice_id IN (SELECT id FROM target_invoices))
       OR x.source_record_id IN (SELECT id FROM target_invoices)
  UNION ALL SELECT 'accounting_ar_bridge_event_versions', count(*) FROM public.accounting_ar_bridge_event_versions x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
       OR x.service_id IN (SELECT id FROM target_services)
       OR x.invoice_id IN (SELECT id FROM target_invoices)
  UNION ALL SELECT 'accounting_ar_bridge_journal_lines', count(*) FROM public.accounting_ar_bridge_journal_lines x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
       OR x.service_id IN (SELECT id FROM target_services)
       OR x.invoice_id IN (SELECT id FROM target_invoices)
  UNION ALL SELECT 'accounting_ar_bridge_journal_links', count(*) FROM public.accounting_ar_bridge_journal_links x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
       OR x.service_id IN (SELECT id FROM target_services)
       OR x.invoice_id IN (SELECT id FROM target_invoices)
  UNION ALL SELECT 'accounting_ap_bridge_events', count(*) FROM public.accounting_ap_bridge_events x
    WHERE x.id IN (SELECT event_id FROM public.accounting_ap_bridge_event_versions v
      WHERE v.service_id IN (SELECT id FROM target_services))
  UNION ALL SELECT 'accounting_ap_bridge_event_versions', count(*) FROM public.accounting_ap_bridge_event_versions x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'accounting_ap_bridge_journal_lines', count(*) FROM public.accounting_ap_bridge_journal_lines x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'accounting_ap_bridge_journal_links', count(*) FROM public.accounting_ap_bridge_journal_links x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'accounting_expense_bridge_events', count(*) FROM public.accounting_expense_bridge_events x
    WHERE x.id IN (SELECT event_id FROM public.accounting_expense_bridge_event_versions v
      WHERE v.service_id IN (SELECT id FROM target_services))
  UNION ALL SELECT 'accounting_expense_bridge_event_versions', count(*) FROM public.accounting_expense_bridge_event_versions x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'accounting_expense_bridge_journal_lines', count(*) FROM public.accounting_expense_bridge_journal_lines x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'accounting_expense_bridge_journal_links', count(*) FROM public.accounting_expense_bridge_journal_links x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'accounting_journal_line_versions', count(*) FROM public.accounting_journal_line_versions x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'accounting_journal_versions', count(*) FROM public.accounting_journal_versions jv
    WHERE EXISTS (SELECT 1 FROM public.accounting_journal_line_versions lv
      WHERE lv.profile_id = jv.profile_id AND lv.journal_id = jv.journal_id
        AND lv.journal_version = jv.version AND lv.service_id IN (SELECT id FROM target_services))
  UNION ALL SELECT 'accounting_journals', count(*) FROM public.accounting_journals j
    WHERE EXISTS (SELECT 1 FROM public.accounting_journal_line_versions lv
      WHERE lv.profile_id = j.profile_id AND lv.journal_id = j.id
        AND lv.service_id IN (SELECT id FROM target_services))
  UNION ALL SELECT 'accounting_journal_events', count(*) FROM public.accounting_journal_events je
    WHERE EXISTS (SELECT 1 FROM public.accounting_journal_line_versions lv
      WHERE lv.profile_id = je.profile_id AND lv.journal_id = je.journal_id
        AND lv.service_id IN (SELECT id FROM target_services))
  UNION ALL SELECT 'accounting_revenue_arrangements', count(*) FROM public.accounting_revenue_arrangements x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
       OR x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'accounting_revenue_recognition_events', count(*) FROM public.accounting_revenue_recognition_events x
    WHERE x.customer_id IN (SELECT customer_id FROM target_customers)
       OR x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'approved_billing_scopes', count(*) FROM target_scopes
  UNION ALL SELECT 'approved_billing_scope_items', count(*) FROM public.approved_billing_scope_items x
    WHERE x.approved_billing_scope_id IN (SELECT id FROM target_scopes)
  UNION ALL SELECT 'approved_commitments', count(*) FROM public.approved_commitments x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'business_document_links', count(*) FROM public.business_document_links x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'employee_cash_advances', count(*) FROM public.employee_cash_advances x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'event_cost_budgets', count(*) FROM public.event_cost_budgets x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'event_cost_close_versions', count(*) FROM public.event_cost_close_versions x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'event_cost_etc_forecasts', count(*) FROM public.event_cost_etc_forecasts x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'event_milestones', count(*) FROM public.event_milestones x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'expenses', count(*) FROM public.expenses x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'service_lifecycle_states', count(*) FROM public.service_lifecycle_states x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'service_procurement_package_requirements', count(*) FROM public.service_procurement_package_requirements x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'service_procurement_packages', count(*) FROM public.service_procurement_packages x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'service_procurement_requirements', count(*) FROM public.service_procurement_requirements x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'service_supplier_allocations', count(*) FROM public.service_supplier_allocations x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'service_tasks', count(*) FROM public.service_tasks x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'supplier_advance_payments', count(*) FROM public.supplier_advance_payments x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'supplier_bills', count(*) FROM public.supplier_bills x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'supplier_bookings', count(*) FROM public.supplier_bookings x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'supplier_payments', count(*) FROM public.supplier_payments x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'supplier_quotations', count(*) FROM public.supplier_quotations x
    WHERE x.service_id IN (SELECT id FROM target_services)
  UNION ALL SELECT 'quotation_items', count(*) FROM public.quotation_items x
    WHERE x.quotation_id IN (SELECT id FROM target_quotations)
),
security_metadata AS (
  SELECT c.relrowsecurity AS customers_rls_enabled,
         (SELECT count(*) FROM pg_policies p
          WHERE p.schemaname = 'public' AND p.tablename = 'customers') AS policy_count,
         has_table_privilege('service_role', 'public.customers', 'DELETE') AS service_role_delete_grant,
         has_table_privilege('anon', 'public.customers', 'DELETE') AS anon_delete_grant,
         has_table_privilege('authenticated', 'public.customers', 'DELETE') AS authenticated_delete_grant
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'customers'
)
SELECT jsonb_build_object(
  'recorded_at_cutoff', o.recorded_at_cutoff,
  'snapshot_id', o.snapshot_id,
  'target_customer_ids', (SELECT jsonb_agg(customer_id ORDER BY customer_id) FROM target_customers),
  'target_customer_count', (SELECT count(*) FROM target_customers),
  'customer_rows', (SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.customer_id), '[]'::jsonb) FROM customer_rows c),
  'target_service_count', (SELECT count(*) FROM target_services),
  'service_status_counts', (SELECT jsonb_object_agg(status, n) FROM
    (SELECT status, count(*) AS n FROM target_services GROUP BY status) x),
  'target_quotation_count', (SELECT count(*) FROM target_quotations),
  'quotation_status_counts', (SELECT jsonb_object_agg(status, n) FROM
    (SELECT status, count(*) AS n FROM target_quotations GROUP BY status) x),
  'quotation_grand_total_commercial_only', (SELECT COALESCE(sum(grand_total), 0)::text FROM target_quotations),
  'invoice_created_audit_references', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'invoice_id', COALESCE(a.invoice_id_ref, a.entity_id::text),
      'service_id', a.service_id_ref,
      'recorded_at', a.timestamp,
      'monetary_detail_keys', a.monetary_detail_keys
    ) ORDER BY a.timestamp), '[]'::jsonb)
    FROM relevant_audit a WHERE a.event_type = 'invoice.created'),
  'audit_action_groups', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'entity_type', g.entity_type,
      'action', g.action,
      'event_type', g.event_type,
      'event_count', g.event_count,
      'first_at', g.first_at,
      'last_at', g.last_at,
      'distinct_times', g.distinct_times
    ) ORDER BY g.entity_type, g.action, g.event_type), '[]'::jsonb)
    FROM audit_action_groups g),
  'approved_billing_scope_status_counts', (SELECT jsonb_object_agg(status, n) FROM
    (SELECT status, count(*) AS n FROM target_scopes GROUP BY status) x),
  'approved_billing_scopes_active_count', (SELECT count(*) FROM target_scopes WHERE status = 'approved'),
  'approved_billing_scopes_voided_count', (SELECT count(*) FROM target_scopes WHERE status = 'voided'),
  'downstream_relation_count', (SELECT count(*) FROM downstream_counts),
  'downstream_row_counts', (SELECT jsonb_object_agg(relation_name, row_count ORDER BY relation_name) FROM downstream_counts),
  'nonzero_downstream_relations', (SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'relation', relation_name, 'rows', row_count
    ) ORDER BY relation_name), '[]'::jsonb) FROM downstream_counts WHERE row_count > 0),
  'customer_delete_security_metadata', (SELECT to_jsonb(s) FROM security_metadata s)
) AS w11_m0_04_exact_nine_read_only_evidence
FROM observed o;
