-- W6A: Supplier Bills foundation for Event/Service supplier obligations.
--
-- This migration is authored only. It must be reviewed and applied through the
-- approved Supabase workflow; it is intentionally not applied by this task.
-- Routine company operating expenses remain in W5 Expense/Cash workflows.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.app_users') IS NULL
        OR to_regclass('public.services') IS NULL
        OR to_regclass('public.suppliers') IS NULL
        OR to_regclass('public.approved_commitments') IS NULL
        OR to_regclass('public.approved_commitment_balances') IS NULL
        OR to_regclass('public.service_receipts') IS NULL
        OR to_regclass('public.business_documents') IS NULL
        OR to_regclass('public.business_document_links') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regclass('public.number_sequences') IS NULL
    THEN
        RAISE EXCEPTION 'W6A preflight failed: required W4 foundation is missing';
    END IF;

    IF to_regclass('public.supplier_bills') IS NOT NULL
        OR to_regclass('public.supplier_bill_documents') IS NOT NULL
        OR to_regprocedure('public.create_supplier_bill(uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.update_supplier_bill(uuid,uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.attach_supplier_bill_documents(uuid,uuid[],uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.approve_supplier_bill(uuid,uuid,text,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'W6A preflight failed: Supplier Bills objects already exist';
    END IF;
END;
$$;

-- Preserve every existing audit action and append only the W6A actions.
ALTER TABLE public.audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_action_check
    CHECK (
        action = ANY (
            ARRAY[
                'create'::text,
                'update'::text,
                'delete'::text,
                'restore'::text,
                'status_change'::text,
                'payment_recorded'::text,
                'correction'::text,
                'procurement_package_created'::text,
                'procurement_package_updated'::text,
                'procurement_package_requirements_set'::text,
                'procurement_package_supplier_selected'::text,
                'procurement_package_supplier_cleared'::text,
                'expense_submitted'::text,
                'expense_approved'::text,
                'expense_rejected'::text,
                'expense_cancelled'::text,
                'expense_evidence_exception_recorded'::text,
                'expense_evidence_exception_disposed'::text,
                'expense_document_attached'::text,
                'expense_reimbursement_settled'::text,
                'cash_advance_requested'::text,
                'cash_advance_approved'::text,
                'cash_advance_rejected'::text,
                'cash_advance_cancelled'::text,
                'cash_advance_issued'::text,
                'cash_advance_expense_settled'::text,
                'cash_advance_returned'::text,
                'petty_cash_transaction_recorded'::text,
                'expense_finance_reviewed'::text,
                'supplier_bill_recorded'::text,
                'supplier_bill_updated'::text,
                'supplier_bill_documents_attached'::text,
                'supplier_bill_approved'::text
            ]
        )
    );

-- Extend the existing atomic document-number sequence without changing any
-- previously issued number format.
ALTER TABLE public.number_sequences
    DROP CONSTRAINT IF EXISTS number_sequences_type_check;

ALTER TABLE public.number_sequences
    ADD CONSTRAINT number_sequences_type_check
    CHECK (
        type IN (
            'quotation', 'invoice', 'payment', 'project', 'service', 'customer',
            'supplier_booking', 'expense', 'cash_advance', 'supplier_bill'
        )
    );

CREATE OR REPLACE FUNCTION public.generate_document_number(doc_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    current_year integer;
    seq_record record;
BEGIN
    IF doc_type IS NULL OR doc_type NOT IN (
        'quotation', 'invoice', 'payment', 'project', 'service', 'customer',
        'supplier_booking', 'expense', 'cash_advance', 'supplier_bill'
    ) THEN
        RAISE EXCEPTION 'Invalid doc_type: %', doc_type;
    END IF;

    current_year := extract(year FROM current_date)::integer;

    INSERT INTO public.number_sequences (type, year, sequence, prefix, example_format)
    VALUES (
        doc_type,
        current_year,
        1,
        CASE
            WHEN doc_type = 'quotation' THEN 'QT'
            WHEN doc_type = 'invoice' THEN 'INV'
            WHEN doc_type = 'payment' THEN 'PAY'
            WHEN doc_type = 'project' THEN 'PRJ'
            WHEN doc_type = 'service' THEN 'SVC'
            WHEN doc_type = 'customer' THEN 'CUST'
            WHEN doc_type = 'supplier_booking' THEN 'SBK'
            WHEN doc_type = 'expense' THEN 'EXP'
            WHEN doc_type = 'cash_advance' THEN 'ADV'
            WHEN doc_type = 'supplier_bill' THEN 'BILL'
        END,
        CASE
            WHEN doc_type = 'quotation' THEN 'QT-YYYY-0001'
            WHEN doc_type = 'invoice' THEN 'INV-YYYY-0001'
            WHEN doc_type = 'payment' THEN 'PAY-YYYY-0001'
            WHEN doc_type = 'project' THEN 'PRJ-YYYY-0001'
            WHEN doc_type = 'service' THEN 'SVC-YYYY-0001'
            WHEN doc_type = 'customer' THEN 'CUST-YYYY-0001'
            WHEN doc_type = 'supplier_booking' THEN 'SBK-YYYY-0001'
            WHEN doc_type = 'expense' THEN 'EXP-YYYY-0001'
            WHEN doc_type = 'cash_advance' THEN 'ADV-YYYY-0001'
            WHEN doc_type = 'supplier_bill' THEN 'BILL-YYYY-0001'
        END
    )
    ON CONFLICT (type, year) DO UPDATE
        SET sequence = public.number_sequences.sequence + 1
    RETURNING * INTO seq_record;

    RETURN seq_record.prefix || '-' || current_year || '-' || lpad(seq_record.sequence::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_document_number(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_document_number(text) TO service_role;

CREATE TABLE public.supplier_bills (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number text NOT NULL UNIQUE,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    commitment_id uuid NOT NULL,
    service_receipt_id uuid NOT NULL,
    invoice_number text NOT NULL,
    invoice_date date NOT NULL,
    due_date date,
    currency text NOT NULL DEFAULT 'SAR',
    subtotal numeric(14,2) NOT NULL,
    vat_amount numeric(14,2) NOT NULL DEFAULT 0,
    total_amount numeric(14,2) NOT NULL,
    supplier_name_snapshot text NOT NULL,
    supplier_legal_name_snapshot text NOT NULL,
    supplier_cr_number_snapshot text,
    supplier_vat_registration_status_snapshot text,
    supplier_vat_number_snapshot text,
    status text NOT NULL DEFAULT 'pending',
    recorded_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    approved_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    approved_at timestamptz,
    record_request_id uuid NOT NULL UNIQUE,
    CONSTRAINT supplier_bills_commitment_scope_fkey
        FOREIGN KEY (commitment_id, service_id, supplier_id)
        REFERENCES public.approved_commitments(id, service_id, supplier_id)
        ON DELETE RESTRICT,
    CONSTRAINT supplier_bills_receipt_scope_fkey
        FOREIGN KEY (service_receipt_id, service_id, supplier_id, commitment_id)
        REFERENCES public.service_receipts(id, service_id, supplier_id, commitment_id)
        ON DELETE RESTRICT,
    CONSTRAINT supplier_bills_number_format_check CHECK (
        bill_number ~ '^BILL-[0-9]{4}-[0-9]{4}$'
    ),
    CONSTRAINT supplier_bills_invoice_number_check CHECK (
        char_length(btrim(invoice_number)) BETWEEN 1 AND 200
        AND invoice_number = btrim(invoice_number)
        AND invoice_number !~ '[[:cntrl:]]'
    ),
    CONSTRAINT supplier_bills_currency_check CHECK (
        currency ~ '^[A-Z]{3}$'
    ),
    CONSTRAINT supplier_bills_subtotal_check CHECK (
        subtotal >= 0 AND subtotal <= 999999999999.99
    ),
    CONSTRAINT supplier_bills_vat_check CHECK (
        vat_amount >= 0 AND vat_amount <= 999999999999.99
    ),
    CONSTRAINT supplier_bills_total_check CHECK (
        total_amount > 0
        AND total_amount <= 999999999999.99
        AND total_amount = subtotal + vat_amount
    ),
    CONSTRAINT supplier_bills_due_date_check CHECK (
        due_date IS NULL OR due_date >= invoice_date
    ),
    CONSTRAINT supplier_bills_status_check CHECK (
        status IN ('pending', 'approved')
    ),
    CONSTRAINT supplier_bills_approval_pair_check CHECK (
        (status = 'pending' AND approved_by IS NULL AND approved_at IS NULL)
        OR (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    ),
    CONSTRAINT supplier_bills_snapshot_check CHECK (
        char_length(btrim(supplier_name_snapshot)) BETWEEN 1 AND 255
        AND char_length(btrim(supplier_legal_name_snapshot)) BETWEEN 1 AND 255
        AND (supplier_cr_number_snapshot IS NULL OR char_length(btrim(supplier_cr_number_snapshot)) <= 200)
        AND (supplier_vat_registration_status_snapshot IS NULL OR supplier_vat_registration_status_snapshot IN ('not_registered', 'registered', 'unknown'))
        AND (supplier_vat_number_snapshot IS NULL OR char_length(btrim(supplier_vat_number_snapshot)) <= 200)
    )
);

CREATE TABLE public.supplier_bill_documents (
    supplier_bill_id uuid NOT NULL REFERENCES public.supplier_bills(id) ON DELETE RESTRICT,
    document_id uuid NOT NULL REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    attached_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    attached_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    PRIMARY KEY (supplier_bill_id, document_id)
);

CREATE UNIQUE INDEX supplier_bills_supplier_invoice_unique_idx
    ON public.supplier_bills (supplier_id, lower(btrim(invoice_number)));
CREATE INDEX supplier_bills_service_status_idx
    ON public.supplier_bills (service_id, status, invoice_date DESC, id DESC);
CREATE INDEX supplier_bills_commitment_status_idx
    ON public.supplier_bills (commitment_id, status, invoice_date DESC, id DESC);
CREATE INDEX supplier_bills_supplier_status_idx
    ON public.supplier_bills (supplier_id, status, invoice_date DESC, id DESC);
CREATE INDEX supplier_bill_documents_bill_idx
    ON public.supplier_bill_documents (supplier_bill_id, attached_at DESC, document_id DESC);

CREATE OR REPLACE FUNCTION public.prevent_approved_supplier_bill_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF OLD.status = 'approved' THEN
        RAISE EXCEPTION 'supplier_bill_approved_immutable';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER supplier_bills_approved_immutable
    BEFORE UPDATE OR DELETE ON public.supplier_bills
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_approved_supplier_bill_mutation();

ALTER TABLE public.supplier_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_bill_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.supplier_bills FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.supplier_bill_documents FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.supplier_bills TO service_role;
GRANT ALL ON TABLE public.supplier_bill_documents TO service_role;
REVOKE ALL ON FUNCTION public.prevent_approved_supplier_bill_mutation() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_supplier_bill(
    p_service_id uuid,
    p_supplier_id uuid,
    p_commitment_id uuid,
    p_service_receipt_id uuid,
    p_invoice_number text,
    p_invoice_date date,
    p_due_date date,
    p_currency text,
    p_subtotal numeric,
    p_vat_amount numeric,
    p_total_amount numeric,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, bill_id uuid, bill_number text, status text, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_invoice_number text := NULLIF(btrim(p_invoice_number), '');
    v_currency text := upper(NULLIF(btrim(p_currency), ''));
    v_supplier_name text;
    v_supplier_legal_name text;
    v_supplier_cr_number text;
    v_supplier_vat_status text;
    v_supplier_vat_number text;
    v_commitment_currency text;
    v_commitment_status text;
    v_existing_id uuid;
    v_existing_number text;
    v_existing_status text;
    v_audit_payload jsonb;
    v_payload jsonb;
    v_bill_id uuid;
    v_bill_number text;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR p_request_id IS NULL
        OR p_service_id IS NULL
        OR p_supplier_id IS NULL
        OR p_commitment_id IS NULL
        OR p_service_receipt_id IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'accountant')
    THEN
        RETURN QUERY SELECT 'supplier_bill_request_invalid', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_bill_request_invalid', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM public.app_users u
        WHERE u.id = v_actor_uuid AND u.is_active = true AND u.role = p_actor_role
    ) THEN
        RETURN QUERY SELECT 'supplier_bill_permission_denied', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;

    IF p_invoice_date IS NULL
        OR v_invoice_number IS NULL
        OR v_currency IS NULL
        OR v_currency !~ '^[A-Z]{3}$'
        OR p_subtotal IS NULL OR p_subtotal < 0 OR p_subtotal > 999999999999.99
        OR p_vat_amount IS NULL OR p_vat_amount < 0 OR p_vat_amount > 999999999999.99
        OR p_total_amount IS NULL OR p_total_amount <= 0 OR p_total_amount > 999999999999.99
        OR p_total_amount <> p_subtotal + p_vat_amount
        OR p_due_date IS NOT NULL AND p_due_date < p_invoice_date
    THEN
        RETURN QUERY SELECT 'supplier_bill_fields_invalid', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'service_id', p_service_id,
        'supplier_id', p_supplier_id,
        'commitment_id', p_commitment_id,
        'service_receipt_id', p_service_receipt_id,
        'invoice_number', v_invoice_number,
        'invoice_date', p_invoice_date,
        'due_date', p_due_date,
        'currency', v_currency,
        'subtotal', p_subtotal,
        'vat_amount', p_vat_amount,
        'total_amount', p_total_amount
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w6a:supplier_bill_record:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'supplier_bill'
      AND a.details ->> 'operation' = 'supplier_bill_record'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            SELECT b.bill_number, b.status INTO v_existing_number, v_existing_status
            FROM public.supplier_bills b WHERE b.id = v_existing_id;
            IF v_existing_number IS NULL THEN
                RETURN QUERY SELECT 'supplier_bill_unavailable', v_existing_id, NULL::text, 'pending'::text, false;
            ELSE
                RETURN QUERY SELECT 'supplier_bill_request_conflict', v_existing_id, v_existing_number, v_existing_status, false;
            END IF;
            RETURN;
        END IF;
        SELECT b.bill_number, b.status INTO v_existing_number, v_existing_status
        FROM public.supplier_bills b WHERE b.id = v_existing_id;
        IF NOT FOUND THEN
            RETURN QUERY SELECT 'supplier_bill_unavailable', v_existing_id, NULL::text, 'pending'::text, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, v_existing_number, v_existing_status, true;
        RETURN;
    END IF;

    SELECT s.name,
           COALESCE(NULLIF(btrim(s.legal_name), ''), s.name),
           NULLIF(btrim(s.cr_number), ''),
           s.vat_registration_status,
           NULLIF(btrim(s.vat_number), '')
    INTO v_supplier_name, v_supplier_legal_name, v_supplier_cr_number, v_supplier_vat_status, v_supplier_vat_number
    FROM public.suppliers s
    WHERE s.id = p_supplier_id
      AND s.is_deleted = false
      AND s.deleted_at IS NULL
      AND s.status IN ('active', 'on_hold');
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_bill_supplier_unavailable', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;

    SELECT c.currency, c.status
    INTO v_commitment_currency, v_commitment_status
    FROM public.approved_commitments c
    JOIN public.services s ON s.id = c.service_id
    WHERE c.id = p_commitment_id
      AND c.service_id = p_service_id
      AND c.supplier_id = p_supplier_id
      AND s.deleted_at IS NULL
      AND s.status <> 'Cancelled'
    FOR UPDATE OF c;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_bill_commitment_mismatch', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    IF v_commitment_status <> 'open' THEN
        RETURN QUERY SELECT 'supplier_bill_commitment_not_eligible', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    IF v_currency IS DISTINCT FROM btrim(v_commitment_currency) THEN
        RETURN QUERY SELECT 'supplier_bill_currency_mismatch', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.service_receipts r
        WHERE r.id = p_service_receipt_id
          AND r.service_id = p_service_id
          AND r.supplier_id = p_supplier_id
          AND r.commitment_id = p_commitment_id
    ) THEN
        RETURN QUERY SELECT 'supplier_bill_receipt_mismatch', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.supplier_bills b
        WHERE b.supplier_id = p_supplier_id
          AND lower(btrim(b.invoice_number)) = lower(v_invoice_number)
    ) THEN
        RETURN QUERY SELECT 'supplier_bill_duplicate_invoice', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;

    v_bill_number := public.generate_document_number('supplier_bill');
    INSERT INTO public.supplier_bills(
        bill_number, service_id, supplier_id, commitment_id, service_receipt_id,
        invoice_number, invoice_date, due_date, currency, subtotal, vat_amount,
        total_amount, supplier_name_snapshot, supplier_legal_name_snapshot,
        supplier_cr_number_snapshot, supplier_vat_registration_status_snapshot,
        supplier_vat_number_snapshot, status, recorded_by, recorded_at,
        updated_by, updated_at, record_request_id
    ) VALUES (
        v_bill_number, p_service_id, p_supplier_id, p_commitment_id, p_service_receipt_id,
        v_invoice_number, p_invoice_date, p_due_date, v_currency, p_subtotal, p_vat_amount,
        p_total_amount, v_supplier_name, v_supplier_legal_name, v_supplier_cr_number,
        v_supplier_vat_status, v_supplier_vat_number, 'pending', v_actor_uuid, v_now,
        v_actor_uuid, v_now, p_request_id
    ) RETURNING id INTO v_bill_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'supplier_bill_recorded', 'supplier_bill', v_bill_id, p_actor_id,
        jsonb_build_object(
            'operation', 'supplier_bill_record',
            'request_id', p_request_id::text,
            'actor_role', p_actor_role,
            'payload', v_payload
        ), v_now
    );

    RETURN QUERY SELECT NULL::text, v_bill_id, v_bill_number, 'pending'::text, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_supplier_bill(
    p_bill_id uuid,
    p_service_id uuid,
    p_supplier_id uuid,
    p_commitment_id uuid,
    p_service_receipt_id uuid,
    p_invoice_number text,
    p_invoice_date date,
    p_due_date date,
    p_currency text,
    p_subtotal numeric,
    p_vat_amount numeric,
    p_total_amount numeric,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, bill_id uuid, bill_number text, status text, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_invoice_number text := NULLIF(btrim(p_invoice_number), '');
    v_currency text := upper(NULLIF(btrim(p_currency), ''));
    v_existing_number text;
    v_existing_status text;
    v_supplier_name text;
    v_supplier_legal_name text;
    v_supplier_cr_number text;
    v_supplier_vat_status text;
    v_supplier_vat_number text;
    v_commitment_currency text;
    v_commitment_status text;
    v_existing_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
BEGIN
    IF p_bill_id IS NULL OR p_request_id IS NULL
        OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'accountant')
    THEN
        RETURN QUERY SELECT 'supplier_bill_request_invalid', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_bill_request_invalid', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = v_actor_uuid AND u.is_active = true AND u.role = p_actor_role) THEN
        RETURN QUERY SELECT 'supplier_bill_permission_denied', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    IF p_service_id IS NULL OR p_supplier_id IS NULL OR p_commitment_id IS NULL OR p_service_receipt_id IS NULL
        OR p_invoice_date IS NULL OR v_invoice_number IS NULL OR v_currency IS NULL OR v_currency !~ '^[A-Z]{3}$'
        OR p_subtotal IS NULL OR p_subtotal < 0 OR p_subtotal > 999999999999.99
        OR p_vat_amount IS NULL OR p_vat_amount < 0 OR p_vat_amount > 999999999999.99
        OR p_total_amount IS NULL OR p_total_amount <= 0 OR p_total_amount > 999999999999.99
        OR p_total_amount <> p_subtotal + p_vat_amount
        OR p_due_date IS NOT NULL AND p_due_date < p_invoice_date
    THEN
        RETURN QUERY SELECT 'supplier_bill_fields_invalid', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'bill_id', p_bill_id, 'service_id', p_service_id, 'supplier_id', p_supplier_id,
        'commitment_id', p_commitment_id, 'service_receipt_id', p_service_receipt_id,
        'invoice_number', v_invoice_number, 'invoice_date', p_invoice_date,
        'due_date', p_due_date, 'currency', v_currency, 'subtotal', p_subtotal,
        'vat_amount', p_vat_amount, 'total_amount', p_total_amount
    );
    PERFORM pg_advisory_xact_lock(hashtextextended('w6a:supplier_bill_update:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'supplier_bill'
      AND a.details ->> 'operation' = 'supplier_bill_update'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;
    IF FOUND THEN
        SELECT b.bill_number, b.status INTO v_existing_number, v_existing_status FROM public.supplier_bills b WHERE b.id = v_existing_id;
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_bill_id THEN
            RETURN QUERY SELECT 'supplier_bill_request_conflict', v_existing_id, v_existing_number, COALESCE(v_existing_status, 'pending'), false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing_id, v_existing_number, v_existing_status, true;
        END IF;
        RETURN;
    END IF;

    SELECT b.bill_number, b.status INTO v_existing_number, v_existing_status
    FROM public.supplier_bills b WHERE b.id = p_bill_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_bill_not_found', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    IF v_existing_status <> 'pending' THEN
        RETURN QUERY SELECT 'supplier_bill_approved_immutable', p_bill_id, v_existing_number, v_existing_status, false;
        RETURN;
    END IF;

    SELECT s.name, COALESCE(NULLIF(btrim(s.legal_name), ''), s.name), NULLIF(btrim(s.cr_number), ''), s.vat_registration_status, NULLIF(btrim(s.vat_number), '')
    INTO v_supplier_name, v_supplier_legal_name, v_supplier_cr_number, v_supplier_vat_status, v_supplier_vat_number
    FROM public.suppliers s
    WHERE s.id = p_supplier_id AND s.is_deleted = false AND s.deleted_at IS NULL AND s.status IN ('active', 'on_hold');
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_bill_supplier_unavailable', p_bill_id, v_existing_number, 'pending'::text, false;
        RETURN;
    END IF;

    SELECT c.currency, c.status INTO v_commitment_currency, v_commitment_status
    FROM public.approved_commitments c
    JOIN public.services s ON s.id = c.service_id
    WHERE c.id = p_commitment_id AND c.service_id = p_service_id AND c.supplier_id = p_supplier_id
      AND s.deleted_at IS NULL AND s.status <> 'Cancelled'
    FOR UPDATE OF c;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_bill_commitment_mismatch', p_bill_id, v_existing_number, 'pending'::text, false;
        RETURN;
    END IF;
    IF v_commitment_status <> 'open' THEN
        RETURN QUERY SELECT 'supplier_bill_commitment_not_eligible', p_bill_id, v_existing_number, 'pending'::text, false;
        RETURN;
    END IF;
    IF v_currency IS DISTINCT FROM btrim(v_commitment_currency) THEN
        RETURN QUERY SELECT 'supplier_bill_currency_mismatch', p_bill_id, v_existing_number, 'pending'::text, false;
        RETURN;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.service_receipts r
        WHERE r.id = p_service_receipt_id AND r.service_id = p_service_id
          AND r.supplier_id = p_supplier_id AND r.commitment_id = p_commitment_id
    ) THEN
        RETURN QUERY SELECT 'supplier_bill_receipt_mismatch', p_bill_id, v_existing_number, 'pending'::text, false;
        RETURN;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.supplier_bills b
        WHERE b.id <> p_bill_id AND b.supplier_id = p_supplier_id
          AND lower(btrim(b.invoice_number)) = lower(v_invoice_number)
    ) THEN
        RETURN QUERY SELECT 'supplier_bill_duplicate_invoice', p_bill_id, v_existing_number, 'pending'::text, false;
        RETURN;
    END IF;

    UPDATE public.supplier_bills b
    SET service_id = p_service_id, supplier_id = p_supplier_id, commitment_id = p_commitment_id,
        service_receipt_id = p_service_receipt_id, invoice_number = v_invoice_number,
        invoice_date = p_invoice_date, due_date = p_due_date, currency = v_currency,
        subtotal = p_subtotal, vat_amount = p_vat_amount, total_amount = p_total_amount,
        supplier_name_snapshot = v_supplier_name, supplier_legal_name_snapshot = v_supplier_legal_name,
        supplier_cr_number_snapshot = v_supplier_cr_number,
        supplier_vat_registration_status_snapshot = v_supplier_vat_status,
        supplier_vat_number_snapshot = v_supplier_vat_number,
        updated_by = v_actor_uuid, updated_at = v_now
    WHERE b.id = p_bill_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('supplier_bill_updated', 'supplier_bill', p_bill_id, p_actor_id,
        jsonb_build_object('operation', 'supplier_bill_update', 'request_id', p_request_id::text, 'actor_role', p_actor_role, 'payload', v_payload), v_now);
    RETURN QUERY SELECT NULL::text, p_bill_id, v_existing_number, 'pending'::text, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_supplier_bill_documents(
    p_bill_id uuid,
    p_document_ids uuid[],
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, bill_id uuid, document_count integer, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_service_id uuid;
    v_status text;
    v_count integer := 0;
    v_distinct_count integer := 0;
    v_valid_count integer := 0;
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_id uuid;
BEGIN
    IF p_bill_id IS NULL OR p_request_id IS NULL OR p_document_ids IS NULL
        OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'accountant')
    THEN
        RETURN QUERY SELECT 'supplier_bill_document_request_invalid', p_bill_id, 0, false;
        RETURN;
    END IF;
    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_bill_document_request_invalid', p_bill_id, 0, false;
        RETURN;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = v_actor_uuid AND u.is_active = true AND u.role = p_actor_role) THEN
        RETURN QUERY SELECT 'supplier_bill_permission_denied', p_bill_id, 0, false;
        RETURN;
    END IF;

    SELECT count(*)::integer, count(DISTINCT document_id)::integer INTO v_count, v_distinct_count FROM unnest(p_document_ids) AS document_id;
    IF v_count < 1 OR v_count <> v_distinct_count THEN
        RETURN QUERY SELECT 'supplier_bill_document_request_invalid', p_bill_id, v_count, false;
        RETURN;
    END IF;
    v_payload := jsonb_build_object('bill_id', p_bill_id, 'document_ids', (SELECT COALESCE(jsonb_agg(to_jsonb(document_id) ORDER BY document_id), '[]'::jsonb) FROM unnest(p_document_ids) AS document_id));
    PERFORM pg_advisory_xact_lock(hashtextextended('w6a:supplier_bill_documents:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload' INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'supplier_bill'
      AND a.details ->> 'operation' = 'supplier_bill_documents_attach'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC LIMIT 1;
    IF FOUND THEN
        IF v_existing_id IS DISTINCT FROM p_bill_id OR v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'supplier_bill_document_request_conflict', v_existing_id, v_count, false;
        ELSE
            RETURN QUERY SELECT NULL::text, v_existing_id, v_count, true;
        END IF;
        RETURN;
    END IF;

    SELECT b.service_id, b.status INTO v_service_id, v_status FROM public.supplier_bills b WHERE b.id = p_bill_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_bill_not_found', p_bill_id, v_count, false;
        RETURN;
    END IF;
    IF v_status <> 'pending' THEN
        RETURN QUERY SELECT 'supplier_bill_approved_immutable', p_bill_id, v_count, false;
        RETURN;
    END IF;

    SELECT count(DISTINCT d.id)::integer INTO v_valid_count
    FROM public.business_documents d
    JOIN public.business_document_links l ON l.document_id = d.id
      AND l.service_id = v_service_id AND l.link_purpose = 'supplier_bill'
    WHERE d.id = ANY(p_document_ids)
      AND d.bucket_id = 'business-evidence'
      AND d.document_type = 'supplier_invoice';
    IF v_valid_count <> v_count THEN
        RETURN QUERY SELECT 'supplier_bill_invoice_evidence_unavailable', p_bill_id, v_count, false;
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM public.supplier_bill_documents d WHERE d.supplier_bill_id = p_bill_id AND d.document_id = ANY(p_document_ids)) THEN
        RETURN QUERY SELECT 'supplier_bill_document_already_attached', p_bill_id, v_count, false;
        RETURN;
    END IF;

    INSERT INTO public.supplier_bill_documents(supplier_bill_id, document_id, attached_by, attached_at)
    SELECT p_bill_id, document_id, v_actor_uuid, v_now FROM unnest(p_document_ids) AS document_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('supplier_bill_documents_attached', 'supplier_bill', p_bill_id, p_actor_id,
        jsonb_build_object('operation', 'supplier_bill_documents_attach', 'request_id', p_request_id::text, 'actor_role', p_actor_role, 'payload', v_payload), v_now);
    RETURN QUERY SELECT NULL::text, p_bill_id, v_count, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_supplier_bill(
    p_bill_id uuid,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, bill_id uuid, bill_number text, status text, idempotent_replay boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_bill_number text;
    v_status text;
    v_recorded_by uuid;
    v_service_id uuid;
    v_supplier_id uuid;
    v_commitment_id uuid;
    v_receipt_id uuid;
    v_bill_currency text;
    v_total_amount numeric;
    v_commitment_status text;
    v_commitment_currency text;
    v_receipt_status text;
    v_receipt_received_amount numeric;
    v_receipt_reviewed_at timestamptz;
    v_receipt_reviewed_by text;
    v_authorized_amount numeric;
    v_accepted_amount numeric;
    v_approved_receipt_billed_amount numeric;
    v_approved_billed_amount numeric;
    v_has_invoice_evidence boolean;
    v_existing_id uuid;
    v_audit_payload jsonb;
BEGIN
    IF p_bill_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'manager')
    THEN
        RETURN QUERY SELECT 'supplier_bill_approval_request_invalid', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_bill_approval_request_invalid', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = v_actor_uuid AND u.is_active = true AND u.role = p_actor_role) THEN
        RETURN QUERY SELECT 'supplier_bill_approval_permission_denied', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w6a:supplier_bill_approve:' || p_request_id::text, 0));
    SELECT a.entity_id, a.details -> 'payload' INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'supplier_bill'
      AND a.details ->> 'operation' = 'supplier_bill_approve'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC LIMIT 1;
    IF FOUND THEN
        IF v_existing_id IS DISTINCT FROM p_bill_id THEN
            RETURN QUERY SELECT 'supplier_bill_approval_request_conflict', v_existing_id, NULL::text, 'pending'::text, false;
        ELSE
            SELECT b.bill_number, b.status INTO v_bill_number, v_status FROM public.supplier_bills b WHERE b.id = v_existing_id;
            IF NOT FOUND THEN
                RETURN QUERY SELECT 'supplier_bill_unavailable', v_existing_id, NULL::text, 'pending'::text, false;
            ELSE
                RETURN QUERY SELECT NULL::text, v_existing_id, v_bill_number, v_status, true;
            END IF;
        END IF;
        RETURN;
    END IF;

    SELECT b.bill_number, b.status, b.recorded_by, b.service_id, b.supplier_id,
           b.commitment_id, b.service_receipt_id, b.currency, b.total_amount,
           c.status, c.currency, r.acceptance_status, r.received_amount,
           r.reviewed_at, r.reviewed_by
    INTO v_bill_number, v_status, v_recorded_by, v_service_id, v_supplier_id,
         v_commitment_id, v_receipt_id, v_bill_currency, v_total_amount,
         v_commitment_status, v_commitment_currency, v_receipt_status,
         v_receipt_received_amount, v_receipt_reviewed_at, v_receipt_reviewed_by
    FROM public.supplier_bills b
    JOIN public.approved_commitments c ON c.id = b.commitment_id
    JOIN public.service_receipts r ON r.id = b.service_receipt_id
    WHERE b.id = p_bill_id
      AND r.service_id = b.service_id
      AND r.supplier_id = b.supplier_id
      AND r.commitment_id = b.commitment_id
    FOR UPDATE OF b, c, r;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_bill_not_found', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    IF v_status <> 'pending' THEN
        RETURN QUERY SELECT 'supplier_bill_already_approved', p_bill_id, v_bill_number, v_status, false;
        RETURN;
    END IF;
    IF v_recorded_by = v_actor_uuid THEN
        RETURN QUERY SELECT 'supplier_bill_self_approval_forbidden', p_bill_id, v_bill_number, v_status, false;
        RETURN;
    END IF;
    IF v_commitment_status <> 'open' THEN
        RETURN QUERY SELECT 'supplier_bill_commitment_not_eligible', p_bill_id, v_bill_number, v_status, false;
        RETURN;
    END IF;
    IF v_bill_currency IS DISTINCT FROM btrim(v_commitment_currency) THEN
        RETURN QUERY SELECT 'supplier_bill_currency_mismatch', p_bill_id, v_bill_number, v_status, false;
        RETURN;
    END IF;
    IF v_receipt_status NOT IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS')
        OR v_receipt_reviewed_at IS NULL OR NULLIF(btrim(v_receipt_reviewed_by), '') IS NULL
        OR v_receipt_received_amount IS NULL OR v_receipt_received_amount <= 0
    THEN
        RETURN QUERY SELECT 'supplier_bill_receipt_not_accepted', p_bill_id, v_bill_number, v_status, false;
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.supplier_bill_documents sbd
        JOIN public.business_documents d ON d.id = sbd.document_id
        JOIN public.business_document_links l ON l.document_id = d.id
        WHERE sbd.supplier_bill_id = p_bill_id
          AND d.bucket_id = 'business-evidence'
          AND d.document_type = 'supplier_invoice'
          AND l.service_id = v_service_id
          AND l.link_purpose = 'supplier_bill'
    ) INTO v_has_invoice_evidence;
    IF NOT v_has_invoice_evidence THEN
        RETURN QUERY SELECT 'supplier_bill_invoice_evidence_required', p_bill_id, v_bill_number, v_status, false;
        RETURN;
    END IF;

    SELECT b.authorized_amount, b.accepted_amount
    INTO v_authorized_amount, v_accepted_amount
    FROM public.approved_commitment_balances b
    WHERE b.id = v_commitment_id;
    IF NOT FOUND OR v_authorized_amount IS NULL THEN
        RETURN QUERY SELECT 'supplier_bill_commitment_not_eligible', p_bill_id, v_bill_number, v_status, false;
        RETURN;
    END IF;

    SELECT COALESCE(SUM(b.total_amount), 0)
    INTO v_approved_receipt_billed_amount
    FROM public.supplier_bills b
    WHERE b.service_receipt_id = v_receipt_id AND b.status = 'approved';
    IF v_approved_receipt_billed_amount + v_total_amount > v_receipt_received_amount THEN
        RETURN QUERY SELECT 'supplier_bill_received_value_ceiling_exceeded', p_bill_id, v_bill_number, v_status, false;
        RETURN;
    END IF;

    SELECT COALESCE(SUM(b.total_amount), 0)
    INTO v_approved_billed_amount
    FROM public.supplier_bills b
    WHERE b.commitment_id = v_commitment_id AND b.status = 'approved';
    IF v_approved_billed_amount + v_total_amount > v_authorized_amount THEN
        RETURN QUERY SELECT 'supplier_bill_commitment_ceiling_exceeded', p_bill_id, v_bill_number, v_status, false;
        RETURN;
    END IF;
    IF v_approved_billed_amount + v_total_amount > v_accepted_amount THEN
        RETURN QUERY SELECT 'supplier_bill_received_value_ceiling_exceeded', p_bill_id, v_bill_number, v_status, false;
        RETURN;
    END IF;

    UPDATE public.supplier_bills b
    SET status = 'approved', approved_by = v_actor_uuid, approved_at = v_now, updated_by = v_actor_uuid, updated_at = v_now
    WHERE b.id = p_bill_id;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('supplier_bill_approved', 'supplier_bill', p_bill_id, p_actor_id,
        jsonb_build_object(
            'operation', 'supplier_bill_approve', 'request_id', p_request_id::text,
            'actor_role', p_actor_role, 'commitment_id', v_commitment_id,
            'service_receipt_id', v_receipt_id, 'total_amount', v_total_amount,
            'authorized_amount', v_authorized_amount, 'accepted_amount', v_accepted_amount
        ), v_now);
    RETURN QUERY SELECT NULL::text, p_bill_id, v_bill_number, 'approved'::text, false;
END;
$$;

REVOKE ALL ON FUNCTION public.create_supplier_bill(uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_supplier_bill(uuid,uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_supplier_bill_documents(uuid,uuid[],uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_supplier_bill(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier_bill(uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_supplier_bill(uuid,uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_supplier_bill_documents(uuid,uuid[],uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_supplier_bill(uuid,uuid,text,text) TO service_role;

COMMENT ON TABLE public.supplier_bills IS
    'Event/Service supplier obligations recorded against an approved commitment and explicit service receipt; not a supplier payment or VAT ledger.';
COMMENT ON TABLE public.supplier_bill_documents IS
    'Private supplier invoice evidence relations. Bytes remain in the business-evidence Storage pipeline.';
COMMENT ON COLUMN public.supplier_bills.supplier_legal_name_snapshot IS
    'Supplier commercial identity captured at recording time for operational traceability.';
COMMENT ON COLUMN public.supplier_bills.supplier_vat_number_snapshot IS
    'Supplier tax identity captured at recording time; this slice does not implement VAT filing or accounting.';

COMMIT;
