-- W7-P0A: Approved Commercial Amendment and Billing Authority Supersession
-- Foundation.  Forward-only; DEV apply is separately owner-authorized.
-- No W7-P0B UI, W7B, credit/refund, VAT/ZATCA, GL, or accounting behavior.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.quotations') IS NULL
        OR to_regclass('public.quotation_items') IS NULL
        OR to_regclass('public.approved_billing_scopes') IS NULL
        OR to_regclass('public.approved_billing_scope_items') IS NULL
        OR to_regclass('public.invoices') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regprocedure('public._abs_get_service_invoice_exposure(uuid)') IS NULL
        OR to_regprocedure('public._abs_get_service_payment_history_count(uuid)') IS NULL
        OR to_regprocedure('public._abs_service_has_historical_authority(uuid)') IS NULL
        OR to_regprocedure('public._abs_validate_scope_items(uuid)') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w7p0a_preflight_required_schema_or_abs_helper_missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.quotations'::regclass
          AND conname = 'quotations_id_service_id_key'
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'w7p0a_preflight_quotation_composite_key_missing';
    END IF;
END;
$$;

ALTER TABLE public.quotations
    ADD COLUMN superseded_at timestamptz NULL,
    ADD COLUMN superseded_by_quotation_id uuid NULL,
    ADD COLUMN amendment_approval_key text NULL,
    ADD COLUMN amendment_approval_payload jsonb NULL;

ALTER TABLE public.quotations
    ADD CONSTRAINT quotations_supersession_metadata_check
    CHECK (
        (superseded_at IS NULL AND superseded_by_quotation_id IS NULL)
        OR (
            status = 'approved'
            AND superseded_at IS NOT NULL
            AND superseded_by_quotation_id IS NOT NULL
            AND superseded_by_quotation_id <> id
        )
    ),
    ADD CONSTRAINT quotations_amendment_approval_metadata_check
    CHECK (
        (amendment_approval_key IS NULL AND amendment_approval_payload IS NULL)
        OR (
            amendment_approval_key IS NOT NULL
            AND btrim(amendment_approval_key) <> ''
            AND amendment_approval_payload IS NOT NULL
            AND status = 'approved'
        )
    ),
    ADD CONSTRAINT quotations_superseded_by_service_fkey
    FOREIGN KEY (superseded_by_quotation_id, service_id)
    REFERENCES public.quotations(id, service_id)
    ON DELETE RESTRICT;

COMMENT ON COLUMN public.quotations.superseded_at IS
    'W7-P0A derived current-authority metadata. Historical approved quotation rows remain approved and immutable.';
COMMENT ON COLUMN public.quotations.superseded_by_quotation_id IS
    'W7-P0A direct successor quotation that replaced this approved quotation as current service authority.';
COMMENT ON COLUMN public.quotations.amendment_approval_key IS
    'W7-P0A exact approval request identity; only the successor approval RPC writes it.';
COMMENT ON COLUMN public.quotations.amendment_approval_payload IS
    'W7-P0A canonical approval request payload used for exact replay/conflict detection.';

DROP INDEX IF EXISTS public.unique_approved_quotation_per_service;
CREATE UNIQUE INDEX unique_approved_quotation_per_service
    ON public.quotations(service_id)
    WHERE status = 'approved'
      AND COALESCE(is_deleted, false) = false
      AND superseded_at IS NULL;

CREATE UNIQUE INDEX quotations_amendment_approval_key_unique
    ON public.quotations(amendment_approval_key)
    WHERE amendment_approval_key IS NOT NULL;

CREATE INDEX idx_quotations_current_approved_service
    ON public.quotations(service_id, id)
    WHERE status = 'approved'
      AND COALESCE(is_deleted, false) = false
      AND superseded_at IS NULL;

CREATE OR REPLACE FUNCTION public.validate_quotation_revision_lineage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_predecessor public.quotations%ROWTYPE;
    v_w7p0a_source text;
