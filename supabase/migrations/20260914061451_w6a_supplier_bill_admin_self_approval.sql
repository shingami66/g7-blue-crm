-- W6A corrective authority: Admin may approve a Supplier Bill they recorded.
-- Accountant remains record-only and Manager remains approve-only. This
-- migration is authored only; it must not be applied to DEV by this task.

BEGIN;

-- Keep the already-authoritative create/update financial rules in place while
-- returning stable user-facing codes for the two confirmed field failures.
ALTER FUNCTION public.create_supplier_bill(uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text)
    RENAME TO create_supplier_bill_w6a_original;
ALTER FUNCTION public.update_supplier_bill(uuid,uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text)
    RENAME TO update_supplier_bill_w6a_original;

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
BEGIN
    IF p_invoice_date IS NULL
        OR NULLIF(btrim(p_invoice_number), '') IS NULL
        OR NULLIF(btrim(p_currency), '') IS NULL
        OR btrim(p_currency) !~ '^[A-Za-z]{3}$'
        OR p_subtotal IS NULL OR p_subtotal < 0 OR p_subtotal > 999999999999.99
        OR p_vat_amount IS NULL OR p_vat_amount < 0 OR p_vat_amount > 999999999999.99
        OR p_total_amount IS NULL OR p_total_amount <= 0 OR p_total_amount > 999999999999.99
    THEN
        RETURN QUERY SELECT 'supplier_bill_fields_invalid', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    IF p_total_amount <> p_subtotal + p_vat_amount THEN
        RETURN QUERY SELECT 'supplier_bill_total_mismatch', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    IF p_due_date IS NOT NULL AND p_due_date < p_invoice_date THEN
        RETURN QUERY SELECT 'supplier_bill_due_date_invalid', NULL::uuid, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    RETURN QUERY SELECT * FROM public.create_supplier_bill_w6a_original(
        p_service_id, p_supplier_id, p_commitment_id, p_service_receipt_id,
        p_invoice_number, p_invoice_date, p_due_date, p_currency, p_subtotal,
        p_vat_amount, p_total_amount, p_request_id, p_actor_id, p_actor_role
    );
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
BEGIN
    IF p_bill_id IS NULL
        OR p_service_id IS NULL OR p_supplier_id IS NULL
        OR p_commitment_id IS NULL OR p_service_receipt_id IS NULL
        OR p_invoice_date IS NULL
        OR NULLIF(btrim(p_invoice_number), '') IS NULL
        OR NULLIF(btrim(p_currency), '') IS NULL
        OR btrim(p_currency) !~ '^[A-Za-z]{3}$'
        OR p_subtotal IS NULL OR p_subtotal < 0 OR p_subtotal > 999999999999.99
        OR p_vat_amount IS NULL OR p_vat_amount < 0 OR p_vat_amount > 999999999999.99
        OR p_total_amount IS NULL OR p_total_amount <= 0 OR p_total_amount > 999999999999.99
    THEN
        RETURN QUERY SELECT 'supplier_bill_fields_invalid', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    IF p_total_amount <> p_subtotal + p_vat_amount THEN
        RETURN QUERY SELECT 'supplier_bill_total_mismatch', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    IF p_due_date IS NOT NULL AND p_due_date < p_invoice_date THEN
        RETURN QUERY SELECT 'supplier_bill_due_date_invalid', p_bill_id, NULL::text, 'pending'::text, false;
        RETURN;
    END IF;
    RETURN QUERY SELECT * FROM public.update_supplier_bill_w6a_original(
        p_bill_id, p_service_id, p_supplier_id, p_commitment_id, p_service_receipt_id,
        p_invoice_number, p_invoice_date, p_due_date, p_currency, p_subtotal,
        p_vat_amount, p_total_amount, p_request_id, p_actor_id, p_actor_role
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_supplier_bill_w6a_original(uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_supplier_bill_w6a_original(uuid,uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier_bill_w6a_original(uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_supplier_bill_w6a_original(uuid,uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.create_supplier_bill(uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_supplier_bill(uuid,uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier_bill(uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_supplier_bill(uuid,uuid,uuid,uuid,uuid,text,date,date,text,numeric,numeric,numeric,uuid,text,text) TO service_role;

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
    IF v_recorded_by = v_actor_uuid AND p_actor_role <> 'admin' THEN
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

REVOKE ALL ON FUNCTION public.approve_supplier_bill(uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_supplier_bill(uuid,uuid,text,text) TO service_role;

COMMIT;
