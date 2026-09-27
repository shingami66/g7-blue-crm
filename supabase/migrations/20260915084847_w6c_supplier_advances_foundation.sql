-- W6C: Supplier Advances / Deposits.
-- Immutable authorization, payment, refund, allocation and correction events.
-- Authoring only: this migration must not be applied to DEV or PROD without
-- separate explicit Owner authorization.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.approved_commitments') IS NULL
        OR to_regclass('public.approved_commitment_balances') IS NULL
        OR to_regclass('public.service_receipts') IS NULL
        OR to_regclass('public.supplier_bills') IS NULL
        OR to_regclass('public.supplier_payments') IS NULL
        OR to_regclass('public.supplier_bill_payment_balances') IS NULL
        OR to_regclass('public.suppliers') IS NULL
        OR to_regclass('public.services') IS NULL
        OR to_regclass('public.business_documents') IS NULL
        OR to_regclass('public.business_document_links') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regclass('public.number_sequences') IS NULL
    THEN
        RAISE EXCEPTION 'W6C preflight failed: W4, W6A, W6B or shared evidence foundation is missing';
    END IF;

    IF to_regclass('public.supplier_advances') IS NOT NULL
        OR to_regclass('public.supplier_advance_payments') IS NOT NULL
        OR to_regclass('public.supplier_advance_refunds') IS NOT NULL
        OR to_regclass('public.supplier_advance_allocations') IS NOT NULL
        OR to_regprocedure('public.authorize_supplier_advance(uuid,numeric,text,uuid,text,uuid,text,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'W6C preflight failed: Supplier Advance objects already exist';
    END IF;
END;
$$;

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
    action = ANY (ARRAY[
        'create'::text, 'update'::text, 'delete'::text, 'restore'::text,
        'status_change'::text, 'payment_recorded'::text, 'correction'::text,
        'procurement_package_created'::text, 'procurement_package_updated'::text,
        'procurement_package_requirements_set'::text, 'procurement_package_supplier_selected'::text,
        'procurement_package_supplier_cleared'::text, 'expense_submitted'::text,
        'expense_approved'::text, 'expense_rejected'::text, 'expense_cancelled'::text,
        'expense_evidence_exception_recorded'::text, 'expense_evidence_exception_disposed'::text,
        'expense_document_attached'::text, 'expense_reimbursement_settled'::text,
        'cash_advance_requested'::text, 'cash_advance_approved'::text,
        'cash_advance_rejected'::text, 'cash_advance_cancelled'::text,
        'cash_advance_issued'::text, 'cash_advance_expense_settled'::text,
        'cash_advance_returned'::text, 'petty_cash_transaction_recorded'::text,
        'expense_finance_reviewed'::text, 'supplier_bill_recorded'::text,
        'supplier_bill_updated'::text, 'supplier_bill_documents_attached'::text,
        'supplier_bill_approved'::text, 'supplier_payment_recorded'::text,
        'supplier_payment_reversed'::text, 'supplier_advance_authorized'::text,
        'supplier_advance_payment_recorded'::text, 'supplier_advance_payment_reversed'::text,
        'supplier_advance_allocated'::text, 'supplier_advance_allocation_corrected'::text,
        'supplier_advance_refund_recorded'::text
    ])
);

ALTER TABLE public.number_sequences DROP CONSTRAINT IF EXISTS number_sequences_type_check;
ALTER TABLE public.number_sequences ADD CONSTRAINT number_sequences_type_check CHECK (
    type IN (
        'quotation', 'invoice', 'payment', 'project', 'service', 'customer',
        'supplier_booking', 'expense', 'cash_advance', 'supplier_bill',
        'supplier_payment', 'supplier_advance', 'supplier_advance_payment',
        'supplier_advance_refund', 'supplier_advance_allocation'
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
        'supplier_payment', 'supplier_advance', 'supplier_advance_payment',
        'supplier_advance_refund', 'supplier_advance_allocation'
    ) THEN
        RAISE EXCEPTION 'Invalid doc_type: %', doc_type;
    END IF;

    current_year := extract(year FROM current_date)::integer;
    INSERT INTO public.number_sequences (type, year, sequence, prefix, example_format)
    VALUES (
        doc_type, current_year, 1,
        CASE doc_type
            WHEN 'quotation' THEN 'QT' WHEN 'invoice' THEN 'INV' WHEN 'payment' THEN 'PAY'
            WHEN 'project' THEN 'PRJ' WHEN 'service' THEN 'SVC' WHEN 'customer' THEN 'CUST'
            WHEN 'supplier_booking' THEN 'SBK' WHEN 'expense' THEN 'EXP'
            WHEN 'cash_advance' THEN 'ADV' WHEN 'supplier_bill' THEN 'BILL'
            WHEN 'supplier_payment' THEN 'SPAY' WHEN 'supplier_advance' THEN 'SADV'
            WHEN 'supplier_advance_payment' THEN 'SAPAY' WHEN 'supplier_advance_refund' THEN 'SAREF'
            WHEN 'supplier_advance_allocation' THEN 'SAALLOC'
        END,
        CASE doc_type
            WHEN 'quotation' THEN 'QT-YYYY-0001' WHEN 'invoice' THEN 'INV-YYYY-0001'
            WHEN 'payment' THEN 'PAY-YYYY-0001' WHEN 'project' THEN 'PRJ-YYYY-0001'
            WHEN 'service' THEN 'SVC-YYYY-0001' WHEN 'customer' THEN 'CUST-YYYY-0001'
            WHEN 'supplier_booking' THEN 'SBK-YYYY-0001' WHEN 'expense' THEN 'EXP-YYYY-0001'
            WHEN 'cash_advance' THEN 'ADV-YYYY-0001' WHEN 'supplier_bill' THEN 'BILL-YYYY-0001'
            WHEN 'supplier_payment' THEN 'SPAY-YYYY-0001' WHEN 'supplier_advance' THEN 'SADV-YYYY-0001'
            WHEN 'supplier_advance_payment' THEN 'SAPAY-YYYY-0001'
            WHEN 'supplier_advance_refund' THEN 'SAREF-YYYY-0001'
            WHEN 'supplier_advance_allocation' THEN 'SAALLOC-YYYY-0001'
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

CREATE TABLE public.supplier_advances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_number text NOT NULL UNIQUE,
    commitment_id uuid NOT NULL REFERENCES public.approved_commitments(id) ON DELETE RESTRICT,
    service_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    currency char(3) NOT NULL,
    authorized_amount numeric(14,2) NOT NULL CHECK (authorized_amount > 0),
    reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
    authorized_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    authorized_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    authorization_request_id uuid NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT supplier_advances_commitment_lineage_fkey
        FOREIGN KEY (commitment_id, service_id, supplier_id)
        REFERENCES public.approved_commitments(id, service_id, supplier_id) ON DELETE RESTRICT
);

CREATE TABLE public.supplier_advance_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number text NOT NULL UNIQUE,
    supplier_advance_id uuid NOT NULL REFERENCES public.supplier_advances(id) ON DELETE RESTRICT,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    payment_date date NOT NULL,
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    method text NOT NULL CHECK (method IN ('bank_transfer', 'cash', 'cheque')),
    reference text,
    bank_name_snapshot text,
    bank_account_name_snapshot text,
    iban_snapshot text,
    notes text CHECK (notes IS NULL OR char_length(notes) <= 2000),
    recorded_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    record_request_id uuid NOT NULL UNIQUE,
    CONSTRAINT supplier_advance_payment_reference_check CHECK (
        (method = 'cash' AND (reference IS NULL OR char_length(btrim(reference)) BETWEEN 1 AND 200))
        OR (method IN ('bank_transfer', 'cheque') AND NULLIF(btrim(reference), '') IS NOT NULL AND char_length(reference) <= 200)
    ),
    CONSTRAINT supplier_advance_payment_bank_snapshot_check CHECK (
        (method = 'bank_transfer' AND NULLIF(btrim(bank_name_snapshot), '') IS NOT NULL
            AND NULLIF(btrim(bank_account_name_snapshot), '') IS NOT NULL AND NULLIF(btrim(iban_snapshot), '') IS NOT NULL)
        OR (method <> 'bank_transfer' AND bank_name_snapshot IS NULL AND bank_account_name_snapshot IS NULL AND iban_snapshot IS NULL)
    )
);

