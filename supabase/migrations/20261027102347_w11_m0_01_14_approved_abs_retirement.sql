-- W11 M0-01: exact 14-case Owner-authorized current-authority retirement.
-- Historical cause and financial impact remain UNKNOWN; commercial amounts are not invoice/accounting values.
-- This is a one-time fixed-allowlist remediation, not an application/admin capability.

BEGIN;

DO $migration_preflight$
BEGIN
    IF to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regprocedure('public.check_approved_billing_scopes_before_write()') IS NULL
        OR NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_trigger AS tg
            WHERE tg.tgrelid = to_regclass('public.approved_billing_scopes')
              AND tg.tgfoid = to_regprocedure('public.check_approved_billing_scopes_before_write()')
              AND NOT tg.tgisinternal
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_required_abs_lifecycle_trigger_missing';
    END IF;

    IF to_regprocedure('public._w11_m0_01_retirement_targets()') IS NOT NULL
        OR to_regprocedure('public._w11_m0_01_downstream_link_counts()') IS NOT NULL
        OR to_regprocedure('public._w11_m0_01_valid_state_count(text,text,timestamptz)') IS NOT NULL
        OR to_regprocedure('public.enforce_w11_m0_01_retirement_context()') IS NOT NULL
        OR to_regprocedure('public.retire_w11_m0_01_approved_abs(text)') IS NOT NULL
        OR EXISTS (
            SELECT 1
            FROM pg_catalog.pg_trigger AS tg
            WHERE tg.tgrelid = to_regclass('public.approved_billing_scopes')
              AND tg.tgname = 'w11_m0_01_retirement_context_guard_trg'
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_migration_objects_already_exist';
    END IF;
END;
$migration_preflight$;

CREATE FUNCTION public._w11_m0_01_retirement_targets()
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
    SELECT *
    FROM (VALUES
    ('02bdefe9-6a1e-4dfe-8732-985af7a5df49'::uuid, '307106ce-2a58-4901-bcb6-75abe12b03af'::uuid, '4346aaec-8780-44a4-a4e3-bfcd7ebc3f02'::uuid, '2026-08-17 10:13:40.350+00'::timestamptz, '2168cc59-0205-4218-a141-15a9ac666877'::uuid, '2026-08-17 10:13:40.294923+00'::timestamptz, 500::numeric, '643d5357f980055f2b730692beb0c942'::text),
    ('1421ecd2-4152-4676-8c41-ec292830e8a2'::uuid, 'daa17584-0180-4778-9316-826015b486ac'::uuid, '3de3cf22-8fc3-4115-abc7-0b40cc2c41be'::uuid, '2026-08-17 10:14:35.048+00'::timestamptz, '9bcf5c65-7b3e-4f90-b5d7-276f40d8d27e'::uuid, '2026-08-17 10:14:34.971815+00'::timestamptz, 1000::numeric, 'baad1512ad3313c5ee373af58fb897d2'::text),
    ('1ac06a50-043a-4ff2-b441-f709da735a52'::uuid, 'd286e869-df5f-4510-a5d8-fb3397f6f5e3'::uuid, '3c15e26b-8892-46c3-b669-d95074ebe096'::uuid, '2026-08-17 10:13:40.350+00'::timestamptz, '2168cc59-0205-4218-a141-15a9ac666877'::uuid, '2026-08-17 10:13:40.294923+00'::timestamptz, 800::numeric, '21645d1d67e0b8bb41d771f13935cc9a'::text),
    ('3802d0fa-11fe-44ad-b1f8-8503ea8cd8b5'::uuid, 'ec4717f4-ed0e-4879-aa6f-a4c3736d3556'::uuid, 'c11728f0-3d66-41ed-9c3b-3058ca45ea75'::uuid, '2026-08-17 10:13:40.350+00'::timestamptz, '21db71fc-ac14-44c1-b5f6-03fcfcf64fc9'::uuid, '2026-08-17 10:13:40.294923+00'::timestamptz, 1000::numeric, 'e764ee6d802c68eabcfd93be22ad8ff4'::text),
    ('3f7dfffb-3188-49d0-b4ac-3297a95a60e8'::uuid, '591744aa-4684-4463-a782-260af6f90d6a'::uuid, '5811cfed-cd16-48a1-a1e5-100ae67ed425'::uuid, '2026-08-17 10:13:40.350+00'::timestamptz, '2168cc59-0205-4218-a141-15a9ac666877'::uuid, '2026-08-17 10:13:40.294923+00'::timestamptz, 1000::numeric, '3bb3c47a6a65a5f1d45e641082811dcd'::text),
    ('52d67797-0fd5-466f-a810-2d3c14542b25'::uuid, 'bb5756e6-5488-4587-b475-63b8aa9620b3'::uuid, 'de7ab306-f1a9-4744-914f-e38e88726920'::uuid, '2026-08-17 10:13:40.350+00'::timestamptz, '21db71fc-ac14-44c1-b5f6-03fcfcf64fc9'::uuid, '2026-08-17 10:13:40.294923+00'::timestamptz, 1000::numeric, '71df643dd2cdc6bc27a0fc32db85b639'::text),
    ('804c7bbc-0048-4b6d-902c-c74f96d07cbc'::uuid, 'dcabf9d8-600b-438c-bd5d-0f2857785cd7'::uuid, '6c248530-744b-416b-a16f-2c3021118d87'::uuid, '2026-08-17 10:14:35.048+00'::timestamptz, '9bcf5c65-7b3e-4f90-b5d7-276f40d8d27e'::uuid, '2026-08-17 10:14:34.971815+00'::timestamptz, 500::numeric, 'f5d1e22ac9291e7f6fcb5974481eab97'::text),
    ('895638bd-6568-4e48-aac0-876eea91fa88'::uuid, 'e2fdd626-cdab-4f34-b7ca-2d52b5412e9d'::uuid, '59d76d2f-86c2-4457-8a95-a6ffc5b577b1'::uuid, '2026-08-17 10:14:35.048+00'::timestamptz, '9bcf5c65-7b3e-4f90-b5d7-276f40d8d27e'::uuid, '2026-08-17 10:14:34.971815+00'::timestamptz, 1000::numeric, '45d114c544f332ebbdd943f7de3cb69e'::text),
    ('a131fafb-347b-476e-95c0-2329ad641805'::uuid, '401426ab-77df-4b6d-bd87-c511319f91b6'::uuid, '6b7ca133-70c6-4015-9323-4a3bf752434c'::uuid, '2026-08-17 10:13:40.350+00'::timestamptz, '2168cc59-0205-4218-a141-15a9ac666877'::uuid, '2026-08-17 10:13:40.294923+00'::timestamptz, 1000::numeric, 'd7b73505bde4e7e981213ec173dee993'::text),
    ('a267452a-802b-4d57-8b49-8d161aca508d'::uuid, 'afb16e3d-95d0-4823-918e-f7c8f52dd6f5'::uuid, '59839e2a-ec55-4ca5-a770-8e45f433d18a'::uuid, '2026-08-17 10:13:40.350+00'::timestamptz, '2168cc59-0205-4218-a141-15a9ac666877'::uuid, '2026-08-17 10:13:40.294923+00'::timestamptz, 1000::numeric, '5122844cda4cf0ff17e0bc6a6e4ab478'::text),
    ('e084cec0-c0d6-4429-8324-6c2a0f58db7f'::uuid, '51607035-b574-44c5-ae84-f7e676d7a4d8'::uuid, 'b13c8a5a-fef4-4dc2-9d9a-7aff7209e5b1'::uuid, '2026-08-17 10:14:35.048+00'::timestamptz, '9bcf5c65-7b3e-4f90-b5d7-276f40d8d27e'::uuid, '2026-08-17 10:14:34.971815+00'::timestamptz, 800::numeric, 'df70d8ca9dd4ba948b13666b0727adc2'::text),
    ('e392d1da-bfd1-4b40-ac48-4e5c14afb7c0'::uuid, '90db681e-b166-479e-b4ed-6087266d1dfe'::uuid, '9a77baf7-5df4-48fe-92ad-2cdab810d9af'::uuid, '2026-08-17 10:13:40.350+00'::timestamptz, '21db71fc-ac14-44c1-b5f6-03fcfcf64fc9'::uuid, '2026-08-17 10:13:40.294923+00'::timestamptz, 500::numeric, 'e109d44867d43edf1a56621f0a3ac3ab'::text),
    ('eb92008c-d17e-4eff-9f8b-99c5e5ab8ee0'::uuid, 'fd51e91e-af3a-4c0e-897f-0a5afbac766d'::uuid, 'ab5d8c9b-37c2-4b2b-b806-9a0a3819b055'::uuid, '2026-08-17 10:14:35.048+00'::timestamptz, '9bcf5c65-7b3e-4f90-b5d7-276f40d8d27e'::uuid, '2026-08-17 10:14:34.971815+00'::timestamptz, 1000::numeric, '167b17c70abb8c37b303087553515b52'::text),
    ('f01335fe-0807-46f2-ba02-0a84ca5a67c7'::uuid, '63317742-a4cc-4e6a-86ec-f44075f9a0e8'::uuid, 'e92882a7-2d03-415b-8f85-e2533474eb69'::uuid, '2026-08-17 10:13:40.350+00'::timestamptz, '21db71fc-ac14-44c1-b5f6-03fcfcf64fc9'::uuid, '2026-08-17 10:13:40.294923+00'::timestamptz, 1000::numeric, 'df451b2d8ac5ee33d758a7eab4515c65'::text)
    ) AS t(service_id, quotation_id, abs_id, expected_service_deleted_at, expected_customer_id,
           expected_lifecycle_updated_at, expected_total, expected_item_digest);
$function$;

CREATE FUNCTION public._w11_m0_01_downstream_link_counts()
RETURNS TABLE (relation_name text, link_count bigint)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $function$
WITH targets AS (
    SELECT t.service_id, t.quotation_id, t.abs_id
    FROM public._w11_m0_01_retirement_targets() AS t
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

CREATE FUNCTION public._w11_m0_01_valid_state_count(
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
FROM public._w11_m0_01_retirement_targets() AS t
JOIN public.services AS s ON s.id = t.service_id
JOIN public.service_lifecycle_states AS sl ON sl.service_id = t.service_id
JOIN public.customers AS c ON c.id = s.customer_id
JOIN public.quotations AS q ON q.id = t.quotation_id
JOIN public.approved_billing_scopes AS a ON a.id = t.abs_id
WHERE s.status = 'Approved'
  AND s.deleted_at = t.expected_service_deleted_at
  AND s.cancellation_reason IS NULL
  AND s.customer_id = t.expected_customer_id
  AND c.is_deleted IS TRUE
  AND c.deleted_at IS NULL
  AND sl.legacy_status = 'Approved'
  AND sl.commercial_state = 'approved'
  AND sl.payment_state = 'unassessed'
  AND sl.readiness_state = 'unassessed'
  AND sl.execution_state = 'not_started'
  AND sl.completion_state = 'pending'
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
      SELECT string_agg(to_jsonb(i)::text, E'\n' ORDER BY i.id)
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
       AND a.void_reason = 'OWNER-AUTHORIZED M0-01 REMEDIATION; no historical cause or financial impact is inferred.'
       AND a.updated_by = p_owner_actor_id)
  );
$function$;

CREATE FUNCTION public.enforce_w11_m0_01_retirement_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_context text;
    v_actor_id text;
BEGIN
    v_context := current_setting('g7.w11_m0_01_context', true);
    IF v_context IS NULL OR v_context = '' THEN
        RETURN NEW;
    END IF;

    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_retirement_context_forbidden';
    END IF;
    IF v_context <> 'W11-M0-01-14-APPROVED-ABS-RETIREMENT'
        OR TG_OP <> 'UPDATE'
        OR OLD.status <> 'approved'
        OR NEW.status <> 'voided'
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_retirement_context_invalid';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public._w11_m0_01_retirement_targets() AS t
        WHERE t.service_id = OLD.service_id
          AND t.quotation_id = OLD.source_quotation_id
          AND t.abs_id = OLD.id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_retirement_target_invalid';
    END IF;

    v_actor_id := current_setting('g7.w11_m0_01_actor_id', true);
    IF v_actor_id IS NULL OR btrim(v_actor_id) = ''
        OR NEW.voided_by IS DISTINCT FROM v_actor_id
        OR NEW.updated_by IS DISTINCT FROM v_actor_id
        OR NEW.voided_at IS DISTINCT FROM transaction_timestamp()
        OR NEW.void_reason IS DISTINCT FROM 'OWNER-AUTHORIZED M0-01 REMEDIATION; no historical cause or financial impact is inferred.'
        OR (to_jsonb(NEW) - ARRAY['status', 'voided_at', 'voided_by', 'void_reason', 'updated_by', 'updated_at'])
           IS DISTINCT FROM
           (to_jsonb(OLD) - ARRAY['status', 'voided_at', 'voided_by', 'void_reason', 'updated_by', 'updated_at'])
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_retirement_transition_invalid';
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
            AND NOT (v_is_w11_m0_01_retirement AND v_service_status = 'Approved'))
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
        IF v_service_status = 'Completed' THEN
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

