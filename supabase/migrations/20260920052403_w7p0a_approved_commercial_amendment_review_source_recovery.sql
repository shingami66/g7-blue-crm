-- W7-P0A source recovery for DEV migration 20260919123842.
-- The amendment creation RPC is governed by the published 20260919152000
-- recovery source; approval is governed by the later W2A metadata recovery.
BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_approved_quotation_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_allowed_source text;
    v_successor public.quotations%ROWTYPE;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'approved' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved_quotation_immutable';
        END IF;
        RETURN OLD;
    END IF;

    IF OLD.status <> 'approved' THEN
        RETURN NEW;
    END IF;

    v_allowed_source := current_setting('g7.w7p0a_allow_quotation_supersession', true);
    IF v_allowed_source IS NOT NULL AND v_allowed_source = OLD.id::text THEN
        SELECT q.*
        INTO v_successor
        FROM public.quotations q
        WHERE q.id = NEW.superseded_by_quotation_id
          AND q.service_id = OLD.service_id
        FOR SHARE;
        IF NOT FOUND
            OR v_successor.quotation_family_id IS DISTINCT FROM OLD.quotation_family_id
            OR v_successor.revision_of_quotation_id IS DISTINCT FROM OLD.id
            OR COALESCE(v_successor.is_deleted, false)
        THEN
            RAISE EXCEPTION USING MESSAGE = 'approved_quotation_immutable';
        END IF;
    END IF;
    IF v_allowed_source IS NULL
        OR v_allowed_source <> OLD.id::text
        OR NEW.status IS DISTINCT FROM OLD.status
        OR OLD.superseded_at IS NOT NULL
        OR NEW.superseded_at IS NULL
        OR NEW.superseded_by_quotation_id IS NULL
        OR NEW.superseded_by_quotation_id = OLD.id
        OR NEW.quotation_number IS DISTINCT FROM OLD.quotation_number
        OR NEW.service_id IS DISTINCT FROM OLD.service_id
        OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
        OR NEW.event IS DISTINCT FROM OLD.event
        OR NEW.date IS DISTINCT FROM OLD.date
        OR NEW.valid_until IS DISTINCT FROM OLD.valid_until
        OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
        OR NEW.discount IS DISTINCT FROM OLD.discount
        OR NEW.vat_rate IS DISTINCT FROM OLD.vat_rate
        OR NEW.vat_amount IS DISTINCT FROM OLD.vat_amount
        OR NEW.grand_total IS DISTINCT FROM OLD.grand_total
        OR NEW.mutation_key IS DISTINCT FROM OLD.mutation_key
        OR NEW.mutation_payload IS DISTINCT FROM OLD.mutation_payload
        OR NEW.snapshot_seller IS DISTINCT FROM OLD.snapshot_seller
        OR NEW.snapshot_buyer IS DISTINCT FROM OLD.snapshot_buyer
        OR NEW.is_deleted IS DISTINCT FROM OLD.is_deleted
        OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
        OR NEW.created_by IS DISTINCT FROM OLD.created_by
        OR NEW.quotation_family_id IS DISTINCT FROM OLD.quotation_family_id
        OR NEW.revision_of_quotation_id IS DISTINCT FROM OLD.revision_of_quotation_id
        OR NEW.revision_number IS DISTINCT FROM OLD.revision_number
        OR NEW.revision_reason IS DISTINCT FROM OLD.revision_reason
        OR NEW.amendment_approval_key IS DISTINCT FROM OLD.amendment_approval_key
        OR NEW.amendment_approval_payload IS DISTINCT FROM OLD.amendment_approval_payload
    THEN
        RAISE EXCEPTION USING MESSAGE = 'approved_quotation_immutable';
    END IF;

    RETURN NEW;