CREATE TABLE public.supplier_advance_payment_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_advance_payment_id uuid NOT NULL UNIQUE REFERENCES public.supplier_advance_payments(id) ON DELETE RESTRICT,
    reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    reversed_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    reversed_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    reversal_request_id uuid NOT NULL UNIQUE
);

CREATE TABLE public.supplier_advance_refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_number text NOT NULL UNIQUE,
    supplier_advance_id uuid NOT NULL REFERENCES public.supplier_advances(id) ON DELETE RESTRICT,
    business_date date NOT NULL,
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    reference text CHECK (reference IS NULL OR char_length(reference) <= 200),
    evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
    recorded_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    record_request_id uuid NOT NULL UNIQUE
);

CREATE TABLE public.supplier_advance_allocations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_number text NOT NULL UNIQUE,
    supplier_advance_id uuid NOT NULL REFERENCES public.supplier_advances(id) ON DELETE RESTRICT,
    supplier_bill_id uuid NOT NULL REFERENCES public.supplier_bills(id) ON DELETE RESTRICT,
    amount numeric(14,2) NOT NULL CHECK (amount > 0),
    allocated_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    allocated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    allocation_request_id uuid NOT NULL UNIQUE
);

CREATE TABLE public.supplier_advance_allocation_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_advance_allocation_id uuid NOT NULL UNIQUE REFERENCES public.supplier_advance_allocations(id) ON DELETE RESTRICT,
    reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 5 AND 2000),
    corrected_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    corrected_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    correction_request_id uuid NOT NULL UNIQUE
);

CREATE TABLE public.supplier_advance_authorization_documents (
    supplier_advance_id uuid NOT NULL REFERENCES public.supplier_advances(id) ON DELETE RESTRICT,
    document_id uuid NOT NULL UNIQUE REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
    attached_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    attached_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    PRIMARY KEY (supplier_advance_id, document_id)
);

CREATE TABLE public.supplier_advance_payment_documents (
    supplier_advance_payment_id uuid NOT NULL REFERENCES public.supplier_advance_payments(id) ON DELETE RESTRICT,
    document_id uuid NOT NULL UNIQUE REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
    attached_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    attached_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    PRIMARY KEY (supplier_advance_payment_id, document_id)
);

CREATE TABLE public.supplier_advance_refund_documents (
    supplier_advance_refund_id uuid NOT NULL REFERENCES public.supplier_advance_refunds(id) ON DELETE RESTRICT,
    document_id uuid NOT NULL UNIQUE REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
    attached_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    attached_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    PRIMARY KEY (supplier_advance_refund_id, document_id)
);

CREATE INDEX supplier_advances_commitment_idx ON public.supplier_advances(commitment_id, authorized_at DESC, advance_number);
CREATE INDEX supplier_advance_payments_advance_idx ON public.supplier_advance_payments(supplier_advance_id, payment_date DESC, payment_number);
CREATE INDEX supplier_advance_refunds_advance_idx ON public.supplier_advance_refunds(supplier_advance_id, business_date DESC, refund_number);
CREATE INDEX supplier_advance_allocations_advance_idx ON public.supplier_advance_allocations(supplier_advance_id, allocated_at DESC, allocation_number);
CREATE INDEX supplier_advance_allocations_bill_idx ON public.supplier_advance_allocations(supplier_bill_id, allocated_at DESC);

CREATE VIEW public.supplier_advance_balances WITH (security_invoker = true) AS
WITH payment_totals AS (
    SELECT p.supplier_advance_id,
        COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL), 0)::numeric(14,2) AS paid_amount,
        COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NOT NULL), 0)::numeric(14,2) AS reversed_amount
    FROM public.supplier_advance_payments p
    LEFT JOIN public.supplier_advance_payment_reversals r ON r.supplier_advance_payment_id = p.id
    GROUP BY p.supplier_advance_id
), allocation_totals AS (
    SELECT a.supplier_advance_id,
        COALESCE(SUM(a.amount) FILTER (WHERE r.id IS NULL), 0)::numeric(14,2) AS allocated_amount
    FROM public.supplier_advance_allocations a
    LEFT JOIN public.supplier_advance_allocation_reversals r ON r.supplier_advance_allocation_id = a.id
    GROUP BY a.supplier_advance_id
), refund_totals AS (
    SELECT supplier_advance_id, COALESCE(SUM(amount), 0)::numeric(14,2) AS refunded_amount
    FROM public.supplier_advance_refunds GROUP BY supplier_advance_id
)
SELECT a.id AS supplier_advance_id, a.advance_number, a.commitment_id, a.supplier_id, a.service_id,
    a.currency, a.authorized_amount, a.authorized_at, a.authorized_by,
    COALESCE(p.paid_amount, 0)::numeric(14,2) AS paid_amount,
    COALESCE(x.allocated_amount, 0)::numeric(14,2) AS allocated_amount,
    COALESCE(f.refunded_amount, 0)::numeric(14,2) AS refunded_amount,
    COALESCE(p.reversed_amount, 0)::numeric(14,2) AS reversed_amount,
    greatest(COALESCE(p.paid_amount, 0) - COALESCE(x.allocated_amount, 0) - COALESCE(f.refunded_amount, 0), 0)::numeric(14,2) AS remaining_unallocated_amount,
    CASE WHEN COALESCE(p.paid_amount, 0) >= a.authorized_amount THEN 'paid'
         WHEN COALESCE(p.paid_amount, 0) > 0 THEN 'partially_paid' ELSE 'authorized' END AS status
FROM public.supplier_advances a
LEFT JOIN payment_totals p ON p.supplier_advance_id = a.id
LEFT JOIN allocation_totals x ON x.supplier_advance_id = a.id
LEFT JOIN refund_totals f ON f.supplier_advance_id = a.id;

CREATE VIEW public.supplier_advance_commitment_balances WITH (security_invoker = true) AS
WITH reserves AS (
    SELECT a.commitment_id,
        COALESCE(SUM(greatest(a.authorized_amount - COALESCE(x.allocated_amount, 0) - COALESCE(f.refunded_amount, 0), 0)), 0)::numeric(14,2) AS existing_advance_reserve
    FROM public.supplier_advances a
    LEFT JOIN (
        SELECT x.supplier_advance_id, SUM(x.amount)::numeric(14,2) AS allocated_amount
        FROM public.supplier_advance_allocations x
        LEFT JOIN public.supplier_advance_allocation_reversals r ON r.supplier_advance_allocation_id = x.id
        WHERE r.id IS NULL GROUP BY x.supplier_advance_id
    ) x ON x.supplier_advance_id = a.id
    LEFT JOIN (
        SELECT supplier_advance_id, SUM(amount)::numeric(14,2) AS refunded_amount
        FROM public.supplier_advance_refunds GROUP BY supplier_advance_id
    ) f ON f.supplier_advance_id = a.id
    GROUP BY a.commitment_id
)
SELECT b.id AS commitment_id, b.service_id, b.supplier_id, b.currency, b.authorized_amount,
    b.open_commitment_amount, b.status AS commitment_status, b.approved_at AS commitment_approved_at,
    b.commitment_source, b.source_reference, q.supplier_reference AS supplier_quotation_reference,
    COALESCE(r.existing_advance_reserve, 0)::numeric(14,2) AS existing_advance_reserve,
    greatest(b.open_commitment_amount - COALESCE(r.existing_advance_reserve, 0), 0)::numeric(14,2) AS available_authorization_amount
FROM public.approved_commitment_balances b
LEFT JOIN reserves r ON r.commitment_id = b.id
LEFT JOIN public.supplier_quotations q ON q.id = b.supplier_quotation_id;

