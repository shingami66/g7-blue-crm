-- W6B: Supplier Payments foundation.
--
-- Supplier Payments are outbound payments against approved Event/Service
-- Supplier Bills. They are deliberately separate from customer payments.
-- This migration is authored for the approved workflow and must be applied
-- only through the separately authorized Supabase migration procedure.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.app_users') IS NULL
        OR to_regclass('public.suppliers') IS NULL
        OR to_regclass('public.services') IS NULL
        OR to_regclass('public.supplier_bills') IS NULL
        OR to_regclass('public.business_documents') IS NULL
        OR to_regclass('public.business_document_links') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regclass('public.number_sequences') IS NULL
    THEN
        RAISE EXCEPTION 'W6B preflight failed: W6A and shared document foundations are missing';
    END IF;

    IF to_regclass('public.supplier_payments') IS NOT NULL
        OR to_regclass('public.supplier_payment_documents') IS NOT NULL
        OR to_regclass('public.supplier_payment_reversals') IS NOT NULL
        OR to_regclass('public.supplier_bill_payment_balances') IS NOT NULL
        OR to_regprocedure('public.record_supplier_payment(uuid,date,numeric,text,text,text,uuid,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.reverse_supplier_payment(uuid,text,uuid,text,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'W6B preflight failed: Supplier Payments objects already exist';
    END IF;
END;
$$;

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
                'supplier_bill_approved'::text,
                'supplier_payment_recorded'::text,
                'supplier_payment_reversed'::text
            ]
        )
    );

ALTER TABLE public.number_sequences
    DROP CONSTRAINT IF EXISTS number_sequences_type_check;

ALTER TABLE public.number_sequences
    ADD CONSTRAINT number_sequences_type_check
    CHECK (
        type IN (
            'quotation', 'invoice', 'payment', 'project', 'service', 'customer',
            'supplier_booking', 'expense', 'cash_advance', 'supplier_bill',
            'supplier_payment'
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
        'supplier_booking', 'expense', 'cash_advance', 'supplier_bill',
        'supplier_payment'
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
            WHEN doc_type = 'supplier_payment' THEN 'SPAY'
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
            WHEN doc_type = 'supplier_payment' THEN 'SPAY-YYYY-0001'
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

CREATE TABLE public.supplier_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number text NOT NULL UNIQUE,
    supplier_bill_id uuid NOT NULL REFERENCES public.supplier_bills(id) ON DELETE RESTRICT,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    payment_date date NOT NULL,
    amount numeric(14,2) NOT NULL,
    method text NOT NULL,
    reference text,
    bank_name_snapshot text,
    bank_account_name_snapshot text,
    iban_snapshot text,
    notes text,
    recorded_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    record_request_id uuid NOT NULL UNIQUE,
    CONSTRAINT supplier_payments_number_format_check CHECK (payment_number ~ '^SPAY-[0-9]{4}-[0-9]{4}$'),
    CONSTRAINT supplier_payments_amount_check CHECK (amount > 0 AND amount <= 999999999999.99 AND amount = round(amount, 2)),
    CONSTRAINT supplier_payments_method_check CHECK (method IN ('bank_transfer', 'cash', 'cheque')),
    CONSTRAINT supplier_payments_reference_check CHECK (
        (method = 'cash')
        OR (reference IS NOT NULL AND char_length(btrim(reference)) BETWEEN 1 AND 200)
    ),
    CONSTRAINT supplier_payments_bank_snapshot_check CHECK (
        (method = 'bank_transfer'
            AND char_length(btrim(COALESCE(iban_snapshot, ''))) BETWEEN 1 AND 200
            AND char_length(btrim(COALESCE(bank_name_snapshot, ''))) BETWEEN 1 AND 255
            AND char_length(btrim(COALESCE(bank_account_name_snapshot, ''))) BETWEEN 1 AND 255)
        OR (method <> 'bank_transfer'
            AND bank_name_snapshot IS NULL
            AND bank_account_name_snapshot IS NULL
            AND iban_snapshot IS NULL)
    ),
    CONSTRAINT supplier_payments_notes_check CHECK (notes IS NULL OR char_length(notes) <= 2000)
);

CREATE TABLE public.supplier_payment_documents (
    supplier_payment_id uuid NOT NULL REFERENCES public.supplier_payments(id) ON DELETE RESTRICT,
    document_id uuid NOT NULL REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    attached_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    attached_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    PRIMARY KEY (supplier_payment_id, document_id)
);

CREATE TABLE public.supplier_payment_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_payment_id uuid NOT NULL UNIQUE REFERENCES public.supplier_payments(id) ON DELETE RESTRICT,
    reason text NOT NULL,
    reversed_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    reversed_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    reversal_request_id uuid NOT NULL UNIQUE,
    CONSTRAINT supplier_payment_reversal_reason_check CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000)
);

