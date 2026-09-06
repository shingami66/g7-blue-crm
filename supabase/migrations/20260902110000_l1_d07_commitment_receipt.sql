-- L1-D07: Approved Commitment and Service Receipt / Acceptance.
--
-- Approved Commitment is an internally authorized supplier obligation. It is
-- distinct from Supplier Booking, Supplier Allocation, Supplier Quotation,
-- Vendor Bill, Accounts Payable, and payment. This migration preserves all
-- existing W4 records and adds only append-only authority/acceptance facts.
BEGIN;

DO $$
BEGIN
    IF to_regclass('public.services') IS NULL
        OR to_regclass('public.suppliers') IS NULL
        OR to_regclass('public.supplier_quotations') IS NULL
        OR to_regclass('public.business_documents') IS NULL
        OR to_regclass('public.business_document_links') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'L1-D07 preflight: required W4 foundation table missing';
    END IF;

    IF to_regclass('public.approved_commitments') IS NOT NULL
        OR to_regclass('public.approved_commitment_amendments') IS NOT NULL
        OR to_regclass('public.approved_commitment_documents') IS NOT NULL
        OR to_regclass('public.service_receipts') IS NOT NULL
        OR to_regclass('public.service_receipt_documents') IS NOT NULL
        OR to_regclass('public.service_receipt_corrections') IS NOT NULL
        OR to_regclass('public.approved_commitment_balances') IS NOT NULL
        OR to_regprocedure('public.create_approved_commitment(text,uuid,uuid,uuid,text,numeric,timestamptz,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.add_approved_commitment_amendment(uuid,text,numeric,text,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.transition_approved_commitment(uuid,text,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.create_service_receipt(uuid,uuid,date,text,numeric,numeric,text,numeric,text,text,text,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.review_service_receipt(uuid,text,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.correct_service_receipt(uuid,text,numeric,text,text,uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.attach_approved_commitment_documents(uuid,uuid[],uuid,text,text)') IS NOT NULL
        OR to_regprocedure('public.attach_service_receipt_documents(uuid,uuid[],uuid,text,text)') IS NOT NULL
    THEN
        RAISE EXCEPTION 'L1-D07 preflight: commitment/receipt model already exists';
    END IF;
END;
$$;

