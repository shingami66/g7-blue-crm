-- W11 M0-01: narrow correction for the exact Completed G8 DEV retirement audit contract.
-- Preserve the original applied migration and correct only its service-role-only RPC body/EXECUTE metadata.
-- The supported audit action remains status_change; the distinct remediation event stays in structured details.

BEGIN;

DO $migration_preflight$
DECLARE
    v_constraint_definition text;
    v_function_owner name;
    v_security_definer boolean;
    v_function_config text[];
    v_function_source text;
    v_function_oid oid := to_regprocedure('public.retire_w11_m0_01_completed_g8_abs(text)');
BEGIN
    IF v_function_oid IS NULL
        OR to_regprocedure('public._w11_m0_01_completed_g8_targets()') IS NULL
        OR to_regprocedure('public._w11_m0_01_completed_g8_downstream_link_counts()') IS NULL
        OR to_regprocedure('public._w11_m0_01_completed_g8_valid_state_count(text,text,timestamptz)') IS NULL
        OR to_regprocedure('public.enforce_w11_m0_01_retirement_context()') IS NULL
        OR to_regprocedure('public.check_approved_billing_scopes_before_write()') IS NULL
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_corrective_required_objects_missing';
    END IF;

    SELECT pg_catalog.pg_get_constraintdef(c.oid)
    INTO v_constraint_definition
    FROM pg_catalog.pg_constraint AS c
    JOIN pg_catalog.pg_class AS t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'audit_logs'
      AND c.conname = 'audit_logs_action_check';

    IF v_constraint_definition IS NULL
        OR position('status_change' IN v_constraint_definition) = 0
        OR position('owner_authorized_remediation' IN v_constraint_definition) > 0
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_audit_constraint_unexpected';
    END IF;

    SELECT r.rolname, p.prosecdef, p.proconfig, p.prosrc
    INTO v_function_owner, v_security_definer, v_function_config, v_function_source
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_roles AS r ON r.oid = p.proowner
    WHERE p.oid = v_function_oid;

    IF v_function_owner <> 'postgres'
        OR v_security_definer IS DISTINCT FROM TRUE
        OR v_function_config IS NULL
        OR NOT ('search_path=pg_catalog, public' = ANY(v_function_config))
        OR position('owner_authorized_remediation' IN v_function_source) = 0
        OR position('OWNER AUTHORIZATION — FINAL M0-01 COMPLETED G8 DEV REPAIR' IN v_function_source) = 0
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_expected_predecessor_mismatch';
    END IF;

    IF NOT has_function_privilege('service_role', v_function_oid, 'EXECUTE')
        OR has_function_privilege('anon', v_function_oid, 'EXECUTE')
        OR has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_predecessor_acl_mismatch';
    END IF;
END;
$migration_preflight$;

