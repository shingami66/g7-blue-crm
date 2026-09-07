-- W5A — Expense and Cash Accountability Foundation
-- Planning Reference: L1-D08-EXPENSE-CASH
--
-- Migration owns local schema and RPC definitions for:
-- 1. Employee Cash Advances (public.employee_cash_advances, public.cash_advance_returns)
-- 2. Petty Cash Funds & Float Accounts (public.petty_cash_funds, public.petty_cash_transactions)
-- 3. Expenses (public.expenses, public.expense_documents, public.expense_evidence_exceptions)
-- 4. Settlements (public.expense_reimbursement_settlements, public.cash_advance_expense_settlements)
-- 5. Authoritative Derived Accountability View (public.expense_accountability_summaries)
-- 6. Governed RPC boundaries with row-level locks and idempotency

BEGIN;

-- 1. PREFLIGHT SAFETY GUARD
DO $$
BEGIN
    IF to_regclass('public.app_users') IS NULL
        OR to_regclass('public.services') IS NULL
        OR to_regclass('public.business_documents') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'W5A preflight failed: required baseline tables missing';
    END IF;

    IF to_regclass('public.employee_cash_advances') IS NOT NULL
        OR to_regclass('public.cash_advance_returns') IS NOT NULL
        OR to_regclass('public.petty_cash_funds') IS NOT NULL
        OR to_regclass('public.expenses') IS NOT NULL
        OR to_regclass('public.expense_documents') IS NOT NULL
        OR to_regclass('public.expense_evidence_exceptions') IS NOT NULL
        OR to_regclass('public.expense_reimbursement_settlements') IS NOT NULL
        OR to_regclass('public.cash_advance_expense_settlements') IS NOT NULL
        OR to_regclass('public.petty_cash_transactions') IS NOT NULL
        OR to_regclass('public.expense_accountability_summaries') IS NOT NULL
    THEN
        RAISE EXCEPTION 'W5A preflight failed: target W5A objects already exist';
    END IF;
END;
$$;

-- 2. AUDIT LOG ACTION COMPATIBILITY (FI-008 Runtime Lesson)
-- Preserves all 12 prior authoritative actions and appends the exact 16 W5 domain actions.
ALTER TABLE public.audit_logs
    DROP CONSTRAINT audit_logs_action_check;

ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_action_check
    CHECK (
        action = ANY (
            ARRAY[
                -- Existing preserved actions
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
                -- Exact W5 domain actions
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
                'petty_cash_transaction_recorded'::text
            ]
        )
    );

-- 3. DOMAIN PERSISTENCE TABLES (Strict Topological Order)

-- 3.1 Employee Cash Advances
CREATE TABLE public.employee_cash_advances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    advance_number text UNIQUE NOT NULL,
    context_type text NOT NULL CHECK (context_type IN ('company', 'event')),
    service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
    recipient_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    purpose text NOT NULL,
    amount_issued numeric(12,2) NOT NULL CHECK (amount_issued > 0),
    amount_spent_settled numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (amount_spent_settled >= 0),
    amount_returned numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (amount_returned >= 0),
    remaining_balance numeric(12,2) GENERATED ALWAYS AS (amount_issued - amount_spent_settled - amount_returned) STORED,
    status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'issued', 'settled', 'rejected', 'cancelled')),
    requested_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    requested_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    approved_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    approved_at timestamptz,
    rejected_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    rejected_at timestamptz,
    rejection_reason text,
    issued_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    issued_at timestamptz,
    payment_reference text,
    settled_at timestamptz,
    cancelled_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    cancelled_at timestamptz,
    cancellation_reason text,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT chk_advance_context CHECK (
        (context_type = 'company' AND service_id IS NULL)
        OR (context_type = 'event' AND service_id IS NOT NULL)
    ),
    CONSTRAINT chk_advance_purpose CHECK (char_length(btrim(purpose)) >= 5),
    CONSTRAINT chk_advance_no_self_approval CHECK (
        (approved_by IS NULL)
        OR (approved_by != requested_by AND approved_by != recipient_id)
    ),
    CONSTRAINT chk_advance_no_self_rejection CHECK (rejected_by IS NULL OR rejected_by != requested_by),
    CONSTRAINT chk_advance_balance_ceiling CHECK (amount_spent_settled + amount_returned <= amount_issued),
    CONSTRAINT chk_advance_rejection CHECK (
        (status = 'rejected' AND rejected_at IS NOT NULL AND rejected_by IS NOT NULL AND char_length(btrim(rejection_reason)) >= 5)
        OR (status != 'rejected')
    ),
    CONSTRAINT chk_advance_cancellation CHECK (
        (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND char_length(btrim(cancellation_reason)) >= 5)
        OR (status != 'cancelled')
    ),
    CONSTRAINT chk_advance_approval CHECK (
        (status IN ('approved', 'issued', 'settled') AND approved_at IS NOT NULL AND approved_by IS NOT NULL)
        OR (status NOT IN ('approved', 'issued', 'settled'))
    ),
    CONSTRAINT chk_advance_issuance CHECK (
        (status IN ('issued', 'settled') AND issued_at IS NOT NULL AND issued_by IS NOT NULL)
        OR (status NOT IN ('issued', 'settled'))
    ),
    CONSTRAINT chk_advance_settled CHECK (
        (status = 'settled' AND remaining_balance = 0.00 AND settled_at IS NOT NULL)
        OR (status != 'settled')
    )
);

-- 3.2 Cash Advance Returns (Immutable Return Evidence)
CREATE TABLE public.cash_advance_returns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_advance_id uuid NOT NULL REFERENCES public.employee_cash_advances(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    receipt_reference text,
    request_id uuid NOT NULL UNIQUE,
    returned_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    returned_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    notes text
);

-- 3.3 Petty Cash Funds (Float Accounts)
-- Starts at current_balance = 0.00; funded strictly via immutable replenishment transactions
CREATE TABLE public.petty_cash_funds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_name text UNIQUE NOT NULL,
    custodian_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    float_limit numeric(12,2) NOT NULL CHECK (float_limit > 0),
    current_balance numeric(12,2) NOT NULL DEFAULT 0.00 CHECK (current_balance >= 0 AND current_balance <= float_limit),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT chk_fund_name CHECK (char_length(btrim(fund_name)) >= 3)
);