CREATE OR REPLACE VIEW public.supplier_bill_payment_balances WITH (security_invoker = true) AS
WITH payment_totals AS (
    SELECT p.supplier_bill_id,
        COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL), 0)::numeric(14,2) AS paid_amount
    FROM public.supplier_payments p
    LEFT JOIN public.supplier_payment_reversals r ON r.supplier_payment_id = p.id
    GROUP BY p.supplier_bill_id
), allocation_totals AS (
    SELECT a.supplier_bill_id,
        COALESCE(SUM(a.amount) FILTER (WHERE r.id IS NULL), 0)::numeric(14,2) AS advance_allocated_amount
    FROM public.supplier_advance_allocations a
    LEFT JOIN public.supplier_advance_allocation_reversals r ON r.supplier_advance_allocation_id = a.id
    GROUP BY a.supplier_bill_id
)
SELECT b.id AS supplier_bill_id, b.bill_number, b.supplier_id, b.service_id, b.currency,
    b.total_amount AS payable_amount, COALESCE(p.paid_amount, 0)::numeric(14,2) AS paid_amount,
    (b.total_amount - COALESCE(p.paid_amount, 0) - COALESCE(a.advance_allocated_amount, 0))::numeric(14,2) AS outstanding_amount,
    CASE WHEN COALESCE(p.paid_amount, 0) + COALESCE(a.advance_allocated_amount, 0) = 0 THEN 'unpaid'
         WHEN COALESCE(p.paid_amount, 0) + COALESCE(a.advance_allocated_amount, 0) < b.total_amount THEN 'partially_paid'
         ELSE 'paid' END AS payment_status,
    COALESCE(a.advance_allocated_amount, 0)::numeric(14,2) AS advance_allocated_amount
FROM public.supplier_bills b
LEFT JOIN payment_totals p ON p.supplier_bill_id = b.id
LEFT JOIN allocation_totals a ON a.supplier_bill_id = b.id
WHERE b.status = 'approved';

CREATE OR REPLACE FUNCTION public.prevent_supplier_advance_event_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN RAISE EXCEPTION 'supplier_advance_event_immutable'; END;
$$;

DO $$
DECLARE table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'supplier_advances', 'supplier_advance_payments', 'supplier_advance_payment_reversals',
        'supplier_advance_refunds', 'supplier_advance_allocations',
        'supplier_advance_allocation_reversals', 'supplier_advance_authorization_documents',
        'supplier_advance_payment_documents', 'supplier_advance_refund_documents'
    ] LOOP
        EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.prevent_supplier_advance_event_mutation()', table_name || '_immutable', table_name);
    END LOOP;
END;
$$;

ALTER TABLE public.supplier_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_advance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_advance_payment_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_advance_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_advance_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_advance_allocation_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_advance_authorization_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_advance_payment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_advance_refund_documents ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.supplier_advances, public.supplier_advance_payments,
    public.supplier_advance_payment_reversals, public.supplier_advance_refunds,
    public.supplier_advance_allocations, public.supplier_advance_allocation_reversals,
    public.supplier_advance_authorization_documents, public.supplier_advance_payment_documents,
    public.supplier_advance_refund_documents FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.supplier_advances, public.supplier_advance_payments,
    public.supplier_advance_payment_reversals, public.supplier_advance_refunds,
    public.supplier_advance_allocations, public.supplier_advance_allocation_reversals,
    public.supplier_advance_authorization_documents, public.supplier_advance_payment_documents,
    public.supplier_advance_refund_documents TO service_role;
GRANT SELECT ON public.supplier_advance_balances, public.supplier_advance_commitment_balances,
    public.supplier_bill_payment_balances TO service_role;
REVOKE ALL ON FUNCTION public.prevent_supplier_advance_event_mutation() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.supplier_advances IS 'Immutable authorized supplier advances against open approved Event/Service commitments; separate from bills and actual payments.';
COMMENT ON TABLE public.supplier_advance_payments IS 'Immutable actual supplier advance payments. Reversal is append-only and full-payment only.';
COMMENT ON TABLE public.supplier_advance_allocations IS 'Immutable advance-to-approved-bill allocations. Corrections are append-only and explicit.';
COMMENT ON TABLE public.supplier_advance_refunds IS 'Immutable actual supplier refunds received against unallocated advance cash.';
COMMENT ON VIEW public.supplier_advance_balances IS 'Derived authorized, paid, allocated, refunded, reversed and unallocated Supplier Advance values.';
COMMENT ON VIEW public.supplier_bill_payment_balances IS 'Approved bill balance includes ordinary Supplier Payments and separately identified Supplier Advance allocations.';

