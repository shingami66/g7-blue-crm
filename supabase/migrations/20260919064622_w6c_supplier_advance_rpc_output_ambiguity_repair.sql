-- W6C corrective repair: qualify balance-view reads that collide with
-- RETURNS TABLE output-column names in the four affected RPCs.

BEGIN;

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
        SELECT b.paid_amount, b.remaining_unallocated_amount INTO v_paid, v_allocated
        FROM public.supplier_advance_balances b WHERE b.supplier_advance_id=p_advance_id;
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
    SELECT b.paid_amount, b.remaining_unallocated_amount INTO v_paid,v_allocated
    FROM public.supplier_advance_balances b WHERE b.supplier_advance_id=p_advance_id;
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
        SELECT b.refunded_amount,b.remaining_unallocated_amount INTO v_refunded,v_allocated
        FROM public.supplier_advance_balances b WHERE b.supplier_advance_id=p_advance_id;
        RETURN QUERY SELECT NULL::text,v_existing.id,v_existing.refund_number,p_advance_id,v_refunded,v_allocated,true; RETURN;
    END IF;
    SELECT a.* INTO v_advance FROM public.supplier_advances a WHERE a.id=p_advance_id FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'supplier_advance_not_found',NULL::uuid,NULL::text,p_advance_id,0::numeric,NULL::numeric,false; RETURN; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.business_documents d JOIN public.business_document_links l
        ON l.document_id=d.id AND l.service_id=v_advance.service_id AND l.link_purpose='supplier_advance_refund'
        WHERE d.id=p_document_id AND d.bucket_id='business-evidence' AND d.document_type='supplier_advance_refund_evidence')
    THEN RETURN QUERY SELECT 'supplier_advance_evidence_required',NULL::uuid,NULL::text,p_advance_id,0::numeric,NULL::numeric,false; RETURN; END IF;
    SELECT b.paid_amount,b.allocated_amount,b.refunded_amount,b.remaining_unallocated_amount
    INTO v_paid,v_allocated,v_refunded FROM public.supplier_advance_balances b WHERE b.supplier_advance_id=p_advance_id;
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
    SELECT b.refunded_amount,b.remaining_unallocated_amount INTO v_refunded,v_allocated
    FROM public.supplier_advance_balances b WHERE b.supplier_advance_id=p_advance_id;
    RETURN QUERY SELECT NULL::text,v_id,v_number,p_advance_id,v_refunded,v_allocated,false;
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
        SELECT b.paid_amount,b.remaining_unallocated_amount INTO v_paid,v_unallocated
        FROM public.supplier_advance_balances b WHERE b.supplier_advance_id=v_existing.supplier_advance_id;
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
    SELECT b.remaining_unallocated_amount INTO v_unallocated
    FROM public.supplier_advance_balances b WHERE b.supplier_advance_id=v_payment.supplier_advance_id;
    IF COALESCE(v_unallocated,0)<v_payment.amount THEN
        RETURN QUERY SELECT 'supplier_advance_payment_reverse_unavailable',p_payment_id,v_payment.supplier_advance_id,0::numeric,v_unallocated,false; RETURN;
    END IF;
    INSERT INTO public.supplier_advance_payment_reversals(supplier_advance_payment_id,reason,reversed_by,reversed_at,reversal_request_id)
    VALUES(p_payment_id,v_reason,v_actor,v_now,p_request_id);
    INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp)
    VALUES('supplier_advance_payment_reversed','supplier_advance_payment',p_payment_id,p_actor_id,
        jsonb_build_object('operation','supplier_advance_payment_reverse','request_id',p_request_id::text,
            'actor_role',p_actor_role,'supplier_advance_id',v_payment.supplier_advance_id,'reason',v_reason),v_now);
    SELECT b.paid_amount,b.remaining_unallocated_amount INTO v_paid,v_unallocated
    FROM public.supplier_advance_balances b WHERE b.supplier_advance_id=v_payment.supplier_advance_id;
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
        SELECT b.remaining_unallocated_amount INTO v_unallocated
        FROM public.supplier_advance_balances b WHERE b.supplier_advance_id=v_existing.supplier_advance_id;
        SELECT bb.outstanding_amount INTO v_bill_outstanding
        FROM public.supplier_bill_payment_balances bb WHERE bb.supplier_bill_id=v_existing.supplier_bill_id;
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
    SELECT b.remaining_unallocated_amount INTO v_unallocated
    FROM public.supplier_advance_balances b WHERE b.supplier_advance_id=v_allocation.supplier_advance_id;
    SELECT bb.outstanding_amount INTO v_bill_outstanding
    FROM public.supplier_bill_payment_balances bb WHERE bb.supplier_bill_id=v_allocation.supplier_bill_id;
    RETURN QUERY SELECT NULL::text,p_allocation_id,v_allocation.supplier_advance_id,v_allocation.supplier_bill_id,v_unallocated,v_bill_outstanding,false;
END;
$$;

REVOKE ALL ON FUNCTION public.record_supplier_advance_payment(uuid,date,numeric,text,text,text,uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.refund_supplier_advance(uuid,date,numeric,text,text,uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reverse_supplier_advance_payment(uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.reverse_supplier_advance_allocation(uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_supplier_advance_payment(uuid,date,numeric,text,text,text,uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_supplier_advance(uuid,date,numeric,text,text,uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_supplier_advance_payment(uuid,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_supplier_advance_allocation(uuid,text,uuid,text,text) TO service_role;

COMMIT;