END;
$$;

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
    v_source public.quotations%ROWTYPE;
    v_item_validation record;
    v_items_discount_allocated numeric(12,2);
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

    IF NEW.status = 'approved' AND v_service_status IN ('Completed', 'Cancelled') THEN
        RAISE EXCEPTION USING MESSAGE = 'scope_service_lifecycle_ineligible';
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
        IF NEW.voided_at IS NULL OR NEW.voided_by IS NULL OR btrim(NEW.voided_by) = ''
            OR NEW.void_reason IS NULL OR btrim(NEW.void_reason) = ''
        THEN
            RAISE EXCEPTION USING MESSAGE = 'voided scopes require void metadata';
        END IF;

        SELECT * INTO v_applicable_invoice_count, v_lifetime_invoice_total
        FROM public._abs_get_service_invoice_exposure(v_authoritative_service_id);
        v_payment_history_count := public._abs_get_service_payment_history_count(v_authoritative_service_id);
        IF v_applicable_invoice_count <> 0 OR v_payment_history_count <> 0 THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_void_financial_exposure';
        END IF;
    END IF;

    IF NEW.status = 'approved'
        AND (TG_OP <> 'UPDATE' OR OLD.status IS DISTINCT FROM 'approved')
    THEN
        SELECT q.* INTO v_source
        FROM public.quotations q
        WHERE q.id = NEW.source_quotation_id;

        IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'source quotation not found'; END IF;
        IF v_source.status <> 'approved' THEN RAISE EXCEPTION USING MESSAGE = 'source quotation must be approved'; END IF;
        IF COALESCE(v_source.is_deleted, false) THEN RAISE EXCEPTION USING MESSAGE = 'source quotation must not be deleted'; END IF;
        IF v_source.service_id IS DISTINCT FROM NEW.service_id THEN
            RAISE EXCEPTION USING MESSAGE = 'source quotation service_id must match scope service_id';
        END IF;
        IF COALESCE(v_source.discount, 0) > 0
            AND upper(COALESCE(NULLIF(btrim(v_source.snapshot_seller ->> 'currency'), ''), 'SAR')) <> 'SAR'
        THEN
            RAISE EXCEPTION USING MESSAGE = 'w2c_discount_currency_unsupported';
        END IF;
        IF NEW.line_safety_status <> 'safe' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved scopes require line_safety_status = safe';
        END IF;
        IF NEW.approved_at IS NULL OR NEW.approved_by IS NULL OR btrim(NEW.approved_by) = '' THEN
            RAISE EXCEPTION USING MESSAGE = 'approved scopes require approved_at and approved_by';
        END IF;

        IF NEW.supersedes_scope_id IS NULL THEN
            IF EXISTS (
                SELECT 1 FROM public.approved_billing_scopes active_scope
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

        SELECT * INTO v_item_validation FROM public._abs_validate_scope_items(NEW.id);
        IF v_item_validation.validation_error IS NOT NULL
            OR v_item_validation.billable_item_count = 0
            OR v_item_validation.item_accepted_subtotal IS DISTINCT FROM NEW.accepted_subtotal
            OR v_item_validation.item_accepted_vat_amount IS DISTINCT FROM NEW.accepted_vat_amount
            OR v_item_validation.item_accepted_grand_total IS DISTINCT FROM NEW.accepted_grand_total
        THEN
            RAISE EXCEPTION USING MESSAGE = COALESCE(v_item_validation.validation_error, 'approved scope item/header totals are invalid');
        END IF;

        SELECT COALESCE(sum(i.source_discount_allocated), 0)
        INTO v_items_discount_allocated
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = NEW.id;
        IF v_items_discount_allocated IS DISTINCT FROM COALESCE(v_source.discount, 0) THEN
            RAISE EXCEPTION USING MESSAGE = 'source quotation discount allocation is not reconciled';
        END IF;

        SELECT * INTO v_applicable_invoice_count, v_lifetime_invoice_total
        FROM public._abs_get_service_invoice_exposure(NEW.service_id);
        IF v_lifetime_invoice_total > NEW.accepted_grand_total THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_successor_ceiling_below_invoiced';
        END IF;

        IF NEW.supersedes_scope_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.approved_billing_scopes p
            JOIN public.quotations predecessor ON predecessor.id = p.source_quotation_id
            JOIN public.quotations successor ON successor.id = NEW.source_quotation_id
            WHERE p.id = NEW.supersedes_scope_id
              AND p.service_id = NEW.service_id
              AND p.status = 'approved'
              AND p.superseded_at IS NOT NULL
              AND p.superseded_by_scope_id = NEW.id
              AND (
                  p.source_quotation_id = NEW.source_quotation_id
                  OR (
                      successor.revision_of_quotation_id = predecessor.id
                      AND successor.quotation_family_id = predecessor.quotation_family_id
                      AND successor.service_id = predecessor.service_id
                  )
              )
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_approved_quotation_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_approved_billing_scopes_before_write() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_approved_quotation_mutation() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_approved_billing_scopes_before_write() TO service_role;

COMMIT;
