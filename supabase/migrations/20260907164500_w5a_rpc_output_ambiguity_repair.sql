-- W5A corrective migration: qualify relation columns in RPCs to resolve PL/pgSQL output-column ambiguity (SQLSTATE 42702).
-- Preserves base migration (20260907150000_w5a_expense_cash_foundation.sql) as applied source history.

BEGIN;

-- Preflight safety guards
DO $$
BEGIN
    IF to_regclass('public.expenses') IS NULL
        OR to_regclass('public.expense_documents') IS NULL
        OR to_regclass('public.expense_reimbursement_settlements') IS NULL
        OR to_regclass('public.cash_advance_expense_settlements') IS NULL
        OR to_regclass('public.petty_cash_transactions') IS NULL
        OR to_regprocedure('public.cancel_expense(uuid,text,uuid,text,text)') IS NULL
        OR to_regprocedure('public.attach_expense_document(uuid,uuid,uuid,text,text)') IS NULL
    THEN
        RAISE EXCEPTION 'W5A ambiguity repair preflight: required W5 tables or RPC functions missing';
    END IF;
END;
$$;

-- 1. Repair cancel_expense: qualify relation columns against RETURNS TABLE (expense_id)
CREATE OR REPLACE FUNCTION public.cancel_expense(
    p_expense_id uuid,
    p_cancellation_reason text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    expense_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_status text;
    v_reimbursement_count int;
    v_advance_allocation_count int;
    v_petty_cash_count int;
    v_existing_id uuid;
    v_payload jsonb;
    v_audit_payload jsonb;
BEGIN
    IF p_expense_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
       OR NULLIF(btrim(p_cancellation_reason), '') IS NULL OR char_length(btrim(p_cancellation_reason)) < 5 THEN
        RETURN QUERY SELECT 'cancellation_reason_invalid'::text, p_expense_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_expense_id, false;
        RETURN;
    END;

    v_payload := jsonb_build_object('expense_id', p_expense_id, 'cancellation_reason', btrim(p_cancellation_reason));

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:expense_cancel:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense'
      AND a.details ->> 'operation' = 'cancel_expense'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_expense_id THEN
            RETURN QUERY SELECT 'expense_cancel_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT e.status INTO v_status
    FROM public.expenses e
    WHERE e.id = p_expense_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'expense_not_found'::text, p_expense_id, false;
        RETURN;
    END IF;

    IF v_status NOT IN ('draft', 'submitted', 'approved') THEN
        RETURN QUERY SELECT 'expense_invalid_state_for_cancellation'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- Never allow cancellation if any settlement or allocation exists
    -- Qualify relation column expense_id with explicit table aliases to avoid PL/pgSQL RETURNS TABLE collision
    SELECT count(*) INTO v_reimbursement_count
    FROM public.expense_reimbursement_settlements ers
    WHERE ers.expense_id = p_expense_id;

    SELECT count(*) INTO v_advance_allocation_count
    FROM public.cash_advance_expense_settlements caes
    WHERE caes.expense_id = p_expense_id;

    SELECT count(*) INTO v_petty_cash_count
    FROM public.petty_cash_transactions pct
    WHERE pct.expense_id = p_expense_id;

    IF v_reimbursement_count > 0 OR v_advance_allocation_count > 0 OR v_petty_cash_count > 0 THEN
        RETURN QUERY SELECT 'expense_settlement_exists_cannot_cancel'::text, p_expense_id, false;
        RETURN;
    END IF;

    UPDATE public.expenses
    SET status = 'cancelled',
        cancelled_by = v_actor_uuid,
        cancelled_at = v_now,
        cancellation_reason = btrim(p_cancellation_reason),
        updated_at = v_now
    WHERE id = p_expense_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_cancelled', 'expense', p_expense_id, p_actor_id,
        jsonb_build_object(
            'operation', 'cancel_expense',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'reason', btrim(p_cancellation_reason),
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_expense_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_expense(uuid, text, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_expense(uuid, text, uuid, text, text) TO service_role;

-- 2. Repair attach_expense_document: qualify relation columns against RETURNS TABLE (expense_id, document_id)
CREATE OR REPLACE FUNCTION public.attach_expense_document(
    p_expense_id uuid,
    p_document_id uuid,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    expense_id uuid,
    document_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_existing_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
BEGIN
    IF p_expense_id IS NULL OR p_document_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'request_invalid'::text, p_expense_id, p_document_id, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object('expense_id', p_expense_id, 'document_id', p_document_id);

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:attach_doc:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense'
      AND a.details ->> 'operation' = 'attach_expense_document'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_expense_id THEN
            RETURN QUERY SELECT 'attach_document_request_conflict'::text, p_expense_id, p_document_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, p_expense_id, p_document_id, true;
        RETURN;
    END IF;

    -- Qualify relation columns with ed alias to avoid PL/pgSQL RETURNS TABLE (expense_id, document_id) collision
    IF EXISTS (
        SELECT 1
        FROM public.expense_documents ed
        WHERE ed.expense_id = p_expense_id
          AND ed.document_id = p_document_id
    ) THEN
        RETURN QUERY SELECT 'document_already_attached'::text, p_expense_id, p_document_id, false;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.expenses e
        WHERE e.id = p_expense_id
    ) THEN
        RETURN QUERY SELECT 'expense_not_found'::text, p_expense_id, p_document_id, false;
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.business_documents bd
        WHERE bd.id = p_document_id
    ) THEN
        RETURN QUERY SELECT 'document_not_found'::text, p_expense_id, p_document_id, false;
        RETURN;
    END IF;

    INSERT INTO public.expense_documents (expense_id, document_id, attached_by, attached_at)
    VALUES (p_expense_id, p_document_id, p_actor_id, v_now);

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_document_attached', 'expense', p_expense_id, p_actor_id,
        jsonb_build_object(
            'operation', 'attach_expense_document',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'document_id', p_document_id,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_expense_id, p_document_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_expense_document(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_expense_document(uuid, uuid, uuid, text, text) TO service_role;

COMMIT;