CREATE OR REPLACE FUNCTION public.authorize_supplier_advance(
    p_commitment_id uuid,
    p_amount numeric,
    p_reason text,
    p_document_id uuid,
    p_evidence_sha256 text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, advance_id uuid, advance_number text, idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_actor uuid;
    v_reason text := NULLIF(btrim(p_reason), '');
    v_commitment record;
    v_capacity numeric(14,2);
    v_existing public.supplier_advances%ROWTYPE;
    v_number text;
    v_id uuid;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_commitment_id IS NULL OR p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
        OR v_reason IS NULL OR char_length(v_reason) < 5 OR char_length(v_reason) > 2000
        OR p_document_id IS NULL OR p_request_id IS NULL
        OR COALESCE(p_evidence_sha256, '') !~ '^[a-f0-9]{64}$'
        OR NULLIF(btrim(p_actor_id), '') IS NULL OR COALESCE(p_actor_role, '') NOT IN ('admin', 'manager')
    THEN
        RETURN QUERY SELECT 'supplier_advance_request_invalid', NULL::uuid, NULL::text, false; RETURN;
    END IF;
    BEGIN v_actor := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN QUERY SELECT 'supplier_advance_request_invalid', NULL::uuid, NULL::text, false; RETURN;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id = v_actor AND u.is_active = true AND u.role = p_actor_role) THEN
        RETURN QUERY SELECT 'supplier_advance_permission_denied', NULL::uuid, NULL::text, false; RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w6c:authorize:' || p_request_id::text, 0));
    SELECT a.* INTO v_existing FROM public.supplier_advances a WHERE a.authorization_request_id = p_request_id;
    IF FOUND THEN
        IF v_existing.commitment_id IS DISTINCT FROM p_commitment_id
            OR v_existing.authorized_amount IS DISTINCT FROM p_amount
            OR v_existing.reason IS DISTINCT FROM v_reason
            OR v_existing.evidence_sha256 IS DISTINCT FROM p_evidence_sha256
            OR NOT EXISTS (
                SELECT 1 FROM public.supplier_advance_authorization_documents d
                WHERE d.supplier_advance_id = v_existing.id AND d.content_sha256 = p_evidence_sha256
            )
        THEN
            RETURN QUERY SELECT 'supplier_advance_request_conflict', v_existing.id, v_existing.advance_number, false; RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.advance_number, true; RETURN;
    END IF;

    SELECT c.service_id, c.supplier_id, c.currency, c.status, b.authorized_amount, b.open_commitment_amount
    INTO v_commitment
    FROM public.approved_commitments c
    JOIN public.approved_commitment_balances b ON b.id = c.id
    WHERE c.id = p_commitment_id
    FOR UPDATE OF c;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_commitment_not_found', NULL::uuid, NULL::text, false; RETURN; END IF;
    IF v_commitment.status <> 'open' OR v_commitment.open_commitment_amount <= 0 THEN
        RETURN QUERY SELECT 'supplier_advance_commitment_not_eligible', NULL::uuid, NULL::text, false; RETURN;
    END IF;
    IF v_commitment.currency IS NULL OR v_commitment.service_id IS NULL OR v_commitment.supplier_id IS NULL THEN
        RETURN QUERY SELECT 'supplier_advance_commitment_mismatch', NULL::uuid, NULL::text, false; RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = v_commitment.supplier_id AND s.is_deleted = false AND s.deleted_at IS NULL)
        OR NOT EXISTS (SELECT 1 FROM public.services s WHERE s.id = v_commitment.service_id AND s.deleted_at IS NULL)
    THEN
        RETURN QUERY SELECT 'supplier_advance_commitment_not_eligible', NULL::uuid, NULL::text, false; RETURN;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.business_documents d
        JOIN public.business_document_links l ON l.document_id = d.id
            AND l.service_id = v_commitment.service_id AND l.link_purpose = 'supplier_advance_authorization'
        WHERE d.id = p_document_id AND d.bucket_id = 'business-evidence'
            AND d.document_type = 'supplier_advance_authorization_evidence'
    ) THEN
        RETURN QUERY SELECT 'supplier_advance_evidence_required', NULL::uuid, NULL::text, false; RETURN;
    END IF;

    SELECT greatest(v_commitment.open_commitment_amount - COALESCE(SUM(
        greatest(a.authorized_amount - COALESCE(x.allocated_amount, 0) - COALESCE(f.refunded_amount, 0), 0)
    ), 0), 0)
    INTO v_capacity
    FROM public.supplier_advances a
    LEFT JOIN (
        SELECT al.supplier_advance_id, SUM(al.amount)::numeric(14,2) AS allocated_amount
        FROM public.supplier_advance_allocations al
        LEFT JOIN public.supplier_advance_allocation_reversals cr ON cr.supplier_advance_allocation_id = al.id
        WHERE cr.id IS NULL GROUP BY al.supplier_advance_id
    ) x ON x.supplier_advance_id = a.id
    LEFT JOIN (
        SELECT supplier_advance_id, SUM(amount)::numeric(14,2) AS refunded_amount
        FROM public.supplier_advance_refunds GROUP BY supplier_advance_id
    ) f ON f.supplier_advance_id = a.id
    WHERE a.commitment_id = p_commitment_id;
    IF p_amount > v_capacity THEN
        RETURN QUERY SELECT 'supplier_advance_ceiling_exceeded', NULL::uuid, NULL::text, false; RETURN;
    END IF;

    v_number := public.generate_document_number('supplier_advance');
    INSERT INTO public.supplier_advances(
        advance_number, commitment_id, service_id, supplier_id, currency, authorized_amount,
        reason, evidence_sha256, authorized_by, authorized_at, authorization_request_id
    ) VALUES (
        v_number, p_commitment_id, v_commitment.service_id, v_commitment.supplier_id, v_commitment.currency,
        p_amount, v_reason, p_evidence_sha256, v_actor, v_now, p_request_id
    ) RETURNING id INTO v_id;
    INSERT INTO public.supplier_advance_authorization_documents(
        supplier_advance_id, document_id, content_sha256, attached_by, attached_at
    ) VALUES (v_id, p_document_id, p_evidence_sha256, v_actor, v_now);
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('supplier_advance_authorized', 'supplier_advance', v_id, p_actor_id,
        jsonb_build_object('operation','supplier_advance_authorize','request_id',p_request_id::text,
            'actor_role',p_actor_role,'commitment_id',p_commitment_id,'amount',p_amount,
            'reason',v_reason,'document_id',p_document_id,'evidence_sha256',p_evidence_sha256), v_now);
    RETURN QUERY SELECT NULL::text, v_id, v_number, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_supplier_advance_payment(
    p_advance_id uuid,
    p_payment_date date,
    p_amount numeric,
    p_method text,
    p_reference text,
    p_notes text,
    p_document_id uuid,
    p_evidence_sha256 text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(error_code text, payment_id uuid, payment_number text, advance_id uuid,
    paid_amount numeric, remaining_unallocated_amount numeric, idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_actor uuid;
    v_method text := lower(NULLIF(btrim(p_method), ''));
    v_reference text := NULLIF(btrim(p_reference), '');
    v_notes text := NULLIF(btrim(p_notes), '');
    v_advance record;
    v_supplier record;
    v_existing public.supplier_advance_payments%ROWTYPE;
    v_paid numeric(14,2);
    v_allocated numeric(14,2);
    v_refunded numeric(14,2);
    v_number text;
    v_id uuid;
    v_now timestamptz := transaction_timestamp();
BEGIN
    IF p_advance_id IS NULL OR p_payment_date IS NULL OR p_amount IS NULL OR p_amount <= 0
        OR p_amount <> round(p_amount, 2) OR p_document_id IS NULL OR p_request_id IS NULL
        OR COALESCE(p_evidence_sha256, '') !~ '^[a-f0-9]{64}$' OR COALESCE(v_method, '') NOT IN ('bank_transfer','cash','cheque')
        OR (v_method IN ('bank_transfer','cheque') AND v_reference IS NULL)
        OR (v_reference IS NOT NULL AND char_length(v_reference) > 200)
        OR (v_notes IS NOT NULL AND char_length(v_notes) > 2000)
        OR NULLIF(btrim(p_actor_id), '') IS NULL OR COALESCE(p_actor_role, '') NOT IN ('admin','accountant')
    THEN
        RETURN QUERY SELECT 'supplier_advance_request_invalid', NULL::uuid, NULL::text, p_advance_id, 0::numeric, NULL::numeric, false; RETURN;
    END IF;
    BEGIN v_actor := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN RETURN QUERY SELECT 'supplier_advance_request_invalid', NULL::uuid, NULL::text, p_advance_id, 0::numeric, NULL::numeric, false; RETURN;
    END;
    IF NOT EXISTS (SELECT 1 FROM public.app_users u WHERE u.id=v_actor AND u.is_active=true AND u.role=p_actor_role) THEN
        RETURN QUERY SELECT 'supplier_advance_permission_denied', NULL::uuid, NULL::text, p_advance_id, 0::numeric, NULL::numeric, false; RETURN;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('w6c:payment:' || p_request_id::text, 0));
    SELECT p.* INTO v_existing FROM public.supplier_advance_payments p WHERE p.record_request_id=p_request_id;
    IF FOUND THEN
        IF v_existing.supplier_advance_id IS DISTINCT FROM p_advance_id OR v_existing.payment_date IS DISTINCT FROM p_payment_date
            OR v_existing.amount IS DISTINCT FROM p_amount OR v_existing.method IS DISTINCT FROM v_method
            OR v_existing.reference IS DISTINCT FROM v_reference OR v_existing.notes IS DISTINCT FROM v_notes
            OR NOT EXISTS (SELECT 1 FROM public.supplier_advance_payment_documents d
                WHERE d.supplier_advance_payment_id=v_existing.id AND d.content_sha256=p_evidence_sha256)
        THEN
            RETURN QUERY SELECT 'supplier_advance_request_conflict', v_existing.id, v_existing.payment_number, p_advance_id, 0::numeric, NULL::numeric, false; RETURN;
        END IF;
        SELECT paid_amount, remaining_unallocated_amount INTO v_paid, v_allocated
        FROM public.supplier_advance_balances WHERE supplier_advance_id=p_advance_id;
        RETURN QUERY SELECT NULL::text, v_existing.id, v_existing.payment_number, p_advance_id, v_paid, v_allocated, true; RETURN;
    END IF;

    SELECT a.* INTO v_advance FROM public.supplier_advances a WHERE a.id=p_advance_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_not_found', NULL::uuid, NULL::text, p_advance_id, 0::numeric, NULL::numeric, false; RETURN; END IF;
    SELECT s.iban,s.bank_name,s.bank_account_name INTO v_supplier
    FROM public.suppliers s WHERE s.id=v_advance.supplier_id AND s.is_deleted=false AND s.deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_supplier_not_found', NULL::uuid, NULL::text, p_advance_id, 0::numeric, NULL::numeric, false; RETURN; END IF;
    IF v_method='bank_transfer' AND (NULLIF(btrim(v_supplier.iban),'') IS NULL
        OR NULLIF(btrim(v_supplier.bank_name),'') IS NULL OR NULLIF(btrim(v_supplier.bank_account_name),'') IS NULL)
    THEN RETURN QUERY SELECT 'supplier_advance_bank_details_required', NULL::uuid, NULL::text, p_advance_id, 0::numeric, NULL::numeric, false; RETURN; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.business_documents d
        JOIN public.business_document_links l ON l.document_id=d.id AND l.service_id=v_advance.service_id
            AND l.link_purpose='supplier_advance_payment'
        WHERE d.id=p_document_id AND d.bucket_id='business-evidence' AND d.document_type='supplier_advance_payment_evidence')
    THEN RETURN QUERY SELECT 'supplier_advance_evidence_required', NULL::uuid, NULL::text, p_advance_id, 0::numeric, NULL::numeric, false; RETURN; END IF;

    SELECT COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL),0)::numeric(14,2)
    INTO v_paid FROM public.supplier_advance_payments p
    LEFT JOIN public.supplier_advance_payment_reversals r ON r.supplier_advance_payment_id=p.id
    WHERE p.supplier_advance_id=p_advance_id;
    IF p_amount > v_advance.authorized_amount-v_paid THEN
        RETURN QUERY SELECT 'supplier_advance_payment_exceeds_authorized', NULL::uuid, NULL::text, p_advance_id, v_paid, 0::numeric, false; RETURN;
    END IF;
    SELECT COALESCE(SUM(a.amount) FILTER (WHERE r.id IS NULL),0)::numeric(14,2)
    INTO v_allocated FROM public.supplier_advance_allocations a
    LEFT JOIN public.supplier_advance_allocation_reversals r ON r.supplier_advance_allocation_id=a.id
    WHERE a.supplier_advance_id=p_advance_id;
    SELECT COALESCE(SUM(amount),0)::numeric(14,2) INTO v_refunded
    FROM public.supplier_advance_refunds WHERE supplier_advance_id=p_advance_id;
    IF NOT EXISTS (SELECT 1 FROM public.business_documents d
        JOIN public.business_document_links l ON l.document_id=d.id AND l.service_id=v_advance.service_id
            AND l.link_purpose='supplier_advance_payment'
        WHERE d.id=p_document_id AND d.bucket_id='business-evidence' AND d.document_type='supplier_advance_payment_evidence')
    THEN RETURN QUERY SELECT 'supplier_advance_evidence_required', NULL::uuid, NULL::text, p_advance_id, v_paid, greatest(v_paid-v_allocated-v_refunded,0), false; RETURN; END IF;

    v_number := public.generate_document_number('supplier_advance_payment');
    INSERT INTO public.supplier_advance_payments(payment_number,supplier_advance_id,supplier_id,service_id,
        payment_date,amount,method,reference,bank_name_snapshot,bank_account_name_snapshot,iban_snapshot,
        notes,recorded_by,recorded_at,record_request_id)
    VALUES (v_number,p_advance_id,v_advance.supplier_id,v_advance.service_id,p_payment_date,p_amount,v_method,v_reference,
        CASE WHEN v_method='bank_transfer' THEN v_supplier.bank_name END,
        CASE WHEN v_method='bank_transfer' THEN v_supplier.bank_account_name END,
        CASE WHEN v_method='bank_transfer' THEN v_supplier.iban END,
        v_notes,v_actor,v_now,p_request_id) RETURNING id INTO v_id;
    INSERT INTO public.supplier_advance_payment_documents(supplier_advance_payment_id,document_id,content_sha256,attached_by,attached_at)
    VALUES (v_id,p_document_id,p_evidence_sha256,v_actor,v_now);
    INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES ('supplier_advance_payment_recorded','supplier_advance_payment',v_id,p_actor_id,
        jsonb_build_object('operation','supplier_advance_payment_record','request_id',p_request_id::text,
            'actor_role',p_actor_role,'supplier_advance_id',p_advance_id,'payment_date',p_payment_date,
            'amount',p_amount,'method',v_method,'reference',v_reference,'notes',v_notes,
            'document_id',p_document_id,'evidence_sha256',p_evidence_sha256),v_now);
    SELECT paid_amount,remaining_unallocated_amount INTO v_paid,v_allocated
    FROM public.supplier_advance_balances WHERE supplier_advance_id=p_advance_id;
    RETURN QUERY SELECT NULL::text,v_id,v_number,p_advance_id,v_paid,v_allocated,false;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_supplier_advance(
    p_advance_id uuid,p_business_date date,p_amount numeric,p_reason text,p_reference text,
    p_document_id uuid,p_evidence_sha256 text,p_request_id uuid,p_actor_id text,p_actor_role text
)
RETURNS TABLE(error_code text,refund_id uuid,refund_number text,advance_id uuid,
    refunded_amount numeric,remaining_unallocated_amount numeric,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_actor uuid; v_reason text:=NULLIF(btrim(p_reason),''); v_reference text:=NULLIF(btrim(p_reference),'');
    v_advance record; v_existing public.supplier_advance_refunds%ROWTYPE;
    v_paid numeric(14,2); v_allocated numeric(14,2); v_refunded numeric(14,2);
    v_number text; v_id uuid; v_now timestamptz:=transaction_timestamp();
BEGIN
    IF p_advance_id IS NULL OR p_business_date IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2)
        OR v_reason IS NULL OR char_length(v_reason)<5 OR char_length(v_reason)>2000
        OR (v_reference IS NOT NULL AND char_length(v_reference)>200) OR p_document_id IS NULL OR p_request_id IS NULL
        OR COALESCE(p_evidence_sha256, '') !~ '^[a-f0-9]{64}$' OR NULLIF(btrim(p_actor_id),'') IS NULL
        OR COALESCE(p_actor_role, '') NOT IN ('admin','accountant')
    THEN RETURN QUERY SELECT 'supplier_advance_request_invalid',NULL::uuid,NULL::text,p_advance_id,0::numeric,NULL::numeric,false; RETURN; END IF;
    BEGIN v_actor:=p_actor_id::uuid; EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_advance_request_invalid',NULL::uuid,NULL::text,p_advance_id,0::numeric,NULL::numeric,false; RETURN;
    END;
    IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=v_actor AND u.is_active=true AND u.role=p_actor_role) THEN
        RETURN QUERY SELECT 'supplier_advance_permission_denied',NULL::uuid,NULL::text,p_advance_id,0::numeric,NULL::numeric,false; RETURN;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('w6c:refund:'||p_request_id::text,0));
    SELECT f.* INTO v_existing FROM public.supplier_advance_refunds f WHERE f.record_request_id=p_request_id;
    IF FOUND THEN
        IF v_existing.supplier_advance_id IS DISTINCT FROM p_advance_id OR v_existing.business_date IS DISTINCT FROM p_business_date
            OR v_existing.amount IS DISTINCT FROM p_amount OR v_existing.reason IS DISTINCT FROM v_reason
            OR v_existing.reference IS DISTINCT FROM v_reference OR v_existing.evidence_sha256 IS DISTINCT FROM p_evidence_sha256
            OR NOT EXISTS(SELECT 1 FROM public.supplier_advance_refund_documents d WHERE d.supplier_advance_refund_id=v_existing.id
                AND d.content_sha256=p_evidence_sha256)
        THEN RETURN QUERY SELECT 'supplier_advance_request_conflict',v_existing.id,v_existing.refund_number,p_advance_id,0::numeric,NULL::numeric,false; RETURN; END IF;
        SELECT refunded_amount,remaining_unallocated_amount INTO v_refunded,v_allocated FROM public.supplier_advance_balances WHERE supplier_advance_id=p_advance_id;
        RETURN QUERY SELECT NULL::text,v_existing.id,v_existing.refund_number,p_advance_id,v_refunded,v_allocated,true; RETURN;
    END IF;
    SELECT a.* INTO v_advance FROM public.supplier_advances a WHERE a.id=p_advance_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_not_found',NULL::uuid,NULL::text,p_advance_id,0::numeric,NULL::numeric,false; RETURN; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.business_documents d JOIN public.business_document_links l
        ON l.document_id=d.id AND l.service_id=v_advance.service_id AND l.link_purpose='supplier_advance_refund'
        WHERE d.id=p_document_id AND d.bucket_id='business-evidence' AND d.document_type='supplier_advance_refund_evidence')
    THEN RETURN QUERY SELECT 'supplier_advance_evidence_required',NULL::uuid,NULL::text,p_advance_id,0::numeric,NULL::numeric,false; RETURN; END IF;
    SELECT paid_amount,allocated_amount,refunded_amount,remaining_unallocated_amount
    INTO v_paid,v_allocated,v_refunded FROM public.supplier_advance_balances WHERE supplier_advance_id=p_advance_id;
    IF p_amount>v_paid-v_allocated-v_refunded THEN
        RETURN QUERY SELECT 'supplier_advance_refund_exceeds_unallocated',NULL::uuid,NULL::text,p_advance_id,v_refunded,greatest(v_paid-v_allocated-v_refunded,0),false; RETURN;
    END IF;
    v_number:=public.generate_document_number('supplier_advance_refund');
    INSERT INTO public.supplier_advance_refunds(refund_number,supplier_advance_id,business_date,amount,reason,reference,evidence_sha256,recorded_by,recorded_at,record_request_id)
    VALUES(v_number,p_advance_id,p_business_date,p_amount,v_reason,v_reference,p_evidence_sha256,v_actor,v_now,p_request_id) RETURNING id INTO v_id;
    INSERT INTO public.supplier_advance_refund_documents(supplier_advance_refund_id,document_id,content_sha256,attached_by,attached_at)
    VALUES(v_id,p_document_id,p_evidence_sha256,v_actor,v_now);
    INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES('supplier_advance_refund_recorded','supplier_advance_refund',v_id,p_actor_id,
        jsonb_build_object('operation','supplier_advance_refund','request_id',p_request_id::text,'actor_role',p_actor_role,
            'supplier_advance_id',p_advance_id,'business_date',p_business_date,'amount',p_amount,'reason',v_reason,
            'reference',v_reference,'document_id',p_document_id,'evidence_sha256',p_evidence_sha256),v_now);
    SELECT refunded_amount,remaining_unallocated_amount INTO v_refunded,v_allocated FROM public.supplier_advance_balances WHERE supplier_advance_id=p_advance_id;
    RETURN QUERY SELECT NULL::text,v_id,v_number,p_advance_id,v_refunded,v_allocated,false;
