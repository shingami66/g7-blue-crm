-- W11 M0-01 remediation-design dry run.
-- Read-only SELECT: exact 15 Owner-dispositioned Service/quotation pairs only.
-- Returns current state and all inspected direct downstream links; it does not
-- establish historical cause or financial impact and must not be used as repair SQL.
WITH target_cases(service_id, quotation_id, packet_commercial_sar) AS (
  VALUES
    ('02bdefe9-6a1e-4dfe-8732-985af7a5df49'::uuid, '307106ce-2a58-4901-bcb6-75abe12b03af'::uuid, 500::numeric),
    ('a131fafb-347b-476e-95c0-2329ad641805'::uuid, '401426ab-77df-4b6d-bd87-c511319f91b6'::uuid, 1000::numeric),
    ('e084cec0-c0d6-4429-8324-6c2a0f58db7f'::uuid, '51607035-b574-44c5-ae84-f7e676d7a4d8'::uuid, 800::numeric),
    ('3f7dfffb-3188-49d0-b4ac-3297a95a60e8'::uuid, '591744aa-4684-4463-a782-260af6f90d6a'::uuid, 1000::numeric),
    ('f01335fe-0807-46f2-ba02-0a84ca5a67c7'::uuid, '63317742-a4cc-4e6a-86ec-f44075f9a0e8'::uuid, 1000::numeric),
    ('c7ca6503-9746-4604-964a-cbe53c118009'::uuid, '87932c67-cdca-4d6c-bb20-691b59f8961f'::uuid, 800::numeric),
    ('e392d1da-bfd1-4b40-ac48-4e5c14afb7c0'::uuid, '90db681e-b166-479e-b4ed-6087266d1dfe'::uuid, 500::numeric),
    ('a267452a-802b-4d57-8b49-8d161aca508d'::uuid, 'afb16e3d-95d0-4823-918e-f7c8f52dd6f5'::uuid, 1000::numeric),
    ('52d67797-0fd5-466f-a810-2d3c14542b25'::uuid, 'bb5756e6-5488-4587-b475-63b8aa9620b3'::uuid, 1000::numeric),
    ('1ac06a50-043a-4ff2-b441-f709da735a52'::uuid, 'd286e869-df5f-4510-a5d8-fb3397f6f5e3'::uuid, 800::numeric),
    ('1421ecd2-4152-4676-8c41-ec292830e8a2'::uuid, 'daa17584-0180-4778-9316-826015b486ac'::uuid, 1000::numeric),
    ('804c7bbc-0048-4b6d-902c-c74f96d07cbc'::uuid, 'dcabf9d8-600b-438c-bd5d-0f2857785cd7'::uuid, 500::numeric),
    ('895638bd-6568-4e48-aac0-876eea91fa88'::uuid, 'e2fdd626-cdab-4f34-b7ca-2d52b5412e9d'::uuid, 1000::numeric),
    ('3802d0fa-11fe-44ad-b1f8-8503ea8cd8b5'::uuid, 'ec4717f4-ed0e-4879-aa6f-a4c3736d3556'::uuid, 1000::numeric),
    ('eb92008c-d17e-4eff-9f8b-99c5e5ab8ee0'::uuid, 'fd51e91e-af3a-4c0e-897f-0a5afbac766d'::uuid, 1000::numeric)
),
case_base AS (
  SELECT
    c.*,
    s.status AS service_status,
    s.deleted_at AS service_deleted_at,
    s.cancellation_reason IS NOT NULL AS service_cancellation_reason_present,
    s.customer_id,
    sl.legacy_status,
    sl.commercial_state,
    sl.payment_state,
    sl.readiness_state,
    sl.execution_state,
    sl.completion_state,
    sl.close_state,
    sl.state_version,
    q.id IS NOT NULL AS quotation_exists,
    q.service_id AS quotation_service_id,
    q.status AS quotation_status,
    q.is_deleted AS quotation_is_deleted,
    q.deleted_at AS quotation_deleted_at,
    q.superseded_at AS quotation_superseded_at,
    q.superseded_by_quotation_id,
    q.grand_total::text AS quotation_grand_total,
    cu.is_deleted AS customer_is_deleted,
    cu.deleted_at AS customer_deleted_at,
    ARRAY(
      SELECT a.id
      FROM public.approved_billing_scopes a
      WHERE a.service_id = c.service_id OR a.source_quotation_id = c.quotation_id
      ORDER BY a.scope_version, a.id
    ) AS scope_ids,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id,
        'source_quotation_id', a.source_quotation_id,
        'scope_version', a.scope_version,
        'status', a.status,
        'active', a.status = 'approved' AND a.voided_at IS NULL AND a.superseded_at IS NULL,
        'approved_at', a.approved_at,
        'voided_at', a.voided_at,
        'superseded_at', a.superseded_at,
        'accepted_grand_total', a.accepted_grand_total::text
      ) ORDER BY a.scope_version, a.id)
      FROM public.approved_billing_scopes a
      WHERE a.service_id = c.service_id OR a.source_quotation_id = c.quotation_id
    ), '[]'::jsonb) AS scope_rows
  FROM target_cases c
  LEFT JOIN public.services s ON s.id = c.service_id
  LEFT JOIN public.service_lifecycle_states sl ON sl.service_id = c.service_id
  LEFT JOIN public.quotations q ON q.id = c.quotation_id
  LEFT JOIN public.customers cu ON cu.id = s.customer_id
),
matched_invoices AS (
  SELECT DISTINCT
    b.service_id AS target_service_id,
    i.id,
    i.approved_quotation_id,
    i.approved_billing_scope_id,
    i.status,
    i.invoice_type,
    i.is_deleted,
    i.deleted_at
  FROM case_base b
  JOIN public.invoices i
    ON i.service_id = b.service_id
    OR i.approved_quotation_id = b.quotation_id
    OR i.approved_billing_scope_id = ANY(b.scope_ids)
),
matched_payments AS (
  SELECT DISTINCT i.target_service_id, p.id, p.invoice_id, p.status, p.is_deleted, p.deleted_at
  FROM matched_invoices i
  JOIN public.payments p ON p.invoice_id = i.id
),
matched_credit_adjustments AS (
  SELECT DISTINCT b.service_id AS target_service_id, a.id, a.invoice_id,
    a.source_approved_billing_scope_id
  FROM case_base b
  JOIN public.customer_internal_credit_adjustments a
    ON a.service_id = b.service_id
    OR a.invoice_id IN (SELECT i.id FROM matched_invoices i WHERE i.target_service_id = b.service_id)
    OR a.source_approved_billing_scope_id = ANY(b.scope_ids)
),
matched_source_ids AS (
  SELECT target_service_id, id AS source_id FROM matched_invoices
  UNION SELECT target_service_id, id FROM matched_payments
  UNION SELECT target_service_id, id FROM matched_credit_adjustments
  UNION
  SELECT b.service_id, r.id FROM public.customer_refunds r
    JOIN case_base b ON r.service_id = b.service_id
  UNION
  SELECT b.service_id, a.id FROM public.customer_receipt_allocations a
    JOIN case_base b ON a.invoice_id IN (SELECT i.id FROM matched_invoices i WHERE i.target_service_id = b.service_id)
  UNION
  SELECT b.service_id, a.id FROM public.customer_credit_applications a
    JOIN case_base b ON a.target_invoice_id IN (SELECT i.id FROM matched_invoices i WHERE i.target_service_id = b.service_id)
      OR a.source_credit_adjustment_id IN (SELECT x.id FROM matched_credit_adjustments x WHERE x.target_service_id = b.service_id)
  UNION
  SELECT b.service_id, r.id FROM public.customer_internal_credit_adjustment_reversals r
    JOIN case_base b ON r.source_credit_adjustment_id IN (SELECT x.id FROM matched_credit_adjustments x WHERE x.target_service_id = b.service_id)
),
case_report AS (
  SELECT
    b.service_id,
    b.quotation_id,
    b.packet_commercial_sar,
    b.service_status,
    b.service_deleted_at,
    b.service_cancellation_reason_present,
    b.quotation_exists,
    b.quotation_service_id,
    b.quotation_status,
    b.quotation_is_deleted,
    b.quotation_deleted_at,
    b.quotation_superseded_at,
    b.superseded_by_quotation_id,
    b.quotation_grand_total,
    jsonb_build_object(
      'legacy_status', b.legacy_status,
      'commercial_state', b.commercial_state,
      'payment_state', b.payment_state,
      'readiness_state', b.readiness_state,
      'execution_state', b.execution_state,
      'completion_state', b.completion_state,
      'close_state', b.close_state,
      'state_version', b.state_version
    ) AS lifecycle_state,
    jsonb_build_object('is_deleted', b.customer_is_deleted, 'deleted_at', b.customer_deleted_at) AS customer_state,
    jsonb_build_object(
      'scope_count', cardinality(b.scope_ids),
      'active_scope_count', (SELECT count(*) FROM public.approved_billing_scopes a WHERE a.id = ANY(b.scope_ids) AND a.status = 'approved' AND a.voided_at IS NULL AND a.superseded_at IS NULL),
      'rows', b.scope_rows
    ) AS scopes,
    jsonb_build_object(
      'count', (SELECT count(*) FROM matched_invoices i WHERE i.target_service_id = b.service_id),
      'rows', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', i.id, 'quotation_id', i.approved_quotation_id, 'scope_id', i.approved_billing_scope_id, 'status', i.status, 'type', i.invoice_type, 'is_deleted', i.is_deleted, 'deleted_at', i.deleted_at) ORDER BY i.id) FROM matched_invoices i WHERE i.target_service_id = b.service_id), '[]'::jsonb)
    ) AS invoices,
    jsonb_build_object(
      'count', (SELECT count(*) FROM matched_payments p WHERE p.target_service_id = b.service_id),
      'rows', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'invoice_id', p.invoice_id, 'status', p.status, 'is_deleted', p.is_deleted, 'deleted_at', p.deleted_at) ORDER BY p.id) FROM matched_payments p WHERE p.target_service_id = b.service_id), '[]'::jsonb)
    ) AS payments,
    jsonb_build_object(
      'receipt_allocation_count', (SELECT count(*) FROM public.customer_receipt_allocations a WHERE a.invoice_id IN (SELECT i.id FROM matched_invoices i WHERE i.target_service_id = b.service_id)),
      'credit_adjustments', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'invoice_id', a.invoice_id, 'scope_id', a.source_approved_billing_scope_id) ORDER BY a.id) FROM matched_credit_adjustments a WHERE a.target_service_id = b.service_id), '[]'::jsonb),
      'credit_application_count', (SELECT count(*) FROM public.customer_credit_applications a WHERE a.target_invoice_id IN (SELECT i.id FROM matched_invoices i WHERE i.target_service_id = b.service_id) OR a.source_credit_adjustment_id IN (SELECT c.id FROM matched_credit_adjustments c WHERE c.target_service_id = b.service_id)),
      'refund_count', (SELECT count(*) FROM public.customer_refunds r WHERE r.service_id = b.service_id OR r.source_credit_adjustment_id IN (SELECT c.id FROM matched_credit_adjustments c WHERE c.target_service_id = b.service_id)),
      'credit_reversal_count', (SELECT count(*) FROM public.customer_internal_credit_adjustment_reversals r WHERE r.source_credit_adjustment_id IN (SELECT c.id FROM matched_credit_adjustments c WHERE c.target_service_id = b.service_id))
    ) AS customer_financial_links,
    jsonb_build_object(
      'approved_commitment_count', (SELECT count(*) FROM public.approved_commitments x WHERE x.service_id = b.service_id),
      'commitment_balance_count', (SELECT count(*) FROM public.approved_commitment_balances x WHERE x.service_id = b.service_id),
      'service_receipt_count', (SELECT count(*) FROM public.service_receipts x WHERE x.service_id = b.service_id),
      'supplier_allocation_count', (SELECT count(*) FROM public.service_supplier_allocations x WHERE x.service_id = b.service_id OR x.approved_quotation_id = b.quotation_id),
      'supplier_booking_count', (SELECT count(*) FROM public.supplier_bookings x WHERE x.service_id = b.service_id),
      'expense_count', (SELECT count(*) FROM public.expenses x WHERE x.service_id = b.service_id)
    ) AS service_operational_links,
    jsonb_build_object(
      'ar_bridge_version_count', (SELECT count(*) FROM public.accounting_ar_bridge_event_versions x WHERE x.service_id = b.service_id OR x.invoice_id IN (SELECT i.id FROM matched_invoices i WHERE i.target_service_id = b.service_id)),
      'ar_bridge_source_event_count', (SELECT count(*) FROM public.accounting_ar_bridge_events x WHERE x.source_record_id IN (SELECT s.source_id FROM matched_source_ids s WHERE s.target_service_id = b.service_id)),
      'ar_journal_line_count', (SELECT count(*) FROM public.accounting_ar_bridge_journal_lines x WHERE x.service_id = b.service_id OR x.invoice_id IN (SELECT i.id FROM matched_invoices i WHERE i.target_service_id = b.service_id) OR x.source_record_id IN (SELECT s.source_id FROM matched_source_ids s WHERE s.target_service_id = b.service_id)),
      'ar_journal_link_count', (SELECT count(*) FROM public.accounting_ar_bridge_journal_links x WHERE x.service_id = b.service_id OR x.invoice_id IN (SELECT i.id FROM matched_invoices i WHERE i.target_service_id = b.service_id) OR x.source_record_id IN (SELECT s.source_id FROM matched_source_ids s WHERE s.target_service_id = b.service_id)),
      'ap_bridge_version_count', (SELECT count(*) FROM public.accounting_ap_bridge_event_versions x WHERE x.service_id = b.service_id OR x.receipt_id IN (SELECT r.id FROM public.service_receipts r WHERE r.service_id = b.service_id)),
      'ap_journal_line_count', (SELECT count(*) FROM public.accounting_ap_bridge_journal_lines x WHERE x.service_id = b.service_id OR x.receipt_id IN (SELECT r.id FROM public.service_receipts r WHERE r.service_id = b.service_id)),
      'ap_journal_link_count', (SELECT count(*) FROM public.accounting_ap_bridge_journal_links x WHERE x.service_id = b.service_id OR x.receipt_id IN (SELECT r.id FROM public.service_receipts r WHERE r.service_id = b.service_id)),
      'expense_bridge_version_count', (SELECT count(*) FROM public.accounting_expense_bridge_event_versions x WHERE x.service_id = b.service_id OR x.expense_id IN (SELECT e.id FROM public.expenses e WHERE e.service_id = b.service_id)),
      'expense_journal_line_count', (SELECT count(*) FROM public.accounting_expense_bridge_journal_lines x WHERE x.service_id = b.service_id OR x.expense_id IN (SELECT e.id FROM public.expenses e WHERE e.service_id = b.service_id)),
      'expense_journal_link_count', (SELECT count(*) FROM public.accounting_expense_bridge_journal_links x WHERE x.service_id = b.service_id OR x.expense_id IN (SELECT e.id FROM public.expenses e WHERE e.service_id = b.service_id)),
      'revenue_arrangement_count', (SELECT count(*) FROM public.accounting_revenue_arrangements x WHERE x.service_id = b.service_id OR x.approved_billing_scope_id = ANY(b.scope_ids)),
      'revenue_recognition_event_count', (SELECT count(*) FROM public.accounting_revenue_recognition_events x WHERE x.service_id = b.service_id),
      'revenue_recognition_journal_line_count', (SELECT count(*) FROM public.accounting_revenue_recognition_journal_lines x WHERE x.service_id = b.service_id),
      'revenue_recognition_journal_link_count', (SELECT count(*) FROM public.accounting_revenue_recognition_journal_links x WHERE x.recognition_event_id IN (SELECT e.id FROM public.accounting_revenue_recognition_events e WHERE e.service_id = b.service_id)),
      'accounting_journal_line_version_count', (SELECT count(*) FROM public.accounting_journal_line_versions x WHERE x.service_id = b.service_id),
      'accounting_foundation_event_count', (SELECT count(*) FROM public.accounting_foundation_events x WHERE x.entity_id = b.service_id OR x.entity_id = b.quotation_id OR x.entity_id = ANY(b.scope_ids)),
      'linked_journal_version_count', (SELECT count(*) FROM public.accounting_journal_versions x WHERE x.journal_id IN (
        SELECT journal_id FROM public.accounting_ar_bridge_journal_links x WHERE x.service_id = b.service_id OR x.invoice_id IN (SELECT i.id FROM matched_invoices i WHERE i.target_service_id = b.service_id)
        UNION SELECT journal_id FROM public.accounting_ap_bridge_journal_links x WHERE x.service_id = b.service_id
        UNION SELECT journal_id FROM public.accounting_expense_bridge_journal_links x WHERE x.service_id = b.service_id
        UNION SELECT journal_id FROM public.accounting_revenue_recognition_journal_links x WHERE x.recognition_event_id IN (SELECT e.id FROM public.accounting_revenue_recognition_events e WHERE e.service_id = b.service_id)
      )),
      'linked_journal_event_count', (SELECT count(*) FROM public.accounting_journal_events x WHERE x.journal_id IN (
        SELECT journal_id FROM public.accounting_ar_bridge_journal_links x WHERE x.service_id = b.service_id OR x.invoice_id IN (SELECT i.id FROM matched_invoices i WHERE i.target_service_id = b.service_id)
        UNION SELECT journal_id FROM public.accounting_ap_bridge_journal_links x WHERE x.service_id = b.service_id
        UNION SELECT journal_id FROM public.accounting_expense_bridge_journal_links x WHERE x.service_id = b.service_id
        UNION SELECT journal_id FROM public.accounting_revenue_recognition_journal_links x WHERE x.recognition_event_id IN (SELECT e.id FROM public.accounting_revenue_recognition_events e WHERE e.service_id = b.service_id)
      ))
    ) AS accounting_links,
    jsonb_build_object(
      'count', (SELECT count(*) FROM public.audit_logs a WHERE a.entity_id = b.service_id OR a.entity_id = b.quotation_id OR a.entity_id = ANY(b.scope_ids)),
      'actions', COALESCE((SELECT jsonb_agg(jsonb_build_object('entity_type', a.entity_type, 'action', a.action, 'event_type', a.details ->> 'event_type', 'timestamp', a.timestamp) ORDER BY a.timestamp, a.id) FROM public.audit_logs a WHERE a.entity_id = b.service_id OR a.entity_id = b.quotation_id OR a.entity_id = ANY(b.scope_ids)), '[]'::jsonb)
    ) AS audit_coverage
  FROM case_base b
)
SELECT
  current_timestamp AS observed_at,
  txid_current_snapshot()::text AS snapshot_id,
  (SELECT count(*) FROM target_cases) AS target_case_count,
  (SELECT sum(packet_commercial_sar) FROM target_cases)::text AS packet_commercial_sar_total,
  md5((SELECT string_agg(service_id::text || ':' || quotation_id::text, ',' ORDER BY service_id) FROM target_cases)) AS target_pair_set_md5,
  COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.service_id), '[]'::jsonb) AS cases
FROM case_report r;