CREATE INDEX supplier_payments_bill_date_idx
    ON public.supplier_payments (supplier_bill_id, payment_date DESC, payment_number DESC);
CREATE INDEX supplier_payments_supplier_date_idx
    ON public.supplier_payments (supplier_id, payment_date DESC, payment_number DESC);
CREATE INDEX supplier_payment_documents_payment_idx
    ON public.supplier_payment_documents (supplier_payment_id, attached_at DESC, document_id DESC);
CREATE INDEX supplier_payment_reversals_payment_idx
    ON public.supplier_payment_reversals (supplier_payment_id, reversed_at DESC, id DESC);

CREATE OR REPLACE VIEW public.supplier_bill_payment_balances
WITH (security_invoker = true)
AS
SELECT
    b.id AS supplier_bill_id,
    b.bill_number,
    b.supplier_id,
    b.service_id,
    b.currency,
    b.total_amount AS payable_amount,
    COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL), 0)::numeric(14,2) AS paid_amount,
    (b.total_amount - COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL), 0))::numeric(14,2) AS outstanding_amount,
    CASE
        WHEN COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL), 0) = 0 THEN 'unpaid'
        WHEN COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL), 0) < b.total_amount THEN 'partially_paid'
        ELSE 'paid'
    END AS payment_status
FROM public.supplier_bills b
LEFT JOIN public.supplier_payments p ON p.supplier_bill_id = b.id
LEFT JOIN public.supplier_payment_reversals r ON r.supplier_payment_id = p.id
WHERE b.status = 'approved'
GROUP BY b.id, b.bill_number, b.supplier_id, b.service_id, b.currency, b.total_amount;

CREATE OR REPLACE FUNCTION public.prevent_supplier_payment_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RAISE EXCEPTION 'supplier_payment_immutable';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_supplier_payment_reversal_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RAISE EXCEPTION 'supplier_payment_reversal_immutable';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_supplier_payment_document_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    RAISE EXCEPTION 'supplier_payment_document_immutable';
END;
$$;

CREATE TRIGGER supplier_payments_immutable
    BEFORE UPDATE OR DELETE ON public.supplier_payments
    FOR EACH ROW EXECUTE FUNCTION public.prevent_supplier_payment_mutation();

CREATE TRIGGER supplier_payment_reversals_immutable
    BEFORE UPDATE OR DELETE ON public.supplier_payment_reversals
    FOR EACH ROW EXECUTE FUNCTION public.prevent_supplier_payment_reversal_mutation();