END;
$$;

CREATE OR REPLACE FUNCTION public.allocate_supplier_advance(
    p_advance_id uuid,p_supplier_bill_id uuid,p_amount numeric,p_request_id uuid,p_actor_id text,p_actor_role text
)
RETURNS TABLE(error_code text,allocation_id uuid,allocation_number text,advance_id uuid,
    bill_id uuid,allocated_amount numeric,advance_unallocated_amount numeric,bill_outstanding_amount numeric,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_actor uuid; v_advance record; v_bill record; v_existing public.supplier_advance_allocations%ROWTYPE;
    v_unallocated numeric(14,2); v_bill_outstanding numeric(14,2); v_number text; v_id uuid;
    v_now timestamptz:=transaction_timestamp();
BEGIN
    IF p_advance_id IS NULL OR p_supplier_bill_id IS NULL OR p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2)
        OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id),'') IS NULL OR COALESCE(p_actor_role, '') NOT IN ('admin','accountant')
    THEN RETURN QUERY SELECT 'supplier_advance_request_invalid',NULL::uuid,NULL::text,p_advance_id,p_supplier_bill_id,0::numeric,NULL::numeric,NULL::numeric,false; RETURN; END IF;
    BEGIN v_actor:=p_actor_id::uuid; EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_advance_request_invalid',NULL::uuid,NULL::text,p_advance_id,p_supplier_bill_id,0::numeric,NULL::numeric,NULL::numeric,false; RETURN;
    END;
    IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=v_actor AND u.is_active=true AND u.role=p_actor_role) THEN
        RETURN QUERY SELECT 'supplier_advance_permission_denied',NULL::uuid,NULL::text,p_advance_id,p_supplier_bill_id,0::numeric,NULL::numeric,NULL::numeric,false; RETURN;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('w6c:allocate:'||p_request_id::text,0));
    SELECT a.* INTO v_existing FROM public.supplier_advance_allocations a WHERE a.allocation_request_id=p_request_id;
    IF FOUND THEN
        IF v_existing.supplier_advance_id IS DISTINCT FROM p_advance_id OR v_existing.supplier_bill_id IS DISTINCT FROM p_supplier_bill_id
            OR v_existing.amount IS DISTINCT FROM p_amount
        THEN RETURN QUERY SELECT 'supplier_advance_request_conflict',v_existing.id,v_existing.allocation_number,p_advance_id,p_supplier_bill_id,0::numeric,NULL::numeric,NULL::numeric,false; RETURN; END IF;
        SELECT remaining_unallocated_amount INTO v_unallocated FROM public.supplier_advance_balances WHERE supplier_advance_id=p_advance_id;
        SELECT outstanding_amount INTO v_bill_outstanding FROM public.supplier_bill_payment_balances WHERE supplier_bill_id=p_supplier_bill_id;
        RETURN QUERY SELECT NULL::text,v_existing.id,v_existing.allocation_number,p_advance_id,p_supplier_bill_id,p_amount,v_unallocated,v_bill_outstanding,true; RETURN;
    END IF;

    SELECT b.id,b.commitment_id,b.service_id,b.supplier_id,b.currency,b.status
    INTO v_bill FROM public.supplier_bills b WHERE b.id=p_supplier_bill_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_bill_not_found',NULL::uuid,NULL::text,p_advance_id,p_supplier_bill_id,0::numeric,NULL::numeric,NULL::numeric,false; RETURN; END IF;
    IF v_bill.status<>'approved' THEN RETURN QUERY SELECT 'supplier_advance_bill_not_approved',NULL::uuid,NULL::text,p_advance_id,p_supplier_bill_id,0::numeric,NULL::numeric,NULL::numeric,false; RETURN; END IF;
    SELECT c.id INTO v_advance FROM public.approved_commitments c WHERE c.id=v_bill.commitment_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_allocation_mismatch',NULL::uuid,NULL::text,p_advance_id,p_supplier_bill_id,0::numeric,NULL::numeric,NULL::numeric,false; RETURN; END IF;
    SELECT a.* INTO v_advance FROM public.supplier_advances a WHERE a.id=p_advance_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_not_found',NULL::uuid,NULL::text,p_advance_id,p_supplier_bill_id,0::numeric,NULL::numeric,NULL::numeric,false; RETURN; END IF;
    IF v_advance.commitment_id IS DISTINCT FROM v_bill.commitment_id OR v_advance.service_id IS DISTINCT FROM v_bill.service_id
        OR v_advance.supplier_id IS DISTINCT FROM v_bill.supplier_id OR v_advance.currency IS DISTINCT FROM v_bill.currency
    THEN RETURN QUERY SELECT 'supplier_advance_allocation_mismatch',NULL::uuid,NULL::text,p_advance_id,p_supplier_bill_id,0::numeric,NULL::numeric,NULL::numeric,false; RETURN; END IF;
    SELECT remaining_unallocated_amount INTO v_unallocated FROM public.supplier_advance_balances WHERE supplier_advance_id=p_advance_id;
    SELECT outstanding_amount INTO v_bill_outstanding FROM public.supplier_bill_payment_balances WHERE supplier_bill_id=p_supplier_bill_id;
    IF p_amount>COALESCE(v_unallocated,0) THEN
        RETURN QUERY SELECT 'supplier_advance_allocation_exceeds_unallocated',NULL::uuid,NULL::text,p_advance_id,p_supplier_bill_id,0::numeric,v_unallocated,v_bill_outstanding,false; RETURN;
    END IF;
    IF p_amount>COALESCE(v_bill_outstanding,0) THEN
        RETURN QUERY SELECT 'supplier_advance_allocation_exceeds_outstanding',NULL::uuid,NULL::text,p_advance_id,p_supplier_bill_id,0::numeric,v_unallocated,v_bill_outstanding,false; RETURN;
    END IF;
    v_number:=public.generate_document_number('supplier_advance_allocation');
    INSERT INTO public.supplier_advance_allocations(allocation_number,supplier_advance_id,supplier_bill_id,amount,allocated_by,allocated_at,allocation_request_id)
    VALUES(v_number,p_advance_id,p_supplier_bill_id,p_amount,v_actor,v_now,p_request_id) RETURNING id INTO v_id;
    INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES('supplier_advance_allocated','supplier_advance_allocation',v_id,p_actor_id,
        jsonb_build_object('operation','supplier_advance_allocate','request_id',p_request_id::text,'actor_role',p_actor_role,
            'supplier_advance_id',p_advance_id,'supplier_bill_id',p_supplier_bill_id,'amount',p_amount),v_now);
    SELECT remaining_unallocated_amount INTO v_unallocated FROM public.supplier_advance_balances WHERE supplier_advance_id=p_advance_id;
    SELECT outstanding_amount INTO v_bill_outstanding FROM public.supplier_bill_payment_balances WHERE supplier_bill_id=p_supplier_bill_id;
    RETURN QUERY SELECT NULL::text,v_id,v_number,p_advance_id,p_supplier_bill_id,p_amount,v_unallocated,v_bill_outstanding,false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_supplier_advance_payment(
    p_payment_id uuid,p_reason text,p_request_id uuid,p_actor_id text,p_actor_role text
)
RETURNS TABLE(error_code text,payment_id uuid,advance_id uuid,paid_amount numeric,
    remaining_unallocated_amount numeric,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_actor uuid; v_reason text:=NULLIF(btrim(p_reason),''); v_payment record;
    v_existing record;
    v_paid numeric(14,2); v_unallocated numeric(14,2); v_now timestamptz:=transaction_timestamp();
BEGIN
    IF p_payment_id IS NULL OR p_request_id IS NULL OR v_reason IS NULL OR char_length(v_reason)<5 OR char_length(v_reason)>2000
        OR NULLIF(btrim(p_actor_id),'') IS NULL OR COALESCE(p_actor_role, '') NOT IN ('admin','accountant')
    THEN RETURN QUERY SELECT 'supplier_advance_request_invalid',p_payment_id,NULL::uuid,0::numeric,NULL::numeric,false; RETURN; END IF;
    BEGIN v_actor:=p_actor_id::uuid; EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_advance_request_invalid',p_payment_id,NULL::uuid,0::numeric,NULL::numeric,false; RETURN;
    END;
    IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=v_actor AND u.is_active=true AND u.role=p_actor_role) THEN
        RETURN QUERY SELECT 'supplier_advance_permission_denied',p_payment_id,NULL::uuid,0::numeric,NULL::numeric,false; RETURN;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('w6c:payment-reversal:'||p_request_id::text,0));
    SELECT r.*,p.supplier_advance_id INTO v_existing
    FROM public.supplier_advance_payment_reversals r JOIN public.supplier_advance_payments p ON p.id=r.supplier_advance_payment_id
    WHERE r.reversal_request_id=p_request_id;
    IF FOUND THEN
        IF v_existing.supplier_advance_payment_id IS DISTINCT FROM p_payment_id OR v_existing.reason IS DISTINCT FROM v_reason
        THEN RETURN QUERY SELECT 'supplier_advance_request_conflict',p_payment_id,v_existing.supplier_advance_id,0::numeric,NULL::numeric,false; RETURN; END IF;
        SELECT paid_amount,remaining_unallocated_amount INTO v_paid,v_unallocated FROM public.supplier_advance_balances WHERE supplier_advance_id=v_existing.supplier_advance_id;
        RETURN QUERY SELECT NULL::text,p_payment_id,v_existing.supplier_advance_id,v_paid,v_unallocated,true; RETURN;
    END IF;
    SELECT a.id INTO v_payment FROM public.supplier_advances a
    JOIN public.supplier_advance_payments p ON p.supplier_advance_id=a.id
    WHERE p.id=p_payment_id FOR UPDATE OF a;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_payment_not_found',p_payment_id,NULL::uuid,0::numeric,NULL::numeric,false; RETURN; END IF;
    SELECT p.* INTO v_payment FROM public.supplier_advance_payments p WHERE p.id=p_payment_id FOR UPDATE;
    IF EXISTS(SELECT 1 FROM public.supplier_advance_payment_reversals r WHERE r.supplier_advance_payment_id=p_payment_id) THEN
        RETURN QUERY SELECT 'supplier_advance_payment_already_reversed',p_payment_id,v_payment.supplier_advance_id,0::numeric,NULL::numeric,false; RETURN;
    END IF;
    SELECT remaining_unallocated_amount INTO v_unallocated FROM public.supplier_advance_balances WHERE supplier_advance_id=v_payment.supplier_advance_id;
    IF COALESCE(v_unallocated,0)<v_payment.amount THEN
        RETURN QUERY SELECT 'supplier_advance_payment_reverse_unavailable',p_payment_id,v_payment.supplier_advance_id,0::numeric,v_unallocated,false; RETURN;
    END IF;
    INSERT INTO public.supplier_advance_payment_reversals(supplier_advance_payment_id,reason,reversed_by,reversed_at,reversal_request_id)
    VALUES(p_payment_id,v_reason,v_actor,v_now,p_request_id);
    INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES('supplier_advance_payment_reversed','supplier_advance_payment',p_payment_id,p_actor_id,
        jsonb_build_object('operation','supplier_advance_payment_reverse','request_id',p_request_id::text,
            'actor_role',p_actor_role,'supplier_advance_id',v_payment.supplier_advance_id,'reason',v_reason),v_now);
    SELECT paid_amount,remaining_unallocated_amount INTO v_paid,v_unallocated FROM public.supplier_advance_balances WHERE supplier_advance_id=v_payment.supplier_advance_id;
    RETURN QUERY SELECT NULL::text,p_payment_id,v_payment.supplier_advance_id,v_paid,v_unallocated,false;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_supplier_advance_allocation(
    p_allocation_id uuid,p_reason text,p_request_id uuid,p_actor_id text,p_actor_role text
)
RETURNS TABLE(error_code text,allocation_id uuid,advance_id uuid,bill_id uuid,
    remaining_unallocated_amount numeric,bill_outstanding_amount numeric,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    v_actor uuid; v_reason text:=NULLIF(btrim(p_reason),''); v_allocation record;
    v_existing record; v_capacity record;
    v_unallocated numeric(14,2); v_bill_outstanding numeric(14,2); v_now timestamptz:=transaction_timestamp();
BEGIN
    IF p_allocation_id IS NULL OR p_request_id IS NULL OR v_reason IS NULL OR char_length(v_reason)<5 OR char_length(v_reason)>2000
        OR NULLIF(btrim(p_actor_id),'') IS NULL OR COALESCE(p_actor_role, '') NOT IN ('admin','accountant')
    THEN RETURN QUERY SELECT 'supplier_advance_request_invalid',p_allocation_id,NULL::uuid,NULL::uuid,NULL::numeric,NULL::numeric,false; RETURN; END IF;
    BEGIN v_actor:=p_actor_id::uuid; EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'supplier_advance_request_invalid',p_allocation_id,NULL::uuid,NULL::uuid,NULL::numeric,NULL::numeric,false; RETURN;
    END;
    IF NOT EXISTS(SELECT 1 FROM public.app_users u WHERE u.id=v_actor AND u.is_active=true AND u.role=p_actor_role) THEN
        RETURN QUERY SELECT 'supplier_advance_permission_denied',p_allocation_id,NULL::uuid,NULL::uuid,NULL::numeric,NULL::numeric,false; RETURN;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('w6c:allocation-correction:'||p_request_id::text,0));
    SELECT r.*,a.supplier_advance_id,a.supplier_bill_id INTO v_existing
    FROM public.supplier_advance_allocation_reversals r JOIN public.supplier_advance_allocations a ON a.id=r.supplier_advance_allocation_id
    WHERE r.correction_request_id=p_request_id;
    IF FOUND THEN
        IF v_existing.supplier_advance_allocation_id IS DISTINCT FROM p_allocation_id OR v_existing.reason IS DISTINCT FROM v_reason
        THEN RETURN QUERY SELECT 'supplier_advance_request_conflict',p_allocation_id,v_existing.supplier_advance_id,v_existing.supplier_bill_id,NULL::numeric,NULL::numeric,false; RETURN; END IF;
        SELECT remaining_unallocated_amount INTO v_unallocated FROM public.supplier_advance_balances WHERE supplier_advance_id=v_existing.supplier_advance_id;
        SELECT outstanding_amount INTO v_bill_outstanding FROM public.supplier_bill_payment_balances WHERE supplier_bill_id=v_existing.supplier_bill_id;
        RETURN QUERY SELECT NULL::text,p_allocation_id,v_existing.supplier_advance_id,v_existing.supplier_bill_id,v_unallocated,v_bill_outstanding,true; RETURN;
    END IF;
    SELECT a.id,a.supplier_advance_id,a.supplier_bill_id,a.amount,adv.commitment_id
    INTO v_allocation FROM public.supplier_advance_allocations a
    JOIN public.supplier_advances adv ON adv.id=a.supplier_advance_id
    JOIN public.supplier_bills b ON b.id=a.supplier_bill_id
    WHERE a.id=p_allocation_id FOR UPDATE OF b;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_allocation_not_found',p_allocation_id,NULL::uuid,NULL::uuid,NULL::numeric,NULL::numeric,false; RETURN; END IF;
    PERFORM 1 FROM public.approved_commitments c WHERE c.id=v_allocation.commitment_id FOR UPDATE;
    PERFORM 1 FROM public.supplier_advances a WHERE a.id=v_allocation.supplier_advance_id FOR UPDATE;
    IF EXISTS(SELECT 1 FROM public.supplier_advance_allocation_reversals r WHERE r.supplier_advance_allocation_id=p_allocation_id) THEN
        RETURN QUERY SELECT 'supplier_advance_allocation_already_corrected',p_allocation_id,v_allocation.supplier_advance_id,v_allocation.supplier_bill_id,NULL::numeric,NULL::numeric,false; RETURN;
    END IF;
    SELECT open_commitment_amount,existing_advance_reserve INTO v_capacity
    FROM public.supplier_advance_commitment_balances WHERE commitment_id=v_allocation.commitment_id;
    IF COALESCE(v_capacity.existing_advance_reserve,0)+v_allocation.amount>COALESCE(v_capacity.open_commitment_amount,0) THEN
        RETURN QUERY SELECT 'supplier_advance_commitment_capacity_changed',p_allocation_id,v_allocation.supplier_advance_id,v_allocation.supplier_bill_id,NULL::numeric,NULL::numeric,false; RETURN;
    END IF;
    INSERT INTO public.supplier_advance_allocation_reversals(supplier_advance_allocation_id,reason,corrected_by,corrected_at,correction_request_id)
    VALUES(p_allocation_id,v_reason,v_actor,v_now,p_request_id);
    INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES('supplier_advance_allocation_corrected','supplier_advance_allocation',p_allocation_id,p_actor_id,
        jsonb_build_object('operation','supplier_advance_allocation_correct','request_id',p_request_id::text,
            'actor_role',p_actor_role,'supplier_advance_id',v_allocation.supplier_advance_id,
            'supplier_bill_id',v_allocation.supplier_bill_id,'amount',v_allocation.amount,'reason',v_reason),v_now);
    SELECT remaining_unallocated_amount INTO v_unallocated FROM public.supplier_advance_balances WHERE supplier_advance_id=v_allocation.supplier_advance_id;
    SELECT outstanding_amount INTO v_bill_outstanding FROM public.supplier_bill_payment_balances WHERE supplier_bill_id=v_allocation.supplier_bill_id;
    RETURN QUERY SELECT NULL::text,p_allocation_id,v_allocation.supplier_advance_id,v_allocation.supplier_bill_id,v_unallocated,v_bill_outstanding,false;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_supplier_advance_commitment_amendment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_commitment record; v_reserve numeric(14,2); v_proposed_open numeric(14,2);
