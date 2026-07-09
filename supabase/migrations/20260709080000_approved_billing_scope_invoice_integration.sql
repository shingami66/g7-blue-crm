-- Migration 20260709080000_approved_billing_scope_invoice_integration.sql
-- Purpose:
--   1. Add nullable invoices.approved_billing_scope_id uuid.
--   2. Add composite foreign key constraint: (approved_billing_scope_id, service_id) -> approved_billing_scopes(id, service_id).
--   3. Add index on invoices.approved_billing_scope_id.
--   4. Add trigger to enforce invoice ceiling limits and validate referenced scope.
--   5. Redefine approved_billing_scopes trigger function to incorporate active invoice safety guards.
-- Concurrency lock: Uses parent service row locks to serialize invoicing/scope updates.
-- Active invoice predicate: status NOT IN ('cancelled', 'voided') AND voided_at IS NULL AND COALESCE(is_deleted, false) = false.

-- 1. Add nullable approved_billing_scope_id uuid
ALTER TABLE public.invoices
  ADD COLUMN approved_billing_scope_id uuid;

-- 2. Add composite foreign key constraint
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_approved_billing_scope_id_service_id_fkey
  FOREIGN KEY (approved_billing_scope_id, service_id)
  REFERENCES public.approved_billing_scopes (id, service_id)
  ON DELETE RESTRICT;

-- 3. Create index for performance
CREATE INDEX idx_invoices_approved_billing_scope_id
  ON public.invoices (approved_billing_scope_id);

-- 4. Create trigger function for invoices
-- NOTE: This trigger assumes invoices.voided_at and invoices.is_deleted
-- exist in the applied DB schema. Pre-apply SQL must verify these columns
-- before DEV/DEMO apply. If missing, HOLD and redesign migration.
CREATE OR REPLACE FUNCTION public.check_invoices_before_write()
RETURNS TRIGGER AS $$
DECLARE
    v_scope_status text;
    v_scope_superseded_at timestamptz;
    v_scope_voided_at timestamptz;
    v_scope_service_id uuid;
    v_active_scope_ceiling numeric(12,2);
    v_total_active_invoiced numeric(12,2);
BEGIN
    -- Concurrency Lock: Serialize all invoice/scope writes for the service
    IF NEW.service_id IS NOT NULL THEN
        PERFORM 1 FROM public.services WHERE id = NEW.service_id FOR UPDATE;
    END IF;

    -- Validate referenced billing scope
    IF NEW.approved_billing_scope_id IS NOT NULL THEN
        SELECT status, superseded_at, voided_at, service_id
        INTO v_scope_status, v_scope_superseded_at, v_scope_voided_at, v_scope_service_id
        FROM public.approved_billing_scopes
        WHERE id = NEW.approved_billing_scope_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'referenced approved billing scope not found';
        END IF;

        IF v_scope_service_id IS DISTINCT FROM NEW.service_id THEN
            RAISE EXCEPTION 'referenced billing scope service_id (%) must match invoice service_id (%)',
                v_scope_service_id, NEW.service_id;
        END IF;

        -- Must point to an active approved scope when first set or updated
        IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.approved_billing_scope_id IS DISTINCT FROM NEW.approved_billing_scope_id) THEN
            IF v_scope_status <> 'approved' OR v_scope_superseded_at IS NOT NULL OR v_scope_voided_at IS NOT NULL THEN
                RAISE EXCEPTION 'referenced billing scope is not active or is voided/superseded';
            END IF;
        END IF;
    END IF;

    -- Enforce invoice ceiling if an active approved scope exists for this service
    SELECT accepted_grand_total INTO v_active_scope_ceiling
    FROM public.approved_billing_scopes
    WHERE service_id = NEW.service_id
      AND status = 'approved'
      AND superseded_at IS NULL
      AND voided_at IS NULL;

    IF FOUND THEN
        -- Calculate total of other active invoices for this service
        SELECT COALESCE(SUM(grand_total), 0) INTO v_total_active_invoiced
        FROM public.invoices
        WHERE service_id = NEW.service_id
          AND id IS DISTINCT FROM NEW.id
          AND status NOT IN ('cancelled', 'voided')
          AND voided_at IS NULL
          AND COALESCE(is_deleted, false) = false;

        -- If current invoice is active, check against the ceiling
        IF NEW.status NOT IN ('cancelled', 'voided') AND NEW.voided_at IS NULL AND COALESCE(NEW.is_deleted, false) = false THEN
            -- Fail closed: NULL grand_total must not silently pass ceiling math
            IF NEW.grand_total IS NULL THEN
                RAISE EXCEPTION 'invoice grand_total cannot be null when service % has an active billing scope', NEW.service_id;
            END IF;

            IF v_total_active_invoiced + NEW.grand_total > v_active_scope_ceiling THEN
                RAISE EXCEPTION 'invoice total (%) exceeds active billing scope ceiling (%) for service %',
                    (v_total_active_invoiced + NEW.grand_total), v_active_scope_ceiling, NEW.service_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Bind trigger to invoices