-- 3.4 Expenses (Authoritative Primary Facts)
CREATE TABLE public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number text UNIQUE NOT NULL,
    context_type text NOT NULL CHECK (context_type IN ('company', 'event')),
    service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
    expense_category text NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    currency text NOT NULL DEFAULT 'SAR' CHECK (currency = 'SAR'),
    expense_date date NOT NULL,
    origin_type text NOT NULL CHECK (origin_type IN ('company_direct', 'employee_paid')),
    payment_method text NOT NULL CHECK (payment_method IN ('company_funds', 'petty_cash', 'cash_advance', 'personal_funds')),
    cash_advance_id uuid REFERENCES public.employee_cash_advances(id) ON DELETE RESTRICT,
    petty_cash_fund_id uuid REFERENCES public.petty_cash_funds(id) ON DELETE RESTRICT,
    claimant_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    submitted_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    submitted_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'cancelled')),
    approved_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    approved_at timestamptz,
    rejected_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    rejected_at timestamptz,
    rejection_reason text,
    cancelled_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    cancelled_at timestamptz,
    cancellation_reason text,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT chk_expense_context CHECK (
        (context_type = 'company' AND service_id IS NULL)
        OR (context_type = 'event' AND service_id IS NOT NULL)
    ),
    CONSTRAINT chk_expense_origin_claimant CHECK (
        (origin_type = 'company_direct' AND claimant_id IS NULL)
        OR (origin_type = 'employee_paid' AND claimant_id IS NOT NULL)
    ),
    CONSTRAINT chk_expense_funding_path_exclusivity CHECK (
        (origin_type = 'employee_paid' AND payment_method = 'personal_funds' AND cash_advance_id IS NULL AND petty_cash_fund_id IS NULL)
        OR (origin_type = 'company_direct' AND payment_method = 'cash_advance' AND cash_advance_id IS NOT NULL AND petty_cash_fund_id IS NULL)
        OR (origin_type = 'company_direct' AND payment_method = 'petty_cash' AND petty_cash_fund_id IS NOT NULL AND cash_advance_id IS NULL)
        OR (origin_type = 'company_direct' AND payment_method = 'company_funds' AND cash_advance_id IS NULL AND petty_cash_fund_id IS NULL)
    ),
    CONSTRAINT chk_expense_no_self_approval CHECK (
        (approved_by IS NULL)
        OR (approved_by != submitted_by AND (origin_type != 'employee_paid' OR approved_by != claimant_id))
    ),
    CONSTRAINT chk_expense_no_self_rejection CHECK (rejected_by IS NULL OR rejected_by != submitted_by),
    CONSTRAINT chk_expense_rejection CHECK (
        (status = 'rejected' AND rejected_at IS NOT NULL AND rejected_by IS NOT NULL AND char_length(btrim(rejection_reason)) >= 5)
        OR (status != 'rejected')
    ),
    CONSTRAINT chk_expense_cancellation CHECK (
        (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND char_length(btrim(cancellation_reason)) >= 5)
        OR (status != 'cancelled')
    ),
    CONSTRAINT chk_expense_approval CHECK (
        (status = 'approved' AND approved_at IS NOT NULL AND approved_by IS NOT NULL)
        OR (status != 'approved')
    )
);

-- 3.5 Expense Document Links (Canonical Shared Business Document Architecture)
CREATE TABLE public.expense_documents (
    expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE RESTRICT,
    document_id uuid NOT NULL REFERENCES public.business_documents(id) ON DELETE RESTRICT,
    attached_by text NOT NULL,
    attached_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    PRIMARY KEY (expense_id, document_id),
    CONSTRAINT expense_documents_attached_by_check CHECK (char_length(btrim(attached_by)) BETWEEN 1 AND 255)
);

-- 3.6 Expense Evidence Exceptions (Controlled Missing-Evidence Invariant)
CREATE TABLE public.expense_evidence_exceptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE RESTRICT,
    reason text NOT NULL,
    accountable_owner_id uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    review_before date NOT NULL,
    disposition text NOT NULL DEFAULT 'pending' CHECK (disposition IN ('pending', 'accepted', 'rejected', 'rectified')),
    disposition_notes text,
    disposed_by uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
    disposed_at timestamptz,
    created_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    CONSTRAINT chk_evidence_exception_reason CHECK (char_length(btrim(reason)) >= 10),
    CONSTRAINT chk_evidence_exception_owner_disposer CHECK (disposed_by IS NULL OR disposed_by != accountable_owner_id),
    CONSTRAINT chk_evidence_exception_disposition CHECK (
        (disposition = 'pending' AND disposed_by IS NULL AND disposed_at IS NULL AND disposition_notes IS NULL)
        OR (disposition IN ('accepted', 'rejected', 'rectified') AND disposed_by IS NOT NULL AND disposed_at IS NOT NULL AND char_length(btrim(disposition_notes)) >= 5)
    )
);

-- 3.7 Expense Reimbursement Settlements (Immutable Reimbursement Evidence)
CREATE TABLE public.expense_reimbursement_settlements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_number text UNIQUE NOT NULL,
    expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    settlement_method text NOT NULL CHECK (settlement_method IN ('bank_transfer', 'cash', 'advance_offset')),
    payment_reference text,
    request_id uuid NOT NULL UNIQUE,
    settled_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    settled_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    notes text
);

-- 3.8 Cash Advance Expense Settlements (Immutable Spend Allocation Evidence)
CREATE TABLE public.cash_advance_expense_settlements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_advance_id uuid NOT NULL REFERENCES public.employee_cash_advances(id) ON DELETE RESTRICT,
    expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    request_id uuid NOT NULL UNIQUE,
    settled_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    settled_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    notes text
);

-- 3.9 Petty Cash Transactions (Immutable Float Ledger)
CREATE TABLE public.petty_cash_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fund_id uuid NOT NULL REFERENCES public.petty_cash_funds(id) ON DELETE RESTRICT,
    transaction_type text NOT NULL CHECK (transaction_type IN ('replenishment', 'disbursement', 'return')),
    amount numeric(12,2) NOT NULL CHECK (amount > 0),
    balance_before numeric(12,2) NOT NULL CHECK (balance_before >= 0),
    balance_after numeric(12,2) NOT NULL CHECK (balance_after >= 0),
    expense_id uuid REFERENCES public.expenses(id) ON DELETE RESTRICT,
    reference text,
    request_id uuid NOT NULL UNIQUE,
    recorded_by uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    recorded_at timestamptz NOT NULL DEFAULT transaction_timestamp(),
    notes text,
    CONSTRAINT chk_petty_cash_expense_linkage CHECK (
        (transaction_type = 'disbursement' AND (expense_id IS NULL OR expense_id IS NOT NULL))
        OR (transaction_type IN ('replenishment', 'return') AND expense_id IS NULL)
    ),
    CONSTRAINT chk_petty_cash_balance_flow CHECK (
        (transaction_type IN ('replenishment', 'return') AND balance_after = balance_before + amount)
        OR (transaction_type = 'disbursement' AND balance_after = balance_before - amount)
    )
);

-- 4. PERFORMANCE & UNIQUENESS INDEXES
CREATE INDEX idx_expenses_service_date ON public.expenses(service_id, expense_date DESC);
CREATE INDEX idx_expenses_submitted_status ON public.expenses(submitted_by, status);
CREATE INDEX idx_expenses_origin_payment ON public.expenses(origin_type, payment_method);
CREATE INDEX idx_advances_recipient_status ON public.employee_cash_advances(recipient_id, status);
CREATE INDEX idx_advances_service ON public.employee_cash_advances(service_id);
CREATE INDEX idx_expense_docs_expense ON public.expense_documents(expense_id, attached_at DESC);
CREATE INDEX idx_expense_exceptions_expense ON public.expense_evidence_exceptions(expense_id, disposition);
CREATE INDEX idx_expense_reimbursements_expense ON public.expense_reimbursement_settlements(expense_id, settled_at DESC);
CREATE INDEX idx_adv_settlements_advance ON public.cash_advance_expense_settlements(cash_advance_id);
CREATE INDEX idx_adv_settlements_expense ON public.cash_advance_expense_settlements(expense_id);
CREATE INDEX idx_petty_cash_tx_fund ON public.petty_cash_transactions(fund_id, recorded_at DESC);
CREATE INDEX idx_petty_cash_tx_expense ON public.petty_cash_transactions(expense_id) WHERE expense_id IS NOT NULL;
CREATE INDEX idx_audit_logs_w5_request_id ON public.audit_logs ((details ->> 'request_id')) WHERE details ->> 'request_id' IS NOT NULL;