BEGIN
    IF NEW.revision_of_quotation_id IS NULL THEN
        IF NEW.revision_number <> 1 THEN
            RAISE EXCEPTION USING MESSAGE = 'quotation_revision_root_number_invalid';
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.revision_of_quotation_id = NEW.id THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_revision_self_reference';
    END IF;

    IF NEW.status <> 'draft' THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_revision_status_invalid';
    END IF;

    SELECT q.*
    INTO v_predecessor
    FROM public.quotations q
    WHERE q.id = NEW.revision_of_quotation_id
      AND q.quotation_family_id = NEW.quotation_family_id
    FOR SHARE;

    v_w7p0a_source := current_setting('g7.w7p0a_revision_source_id', true);
    IF NOT FOUND
        OR (
            v_predecessor.status NOT IN ('sent', 'rejected', 'expired')
            AND NOT (
                v_predecessor.status = 'approved'
                AND v_w7p0a_source = v_predecessor.id::text
            )
        )
        OR NEW.revision_number <> v_predecessor.revision_number + 1
    THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_revision_predecessor_invalid';
    END IF;

    RETURN NEW;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.check_w7p0a_invoice_current_quotation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_scope public.approved_billing_scopes%ROWTYPE;
    v_quotation public.quotations%ROWTYPE;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RETURN NEW;
    END IF;

    SELECT s.* INTO v_scope
    FROM public.approved_billing_scopes s
    WHERE s.service_id = NEW.service_id
      AND s.status = 'approved'
      AND s.superseded_at IS NULL
      AND s.voided_at IS NULL;

    IF FOUND THEN
        IF NEW.approved_billing_scope_id IS DISTINCT FROM v_scope.id
            OR NEW.approved_quotation_id IS DISTINCT FROM v_scope.source_quotation_id
        THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_authority_quotation_mismatch';
        END IF;

        SELECT q.* INTO v_quotation
        FROM public.quotations q
        WHERE q.id = NEW.approved_quotation_id
          AND q.service_id = NEW.service_id
          AND q.status = 'approved'
          AND COALESCE(q.is_deleted, false) = false
          AND q.superseded_at IS NULL;
        IF NOT FOUND THEN
            RAISE EXCEPTION USING MESSAGE = 'invoice_authority_quotation_mismatch';
        END IF;
    ELSIF public._abs_service_has_historical_authority(NEW.service_id) THEN
        RAISE EXCEPTION USING MESSAGE = 'billing_scope_inactive';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_w7p0a_invoice_current_quotation_trg ON public.invoices;
CREATE TRIGGER check_w7p0a_invoice_current_quotation_trg
BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.check_w7p0a_invoice_current_quotation();

