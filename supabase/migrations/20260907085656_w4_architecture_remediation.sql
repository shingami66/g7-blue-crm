-- F01-F04 architecture remediation. Forward-only; application requires separate authority.
-- Forward action: retire package requirements; replace the five affected RPCs.
-- Apply prerequisite: all published W4 migrations through supplier quotation lines.
-- Locking: deployment DDL locks these small tables; domain mutations lock Service
-- before Package/Commitment so cancellation and reopening cannot cross each other.
-- Rollback/disable: disable the affected write surfaces; do not restore the
-- destructive requirement setter or discard retired rows / reopen audit history.
-- Reconcile: old requirement IDs and quotation FKs must match exactly; retirement
-- adds no money; reopen changes no original amount, amendment, or receipt value.
BEGIN;

ALTER TABLE public.service_procurement_package_requirements
    ADD COLUMN retired_at timestamptz,
    ADD COLUMN retired_by text,
    ADD CONSTRAINT procurement_package_requirement_retirement_check CHECK (
        (retired_at IS NULL AND retired_by IS NULL)
        OR (retired_at IS NOT NULL AND NULLIF(btrim(retired_by), '') IS NOT NULL)
    );

COMMENT ON COLUMN public.service_procurement_package_requirements.retired_at IS
    'Removed from current package scope; retained identity and quotation evidence remain historical.';