CREATE OR REPLACE FUNCTION public.retire_w11_m0_01_completed_g8_abs(p_owner_actor_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_owner_actor_id text := NULLIF(btrim(COALESCE(p_owner_actor_id, '')), '');
    v_batch_id constant text := 'W11-M0-01-COMPLETED-G8-ABS-RETIREMENT';
    v_event_type constant text := 'approved_billing_scope_m0_01_completed_g8_owner_authorized_retirement';
    v_label constant text := 'OWNER-AUTHORIZED M0-01 G8 DEV TEST-DATA AUTHORITY RETIREMENT';
    v_authorization_ref constant text := 'OWNER AUTHORIZATION — CORRECTIVE MIGRATION AND SINGLE RETRY FOR FINAL M0-01 CASE';
    v_reason constant text := 'OWNER-AUTHORIZED M0-01 G8 DEV TEST-DATA AUTHORITY RETIREMENT; historical Completed mechanism UNKNOWN; historical financial impact UNKNOWN; SAR 800.00 was commercial authority only.';
    v_now timestamptz;
    v_previous_context text;
    v_previous_actor_id text;
    v_actor_count bigint;
    v_manifest_count bigint;
    v_distinct_services bigint;
    v_distinct_quotations bigint;
    v_distinct_abs bigint;
    v_locked_count bigint;
    v_state_count bigint;
    v_abs_audit_count bigint;
    v_batch_event_count bigint;
    v_exact_audit_count bigint;
    v_links text[];
BEGIN
    IF v_owner_actor_id IS NULL OR char_length(v_owner_actor_id) > 200 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_owner_actor_invalid';
    END IF;

    SELECT count(*) INTO v_actor_count
    FROM public.app_users AS u
    WHERE u.clerk_user_id = v_owner_actor_id
      AND u.role = 'admin'
      AND u.is_active IS TRUE;
    IF v_actor_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_owner_actor_not_active_admin';
    END IF;
    PERFORM 1
    FROM public.app_users AS u
    WHERE u.clerk_user_id = v_owner_actor_id
      AND u.role = 'admin'
      AND u.is_active IS TRUE
    FOR SHARE;
    GET DIAGNOSTICS v_actor_count = ROW_COUNT;
    IF v_actor_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_owner_actor_not_active_admin';
    END IF;

    v_previous_context := NULLIF(current_setting('g7.w11_m0_01_context', true), '');
    v_previous_actor_id := NULLIF(current_setting('g7.w11_m0_01_actor_id', true), '');
    IF v_previous_context IS NOT NULL OR v_previous_actor_id IS NOT NULL THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_context_already_set';
    END IF;

    SELECT count(*), count(DISTINCT t.service_id), count(DISTINCT t.quotation_id), count(DISTINCT t.abs_id)
    INTO v_manifest_count, v_distinct_services, v_distinct_quotations, v_distinct_abs
    FROM public._w11_m0_01_completed_g8_targets() AS t;
    IF v_manifest_count <> 1 OR v_distinct_services <> 1
        OR v_distinct_quotations <> 1 OR v_distinct_abs <> 1
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_fixed_manifest_invalid';
    END IF;

    PERFORM s.id
    FROM public.services AS s
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.service_id = s.id
    ORDER BY s.id
    FOR UPDATE OF s;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_service_lock_set_invalid';
    END IF;

    PERFORM sl.service_id
    FROM public.service_lifecycle_states AS sl
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.service_id = sl.service_id
    ORDER BY sl.service_id
    FOR UPDATE OF sl;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_lifecycle_lock_set_invalid';
    END IF;

    PERFORM c.id
    FROM public.customers AS c
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.expected_customer_id = c.id
    ORDER BY c.id
    FOR UPDATE OF c;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_customer_lock_set_invalid';
    END IF;

    PERFORM q.id
    FROM public.quotations AS q
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.quotation_id = q.id
    ORDER BY q.id
    FOR UPDATE OF q;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_quotation_lock_set_invalid';
    END IF;

    PERFORM a.id
    FROM public.approved_billing_scopes AS a
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.abs_id = a.id
    ORDER BY a.id
    FOR UPDATE OF a;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_abs_lock_set_invalid';
    END IF;

    PERFORM i.id
    FROM public.approved_billing_scope_items AS i
    JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.abs_id = i.approved_billing_scope_id
    ORDER BY i.id
    FOR UPDATE OF i;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_item_lock_set_invalid';
    END IF;

    SELECT public._w11_m0_01_completed_g8_valid_state_count('approved', v_owner_actor_id, NULL)
    INTO v_state_count;
    SELECT count(*) INTO v_abs_audit_count
    FROM public.audit_logs AS al
    JOIN public._w11_m0_01_completed_g8_targets() AS t
      ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id;
    IF v_state_count = 1 AND v_abs_audit_count = 1 THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.audit_logs AS al
            JOIN public.approved_billing_scopes AS a ON a.id = al.entity_id
            JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.abs_id = a.id
            WHERE al.action = 'status_change'
              AND al.entity_type = 'approved_billing_scope'
              AND al.entity_id = t.abs_id
              AND al.user_id = a.approved_by
              AND al.timestamp = a.approved_at
              AND al.details ->> 'event_type' = 'approved_billing_scope_approved'
              AND al.details ->> 'service_id' = t.service_id::text
              AND al.details ->> 'source_quotation_id' = t.quotation_id::text
              AND al.details ->> 'quotation_id' = t.quotation_id::text
              AND al.details ->> 'scope_id' = t.abs_id::text
              AND al.details ->> 'scope_version' = a.scope_version::text
              AND al.details ->> 'lifecycle_outcome' = 'auto_activated'
        ) THEN
            RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_prior_abs_audit_state_mismatch';
        END IF;
    ELSE
        SELECT count(*) INTO v_batch_event_count
        FROM public.audit_logs AS al
        WHERE al.details ->> 'batch_id' = v_batch_id;
        IF v_batch_event_count <> 1 THEN
            RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_prior_state_mismatch';
        END IF;

        SELECT min(al.timestamp) INTO v_now
        FROM public.audit_logs AS al
        JOIN public._w11_m0_01_completed_g8_targets() AS t ON t.abs_id = al.entity_id
        WHERE al.details ->> 'batch_id' = v_batch_id
          AND al.action = 'status_change'
          AND al.entity_type = 'approved_billing_scope'
          AND al.entity_id = t.abs_id;
        SELECT public._w11_m0_01_completed_g8_valid_state_count('voided', v_owner_actor_id, v_now)
        INTO v_state_count;

        SELECT count(*) INTO v_exact_audit_count
        FROM public.audit_logs AS al
        JOIN public._w11_m0_01_completed_g8_targets() AS t
          ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id
        WHERE al.action = 'status_change'
          AND al.user_id = v_owner_actor_id
          AND al.timestamp = v_now
          AND al.details = jsonb_build_object(
              'event_type', v_event_type,
              'batch_id', v_batch_id,
              'remediation_label', v_label,
              'owner_authorization_ref', v_authorization_ref,
              'actor_id', v_owner_actor_id,
              'actor_context', 'Owner-authorized DEV remediation',
              'transaction_timestamp', v_now,
              'provenance_classification', 'synthetic G8 DEV verification provenance VERIFIED',
              'historical_completed_mechanism', 'UNKNOWN',
              'historical_financial_impact', 'UNKNOWN',
              'commercial_authority', 'SAR 800.00 was commercial authority only',
              'service_id', t.service_id,
              'quotation_id', t.quotation_id,
              'approved_billing_scope_id', t.abs_id,
              'scope_version', 1,
              'reason_code', 'owner_authorized_dev_test_data_retirement',
              'reason_note', v_reason,
              'recorded_at', v_now,
              'prior_status', 'approved',
              'prior_voided_at', NULL,
              'prior_superseded_at', NULL,
              'result_status', 'voided',
              'result_voided_at', v_now,
              'lifecycle_outcome', 'active_approved_authority_retired'
          );
        IF v_state_count = 1 AND v_abs_audit_count = 2 AND v_exact_audit_count = 1 THEN
            SELECT COALESCE(array_agg(link.relation_name ORDER BY link.relation_name), ARRAY[]::text[])
            INTO v_links
            FROM public._w11_m0_01_completed_g8_downstream_link_counts() AS link;
            IF cardinality(v_links) = 0 THEN
                RETURN jsonb_build_object('batch_id', v_batch_id, 'retired_count', 1,
                    'idempotent_replay', true, 'recorded_at', v_now);
            END IF;
        END IF;
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_prior_state_mismatch';
    END IF;

    IF v_state_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_precondition_state_mismatch';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.audit_logs AS al
        JOIN public._w11_m0_01_completed_g8_targets() AS t
          ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id
        WHERE al.details ->> 'event_type' IN (
            'approved_billing_scope_voided',
            v_event_type
        )
    ) OR EXISTS (
        SELECT 1
        FROM public.audit_logs AS al
        WHERE al.details ->> 'batch_id' = v_batch_id
    ) THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_prior_remediation_audit_found';
    END IF;

    SELECT COALESCE(array_agg(link.relation_name ORDER BY link.relation_name), ARRAY[]::text[])
    INTO v_links
    FROM public._w11_m0_01_completed_g8_downstream_link_counts() AS link;
    IF cardinality(v_links) > 0 THEN
        RAISE EXCEPTION 'w11_m0_01_completed_g8_downstream_links_found: %', array_to_string(v_links, ',');
    END IF;

    v_now := transaction_timestamp();
    PERFORM set_config('g7.w11_m0_01_context', v_batch_id, true);
    PERFORM set_config('g7.w11_m0_01_actor_id', v_owner_actor_id, true);

    UPDATE public.approved_billing_scopes AS a
    SET status = 'voided',
        voided_at = v_now,
        voided_by = v_owner_actor_id,
        void_reason = v_reason,
        updated_by = v_owner_actor_id,
        updated_at = v_now
    FROM public._w11_m0_01_completed_g8_targets() AS t
    WHERE a.id = t.abs_id
      AND a.service_id = t.service_id
      AND a.source_quotation_id = t.quotation_id
      AND a.scope_version = 1
      AND a.status = 'approved'
      AND a.voided_at IS NULL
      AND a.superseded_at IS NULL;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_abs_update_count_invalid';
    END IF;

    INSERT INTO public.audit_logs(action, entity_type, entity_id, user_id, details, timestamp)
    SELECT
        'status_change',
        'approved_billing_scope',
        t.abs_id,
        v_owner_actor_id,
        jsonb_build_object(
            'event_type', v_event_type,
            'batch_id', v_batch_id,
            'remediation_label', v_label,
            'owner_authorization_ref', v_authorization_ref,
            'actor_id', v_owner_actor_id,
            'actor_context', 'Owner-authorized DEV remediation',
            'transaction_timestamp', v_now,
            'provenance_classification', 'synthetic G8 DEV verification provenance VERIFIED',
            'historical_completed_mechanism', 'UNKNOWN',
            'historical_financial_impact', 'UNKNOWN',
            'commercial_authority', 'SAR 800.00 was commercial authority only',
            'service_id', t.service_id,
            'quotation_id', t.quotation_id,
            'approved_billing_scope_id', t.abs_id,
            'scope_version', 1,
            'reason_code', 'owner_authorized_dev_test_data_retirement',
            'reason_note', v_reason,
            'recorded_at', v_now,
            'prior_status', 'approved',
            'prior_voided_at', NULL,
            'prior_superseded_at', NULL,
            'result_status', 'voided',
            'result_voided_at', v_now,
            'lifecycle_outcome', 'active_approved_authority_retired'
        ),
        v_now
    FROM public._w11_m0_01_completed_g8_targets() AS t;
    GET DIAGNOSTICS v_locked_count = ROW_COUNT;
    IF v_locked_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_audit_insert_count_invalid';
    END IF;

    PERFORM set_config('g7.w11_m0_01_context', COALESCE(v_previous_context, ''), true);
    PERFORM set_config('g7.w11_m0_01_actor_id', COALESCE(v_previous_actor_id, ''), true);

    SELECT public._w11_m0_01_completed_g8_valid_state_count('voided', v_owner_actor_id, v_now)
    INTO v_state_count;
    IF v_state_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_postcondition_state_mismatch';
    END IF;

    SELECT count(*) INTO v_exact_audit_count
    FROM public.audit_logs AS al
    JOIN public._w11_m0_01_completed_g8_targets() AS t
      ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id
    WHERE al.action = 'status_change'
      AND al.user_id = v_owner_actor_id
      AND al.timestamp = v_now
      AND al.details = jsonb_build_object(
          'event_type', v_event_type,
          'batch_id', v_batch_id,
          'remediation_label', v_label,
          'owner_authorization_ref', v_authorization_ref,
          'actor_id', v_owner_actor_id,
          'actor_context', 'Owner-authorized DEV remediation',
          'transaction_timestamp', v_now,
          'provenance_classification', 'synthetic G8 DEV verification provenance VERIFIED',
          'historical_completed_mechanism', 'UNKNOWN',
          'historical_financial_impact', 'UNKNOWN',
          'commercial_authority', 'SAR 800.00 was commercial authority only',
          'service_id', t.service_id,
          'quotation_id', t.quotation_id,
          'approved_billing_scope_id', t.abs_id,
          'scope_version', 1,
          'reason_code', 'owner_authorized_dev_test_data_retirement',
          'reason_note', v_reason,
          'recorded_at', v_now,
          'prior_status', 'approved',
          'prior_voided_at', NULL,
          'prior_superseded_at', NULL,
          'result_status', 'voided',
          'result_voided_at', v_now,
          'lifecycle_outcome', 'active_approved_authority_retired'
      );
    IF v_exact_audit_count <> 1 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_audit_postcondition_mismatch';
    END IF;

    SELECT count(*) INTO v_abs_audit_count
    FROM public.audit_logs AS al
    JOIN public._w11_m0_01_completed_g8_targets() AS t
      ON al.entity_type = 'approved_billing_scope' AND al.entity_id = t.abs_id;
    IF v_abs_audit_count <> 2 THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_total_audit_count_invalid';
    END IF;

    SELECT COALESCE(array_agg(link.relation_name ORDER BY link.relation_name), ARRAY[]::text[])
    INTO v_links
    FROM public._w11_m0_01_completed_g8_downstream_link_counts() AS link;
    IF cardinality(v_links) > 0 THEN
        RAISE EXCEPTION 'w11_m0_01_completed_g8_downstream_postcondition_failed: %', array_to_string(v_links, ',');
    END IF;

    RETURN jsonb_build_object('batch_id', v_batch_id, 'retired_count', 1,
        'idempotent_replay', false, 'recorded_at', v_now);