CREATE TABLE public.approved_commitments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    commitment_source text NOT NULL,
    supplier_quotation_id uuid,
    source_reference text,
    original_approved_amount numeric(14,2) NOT NULL,
    currency char(3) NOT NULL DEFAULT 'SAR',
    status text NOT NULL DEFAULT 'open',
    approved_at timestamptz NOT NULL,
    approved_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_by text NOT NULL,
    cancelled_at timestamptz,
    cancelled_by text,
    cancelled_reason text,
    closed_at timestamptz,
    closed_by text,
    closed_reason text,
    CONSTRAINT approved_commitments_source_check CHECK (
        commitment_source IN ('purchase_order', 'approved_contract', 'supplier_quotation', 'other_authorized')
    ),
    CONSTRAINT approved_commitments_source_consistency_check CHECK (
        (
            commitment_source = 'supplier_quotation'
            AND supplier_quotation_id IS NOT NULL
            AND source_reference IS NULL
        )
        OR (
            commitment_source <> 'supplier_quotation'
            AND supplier_quotation_id IS NULL
            AND NULLIF(btrim(source_reference), '') IS NOT NULL
        )
    ),
    CONSTRAINT approved_commitments_source_reference_check CHECK (
        source_reference IS NULL
        OR (
            char_length(btrim(source_reference)) BETWEEN 1 AND 2000
            AND source_reference = btrim(source_reference)
        )
    ),
    CONSTRAINT approved_commitments_amount_check CHECK (
        original_approved_amount BETWEEN 0 AND 999999999999.99
    ),
    CONSTRAINT approved_commitments_currency_check CHECK (currency = 'SAR'),
    CONSTRAINT approved_commitments_status_check CHECK (
        status IN ('open', 'closed', 'cancelled')
    ),
    CONSTRAINT approved_commitments_approval_actor_check CHECK (
        char_length(btrim(approved_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT approved_commitments_created_actor_check CHECK (
        char_length(btrim(created_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT approved_commitments_updated_actor_check CHECK (
        char_length(btrim(updated_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT approved_commitments_lifecycle_check CHECK (
        (
            status = 'open'
            AND cancelled_at IS NULL AND cancelled_by IS NULL AND cancelled_reason IS NULL
            AND closed_at IS NULL AND closed_by IS NULL AND closed_reason IS NULL
        )
        OR (
            status = 'cancelled'
            AND cancelled_at IS NOT NULL
            AND cancelled_by IS NOT NULL
            AND char_length(btrim(cancelled_by)) BETWEEN 1 AND 255
            AND cancelled_reason IS NOT NULL
            AND char_length(btrim(cancelled_reason)) BETWEEN 1 AND 2000
            AND closed_at IS NULL AND closed_by IS NULL AND closed_reason IS NULL
        )
        OR (
            status = 'closed'
            AND closed_at IS NOT NULL
            AND closed_by IS NOT NULL
            AND char_length(btrim(closed_by)) BETWEEN 1 AND 255
            AND closed_reason IS NOT NULL
            AND char_length(btrim(closed_reason)) BETWEEN 1 AND 2000
            AND cancelled_at IS NULL AND cancelled_by IS NULL AND cancelled_reason IS NULL
        )
    ),
    CONSTRAINT approved_commitments_id_service_supplier_key UNIQUE (id, service_id, supplier_id)
);

ALTER TABLE public.supplier_quotations
    ADD CONSTRAINT supplier_quotations_id_service_supplier_key UNIQUE (id, service_id, supplier_id);

ALTER TABLE public.approved_commitments
    ADD CONSTRAINT approved_commitments_supplier_quotation_fkey
    FOREIGN KEY (supplier_quotation_id, service_id, supplier_id)
    REFERENCES public.supplier_quotations(id, service_id, supplier_id)
    ON DELETE RESTRICT;

CREATE TABLE public.approved_commitment_amendments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    commitment_id uuid NOT NULL REFERENCES public.approved_commitments(id) ON DELETE RESTRICT,
    amendment_number integer NOT NULL,
    amendment_type text NOT NULL,
    amount_delta numeric(14,2) NOT NULL,
    approved_amount_after numeric(14,2) NOT NULL,
    reason text NOT NULL,
    evidence_ref text NOT NULL,
    approved_at timestamptz NOT NULL,
    approved_by text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    CONSTRAINT approved_commitment_amendments_number_check CHECK (amendment_number > 0),
    CONSTRAINT approved_commitment_amendments_type_check CHECK (
        amendment_type IN ('increase', 'reduction')
    ),
    CONSTRAINT approved_commitment_amendments_delta_check CHECK (
        (amendment_type = 'increase' AND amount_delta > 0)
        OR (amendment_type = 'reduction' AND amount_delta < 0)
    ),
    CONSTRAINT approved_commitment_amendments_amount_check CHECK (
        approved_amount_after BETWEEN 0 AND 999999999999.99
    ),
    CONSTRAINT approved_commitment_amendments_reason_check CHECK (
        char_length(btrim(reason)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT approved_commitment_amendments_evidence_check CHECK (
        char_length(btrim(evidence_ref)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT approved_commitment_amendments_approved_by_check CHECK (
        char_length(btrim(approved_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT approved_commitment_amendments_created_by_check CHECK (
        char_length(btrim(created_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT approved_commitment_amendments_lineage_key UNIQUE (commitment_id, amendment_number)
);

CREATE TABLE public.service_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    commitment_id uuid NOT NULL,
    acceptance_status text NOT NULL DEFAULT 'PENDING',
    performance_date date NOT NULL,
    delivered_scope text NOT NULL,
    actual_quantity numeric(14,3),
    actual_hours numeric(14,3),
    quantity_unit text,
    received_amount numeric(14,2),
    missing_scope text,
    extra_scope text,
    defects_incidents text,
    conditions_notes text,
    submitted_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    submitted_by text NOT NULL,
    reviewed_at timestamptz,
    reviewed_by text,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_by text NOT NULL,
    CONSTRAINT service_receipts_commitment_fkey
        FOREIGN KEY (commitment_id, service_id, supplier_id)
        REFERENCES public.approved_commitments(id, service_id, supplier_id)
        ON DELETE RESTRICT,
    CONSTRAINT service_receipts_status_check CHECK (
        acceptance_status IN ('PENDING', 'ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED')
    ),
    CONSTRAINT service_receipts_scope_check CHECK (
        char_length(btrim(delivered_scope)) BETWEEN 1 AND 4000
    ),
    CONSTRAINT service_receipts_quantity_check CHECK (
        actual_quantity IS NULL OR (actual_quantity >= 0 AND actual_quantity <= 999999999999.999)
    ),
    CONSTRAINT service_receipts_hours_check CHECK (
        actual_hours IS NULL OR (actual_hours >= 0 AND actual_hours <= 999999999999.999)
    ),
    CONSTRAINT service_receipts_unit_check CHECK (
        quantity_unit IS NULL OR char_length(btrim(quantity_unit)) BETWEEN 1 AND 100
    ),
    CONSTRAINT service_receipts_amount_check CHECK (
        received_amount IS NULL OR received_amount BETWEEN 0 AND 999999999999.99
    ),
    CONSTRAINT service_receipts_notes_check CHECK (
        (missing_scope IS NULL OR char_length(missing_scope) <= 4000)
        AND (extra_scope IS NULL OR char_length(extra_scope) <= 4000)
        AND (defects_incidents IS NULL OR char_length(defects_incidents) <= 4000)
        AND (conditions_notes IS NULL OR char_length(conditions_notes) <= 4000)
    ),
    CONSTRAINT service_receipts_submitted_by_check CHECK (
        char_length(btrim(submitted_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT service_receipts_created_by_check CHECK (
        char_length(btrim(created_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT service_receipts_updated_by_check CHECK (
        char_length(btrim(updated_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT service_receipts_review_check CHECK (
        (
            acceptance_status = 'PENDING'
            AND reviewed_at IS NULL
            AND reviewed_by IS NULL
        )
        OR (
            acceptance_status <> 'PENDING'
            AND reviewed_at IS NOT NULL
            AND reviewed_by IS NOT NULL
            AND char_length(btrim(reviewed_by)) BETWEEN 1 AND 255
        )
    ),
    CONSTRAINT service_receipts_condition_check CHECK (
        acceptance_status <> 'ACCEPTED_WITH_CONDITIONS'
        OR NULLIF(btrim(conditions_notes), '') IS NOT NULL
    ),
    CONSTRAINT service_receipts_id_service_supplier_commitment_key UNIQUE (id, service_id, supplier_id, commitment_id)
);

CREATE TABLE public.approved_commitment_documents (
    commitment_id uuid NOT NULL REFERENCES public.approved_commitments(id) ON DELETE RESTRICT,
    document_id uuid NOT NULL REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    attached_by text NOT NULL,
    attached_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    PRIMARY KEY (commitment_id, document_id),
    CONSTRAINT approved_commitment_documents_attached_by_check CHECK (
        char_length(btrim(attached_by)) BETWEEN 1 AND 255
    )
);

CREATE TABLE public.service_receipt_documents (
    receipt_id uuid NOT NULL REFERENCES public.service_receipts(id) ON DELETE RESTRICT,
    document_id uuid NOT NULL REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    attached_by text NOT NULL,
    attached_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    PRIMARY KEY (receipt_id, document_id),
    CONSTRAINT service_receipt_documents_attached_by_check CHECK (
        char_length(btrim(attached_by)) BETWEEN 1 AND 255
    )
);

CREATE TABLE public.service_receipt_corrections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id uuid NOT NULL REFERENCES public.service_receipts(id) ON DELETE RESTRICT,
    correction_number integer NOT NULL,
    prior_acceptance_status text NOT NULL,
    prior_received_amount numeric(14,2),
    prior_conditions_notes text,
    prior_decision_at timestamptz NOT NULL,
    prior_decision_by text NOT NULL,
    corrected_acceptance_status text NOT NULL,
    corrected_received_amount numeric(14,2),
    corrected_conditions_notes text,
    correction_reason text NOT NULL,
    corrected_at timestamptz NOT NULL,
    corrected_by text NOT NULL,
    request_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    created_by text NOT NULL,
    CONSTRAINT service_receipt_corrections_number_check CHECK (correction_number > 0),
    CONSTRAINT service_receipt_corrections_prior_status_check CHECK (
        prior_acceptance_status IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED')
    ),
    CONSTRAINT service_receipt_corrections_corrected_status_check CHECK (
        corrected_acceptance_status IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED')
    ),
    CONSTRAINT service_receipt_corrections_prior_amount_check CHECK (
        prior_received_amount IS NULL OR prior_received_amount BETWEEN 0 AND 999999999999.99
    ),
    CONSTRAINT service_receipt_corrections_corrected_amount_check CHECK (
        corrected_received_amount IS NULL OR corrected_received_amount BETWEEN 0 AND 999999999999.99
    ),
    CONSTRAINT service_receipt_corrections_notes_check CHECK (
        (prior_conditions_notes IS NULL OR char_length(prior_conditions_notes) <= 4000)
        AND (corrected_conditions_notes IS NULL OR char_length(corrected_conditions_notes) <= 4000)
    ),
    CONSTRAINT service_receipt_corrections_condition_check CHECK (
        corrected_acceptance_status <> 'ACCEPTED_WITH_CONDITIONS'
        OR NULLIF(btrim(corrected_conditions_notes), '') IS NOT NULL
    ),
    CONSTRAINT service_receipt_corrections_prior_actor_check CHECK (
        char_length(btrim(prior_decision_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT service_receipt_corrections_reason_check CHECK (
        char_length(btrim(correction_reason)) BETWEEN 1 AND 2000
    ),
    CONSTRAINT service_receipt_corrections_actor_check CHECK (
        char_length(btrim(corrected_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT service_receipt_corrections_created_by_check CHECK (
        char_length(btrim(created_by)) BETWEEN 1 AND 255
    ),
    CONSTRAINT service_receipt_corrections_lineage_key UNIQUE (receipt_id, correction_number),
    CONSTRAINT service_receipt_corrections_request_key UNIQUE (request_id)
);

CREATE INDEX approved_commitments_service_status_idx
    ON public.approved_commitments(service_id, status, approved_at DESC, id DESC);
CREATE INDEX approved_commitments_supplier_status_idx
    ON public.approved_commitments(supplier_id, status, approved_at DESC, id DESC);
CREATE INDEX approved_commitments_source_quotation_idx
    ON public.approved_commitments(supplier_quotation_id);
CREATE INDEX approved_commitment_amendments_commitment_idx
    ON public.approved_commitment_amendments(commitment_id, amendment_number);
CREATE INDEX service_receipts_commitment_date_idx
    ON public.service_receipts(commitment_id, performance_date DESC, id DESC);
CREATE INDEX service_receipts_service_date_idx
    ON public.service_receipts(service_id, performance_date DESC, id DESC);
CREATE INDEX approved_commitment_documents_commitment_idx
    ON public.approved_commitment_documents(commitment_id, attached_at DESC, document_id DESC);
CREATE INDEX service_receipt_documents_receipt_idx
    ON public.service_receipt_documents(receipt_id, attached_at DESC, document_id DESC);
CREATE INDEX service_receipt_corrections_receipt_idx
    ON public.service_receipt_corrections(receipt_id, correction_number);

CREATE VIEW public.approved_commitment_balances AS
SELECT
    c.id,
    c.service_id,
    c.supplier_id,
    c.commitment_source,
    c.supplier_quotation_id,
    c.source_reference,
    c.original_approved_amount,
    c.currency,
    c.status,
    c.approved_at,
    c.approved_by,
    c.created_at,
    c.created_by,
    c.updated_at,
    c.updated_by,
    c.cancelled_at,
    c.cancelled_by,
    c.cancelled_reason,
    c.closed_at,
    c.closed_by,
    c.closed_reason,
    c.original_approved_amount + COALESCE(a.total_delta, 0)::numeric AS authorized_amount,
    COALESCE(r.accepted_amount, 0)::numeric AS accepted_amount,
    COALESCE(r.pending_amount, 0)::numeric AS pending_amount,
    CASE
        WHEN c.status = 'open' THEN
            c.original_approved_amount
            + COALESCE(a.total_delta, 0)::numeric
            - COALESCE(r.accepted_amount, 0)::numeric
            - COALESCE(r.pending_amount, 0)::numeric
        ELSE 0::numeric
    END AS open_commitment_amount,
    COALESCE(a.amendment_count, 0)::integer AS amendment_count,
    COALESCE(r.receipt_count, 0)::integer AS receipt_count
FROM public.approved_commitments c
LEFT JOIN (
    SELECT
        commitment_id,
        SUM(amount_delta) AS total_delta,
        COUNT(*)::integer AS amendment_count
    FROM public.approved_commitment_amendments
    GROUP BY commitment_id
) a ON a.commitment_id = c.id
LEFT JOIN (
    SELECT
        commitment_id,
        SUM(CASE WHEN acceptance_status IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS') THEN COALESCE(received_amount, 0) ELSE 0 END) AS accepted_amount,
        SUM(CASE WHEN acceptance_status = 'PENDING' THEN COALESCE(received_amount, 0) ELSE 0 END) AS pending_amount,
        COUNT(*)::integer AS receipt_count
    FROM public.service_receipts
    GROUP BY commitment_id
) r ON r.commitment_id = c.id;

COMMENT ON TABLE public.approved_commitments IS
    'Internally approved supplier obligation. Distinct from Supplier Booking, Supplier Allocation, Supplier Quotation, Vendor Bill, Accounts Payable, and payment.';
COMMENT ON COLUMN public.approved_commitments.original_approved_amount IS
    'Original internally approved obligation amount; never rewritten by an amendment or cancellation.';
COMMENT ON TABLE public.approved_commitment_amendments IS
    'Append-only approved increases or reductions. Prior commitment authority remains in the lineage.';
COMMENT ON TABLE public.service_receipts IS
    'Service delivery and acceptance evidence. It is not a supplier invoice, payable, actual-cost posting, or payment record.';
COMMENT ON TABLE public.service_receipt_corrections IS
    'Append-only, explicitly authorized corrections to a reviewed Service Receipt. The original reviewed fact remains in the receipt history and audit log.';
COMMENT ON COLUMN public.service_receipts.received_amount IS
    'Optional commitment value reserved/consumed by this delivery evidence; it is not an invoice or actual-cost amount.';
COMMENT ON VIEW public.approved_commitment_balances IS
    'Service-role-only derived commitment balance. Pending receipts reserve value; rejected receipts do not consume value.';
COMMENT ON TABLE public.approved_commitment_documents IS
    'Document relations for private approved-commitment evidence; Storage bytes are not copied.';
COMMENT ON TABLE public.service_receipt_documents IS
    'Document relations for private Service Receipt evidence; Storage bytes are not copied.';

ALTER TABLE public.approved_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_commitment_amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_commitment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_receipt_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_receipt_corrections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.approved_commitments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.approved_commitment_amendments FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.approved_commitment_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.service_receipts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.service_receipt_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.service_receipt_corrections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.approved_commitment_balances FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.approved_commitments FROM service_role;
REVOKE ALL ON TABLE public.approved_commitment_amendments FROM service_role;
REVOKE ALL ON TABLE public.approved_commitment_documents FROM service_role;
REVOKE ALL ON TABLE public.service_receipts FROM service_role;
REVOKE ALL ON TABLE public.service_receipt_documents FROM service_role;
REVOKE ALL ON TABLE public.service_receipt_corrections FROM service_role;
GRANT SELECT ON TABLE public.approved_commitments TO service_role;
GRANT SELECT ON TABLE public.approved_commitment_amendments TO service_role;
GRANT SELECT ON TABLE public.approved_commitment_documents TO service_role;
GRANT SELECT ON TABLE public.service_receipts TO service_role;
GRANT SELECT ON TABLE public.service_receipt_documents TO service_role;
GRANT SELECT ON TABLE public.service_receipt_corrections TO service_role;
GRANT SELECT ON TABLE public.approved_commitment_balances TO service_role;

CREATE OR REPLACE FUNCTION public.create_approved_commitment(
    p_commitment_source text,
    p_service_id uuid,
    p_supplier_id uuid,
    p_supplier_quotation_id uuid,
    p_source_reference text,
    p_original_approved_amount numeric,
    p_approved_at timestamptz,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    commitment_id uuid,
    service_id uuid,
    supplier_id uuid,
    authorized_amount numeric,
    open_commitment_amount numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_source_reference text := NULLIF(btrim(p_source_reference), '');
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_commitment_id uuid;
    v_commitment_id uuid;
    v_service_id uuid;
    v_supplier_id uuid;
    v_authorized_amount numeric;
    v_open_commitment_amount numeric;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'approved_commitment_request_invalid', NULL::uuid, p_service_id, p_supplier_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'approved_commitment_permission_denied', NULL::uuid, p_service_id, p_supplier_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_commitment_source IS NULL
        OR p_commitment_source NOT IN ('purchase_order', 'approved_contract', 'supplier_quotation', 'other_authorized')
        OR p_service_id IS NULL
        OR p_supplier_id IS NULL
        OR p_original_approved_amount IS NULL
        OR p_original_approved_amount < 0
        OR p_original_approved_amount > 999999999999.99
        OR p_approved_at IS NULL
    THEN
        RETURN QUERY SELECT 'approved_commitment_fields_invalid', NULL::uuid, p_service_id, p_supplier_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_commitment_source = 'supplier_quotation'
        AND (p_supplier_quotation_id IS NULL OR v_source_reference IS NOT NULL)
    THEN
        RETURN QUERY SELECT 'approved_commitment_source_invalid', NULL::uuid, p_service_id, p_supplier_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_commitment_source <> 'supplier_quotation'
        AND (p_supplier_quotation_id IS NOT NULL OR v_source_reference IS NULL)
    THEN
        RETURN QUERY SELECT 'approved_commitment_source_invalid', NULL::uuid, p_service_id, p_supplier_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF v_source_reference IS NOT NULL AND char_length(v_source_reference) > 2000 THEN
        RETURN QUERY SELECT 'approved_commitment_source_invalid', NULL::uuid, p_service_id, p_supplier_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'commitment_source', p_commitment_source,
        'service_id', p_service_id,
        'supplier_id', p_supplier_id,
        'supplier_quotation_id', p_supplier_quotation_id,
        'source_reference', v_source_reference,
        'original_approved_amount', p_original_approved_amount,
        'approved_at', p_approved_at
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-commitment:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_commitment_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'approved_commitment'
      AND a.details ->> 'operation' = 'approved_commitment_create'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'approved_commitment_request_conflict', v_existing_commitment_id, p_service_id, p_supplier_id, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;

        SELECT b.service_id, b.supplier_id, b.authorized_amount, b.open_commitment_amount
        INTO v_service_id, v_supplier_id, v_authorized_amount, v_open_commitment_amount
        FROM public.approved_commitment_balances b
        WHERE b.id = v_existing_commitment_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'approved_commitment_unavailable', v_existing_commitment_id, NULL::uuid, NULL::uuid, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, v_existing_commitment_id, v_service_id, v_supplier_id,
            v_authorized_amount,
            v_open_commitment_amount,
            true;
        RETURN;
    END IF;

    PERFORM s.id
    FROM public.services s
    WHERE s.id = p_service_id
      AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled')
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'approved_commitment_service_unavailable', NULL::uuid, p_service_id, p_supplier_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    PERFORM sp.id
    FROM public.suppliers sp
    WHERE sp.id = p_supplier_id
      AND sp.status = 'active'
      AND COALESCE(sp.is_deleted, false) = false
      AND sp.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'approved_commitment_supplier_unavailable', NULL::uuid, p_service_id, p_supplier_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_commitment_source = 'supplier_quotation'
        AND NOT EXISTS (
            SELECT 1
            FROM public.supplier_quotations q
            WHERE q.id = p_supplier_quotation_id
              AND q.service_id = p_service_id
              AND q.supplier_id = p_supplier_id
        )
    THEN
        RETURN QUERY SELECT 'approved_commitment_supplier_quotation_unavailable', NULL::uuid, p_service_id, p_supplier_id, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    INSERT INTO public.approved_commitments(
        service_id, supplier_id, commitment_source, supplier_quotation_id,
        source_reference, original_approved_amount, currency, status,
        approved_at, approved_by, created_at, created_by, updated_at, updated_by
    ) VALUES (
        p_service_id, p_supplier_id, p_commitment_source, p_supplier_quotation_id,
        v_source_reference, p_original_approved_amount, 'SAR', 'open',
        p_approved_at, p_actor_id, v_now, p_actor_id, v_now, p_actor_id
    )
    RETURNING id INTO v_commitment_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create',
        'approved_commitment',
        v_commitment_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'approved_commitment_created',
            'operation', 'approved_commitment_create',
            'w4_version', 'l1-d07-v1',
            'request_id', p_request_id::text,
            'service_id', p_service_id,
            'supplier_id', p_supplier_id,
            'commitment_id', v_commitment_id,
            'actor_role', p_actor_role,
            'from', NULL,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_commitment_id, p_service_id, p_supplier_id,
        p_original_approved_amount, p_original_approved_amount, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_approved_commitment_amendment(
    p_commitment_id uuid,
    p_amendment_type text,
    p_amount numeric,
    p_reason text,
    p_evidence_ref text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    commitment_id uuid,
    service_id uuid,
    amendment_id uuid,
    amendment_number integer,
    authorized_amount numeric,
    open_commitment_amount numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_reason text := NULLIF(btrim(p_reason), '');
    v_evidence_ref text := NULLIF(btrim(p_evidence_ref), '');
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_amendment_id uuid;
    v_amendment_id uuid;
    v_amendment_number integer;
    v_status text;
    v_original_amount numeric;
    v_service_id uuid;
    v_authorized_amount numeric;
    v_reserved_amount numeric;
    v_delta numeric;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'approved_commitment_request_invalid', p_commitment_id, NULL::uuid, NULL::uuid, 0, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'approved_commitment_permission_denied', p_commitment_id, NULL::uuid, NULL::uuid, 0, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_commitment_id IS NULL
        OR p_amendment_type NOT IN ('increase', 'reduction')
        OR p_amount IS NULL
        OR p_amount <= 0
        OR p_amount > 999999999999.99
        OR v_reason IS NULL
        OR char_length(v_reason) > 2000
        OR v_evidence_ref IS NULL
        OR char_length(v_evidence_ref) > 2000
    THEN
        RETURN QUERY SELECT 'approved_commitment_amendment_invalid', p_commitment_id, NULL::uuid, NULL::uuid, 0, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    v_delta := CASE WHEN p_amendment_type = 'increase' THEN p_amount ELSE -p_amount END;
    v_payload := jsonb_build_object(
        'commitment_id', p_commitment_id,
        'amendment_type', p_amendment_type,
        'amount', p_amount,
        'reason', v_reason,
        'evidence_ref', v_evidence_ref
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-amendment:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_amendment_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'approved_commitment_amendment'
      AND a.details ->> 'operation' = 'approved_commitment_amendment_create'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'approved_commitment_request_conflict', p_commitment_id, NULL::uuid, v_existing_amendment_id, 0, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;

        SELECT a.commitment_id, b.service_id, a.amendment_number, b.authorized_amount, b.open_commitment_amount
        INTO p_commitment_id, v_service_id, v_amendment_number, v_authorized_amount, v_reserved_amount
        FROM public.approved_commitment_amendments a
        JOIN public.approved_commitment_balances b ON b.id = a.commitment_id
        WHERE a.id = v_existing_amendment_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'approved_commitment_unavailable', p_commitment_id, NULL::uuid, v_existing_amendment_id, 0, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, p_commitment_id, v_service_id, v_existing_amendment_id, v_amendment_number,
            v_authorized_amount, v_reserved_amount, true;
        RETURN;
    END IF;

    SELECT c.service_id, c.status, c.original_approved_amount
    INTO v_service_id, v_status, v_original_amount
    FROM public.approved_commitments c
    WHERE c.id = p_commitment_id
    FOR UPDATE;

    IF NOT FOUND OR v_status <> 'open' THEN
        RETURN QUERY SELECT 'approved_commitment_not_open', p_commitment_id, NULL::uuid, NULL::uuid, 0, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT
        v_original_amount + COALESCE((SELECT SUM(a.amount_delta) FROM public.approved_commitment_amendments a WHERE a.commitment_id = p_commitment_id), 0),
        COALESCE((SELECT SUM(CASE WHEN r.acceptance_status <> 'REJECTED' THEN COALESCE(r.received_amount, 0) ELSE 0 END) FROM public.service_receipts r WHERE r.commitment_id = p_commitment_id), 0)
    INTO v_authorized_amount, v_reserved_amount;

    IF p_amendment_type = 'reduction' AND p_amount > v_authorized_amount - v_reserved_amount THEN
        RETURN QUERY SELECT 'approved_commitment_reduction_exceeds_open', p_commitment_id, NULL::uuid, NULL::uuid, 0, v_authorized_amount, v_authorized_amount - v_reserved_amount, false;
        RETURN;
    END IF;

    SELECT COALESCE(MAX(a.amendment_number), 0) + 1
    INTO v_amendment_number
    FROM public.approved_commitment_amendments a
    WHERE a.commitment_id = p_commitment_id;

    INSERT INTO public.approved_commitment_amendments(
        commitment_id, amendment_number, amendment_type, amount_delta,
        approved_amount_after, reason, evidence_ref, approved_at,
        approved_by, created_at, created_by
    ) VALUES (
        p_commitment_id, v_amendment_number, p_amendment_type, v_delta,
        v_authorized_amount + v_delta, v_reason, v_evidence_ref, v_now,
        p_actor_id, v_now, p_actor_id
    )
    RETURNING id INTO v_amendment_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create',
        'approved_commitment_amendment',
        v_amendment_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'approved_commitment_amendment_created',
            'operation', 'approved_commitment_amendment_create',
            'w4_version', 'l1-d07-v1',
            'request_id', p_request_id::text,
            'commitment_id', p_commitment_id,
            'amendment_id', v_amendment_id,
            'actor_role', p_actor_role,
            'from', jsonb_build_object('authorized_amount', v_authorized_amount),
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_commitment_id, v_service_id, v_amendment_id, v_amendment_number,
        v_authorized_amount + v_delta, v_authorized_amount + v_delta - v_reserved_amount, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_approved_commitment(
    p_commitment_id uuid,
    p_action text,
    p_reason text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    commitment_id uuid,
    service_id uuid,
    commitment_status text,
    authorized_amount numeric,
    open_commitment_amount numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_reason text := NULLIF(btrim(p_reason), '');
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_commitment_id uuid;
    v_service_id uuid;
    v_status text;
    v_original_amount numeric;
    v_authorized_amount numeric;
    v_reserved_amount numeric;
    v_pending_count integer;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'approved_commitment_request_invalid', p_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'approved_commitment_permission_denied', p_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_commitment_id IS NULL
        OR p_action NOT IN ('close', 'cancel')
        OR v_reason IS NULL
        OR char_length(v_reason) > 2000
    THEN
        RETURN QUERY SELECT 'approved_commitment_transition_invalid', p_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'commitment_id', p_commitment_id,
        'action', p_action,
        'reason', v_reason
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-commitment-transition:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_commitment_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'approved_commitment'
      AND a.details ->> 'operation' = 'approved_commitment_transition'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'approved_commitment_request_conflict', v_existing_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;

        SELECT b.service_id, b.status, b.authorized_amount, b.open_commitment_amount
        INTO v_service_id, v_status, v_authorized_amount, v_reserved_amount
        FROM public.approved_commitment_balances b
        WHERE b.id = v_existing_commitment_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'approved_commitment_unavailable', v_existing_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, v_existing_commitment_id, v_service_id, v_status, v_authorized_amount, v_reserved_amount, true;
        RETURN;
    END IF;

    SELECT c.service_id, c.status, c.original_approved_amount
    INTO v_service_id, v_status, v_original_amount
    FROM public.approved_commitments c
    WHERE c.id = p_commitment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'approved_commitment_not_found', p_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF v_status <> 'open' THEN
        RETURN QUERY SELECT 'approved_commitment_already_closed', p_commitment_id, v_service_id, v_status, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT COUNT(*)::integer
    INTO v_pending_count
    FROM public.service_receipts r
    WHERE r.commitment_id = p_commitment_id
      AND r.acceptance_status = 'PENDING';

    IF v_pending_count > 0 THEN
        RETURN QUERY SELECT 'approved_commitment_pending_receipts', p_commitment_id, v_service_id, v_status, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT
        v_original_amount + COALESCE((SELECT SUM(a.amount_delta) FROM public.approved_commitment_amendments a WHERE a.commitment_id = p_commitment_id), 0),
        COALESCE((SELECT SUM(CASE WHEN r.acceptance_status IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS') THEN COALESCE(r.received_amount, 0) ELSE 0 END) FROM public.service_receipts r WHERE r.commitment_id = p_commitment_id), 0)
    INTO v_authorized_amount, v_reserved_amount;

    IF p_action = 'close' AND v_authorized_amount - v_reserved_amount <> 0 THEN
        RETURN QUERY SELECT 'approved_commitment_open_amount_remaining', p_commitment_id, v_service_id, v_status, v_authorized_amount, v_authorized_amount - v_reserved_amount, false;
        RETURN;
    END IF;

    IF p_action = 'cancel' THEN
        UPDATE public.approved_commitments c
        SET status = 'cancelled',
            cancelled_at = v_now,
            cancelled_by = p_actor_id,
            cancelled_reason = v_reason,
            updated_at = v_now,
            updated_by = p_actor_id
        WHERE c.id = p_commitment_id;
        v_status := 'cancelled';
    ELSE
        UPDATE public.approved_commitments c
        SET status = 'closed',
            closed_at = v_now,
            closed_by = p_actor_id,
            closed_reason = v_reason,
            updated_at = v_now,
            updated_by = p_actor_id
        WHERE c.id = p_commitment_id;
        v_status := 'closed';
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'approved_commitment',
        p_commitment_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', CASE WHEN p_action = 'cancel' THEN 'approved_commitment_cancelled' ELSE 'approved_commitment_closed' END,
            'operation', 'approved_commitment_transition',
            'w4_version', 'l1-d07-v1',
            'request_id', p_request_id::text,
            'commitment_id', p_commitment_id,
            'actor_role', p_actor_role,
            'from', jsonb_build_object('status', 'open', 'authorized_amount', v_authorized_amount, 'open_commitment_amount', v_authorized_amount - v_reserved_amount),
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_commitment_id, v_service_id, v_status, v_authorized_amount, 0::numeric, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_service_receipt(
    p_service_id uuid,
    p_commitment_id uuid,
    p_performance_date date,
    p_delivered_scope text,
    p_actual_quantity numeric,
    p_actual_hours numeric,
    p_quantity_unit text,
    p_received_amount numeric,
    p_missing_scope text,
    p_extra_scope text,
    p_defects_incidents text,
    p_conditions_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    receipt_id uuid,
    service_id uuid,
    supplier_id uuid,
    commitment_id uuid,
    acceptance_status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_delivered_scope text := NULLIF(btrim(p_delivered_scope), '');
    v_quantity_unit text := NULLIF(btrim(p_quantity_unit), '');
    v_missing_scope text := NULLIF(btrim(p_missing_scope), '');
    v_extra_scope text := NULLIF(btrim(p_extra_scope), '');
    v_defects_incidents text := NULLIF(btrim(p_defects_incidents), '');
    v_conditions_notes text := NULLIF(btrim(p_conditions_notes), '');
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_receipt_id uuid;
    v_receipt_id uuid;
    v_supplier_id uuid;
    v_status text;
    v_original_amount numeric;
    v_authorized_amount numeric;
    v_reserved_amount numeric;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'service_receipt_request_invalid', NULL::uuid, p_service_id, NULL::uuid, p_commitment_id, 'PENDING', false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager', 'operations') THEN
        RETURN QUERY SELECT 'service_receipt_permission_denied', NULL::uuid, p_service_id, NULL::uuid, p_commitment_id, 'PENDING', false;
        RETURN;
    END IF;

    IF p_service_id IS NULL
        OR p_commitment_id IS NULL
        OR p_performance_date IS NULL
        OR v_delivered_scope IS NULL
        OR char_length(v_delivered_scope) > 4000
        OR p_actual_quantity IS NOT NULL AND (p_actual_quantity < 0 OR p_actual_quantity > 999999999999.999)
        OR p_actual_hours IS NOT NULL AND (p_actual_hours < 0 OR p_actual_hours > 999999999999.999)
        OR p_received_amount IS NOT NULL AND (p_received_amount < 0 OR p_received_amount > 999999999999.99)
    THEN
        RETURN QUERY SELECT 'service_receipt_fields_invalid', NULL::uuid, p_service_id, NULL::uuid, p_commitment_id, 'PENDING', false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'service_id', p_service_id,
        'commitment_id', p_commitment_id,
        'performance_date', p_performance_date,
        'delivered_scope', v_delivered_scope,
        'actual_quantity', p_actual_quantity,
        'actual_hours', p_actual_hours,
        'quantity_unit', v_quantity_unit,
        'received_amount', p_received_amount,
        'missing_scope', v_missing_scope,
        'extra_scope', v_extra_scope,
        'defects_incidents', v_defects_incidents,
        'conditions_notes', v_conditions_notes
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-receipt:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_receipt_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'service_receipt'
      AND a.details ->> 'operation' = 'service_receipt_create'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'service_receipt_request_conflict', v_existing_receipt_id, p_service_id, NULL::uuid, p_commitment_id, NULL::text, false;
            RETURN;
        END IF;

        SELECT r.service_id, r.supplier_id, r.commitment_id, r.acceptance_status
        INTO p_service_id, v_supplier_id, p_commitment_id, v_status
        FROM public.service_receipts r
        WHERE r.id = v_existing_receipt_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'service_receipt_unavailable', v_existing_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, v_existing_receipt_id, p_service_id, v_supplier_id, p_commitment_id, v_status, true;
        RETURN;
    END IF;

    SELECT c.supplier_id, c.status, c.original_approved_amount
    INTO v_supplier_id, v_status, v_original_amount
    FROM public.approved_commitments c
    JOIN public.services s ON s.id = c.service_id
    WHERE c.id = p_commitment_id
      AND c.service_id = p_service_id
      AND s.deleted_at IS NULL
      AND s.status <> 'Cancelled'
    FOR UPDATE OF c, s;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_receipt_commitment_unavailable', NULL::uuid, p_service_id, NULL::uuid, p_commitment_id, 'PENDING', false;
        RETURN;
    END IF;

    IF v_status <> 'open' THEN
        RETURN QUERY SELECT 'service_receipt_commitment_not_open', NULL::uuid, p_service_id, v_supplier_id, p_commitment_id, 'PENDING', false;
        RETURN;
    END IF;

    SELECT
        v_original_amount + COALESCE((SELECT SUM(a.amount_delta) FROM public.approved_commitment_amendments a WHERE a.commitment_id = p_commitment_id), 0),
        COALESCE((SELECT SUM(CASE WHEN r.acceptance_status <> 'REJECTED' THEN COALESCE(r.received_amount, 0) ELSE 0 END) FROM public.service_receipts r WHERE r.commitment_id = p_commitment_id), 0)
    INTO v_authorized_amount, v_reserved_amount;

    IF p_received_amount IS NOT NULL AND v_reserved_amount + p_received_amount > v_authorized_amount THEN
        RETURN QUERY SELECT 'service_receipt_value_exceeds_open', NULL::uuid, p_service_id, v_supplier_id, p_commitment_id, 'PENDING', false;
        RETURN;
    END IF;

    INSERT INTO public.service_receipts(
        service_id, supplier_id, commitment_id, acceptance_status,
        performance_date, delivered_scope, actual_quantity, actual_hours,
        quantity_unit, received_amount, missing_scope, extra_scope,
        defects_incidents, conditions_notes, submitted_at, submitted_by,
        created_at, created_by, updated_at, updated_by
    ) VALUES (
        p_service_id, v_supplier_id, p_commitment_id, 'PENDING',
        p_performance_date, v_delivered_scope, p_actual_quantity, p_actual_hours,
        v_quantity_unit, p_received_amount, v_missing_scope, v_extra_scope,
        v_defects_incidents, v_conditions_notes, v_now, p_actor_id,
        v_now, p_actor_id, v_now, p_actor_id
    )
    RETURNING id INTO v_receipt_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create',
        'service_receipt',
        v_receipt_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'service_receipt_created',
            'operation', 'service_receipt_create',
            'w4_version', 'l1-d07-v1',
            'request_id', p_request_id::text,
            'service_id', p_service_id,
            'supplier_id', v_supplier_id,
            'commitment_id', p_commitment_id,
            'receipt_id', v_receipt_id,
            'actor_role', p_actor_role,
            'from', NULL,
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_receipt_id, p_service_id, v_supplier_id, p_commitment_id, 'PENDING', false;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_service_receipt(
    p_receipt_id uuid,
    p_acceptance_status text,
    p_conditions_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    receipt_id uuid,
    service_id uuid,
    supplier_id uuid,
    commitment_id uuid,
    acceptance_status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_conditions_notes text := NULLIF(btrim(p_conditions_notes), '');
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_receipt_id uuid;
    v_service_id uuid;
    v_supplier_id uuid;
    v_commitment_id uuid;
    v_current_status text;
    v_commitment_status text;
    v_original_amount numeric;
    v_authorized_amount numeric;
    v_reserved_amount numeric;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'service_receipt_request_invalid', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'service_receipt_accept_permission_denied', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF p_receipt_id IS NULL
        OR p_acceptance_status NOT IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED')
        OR p_acceptance_status = 'ACCEPTED_WITH_CONDITIONS' AND v_conditions_notes IS NULL
        OR v_conditions_notes IS NOT NULL AND char_length(v_conditions_notes) > 4000
    THEN
        RETURN QUERY SELECT 'service_receipt_review_invalid', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'receipt_id', p_receipt_id,
        'acceptance_status', p_acceptance_status,
        'conditions_notes', v_conditions_notes
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-receipt-review:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_receipt_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'service_receipt'
      AND a.details ->> 'operation' = 'service_receipt_review'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'service_receipt_request_conflict', v_existing_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
            RETURN;
        END IF;

        SELECT r.service_id, r.supplier_id, r.commitment_id, r.acceptance_status
        INTO v_service_id, v_supplier_id, v_commitment_id, v_current_status
        FROM public.service_receipts r
        WHERE r.id = v_existing_receipt_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'service_receipt_unavailable', v_existing_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, v_existing_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, true;
        RETURN;
    END IF;

    SELECT r.service_id, r.supplier_id, r.commitment_id, r.acceptance_status,
           c.status, c.original_approved_amount
    INTO v_service_id, v_supplier_id, v_commitment_id, v_current_status,
         v_commitment_status, v_original_amount
    FROM public.service_receipts r
    JOIN public.approved_commitments c ON c.id = r.commitment_id
    WHERE r.id = p_receipt_id
    FOR UPDATE OF r, c;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_receipt_not_found', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF v_current_status <> 'PENDING' THEN
        RETURN QUERY SELECT 'service_receipt_already_reviewed', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, false;
        RETURN;
    END IF;

    IF p_acceptance_status <> 'REJECTED' AND v_commitment_status <> 'open' THEN
        RETURN QUERY SELECT 'service_receipt_commitment_not_open', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, false;
        RETURN;
    END IF;

    SELECT
        v_original_amount + COALESCE((SELECT SUM(a.amount_delta) FROM public.approved_commitment_amendments a WHERE a.commitment_id = v_commitment_id), 0),
        COALESCE((SELECT SUM(CASE WHEN r2.acceptance_status <> 'REJECTED' THEN COALESCE(r2.received_amount, 0) ELSE 0 END) FROM public.service_receipts r2 WHERE r2.commitment_id = v_commitment_id), 0)
    INTO v_authorized_amount, v_reserved_amount;

    IF p_acceptance_status <> 'REJECTED'
        AND v_reserved_amount > v_authorized_amount
    THEN
        RETURN QUERY SELECT 'service_receipt_value_exceeds_open', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, false;
        RETURN;
    END IF;

    UPDATE public.service_receipts r
    SET acceptance_status = p_acceptance_status,
        conditions_notes = CASE WHEN v_conditions_notes IS NOT NULL THEN v_conditions_notes ELSE r.conditions_notes END,
        reviewed_at = v_now,
        reviewed_by = p_actor_id,
        updated_at = v_now,
        updated_by = p_actor_id
    WHERE r.id = p_receipt_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'service_receipt',
        p_receipt_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'service_receipt_reviewed',
            'operation', 'service_receipt_review',
            'w4_version', 'l1-d07-v1',
            'request_id', p_request_id::text,
            'service_id', v_service_id,
            'supplier_id', v_supplier_id,
            'commitment_id', v_commitment_id,
            'receipt_id', p_receipt_id,
            'actor_role', p_actor_role,
            'from', jsonb_build_object('acceptance_status', 'PENDING'),
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, p_acceptance_status, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.correct_service_receipt(
    p_receipt_id uuid,
    p_corrected_acceptance_status text,
    p_corrected_received_amount numeric,
    p_corrected_conditions_notes text,
    p_correction_reason text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    receipt_id uuid,
    service_id uuid,
    supplier_id uuid,
    commitment_id uuid,
    acceptance_status text,
    received_amount numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_corrected_conditions_notes text := NULLIF(btrim(p_corrected_conditions_notes), '');
    v_correction_reason text := NULLIF(btrim(p_correction_reason), '');
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_correction_id uuid;
    v_correction_id uuid;
    v_correction_number integer;
    v_service_id uuid;
    v_supplier_id uuid;
    v_commitment_id uuid;
    v_current_status text;
    v_current_received_amount numeric;
    v_current_conditions_notes text;
    v_reviewed_at timestamptz;
    v_reviewed_by text;
    v_prior_decision_at timestamptz;
    v_prior_decision_by text;
    v_commitment_status text;
    v_original_amount numeric;
    v_authorized_amount numeric;
    v_reserved_amount numeric;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'service_receipt_correction_request_invalid', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'service_receipt_correction_permission_denied', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_receipt_id IS NULL
        OR p_corrected_acceptance_status NOT IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED')
        OR (
            p_corrected_acceptance_status = 'ACCEPTED_WITH_CONDITIONS'
            AND v_corrected_conditions_notes IS NULL
        )
        OR v_corrected_conditions_notes IS NOT NULL AND char_length(v_corrected_conditions_notes) > 4000
        OR p_corrected_received_amount IS NOT NULL
            AND (p_corrected_received_amount < 0 OR p_corrected_received_amount > 999999999999.99)
        OR v_correction_reason IS NULL
        OR char_length(v_correction_reason) > 2000
    THEN
        RETURN QUERY SELECT 'service_receipt_correction_invalid', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'receipt_id', p_receipt_id,
        'corrected_acceptance_status', p_corrected_acceptance_status,
        'corrected_received_amount', p_corrected_received_amount,
        'corrected_conditions_notes', v_corrected_conditions_notes,
        'correction_reason', v_correction_reason
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-receipt-correction:' || p_request_id::text, 0));

    -- The correction request identity is authoritative; audit entity_id remains the receipt ID.
    SELECT c.id, a.details -> 'payload'
    INTO v_existing_correction_id, v_audit_payload
    FROM public.service_receipt_corrections c
    JOIN public.audit_logs a
      ON a.entity_type = 'service_receipt'
     AND a.entity_id = c.receipt_id
     AND a.details ->> 'operation' = 'service_receipt_correction'
     AND a.details ->> 'request_id' = c.request_id::text
    WHERE c.request_id = p_request_id
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'service_receipt_correction_request_conflict', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
            RETURN;
        END IF;

        SELECT sc.id, r.service_id, r.supplier_id, r.commitment_id,
               sc.corrected_acceptance_status, sc.corrected_received_amount
        INTO v_correction_id, v_service_id, v_supplier_id, v_commitment_id,
             v_current_status, v_current_received_amount
        FROM public.service_receipt_corrections sc
        JOIN public.service_receipts r ON r.id = sc.receipt_id
        WHERE sc.id = v_existing_correction_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'service_receipt_correction_unavailable', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, p_receipt_id, v_service_id, v_supplier_id, v_commitment_id,
            v_current_status, v_current_received_amount, true;
        RETURN;
    END IF;

    SELECT r.service_id, r.supplier_id, r.commitment_id, r.acceptance_status,
           r.received_amount, r.conditions_notes, r.reviewed_at, r.reviewed_by,
           c.status, c.original_approved_amount
    INTO v_service_id, v_supplier_id, v_commitment_id, v_current_status,
         v_current_received_amount, v_current_conditions_notes, v_reviewed_at, v_reviewed_by,
         v_commitment_status, v_original_amount
    FROM public.service_receipts r
    JOIN public.approved_commitments c ON c.id = r.commitment_id
    WHERE r.id = p_receipt_id
    FOR UPDATE OF r, c;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_receipt_not_found', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
        RETURN;
    END IF;

    IF v_current_status NOT IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED') THEN
        RETURN QUERY SELECT 'service_receipt_not_reviewed', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, v_current_received_amount, false;
        RETURN;
    END IF;

    SELECT c.corrected_at, c.corrected_by
    INTO v_prior_decision_at, v_prior_decision_by
    FROM public.service_receipt_corrections c
    WHERE c.receipt_id = p_receipt_id
    ORDER BY c.correction_number DESC
    LIMIT 1;

    IF NOT FOUND THEN
        v_prior_decision_at := v_reviewed_at;
        v_prior_decision_by := v_reviewed_by;
    END IF;

    SELECT
        v_original_amount + COALESCE((SELECT SUM(a.amount_delta) FROM public.approved_commitment_amendments a WHERE a.commitment_id = v_commitment_id), 0),
        COALESCE((SELECT SUM(CASE WHEN r2.acceptance_status <> 'REJECTED' THEN COALESCE(r2.received_amount, 0) ELSE 0 END) FROM public.service_receipts r2 WHERE r2.commitment_id = v_commitment_id AND r2.id <> p_receipt_id), 0)
    INTO v_authorized_amount, v_reserved_amount;

    IF v_commitment_status <> 'open'
    THEN
        RETURN QUERY SELECT 'service_receipt_commitment_not_open', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, v_current_received_amount, false;
        RETURN;
    END IF;

    IF p_corrected_acceptance_status <> 'REJECTED'
        AND v_reserved_amount + COALESCE(p_corrected_received_amount, 0) > v_authorized_amount
    THEN
        RETURN QUERY SELECT 'service_receipt_value_exceeds_open', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, v_current_received_amount, false;
        RETURN;
    END IF;

    SELECT COALESCE(MAX(c.correction_number), 0) + 1
    INTO v_correction_number
    FROM public.service_receipt_corrections c
    WHERE c.receipt_id = p_receipt_id;

    INSERT INTO public.service_receipt_corrections(
        receipt_id, correction_number, prior_acceptance_status,
        prior_received_amount, prior_conditions_notes, prior_decision_at,
        prior_decision_by, corrected_acceptance_status, corrected_received_amount,
        corrected_conditions_notes, correction_reason, corrected_at, corrected_by,
        request_id, created_at, created_by
    ) VALUES (
        p_receipt_id, v_correction_number, v_current_status,
        v_current_received_amount, v_current_conditions_notes, v_prior_decision_at,
        v_prior_decision_by, p_corrected_acceptance_status, p_corrected_received_amount,
        v_corrected_conditions_notes, v_correction_reason, v_now, p_actor_id,
        p_request_id, v_now, p_actor_id
    )
    RETURNING id INTO v_correction_id;

    UPDATE public.service_receipts r
    SET acceptance_status = p_corrected_acceptance_status,
        received_amount = p_corrected_received_amount,
        conditions_notes = v_corrected_conditions_notes,
        updated_at = v_now,
        updated_by = p_actor_id
    WHERE r.id = p_receipt_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'correction',
        'service_receipt',
        p_receipt_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'service_receipt_corrected',
            'operation', 'service_receipt_correction',
            'w4_version', 'l1-d07-v2',
            'request_id', p_request_id::text,
            'service_id', v_service_id,
            'supplier_id', v_supplier_id,
            'commitment_id', v_commitment_id,
            'receipt_id', p_receipt_id,
            'correction_id', v_correction_id,
            'correction_number', v_correction_number,
            'actor_role', p_actor_role,
            'from', jsonb_build_object(
                'acceptance_status', v_current_status,
                'received_amount', v_current_received_amount,
                'conditions_notes', v_current_conditions_notes,
                'decision_at', v_prior_decision_at,
                'decision_by', v_prior_decision_by
            ),
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_receipt_id, v_service_id, v_supplier_id, v_commitment_id,
        p_corrected_acceptance_status, p_corrected_received_amount, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_approved_commitment_documents(
    p_commitment_id uuid,
    p_document_ids uuid[],
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    commitment_id uuid,
    service_id uuid,
    document_count integer,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_service_id uuid;
    v_document_count integer := 0;
    v_distinct_document_count integer := 0;
    v_valid_document_count integer := 0;
    v_inserted_document_count integer := 0;
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_commitment_id uuid;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL OR NULLIF(btrim(p_actor_role), '') IS NULL OR p_request_id IS NULL THEN
        RETURN QUERY SELECT 'approved_commitment_request_invalid', p_commitment_id, NULL::uuid, 0, false;
        RETURN;
    END IF;
    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'approved_commitment_permission_denied', p_commitment_id, NULL::uuid, 0, false;
        RETURN;
    END IF;
    IF p_commitment_id IS NULL OR p_document_ids IS NULL THEN
        RETURN QUERY SELECT 'approved_commitment_documents_invalid', p_commitment_id, NULL::uuid, 0, false;
        RETURN;
    END IF;

    SELECT count(*)::integer, count(DISTINCT document_id)::integer
    INTO v_document_count, v_distinct_document_count
    FROM unnest(p_document_ids) AS document_id;
    IF v_document_count < 1 OR v_document_count <> v_distinct_document_count THEN
        RETURN QUERY SELECT 'approved_commitment_documents_invalid', p_commitment_id, NULL::uuid, v_document_count, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'commitment_id', p_commitment_id,
        'document_ids', (SELECT COALESCE(jsonb_agg(to_jsonb(document_id) ORDER BY document_id), '[]'::jsonb) FROM unnest(p_document_ids) AS document_id)
    );
    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-commitment-documents:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_commitment_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'approved_commitment'
      AND a.details ->> 'operation' = 'approved_commitment_documents_attach'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;
    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'approved_commitment_request_conflict', v_existing_commitment_id, NULL::uuid, v_document_count, false;
            RETURN;
        END IF;
        SELECT c.service_id INTO v_service_id FROM public.approved_commitments c WHERE c.id = v_existing_commitment_id;
        RETURN QUERY SELECT NULL::text, v_existing_commitment_id, v_service_id, v_document_count, true;
        RETURN;
    END IF;

    SELECT c.service_id INTO v_service_id
    FROM public.approved_commitments c
    WHERE c.id = p_commitment_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'approved_commitment_not_found', p_commitment_id, NULL::uuid, v_document_count, false;
        RETURN;
    END IF;

    SELECT count(DISTINCT d.id)::integer
    INTO v_valid_document_count
    FROM public.business_documents d
    JOIN public.business_document_links l ON l.document_id = d.id
      AND l.service_id = v_service_id
      AND l.link_purpose = 'approved_commitment'
    WHERE d.id = ANY(p_document_ids)
      AND d.bucket_id = 'business-evidence';
    IF v_valid_document_count <> v_document_count THEN
        RETURN QUERY SELECT 'approved_commitment_document_unavailable', p_commitment_id, v_service_id, v_document_count, false;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.approved_commitment_documents d
        WHERE d.commitment_id = p_commitment_id AND d.document_id = ANY(p_document_ids)
    ) THEN
        RETURN QUERY SELECT 'approved_commitment_document_already_attached', p_commitment_id, v_service_id, v_document_count, false;
        RETURN;
    END IF;

    INSERT INTO public.approved_commitment_documents(commitment_id, document_id, attached_by, attached_at)
    SELECT p_commitment_id, document_id, p_actor_id, v_now
    FROM unnest(p_document_ids) AS document_id;
    GET DIAGNOSTICS v_inserted_document_count = ROW_COUNT;
    IF v_inserted_document_count <> v_document_count THEN
        RETURN QUERY SELECT 'approved_commitment_document_already_attached', p_commitment_id, v_service_id, v_document_count, false;
        RETURN;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('create', 'approved_commitment', p_commitment_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'approved_commitment_documents_attached',
            'operation', 'approved_commitment_documents_attach',
            'w4_version', 'l1-d07-v1',
            'request_id', p_request_id::text,
            'commitment_id', p_commitment_id,
            'service_id', v_service_id,
            'document_count', v_document_count,
            'actor_role', p_actor_role,
            'payload', v_payload
        ), v_now);
    RETURN QUERY SELECT NULL::text, p_commitment_id, v_service_id, v_document_count, false;
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_service_receipt_documents(
    p_receipt_id uuid,
    p_document_ids uuid[],
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    receipt_id uuid,
    service_id uuid,
    document_count integer,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_service_id uuid;
    v_document_count integer := 0;
    v_distinct_document_count integer := 0;
    v_valid_document_count integer := 0;
    v_inserted_document_count integer := 0;
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_receipt_id uuid;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL OR NULLIF(btrim(p_actor_role), '') IS NULL OR p_request_id IS NULL THEN
        RETURN QUERY SELECT 'service_receipt_request_invalid', p_receipt_id, NULL::uuid, 0, false;
        RETURN;
    END IF;
    IF p_actor_role NOT IN ('admin', 'manager', 'operations') THEN
        RETURN QUERY SELECT 'service_receipt_permission_denied', p_receipt_id, NULL::uuid, 0, false;
        RETURN;
    END IF;
    IF p_receipt_id IS NULL OR p_document_ids IS NULL THEN
        RETURN QUERY SELECT 'service_receipt_documents_invalid', p_receipt_id, NULL::uuid, 0, false;
        RETURN;
    END IF;

    SELECT count(*)::integer, count(DISTINCT document_id)::integer
    INTO v_document_count, v_distinct_document_count
    FROM unnest(p_document_ids) AS document_id;
    IF v_document_count < 1 OR v_document_count <> v_distinct_document_count THEN
        RETURN QUERY SELECT 'service_receipt_documents_invalid', p_receipt_id, NULL::uuid, v_document_count, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'receipt_id', p_receipt_id,
        'document_ids', (SELECT COALESCE(jsonb_agg(to_jsonb(document_id) ORDER BY document_id), '[]'::jsonb) FROM unnest(p_document_ids) AS document_id)
    );
    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-receipt-documents:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_receipt_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'service_receipt'
      AND a.details ->> 'operation' = 'service_receipt_documents_attach'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;
    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'service_receipt_request_conflict', v_existing_receipt_id, NULL::uuid, v_document_count, false;
            RETURN;
        END IF;
        SELECT r.service_id INTO v_service_id FROM public.service_receipts r WHERE r.id = v_existing_receipt_id;
        RETURN QUERY SELECT NULL::text, v_existing_receipt_id, v_service_id, v_document_count, true;
        RETURN;
    END IF;

    SELECT r.service_id INTO v_service_id
    FROM public.service_receipts r
    WHERE r.id = p_receipt_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_receipt_not_found', p_receipt_id, NULL::uuid, v_document_count, false;
        RETURN;
    END IF;

    SELECT count(DISTINCT d.id)::integer
    INTO v_valid_document_count
    FROM public.business_documents d
    JOIN public.business_document_links l ON l.document_id = d.id
      AND l.service_id = v_service_id
      AND l.link_purpose = 'service_receipt'
    WHERE d.id = ANY(p_document_ids)
      AND d.bucket_id = 'business-evidence';
    IF v_valid_document_count <> v_document_count THEN
        RETURN QUERY SELECT 'service_receipt_document_unavailable', p_receipt_id, v_service_id, v_document_count, false;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.service_receipt_documents d
        WHERE d.receipt_id = p_receipt_id AND d.document_id = ANY(p_document_ids)
    ) THEN
        RETURN QUERY SELECT 'service_receipt_document_already_attached', p_receipt_id, v_service_id, v_document_count, false;
        RETURN;
    END IF;

    INSERT INTO public.service_receipt_documents(receipt_id, document_id, attached_by, attached_at)
    SELECT p_receipt_id, document_id, p_actor_id, v_now
    FROM unnest(p_document_ids) AS document_id;
    GET DIAGNOSTICS v_inserted_document_count = ROW_COUNT;
    IF v_inserted_document_count <> v_document_count THEN
        RETURN QUERY SELECT 'service_receipt_document_already_attached', p_receipt_id, v_service_id, v_document_count, false;
        RETURN;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('create', 'service_receipt', p_receipt_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'service_receipt_documents_attached',
            'operation', 'service_receipt_documents_attach',
            'w4_version', 'l1-d07-v1',
            'request_id', p_request_id::text,
            'receipt_id', p_receipt_id,
            'service_id', v_service_id,
            'document_count', v_document_count,
            'actor_role', p_actor_role,
            'payload', v_payload
        ), v_now);
    RETURN QUERY SELECT NULL::text, p_receipt_id, v_service_id, v_document_count, false;
END;
$$;

REVOKE ALL ON FUNCTION public.create_approved_commitment(text,uuid,uuid,uuid,text,numeric,timestamptz,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_approved_commitment_amendment(uuid,text,numeric,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_approved_commitment(uuid,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_service_receipt(uuid,uuid,date,text,numeric,numeric,text,numeric,text,text,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_service_receipt(uuid,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.correct_service_receipt(uuid,text,numeric,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_approved_commitment_documents(uuid,uuid[],uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_service_receipt_documents(uuid,uuid[],uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_approved_commitment(text,uuid,uuid,uuid,text,numeric,timestamptz,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.add_approved_commitment_amendment(uuid,text,numeric,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_approved_commitment(uuid,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_service_receipt(uuid,uuid,date,text,numeric,numeric,text,numeric,text,text,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_service_receipt(uuid,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.correct_service_receipt(uuid,text,numeric,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_approved_commitment_documents(uuid,uuid[],uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_service_receipt_documents(uuid,uuid[],uuid,text,text) TO service_role;

COMMIT;