-- Fail closed if a future caller attempts to delete linked requirement evidence.
ALTER TABLE public.supplier_quotation_lines
    DROP CONSTRAINT supplier_quotation_lines_pkg_req_fkey,
    ADD CONSTRAINT supplier_quotation_lines_pkg_req_fkey
        FOREIGN KEY (package_requirement_id, service_id)
        REFERENCES public.service_procurement_package_requirements(id, service_id)
        ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.set_procurement_package_requirements(
    p_package_id uuid, p_service_id uuid, p_requirements jsonb,
    p_request_id uuid, p_actor_id text, p_actor_role text
)
RETURNS TABLE(error_code text, package_id uuid, requirement_count integer, idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_existing_package uuid;
    v_payload jsonb;
    v_before jsonb;
    v_after jsonb;
    v_item jsonb;
    v_normalized jsonb := '[]'::jsonb;
    v_ids uuid[] := ARRAY[]::uuid[];
    v_id uuid;
    v_matches integer;
    v_title text;
    v_key text;
    v_specs text;
    v_sort integer;
    v_legacy_id uuid;
    v_count integer := 0;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL OR p_request_id IS NULL
        OR p_package_id IS NULL OR p_service_id IS NULL THEN
        RETURN QUERY SELECT 'procurement_package_request_invalid', p_package_id, 0, false;
        RETURN;
    END IF;
    IF p_actor_role IS NULL OR p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'procurement_package_permission_denied', p_package_id, 0, false;
        RETURN;
    END IF;
    IF p_requirements IS NULL OR jsonb_typeof(p_requirements) <> 'array' THEN
        RETURN QUERY SELECT 'procurement_package_requirements_invalid', p_package_id, 0, false;
        RETURN;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('w4-procurement-package-reqs:' || p_request_id::text, 0));
    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_package, v_payload
    FROM public.audit_logs a
    WHERE a.action = 'procurement_package_requirements_set'
      AND a.entity_type = 'procurement_package'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC LIMIT 1;
    IF FOUND THEN
        IF v_existing_package <> p_package_id
            OR v_payload IS DISTINCT FROM jsonb_build_object('package_id', p_package_id, 'requirements', p_requirements)
            OR NOT EXISTS (SELECT 1 FROM public.service_procurement_packages pkg
                WHERE pkg.id = p_package_id AND pkg.service_id = p_service_id) THEN
            RETURN QUERY SELECT 'request_id_conflict', p_package_id, 0, false;
            RETURN;
        END IF;
        SELECT count(*)::integer INTO v_count
        FROM public.service_procurement_package_requirements r
        WHERE r.package_id = p_package_id AND r.retired_at IS NULL;
        RETURN QUERY SELECT NULL::text, p_package_id, v_count, true;
        RETURN;
    END IF;

    PERFORM s.id FROM public.services s
    WHERE s.id = p_service_id AND s.deleted_at IS NULL
      AND s.status NOT IN ('Completed', 'Cancelled') FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'procurement_package_not_found', p_package_id, 0, false;
        RETURN;
    END IF;
    PERFORM pkg.id FROM public.service_procurement_packages pkg
    WHERE pkg.id = p_package_id AND pkg.service_id = p_service_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'procurement_package_not_found', p_package_id, 0, false;
        RETURN;
    END IF;

    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb)
    INTO v_before FROM public.service_procurement_package_requirements r
    WHERE r.package_id = p_package_id;

    -- Resolve and validate every identity before any write. Older callers without
    -- IDs retain an unambiguous catalog key / exact custom-text match. Ambiguous
    -- matches fail closed; retired identities are never silently resurrected.
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_requirements) LOOP
        IF jsonb_typeof(v_item) <> 'object' THEN
            RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid requirement object';
        END IF;
        v_id := NULLIF(v_item ->> 'id', '')::uuid;
        v_title := NULLIF(btrim(v_item ->> 'title'), '');
        v_key := NULLIF(btrim(v_item ->> 'requirement_key'), '');
        v_specs := NULLIF(btrim(v_item ->> 'specifications'), '');
        v_sort := COALESCE((v_item ->> 'sort_order')::integer, v_count);
        v_legacy_id := NULLIF(v_item ->> 'legacy_requirement_id', '')::uuid;
        IF v_title IS NULL OR char_length(v_title) > 2000
            OR char_length(v_key) > 100 OR char_length(v_specs) > 2000 OR v_sort < 0 THEN
            RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid requirement fields';
        END IF;
        IF v_id IS NULL THEN
            SELECT count(*)::integer, (array_agg(r.id ORDER BY r.id))[1]
            INTO v_matches, v_id
            FROM public.service_procurement_package_requirements r
            WHERE r.package_id = p_package_id AND r.service_id = p_service_id
              AND r.retired_at IS NULL
              AND ((v_key IS NOT NULL AND r.requirement_key = v_key)
                OR (v_key IS NULL AND r.requirement_key IS NULL
                    AND r.title = v_title AND r.specifications IS NOT DISTINCT FROM v_specs));
            IF v_matches > 1 THEN
                RETURN QUERY SELECT 'procurement_package_requirement_identity_conflict', p_package_id, 0, false;
                RETURN;
            END IF;
        ELSE
            IF NOT EXISTS (SELECT 1 FROM public.service_procurement_package_requirements r
                WHERE r.id = v_id AND r.package_id = p_package_id
                  AND r.service_id = p_service_id AND r.retired_at IS NULL) THEN
                RETURN QUERY SELECT 'procurement_package_requirement_identity_conflict', p_package_id, 0, false;
                RETURN;
            END IF;
        END IF;
        IF v_id = ANY(v_ids) THEN
            RETURN QUERY SELECT 'procurement_package_requirement_identity_conflict', p_package_id, 0, false;
            RETURN;
        END IF;
        IF v_id IS NOT NULL THEN
            -- Preserve legacy lineage even when the caller omits it.
            SELECT r.legacy_requirement_id INTO v_legacy_id
            FROM public.service_procurement_package_requirements r WHERE r.id = v_id;
        ELSIF v_legacy_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.service_procurement_requirements r
            WHERE r.id = v_legacy_id AND r.service_id = p_service_id
        ) THEN
            RETURN QUERY SELECT 'procurement_package_requirement_identity_conflict', p_package_id, 0, false;
            RETURN;
        END IF;
        v_id := COALESCE(v_id, gen_random_uuid());
        v_ids := array_append(v_ids, v_id);
        v_normalized := v_normalized || jsonb_build_array(jsonb_build_object(
            'id', v_id, 'title', v_title, 'requirement_key', v_key,
            'specifications', v_specs, 'sort_order', v_sort, 'legacy_requirement_id', v_legacy_id));
        v_count := v_count + 1;
    END LOOP;

    UPDATE public.service_procurement_package_requirements r
    SET retired_at = v_now, retired_by = p_actor_id, updated_at = v_now, updated_by = p_actor_id
    WHERE r.package_id = p_package_id AND r.retired_at IS NULL AND NOT (r.id = ANY(v_ids));

    FOR v_item IN SELECT value FROM jsonb_array_elements(v_normalized) LOOP
        INSERT INTO public.service_procurement_package_requirements AS existing (
            id, package_id, service_id, requirement_key, title, specifications,
            sort_order, legacy_requirement_id, created_at, created_by, updated_at, updated_by
        ) VALUES (
            (v_item ->> 'id')::uuid, p_package_id, p_service_id, v_item ->> 'requirement_key',
            v_item ->> 'title', v_item ->> 'specifications', (v_item ->> 'sort_order')::integer,
            (v_item ->> 'legacy_requirement_id')::uuid, v_now, p_actor_id, v_now, p_actor_id
        ) ON CONFLICT (id) DO UPDATE SET
            requirement_key = EXCLUDED.requirement_key, title = EXCLUDED.title,
            specifications = EXCLUDED.specifications, sort_order = EXCLUDED.sort_order,
            updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;
    END LOOP;
    UPDATE public.service_procurement_packages pkg SET updated_at = v_now, updated_by = p_actor_id
    WHERE pkg.id = p_package_id;
    SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.id), '[]'::jsonb)
    INTO v_after FROM public.service_procurement_package_requirements r WHERE r.package_id = p_package_id;
    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES ('procurement_package_requirements_set', 'procurement_package', p_package_id, p_actor_id,
        jsonb_build_object('service_id', p_service_id, 'request_id', p_request_id,
            'from', v_before, 'to', v_after,
            'payload', jsonb_build_object('package_id', p_package_id, 'requirements', p_requirements),
            'count', v_count), v_now);
    RETURN QUERY SELECT NULL::text, p_package_id, v_count, false;