-- 5. AUTHORITATIVE DERIVED ACCOUNTABILITY VIEW
-- Derives all settlement aggregates, reimbursement status, and evidence status on-the-fly without data duplication.
CREATE VIEW public.expense_accountability_summaries AS
WITH doc_counts AS (
    SELECT expense_id, count(*)::int AS document_count
    FROM public.expense_documents
    GROUP BY expense_id
),
exception_info AS (
    SELECT DISTINCT ON (expense_id)
        expense_id,
        id AS exception_id,
        disposition,
        review_before,
        accountable_owner_id
    FROM public.expense_evidence_exceptions
    ORDER BY expense_id, created_at DESC
),
reimbursement_sums AS (
    SELECT expense_id, COALESCE(SUM(amount), 0)::numeric(12,2) AS reimbursed_amount
    FROM public.expense_reimbursement_settlements
    GROUP BY expense_id
),
advance_settlement_sums AS (
    SELECT expense_id, COALESCE(SUM(amount), 0)::numeric(12,2) AS advance_allocated_amount
    FROM public.cash_advance_expense_settlements
    GROUP BY expense_id
),
petty_cash_sums AS (
    SELECT expense_id, COALESCE(SUM(amount), 0)::numeric(12,2) AS petty_cash_allocated_amount
    FROM public.petty_cash_transactions
    WHERE transaction_type = 'disbursement' AND expense_id IS NOT NULL
    GROUP BY expense_id
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
    ex.accountable_owner_id AS exception_accountable_owner_id
FROM public.expenses e
LEFT JOIN doc_counts dc ON dc.expense_id = e.id
LEFT JOIN exception_info ex ON ex.expense_id = e.id
LEFT JOIN reimbursement_sums r ON r.expense_id = e.id
LEFT JOIN advance_settlement_sums adv ON adv.expense_id = e.id
LEFT JOIN petty_cash_sums pc ON pc.expense_id = e.id;

-- 6. AUTHORITATIVE TRANSACTIONAL RPC FUNCTIONS (16 Operations)

-- 6.1 Submit Expense
CREATE OR REPLACE FUNCTION public.submit_expense(
    p_expense_number text,
    p_context_type text,
    p_service_id uuid,
    p_expense_category text,
    p_description text,
    p_amount numeric,
    p_expense_date date,
    p_origin_type text,
    p_payment_method text,
    p_cash_advance_id uuid,
    p_petty_cash_fund_id uuid,
    p_claimant_id uuid,
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
    v_existing_id uuid;
    v_existing_payload jsonb;
    v_new_payload jsonb;
    v_id uuid;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL OR p_request_id IS NULL THEN
        RETURN QUERY SELECT 'request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    v_new_payload := jsonb_build_object(
        'expense_number', p_expense_number,
        'context_type', p_context_type,
        'service_id', p_service_id,
        'expense_category', p_expense_category,
        'description', p_description,
        'amount', p_amount,
        'expense_date', p_expense_date,
        'origin_type', p_origin_type,
        'payment_method', p_payment_method,
        'cash_advance_id', p_cash_advance_id,
        'petty_cash_fund_id', p_petty_cash_fund_id,
        'claimant_id', p_claimant_id
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:expense_submit:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_existing_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense'
      AND a.details ->> 'operation' = 'submit_expense'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    IF FOUND THEN
        IF v_existing_payload IS DISTINCT FROM v_new_payload THEN
            RETURN QUERY SELECT 'expense_submit_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    -- Funding path exclusivity validations
    IF p_origin_type = 'employee_paid' AND p_payment_method != 'personal_funds' THEN
        RETURN QUERY SELECT 'employee_paid_requires_personal_funds'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_origin_type = 'company_direct' AND p_payment_method = 'personal_funds' THEN
        RETURN QUERY SELECT 'company_direct_cannot_use_personal_funds'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_payment_method = 'cash_advance' AND p_cash_advance_id IS NULL THEN
        RETURN QUERY SELECT 'cash_advance_id_required'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_payment_method = 'petty_cash' AND p_petty_cash_fund_id IS NULL THEN
        RETURN QUERY SELECT 'petty_cash_fund_id_required'::text, NULL::uuid, false;
        RETURN;
    END IF;

    INSERT INTO public.expenses (
        expense_number, context_type, service_id, expense_category, description,
        amount, currency, expense_date, origin_type, payment_method,
        cash_advance_id, petty_cash_fund_id, claimant_id, submitted_by, submitted_at, status
    ) VALUES (
        p_expense_number, p_context_type, p_service_id, p_expense_category, p_description,
        p_amount, 'SAR', p_expense_date, p_origin_type, p_payment_method,
        p_cash_advance_id, p_petty_cash_fund_id, p_claimant_id, v_actor_uuid, v_now, 'submitted'
    )
    RETURNING id INTO v_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_submitted', 'expense', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'submit_expense',
            'request_id', p_request_id::text,
            'payload', v_new_payload,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 'expense_number_already_exists'::text, NULL::uuid, false;
WHEN OTHERS THEN
    RETURN QUERY SELECT 'expense_submit_failed'::text, NULL::uuid, false;
END;
$$;

-- 6.2 Approve Expense
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
    END IF;

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

    SELECT submitted_by, claimant_id, origin_type, status
    INTO v_submitted_by, v_claimant_id, v_origin_type, v_status
    FROM public.expenses
    WHERE id = p_expense_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'expense_not_found'::text, p_expense_id, false;
        RETURN;
    END IF;

    IF v_submitted_by = v_actor_uuid THEN
        RETURN QUERY SELECT 'expense_self_approval_forbidden'::text, p_expense_id, false;
        RETURN;
    END IF;

    IF v_origin_type = 'employee_paid' AND v_claimant_id = v_actor_uuid THEN
        RETURN QUERY SELECT 'expense_claimant_self_approval_forbidden'::text, p_expense_id, false;
        RETURN;
    END IF;

    IF v_status != 'submitted' THEN
        RETURN QUERY SELECT 'expense_invalid_state_for_approval'::text, p_expense_id, false;
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

-- 6.3 Reject Expense
CREATE OR REPLACE FUNCTION public.reject_expense(
    p_expense_id uuid,
    p_rejection_reason text,
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
    v_status text;
    v_existing_id uuid;
    v_payload jsonb;
    v_audit_payload jsonb;
BEGIN
    IF p_expense_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
       OR NULLIF(btrim(p_rejection_reason), '') IS NULL OR char_length(btrim(p_rejection_reason)) < 5 THEN
        RETURN QUERY SELECT 'rejection_reason_invalid'::text, p_expense_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_expense_id, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object('expense_id', p_expense_id, 'rejection_reason', btrim(p_rejection_reason));

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:expense_reject:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense'
      AND a.details ->> 'operation' = 'reject_expense'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_expense_id THEN
            RETURN QUERY SELECT 'expense_reject_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT submitted_by, status INTO v_submitted_by, v_status
    FROM public.expenses
    WHERE id = p_expense_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'expense_not_found'::text, p_expense_id, false;
        RETURN;
    END IF;

    IF v_submitted_by = v_actor_uuid THEN
        RETURN QUERY SELECT 'expense_self_rejection_forbidden'::text, p_expense_id, false;
        RETURN;
    END IF;

    IF v_status != 'submitted' THEN
        RETURN QUERY SELECT 'expense_invalid_state_for_rejection'::text, p_expense_id, false;
        RETURN;
    END IF;

    UPDATE public.expenses
    SET status = 'rejected',
        rejected_by = v_actor_uuid,
        rejected_at = v_now,
        rejection_reason = btrim(p_rejection_reason),
        updated_at = v_now
    WHERE id = p_expense_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_rejected', 'expense', p_expense_id, p_actor_id,
        jsonb_build_object(
            'operation', 'reject_expense',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'reason', btrim(p_rejection_reason),
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_expense_id, false;
END;
$$;

-- 6.4 Cancel Expense
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
    END IF;

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

    SELECT status INTO v_status
    FROM public.expenses
    WHERE id = p_expense_id
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
    SELECT count(*) INTO v_reimbursement_count FROM public.expense_reimbursement_settlements WHERE expense_id = p_expense_id;
    SELECT count(*) INTO v_advance_allocation_count FROM public.cash_advance_expense_settlements WHERE expense_id = p_expense_id;
    SELECT count(*) INTO v_petty_cash_count FROM public.petty_cash_transactions WHERE expense_id = p_expense_id;

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

-- 6.5 Record Expense Evidence Exception
CREATE OR REPLACE FUNCTION public.record_expense_evidence_exception(
    p_expense_id uuid,
    p_reason text,
    p_accountable_owner_id uuid,
    p_review_before date,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    exception_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_existing_id uuid;
    v_doc_count int;
    v_id uuid;
    v_payload jsonb;
    v_audit_payload jsonb;
BEGIN
    IF p_expense_id IS NULL OR p_accountable_owner_id IS NULL OR p_review_before IS NULL
       OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
       OR NULLIF(btrim(p_reason), '') IS NULL OR char_length(btrim(p_reason)) < 10 THEN
        RETURN QUERY SELECT 'evidence_exception_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'expense_id', p_expense_id,
        'reason', btrim(p_reason),
        'accountable_owner_id', p_accountable_owner_id,
        'review_before', p_review_before
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:evidence_exception:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense_evidence_exception'
      AND a.details ->> 'operation' = 'record_expense_evidence_exception'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'expense_evidence_exception_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE id = p_expense_id) THEN
        RETURN QUERY SELECT 'expense_not_found'::text, NULL::uuid, false;
        RETURN;
    END IF;

    SELECT count(*) INTO v_doc_count FROM public.expense_documents WHERE expense_id = p_expense_id;
    IF v_doc_count > 0 THEN
        RETURN QUERY SELECT 'receipt_already_attached_exception_not_allowed'::text, NULL::uuid, false;
        RETURN;
    END IF;

    INSERT INTO public.expense_evidence_exceptions (
        expense_id, reason, accountable_owner_id, review_before, disposition, created_by, created_at
    ) VALUES (
        p_expense_id, btrim(p_reason), p_accountable_owner_id, p_review_before, 'pending', v_actor_uuid, v_now
    )
    RETURNING id INTO v_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_evidence_exception_recorded', 'expense_evidence_exception', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'record_expense_evidence_exception',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'expense_id', p_expense_id,
            'accountable_owner_id', p_accountable_owner_id,
            'review_before', p_review_before,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
END;
$$;

-- 6.6 Dispose Expense Evidence Exception
CREATE OR REPLACE FUNCTION public.dispose_expense_evidence_exception(
    p_exception_id uuid,
    p_disposition text,
    p_disposition_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    exception_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_owner_id uuid;
    v_current_disposition text;
    v_existing_id uuid;
    v_payload jsonb;
    v_audit_payload jsonb;
BEGIN
    IF p_exception_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
       OR p_disposition NOT IN ('accepted', 'rejected', 'rectified')
       OR NULLIF(btrim(p_disposition_notes), '') IS NULL OR char_length(btrim(p_disposition_notes)) < 5 THEN
        RETURN QUERY SELECT 'disposition_request_invalid'::text, p_exception_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_exception_id, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'exception_id', p_exception_id,
        'disposition', p_disposition,
        'disposition_notes', btrim(p_disposition_notes)
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:dispose_exception:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'expense_evidence_exception'
      AND a.details ->> 'operation' = 'dispose_expense_evidence_exception'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_exception_id THEN
            RETURN QUERY SELECT 'dispose_evidence_exception_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT accountable_owner_id, disposition INTO v_owner_id, v_current_disposition
    FROM public.expense_evidence_exceptions
    WHERE id = p_exception_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'exception_not_found'::text, p_exception_id, false;
        RETURN;
    END IF;

    IF v_owner_id = v_actor_uuid THEN
        RETURN QUERY SELECT 'exception_owner_cannot_dispose'::text, p_exception_id, false;
        RETURN;
    END IF;

    IF v_current_disposition != 'pending' THEN
        RETURN QUERY SELECT 'exception_already_disposed'::text, p_exception_id, false;
        RETURN;
    END IF;

    UPDATE public.expense_evidence_exceptions
    SET disposition = p_disposition,
        disposition_notes = btrim(p_disposition_notes),
        disposed_by = v_actor_uuid,
        disposed_at = v_now,
        updated_at = v_now
    WHERE id = p_exception_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_evidence_exception_disposed', 'expense_evidence_exception', p_exception_id, p_actor_id,
        jsonb_build_object(
            'operation', 'dispose_expense_evidence_exception',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'disposition', p_disposition,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_exception_id, false;
END;
$$;

-- 6.7 Attach Expense Document
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

    IF EXISTS (SELECT 1 FROM public.expense_documents WHERE expense_id = p_expense_id AND document_id = p_document_id) THEN
        RETURN QUERY SELECT 'document_already_attached'::text, p_expense_id, p_document_id, false;
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE id = p_expense_id) THEN
        RETURN QUERY SELECT 'expense_not_found'::text, p_expense_id, p_document_id, false;
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.business_documents WHERE id = p_document_id) THEN
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

-- 6.8 Settle Expense Reimbursement (Immutable Reimbursement Settlement)
CREATE OR REPLACE FUNCTION public.settle_expense_reimbursement(
    p_expense_id uuid,
    p_settlement_number text,
    p_amount numeric,
    p_settlement_method text,
    p_payment_reference text,
    p_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    settlement_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_origin_type text;
    v_status text;
    v_amount numeric;
    v_already_reimbursed numeric;
    v_existing_id uuid;
    v_existing_expense_id uuid;
    v_existing_amount numeric;
    v_existing_method text;
    v_existing_ref text;
    v_existing_num text;
    v_id uuid;
BEGIN
    IF p_expense_id IS NULL OR p_request_id IS NULL OR p_amount IS NULL OR p_amount <= 0
       OR p_settlement_method NOT IN ('bank_transfer', 'cash', 'advance_offset')
       OR NULLIF(btrim(p_settlement_number), '') IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'settlement_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:reimburse_settle:' || p_request_id::text, 0));

    SELECT id, expense_id, amount, settlement_method, payment_reference, settlement_number
    INTO v_existing_id, v_existing_expense_id, v_existing_amount, v_existing_method, v_existing_ref, v_existing_num
    FROM public.expense_reimbursement_settlements
    WHERE request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_expense_id IS DISTINCT FROM p_expense_id
           OR v_existing_amount IS DISTINCT FROM p_amount
           OR v_existing_method IS DISTINCT FROM p_settlement_method
           OR v_existing_ref IS DISTINCT FROM p_payment_reference
           OR v_existing_num IS DISTINCT FROM p_settlement_number THEN
            RETURN QUERY SELECT 'expense_reimbursement_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT origin_type, status, amount INTO v_origin_type, v_status, v_amount
    FROM public.expenses
    WHERE id = p_expense_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'expense_not_found'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_status != 'approved' THEN
        RETURN QUERY SELECT 'expense_not_approved_for_reimbursement'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_origin_type != 'employee_paid' THEN
        RETURN QUERY SELECT 'expense_not_eligible_for_reimbursement'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Fail-closed if rejected evidence exception exists
    IF EXISTS (
        SELECT 1 FROM public.expense_evidence_exceptions
        WHERE expense_id = p_expense_id AND disposition = 'rejected'
    ) THEN
        RETURN QUERY SELECT 'expense_evidence_rejected_cannot_reimburse'::text, NULL::uuid, false;
        RETURN;
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_already_reimbursed
    FROM public.expense_reimbursement_settlements
    WHERE expense_id = p_expense_id;

    IF v_already_reimbursed + p_amount > v_amount THEN
        RETURN QUERY SELECT 'reimbursement_exceeds_expense_ceiling'::text, NULL::uuid, false;
        RETURN;
    END IF;

    INSERT INTO public.expense_reimbursement_settlements (
        settlement_number, expense_id, amount, settlement_method, payment_reference,
        request_id, settled_by, settled_at, notes
    ) VALUES (
        p_settlement_number, p_expense_id, p_amount, p_settlement_method, p_payment_reference,
        p_request_id, v_actor_uuid, v_now, p_notes
    )
    RETURNING id INTO v_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'expense_reimbursement_settled', 'expense_reimbursement_settlement', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'settle_expense_reimbursement',
            'request_id', p_request_id::text,
            'payload', jsonb_build_object(
                'expense_id', p_expense_id,
                'settlement_number', p_settlement_number,
                'amount', p_amount,
                'settlement_method', p_settlement_method,
                'payment_reference', p_payment_reference
            ),
            'expense_id', p_expense_id,
            'amount', p_amount,
            'settlement_method', p_settlement_method,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
END;
$$;

-- 6.9 Request Cash Advance
CREATE OR REPLACE FUNCTION public.request_cash_advance(
    p_advance_number text,
    p_context_type text,
    p_service_id uuid,
    p_recipient_id uuid,
    p_purpose text,
    p_amount_issued numeric,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    advance_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_existing_id uuid;
    v_existing_payload jsonb;
    v_new_payload jsonb;
    v_id uuid;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL OR p_request_id IS NULL OR p_recipient_id IS NULL
       OR p_amount_issued IS NULL OR p_amount_issued <= 0
       OR NULLIF(btrim(p_advance_number), '') IS NULL
       OR NULLIF(btrim(p_purpose), '') IS NULL OR char_length(btrim(p_purpose)) < 5 THEN
        RETURN QUERY SELECT 'cash_advance_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    v_new_payload := jsonb_build_object(
        'advance_number', p_advance_number,
        'context_type', p_context_type,
        'service_id', p_service_id,
        'recipient_id', p_recipient_id,
        'purpose', btrim(p_purpose),
        'amount_issued', p_amount_issued
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_request:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_existing_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'employee_cash_advance'
      AND a.details ->> 'operation' = 'request_cash_advance'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    IF FOUND THEN
        IF v_existing_payload IS DISTINCT FROM v_new_payload THEN
            RETURN QUERY SELECT 'cash_advance_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    INSERT INTO public.employee_cash_advances (
        advance_number, context_type, service_id, recipient_id, purpose,
        amount_issued, requested_by, requested_at, status
    ) VALUES (
        p_advance_number, p_context_type, p_service_id, p_recipient_id, btrim(p_purpose),
        p_amount_issued, v_actor_uuid, v_now, 'submitted'
    )
    RETURNING id INTO v_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_requested', 'employee_cash_advance', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'request_cash_advance',
            'request_id', p_request_id::text,
            'payload', v_new_payload,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 'advance_number_already_exists'::text, NULL::uuid, false;
WHEN OTHERS THEN
    RETURN QUERY SELECT 'advance_request_failed'::text, NULL::uuid, false;
END;
$$;

-- 6.10 Approve Cash Advance
CREATE OR REPLACE FUNCTION public.approve_cash_advance(
    p_advance_id uuid,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    advance_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_requested_by uuid;
    v_recipient_id uuid;
    v_status text;
    v_existing_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
BEGIN
    IF p_advance_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'request_invalid'::text, p_advance_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_advance_id, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object('advance_id', p_advance_id);

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_approve:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'employee_cash_advance'
      AND a.details ->> 'operation' = 'approve_cash_advance'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_advance_id THEN
            RETURN QUERY SELECT 'cash_advance_approve_request_conflict'::text, p_advance_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT requested_by, recipient_id, status INTO v_requested_by, v_recipient_id, v_status
    FROM public.employee_cash_advances
    WHERE id = p_advance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'advance_not_found'::text, p_advance_id, false;
        RETURN;
    END IF;

    IF v_requested_by = v_actor_uuid THEN
        RETURN QUERY SELECT 'advance_self_approval_forbidden'::text, p_advance_id, false;
        RETURN;
    END IF;

    IF v_recipient_id = v_actor_uuid THEN
        RETURN QUERY SELECT 'advance_recipient_self_approval_forbidden'::text, p_advance_id, false;
        RETURN;
    END IF;

    IF v_status != 'submitted' THEN
        RETURN QUERY SELECT 'advance_invalid_state_for_approval'::text, p_advance_id, false;
        RETURN;
    END IF;

    UPDATE public.employee_cash_advances
    SET status = 'approved',
        approved_by = v_actor_uuid,
        approved_at = v_now,
        updated_at = v_now
    WHERE id = p_advance_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_approved', 'employee_cash_advance', p_advance_id, p_actor_id,
        jsonb_build_object(
            'operation', 'approve_cash_advance',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_advance_id, false;
END;
$$;

-- 6.11 Reject Cash Advance
CREATE OR REPLACE FUNCTION public.reject_cash_advance(
    p_advance_id uuid,
    p_rejection_reason text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    advance_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_requested_by uuid;
    v_status text;
    v_existing_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
BEGIN
    IF p_advance_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
       OR NULLIF(btrim(p_rejection_reason), '') IS NULL OR char_length(btrim(p_rejection_reason)) < 5 THEN
        RETURN QUERY SELECT 'advance_rejection_reason_invalid'::text, p_advance_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_advance_id, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'advance_id', p_advance_id,
        'reason', btrim(p_rejection_reason)
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_reject:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'employee_cash_advance'
      AND a.details ->> 'operation' = 'reject_cash_advance'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_advance_id THEN
            RETURN QUERY SELECT 'cash_advance_reject_request_conflict'::text, p_advance_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT requested_by, status INTO v_requested_by, v_status
    FROM public.employee_cash_advances
    WHERE id = p_advance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'advance_not_found'::text, p_advance_id, false;
        RETURN;
    END IF;

    IF v_requested_by = v_actor_uuid THEN
        RETURN QUERY SELECT 'advance_self_rejection_forbidden'::text, p_advance_id, false;
        RETURN;
    END IF;

    IF v_status != 'submitted' THEN
        RETURN QUERY SELECT 'advance_invalid_state_for_rejection'::text, p_advance_id, false;
        RETURN;
    END IF;

    UPDATE public.employee_cash_advances
    SET status = 'rejected',
        rejected_by = v_actor_uuid,
        rejected_at = v_now,
        rejection_reason = btrim(p_rejection_reason),
        updated_at = v_now
    WHERE id = p_advance_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_rejected', 'employee_cash_advance', p_advance_id, p_actor_id,
        jsonb_build_object(
            'operation', 'reject_cash_advance',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'reason', btrim(p_rejection_reason),
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_advance_id, false;
END;
$$;

-- 6.12 Cancel Cash Advance
CREATE OR REPLACE FUNCTION public.cancel_cash_advance(
    p_advance_id uuid,
    p_cancellation_reason text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    advance_id uuid,
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
    v_existing_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
BEGIN
    IF p_advance_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL
       OR NULLIF(btrim(p_cancellation_reason), '') IS NULL OR char_length(btrim(p_cancellation_reason)) < 5 THEN
        RETURN QUERY SELECT 'advance_cancellation_reason_invalid'::text, p_advance_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_advance_id, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'advance_id', p_advance_id,
        'reason', btrim(p_cancellation_reason)
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_cancel:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'employee_cash_advance'
      AND a.details ->> 'operation' = 'cancel_cash_advance'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_advance_id THEN
            RETURN QUERY SELECT 'cash_advance_cancel_request_conflict'::text, p_advance_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT status INTO v_status
    FROM public.employee_cash_advances
    WHERE id = p_advance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'advance_not_found'::text, p_advance_id, false;
        RETURN;
    END IF;

    IF v_status NOT IN ('draft', 'submitted', 'approved') THEN
        RETURN QUERY SELECT 'advance_cannot_cancel_once_issued'::text, p_advance_id, false;
        RETURN;
    END IF;

    UPDATE public.employee_cash_advances
    SET status = 'cancelled',
        cancelled_by = v_actor_uuid,
        cancelled_at = v_now,
        cancellation_reason = btrim(p_cancellation_reason),
        updated_at = v_now
    WHERE id = p_advance_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_cancelled', 'employee_cash_advance', p_advance_id, p_actor_id,
        jsonb_build_object(
            'operation', 'cancel_cash_advance',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'reason', btrim(p_cancellation_reason),
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_advance_id, false;
END;
$$;

-- 6.13 Issue Cash Advance
CREATE OR REPLACE FUNCTION public.issue_cash_advance(
    p_advance_id uuid,
    p_payment_reference text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    advance_id uuid,
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
    v_existing_id uuid;
    v_audit_payload jsonb;
    v_payload jsonb;
BEGIN
    IF p_advance_id IS NULL OR p_request_id IS NULL OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'request_invalid'::text, p_advance_id, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, p_advance_id, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'advance_id', p_advance_id,
        'payment_reference', p_payment_reference
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_issue:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'employee_cash_advance'
      AND a.details ->> 'operation' = 'issue_cash_advance'
      AND a.details ->> 'request_id' = p_request_id::text
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload OR v_existing_id IS DISTINCT FROM p_advance_id THEN
            RETURN QUERY SELECT 'cash_advance_issue_request_conflict'::text, p_advance_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT status INTO v_status
    FROM public.employee_cash_advances
    WHERE id = p_advance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'advance_not_found'::text, p_advance_id, false;
        RETURN;
    END IF;

    IF v_status != 'approved' THEN
        RETURN QUERY SELECT 'advance_must_be_approved_to_issue'::text, p_advance_id, false;
        RETURN;
    END IF;

    UPDATE public.employee_cash_advances
    SET status = 'issued',
        issued_by = v_actor_uuid,
        issued_at = v_now,
        payment_reference = p_payment_reference,
        updated_at = v_now
    WHERE id = p_advance_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_issued', 'employee_cash_advance', p_advance_id, p_actor_id,
        jsonb_build_object(
            'operation', 'issue_cash_advance',
            'request_id', p_request_id::text,
            'payload', v_payload,
            'payment_reference', p_payment_reference,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_advance_id, false;
END;
$$;

-- 6.14 Settle Cash Advance Spend (Immutable Allocation Record)
CREATE OR REPLACE FUNCTION public.settle_cash_advance_spend(
    p_advance_id uuid,
    p_expense_id uuid,
    p_amount numeric,
    p_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    allocation_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_advance_status text;
    v_amount_issued numeric;
    v_spent_settled numeric;
    v_returned numeric;
    v_remaining_balance numeric;
    v_expense_status text;
    v_expense_origin text;
    v_expense_payment_method text;
    v_expense_cash_advance_id uuid;
    v_expense_amount numeric;
    v_already_allocated numeric;
    v_existing_id uuid;
    v_existing_advance_id uuid;
    v_existing_expense_id uuid;
    v_existing_amount numeric;
    v_id uuid;
BEGIN
    IF p_advance_id IS NULL OR p_expense_id IS NULL OR p_request_id IS NULL
       OR p_amount IS NULL OR p_amount <= 0 OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'allocation_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_spend_settle:' || p_request_id::text, 0));

    SELECT id, cash_advance_id, expense_id, amount
    INTO v_existing_id, v_existing_advance_id, v_existing_expense_id, v_existing_amount
    FROM public.cash_advance_expense_settlements
    WHERE request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_advance_id IS DISTINCT FROM p_advance_id
           OR v_existing_expense_id IS DISTINCT FROM p_expense_id
           OR v_existing_amount IS DISTINCT FROM p_amount THEN
            RETURN QUERY SELECT 'cash_advance_settlement_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    -- Deterministic row-locking order by UUID to prevent deadlocks
    IF p_advance_id < p_expense_id THEN
        SELECT status, amount_issued, amount_spent_settled, amount_returned, remaining_balance
        INTO v_advance_status, v_amount_issued, v_spent_settled, v_returned, v_remaining_balance
        FROM public.employee_cash_advances WHERE id = p_advance_id FOR UPDATE;

        SELECT status, origin_type, payment_method, cash_advance_id, amount
        INTO v_expense_status, v_expense_origin, v_expense_payment_method, v_expense_cash_advance_id, v_expense_amount
        FROM public.expenses WHERE id = p_expense_id FOR UPDATE;
    ELSE
        SELECT status, origin_type, payment_method, cash_advance_id, amount
        INTO v_expense_status, v_expense_origin, v_expense_payment_method, v_expense_cash_advance_id, v_expense_amount
        FROM public.expenses WHERE id = p_expense_id FOR UPDATE;

        SELECT status, amount_issued, amount_spent_settled, amount_returned, remaining_balance
        INTO v_advance_status, v_amount_issued, v_spent_settled, v_returned, v_remaining_balance
        FROM public.employee_cash_advances WHERE id = p_advance_id FOR UPDATE;
    END IF;

    IF v_advance_status IS NULL THEN
        RETURN QUERY SELECT 'advance_not_found'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_expense_status IS NULL THEN
        RETURN QUERY SELECT 'expense_not_found'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_advance_status != 'issued' THEN
        RETURN QUERY SELECT 'advance_not_in_issued_status'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_expense_status != 'approved' THEN
        RETURN QUERY SELECT 'expense_not_in_approved_status'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Funding path exclusivity validation: must be company_direct with cash_advance payment method
    IF v_expense_origin != 'company_direct' OR v_expense_payment_method != 'cash_advance' OR v_expense_cash_advance_id != p_advance_id THEN
        RETURN QUERY SELECT 'expense_not_eligible_for_advance_settlement'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Double-bounded checks:
    -- Bound 1: Cannot exceed advance remaining balance
    IF p_amount > v_remaining_balance THEN
        RETURN QUERY SELECT 'allocation_exceeds_remaining_advance_balance'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Bound 2: Cannot exceed expense total amount
    SELECT COALESCE(SUM(amount), 0) INTO v_already_allocated
    FROM public.cash_advance_expense_settlements
    WHERE expense_id = p_expense_id;

    IF v_already_allocated + p_amount > v_expense_amount THEN
        RETURN QUERY SELECT 'allocation_exceeds_expense_amount'::text, NULL::uuid, false;
        RETURN;
    END IF;

    INSERT INTO public.cash_advance_expense_settlements (
        cash_advance_id, expense_id, amount, request_id, settled_by, settled_at, notes
    ) VALUES (
        p_advance_id, p_expense_id, p_amount, p_request_id, v_actor_uuid, v_now, p_notes
    )
    RETURNING id INTO v_id;

    -- Authoritatively reconcile aggregate on employee_cash_advances
    UPDATE public.employee_cash_advances
    SET amount_spent_settled = amount_spent_settled + p_amount,
        status = CASE WHEN (amount_spent_settled + p_amount + amount_returned) = amount_issued THEN 'settled' ELSE status END,
        settled_at = CASE WHEN (amount_spent_settled + p_amount + amount_returned) = amount_issued THEN v_now ELSE settled_at END,
        updated_at = v_now
    WHERE id = p_advance_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_expense_settled', 'cash_advance_expense_settlement', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'settle_cash_advance_spend',
            'request_id', p_request_id::text,
            'payload', jsonb_build_object(
                'cash_advance_id', p_advance_id,
                'expense_id', p_expense_id,
                'amount', p_amount
            ),
            'cash_advance_id', p_advance_id,
            'expense_id', p_expense_id,
            'amount', p_amount,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
END;
$$;

-- 6.15 Record Cash Advance Return (Immutable Return Record)
CREATE OR REPLACE FUNCTION public.record_cash_advance_return(
    p_advance_id uuid,
    p_amount numeric,
    p_receipt_reference text,
    p_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    return_id uuid,
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
    v_amount_issued numeric;
    v_spent_settled numeric;
    v_returned numeric;
    v_remaining_balance numeric;
    v_existing_id uuid;
    v_existing_advance_id uuid;
    v_existing_amount numeric;
    v_existing_ref text;
    v_id uuid;
BEGIN
    IF p_advance_id IS NULL OR p_request_id IS NULL OR p_amount IS NULL OR p_amount <= 0
       OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'return_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:advance_return:' || p_request_id::text, 0));

    SELECT id, cash_advance_id, amount, receipt_reference
    INTO v_existing_id, v_existing_advance_id, v_existing_amount, v_existing_ref
    FROM public.cash_advance_returns
    WHERE request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_advance_id IS DISTINCT FROM p_advance_id
           OR v_existing_amount IS DISTINCT FROM p_amount
           OR v_existing_ref IS DISTINCT FROM p_receipt_reference THEN
            RETURN QUERY SELECT 'cash_advance_return_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    SELECT status, amount_issued, amount_spent_settled, amount_returned, remaining_balance
    INTO v_status, v_amount_issued, v_spent_settled, v_returned, v_remaining_balance
    FROM public.employee_cash_advances
    WHERE id = p_advance_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'advance_not_found'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_status != 'issued' THEN
        RETURN QUERY SELECT 'advance_must_be_issued_to_record_return'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF p_amount > v_remaining_balance THEN
        RETURN QUERY SELECT 'return_amount_exceeds_remaining_balance'::text, NULL::uuid, false;
        RETURN;
    END IF;

    INSERT INTO public.cash_advance_returns (
        cash_advance_id, amount, receipt_reference, request_id, returned_by, returned_at, notes
    ) VALUES (
        p_advance_id, p_amount, p_receipt_reference, p_request_id, v_actor_uuid, v_now, p_notes
    )
    RETURNING id INTO v_id;

    -- Authoritatively reconcile aggregate on employee_cash_advances
    UPDATE public.employee_cash_advances
    SET amount_returned = amount_returned + p_amount,
        status = CASE WHEN (amount_spent_settled + amount_returned + p_amount) = amount_issued THEN 'settled' ELSE status END,
        settled_at = CASE WHEN (amount_spent_settled + amount_returned + p_amount) = amount_issued THEN v_now ELSE settled_at END,
        updated_at = v_now
    WHERE id = p_advance_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'cash_advance_returned', 'cash_advance_return', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'record_cash_advance_return',
            'request_id', p_request_id::text,
            'payload', jsonb_build_object(
                'cash_advance_id', p_advance_id,
                'amount', p_amount,
                'receipt_reference', p_receipt_reference
            ),
            'cash_advance_id', p_advance_id,
            'amount', p_amount,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
END;
$$;

-- 6.16 Record Petty Cash Transaction (Immutable Float Ledger)
CREATE OR REPLACE FUNCTION public.record_petty_cash_transaction(
    p_fund_id uuid,
    p_transaction_type text,
    p_amount numeric,
    p_reference text,
    p_expense_id uuid,
    p_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    transaction_id uuid,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_actor_uuid uuid;
    v_fund_status text;
    v_float_limit numeric;
    v_current_balance numeric;
    v_balance_after numeric;
    v_expense_status text;
    v_expense_origin text;
    v_expense_payment_method text;
    v_expense_petty_cash_fund_id uuid;
    v_expense_amount numeric;
    v_already_disbursed_on_expense numeric;
    v_existing_id uuid;
    v_existing_fund_id uuid;
    v_existing_type text;
    v_existing_amount numeric;
    v_existing_expense_id uuid;
    v_existing_ref text;
    v_id uuid;
BEGIN
    IF p_fund_id IS NULL OR p_request_id IS NULL OR p_amount IS NULL OR p_amount <= 0
       OR p_transaction_type NOT IN ('replenishment', 'disbursement', 'return')
       OR NULLIF(btrim(p_actor_id), '') IS NULL THEN
        RETURN QUERY SELECT 'transaction_request_invalid'::text, NULL::uuid, false;
        RETURN;
    END IF;

    BEGIN
        v_actor_uuid := p_actor_id::uuid;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'invalid_actor_id'::text, NULL::uuid, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w5a:petty_cash_tx:' || p_request_id::text, 0));

    SELECT id, fund_id, transaction_type, amount, expense_id, reference
    INTO v_existing_id, v_existing_fund_id, v_existing_type, v_existing_amount, v_existing_expense_id, v_existing_ref
    FROM public.petty_cash_transactions
    WHERE request_id = p_request_id;

    IF FOUND THEN
        IF v_existing_fund_id IS DISTINCT FROM p_fund_id
           OR v_existing_type IS DISTINCT FROM p_transaction_type
           OR v_existing_amount IS DISTINCT FROM p_amount
           OR v_existing_expense_id IS DISTINCT FROM p_expense_id
           OR v_existing_ref IS DISTINCT FROM p_reference THEN
            RETURN QUERY SELECT 'petty_cash_transaction_request_conflict'::text, v_existing_id, false;
            RETURN;
        END IF;
        RETURN QUERY SELECT NULL::text, v_existing_id, true;
        RETURN;
    END IF;

    -- Lock fund row
    SELECT status, float_limit, current_balance
    INTO v_fund_status, v_float_limit, v_current_balance
    FROM public.petty_cash_funds
    WHERE id = p_fund_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'petty_cash_fund_not_found'::text, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_fund_status != 'active' THEN
        RETURN QUERY SELECT 'petty_cash_fund_not_active'::text, NULL::uuid, false;
        RETURN;
    END IF;

    -- Handle disbursement with Expense linkage
    IF p_transaction_type = 'disbursement' THEN
        IF v_current_balance < p_amount THEN
            RETURN QUERY SELECT 'insufficient_petty_cash_balance'::text, NULL::uuid, false;
            RETURN;
        END IF;

        IF p_expense_id IS NOT NULL THEN
            SELECT status, origin_type, payment_method, petty_cash_fund_id, amount
            INTO v_expense_status, v_expense_origin, v_expense_payment_method, v_expense_petty_cash_fund_id, v_expense_amount
            FROM public.expenses
            WHERE id = p_expense_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RETURN QUERY SELECT 'expense_not_found'::text, NULL::uuid, false;
                RETURN;
            END IF;

            IF v_expense_status != 'approved' THEN
                RETURN QUERY SELECT 'expense_must_be_approved_for_petty_cash_disbursement'::text, NULL::uuid, false;
                RETURN;
            END IF;

            IF v_expense_origin != 'company_direct' OR v_expense_payment_method != 'petty_cash' OR v_expense_petty_cash_fund_id != p_fund_id THEN
                RETURN QUERY SELECT 'expense_not_eligible_for_petty_cash'::text, NULL::uuid, false;
                RETURN;
            END IF;

            SELECT COALESCE(SUM(amount), 0) INTO v_already_disbursed_on_expense
            FROM public.petty_cash_transactions
            WHERE expense_id = p_expense_id AND transaction_type = 'disbursement';

            IF v_already_disbursed_on_expense + p_amount > v_expense_amount THEN
                RETURN QUERY SELECT 'disbursement_exceeds_expense_ceiling'::text, NULL::uuid, false;
                RETURN;
            END IF;
        END IF;

        v_balance_after := v_current_balance - p_amount;
    ELSE
        -- replenishment or return
        IF p_expense_id IS NOT NULL THEN
            RETURN QUERY SELECT 'non_disbursement_cannot_link_to_expense'::text, NULL::uuid, false;
            RETURN;
        END IF;

        IF v_current_balance + p_amount > v_float_limit THEN
            RETURN QUERY SELECT 'replenishment_exceeds_float_limit'::text, NULL::uuid, false;
            RETURN;
        END IF;

        v_balance_after := v_current_balance + p_amount;
    END IF;

    INSERT INTO public.petty_cash_transactions (
        fund_id, transaction_type, amount, balance_before, balance_after,
        expense_id, reference, request_id, recorded_by, recorded_at, notes
    ) VALUES (
        p_fund_id, p_transaction_type, p_amount, v_current_balance, v_balance_after,
        p_expense_id, p_reference, p_request_id, v_actor_uuid, v_now, p_notes
    )
    RETURNING id INTO v_id;

    UPDATE public.petty_cash_funds
    SET current_balance = v_balance_after,
        updated_at = v_now
    WHERE id = p_fund_id;

    INSERT INTO public.audit_logs (action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'petty_cash_transaction_recorded', 'petty_cash_transaction', v_id, p_actor_id,
        jsonb_build_object(
            'operation', 'record_petty_cash_transaction',
            'request_id', p_request_id::text,
            'payload', jsonb_build_object(
                'fund_id', p_fund_id,
                'transaction_type', p_transaction_type,
                'amount', p_amount,
                'expense_id', p_expense_id,
                'reference', p_reference
            ),
            'fund_id', p_fund_id,
            'transaction_type', p_transaction_type,
            'amount', p_amount,
            'balance_after', v_balance_after,
            'actor_role', p_actor_role
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, v_id, false;
END;
$$;

-- 7. RLS SECURITY POLICIES & PRIVILEGES
ALTER TABLE public.employee_cash_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_advance_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_evidence_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_reimbursement_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_advance_expense_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petty_cash_transactions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.employee_cash_advances FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cash_advance_returns FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.petty_cash_funds FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.expenses FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.expense_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.expense_evidence_exceptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.expense_reimbursement_settlements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.cash_advance_expense_settlements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.petty_cash_transactions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.expense_accountability_summaries FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.employee_cash_advances TO service_role;
GRANT ALL ON TABLE public.cash_advance_returns TO service_role;
GRANT ALL ON TABLE public.petty_cash_funds TO service_role;
GRANT ALL ON TABLE public.expenses TO service_role;
GRANT ALL ON TABLE public.expense_documents TO service_role;
GRANT ALL ON TABLE public.expense_evidence_exceptions TO service_role;
GRANT ALL ON TABLE public.expense_reimbursement_settlements TO service_role;
GRANT ALL ON TABLE public.cash_advance_expense_settlements TO service_role;
GRANT ALL ON TABLE public.petty_cash_transactions TO service_role;
GRANT ALL ON TABLE public.expense_accountability_summaries TO service_role;

REVOKE ALL ON FUNCTION public.submit_expense FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_expense FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_expense FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_expense FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_expense_evidence_exception FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispose_expense_evidence_exception FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_expense_document FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_expense_reimbursement FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_cash_advance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_cash_advance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_cash_advance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_cash_advance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_cash_advance FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_cash_advance_spend FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_cash_advance_return FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_petty_cash_transaction FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_expense TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_expense TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_expense TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_expense TO service_role;
GRANT EXECUTE ON FUNCTION public.record_expense_evidence_exception TO service_role;
GRANT EXECUTE ON FUNCTION public.dispose_expense_evidence_exception TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_expense_document TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_expense_reimbursement TO service_role;
GRANT EXECUTE ON FUNCTION public.request_cash_advance TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_cash_advance TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_cash_advance TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_cash_advance TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_cash_advance TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_cash_advance_spend TO service_role;
GRANT EXECUTE ON FUNCTION public.record_cash_advance_return TO service_role;
GRANT EXECUTE ON FUNCTION public.record_petty_cash_transaction TO service_role;

COMMIT;
