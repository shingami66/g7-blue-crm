-- W2B: durable quotation family/revision lineage.
-- Existing quotation numbering and ABS/history records remain unchanged.

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.quotations') IS NULL
        OR to_regclass('public.quotation_items') IS NULL
        OR to_regclass('public.audit_logs') IS NULL
        OR to_regprocedure('public.set_quotation_commercial_structure(uuid,jsonb,text)') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w2b_quotation_revision_lineage preflight: required W2A schema missing';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_attribute
        WHERE attrelid = 'public.quotations'::regclass
          AND attname IN (
              'quotation_family_id', 'revision_of_quotation_id',
              'revision_number', 'revision_reason'
          )
          AND attnum > 0
          AND NOT attisdropped
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'w2b_quotation_revision_lineage preflight: target columns already exist';
    END IF;

    IF to_regprocedure('public.create_quotation_revision(uuid,text,text,text)') IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'w2b_quotation_revision_lineage preflight: target RPC already exists';
    END IF;
END;
$$;

ALTER TABLE public.quotations
    ADD COLUMN quotation_family_id uuid NOT NULL DEFAULT extensions.gen_random_uuid(),
    ADD COLUMN revision_of_quotation_id uuid NULL,
    ADD COLUMN revision_number integer NOT NULL DEFAULT 1,
    ADD COLUMN revision_reason text NULL;

ALTER TABLE public.quotations
    ADD CONSTRAINT quotations_revision_number_check
        CHECK (revision_number > 0),
    ADD CONSTRAINT quotations_revision_reason_check
        CHECK (
            (
                revision_of_quotation_id IS NULL
                AND (
                    revision_reason IS NULL
                    OR (btrim(revision_reason) <> '' AND char_length(revision_reason) <= 500)
                )
            )
            OR (
                revision_of_quotation_id IS NOT NULL
                AND revision_reason IS NOT NULL
                AND btrim(revision_reason) <> ''
                AND char_length(revision_reason) <= 500
            )
        ),
    ADD CONSTRAINT quotations_revision_root_shape_check
        CHECK (
            (revision_number = 1 AND revision_of_quotation_id IS NULL)
            OR (
                revision_number > 1
                AND revision_of_quotation_id IS NOT NULL
                AND revision_of_quotation_id <> id
            )
        ),
    ADD CONSTRAINT quotations_id_family_key
        UNIQUE (id, quotation_family_id);

ALTER TABLE public.quotations
    ADD CONSTRAINT quotations_revision_source_family_fkey
        FOREIGN KEY (revision_of_quotation_id, quotation_family_id)
        REFERENCES public.quotations (id, quotation_family_id)
        ON DELETE RESTRICT;

CREATE UNIQUE INDEX idx_quotations_family_revision_unique
    ON public.quotations (quotation_family_id, revision_number);

CREATE UNIQUE INDEX idx_quotations_revision_source_unique
    ON public.quotations (revision_of_quotation_id)
    WHERE revision_of_quotation_id IS NOT NULL;

COMMENT ON COLUMN public.quotations.quotation_family_id IS
    'Stable internal quotation family identifier. Existing rows are independent revision-1 families until a successor is created.';
COMMENT ON COLUMN public.quotations.revision_of_quotation_id IS
    'Immediate prior quotation in the same internal family. The source row remains unchanged.';
COMMENT ON COLUMN public.quotations.revision_number IS
    'Monotonic internal revision number within quotation_family_id. Customer-facing quotation numbering is unchanged.';
COMMENT ON COLUMN public.quotations.revision_reason IS
    'Required bounded reason recorded when a non-approved post-Sent quotation creates a successor draft.';

CREATE OR REPLACE FUNCTION public.prevent_quotation_revision_lineage_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF OLD.quotation_family_id IS DISTINCT FROM NEW.quotation_family_id
        OR OLD.revision_of_quotation_id IS DISTINCT FROM NEW.revision_of_quotation_id
        OR OLD.revision_number IS DISTINCT FROM NEW.revision_number
        OR OLD.revision_reason IS DISTINCT FROM NEW.revision_reason
    THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_revision_lineage_immutable';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_quotation_revision_lineage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_predecessor public.quotations%ROWTYPE;
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

    IF NOT FOUND
        OR v_predecessor.status NOT IN ('sent', 'rejected', 'expired')
        OR NEW.revision_number <> v_predecessor.revision_number + 1
    THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_revision_predecessor_invalid';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_quotation_revision_lineage_trg
    ON public.quotations;
