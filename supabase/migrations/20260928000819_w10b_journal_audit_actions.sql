-- W10B corrective: scope journal lifecycle audit actions to journal entities.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.accounting_journals') IS NULL
     OR to_regclass('public.audit_logs') IS NULL
     OR to_regprocedure('public.save_accounting_posting_rule(uuid,uuid,integer,jsonb,text,text,uuid)') IS NULL
     OR to_regprocedure('public.prepare_accounting_journal(uuid,uuid,integer,jsonb,text,text,uuid)') IS NULL
     OR to_regprocedure('public.post_accounting_journal(uuid,uuid,integer,uuid)') IS NULL
     OR to_regprocedure('public.reverse_accounting_journal(uuid,uuid,uuid,date,text,text,uuid)') IS NULL THEN
    RAISE EXCEPTION 'W10B audit-action correction preflight: journal dependencies are missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint c
    WHERE c.conrelid='public.audit_logs'::regclass
      AND c.conname='audit_logs_action_check'
      AND pg_get_constraintdef(c.oid) LIKE '%customer_receipt_reversed%'
      AND pg_get_constraintdef(c.oid) NOT LIKE '%accounting_journal%'
  ) THEN
    RAISE EXCEPTION 'W10B audit-action correction preflight: audit action baseline differs';
  END IF;
END;
$preflight$;

ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
  action = ANY (ARRAY[
    'create'::text, 'update'::text, 'delete'::text, 'restore'::text, 'status_change'::text,
    'payment_recorded'::text, 'correction'::text,
    'procurement_package_created'::text, 'procurement_package_updated'::text,
    'procurement_package_requirements_set'::text, 'procurement_package_supplier_selected'::text,
    'procurement_package_supplier_cleared'::text, 'expense_submitted'::text,
    'expense_approved'::text, 'expense_rejected'::text, 'expense_cancelled'::text,
    'expense_evidence_exception_recorded'::text, 'expense_evidence_exception_disposed'::text,
    'expense_document_attached'::text, 'expense_reimbursement_settled'::text,
    'cash_advance_requested'::text, 'cash_advance_approved'::text, 'cash_advance_rejected'::text,
    'cash_advance_cancelled'::text, 'cash_advance_issued'::text,
    'cash_advance_expense_settled'::text, 'cash_advance_returned'::text,
    'petty_cash_transaction_recorded'::text, 'expense_finance_reviewed'::text,
    'supplier_bill_recorded'::text, 'supplier_bill_updated'::text,
    'supplier_bill_documents_attached'::text, 'supplier_bill_approved'::text,
    'supplier_payment_recorded'::text, 'supplier_payment_reversed'::text,
    'supplier_advance_authorized'::text, 'supplier_advance_payment_recorded'::text,
    'supplier_advance_payment_reversed'::text, 'supplier_advance_allocated'::text,
    'supplier_advance_allocation_corrected'::text, 'supplier_advance_refund_recorded'::text,
    'customer_receipt_recorded'::text, 'customer_receipt_allocated'::text,
    'customer_receipt_allocation_reversed'::text, 'customer_receipt_reversed'::text
  ])
  OR (
    entity_type='accounting_journal'
    AND action = ANY (ARRAY['prepare'::text, 'post'::text, 'reverse'::text])
  )
);

COMMIT;
