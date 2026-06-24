-- Payment MVP Atomic RPC
CREATE OR REPLACE FUNCTION record_invoice_payment(
    p_invoice_id uuid,
    p_amount numeric,
    p_date date,
    p_method text,
    p_reference text,
    p_user_id text
)
RETURNS TABLE(
    payment_id uuid,
    payment_number text,
    amount_paid numeric,
    balance_due numeric,
    status text
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_invoice_record record;
    v_payment_number text;
    v_payment_id uuid;
    v_new_amount_paid numeric;
    v_new_balance_due numeric;
    v_new_status text;
BEGIN
    -- 1. Fetch and lock the invoice
    SELECT id, customer_id, amount_paid, balance_due, status, is_deleted
    INTO v_invoice_record
    FROM invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    IF v_invoice_record.is_deleted THEN
        RAISE EXCEPTION 'Invoice is deleted';
    END IF;

    IF v_invoice_record.status NOT IN ('sent', 'partial') THEN
        RAISE EXCEPTION 'Payment is only allowed for sent or partial invoices';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than 0';
    END IF;

    IF p_amount > v_invoice_record.balance_due THEN
        RAISE EXCEPTION 'Payment amount exceeds invoice balance due';
    END IF;

    -- 2. Generate payment number
    v_payment_number := generate_document_number('payment');

    -- 3. Insert payment
    INSERT INTO payments (
        payment_number,
        invoice_id,
        customer_id,
        date,
        amount,
        method,
        reference,
        status,
        created_by,
        updated_by
    ) VALUES (
        v_payment_number,
        p_invoice_id,
        v_invoice_record.customer_id,
        p_date,
        p_amount,
        p_method,
        p_reference,
        'confirmed',
        p_user_id,
        p_user_id
    ) RETURNING id INTO v_payment_id;

    -- 4. Calculate new values
    v_new_amount_paid := v_invoice_record.amount_paid + p_amount;
    v_new_balance_due := v_invoice_record.balance_due - p_amount;

    IF v_new_balance_due = 0 THEN
        v_new_status := 'paid';
    ELSE
        v_new_status := 'partial';
    END IF;

    -- 5. Update invoice
    UPDATE invoices
    SET
        amount_paid = v_new_amount_paid,
        balance_due = v_new_balance_due,
        status = v_new_status,
        updated_by = p_user_id,
        updated_at = now()
    WHERE id = p_invoice_id;

    -- 6. Log audit event
    INSERT INTO audit_logs (
        action,
        entity_type,
        entity_id,
        user_id,
        details
    ) VALUES (
        'payment_recorded',
        'invoice',
        p_invoice_id,
        p_user_id,
        jsonb_build_object(
            'payment_id', v_payment_id,
            'payment_number', v_payment_number,
            'amount', p_amount,
            'method', p_method,
            'new_status', v_new_status
        )
    );

    RETURN QUERY SELECT
        v_payment_id,
        v_payment_number,
        v_new_amount_paid,
        v_new_balance_due,
        v_new_status;
END;
$$;

-- Routine privileges
REVOKE EXECUTE ON FUNCTION record_invoice_payment(uuid, numeric, date, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION record_invoice_payment(uuid, numeric, date, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION record_invoice_payment(uuid, numeric, date, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION record_invoice_payment(uuid, numeric, date, text, text, text) TO service_role;