DROP TRIGGER IF EXISTS check_invoices_before_write_trg ON public.invoices;
CREATE TRIGGER check_invoices_before_write_trg
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.check_invoices_before_write();

-- 6. Redefine approved_billing_scopes trigger function to incorporate safety checks
CREATE OR REPLACE FUNCTION public.check_approved_billing_scopes_before_write()
RETURNS TRIGGER AS $$
DECLARE
    v_source_status text;
    v_source_is_deleted boolean;
    v_source_service_id uuid;
    v_source_discount numeric(12,2);
    v_items_accepted_subtotal numeric(12,2);
    v_items_accepted_vat_amount numeric(12,2);
    v_items_accepted_grand_total numeric(12,2);
    v_total_active_invoiced numeric(12,2);
    v_new_scope_total numeric(12,2);
BEGIN
    -- Concurrency Lock: Serialize all invoice/scope writes for the service
    PERFORM 1 FROM public.services WHERE id = NEW.service_id FOR UPDATE;

    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'approved' THEN
            RAISE EXCEPTION 'approved billing scopes cannot be inserted directly as approved';
        END IF;

        IF NEW.status = 'voided' THEN
            RAISE EXCEPTION 'approved billing scopes cannot be inserted directly as voided';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.service_id IS DISTINCT FROM NEW.service_id THEN
            RAISE EXCEPTION 'service_id is immutable';
        END IF;

        IF OLD.source_quotation_id IS DISTINCT FROM NEW.source_quotation_id THEN
            RAISE EXCEPTION 'source_quotation_id is immutable';
        END IF;

        IF OLD.status = 'voided' THEN
            RAISE EXCEPTION 'voided scopes are terminal and cannot be updated';
        END IF;

        IF OLD.status = 'approved' THEN
            IF NEW.status NOT IN ('approved', 'voided') THEN
                RAISE EXCEPTION 'approved scope status may only remain approved or transition to voided';
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
                RAISE EXCEPTION 'approved scope header fields are immutable';
            END IF;

            -- New Rule: Block voiding scope when active invoices exist for it
            IF NEW.status = 'voided' THEN
                IF EXISTS (
                    SELECT 1 FROM public.invoices
                    WHERE approved_billing_scope_id = OLD.id
                      AND status NOT IN ('cancelled', 'voided')
                      AND voided_at IS NULL
                      AND COALESCE(is_deleted, false) = false
                ) THEN
                    RAISE EXCEPTION 'cannot void approved billing scope because it has active invoices';
                END IF;
            END IF;

            -- New Rule: Block superseding scope when active invoices total exceeds new scope total
            IF NEW.superseded_at IS NOT NULL AND OLD.superseded_at IS NULL THEN
                IF NEW.superseded_by_scope_id IS NULL THEN
                    RAISE EXCEPTION 'superseded_by_scope_id must be set when superseding a scope';
                END IF;

                SELECT accepted_grand_total INTO v_new_scope_total
                FROM public.approved_billing_scopes
                WHERE id = NEW.superseded_by_scope_id
                  AND service_id = OLD.service_id
                  AND status = 'approved'
                  AND voided_at IS NULL
                  AND superseded_at IS NULL;

                IF NOT FOUND THEN
                    RAISE EXCEPTION 'supersede target scope not found or not an active approved scope for this service';
                END IF;

                SELECT COALESCE(SUM(grand_total), 0) INTO v_total_active_invoiced
                FROM public.invoices
                WHERE service_id = OLD.service_id
                  AND status NOT IN ('cancelled', 'voided')
                  AND voided_at IS NULL
                  AND COALESCE(is_deleted, false) = false;

                IF v_total_active_invoiced > v_new_scope_total THEN
                    RAISE EXCEPTION 'cannot supersede approved billing scope because active invoices total (%) exceeds the new scope grand total (%)',
                        v_total_active_invoiced, v_new_scope_total;
                END IF;
            END IF;
        END IF;
    END IF;

    IF NEW.status = 'voided' THEN
        IF NEW.voided_at IS NULL
            OR NEW.voided_by IS NULL
            OR trim(NEW.voided_by) = ''
            OR NEW.void_reason IS NULL
            OR trim(NEW.void_reason) = ''
        THEN
            RAISE EXCEPTION 'voided scopes require voided_at, voided_by, and void_reason';
        END IF;
    END IF;

    IF NEW.status = 'approved'
        AND (TG_OP <> 'UPDATE' OR OLD.status IS DISTINCT FROM 'approved')
    THEN
        SELECT q.status, q.is_deleted, q.service_id, q.discount
        INTO v_source_status, v_source_is_deleted, v_source_service_id, v_source_discount
        FROM public.quotations q
        WHERE q.id = NEW.source_quotation_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'source quotation not found';
        END IF;

        IF v_source_status <> 'approved' THEN
            RAISE EXCEPTION 'source quotation must be approved';
        END IF;

        IF coalesce(v_source_is_deleted, false) THEN
            RAISE EXCEPTION 'source quotation must not be deleted';
        END IF;

        IF v_source_service_id IS DISTINCT FROM NEW.service_id THEN
            RAISE EXCEPTION 'source quotation service_id must match scope service_id';
        END IF;

        IF coalesce(v_source_discount, 0) > 0 THEN
            RAISE EXCEPTION 'Approved Billing Scope V1 blocks approval when source quotation discount > 0';
        END IF;

        IF NEW.line_safety_status <> 'safe' THEN
            RAISE EXCEPTION 'approved scopes require line_safety_status = safe';
        END IF;

        IF NEW.approved_at IS NULL OR NEW.approved_by IS NULL OR trim(NEW.approved_by) = '' THEN
            RAISE EXCEPTION 'approved scopes require approved_at and approved_by';
        END IF;

        SELECT
            coalesce(sum(i.accepted_subtotal), 0),
            coalesce(sum(i.accepted_vat_amount), 0),
            coalesce(sum(i.accepted_grand_total), 0)
        INTO
            v_items_accepted_subtotal,
            v_items_accepted_vat_amount,
            v_items_accepted_grand_total
        FROM public.approved_billing_scope_items i
        WHERE i.approved_billing_scope_id = NEW.id;

        IF v_items_accepted_subtotal <> NEW.accepted_subtotal THEN
            RAISE EXCEPTION 'accepted_subtotal must match approved_billing_scope_items sum';
        END IF;

        IF v_items_accepted_vat_amount <> NEW.accepted_vat_amount THEN
            RAISE EXCEPTION 'accepted_vat_amount must match approved_billing_scope_items sum';
        END IF;

        IF v_items_accepted_grand_total <> NEW.accepted_grand_total THEN
            RAISE EXCEPTION 'accepted_grand_total must match approved_billing_scope_items sum';
        END IF;

        -- Guard: Ensure new scope total is >= active invoices for this service
        SELECT COALESCE(SUM(grand_total), 0) INTO v_total_active_invoiced
        FROM public.invoices
        WHERE service_id = NEW.service_id
          AND status NOT IN ('cancelled', 'voided')
          AND voided_at IS NULL
          AND COALESCE(is_deleted, false) = false;

        IF v_total_active_invoiced > NEW.accepted_grand_total THEN
            RAISE EXCEPTION 'cannot approve billing scope because active invoices total (%) exceeds the scope grand total (%)',
                v_total_active_invoiced, NEW.accepted_grand_total;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
