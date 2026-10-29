-- W11 M0-01: exact one-case Completed G8 Owner-authorized DEV authority retirement.
-- G8 provenance is VERIFIED; the historical Completed mechanism and financial impact remain UNKNOWN.
-- This additive migration preserves the fixed 14-case operation and adds no general-purpose repair authority.

BEGIN;

DO $migration_preflight$
BEGIN
    IF to_regprocedure('public._w11_m0_01_retirement_targets()') IS NULL
        OR to_regprocedure('public._w11_m0_01_downstream_link_counts()') IS NULL
        OR to_regprocedure('public._w11_m0_01_valid_state_count(text,text,timestamptz)') IS NULL
        OR to_regprocedure('public.enforce_w11_m0_01_retirement_context()') IS NULL
        OR to_regprocedure('public.retire_w11_m0_01_approved_abs(text)') IS NULL
        OR to_regprocedure('public.check_approved_billing_scopes_before_write()') IS NULL
        OR to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regclass('public.approved_billing_scope_items') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_required_objects_missing';
    END IF;

    IF to_regprocedure('public._w11_m0_01_completed_g8_targets()') IS NOT NULL
        OR to_regprocedure('public._w11_m0_01_completed_g8_downstream_link_counts()') IS NOT NULL
        OR to_regprocedure('public._w11_m0_01_completed_g8_valid_state_count(text,text,timestamptz)') IS NOT NULL
        OR to_regprocedure('public.retire_w11_m0_01_completed_g8_abs(text)') IS NOT NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_objects_already_exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger AS tg
        WHERE tg.tgrelid = to_regclass('public.approved_billing_scopes')
          AND tg.tgfoid = to_regprocedure('public.check_approved_billing_scopes_before_write()')
          AND NOT tg.tgisinternal
    ) OR NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_trigger AS tg
        WHERE tg.tgrelid = to_regclass('public.approved_billing_scopes')
          AND tg.tgfoid = to_regprocedure('public.enforce_w11_m0_01_retirement_context()')
          AND tg.tgname = 'w11_m0_01_retirement_context_guard_trg'
          AND NOT tg.tgisinternal
    )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_required_triggers_missing';
    END IF;
END;
$migration_preflight$;

CREATE FUNCTION public._w11_m0_01_completed_g8_targets()
RETURNS TABLE (
    service_id uuid,
    quotation_id uuid,
    abs_id uuid,
    expected_service_deleted_at timestamptz,
    expected_customer_id uuid,
    expected_lifecycle_updated_at timestamptz,
    expected_total numeric,
    expected_item_digest text
)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog, public
AS $function$
    SELECT
        'c7ca6503-9746-4604-964a-cbe53c118009'::uuid,
        '87932c67-cdca-4d6c-bb20-691b59f8961f'::uuid,
        '513f1e78-5bfa-4ff2-a8a8-6986498d1987'::uuid,
        '2026-08-17 10:13:40.350+00'::timestamptz,
        '21db71fc-ac14-44c1-b5f6-03fcfcf64fc9'::uuid,
        '2026-08-17 10:13:40.294923+00'::timestamptz,
        800::numeric,
        '0f702aaea049a071bdcc9b13de930dd8'::text;
$function$;