CREATE OR REPLACE FUNCTION public.create_approved_commercial_amendment(
    p_source_quotation_id uuid,
    p_amendment_reason text,
    p_mutation_key text,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    source_quotation_id uuid,
    successor_quotation_id uuid,
    quotation_number text,
    quotation_family_id uuid,
    revision_number integer,
    service_id uuid,
    created boolean,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_source public.quotations%ROWTYPE;
    v_existing public.quotations%ROWTYPE;
    v_scope public.approved_billing_scopes%ROWTYPE;
    v_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_family_revision integer;
    v_item_count bigint;
    v_scope_count bigint;
    v_scope_item_count bigint;
    v_expected_subtotal numeric;
    v_expected_vat numeric;
    v_expected_grand numeric;
    v_expected_discount numeric;
    v_reason text;
    v_key text;
    v_payload jsonb;
    v_new_id uuid;
    v_new_number text;
    v_now timestamptz;
    v_error_message text;
BEGIN
    error_code := NULL;
    source_quotation_id := p_source_quotation_id;
    successor_quotation_id := NULL;
    quotation_number := NULL;
    quotation_family_id := NULL;
    revision_number := NULL;
    service_id := NULL;
    created := false;
    idempotent_replay := false;

    v_reason := NULLIF(btrim(COALESCE(p_amendment_reason, '')), '');
    v_key := NULLIF(btrim(COALESCE(p_mutation_key, '')), '');
    IF p_source_quotation_id IS NULL OR v_reason IS NULL OR char_length(v_reason) > 500
        OR v_key IS NULL OR char_length(v_key) > 200
        OR p_actor_id IS NULL OR btrim(p_actor_id) = '' OR char_length(p_actor_id) > 200
        OR p_actor_role IS NULL OR btrim(p_actor_role) = '' OR char_length(p_actor_role) > 100
    THEN
        error_code := 'invalid_input'; RETURN NEXT; RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'operation', 'approved_commercial_amendment_creation',
        'source_quotation_id', p_source_quotation_id,
        'amendment_reason', v_reason,
        'actor_id', btrim(p_actor_id),
        'actor_role', btrim(p_actor_role)
    );

    SELECT q.* INTO v_existing
    FROM public.quotations q
    WHERE q.mutation_key = v_key
    FOR UPDATE;
    IF FOUND THEN
        IF v_existing.mutation_payload IS NOT DISTINCT FROM v_payload
            AND v_existing.revision_of_quotation_id = p_source_quotation_id
        THEN
            source_quotation_id := p_source_quotation_id;
            successor_quotation_id := v_existing.id;
            quotation_number := v_existing.quotation_number;
            quotation_family_id := v_existing.quotation_family_id;
            revision_number := v_existing.revision_number;
            service_id := v_existing.service_id;
            created := true;
            idempotent_replay := true;
            RETURN NEXT; RETURN;
        END IF;
        error_code := 'mutation_key_conflict'; RETURN NEXT; RETURN;
    END IF;

    SELECT q.service_id INTO v_service_id
    FROM public.quotations q WHERE q.id = p_source_quotation_id;
    IF NOT FOUND THEN
        error_code := 'quotation_not_found'; RETURN NEXT; RETURN;
    END IF;

    SELECT s.status, s.deleted_at INTO v_service_status, v_service_deleted_at
    FROM public.services s WHERE s.id = v_service_id FOR UPDATE;
    service_id := v_service_id;
    IF NOT FOUND OR v_service_deleted_at IS NOT NULL OR v_service_status IN ('Completed', 'Cancelled') THEN
        error_code := 'quotation_service_lifecycle_ineligible'; RETURN NEXT; RETURN;
    END IF;

    PERFORM q.id
    FROM public.quotations q
    WHERE q.quotation_family_id = (SELECT quotation_family_id FROM public.quotations WHERE id = p_source_quotation_id)
    ORDER BY q.id FOR UPDATE;

    SELECT q.* INTO v_source
    FROM public.quotations q
    WHERE q.id = p_source_quotation_id AND q.service_id = v_service_id
    FOR UPDATE;
    IF NOT FOUND OR COALESCE(v_source.is_deleted, false) OR v_source.status <> 'approved'
        OR v_source.superseded_at IS NOT NULL
    THEN
        error_code := 'quotation_not_current_approved'; RETURN NEXT; RETURN;
    END IF;

    quotation_family_id := v_source.quotation_family_id;
    revision_number := v_source.revision_number + 1;
    IF EXISTS (
        SELECT 1 FROM public.quotations q
        WHERE q.revision_of_quotation_id = v_source.id
    ) THEN
        error_code := 'quotation_amendment_successor_exists'; RETURN NEXT; RETURN;
    END IF;

    SELECT count(*)::bigint,
           COALESCE(sum(qi.total), 0),
           COALESCE(sum(qi.vat), 0),
           COALESCE(sum(qi.total - qi.discount_allocated + qi.vat), 0),
           COALESCE(sum(qi.discount_allocated), 0)
    INTO v_item_count, v_expected_subtotal, v_expected_vat,
         v_expected_grand, v_expected_discount
    FROM public.quotation_items qi WHERE qi.quotation_id = v_source.id;
    IF v_item_count = 0
        OR v_source.subtotal IS DISTINCT FROM v_expected_subtotal
        OR v_source.vat_amount IS DISTINCT FROM v_expected_vat
        OR v_source.grand_total IS DISTINCT FROM v_expected_grand
        OR COALESCE(v_source.discount, 0) IS DISTINCT FROM v_expected_discount
    THEN
        error_code := 'quotation_financial_total_mismatch'; RETURN NEXT; RETURN;
    END IF;

    SELECT count(*)::bigint INTO v_scope_count
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id AND s.status = 'approved'
      AND s.superseded_at IS NULL AND s.voided_at IS NULL;
    IF v_scope_count <> 1 THEN
        error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN;
    END IF;

    SELECT s.* INTO v_scope
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id AND s.status = 'approved'
      AND s.superseded_at IS NULL AND s.voided_at IS NULL
    FOR UPDATE;
    SELECT count(*)::bigint INTO v_scope_item_count
    FROM public.approved_billing_scope_items i WHERE i.approved_billing_scope_id = v_scope.id;
    IF v_scope.source_quotation_id IS DISTINCT FROM v_source.id
        OR v_scope_item_count <> v_item_count
        OR v_scope.accepted_subtotal IS DISTINCT FROM v_source.subtotal
        OR v_scope.accepted_vat_amount IS DISTINCT FROM v_source.vat_amount
        OR v_scope.accepted_grand_total IS DISTINCT FROM v_source.grand_total
        OR EXISTS (
            SELECT 1
            FROM public.quotation_items qi
            LEFT JOIN public.approved_billing_scope_items si
              ON si.approved_billing_scope_id = v_scope.id
             AND si.source_quotation_item_id = qi.id
            WHERE qi.quotation_id = v_source.id
              AND (
                  si.id IS NULL OR si.source_quotation_id IS DISTINCT FROM v_source.id
                  OR si.source_discount_allocated IS DISTINCT FROM qi.discount_allocated
                  OR si.source_subtotal IS DISTINCT FROM qi.total
                  OR si.source_vat_amount IS DISTINCT FROM qi.vat
                  OR si.source_grand_total IS DISTINCT FROM round(qi.total - qi.discount_allocated + qi.vat, 2)
                  OR si.accepted_grand_total IS DISTINCT FROM round(qi.total - qi.discount_allocated + qi.vat, 2)
              )
        )
    THEN
        error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN;
    END IF;

    v_new_id := gen_random_uuid();
    v_new_number := public.generate_document_number('quotation');
    v_now := transaction_timestamp();
    PERFORM set_config('g7.w7p0a_revision_source_id', v_source.id::text, true);
    INSERT INTO public.quotations (
        id, quotation_number, service_id, customer_id, event, date, valid_until,
        subtotal, discount, vat_rate, vat_amount, grand_total, status,
        mutation_key, mutation_payload, created_by, updated_by, snapshot_seller,
        snapshot_buyer, quotation_family_id, revision_of_quotation_id,
        revision_number, revision_reason
    ) VALUES (
        v_new_id, v_new_number, v_source.service_id, v_source.customer_id,
        v_source.event, v_source.date, v_source.valid_until, v_source.subtotal,
        v_source.discount, v_source.vat_rate, v_source.vat_amount, v_source.grand_total,
        'draft', v_key, v_payload, p_actor_id, p_actor_id,
        v_source.snapshot_seller, v_source.snapshot_buyer, v_source.quotation_family_id,
        v_source.id, v_source.revision_number + 1, v_reason
    );

    PERFORM set_config('g7.w2c_allocator_skip', v_new_id::text, true);
    WITH item_map AS MATERIALIZED (
        SELECT qi.id AS source_item_id, gen_random_uuid() AS successor_item_id
        FROM public.quotation_items qi WHERE qi.quotation_id = v_source.id
    )
    INSERT INTO public.quotation_items (
        id, quotation_id, description, details, category, qty, unit_price, vat, total,
        discount_allocated, commercial_role, parent_authority_line_id,
        is_selected, unit, description_ar
    )
    SELECT m.successor_item_id, v_new_id, qi.description, qi.details, qi.category,
        qi.qty, qi.unit_price, qi.vat, qi.total, qi.discount_allocated,
        qi.commercial_role, pm.successor_item_id, qi.is_selected, qi.unit, qi.description_ar
    FROM item_map m
    JOIN public.quotation_items qi ON qi.id = m.source_item_id
    LEFT JOIN item_map pm ON pm.source_item_id = qi.parent_authority_line_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('create', 'quotation', v_new_id, p_actor_id,
        jsonb_build_object('event_type', 'approved_commercial_amendment_created',
            'actor_id', p_actor_id, 'actor_role', p_actor_role,
            'source_quotation_id', v_source.id, 'successor_quotation_id', v_new_id,
            'quotation_family_id', v_source.quotation_family_id,
            'revision_number', v_source.revision_number + 1,
            'amendment_reason', v_reason, 'mutation_key', v_key), v_now);

    successor_quotation_id := v_new_id;
    quotation_number := v_new_number;
    created := true;
    RETURN NEXT;
