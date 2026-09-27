-- Migration: 20260831110000_w2a_commercial_authority_lines.sql
-- W2A: Minimum durable commercial-authority hierarchy on quotation items.
-- Scope: existing quotation rows remain the authority-line source; included
-- components and optional add-ons are bounded child rows. No revisions,
-- catalog, Tender, supplier pricing, or generic workflow engine is added.
-- This migration is reviewed but must not be applied without an explicit
-- Owner-authorized DEV apply gate.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.quotations') IS NULL
        OR to_regclass('public.quotation_items') IS NULL
        OR to_regclass('public.approved_billing_scope_items') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
    THEN
        RAISE EXCEPTION 'w2a_commercial_authority_lines preflight: required table missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.quotation_items'::regclass
          AND conname = 'quotation_items_id_quotation_id_key'
    ) THEN
        RAISE EXCEPTION 'w2a_commercial_authority_lines preflight: quotation item composite key missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_attribute
        WHERE attrelid = 'public.quotation_items'::regclass
          AND attname IN (
              'commercial_role', 'parent_authority_line_id', 'is_selected',
              'unit', 'description_ar'
          )
          AND attnum > 0
          AND NOT attisdropped
    ) THEN
        RAISE EXCEPTION 'w2a_commercial_authority_lines preflight: quotation authority columns already exist';
    END IF;

    IF to_regprocedure('public.set_quotation_commercial_structure(uuid,jsonb,text)') IS NOT NULL THEN
        RAISE EXCEPTION 'w2a_commercial_authority_lines preflight: target RPC already exists';
    END IF;
END;
$$;

-- Existing flat quotation rows become root Authority Lines by default. The
-- new fields are metadata on the existing financial source, not a parallel
-- commercial ledger.
ALTER TABLE public.quotation_items
    ADD COLUMN commercial_role text NOT NULL DEFAULT 'authority_line',
    ADD COLUMN parent_authority_line_id uuid NULL,
    ADD COLUMN is_selected boolean NOT NULL DEFAULT true,
    ADD COLUMN unit text NOT NULL DEFAULT 'unit',
    ADD COLUMN description_ar text NULL;

ALTER TABLE public.quotation_items
    ADD CONSTRAINT quotation_items_commercial_role_check
        CHECK (commercial_role IN ('authority_line', 'included_component', 'optional_add_on')),
    ADD CONSTRAINT quotation_items_commercial_parent_check
        CHECK (
            (commercial_role = 'authority_line' AND parent_authority_line_id IS NULL AND is_selected)
            OR (commercial_role IN ('included_component', 'optional_add_on') AND parent_authority_line_id IS NOT NULL)
        ),
    ADD CONSTRAINT quotation_items_included_component_price_check
        CHECK (
            commercial_role <> 'included_component'
            OR (is_selected AND unit_price = 0 AND total = 0 AND vat = 0)
        ),
    ADD CONSTRAINT quotation_items_optional_unselected_total_check
        CHECK (
            commercial_role <> 'optional_add_on'
            OR is_selected
            OR (total = 0 AND vat = 0)
        ),
    ADD CONSTRAINT quotation_items_parent_not_self_check
        CHECK (parent_authority_line_id IS NULL OR parent_authority_line_id <> id),
    ADD CONSTRAINT quotation_items_unit_nonblank_check
        CHECK (btrim(unit) <> '');

ALTER TABLE public.quotation_items
    ADD CONSTRAINT quotation_items_parent_authority_line_fkey
        FOREIGN KEY (parent_authority_line_id, quotation_id)
        REFERENCES public.quotation_items(id, quotation_id)
        ON DELETE CASCADE
        DEFERRABLE INITIALLY DEFERRED;

COMMENT ON COLUMN public.quotation_items.commercial_role IS
    'W2A commercial role. Existing rows default to customer-priced authority_line; child roles are included_component or optional_add_on.';
COMMENT ON COLUMN public.quotation_items.parent_authority_line_id IS
    'Optional parent Authority Line within the same quotation. Only root authority_line rows may be parents in W2A.';
COMMENT ON COLUMN public.quotation_items.is_selected IS
    'Optional Add-ons contribute only when selected. Authority Lines and Included Components are always selected.';