CREATE TRIGGER validate_quotation_revision_lineage_trg
BEFORE INSERT ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.validate_quotation_revision_lineage();

DROP TRIGGER IF EXISTS prevent_quotation_revision_lineage_mutation_trg
    ON public.quotations;
CREATE TRIGGER prevent_quotation_revision_lineage_mutation_trg
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_quotation_revision_lineage_mutation();

-- Status transitions such as Sent -> Rejected remain valid. Commercial facts
-- on a post-Sent source must not be changed in place.
CREATE OR REPLACE FUNCTION public.prevent_post_sent_quotation_commercial_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF OLD.status IN ('sent', 'rejected', 'expired')
        AND NEW.status IS DISTINCT FROM OLD.status
        AND (
            (OLD.status = 'sent' AND NEW.status NOT IN ('approved', 'rejected', 'expired'))
            OR OLD.status IN ('rejected', 'expired')
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'post_sent_quotation_status_transition_invalid';
    END IF;

    IF OLD.status IN ('sent', 'rejected', 'expired')
        AND (
            OLD.quotation_number IS DISTINCT FROM NEW.quotation_number
            OR OLD.service_id IS DISTINCT FROM NEW.service_id
            OR OLD.customer_id IS DISTINCT FROM NEW.customer_id
            OR OLD.event IS DISTINCT FROM NEW.event
            OR OLD.date IS DISTINCT FROM NEW.date
            OR OLD.valid_until IS DISTINCT FROM NEW.valid_until
            OR OLD.subtotal IS DISTINCT FROM NEW.subtotal
            OR OLD.discount IS DISTINCT FROM NEW.discount
            OR OLD.vat_rate IS DISTINCT FROM NEW.vat_rate
            OR OLD.vat_amount IS DISTINCT FROM NEW.vat_amount
            OR OLD.grand_total IS DISTINCT FROM NEW.grand_total
            OR OLD.snapshot_seller IS DISTINCT FROM NEW.snapshot_seller
            OR OLD.snapshot_buyer IS DISTINCT FROM NEW.snapshot_buyer
            OR OLD.mutation_key IS DISTINCT FROM NEW.mutation_key
            OR OLD.mutation_payload IS DISTINCT FROM NEW.mutation_payload
            OR OLD.is_deleted IS DISTINCT FROM NEW.is_deleted
            OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
            OR OLD.created_at IS DISTINCT FROM NEW.created_at
            OR OLD.created_by IS DISTINCT FROM NEW.created_by
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'post_sent_quotation_commercial_immutable';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_post_sent_quotation_commercial_mutation_trg
    ON public.quotations;
CREATE TRIGGER prevent_post_sent_quotation_commercial_mutation_trg
BEFORE UPDATE ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_post_sent_quotation_commercial_mutation();

CREATE OR REPLACE FUNCTION public.prevent_post_sent_quotation_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_quotation_id uuid;
    v_status text;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_quotation_id := OLD.quotation_id;
    ELSE
        v_quotation_id := NEW.quotation_id;
    END IF;

    SELECT q.status
    INTO v_status
    FROM public.quotations q
    WHERE q.id = v_quotation_id
    FOR SHARE;

    IF v_status IN ('sent', 'rejected', 'expired') THEN
        RAISE EXCEPTION USING MESSAGE = 'post_sent_quotation_items_immutable';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.quotation_id IS DISTINCT FROM NEW.quotation_id THEN
        SELECT q.status
        INTO v_status
        FROM public.quotations q
        WHERE q.id = OLD.quotation_id
        FOR SHARE;

        IF v_status IN ('sent', 'rejected', 'expired') THEN
            RAISE EXCEPTION USING MESSAGE = 'post_sent_quotation_items_immutable';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_post_sent_quotation_item_mutation_trg
    ON public.quotation_items;
CREATE TRIGGER prevent_post_sent_quotation_item_mutation_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.quotation_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_post_sent_quotation_item_mutation();

CREATE OR REPLACE FUNCTION public.prevent_approval_of_revised_quotation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW.status = 'approved'
        AND OLD.status IN ('draft', 'sent')
        AND EXISTS (
            SELECT 1
            FROM public.quotations successor
            WHERE successor.revision_of_quotation_id = OLD.id
        )
    THEN
        RAISE EXCEPTION USING MESSAGE = 'quotation_revision_source_has_successor';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_approval_of_revised_quotation_trg
    ON public.quotations;
CREATE TRIGGER prevent_approval_of_revised_quotation_trg
BEFORE UPDATE OF status ON public.quotations
FOR EACH ROW
EXECUTE FUNCTION public.prevent_approval_of_revised_quotation();

CREATE FUNCTION public.create_quotation_revision(
    p_source_quotation_id uuid,
    p_revision_reason text,
    p_mutation_key text,
    p_user_id text
)
RETURNS TABLE(
    error_code text,
    quotation_id uuid,
    quotation_number text,
    source_quotation_id uuid,
    quotation_family_id uuid,
    revision_number integer,
    service_id uuid,
    is_replayed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_source public.quotations%ROWTYPE;
    v_existing public.quotations%ROWTYPE;
    v_new_id uuid;
    v_new_number text;
    v_reason text;
    v_mutation_key text;
    v_payload jsonb;
    v_revision_number integer;
    v_item_count integer;
    v_error_message text;
BEGIN
    v_reason := NULLIF(btrim(COALESCE(p_revision_reason, '')), '');
    v_mutation_key := NULLIF(btrim(COALESCE(p_mutation_key, '')), '');

    IF p_source_quotation_id IS NULL
        OR p_user_id IS NULL
        OR btrim(p_user_id) = ''
        OR v_reason IS NULL
        OR char_length(v_reason) > 500
        OR v_mutation_key IS NULL
        OR char_length(v_mutation_key) > 200
    THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'operation', 'quotation_revision',
        'source_quotation_id', p_source_quotation_id,
        'revision_reason', v_reason
    );

    PERFORM pg_advisory_xact_lock(
        pg_catalog.hashtextextended('quotation_revision:' || v_mutation_key, 8591)
    );

    SELECT q.*
    INTO v_existing
    FROM public.quotations q
    WHERE q.mutation_key = v_mutation_key
      AND COALESCE(q.is_deleted, false) = false
    LIMIT 1;

    IF FOUND THEN
        IF v_existing.mutation_payload = v_payload THEN
            error_code := NULL;
            quotation_id := v_existing.id;
            quotation_number := v_existing.quotation_number;
            source_quotation_id := v_existing.revision_of_quotation_id;
            quotation_family_id := v_existing.quotation_family_id;
            revision_number := v_existing.revision_number;
            service_id := v_existing.service_id;
            is_replayed := true;
            RETURN NEXT;
            RETURN;
        END IF;

        error_code := 'mutation_key_conflict';
        RETURN NEXT;
        RETURN;
    END IF;

    SELECT q.*
    INTO v_source
    FROM public.quotations q
    WHERE q.id = p_source_quotation_id
      AND COALESCE(q.is_deleted, false) = false
    FOR UPDATE;

    IF NOT FOUND THEN
        error_code := 'quotation_not_found';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_source.status = 'approved' THEN
        error_code := 'quotation_revision_approved_not_allowed';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_source.status = 'draft' THEN
        error_code := 'quotation_revision_draft_not_required';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_source.status NOT IN ('sent', 'rejected', 'expired') THEN
        error_code := 'quotation_revision_source_state_invalid';
        RETURN NEXT;
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.quotations successor
        WHERE successor.revision_of_quotation_id = v_source.id
    ) THEN
        error_code := 'quotation_revision_successor_exists';
        RETURN NEXT;
        RETURN;
    END IF;

    PERFORM q.id
    FROM public.quotations q
    WHERE q.quotation_family_id = v_source.quotation_family_id
    ORDER BY q.revision_number DESC, q.id
    FOR UPDATE;

    SELECT COALESCE(MAX(q.revision_number), 0) + 1
    INTO v_revision_number
    FROM public.quotations q
    WHERE q.quotation_family_id = v_source.quotation_family_id;

    SELECT count(*)::integer
    INTO v_item_count
    FROM public.quotation_items qi
    WHERE qi.quotation_id = v_source.id;

    IF v_item_count = 0 THEN
        error_code := 'quotation_revision_source_has_no_items';
        RETURN NEXT;
        RETURN;
    END IF;

    v_new_id := extensions.gen_random_uuid();
    v_new_number := public.generate_document_number('quotation');

    INSERT INTO public.quotations (
        id,
        quotation_number,
        service_id,
        customer_id,
        event,
        date,
        valid_until,
        subtotal,
        discount,
        vat_rate,
        vat_amount,
        grand_total,
        status,
        mutation_key,
        mutation_payload,
        created_by,
        updated_by,
        snapshot_seller,
        snapshot_buyer,
        quotation_family_id,
        revision_of_quotation_id,
        revision_number,
        revision_reason
    )
    VALUES (
        v_new_id,
        v_new_number,
        v_source.service_id,
        v_source.customer_id,
        v_source.event,
        v_source.date,
        v_source.valid_until,
        v_source.subtotal,
        v_source.discount,
        v_source.vat_rate,
        v_source.vat_amount,
        v_source.grand_total,
        'draft',
        v_mutation_key,
        v_payload,
        p_user_id,
        p_user_id,
        v_source.snapshot_seller,
        v_source.snapshot_buyer,
        v_source.quotation_family_id,
        v_source.id,
        v_revision_number,
        v_reason
    );

    WITH item_map AS MATERIALIZED (
        SELECT
            qi.id AS source_item_id,
            extensions.gen_random_uuid() AS successor_item_id
        FROM public.quotation_items qi
        WHERE qi.quotation_id = v_source.id
    )
    INSERT INTO public.quotation_items (
        id,
        quotation_id,
        description,
        details,
        category,
        qty,
        unit_price,
        vat,
        total,
        commercial_role,
        parent_authority_line_id,
        is_selected,
        unit,
        description_ar
    )
    SELECT
        item_map.successor_item_id,
        v_new_id,
        qi.description,
        qi.details,
        qi.category,
        qi.qty,
        qi.unit_price,
        qi.vat,
        qi.total,
        qi.commercial_role,
        parent_map.successor_item_id,
        qi.is_selected,
        qi.unit,
        qi.description_ar
    FROM item_map
    JOIN public.quotation_items qi
      ON qi.id = item_map.source_item_id
    LEFT JOIN item_map parent_map
      ON parent_map.source_item_id = qi.parent_authority_line_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'create',
        'quotation',
        v_new_id,
        p_user_id,
        jsonb_build_object(
            'event_type', 'quotation_revision_created',
            'actor_id', p_user_id,
            'source_quotation_id', v_source.id,
            'new_quotation_id', v_new_id,
            'quotation_family_id', v_source.quotation_family_id,
            'revision_number', v_revision_number,
            'revision_reason', v_reason,
            'source_status', v_source.status,
            'customer_facing_numbering', 'unchanged_format'
        ),
        transaction_timestamp()
    );

    error_code := NULL;
    quotation_id := v_new_id;
    quotation_number := v_new_number;
    source_quotation_id := v_source.id;
    quotation_family_id := v_source.quotation_family_id;
    revision_number := v_revision_number;
    service_id := v_source.service_id;
    is_replayed := false;
    RETURN NEXT;
    RETURN;
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range OR invalid_parameter_value THEN
        error_code := 'invalid_input';
        RETURN NEXT;
        RETURN;
    WHEN unique_violation THEN
        error_code := 'mutation_key_conflict';
        RETURN NEXT;
        RETURN;
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
        error_code := CASE v_error_message
            WHEN 'quotation_revision_lineage_immutable' THEN 'quotation_revision_lineage_immutable'
            WHEN 'post_sent_quotation_commercial_immutable' THEN 'post_sent_quotation_commercial_immutable'
            WHEN 'post_sent_quotation_items_immutable' THEN 'post_sent_quotation_items_immutable'
            WHEN 'post_sent_quotation_status_transition_invalid' THEN 'post_sent_quotation_status_transition_invalid'
            WHEN 'quotation_revision_predecessor_invalid' THEN 'quotation_revision_predecessor_invalid'
            WHEN 'quotation_revision_source_has_successor' THEN 'quotation_revision_source_has_successor'
            ELSE 'quotation_revision_failed'
        END;
        RETURN NEXT;
        RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_quotation_revision_lineage_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_quotation_revision_lineage_mutation() TO service_role;
REVOKE ALL ON FUNCTION public.validate_quotation_revision_lineage() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_quotation_revision_lineage() TO service_role;
REVOKE ALL ON FUNCTION public.prevent_post_sent_quotation_commercial_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_post_sent_quotation_commercial_mutation() TO service_role;
REVOKE ALL ON FUNCTION public.prevent_post_sent_quotation_item_mutation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_post_sent_quotation_item_mutation() TO service_role;
REVOKE ALL ON FUNCTION public.prevent_approval_of_revised_quotation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_approval_of_revised_quotation() TO service_role;
REVOKE ALL ON FUNCTION public.create_quotation_revision(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_quotation_revision(uuid, text, text, text) TO service_role;

COMMENT ON FUNCTION public.create_quotation_revision(uuid, text, text, text) IS
    'Service-role-only W2B revision start. Sent, rejected, and expired non-approved quotations clone to a new draft in the same internal family; approved quotations fail closed; source quotation and ABS history remain unchanged.';

COMMIT;