EXCEPTION
    WHEN unique_violation THEN
        error_code := 'mutation_key_conflict'; created := false; RETURN NEXT;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE v_error_message
            WHEN 'quotation_revision_predecessor_invalid' THEN 'quotation_revision_predecessor_invalid'
            WHEN 'quotation_revision_status_invalid' THEN 'quotation_revision_status_invalid'
            WHEN 'w2c_discount_invalid_hierarchy' THEN 'quotation_financial_total_mismatch'
            ELSE 'quotation_amendment_creation_failed'
        END;
        created := false; RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_approved_commercial_amendment(
    p_source_quotation_id uuid,
    p_successor_quotation_id uuid,
    p_mutation_key text,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    source_quotation_id uuid,
    successor_quotation_id uuid,
    source_scope_id uuid,
    successor_scope_id uuid,
    service_id uuid,
    source_scope_version integer,
    successor_scope_version integer,
    previous_ceiling numeric,
    successor_ceiling numeric,
    lifetime_invoice_total numeric,
    approved_at timestamptz,
    quotation_status text,
    abs_status text,
    quotation_approved boolean,
    abs_activated boolean,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_source public.quotations%ROWTYPE;
    v_successor public.quotations%ROWTYPE;
    v_existing public.quotations%ROWTYPE;
    v_source_scope public.approved_billing_scopes%ROWTYPE;
    v_successor_scope public.approved_billing_scopes%ROWTYPE;
    v_service_id uuid;
    v_service_status text;
    v_service_deleted_at timestamptz;
    v_scope_count bigint;
    v_item_count bigint;
    v_successor_item_count bigint;
    v_expected_subtotal numeric;
    v_expected_vat numeric;
    v_expected_grand numeric;
    v_expected_discount numeric;
    v_invoice_count bigint;
    v_lifetime_invoice_total numeric;
    v_scope_version integer;
    v_payload jsonb;
    v_key text;
    v_now timestamptz;
    v_noop_header boolean;
    v_noop_items boolean;
    v_error_message text;
BEGIN
    error_code := NULL;
    source_quotation_id := p_source_quotation_id;
    successor_quotation_id := p_successor_quotation_id;
    source_scope_id := NULL;
    successor_scope_id := NULL;
    service_id := NULL;
    source_scope_version := NULL;
    successor_scope_version := NULL;
    previous_ceiling := NULL;
    successor_ceiling := NULL;
    lifetime_invoice_total := NULL;
    approved_at := NULL;
    quotation_status := NULL;
    abs_status := NULL;
    quotation_approved := false;
    abs_activated := false;
    idempotent_replay := false;

    v_key := NULLIF(btrim(COALESCE(p_mutation_key, '')), '');
    IF p_source_quotation_id IS NULL OR p_successor_quotation_id IS NULL
        OR p_source_quotation_id = p_successor_quotation_id
        OR v_key IS NULL OR char_length(v_key) > 200
        OR p_actor_id IS NULL OR btrim(p_actor_id) = '' OR char_length(p_actor_id) > 200
        OR p_actor_role IS NULL OR btrim(p_actor_role) = '' OR char_length(p_actor_role) > 100
    THEN
        error_code := 'invalid_input'; RETURN NEXT; RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'operation', 'approved_commercial_amendment_approval',
        'source_quotation_id', p_source_quotation_id,
        'successor_quotation_id', p_successor_quotation_id,
        'actor_id', btrim(p_actor_id), 'actor_role', btrim(p_actor_role)
    );

    SELECT q.* INTO v_existing
    FROM public.quotations q WHERE q.amendment_approval_key = v_key FOR UPDATE;
    IF FOUND THEN
        IF v_existing.amendment_approval_payload IS DISTINCT FROM v_payload THEN
            error_code := 'mutation_key_conflict'; RETURN NEXT; RETURN;
        END IF;
        v_service_id := v_existing.service_id;
        service_id := v_service_id;
        SELECT q.* INTO v_successor FROM public.quotations q WHERE q.id = p_successor_quotation_id;
        SELECT q.* INTO v_source FROM public.quotations q WHERE q.id = p_source_quotation_id;
        IF v_existing.id = p_successor_quotation_id
            AND v_successor.status = 'approved'
            AND v_source.superseded_by_quotation_id = v_successor.id
        THEN
            SELECT s.* INTO v_successor_scope
            FROM public.approved_billing_scopes s
            WHERE s.service_id = v_service_id AND s.source_quotation_id = v_successor.id
              AND s.status = 'approved' AND s.superseded_at IS NULL AND s.voided_at IS NULL;
            IF FOUND THEN
                SELECT s.* INTO v_source_scope FROM public.approved_billing_scopes s WHERE s.id = v_successor_scope.supersedes_scope_id;
                source_scope_id := v_source_scope.id; successor_scope_id := v_successor_scope.id;
                source_scope_version := v_source_scope.scope_version; successor_scope_version := v_successor_scope.scope_version;
                previous_ceiling := v_source_scope.accepted_grand_total; successor_ceiling := v_successor_scope.accepted_grand_total;
                SELECT * INTO v_invoice_count, v_lifetime_invoice_total FROM public._abs_get_service_invoice_exposure(v_service_id);
                lifetime_invoice_total := v_lifetime_invoice_total; approved_at := v_successor_scope.approved_at;
                quotation_status := v_successor.status; abs_status := v_successor_scope.status;
                quotation_approved := true; abs_activated := true; idempotent_replay := true;
                RETURN NEXT; RETURN;
            END IF;
        END IF;
        error_code := 'quotation_amendment_approval_incomplete'; RETURN NEXT; RETURN;
    END IF;

    SELECT q.service_id INTO v_service_id FROM public.quotations q WHERE q.id = p_source_quotation_id;
    IF NOT FOUND THEN error_code := 'quotation_not_found'; RETURN NEXT; RETURN; END IF;
    SELECT s.status, s.deleted_at INTO v_service_status, v_service_deleted_at
    FROM public.services s WHERE s.id = v_service_id FOR UPDATE;
    service_id := v_service_id;
    IF NOT FOUND OR v_service_deleted_at IS NOT NULL OR v_service_status IN ('Completed', 'Cancelled') THEN
        error_code := 'quotation_service_lifecycle_ineligible'; RETURN NEXT; RETURN;
    END IF;

    PERFORM q.id FROM public.quotations q
    WHERE q.id IN (p_source_quotation_id, p_successor_quotation_id)
    ORDER BY q.id FOR UPDATE;
    SELECT q.* INTO v_source FROM public.quotations q WHERE q.id = p_source_quotation_id AND q.service_id = v_service_id;
    SELECT q.* INTO v_successor FROM public.quotations q WHERE q.id = p_successor_quotation_id AND q.service_id = v_service_id;
    IF NOT FOUND OR v_source.id IS NULL OR v_successor.id IS NULL THEN
        error_code := 'quotation_amendment_approval_conflict'; RETURN NEXT; RETURN;
    END IF;

    PERFORM q.id FROM public.quotations q
    WHERE q.quotation_family_id = v_source.quotation_family_id
    ORDER BY q.id FOR UPDATE;
    PERFORM s.id FROM public.approved_billing_scopes s WHERE s.service_id = v_service_id ORDER BY s.id FOR UPDATE;

    IF COALESCE(v_source.is_deleted, false) OR v_source.status <> 'approved' OR v_source.superseded_at IS NOT NULL
        OR v_successor.is_deleted OR v_successor.revision_of_quotation_id IS DISTINCT FROM v_source.id
        OR v_successor.quotation_family_id IS DISTINCT FROM v_source.quotation_family_id
        OR v_successor.status NOT IN ('draft', 'sent')
    THEN
        error_code := 'quotation_amendment_approval_conflict'; RETURN NEXT; RETURN;
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.quotations q
        WHERE q.revision_of_quotation_id = v_source.id AND q.id <> v_successor.id
    ) THEN
        error_code := 'quotation_amendment_successor_conflict'; RETURN NEXT; RETURN;
    END IF;

    SELECT count(*)::bigint,
           COALESCE(sum(qi.total), 0), COALESCE(sum(qi.vat), 0),
           COALESCE(sum(qi.total - qi.discount_allocated + qi.vat), 0),
           COALESCE(sum(qi.discount_allocated), 0)
    INTO v_successor_item_count, v_expected_subtotal, v_expected_vat,
         v_expected_grand, v_expected_discount
    FROM public.quotation_items qi WHERE qi.quotation_id = v_successor.id;
    IF v_successor_item_count = 0
        OR v_successor.subtotal IS DISTINCT FROM v_expected_subtotal
        OR v_successor.vat_amount IS DISTINCT FROM v_expected_vat
        OR v_successor.grand_total IS DISTINCT FROM v_expected_grand
        OR COALESCE(v_successor.discount, 0) IS DISTINCT FROM v_expected_discount
    THEN
        error_code := 'quotation_financial_total_mismatch'; RETURN NEXT; RETURN;
    END IF;
    IF COALESCE(v_successor.discount, 0) > 0
        AND upper(COALESCE(NULLIF(btrim(v_successor.snapshot_seller ->> 'currency'), ''), 'SAR')) <> 'SAR'
    THEN
        error_code := 'w2c_discount_currency_unsupported'; RETURN NEXT; RETURN;
    END IF;

    v_noop_header := v_source.event IS NOT DISTINCT FROM v_successor.event
        AND v_source.date IS NOT DISTINCT FROM v_successor.date
        AND v_source.valid_until IS NOT DISTINCT FROM v_successor.valid_until
        AND v_source.subtotal IS NOT DISTINCT FROM v_successor.subtotal
        AND v_source.discount IS NOT DISTINCT FROM v_successor.discount
        AND v_source.vat_rate IS NOT DISTINCT FROM v_successor.vat_rate
        AND v_source.vat_amount IS NOT DISTINCT FROM v_successor.vat_amount
        AND v_source.grand_total IS NOT DISTINCT FROM v_successor.grand_total
        AND v_source.snapshot_seller IS NOT DISTINCT FROM v_successor.snapshot_seller
        AND v_source.snapshot_buyer IS NOT DISTINCT FROM v_successor.snapshot_buyer;
    WITH src AS MATERIALIZED (
        SELECT qi.*, row_number() OVER (ORDER BY qi.created_at, qi.id) AS rn
        FROM public.quotation_items qi WHERE qi.quotation_id = v_source.id
    ), suc AS MATERIALIZED (
        SELECT qi.*, row_number() OVER (ORDER BY qi.created_at, qi.id) AS rn
        FROM public.quotation_items qi WHERE qi.quotation_id = v_successor.id
    )
    SELECT (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'rn', s.rn, 'description', s.description, 'details', s.details,
            'category', s.category, 'qty', s.qty, 'unit_price', s.unit_price,
            'vat', s.vat, 'total', s.total, 'discount_allocated', s.discount_allocated,
            'commercial_role', s.commercial_role, 'parent_rn',
                (SELECT p.rn FROM src p WHERE p.id = s.parent_authority_line_id),
            'is_selected', s.is_selected, 'unit', s.unit, 'description_ar', s.description_ar
            ) ORDER BY s.rn), '[]'::jsonb) FROM src s
    ) IS NOT DISTINCT FROM (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'rn', s.rn, 'description', s.description, 'details', s.details,
            'category', s.category, 'qty', s.qty, 'unit_price', s.unit_price,
            'vat', s.vat, 'total', s.total, 'discount_allocated', s.discount_allocated,
            'commercial_role', s.commercial_role, 'parent_rn',
                (SELECT p.rn FROM suc p WHERE p.id = s.parent_authority_line_id),
            'is_selected', s.is_selected, 'unit', s.unit, 'description_ar', s.description_ar
            ) ORDER BY s.rn), '[]'::jsonb) FROM suc s
    )
    INTO v_noop_items;
    IF v_noop_header AND v_noop_items THEN
        error_code := 'quotation_amendment_noop'; RETURN NEXT; RETURN;
    END IF;

    SELECT count(*)::bigint INTO v_scope_count
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id AND s.status = 'approved'
      AND s.superseded_at IS NULL AND s.voided_at IS NULL;
    IF v_scope_count <> 1 THEN error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN; END IF;
    SELECT s.* INTO v_source_scope
    FROM public.approved_billing_scopes s
    WHERE s.service_id = v_service_id AND s.status = 'approved'
      AND s.superseded_at IS NULL AND s.voided_at IS NULL;
    IF v_source_scope.source_quotation_id IS DISTINCT FROM v_source.id THEN
        error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN;
    END IF;
    source_scope_id := v_source_scope.id;
    source_scope_version := v_source_scope.scope_version;
    previous_ceiling := v_source_scope.accepted_grand_total;
    SELECT count(*)::bigint INTO v_item_count
    FROM public.quotation_items qi WHERE qi.quotation_id = v_source.id;
    IF v_source_scope.accepted_grand_total IS NULL THEN
        error_code := 'quotation_internal_authority_inconsistent'; RETURN NEXT; RETURN;
    END IF;

    SELECT * INTO v_invoice_count, v_lifetime_invoice_total
    FROM public._abs_get_service_invoice_exposure(v_service_id);
    lifetime_invoice_total := v_lifetime_invoice_total;
    IF v_lifetime_invoice_total > v_successor.grand_total THEN
        error_code := 'scope_successor_ceiling_below_invoiced'; RETURN NEXT; RETURN;
    END IF;

    v_scope_version := (SELECT COALESCE(max(s.scope_version), 0) + 1 FROM public.approved_billing_scopes s WHERE s.service_id = v_service_id);
    v_now := transaction_timestamp();
    INSERT INTO public.approved_billing_scopes (
        service_id, source_quotation_id, scope_version, status,
        accepted_subtotal, accepted_vat_amount, accepted_grand_total,
        source_vat_rate, source_discount, source_currency,
        source_quotation_subtotal, source_quotation_vat_amount, source_quotation_grand_total,
        source_pricing_context, line_safety_status, change_summary_reason,
        supersedes_scope_id, created_by, updated_by, created_at, updated_at
    ) VALUES (
        v_service_id, v_successor.id, v_scope_version, 'draft',
        v_successor.subtotal, v_successor.vat_amount, v_successor.grand_total,
        v_successor.vat_rate, COALESCE(v_successor.discount, 0),
        COALESCE(NULLIF(btrim(v_successor.snapshot_seller ->> 'currency'), ''), 'SAR'),
        v_successor.subtotal, v_successor.vat_amount, v_successor.grand_total,
        jsonb_build_object('quotationNumber', v_successor.quotation_number,
            'event', v_successor.event, 'quotationDate', v_successor.date,
            'validUntil', v_successor.valid_until),
        'pending_review', v_successor.revision_reason, v_source_scope.id,
        p_actor_id, p_actor_id, v_now, v_now
    ) RETURNING id INTO successor_scope_id;

    INSERT INTO public.approved_billing_scope_items (
        approved_billing_scope_id, source_quotation_id, source_quotation_item_id,
        display_order, decision, source_description, source_details, source_category,
        source_qty, source_unit_price, source_subtotal, source_vat_amount,
        source_grand_total, source_discount_allocated,
        accepted_qty, accepted_unit_price, accepted_subtotal, accepted_vat_amount,
        accepted_grand_total, reason_code, reason_note, created_at, updated_at
    )
    SELECT successor_scope_id, qi.quotation_id, qi.id,
        row_number() OVER (ORDER BY qi.created_at, qi.id) - 1,
        'accepted', qi.description, qi.details, qi.category, qi.qty, qi.unit_price,
        qi.total, qi.vat, round(qi.total - qi.discount_allocated + qi.vat, 2),
        qi.discount_allocated, qi.qty, qi.unit_price, qi.total, qi.vat,
        round(qi.total - qi.discount_allocated + qi.vat, 2), NULL, NULL, v_now, v_now
    FROM public.quotation_items qi WHERE qi.quotation_id = v_successor.id;

    UPDATE public.approved_billing_scopes s
    SET superseded_at = v_now, superseded_by_scope_id = successor_scope_id,
        updated_by = p_actor_id, updated_at = v_now
    WHERE s.id = v_source_scope.id AND s.status = 'approved'
      AND s.superseded_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid'; END IF;

    PERFORM set_config('g7.w7p0a_allow_quotation_supersession', v_source.id::text, true);
    UPDATE public.quotations q
    SET superseded_at = v_now, superseded_by_quotation_id = v_successor.id,
        updated_by = p_actor_id, updated_at = v_now
    WHERE q.id = v_source.id AND q.status = 'approved'
      AND q.superseded_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'approved_quotation_immutable'; END IF;

    UPDATE public.quotations q
    SET status = 'approved', amendment_approval_key = v_key,
        amendment_approval_payload = v_payload,
        updated_by = p_actor_id, updated_at = v_now
    WHERE q.id = v_successor.id AND q.status IN ('draft', 'sent')
      AND q.revision_of_quotation_id = v_source.id;
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'quotation_amendment_approval_conflict'; END IF;

    UPDATE public.approved_billing_scopes s
    SET status = 'approved', line_safety_status = 'safe',
        line_safety_reviewed_by = p_actor_id, line_safety_reviewed_at = v_now,
        approved_at = v_now, approved_by = p_actor_id,
        updated_by = p_actor_id, updated_at = v_now
    WHERE s.id = successor_scope_id AND s.status = 'draft';
    IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE = 'scope_successor_invalid'; END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('status_change', 'quotation', v_successor.id, p_actor_id,
        jsonb_build_object('event_type', 'approved_commercial_amendment_approved',
            'actor_id', p_actor_id, 'actor_role', p_actor_role,
            'source_quotation_id', v_source.id, 'successor_quotation_id', v_successor.id,
            'source_scope_id', v_source_scope.id, 'successor_scope_id', successor_scope_id,
            'mutation_key', v_key, 'reason', v_successor.revision_reason,
            'lifetime_invoice_total', v_lifetime_invoice_total,
            'previous_ceiling', v_source_scope.accepted_grand_total,
            'successor_ceiling', v_successor.grand_total,
            'approval_basis', 'customer_approval_confirmed_by_staff'), v_now);
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('status_change', 'approved_billing_scope', successor_scope_id, p_actor_id,
        jsonb_build_object('event_type', 'approved_billing_scope_superseded',
            'actor_id', p_actor_id, 'actor_role', p_actor_role,
            'source_scope_id', v_source_scope.id, 'successor_scope_id', successor_scope_id,
            'source_quotation_id', v_source.id, 'successor_quotation_id', v_successor.id,
            'mutation_key', v_key, 'lifetime_invoice_total', v_lifetime_invoice_total,
            'previous_ceiling', v_source_scope.accepted_grand_total,
            'successor_ceiling', v_successor.grand_total), v_now);

    source_scope_id := v_source_scope.id;
    source_scope_version := v_source_scope.scope_version;
    successor_scope_version := v_scope_version;
    previous_ceiling := v_source_scope.accepted_grand_total;
    successor_ceiling := v_successor.grand_total;
    approved_at := v_now; quotation_status := 'approved'; abs_status := 'approved';
    quotation_approved := true; abs_activated := true; idempotent_replay := false;
    RETURN NEXT;