COMMENT ON COLUMN public.quotation_items.unit IS
    'Generic commercial unit label. SAR remains the G7 functional/default currency where applicable.';
COMMENT ON COLUMN public.quotation_items.description_ar IS
    'Arabic customer-facing representation of the same commercial authority; null falls back to the English description.';

-- The source metadata is copied into the existing immutable ABS snapshot. ABS
-- remains the billing-control layer; these fields do not create a second
-- financial authority.
ALTER TABLE public.approved_billing_scope_items
    ADD COLUMN source_commercial_role text NOT NULL DEFAULT 'authority_line',
    ADD COLUMN source_parent_authority_line_id uuid NULL,
    ADD COLUMN source_is_selected boolean NOT NULL DEFAULT true,
    ADD COLUMN source_unit text NOT NULL DEFAULT 'unit',
    ADD COLUMN source_description_ar text NULL;

ALTER TABLE public.approved_billing_scope_items
    ADD CONSTRAINT approved_billing_scope_items_source_commercial_role_check
        CHECK (source_commercial_role IN ('authority_line', 'included_component', 'optional_add_on')),
    ADD CONSTRAINT approved_billing_scope_items_source_parent_not_self_check
        CHECK (source_parent_authority_line_id IS NULL OR source_parent_authority_line_id <> source_quotation_item_id),
    ADD CONSTRAINT approved_billing_scope_items_source_unit_nonblank_check
        CHECK (btrim(source_unit) <> '');

COMMENT ON COLUMN public.approved_billing_scope_items.source_commercial_role IS
    'Immutable W2A source role copied from quotation_items at ABS snapshot creation.';
COMMENT ON COLUMN public.approved_billing_scope_items.source_parent_authority_line_id IS
    'Immutable W2A parent Authority Line source item id copied from quotation_items.';
COMMENT ON COLUMN public.approved_billing_scope_items.source_is_selected IS
    'Immutable W2A selection state copied from quotation_items at ABS snapshot creation.';
COMMENT ON COLUMN public.approved_billing_scope_items.source_description_ar IS
    'Immutable Arabic presentation snapshot for the same quotation authority.';

CREATE OR REPLACE FUNCTION public.validate_quotation_item_commercial_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_parent_role text;
    v_parent_parent uuid;
BEGIN
    IF NEW.commercial_role NOT IN ('authority_line', 'included_component', 'optional_add_on') THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_commercial_role_invalid';
    END IF;

    IF btrim(COALESCE(NEW.unit, '')) = '' THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_commercial_unit_invalid';
    END IF;

    IF NEW.commercial_role = 'authority_line' THEN
        IF NEW.parent_authority_line_id IS NOT NULL OR NOT NEW.is_selected THEN
            RAISE EXCEPTION USING MESSAGE = 'quotation_authority_line_parent_or_selection_invalid';
        END IF;
    ELSIF TG_OP = 'UPDATE'
        AND OLD.commercial_role = 'authority_line'
        AND EXISTS (
            SELECT 1
            FROM public.quotation_items child
            WHERE child.parent_authority_line_id = OLD.id
              AND child.quotation_id = OLD.quotation_id
        )
    THEN
        -- Direct service-role updates must not leave children attached to a
        -- demoted root. The atomic structure RPC moves those children first.
        RAISE EXCEPTION USING MESSAGE = 'quotation_authority_line_has_children';
    ELSIF NEW.parent_authority_line_id IS NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_component_parent_required';
    END IF;

    IF NEW.commercial_role = 'included_component'
        AND (NOT NEW.is_selected OR NEW.unit_price <> 0 OR NEW.total <> 0 OR NEW.vat <> 0)
    THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_included_component_must_be_non_priced';
    END IF;

    IF NEW.commercial_role = 'optional_add_on'
        AND NOT NEW.is_selected
        AND (NEW.total <> 0 OR NEW.vat <> 0)
    THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_unselected_optional_total_must_be_zero';
    END IF;

    IF NEW.parent_authority_line_id IS NOT NULL THEN
        SELECT qi.commercial_role, qi.parent_authority_line_id
        INTO v_parent_role, v_parent_parent
        FROM public.quotation_items qi
        WHERE qi.id = NEW.parent_authority_line_id
          AND qi.quotation_id = NEW.quotation_id;

        -- The deferred composite FK allows a parent to be inserted later in
        -- the same transaction; once present, it must be a root Authority Line.
        IF FOUND AND (v_parent_role <> 'authority_line' OR v_parent_parent IS NOT NULL) THEN
            RAISE EXCEPTION USING MESSAGE = 'quotation_component_parent_must_be_authority_line';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_quotation_item_commercial_authority_trg
    ON public.quotation_items;