CREATE TRIGGER supplier_payment_documents_immutable
    BEFORE UPDATE OR DELETE ON public.supplier_payment_documents
    FOR EACH ROW EXECUTE FUNCTION public.prevent_supplier_payment_document_mutation();

ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payment_reversals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.supplier_payments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.supplier_payment_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.supplier_payment_reversals FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.supplier_payments TO service_role;
GRANT ALL ON TABLE public.supplier_payment_documents TO service_role;
GRANT ALL ON TABLE public.supplier_payment_reversals TO service_role;
GRANT SELECT ON public.supplier_bill_payment_balances TO service_role;
REVOKE ALL ON FUNCTION public.prevent_supplier_payment_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_supplier_payment_reversal_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_supplier_payment_document_mutation() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_supplier_payment(
    p_supplier_bill_id uuid,
    p_payment_date date,
    p_amount numeric,
    p_method text,
    p_reference text,
    p_notes text,
    p_document_id uuid,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    payment_id uuid,
    payment_number text,
    supplier_bill_id uuid,
    paid_amount numeric,
    outstanding_amount numeric,
    payment_status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_method text := lower(NULLIF(btrim(p_method), ''));
    v_reference text := NULLIF(btrim(p_reference), '');
    v_notes text := NULLIF(btrim(p_notes), '');
    v_bill_number text;
    v_bill_status text;
    v_bill_total numeric;
    v_bill_currency text;
    v_service_id uuid;
    v_supplier_id uuid;
    v_iban text;
    v_bank_name text;
    v_bank_account_name text;
    v_existing record;
    v_payment_number text;
    v_payment_id uuid;
    v_paid numeric;
    v_outstanding numeric;
    v_status text;
    v_is_reversed boolean;
BEGIN
    IF p_supplier_bill_id IS NULL OR p_payment_date IS NULL OR p_request_id IS NULL
        OR p_document_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'accountant')
        OR p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR v_method NOT IN ('bank_transfer', 'cash', 'cheque')
        OR (v_method IN ('bank_transfer', 'cheque') AND v_reference IS NULL)
        OR (v_notes IS NOT NULL AND char_length(v_notes) > 2000)
    THEN
        RETURN QUERY SELECT 'supplier_payment_request_invalid', NULL::uuid, NULL::text, p_supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_payment_request_invalid', NULL::uuid, NULL::text, p_supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM public.app_users u
        WHERE u.id = v_actor_uuid AND u.is_active = true AND u.role = p_actor_role
    ) THEN
        RETURN QUERY SELECT 'supplier_payment_permission_denied', NULL::uuid, NULL::text, p_supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w6b:supplier_payment_record:' || p_request_id::text, 0));

    SELECT p.* INTO v_existing
    FROM public.supplier_payments p
    WHERE p.record_request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.supplier_bill_id IS DISTINCT FROM p_supplier_bill_id
            OR v_existing.payment_date IS DISTINCT FROM p_payment_date
            OR v_existing.amount IS DISTINCT FROM p_amount
            OR v_existing.method IS DISTINCT FROM v_method
            OR v_existing.reference IS DISTINCT FROM v_reference
            OR v_existing.notes IS DISTINCT FROM v_notes
            OR NOT EXISTS (
                SELECT 1
                FROM public.supplier_payment_documents d
                WHERE d.supplier_payment_id = v_existing.id
                  AND d.document_id = p_document_id
            )
        THEN
            RETURN QUERY SELECT 'supplier_payment_request_conflict', v_existing.id, v_existing.payment_number, v_existing.supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
            RETURN;
        END IF;

        SELECT b.total_amount, COALESCE(SUM(p2.amount) FILTER (WHERE r2.id IS NULL), 0)
        INTO v_bill_total, v_paid
        FROM public.supplier_bills b
        LEFT JOIN public.supplier_payments p2 ON p2.supplier_bill_id = b.id
        LEFT JOIN public.supplier_payment_reversals r2 ON r2.supplier_payment_id = p2.id
        WHERE b.id = v_existing.supplier_bill_id
        GROUP BY b.total_amount;
        v_outstanding := v_bill_total - v_paid;
        SELECT EXISTS (SELECT 1 FROM public.supplier_payment_reversals r WHERE r.supplier_payment_id = v_existing.id) INTO v_is_reversed;
        v_status := CASE WHEN v_is_reversed THEN 'reversed' ELSE 'recorded' END;
        RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.payment_number, v_existing.supplier_bill_id, v_paid, v_outstanding,
            CASE WHEN v_paid = 0 THEN 'unpaid' WHEN v_outstanding = 0 THEN 'paid' ELSE 'partially_paid' END, true;
        RETURN;
    END IF;

    SELECT b.bill_number, b.status, b.total_amount, b.currency, b.service_id, b.supplier_id
    INTO v_bill_number, v_bill_status, v_bill_total, v_bill_currency, v_service_id, v_supplier_id
    FROM public.supplier_bills b
    WHERE b.id = p_supplier_bill_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_payment_bill_not_found', NULL::uuid, NULL::text, p_supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;
    IF v_bill_status <> 'approved' THEN
        RETURN QUERY SELECT 'supplier_payment_bill_not_approved', NULL::uuid, v_bill_number, p_supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.business_documents d
        JOIN public.business_document_links l ON l.document_id = d.id
            AND l.service_id = v_service_id AND l.link_purpose = 'supplier_payment'
        WHERE d.id = p_document_id
            AND d.bucket_id = 'business-evidence'
            AND d.document_type = 'supplier_payment_evidence'
    ) THEN
        RETURN QUERY SELECT 'supplier_payment_evidence_required', NULL::uuid, v_bill_number, p_supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    SELECT s.iban, s.bank_name, s.bank_account_name
    INTO v_iban, v_bank_name, v_bank_account_name
    FROM public.suppliers s
    WHERE s.id = v_supplier_id AND s.is_deleted = false AND s.deleted_at IS NULL
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_payment_supplier_not_found', NULL::uuid, v_bill_number, p_supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;
    IF v_method = 'bank_transfer' AND (
        NULLIF(btrim(v_iban), '') IS NULL
        OR NULLIF(btrim(v_bank_name), '') IS NULL
        OR NULLIF(btrim(v_bank_account_name), '') IS NULL
    ) THEN
        RETURN QUERY SELECT 'supplier_payment_bank_details_required', NULL::uuid, v_bill_number, p_supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    SELECT COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL), 0)
    INTO v_paid
    FROM public.supplier_payments p
    LEFT JOIN public.supplier_payment_reversals r ON r.supplier_payment_id = p.id
    WHERE p.supplier_bill_id = p_supplier_bill_id;
    v_outstanding := v_bill_total - v_paid;
    IF p_amount > v_outstanding THEN
        RETURN QUERY SELECT 'supplier_payment_exceeds_outstanding', NULL::uuid, v_bill_number, p_supplier_bill_id, v_paid, v_outstanding,
            CASE WHEN v_paid = 0 THEN 'unpaid' WHEN v_outstanding = 0 THEN 'paid' ELSE 'partially_paid' END, false;
        RETURN;
    END IF;

    v_payment_number := public.generate_document_number('supplier_payment');
    INSERT INTO public.supplier_payments(
        payment_number, supplier_bill_id, supplier_id, service_id, payment_date, amount,
        method, reference, bank_name_snapshot, bank_account_name_snapshot, iban_snapshot,
        notes, recorded_by, recorded_at, record_request_id
    ) VALUES (
        v_payment_number, p_supplier_bill_id, v_supplier_id, v_service_id, p_payment_date, p_amount,
        v_method, v_reference,
        CASE WHEN v_method = 'bank_transfer' THEN v_bank_name ELSE NULL END,
        CASE WHEN v_method = 'bank_transfer' THEN v_bank_account_name ELSE NULL END,
        CASE WHEN v_method = 'bank_transfer' THEN v_iban ELSE NULL END,
        v_notes, v_actor_uuid, v_now, p_request_id
    ) RETURNING id INTO v_payment_id;

    INSERT INTO public.supplier_payment_documents(supplier_payment_id, document_id, attached_by, attached_at)
    VALUES (v_payment_id, p_document_id, v_actor_uuid, v_now);

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'supplier_payment_recorded', 'supplier_payment', v_payment_id, p_actor_id,
        jsonb_build_object(
            'operation', 'supplier_payment_record', 'request_id', p_request_id::text,
            'actor_role', p_actor_role, 'payload', jsonb_build_object(
                'supplier_bill_id', p_supplier_bill_id, 'payment_date', p_payment_date,
                'amount', p_amount, 'method', v_method, 'reference', v_reference,
                'notes', v_notes, 'document_id', p_document_id
            )
        ), v_now
    );

    v_paid := v_paid + p_amount;
    v_outstanding := v_bill_total - v_paid;
    RETURN QUERY SELECT NULL::text, v_payment_id, v_payment_number, p_supplier_bill_id, v_paid, v_outstanding,
        CASE WHEN v_paid = 0 THEN 'unpaid' WHEN v_outstanding = 0 THEN 'paid' ELSE 'partially_paid' END, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_supplier_payment(
    p_payment_id uuid,
    p_reason text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    payment_id uuid,
    supplier_bill_id uuid,
    paid_amount numeric,
    outstanding_amount numeric,
    payment_status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_reason text := NULLIF(btrim(p_reason), '');
    v_existing record;
    v_payment record;
    v_bill_total numeric;
    v_paid numeric;
    v_outstanding numeric;
BEGIN
    IF p_payment_id IS NULL OR p_request_id IS NULL OR v_reason IS NULL
        OR char_length(v_reason) < 5 OR char_length(v_reason) > 2000
        OR NULLIF(btrim(p_actor_id), '') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin', 'accountant')
    THEN
        RETURN QUERY SELECT 'supplier_payment_reversal_request_invalid', p_payment_id, NULL::uuid, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;
    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_payment_reversal_request_invalid', p_payment_id, NULL::uuid, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END;
    IF NOT EXISTS (
        SELECT 1 FROM public.app_users u
        WHERE u.id = v_actor_uuid AND u.is_active = true AND u.role = p_actor_role
    ) THEN
        RETURN QUERY SELECT 'supplier_payment_permission_denied', p_payment_id, NULL::uuid, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w6b:supplier_payment_reverse:' || p_request_id::text, 0));

    SELECT r.*, p.supplier_bill_id INTO v_existing
    FROM public.supplier_payment_reversals r
    JOIN public.supplier_payments p ON p.id = r.supplier_payment_id
    WHERE r.reversal_request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.supplier_payment_id IS DISTINCT FROM p_payment_id OR v_existing.reason IS DISTINCT FROM v_reason THEN
            RETURN QUERY SELECT 'supplier_payment_request_conflict', p_payment_id, v_existing.supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
            RETURN;
        END IF;
        SELECT b.total_amount, COALESCE(SUM(p2.amount) FILTER (WHERE r2.id IS NULL), 0)
        INTO v_bill_total, v_paid
        FROM public.supplier_bills b
        LEFT JOIN public.supplier_payments p2 ON p2.supplier_bill_id = b.id
        LEFT JOIN public.supplier_payment_reversals r2 ON r2.supplier_payment_id = p2.id
        WHERE b.id = v_existing.supplier_bill_id
        GROUP BY b.total_amount;
        v_outstanding := v_bill_total - v_paid;
        RETURN QUERY SELECT NULL::text, p_payment_id, v_existing.supplier_bill_id, v_paid, v_outstanding,
            CASE WHEN v_paid = 0 THEN 'unpaid' WHEN v_outstanding = 0 THEN 'paid' ELSE 'partially_paid' END, true;
        RETURN;
    END IF;

    SELECT p.*, b.total_amount, b.status AS bill_status
    INTO v_payment
    FROM public.supplier_payments p
    JOIN public.supplier_bills b ON b.id = p.supplier_bill_id
    WHERE p.id = p_payment_id
    FOR UPDATE OF b, p;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'supplier_payment_not_found', p_payment_id, NULL::uuid, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;
    IF v_payment.bill_status <> 'approved' THEN
        RETURN QUERY SELECT 'supplier_payment_bill_not_approved', p_payment_id, v_payment.supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;
    IF EXISTS (SELECT 1 FROM public.supplier_payment_reversals r WHERE r.supplier_payment_id = p_payment_id) THEN
        RETURN QUERY SELECT 'supplier_payment_already_reversed', p_payment_id, v_payment.supplier_bill_id, 0::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    INSERT INTO public.supplier_payment_reversals(
        supplier_payment_id, reason, reversed_by, reversed_at, reversal_request_id
    ) VALUES (p_payment_id, v_reason, v_actor_uuid, v_now, p_request_id);

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'supplier_payment_reversed', 'supplier_payment', p_payment_id, p_actor_id,
        jsonb_build_object(
            'operation', 'supplier_payment_reverse', 'request_id', p_request_id::text,
            'actor_role', p_actor_role, 'reason', v_reason,
            'supplier_bill_id', v_payment.supplier_bill_id
        ), v_now
    );

    SELECT COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL), 0)
    INTO v_paid
    FROM public.supplier_payments p
    LEFT JOIN public.supplier_payment_reversals r ON r.supplier_payment_id = p.id
    WHERE p.supplier_bill_id = v_payment.supplier_bill_id;
    v_outstanding := v_payment.total_amount - v_paid;
    RETURN QUERY SELECT NULL::text, p_payment_id, v_payment.supplier_bill_id, v_paid, v_outstanding,
        CASE WHEN v_paid = 0 THEN 'unpaid' WHEN v_outstanding = 0 THEN 'paid' ELSE 'partially_paid' END, false;
END;
$$;

REVOKE ALL ON FUNCTION public.record_supplier_payment(uuid,date,numeric,text,text,text,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_supplier_payment(uuid,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_supplier_payment(uuid,date,numeric,text,text,text,uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_supplier_payment(uuid,text,uuid,text,text) TO service_role;

COMMENT ON TABLE public.supplier_payments IS
    'Immutable outbound payments against approved Event/Service Supplier Bills; separate from customer payments.';
COMMENT ON TABLE public.supplier_payment_documents IS
    'Private payment evidence relations; object bytes remain in the business-evidence Storage pipeline.';
COMMENT ON TABLE public.supplier_payment_reversals IS
    'Immutable correction history for Supplier Payments; active payable balance excludes reversed payments.';
COMMENT ON VIEW public.supplier_bill_payment_balances IS
    'Authoritative payable, paid, outstanding, and lifecycle summary derived from approved Supplier Bills and non-reversed payments.';

COMMIT;