EXCEPTION
    WHEN unique_violation THEN
        error_code := 'mutation_key_conflict'; quotation_approved := false; abs_activated := false; RETURN NEXT;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE v_error_message
            WHEN 'scope_successor_ceiling_below_invoiced' THEN 'scope_successor_ceiling_below_invoiced'
            WHEN 'quotation_amendment_noop' THEN 'quotation_amendment_noop'
            WHEN 'scope_successor_invalid' THEN 'quotation_amendment_approval_conflict'
            WHEN 'approved_quotation_immutable' THEN 'quotation_amendment_approval_conflict'
            WHEN 'w2c_discount_currency_unsupported' THEN 'w2c_discount_currency_unsupported'
            ELSE 'quotation_amendment_approval_failed'
        END;
        quotation_approved := false; abs_activated := false; RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_approved_commercial_amendment(uuid, text, text, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_approved_commercial_amendment(uuid, text, text, text, text)
    TO service_role;
REVOKE ALL ON FUNCTION public.approve_approved_commercial_amendment(uuid, uuid, text, text, text)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_approved_commercial_amendment(uuid, uuid, text, text, text)
    TO service_role;
REVOKE ALL ON FUNCTION public.validate_quotation_revision_lineage() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_approved_quotation_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_approved_billing_scopes_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_w7p0a_invoice_current_quotation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_quotation_revision_lineage() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_approved_quotation_mutation() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_approved_billing_scopes_before_write() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_w7p0a_invoice_current_quotation() TO service_role;

COMMENT ON FUNCTION public.create_approved_commercial_amendment(uuid, text, text, text, text) IS
    'W7-P0A service-role-only full-snapshot successor Draft creation from the current approved quotation.';
COMMENT ON FUNCTION public.approve_approved_commercial_amendment(uuid, uuid, text, text, text) IS
    'W7-P0A service-role-only atomic quotation and ABS authority supersession with service-lifetime exposure guard.';

COMMIT;