CREATE TRIGGER validate_quotation_item_commercial_authority_trg
BEFORE INSERT OR UPDATE ON public.quotation_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_quotation_item_commercial_authority();

CREATE OR REPLACE FUNCTION public.sync_abs_item_commercial_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_item public.quotation_items%ROWTYPE;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.source_commercial_role IS DISTINCT FROM NEW.source_commercial_role
            OR OLD.source_parent_authority_line_id IS DISTINCT FROM NEW.source_parent_authority_line_id
            OR OLD.source_is_selected IS DISTINCT FROM NEW.source_is_selected
            OR OLD.source_unit IS DISTINCT FROM NEW.source_unit
            OR OLD.source_description_ar IS DISTINCT FROM NEW.source_description_ar
        THEN
            RAISE EXCEPTION USING MESSAGE = 'approved_billing_scope_item_commercial_metadata_immutable';
        END IF;
        RETURN NEW;
    END IF;

    SELECT qi.*
    INTO v_item
    FROM public.quotation_items qi
    WHERE qi.id = NEW.source_quotation_item_id
      AND qi.quotation_id = NEW.source_quotation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING MESSAGE = 'approved_billing_scope_item_source_missing';
    END IF;

    NEW.source_commercial_role := v_item.commercial_role;
    NEW.source_parent_authority_line_id := v_item.parent_authority_line_id;
    NEW.source_is_selected := v_item.is_selected;
    NEW.source_unit := v_item.unit;
    NEW.source_description_ar := v_item.description_ar;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_abs_item_commercial_metadata_trg
    ON public.approved_billing_scope_items;
CREATE TRIGGER sync_abs_item_commercial_metadata_trg
BEFORE INSERT OR UPDATE ON public.approved_billing_scope_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_abs_item_commercial_metadata();