CREATE FUNCTION public._w11_m0_01_completed_g8_downstream_link_counts()
RETURNS TABLE (relation_name text, link_count bigint)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $function$
WITH targets AS (
    SELECT t.service_id, t.quotation_id, t.abs_id
    FROM public._w11_m0_01_completed_g8_targets() AS t
),
matched_invoices AS (
    SELECT DISTINCT t.service_id AS target_service_id, i.id
    FROM targets AS t
    JOIN public.invoices AS i
      ON i.service_id = t.service_id
      OR i.approved_quotation_id = t.quotation_id
      OR i.approved_billing_scope_id = t.abs_id
),
matched_payments AS (
    SELECT DISTINCT i.target_service_id, p.id
    FROM matched_invoices AS i
    JOIN public.payments AS p ON p.invoice_id = i.id
),
matched_credit_adjustments AS (
    SELECT DISTINCT t.service_id AS target_service_id, a.id
    FROM targets AS t
    JOIN public.customer_internal_credit_adjustments AS a
      ON a.service_id = t.service_id
      OR a.invoice_id IN (SELECT i.id FROM matched_invoices AS i WHERE i.target_service_id = t.service_id)
      OR a.source_approved_billing_scope_id = t.abs_id
      OR a.successor_approved_billing_scope_id = t.abs_id
),
matched_credit_applications AS (
    SELECT DISTINCT t.service_id AS target_service_id, a.id
    FROM targets AS t
    JOIN public.customer_credit_applications AS a
      ON a.target_invoice_id IN (SELECT i.id FROM matched_invoices AS i WHERE i.target_service_id = t.service_id)
      OR a.source_credit_adjustment_id IN (SELECT c.id FROM matched_credit_adjustments AS c WHERE c.target_service_id = t.service_id)
),
matched_refunds AS (
    SELECT DISTINCT t.service_id AS target_service_id, r.id
    FROM targets AS t
    JOIN public.customer_refunds AS r
      ON r.service_id = t.service_id
      OR r.source_credit_adjustment_id IN (SELECT c.id FROM matched_credit_adjustments AS c WHERE c.target_service_id = t.service_id)
),
matched_receipts AS (
    SELECT DISTINCT t.service_id AS target_service_id, r.id
    FROM targets AS t
    JOIN public.service_receipts AS r ON r.service_id = t.service_id
),
matched_commitments AS (
    SELECT DISTINCT t.service_id AS target_service_id, c.id
    FROM targets AS t
    JOIN public.approved_commitments AS c ON c.service_id = t.service_id
),
matched_expenses AS (
    SELECT DISTINCT t.service_id AS target_service_id, e.id
    FROM targets AS t
    JOIN public.expenses AS e ON e.service_id = t.service_id
),
matched_procurement_requirements AS (
    SELECT DISTINCT t.service_id AS target_service_id, r.id
    FROM targets AS t
    JOIN public.service_procurement_requirements AS r ON r.service_id = t.service_id
),
matched_procurement_packages AS (
    SELECT DISTINCT t.service_id AS target_service_id, p.id
    FROM targets AS t
    JOIN public.service_procurement_packages AS p ON p.service_id = t.service_id
),
matched_supplier_quotations AS (
    SELECT DISTINCT t.service_id AS target_service_id, q.id
    FROM targets AS t
    JOIN public.supplier_quotations AS q ON q.service_id = t.service_id
),
matched_supplier_advances AS (
    SELECT DISTINCT t.service_id AS target_service_id, a.id
    FROM targets AS t
    JOIN public.supplier_advances AS a
      ON a.service_id = t.service_id
      OR a.commitment_id IN (SELECT c.id FROM matched_commitments AS c WHERE c.target_service_id = t.service_id)
),
matched_supplier_bills AS (
    SELECT DISTINCT t.service_id AS target_service_id, b.id
    FROM targets AS t
    JOIN public.supplier_bills AS b
      ON b.service_id = t.service_id
      OR b.service_receipt_id IN (SELECT r.id FROM matched_receipts AS r WHERE r.target_service_id = t.service_id)
      OR b.commitment_id IN (SELECT c.id FROM matched_commitments AS c WHERE c.target_service_id = t.service_id)
),
matched_supplier_advance_payments AS (
    SELECT DISTINCT t.service_id AS target_service_id, p.id
    FROM targets AS t
    JOIN public.supplier_advance_payments AS p
      ON p.service_id = t.service_id
      OR p.supplier_advance_id IN (SELECT a.id FROM matched_supplier_advances AS a WHERE a.target_service_id = t.service_id)
),
matched_supplier_advance_refunds AS (
    SELECT DISTINCT t.service_id AS target_service_id, r.id
    FROM targets AS t
    JOIN public.supplier_advance_refunds AS r
      ON r.supplier_advance_id IN (SELECT a.id FROM matched_supplier_advances AS a WHERE a.target_service_id = t.service_id)
),
matched_supplier_payments AS (
    SELECT DISTINCT t.service_id AS target_service_id, p.id
    FROM targets AS t
    JOIN public.supplier_payments AS p
      ON p.service_id = t.service_id
      OR p.supplier_bill_id IN (SELECT b.id FROM matched_supplier_bills AS b WHERE b.target_service_id = t.service_id)
),
matched_source_ids AS (
    SELECT service_id AS target_service_id, service_id AS source_id FROM targets
    UNION SELECT service_id, quotation_id FROM targets
    UNION SELECT service_id, abs_id FROM targets
    UNION SELECT target_service_id, id FROM matched_invoices
    UNION
    SELECT target_service_id, id FROM matched_payments
    UNION
    SELECT target_service_id, id FROM matched_credit_adjustments
    UNION
    SELECT target_service_id, id FROM matched_credit_applications
    UNION
    SELECT target_service_id, id FROM matched_refunds
    UNION
    SELECT target_service_id, id FROM matched_receipts
    UNION
    SELECT target_service_id, id FROM matched_commitments
    UNION SELECT target_service_id, id FROM matched_expenses
    UNION SELECT target_service_id, id FROM matched_procurement_requirements
    UNION SELECT target_service_id, id FROM matched_procurement_packages
    UNION SELECT target_service_id, id FROM matched_supplier_quotations
    UNION SELECT target_service_id, id FROM matched_supplier_advances
    UNION SELECT target_service_id, id FROM matched_supplier_bills
    UNION SELECT target_service_id, id FROM matched_supplier_advance_payments
    UNION SELECT target_service_id, id FROM matched_supplier_advance_refunds
    UNION SELECT target_service_id, id FROM matched_supplier_payments
    UNION
    SELECT t.service_id, a.id FROM public.customer_receipt_allocations AS a
    JOIN targets AS t ON a.invoice_id IN (SELECT i.id FROM matched_invoices AS i WHERE i.target_service_id = t.service_id)
    UNION
    SELECT target_service_id, id FROM matched_credit_applications
    UNION
    SELECT t.service_id, r.id FROM public.customer_internal_credit_adjustment_reversals AS r
    JOIN targets AS t ON r.source_credit_adjustment_id IN (SELECT c.id FROM matched_credit_adjustments AS c WHERE c.target_service_id = t.service_id)
    UNION
    SELECT t.service_id, r.id FROM public.customer_credit_application_reversals AS r
    JOIN targets AS t ON r.source_application_id IN (SELECT a.id FROM matched_credit_applications AS a WHERE a.target_service_id = t.service_id)
    UNION
    SELECT t.service_id, r.id FROM public.customer_refund_reversals AS r
    JOIN targets AS t ON r.source_refund_id IN (SELECT x.id FROM matched_refunds AS x WHERE x.target_service_id = t.service_id)
    UNION
    SELECT t.service_id, r.id FROM public.customer_receipt_reversals AS r
    JOIN targets AS t ON r.payment_id IN (SELECT p.id FROM matched_payments AS p WHERE p.target_service_id = t.service_id)
    UNION
    SELECT t.service_id, x.id FROM public.service_supplier_allocations AS x
    JOIN targets AS t ON x.service_id = t.service_id OR x.approved_quotation_id = t.quotation_id
    UNION
    SELECT t.service_id, x.id FROM public.supplier_bookings AS x
    JOIN targets AS t ON x.service_id = t.service_id
    UNION
    SELECT t.service_id, x.id FROM public.employee_cash_advances AS x
    JOIN targets AS t ON x.service_id = t.service_id
    UNION
    SELECT t.service_id, x.id FROM public.petty_cash_transactions AS x
    JOIN targets AS t ON x.expense_id IN (SELECT e.id FROM matched_expenses AS e WHERE e.target_service_id = t.service_id)
    UNION
    SELECT t.service_id, x.id FROM public.cash_advance_expense_settlements AS x
    JOIN targets AS t ON x.expense_id IN (SELECT e.id FROM matched_expenses AS e WHERE e.target_service_id = t.service_id)
),
matched_ar_events AS (
    SELECT e.id
    FROM public.accounting_ar_bridge_events AS e
    WHERE e.source_record_id IN (SELECT source_id FROM matched_source_ids)
),
matched_ap_events AS (
    SELECT e.id
    FROM public.accounting_ap_bridge_events AS e
    WHERE e.source_record_id IN (SELECT source_id FROM matched_source_ids)
),
matched_expense_events AS (
    SELECT e.id
    FROM public.accounting_expense_bridge_events AS e
    WHERE e.source_record_id IN (SELECT source_id FROM matched_source_ids)
),
linked_journal_ids AS (
    SELECT journal_id FROM public.accounting_ar_bridge_journal_links AS j
    JOIN targets AS t ON j.service_id = t.service_id
       OR j.invoice_id IN (SELECT i.id FROM matched_invoices AS i WHERE i.target_service_id = t.service_id)
       OR j.source_record_id IN (SELECT s.source_id FROM matched_source_ids AS s WHERE s.target_service_id = t.service_id)
       OR j.event_id IN (SELECT e.id FROM matched_ar_events AS e)
    UNION
    SELECT journal_id FROM public.accounting_ap_bridge_journal_links AS j
    JOIN targets AS t ON j.service_id = t.service_id
       OR j.receipt_id IN (SELECT r.id FROM matched_receipts AS r WHERE r.target_service_id = t.service_id)
       OR j.bill_id IN (SELECT b.id FROM matched_supplier_bills AS b WHERE b.target_service_id = t.service_id)
       OR j.advance_id IN (SELECT a.id FROM matched_supplier_advances AS a WHERE a.target_service_id = t.service_id)
       OR j.source_record_id IN (SELECT s.source_id FROM matched_source_ids AS s WHERE s.target_service_id = t.service_id)
       OR j.event_id IN (SELECT e.id FROM matched_ap_events AS e)
    UNION
    SELECT journal_id FROM public.accounting_expense_bridge_journal_links AS j
    JOIN targets AS t ON j.service_id = t.service_id
       OR j.expense_id IN (SELECT e.id FROM matched_expenses AS e WHERE e.target_service_id = t.service_id)
       OR j.advance_id IN (SELECT a.id FROM public.employee_cash_advances AS a WHERE a.service_id = t.service_id)
       OR j.source_record_id IN (SELECT s.source_id FROM matched_source_ids AS s WHERE s.target_service_id = t.service_id)
       OR j.event_id IN (SELECT e.id FROM matched_expense_events AS e)
    UNION
    SELECT journal_id FROM public.accounting_revenue_recognition_journal_links AS j
    JOIN targets AS t ON j.recognition_event_id IN (
        SELECT e.id FROM public.accounting_revenue_recognition_events AS e WHERE e.service_id = t.service_id
    )
),
link_counts AS (
    SELECT 'invoices'::text AS relation_name, count(*)::bigint AS link_count
    FROM public.invoices AS i
    WHERE EXISTS (SELECT 1 FROM targets AS t WHERE i.service_id = t.service_id OR i.approved_quotation_id = t.quotation_id OR i.approved_billing_scope_id = t.abs_id)
    UNION ALL SELECT 'payments', count(*) FROM public.payments AS p
    WHERE p.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
    UNION ALL SELECT 'customer_receipt_allocations', count(*) FROM public.customer_receipt_allocations AS a
    WHERE a.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
    UNION ALL SELECT 'customer_internal_credit_adjustments', count(*) FROM public.customer_internal_credit_adjustments AS a
    WHERE EXISTS (SELECT 1 FROM targets AS t WHERE a.service_id = t.service_id OR a.source_approved_billing_scope_id = t.abs_id OR a.successor_approved_billing_scope_id = t.abs_id)
       OR a.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
    UNION ALL SELECT 'customer_credit_adjustment_balances', count(*) FROM public.customer_credit_adjustment_balances AS a
    WHERE EXISTS (SELECT 1 FROM targets AS t WHERE a.service_id = t.service_id OR a.source_approved_billing_scope_id = t.abs_id OR a.successor_approved_billing_scope_id = t.abs_id)
       OR a.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
       OR a.credit_adjustment_id IN (SELECT c.id FROM matched_credit_adjustments AS c)
    UNION ALL SELECT 'customer_credit_applications', count(*) FROM public.customer_credit_applications AS a
    WHERE a.id IN (SELECT c.id FROM matched_credit_applications AS c)
    UNION ALL SELECT 'customer_credit_application_reversals', count(*) FROM public.customer_credit_application_reversals AS r
    WHERE r.source_application_id IN (SELECT a.id FROM matched_credit_applications AS a)
    UNION ALL SELECT 'customer_refunds', count(*) FROM public.customer_refunds AS r
    WHERE r.id IN (SELECT x.id FROM matched_refunds AS x)
    UNION ALL SELECT 'customer_refund_reversals', count(*) FROM public.customer_refund_reversals AS r
    WHERE r.source_refund_id IN (SELECT x.id FROM matched_refunds AS x)
    UNION ALL SELECT 'customer_internal_credit_adjustment_reversals', count(*) FROM public.customer_internal_credit_adjustment_reversals AS r
    WHERE r.source_credit_adjustment_id IN (SELECT c.id FROM matched_credit_adjustments AS c)
    UNION ALL SELECT 'invoice_items', count(*) FROM public.invoice_items AS x
    WHERE x.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
    UNION ALL SELECT 'invoice_draft_update_mutations', count(*) FROM public.invoice_draft_update_mutations AS x
    WHERE x.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
    UNION ALL SELECT 'customer_invoice_receivable_balances', count(*) FROM public.customer_invoice_receivable_balances AS x
    WHERE x.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
    UNION ALL SELECT 'customer_invoice_settlement_balances', count(*) FROM public.customer_invoice_settlement_balances AS x
    WHERE x.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
    UNION ALL SELECT 'customer_receipt_balances', count(*) FROM public.customer_receipt_balances AS x
    WHERE x.payment_id IN (SELECT p.id FROM matched_payments AS p)
    UNION ALL SELECT 'customer_receipt_reversals', count(*) FROM public.customer_receipt_reversals AS x
    WHERE x.payment_id IN (SELECT p.id FROM matched_payments AS p)
    UNION ALL SELECT 'approved_commitments', count(*) FROM public.approved_commitments AS x
    WHERE x.id IN (SELECT c.id FROM matched_commitments AS c)
    UNION ALL SELECT 'approved_commitment_balances', count(*) FROM public.approved_commitment_balances AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'approved_commitment_amendments', count(*) FROM public.approved_commitment_amendments AS x
    WHERE x.commitment_id IN (SELECT c.id FROM matched_commitments AS c)
    UNION ALL SELECT 'approved_commitment_documents', count(*) FROM public.approved_commitment_documents AS x
    WHERE x.commitment_id IN (SELECT c.id FROM matched_commitments AS c)
    UNION ALL SELECT 'service_receipts', count(*) FROM public.service_receipts AS x
    WHERE x.id IN (SELECT r.id FROM matched_receipts AS r)
    UNION ALL SELECT 'service_receipt_documents', count(*) FROM public.service_receipt_documents AS x
    WHERE x.receipt_id IN (SELECT r.id FROM matched_receipts AS r)
    UNION ALL SELECT 'service_receipt_corrections', count(*) FROM public.service_receipt_corrections AS x
    WHERE x.receipt_id IN (SELECT r.id FROM matched_receipts AS r)
    UNION ALL SELECT 'service_supplier_allocations', count(*) FROM public.service_supplier_allocations AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
       OR x.approved_quotation_id IN (SELECT t.quotation_id FROM targets AS t)
    UNION ALL SELECT 'supplier_bookings', count(*) FROM public.supplier_bookings AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'projects', count(*) FROM public.projects AS x
    WHERE x.quotation_id IN (SELECT t.quotation_id FROM targets AS t)
    UNION ALL SELECT 'project_tasks', count(*) FROM public.project_tasks AS x
    WHERE x.project_id IN (
        SELECT p.id FROM public.projects AS p WHERE p.quotation_id IN (SELECT t.quotation_id FROM targets AS t)
    )
    UNION ALL SELECT 'business_document_links', count(*) FROM public.business_document_links AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'service_tasks', count(*) FROM public.service_tasks AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'event_milestones', count(*) FROM public.event_milestones AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'service_procurement_requirements', count(*) FROM public.service_procurement_requirements AS x
    WHERE x.id IN (SELECT r.id FROM matched_procurement_requirements AS r)
    UNION ALL SELECT 'service_procurement_candidates', count(*) FROM public.service_procurement_candidates AS x
    WHERE x.requirement_id IN (SELECT r.id FROM matched_procurement_requirements AS r)
    UNION ALL SELECT 'service_procurement_candidate_documents', count(*) FROM public.service_procurement_candidate_documents AS x
    WHERE x.requirement_id IN (SELECT r.id FROM matched_procurement_requirements AS r)
    UNION ALL SELECT 'service_procurement_packages', count(*) FROM public.service_procurement_packages AS x
    WHERE x.id IN (SELECT p.id FROM matched_procurement_packages AS p)
    UNION ALL SELECT 'service_procurement_package_requirements', count(*) FROM public.service_procurement_package_requirements AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
       OR x.package_id IN (SELECT p.id FROM matched_procurement_packages AS p)
       OR x.legacy_requirement_id IN (SELECT r.id FROM matched_procurement_requirements AS r)
    UNION ALL SELECT 'supplier_quotations', count(*) FROM public.supplier_quotations AS x
    WHERE x.id IN (SELECT q.id FROM matched_supplier_quotations AS q)
    UNION ALL SELECT 'supplier_quotation_documents', count(*) FROM public.supplier_quotation_documents AS x
    WHERE x.quotation_id IN (SELECT q.id FROM matched_supplier_quotations AS q)
    UNION ALL SELECT 'supplier_quotation_lines', count(*) FROM public.supplier_quotation_lines AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
       OR x.quotation_id IN (SELECT q.id FROM matched_supplier_quotations AS q)
       OR x.package_requirement_id IN (
           SELECT r.id FROM public.service_procurement_package_requirements AS r
           WHERE r.service_id IN (SELECT t.service_id FROM targets AS t)
              OR r.package_id IN (SELECT p.id FROM matched_procurement_packages AS p)
       )
    UNION ALL SELECT 'supplier_quotation_requirements', count(*) FROM public.supplier_quotation_requirements AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
       OR x.quotation_id IN (SELECT q.id FROM matched_supplier_quotations AS q)
       OR x.requirement_id IN (SELECT r.id FROM matched_procurement_requirements AS r)
    UNION ALL SELECT 'expenses', count(*) FROM public.expenses AS x
    WHERE x.id IN (SELECT e.id FROM matched_expenses AS e)
    UNION ALL SELECT 'expense_documents', count(*) FROM public.expense_documents AS x
    WHERE x.expense_id IN (SELECT e.id FROM matched_expenses AS e)
    UNION ALL SELECT 'expense_evidence_exceptions', count(*) FROM public.expense_evidence_exceptions AS x
    WHERE x.expense_id IN (SELECT e.id FROM matched_expenses AS e)
    UNION ALL SELECT 'expense_reimbursement_settlements', count(*) FROM public.expense_reimbursement_settlements AS x
    WHERE x.expense_id IN (SELECT e.id FROM matched_expenses AS e)
    UNION ALL SELECT 'petty_cash_transactions', count(*) FROM public.petty_cash_transactions AS x
    WHERE x.expense_id IN (SELECT e.id FROM matched_expenses AS e)
    UNION ALL SELECT 'cash_advance_expense_settlements', count(*) FROM public.cash_advance_expense_settlements AS x
    WHERE x.expense_id IN (SELECT e.id FROM matched_expenses AS e)
    UNION ALL SELECT 'employee_cash_advances', count(*) FROM public.employee_cash_advances AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'expense_accountability_summaries', count(*) FROM public.expense_accountability_summaries AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'event_cost_budgets', count(*) FROM public.event_cost_budgets AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'event_cost_close_versions', count(*) FROM public.event_cost_close_versions AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'event_cost_close_reopenings', count(*) FROM public.event_cost_close_reopenings AS x
    WHERE x.event_cost_close_version_id IN (
        SELECT v.id FROM public.event_cost_close_versions AS v WHERE v.service_id IN (SELECT t.service_id FROM targets AS t)
    )
    UNION ALL SELECT 'event_cost_etc_forecasts', count(*) FROM public.event_cost_etc_forecasts AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'supplier_advances', count(*) FROM public.supplier_advances AS x
    WHERE x.id IN (SELECT a.id FROM matched_supplier_advances AS a)
    UNION ALL SELECT 'supplier_advance_balances', count(*) FROM public.supplier_advance_balances AS x
    WHERE x.supplier_advance_id IN (SELECT a.id FROM matched_supplier_advances AS a)
    UNION ALL SELECT 'supplier_advance_commitment_balances', count(*) FROM public.supplier_advance_commitment_balances AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'supplier_advance_allocations', count(*) FROM public.supplier_advance_allocations AS x
    WHERE x.supplier_advance_id IN (SELECT a.id FROM matched_supplier_advances AS a)
       OR x.supplier_bill_id IN (SELECT b.id FROM matched_supplier_bills AS b)
    UNION ALL SELECT 'supplier_advance_authorization_documents', count(*) FROM public.supplier_advance_authorization_documents AS x
    WHERE x.supplier_advance_id IN (SELECT a.id FROM matched_supplier_advances AS a)
    UNION ALL SELECT 'supplier_advance_authorization_releases', count(*) FROM public.supplier_advance_authorization_releases AS x
    WHERE x.supplier_advance_id IN (SELECT a.id FROM matched_supplier_advances AS a)
    UNION ALL SELECT 'supplier_advance_payments', count(*) FROM public.supplier_advance_payments AS x
    WHERE x.id IN (SELECT p.id FROM matched_supplier_advance_payments AS p)
    UNION ALL SELECT 'supplier_advance_payment_documents', count(*) FROM public.supplier_advance_payment_documents AS x
    WHERE x.supplier_advance_payment_id IN (SELECT p.id FROM matched_supplier_advance_payments AS p)
    UNION ALL SELECT 'supplier_advance_payment_reversals', count(*) FROM public.supplier_advance_payment_reversals AS x
    WHERE x.supplier_advance_payment_id IN (SELECT p.id FROM matched_supplier_advance_payments AS p)
    UNION ALL SELECT 'supplier_advance_refunds', count(*) FROM public.supplier_advance_refunds AS x
    WHERE x.id IN (SELECT r.id FROM matched_supplier_advance_refunds AS r)
    UNION ALL SELECT 'supplier_advance_refund_documents', count(*) FROM public.supplier_advance_refund_documents AS x
    WHERE x.supplier_advance_refund_id IN (SELECT r.id FROM matched_supplier_advance_refunds AS r)
    UNION ALL SELECT 'supplier_bills', count(*) FROM public.supplier_bills AS x
    WHERE x.id IN (SELECT b.id FROM matched_supplier_bills AS b)
    UNION ALL SELECT 'supplier_bill_documents', count(*) FROM public.supplier_bill_documents AS x
    WHERE x.supplier_bill_id IN (SELECT b.id FROM matched_supplier_bills AS b)
    UNION ALL SELECT 'supplier_bill_payment_balances', count(*) FROM public.supplier_bill_payment_balances AS x
    WHERE x.supplier_bill_id IN (SELECT b.id FROM matched_supplier_bills AS b)
    UNION ALL SELECT 'supplier_payments', count(*) FROM public.supplier_payments AS x
    WHERE x.id IN (SELECT p.id FROM matched_supplier_payments AS p)
    UNION ALL SELECT 'supplier_payment_documents', count(*) FROM public.supplier_payment_documents AS x
    WHERE x.supplier_payment_id IN (SELECT p.id FROM matched_supplier_payments AS p)
    UNION ALL SELECT 'supplier_payment_reversals', count(*) FROM public.supplier_payment_reversals AS x
    WHERE x.supplier_payment_id IN (SELECT p.id FROM matched_supplier_payments AS p)
    UNION ALL SELECT 'accounting_ar_bridge_event_versions', count(*) FROM public.accounting_ar_bridge_event_versions AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
       OR x.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
        OR x.event_id IN (SELECT e.id FROM matched_ar_events AS e)
    UNION ALL SELECT 'accounting_ar_bridge_events', count(*) FROM public.accounting_ar_bridge_events AS x
    WHERE x.id IN (SELECT e.id FROM matched_ar_events AS e)
    UNION ALL SELECT 'accounting_ar_bridge_journal_lines', count(*) FROM public.accounting_ar_bridge_journal_lines AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
       OR x.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
       OR x.source_record_id IN (SELECT s.source_id FROM matched_source_ids AS s)
        OR x.event_id IN (SELECT e.id FROM matched_ar_events AS e)
    UNION ALL SELECT 'accounting_ar_bridge_journal_links', count(*) FROM public.accounting_ar_bridge_journal_links AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
       OR x.invoice_id IN (SELECT i.id FROM matched_invoices AS i)
       OR x.source_record_id IN (SELECT s.source_id FROM matched_source_ids AS s)
        OR x.event_id IN (SELECT e.id FROM matched_ar_events AS e)
    UNION ALL SELECT 'accounting_ap_bridge_event_versions', count(*) FROM public.accounting_ap_bridge_event_versions AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
        OR x.receipt_id IN (SELECT r.id FROM matched_receipts AS r)
        OR x.bill_id IN (SELECT b.id FROM matched_supplier_bills AS b)
        OR x.advance_id IN (SELECT a.id FROM matched_supplier_advances AS a)
        OR x.event_id IN (SELECT e.id FROM matched_ap_events AS e)
    UNION ALL SELECT 'accounting_ap_bridge_journal_lines', count(*) FROM public.accounting_ap_bridge_journal_lines AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
        OR x.receipt_id IN (SELECT r.id FROM matched_receipts AS r)
        OR x.bill_id IN (SELECT b.id FROM matched_supplier_bills AS b)
        OR x.advance_id IN (SELECT a.id FROM matched_supplier_advances AS a)
        OR x.source_record_id IN (SELECT s.source_id FROM matched_source_ids AS s)
        OR x.event_id IN (SELECT e.id FROM matched_ap_events AS e)
    UNION ALL SELECT 'accounting_ap_bridge_journal_links', count(*) FROM public.accounting_ap_bridge_journal_links AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
        OR x.receipt_id IN (SELECT r.id FROM matched_receipts AS r)
        OR x.bill_id IN (SELECT b.id FROM matched_supplier_bills AS b)
        OR x.advance_id IN (SELECT a.id FROM matched_supplier_advances AS a)
        OR x.source_record_id IN (SELECT s.source_id FROM matched_source_ids AS s)
        OR x.event_id IN (SELECT e.id FROM matched_ap_events AS e)
    UNION ALL SELECT 'accounting_ap_bridge_events', count(*) FROM public.accounting_ap_bridge_events AS x
    WHERE x.id IN (SELECT e.id FROM matched_ap_events AS e)
    UNION ALL SELECT 'accounting_expense_bridge_event_versions', count(*) FROM public.accounting_expense_bridge_event_versions AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
        OR x.expense_id IN (SELECT e.id FROM matched_expenses AS e)
        OR x.advance_id IN (SELECT a.id FROM public.employee_cash_advances AS a WHERE a.service_id IN (SELECT t.service_id FROM targets AS t))
        OR x.related_advance_id IN (SELECT a.id FROM public.employee_cash_advances AS a WHERE a.service_id IN (SELECT t.service_id FROM targets AS t))
        OR x.event_id IN (SELECT e.id FROM matched_expense_events AS e)
    UNION ALL SELECT 'accounting_expense_bridge_journal_lines', count(*) FROM public.accounting_expense_bridge_journal_lines AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
        OR x.expense_id IN (SELECT e.id FROM matched_expenses AS e)
        OR x.advance_id IN (SELECT a.id FROM public.employee_cash_advances AS a WHERE a.service_id IN (SELECT t.service_id FROM targets AS t))
        OR x.source_record_id IN (SELECT s.source_id FROM matched_source_ids AS s)
        OR x.event_id IN (SELECT e.id FROM matched_expense_events AS e)
    UNION ALL SELECT 'accounting_expense_bridge_journal_links', count(*) FROM public.accounting_expense_bridge_journal_links AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
        OR x.expense_id IN (SELECT e.id FROM matched_expenses AS e)
        OR x.advance_id IN (SELECT a.id FROM public.employee_cash_advances AS a WHERE a.service_id IN (SELECT t.service_id FROM targets AS t))
        OR x.source_record_id IN (SELECT s.source_id FROM matched_source_ids AS s)
        OR x.event_id IN (SELECT e.id FROM matched_expense_events AS e)
    UNION ALL SELECT 'accounting_expense_bridge_events', count(*) FROM public.accounting_expense_bridge_events AS x
    WHERE x.id IN (SELECT e.id FROM matched_expense_events AS e)
    UNION ALL SELECT 'accounting_revenue_arrangements', count(*) FROM public.accounting_revenue_arrangements AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
       OR x.approved_billing_scope_id IN (SELECT t.abs_id FROM targets AS t)
    UNION ALL SELECT 'accounting_revenue_recognition_events', count(*) FROM public.accounting_revenue_recognition_events AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'accounting_revenue_recognition_journal_lines', count(*) FROM public.accounting_revenue_recognition_journal_lines AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'accounting_revenue_recognition_journal_links', count(*) FROM public.accounting_revenue_recognition_journal_links AS x
    WHERE x.recognition_event_id IN (SELECT e.id FROM public.accounting_revenue_recognition_events AS e WHERE e.service_id IN (SELECT t.service_id FROM targets AS t))
    UNION ALL SELECT 'accounting_journal_line_versions', count(*) FROM public.accounting_journal_line_versions AS x
    WHERE x.service_id IN (SELECT t.service_id FROM targets AS t)
    UNION ALL SELECT 'accounting_foundation_events', count(*) FROM public.accounting_foundation_events AS x
    WHERE x.entity_id IN (SELECT t.service_id FROM targets AS t)
       OR x.entity_id IN (SELECT t.quotation_id FROM targets AS t)
       OR x.entity_id IN (SELECT t.abs_id FROM targets AS t)
    UNION ALL SELECT 'accounting_journals', count(*) FROM public.accounting_journals AS x
    WHERE x.id IN (SELECT journal_id FROM linked_journal_ids)
    UNION ALL SELECT 'accounting_journal_versions', count(*) FROM public.accounting_journal_versions AS x
    WHERE x.journal_id IN (SELECT journal_id FROM linked_journal_ids)
    UNION ALL SELECT 'accounting_journal_events', count(*) FROM public.accounting_journal_events AS x
    WHERE x.journal_id IN (SELECT journal_id FROM linked_journal_ids)
    UNION ALL SELECT 'accounting_source_effects', count(*) FROM public.accounting_source_effects AS x
    WHERE x.journal_id IN (SELECT journal_id FROM linked_journal_ids)
    UNION ALL SELECT 'accounting_inception_journal_links', count(*) FROM public.accounting_inception_journal_links AS x
    WHERE x.journal_id IN (SELECT journal_id FROM linked_journal_ids)
)
SELECT relation_name, link_count
FROM link_counts
WHERE link_count > 0
ORDER BY relation_name;
$function$;