BEGIN
    SELECT b.accepted_amount,b.pending_amount,b.status INTO v_commitment
    FROM public.approved_commitment_balances b WHERE b.id=NEW.commitment_id;
    IF NOT FOUND THEN RETURN NEW; END IF;
    SELECT existing_advance_reserve INTO v_reserve
    FROM public.supplier_advance_commitment_balances WHERE commitment_id=NEW.commitment_id;
    v_proposed_open:=NEW.approved_amount_after-COALESCE(v_commitment.accepted_amount,0)-COALESCE(v_commitment.pending_amount,0);
    IF v_commitment.status='open' AND COALESCE(v_reserve,0)>greatest(v_proposed_open,0) THEN
        RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='approved_commitment_supplier_advance_reserved';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_supplier_advance_commitment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_reserve numeric(14,2);
BEGIN
    IF OLD.status='open' AND NEW.status<>'open' THEN
        SELECT existing_advance_reserve INTO v_reserve
        FROM public.supplier_advance_commitment_balances WHERE commitment_id=OLD.id;
        IF COALESCE(v_reserve,0)>0 THEN
            RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='approved_commitment_supplier_advance_reserved';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER approved_commitment_supplier_advance_amendment_guard
    BEFORE INSERT ON public.approved_commitment_amendments
    FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_advance_commitment_amendment();
