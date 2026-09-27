-- ============================================================================
-- Migration: 20260907223000_w5b1_expense_finance_review_access.sql
-- Description: W5B-1A Expense Finance Review Gate and Accountability Extension
-- Authoritative lineage: follows 20260907164500_w5a_rpc_output_ambiguity_repair.sql
-- ============================================================================

-- 1. PREFLIGHT SAFETY GUARDS
DO $$
BEGIN
    IF to_regclass('public.expenses') IS NULL THEN
        RAISE EXCEPTION 'Prerequisite table public.expenses does not exist';
    END IF;
    IF to_regclass('public.app_users') IS NULL THEN
        RAISE EXCEPTION 'Prerequisite table public.app_users does not exist';
    END IF;
    IF to_regclass('public.audit_logs') IS NULL THEN
        RAISE EXCEPTION 'Prerequisite table public.audit_logs does not exist';
    END IF;
    IF to_regclass('public.expense_documents') IS NULL THEN
        RAISE EXCEPTION 'Prerequisite table public.expense_documents does not exist';
    END IF;
    IF to_regclass('public.expense_evidence_exceptions') IS NULL THEN
        RAISE EXCEPTION 'Prerequisite table public.expense_evidence_exceptions does not exist';
    END IF;
END;
$$;

-- 2. SCHEMA EXTENSION: FINANCE REVIEW EVIDENCE FIELDS ON public.expenses
ALTER TABLE public.expenses
    ADD COLUMN IF NOT EXISTS finance_reviewed_by uuid NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS finance_reviewed_at timestamptz NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_expenses_finance_review_pair'
    ) THEN
        ALTER TABLE public.expenses
            ADD CONSTRAINT chk_expenses_finance_review_pair
            CHECK (
                (finance_reviewed_by IS NULL AND finance_reviewed_at IS NULL)
                OR (finance_reviewed_by IS NOT NULL AND finance_reviewed_at IS NOT NULL)
            );
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_expenses_finance_reviewed_at
    ON public.expenses (finance_reviewed_at)
    WHERE finance_reviewed_at IS NOT NULL;

-- 3. AUDIT LOG ACTION COMPATIBILITY EXPANSION (FI-008)
-- Preserves all 28 prior actions and appends expense_finance_reviewed
ALTER TABLE public.audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_action_check
    CHECK (
        action = ANY (
            ARRAY[
                -- Core CRM actions
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
                -- W5A domain actions
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
                -- W5B-1A action
                'expense_finance_reviewed'::text
            ]
        )
    );