CREATE FUNCTION public._w11_m0_01_completed_g8_valid_state_count(
    p_expected_status text,
    p_owner_actor_id text,
    p_expected_voided_at timestamptz
)
RETURNS bigint
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $function$
SELECT count(*)::bigint
FROM public._w11_m0_01_completed_g8_targets() AS t
JOIN public.services AS s ON s.id = t.service_id
JOIN public.service_lifecycle_states AS sl ON sl.service_id = t.service_id
JOIN public.customers AS c ON c.id = s.customer_id
JOIN public.quotations AS q ON q.id = t.quotation_id
JOIN public.approved_billing_scopes AS a ON a.id = t.abs_id
WHERE COALESCE(to_jsonb(s)->>'service_title', to_jsonb(s)->>'title', to_jsonb(s)->>'name') = 'G8 Final Service lmu0p1'
  AND s.service_number = 'SVC-2026-9737'
  AND s.status = 'Completed'
  AND s.deleted_at = t.expected_service_deleted_at
  AND s.cancellation_reason IS NULL
  AND s.customer_id = t.expected_customer_id
  AND c.is_deleted IS TRUE
  AND c.deleted_at IS NULL
  AND sl.legacy_status = 'Completed'
  AND sl.commercial_state = 'approved'
  AND sl.payment_state = 'unassessed'
  AND sl.readiness_state = 'ready'
  AND sl.execution_state = 'ended'
  AND sl.completion_state = 'confirmed'
  AND sl.close_state = 'open'
  AND sl.start_gate_basis IS NULL
  AND sl.state_version = 1
  AND sl.mapping_version = 'w3-v1'
  AND sl.updated_at = t.expected_lifecycle_updated_at
  AND sl.updated_by = 'test_g8_actor'
  AND q.service_id = t.service_id
  AND q.customer_id = t.expected_customer_id
  AND q.status = 'approved'
  AND COALESCE(q.is_deleted, false) IS FALSE
  AND q.deleted_at IS NULL
  AND q.superseded_at IS NULL
  AND q.superseded_by_quotation_id IS NULL
  AND q.subtotal = t.expected_total
  AND q.discount = 0
  AND q.vat_amount = 0
  AND q.grand_total = t.expected_total
  AND a.service_id = t.service_id
  AND a.source_quotation_id = t.quotation_id
  AND a.scope_version = 1
  AND a.accepted_subtotal = t.expected_total
  AND a.accepted_vat_amount = 0
  AND a.accepted_grand_total = t.expected_total
  AND a.source_quotation_subtotal = t.expected_total
  AND a.source_quotation_vat_amount = 0
  AND a.source_quotation_grand_total = t.expected_total
  AND a.source_currency = 'SAR'
  AND a.source_discount = 0
  AND a.line_safety_status = 'safe'
  AND a.approved_at IS NOT NULL
  AND NULLIF(btrim(a.approved_by), '') IS NOT NULL
  AND a.superseded_at IS NULL
  AND a.superseded_by_scope_id IS NULL
  AND (SELECT count(*) FROM public.approved_billing_scopes AS ax WHERE ax.service_id = t.service_id) = 1
  AND (SELECT count(*) FROM public.approved_billing_scopes AS ax
       WHERE ax.service_id = t.service_id AND ax.status = 'approved'
         AND ax.voided_at IS NULL AND ax.superseded_at IS NULL)
      = CASE WHEN p_expected_status = 'approved' THEN 1 ELSE 0 END
  AND (SELECT count(*) FROM public.approved_billing_scope_items AS i WHERE i.approved_billing_scope_id = t.abs_id) = 1
  AND md5(COALESCE((
      SELECT string_agg(to_jsonb(i)::text, E'\\n' ORDER BY i.id)
      FROM public.approved_billing_scope_items AS i
      WHERE i.approved_billing_scope_id = t.abs_id
  ), '')) = t.expected_item_digest
  AND (
      (p_expected_status = 'approved'
       AND a.status = 'approved'
       AND a.voided_at IS NULL
       AND a.voided_by IS NULL
       AND a.void_reason IS NULL
       AND a.updated_by = 'test_g8_actor')
      OR
      (p_expected_status = 'voided'
       AND a.status = 'voided'
       AND a.voided_at = p_expected_voided_at
       AND a.voided_by = p_owner_actor_id
       AND a.void_reason = 'OWNER-AUTHORIZED M0-01 G8 DEV TEST-DATA AUTHORITY RETIREMENT; historical Completed mechanism UNKNOWN; historical financial impact UNKNOWN; SAR 800.00 was commercial authority only.'
       AND a.updated_by = p_owner_actor_id
       AND a.updated_at = p_expected_voided_at)
  );