CREATE TRIGGER approved_commitment_supplier_advance_status_guard
    BEFORE UPDATE OF status ON public.approved_commitments
    FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_advance_commitment_status();

CREATE OR REPLACE FUNCTION public.guard_supplier_payment_advance_outstanding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_outstanding numeric(14,2); v_status text;
BEGIN
    SELECT status INTO v_status FROM public.supplier_bills WHERE id=NEW.supplier_bill_id FOR UPDATE;
    IF NOT FOUND OR v_status<>'approved' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='supplier_payment_bill_not_approved'; END IF;
    SELECT outstanding_amount INTO v_outstanding FROM public.supplier_bill_payment_balances WHERE supplier_bill_id=NEW.supplier_bill_id;
    IF NEW.amount>COALESCE(v_outstanding,0) THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='supplier_payment_exceeds_outstanding'; END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER supplier_payment_advance_outstanding_guard
    BEFORE INSERT ON public.supplier_payments
    FOR EACH ROW EXECUTE FUNCTION public.guard_supplier_payment_advance_outstanding();

REVOKE ALL ON FUNCTION public.authorize_supplier_advance(uuid,numeric,text,uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.record_supplier_advance_payment(uuid,date,numeric,text,text,text,uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.refund_supplier_advance(uuid,date,numeric,text,text,uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.allocate_supplier_advance(uuid,uuid,numeric,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reverse_supplier_advance_payment(uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reverse_supplier_advance_allocation(uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_supplier_advance(uuid,numeric,text,uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_supplier_advance_payment(uuid,date,numeric,text,text,text,uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_supplier_advance(uuid,date,numeric,text,text,uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.allocate_supplier_advance(uuid,uuid,numeric,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_supplier_advance_payment(uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_supplier_advance_allocation(uuid,text,uuid,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.guard_supplier_advance_commitment_amendment() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_supplier_advance_commitment_status() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.guard_supplier_payment_advance_outstanding() FROM PUBLIC,anon,authenticated;

COMMENT ON FUNCTION public.authorize_supplier_advance(uuid,numeric,text,uuid,text,uuid,text,text) IS 'Service-role-only atomic authorization against open approved commitment capacity with linked evidence and replay safety.';
COMMENT ON FUNCTION public.record_supplier_advance_payment(uuid,date,numeric,text,text,text,uuid,text,uuid,text,text) IS 'Service-role-only atomic partial Supplier Advance payment with immutable bank snapshot, evidence and authorization ceiling.';
COMMENT ON FUNCTION public.allocate_supplier_advance(uuid,uuid,numeric,uuid,text,text) IS 'Service-role-only allocation to a matching approved Supplier Bill, serialized against bill payments and advance balance changes.';
COMMENT ON FUNCTION public.guard_supplier_payment_advance_outstanding() IS 'Prevents ordinary Supplier Payment inserts from exceeding payable less existing advance allocation.';

COMMIT;