EXCEPTION WHEN invalid_text_representation OR invalid_parameter_value OR numeric_value_out_of_range
    OR check_violation OR foreign_key_violation THEN
    -- The exception block rolls back all writes, including retirement, before
    -- returning a stable validation error. Never RETURN an error after a write.
    RETURN QUERY SELECT 'procurement_package_requirements_invalid', p_package_id, 0, false;
END;
$$;

-- New evidence may only select current requirements; historical links are kept.
CREATE FUNCTION public.check_supplier_quotation_requirement_current()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
    IF NEW.package_requirement_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.service_procurement_package_requirements r
        WHERE r.id = NEW.package_requirement_id AND r.service_id = NEW.service_id
          AND r.retired_at IS NULL
    ) THEN
        RAISE EXCEPTION 'procurement_package_requirement_retired';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER supplier_quotation_requirement_current
BEFORE INSERT OR UPDATE OF package_requirement_id ON public.supplier_quotation_lines
FOR EACH ROW EXECUTE FUNCTION public.check_supplier_quotation_requirement_current();
REVOKE ALL ON FUNCTION public.check_supplier_quotation_requirement_current() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_procurement_package_requirements(uuid,uuid,jsonb,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_procurement_package_requirements(uuid,uuid,jsonb,uuid,text,text) TO service_role;


-- F02: all first-review outcomes enforce submitter separation, including replay.
CREATE OR REPLACE FUNCTION public.review_service_receipt(
    p_receipt_id uuid,
    p_acceptance_status text,
    p_conditions_notes text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    receipt_id uuid,
    service_id uuid,
    supplier_id uuid,
    commitment_id uuid,
    acceptance_status text,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_conditions_notes text := NULLIF(btrim(p_conditions_notes), '');
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_receipt_id uuid;
    v_service_id uuid;
    v_supplier_id uuid;
    v_commitment_id uuid;
    v_current_status text;
    v_submitter text;
    v_commitment_status text;
    v_original_amount numeric;
    v_authorized_amount numeric;
    v_reserved_amount numeric;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'service_receipt_request_invalid', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'service_receipt_accept_permission_denied', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF p_receipt_id IS NULL
        OR p_acceptance_status IS NULL OR p_acceptance_status NOT IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED')
        OR p_acceptance_status = 'ACCEPTED_WITH_CONDITIONS' AND v_conditions_notes IS NULL
        OR v_conditions_notes IS NOT NULL AND char_length(v_conditions_notes) > 4000
    THEN
        RETURN QUERY SELECT 'service_receipt_review_invalid', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'receipt_id', p_receipt_id,
        'acceptance_status', p_acceptance_status,
        'conditions_notes', v_conditions_notes
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-receipt-review:' || p_request_id::text, 0));

    SELECT r.submitted_by INTO v_submitter
    FROM public.service_receipts r WHERE r.id = p_receipt_id FOR UPDATE;
    IF v_submitter = p_actor_id THEN
        RETURN QUERY SELECT 'service_receipt_self_review_forbidden', p_receipt_id,
            NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;


    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_receipt_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'service_receipt'
      AND a.details ->> 'operation' = 'service_receipt_review'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'service_receipt_request_conflict', v_existing_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
            RETURN;
        END IF;

        SELECT r.service_id, r.supplier_id, r.commitment_id, r.acceptance_status
        INTO v_service_id, v_supplier_id, v_commitment_id, v_current_status
        FROM public.service_receipts r
        WHERE r.id = v_existing_receipt_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'service_receipt_unavailable', v_existing_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, v_existing_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, true;
        RETURN;
    END IF;

    SELECT r.service_id, r.supplier_id, r.commitment_id, r.acceptance_status,
           c.status, c.original_approved_amount
    INTO v_service_id, v_supplier_id, v_commitment_id, v_current_status,
         v_commitment_status, v_original_amount
    FROM public.service_receipts r
    JOIN public.approved_commitments c ON c.id = r.commitment_id
    WHERE r.id = p_receipt_id
    FOR UPDATE OF r, c;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_receipt_not_found', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, false;
        RETURN;
    END IF;

    IF v_current_status <> 'PENDING' THEN
        RETURN QUERY SELECT 'service_receipt_already_reviewed', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, false;
        RETURN;
    END IF;

    IF p_acceptance_status <> 'REJECTED' AND v_commitment_status <> 'open' THEN
        RETURN QUERY SELECT 'service_receipt_commitment_not_open', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, false;
        RETURN;
    END IF;

    SELECT
        v_original_amount + COALESCE((SELECT SUM(a.amount_delta) FROM public.approved_commitment_amendments a WHERE a.commitment_id = v_commitment_id), 0),
        COALESCE((SELECT SUM(CASE WHEN r2.acceptance_status <> 'REJECTED' THEN COALESCE(r2.received_amount, 0) ELSE 0 END) FROM public.service_receipts r2 WHERE r2.commitment_id = v_commitment_id), 0)
    INTO v_authorized_amount, v_reserved_amount;

    IF p_acceptance_status <> 'REJECTED'
        AND v_reserved_amount > v_authorized_amount
    THEN
        RETURN QUERY SELECT 'service_receipt_value_exceeds_open', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, false;
        RETURN;
    END IF;

    UPDATE public.service_receipts r
    SET acceptance_status = p_acceptance_status,
        conditions_notes = CASE WHEN v_conditions_notes IS NOT NULL THEN v_conditions_notes ELSE r.conditions_notes END,
        reviewed_at = v_now,
        reviewed_by = p_actor_id,
        updated_at = v_now,
        updated_by = p_actor_id
    WHERE r.id = p_receipt_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'service_receipt',
        p_receipt_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'service_receipt_reviewed',
            'operation', 'service_receipt_review',
            'w4_version', 'l1-d07-v1',
            'request_id', p_request_id::text,
            'service_id', v_service_id,
            'supplier_id', v_supplier_id,
            'commitment_id', v_commitment_id,
            'receipt_id', p_receipt_id,
            'actor_role', p_actor_role,
            'from', jsonb_build_object('acceptance_status', 'PENDING'),
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, p_acceptance_status, false;
END;
$$;

-- F03: preserve customer guards; an open commitment is unresolved.
CREATE OR REPLACE FUNCTION public.cancel_service(p_service_id uuid,p_reason text,p_actor_id text,p_actor_role text)
RETURNS TABLE(error_code text,service_id uuid,service_status text,idempotent_replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
    v_status text; v_reason text:=NULLIF(btrim(p_reason),''); v_now timestamptz:=transaction_timestamp();
BEGIN
    IF NULLIF(btrim(p_actor_id),'') IS NULL OR NULLIF(btrim(p_actor_role),'') IS NULL THEN RETURN QUERY SELECT 'service_actor_invalid',p_service_id,NULL::text,false; RETURN; END IF;
    IF v_reason IS NULL THEN RETURN QUERY SELECT 'service_cancellation_reason_required',p_service_id,NULL::text,false; RETURN; END IF;
    IF char_length(v_reason)>1000 THEN RETURN QUERY SELECT 'service_cancellation_reason_too_long',p_service_id,NULL::text,false; RETURN; END IF;
    SELECT s.status INTO v_status FROM public.services s WHERE s.id=p_service_id AND s.deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RETURN QUERY SELECT 'service_not_found',p_service_id,NULL::text,false; RETURN; END IF;
    IF v_status='Cancelled' THEN RETURN QUERY SELECT NULL::text,p_service_id,v_status,true; RETURN; END IF;
    IF v_status NOT IN ('Inquiry','Quoted','Approved') THEN RETURN QUERY SELECT 'service_status_transition_ineligible',p_service_id,v_status,false; RETURN; END IF;
    IF EXISTS (SELECT 1 FROM public.invoices i WHERE i.service_id=p_service_id) THEN RETURN QUERY SELECT 'service_invoice_history_exists',p_service_id,v_status,false; RETURN; END IF;
    IF EXISTS (SELECT 1 FROM public.payments p JOIN public.invoices i ON i.id=p.invoice_id WHERE i.service_id=p_service_id) THEN RETURN QUERY SELECT 'service_payment_history_exists',p_service_id,v_status,false; RETURN; END IF;
    IF EXISTS (SELECT 1 FROM public.approved_billing_scopes a WHERE a.service_id=p_service_id AND a.status='approved' AND a.superseded_at IS NULL AND a.voided_at IS NULL FOR UPDATE) THEN RETURN QUERY SELECT 'service_billing_authority_unresolved',p_service_id,v_status,false; RETURN; END IF;

    IF EXISTS (SELECT 1 FROM public.approved_commitments c
        WHERE c.service_id = p_service_id AND c.status = 'open') THEN
        RETURN QUERY SELECT 'service_supplier_commitment_unresolved', p_service_id, v_status, false;
        RETURN;
    END IF;
    UPDATE public.services s SET status='Cancelled',cancellation_reason=v_reason,updated_by=p_actor_id,updated_at=v_now WHERE s.id=p_service_id AND s.status IN ('Inquiry','Quoted','Approved') AND s.deleted_at IS NULL;
    INSERT INTO public.audit_logs(action,entity_type,entity_id,user_id,details,timestamp) VALUES ('status_change','service',p_service_id,p_actor_id,jsonb_build_object('event_type','service_status_changed','actor_id',p_actor_id,'actor_role',p_actor_role,'from_status',v_status,'to_status','Cancelled','reason',v_reason,'transaction_timestamp',v_now),v_now);
    RETURN QUERY SELECT NULL::text,p_service_id,'Cancelled'::text,false;
END;
$$;

-- F04: closed-only governed reopening; close evidence preserved atomically in audit.
CREATE OR REPLACE FUNCTION public.transition_approved_commitment(
    p_commitment_id uuid,
    p_action text,
    p_reason text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    commitment_id uuid,
    service_id uuid,
    commitment_status text,
    authorized_amount numeric,
    open_commitment_amount numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_reason text := NULLIF(btrim(p_reason), '');
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_commitment_id uuid;
    v_service_id uuid;
    v_status text;
    v_original_amount numeric;
    v_authorized_amount numeric;
    v_reserved_amount numeric;
    v_pending_count integer;
    v_close_evidence jsonb;
    v_parent_status text;
    v_parent_deleted timestamptz;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'approved_commitment_request_invalid', p_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'approved_commitment_permission_denied', p_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_commitment_id IS NULL
        OR p_action IS NULL OR p_action NOT IN ('close', 'cancel', 'reopen')
        OR v_reason IS NULL
        OR char_length(v_reason) > 2000
    THEN
        RETURN QUERY SELECT 'approved_commitment_transition_invalid', p_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'commitment_id', p_commitment_id,
        'action', p_action,
        'reason', v_reason
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-commitment-transition:' || p_request_id::text, 0));

    SELECT a.entity_id, a.details -> 'payload'
    INTO v_existing_commitment_id, v_audit_payload
    FROM public.audit_logs a
    WHERE a.entity_type = 'approved_commitment'
      AND a.details ->> 'operation' = 'approved_commitment_transition'
      AND a.details ->> 'request_id' = p_request_id::text
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'approved_commitment_request_conflict', v_existing_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;

        SELECT b.service_id, b.status, b.authorized_amount, b.open_commitment_amount
        INTO v_service_id, v_status, v_authorized_amount, v_reserved_amount
        FROM public.approved_commitment_balances b
        WHERE b.id = v_existing_commitment_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'approved_commitment_unavailable', v_existing_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, v_existing_commitment_id, v_service_id, v_status, v_authorized_amount, v_reserved_amount, true;
        RETURN;
    END IF;

    -- Serialize reopening with cancellation and commitment creation on Service.
    SELECT s.status, s.deleted_at INTO v_parent_status, v_parent_deleted
    FROM public.services s JOIN public.approved_commitments c ON c.service_id = s.id
    WHERE c.id = p_commitment_id FOR UPDATE OF s;

    SELECT c.service_id, c.status, c.original_approved_amount
    INTO v_service_id, v_status, v_original_amount
    FROM public.approved_commitments c
    WHERE c.id = p_commitment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'approved_commitment_not_found', p_commitment_id, NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF (p_action = 'reopen' AND v_status <> 'closed')
        OR (p_action <> 'reopen' AND v_status <> 'open') THEN
        RETURN QUERY SELECT CASE WHEN p_action = 'reopen' THEN 'approved_commitment_reopen_ineligible' ELSE 'approved_commitment_already_closed' END, p_commitment_id, v_service_id, v_status, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_action = 'reopen' AND (v_parent_status IS NULL
        OR v_parent_status = 'Cancelled' OR v_parent_deleted IS NOT NULL) THEN
        RETURN QUERY SELECT 'approved_commitment_service_unavailable', p_commitment_id,
            v_service_id, v_status, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;
    SELECT jsonb_build_object('closed_at', c.closed_at, 'closed_by', c.closed_by,
        'closed_reason', c.closed_reason) INTO v_close_evidence
    FROM public.approved_commitments c WHERE c.id = p_commitment_id;

    SELECT COUNT(*)::integer
    INTO v_pending_count
    FROM public.service_receipts r
    WHERE r.commitment_id = p_commitment_id
      AND r.acceptance_status = 'PENDING';

    IF v_pending_count > 0 THEN
        RETURN QUERY SELECT 'approved_commitment_pending_receipts', p_commitment_id, v_service_id, v_status, NULL::numeric, NULL::numeric, false;
        RETURN;
    END IF;

    SELECT
        v_original_amount + COALESCE((SELECT SUM(a.amount_delta) FROM public.approved_commitment_amendments a WHERE a.commitment_id = p_commitment_id), 0),
        COALESCE((SELECT SUM(CASE WHEN r.acceptance_status IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS') THEN COALESCE(r.received_amount, 0) ELSE 0 END) FROM public.service_receipts r WHERE r.commitment_id = p_commitment_id), 0)
    INTO v_authorized_amount, v_reserved_amount;

    IF p_action = 'close' AND v_authorized_amount - v_reserved_amount <> 0 THEN
        RETURN QUERY SELECT 'approved_commitment_open_amount_remaining', p_commitment_id, v_service_id, v_status, v_authorized_amount, v_authorized_amount - v_reserved_amount, false;
        RETURN;
    END IF;

    IF p_action = 'reopen' THEN
        UPDATE public.approved_commitments c
        SET status = 'open', closed_at = NULL, closed_by = NULL, closed_reason = NULL,
            updated_at = v_now, updated_by = p_actor_id
        WHERE c.id = p_commitment_id;
        v_status := 'open';
    ELSIF p_action = 'cancel' THEN
        UPDATE public.approved_commitments c
        SET status = 'cancelled',
            cancelled_at = v_now,
            cancelled_by = p_actor_id,
            cancelled_reason = v_reason,
            updated_at = v_now,
            updated_by = p_actor_id
        WHERE c.id = p_commitment_id;
        v_status := 'cancelled';
    ELSE
        UPDATE public.approved_commitments c
        SET status = 'closed',
            closed_at = v_now,
            closed_by = p_actor_id,
            closed_reason = v_reason,
            updated_at = v_now,
            updated_by = p_actor_id
        WHERE c.id = p_commitment_id;
        v_status := 'closed';
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'status_change',
        'approved_commitment',
        p_commitment_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', CASE WHEN p_action = 'reopen' THEN 'approved_commitment_reopened' WHEN p_action = 'cancel' THEN 'approved_commitment_cancelled' ELSE 'approved_commitment_closed' END,
            'operation', 'approved_commitment_transition',
            'w4_version', 'l1-d07-v1',
            'request_id', p_request_id::text,
            'commitment_id', p_commitment_id,
            'actor_role', p_actor_role,
            'from', jsonb_build_object('status', CASE WHEN p_action = 'reopen' THEN 'closed' ELSE 'open' END, 'authorized_amount', v_authorized_amount, 'open_commitment_amount', v_authorized_amount - v_reserved_amount, 'close_evidence', v_close_evidence),
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_commitment_id, v_service_id, v_status, v_authorized_amount, CASE WHEN p_action = 'reopen' THEN v_authorized_amount - v_reserved_amount ELSE 0::numeric END, false;
END;
$$;

REVOKE ALL ON FUNCTION public.review_service_receipt(uuid,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_service(uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_approved_commitment(uuid,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_service_receipt(uuid,text,text,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_service(uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_approved_commitment(uuid,text,text,uuid,text,text) TO service_role;
-- F02/F04: preserve the same separation when correcting acceptance.
CREATE OR REPLACE FUNCTION public.correct_service_receipt(
    p_receipt_id uuid,
    p_corrected_acceptance_status text,
    p_corrected_received_amount numeric,
    p_corrected_conditions_notes text,
    p_correction_reason text,
    p_request_id uuid,
    p_actor_id text,
    p_actor_role text
)
RETURNS TABLE(
    error_code text,
    receipt_id uuid,
    service_id uuid,
    supplier_id uuid,
    commitment_id uuid,
    acceptance_status text,
    received_amount numeric,
    idempotent_replay boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_now timestamptz := transaction_timestamp();
    v_corrected_conditions_notes text := NULLIF(btrim(p_corrected_conditions_notes), '');
    v_correction_reason text := NULLIF(btrim(p_correction_reason), '');
    v_payload jsonb;
    v_audit_payload jsonb;
    v_existing_correction_id uuid;
    v_correction_id uuid;
    v_correction_number integer;
    v_service_id uuid;
    v_supplier_id uuid;
    v_commitment_id uuid;
    v_current_status text;
    v_submitter text;
    v_current_received_amount numeric;
    v_current_conditions_notes text;
    v_reviewed_at timestamptz;
    v_reviewed_by text;
    v_prior_decision_at timestamptz;
    v_prior_decision_by text;
    v_commitment_status text;
    v_original_amount numeric;
    v_authorized_amount numeric;
    v_reserved_amount numeric;
BEGIN
    IF NULLIF(btrim(p_actor_id), '') IS NULL
        OR NULLIF(btrim(p_actor_role), '') IS NULL
        OR p_request_id IS NULL
    THEN
        RETURN QUERY SELECT 'service_receipt_correction_request_invalid', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_actor_role NOT IN ('admin', 'manager') THEN
        RETURN QUERY SELECT 'service_receipt_correction_permission_denied', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
        RETURN;
    END IF;

    IF p_receipt_id IS NULL
        OR p_corrected_acceptance_status IS NULL OR p_corrected_acceptance_status NOT IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED')
        OR (
            p_corrected_acceptance_status = 'ACCEPTED_WITH_CONDITIONS'
            AND v_corrected_conditions_notes IS NULL
        )
        OR v_corrected_conditions_notes IS NOT NULL AND char_length(v_corrected_conditions_notes) > 4000
        OR p_corrected_received_amount IS NOT NULL
            AND (p_corrected_received_amount < 0 OR p_corrected_received_amount > 999999999999.99)
        OR v_correction_reason IS NULL
        OR char_length(v_correction_reason) > 2000
    THEN
        RETURN QUERY SELECT 'service_receipt_correction_invalid', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
        RETURN;
    END IF;

    v_payload := jsonb_build_object(
        'receipt_id', p_receipt_id,
        'corrected_acceptance_status', p_corrected_acceptance_status,
        'corrected_received_amount', p_corrected_received_amount,
        'corrected_conditions_notes', v_corrected_conditions_notes,
        'correction_reason', v_correction_reason
    );

    PERFORM pg_advisory_xact_lock(hashtextextended('l1-d07-receipt-correction:' || p_request_id::text, 0));

    -- Corrections can change acceptance too; they cannot bypass reviewer separation.
    SELECT r.submitted_by INTO v_submitter
    FROM public.service_receipts r WHERE r.id = p_receipt_id FOR UPDATE;
    IF v_submitter = p_actor_id THEN
        RETURN QUERY SELECT 'service_receipt_self_review_forbidden', p_receipt_id,
            NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
        RETURN;
    END IF;

    -- The correction request identity is authoritative; audit entity_id remains the receipt ID.
    SELECT c.id, a.details -> 'payload'
    INTO v_existing_correction_id, v_audit_payload
    FROM public.service_receipt_corrections c
    JOIN public.audit_logs a
      ON a.entity_type = 'service_receipt'
     AND a.entity_id = c.receipt_id
     AND a.details ->> 'operation' = 'service_receipt_correction'
     AND a.details ->> 'request_id' = c.request_id::text
    WHERE c.request_id = p_request_id
    ORDER BY a.timestamp DESC, a.id DESC
    LIMIT 1;

    IF FOUND THEN
        IF v_audit_payload IS DISTINCT FROM v_payload THEN
            RETURN QUERY SELECT 'service_receipt_correction_request_conflict', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
            RETURN;
        END IF;

        SELECT sc.id, r.service_id, r.supplier_id, r.commitment_id,
               sc.corrected_acceptance_status, sc.corrected_received_amount
        INTO v_correction_id, v_service_id, v_supplier_id, v_commitment_id,
             v_current_status, v_current_received_amount
        FROM public.service_receipt_corrections sc
        JOIN public.service_receipts r ON r.id = sc.receipt_id
        WHERE sc.id = v_existing_correction_id;

        IF NOT FOUND THEN
            RETURN QUERY SELECT 'service_receipt_correction_unavailable', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
            RETURN;
        END IF;

        RETURN QUERY SELECT NULL::text, p_receipt_id, v_service_id, v_supplier_id, v_commitment_id,
            v_current_status, v_current_received_amount, true;
        RETURN;
    END IF;

    SELECT r.service_id, r.supplier_id, r.commitment_id, r.acceptance_status,
           r.received_amount, r.conditions_notes, r.reviewed_at, r.reviewed_by,
           c.status, c.original_approved_amount
    INTO v_service_id, v_supplier_id, v_commitment_id, v_current_status,
         v_current_received_amount, v_current_conditions_notes, v_reviewed_at, v_reviewed_by,
         v_commitment_status, v_original_amount
    FROM public.service_receipts r
    JOIN public.approved_commitments c ON c.id = r.commitment_id
    WHERE r.id = p_receipt_id
    FOR UPDATE OF r, c;

    IF NOT FOUND THEN
        RETURN QUERY SELECT 'service_receipt_not_found', p_receipt_id, NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, false;
        RETURN;
    END IF;

    IF v_current_status NOT IN ('ACCEPTED', 'ACCEPTED_WITH_CONDITIONS', 'REJECTED') THEN
        RETURN QUERY SELECT 'service_receipt_not_reviewed', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, v_current_received_amount, false;
        RETURN;
    END IF;

    SELECT c.corrected_at, c.corrected_by
    INTO v_prior_decision_at, v_prior_decision_by
    FROM public.service_receipt_corrections c
    WHERE c.receipt_id = p_receipt_id
    ORDER BY c.correction_number DESC
    LIMIT 1;

    IF NOT FOUND THEN
        v_prior_decision_at := v_reviewed_at;
        v_prior_decision_by := v_reviewed_by;
    END IF;

    SELECT
        v_original_amount + COALESCE((SELECT SUM(a.amount_delta) FROM public.approved_commitment_amendments a WHERE a.commitment_id = v_commitment_id), 0),
        COALESCE((SELECT SUM(CASE WHEN r2.acceptance_status <> 'REJECTED' THEN COALESCE(r2.received_amount, 0) ELSE 0 END) FROM public.service_receipts r2 WHERE r2.commitment_id = v_commitment_id AND r2.id <> p_receipt_id), 0)
    INTO v_authorized_amount, v_reserved_amount;

    IF v_commitment_status <> 'open'
    THEN
        RETURN QUERY SELECT 'service_receipt_commitment_not_open', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, v_current_received_amount, false;
        RETURN;
    END IF;

    IF p_corrected_acceptance_status <> 'REJECTED'
        AND v_reserved_amount + COALESCE(p_corrected_received_amount, 0) > v_authorized_amount
    THEN
        RETURN QUERY SELECT 'service_receipt_value_exceeds_open', p_receipt_id, v_service_id, v_supplier_id, v_commitment_id, v_current_status, v_current_received_amount, false;
        RETURN;
    END IF;

    SELECT COALESCE(MAX(c.correction_number), 0) + 1
    INTO v_correction_number
    FROM public.service_receipt_corrections c
    WHERE c.receipt_id = p_receipt_id;

    INSERT INTO public.service_receipt_corrections(
        receipt_id, correction_number, prior_acceptance_status,
        prior_received_amount, prior_conditions_notes, prior_decision_at,
        prior_decision_by, corrected_acceptance_status, corrected_received_amount,
        corrected_conditions_notes, correction_reason, corrected_at, corrected_by,
        request_id, created_at, created_by
    ) VALUES (
        p_receipt_id, v_correction_number, v_current_status,
        v_current_received_amount, v_current_conditions_notes, v_prior_decision_at,
        v_prior_decision_by, p_corrected_acceptance_status, p_corrected_received_amount,
        v_corrected_conditions_notes, v_correction_reason, v_now, p_actor_id,
        p_request_id, v_now, p_actor_id
    )
    RETURNING id INTO v_correction_id;

    UPDATE public.service_receipts r
    SET acceptance_status = p_corrected_acceptance_status,
        received_amount = p_corrected_received_amount,
        conditions_notes = v_corrected_conditions_notes,
        updated_at = v_now,
        updated_by = p_actor_id
    WHERE r.id = p_receipt_id;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    VALUES (
        'correction',
        'service_receipt',
        p_receipt_id,
        p_actor_id,
        jsonb_build_object(
            'event_type', 'service_receipt_corrected',
            'operation', 'service_receipt_correction',
            'w4_version', 'l1-d07-v2',
            'request_id', p_request_id::text,
            'service_id', v_service_id,
            'supplier_id', v_supplier_id,
            'commitment_id', v_commitment_id,
            'receipt_id', p_receipt_id,
            'correction_id', v_correction_id,
            'correction_number', v_correction_number,
            'actor_role', p_actor_role,
            'from', jsonb_build_object(
                'acceptance_status', v_current_status,
                'received_amount', v_current_received_amount,
                'conditions_notes', v_current_conditions_notes,
                'decision_at', v_prior_decision_at,
                'decision_by', v_prior_decision_by
            ),
            'payload', v_payload
        ),
        v_now
    );

    RETURN QUERY SELECT NULL::text, p_receipt_id, v_service_id, v_supplier_id, v_commitment_id,
        p_corrected_acceptance_status, p_corrected_received_amount, false;
END;
$$;
REVOKE ALL ON FUNCTION public.correct_service_receipt(uuid,text,numeric,text,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correct_service_receipt(uuid,text,numeric,text,text,uuid,text,text) TO service_role;
COMMIT;