$function$;

CREATE OR REPLACE FUNCTION public.enforce_w11_m0_01_retirement_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_context text;
    v_actor_id text;
    v_expected_reason text;
BEGIN
    v_context := current_setting('g7.w11_m0_01_context', true);
    IF v_context IS NULL OR v_context = '' THEN
        RETURN NEW;
    END IF;

    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_retirement_context_forbidden';
    END IF;
    IF TG_OP <> 'UPDATE'
        OR OLD.status <> 'approved'
        OR NEW.status <> 'voided'
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_retirement_context_invalid';
    END IF;

    v_actor_id := current_setting('g7.w11_m0_01_actor_id', true);
    IF v_actor_id IS NULL OR btrim(v_actor_id) = ''
        OR NEW.voided_by IS DISTINCT FROM v_actor_id
        OR NEW.updated_by IS DISTINCT FROM v_actor_id
        OR NEW.voided_at IS DISTINCT FROM transaction_timestamp()
        OR (to_jsonb(NEW) - ARRAY['status', 'voided_at', 'voided_by', 'void_reason', 'updated_by', 'updated_at'])
           IS DISTINCT FROM
           (to_jsonb(OLD) - ARRAY['status', 'voided_at', 'voided_by', 'void_reason', 'updated_by', 'updated_at'])
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_retirement_transition_invalid';
    END IF;

    IF v_context = 'W11-M0-01-14-APPROVED-ABS-RETIREMENT' THEN
        v_expected_reason := 'OWNER-AUTHORIZED M0-01 REMEDIATION; no historical cause or financial impact is inferred.';
        IF NEW.void_reason IS DISTINCT FROM v_expected_reason
            OR NOT EXISTS (
                SELECT 1
                FROM public._w11_m0_01_retirement_targets() AS t
                WHERE t.service_id = OLD.service_id
                  AND t.quotation_id = OLD.source_quotation_id
                  AND t.abs_id = OLD.id
            )
        THEN
            RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_retirement_target_invalid';
        END IF;
    ELSIF v_context = 'W11-M0-01-COMPLETED-G8-ABS-RETIREMENT' THEN
        v_expected_reason := 'OWNER-AUTHORIZED M0-01 G8 DEV TEST-DATA AUTHORITY RETIREMENT; historical Completed mechanism UNKNOWN; historical financial impact UNKNOWN; SAR 800.00 was commercial authority only.';
        IF NEW.void_reason IS DISTINCT FROM v_expected_reason
            OR NOT EXISTS (
                SELECT 1
                FROM public._w11_m0_01_completed_g8_targets() AS t
                WHERE t.service_id = OLD.service_id
                  AND t.quotation_id = OLD.source_quotation_id
                  AND t.abs_id = OLD.id
            )
        THEN
            RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_retirement_target_invalid';
        END IF;
    ELSE
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_retirement_context_invalid';
    END IF;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_approved_billing_scopes_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_authoritative_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_source public.quotations%ROWTYPE;
    v_item_validation record;
    v_items_discount_allocated numeric(12,2);
    v_applicable_invoice_count bigint;
    v_lifetime_invoice_total numeric;
    v_payment_history_count bigint;
    v_successor_source_id uuid;
    v_is_w11_m0_01_retirement boolean;
    v_is_w11_m0_01_completed_g8_retirement boolean;