COMMENT ON FUNCTION public.check_approved_billing_scopes_before_write() IS
    'Preserves ordinary ABS lifecycle checks; permits only the fixed W11 M0-01 retirement transition while the invoker guard verifies postgres execution.';

CREATE TRIGGER w11_m0_01_retirement_context_guard_trg
BEFORE UPDATE ON public.approved_billing_scopes
FOR EACH ROW EXECUTE FUNCTION public.enforce_w11_m0_01_retirement_context();

CREATE FUNCTION public.retire_w11_m0_01_approved_abs(p_owner_actor_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_owner_actor_id text := NULLIF(btrim(COALESCE(p_owner_actor_id, '')), '');
    v_batch_id constant text := 'W11-M0-01-14-APPROVED-ABS-RETIREMENT';
    v_event_type constant text := 'approved_billing_scope_m0_01_owner_authorized_remediation_retired';
    v_authorization_ref constant text := 'OWNER AUTHORIZATION — M0-01 14-CASE DEV REMEDIATION';
    v_reason constant text := 'OWNER-AUTHORIZED M0-01 REMEDIATION; no historical cause or financial impact is inferred.';
    v_now timestamptz;
    v_previous_context text;
    v_previous_actor_id text;
    v_max_audit_timestamp timestamptz;
    v_manifest_count bigint;
    v_distinct_services bigint;
    v_distinct_quotations bigint;
    v_distinct_abs bigint;
    v_locked_count bigint;
    v_actor_count bigint;
    v_pre_state_count bigint;
    v_post_state_count bigint;
    v_batch_event_count bigint;
    v_distinct_audit_abs bigint;
    v_audit_count bigint;
    v_exact_audit_count bigint;
    v_links text[];
BEGIN
    IF v_owner_actor_id IS NULL OR char_length(v_owner_actor_id) > 200 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_owner_actor_invalid';
    END IF;

    SELECT count(*) INTO v_actor_count
    FROM public.app_users AS u
    WHERE u.clerk_user_id = v_owner_actor_id
      AND u.role = 'admin'
      AND u.is_active IS TRUE;
    IF v_actor_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_owner_actor_not_active_admin';
    END IF;
    PERFORM 1
    FROM public.app_users AS u
    WHERE u.clerk_user_id = v_owner_actor_id
      AND u.role = 'admin'
      AND u.is_active IS TRUE
    FOR SHARE;
    GET DIAGNOSTICS v_actor_count = ROW_COUNT;
    IF v_actor_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_owner_actor_not_active_admin';
    END IF;

    v_previous_context := NULLIF(current_setting('g7.w11_m0_01_context', true), '');
    v_previous_actor_id := NULLIF(current_setting('g7.w11_m0_01_actor_id', true), '');
    IF v_previous_context IS NOT NULL OR v_previous_actor_id IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_context_already_set';
    END IF;

    SELECT count(*), count(DISTINCT t.service_id), count(DISTINCT t.quotation_id), count(DISTINCT t.abs_id)
    INTO v_manifest_count, v_distinct_services, v_distinct_quotations, v_distinct_abs
    FROM public._w11_m0_01_retirement_targets() AS t;
    IF v_manifest_count <> 14 OR v_distinct_services <> 14
        OR v_distinct_quotations <> 14 OR v_distinct_abs <> 14
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_fixed_manifest_invalid';
    END IF;

    PERFORM s.id
    FROM public.services AS s
    JOIN public._w11_m0_01_retirement_targets() AS t ON t.service_id = s.id
    ORDER BY s.id
    FOR UPDATE OF s;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_service_lock_set_invalid';
    END IF;

    PERFORM sl.service_id
    FROM public.service_lifecycle_states AS sl
    JOIN public._w11_m0_01_retirement_targets() AS t ON t.service_id = sl.service_id
    ORDER BY sl.service_id
    FOR UPDATE OF sl;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_lifecycle_lock_set_invalid';
    END IF;

    PERFORM c.id
    FROM public.customers AS c
    JOIN (
        SELECT DISTINCT t.expected_customer_id
        FROM public._w11_m0_01_retirement_targets() AS t
    ) AS target_customers ON target_customers.expected_customer_id = c.id
    ORDER BY c.id
    FOR UPDATE OF c;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 3 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_customer_lock_set_invalid';
    END IF;

    PERFORM q.id
    FROM public.quotations AS q
    JOIN public._w11_m0_01_retirement_targets() AS t ON t.quotation_id = q.id
    ORDER BY q.id
    FOR UPDATE OF q;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_quotation_lock_set_invalid';
    END IF;

    PERFORM a.id
    FROM public.approved_billing_scopes AS a
    JOIN public._w11_m0_01_retirement_targets() AS t ON t.abs_id = a.id
    ORDER BY a.id
    FOR UPDATE OF a;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_abs_lock_set_invalid';
    END IF;

    PERFORM i.id
    FROM public.approved_billing_scope_items AS i
    JOIN public._w11_m0_01_retirement_targets() AS t ON t.abs_id = i.approved_billing_scope_id
    ORDER BY i.id
    FOR UPDATE OF i;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_item_lock_set_invalid';
    END IF;

    SELECT public._w11_m0_01_valid_state_count('approved', v_owner_actor_id, NULL)
    INTO v_pre_state_count;
    SELECT count(*) INTO v_batch_event_count
    FROM public.audit_logs AS al
    WHERE al.details ->> 'batch_id' = v_batch_id;

    IF v_batch_event_count > 0 THEN
        SELECT count(*), count(DISTINCT al.entity_id), min(al.timestamp), max(al.timestamp)
        INTO v_audit_count, v_distinct_audit_abs, v_now, v_max_audit_timestamp
        FROM public.audit_logs AS al
        WHERE al.details ->> 'batch_id' = v_batch_id;

        IF v_audit_count = 14 AND v_distinct_audit_abs = 14 AND v_now IS NOT NULL
            AND v_now = v_max_audit_timestamp
        THEN
            SELECT public._w11_m0_01_valid_state_count('voided', v_owner_actor_id, v_now)
            INTO v_post_state_count;

            SELECT count(*) INTO v_exact_audit_count
            FROM public._w11_m0_01_retirement_targets() AS t
            WHERE (
                SELECT count(*)
                FROM public.audit_logs AS al
                WHERE al.action = 'status_change'
                  AND al.entity_type = 'approved_billing_scope'
                  AND al.entity_id = t.abs_id
                  AND al.user_id = v_owner_actor_id
                  AND al.timestamp = v_now
                  AND al.details = jsonb_build_object(
                    'event_type', 'approved_billing_scope_m0_01_owner_authorized_remediation_retired',
                    'batch_id', 'W11-M0-01-14-APPROVED-ABS-RETIREMENT',
                    'owner_authorization_ref', 'OWNER AUTHORIZATION — M0-01 14-CASE DEV REMEDIATION',
                    'actor_context', 'Owner-authorized DEV remediation',
                    'service_id', t.service_id,
                    'quotation_id', t.quotation_id,
                    'approved_billing_scope_id', t.abs_id,
                    'scope_version', 1,
                    'reason_code', 'other',
                    'reason_note', 'OWNER-AUTHORIZED M0-01 REMEDIATION; no historical cause or financial impact is inferred.',
                    'recorded_at', v_now,
                    'prior_status', 'approved',
                    'prior_voided_at', NULL,
                    'prior_superseded_at', NULL,
                    'result_status', 'voided',
                    'result_voided_at', v_now,
                    'lifecycle_outcome', 'active_approved_authority_retired'
                )
            ) = 1;

            IF v_post_state_count = 14 AND v_exact_audit_count = 14 THEN
                RETURN jsonb_build_object('batch_id', v_batch_id, 'retired_count', 14,
                    'idempotent_replay', true, 'recorded_at', v_now);
            END IF;
        END IF;

        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_prior_batch_state_mismatch';
    END IF;

    IF v_pre_state_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_precondition_state_mismatch';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public._w11_m0_01_retirement_targets() AS t
        JOIN public.approved_billing_scopes AS a ON a.id = t.abs_id
        WHERE (
            SELECT count(*)
            FROM public.audit_logs AS al
            WHERE al.entity_type = 'approved_billing_scope'
              AND al.entity_id = t.abs_id
        ) <> 1
        OR NOT EXISTS (
            SELECT 1
            FROM public.audit_logs AS al
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
        )
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_prior_abs_audit_state_mismatch';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public._w11_m0_01_retirement_targets() AS t
        JOIN public.audit_logs AS al
          ON al.entity_type = 'approved_billing_scope'
         AND al.entity_id = t.abs_id
        WHERE al.details ->> 'event_type' = 'approved_billing_scope_voided'
           OR al.details ->> 'event_type' = v_event_type
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_prior_void_audit_found';
    END IF;

    SELECT COALESCE(array_agg(link.relation_name ORDER BY link.relation_name), ARRAY[]::text[])
    INTO v_links
    FROM public._w11_m0_01_downstream_link_counts() AS link;
    IF cardinality(v_links) > 0 THEN
        RAISE EXCEPTION 'w11_m0_01_downstream_links_found: %', array_to_string(v_links, ',');
    END IF;

    v_now := transaction_timestamp();
    PERFORM set_config('g7.w11_m0_01_context', v_batch_id, true);
    PERFORM set_config('g7.w11_m0_01_actor_id', v_owner_actor_id, true);

    UPDATE public.approved_billing_scopes AS a
    SET status = 'voided',
        voided_at = v_now,
        voided_by = v_owner_actor_id,
        void_reason = v_reason,
        updated_by = v_owner_actor_id
    FROM public._w11_m0_01_retirement_targets() AS t
    WHERE a.id = t.abs_id
      AND a.service_id = t.service_id
      AND a.source_quotation_id = t.quotation_id
      AND a.status = 'approved'
      AND a.voided_at IS NULL
      AND a.superseded_at IS NULL;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_abs_update_count_invalid';
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    SELECT
        'status_change',
        'approved_billing_scope',
        t.abs_id,
        v_owner_actor_id,
        jsonb_build_object(
            'event_type', v_event_type,
            'batch_id', v_batch_id,
            'owner_authorization_ref', v_authorization_ref,
            'actor_context', 'Owner-authorized DEV remediation',
            'service_id', t.service_id,
            'quotation_id', t.quotation_id,
            'approved_billing_scope_id', t.abs_id,
            'scope_version', 1,
            'reason_code', 'other',
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
    FROM public._w11_m0_01_retirement_targets() AS t
    ORDER BY t.abs_id;
    GET DIAGNOSTICS v_audit_count = ROW_COUNT;
    IF v_audit_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_audit_insert_count_invalid';
    END IF;

    PERFORM set_config('g7.w11_m0_01_context', COALESCE(v_previous_context, ''), true);
    PERFORM set_config('g7.w11_m0_01_actor_id', COALESCE(v_previous_actor_id, ''), true);

    SELECT public._w11_m0_01_valid_state_count('voided', v_owner_actor_id, v_now)
    INTO v_post_state_count;
    IF v_post_state_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_postcondition_state_mismatch';
    END IF;

    SELECT count(*) INTO v_exact_audit_count
    FROM public._w11_m0_01_retirement_targets() AS t
    WHERE (
        SELECT count(*)
        FROM public.audit_logs AS al
        WHERE al.action = 'status_change'
          AND al.entity_type = 'approved_billing_scope'
          AND al.entity_id = t.abs_id
          AND al.user_id = v_owner_actor_id
          AND al.timestamp = v_now
          AND al.details = jsonb_build_object(
                    'event_type', 'approved_billing_scope_m0_01_owner_authorized_remediation_retired',
                    'batch_id', 'W11-M0-01-14-APPROVED-ABS-RETIREMENT',
                    'owner_authorization_ref', 'OWNER AUTHORIZATION — M0-01 14-CASE DEV REMEDIATION',
                    'actor_context', 'Owner-authorized DEV remediation',
                    'service_id', t.service_id,
                    'quotation_id', t.quotation_id,
                    'approved_billing_scope_id', t.abs_id,
                    'scope_version', 1,
                    'reason_code', 'other',
                    'reason_note', 'OWNER-AUTHORIZED M0-01 REMEDIATION; no historical cause or financial impact is inferred.',
                    'recorded_at', v_now,
                    'prior_status', 'approved',
                    'prior_voided_at', NULL,
                    'prior_superseded_at', NULL,
                    'result_status', 'voided',
                    'result_voided_at', v_now,
                    'lifecycle_outcome', 'active_approved_authority_retired'
                )
    ) = 1;
    IF v_exact_audit_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_audit_postcondition_mismatch';
    END IF;

    SELECT count(*) INTO v_batch_event_count
    FROM public.audit_logs AS al
    WHERE al.details ->> 'batch_id' = v_batch_id;
    IF v_batch_event_count <> 14 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_batch_audit_count_invalid';
    END IF;

    SELECT COALESCE(array_agg(link.relation_name ORDER BY link.relation_name), ARRAY[]::text[])
    INTO v_links
    FROM public._w11_m0_01_downstream_link_counts() AS link;
    IF cardinality(v_links) > 0 THEN
        RAISE EXCEPTION 'w11_m0_01_downstream_postcondition_failed: %', array_to_string(v_links, ',');
    END IF;

    RETURN jsonb_build_object('batch_id', v_batch_id, 'retired_count', 14,
        'idempotent_replay', false, 'recorded_at', v_now);
END;
$function$;

ALTER FUNCTION public._w11_m0_01_retirement_targets() OWNER TO postgres;
ALTER FUNCTION public._w11_m0_01_downstream_link_counts() OWNER TO postgres;
ALTER FUNCTION public._w11_m0_01_valid_state_count(text, text, timestamptz) OWNER TO postgres;
ALTER FUNCTION public.enforce_w11_m0_01_retirement_context() OWNER TO postgres;
ALTER FUNCTION public.retire_w11_m0_01_approved_abs(text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public._w11_m0_01_retirement_targets() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._w11_m0_01_downstream_link_counts() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public._w11_m0_01_valid_state_count(text, text, timestamptz) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_w11_m0_01_retirement_context() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.retire_w11_m0_01_approved_abs(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retire_w11_m0_01_approved_abs(text) TO service_role;

COMMENT ON FUNCTION public.retire_w11_m0_01_approved_abs(text) IS
    'One-time fixed 14-case W11 M0-01 DEV remediation. No target IDs or financial amounts are accepted; source authority and audit history are preserved.';

COMMENT ON FUNCTION public.enforce_w11_m0_01_retirement_context() IS
    'SECURITY INVOKER guard for the fixed W11 M0-01 context; caller role and exact field transition are checked before the table update.';

COMMIT;