-- Atomic draft-only structure mutation. The current quotation RPCs remain the
-- financial source of truth for ordinary flat rows; this bounded RPC is the
-- only W2A path that changes hierarchy metadata and recalculates totals. An
-- unselected optional may retain its candidate unit price, but its stored
-- contribution total and VAT are always zero until selected.
CREATE FUNCTION public.set_quotation_commercial_structure(
    p_quotation_id uuid,
    p_lines jsonb,
    p_user_id text
)
RETURNS TABLE(
    error_code text,
    quotation_id uuid,
    line_count integer,
    subtotal numeric,
    discount numeric,
    vat_amount numeric,
    grand_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_quotation public.quotations%ROWTYPE;
    v_item jsonb;
    v_item_id uuid;
    v_parent_id uuid;
    v_role text;
    v_selected boolean;
    v_unit text;
    v_description_ar text;
    v_parent_entry jsonb;
    v_parent_role text;
    v_parent_parent_id uuid;
    v_item_count integer;
    v_input_count integer;
    v_distinct_count integer;
    v_authority_count integer := 0;
    v_included_count integer := 0;
    v_selected_optional_count integer := 0;
    v_subtotal numeric(12,2) := 0;
    v_taxable numeric(12,2) := 0;
    v_discount numeric(12,2) := 0;
    v_vat_rate numeric(5,2) := 0;
    v_vat_amount numeric(12,2) := 0;
    v_grand_total numeric(12,2) := 0;
    v_residual numeric(12,2) := 0;
    v_max_item_id uuid;
    v_now timestamptz := transaction_timestamp();
    v_error_message text;
BEGIN
    IF p_quotation_id IS NULL OR p_user_id IS NULL OR btrim(p_user_id) = ''
        OR p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array'
    THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT q.*
    INTO v_quotation
    FROM public.quotations q
    WHERE q.id = p_quotation_id
      AND COALESCE(q.is_deleted, false) = false
    FOR UPDATE;

    IF NOT FOUND THEN
        error_code := 'quotation_not_found';
        RETURN NEXT;
        RETURN;
    END IF;

    quotation_id := v_quotation.id;
    IF v_quotation.status <> 'draft' THEN
        error_code := 'quotation_not_draft';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT count(*)::integer
    INTO v_item_count
    FROM public.quotation_items qi
    WHERE qi.quotation_id = v_quotation.id;

    IF v_item_count = 0 THEN
        error_code := 'quotation_no_items';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT count(*)::integer, count(DISTINCT NULLIF(btrim(value ->> 'quotation_item_id'), '')::uuid)::integer
    INTO v_input_count, v_distinct_count
    FROM jsonb_array_elements(p_lines);

    IF v_input_count <> v_item_count OR v_distinct_count <> v_item_count THEN
        error_code := 'quotation_structure_must_cover_all_items';
        RETURN NEXT;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_lines) AS entries(value)
        LEFT JOIN public.quotation_items qi
          ON qi.id = NULLIF(btrim(entries.value ->> 'quotation_item_id'), '')::uuid
         AND qi.quotation_id = v_quotation.id
        WHERE qi.id IS NULL
    ) THEN
        error_code := 'quotation_structure_item_not_found';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Validate all rows before changing any source data.
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_lines)
    LOOP
        IF v_item ->> 'quotation_item_id' IS NULL
            OR btrim(v_item ->> 'quotation_item_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN
            error_code := 'invalid_input';
            RETURN NEXT;
            RETURN;
        END IF;

        v_item_id := (v_item ->> 'quotation_item_id')::uuid;
        v_role := btrim(COALESCE(v_item ->> 'commercial_role', ''));
        v_parent_id := NULLIF(btrim(COALESCE(v_item ->> 'parent_authority_line_id', '')), '')::uuid;
        v_selected := COALESCE((v_item ->> 'is_selected')::boolean, true);
        v_unit := COALESCE(NULLIF(btrim(v_item ->> 'unit'), ''), 'unit');
        v_description_ar := NULLIF(btrim(v_item ->> 'description_ar'), '');

        IF v_role = 'authority_line' THEN
            IF v_parent_id IS NOT NULL OR NOT v_selected THEN
                error_code := 'authority_line_parent_or_selection_invalid';
                RETURN NEXT;
                RETURN;
            END IF;
            v_authority_count := v_authority_count + 1;
        ELSIF v_role = 'included_component' THEN
            IF v_parent_id IS NULL OR NOT v_selected THEN
                error_code := 'included_component_parent_or_selection_invalid';
                RETURN NEXT;
                RETURN;
            END IF;
            v_included_count := v_included_count + 1;
        ELSIF v_role = 'optional_add_on' THEN
            IF v_parent_id IS NULL THEN
                error_code := 'optional_add_on_parent_required';
                RETURN NEXT;
                RETURN;
            END IF;
            IF v_selected THEN
                v_selected_optional_count := v_selected_optional_count + 1;
            END IF;
        ELSE
            error_code := 'commercial_role_invalid';
            RETURN NEXT;
            RETURN;
        END IF;

        IF v_parent_id IS NOT NULL THEN
            -- Validate the complete proposed graph, not the mutable current
            -- row state. This prevents a payload from demoting a parent after
            -- another payload row has already attached a child to it.
            SELECT entry.value
            INTO v_parent_entry
            FROM jsonb_array_elements(p_lines) AS entry(value)
            WHERE (entry.value ->> 'quotation_item_id')::uuid = v_parent_id;

            IF NOT FOUND THEN
                error_code := 'commercial_parent_invalid';
                RETURN NEXT;
                RETURN;
            END IF;

            v_parent_role := btrim(COALESCE(v_parent_entry ->> 'commercial_role', ''));
            v_parent_parent_id := NULLIF(
                btrim(COALESCE(v_parent_entry ->> 'parent_authority_line_id', '')),
                ''
            )::uuid;

            IF v_parent_role <> 'authority_line'
                OR v_parent_parent_id IS NOT NULL
                OR v_parent_id = v_item_id
            THEN
                error_code := 'commercial_parent_invalid';
                RETURN NEXT;
                RETURN;
            END IF;
        END IF;
    END LOOP;

    IF v_authority_count = 0 THEN
        error_code := 'quotation_requires_authority_line';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Lock rows in deterministic id order before the metadata update.
    PERFORM qi.id
    FROM public.quotation_items qi
    WHERE qi.quotation_id = v_quotation.id
    ORDER BY qi.id
    FOR UPDATE;

    -- Apply proposed roots first, then existing child rows, and finally
    -- current roots that are being demoted. This makes valid re-parenting
    -- independent of caller array order and lets the trigger verify that a
    -- demoted root has no children remaining.
    FOR v_item IN
        SELECT entries.value
        FROM jsonb_array_elements(p_lines) AS entries(value)
        JOIN public.quotation_items current_item
          ON current_item.id = (entries.value ->> 'quotation_item_id')::uuid
         AND current_item.quotation_id = v_quotation.id
        ORDER BY CASE
            WHEN btrim(entries.value ->> 'commercial_role') = 'authority_line' THEN 0
            WHEN current_item.commercial_role <> 'authority_line' THEN 1
            ELSE 2
        END, current_item.id
    LOOP
        v_item_id := (v_item ->> 'quotation_item_id')::uuid;
        v_role := btrim(v_item ->> 'commercial_role');
        v_parent_id := NULLIF(btrim(COALESCE(v_item ->> 'parent_authority_line_id', '')), '')::uuid;
        v_selected := COALESCE((v_item ->> 'is_selected')::boolean, true);
        v_unit := COALESCE(NULLIF(btrim(v_item ->> 'unit'), ''), 'unit');
        v_description_ar := NULLIF(btrim(v_item ->> 'description_ar'), '');

        IF v_role = 'included_component' THEN
            UPDATE public.quotation_items qi
            SET commercial_role = v_role,
                parent_authority_line_id = v_parent_id,
                is_selected = v_selected,
                unit = v_unit,
                description_ar = v_description_ar,
                unit_price = 0,
                total = 0,
                vat = 0,
                updated_at = v_now
            WHERE qi.id = v_item_id
              AND qi.quotation_id = v_quotation.id;
        ELSIF v_role = 'optional_add_on' AND NOT v_selected THEN
            UPDATE public.quotation_items qi
            SET commercial_role = v_role,
                parent_authority_line_id = v_parent_id,
                is_selected = v_selected,
                unit = v_unit,
                description_ar = v_description_ar,
                total = 0,
                vat = 0,
                updated_at = v_now
            WHERE qi.id = v_item_id
              AND qi.quotation_id = v_quotation.id;
        ELSE
            UPDATE public.quotation_items qi
            SET commercial_role = v_role,
                parent_authority_line_id = v_parent_id,
                is_selected = v_selected,
                unit = v_unit,
                description_ar = v_description_ar,
                total = round(qi.qty * qi.unit_price, 2),
                vat = 0,
                updated_at = v_now
            WHERE qi.id = v_item_id
              AND qi.quotation_id = v_quotation.id;
        END IF;
    END LOOP;

    v_discount := COALESCE(v_quotation.discount, 0);
    v_vat_rate := COALESCE(v_quotation.vat_rate, 0);

    SELECT COALESCE(sum(qi.total), 0)::numeric(12,2)
    INTO v_subtotal
    FROM public.quotation_items qi
    WHERE qi.quotation_id = v_quotation.id;

    IF v_discount < 0 OR v_discount > v_subtotal THEN
        RAISE EXCEPTION USING MESSAGE = 'w2a_discount_exceeds_subtotal';
    END IF;

    v_taxable := v_subtotal - v_discount;
    IF v_vat_rate = 0 THEN
        v_vat_amount := 0;
        v_grand_total := v_taxable;
    ELSE
        v_vat_amount := round(v_taxable * (v_vat_rate / 100), 2);
        v_grand_total := v_taxable + v_vat_amount;

        IF v_subtotal > 0 THEN
            UPDATE public.quotation_items qi
            SET vat = round((qi.total - (v_discount * (qi.total / v_subtotal))) * (v_vat_rate / 100), 2),
                updated_at = v_now
            WHERE qi.quotation_id = v_quotation.id;

            SELECT v_vat_amount - COALESCE(sum(qi.vat), 0)
            INTO v_residual
            FROM public.quotation_items qi
            WHERE qi.quotation_id = v_quotation.id;

            IF v_residual <> 0 THEN
                SELECT qi.id
                INTO v_max_item_id
                FROM public.quotation_items qi
                WHERE qi.quotation_id = v_quotation.id
                ORDER BY qi.total DESC, qi.id
                LIMIT 1;

                UPDATE public.quotation_items qi
                SET vat = qi.vat + v_residual,
                    updated_at = v_now
                WHERE qi.id = v_max_item_id;
            END IF;
        END IF;
    END IF;

    UPDATE public.quotations q
    SET subtotal = v_subtotal,
        vat_amount = v_vat_amount,
        grand_total = v_grand_total,
        updated_by = p_user_id,
        updated_at = v_now
    WHERE q.id = v_quotation.id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'update',
        'quotation',
        v_quotation.id,
        p_user_id,
        jsonb_build_object(
            'event_type', 'quotation_commercial_structure_reconciled',
            'actor_id', p_user_id,
            'quotation_id', v_quotation.id,
            'authority_line_count', v_authority_count,
            'included_component_count', v_included_count,
            'selected_optional_add_on_count', v_selected_optional_count,
            'currency', COALESCE(NULLIF(btrim(v_quotation.snapshot_seller ->> 'currency'), ''), 'SAR'),
            'subtotal', v_subtotal,
            'discount', v_discount,
            'vat_amount', v_vat_amount,
            'grand_total', v_grand_total,
            'transaction_timestamp', v_now
        ),
        v_now
    );

    error_code := NULL;
    line_count := v_item_count;
    subtotal := v_subtotal;
    discount := v_discount;
    vat_amount := v_vat_amount;
    grand_total := v_grand_total;
    RETURN NEXT;
    RETURN;
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range OR invalid_parameter_value THEN
        error_code := 'invalid_input';
        quotation_id := p_quotation_id;
        RETURN NEXT;
        RETURN;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE v_error_message
            WHEN 'w2a_discount_exceeds_subtotal' THEN 'discount_exceeds_subtotal'
            WHEN 'approved_quotation_immutable' THEN 'quotation_not_draft'
            WHEN 'quotation_commercial_role_invalid' THEN 'commercial_role_invalid'
            WHEN 'quotation_commercial_unit_invalid' THEN 'commercial_unit_invalid'
            WHEN 'quotation_authority_line_parent_or_selection_invalid' THEN 'authority_line_parent_or_selection_invalid'
            WHEN 'quotation_component_parent_required' THEN 'commercial_parent_invalid'
            WHEN 'quotation_included_component_must_be_non_priced' THEN 'included_component_must_be_non_priced'
            WHEN 'quotation_unselected_optional_total_must_be_zero' THEN 'optional_unselected_must_be_zero'
            WHEN 'quotation_component_parent_must_be_authority_line' THEN 'commercial_parent_invalid'
            WHEN 'quotation_authority_line_has_children' THEN 'commercial_parent_invalid'
            ELSE 'commercial_structure_update_failed'
        END;
        quotation_id := p_quotation_id;
        RETURN NEXT;
        RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_quotation_item_commercial_authority() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_quotation_item_commercial_authority() TO service_role;
REVOKE ALL ON FUNCTION public.sync_abs_item_commercial_metadata() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_abs_item_commercial_metadata() TO service_role;
REVOKE ALL ON FUNCTION public.set_quotation_commercial_structure(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_quotation_commercial_structure(uuid, jsonb, text) TO service_role;

COMMENT ON FUNCTION public.set_quotation_commercial_structure(uuid, jsonb, text) IS
    'Service-role-only draft quotation Authority Line structure mutation. Included Components and unselected Optional Add-ons have zero stored contribution; selected optional rows contribute through the existing quotation totals and ABS lineage.';

COMMIT;