END;
$function$;

ALTER FUNCTION public.retire_w11_m0_01_completed_g8_abs(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.retire_w11_m0_01_completed_g8_abs(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retire_w11_m0_01_completed_g8_abs(text) TO service_role;

DO $migration_postflight$
DECLARE
    v_function_owner name;
    v_security_definer boolean;
    v_function_config text[];
    v_function_source text;
    v_function_oid oid := to_regprocedure('public.retire_w11_m0_01_completed_g8_abs(text)');
    v_constraint_definition text;
BEGIN
    SELECT r.rolname, p.prosecdef, p.proconfig, p.prosrc
    INTO v_function_owner, v_security_definer, v_function_config, v_function_source
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_roles AS r ON r.oid = p.proowner
    WHERE p.oid = v_function_oid;

    SELECT pg_catalog.pg_get_constraintdef(c.oid)
    INTO v_constraint_definition
    FROM pg_catalog.pg_constraint AS c
    JOIN pg_catalog.pg_class AS t ON t.oid = c.conrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'audit_logs'
      AND c.conname = 'audit_logs_action_check';

    IF v_function_owner <> 'postgres'
        OR v_security_definer IS DISTINCT FROM TRUE
        OR v_function_config IS NULL
        OR NOT ('search_path=pg_catalog, public' = ANY(v_function_config))
        OR position('owner_authorized_remediation' IN v_function_source) > 0
        OR position('status_change' IN v_function_source) = 0
        OR position('approved_billing_scope_m0_01_completed_g8_owner_authorized_retirement' IN v_function_source) = 0
        OR position('OWNER AUTHORIZATION — CORRECTIVE MIGRATION AND SINGLE RETRY FOR FINAL M0-01 CASE' IN v_function_source) = 0
        OR v_constraint_definition IS NULL
        OR position('status_change' IN v_constraint_definition) = 0
        OR position('owner_authorized_remediation' IN v_constraint_definition) > 0
        OR NOT has_function_privilege('service_role', v_function_oid, 'EXECUTE')
        OR has_function_privilege('anon', v_function_oid, 'EXECUTE')
        OR has_function_privilege('authenticated', v_function_oid, 'EXECUTE')
    THEN
        RAISE EXCEPTION USING MESSAGE = 'w11_m0_01_completed_g8_corrective_postflight_failed';
    END IF;
END;
$migration_postflight$;

COMMIT;