-- 4. GOVERNED TRANSACTIONAL RPC: review_expense_finance
CREATE OR REPLACE FUNCTION public.review_expense_finance(
    p_expense_id uuid,
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
    v_finance_reviewed_at timestamptz;
    v_finance_reviewed_by uuid;
    v_has_document boolean;
    v_has_accepted_exception boolean;
    v_existing_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
BEGIN
    IF p_expense_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'request_invalid'::text, p_expense_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_expense_id, false;
        RETURN;
    END;

    v_payload := jsonb_build_object('expense_id', p_expense_id);

    PERFORM pg_advisory_xact_lock(hashtextextended('w5b:review_expense_finance:' || p_request_id::text, 0));

    -- Idempotency replay check
    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense'
      AND a.details ->> 'operation' = 'review_expense_finance'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_expense_id THEN
            RETURN QUERY SELECT 'expense_finance_review_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    -- Row lock expense
    SELECT e.status, e.finance_reviewed_at, e.finance_reviewed_by
    INTO v_status, v_finance_reviewed_at, v_finance_reviewed_by
    FROM public.expenses e
    WHERE e.id = p_expense_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'expense_not_found'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- Status check: Expense must be submitted
    IF v_status != 'submitted' THEN
        RETURN QUERY SELECT 'expense_invalid_state_for_finance_review'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- Positive gate: already reviewed check
    IF v_finance_reviewed_at IS NOT NULL OR v_finance_reviewed_by IS NOT NULL THEN
        RETURN QUERY SELECT 'expense_already_finance_reviewed'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- Evidence requirement: at least one attached document OR an accepted evidence exception
    SELECT EXISTS (
        SELECT 1 FROM public.expense_documents ed WHERE ed.expense_id = p_expense_id
    ) INTO v_has_document;

    SELECT EXISTS (
        SELECT 1 FROM public.expense_evidence_exceptions eee
        WHERE eee.expense_id = p_expense_id AND eee.disposition = 'accepted'
    ) INTO v_has_accepted_exception;

    IF NOT (v_has_document OR v_has_accepted_exception) THEN
        RETURN QUERY SELECT 'expense_evidence_required_for_finance_review'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- Update finance review evidence
    UPDATE public.expenses
    SET finance_reviewed_by = v_actor_uuid,
        finance_reviewed_at = v_now,
        updated_at = v_now
    WHERE id = p_expense_id;

    -- Append audit evidence
    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_finance_reviewed', 'expense', p_expense_id, p_actor_id,
        jsonb_build_object(
            'operation', 'review_expense_finance',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_expense_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.review_expense_finance(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_expense_finance(uuid, uuid, text, text) TO service_role;

-- 5. FORWARD-ONLY REPLACEMENT: approve_expense WITH FINANCE REVIEW GATE
CREATE OR REPLACE FUNCTION public.approve_expense(
    p_expense_id uuid,
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
    v_submitted_by uuid;
    v_claimant_id uuid;
    v_origin_type text;
    v_status text;
    v_finance_reviewed_at timestamptz;
    v_finance_reviewed_by uuid;
    v_existing_id uuid;
    v_payload jsonb;
    v_audit_payload jsonb;
BEGIN
    IF p_expense_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'request_invalid'::text, p_expense_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_expense_id, false;
        RETURN;
    END;

    v_payload := jsonb_build_object('expense_id', p_expense_id);

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:expense_approve:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense'
      AND a.details ->> 'operation' = 'approve_expense'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_expense_id THEN
            RETURN QUERY SELECT 'expense_approve_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT e.submitted_by, e.claimant_id, e.origin_type, e.status, e.finance_reviewed_at, e.finance_reviewed_by
    INTO v_submitted_by, v_claimant_id, v_origin_type, v_status, v_finance_reviewed_at, v_finance_reviewed_by
    FROM public.expenses e
    WHERE e.id = p_expense_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'expense_not_found'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- Segregation of Duties: submitter cannot self-approve
    IF v_submitted_by = v_actor_uuid THEN
        RETURN QUERY SELECT 'expense_self_approval_forbidden'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- Segregation of Duties: employee claimant cannot self-approve
    IF v_origin_type = 'employee_paid' AND v_claimant_id = v_actor_uuid THEN
        RETURN QUERY SELECT 'expense_claimant_self_approval_forbidden'::text, p_expense_id, false;
        RETURN;
    END IF;

    IF v_status != 'submitted' THEN
        RETURN QUERY SELECT 'expense_invalid_state_for_approval'::text, p_expense_id, false;
        RETURN;
    END IF;

    -- W5B-1A Gate: Completed positive Finance review required before approval
    IF v_finance_reviewed_at IS NULL OR v_finance_reviewed_by IS NULL THEN
        RETURN QUERY SELECT 'expense_not_finance_reviewed'::text, p_expense_id, false;
        RETURN;
    END IF;

    UPDATE public.expenses
    SET status = 'approved',
        approved_by = v_actor_uuid,
        approved_at = v_now,
        updated_at = v_now
    WHERE id = p_expense_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_approved', 'expense', p_expense_id, p_actor_id,
        jsonb_build_object(
            'operation', 'approve_expense',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_expense_id, false;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_expense(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_expense(uuid, uuid, text, text) TO service_role;

-- 6. EXTEND public.expense_accountability_summaries VIEW WITH FINANCE REVIEW EVIDENCE
CREATE OR REPLACE VIEW public.expense_accountability_summaries AS
WITH doc_counts AS (
    SELECT ed.expense_id, count(*)::int AS document_count
    FROM public.expense_documents ed
    GROUP BY ed.expense_id
),
exception_info AS (
    SELECT DISTINCT ON (eee.expense_id)
        eee.expense_id,
        eee.id AS exception_id,
        eee.disposition,
        eee.review_before,
        eee.accountable_owner_id
    FROM public.expense_evidence_exceptions eee
    ORDER BY eee.expense_id, eee.created_at DESC
),
reimbursement_sums AS (
    SELECT ers.expense_id, COALESCE(SUM(ers.amount), 0)::numeric(12,2) AS reimbursed_amount
    FROM public.expense_reimbursement_settlements ers
    GROUP BY ers.expense_id
),
advance_settlement_sums AS (
    SELECT caes.expense_id, COALESCE(SUM(caes.amount), 0)::numeric(12,2) AS advance_allocated_amount
    FROM public.cash_advance_expense_settlements caes
    GROUP BY caes.expense_id
),
petty_cash_sums AS (
    SELECT pct.expense_id, COALESCE(SUM(pct.amount), 0)::numeric(12,2) AS petty_cash_allocated_amount
    FROM public.petty_cash_transactions pct
    WHERE pct.transaction_type = 'disbursement' AND pct.expense_id IS NOT NULL
    GROUP BY pct.expense_id
)
SELECT
    e.id,
    e.expense_number,
    e.context_type,
    e.service_id,
    e.expense_category,
    e.description,
    e.amount,
    e.currency,
    e.expense_date,
    e.origin_type,
    e.payment_method,
    e.cash_advance_id,
    e.petty_cash_fund_id,
    e.claimant_id,
    e.submitted_by,
    e.submitted_at,
    e.status,
    e.approved_by,
    e.approved_at,
    e.rejected_by,
    e.rejected_at,
    e.rejection_reason,
    e.cancelled_by,
    e.cancelled_at,
    e.cancellation_reason,
    e.created_at,
    e.updated_at,
    COALESCE(r.reimbursed_amount, 0.00)::numeric(12,2) AS reimbursed_amount,
    COALESCE(adv.advance_allocated_amount, 0.00)::numeric(12,2) AS advance_allocated_amount,
    COALESCE(pc.petty_cash_allocated_amount, 0.00)::numeric(12,2) AS petty_cash_allocated_amount,
    (COALESCE(r.reimbursed_amount, 0.00) + COALESCE(adv.advance_allocated_amount, 0.00) + COALESCE(pc.petty_cash_allocated_amount, 0.00))::numeric(12,2) AS total_settled_amount,
    (e.amount - (COALESCE(r.reimbursed_amount, 0.00) + COALESCE(adv.advance_allocated_amount, 0.00) + COALESCE(pc.petty_cash_allocated_amount, 0.00)))::numeric(12,2) AS remaining_unsettled_amount,
    CASE
        WHEN e.origin_type = 'company_direct' THEN 'not_applicable'
        WHEN COALESCE(r.reimbursed_amount, 0.00) = 0.00 THEN 'pending'
        WHEN COALESCE(r.reimbursed_amount, 0.00) < e.amount THEN 'partially_settled'
        ELSE 'fully_settled'
    END AS reimbursement_status,
    CASE
        WHEN COALESCE(dc.document_count, 0) > 0 THEN 'receipt_attached'
        WHEN ex.exception_id IS NOT NULL THEN 'exception_' || ex.disposition
        ELSE 'no_evidence'
    END AS evidence_status,
    COALESCE(dc.document_count, 0) AS document_count,
    ex.exception_id,
    ex.disposition AS exception_disposition,
    ex.review_before AS exception_review_before,
    ex.accountable_owner_id AS exception_accountable_owner_id,
    e.finance_reviewed_by,
    e.finance_reviewed_at
FROM public.expenses e
LEFT JOIN doc_counts dc ON dc.expense_id = e.id
LEFT JOIN exception_info ex ON ex.expense_id = e.id
LEFT JOIN reimbursement_sums r ON r.expense_id = e.id
LEFT JOIN advance_settlement_sums adv ON adv.expense_id = e.id
LEFT JOIN petty_cash_sums pc ON pc.expense_id = e.id;

REVOKE ALL ON TABLE public.expense_accountability_summaries FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.expense_accountability_summaries TO service_role;
