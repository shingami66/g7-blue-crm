-- Approved Billing Scope financial lifecycle and transactional RPC packet.
-- This migration is intentionally unapplied; application permissions remain
-- mandatory before the service-role-only routines are called.
-- Public RPC parameter counts intentionally match the locked external contracts.

BEGIN;

DO $$
DECLARE
    v_required_column_count integer;
BEGIN
    IF to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regclass('public.approved_billing_scope_items') IS NULL
        OR to_regclass('public.services') IS NULL
        OR to_regclass('public.quotations') IS NULL
        OR to_regclass('public.invoices') IS NULL
        OR to_regclass('public.payments') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_required_table_missing';
    END IF;

    SELECT count(*)
    INTO v_required_column_count
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND (
          (c.table_name = 'approved_billing_scopes' AND c.column_name IN (
              'id', 'service_id', 'source_quotation_id', 'scope_version', 'status',
              'accepted_subtotal', 'accepted_vat_amount', 'accepted_grand_total',
              'source_vat_rate', 'source_discount', 'source_currency',
              'source_quotation_subtotal', 'source_quotation_vat_amount',
              'source_quotation_grand_total', 'source_pricing_context',
              'line_safety_status', 'line_safety_reason_code', 'line_safety_note',
              'line_safety_reviewed_by', 'line_safety_reviewed_at',
              'change_summary_reason', 'approved_at', 'approved_by',
              'superseded_at', 'superseded_by_scope_id', 'voided_at', 'voided_by',
              'void_reason', 'created_by', 'updated_by', 'created_at', 'updated_at'
          ))
          OR (c.table_name = 'approved_billing_scope_items' AND c.column_name IN (
              'id', 'approved_billing_scope_id', 'source_quotation_id',
              'source_quotation_item_id', 'display_order', 'decision',
              'source_description', 'source_details', 'source_category',
              'source_qty', 'source_unit_price', 'source_subtotal',
              'source_vat_amount', 'source_grand_total', 'accepted_qty',
              'accepted_unit_price', 'accepted_subtotal', 'accepted_vat_amount',
              'accepted_grand_total', 'reason_code', 'reason_note'
          ))
          OR (c.table_name = 'invoices' AND c.column_name IN (
              'id', 'service_id', 'approved_quotation_id',
              'approved_billing_scope_id', 'grand_total', 'status', 'voided_at',
              'is_deleted'
          ))
          OR (c.table_name = 'payments' AND c.column_name IN ('id', 'invoice_id'))
          OR (c.table_name = 'services' AND c.column_name IN ('id', 'status', 'deleted_at'))
          OR (c.table_name = 'audit_logs' AND c.column_name IN (
              'action', 'entity_type', 'entity_id', 'user_id', 'details', 'timestamp'
          ))
      );

    IF v_required_column_count <> 72 THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_required_column_missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'approved_billing_scopes'
          AND c.column_name = 'supersedes_scope_id'
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_lineage_column_already_exists';
    END IF;

    IF to_regprocedure('public.record_invoice_payment(uuid,numeric,date,text,text,text)') IS NULL
        OR to_regprocedure('public.edit_approved_billing_scope_item(uuid,uuid,text,numeric,numeric,text,text,integer)') IS NULL
        OR to_regprocedure('public.discard_approved_billing_scope_draft(uuid)') IS NULL
        OR to_regprocedure('public.check_invoices_before_write()') IS NULL
        OR to_regprocedure('public.check_approved_billing_scopes_before_write()') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_required_function_missing';
    END IF;

    IF to_regclass('public.idx_approved_billing_scopes_service_id') IS NULL
        OR to_regclass('public.idx_approved_billing_scopes_one_active_per_service') IS NULL
        OR to_regclass('public.idx_invoices_approved_billing_scope_id') IS NULL
        OR to_regclass('public.idx_payments_invoice_id') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_required_index_missing';
    END IF;

    IF to_regclass('public.idx_approved_billing_scopes_supersedes_scope_id') IS NOT NULL
        OR to_regclass('public.idx_approved_billing_scopes_one_draft_per_service') IS NOT NULL
        OR to_regclass('public.idx_invoices_service_id') IS NOT NULL
        OR to_regclass('public.idx_invoices_service_applicable_exposure') IS NOT NULL
        OR EXISTS (
            SELECT 1
            FROM pg_catalog.pg_constraint c
            WHERE c.conrelid = 'public.approved_billing_scopes'::regclass
              AND c.conname IN (
                'approved_billing_scopes_supersedes_scope_not_self_check',
                'approved_billing_scopes_supersedes_scope_service_fkey'
            )
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_target_object_conflict';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN (
              'approved_billing_scopes', 'approved_billing_scope_items',
              'invoices', 'payments', 'audit_logs'
          )
          AND c.relrowsecurity = false
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_rls_not_enabled';
    END IF;

    IF EXISTS (
        SELECT s.service_id
        FROM public.approved_billing_scopes s
        WHERE s.status = 'draft'
        GROUP BY s.service_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_duplicate_service_drafts';
    END IF;

    IF EXISTS (
        SELECT s.service_id
        FROM public.approved_billing_scopes s
        WHERE s.status = 'approved'
          AND s.superseded_at IS NULL
          AND s.voided_at IS NULL
        GROUP BY s.service_id
        HAVING count(*) > 1
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_multiple_active_scopes';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.approved_billing_scopes s
        WHERE (s.status = 'voided' AND s.voided_at IS NULL)
           OR (s.status = 'approved' AND s.voided_at IS NOT NULL)
           OR (s.superseded_at IS NULL) <> (s.superseded_by_scope_id IS NULL)
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_contradictory_scope_state';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.service_id IS NOT NULL
          AND i.status NOT IN ('cancelled', 'voided')
          AND i.voided_at IS NULL
          AND COALESCE(i.is_deleted, false) = false
          AND i.grand_total IS NULL
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'abs_financial_lifecycle_guard_null_invoice_grand_total';
    END IF;
END;
$$;

ALTER TABLE public.approved_billing_scopes
    ADD COLUMN supersedes_scope_id uuid;

ALTER TABLE public.approved_billing_scopes
    ADD CONSTRAINT approved_billing_scopes_supersedes_scope_not_self_check
        CHECK (supersedes_scope_id IS NULL OR supersedes_scope_id <> id),
    ADD CONSTRAINT approved_billing_scopes_supersedes_scope_service_fkey
        FOREIGN KEY (supersedes_scope_id, service_id)
        REFERENCES public.approved_billing_scopes(id, service_id)
        ON DELETE RESTRICT;

CREATE INDEX idx_approved_billing_scopes_supersedes_scope_id
    ON public.approved_billing_scopes(supersedes_scope_id)
    WHERE supersedes_scope_id IS NOT NULL;

CREATE UNIQUE INDEX idx_approved_billing_scopes_one_draft_per_service
    ON public.approved_billing_scopes(service_id)
    WHERE status = 'draft';

CREATE INDEX idx_invoices_service_id
    ON public.invoices(service_id);

CREATE INDEX idx_invoices_service_applicable_exposure
    ON public.invoices(service_id)
    INCLUDE (grand_total)
    WHERE status NOT IN ('cancelled', 'voided')
      AND voided_at IS NULL
      AND COALESCE(is_deleted, false) = false;

COMMENT ON COLUMN public.approved_billing_scopes.supersedes_scope_id IS
    'Successor-to-source lineage. The source keeps superseded_by_scope_id; superseded remains a derived state, not a status.';
COMMENT ON CONSTRAINT approved_billing_scopes_supersedes_scope_service_fkey
    ON public.approved_billing_scopes IS
    'Keeps successor lineage within the same Service.';
COMMENT ON CONSTRAINT approved_billing_scopes_supersedes_scope_not_self_check
    ON public.approved_billing_scopes IS
    'Prevents an Approved Billing Scope from naming itself as its source.';
COMMENT ON INDEX public.idx_approved_billing_scopes_supersedes_scope_id IS
    'Supports successor lineage lookup without duplicating existing Service/status indexes.';
COMMENT ON INDEX public.idx_approved_billing_scopes_one_draft_per_service IS
    'Enforces at most one draft Approved Billing Scope per Service.';
COMMENT ON INDEX public.idx_invoices_service_id IS
    'Supports unfiltered Service invoice joins, including payment-history detection.';
COMMENT ON INDEX public.idx_invoices_service_applicable_exposure IS
    'Supports fail-closed Service-lifetime invoice exposure across active, historical, and null scope links.';

CREATE OR REPLACE FUNCTION public._abs_get_service_invoice_exposure(p_service_id uuid)
RETURNS TABLE(applicable_invoice_count bigint, lifetime_invoice_total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.service_id = p_service_id
          AND i.status NOT IN ('cancelled', 'voided')
          AND i.voided_at IS NULL
          AND COALESCE(i.is_deleted, false) = false
          AND i.grand_total IS NULL
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice grand_total cannot be null for applicable Service exposure';
    END IF;

    RETURN QUERY
    SELECT count(*)::bigint, COALESCE(sum(i.grand_total), 0)::numeric
    FROM public.invoices i
    WHERE i.service_id = p_service_id
      AND i.status NOT IN ('cancelled', 'voided')
      AND i.voided_at IS NULL
      AND COALESCE(i.is_deleted, false) = false;
END;
$$;

CREATE OR REPLACE FUNCTION public._abs_get_service_payment_history_count(p_service_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT count(*)::bigint
    FROM public.payments p
    JOIN public.invoices i ON i.id = p.invoice_id
    WHERE i.service_id = p_service_id;
$$;

CREATE OR REPLACE FUNCTION public._abs_service_has_historical_authority(p_service_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.approved_billing_scopes s
        WHERE s.service_id = p_service_id
          AND s.status IN ('approved', 'voided')
    );
$$;

CREATE OR REPLACE FUNCTION public._abs_validate_scope_items(p_scope_id uuid)
RETURNS TABLE(
    validation_error text,
    item_count bigint,
    billable_item_count bigint,
    item_accepted_subtotal numeric,
    item_accepted_vat_amount numeric,
    item_accepted_grand_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    SELECT
        count(*)::bigint,
        count(*) FILTER (WHERE i.accepted_grand_total > 0)::bigint,
        COALESCE(sum(i.accepted_subtotal), 0)::numeric,
        COALESCE(sum(i.accepted_vat_amount), 0)::numeric,
        COALESCE(sum(i.accepted_grand_total), 0)::numeric
    INTO
        item_count,
        billable_item_count,
        item_accepted_subtotal,
        item_accepted_vat_amount,
        item_accepted_grand_total
    FROM public.approved_billing_scope_items i
    WHERE i.approved_billing_scope_id = p_scope_id;

    IF item_count = 0 THEN
        validation_error := 'scope_no_items';
        RETURN NEXT;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = p_scope_id
          AND (
              i.accepted_qty::text IN ('NaN', 'Infinity', '-Infinity')
              OR i.accepted_unit_price::text IN ('NaN', 'Infinity', '-Infinity')
              OR i.accepted_subtotal::text IN ('NaN', 'Infinity', '-Infinity')
              OR i.accepted_vat_amount::text IN ('NaN', 'Infinity', '-Infinity')
              OR i.accepted_grand_total::text IN ('NaN', 'Infinity', '-Infinity')
              OR (i.decision = 'accepted' AND (
                  i.accepted_qty IS DISTINCT FROM i.source_qty
                  OR i.accepted_unit_price IS DISTINCT FROM i.source_unit_price
                  OR i.accepted_subtotal IS DISTINCT FROM i.source_subtotal
                  OR i.accepted_vat_amount IS DISTINCT FROM i.source_vat_amount
                  OR i.accepted_grand_total IS DISTINCT FROM i.source_grand_total
              ))
              OR (i.decision IN ('excluded', 'customer_supplied') AND (
                  i.accepted_qty <> 0
                  OR i.accepted_unit_price <> 0
                  OR i.accepted_subtotal <> 0
                  OR i.accepted_vat_amount <> 0
                  OR i.accepted_grand_total <> 0
              ))
              OR (i.decision = 'adjusted' AND (
                  i.accepted_qty > i.source_qty
                  OR i.accepted_unit_price > i.source_unit_price
                  OR i.accepted_subtotal > i.source_subtotal
                  OR i.accepted_vat_amount > i.source_vat_amount
                  OR i.accepted_grand_total > i.source_grand_total
                  OR abs(i.accepted_grand_total - (i.accepted_subtotal + i.accepted_vat_amount)) > 0.01
              ))
              OR i.decision NOT IN ('accepted', 'excluded', 'customer_supplied', 'adjusted')
          )
    ) THEN
        validation_error := 'scope_reduction_invalid';
        RETURN NEXT;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = p_scope_id
          AND i.decision IN ('excluded', 'customer_supplied', 'adjusted')
          AND (i.reason_code IS NULL OR btrim(i.reason_code) = '')
    ) THEN
        validation_error := 'scope_reason_required';
        RETURN NEXT;
        RETURN;
    END IF;

    validation_error := NULL;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public._abs_get_service_invoice_exposure(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._abs_get_service_payment_history_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._abs_service_has_historical_authority(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._abs_validate_scope_items(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._abs_get_service_invoice_exposure(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._abs_get_service_payment_history_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._abs_service_has_historical_authority(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public._abs_validate_scope_items(uuid) TO service_role;

COMMENT ON FUNCTION public._abs_get_service_invoice_exposure(uuid) IS
    'Private service-role helper for exact Service-lifetime applicable invoice count and total; null totals fail closed.';
COMMENT ON FUNCTION public._abs_get_service_payment_history_count(uuid) IS
    'Private service-role helper that counts every payment row joined to an invoice for the Service, without status filters.';
COMMENT ON FUNCTION public._abs_service_has_historical_authority(uuid) IS
    'Private service-role helper. Approved or voided ABS history permanently closes quotation fallback.';
COMMENT ON FUNCTION public._abs_validate_scope_items(uuid) IS
    'Private service-role helper for the locked draft item-decision and accepted-total consistency contract.';

CREATE OR REPLACE FUNCTION public.check_invoices_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_exists boolean;
    v_authoritative_service_id uuid;
    v_active_scope_id uuid;
    v_active_scope_ceiling numeric(12,2);
    v_other_invoice_total numeric;
    v_candidate_total numeric;
    v_old_is_applicable boolean;
    v_new_is_applicable boolean;
BEGIN
    IF TG_OP = 'UPDATE' AND (
        OLD.service_id IS DISTINCT FROM NEW.service_id
        OR OLD.approved_quotation_id IS DISTINCT FROM NEW.approved_quotation_id
        OR OLD.approved_billing_scope_id IS DISTINCT FROM NEW.approved_billing_scope_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice authoritative Service, quotation, and billing scope links are immutable';
    END IF;

    IF TG_OP = 'UPDATE' AND (
        OLD.invoice_number IS DISTINCT FROM NEW.invoice_number
        OR OLD.customer_id IS DISTINCT FROM NEW.customer_id
        OR OLD.date IS DISTINCT FROM NEW.date
        OR OLD.due_date IS DISTINCT FROM NEW.due_date
        OR OLD.subtotal IS DISTINCT FROM NEW.subtotal
        OR OLD.vat_amount IS DISTINCT FROM NEW.vat_amount
        OR OLD.grand_total IS DISTINCT FROM NEW.grand_total
        OR OLD.invoice_type IS DISTINCT FROM NEW.invoice_type
        OR OLD.document_label IS DISTINCT FROM NEW.document_label
        OR OLD.vat_mode IS DISTINCT FROM NEW.vat_mode
        OR OLD.vat_rate IS DISTINCT FROM NEW.vat_rate
        OR OLD.snapshot_seller IS DISTINCT FROM NEW.snapshot_seller
        OR OLD.snapshot_buyer IS DISTINCT FROM NEW.snapshot_buyer
        OR OLD.snapshot_quotation IS DISTINCT FROM NEW.snapshot_quotation
        OR OLD.snapshot_bank_details IS DISTINCT FROM NEW.snapshot_bank_details
        OR OLD.snapshot_document_rules IS DISTINCT FROM NEW.snapshot_document_rules
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice financial totals and document snapshots are immutable after creation';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        v_old_is_applicable := OLD.status NOT IN ('cancelled', 'voided')
            AND OLD.voided_at IS NULL
            AND COALESCE(OLD.is_deleted, false) = false;
        v_new_is_applicable := NEW.status NOT IN ('cancelled', 'voided')
            AND NEW.voided_at IS NULL
            AND COALESCE(NEW.is_deleted, false) = false;

        IF v_old_is_applicable IS NOT TRUE AND v_new_is_applicable IS TRUE THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_exposure_reactivation_requires_service_rpc';
        END IF;

        -- Exposure restoration requires a future Service-first RPC; an Invoice-first UPDATE cannot safely restore it.
        RETURN NEW;
    END IF;

    v_authoritative_service_id := NEW.service_id;

    IF v_authoritative_service_id IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice service_id is required';
    END IF;

    SELECT true
    INTO v_service_exists
    FROM public.services s
    WHERE s.id = v_authoritative_service_id
      AND s.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'invoice Service not found';
    END IF;

    SELECT s.id, s.accepted_grand_total
    INTO v_active_scope_id, v_active_scope_ceiling
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_authoritative_service_id
      AND s.status = 'approved'
      AND s.superseded_at IS NULL
      AND s.voided_at IS NULL;

    IF v_active_scope_id IS NOT NULL THEN
        IF NEW.approved_billing_scope_id IS DISTINCT FROM v_active_scope_id THEN
            RAISE EXCEPTION USING MESSAGE = 'referenced billing scope is not active or is voided/superseded';
        END IF;
    ELSIF public._abs_service_has_historical_authority(v_authoritative_service_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'billing_scope_inactive';
    ELSIF NEW.approved_billing_scope_id IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'referenced billing scope is not active or is voided/superseded';
    END IF;

    IF v_active_scope_id IS NOT NULL THEN
        IF EXISTS (
            SELECT 1
            FROM public.invoices i
            WHERE i.service_id = v_authoritative_service_id
              AND i.id IS DISTINCT FROM NEW.id
              AND i.status NOT IN ('cancelled', 'voided')
              AND i.voided_at IS NULL
              AND COALESCE(i.is_deleted, false) = false
              AND i.grand_total IS NULL
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice grand_total cannot be null for applicable Service exposure';
        END IF;

        SELECT COALESCE(sum(i.grand_total), 0)
        INTO v_other_invoice_total
        FROM public.invoices i
        WHERE i.service_id = v_authoritative_service_id
          AND i.id IS DISTINCT FROM NEW.id
          AND i.status NOT IN ('cancelled', 'voided')
          AND i.voided_at IS NULL
          AND COALESCE(i.is_deleted, false) = false;

        v_candidate_total := v_other_invoice_total;
        IF NEW.status NOT IN ('cancelled', 'voided')
            AND NEW.voided_at IS NULL
            AND COALESCE(NEW.is_deleted, false) = false
        THEN
            IF NEW.grand_total IS NULL THEN
                RAISE EXCEPTION USING MESSAGE = 'invoice grand_total cannot be null when Service has an active billing scope';
            END IF;
            v_candidate_total := v_candidate_total + NEW.grand_total;
        END IF;

        IF v_candidate_total > v_active_scope_ceiling THEN
            RAISE EXCEPTION 'invoice total (%) exceeds active billing scope ceiling (%) for Service %',
                v_candidate_total, v_active_scope_ceiling, NEW.service_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_invoices_before_write() IS
    'Database-authoritative invoice guard: INSERT locks Service first; UPDATE keeps historical invoice authority links, snapshots, totals, and exposure immutable without locking Service.';

DROP TRIGGER IF EXISTS check_invoices_before_write_trg ON public.invoices;
CREATE TRIGGER check_invoices_before_write_trg
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.check_invoices_before_write();

CREATE OR REPLACE FUNCTION public.check_approved_billing_scopes_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_authoritative_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_source_status text;
    v_source_is_deleted boolean;
    v_source_service_id uuid;
    v_source_discount numeric(12,2);
    v_item_validation record;
    v_applicable_invoice_count bigint;
    v_lifetime_invoice_total numeric;
    v_payment_history_count bigint;
    v_successor_source_id uuid;
BEGIN
    IF TG_OP = 'UPDATE' AND (
        OLD.service_id IS DISTINCT FROM NEW.service_id
        OR OLD.source_quotation_id IS DISTINCT FROM NEW.source_quotation_id
        OR OLD.supersedes_scope_id IS DISTINCT FROM NEW.supersedes_scope_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'approved billing scope authority lineage is immutable';
    END IF;

    v_authoritative_service_id := CASE WHEN TG_OP = 'UPDATE' THEN OLD.service_id ELSE NEW.service_id END;

    -- INSERT can safely establish Service-first order; UPDATE already owns Scope and must never request a Service row lock.
    IF TG_OP = 'INSERT' THEN
        SELECT s.status, s.deleted_at
        INTO v_service_status, v_service_deleted_at
        FROM public.services s
        WHERE s.id = v_authoritative_service_id
        FOR UPDATE;
    ELSE
        SELECT s.status, s.deleted_at
        INTO v_service_status, v_service_deleted_at
        FROM public.services s
        WHERE s.id = v_authoritative_service_id;
    END IF;

    IF NOT FOUND OR v_service_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF v_service_status IN ('Completed', 'Cancelled') THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
        END IF;
        IF NEW.status IN ('approved', 'voided') THEN
            RAISE EXCEPTION USING MESSAGE = 'approved billing scopes cannot be inserted directly as approved or voided';
        END IF;
    ELSE
        IF OLD.status = 'voided' THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_already_voided';
        END IF;

        IF OLD.status = 'approved' THEN
            IF NEW.status NOT IN ('approved', 'voided') THEN
                RAISE EXCEPTION USING MESSAGE = 'approved scope status may only remain approved or transition to voided';
            END IF;

            IF OLD.scope_version IS DISTINCT FROM NEW.scope_version
                OR OLD.accepted_subtotal IS DISTINCT FROM NEW.accepted_subtotal
                OR OLD.accepted_vat_amount IS DISTINCT FROM NEW.accepted_vat_amount
                OR OLD.accepted_grand_total IS DISTINCT FROM NEW.accepted_grand_total
                OR OLD.source_vat_rate IS DISTINCT FROM NEW.source_vat_rate
                OR OLD.source_discount IS DISTINCT FROM NEW.source_discount
                OR OLD.source_currency IS DISTINCT FROM NEW.source_currency
                OR OLD.source_quotation_subtotal IS DISTINCT FROM NEW.source_quotation_subtotal
                OR OLD.source_quotation_vat_amount IS DISTINCT FROM NEW.source_quotation_vat_amount
                OR OLD.source_quotation_grand_total IS DISTINCT FROM NEW.source_quotation_grand_total
                OR OLD.source_pricing_context IS DISTINCT FROM NEW.source_pricing_context
                OR OLD.line_safety_status IS DISTINCT FROM NEW.line_safety_status
                OR OLD.line_safety_reason_code IS DISTINCT FROM NEW.line_safety_reason_code
                OR OLD.line_safety_note IS DISTINCT FROM NEW.line_safety_note
                OR OLD.line_safety_reviewed_by IS DISTINCT FROM NEW.line_safety_reviewed_by
                OR OLD.line_safety_reviewed_at IS DISTINCT FROM NEW.line_safety_reviewed_at
                OR OLD.change_summary_reason IS DISTINCT FROM NEW.change_summary_reason
                OR OLD.approved_at IS DISTINCT FROM NEW.approved_at
                OR OLD.approved_by IS DISTINCT FROM NEW.approved_by
                OR OLD.created_by IS DISTINCT FROM NEW.created_by
                OR OLD.created_at IS DISTINCT FROM NEW.created_at
            THEN
                RAISE EXCEPTION USING MESSAGE = 'approved scope header fields are immutable';
            END IF;

            IF OLD.superseded_at IS NULL AND NEW.superseded_at IS NOT NULL THEN
                IF NEW.superseded_by_scope_id IS NULL THEN
                    RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid';
                END IF;

                SELECT s.supersedes_scope_id
                INTO v_successor_source_id
                FROM public.approved_billing_scopes s
                WHERE s.id = NEW.superseded_by_scope_id
                  AND s.service_id = OLD.service_id
                  AND s.status = 'draft';

                IF NOT FOUND OR v_successor_source_id IS DISTINCT FROM OLD.id THEN
                    RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid';
                END IF;
            ELSIF OLD.superseded_at IS DISTINCT FROM NEW.superseded_at
                OR OLD.superseded_by_scope_id IS DISTINCT FROM NEW.superseded_by_scope_id
            THEN
                RAISE EXCEPTION USING MESSAGE = 'scope_already_superseded';
            END IF;
        END IF;
    END IF;

    IF NEW.status = 'voided' THEN
        IF TG_OP <> 'UPDATE'
            OR OLD.status <> 'approved'
            OR OLD.superseded_at IS NOT NULL
            OR OLD.voided_at IS NOT NULL
        THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_not_active';
        END IF;
        IF v_service_status = 'Completed' THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
        END IF;
        IF NEW.voided_at IS NULL
            OR NEW.voided_by IS NULL
            OR btrim(NEW.voided_by) = ''
            OR NEW.void_reason IS NULL
            OR btrim(NEW.void_reason) = ''
        THEN
            RAISE EXCEPTION USING MESSAGE = 'voided scopes require void metadata';
        END IF;

        SELECT *
        INTO v_applicable_invoice_count, v_lifetime_invoice_total
        FROM public._abs_get_service_invoice_exposure(v_authoritative_service_id);
        v_payment_history_count := public._abs_get_service_payment_history_count(v_authoritative_service_id);

        IF v_applicable_invoice_count <> 0 OR v_payment_history_count <> 0 THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_void_financial_exposure';
        END IF;
    END IF;

    IF NEW.status = 'approved'
        AND (TG_OP <> 'UPDATE' OR OLD.status IS DISTINCT FROM 'approved')
    THEN
        IF v_service_status IN ('Completed', 'Cancelled') THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
        END IF;

        SELECT q.status, q.is_deleted, q.service_id, q.discount
        INTO v_source_status, v_source_is_deleted, v_source_service_id, v_source_discount
        FROM public.quotations q
        WHERE q.id = NEW.source_quotation_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION USING MESSAGE = 'source quotation not found';
        END IF;
        IF v_source_status <> 'approved' THEN
            RAISE EXCEPTION USING MESSAGE = 'source quotation must be approved';
        END IF;
        IF COALESCE(v_source_is_deleted, false) THEN
            RAISE EXCEPTION USING MESSAGE = 'source quotation must not be deleted';
        END IF;
        IF v_source_service_id IS DISTINCT FROM NEW.service_id THEN
            RAISE EXCEPTION USING MESSAGE = 'source quotation service_id must match scope service_id';
        END IF;
        IF COALESCE(v_source_discount, 0) > 0 THEN
            RAISE EXCEPTION USING MESSAGE = 'Approved Billing Scope V1 blocks approval when source quotation discount > 0';
        END IF;
        IF NEW.line_safety_status <> 'safe' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved scopes require line_safety_status = safe';
        END IF;
        IF NEW.approved_at IS NULL OR NEW.approved_by IS NULL OR btrim(NEW.approved_by) = '' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved scopes require approved_at and approved_by';
        END IF;

        IF NEW.supersedes_scope_id IS NULL THEN
            IF EXISTS (
                SELECT 1
                FROM public.approved_billing_scopes active_scope
                WHERE active_scope.service_id = v_authoritative_service_id
                  AND active_scope.id <> NEW.id
                  AND active_scope.status = 'approved'
                  AND active_scope.superseded_at IS NULL
                  AND active_scope.voided_at IS NULL
            ) THEN
                RAISE EXCEPTION USING MESSAGE = 'scope_active_conflict';
            END IF;

            IF public._abs_service_has_historical_authority(v_authoritative_service_id) THEN
                RAISE EXCEPTION USING MESSAGE = 'scope_not_active';
            END IF;
        END IF;

        SELECT * INTO v_item_validation
        FROM public._abs_validate_scope_items(NEW.id);

        IF v_item_validation.validation_error IS NOT NULL
            OR v_item_validation.billable_item_count = 0
            OR v_item_validation.item_accepted_subtotal IS DISTINCT FROM NEW.accepted_subtotal
            OR v_item_validation.item_accepted_vat_amount IS DISTINCT FROM NEW.accepted_vat_amount
            OR v_item_validation.item_accepted_grand_total IS DISTINCT FROM NEW.accepted_grand_total
        THEN
            RAISE EXCEPTION USING MESSAGE = COALESCE(v_item_validation.validation_error, 'approved scope item/header totals are invalid');
        END IF;

        SELECT *
        INTO v_applicable_invoice_count, v_lifetime_invoice_total
        FROM public._abs_get_service_invoice_exposure(NEW.service_id);

        IF v_lifetime_invoice_total > NEW.accepted_grand_total THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_successor_ceiling_below_invoiced';
        END IF;

        IF NEW.supersedes_scope_id IS NOT NULL AND NOT EXISTS (
            SELECT 1
            FROM public.approved_billing_scopes p
            WHERE p.id = NEW.supersedes_scope_id
              AND p.service_id = NEW.service_id
              AND p.source_quotation_id = NEW.source_quotation_id
              AND p.status = 'approved'
              AND p.superseded_at IS NOT NULL
              AND p.superseded_by_scope_id = NEW.id
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_approved_billing_scopes_before_write() IS
    'Backstop for immutable approved history, valid source snapshots, and controlled transitions; UPDATE never row-locks Service, while mutation RPCs lock Service first.';

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
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
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
    v_invoice_record record;
    v_payment_number text;
    v_payment_id uuid;
    v_new_amount_paid numeric;
    v_new_balance_due numeric;
    v_new_status text;
BEGIN
    SELECT i.service_id
    INTO v_service_id
    FROM public.invoices i
    WHERE i.id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    PERFORM 1
    FROM public.services s
    WHERE s.id = v_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    SELECT i.id, i.customer_id, i.amount_paid, i.balance_due, i.status, i.is_deleted
    INTO v_invoice_record
    FROM public.invoices i
    WHERE i.id = p_invoice_id
      AND i.service_id = v_service_id
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

    v_payment_number := public.generate_document_number('payment');

    INSERT INTO public.payments (
        payment_number, invoice_id, customer_id, date, amount, method,
        reference, status, created_by, updated_by
    ) VALUES (
        v_payment_number, p_invoice_id, v_invoice_record.customer_id, p_date,
        p_amount, p_method, p_reference, 'confirmed', p_user_id, p_user_id
    ) RETURNING id INTO v_payment_id;

    v_new_amount_paid := v_invoice_record.amount_paid + p_amount;
    v_new_balance_due := v_invoice_record.balance_due - p_amount;
    v_new_status := CASE WHEN v_new_balance_due = 0 THEN 'paid' ELSE 'partial' END;

    UPDATE public.invoices i
    SET amount_paid = v_new_amount_paid,
        balance_due = v_new_balance_due,
        status = v_new_status,
        updated_by = p_user_id,
        updated_at = now()
    WHERE i.id = p_invoice_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details)
    VALUES (
        'payment_recorded', 'invoice', p_invoice_id, p_user_id,
        jsonb_build_object(
            'payment_id', v_payment_id,
            'payment_number', v_payment_number,
            'amount', p_amount,
            'method', p_method,
            'new_status', v_new_status
        )
    );

    RETURN QUERY SELECT v_payment_id, v_payment_number, v_new_amount_paid, v_new_balance_due, v_new_status;
END;
$$;

REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text) TO service_role;
COMMENT ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text) IS
    'Preserves payment behavior while serializing Service first and invoice second.';

CREATE OR REPLACE FUNCTION public.edit_approved_billing_scope_item(
    p_scope_id uuid,
    p_item_id uuid,
    p_decision text,
    p_accepted_qty numeric,
    p_accepted_unit_price numeric,
    p_reason_code text,
    p_reason_note text,
    p_display_order integer
)
RETURNS TABLE(
    error_code text,
    scope_id uuid,
    item_id uuid,
    accepted_subtotal numeric,
    accepted_vat_amount numeric,
    accepted_grand_total numeric,
    line_safety_status text,
    updated boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
    v_status text;
    v_source_vat_rate numeric(5,2);
    v_old_safety_status text;
    v_item_id uuid;
    v_old_decision text;
    v_source_qty numeric(12,2);
    v_source_unit_price numeric(12,2);
    v_source_subtotal numeric(12,2);
    v_source_vat_amount numeric(12,2);
    v_source_grand_total numeric(12,2);
    v_old_accepted_qty numeric(12,2);
    v_old_accepted_unit_price numeric(12,2);
    v_old_accepted_subtotal numeric(12,2);
    v_old_accepted_vat_amount numeric(12,2);
    v_old_accepted_grand_total numeric(12,2);
    v_old_reason_note text;
    v_next_qty numeric(12,2);
    v_next_unit_price numeric(12,2);
    v_next_subtotal numeric(12,2);
    v_next_vat_amount numeric(12,2);
    v_next_grand_total numeric(12,2);
    v_is_material boolean;
    v_new_subtotal numeric(12,2);
    v_new_vat_amount numeric(12,2);
    v_new_grand_total numeric(12,2);
    v_updated_item_count integer;
    v_updated_scope_count integer;
BEGIN
    SELECT s.service_id
    INTO v_service_id
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'scope_not_found'::text, NULL::uuid, NULL::uuid,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    PERFORM 1
    FROM public.services svc
    WHERE svc.id = v_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'scope_not_found'::text, NULL::uuid, NULL::uuid,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    SELECT s.status, s.source_vat_rate, s.line_safety_status
    INTO v_status, v_source_vat_rate, v_old_safety_status
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id
      AND s.service_id = v_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'scope_not_found'::text, NULL::uuid, NULL::uuid,
            NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, false;
        RETURN;
    END IF;

    IF v_status <> 'draft' THEN
        RETURN QUERY SELECT
            'scope_not_draft'::text, p_scope_id, NULL::uuid,
            NULL::numeric, NULL::numeric, NULL::numeric, v_old_safety_status, false;
        RETURN;
    END IF;

    SELECT
        i.id, i.decision, i.source_qty, i.source_unit_price, i.source_subtotal,
        i.source_vat_amount, i.source_grand_total, i.accepted_qty,
        i.accepted_unit_price, i.accepted_subtotal, i.accepted_vat_amount,
        i.accepted_grand_total, i.reason_note
    INTO
        v_item_id, v_old_decision, v_source_qty, v_source_unit_price,
        v_source_subtotal, v_source_vat_amount, v_source_grand_total,
        v_old_accepted_qty, v_old_accepted_unit_price, v_old_accepted_subtotal,
        v_old_accepted_vat_amount, v_old_accepted_grand_total, v_old_reason_note
    FROM public.approved_billing_scope_items i
    WHERE i.id = p_item_id
      AND i.approved_billing_scope_id = p_scope_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'scope_not_found'::text, p_scope_id, NULL::uuid,
            NULL::numeric, NULL::numeric, NULL::numeric, v_old_safety_status, false;
        RETURN;
    END IF;

    IF p_decision NOT IN ('accepted', 'adjusted', 'excluded', 'customer_supplied') THEN
        RETURN QUERY SELECT
            'scope_unexpected_error'::text, p_scope_id, p_item_id,
            NULL::numeric, NULL::numeric, NULL::numeric, v_old_safety_status, false;
        RETURN;
    END IF;

    IF p_decision = 'accepted' THEN
        v_next_qty := v_source_qty;
        v_next_unit_price := v_source_unit_price;
    ELSIF p_decision IN ('excluded', 'customer_supplied') THEN
        v_next_qty := 0;
        v_next_unit_price := 0;
    ELSE
        v_next_qty := COALESCE(p_accepted_qty, v_old_accepted_qty);
        v_next_unit_price := COALESCE(p_accepted_unit_price, v_old_accepted_unit_price);
    END IF;

    IF v_next_qty < 0 OR v_next_qty > v_source_qty
        OR v_next_unit_price < 0 OR v_next_unit_price > v_source_unit_price
    THEN
        RETURN QUERY SELECT
            'scope_reduction_invalid'::text, p_scope_id, p_item_id,
            NULL::numeric, NULL::numeric, NULL::numeric, v_old_safety_status, false;
        RETURN;
    END IF;

    v_next_subtotal := round((v_next_qty * v_next_unit_price)::numeric, 2);
    v_next_vat_amount := round((v_next_subtotal * (v_source_vat_rate / 100.0))::numeric, 2);
    v_next_grand_total := round((v_next_subtotal + v_next_vat_amount)::numeric, 2);

    IF v_next_subtotal > v_source_subtotal
        OR v_next_vat_amount > v_source_vat_amount
        OR v_next_grand_total > v_source_grand_total
    THEN
        RETURN QUERY SELECT
            'scope_reduction_invalid'::text, p_scope_id, p_item_id,
            NULL::numeric, NULL::numeric, NULL::numeric, v_old_safety_status, false;
        RETURN;
    END IF;

    IF p_decision IN ('adjusted', 'excluded', 'customer_supplied')
        AND (p_reason_code IS NULL OR btrim(p_reason_code) = '')
    THEN
        RETURN QUERY SELECT
            'scope_reason_required'::text, p_scope_id, p_item_id,
            NULL::numeric, NULL::numeric, NULL::numeric, v_old_safety_status, false;
        RETURN;
    END IF;

    v_is_material := (
        v_old_decision IS DISTINCT FROM p_decision
        OR v_old_accepted_qty IS DISTINCT FROM v_next_qty
        OR v_old_accepted_unit_price IS DISTINCT FROM v_next_unit_price
        OR v_old_accepted_subtotal IS DISTINCT FROM v_next_subtotal
        OR v_old_accepted_vat_amount IS DISTINCT FROM v_next_vat_amount
        OR v_old_accepted_grand_total IS DISTINCT FROM v_next_grand_total
    );

    UPDATE public.approved_billing_scope_items AS scope_items
    SET decision = p_decision,
        accepted_qty = v_next_qty,
        accepted_unit_price = v_next_unit_price,
        accepted_subtotal = v_next_subtotal,
        accepted_vat_amount = v_next_vat_amount,
        accepted_grand_total = v_next_grand_total,
        reason_code = CASE
            WHEN p_decision IN ('adjusted', 'excluded', 'customer_supplied') THEN p_reason_code
            ELSE NULL
        END,
        reason_note = COALESCE(p_reason_note, v_old_reason_note),
        display_order = COALESCE(p_display_order, scope_items.display_order),
        updated_at = now()
    WHERE scope_items.id = p_item_id;

    GET DIAGNOSTICS v_updated_item_count = ROW_COUNT;
    IF v_updated_item_count <> 1 THEN
        RAISE EXCEPTION 'Failed to update approved_billing_scope_item %', p_item_id;
    END IF;

    SELECT
        COALESCE(sum(i.accepted_subtotal), 0),
        COALESCE(sum(i.accepted_vat_amount), 0),
        COALESCE(sum(i.accepted_grand_total), 0)
    INTO v_new_subtotal, v_new_vat_amount, v_new_grand_total
    FROM public.approved_billing_scope_items i
    WHERE i.approved_billing_scope_id = p_scope_id;

    UPDATE public.approved_billing_scopes AS scopes
    SET accepted_subtotal = v_new_subtotal,
        accepted_vat_amount = v_new_vat_amount,
        accepted_grand_total = v_new_grand_total,
        line_safety_status = CASE
            WHEN v_is_material THEN 'pending_review'
            ELSE scopes.line_safety_status
        END,
        updated_at = now()
    WHERE scopes.id = p_scope_id;

    GET DIAGNOSTICS v_updated_scope_count = ROW_COUNT;
    IF v_updated_scope_count <> 1 THEN
        RAISE EXCEPTION 'Failed to update approved_billing_scope %', p_scope_id;
    END IF;

    RETURN QUERY SELECT
        NULL::text, p_scope_id, p_item_id, v_new_subtotal, v_new_vat_amount,
        v_new_grand_total,
        CASE WHEN v_is_material THEN 'pending_review'::text ELSE v_old_safety_status END,
        true;
END;
$$;

REVOKE ALL ON FUNCTION public.edit_approved_billing_scope_item(uuid, uuid, text, numeric, numeric, text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.edit_approved_billing_scope_item(uuid, uuid, text, numeric, numeric, text, text, integer) TO service_role;
COMMENT ON FUNCTION public.edit_approved_billing_scope_item(uuid, uuid, text, numeric, numeric, text, text, integer) IS
    'Preserves the existing draft item edit contract while locking Service, scope, then item.';

CREATE OR REPLACE FUNCTION public.discard_approved_billing_scope_draft(p_scope_id uuid)
RETURNS TABLE(
    error_code text,
    scope_id uuid,
    service_id uuid,
    source_quotation_id uuid,
    discarded boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
    v_source_quotation_id uuid;
    v_status text;
    v_deleted_scope_count integer;
BEGIN
    SELECT s.service_id
    INTO v_service_id
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'scope_not_found'::text, NULL::uuid, NULL::uuid, NULL::uuid, false;
        RETURN;
    END IF;

    PERFORM 1
    FROM public.services svc
    WHERE svc.id = v_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'scope_not_found'::text, NULL::uuid, NULL::uuid, NULL::uuid, false;
        RETURN;
    END IF;

    SELECT s.service_id, s.source_quotation_id, s.status
    INTO v_service_id, v_source_quotation_id, v_status
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id
      AND s.service_id = v_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'scope_not_found'::text, NULL::uuid, NULL::uuid, NULL::uuid, false;
        RETURN;
    END IF;

    IF v_status <> 'draft' THEN
        RETURN QUERY SELECT
            'scope_not_draft'::text, p_scope_id, v_service_id,
            v_source_quotation_id, false;
        RETURN;
    END IF;

    DELETE FROM public.approved_billing_scope_items i
    WHERE i.approved_billing_scope_id = p_scope_id;

    DELETE FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id
      AND s.status = 'draft';

    GET DIAGNOSTICS v_deleted_scope_count = ROW_COUNT;
    IF v_deleted_scope_count <> 1 THEN
        RAISE EXCEPTION 'discard_approved_billing_scope_draft failed to delete draft scope %', p_scope_id;
    END IF;

    RETURN QUERY SELECT
        NULL::text, p_scope_id, v_service_id, v_source_quotation_id, true;
END;
$$;

REVOKE ALL ON FUNCTION public.discard_approved_billing_scope_draft(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.discard_approved_billing_scope_draft(uuid) TO service_role;
COMMENT ON FUNCTION public.discard_approved_billing_scope_draft(uuid) IS
    'Preserves draft-only discard while locking Service before scope; successor discard never changes its active source.';

CREATE OR REPLACE FUNCTION public.review_approved_billing_scope_line_safety(
    p_scope_id uuid,
    p_line_safety_status text,
    p_reason_code text,
    p_reviewer_note text,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    scope_id uuid,
    service_id uuid,
    line_safety_status text,
    line_safety_reviewed_at timestamptz,
    reviewed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
    v_scope_status text;
    v_scope_voided_at timestamptz;
    v_scope_superseded_at timestamptz;
    v_reviewed_at timestamptz;
    v_item_validation record;
BEGIN
    error_code := NULL;
    scope_id := p_scope_id;
    service_id := NULL;
    line_safety_status := NULL;
    line_safety_reviewed_at := NULL;
    reviewed := false;

    IF p_line_safety_status IS NULL
        OR p_line_safety_status NOT IN ('safe', 'unsafe')
        OR p_actor_id IS NULL OR btrim(p_actor_id) = ''
        OR p_actor_role IS NULL OR btrim(p_actor_role) = ''
    THEN
        error_code := 'scope_unexpected_error';
        RETURN NEXT;
        RETURN;
    END IF;

    IF (p_reason_code IS NOT NULL AND p_reason_code NOT IN (
        'customer_reduced_quantity', 'customer_reduced_price',
        'customer_removed_item', 'customer_supplied',
        'internal_scope_correction', 'source_pricing_issue',
        'unsafe_line_item', 'other'
    ))
        OR (p_reviewer_note IS NOT NULL AND length(btrim(p_reviewer_note)) > 1000)
    THEN
        error_code := 'scope_unexpected_error';
        RETURN NEXT;
        RETURN;
    END IF;

    IF p_line_safety_status = 'unsafe' AND (
        p_reason_code IS NULL
        OR p_reason_code NOT IN (
            'customer_reduced_quantity', 'customer_reduced_price',
            'customer_removed_item', 'customer_supplied',
            'internal_scope_correction', 'source_pricing_issue',
            'unsafe_line_item', 'other'
        )
        OR p_reviewer_note IS NULL
        OR btrim(p_reviewer_note) = ''
        OR length(btrim(p_reviewer_note)) > 1000
    ) THEN
        error_code := 'scope_reason_required';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.service_id
    INTO v_service_id
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id;

    IF NOT FOUND THEN
        error_code := 'scope_not_found';
        scope_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    PERFORM 1
    FROM public.services svc
    WHERE svc.id = v_service_id
    FOR UPDATE;

    IF NOT FOUND THEN
        error_code := 'scope_not_found';
        scope_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.status, s.voided_at, s.superseded_at
    INTO v_scope_status, v_scope_voided_at, v_scope_superseded_at
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id
      AND s.service_id = v_service_id
    FOR UPDATE;

    service_id := v_service_id;
    IF NOT FOUND THEN
        error_code := 'scope_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_scope_voided_at IS NOT NULL THEN
        error_code := 'scope_terminal_voided';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_scope_status <> 'draft' OR v_scope_superseded_at IS NOT NULL THEN
        error_code := 'scope_not_draft';
        RETURN NEXT;
        RETURN;
    END IF;

    PERFORM i.id
    FROM public.approved_billing_scope_items i
    WHERE i.approved_billing_scope_id = p_scope_id
    ORDER BY i.id
    FOR UPDATE;

    IF p_line_safety_status = 'safe' THEN
        SELECT * INTO v_item_validation
        FROM public._abs_validate_scope_items(p_scope_id);
        IF v_item_validation.validation_error IS NOT NULL THEN
            error_code := v_item_validation.validation_error;
            RETURN NEXT;
            RETURN;
        END IF;
    ELSIF NOT EXISTS (
        SELECT 1
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = p_scope_id
    ) THEN
        error_code := 'scope_no_items';
        RETURN NEXT;
        RETURN;
    END IF;

    v_reviewed_at := transaction_timestamp();
    UPDATE public.approved_billing_scopes s
    SET line_safety_status = p_line_safety_status,
        line_safety_reason_code = CASE WHEN p_line_safety_status = 'unsafe' THEN p_reason_code ELSE NULL END,
        line_safety_note = CASE WHEN p_line_safety_status = 'unsafe' THEN btrim(p_reviewer_note) ELSE NULL END,
        line_safety_reviewed_by = p_actor_id,
        line_safety_reviewed_at = v_reviewed_at,
        updated_by = p_actor_id
    WHERE s.id = p_scope_id
      AND s.status = 'draft'
      AND s.voided_at IS NULL
      AND s.superseded_at IS NULL;

    IF NOT FOUND THEN
        error_code := 'scope_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'update', 'approved_billing_scope', p_scope_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'approved_billing_scope_line_safety_reviewed',
            'actor_id', p_actor_id,
            'actor_role', p_actor_role,
            'transaction_timestamp', v_reviewed_at,
            'service_id', v_service_id,
            'line_safety_status', p_line_safety_status,
            'reason_code', CASE WHEN p_line_safety_status = 'unsafe' THEN p_reason_code ELSE NULL END,
            'reason_note', CASE WHEN p_line_safety_status = 'unsafe' THEN btrim(p_reviewer_note) ELSE NULL END,
            'lifecycle_outcome', 'reviewed'
        ),
        v_reviewed_at
    );

    line_safety_status := p_line_safety_status;
    line_safety_reviewed_at := v_reviewed_at;
    reviewed := true;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.review_approved_billing_scope_line_safety(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_approved_billing_scope_line_safety(uuid, text, text, text, text, text) TO service_role;
COMMENT ON FUNCTION public.review_approved_billing_scope_line_safety(uuid, text, text, text, text, text) IS
    'Service-role-only transactional draft review; locks Service before scope/items and writes one atomic audit.';

CREATE OR REPLACE FUNCTION public.approve_approved_billing_scope(
    p_scope_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    scope_id uuid,
    service_id uuid,
    scope_version integer,
    approved_at timestamptz,
    approved boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_scope_status text;
    v_line_safety_status text;
    v_scope_version integer;
    v_source_quotation_id uuid;
    v_supersedes_scope_id uuid;
    v_header_subtotal numeric;
    v_header_vat_amount numeric;
    v_header_grand_total numeric;
    v_approved_at timestamptz;
    v_item_validation record;
BEGIN
    error_code := NULL;
    scope_id := p_scope_id;
    service_id := NULL;
    scope_version := NULL;
    approved_at := NULL;
    approved := false;

    IF p_actor_id IS NULL OR btrim(p_actor_id) = ''
        OR p_actor_role IS NULL OR btrim(p_actor_role) = ''
    THEN
        error_code := 'scope_unexpected_error';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.service_id
    INTO v_service_id
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id;

    IF NOT FOUND THEN
        error_code := 'scope_not_found';
        scope_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT svc.status, svc.deleted_at
    INTO v_service_status, v_service_deleted_at
    FROM public.services svc
    WHERE svc.id = v_service_id
    FOR UPDATE;

    service_id := v_service_id;
    IF NOT FOUND OR v_service_deleted_at IS NOT NULL
        OR v_service_status IN ('Completed', 'Cancelled')
    THEN
        error_code := 'scope_service_lifecycle_ineligible';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT
        s.status, s.line_safety_status, s.scope_version, s.source_quotation_id,
        s.supersedes_scope_id, s.accepted_subtotal, s.accepted_vat_amount,
        s.accepted_grand_total
    INTO
        v_scope_status, v_line_safety_status, v_scope_version,
        v_source_quotation_id, v_supersedes_scope_id, v_header_subtotal,
        v_header_vat_amount, v_header_grand_total
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id
      AND s.service_id = v_service_id
    FOR UPDATE;

    scope_version := v_scope_version;
    IF NOT FOUND THEN
        error_code := 'scope_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_scope_status <> 'draft' THEN
        error_code := 'scope_not_draft';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_line_safety_status <> 'safe' THEN
        error_code := 'scope_not_safe';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_supersedes_scope_id IS NOT NULL THEN
        error_code := CASE
            WHEN EXISTS (
                SELECT 1 FROM public.approved_billing_scopes active_scope
                WHERE active_scope.service_id = v_service_id
                  AND active_scope.status = 'approved'
                  AND active_scope.superseded_at IS NULL
                  AND active_scope.voided_at IS NULL
            ) THEN 'scope_active_conflict'
            ELSE 'scope_not_active'
        END;
        RETURN NEXT;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.approved_billing_scopes active_scope
        WHERE active_scope.service_id = v_service_id
          AND active_scope.status = 'approved'
          AND active_scope.superseded_at IS NULL
          AND active_scope.voided_at IS NULL
    ) THEN
        error_code := 'scope_active_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    IF public._abs_service_has_historical_authority(v_service_id) THEN
        error_code := 'scope_not_active';
        RETURN NEXT;
        RETURN;
    END IF;

    PERFORM i.id
    FROM public.approved_billing_scope_items i
    WHERE i.approved_billing_scope_id = p_scope_id
    ORDER BY i.id
    FOR UPDATE;

    SELECT * INTO v_item_validation
    FROM public._abs_validate_scope_items(p_scope_id);

    IF v_item_validation.validation_error IS NOT NULL THEN
        error_code := v_item_validation.validation_error;
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_item_validation.billable_item_count = 0 THEN
        error_code := 'scope_no_billable_items';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_item_validation.item_accepted_subtotal IS DISTINCT FROM v_header_subtotal
        OR v_item_validation.item_accepted_vat_amount IS DISTINCT FROM v_header_vat_amount
        OR v_item_validation.item_accepted_grand_total IS DISTINCT FROM v_header_grand_total
    THEN
        error_code := 'scope_unexpected_error';
        RETURN NEXT;
        RETURN;
    END IF;

    v_approved_at := transaction_timestamp();
    UPDATE public.approved_billing_scopes s
    SET status = 'approved',
        approved_at = v_approved_at,
        approved_by = p_actor_id,
        updated_by = p_actor_id
    WHERE s.id = p_scope_id
      AND s.status = 'draft'
      AND s.line_safety_status = 'safe'
      AND s.voided_at IS NULL
      AND s.superseded_at IS NULL;

    IF NOT FOUND THEN
        error_code := 'scope_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change', 'approved_billing_scope', p_scope_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'approved_billing_scope_approved',
            'actor_id', p_actor_id,
            'actor_role', p_actor_role,
            'transaction_timestamp', v_approved_at,
            'service_id', v_service_id,
            'source_quotation_id', v_source_quotation_id,
            'scope_id', p_scope_id,
            'scope_version', v_scope_version,
            'accepted_grand_total', v_header_grand_total,
            'lifecycle_outcome', 'approved'
        ),
        v_approved_at
    );

    approved_at := v_approved_at;
    approved := true;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_approved_billing_scope(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_approved_billing_scope(uuid, text, text) TO service_role;
COMMENT ON FUNCTION public.approve_approved_billing_scope(uuid, text, text) IS
    'Service-role-only Service-first ordinary initial approval; it serializes approval before Scope locking and never supersedes or reopens historical authority.';

CREATE OR REPLACE FUNCTION public.void_approved_billing_scope(
    p_scope_id uuid,
    p_reason_code text,
    p_reason_note text,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    scope_id uuid,
    service_id uuid,
    scope_version integer,
    applicable_invoice_count bigint,
    lifetime_invoice_total numeric,
    payment_history_count bigint,
    voided_at timestamptz,
    voided boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_scope_status text;
    v_scope_version integer;
    v_source_quotation_id uuid;
    v_scope_superseded_at timestamptz;
    v_scope_voided_at timestamptz;
    v_voided_at timestamptz;
BEGIN
    error_code := NULL;
    scope_id := p_scope_id;
    service_id := NULL;
    scope_version := NULL;
    applicable_invoice_count := 0;
    lifetime_invoice_total := 0;
    payment_history_count := 0;
    voided_at := NULL;
    voided := false;

    IF p_reason_code IS NULL
        OR p_reason_code NOT IN (
        'service_cancelled', 'customer_withdrew_scope', 'approved_in_error', 'other'
    )
        OR p_reason_note IS NULL
        OR btrim(p_reason_note) = ''
        OR length(btrim(p_reason_note)) > 1000
    THEN
        error_code := 'scope_reason_required';
        RETURN NEXT;
        RETURN;
    END IF;
    IF p_actor_id IS NULL OR btrim(p_actor_id) = ''
        OR p_actor_role IS NULL OR btrim(p_actor_role) = ''
    THEN
        error_code := 'scope_unexpected_error';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.service_id
    INTO v_service_id
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id;

    IF NOT FOUND THEN
        error_code := 'scope_not_found';
        scope_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT svc.status, svc.deleted_at
    INTO v_service_status, v_service_deleted_at
    FROM public.services svc
    WHERE svc.id = v_service_id
    FOR UPDATE;

    service_id := v_service_id;
    IF NOT FOUND OR v_service_deleted_at IS NOT NULL OR v_service_status = 'Completed' THEN
        error_code := 'scope_service_lifecycle_ineligible';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT
        s.status, s.scope_version, s.source_quotation_id,
        s.superseded_at, s.voided_at
    INTO
        v_scope_status, v_scope_version, v_source_quotation_id,
        v_scope_superseded_at, v_scope_voided_at
    FROM public.approved_billing_scopes s
    WHERE s.id = p_scope_id
      AND s.service_id = v_service_id
    FOR UPDATE;

    scope_version := v_scope_version;
    IF NOT FOUND THEN
        error_code := 'scope_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_scope_status = 'voided' OR v_scope_voided_at IS NOT NULL THEN
        error_code := 'scope_already_voided';
        voided_at := v_scope_voided_at;
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_scope_superseded_at IS NOT NULL THEN
        error_code := 'scope_already_superseded';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_scope_status <> 'approved' THEN
        error_code := 'scope_not_approved';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT *
    INTO applicable_invoice_count, lifetime_invoice_total
    FROM public._abs_get_service_invoice_exposure(v_service_id);
    payment_history_count := public._abs_get_service_payment_history_count(v_service_id);

    IF applicable_invoice_count <> 0 OR payment_history_count <> 0 THEN
        error_code := 'scope_void_financial_exposure';
        RETURN NEXT;
        RETURN;
    END IF;

    v_voided_at := transaction_timestamp();
    UPDATE public.approved_billing_scopes s
    SET status = 'voided',
        voided_at = v_voided_at,
        voided_by = p_actor_id,
        void_reason = btrim(p_reason_note),
        updated_by = p_actor_id
    WHERE s.id = p_scope_id
      AND s.status = 'approved'
      AND s.superseded_at IS NULL
      AND s.voided_at IS NULL;

    IF NOT FOUND THEN
        error_code := 'scope_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change', 'approved_billing_scope', p_scope_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'approved_billing_scope_voided',
            'actor_id', p_actor_id,
            'actor_role', p_actor_role,
            'transaction_timestamp', v_voided_at,
            'reason_code', p_reason_code,
            'reason_note', btrim(p_reason_note),
            'service_id', v_service_id,
            'source_quotation_id', v_source_quotation_id,
            'scope_id', p_scope_id,
            'scope_version', v_scope_version,
            'applicable_invoice_count', applicable_invoice_count,
            'lifetime_invoice_total', lifetime_invoice_total,
            'payment_history_count', payment_history_count,
            'service_status', v_service_status,
            'lifecycle_outcome', 'voided'
        ),
        v_voided_at
    );

    voided_at := v_voided_at;
    voided := true;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.void_approved_billing_scope(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.void_approved_billing_scope(uuid, text, text, text, text) TO service_role;
COMMENT ON FUNCTION public.void_approved_billing_scope(uuid, text, text, text, text) IS
    'Service-role-only active-authority void. Requires zero Service invoices and zero payment history and never mutates either table.';

CREATE OR REPLACE FUNCTION public.create_approved_billing_scope_successor(
    p_source_scope_id uuid,
    p_reason_code text,
    p_reason_note text,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    source_scope_id uuid,
    successor_scope_id uuid,
    service_id uuid,
    source_scope_version integer,
    successor_scope_version integer,
    accepted_grand_total numeric,
    created boolean,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_source_scope public.approved_billing_scopes%ROWTYPE;
    v_existing_draft public.approved_billing_scopes%ROWTYPE;
    v_successor_scope_id uuid;
    v_successor_scope_version integer;
    v_created_at timestamptz;
BEGIN
    error_code := NULL;
    source_scope_id := p_source_scope_id;
    successor_scope_id := NULL;
    service_id := NULL;
    source_scope_version := NULL;
    successor_scope_version := NULL;
    accepted_grand_total := NULL;
    created := false;
    idempotent_replay := false;

    IF p_reason_code IS NULL
        OR p_reason_code NOT IN (
        'customer_scope_revision', 'commercial_scope_correction',
        'approved_scope_correction', 'other'
    )
        OR p_reason_note IS NULL
        OR btrim(p_reason_note) = ''
        OR length(btrim(p_reason_note)) > 1000
    THEN
        error_code := 'scope_reason_required';
        RETURN NEXT;
        RETURN;
    END IF;
    IF p_actor_id IS NULL OR btrim(p_actor_id) = ''
        OR p_actor_role IS NULL OR btrim(p_actor_role) = ''
    THEN
        error_code := 'scope_unexpected_error';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.service_id
    INTO v_service_id
    FROM public.approved_billing_scopes s
    WHERE s.id = p_source_scope_id;

    IF NOT FOUND THEN
        error_code := 'scope_not_found';
        source_scope_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT svc.status, svc.deleted_at
    INTO v_service_status, v_service_deleted_at
    FROM public.services svc
    WHERE svc.id = v_service_id
    FOR UPDATE;

    service_id := v_service_id;
    IF NOT FOUND OR v_service_deleted_at IS NOT NULL
        OR v_service_status IN ('Completed', 'Cancelled')
    THEN
        error_code := 'scope_service_lifecycle_ineligible';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.*
    INTO v_source_scope
    FROM public.approved_billing_scopes s
    WHERE s.id = p_source_scope_id
      AND s.service_id = v_service_id
    FOR UPDATE;

    source_scope_version := v_source_scope.scope_version;
    accepted_grand_total := v_source_scope.accepted_grand_total;
    IF NOT FOUND THEN
        error_code := 'scope_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_source_scope.status = 'voided' OR v_source_scope.voided_at IS NOT NULL THEN
        error_code := 'scope_already_voided';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_source_scope.superseded_at IS NOT NULL THEN
        error_code := 'scope_already_superseded';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_source_scope.status <> 'approved' THEN
        error_code := 'scope_not_active';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.*
    INTO v_existing_draft
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id
      AND s.status = 'draft'
    FOR UPDATE;

    IF FOUND THEN
        successor_scope_id := v_existing_draft.id;
        successor_scope_version := v_existing_draft.scope_version;
        accepted_grand_total := v_existing_draft.accepted_grand_total;

        IF v_existing_draft.supersedes_scope_id = p_source_scope_id
            AND v_existing_draft.change_summary_reason = btrim(p_reason_note)
            AND v_existing_draft.created_by = p_actor_id
            AND EXISTS (
                SELECT 1
                FROM public.audit_logs a
                WHERE a.action = 'create'
                  AND a.entity_type = 'approved_billing_scope'
                  AND a.entity_id = v_existing_draft.id
                  AND a.user_id = p_actor_id
                  AND a.details ->> 'event_type' = 'approved_billing_scope_successor_created'
                  AND a.details ->> 'reason_code' = p_reason_code
                  AND a.details ->> 'reason_note' = btrim(p_reason_note)
                  AND a.details ->> 'actor_role' = p_actor_role
            )
        THEN
            idempotent_replay := true;
            RETURN NEXT;
            RETURN;
        END IF;

        error_code := 'scope_successor_exists';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT COALESCE(max(s.scope_version), 0) + 1
    INTO v_successor_scope_version
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id;

    v_created_at := transaction_timestamp();
    INSERT INTO public.approved_billing_scopes (
        service_id, source_quotation_id, scope_version, status,
        accepted_subtotal, accepted_vat_amount, accepted_grand_total,
        source_vat_rate, source_discount, source_currency,
        source_quotation_subtotal, source_quotation_vat_amount,
        source_quotation_grand_total, source_pricing_context,
        line_safety_status, line_safety_reason_code, line_safety_note,
        line_safety_reviewed_by, line_safety_reviewed_at,
        change_summary_reason, approved_at, approved_by,
        superseded_at, superseded_by_scope_id, supersedes_scope_id,
        voided_at, voided_by, void_reason,
        created_by, updated_by, created_at, updated_at
    ) VALUES (
        v_source_scope.service_id, v_source_scope.source_quotation_id,
        v_successor_scope_version, 'draft',
        v_source_scope.accepted_subtotal, v_source_scope.accepted_vat_amount,
        v_source_scope.accepted_grand_total, v_source_scope.source_vat_rate,
        v_source_scope.source_discount, v_source_scope.source_currency,
        v_source_scope.source_quotation_subtotal,
        v_source_scope.source_quotation_vat_amount,
        v_source_scope.source_quotation_grand_total,
        v_source_scope.source_pricing_context,
        'pending_review', NULL, NULL, NULL, NULL,
        btrim(p_reason_note), NULL, NULL, NULL, NULL, p_source_scope_id,
        NULL, NULL, NULL, p_actor_id, p_actor_id, v_created_at, v_created_at
    )
    RETURNING id INTO v_successor_scope_id;

    INSERT INTO public.approved_billing_scope_items (
        approved_billing_scope_id, source_quotation_id,
        source_quotation_item_id, display_order, decision,
        source_description, source_details, source_category,
        source_qty, source_unit_price, source_subtotal,
        source_vat_amount, source_grand_total,
        accepted_qty, accepted_unit_price, accepted_subtotal,
        accepted_vat_amount, accepted_grand_total,
        reason_code, reason_note, created_at, updated_at
    )
    SELECT
        v_successor_scope_id, i.source_quotation_id,
        i.source_quotation_item_id, i.display_order, i.decision,
        i.source_description, i.source_details, i.source_category,
        i.source_qty, i.source_unit_price, i.source_subtotal,
        i.source_vat_amount, i.source_grand_total,
        i.accepted_qty, i.accepted_unit_price, i.accepted_subtotal,
        i.accepted_vat_amount, i.accepted_grand_total,
        i.reason_code, i.reason_note, v_created_at, v_created_at
    FROM public.approved_billing_scope_items i
    WHERE i.approved_billing_scope_id = p_source_scope_id
    ORDER BY i.id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create', 'approved_billing_scope', v_successor_scope_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'approved_billing_scope_successor_created',
            'actor_id', p_actor_id,
            'actor_role', p_actor_role,
            'transaction_timestamp', v_created_at,
            'reason_code', p_reason_code,
            'reason_note', btrim(p_reason_note),
            'service_id', v_service_id,
            'source_quotation_id', v_source_scope.source_quotation_id,
            'source_scope_id', p_source_scope_id,
            'source_scope_version', v_source_scope.scope_version,
            'successor_scope_id', v_successor_scope_id,
            'successor_scope_version', v_successor_scope_version,
            'accepted_grand_total', v_source_scope.accepted_grand_total,
            'lifecycle_outcome', 'successor_draft_created'
        ),
        v_created_at
    );

    successor_scope_id := v_successor_scope_id;
    successor_scope_version := v_successor_scope_version;
    created := true;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_approved_billing_scope_successor(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_approved_billing_scope_successor(uuid, text, text, text, text) TO service_role;
COMMENT ON FUNCTION public.create_approved_billing_scope_successor(uuid, text, text, text, text) IS
    'Service-role-only transactional clone of the active authority; the source remains active and historical invoices remain unchanged.';

CREATE OR REPLACE FUNCTION public.approve_and_supersede_approved_billing_scope(
    p_source_scope_id uuid,
    p_successor_scope_id uuid,
    p_reason_code text,
    p_reason_note text,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    source_scope_id uuid,
    successor_scope_id uuid,
    service_id uuid,
    source_scope_version integer,
    successor_scope_version integer,
    applicable_invoice_count bigint,
    lifetime_invoice_total numeric,
    previous_ceiling numeric,
    successor_ceiling numeric,
    remaining_billable numeric,
    activated_at timestamptz,
    activated boolean,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_source_service_id uuid;
    v_successor_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_source_scope public.approved_billing_scopes%ROWTYPE;
    v_successor_scope public.approved_billing_scopes%ROWTYPE;
    v_item_validation record;
    v_activation_audit record;
    v_activated_at timestamptz;
BEGIN
    error_code := NULL;
    source_scope_id := p_source_scope_id;
    successor_scope_id := p_successor_scope_id;
    service_id := NULL;
    source_scope_version := NULL;
    successor_scope_version := NULL;
    applicable_invoice_count := 0;
    lifetime_invoice_total := 0;
    previous_ceiling := NULL;
    successor_ceiling := NULL;
    remaining_billable := NULL;
    activated_at := NULL;
    activated := false;
    idempotent_replay := false;

    IF p_source_scope_id = p_successor_scope_id THEN
        error_code := 'scope_successor_invalid';
        RETURN NEXT;
        RETURN;
    END IF;
    IF p_reason_code IS NULL
        OR p_reason_code NOT IN (
        'customer_scope_revision', 'commercial_scope_correction',
        'approved_scope_correction', 'other'
    )
        OR p_reason_note IS NULL
        OR btrim(p_reason_note) = ''
        OR length(btrim(p_reason_note)) > 1000
    THEN
        error_code := 'scope_reason_required';
        RETURN NEXT;
        RETURN;
    END IF;
    IF p_actor_id IS NULL OR btrim(p_actor_id) = ''
        OR p_actor_role IS NULL OR btrim(p_actor_role) = ''
    THEN
        error_code := 'scope_unexpected_error';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.service_id
    INTO v_source_service_id
    FROM public.approved_billing_scopes s
    WHERE s.id = p_source_scope_id;
    IF NOT FOUND THEN
        error_code := 'scope_not_found';
        source_scope_id := NULL;
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT s.service_id
    INTO v_successor_service_id
    FROM public.approved_billing_scopes s
    WHERE s.id = p_successor_scope_id;
    IF NOT FOUND OR v_successor_service_id IS DISTINCT FROM v_source_service_id THEN
        error_code := 'scope_successor_invalid';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT svc.status, svc.deleted_at
    INTO v_service_status, v_service_deleted_at
    FROM public.services svc
    WHERE svc.id = v_source_service_id
    FOR UPDATE;

    service_id := v_source_service_id;
    IF NOT FOUND OR v_service_deleted_at IS NOT NULL
        OR v_service_status IN ('Completed', 'Cancelled')
    THEN
        error_code := 'scope_service_lifecycle_ineligible';
        RETURN NEXT;
        RETURN;
    END IF;

    PERFORM s.id
    FROM public.approved_billing_scopes s
    WHERE s.id IN (p_source_scope_id, p_successor_scope_id)
    ORDER BY s.id
    FOR UPDATE;

    SELECT s.* INTO v_source_scope
    FROM public.approved_billing_scopes s
    WHERE s.id = p_source_scope_id
      AND s.service_id = v_source_service_id;
    SELECT s.* INTO v_successor_scope
    FROM public.approved_billing_scopes s
    WHERE s.id = p_successor_scope_id
      AND s.service_id = v_source_service_id;

    source_scope_version := v_source_scope.scope_version;
    successor_scope_version := v_successor_scope.scope_version;
    previous_ceiling := v_source_scope.accepted_grand_total;
    successor_ceiling := v_successor_scope.accepted_grand_total;

    IF v_source_scope.superseded_at IS NOT NULL THEN
        IF v_source_scope.superseded_by_scope_id = p_successor_scope_id
            AND v_successor_scope.status = 'approved'
            AND v_successor_scope.supersedes_scope_id = p_source_scope_id
            AND v_successor_scope.superseded_at IS NULL
            AND v_successor_scope.voided_at IS NULL
        THEN
            SELECT a.details, a.timestamp
            INTO v_activation_audit
            FROM public.audit_logs a
            WHERE a.action = 'status_change'
              AND a.entity_type = 'approved_billing_scope'
              AND a.entity_id = p_successor_scope_id
              AND a.user_id = p_actor_id
              AND a.details ->> 'event_type' = 'approved_billing_scope_superseded'
              AND a.details ->> 'source_scope_id' = p_source_scope_id::text
              AND a.details ->> 'successor_scope_id' = p_successor_scope_id::text
              AND a.details ->> 'reason_code' = p_reason_code
              AND a.details ->> 'reason_note' = btrim(p_reason_note)
              AND a.details ->> 'actor_role' = p_actor_role
            ORDER BY a.timestamp DESC
            LIMIT 1;

            IF FOUND THEN
                applicable_invoice_count := (v_activation_audit.details ->> 'applicable_invoice_count')::bigint;
                lifetime_invoice_total := (v_activation_audit.details ->> 'lifetime_invoice_total')::numeric;
                previous_ceiling := (v_activation_audit.details ->> 'previous_ceiling')::numeric;
                successor_ceiling := (v_activation_audit.details ->> 'successor_ceiling')::numeric;
                remaining_billable := (v_activation_audit.details ->> 'remaining_billable')::numeric;
                activated_at := v_activation_audit.timestamp;
                activated := true;
                idempotent_replay := true;
                RETURN NEXT;
                RETURN;
            END IF;
        END IF;

        error_code := 'scope_already_superseded';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_source_scope.status = 'voided' OR v_source_scope.voided_at IS NOT NULL THEN
        error_code := 'scope_already_voided';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_source_scope.status <> 'approved'
        OR v_source_scope.voided_at IS NOT NULL
        OR v_successor_scope.status <> 'draft'
        OR v_successor_scope.voided_at IS NOT NULL
        OR v_successor_scope.superseded_at IS NOT NULL
        OR v_successor_scope.supersedes_scope_id IS DISTINCT FROM p_source_scope_id
        OR v_successor_scope.source_quotation_id IS DISTINCT FROM v_source_scope.source_quotation_id
    THEN
        error_code := 'scope_successor_invalid';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_successor_scope.line_safety_status <> 'safe' THEN
        error_code := 'scope_not_safe';
        RETURN NEXT;
        RETURN;
    END IF;

    PERFORM i.id
    FROM public.approved_billing_scope_items i
    WHERE i.approved_billing_scope_id = p_successor_scope_id
    ORDER BY i.id
    FOR UPDATE;

    SELECT * INTO v_item_validation
    FROM public._abs_validate_scope_items(p_successor_scope_id);

    IF v_item_validation.validation_error IS NOT NULL THEN
        error_code := v_item_validation.validation_error;
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_item_validation.billable_item_count = 0 THEN
        error_code := 'scope_no_billable_items';
        RETURN NEXT;
        RETURN;
    END IF;
    IF v_item_validation.item_accepted_subtotal IS DISTINCT FROM v_successor_scope.accepted_subtotal
        OR v_item_validation.item_accepted_vat_amount IS DISTINCT FROM v_successor_scope.accepted_vat_amount
        OR v_item_validation.item_accepted_grand_total IS DISTINCT FROM v_successor_scope.accepted_grand_total
    THEN
        error_code := 'scope_successor_invalid';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT *
    INTO applicable_invoice_count, lifetime_invoice_total
    FROM public._abs_get_service_invoice_exposure(v_source_service_id);

    IF v_successor_scope.accepted_grand_total < lifetime_invoice_total THEN
        error_code := 'scope_successor_ceiling_below_invoiced';
        remaining_billable := v_successor_scope.accepted_grand_total - lifetime_invoice_total;
        RETURN NEXT;
        RETURN;
    END IF;

    remaining_billable := v_successor_scope.accepted_grand_total - lifetime_invoice_total;
    v_activated_at := transaction_timestamp();

    UPDATE public.approved_billing_scopes s
    SET superseded_at = v_activated_at,
        superseded_by_scope_id = p_successor_scope_id,
        updated_by = p_actor_id
    WHERE s.id = p_source_scope_id
      AND s.status = 'approved'
      AND s.superseded_at IS NULL
      AND s.voided_at IS NULL;

    IF NOT FOUND THEN
        error_code := 'scope_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    UPDATE public.approved_billing_scopes s
    SET status = 'approved',
        approved_at = v_activated_at,
        approved_by = p_actor_id,
        updated_by = p_actor_id
    WHERE s.id = p_successor_scope_id
      AND s.status = 'draft'
      AND s.line_safety_status = 'safe'
      AND s.supersedes_scope_id = p_source_scope_id
      AND s.superseded_at IS NULL
      AND s.voided_at IS NULL;

    IF NOT FOUND THEN
        error_code := 'scope_concurrency_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change', 'approved_billing_scope', p_successor_scope_id, p_actor_id,
        jsonb_build_object(
            'event_type', 'approved_billing_scope_superseded',
            'actor_id', p_actor_id,
            'actor_role', p_actor_role,
            'transaction_timestamp', v_activated_at,
            'reason_code', p_reason_code,
            'reason_note', btrim(p_reason_note),
            'service_id', v_source_service_id,
            'source_quotation_id', v_source_scope.source_quotation_id,
            'source_scope_id', p_source_scope_id,
            'source_scope_version', v_source_scope.scope_version,
            'successor_scope_id', p_successor_scope_id,
            'successor_scope_version', v_successor_scope.scope_version,
            'applicable_invoice_count', applicable_invoice_count,
            'lifetime_invoice_total', lifetime_invoice_total,
            'payment_history_count', public._abs_get_service_payment_history_count(v_source_service_id),
            'previous_ceiling', v_source_scope.accepted_grand_total,
            'successor_ceiling', v_successor_scope.accepted_grand_total,
            'remaining_billable', remaining_billable,
            'lifecycle_outcome', 'successor_activated'
        ),
        v_activated_at
    );

    activated_at := v_activated_at;
    activated := true;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_and_supersede_approved_billing_scope(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_and_supersede_approved_billing_scope(uuid, uuid, text, text, text, text) TO service_role;
COMMENT ON FUNCTION public.approve_and_supersede_approved_billing_scope(uuid, uuid, text, text, text, text) IS
    'Service-role-only atomic activation: Service lock, deterministic scope locks, lifetime exposure validation, retire source, approve successor, audit.';

REVOKE ALL ON FUNCTION public.check_invoices_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_approved_billing_scopes_before_write() FROM PUBLIC, anon, authenticated;

REVOKE ALL PRIVILEGES ON TABLE
    public.approved_billing_scopes,
    public.approved_billing_scope_items,
    public.invoices,
    public.payments,
    public.audit_logs
FROM PUBLIC, anon, authenticated;

COMMIT;