BEGIN
    IF TG_OP = 'UPDATE' AND (
        OLD.service_id IS DISTINCT FROM NEW.service_id
        OR OLD.source_quotation_id IS DISTINCT FROM NEW.source_quotation_id
        OR OLD.supersedes_scope_id IS DISTINCT FROM NEW.supersedes_scope_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'approved billing scope authority lineage is immutable';
    END IF;

    v_authoritative_service_id := CASE WHEN TG_OP = 'UPDATE' THEN OLD.service_id ELSE NEW.service_id END;

    v_is_w11_m0_01_retirement := COALESCE(
        TG_OP = 'UPDATE'
        AND current_setting('g7.w11_m0_01_context', true) = 'W11-M0-01-14-APPROVED-ABS-RETIREMENT'
        AND OLD.status = 'approved'
        AND NEW.status = 'voided'
        AND EXISTS (
            SELECT 1
            FROM public._w11_m0_01_retirement_targets() AS t
            WHERE t.service_id = OLD.service_id
              AND t.quotation_id = OLD.source_quotation_id
              AND t.abs_id = OLD.id
        ),
        false
    );

    v_is_w11_m0_01_completed_g8_retirement := COALESCE(
        TG_OP = 'UPDATE'
        AND current_setting('g7.w11_m0_01_context', true) = 'W11-M0-01-COMPLETED-G8-ABS-RETIREMENT'
        AND OLD.status = 'approved'
        AND NEW.status = 'voided'
        AND EXISTS (
            SELECT 1
            FROM public._w11_m0_01_completed_g8_targets() AS t
            WHERE t.service_id = OLD.service_id
              AND t.quotation_id = OLD.source_quotation_id
              AND t.abs_id = OLD.id
        ),
        false
    );

    IF TG_OP = 'INSERT' THEN
        SELECT s.status, s.deleted_at
        INTO v_service_status, v_service_deleted_at
        FROM public.services s
        WHERE s.id = v_authoritative_service_id
        FOR UPDATE;
    ELSE
        SELECT s.status, s.deleted_at
        INTO v_service_status, v_service_deleted_at
        FROM public.services s
        WHERE s.id = v_authoritative_service_id;
    END IF;

    IF NOT FOUND
        OR (v_service_deleted_at IS NOT NULL
            AND NOT (
                (v_is_w11_m0_01_retirement AND v_service_status = 'Approved')
                OR (v_is_w11_m0_01_completed_g8_retirement AND v_service_status = 'Completed')
            ))
    THEN
        RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF v_service_status IN ('Completed', 'Cancelled') THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
        END IF;
        IF NEW.status IN ('approved', 'voided') THEN
            RAISE EXCEPTION USING MESSAGE = 'approved billing scopes cannot be inserted directly as approved or voided';
        END IF;
    ELSE
        IF OLD.status = 'voided' THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_already_voided';
        END IF;

        IF OLD.status = 'approved' THEN
            IF NEW.status NOT IN ('approved', 'voided') THEN
                RAISE EXCEPTION USING MESSAGE = 'approved scope status may only remain approved or transition to voided';
            END IF;

            IF OLD.scope_version IS DISTINCT FROM NEW.scope_version
                OR OLD.accepted_subtotal IS DISTINCT FROM NEW.accepted_subtotal
                OR OLD.accepted_vat_amount IS DISTINCT FROM NEW.accepted_vat_amount
                OR OLD.accepted_grand_total IS DISTINCT FROM NEW.accepted_grand_total
                OR OLD.source_vat_rate IS DISTINCT FROM NEW.source_vat_rate
                OR OLD.source_discount IS DISTINCT FROM NEW.source_discount
                OR OLD.source_currency IS DISTINCT FROM NEW.source_currency
                OR OLD.source_quotation_subtotal IS DISTINCT FROM NEW.source_quotation_subtotal
                OR OLD.source_quotation_vat_amount IS DISTINCT FROM NEW.source_quotation_vat_amount
                OR OLD.source_quotation_grand_total IS DISTINCT FROM NEW.source_quotation_grand_total
                OR OLD.source_pricing_context IS DISTINCT FROM NEW.source_pricing_context
                OR OLD.line_safety_status IS DISTINCT FROM NEW.line_safety_status
                OR OLD.line_safety_reason_code IS DISTINCT FROM NEW.line_safety_reason_code
                OR OLD.line_safety_note IS DISTINCT FROM NEW.line_safety_note
                OR OLD.line_safety_reviewed_by IS DISTINCT FROM NEW.line_safety_reviewed_by
                OR OLD.line_safety_reviewed_at IS DISTINCT FROM NEW.line_safety_reviewed_at
                OR OLD.change_summary_reason IS DISTINCT FROM NEW.change_summary_reason
                OR OLD.approved_at IS DISTINCT FROM NEW.approved_at
                OR OLD.approved_by IS DISTINCT FROM NEW.approved_by
                OR OLD.created_by IS DISTINCT FROM NEW.created_by
                OR OLD.created_at IS DISTINCT FROM NEW.created_at
            THEN
                RAISE EXCEPTION USING MESSAGE = 'approved scope header fields are immutable';
            END IF;

            IF OLD.superseded_at IS NULL AND NEW.superseded_at IS NOT NULL THEN
                IF NEW.superseded_by_scope_id IS NULL THEN
                    RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid';
                END IF;

                SELECT s.supersedes_scope_id
                INTO v_successor_source_id
                FROM public.approved_billing_scopes s
                WHERE s.id = NEW.superseded_by_scope_id
                  AND s.service_id = OLD.service_id
                  AND s.status = 'draft';

                IF NOT FOUND OR v_successor_source_id IS DISTINCT FROM OLD.id THEN
                    RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid';
                END IF;
            ELSIF OLD.superseded_at IS DISTINCT FROM NEW.superseded_at
                OR OLD.superseded_by_scope_id IS DISTINCT FROM NEW.superseded_by_scope_id
            THEN
                RAISE EXCEPTION USING MESSAGE = 'scope_already_superseded';
            END IF;
        END IF;
    END IF;

    IF NEW.status = 'approved' AND v_service_status IN ('Completed', 'Cancelled') THEN
        RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
    END IF;

    IF NEW.status = 'voided' THEN
        IF TG_OP <> 'UPDATE'
            OR OLD.status <> 'approved'
            OR OLD.superseded_at IS NOT NULL
            OR OLD.voided_at IS NOT NULL
        THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_not_active';
        END IF;
        IF v_service_status = 'Completed' AND NOT v_is_w11_m0_01_completed_g8_retirement THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
        END IF;
        IF NEW.voided_at IS NULL OR NEW.voided_by IS NULL OR btrim(NEW.voided_by) = ''
            OR NEW.void_reason IS NULL OR btrim(NEW.void_reason) = ''
        THEN
            RAISE EXCEPTION USING MESSAGE = 'voided scopes require void metadata';
        END IF;

        SELECT * INTO v_applicable_invoice_count, v_lifetime_invoice_total
        FROM public._abs_get_service_invoice_exposure(v_authoritative_service_id);
        v_payment_history_count := public._abs_get_service_payment_history_count(v_authoritative_service_id);
        IF v_applicable_invoice_count <> 0 OR v_payment_history_count <> 0 THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_void_financial_exposure';
        END IF;
    END IF;

    IF NEW.status = 'approved'
        AND (TG_OP <> 'UPDATE' OR OLD.status IS DISTINCT FROM 'approved')
    THEN
        SELECT q.* INTO v_source
        FROM public.quotations q
        WHERE q.id = NEW.source_quotation_id;

        IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'source quotation not found'; END IF;
        IF v_source.status <> 'approved' THEN RAISE EXCEPTION USING MESSAGE = 'source quotation must be approved'; END IF;
        IF COALESCE(v_source.is_deleted, false) THEN RAISE EXCEPTION USING MESSAGE = 'source quotation must not be deleted'; END IF;
        IF v_source.service_id IS DISTINCT FROM NEW.service_id THEN
            RAISE EXCEPTION USING MESSAGE = 'source quotation service_id must match scope service_id';
        END IF;
        IF COALESCE(v_source.discount, 0) > 0
            AND upper(COALESCE(NULLIF(btrim(v_source.snapshot_seller ->> 'currency'), ''), 'SAR')) <> 'SAR'
        THEN
            RAISE EXCEPTION USING MESSAGE = 'w2c_discount_currency_unsupported';
        END IF;
        IF NEW.line_safety_status <> 'safe' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved scopes require line_safety_status = safe';
        END IF;
        IF NEW.approved_at IS NULL OR NEW.approved_by IS NULL OR btrim(NEW.approved_by) = '' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved scopes require approved_at and approved_by';
        END IF;

        IF NEW.supersedes_scope_id IS NULL THEN
            IF EXISTS (
                SELECT 1 FROM public.approved_billing_scopes active_scope
                WHERE active_scope.service_id = v_authoritative_service_id
                  AND active_scope.id <> NEW.id
                  AND active_scope.status = 'approved'
                  AND active_scope.superseded_at IS NULL
                  AND active_scope.voided_at IS NULL
            ) THEN
                RAISE EXCEPTION USING MESSAGE = 'scope_active_conflict';
            END IF;
            IF public._abs_service_has_historical_authority(v_authoritative_service_id) THEN
                RAISE EXCEPTION USING MESSAGE = 'scope_not_active';
            END IF;
        END IF;

        SELECT * INTO v_item_validation FROM public._abs_validate_scope_items(NEW.id);
        IF v_item_validation.validation_error IS NOT NULL
            OR v_item_validation.billable_item_count = 0
            OR v_item_validation.item_accepted_subtotal IS DISTINCT FROM NEW.accepted_subtotal
            OR v_item_validation.item_accepted_vat_amount IS DISTINCT FROM NEW.accepted_vat_amount
            OR v_item_validation.item_accepted_grand_total IS DISTINCT FROM NEW.accepted_grand_total
        THEN
            RAISE EXCEPTION USING MESSAGE = COALESCE(v_item_validation.validation_error, 'approved scope item/header totals are invalid');
        END IF;

        SELECT COALESCE(sum(i.source_discount_allocated), 0)
        INTO v_items_discount_allocated
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = NEW.id;
        IF v_items_discount_allocated IS DISTINCT FROM COALESCE(v_source.discount, 0) THEN
            RAISE EXCEPTION USING MESSAGE = 'source quotation discount allocation is not reconciled';
        END IF;

        SELECT * INTO v_applicable_invoice_count, v_lifetime_invoice_total
        FROM public._abs_get_service_invoice_exposure(NEW.service_id);
        IF v_lifetime_invoice_total > NEW.accepted_grand_total THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_successor_ceiling_below_invoiced';
        END IF;

        IF NEW.supersedes_scope_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.approved_billing_scopes p
            JOIN public.quotations predecessor ON predecessor.id = p.source_quotation_id
            JOIN public.quotations successor ON successor.id = NEW.source_quotation_id
            WHERE p.id = NEW.supersedes_scope_id
              AND p.service_id = NEW.service_id
              AND p.status = 'approved'
              AND p.superseded_at IS NOT NULL
              AND p.superseded_by_scope_id = NEW.id
              AND (
                  p.source_quotation_id = NEW.source_quotation_id
                  OR (
                      successor.revision_of_quotation_id = predecessor.id
                      AND successor.quotation_family_id = predecessor.quotation_family_id
                      AND successor.service_id = predecessor.service_id
                  )
              )
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE FUNCTION public.retire_w11_m0_01_completed_g8_abs(p_owner_actor_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_owner_actor_id text := NULLIF(btrim(COALESCE(p_owner_actor_id, '')), '');
    v_batch_id constant text := 'W11-M0-01-COMPLETED-G8-ABS-RETIREMENT';
    v_event_type constant text := 'approved_billing_scope_m0_01_completed_g8_owner_authorized_retirement';
    v_label constant text := 'OWNER-AUTHORIZED M0-01 G8 DEV TEST-DATA AUTHORITY RETIREMENT';
    v_authorization_ref constant text := 'OWNER AUTHORIZATION — FINAL M0-01 COMPLETED G8 DEV REPAIR';
    v_reason constant text := 'OWNER-AUTHORIZED M0-01 G8 DEV TEST-DATA AUTHORITY RETIREMENT; historical Completed mechanism UNKNOWN; historical financial impact UNKNOWN; SAR 800.00 was commercial authority only.';
    v_now timestamptz;
    v_previous_context text;
    v_previous_actor_id text;
    v_actor_count bigint;
    v_manifest_count bigint;
    v_distinct_services bigint;
    v_distinct_quotations bigint;
    v_distinct_abs bigint;
    v_locked_count bigint;
    v_state_count bigint;
    v_abs_audit_count bigint;
    v_batch_event_count bigint;
    v_exact_audit_count bigint;
    v_links text[];
BEGIN
    IF v_owner_actor_id IS NULL OR char_length(v_owner_actor_id) > 200 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_owner_actor_invalid';
    END IF;

    SELECT count(*) INTO v_actor_count
    FROM public.app_users AS u
    WHERE u.clerk_user_id = v_owner_actor_id
      AND u.role = 'admin'
      AND u.is_active IS TRUE;
    IF v_actor_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_owner_actor_not_active_admin';
    END IF;
    PERFORM 1
    FROM public.app_users AS u
    WHERE u.clerk_user_id = v_owner_actor_id
      AND u.role = 'admin'
      AND u.is_active IS TRUE
    FOR SHARE;
    GET DIAGNOSTICS v_actor_count = ROW_COUNT;
    IF v_actor_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_owner_actor_not_active_admin';
    END IF;

    v_previous_context := NULLIF(current_setting('g7.w11_m0_01_context', true), '');
    v_previous_actor_id := NULLIF(current_setting('g7.w11_m0_01_actor_id', true), '');
    IF v_previous_context IS NOT NULL OR v_previous_actor_id IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_context_already_set';
    END IF;

    SELECT count(*), count(DISTINCT t.service_id), count(DISTINCT t.quotation_id), count(DISTINCT t.abs_id)
    INTO v_manifest_count, v_distinct_services, v_distinct_quotations, v_distinct_abs
    FROM public._w11_m0_01_completed_g8_targets() AS t;
    IF v_manifest_count <> 1 OR v_distinct_services <> 1
        OR v_distinct_quotations <> 1 OR v_distinct_abs <> 1
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_fixed_manifest_invalid';
    END IF;

    PERFORM s.id
    FROM public.services AS s
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.service_id = s.id
    ORDER BY s.id
    FOR UPDATE OF s;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_service_lock_set_invalid';
    END IF;

    PERFORM sl.service_id
    FROM public.service_lifecycle_states AS sl
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.service_id = sl.service_id
    ORDER BY sl.service_id
    FOR UPDATE OF sl;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_lifecycle_lock_set_invalid';
    END IF;

    PERFORM c.id
    FROM public.customers AS c
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.expected_customer_id = c.id
    ORDER BY c.id
    FOR UPDATE OF c;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_customer_lock_set_invalid';
    END IF;

    PERFORM q.id
    FROM public.quotations AS q
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.quotation_id = q.id
    ORDER BY q.id
    FOR UPDATE OF q;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_quotation_lock_set_invalid';
    END IF;

    PERFORM a.id
    FROM public.approved_billing_scopes AS a
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.abs_id = a.id
    ORDER BY a.id
    FOR UPDATE OF a;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_abs_lock_set_invalid';
    END IF;

    PERFORM i.id
    FROM public.approved_billing_scope_items AS i
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.abs_id = i.approved_billing_scope_id
    ORDER BY i.id
    FOR UPDATE OF i;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_item_lock_set_invalid';
    END IF;

    SELECT public._w11_m0_01_completed_g8_valid_state_count('approved', v_owner_actor_id, NULL)
    INTO v_state_count;
    SELECT count(*) INTO v_abs_audit_count
    FROM public.audit_logs AS al
    JOIN public._w11_m0_01_completed_g8_targets() AS t
      ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id;
    IF v_state_count = 1 AND v_abs_audit_count = 1 THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.audit_logs AS al
            JOIN public.approved_billing_scopes AS a ON a.id = al.entity_id
            JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.abs_id = a.id
            WHERE al.action = 'status_change'
              AND al.entity_type = 'approved_billing_scope'
              AND al.entity_id = t.abs_id
              AND al.user_id = a.approved_by
              AND al.timestamp = a.approved_at
              AND al.details ->> 'event_type' = 'approved_billing_scope_approved'
              AND al.details ->> 'service_id' = t.service_id::text
              AND al.details ->> 'source_quotation_id' = t.quotation_id::text
              AND al.details ->> 'quotation_id' = t.quotation_id::text
              AND al.details ->> 'scope_id' = t.abs_id::text
              AND al.details ->> 'scope_version' = a.scope_version::text
              AND al.details ->> 'lifecycle_outcome' = 'auto_activated'
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_prior_abs_audit_state_mismatch';
        END IF;
    ELSE
        SELECT count(*) INTO v_batch_event_count
        FROM public.audit_logs AS al
        WHERE al.details ->> 'batch_id' = v_batch_id;
        IF v_batch_event_count <> 1 THEN
            RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_prior_state_mismatch';
        END IF;

        SELECT min(al.timestamp) INTO v_now
        FROM public.audit_logs AS al
        JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.abs_id = al.entity_id
        WHERE al.details ->> 'batch_id' = v_batch_id
          AND al.action = 'owner_authorized_remediation'
          AND al.entity_type = 'approved_billing_scope'
          AND al.entity_id = t.abs_id;
        SELECT public._w11_m0_01_completed_g8_valid_state_count('voided', v_owner_actor_id, v_now)
        INTO v_state_count;

        SELECT count(*) INTO v_exact_audit_count
        FROM public.audit_logs AS al
        JOIN public._w11_m0_01_completed_g8_targets() AS t
          ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id
        WHERE al.action = 'owner_authorized_remediation'
          AND al.user_id = v_owner_actor_id
          AND al.timestamp = v_now
          AND al.details = jsonb_build_object(
              'event_type', v_event_type,
              'batch_id', v_batch_id,
              'remediation_label', v_label,
              'owner_authorization_ref', v_authorization_ref,
              'actor_context', 'Owner-authorized DEV remediation',
              'service_id', t.service_id,
              'quotation_id', t.quotation_id,
              'approved_billing_scope_id', t.abs_id,
              'scope_version', 1,
              'reason_code', 'owner_authorized_dev_test_data_retirement',
              'reason_note', v_reason,
              'recorded_at', v_now,
              'prior_status', 'approved',
              'prior_voided_at', NULL,
              'prior_superseded_at', NULL,
              'result_status', 'voided',
              'result_voided_at', v_now,
              'lifecycle_outcome', 'active_approved_authority_retired'
          );
        IF v_state_count = 1 AND v_abs_audit_count = 2 AND v_exact_audit_count = 1 THEN
            SELECT COALESCE(array_agg(link.relation_name ORDER BY link.relation_name), ARRAY[]::text[])
            INTO v_links
            FROM public._w11_m0_01_completed_g8_downstream_link_counts() AS link;
            IF cardinality(v_links) = 0 THEN
                RETURN jsonb_build_object('batch_id', v_batch_id, 'retired_count', 1,
                    'idempotent_replay', true, 'recorded_at', v_now);
            END IF;
        END IF;
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_prior_state_mismatch';
    END IF;

    IF v_state_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_precondition_state_mismatch';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.audit_logs AS al
        JOIN public._w11_m0_01_completed_g8_targets() AS t
          ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id
        WHERE al.details ->> 'event_type' IN (
            'approved_billing_scope_voided',
            v_event_type
        )
        OR al.action = 'owner_authorized_remediation'
    ) OR EXISTS (
        SELECT 1
        FROM public.audit_logs AS al
        WHERE al.details ->> 'batch_id' = v_batch_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_prior_remediation_audit_found';
    END IF;

    SELECT COALESCE(array_agg(link.relation_name ORDER BY link.relation_name), ARRAY[]::text[])
    INTO v_links
    FROM public._w11_m0_01_completed_g8_downstream_link_counts() AS link;
    IF cardinality(v_links) > 0 THEN
        RAISE EXCEPTION 'w11_m0_01_completed_g8_downstream_links_found: %', array_to_string(v_links, ',');
    END IF;

    v_now := transaction_timestamp();
    PERFORM set_config('g7.w11_m0_01_context', v_batch_id, true);
    PERFORM set_config('g7.w11_m0_01_actor_id', v_owner_actor_id, true);

    UPDATE public.approved_billing_scopes AS a
    SET status = 'voided',
        voided_at = v_now,
        voided_by = v_owner_actor_id,
        void_reason = v_reason,
        updated_by = v_owner_actor_id,
        updated_at = v_now
    FROM public._w11_m0_01_completed_g8_targets() AS t
    WHERE a.id = t.abs_id
      AND a.service_id = t.service_id
      AND a.source_quotation_id = t.quotation_id
      AND a.scope_version = 1
      AND a.status = 'approved'
      AND a.voided_at IS NULL
      AND a.superseded_at IS NULL;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_abs_update_count_invalid';
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    SELECT
        'owner_authorized_remediation',
        'approved_billing_scope',
        t.abs_id,
        v_owner_actor_id,
        jsonb_build_object(
            'event_type', v_event_type,
            'batch_id', v_batch_id,
            'remediation_label', v_label,
            'owner_authorization_ref', v_authorization_ref,
            'actor_context', 'Owner-authorized DEV remediation',
            'service_id', t.service_id,
            'quotation_id', t.quotation_id,
            'approved_billing_scope_id', t.abs_id,
            'scope_version', 1,
            'reason_code', 'owner_authorized_dev_test_data_retirement',
            'reason_note', v_reason,
            'recorded_at', v_now,
            'prior_status', 'approved',
            'prior_voided_at', NULL,
            'prior_superseded_at', NULL,
            'result_status', 'voided',
            'result_voided_at', v_now,
            'lifecycle_outcome', 'active_approved_authority_retired'
        ),
        v_now
    FROM public._w11_m0_01_completed_g8_targets() AS t;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_audit_insert_count_invalid';
    END IF;

    PERFORM set_config('g7.w11_m0_01_context', COALESCE(v_previous_context, ''), true);
    PERFORM set_config('g7.w11_m0_01_actor_id', COALESCE(v_previous_actor_id, ''), true);

    SELECT public._w11_m0_01_completed_g8_valid_state_count('voided', v_owner_actor_id, v_now)
    INTO v_state_count;
    IF v_state_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_postcondition_state_mismatch';
    END IF;

    SELECT count(*) INTO v_exact_audit_count
    FROM public.audit_logs AS al
    JOIN public._w11_m0_01_completed_g8_targets() AS t
      ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id
    WHERE al.action = 'owner_authorized_remediation'
      AND al.user_id = v_owner_actor_id
      AND al.timestamp = v_now
      AND al.details = jsonb_build_object(
          'event_type', v_event_type,
          'batch_id', v_batch_id,
          'remediation_label', v_label,
          'owner_authorization_ref', v_authorization_ref,
          'actor_context', 'Owner-authorized DEV remediation',
          'service_id', t.service_id,
          'quotation_id', t.quotation_id,
          'approved_billing_scope_id', t.abs_id,
          'scope_version', 1,
          'reason_code', 'owner_authorized_dev_test_data_retirement',
          'reason_note', v_reason,
          'recorded_at', v_now,
          'prior_status', 'approved',
          'prior_voided_at', NULL,
          'prior_superseded_at', NULL,
          'result_status', 'voided',
          'result_voided_at', v_now,
          'lifecycle_outcome', 'active_approved_authority_retired'
      );
    IF v_exact_audit_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_audit_postcondition_mismatch';
    END IF;

    SELECT count(*) INTO v_abs_audit_count
    FROM public.audit_logs AS al
    JOIN public._w11_m0_01_completed_g8_targets() AS t
      ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id;
    IF v_abs_audit_count <> 2 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_total_audit_count_invalid';
    END IF;

    SELECT COALESCE(array_agg(link.relation_name ORDER BY link.relation_name), ARRAY[]::text[])
    INTO v_links
    FROM public._w11_m0_01_completed_g8_downstream_link_counts() AS link;
    IF cardinality(v_links) > 0 THEN
        RAISE EXCEPTION 'w11_m0_01_completed_g8_downstream_postcondition_failed: %', array_to_string(v_links, ',');
    END IF;

    RETURN jsonb_build_object('batch_id', v_batch_id, 'retired_count', 1,
        'idempotent_replay', false, 'recorded_at', v_now);
END;
$function$;

ALTER FUNCTION public._w11_m0_01_completed_g8_targets() OWNER TO postgres;
ALTER FUNCTION public._w11_m0_01_completed_g8_downstream_link_counts() OWNER TO postgres;
ALTER FUNCTION public._w11_m0_01_completed_g8_valid_state_count(text, text, timestamptz) OWNER TO postgres;
ALTER FUNCTION public.enforce_w11_m0_01_retirement_context() OWNER TO postgres;
ALTER FUNCTION public.check_approved_billing_scopes_before_write() OWNER TO postgres;
ALTER FUNCTION public.retire_w11_m0_01_completed_g8_abs(text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public._w11_m0_01_completed_g8_targets() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._w11_m0_01_completed_g8_downstream_link_counts() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._w11_m0_01_completed_g8_valid_state_count(text, text, timestamptz) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_w11_m0_01_retirement_context() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.retire_w11_m0_01_completed_g8_abs(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retire_w11_m0_01_completed_g8_abs(text) TO service_role;

COMMENT ON FUNCTION public._w11_m0_01_completed_g8_targets() IS
    'Fixed one-case W11 M0-01 Completed G8 DEV target manifest; not an application selection API.';
COMMENT ON FUNCTION public._w11_m0_01_completed_g8_downstream_link_counts() IS
    'Rechecks the same 90 fixed downstream relation paths as the approved 14-case guard for the one fixed Completed G8 target.';
COMMENT ON FUNCTION public._w11_m0_01_completed_g8_valid_state_count(text, text, timestamptz) IS
    'Validates the fixed Completed G8 source state and preserved evidence before or after its authorized ABS authority retirement.';
COMMENT ON FUNCTION public.retire_w11_m0_01_completed_g8_abs(text) IS
    'One-time Owner-authorized fixed-target G8 DEV test-data ABS authority retirement. Does not create invoices or accounting facts.';
COMMENT ON FUNCTION public.enforce_w11_m0_01_retirement_context() IS
    'SECURITY INVOKER guard preserving the fixed 14-case transition and narrowly admitting the exact Owner-authorized Completed G8 context.';

COMMIT;
